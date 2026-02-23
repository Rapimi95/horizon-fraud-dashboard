'use client';

import { memo, useMemo } from 'react';
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
import type { GeoRiskEntry } from '@/lib/types';

interface GeoRiskPanelProps {
  geoData: GeoRiskEntry[];
  onCountryClick?: (country: string) => void;
}

const FLAG_MAP: Record<string, string> = {
  SG: '\u{1F1F8}\u{1F1EC}',
  MY: '\u{1F1F2}\u{1F1FE}',
  TH: '\u{1F1F9}\u{1F1ED}',
  VN: '\u{1F1FB}\u{1F1F3}',
  PH: '\u{1F1F5}\u{1F1ED}',
  ID: '\u{1F1EE}\u{1F1E9}',
  MM: '\u{1F1F2}\u{1F1F2}',
  KH: '\u{1F1F0}\u{1F1ED}',
  LA: '\u{1F1F1}\u{1F1E6}',
  BN: '\u{1F1E7}\u{1F1F3}',
  BR: '\u{1F1E7}\u{1F1F7}',
  NG: '\u{1F1F3}\u{1F1EC}',
  GH: '\u{1F1EC}\u{1F1ED}',
  RO: '\u{1F1F7}\u{1F1F4}',
  UA: '\u{1F1FA}\u{1F1E6}',
  MD: '\u{1F1F2}\u{1F1E9}',
  US: '\u{1F1FA}\u{1F1F8}',
  GB: '\u{1F1EC}\u{1F1E7}',
  AU: '\u{1F1E6}\u{1F1FA}',
  CA: '\u{1F1E8}\u{1F1E6}',
  DE: '\u{1F1E9}\u{1F1EA}',
  FR: '\u{1F1EB}\u{1F1F7}',
};

function countryWithFlag(code: string): string {
  const flag = FLAG_MAP[code];
  return flag ? `${flag} ${code}` : code;
}

const RISK_BADGE_STYLES: Record<GeoRiskEntry['riskLevel'], string> = {
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  low: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
};

export const GeoRiskPanel = memo(function GeoRiskPanel({ geoData, onCountryClick }: GeoRiskPanelProps) {
  const mismatchCount = useMemo(
    () => geoData.filter((e) => e.mismatch).length,
    [geoData]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Geographic Risk Analysis</CardTitle>
        <CardDescription>
          {mismatchCount} route{mismatchCount !== 1 ? 's' : ''} with country mismatch detected
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]" aria-label="Geographic risk analysis table">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Billing</TableHead>
                <TableHead>Shipping</TableHead>
                <TableHead>IP Country</TableHead>
                <TableHead className="text-right">Count</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Risk</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {geoData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No geographic data available
                  </TableCell>
                </TableRow>
              ) : (
                geoData.map((entry) => (
                  <TableRow
                    key={`${entry.billingCountry}-${entry.shippingCountry}-${entry.ipCountry}`}
                    className={`cursor-pointer ${
                      entry.mismatch ? 'bg-red-50 dark:bg-red-950/20' : ''
                    }`}
                    onClick={() => onCountryClick?.(entry.billingCountry)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onCountryClick?.(entry.billingCountry);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                  >
                    <TableCell className="font-medium">
                      {countryWithFlag(entry.billingCountry)}
                    </TableCell>
                    <TableCell>{countryWithFlag(entry.shippingCountry)}</TableCell>
                    <TableCell>{countryWithFlag(entry.ipCountry)}</TableCell>
                    <TableCell className="text-right">{entry.count}</TableCell>
                    <TableCell className="text-right">
                      ${entry.totalAmount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={RISK_BADGE_STYLES[entry.riskLevel]}
                      >
                        {entry.riskLevel}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
});
