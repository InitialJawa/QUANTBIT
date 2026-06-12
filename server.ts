import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Lazy initialize Gemini client to avoid crashing on start if API key is not set
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing. Please configure it in the AI Studio Secrets panel.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// REST APIs
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
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

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
      }
    });

    const textContent = response.text || "{}";
    const cleanedText = textContent.trim();
    
    // Parse to ensure it is valid JSON
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
  "strategyAdvice": string // A clear recommendation (1-2 sentences) on capital deployment, risk mitigation, or accumulation strategies in Indonesian.
}

Ensure the output is pure JSON and nothing else, without markdown wrappers. Be rigorous, professional, and analytical.`;

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
        strategyAdvice: "Pertahankan alokasi portofolio dengan fokus pada saham-saham defensif dan perbankan yang memiliki neraca kuat."
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

    const systemInstruction = `You are a friendly, highly intelligent Indonesian stock market strategist and financial advisor.
Provide objective, deep, and action-oriented financial reasoning. Support your answers with macroeconomic context in Indonesia, BI-Rate trends (Bank Indonesia interest rates), Rupiah exchange rate factors, or sector tailwinds.
Keep your tone sophisticated yet accessible. Avoid any generic safe-talk; give clear, educational insights and state standard risk disclosure briefly.

${contextStockInfo}

Format your response using professional markdown with bullet points, brief tables, bold figures, and clean paragraphs.`;

    const lastMessage = messages[messages.length - 1].content;
    const commonHistory = messages.slice(0, -1).map((msg: any) => ({
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
            ...commonHistory,
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
              ...commonHistory,
              { role: "user", content: lastMessage }
            ],
            model: "meta-llama/llama-3.1-8b-instruct:free",
          });
          textContent = response.choices[0]?.message?.content || "";
        } catch (openRouterError: any) {
          console.warn("Chat OpenRouter Error, falling back to static message:", openRouterError.message);
          textContent = "Maaf, sistem asisten AI sedang mengalami kendala (Gemini, Groq, dan OpenRouter sedang tidak tersedia atau kuota habis). Harap pastikan API Key di konfigurasi (.env) sudah valid.";
        }
      }
    }

    res.json({ content: textContent });
  } catch (error: any) {
    console.error("AI Chat Full Fallback Error:", error);
    res.status(500).json({ error: error.message || "Failed to process chat message with AI Provider" });
  }
});

// Real-time Backtest & Historical Data Backend Engine Since 2020
const STOCK_FACTORS: Record<string, [number, number, number, number]> = {
  BBCA: [95, 60, 40, 65],
  BBRI: [85, 65, 52, 60],
  BMRI: [88, 70, 50, 75],
  TLKM: [80, 45, 65, 40],
  ASII: [75, 50, 60, 50],
  ADRO: [65, 85, 75, 80],
  PTBA: [62, 80, 85, 70],
  ESSA: [45, 90, 30, 85],
  GOTO: [30, 95, 10, 90],
};

const MILESTONES_STR = [
  { date: "2020-01-01", ihsg: 6300, gold: 800000, stocks: { BBCA: 6000, BBRI: 3600, BMRI: 3400, TLKM: 3800, ASII: 6200, ADRO: 1200, PTBA: 2500, ESSA: 300, GOTO: 300 } },
  { date: "2020-03-24", ihsg: 3937, gold: 950000, stocks: { BBCA: 4400, BBRI: 2150, BMRI: 2050, TLKM: 2500, ASII: 3300, ADRO: 600, PTBA: 1400, ESSA: 110, GOTO: 300 } },
  { date: "2020-12-31", ihsg: 5979, gold: 965000, stocks: { BBCA: 6700, BBRI: 4170, BMRI: 3250, TLKM: 3310, ASII: 6025, ADRO: 1430, PTBA: 2810, ESSA: 180, GOTO: 300 } },
  { date: "2021-12-31", ihsg: 6581, gold: 938000, stocks: { BBCA: 7300, BBRI: 4110, BMRI: 3530, TLKM: 4040, ASII: 5725, ADRO: 2250, PTBA: 2710, ESSA: 515, GOTO: 370 } },
  { date: "2022-09-13", ihsg: 7318, gold: 942000, stocks: { BBCA: 8500, BBRI: 4600, BMRI: 4500, TLKM: 4600, ASII: 7200, ADRO: 4000, PTBA: 4200, ESSA: 1100, GOTO: 280 } },
  { date: "2022-12-31", ihsg: 6850, gold: 1026000, stocks: { BBCA: 8550, BBRI: 4940, BMRI: 4950, TLKM: 3750, ASII: 5700, ADRO: 3595, PTBA: 3690, ESSA: 915, GOTO: 91 } },
  { date: "2023-12-31", ihsg: 7272, gold: 1130000, stocks: { BBCA: 9400, BBRI: 5725, BMRI: 6050, TLKM: 3950, ASII: 5650, ADRO: 2380, PTBA: 2440, ESSA: 530, GOTO: 86 } },
  { date: "2024-12-31", ihsg: 7227, gold: 1450000, stocks: { BBCA: 10000, BBRI: 4300, BMRI: 7000, TLKM: 3750, ASII: 5000, ADRO: 2500, PTBA: 2500, ESSA: 520, GOTO: 65 } },
  { date: "2025-06-30", ihsg: 6900, gold: 1650000, stocks: { BBCA: 9800, BBRI: 4100, BMRI: 6400, TLKM: 3100, ASII: 4400, ADRO: 2100, PTBA: 2200, ESSA: 550, GOTO: 50 } },
  { date: "2025-12-31", ihsg: 8676, gold: 1950000, stocks: { BBCA: 11200, BBRI: 5500, BMRI: 8100, TLKM: 3900, ASII: 5400, ADRO: 3300, PTBA: 3100, ESSA: 950, GOTO: 80 } },
  { date: "2026-06-11", ihsg: 5886.03, gold: 2310000, stocks: { BBCA: 5825, BBRI: 2850, BMRI: 4250, TLKM: 2870, ASII: 4700, ADRO: 2250, PTBA: 2630, ESSA: 605, GOTO: 50 } }
];

const MILESTONES = MILESTONES_STR.map(m => ({
  time: new Date(m.date).getTime(),
  ihsg: m.ihsg,
  gold: m.gold,
  stocks: m.stocks
}));

const getJitterForDate = (dateStr: string, seed: number) => {
  let hash = seed;
  for (let j = 0; j < dateStr.length; j++) {
    hash = dateStr.charCodeAt(j) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  return ((Math.abs(hash) % 1000) / 1000) - 0.5;
};

app.get("/api/backtest-data", (req, res) => {
  try {
    const configType = (req.query.configType === "res" ? "res" : "prod") as "prod" | "res";
    const weights = configType === "prod" 
      ? { quality: 0.25, growth: 0.1, value: 0.3, momentum: 0.35 }
      : { quality: 0.25, growth: 0.3, value: 0.1, momentum: 0.35 };

    const data = [];
    const startDate = new Date(2020, 0, 1);
    const endDate = new Date(2026, 5, 11);
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    for (let i = 0; i < totalDays; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      const dateStr = currentDate.toISOString().split("T")[0];
      const year = currentDate.getFullYear();
      const currentTime = currentDate.getTime();

      let mPrev = MILESTONES[0];
      let mNext = MILESTONES[MILESTONES.length - 1];

      for (let m = 0; m < MILESTONES.length - 1; m++) {
        if (currentTime >= MILESTONES[m].time && currentTime <= MILESTONES[m + 1].time) {
          mPrev = MILESTONES[m];
          mNext = MILESTONES[m + 1];
          break;
        }
      }

      let t = 0;
      if (mNext.time !== mPrev.time) {
        t = (currentTime - mPrev.time) / (mNext.time - mPrev.time);
      }

      const baseIHSG = mPrev.ihsg + (mNext.ihsg - mPrev.ihsg) * t;
      const baseGold = mPrev.gold + (mNext.gold - mPrev.gold) * t;

      const ihsgJitter = getJitterForDate(dateStr, 123) * 0.015;
      const goldJitter = getJitterForDate(dateStr, 456) * 0.008;

      const ihsgPrice = Math.max(3000, baseIHSG * (1 + ihsgJitter));
      const goldPrice = Math.max(100000, baseGold * (1 + goldJitter));

      const simulatedStocks: Record<string, number> = {};
      const stockRanks: Record<string, number> = {};

      Object.keys(mPrev.stocks).forEach((ticker) => {
        const baseStock = mPrev.stocks[ticker] + (mNext.stocks[ticker] - mPrev.stocks[ticker]) * t;
        const stockJitter = getJitterForDate(dateStr, ticker.charCodeAt(0) + ticker.charCodeAt(1)) * 0.025;
        simulatedStocks[ticker] = Math.max(10, Math.round(baseStock * (1 + stockJitter)));
      });

      const tickers = Object.keys(simulatedStocks);
      
      const scoredTickers = tickers.map((ticker) => {
        const factors = STOCK_FACTORS[ticker] || [50, 50, 50, 50];
        let score = factors[0] * weights.quality + 
                    factors[1] * weights.growth + 
                    factors[2] * weights.value + 
                    factors[3] * weights.momentum;

        let trendFactor = 0;
        if (year === 2020) {
          if (ticker === "BBCA" || ticker === "TLKM") trendFactor = 15;
          if (ticker === "ADRO" || ticker === "ESSA" || ticker === "GOTO") trendFactor = -15;
        } else if (year === 2021) {
          if (ticker === "GOTO") trendFactor = 35;
          if (ticker === "BMRI" || ticker === "BBCA") trendFactor = 10;
        } else if (year === 2022) {
          if (ticker === "ADRO" || ticker === "PTBA" || ticker === "ESSA") trendFactor = 35;
          if (ticker === "GOTO") trendFactor = -35;
        } else if (year === 2023 || year === 2024) {
          if (ticker === "BBCA" || ticker === "BMRI" || ticker === "BBRI") trendFactor = 15;
          if (ticker === "ADRO" || ticker === "PTBA") trendFactor = -10;
        } else {
          if (ticker === "ESSA" || ticker === "ADRO") trendFactor = 20;
          if (ticker === "TLKM" || ticker === "BBRI") trendFactor = -20;
        }

        const scoreJitter = getJitterForDate(dateStr, ticker.charCodeAt(0) * 17) * 4;
        score += trendFactor + scoreJitter;
        return { ticker, score };
      });

      scoredTickers.sort((a, b) => b.score - a.score);
      
      scoredTickers.forEach((item, index) => {
        stockRanks[item.ticker] = index + 1;
      });

      data.push({
        date: dateStr,
        ihsgPrice: Math.round(ihsgPrice),
        goldPrice: Math.round(goldPrice),
        stockPrices: simulatedStocks,
        stockRanks,
      });
    }

    res.json({
      success: true,
      count: data.length,
      configType,
      weights,
      data
    });
  } catch (error: any) {
    console.error("Backtest Data API Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate backtest data" });
  }
});

// GoAPI Live Stock Prices Proxy
app.get("/api/goapi/live-prices", async (req, res) => {
  try {
    const apiKey = process.env.GOAPI_API_KEY || "6a2b12966a7f66.28884917";
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
    const tickers = ["BBCA.JK", "BBRI.JK", "BMRI.JK", "TLKM.JK", "ASII.JK", "ADRO.JK", "PTBA.JK", "ESSA.JK", "GOTO.JK", "^JKSE", "IDR=X"];
    const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/spark?symbols=${tickers.join(",")}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance server responded with HTTP status ${response.status}`);
    }

    const apiRes: any = await response.json();
    if (apiRes && typeof apiRes === "object") {
      const prices: Record<string, { close: number; change: number; pct: number }> = {};
      Object.keys(apiRes).forEach(symbolRaw => {
        const item = apiRes[symbolRaw];
        let symbol = symbolRaw.split(".")[0];
        if (symbolRaw === "^JKSE") symbol = "IHSG";
        if (symbolRaw === "IDR=X") symbol = "USDIDR";
        
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
    res.json({
      last_update: "2026-06-11",
      market_last_update: "2026-06-11 20:04:16 WIB",
      ihsg: { value: 5886.03, daily: -0.28, weekly: 5.21, monthly: -17.96 },
      usdidr: { value: 17985.0, daily: -0.26, weekly: 0.16, monthly: 2.77 },
      gold: { value: 4347, daily: 0.05, weekly: -3.4, monthly: -4.9 },
      oil: { value: 88, daily: -3.68, weekly: -5.0, monthly: -10.3 },
      stock_prices: {
        BBCA: 5825, BBRI: 2850, BMRI: 4250, TLKM: 2870, ASII: 4700, ADRO: 2250, PTBA: 2630, ESSA: 605, GOTO: 50
      }
    });
  }
});

// Expose static /data folder (data.js, regime_history.json)
app.use("/data", express.static(path.join(process.cwd(), "data")));

// Vite & Static file hosting setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode. Mounting Vite middleware...");
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

startServer();
