import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/db';
import { invoices } from '../../../lib/schema';
import { eq, desc } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!db) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(500).end(JSON.stringify({ error: 'Database not configured' }));
  }

  try {
    if (req.method === 'GET') {
      const results = await db.select().from(invoices).orderBy(desc(invoices.date));
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify(results.map(inv => ({ ...inv, items: JSON.parse(inv.items || '[]') }))));
    }

    if (req.method === 'POST') {
      const { id, no, client, client_email, client_address, date, items, paid, exchange_rate } = req.body;
      await db.insert(invoices).values({
        id, no, client, clientEmail: client_email || '', clientAddress: client_address || '',
        date, items: JSON.stringify(items), paid: paid ? 1 : 0, exchangeRate: exchange_rate || 0
      });
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify(req.body));
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(405).end(JSON.stringify({ error: 'Method not allowed' }));
  } catch (err: any) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(500).end(JSON.stringify({ error: err.message }));
  }
}
