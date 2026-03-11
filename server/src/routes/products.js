import express from 'express';
import { authenticate, optionalAuth } from '../middlewares/auth.js';
import { requireEmployeeOrAdmin, checkProductOwnership } from '../middlewares/rbac.js';
import { productImageUpload, productModelUpload } from '../utils/upload.js';
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
  uploadProductModel,
} from '../controllers/productController.js';

const router = express.Router();

// Public routes (with optional auth for filtering)
router.get('/', optionalAuth, getProducts);
router.get('/:id', optionalAuth, getProduct);

// Protected routes - require employee or admin
router.post('/', authenticate, requireEmployeeOrAdmin, createProduct);
router.post('/upload-image', authenticate, requireEmployeeOrAdmin, productImageUpload.single('image'), uploadProductImage);
router.post('/upload-model', authenticate, requireEmployeeOrAdmin, productModelUpload.single('model'), uploadProductModel);
router.put('/:id', authenticate, requireEmployeeOrAdmin, checkProductOwnership, updateProduct);
router.delete('/:id', authenticate, requireEmployeeOrAdmin, checkProductOwnership, deleteProduct);

export default router;

