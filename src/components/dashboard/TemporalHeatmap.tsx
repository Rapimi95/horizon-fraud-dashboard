'use client';

import { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import {
  Tooltip as ShadTooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getTemporalData } from '@/lib/fraud-detection';
import type { Transaction } from '@/lib/types';

interface TemporalHeatmapProps {
  transactions: Transaction[];
  onHourClick?: (hour: number) => void;
}

type FraudBucket = 'low' | 'moderate' | 'elevated' | 'high';

function getFraudBucket(rate: number): FraudBucket {
  if (rate > 10) return 'high';
  if (rate > 5) return 'elevated';
  if (rate > 2) return 'moderate';
  return 'low';
}

const BUCKET_COLORS: Record<FraudBucket, string> = {
  low: 'bg-green-200 dark:bg-green-800/60',
  moderate: 'bg-yellow-200 dark:bg-yellow-700/60',
  elevated: 'bg-orange-300 dark:bg-orange-700/60',
  high: 'bg-red-400 dark:bg-red-700/60',
};

const BUCKET_TEXT_COLORS: Record<FraudBucket, string> = {
  low: 'text-green-900 dark:text-green-100',
  moderate: 'text-yellow-900 dark:text-yellow-100',
  elevated: 'text-orange-900 dark:text-orange-100',
  high: 'text-red-900 dark:text-red-100',
};

const LEGEND_ITEMS: { label: string; bucket: FraudBucket }[] = [
  { label: '0-2%', bucket: 'low' },
  { label: '2-5%', bucket: 'moderate' },
  { label: '5-10%', bucket: 'elevated' },
  { label: '>10%', bucket: 'high' },
];

function formatHour(hour: number): string {
  if (hour === 0) return '12a';
  if (hour < 12) return `${hour}a`;
  if (hour === 12) return '12p';
  return `${hour - 12}p`;
}

export default function TemporalHeatmap({ transactions, onHourClick }: TemporalHeatmapProps) {
  const temporalData = useMemo(
    () => getTemporalData(transactions),
    [transactions]
  );

  const peakHours = useMemo(() => {
    if (temporalData.length === 0) return new Set<number>();
    const maxRate = Math.max(...temporalData.map((d) => d.rate));
    if (maxRate === 0) return new Set<number>();
    // Peak hours are those within 90% of max rate and above 5%
    const threshold = Math.max(maxRate * 0.9, 5);
    return new Set(
      temporalData.filter((d) => d.rate >= threshold).map((d) => d.hour)
    );
  }, [temporalData]);

  const [hoveredHour, setHoveredHour] = useState<number | null>(null);

  const topRow = temporalData.slice(0, 12);
  const bottomRow = temporalData.slice(12, 24);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fraud Density by Hour</CardTitle>
        <CardDescription>
          Fraud rate across 24-hour period (UTC)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Heatmap grid */}
          <div className="space-y-1.5">
            {[topRow, bottomRow].map((row, rowIndex) => (
              <div
                key={rowIndex}
                className="grid grid-cols-12 gap-1"
              >
                {row.map((entry) => {
                  const bucket = getFraudBucket(entry.rate);
                  const isPeak = peakHours.has(entry.hour);
                  return (
                    <ShadTooltip key={entry.hour}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className={`
                            relative flex flex-col items-center justify-center
                            rounded-md p-1 min-h-[52px] transition-all
                            ${BUCKET_COLORS[bucket]}
                            ${BUCKET_TEXT_COLORS[bucket]}
                            ${isPeak ? 'ring-2 ring-red-500 animate-pulse' : ''}
                            ${hoveredHour === entry.hour ? 'scale-110 z-10 shadow-lg' : ''}
                            cursor-pointer hover:opacity-90
                          `}
                          onClick={() => onHourClick?.(entry.hour)}
                          onMouseEnter={() => setHoveredHour(entry.hour)}
                          onMouseLeave={() => setHoveredHour(null)}
                        >
                          <span className="text-[10px] font-medium leading-none">
                            {formatHour(entry.hour)}
                          </span>
                          <span className="text-xs font-bold leading-tight mt-0.5">
                            {entry.flagged}
                          </span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-xs space-y-0.5">
                          <p className="font-semibold">
                            {entry.hour.toString().padStart(2, '0')}:00 - {entry.hour.toString().padStart(2, '0')}:59
                          </p>
                          <p>Total transactions: {entry.total}</p>
                          <p>Flagged: {entry.flagged}</p>
                          <p>Fraud rate: {entry.rate.toFixed(1)}%</p>
                        </div>
                      </TooltipContent>
                    </ShadTooltip>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 pt-2">
            {LEGEND_ITEMS.map((item) => (
              <div key={item.bucket} className="flex items-center gap-1.5">
                <div
                  className={`w-3 h-3 rounded-sm ${BUCKET_COLORS[item.bucket]}`}
                />
                <span className="text-xs text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
