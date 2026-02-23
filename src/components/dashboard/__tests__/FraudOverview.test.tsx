import React from 'react';
import { render, screen } from '@testing-library/react';
import { FraudOverview } from '../FraudOverview';
import { FraudMetrics } from '@/lib/types';

// Mock lucide-react icons to simple span elements
jest.mock('lucide-react', () => ({
  AlertTriangle: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="icon-alert-triangle" {...props} />
  ),
  Shield: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="icon-shield" {...props} />
  ),
  Activity: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="icon-activity" {...props} />
  ),
  DollarSign: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="icon-dollar-sign" {...props} />
  ),
  TrendingUp: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="icon-trending-up" {...props} />
  ),
  TrendingDown: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="icon-trending-down" {...props} />
  ),
}));

const mockMetrics: FraudMetrics = {
  currentFraudRate: 14.2,
  previousFraudRate: 0.8,
  highRiskPending: 15,
  totalVolume: 620,
  totalValue: 185000.5,
  authorizedCount: 434,
  declinedCount: 62,
  fraudRateByHour: Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    rate: i >= 12 && i <= 16 ? 25 : 1,
    volume: 25,
    flagged: i >= 12 && i <= 16 ? 6 : 0,
  })),
};

const lowFraudMetrics: FraudMetrics = {
  currentFraudRate: 2.5,
  previousFraudRate: 3.0,
  highRiskPending: 3,
  totalVolume: 500,
  totalValue: 125000,
  authorizedCount: 400,
  declinedCount: 20,
  fraudRateByHour: Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    rate: 2,
    volume: 20,
    flagged: 0,
  })),
};

describe('FraudOverview', () => {
  it('renders all 4 KPI cards', () => {
    render(<FraudOverview metrics={mockMetrics} isLive={false} />);
    // 4 card titles
    expect(screen.getByText('Fraud Rate')).toBeInTheDocument();
    expect(screen.getByText('Pending Review')).toBeInTheDocument();
    expect(screen.getByText('Transaction Volume')).toBeInTheDocument();
    expect(screen.getByText('Total Value')).toBeInTheDocument();
  });

  it('shows fraud rate percentage', () => {
    render(<FraudOverview metrics={mockMetrics} isLive={false} />);
    expect(screen.getByText('14.20%')).toBeInTheDocument();
  });

  it('shows "CRITICAL THRESHOLD EXCEEDED" when fraud rate > 10', () => {
    render(<FraudOverview metrics={mockMetrics} isLive={false} />);
    expect(screen.getByText('CRITICAL THRESHOLD EXCEEDED')).toBeInTheDocument();
  });

  it('does NOT show "CRITICAL THRESHOLD EXCEEDED" when fraud rate <= 10', () => {
    render(<FraudOverview metrics={lowFraudMetrics} isLive={false} />);
    expect(
      screen.queryByText('CRITICAL THRESHOLD EXCEEDED')
    ).not.toBeInTheDocument();
  });

  it('shows pending review count', () => {
    render(<FraudOverview metrics={mockMetrics} isLive={false} />);
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('shows transaction volume', () => {
    render(<FraudOverview metrics={mockMetrics} isLive={false} />);
    expect(screen.getByText('620')).toBeInTheDocument();
  });

  it('shows total value formatted as currency', () => {
    render(<FraudOverview metrics={mockMetrics} isLive={false} />);
    // formatCurrency(185000.50) => "$185,001" or "$185,000" depending on rounding
    // The function uses minimumFractionDigits: 0, maximumFractionDigits: 0
    expect(screen.getByText('$185,001')).toBeInTheDocument();
  });

  it('shows pulsing live indicator dot when isLive=true', () => {
    const { container } = render(
      <FraudOverview metrics={mockMetrics} isLive={true} />
    );
    // The live indicator is a span with animate-ping class inside the Transaction Volume card
    const pingElements = container.querySelectorAll('.animate-ping');
    // Should have at least the live indicator ping (plus possibly the crisis ping)
    expect(pingElements.length).toBeGreaterThan(0);
  });

  it('shows URGENT badge when pending review > 10', () => {
    render(<FraudOverview metrics={mockMetrics} isLive={false} />);
    expect(screen.getByText('URGENT')).toBeInTheDocument();
  });

  it('shows approved and declined counts', () => {
    render(<FraudOverview metrics={mockMetrics} isLive={false} />);
    expect(screen.getByText('434 approved')).toBeInTheDocument();
    expect(screen.getByText('62 declined')).toBeInTheDocument();
  });

  it('shows fraud rate delta vs previous period', () => {
    render(<FraudOverview metrics={mockMetrics} isLive={false} />);
    // delta = 14.2 - 0.8 = 13.4, displayed as "+13.40%"
    expect(screen.getByText('+13.40%')).toBeInTheDocument();
    expect(screen.getByText('vs previous period')).toBeInTheDocument();
  });
});
