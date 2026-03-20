import { sql } from 'drizzle-orm';
import { db } from './db';

export async function initializeDatabase() {
  try {
    // Customers table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS customers (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        phone VARCHAR(50),
        email VARCHAR(100),
        company VARCHAR(200),
        address TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Invoices table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS invoices (
        id VARCHAR(50) PRIMARY KEY,
        no VARCHAR(50) NOT NULL,
        client VARCHAR(200) NOT NULL,
        client_email VARCHAR(100),
        client_address TEXT,
        date VARCHAR(20) NOT NULL,
        items TEXT NOT NULL,
        paid INTEGER DEFAULT 0,
        exchange_rate REAL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Records table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS records (
        id VARCHAR(50) PRIMARY KEY,
        date VARCHAR(20) NOT NULL,
        desc VARCHAR(500) NOT NULL,
        type VARCHAR(20) NOT NULL,
        amount REAL NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Settings table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT
      );
    `);

    // Products table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(50) PRIMARY KEY,
        sku VARCHAR(50),
        name VARCHAR(200) NOT NULL,
        category VARCHAR(100),
        cost_jpy REAL DEFAULT 0,
        jan VARCHAR(50),
        suggested_price_hkd REAL DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Database tables initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}
