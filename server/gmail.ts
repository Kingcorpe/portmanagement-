// Gmail integration via nodemailer (Railway deployment)
import nodemailer from 'nodemailer';

function getTransporter() {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error('Email not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD environment variables in Railway.');
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

export async function sendEmail(
  to: string,
  subject: string,
  htmlBody: string
) {
  const transporter = getTransporter();

  const result = await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to,
    subject,
    html: htmlBody,
  });

  return result;
}

export async function sendEmailWithAttachment(
  to: string,
  subject: string,
  body: string,
  attachment: Buffer,
  attachmentName: string,
  mimeType: string = 'application/pdf'
) {
  const transporter = getTransporter();

  const result = await transporter.sendMail({
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
  });

  return result;
}
