// server.ts
import express from "express";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { createTransport } from "nodemailer";
import { handleYahooRequest } from "./src/server/yahooApi";

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3001;

function getEmailTransport() {
  const host = process.env.EMAIL_HOST;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!host || !user || !pass) return null;
  return createTransport({
    host,
    port: parseInt(process.env.EMAIL_PORT || "587"),
    secure: process.env.EMAIL_SECURE === "true",
    auth: { user, pass },
  });
}

app.post("/api/send-notification", async (req, res) => {
  try {
    const transport = getEmailTransport();
    if (!transport) {
      res.status(503).json({ error: "Email not configured (set EMAIL_HOST, EMAIL_USER, EMAIL_PASS)" });
      return;
    }
    const { subject, body } = req.body;
    if (!subject || !body) {
      res.status(400).json({ error: "Missing subject or body" });
      return;
    }
    const to = process.env.EMAIL_TO || process.env.EMAIL_USER;
    await transport.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject: `[QuantBit] ${subject}`,
      text: body,
    });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

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
    const bridged = bridgeHistoricalData(allData);
    const data = bridged.map((day: any) => ({
      date: day.date,
      ihsgPrice: day.ihsgPrice,
      goldPrice: day.goldPrice,
      stockPrices: day.stockAdjPrices,
      stockAdjPrices: day.stockAdjPrices,
      stockRanks: configType === "prod" ? day.stockRanksProd : day.stockRanksRes,
      stockRanksProd: day.stockRanksProd,
      stockRanksRes: day.stockRanksRes,
      stockRawMetrics: day.stockRawMetrics ?? null,
      stockNormScores: day.stockNormScores ?? null,
      isCarriedForward: day.isCarriedForward || false,
    }));
    const defaultWeights = {
      prod: { quality: 0.25, growth: 0.1, value: 0.3, momentum: 0.35 },
      res: { quality: 0.25, growth: 0.3, value: 0.1, momentum: 0.35 },
    };
    res.json({
      success: true, count: data.length, configType,
      weights: defaultWeights,
      data,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

function bridgeHistoricalData(rawData: any[]): any[] {
  if (rawData.length === 0) return rawData;
  const last = rawData[rawData.length - 1];
  const lastDate = new Date(last.date);
  const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const todayStr = now.toISOString().slice(0, 10);
  if (last.date >= todayStr) return rawData;

  const bridged = [...rawData];
  const curr = new Date(lastDate.getTime() + 86400000);
  while (curr <= now) {
    const dow = curr.getDay();
    if (dow !== 0 && dow !== 6) {
      const ds = curr.toISOString().slice(0, 10);
      if (ds <= todayStr) bridged.push({ ...last, date: ds, isCarriedForward: true });
    }
    curr.setDate(curr.getDate() + 1);
  }
  return bridged;
}

app.listen(PORT, () => {
  console.log(`Dev API server listening on http://localhost:${PORT}`);
});
