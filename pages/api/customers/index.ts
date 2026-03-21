import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/db';
import { customers } from '../../../lib/schema';
import { eq, like, sql } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!db) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(500).end(JSON.stringify({ error: 'Database not configured' }));
  }

  try {
    if (req.method === 'GET') {
      const { q } = req.query;
      let results;
      if (q) {
        results = await db.select().from(customers)
          .where(like(customers.name, `%${q}%`))
          .limit(10);
      } else {
        results = await db.select().from(customers).orderBy(customers.name);
      }
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify(results));
    }

    if (req.method === 'POST') {
      const { id, name, phone, email, company, address, notes } = req.body;
      await db.insert(customers).values({ id, name, phone: phone || '', email: email || '', company: company || '', address: address || '', notes: notes || '' });
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify({ id, name, phone, email, company, address, notes }));
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(405).end(JSON.stringify({ error: 'Method not allowed' }));
  } catch (err: any) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(500).end(JSON.stringify({ error: err.message }));
  }
}
