# WCase

WCase is a creator-portfolio application for publishing image and video work, sharing a public portfolio, receiving enquiries, and managing engagement. It consists of a React/Vite frontend and an Express/MongoDB API.

## Stack

- React 19, Vite, Tailwind CSS, Axios
- Node.js 20.19+ and Express 5
- MongoDB with Mongoose
- JWT authentication, bcrypt password hashing, email OTP verification, and Nodemailer
- Disk-backed image/video uploads with server-side type, size, ownership, and publication checks

## Local setup

1. Install Node.js 20.19 or newer and start a local MongoDB instance.
2. Install exact dependencies:

   ```bash
   npm ci --prefix backend
   npm ci --prefix frontend
   ```

3. Create local environment files from the safe examples:

   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env.local
   ```

4. Replace the placeholder secrets in `backend/.env`. Use independently generated, high-entropy values for `JWT_SECRET`, `OTP_HASH_SECRET`, and `MEDIA_SIGNING_SECRET`.
5. Run the API and frontend in separate terminals:

   ```bash
   npm run dev --prefix backend
   npm run dev --prefix frontend
   ```

The frontend runs at `http://localhost:5173` by default and calls the API at `http://localhost:5050/api`.

## Environment variables

Backend variables are documented in `backend/.env.example`. Production requires a MongoDB connection string, three independent signing/hash secrets, an exact frontend/CORS origin allowlist, email credentials, and an appropriate `TRUST_PROXY` value for the deployment topology. Never expose those values through `VITE_*` variables.

Frontend variables are documented in `frontend/.env.example`. In production, the default is a same-origin reverse proxy at `/api` and `/uploads`. If the API is hosted on another origin, set both frontend variables and update the deployed Content Security Policy to allow only that exact API origin.

## Checks

```bash
npm test
npm run lint
npm run build
npm audit --prefix backend
npm audit --prefix frontend
```

## Production deployment

1. Build `frontend/` with `npm run build --prefix frontend` and serve `frontend/dist/` through HTTPS.
2. Run the API with `NODE_ENV=production npm start --prefix backend` under a process supervisor.
3. Prefer a same-origin reverse proxy: route `/api` and `/uploads` to the API and all other paths to the frontend SPA. This matches the default production frontend configuration and the supplied static-host `_headers` policy.
4. Mount `backend/uploads/` on persistent, backed-up storage. The directory is intentionally ignored by Git. A multi-instance deployment needs shared object/file storage before horizontal scaling.
5. Set `CORS_ORIGINS` to comma-separated exact HTTPS origins. Wildcards are rejected. Set `TRUST_PROXY` only to the exact number of trusted reverse-proxy hops so HTTPS detection and IP rate limits remain correct.
6. Preserve the security headers in `frontend/public/_headers` (or configure equivalents at the CDN/reverse proxy). If using a separate API origin, add only that exact origin to `connect-src`, `img-src`, and `media-src`.
7. Do not log authorization headers, signed media URLs, reset links, OTPs, request bodies, or environment values at the proxy or application layer.
8. The built-in rate limiter is appropriate for a single API process. Use a trusted edge or distributed rate-limit store before running multiple API replicas.

Before a public launch, replace the placeholder Privacy Policy and Terms of Service with documents approved for the actual operator, jurisdiction, retention policy, and contact details.

## Repository safety

Real `.env*` files, dependency folders, build output, logs, local database exports, and runtime uploads are ignored. Only `.env.example` files should be committed. If a credential is ever committed, removing the file or adding it to `.gitignore` is not sufficient: revoke/rotate the credential and clean the Git history with a tool such as `git filter-repo` before publishing.
