'use client';

import { useMemo, useCallback } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { computeVelocityData } from '@/lib/fraud-detection';
import type { Transaction, VelocityEntry } from '@/lib/types';

interface VelocityChartProps {
  transactions: Transaction[];
  onEntityClick?: (type: 'ip' | 'email' | 'bin', key: string) => void;
}

const RISK_COLORS: Record<VelocityEntry['riskLevel'], string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
};

function truncateLabel(label: string, maxLen = 20): string {
  if (label.length <= maxLen) return label;
  return label.slice(0, maxLen) + '...';
}

interface VelocityTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: VelocityEntry;
  }>;
}

function VelocityTooltipContent({ active, payload }: VelocityTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const entry = payload[0].payload;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md text-sm">
      <p className="font-semibold mb-1">{entry.key}</p>
      <p>Transactions: {entry.count}</p>
      <p>Total Amount: ${entry.totalAmount.toLocaleString()}</p>
      <p>Unique Cards: {entry.uniqueCards}</p>
      <p>Countries: {entry.countries.join(', ')}</p>
      <p className="mt-1">
        Risk:{' '}
        <span style={{ color: RISK_COLORS[entry.riskLevel] }}>
          {entry.riskLevel.toUpperCase()}
        </span>
      </p>
    </div>
  );
}

function TabChart({
  data,
  type,
  onEntityClick,
}: {
  data: VelocityEntry[];
  type: 'ip' | 'email' | 'bin';
  onEntityClick?: (type: 'ip' | 'email' | 'bin', key: string) => void;
}) {
  const handleClick = useCallback(
    (entry: VelocityEntry) => {
      onEntityClick?.(type, entry.key);
    },
    [onEntityClick, type]
  );

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
      >
        <XAxis type="number" allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="key"
          width={160}
          tickFormatter={(value: string) => truncateLabel(value)}
          tick={{ fontSize: 12 }}
        />
        <Tooltip content={<VelocityTooltipContent />} />
        <Bar
          dataKey="count"
          radius={[0, 4, 4, 0]}
          cursor="pointer"
          onClick={(_data: unknown, index: number) => {
            if (data[index]) handleClick(data[index]);
          }}
        >
          {data.map((entry) => (
            <Cell
              key={entry.key}
              fill={RISK_COLORS[entry.riskLevel]}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function VelocityChart({ transactions, onEntityClick }: VelocityChartProps) {
  const velocityData = useMemo(
    () => computeVelocityData(transactions),
    [transactions]
  );

  const ipData = useMemo(
    () => velocityData.filter((e) => e.type === 'ip').slice(0, 10),
    [velocityData]
  );

  const emailData = useMemo(
    () => velocityData.filter((e) => e.type === 'email').slice(0, 10),
    [velocityData]
  );

  const binData = useMemo(
    () => velocityData.filter((e) => e.type === 'bin').slice(0, 10),
    [velocityData]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Velocity Analysis</CardTitle>
        <CardDescription>Transaction frequency by entity</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="ip">
          <TabsList>
            <TabsTrigger value="ip">IP Addresses</TabsTrigger>
            <TabsTrigger value="email">Emails</TabsTrigger>
            <TabsTrigger value="bin">Card BINs</TabsTrigger>
          </TabsList>
          <TabsContent value="ip">
            <TabChart data={ipData} type="ip" onEntityClick={onEntityClick} />
          </TabsContent>
          <TabsContent value="email">
            <TabChart data={emailData} type="email" onEntityClick={onEntityClick} />
          </TabsContent>
          <TabsContent value="bin">
            <TabChart data={binData} type="bin" onEntityClick={onEntityClick} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
