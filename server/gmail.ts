// Gmail integration via Gmail API (Railway deployment)
// Uses Gmail API over HTTPS instead of SMTP (which Railway blocks)
import { google } from 'googleapis';
import { log } from './logger';

// Check which method is configured
function getEmailMethod(): 'gmail_api' | 'smtp' | 'none' {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY && process.env.GMAIL_USER) {
    return 'gmail_api';
  }
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return 'smtp';
  }
  return 'none';
}

// Gmail API client using service account with domain-wide delegation
async function getGmailClient() {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GMAIL_USER) {
    throw new Error('Gmail API not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, and GMAIL_USER.');
  }

  // Replace escaped newlines in private key
  const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/gmail.send'],
    subject: process.env.GMAIL_USER, // Impersonate this user
  });

  return google.gmail({ version: 'v1', auth });
}

// Create email in RFC 2822 format
function createRawEmail(to: string, subject: string, htmlBody: string, attachment?: { content: Buffer; filename: string; mimeType: string }): string {
  const boundary = `boundary_${Date.now()}`;
  const from = process.env.GMAIL_USER;
  
  let email: string;
  
  if (attachment) {
    // Email with attachment
    email = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: 7bit',
      '',
      htmlBody,
      '',
      `--${boundary}`,
      `Content-Type: ${attachment.mimeType}; name="${attachment.filename}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${attachment.filename}"`,
      '',
      attachment.content.toString('base64'),
      '',
      `--${boundary}--`,
    ].join('\r\n');
  } else {
    // Simple HTML email
    email = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      '',
      htmlBody,
    ].join('\r\n');
  }

  // Base64 URL encode the email
  return Buffer.from(email)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Helper to wrap with timeout
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

// Test email connection
export async function testEmailConnection(): Promise<{ success: boolean; message: string; details?: any }> {
  log.info('Testing email connection...');
  
  const method = getEmailMethod();
  
  if (method === 'none') {
    return {
      success: false,
      message: 'Email not configured',
      details: {
        GMAIL_USER: process.env.GMAIL_USER ? 'SET' : 'MISSING',
        GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? 'SET' : 'MISSING',
        GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY ? 'SET' : 'MISSING',
        GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD ? 'SET' : 'MISSING',
        method: 'none',
      }
    };
  }
  
  if (method === 'gmail_api') {
    try {
      const gmail = await getGmailClient();
      // Test by getting user profile
      const profile = await withTimeout(
        gmail.users.getProfile({ userId: 'me' }),
        30000,
        'Gmail API connection timed out'
      );
      
      log.info('Gmail API connection test successful');
      return {
        success: true,
        message: 'Gmail API connection verified successfully',
        details: {
          method: 'gmail_api',
          user: process.env.GMAIL_USER,
          serviceAccount: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          emailAddress: profile.data.emailAddress,
        }
      };
    } catch (error: any) {
      log.error('Gmail API connection test failed', { error: error.message });
      return {
        success: false,
        message: error.message || 'Gmail API connection failed',
        details: {
          method: 'gmail_api',
          user: process.env.GMAIL_USER,
          serviceAccount: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          errorCode: error.code,
          hint: 'Ensure service account has domain-wide delegation enabled and Gmail API scope added in Google Workspace Admin',
        }
      };
    }
  }
  
  // SMTP method - will likely fail on Railway
  return {
    success: false,
    message: 'SMTP method configured but Railway blocks SMTP ports. Use Gmail API instead.',
    details: {
      method: 'smtp',
      user: process.env.GMAIL_USER,
      hint: 'Set up GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY for Gmail API',
    }
  };
}

export async function sendEmail(
  to: string,
  subject: string,
  htmlBody: string
) {
  const method = getEmailMethod();
  log.info('Attempting to send email', { to, subject: subject.substring(0, 50), method });
  
  if (method === 'none') {
    throw new Error('Email not configured. Set up Gmail API credentials in Railway.');
  }
  
  if (method === 'smtp') {
    throw new Error('SMTP is blocked on Railway. Configure Gmail API instead (GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY).');
  }
  
  try {
    const gmail = await getGmailClient();
    const raw = createRawEmail(to, subject, htmlBody);
    
    const result = await withTimeout(
      gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw },
      }),
      60000,
      'Email sending timed out'
    );
    
    log.info('Email sent successfully via Gmail API', { to, messageId: result.data.id });
    return { messageId: result.data.id };
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
  const method = getEmailMethod();
  log.info('Attempting to send email with attachment', { 
    to, 
    subject: subject.substring(0, 50),
    attachmentName,
    attachmentSize: attachment.length,
    method,
  });
  
  if (method === 'none') {
    throw new Error('Email not configured. Set up Gmail API credentials in Railway.');
  }
  
  if (method === 'smtp') {
    throw new Error('SMTP is blocked on Railway. Configure Gmail API instead (GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY).');
  }
  
  try {
    const gmail = await getGmailClient();
    const raw = createRawEmail(to, subject, body, {
      content: attachment,
      filename: attachmentName,
      mimeType,
    });
    
    const result = await withTimeout(
      gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw },
      }),
      90000, // Longer timeout for attachments
      'Email sending timed out'
    );
    
    log.info('Email with attachment sent successfully via Gmail API', { to, messageId: result.data.id });
    return { messageId: result.data.id };
  } catch (error: any) {
    log.error('Email with attachment send failed', { to, error: error.message });
    throw error;
  }
}
