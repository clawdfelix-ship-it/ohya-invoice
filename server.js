const express = require('express');
const cors = require('cors');
const path = require('path');
const { customerOps, invoiceOps, recordOps, settingsOps } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ============ CUSTOMERS API ============
app.get('/api/customers', (req, res) => {
  try {
    const { q } = req.query;
    const customers = q ? customerOps.search(q) : customerOps.getAll();
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/customers/:id', (req, res) => {
  try {
    const customer = customerOps.getById(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Not found' });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/customers', (req, res) => {
  try {
    const customer = customerOps.create(req.body);
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/customers/:id', (req, res) => {
  try {
    res.json(customerOps.update({ ...req.body, id: req.params.id }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/customers/:id', (req, res) => {
  try {
    customerOps.delete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ INVOICES API ============
app.get('/api/invoices', (req, res) => {
  try {
    const invoices = invoiceOps.getAll();
    // Parse items JSON for each invoice
    res.json(invoices.map(inv => ({ ...inv, items: JSON.parse(inv.items || '[]') })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/invoices/:id', (req, res) => {
  try {
    const invoice = invoiceOps.getById(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Not found' });
    res.json({ ...invoice, items: JSON.parse(invoice.items || '[]') });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/invoices', (req, res) => {
  try {
    const invoice = invoiceOps.create(req.body);
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/invoices/:id', (req, res) => {
  try {
    res.json(invoiceOps.update({ ...req.body, id: req.params.id }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/invoices/:id', (req, res) => {
  try {
    invoiceOps.delete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/invoices/:id/mark-paid', (req, res) => {
  try {
    invoiceOps.markPaid(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ RECORDS API ============
app.get('/api/records', (req, res) => {
  try {
    const { start, end } = req.query;
    const records = (start && end) ? recordOps.getByDateRange(start, end) : recordOps.getAll();
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/records', (req, res) => {
  try {
    const record = recordOps.create(req.body);
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/records/:id', (req, res) => {
  try {
    recordOps.delete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ SETTINGS API ============
app.get('/api/settings/:key', (req, res) => {
  try {
    res.json({ value: settingsOps.get(req.params.key) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings', (req, res) => {
  try {
    settingsOps.set(req.body.key, req.body.value);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ STATS API ============
app.get('/api/stats', (req, res) => {
  try {
    const records = recordOps.getAll();
    const invoices = invoiceOps.getAll();
    const customers = customerOps.getAll();
    
    const income = records.filter(r => r.type === 'income').reduce((sum, r) => sum + Number(r.amount), 0);
    const expense = records.filter(r => r.type === 'expense').reduce((sum, r) => sum + Number(r.amount), 0);
    
    // Calculate total sales per customer from paid invoices
    const customerSales = {};
    invoices.filter(inv => inv.paid).forEach(inv => {
      const items = JSON.parse(inv.items || '[]');
      const total = items.reduce((sum, item) => sum + (Number(item.qty) * Number(item.price)), 0);
      customerSales[inv.client] = (customerSales[inv.client] || 0) + total;
    });
    
    const customersWithInvoices = new Set(invoices.map(inv => inv.client)).size;
    
    res.json({
      income,
      expense,
      balance: income - expense,
      totalCustomers: customers.length,
      customersWithInvoices,
      totalCustomerSales: Object.values(customerSales).reduce((a, b) => a + b, 0),
      unpaidInvoices: invoices.filter(inv => !inv.paid).length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`💼 OHA Invoice App running on port ${PORT}`);
});
