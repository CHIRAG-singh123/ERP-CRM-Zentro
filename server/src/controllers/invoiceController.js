import Invoice from '../models/Invoice.js';
import Quote from '../models/Quote.js';
import Deal from '../models/Deal.js';
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
// @access  Private
export const getInvoices = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, status, contactId, companyId } = req.query;
  const skip = (page - 1) * limit;

  const query = {};
  if (req.user.tenantId) {
    query.tenantId = req.user.tenantId;
  }
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
  const query = { _id: req.params.id };
  if (req.user.tenantId) {
    query.tenantId = req.user.tenantId;
  }

  const invoice = await Invoice.findOne(query)
    .populate('contactId')
    .populate('companyId')
    .populate('lineItems.productId');

  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }

  try {
    const pdfBuffer = await generateInvoicePDF(invoice);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

