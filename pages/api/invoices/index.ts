import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/db';
import { invoices } from '../../../lib/schema';
import { eq, desc } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!db) return res.status(500).json({ error: 'Database not configured' });

  try {
    if (req.method === 'GET') {
      const results = await db.select().from(invoices).orderBy(desc(invoices.date));
      return res.json(results.map(inv => ({ ...inv, items: JSON.parse(inv.items || '[]') })));
    }

    if (req.method === 'POST') {
      const { id, no, client, client_email, client_address, date, items, paid, exchange_rate } = req.body;
      await db.insert(invoices).values({
        id, no, client, clientEmail: client_email || '', clientAddress: client_address || '',
        date, items: JSON.stringify(items), paid: paid ? 1 : 0, exchangeRate: exchange_rate || 0
      });
      return res.json(req.body);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
