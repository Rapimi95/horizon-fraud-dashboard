'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Transaction, FilterState, TransactionStatus, RiskLevel } from '@/lib/types';
import { filterTransactions } from '@/lib/fraud-detection';

export function useFilteredTransactions(transactions: Transaction[]) {
  const [filters, setFilters] = useState<FilterState>({});

  const filteredTransactions = useMemo(
    () => filterTransactions(transactions, filters),
    [transactions, filters]
  );

  // Generic filter setter
  const setFilter = useCallback(
    (update: Partial<FilterState>) => {
      setFilters((prev) => ({ ...prev, ...update }));
    },
    []
  );

  const setIpFilter = useCallback(
    (ip: string | undefined) => setFilter({ selectedIp: ip }),
    [setFilter]
  );

  const setEmailFilter = useCallback(
    (email: string | undefined) => setFilter({ selectedEmail: email }),
    [setFilter]
  );

  const setBinFilter = useCallback(
    (bin: string | undefined) => setFilter({ selectedBin: bin }),
    [setFilter]
  );

  const setCountryFilter = useCallback(
    (country: string | undefined) => setFilter({ selectedCountry: country }),
    [setFilter]
  );

  const setHourFilter = useCallback(
    (hour: number | undefined) => setFilter({ selectedHour: hour }),
    [setFilter]
  );

  const setRiskLevelFilter = useCallback(
    (riskLevel: RiskLevel | undefined) => setFilter({ riskLevel }),
    [setFilter]
  );

  const setStatusFilter = useCallback(
    (status: TransactionStatus | undefined) => setFilter({ status }),
    [setFilter]
  );

  // Debounced search query setter
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setSearchQuery = useCallback((searchQuery: string | undefined) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setFilter({ searchQuery });
    }, 300);
  }, [setFilter]);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
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
