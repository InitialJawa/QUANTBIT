# Draft: Dev.to Article
# Target keyword: "quantitative stock screening indonesia"
# Link target: https://quantbit.pro/pages/screening-saham/
# Status: DRAFT — publish manually ke dev.to

---

# Building a Quantitative Stock Screener for the Indonesian Market (IDX)

I've been working on a project that applies quantitative analysis to the Indonesian stock market (IDX). The goal: build a free, browser-based terminal that screens 830+ stocks using five scoring dimensions.

Here's how it works and what I learned.

## Why Quantitative Screening?

The Indonesian stock market has 830+ listed companies. Analyzing each one manually — reading financial reports, checking ratios, comparing growth rates — takes hours per stock.

Quantitative screening solves this by scoring every stock automatically across multiple dimensions, then ranking them based on your preferred weights.

## The Five Dimensions

Each stock gets a score (0-100) across five dimensions:

### Quality
- Return on Equity (ROE)
- Debt-to-equity ratio
- Profit margin consistency
- Measures: "Is this company well-managed?"

### Growth
- Revenue growth rate
- Earnings growth rate
- Year-over-year improvement
- Measures: "Is this company growing?"

### Value
- Price-to-Earnings (PE) ratio
- Price-to-Book (PB) ratio
- Dividend yield relative to sector
- Measures: "Is this stock cheap?"

### Momentum
- Price trend over 3/6/12 months
- Relative strength vs IHSG
- Measures: "Is the market buying?"

### Dividend
- Dividend yield
- Payout consistency
- Growth of dividends over time
- Measures: "Does this stock pay reliable income?"

## Implementation

The scoring engine runs on Cloudflare Workers with data stored in D1 (SQLite). Here's the simplified scoring logic:

```typescript
// Simplified scoring
function scoreStock(stock: StockData, weights: Weights): number {
  const qualityScore = calculateQuality(stock);
  const growthScore = calculateGrowth(stock);
  const valueScore = calculateValue(stock);
  const momentumScore = calculateMomentum(stock);
  const dividendScore = calculateDividend(stock);

  return (
    qualityScore * weights.quality +
    growthScore * weights.growth +
    valueScore * weights.value +
    momentumScore * weights.momentum +
    dividendScore * weights.dividend
  );
}
```

The actual implementation uses percentile ranking across the entire universe, which normalizes scores and prevents one outlier stock from skewing results.

## Pre-built Profiles

Instead of asking users to set weights from scratch, I created three optimized profiles:

| Profile | Quality | Growth | Value | Momentum | Dividend |
|---------|---------|--------|-------|----------|----------|
| Conservative | 30% | 45% | 10% | 0% | 15% |
| Growth-Heavy | 20% | 60% | 10% | 10% | 0% |
| Income Focus | 15% | 20% | 5% | 0% | 60% |

These were optimized using historical backtesting on IDX80 constituents from 2015-2026.

## Interesting Findings

During development, I found that:

1. **Momentum matters more than expected** — Stocks with high momentum scores significantly outperformed in 6-month windows
2. **Dividend stocks cluster** — Most high-dividend stocks are in banking and infrastructure sectors
3. **Value traps are real** — Low PE doesn't always mean cheap; some stocks are cheap for good reason
4. **Quality is the best long-term filter** — High-quality stocks (ROE > 15%, low debt) outperform over 3+ year periods

## Tech Stack

- **Frontend:** React + TypeScript + Tailwind CSS
- **Backend:** Cloudflare Workers + D1
- **Data Pipeline:** Python + pandas
- **Deployment:** Cloudflare Pages

## Try It

The project is live at [quantbit.pro](https://quantbit.pro). It's free, no account required for basic screening.

## What's Next

- [ ] Add sector-relative scoring
- [ ] Implement peer comparison
- [ ] Add backtest comparison across profiles
- [ ] AI-powered stock analysis chat

---

*This is a personal project, not financial advice. All investment decisions are your own responsibility.*

---

# Publish Checklist
- [ ] Buat akun Dev.to (kalau belum ada)
- [ ] Publish article ini di Dev.to
- [ ] Tambahkan tags: javascript, typescript, finance, indonesia, open-source
- [ ] Link ke quantbit.pro di body (1-2 link natural)
- [ ] Share di Twitter/X setelah publish
