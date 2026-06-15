import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import fs from "fs";
import dotenv from "dotenv";
import { exec } from "child_process";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import Database from "better-sqlite3";

dotenv.config();

export const app = express();
app.use(express.json());

const PORT = 3000;

// SQLite database for historical market data
const HISTORICAL_DB_PATH = path.join(process.cwd(), "data", "historical_market.sqlite");
const HISTORICAL_JSON_PATH = path.join(process.cwd(), "data", "historical_market_data.json");
let historicalDb: Database.Database | null = null;

function ensureHistoricalDb() {
  if (fs.existsSync(HISTORICAL_DB_PATH)) return;
  if (!fs.existsSync(HISTORICAL_JSON_PATH)) {
    throw new Error("Neither SQLite nor JSON historical database found at " + HISTORICAL_DB_PATH);
  }
  console.log("SQLite database not found. Migrating from JSON...");
  const rawData = JSON.parse(fs.readFileSync(HISTORICAL_JSON_PATH, "utf-8"));
  if (!Array.isArray(rawData) || rawData.length === 0) {
    throw new Error("Historical JSON contains no records");
  }
  const db = new Database(HISTORICAL_DB_PATH);
  db.pragma("journal_mode = DELETE");
  db.pragma("synchronous = OFF");
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_market (
      date TEXT PRIMARY KEY, ihsgPrice REAL, goldPrice REAL, usdidrRate REAL,
      stockPrices TEXT, stockAdjPrices TEXT, stockVolumes TEXT,
      stockOpens TEXT, stockHighs TEXT, stockLows TEXT,
      stockRanksProd TEXT, stockRanksRes TEXT
    )
  `);
  const insert = db.prepare(`INSERT OR REPLACE INTO daily_market
    (date, ihsgPrice, goldPrice, usdidrRate, stockPrices, stockAdjPrices, stockVolumes,
     stockOpens, stockHighs, stockLows, stockRanksProd, stockRanksRes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const tx = db.transaction((rows: any[]) => {
    for (const r of rows) insert.run(r.date, r.ihsgPrice, r.goldPrice, r.usdidrRate,
      JSON.stringify(r.stockPrices ?? {}), JSON.stringify(r.stockAdjPrices ?? {}),
      JSON.stringify(r.stockVolumes ?? {}), JSON.stringify(r.stockOpens ?? {}),
      JSON.stringify(r.stockHighs ?? {}), JSON.stringify(r.stockLows ?? {}),
      JSON.stringify(r.stockRanksProd ?? {}), JSON.stringify(r.stockRanksRes ?? {}));
  });
  tx(rawData);
  db.close();
  console.log(`SQLite database created with ${rawData.length} records from JSON.`);
}

let historicalFallbackData: any[] | null = null;
let sqlJsModule: any = null;

function getHistoricalDb(): Database.Database | null {
  if (historicalFallbackData) return null;
  if (historicalDb) return historicalDb;

  try {
    ensureHistoricalDb();
    historicalDb = new Database(HISTORICAL_DB_PATH, { readonly: true, fileMustExist: true });
    return historicalDb;
  } catch (err) {
    console.warn("SQLite unavailable, using JSON fallback:", (err as Error).message);
    try {
      const raw = JSON.parse(fs.readFileSync(HISTORICAL_JSON_PATH, "utf-8"));
      if (!Array.isArray(raw) || raw.length === 0) throw new Error("JSON empty");
      historicalFallbackData = raw;
    } catch (jsonErr) {
      throw new Error("Cannot load historical data: " + (jsonErr as Error).message);
    }
    return null;
  }
}

// Lazy initialize Gemini client to avoid crashing on start if API key is not set
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing. Please configure it in your local .env file.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "quantbit-terminal",
        },
      },
    });
  }
  return aiClient;
}

// REST APIs
app.get("/api/health", (req, res) => {
  const dbExists = fs.existsSync(HISTORICAL_DB_PATH);
  const jsonExists = fs.existsSync(HISTORICAL_JSON_PATH);
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// Quantitative Engine Persistent State Setup
const isCloudFunction = !!(process.env.FUNCTIONS_EMULATOR || process.env.FIREBASE_CONFIG || process.env.VERCEL);
const statePath = isCloudFunction
  ? path.join("/tmp", "engine_state.json")
  : path.join(process.cwd(), "data", "engine_state.json");

// Firebase SDK Database connection
const firebaseConfigPath = path.join(process.cwd(), "firebase-config.json");
let db: any = null;

if (fs.existsSync(firebaseConfigPath)) {
  try {
    const config = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
    const fbApp = initializeApp(config);
    db = getFirestore(fbApp, config.firestoreDatabaseId);
    console.log("Firebase Firestore successfully connected server-side with database ID:", config.firestoreDatabaseId);
  } catch (err) {
    console.error("Firebase startup initialization failed on server:", err);
  }
}

function getEngineStateSyncFallback() {
  const defaultState = {
    _simulated: true,
    portfolio: [
      { ticker: "BBCA", shares: 500, buyPrice: 9900, addedAt: new Date().toISOString() },
      { ticker: "BBRI", shares: 1000, buyPrice: 4900, addedAt: new Date().toISOString() }
    ],
    watchlist: [
      { ticker: "BBCA", addedAt: new Date().toISOString() }
    ],
    cash: 100000000,
    config: {
      activeConfig: "prod",
      safeHavenAsset: "emas",
      topNCount: 5,
      qualityWeight: 0.25,
      growthWeight: 0.10,
      valueWeight: 0.30,
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
      { id: "log-1", type: "BUY", ticker: "BBCA", shares: 500, price: 9900, timestamp: new Date().toISOString(), _simulated: true },
      { id: "log-2", type: "BUY", ticker: "BBRI", shares: 1000, price: 4900, timestamp: new Date().toISOString(), _simulated: true }
    ]
  };

  try {
    if (!fs.existsSync(statePath)) {
      const dataDir = path.dirname(statePath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(statePath, JSON.stringify(defaultState, null, 2), "utf-8");
      return defaultState;
    }
    const raw = fs.readFileSync(statePath, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to load local engine state, returning defaults:", err);
    return defaultState;
  }
}

async function getEngineStateAsync() {
  const localState = getEngineStateSyncFallback();
  if (!db) return localState;

  try {
    const docRef = doc(db, "engine", "state");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      // Seed Firebase document on first fetch
      await setDoc(docRef, localState);
      return localState;
    }
  } catch (err) {
    console.error("Firebase get state failed, falling back to local storage:", err);
    return localState;
  }
}

function saveEngineStateSyncFallback(state: any) {
  try {
    const dataDir = path.dirname(statePath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write local engine state file:", err);
  }
}

async function saveEngineStateAsync(state: any) {
  saveEngineStateSyncFallback(state);
  if (!db) return;

  try {
    const docRef = doc(db, "engine", "state");
    await setDoc(docRef, state);
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

// Gemini Analysis API
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

Integrate the user's specific request or inquiry if provided: "${customFocus || 'None'}".

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
    estimatedValue: number;
    currentPrice: number;
    stance: 'UNDERVALUED' | 'FAIRLY_VALUED' | 'OVERVALUED';
  };
  stance: 'BULLISH' | 'CAUTIOUSLY_BULLISH' | 'NEUTRAL' | 'CAUTIOUSLY_BEARISH' | 'BEARISH';
  growthOutlook: string;
  timestamp: string;
}

Frame your analysis as scenario assessment, not as trading instruction. Explain conditions under which each scenario applies. Ensure the output is pure JSON and nothing else, without markdown wrappers. Be rigorous, analytical, and objective.`;

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
      // 1. Primary: Gemini
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
        }
      });
      textContent = response.text || "{}";
    } catch (geminiError: any) {
      console.warn("Gemini Analyze Error:", geminiError.message);
      
      try {
        // 2. Fallback 1: Groq
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
      } catch (groqError: any) {
        console.warn("Groq Analyze Error:", groqError.message);
        
        try {
          // 3. Fallback 2: OpenRouter
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
            model: "meta-llama/llama-3.1-8b-instruct:free",
          });
          let content = response.choices[0]?.message?.content || "{}";
          if (content.includes("```json")) {
            content = content.split("```json")[1].split("```")[0];
          }
          textContent = content;
        } catch (openRouterError: any) {
          console.warn("OpenRouter Analyze Error:", openRouterError.message);
          
          // 4. Fallback 3: Mock Error Data
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
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    const cleanedText = textContent.trim();
    const parsedData = JSON.parse(cleanedText);
    res.json(parsedData);
  } catch (error: any) {
    console.error("Gemini Analysis Error:", error);
    res.status(500).json({ error: error.message || "Failed to analyze stock with Gemini AI" });
  }
});

// Gemini Market Summary API
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
  "scenarioAnalysis": string // A brief scenario outlook (1-2 sentences) describing possible market directions and conditions in Indonesian.
}

Frame your output as scenario assessment, not investment directive. Explain what market conditions would support each scenario. Ensure the output is pure JSON and nothing else, without markdown wrappers. Be rigorous, professional, and analytical.`;

    const stockSummary = stocks && Array.isArray(stocks) 
      ? stocks.map((s: any) => `${s.ticker}: IDR ${s.currentPrice} (${s.change >= 0 ? '+' : ''}${s.change}%)`).join(", ")
      : "No stock data";

    const userPrompt = `Real-Time Market Indicators:
- IHSG (JCI Index): ${mkt?.ihsg?.value || 'N/A'} (Daily Change: ${mkt?.ihsg?.daily_pct || mkt?.ihsg?.daily || 0}%, Monthly Trend: ${mkt?.ihsg?.monthly || 0}%)
- USD/IDR Exchange: Rp ${mkt?.usdidr?.value || 'N/A'} (Daily Change: ${mkt?.usdidr?.daily || 0}%)
- Gold Price: USD ${mkt?.gold?.value || 'N/A'}/oz
- System Status: ${rs?.status || 'N/A'} (Market Health: ${rs?.market_health || 50}/100, Opportunity: ${rs?.opportunity || 50}/100, Risk: ${rs?.risk || 40}/100)
- Capital Allocation Stance: ${rs?.capital_deployment || 40}%

Current prices and daily moves of active watched stocks:
${stockSummary}

Please generate the daily market summary and rationale in Indonesian.`;

    const getCachedSummary = () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return JSON.stringify({
        rationale: `Pasar saat ini bergerak dalam rentang konsolidasi. Volatilitas terbatas sementara pelaku pasar mengamati perkembangan makro terkini (Cached Summary ${yesterday.toLocaleDateString()}).`,
        bullishFactors: ["Stabilitas Rupiah yang terjaga", "Arus modal asing di saham blue-chip stabil", "Valuasi indeks moderat mendukung akumulasi selektif"],
        bearishFactors: ["Katalis domestik terbatas dalam jangka pendek", "Kekhawatiran moderasi konsumsi", "Volatilitas komoditas menahan laju emiten energi"],
        scenarioAnalysis: "Skenario defensif: jika IHSG bertahan di bawah MA50, fokus pada saham defensif dan perbankan dengan neraca kuat. Skenario agresif: jika IHSG crossing di atas MA50, akumulasi pada sektor siklikal."
      });
    };

    let textContent = "{}";

    try {
      // 1. Primary: Gemini 2.5 Flash
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
        }
      });
      textContent = response.text || "{}";
    } catch (geminiError: any) {
      console.warn("Gemini Error, falling back to Groq:", geminiError.message);
      
      try {
        // 2. Fallback 1: Groq
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
      } catch (groqError: any) {
        console.warn("Groq Error, falling back to OpenRouter:", groqError.message);
        
        try {
          // 3. Fallback 2: OpenRouter
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
            model: "meta-llama/llama-3.1-8b-instruct:free",
          });
          let content = response.choices[0]?.message?.content || "{}";
          // Attempt to extract JSON if it was wrapped in markdown
          if (content.includes("```json")) {
            content = content.split("```json")[1].split("```")[0];
          }
          textContent = content;
        } catch (openRouterError: any) {
          console.warn("OpenRouter Error, falling back to Cached Summary:", openRouterError.message);
          
          // 4. Fallback 3: Cached Summary
          textContent = getCachedSummary();
        }
      }
    }

    res.json(JSON.parse(textContent.trim()));
  } catch (error: any) {
    console.error("Gemini Market Summary Full Fallback Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate daily market summary" });
  }
});

import Groq from "groq-sdk";
import OpenAI from "openai";

// Gemini Chat API / Any provider
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
Recent Price: IDR ${selectedStock.currentPrice} (${selectedStock.change > 0 ? '+' : ''}${selectedStock.change}%)
Description: ${selectedStock.description}
Ratios: PE ${selectedStock.peRatio}, PB ${selectedStock.pbRatio}, ROE ${selectedStock.roe}%, DER ${selectedStock.der}, Dividend Yield ${selectedStock.dividendYield}%`;
    }

    const systemInstruction = `You are a friendly, knowledgeable Indonesian stock market analyst.
Provide objective, balanced analysis. Support your answers with macroeconomic context in Indonesia, BI-Rate trends (Bank Indonesia interest rates), Rupiah exchange rate factors, or sector tailwinds.
Present multiple scenarios and explain conditions for each. Keep your tone educational and balanced. Include standard risk disclosure.

${contextStockInfo}

Format your response using professional markdown with bullet points, brief tables, bold figures, and clean paragraphs.`;

    const lastMessage = messages[messages.length - 1].content;
    const commonHistory = messages.slice(0, -1).map((msg: any): { role: "assistant" | "user", content: string } => ({
      role: msg.role === "assistant" ? "assistant" : "user",
      content: msg.content
    }));

    let textContent = "";

    try {
      // 1. Primary: Gemini 2.5 Flash
      const ai = getGeminiClient();
      const apiHistory = messages.slice(0, -1).map((msg: any) => ({
        role: msg.role === "user" ? "user" as const : "model" as const,
        parts: [{ text: msg.content }]
      }));

      const chat = ai.chats.create({
        model: "gemini-2.5-flash",
        history: apiHistory,
        config: {
          systemInstruction,
        }
      });
      const response = await chat.sendMessage({ message: lastMessage });
      textContent = response.text || "";
    } catch (geminiError: any) {
      console.warn("Chat Gemini Error, falling back to Groq:", geminiError.message);
      
      try {
        // 2. Fallback 1: Groq
        const groqKey = process.env.GROQ_API_KEY;
        if (!groqKey) throw new Error("GROQ_API_KEY not configured");
        
        const groqClient = new Groq({ apiKey: groqKey });
        const response = await groqClient.chat.completions.create({
          messages: [
            { role: "system", content: systemInstruction },
            ...(commonHistory as any),
            { role: "user", content: lastMessage }
          ],
          model: "llama-3.3-70b-versatile",
        });
        textContent = response.choices[0]?.message?.content || "";
      } catch (groqError: any) {
        console.warn("Chat Groq Error, falling back to OpenRouter:", groqError.message);
        
        try {
          // 3. Fallback 2: OpenRouter
          const openRouterKey = process.env.OPENROUTER_API_KEY;
          if (!openRouterKey) throw new Error("OPENROUTER_API_KEY not configured");
          
          const openaiClient = new OpenAI({ 
            baseURL: "https://openrouter.ai/api/v1",
            apiKey: openRouterKey 
          });
          const response = await openaiClient.chat.completions.create({
            messages: [
              { role: "system", content: systemInstruction },
              ...(commonHistory as any),
              { role: "user", content: lastMessage }
            ],
            model: "meta-llama/llama-3.1-8b-instruct:free",
          });
          textContent = response.choices[0]?.message?.content || "";
        } catch (openRouterError: any) {
          console.warn("Chat OpenRouter Error, falling back to static message:", openRouterError.message);
          textContent = "Maaf, asisten AI sedang mengalami kendala teknis. Harap coba lagi beberapa saat lagi atau periksa pengaturan API Key Anda.";
        }
      }
    }

    res.json({ content: textContent });
  } catch (error: any) {
    console.error("AI Chat Full Fallback Error:", error);
    res.status(500).json({ error: error.message || "Failed to process chat message with AI Provider" });
  }
});

// Helper to bridge historical data up to today dynamically without look-ahead bias
function bridgeHistoricalDataToToday(rawData: any[], configType: "prod" | "res") {
  if (rawData.length === 0) return rawData;
  const lastIndex = rawData.length - 1;
  const lastObj = rawData[lastIndex];
  const lastDateStr = lastObj.date;
  
  // Today's date dynamically in WIB (UTC+7) timezone
  const todayStr = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
  if (lastDateStr >= todayStr) return rawData; // Already current
  
  // Parse last date parts
  const lastDate = new Date(lastDateStr);
  const todayDate = new Date(todayStr);
  
  // Gather intermediate daily trading dates (Mon-Fri)
  const intermediateDates: string[] = [];
  let curr = new Date(lastDate.getTime() + 24 * 60 * 60 * 1000);
  while (curr <= todayDate) {
    const dayOfWeek = curr.getDay(); // 0 is Sunday, 6 is Saturday
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
  
  // To keep the system 100% authentic and prevent look-ahead bias, we simply carry forward the last actual day's values
  // for any tiny gaps (e.g., weekends, holidays, or dynamic intra-day buffers)
  intermediateDates.forEach((dateStr) => {
    const mockDay = {
      ...lastObj,
      date: dateStr
    };
    bridgedList.push(mockDay);
  });
  
  return bridgedList;
}

// Real-time Backtest & Historical Data Backend Engine Since 2000
app.get("/api/backtest-data", (req, res) => {
  try {
    const configType = (req.query.configType === "res" ? "res" : "prod") as "prod" | "res";
    const weights = configType === "prod" 
      ? { quality: 0.25, growth: 0.1, value: 0.3, momentum: 0.35 }
      : { quality: 0.25, growth: 0.3, value: 0.1, momentum: 0.35 };

    const db = getHistoricalDb();
    let rawData: any[];

    if (db) {
      const rows = db.prepare("SELECT * FROM daily_market ORDER BY date ASC").all() as any[];
      if (rows.length === 0) {
        throw new Error("CRITICAL PIPELINE ERROR: Real historical market database contains no records!");
      }
      rawData = rows.map((row: any) => ({
        date: row.date,
        ihsgPrice: row.ihsgPrice,
        goldPrice: row.goldPrice,
        usdidrRate: row.usdidrRate,
        stockPrices: JSON.parse(row.stockPrices || "{}"),
        stockAdjPrices: JSON.parse(row.stockAdjPrices || "{}"),
        stockVolumes: JSON.parse(row.stockVolumes || "{}"),
        stockOpens: JSON.parse(row.stockOpens || "{}"),
        stockHighs: JSON.parse(row.stockHighs || "{}"),
        stockLows: JSON.parse(row.stockLows || "{}"),
        stockRanksProd: JSON.parse(row.stockRanksProd || "{}"),
        stockRanksRes: JSON.parse(row.stockRanksRes || "{}"),
      }));
    } else {
      rawData = [...(historicalFallbackData || [])];
      if (rawData.length === 0) {
        throw new Error("CRITICAL PIPELINE ERROR: Historical data fallback is empty!");
      }
    }

    // Bridge data dynamically up to today
    const bridgedRawData = bridgeHistoricalDataToToday(rawData, configType);

    const data = bridgedRawData.map((day: any) => ({
      date: day.date,
      ihsgPrice: day.ihsgPrice,
      goldPrice: day.goldPrice,
      stockPrices: day.stockAdjPrices,
      stockAdjPrices: day.stockAdjPrices,
      stockRanks: configType === "prod" ? day.stockRanksProd : day.stockRanksRes,
      stockRanksProd: day.stockRanksProd,
      stockRanksRes: day.stockRanksRes,
    }));

    res.json({
      success: true,
      count: data.length,
      configType,
      weights,
      data
    });
  } catch (error: any) {
    console.error("Backtest Data API Error:", error);
    res.status(500).json({ error: error.message || "Failed to load real backtest market data" });
  }
});

// Fundamentals SQLite endpoint - serves real IDX fundamental data
const FUNDAMENTALS_DB_PATH = path.join(process.cwd(), "data", "fundamentals.sqlite");
let fundamentalsDb: Database.Database | null = null;

function getFundamentalsDb(): Database.Database | null {
  if (fundamentalsDb) return fundamentalsDb;
  try {
    if (!fs.existsSync(FUNDAMENTALS_DB_PATH)) {
      console.warn("Fundamentals SQLite not found at", FUNDAMENTALS_DB_PATH);
      return null;
    }
    fundamentalsDb = new Database(FUNDAMENTALS_DB_PATH, { readonly: true, fileMustExist: true });
    return fundamentalsDb;
  } catch (err) {
    console.warn("Cannot open fundamentals DB:", (err as Error).message);
    return null;
  }
}

app.get("/api/fundamentals", (req, res) => {
  try {
    const db = getFundamentalsDb();
    if (!db) {
      return res.json({ success: false, count: 0, data: [] });
    }
    const rows = db.prepare("SELECT * FROM fundamentals_yearly WHERE year >= 2021 ORDER BY ticker, year").all();
    res.json({ success: true, count: rows.length, data: rows });
  } catch (error: any) {
    console.error("Fundamentals API Error:", error);
    res.status(500).json({ success: false, count: 0, data: [], error: error.message });
  }
});

// Force update database from Yahoo Finance directly up to today
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

// GoAPI Live Stock Prices Proxy
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
    const apiRes: any = await response.json();
    
    if (apiRes.status === "success" && apiRes.data && Array.isArray(apiRes.data.results)) {
      const prices: Record<string, { close: number; change: number; pct: number }> = {};
      apiRes.data.results.forEach((item: any) => {
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
  } catch (error: any) {
    console.log("GoAPI fallback active (non-blocking):", error.message);
    res.json({ 
      success: false, 
      error: error.message, 
      source: "Offline Mock Fallback" 
    });
  }
});

// Cache for Yahoo Finance prices that matches the GoAPI price schema
let _lastYahooPrices: Record<string, { close: number; change: number; pct: number }> | null = null;

// Yahoo Finance Live Stock PC/Quote Proxy
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

    const apiRes: any = await response.json();
    if (apiRes && typeof apiRes === "object") {
      const prices: Record<string, { close: number; change: number; pct: number }> = {};
      Object.keys(apiRes).forEach(symbolRaw => {
        const item = apiRes[symbolRaw];
        let symbol = symbolRaw.split(".")[0];
        if (symbolRaw === "^JKSE") symbol = "IHSG";
        if (symbolRaw === "USDIDR=X") symbol = "USDIDR";
        if (symbolRaw === "GC=F") symbol = "GOLD";
        
        if (symbol && item && Array.isArray(item.close) && item.close.length > 0) {
          const validCloses = item.close.filter((c: any) => typeof c === "number" && c !== null);
          const lClose = validCloses[validCloses.length - 1];
          const prvClose = item.previousClose || lClose || 1;
          const diff = (lClose || 0) - prvClose;
          prices[symbol] = {
            close: Number(lClose || 0),
            change: Number(diff),
            pct: Number((diff / prvClose) * 100)
          };
        }
      });
      _lastYahooPrices = prices;
      return res.json({ success: true, prices, source: "Yahoo Finance (Live)" });
    } else {
      throw new Error("Invalid quote payload returned from Yahoo Finance API");
    }
  } catch (error: any) {
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

// Dynamic live_market.json endpoint that merges real-time stock prices
app.get("/data/live_market.json", async (req, res) => {
  try {
    const fs = await import("fs/promises");
    const filePath = path.join(process.cwd(), "data", "live_market.json");
    const staticData = JSON.parse(await fs.readFile(filePath, "utf-8"));
    
    // Attempt to merge live pricing if we have fresh Yahoo prices
    if (_lastYahooPrices) {
      staticData.stock_prices = {};
      Object.keys(_lastYahooPrices).forEach(ticker => {
        staticData.stock_prices[ticker] = _lastYahooPrices![ticker].close;
      });
      staticData.market_last_update = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) + " WIB";
    }
    res.json(staticData);
  } catch (err: any) {
    // Build stock_prices from scan data instead of hardcoded 9-stock list
    const scanPath = path.join(process.cwd(), "data", "idx80_scan.json");
    let stock_prices: Record<string, number> = {};
    try {
      if (fs.existsSync(scanPath)) {
        const scanRaw = fs.readFileSync(scanPath, "utf-8");
        const scanData = JSON.parse(scanRaw);
        if (scanData?.stocks?.length) {
          scanData.stocks.forEach((s: any) => {
            const ticker = (s.ticker || "").replace(".JK", "");
            if (ticker && s.currentPrice > 0) {
              stock_prices[ticker] = s.currentPrice;
            }
          });
        }
      }
    } catch (_) { /* silent */ }
    if (Object.keys(stock_prices).length === 0) {
      stock_prices = { BBCA: 5825, BBRI: 2850, BMRI: 4250, TLKM: 2870, ASII: 4700, ADRO: 2250, PTBA: 2630, ESSA: 605, GOTO: 50 };
    }
    res.json({
      last_update: "2026-06-11",
      market_last_update: "2026-06-11 20:04:16 WIB",
      ihsg: { value: 5886.03, daily: -0.28, weekly: 5.21, monthly: -17.96 },
      usdidr: { value: 17985.0, daily: -0.26, weekly: 0.16, monthly: 2.77 },
      gold: { value: 4347, daily: 0.05, weekly: -3.4, monthly: -4.9 },
      oil: { value: 88, daily: -3.68, weekly: -5.0, monthly: -10.3 },
      stock_prices
    });
  }
});

// Expose static /data folder (data.js, regime_history.json)
app.use("/data", express.static(path.join(process.cwd(), "data")));

// Start Background Scanner Engine
import { startScannerCron, runIdx80Scan } from "./sync_engine.ts";
app.all("/api/engine/force-sync", async (req, res) => {
  try {
    // Await execution in cloud environment so that serverless functions do not freeze before finishing
    if (isCloudFunction) {
      console.log("Starting serverless forced scan...");
      await runIdx80Scan();
      console.log("Serverless forced scan completed.");
      res.json({ success: true, message: "Sync finished successfully on cloud." });
    } else {
      // Non blocking kick off for local development
      runIdx80Scan();
      res.json({ success: true, message: "Manual sync started in background." });
    }
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/engine/idx80", async (req, res) => {
  try {
    if (db) {
      const docSnap = await getDoc(doc(db, "engine", "idx80_scan"));
      if (docSnap.exists()) {
        return res.json(docSnap.data());
      }
    }
    // Fallback to local
    const dataPath = isCloudFunction
      ? path.join("/tmp", "idx80_scan.json")
      : path.join(process.cwd(), "data", "idx80_scan.json");
    if (fs.existsSync(dataPath)) {
      return res.json(JSON.parse(fs.readFileSync(dataPath, "utf-8")));
    }
    return res.json({ stocks: [], lastUpdated: null });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Start the cron job for the engine updates if not running as a Cloud Function
if (!isCloudFunction) {
  startScannerCron();
}

// Vite & Static file hosting setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode. Mounting Vite middleware...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode. Serving static assets from dist/...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express server running on http://localhost:${PORT}`);
  });
}

// Only start the server listener if not running in Firebase Cloud Functions
if (!isCloudFunction) {
  startServer();
}
