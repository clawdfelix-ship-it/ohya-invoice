import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/db';
import { invoices } from '../../../lib/schema';
import { eq } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!db) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(500).end(JSON.stringify({ error: 'Database not configured' }));
  }

  try {
    const { id } = req.query;
    if (!id) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.status(400).end(JSON.stringify({ error: 'ID required' }));
    }

    if (req.method === 'GET') {
      const result = await db.select().from(invoices).where(eq(invoices.id, id as string)).limit(1);
      if (!result.length) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        return res.status(404).end(JSON.stringify({ error: 'Not found' }));
      }
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify({ ...result[0], items: JSON.parse(result[0].items || '[]') }));
    }

    if (req.method === 'PUT') {
      const { no, client, client_email, client_address, date, items, paid, exchange_rate, margin } = req.body;
      await db.update(invoices).set({
        no, client, clientEmail: client_email || '', clientAddress: client_address || '',
        date, items: JSON.stringify(items), paid: paid ? 1 : 0, 
        exchangeRate: exchange_rate || 0, margin: margin || 0
      }).where(eq(invoices.id, id as string));
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify(req.body));
    }

    if (req.method === 'POST') {
      // Support mark-paid action: POST /api/invoices/[id]?action=mark-paid
      const { action } = req.query;
      if (action === 'mark-paid') {
        await db.update(invoices).set({ paid: 1 })
          .where(eq(invoices.id, id as string));
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        return res.end(JSON.stringify({ success: true }));
      }
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.status(405).end(JSON.stringify({ error: 'Method not allowed' }));
    }

    if (req.method === 'DELETE') {
      await db.delete(invoices).where(eq(invoices.id, id as string));
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify({ success: true }));
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(405).end(JSON.stringify({ error: 'Method not allowed' }));
  } catch (err: any) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(500).end(JSON.stringify({ error: err.message }));
  }
}
