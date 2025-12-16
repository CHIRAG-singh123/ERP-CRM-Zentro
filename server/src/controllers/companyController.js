import Company from '../models/Company.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parseCompaniesCSV, companiesToCSV } from '../utils/csvParser.js';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

// @desc    Get all companies
// @route   GET /api/companies
// @access  Private
export const getCompanies = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, tags } = req.query;
  const skip = (page - 1) * limit;

  const query = {};
  if (req.user.tenantId) {
    query.tenantId = req.user.tenantId;
  }
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }
  if (tags) {
    query.tags = { $in: tags.split(',') };
  }

  const companies = await Company.find(query)
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 })
    .populate('createdBy', 'name email');

  const total = await Company.countDocuments(query);

  res.json({
    companies,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

// @desc    Get single company
// @route   GET /api/companies/:id
// @access  Private
export const getCompany = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.user.tenantId) {
    query.tenantId = req.user.tenantId;
  }

  const company = await Company.findOne(query).populate('createdBy', 'name email');

  if (!company) {
    return res.status(404).json({ error: 'Company not found' });
  }

  res.json({ company });
});

// @desc    Create company
// @route   POST /api/companies
// @access  Private
export const createCompany = asyncHandler(async (req, res) => {
  const companyData = {
    ...req.body,
    createdBy: req.user._id,
    tenantId: req.user.tenantId,
  };

  const company = await Company.create(companyData);
  res.status(201).json({ company });
});

// @desc    Update company
// @route   PUT /api/companies/:id
// @access  Private
export const updateCompany = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.user.tenantId) {
    query.tenantId = req.user.tenantId;
  }

  const company = await Company.findOneAndUpdate(query, req.body, {
    new: true,
    runValidators: true,
  });

  if (!company) {
    return res.status(404).json({ error: 'Company not found' });
  }

  res.json({ company });
});

// @desc    Delete company
// @route   DELETE /api/companies/:id
// @access  Private
export const deleteCompany = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.user.tenantId) {
    query.tenantId = req.user.tenantId;
  }

  const company = await Company.findOneAndDelete(query);

  if (!company) {
    return res.status(404).json({ error: 'Company not found' });
  }

  res.json({ message: 'Company deleted successfully' });
});

// @desc    Import companies from CSV
// @route   POST /api/companies/import
// @access  Private
export const importCompanies = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'CSV file is required' });
  }

  const { companies, errors } = await parseCompaniesCSV(req.file.buffer);

  if (companies.length === 0) {
    return res.status(400).json({ error: 'No valid companies found in CSV', errors });
  }

  // Check for existing companies by name
  const names = companies.map((c) => c.name);
  const existingCompanies = await Company.find({
    name: { $in: names },
    tenantId: req.user.tenantId,
  });
  const existingNames = new Set(existingCompanies.map((c) => c.name));

  const validCompanies = companies.filter((c) => !existingNames.has(c.name));
  const duplicateNames = companies.filter((c) => existingNames.has(c.name));

  if (validCompanies.length === 0) {
    return res.status(400).json({
      error: 'All companies already exist',
      duplicates: duplicateNames.map((c) => c.name),
    });
  }

  // Add createdBy and tenantId to all companies
  const companiesToCreate = validCompanies.map((company) => ({
    ...company,
    createdBy: req.user._id,
    tenantId: req.user.tenantId,
  }));

  const createdCompanies = await Company.insertMany(companiesToCreate);

  res.status(201).json({
    message: `${createdCompanies.length} companies imported successfully`,
    created: createdCompanies.length,
    duplicates: duplicateNames.length,
    errors: errors.length > 0 ? errors : undefined,
  });
});

// @desc    Export companies to CSV
// @route   GET /api/companies/export
// @access  Private
export const exportCompanies = asyncHandler(async (req, res) => {
  const query = {};
  if (req.user.tenantId) {
    query.tenantId = req.user.tenantId;
  }

  const companies = await Company.find(query).sort({ createdAt: -1 });

  const csv = companiesToCSV(companies);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=companies-export.csv');
  res.send(csv);
});

