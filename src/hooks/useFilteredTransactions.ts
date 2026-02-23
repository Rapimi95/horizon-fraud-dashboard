'use client';

import { useState, useMemo, useCallback } from 'react';
import { Transaction, FilterState, TransactionStatus } from '@/lib/types';
import { filterTransactions } from '@/lib/fraud-detection';

export function useFilteredTransactions(transactions: Transaction[]) {
  const [filters, setFilters] = useState<FilterState>({});

  const filteredTransactions = useMemo(
    () => filterTransactions(transactions, filters),
    [transactions, filters]
  );

  const setIpFilter = useCallback((ip: string | undefined) => {
    setFilters((prev) => ({ ...prev, selectedIp: ip }));
  }, []);

  const setEmailFilter = useCallback((email: string | undefined) => {
    setFilters((prev) => ({ ...prev, selectedEmail: email }));
  }, []);

  const setBinFilter = useCallback((bin: string | undefined) => {
    setFilters((prev) => ({ ...prev, selectedBin: bin }));
  }, []);

  const setCountryFilter = useCallback((country: string | undefined) => {
    setFilters((prev) => ({ ...prev, selectedCountry: country }));
  }, []);

  const setHourFilter = useCallback((hour: number | undefined) => {
    setFilters((prev) => ({ ...prev, selectedHour: hour }));
  }, []);

  const setRiskLevelFilter = useCallback(
    (riskLevel: 'low' | 'medium' | 'high' | 'critical' | undefined) => {
      setFilters((prev) => ({ ...prev, riskLevel }));
    },
    []
  );

  const setStatusFilter = useCallback((status: TransactionStatus | undefined) => {
    setFilters((prev) => ({ ...prev, status }));
  }, []);

  const setSearchQuery = useCallback((searchQuery: string | undefined) => {
    setFilters((prev) => ({ ...prev, searchQuery }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.selectedIp) count++;
    if (filters.selectedEmail) count++;
    if (filters.selectedBin) count++;
    if (filters.selectedCountry) count++;
    if (filters.selectedHour !== undefined) count++;
    if (filters.riskLevel) count++;
    if (filters.status) count++;
    if (filters.searchQuery) count++;
    return count;
  }, [filters]);

  return {
    filteredTransactions,
    filters,
    setIpFilter,
    setEmailFilter,
    setBinFilter,
    setCountryFilter,
    setHourFilter,
    setRiskLevelFilter,
    setStatusFilter,
    setSearchQuery,
    clearFilters,
    activeFilterCount,
  };
}
