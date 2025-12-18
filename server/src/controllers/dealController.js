import Deal from '../models/Deal.js';
import Lead from '../models/Lead.js';
import Contact from '../models/Contact.js';
import Company from '../models/Company.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parseDealsCSV, dealsToCSV } from '../utils/csvParser.js';
import multer from 'multer';

// @desc    Get all deals
// @route   GET /api/deals
// @access  Private
export const getDeals = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, stage, ownerId } = req.query;
  const skip = (page - 1) * limit;

  const query = {};
  if (req.user.tenantId) {
    query.tenantId = req.user.tenantId;
  }
  if (stage) {
    query.stage = stage;
  }
  if (ownerId) {
    query.ownerId = ownerId;
  } else if (req.user.role !== 'admin' && req.user.role !== 'employee') {
    // Employees can view all deals like admin
    query.ownerId = req.user._id;
  }
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  const deals = await Deal.find(query)
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 })
    .populate('contactId', 'firstName lastName')
    .populate('companyId', 'name')
    .populate('ownerId', 'name email')
    .populate('products.productId', 'name price');

  const total = await Deal.countDocuments(query);

  res.json({
    deals,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

// @desc    Get single deal
// @route   GET /api/deals/:id
// @access  Private
export const getDeal = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.user.tenantId) {
    query.tenantId = req.user.tenantId;
  }

  const deal = await Deal.findOne(query)
    .populate('contactId')
    .populate('companyId')
    .populate('ownerId', 'name email')
    .populate('products.productId');

  if (!deal) {
    return res.status(404).json({ error: 'Deal not found' });
  }

  res.json({ deal });
});

// @desc    Create deal
// @route   POST /api/deals
// @access  Private
export const createDeal = asyncHandler(async (req, res) => {
  const dealData = {
    ...req.body,
    ownerId: req.body.ownerId || req.user._id,
    createdBy: req.user._id,
    tenantId: req.user.tenantId,
  };

  const deal = await Deal.create(dealData);
  res.status(201).json({ deal });
});

// @desc    Update deal
// @route   PUT /api/deals/:id
// @access  Private
export const updateDeal = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.user.tenantId) {
    query.tenantId = req.user.tenantId;
  }

  const deal = await Deal.findOneAndUpdate(query, req.body, {
    new: true,
    runValidators: true,
  });

  if (!deal) {
    return res.status(404).json({ error: 'Deal not found' });
  }

  res.json({ deal });
});

// @desc    Delete deal
// @route   DELETE /api/deals/:id
// @access  Private
export const deleteDeal = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.user.tenantId) {
    query.tenantId = req.user.tenantId;
  }

  const deal = await Deal.findOneAndDelete(query);

  if (!deal) {
    return res.status(404).json({ error: 'Deal not found' });
  }

  res.json({ message: 'Deal deleted successfully' });
});

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// @desc    Import deals from CSV
// @route   POST /api/deals/import
// @access  Private
export const importDeals = [
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { deals, errors } = await parseDealsCSV(req.file.buffer);

    if (deals.length === 0) {
      return res.status(400).json({
        error: 'No valid deals found in CSV file',
        errors: errors.length > 0 ? errors : ['No data rows found'],
      });
    }

    // Create a map of contact emails to contact IDs
    const contactMap = new Map();
    if (deals.some((deal) => deal.contactEmail)) {
      const contactEmails = [...new Set(deals.map((deal) => deal.contactEmail).filter(Boolean))];
      if (contactEmails.length > 0) {
        const contacts = await Contact.find({
          'emails.email': { $in: contactEmails },
          tenantId: req.user.tenantId,
        });
        contacts.forEach((contact) => {
          const primaryEmail = contact.emails?.find((e) => e.isPrimary)?.email || contact.emails?.[0]?.email;
          if (primaryEmail) {
            contactMap.set(primaryEmail.toLowerCase(), contact._id);
          }
        });
      }
    }

    // Create a map of company names to company IDs
    const companyMap = new Map();
    if (deals.some((deal) => deal.companyName)) {
      const companyNames = [...new Set(deals.map((deal) => deal.companyName).filter(Boolean))];
      if (companyNames.length > 0) {
        const companies = await Company.find({
          name: { $in: companyNames },
          tenantId: req.user.tenantId,
        });
        companies.forEach((company) => {
          companyMap.set(company.name.toLowerCase(), company._id);
        });
      }
    }

    // Validate leadIds if provided
    const leadIdMap = new Map();
    if (deals.some((deal) => deal.leadId)) {
      const leadIds = [...new Set(deals.map((deal) => deal.leadId).filter(Boolean))];
      if (leadIds.length > 0) {
        try {
          const validLeads = await Lead.find({
            _id: { $in: leadIds },
            tenantId: req.user.tenantId,
          }).select('_id');
          validLeads.forEach((lead) => {
            leadIdMap.set(lead._id.toString(), lead._id);
          });
        } catch (err) {
          // If leadId validation fails, just skip it and continue
          console.error('Error validating leadIds:', err);
        }
      }
    }

    // Process deals and assign contact/company IDs
    const dealsToCreate = deals.map((deal) => {
      const dealData = {
        title: deal.title,
        value: deal.value,
        currency: deal.currency,
        stage: deal.stage,
        probability: deal.probability,
        closeDate: deal.closeDate,
        ownerId: req.user._id,
        createdBy: req.user._id,
        tenantId: req.user.tenantId,
      };

      // Only add leadId if it's valid
      if (deal.leadId && leadIdMap.has(deal.leadId)) {
        dealData.leadId = leadIdMap.get(deal.leadId);
      }

      if (deal.contactEmail && contactMap.has(deal.contactEmail.toLowerCase())) {
        dealData.contactId = contactMap.get(deal.contactEmail.toLowerCase());
      }

      if (deal.companyName && companyMap.has(deal.companyName.toLowerCase())) {
        dealData.companyId = companyMap.get(deal.companyName.toLowerCase());
      }

      if (deal.description) {
        dealData.description = deal.description;
      }

      if (deal.notes) {
        dealData.notes = deal.notes;
      }

      return dealData;
    });

    try {
      const createdDeals = await Deal.insertMany(dealsToCreate, { ordered: false });

      res.status(201).json({
        message: `${createdDeals.length} deals imported successfully`,
        created: createdDeals.length,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (insertError) {
      // Handle validation errors from insertMany
      const validationErrors = [];
      if (insertError.writeErrors) {
        insertError.writeErrors.forEach((err) => {
          validationErrors.push(`Row ${err.index + 2}: ${err.errmsg || err.err?.message || 'Validation error'}`);
        });
      }

      // If some deals were created, return partial success
      if (insertError.insertedIds && Object.keys(insertError.insertedIds).length > 0) {
        return res.status(207).json({
          message: `Partially imported: ${Object.keys(insertError.insertedIds).length} deals created`,
          created: Object.keys(insertError.insertedIds).length,
          errors: [...errors, ...validationErrors],
        });
      }

      // If no deals were created, return error
      return res.status(400).json({
        error: 'Failed to import deals',
        errors: [...errors, ...validationErrors, insertError.message],
      });
    }
  }),
];

// @desc    Export deals to CSV
// @route   GET /api/deals/export
// @access  Private
export const exportDeals = asyncHandler(async (req, res) => {
  const query = {};
  if (req.user.tenantId) {
    query.tenantId = req.user.tenantId;
  }
  // Employees can export all deals like admin
  if (req.user.role !== 'admin' && req.user.role !== 'employee') {
    query.ownerId = req.user._id;
  }

  const deals = await Deal.find(query)
    .populate('contactId', 'firstName lastName')
    .populate('companyId', 'name')
    .populate('ownerId', 'name')
    .sort({ createdAt: -1 });

  const csv = dealsToCSV(deals);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=deals-export.csv');
  res.send(csv);
});

