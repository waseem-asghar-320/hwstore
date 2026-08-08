const Product = require('../models/Product');
const cloudinary = require('../utils/cloudinary');

function parseImagesField(value) {
  if (!value) return [];

  if (Array.isArray(value)) return value;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function uploadImagesToCloudinary(files) {
  if (!files || files.length === 0) return [];

  const uploadPromises = files.map((file) => {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'hw-store/products',
          resource_type: 'image',
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
            });
          }
        }
      );

      stream.end(file.buffer);
    });
  });

  return Promise.all(uploadPromises);
}

async function deleteCloudinaryImage(image) {
  if (!image) return;

  // If the database contains the old local path, ignore it.
  if (image.startsWith('/uploads/')) return;

  try {
    const url = new URL(image);

    // Extract Cloudinary public_id from URL
    const parts = url.pathname.split('/');

    const uploadIndex = parts.indexOf('upload');

    if (uploadIndex === -1) return;

    let publicIdParts = parts.slice(uploadIndex + 1);

    // Remove transformation/version information
    if (publicIdParts[0] && /^v\d+$/.test(publicIdParts[0])) {
      publicIdParts.shift();
    }

    let publicId = publicIdParts.join('/');

    // Remove file extension
    publicId = publicId.replace(/\.[^/.]+$/, '');

    if (!publicId) return;

    await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
    });
  } catch (error) {
    console.error('Cloudinary delete error:', error.message);
  }
}

exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

exports.createProduct = async (req, res) => {
  try {
    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      return res.status(500).json({
        success: false,
        message: 'Cloudinary environment variables are not configured',
      });
    }

    const uploadedImages = await uploadImagesToCloudinary(req.files);

    if (uploadedImages.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one product image is required',
      });
    }

    const product = await Product.create({
      name: req.body.name,
      brand: req.body.brand,
      category: req.body.category,
      price: Number(req.body.price),
      discountPrice: Number(req.body.discountPrice || 0),
      description: req.body.description,
      stock: Number(req.body.stock) || 1,

      // Store Cloudinary URLs
      images: uploadedImages.map((image) => image.url),
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product,
    });
  } catch (error) {
    console.error('Create product error:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(
        (e) => e.message
      );

      return res.status(400).json({
        success: false,
        message: messages.join(', '),
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const existingImages = parseImagesField(req.body.existingImages);

    // Upload new images to Cloudinary
    const uploadedImages = await uploadImagesToCloudinary(req.files);

    const newImageUrls = uploadedImages.map(
      (image) => image.url
    );

    const images = [...existingImages, ...newImageUrls];

    if (images.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one product image is required',
      });
    }

    // Find images removed by the user
    const removedImages = product.images.filter(
      (img) => !existingImages.includes(img)
    );

    // Delete removed images from Cloudinary
    await Promise.all(
      removedImages.map(deleteCloudinaryImage)
    );

    product.name = req.body.name;
    product.brand = req.body.brand;
    product.category = req.body.category;
    product.price = Number(req.body.price);
    product.discountPrice = Number(req.body.discountPrice || 0);
    product.description = req.body.description;
    product.stock = Number(req.body.stock) || 1;
    product.images = images;

    await product.save();

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: product,
    });
  } catch (error) {
    console.error('Update product error:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID',
      });
    }

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(
        (e) => e.message
      );

      return res.status(400).json({
        success: false,
        message: messages.join(', '),
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Delete product images from Cloudinary
    await Promise.all(
      product.images.map(deleteCloudinaryImage)
    );

    await Product.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    console.error('Delete product error:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};