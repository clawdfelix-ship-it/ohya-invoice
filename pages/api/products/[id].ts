import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/db';
import { products } from '../../../lib/schema';
import { eq } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!db) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(500).end(JSON.stringify({ error: 'Database not configured' }));
  }

  try {
    const { id } = req.query;
    if (!id) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.status(400).end(JSON.stringify({ error: 'ID required' }));
    }

    if (req.method === 'GET') {
      const result = await db.select().from(products).where(eq(products.id, id as string)).limit(1);
      if (!result.length) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        return res.status(404).end(JSON.stringify({ error: 'Not found' }));
      }
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify(result[0]));
    }

    if (req.method === 'PUT') {
      const { sku, name, category, cost_jpy, jan, suggested_price_hkd, notes } = req.body;
      if (!name) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        return res.status(400).end(JSON.stringify({ error: 'Product name is required' }));
      }
      await db.update(products).set({
        sku: sku || '',
        name,
        category: category || '',
        costJpy: cost_jpy || 0,
        jan: jan || '',
        suggestedPriceHkd: suggested_price_hkd || 0,
        notes: notes || '',
        updatedAt: new Date()
      }).where(eq(products.id, id as string));
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify(req.body));
    }

    if (req.method === 'DELETE') {
      await db.delete(products).where(eq(products.id, id as string));
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify({ success: true }));
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(405).end(JSON.stringify({ error: 'Method not allowed' }));
  } catch (err: any) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(500).end(JSON.stringify({ error: err.message }));
  }
}
