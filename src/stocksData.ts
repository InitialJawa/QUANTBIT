import { StockData } from "./types";
import { PF, FD, EX, L } from "./marketData";

const RAW_STOCKS_DATA = [
  "BBCA|Bank Central Asia Tbk|Financials|Banks|1240.2|10100|1.25|24.8|4.85|20.2|0.12|2.1",
  "BBRI|Bank Rakyat Indonesia Tbk|Financials|Banks|735.6|4850|-1.02|12.5|2.25|18.5|0.18|6.8",
  "BMRI|Bank Mandiri Tbk|Financials|Banks|890.4|6200|0.85|10.2|2.15|21.0|0.15|5.2",
  "BBNI|Bank Negara Indonesia Tbk|Financials|Banks|210.5|4900|1.15|8.6|1.12|14.5|0.22|4.5",
  "TLKM|Telkom Indonesia Tbk|Infrastructure|Telecommunication|310.8|3150|0.64|14.2|2.1|14.8|0.45|5.4",
  "ASII|Astra International Tbk|Consumer Discretionary|Conglomerate|204.4|5050|1.51|6.8|0.98|14.4|0.62|8.2",
  "GOTO|GoTo Gojek Tokopedia Tbk|Technology|Internet|72.8|62|-3.12|-12.4|0.65|-8.5|0.08|0.0",
  "ADRO|Adaro Energy Indonesia Tbk|Energy|Coal Mining|112.4|3500|2.34|4.8|1.15|23.8|0.32|11.5",
  "PTBA|Bukit Asam Tbk|Energy|Coal Mining|31.2|2700|1.85|5.2|1.24|24.2|0.28|13.2",
  "ITMG|Indo Tambangraya Megah Tbk|Energy|Coal Mining|28.5|25800|2.75|4.1|1.08|26.5|0.15|15.4",
  "PGAS|Perusahaan Gas Negara Tbk|Energy|Gas Utilities|36.8|1520|0.66|8.4|0.85|10.1|0.29|8.2",
  "ANTM|Aneka Tambang Tbk|Materials|Diversified Metals|36.1|1500|-1.31|9.2|1.70|24.7|0.22|5.5",
  "MDKA|Merdeka Copper Gold Tbk|Materials|Gold & Copper|58.4|2400|-2.45|-45.0|2.15|0.5|0.71|0.0",
  "INCO|Vale Indonesia Tbk|Materials|Nickel Mining|35.8|3600|-1.10|11.4|0.95|8.4|0.11|3.2",
  "TPIA|Chandra Asri Pacific Tbk|Materials|Petrochemical|412.5|4775|5.20|122.5|4.20|1.5|0.85|0.5",
  "BRPT|Barito Pacific Tbk|Materials|Petrochemical|88.5|940|-1.57|54.2|2.12|3.9|1.12|1.1",
  "AMMN|Amman Mineral Internasional Tbk|Materials|Copper & Gold|630.5|8700|0.58|42.5|6.40|15.1|0.95|0.0",
  "ESSA|Essa Industries Indonesia Tbk|Energy|Gas Processing|10.5|610|-0.81|10.9|1.32|12.1|0.15|1.5",
  "SMGR|Semen Indonesia Tbk|Materials|Materials|22.8|3850|-2.15|13.8|0.52|3.8|0.38|4.5",
  "INTP|Indocement Tunggal Prakarsa Tbk|Materials|Materials|24.5|6675|-1.80|12.4|1.10|8.9|0.15|5.2",
  "KLBF|Kalbe Farma Tbk|Healthcare|Pharmaceuticals|72.8|1550|0.65|21.4|2.85|13.4|0.05|2.8",
  "MIKA|Mitra Keluarga Karyasehat Tbk|Healthcare|Hospitals|41.5|2900|1.05|34.5|5.20|15.1|0.02|1.8",
  "HEAL|Medikaloka Hermina Tbk|Healthcare|Hospitals|21.0|1400|0.72|28.5|3.45|12.2|0.42|1.2",
  "SIDO|Sido Muncul Tbk|Healthcare|Pharmaceuticals|17.5|580|1.75|18.2|5.40|29.5|0.01|8.5",
  "ICBP|Indofood CBP Sukses Makmur Tbk|Consumer Staples|Packaged Food|131.2|11250|1.35|15.2|2.45|16.1|0.48|3.5",
  "INDF|Indofood Sukses Makmur Tbk|Consumer Staples|Food & Agribusiness|52.4|5975|0.84|6.4|0.85|13.2|0.55|4.8",
  "UNVR|Unilever Indonesia Tbk|Consumer Staples|Personal Care|98.4|2580|-3.45|22.4|18.5|82.5|0.32|6.2",
  "CPIN|Charoen Pokphand Indonesia Tbk|Consumer Staples|Poultry|68.5|4180|0.72|26.5|2.42|9.1|0.35|2.5",
  "JPFA|Japfa Comfeed Indonesia Tbk|Consumer Staples|Poultry|17.2|1475|1.03|12.1|1.05|8.7|0.65|3.8",
  "MAPI|Mitra Adiperkasa Tbk|Consumer Discretionary|Retail|26.5|1600|2.56|14.5|1.95|13.5|0.35|1.2",
  "ACES|Aspirasi Hidup Indonesia Tbk|Consumer Discretionary|Home Improvement|13.4|780|0.64|16.1|1.95|12.1|0.08|3.5",
  "ERAA|Erajaya Swasembada Tbk|Consumer Discretionary|Retail|6.8|425|-1.16|8.2|0.82|10.0|0.45|4.2",
  "JSMR|Jasa Marga Tbk|Infrastructure|Infrastructure|34.5|4750|1.20|10.1|1.25|12.4|1.85|3.1",
  "UNTR|United Tractors Tbk|Energy|Heavy Equipment|88.5|23725|0.85|4.8|1.02|21.2|0.22|9.8",
  "HRUM|Harum Energy Tbk|Energy|Coal & Nickel|16.8|1250|-1.57|8.5|1.12|13.1|0.18|3.5",
  "MEDC|Medco Energi Internasional Tbk|Energy|Oil & Gas|32.4|1290|0.78|6.8|1.15|16.9|1.95|4.5",
  "EXCL|XL Axiata Tbk|Infrastructure|Telecommunication|27.5|2100|-0.94|18.2|1.10|6.1|1.65|2.8",
  "ISAT|Indosat Ooredoo Hutchison Tbk|Infrastructure|Telecommunication|72.4|9000|1.52|16.8|2.15|12.8|1.45|3.2",
  "BUKA|Bukalapak.com Tbk|Technology|Internet|11.5|112|-1.75|-8.5|0.45|-5.2|0.02|0.0",
  "EMTK|Elang Mahkota Teknologi Tbk|Technology|Media & Tech|23.5|385|-2.53|24.5|0.85|3.5|0.12|1.0",
  "ARTO|Bank Jago Tbk|Financials|Banks|32.5|2350|-2.05|185.0|3.85|2.1|0.05|0.0",
  "BRIS|Bank Syariah Indonesia Tbk|Financials|Banks|98.4|2130|2.40|17.5|2.20|12.6|0.12|1.8",
  "BBTN|Bank Tabungan Negara Tbk|Financials|Banks|16.5|1150|-1.28|5.2|0.58|11.2|1.25|4.5",
  "BUMI|Bumi Resources Tbk|Energy|Coal Mining|32.8|85|-4.55|14.5|1.25|8.6|0.85|0.0",
  "INDY|Indika Energy Tbk|Energy|Coal & Clean Energy|7.8|1500|-2.28|5.6|0.48|8.5|1.75|6.0",
  "TOBA|TBS Energi Utama Tbk|Energy|Energy Transition|2.8|350|-1.95|12.4|0.65|5.2|0.82|2.5",
  "DSSA|Dian Swastatika Sentosa Tbk|Energy|Energy & Infra|58.5|41000|1.15|10.4|2.85|27.4|0.65|1.2",
  "KKGI|Resource Alam Indonesia Tbk|Energy|Coal Mining|1.8|360|0.56|5.8|0.95|16.4|0.12|8.2",
  "ENRG|Energi Mega Persada Tbk|Energy|Oil & Gas|4.8|195|-1.52|5.1|0.62|12.1|0.45|0.0",
  "ABMM|ABM Investama Tbk|Energy|Coal Services|9.8|3550|1.43|3.2|0.85|26.5|0.95|10.5",
  "DOID|Delta Dunia Makmur Tbk|Energy|Coal Services|4.5|520|2.35|6.8|0.92|13.5|1.45|5.2",
  "BJBR|Bank BJB Tbk|Financials|Banks|10.2|980|-0.51|6.5|0.72|11.1|0.15|9.2",
  "BJTM|Bank Jatim Tbk|Financials|Banks|8.5|565|-0.88|5.9|0.85|14.4|0.12|9.8",
  "BDMN|Bank Danamon Tbk|Financials|Banks|26.4|2700|0.37|7.4|0.58|7.8|0.15|4.8",
  "MEGA|Bank Mega Tbk|Financials|Banks|54.2|5500|0.00|13.4|2.85|21.3|0.10|5.5",
  "BFIN|BFI Finance Tbk|Financials|Finance|16.2|1020|-1.92|10.2|1.62|15.9|1.25|4.8",
  "ADMF|Adira Dinamika Multi Finance Tbk|Financials|Finance|9.8|9800|-0.51|5.8|0.95|16.4|1.85|8.5",
  "SMRA|Summarecon Agung Tbk|Real Estate|Properties|8.5|515|-1.43|11.2|0.85|7.6|0.95|1.5",
  "BSDE|Bumi Serpong Damai Tbk|Real Estate|Properties|19.8|935|1.08|8.5|0.52|6.1|0.42|0.0",
  "CTRA|Ciputra Development Tbk|Real Estate|Properties|21.5|1160|1.31|11.4|1.05|9.2|0.48|1.8",
  "PWON|Pakuwon Jati Tbk|Real Estate|Properties|18.2|380|-0.52|9.5|0.85|9.0|0.32|2.5",
  "ASRI|Alam Sutera Realty Tbk|Real Estate|Properties|2.5|128|-1.54|12.1|0.25|2.1|1.15|0.0",
  "PTPP|PP (Persero) Tbk|Infrastructure|Construction|2.3|370|-2.12|18.5|0.22|1.2|2.35|0.0",
  "ADHI|Adhi Karya Tbk|Infrastructure|Construction|1.8|212|-4.50|24.5|0.18|0.7|3.12|0.0",
  "WIKA|Wijaya Karya Tbk|Infrastructure|Construction|2.1|250|-6.12|-5.2|0.15|-10.5|4.15|0.0",
  "TOWR|Sarana Menara Nusantara Tbk|Infrastructure|Telecom Infrastructure|37.8|740|0.68|12.1|2.45|20.2|2.15|4.5",
  "TBIG|Tower Bersama Infrastructure Tbk|Infrastructure|Telecom Infrastructure|41.2|1820|-0.54|25.4|4.15|16.4|2.45|2.1",
  "HMSP|H.M. Sampoerna Tbk|Consumer Staples|Tobacco|78.4|675|-2.17|10.4|3.42|32.8|0.18|9.5",
  "GGRM|Gudang Garam Tbk|Consumer Staples|Tobacco|31.2|16250|-1.81|7.4|0.52|7.0|0.22|8.2",
  "MYOR|Mayora Indah Tbk|Consumer Staples|Packaged Food|55.4|2480|1.22|18.5|2.85|15.4|0.28|2.1",
  "ROTI|Nippon Indosari Corpindo Tbk|Consumer Staples|Packaged Food|5.8|940|-1.05|14.2|1.85|13.0|0.35|5.2",
  "AALI|Astra Agro Lestari Tbk|Consumer Staples|Agribusiness|11.2|5800|-1.19|9.1|0.52|5.7|0.15|5.5",
  "LSIP|PP London Sumatra Tbk|Consumer Staples|Agribusiness|5.8|850|-0.58|7.2|0.45|6.2|0.02|6.0",
  "SSMS|Sawit Sumbermas Sarana Tbk|Consumer Staples|Agribusiness|9.1|955|-1.55|11.2|1.48|13.2|0.85|4.5",
  "SIMP|Salim Ivomas Pratama Tbk|Consumer Staples|Agribusiness|4.5|290|0.00|6.1|0.25|4.1|0.45|3.5",
  "LPPF|Matahari Department Store Tbk|Consumer Discretionary|Retail|4.5|1480|-2.15|5.2|3.85|73.8|1.15|11.5",
  "MAPA|MAP Aktif Adiperkasa Tbk|Consumer Discretionary|Retail|21.5|750|2.04|16.4|3.12|19.0|0.12|1.0",
  "SILO|Siloam International Hospitals Tbk|Healthcare|Hospitals|26.5|2040|1.49|24.5|2.85|11.6|0.18|1.8",
  "AUTO|Astra Otoparts Tbk|Consumer Discretionary|Auto Components|10.4|2150|1.18|5.2|0.75|14.5|0.28|6.5",
  "GJTL|Gajah Tunggal Tbk|Consumer Discretionary|Auto Components|4.2|1200|2.50|3.8|0.48|12.6|0.85|4.1"
];

const LOGO_COLORS = [
  "bg-blue-600",
  "bg-emerald-600",
  "bg-indigo-600",
  "bg-teal-600",
  "bg-purple-600",
  "bg-rose-600",
  "bg-cyan-600",
  "bg-amber-600"
];

// Helper to generate a deterministically stable color based on string
function getLogoColor(ticker: string): string {
  const sum = ticker.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return LOGO_COLORS[sum % LOGO_COLORS.length];
}

export const STOCKS_DATA: StockData[] = RAW_STOCKS_DATA.map((row) => {
  const [
    ticker,
    name,
    sector,
    subSector,
    rawMcap,
    rawPrice,
    rawChange,
    rawPe,
    rawPb,
    rawRoe,
    rawDer,
    rawDiv
  ] = row.split("|");

  const marketCap = parseFloat(rawMcap);
  const currentPrice = parseFloat(rawPrice);
  const change = parseFloat(rawChange);
  const peRatio = parseFloat(rawPe);
  const pbRatio = parseFloat(rawPb);
  const roe = parseFloat(rawRoe);
  const der = parseFloat(rawDer);
  const dividendYield = parseFloat(rawDiv);

  const logoColor = getLogoColor(ticker);

  const defaultSummary = `PT ${name} adalah salah satu perusahaan publik terkemuka di Indonesia yang bergerak di sektor ${sector}, khususnya bidang ${subSector}. Perusahaan ini terdaftar secara resmi di Bursa Efek Indonesia (BEI) dengan ticker ${ticker} dan merupakan bagian penting dari analisis indeks ekosistem finansial nasional.`;
  const description = PF[ticker]?.summary || defaultSummary;

  const baseRevenue = Math.round(marketCap * 10);
  const baseNetIncome = Math.round(baseRevenue * (roe / 100) * 0.45);

  const metrics = [
    {
      year: "2023",
      revenue: Math.round(baseRevenue * 0.85) || 5000,
      netIncome: Math.round(baseNetIncome * 0.82) || 800,
      totalAssets: Math.round(marketCap * 1000 * 1.2) || 60000,
      totalLiabilities: Math.round(marketCap * 1000 * 0.4) || 20000,
      totalEquity: Math.round(marketCap * 1000 * 0.8) || 40000,
      cashFlowOperating: Math.round(baseNetIncome * 0.9) || 720,
      cashFlowInvesting: Math.round(-baseNetIncome * 0.35) || -280,
      cashFlowFinancing: Math.round(-baseNetIncome * 0.45) || -360,
    },
    {
      year: "2024",
      revenue: Math.round(baseRevenue * 0.95) || 6200,
      netIncome: Math.round(baseNetIncome * 0.92) || 950,
      totalAssets: Math.round(marketCap * 1000 * 1.3) || 68000,
      totalLiabilities: Math.round(marketCap * 1000 * 0.42) || 22000,
      totalEquity: Math.round(marketCap * 1000 * 0.88) || 46000,
      cashFlowOperating: Math.round(baseNetIncome * 0.95) || 900,
      cashFlowInvesting: Math.round(-baseNetIncome * 0.4) || -380,
      cashFlowFinancing: Math.round(-baseNetIncome * 0.5) || -480,
    },
    {
      year: "2025",
      revenue: baseRevenue || 7000,
      netIncome: baseNetIncome || 1100,
      totalAssets: Math.round(marketCap * 1000 * 1.4) || 75000,
      totalLiabilities: Math.round(marketCap * 1000 * 0.45) || 25000,
      totalEquity: Math.round(marketCap * 1000 * 0.95) || 50000,
      cashFlowOperating: Math.round(baseNetIncome * 1.05) || 1150,
      cashFlowInvesting: Math.round(-baseNetIncome * 0.45) || -490,
      cashFlowFinancing: Math.round(-baseNetIncome * 0.55) || -600,
    }
  ];

  // Daily Chart
  const chartDataDaily = Array.from({ length: 8 }, (_, i) => {
    const hours = ["09:00", "10:00", "11:00", "12:00", "13:30", "14:30", "15:30", "16:00"];
    const progress = i / 7;
    const factor = Math.sin(progress * Math.PI) * 0.01 + (progress * 0.015 - 0.007);
    return {
      date: hours[i],
      price: Math.round(currentPrice * (1 + (change / 100) * progress + factor)),
      volume: Math.round(50000 + Math.random() * 80000),
    };
  });

  // Weekly Chart
  const chartDataWeekly = Array.from({ length: 5 }, (_, i) => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    const progress = i / 4;
    return {
      date: days[i],
      price: Math.round(currentPrice * (1 + (change / 200) * progress + (Math.random() * 0.01 - 0.005))),
      volume: Math.round(300000 + Math.random() * 500000),
    };
  });

  // Monthly Chart
  const chartDataMonthly = Array.from({ length: 4 }, (_, i) => {
    const weeks = ["Week 1", "Week 2", "Week 3", "Week 4"];
    const progress = i / 3;
    return {
      date: weeks[i],
      price: Math.round(currentPrice * (1 + (change / 100) * progress + (Math.random() * 0.02 - 0.01))),
      volume: Math.round(1500000 + Math.random() * 2000000),
    };
  });

  return {
    ticker,
    name,
    sector,
    subSector,
    description,
    logoColor,
    marketCap,
    currentPrice,
    change,
    peRatio,
    pbRatio,
    roe,
    der,
    dividendYield,
    metrics,
    chartDataDaily,
    chartDataWeekly,
    chartDataMonthly
  };
});

export function getStock(ticker: string): StockData {
  const cleanTicker = ticker.toUpperCase().replace(".JK", "");
  const found = STOCKS_DATA.find(s => s.ticker.toUpperCase() === cleanTicker || s.ticker.toUpperCase() === cleanTicker + ".JK");
  if (found) return found;

  // Synthesize fallback details if not found in our 80 list
  const profile = PF[cleanTicker];
  const fundamentals = FD[cleanTicker + ".JK"] || FD[cleanTicker];
  const exitItem = EX.find(e => e.ticker === cleanTicker + ".JK" || e.ticker === cleanTicker);
  const leaderItem = L.find(l => l.ticker === cleanTicker + ".JK" || l.ticker === cleanTicker);

  const name = profile?.name || `${cleanTicker} Corporation`;
  const sector = profile?.sector || "Financials";
  const subSector = profile?.industry || "Investment Services";
  const description = profile?.summary || `PT ${name} is a major publicly traded company in Indonesia, listed on the Bursa Efek Indonesia (IDX). It is analyzed as part of our core quantitative stock selection engine.`;
  
  const logoColor = getLogoColor(cleanTicker);

  const rawMcap = fundamentals?.market_cap ? (fundamentals.market_cap / 1e12) : 50.0;
  const marketCap = parseFloat(rawMcap.toFixed(1));
  const currentPrice = exitItem ? parseFloat(exitItem.close) : 1000;
  const change = leaderItem ? (parseFloat(leaderItem.momentum) > 50 ? 1.45 : -0.85) : 0.45;
  const peRatio = fundamentals?.pe_ratio || 14.5;
  const pbRatio = fundamentals?.pb_ratio || 1.6;
  const roe = fundamentals?.roe ? parseFloat((fundamentals.roe * 100).toFixed(1)) : 12.4;
  const der = fundamentals?.debt_to_equity || 0.35;
  const dividendYield = fundamentals?.dividend_yield || 2.4;

  const baseRevenue = Math.round(marketCap * 10);
  const baseNetIncome = Math.round(baseRevenue * (fundamentals?.net_margin || 0.12));

  const metrics = [
    {
      year: "2023",
      revenue: Math.round(baseRevenue * 0.85) || 5000,
      netIncome: Math.round(baseNetIncome * 0.82) || 800,
      totalAssets: Math.round(marketCap * 12) || 60000,
      totalLiabilities: Math.round(marketCap * 4) || 20000,
      totalEquity: Math.round(marketCap * 8) || 40000,
      cashFlowOperating: Math.round(baseNetIncome * 0.9) || 720,
      cashFlowInvesting: Math.round(-baseNetIncome * 0.35) || -280,
      cashFlowFinancing: Math.round(-baseNetIncome * 0.45) || -360,
    },
    {
      year: "2024",
      revenue: Math.round(baseRevenue * 0.95) || 6200,
      netIncome: Math.round(baseNetIncome * 0.92) || 950,
      totalAssets: Math.round(marketCap * 13) || 68000,
      totalLiabilities: Math.round(marketCap * 4.2) || 22000,
      totalEquity: Math.round(marketCap * 8.8) || 46000,
      cashFlowOperating: Math.round(baseNetIncome * 0.95) || 900,
      cashFlowInvesting: Math.round(-baseNetIncome * 0.4) || -380,
      cashFlowFinancing: Math.round(-baseNetIncome * 0.5) || -480,
    },
    {
      year: "2025",
      revenue: baseRevenue || 7000,
      netIncome: baseNetIncome || 1100,
      totalAssets: Math.round(marketCap * 14) || 75000,
      totalLiabilities: Math.round(marketCap * 4.5) || 25000,
      totalEquity: Math.round(marketCap * 9.5) || 50000,
      cashFlowOperating: Math.round(baseNetIncome * 1.05) || 1150,
      cashFlowInvesting: Math.round(-baseNetIncome * 0.45) || -490,
      cashFlowFinancing: Math.round(-baseNetIncome * 0.55) || -600,
    }
  ];

  // Daily Chart
  const chartDataDaily = Array.from({ length: 8 }, (_, i) => {
    const hours = ["09:00", "10:00", "11:00", "12:00", "13:30", "14:30", "15:30", "16:00"];
    const progress = i / 7;
    const factor = Math.sin(progress * Math.PI) * 0.01 + (progress * 0.015 - 0.007);
    return {
      date: hours[i],
      price: Math.round(currentPrice * (1 + (change / 100) * progress + factor)),
      volume: Math.round(50000 + Math.random() * 80000),
    };
  });

  // Weekly Chart
  const chartDataWeekly = Array.from({ length: 5 }, (_, i) => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    const progress = i / 4;
    return {
      date: days[i],
      price: Math.round(currentPrice * (1 + (change / 200) * progress + (Math.random() * 0.01 - 0.005))),
      volume: Math.round(300000 + Math.random() * 500000),
    };
  });

  // Monthly Chart
  const chartDataMonthly = Array.from({ length: 4 }, (_, i) => {
    const weeks = ["Week 1", "Week 2", "Week 3", "Week 4"];
    const progress = i / 3;
    return {
      date: weeks[i],
      price: Math.round(currentPrice * (1 + (change / 100) * progress + (Math.random() * 0.02 - 0.01))),
      volume: Math.round(1500000 + Math.random() * 2000000),
    };
  });

  return {
    ticker: cleanTicker,
    name,
    sector,
    subSector,
    description,
    logoColor,
    marketCap,
    currentPrice,
    change,
    peRatio,
    pbRatio,
    roe,
    der,
    dividendYield,
    metrics,
    chartDataDaily,
    chartDataWeekly,
    chartDataMonthly
  };
}
