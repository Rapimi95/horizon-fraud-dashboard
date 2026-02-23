'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRealTimeSimulation } from '@/hooks/useRealTimeSimulation';
import { useFilteredTransactions } from '@/hooks/useFilteredTransactions';
import {
  computeFraudMetrics,
  computeVelocityData,
  getAmountDistribution,
  getTemporalData,
  getDeclineRetryData,
} from '@/lib/fraud-detection';
import { Transaction } from '@/lib/types';

import { FraudOverview } from '@/components/dashboard/FraudOverview';
import { FraudRateTrend } from '@/components/dashboard/FraudRateTrend';
import VelocityChart from '@/components/dashboard/VelocityChart';
import GeoRiskPanel from '@/components/dashboard/GeoRiskPanel';
import AmountDistribution from '@/components/dashboard/AmountDistribution';
import TemporalHeatmap from '@/components/dashboard/TemporalHeatmap';
import DeclineRetryChart from '@/components/dashboard/DeclineRetryChart';
import TransactionPanel from '@/components/dashboard/TransactionPanel';
import TransactionDetail from '@/components/dashboard/TransactionDetail';
import HistoricalPlayback from '@/components/dashboard/HistoricalPlayback';

import { Shield, AlertTriangle } from 'lucide-react';

export default function DashboardPage() {
  const simulation = useRealTimeSimulation();
  const {
    allTransactions,
    visibleTransactions,
    isPlaying,
    speed,
    currentTime,
    isComplete,
    progress,
    startPlayback,
    pausePlayback,
    resumePlayback,
    stopPlayback,
    setSpeed,
    seekTo,
  } = simulation;

  const {
    filteredTransactions,
    filters,
    setIpFilter,
    setEmailFilter,
    setBinFilter,
    setCountryFilter,
    setHourFilter,
    clearFilters,
    activeFilterCount,
  } = useFilteredTransactions(visibleTransactions);

  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Compute metrics from visible transactions
  const metrics = useMemo(
    () => computeFraudMetrics(visibleTransactions),
    [visibleTransactions]
  );

  const isLive = !isPlaying && !isComplete && progress === 0;

  // Handlers for chart interactions → set filters
  const handleEntityClick = useCallback(
    (type: 'ip' | 'email' | 'bin', key: string) => {
      if (type === 'ip') setIpFilter(key);
      else if (type === 'email') setEmailFilter(key);
      else setBinFilter(key);
    },
    [setIpFilter, setEmailFilter, setBinFilter]
  );

  const handleCountryClick = useCallback(
    (country: string) => setCountryFilter(country),
    [setCountryFilter]
  );

  const handleHourClick = useCallback(
    (hour: number) => setHourFilter(hour),
    [setHourFilter]
  );

  const handleCardClick = useCallback(
    (bin: string) => setBinFilter(bin),
    [setBinFilter]
  );

  const handleTransactionSelect = useCallback((tx: Transaction) => {
    setSelectedTransaction(tx);
    setDetailOpen(true);
  }, []);

  const handleDetailClose = useCallback(() => {
    setDetailOpen(false);
    setSelectedTransaction(null);
  }, []);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-red-500" />
            <div>
              <h1 className="text-lg font-bold tracking-tight">
                Horizon Logistics
              </h1>
              <p className="text-xs text-muted-foreground">
                Fraud Risk Operations Dashboard
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {metrics.currentFraudRate > 10 && (
              <div className="flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-1 text-sm font-medium text-red-500 animate-pulse">
                <AlertTriangle className="h-4 w-4" />
                FRAUD ALERT: {metrics.currentFraudRate.toFixed(1)}%
              </div>
            )}
            <div className="flex items-center gap-2">
              {isLive && (
                <span className="flex items-center gap-1.5 text-sm text-emerald-500">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
              )}
              {isPlaying && (
                <span className="flex items-center gap-1.5 text-sm text-amber-500">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  Replaying {speed}x
                </span>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {visibleTransactions.length} transactions
            </span>
          </div>
        </div>
      </header>

      {/* Main Dashboard Content */}
      <main className="container mx-auto space-y-6 px-4 py-6">
        {/* Row 1: KPI Cards */}
        <FraudOverview metrics={metrics} isLive={isLive} />

        {/* Row 2: Fraud Rate Trend */}
        <FraudRateTrend
          data={metrics.fraudRateByHour}
          onHourClick={handleHourClick}
        />

        {/* Row 3: Visualizations Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          <VelocityChart
            transactions={visibleTransactions}
            onEntityClick={handleEntityClick}
          />
          <GeoRiskPanel
            transactions={visibleTransactions}
            onCountryClick={handleCountryClick}
          />
        </div>

        {/* Row 4: More Visualizations */}
        <div className="grid gap-6 lg:grid-cols-2">
          <AmountDistribution
            transactions={visibleTransactions}
          />
          <TemporalHeatmap
            transactions={visibleTransactions}
            onHourClick={handleHourClick}
          />
        </div>

        {/* Row 5: Decline/Retry Patterns */}
        <DeclineRetryChart
          transactions={visibleTransactions}
          onCardClick={handleCardClick}
        />

        {/* Row 6: Transaction Investigation */}
        <TransactionPanel
          transactions={filteredTransactions}
          filters={filters}
          onClearFilters={clearFilters}
          activeFilterCount={activeFilterCount}
          onTransactionSelect={handleTransactionSelect}
        />
      </main>

      {/* Transaction Detail Sheet */}
      <TransactionDetail
        transaction={selectedTransaction}
        allTransactions={visibleTransactions}
        open={detailOpen}
        onClose={handleDetailClose}
      />

      {/* Historical Playback Controls */}
      <HistoricalPlayback
        isPlaying={isPlaying}
        progress={progress}
        speed={speed}
        currentTime={currentTime}
        totalTransactions={allTransactions.length}
        visibleCount={visibleTransactions.length}
        onStartPlayback={startPlayback}
        onPausePlayback={pausePlayback}
        onResumePlayback={resumePlayback}
        onStopPlayback={stopPlayback}
        onSetSpeed={setSpeed}
        onSeekTo={seekTo}
      />
    </div>
  );
}
