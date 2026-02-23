'use client';

import { memo, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Search, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  STATUS_STYLES,
  STATUS_LABELS,
  getRiskColor,
  getRiskBadgeStyle,
  formatTime,
  formatAmount,
} from '@/lib/format-utils';
import type { Transaction, FilterState } from '@/lib/types';

interface TransactionPanelProps {
  transactions: Transaction[];
  filters: FilterState;
  onClearFilters: () => void;
  activeFilterCount: number;
  onTransactionSelect: (tx: Transaction) => void;
}

function hasCountryMismatch(tx: Transaction): boolean {
  return (
    tx.billingCountry !== tx.shippingCountry ||
    tx.billingCountry !== tx.ipCountry ||
    tx.shippingCountry !== tx.ipCountry
  );
}

function ActiveFilters({
  filters,
  onClearFilters,
}: {
  filters: FilterState;
  onClearFilters: () => void;
}) {
  const activeEntries: { label: string; value: string }[] = [];

  if (filters.selectedIp) activeEntries.push({ label: 'IP', value: filters.selectedIp });
  if (filters.selectedEmail) activeEntries.push({ label: 'Email', value: filters.selectedEmail });
  if (filters.selectedBin) activeEntries.push({ label: 'BIN', value: filters.selectedBin });
  if (filters.selectedCountry) activeEntries.push({ label: 'Country', value: filters.selectedCountry });
  if (filters.selectedHour !== undefined) activeEntries.push({ label: 'Hour', value: `${filters.selectedHour}:00` });
  if (filters.riskLevel) activeEntries.push({ label: 'Risk', value: filters.riskLevel });
  if (filters.status) activeEntries.push({ label: 'Status', value: STATUS_LABELS[filters.status] });
  if (filters.searchQuery) activeEntries.push({ label: 'Search', value: filters.searchQuery });

  if (activeEntries.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-3">
      <span className="text-sm text-muted-foreground font-medium">Active filters:</span>
      {activeEntries.map((entry) => (
        <Badge
          key={entry.label}
          variant="secondary"
          className="flex items-center gap-1 px-2 py-1 text-xs"
        >
          <span className="font-semibold">{entry.label}:</span>
          <span className="max-w-[120px] truncate">{entry.value}</span>
        </Badge>
      ))}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearFilters}
        className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <X className="h-3 w-3 mr-1" />
        Clear all
      </Button>
    </div>
  );
}

export const TransactionPanel = memo(function TransactionPanel({
  transactions,
  filters,
  onClearFilters,
  activeFilterCount,
  onTransactionSelect,
}: TransactionPanelProps) {
  const sortedTransactions = useMemo(
    () => [...transactions].sort((a, b) => b.riskScore - a.riskScore),
    [transactions]
  );

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Search className="h-5 w-5 text-muted-foreground" />
            Transaction Investigation
          </CardTitle>
          {activeFilterCount > 0 && (
            <Badge variant="outline" className="text-xs">
              {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Showing {sortedTransactions.length.toLocaleString()} of{' '}
          {transactions.length.toLocaleString()} transactions
        </p>
      </CardHeader>

      <CardContent className="pt-0">
        <ActiveFilters filters={filters} onClearFilters={onClearFilters} />

        {sortedTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertTriangle className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              No transactions match filters
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Try adjusting or clearing filters to see results.
            </p>
            {activeFilterCount > 0 && (
              <Button variant="outline" size="sm" className="mt-3" onClick={onClearFilters}>
                Clear all filters
              </Button>
            )}
          </div>
        ) : (
          <ScrollArea className="max-h-[500px] overflow-auto rounded-md border">
            <div className="overflow-x-auto min-w-[800px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[80px] text-xs">Time</TableHead>
                  <TableHead className="w-[100px] text-xs text-right">Amount</TableHead>
                  <TableHead className="w-[100px] text-xs">Status</TableHead>
                  <TableHead className="w-[120px] text-xs">Card</TableHead>
                  <TableHead className="w-[160px] text-xs">Email</TableHead>
                  <TableHead className="w-[140px] text-xs">Countries</TableHead>
                  <TableHead className="w-[80px] text-xs text-center">Risk</TableHead>
                  <TableHead className="text-xs">Flags</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTransactions.map((tx) => {
                  const mismatch = hasCountryMismatch(tx);
                  const isHighRisk = tx.riskScore >= 60;

                  return (
                    <TableRow
                      key={tx.id}
                      className={cn(
                        'cursor-pointer transition-colors hover:bg-muted/60',
                        isHighRisk && 'border-l-2 border-l-red-400'
                      )}
                      onClick={() => onTransactionSelect(tx)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onTransactionSelect(tx);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                    >
                      <TableCell className="text-xs font-mono py-2">
                        {formatTime(tx.timestamp)}
                      </TableCell>

                      <TableCell className="text-xs font-mono text-right py-2 font-medium">
                        {formatAmount(tx.amount)}
                      </TableCell>

                      <TableCell className="py-2">
                        <Badge
                          variant="outline"
                          className={cn('text-[10px] px-1.5 py-0', STATUS_STYLES[tx.status])}
                        >
                          {STATUS_LABELS[tx.status]}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-xs font-mono py-2">
                        {tx.cardBin} *{tx.cardLast4}
                      </TableCell>

                      <TableCell className="text-xs py-2 max-w-[160px] truncate" title={tx.customerEmail}>
                        {tx.customerEmail}
                      </TableCell>

                      <TableCell className="py-2">
                        <span
                          className={cn(
                            'text-xs',
                            mismatch && 'text-red-600 font-medium'
                          )}
                          title={`Billing: ${tx.billingCountry}, Shipping: ${tx.shippingCountry}, IP: ${tx.ipCountry}`}
                        >
                          {tx.billingCountry} &rarr; {tx.shippingCountry}
                          {tx.ipCountry !== tx.billingCountry || tx.ipCountry !== tx.shippingCountry ? (
                            <span className="text-red-500"> ({tx.ipCountry})</span>
                          ) : (
                            <span className="text-muted-foreground"> ({tx.ipCountry})</span>
                          )}
                        </span>
                      </TableCell>

                      <TableCell className="py-2">
                        <div className="flex items-center justify-center gap-1.5">
                          <div className="w-8 h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn('h-full rounded-full', getRiskColor(tx.riskScore))}
                              style={{ width: `${tx.riskScore}%` }}
                            />
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] px-1 py-0 min-w-[28px] text-center',
                              getRiskBadgeStyle(tx.riskScore)
                            )}
                          >
                            {tx.riskScore}
                          </Badge>
                        </div>
                      </TableCell>

                      <TableCell className="py-2">
                        <div className="flex items-center gap-1 flex-wrap">
                          {tx.riskFlags.slice(0, 2).map((flag) => (
                            <Badge
                              key={flag}
                              variant="outline"
                              className="text-[10px] px-1 py-0 bg-muted/50"
                            >
                              {flag.replace(/_/g, ' ')}
                            </Badge>
                          ))}
                          {tx.riskFlags.length > 2 && (
                            <span className="text-[10px] text-muted-foreground font-medium">
                              +{tx.riskFlags.length - 2} more
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
});
