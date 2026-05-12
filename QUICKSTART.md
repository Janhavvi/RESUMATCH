# 🚀 RESUMATCH Quick Start - Vercel Deployment

Get your app running on Vercel in 15 minutes!

---

## Step 1: Generate Secrets (2 minutes)

```bash
node generate-secrets.js
```

**Output:**
```
JWT_SECRET="abc123..."
NEXTAUTH_SECRET="def456..."
```

Copy these values - you'll need them in Step 4.

---

## Step 2: Set Up Google OAuth (5 minutes)

**Important:** Do this BEFORE deploying to Vercel.

1. Go to **Google Cloud Console**: https://console.cloud.google.com
2. Create or select a project
3. Enable **Google+ API** (APIs & Services → Library)
4. Create **OAuth 2.0 Web credentials** (APIs & Services → Credentials → Create → OAuth client ID)
5. Add authorized URLs:
   - **JavaScript Origins:** `http://localhost:3000`
   - **Redirect URIs:** `http://localhost:3000/api/auth/callback/google`

6. Copy your **Client ID** and **Client Secret**

---

## Step 3: Update Local .env File (2 minutes)

Edit `.env`:

```bash
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"
JWT_SECRET="<paste from Step 1>"
NEXTAUTH_SECRET="<paste from Step 1>"
APP_URL="http://localhost:3000"
```

**Test locally:**
```bash
npm run dev
# Visit http://localhost:3000
```

---

## Step 4: Deploy to Vercel (5 minutes)

### Option A: Using Vercel CLI (Fastest)

```bash
npm install -g vercel
vercel login
vercel --prod
```

When prompted, select:
- Framework: **Vite**
- Build command: `npm run build` (default)
- Output directory: `dist` (default)

### Option B: Using GitHub (Most Common)

1. Commit changes:
   ```bash
   git add .
   git commit -m "Fix Vercel deployment: file uploads and OAuth"
   git push origin main
   ```

2. Go to **Vercel Dashboard**: https://vercel.com/dashboard
3. Import your GitHub repository
4. Select **Vite** as framework
5. Continue to Step 5 (Environment Variables)

---

## Step 5: Set Environment Variables in Vercel (3 minutes)

1. In Vercel Dashboard, go to **Settings → Environment Variables**
2. Add these variables:

```
GOOGLE_CLIENT_ID        (from Step 2)
GOOGLE_CLIENT_SECRET    (from Step 2)  
APP_URL                 https://your-vercel-domain.vercel.app
JWT_SECRET              (from Step 1)
NEXTAUTH_SECRET         (from Step 1)
GEMINI_API_KEY          (if you have it)
BLOB_READ_WRITE_TOKEN   (optional, for >3MB files)
```

3. **IMPORTANT:** Go back to Google Cloud Console and add your Vercel domain:
   - **JavaScript Origins:** `https://your-vercel-domain.vercel.app`
   - **Redirect URIs:** `https://your-vercel-domain.vercel.app/api/auth/callback/google`

---

## Step 6: Redeploy (Automatic or Manual)

**If using GitHub:** Vercel will automatically deploy after you set environment variables.

**If using CLI:** Run:
```bash
vercel --prod
```

**Wait 1-2 minutes for deployment to complete.**

---

## Step 7: Test Your Deployment (5 minutes)

1. Visit your Vercel URL: `https://your-vercel-domain.vercel.app`
2. Test **Google Sign-In:**
   - Click sign-in button
   - Select your Google account
   - You should be logged in
   
3. Test **File Upload:**
   - Start with a small file (< 1MB)
   - PDF/DOCX/TXT formats
   - Check the analysis results

---

## ✅ Success Checklist

- [ ] Secrets generated with `generate-secrets.js`
- [ ] Google OAuth credentials created
- [ ] Environment variables set in Vercel
- [ ] Redirect URIs added to Google Cloud Console
- [ ] Deployed to Vercel
- [ ] Google Sign-In works
- [ ] File upload works

---

## 🐛 If Something Doesn't Work

### Google Sign-In Button Doesn't Appear
```
→ Verify GOOGLE_CLIENT_ID is set in Vercel
→ Check browser console (F12) for errors
→ Wait 1-2 minutes after deploying
```

### Google Sign-In Returns Error
```
→ Check Vercel logs: Dashboard → Deployments → Logs
→ Verify redirect URIs match Google Cloud Console
→ Make sure you redeployed after setting env vars
```

### File Upload Returns 413 Error
```
→ File is too large (>3MB)
→ Set BLOB_READ_WRITE_TOKEN in Vercel (see below)
→ Redeploy with vercel --prod
```

### Check Server Status

**In development:**
```bash
curl http://localhost:3000/api/auth/config/status
```

This shows your OAuth configuration and any issues.

---

## 🎁 Optional: Enable Large File Uploads

To allow files > 3MB:

1. Go to **Vercel Dashboard** → **Storage** → **Create**
2. Select **Blob**
3. Copy the token
4. In **Settings → Environment Variables**, add:
   - `BLOB_READ_WRITE_TOKEN` = (paste token)
5. Redeploy: `vercel --prod`

Now you can upload up to 500MB files!

---

## 📖 Full Documentation

For detailed setup and troubleshooting:
- **DEPLOYMENT.md** - Comprehensive guide
- **TROUBLESHOOTING.md** - Quick reference
- **IMPLEMENTATION_SUMMARY.md** - Technical details

---

## 💡 Pro Tips

1. **Always redeploy after changing environment variables**
   ```bash
   vercel --prod
   ```

2. **Check your credentials carefully** - Copy-paste from Google Cloud Console, don't type manually

3. **Test locally first** - Make sure everything works before deploying

4. **Use the config status endpoint** - `http://localhost:3000/api/auth/config/status` (dev only)

5. **Check the logs** - Vercel Dashboard → Deployments → [Latest] → Logs

---

## 🎉 You're Done!

Your app is now deployed on Vercel with working file uploads and Google Sign-In.

**Next steps:**
1. Share your app URL with others
2. Monitor Vercel dashboard for any issues
3. Check TROUBLESHOOTING.md if problems arise

Happy coding! 🚀
