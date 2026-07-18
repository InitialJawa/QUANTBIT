# Submit URL ke Google Search Console — Panduan Manual

GSC butuh OAuth login, jadi harus submit manual dari browser.

## Langkah 1: Buka GSC
1. Buka https://search.google.com/search-console
2. Login pakai akun Google yang sama dengan yang verifikasi quantbit.pro

## Langkah 2: Submit Sitemap Baru
1. Klik menu **Sitemaps** (sidebar kiri)
2. Di kolom "Add a new sitemap", ketik: `sitemap.xml`
3. Klik **Submit**
4. Status: harusnya "Sukses" dengan 20 URL ditemukan

## Langkah 3: Request Indexing untuk Landing Pages
1. Klik menu **URL Inspection** (sidebar kiri)
2. Ketik URL satu per satu, lalu tekan Enter:

```
https://quantbit.pro/pages/panduan-backtest/
```

3. Klik **Request Indexing**
4. Tunggu selesai (~1-2 menit)
5. Ulangi untuk URL berikut:

```
https://quantbit.pro/pages/screening-saham/
https://quantbit.pro/pages/strategi-dca/
https://quantbit.pro/pages/tentang/
```

## Langkah 4: Cek Coverage
1. Klik menu **Pages** (dulu "Coverage")
2. Pastikan tidak ada error untuk halaman baru
3. Biasanya butuh 1-7 hari untuk Google index semua URL

## Tips
- Submit landing pages dulu (priority 0.9), karena ini yang paling penting untuk SEO
- Jangan spam request — max 12-20 per hari
- Kalau ada error "Submitted URL blocked by robots.txt", cek robots.txt di GSC
- Kalau ada error "Submitted URL returns 404", pastikan deploy sudah sukses
