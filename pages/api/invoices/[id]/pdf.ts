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

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const contentWidth = pageWidth - 100;

    // ===== 頁眉 - 發票標題 =====
    doc.fontSize(24).font('Helvetica-Bold').text('INVOICE', pageWidth - 50 - 120, 50, { width: 120, align: 'right' });
    
    // 發票編號和日期
    doc.fontSize(10).font('Helvetica').text(`Invoice No: ${invoice.no}`, pageWidth - 50 - 120, 75, { width: 120, align: 'right' });
    doc.text(`Date: ${invoice.date}`, pageWidth - 50 - 120, 88, { width: 120, align: 'right' });
    
    // 分隔線
    doc.moveTo(50, 100).lineTo(pageWidth - 50, 100).strokeColor('#000').lineWidth(1).stroke();

    // ===== 客戶信息 =====
    doc.fontSize(10).font('Helvetica-Bold').text('Bill To:', 50, 120);
    doc.fontSize(10).font('Helvetica').text(invoice.client, 50, 135, { width: 300 });
    if (invoice.clientEmail) {
      doc.text(invoice.clientEmail, 50, 148, { width: 300 });
    }
    if (invoice.clientAddress) {
      doc.text(invoice.clientAddress, 50, 161, { width: 300 });
    }

    // ===== 項目表格 =====
    const tableTop = 220;
    const tableLeft = 40;
    const colWidths = { desc: 280, qty: 60, cost: 90, price: 90, total: 90 };
    const rowHeight = 25;

    // 表格標題背景
    doc.rect(tableLeft, tableTop, contentWidth, rowHeight).fillColor('#f5f5f5');
    
    // 表格標題
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#333');
    doc.text('Description', tableLeft + 5, tableTop + 7, { width: colWidths.desc - 10 });
    doc.text('Qty', tableLeft + colWidths.desc, tableTop + 7, { width: colWidths.qty, align: 'center' });
    doc.text('Cost (JPY)', tableLeft + colWidths.desc + colWidths.qty, tableTop + 7, { width: colWidths.cost - 10, align: 'right' });
    doc.text('Price (HKD)', tableLeft + colWidths.desc + colWidths.qty + colWidths.cost, tableTop + 7, { width: colWidths.price - 10, align: 'right' });
    doc.text('Total (HKD)', tableLeft + colWidths.desc + colWidths.qty + colWidths.cost + colWidths.price, tableTop + 7, { width: colWidths.total - 10, align: 'right' });

    // 表格標題底線
    doc.moveTo(tableLeft, tableTop + rowHeight).lineTo(tableLeft + contentWidth, tableTop + rowHeight).strokeColor('#ddd').lineWidth(1).stroke();

    // 表格內容
    doc.font('Helvetica').fontSize(10);
    let yPos = tableTop + rowHeight;

    items.forEach((item: any, index: number) => {
      const qty = item.qty || 1;
      const costJpy = item.costJpy || 0;
      const price = item.price || 0;
      const total = qty * price;
      const bgColor = index % 2 === 0 ? '#ffffff' : '#fafafa';
      
      // 行背景
      doc.rect(tableLeft, yPos, contentWidth, rowHeight).fillColor(bgColor);
      
      doc.fillColor('#333');
      doc.text(item.desc || '-', tableLeft + 5, yPos + 7, { width: colWidths.desc - 10 });
      doc.text(String(qty), tableLeft + colWidths.desc, yPos + 7, { width: colWidths.qty, align: 'center' });
      doc.text(`¥${costJpy.toLocaleString()}`, tableLeft + colWidths.desc + colWidths.qty, yPos + 7, { width: colWidths.cost - 10, align: 'right' });
      doc.text(`$${price.toFixed(2)}`, tableLeft + colWidths.desc + colWidths.qty + colWidths.cost, yPos + 7, { width: colWidths.price - 10, align: 'right' });
      doc.text(`$${total.toFixed(2)}`, tableLeft + colWidths.desc + colWidths.qty + colWidths.cost + colWidths.price, yPos + 7, { width: colWidths.total - 10, align: 'right' });

      // 行底線
      doc.moveTo(tableLeft, yPos + rowHeight).lineTo(tableLeft + contentWidth, yPos + rowHeight).strokeColor('#eee').lineWidth(1).stroke();
      
      yPos += rowHeight;
    });

    // ===== 總計 =====
    const totalsStartY = yPos + 20;
    const totalsRight = pageWidth - 40;
    const totalsWidth = 250;
    const totalsLeft = totalsRight - totalsWidth;

    doc.font('Helvetica').fontSize(11);
    
    // 總成本
    doc.fillColor('#666').text('Total Cost (JPY):', totalsLeft, totalsStartY, { width: 150, align: 'right' });
    doc.fillColor('#333').text(`¥${totalCostJpy.toLocaleString()}`, totalsLeft + 155, totalsStartY, { width: 95, align: 'right' });

    // 總銷售
    doc.fillColor('#666').text('Total Sales (HKD):', totalsLeft, totalsStartY + 20, { width: 150, align: 'right' });
    doc.fillColor('#333').text(`$${totalSale.toFixed(2)}`, totalsLeft + 155, totalsStartY + 20, { width: 95, align: 'right' });

    // 分隔線
    doc.moveTo(totalsLeft, totalsStartY + 45).lineTo(totalsRight, totalsStartY + 45).strokeColor('#ddd').lineWidth(1).stroke();

    // 總利潤（粗體）
    doc.font('Helvetica-Bold').fillColor('#1a1a2e').text('Total Profit (HKD):', totalsLeft, totalsStartY + 55, { width: 150, align: 'right' });
    doc.fillColor('#00d4aa').text(`$${totalProfit.toFixed(2)}`, totalsLeft + 155, totalsStartY + 55, { width: 95, align: 'right' });

    // 利潤率
    doc.font('Helvetica').fillColor('#666').text('Profit Margin:', totalsLeft, totalsStartY + 75, { width: 150, align: 'right' });
    doc.fillColor('#00d4aa').text(`${margin}%`, totalsLeft + 155, totalsStartY + 75, { width: 95, align: 'right' });

    // ===== 付款狀態 =====
    const statusY = totalsStartY + 110;
    const statusWidth = 120;
    const statusHeight = 35;
    const statusX = totalsRight - statusWidth;
    const statusColor = invoice.paid ? '#00d4aa' : '#ff6b6b';
    const statusText = invoice.paid ? 'PAID' : 'UNPAID';
    
    // 狀態背景矩形
    doc.rect(statusX, statusY, statusWidth, statusHeight).fillColor(statusColor);
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(14).text(statusText, statusX, statusY + 10, { width: statusWidth, align: 'center' });

    // ===== 頁腳 =====
    doc.fontSize(9).font('Helvetica').fillColor('#999').text(
      'Thank you for your business!',
      40,
      pageHeight - 40,
      { width: contentWidth, align: 'center' }
    );

    // 結束 PDF
    doc.end();

  } catch (err: any) {
    console.error('PDF generation error:', err);
    return res.status(500).json({ error: err.message });
  }
}
