'use client';

import { memo, useMemo } from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DeclineRetryChartProps {
  retryData: RetryEntry[];
  onCardClick?: (bin: string) => void;
}

type RetryEntry = {
  cardBin: string;
  cardLast4: string;
  retries: number;
  lastStatus: string;
  amount: number;
  email: string;
};

function getStatusColor(status: string): string {
  if (status === 'authorized' || status === 'captured') return '#22c55e';
  if (status === 'soft_declined') return '#f97316';
  return '#ef4444'; // hard_declined and others
}

function getStatusBadgeVariant(status: string): {
  className: string;
  label: string;
} {
  switch (status) {
    case 'authorized':
    case 'captured':
      return {
        className: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
        label: status,
      };
    case 'soft_declined':
      return {
        className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
        label: 'soft declined',
      };
    case 'hard_declined':
      return {
        className: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
        label: 'hard declined',
      };
    default:
      return {
        className: 'bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300',
        label: status,
      };
  }
}

interface ScatterTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: RetryEntry;
  }>;
}

function ScatterTooltipContent({ active, payload }: ScatterTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const entry = payload[0].payload;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md text-sm">
      <p className="font-semibold mb-1">
        {entry.cardBin} **** {entry.cardLast4}
      </p>
      <p>Retries: {entry.retries}</p>
      <p>Amount: ${entry.amount.toLocaleString()}</p>
      <p>Status: {entry.lastStatus}</p>
      <p>Email: {entry.email}</p>
    </div>
  );
}

export const DeclineRetryChart = memo(function DeclineRetryChart({ retryData, onCardClick }: DeclineRetryChartProps) {
  const maxRetries = useMemo(
    () => Math.max(1, ...retryData.map((d) => d.retries)),
    [retryData]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Decline &amp; Retry Patterns</CardTitle>
        <CardDescription>
          {retryData.length} card{retryData.length !== 1 ? 's' : ''} with retry attempts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Scatter Chart */}
          {retryData.length > 0 ? (
            <div aria-label="Decline and retry scatter chart">
            <ResponsiveContainer width="100%" height={200}>
              <ScatterChart margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                <XAxis
                  type="number"
                  dataKey="retries"
                  name="Retries"
                  domain={[0, maxRetries + 1]}
                  allowDecimals={false}
                  label={{ value: 'Retries', position: 'insideBottom', offset: -5, fontSize: 12 }}
                />
                <YAxis
                  type="number"
                  dataKey="amount"
                  name="Amount"
                  label={{ value: 'Amount ($)', angle: -90, position: 'insideLeft', fontSize: 12 }}
                />
                <ZAxis
                  type="number"
                  dataKey="retries"
                  range={[40, 400]}
                  name="Retry Size"
                />
                <Tooltip content={<ScatterTooltipContent />} />
                <Scatter
                  data={retryData}
                  cursor="pointer"
                  onClick={(entry: RetryEntry) => {
                    onCardClick?.(entry.cardBin);
                  }}
                >
                  {retryData.map((entry) => (
                    <Cell
                      key={`${entry.cardBin}-${entry.cardLast4}`}
                      fill={getStatusColor(entry.lastStatus)}
                      fillOpacity={0.7}
                      stroke={getStatusColor(entry.lastStatus)}
                      strokeWidth={1}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
              No retry data available
            </div>
          )}

          {/* Legend for scatter */}
          <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>Still Declined</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span>Soft Declined</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span>Eventually Authorized</span>
            </div>
          </div>

          {/* Table */}
          <ScrollArea className="h-[200px]">
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Card BIN</TableHead>
                  <TableHead>Last 4</TableHead>
                  <TableHead className="text-right">Retries</TableHead>
                  <TableHead>Last Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Email</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {retryData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No retry data available
                    </TableCell>
                  </TableRow>
                ) : (
                  retryData.map((entry) => {
                    const statusBadge = getStatusBadgeVariant(entry.lastStatus);
                    return (
                      <TableRow
                        key={`${entry.cardBin}-${entry.cardLast4}`}
                        className="cursor-pointer"
                        onClick={() => onCardClick?.(entry.cardBin)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onCardClick?.(entry.cardBin);
                          }
                        }}
                        tabIndex={0}
                        role="button"
                      >
                        <TableCell className="font-mono font-medium">
                          {entry.cardBin}
                        </TableCell>
                        <TableCell className="font-mono">{entry.cardLast4}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {entry.retries}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusBadge.className}>
                            {statusBadge.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          ${entry.amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate" title={entry.email}>
                          {entry.email}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
});
