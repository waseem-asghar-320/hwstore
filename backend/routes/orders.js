const express = require('express');
const router = express.Router();
const {
  getAllOrders,
  createOrder,
  updateOrderStatus,
  deleteOrder,
} = require('../controllers/orderController');

router.get('/', getAllOrders);
router.post('/', createOrder);
router.put('/:id/status', updateOrderStatus);
router.delete('/:id', deleteOrder);

module.exports = router;
