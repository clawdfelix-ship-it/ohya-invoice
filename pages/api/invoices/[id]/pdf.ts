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

    // 創建 PDF 文檔 - A4 尺寸，標準邊距
    const doc = new PDFDocument({ 
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Invoice-${invoice.no}.pdf"`);
    doc.pipe(res);

    const pageWidth = doc.page.width; // 595
    const pageHeight = doc.page.height; // 842
    const maxWidth = pageWidth - 100; // 495 (左右各 50 邊距)

    // ===== 頁眉 =====
    doc.fontSize(24).font('Helvetica-Bold').text('INVOICE', pageWidth - 50 - 100, 50, { 
      width: 100, 
      align: 'right' 
    });
    
    doc.fontSize(10).font('Helvetica').text(`Invoice No: ${invoice.no}`, pageWidth - 50 - 100, 75, { 
      width: 100, 
      align: 'right' 
    });
    doc.text(`Date: ${invoice.date}`, pageWidth - 50 - 100, 88, { 
      width: 100, 
      align: 'right' 
    });
    
    // 分隔線
    doc.moveTo(50, 100).lineTo(pageWidth - 50, 100).strokeColor('#000').lineWidth(1).stroke();

    // ===== 客戶信息 =====
    doc.fontSize(10).font('Helvetica-Bold').text('Bill To:', 50, 120);
    doc.fontSize(10).font('Helvetica').text(invoice.client, 50, 135, { 
      width: maxWidth
    });
    if (invoice.clientEmail) {
      doc.text(invoice.clientEmail, 50, 150, { 
        width: maxWidth
      });
    }
    if (invoice.clientAddress) {
      doc.text(invoice.clientAddress, 50, 165, { 
        width: maxWidth
      });
    }

    // ===== 項目表格 =====
    const tableTop = 200;
    const tableLeft = 50;
    // 欄位寬度總和：300 + 50 + 70 + 75 = 495 = maxWidth
    const colWidths = { desc: 300, qty: 50, price: 70, total: 75 };
    const rowHeight = 20;

    // 表格標題
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#000');
    doc.text('Description', tableLeft, tableTop, { width: colWidths.desc });
    doc.text('Qty', tableLeft + colWidths.desc, tableTop, { width: colWidths.qty, align: 'center' });
    doc.text('Price (HKD)', tableLeft + colWidths.desc + colWidths.qty, tableTop, { width: colWidths.price, align: 'right' });
    doc.text('Total (HKD)', tableLeft + colWidths.desc + colWidths.qty + colWidths.price, tableTop, { width: colWidths.total, align: 'right' });

    // 表格標題底線
    doc.moveTo(tableLeft, tableTop + 15).lineTo(tableLeft + colWidths.desc + colWidths.qty + colWidths.price + colWidths.total, tableTop + 15).strokeColor('#000').lineWidth(1).stroke();

    // 表格內容
    doc.font('Helvetica').fontSize(9).fillColor('#000');
    let yPos = tableTop + 20;

    items.forEach((item: any) => {
      const qty = item.qty || 1;
      const price = item.price || 0;
      const total = qty * price;
      
      doc.text(item.desc || '-', tableLeft, yPos, { 
        width: colWidths.desc
      });
      doc.text(String(qty), tableLeft + colWidths.desc, yPos, { width: colWidths.qty, align: 'center' });
      doc.text(`$${price.toFixed(2)}`, tableLeft + colWidths.desc + colWidths.qty, yPos, { width: colWidths.price, align: 'right' });
      doc.text(`$${total.toFixed(2)}`, tableLeft + colWidths.desc + colWidths.qty + colWidths.price, yPos, { width: colWidths.total, align: 'right' });
      
      yPos += rowHeight;
    });

    // 表格底線
    doc.moveTo(tableLeft, yPos).lineTo(tableLeft + colWidths.desc + colWidths.qty + colWidths.price + colWidths.total, yPos).strokeColor('#000').lineWidth(1).stroke();

    // ===== 總計 =====
    const totalsStartY = yPos + 25;
    const totalsWidth = 200;
    const totalsRight = pageWidth - 50;
    const totalsLeft = totalsRight - totalsWidth;

    doc.font('Helvetica').fontSize(10);
    
    // 總銷售
    doc.fillColor('#000').text(`Total Sales (HKD):`, totalsLeft, totalsStartY, { width: 100, align: 'right' });
    doc.fillColor('#000').text(`$${totalSale.toFixed(2)}`, totalsLeft + 105, totalsStartY, { width: 95, align: 'right' });

    // 總利潤
    doc.font('Helvetica-Bold').text(`Total Profit (HKD):`, totalsLeft, totalsStartY + 20, { width: 100, align: 'right' });
    doc.fillColor('#000').text(`$${totalProfit.toFixed(2)}`, totalsLeft + 105, totalsStartY + 20, { width: 95, align: 'right' });

    // 利潤率
    doc.font('Helvetica').text(`Profit Margin:`, totalsLeft, totalsStartY + 40, { width: 100, align: 'right' });
    doc.fillColor('#000').text(`${margin}%`, totalsLeft + 105, totalsStartY + 40, { width: 95, align: 'right' });

    // 分隔線
    doc.moveTo(totalsLeft, totalsStartY + 55).lineTo(totalsRight, totalsStartY + 55).strokeColor('#000').lineWidth(1).stroke();

    // ===== 付款狀態 =====
    const statusY = totalsStartY + 70;
    const statusWidth = 100;
    const statusHeight = 30;
    const statusX = totalsRight - statusWidth;
    const statusColor = invoice.paid ? '#00d4aa' : '#ff6b6b';
    const statusText = invoice.paid ? 'PAID' : 'UNPAID';
    
    doc.rect(statusX, statusY, statusWidth, statusHeight).fillColor(statusColor);
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(12).text(statusText, statusX, statusY + 8, { width: statusWidth, align: 'center' });

    // ===== 頁腳 =====
    doc.fontSize(9).font('Helvetica').fillColor('#666').text(
      'Thank you for your business!',
      50,
      pageHeight - 50,
      { width: maxWidth, align: 'center' }
    );

    doc.end();

  } catch (err: any) {
    console.error('PDF generation error:', err);
    return res.status(500).json({ error: err.message });
  }
}
