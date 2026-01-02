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
  const headers = ['name', 'email', 'phone', 'website', 'industry', 'street', 'city', 'state', 'zipCode', 'country', 'tags'];
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

  return [headers.join(','), ...rows].join('\n');
};

/**
 * Convert contacts to CSV format
 * @param {Array} contacts - Array of contact objects
 * @returns {string} CSV string
 */
export const contactsToCSV = (contacts) => {
  const headers = ['firstName', 'lastName', 'email', 'phone', 'jobTitle', 'department', 'companyName', 'street', 'city', 'state', 'zipCode', 'country'];
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

  return [headers.join(','), ...rows].join('\n');
};

/**
 * Parse CSV file for leads
 * Expected CSV format: firstName,lastName,email,phone,jobTitle,department,companyName,street,city,state,zipCode,country,expectedCloseDate,value,status,source
 * Value can include currency symbols ($) and commas (e.g., "$1,000.00" or "1000")
 * Status should be one of: New, Contacted, Qualified, Lost, Converted (case-insensitive)
 * Source should be one of: website, referral, social, email, phone, other (case-insensitive)
 * @param {Buffer} fileBuffer - CSV file buffer
 * @returns {Promise<Array>} Array of parsed lead objects
 */
export const parseLeadsCSV = async (fileBuffer) => {
  const csvText = fileBuffer.toString('utf-8');
  const lines = csvText.split('\n').filter((line) => line.trim());
  
  if (lines.length < 2) {
    throw new Error('CSV file must contain at least a header and one data row');
  }

  // Helper function to parse CSV line handling quoted fields
  const parseCSVLine = (line) => {
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
    return fields;
  };

  // Parse header row
  const headerLine = lines[0].trim();
  const headerFields = parseCSVLine(headerLine);
  
  // Create column index map (case-insensitive)
  const columnMap = {};
  headerFields.forEach((header, index) => {
    const headerLower = header.toLowerCase().trim();
    columnMap[headerLower] = index;
  });

  // Skip header row
  const dataLines = lines.slice(1);
  const leads = [];
  const errors = [];

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i].trim();
    if (!line) continue;

    const fields = parseCSVLine(line);

    // Helper to get field value by column name (case-insensitive)
    const getField = (columnName) => {
      const index = columnMap[columnName.toLowerCase()];
      return index !== undefined && fields[index] ? fields[index].trim() : undefined;
    };

    const firstName = getField('firstName') || getField('firstname') || getField('first_name');
    const lastName = getField('lastName') || getField('lastname') || getField('last_name');
    const email = getField('email');
    const phone = getField('phone');
    const jobTitle = getField('jobTitle') || getField('jobtitle') || getField('job_title');
    const department = getField('department');
    const companyName = getField('companyName') || getField('companyname') || getField('company_name');
    const street = getField('street');
    const city = getField('city');
    const state = getField('state');
    const zipCode = getField('zipCode') || getField('zipcode') || getField('zip_code');
    const country = getField('country');
    const expectedCloseDateStr = getField('expectedCloseDate') || getField('expectedclosedate') || getField('expected_close_date');
    const valueStr = getField('value');
    const status = getField('status');
    const source = getField('source');

    if (!firstName || !lastName) {
      errors.push(`Row ${i + 2}: Missing first name or last name`);
      continue;
    }

    // Validate and parse date - only set if valid
    let expectedCloseDate = undefined;
    if (expectedCloseDateStr && expectedCloseDateStr.trim()) {
      const dateStr = expectedCloseDateStr.trim();
      // Try parsing the date
      const parsedDate = new Date(dateStr);
      // Check if date is valid
      if (!isNaN(parsedDate.getTime()) && dateStr.length > 0) {
        expectedCloseDate = parsedDate;
      } else {
        errors.push(`Row ${i + 2}: Invalid date format: ${dateStr}`);
        // Continue without date rather than failing completely
      }
    }

    // Parse and validate value - handle currency symbols and commas
    let value = 0;
    if (valueStr && valueStr.trim()) {
      // Remove currency symbols, commas, and whitespace
      const cleanedValue = valueStr.trim().replace(/[$,\s]/g, '');
      const parsedValue = parseFloat(cleanedValue);
      value = isNaN(parsedValue) ? 0 : parsedValue;
    }

    // Validate and set status - case-insensitive matching
    const validStatuses = ['New', 'Contacted', 'Qualified', 'Lost', 'Converted'];
    let leadStatus = 'New';
    if (status && status.trim()) {
      const statusTrimmed = status.trim();
      // Case-insensitive matching
      const matchedStatus = validStatuses.find(s => s.toLowerCase() === statusTrimmed.toLowerCase());
      leadStatus = matchedStatus || 'New';
    }

    // Validate and set source - case-insensitive matching
    const validSources = ['website', 'referral', 'social', 'email', 'phone', 'other'];
    // Map common source names to valid values
    const sourceMapping = {
      'linkedin': 'social',
      'facebook': 'social',
      'twitter': 'social',
      'instagram': 'social',
      'website': 'website',
      'web': 'website',
      'event': 'other',
      'referral': 'referral',
      'email': 'email',
      'phone': 'phone',
      'call': 'phone',
      'social': 'social',
      'social media': 'social',
      'other': 'other',
    };
    let leadSource = 'other';
    if (source && source.trim()) {
      const sourceLower = source.trim().toLowerCase();
      leadSource = sourceMapping[sourceLower] || (validSources.includes(sourceLower) ? sourceLower : 'other');
    }

    // Create lead title from name
    const title = `${firstName} ${lastName}${email ? `: ${email}` : ''}`;

    const lead = {
      title,
      description: jobTitle ? `${jobTitle}${department ? ` - ${department}` : ''}` : undefined,
      contactEmail: email?.trim() || undefined,
      companyName: companyName?.trim() || undefined,
      source: leadSource,
      status: leadStatus,
      value: value,
      notes: undefined,
      expectedCloseDate: expectedCloseDate, // Only set if valid
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
  const headers = ['firstName', 'lastName', 'email', 'phone', 'jobTitle', 'department', 'companyName', 'street', 'city', 'state', 'zipCode', 'country', 'expectedCloseDate', 'value', 'status', 'source'];
  const rows = leads.map((lead) => {
    // Extract contact details
    const contact = lead.contactId;
    const firstName = contact?.firstName || '';
    const lastName = contact?.lastName || '';
    const primaryEmail = contact?.emails?.find((e) => e.isPrimary)?.email || contact?.emails?.[0]?.email || '';
    const primaryPhone = contact?.phones?.find((p) => p.isPrimary)?.phone || contact?.phones?.[0]?.phone || '';
    const jobTitle = contact?.jobTitle || '';
    const department = contact?.department || '';
    
    // Extract address from contact
    const street = contact?.address?.street || '';
    const city = contact?.address?.city || '';
    const state = contact?.address?.state || '';
    const zipCode = contact?.address?.zipCode || '';
    const country = contact?.address?.country || '';
    
    // Extract company name
    const companyName = lead.companyId?.name || '';
    
    // Extract lead-specific fields
    const expectedCloseDate = lead.expectedCloseDate ? new Date(lead.expectedCloseDate).toISOString().split('T')[0] : '';
    const value = lead.value || 0;
    const status = lead.status || 'New';
    const source = lead.source || 'other';

    return [
      firstName,
      lastName,
      primaryEmail,
      primaryPhone,
      jobTitle,
      department,
      companyName,
      street,
      city,
      state,
      zipCode,
      country,
      expectedCloseDate,
      value,
      status,
      source,
    ].map((field) => `"${String(field).replace(/"/g, '""')}"`).join(',');
  });

  return [headers.join(','), ...rows].join('\n');
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
  const headers = ['title', 'leadId', 'contactEmail', 'companyName', 'value', 'currency', 'stage', 'probability', 'closeDate', 'description', 'notes'];
  const rows = deals.map((deal) => {
    // Extract contact email
    const contact = deal.contactId;
    const contactEmail = contact?.emails?.find((e) => e.isPrimary)?.email || contact?.emails?.[0]?.email || '';
    
    // Extract company name
    const companyName = deal.companyId?.name || '';
    
    // Extract leadId as string
    const leadId = deal.leadId ? String(deal.leadId) : '';
    
    // Format closeDate
    const closeDate = deal.closeDate ? new Date(deal.closeDate).toISOString().split('T')[0] : '';

    return [
      deal.title || '',
      leadId,
      contactEmail,
      companyName,
      deal.value || 0,
      deal.currency || 'USD',
      deal.stage || 'Prospecting',
      deal.probability || 0,
      closeDate,
      deal.description || '',
      deal.notes || '',
    ].map((field) => `"${String(field).replace(/"/g, '""')}"`).join(',');
  });

  return [headers.join(','), ...rows].join('\n');
};

