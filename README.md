# අපේ කඩේ ණය පොත - Ape Kade Credit Book

A production-oriented MERN digital credit notebook for a Sri Lankan retail shop. All customer and financial information
is persisted in MongoDB; there is no mock or demo business data.

## Stack

- React 18, TypeScript, Tailwind CSS, React Router, Axios, Recharts, Lucide
- Node.js, Express, TypeScript, JWT in HTTP-only cookies, bcrypt
- MongoDB and Mongoose

## Prerequisites

- Node.js 20+
- MongoDB 7+ (a replica set or MongoDB Atlas is strongly recommended for production)
- npm 10+

Financial writes use MongoDB transactions on replica sets and MongoDB Atlas. Local standalone MongoDB is also supported
through a compensating-write mode, so development credit/payment entry works without the
`Transaction numbers are only allowed on a replica set member or mongos` error. Production should use a replica set for
native multi-document atomicity.

## Setup

```bash
cp .env.example .env
# Set MONGODB_URI, a strong JWT_SECRET (32+ characters), and CLIENT_URL
npm install
npm --prefix server install
npm --prefix client install
npm run seed
npm run dev
```

Frontend: `http://localhost:5173`  
API: `http://localhost:5000/api`

The root `npm install` is only needed for the combined development command. You can run each package independently with
`npm --prefix server run dev` and `npm --prefix client run dev`.

## Initial database state

`npm run seed` is idempotent and inserts only:

- Required users: Gayanuka (ADMIN), Priyantha (CASHIER), Thamara (CASHIER)
- Categories: Goods, Reload, Photocopy, Printout, Other

It creates no customers, transactions, payments, settings, or audit logs. Required initial passwords are hashed with
bcrypt cost 12 and are never returned by the API. Change passwords through Admin → Users after first login.

## Vercel deployment

The repository includes a Vercel serverless entry point and routing configuration. Follow the complete MongoDB Atlas,
environment-variable, seeding, verification, and troubleshooting guide in [
`VERCEL_DEPLOYMENT.md`](./VERCEL_DEPLOYMENT.md).

## Traditional server production

```bash
npm run build
NODE_ENV=production npm --prefix server start
```

Serve `client/dist` through a reverse proxy/static host, proxy `/api` to the Express server, enable TLS, set
`CLIENT_URL` to the exact frontend origin, use a high-entropy `JWT_SECRET`, and use a MongoDB replica set with
authentication, backups, and restricted network access.

## Security and integrity

- JWT stored as HTTP-only, SameSite cookie; secure flag in production
- Login rate limiting, Helmet, CORS allowlist, input sanitization, Zod environment validation
- Backend role checks on every protected/admin endpoint
- Password hashes excluded by default from Mongoose queries
- Integer cents for decimal-safe monetary arithmetic
- Atomic transaction + audit-log creation using MongoDB sessions
- Payments checked against computed transaction-ledger balance
- Financial records are voided/corrected, never deleted
- Server-side pagination, filtering, search, and indexes

## API highlights

Authentication, customers, categories, dashboard, reports, users, audit logs, settings, and permanent financial
transactions are exposed under `/api` as documented in the source routes.

## Android installation and conversion

The production frontend is now an installable Progressive Web App (PWA), with a web manifest, standalone display mode,
app icon, theme colors, and an offline application-shell service worker. After deploying the frontend and API together
over HTTPS, Android users can open the site in Chrome and choose **Install app** or **Add to Home screen**. It opens
like a standalone Android application while all business records continue to use the secure MongoDB API.

For Play Store distribution, the same PWA can be packaged as a Trusted Web Activity, or the React frontend can be
wrapped with Capacitor. The Express/MongoDB backend must remain hosted on an HTTPS server; it must not be bundled into
the phone. Set `VITE_API_URL` when the API is hosted at a separate URL and configure `CLIENT_URL`/CORS for the deployed
frontend origin. HTTP-only cookie authentication is easiest and safest when frontend and API are served under the same
HTTPS origin.

The service worker caches only the application shell and explicitly does **not** cache `/api` requests, customer
information, or financial responses.

## Notes

- The Record Credit page can create and immediately select a real customer without leaving the transaction form.
- Selecting the `Other` category reveals an optional custom-category field. A named category is persisted and reused;
  leaving it blank records the standard `Other` category.
- Dashboard/report figures are aggregation results from MongoDB and show zero for an empty business database.
- Cashiers have operational access; user management, audit logs, settings, voiding, and correction are enforced as
  Admin-only by the API.
- Receipt printing uses the actual transaction returned after a successful database commit.
