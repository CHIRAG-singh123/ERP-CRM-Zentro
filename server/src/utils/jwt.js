import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production-12345';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-in-production-67890';
const JWT_VERIFICATION_SECRET = process.env.JWT_VERIFICATION_SECRET || JWT_SECRET;
const JWT_SESSION_SECRET = process.env.JWT_SESSION_SECRET || JWT_SECRET;
const JWT_LOGIN_LINK_SECRET = process.env.JWT_LOGIN_LINK_SECRET || JWT_SECRET;
const JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const JWT_VERIFICATION_EXPIRES_IN = process.env.JWT_VERIFICATION_EXPIRES_IN || '1h';
const JWT_SESSION_EXPIRES_IN = process.env.JWT_SESSION_EXPIRES_IN || '15m'; // 15 minutes for session token
const JWT_LOGIN_LINK_EXPIRES_IN = process.env.JWT_LOGIN_LINK_EXPIRES_IN || '24h'; // 24 hours for login link

if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
  console.warn('⚠️  WARNING: Using default JWT secrets. Set JWT_SECRET and JWT_REFRESH_SECRET in .env for production!');
}

export const generateAccessToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: JWT_ACCESS_EXPIRES_IN,
  });
};

export const generateRefreshToken = (userId) => {
  return jwt.sign({ userId }, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  });
};

export const verifyToken = (token, type = 'access') => {
  try {
    const secret = type === 'refresh' ? JWT_REFRESH_SECRET : JWT_SECRET;
    return jwt.verify(token, secret);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

export const generateVerificationToken = (userId) => {
  return jwt.sign({ userId, type: 'verification' }, JWT_VERIFICATION_SECRET, {
    expiresIn: JWT_VERIFICATION_EXPIRES_IN,
  });
};

export const verifyVerificationToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_VERIFICATION_SECRET);
    if (decoded.type !== 'verification') {
      throw new Error('Invalid token type');
    }
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired verification token');
  }
};

/**
 * Generate session token for Google OAuth profile data
 * Used to securely pass Google profile to frontend for password setup
 */
export const generateSessionToken = (googleProfileData) => {
  return jwt.sign(
    { 
      type: 'google_session',
      profile: googleProfileData 
    }, 
    JWT_SESSION_SECRET, 
    {
      expiresIn: JWT_SESSION_EXPIRES_IN,
    }
  );
};

/**
 * Verify and decode session token
 */
export const verifySessionToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SESSION_SECRET);
    if (decoded.type !== 'google_session') {
      throw new Error('Invalid token type');
    }
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired session token');
  }
};

/**
 * Generate login link token for email login links
 * Used in emails to allow direct login without password
 */
export const generateLoginLinkToken = (userId) => {
  return jwt.sign(
    { 
      userId,
      type: 'login_link' 
    }, 
    JWT_LOGIN_LINK_SECRET, 
    {
      expiresIn: JWT_LOGIN_LINK_EXPIRES_IN,
    }
  );
};

/**
 * Verify and decode login link token
 */
export const verifyLoginLinkToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_LOGIN_LINK_SECRET);
    if (decoded.type !== 'login_link') {
      throw new Error('Invalid token type');
    }
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired login link token');
  }
};

