# Email Configuration Guide

This document explains how to configure email sending for the forgot password functionality.

## Quick Start

1. Choose an email provider (Gmail, SendGrid, or Generic SMTP)
2. Add the required environment variables to your `.env` file
3. Restart the server

## Environment Variables

### Required for All Providers

```env
# Email Provider: 'gmail', 'sendgrid', 'smtp', or 'development'
EMAIL_PROVIDER=development

# Frontend URL (used for password reset links)
FRONTEND_URL=http://localhost:5173

# App Information (used in email templates)
APP_NAME=ERP-CRM

# Email Sender Information
FROM_EMAIL=noreply@example.com
FROM_NAME=ERP-CRM
```

## Provider-Specific Configuration

### Option 1: Gmail (Recommended for Quick Setup)

Gmail requires an App Password (not your regular password).

**Steps:**
1. Enable 2-Step Verification on your Google Account
2. Go to: https://myaccount.google.com/apppasswords
3. Generate an App Password for "Mail"
4. Use that 16-character password

**Environment Variables:**
```env
EMAIL_PROVIDER=gmail
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-character-app-password
```

### Option 2: SendGrid (Recommended for Production)

SendGrid offers a free tier with 100 emails/day.

**Steps:**
1. Sign up at https://sendgrid.com
2. Create an API key at https://app.sendgrid.com/settings/api_keys
3. Copy the API key

**Environment Variables:**
```env
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.your-sendgrid-api-key-here
```

### Option 3: Generic SMTP (Works with Any Email Provider)

Works with Gmail, Outlook, custom SMTP servers, etc.

**Environment Variables:**
```env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password-or-app-password
```

**Common SMTP Settings:**
- **Gmail**: `smtp.gmail.com`, port `587` (secure: false) or port `465` (secure: true)
- **Outlook**: `smtp-mail.outlook.com`, port `587`, secure: false
- **Yahoo**: `smtp.mail.yahoo.com`, port `587`, secure: false

### Option 4: Development Mode (Default)

When `EMAIL_PROVIDER=development` or no email config is provided, emails are logged to console instead of being sent. This is useful for development and testing.

**No additional configuration needed.**

## Complete .env Example

```env
# Server Configuration
NODE_ENV=development
PORT=5000

# Frontend URL
FRONTEND_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173

# Database
MONGODB_URI=mongodb://localhost:27017/CRM_DB

# JWT Secrets
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key

# Email Configuration (choose one provider)
EMAIL_PROVIDER=gmail
APP_NAME=ERP-CRM
FROM_EMAIL=noreply@example.com
FROM_NAME=ERP-CRM

# Gmail Configuration
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password

# OR SendGrid Configuration
# SENDGRID_API_KEY=SG.your-api-key

# OR Generic SMTP Configuration
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=your-email@example.com
# SMTP_PASS=your-password
```

## Testing Email Configuration

After configuring your email provider, restart the server. The email service will automatically:
- Initialize on server start
- Verify the connection
- Log status to console

Look for these messages in your server logs:
- `✅ Email Service initialized with provider: gmail` (success)
- `❌ Failed to initialize email service: ...` (configuration error)

## Troubleshooting

### Emails Not Sending

1. **Check server logs** for error messages
2. **Verify environment variables** are set correctly
3. **Test SMTP connection** - check if your email provider requires:
   - App passwords (Gmail)
   - Less secure app access enabled
   - Specific ports or security settings
4. **Check spam folder** - emails might be filtered

### Gmail Issues

- Must use App Password, not regular password
- 2-Step Verification must be enabled
- Check if "Less secure app access" is enabled (if not using App Password)

### SendGrid Issues

- Verify API key is correct
- Check SendGrid account status
- Verify sender email is verified in SendGrid

### SMTP Connection Errors

- Verify host, port, and security settings
- Check firewall/network restrictions
- Try different ports (587 vs 465)
- Verify credentials are correct

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use App Passwords** instead of regular passwords when possible
3. **Rotate credentials** regularly
4. **Use environment-specific configurations** (dev, staging, prod)
5. **Monitor email sending** for suspicious activity

## Support

For issues or questions:
- Check server logs for detailed error messages
- Review email provider documentation
- Verify all environment variables are set correctly

