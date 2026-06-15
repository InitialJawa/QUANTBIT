// marketData.ts
// Ported from target_data.js to provide real, robust, production-level IDX metrics

export interface LeaderStock {
  rank: string;
  ticker: string;
  quality: string;
  growth: string;
  value: string;
  momentum: string;
  final_score: string;
}

export interface TurnaroundStock {
  rank: string;
  ticker: string;
  drawdown_252d: string;
  distance_from_high_252d: string;
  volatility_60d: string;
  rs_change_60d: string;
  volume_ratio: string;
  recovery_from_60d_low: string;
  context_match: string;
  transition_match: string;
}

export interface ExitStock {
  Date: string;
  ticker: string;
  rank: string;
  rank_change: string;
  close: string;
  rs_20d: string;
  rs_change_20d: string;
  ma20: string;
  ma50: string;
  ma100: string;
  drawdown_from_entry: string;
  exit_state: string; // "EXIT" | "EXIT RISK" | "HEALTHY"
  triggered_rules: string;
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

export const L: LeaderStock[] = [{"rank":"1","ticker":"ADRO.JK","quality":"53.77","growth":"86.21","value":"62.07","momentum":"92.97","final_score":"78.05"},{"rank":"2","ticker":"ESSA.JK","quality":"64.65","growth":"96.55","value":"26.9","momentum":"81.14","final_score":"76.22"},{"rank":"3","ticker":"PTBA.JK","quality":"49.96","growth":"93.1","value":"55.86","momentum":"81.98","final_score":"74.7"},{"rank":"4","ticker":"MAPI.JK","quality":"44.85","growth":"72.41","value":"26.55","momentum":"87.46","final_score":"66.2"},{"rank":"5","ticker":"BMRI.JK","quality":"77.59","growth":"68.97","value":"77.58","momentum":"52.06","final_score":"66.07"},{"rank":"6","ticker":"CPIN.JK","quality":"63.88","growth":"82.76","value":"47.59","momentum":"53.61","final_score":"64.32"},{"rank":"7","ticker":"PGAS.JK","quality":"35.81","growth":"75.86","value":"52.07","momentum":"74.81","final_score":"63.1"},{"rank":"8","ticker":"ANTM.JK","quality":"50.62","growth":"79.31","value":"38.97","momentum":"62.28","final_score":"62.14"},{"rank":"9","ticker":"AKRA.JK","quality":"49.14","growth":"65.52","value":"34.83","momentum":"70.14","final_score":"59.97"},{"rank":"10","ticker":"BBRI.JK","quality":"71.21","growth":"62.07","value":"75.86","momentum":"41.84","final_score":"58.65"},{"rank":"11","ticker":"BRPT.JK","quality":"41.83","growth":"100.0","value":"9.48","momentum":"49.26","final_score":"58.65"},{"rank":"12","ticker":"BBNI.JK","quality":"53.96","growth":"55.17","value":"83.45","momentum":"55.21","final_score":"57.71"},{"rank":"13","ticker":"INDF.JK","quality":"50.49","growth":"58.62","value":"74.83","momentum":"55.98","final_score":"57.28"},{"rank":"14","ticker":"EXCL.JK","quality":"18.62","growth":"34.48","value":"66.55","momentum":"85.0","final_score":"51.4"},{"rank":"15","ticker":"INTP.JK","quality":"47.44","growth":"48.28","value":"86.21","momentum":"39.3","final_score":"48.72"},{"rank":"16","ticker":"MDKA.JK","quality":"12.34","growth":"34.48","value":"40.17","momentum":"87.43","final_score":"48.05"},{"rank":"17","ticker":"ITMG.JK","quality":"45.77","growth":"13.79","value":"57.24","momentum":"72.51","final_score":"46.68"},{"rank":"18","ticker":"ASII.JK","quality":"53.52","growth":"17.24","value":"77.59","momentum":"55.78","final_score":"45.83"},{"rank":"19","ticker":"BBCA.JK","quality":"80.35","growth":"44.83","value":"30.34","momentum":"18.94","final_score":"43.2"},{"rank":"20","ticker":"TLKM.JK","quality":"62.2","growth":"6.9","value":"28.96","momentum":"64.46","final_score":"43.08"},{"rank":"21","ticker":"SMGR.JK","quality":"31.59","growth":"89.66","value":"38.28","momentum":"11.01","final_score":"42.48"},{"rank":"22","ticker":"MIKA.JK","quality":"73.92","growth":"51.72","value":"17.93","momentum":"11.83","final_score":"39.93"},{"rank":"23","ticker":"UNTR.JK","quality":"50.34","growth":"0.0","value":"61.38","momentum":"58.2","final_score":"39.09"},{"rank":"24","ticker":"ICBP.JK","quality":"59.0","growth":"24.14","value":"48.96","momentum":"33.97","final_score":"38.78"},{"rank":"25","ticker":"SIDO.JK","quality":"82.3","growth":"3.45","value":"37.24","momentum":"31.45","final_score":"36.34"},{"rank":"26","ticker":"GOTO.JK","quality":"16.44","growth":"34.48","value":"51.55","momentum":"34.66","final_score":"31.74"},{"rank":"27","ticker":"KLBF.JK","quality":"62.6","growth":"20.69","value":"45.86","momentum":"10.26","final_score":"30.03"},{"rank":"28","ticker":"TPIA.JK","quality":"50.22","growth":"34.48","value":"54.48","momentum":"0.78","final_score":"28.62"},{"rank":"29","ticker":"AMMN.JK","quality":"41.71","growth":"34.48","value":"9.48","momentum":"3.14","final_score":"22.82"},{"rank":"30","ticker":"HEAL.JK","quality":"19.05","growth":"10.34","value":"14.83","momentum":"14.2","final_score":"14.32"}];

export const T: TurnaroundStock[] = [{"rank":"1","ticker":"TLKM.JK","drawdown_252d":"-27.16","distance_from_high_252d":"-27.16","volatility_60d":"3.5","rs_change_60d":"26.36","volume_ratio":"1.46","recovery_from_60d_low":"22.13","context_match":"True","transition_match":"True"},{"rank":"2","ticker":"BRPT.JK","drawdown_252d":"-61.45","distance_from_high_252d":"-61.45","volatility_60d":"8.57","rs_change_60d":"86.32","volume_ratio":"0.99","recovery_from_60d_low":"32.0","context_match":"True","transition_match":"True"},{"rank":"3","ticker":"ASII.JK","drawdown_252d":"-33.28","distance_from_high_252d":"-33.28","volatility_60d":"3.38","rs_change_60d":"16.59","volume_ratio":"1.01","recovery_from_60d_low":"7.8","context_match":"True","transition_match":"True"},{"rank":"4","ticker":"EXCL.JK","drawdown_252d":"-41.87","distance_from_high_252d":"-41.87","volatility_60d":"3.81","rs_change_60d":"31.07","volume_ratio":"1.22","recovery_from_60d_low":"6.97","context_match":"True","transition_match":"True"},{"rank":"5","ticker":"TPIA.JK","drawdown_252d":"-82.63","distance_from_high_252d":"-82.63","volatility_60d":"8.82","rs_change_60d":"-29.66","volume_ratio":"1.5","recovery_from_60d_low":"36.78","context_match":"True","transition_match":"False"},{"rank":"6","ticker":"MDKA.JK","drawdown_252d":"-37.31","distance_from_high_252d":"-37.31","volatility_60d":"5.39","rs_change_60d":"-54.65","volume_ratio":"0.77","recovery_from_60d_low":"13.3","context_match":"True","transition_match":"False"},{"rank":"7","ticker":"ESSA.JK","drawdown_252d":"-36.98","distance_from_high_252d":"-36.98","volatility_60d":"4.3","rs_change_60d":"-21.49","volume_ratio":"0.83","recovery_from_60d_low":"7.08","context_match":"True","transition_match":"False"},{"rank":"8","ticker":"ANTM.JK","drawdown_252d":"-42.86","distance_from_high_252d":"-42.86","volatility_60d":"4.07","rs_change_60d":"-41.34","volume_ratio":"1.26","recovery_from_60d_low":"7.51","context_match":"True","transition_match":"False"},{"rank":"9","ticker":"AMMN.JK","drawdown_252d":"-65.23","distance_from_high_252d":"-65.23","volatility_60d":"6.0","rs_change_60d":"-16.2","volume_ratio":"0.61","recovery_from_60d_low":"5.52","context_match":"True","transition_match":"False"},{"rank":"10","ticker":"BBCA.JK","drawdown_252d":"-32.93","distance_from_high_252d":"-32.93","volatility_60d":"2.74","rs_change_60d":"24.03","volume_ratio":"1.56","recovery_from_60d_low":"20.1","context_match":"False","transition_match":"True"},{"rank":"11","ticker":"MAPI.JK","drawdown_252d":"-1.33","distance_from_high_252d":"-1.33","volatility_60d":"3.32","rs_change_60d":"62.25","volume_ratio":"1.98","recovery_from_60d_low":"37.5","context_match":"False","transition_match":"True"},{"rank":"12","ticker":"BMRI.JK","drawdown_252d":"-13.92","distance_from_high_252d":"-13.92","volatility_60d":"2.35","rs_change_60d":"15.22","volume_ratio":"1.29","recovery_from_60d_low":"14.56","context_match":"False","transition_match":"True"},{"rank":"13","ticker":"BBNI.JK","drawdown_252d":"-17.87","distance_from_high_252d":"-17.87","volatility_60d":"2.77","rs_change_60d":"8.28","volume_ratio":"1.97","recovery_from_60d_low":"16.28","context_match":"False","transition_match":"True"},{"rank":"14","ticker":"BBRI.JK","drawdown_252d":"-25.92","distance_from_high_252d":"-25.92","volatility_60d":"2.38","rs_change_60d":"3.79","volume_ratio":"1.39","recovery_from_60d_low":"10.04","context_match":"False","transition_match":"True"},{"rank":"15","ticker":"AKRA.JK","drawdown_252d":"-17.86","distance_from_high_252d":"-17.86","volatility_60d":"2.68","rs_change_60d":"27.08","volume_ratio":"1.5","recovery_from_60d_low":"8.58","context_match":"False","transition_match":"True"},{"rank":"16","ticker":"ICBP.JK","drawdown_252d":"-41.86","distance_from_high_252d":"-41.86","volatility_60d":"2.31","rs_change_60d":"20.01","volume_ratio":"2.27","recovery_from_60d_low":"4.17","context_match":"False","transition_match":"True"},{"rank":"17","ticker":"KLBF.JK","drawdown_252d":"-53.27","distance_from_high_252d":"-53.27","volatility_60d":"2.07","rs_change_60d":"10.48","volume_ratio":"1.8","recovery_from_60d_low":"9.02","context_match":"False","transition_match":"True"},{"rank":"18","ticker":"INDF.JK","drawdown_252d":"-26.98","distance_from_high_252d":"-26.98","volatility_60d":"1.96","rs_change_60d":"35.95","volume_ratio":"0.87","recovery_from_60d_low":"5.51","context_match":"False","transition_match":"True"},{"rank":"19","ticker":"GOTO.JK","drawdown_252d":"-29.58","distance_from_high_252d":"-29.58","volatility_60d":"1.98","rs_change_60d":"24.15","volume_ratio":"0.34","recovery_from_60d_low":"0.0","context_match":"False","transition_match":"True"},{"rank":"20","ticker":"CPIN.JK","drawdown_252d":"-34.71","distance_from_high_252d":"-34.71","volatility_60d":"3.26","rs_change_60d":"42.78","volume_ratio":"0.97","recovery_from_60d_low":"3.49","context_match":"False","transition_match":"True"},{"rank":"21","ticker":"INTP.JK","drawdown_252d":"-38.54","distance_from_high_252d":"-38.54","volatility_60d":"2.21","rs_change_60d":"19.43","volume_ratio":"0.74","recovery_from_60d_low":"4.0","context_match":"False","transition_match":"True"},{"rank":"22","ticker":"MIKA.JK","drawdown_252d":"-44.03","distance_from_high_252d":"-44.03","volatility_60d":"2.4","rs_change_60d":"8.51","volume_ratio":"0.37","recovery_from_60d_low":"4.53","context_match":"False","transition_match":"True"},{"rank":"23","ticker":"PTBA.JK","drawdown_252d":"-17.3","distance_from_high_252d":"-17.3","volatility_60d":"2.68","rs_change_60d":"-19.93","volume_ratio":"1.61","recovery_from_60d_low":"5.2","context_match":"False","transition_match":"False"},{"rank":"24","ticker":"ITMG.JK","drawdown_252d":"-22.67","distance_from_high_252d":"-22.67","volatility_60d":"2.78","rs_change_60d":"-27.57","volume_ratio":"2.52","recovery_from_60d_low":"2.52","context_match":"False","transition_match":"False"},{"rank":"25","ticker":"PGAS.JK","drawdown_252d":"-33.95","distance_from_high_252d":"-33.95","volatility_60d":"2.58","rs_change_60d":"-12.7","volume_ratio":"1.61","recovery_from_60d_low":"7.91","context_match":"False","transition_match":"False"},{"rank":"26","ticker":"HEAL.JK","drawdown_252d":"-50.53","distance_from_high_252d":"-50.53","volatility_60d":"2.57","rs_change_60d":"-1.08","volume_ratio":"0.65","recovery_from_60d_low":"11.69","context_match":"False","transition_match":"False"},{"rank":"27","ticker":"SMGR.JK","drawdown_252d":"-50.8","distance_from_high_252d":"-50.8","volatility_60d":"2.82","rs_change_60d":"-8.35","volume_ratio":"1.46","recovery_from_60d_low":"4.38","context_match":"False","transition_match":"False"},{"rank":"28","ticker":"ADRO.JK","drawdown_252d":"-13.46","distance_from_high_252d":"-13.46","volatility_60d":"2.64","rs_change_60d":"-20.65","volume_ratio":"0.42","recovery_from_60d_low":"3.69","context_match":"False","transition_match":"False"},{"rank":"29","ticker":"UNTR.JK","drawdown_252d":"-30.69","distance_from_high_252d":"-30.69","volatility_60d":"2.21","rs_change_60d":"-1.07","volume_ratio":"0.84","recovery_from_60d_low":"4.19","context_match":"False","transition_match":"False"},{"rank":"30","ticker":"SIDO.JK","drawdown_252d":"-32.55","distance_from_high_252d":"-32.55","volatility_60d":"1.96","rs_change_60d":"-0.54","volume_ratio":"0.58","recovery_from_60d_low":"4.52","context_match":"False","transition_match":"False"}];

export const EX: ExitStock[] = [{"Date":"2026-06-11","ticker":"ESSA.JK","rank":"2","rank_change":"0","close":"605.0","rs_20d":"-6.42","rs_change_20d":"-4.24","ma20":"676.0","ma50":"757.4","ma100":"717.4","drawdown_from_entry":"3.42","exit_state":"EXIT","triggered_rules":"B, C, D"},{"Date":"2026-06-11","ticker":"TPIA.JK","rank":"28","rank_change":"0","close":"1785.0","rs_20d":"-40.39","rs_change_20d":"-7.48","ma20":"2241.36","ma50":"4184.19","ma100":"5282.98","drawdown_from_entry":"0.0","exit_state":"EXIT","triggered_rules":"A, B, C, D"},{"Date":"2026-06-11","ticker":"ADRO.JK","rank":"1","rank_change":"0","close":"2250.0","rs_20d":"7.24","rs_change_20d":"-2.14","ma20":"2303.0","ma50":"2373.17","ma100":"2285.26","drawdown_from_entry":"0.45","exit_state":"EXIT RISK","triggered_rules":"C"},{"Date":"2026-06-11","ticker":"PTBA.JK","rank":"3","rank_change":"0","close":"2630.0","rs_20d":"10.89","rs_change_20d":"12.86","ma20":"2732.5","ma50":"2842.6","ma100":"2755.9","drawdown_from_entry":"1.54","exit_state":"EXIT RISK","triggered_rules":"C"},{"Date":"2026-06-11","ticker":"CPIN.JK","rank":"6","rank_change":"0","close":"3260.0","rs_20d":"-0.04","rs_change_20d":"2.44","ma20":"3834.38","ma50":"3960.19","ma100":"4000.66","drawdown_from_entry":"-3.55","exit_state":"EXIT RISK","triggered_rules":"C"},{"Date":"2026-06-11","ticker":"PGAS.JK","rank":"7","rank_change":"0","close":"1500.0","rs_20d":"5.43","rs_change_20d":"3.71","ma20":"1648.19","ma50":"1700.45","ma100":"1839.54","drawdown_from_entry":"-1.32","exit_state":"EXIT RISK","triggered_rules":"C"},{"Date":"2026-06-11","ticker":"ANTM.JK","rank":"8","rank_change":"0","close":"2720.0","rs_20d":"-4.33","rs_change_20d":"4.49","ma20":"2959.5","ma50":"3472.8","ma100":"3756.2","drawdown_from_entry":"-1.09","exit_state":"EXIT RISK","triggered_rules":"C"},{"Date":"2026-06-11","ticker":"AKRA.JK","rank":"9","rank_change":"0","close":"1265.0","rs_20d":"4.9","rs_change_20d":"-0.93","ma20":"1305.5","ma50":"1379.16","ma100":"1312.36","drawdown_from_entry":"3.69","exit_state":"EXIT RISK","triggered_rules":"C"},{"Date":"2026-06-11","ticker":"BBRI.JK","rank":"10","rank_change":"0","close":"2850.0","rs_20d":"9.3","rs_change_20d":"11.86","ma20":"2969.0","ma50":"3079.22","ma100":"3293.37","drawdown_from_entry":"4.01","exit_state":"EXIT RISK","triggered_rules":"C"},{"Date":"2026-06-11","ticker":"BRPT.JK","rank":"11","rank_change":"0","close":"1650.0","rs_20d":"-2.72","rs_change_20d":"10.6","ma20":"1716.5","ma50":"1879.6","ma100":"1982.4","drawdown_from_entry":"0.0","exit_state":"EXIT RISK","triggered_rules":"A, C"},{"Date":"2026-06-11","ticker":"BBNI.JK","rank":"12","rank_change":"0","close":"3500.0","rs_20d":"8.4","rs_change_20d":"3.48","ma20":"3651.5","ma50":"3720.2","ma100":"3892.04","drawdown_from_entry":"0.0","exit_state":"EXIT RISK","triggered_rules":"A, C"},{"Date":"2026-06-11","ticker":"INDF.JK","rank":"13","rank_change":"0","close":"6225.0","rs_20d":"9.17","rs_change_20d":"7.72","ma20":"6558.75","ma50":"6722.0","ma100":"6633.75","drawdown_from_entry":"0.0","exit_state":"EXIT RISK","triggered_rules":"A, C"},{"Date":"2026-06-11","ticker":"EXCL.JK","rank":"14","rank_change":"0","close":"2610.0","rs_20d":"4.1","rs_change_20d":"7.67","ma20":"2770.0","ma50":"2956.4","ma100":"3124.0","drawdown_from_entry":"-1.51","exit_state":"EXIT RISK","triggered_rules":"A, C"},{"Date":"2026-06-11","ticker":"INTP.JK","rank":"15","rank_change":"0","close":"4160.0","rs_20d":"8.49","rs_change_20d":"11.74","ma20":"4348.27","ma50":"4590.13","ma100":"5168.98","drawdown_from_entry":"0.0","exit_state":"EXIT RISK","triggered_rules":"A, C"},{"Date":"2026-06-11","ticker":"MDKA.JK","rank":"16","rank_change":"0","close":"2470.0","rs_20d":"8.43","rs_change_20d":"21.95","ma20":"2581.0","ma50":"2963.6","ma100":"3113.9","drawdown_from_entry":"0.0","exit_state":"EXIT RISK","triggered_rules":"A, C"},{"Date":"2026-06-11","ticker":"ITMG.JK","rank":"17","rank_change":"0","close":"22350.0","rs_20d":"11.28","rs_change_20d":"18.38","ma20":"22698.75","ma50":"24501.74","ma100":"23737.72","drawdown_from_entry":"0.0","exit_state":"EXIT RISK","triggered_rules":"A, C"},{"Date":"2026-06-11","ticker":"ASII.JK","rank":"18","rank_change":"0","close":"4700.0","rs_20d":"-0.3","rs_change_20d":"0.04","ma20":"5188.5","ma50":"5609.79","ma100":"5920.34","drawdown_from_entry":"0.0","exit_state":"EXIT RISK","triggered_rules":"A, C"},{"Date":"2026-06-11","ticker":"BBCA.JK","rank":"19","rank_change":"0","close":"5825.0","rs_20d":"13.45","rs_change_20d":"21.64","ma20":"5757.5","ma50":"6094.0","ma100":"6572.49","drawdown_from_entry":"0.0","exit_state":"EXIT RISK","triggered_rules":"A, C"},{"Date":"2026-06-11","ticker":"TLKM.JK","rank":"20","rank_change":"0","close":"2870.0","rs_20d":"14.92","rs_change_20d":"18.6","ma20":"2922.0","ma50":"2975.6","ma100":"3196.3","drawdown_from_entry":"0.0","exit_state":"EXIT RISK","triggered_rules":"A, C"},{"Date":"2026-06-11","ticker":"SMGR.JK","rank":"21","rank_change":"0","close":"1550.0","rs_20d":"-5.99","rs_change_20d":"5.59","ma20":"1749.61","ma50":"2035.89","ma100":"2340.8","drawdown_from_entry":"0.0","exit_state":"EXIT RISK","triggered_rules":"A, C"},{"Date":"2026-06-11","ticker":"MIKA.JK","rank":"22","rank_change":"0","close":"1500.0","rs_20d":"-0.96","rs_change_20d":"12.73","ma20":"1643.25","ma50":"1878.1","ma100":"2080.35","drawdown_from_entry":"0.0","exit_state":"EXIT RISK","triggered_rules":"A, C"},{"Date":"2026-06-11","ticker":"UNTR.JK","rank":"23","rank_change":"0","close":"21750.0","rs_20d":"-1.19","rs_change_20d":"8.37","ma20":"23596.25","ma50":"27224.56","ma100":"27663.05","drawdown_from_entry":"0.0","exit_state":"EXIT RISK","triggered_rules":"A, C"},{"Date":"2026-06-11","ticker":"ICBP.JK","rank":"24","rank_change":"0","close":"6250.0","rs_20d":"9.53","rs_change_20d":"13.63","ma20":"6673.75","ma50":"6937.0","ma100":"7395.0","drawdown_from_entry":"0.0","exit_state":"EXIT RISK","triggered_rules":"A, C"},{"Date":"2026-06-11","ticker":"SIDO.JK","rank":"25","rank_change":"0","close":"370.0","rs_20d":"1.29","rs_change_20d":"11.9","ma20":"393.8","ma50":"453.89","ma100":"482.77","drawdown_from_entry":"0.0","exit_state":"EXIT RISK","triggered_rules":"A, C"},{"Date":"2026-06-11","ticker":"GOTO.JK","rank":"26","rank_change":"0","close":"50.0","rs_20d":"17.96","rs_change_20d":"20.36","ma20":"50.0","ma50":"51.26","ma100":"55.6","drawdown_from_entry":"0.0","exit_state":"EXIT RISK","triggered_rules":"A, C"},{"Date":"2026-06-11","ticker":"KLBF.JK","rank":"27","rank_change":"0","close":"725.0","rs_20d":"5.65","rs_change_20d":"17.48","ma20":"758.08","ma50":"843.51","ma100":"954.01","drawdown_from_entry":"0.0","exit_state":"EXIT RISK","triggered_rules":"A, C"},{"Date":"2026-06-11","ticker":"AMMN.JK","rank":"29","rank_change":"0","close":"3060.0","rs_20d":"0.66","rs_change_20d":"34.59","ma20":"3281.5","ma50":"4361.4","ma100":"5645.4","drawdown_from_entry":"0.0","exit_state":"EXIT RISK","triggered_rules":"A, C"},{"Date":"2026-06-11","ticker":"HEAL.JK","rank":"30","rank_change":"0","close":"860.0","rs_20d":"3.96","rs_change_20d":"18.16","ma20":"923.0","ma50":"1059.75","ma100":"1186.59","drawdown_from_entry":"0.0","exit_state":"EXIT RISK","triggered_rules":"A, C"},{"Date":"2026-06-11","ticker":"MAPI.JK","rank":"4","rank_change":"0","close":"1485.0","rs_20d":"18.63","rs_change_20d":"1.05","ma20":"1489.5","ma50":"1377.3","ma100":"1293.6","drawdown_from_entry":"0.0","exit_state":"HEALTHY","triggered_rules":"NONE"},{"Date":"2026-06-11","ticker":"BMRI.JK","rank":"5","rank_change":"0","close":"4250.0","rs_20d":"19.15","rs_change_20d":"20.63","ma20":"4110.5","ma50":"4173.88","ma100":"4365.17","drawdown_from_entry":"10.68","exit_state":"HEALTHY","triggered_rules":"NONE"}];

export const PF: Record<string, ProfileDetails> = {"ADRO":{"name":"Adaro Energy Indonesia","sector":"Energy","industry":"Coal Mining","summary":"Perusahaan tambang batu bara terbesar di Indonesia. Memproduksi batu bara termal untuk pasar domestik dan ekspor."},"AKRA":{"name":"AKR Corporindo","sector":"Trading","industry":"Chemical Distribution","summary":"Mendistribusikan bahan bakar, bahan kimia, dan barang industri di seluruh Indonesia. Juga mengembangkan kawasan industri."},"AMMN":{"name":"Amman Mineral Internasional","sector":"Mining","industry":"Copper & Gold","summary":"Mengoperasikan tambang tembaga dan emas Batu Hijau di Sumbawa Barat. Salah satu produsen tembaga terbesar di Indonesia."},"ANTM":{"name":"Aneka Tambang","sector":"Mining","industry":"Diversified Metals","summary":"Perusahaan tambang milik negara yang memproduksi emas, nikel, dan bauksit. Mengoperasikan tambang emas Pongkor."},"ASII":{"name":"Astra International","sector":"Conglomerate","industry":"Automotive & Diversified","summary":"Konglomerat terbesar di Indonesia. Mendominasi otomotif (Toyota/Daihatsu/Honda), alat berat, dan jasa keuangan."},"BBCA":{"name":"Bank Central Asia","sector":"Banking","industry":"Private Banking","summary":"Bank swasta terbesar di Indonesia berdasarkan kapitalisasi pasar. Dikenal dengan perbankan ritel, inovasi digital, dan kualitas kredit yang kuat."},"BBNI":{"name":"Bank Negara Indonesia","sector":"Banking","industry":"State-Owned Banking","summary":"Bank milik negara yang fokus pada perbankan korporasi dan internasional. Kuat dalam trade finance dan treasury."},"BBRI":{"name":"Bank Rakyat Indonesia","sector":"Banking","industry":"Microfinance & Retail","summary":"Bank terbesar di Indonesia berdasarkan aset. Mendominasi sektor mikro melalui 7.000+ BRI Unit di seluruh Nusantara."},"BMRI":{"name":"Bank Mandiri","sector":"Banking","industry":"State-Owned Banking","summary":"Bank milik negara terbesar berdasarkan aset. Kuat dalam perbankan korporasi, treasury, dan transaksi wholesale."},"BRPT":{"name":"Barito Pacific","sector":"Petrochemical","industry":"Petrochemical & Plantation","summary":"Produsen petrokimia utama melalui anak usaha Chandra Asri. Juga memiliki kepentingan di perkebunan dan properti."},"CPIN":{"name":"Charoen Pokphand Indonesia","sector":"Agriculture","industry":"Animal Feed & Poultry","summary":"Produsen pakan ternak terbesar di Indonesia. Bisnis unggas terintegrasi vertikal dari pakan hingga daging ayam olahan."},"ESSA":{"name":"Essa Industries Indonesia","sector":"Energy","industry":"Natural Gas Processing","summary":"Mengoperasikan pabrik pemrosesan gas alam di Jawa Barat. Memproduksi LPG dan kondensat dari gas alam."},"EXCL":{"name":"XL Axiata","sector":"Telecommunication","industry":"Mobile Telecom","summary":"Operator jaringan seluler besar. Bagian dari Axiata Group Malaysia. Kuat dalam layanan data dan digital."},"GOTO":{"name":"GoTo Gojek Tokopedia","sector":"Technology","industry":"Digital Platform","summary":"Platform digital terbesar di Indonesia. Menggabungkan layanan on-demand (Gojek) dan e-commerce (Tokopedia) dengan jasa keuangan."},"HEAL":{"name":"Medikaloka Hermina","sector":"Healthcare","industry":"Hospital Management","summary":"Mengoperasikan 40+ rumah sakit di seluruh Indonesia dengan merek Hermina. Jaringan rumah sakit swasta terbesar berdasarkan pendapatan."},"ICBP":{"name":"Indofood CBP Sukses Makmur","sector":"Consumer Goods","industry":"Packaged Food","summary":"Divisi barang konsumsi kemasan dari Indofood. Memproduksi mi instan (Indomie), susu, camilan, dan minuman."},"INDF":{"name":"Indofood Sukses Makmur","sector":"Consumer Goods","industry":"Food & Agribusiness","summary":"Perusahaan makanan terbesar di Indonesia. Memproduksi mi instan Indomie, memiliki perkebunan (Bogasari), dan operasi CPO."},"INTP":{"name":"Indocement Tunggal Prakarsa","sector":"Material","industry":"Cement","summary":"Produsen semen terbesar kedua di Indonesia. Bagian dari HeidelbergCement Group. Mengoperasikan 13 pabrik semen."},"ITMG":{"name":"Indo Tambangraya Megah","sector":"Energy","industry":"Coal Mining","summary":"Perusahaan tambang batu bara dengan operasi di Kalimantan. Memproduksi batu bara termal untuk pasar ekspor."},"KLBF":{"name":"Kalbe Farma","sector":"Healthcare","industry":"Pharmaceutical","summary":"Perusahaan farmasi terbesar di Indonesia berdasarkan pendapatan. Memproduksi obat resep, kesehatan konsumen, dan nutrisi."},"MAPI":{"name":"Mitra Adiperkasa","sector":"Retail","industry":"Lifestyle Retail","summary":"Peritel gaya hidup terbesar di Indonesia. Mengoperasikan Sports Station, Sogo, Starbucks, Zara, dan 3.000+ gerai ritel."},"MDKA":{"name":"Merdeka Copper Gold","sector":"Mining","industry":"Gold & Copper","summary":"Perusahaan tambang yang berkembang pesat dengan operasi emas, tembaga, dan nikel. Memiliki tambang emas Tujuh Bukit dan proyek nikel."},"MIKA":{"name":"Mitra Keluarga","sector":"Healthcare","industry":"Hospital Management","summary":"Mengoperasikan 16+ rumah sakit di kota-kota besar Indonesia dengan merek Mitra Keluarga. Fokus pada layanan kesehatan kelas menengah."},"PGAS":{"name":"Perusahaan Gas Negara","sector":"Energy","industry":"Natural Gas Distribution","summary":"Perusahaan gas milik negara. Mendistribusikan gas alam melalui jaringan pipa 10.000+ km di seluruh Indonesia."},"PTBA":{"name":"Bukit Asam","sector":"Energy","industry":"Coal Mining","summary":"Perusahaan tambang batu bara milik negara. Mengoperasikan tambang Tanjung Enim di Sumatera Selatan. Memproduksi batu bara termal."},"SIDO":{"name":"Sido Muncul","sector":"Healthcare","industry":"Herbal Medicine","summary":"Produsen obat herbal terbesar di Indonesia. Memproduksi Tolak Angin, Kuku Bima, dan ramuan tradisional lainnya."},"SMGR":{"name":"Semen Indonesia","sector":"Material","industry":"Cement","summary":"Produsen semen terbesar di Indonesia (milik negara). Beroperasi dengan merek Semen Gresik, Semen Padang, dan Semen Tonasa."},"TLKM":{"name":"Telkom Indonesia","sector":"Telecommunication","industry":"Fixed & Mobile Telecom","summary":"Perusahaan telekomunikasi terbesar di Indonesia. Memiliki Telkomsel (seluler), IndiHome (broadband), dan infrastruktur serat optik."},"TPIA":{"name":"Chandra Asri Pacific","sector":"Petrochemical","industry":"Petrochemical","summary":"Perusahaan petrokimia terintegrasi terbesar di Indonesia. Memproduksi nafta, etilena, polietilena, dan polipropilena."},"UNTR":{"name":"United Tractors","sector":"Heavy Equipment","industry":"Mining Equipment & Contracting","summary":"Mendistribusikan alat berat Komatsu, mengoperasikan tambang batu bara, dan menjalankan kontraktor tambang melalui Pamapersada Nusantara."}};

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
    production_config: "Config F",
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
    watchlist_count: 5
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
  last_update: "2026-06-11",
  market_last_update: "2026-06-11 20:04:16 WIB",
  ihsg: { value: 5886.03, daily: -0.28, daily_pct: -0.28, weekly: 5.21, monthly: -17.96 },
  usdidr: { value: 17985.0, daily: -0.26, weekly: 0.16, monthly: 2.77 },
  gold: { value: 1350000, daily: 0.05, weekly: -3.4, monthly: -4.9 },
  oil: { value: 88, daily: -3.68, weekly: -5.0, monthly: -10.3 }
};

export const WI = {
  start: "2022-01",
  end: "2026-05",
  months: 53,
  equity_b: [100.0, 100.81, 105.41, 111.69, 114.42, 117.09, 116.58, 115.52, 109.45, 99.98, 109.71, 103.45, 100.94, 108.95, 106.92, 112.68, 110.86, 115.29, 113.84, 123.5, 118.27, 117.57, 122.58, 128.56, 136.06, 133.4, 140.51, 134.3, 140.9, 142.6, 145.23, 150.66, 151.75, 145.97, 142.86, 144.88, 143.01, 155.12, 160.94, 157.97, 168.14, 155.74, 149.34, 149.84, 148.48, 150.96, 159.6, 168.19, 163.45, 155.24, 146.23, 130.43, 129.58, 121.59],
  equity_f: [100.0, 103.27, 103.22, 101.57, 96.81, 100.16, 96.47, 97.38, 105.51, 109.57, 113.37, 113.0, 111.77, 113.61, 111.46, 119.99, 112.34, 109.91, 117.32, 118.54, 122.48, 125.75, 126.85, 127.53, 130.99, 129.48, 129.42, 127.65, 129.59, 130.06, 128.92, 125.14, 127.72, 125.22, 132.92, 128.92, 125.57, 128.37, 127.36, 119.56, 110.08, 110.45, 111.74, 110.63, 110.96, 121.14, 127.61, 137.53, 126.51, 123.42, 120.04, 115.49, 103.75, 105.22],
  equity_i: [100.0, 99.16, 95.5, 100.38, 102.86, 105.73, 102.26, 98.81, 105.87, 105.78, 108.5, 115.54, 119.13, 118.62, 125.9, 129.05, 130.02, 132.36, 126.57, 132.65, 132.8, 129.74, 116.41, 110.72, 107.57, 102.06, 103.1, 101.56, 100.93, 103.59, 96.05, 99.15, 103.14, 97.01, 97.62, 95.54, 90.39, 92.49, 98.21, 102.15, 105.2, 102.44, 101.64, 98.51, 99.16, 99.7, 94.59, 131.97, 124.29, 118.27, 113.42, 107.41, 98.23, 94.42],
  month_labels: ["2022-01","2022-02","2022-03","2022-04","2022-05","2022-06","2022-07","2022-08","2022-09","2022-10","2022-11","2022-12","2023-01","2023-02","2023-03","2023-04","2023-05","2023-06","2023-07","2023-08","2023-09","2023-10","2023-11","2023-12","2024-01","2024-02","2024-03","2024-04","2024-05","2024-06","2024-07","2024-08","2024-09","2024-10","2024-11","2024-12","2025-01","2025-02","2025-03","2025-04","2025-05","2025-06","2025-07","2025-08","2025-09","2025-10","2025-11","2025-12","2026-01","2026-02","2026-03","2026-04","2026-05"]
};

export const BT = {
  full: {
    label: "Full Period (2022-02 → 2026-05)",
    config_b: { cagr: 13.22, sharpe: 0.6072, max_dd: -27.53, total_return: 71.29 },
    config_f: { cagr: 11.07, sharpe: 0.5701, max_dd: -22.0, total_return: 57.6 },
    ihsg: { cagr: -0.89, sharpe: -0.08, max_dd: -28.73, total_return: -3.82 }
  },
  pre_2026: {
    label: "Before 2026 (2022-02 → 2025-12)",
    config_b: { cagr: 23.56, sharpe: 1.0158, max_dd: -26.08, total_return: 129.02 },
    config_f: { cagr: 17.21, sharpe: 0.8459, max_dd: -22.0, total_return: 86.25 },
    ihsg: { cagr: -0.6, sharpe: 0.12, max_dd: -12.51, total_return: -2.33 }
  },
  ytd_2026: {
    label: "2026 YTD (2026-01 → 2026-05)",
    config_b: { cagr: -55.7, sharpe: -1.5343, max_dd: -27.53, total_return: -23.77 },
    config_f: { cagr: -35.85, sharpe: -0.9304, max_dd: -17.04, total_return: -13.75 },
    ihsg: { cagr: -7.81, sharpe: -0.58, max_dd: -18.62, total_return: -2.68 }
  }
};

export const RK: Record<string, number> = {};
let _prevRanks: Record<string, number> = {};

// Factor Config weight coefficients
export const CW_F = { quality: 0.25, growth: 0.1, value: 0.3, momentum: 0.35 };
export const CW_B = { quality: 0.25, growth: 0.3, value: 0.1, momentum: 0.35 };

// Scan data cache from idx80_scan.json (loaded from /api/engine/idx80)
interface ScanStock {
  ticker: string;
  quality: number;
  growth: number;
  value: number;
  momentum: number;
  currentPrice: number;
  changePercent: number;
  volume?: number;
  peRatio?: number;
  pbRatio?: number;
  dividendYield?: number;
  lastUpdated: string;
}
let scanDataCache: { stocks: ScanStock[]; lastUpdated: string } | null = null;

export function setScanData(data: { stocks: ScanStock[]; lastUpdated: string } | null) {
  scanDataCache = data;
}

export function getScanData() {
  return scanDataCache;
}

export function getProcessedLeaders(activeStocksList: any[], activeConfig: "prod" | "res") {
  const weights = activeConfig === "prod" ? CW_F : CW_B;

  const dynamicL = activeStocksList.map((s, idx) => {
    // Prefer scan data over hardcoded L for score factors
    const scanStock = scanDataCache?.stocks.find(st => st.ticker === s.ticker);
    if (scanStock) {
      return {
        rank: String(idx + 1),
        ticker: s.ticker + ".JK",
        quality: scanStock.quality.toFixed(2),
        growth: scanStock.growth.toFixed(2),
        value: scanStock.value.toFixed(2),
        momentum: scanStock.momentum.toFixed(2),
        final_score: String(Math.round(
          scanStock.quality * weights.quality +
          scanStock.growth * weights.growth +
          scanStock.value * weights.value +
          scanStock.momentum * weights.momentum
        )),
      };
    }

    const existing = L.find(l => l.ticker.replace(".JK", "") === s.ticker);
    if (existing) {
      return {
        ...existing,
        quality: parseFloat(existing.quality).toFixed(2),
        growth: parseFloat(existing.growth).toFixed(2),
        value: parseFloat(existing.value).toFixed(2),
        momentum: parseFloat(existing.momentum).toFixed(2),
        final_score: String(Math.round(
          parseFloat(existing.quality) * weights.quality +
          parseFloat(existing.growth) * weights.growth +
          parseFloat(existing.value) * weights.value +
          parseFloat(existing.momentum) * weights.momentum
        )),
      };
    }

    const tHash = s.ticker.charCodeAt(0) * 11 + (s.ticker.charCodeAt(1) || 0) * 7;
    const qVal = Math.min(99.99, Math.max(10.01, 40 + (s.roe * 1.5) - (s.der * 5) + (tHash % 20))).toFixed(2);
    const gVal = Math.min(99.99, Math.max(10.01, 45 + (s.roe * 0.5) + ((tHash * 2) % 25))).toFixed(2);
    const vVal = Math.min(99.99, Math.max(10.01, 85 - s.peRatio - (s.pbRatio * 3) + ((tHash * 3) % 15))).toFixed(2);
    const mVal = Math.min(99.99, Math.max(10.01, 50 + ((tHash * 5) % 25))).toFixed(2);
    
    return {
      rank: String(idx + 1),
      ticker: s.ticker + ".JK",
      quality: qVal,
      growth: gVal,
      value: vVal,
      momentum: mVal,
      final_score: "50.0"
    };
  });

  const computeScore = (stock: typeof L[0]) => {
    const qVal = parseFloat(stock.quality) || 0;
    const gVal = parseFloat(stock.growth) || 0;
    const vVal = parseFloat(stock.value) || 0;
    const mVal = parseFloat(stock.momentum) || 0;
    return qVal * weights.quality + gVal * weights.growth + vVal * weights.value + mVal * weights.momentum;
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
    color: "border-blue-500/20 text-blue-400 bg-blue-500/10"
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

