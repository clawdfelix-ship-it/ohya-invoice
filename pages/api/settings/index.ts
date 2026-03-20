import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/db';
import { settings } from '../../../lib/schema';
import { eq } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!db) return res.status(500).json({ error: 'Database not configured' });

  try {
    if (req.method === 'POST') {
      const { key, value } = req.body;
      if (!key) return res.status(400).json({ error: 'Key required' });
      await db.insert(settings).values({ key, value })
        .onConflictDoUpdate({ target: settings.key, set: { value } });
      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
