import Company from '../models/Company.js';
import Contact from '../models/Contact.js';
import Deal from '../models/Deal.js';
import Lead from '../models/Lead.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// @desc    Global search across entities
// @route   POST /api/search
// @access  Private
export const globalSearch = asyncHandler(async (req, res) => {
  const { query, limit = 10 } = req.body;

  if (!query || query.trim().length === 0) {
    return res.json({
      results: {
        companies: [],
        contacts: [],
        deals: [],
        leads: [],
      },
    });
  }

  const searchQuery = { $regex: query, $options: 'i' };
  const tenantFilter = req.user.tenantId ? { tenantId: req.user.tenantId } : {};

  // Search companies
  const companies = await Company.find({
    ...tenantFilter,
    $or: [
      { name: searchQuery },
      { email: searchQuery },
      { phone: searchQuery },
      { description: searchQuery },
    ],
  })
    .limit(parseInt(limit))
    .select('name email phone industry')
    .sort({ createdAt: -1 });

  // Search contacts
  const contacts = await Contact.find({
    ...tenantFilter,
    $or: [
      { firstName: searchQuery },
      { lastName: searchQuery },
      { 'emails.email': searchQuery },
      { 'phones.phone': searchQuery },
      { jobTitle: searchQuery },
    ],
  })
    .limit(parseInt(limit))
    .populate('companyId', 'name')
    .select('firstName lastName emails phones jobTitle companyId')
    .sort({ createdAt: -1 });

  // Search deals
  const deals = await Deal.find({
    ...tenantFilter,
    $or: [
      { title: searchQuery },
      { description: searchQuery },
      { notes: searchQuery },
    ],
  })
    .limit(parseInt(limit))
    .populate('contactId', 'firstName lastName')
    .populate('companyId', 'name')
    .select('title value stage closeDate contactId companyId')
    .sort({ createdAt: -1 });

  // Search leads
  const leads = await Lead.find({
    ...tenantFilter,
    $or: [
      { title: searchQuery },
      { description: searchQuery },
      { notes: searchQuery },
    ],
  })
    .limit(parseInt(limit))
    .populate('contactId', 'firstName lastName')
    .populate('companyId', 'name')
    .select('title status source value contactId companyId')
    .sort({ createdAt: -1 });

  res.json({
    results: {
      companies,
      contacts,
      deals,
      leads,
    },
    query,
  });
});

