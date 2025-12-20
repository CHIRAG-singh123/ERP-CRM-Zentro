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
  const isDevelopment = emailProvider === 'development';

  // Development mode - console logging only
  if (isDevelopment) {
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
    if (emailProvider === 'gmail') {
      console.error('💡 Gmail Setup Tips:');
      console.error('   1. Ensure GMAIL_USER is set to your Gmail address');
      console.error('   2. Ensure GMAIL_APP_PASSWORD is set (use App Password, not regular password)');
      console.error('   3. Generate App Password at: https://myaccount.google.com/apppasswords');
      console.error('   4. Make sure 2-Step Verification is enabled on your Google account');
    }
  }

  return transporter;
};

/**
 * Create Gmail transporter
 */
const createGmailTransporter = () => {
  const user = process.env.GMAIL_USER || process.env.SMTP_USER;
  const password = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS;

  if (!user) {
    throw new Error('Gmail configuration missing: GMAIL_USER (or SMTP_USER) is required. Please set it in your .env file.');
  }

  if (!password) {
    throw new Error('Gmail configuration missing: GMAIL_APP_PASSWORD (or SMTP_PASS) is required. Please set it in your .env file. Note: Use an App Password, not your regular Gmail password.');
  }

  if (!user.includes('@gmail.com') && !user.includes('@googlemail.com')) {
    console.warn(`⚠️ Warning: GMAIL_USER (${user}) doesn't appear to be a Gmail address. Make sure this is correct.`);
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
 * Generate professional HTML email template for general emails
 */
const generateGeneralEmailTemplate = (subject, message, fromEmail, fromName = '') => {
  const appName = process.env.APP_NAME || 'ERP-CRM';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  
  // Escape HTML in message to prevent XSS
  const escapeHtml = (text) => {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  };

  const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');
  const displayFromName = fromName || fromEmail.split('@')[0];

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
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
    .message-content {
      background-color: #f8f9fa;
      border-left: 4px solid #667eea;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
      color: #333333;
      font-size: 16px;
      line-height: 1.8;
    }
    .sender-info {
      background-color: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 6px;
      padding: 15px;
      margin: 20px 0;
      font-size: 14px;
      color: #495057;
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
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <h1>${appName}</h1>
    </div>
    <div class="email-body">
      <h2>${escapeHtml(subject)}</h2>
      <div class="message-content">
        ${safeMessage}
      </div>
      <div class="sender-info">
        <strong>From:</strong> ${escapeHtml(displayFromName)} &lt;${escapeHtml(fromEmail)}&gt;
      </div>
    </div>
    <div class="email-footer">
      <p>This email was sent from ${appName}.</p>
      <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
      <p><a href="${frontendUrl}">Visit our website</a></p>
    </div>
  </div>
</body>
</html>
  `.trim();
};

/**
 * Generate plain text version of general email
 */
const generateGeneralEmailText = (subject, message, fromEmail, fromName = '') => {
  const appName = process.env.APP_NAME || 'ERP-CRM';
  const displayFromName = fromName || fromEmail.split('@')[0];
  
  return `
${subject}

${message}

---
From: ${displayFromName} <${fromEmail}>

This email was sent from ${appName}.
© ${new Date().getFullYear()} ${appName}. All rights reserved.
  `.trim();
};

/**
 * Send general email (for contacts, accounts, etc.)
 * @param {string} toEmail - Recipient email address
 * @param {string} fromEmail - Sender email address
 * @param {string} subject - Email subject
 * @param {string} message - Email message content
 * @param {string} fromName - Optional sender name
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
export const sendGeneralEmail = async (toEmail, fromEmail, subject, message, fromName = '') => {
  // Initialize transporter if not already done
  const emailTransporter = initializeEmailService();
  
  // Development mode - console logging
  if (!emailTransporter) {
    const htmlContent = generateGeneralEmailTemplate(subject, message, fromEmail, fromName);
    const textContent = generateGeneralEmailText(subject, message, fromEmail, fromName);
    
    console.log('\n📧 ========== GENERAL EMAIL (DEVELOPMENT MODE) ==========');
    console.log(`To: ${toEmail}`);
    console.log(`From: ${fromName || fromEmail} <${fromEmail}>`);
    console.log(`Subject: ${subject}`);
    console.log('\n--- HTML Content Preview ---');
    console.log(htmlContent.substring(0, 500) + '...');
    console.log('\n--- Plain Text Content ---');
    console.log(textContent);
    console.log('📧 ============================================================\n');
    
    return { success: true, mode: 'development' };
  }

  // Production mode - send actual email
  const defaultFromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER || 'noreply@example.com';
  const defaultFromName = process.env.FROM_NAME || process.env.APP_NAME || 'ERP-CRM';
  
  // Use the provided fromEmail, but format it properly
  const mailFromEmail = fromEmail || defaultFromEmail;
  const mailFromName = fromName || defaultFromName;
  
  const mailOptions = {
    from: `"${mailFromName}" <${mailFromEmail}>`,
    to: toEmail,
    subject: subject,
    html: generateGeneralEmailTemplate(subject, message, mailFromEmail, mailFromName),
    text: generateGeneralEmailText(subject, message, mailFromEmail, mailFromName),
    replyTo: fromEmail, // Allow replies to go to the actual sender
  };

  try {
    // Verify connection first
    await emailTransporter.verify();
    
    // Send email with retry logic
    const info = await retryWithBackoff(async () => {
      return await emailTransporter.sendMail(mailOptions);
    });

    console.log(`✅ General email sent successfully to ${toEmail}`);
    console.log(`📧 Message ID: ${info.messageId}`);
    
    return {
      success: true,
      messageId: info.messageId,
      provider: emailProvider,
    };
  } catch (error) {
    // Log detailed error information
    console.error(`❌ Failed to send general email to ${toEmail}:`);
    console.error(`   Error: ${error.message}`);
    
    if (error.code) {
      console.error(`   Error Code: ${error.code}`);
    }
    
    if (error.response) {
      console.error(`   SMTP Response: ${error.response}`);
    }

    return {
      success: false,
      error: error.message,
      provider: emailProvider,
    };
  }
};

/**
 * Generate simple HTML email template for order confirmation (similar to forgot password)
 */
const generateOrderConfirmationTemplate = (order, invoice, userName = 'Customer') => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const appName = process.env.APP_NAME || 'ERP-CRM';
  const invoiceId = invoice?._id || invoice?.id || 'unknown';
  const invoiceUrl = `${frontendUrl}/invoices/${invoiceId}`;
  const invoiceNumber = invoice?.invoiceNumber || 'N/A';

  // Simple items list
  const itemsList = (order.items || []).map((item) => {
    const productName = item.productName || 'Product';
    const quantity = item.quantity || 1;
    const price = item.price || 0;
    const total = quantity * price;
    return `${productName} x ${quantity} - $${total.toFixed(2)}`;
  }).join('<br>');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation - ${appName}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333333;
      background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
      padding: 20px;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 40px rgba(102, 126, 234, 0.15);
    }
    .email-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 50px 30px;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    .email-header::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -50%;
      width: 300px;
      height: 300px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 50%;
    }
    .email-header::after {
      content: '';
      position: absolute;
      bottom: -50%;
      left: -50%;
      width: 250px;
      height: 250px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 50%;
    }
    .email-header h1 {
      color: #ffffff;
      font-size: 32px;
      font-weight: 700;
      margin: 0;
      position: relative;
      z-index: 1;
      letter-spacing: 0.5px;
    }
    .success-badge {
      display: inline-block;
      background: rgba(255, 255, 255, 0.2);
      color: #ffffff;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      margin-top: 12px;
      position: relative;
      z-index: 1;
    }
    .email-body {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 18px;
      color: #333333;
      margin-bottom: 8px;
      font-weight: 600;
    }
    .subheading {
      color: #666666;
      font-size: 16px;
      margin-bottom: 30px;
      line-height: 1.5;
    }
    .order-info {
      background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%);
      border-left: 4px solid #667eea;
      border-radius: 8px;
      padding: 24px;
      margin: 30px 0;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.1);
    }
    .order-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid rgba(102, 126, 234, 0.1);
      font-size: 15px;
    }
    .order-row:last-child {
      border-bottom: none;
    }
    .order-label {
      font-weight: 600;
      color: #667eea;
    }
    .order-value {
      color: #333333;
      text-align: right;
      font-weight: 500;
    }
    .items-section {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid rgba(102, 126, 234, 0.1);
    }
    .items-label {
      font-weight: 600;
      color: #667eea;
      display: block;
      margin-bottom: 8px;
    }
    .item-line {
      color: #666666;
      font-size: 14px;
      margin: 6px 0;
      padding-left: 12px;
      border-left: 2px solid #764ba2;
    }
    .amount-highlight {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 18px;
      margin: 12px 0;
    }
    .button-container {
      text-align: center;
      margin: 35px 0;
    }
    .invoice-button {
      display: inline-block;
      padding: 16px 40px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
      transition: all 0.3s ease;
      border: none;
      cursor: pointer;
      letter-spacing: 0.3px;
    }
    .invoice-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.5);
    }
    .invoice-link {
      background-color: #f8f9ff;
      border: 1px dashed #667eea;
      border-radius: 6px;
      padding: 14px;
      margin: 20px 0;
      word-break: break-all;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      color: #667eea;
      line-height: 1.4;
    }
    .support-text {
      color: #666666;
      font-size: 15px;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #e9ecef;
    }
    .email-footer {
      background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%);
      padding: 35px 30px;
      text-align: center;
      border-top: 1px solid #e9ecef;
    }
    .footer-text {
      color: #999999;
      font-size: 13px;
      margin: 6px 0;
      line-height: 1.5;
    }
    .footer-text a {
      color: #667eea;
      text-decoration: none;
      font-weight: 600;
      transition: color 0.3s ease;
    }
    .footer-text a:hover {
      color: #764ba2;
    }
    .copyright {
      font-size: 12px;
      color: #999999;
      margin-top: 10px;
    }
    .divider {
      height: 1px;
      background: linear-gradient(90deg, transparent, #667eea, transparent);
      margin: 15px 0;
      opacity: 0.3;
    }
    @media only screen and (max-width: 600px) {
      .email-body {
        padding: 25px 20px;
      }
      .email-header {
        padding: 35px 20px;
      }
      .email-header h1 {
        font-size: 26px;
      }
      .order-info {
        padding: 16px;
      }
      .order-row {
        flex-direction: column;
      }
      .order-value {
        text-align: left;
        margin-top: 4px;
      }
      .invoice-button {
        display: block;
        margin: 0 auto;
        width: 100%;
      }
      .email-footer {
        padding: 25px 20px;
      }
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <h1>✓ ${appName}</h1>
      <div class="success-badge">ORDER RECEIVED</div>
    </div>
    <div class="email-body">
      <div class="greeting">Hello ${userName},</div>
      <div class="subheading">Thank you for your order! Your order has been received and is being processed.</div>
      
      <div class="order-info">
        <div class="order-row">
          <span class="order-label">Order Number</span>
          <span class="order-value">${order.orderNumber || 'N/A'}</span>
        </div>
        <div class="order-row">
          <span class="order-label">Invoice Number</span>
          <span class="order-value">${invoiceNumber}</span>
        </div>
        <div class="order-row">
          <span class="order-label">Order Status</span>
          <span class="order-value">Pending Processing</span>
        </div>
        <div class="order-row">
          <span class="order-label">Payment Status</span>
          <span class="order-value" style="color: #28a745; font-weight: 700;">✓ ${order.paymentStatus || 'Paid'}</span>
        </div>
        <div class="divider"></div>
        <div class="order-row">
          <span class="order-label">Total Amount</span>
          <span class="order-value" style="font-size: 18px; font-weight: 700; color: #667eea;">$${(order.totalAmount || 0).toFixed(2)}</span>
        </div>
        <div class="items-section">
          <span class="items-label">📦 Items Ordered</span>
          ${itemsList.split('<br>').map(item => `<div class="item-line">${item}</div>`).join('')}
        </div>
      </div>
      
      <div class="button-container">
        <a href="${invoiceUrl}" class="invoice-button">📄 View Invoice</a>
      </div>
      
      <div style="font-size: 14px; color: #666666; margin-top: 25px;">
        <strong>Or copy and paste this link:</strong>
        <div class="invoice-link">${invoiceUrl}</div>
      </div>
      
      <div class="support-text">
        <strong style="color: #333333;">Questions about your order?</strong><br>
        Our support team is here to help. Feel free to reach out anytime.
      </div>
    </div>
    <div class="email-footer">
      <div class="footer-text">
        <strong style="color: #667eea;">Thank you for shopping with us!</strong>
      </div>
      <div class="footer-text">
        Track your order status and access your invoices anytime from your account
      </div>
      <div class="footer-text">
        <a href="${frontendUrl}">Visit our website</a>
      </div>
      <div class="copyright">
        &copy; ${new Date().getFullYear()} ${appName}. All rights reserved.<br>
        This is an automated message, please do not reply to this email.
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
};

/**
 * Generate plain text version of order confirmation email
 */
const generateOrderConfirmationText = (order, invoice, userName = 'Customer') => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const appName = process.env.APP_NAME || 'ERP-CRM';
  const invoiceId = invoice?._id || invoice?.id || 'unknown';
  const invoiceUrl = `${frontendUrl}/invoices/${invoiceId}`;
  const invoiceNumber = invoice?.invoiceNumber || 'N/A';

  const itemsText = (order.items || []).map((item) => {
    const productName = item.productName || 'Product';
    const quantity = item.quantity || 1;
    const price = item.price || 0;
    const total = quantity * price;
    return `  - ${productName} x ${quantity} - $${total.toFixed(2)}`;
  }).join('\n');

  return `
Order Confirmation

Hello ${userName},

Thank you for your order! Your order has been received and is being processed.

Order Number: ${order.orderNumber || 'N/A'}
Invoice Number: ${invoiceNumber}
Total Amount: $${(order.totalAmount || 0).toFixed(2)}
Payment Status: ${order.paymentStatus || 'Paid'}

Items:
${itemsText}

View your invoice: ${invoiceUrl}

If you have any questions about your order, please contact our support team.

---
This is an automated message, please do not reply to this email.
© ${new Date().getFullYear()} ${appName}. All rights reserved.
  `.trim();
};

/**
 * Send order confirmation email
 * @param {Object} user - User object with email and name
 * @param {Object} order - Order object
 * @param {Object} invoice - Invoice object
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
export const sendOrderConfirmationEmail = async (user, order, invoice) => {
  // Initialize transporter if not already done
  const emailTransporter = initializeEmailService();
  
  const userName = user.name || 'Customer';
  const userEmail = user.email;
  const defaultFromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER || 'noreply@example.com';
  const defaultFromName = process.env.FROM_NAME || process.env.APP_NAME || 'ERP-CRM';
  
  // Development mode - console logging
  if (!emailTransporter) {
    const htmlContent = generateOrderConfirmationTemplate(order, invoice, userName);
    const textContent = generateOrderConfirmationText(order, invoice, userName);
    
    console.log('\n📧 ========== ORDER CONFIRMATION EMAIL (DEVELOPMENT MODE) ==========');
    console.log(`To: ${userEmail}`);
    console.log(`From: ${defaultFromName} <${defaultFromEmail}>`);
    console.log(`Subject: Order Confirmation - ${order.orderNumber}`);
    console.log('\n--- HTML Content Preview ---');
    console.log(htmlContent.substring(0, 500) + '...');
    console.log('\n--- Plain Text Content ---');
    console.log(textContent);
    console.log('📧 ============================================================\n');
    
    return { success: true, mode: 'development' };
  }

  // Production mode - send actual email
  const mailOptions = {
    from: `"${defaultFromName}" <${defaultFromEmail}>`,
    to: userEmail,
    subject: `Order Confirmation - ${order.orderNumber}`,
    html: generateOrderConfirmationTemplate(order, invoice, userName),
    text: generateOrderConfirmationText(order, invoice, userName),
  };

  try {
    // Verify connection first
    await emailTransporter.verify();
    
    // Send email with retry logic
    const info = await retryWithBackoff(async () => {
      return await emailTransporter.sendMail(mailOptions);
    });

    console.log(`✅ Order confirmation email sent successfully to ${userEmail}`);
    console.log(`📧 Message ID: ${info.messageId}`);
    
    return {
      success: true,
      messageId: info.messageId,
      provider: emailProvider,
    };
  } catch (error) {
    // Log detailed error information
    console.error(`❌ Failed to send order confirmation email to ${userEmail}:`);
    console.error(`   Error: ${error.message}`);
    
    if (error.code) {
      console.error(`   Error Code: ${error.code}`);
    }
    
    if (error.response) {
      console.error(`   SMTP Response: ${error.response}`);
    }

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
