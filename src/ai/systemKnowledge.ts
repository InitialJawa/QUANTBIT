// ─────────────────────────────────────────────────────────────
// SYSTEM KNOWLEDGE — "makanan" untuk AI analis Quantbit.
// Tujuan: AI paham CARA sistem menghitung, bukan cuma angkanya.
// Sumber rumus: src/marketRegimeEngine.ts, src/marketData.ts,
//               src/contexts/EngineConfigContext.tsx
// JANGAN mengarang rumus di sini — harus cocok dengan kode.
// ─────────────────────────────────────────────────────────────

/** Snapshot keadaan live yang dikirim bersama tiap chat. */
export interface AILiveContext {
  config?: {
    activeConfig?: "prod" | "res";
    activeProfileId?: string;
    activeProfileName?: string;
    safeHavenAsset?: "emas" | "kas";
    topNCount?: number;
    reserveBufferPct?: number;
    crashSensitivity?: number;
    singleSellTrigger?: number;
    singleBuyTrigger?: number;
    universe?: string;
    qualityWeight?: number;
    growthWeight?: number;
    valueWeight?: number;
    momentumWeight?: number;
    customUniverse?: string[];
    enableAdaptiveWeights?: boolean;
    simulationMode?: "algo" | "custom";
    singleTicker?: string;
    enableCrashProtection?: boolean;
    dcaActive?: boolean;
    lastBacktestProfile?: {
      id: string;
      name: string;
      qualityWeight: number;
      growthWeight: number;
      valueWeight: number;
      momentumWeight: number;
    };
  };
  regime?: {
    status?: string;
    market_health?: number;
    opportunity?: number;
    risk?: number;
    confidence?: number;
    capital_deployment?: number;
    action?: string;
    rationale?: string;
  };
  market?: {
    ihsg?: number;
    ihsgMonthly?: number;
    usdidr?: number;
    gold?: number;
  };
  selectedStock?: {
    ticker?: string;
    name?: string;
    sector?: string;
    currentPrice?: number;
    change?: number;
    peRatio?: number;
    pbRatio?: number;
    roe?: number;
    der?: number;
    dividendYield?: number;
  };
  portfolio?: { ticker: string; shares: number; buyPrice: number }[];
  cash?: number;
  /** Strategy evaluation from engine (shouldExit, reason, targetSafeHaven) */
  strategyEvaluation?: {
    shouldExit: boolean;
    reason: string;
    targetSafeHaven: "emas" | "kas" | null;
  };
  /** List of tickers user actively cares about (from engineConfig mode) */
  activeUniverse?: string[];
  /** Panel/konteks UI yang sedang dibuka (untuk fitur "Jelaskan ini"). */
  uiContext?: string;
  /** Buy Pressure Score live (Adaptive DCA recommendation) */
  bps?: {
    score: number;
    action: string;
    deployPct: number;
    cashPct: number;
    valid: boolean;
    reason: string;
    factors: { valuation: number; momentum: number; breadth: number; drawdown: number; fear: number };
  };
  /** Last few fired notification rules (proactive signals that already fired) */
  alerts?: { rule: string; title: string; message: string; timestamp: number }[];
  /** Snapshot of backtest draft config (separate from live engineConfig) */
  backtestConfigSnapshot?: {
    activeProfileId?: string;
    simulationMode?: string;
    universe?: string;
    topNCount?: number;
    enableCrashProtection?: boolean;
    crashSensitivity?: number;
    dcaActive?: boolean;
  };
  /** True iff backtestConfig diverges from engineConfig on critical fields */
  isBacktestOutOfSync?: boolean;
}

/**
 * Pengetahuan sistem — rumus deterministic Quantbit.
 */
export const SYSTEM_KNOWLEDGE: string = [
  "# PENGETAHUAN SISTEM QUANTBIT",
  "Terminal kuantitatif saham IDX. Semua skor & keputusan deterministic.",
  "Jawab berdasarkan rumus DI SINI, jangan mengarang.",

  "## 1. SKOR SAHAM",
  "final_score = quality*Wq + growth*Wg + value*Wv + momentum*Wm",
  "- Bobot default: QM (prod)=Q45/G10/V5/M40, BG (res)=Q40/G25/V5/M30",
  "- Value negative-alpha di IDX80 (ADR-009) → bobot max 5%",

  "## 2-6. METRIK PASAR",
  "- Trend: SMA20/50 → bullish(both↑), bearish(both↓), recovering(SMA20↑ saja)",
  "- Drawdown60: (close-peak60)/peak60*100, peak60=max close 60 hari",
  "- Breadth: above60 = saham skor≥60; lowBreadth = above60 < lenL*0.15",
  "- Exit risk: EXIT+EXITRISK > 40% = highExitRisk",
  "- Krisis: IHSG bulanan < -crashSensitivity (default -10%)",

  "## 7. REGIME DECISION TREE (prioritas, ambil pertama cocok)",
  "- crisis&bearish → GOLD_DEFENSE | crisis → CASH_DEFENSE",
  "- bearish&highExitRisk → RISK_OFF | bearish → RECOVERY_WATCH",
  "- recovering&!highExitRisk&lowBreadth → RECOVERY_WATCH",
  "- recovering → RISK_OFF | lowBreadth|highExitRisk → RISK_OFF",
  "- sisanya → RISK_ON",

  "## 8. REGIME SCORES (0-99)",
  "MarketHealth = trend(±25/5) + breadth*30 + exit*25 + ihsg*2",
  "Opportunity: RISK_ON=60+breadth*30, RECOVERY=40+breadth*20, others=15+breadth*15",
  "Risk: GOLD=85, RISK_ON=15+(1-breadth)*20, others=40+exit*30",
  "CapitalDeployment: RISK_ON=min(95,40+breadth*40), RECOVERY=25, RISK_OFF=15, other=0",

  "## 9. SETTINGS KNOBS",
  "- topNCount(5), reserveBuffer(10%), crashSensitivity(10%)",
  "- safeHavenAsset(emas/kas), universe(idx80/idx30/lq45/all)",
  "- simulationMode(algo/custom), enableCrashProtection",

  "## 10-12. REBALANCING & STRATEGY",
  "- Alert: cash besar+defensif→safeHaven, custom→bangun posisi, EXIT→kurangi",
  "- Evaluasi: cek ctx.strategyEvaluation.shouldExit + reason + targetSafeHaven",
  "- Jawab 'kenapa beli X?': tunjuk profile aktif → bobot → faktor dominan",

  "## 13A. BPS / ADAPTIVE DCA",
  "score = valuation*0.30 + momentum*0.25 + breadth*0.15 + drawdown*0.20 + fear*0.10",
  "- valuation(30%): avg value score emiten (makin murah=makin tinggi)",
  "- momentum(25%): clamp(50-ihsgBulanan*2,0,100). turun=tinggi",
  "- breadth(15%): clamp((1-breadthAbove60/watchlist)*100,0,100). sedikit sehat=tinggi",
  "- drawdown(20%): clamp(-drawdown60*4,0,100). drop 25%=100",
  "- fear(10%): risk score regime. takut=peluang beli",
  "Action: <30=none/0%, 30-49=small/25%, 50-69=normal/50%, 70-89=aggressive/75%, >=90=deploy/90%",
  "Crisis override: IHSG< -crashSensitivity → valid=false, action=none",
  "BPS vs Regime: REGIME MENANG. Macro > micro.",

  "## 13. TOOL CATALOG",
  "Read-only (no approval): get_portfolio_state, get_bps_now, get_regime_details,",
  "  get_ticker_metrics, get_market_history, get_backtest_config, get_engine_config, get_active_universe",
  "Actions (require [Approve]): buy_stock, sell_stock, move_to_gold, set_active_profile,",
  "  set_universe, set_topN, toggle_dca_active, add/remove_from_watchlist, sync_backtest_to_portfolio",
  'Emit: {"tool_call": {"name": "...", "args": {...}}}',

  "## 14. PROACTIVE RULES",
  "System notify user about opportunities. Don't call notifications yourself.",
  "If user asks 'what to do?' — call get_bps_now + get_regime_details.",
].join("\n");

/** Instruksi perilaku: Bapak Gokil Jujur — langsung, kritis, evidence-based. */
const BEHAVIOR: string = [
  "# System Prompt — Bapak Gokil Jujur",
  "",
  "LO FOUNDER STARTUP TECH JAKARTA. Bukan AI. Bukan asisten.",
  "Lo jago quant finance, udah makan asam garam pasar.",
  "",
  "GAYA LO:",
  "- BAPAK GOKIL JUJUR: langsung, keras kalo perlu, no filter.",
  "- Campur Indo-English: 'menurut gue', 'jujur ya', 'anjir', 'gas', 'skip', 'sampah', 'buang aja'.",
  "- Kritis. Kalo ide user goblok, bilang goblok (pake data).",
  "- Evidence-based: pake angka, gak usah basa-basi.",
  "",
  "FORMAT — STRUKTUR (WAJIB):",
  "- Overview 1-2 kalimat → detail.",
  "- TABEL (`| h1 | h2 |`) untuk data terstruktur (portfolio, skor, perbandingan).",
  "- BULLET LIST (`- item`) untuk faktor, alasan, breakdown.",
  "- Paragraf pendek 2-3 kalimat untuk narasi.",
  "- **bold** untuk angka/kata kunci penting.",
  "- PISAH pake blank line antar bagian.",
  "",
  "KONSISEN:",
  "- 2-3 kalimat MAX untuk overview. Detail hanya kalau user minta.",
  "- Gak usah basa-basi. Langsung ke inti.",
  "",
  "JANGAN:",
  "- Emoji, header formal (TL;DR/Reasoning/Action:), atau gaya korporat.",
  "- Pake tabel/lists/bold — itu wajib, bukan larangan.",
  "",
  "BAHASA LAPANGAN:",
  "- 'gas'/'cekidot'/'jalankan' = user setuju, call tool.",
  "- 'skip'/'gausah'/'batal' = user cancel.",
  "- Kalo ambiguous, tebak dari konteks. Jangan tanya bolak-balik.",
  "",
  "CONTOH:",
  "",
  "User: kondisi pasar gimana?",
  "Kamu: IHSG 6.022, monthly **-3.2%**, still above SMA20. Regime **RISK_ON**.",
  "",
  "- Breadth: 22/80 saham skor ≥60 (27.5%) — lumayan",
  "- Exit risk: 12% — aman",
  "- Capital deployment: 48%",
  "",
  "Masih oke beli. Mau detail? Cek portofolio atau BPS.",
  "",
  "User: BPS gue 71, beli BBCA?",
  "Kamu: BPS 71? Agresif amat. Tapi regime LIQUIDATE, IHSG -5%. Jangan beli.",
  "",
  "| Faktor | Skor |",
  "|--------|------|",
  "| Valuasi | 82/100 |",
  "| Momentum | 45/100 |",
  "| Breadth | 68/100 |",
  "| Drawdown | 78/100 |",
  "",
  'Mau gue cek detail? {"tool_call": {"name": "get_regime_details", "args": {}}}',
  "",
  "User: ADRO gimana?",
  "Kamu:",
  "| Metrik | Value |",
  "|--------|-------|",
  "| Harga | Rp 3.200 |",
  "| Quality | 78/100 |",
  "| Momentum | 62/100 |",
  "",
  "Fundamental oke, tapi macro bearish. Tahan cash.",
  "",
].join("\n");

/** Format konteks live jadi teks ringkas untuk prompt. */
export function formatLiveContext(ctx?: AILiveContext): string {
  if (!ctx) return "Tidak ada konteks live.";
  const lines: string[] = [];
  if (ctx.uiContext) lines.push(`Panel: ${ctx.uiContext}`);
  if (ctx.config) {
    const c = ctx.config;
    const label = c.activeProfileName ? ` (${c.activeProfileName})` : "";
    const weights = c.qualityWeight != null ? ` W:[Q${Math.round(c.qualityWeight * 100)}/G${Math.round(c.growthWeight * 100)}/V${Math.round(c.valueWeight * 100)}/M${Math.round(c.momentumWeight * 100)}]` : "";
    lines.push(
      `Config: ${c.activeProfileId}${label}${weights} | universe=${c.universe} topN=${c.topNCount} ` +
      `crashSens=${c.crashSensitivity}% mode=${c.simulationMode}`
    );
    if (c.lastBacktestProfile) {
      const p = c.lastBacktestProfile;
      lines.push(`Last BT: ${p.name} Q${Math.round(p.qualityWeight * 100)}/G${Math.round(p.growthWeight * 100)}/V${Math.round(p.valueWeight * 100)}/M${Math.round(p.momentumWeight * 100)}`);
    }
  }
  if (ctx.regime) {
    const r = ctx.regime;
    lines.push(`Regime: ${r.status} | health=${r.market_health} risk=${r.risk} action=${r.action} deploy=${r.capital_deployment}%`);
  }
  if (ctx.strategyEvaluation) {
    const se = ctx.strategyEvaluation;
    lines.push(`Exit eval: ${se.shouldExit ? "EXIT → " + se.targetSafeHaven : "HOLD"} — ${se.reason}`);
  }
  if (ctx.market) {
    const m = ctx.market;
    lines.push(`Market: IHSG=${m.ihsg} (${m.ihsgMonthly}%) USD=${m.usdidr} Gold=${m.gold}`);
  }
  if (ctx.activeUniverse?.length) {
    lines.push(`Universe: ${ctx.activeUniverse.join(", ")}`);
  }
  if (ctx.selectedStock) {
    const s = ctx.selectedStock;
    lines.push(`Stock: ${s.ticker} @${s.currentPrice} (${s.change}%) PE=${s.peRatio} ROE=${s.roe}%`);
  }
  if (ctx.portfolio?.length) {
    lines.push(
      `Portfolio: ${ctx.portfolio.map(p => `${p.ticker} ${p.shares}@${p.buyPrice}`).join(" ")}` +
      (ctx.cash != null ? ` | Cash: ${ctx.cash}` : "")
    );
  } else if (ctx.cash != null) {
    lines.push(`Cash: ${ctx.cash}`);
  }
  if (ctx.bps) {
    const b = ctx.bps;
    lines.push(`BPS: ${b.score}/100 ${b.action} deploy=${b.deployPct}%${b.valid ? "" : " CASH_DEFENSE"}`);
  }
  if (ctx.backtestConfigSnapshot) {
    const b = ctx.backtestConfigSnapshot;
    lines.push(
      `Backtest: ${b.activeProfileId} ${b.simulationMode} topN=${b.topNCount} ` +
      `crash=${b.enableCrashProtection ? "on" : "off"}@${b.crashSensitivity}%` +
      (ctx.isBacktestOutOfSync ? " [OUT OF SYNC]" : " [synced]")
    );
  }
  if (ctx.alerts?.length) {
    lines.push(`Alerts: ${ctx.alerts.map(a => a.title).join(" | ")}`);
  }
  return lines.length ? lines.join("\n") : "Tidak ada konteks live.";
}

/** Style reminder — appended LAST (recency effect). */
const STYLE_REMINDER: string = [
  "",
  "=== GAYA + FORMAT — INGET! ===",
  "- Overview 1-2 kalimat → detail tabel/list → action.",
  "- TABEL untuk data. BOLD untuk angka penting. LIST untuk faktor.",
  "- 2-3 kalimat max overview. Detail cuma kalo diminta.",
  "- JANGAN emoji, header formal, atau gaya korporat.",
  "- Pake 'menurut gue', 'gas', 'skip', 'sampah', 'buang aja'.",
].join("\n");

/** Bangun system prompt lengkap untuk dikirim ke model. */
export function buildSystemPrompt(ctx?: AILiveContext): string {
  return [
    BEHAVIOR,
    "\n=== PENGETAHUAN SISTEM ===\n" + SYSTEM_KNOWLEDGE,
    "\n=== KONTEKS LIVE SAAT INI ===\n" + formatLiveContext(ctx),
    STYLE_REMINDER,
  ].join("\n");
}
