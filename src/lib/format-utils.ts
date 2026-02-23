import type { TransactionStatus } from './types';

// ============================================================================
// Pre-instantiated Intl formatters (cached at module level)
// ============================================================================
const currencyFormatterFull = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
});

const currencyFormatterRounded = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('en-US');

// ============================================================================
// Formatting functions
// ============================================================================

/** Formats amount as $1,234.56 */
export function formatAmount(amount: number): string {
  return currencyFormatterFull.format(amount);
}

/** Formats currency rounded (no decimals) */
export function formatCurrency(value: number): string {
  return currencyFormatterRounded.format(value);
}

/** Formats number with locale separators */
export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

/** Formats ISO timestamp to HH:MM:SS (24h) */
export function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/** Formats Date object to HH:MM:SS (24h) */
export function formatTimeFromDate(date: Date | null): string {
  if (!date) return '--:--:--';
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/** Formats ISO timestamp to full date-time string */
export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

// ============================================================================
// Status styling
// ============================================================================
export const STATUS_STYLES: Record<TransactionStatus, string> = {
  authorized: 'bg-green-100 text-green-800 border-green-300',
  captured: 'bg-blue-100 text-blue-800 border-blue-300',
  soft_declined: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  hard_declined: 'bg-red-100 text-red-800 border-red-300',
  pending: 'bg-gray-100 text-gray-800 border-gray-300',
};

export const STATUS_LABELS: Record<TransactionStatus, string> = {
  authorized: 'Authorized',
  captured: 'Captured',
  soft_declined: 'Soft Declined',
  hard_declined: 'Hard Declined',
  pending: 'Pending',
};

// ============================================================================
// Risk styling
// ============================================================================
export function getRiskColor(score: number): string {
  if (score >= 80) return 'bg-red-500';
  if (score >= 60) return 'bg-orange-500';
  if (score >= 40) return 'bg-yellow-500';
  return 'bg-green-500';
}

export function getRiskBadgeStyle(score: number): string {
  if (score >= 80) return 'bg-red-100 text-red-800 border-red-300';
  if (score >= 60) return 'bg-orange-100 text-orange-800 border-orange-300';
  if (score >= 40) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
  return 'bg-green-100 text-green-800 border-green-300';
}

export function getRiskLabel(score: number): string {
  if (score >= 80) return 'Critical';
  if (score >= 60) return 'High';
  if (score >= 40) return 'Medium';
  return 'Low';
}
