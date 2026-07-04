SELECT l.ticker,
  (l.close - COALESCE(p6.close, l.close)) / COALESCE(NULLIF(p6.close, 0), l.close) as mom6m,
  (l.close - COALESCE(p12.close, l.close)) / COALESCE(NULLIF(p12.close, 0), l.close) as mom12m
FROM (
  SELECT ticker, close FROM stock_daily
  WHERE date = (SELECT MAX(date) FROM stock_daily)
) l
LEFT JOIN (
  SELECT ticker, close FROM stock_daily
  WHERE (ticker, date) IN (
    SELECT ticker, MAX(date) FROM stock_daily
    WHERE date <= '2026-01-03' GROUP BY ticker
  )
) p6 ON l.ticker = p6.ticker
LEFT JOIN (
  SELECT ticker, close FROM stock_daily
  WHERE (ticker, date) IN (
    SELECT ticker, MAX(date) FROM stock_daily
    WHERE date <= '2025-07-03' GROUP BY ticker
  )
) p12 ON l.ticker = p12.ticker;