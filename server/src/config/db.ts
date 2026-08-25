import mongoose from 'mongoose';
import { env } from './env.js';

let connectionPromise: Promise<typeof mongoose> | null = null;

/** Reuses the warm serverless connection and prevents connection storms. */
export async function connectDB() {
  if (mongoose.connection.readyState === 1) return mongoose;
  if (!connectionPromise) {
    mongoose.set('strictQuery', true);
    connectionPromise = mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10_000,
      maxPoolSize: 10,
    }).then(instance => {
      console.log('MongoDB connected');
      return instance;
    }).catch(error => {
      connectionPromise = null;
      throw error;
    });
  }
  return connectionPromise;
}
