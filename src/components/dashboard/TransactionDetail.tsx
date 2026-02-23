'use client';

import { memo, useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertTriangle,
  CreditCard,
  Globe,
  Mail,
  Shield,
  Clock,
  MapPin,
  ArrowRight,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  STATUS_STYLES,
  STATUS_LABELS,
  getRiskColor,
  getRiskBadgeStyle,
  getRiskLabel,
  formatTimestamp,
  formatTime,
  formatAmount,
} from '@/lib/format-utils';
import type { Transaction, RiskFlag } from '@/lib/types';

interface TransactionDetailProps {
  transaction: Transaction | null;
  allTransactions: Transaction[];
  open: boolean;
  onClose: () => void;
}

const RISK_FLAG_EXPLANATIONS: Record<RiskFlag, string> = {
  country_mismatch: "Billing, shipping, and IP countries don't match",
  high_amount: 'Transaction amount exceeds $500',
  round_amount: 'Suspicious round dollar amount',
  high_velocity_ip: 'Multiple transactions from this IP address',
  disposable_email: 'Email address uses a disposable mail service',
  excessive_retries: 'Card has been retried multiple times',
  sequential_bin: 'Card BIN is sequential with other recent transactions',
};

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right max-w-[60%] break-words">{value}</span>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
}: {
  icon: React.ElementType;
  title: string;
}) {
  return (
    <h3 className="flex items-center gap-2 text-sm font-semibold mb-2 mt-1">
      <Icon className="h-4 w-4 text-muted-foreground" />
      {title}
    </h3>
  );
}

function GeoFlowDiagram({ tx }: { tx: Transaction }) {
  const billingShippingMismatch = tx.billingCountry !== tx.shippingCountry;
  const ipMismatch =
    tx.ipCountry !== tx.billingCountry || tx.ipCountry !== tx.shippingCountry;

  return (
    <div className="flex flex-col items-center gap-2 py-3">
      <div className="flex items-center gap-2 w-full justify-center">
        <div
          className={cn(
            'flex flex-col items-center justify-center rounded-lg border px-4 py-2 text-center min-w-[90px]',
            billingShippingMismatch ? 'border-red-300 bg-red-50' : 'border-border bg-muted/30'
          )}
        >
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Billing</span>
          <span className="text-sm font-bold">{tx.billingCountry}</span>
        </div>

        <ArrowRight
          className={cn(
            'h-4 w-4 flex-shrink-0',
            billingShippingMismatch ? 'text-red-500' : 'text-muted-foreground'
          )}
        />

        <div
          className={cn(
            'flex flex-col items-center justify-center rounded-lg border px-4 py-2 text-center min-w-[90px]',
            billingShippingMismatch ? 'border-red-300 bg-red-50' : 'border-border bg-muted/30'
          )}
        >
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Shipping</span>
          <span className="text-sm font-bold">{tx.shippingCountry}</span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <div className="h-4 w-px bg-border" />
      </div>

      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-lg border px-4 py-2 text-center min-w-[90px]',
          ipMismatch ? 'border-red-300 bg-red-50' : 'border-border bg-muted/30'
        )}
      >
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">IP Origin</span>
        <span className="text-sm font-bold">{tx.ipCountry}</span>
      </div>
    </div>
  );
}

export const TransactionDetail = memo(function TransactionDetail({
  transaction,
  allTransactions,
  open,
  onClose,
}: TransactionDetailProps) {
  const relatedTransactions = useMemo(() => {
    if (!transaction) return [];
    return allTransactions
      .filter(
        (tx) =>
          tx.id !== transaction.id &&
          (tx.customerIp === transaction.customerIp ||
            tx.customerEmail === transaction.customerEmail ||
            tx.cardBin === transaction.cardBin)
      )
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);
  }, [transaction, allTransactions]);

  const hasGeoMismatch =
    transaction &&
    (transaction.billingCountry !== transaction.shippingCountry ||
      transaction.billingCountry !== transaction.ipCountry ||
      transaction.shippingCountry !== transaction.ipCountry);

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full sm:max-w-[500px] p-0">
        {transaction ? (
          <>
            <SheetHeader className="px-6 pt-6 pb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <SheetTitle className="text-base font-semibold leading-tight">
                    Transaction Detail
                  </SheetTitle>
                  <SheetDescription className="font-mono text-xs mt-1 truncate">
                    {transaction.id}
                  </SheetDescription>
                </div>
                <Badge
                  variant="outline"
                  className={cn('text-xs px-2 py-0.5 flex-shrink-0', getRiskBadgeStyle(transaction.riskScore))}
                >
                  Risk: {transaction.riskScore} ({getRiskLabel(transaction.riskScore)})
                </Badge>
              </div>
            </SheetHeader>

            <ScrollArea className="h-[calc(100vh-100px)] px-6 pb-6">
              {/* Section 1: Transaction Details */}
              <SectionTitle icon={Info} title="Transaction Details" />
              <div className="space-y-0.5">
                <DetailRow label="Amount" value={formatAmount(transaction.amount)} />
                <DetailRow label="Currency" value={transaction.currency} />
                <DetailRow
                  label="Status"
                  value={
                    <Badge
                      variant="outline"
                      className={cn('text-[10px] px-1.5 py-0', STATUS_STYLES[transaction.status])}
                    >
                      {STATUS_LABELS[transaction.status]}
                    </Badge>
                  }
                />
                <DetailRow label="Timestamp" value={formatTimestamp(transaction.timestamp)} />
                <DetailRow label="Description" value={transaction.description} />
                <DetailRow label="Merchant" value={`${transaction.merchantName} (${transaction.merchantId})`} />
              </div>

              <Separator className="my-4" />

              {/* Section 2: Card Information */}
              <SectionTitle icon={CreditCard} title="Card Information" />
              <div className="space-y-0.5">
                <DetailRow label="BIN" value={<span className="font-mono">{transaction.cardBin}</span>} />
                <DetailRow
                  label="Last 4 Digits"
                  value={<span className="font-mono">**** {transaction.cardLast4}</span>}
                />
                <DetailRow
                  label="Retry Count"
                  value={
                    <span className={cn(transaction.retryCount > 1 && 'text-red-600 font-semibold')}>
                      {transaction.retryCount}
                      {transaction.retryCount > 1 && ' (elevated)'}
                    </span>
                  }
                />
              </div>

              <Separator className="my-4" />

              {/* Section 3: Geographic Analysis */}
              <SectionTitle icon={Globe} title="Geographic Analysis" />
              <div className="space-y-0.5">
                <DetailRow
                  label="Billing Country"
                  value={
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      {transaction.billingCountry}
                    </span>
                  }
                />
                <DetailRow
                  label="Shipping Country"
                  value={
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      {transaction.shippingCountry}
                    </span>
                  }
                />
                <DetailRow
                  label="IP Country"
                  value={
                    <span className="flex items-center gap-1.5">
                      <Globe className="h-3 w-3 text-muted-foreground" />
                      {transaction.ipCountry}
                    </span>
                  }
                />
              </div>

              {hasGeoMismatch && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-red-700">
                    Geographic mismatch detected. The billing, shipping, and IP countries do not align,
                    which is a common indicator of fraudulent activity.
                  </p>
                </div>
              )}

              <GeoFlowDiagram tx={transaction} />

              <Separator className="my-4" />

              {/* Section 4: Risk Assessment */}
              <SectionTitle icon={Shield} title="Risk Assessment" />
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-muted-foreground">Risk Score</span>
                  <span className={cn('text-sm font-bold', transaction.riskScore >= 60 ? 'text-red-600' : 'text-foreground')}>
                    {transaction.riskScore} / 100
                  </span>
                </div>
                <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', getRiskColor(transaction.riskScore))}
                    style={{ width: `${transaction.riskScore}%` }}
                  />
                </div>
              </div>

              {transaction.riskFlags.length > 0 ? (
                <div className="space-y-2">
                  {transaction.riskFlags.map((flag) => (
                    <div
                      key={flag}
                      className="flex items-start gap-2 rounded-md border px-3 py-2 bg-muted/30"
                    >
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium">
                          {flag.replace(/_/g, ' ')}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {RISK_FLAG_EXPLANATIONS[flag] || 'Risk indicator flagged for this transaction'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No risk flags identified.</p>
              )}

              <Separator className="my-4" />

              {/* Section 5: Related Transactions */}
              <SectionTitle icon={Clock} title="Related Transactions" />
              <p className="text-xs text-muted-foreground mb-2">
                {relatedTransactions.length} related transaction{relatedTransactions.length !== 1 ? 's' : ''} found
                <span className="text-muted-foreground/70">
                  {' '}(matching IP, email, or card BIN)
                </span>
              </p>

              {relatedTransactions.length > 0 ? (
                <div className="space-y-1">
                  {relatedTransactions.map((related) => (
                    <div
                      key={related.id}
                      className="flex items-center justify-between rounded-md border px-3 py-2 bg-muted/20"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-muted-foreground">
                          {formatTime(related.timestamp)}
                        </span>
                        <span className="text-xs font-mono font-medium">
                          {formatAmount(related.amount)}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn('text-[10px] px-1.5 py-0', STATUS_STYLES[related.status])}
                      >
                        {STATUS_LABELS[related.status]}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <Mail className="h-6 w-6 text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground">
                    No related transactions found.
                  </p>
                </div>
              )}

              <div className="h-6" />
            </ScrollArea>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">No transaction selected.</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
});
