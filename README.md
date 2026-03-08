# Dwarkesh Website

Dwarkesh Website is a Next.js + Prisma platform with three surfaces:

- Public marketing site
- Admin operations panel
- Client portal for HR, payroll, compliance, and document workflows

## Stack

- Next.js App Router
- React
- Prisma ORM
- PostgreSQL / Supabase Postgres
- Supabase Storage for production file storage
- Puppeteer / Chromium for PDF generation
- XLSX for import and export workflows

## Main Areas

### Public Pages

- `/`
- `/services`
- `/vision-mission`
- `/business-partners`
- `/enquire-now`
- `/book-consultation`
- `/signin`
- `/forgot-password`

### Admin Pages

- `/admin`
- `/admin/clients`
- `/admin/module-control`
- `/admin/document-allotment`
- `/admin/holiday-master`
- `/admin/compliance/legal-docs`
- `/admin/compliance/trainings`
- `/admin/compliance/committee-meetings`
- `/admin/training-calendar`
- `/admin/audit`
- `/admin/audit/program`
- `/admin/audit/client`
- `/admin/client-connect`
- `/admin/in-out`
- `/admin/settings`

### Client Pages

- `/client-dashboard`
- `/client/employees`
- `/client/employees/new`
- `/client/documents`
- `/client/payroll`
- `/client/payroll-data`
- `/client/payslip`
- `/client/payslip-data`
- `/client/advance`
- `/client/advance-data`
- `/client/in-out`
- `/client/in-out-data`
- `/client/compliance/legal-docs`
- `/client/compliance/trainings`
- `/client/compliance/committee-meetings`
- `/client/training`
- `/client/audit`
- `/client/chat`

## Key Features

- Unified sign-in for env admin, consultant admins, and clients
- Client impersonation from admin
- Per-client module control and page access control
- Employee master import, export, bulk updates, and master checks
- Payroll, advance, in-out, PF challan, ESIC challan, and payslip workflows
- Compliance legal document tracking, templates, and schedule generation
- Training and committee scheduling
- Audit file management
- Client-admin messaging and notifications
- DOCX-based personal file generation and PDF generation

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create a local env file.

Use `.env.local` or another env file loaded into your shell. The project expects at least:

```env
DATABASE_URL=
DIRECT_URL=
JWT_SECRET=
ADMIN_USERNAME=
ADMIN_PASSWORD=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_BUCKET=uploads
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Additional production email env vars used by the enquiry flow:

```env
RESEND_API_KEY=
RESEND_FROM_EMAIL=
LEADS_NOTIFICATION_EMAIL=
```

3. Generate Prisma client if needed:

```bash
npm run prisma:generate
```

4. Start the dev server:

```bash
npm run dev
```

## Database Notes

Prisma reads its datasource config from [prisma.config.ts](./prisma.config.ts).

Recommended Supabase setup:

- `DATABASE_URL`: transaction pooler / Prisma runtime URL
- `DIRECT_URL`: direct non-pooled Postgres URL for migrations and admin access

Do not point runtime Prisma traffic at the Supabase session pooler on port `5432` in Vercel serverless environments.

## File Storage Notes

- Production expects Supabase Storage
- Local development can fall back to `public/uploads`
- The bucket name defaults to `uploads`

Storage code lives in [lib/storage.ts](./lib/storage.ts).

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run test
npm run prisma:generate
npm run prisma:migrate:deploy
```

## Deployment

### Vercel

1. Log in:

```bash
npx vercel login
```

2. Link the repo:

```bash
npx vercel link
```

3. Pull env vars locally if needed:

```bash
npx vercel env pull .env.local
```

4. Deploy production:

```bash
npx vercel --prod
```

### Supabase

1. Log in:

```bash
npx supabase login
```

2. List projects:

```bash
npx supabase projects list
```

3. Link the local repo to the hosted project:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
```

## Security Notes

- Sessions are signed with `JWT_SECRET`
- Production Prisma query logging is disabled by default unless `DEBUG_PRISMA_QUERIES=1`
- Row level security should stay enabled on `public` tables
- Supabase service role keys must remain server-side only

## Current Testing Status

The repo currently has smoke coverage only. High-risk areas that should eventually have targeted tests:

- Auth and access control
- Employee import and bulk updates
- Payroll calculations
- Attendance / in-out generation
- Compliance schedule generation
- Storage-backed file generation flows

## Operational Recommendations

- Keep `DATABASE_URL` and `DIRECT_URL` aligned between local, preview, and production
- Use transaction pooling for serverless runtime traffic
- Prefer signed or authenticated file access for sensitive generated documents
- Remove any remaining legacy plaintext client passwords once all records are backfilled to bcrypt
