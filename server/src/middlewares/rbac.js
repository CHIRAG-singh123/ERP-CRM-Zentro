import { authenticate } from './auth.js';

// Require admin role
export const requireAdmin = [
  authenticate,
  (req, res, next) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  },
];

// Require employee or admin
export const requireEmployeeOrAdmin = [
  authenticate,
  (req, res, next) => {
    if (req.user.role !== 'employee' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Employee or Admin access required' });
    }
    next();
  },
];

// Require customer role
export const requireCustomer = [
  authenticate,
  (req, res, next) => {
    if (req.user.role !== 'customer') {
      return res.status(403).json({ error: 'Customer access required' });
    }
    next();
  },
];

// Check product ownership (for employees editing their own products)
export const checkProductOwnership = async (req, res, next) => {
  try {
    const { Product } = await import('../models/Product.js');
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Admin can edit any product
    if (req.user.role === 'admin') {
      return next();
    }

    // Employee can only edit their own products
    if (req.user.role === 'employee' && product.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You can only edit your own products' });
    }

    next();
  } catch (error) {
    return res.status(500).json({ error: 'Error checking product ownership' });
  }
};

// Generic role checker
export const requireRole = (roles) => [
  authenticate,
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Access denied. Required roles: ${roles.join(', ')}` });
    }
    next();
  },
];

