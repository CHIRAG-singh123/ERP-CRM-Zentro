import Invoice from '../models/Invoice.js';
import Quote from '../models/Quote.js';
import Deal from '../models/Deal.js';
import { Product } from '../models/Product.js';
import Contact from '../models/Contact.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { generateInvoicePDF } from '../utils/pdfGenerator.js';

// Helper function to calculate invoice totals
const calculateInvoiceTotals = (lineItems) => {
  let subtotal = 0;

  lineItems.forEach((item) => {
    const quantity = item.quantity || 0;
    const unitPrice = item.unitPrice || 0;
    const discount = item.discount || 0;
    const lineTotal = quantity * unitPrice * (1 - discount / 100);
    subtotal += lineTotal;
  });

  const tax = lineItems.reduce((sum, item) => sum + (item.tax || 0), 0);
  const total = subtotal + tax;

  return { subtotal, tax, total };
};

// @desc    Get all invoices
// @route   GET /api/invoices
// @access  Private (RBAC filtered)
export const getInvoices = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, status, contactId, companyId } = req.query;
  const skip = (page - 1) * limit;

  const query = {};

  // Role-based filtering
  if (req.user.role === 'admin') {
    // Admin sees all invoices
    if (req.user.tenantId) {
      query.tenantId = req.user.tenantId;
    }
  } else if (req.user.role === 'employee') {
    // Employee sees invoices where lineItems contain products created by employee
    const employeeProducts = await Product.find({ createdBy: req.user._id }).select('_id');
    const productIds = employeeProducts.map((p) => p._id);
    query['lineItems.productId'] = { $in: productIds };
    if (req.user.tenantId) {
      query.tenantId = req.user.tenantId;
    }
  } else if (req.user.role === 'customer') {
    // Customer sees invoices where contactId matches their user record
    // First, find contact for this customer
    const Contact = (await import('../models/Contact.js')).default;
    const contact = await Contact.findOne({
      'emails.email': req.user.email,
      tenantId: req.user.tenantId || null,
    });
    if (contact) {
      query.contactId = contact._id;
    } else {
      // No contact found, return empty result
      return res.json({
        invoices: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          pages: 0,
        },
      });
    }
  } else {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Additional filters
  if (status) {
    query.status = status;
  }
  if (contactId) {
    query.contactId = contactId;
  }
  if (companyId) {
    query.companyId = companyId;
  }
  if (search) {
    query.$or = [
      { invoiceNumber: { $regex: search, $options: 'i' } },
      { notes: { $regex: search, $options: 'i' } },
    ];
  }

  const invoices = await Invoice.find(query)
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 })
    .populate('quoteId', 'quoteNumber')
    .populate('dealId', 'title value stage')
    .populate('contactId', 'firstName lastName')
    .populate('companyId', 'name')
    .populate('createdBy', 'name email')
    .populate('lineItems.productId', 'name price sku');

  const total = await Invoice.countDocuments(query);

  res.json({
    invoices,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

// @desc    Get single invoice
// @route   GET /api/invoices/:id
// @access  Private
export const getInvoice = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.user.tenantId) {
    query.tenantId = req.user.tenantId;
  }

  const invoice = await Invoice.findOne(query)
    .populate('quoteId')
    .populate('dealId')
    .populate('contactId')
    .populate('companyId')
    .populate('createdBy', 'name email')
    .populate('lineItems.productId');

  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }

  res.json({ invoice });
});

// @desc    Create invoice
// @route   POST /api/invoices
// @access  Private
export const createInvoice = asyncHandler(async (req, res) => {
  const { quoteId, dealId, contactId, companyId, lineItems, dueDate, notes } = req.body;

  if (!contactId) {
    return res.status(400).json({ error: 'Contact ID is required' });
  }

  let invoiceData = {};

  // If quoteId is provided, create invoice from quote
  if (quoteId) {
    const quote = await Quote.findById(quoteId);
    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    invoiceData = {
      quoteId: quote._id,
      dealId: quote.dealId,
      contactId: contactId || quote.contactId,
      companyId: companyId || quote.companyId,
      lineItems: quote.lineItems.map((item) => ({
        productId: item.productId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount || 0,
        tax: item.tax || 0,
      })),
      subtotal: quote.subtotal,
      tax: quote.tax,
      total: quote.total,
      status: 'Draft',
    };
  } else if (dealId) {
    // Create from deal
    const deal = await Deal.findById(dealId);
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    const items = lineItems || deal.products || [];
    const { subtotal, tax, total } = calculateInvoiceTotals(items);

    invoiceData = {
      dealId: deal._id,
      contactId,
      companyId: companyId || deal.companyId,
      lineItems: items,
      subtotal,
      tax,
      total,
      status: 'Draft',
    };
  } else {
    // Create from scratch
    const items = lineItems || [];
    const { subtotal, tax, total } = calculateInvoiceTotals(items);

    invoiceData = {
      contactId,
      companyId,
      lineItems: items,
      subtotal,
      tax,
      total,
      status: 'Draft',
    };
  }

  invoiceData = {
    ...invoiceData,
    dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
    notes: notes || '',
    createdBy: req.user._id,
    tenantId: req.user.tenantId,
  };

  const invoice = await Invoice.create(invoiceData);
  const populatedInvoice = await Invoice.findById(invoice._id)
    .populate('quoteId', 'quoteNumber')
    .populate('dealId', 'title value stage')
    .populate('contactId', 'firstName lastName')
    .populate('companyId', 'name')
    .populate('createdBy', 'name email')
    .populate('lineItems.productId', 'name price sku');

  res.status(201).json({ invoice: populatedInvoice });
});

// @desc    Update invoice
// @route   PUT /api/invoices/:id
// @access  Private
export const updateInvoice = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.user.tenantId) {
    query.tenantId = req.user.tenantId;
  }

  const invoice = await Invoice.findOne(query);
  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }

  // If lineItems are being updated, recalculate totals
  if (req.body.lineItems) {
    const { subtotal, tax, total } = calculateInvoiceTotals(req.body.lineItems);
    req.body.subtotal = subtotal;
    req.body.tax = tax;
    req.body.total = total;
  }

  const updatedInvoice = await Invoice.findOneAndUpdate(query, req.body, {
    new: true,
    runValidators: true,
  })
    .populate('quoteId', 'quoteNumber')
    .populate('dealId', 'title value stage')
    .populate('contactId', 'firstName lastName')
    .populate('companyId', 'name')
    .populate('createdBy', 'name email')
    .populate('lineItems.productId', 'name price sku');

  res.json({ invoice: updatedInvoice });
});

// @desc    Delete invoice
// @route   DELETE /api/invoices/:id
// @access  Private
export const deleteInvoice = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.user.tenantId) {
    query.tenantId = req.user.tenantId;
  }

  const invoice = await Invoice.findOneAndDelete(query);

  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }

  res.json({ message: 'Invoice deleted successfully' });
});

// @desc    Update invoice status
// @route   PATCH /api/invoices/:id/status
// @access  Private
export const updateInvoiceStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const query = { _id: req.params.id };
  if (req.user.tenantId) {
    query.tenantId = req.user.tenantId;
  }

  const updateData = { status };
  if (status === 'Paid') {
    updateData.paidDate = new Date();
    updateData.amountPaid = req.body.amountPaid || (await Invoice.findOne(query)).total;
  }

  const invoice = await Invoice.findOneAndUpdate(query, updateData, {
    new: true,
    runValidators: true,
  })
    .populate('quoteId', 'quoteNumber')
    .populate('dealId', 'title value stage')
    .populate('contactId', 'firstName lastName')
    .populate('companyId', 'name')
    .populate('createdBy', 'name email')
    .populate('lineItems.productId', 'name price sku');

  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }

  res.json({ invoice });
});

// @desc    Download invoice PDF
// @route   GET /api/invoices/:id/pdf
// @access  Private
export const downloadInvoicePDF = asyncHandler(async (req, res) => {
  console.log('[PDF Download] Request received');
  console.log('[PDF Download] Invoice ID:', req.params.id);
  console.log('[PDF Download] Original URL:', req.originalUrl);
  console.log('[PDF Download] Path:', req.path);
  console.log('[PDF Download] Method:', req.method);
  console.log('[PDF Download] User:', req.user?._id, req.user?.role);
  
  // Validate invoice ID
  if (!req.params.id || req.params.id === 'pdf') {
    console.error('[PDF Download] Invalid invoice ID:', req.params.id);
    return res.status(400).json({ error: 'Invalid invoice ID' });
  }
  
  const query = { _id: req.params.id };

  // Role-based access control
  if (req.user.role === 'admin') {
    // Admin can access all invoices within their tenant
    if (req.user.tenantId) {
      query.tenantId = req.user.tenantId;
    }
  } else if (req.user.role === 'employee') {
    // Employee can access invoices for products they created
    if (req.user.tenantId) {
      query.tenantId = req.user.tenantId;
    }
    // Additional check will be done after fetching invoice
  } else if (req.user.role === 'customer') {
    // Customer can only access invoices where contactId matches their user
    // This will be checked after fetching the invoice
    if (req.user.tenantId) {
      query.tenantId = req.user.tenantId;
    }
  }

  const invoice = await Invoice.findOne(query)
    .populate('contactId')
    .populate('companyId')
    .populate('lineItems.productId');

  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }

  // Additional RBAC checks
  if (req.user.role === 'employee') {
    // Check if invoice contains products created by this employee
    const productIds = invoice.lineItems
      .map((item) => item.productId?._id || item.productId)
      .filter(Boolean);
    
    if (productIds.length > 0) {
      const employeeProducts = await Product.find({
        _id: { $in: productIds },
        createdBy: req.user._id,
      });
      
      if (employeeProducts.length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
  } else if (req.user.role === 'customer') {
    // Check if invoice contact matches customer's contact
    const customerContact = await Contact.findOne({
      'emails.email': req.user.email,
      tenantId: req.user.tenantId || null,
    });
    
    if (!customerContact || invoice.contactId?._id?.toString() !== customerContact._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }
  }

  // Validate invoice has required data
  if (!invoice.invoiceNumber) {
    console.error('Invoice missing invoiceNumber:', invoice._id);
    return res.status(500).json({ error: 'Invoice data is incomplete' });
  }

  try {
    // Ensure invoice is properly populated before PDF generation
    if (!invoice.contactId) {
      console.error('Invoice missing contactId:', invoice._id);
      return res.status(500).json({ error: 'Invoice data is incomplete: missing contact information' });
    }

    // Log invoice data for debugging
    console.log('Generating PDF for invoice:', {
      id: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      hasContact: !!invoice.contactId,
      hasCompany: !!invoice.companyId,
      lineItemsCount: invoice.lineItems?.length || 0,
    });

    const pdfBuffer = await generateInvoicePDF(invoice);
    
    if (!pdfBuffer || pdfBuffer.length === 0) {
      console.error('PDF generation returned empty buffer for invoice:', invoice._id);
      return res.status(500).json({ error: 'Failed to generate PDF: Empty PDF buffer' });
    }

    console.log('PDF generated successfully, size:', pdfBuffer.length, 'bytes');

    // Set headers before sending
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoiceNumber || invoice._id}.pdf`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Cache-Control', 'no-cache');
    
    // Send the PDF buffer
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF for invoice:', invoice._id);
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    });
    
    const errorMessage = error?.message || 'Failed to generate PDF';
    
    // Only send error details in development
    if (process.env.NODE_ENV === 'development') {
      return res.status(500).json({ 
        error: 'Failed to generate PDF',
        details: errorMessage,
        stack: error?.stack
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to generate PDF. Please try again later.'
    });
  }
});

