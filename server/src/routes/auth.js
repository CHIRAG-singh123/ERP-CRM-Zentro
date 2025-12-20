import express from 'express';
import passport from '../config/passport.js';
import {
  register,
  login,
  logout,
  refreshToken,
  getMe,
  updateProfile,
  updateEmail,
  updatePassword,
  uploadAvatar,
  forgotPassword,
  resetPassword,
  verifyEmail,
  googleCallback,
  completeGoogleSignup,
  handleLoginLink,
  getGoogleProfile,
} from '../controllers/authController.js';
import { authenticate } from '../middlewares/auth.js';
import {
  registerValidation,
  loginValidation,
  updateProfileValidation,
  updateEmailValidation,
  updatePasswordValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
} from '../utils/validation.js';
import { avatarUpload } from '../utils/upload.js';

const router = express.Router();

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/logout', logout);
router.post('/refresh', refreshToken);
router.post('/forgot', forgotPasswordValidation, forgotPassword);
router.post('/reset', resetPasswordValidation, resetPassword);
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfileValidation, updateProfile);
router.put('/email', authenticate, updateEmailValidation, updateEmail);
router.put('/password', authenticate, updatePasswordValidation, updatePassword);
router.post('/avatar', authenticate, avatarUpload.single('avatar'), uploadAvatar);

// Google OAuth routes
router.get('/google', (req, res, next) => {
  // Check if Google OAuth is configured
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || 
      process.env.GOOGLE_CLIENT_SECRET === 'your_google_client_secret_here') {
    console.error('❌ Google OAuth not configured');
    return res.status(503).json({ 
      error: 'Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your environment variables.',
      hint: 'Make sure to restart the server after updating .env file'
    });
  }
  
  // Build callback URL for reference and validation
  const port = process.env.PORT || 5000;
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const host = process.env.HOST || 'localhost';
  const callbackURL = process.env.GOOGLE_CALLBACK_URL || `${protocol}://${host}:${port}/api/auth/google/callback`;
  
  // Log request details for debugging
  console.log(`\n🔐 ========== Google OAuth Request ==========`);
  console.log(`   Request from: ${req.protocol}://${req.get('host')}${req.originalUrl}`);
  console.log(`   Client IP: ${req.ip}`);
  console.log(`   User-Agent: ${req.get('user-agent')?.substring(0, 50)}...`);
  console.log(`   Callback URL configured: ${callbackURL}`);
  console.log(`   ⚠️  CRITICAL: This callback URL MUST be in Google Cloud Console!`);
  console.log(`   ⚠️  It must use BACKEND port (${port}), NOT frontend port (5173)`);
  console.log(`   ===========================================\n`);
  
  // Validate that callback URL doesn't use frontend port
  if (callbackURL.includes(':5173')) {
    console.error('❌ FATAL ERROR: Callback URL uses frontend port!');
    console.error('   Callback URL:', callbackURL);
    console.error('   This will cause redirect_uri_mismatch error!');
    return res.status(500).json({ 
      error: 'Server misconfiguration: Callback URL uses frontend port.',
      details: 'Callback URL must use backend port (5000), not frontend port (5173)',
      callbackURL: callbackURL,
      fix: 'Set GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback in .env'
    });
  }
  
  try {
    // Use passport authenticate if strategy is available
    passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
  } catch (error) {
    console.error('❌ Google OAuth authentication error:', error.message);
    console.error('   Stack:', error.stack);
    return res.status(503).json({ 
      error: 'Google OAuth is not properly configured.',
      details: error.message,
      hint: 'Check that the Google OAuth strategy is registered and credentials are valid'
    });
  }
});

router.get(
  '/google/callback',
  (req, res, next) => {
    console.log('\n📥 ========== Google OAuth Callback ==========');
    console.log('   Request URL:', req.protocol + '://' + req.get('host') + req.originalUrl);
    console.log('   Query params:', JSON.stringify(req.query, null, 2));
    console.log('   Referer:', req.get('referer') || 'none');
    
    // Check if Google OAuth is configured
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET ||
        process.env.GOOGLE_CLIENT_SECRET === 'your_google_client_secret_here') {
      console.error('❌ Google OAuth not configured in callback');
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=oauth_not_configured`);
    }
    
    // Check for OAuth errors from Google
    if (req.query.error) {
      console.error('❌ Google OAuth error received:');
      console.error('   Error code:', req.query.error);
      console.error('   Error description:', req.query.error_description);
      console.error('   Error URI:', req.query.error_uri);
      
      // Special handling for redirect_uri_mismatch
      if (req.query.error === 'redirect_uri_mismatch') {
        const port = process.env.PORT || 5000;
        const expectedCallback = process.env.GOOGLE_CALLBACK_URL || `http://localhost:${port}/api/auth/google/callback`;
        console.error('\n❌ REDIRECT_URI_MISMATCH DETECTED!');
        console.error('   This means the callback URL in Google Cloud Console does not match!');
        console.error('   Expected callback URL:', expectedCallback);
        console.error('   ⚠️  ACTION REQUIRED:');
        console.error('   1. Go to Google Cloud Console → APIs & Services → Credentials');
        console.error('   2. Click your OAuth 2.0 Client ID');
        console.error('   3. Under "Authorised redirect URIs", add:');
        console.error(`      ${expectedCallback}`);
        console.error('   4. Save and wait a few minutes for changes to propagate');
        console.error('   5. Make sure the URL uses BACKEND port (5000), NOT frontend (5173)');
      }
      
      const errorMsg = req.query.error_description || req.query.error;
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=oauth_failed&details=${encodeURIComponent(errorMsg)}`);
    }
    
    try {
      // Use custom callback to handle Google profiles before session serialization
      passport.authenticate('google', { 
        failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=oauth_failed`,
        session: false // Disable session for this authentication - we'll handle it manually
      }, async (err, userOrProfile, info) => {
        if (err) {
          console.error('❌ Google OAuth authentication error:', err);
          return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=oauth_failed`);
        }

        if (!userOrProfile) {
          console.error('❌ No user/profile returned from Google OAuth');
          return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=oauth_failed`);
        }

        // Check if this is a Google profile (new user) or existing user
        if (userOrProfile._isGoogleProfile) {
          // New user - handle directly without session serialization
          // Pass profile to callback via req.user (bypasses Passport session)
          req.user = userOrProfile;
          return googleCallback(req, res, next);
        } else {
          // Existing user - proceed with normal flow
          // Set user in request and continue to callback
          req.user = userOrProfile;
          // Manually log in the user for session
          req.login(userOrProfile, (err) => {
            if (err) {
              console.error('Error logging in user:', err);
              return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=login_failed`);
            }
            return googleCallback(req, res, next);
          });
        }
      })(req, res, next);
    } catch (error) {
      console.error('❌ Google OAuth callback error:', error.message);
      console.error('   Stack:', error.stack);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=oauth_not_configured`);
    }
  }
);

// Email verification route
router.get('/verify-email', verifyEmail);

// Google OAuth completion routes
router.get('/google-profile', getGoogleProfile);
router.post('/complete-google-signup', completeGoogleSignup);

// Login link route (from email)
router.get('/login-link', handleLoginLink);

export default router;

