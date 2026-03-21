import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/db';
import { products } from '../../../lib/schema';
import { eq, or, like, desc } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!db) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(500).end(JSON.stringify({ error: 'Database not configured' }));
  }

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
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify(results));
    }

    if (req.method === 'POST') {
      const { id, sku, name, category, cost_jpy, jan, suggested_price_hkd, notes } = req.body;
      await db.insert(products).values({
        id, sku: sku || '', name, category: category || '',
        costJpy: cost_jpy || 0, jan: jan || '',
        suggestedPriceHkd: suggested_price_hkd || 0, notes: notes || ''
      });
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify(req.body));
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(405).end(JSON.stringify({ error: 'Method not allowed' }));
  } catch (err: any) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(500).end(JSON.stringify({ error: err.message }));
  }
}
