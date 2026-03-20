import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/db';
import { settings } from '../../../lib/schema';
import { eq } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!db) return res.status(500).json({ error: 'Database not configured' });

  try {
    const { key } = req.query;
    if (!key) return res.status(400).json({ error: 'Key required' });

    if (req.method === 'GET') {
      const result = await db.select().from(settings).where(eq(settings.key, key as string)).limit(1);
      let value = result.length ? result[0].value : null;
      // Default exchange rate
      if (value === null && key === 'exchange_rate') value = '0.052';
      return res.json({ value });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
