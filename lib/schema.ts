import { pgTable, serial, varchar, real, text, timestamp, integer } from 'drizzle-orm/pg-core';

export const customers = pgTable('customers', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 100 }),
  company: varchar('company', { length: 200 }),
  address: text('address'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const invoices = pgTable('invoices', {
  id: varchar('id', { length: 50 }).primaryKey(),
  no: varchar('no', { length: 50 }).notNull(),
  client: varchar('client', { length: 200 }).notNull(),
  clientEmail: varchar('client_email', { length: 100 }),
  clientAddress: text('client_address'),
  date: varchar('date', { length: 20 }).notNull(),
  items: text('items').notNull(), // JSON string
  paid: integer('paid').default(0), // 0 = unpaid, 1 = paid
  exchangeRate: real('exchange_rate').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const records = pgTable('records', {
  id: varchar('id', { length: 50 }).primaryKey(),
  date: varchar('date', { length: 20 }).notNull(),
  desc: varchar('desc', { length: 500 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(), // 'income' or 'expense'
  amount: real('amount').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const settings = pgTable('settings', {
  key: varchar('key', { length: 100 }).primaryKey(),
  value: text('value'),
});

export const products = pgTable('products', {
  id: varchar('id', { length: 50 }).primaryKey(),
  sku: varchar('sku', { length: 50 }),
  name: varchar('name', { length: 200 }).notNull(),
  category: varchar('category', { length: 100 }),
  costJpy: real('cost_jpy').default(0),
  jan: varchar('jan', { length: 50 }),
  suggestedPriceHkd: real('suggested_price_hkd').default(0),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
export type Record = typeof records.$inferSelect;
export type NewRecord = typeof records.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
