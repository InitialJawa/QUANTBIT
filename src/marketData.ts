// marketData.ts
// Ported from target_data.js to provide real, robust, production-level IDX metrics

import { setDividendCache } from "./engine/dividendCache.ts";
import snapshots from "./data/dividend_snapshots.json";

export interface LeaderStock {
  rank: string;
  ticker: string;
  quality: string;
  growth: string;
  value: string;
  momentum: string;
  dividend: string;
  final_score: string;
}

export interface ProfileDetails {
  name: string;
  sector: string;
  industry: string;
  summary: string;
}

export interface FundamentalDetails {
  roe: number | null;
  net_margin: number | null;
  operating_margin: number | null;
  debt_to_equity: number | null;
  free_cash_flow: number | null;
  pe_ratio: number | null;
  pb_ratio: number | null;
  dividend_yield: number | null;
  roa: number | null;
  market_cap: number | null;
  revenue_growth: number | null;
  earnings_growth: number | null;
}

export const L: LeaderStock[] = [{"rank":"1","ticker":"ADRO.JK","quality":"53.77","growth":"86.21","value":"62.07","momentum":"92.97","dividend":"50","final_score":"78.05"},{"rank":"2","ticker":"ESSA.JK","quality":"64.65","growth":"96.55","value":"26.9","momentum":"81.14","dividend":"50","final_score":"76.22"},{"rank":"3","ticker":"PTBA.JK","quality":"49.96","growth":"93.1","value":"55.86","momentum":"81.98","dividend":"50","final_score":"74.7"},{"rank":"4","ticker":"MAPI.JK","quality":"44.85","growth":"72.41","value":"26.55","momentum":"87.46","dividend":"50","final_score":"66.2"},{"rank":"5","ticker":"BMRI.JK","quality":"77.59","growth":"68.97","value":"77.58","momentum":"52.06","dividend":"50","final_score":"66.07"},{"rank":"6","ticker":"CPIN.JK","quality":"63.88","growth":"82.76","value":"47.59","momentum":"53.61","dividend":"50","final_score":"64.32"},{"rank":"7","ticker":"PGAS.JK","quality":"35.81","growth":"75.86","value":"52.07","momentum":"74.81","dividend":"50","final_score":"63.1"},{"rank":"8","ticker":"ANTM.JK","quality":"50.62","growth":"79.31","value":"38.97","momentum":"62.28","dividend":"50","final_score":"62.14"},{"rank":"9","ticker":"AKRA.JK","quality":"49.14","growth":"65.52","value":"34.83","momentum":"70.14","dividend":"50","final_score":"59.97"},{"rank":"10","ticker":"BBRI.JK","quality":"71.21","growth":"62.07","value":"75.86","momentum":"41.84","dividend":"50","final_score":"58.65"},{"rank":"11","ticker":"BRPT.JK","quality":"41.83","growth":"100.0","value":"9.48","momentum":"49.26","dividend":"50","final_score":"58.65"},{"rank":"12","ticker":"BBNI.JK","quality":"53.96","growth":"55.17","value":"83.45","momentum":"55.21","dividend":"50","final_score":"57.71"},{"rank":"13","ticker":"INDF.JK","quality":"50.49","growth":"58.62","value":"74.83","momentum":"55.98","dividend":"50","final_score":"57.28"},{"rank":"14","ticker":"EXCL.JK","quality":"18.62","growth":"34.48","value":"66.55","momentum":"85.0","dividend":"50","final_score":"51.4"},{"rank":"15","ticker":"INTP.JK","quality":"47.44","growth":"48.28","value":"86.21","momentum":"39.3","dividend":"50","final_score":"48.72"},{"rank":"16","ticker":"MDKA.JK","quality":"12.34","growth":"34.48","value":"40.17","momentum":"87.43","dividend":"50","final_score":"48.05"},{"rank":"17","ticker":"ITMG.JK","quality":"45.77","growth":"13.79","value":"57.24","momentum":"72.51","dividend":"50","final_score":"46.68"},{"rank":"18","ticker":"ASII.JK","quality":"53.52","growth":"17.24","value":"77.59","momentum":"55.78","dividend":"50","final_score":"45.83"},{"rank":"19","ticker":"BBCA.JK","quality":"80.35","growth":"44.83","value":"30.34","momentum":"18.94","dividend":"50","final_score":"43.2"},{"rank":"20","ticker":"TLKM.JK","quality":"62.2","growth":"6.9","value":"28.96","momentum":"64.46","dividend":"50","final_score":"43.08"},{"rank":"21","ticker":"SMGR.JK","quality":"31.59","growth":"89.66","value":"38.28","momentum":"11.01","dividend":"50","final_score":"42.48"},{"rank":"22","ticker":"MIKA.JK","quality":"73.92","growth":"51.72","value":"17.93","momentum":"11.83","dividend":"50","final_score":"39.93"},{"rank":"23","ticker":"UNTR.JK","quality":"50.34","growth":"0.0","value":"61.38","momentum":"58.2","dividend":"50","final_score":"39.09"},{"rank":"24","ticker":"ICBP.JK","quality":"59.0","growth":"24.14","value":"48.96","momentum":"33.97","dividend":"50","final_score":"38.78"},{"rank":"25","ticker":"SIDO.JK","quality":"82.3","growth":"3.45","value":"37.24","momentum":"31.45","dividend":"50","final_score":"36.34"},{"rank":"26","ticker":"GOTO.JK","quality":"16.44","growth":"34.48","value":"51.55","momentum":"34.66","dividend":"50","final_score":"31.74"},{"rank":"27","ticker":"KLBF.JK","quality":"62.6","growth":"20.69","value":"45.86","momentum":"10.26","dividend":"50","final_score":"30.03"},{"rank":"28","ticker":"TPIA.JK","quality":"50.22","growth":"34.48","value":"54.48","momentum":"0.78","dividend":"50","final_score":"28.62"},{"rank":"29","ticker":"AMMN.JK","quality":"41.71","growth":"34.48","value":"9.48","momentum":"3.14","dividend":"50","final_score":"22.82"},{"rank":"30","ticker":"HEAL.JK","quality":"19.05","growth":"10.34","value":"14.83","momentum":"14.2","dividend":"50","final_score":"14.32"}];




export const PF: Record<string, ProfileDetails> = {"ADRO":{"name":"Adaro Energy Indonesia","sector":"Energy","industry":"Coal Mining","summary":"Perusahaan tambang batu bara terbesar di Indonesia. Memproduksi batu bara termal untuk pasar domestik dan ekspor."},"AKRA":{"name":"AKR Corporindo","sector":"Trading","industry":"Chemical Distribution","summary":"Mendistribusikan bahan bakar, bahan kimia, dan barang industri di seluruh Indonesia. Juga mengembangkan kawasan industri."},"AMMN":{"name":"Amman Mineral Internasional","sector":"Mining","industry":"Copper & Gold","summary":"Mengoperasikan tambang tembaga dan emas Batu Hijau di Sumbawa Barat. Salah satu produsen tembaga terbesar di Indonesia."},"ANTM":{"name":"Aneka Tambang","sector":"Mining","industry":"Diversified Metals","summary":"Perusahaan tambang milik negara yang memproduksi emas, nikel, dan bauksit. Mengoperasikan tambang emas Pongkor."},"ASII":{"name":"Astra International","sector":"Conglomerate","industry":"Automotive & Diversified","summary":"Konglomerat terbesar di Indonesia. Mendominasi otomotif (Toyota/Daihatsu/Honda), alat berat, dan jasa keuangan."},"BBCA":{"name":"Bank Central Asia","sector":"Banking","industry":"Private Banking","summary":"Bank swasta terbesar di Indonesia berdasarkan kapitalisasi pasar. Dikenal dengan perbankan ritel, inovasi digital, dan kualitas kredit yang kuat."},"BBNI":{"name":"Bank Negara Indonesia","sector":"Banking","industry":"State-Owned Banking","summary":"Bank milik negara yang fokus pada perbankan korporasi dan internasional. Kuat dalam trade finance dan treasury."},"BBRI":{"name":"Bank Rakyat Indonesia","sector":"Banking","industry":"Microfinance & Retail","summary":"Bank terbesar di Indonesia berdasarkan aset. Mendominasi sektor mikro melalui 7.000+ BRI Unit di seluruh Nusantara."},"BMRI":{"name":"Bank Mandiri","sector":"Banking","industry":"State-Owned Banking","summary":"Bank milik negara terbesar berdasarkan aset. Kuat dalam perbankan korporasi, treasury, dan transaksi wholesale."},"BRPT":{"name":"Barito Pacific","sector":"Petrochemical","industry":"Petrochemical & Plantation","summary":"Produsen petrokimia utama melalui anak usaha Chandra Asri. Juga memiliki kepentingan di perkebunan dan properti."},"CPIN":{"name":"Charoen Pokphand Indonesia","sector":"Agriculture","industry":"Animal Feed & Poultry","summary":"Produsen pakan ternak dan ayam broiler terbesar di Indonesia. Bisnisnya terintegrasi dari pabrik pakan, pembibitan, hingga daging ayam olahan. Didirikan tahun 1972 dan merupakan bagian dari Charoen Pokphand Group Thailand. Terdaftar di Bursa Efek Indonesia sejak 1991."},"ESSA":{"name":"Essa Industries Indonesia","sector":"Energy","industry":"Natural Gas Processing","summary":"Mengoperasikan pabrik pemrosesan gas alam di Jawa Barat. Memproduksi LPG dan kondensat dari gas alam."},"EXCL":{"name":"XL Axiata","sector":"Telecommunication","industry":"Mobile Telecom","summary":"Operator jaringan seluler besar. Bagian dari Axiata Group Malaysia. Kuat dalam layanan data dan digital."},"GOTO":{"name":"GoTo Gojek Tokopedia","sector":"Technology","industry":"Digital Platform","summary":"Platform digital terbesar di Indonesia. Menggabungkan layanan on-demand (Gojek) dan e-commerce (Tokopedia) dengan jasa keuangan."},"HEAL":{"name":"Medikaloka Hermina","sector":"Healthcare","industry":"Hospital Management","summary":"Mengoperasikan 40+ rumah sakit di seluruh Indonesia dengan merek Hermina. Jaringan rumah sakit swasta terbesar berdasarkan pendapatan."},"ICBP":{"name":"Indofood CBP Sukses Makmur","sector":"Consumer Goods","industry":"Packaged Food","summary":"Divisi barang konsumsi kemasan dari Indofood. Memproduksi mi instan (Indomie), susu, camilan, dan minuman."},"INDF":{"name":"Indofood Sukses Makmur","sector":"Consumer Goods","industry":"Food & Agribusiness","summary":"Perusahaan makanan terbesar di Indonesia. Memproduksi mi instan Indomie, memiliki perkebunan (Bogasari), dan operasi CPO."},"INTP":{"name":"Indocement Tunggal Prakarsa","sector":"Material","industry":"Cement","summary":"Produsen semen terbesar kedua di Indonesia. Bagian dari HeidelbergCement Group. Mengoperasikan 13 pabrik semen."},"ITMG":{"name":"Indo Tambangraya Megah","sector":"Energy","industry":"Coal Mining","summary":"Perusahaan tambang batu bara dengan operasi di Kalimantan. Memproduksi batu bara termal untuk pasar ekspor."},"KLBF":{"name":"Kalbe Farma","sector":"Healthcare","industry":"Pharmaceutical","summary":"Perusahaan farmasi terbesar di Indonesia berdasarkan pendapatan. Memproduksi obat resep, kesehatan konsumen, dan nutrisi."},"MAPI":{"name":"Mitra Adiperkasa","sector":"Retail","industry":"Lifestyle Retail","summary":"Peritel gaya hidup terbesar di Indonesia. Mengoperasikan Sports Station, Sogo, Starbucks, Zara, dan 3.000+ gerai ritel."},"MDKA":{"name":"Merdeka Copper Gold","sector":"Mining","industry":"Gold & Copper","summary":"Perusahaan tambang yang berkembang pesat dengan operasi emas, tembaga, dan nikel. Memiliki tambang emas Tujuh Bukit dan proyek nikel."},"MIKA":{"name":"Mitra Keluarga","sector":"Healthcare","industry":"Hospital Management","summary":"Mengoperasikan 16+ rumah sakit di kota-kota besar Indonesia dengan merek Mitra Keluarga. Fokus pada layanan kesehatan kelas menengah."},"PGAS":{"name":"Perusahaan Gas Negara","sector":"Energy","industry":"Natural Gas Distribution","summary":"Perusahaan gas milik negara. Mendistribusikan gas alam melalui jaringan pipa 10.000+ km di seluruh Indonesia."},"PTBA":{"name":"Bukit Asam","sector":"Energy","industry":"Coal Mining","summary":"Perusahaan tambang batu bara milik negara. Mengoperasikan tambang Tanjung Enim di Sumatera Selatan. Memproduksi batu bara termal."},"SIDO":{"name":"Sido Muncul","sector":"Healthcare","industry":"Herbal Medicine","summary":"Produsen obat herbal terbesar di Indonesia. Memproduksi Tolak Angin, Kuku Bima, dan ramuan tradisional lainnya."},"SMGR":{"name":"Semen Indonesia","sector":"Material","industry":"Cement","summary":"Produsen semen terbesar di Indonesia (milik negara). Beroperasi dengan merek Semen Gresik, Semen Padang, dan Semen Tonasa."},"TLKM":{"name":"Telkom Indonesia","sector":"Telecommunication","industry":"Fixed & Mobile Telecom","summary":"Perusahaan telekomunikasi terbesar di Indonesia. Memiliki Telkomsel (seluler), IndiHome (broadband), dan infrastruktur serat optik."},"TPIA":{"name":"Chandra Asri Pacific","sector":"Petrochemical","industry":"Petrochemical","summary":"Perusahaan petrokimia terintegrasi terbesar di Indonesia. Memproduksi nafta, etilena, polietilena, dan polipropilena."},"UNTR":{"name":"United Tractors","sector":"Heavy Equipment","industry":"Mining Equipment & Contracting","summary":"Mendistribusikan alat berat Komatsu, mengoperasikan tambang batu bara, dan menjalankan kontraktor tambang melalui Pamapersada Nusantara."}};

export const FD: Record<string, FundamentalDetails> = {"BBCA.JK":{"roe":0.22972,"net_margin":0.53462005,"operating_margin":0.67586,"debt_to_equity":null,"free_cash_flow":null,"pe_ratio":10.775863,"pb_ratio":2.4064806,"dividend_yield":6.62,"roa":0.03661,"market_cap":623596904906752,"revenue_growth":0.025,"earnings_growth":0.037},"BBRI.JK":{"roe":0.18135999,"net_margin":0.40230998,"operating_margin":0.42025003,"debt_to_equity":null,"free_cash_flow":null,"pe_ratio":7.042254,"pb_ratio":1.2199025,"dividend_yield":15.26,"roa":0.02715,"market_cap":412575296651264,"revenue_growth":0.163,"earnings_growth":0.143},"BBNI.JK":{"roe":0.12029,"net_margin":0.40032002,"operating_margin":0.47421002,"debt_to_equity":null,"free_cash_flow":null,"pe_ratio":5.88926,"pb_ratio":0.7418746,"dividend_yield":10.89,"roa":0.01584,"market_cap":119594320658432,"revenue_growth":0.078,"earnings_growth":0.052},"BMRI.JK":{"roe":0.21040002,"net_margin":0.40245,"operating_margin":0.58581,"debt_to_equity":null,"free_cash_flow":null,"pe_ratio":6.1274314,"pb_ratio":1.1741004,"dividend_yield":12.42,"roa":0.02575,"market_cap":358399988465664,"revenue_growth":0.015,"earnings_growth":0.167},"TLKM.JK":{"roe":0.14214,"net_margin":0.11276,"operating_margin":0.24583,"debt_to_equity":0.44115,"free_cash_flow":34257999233024,"pe_ratio":16.778116,"pb_ratio":2.0289195,"dividend_yield":7.7,"roa":0.07377,"market_cap":272440848547840,"revenue_growth":0.015,"earnings_growth":-0.216},"ASII.JK":{"roe":0.13245,"net_margin":0.09943,"operating_margin":0.0857,"debt_to_equity":0.39859,"free_cash_flow":15747374907392,"pe_ratio":5.820692,"pb_ratio":0.7865944,"dividend_yield":8.53,"roa":0.04541,"market_cap":183091637256192,"revenue_growth":-0.056,"earnings_growth":-0.146},"ICBP.JK":{"roe":0.14631,"net_margin":0.11969,"operating_margin":0.20801,"debt_to_equity":0.62219,"free_cash_flow":6226821251072,"pe_ratio":8.223684,"pb_ratio":1.3777635,"dividend_yield":3.88,"roa":0.07327,"market_cap":75219305758720,"revenue_growth":0.076,"earnings_growth":-0.031},"CPIN.JK":{"roe":0.19496,"net_margin":0.09163,"operating_margin":0.17216,"debt_to_equity":0.18068,"free_cash_flow":2504820785152,"pe_ratio":8.305689,"pb_ratio":1.5095513,"dividend_yield":5.33,"roa":0.12819,"market_cap":55425240137728,"revenue_growth":0.127,"earnings_growth":0.677},"INDF.JK":{"roe":0.13319,"net_margin":0.08678,"operating_margin":0.18856,"debt_to_equity":0.61085,"free_cash_flow":8638832312320,"pe_ratio":4.8638134,"pb_ratio":0.6870716,"dividend_yield":4.63,"roa":0.06891,"market_cap":53121577385984,"revenue_growth":0.074,"earnings_growth":0.086},"ADRO.JK":{"roe":0.10256,"net_margin":0.2543,"operating_margin":0.31133,"debt_to_equity":0.19536,"free_cash_flow":-21144876,"pe_ratio":7.235843,"pb_ratio":0.7421,"dividend_yield":10.56,"roa":0.05422,"market_cap":64513105723392,"revenue_growth":0.234,"earnings_growth":0.748},"KLBF.JK":{"roe":0.1443,"net_margin":0.09988,"operating_margin":0.13664,"debt_to_equity":0.01187,"free_cash_flow":2396069298176,"pe_ratio":8.725675,"pb_ratio":1.2942996,"dividend_yield":2.88,"roa":0.09022,"market_cap":31447958159360,"revenue_growth":0.101,"earnings_growth":-0.035},"PTBA.JK":{"roe":0.14414,"net_margin":0.07837,"operating_margin":0.08306,"debt_to_equity":0.11489,"free_cash_flow":488093122560,"pe_ratio":8.928572,"pb_ratio":1.2672404,"dividend_yield":12.84,"roa":0.05271,"market_cap":29822183014400,"revenue_growth":-0.003,"earnings_growth":1.047},"MDKA.JK":{"roe":0.00553,"net_margin":-0.03275,"operating_margin":0.0409,"debt_to_equity":0.71135,"free_cash_flow":-440244960,"pe_ratio":null,"pb_ratio":null,"dividend_yield":null,"roa":0.01675,"market_cap":62751435128832,"revenue_growth":0.063,"earnings_growth":null},"AMMN.JK":{"roe":0.10484,"net_margin":0.20658,"operating_margin":0.38917,"debt_to_equity":1.16552,"free_cash_flow":-1094615168,"pe_ratio":22.521906,"pb_ratio":2.3612,"dividend_yield":null,"roa":0.05285,"market_cap":238236836298752,"revenue_growth":379.373,"earnings_growth":null},"ANTM.JK":{"roe":0.24687,"net_margin":0.09661,"operating_margin":0.15276,"debt_to_equity":0.21609,"free_cash_flow":-4749535477760,"pe_ratio":9.1657505,"pb_ratio":1.7011505,"dividend_yield":5.52,"roa":0.10846,"market_cap":66084602380288,"revenue_growth":0.121,"earnings_growth":0.599},"BRPT.JK":{"roe":0.34817,"net_margin":0.05984,"operating_margin":0.19276,"debt_to_equity":1.33907,"free_cash_flow":-1247792384,"pe_ratio":13.605442,"pb_ratio":4.737,"dividend_yield":null,"roa":0.00985,"market_cap":138693385912320,"revenue_growth":2.322,"earnings_growth":4.61},"TPIA.JK":{"roe":0.42368,"net_margin":0.14337,"operating_margin":0.16072,"debt_to_equity":1.17023,"free_cash_flow":-1840610688,"pe_ratio":3.444726,"pb_ratio":1.4595,"dividend_yield":0.47,"roa":-0.01233,"market_cap":112872420016128,"revenue_growth":2.864,"earnings_growth":null},"PGAS.JK":{"roe":0.10092,"net_margin":0.06189,"operating_margin":0.13191,"debt_to_equity":0.29053,"free_cash_flow":228038624,"pe_ratio":8.424787,"pb_ratio":0.8502,"dividend_yield":8.26,"roa":0.05302,"market_cap":36847090663424,"revenue_growth":-0.038,"earnings_growth":0.458},"UNTR.JK":{"roe":0.12315,"net_margin":0.09766,"operating_margin":0.07727,"debt_to_equity":0.25751,"free_cash_flow":4743001800704,"pe_ratio":6.277455,"pb_ratio":0.7764926,"dividend_yield":10.32,"roa":0.06395,"market_cap":74946768273408,"revenue_growth":-0.167,"earnings_growth":-0.794},"SMGR.JK":{"roe":0.00438,"net_margin":0.00637,"operating_margin":0.0312,"debt_to_equity":0.21137,"free_cash_flow":2993279991808,"pe_ratio":45.668137,"pb_ratio":0.24051498,"dividend_yield":1.82,"roa":0.01034,"market_cap":10473771630592,"revenue_growth":0.083,"earnings_growth":0.887},"INTP.JK":{"roe":0.09884,"net_margin":0.12803,"operating_margin":0.05941,"debt_to_equity":0.12119,"free_cash_flow":1880727224320,"pe_ratio":5.9808617,"pb_ratio":0.5714874,"dividend_yield":11.56,"roa":0.04168,"market_cap":13299083116544,"revenue_growth":-0.033,"earnings_growth":0.041},"GOTO.JK":{"roe":-0.03291,"net_margin":-0.03316,"operating_margin":0.07829,"debt_to_equity":0.27754,"free_cash_flow":-323724115968,"pe_ratio":null,"pb_ratio":1.6553551,"dividend_yield":null,"roa":0.00322,"market_cap":53100509396992,"revenue_growth":0.263,"earnings_growth":null},"ESSA.JK":{"roe":0.12112,"net_margin":0.15882,"operating_margin":0.35653,"debt_to_equity":0.00022,"free_cash_flow":86916824,"pe_ratio":10.965323,"pb_ratio":1.3281,"dividend_yield":1.04,"roa":0.08368,"market_cap":10077780049920,"revenue_growth":0.368,"earnings_growth":1.31},"EXCL.JK":{"roe":-0.20137,"net_margin":-0.12106,"operating_margin":-0.00874,"debt_to_equity":2.0904,"free_cash_flow":11772207562752,"pe_ratio":null,"pb_ratio":1.6549467,"dividend_yield":6.0,"roa":-0.01072,"market_cap":48229638995968,"revenue_growth":0.374,"earnings_growth":null},"MAPI.JK":{"roe":0.17545,"net_margin":0.05182,"operating_margin":0.0855,"debt_to_equity":0.4696,"free_cash_flow":3872628146176,"pe_ratio":10.383889,"pb_ratio":1.6824908,"dividend_yield":0.67,"roa":0.0796,"market_cap":24651000446976,"revenue_growth":0.32,"earnings_growth":0.33},"MIKA.JK":{"roe":0.17981,"net_margin":0.25302,"operating_margin":0.30093,"debt_to_equity":0.00111,"free_cash_flow":511055921152,"pe_ratio":15.38384,"pb_ratio":2.7983396,"dividend_yield":2.82,"roa":0.11729,"market_cap":21207642537984,"revenue_growth":0.066,"earnings_growth":0.048},"HEAL.JK":{"roe":0.07834,"net_margin":0.05621,"operating_margin":0.1254,"debt_to_equity":0.48057,"free_cash_flow":-570719993856,"pe_ratio":30.030031,"pb_ratio":2.1436284,"dividend_yield":1.69,"roa":0.05061,"market_cap":12255226757120,"revenue_growth":0.054,"earnings_growth":-0.187},"SIDO.JK":{"roe":0.32823,"net_margin":0.29088,"operating_margin":0.2754,"debt_to_equity":0.00049,"free_cash_flow":953373229056,"pe_ratio":9.415417,"pb_ratio":3.288909,"dividend_yield":10.16,"roa":0.23064,"market_cap":10714412482560,"revenue_growth":-0.188,"earnings_growth":-0.35},"AKRA.JK":{"roe":0.18943,"net_margin":0.05264,"operating_margin":0.06335,"debt_to_equity":0.3416,"free_cash_flow":3903885148160,"pe_ratio":9.398352,"pb_ratio":1.8836404,"dividend_yield":8.2,"roa":0.05751,"market_cap":24155718156288,"revenue_growth":0.262,"earnings_growth":0.161},"ITMG.JK":{"roe":0.09384,"net_margin":0.09527,"operating_margin":0.14809,"debt_to_equity":0.04237,"free_cash_flow":243388752,"pe_ratio":7.5872536,"pb_ratio":0.712,"dividend_yield":7.9,"roa":0.06477,"market_cap":24416289292288,"revenue_growth":0.031,"earnings_growth":-0.149}};

export const RS = {
  last_update: "2026-06-11 13:03",
  status: "SAFE",
  market_health: 48,
  opportunity: 74,
  risk: 40,
  confidence: 61,
  capital_deployment: 40,
  action: "WAIT",
  rationale: "Score gap 40.6 poin menunjukkan pemisahan kualitas yang jelas antara top5 dan bottom5. Faktor dominan: Growth (80.0). Faktor terlemah: Quality (60.0). Breadth terbatas (1 saham >=70). 2 dari 5 saham watchlist volume sepi - likuiditas rendah.",
  detail_message: "Score gap 40.6 poin menunjukkan pemisahan kualitas yang jelas antara top5 dan bottom5. Faktor dominan: Growth (80.0). Faktor terlemah: Quality (60.0). Breadth terbatas (1 saham >=70). 2 dari 5 saham watchlist volume sepi - likuiditas rendah.",
  radar_context: {
    production_config: "Aman",
    top5_avg_score: 66.8,
    bot5_avg_score: 26.2,
    score_gap: 40.6,
    score_gap_5d_change: 0,
    breadth_above_70: 1,
    breadth_above_60: 7,
    breadth_below_40: 7,
    strongest_factor: "Growth",
    strongest_factor_score: 80.0,
    weakest_factor: "Quality",
    weakest_factor_score: 60.0,
    top5_turnover: 0,
    watchlist_count: 5,  // LEGACY: gunakan idx_universe_size (size of IDX80 universe)
    idx_universe_size: 80,  // FASE 1.5 — ukuran universe (IDX80 default)
  },
  volume_details: [
    "PTBA.JK: Volume 1.6x (Wajar)",
    "BBNI.JK: Volume 1.9x (Wajar)",
    "INDF.JK: Volume 0.9x (Sepi)",
    "ASII.JK: Volume 1.0x (Sepi)",
    "ITMG.JK: Volume 2.4x (Volume Lonjakan)"
  ]
};

export const MKT = {
  last_update: "2026-06-23",
  market_last_update: "2026-06-23 17:00:00 WIB",
  // NOTE: daily/weekly/monthly di-overwrite oleh refreshRSFromRegime() dari historical IHSG data.
  // Nilai di bawah hanya dipakai sebagai fallback pre-data-load.
  ihsg: { value: 6101.0, daily: 0, daily_pct: 0, weekly: 0, monthly: 0 },
  usdidr: { value: 17840.0, daily: 0, weekly: 0, monthly: 0 },
  gold: { value: 2371593, daily: 0, weekly: 0, monthly: 0 },
  oil: { value: 88, daily: 0, weekly: 0, monthly: 0 }
};

let _prevRanks: Record<string, number> = {};

// Default weight constants — hasil backtest optimasi step 0.05 (data 2021-2026).
// AMAN: prioritas Sharpe + drawdown rendah.
// AGRESIF: growth-heavy.
// DIVIDEN: fokus dividend yield.
export const CW_AMAN = { quality: 0.30, growth: 0.45, value: 0.10, momentum: 0.00, dividend: 0.15 };
export const CW_AGRESIF = { quality: 0.20, growth: 0.60, value: 0.10, momentum: 0.10, dividend: 0.00 };
export const CW_DIVIDEN = { quality: 0.15, growth: 0.20, value: 0.05, momentum: 0.00, dividend: 0.60 };

/** Legacy map — used by callers that still reference "prod"/"res" strings. */
export const CW_MAP: Record<string, typeof CW_AMAN> = {
  aman: CW_AMAN,
  agresif: CW_AGRESIF,
  dividen: CW_DIVIDEN,
};

// Scan data cache from idx80_scan.json (loaded from /api/engine/idx80)
interface ScanStock {
  ticker: string;
  quality: number;
  growth: number;
  value: number;
  momentum: number;
  dividend?: number;
  currentPrice: number;
  changePercent: number;
  volume?: number;
  peRatio?: number;
  pbRatio?: number;
  dividendYield?: number;
  companyName?: string;
  sector?: string;
  industry?: string;
  lastUpdated: string;
  longBusinessSummary?: string;
  marketCap?: number;
  trailingEps?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  fiftyDayAverage?: number;
  twoHundredDayAverage?: number;
  totalRevenue?: number;
  netIncome?: number;
  operatingCashflow?: number;
  freeCashflow?: number;
  grossProfit?: number;
  ebitda?: number;
  revenueGrowth?: number;
  earningsGrowth?: number;
  returnOnEquity?: number;
  debtToEquity?: number;
  operatingMargin?: number;
  grossMargins?: number;
}
let scanDataCache: { stocks: ScanStock[]; lastUpdated: string } | null = null;

export function setScanData(data: { stocks: ScanStock[]; lastUpdated: string } | null) {
  scanDataCache = data;
  if (data?.stocks?.length) {
    enrichDividendScore(data.stocks);
    syncRadarContext(data);
    buildDividendCache(data.stocks);
  }
}

function buildDividendCache(stocks: ScanStock[]) {
  const cache: Record<string, Record<string, number>> = {};
  const currentYear = new Date().getFullYear().toString();

  for (const s of stocks) {
    const ticker = s.ticker.replace(".JK", "");
    if (s.dividendYield && s.dividendYield > 0 && s.currentPrice > 0) {
      const dps = (s.dividendYield / 100) * s.currentPrice;
      if (dps > 0) {
        cache[ticker] = { [currentYear]: dps };
      }
    }
  }

  // Merge with real historical yearly DPS from dividend_snapshots.json
  // (77 IDX80 tickers, 2010-2026, sourced from Yahoo Finance historical()
  // via scripts/fetch_dividend_history.ts). Without this merge, historical
  // backtest always returns 0 dividend because cache only has currentYear.
  try {
    for (const [ticker, years] of Object.entries(snapshots as Record<string, Record<string, { dividend_per_share: number }>>)) {
      if (!cache[ticker]) cache[ticker] = {};
      for (const [year, snap] of Object.entries(years)) {
        if (snap?.dividend_per_share > 0) {
          cache[ticker][year] = snap.dividend_per_share;
        }
      }
    }
  } catch (err) {
    console.warn("[dividendCache] failed to merge snapshots:", err);
  }

  setDividendCache(cache);
}

/** Compute 0-100 dividend score from dividendYield (%). IDX dividend yield
 *  range is roughly 0-15%; linear map: 0%→0, 7.5%→50, 15%→100.
 *  Mutates s.dividend in place so getProcessedLeaders + marketRegimeEngine
 *  see the same value as the other 0-100 factors. */
function enrichDividendScore(stocks: ScanStock[]) {
  let enriched = 0;
  for (const s of stocks) {
    if (s.dividend === undefined && s.dividendYield !== undefined) {
      s.dividend = Math.max(0, Math.min(100, s.dividendYield * (100 / 15)));
      enriched++;
    }
  }
  if (typeof console !== "undefined") {
    console.log(`[dividend] enriched ${enriched}/${stocks.length} stocks from dividendYield`);
  }
}

function syncRadarContext(scanData: { stocks: ScanStock[]; lastUpdated: string }) {
  const stocks = scanData.stocks;
  if (!stocks.length) return;

  const avgQ = stocks.reduce((s, x) => s + (x.quality ?? 50), 0) / stocks.length;
  const avgG = stocks.reduce((s, x) => s + (x.growth ?? 50), 0) / stocks.length;
  const avgV = stocks.reduce((s, x) => s + (x.value ?? 50), 0) / stocks.length;
  const avgM = stocks.reduce((s, x) => s + (x.momentum ?? 50), 0) / stocks.length;
  const avgD = stocks.reduce((s, x) => s + (x.dividend ?? 50), 0) / stocks.length;

  const factors: [string, number][] = [["Quality", avgQ], ["Growth", avgG], ["Value", avgV], ["Momentum", avgM], ["Dividen", avgD]];
  factors.sort((a, b) => b[1] - a[1]);

  const strongest = factors[0];
  const weakest = factors[factors.length - 1];

  const volDetails = stocks
    .filter(s => (s.volume || 0) > 0)
    .sort((a, b) => (b.volume || 0) - (a.volume || 0))
    .slice(0, 5)
    .map(s => {
      const ratio = ((s.volume || 0) / 500000).toFixed(1);
      const label = parseFloat(ratio) > 2 ? "Volume Lonjakan" : parseFloat(ratio) < 0.8 ? "Sepi" : "Wajar";
      const tickerClean = s.ticker.replace(".JK", "");
      return `${tickerClean}.JK: Volume ${ratio}x (${label})`;
    });

  RS.radar_context.strongest_factor = strongest[0];
  RS.radar_context.strongest_factor_score = Math.round(strongest[1] * 10) / 10;
  RS.radar_context.weakest_factor = weakest[0];
  RS.radar_context.weakest_factor_score = Math.round(weakest[1] * 10) / 10;
  RS.radar_context.watchlist_count = stocks.length;
  // FASE 1.5 — Gunakan field yang lebih jelas untuk ukuran universe
  RS.radar_context.idx_universe_size = stocks.length;
  RS.volume_details = volDetails;
}

export function getScanData() {
  return scanDataCache;
}

export function getProcessedLeaders(activeStocksList: any[], config: string | { quality: number; growth: number; value: number; momentum: number; dividend: number }) {
  const weights = typeof config === "string"
    ? (CW_MAP[config] ?? CW_AMAN)
    : config;

  const dynamicL = activeStocksList.map((s, idx) => {
    // Prefer scan data over hardcoded L for score factors
    const normTicker = s.ticker.replace(".JK", "");
    const scanStock = scanDataCache?.stocks.find(st => st.ticker.replace(".JK", "") === normTicker);
    if (scanStock) {
      const div = scanStock.dividend ?? 50;
      return {
        rank: String(idx + 1),
        ticker: normTicker + ".JK",
        quality: scanStock.quality.toFixed(2),
        growth: scanStock.growth.toFixed(2),
        value: scanStock.value.toFixed(2),
        momentum: scanStock.momentum.toFixed(2),
        dividend: div.toFixed(2),
        final_score: String(Math.round(
          scanStock.quality * weights.quality +
          scanStock.growth * weights.growth +
          scanStock.value * weights.value +
          scanStock.momentum * weights.momentum +
          div * weights.dividend
        )),
      };
    }

    const existing = L.find(l => l.ticker.replace(".JK", "") === s.ticker);
    if (existing) {
      const div = parseFloat(existing.dividend || "50");
      return {
        ...existing,
        quality: parseFloat(existing.quality).toFixed(2),
        growth: parseFloat(existing.growth).toFixed(2),
        value: parseFloat(existing.value).toFixed(2),
        momentum: parseFloat(existing.momentum).toFixed(2),
        dividend: div.toFixed(2),
        final_score: String(Math.round(
          parseFloat(existing.quality) * weights.quality +
          parseFloat(existing.growth) * weights.growth +
          parseFloat(existing.value) * weights.value +
          parseFloat(existing.momentum) * weights.momentum +
          div * weights.dividend
        )),
      };
    }

    // No scan data and not in L — assign neutral score so stock still visible
    return {
      rank: String(idx + 1),
      ticker: normTicker + ".JK",
      quality: "50.00",
      growth: "50.00",
      value: "50.00",
      momentum: "50.00",
      dividend: "50.00",
      final_score: "50",
    };
  }).filter(Boolean);

  const computeScore = (stock: typeof L[0]) => {
    const qVal = parseFloat(stock.quality) || 0;
    const gVal = parseFloat(stock.growth) || 0;
    const vVal = parseFloat(stock.value) || 0;
    const mVal = parseFloat(stock.momentum) || 0;
    const dVal = (stock as any).dividend !== undefined && (stock as any).dividend !== null && (stock as any).dividend !== "" ? parseFloat((stock as any).dividend) : 0;
    return qVal * weights.quality + gVal * weights.growth + vVal * weights.value + mVal * weights.momentum + dVal * weights.dividend;
  };

  const sorted = dynamicL.map((stock) => {
    const calculatedScore = computeScore(stock);
    return {
      ...stock,
      score: parseFloat(calculatedScore.toFixed(2)),
    };
  }).sort((a, b) => b.score - a.score);

  const now = Date.now();
  return sorted.map((stock, idx) => {
    const currentRank = idx + 1;
    const prevRank = _prevRanks[stock.ticker];
    let change = 0;
    if (prevRank !== undefined) {
      change = prevRank - currentRank;
    }
    _prevRanks[stock.ticker] = currentRank;
    return { ...stock, rankChange: change };
  });
}

export interface NewsItem {
  portal: string;
  title: string;
  url: string;
  summary: string;
  time: string;
  badge: string;
  color: string;
}

export const idxNews: NewsItem[] = [
  {
    portal: "CNBC Indonesia",
    title: "BI-Rate Tetap 6.25%: Sentimen Likuiditas Perbankan Masih Terjaga Sempurna",
    url: "https://www.cnbcindonesia.com/market",
    summary: "Rapat Dewan Gubernur Bank Indonesia memutuskan untuk menahan suku bunga acuan. Langkah ini diambil untuk mengawal stabilitas nilai tukar Rupiah dari volatilitas eksternal global.",
    time: "20 mins ago",
    badge: "Macro Indicator",
    color: "border-emerald-500/20 text-emerald-400 bg-emerald-500/10"
  },
  {
    portal: "Bisnis.com",
    title: "Emiten Batubara Menggeliat, ADRO & ITMG Nikmati Berkah Lonjakan Volume Ekspor",
    url: "https://market.bisnis.com",
    summary: "Sejumlah emiten batubara membukukan peningkatan volume ekspor yang signifikan ke wilayah Asia Timur. Permintaan solid ini menyokong neraca kas fundamental yang tebal bagi para pemegang saham.",
    time: "1 hour ago",
    badge: "Coal Sector",
    color: "border-emerald-500/20 text-emerald-400 bg-emerald-500/10"
  },
  {
    portal: "Kontan",
    title: "Rapor Keuangan Q1 Perbankan KBMI 4 Cemerlang, Rekomendasi Akumulasi BBCA & BMRI",
    url: "https://www.kontan.co.id",
    summary: "Bank-bank raksasa mencetak margin bunga bersih (NIM) yang kompetitif meskipun dihantam kebijakan suku bunga restriktif. Konsensus analis menyarankan buy on weakness.",
    time: "3 hours ago",
    badge: "Banking Intel",
    color: "border-purple-500/20 text-purple-400 bg-purple-400/10"
  },
  {
    portal: "Bloomberg Technoz",
    title: "Rupiah Kokoh Menguat ke Rp 16.145 per Dolar AS Ditopang Derasnya Modal Asing",
    url: "https://www.bloombergtechnoz.com",
    summary: "Aliran modal asing (flow of funds) membanjiri surat utang negara dan bursa saham domestik. Rupiah menguat paling prima di kawasan regional Asia Tenggara.",
    time: "4 hours ago",
    badge: "Exchange Rate",
    color: "border-teal-500/20 text-teal-400 bg-teal-500/10"
  }
];

