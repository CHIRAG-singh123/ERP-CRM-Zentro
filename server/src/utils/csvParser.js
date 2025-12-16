import { Readable } from 'stream';
import bcrypt from 'bcryptjs';

/**
 * Parse CSV file and return array of employee objects
 * Expected CSV format: name,email
 * @param {Buffer} fileBuffer - CSV file buffer
 * @returns {Promise<Array>} Array of parsed employee objects
 */
export const parseEmployeesCSV = async (fileBuffer) => {
  const csvText = fileBuffer.toString('utf-8');
  const lines = csvText.split('\n').filter((line) => line.trim());
  
  if (lines.length < 2) {
    throw new Error('CSV file must contain at least a header and one data row');
  }

  // Skip header row
  const dataLines = lines.slice(1);
  const employees = [];
  const errors = [];
  const defaultPassword = 'Employee@123';
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(defaultPassword, saltRounds);

  // Email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i].trim();
    if (!line) continue;

    const [name, email] = line.split(',').map((field) => field.trim());

    // Validation
    if (!name || !email) {
      errors.push(`Row ${i + 2}: Missing name or email`);
      continue;
    }

    if (!emailRegex.test(email)) {
      errors.push(`Row ${i + 2}: Invalid email format: ${email}`);
      continue;
    }

    employees.push({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: 'employee',
      mustChangePassword: true,
      isActive: true,
    });
  }

  if (errors.length > 0 && employees.length === 0) {
    throw new Error(`CSV parsing errors:\n${errors.join('\n')}`);
  }

  return { employees, errors };
};

/**
 * Parse CSV file for companies
 * Expected CSV format: name,email,phone,website,industry,address.street,address.city,address.state,address.zipCode,address.country,tags
 * @param {Buffer} fileBuffer - CSV file buffer
 * @returns {Promise<Array>} Array of parsed company objects
 */
export const parseCompaniesCSV = async (fileBuffer) => {
  const csvText = fileBuffer.toString('utf-8');
  const lines = csvText.split('\n').filter((line) => line.trim());
  
  if (lines.length < 2) {
    throw new Error('CSV file must contain at least a header and one data row');
  }

  // Skip header row
  const dataLines = lines.slice(1);
  const companies = [];
  const errors = [];

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i].trim();
    if (!line) continue;

    const fields = line.split(',').map((field) => field.trim());
    const [name, email, phone, website, industry, street, city, state, zipCode, country, tagsStr] = fields;

    if (!name) {
      errors.push(`Row ${i + 2}: Missing company name`);
      continue;
    }

    const company = {
      name,
      email: email || undefined,
      phone: phone || undefined,
      website: website || undefined,
      industry: industry || undefined,
      address: {},
      tags: [],
    };

    if (street || city || state || zipCode || country) {
      company.address = {
        street: street || undefined,
        city: city || undefined,
        state: state || undefined,
        zipCode: zipCode || undefined,
        country: country || undefined,
      };
    }

    if (tagsStr) {
      company.tags = tagsStr.split(';').map((tag) => tag.trim()).filter(Boolean);
    }

    companies.push(company);
  }

  if (errors.length > 0 && companies.length === 0) {
    throw new Error(`CSV parsing errors:\n${errors.join('\n')}`);
  }

  return { companies, errors };
};

/**
 * Parse CSV file for contacts
 * Expected CSV format: firstName,lastName,email,phone,jobTitle,department,companyName,address.street,address.city,address.state,address.zipCode,address.country
 * @param {Buffer} fileBuffer - CSV file buffer
 * @returns {Promise<Array>} Array of parsed contact objects
 */
export const parseContactsCSV = async (fileBuffer) => {
  const csvText = fileBuffer.toString('utf-8');
  const lines = csvText.split('\n').filter((line) => line.trim());
  
  if (lines.length < 2) {
    throw new Error('CSV file must contain at least a header and one data row');
  }

  // Skip header row
  const dataLines = lines.slice(1);
  const contacts = [];
  const errors = [];

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i].trim();
    if (!line) continue;

    const fields = line.split(',').map((field) => field.trim());
    const [firstName, lastName, email, phone, jobTitle, department, companyName, street, city, state, zipCode, country] = fields;

    if (!firstName || !lastName) {
      errors.push(`Row ${i + 2}: Missing first name or last name`);
      continue;
    }

    const contact = {
      firstName,
      lastName,
      emails: [],
      phones: [],
      jobTitle: jobTitle || undefined,
      department: department || undefined,
      companyName: companyName || undefined, // Will be resolved to companyId later
      address: {},
    };

    if (email) {
      contact.emails.push({
        email,
        type: 'work',
        isPrimary: true,
      });
    }

    if (phone) {
      contact.phones.push({
        phone,
        type: 'work',
        isPrimary: true,
      });
    }

    if (street || city || state || zipCode || country) {
      contact.address = {
        street: street || undefined,
        city: city || undefined,
        state: state || undefined,
        zipCode: zipCode || undefined,
        country: country || undefined,
      };
    }

    contacts.push(contact);
  }

  if (errors.length > 0 && contacts.length === 0) {
    throw new Error(`CSV parsing errors:\n${errors.join('\n')}`);
  }

  return { contacts, errors };
};

/**
 * Convert companies to CSV format
 * @param {Array} companies - Array of company objects
 * @returns {string} CSV string
 */
export const companiesToCSV = (companies) => {
  const headers = ['Name', 'Email', 'Phone', 'Website', 'Industry', 'Street', 'City', 'State', 'Zip Code', 'Country', 'Tags'];
  const rows = companies.map((company) => {
    return [
      company.name || '',
      company.email || '',
      company.phone || '',
      company.website || '',
      company.industry || '',
      company.address?.street || '',
      company.address?.city || '',
      company.address?.state || '',
      company.address?.zipCode || '',
      company.address?.country || '',
      (company.tags || []).join(';'),
    ].map((field) => `"${String(field).replace(/"/g, '""')}"`).join(',');
  });

  return [headers.map((h) => `"${h}"`).join(','), ...rows].join('\n');
};

/**
 * Convert contacts to CSV format
 * @param {Array} contacts - Array of contact objects
 * @returns {string} CSV string
 */
export const contactsToCSV = (contacts) => {
  const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Job Title', 'Department', 'Company', 'Street', 'City', 'State', 'Zip Code', 'Country'];
  const rows = contacts.map((contact) => {
    const primaryEmail = contact.emails?.find((e) => e.isPrimary)?.email || contact.emails?.[0]?.email || '';
    const primaryPhone = contact.phones?.find((p) => p.isPrimary)?.phone || contact.phones?.[0]?.phone || '';
    const companyName = contact.companyId?.name || '';

    return [
      contact.firstName || '',
      contact.lastName || '',
      primaryEmail,
      primaryPhone,
      contact.jobTitle || '',
      contact.department || '',
      companyName,
      contact.address?.street || '',
      contact.address?.city || '',
      contact.address?.state || '',
      contact.address?.zipCode || '',
      contact.address?.country || '',
    ].map((field) => `"${String(field).replace(/"/g, '""')}"`).join(',');
  });

  return [headers.map((h) => `"${h}"`).join(','), ...rows].join('\n');
};

/**
 * Parse CSV file for leads
 * Expected CSV format: title,description,contactEmail,companyName,source,status,value,notes,expectedCloseDate
 * @param {Buffer} fileBuffer - CSV file buffer
 * @returns {Promise<Array>} Array of parsed lead objects
 */
export const parseLeadsCSV = async (fileBuffer) => {
  const csvText = fileBuffer.toString('utf-8');
  const lines = csvText.split('\n').filter((line) => line.trim());
  
  if (lines.length < 2) {
    throw new Error('CSV file must contain at least a header and one data row');
  }

  // Skip header row
  const dataLines = lines.slice(1);
  const leads = [];
  const errors = [];

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i].trim();
    if (!line) continue;

    const fields = line.split(',').map((field) => field.trim());
    const [title, description, contactEmail, companyName, source, status, valueStr, notes, expectedCloseDateStr] = fields;

    if (!title) {
      errors.push(`Row ${i + 2}: Missing title`);
      continue;
    }

    const lead = {
      title,
      description: description || undefined,
      contactEmail: contactEmail || undefined, // Will be resolved to contactId later
      companyName: companyName || undefined, // Will be resolved to companyId later
      source: (source && ['website', 'referral', 'social', 'email', 'phone', 'other'].includes(source.toLowerCase())) 
        ? source.toLowerCase() 
        : 'other',
      status: (status && ['New', 'Contacted', 'Qualified', 'Lost', 'Converted'].includes(status)) 
        ? status 
        : 'New',
      value: valueStr ? parseFloat(valueStr) || 0 : 0,
      notes: notes || undefined,
      expectedCloseDate: expectedCloseDateStr ? new Date(expectedCloseDateStr) : undefined,
    };

    leads.push(lead);
  }

  if (errors.length > 0 && leads.length === 0) {
    throw new Error(`CSV parsing errors:\n${errors.join('\n')}`);
  }

  return { leads, errors };
};

/**
 * Convert leads to CSV format
 * @param {Array} leads - Array of lead objects
 * @returns {string} CSV string
 */
export const leadsToCSV = (leads) => {
  const headers = ['Title', 'Description', 'Contact', 'Company', 'Source', 'Status', 'Value', 'Owner', 'Notes', 'Expected Close Date', 'Created At'];
  const rows = leads.map((lead) => {
    const contactName = lead.contactId 
      ? `${lead.contactId.firstName || ''} ${lead.contactId.lastName || ''}`.trim()
      : '';
    const companyName = lead.companyId?.name || '';
    const ownerName = lead.ownerId?.name || '';

    return [
      lead.title || '',
      lead.description || '',
      contactName,
      companyName,
      lead.source || 'other',
      lead.status || 'New',
      lead.value || 0,
      ownerName,
      lead.notes || '',
      lead.expectedCloseDate ? new Date(lead.expectedCloseDate).toISOString().split('T')[0] : '',
      lead.createdAt ? new Date(lead.createdAt).toISOString().split('T')[0] : '',
    ].map((field) => `"${String(field).replace(/"/g, '""')}"`).join(',');
  });

  return [headers.map((h) => `"${h}"`).join(','), ...rows].join('\n');
};

/**
 * Parse CSV file for deals
 * Expected CSV format: title,leadId,contactEmail,companyName,value,currency,stage,probability,closeDate,description,notes
 * @param {Buffer} fileBuffer - CSV file buffer
 * @returns {Promise<Array>} Array of parsed deal objects
 */
export const parseDealsCSV = async (fileBuffer) => {
  const csvText = fileBuffer.toString('utf-8');
  const lines = csvText.split('\n').filter((line) => line.trim());
  
  if (lines.length < 2) {
    throw new Error('CSV file must contain at least a header and one data row');
  }

  // Skip header row
  const dataLines = lines.slice(1);
  const deals = [];
  const errors = [];

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i].trim();
    if (!line) continue;

    // Parse CSV line handling quoted fields
    const fields = [];
    let currentField = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        if (inQuotes && line[j + 1] === '"') {
          // Escaped quote
          currentField += '"';
          j++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        fields.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }
    // Add last field
    fields.push(currentField.trim());

    const [title, leadId, contactEmail, companyName, valueStr, currency, stage, probabilityStr, closeDateStr, description, notes] = fields;

    if (!title) {
      errors.push(`Row ${i + 2}: Missing title`);
      continue;
    }

    if (!valueStr || isNaN(parseFloat(valueStr))) {
      errors.push(`Row ${i + 2}: Invalid or missing value`);
      continue;
    }

    if (!closeDateStr) {
      errors.push(`Row ${i + 2}: Missing close date`);
      continue;
    }

    // Validate date
    const closeDate = new Date(closeDateStr);
    if (isNaN(closeDate.getTime())) {
      errors.push(`Row ${i + 2}: Invalid close date format: ${closeDateStr}`);
      continue;
    }

    const deal = {
      title,
      leadId: leadId || undefined,
      contactEmail: contactEmail || undefined, // Will be resolved to contactId later
      companyName: companyName || undefined, // Will be resolved to companyId later
      value: parseFloat(valueStr),
      currency: currency || 'USD',
      stage: (stage && ['Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'].includes(stage)) 
        ? stage 
        : 'Prospecting',
      probability: probabilityStr ? Math.min(100, Math.max(0, parseFloat(probabilityStr) || 0)) : 0,
      closeDate: closeDate,
      description: description || undefined,
      notes: notes || undefined,
    };

    deals.push(deal);
  }

  if (errors.length > 0 && deals.length === 0) {
    throw new Error(`CSV parsing errors:\n${errors.join('\n')}`);
  }

  return { deals, errors };
};

/**
 * Convert deals to CSV format
 * @param {Array} deals - Array of deal objects
 * @returns {string} CSV string
 */
export const dealsToCSV = (deals) => {
  const headers = ['Title', 'Lead ID', 'Contact', 'Company', 'Value', 'Currency', 'Stage', 'Probability', 'Close Date', 'Owner', 'Description', 'Notes', 'Created At'];
  const rows = deals.map((deal) => {
    const contactName = deal.contactId 
      ? `${deal.contactId.firstName || ''} ${deal.contactId.lastName || ''}`.trim()
      : '';
    const companyName = deal.companyId?.name || '';
    const ownerName = deal.ownerId?.name || '';

    return [
      deal.title || '',
      deal.leadId || '',
      contactName,
      companyName,
      deal.value || 0,
      deal.currency || 'USD',
      deal.stage || 'Prospecting',
      deal.probability || 0,
      deal.closeDate ? new Date(deal.closeDate).toISOString().split('T')[0] : '',
      ownerName,
      deal.description || '',
      deal.notes || '',
      deal.createdAt ? new Date(deal.createdAt).toISOString().split('T')[0] : '',
    ].map((field) => `"${String(field).replace(/"/g, '""')}"`).join(',');
  });

  return [headers.map((h) => `"${h}"`).join(','), ...rows].join('\n');
};

