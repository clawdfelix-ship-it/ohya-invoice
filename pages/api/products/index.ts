import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/db';
import { products } from '../../../lib/schema';
import { like } from 'drizzle-orm';

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
        results = await db.select().from(products)
          .where(like(products.name, `%${q}%`))
          .limit(50);
      } else {
        results = await db.select().from(products).orderBy(products.name);
      }
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify(results));
    }

    if (req.method === 'POST') {
      const { id, sku, name, category, cost_jpy, jan, suggested_price_hkd, notes } = req.body;
      if (!name) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        return res.status(400).end(JSON.stringify({ error: 'Product name is required' }));
      }
      await db.insert(products).values({
        id: id || 'PROD-' + Date.now(),
        sku: sku || '',
        name,
        category: category || '',
        costJpy: cost_jpy || 0,
        jan: jan || '',
        suggestedPriceHkd: suggested_price_hkd || 0,
        notes: notes || ''
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
