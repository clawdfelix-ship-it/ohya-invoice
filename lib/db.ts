import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!databaseUrl) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('DATABASE_URL or POSTGRES_URL is required in production');
  }
  console.warn('⚠️ No database connection string found. Database queries will fail.');
}

export const sql = databaseUrl ? neon(databaseUrl) : null;

export const db = databaseUrl ? drizzle(sql!) : null as any;
