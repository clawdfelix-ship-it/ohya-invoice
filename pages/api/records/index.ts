import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/db';
import { records } from '../../../lib/schema';
import { eq, desc } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!db) return res.status(500).json({ error: 'Database not configured' });

  try {
    if (req.method === 'GET') {
      const { start, end } = req.query;
      if (start && end) {
        const results = await db.select().from(records)
          .orderBy(desc(records.date));
        const filtered = results.filter(r => r.date >= (start as string) && r.date <= (end as string));
        return res.json(filtered);
      }
      const results = await db.select().from(records).orderBy(desc(records.date));
      return res.json(results);
    }

    if (req.method === 'POST') {
      const { id, date, description, type, amount } = req.body;
      await db.insert(records).values({ id, date, description, type, amount });
      return res.json({ id, date, description, type, amount });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
