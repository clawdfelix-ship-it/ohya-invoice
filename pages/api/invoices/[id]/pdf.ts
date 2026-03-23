import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../lib/db';
import { invoices } from '../../../../lib/schema';
import { eq } from 'drizzle-orm';
import PDFDocument from 'pdfkit';

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!db) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'Invoice ID required' });
    }

    // 獲取發票數據
    const result = await db.select().from(invoices).where(eq(invoices.id, id as string)).limit(1);
    
    if (!result.length) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = result[0];
    const items = JSON.parse(invoice.items || '[]');

    // 計算總額
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

    // 創建 PDF 文檔
    const doc = new PDFDocument({ 
      size: 'A4', 
      margins: { top: 50, bottom: 50, left: 50, right: 50 } 
    });

    // 設置響應頭
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Invoice-${invoice.no}.pdf"`);

    // 將 PDF 流式傳輸到響應
    doc.pipe(res);

    // ===== 頁眉 =====
    doc.fontSize(24).font('Helvetica-Bold').text('INVOICE', { align: 'right' });
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica').text(`Invoice No: ${invoice.no}`, { align: 'right' });
    doc.text(`Date: ${invoice.date}`, { align: 'right' });
    
    doc.moveDown(2);

    // ===== 客戶信息 =====
    doc.fontSize(14).font('Helvetica-Bold').text('Bill To:', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica').text(invoice.client);
    if (invoice.clientEmail) {
      doc.text(invoice.clientEmail);
    }
    if (invoice.clientAddress) {
      doc.text(invoice.clientAddress);
    }
    
    doc.moveDown(2);

    // ===== 項目表格 =====
    const tableTop = doc.y;
    const tableLeft = 50;
    const colWidths = { desc: 250, qty: 60, cost: 80, price: 80, total: 80 };

    // 表格標題
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text('Description', tableLeft, tableTop, { width: colWidths.desc });
    doc.text('Qty', tableLeft + colWidths.desc, tableTop, { width: colWidths.qty, align: 'center' });
    doc.text('Cost (JPY)', tableLeft + colWidths.desc + colWidths.qty, tableTop, { width: colWidths.cost, align: 'right' });
    doc.text('Price (HKD)', tableLeft + colWidths.desc + colWidths.qty + colWidths.cost, tableTop, { width: colWidths.price, align: 'right' });
    doc.text('Total (HKD)', tableLeft + colWidths.desc + colWidths.qty + colWidths.cost + colWidths.price, tableTop, { width: colWidths.total, align: 'right' });

    // 表格標題底線
    doc.moveTo(tableLeft, tableTop + 15)
       .lineTo(tableLeft + Object.values(colWidths).reduce((a, b) => a + b, 0), tableTop + 15)
       .stroke();

    // 表格內容
    doc.font('Helvetica').fontSize(10);
    let yPos = tableTop + 25;

    items.forEach((item: any) => {
      const qty = item.qty || 1;
      const costJpy = item.costJpy || 0;
      const price = item.price || 0;
      const total = qty * price;

      doc.text(item.desc || '-', tableLeft, yPos, { width: colWidths.desc });
      doc.text(String(qty), tableLeft + colWidths.desc, yPos, { width: colWidths.qty, align: 'center' });
      doc.text(`¥${costJpy.toLocaleString()}`, tableLeft + colWidths.desc + colWidths.qty, yPos, { width: colWidths.cost, align: 'right' });
      doc.text(`$${price.toFixed(2)}`, tableLeft + colWidths.desc + colWidths.qty + colWidths.cost, yPos, { width: colWidths.price, align: 'right' });
      doc.text(`$${total.toFixed(2)}`, tableLeft + colWidths.desc + colWidths.qty + colWidths.cost + colWidths.price, yPos, { width: colWidths.total, align: 'right' });

      yPos += 20;
    });

    // 表格底線
    doc.moveTo(tableLeft, yPos)
       .lineTo(tableLeft + Object.values(colWidths).reduce((a, b) => a + b, 0), yPos)
       .stroke();

    // ===== 總計 =====
    doc.moveDown(1);
    const totalsRight = tableLeft + Object.values(colWidths).reduce((a, b) => a + b, 0);
    
    doc.font('Helvetica').fontSize(11);
    doc.text('Total Cost (JPY):', totalsRight - colWidths.total - colWidths.price, yPos + 10, { width: colWidths.desc + colWidths.qty + colWidths.cost, align: 'right' });
    doc.text(`¥${totalCostJpy.toLocaleString()}`, totalsRight - colWidths.total, yPos + 10, { width: colWidths.price, align: 'right' });

    doc.text('Total Sales (HKD):', totalsRight - colWidths.total - colWidths.price, yPos + 30, { width: colWidths.desc + colWidths.qty + colWidths.cost, align: 'right' });
    doc.text(`$${totalSale.toFixed(2)}`, totalsRight - colWidths.total, yPos + 30, { width: colWidths.price, align: 'right' });

    doc.font('Helvetica-Bold').text('Total Profit (HKD):', totalsRight - colWidths.total - colWidths.price, yPos + 50, { width: colWidths.desc + colWidths.qty + colWidths.cost, align: 'right' });
    doc.text(`$${totalProfit.toFixed(2)}`, totalsRight - colWidths.total, yPos + 50, { width: colWidths.price, align: 'right' });

    doc.text(`Profit Margin: ${margin}%`, totalsRight - colWidths.total - colWidths.price, yPos + 70, { width: colWidths.desc + colWidths.qty + colWidths.cost, align: 'right' });

    // ===== 付款狀態 =====
    doc.moveDown(2);
    const statusY = doc.y;
    const statusColor = invoice.paid ? '#00d4aa' : '#ff6b6b';
    const statusText = invoice.paid ? 'PAID' : 'UNPAID';
    
    doc.rect(totalsRight - 100, statusY, 100, 30);
    doc.fillColor(statusColor).fill();
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(14).text(statusText, totalsRight - 100, statusY + 8, { width: 100, align: 'center' });

    // ===== 頁腳 =====
    const pageHeight = doc.page.height;
    doc.fontSize(9).font('Helvetica').fillColor('#666').text(
      'Thank you for your business!',
      50,
      pageHeight - 50,
      { width: 500, align: 'center' }
    );

    // 結束 PDF
    doc.end();

  } catch (err: any) {
    console.error('PDF generation error:', err);
    return res.status(500).json({ error: err.message });
  }
}
