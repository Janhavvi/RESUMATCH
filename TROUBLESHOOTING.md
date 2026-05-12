# RESUMATCH Troubleshooting Checklist

Quick checklist to diagnose and fix common Vercel deployment issues.

## 🔍 File Upload Issues (413 Error or "File too large")

- [ ] Is file size < 3MB?
  - If NO: File is too large. Use Vercel Blob (see below).
  - If YES: Check next item.

- [ ] Is `BLOB_READ_WRITE_TOKEN` set in Vercel?
  - Go to Settings → Environment Variables
  - Check if token exists and is not empty
  - If missing/empty: [Set up Vercel Blob](#setting-up-vercel-blob)

- [ ] Have you redeployed after adding env variables?
  ```bash
  vercel --prod
  ```

- [ ] Check browser console (F12) for detailed error message
  - Copy the full error and check [Error Messages Guide](#error-messages-guide)

### Setting Up Vercel Blob

1. In Vercel Dashboard → Storage
2. Create Blob database
3. Copy connection token
4. In Settings → Environment Variables, add:
   - `BLOB_READ_WRITE_TOKEN` = (paste token)
5. Redeploy: `vercel --prod`

---

## 🔑 Google Sign-In Issues

### Step 1: Check if Google OAuth is Enabled

Test this URL in your browser:
```
https://your-app.vercel.app/api/auth/google/config
```

Expected response:
```json
{
  "enabled": true,
  "clientId": "123456789-abc...apps.googleusercontent.com",
  "redirectUri": "https://your-app.vercel.app/api/auth/callback/google"
}
```

If `enabled` is `false`:
- [ ] `GOOGLE_CLIENT_ID` is not set
- [ ] `GOOGLE_CLIENT_ID` is invalid format
- [ ] Go to [Verify Google Credentials](#verify-google-credentials)

### Step 2: Verify Google Credentials

1. Go to Google Cloud Console: https://console.cloud.google.com
2. Open your OAuth 2.0 credential
3. Check these match **exactly**:

   **In Google Cloud Console:**
   - Client ID: `abc123...apps.googleusercontent.com`
   - Client Secret: `GOCSPX-...`

   **In Vercel Environment Variables:**
   - `GOOGLE_CLIENT_ID` should match exactly
   - `GOOGLE_CLIENT_SECRET` should be set

   **In Vercel:**
   ```
   APP_URL = https://your-vercel-project.vercel.app
   ```

   **In Google Cloud Console → Authorized URLs:**
   ```
   Authorized JavaScript Origins:
   https://your-vercel-project.vercel.app

   Authorized Redirect URIs:
   https://your-vercel-project.vercel.app/api/auth/callback/google
   ```

4. If you found mismatches:
   - [ ] Fix them in Google Cloud Console
   - [ ] Re-paste credentials in Vercel (fresh copy-paste)
   - [ ] Redeploy: `vercel --prod`
   - [ ] Clear browser cache
   - [ ] Try signing in again

### Step 3: Check for Corrupted Credentials

**Problem**: Extra spaces or newlines in environment variables

**Fix**:
1. In Vercel Settings → Environment Variables
2. Delete `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
3. Go to Google Cloud Console, open the credential
4. Carefully copy the entire Client ID (click copy button)
5. In Vercel, paste into `GOOGLE_CLIENT_ID`
6. Carefully copy the entire Client Secret
7. In Vercel, paste into `GOOGLE_CLIENT_SECRET`
8. **Do NOT paste manually** — use the copy button from Google
9. Redeploy: `vercel --prod`

---

## 🐛 Error Messages Guide

### "Request body too large" (413)

File is too large. See [File Upload Issues](#file-upload-issues).

### "Google login is not configured"

- `GOOGLE_CLIENT_ID` environment variable is missing
- Fix: Add to Vercel environment variables and redeploy

### "Google token audience mismatch"

- Client ID in your code doesn't match Google Cloud Console
- Fix: [Verify Google Credentials](#verify-google-credentials)

### "Invalid Google token"

- Token has expired or credentials are corrupted
- Fix: Refresh page and try again. If persistent, [Verify Google Credentials](#verify-google-credentials)

### "Google email is not verified"

- Your Google account email is not verified
- Fix: Verify your email in Google account settings and try again

### "Failed to process resume"

- File format not supported
- Supported formats: PDF, DOCX, TXT
- Fix: Try with a different file format

---

## 📋 Pre-Deployment Checklist

Before pushing to production:

### File Uploads
- [ ] Can upload files locally?
- [ ] File size shows correctly?
- [ ] Vercel Blob token is generated?

### Google OAuth
- [ ] Can sign in locally?
- [ ] Client ID and Secret are copied from Google Cloud Console?
- [ ] APP_URL is set correctly?
- [ ] Redirect URI added to Google Cloud Console?
- [ ] Domain added to Authorized Origins?

### Environment Variables (in Vercel)
- [ ] `GOOGLE_CLIENT_ID` is set?
- [ ] `GOOGLE_CLIENT_SECRET` is set?
- [ ] `APP_URL` is set to your Vercel URL?
- [ ] `JWT_SECRET` is set?
- [ ] `NEXTAUTH_SECRET` is set?
- [ ] `GEMINI_API_KEY` is set (optional, for AI)?
- [ ] `BLOB_READ_WRITE_TOKEN` is set (optional, for large files)?

### Final Steps
- [ ] All environment variables entered in Vercel
- [ ] Ran `vercel --prod` to deploy
- [ ] Waited 1-2 minutes for deployment to complete
- [ ] Tested file upload (start with small file < 1MB)
- [ ] Tested Google Sign-In
- [ ] Checked browser console (F12) for errors
- [ ] Checked Vercel logs for errors

---

## 🔗 Useful Links

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Google Cloud Console**: https://console.cloud.google.com
- **View Server Logs**: Vercel Dashboard → Deployments → [Your Deployment] → Logs
- **Check Config (dev only)**: http://localhost:3000/api/auth/config/status

---

## 💡 Pro Tips

1. **Always redeploy after changing env variables**
   ```bash
   vercel --prod
   ```

2. **Use browser console for debugging**
   - Right-click → Inspect → Console tab
   - Look for red error messages

3. **Check Vercel logs**
   - Dashboard → Deployments → Select latest → Logs
   - Search for "error" or relevant keywords

4. **Test locally first**
   - Make sure it works on localhost before deploying
   - This eliminates many Vercel-specific issues

5. **Use the config status endpoint (dev only)**
   - http://localhost:3000/api/auth/config/status
   - Shows OAuth configuration and any issues

6. **When in doubt, copy-paste from official sources**
   - Don't type credentials manually
   - Use the copy button in Google Cloud Console
   - Paste directly into Vercel (no modifications)

---

## Still Stuck?

1. **Collect this information:**
   - Screenshot of Vercel environment variables (mask secrets)
   - Screenshot of Google Cloud Console OAuth settings
   - Full error message from browser console
   - URL you're testing

2. **Share the info with support** along with:
   - What you've already tried
   - When the issue started
   - Which feature is broken (uploads, sign-in, both)

---

**Last Updated**: May 12, 2026
**Version**: 1.0
