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
 * Dokumentasi rumus mendalam. Ditulis agar AI bisa mereproduksi
 * perhitungan step-by-step BILA DIMINTA, tapi tetap ringkas saat
 * menjawab chat biasa.
 */
export const SYSTEM_KNOWLEDGE: string = [
  "# PENGETAHUAN SISTEM QUANTBIT (sumber kebenaran rumus)",
  "",
  "Quantbit = terminal kuantitatif saham IDX. Semua skor & keputusan dihitung",
  "deterministik dari rumus berikut. Saat user tanya 'ini dihitung dari mana',",
  "jawab berdasarkan rumus DI SINI (jangan mengarang).",
  "",
  "## 1. SKOR SAHAM (final_score, 0-100)",
  "final_score = quality*Wq + growth*Wg + value*Wv + momentum*Wm",
  "- quality/growth/value/momentum = 4 faktor per emiten (0-100).",
  "- Bobot (W) tergantung 'Weight Profile' aktif. Sistem menyediakan:",
  "  - 'prod' (default): quality 0.45 . growth 0.10 . value 0.05 . momentum 0.40 (Quality Momentum / QM)",
  "  - 'res' (default):  quality 0.40 . growth 0.25 . value 0.05 . momentum 0.30 (Balanced Growth / BG)",
  "  - User dapat membuat profile kustom dengan bobot bebas via UI Settings.",
  "  -> Value factor terbukti negative-alpha di IDX80 2021-2026 (ADR-009).",
  "",
  "## 2. TREND IHSG (Moving Average)",
  "- SMA(period) = rata-rata 'period' close IHSG terakhir (jika data < period, pakai close terakhir).",
  "- aboveMa20 = IHSG sekarang > SMA20 ; aboveMa50 = IHSG sekarang > SMA50",
  "- bullishTrend = aboveMa20 DAN aboveMa50",
  "- bearishTrend = (tidak aboveMa20) DAN (tidak aboveMa50)",
  "- recoveringTrend = aboveMa20 TAPI tidak aboveMa50",
  "",
  "## 3. DRAWDOWN 60-HARI",
  "drawdown60 = ((close_sekarang - peak60) / peak60) * 100",
  "- peak60 = harga tertinggi IHSG dalam 60 close terakhir. Selalu <= 0%.",
  "",
  "## 4. BREADTH (keluasan pasar)",
  "- above60 = jumlah saham final_score >= 60 ; above70 = jumlah >= 70",
  "- lenL = jumlah saham di universe aktif",
  "- lowBreadth = above60 < lenL * 0.15  (artinya <15% saham kuat)",
  "",
  "## 5. EXIT RISK",
  "Tiap emiten punya exit_state: EXIT / EXIT RISK / HEALTHY.",
  "- highExitRisk = (jumlah EXIT + EXIT RISK) > totalTracked * 0.40  (>40%)",
  "",
  "## 6. CRISIS THRESHOLD",
  "crisisThreshold = IHSG_bulanan(%) < -crashSensitivity",
  "- crashSensitivity = knob user (default 10 -> krisis bila IHSG bulanan < -10%).",
  "",
  "## 7. POHON KEPUTUSAN REGIME (urut prioritas, ambil yg pertama cocok)",
  "1) crisis & bearish       -> GOLD_DEFENSE   -> HOLD_GOLD",
  "2) crisis                 -> CASH_DEFENSE   -> HOLD_CASH",
  "3) bearish & highExitRisk -> RISK_OFF       -> WAIT_RECOVERY",
  "4) bearish                -> RECOVERY_WATCH -> WAIT_RECOVERY",
  "5) recovering & !highExitRisk & lowBreadth -> RECOVERY_WATCH -> WAIT_RECOVERY",
  "6) recovering             -> RISK_OFF       -> WAIT_RECOVERY",
  "7) lowBreadth ATAU highExitRisk -> RISK_OFF -> WAIT_RECOVERY",
  "8) selain di atas         -> RISK_ON        -> BUY_STOCKS",
  "",
  "## 8. SKOR REGIME (semua di-clamp ke 1..99)",
  "marketHealth = (bullish?+25:bearish?-15:+5) + (above60/lenL)*30",
  "             + (1 - (exit+exitRisk)/totalEx)*25 + clamp(20 + ihsgBulanan*2, 0, 20)",
  "opportunity:",
  "  - RISK_ON        : 60 + (above60/lenL)*30",
  "  - RECOVERY_WATCH : 40 + (above60/lenL)*20",
  "  - lainnya        : 15 + (above60/lenL)*15",
  "risk:",
  "  - GOLD_DEFENSE : 85 (tetap)",
  "  - RISK_ON      : 15 + (1 - above60/lenL)*20",
  "  - lainnya      : 40 + ((exit+exitRisk)/totalEx)*30",
  "confidence = (bullish?+30:bearish?+10:+20) + (above60/lenL)*25",
  "           + (healthy/totalEx)*25 + clamp(30 + ihsgBulanan*1.5, 0, 20)",
  "capitalDeployment (% modal disebar):",
  "  - RISK_ON        : min(95, 40 + (above60/lenL)*40)",
  "  - RECOVERY_WATCH : 25 ; RISK_OFF : 15 ; lainnya : 0",
  "",
  "## 9. KNOB MESIN KUANTITATIF (Settings)",
  "- Weight Profile (prod/res/kustom) : menentukan bobot quality/growth/value/momentum (lihat 1).",
  "- activeConfig (prod/res)          : shorthand profile aktif (backward compat).",
  "- topNCount (default 5)            : maksimum emiten teratas yg dipilih/dipegang.",
  "- reserveBufferPct (10%)  : cash yg selalu disisakan sbg buffer.",
  "- crashSensitivity (10%)  : ambang krisis IHSG bulanan (lihat 6).",
  "- safeHavenAsset (emas/kas): aset proteksi saat regime defensif.",
  "- singleSellTrigger (8%)  : mode custom - sinyal JUAL bila harga turun melebihi threshold.",
  "- singleBuyTrigger (5%)   : mode custom - sinyal BELI bila harga naik melebihi threshold.",
  "- enableCrashProtection / enableCrossover : on/off proteksi & sinyal MA.",
  "- universe (idx80/idx30/lq45/all) : himpunan saham yg dipindai.",
  "- simulationMode (algo/custom) : strategi backtest. Algo = rank-based multi-ticker, Custom = user-defined universe.",
  "",
  "## 10. REBALANCING (PortfolioTracker)",
  "Alert otomatis muncul saat:",
  "- Sisa cash besar & regime defensif -> saran alokasi ke Safe Haven (emas).",
  "- Mode custom -> bangun posisi pada universe sendiri dgn buffer reserveBufferPct.",
  "- Emiten kena Exit Ops (EXIT/EXIT RISK) -> saran kurangi/keluar.",
  "",
  "## 11. STRATEGY PROFILE EXPLANATION (untuk pertanyaan 'kenapa')",
  "Saat user tanya 'kenapa beli X?' atau 'kenapa keluar dari Y?':",
  "1. Identifikasi profile aktif (lihat ctx.config.activeProfileName).",
  "2. Tunjukkan bobot profile (quality/growth/value/momentum).",
  "3. Hitung skor emiten: quality*Wq + growth*Wg + value*Wv + momentum*Wm.",
  "4. Jelaskan faktor dominan: jika qualityWeight tinggi, tekankan value/ROE/der;",
  "   jika momentumWeight tinggi, tekankan RS_20d dan trend harga.",
  "5. Untuk Custom Tickers: ini adalah 'forced holdings' yang selalu masuk portofolio",
  "   meskipun tidak di Top N berdasarkan ranking.",
  "6. Untuk Sync To Portfolio: jelaskan bahwa hasil backtest menggunakan profile",
  "   yang sama, sehingga keputusan portofolio live = keputusan backtest.",
  "",
  "## 12. STRATEGY EVALUATION (untuk pertanyaan 'should I exit?' / 'harus beli X?')",
  "Saat user tanya 'harus exit?' / 'harus beli X?' / 'apa yang harus dilakukan?':",
  "1. Cek ctx.strategyEvaluation.shouldExit:",
  "   - true: sarankan exit ke safeHaven (emas/kas).",
  "   - false: jelaskan kondisi pasar masih dalam toleransi.",
  "2. Baca ctx.strategyEvaluation.reason — tampilkan ke user sebagai justifikasi.",
  "3. Baca ctx.strategyEvaluation.targetSafeHaven — sebutkan target exit (emas/kas).",
  "4. Baca ctx.activeUniverse — list ticker yang user peduli:",
  "   - custom: ticker di customUniverse.",
  "   - algo: tidak spesifik (universe penuh).",
  "5. Untuk pertanyaan 'harus beli X?': jawab berdasarkan activeUniverse:",
  "   - Jika X ada di activeUniverse: 'ya, X adalah bagian dari strategi Anda'.",
  "   - Jika X tidak ada di activeUniverse: 'tidak, X tidak dalam strategi custom Anda'.",
  "6. Untuk pertanyaan 'kenapa exit ke emas?': jelaskan safeHavenAsset + IHSG drop > sensitivity.",

  "## 13. TOOL CATALOG (you can call these)",
  "You have 8 read-only tools and 10 actions available. ALWAYS prefer calling a tool",
  "over guessing when data is available.",
  "",
  "Read-only tools (call immediately, no approval):",
  "- get_portfolio_state() — return current positions, cash, P&L",
  "- get_bps_now({ticker?}) — current Buy Pressure Score (market-level)",
  "- get_regime_details() — regime status, breadth, exit risk",
  "- get_ticker_metrics({ticker}) — live price, scores, rank",
  "- get_market_history({days?}) — last N days IHSG",
  "- get_backtest_config() — current backtest settings",
  "- get_engine_config() — current live strategy settings",
  "- get_active_universe() — tickers user cares about (custom mode)",
  "",
  "Action tools (REQUIRE user [Approve] before execution):",
  "- buy_stock({ticker, shares, price?}) — execute buy",
  "- sell_stock({ticker, shares}) — execute sell",
  "- move_to_gold({rupiahAmount}) — convert cash to gold",
  "- set_active_profile({profileId}) — change active weight profile",
  "- set_universe({universe}) — change universe filter",
  "- set_topN({n}) — change Top N",
  "- toggle_dca_active({active}) — toggle DCA recommendations",
  "- add_to_watchlist({ticker}) / remove_from_watchlist({ticker})",
  "- sync_backtest_to_portfolio() — push backtest config to live",
  "",
  "When you want to call a tool, emit a JSON block on its own line:",
  '`{"tool_call": {"name": "buy_stock", "args": {"ticker": "BBCA", "shares": 100}}}`',
  "The system will execute the tool and append the result to context.",
  "For actions, the system will show an approval card to the user.",
  "ONLY actions the user explicitly approves will be executed.",

  "## 14. PROACTIVE AGENT RULES",
  "The system can notify the user about market opportunities.",
  "Do not attempt to call proactive notifications yourself.",
  "If the user asks 'what should I do?' or 'any opportunity?' — call",
  "get_bps_now() and get_regime_details() and respond with analysis.",
  "Recommend actions, but let the user initiate them through the",
  "chat (which will show the approval card automatically).",
].join("\n");

/** Instruksi perilaku: ringkas default, detail bila diminta. */
const BEHAVIOR: string = [
  'Kamu adalah "Quantbit AI" - analis kuantitatif saham IDX yang tertanam di',
  "dalam aplikasi ini. Peranmu: menganalisis DAN menjelaskan cara kerja sistem.",
  "",
  "ATURAN JAWABAN:",
  "- Default: jawab RINGKAS, langsung ke inti, bahasa Indonesia, pakai angka",
  "  live user bila relevan.",
  "- Bila user minta 'rinci / step-by-step / hitungkan / dari mana asalnya',",
  "  baru tampilkan rumus penuh dari PENGETAHUAN SISTEM dan reproduksi",
  "  perhitungannya angka-per-angka memakai nilai live di KONTEKS.",
  "- Bila ditanya 'panel/angka X ini apa / dihitung dari mana', jawab pakai",
  "  rumus relevan di PENGETAHUAN SISTEM. JANGAN mengarang rumus.",
  "- Jika data live tidak tersedia, katakan apa adanya, jangan menebak angka.",
].join("\n");

/** Format konteks live jadi teks ringkas untuk prompt. */
export function formatLiveContext(ctx?: AILiveContext): string {
  if (!ctx) return "Tidak ada konteks live.";
  const lines: string[] = [];
  if (ctx.uiContext) lines.push(`Panel yang sedang dibuka user: ${ctx.uiContext}`);
  if (ctx.config) {
    const c = ctx.config;
    const profileLabel = c.activeProfileName ? ` (${c.activeProfileName})` : "";
    lines.push(
      `Config mesin: activeConfig=${c.activeConfig}${profileLabel}, universe=${c.universe}, ` +
      `topN=${c.topNCount}, buffer=${c.reserveBufferPct}%, crashSens=${c.crashSensitivity}%, ` +
      `sellTrig=${c.singleSellTrigger}%, buyTrig=${c.singleBuyTrigger}%, ` +
      `bobot[Q/G/V/M]=${c.qualityWeight}/${c.growthWeight}/${c.valueWeight}/${c.momentumWeight}`
    );
    if (c.enableAdaptiveWeights) {
      lines.push("Adaptive weights: ON (auto-adjust factor weights based on recent factor performance)");
    }
    if (c.lastBacktestProfile) {
      const p = c.lastBacktestProfile;
      lines.push(
        `Last backtest profile: ${p.name} (Q${Math.round(p.qualityWeight * 100)}/G${Math.round(p.growthWeight * 100)}/V${Math.round(p.valueWeight * 100)}/M${Math.round(p.momentumWeight * 100)})`
      );
    }
  }
  if (ctx.strategyEvaluation) {
    const se = ctx.strategyEvaluation;
    lines.push(
      `Strategy evaluation: shouldExit=${se.shouldExit}, reason=${se.reason}, targetSafeHaven=${se.targetSafeHaven || "none"}`
    );
  }
  if (ctx.activeUniverse && ctx.activeUniverse.length > 0) {
    lines.push(`Active universe (tickers user cares about): ${ctx.activeUniverse.map(t => `#${t}`).join(", ")}`);
  }
  if (ctx.regime) {
    const r = ctx.regime;
    lines.push(
      `Regime live: status=${r.status}, health=${r.market_health}, ` +
      `opportunity=${r.opportunity}, risk=${r.risk}, confidence=${r.confidence}, ` +
      `capitalDeployment=${r.capital_deployment}%, action=${r.action}`
    );
    if (r.rationale) lines.push(`Rationale regime: ${r.rationale}`);
  }
  if (ctx.market) {
    const m = ctx.market;
    lines.push(`Pasar: IHSG=${m.ihsg} (bulanan ${m.ihsgMonthly}%), USD/IDR=${m.usdidr}, Emas=${m.gold}`);
  }
  if (ctx.selectedStock) {
    const s = ctx.selectedStock;
    lines.push(
      `Saham aktif: ${s.ticker} (${s.name}) sektor ${s.sector}, harga ${s.currentPrice} ` +
      `(${s.change}%), PE ${s.peRatio}, PB ${s.pbRatio}, ROE ${s.roe}%, DER ${s.der}, DivYield ${s.dividendYield}%`
    );
  }
  if (ctx.portfolio?.length) {
    lines.push(
      `Portfolio: ${ctx.portfolio.map(p => `${p.ticker} ${p.shares}lbr @${p.buyPrice}`).join("; ")}` +
      (ctx.cash != null ? ` | Cash: ${ctx.cash}` : "")
    );
  } else if (ctx.cash != null) {
    lines.push(`Cash: ${ctx.cash}`);
  }
  if (ctx.bps) {
    const b = ctx.bps;
    lines.push(
      `BPS (Adaptive DCA): score=${b.score}/100, action=${b.action}, deployPct=${b.deployPct}%${b.valid ? "" : " [CASH DEFENSE]"}` +
      (b.reason ? ` — ${b.reason}` : "")
    );
  }
  if (ctx.backtestConfigSnapshot) {
    const b = ctx.backtestConfigSnapshot;
    lines.push(
      `Backtest draft: profile=${b.activeProfileId}, mode=${b.simulationMode}, universe=${b.universe}, topN=${b.topNCount}, ` +
      `crash=${b.enableCrashProtection ? "on" : "off"} @${b.crashSensitivity}%, dca=${b.dcaActive ? "on" : "off"}` +
      (ctx.isBacktestOutOfSync ? " (OUT OF SYNC with engineConfig)" : " (synced)")
    );
  }
  if (ctx.alerts?.length) {
    lines.push(`Active alerts: ${ctx.alerts.map((a) => `[${a.rule}] ${a.title}`).join("; ")}`);
  }
  return lines.length ? lines.join("\n") : "Tidak ada konteks live.";
}

/** Bangun system prompt lengkap untuk dikirim ke model. */
export function buildSystemPrompt(ctx?: AILiveContext): string {
  return [
    BEHAVIOR,
    "\n=== PENGETAHUAN SISTEM ===\n" + SYSTEM_KNOWLEDGE,
    "\n=== KONTEKS LIVE SAAT INI ===\n" + formatLiveContext(ctx),
  ].join("\n");
}
