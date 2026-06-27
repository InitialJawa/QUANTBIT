# Analisis Strategi Profil Investasi — AMAN, AGRESIF, DIVIDEN

**Tanggal:** 2026-06-27
**Auditor:** AI agent

---

## 3 Masalah Konseptual

### 1. AMAN — Growth 45% kontradiktif dengan nama "Aman"

Profil "Aman" mengklaim prioritas Sharpe + drawdown rendah, tapi Growth adalah faktor **tertinggi** (45%). Growth investing inherently berisiko tinggi (high PE, ekspektasi tinggi, volatilitas tinggi).

**Sekarang:** Q30 **G45** V10 M0 D15
**Seharusnya:** Q40+ G10-15 V10 M0 D30-35

Growth 45% tidak cocok untuk profil konservatif.

### 2. DIVIDEN — Quality 15% terlalu rendah

Dividen tidak sustain tanpa Quality. Perusahaan yang bagi dividen harus punya earnings stabil, cash flow sehat, dan debt manageable. Tapi Quality cuma 15% — dividend trap risk tinggi.

**Sekarang:** Q15 **G20** V5 M0 **D60**
**Seharusnya:** Q30-35 G5-10 V0 M0 **D55-60**

Growth 20% juga kontradiktif — perusahaan growth tinggi reinvest earnings, bukan bayar dividen.

### 3. AGRESIF — Quality 20% terlalu rendah

Bahkan untuk profil agresif, 80% bobot di growth+momentum+value tanpa filter quality memadai. Risiko beli saham growth tinggi dengan fundamental buruk.

**Sekarang:** Q20 **G60** V10 **M10** D0
**Saran:** Q30 G45 V5 M20 D0

---

## 3 Masalah Teknis (Logic Bugs)

### 4. Missing factor default 50 merusak selektivitas DIVIDEN

Di `src/engine/ranker.ts:11-15`:
```ts
(ns.dividend ?? 50) * profileWeights.dividend
```

Untuk profil DIVIDEN (D60):
- Saham dividen=0 (tidak bagi dividen) → 50 * 0.60 = **30** poin gratis
- Saham yield 8% (skor ~53) → 53 * 0.60 = **32** poin
- Selisih cuma **2 poin** — faktor dividen praktis tidak berfungsi

**Fix:** Default 0 untuk dividend, atau bedakan default berdasarkan profile.

### 5. ManageProfilesModal tidak normalisasi bobot

User bisa set Quality=100%, Growth=100%, Value=100%, Momentum=100%, Dividend=100% → total 500%. Engine tetap pake raw values tanpa normalisasi. Adaptive weights system pake `adaptiveScale = 1.0 - dividendFixed` — bisa negatif kalau dividend > 100%.

Label "Total bobot otomatis disesuaikan" di line 88 **tidak benar** — tidak ada normalisasi.

### 6. Dividend linear mapping compress range sempit

`src/marketData.ts:274`:
```ts
s.dividend = Math.max(0, Math.min(100, s.dividendYield * (100 / 15)));
```

Yield IDX umumnya 1-8%, skor terkompresi di 7-53. Yield 3% (skor 20) vs 6% (skor 40) cuma beda 20 poin meski yield 2x lipat.

---

## Ringkasan

| Profile | Masalah | Severitas | File |
|---------|---------|-----------|------|
| AMAN | Growth 45% di profil "aman" | 🔴 Konseptual | `src/marketData.ts:168` |
| DIVIDEN | Quality 15% + Growth 20% kontradiktif | 🔴 Konseptual | `src/marketData.ts:170` |
| AGRESIF | Quality 20% terlalu rendah | 🟡 Minor | `src/marketData.ts:169` |
| Semua | Missing factor default 50 | 🔴 Logic Bug | `src/engine/ranker.ts:11-15` |
| Custom | Tidak ada normalisasi bobot | 🟡 Logic Bug | `src/components/ManageProfilesModal.tsx:17` |
| Semua | Dividend linear mapping | 🟡 Minor | `src/marketData.ts:274` |
