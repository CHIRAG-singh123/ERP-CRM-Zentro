import Order from '../models/Order.js';
import Invoice from '../models/Invoice.js';
import { Product } from '../models/Product.js';
import Contact from '../models/Contact.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private (RBAC filtered)
export const getOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, paymentStatus } = req.query;
  const skip = (page - 1) * limit;

  const query = {};

  // Role-based filtering
  if (req.user.role === 'admin') {
    // Admin sees all orders
    if (req.user.tenantId) {
      query.tenantId = req.user.tenantId;
    }
  } else if (req.user.role === 'employee') {
    // Employee sees orders where items contain products created by employee
    const employeeProducts = await Product.find({ createdBy: req.user._id }).select('_id');
    const productIds = employeeProducts.map((p) => p._id);
    query['items.productId'] = { $in: productIds };
    if (req.user.tenantId) {
      query.tenantId = req.user.tenantId;
    }
  } else if (req.user.role === 'customer') {
    // Customer sees only their own orders
    query.customerId = req.user._id;
    if (req.user.tenantId) {
      query.tenantId = req.user.tenantId;
    }
  } else {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Additional filters
  if (status) {
    query.status = status;
  }
  if (paymentStatus) {
    query.paymentStatus = paymentStatus;
  }

  const orders = await Order.find(query)
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 })
    .populate('customerId', 'name email')
    .populate('items.productId', 'name price sku')
    .populate('invoiceId', 'invoiceNumber total status')
    .populate('createdBy', 'name email');

  const total = await Order.countDocuments(query);

  res.json({
    orders,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
export const getOrder = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };

  // Role-based access control
  if (req.user.role === 'customer') {
    query.customerId = req.user._id;
  }
  if (req.user.tenantId) {
    query.tenantId = req.user.tenantId;
  }

  const order = await Order.findOne(query)
    .populate('customerId', 'name email')
    .populate('items.productId', 'name price sku')
    .populate('invoiceId', 'invoiceNumber total status')
    .populate('createdBy', 'name email');

  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  // Additional check for employees - verify they created the product
  if (req.user.role === 'employee') {
    const productIds = order.items.map((item) => item.productId?._id || item.productId).filter(Boolean);
    if (productIds.length > 0) {
      const employeeProducts = await Product.find({
        _id: { $in: productIds },
        createdBy: req.user._id,
      });
      if (employeeProducts.length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
  }

  res.json({ order });
});

// @desc    Create order
// @route   POST /api/orders
// @access  Private
export const createOrder = asyncHandler(async (req, res) => {
  const { productId, quantity, shippingAddress, paymentMethod } = req.body;

  if (!productId || !quantity) {
    return res.status(400).json({ error: 'Product ID and quantity are required' });
  }

  if (quantity < 1) {
    return res.status(400).json({ error: 'Quantity must be at least 1' });
  }

  // Get product
  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  if (!product.isActive) {
    return res.status(400).json({ error: 'Product is not available' });
  }

  // Determine customer ID
  let customerId = req.user._id;
  if (req.user.role === 'admin' && req.body.customerId) {
    customerId = req.body.customerId;
  }

  // Create order items
  const items = [
    {
      productId: product._id,
      productName: product.name,
      quantity: parseInt(quantity),
      price: product.price,
    },
  ];

  // Calculate total amount
  const totalAmount = items.reduce((total, item) => total + item.quantity * item.price, 0);

  // Create order
  const orderData = {
    customerId,
    items,
    totalAmount,
    status: 'Pending',
    paymentStatus: paymentMethod ? 'Paid' : 'Pending',
    paymentMethod: paymentMethod || '',
    shippingAddress: shippingAddress || {},
    createdBy: req.user._id,
    tenantId: req.user.tenantId,
  };

  const order = await Order.create(orderData);

  // Create invoice for the order
  let invoice = null;
  try {
    // Find or create contact for the customer
    let contact = await Contact.findOne({
      'emails.email': req.user.email,
      tenantId: req.user.tenantId || null,
    });

    if (!contact) {
      // Create a basic contact for the customer
      contact = await Contact.create({
        firstName: req.user.name?.split(' ')[0] || 'Customer',
        lastName: req.user.name?.split(' ').slice(1).join(' ') || '',
        emails: [{ email: req.user.email, type: 'primary' }],
        tenantId: req.user.tenantId,
        createdBy: req.user._id,
      });
    }

    // Create invoice from order
    const invoiceLineItems = order.items.map((item) => ({
      productId: item.productId,
      description: item.productName,
      quantity: item.quantity,
      unitPrice: item.price,
      discount: 0,
      tax: 0,
    }));

    invoice = await Invoice.create({
      contactId: contact._id,
      lineItems: invoiceLineItems,
      status: order.paymentStatus === 'Paid' ? 'Paid' : 'Sent',
      total: order.totalAmount,
      subtotal: order.totalAmount,
      tax: 0,
      createdBy: req.user._id,
      tenantId: req.user.tenantId,
    });

    // Link invoice to order
    order.invoiceId = invoice._id;
    await order.save();
  } catch (error) {
    console.error('Error creating invoice for order:', error);
    // Continue even if invoice creation fails
  }

  // Populate and return
  const populatedOrder = await Order.findById(order._id)
    .populate('customerId', 'name email')
    .populate('items.productId', 'name price sku')
    .populate('invoiceId', 'invoiceNumber total status')
    .populate('createdBy', 'name email');

  res.status(201).json({
    order: populatedOrder,
    invoice: invoice,
  });
});

// @desc    Update order status
// @route   PATCH /api/orders/:id/status
// @access  Private
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['Pending', 'Processing', 'Completed', 'Cancelled'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const query = { _id: req.params.id };
  if (req.user.tenantId) {
    query.tenantId = req.user.tenantId;
  }

  // Role-based access control
  if (req.user.role === 'customer') {
    query.customerId = req.user._id;
  }

  const order = await Order.findOneAndUpdate(
    query,
    { status },
    { new: true, runValidators: true }
  )
    .populate('customerId', 'name email')
    .populate('items.productId', 'name price sku')
    .populate('invoiceId', 'invoiceNumber total status')
    .populate('createdBy', 'name email');

  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  res.json({ order });
});

// @desc    Cancel order (delete)
// @route   DELETE /api/orders/:id
// @access  Private
export const cancelOrder = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.user.tenantId) {
    query.tenantId = req.user.tenantId;
  }

  // Role-based access control
  if (req.user.role === 'customer') {
    query.customerId = req.user._id;
    // Only allow cancellation if order is Pending
    query.status = 'Pending';
  }

  const order = await Order.findOneAndUpdate(
    query,
    { status: 'Cancelled' },
    { new: true }
  );

  if (!order) {
    return res.status(404).json({ error: 'Order not found or cannot be cancelled' });
  }

  res.json({
    message: 'Order cancelled successfully',
    order,
  });
});

