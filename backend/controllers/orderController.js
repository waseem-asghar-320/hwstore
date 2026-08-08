const Order = require('../models/Order');
const Product = require('../models/Product');

exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ orderDate: -1 });
    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.createOrder = async (req, res) => {
  try {
    const { productId, customerName, customerPhone, customerAddress, quantity, notes } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const orderQuantity = quantity || 1;
    if (orderQuantity > product.stock) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Only ${product.stock} item(s) available`,
      });
    }

    const unitPrice = product.discountPrice && product.discountPrice > 0 && product.discountPrice < product.price
      ? product.discountPrice
      : product.price;
    const totalPrice = unitPrice * orderQuantity;

    const order = await Order.create({
      productId: product._id,
      productName: product.name,
      customerName,
      customerPhone,
      customerAddress,
      quantity: orderQuantity,
      totalPrice,
      notes: notes || '',
    });

    product.stock -= orderQuantity;
    await product.save();

    res.status(201).json({ success: true, message: 'Order placed successfully', data: order });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid product ID' });
    }
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Pending', 'Processing', 'Delivered', 'Cancelled'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    order.orderStatus = status;
    await order.save();

    res.status(200).json({ success: true, message: 'Order status updated', data: order });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid order ID' });
    }
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    res.status(200).json({ success: true, message: 'Order deleted successfully' });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid order ID' });
    }
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
