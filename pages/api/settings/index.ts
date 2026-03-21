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
    if (req.method === 'POST') {
      const { key, value } = req.body;
      if (!key) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        return res.status(400).end(JSON.stringify({ error: 'Key required' }));
      }
      await db.insert(settings).values({ key, value })
        .onConflictDoUpdate({ target: settings.key, set: { value } });
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
