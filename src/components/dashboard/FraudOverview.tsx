'use client';

import React from 'react';
import { FraudMetrics } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  Shield,
  Activity,
  DollarSign,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

interface FraudOverviewProps {
  metrics: FraudMetrics;
  isLive: boolean;
}

function getFraudRateColor(rate: number): string {
  if (rate > 10) return 'text-red-500';
  if (rate > 5) return 'text-orange-500';
  if (rate > 2) return 'text-yellow-500';
  return 'text-green-500';
}

function getFraudRateBorderGradient(rate: number): string {
  if (rate > 10) return 'border-red-500/50 shadow-red-500/20 shadow-lg';
  if (rate > 5) return 'border-orange-500/40 shadow-orange-500/10 shadow-md';
  if (rate > 2) return 'border-yellow-500/30 shadow-yellow-500/10 shadow-sm';
  return 'border-green-500/30 shadow-green-500/10 shadow-sm';
}

function getPendingBorderGradient(count: number): string {
  if (count > 10) return 'border-red-500/40 shadow-red-500/10 shadow-md';
  if (count > 5) return 'border-orange-500/30 shadow-orange-500/10 shadow-sm';
  return 'border-blue-500/20 shadow-blue-500/5 shadow-sm';
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export function FraudOverview({ metrics, isLive }: FraudOverviewProps) {
  const fraudRateDelta = metrics.currentFraudRate - metrics.previousFraudRate;
  const isFraudRateUp = fraudRateDelta > 0;
  const isCrisis = metrics.currentFraudRate > 10;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Fraud Rate Card */}
      <Card
        className={`relative overflow-hidden transition-all duration-300 ${getFraudRateBorderGradient(
          metrics.currentFraudRate
        )} ${isCrisis ? 'ring-2 ring-red-500/60 animate-pulse-subtle' : ''}`}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Fraud Rate
          </CardTitle>
          <div className="flex items-center gap-2">
            {isCrisis && (
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
              </span>
            )}
            <AlertTriangle
              className={`h-4 w-4 ${getFraudRateColor(metrics.currentFraudRate)}`}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-3xl font-bold tracking-tight ${getFraudRateColor(
                metrics.currentFraudRate
              )}`}
            >
              {metrics.currentFraudRate.toFixed(2)}%
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-sm">
            {isFraudRateUp ? (
              <TrendingUp className="h-4 w-4 text-red-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-green-500" />
            )}
            <span
              className={isFraudRateUp ? 'text-red-500' : 'text-green-500'}
            >
              {isFraudRateUp ? '+' : ''}
              {fraudRateDelta.toFixed(2)}%
            </span>
            <span className="text-muted-foreground">vs previous period</span>
          </div>
          {isCrisis && (
            <div className="mt-2">
              <Badge variant="destructive" className="text-xs">
                CRITICAL THRESHOLD EXCEEDED
              </Badge>
            </div>
          )}
        </CardContent>
        {isCrisis && (
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-red-500/5 to-transparent" />
        )}
      </Card>

      {/* Pending Review Card */}
      <Card
        className={`relative overflow-hidden transition-all duration-300 ${getPendingBorderGradient(
          metrics.highRiskPending
        )}`}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Pending Review
          </CardTitle>
          <Shield className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight">
              {metrics.highRiskPending}
            </span>
            {metrics.highRiskPending > 10 && (
              <Badge variant="destructive" className="text-xs animate-pulse">
                URGENT
              </Badge>
            )}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            High-risk transactions awaiting review
          </p>
        </CardContent>
      </Card>

      {/* Transaction Volume Card */}
      <Card className="relative overflow-hidden transition-all duration-300 border-blue-500/20 shadow-blue-500/5 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Transaction Volume
          </CardTitle>
          <div className="flex items-center gap-2">
            {isLive && (
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
            )}
            <Activity className="h-4 w-4 text-blue-500" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold tracking-tight">
              {formatNumber(metrics.totalVolume)}
            </span>
            <span className="text-sm text-muted-foreground">txns</span>
          </div>
          <div className="mt-2 flex items-center gap-3 text-sm">
            <div className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
              <span className="text-muted-foreground">
                {formatNumber(metrics.authorizedCount)} approved
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
              <span className="text-muted-foreground">
                {formatNumber(metrics.declinedCount)} declined
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Value Card */}
      <Card className="relative overflow-hidden transition-all duration-300 border-emerald-500/20 shadow-emerald-500/5 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Value
          </CardTitle>
          <DollarSign className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold tracking-tight">
              {formatCurrency(metrics.totalValue)}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Processed in current window
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
