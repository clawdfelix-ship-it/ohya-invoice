import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/db';
import { products } from '../../../lib/schema';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!db) return res.status(500).json({ error: 'Database not configured' });

  try {
    if (req.method === 'POST') {
      const { products: prods } = req.body;
      if (!Array.isArray(prods)) return res.status(400).json({ error: 'products array required' });

      for (const p of prods) {
        await db.insert(products).values({
          id: p.id,
          sku: p.sku || '',
          name: p.name,
          category: p.category || '',
          costJpy: p.cost_jpy || 0,
          jan: p.jan || '',
          suggestedPriceHkd: p.suggested_price_hkd || 0,
          notes: p.notes || '',
          updatedAt: new Date()
        }).onConflictDoUpdate({ target: products.id, set: {
          sku: p.sku || '',
          name: p.name,
          category: p.category || '',
          costJpy: p.cost_jpy || 0,
          jan: p.jan || '',
          suggestedPriceHkd: p.suggested_price_hkd || 0,
          notes: p.notes || '',
          updatedAt: new Date()
        }});
      }

      return res.json({ success: true, count: prods.length });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
