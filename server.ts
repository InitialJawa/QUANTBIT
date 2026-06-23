// server.ts
import express from "express";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { handleYahooRequest } from "./src/server/yahooApi";

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3001;

app.get("/api/yahoo", handleYahooRequest);

app.get("/api/backtest-data", (req, res) => {
  try {
    const configType = (req.query.configType as string) === "res" ? "res" : "prod";
    const yearStart = parseInt(req.query.from as string) || 2000;
    const yearEnd = parseInt(req.query.to as string) || 2026;
    const allData: any[] = [];
    for (let y = yearStart; y <= yearEnd; y++) {
      const yearPath = join(process.cwd(), "data", "years", `${y}.json`);
      if (existsSync(yearPath)) {
        const chunk = JSON.parse(readFileSync(yearPath, "utf-8"));
        allData.push(...chunk);
      }
    }
    if (allData.length === 0) {
      res.status(503).json({ error: "No historical data available" });
      return;
    }
    const data = allData.map((day: any) => ({
      date: day.date,
      ihsgPrice: day.ihsgPrice,
      goldPrice: day.goldPrice,
      stockPrices: day.stockAdjPrices,
      stockAdjPrices: day.stockAdjPrices,
      stockRanks: configType === "prod" ? day.stockRanksProd : day.stockRanksRes,
      stockRanksProd: day.stockRanksProd,
      stockRanksRes: day.stockRanksRes,
    }));
    const weights = configType === "prod"
      ? { quality: 0.25, growth: 0.1, value: 0.3, momentum: 0.35 }
      : { quality: 0.25, growth: 0.3, value: 0.1, momentum: 0.35 };
    res.json({ success: true, count: data.length, configType, weights, data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Dev API server listening on http://localhost:${PORT}`);
});
