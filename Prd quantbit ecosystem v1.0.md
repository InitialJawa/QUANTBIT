# Backtest Data Handling

## Pre‑IPO Ticker Support
- The back‑test engine now automatically skips tickers that have not IPO‑ed on the simulation start date. This is achieved by checking for missing or non‑positive price data (`rawPrice <= 0`). Such tickers are added to a **pendingTickers** list and are revisited once price data becomes available.
- No hard‑coded ticker checks are required; the engine works generically for any future IPO.

## Rank Placeholder
- Stocks that lack historical ranking information are assigned a placeholder rank **99**. This value is used throughout the simulation to indicate an undefined or low‑confidence rank.

## Yearly Data Validation
- Each yearly JSON file under `data/years/` (e.g., `data/years/2000.json`) must contain the following fields:
  - `date`
  - `ihsgPrice`
  - `goldPrice`
  - `usdidrRate`
  - `stockPrices`
  - `stockAdjPrices`
  - `stockRanksProd`
  - `stockRanksRes`
- The back‑test engine validates the presence of these fields before running. Missing fields will raise an error, prompting a data‑preparation fix.

These updates ensure that back‑testing with early‑year data is robust and that documentation accurately reflects the current behavior.
