import { createContext, useContext, useState, type ReactNode } from "react";

export interface BacktestContextType {
  simTicker: string;
  setSimTicker: (t: string) => void;
  simStartDate: string;
  setSimStartDate: (d: string) => void;
  simEndDate: string;
  setSimEndDate: (d: string) => void;
  algoCapital: string;
  setAlgoCapital: (c: string) => void;
  simulationMode: "algo" | "single";
  setSimulationMode: (m: "algo" | "single") => void;
  simUniverse: "all" | "idx80" | "idx30" | "lq45";
  setSimUniverse: (u: "all" | "idx80" | "idx30" | "lq45") => void;
  numStocks: 1 | 3 | 5;
  setNumStocks: (n: 1 | 3 | 5) => void;
  enableCrossover: boolean;
  setEnableCrossover: (v: boolean) => void;
  enableCrashProtection: boolean;
  setEnableCrashProtection: (v: boolean) => void;
  crashSensitivity: number;
  setCrashSensitivity: (v: number) => void;
  safeHavenAsset: "emas" | "kas";
  setSafeHavenAsset: (a: "emas" | "kas") => void;
  singleSellTrigger: number;
  setSingleSellTrigger: (v: number) => void;
  singleBuyTrigger: number;
  setSingleBuyTrigger: (v: number) => void;
  reserveBufferPct: number;
  setReserveBufferPct: (v: number) => void;
  backtestConfigType: "prod" | "res";
  setBacktestConfigType: (c: "prod" | "res") => void;
  isBacktesting: boolean;
  backtestResult: any;
  triggerRun: number;
  triggerBacktest: () => void;
  setBacktesting: (v: boolean) => void;
  setBacktestResult: (r: any) => void;
  todayWIBStr: string;
}

const BacktestContext = createContext<BacktestContextType | null>(null);

const getTodayWIB = () => {
  const d = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
};

export function BacktestProvider({ children }: { children: ReactNode }) {
  const [simTicker, setSimTicker] = useState("BBCA");
  const [simStartDate, setSimStartDate] = useState("2000-01-03");
  const todayWIBStr = getTodayWIB();
  const [simEndDate, setSimEndDate] = useState(todayWIBStr);
  const [algoCapital, setAlgoCapital] = useState("100000000");
  const [simulationMode, setSimulationMode] = useState<"algo" | "single">("algo");
  const [simUniverse, setSimUniverse] = useState<"all" | "idx80" | "idx30" | "lq45">("idx80");
  const [numStocks, setNumStocks] = useState<1 | 3 | 5>(5);
  const [enableCrossover, setEnableCrossover] = useState(true);
  const [enableCrashProtection, setEnableCrashProtection] = useState(true);
  const [crashSensitivity, setCrashSensitivity] = useState(5);
  const [safeHavenAsset, setSafeHavenAsset] = useState<"emas" | "kas">("emas");
  const [singleSellTrigger, setSingleSellTrigger] = useState(8);
  const [singleBuyTrigger, setSingleBuyTrigger] = useState(5);
  const [reserveBufferPct, setReserveBufferPct] = useState(10);
  const [backtestConfigType, setBacktestConfigType] = useState<"prod" | "res">("prod");
  const [isBacktesting, setBacktesting] = useState(false);
  const [backtestResult, setBacktestResult] = useState<any>(null);
  const [triggerRun, setTriggerRun] = useState(0);

  const triggerBacktest = () => setTriggerRun(t => t + 1);

  return (
    <BacktestContext.Provider value={{
      simTicker, setSimTicker,
      simStartDate, setSimStartDate,
      simEndDate, setSimEndDate,
      algoCapital, setAlgoCapital,
      simulationMode, setSimulationMode,
      simUniverse, setSimUniverse,
      numStocks, setNumStocks,
      enableCrossover, setEnableCrossover,
      enableCrashProtection, setEnableCrashProtection,
      crashSensitivity, setCrashSensitivity,
      safeHavenAsset, setSafeHavenAsset,
      singleSellTrigger, setSingleSellTrigger,
      singleBuyTrigger, setSingleBuyTrigger,
      reserveBufferPct, setReserveBufferPct,
      backtestConfigType, setBacktestConfigType,
      isBacktesting, backtestResult,
      triggerRun, triggerBacktest,
      setBacktesting, setBacktestResult,
      todayWIBStr,
    }}>
      {children}
    </BacktestContext.Provider>
  );
}

export function useBacktest() {
  const ctx = useContext(BacktestContext);
  if (!ctx) throw new Error("useBacktest must be used within BacktestProvider");
  return ctx;
}
