# Google OAuth Sign-In with Email Verification for ERP-CRM-Zentro (MERN)

## Goal
Implement "Sign up with Google" button that:
1. Opens Google account chooser popup
2. Lets user select a Google account
3. Retrieves the selected email
4. Sends an account verification email to that email
5. Allows user to complete registration after verification

## Project Structure (Relevant Parts)
ERP-CRM/
├── src/                    # Frontend (React + Vite + TypeScript)
│   ├── features/auth/      # Redux auth slice & thunks
│   ├── components/         # UI components
│   ├── pages/Auth/         # Login/Register pages
│   └── services/           # API calls
├── server/
│   ├── src/
│   │   ├── controllers/authController.ts
│   │   ├── models/User.ts
│   │   ├── routes/authRoutes.ts
│   │   └── services/emailService.js  # Already provided
│   └── .env
├── .env                    # Frontend env (has VITE_GOOGLE_CLIENT_ID)
└── package.json


## Step 1: Backend Changes

### 1.1 Install required packages (backend)
```bash
cd server
npm install passport passport-google-oauth20 express-session
npm install --save-dev @types/passport @types/passport-google-oauth20 @types/express-session

###1.2 Add Google OAuth config to server/.env
GOOGLE_CLIENT_ID=435625982072-97bpjjd4sudfhgqmof5mieb26241sik3.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
SESSION_SECRET=your_strong_session_secret_here
Get GOOGLE_CLIENT_SECRET from Google Cloud Console → APIs & Services → Credentials


###1.3 server/src/config/passport.ts (create new file)

code:
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User';

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL!,
      scope: ['profile', 'email'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error('No email from Google'));

        let user = await User.findOne({ email });

        if (user) {
          // Existing user → login normally
          return done(null, user);
        }

        // New user → create pending user with google data
        user = await User.create({
          email,
          googleId: profile.id,
          name: profile.displayName,
          isVerified: false, // Will verify via email
          registrationMethod: 'google',
          // Add any other fields you want pre-filled
        });

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

passport.serializeUser((user: any, done) => done(null, user.id));
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

export default passport;

###1.4 Update User model (add fields if missing)

// In server/src/models/User.ts
googleId?: string;
registrationMethod?: 'email' | 'google';
isVerified: boolean = false;

###1.5 server/src/routes/authRoutes.ts (add Google routes)
import express from 'express';
import passport from '../config/passport';
import { sendVerificationEmail } from '../controllers/authController';

const router = express.Router();

// Start Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google callback
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  async (req, res) => {
    const user = req.user as any;

    if (!user.isVerified && user.registrationMethod === 'google') {
      // New Google user → send verification email
      await sendVerificationEmail(user);
      return res.redirect('http://localhost:5173/auth/verify-pending');
    }

    // Already verified or existing user → login success
    // Generate JWT and redirect with token
    const token = generateJWT(user); // your existing JWT function
    res.redirect(`http://localhost:5173/auth/success?token=${token}`);
  }
);

export default router;

###1.6 Create verification email function (authController.ts)

import { sendGeneralEmail } from '../services/emailService';
import { generateVerificationToken } from '../utils/jwt';

export const sendVerificationEmail = async (user: any) => {
  const token = generateVerificationToken(user._id);
  const verificationUrl = `${process.env.FRONTEND_URL}/auth/verify-email?token=${token}`;

  const subject = 'Verify Your Email Address';
  const message = `Thank you for signing up with ${process.env.APP_NAME}!\n\nPlease click the button below to verify your email address and activate your account.\n\nThis link will expire in 1 hour.`;

  const html = `
    <h2>Welcome, ${user.name || 'User'}!</h2>
    <p>Thank you for signing up with ${process.env.APP_NAME || 'ERP-CRM-Zentro'}.</p>
    <p>Please click the button below to verify your email address:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${verificationUrl}" style="background: #667eea; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold;">
        Verify Email Address
      </a>
    </div>
    <p>Or copy this link: <br><strong>${verificationUrl}</strong></p>
    <p>This link expires in 1 hour.</p>
  `;

  await sendGeneralEmail(
    user.email,
    process.env.FROM_EMAIL!,
    subject,
    message,
    process.env.FROM_NAME
  );
};

###1.7 Add verification endpoint

router.get('/verify-email', async (req, res) => {
  const { token } = req.query;
  // Verify token, mark user.isVerified = true, then redirect
  // Implementation similar to your existing password reset flow
});

###Step 2: Frontend Changes
###2.1 Install Google Sign-In script (or use @react-oauth/google)
Option A (Recommended): Use @react-oauth/google
```bash
npm install @react-oauth/google



###2.2 Wrap app with GoogleOAuthProvider (main.tsx)

import { GoogleOAuthProvider } from '@react-oauth/google';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
    <App />
  </GoogleOAuthProvider>
);

import { GoogleOAuthProvider } from '@react-oauth/google';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
    <App />
  </GoogleOAuthProvider>
);

###2.3 Create Google Sign-Up Button Component

// src/components/GoogleSignUpButton.tsx
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';

export const GoogleSignUpButton = () => {
  const navigate = useNavigate();

  return (
    <GoogleLogin
      onSuccess={(credentialResponse) => {
        // Send credential to backend
        fetch('http://localhost:5000/api/auth/google', {
          method: 'GET',
          credentials: 'include', // Important for session
          headers: { Authorization: `Bearer ${credentialResponse.credential}` },
        }).then((res) => {
          if (res.redirected) {
            window.location.href = res.url;
          }
        });
      }}
      onError={() => {
        console.log('Google Login Failed');
      }}
      useOneTap={false}
      theme="outline"
      size="large"
      text="signup_with"
      shape="rectangular"
    />
  );
};

Note: The actual flow uses redirect to /api/auth/google, not credential sending. Better approach:
Recommended: Simple redirect button

<button
  onClick={() => {
    window.location.href = 'http://localhost:5000/api/auth/google';
  }}
  className="google-btn"
>
  <img src="/google-icon.svg" /> Sign up with Google
</button>

This opens Google popup → selects account → backend handles everything → sends verification email → redirects to your frontend verify-pending page.
###2.4 Create verification pending page

// src/pages/Auth/VerifyPending.tsx
<h2>Check Your Email</h2>
<p>We sent a verification link to your email address.</p>
<p>Please check your inbox (and spam) and click the link to activate your account.</p>


Final Flow

User clicks "Sign up with Google"
Redirects to Google → chooses account (your screenshot)
Google redirects to backend callback
Backend finds/creates user with that email
Sends verification email using your existing EmailService
Redirects to /auth/verify-pending
User clicks link in email → account verified → can log in