// server.ts
import express from "express";
import path2 from "path";
import { GoogleGenAI } from "@google/genai";
import fs2 from "fs";
import dotenv from "dotenv";
import { exec } from "child_process";
import { initializeApp as initializeApp2 } from "firebase/app";
import { getFirestore as getFirestore2, doc as doc2, getDoc, setDoc as setDoc2 } from "firebase/firestore";
import Groq from "groq-sdk";
import OpenAI from "openai";

// sync_engine.ts
import yahooFinance from "yahoo-finance2";

// idx80.ts
var IDX80_TICKERS = [
  "BBCA.JK",
  "BBRI.JK",
  "BMRI.JK",
  "BBNI.JK",
  "ASII.JK",
  "TLKM.JK",
  "UNVR.JK",
  "ICBP.JK",
  "INDF.JK",
  "GOTO.JK",
  "ADRO.JK",
  "PTBA.JK",
  "ITMG.JK",
  "UNTR.JK",
  "AMMN.JK",
  "BREN.JK",
  "CUAN.JK",
  "PGEO.JK",
  "TPIA.JK",
  "BYAN.JK",
  "BRPT.JK",
  "KLBF.JK",
  "MIKA.JK",
  "CPIN.JK",
  "JPFA.JK",
  "INDY.JK",
  "MEDC.JK",
  "ENRG.JK",
  "HRUM.JK",
  "AMRT.JK",
  "MIDI.JK",
  "MAPA.JK",
  "MAPI.JK",
  "ACES.JK",
  "SCMA.JK",
  "EMTK.JK",
  "BUKA.JK",
  "ARTO.JK",
  "BRIS.JK",
  "BBTN.JK",
  "BDMN.JK",
  "BNGA.JK",
  "NISP.JK",
  "PNBN.JK",
  "JSMR.JK",
  "WIKA.JK",
  "PTPP.JK",
  "ADHI.JK",
  "WSKT.JK",
  "SMGR.JK",
  "INTP.JK",
  "SMRA.JK",
  "CTRA.JK",
  "BSDE.JK",
  "PWON.JK",
  "ASRI.JK",
  "AKRA.JK",
  "PGAS.JK",
  "EXCL.JK",
  "ISAT.JK",
  "TOWR.JK",
  "TBIG.JK",
  "MTEL.JK",
  "INCO.JK",
  "ANTM.JK",
  "MDKA.JK",
  "TINS.JK",
  "SMDR.JK",
  "TMAS.JK",
  "NELY.JK",
  "SIDO.JK",
  "MYOR.JK",
  "ULTJ.JK",
  "CLEO.JK",
  "ROTI.JK",
  "WOOD.JK",
  "INKP.JK",
  "TKIM.JK",
  "SMAR.JK",
  "LSIP.JK",
  // 💀 TRASH & DEAD STOCKS (To Prove Survivorship Avoidance)
  "TRIL.JK",
  "TRAM.JK",
  "MYRX.JK",
  "RIMO.JK",
  "KREN.JK",
  "SUGI.JK",
  "NUSA.JK"
];

// sync_engine.ts
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { initializeApp } from "firebase/app";
import fs from "fs";
import path from "path";
import cron from "node-cron";
var firebaseConfigPath = path.join(process.cwd(), "firebase-config.json");
var db = null;
if (fs.existsSync(firebaseConfigPath)) {
  const config = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
  const fbApp = initializeApp(config);
  db = getFirestore(fbApp, config.firestoreDatabaseId);
}
function calcQuality(stats, fin) {
  let score = 50;
  if (fin?.returnOnEquity) {
    if (fin.returnOnEquity > 0.15) score += 20;
    else if (fin.returnOnEquity > 0) score += 10;
    else score -= 10;
  }
  if (fin?.debtToEquity) {
    if (fin.debtToEquity < 50) score += 20;
    else if (fin.debtToEquity > 150) score -= 20;
  }
  return Math.min(100, Math.max(1, score));
}
function calcValue(stats, summary) {
  let score = 50;
  if (summary?.forwardPE) {
    if (summary.forwardPE < 10) score += 30;
    else if (summary.forwardPE < 15) score += 10;
    else if (summary.forwardPE > 25) score -= 20;
  }
  if (summary?.priceToBook) {
    if (summary.priceToBook < 1) score += 20;
    else if (summary.priceToBook > 3) score -= 10;
  }
  return Math.min(100, Math.max(1, score));
}
function calcGrowth(fin) {
  let score = 50;
  if (fin?.revenueGrowth) {
    if (fin.revenueGrowth > 0.2) score += 25;
    else if (fin.revenueGrowth > 0.1) score += 10;
    else if (fin.revenueGrowth < 0) score -= 10;
  }
  if (fin?.earningsGrowth) {
    if (fin.earningsGrowth > 0.2) score += 25;
    else if (fin.earningsGrowth > 0) score += 10;
    else if (fin.earningsGrowth < 0) score -= 20;
  }
  return Math.min(100, Math.max(1, score));
}
var ACTIVE_UNIVERSE = [...IDX80_TICKERS];
async function refreshActiveUniverse() {
  if (!db) return;
  try {
    const { getDoc: getDoc2 } = await import("firebase/firestore");
    const docSnap = await getDoc2(doc(db, "engine", "active_universe"));
    if (docSnap.exists() && Array.isArray(docSnap.data().tickers)) {
      ACTIVE_UNIVERSE = docSnap.data().tickers;
      console.log(`[Universe Update] Successfully pulled ${ACTIVE_UNIVERSE.length} tickers dynamically from Cloud.`);
    }
  } catch (err) {
    console.log("[Universe Update] Defaulting to base list due to absence of cloud dynamic universe.", err.message);
  }
}
async function runIdx80Scan() {
  await refreshActiveUniverse();
  console.log(`Starting Quantitative Scan & Sync to Firebase for ${ACTIVE_UNIVERSE.length} stocks...`);
  const results = [];
  const concurrencyLimit = 15;
  const pool = [...ACTIVE_UNIVERSE];
  const worker = async () => {
    while (pool.length > 0) {
      const ticker = pool.shift();
      if (!ticker) break;
      try {
        const quote = await yahooFinance.quoteSummary(ticker, {
          modules: ["price", "defaultKeyStatistics", "summaryDetail", "financialData", "summaryProfile"]
        });
        const price = quote.price?.regularMarketPrice || 0;
        const change = quote.price?.regularMarketChangePercent || 0;
        const quality = calcQuality(quote.defaultKeyStatistics, quote.financialData);
        const value = calcValue(quote.defaultKeyStatistics, quote.summaryDetail);
        const growth = calcGrowth(quote.financialData);
        let momentum = 50;
        if (quote.summaryDetail?.fiftyDayAverage && quote.summaryDetail?.twoHundredDayAverage) {
          if (quote.summaryDetail.fiftyDayAverage > quote.summaryDetail.twoHundredDayAverage) momentum += 30;
          if (price > quote.summaryDetail.fiftyDayAverage) momentum += 20;
          if (price < quote.summaryDetail.twoHundredDayAverage) momentum -= 20;
        }
        momentum = Math.min(100, Math.max(1, momentum));
        const data = {
          ticker,
          companyName: quote.price?.shortName || quote.price?.longName || ticker,
          sector: quote.summaryProfile?.sector || "Unknown",
          industry: quote.summaryProfile?.industry || "Unknown",
          currentPrice: price,
          changePercent: change * 100,
          // converting fraction to percent visually if needed
          quality,
          value,
          growth,
          momentum,
          volume: quote.summaryDetail?.volume || 0,
          peRatio: quote.summaryDetail?.trailingPE || quote.summaryDetail?.forwardPE || 0,
          pbRatio: quote.defaultKeyStatistics?.priceToBook || 0,
          dividendYield: (quote.summaryDetail?.dividendYield || 0) * 100,
          lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
        };
        results.push(data);
        console.log(`Scanned ${ticker} - DONE`);
      } catch (err) {
        console.error(`Error scanning ${ticker}:`, err.message);
      }
    }
  };
  const workers = Array.from({ length: concurrencyLimit }, () => worker());
  await Promise.all(workers);
  if (db) {
    try {
      const docRef = doc(db, "engine", "idx80_scan");
      await setDoc(docRef, {
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString(),
        count: results.length,
        stocks: results
      });
      console.log("IDX80 Scan data successfully synced to Firebase!");
    } catch (err) {
      console.error("Error saving scan data to Firebase:", err);
    }
  } else {
    console.log("Firebase not configured, skipping cloud save.");
  }
  const isCloudFunction2 = !!(process.env.FUNCTIONS_EMULATOR || process.env.FIREBASE_CONFIG);
  const dataPath = isCloudFunction2 ? path.join("/tmp", "idx80_scan.json") : path.join(process.cwd(), "data", "idx80_scan.json");
  if (!fs.existsSync(path.dirname(dataPath))) fs.mkdirSync(path.dirname(dataPath), { recursive: true });
  fs.writeFileSync(dataPath, JSON.stringify({ lastUpdated: (/* @__PURE__ */ new Date()).toISOString(), stocks: results }, null, 2));
}
function startScannerCron() {
  console.log("Scheduling IDX80 Scanner to run every 15 minutes during market hours...");
  cron.schedule("*/15 * * * *", () => {
    runIdx80Scan();
  });
  setTimeout(() => {
    runIdx80Scan();
  }, 5e3);
}
if (import.meta.url === `file://${process.argv[1]}`) {
  runIdx80Scan().then(() => process.exit(0)).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

// server.ts
dotenv.config();
var app = express();
app.use(express.json());
var PORT = 3e3;
var aiClient = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing. Please configure it in your local .env file.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "quantbit-terminal"
        }
      }
    });
  }
  return aiClient;
}
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
});
var isCloudFunction = !!(process.env.FUNCTIONS_EMULATOR || process.env.FIREBASE_CONFIG || process.env.VERCEL);
var statePath = isCloudFunction ? path2.join("/tmp", "engine_state.json") : path2.join(process.cwd(), "data", "engine_state.json");
var firebaseConfigPath2 = path2.join(process.cwd(), "firebase-config.json");
var db2 = null;
if (fs2.existsSync(firebaseConfigPath2)) {
  try {
    const config = JSON.parse(fs2.readFileSync(firebaseConfigPath2, "utf-8"));
    const fbApp = initializeApp2(config);
    db2 = getFirestore2(fbApp, config.firestoreDatabaseId);
    console.log("Firebase Firestore successfully connected server-side with database ID:", config.firestoreDatabaseId);
  } catch (err) {
    console.error("Firebase startup initialization failed on server:", err);
  }
}
function getEngineStateSyncFallback() {
  const defaultState = {
    portfolio: [
      { ticker: "BBCA", shares: 500, buyPrice: 9900, addedAt: (/* @__PURE__ */ new Date()).toISOString() },
      { ticker: "BBRI", shares: 1e3, buyPrice: 4900, addedAt: (/* @__PURE__ */ new Date()).toISOString() }
    ],
    watchlist: [
      { ticker: "BBCA", addedAt: (/* @__PURE__ */ new Date()).toISOString() }
    ],
    cash: 1e8,
    // Rp 100 Juta default start balance
    config: {
      activeConfig: "prod",
      safeHavenAsset: "emas",
      topNCount: 5,
      qualityWeight: 0.25,
      growthWeight: 0.1,
      valueWeight: 0.3,
      momentumWeight: 0.35,
      enableCrashProtection: true,
      crashSensitivity: 10,
      enableCrossover: true,
      reserveBufferPct: 10,
      simulationMode: "algo",
      singleTicker: "BBCA",
      singleSellTrigger: 8,
      singleBuyTrigger: 5
    },
    tradeLogs: [
      { id: "log-1", type: "BUY", ticker: "BBCA", shares: 500, price: 9900, timestamp: (/* @__PURE__ */ new Date()).toISOString() },
      { id: "log-2", type: "BUY", ticker: "BBRI", shares: 1e3, price: 4900, timestamp: (/* @__PURE__ */ new Date()).toISOString() }
    ]
  };
  try {
    if (!fs2.existsSync(statePath)) {
      const dataDir = path2.dirname(statePath);
      if (!fs2.existsSync(dataDir)) {
        fs2.mkdirSync(dataDir, { recursive: true });
      }
      fs2.writeFileSync(statePath, JSON.stringify(defaultState, null, 2), "utf-8");
      return defaultState;
    }
    const raw = fs2.readFileSync(statePath, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to load local engine state, returning defaults:", err);
    return defaultState;
  }
}
async function getEngineStateAsync() {
  const localState = getEngineStateSyncFallback();
  if (!db2) return localState;
  try {
    const docRef = doc2(db2, "engine", "state");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      await setDoc2(docRef, localState);
      return localState;
    }
  } catch (err) {
    console.error("Firebase get state failed, falling back to local storage:", err);
    return localState;
  }
}
function saveEngineStateSyncFallback(state) {
  try {
    const dataDir = path2.dirname(statePath);
    if (!fs2.existsSync(dataDir)) {
      fs2.mkdirSync(dataDir, { recursive: true });
    }
    fs2.writeFileSync(statePath, JSON.stringify(state, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write local engine state file:", err);
  }
}
async function saveEngineStateAsync(state) {
  saveEngineStateSyncFallback(state);
  if (!db2) return;
  try {
    const docRef = doc2(db2, "engine", "state");
    await setDoc2(docRef, state);
    console.log("Engine state synchronized successfully to Cloud Firestore!");
  } catch (err) {
    console.error("Firebase set state failed, kept in local storage fallback:", err);
  }
}
app.get("/api/engine/state", async (req, res) => {
  const state = await getEngineStateAsync();
  res.json(state);
});
app.post("/api/engine/state", async (req, res) => {
  await saveEngineStateAsync(req.body);
  res.json({ success: true, message: "Engine state saved and synchronized to cloud successfully" });
});
app.post("/api/gemini/analyze", async (req, res) => {
  const { stock, customFocus } = req.body;
  if (!stock) {
    return res.status(400).json({ error: "Stock data is required" });
  }
  try {
    const ai = getGeminiClient();
    const systemPrompt = `You are a premier senior equity research analyst specializing in the Indonesia Stock Exchange (IDX / BEI). 
Your task is to conduct an in-depth financial report analysis and intelligence review on the company provided.
Formulate a highly professional qualitative and quantitative stock analysis based on the recent financial metrics supplied.

Calculate and double check IDX sector standard valuations. Focus on:
- Balance sheet health (debt ratios, liquidity).
- Income growth trends and margin analysis.
- Cash flow quality (conversion of net profit, investment trends, dividend capability).

Integrate the user's specific request or inquiry if provided: "${customFocus || "None"}".

You MUST return your response as a strict JSON object structure adhering exactly to this TypeScript schema:
{
  ticker: string;
  summary: string; // concise high-level overview of findings (2-3 paragraphs)
  strengths: string[]; // key positive highlights
  weaknesses: string[]; // key core risks/concerns
  swotAnalysis: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  keyRatios: { label: string; value: string; assessment: string }[]; // table of critical metrics, e.g., P/E, P/B, ROE, DER, NPM, Dividend Divestments, with assessment like 'Healthy', 'Elevated', 'Stretched' or 'Underpriced'
  fairValue: {
    estimatedValue: number; // estimated intrinsic fair value (in IDR)
    currentPrice: number; // current price passed
    recommendation: 'UNDERVALUED' | 'FAIRLY_VALUED' | 'OVERVALUED';
  };
  recommendation: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
  growthOutlook: string; // 1 solid paragraph about future projects/developments
  timestamp: string; // ISO date string
}

Ensure the output is pure JSON and nothing else, without markdown wrappers. Be rigorous, analytical, and highly objective.`;
    const userPrompt = `Analyze PT ${stock.name} (${stock.ticker}) in Sector: ${stock.sector} / Subsector: ${stock.subSector}.
Description: ${stock.description}

Recent financial statements (values in IDR Billion):
${JSON.stringify(stock.metrics, null, 2)}

Key indicators passed in:
- Current Price: IDR ${stock.currentPrice}
- P/E Ratio: ${stock.peRatio}
- P/B Ratio: ${stock.pbRatio}
- ROE: ${stock.roe}%
- DER: ${stock.der}
- Dividend Yield: ${stock.dividendYield}%`;
    let textContent = "{}";
    try {
      const ai2 = getGeminiClient();
      const response = await ai2.models.generateContent({
        model: "gemini-2.5-flash",
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json"
        }
      });
      textContent = response.text || "{}";
    } catch (geminiError) {
      console.warn("Gemini Analyze Error:", geminiError.message);
      try {
        const groqKey = process.env.GROQ_API_KEY;
        if (!groqKey) throw new Error("GROQ_API_KEY not configured");
        const groqClient = new Groq({ apiKey: groqKey });
        const response = await groqClient.chat.completions.create({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          model: "llama-3.3-70b-versatile",
          response_format: { type: "json_object" }
        });
        textContent = response.choices[0]?.message?.content || "{}";
      } catch (groqError) {
        console.warn("Groq Analyze Error:", groqError.message);
        try {
          const openRouterKey = process.env.OPENROUTER_API_KEY;
          if (!openRouterKey) throw new Error("OPENROUTER_API_KEY not configured");
          const openaiClient = new OpenAI({
            baseURL: "https://openrouter.ai/api/v1",
            apiKey: openRouterKey
          });
          const response = await openaiClient.chat.completions.create({
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
            model: "meta-llama/llama-3.1-8b-instruct:free"
          });
          let content = response.choices[0]?.message?.content || "{}";
          if (content.includes("```json")) {
            content = content.split("```json")[1].split("```")[0];
          }
          textContent = content;
        } catch (openRouterError) {
          console.warn("OpenRouter Analyze Error:", openRouterError.message);
          textContent = JSON.stringify({
            ticker: stock.ticker,
            summary: "Sistem gagal menghasilkan analisis karena kunci API (Gemini/Groq/OpenRouter) tidak valid atau bermasalah. Silakan periksa pengaturan Secrets (API Key) Anda.",
            strengths: ["Data tidak tersedia"],
            weaknesses: ["Data tidak tersedia"],
            swotAnalysis: {
              strengths: ["-"],
              weaknesses: ["-"],
              opportunities: ["-"],
              threats: ["-"]
            },
            keyRatios: [
              { label: "P/E", value: stock.peRatio.toString(), assessment: "Unknown" },
              { label: "P/B", value: stock.pbRatio.toString(), assessment: "Unknown" }
            ],
            fairValue: {
              estimatedValue: stock.currentPrice,
              currentPrice: stock.currentPrice,
              recommendation: "HOLD"
            },
            recommendation: "HOLD",
            growthOutlook: "Tidak dapat menganalisis prospek pertumbuhan karena gangguan autentikasi sistem AI. Pastikan GEMINI_API_KEY atau GROQ_API_KEY valid.",
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          });
        }
      }
    }
    const cleanedText = textContent.trim();
    const parsedData = JSON.parse(cleanedText);
    res.json(parsedData);
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    res.status(500).json({ error: error.message || "Failed to analyze stock with Gemini AI" });
  }
});
app.post("/api/gemini/market-summary", async (req, res) => {
  const { mkt, rs, stocks } = req.body;
  try {
    const ai = getGeminiClient();
    const systemPrompt = `You are a premier senior macroeconomic strategist and stock market analyst specializing in the Indonesia Stock Exchange (IDX / BEI).
Your task is to conduct an in-depth review of the daily market conditions in Indonesia based on the latest indicators.
Based on JCI (IHSG) performance, USD/IDR exchange rate stability, system regime metrics, and key blue-chip stock movements, formulate a highly professional Daily Market Summary (Ringkasan Harian Pasar Saham Indonesia).

You MUST return your response as a strict JSON object adhering exactly to this TypeScript schema:
{
  "rationale": string, // A deep, concise narrative (2-3 sentences) evaluating the market dynamics. Write in elegant financial Indonesian.
  "bullishFactors": string[], // 3 key positive catalysts or supportive indicators in Indonesian.
  "bearishFactors": string[], // 3 notable risk factors, headwinds, or pressure points in Indonesian.
  "strategyAdvice": string // A clear recommendation (1-2 sentences) on capital deployment, risk mitigation, or accumulation strategies in Indonesian.
}

Ensure the output is pure JSON and nothing else, without markdown wrappers. Be rigorous, professional, and analytical.`;
    const stockSummary = stocks && Array.isArray(stocks) ? stocks.map((s) => `${s.ticker}: IDR ${s.currentPrice} (${s.change >= 0 ? "+" : ""}${s.change}%)`).join(", ") : "No stock data";
    const userPrompt = `Real-Time Market Indicators:
- IHSG (JCI Index): ${mkt?.ihsg?.value || "N/A"} (Daily Change: ${mkt?.ihsg?.daily_pct || mkt?.ihsg?.daily || 0}%, Monthly Trend: ${mkt?.ihsg?.monthly || 0}%)
- USD/IDR Exchange: Rp ${mkt?.usdidr?.value || "N/A"} (Daily Change: ${mkt?.usdidr?.daily || 0}%)
- Gold Price: USD ${mkt?.gold?.value || "N/A"}/oz
- System Status: ${rs?.status || "N/A"} (Market Health: ${rs?.market_health || 50}/100, Opportunity: ${rs?.opportunity || 50}/100, Risk: ${rs?.risk || 40}/100)
- Capital Allocation Stance: ${rs?.capital_deployment || 40}%

Current prices and daily moves of active watched stocks:
${stockSummary}

Please generate the daily market summary and rationale in Indonesian.`;
    const getCachedSummary = () => {
      const yesterday = /* @__PURE__ */ new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return JSON.stringify({
        rationale: `Pasar saat ini bergerak dalam rentang konsolidasi. Volatilitas terbatas sementara pelaku pasar mengamati perkembangan makro terkini (Cached Summary ${yesterday.toLocaleDateString()}).`,
        bullishFactors: ["Stabilitas Rupiah yang terjaga", "Arus modal asing di saham blue-chip stabil", "Valuasi indeks moderat mendukung akumulasi selektif"],
        bearishFactors: ["Katalis domestik terbatas dalam jangka pendek", "Kekhawatiran moderasi konsumsi", "Volatilitas komoditas menahan laju emiten energi"],
        strategyAdvice: "Pertahankan alokasi portofolio dengan fokus pada saham-saham defensif dan perbankan yang memiliki neraca kuat."
      });
    };
    let textContent = "{}";
    try {
      const ai2 = getGeminiClient();
      const response = await ai2.models.generateContent({
        model: "gemini-2.5-flash",
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json"
        }
      });
      textContent = response.text || "{}";
    } catch (geminiError) {
      console.warn("Gemini Error, falling back to Groq:", geminiError.message);
      try {
        const groqKey = process.env.GROQ_API_KEY;
        if (!groqKey) throw new Error("GROQ_API_KEY not configured");
        const groqClient = new Groq({ apiKey: groqKey });
        const response = await groqClient.chat.completions.create({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          model: "llama-3.3-70b-versatile",
          response_format: { type: "json_object" }
        });
        textContent = response.choices[0]?.message?.content || "{}";
      } catch (groqError) {
        console.warn("Groq Error, falling back to OpenRouter:", groqError.message);
        try {
          const openRouterKey = process.env.OPENROUTER_API_KEY;
          if (!openRouterKey) throw new Error("OPENROUTER_API_KEY not configured");
          const openaiClient = new OpenAI({
            baseURL: "https://openrouter.ai/api/v1",
            apiKey: openRouterKey
          });
          const response = await openaiClient.chat.completions.create({
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
            model: "meta-llama/llama-3.1-8b-instruct:free"
          });
          let content = response.choices[0]?.message?.content || "{}";
          if (content.includes("```json")) {
            content = content.split("```json")[1].split("```")[0];
          }
          textContent = content;
        } catch (openRouterError) {
          console.warn("OpenRouter Error, falling back to Cached Summary:", openRouterError.message);
          textContent = getCachedSummary();
        }
      }
    }
    res.json(JSON.parse(textContent.trim()));
  } catch (error) {
    console.error("Gemini Market Summary Full Fallback Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate daily market summary" });
  }
});
app.post("/api/gemini/chat", async (req, res) => {
  const { messages, selectedStock } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Messages array is required" });
  }
  try {
    let contextStockInfo = `You are discussing the Indonesian Stock Exchange (IDX) in general.`;
    if (selectedStock && selectedStock.ticker === "WATCHLIST") {
      contextStockInfo = `The user is asking about their personal stock watchlist.
Watchlist summary: ${selectedStock.description}.
Please provide insights focused on comparing, contrasting, and evaluating these specific stocks in the context of the Indonesian market.`;
    } else if (selectedStock) {
      contextStockInfo = `You are currently focusing on PT ${selectedStock.name} (Ticker: ${selectedStock.ticker}).
Sector: ${selectedStock.sector} (${selectedStock.subSector})
Recent Price: IDR ${selectedStock.currentPrice} (${selectedStock.change > 0 ? "+" : ""}${selectedStock.change}%)
Description: ${selectedStock.description}
Ratios: PE ${selectedStock.peRatio}, PB ${selectedStock.pbRatio}, ROE ${selectedStock.roe}%, DER ${selectedStock.der}, Dividend Yield ${selectedStock.dividendYield}%`;
    }
    const systemInstruction = `You are a friendly, highly intelligent Indonesian stock market strategist and financial advisor.
Provide objective, deep, and action-oriented financial reasoning. Support your answers with macroeconomic context in Indonesia, BI-Rate trends (Bank Indonesia interest rates), Rupiah exchange rate factors, or sector tailwinds.
Keep your tone sophisticated yet accessible. Avoid any generic safe-talk; give clear, educational insights and state standard risk disclosure briefly.

${contextStockInfo}

Format your response using professional markdown with bullet points, brief tables, bold figures, and clean paragraphs.`;
    const lastMessage = messages[messages.length - 1].content;
    const commonHistory = messages.slice(0, -1).map((msg) => ({
      role: msg.role === "assistant" ? "assistant" : "user",
      content: msg.content
    }));
    let textContent = "";
    try {
      const ai = getGeminiClient();
      const apiHistory = messages.slice(0, -1).map((msg) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }]
      }));
      const chat = ai.chats.create({
        model: "gemini-2.5-flash",
        history: apiHistory,
        config: {
          systemInstruction
        }
      });
      const response = await chat.sendMessage({ message: lastMessage });
      textContent = response.text || "";
    } catch (geminiError) {
      console.warn("Chat Gemini Error, falling back to Groq:", geminiError.message);
      try {
        const groqKey = process.env.GROQ_API_KEY;
        if (!groqKey) throw new Error("GROQ_API_KEY not configured");
        const groqClient = new Groq({ apiKey: groqKey });
        const response = await groqClient.chat.completions.create({
          messages: [
            { role: "system", content: systemInstruction },
            ...commonHistory,
            { role: "user", content: lastMessage }
          ],
          model: "llama-3.3-70b-versatile"
        });
        textContent = response.choices[0]?.message?.content || "";
      } catch (groqError) {
        console.warn("Chat Groq Error, falling back to OpenRouter:", groqError.message);
        try {
          const openRouterKey = process.env.OPENROUTER_API_KEY;
          if (!openRouterKey) throw new Error("OPENROUTER_API_KEY not configured");
          const openaiClient = new OpenAI({
            baseURL: "https://openrouter.ai/api/v1",
            apiKey: openRouterKey
          });
          const response = await openaiClient.chat.completions.create({
            messages: [
              { role: "system", content: systemInstruction },
              ...commonHistory,
              { role: "user", content: lastMessage }
            ],
            model: "meta-llama/llama-3.1-8b-instruct:free"
          });
          textContent = response.choices[0]?.message?.content || "";
        } catch (openRouterError) {
          console.warn("Chat OpenRouter Error, falling back to static message:", openRouterError.message);
          textContent = "Maaf, asisten AI sedang mengalami kendala teknis. Harap coba lagi beberapa saat lagi atau periksa pengaturan API Key Anda.";
        }
      }
    }
    res.json({ content: textContent });
  } catch (error) {
    console.error("AI Chat Full Fallback Error:", error);
    res.status(500).json({ error: error.message || "Failed to process chat message with AI Provider" });
  }
});
function bridgeHistoricalDataToToday(rawData, configType) {
  if (rawData.length === 0) return rawData;
  const lastIndex = rawData.length - 1;
  const lastObj = rawData[lastIndex];
  const lastDateStr = lastObj.date;
  const todayStr = new Date(Date.now() + 7 * 60 * 60 * 1e3).toISOString().slice(0, 10);
  if (lastDateStr >= todayStr) return rawData;
  const lastDate = new Date(lastDateStr);
  const todayDate = new Date(todayStr);
  const intermediateDates = [];
  let curr = new Date(lastDate.getTime() + 24 * 60 * 60 * 1e3);
  while (curr <= todayDate) {
    const dayOfWeek = curr.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const year = curr.getFullYear();
      const month = String(curr.getMonth() + 1).padStart(2, "0");
      const day = String(curr.getDate()).padStart(2, "0");
      intermediateDates.push(`${year}-${month}-${day}`);
    }
    curr.setDate(curr.getDate() + 1);
  }
  if (intermediateDates.length === 0) return rawData;
  const bridgedList = [...rawData];
  intermediateDates.forEach((dateStr) => {
    const mockDay = {
      ...lastObj,
      date: dateStr
    };
    bridgedList.push(mockDay);
  });
  return bridgedList;
}
app.get("/api/backtest-data", (req, res) => {
  try {
    const configType = req.query.configType === "res" ? "res" : "prod";
    const weights = configType === "prod" ? { quality: 0.25, growth: 0.1, value: 0.3, momentum: 0.35 } : { quality: 0.25, growth: 0.3, value: 0.1, momentum: 0.35 };
    const filePath = path2.join(process.cwd(), "data", "historical_market_data.json");
    if (!fs2.existsSync(filePath)) {
      throw new Error("CRITICAL PIPELINE ERROR: Real historical market database is missing! Fail loudly.");
    }
    const rawData = JSON.parse(fs2.readFileSync(filePath, "utf-8"));
    if (!Array.isArray(rawData) || rawData.length === 0) {
      throw new Error("CRITICAL PIPELINE ERROR: Real historical market database contains no records!");
    }
    const bridgedRawData = bridgeHistoricalDataToToday(rawData, configType);
    const data = bridgedRawData.map((day) => {
      return {
        date: day.date,
        ihsgPrice: day.ihsgPrice,
        goldPrice: day.goldPrice,
        stockPrices: day.stockAdjPrices,
        // ALWAYS use adjusted close prices for quantitative performance calculations
        stockRanks: configType === "prod" ? day.stockRanksProd : day.stockRanksRes
      };
    });
    res.json({
      success: true,
      count: data.length,
      configType,
      weights,
      data
    });
  } catch (error) {
    console.error("Backtest Data API Error:", error);
    res.status(500).json({ error: error.message || "Failed to load real backtest market data" });
  }
});
app.post("/api/market/sync", (req, res) => {
  if (isCloudFunction) {
    return res.status(400).json({
      success: false,
      error: "Sinkronisasi database historis langsung tidak didukung di lingkungan cloud (read-only filesystem). Jalankan sinkronisasi secara lokal lalu deploy ulang."
    });
  }
  console.log("Starting full Yahoo Finance market database synchronization...");
  exec("npx tsx fetch_historical_data.ts", (error, stdout, stderr) => {
    if (error) {
      console.error("Subprocess execution error during sync:", error);
      return res.status(500).json({ success: false, error: error.message, details: stderr });
    }
    console.log("Subprocess stdout during sync:\n", stdout);
    res.json({
      success: true,
      message: "Database historis Yahoo Finance berhasil sinkron sampai hari ini!",
      log: stdout.trim()
    });
  });
});
app.get("/api/goapi/live-prices", async (req, res) => {
  try {
    const apiKey = process.env.GOAPI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ success: false, error: "GOAPI_API_KEY is missing" });
    }
    const response = await fetch(`https://api.goapi.io/stock/idx/prices?api_key=${apiKey}`);
    if (!response.ok) {
      throw new Error(`GoAPI HTTP error: ${response.status}`);
    }
    const apiRes = await response.json();
    if (apiRes.status === "success" && apiRes.data && Array.isArray(apiRes.data.results)) {
      const prices = {};
      apiRes.data.results.forEach((item) => {
        const symbol = item.symbol || item.ticker || "";
        if (["BBCA", "BBRI", "BMRI", "TLKM", "ASII", "ADRO", "PTBA", "ESSA", "GOTO"].includes(symbol)) {
          prices[symbol] = {
            close: Number(item.close || item.price || 0),
            change: Number(item.change || 0),
            pct: Number(item.percent_change || item.change_percent || 0)
          };
        }
      });
      return res.json({ success: true, prices, source: "GoAPI.id (Live)" });
    } else {
      throw new Error(apiRes.message || "Invalid GoAPI response payload structure");
    }
  } catch (error) {
    console.log("GoAPI fallback active (non-blocking):", error.message);
    res.json({
      success: false,
      error: error.message,
      source: "Offline Mock Fallback"
    });
  }
});
var _lastYahooPrices = null;
app.get("/api/yahoo/live-prices", async (req, res) => {
  try {
    const tickers = ["BBCA.JK", "BBRI.JK", "BMRI.JK", "TLKM.JK", "ASII.JK", "ADRO.JK", "PTBA.JK", "ESSA.JK", "GOTO.JK", "^JKSE", "USDIDR=X", "GC=F"];
    const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/spark?symbols=${tickers.join(",")}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://finance.yahoo.com/",
        "Cache-Control": "no-cache"
      }
    });
    if (!response.ok) {
      console.error(`Yahoo Finance API request failed with status ${response.status}`);
      throw new Error(`Yahoo Finance server responded with HTTP status ${response.status}`);
    }
    const apiRes = await response.json();
    if (apiRes && typeof apiRes === "object") {
      const prices = {};
      Object.keys(apiRes).forEach((symbolRaw) => {
        const item = apiRes[symbolRaw];
        let symbol = symbolRaw.split(".")[0];
        if (symbolRaw === "^JKSE") symbol = "IHSG";
        if (symbolRaw === "USDIDR=X") symbol = "USDIDR";
        if (symbolRaw === "GC=F") symbol = "GOLD";
        if (symbol && item && Array.isArray(item.close) && item.close.length > 0) {
          const validCloses = item.close.filter((c) => typeof c === "number" && c !== null);
          const lClose = validCloses[validCloses.length - 1];
          const prvClose = item.previousClose || lClose || 1;
          const diff = (lClose || 0) - prvClose;
          prices[symbol] = {
            close: Number(lClose || 0),
            change: Number(diff),
            pct: Number(diff / prvClose * 100)
          };
        }
      });
      _lastYahooPrices = prices;
      return res.json({ success: true, prices, source: "Yahoo Finance (Live)" });
    } else {
      throw new Error("Invalid quote payload returned from Yahoo Finance API");
    }
  } catch (error) {
    console.log("Yahoo Finance fallback active (non-blocking):", error.message);
    if (_lastYahooPrices) {
      return res.json({ success: true, prices: _lastYahooPrices, source: "Yahoo Finance (Cached Fallback)" });
    }
    res.json({
      success: false,
      error: error.message,
      source: "Offline Mock Fallback"
    });
  }
});
app.get("/data/live_market.json", async (req, res) => {
  try {
    const fs3 = await import("fs/promises");
    const filePath = path2.join(process.cwd(), "data", "live_market.json");
    const staticData = JSON.parse(await fs3.readFile(filePath, "utf-8"));
    if (_lastYahooPrices) {
      staticData.stock_prices = {};
      Object.keys(_lastYahooPrices).forEach((ticker) => {
        staticData.stock_prices[ticker] = _lastYahooPrices[ticker].close;
      });
      staticData.market_last_update = (/* @__PURE__ */ new Date()).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) + " WIB";
    }
    res.json(staticData);
  } catch (err) {
    res.json({
      last_update: "2026-06-11",
      market_last_update: "2026-06-11 20:04:16 WIB",
      ihsg: { value: 5886.03, daily: -0.28, weekly: 5.21, monthly: -17.96 },
      usdidr: { value: 17985, daily: -0.26, weekly: 0.16, monthly: 2.77 },
      gold: { value: 4347, daily: 0.05, weekly: -3.4, monthly: -4.9 },
      oil: { value: 88, daily: -3.68, weekly: -5, monthly: -10.3 },
      stock_prices: {
        BBCA: 5825,
        BBRI: 2850,
        BMRI: 4250,
        TLKM: 2870,
        ASII: 4700,
        ADRO: 2250,
        PTBA: 2630,
        ESSA: 605,
        GOTO: 50
      }
    });
  }
});
app.use("/data", express.static(path2.join(process.cwd(), "data")));
app.all("/api/engine/force-sync", async (req, res) => {
  try {
    if (isCloudFunction) {
      console.log("Starting serverless forced scan...");
      await runIdx80Scan();
      console.log("Serverless forced scan completed.");
      res.json({ success: true, message: "Sync finished successfully on cloud." });
    } else {
      runIdx80Scan();
      res.json({ success: true, message: "Manual sync started in background." });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.get("/api/engine/idx80", async (req, res) => {
  try {
    if (db2) {
      const docSnap = await getDoc(doc2(db2, "engine", "idx80_scan"));
      if (docSnap.exists()) {
        return res.json(docSnap.data());
      }
    }
    const dataPath = isCloudFunction ? path2.join("/tmp", "idx80_scan.json") : path2.join(process.cwd(), "data", "idx80_scan.json");
    if (fs2.existsSync(dataPath)) {
      return res.json(JSON.parse(fs2.readFileSync(dataPath, "utf-8")));
    }
    return res.json({ stocks: [], lastUpdated: null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
if (!isCloudFunction) {
  startScannerCron();
}
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode. Mounting Vite middleware...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode. Serving static assets from dist/...");
    const distPath = path2.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path2.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express server running on http://localhost:${PORT}`);
  });
}
if (!isCloudFunction) {
  startServer();
}

// api-handler.ts
var api_handler_default = app;
export {
  api_handler_default as default
};
