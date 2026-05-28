const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwDJjqkTffk1JutreTyODHqboBp1sdta3w-0wM1sQ6NPMnJQ-4ioI_Q6Tbo98lR7iq7/exec';

const itemSelect = document.getElementById('item');
const searchInput = document.getElementById('searchItem');

let allItems = [];

window.onload = function () {
  const today = new Date().toISOString().split('T')[0];

  document.getElementById('date').value = today;

  if (document.getElementById('exportDate')) {
    document.getElementById('exportDate').value = today;
  }

  itemSelect.addEventListener('change', showStock);
  searchInput.addEventListener('input', filterItems);

  document.getElementById('submittedBy').addEventListener('change', toggleOtherSubmitter);
  document.getElementById('technician').addEventListener('change', toggleOtherTechnician);

  if (document.getElementById('exportMode')) {
    document.getElementById('exportMode').addEventListener('change', toggleExportFilters);
  }

  updateTypeBadge();
  loadItems();
};

async function loadItems() {
  try {
    const response = await fetch(WEB_APP_URL);
    const data = await response.json();

    allItems = data.items || [];

    renderItems(allItems);
    renderTechnicians(data.technicians || []);
    renderRecentTransactions(data.recentTransactions || []);

    renderDashboard(data.dashboard || {
      totalItems: 0,
      lowStockItems: 0,
      todayIn: 0,
      todayOut: 0
    });

    window.todayTransactions = data.todayTransactions || [];
    window.allTransactions = data.allTransactions || data.todayTransactions || [];

  } catch (error) {
    console.error('Failed to load inventory data:', error);
    alert('Failed to load inventory data. Please check Apps Script URL or permission.');
  }
}

function selectType(btn) {
  const val = btn.dataset.val;

  document.getElementById('type').value = val;

  document.querySelectorAll('.type-btn').forEach(b => {
    b.className = 'type-btn';

    if (b === btn) {
      if (val === 'IN') b.className += ' active-in';
      else if (val === 'OUT') b.className += ' active-out';
      else if (val === 'RETURN') b.className += ' active-ret';
      else if (val === 'ADJUST_IN') b.className += ' active-adj-in';
      else if (val === 'ADJUST_OUT') b.className += ' active-adj-out';
    }
  });

  updateTypeBadge();
}

function updateTypeBadge() {
  const type = document.getElementById('type').value;
  const passwordSection = document.getElementById('adjustPasswordSection');

  if (type === 'ADJUST_IN' || type === 'ADJUST_OUT') {
    passwordSection.style.display = 'block';
  } else {
    passwordSection.style.display = 'none';
    document.getElementById('adjustPassword').value = '';
  }
}

async function submitForm() {
  if (!itemSelect.value) {
    alert('Please select item.');
    return;
  }

  const qty = document.getElementById('qty').value;

  if (!qty || Number(qty) <= 0) {
    alert('Please enter quantity.');
    return;
  }

  const item = JSON.parse(itemSelect.value);
  const type = document.getElementById('type').value;

  if (
    (type === 'OUT' || type === 'ADJUST_OUT') &&
    Number(qty) > Number(item.currentStock || 0)
  ) {
    alert(
      `Not enough stock.\n\nCurrent Stock: ${item.currentStock || 0} ${item.unit || ''}\nRequested OUT: ${qty}`
    );
    return;
  }

  const technicianRaw = document.getElementById('technician').value;
  const technician = technicianRaw === 'Other'
    ? document.getElementById('otherTechnician').value.trim()
    : technicianRaw;

  if (
  (type === 'OUT' || type === 'RETURN') &&
  !technicianRaw
) {
  alert('Please select technician.');
  return;
}

  if (
  (type === 'OUT' || type === 'RETURN') &&
  technicianRaw === 'Other' &&
  !technician
) {
  alert('Please enter technician name.');
  return;
}

  const submittedByRaw = document.getElementById('submittedBy').value;
  const submittedBy = submittedByRaw === 'Other'
    ? document.getElementById('otherSubmitter').value.trim()
    : submittedByRaw;

  if (submittedByRaw === 'Other' && !submittedBy) {
    alert('Please enter name for Other.');
    return;
  }

  if (
    (type === 'ADJUST_IN' || type === 'ADJUST_OUT') &&
    submittedBy !== 'Wilson' &&
    submittedBy !== 'Office'
  ) {
    alert('Only Wilson or Office can use ADJUST.');
    return;
  }

  if (
    (type === 'ADJUST_IN' || type === 'ADJUST_OUT') &&
    document.getElementById('adjustPassword').value !== 'lienta0615'
  ) {
    alert('Invalid admin password.');
    return;
  }

  const confirmSubmit = confirm(
    `Confirm submit?\n\nType: ${type}\nItem: ${item.code} - ${item.name}\nQty: ${qty}\nTechnician: ${technician}`
  );

  if (!confirmSubmit) return;

  const payload = {
    date: document.getElementById('date').value,
    type,
    itemCode: item.code,
    itemName: item.name,
    qty,
    technician,
    jobNo: document.getElementById('jobNo').value,
    remark: document.getElementById('remark').value,
    submittedBy
  };

  await fetch(WEB_APP_URL, {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  document.getElementById('successMsg').style.display = 'flex';

  resetForm();
  await loadItems();

  setTimeout(() => {
    document.getElementById('successMsg').style.display = 'none';
  }, 3000);
}

function resetForm() {
  document.getElementById('item').value = '';
  document.getElementById('searchItem').value = '';
  document.getElementById('qty').value = '';
  document.getElementById('technician').value = '';
  document.getElementById('otherTechnician').value = '';
  document.getElementById('otherTechnician').style.display = 'none';
  document.getElementById('jobNo').value = '';
  document.getElementById('remark').value = '';
  document.getElementById('adjustPassword').value = '';
  document.getElementById('adjustPasswordSection').style.display = 'none';

  document.getElementById('submittedBy').value = 'Wilson';
  document.getElementById('otherSubmitter').value = '';
  document.getElementById('otherSubmitter').style.display = 'none';

  const inBtn = document.querySelector('[data-val="IN"]');
  if (inBtn) selectType(inBtn);

  resetStockBox();
  renderItems(allItems);
}

function showStock() {
  const stockBox = document.getElementById('stockInfo');

  if (!itemSelect.value) {
    resetStockBox();
    return;
  }

  const item = JSON.parse(itemSelect.value);
  const currentStock = Number(item.currentStock || 0);
  const minStock = Number(item.minStock || 0);

  if (currentStock <= minStock) {
    stockBox.innerHTML =
      `<span class="dot"></span><span>Stock: <strong>${currentStock} ${item.unit || ''}</strong> — Low stock warning</span>`;
    stockBox.style.background = 'var(--danger-light)';
    stockBox.style.color = 'var(--danger)';
  } else {
    stockBox.innerHTML =
      `<span class="dot"></span><span>Stock: <strong>${currentStock} ${item.unit || ''}</strong> — OK</span>`;
    stockBox.style.background = 'var(--success-light)';
    stockBox.style.color = 'var(--success)';
  }
}

function resetStockBox() {
  const stockBox = document.getElementById('stockInfo');

  stockBox.innerHTML =
    '<span class="dot" style="background:rgba(0,0,0,0.2)"></span><span>Select an item to see stock level</span>';

  stockBox.style.background = 'var(--neutral)';
  stockBox.style.color = 'var(--text2)';
}

function toggleOtherSubmitter() {
  const submittedBy = document.getElementById('submittedBy').value;
  const otherInput = document.getElementById('otherSubmitter');

  otherInput.style.display = submittedBy === 'Other' ? 'block' : 'none';
}

function toggleOtherTechnician() {
  const technician = document.getElementById('technician').value;
  const otherInput = document.getElementById('otherTechnician');

  otherInput.style.display = technician === 'Other' ? 'block' : 'none';
}

function renderItems(items) {
  itemSelect.innerHTML = '<option value="">Select Item</option>';

  items.forEach(item => {
    const option = document.createElement('option');
    option.value = JSON.stringify(item);
    option.textContent = `${item.code} - ${item.name}`;
    itemSelect.appendChild(option);
  });
}

function filterItems() {
  const keyword = searchInput.value.toLowerCase();

  const filtered = allItems.filter(item =>
    (item.code || '').toLowerCase().includes(keyword) ||
    (item.name || '').toLowerCase().includes(keyword) ||
    (item.category || '').toLowerCase().includes(keyword)
  );

  renderItems(filtered);
}

function renderTechnicians(technicians) {
  const technicianSelect = document.getElementById('technician');

  technicianSelect.innerHTML =
    '<option value="">Select Technician</option>';

  technicians.forEach(name => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    technicianSelect.appendChild(option);
  });

  const otherOption = document.createElement('option');
  otherOption.value = 'Other';
  otherOption.textContent = 'Other';
  technicianSelect.appendChild(otherOption);

  const exportTech = document.getElementById('exportTechnician');

  if (exportTech) {
    exportTech.innerHTML = '<option value="">All Technician</option>';

    technicians.forEach(name => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      exportTech.appendChild(option);
    });
  }
}

function renderRecentTransactions(records) {
  const container = document.getElementById('recentList');

  if (!records.length) {
    container.innerHTML =
      '<div style="font-size:13px; color:var(--text2); padding:8px 0;">No records yet.</div>';
    return;
  }

  container.innerHTML = records.map(r => {
    const cls =
      r.type === 'IN' ? 'tx-in' :
      r.type === 'OUT' ? 'tx-out' :
      r.type === 'RETURN' ? 'tx-ret' :
      'tx-adj';

    return `
      <div class="tx-row">
        <span class="tx-badge ${cls}">${r.type}</span>

        <div class="tx-info">
          <div class="tx-name">${r.itemCode || ''} - ${r.itemName || ''}</div>
          <div class="tx-meta">${r.technician || '—'} · ${r.jobNo || '—'}</div>
        </div>

        <div class="tx-qty">×${r.qty || 0}</div>
      </div>
    `;
  }).join('');
}

function toggleDashboard() {
  const panel = document.getElementById('dashboardPanel');

  panel.style.display =
    panel.style.display === 'none' || panel.style.display === ''
      ? 'block'
      : 'none';
}

function renderDashboard(data) {
  document.getElementById('dashboardContent').innerHTML = `
    <div class="dash-card">
      <div class="dash-lbl">Total items</div>
      <div class="dash-num" style="color:var(--brand);">${data.totalItems || 0}</div>
    </div>

    <div class="dash-card">
      <div class="dash-lbl">Low stock</div>
      <div class="dash-num" style="color:var(--danger);">${data.lowStockItems || 0}</div>
    </div>

    <div class="dash-card">
      <div class="dash-lbl">Today IN</div>
      <div class="dash-num" style="color:var(--success);">${data.todayIn || 0}</div>
    </div>

    <div class="dash-card">
      <div class="dash-lbl">Today OUT</div>
      <div class="dash-num" style="color:var(--danger);">${data.todayOut || 0}</div>
    </div>
  `;
}

function toggleExportFilters() {
  const mode = document.getElementById('exportMode').value;
  const filters = document.getElementById('exportFilters');

  if (!filters) return;

  filters.style.display =
    mode === 'firstHalf' || mode === 'secondHalf'
      ? 'block'
      : 'none';
}

function exportReport() {
  const mode = document.getElementById('exportMode').value;
  const selectedTech = document.getElementById('exportTechnician')?.value || '';

  let records = window.allTransactions || window.todayTransactions || [];

  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  if (mode === 'today') {
  const today = new Date();

  records = records.filter(r => {
    const d = parseRecordDate(r.date);

    if (!d) return false;

    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  });

  printTransactionReport(records, 'Today');
  return;
}

  if (mode === 'firstHalf' || mode === 'secondHalf') {
    records = records.filter(r => {
  const d = parseRecordDate(r.date);

  if (!d) return false;

  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month
  ) {
    return false;
  }

  if (mode === 'firstHalf') {
    return d.getDate() >= 1 && d.getDate() <= 15;
  }

  if (mode === 'secondHalf') {
    return d.getDate() >= 16 && d <= now;
  }

  return false;
});

    if (selectedTech) {
      records = filterByTechnician(records, selectedTech);
    }

    const title = mode === 'firstHalf' ? 'First Half' : 'Second Half';

    printTransactionReport(
      records,
      selectedTech ? `${title} - ${selectedTech}` : `${title} - All Technician`
    );

    return;
  }

  if (mode === 'summary') {
    exportSummaryReport(records);
    return;
  }
}

function filterByTechnician(records, selectedTech) {
  const selected = selectedTech.toString().trim().toLowerCase();

  return records.filter(r => {
    const tech = (r.technician || '').toString().trim().toLowerCase();
    return tech === selected;
  });
}
function isAdditionalPipeRemark(remark) {
  return (remark || '')
    .toString()
    .toLowerCase()
    .includes('additional pipe');
}


function printTransactionReport(records, mode) {
  let html = `
    <html>
    <head>
      <title>Lienta Inventory Report</title>
      <style>
        body { font-family: Arial; padding: 24px; }
        h2 { margin-bottom: 8px; }
        p { margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
        th { background: #f1f3f4; }
      </style>
    </head>
    <body>
      <h2>Lienta Inventory Report</h2>
      <p>Report Type: ${mode}</p>

      <table>
        <tr>
          <th>Date</th>
          <th>Type</th>
          <th>Item</th>
          <th>Qty</th>
          <th>Technician</th>
          <th>Job No</th>
          <th>Remark</th>
          <th>Submitted By</th>
        </tr>
  `;

  if (!records.length) {
    html += `
      <tr>
        <td colspan="8" style="text-align:center;">No records found</td>
      </tr>
    `;
  }

  records.forEach(r => {

  const highlightRow =
    isAdditionalPipeRemark(r.remark)
      ? 'background:#fff3cd; color:#856404; font-weight:bold;'
      : '';

  html += `
    <tr style="${highlightRow}">
      <td>${formatReportDate(r.date)}</td>
      <td>${r.type || ''}</td>
      <td>${r.itemCode || ''} - ${r.itemName || ''}</td>
      <td>${r.qty || ''}</td>
      <td>${r.technician || ''}</td>
      <td>${r.jobNo || ''}</td>
      <td>${r.remark || ''}</td>
      <td>${r.submittedBy || ''}</td>
    </tr>
  `;
});

  html += `
      </table>
    </body>
    </html>
  `;

  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
  w.print();
}

function exportSummaryReport(records) {
  const summary = {};

  records.forEach(r => {
    if (!r.technician) return;

    const tech = r.technician;

    if (!summary[tech]) {
      summary[tech] = 0;
    }

    summary[tech] += Number(r.qty) || 0;
  });

  let html = `
    <html>
    <head>
      <title>Lienta Summary Report</title>
      <style>
        body { font-family: Arial; padding: 24px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
        th { background: #f1f3f4; }
      </style>
    </head>
    <body>
      <h2>Lienta Inventory Summary Report</h2>

      <table>
        <tr>
          <th>Technician</th>
          <th>Total Qty</th>
        </tr>
  `;

  const techNames = Object.keys(summary);

  if (!techNames.length) {
    html += `
      <tr>
        <td colspan="2" style="text-align:center;">No records found</td>
      </tr>
    `;
  }

  techNames.forEach(tech => {
    html += `
      <tr>
        <td>${tech}</td>
        <td>${summary[tech]}</td>
      </tr>
    `;
  });

  html += `
      </table>
    </body>
    </html>
  `;

  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
  w.print();
}

function formatReportDate(dateValue) {
  if (!dateValue) return '';

  const d = new Date(dateValue);

  if (isNaN(d)) return dateValue;

  return d.toLocaleDateString('en-GB');
}

function filterByTechnician(records, selectedTech) {
  const selected = selectedTech
    .toString()
    .trim()
    .toLowerCase();

  return records.filter(r => {
    const tech = (r.technician || '')
      .toString()
      .trim()
      .toLowerCase();

    return tech === selected;
  });
}


function printTransactionReport(records, mode) {
  let html = `
    <html>
    <head>
      <title>Lienta Inventory Report</title>
      <style>
        body { font-family: Arial; padding: 24px; }
        h2 { margin-bottom: 8px; }
        p { margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
        th { background: #f1f3f4; }
        .highlight td {
          background: #fff3cd !important;
          color: #856404 !important;
          font-weight: bold !important;
        }
      </style>
    </head>
    <body>
      <h2>Lienta Inventory Report</h2>
      <p>Report Type: ${mode}</p>

      <table>
        <tr>
          <th>Date</th>
          <th>Type</th>
          <th>Item</th>
          <th>Qty</th>
          <th>Technician</th>
          <th>Job No</th>
          <th>Remark</th>
          <th>Submitted By</th>
        </tr>
  `;

  if (!records.length) {
    html += `
      <tr>
        <td colspan="8" style="text-align:center;">No records found</td>
      </tr>
    `;
  }

  records.forEach(r => {
    const rowClass = isAdditionalPipeRemark(r.remark) ? 'highlight' : '';

    html += `
      <tr class="${rowClass}">
        <td>${formatReportDate(r.date)}</td>
        <td>${r.type || ''}</td>
        <td>${r.itemCode || ''} - ${r.itemName || ''}</td>
        <td>${r.qty || ''}</td>
        <td>${r.technician || ''}</td>
        <td>${r.jobNo || ''}</td>
        <td>${r.remark || ''}</td>
        <td>${r.submittedBy || ''}</td>
      </tr>
    `;
  });

  html += `
      </table>
    </body>
    </html>
  `;

  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
  w.print();
}

function isAdditionalPipeRemark(remark) {
  return (remark || '')
    .toString()
    .toLowerCase()
    .includes('additional pipe');
}

function exportSummaryReport(records) {
  const summary = {};

  records.forEach(r => {
    if (!r.technician) return;

    const tech = r.technician;

    if (!summary[tech]) {
      summary[tech] = 0;
    }

    summary[tech] += Number(r.qty) || 0;
  });

  let html = `
    <html>
    <head>
      <title>Lienta Summary Report</title>
      <style>
        body { font-family: Arial; padding: 24px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
        th { background: #f1f3f4; }
      </style>
    </head>
    <body>
      <h2>Lienta Inventory Summary Report</h2>

      <table>
        <tr>
          <th>Technician</th>
          <th>Total Qty</th>
        </tr>
  `;

  const techNames = Object.keys(summary);

  if (!techNames.length) {
    html += `
      <tr>
        <td colspan="2" style="text-align:center;">No records found</td>
      </tr>
    `;
  }

  techNames.forEach(tech => {
    html += `
      <tr>
        <td>${tech}</td>
        <td>${summary[tech]}</td>
      </tr>
    `;
  });

  html += `
      </table>
    </body>
    </html>
  `;

  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
  w.print();
}

function formatReportDate(dateValue) {
  if (!dateValue) return '';

  const d = new Date(dateValue);

  if (isNaN(d)) return dateValue;

  return d.toLocaleDateString('en-GB');
}
function parseRecordDate(value) {
  if (!value) return null;

  if (value instanceof Date) {
    return value;
  }

  const str = value.toString().trim();

  if (str.includes('/')) {
    const parts = str.split('/');

    if (parts.length === 3) {
      const day = Number(parts[0]);
      const month = Number(parts[1]) - 1;
      const year = Number(parts[2]);

      return new Date(year, month, day);
    }
  }

  const d = new Date(str);

  if (isNaN(d)) return null;

  return d;
}
function toggleRecentTransactions() {

  const wrapper =
    document.getElementById('recentListWrapper');

  wrapper.style.display =
    wrapper.style.display === 'none'
      ? 'block'
      : 'none';
}
