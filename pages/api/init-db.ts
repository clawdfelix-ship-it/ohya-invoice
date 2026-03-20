import type { NextApiRequest, NextApiResponse } from 'next';
import { initializeDatabase } from '../../lib/migrations';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await initializeDatabase();
    return res.json({ success: true, message: 'Database initialized successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
