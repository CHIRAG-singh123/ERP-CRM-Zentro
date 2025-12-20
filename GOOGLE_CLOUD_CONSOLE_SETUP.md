# Google Cloud Console OAuth Setup - Quick Guide

## Current Error
You're seeing: **"Error 400: redirect_uri_mismatch"**

This means the redirect URI `http://localhost:5000/api/auth/google/callback` is not registered in Google Cloud Console.

## Quick Fix (5 minutes)

### Step 1: Open Google Cloud Console
1. Go to: https://console.cloud.google.com/
2. Make sure you're in the correct project
3. Navigate to: **APIs & Services** → **Credentials**

### Step 2: Find Your OAuth Client
1. Look for **"OAuth 2.0 Client IDs"** section
2. Find your client (it should show your Client ID: `435625982072-...`)
3. **Click on the client name** to edit it

### Step 3: Add Authorised JavaScript Origins
1. Scroll to **"Authorised JavaScript origins"**
2. Click **"+ ADD URI"**
3. Enter: `http://localhost:5173`
4. Click outside the input to save

### Step 4: Add Authorised Redirect URI (THIS IS THE FIX!)
1. Scroll to **"Authorised redirect URIs"**
2. Click **"+ ADD URI"**
3. Enter **EXACTLY** this (copy-paste to avoid typos):
   ```
   http://localhost:5000/api/auth/google/callback
   ```
4. **IMPORTANT:**
   - Must be exactly: `http://localhost:5000/api/auth/google/callback`
   - No trailing slash
   - Case-sensitive
   - Must use port 5000 (backend), NOT 5173 (frontend)
5. Click outside the input to save

### Step 5: Save Changes
1. Scroll to the bottom
2. Click **"SAVE"** button
3. Wait 1-5 minutes for changes to propagate

### Step 6: Test Again
1. Go back to your application
2. Click "Sign up with Google" again
3. It should work now!

## Visual Guide

Your Google Cloud Console should look like this:

**Authorised JavaScript origins:**
```
http://localhost:5173
```

**Authorised redirect URIs:**
```
http://localhost:5000/api/auth/google/callback
```

## Common Mistakes to Avoid

❌ **DON'T** add: `http://localhost:5173/api/auth/google/callback` (wrong port)
❌ **DON'T** add: `http://localhost:5000/` (missing path)
❌ **DON'T** add: `http://localhost:5000/api/auth/google/callback/` (trailing slash)
✅ **DO** add: `http://localhost:5000/api/auth/google/callback` (correct!)

## Still Not Working?

1. **Wait longer**: Changes can take up to 5 minutes
2. **Clear browser cache**: Sometimes browsers cache OAuth configs
3. **Check the exact URL**: Make sure there are no typos or extra spaces
4. **Verify backend is running**: Make sure your server is running on port 5000
5. **Check server logs**: Look for the callback URL in your server startup logs

## Need Help?

Check your server console when it starts - it will show you the exact callback URL that needs to be added!

