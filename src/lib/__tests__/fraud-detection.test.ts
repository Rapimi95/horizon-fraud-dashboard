import {
  computeFraudMetrics,
  computeVelocityData,
  computeGeoRiskData,
  getAmountDistribution,
  getTemporalData,
  getDeclineRetryData,
  filterTransactions,
} from '../fraud-detection';
import { generateTransactions } from '../generate-data';
import { Transaction, FilterState } from '../types';

describe('fraud-detection', () => {
  let transactions: Transaction[];

  beforeAll(() => {
    transactions = generateTransactions();
  });

  // ==================================================================
  // computeFraudMetrics
  // ==================================================================
  describe('computeFraudMetrics', () => {
    it('returns correct structure with all fields', () => {
      const metrics = computeFraudMetrics(transactions);
      expect(metrics).toHaveProperty('currentFraudRate');
      expect(metrics).toHaveProperty('previousFraudRate');
      expect(metrics).toHaveProperty('highRiskPending');
      expect(metrics).toHaveProperty('totalVolume');
      expect(metrics).toHaveProperty('totalValue');
      expect(metrics).toHaveProperty('authorizedCount');
      expect(metrics).toHaveProperty('declinedCount');
      expect(metrics).toHaveProperty('fraudRateByHour');
    });

    it('currentFraudRate is between 0 and 100', () => {
      const metrics = computeFraudMetrics(transactions);
      expect(metrics.currentFraudRate).toBeGreaterThanOrEqual(0);
      expect(metrics.currentFraudRate).toBeLessThanOrEqual(100);
    });

    it('totalVolume equals the input array length', () => {
      const metrics = computeFraudMetrics(transactions);
      expect(metrics.totalVolume).toBe(transactions.length);
    });

    it('totalValue is the sum of all amounts', () => {
      const metrics = computeFraudMetrics(transactions);
      const expectedTotal = parseFloat(
        transactions.reduce((sum, tx) => sum + tx.amount, 0).toFixed(2)
      );
      expect(metrics.totalValue).toBeCloseTo(expectedTotal, 1);
    });

    it('fraudRateByHour has 24 entries (one per hour)', () => {
      const metrics = computeFraudMetrics(transactions);
      expect(metrics.fraudRateByHour).toHaveLength(24);
      for (let h = 0; h < 24; h++) {
        const entry = metrics.fraudRateByHour.find((e) => e.hour === h);
        expect(entry).toBeDefined();
      }
    });

    it('returns zero metrics for empty array', () => {
      const metrics = computeFraudMetrics([]);
      expect(metrics.currentFraudRate).toBe(0);
      expect(metrics.previousFraudRate).toBe(0);
      expect(metrics.highRiskPending).toBe(0);
      expect(metrics.totalVolume).toBe(0);
      expect(metrics.totalValue).toBe(0);
      expect(metrics.authorizedCount).toBe(0);
      expect(metrics.declinedCount).toBe(0);
      expect(metrics.fraudRateByHour).toHaveLength(0);
    });
  });

  // ==================================================================
  // computeVelocityData
  // ==================================================================
  describe('computeVelocityData', () => {
    it('returns max 20 entries', () => {
      const data = computeVelocityData(transactions);
      expect(data.length).toBeLessThanOrEqual(20);
    });

    it('entries are sorted by count descending', () => {
      const data = computeVelocityData(transactions);
      for (let i = 1; i < data.length; i++) {
        expect(data[i - 1].count).toBeGreaterThanOrEqual(data[i].count);
      }
    });

    it('IP 103.45.67.89 appears in results with high count', () => {
      const data = computeVelocityData(transactions);
      const fraudIpEntry = data.find((e) => e.key === '103.45.67.89');
      expect(fraudIpEntry).toBeDefined();
      expect(fraudIpEntry!.count).toBeGreaterThanOrEqual(10);
    });

    it('each entry has correct type (ip, email, or bin)', () => {
      const data = computeVelocityData(transactions);
      for (const entry of data) {
        expect(['ip', 'email', 'bin']).toContain(entry.type);
      }
    });
  });

  // ==================================================================
  // computeGeoRiskData
  // ==================================================================
  describe('computeGeoRiskData', () => {
    it('mismatched entries have mismatch=true', () => {
      const data = computeGeoRiskData(transactions);
      const mismatched = data.filter((e) => e.mismatch);
      for (const entry of mismatched) {
        const allSame =
          entry.billingCountry === entry.shippingCountry &&
          entry.billingCountry === entry.ipCountry;
        expect(allSame).toBe(false);
      }
    });

    it('entries where all three countries are the same have mismatch=false', () => {
      const data = computeGeoRiskData(transactions);
      const matched = data.filter((e) => !e.mismatch);
      for (const entry of matched) {
        expect(entry.billingCountry).toBe(entry.shippingCountry);
        expect(entry.billingCountry).toBe(entry.ipCountry);
      }
    });

    it('results are sorted (mismatched entries weighted higher)', () => {
      const data = computeGeoRiskData(transactions);
      for (let i = 1; i < data.length; i++) {
        const scoreA = data[i - 1].count * (data[i - 1].mismatch ? 3 : 1);
        const scoreB = data[i].count * (data[i].mismatch ? 3 : 1);
        expect(scoreA).toBeGreaterThanOrEqual(scoreB);
      }
    });
  });

  // ==================================================================
  // getAmountDistribution
  // ==================================================================
  describe('getAmountDistribution', () => {
    it('returns 6 buckets', () => {
      const dist = getAmountDistribution(transactions);
      expect(dist).toHaveLength(6);
    });

    it('bucket names are correct', () => {
      const dist = getAmountDistribution(transactions);
      const expectedNames = [
        '$0-50',
        '$50-100',
        '$100-200',
        '$200-500',
        '$500-1000',
        '$1000+',
      ];
      expect(dist.map((b) => b.range)).toEqual(expectedNames);
    });

    it('sum of all bucket counts equals total transactions', () => {
      const dist = getAmountDistribution(transactions);
      const totalCounted = dist.reduce((sum, b) => sum + b.count, 0);
      expect(totalCounted).toBe(transactions.length);
    });

    it('flagged count <= total count for each bucket', () => {
      const dist = getAmountDistribution(transactions);
      for (const bucket of dist) {
        expect(bucket.flagged).toBeLessThanOrEqual(bucket.count);
      }
    });
  });

  // ==================================================================
  // getTemporalData
  // ==================================================================
  describe('getTemporalData', () => {
    it('returns 24 entries (one per hour)', () => {
      const data = getTemporalData(transactions);
      expect(data).toHaveLength(24);
    });

    it('each entry has hour, total, flagged, rate', () => {
      const data = getTemporalData(transactions);
      for (const entry of data) {
        expect(entry).toHaveProperty('hour');
        expect(entry).toHaveProperty('total');
        expect(entry).toHaveProperty('flagged');
        expect(entry).toHaveProperty('rate');
      }
    });

    it('rate = (flagged / total) * 100 for each hour (or 0 if total is 0)', () => {
      const data = getTemporalData(transactions);
      for (const entry of data) {
        if (entry.total === 0) {
          expect(entry.rate).toBe(0);
        } else {
          const expectedRate = parseFloat(
            ((entry.flagged / entry.total) * 100).toFixed(2)
          );
          expect(entry.rate).toBeCloseTo(expectedRate, 1);
        }
      }
    });
  });

  // ==================================================================
  // getDeclineRetryData
  // ==================================================================
  describe('getDeclineRetryData', () => {
    it('returns entries sorted by retries descending', () => {
      const data = getDeclineRetryData(transactions);
      for (let i = 1; i < data.length; i++) {
        expect(data[i - 1].retries).toBeGreaterThanOrEqual(data[i].retries);
      }
    });

    it('each entry has retries > 0', () => {
      const data = getDeclineRetryData(transactions);
      for (const entry of data) {
        expect(entry.retries).toBeGreaterThan(0);
      }
    });
  });

  // ==================================================================
  // filterTransactions
  // ==================================================================
  describe('filterTransactions', () => {
    it('filtering by IP returns only transactions with that IP', () => {
      const ip = '103.45.67.89';
      const filtered = filterTransactions(transactions, { selectedIp: ip });
      expect(filtered.length).toBeGreaterThan(0);
      for (const tx of filtered) {
        expect(tx.customerIp).toBe(ip);
      }
    });

    it('filtering by email returns only transactions with that email', () => {
      const email = transactions[0].customerEmail;
      const filtered = filterTransactions(transactions, {
        selectedEmail: email,
      });
      expect(filtered.length).toBeGreaterThan(0);
      for (const tx of filtered) {
        expect(tx.customerEmail).toBe(email);
      }
    });

    it('filtering by status returns only transactions with that status', () => {
      const filtered = filterTransactions(transactions, {
        status: 'pending',
      });
      expect(filtered.length).toBeGreaterThan(0);
      for (const tx of filtered) {
        expect(tx.status).toBe('pending');
      }
    });

    it('filtering by riskLevel returns appropriate transactions', () => {
      const filtered = filterTransactions(transactions, {
        riskLevel: 'critical',
      });
      expect(filtered.length).toBeGreaterThan(0);
      for (const tx of filtered) {
        // critical = riskScore >= 80
        expect(tx.riskScore).toBeGreaterThanOrEqual(80);
      }
    });

    it('clearFilters (empty FilterState {}) returns all transactions', () => {
      const filtered = filterTransactions(transactions, {});
      expect(filtered.length).toBe(transactions.length);
    });

    it('multiple filters combine (AND logic)', () => {
      const ip = '103.45.67.89';
      const ipOnly = filterTransactions(transactions, { selectedIp: ip });
      const combined = filterTransactions(transactions, {
        selectedIp: ip,
        status: 'authorized',
      });

      // Combined result should be a subset of IP-only result
      expect(combined.length).toBeLessThanOrEqual(ipOnly.length);
      for (const tx of combined) {
        expect(tx.customerIp).toBe(ip);
        expect(tx.status).toBe('authorized');
      }
    });
  });
});
