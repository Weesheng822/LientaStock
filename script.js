const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwDJjqkTffk1JutreTyODHqboBp1sdta3w-0wM1sQ6NPMnJQ-4ioI_Q6Tbo98lR7iq7/exec';

const itemSelect = document.getElementById('item');
const searchInput =
  document.getElementById('searchItem');

let allItems = [];

window.onload = function () {
  document
  .getElementById('type')
  .addEventListener('change', updateTypeBadge);
  itemSelect.addEventListener('change', showStock);
  loadItems();

  const today = new Date().toISOString().split('T')[0];
  document.getElementById('date').value = today;
  updateTypeBadge();
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
  if (
  document.getElementById('type').value === 'OUT' &&
  Number(qty) > Number(item.currentStock || 0)
) {
  alert(
    `Not enough stock.\n\nCurrent Stock: ${item.currentStock || 0} ${item.unit || ''}\nRequested OUT: ${qty}`
  );
  return;
}
  
  const confirmSubmit = confirm(
  `Confirm submit?\n\nType: ${document.getElementById('type').value}\nItem: ${item.code} - ${item.name}\nQty: ${qty}`
);

if (!confirmSubmit) {
  return;
}
  if (
  document.getElementById('submittedBy').value === 'Other' &&
  !document.getElementById('otherSubmitter').value.trim()
) {
  alert('Please enter name for Other.');
  return;
}
  const submittedByValue =
  document.getElementById('submittedBy').value === 'Other'
    ? document.getElementById('otherSubmitter').value
    : document.getElementById('submittedBy').value;

if (
  (
    document.getElementById('type').value === 'ADJUST_IN' ||
    document.getElementById('type').value === 'ADJUST_OUT'
  ) &&
  submittedByValue !== 'Wilson' &&
  submittedByValue !== 'Office'
) {
  alert('Only Wilson or Office can use ADJUST.');
  return;
}
  if (
  document.getElementById('type').value === 'ADJUST'
) {

  const password =
    document.getElementById('adjustPassword').value;

  const ADMIN_PASSWORD = 'Lienta@0615';

  if (password !== ADMIN_PASSWORD) {

    alert('Invalid admin password.');

    return;
  }

}

  const payload = {
    date: document.getElementById('date').value,
    type: document.getElementById('type').value,
    itemCode: item.code,
    itemName: item.name,
    qty: qty,
    technician: document.getElementById('technician').value,
    jobNo: document.getElementById('jobNo').value,
    remark: document.getElementById('remark').value,
    submittedBy:
  document.getElementById('submittedBy').value === 'Other'
    ? document.getElementById('otherSubmitter').value
    : document.getElementById('submittedBy').value
  };

  await fetch(WEB_APP_URL, {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  document.getElementById('successMsg').style.display = 'block';
  
  loadItems();
  
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

document.getElementById('stockInfo').innerHTML = 'Current Stock: -';
document.getElementById('stockInfo').style.background = '#f1f3f4';
document.getElementById('stockInfo').style.color = '#000';

document.getElementById('type').value = 'IN';
updateTypeBadge();

renderItems(allItems);

  document.getElementById('item').value = '';
  document.getElementById('qty').value = '';
  document.getElementById('jobNo').value = '';
  document.getElementById('remark').value = '';

  setTimeout(() => {
    document.getElementById('successMsg').style.display = 'none';
  }, 3000);
}
async function showStock() {

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
  const badge = document.getElementById('typeBadge');
  const passwordSection = document.getElementById('adjustPasswordSection');

  if (type === 'ADJUST_IN' || type === 'ADJUST_OUT') {
    passwordSection.style.display = 'block';
  } else {
    passwordSection.style.display = 'none';
    document.getElementById('adjustPassword').value = '';
  }

  if (type === 'IN') {
    badge.innerHTML = 'IN STOCK';
    badge.style.background = '#e8f5e9';
    badge.style.color = '#2e7d32';
  } else if (type === 'OUT') {
    badge.innerHTML = 'OUT STOCK';
    badge.style.background = '#ffebee';
    badge.style.color = '#c62828';
  } else if (type === 'RETURN') {
    badge.innerHTML = 'RETURN STOCK';
    badge.style.background = '#e3f2fd';
    badge.style.color = '#1565c0';
  } else if (type === 'ADJUST_IN') {
    badge.innerHTML = 'ADJUST IN - ADMIN ONLY';
    badge.style.background = '#fff3e0';
    badge.style.color = '#ef6c00';
  } else if (type === 'ADJUST_OUT') {
    badge.innerHTML = 'ADJUST OUT - ADMIN ONLY';
    badge.style.background = '#ffebee';
    badge.style.color = '#c62828';
  }
}
document
  .getElementById('submittedBy')
  .addEventListener('change', toggleOtherSubmitter);

function toggleOtherSubmitter() {

  const submittedBy =
    document.getElementById('submittedBy').value;

  const otherInput =
    document.getElementById('otherSubmitter');

  if (submittedBy === 'Other') {
    otherInput.style.display = 'block';
  } else {
    otherInput.style.display = 'none';
  }
}
function renderItems(items) {

  itemSelect.innerHTML =
    '<option value=\"\">Select Item</option>';

  items.forEach(item => {

    const option =
      document.createElement('option');

    option.value = JSON.stringify(item);

    option.textContent =
      `${item.code} - ${item.name}`;

    itemSelect.appendChild(option);

  });

}

searchInput.addEventListener('input', () => {

  const keyword =
    searchInput.value.toLowerCase();

  const filtered = allItems.filter(item =>

    item.code.toLowerCase().includes(keyword) ||

    item.name.toLowerCase().includes(keyword) ||

    item.category.toLowerCase().includes(keyword)

  );

  renderItems(filtered);

});
function renderRecentTransactions(records) {

  const container =
    document.getElementById('recentList');

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
        Technician: ${r.technician}
      </div>
    `;

  });

}
function toggleDashboard() {

  const panel =
    document.getElementById('dashboardPanel');

  if (panel.style.display === 'none') {
    panel.style.display = 'block';
  } else {
    panel.style.display = 'none';
  }

}

function renderDashboard(data) {

  document.getElementById('dashboardContent')
    .innerHTML = `

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
          ${data.totalItems}
        </div>

        <div style="
          background:#ffebee;
          padding:12px;
          border-radius:10px;
          color:#c62828;
        ">
          <b>Low Stock</b><br>
          ${data.lowStockItems}
        </div>

        <div style="
          background:#e8f5e9;
          padding:12px;
          border-radius:10px;
          color:#2e7d32;
        ">
          <b>Today IN</b><br>
          ${data.todayIn}
        </div>

        <div style="
          background:#e3f2fd;
          padding:12px;
          border-radius:10px;
          color:#1565c0;
        ">
          <b>Today OUT</b><br>
          ${data.todayOut}
        </div>

      </div>

    `;
}
function renderTechnicians(technicians) {

  const technicianSelect =
    document.getElementById('technician');

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
}
function exportDailyReport() {

  const records =
    window.todayTransactions || [];

  let html = `
    <html>
    <head>
      <title>Daily Inventory Report</title>
      <style>
        body {
          font-family: Arial;
          padding: 20px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th, td {
          border: 1px solid #ccc;
          padding: 8px;
          font-size: 12px;
        }

        th {
          background: #f1f3f4;
        }

        h1 {
          margin-bottom: 20px;
        }
      </style>
    </head>
    <body>

      <h1>
        Lienta Daily Inventory Report
      </h1>

      <table>

        <tr>
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
        <td>${r.type}</td>
        <td>${r.itemCode} - ${r.itemName}</td>
        <td>${r.qty}</td>
        <td>${r.technician}</td>
        <td>${r.jobNo}</td>
        <td>${r.remark}</td>
        <td>${r.submittedBy}</td>
      </tr>
    `;

  });

  html += `
      </table>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');

  printWindow.document.write(html);

  printWindow.document.close();

  printWindow.print();

}