# Google OAuth Setup Guide

## ⚠️ CRITICAL: Understanding the Port Configuration

**IMPORTANT:** Your application uses TWO different ports:
- **Frontend (Vite)**: Port **5173** - This is where your React app runs
- **Backend (Express)**: Port **5000** - This is where your API server runs

**The OAuth callback URL MUST use the BACKEND port (5000), NOT the frontend port (5173)!**

## Important Configuration Steps

### 1. Google Cloud Console Configuration

**CRITICAL:** The redirect URI in Google Cloud Console must point to your **BACKEND** server, not the frontend!

#### Step-by-Step Instructions:

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Select your project (or create a new one)

2. **Navigate to OAuth Credentials**
   - Go to: **APIs & Services** → **Credentials**
   - Find your OAuth 2.0 Client ID (or create one if you don't have it)
   - Click on the Client ID to edit it

3. **Add Authorised JavaScript origins:**
   - Click **"+ ADD URI"** under "Authorised JavaScript origins"
   - Add: `http://localhost:5173`
   - Click **"SAVE"**

4. **Add Authorised redirect URIs:**
   - Click **"+ ADD URI"** under "Authorised redirect URIs"
   - Add: `http://localhost:5000/api/auth/google/callback`
   - **IMPORTANT:** This must be EXACTLY this URL (case-sensitive, no trailing slash)
   - Click **"SAVE"**

5. **Wait for Changes to Propagate**
   - Changes can take 1-5 minutes to propagate
   - If you still get errors, wait a bit longer and try again

#### What to Add:

**Authorised JavaScript origins:**
- `http://localhost:5173` ✅ (your frontend URL - for CORS)

**Authorised redirect URIs:**
- `http://localhost:5000/api/auth/google/callback` ✅ (your **BACKEND** callback URL)
- **NOT** `http://localhost:5173/api/auth/google/callback` ❌
- **NOT** `http://localhost:5173/` ❌
- **NOT** `http://localhost:5000/` ❌ (missing `/api/auth/google/callback`)

**Why?** When Google redirects back after authentication, it must go directly to your backend server. The Vite proxy cannot handle OAuth callbacks correctly.

### 2. Environment Variables

Make sure your `server/.env` file has:

```env
# Backend Port (default: 5000)
PORT=5000

# Frontend URL (for redirects after OAuth)
FRONTEND_URL=http://localhost:5173

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_actual_client_id_here
GOOGLE_CLIENT_SECRET=your_actual_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Session Secret (generate a strong random string)
SESSION_SECRET=your_strong_random_session_secret_here
```

### 3. Port Configuration

- **Backend (Node.js/Express)**: Runs on port **5000** (or PORT env variable)
- **Frontend (Vite)**: Runs on port **5173** (or VITE port)

The callback URL **MUST** use the backend port (5000), not the frontend port (5173).

### 4. Common Issues

#### Issue: "redirect_uri_mismatch"
**Solution**: Make sure the redirect URI in Google Cloud Console exactly matches:
```
http://localhost:5000/api/auth/google/callback
```

#### Issue: "Route not found"
**Solution**: 
1. Check that `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in `.env`
2. Restart the server after updating `.env`
3. Check server logs for OAuth configuration messages

#### Issue: OAuth works but user not created
**Solution**: Check MongoDB connection and User model schema

### 5. Testing

1. Start backend: `cd server && npm run dev`
2. Start frontend: `npm run dev`
3. Click "Sign in with Google" button
4. Check server console for OAuth flow logs
5. Verify redirect URI matches exactly in Google Cloud Console

### 6. Production Setup

For production, update:
- `GOOGLE_CALLBACK_URL` to your production backend URL
- Add production redirect URI in Google Cloud Console
- Set `NODE_ENV=production`
- Use HTTPS for all URLs

