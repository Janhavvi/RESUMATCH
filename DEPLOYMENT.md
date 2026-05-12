# Deployment Guide for RESUMATCH

This guide covers deploying RESUMATCH to Vercel with proper file upload and Google OAuth configuration.

## Table of Contents

- [Quick Start](#quick-start)
- [File Upload Configuration](#file-upload-configuration)
- [Google OAuth Setup](#google-oauth-setup)
- [Vercel Deployment](#vercel-deployment)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites

- GitHub account with repository access
- Vercel account (https://vercel.com)
- Google Cloud Console account (https://console.cloud.google.com)
- Node.js 18+ installed locally

### 1. Prepare Your Repository

```bash
git add .
git commit -m "Fix Vercel deployment: file uploads and OAuth"
git push origin main
```

### 2. Set Up Google OAuth

Before deploying, you must configure Google OAuth. See [Google OAuth Setup](#google-oauth-setup) section below.

### 3. Deploy to Vercel

```bash
npm install -g vercel
vercel login
vercel --prod
```

---

## File Upload Configuration

### The Problem

Vercel's serverless functions have a **4.5 MB hard limit** on request body size. Files larger than this will fail with a 413 error. Additionally, the Vercel runtime is read-only, so files cannot be persisted locally.

### The Solution

RESUMATCH now supports two upload methods:

#### 1. **Local/Development (Default)**

In development (`NODE_ENV=development`), files are uploaded to the local `uploads/` directory. The 50MB limit allows for testing large files locally.

#### 2. **Production with Vercel Blob (Recommended)**

In production, files are uploaded to **Vercel Blob**, which is Vercel's native cloud storage. This bypasses the function body limit and provides persistent storage.

### Enabling Vercel Blob

#### Step 1: Create a Vercel Blob Storage

1. Go to your Vercel project dashboard
2. Click **Storage** → **Create Database**
3. Select **Blob**
4. Follow the setup wizard
5. Copy the connection token

#### Step 2: Set Environment Variable

In your Vercel project settings:

1. Go to **Settings** → **Environment Variables**
2. Add a new variable:
   - Name: `BLOB_READ_WRITE_TOKEN`
   - Value: Paste your Vercel Blob token from Step 1
   - Environments: Production, Preview, Development

#### Step 3: Deploy

```bash
vercel --prod
```

Files will now be uploaded directly to Vercel Blob in production.

### File Size Limits

| Environment | Limit | Storage |
|---|---|---|
| Development | 50MB | Local `/uploads/` directory |
| Production (with Blob) | 500MB | Vercel Blob (configurable) |
| Production (without Blob) | 3MB | Local `/uploads/` (read-only, will fail) |

---

## Google OAuth Setup

### The Problem

Google OAuth fails because of:
1. **Redirect URI mismatch** — The callback URL in your code doesn't match what's registered in Google Cloud Console
2. **Missing domain** — Your Vercel domain isn't authorized in Google Cloud Console
3. **Invalid credentials** — Client ID/secret have been corrupted (extra spaces, newlines)

### The Solution

Follow these steps **exactly**:

#### Step 1: Create OAuth 2.0 Credentials

1. Go to **Google Cloud Console**: https://console.cloud.google.com
2. Select or create a project
3. Enable the **Google+ API**:
   - Go to **APIs & Services** → **Library**
   - Search for "Google+ API"
   - Click **Enable**

4. Create OAuth 2.0 credentials:
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth client ID**
   - Choose **Web application**
   - Name it something like "RESUMATCH"

#### Step 2: Configure Authorized URLs

In the OAuth credential settings, you need to add your URLs. Add these for **both local development AND production**:

**Authorized JavaScript Origins:**
```
http://localhost:3000
http://localhost:5173
https://your-vercel-project.vercel.app
https://your-custom-domain.com
```

**Authorized Redirect URIs:**
```
http://localhost:3000/api/auth/callback/google
http://localhost:5173/api/auth/callback/google
https://your-vercel-project.vercel.app/api/auth/callback/google
https://your-custom-domain.com/api/auth/callback/google
```

#### Step 3: Copy Your Credentials

From the OAuth credential, copy:
- **Client ID** (looks like: `123456789-abc...apps.googleusercontent.com`)
- **Client Secret** (looks like: `GOCSPX-...`)

#### Step 4: Set Environment Variables

Create or update `.env` file locally:

```bash
GOOGLE_CLIENT_ID="your-client-id-here.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret-here"
APP_URL="http://localhost:3000"
JWT_SECRET="generate-a-random-string-min-32-chars"
NEXTAUTH_SECRET="generate-a-different-random-string-min-32-chars"
```

#### Step 5: Deploy to Vercel

1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. **Delete** any existing OAuth variables first (to ensure no corrupted data)
4. **Add new variables** (copy-paste carefully, no extra spaces):

   - `GOOGLE_CLIENT_ID` = (your client ID)
   - `GOOGLE_CLIENT_SECRET` = (your client secret)
   - `APP_URL` = `https://your-vercel-project.vercel.app`
   - `JWT_SECRET` = (your generated secret)
   - `NEXTAUTH_SECRET` = (your generated secret)

5. **CRITICAL**: After saving variables, **redeploy your application**:
   ```bash
   vercel --prod
   ```

### Verifying Your Setup

Check if Google OAuth is properly configured:

```bash
# In development, visit:
http://localhost:3000/api/auth/config/status

# You should see:
# - Your APP_URL
# - The correct redirect URI
# - No issues listed
```

---

## Vercel Deployment

### Environment Variables Checklist

Before deploying, ensure all these are set in Vercel:

```
✓ GEMINI_API_KEY          (from AI Studio)
✓ GOOGLE_CLIENT_ID        (from Google Cloud Console)
✓ GOOGLE_CLIENT_SECRET    (from Google Cloud Console)
✓ APP_URL                 (https://your-vercel-project.vercel.app)
✓ JWT_SECRET              (random string, min 32 chars)
✓ NEXTAUTH_SECRET         (random string, min 32 chars)
✓ BLOB_READ_WRITE_TOKEN   (from Vercel Storage)
```

### Deploy Command

```bash
vercel --prod
```

### Verify Deployment

1. Visit your Vercel URL
2. Test Google Sign-In
3. Test file upload with a small file (< 3MB)
4. Check server logs: **Vercel Dashboard** → **Deployments** → **Logs**

---

## Troubleshooting

### File Upload Returns 413 Error

**Cause**: File is too large for the request body limit

**Solution**:
- Ensure `BLOB_READ_WRITE_TOKEN` is set for production
- For development, files must be < 50MB
- Redeploy after adding the token

### Google Sign-In Button Doesn't Appear

**Causes**:
1. Google script not loaded
2. Client ID not configured
3. CORS issue

**Solutions**:
- Check browser console (F12) for errors
- Verify `GOOGLE_CLIENT_ID` is set and valid
- Verify the domain is added to Google Cloud Console
- Test the config endpoint: `curl https://your-app.vercel.app/api/auth/google/config`

### Google Sign-In Returns "Audience Mismatch"

**Cause**: Client ID in your code doesn't match Google Cloud Console

**Solution**:
1. Double-check the Client ID in Google Cloud Console
2. Delete and re-paste the Client ID in Vercel environment variables
3. Redeploy: `vercel --prod`
4. Clear browser cache and try again

### Google Sign-In Returns "Invalid Token"

**Cause**: Token has expired or credentials are invalid

**Solution**:
- Refresh the page
- Clear browser cookies
- Try again
- If persistent, check that `GOOGLE_CLIENT_SECRET` is set correctly

### "Server error: Google OAuth is not properly configured"

**Cause**: `GOOGLE_CLIENT_SECRET` is not set in production

**Solution**:
1. Go to Vercel dashboard
2. Add `GOOGLE_CLIENT_SECRET` environment variable
3. Redeploy: `vercel --prod`

### Uploads Work Locally but Fail on Vercel

**Cause**: File is too large or blob storage not configured

**Solution**:
1. Check file size (must be < 3MB without blob storage)
2. Set `BLOB_READ_WRITE_TOKEN` environment variable
3. Redeploy: `vercel --prod`
4. Test with a small file first

### Database Error: "Cannot write to /uploads"

**Cause**: Vercel runtime is read-only

**Solution**:
- This is expected in production
- Configure Vercel Blob storage (see [Enabling Vercel Blob](#enabling-vercel-blob))
- Files will be uploaded to Blob instead of local filesystem

---

## Additional Resources

- Vercel Deployment Guide: https://vercel.com/docs
- Google OAuth Setup: https://developers.google.com/identity/protocols/oauth2
- Vercel Blob Documentation: https://vercel.com/docs/storage/vercel-blob
- Environment Variables Best Practices: https://vercel.com/docs/projects/environment-variables

---

## Quick Reference: Environment Variables

| Variable | Where to Get | Format | Required |
|---|---|---|---|
| `GOOGLE_CLIENT_ID` | Google Cloud Console | `xxx.apps.googleusercontent.com` | Yes (for OAuth) |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console | `GOCSPX-xxx` | Yes (for OAuth) |
| `APP_URL` | Your domain | `https://your-domain.vercel.app` | Yes |
| `JWT_SECRET` | Generate yourself | Random string (32+ chars) | Yes |
| `NEXTAUTH_SECRET` | Generate yourself | Random string (32+ chars) | Yes |
| `GEMINI_API_KEY` | AI Studio | `AIza...` | No (AI features won't work) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Storage | Blob token | No (uploads limited to 3MB) |

---

## Need Help?

1. Check this guide's Troubleshooting section
2. Check browser console for errors (F12)
3. Check Vercel logs: Dashboard → Deployments → Logs
4. Test the config endpoint: `/api/auth/config/status` (dev only)
