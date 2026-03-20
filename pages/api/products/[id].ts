import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/db';
import { products } from '../../../lib/schema';
import { eq } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!db) return res.status(500).json({ error: 'Database not configured' });

  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'ID required' });

    if (req.method === 'GET') {
      const result = await db.select().from(products).where(eq(products.id, id as string)).limit(1);
      if (!result.length) return res.status(404).json({ error: 'Not found' });
      return res.json(result[0]);
    }

    if (req.method === 'PUT') {
      const { sku, name, category, cost_jpy, jan, suggested_price_hkd, notes } = req.body;
      await db.update(products).set({
        sku: sku || '', name, category: category || '',
        costJpy: cost_jpy || 0, jan: jan || '',
        suggestedPriceHkd: suggested_price_hkd || 0, notes: notes || '', updatedAt: new Date()
      }).where(eq(products.id, id as string));
      return res.json({ id, sku, name, category, cost_jpy, jan, suggested_price_hkd, notes });
    }

    if (req.method === 'DELETE') {
      await db.delete(products).where(eq(products.id, id as string));
      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
