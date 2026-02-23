export type TransactionStatus = 'authorized' | 'captured' | 'soft_declined' | 'hard_declined' | 'pending';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type RiskFlag =
  | 'country_mismatch'
  | 'high_amount'
  | 'round_amount'
  | 'high_velocity_ip'
  | 'disposable_email'
  | 'excessive_retries'
  | 'sequential_bin';

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
  riskFlags: RiskFlag[];
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
  riskLevel: RiskLevel;
}

export interface GeoRiskEntry {
  billingCountry: string;
  shippingCountry: string;
  ipCountry: string;
  count: number;
  totalAmount: number;
  mismatch: boolean;
  riskLevel: RiskLevel;
}

export interface FilterState {
  selectedIp?: string;
  selectedEmail?: string;
  selectedBin?: string;
  selectedCountry?: string;
  selectedHour?: number;
  riskLevel?: RiskLevel;
  status?: TransactionStatus;
  searchQuery?: string;
}

export type PlaybackSpeed = 1 | 2 | 5 | 10;
