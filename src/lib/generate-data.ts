import { Transaction, TransactionStatus, RiskFlag } from './types';

// ============================================================================
// Seeded PRNG (Mulberry32) - deterministic, browser-safe
// ============================================================================
function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEED = 20260222;
let rng = mulberry32(SEED);

function resetRng(): void {
  rng = mulberry32(SEED);
}

function randInt(min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number): number {
  return rng() * (max - min) + min;
}

function pick<T>(arr: T[]): T {
  if (arr.length === 0) throw new Error('pick() called on empty array');
  return arr[Math.floor(rng() * arr.length)];
}

function uuid(index: number): string {
  const hex = (n: number, len: number) => n.toString(16).padStart(len, '0').slice(-len);
  const a = ((index * 2654435761) >>> 0) % 0xffffffff;
  const b = ((index * 340573321) >>> 0) % 0xffff;
  const c = ((index * 1013904223) >>> 0) % 0xffff;
  const d = ((index * 1664525) >>> 0) % 0xffff;
  const e = ((index * 22695477) >>> 0) % 0xffffffffffff;
  return `${hex(a, 8)}-${hex(b, 4)}-4${hex(c, 3)}-${hex(0x8000 | (d & 0x3fff), 4)}-${hex(e, 12)}`;
}

// ============================================================================
// Constants
// ============================================================================
const MERCHANTS: { id: string; name: string }[] = [
  { id: 'M001', name: 'FastCargo Express' },
  { id: 'M002', name: 'SeaRoute Logistics' },
  { id: 'M003', name: 'AirBridge Freight' },
  { id: 'M004', name: 'PacificLine Shipping' },
  { id: 'M005', name: 'AsiaConnect Transport' },
  { id: 'M006', name: 'SwiftPort Delivery' },
  { id: 'M007', name: 'GoldenWave Cargo' },
  { id: 'M008', name: 'TradeWind Logistics' },
];

const SEA_COUNTRIES = ['SG', 'MY', 'TH', 'VN', 'PH', 'ID', 'MM', 'KH', 'LA', 'BN'];

const NORMAL_EMAIL_DOMAINS = [
  'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com',
  'company.sg', 'bizmail.my', 'work.th', 'mail.vn',
];
const DISPOSABLE_EMAIL_DOMAINS = ['tempmail.xyz', 'guerrillamail.com', 'disposable.email'];

const NORMAL_FIRST_NAMES = [
  'wei', 'ming', 'ahmad', 'siti', 'nguyen', 'park', 'tan', 'lee',
  'chen', 'kumar', 'raj', 'maria', 'jose', 'david', 'sarah', 'john',
  'anna', 'james', 'linda', 'michael', 'priya', 'arun', 'fatima', 'ali',
];

const NORMAL_LAST_NAMES = [
  'wong', 'lim', 'ibrahim', 'hassan', 'tran', 'kim', 'singh', 'patel',
  'garcia', 'smith', 'johnson', 'williams', 'brown', 'davis', 'martinez',
];

const NORMAL_IP_PREFIXES = ['103.', '110.', '175.', '202.', '203.', '180.', '124.', '118.'];
const SUSPICIOUS_IPS = [
  '103.45.67.89', // Pattern 1 IP
  '185.220.101.34', '91.234.56.78', '178.128.90.12', '45.155.204.67',
  '193.56.28.103', '89.248.167.45', '185.100.87.202',
];

const NORMAL_BINS = [
  '454212', '521345', '378912', '401288', '535678', '424242',
  '456789', '512345', '400012', '543210', '467890', '501234',
  '410020', '530011', '445566', '400555', '553344',
];

const FRAUD_SHIPPING_COUNTRIES = ['MY', 'TH', 'VN', 'PH'];
const FRAUD_BILLING_COUNTRIES = ['BR', 'NG', 'GH'];
const FRAUD_IP_COUNTRIES = ['RO', 'UA', 'MD'];

const TRANSACTION_DESCRIPTIONS = [
  'Freight forwarding service',
  'Container shipping - standard',
  'Express air cargo',
  'Customs clearance fee',
  'Warehousing service',
  'Last-mile delivery',
  'Cross-border logistics',
  'Supply chain management',
  'Bulk cargo transport',
  'Temperature-controlled shipping',
  'Document courier service',
  'Port handling charges',
];

// ============================================================================
// Helper functions
// ============================================================================
function getBaseDate(): Date {
  const now = new Date();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  return yesterday;
}

function makeTimestamp(hour: number, minute: number, second: number): string {
  const base = getBaseDate();
  base.setHours(hour, minute, second, 0);
  return base.toISOString();
}

function generateNormalEmail(): string {
  const first = pick(NORMAL_FIRST_NAMES);
  const last = pick(NORMAL_LAST_NAMES);
  const num = randInt(1, 999);
  const domain = pick(NORMAL_EMAIL_DOMAINS);
  return `${first}.${last}${num}@${domain}`;
}

function generateFraudEmail(): string {
  const prefix = `user_${randInt(1000, 9999)}`;
  const domain = pick(DISPOSABLE_EMAIL_DOMAINS);
  return `${prefix}@${domain}`;
}

function generateNormalIp(): string {
  const prefix = pick(NORMAL_IP_PREFIXES);
  return `${prefix}${randInt(1, 254)}.${randInt(1, 254)}.${randInt(1, 254)}`;
}

function generateLast4(): string {
  return randInt(1000, 9999).toString();
}

function isDisposableEmail(email: string): boolean {
  return DISPOSABLE_EMAIL_DOMAINS.some((d) => email.endsWith(d));
}

function isRoundNumber(amount: number): boolean {
  return amount === 250 || amount % 100 === 0;
}

// ============================================================================
// Risk score computation
// ============================================================================
function computeRiskScore(
  tx: Omit<Transaction, 'riskScore' | 'riskFlags'>,
  ipCounts: Map<string, number>,
  allBinNumbers: Set<number>
): { riskScore: number; riskFlags: RiskFlag[] } {
  let score = randInt(5, 20);
  const flags: RiskFlag[] = [];

  // Country mismatch
  if (
    tx.billingCountry !== tx.shippingCountry ||
    tx.billingCountry !== tx.ipCountry ||
    tx.shippingCountry !== tx.ipCountry
  ) {
    score += 30;
    flags.push('country_mismatch');
  }

  // High amount
  if (tx.amount > 500) {
    score += 15;
    flags.push('high_amount');
  }

  // Round number
  if (isRoundNumber(tx.amount)) {
    score += 10;
    flags.push('round_amount');
  }

  // High velocity IP
  const ipCount = ipCounts.get(tx.customerIp) || 0;
  if (ipCount > 3) {
    score += 25;
    flags.push('high_velocity_ip');
  }

  // Disposable email
  if (isDisposableEmail(tx.customerEmail)) {
    score += 20;
    flags.push('disposable_email');
  }

  // Retry count
  if (tx.retryCount > 1) {
    score += 15;
    flags.push('excessive_retries');
  }

  // Sequential BIN detection
  const binNum = parseInt(tx.cardBin, 10);
  if (allBinNumbers.has(binNum + 1) || allBinNumbers.has(binNum - 1)) {
    score += 20;
    flags.push('sequential_bin');
  }

  return { riskScore: Math.min(score, 100), riskFlags: flags };
}

// ============================================================================
// Pattern generators
// ============================================================================
let txIndex = 0;

function createBaseTx(overrides: Partial<Transaction>): Omit<Transaction, 'riskScore' | 'riskFlags'> {
  txIndex++;
  const merchant = pick(MERCHANTS);
  return {
    id: uuid(txIndex),
    timestamp: makeTimestamp(12, 0, 0),
    amount: 50,
    currency: 'USD' as const,
    status: 'authorized' as TransactionStatus,
    cardBin: pick(NORMAL_BINS),
    cardLast4: generateLast4(),
    customerEmail: generateNormalEmail(),
    customerIp: generateNormalIp(),
    billingCountry: 'SG',
    shippingCountry: 'SG',
    ipCountry: 'SG',
    merchantId: merchant.id,
    merchantName: merchant.name,
    retryCount: 0,
    shipmentType: 'domestic' as const,
    description: pick(TRANSACTION_DESCRIPTIONS),
    ...overrides,
  };
}

function generatePattern1_IpVelocity(): Omit<Transaction, 'riskScore' | 'riskFlags'>[] {
  const txns: Omit<Transaction, 'riskScore' | 'riskFlags'>[] = [];
  const fraudIp = '103.45.67.89';

  for (let i = 0; i < 18; i++) {
    const minute = Math.floor((i / 18) * 30);
    const second = randInt(0, 59);
    txns.push(
      createBaseTx({
        timestamp: makeTimestamp(14, minute, second),
        amount: parseFloat(randFloat(200, 900).toFixed(2)),
        status: pick(['authorized', 'soft_declined', 'authorized', 'authorized']),
        cardBin: NORMAL_BINS[i % NORMAL_BINS.length],
        cardLast4: generateLast4(),
        customerEmail: generateFraudEmail(),
        customerIp: fraudIp,
        billingCountry: pick(SEA_COUNTRIES),
        shippingCountry: pick(['MY', 'TH', 'VN']),
        ipCountry: 'ID',
        shipmentType: 'cross_border',
        description: 'Cross-border logistics',
      })
    );
  }
  return txns;
}

function generatePattern2_SequentialBins(): Omit<Transaction, 'riskScore' | 'riskFlags'>[] {
  const txns: Omit<Transaction, 'riskScore' | 'riskFlags'>[] = [];

  for (let i = 0; i < 12; i++) {
    const bin = (411111 + i).toString();
    const hour = 13 + Math.floor(i / 4);
    const minute = randInt(0, 59);
    txns.push(
      createBaseTx({
        timestamp: makeTimestamp(hour, minute, randInt(0, 59)),
        amount: parseFloat(randFloat(300, 700).toFixed(2)),
        status: pick(['authorized', 'authorized', 'soft_declined', 'captured']),
        cardBin: bin,
        cardLast4: generateLast4(),
        customerEmail: generateFraudEmail(),
        customerIp: pick(SUSPICIOUS_IPS.slice(1)),
        billingCountry: pick(['US', 'GB', 'AU', 'CA', 'DE', 'FR']),
        shippingCountry: 'MY',
        ipCountry: pick(FRAUD_IP_COUNTRIES),
        shipmentType: 'cross_border',
        description: 'Express air cargo',
      })
    );
  }
  return txns;
}

function generatePattern3_CountryMismatch(): Omit<Transaction, 'riskScore' | 'riskFlags'>[] {
  const txns: Omit<Transaction, 'riskScore' | 'riskFlags'>[] = [];

  for (let i = 0; i < 10; i++) {
    const hour = 12 + Math.floor(i / 2.5);
    txns.push(
      createBaseTx({
        timestamp: makeTimestamp(hour, randInt(0, 59), randInt(0, 59)),
        amount: parseFloat(randFloat(800, 2500).toFixed(2)),
        status: pick(['authorized', 'soft_declined', 'pending']),
        cardBin: pick(NORMAL_BINS),
        cardLast4: generateLast4(),
        customerEmail: generateFraudEmail(),
        customerIp: pick(SUSPICIOUS_IPS.slice(1)),
        billingCountry: pick(FRAUD_BILLING_COUNTRIES),
        shippingCountry: pick(FRAUD_SHIPPING_COUNTRIES),
        ipCountry: pick(FRAUD_IP_COUNTRIES),
        shipmentType: 'cross_border',
        description: 'Bulk cargo transport',
      })
    );
  }
  return txns;
}

function generatePattern4_SoftDeclineRetries(): Omit<Transaction, 'riskScore' | 'riskFlags'>[] {
  const txns: Omit<Transaction, 'riskScore' | 'riskFlags'>[] = [];

  for (let cardIdx = 0; cardIdx < 6; cardIdx++) {
    const bin = pick(NORMAL_BINS);
    const last4 = generateLast4();
    const email = generateFraudEmail();
    const ip = pick(SUSPICIOUS_IPS.slice(1));
    const retries = randInt(3, 5);
    const baseHour = 13 + Math.floor(cardIdx / 2);
    const baseMinute = randInt(0, 50);
    const amount = parseFloat(randFloat(150, 600).toFixed(2));
    const billingCountry = pick(SEA_COUNTRIES);
    const shippingCountry = pick(SEA_COUNTRIES);

    for (let attempt = 0; attempt < retries; attempt++) {
      const isLast = attempt === retries - 1;
      const status: TransactionStatus =
        isLast && rng() > 0.4 ? 'authorized' : 'soft_declined';

      txns.push(
        createBaseTx({
          timestamp: makeTimestamp(baseHour, baseMinute + attempt, randInt(0, 59)),
          amount,
          status,
          cardBin: bin,
          cardLast4: last4,
          customerEmail: email,
          customerIp: ip,
          billingCountry,
          shippingCountry,
          ipCountry: billingCountry,
          retryCount: attempt,
          shipmentType: billingCountry === shippingCountry ? 'domestic' : 'cross_border',
          description: 'Customs clearance fee',
        })
      );
    }
  }
  return txns;
}

function generatePattern5_RoundNumbers(): Omit<Transaction, 'riskScore' | 'riskFlags'>[] {
  const txns: Omit<Transaction, 'riskScore' | 'riskFlags'>[] = [];
  const roundAmounts = [100, 250, 500, 1000];

  for (let i = 0; i < 15; i++) {
    const hour = 15 + Math.floor(i / 5);
    txns.push(
      createBaseTx({
        timestamp: makeTimestamp(Math.min(hour, 17), randInt(0, 59), randInt(0, 59)),
        amount: pick(roundAmounts),
        status: pick(['authorized', 'captured', 'authorized', 'pending']),
        cardBin: pick(NORMAL_BINS),
        cardLast4: generateLast4(),
        customerEmail: rng() > 0.5 ? generateFraudEmail() : generateNormalEmail(),
        customerIp: rng() > 0.5 ? pick(SUSPICIOUS_IPS) : generateNormalIp(),
        billingCountry: pick(SEA_COUNTRIES),
        shippingCountry: pick(SEA_COUNTRIES),
        ipCountry: pick(SEA_COUNTRIES),
        shipmentType: 'cross_border',
        description: 'Container shipping - standard',
      })
    );
  }
  return txns;
}

function generateNormalTransactions(count: number): Omit<Transaction, 'riskScore' | 'riskFlags'>[] {
  const txns: Omit<Transaction, 'riskScore' | 'riskFlags'>[] = [];

  // Hourly distribution weights (24 hours) - realistic traffic pattern
  const hourlyWeights = [
    2, 1, 1, 1, 1, 2, 4, 8, 12, 15, 18, 20,
    22, 25, 28, 30, 28, 25, 20, 15, 10, 8, 5, 3,
  ];
  const totalWeight = hourlyWeights.reduce((a, b) => a + b, 0);

  // Determine how many transactions per hour
  const txnsPerHour: number[] = hourlyWeights.map((w) =>
    Math.max(1, Math.round((w / totalWeight) * count))
  );

  // Adjust total to match count
  let currentTotal = txnsPerHour.reduce((a, b) => a + b, 0);
  while (currentTotal < count) {
    const peakHour = 14 + randInt(0, 3);
    txnsPerHour[peakHour]++;
    currentTotal++;
  }
  while (currentTotal > count) {
    const lowHour = randInt(0, 5);
    if (txnsPerHour[lowHour] > 1) {
      txnsPerHour[lowHour]--;
      currentTotal--;
    }
  }

  // Status distribution: ~70% authorized, ~15% captured, ~10% declined, ~5% pending
  function pickNormalStatus(): TransactionStatus {
    const r = rng();
    if (r < 0.70) return 'authorized';
    if (r < 0.85) return 'captured';
    if (r < 0.90) return 'soft_declined';
    if (r < 0.95) return 'hard_declined';
    return 'pending';
  }

  // Normal amount distribution: most $20-$300, some $300-$600
  function pickNormalAmount(): number {
    const r = rng();
    if (r < 0.70) return parseFloat(randFloat(20, 300).toFixed(2));
    if (r < 0.92) return parseFloat(randFloat(300, 600).toFixed(2));
    return parseFloat(randFloat(600, 1200).toFixed(2));
  }

  for (let hour = 0; hour < 24; hour++) {
    for (let i = 0; i < txnsPerHour[hour]; i++) {
      const minute = randInt(0, 59);
      const second = randInt(0, 59);

      const country = pick(SEA_COUNTRIES);
      const isCrossBorder = rng() < 0.3;
      const shippingCountry = isCrossBorder ? pick(SEA_COUNTRIES) : country;
      const ipCountry = rng() < 0.95 ? country : pick(SEA_COUNTRIES);

      txns.push(
        createBaseTx({
          timestamp: makeTimestamp(hour, minute, second),
          amount: pickNormalAmount(),
          status: pickNormalStatus(),
          cardBin: pick(NORMAL_BINS),
          cardLast4: generateLast4(),
          customerEmail: generateNormalEmail(),
          customerIp: generateNormalIp(),
          billingCountry: country,
          shippingCountry,
          ipCountry,
          retryCount: rng() < 0.03 ? 1 : 0,
          shipmentType: isCrossBorder ? 'cross_border' : 'domestic',
          description: pick(TRANSACTION_DESCRIPTIONS),
        })
      );
    }
  }

  return txns;
}

// ============================================================================
// Main generator
// ============================================================================
export function generateTransactions(): Transaction[] {
  resetRng();
  txIndex = 0;

  // Generate all raw transactions (without risk scores)
  const pattern1 = generatePattern1_IpVelocity();
  const pattern2 = generatePattern2_SequentialBins();
  const pattern3 = generatePattern3_CountryMismatch();
  const pattern4 = generatePattern4_SoftDeclineRetries();
  const pattern5 = generatePattern5_RoundNumbers();
  const normal = generateNormalTransactions(540);

  const allRaw = [...pattern1, ...pattern2, ...pattern3, ...pattern4, ...pattern5, ...normal];

  // Build IP count map for velocity detection
  const ipCounts = new Map<string, number>();
  for (const tx of allRaw) {
    ipCounts.set(tx.customerIp, (ipCounts.get(tx.customerIp) || 0) + 1);
  }

  // Collect all BINs for sequential detection (O(1) lookup)
  const allBinNumbers = new Set(allRaw.map((tx) => parseInt(tx.cardBin, 10)));

  // Compute risk scores and flags
  const transactions: Transaction[] = allRaw.map((tx) => {
    const { riskScore, riskFlags } = computeRiskScore(tx, ipCounts, allBinNumbers);
    return { ...tx, riskScore, riskFlags };
  });

  // Sort by timestamp
  transactions.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return transactions;
}

// ============================================================================
// Utility
// ============================================================================
export function getTransactionsByTimeRange(
  transactions: Transaction[],
  startHour: number,
  endHour: number
): Transaction[] {
  return transactions.filter((tx) => {
    const hour = new Date(tx.timestamp).getHours();
    return hour >= startHour && hour < endHour;
  });
}
