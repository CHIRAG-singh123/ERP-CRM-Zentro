import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from '../models/User.js';

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user._id.toString());
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).select('-passwordHash');
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log('\n🔐 ========== Google OAuth Strategy Callback ==========');
        console.log('   Google Profile ID:', profile.id);
        console.log('   Email:', profile.emails?.[0]?.value);
        console.log('   Name:', profile.displayName);
        console.log('   Photo:', profile.photos?.[0]?.value);

        // Check if Google OAuth is configured
        if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET ||
            process.env.GOOGLE_CLIENT_SECRET === 'your_google_client_secret_here') {
          console.error('❌ Google OAuth not configured Please Configure it properly.');
          return done(new Error('Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your environment variables.'), null);
        }

        const email = profile.emails?.[0]?.value?.toLowerCase();
        const googleId = profile.id;
        const name = profile.displayName || profile.name?.givenName || 'User';
        const profilePicture = profile.photos?.[0]?.value || null;

        if (!email) {
          console.error('❌ No email in Google profile');
          return done(new Error('No email found in Google profile'), null);
        }

        // Try to find existing user by Google ID or email
        let user = await User.findOne({
          $or: [
            { googleId: googleId },
            { email: email },
          ],
        });

        if (user) {
          // User exists - check if they need to link Google account
          if (!user.googleId && user.email === email) {
            console.log('   🔗 Linking Google account to existing user');
            user.googleId = googleId;
            if (profilePicture && !user.profile?.avatar) {
              user.profile = user.profile || {};
              user.profile.avatar = profilePicture;
            }
            await user.save();
          }

          console.log('   ✅ Existing user found:', {
            email: user.email,
            userId: user._id,
            registrationMethod: user.registrationMethod,
          });
          console.log('==========================================\n');
          return done(null, user);
        }

        // User doesn't exist - return Google profile with special flag
        // This will be handled by the callback route to redirect to signup
        console.log('   📝 New Google user - returning profile for signup');
        console.log('==========================================\n');
        
        const googleProfile = {
          _isGoogleProfile: true, // Special flag to identify this as a new Google profile
          googleId: googleId,
          email: email,
          name: name,
          profilePicture: profilePicture,
        };

        return done(null, googleProfile);
      } catch (error) {
        console.error('❌ Google OAuth strategy error:', error);
        return done(error, null);
      }
    }
  )
);

export default passport;

