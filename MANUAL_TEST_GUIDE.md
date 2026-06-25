# Quantbit AI — Manual Test Guide

Panduan manual end-to-end untuk menguji fitur **Quantbit AI Depth Upgrade (Levels 1-4)**. Jalankan di dev server dengan API key yang sudah dikonfigurasi.

## Setup

### 1. Backend AI provider (pilih salah satu)

Set di `.env.local` (development) atau Cloudflare Pages dashboard (production):

```bash
# Recommended (free, no geo restriction)
OPENROUTER_API_KEY=sk-or-...      # https://openrouter.ai/keys

# Alternative
GROQ_API_KEY=gsk_...               # https://console.groq.com/keys
GEMINI_API_KEY=AIza...             # https://aistudio.google.com/app/apikey
```

### 2. Start dev servers

```bash
# Cross-platform: runs Express (port 3001) + Vite (port 5173) concurrently
npm run dev

# Or run separately:
npm run serve-api   # terminal 1 — Express on :3001 (baca API key dari .env.local)
npm run dev         # terminal 2 — Vite on :5173 (proxy /api/ai/chat ke :3001)
```

**Vite proxy list** (`vite.config.ts:125-132`):
- `/api/backtest-data` → `http://localhost:3001`
- `/api/yahoo` → `http://localhost:3001`
- `/api/ai/chat` → `http://localhost:3001`

Kalau Vite jalan tanpa `serve-api`, `api.ts:46-58` fallback ke dev mock dengan hint "Backend AI tidak reachable".

### 3. Open browser

```
http://localhost:5173
```

Login dengan akun apa pun (dev mode auto-grants via localStorage `quantbit_session`).

### 4. Verifikasi AI Provider

Buka chat, kirim "halo". Header chat harus menunjukkan provider (mis. `openrouter`, `groq`, `gemini`).

Kalau muncul error, periksa:
- `.env.local` ada API key
- `npm run serve-api` running (kalau pakai Vite saja)
- Provider chain: `OPENROUTER` → `GROQ` → `GEMINI` (lihat `src/server/aiChatHandler.ts:174-209`)

**Atau** aktifkan **Use Dev Mock** di Settings → AI Agent (dev only) untuk testing tanpa API key.

---

## Test Matrix

### Level 1 — Smarter Q&A

#### L1.1 — History persist
1. Open chat (bottom-right cyan button with Bot icon)
2. Send: "halo"
3. Wait for AI response (provider label visible di header: "openrouter" / "groq" / "gemini")
4. **Refresh page** (F5)
5. ✅ History chat masih ada (welcome message + "halo" + AI response)

#### L1.2 — History clear via trash button
1. Open chat
2. Click trash icon (🗑) di header
3. ✅ Messages cleared, kembali ke welcome message saja
4. **Refresh page**
5. ✅ History masih kosong (welcome only)

#### L1.3 — History cap (100)
1. Open browser DevTools → Console
2. Run:
   ```js
   const msgs = Array.from({length: 120}, (_, i) => ({role: i % 2 ? "user" : "assistant", content: `msg ${i}`}));
   localStorage.setItem("quantbit_ai_chat_history", JSON.stringify(msgs));
   ```
3. **Refresh page**
4. ✅ Chat shows last 100 messages only (msg 20 .. msg 119)
5. Verify by opening DevTools → Application → localStorage → `quantbit_ai_chat_history`:
   - ✅ Stored value capped to 100 messages

#### L1.4 — Richer live context (BPS visible to AI)
1. Open Portfolio tab (sidebar)
2. Note the BPS gauge value
3. Open chat, ask: "berapa BPS saya sekarang?"
4. ✅ AI response mentions BPS score, action, deploy percentage
5. ✅ Response uses values that match the BPS dashboard

#### L1.5 — Backtest config visible
1. Open Backtest tab
2. Change a setting (e.g. Top N dari 5 → 8)
3. Open chat, ask: "apa konfigurasi backtest saya sekarang?"
4. ✅ AI response mentions topN=8 (draft config) + note about portfolio (live config)

---

### Level 2 — Read-only Tool Use

#### L2.1 — get_portfolio_state
1. Open chat, ask: "cek portofolio saya"
2. Wait for response
3. ✅ AI response includes summary of positions (ticker, shares, buy price)
4. ✅ Optional: a "📊 get_portfolio_state → ..." tool message appears in chat (Level 2 indicator)

#### L2.2 — get_bps_now
1. Open chat, ask: "berapa BPS?"
2. ✅ AI response includes BPS score, action, deploy %, 5 sub-factors
3. ✅ Reference cross-check: numbers match BPS dashboard di Portfolio tab

#### L2.3 — get_regime_details
1. Open chat, ask: "apa regime pasar sekarang?"
2. ✅ AI response includes status, market_health, risk, opportunity, action
3. ✅ Cross-check: matches regime status di MarketRegimeEngine / sidebar

#### L2.4 — get_ticker_metrics
1. Open chat, ask: "berapa skor BBCA?"
2. ✅ AI response includes current price, PE/PB/ROE, rank, final score
3. ✅ Cross-check: matches BBCA data di Market tab

#### L2.5 — get_market_history
1. Open chat, ask: "tampilkan IHSG 14 hari terakhir"
2. ✅ AI response includes 14-day IHSG summary
3. ✅ Cross-check: matches IHSG chart di Market tab

#### L2.6 — get_backtest_config + get_engine_config
1. Open chat, ask: "apa bedanya config backtest dan config live saya sekarang?"
2. ✅ AI response distinguishes backtest draft vs live engine config
3. ✅ If `isBacktestOutOfSync: true`, AI mentions "OUT OF SYNC"

#### L2.7 — get_active_universe
1. Set simulation mode ke "Custom" (di Sidebar → Mode)
2. Add 2-3 tickers to custom universe
3. Open chat, ask: "saham apa saja di universe custom saya?"
4. ✅ AI response lists the custom tickers
5. Switch back ke "Algo" mode
6. Ask same question
7. ✅ AI responds that algo mode uses full universe (idx80/idx30/lq45)

#### L2.8 — Follow-up AI turn after tool use
1. Open chat, ask: "BBCA harganya berapa?"
2. ✅ Initial response uses tool + shows tool result inline
3. ✅ Follow-up response incorporates tool result (e.g. "BBCA di Rp 5.825, sesuai data live")

---

### Level 3 — Action API + Approval Card

#### L3.1 — Buy stock (Approve)
1. Open chat, ask: "beli BBCA 100 lembar"
2. Wait for response
3. ✅ Approval card appears dengan:
   - Display text: "Beli 100 lembar BBCA @ Rp 5.825"
   - Impact: "Estimasi biaya: Rp 582.500", "Kas tersedia: Rp 100.000.000"
4. Click **[Approve]**
5. ✅ Card shows "✓ Executed"
6. ✅ Portfolio tab now shows 100 BBCA shares
7. ✅ Trade log entry "Pembelian 1 Lot BBCA @ Rp 5.825"

#### L3.2 — Buy stock (Reject)
1. Open chat, ask: "beli BBCA 100"
2. Approval card appears
3. Click **[Reject]**
4. ✅ Card shows "✗ Rejected"
5. ✅ No portfolio change, no trade log

#### L3.3 — Buy with insufficient cash
1. Ask: "beli BBCA 1000000 lembar" (huge quantity)
2. ✅ Approval card shows "⚠ Biaya melebihi kas"
3. Click Approve
4. ✅ Card shows error (handler throws because cash < cost)
5. ✅ No portfolio change

#### L3.4 — Sell stock
1. Pre-condition: sudah punya BBCA di portfolio
2. Open chat, ask: "jual BBCA 50 lembar"
3. ✅ Approval card: "Jual 50 lembar BBCA @ Rp 5.825"
4. ✅ Impact: "Estimasi hasil: Rp 291.250", "Posisi saat ini: 100 lembar"
5. Click [Approve]
6. ✅ Portfolio shows 50 BBCA remaining

#### L3.5 — Move to gold
1. Open chat, ask: "pindahkan 5 juta ke emas"
2. ✅ Card: "Pindahkan Rp 5.000.000 ke Emas (safe haven)"
3. ✅ Impact: "Saldo kas: Rp 100.000.000", "Estimasi gram emas: 3.8462 g"
4. [Approve] → portfolio shows EMAS position

#### L3.6 — Set active profile
1. Open chat, ask: "ganti profile ke BG"
2. ✅ Card: "Ganti profil ke Balanced Growth (BG)"
3. ✅ Impact: "Bobot: Q40 G25 V5 M30"
4. [Approve] → engineConfig.activeProfileId = "res"

#### L3.7 — Set universe
1. Ask: "ubah universe ke idx30"
2. ✅ Card appears, no impact
3. [Approve] → universe filter changes

#### L3.8 — Set Top N
1. Ask: "ubah Top N menjadi 8"
2. ✅ Card appears
3. [Approve] → topNCount = 8

#### L3.9 — Toggle DCA
1. Ask: "nonaktifkan rekomendasi DCA"
2. ✅ Card: "Nonaktifkan rekomendasi DCA"
3. [Approve] → BPS dashboard hidden di Portfolio tab

#### L3.10 — Add to watchlist
1. Ask: "tambah ASII ke watchlist"
2. ✅ Card: "Tambah ASII ke watchlist"
3. [Approve] → watchlist count increments

#### L3.11 — Sync backtest to portfolio
1. Open Backtest tab, change profile to "BG"
2. Open chat, ask: "sync konfigurasi backtest ke portofolio"
3. ✅ Card: "Sync konfigurasi backtest ke portofolio"
4. ✅ Impact: "Profil backtest: Balanced Growth (BG)"
5. [Approve] → engineConfig.activeProfileId becomes "res" (matches backtest)

---

### Level 4 — Proactive Agent

#### L4.1 — BPS aggressive (70-89)
1. Open DevTools console
2. Set BPS score to 75:
   ```js
   // The BPS gauge reads from useBuyPressure which uses MKT.ihsg.monthly + drawdown.
   // We can simulate by adjusting MKT:
   import("/workspaces/QUANTBIT/src/marketData.ts").then(m => {
     m.MKT.ihsg.monthly = -12;  // momentum cukup bearish
   });
   // Then trigger a re-render
   ```
3. Wait ≤ 5 min
4. ✅ Toast notification appears: "Peluang beli agresif — BPS 75/100, action: aggressive"

#### L4.2 — BPS deploy (>= 90)
1. Set `MKT.ihsg.monthly = -25` (severe bearish)
2. Wait ≤ 5 min
3. ✅ Toast: "Sinyal capitulasi terdeteksi — BPS 95/100"

#### L4.3 — BPS low (< 30)
1. Set `MKT.ihsg.monthly = +15`
2. Wait
3. ✅ Toast: "BPS rendah — tidak ada peluang beli"

#### L4.4 — DCA off + high BPS
1. Set `MKT.ihsg.monthly = -20` (BPS will be high)
2. Set `engineConfig.dcaActive = false` (via sidebar)
3. Wait
4. ✅ Toast: "BPS tinggi tapi DCA nonaktif"

#### L4.5 — Crisis override
1. Set `engineConfig.enableCrashProtection = true`
2. Set `MKT.ihsg.monthly = -15` (triggers isCrisisMode)
3. Wait
4. ✅ Toast: "CASH DEFENSE — pasar dalam krisis"

#### L4.6 — IHSG drop
1. Set `MKT.ihsg.monthly = -12` (beyond default sensitivity 10)
2. Wait
3. ✅ Toast: "IHSG turun -12.0% (bulanan)"

#### L4.7 — Cooldown (5 min)
1. Trigger any notification (e.g. L4.1)
2. Within 5 min, trigger same rule again
3. ✅ Second notification suppressed
4. Wait 5+ min, trigger again
5. ✅ Notification fires

#### L4.8 — Toggle OFF
1. Open Settings (gear icon di header)
2. Toggle "AI Agent → Proactive Alerts" ke OFF
3. Set `MKT.ihsg.monthly = -15`
4. ✅ NO notification fires
5. Toggle back ON
6. Set `MKT.ihsg.monthly = -20`
7. ✅ Notification fires again

#### L4.9 — Chat button badge
1. Trigger a notification (e.g. set `MKT.ihsg.monthly = -20`)
2. Close chat (X button)
3. ✅ Bell badge (amber) appears di chat button + unread counter incremented

---

## Test Harness (Dev Only)

A `AITestHarness` component tersedia di `src/components/AITestHarness.tsx`. Untuk enable di dev:

```tsx
// Di App.tsx, sementara:
import { AITestHarness } from "./components/AITestHarness";
{import.meta.env.DEV && <AITestHarness />}
```

Component ini punya 4 panel:
- **Tools**: Trigger 8 read-only tool calls, lihat raw output
- **Actions**: Trigger 10 action calls, lihat pending card + impact preview
- **Cooldown**: Override 5-min cooldown (testing only), lihat fired log
- **History**: Inspect localStorage state, force-clear

Lihat file untuk instruksi lengkap.

---

## Common Issues

### "Provider: none" di header chat
- Tidak ada API key yang dikonfigurasi
- Set di `.env.local` (dev) atau Cloudflare dashboard (prod)

### Tool call tidak muncul di response
- Model mungkin tidak emit JSON block format
- Coba prompt yang lebih eksplisit: "panggil get_bps_now" atau "tolong baca BPS"
- OpenRouter/Gemini Flash biasanya reliable

### Approval card tidak muncul
- Pastikan message model mengandung `{"tool_call": {"name": "buy_stock", ...}}`
- Inspect di DevTools → Network → `/api/ai/chat` response → check `content` field
- Verify action name ada di `ACTION_TOOLS` set

### History tidak persist
- Check localStorage di DevTools → Application → Local Storage
- Key: `quantbit_ai_chat_history`
- Cap: 100 messages

### Proactive notification spam
- 5-min cooldown per rule di-hardcode
- Set `proactiveAIEnabled = false` di Settings untuk disable

---

## Reporting Bugs

Buka issue di GitHub dengan:
1. Repro steps (which test case failed)
2. Expected vs actual
3. Screenshot / screen recording
4. Browser console errors (jika ada)
5. Network tab response (jika tool/AI call)
