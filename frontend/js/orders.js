let allOrders = [];
let currentFilter = 'all';

const ORDER_FILTERS = {
  all: { label: 'All Orders', days: null },
  ten: { label: 'Last 10 Days', days: 10 },
  twenty: { label: 'Last 20 Days', days: 20 },
  month: { label: '1 Month', days: 30 },
};

document.addEventListener('DOMContentLoaded', () => {
  initNavToggle();
  fetchOrders();
});

function initNavToggle() {
  const toggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (toggle && navLinks) {
    toggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
      toggle.classList.toggle('active');
    });

    navLinks.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        toggle.classList.remove('active');
      });
    });

    document.addEventListener('click', (event) => {
      if (!navLinks.contains(event.target) && !toggle.contains(event.target)) {
        navLinks.classList.remove('open');
        toggle.classList.remove('active');
      }
    });
  }
}

async function fetchOrders() {
  const container = document.getElementById('ordersContainer');
  showLoading(container);

  try {
    const response = await fetch(`${API_BASE_URL}/orders`);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to fetch orders');
    }

    allOrders = result.data || [];
    renderOrders(allOrders, currentFilter);
  } catch (error) {
    container.innerHTML = `<p class="error-message">${error.message}</p>`;
    showToast(error.message, 'error');
  }
}

function setOrderFilter(filter) {
  currentFilter = filter;
  renderOrders(allOrders, filter);
}

function filterOrders(orders, filter) {
  const config = ORDER_FILTERS[filter] || ORDER_FILTERS.all;
  if (!config.days) {
    return orders;
  }

  const threshold = new Date();
  threshold.setDate(threshold.getDate() - config.days);

  return orders.filter((order) => {
    const orderDate = new Date(order.orderDate);
    return orderDate >= threshold;
  });
}

function updateOrderStats(orders) {
  const total = orders.length;
  const pending = orders.filter(o => o.orderStatus === 'Pending' || o.orderStatus === 'Processing').length;
  const completed = orders.filter(o => o.orderStatus === 'Delivered' || o.orderStatus === 'Completed').length;


  document.getElementById('totalOrders').textContent = total;
  document.getElementById('pendingOrders').textContent = pending;
  document.getElementById('completedOrders').textContent = completed;

}

function getStatusClass(status) {
  const map = {
    'Pending': 'status-pending',
    'Processing': 'status-processing',
    'Delivered': 'status-completed',
    'Completed': 'status-completed',
    'Cancelled': 'status-cancelled'
  };
  return map[status] || 'status-pending';
}

function renderOrders(orders, filter = currentFilter) {
  const container = document.getElementById('ordersContainer');
  const filteredOrders = filterOrders(orders, filter);
  const summaryConfig = ORDER_FILTERS[filter] || ORDER_FILTERS.all;
  const totalRevenue = filteredOrders.reduce((sum, order) => sum + Number(order.totalPrice || 0), 0);
  const statusOptions = ['Pending', 'Processing', 'Delivered', 'Cancelled'];

  // Update stats
  updateOrderStats(orders);

  // Filter buttons
  const filterButtons = Object.entries(ORDER_FILTERS)
    .map(([key, config]) => {
      const activeClass = filter === key ? 'active' : '';
      return `<button class="filter-chip ${activeClass}" onclick="setOrderFilter('${key}')">${config.label}</button>`;
    })
    .join('');

  if (filteredOrders.length === 0) {
    container.innerHTML = `
      <div class="filter-group">
        ${filterButtons}
        <span class="filter-result">0 orders found</span>
      </div>
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <h3>No orders found</h3>
        <p>No orders match the current filter criteria.</p>
      </div>
    `;
    return;
  }

  // Build order cards
  const orderCards = filteredOrders.map((order) => {
    const statusClass = getStatusClass(order.orderStatus);
    const options = statusOptions
      .map((s) => `<option value="${s}" ${order.orderStatus === s ? 'selected' : ''}>${s}</option>`)
      .join('');

    return `
      <div class="order-card">
        <div class="order-card-header">
          <div class="order-id-wrapper">
            <span class="order-label">Order</span>
            <span class="order-id">#${order._id.slice(-8).toUpperCase()}</span>
          </div>
          <div class="order-header-right">
            <span class="order-date">${formatDate(order.orderDate)}</span>
            <span class="status-badge ${statusClass}">${order.orderStatus}</span>
          </div>
        </div>
        
        <div class="order-card-body">
          <div class="order-product-info">
            <div class="product-detail">
              <span class="detail-label">Product</span>
              <span class="detail-value product-name">${order.productName}</span>
            </div>
            <div class="product-detail">
              <span class="detail-label">Quantity</span>
              <span class="detail-value">×${order.quantity}</span>
            </div>
            <div class="product-detail">
              <span class="detail-label">Total</span>
              <span class="detail-value order-total">${formatPrice(order.totalPrice)}</span>
            </div>
          </div>
          
          <div class="order-customer-info">
            <div class="customer-detail">
              <span class="detail-label">Customer</span>
              <span class="detail-value">${order.customerName}</span>
            </div>
            <div class="customer-detail">
              <span class="detail-label">Phone</span>
              <span class="detail-value">${order.customerPhone}</span>
            </div>
            <div class="customer-detail full-width">
              <span class="detail-label">Delivery Address</span>
              <span class="detail-value address">${order.customerAddress}</span>
            </div>
          </div>
        </div>
        
        <div class="order-card-footer">
          <div class="order-actions">
            <select class="status-select" onchange="updateStatus('${order._id}', this.value)">
              ${options}
            </select>
            <button class="btn-delete" onclick="deleteOrder('${order._id}')" title="Delete order">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="filter-group">
      ${filterButtons}
      <span class="filter-result">${filteredOrders.length} orders found</span>
    </div>

    <div class="summary-strip">
      <div class="summary-card">
        <span class="summary-label">Revenue (${summaryConfig.label})</span>
        <div class="summary-value">${formatPrice(totalRevenue)}</div>
      </div>
      <div class="summary-card">
        <span class="summary-label">Orders (${summaryConfig.label})</span>
        <div class="summary-value">${filteredOrders.length}</div>
      </div>
    </div>

    <div class="orders-grid">
      ${orderCards}
    </div>
  `;
}

async function updateStatus(orderId, status) {
  try {
    const response = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to update status');
    }

    showToast('Order status updated!', 'success');
    fetchOrders();
  } catch (error) {
    showToast(error.message, 'error');
    fetchOrders();
  }
}

async function deleteOrder(orderId) {
  if (!confirm('Are you sure you want to delete this order?')) return;

  try {
    const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, { method: 'DELETE' });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to delete order');
    }

    showToast('Order deleted successfully!', 'success');
    fetchOrders();
  } catch (error) {
    showToast(error.message, 'error');
  }
}