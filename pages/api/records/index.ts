import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/db';
import { records } from '../../../lib/schema';
import { eq, desc } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!db) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(500).end(JSON.stringify({ error: 'Database not configured' }));
  }

  try {
    if (req.method === 'GET') {
      const { start, end } = req.query;
      let results = await db.select().from(records).orderBy(desc(records.date));
      if (start && end) {
        results = results.filter(r => r.date >= (start as string) && r.date <= (end as string));
      }
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify(results));
    }

    if (req.method === 'POST') {
      const { id, date, description, type, amount } = req.body;
      await db.insert(records).values({ id, date, description, type, amount });
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify({ id, date, description, type, amount }));
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(405).end(JSON.stringify({ error: 'Method not allowed' }));
  } catch (err: any) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(500).end(JSON.stringify({ error: err.message }));
  }
}
