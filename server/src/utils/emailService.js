/**
 * Email Service Utility
 * Production-ready email service with support for multiple providers
 * Supports: Gmail, SendGrid, Generic SMTP, and Development mode
 */

import nodemailer from 'nodemailer';
import htmlToTextPlugin from 'nodemailer-html-to-text';

// Email service configuration
let transporter = null;
let emailProvider = null;

/**
 * Initialize email transporter based on environment configuration
 */
const initializeEmailService = () => {
  if (transporter) {
    return transporter; // Already initialized
  }

  emailProvider = (process.env.EMAIL_PROVIDER || 'development').toLowerCase();
  const isDevelopment = process.env.NODE_ENV !== 'production' || emailProvider === 'development';

  // Development mode - console logging only
  if (isDevelopment && !process.env.SMTP_HOST) {
    console.log('📧 Email Service: Running in DEVELOPMENT mode (console logging only)');
    console.log('📧 To enable real email sending, configure EMAIL_PROVIDER and SMTP settings in .env');
    return null;
  }

  try {
    switch (emailProvider) {
      case 'gmail':
        transporter = createGmailTransporter();
        break;
      case 'sendgrid':
        transporter = createSendGridTransporter();
        break;
      case 'smtp':
      default:
        transporter = createSMTPTransporter();
        break;
    }

    if (transporter) {
      // Add HTML to text converter as fallback (we already provide text, but this ensures compatibility)
      try {
        transporter.use('compile', htmlToTextPlugin.htmlToText());
      } catch (error) {
        // Plugin is optional, continue without it if there's an issue
        console.warn('⚠️ HTML to text plugin could not be loaded, continuing without it');
      }
      console.log(`✅ Email Service initialized with provider: ${emailProvider}`);
    }
  } catch (error) {
    console.error('❌ Failed to initialize email service:', error.message);
    console.error('📧 Email sending will be disabled. Please check your email configuration.');
  }

  return transporter;
};

/**
 * Create Gmail transporter
 */
const createGmailTransporter = () => {
  const user = process.env.GMAIL_USER || process.env.SMTP_USER;
  const password = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS;

  if (!user || !password) {
    throw new Error('Gmail configuration missing: GMAIL_USER and GMAIL_APP_PASSWORD required');
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass: password,
    },
  });
};

/**
 * Create SendGrid transporter
 */
const createSendGridTransporter = () => {
  const apiKey = process.env.SENDGRID_API_KEY;

  if (!apiKey) {
    throw new Error('SendGrid configuration missing: SENDGRID_API_KEY required');
  }

  return nodemailer.createTransport({
    host: 'smtp.sendgrid.net',
    port: 587,
    secure: false,
    auth: {
      user: 'apikey',
      pass: apiKey,
    },
  });
};

/**
 * Create generic SMTP transporter
 */
const createSMTPTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error('SMTP configuration missing: SMTP_HOST, SMTP_USER, and SMTP_PASS required');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    // Additional options for better compatibility
    tls: {
      rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== 'false',
    },
  });
};

/**
 * Generate professional HTML email template for password reset
 */
const generatePasswordResetTemplate = (resetUrl, userName = 'User') => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const appName = process.env.APP_NAME || 'ERP-CRM';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333333;
      background-color: #f4f4f4;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .email-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .email-header h1 {
      color: #ffffff;
      font-size: 28px;
      font-weight: 600;
      margin: 0;
    }
    .email-body {
      padding: 40px 30px;
    }
    .email-body h2 {
      color: #333333;
      font-size: 24px;
      margin-bottom: 20px;
    }
    .email-body p {
      color: #666666;
      font-size: 16px;
      margin-bottom: 20px;
    }
    .button-container {
      text-align: center;
      margin: 30px 0;
    }
    .reset-button {
      display: inline-block;
      padding: 14px 32px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
      transition: opacity 0.3s;
    }
    .reset-button:hover {
      opacity: 0.9;
    }
    .reset-link {
      background-color: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 6px;
      padding: 15px;
      margin: 20px 0;
      word-break: break-all;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      color: #495057;
    }
    .security-notice {
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .security-notice p {
      color: #856404;
      font-size: 14px;
      margin: 0;
    }
    .email-footer {
      background-color: #f8f9fa;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e9ecef;
    }
    .email-footer p {
      color: #6c757d;
      font-size: 14px;
      margin: 5px 0;
    }
    .email-footer a {
      color: #667eea;
      text-decoration: none;
    }
    @media only screen and (max-width: 600px) {
      .email-body {
        padding: 30px 20px;
      }
      .email-header {
        padding: 30px 20px;
      }
      .reset-button {
        display: block;
        margin: 0 auto;
      }
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <h1>${appName}</h1>
    </div>
    <div class="email-body">
      <h2>Reset Your Password</h2>
      <p>Hello ${userName},</p>
      <p>We received a request to reset your password. Click the button below to create a new password:</p>
      
      <div class="button-container">
        <a href="${resetUrl}" class="reset-button">Reset Password</a>
      </div>
      
      <p>Or copy and paste this link into your browser:</p>
      <div class="reset-link">${resetUrl}</div>
      
      <div class="security-notice">
        <p><strong>Security Notice:</strong></p>
        <p>• This link will expire in 1 hour</p>
        <p>• If you didn't request this password reset, please ignore this email</p>
        <p>• For security reasons, never share this link with anyone</p>
      </div>
      
      <p>If you continue to have problems, please contact our support team.</p>
    </div>
    <div class="email-footer">
      <p>This is an automated message, please do not reply to this email.</p>
      <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
      <p><a href="${frontendUrl}">Visit our website</a></p>
    </div>
  </div>
</body>
</html>
  `.trim();
};

/**
 * Generate plain text version of password reset email
 */
const generatePasswordResetText = (resetUrl, userName = 'User') => {
  const appName = process.env.APP_NAME || 'ERP-CRM';
  
  return `
Reset Your Password

Hello ${userName},

We received a request to reset your password. Please click the following link to create a new password:

${resetUrl}

Security Notice:
- This link will expire in 1 hour
- If you didn't request this password reset, please ignore this email
- For security reasons, never share this link with anyone

If you continue to have problems, please contact our support team.

---
This is an automated message, please do not reply to this email.
© ${new Date().getFullYear()} ${appName}. All rights reserved.
  `.trim();
};

/**
 * Retry mechanism with exponential backoff
 */
const retryWithBackoff = async (fn, maxRetries = 3, initialDelay = 1000) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = initialDelay * Math.pow(2, attempt - 1);
      console.log(`⚠️ Email send attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

/**
 * Send password reset email
 * @param {string} email - Recipient email
 * @param {string} resetToken - Password reset token
 * @param {string} resetUrl - Full reset URL
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
export const sendPasswordResetEmail = async (email, resetToken, resetUrl) => {
  // Initialize transporter if not already done
  const emailTransporter = initializeEmailService();
  
  // Development mode - console logging
  if (!emailTransporter) {
    const userName = email.split('@')[0];
    const htmlContent = generatePasswordResetTemplate(resetUrl, userName);
    const textContent = generatePasswordResetText(resetUrl, userName);
    
    console.log('\n📧 ========== PASSWORD RESET EMAIL (DEVELOPMENT MODE) ==========');
    console.log(`To: ${email}`);
    console.log(`Subject: Reset Your Password`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log(`Reset Token: ${resetToken}`);
    console.log('\n--- HTML Content Preview ---');
    console.log(htmlContent.substring(0, 500) + '...');
    console.log('\n--- Plain Text Content ---');
    console.log(textContent);
    console.log('📧 ============================================================\n');
    
    return { success: true, mode: 'development' };
  }

  // Production mode - send actual email
  const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER || 'noreply@example.com';
  const fromName = process.env.FROM_NAME || process.env.APP_NAME || 'ERP-CRM';
  const userName = email.split('@')[0];
  
  const mailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to: email,
    subject: 'Reset Your Password',
    html: generatePasswordResetTemplate(resetUrl, userName),
    text: generatePasswordResetText(resetUrl, userName),
  };

  try {
    // Verify connection first
    await emailTransporter.verify();
    
    // Send email with retry logic
    const info = await retryWithBackoff(async () => {
      return await emailTransporter.sendMail(mailOptions);
    });

    console.log(`✅ Password reset email sent successfully to ${email}`);
    console.log(`📧 Message ID: ${info.messageId}`);
    
    return {
      success: true,
      messageId: info.messageId,
      provider: emailProvider,
    };
  } catch (error) {
    // Log detailed error information
    console.error(`❌ Failed to send password reset email to ${email}:`);
    console.error(`   Error: ${error.message}`);
    
    if (error.code) {
      console.error(`   Error Code: ${error.code}`);
    }
    
    if (error.response) {
      console.error(`   SMTP Response: ${error.response}`);
    }

    // Don't throw error - we don't want to expose email sending failures to users
    // This prevents email enumeration attacks
    return {
      success: false,
      error: error.message,
      provider: emailProvider,
    };
  }
};

/**
 * Verify email service configuration
 * @returns {Promise<{valid: boolean, message: string, provider?: string}>}
 */
export const verifyEmailService = async () => {
  try {
    const emailTransporter = initializeEmailService();
    
    if (!emailTransporter) {
      return {
        valid: false,
        message: 'Email service not configured (development mode)',
      };
    }

    await emailTransporter.verify();
    
    return {
      valid: true,
      message: 'Email service is properly configured',
      provider: emailProvider,
    };
  } catch (error) {
    return {
      valid: false,
      message: `Email service verification failed: ${error.message}`,
      provider: emailProvider,
    };
  }
};

// Initialize on module load
initializeEmailService();
