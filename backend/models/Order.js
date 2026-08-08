const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product ID is required'],
  },
  productName: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
  },
  customerName: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true,
  },
  customerPhone: {
    type: String,
    required: [true, 'Customer phone is required'],
    trim: true,
  },
  customerAddress: {
    type: String,
    required: [true, 'Customer address is required'],
    trim: true,
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    default: 1,
    min: [1, 'Quantity must be at least 1'],
  },
  totalPrice: {
    type: Number,
    required: [true, 'Total price is required'],
    min: [0, 'Total price cannot be negative'],
  },
  orderStatus: {
    type: String,
    enum: ['Pending', 'Processing', 'Delivered', 'Cancelled'],
    default: 'Pending',
  },
  notes: {
    type: String,
    trim: true,
    default: '',
  },
  orderDate: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Order', orderSchema);
