import Quote from '../models/Quote.js';
import Deal from '../models/Deal.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Helper function to calculate quote totals
const calculateQuoteTotals = (lineItems) => {
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

// @desc    Get all quotes
// @route   GET /api/quotes
// @access  Private
export const getQuotes = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, status, dealId } = req.query;
  const skip = (page - 1) * limit;

  const query = {};
  if (req.user.tenantId) {
    query.tenantId = req.user.tenantId;
  }
  if (status) {
    query.status = status;
  }
  if (dealId) {
    query.dealId = dealId;
  }
  if (search) {
    query.$or = [
      { quoteNumber: { $regex: search, $options: 'i' } },
      { notes: { $regex: search, $options: 'i' } },
    ];
  }

  const quotes = await Quote.find(query)
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 })
    .populate('dealId', 'title value stage')
    .populate('contactId', 'firstName lastName')
    .populate('companyId', 'name')
    .populate('createdBy', 'name email')
    .populate('lineItems.productId', 'name price sku');

  const total = await Quote.countDocuments(query);

  res.json({
    quotes,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

// @desc    Get single quote
// @route   GET /api/quotes/:id
// @access  Private
export const getQuote = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.user.tenantId) {
    query.tenantId = req.user.tenantId;
  }

  const quote = await Quote.findOne(query)
    .populate('dealId')
    .populate('contactId')
    .populate('companyId')
    .populate('createdBy', 'name email')
    .populate('lineItems.productId');

  if (!quote) {
    return res.status(404).json({ error: 'Quote not found' });
  }

  res.json({ quote });
});

// @desc    Create quote
// @route   POST /api/quotes
// @access  Private
export const createQuote = asyncHandler(async (req, res) => {
  const { dealId, lineItems, validUntil, notes, contactId, companyId } = req.body;

  if (!dealId) {
    return res.status(400).json({ error: 'Deal ID is required' });
  }

  // Verify deal exists and get related info
  const deal = await Deal.findById(dealId);
  if (!deal) {
    return res.status(404).json({ error: 'Deal not found' });
  }

  // Calculate totals
  const { subtotal, tax, total } = calculateQuoteTotals(lineItems || []);

  const quoteData = {
    dealId,
    contactId: contactId || deal.contactId,
    companyId: companyId || deal.companyId,
    lineItems: lineItems || [],
    subtotal,
    tax,
    total,
    validUntil: validUntil ? new Date(validUntil) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
    notes: notes || '',
    status: 'Draft',
    createdBy: req.user._id,
    tenantId: req.user.tenantId,
  };

  const quote = await Quote.create(quoteData);
  const populatedQuote = await Quote.findById(quote._id)
    .populate('dealId', 'title value stage')
    .populate('contactId', 'firstName lastName')
    .populate('companyId', 'name')
    .populate('createdBy', 'name email')
    .populate('lineItems.productId', 'name price sku');

  res.status(201).json({ quote: populatedQuote });
});

// @desc    Update quote
// @route   PUT /api/quotes/:id
// @access  Private
export const updateQuote = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.user.tenantId) {
    query.tenantId = req.user.tenantId;
  }

  const quote = await Quote.findOne(query);
  if (!quote) {
    return res.status(404).json({ error: 'Quote not found' });
  }

  // If lineItems are being updated, recalculate totals
  if (req.body.lineItems) {
    const { subtotal, tax, total } = calculateQuoteTotals(req.body.lineItems);
    req.body.subtotal = subtotal;
    req.body.tax = tax;
    req.body.total = total;
  }

  const updatedQuote = await Quote.findOneAndUpdate(query, req.body, {
    new: true,
    runValidators: true,
  })
    .populate('dealId', 'title value stage')
    .populate('contactId', 'firstName lastName')
    .populate('companyId', 'name')
    .populate('createdBy', 'name email')
    .populate('lineItems.productId', 'name price sku');

  res.json({ quote: updatedQuote });
});

// @desc    Delete quote
// @route   DELETE /api/quotes/:id
// @access  Private
export const deleteQuote = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.user.tenantId) {
    query.tenantId = req.user.tenantId;
  }

  const quote = await Quote.findOneAndDelete(query);

  if (!quote) {
    return res.status(404).json({ error: 'Quote not found' });
  }

  res.json({ message: 'Quote deleted successfully' });
});

// @desc    Update quote status
// @route   PATCH /api/quotes/:id/status
// @access  Private
export const updateQuoteStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['Draft', 'Sent', 'Accepted', 'Rejected', 'Expired'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const query = { _id: req.params.id };
  if (req.user.tenantId) {
    query.tenantId = req.user.tenantId;
  }

  const quote = await Quote.findOneAndUpdate(
    query,
    { status },
    { new: true, runValidators: true }
  )
    .populate('dealId', 'title value stage')
    .populate('contactId', 'firstName lastName')
    .populate('companyId', 'name')
    .populate('createdBy', 'name email')
    .populate('lineItems.productId', 'name price sku');

  if (!quote) {
    return res.status(404).json({ error: 'Quote not found' });
  }

  res.json({ quote });
});

