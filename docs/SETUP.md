# ResuMatch Local Setup

## Run

```bash
npm install
npm run dev
```

Open:

```txt
http://localhost:5173/login
```

## Google Sign-In

Use a Google OAuth client of type `Web application`.

Authorized JavaScript origins:

```txt
http://localhost:5173
```

Set these in `.env`:

```txt
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

The current app uses direct Google Sign-In. It does not need a Google client secret or redirect URI.

## MongoDB

Set:

```txt
DB_TYPE=mongodb
MONGODB_URI=your-mongodb-uri
```
