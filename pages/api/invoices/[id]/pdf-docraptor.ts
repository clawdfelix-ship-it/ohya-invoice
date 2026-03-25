import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../lib/db';
import { invoices } from '../../../../lib/schema';
import { eq } from 'drizzle-orm';
import DocRaptor from 'docraptor';

// 初始化 DocRaptor
const docraptor = new DocRaptor({
  apiKey: process.env.DOCRAPTER_API_KEY || '',
  test: process.env.NODE_ENV === 'development', // 開發環境使用測試模式
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!db) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  if (!process.env.DOCRAPTER_API_KEY) {
    return res.status(500).json({ 
      error: 'DocRaptor API Key not configured',
      message: '請在 Vercel 環境變數中設置 DOCRAPTER_API_KEY'
    });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'Invoice ID required' });
    }

    const result = await db.select().from(invoices).where(eq(invoices.id, id as string)).limit(1);
    
    if (!result.length) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = result[0];
    const items = JSON.parse(invoice.items || '[]');

    const rate = invoice.exchangeRate || 0.052;
    let totalSale = 0;
    let totalCostJpy = 0;
    
    items.forEach((item: any) => {
      const qty = item.qty || 1;
      const costJpy = item.costJpy || 0;
      const sale = qty * (item.price || 0);
      totalSale += sale;
      totalCostJpy += costJpy * qty;
    });

    const totalProfit = totalSale - (totalCostJpy * rate);
    const margin = totalSale > 0 ? (totalProfit / totalSale * 100).toFixed(1) : '0';

    // 生成 HTML 內容（支持日文/中文）
    const htmlContent = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: "Noto Sans JP", "Hiragino Kaku Gothic ProN", "メイリオ", sans-serif; padding: 40px; color: #333; }
    .header { text-align: right; margin-bottom: 40px; }
    .header h1 { font-size: 32px; margin: 0 0 10px 0; color: #1a1a2e; }
    .invoice-info { font-size: 14px; color: #666; line-height: 1.8; }
    .bill-to { margin-bottom: 30px; }
    .bill-to h2 { font-size: 16px; margin: 0 0 10px 0; color: #1a1a2e; border-bottom: 2px solid #1a1a2e; padding-bottom: 5px; }
    .bill-to p { margin: 5px 0; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin: 30px 0; }
    th { background: #f5f5f5; padding: 12px 8px; text-align: left; font-size: 13px; font-weight: 600; border-bottom: 2px solid #333; }
    td { padding: 12px 8px; font-size: 13px; border-bottom: 1px solid #eee; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .totals { margin-top: 30px; text-align: right; }
    .totals table { width: 250px; margin-left: auto; }
    .totals td { padding: 8px; border: none; }
    .totals .label { color: #666; font-weight: 600; }
    .totals .value { font-weight: 700; color: #1a1a2e; }
    .totals .total { border-top: 2px solid #333; font-size: 16px; }
    .status { display: inline-block; padding: 8px 24px; border-radius: 20px; color: #fff; font-weight: 700; font-size: 14px; margin-top: 20px; }
    .status.paid { background: #00d4aa; }
    .status.unpaid { background: #ff6b6b; }
    .footer { text-align: center; margin-top: 50px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>INVOICE</h1>
    <div class="invoice-info">
      <div>Invoice No: ${invoice.no}</div>
      <div>Date: ${invoice.date}</div>
    </div>
  </div>

  <div class="bill-to">
    <h2>Bill To</h2>
    <p><strong>${invoice.client}</strong></p>
    ${invoice.clientEmail ? `<p>${invoice.clientEmail}</p>` : ''}
    ${invoice.clientAddress ? `<p>${invoice.clientAddress}</p>` : ''}
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 50%;">Description</th>
        <th class="text-center">Qty</th>
        <th class="text-right">Price (HKD)</th>
        <th class="text-right">Total (HKD)</th>
      </tr>
    </thead>
    <tbody>
      ${items.map((item: any) => `
      <tr>
        <td>${item.desc || '-'}</td>
        <td class="text-center">${item.qty || 1}</td>
        <td class="text-right">$${(item.price || 0).toFixed(2)}</td>
        <td class="text-right">$${((item.qty || 1) * (item.price || 0)).toFixed(2)}</td>
      </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="totals">
    <table>
      <tr>
        <td class="label">Total Cost (JPY):</td>
        <td class="value">¥${totalCostJpy.toLocaleString()}</td>
      </tr>
      <tr>
        <td class="label">Total Sales (HKD):</td>
        <td class="value">$${totalSale.toFixed(2)}</td>
      </tr>
      <tr class="total">
        <td class="label">Total Profit (HKD):</td>
        <td class="value" style="color: #00d4aa;">$${totalProfit.toFixed(2)}</td>
      </tr>
      <tr>
        <td class="label">Profit Margin:</td>
        <td class="value" style="color: #00d4aa;">${margin}%</td>
      </tr>
    </table>
  </div>

  <div style="text-align: right;">
    <span class="status ${invoice.paid ? 'paid' : 'unpaid'}">
      ${invoice.paid ? 'PAID' : 'UNPAID'}
    </span>
  </div>

  <div class="footer">
    Thank you for your business!
  </div>
</body>
</html>
    `;

    // 使用 DocRaptor 生成 PDF
    const response = await docraptor.createDoc({
      type: 'pdf',
      content: htmlContent,
      name: `Invoice-${invoice.no}.pdf`,
      javascript: true,
      strict: false,
    });

    // 返回 PDF URL（DocRaptor 會返回一個下載連結）
    res.setHeader('Content-Type', 'application/json');
    res.json({ 
      success: true,
      downloadUrl: response.download_url,
      invoiceNo: invoice.no
    });

  } catch (err: any) {
    console.error('DocRaptor PDF generation error:', err);
    return res.status(500).json({ 
      error: 'Failed to generate PDF',
      message: err.message 
    });
  }
}
