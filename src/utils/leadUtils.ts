import type { Lead } from '../services/api/leads';
import { formatDate, formatCurrency } from './formatting';

/**
 * Get status color for lead
 */
export function getStatusColor(status: Lead['status']): string {
  switch (status) {
    case 'New':
      return 'text-blue-400';
    case 'Contacted':
      return 'text-yellow-400';
    case 'Qualified':
      return 'text-green-400';
    case 'Lost':
      return 'text-red-400';
    case 'Converted':
      return 'text-emerald-400';
    default:
      return 'text-white/60';
  }
}

/**
 * Get status background color for badges
 */
export function getStatusBgColor(status: Lead['status']): string {
  switch (status) {
    case 'New':
      return 'bg-blue-500/30 border-blue-500/50 text-blue-300';
    case 'Contacted':
      return 'bg-yellow-500/30 border-yellow-500/50 text-yellow-300';
    case 'Qualified':
      return 'bg-green-500/30 border-green-500/50 text-green-300';
    case 'Lost':
      return 'bg-red-500/30 border-red-500/50 text-red-300';
    case 'Converted':
      return 'bg-emerald-500/30 border-emerald-500/50 text-emerald-300';
    default:
      return 'bg-white/10 border-white/20 text-white/60';
  }
}

/**
 * Format lead value for display
 */
export function formatLeadValue(value?: number): string {
  if (!value || value === 0) return 'N/A';
  return formatCurrency(value);
}

/**
 * Format expected close date
 */
export function formatExpectedCloseDate(date?: string): string {
  if (!date) return 'Not set';
  return formatDate(date, 'short');
}

/**
 * Get source display name
 */
export function getSourceDisplayName(source: Lead['source']): string {
  const names: Record<Lead['source'], string> = {
    website: 'Website',
    referral: 'Referral',
    social: 'Social Media',
    email: 'Email',
    phone: 'Phone',
    other: 'Other',
  };
  return names[source] || source;
}

