# Complete Vercel Deployment Guide

## අපේ කඩේ ණය පොත — Frontend + Backend + MongoDB Atlas

This project is deployed as one Vercel project:

```text
Browser / Android PWA
        ↓
Vercel React static frontend
        ↓  /api/* (same HTTPS origin)
Vercel Express serverless function
        ↓
MongoDB Atlas
```

Using one Vercel project is recommended because the React frontend and Express API share the same secure origin. JWT
HTTP-only cookies therefore work without cross-site cookie configuration.

---

## 1. Files already prepared for Vercel

```text
ape-kade-credit-book/
├── api/
│   └── index.ts                 # Vercel serverless Express entry point
├── client/                      # React + Vite frontend
├── server/                      # Express + Mongoose backend
├── vercel.json                  # Build, routing and function configuration
├── .env.example
└── package.json
```

The current `vercel.json` performs these tasks:

- Installs root, backend, and frontend dependencies.
- Runs the production TypeScript builds.
- Publishes `client/dist` as the frontend.
- Sends `/api/*` to the Express serverless function.
- Sends other application routes to React's `index.html`.
- Allows up to 30 seconds for API function execution.

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "installCommand": "npm install && npm --prefix server install && npm --prefix client install",
  "buildCommand": "npm run build",
  "outputDirectory": "client/dist",
  "functions": {
    "api/index.ts": {
      "maxDuration": 30,
      "includeFiles": "server/src/**"
    }
  },
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "/api/index"
    },
    {
      "source": "/:path*",
      "destination": "/index.html"
    }
  ]
}
```

Do not move `vercel.json` into `client` or `server`.

---

## 2. Local prerequisites

Install:

- Node.js 20 or newer
- npm 10 or newer
- Git
- A GitHub account
- A Vercel account
- A MongoDB Atlas account

Verify:

```bash
node --version
npm --version
git --version
```

---

## 3. Test the production build locally

Open a terminal in the project root—not in `client` or `server`:

```bash
cd ape-kade-credit-book
```

### Install dependencies

Use the same installation commands configured on Vercel:

```bash
npm install
npm --prefix server install
npm --prefix client install
```

### Type-check both applications

```bash
npm run typecheck
```

This runs:

```bash
npm --prefix server run typecheck
npm --prefix client run typecheck
```

### Run the Vercel production build command

```bash
npm run build
```

This runs:

```bash
npm --prefix server run build
npm --prefix client run build
```

Expected outputs:

```text
server/dist/     # Compiled Express backend
client/dist/     # Compiled React frontend
```

Vercel publishes `client/dist` and independently bundles `api/index.ts` as a serverless function.

### Local development

Create `.env` from the example and provide local values:

```bash
cp .env.example .env
npm run dev
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
npm run dev
```

Local URLs:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:5000/api
Health:   http://localhost:5000/api/health
```

---

## 4. Create MongoDB Atlas

Vercel does not provide MongoDB. Business data must be stored in MongoDB Atlas or another reachable MongoDB deployment.

1. Visit https://www.mongodb.com/atlas.
2. Create an organization/project if necessary.
3. Create a MongoDB cluster.
4. Select a region near Sri Lanka/your users when available.
5. Wait until the cluster is ready.

### Create a database user

In Atlas:

```text
Security → Database Access → Add New Database User
```

Use:

- A unique username—not one of the application usernames.
- A long, randomly generated password.
- Read/write access only to the application database where practical.

### Configure network access

Open:

```text
Security → Network Access → Add IP Address
```

Vercel serverless functions normally use dynamic outbound addresses. The basic configuration is:

```text
0.0.0.0/0
```

This does not make the database password public, but it permits connection attempts from any IP. Therefore:

- Use a strong unique database password.
- Never place the URI in source code.
- Use a least-privilege Atlas user.
- Enable Atlas alerts and backups.
- Consider Vercel/Atlas private or static networking for higher-security production deployments.

### Obtain the connection string

Choose:

```text
Database → Connect → Drivers → Node.js
```

Example:

```text
mongodb+srv://DB_USER:DB_PASSWORD@cluster.example.mongodb.net/ape_kade_credit_book?retryWrites=true&w=majority
```

Replace the username and password. URL-encode special characters in credentials. For example, `@` becomes `%40`.

Do not commit this URI.

---

## 5. Push the project to GitHub

Ensure `.gitignore` contains `.env`, `node_modules`, and generated build directories.

From the project root:

```bash
git init
git add .
git commit -m "Prepare Ape Kade Credit Book for Vercel"
git branch -M main
git remote add origin https://github.com/YOUR_ACCOUNT/YOUR_REPOSITORY.git
git push -u origin main
```

For subsequent changes:

```bash
git add .
git commit -m "Describe the change"
git push
```

Vercel automatically creates a new deployment after each push when Git integration is enabled.

---

## 6. Import the project into Vercel

1. Visit https://vercel.com/new.
2. Select **Import Git Repository**.
3. Import the GitHub repository.
4. Configure the project as follows.

### Build and Output Settings

Use these exact values if Vercel does not automatically read them from `vercel.json`:

| Setting          | Value                                                                       |
|------------------|-----------------------------------------------------------------------------|
| Framework Preset | `Other`                                                                     |
| Root Directory   | `./` (repository root)                                                      |
| Install Command  | `npm install && npm --prefix server install && npm --prefix client install` |
| Build Command    | `npm run build`                                                             |
| Output Directory | `client/dist`                                                               |

Do not select `client` as the Root Directory. Doing so prevents Vercel from finding the Express backend and root
`vercel.json`.

The project's Vercel settings normally inherit these values from `vercel.json`. If dashboard overrides are enabled, make
sure they match the table.

---

## 7. Add Vercel environment variables

Before deploying, open:

```text
Vercel Project → Settings → Environment Variables
```

Add the following:

| Name             | Required value                          | Environments                     |
|------------------|-----------------------------------------|----------------------------------|
| `MONGODB_URI`    | MongoDB Atlas connection string         | Production, Preview, Development |
| `JWT_SECRET`     | Random secret of at least 32 characters | Production, Preview, Development |
| `JWT_EXPIRES_IN` | `8h`                                    | Production, Preview, Development |
| `CLIENT_URL`     | Exact HTTPS frontend origin             | Production, Preview              |
| `NODE_ENV`       | `production`                            | Production, Preview              |
| `VITE_API_URL`   | Leave empty for same-origin `/api`      | Production, Preview              |

Generate a secure JWT secret locally:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Example production values:

```text
MONGODB_URI=mongodb+srv://...
JWT_SECRET=96-character-generated-hex-value
JWT_EXPIRES_IN=8h
CLIENT_URL=https://ape-kade-credit-book.vercel.app
NODE_ENV=production
VITE_API_URL=
```

Important:

- Do not add quotation marks around values in the Vercel dashboard.
- Do not add a trailing slash to `CLIENT_URL`.
- `CLIENT_URL` must include `https://`.
- Vercel automatically provides `VERCEL_URL`; do not set it manually.
- Server environment variables are read at runtime.
- Variables beginning with `VITE_` are embedded into the frontend during build and are visible to browsers. Never put
  secrets in a `VITE_` variable.

The application needs `VITE_API_URL` only when the API is hosted separately. For this combined deployment, leave it
empty.

---

## 8. First deployment

Click **Deploy**.

Vercel performs approximately these commands:

```bash
npm install
npm --prefix server install
npm --prefix client install
npm run build
```

Then it:

1. Publishes `client/dist`.
2. Bundles `api/index.ts` and referenced backend files.
3. Creates the `/api/*` serverless route.
4. Adds HTTPS automatically.

When deployment finishes, Vercel provides a URL similar to:

```text
https://ape-kade-credit-book.vercel.app
```

If this differs from the `CLIENT_URL` entered earlier:

1. Open **Settings → Environment Variables**.
2. Change `CLIENT_URL` to the exact final origin.
3. Open **Deployments**.
4. Redeploy the latest deployment.

The automatically supplied `VERCEL_URL` permits the current generated deployment origin, but setting the correct
`CLIENT_URL` is still required for production consistency and custom domains.

---

## 9. Deploy using the Vercel CLI instead

You can deploy without GitHub, although Git integration is recommended.

### Log in and link

```bash
npx vercel login
npx vercel link
```

During linking:

- Select your Vercel account/team.
- Link to an existing project or create a new one.
- Keep the project root as the current directory.

### Add environment variables from the CLI

```bash
npx vercel env add MONGODB_URI production
npx vercel env add JWT_SECRET production
npx vercel env add JWT_EXPIRES_IN production
npx vercel env add CLIENT_URL production
npx vercel env add NODE_ENV production
```

Repeat with `preview` if desired.

### Create a preview deployment

```bash
npx vercel
```

### Create a production deployment

```bash
npx vercel --prod
```

### View deployment logs

```bash
npx vercel logs YOUR_DEPLOYMENT_URL
```

Runtime function logs are also available under:

```text
Vercel Project → Logs
```

---

## 10. Seed the production database

Deployment does not automatically seed accounts. Run the idempotent initialization script once against the Atlas
production database.

### Recommended method: pull Vercel environment variables

```bash
npx vercel link
npx vercel env pull .env.production.local --environment=production
```

Run the seed using that file:

#### macOS/Linux

```bash
DOTENV_CONFIG_PATH=.env.production.local npm run seed
rm .env.production.local
```

#### Windows PowerShell

```powershell
$env:DOTENV_CONFIG_PATH = ".env.production.local"
npm run seed
Remove-Item .env.production.local
Remove-Item Env:DOTENV_CONFIG_PATH
```

Expected output:

```text
Initialized exactly 3 required users and 5 categories. No business data was created.
```

The script is safe to run again because it uses upserts. It creates only:

```text
Users:
- Gayanuka / ADMIN
- Priyantha / CASHIER
- Thamara / CASHIER

Categories:
- Goods
- Reload
- Photocopy
- Printout
- Other
```

It creates no customers, credits, payments, or artificial dashboard figures.

Delete the downloaded environment file immediately after seeding. Never commit it.

---

## 11. Verify frontend and backend

### Health endpoint

Open:

```text
https://YOUR_DOMAIN/api/health
```

Expected result:

```json
{
  "status": "ok"
}
```

This confirms Vercel routing and the Express function are available. The first request after inactivity may take
slightly longer because of a serverless cold start.

### Login page

Open:

```text
https://YOUR_DOMAIN/login
```

Verify:

1. The login page loads over HTTPS.
2. Login works with one of the initialized accounts.
3. Refreshing a protected page keeps the user authenticated.
4. The dashboard initially displays zero business activity.
5. Creating a customer persists after refresh/logout.
6. Credit and payment transactions update balances correctly.
7. Admin-only pages reject Cashier API access.
8. Dark mode and Android/PWA installation work.

Do not create fake production financial records for testing. Use a real authorized record, or remove only a customer
with no financial history through database administration. Financial records should be voided rather than deleted.

---

## 12. Add a custom domain

In Vercel:

```text
Project → Settings → Domains → Add Domain
```

After DNS verification:

1. Change `CLIENT_URL` to the custom HTTPS origin.
2. Redeploy the application.
3. Test login and logout again.
4. Install the PWA again from the custom domain if needed.

Example:

```text
CLIENT_URL=https://nayapotha.example.lk
```

Do not include a trailing slash.

---

## 13. Frontend and backend deployment behavior

### Frontend

The frontend is built by:

```bash
npm --prefix client run build
```

Vite writes static assets to:

```text
client/dist
```

Vercel serves those files globally through its CDN. React Router routes are rewritten to `index.html`.

### Backend

The Vercel backend entry point is:

```text
api/index.ts
```

It:

1. Reuses or creates a MongoDB connection.
2. Passes the request to the Express application.
3. Returns a safe `503` if the database cannot be reached.

Vercel rewrites:

```text
/api/auth/login
/api/customers
/api/transactions/credit
```

to the same Express serverless function while retaining the original API path.

The backend filesystem is temporary and must never be used for persistent records. All persistent business data remains
in MongoDB Atlas.

---

## 14. Updating the deployed application

With Git integration:

```bash
git add .
git commit -m "Add new feature"
git push origin main
```

Vercel automatically builds and deploys the commit.

Before pushing production changes:

```bash
npm run typecheck
npm run build
```

To force a deployment from the CLI:

```bash
npx vercel --prod
```

To redeploy from the dashboard:

```text
Project → Deployments → Latest Deployment → Redeploy
```

Use **Redeploy without build cache** after changing dependency installation or when troubleshooting stale builds.

---

## 15. Common errors and fixes

### Build fails with `tsc: not found`

Cause: Vercel installed only the root package.

Ensure Install Command is exactly:

```bash
npm install && npm --prefix server install && npm --prefix client install
```

Then redeploy without build cache.

### `Invalid environment configuration`

Ensure these exist in the deployment environment:

```text
MONGODB_URI
JWT_SECRET
JWT_EXPIRES_IN
CLIENT_URL
NODE_ENV
```

`JWT_SECRET` must contain at least 32 characters, and `CLIENT_URL` must be a valid URL.

### API returns `503 Database service is temporarily unavailable`

Check:

- Atlas cluster is running.
- `MONGODB_URI` username/password are correct.
- Special characters are URL-encoded.
- Atlas Network Access permits Vercel.
- Database user has sufficient permissions.

View the Vercel Function logs for the underlying connection message.

### API returns `500 An unexpected error occurred`

Open Vercel Logs and inspect the server-side error. The API intentionally does not expose stack traces to browsers.
Confirm the latest code was deployed and all variables are configured.

### Browser shows a CORS error

`CLIENT_URL` must exactly match the frontend origin:

```text
Correct:   https://ape-kade-credit-book.vercel.app
Incorrect: http://ape-kade-credit-book.vercel.app
Incorrect: https://ape-kade-credit-book.vercel.app/
```

Update it and redeploy.

### Login always fails

Run the seed against the production Atlas URI. Seeding your local MongoDB does not seed production.

Also verify cookies in browser developer tools. Production cookies require HTTPS, which Vercel supplies automatically.

### `/api/health` displays the React application

Vercel did not load the root routing configuration.

Check:

- `vercel.json` is committed at repository root.
- Vercel Root Directory is `./`.
- There is no dashboard override pointing to `client`.
- Redeploy without build cache.

### React route returns 404 after refresh

Ensure the final rewrite exists:

```json
{
  "source": "/:path*",
  "destination": "/index.html"
}
```

### Changes are not visible

- Confirm the latest Git commit is deployed.
- Redeploy without build cache.
- Hard-refresh the browser.
- If necessary, unregister the PWA service worker once and reload.

### Function timeout

- Check Atlas latency and indexes.
- Verify the Atlas cluster is not paused.
- Avoid large unpaginated API requests.
- Keep the function duration setting supported by your Vercel plan.

---

## 16. Security checklist before real use

- [ ] MongoDB URI exists only in Vercel environment variables.
- [ ] JWT secret is randomly generated and at least 32 characters.
- [ ] Production uses HTTPS.
- [ ] `CLIENT_URL` exactly matches the production domain.
- [ ] Atlas uses a strong, unique database password.
- [ ] Atlas database user has least-privilege access.
- [ ] Atlas backups and monitoring are enabled.
- [ ] Initial application passwords are changed after first login.
- [ ] Admin and Cashier authorization is tested.
- [ ] No `.env` file is committed to Git.
- [ ] No demo customers or financial transactions were seeded.
- [ ] Vercel logs do not expose secrets.
- [ ] A restore procedure has been tested before relying on the system.

---

## 17. Recommended production arrangement

```text
Custom HTTPS domain
        ↓
Vercel CDN — React frontend/PWA
        ↓ same origin /api
Vercel serverless Express function
        ↓ encrypted MongoDB connection
MongoDB Atlas replica set + backups
```

Vercel hosts application code, not the database. MongoDB Atlas remains the source of truth for customers, transactions,
audit logs, users, categories, and settings.
