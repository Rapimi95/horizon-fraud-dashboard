# Horizon Logistics - Real-Time Fraud Risk Dashboard

Emergency fraud monitoring dashboard for Horizon Logistics' risk operations team, built to detect and investigate a coordinated fraud attack that spiked fraud rates from 0.8% to 14.2%.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (or the next available port).

## Embedded Fraud Patterns

The dataset contains **600+ transactions** over a 24-hour period with 5 embedded fraud patterns:

1. **IP Velocity Attack** (Hour 14:00-14:30): 18 transactions from IP `103.45.67.89` using different cards and disposable emails, all shipping to Malaysia/Thailand/Vietnam
2. **Sequential Card BINs** (Hours 13-15): 12 transactions with BINs 411111-411122, all shipping to Malaysia from varied billing countries, IP from Romania/Ukraine
3. **High-Value Country Mismatch** (Hours 12-16): 10 transactions $800-$2,500 with billing from Brazil/Nigeria/Ghana, shipping to Southeast Asia, IP from Eastern Europe
4. **Soft Decline Retries** (Hours 13-16): 6 cards retried 3-5 times each within 5-minute windows, mixing soft declines with eventual authorizations
5. **Round Number Spike** (Hours 15-17): 15 transactions of exactly $100/$250/$500/$1,000 concentrated in a 2-hour window

## Requirements Completed

- **Req 1 - Real-Time Fraud Overview**: 4 KPI cards showing fraud rate (color-coded with crisis indicator), pending reviews, transaction volume, and total value. Live indicator and fraud alert banner when rate exceeds 10%.
- **Req 2 - Pattern Detection Visualizations** (6 interactive charts):
  - Fraud Rate Trend: 24h area chart with dual Y-axis (rate + volume) and 2% threshold line
  - Velocity Analysis: Tabbed bar charts for top IPs, emails, and card BINs
  - Geographic Risk: Country mismatch table with flag emojis and risk badges
  - Amount Distribution: Stacked histogram highlighting flagged transactions
  - Temporal Heatmap: Hour-of-day fraud density grid with peak-hour pulse animation
  - Decline & Retry Patterns: Scatter plot + table showing retry behavior
- **Req 3 - Transaction Investigation** (Stretch): Click any chart element to filter transactions. Slide-out detail panel shows risk assessment, geographic flow visualization, and related transactions.
- **Req 4 - Historical Playback** (Stretch): Bottom control bar with play/pause/stop, speed control (1x-10x), progress slider, and time display. Replays the 24-hour attack timeline.

## Technical Decisions

- **Next.js 14 + App Router**: Server-side rendering with client-side interactivity
- **shadcn/ui**: Consistent, accessible component library for Cards, Tables, Sheets, Tabs
- **Recharts**: Declarative charting with interactive tooltips and click handlers
- **Deterministic data generation**: Seeded PRNG (Mulberry32) ensures identical dataset on every load
- **Dark theme by default**: Optimized for SOC/NOC monitoring environments
- **Cross-chart filtering**: Clicking any visualization element filters the transaction investigation panel
- **Client-side simulation**: All data generated in-browser, no backend needed

## Tech Stack

Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, Recharts, date-fns, Lucide React
