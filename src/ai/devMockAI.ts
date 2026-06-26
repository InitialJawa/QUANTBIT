// ─────────────────────────────────────────────────────────────
// Dev Mock AI — deterministic AI provider for development & testing.
//
// Triggers: dev mode + no real provider reachable (e.g. user
// has no OpenRouter/Groq key + Gemini is geo-blocked from their
// region). Pattern-matches the user message to generate canned
// responses with optional tool calls — exercises all 4 AI levels
// (smarter Q&A, tool use, action API, proactive agent) without
// any external API.
//
// Gated by `import.meta.env.DEV` at the call site (aiClient.ts).
// NEVER reaches production builds.
// ─────────────────────────────────────────────────────────────
import type { AIToolCall } from "../types/ai.ts";
import type { AILiveContext } from "./systemKnowledge.ts";

export interface DevMockResult {
  content: string;
  provider: "dev-mock";
  toolCalls: AIToolCall[];
  /** Suggested follow-up prompts the user can try. */
  suggestedFollowups?: string[];
}

const TICKER_REGEX = /\b([A-Z]{3,5})(?:\.JK)?\b/g;

let mockIdCounter = 0;
const nextId = () => `tc_mock_${++mockIdCounter}`;

/** Heuristic: does the user want to perform an action?
 *  Run BEFORE read-only matching so "sync backtest to portfolio"
 *  is not caught by the "portfolio" read-only regex. */
function matchAction(message: string): AIToolCall | null {
  const m = message.toLowerCase();

  // Sync (must come first — matches "portofolio" too)
  if (/\b(sync|terapkan|apply)\s+(backtest\s*)?(ke\s*)?(portofolio|portfolio|porto)/.test(m)) {
    return { id: nextId(), name: "sync_backtest_to_portfolio", args: {} };
  }

  // Buy — ticker may be followed by .JK (case-insensitive)
  const buyMatch = m.match(/\b(beli|buy)\s+([a-z]{3,5}(?:\.jk)?)\s+(\d+)\s*(?:lembar|lbr|share|@)?/i);
  if (buyMatch) {
    return {
      id: nextId(),
      name: "buy_stock",
      args: { ticker: buyMatch[2].toUpperCase().replace(/\.JK$/, ""), shares: parseInt(buyMatch[3], 10) },
    };
  }

  // Sell
  const sellMatch = m.match(/\b(jual|sell)\s+([a-z]{3,5}(?:\.jk)?)\s+(\d+)\s*(?:lembar|lbr|share)?/i);
  if (sellMatch) {
    return {
      id: nextId(),
      name: "sell_stock",
      args: { ticker: sellMatch[2].toUpperCase(), shares: parseInt(sellMatch[3], 10) },
    };
  }

  // Move to gold
  const goldMatch = m.match(/\b(pindahkan|konversi|move).*?(\d[\d.,]*)\s*(?:juta|jt|jt\.|k)?\s*(?:ke\s*)?emas/);
  if (goldMatch) {
    const raw = goldMatch[2].replace(/\./g, "").replace(/,/g, "");
    let amount = parseFloat(raw);
    if (/\bjuta|jt\b/.test(m)) amount *= 1_000_000;
    if (amount > 0) {
      return { id: nextId(), name: "move_to_gold", args: { rupiahAmount: Math.round(amount) } };
    }
  }

  // Profile change — accept "profile qm", "ganti profile ke BG", "set profile prod"
  const profileMatch = m.match(/\b(profile|profil)\s+(?:ke\s+)?(qm|bg|prod|res|custom)/);
  if (profileMatch) {
    const map: Record<string, string> = { qm: "aman", bg: "agresif", prod: "aman", res: "agresif", aman: "aman", agresif: "agresif", dividen: "dividen" };
    return {
      id: nextId(),
      name: "set_active_profile",
      args: { profileId: map[profileMatch[2].toLowerCase()] || profileMatch[2] },
    };
  }

  // Universe change — accept "universe idx30", "ubah universe idx80"
  const uniMatch = m.match(/\b(universe|universe\s*filter)\s+(?:ke\s+)?(idx80|idx30|lq45|all)/);
  if (uniMatch) {
    return {
      id: nextId(),
      name: "set_universe",
      args: { universe: uniMatch[2].toLowerCase() as "all" | "idx80" | "idx30" | "lq45" },
    };
  }

  // Top N
  const topNMatch = m.match(/\b(top\s*n|topn)\s+(\d+)/);
  if (topNMatch) {
    return { id: nextId(), name: "set_topN", args: { n: parseInt(topNMatch[2], 10) } };
  }

  // DCA toggle
  if (/\b(nonaktifkan|matikan|disable).*?(dca|rekomendasi)/.test(m)) {
    return { id: nextId(), name: "toggle_dca_active", args: { active: false } };
  }
  if (/\b(aktifkan|enable).*?(dca|rekomendasi)/.test(m)) {
    return { id: nextId(), name: "toggle_dca_active", args: { active: true } };
  }

  // Watchlist
  const addWlMatch = m.match(/\b(tambah|add)\s+([a-z]{3,5}(?:\.jk)?)\s+(ke\s*)?watchlist/);
  if (addWlMatch) {
    return {
      id: nextId(),
      name: "add_to_watchlist",
      args: { ticker: addWlMatch[2].toUpperCase() },
    };
  }
  const rmWlMatch = m.match(/\b(hapus|remove)\s+([a-z]{3,5}(?:\.jk)?)\s+(dari\s*)?watchlist/);
  if (rmWlMatch) {
    return {
      id: nextId(),
      name: "remove_from_watchlist",
      args: { ticker: rmWlMatch[2].toUpperCase() },
    };
  }

  return null;
}

/** Heuristic: does the user want to read-only query something? */
function matchReadOnly(message: string, _ctx: AILiveContext | undefined): AIToolCall | null {
  const m = message.toLowerCase();

  // BPS / buy pressure
  if (/\b(bps|buy\s*pressure|skor\s*beli|tekanan\s*beli)\b/.test(m)) {
    return { id: nextId(), name: "get_bps_now", args: {} };
  }

  // Portfolio
  if (/\b(portofolio|portfolio|posisi\s*saya|cek\s*portofolio)\b/.test(m)) {
    return { id: nextId(), name: "get_portfolio_state", args: {} };
  }

  // Regime
  if (/\b(regime|kondisi\s*pasar|status\s*pasar|rekomendasi)\b/.test(m)) {
    return { id: nextId(), name: "get_regime_details", args: {} };
  }

  // Market history
  if (/\b(histori|riwayat|history|ihsg\s*\d+\s*hari|iHSG\s*mingguan)\b/.test(m)) {
    const daysMatch = m.match(/(\d+)\s*hari/);
    return {
      id: nextId(),
      name: "get_market_history",
      args: { days: daysMatch ? parseInt(daysMatch[1], 10) : 30 },
    };
  }

  // Ticker-specific
  const tickers = message.match(TICKER_REGEX);
  if (tickers && !/\b(beli|jual|buy|sell|top|profile|universe|watchlist)\b/.test(m)) {
    return {
      id: nextId(),
      name: "get_ticker_metrics",
      args: { ticker: tickers[0].replace(/\.JK$/, "") },
    };
  }

  // Config queries
  if (/\b(konfigurasi\s*backtest|backtest\s*config)\b/.test(m)) {
    return { id: nextId(), name: "get_backtest_config", args: {} };
  }
  if (/\b(konfigurasi\s*live|engine\s*config|config\s*saat\s*ini)\b/.test(m)) {
    return { id: nextId(), name: "get_engine_config", args: {} };
  }
  if (/\b(universe|daftar\s*saham|kandidat)\b/.test(m)) {
    return { id: nextId(), name: "get_active_universe", args: {} };
  }

  return null;
}

/** Heuristic: generic text response for non-tool queries. */
function generateTextResponse(message: string): string {
  const m = message.toLowerCase();

  // Greeting
  if (/^(halo|hai|hello|hi|hey|selamat|pagi|siang|malam)\b/.test(m)) {
    return "Halo! Saya **Quantbit AI (dev mock)**. Karena tidak ada provider AI yang reachable dari lingkungan Anda saat ini (Gemini geo-blocked, OpenRouter/Groq tanpa key), saya pakai canned responses untuk demo.\n\n" +
      "Mau coba? Tanyakan:\n" +
      "- \"berapa BPS saya?\"\n" +
      "- \"cek portofolio saya\"\n" +
      "- \"regime pasar sekarang\"\n" +
      "- \"BBCA skornya berapa?\"\n" +
      "- \"beli BBCA 100 lembar\" (akan muncul kartu persetujuan)\n\n" +
      "Toggle mock ini bisa dimatikan di **Settings → AI Agent → Use Dev Mock** setelah API key dikonfigurasi.";
  }

  // Help
  if (/\b(bantu|help|bisa\s*apa|fitur)\b/.test(m)) {
    return "**Quantbit AI Dev Mock** mendukung 4 level testing:\n\n" +
      "1. **Read-only tools**: tanyakan \"berapa BPS?\", \"cek portofolio\", \"regime sekarang\", dll — saya akan panggil tool lalu jelaskan hasilnya\n" +
      "2. **Action API**: \"beli BBCA 100\", \"ganti profile ke BG\", \"sync backtest ke porto\" — kartu persetujuan muncul di chat, klik [Approve] untuk eksekusi\n" +
      "3. **History**: semua chat disimpan di localStorage\n" +
      "4. **Proactive agent**: toggle \"Proactive Alerts\" di Settings, lalu set MKT.ihsg.monthly via DevTools untuk simulasi trigger\n\n" +
      "Untuk full real AI, set **OPENROUTER_API_KEY** di file .env.local lalu disable toggle ini.";
  }

  // Default
  return "**Dev Mock AI** aktif. Saya belum bisa jawab pertanyaan generik, tapi saya bisa:\n" +
    "- Panggil read-only tool: coba \"cek portofolio\", \"berapa BPS?\", \"regime sekarang\"\n" +
    "- Trigger action: coba \"beli BBCA 100\" atau \"ganti profile ke BG\"\n" +
    "- Jelasin panel manapun: klik ikon ❓\n\n" +
    "Untuk keluar dari mode mock dan pakai real AI, set **OPENROUTER_API_KEY** lalu disable \"Use Dev Mock\" di Settings.";
}

/** Pure function: generate a deterministic mock response. */
export function generateMockResponse(
  message: string,
  _ctx?: AILiveContext,
): DevMockResult {
  // Action matcher first (so "sync backtest to portfolio" wins over
  // the "portfolio" read-only regex).
  const toolCall = matchAction(message) || matchReadOnly(message, _ctx);
  const toolCalls: AIToolCall[] = toolCall ? [toolCall] : [];

  const content = toolCall
    ? `*(dev-mock) Saya akan panggil tool \`${toolCall.name}\` untuk menjawab.*`
    : generateTextResponse(message);

  const followups: string[] = [];
  if (!toolCall) {
    const m = message.toLowerCase();
    if (/\b(bps|buy\s*pressure)\b/.test(m)) followups.push("regime pasar sekarang");
    else if (/\b(regime|rekomendasi)\b/.test(m)) followups.push("cek portofolio saya");
    else if (/\b(portofolio|portfolio)\b/.test(m)) followups.push("berapa BPS saya?");
    else if (/halo|hai|hello|hi/.test(m)) followups.push("berapa BPS saya?");
    else followups.push("berapa BPS saya?", "cek portofolio saya");
  }

  return {
    content,
    provider: "dev-mock",
    toolCalls,
    suggestedFollowups: followups,
  };
}
