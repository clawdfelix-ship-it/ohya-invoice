// Run this to fix the index.html by appending the missing JavaScript
const fs = require('fs');
const path = require('path');

const remainingJS = ` btn-primary" onclick="openNewCustomer()">+ 新增客戶</button>
        </div>
      </div>
      <div id="customers-list"></div>
    </div>\`;
  renderCustomersList(customers);
}

function renderCustomersList(list) {
  const el = document.getElementById('customers-list');
  if (!list.length) { el.innerHTML = '<div class="empty">暫時沒有客戶</div>'; return; }
  el.innerHTML = list.map(c => \`
    <div class="list-item">
      <div class="list-item-info">
        <h3>\${c.name}</h3>
        <p>\${c.company || ''} \${c.phone ? '| ' + c.phone : ''} \${c.email ? '| ' + c.email : ''}</p>
      </div>
      <div class="list-item-actions">
        <button class="btn btn-primary btn-sm" onclick="quickInvoice('\${c.name}','\${c.email || ''}','\${c.address || ''}')">開單</button>
        <button class="btn btn-secondary btn-sm" onclick="editCustomer('\${c.id}')">編輯</button>
        <button class="btn btn-danger btn-sm" onclick="deleteCustomer('\${c.id}')">刪除</button>
      </div>
    </div>\`).join('');
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
  box.innerHTML = matches.map(c => \`<div class="suggestion-item" onclick="selectCustomer('\${c.name.replace(/'/g,"\\\\'")}','\${(c.email||'').replace(/'/g,"\\\\'")}','\${(c.address||'').replace(/'/g,"\\\\'")}')">\${c.name} <small>\${c.company||''}</small></div>\`).join('');
  box.classList.add('show');
}
function selectCustomer(name, email, address) { document.getElementById('inv-client').value = name; document.getElementById('inv-email').value = email; document.getElementById('inv-address').value = address; document.getElementById('inv-client-suggestions').classList.remove('show'); }
document.addEventListener('click', e => { if (!e.target.closest('.search-wrap')) document.getElementById('inv-client-suggestions').classList.remove('show'); });

// Invoices
function renderInvoices() {
  const iv = document.getElementById('view-invoices');
  iv.innerHTML = \`
    <div class="card">
      <div class="card-header">
        <h2>發票列表 (\${invoices.length})</h2>
        <button class="btn btn-primary" onclick="openNewInvoice()">+ 新增發票</button>
      </div>
      \${invoices.length ? invoices.map(i => {
        const total = i.items?.reduce((s,it) => s + it.qty * it.price, 0) || 0;
        return \`<div class="list-item">
          <div class="list-item-info">
            <h3>\${i.client} - \${i.no}</h3>
            <p>\${i.date} | \${i.items?.length || 0} 項目 | $\${total.toLocaleString()}</p>
          </div>
          <div class="list-item-actions">
            <span class="status \${i.paid ? 'paid' : 'unpaid'}">\${i.paid ? '已付' : '未付'}</span>
            \${i.paid ? '' : \`<button class="btn btn-primary btn-sm" onclick="markInvoicePaid('\${i.id}')">已收費</button>\`}
            <button class="btn btn-danger btn-sm" onclick="deleteInvoice('\${i.id}')">刪除</button>
          </div>
        </div>\`;}).join('') : '<div class="empty">暫時沒有發票</div>'}
    </div>\`;
}

function openNewInvoice() {
  invItems = [{ desc: '', qty: 1, costJpy: 0, margin: 10, price: 0 }];
  document.getElementById('inv-no').value = 'INV-' + Date.now().toString().slice(-6);
  ['client','email','address'].forEach(f => document.getElementById('inv-' + f).value = '');
  document.getElementById('inv-date').value = new Date().toISOString().split('T')[0];
  renderInvItems(); openModal('invoice');
}

function quickInvoice(name, email, address) { openNewInvoice(); document.getElementById('inv-client').value = name; document.getElementById('inv-email').value = email; document.getElementById('inv-address').value = address; }

function addInvItem() { invItems.push({ desc: '', qty: 1, costJpy: 0, margin: 10, price: 0 }); renderInvItems(); }

function renderInvItems() {
  const el = document.getElementById('inv-items');
  el.innerHTML = invItems.map((it, idx) => \`
    <div class="item-row">
      <input type="text" placeholder="項目描述" value="\${it.desc || ''}" oninput="updateInvItem(\${idx}, 'desc', this.value)">
      <input type="number" placeholder="數量" value="\${it.qty}" style="width:60px" oninput="updateInvItem(\${idx}, 'qty', this.value)">
      <input type="number" placeholder="成本" class="cost-jpy" value="\${it.costJpy || ''}" oninput="updateInvItem(\${idx}, 'costJpy', this.value)">
      <input type="number" placeholder="%" class="margin-pct" value="\${it.margin || ''}" step="0.1" oninput="updateInvItem(\${idx}, 'margin', this.value)">
      <input type="text" placeholder="$0" class="profit-hkd" value="\${it.price ? '$' + it.price.toFixed(2) : ''}" readonly>
      <button class="btn btn-danger btn-sm" onclick="removeInvItem(\${idx})">✕</button>
    </div>\`).join('');
  calcInvTotals();
}

function updateInvItem(idx, field, val) {
  invItems[idx][field] = field === 'desc' ? val : parseFloat(val) || 0;
  const it = invItems[idx];
  const costTotal = it.costJpy * it.qty * EXCHANGE_RATE;
  if (costTotal > 0 && it.margin < 100) { it.price = costTotal / (1 - it.margin / 100) / it.qty; }
  else { it.price = 0; }
  renderInvItems();
}

function removeInvItem(idx) { invItems.splice(idx, 1); renderInvItems(); }

function calcInvTotals() {
  let totalSale = 0, totalCostJpy = 0, totalProfit = 0;
  invItems.forEach(it => {
    const sale = it.qty * it.price;
    const cost = it.costJpy * it.qty * EXCHANGE_RATE;
    totalSale += sale; totalCostJpy += it.costJpy * it.qty; totalProfit += sale - cost;
  });
  const margin = totalSale > 0 ? (totalProfit / totalSale * 100).toFixed(1) : 0;
  document.getElementById('inv-total-sale').textContent = '$' + totalSale.toLocaleString();
  document.getElementById('inv-total-cost').textContent = '¥' + totalCostJpy.toLocaleString();
  document.getElementById('inv-total-profit').textContent = '$' + totalProfit.toFixed(2);
  document.getElementById('inv-total-margin').textContent = margin + '%';
}

async function saveInvoice() {
  const client = document.getElementById('inv-client').value.trim();
  if (!client) { alert('請輸入客戶名稱'); return; }
  if (!invItems.length || !invItems.some(it => it.desc && it.price > 0)) { alert('請輸入最少一項'); return; }
  const validItems = invItems.filter(it => it.desc && it.price > 0);
  const inv = { id: 'INV-' + Date.now(), no: document.getElementById('inv-no').value, client, client_email: document.getElementById('inv-email').value.trim(), client_address: document.getElementById('inv-address').value.trim(), date: document.getElementById('inv-date').value, items: validItems, paid: false, exchange_rate: EXCHANGE_RATE };
  await api('/api/invoices', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(inv) });
  closeModal('invoice'); await loadData(); renderInvoices();
}

async function markInvoicePaid(id) { await api('/api/invoices/' + id + '/mark-paid', { method: 'POST' }); await loadData(); renderDashboard(); renderInvoices(); }
async function deleteInvoice(id) { if (!confirm('確定刪除這張發票？')) return; await api('/api/invoices/' + id, { method: 'DELETE' }); await loadData(); renderInvoices(); }

// Records
function renderRecords() {
  const rv = document.getElementById('view-records');
  rv.innerHTML = \`
    <div class="card">
      <div class="card-header">
        <h2>收支記錄 (\${records.length})</h2>
        <button class="btn btn-primary" onclick="openNewRecord()">+ 新增記錄</button>
      </div>
      <table>
        <thead><tr><th>日期</th><th>項目</th><th>類型</th><th>金額</th><th></th></tr></thead>
        <tbody>\${records.map(r => \`<tr><td>\${r.date}</td><td>\${r.desc}</td><td style="color:\${r.type === 'income' ? '#00d4aa' : '#ff6b6b'}">\${r.type === 'income' ? '收入' : '支出'}</td><td style="color:\${r.type === 'income' ? '#00d4aa' : '#ff6b6b'}>$\${Number(r.amount).toLocaleString()}</td><td><button class="btn btn-danger btn-sm" onclick="deleteRecord('\${r.id}')">刪除</button></td></tr>\`).join('')}</tbody>
      </table>
      \${records.length === 0 ? '<div class="empty">暫時沒有記錄</div>' : ''}
    </div>\`;
}

function openNewRecord() { document.getElementById('rec-date').value = new Date().toISOString().split('T')[0]; document.getElementById('rec-desc').value = ''; document.getElementById('rec-type').value = 'income'; document.getElementById('rec-amount').value = ''; openModal('record'); }

async function saveRecord() {
  const desc = document.getElementById('rec-desc').value.trim();
  const amount = parseFloat(document.getElementById('rec-amount').value);
  if (!desc || !amount) { alert('請填寫所有欄位'); return; }
  await api('/api/records', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ id: 'REC-' + Date.now(), date: document.getElementById('rec-date').value, desc, type: document.getElementById('rec-type').value, amount }) });
  closeModal('record'); await loadData(); renderRecords();
}

async function deleteRecord(id) { if (!confirm('確定刪除？')) return; await api('/api/records/' + id, { method: 'DELETE' }); await loadData(); renderRecords(); }

// Init
loadData().then(() => showView('dashboard'));
</script>
</body>
</html>`;

const indexPath = path.join(__dirname, 'public', 'index.html');
let content = fs.readFileSync(indexPath, 'utf8');

// Check if file already ends with closing tags
if (!content.includes('loadData().then')) {
  content = content + remainingJS;
  fs.writeFileSync(indexPath, content);
  console.log('✅ index.html fixed!');
} else {
  console.log('✅ index.html is already complete');
}
