// ─────────────────────────────────────────────────────────────
// ConfigSyncIndicator — yellow SYNC button shown in the AppHeader
// when backtestConfig diverges from engineConfig. Clicking it
// pushes the backtest sandbox settings into the live portfolio
// config via syncFromBacktest().
//
// Lives INSIDE EngineConfigProvider (uses the context directly),
// but is positioned absolutely at the top-right of the page so
// it overlays the AppHeader without restructuring that component.
// ─────────────────────────────────────────────────────────────
import { ArrowRightLeft } from "lucide-react";
import { useEngineConfig, type StrategySnapshot } from "../contexts/EngineConfigContext";

export function ConfigSyncIndicator() {
  const { backtestConfig, engineConfig, isConfigSynced, syncFromBacktest } = useEngineConfig();

  if (isConfigSynced) return null;

  const buildSnapshot = (): Omit<StrategySnapshot, "syncedAt"> => {
    const profile = backtestConfig.profiles.find(p => p.id === backtestConfig.activeProfileId)
      || backtestConfig.profiles[0];
    return {
      profile,
      simulationMode: backtestConfig.simulationMode,
      universe: backtestConfig.universe,
      customUniverse: [...(backtestConfig.customUniverse || [])],
      topNCount: backtestConfig.topNCount,
      singleTicker: backtestConfig.singleTicker,
      singleSellTrigger: backtestConfig.singleSellTrigger,
      singleBuyTrigger: backtestConfig.singleBuyTrigger,
      enableCrashProtection: backtestConfig.enableCrashProtection,
      crashSensitivity: backtestConfig.crashSensitivity,
      safeHavenAsset: backtestConfig.safeHavenAsset,
      enableCrossover: backtestConfig.enableCrossover,
      reserveBufferPct: backtestConfig.reserveBufferPct,
      enableAdaptiveWeights: backtestConfig.enableAdaptiveWeights,
    };
  };

  return (
    <button
      onClick={() => syncFromBacktest(buildSnapshot())}
      title="Backtest config differs from Portfolio. Click to push backtest settings to live engine."
      className="fixed top-2 right-32 md:right-36 z-50 flex items-center gap-1.5 px-2.5 h-7 rounded-md bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25 transition-colors cursor-pointer shadow-sm backdrop-blur-sm"
    >
      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
      <ArrowRightLeft className="w-3 h-3" />
      <span className="text-label font-bold uppercase tracking-widest font-mono">Sync Backtest</span>
    </button>
  );
}
