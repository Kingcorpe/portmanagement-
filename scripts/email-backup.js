#!/usr/bin/env node

/**
 * Email Database Backup Script
 * Sends the backup file via email using Resend API
 */

import { Resend } from 'resend';
import { readFileSync, statSync } from 'fs';
import { basename } from 'path';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
const BACKUP_EMAIL = process.env.BACKUP_EMAIL || 'ryan@crsolutions.ca';
const MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024; // 20MB (Resend limit is 25MB, we use 20MB for safety)

async function emailBackup(backupFilePath) {
  if (!RESEND_API_KEY) {
    console.error('ERROR: RESEND_API_KEY environment variable is not set');
    process.exit(1);
  }

  try {
    // Check file size
    const stats = statSync(backupFilePath);
    const fileSize = stats.size;
    const fileName = basename(backupFilePath);
    const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);

    console.log(`Backup file: ${fileName}`);
    console.log(`File size: ${fileSizeMB} MB`);

    const resend = new Resend(RESEND_API_KEY);

    // If file is too large, upload to transfer.sh and email link
    if (fileSize > MAX_ATTACHMENT_SIZE) {
      console.log('File is too large for email attachment, uploading to transfer.sh...');
      
      // Upload to transfer.sh (free file sharing service)
      const fileContent = readFileSync(backupFilePath);

      const uploadResponse = await fetch(`https://transfer.sh/${fileName}`, {
        method: 'PUT',
        body: fileContent,
        headers: {
          'Max-Downloads': '10',
          'Max-Days': '7',
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload to transfer.sh: ${uploadResponse.statusText}`);
      }

      const downloadUrl = await uploadResponse.text();
      const downloadUrlClean = downloadUrl.trim();

      console.log(`Uploaded to: ${downloadUrlClean}`);

      // Email with download link
      const emailSubject = `Database Backup - ${new Date().toLocaleDateString()} - ${fileName}`;
      const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Daily Database Backup</h2>
          <p>Your daily database backup is ready for download.</p>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>File:</strong> ${fileName}</p>
            <p style="margin: 0 0 10px 0;"><strong>Size:</strong> ${fileSizeMB} MB</p>
            <p style="margin: 0 0 10px 0;"><strong>Date:</strong> ${new Date().toLocaleString()}</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${downloadUrlClean}" 
               style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Download Backup
            </a>
          </div>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            <strong>Note:</strong> This link will expire in 7 days. Please download and save the backup file.
          </p>
          <p style="color: #666; font-size: 12px;">
            If the link doesn't work, copy and paste this URL into your browser:<br>
            <code style="background: #f0f0f0; padding: 2px 6px; border-radius: 3px;">${downloadUrlClean}</code>
          </p>
        </div>
      `;

      await resend.emails.send({
        from: RESEND_FROM_EMAIL,
        to: BACKUP_EMAIL,
        subject: emailSubject,
        html: emailBody,
      });

      console.log(`✓ Backup link emailed to ${BACKUP_EMAIL}`);
      console.log(`  Download URL: ${downloadUrlClean}`);
    } else {
      // File is small enough, email as attachment
      console.log('Emailing backup as attachment...');
      
      const fileContent = readFileSync(backupFilePath);
      const fileBuffer = Buffer.from(fileContent);

      const emailSubject = `Database Backup - ${new Date().toLocaleDateString()} - ${fileName}`;
      const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Daily Database Backup</h2>
          <p>Your daily database backup is attached to this email.</p>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>File:</strong> ${fileName}</p>
            <p style="margin: 0 0 10px 0;"><strong>Size:</strong> ${fileSizeMB} MB</p>
            <p style="margin: 0;"><strong>Date:</strong> ${new Date().toLocaleString()}</p>
          </div>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            Please save this backup file in a secure location.
          </p>
        </div>
      `;

      await resend.emails.send({
        from: RESEND_FROM_EMAIL,
        to: BACKUP_EMAIL,
        subject: emailSubject,
        html: emailBody,
        attachments: [
          {
            filename: fileName,
            content: fileBuffer,
          },
        ],
      });

      console.log(`✓ Backup emailed to ${BACKUP_EMAIL} as attachment`);
    }

    return true;
  } catch (error) {
    console.error('ERROR: Failed to email backup:', error.message);
    throw error;
  }
}

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     process.argv[1] && process.argv[1].endsWith('email-backup.js');

if (isMainModule) {
  const backupFilePath = process.argv[2];
  
  if (!backupFilePath) {
    console.error('Usage: node email-backup.js <backup-file-path>');
    process.exit(1);
  }

  emailBackup(backupFilePath)
    .then(() => {
      console.log('Email sent successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to send email:', error);
      process.exit(1);
    });
}

export { emailBackup };

