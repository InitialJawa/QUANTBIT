import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { RAW_STOCKS_DATA } from "../data/raw_stocks_data.ts";
import { queryAll, queryOne, ensureSchema } from "../server/db.ts";

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
  description: "Get current IDX market overview: IHSG, USD/IDR, Gold prices and daily changes",
}, async () => {
  try {
    await ensureSchema();
    const latest = await queryOne("SELECT date,ihsg_close,gold_close,usdidr_rate FROM market_daily ORDER BY date DESC LIMIT 1") as any;
    if (!latest) return { content: [{ type: "text" as const, text: "Market data not available" }] };
    const marketData = {
      last_update: latest.date,
      ihsg: { value: latest.ihsg_close, daily: 0, weekly: 0, monthly: 0 },
      usdidr: { value: latest.usdidr_rate, daily: 0, weekly: 0, monthly: 0 },
      gold: { value: latest.gold_close, daily: 0, weekly: 0, monthly: 0 },
      oil: { value: 0, daily: 0, weekly: 0, monthly: 0 },
      stock_prices: {},
    };
    return { content: [{ type: "text" as const, text: JSON.stringify(marketData, null, 2) }] };
  } catch {
    return { content: [{ type: "text" as const, text: "Market data not available" }] };
  }
});

server.registerTool("get_stock_info", {
  description: "Get detailed info for a specific IDX stock by ticker symbol",
  inputSchema: { ticker: z.string().describe("Stock ticker (e.g. BBCA, BBRI)") },
}, async (args) => {
  const ticker = args.ticker.toUpperCase();
  // Try synthetic data first
  const raw = RAW_STOCKS_DATA.find(s => s.startsWith(ticker + "|"));
  if (raw) return { content: [{ type: "text" as const, text: JSON.stringify(parseStockLine(raw), null, 2) }] };
  // Fallback to D1
  try {
    await ensureSchema();
    const profile = await queryOne("SELECT * FROM tickers WHERE ticker=?", [ticker]) as any;
    const score = await queryOne("SELECT quality,growth,value,dividend,momentum FROM stock_scores WHERE ticker=? AND score_date=(SELECT MAX(score_date) FROM stock_scores)", [ticker]) as any;
    return { content: [{ type: "text" as const, text: JSON.stringify({ ticker, ...profile, ...score }, null, 2) }] };
  } catch {
    return { content: [{ type: "text" as const, text: `Stock ${ticker} not found` }] };
  }
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
  if (results.length > 0) return { content: [{ type: "text" as const, text: JSON.stringify(results, null, 2) }] };
  // Fallback to D1
  try {
    await ensureSchema();
    const rows = await queryAll("SELECT ticker,name,sector,industry FROM tickers WHERE is_active=1 AND (ticker LIKE ? OR name LIKE ? OR sector LIKE ?) ORDER BY ticker LIMIT ?", [`%${q}%`, `%${q}%`, `%${q}%`, limit]);
    return { content: [{ type: "text" as const, text: JSON.stringify(rows, null, 2) }] };
  } catch {
    return { content: [{ type: "text" as const, text: `No results for ${args.query}` }] };
  }
});

server.registerTool("get_top_movers", {
  description: "Get top gainers and losers from IDX today (latest scores as proxy)",
}, async () => {
  try {
    await ensureSchema();
    const rows = await queryAll("SELECT ticker,quality,growth,value,momentum,dividend FROM stock_scores WHERE score_date=(SELECT MAX(score_date) FROM stock_scores) ORDER BY quality DESC") as any[];
    const gainers = rows.slice(0, 5).map((r: any) => ({ ticker: r.ticker, quality: r.quality, growth: r.growth }));
    const losers = rows.slice(-5).reverse().map((r: any) => ({ ticker: r.ticker, quality: r.quality, growth: r.growth }));
    return { content: [{ type: "text" as const, text: JSON.stringify({ gainers, losers }, null, 2) }] };
  } catch {
    return { content: [{ type: "text" as const, text: "Score data not available" }] };
  }
});

server.registerTool("get_historical_data", {
  description: "Get historical daily prices for a stock from D1 database",
  inputSchema: {
    ticker: z.string().describe("Stock ticker (e.g. BBCA)"),
    from: z.string().optional().describe("Start year (default 2021)"),
    to: z.string().optional().describe("End year (default 2026)"),
  },
}, async (args) => {
  const ticker = args.ticker.toUpperCase();
  const fromY = args.from || "2021";
  const toY = args.to || "2026";
  try {
    await ensureSchema();
    const rows = await queryAll("SELECT date,close,adj_close FROM stock_daily WHERE ticker=? AND date>=? AND date<=? ORDER BY date LIMIT 100", [ticker, `${fromY}-01-01`, `${toY}-12-31`]) as any[];
    if (rows.length === 0) return { content: [{ type: "text" as const, text: JSON.stringify({ ticker, count: 0, message: "No data found" }) }] };
    const result = rows.map((r: any) => ({ date: r.date, price: r.close, adjPrice: r.adj_close }));
    return { content: [{ type: "text" as const, text: JSON.stringify({ ticker, count: result.length, from: result[0]?.date, to: result[result.length - 1]?.date, data: result }, null, 2) }] };
  } catch (e: any) {
    return { content: [{ type: "text" as const, text: `Error: ${e.message}` }] };
  }
});

server.registerResource("market_overview", "quantbit://market/overview", {
  description: "Current IDX market overview from D1",
  mimeType: "application/json",
}, async (uri) => {
  let text = "Data not available";
  try {
    await ensureSchema();
    const latest = await queryOne("SELECT date,ihsg_close,gold_close,usdidr_rate FROM market_daily ORDER BY date DESC LIMIT 1") as any;
    if (latest) text = JSON.stringify({ last_update: latest.date, ihsg: latest.ihsg_close, gold: latest.gold_close, usdidr: latest.usdidr_rate }, null, 2);
  } catch {}
  return { contents: [{ uri: uri.href, text, mimeType: "application/json" }] };
});

server.registerResource("stocks_list", "quantbit://stocks", {
  description: "List of all IDX stocks with key metrics",
  mimeType: "application/json",
}, async (uri) => {
  let text = "[]";
  try {
    await ensureSchema();
    const rows = await queryAll("SELECT ticker,name,sector,industry FROM tickers WHERE is_active=1 ORDER BY ticker");
    text = JSON.stringify(rows, null, 2);
  } catch {}
  return { contents: [{ uri: uri.href, text, mimeType: "application/json" }] };
});

server.registerResource("stock_detail", new ResourceTemplate("quantbit://stocks/{ticker}", {
  list: async () => {
    try {
      await ensureSchema();
      const stocks = await queryAll("SELECT ticker,name,sector,industry FROM tickers WHERE is_active=1 ORDER BY ticker");
      return { resources: stocks.map((s: any) => ({ uri: `quantbit://stocks/${s.ticker}`, name: `${s.ticker} - ${s.name}`, description: `${s.sector} / ${s.industry}` })) };
    } catch {
      return { resources: [] };
    }
  },
}), {
  description: "Detailed stock information by ticker",
  mimeType: "application/json",
}, async (uri, variables) => {
  const ticker = (variables.ticker as string).toUpperCase();
  try {
    await ensureSchema();
    const row = await queryOne("SELECT ticker,name,sector,industry,is_active,is_idx80 FROM tickers WHERE ticker=?", [ticker]) as any;
    if (row) return { contents: [{ uri: uri.href, text: JSON.stringify(row, null, 2), mimeType: "application/json" }] };
  } catch {}
  return { contents: [{ uri: uri.href, text: `Stock ${ticker} not found` }] };
});

const transport = new StdioServerTransport();

if (process.argv[1] && process.argv[1].endsWith("mcp/index.ts")) {
  await server.connect(transport);
  console.log("QuantBit MCP server connected via stdio");
} else if (process.env.QUANTBIT_MCP_AUTOSTART === "1") {
  await server.connect(transport);
  console.log("QuantBit MCP server connected via stdio (autostart)");
}
