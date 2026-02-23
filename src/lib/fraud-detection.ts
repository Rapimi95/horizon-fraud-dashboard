import {
  Transaction,
  FraudMetrics,
  VelocityEntry,
  GeoRiskEntry,
  FilterState,
} from './types';

// ============================================================================
// Fraud Metrics
// ============================================================================
export function computeFraudMetrics(transactions: Transaction[]): FraudMetrics {
  const total = transactions.length;
  if (total === 0) {
    return {
      currentFraudRate: 0,
      previousFraudRate: 0,
      highRiskPending: 0,
      totalVolume: 0,
      totalValue: 0,
      authorizedCount: 0,
      declinedCount: 0,
      fraudRateByHour: [],
    };
  }

  const flagged = transactions.filter((tx) => tx.riskScore >= 60);
  const currentFraudRate = (flagged.length / total) * 100;

  // Simulate a "previous" fraud rate (slightly lower for comparison)
  const previousFraudRate = Math.max(0, currentFraudRate * 0.65);

  const highRiskPending = transactions.filter(
    (tx) => tx.riskScore >= 60 && tx.status === 'pending'
  ).length;

  const totalValue = transactions.reduce((sum, tx) => sum + tx.amount, 0);

  const authorizedCount = transactions.filter(
    (tx) => tx.status === 'authorized' || tx.status === 'captured'
  ).length;

  const declinedCount = transactions.filter(
    (tx) => tx.status === 'soft_declined' || tx.status === 'hard_declined'
  ).length;

  // Fraud rate by hour
  const hourBuckets: Map<number, { total: number; flagged: number }> = new Map();
  for (let h = 0; h < 24; h++) {
    hourBuckets.set(h, { total: 0, flagged: 0 });
  }

  for (const tx of transactions) {
    const hour = new Date(tx.timestamp).getHours();
    const bucket = hourBuckets.get(hour)!;
    bucket.total++;
    if (tx.riskScore >= 60) {
      bucket.flagged++;
    }
  }

  const fraudRateByHour = Array.from(hourBuckets.entries()).map(([hour, data]) => ({
    hour,
    rate: data.total > 0 ? (data.flagged / data.total) * 100 : 0,
    volume: data.total,
    flagged: data.flagged,
  }));

  return {
    currentFraudRate: parseFloat(currentFraudRate.toFixed(2)),
    previousFraudRate: parseFloat(previousFraudRate.toFixed(2)),
    highRiskPending,
    totalVolume: total,
    totalValue: parseFloat(totalValue.toFixed(2)),
    authorizedCount,
    declinedCount,
    fraudRateByHour,
  };
}

// ============================================================================
// Velocity Data
// ============================================================================
export function computeVelocityData(transactions: Transaction[]): VelocityEntry[] {
  const ipMap = new Map<string, Transaction[]>();
  const emailMap = new Map<string, Transaction[]>();
  const binMap = new Map<string, Transaction[]>();

  for (const tx of transactions) {
    // Group by IP
    if (!ipMap.has(tx.customerIp)) ipMap.set(tx.customerIp, []);
    ipMap.get(tx.customerIp)!.push(tx);

    // Group by email
    if (!emailMap.has(tx.customerEmail)) emailMap.set(tx.customerEmail, []);
    emailMap.get(tx.customerEmail)!.push(tx);

    // Group by BIN
    if (!binMap.has(tx.cardBin)) binMap.set(tx.cardBin, []);
    binMap.get(tx.cardBin)!.push(tx);
  }

  function getRiskLevel(count: number): 'low' | 'medium' | 'high' | 'critical' {
    if (count >= 10) return 'critical';
    if (count >= 5) return 'high';
    if (count >= 3) return 'medium';
    return 'low';
  }

  function mapToEntries(
    map: Map<string, Transaction[]>,
    type: 'ip' | 'email' | 'bin'
  ): VelocityEntry[] {
    const entries: VelocityEntry[] = [];
    Array.from(map.entries()).forEach(([key, txns]) => {
      const uniqueCards = new Set(txns.map((tx) => `${tx.cardBin}-${tx.cardLast4}`)).size;
      const countries = Array.from(new Set(txns.flatMap((tx) => [tx.billingCountry, tx.shippingCountry, tx.ipCountry])));
      const totalAmount = txns.reduce((sum, tx) => sum + tx.amount, 0);

      entries.push({
        key,
        type,
        count: txns.length,
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        uniqueCards,
        countries,
        riskLevel: getRiskLevel(txns.length),
      });
    });
    return entries;
  }

  const allEntries = [
    ...mapToEntries(ipMap, 'ip'),
    ...mapToEntries(emailMap, 'email'),
    ...mapToEntries(binMap, 'bin'),
  ];

  // Sort by count descending, return top 20
  allEntries.sort((a, b) => b.count - a.count);
  return allEntries.slice(0, 20);
}

// ============================================================================
// Geo Risk Data
// ============================================================================
export function computeGeoRiskData(transactions: Transaction[]): GeoRiskEntry[] {
  const geoMap = new Map<
    string,
    {
      billingCountry: string;
      shippingCountry: string;
      ipCountry: string;
      count: number;
      totalAmount: number;
      mismatch: boolean;
    }
  >();

  for (const tx of transactions) {
    const key = `${tx.billingCountry}|${tx.shippingCountry}|${tx.ipCountry}`;
    if (!geoMap.has(key)) {
      const mismatch =
        tx.billingCountry !== tx.shippingCountry ||
        tx.billingCountry !== tx.ipCountry ||
        tx.shippingCountry !== tx.ipCountry;
      geoMap.set(key, {
        billingCountry: tx.billingCountry,
        shippingCountry: tx.shippingCountry,
        ipCountry: tx.ipCountry,
        count: 0,
        totalAmount: 0,
        mismatch,
      });
    }
    const entry = geoMap.get(key)!;
    entry.count++;
    entry.totalAmount += tx.amount;
  }

  const entries: GeoRiskEntry[] = Array.from(geoMap.values()).map((entry) => {
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    const score = entry.count * (entry.mismatch ? 3 : 1);
    if (score >= 15) riskLevel = 'critical';
    else if (score >= 8) riskLevel = 'high';
    else if (score >= 4) riskLevel = 'medium';
    else riskLevel = 'low';

    return {
      ...entry,
      totalAmount: parseFloat(entry.totalAmount.toFixed(2)),
      riskLevel,
    };
  });

  // Sort by count * mismatch weight descending
  entries.sort((a, b) => {
    const scoreA = a.count * (a.mismatch ? 3 : 1);
    const scoreB = b.count * (b.mismatch ? 3 : 1);
    return scoreB - scoreA;
  });

  return entries;
}

// ============================================================================
// Amount Distribution
// ============================================================================
export function getAmountDistribution(
  transactions: Transaction[]
): { range: string; count: number; flagged: number }[] {
  const buckets: { range: string; min: number; max: number; count: number; flagged: number }[] = [
    { range: '$0-50', min: 0, max: 50, count: 0, flagged: 0 },
    { range: '$50-100', min: 50, max: 100, count: 0, flagged: 0 },
    { range: '$100-200', min: 100, max: 200, count: 0, flagged: 0 },
    { range: '$200-500', min: 200, max: 500, count: 0, flagged: 0 },
    { range: '$500-1000', min: 500, max: 1000, count: 0, flagged: 0 },
    { range: '$1000+', min: 1000, max: Infinity, count: 0, flagged: 0 },
  ];

  for (const tx of transactions) {
    for (const bucket of buckets) {
      if (tx.amount >= bucket.min && tx.amount < bucket.max) {
        bucket.count++;
        if (tx.riskScore >= 60) {
          bucket.flagged++;
        }
        break;
      }
    }
    // Handle exact $1000+ boundary
    if (tx.amount >= 1000) {
      // Already handled by the $1000+ bucket with max: Infinity
    }
  }

  return buckets.map(({ range, count, flagged }) => ({ range, count, flagged }));
}

// ============================================================================
// Temporal Data
// ============================================================================
export function getTemporalData(
  transactions: Transaction[]
): { hour: number; total: number; flagged: number; rate: number }[] {
  const hourData: Map<number, { total: number; flagged: number }> = new Map();

  for (let h = 0; h < 24; h++) {
    hourData.set(h, { total: 0, flagged: 0 });
  }

  for (const tx of transactions) {
    const hour = new Date(tx.timestamp).getHours();
    const data = hourData.get(hour)!;
    data.total++;
    if (tx.riskScore >= 60) {
      data.flagged++;
    }
  }

  return Array.from(hourData.entries()).map(([hour, data]) => ({
    hour,
    total: data.total,
    flagged: data.flagged,
    rate: data.total > 0 ? parseFloat(((data.flagged / data.total) * 100).toFixed(2)) : 0,
  }));
}

// ============================================================================
// Decline Retry Data
// ============================================================================
export function getDeclineRetryData(
  transactions: Transaction[]
): { cardBin: string; cardLast4: string; retries: number; lastStatus: string; amount: number; email: string }[] {
  const cardMap = new Map<
    string,
    {
      cardBin: string;
      cardLast4: string;
      maxRetry: number;
      lastStatus: string;
      amount: number;
      email: string;
      lastTimestamp: string;
    }
  >();

  for (const tx of transactions) {
    if (tx.retryCount > 0) {
      const key = `${tx.cardBin}-${tx.cardLast4}`;

      if (!cardMap.has(key)) {
        cardMap.set(key, {
          cardBin: tx.cardBin,
          cardLast4: tx.cardLast4,
          maxRetry: tx.retryCount,
          lastStatus: tx.status,
          amount: tx.amount,
          email: tx.customerEmail,
          lastTimestamp: tx.timestamp,
        });
      } else {
        const entry = cardMap.get(key)!;
        if (tx.retryCount > entry.maxRetry) {
          entry.maxRetry = tx.retryCount;
        }
        // Track the latest attempt
        if (tx.timestamp > entry.lastTimestamp) {
          entry.lastStatus = tx.status;
          entry.lastTimestamp = tx.timestamp;
        }
      }
    }
  }

  const results = Array.from(cardMap.values()).map((entry) => ({
    cardBin: entry.cardBin,
    cardLast4: entry.cardLast4,
    retries: entry.maxRetry,
    lastStatus: entry.lastStatus,
    amount: entry.amount,
    email: entry.email,
  }));

  // Sort by retries descending
  results.sort((a, b) => b.retries - a.retries);

  return results;
}

// ============================================================================
// Filter Transactions
// ============================================================================
export function filterTransactions(
  transactions: Transaction[],
  filters: FilterState
): Transaction[] {
  return transactions.filter((tx) => {
    if (filters.selectedIp && tx.customerIp !== filters.selectedIp) {
      return false;
    }

    if (filters.selectedEmail && tx.customerEmail !== filters.selectedEmail) {
      return false;
    }

    if (filters.selectedBin && tx.cardBin !== filters.selectedBin) {
      return false;
    }

    if (filters.selectedCountry) {
      const country = filters.selectedCountry;
      if (
        tx.billingCountry !== country &&
        tx.shippingCountry !== country &&
        tx.ipCountry !== country
      ) {
        return false;
      }
    }

    if (filters.selectedHour !== undefined) {
      const hour = new Date(tx.timestamp).getHours();
      if (hour !== filters.selectedHour) {
        return false;
      }
    }

    if (filters.riskLevel) {
      const txRiskLevel = getRiskLevelFromScore(tx.riskScore);
      if (txRiskLevel !== filters.riskLevel) {
        return false;
      }
    }

    if (filters.status && tx.status !== filters.status) {
      return false;
    }

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const searchable = [
        tx.id,
        tx.customerEmail,
        tx.customerIp,
        tx.cardBin,
        tx.cardLast4,
        tx.merchantName,
        tx.billingCountry,
        tx.shippingCountry,
        tx.ipCountry,
        tx.description,
        ...tx.riskFlags,
      ]
        .join(' ')
        .toLowerCase();

      if (!searchable.includes(query)) {
        return false;
      }
    }

    return true;
  });
}

// ============================================================================
// Helper
// ============================================================================
function getRiskLevelFromScore(score: number): 'low' | 'medium' | 'high' | 'critical' {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}
