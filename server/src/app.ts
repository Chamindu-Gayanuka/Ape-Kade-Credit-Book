import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import morgan from 'morgan';
import { env } from './config/env.js';
import auth from './routes/auth.js';
import customers from './routes/customers.js';
import transactions from './routes/transactions.js';
import categories from './routes/categories.js';
import dashboard from './routes/dashboard.js';
import reports from './routes/reports.js';
import users from './routes/users.js';
import admin from './routes/admin.js';
import { AppError } from './utils/http.js';

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
const allowedOrigins = new Set([
  env.CLIENT_URL.replace(/\/$/, ''),
  ...(env.VERCEL_URL ? [`https://${env.VERCEL_URL}`] : []),
]);
app.use(cors({
  credentials: true,
  origin(origin, callback) {
    // Requests without Origin are server-to-server/health requests. Browser origins
    // must match the configured production URL or this exact Vercel deployment.
    if (!origin || allowedOrigins.has(origin.replace(/\/$/, ''))) return callback(null, true);
    return callback(new AppError(403, 'Origin is not allowed.'));
  },
}));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use(mongoSanitize());
if (env.NODE_ENV !== 'test') app.use(morgan('combined'));

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', auth);
app.use('/api/customers', customers);
app.use('/api/transactions', transactions);
app.use('/api/categories', categories);
app.use('/api/dashboard', dashboard);
app.use('/api/reports', reports);
app.use('/api/users', users);
app.use('/api', admin);
app.use((_req, _res, next) => next(new AppError(404, 'Route not found.')));

app.use((error: any, _req: any, res: any, _next: any) => {
  let status = error instanceof AppError ? error.status : 500;
  let text = error instanceof AppError ? error.message : 'An unexpected error occurred.';

  if (error?.name === 'ValidationError') {
    status = 400;
    text = Object.values(error.errors || {}).map((item: any) => item.message).join(' ') || 'Invalid information.';
  } else if (error?.name === 'CastError') {
    status = 400;
    text = `Invalid ${error.path || 'identifier'}.`;
  } else if (error?.code === 11000) {
    status = 409;
    const field = Object.keys(error.keyPattern || error.keyValue || {})[0] || 'value';
    text = `A record with this ${field} already exists.`;
  } else if (error instanceof SyntaxError && 'body' in error) {
    status = 400;
    text = 'Invalid request body.';
  }

  if (status >= 500) console.error('Unhandled request error:', error);
  res.status(status).json({ message: text });
});

export default app;
