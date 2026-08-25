import 'dotenv/config';
import { z } from 'zod';
const schema=z.object({NODE_ENV:z.enum(['development','test','production']).default('development'),PORT:z.coerce.number().default(5000),MONGODB_URI:z.string().min(1),JWT_SECRET:z.string().min(32),JWT_EXPIRES_IN:z.string().default('8h'),CLIENT_URL:z.string().url(),VERCEL_URL:z.string().optional()});
const parsed=schema.safeParse(process.env); if(!parsed.success){console.error('Invalid environment configuration',parsed.error.flatten().fieldErrors);process.exit(1)}
export const env=parsed.data;
