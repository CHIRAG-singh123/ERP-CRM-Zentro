import type { Deal } from '../services/api/deals';
import { formatCurrency } from './formatting';

/**
 * Get stage color for deal
 */
export function getStageColor(stage: Deal['stage']): string {
  switch (stage) {
    case 'Prospecting':
      return 'text-blue-400';
    case 'Qualification':
      return 'text-yellow-400';
    case 'Proposal':
      return 'text-purple-400';
    case 'Negotiation':
      return 'text-orange-400';
    case 'Closed Won':
      return 'text-green-400';
    case 'Closed Lost':
      return 'text-red-400';
    default:
      return 'text-white/60';
  }
}

/**
 * Get stage background color for badges
 */
export function getStageBgColor(stage: Deal['stage']): string {
  switch (stage) {
    case 'Prospecting':
      return 'bg-blue-500/30 border-blue-500/50 text-blue-300';
    case 'Qualification':
      return 'bg-yellow-500/30 border-yellow-500/50 text-yellow-300';
    case 'Proposal':
      return 'bg-purple-500/30 border-purple-500/50 text-purple-300';
    case 'Negotiation':
      return 'bg-orange-500/30 border-orange-500/50 text-orange-300';
    case 'Closed Won':
      return 'bg-green-500/30 border-green-500/50 text-green-300';
    case 'Closed Lost':
      return 'bg-red-500/30 border-red-500/50 text-red-300';
    default:
      return 'bg-white/10 border-white/20 text-white/60';
  }
}

/**
 * Format deal value for display
 */
export function formatDealValue(value: number, currency: string = 'USD'): string {
  return formatCurrency(value, currency);
}

/**
 * Calculate weighted value (value * probability / 100)
 */
export function calculateWeightedValue(deal: Deal): number {
  const probability = deal.probability || 0;
  return (deal.value * probability) / 100;
}

/**
 * Get probability color based on percentage
 */
export function getProbabilityColor(probability: number): string {
  if (probability >= 75) return 'text-green-400';
  if (probability >= 50) return 'text-yellow-400';
  if (probability >= 25) return 'text-orange-400';
  return 'text-red-400';
}

