import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { z } from "zod";
import { RAW_STOCKS_DATA } from "../data/raw_stocks_data.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

function loadJSON<T>(relativePath: string): T | null {
  const fullPath = join(ROOT, relativePath);
  if (!existsSync(fullPath)) return null;
  try { return JSON.parse(readFileSync(fullPath, "utf-8")) as T; }
  catch { return null; }
}

interface LiveMarket {
  last_update: string;
  ihsg: { value: number; daily: number; weekly: number; monthly: number };
  usdidr: { value: number; daily: number; weekly: number; monthly: number };
  gold: { value: number; daily: number; weekly: number; monthly: number };
  oil: { value: number; daily: number; weekly: number; monthly: number };
  stock_prices: Record<string, number>;
}

interface ScanStock {
  ticker: string; companyName: string; sector: string; industry: string;
  currentPrice: number; changePercent: number; peRatio: number; pbRatio: number;
  marketCap: number; volume: number; dividendYield: number;
  fiftyTwoWeekHigh: number; fiftyTwoWeekLow: number;
  [key: string]: unknown;
}

interface ScanData { lastUpdated: string; stocks: ScanStock[]; }

interface DayData {
  date: string; ihsgPrice: number; goldPrice: number; usdidrRate: number;
  stockPrices: Record<string, number>; stockAdjPrices: Record<string, number>;
}

function parseStockLine(line: string) {
  const [ticker, name, sector, industry, mcap, price, chgPct, pe, pb, roe, der, divYield] = line.split("|");
  return { ticker, name, sector, industry, marketCap: parseFloat(mcap), price: parseFloat(price), changePercent: parseFloat(chgPct), peRatio: parseFloat(pe), pbRatio: parseFloat(pb), roe: parseFloat(roe), der: parseFloat(der), dividendYield: parseFloat(divYield) };
}

const server = new McpServer({
  name: "QuantBit MCP",
  version: "1.0.0",
}, {
  capabilities: { tools: {}, resources: {} },
});

server.registerTool("get_market_overview", {
  description: "Get current IDX market overview: IHSG, USD/IDR, Gold, Oil prices and daily changes",
}, async () => {
  const market = loadJSON<LiveMarket>("data/live_market.json");
  if (!market) return { content: [{ type: "text" as const, text: "Market data not available" }] };
  return { content: [{ type: "text" as const, text: JSON.stringify(market, null, 2) }] };
});

server.registerTool("get_stock_info", {
  description: "Get detailed info for a specific IDX stock by ticker symbol",
  inputSchema: { ticker: z.string().describe("Stock ticker (e.g. BBCA, BBRI)") },
}, async (args) => {
  const ticker = args.ticker.toUpperCase();
  const raw = RAW_STOCKS_DATA.find(s => s.startsWith(ticker + "|"));
  if (raw) return { content: [{ type: "text" as const, text: JSON.stringify(parseStockLine(raw), null, 2) }] };
  const scan = loadJSON<ScanData>("data/idx80_scan.json");
  const s = scan?.stocks.find(st => st.ticker === ticker + ".JK");
  if (s) return { content: [{ type: "text" as const, text: JSON.stringify(s, null, 2) }] };
  return { content: [{ type: "text" as const, text: `Stock ${ticker} not found` }] };
});

server.registerTool("search_stocks", {
  description: "Search IDX stocks by name, ticker, or sector",
  inputSchema: {
    query: z.string().describe("Search query (ticker, name, or sector)"),
    limit: z.number().optional().describe("Max results (default 20)"),
  },
}, async (args) => {
  const q = args.query.toLowerCase();
  const limit = args.limit || 20;
  const results = RAW_STOCKS_DATA.map(parseStockLine)
    .filter(s => s.ticker.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.sector.toLowerCase().includes(q))
    .slice(0, limit);
  return { content: [{ type: "text" as const, text: JSON.stringify(results, null, 2) }] };
});

server.registerTool("get_top_movers", {
  description: "Get top gainers and losers from IDX today",
}, async () => {
  const scan = loadJSON<ScanData>("data/idx80_scan.json");
  if (!scan) return { content: [{ type: "text" as const, text: "Scan data not available" }] };
  const sorted = [...scan.stocks].sort((a, b) => b.changePercent - a.changePercent);
  const gainers = sorted.slice(0, 5).map(s => ({ ticker: s.ticker.replace(".JK", ""), name: s.companyName, change: s.changePercent.toFixed(2) + "%", price: s.currentPrice }));
  const losers = sorted.slice(-5).reverse().map(s => ({ ticker: s.ticker.replace(".JK", ""), name: s.companyName, change: s.changePercent.toFixed(2) + "%", price: s.currentPrice }));
  return { content: [{ type: "text" as const, text: JSON.stringify({ lastUpdated: scan.lastUpdated, gainers, losers }, null, 2) }] };
});

server.registerTool("get_historical_data", {
  description: "Get historical daily prices for a stock from backtest data",
  inputSchema: {
    ticker: z.string().describe("Stock ticker (e.g. BBCA)"),
    from: z.string().optional().describe("Start year (default 2026)"),
    to: z.string().optional().describe("End year (default 2026)"),
  },
}, async (args) => {
  const ticker = args.ticker.toUpperCase();
  const fromY = parseInt(args.from || "2026");
  const toY = parseInt(args.to || "2026");
  const result: { date: string; price: number; adjPrice: number }[] = [];
  for (let y = fromY; y <= toY; y++) {
    const data = loadJSON<DayData[]>(`data/years/${y}.json`);
    if (!data) continue;
    for (const day of data) {
      const price = day.stockPrices[ticker];
      const adjPrice = day.stockAdjPrices[ticker];
      if (price !== undefined) result.push({ date: day.date, price, adjPrice });
    }
  }
  return { content: [{ type: "text" as const, text: JSON.stringify({ ticker, count: result.length, from: result[0]?.date, to: result[result.length - 1]?.date, data: result.slice(0, 100) }, null, 2) }] };
});

server.registerResource("market_overview", "quantbit://market/overview", {
  description: "Current IDX market overview",
  mimeType: "application/json",
}, async (uri) => {
  const market = loadJSON<LiveMarket>("data/live_market.json");
  const text = market ? JSON.stringify(market, null, 2) : "Data not available";
  return { contents: [{ uri: uri.href, text, mimeType: "application/json" }] };
});

server.registerResource("stocks_list", "quantbit://stocks", {
  description: "List of all IDX stocks with key metrics",
  mimeType: "application/json",
}, async (uri) => {
  const list = RAW_STOCKS_DATA.map(parseStockLine);
  return { contents: [{ uri: uri.href, text: JSON.stringify(list, null, 2), mimeType: "application/json" }] };
});

server.registerResource("stock_detail", new ResourceTemplate("quantbit://stocks/{ticker}", {
  list: async () => {
    const stocks = RAW_STOCKS_DATA.map(parseStockLine);
    return { resources: stocks.map(s => ({ uri: `quantbit://stocks/${s.ticker}`, name: `${s.ticker} - ${s.name}`, description: `${s.sector} / ${s.industry}` })) };
  },
}), {
  description: "Detailed stock information by ticker",
  mimeType: "application/json",
}, async (uri, variables) => {
  const ticker = (variables.ticker as string).toUpperCase();
  const raw = RAW_STOCKS_DATA.find(s => s.startsWith(ticker + "|"));
  if (raw) return { contents: [{ uri: uri.href, text: JSON.stringify(parseStockLine(raw), null, 2), mimeType: "application/json" }] };
  const scan = loadJSON<ScanData>("data/idx80_scan.json");
  const s = scan?.stocks.find(st => st.ticker === ticker + ".JK");
  if (s) return { contents: [{ uri: uri.href, text: JSON.stringify(s, null, 2), mimeType: "application/json" }] };
  return { contents: [{ uri: uri.href, text: `Stock ${ticker} not found` }] };
});

const transport = new StdioServerTransport();

// C1 fix: only start the MCP server when this file is run directly (e.g.
// `npx tsx src/mcp/index.ts`). Previously the connect call was top-level,
// which meant importing this module from anywhere in the app would spin
// up a Stdio transport as a side-effect — useless and noisy in tests.
if (process.argv[1] && process.argv[1].endsWith("mcp/index.ts")) {
  await server.connect(transport);
  console.log("QuantBit MCP server connected via stdio");
} else if (process.env.QUANTBIT_MCP_AUTOSTART === "1") {
  // Opt-in auto-start for environments that explicitly want it
  await server.connect(transport);
  console.log("QuantBit MCP server connected via stdio (autostart)");
}
