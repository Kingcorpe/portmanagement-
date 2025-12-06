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
    // Add timeouts to prevent hanging indefinitely
    connectionTimeout: 10000, // 10 seconds to establish connection
    greetingTimeout: 10000,   // 10 seconds for greeting
    socketTimeout: 30000,     // 30 seconds for socket inactivity
  });
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
  const transporter = getTransporter();

  const result = await withTimeout(
    transporter.sendMail({
      from: process.env.GMAIL_USER,
      to,
      subject,
      html: htmlBody,
    }),
    45000, // 45 second total timeout
    'Email sending timed out. Please check your email configuration.'
  );

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
    45000, // 45 second total timeout
    'Email sending timed out. Please check your email configuration.'
  );

  return result;
}
