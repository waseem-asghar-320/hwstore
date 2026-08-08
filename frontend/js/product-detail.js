let currentProduct = null;
let selectedQuantity = 1;

document.addEventListener('DOMContentLoaded', () => {
  initNavToggle();
  loadProduct();
  initModals();
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

function getProductId() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  return id ? id.trim() : null;
}

function isValidObjectId(id) {
  return /^[a-f\d]{24}$/i.test(id);
}

async function loadProduct() {
  const container = document.getElementById('productDetail');
  const productId = getProductId();

  if (!productId) {
    container.innerHTML =
      '<p class="error-message">No product selected. <a href="index.html">Go back to shop</a></p>';
    return;
  }

  if (!isValidObjectId(productId)) {
    container.innerHTML =
      '<p class="error-message">Invalid product link. <a href="index.html">Go back to shop</a></p>';
    return;
  }

  showLoading(container);

  try {
    const response = await fetch(`${API_BASE_URL}/products/${encodeURIComponent(productId)}`);

    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error(
        'Could not reach the server. Run the backend (npm start) and open http://127.0.0.1:5001'
      );
    }

    if (!response.ok) {
      throw new Error(result.message || 'Product not found');
    }

    currentProduct = result.data;
    renderProduct(currentProduct);
  } catch (error) {
    container.innerHTML = `<p class="error-message">${escapeHtml(error.message)}. <a href="index.html">Go back to shop</a></p>`;
    showToast(error.message, 'error');
  }
}

function renderProduct(product) {
  const container = document.getElementById('productDetail');
  const rawImages = Array.isArray(product.images) ? product.images : [];
  const images = rawImages
    .map((img) => getImageUrl(img))
    .filter(Boolean);
  const fallbackImage = 'https://via.placeholder.com/600x600/111111/888888?text=No+Image';
  const mainImage = images[0] || fallbackImage;

  const thumbnails = images
    .map(
      (img, i) =>
        `<button type="button" class="thumbnail-btn ${i === 0 ? 'active' : ''}" data-src="${img}" ari00000000000000000000a-label="Show image ${i + 1}">
          <img src="${img}" alt="Thumbnail ${i + 1}" class="thumbnail" onerror="this.src='${fallbackImage}'">
        </button>`
    )
    .join('');

  container.innerHTML = `
    <div class="product-detail-grid">
      <div class="product-gallery">
        <div class="main-image">
          <img id="mainImage" src="${mainImage}" alt="${escapeHtml(product.name)}"
            onerror="this.src='${fallbackImage}'">
        </div>
        ${images.length > 1 ? `<div class="thumbnail-list">${thumbnails}</div>` : ''}
      </div>
      <div class="product-info">
        <span class="product-brand">${escapeHtml(product.brand)}</span>
        <h1>${escapeHtml(product.name)}</h1>
        <span class="product-category">${escapeHtml(product.category)}</span>
        <p class="product-detail-price">${product.discountPrice && product.discountPrice < product.price ? `<span class="product-sale-price">${formatPrice(product.discountPrice)}</span> <span class="product-original-price">${formatPrice(product.price)}</span>` : formatPrice(product.price)}</p>
        <p class="product-description">${escapeHtml(product.description)}</p>
        <p class="product-stock ${product.stock > 0 ? 'in-stock' : 'out-of-stock'}">
          ${product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
        </p>
        <div class="quantity-selector">
          <label for="quantity">Quantity:</label>
          <div class="quantity-controls">
            <button type="button" class="qty-btn" id="qtyMinus">−</button>
            <input type="number" id="quantity" value="1" min="1" max="${Math.min(10, product.stock || 1)}" readonly>
            <button type="button" class="qty-btn" id="qtyPlus">+</button>
          </div>
        </div>
        <div class="product-actions">
          <a href="${getWhatsAppLink(product.name, product.price)}" target="_blank" rel="noopener" class="btn btn-primary">
            Buy on WhatsApp
          </a>
          <button class="btn btn-secondary" id="codBtn" ${product.stock <= 0 ? 'disabled' : ''}>
            Place Order (COD)
          </button>
        </div>
      </div>
    </div>
  `;

  document.querySelectorAll('.thumbnail-btn').forEach((thumbButton) => {
    thumbButton.addEventListener('click', () => {
      const mainImageElement = document.getElementById('mainImage');
      const nextSrc = thumbButton.dataset.src;
      if (mainImageElement && nextSrc) {
        mainImageElement.src = nextSrc;
      }
      document.querySelectorAll('.thumbnail-btn').forEach((button) => button.classList.remove('active'));
      thumbButton.classList.add('active');
    });
  });

  const qtyMinus = document.getElementById('qtyMinus');
  const qtyPlus = document.getElementById('qtyPlus');
  const codBtn = document.getElementById('codBtn');

  if (qtyMinus) qtyMinus.addEventListener('click', () => updateQuantity(-1));
  if (qtyPlus) qtyPlus.addEventListener('click', () => updateQuantity(1));
  if (codBtn) codBtn.addEventListener('click', openOrderModal);
}

function updateQuantity(delta) {
  const input = document.getElementById('quantity');
  const max = parseInt(input.max, 10);
  let val = parseInt(input.value, 10) + delta;
  if (val < 1) val = 1;
  if (val > max) val = max;
  input.value = val;
  selectedQuantity = val;
}

function initModals() {
  document.querySelectorAll('.modal-close').forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.closest('.modal').classList.remove('open');
    });
  });

  document.querySelectorAll('.modal').forEach((modal) => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('open');
    });
  });

  const orderForm = document.getElementById('orderForm');
  if (orderForm) {
    orderForm.addEventListener('submit', handleOrderSubmit);
  }
}

function openOrderModal() {
  selectedQuantity = parseInt(document.getElementById('quantity').value, 10);
  document.getElementById('orderQuantity').value = selectedQuantity;
  document.getElementById('orderModal').classList.add('open');
}

async function handleOrderSubmit(e) {
  e.preventDefault();

  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Placing Order...';

  const orderData = {
    productId: currentProduct._id,
    customerName: document.getElementById('customerName').value.trim(),
    customerPhone: document.getElementById('customerPhone').value.trim(),
    customerAddress: document.getElementById('customerAddress').value.trim(),
    quantity: parseInt(document.getElementById('orderQuantity').value, 10),
    notes: document.getElementById('orderNotes').value.trim(),
  };

  try {
    const response = await fetch(`${API_BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to place order');
    }

    document.getElementById('orderModal').classList.remove('open');
    document.getElementById('orderForm').reset();

    const order = result.data;
    document.getElementById('orderSuccessDetails').innerHTML = `
      <div class="success-details">
        <p><strong>Order ID:</strong> ${order._id}</p>
        <p><strong>Product:</strong> ${escapeHtml(order.productName)}</p>
        <p><strong>Quantity:</strong> ${order.quantity}</p>
        <p><strong>Total:</strong> ${formatPrice(order.totalPrice)}</p>
        <p><strong>Status:</strong> ${order.orderStatus}</p>
        <p class="success-note">We will contact you shortly to confirm your order.</p>
      </div>
    `;
    document.getElementById('successModal').classList.add('open');
    showToast('Order placed successfully!', 'success');
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Order';
  }
}
