/**
 * Calculate conversion rate percentage
 */
export function calculateConversionRate(total: number, converted: number): number {
  if (total === 0) return 0;
  return (converted / total) * 100;
}

/**
 * Format conversion rate as percentage string
 */
export function formatConversionRate(rate: number): string {
  return `${rate.toFixed(1)}%`;
}

/**
 * Get funnel stage color
 */
export function getFunnelStageColor(stage: string): string {
  switch (stage.toLowerCase()) {
    case 'new':
      return '#3B82F6'; // blue
    case 'contacted':
      return '#F59E0B'; // yellow
    case 'qualified':
      return '#10B981'; // green
    case 'converted':
      return '#059669'; // emerald
    case 'lost':
      return '#EF4444'; // red
    default:
      return '#6B7280'; // gray
  }
}

/**
 * Format currency for reports (re-export from formatting.ts for consistency)
 */
export { formatCurrency } from './formatting';

