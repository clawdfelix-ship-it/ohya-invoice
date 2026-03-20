import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/db';
import { products } from '../../../lib/schema';
import { eq, or, like, desc } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!db) return res.status(500).json({ error: 'Database not configured' });

  try {
    if (req.method === 'GET') {
      const { q } = req.query;
      let results;
      if (q) {
        const all = await db.select().from(products).orderBy(products.name);
        const search = (q as string).toLowerCase();
        results = all.filter(p =>
          p.name.toLowerCase().includes(search) ||
          (p.sku && p.sku.toLowerCase().includes(search)) ||
          (p.jan && p.jan.toLowerCase().includes(search))
        ).slice(0, 20);
      } else {
        results = await db.select().from(products).orderBy(products.name);
      }
      return res.json(results);
    }

    if (req.method === 'POST') {
      const { id, sku, name, category, cost_jpy, jan, suggested_price_hkd, notes } = req.body;
      await db.insert(products).values({
        id, sku: sku || '', name, category: category || '',
        costJpy: cost_jpy || 0, jan: jan || '',
        suggestedPriceHkd: suggested_price_hkd || 0, notes: notes || ''
      });
      return res.json(req.body);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
