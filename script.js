const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwDJjqkTffk1JutreTyODHqboBp1sdta3w-0wM1sQ6NPMnJQ-4ioI_Q6Tbo98lR7iq7/exec';

const itemSelect = document.getElementById('item');
const searchInput = document.getElementById('searchItem');

let allItems = [];

window.onload = function () {
  document.getElementById('type').addEventListener('change', updateTypeBadge);
  document.getElementById('submittedBy').addEventListener('change', toggleOtherSubmitter);
  document.getElementById('technician').addEventListener('change', toggleOtherTechnician);

  if (document.getElementById('exportMode')) {
    document.getElementById('exportMode').addEventListener('change', toggleExportFilters);
  }

  itemSelect.addEventListener('change', showStock);

  const today = new Date().toISOString().split('T')[0];

  document.getElementById('date').value = today;

  if (document.getElementById('exportDate')) {
    document.getElementById('exportDate').value = today;
  }

  updateTypeBadge();
  loadItems();
};

async function loadItems() {
  try {
    const response = await fetch(WEB_APP_URL);
    const data = await response.json();

    const items = data.items || [];
    const technicians = data.technicians || [];

    allItems = items;

    renderItems(items);
    renderTechnicians(technicians);
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

  if (!technicianRaw) {
    alert('Please select technician.');
    return;
  }

  if (technicianRaw === 'Other' && !technician) {
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
    document.getElementById('adjustPassword').value !== 'Lienta@0615'
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
    qty: qty,
    technician,
    jobNo: document.getElementById('jobNo').value,
    remark: document.getElementById('remark').value,
    submittedBy
  };

  await fetch(WEB_APP_URL, {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  document.getElementById('successMsg').style.display = 'block';

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

  document.getElementById('type').value = 'IN';
  updateTypeBadge();

  document.getElementById('stockInfo').innerHTML = 'Current Stock: -';
  document.getElementById('stockInfo').style.background = '#f1f3f4';
  document.getElementById('stockInfo').style.color = '#000';

  renderItems(allItems);
}

function showStock() {
  const stockBox = document.getElementById('stockInfo');

  if (!itemSelect.value) {
    stockBox.innerHTML = 'Current Stock: -';
    stockBox.style.background = '#f1f3f4';
    stockBox.style.color = '#000';
    return;
  }

  const item = JSON.parse(itemSelect.value);

  const currentStock = Number(item.currentStock || 0);
  const minStock = Number(item.minStock || 0);

  if (currentStock <= minStock) {
    stockBox.innerHTML =
      `Current Stock: ${currentStock} ${item.unit || ''}<br>LOW STOCK WARNING`;
    stockBox.style.background = '#ffebee';
    stockBox.style.color = '#c62828';
  } else {
    stockBox.innerHTML =
      `Current Stock: ${currentStock} ${item.unit || ''}`;
    stockBox.style.background = '#e8f5e9';
    stockBox.style.color = '#2e7d32';
  }
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

searchInput.addEventListener('input', () => {
  const keyword = searchInput.value.toLowerCase();

  const filtered = allItems.filter(item =>
    (item.code || '').toLowerCase().includes(keyword) ||
    (item.name || '').toLowerCase().includes(keyword) ||
    (item.category || '').toLowerCase().includes(keyword)
  );

  renderItems(filtered);
});

function renderRecentTransactions(records) {
  const container = document.getElementById('recentList');

  if (!records.length) {
    container.innerHTML = 'No records yet.';
    return;
  }

  container.innerHTML = '';

  records.forEach(r => {
    container.innerHTML += `
      <div style="
        padding:10px;
        margin-bottom:10px;
        background:white;
        border-radius:10px;
      ">
        <b>${r.type}</b>
        - ${r.itemCode}
        - ${r.itemName}
        <br>
        Qty: ${r.qty}
        <br>
        Technician: ${r.technician || '-'}
      </div>
    `;
  });
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
    <div style="
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:10px;
    ">
      <div style="
        background:white;
        padding:12px;
        border-radius:10px;
      ">
        <b>Total Items</b><br>
        ${data.totalItems || 0}
      </div>

      <div style="
        background:#ffebee;
        padding:12px;
        border-radius:10px;
        color:#c62828;
      ">
        <b>Low Stock</b><br>
        ${data.lowStockItems || 0}
      </div>

      <div style="
        background:#e8f5e9;
        padding:12px;
        border-radius:10px;
        color:#2e7d32;
      ">
        <b>Today IN</b><br>
        ${data.todayIn || 0}
      </div>

      <div style="
        background:#e3f2fd;
        padding:12px;
        border-radius:10px;
        color:#1565c0;
      ">
        <b>Today OUT</b><br>
        ${data.todayOut || 0}
      </div>
    </div>
  `;
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

function toggleExportFilters() {
  const mode = document.getElementById('exportMode').value;
  const filters = document.getElementById('exportFilters');

  if (!filters) return;

  filters.style.display =
    mode === 'date' || mode === 'technician'
      ? 'block'
      : 'none';
}

function exportReport() {

  const mode =
    document.getElementById('exportMode').value;

  const selectedDate =
    document.getElementById('exportDate')?.value;

  const selectedTech =
    document.getElementById('exportTechnician')?.value;

  let records =
    window.allTransactions ||
    window.todayTransactions ||
    [];

  if (mode === 'today') {

    const today =
      new Date().toISOString().split('T')[0];

    records = records.filter(r => {

      const d =
        new Date(r.date)
        .toISOString()
        .split('T')[0];

      return d === today;

    });

  }

  if (mode === 'date') {

    if (!selectedDate) {
      alert('Please select date.');
      return;
    }

    records = records.filter(r => {

      const d =
        new Date(r.date)
        .toISOString()
        .split('T')[0];

      return d === selectedDate;

    });

  }

  if (mode === 'technician') {

    if (!selectedTech) {
      alert('Please select technician.');
      return;
    }

    records = records.filter(r =>
      r.technician === selectedTech
    );

  }

  if (mode === 'summary') {
    exportSummaryReport(records);
    return;
  }

  printTransactionReport(records, mode);

}

function printTransactionReport(records, mode) {

  let html = `
    <html>
    <head>
      <title>Lienta Inventory Report</title>

      <style>

        body {
          font-family: Arial;
          padding: 24px;
        }

        h2 {
          margin-bottom: 10px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          font-size: 12px;
        }

        th {
          background: #f1f3f4;
        }

      </style>

    </head>

    <body>

      <h2>
        Lienta Inventory Report
      </h2>

      <p>
        Report Type: ${mode}
      </p>

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

  records.forEach(r => {

    html += `
      <tr>

        <td>
          ${formatReportDate(r.date)}
        </td>

        <td>
          ${r.type || ''}
        </td>

        <td>
          ${r.itemCode || ''} - ${r.itemName || ''}
        </td>

        <td>
          ${r.qty || ''}
        </td>

        <td>
          ${r.technician || ''}
        </td>

        <td>
          ${r.jobNo || ''}
        </td>

        <td>
          ${r.remark || ''}
        </td>

        <td>
          ${r.submittedBy || ''}
        </td>

      </tr>
    `;

  });

  html += `
      </table>

    </body>
    </html>
  `;

  const w =
    window.open('', '_blank');

  w.document.write(html);

  w.document.close();

  w.print();

}

function exportSummaryReport(records) {

  const summary = {};

  records.forEach(r => {

    if (!r.technician) return;

    if (
      r.type === 'IN' ||
      r.type === 'RETURN'
    ) return;

    const tech = r.technician;

    if (!summary[tech]) {
      summary[tech] = 0;
    }

    summary[tech] +=
      Number(r.qty) || 0;

  });

  let html = `
    <html>

    <head>

      <title>
        Lienta Summary Report
      </title>

      <style>

        body {
          font-family: Arial;
          padding: 24px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          font-size: 12px;
        }

        th {
          background: #f1f3f4;
        }

      </style>

    </head>

    <body>

      <h2>
        Technician Summary Report
      </h2>

      <table>

        <tr>
          <th>Technician</th>
          <th>Total Qty Used</th>
        </tr>
  `;

  Object.keys(summary).forEach(tech => {

    html += `
      <tr>

        <td>
          ${tech}
        </td>

        <td>
          ${summary[tech]}
        </td>

      </tr>
    `;

  });

  html += `
      </table>

    </body>

    </html>
  `;

  const w =
    window.open('', '_blank');

  w.document.write(html);

  w.document.close();

  w.print();

}

function formatReportDate(dateValue) {

  if (!dateValue) return '';

  const d =
    new Date(dateValue);

  if (isNaN(d)) {
    return dateValue;
  }

  return d.toLocaleDateString('en-GB');

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
    html += `
      <tr>
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
function selectType(btn) {

  const val = btn.dataset.val;

  document.getElementById('type').value = val;

  document.querySelectorAll('.type-btn').forEach(b => {
    b.className = 'type-btn';

    if (b === btn) {

      if (val === 'IN') {
        b.className += ' active-in';

      } else if (val === 'OUT') {
        b.className += ' active-out';

      } else if (val === 'RETURN') {
        b.className += ' active-ret';

      } else if (val === 'ADJUST_IN') {
        b.className += ' active-adj-in';

      } else if (val === 'ADJUST_OUT') {
        b.className += ' active-adj-out';
      }
    }
  });

  updateTypeBadge();
}
