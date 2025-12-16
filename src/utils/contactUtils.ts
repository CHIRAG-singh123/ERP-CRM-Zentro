import type { Contact } from '../services/api/contacts';
import { formatRelativeTime } from './formatting';

export interface ContactGridItem {
  _id: string;
  name: string;
  company: string;
  status: string;
  lastActivity: string;
  owner: string;
}

/**
 * Transforms Contact data to DataGrid format
 */
export function transformContactToGridItem(contact: Contact): ContactGridItem {
  // Get full name
  const name = `${contact.firstName} ${contact.lastName}`.trim();

  // Get company name or "No Company"
  const company = contact.companyId?.name || 'No Company';

  // Determine status (could be based on tags, activity, etc.)
  // For now, we'll use a simple status based on whether contact has recent activity
  const status = contact.tags && contact.tags.length > 0 
    ? contact.tags[0] 
    : 'Active';

  // Format last activity (using updatedAt as proxy)
  const lastActivity = formatRelativeTime(contact.updatedAt);

  // Get owner name or "Unknown"
  const owner = contact.createdBy?.name || 'Unknown';

  return {
    _id: contact._id,
    name,
    company,
    status,
    lastActivity,
    owner,
  };
}

/**
 * Get primary email from contact
 */
export function getPrimaryEmail(contact: Contact): string | undefined {
  if (!contact.emails || contact.emails.length === 0) return undefined;
  
  const primaryEmail = contact.emails.find(e => e.isPrimary);
  return primaryEmail?.email || contact.emails[0]?.email;
}

/**
 * Get primary phone from contact
 */
export function getPrimaryPhone(contact: Contact): string | undefined {
  if (!contact.phones || contact.phones.length === 0) return undefined;
  
  const primaryPhone = contact.phones.find(p => p.isPrimary);
  return primaryPhone?.phone || contact.phones[0]?.phone;
}

/**
 * Format address for display
 */
export function formatAddress(contact: Contact): string {
  if (!contact.address) return 'No address';
  
  const parts: string[] = [];
  if (contact.address.street) parts.push(contact.address.street);
  if (contact.address.city) parts.push(contact.address.city);
  if (contact.address.state) parts.push(contact.address.state);
  if (contact.address.zipCode) parts.push(contact.address.zipCode);
  if (contact.address.country) parts.push(contact.address.country);
  
  return parts.length > 0 ? parts.join(', ') : 'No address';
}

