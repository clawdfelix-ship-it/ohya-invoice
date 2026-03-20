import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/db';
import { invoices } from '../../../lib/schema';
import { eq } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!db) return res.status(500).json({ error: 'Database not configured' });

  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'ID required' });

    if (req.method === 'GET') {
      const result = await db.select().from(invoices).where(eq(invoices.id, id as string)).limit(1);
      if (!result.length) return res.status(404).json({ error: 'Not found' });
      return res.json({ ...result[0], items: JSON.parse(result[0].items || '[]') });
    }

    if (req.method === 'PUT') {
      const { no, client, client_email, client_address, date, items, paid, exchange_rate } = req.body;
      await db.update(invoices).set({
        no, client, clientEmail: client_email || '', clientAddress: client_address || '',
        date, items: JSON.stringify(items), paid: paid ? 1 : 0, exchangeRate: exchange_rate || 0
      }).where(eq(invoices.id, id as string));
      return res.json(req.body);
    }

    if (req.method === 'DELETE') {
      await db.delete(invoices).where(eq(invoices.id, id as string));
      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
