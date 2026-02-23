'use client';

import { memo, useCallback } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import type { CategoricalChartFunc } from 'recharts/types/chart/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface FraudRateTrendProps {
  data: { hour: number; rate: number; volume: number; flagged: number }[];
  onHourClick?: (hour: number) => void;
}

const CHART_MARGIN = { top: 8, right: 8, left: 0, bottom: 0 };
const AXIS_TICK_STYLE = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' };
const AXIS_LINE_STYLE = { stroke: 'hsl(var(--border))' };
const RATE_DOT_STYLE = {
  r: 3,
  fill: 'hsl(var(--background))',
  stroke: '#ef4444',
  strokeWidth: 2,
};
const RATE_ACTIVE_DOT_STYLE = {
  r: 5,
  fill: '#ef4444',
  stroke: 'hsl(var(--background))',
  strokeWidth: 2,
};
const TOOLTIP_CURSOR_STYLE = {
  stroke: 'hsl(var(--muted-foreground))',
  strokeWidth: 1,
  strokeDasharray: '4 4',
};
const REFERENCE_LABEL = {
  value: '2% threshold',
  position: 'insideTopRight' as const,
  fill: '#ef4444',
  fontSize: 11,
  fontWeight: 500,
};

function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    dataKey: string;
    payload: { hour: number; rate: number; volume: number; flagged: number };
  }>;
  label?: number;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;

  return (
    <div className="rounded-lg border border-border/50 bg-zinc-900 px-4 py-3 shadow-xl">
      <p className="mb-2 text-sm font-semibold text-zinc-100">
        {formatHour(data.hour)}
      </p>
      <div className="space-y-1 text-sm">
        <div className="flex items-center justify-between gap-6">
          <span className="text-zinc-400">Fraud Rate</span>
          <span
            className={`font-mono font-medium ${
              data.rate > 10
                ? 'text-red-400'
                : data.rate > 5
                ? 'text-orange-400'
                : data.rate > 2
                ? 'text-yellow-400'
                : 'text-green-400'
            }`}
          >
            {data.rate.toFixed(2)}%
          </span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-zinc-400">Volume</span>
          <span className="font-mono text-zinc-200">{data.volume}</span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-zinc-400">Flagged</span>
          <span className="font-mono text-red-400">{data.flagged}</span>
        </div>
      </div>
    </div>
  );
}

export const FraudRateTrend = memo(function FraudRateTrend({ data, onHourClick }: FraudRateTrendProps) {
  const handleChartClick: CategoricalChartFunc = useCallback(
    (nextState) => {
      if (!onHourClick) return;

      // In Recharts 3.x, the click handler receives MouseHandlerDataParam
      // which has activeTooltipIndex (the index into the data array)
      const activeIndex = nextState?.activeTooltipIndex;
      if (typeof activeIndex === 'number' && activeIndex >= 0 && activeIndex < data.length) {
        onHourClick(data[activeIndex].hour);
      }
    },
    [onHourClick, data]
  );

  const maxVolume = Math.max(...data.map((d) => d.volume), 1);
  const maxRate = Math.max(...data.map((d) => d.rate), 5);

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Fraud Rate Trend (24h)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={CHART_MARGIN}
              onClick={handleChartClick}
              style={{ cursor: onHourClick ? 'pointer' : 'default' }}
            >
              <defs>
                {/* Gradient for fraud rate area */}
                <linearGradient id="fraudRateGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.4} />
                  <stop offset="40%" stopColor="#f97316" stopOpacity={0.25} />
                  <stop offset="70%" stopColor="#eab308" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0.05} />
                </linearGradient>
                {/* Gradient for volume area */}
                <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6b7280" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#6b7280" stopOpacity={0.02} />
                </linearGradient>
                {/* Stroke gradient for fraud rate line */}
                <linearGradient id="fraudRateStroke" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#22c55e" />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                opacity={0.3}
                vertical={false}
              />

              <XAxis
                dataKey="hour"
                tickFormatter={formatHour}
                tick={AXIS_TICK_STYLE}
                axisLine={AXIS_LINE_STYLE}
                tickLine={false}
                interval={2}
              />

              {/* Left Y-axis: Fraud Rate % */}
              <YAxis
                yAxisId="rate"
                orientation="left"
                domain={[0, Math.ceil(maxRate * 1.2)]}
                tickFormatter={(value: number) => `${value}%`}
                tick={AXIS_TICK_STYLE}
                axisLine={false}
                tickLine={false}
                width={45}
              />

              {/* Right Y-axis: Volume */}
              <YAxis
                yAxisId="volume"
                orientation="right"
                domain={[0, Math.ceil(maxVolume * 1.3)]}
                tick={AXIS_TICK_STYLE}
                axisLine={false}
                tickLine={false}
                width={40}
              />

              <Tooltip
                content={<CustomTooltip />}
                cursor={TOOLTIP_CURSOR_STYLE}
              />

              {/* Industry threshold reference line at 2% */}
              <ReferenceLine
                yAxisId="rate"
                y={2}
                stroke="#ef4444"
                strokeDasharray="6 4"
                strokeWidth={1.5}
                opacity={0.7}
                label={REFERENCE_LABEL}
              />

              {/* Volume area (behind, subtle gray) */}
              <Area
                yAxisId="volume"
                type="monotone"
                dataKey="volume"
                stroke="#6b7280"
                strokeWidth={1}
                strokeOpacity={0.3}
                fill="url(#volumeGradient)"
                dot={false}
                activeDot={false}
              />

              {/* Fraud rate area (primary, colored) */}
              <Area
                yAxisId="rate"
                type="monotone"
                dataKey="rate"
                stroke="url(#fraudRateStroke)"
                strokeWidth={2.5}
                fill="url(#fraudRateGradient)"
                dot={RATE_DOT_STYLE}
                activeDot={RATE_ACTIVE_DOT_STYLE}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
});
