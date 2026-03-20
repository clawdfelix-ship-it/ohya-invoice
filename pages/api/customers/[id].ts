import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/db';
import { customers } from '../../../lib/schema';
import { eq } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!db) return res.status(500).json({ error: 'Database not configured' });

  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'ID required' });

    if (req.method === 'GET') {
      const result = await db.select().from(customers).where(eq(customers.id, id as string)).limit(1);
      if (!result.length) return res.status(404).json({ error: 'Not found' });
      return res.json(result[0]);
    }

    if (req.method === 'PUT') {
      const { name, phone, email, company, address, notes } = req.body;
      await db.update(customers).set({ name, phone: phone || '', email: email || '', company: company || '', address: address || '', notes: notes || '', updatedAt: new Date() })
        .where(eq(customers.id, id as string));
      return res.json({ id, name, phone, email, company, address, notes });
    }

    if (req.method === 'DELETE') {
      await db.delete(customers).where(eq(customers.id, id as string));
      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
