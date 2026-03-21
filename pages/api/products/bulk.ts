import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/db';
import { products } from '../../../lib/schema';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!db) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(500).end(JSON.stringify({ error: 'Database not configured' }));
  }

  try {
    if (req.method === 'POST') {
      const { products: prods } = req.body;
      if (!Array.isArray(prods)) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        return res.status(400).end(JSON.stringify({ error: 'products array required' }));
      }

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

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify({ success: true, count: prods.length }));
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(405).end(JSON.stringify({ error: 'Method not allowed' }));
  } catch (err: any) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(500).end(JSON.stringify({ error: err.message }));
  }
}
