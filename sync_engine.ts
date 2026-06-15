import yahooFinance from "yahoo-finance2";
import { COMBINED_TICKERS } from "./idx80.ts";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { initializeApp } from "firebase/app";
import fs from "fs";
import path from "path";
import cron from "node-cron";

// Firebase Connection
const firebaseConfigPath = path.join(process.cwd(), "firebase-config.json");
let db: any = null;

if (fs.existsSync(firebaseConfigPath)) {
  const config = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
  const fbApp = initializeApp(config);
  db = getFirestore(fbApp, config.firestoreDatabaseId);
}

// Calculate scores ranging 1-100 based on basic bounds, fallback to neutral 50 if missing
function calcQuality(stats: any, fin: any) {
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

function calcValue(stats: any, summary: any) {
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

function calcGrowth(fin: any) {
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

// Store dynamic universe
let ACTIVE_UNIVERSE = [...COMBINED_TICKERS];

// Fetches the dynamic universe from Firebase or external API
export async function refreshActiveUniverse() {
  if (!db) return;
  try {
    const { getDoc } = await import("firebase/firestore");
    const docSnap = await getDoc(doc(db, "engine", "active_universe"));
    if (docSnap.exists() && Array.isArray(docSnap.data().tickers)) {
      ACTIVE_UNIVERSE = docSnap.data().tickers;
      console.log(`[Universe Update] Successfully pulled ${ACTIVE_UNIVERSE.length} tickers dynamically from Cloud.`);
    }
  } catch (err) {
    console.log("[Universe Update] Defaulting to base list due to absence of cloud dynamic universe.", err.message);
  }
}

export async function runIdx80Scan() {
  await refreshActiveUniverse();
  console.log(`Starting Quantitative Scan & Sync to Firebase for ${ACTIVE_UNIVERSE.length} stocks...`);
  const results: any[] = [];

  const concurrencyLimit = 15;
  const pool = [...ACTIVE_UNIVERSE];
  
  const worker = async () => {
    while (pool.length > 0) {
      const ticker = pool.shift();
      if (!ticker) break;
      try {
        const quote: any = await yahooFinance.quoteSummary(ticker, {
          modules: ["price", "defaultKeyStatistics", "summaryDetail", "financialData", "summaryProfile"]
        });
        
        const price = quote.price?.regularMarketPrice || 0;
        const change = quote.price?.regularMarketChangePercent || 0;
        
        const quality = calcQuality(quote.defaultKeyStatistics, quote.financialData);
        const value = calcValue(quote.defaultKeyStatistics, quote.summaryDetail);
        const growth = calcGrowth(quote.financialData);
        
        // Momentum proxy using 50d vs 200d average
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
          changePercent: change * 100, // converting fraction to percent visually if needed
          quality,
          value,
          growth,
          momentum,
          volume: quote.summaryDetail?.volume || 0,
          peRatio: quote.summaryDetail?.trailingPE || quote.summaryDetail?.forwardPE || 0,
          pbRatio: quote.defaultKeyStatistics?.priceToBook || 0,
          dividendYield: (quote.summaryDetail?.dividendYield || 0) * 100,
          lastUpdated: new Date().toISOString()
        };
        
        results.push(data);
        console.log(`Scanned ${ticker} - DONE`);
      } catch (err: any) {
        console.error(`Error scanning ${ticker}:`, err.message);
      }
    }
  };

  const workers = Array.from({ length: concurrencyLimit }, () => worker());
  await Promise.all(workers);

  // Save to Firebase
  if (db) {
    try {
      const docRef = doc(db, "engine", "idx80_scan");
      await setDoc(docRef, { 
        lastUpdated: new Date().toISOString(),
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

  // Also save locally as a reliable cache, but ONLY if we have results
  // (never overwrite a valid cache with an empty scan)
  if (results.length > 0) {
    const isCloudFunction = !!(process.env.FUNCTIONS_EMULATOR || process.env.FIREBASE_CONFIG);
    const dataPath = isCloudFunction
      ? path.join("/tmp", "idx80_scan.json")
      : path.join(process.cwd(), "data", "idx80_scan.json");
    if (!fs.existsSync(path.dirname(dataPath))) fs.mkdirSync(path.dirname(dataPath), { recursive: true });
    fs.writeFileSync(dataPath, JSON.stringify({ lastUpdated: new Date().toISOString(), stocks: results }, null, 2));
  }
}

// Ensure the module isn't strictly executed instantly on load if imported, but can be started via cron
export function startScannerCron() {
  console.log("Scheduling IDX80 Scanner to run every 15 minutes during market hours...");
  // Run every 15 minutes
  cron.schedule("*/15 * * * *", () => {
    runIdx80Scan();
  });
  
  // Initial run in background exactly once 5 seconds after server start
  setTimeout(() => {
    runIdx80Scan();
  }, 5000);
}

// If run directly from CLI (e.g., node sync_engine.js)
if (import.meta.url === `file://${process.argv[1]}`) {
  runIdx80Scan().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
}
