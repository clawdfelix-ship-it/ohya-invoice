import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql as drizzleSql } from 'drizzle-orm';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('DATABASE_URL is required in production');
  }
  console.warn('⚠️ No DATABASE_URL found. Database queries will fail.');
}

// Export db instance for Drizzle ORM operations
// Export sql for raw SQL queries (migrations, etc.)
export const db = databaseUrl ? drizzle(neon(databaseUrl)) : null as any;
export { drizzleSql as sql };
