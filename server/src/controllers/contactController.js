import Contact from '../models/Contact.js';
import Company from '../models/Company.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parseContactsCSV, contactsToCSV } from '../utils/csvParser.js';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

// @desc    Get all contacts
// @route   GET /api/contacts
// @access  Private
export const getContacts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, companyId } = req.query;
  const skip = (page - 1) * limit;

  const query = {};
  if (req.user.tenantId) {
    query.tenantId = req.user.tenantId;
  }
  if (companyId) {
    query.companyId = companyId;
  }
  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { 'emails.email': { $regex: search, $options: 'i' } },
    ];
  }

  const contacts = await Contact.find(query)
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 })
    .populate('companyId', 'name')
    .populate('createdBy', 'name email');

  const total = await Contact.countDocuments(query);

  res.json({
    contacts,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

// @desc    Get single contact
// @route   GET /api/contacts/:id
// @access  Private
export const getContact = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.user.tenantId) {
    query.tenantId = req.user.tenantId;
  }

  const contact = await Contact.findOne(query)
    .populate('companyId', 'name')
    .populate('createdBy', 'name email');

  if (!contact) {
    return res.status(404).json({ error: 'Contact not found' });
  }

  res.json({ contact });
});

// @desc    Create contact
// @route   POST /api/contacts
// @access  Private
export const createContact = asyncHandler(async (req, res) => {
  const contactData = {
    ...req.body,
    createdBy: req.user._id,
    tenantId: req.user.tenantId,
  };

  const contact = await Contact.create(contactData);
  res.status(201).json({ contact });
});

// @desc    Update contact
// @route   PUT /api/contacts/:id
// @access  Private
export const updateContact = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.user.tenantId) {
    query.tenantId = req.user.tenantId;
  }

  const contact = await Contact.findOneAndUpdate(query, req.body, {
    new: true,
    runValidators: true,
  });

  if (!contact) {
    return res.status(404).json({ error: 'Contact not found' });
  }

  res.json({ contact });
});

// @desc    Delete contact
// @route   DELETE /api/contacts/:id
// @access  Private
export const deleteContact = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.user.tenantId) {
    query.tenantId = req.user.tenantId;
  }

  const contact = await Contact.findOneAndDelete(query);

  if (!contact) {
    return res.status(404).json({ error: 'Contact not found' });
  }

  res.json({ message: 'Contact deleted successfully' });
});

// @desc    Import contacts from CSV
// @route   POST /api/contacts/import
// @access  Private
export const importContacts = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'CSV file is required' });
  }

  const { contacts, errors } = await parseContactsCSV(req.file.buffer);

  if (contacts.length === 0) {
    return res.status(400).json({ error: 'No valid contacts found in CSV', errors });
  }

  // Resolve company names to IDs
  const companyNames = contacts
    .map((c) => c.companyName)
    .filter(Boolean)
    .filter((name, index, self) => self.indexOf(name) === index);

  const companies = await Company.find({
    name: { $in: companyNames },
    tenantId: req.user.tenantId,
  });

  const companyMap = new Map(companies.map((c) => [c.name, c._id]));

  // Process contacts and assign company IDs
  const contactsToCreate = contacts.map((contact) => {
    const contactData = {
      firstName: contact.firstName,
      lastName: contact.lastName,
      emails: contact.emails,
      phones: contact.phones,
      jobTitle: contact.jobTitle,
      department: contact.department,
      address: contact.address,
      createdBy: req.user._id,
      tenantId: req.user.tenantId,
    };

    if (contact.companyName && companyMap.has(contact.companyName)) {
      contactData.companyId = companyMap.get(contact.companyName);
    }

    return contactData;
  });

  const createdContacts = await Contact.insertMany(contactsToCreate);

  res.status(201).json({
    message: `${createdContacts.length} contacts imported successfully`,
    created: createdContacts.length,
    errors: errors.length > 0 ? errors : undefined,
  });
});

// @desc    Export contacts to CSV
// @route   GET /api/contacts/export
// @access  Private
export const exportContacts = asyncHandler(async (req, res) => {
  const query = {};
  if (req.user.tenantId) {
    query.tenantId = req.user.tenantId;
  }

  const contacts = await Contact.find(query)
    .populate('companyId', 'name')
    .sort({ createdAt: -1 });

  const csv = contactsToCSV(contacts);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=contacts-export.csv');
  res.send(csv);
});

