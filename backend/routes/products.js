const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');

router.get('/', getAllProducts);
router.get('/:id', getProductById);
router.post('/', upload.array('images', 20), createProduct);
router.put('/:id', upload.array('images', 20), updateProduct);
router.delete('/:id', deleteProduct);

module.exports = router;
