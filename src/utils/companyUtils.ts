import type { Company } from '../services/api/companies';

export interface CompanyGridItem {
  _id: string;
  account: string;
  type: string;
  owner: string;
  arr: string;
  health: 'Excellent' | 'Good' | 'Monitor' | 'At Risk';
}

/**
 * Transforms Company data to DataGrid format
 */
export function transformCompanyToGridItem(company: Company): CompanyGridItem {
  // Get company name
  const account = company.name || 'Unnamed Company';

  // Determine type based on tags or default to 'Customer'
  let type = 'Customer';
  if (company.tags && company.tags.length > 0) {
    const typeTag = company.tags.find(tag => 
      ['Customer', 'Prospect', 'Partner', 'Vendor', 'Lead'].includes(tag)
    );
    if (typeTag) {
      type = typeTag;
    }
  }

  // Get owner name or "Unknown"
  const owner = company.createdBy?.name || 'Unknown';

  // Calculate ARR (Annual Recurring Revenue) - can be from tags or default
  // For now, we'll use a placeholder or calculate from tags if available
  let arr = '$0';
  if (company.tags && company.tags.length > 0) {
    const arrTag = company.tags.find(tag => tag.startsWith('ARR:'));
    if (arrTag) {
      arr = arrTag.replace('ARR:', '');
    } else {
      // Default ARR based on type
      arr = type === 'Customer' ? '$100K' : type === 'Prospect' ? '$0' : '$50K';
    }
  } else {
    arr = '$0';
  }

  // Determine health status based on industry, tags, or other criteria
  let health: 'Excellent' | 'Good' | 'Monitor' | 'At Risk' = 'Good';
  
  if (company.tags && company.tags.length > 0) {
    const healthTag = company.tags.find(tag => 
      ['Excellent', 'Good', 'Monitor', 'At Risk'].includes(tag)
    );
    if (healthTag) {
      health = healthTag as 'Excellent' | 'Good' | 'Monitor' | 'At Risk';
    } else {
      // Default health based on type
      if (type === 'Customer') {
        health = 'Excellent';
      } else if (type === 'Prospect') {
        health = 'Monitor';
      } else {
        health = 'Good';
      }
    }
  } else {
    // Default health based on type
    if (type === 'Customer') {
      health = 'Excellent';
    } else if (type === 'Prospect') {
      health = 'Monitor';
    } else {
      health = 'Good';
    }
  }

  return {
    _id: company._id,
    account,
    type,
    owner,
    arr,
    health,
  };
}

/**
 * Format address for display
 */
export function formatCompanyAddress(company: Company): string {
  if (!company.address) return 'No address';
  
  const parts: string[] = [];
  if (company.address.street) parts.push(company.address.street);
  if (company.address.city) parts.push(company.address.city);
  if (company.address.state) parts.push(company.address.state);
  if (company.address.zipCode) parts.push(company.address.zipCode);
  if (company.address.country) parts.push(company.address.country);
  
  return parts.length > 0 ? parts.join(', ') : 'No address';
}

/**
 * Get health status color
 */
export function getHealthColor(health: 'Excellent' | 'Good' | 'Monitor' | 'At Risk'): string {
  switch (health) {
    case 'Excellent':
      return 'text-green-400';
    case 'Good':
      return 'text-[#A8DADC]';
    case 'Monitor':
      return 'text-yellow-400';
    case 'At Risk':
      return 'text-red-400';
    default:
      return 'text-white/60';
  }
}

