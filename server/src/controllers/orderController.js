import { Product } from '../models/Product.js';
import Invoice from '../models/Invoice.js';
import Contact from '../models/Contact.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendOrderConfirmationEmail } from '../utils/emailService.js';
import mongoose from 'mongoose';

/**
 * Generate a short order number for display
 */
const generateOrderNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${timestamp}-${random}`;
};

/**
 * Find or create a Contact for the current user (by email)
 */
const findOrCreateContactForUser = async (user) => {
  const tenantFilter = user.tenantId ? { tenantId: user.tenantId } : { $or: [{ tenantId: null }, { tenantId: { $exists: false } }] };
  let contact = await Contact.findOne({
    'emails.email': user.email,
    ...tenantFilter,
  });

  if (contact) {
    return contact;
  }

  const parts = (user.name || 'Customer').trim().split(/\s+/);
  const firstName = parts[0] || 'Customer';
  const lastName = parts.slice(1).join(' ') || 'User';

  contact = await Contact.create({
    firstName,
    lastName,
    emails: [{ email: user.email, isPrimary: true }],
    tenantId: user.tenantId || undefined,
    createdBy: user._id,
  });

  return contact;
};

/**
 * @desc    Place order (demo) and send receipt email to current user
 * @route   POST /api/orders/receipt
 * @access  Private
 * @body    { productId: string, quantity?: number }
 */
export const createReceipt = asyncHandler(async (req, res) => {
  const { productId, quantity: qty } = req.body;
  const quantity = typeof qty === 'number' && qty >= 1 ? Math.floor(qty) : 1;

  if (!productId) {
    return res.status(400).json({ error: 'productId is required' });
  }

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).json({ error: 'Invalid productId' });
  }

  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const user = req.user;
  const orderNumber = generateOrderNumber();
  const totalAmount = product.price * quantity;

  const contact = await findOrCreateContactForUser(user);

  const invoice = await Invoice.create({
    contactId: contact._id,
    lineItems: [
      {
        productId: product._id,
        quantity,
        unitPrice: product.price,
      },
    ],
    status: 'Paid',
    amountPaid: totalAmount,
    paidDate: new Date(),
    createdBy: user._id,
    tenantId: user.tenantId || undefined,
  });

  const order = {
    orderNumber,
    items: [
      {
        productName: product.name,
        quantity,
        price: product.price,
      },
    ],
    totalAmount,
    paymentStatus: 'Paid',
  };

  const emailResult = await sendOrderConfirmationEmail(user, order, invoice);

  if (!emailResult.success) {
    return res.status(500).json({
      error: 'Order accepted but failed to send receipt email. Please contact support.',
    });
  }

  res.status(200).json({
    success: true,
    message: 'Order placed successfully. Receipt has been sent to your email.',
  });
});
