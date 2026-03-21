import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/db';
import { customers } from '../../../lib/schema';
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
      const result = await db.select().from(customers).where(eq(customers.id, id as string)).limit(1);
      if (!result.length) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        return res.status(404).end(JSON.stringify({ error: 'Not found' }));
      }
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify(result[0]));
    }

    if (req.method === 'PUT') {
      const { name, phone, email, company, address, notes } = req.body;
      await db.update(customers).set({ name, phone: phone || '', email: email || '', company: company || '', address: address || '', notes: notes || '', updatedAt: new Date() })
        .where(eq(customers.id, id as string));
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify({ id, name, phone, email, company, address, notes }));
    }

    if (req.method === 'DELETE') {
      await db.delete(customers).where(eq(customers.id, id as string));
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
