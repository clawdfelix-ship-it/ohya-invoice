import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/db';
import { records } from '../../../lib/schema';
import { eq } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!db) return res.status(500).json({ error: 'Database not configured' });

  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'ID required' });

    if (req.method === 'DELETE') {
      await db.delete(records).where(eq(records.id, id as string));
      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
