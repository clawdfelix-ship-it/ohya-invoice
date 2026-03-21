import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../lib/db';
import { records, invoices, customers } from '../../lib/schema';
import { desc } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!db) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(500).end(JSON.stringify({ error: 'Database not configured' }));
  }

  try {
    if (req.method === 'GET') {
      const [allRecords, allInvoices, allCustomers] = await Promise.all([
        db.select().from(records),
        db.select().from(invoices),
        db.select().from(customers),
      ]);

      const income = allRecords.filter(r => r.type === 'income').reduce((sum, r) => sum + Number(r.amount), 0);
      const expense = allRecords.filter(r => r.type === 'expense').reduce((sum, r) => sum + Number(r.amount), 0);

      const customerSales: Record<string, number> = {};
      allInvoices.filter(inv => inv.paid).forEach(inv => {
        const items = JSON.parse(inv.items || '[]');
        const total = items.reduce((sum: number, item: any) => sum + (Number(item.qty) * Number(item.price)), 0);
        customerSales[inv.client] = (customerSales[inv.client] || 0) + total;
      });

      const customersWithInvoices = new Set(allInvoices.map(inv => inv.client)).size;

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify({
        income,
        expense,
        balance: income - expense,
        totalCustomers: allCustomers.length,
        customersWithInvoices,
        totalCustomerSales: Object.values(customerSales).reduce((a, b) => a + b, 0),
        unpaidInvoices: allInvoices.filter(inv => !inv.paid).length,
      }));
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(405).end(JSON.stringify({ error: 'Method not allowed' }));
  } catch (err: any) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(500).end(JSON.stringify({ error: err.message }));
  }
}
