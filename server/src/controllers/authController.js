import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { createUser, validateUserCredentials } from '../services/authService.js';
import { generateAccessToken, generateRefreshToken, verifyToken, generateVerificationToken, verifyVerificationToken, generateSessionToken, verifySessionToken, generateLoginLinkToken, verifyLoginLinkToken } from '../utils/jwt.js';
import { User } from '../models/User.js';
import { sendPasswordResetEmail, sendGeneralEmail } from '../utils/emailService.js';

export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const user = await createUser({ name, email, password });

    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: user.toJSON(),
      accessToken,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await validateUserCredentials(email, password);

    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      message: 'Login successful',
      user: user.toJSON(),
      accessToken,
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res) => {
  res.clearCookie('refreshToken');
  res.json({ message: 'Logout successful' });
};

export const refreshToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ error: 'No refresh token provided' });
    }

    try {
      const decoded = verifyToken(refreshToken, 'refresh');
      const newAccessToken = generateAccessToken(decoded.userId);

      res.json({
        accessToken: newAccessToken,
      });
    } catch (error) {
      res.clearCookie('refreshToken');
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res) => {
  res.json({
    user: req.user,
  });
};

export const updateProfile = async (req, res, next) => {
  try {
    const { name, profile } = req.body || {};
    const updates = {};

    if (name) {
      updates.name = name.trim();
    }
    if (profile?.timezone) {
      updates['profile.timezone'] = profile.timezone;
    }
    if (profile?.companyInfo !== undefined) {
      updates['profile.companyInfo'] = profile.companyInfo;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-passwordHash');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      user,
    });
  } catch (error) {
    next(error);
  }
};

export const updateEmail = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and current password are required' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Incorrect password' });
    }

    if (user.email === email) {
      return res.status(400).json({ error: 'New email must be different from current email' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser._id.toString() !== user._id.toString()) {
      return res.status(400).json({ error: 'Email is already in use' });
    }

    user.email = email;
    await user.save();

    res.json({
      message: 'Email updated successfully',
      user: user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

export const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isCurrentValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      return res.status(400).json({ error: 'Incorrect current password' });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ error: 'New password must be different from current password' });
    }

    const saltRounds = 10;
    const newHash = await bcrypt.hash(newPassword, saltRounds);
    user.passwordHash = newHash;
    await user.save();

    res.json({
      message: 'Password updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const avatarPath = `/uploads/avatars/${req.file.filename}`;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { 'profile.avatar': avatarPath } },
      { new: true }
    ).select('-passwordHash');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(201).json({
      message: 'Avatar uploaded successfully',
      avatarUrl: avatarPath,
      user,
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    
    // Don't reveal if user exists or not for security
    if (!user) {
      return res.json({
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    user.resetToken = resetToken;
    user.resetTokenExpiry = resetTokenExpiry;
    await user.save();

    // Generate reset URL
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

    // Send email with proper error handling
    try {
      const emailResult = await sendPasswordResetEmail(user.email, resetToken, resetUrl);
      
      if (emailResult.success) {
        console.log(`✅ Password reset email sent successfully to ${user.email}`);
      } else {
        // Log error but don't expose to user (security best practice)
        console.error(`⚠️ Password reset email failed for ${user.email}:`, emailResult.error);
        // Continue execution - we still return success to prevent email enumeration
      }
    } catch (emailError) {
      // Log email errors but don't fail the request
      console.error(`⚠️ Error sending password reset email to ${user.email}:`, emailError.message);
      // Continue execution - we still return success to prevent email enumeration
    }

    // Always return success message (security best practice - prevents email enumeration)
    res.json({
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Hash new password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Update password and clear reset token
    user.passwordHash = passwordHash;
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    res.json({
      message: 'Password has been reset successfully. You can now login with your new password.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send verification email to user
 * @param {Object} user - User object
 */
export const sendVerificationEmail = async (user) => {
  try {
    const token = generateVerificationToken(user._id.toString());
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/verify-email?token=${token}`;

    const subject = 'Verify Your Email Address';
    const appName = process.env.APP_NAME || 'ERP-CRM-Zentro';
    const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER || 'noreply@example.com';
    const fromName = process.env.FROM_NAME || appName;

    const message = `Hello ${user.name || 'User'}!

Thank you for signing up with ${appName}!

To complete your registration and activate your account, please verify your email address by clicking the link below:

${verificationUrl}

This verification link will expire in 1 hour.

If you did not create an account with ${appName}, please ignore this email.

Best regards,
The ${appName} Team`;

    await sendGeneralEmail(
      user.email,
      fromEmail,
      subject,
      message,
      fromName
    );

    // Store verification token in user document
    user.verificationToken = token;
    user.verificationTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    return { success: true };
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
};

/**
 * Send login link email (for Google OAuth signup completion)
 * Contains a direct login link that logs user in and redirects to dashboard
 */
export const sendLoginLinkEmail = async (user) => {
  try {
    // Simple login page link - no token needed
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const loginUrl = `${frontendUrl}/login`;

    const subject = 'Welcome! Your Account is Ready';
    const appName = process.env.APP_NAME || 'ERP-CRM-Zentro';
    const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER || 'noreply@example.com';
    const fromName = process.env.FROM_NAME || appName;

    const message = `Hello ${user.name || 'User'}!

Welcome to ${appName}! Your account has been successfully created.

Click the link below to log in to your account:

${loginUrl}

If you did not create an account with ${appName}, please ignore this email.

Best regards,
The ${appName} Team`;

    await sendGeneralEmail(
      user.email,
      fromEmail,
      subject,
      message,
      fromName
    );

    console.log(`✅ Welcome email sent to ${user.email}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending login link email:', error);
    throw error;
  }
};

/**
 * Get Google profile from session token (for frontend to pre-fill form)
 */
export const getGoogleProfile = async (req, res, next) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Session token is required' });
    }

    try {
      const decoded = verifySessionToken(token);
      const profile = decoded.profile;

      if (!profile || !profile.googleId || !profile.email) {
        return res.status(400).json({ error: 'Invalid session token - missing profile data' });
      }

      return res.json({
        success: true,
        profile: {
          name: profile.name,
          email: profile.email,
          profilePicture: profile.profilePicture || null,
        },
      });
    } catch (error) {
      console.error('Session token verification error:', error);
      return res.status(400).json({ error: 'Invalid or expired session token' });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Complete Google OAuth signup with password
 */
export const completeGoogleSignup = async (req, res, next) => {
  try {
    console.log('\n🔐 ========== Complete Google Signup Request ==========');
    console.log('   Request body keys:', Object.keys(req.body || {}));
    console.log('   Has sessionToken:', !!req.body?.sessionToken);
    console.log('   Has password:', !!req.body?.password);
    console.log('   Has confirmPassword:', !!req.body?.confirmPassword);

    const { sessionToken, password, confirmPassword } = req.body;

    // Validate inputs
    if (!sessionToken) {
      console.error('❌ Missing session token');
      return res.status(400).json({ 
        error: 'Session token is required',
        code: 'MISSING_SESSION_TOKEN'
      });
    }

    if (!password || !confirmPassword) {
      console.error('❌ Missing password fields');
      return res.status(400).json({ 
        error: 'Password and confirm password are required',
        code: 'MISSING_PASSWORD'
      });
    }

    if (password !== confirmPassword) {
      console.error('❌ Passwords do not match');
      return res.status(400).json({ 
        error: 'Passwords do not match',
        code: 'PASSWORD_MISMATCH'
      });
    }

    if (password.length < 6) {
      console.error('❌ Password too short');
      return res.status(400).json({ 
        error: 'Password must be at least 6 characters',
        code: 'PASSWORD_TOO_SHORT'
      });
    }

    // Verify session token and get Google profile
    let decoded;
    try {
      decoded = verifySessionToken(sessionToken);
      console.log('✅ Session token verified');
      console.log('   Profile email:', decoded.profile?.email);
      console.log('   Profile googleId:', decoded.profile?.googleId);
    } catch (error) {
      console.error('❌ Session token verification error:', error.message);
      return res.status(400).json({ 
        error: 'Invalid or expired session token. Please try signing up with Google again.',
        code: 'INVALID_SESSION_TOKEN',
        details: error.message
      });
    }

    const googleProfile = decoded.profile;

    if (!googleProfile || !googleProfile.googleId || !googleProfile.email) {
      console.error('❌ Invalid Google profile data:', {
        hasProfile: !!googleProfile,
        hasGoogleId: !!googleProfile?.googleId,
        hasEmail: !!googleProfile?.email
      });
      return res.status(400).json({ 
        error: 'Invalid Google profile data',
        code: 'INVALID_PROFILE'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email: googleProfile.email.toLowerCase() },
        { googleId: googleProfile.googleId },
      ],
    });

    if (existingUser) {
      console.log('⚠️  User already exists:', {
        email: existingUser.email,
        userId: existingUser._id,
        hasPassword: !!existingUser.passwordHash
      });
      
      // If user exists but doesn't have a password, allow them to set it
      if (!existingUser.passwordHash) {
        console.log('   User exists without password - updating password');
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        existingUser.passwordHash = passwordHash;
        await existingUser.save();
        
        // Send login link email
        try {
          await sendLoginLinkEmail(existingUser);
          console.log(`✅ Login link email sent to ${existingUser.email}`);
        } catch (emailError) {
          console.error('Error sending login link email:', emailError);
        }
        
        return res.json({
          success: true,
          message: 'Password set successfully. Please check your email for the login link.',
          user: {
            email: existingUser.email,
            name: existingUser.name,
          },
        });
      }
      
      // User exists with password - redirect to login
      return res.status(400).json({ 
        error: 'An account with this email already exists. Please sign in instead.',
        code: 'USER_EXISTS',
        redirectTo: '/login'
      });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    console.log('   Creating new user...');
    // Create user with Google data and password
    const user = await User.create({
      name: googleProfile.name,
      email: googleProfile.email.toLowerCase(),
      passwordHash: passwordHash,
      googleId: googleProfile.googleId,
      registrationMethod: 'google',
      isVerified: true, // Google email is already verified
      role: 'customer',
      profile: {
        avatar: googleProfile.profilePicture || '',
        timezone: 'UTC',
        companyInfo: '',
      },
    });

    console.log(`✅ Google signup completed for ${user.email}`);
    console.log(`   User ID: ${user._id}`);
    console.log('==========================================\n');

    // Send login link email
    try {
      await sendLoginLinkEmail(user);
      console.log(`✅ Login link email sent to ${user.email}`);
    } catch (emailError) {
      console.error('Error sending login link email:', emailError);
      // Don't fail the request if email fails - user can still login
    }

    // Return success (don't log them in yet - they need to use the email link)
    return res.json({
      success: true,
      message: 'Account created successfully. Please check your email for the login link.',
      user: {
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error('\n❌ ========== Complete Google Signup Error ==========');
    console.error('   Error:', error.message);
    console.error('   Stack:', error.stack);
    console.error('   Error code:', error.code);
    console.error('==========================================\n');
    
    // Handle duplicate key error (email or googleId already exists)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      return res.status(400).json({ 
        error: `An account with this ${field === 'email' ? 'email' : 'Google account'} already exists. Please sign in instead.`,
        code: 'DUPLICATE_USER',
        redirectTo: '/login'
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors || {}).map((e) => e.message);
      return res.status(400).json({ 
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors
      });
    }

    next(error);
  }
};

/**
 * Handle login link from email
 */
export const handleLoginLink = async (req, res, next) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=missing_token`);
    }

    try {
      const decoded = verifyLoginLinkToken(token);
      const user = await User.findById(decoded.userId);

      if (!user) {
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=user_not_found`);
      }

      if (!user.isActive) {
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=account_deactivated`);
      }

      // Generate JWT tokens
      const accessToken = generateAccessToken(user._id.toString());
      const refreshToken = generateRefreshToken(user._id.toString());

      // Set refresh token as httpOnly cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Clear login token from user document
      user.verificationToken = null;
      user.verificationTokenExpiry = null;
      await user.save();

      console.log(`✅ Login link used successfully for ${user.email}`);

      // Redirect to success page with token
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/success?token=${accessToken}`);
    } catch (error) {
      console.error('Login link token verification error:', error);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=invalid_or_expired_link`);
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Verify email using token
 */
export const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/verify-email?error=missing_token`);
    }

    try {
      const decoded = verifyVerificationToken(token);
      const user = await User.findById(decoded.userId);

      if (!user) {
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/verify-email?error=user_not_found`);
      }

      // Check if token matches stored token
      if (user.verificationToken !== token) {
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/verify-email?error=invalid_token`);
      }

      // Check if token has expired
      if (user.verificationTokenExpiry && user.verificationTokenExpiry < new Date()) {
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/verify-email?error=expired_token`);
      }

      // Mark user as verified and clear verification token
      user.isVerified = true;
      user.verificationToken = null;
      user.verificationTokenExpiry = null;
      await user.save();

      // Generate tokens for immediate login
      const accessToken = generateAccessToken(user._id.toString());
      const refreshToken = generateRefreshToken(user._id.toString());

      // Redirect to success page with token
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/success?token=${accessToken}&refreshToken=${refreshToken}`);
    } catch (error) {
      console.error('Token verification error:', error);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/verify-email?error=invalid_token`);
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Handle Google OAuth callback
 */
export const googleCallback = async (req, res, next) => {
  try {
    console.log('\n✅ ========== Google OAuth Callback ==========');
    const userOrProfile = req.user;

    if (!userOrProfile) {
      console.error('❌ No user/profile in request after OAuth authentication');
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=oauth_failed`);
    }

    // Check if this is a Google profile (new user) or existing user
    if (userOrProfile._isGoogleProfile) {
      // New user - redirect to signup page with session token
      console.log('📝 New Google user - redirecting to signup page');
      console.log(`   Email: ${userOrProfile.email}`);
      console.log(`   Name: ${userOrProfile.name}`);
      
      // Generate session token with Google profile data
      const sessionToken = generateSessionToken({
        googleId: userOrProfile.googleId,
        email: userOrProfile.email,
        name: userOrProfile.name,
        profilePicture: userOrProfile.profilePicture,
      });

      console.log(`   Session token generated (expires in 15 minutes)`);
      console.log('   Redirecting to signup page...');
      console.log('==========================================\n');

      // Redirect to signup page with session token
      return res.redirect(
        `${process.env.FRONTEND_URL || 'http://localhost:5173'}/register?google=true&token=${sessionToken}`
      );
    }

    // Existing user - proceed with normal login flow
    const user = userOrProfile;
    console.log(`   Existing user: ${user.email} (${user._id})`);
    console.log(`   Verified: ${user.isVerified}, Method: ${user.registrationMethod}`);

    // Get mode from request object (passed from route handler, since session is disabled)
    const mode = req.oauthMode || req.session?.oauthMode || req.query?.state || 'signup';
    const isLoginMode = mode === 'login';

    console.log(`   Mode: ${mode} (isLogin: ${isLoginMode})`);

    // For login mode: Skip ALL verification email logic and directly log in
    // For signup mode: Send verification email if user is not verified
    if (isLoginMode) {
      // Login mode: Directly log in without any verification email
      console.log('   🔐 Login mode: Skipping verification email, directly logging in');
      
      // Generate tokens and redirect directly to appropriate dashboard
      const accessToken = generateAccessToken(user._id.toString());
      const refreshToken = generateRefreshToken(user._id.toString());

      // Set refresh token as httpOnly cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      console.log(`   ✅ Login successful - redirecting to Google login callback`);
      console.log('==========================================\n');

      // For login mode: Redirect to dedicated Google login callback route
      // This route runs BEFORE ProtectedRoute and handles session setup synchronously
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/google-callback?token=${accessToken}`);
    }

    // Signup mode: Send verification email if user is not verified and registered via Google
    if (!user.isVerified && user.registrationMethod === 'google') {
      console.log('   📧 Signup mode: User not verified, sending verification email');
      try {
        await sendVerificationEmail(user);
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/verify-pending?email=${encodeURIComponent(user.email)}`);
      } catch (emailError) {
        console.error('Error sending verification email:', emailError);
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/verify-pending?email=${encodeURIComponent(user.email)}&error=email_failed`);
      }
    }

    // Signup mode: User is verified or not Google-registered - generate tokens and redirect
    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    console.log('   ✅ Login successful - redirecting to dashboard');
    console.log('==========================================\n');

    // Redirect to success page with token
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/success?token=${accessToken}`);
  } catch (error) {
    console.error('❌ Google callback error:', error);
    next(error);
  }
};

