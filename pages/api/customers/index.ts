import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/db';
import { customers } from '../../../lib/schema';
import { eq, like, sql } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!db) return res.status(500).json({ error: 'Database not configured' });

  try {
    if (req.method === 'GET') {
      const { q } = req.query;
      if (q) {
        const results = await db.select().from(customers)
          .where(like(customers.name, `%${q}%`))
          .limit(10);
        return res.json(results);
      }
      const results = await db.select().from(customers).orderBy(customers.name);
      return res.json(results);
    }

    if (req.method === 'POST') {
      const { id, name, phone, email, company, address, notes } = req.body;
      await db.insert(customers).values({ id, name, phone: phone || '', email: email || '', company: company || '', address: address || '', notes: notes || '' });
      return res.json({ id, name, phone, email, company, address, notes });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
