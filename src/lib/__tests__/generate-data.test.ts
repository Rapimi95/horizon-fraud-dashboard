import { generateTransactions, getTransactionsByTimeRange } from '../generate-data';
import { Transaction } from '../types';

describe('generateTransactions', () => {
  let transactions: Transaction[];

  beforeAll(() => {
    transactions = generateTransactions();
  });

  // ---- Basic structure ----

  it('returns an array of 500+ transactions', () => {
    expect(Array.isArray(transactions)).toBe(true);
    expect(transactions.length).toBeGreaterThanOrEqual(500);
  });

  it('all transactions have required fields', () => {
    const requiredFields: (keyof Transaction)[] = [
      'id',
      'timestamp',
      'amount',
      'currency',
      'status',
      'cardBin',
      'cardLast4',
      'customerEmail',
      'customerIp',
      'billingCountry',
      'shippingCountry',
      'ipCountry',
      'merchantId',
      'merchantName',
      'retryCount',
      'riskScore',
      'riskFlags',
      'shipmentType',
      'description',
    ];

    for (const tx of transactions) {
      for (const field of requiredFields) {
        expect(tx).toHaveProperty(field);
      }
    }
  });

  it('transactions are sorted by timestamp', () => {
    for (let i = 1; i < transactions.length; i++) {
      const prev = new Date(transactions[i - 1].timestamp).getTime();
      const curr = new Date(transactions[i].timestamp).getTime();
      expect(curr).toBeGreaterThanOrEqual(prev);
    }
  });

  it('is deterministic: calling generateTransactions() twice yields identical results', () => {
    const first = generateTransactions();
    const second = generateTransactions();
    expect(first.length).toBe(second.length);
    for (let i = 0; i < first.length; i++) {
      expect(first[i].id).toBe(second[i].id);
      expect(first[i].amount).toBe(second[i].amount);
      expect(first[i].timestamp).toBe(second[i].timestamp);
      expect(first[i].customerIp).toBe(second[i].customerIp);
      expect(first[i].cardBin).toBe(second[i].cardBin);
    }
  });

  // ---- Status distribution ----

  it('status distribution is roughly correct (~70% authorized/captured, rest declined/pending)', () => {
    const authorizedOrCaptured = transactions.filter(
      (tx) => tx.status === 'authorized' || tx.status === 'captured'
    ).length;
    const ratio = authorizedOrCaptured / transactions.length;
    // Allow a wide tolerance since fraud patterns skew distribution
    expect(ratio).toBeGreaterThan(0.5);
    expect(ratio).toBeLessThan(0.95);
  });

  // ---- Field validations ----

  it('amount values are positive numbers', () => {
    for (const tx of transactions) {
      expect(typeof tx.amount).toBe('number');
      expect(tx.amount).toBeGreaterThan(0);
    }
  });

  it('card BINs are 6-digit strings', () => {
    for (const tx of transactions) {
      expect(typeof tx.cardBin).toBe('string');
      expect(tx.cardBin).toMatch(/^\d{6}$/);
    }
  });

  it('timestamps are valid ISO date strings', () => {
    for (const tx of transactions) {
      const date = new Date(tx.timestamp);
      expect(date.getTime()).not.toBeNaN();
      // ISO string should be parsable and round-trip
      expect(typeof tx.timestamp).toBe('string');
    }
  });

  // ---- Embedded fraud patterns ----

  describe('Pattern 1 - IP Velocity', () => {
    it('at least 15 transactions from IP 103.45.67.89', () => {
      const fromFraudIp = transactions.filter(
        (tx) => tx.customerIp === '103.45.67.89'
      );
      expect(fromFraudIp.length).toBeGreaterThanOrEqual(15);
    });
  });

  describe('Pattern 2 - Sequential BINs', () => {
    it('transactions with BINs 411111 through at least 411118 exist', () => {
      const allBins = new Set(transactions.map((tx) => tx.cardBin));
      for (let bin = 411111; bin <= 411118; bin++) {
        expect(allBins.has(bin.toString())).toBe(true);
      }
    });
  });

  describe('Pattern 3 - Country Mismatch', () => {
    it('at least 8 transactions where billingCountry is BR/NG/GH and shippingCountry is MY/TH/VN/PH', () => {
      const billingCountries = new Set(['BR', 'NG', 'GH']);
      const shippingCountries = new Set(['MY', 'TH', 'VN', 'PH']);
      const mismatched = transactions.filter(
        (tx) =>
          billingCountries.has(tx.billingCountry) &&
          shippingCountries.has(tx.shippingCountry)
      );
      expect(mismatched.length).toBeGreaterThanOrEqual(8);
    });
  });

  describe('Pattern 4 - Soft Decline Retries', () => {
    it('transactions with retryCount >= 3 exist', () => {
      const withRetries = transactions.filter((tx) => tx.retryCount >= 3);
      expect(withRetries.length).toBeGreaterThan(0);
    });
  });

  describe('Pattern 5 - Round Numbers', () => {
    it('at least 10 transactions with amounts exactly 100, 250, 500, or 1000', () => {
      const roundAmounts = new Set([100, 250, 500, 1000]);
      const roundTxns = transactions.filter((tx) => roundAmounts.has(tx.amount));
      expect(roundTxns.length).toBeGreaterThanOrEqual(10);
    });
  });
});

describe('getTransactionsByTimeRange', () => {
  let transactions: Transaction[];

  beforeAll(() => {
    transactions = generateTransactions();
  });

  it('returns only transactions within the specified hour range', () => {
    const result = getTransactionsByTimeRange(transactions, 12, 14);
    expect(result.length).toBeGreaterThan(0);
    for (const tx of result) {
      const hour = new Date(tx.timestamp).getHours();
      expect(hour).toBeGreaterThanOrEqual(12);
      expect(hour).toBeLessThan(14);
    }
  });

  it('returns empty array for hours with no transactions (e.g., hour 25-26)', () => {
    const result = getTransactionsByTimeRange(transactions, 25, 26);
    expect(result).toEqual([]);
  });

  it('returns a subset of total transactions for valid ranges', () => {
    const result = getTransactionsByTimeRange(transactions, 10, 15);
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThan(transactions.length);
  });
});
