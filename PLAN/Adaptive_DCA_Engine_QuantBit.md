# PRD -- Adaptive DCA Engine (QuantBit)

## Overview

Adaptive DCA Engine adalah evolusi dari strategi Dollar Cost Averaging
(DCA). Sistem tidak membeli berdasarkan tanggal, tetapi berdasarkan
kondisi pasar.

## Masalah DCA Tradisional

-   Membeli nominal tetap setiap bulan.
-   Tetap membeli saat pasar mahal.
-   Tidak memanfaatkan crash.
-   Cash tidak digunakan secara strategis.

## Filosofi

**Data menentukan pembelian, bukan kalender.**

Market Mahal -\> Simpan Cash

Market Normal -\> Beli Normal

Market Murah -\> Beli Lebih Banyak

Market Crash -\> Deploy Cash Agresif

## Tujuan

-   Membeli lebih banyak saat peluang terbaik.
-   Menurunkan average cost.
-   Memanfaatkan market panic.
-   Mengoptimalkan cash reserve.

## Buy Pressure Score

  Faktor             Bobot
  ---------------- -------
  Valuation            30%
  Momentum             25%
  Breadth              15%
  Drawdown             20%
  Fear Indicator       10%

## Mapping

     Score Aksi
  -------- ----------------------------
      0-30 Tidak membeli
     30-50 Beli kecil
     50-70 Beli normal
     70-90 Beli agresif
    90-100 Deploy hampir seluruh cash

## Contoh

### Pasar Mahal

Invest 20% Cash 80%

### Koreksi

Invest 40% Cash 60%

### Bear Market

Invest 80% Cash 20%

### Kapitulasi

Deploy hampir seluruh cash.

## Adaptive vs Traditional

  Traditional                   Adaptive
  ----------------------------- ---------------------------
  Berdasarkan tanggal           Berdasarkan data
  Nominal tetap                 Nominal dinamis
  Tidak melihat valuasi         Menggunakan valuasi
  Tidak melihat market regime   Menggunakan market regime
  Tidak melihat breadth         Menggunakan breadth

## Dashboard

BUY PRESSURE

86%

Status: AGGRESSIVE BUY

Deploy: 78%

Cash: 22%

## Backtest

Bandingkan dengan: - Monthly DCA - Quarterly DCA - Lump Sum - Adaptive
DCA

Gunakan metrik: - CAGR - Total Return - Sharpe Ratio - Max Drawdown -
Average Buy Price - Cash Utilization

## Integrasi QuantBit

Market Data → Market Regime → Valuation → Momentum → Breadth → Buy
Pressure → Adaptive DCA → Portfolio

## Roadmap

Phase 1 - Buy Pressure Score - Dashboard - Manual recommendation

Phase 2 - Adaptive simulator - Historical replay

Phase 3 - Full portfolio integration - Automatic cash deployment

## Prinsip

QuantBit membeli berdasarkan probabilitas dan peluang terbaik, bukan
berdasarkan kalender.
