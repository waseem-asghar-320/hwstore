let editingProductId = null;
let existingImages = [];
let pendingUploadFiles = [];

document.addEventListener('DOMContentLoaded', () => {
  initNavToggle();
  fetchAdminProducts();
  initProductForm();
  initImageUpload();
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

function mergeUploadFiles(existingFiles, newFiles) {
  const combined = [...existingFiles, ...newFiles];
  const uniqueFiles = [];
  const seen = new Set();

  combined.forEach((file) => {
    const key = `${file.name}-${file.size}-${file.lastModified}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueFiles.push(file);
    }
  });

  return uniqueFiles;
}

function syncFileInput(fileInput, files) {
  const dataTransfer = new DataTransfer();
  files.forEach((file) => dataTransfer.items.add(file));
  fileInput.files = dataTransfer.files;
}

function initImageUpload() {
  const fileInput = document.getElementById('images');
  const dropZone = document.getElementById('imageDropZone');

  fileInput.addEventListener('change', (event) => {
    const newlySelected = Array.from(event.target.files || []).filter((file) => file.type.startsWith('image/'));
    pendingUploadFiles = mergeUploadFiles(pendingUploadFiles, newlySelected);
    syncFileInput(fileInput, pendingUploadFiles);
    renderNewImagePreviews(fileInput.files);
  });

  dropZone.addEventListener('click', () => fileInput.click());

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');

    const droppedFiles = Array.from(e.dataTransfer.files || []).filter((file) => file.type.startsWith('image/'));
    pendingUploadFiles = mergeUploadFiles(pendingUploadFiles, droppedFiles);
    syncFileInput(fileInput, pendingUploadFiles);
    renderNewImagePreviews(fileInput.files);
  });
}

function renderNewImagePreviews(files) {
  const preview = document.getElementById('newImagePreview');
  preview.innerHTML = '';

  Array.from(files).forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const item = document.createElement('div');
      item.className = 'preview-item';

      const img = document.createElement('img');
      img.src = e.target.result;
      img.className = 'preview-thumb';
      img.alt = file.name;

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'remove-preview-btn';
      removeBtn.innerHTML = '&times;';
      removeBtn.title = 'Remove image';
      removeBtn.addEventListener('click', () => {
        pendingUploadFiles = pendingUploadFiles.filter((_, i) => i !== index);
        syncFileInput(document.getElementById('images'), pendingUploadFiles);
        renderNewImagePreviews(document.getElementById('images').files);
      });

      item.appendChild(img);
      item.appendChild(removeBtn);
      preview.appendChild(item);
    };
    reader.readAsDataURL(file);
  });
}

function renderExistingImages() {
  const container = document.getElementById('existingImagesPreview');
  container.innerHTML = '';

  existingImages.forEach((imgPath, index) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'existing-image-item';
    wrapper.innerHTML = `
      <img src="${getImageUrl(imgPath)}" alt="Product image ${index + 1}" class="preview-thumb">
      <button type="button" class="remove-image-btn" data-index="${index}" title="Remove image">&times;</button>
    `;
    container.appendChild(wrapper);
  });

  container.querySelectorAll('.remove-image-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index, 10);
      existingImages.splice(idx, 1);
      renderExistingImages();
    });
  });
}

async function fetchAdminProducts() {
  const list = document.getElementById('adminProductsList');
  showLoading(list);

  try {
    const response = await fetch(`${API_BASE_URL}/products`);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to fetch products');
    }

    renderAdminProducts(result.data || []);
  } catch (error) {
    list.innerHTML = `<p class="error-message">${escapeHtml(error.message)}</p>`;
    showToast(error.message, 'error');
  }
}

function renderAdminProducts(products) {
  const list = document.getElementById('adminProductsList');

  if (products.length === 0) {
    list.innerHTML = '<p class="empty-message">No products yet. Add your first product above.</p>';
    return;
  }

  list.innerHTML = products
    .map((product) => {
      const imageUrl = getImageUrl(product.images?.[0]);
      return `
    <div class="admin-product-item">
      <div class="admin-product-info">
        <img src="${imageUrl}" alt="${escapeHtml(product.name)}"
          onerror="this.src='https://via.placeholder.com/60x60/111111/888888?text=No+Image'">
        <div>
          <h4><button type="button" class="product-link" data-view-id="${product._id}">${escapeHtml(product.name)}</button></h4>
          <p>${escapeHtml(product.brand)} · ${formatPrice(product.price)} · Stock: ${product.stock}</p>
        </div>
      </div>
      <div class="admin-product-actions">
        <button type="button" class="btn btn-small btn-secondary" data-edit-id="${product._id}">Edit</button>
        <button type="button" class="btn btn-small btn-danger" data-delete-id="${product._id}" data-delete-name="${escapeHtml(product.name)}">Delete</button>
      </div>
    </div>
  `;
    })
    .join('');

  list.querySelectorAll('[data-edit-id]').forEach((btn) => {
    btn.addEventListener('click', () => editProduct(btn.dataset.editId));
  });

  list.querySelectorAll('[data-delete-id]').forEach((btn) => {
    btn.addEventListener('click', () => deleteProduct(btn.dataset.deleteId, btn.dataset.deleteName));
  });

  list.querySelectorAll('[data-view-id]').forEach((btn) => {
    btn.addEventListener('click', () => goToProduct(btn.dataset.viewId));
  });
}

function initProductForm() {
  const form = document.getElementById('productForm');
  const cancelBtn = document.getElementById('cancelBtn');

  form.addEventListener('submit', handleFormSubmit);
  cancelBtn.addEventListener('click', resetForm);
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const submitBtn = document.getElementById('submitBtn');
  const fileInput = document.getElementById('images');
  const isEditing = !!editingProductId;

  if (!isEditing && fileInput.files.length === 0) {
    showToast('Please upload at least one product image from your computer', 'error');
    return;
  }

  if (isEditing && existingImages.length === 0 && fileInput.files.length === 0) {
    showToast('Please keep or upload at least one product image', 'error');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = isEditing ? 'Updating...' : 'Uploading...';

  const formData = new FormData();
  formData.append('name', document.getElementById('name').value.trim());
  formData.append('brand', document.getElementById('brand').value.trim());
  formData.append('category', document.getElementById('category').value.trim());
  formData.append('price', document.getElementById('price').value);
  formData.append('discountPrice', document.getElementById('discountPrice').value || '0');
  formData.append('stock', document.getElementById('stock').value || '1');
  formData.append('description', document.getElementById('description').value.trim());

  if (isEditing) {
    formData.append('existingImages', JSON.stringify(existingImages));
  }

  Array.from(fileInput.files).forEach((file) => {
    formData.append('images', file);
  });

  const url = isEditing
    ? `${API_BASE_URL}/products/${editingProductId}`
    : `${API_BASE_URL}/products`;
  const method = isEditing ? 'PUT' : 'POST';

  try {
    const response = await fetch(url, {
      method,
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to save product');
    }

    showToast(isEditing ? 'Product updated successfully!' : 'Product added successfully!', 'success');
    resetForm();
    fetchAdminProducts();
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = isEditing ? 'Update Product' : 'Add Product';
  }
}

async function editProduct(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/products/${encodeURIComponent(id)}`);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to fetch product');
    }

    const product = result.data;
    editingProductId = product._id;
    existingImages = [...(product.images || [])];

    document.getElementById('productId').value = product._id;
    document.getElementById('name').value = product.name;
    document.getElementById('brand').value = product.brand;
    document.getElementById('category').value = product.category;
    document.getElementById('price').value = product.price;
    document.getElementById('discountPrice').value = product.discountPrice || '';
    document.getElementById('stock').value = product.stock;
    document.getElementById('description').value = product.description;
    pendingUploadFiles = [];
    const fileInput = document.getElementById('images');
    fileInput.value = '';
    syncFileInput(fileInput, []);
    fileInput.removeAttribute('required');

    renderExistingImages();
    document.getElementById('newImagePreview').innerHTML = '';

    document.getElementById('formTitle').textContent = 'Edit Product';
    document.getElementById('submitBtn').textContent = 'Update Product';
    document.getElementById('cancelBtn').style.display = 'inline-block';
    document.getElementById('imagesHint').textContent = 'Upload new images to add more (optional)';

    document.querySelector('.admin-form-card').scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function deleteProduct(id, name) {
  if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

  try {
    const response = await fetch(`${API_BASE_URL}/products/${id}`, { method: 'DELETE' });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to delete product');
    }

    showToast('Product deleted successfully!', 'success');
    if (editingProductId === id) resetForm();
    fetchAdminProducts();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function resetForm() {
  editingProductId = null;
  existingImages = [];
  pendingUploadFiles = [];
  document.getElementById('productForm').reset();
  document.getElementById('productId').value = '';
  const fileInput = document.getElementById('images');
  fileInput.value = '';
  syncFileInput(fileInput, []);
  fileInput.setAttribute('required', '');
  document.getElementById('existingImagesPreview').innerHTML = '';
  document.getElementById('newImagePreview').innerHTML = '';
  document.getElementById('formTitle').textContent = 'Add New Product';
  document.getElementById('submitBtn').textContent = 'Add Product';
  document.getElementById('cancelBtn').style.display = 'none';
  document.getElementById('imagesHint').textContent = 'Click or drag images here (JPG, PNG, WEBP — up to 20 images, 5MB each)';
}
