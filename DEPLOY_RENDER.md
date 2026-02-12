# Production Deployment Guide (Render)

This app is ready to deploy on Render as a full Node.js service.

## What was prepared

- `render.yaml` blueprint file for Render web + Postgres.
- `postinstall` script to run `prisma generate`.
- migration script: `npm run prisma:migrate:deploy`.
- `.env.production.example` with required environment variables.

## Step-by-step (simple)

1. Create a Render account
- Go to https://render.com and sign in.

2. Push your latest code to GitHub
- Make sure `render.yaml` is in the root of your repo.

3. Create services from Blueprint
- In Render dashboard: `New` -> `Blueprint`.
- Select your GitHub repo.
- Render will read `render.yaml` and create:
  - Web service (`dwarkesh-website`)
  - PostgreSQL database (`dwarkesh-postgres`)

4. Set environment variables
- Open the web service -> `Environment`.
- Add/update:
  - `ADMIN_USERNAME`
  - `ADMIN_PASSWORD`
  - `JWT_SECRET` (recommended; currently future-use)
  - `NEXT_PUBLIC_APP_URL` (your public Render URL)
- `DATABASE_URL` is auto-linked from the database via `render.yaml`.

5. Deploy and run migrations
- Render will build and deploy automatically.
- Before each deploy, it runs:
  - `npm run prisma:migrate:deploy`
- This applies Prisma migrations safely in production.

6. Verify app is live
- Open your Render URL.
- Check:
  - `/signin` works (admin + client login)
  - `/client/employees` import/list/delete
  - `/client/documents` PDF generation
  - `/client/payroll` export

7. Verify production build health
- In Render logs, confirm:
  - build completed
  - migrations applied
  - service started on assigned port
- Health check path is `/signin`.

## Required env vars

- `DATABASE_URL` (required) - PostgreSQL connection string.
- `ADMIN_USERNAME` (required) - admin login username.
- `ADMIN_PASSWORD` (required) - admin login password.

## Recommended env vars

- `NEXT_PUBLIC_APP_URL` - public base URL of your app.
- `JWT_SECRET` - future authentication hardening secret.

## Notes

- Uploads are currently saved under `public/uploads` inside app storage.
- On many platforms, local disk can be ephemeral between deploys.
- For long-term reliability, move file uploads to object storage (S3/R2) in a later step.
