# Deploy RESUMATCH: AWS Amplify Frontend + Render Backend

This repo is configured for a split deployment:

- Frontend: AWS Amplify Hosting, from `frontend/`
- Backend: Render Web Service, from `backend/`

## 1. Push The Repo

Do not commit `.env`. It is already ignored.

```bash
git add .
git commit -m "Prepare Amplify frontend and Render backend deployment"
git push origin main
```

## 2. Deploy Backend On Render

Recommended: use the included `render.yaml` blueprint.

1. Go to Render Dashboard.
2. New → Blueprint.
3. Connect this GitHub repo.
4. Render will read `render.yaml`.
5. Set the secret environment variables that are marked `sync: false`.

Required Render environment variables:

```txt
NVIDIA_API_KEY=your-nvidia-api-key
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
APP_URL=https://your-amplify-domain.amplifyapp.com
BACKEND_URL=https://your-render-service.onrender.com
```

The blueprint also sets:

```txt
NODE_ENV=production
SQLITE_PATH=/var/data/data.db
UPLOAD_DIR=/var/data/uploads
MAX_UPLOAD_MB=10
NVIDIA_MODEL=nvidia/llama-2-70b-chat
```

The included Render service uses a persistent disk for SQLite and uploads, so it uses a paid `starter` plan. If you deploy manually, use:

```txt
Root Directory: backend
Build Command: npm install
Start Command: npm start
Health Check Path: /api/health
```

After deploy, verify:

```txt
https://your-render-service.onrender.com/api/health
```

## 3. Deploy Frontend On AWS Amplify

1. Go to AWS Amplify.
2. New app → Host web app.
3. Connect this GitHub repo.
4. Amplify should detect `amplify.yml`.
5. Add the frontend environment variables.

Required Amplify environment variables:

```txt
VITE_API_URL=https://your-render-service.onrender.com
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

The repo-level `amplify.yml` builds only the `frontend/` app:

```txt
appRoot: frontend
build: npm run build
artifacts: dist
```

## 4. Add Amplify SPA Rewrite

In Amplify Console → Hosting → Rewrites and redirects, add:

```txt
Source address: </^[^.]+$|\.(?!(css|gif|ico|jpg|jpeg|js|png|txt|svg|woff|woff2|ttf|map|json)$)([^.]+$)/>
Target address: /index.html
Type: 200 (Rewrite)
```

This lets routes like `/login`, `/dashboard`, and `/builder` load correctly on refresh.

## 5. Google OAuth URLs

In Google Cloud Console → OAuth client → Authorized JavaScript origins:

```txt
http://localhost:5175
https://your-amplify-domain.amplifyapp.com
```

Authorized redirect URIs:

```txt
http://localhost:3000/api/auth/callback/google
https://your-render-service.onrender.com/api/auth/callback/google
```

## 6. Local Development

```bash
npm install
npm --prefix frontend install
npm --prefix backend install
npm run dev
```

Local frontend API calls still work through the Vite proxy. For local development, `VITE_API_URL` can stay empty.

## 7. Verification Checklist

- Render health works: `/api/health`
- Amplify app opens
- Refreshing `/builder` does not 404
- `VITE_API_URL` in Amplify has no trailing slash
- Resume builder AI buttons call Render successfully
- Google OAuth has both Amplify origin and Render redirect URI
