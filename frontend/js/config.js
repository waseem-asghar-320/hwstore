function resolveServerBaseUrl() {
  const { protocol, hostname, port, origin } = window.location;

  if (protocol === 'file:') {
    return 'http://127.0.0.1:5001';
  }

  const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';
  const isBackendServer = isLocalHost && (port === '5001' || port === '');

  if (isBackendServer) {
    return origin;
  }

  if (isLocalHost) {
    return 'http://127.0.0.1:5001';
  }

  return origin;
}

const SERVER_BASE_URL = resolveServerBaseUrl();
const API_BASE_URL = SERVER_BASE_URL === window.location.origin ? '/api' : `${SERVER_BASE_URL}/api`;

const WHATSAPP_NUMBER = '923014887362';

function getImageUrl(imagePath) {
  if (!imagePath) return '';
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  return `${SERVER_BASE_URL}${imagePath.startsWith('/') ? imagePath : `/${imagePath}`}`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
}

function showToast(message, type = 'success') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = `toast toast-${type} show`;
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

function showLoading(container) {
  container.innerHTML = '<div class="loading-spinner"></div>';
}

function formatPrice(price) {
  return `Rs. ${Number(price).toLocaleString('en-PK')}`;
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-PK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getWhatsAppLink(productName, price) {
  const text = encodeURIComponent(`I want to buy ${productName} for Rs.${price}`);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
}

function goToProduct(productId) {
  if (!productId) return;
  window.location.href = `product.html?id=${encodeURIComponent(productId)}`;
}

function showFileProtocolWarning() {
  if (window.location.protocol !== 'file:') return;

  const banner = document.createElement('div');
  banner.className = 'file-protocol-warning';
  banner.innerHTML =
    'You opened this site as a file. Start the backend with <strong>npm start</strong> and open <a href="http://127.0.0.1:5001">http://127.0.0.1:5001</a> in your browser.';
  document.body.prepend(banner);
}

document.addEventListener('DOMContentLoaded', showFileProtocolWarning);
