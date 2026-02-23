export type TransactionStatus = 'authorized' | 'captured' | 'soft_declined' | 'hard_declined' | 'pending';

export interface Transaction {
  id: string;
  timestamp: string;
  amount: number;
  currency: 'USD';
  status: TransactionStatus;
  cardBin: string;
  cardLast4: string;
  customerEmail: string;
  customerIp: string;
  billingCountry: string;
  shippingCountry: string;
  ipCountry: string;
  merchantId: string;
  merchantName: string;
  retryCount: number;
  riskScore: number;
  riskFlags: string[];
  shipmentType: 'domestic' | 'cross_border';
  description: string;
}

export interface FraudMetrics {
  currentFraudRate: number;
  previousFraudRate: number;
  highRiskPending: number;
  totalVolume: number;
  totalValue: number;
  authorizedCount: number;
  declinedCount: number;
  fraudRateByHour: { hour: number; rate: number; volume: number; flagged: number }[];
}

export interface VelocityEntry {
  key: string;
  type: 'ip' | 'email' | 'bin';
  count: number;
  totalAmount: number;
  uniqueCards: number;
  countries: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface GeoRiskEntry {
  billingCountry: string;
  shippingCountry: string;
  ipCountry: string;
  count: number;
  totalAmount: number;
  mismatch: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface FilterState {
  selectedIp?: string;
  selectedEmail?: string;
  selectedBin?: string;
  selectedCountry?: string;
  selectedHour?: number;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  status?: TransactionStatus;
  searchQuery?: string;
}

export type PlaybackSpeed = 1 | 2 | 5 | 10;
