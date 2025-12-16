import Lead from '../models/Lead.js';
import Deal from '../models/Deal.js';
import Contact from '../models/Contact.js';
import Company from '../models/Company.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parseLeadsCSV, leadsToCSV } from '../utils/csvParser.js';
import multer from 'multer';

// @desc    Get all leads
// @route   GET /api/leads
// @access  Private
export const getLeads = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, status, ownerId } = req.query;
  const skip = (page - 1) * limit;

  const query = {};
  if (req.user.tenantId) {
    query.tenantId = req.user.tenantId;
  }
  if (status) {
    query.status = status;
  }
  if (ownerId) {
    query.ownerId = ownerId;
  } else if (req.user.role !== 'admin') {
    query.ownerId = req.user._id;
  }
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  const leads = await Lead.find(query)
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 })
    .populate('contactId', 'firstName lastName')
    .populate('companyId', 'name')
    .populate('ownerId', 'name email');

  const total = await Lead.countDocuments(query);

  res.json({
    leads,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

// @desc    Get single lead
// @route   GET /api/leads/:id
// @access  Private
export const getLead = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.user.tenantId) {
    query.tenantId = req.user.tenantId;
  }

  const lead = await Lead.findOne(query)
    .populate('contactId')
    .populate('companyId')
    .populate('ownerId', 'name email');

  if (!lead) {
    return res.status(404).json({ error: 'Lead not found' });
  }

  res.json({ lead });
});

// @desc    Create lead
// @route   POST /api/leads
// @access  Private
export const createLead = asyncHandler(async (req, res) => {
  const leadData = {
    ...req.body,
    ownerId: req.body.ownerId || req.user._id,
    createdBy: req.user._id,
    tenantId: req.user.tenantId,
  };

  const lead = await Lead.create(leadData);
  res.status(201).json({ lead });
});

// @desc    Update lead
// @route   PUT /api/leads/:id
// @access  Private
export const updateLead = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.user.tenantId) {
    query.tenantId = req.user.tenantId;
  }

  const lead = await Lead.findOneAndUpdate(query, req.body, {
    new: true,
    runValidators: true,
  });

  if (!lead) {
    return res.status(404).json({ error: 'Lead not found' });
  }

  res.json({ lead });
});

// @desc    Convert lead to deal
// @route   POST /api/leads/:id/convert
// @access  Private
export const convertLeadToDeal = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.user.tenantId) {
    query.tenantId = req.user.tenantId;
  }

  const lead = await Lead.findOne(query);

  if (!lead) {
    return res.status(404).json({ error: 'Lead not found' });
  }

  if (lead.status === 'Converted') {
    return res.status(400).json({ error: 'Lead already converted' });
  }

  const dealData = {
    title: lead.title,
    leadId: lead._id,
    contactId: lead.contactId,
    companyId: lead.companyId,
    value: req.body.value || lead.value || 0,
    stage: 'Prospecting',
    closeDate: req.body.closeDate || lead.expectedCloseDate || new Date(),
    ownerId: lead.ownerId,
    description: lead.description,
    createdBy: req.user._id,
    tenantId: req.user.tenantId,
  };

  const deal = await Deal.create(dealData);

  lead.status = 'Converted';
  lead.convertedToDealId = deal._id;
  await lead.save();

  res.status(201).json({ deal, lead });
});

// @desc    Delete lead
// @route   DELETE /api/leads/:id
// @access  Private
export const deleteLead = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.user.tenantId) {
    query.tenantId = req.user.tenantId;
  }

  const lead = await Lead.findOneAndDelete(query);

  if (!lead) {
    return res.status(404).json({ error: 'Lead not found' });
  }

  res.json({ message: 'Lead deleted successfully' });
});

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// @desc    Import leads from CSV
// @route   POST /api/leads/import
// @access  Private
export const importLeads = [
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { leads, errors } = await parseLeadsCSV(req.file.buffer);

    // Create a map of contact emails to contact IDs
    const contactMap = new Map();
    if (leads.some((lead) => lead.contactEmail)) {
      const contactEmails = [...new Set(leads.map((lead) => lead.contactEmail).filter(Boolean))];
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

    // Create a map of company names to company IDs
    const companyMap = new Map();
    if (leads.some((lead) => lead.companyName)) {
      const companyNames = [...new Set(leads.map((lead) => lead.companyName).filter(Boolean))];
      const companies = await Company.find({
        name: { $in: companyNames },
        tenantId: req.user.tenantId,
      });
      companies.forEach((company) => {
        companyMap.set(company.name.toLowerCase(), company._id);
      });
    }

    // Process leads and assign contact/company IDs
    const leadsToCreate = leads.map((lead) => {
      const leadData = {
        title: lead.title,
        description: lead.description,
        source: lead.source,
        status: lead.status,
        value: lead.value,
        notes: lead.notes,
        expectedCloseDate: lead.expectedCloseDate,
        ownerId: req.user._id,
        createdBy: req.user._id,
        tenantId: req.user.tenantId,
      };

      if (lead.contactEmail && contactMap.has(lead.contactEmail.toLowerCase())) {
        leadData.contactId = contactMap.get(lead.contactEmail.toLowerCase());
      }

      if (lead.companyName && companyMap.has(lead.companyName.toLowerCase())) {
        leadData.companyId = companyMap.get(lead.companyName.toLowerCase());
      }

      return leadData;
    });

    const createdLeads = await Lead.insertMany(leadsToCreate);

    res.status(201).json({
      message: `${createdLeads.length} leads imported successfully`,
      created: createdLeads.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  }),
];

// @desc    Export leads to CSV
// @route   GET /api/leads/export
// @access  Private
export const exportLeads = asyncHandler(async (req, res) => {
  const query = {};
  if (req.user.tenantId) {
    query.tenantId = req.user.tenantId;
  }
  if (req.user.role !== 'admin') {
    query.ownerId = req.user._id;
  }

  const leads = await Lead.find(query)
    .populate('contactId', 'firstName lastName')
    .populate('companyId', 'name')
    .populate('ownerId', 'name')
    .sort({ createdAt: -1 });

  const csv = leadsToCSV(leads);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=leads-export.csv');
  res.send(csv);
});

