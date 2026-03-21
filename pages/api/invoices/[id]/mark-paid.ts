import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../lib/db';
import { invoices } from '../../../../lib/schema';
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

    if (req.method === 'POST') {
      await db.update(invoices).set({ paid: 1 }).where(eq(invoices.id, id as string));
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
