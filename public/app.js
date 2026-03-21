const API = '';
let customers = [], invoices = [], records = [], products = [], stats = {};
let editingCustomerId = null;
let invItems = [];

// 确保 DOM 加载完成后绑定事件
document.addEventListener('DOMContentLoaded', function() {
  console.log('✅ App initialized');
  // 重新绑定 Tab 点击事件
  document.querySelectorAll('.tab').forEach(t => {
    t.addEventListener('click', function() {
      console.log('🖱️ Tab clicked:', this.dataset.view);
      showView(this.dataset.view);
    });
  });
});

async function api(path, options = {}) {
  const res = await fetch(API + path, options);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function loadData() {
  [customers, invoices, records, stats] = await Promise.all([
    api('/api/customers'),
    api('/api/invoices'),
    api('/api/records'),
    api('/api/stats')
  ]);
}

function showView(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.tab[data-view="${name}"]`).classList.add('active');
  document.querySelectorAll('[id^="view-"]').forEach(v => v.style.display = 'none');
  document.getElementById(`view-${name}`).style.display = 'block';
  if (name === 'dashboard') renderDashboard();
  else if (name === 'customers') renderCustomers();
  else if (name === 'invoices') renderInvoices();
  else if (name === 'records') renderRecords();
  else if (name === 'products') renderProducts();
}

// Tab 点击事件已在 DOMContentLoaded 中绑定，避免重复绑定

function openModal(name) { document.getElementById(`modal-${name}`).classList.add('active'); }
function closeModal(name) { document.getElementById(`modal-${name}`).classList.remove('active'); }
document.querySelectorAll('.modal').forEach(m => m.addEventListener('click', e => { if (e.target === m) m.classList.remove('active'); }));

// Dashboard
function renderDashboard() {
  const dv = document.getElementById('view-dashboard');
  const unpaid = invoices.filter(i => !i.paid);
  dv.innerHTML = `
    <div class="stats">
      <div class="stat income"><div class="label">總收入</div><div class="value">$${stats.income?.toLocaleString() || 0}</div></div>
      <div class="stat expense"><div class="label">總支出</div><div class="value">$${stats.expense?.toLocaleString() || 0}</div></div>
      <div class="stat balance"><div class="label">結餘</div><div class="value">$${(stats.balance || 0).toLocaleString()}</div></div>
    </div>
    <div class="card">
      <h2>📄 未付款發票 (${unpaid.length})</h2>
      ${unpaid.length ? unpaid.map(i => `
        <div class="list-item">
          <div class="list-item-info">
            <h3>${i.client} - ${i.no}</h3>
            <p>${i.date} | ${i.items?.length || 0} 項目</p>
          </div>
          <div class="list-item-actions">
            <span class="status unpaid">未付 $${(i.items?.reduce((s,it) => s + it.qty * it.price, 0) || 0).toLocaleString()}</span>
            <button class="btn btn-primary btn-sm" onclick="markInvoicePaid('${i.id}')">設為已付</button>
          </div>
        </div>`).join('') : '<div class="empty">沒有未付款發票 🎉</div>'}
    </div>`;
}

// Customers
function renderCustomers() {
  const cv = document.getElementById('view-customers');
  cv.innerHTML = `
    <div class="stats">
      <div class="stat"><div class="label">總客戶數</div><div class="value" style="color:#00d4aa">${customers.length}</div></div>
      <div class="stat"><div class="label">有發票的客戶</div><div class="value" style="color:#4ecdc4">${stats.customersWithInvoices || 0}</div></div>
      <div class="stat"><div class="label">總銷售額</div><div class="value" style="color:#00d4aa">$${(stats.totalCustomerSales || 0).toLocaleString()}</div></div>
    </div>
    <div class="card">
      <div class="card-header">
        <h2>客戶列表</h2>
        <div style="display:flex;gap:8px">
          <input type="text" class="search-input" placeholder="🔍 搜尋客戶..." oninput="filterCustomers(this.value)">
          <button class="btn btn-primary" onclick="openNewCustomer()">+ 新增客戶</button>
        </div>
      </div>
      <div id="customers-list"></div>
    </div>`;
  renderCustomersList(customers);
}

function renderCustomersList(list) {
  const el = document.getElementById('customers-list');
  if (!list.length) { el.innerHTML = '<div class="empty">暫時沒有客戶</div>'; return; }
  el.innerHTML = list.map(c => `
    <div class="list-item">
      <div class="list-item-info">
        <h3>${c.name}</h3>
        <p>${c.company || ''} ${c.phone ? '| ' + c.phone : ''} ${c.email ? '| ' + c.email : ''}</p>
      </div>
      <div class="list-item-actions">
        <button class="btn btn-primary btn-sm" onclick="quickInvoice('${c.name}','${c.email || ''}','${c.address || ''}')">開單</button>
        <button class="btn btn-secondary btn-sm" onclick="editCustomer('${c.id}')">編輯</button>
        <button class="btn btn-danger btn-sm" onclick="deleteCustomer('${c.id}')">刪除</button>
      </div>
    </div>`).join('');
}

function filterCustomers(q) {
  const filtered = customers.filter(c => c.name.toLowerCase().includes(q.toLowerCase()) || (c.company || '').toLowerCase().includes(q.toLowerCase()));
  renderCustomersList(filtered);
}

function openNewCustomer() { editingCustomerId = null; document.getElementById('customer-modal-title').textContent = '👤 新增客戶'; ['name','phone','email','company','address','notes'].forEach(f => document.getElementById('cust-' + f).value = ''); openModal('customer'); }
function editCustomer(id) {
  const c = customers.find(x => x.id === id); if (!c) return;
  editingCustomerId = id; document.getElementById('customer-modal-title').textContent = '✏️ 編輯客戶';
  ['name','phone','email','company','address','notes'].forEach(f => document.getElementById('cust-' + f).value = c[f] || ''); openModal('customer');
}

async function saveCustomer() {
  const name = document.getElementById('cust-name').value.trim();
  if (!name) { alert('請輸入客戶名稱'); return; }
  const c = { id: editingCustomerId || 'CUST-' + Date.now(), name, phone: document.getElementById('cust-phone').value.trim(), email: document.getElementById('cust-email').value.trim(), company: document.getElementById('cust-company').value.trim(), address: document.getElementById('cust-address').value.trim(), notes: document.getElementById('cust-notes').value.trim() };
  if (editingCustomerId) { await api('/api/customers/' + editingCustomerId, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(c) }); }
  else { await api('/api/customers', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(c) }); }
  closeModal('customer'); await loadData(); renderCustomers();
}

async function deleteCustomer(id) { if (!confirm('確定刪除這個客戶？')) return; await api('/api/customers/' + id, { method: 'DELETE' }); await loadData(); renderCustomers(); }

function showCustomerSuggestions(val) {
  const box = document.getElementById('inv-client-suggestions');
  if (!val || val.length < 1) { box.classList.remove('show'); return; }
  const matches = customers.filter(c => c.name.toLowerCase().includes(val.toLowerCase())).slice(0, 5);
  if (!matches.length) { box.classList.remove('show'); return; }
  box.innerHTML = matches.map(c => `<div class="suggestion-item" onclick="selectCustomer('${c.name.replace(/'/g,"\\'")}','${(c.email||'').replace(/'/g,"\\'")}','${(c.address||'').replace(/'/g,"\\'")}')">${c.name} <small>${c.company||''}</small></div>`).join('');
  box.classList.add('show');
}
function selectCustomer(name, email, address) { document.getElementById('inv-client').value = name; document.getElementById('inv-email').value = email; document.getElementById('inv-address').value = address; document.getElementById('inv-client-suggestions').classList.remove('show'); }
document.addEventListener('click', e => { if (!e.target.closest('.search-wrap')) document.getElementById('inv-client-suggestions').classList.remove('show'); });

// Invoices
function renderInvoices() {
  const iv = document.getElementById('view-invoices');
  iv.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h2>發票列表 (${invoices.length})</h2>
        <button class="btn btn-primary" onclick="openNewInvoice()">+ 新增發票</button>
      </div>
      ${invoices.length ? invoices.map(i => {
        const total = i.items?.reduce((s,it) => s + it.qty * it.price, 0) || 0;
        return `<div class="list-item">
          <div class="list-item-info">
            <h3>${i.client} - ${i.no}</h3>
            <p>${i.date} | ${i.items?.length || 0} 項目 | $${total.toLocaleString()}</p>
          </div>
          <div class="list-item-actions">
            <span class="status ${i.paid ? 'paid' : 'unpaid'}">${i.paid ? '已付' : '未付'}</span>
            <button class="btn btn-secondary btn-sm" onclick="downloadInvoicePDF('${i.id}')">📄 PDF</button>
            ${i.client_email ? `<button class="btn btn-secondary btn-sm" onclick="sendInvoiceEmail('${i.id}')">📧 發送</button>` : ''}
            ${i.paid ? '' : `<button class="btn btn-primary btn-sm" onclick="markInvoicePaid('${i.id}')">已收費</button>`}
            <button class="btn btn-danger btn-sm" onclick="deleteInvoice('${i.id}')">刪除</button>
          </div>
        </div>`;}).join('') : '<div class="empty">暫時沒有發票</div>'}
    </div>`;
}

function openNewInvoice() {
  invItems = [{ desc: '', qty: 1, costJpy: 0, price: 0 }];
  document.getElementById('inv-no').value = 'INV-' + Date.now().toString().slice(-6);
  ['client','email','address'].forEach(f => document.getElementById('inv-' + f).value = '');
  document.getElementById('inv-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('inv-margin').value = localStorage.getItem('lastMargin') || '10';
  document.getElementById('inv-rate').value = localStorage.getItem('lastRate') || '0.052';
  renderInvItems(); openModal('invoice');
}

function quickInvoice(name, email, address) { openNewInvoice(); document.getElementById('inv-client').value = name; document.getElementById('inv-email').value = email; document.getElementById('inv-address').value = address; }

function addInvItem() { invItems.push({ desc: '', qty: 1, costJpy: 0, margin: 10, price: 0 }); renderInvItems(); }

function renderInvItems() {
  const el = document.getElementById('inv-items');
  const unifiedMargin = parseFloat(document.getElementById('inv-margin').value) || 0;
  const unifiedRate = parseFloat(document.getElementById('inv-rate').value) || 0.052;
  el.innerHTML = invItems.map((it, idx) => {
    const costTotal = (it.costJpy || 0) * (it.qty || 1) * unifiedRate;
    let price = 0;
    if (costTotal > 0 && unifiedMargin < 100) { price = costTotal / (1 - unifiedMargin / 100) / (it.qty || 1); }
    return `<div class="item-row">
      <input type="text" placeholder="項目描述" value="${it.desc || ''}" oninput="updateInvItem(${idx}, 'desc', this.value)">
      <input type="number" placeholder="數量" value="${it.qty || 1}" style="width:60px" oninput="updateInvItem(${idx}, 'qty', this.value)">
      <input type="number" placeholder="成本 (JPY)" class="cost-jpy" value="${it.costJpy || ''}" oninput="updateInvItem(${idx}, 'costJpy', this.value)">
      <input type="text" placeholder="$0" class="profit-hkd" value="${price > 0 ? '$' + price.toFixed(2) : ''}" readonly>
      <button class="btn btn-danger btn-sm" onclick="removeInvItem(${idx})">✕</button>
    </div>`;
  }).join('');
  calcInvTotals();
}

function applyUnifiedMargin() {
  renderInvItems();
}

function updateInvItem(idx, field, val) {
  invItems[idx][field] = field === 'desc' ? val : parseFloat(val) || 0;
  const it = invItems[idx];
  const rate = parseFloat(document.getElementById('inv-rate').value) || 0.052;
  const margin = parseFloat(document.getElementById('inv-margin').value) || 0;
  const costTotal = (it.costJpy || 0) * (it.qty || 1) * rate;
  if (costTotal > 0 && margin < 100) { invItems[idx].price = costTotal / (1 - margin / 100) / (it.qty || 1); }
  else { invItems[idx].price = 0; }
  renderInvItems();
}

function removeInvItem(idx) { invItems.splice(idx, 1); renderInvItems(); }

function calcInvTotals() {
  const rate = parseFloat(document.getElementById('inv-rate').value) || 0.052;
  const margin = parseFloat(document.getElementById('inv-margin').value) || 0;
  let totalSale = 0, totalCostJpy = 0, totalProfit = 0;
  invItems.forEach(it => {
    const qty = it.qty || 1;
    const costJpy = it.costJpy || 0;
    const costTotal = costJpy * qty * rate;
    let price = 0;
    if (costTotal > 0 && margin < 100) { price = costTotal / (1 - margin / 100) / qty; }
    const sale = qty * price;
    totalSale += sale; totalCostJpy += costJpy * qty; totalProfit += sale - costTotal;
  });
  const actualMargin = totalSale > 0 ? (totalProfit / totalSale * 100).toFixed(1) : 0;
  document.getElementById('inv-total-sale').textContent = '$' + totalSale.toLocaleString();
  document.getElementById('inv-total-cost').textContent = '¥' + totalCostJpy.toLocaleString();
  document.getElementById('inv-total-profit').textContent = '$' + totalProfit.toFixed(2);
  document.getElementById('inv-total-margin').textContent = actualMargin + '%';
}

async function saveInvoice() {
  const client = document.getElementById('inv-client').value.trim();
  if (!client) { alert('請輸入客戶名稱'); return; }
  if (!invItems.length || !invItems.some(it => it.desc && it.price > 0)) { alert('請輸入最少一項'); return; }
  const margin = parseFloat(document.getElementById('inv-margin').value) || 0;
  const rate = parseFloat(document.getElementById('inv-rate').value) || 0.052;
  const validItems = invItems.filter(it => it.desc && it.price > 0);
  const inv = { id: 'INV-' + Date.now(), no: document.getElementById('inv-no').value, client, client_email: document.getElementById('inv-email').value.trim(), client_address: document.getElementById('inv-address').value.trim(), date: document.getElementById('inv-date').value, items: validItems, paid: false, margin, exchange_rate: rate };
  localStorage.setItem('lastMargin', margin);
  localStorage.setItem('lastRate', rate);
  try {
    await api('/api/invoices', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(inv) });
    closeModal('invoice');
    await loadData();
    renderInvoices();
  } catch(err) {
    alert('❌ 儲存發票失敗：' + err.message);
  }
}

async function markInvoicePaid(id) { 
  try {
    await api('/api/invoices/' + id + '/mark-paid', { method: 'POST' }); 
    await loadData(); 
    renderDashboard(); 
    renderInvoices(); 
  } catch(err) {
    alert('❌ 更新失敗：' + err.message);
  }
}

async function deleteInvoice(id) { 
  if (!confirm('確定刪除這張發票？')) return; 
  try {
    await api('/api/invoices/' + id, { method: 'DELETE' }); 
    await loadData(); 
    renderInvoices(); 
  } catch(err) {
    alert('❌ 刪除失敗：' + err.message);
  }
}

// PDF generation using browser print
function generateInvoiceHTML(invoice) {
  const rate = invoice.exchange_rate || 0.052;
  const items = invoice.items || [];
  const subtotal = items.reduce((s, it) => s + (it.qty || 1) * (it.price || 0), 0);
  const totalCostJpy = items.reduce((s, it) => s + (it.qty || 1) * (it.costJpy || 0), 0);
  const totalCostHkd = totalCostJpy * rate;
  const profit = subtotal - totalCostHkd;
  const margin = subtotal > 0 ? (profit / subtotal * 100).toFixed(1) : 0;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Invoice ${invoice.no}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 14px; color: #222; padding: 40px; max-width: 800px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid #00d4aa; padding-bottom: 20px; }
  .header h1 { font-size: 24px; color: #00d4aa; }
  .invoice-meta { text-align: right; }
  .invoice-meta p { margin-bottom: 4px; }
  .invoice-meta .no { font-size: 18px; font-weight: bold; }
  .invoice-meta .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-top: 4px; }
  .status.paid { background: #00d4aa22; color: #00d4aa; }
  .status.unpaid { background: #ff6b6b22; color: #ff6b6b; }
  .client-info { margin-bottom: 30px; background: #f5f5f5; padding: 16px; border-radius: 8px; }
  .client-info h3 { font-size: 12px; color: #888; margin-bottom: 6px; text-transform: uppercase; }
  .client-info p { font-size: 15px; margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  th { background: #1a1a2e; color: #fff; padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; }
  td { padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 13px; }
  tr:last-child td { border-bottom: none; }
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  .summary { display: flex; justify-content: flex-end; }
  .summary-table { width: 300px; }
  .summary-table td { padding: 8px 12px; }
  .summary-table .label { color: #888; font-size: 13px; }
  .summary-table .value { text-align: right; font-weight: 600; }
  .summary-table .total { background: #1a1a2e; color: #fff; font-size: 15px; }
  .summary-table .total td { color: #00d4aa; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #888; font-size: 12px; text-align: center; }
  @media print {
    body { padding: 20px; }
    .no-print { display: none; }
  }
</style>
</head>
<body>
<div class="header">
  <div>
    <h1>💼 INVOICE</h1>
    <p style="color:#888;margin-top:4px">會計開單系統</p>
  </div>
  <div class="invoice-meta">
    <p class="no">${invoice.no}</p>
    <p>${invoice.date}</p>
    <span class="status ${invoice.paid ? 'paid' : 'unpaid'}">${invoice.paid ? 'PAID 已付' : 'UNPAID 未付'}</span>
  </div>
</div>

<div class="client-info">
  <h3>Bill To / 收件人</h3>
  <p><strong>${invoice.client}</strong></p>
  ${invoice.client_email ? `<p>📧 ${invoice.client_email}</p>` : ''}
  ${invoice.client_address ? `<p>📍 ${invoice.client_address}</p>` : ''}
</div>

<table>
  <thead>
    <tr>
      <th>#</th>
      <th>Description 項目描述</th>
      <th class="text-center">Qty 數量</th>
      <th class="text-right">Unit Price (HKD)</th>
      <th class="text-right">Total (HKD)</th>
    </tr>
  </thead>
  <tbody>
    ${items.map((it, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${it.desc || '-'}</td>
      <td class="text-center">${it.qty || 1}</td>
      <td class="text-right">$${(it.price || 0).toFixed(2)}</td>
      <td class="text-right">$${((it.qty || 1) * (it.price || 0)).toFixed(2)}</td>
    </tr>`).join('')}
  </tbody>
</table>

<div class="summary">
  <table class="summary-table">
    <tr><td class="label">Exchange Rate 匯率</td><td class="value">1 JPY = HK$${rate}</td></tr>
    <tr><td class="label">Total Cost 總成本</td><td class="value" style="color:#ffe66d">¥${totalCostJpy.toLocaleString()}</td></tr>
    <tr><td class="label">Subtotal 小計</td><td class="value">$${subtotal.toFixed(2)}</td></tr>
    <tr><td class="label">Profit 利潤</td><td class="value" style="color:#00d4aa">$${profit.toFixed(2)}</td></tr>
    <tr class="total"><td>Total 總計</td><td>$${subtotal.toFixed(2)}</td></tr>
  </table>
</div>

<div class="footer">
  <p>Generated by 會計開單系統 | ${new Date().toLocaleString()}</p>
</div>
</body>
</html>\`;
}

function downloadInvoicePDF(id) {
  const invoice = invoices.find(i => i.id === id);
  if (!invoice) { alert('❌ 找不到發票'); return; }
  
  const html = generateInvoiceHTML(invoice);
  const win = window.open('', '_blank');
  if (!win) { alert('❌ 請允許彈出視窗'); return; }
  win.document.write(html);
  win.document.close();
  win.onload = () => {
    win.print();
  };
}

async function sendInvoiceEmail(id) {
  const invoice = invoices.find(i => i.id === id);
  if (!invoice) { alert('❌ 找不到發票'); return; }
  
  const email = invoice.client_email;
  if (!email) { alert('❌ 沒有電郵地址'); return; }
  
  const html = generateInvoiceHTML(invoice);
  const win = window.open('', '_blank');
  if (!win) { alert('❌ 請允許彈出視窗'); return; }
  win.document.write(html);
  win.document.close();
  win.onload = () => {
    if (confirm('📧 確定發送發票到 ' + email + '？\n\n系統將打開打印視窗，請使用「另存為 PDF」保存後發送。')) {
      win.print();
    }
  };
}

// Records
function renderRecords() {
  const rv = document.getElementById('view-records');
  rv.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h2>收支記錄 (${records.length})</h2>
        <button class="btn btn-primary" onclick="openNewRecord()">+ 新增記錄</button>
      </div>
      <table>
        <thead><tr><th>日期</th><th>項目</th><th>類型</th><th>金額</th><th></th></tr></thead>
        <tbody>${records.map(r => `<tr><td>${r.date}</td><td>${r.desc}</td><td style="color:${r.type === 'income' ? '#00d4aa' : '#ff6b6b'}">${r.type === 'income' ? '收入' : '支出'}</td><td style="color:${r.type === 'income' ? '#00d4aa' : '#ff6b6b'}>$${Number(r.amount).toLocaleString()}</td><td><button class="btn btn-danger btn-sm" onclick="deleteRecord('${r.id}')">刪除</button></td></tr>`).join('')}</tbody>
      </table>
      ${records.length === 0 ? '<div class="empty">暫時沒有記錄</div>' : ''}
    </div>`;
}

function openNewRecord() { document.getElementById('rec-date').value = new Date().toISOString().split('T')[0]; document.getElementById('rec-desc').value = ''; document.getElementById('rec-type').value = 'income'; document.getElementById('rec-amount').value = ''; openModal('record'); }

async function saveRecord() {
  const desc = document.getElementById('rec-desc').value.trim();
  const amount = parseFloat(document.getElementById('rec-amount').value);
  if (!desc || !amount) { alert('請填寫所有欄位'); return; }
  await api('/api/records', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ id: 'REC-' + Date.now(), date: document.getElementById('rec-date').value, desc, type: document.getElementById('rec-type').value, amount }) });
  closeModal('record'); await loadData(); renderRecords();
}


// Products
function renderProducts() {
  const pv = document.getElementById('view-products');
  pv.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h2>📦 產品列表 (${products.length})</h2>
        <div style="display:flex;gap:8px">
          <input type="text" class="search-input" placeholder="🔍 搜尋產品..." oninput="filterProducts(this.value)">
          <button class="btn btn-secondary" onclick="openExcelModal()">📥 Excel上傳</button>
          <button class="btn btn-primary" onclick="openNewProduct()">+ 新增產品</button>
        </div>
      </div>
      ${products.length ? `<table style="margin-top:12px"><thead><tr><th>JAN</th><th>SKU</th><th>產品名稱</th><th>類別</th><th>成本 (JPY)</th><th>建議售價 (HKD)</th><th></th></tr></thead><tbody>${products.map(p => `<tr><td>${p.jan || '-'}</td><td>${p.sku || '-'}</td><td>${p.name}</td><td>${p.category || '-'}</td><td style="color:#ffe66d">¥${(p.cost_jpy || 0).toLocaleString()}</td><td style="color:#00d4aa">$${(p.suggested_price_hkd || 0).toLocaleString()}</td><td><button class="btn btn-sm" style="background:#333" onclick="editProduct('${p.id}')">編輯</button> <button class="btn btn-danger btn-sm" onclick="deleteProduct('${p.id}')">刪除</button></td></tr>`).join('')}</tbody></table>` : '<div class="empty">暫時沒有產品 <br><br><a href="data:text/csv;charset=utf-8,SKU,產品名稱,類別,成本(JPY),建議售價(HKD),備註\nSKU-001,產品A,電子,1000,50,範例" download="產品範本.csv" style="color:#00d4aa">📄 下載 CSV 範本</a></div>'}
    </div>`;
}

function filterProducts(q) {
  const filtered = products.filter(p => (p.name || '').toLowerCase().includes(q.toLowerCase()) || (p.sku || '').toLowerCase().includes(q.toLowerCase()) || (p.category || '').toLowerCase().includes(q.toLowerCase()));
  const pv = document.getElementById('view-products');
  pv.innerHTML = filtered.length ? filtered.map(p => `<div class="list-item"><div class="list-item-info"><h3>${p.name}</h3><p>JAN: ${p.jan || '-'} | SKU: ${p.sku || '-'} | ${p.category || '無類別'}</p></div><div style="display:flex;gap:8px;align-items:center"><span style="color:#ffe66d">¥${(p.cost_jpy||0).toLocaleString()}</span><span style="color:#00d4aa">$${(p.suggested_price_hkd||0).toLocaleString()}</span><button class="btn btn-sm" style="background:#333" onclick="editProduct('${p.id}')">編輯</button><button class="btn btn-danger btn-sm" onclick="deleteProduct('${p.id}')">刪除</button></div></div>`).join('') : '<div class="empty">找不到產品</div>';
}

function openNewProduct() {
  document.getElementById('product-modal-title').textContent = '📦 新增產品';
  document.getElementById('edit-product-id').value = '';
  ['name','sku','jan','category','cost','price','notes'].forEach(f => document.getElementById('prod-' + f).value = '');
  openModal('product');
}

function editProduct(id) {
  const p = products.find(x => x.id === id); if (!p) return;
  document.getElementById('product-modal-title').textContent = '✏️ 編輯產品';
  document.getElementById('edit-product-id').value = id;
  document.getElementById('prod-name').value = p.name || '';
  document.getElementById('prod-sku').value = p.sku || '';
  document.getElementById('prod-category').value = p.category || '';
  document.getElementById('prod-cost').value = p.cost_jpy || 0;
  document.getElementById('prod-price').value = p.suggested_price_hkd || 0;
  document.getElementById('prod-notes').value = p.notes || '';
  openModal('product');
}

async function saveProduct() {
  const name = document.getElementById('prod-name').value.trim();
  if (!name) { alert('請輸入產品名稱'); return; }
  const id = document.getElementById('edit-product-id').value || 'PROD-' + Date.now();
  const p = { id, name, sku: document.getElementById('prod-sku').value.trim(), jan: document.getElementById('prod-jan').value.trim(), category: document.getElementById('prod-category').value.trim(), cost_jpy: parseFloat(document.getElementById('prod-cost').value) || 0, suggested_price_hkd: parseFloat(document.getElementById('prod-price').value) || 0, notes: document.getElementById('prod-notes').value.trim() };
  if (document.getElementById('edit-product-id').value) { await api('/api/products/' + id, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(p) }); }
  else { await api('/api/products', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(p) }); }
  closeModal('product'); await loadData(); renderProducts();
}

async function deleteProduct(id) { if (!confirm('確定刪除這個產品？')) return; await api('/api/products/' + id, { method: 'DELETE' }); await loadData(); renderProducts(); }

function openExcelModal() { 
  document.getElementById('excel-file').value = ''; 
  document.getElementById('excel-preview').style.display = 'none'; 
  document.getElementById('btn-import-excel').disabled = true; 
  document.getElementById('excel-count').textContent = '';
  openModal('excel'); 
}

let excelData = [];

// Excel 文件上传处理 - 移到 init 函数内确保 XLSX 已加载
function initExcelUpload() {
  const fileInput = document.getElementById('excel-file');
  if (!fileInput) return;
  
  fileInput.addEventListener('change', function(e) {
    console.log('📥 File selected:', e.target.files[0]?.name);
    const file = e.target.files[0]; 
    if (!file) return;
    
    // 检查 XLSX 库是否加载
    if (typeof XLSX === 'undefined') {
      alert('❌ XLSX 库未加载，请刷新页面重试');
      console.error('XLSX is not defined');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = function(ev) {
      try {
        const data = new Uint8Array(ev.target.result);
        const wb = XLSX.read(data, {type: 'array'});
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const json = XLSX.utils.sheet_to_json(ws, {header:1});
        
        console.log('📊 Excel data:', json.length, 'rows');
        
        if (json.length < 2) { 
          alert('📄 Excel 檔案沒有資料'); 
          return; 
        }
        
        const headers = json[0].map(h => String(h).trim());
        console.log('📋 Headers:', headers);
        
        const nameIdx = headers.findIndex(h => h.includes('ITEM NAME') || h.includes('產品名稱') || h.includes('Name'));
        if (nameIdx < 0) { 
          alert('❌ 找不到「產品名稱」欄位，請使用範本格式\n\n需要包含：產品名稱、SKU、成本、售價 等欄位'); 
          return; 
        }
        
        excelData = json.slice(1).filter(row => row[nameIdx]).map(row => ({
          id: 'PROD-' + Date.now() + '-' + Math.random().toString(36).substr(2,9),
          sku: String(row[headers.findIndex(h => h.includes('SKU'))] || '').trim(),
          jan: String(row[headers.findIndex(h => h.includes('JAN'))] || '').trim(),
          name: String(row[nameIdx] || '').trim(),
          category: String(row[headers.findIndex(h => h.includes('MANUFACTURER'))] || row[headers.findIndex(h => h.includes('廠商'))] || '').trim(),
          cost_jpy: parseFloat(row[headers.findIndex(h => h.includes('PRICE') || h.includes('成本'))] || 0) || 0,
          suggested_price_hkd: parseFloat(row[headers.findIndex(h => h.includes('售價'))] || 0) || 0,
          notes: String(row[headers.findIndex(h => h.includes('備註'))] || '').trim()
        }));
        
        console.log('✅ Parsed', excelData.length, 'products');
        
        document.getElementById('excel-preview-head').innerHTML = '<tr>' + headers.map(h => '<th style="padding:6px;border:1px solid #333">' + h + '</th>').join('') + '</tr>';
        document.getElementById('excel-preview-body').innerHTML = json.slice(1,6).map(row => '<tr>' + row.map(c => '<td style="padding:6px;border:1px solid #333">' + (c||'') + '</td>').join('') + '</tr>').join('');
        document.getElementById('excel-count').textContent = `共 ${excelData.length} 項產品，確認匯入？`;
        document.getElementById('excel-preview').style.display = 'block';
        document.getElementById('btn-import-excel').disabled = false;
      } catch(err) { 
        console.error('❌ Excel parse error:', err);
        alert('❌ 讀取 Excel 失敗：' + err.message + '\n\n请确保文件格式正确，使用 CSV 範本试试。'); 
      }
    };
    reader.onerror = () => {
      alert('❌ 文件读取失败');
    };
    reader.readAsArrayBuffer(file);
  });
}

async function doExcelImport() {
  if (!excelData.length) { 
    alert('❌ 沒有可匯入的產品資料');
    return; 
  }
  
  const BATCH_SIZE = 100; // 每批上傳數量
  const totalBatches = Math.ceil(excelData.length / BATCH_SIZE);
  
  try {
    let uploadedCount = 0;
    
    for (let i = 0; i < excelData.length; i += BATCH_SIZE) {
      const batch = excelData.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      
      alert('📤 上傳中... 第 ' + batchNum + '/' + totalBatches + ' 批 (' + batch.length + ' 項)');
      
      await api('/api/products/bulk', { 
        method: 'POST', 
        headers: {'Content-Type':'application/json'}, 
        body: JSON.stringify({products: batch})
      });
      
      uploadedCount += batch.length;
    }
    
    closeModal('excel'); 
    await loadData(); 
    renderProducts(); 
    alert('✅ 已成功匯入 ' + uploadedCount + ' 項產品！');
  } catch(err) {
    alert('❌ 匯入失敗：' + err.message);
  }
}
async function deleteRecord(id) { if (!confirm('確定刪除？')) return; await api('/api/records/' + id, { method: 'DELETE' }); await loadData(); renderRecords(); }

// Init - 确保在 DOM 加载后执行
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function init() {
  console.log('🚀 Initializing app...');
  console.log('📦 XLSX loaded:', typeof XLSX !== 'undefined');
  
  // 初始化 Excel 上传功能
  initExcelUpload();
  
  loadData().then(() => {
    console.log('📊 Data loaded:', { customers: customers.length, invoices: invoices.length, products: products.length });
    showView('dashboard');
  }).catch(err => {
    console.error('❌ Failed to load data:', err);
    alert('加载数据失败：' + err.message);
  });
}
