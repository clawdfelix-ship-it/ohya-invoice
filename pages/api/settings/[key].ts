import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/db';
import { settings } from '../../../lib/schema';
import { eq } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!db) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(500).end(JSON.stringify({ error: 'Database not configured' }));
  }

  try {
    const { key } = req.query;
    if (!key) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.status(400).end(JSON.stringify({ error: 'Key required' }));
    }

    if (req.method === 'GET') {
      const result = await db.select().from(settings).where(eq(settings.key, key as string)).limit(1);
      let value = result.length ? result[0].value : null;
      if (value === null && key === 'exchange_rate') value = '0.052';
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify({ value }));
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(405).end(JSON.stringify({ error: 'Method not allowed' }));
  } catch (err: any) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(500).end(JSON.stringify({ error: err.message }));
  }
}
