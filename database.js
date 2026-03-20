const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'oha-invoice.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    company TEXT,
    address TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    no TEXT NOT NULL,
    client TEXT NOT NULL,
    client_email TEXT,
    client_address TEXT,
    date TEXT NOT NULL,
    items TEXT NOT NULL,
    paid INTEGER DEFAULT 0,
    exchange_rate REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS records (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    desc TEXT NOT NULL,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Customer operations
const customerOps = {
  getAll: () => db.prepare('SELECT * FROM customers ORDER BY name').all(),
  getById: (id) => db.prepare('SELECT * FROM customers WHERE id = ?').get(id),
  create: (c) => {
    const stmt = db.prepare('INSERT INTO customers (id, name, phone, email, company, address, notes) VALUES (?, ?, ?, ?, ?, ?, ?)');
    stmt.run(c.id, c.name, c.phone || '', c.email || '', c.company || '', c.address || '', c.notes || '');
    return c;
  },
  update: (c) => {
    const stmt = db.prepare('UPDATE customers SET name=?, phone=?, email=?, company=?, address=?, notes=?, updated_at=datetime(\'now\') WHERE id=?');
    stmt.run(c.name, c.phone || '', c.email || '', c.company || '', c.address || '', c.notes || '', c.id);
    return c;
  },
  delete: (id) => db.prepare('DELETE FROM customers WHERE id = ?').run(id),
  search: (q) => db.prepare('SELECT * FROM customers WHERE name LIKE ? ORDER BY name LIMIT 10').all(`%${q}%`)
};

// Invoice operations
const invoiceOps = {
  getAll: () => db.prepare('SELECT * FROM invoices ORDER BY date DESC').all(),
  getById: (id) => db.prepare('SELECT * FROM invoices WHERE id = ?').get(id),
  create: (inv) => {
    const stmt = db.prepare('INSERT INTO invoices (id, no, client, client_email, client_address, date, items, paid, exchange_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    stmt.run(inv.id, inv.no, inv.client, inv.client_email || '', inv.client_address || '', inv.date, JSON.stringify(inv.items), inv.paid ? 1 : 0, inv.exchange_rate || 0);
    return inv;
  },
  update: (inv) => {
    const stmt = db.prepare('UPDATE invoices SET no=?, client=?, client_email=?, client_address=?, date=?, items=?, paid=?, exchange_rate=? WHERE id=?');
    stmt.run(inv.no, inv.client, inv.client_email || '', inv.client_address || '', inv.date, JSON.stringify(inv.items), inv.paid ? 1 : 0, inv.exchange_rate || 0, inv.id);
    return inv;
  },
  delete: (id) => db.prepare('DELETE FROM invoices WHERE id = ?').run(id),
  markPaid: (id) => db.prepare('UPDATE invoices SET paid=1 WHERE id=?').run(id)
};

// Record operations
const recordOps = {
  getAll: () => db.prepare('SELECT * FROM records ORDER BY date DESC').all(),
  create: (r) => {
    const stmt = db.prepare('INSERT INTO records (id, date, desc, type, amount) VALUES (?, ?, ?, ?, ?)');
    stmt.run(r.id, r.date, r.desc, r.type, r.amount);
    return r;
  },
  delete: (id) => db.prepare('DELETE FROM records WHERE id = ?').run(id),
  getByDateRange: (start, end) => db.prepare('SELECT * FROM records WHERE date >= ? AND date <= ? ORDER BY date').all(start, end)
};

// Settings operations
const settingsOps = {
  get: (key) => {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row ? row.value : null;
  },
  set: (key, value) => {
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
  }
};

module.exports = { db, customerOps, invoiceOps, recordOps, settingsOps };
