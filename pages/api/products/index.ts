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
      const { q, page = '1', limit = '50' } = req.query;
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const offset = (pageNum - 1) * limitNum;
      
      let results;
      let total;
      
      if (q) {
        // 搜尋產品
        results = await db.select().from(products)
          .where(like(products.name, `%${q}%`))
          .limit(limitNum)
          .offset(offset)
          .orderBy(products.name);
        
        // 獲取總數
        const allProducts = await db.select().from(products)
          .where(like(products.name, `%${q}%`));
        total = allProducts.length;
      } else {
        // 獲取所有產品（分頁）
        results = await db.select().from(products)
          .limit(limitNum)
          .offset(offset)
          .orderBy(products.name);
        
        // 獲取總數
        const allProducts = await db.select().from(products);
        total = allProducts.length;
      }
      
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify({ 
        products: results, 
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }));
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
