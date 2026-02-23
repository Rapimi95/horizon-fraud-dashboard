'use client';

import { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Legend,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { getAmountDistribution } from '@/lib/fraud-detection';
import type { Transaction } from '@/lib/types';

interface AmountDistributionProps {
  transactions: Transaction[];
  onRangeClick?: (range: string) => void;
}

interface DistributionTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: { range: string; count: number; flagged: number; normal: number };
  }>;
  label?: string;
}

function DistributionTooltipContent({ active, payload }: DistributionTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload;
  const total = data.count;
  const flaggedPct = total > 0 ? ((data.flagged / total) * 100).toFixed(1) : '0.0';

  return (
    <div className="rounded-lg border bg-background p-3 shadow-md text-sm">
      <p className="font-semibold mb-1">{data.range}</p>
      <p>Total: {total}</p>
      <p>Flagged: {data.flagged}</p>
      <p>Normal: {data.normal}</p>
      <p className="text-red-500">Flagged Rate: {flaggedPct}%</p>
    </div>
  );
}

const ROUND_AMOUNTS = [100, 250, 500, 1000];
const ROUND_AMOUNT_LABELS: Record<number, string> = {
  100: '$100',
  250: '$250',
  500: '$500',
  1000: '$1000',
};

// Map round amounts to the range labels that contain them
const ROUND_AMOUNT_RANGES: Record<number, string> = {
  100: '$100-200',
  250: '$200-500',
  500: '$500-1000',
  1000: '$1000+',
};

export default function AmountDistribution({ transactions, onRangeClick }: AmountDistributionProps) {
  const distribution = useMemo(
    () => getAmountDistribution(transactions),
    [transactions]
  );

  const chartData = useMemo(
    () =>
      distribution.map((d) => ({
        ...d,
        normal: d.count - d.flagged,
      })),
    [distribution]
  );

  const roundNumberCount = useMemo(
    () =>
      transactions.filter((tx) => ROUND_AMOUNTS.includes(tx.amount)).length,
    [transactions]
  );

  // Determine which ranges have round number markers
  const roundAmountRanges = useMemo(() => {
    const ranges = new Set<string>();
    for (const amt of ROUND_AMOUNTS) {
      const range = ROUND_AMOUNT_RANGES[amt];
      if (range && distribution.some((d) => d.range === range)) {
        ranges.add(range);
      }
    }
    return ranges;
  }, [distribution]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Amount Distribution</CardTitle>
        <CardDescription>
          Round number transactions: {roundNumberCount}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
          >
            <XAxis dataKey="range" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} />
            <Tooltip content={<DistributionTooltipContent />} />
            <Legend />
            {/* Reference lines for round number amount ranges */}
            {Array.from(roundAmountRanges).map((range) => (
              <ReferenceLine
                key={range}
                x={range}
                stroke="#a855f7"
                strokeDasharray="3 3"
                strokeWidth={1.5}
                label={{
                  value: '\u{25C6}',
                  position: 'top',
                  fill: '#a855f7',
                  fontSize: 14,
                }}
              />
            ))}
            <Bar
              dataKey="normal"
              stackId="stack"
              fill="#3b82f6"
              name="Normal"
              radius={[0, 0, 0, 0]}
              cursor="pointer"
              onClick={(_data: unknown, index: number) => {
                if (chartData[index]) onRangeClick?.(chartData[index].range);
              }}
            />
            <Bar
              dataKey="flagged"
              stackId="stack"
              fill="#ef4444"
              name="Flagged"
              radius={[4, 4, 0, 0]}
              cursor="pointer"
              onClick={(_data: unknown, index: number) => {
                if (chartData[index]) onRangeClick?.(chartData[index].range);
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
