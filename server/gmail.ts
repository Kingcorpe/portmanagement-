
// Gmail integration - supports both Replit connectors and direct OAuth via env vars
import { google } from 'googleapis';
import nodemailer from 'nodemailer';

let connectionSettings: any;
let oauth2Client: any = null;

// Check if we're running on Railway with direct Gmail credentials
function hasDirectGmailCredentials(): boolean {
  return !!(
    process.env.GMAIL_CLIENT_ID &&
    process.env.GMAIL_CLIENT_SECRET &&
    process.env.GMAIL_REFRESH_TOKEN
  );
}

// Check if we have simple SMTP credentials (Gmail app password)
function hasSmtpCredentials(): boolean {
  return !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

// Get OAuth2 client for direct Gmail API access (Railway deployment)
async function getDirectOAuth2Client() {
  if (oauth2Client) {
    return oauth2Client;
  }

  oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground' // Standard redirect URI
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN
  });

  return oauth2Client;
}

// Get access token via Replit connectors (Replit deployment)
async function getReplitAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-mail',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Gmail not connected');
  }
  return accessToken;
}

// Get Gmail client - tries direct OAuth first, then Replit connectors
export async function getUncachableGmailClient() {
  // Try direct OAuth credentials first (Railway/production)
  if (hasDirectGmailCredentials()) {
    const auth = await getDirectOAuth2Client();
    return google.gmail({ version: 'v1', auth });
  }

  // Fall back to Replit connectors
  const accessToken = await getReplitAccessToken();
  const tempOAuth2Client = new google.auth.OAuth2();
  tempOAuth2Client.setCredentials({
    access_token: accessToken
  });

  return google.gmail({ version: 'v1', auth: tempOAuth2Client });
}

// Send email via nodemailer SMTP (simplest option with app password)
async function sendEmailViaSMTP(to: string, subject: string, htmlBody: string) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  const result = await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to,
    subject,
    html: htmlBody,
  });

  return result;
}

export async function sendEmail(
  to: string,
  subject: string,
  htmlBody: string
) {
  // Try SMTP first (simplest, works with Gmail app password)
  if (hasSmtpCredentials()) {
    return await sendEmailViaSMTP(to, subject, htmlBody);
  }

  // Try Gmail API (OAuth)
  if (hasDirectGmailCredentials() || process.env.REPLIT_CONNECTORS_HOSTNAME) {
    const gmail = await getUncachableGmailClient();
    
    const emailLines = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      '',
      htmlBody
    ];
    
    const email = emailLines.join('\r\n');
    const encodedEmail = Buffer.from(email).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail
      }
    });
    
    return result;
  }

  throw new Error('Email not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD environment variables in Railway.');
}

export async function sendEmailWithAttachment(
  to: string,
  subject: string,
  body: string,
  attachment: Buffer,
  attachmentName: string,
  mimeType: string = 'application/pdf'
) {
  // Try SMTP first (simplest, works with Gmail app password)
  if (hasSmtpCredentials()) {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

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

  // Try Gmail API (OAuth)
  if (hasDirectGmailCredentials() || process.env.REPLIT_CONNECTORS_HOSTNAME) {
    const gmail = await getUncachableGmailClient();
    
    const boundary = 'boundary_' + Date.now();
    
    const emailLines = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset=utf-8',
      '',
      body,
      '',
      `--${boundary}`,
      `Content-Type: ${mimeType}; name="${attachmentName}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${attachmentName}"`,
      '',
      attachment.toString('base64'),
      '',
      `--${boundary}--`
    ];
    
    const email = emailLines.join('\r\n');
    const encodedEmail = Buffer.from(email).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail
      }
    });
    
    return result;
  }

  throw new Error('Email not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD environment variables in Railway.');
}
