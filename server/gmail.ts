// Gmail integration via nodemailer (Railway deployment)
import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { log } from './logger';

function getTransporter() {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error('Email not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD environment variables in Railway.');
  }

  // Use explicit SMTP settings instead of 'service: gmail' for better compatibility with Railway
  const options: SMTPTransport.Options = {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // Use STARTTLS
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
    // Increased timeouts for Railway's network
    connectionTimeout: 30000, // 30 seconds to establish connection
    greetingTimeout: 30000,   // 30 seconds for greeting
    socketTimeout: 60000,     // 60 seconds for socket inactivity
    logger: false,            // Disable internal logging
    debug: false,             // Disable debug mode
  };

  return nodemailer.createTransport(options);
}

// Helper to wrap email sending with a timeout
async function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(errorMessage)), ms);
  });
  
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

export async function sendEmail(
  to: string,
  subject: string,
  htmlBody: string
) {
  log.info('Attempting to send email', { to, subject: subject.substring(0, 50) });
  
  try {
    const transporter = getTransporter();
    
    // Verify connection before sending
    await withTimeout(
      transporter.verify(),
      30000,
      'Failed to connect to email server. Check GMAIL_USER and GMAIL_APP_PASSWORD.'
    );
    
    const result = await withTimeout(
      transporter.sendMail({
        from: process.env.GMAIL_USER,
        to,
        subject,
        html: htmlBody,
      }),
      60000, // 60 second total timeout
      'Email sending timed out. Please try again.'
    );
    
    log.info('Email sent successfully', { to, messageId: result.messageId });
    return result;
  } catch (error: any) {
    log.error('Email send failed', { to, error: error.message });
    throw error;
  }
}

export async function sendEmailWithAttachment(
  to: string,
  subject: string,
  body: string,
  attachment: Buffer,
  attachmentName: string,
  mimeType: string = 'application/pdf'
) {
  log.info('Attempting to send email with attachment', { 
    to, 
    subject: subject.substring(0, 50),
    attachmentName,
    attachmentSize: attachment.length 
  });
  
  try {
    const transporter = getTransporter();
    
    // Verify connection before sending
    await withTimeout(
      transporter.verify(),
      30000,
      'Failed to connect to email server. Check GMAIL_USER and GMAIL_APP_PASSWORD.'
    );
    
    const result = await withTimeout(
      transporter.sendMail({
        from: process.env.GMAIL_USER,
        to,
        subject,
        html: body,
        attachments: [
          {
            filename: attachmentName,
            content: attachment,
            contentType: mimeType,
          },
        ],
      }),
      90000, // 90 second total timeout for attachments
      'Email sending timed out. Please try again.'
    );
    
    log.info('Email with attachment sent successfully', { to, messageId: result.messageId });
    return result;
  } catch (error: any) {
    log.error('Email with attachment send failed', { to, error: error.message });
    throw error;
  }
}
