import { useState } from "react";
import { Layers, ShieldAlert, Settings2, ChevronDown, ChevronUp, Wallet } from "lucide-react";

export interface StrategyConfigShape {
  activeProfileId: "aman" | "agresif" | "dividen" | string;
  simulationMode: "algo" | "custom";
  universe: "all" | "idx80" | "idx30" | "lq45" | string;
  topNCount: number;
  enableCrossover: boolean;
  enableCrashProtection: boolean;
  crashSensitivity: number;
  safeHavenAsset: "emas" | "kas" | string;
  reserveBufferPct: number;
  customUniverse: string[];
}

interface StrategySettingsPanelProps {
  config: StrategyConfigShape;
  onChange: (key: keyof StrategyConfigShape, value: any) => void;
  /** When true, all inputs are greyed out (read-only display mode) */
  disabled?: boolean;
  /** Tooltip shown on hover when disabled */
  disabledTooltip?: string;
  /** Optional override for the universe buttons (default: Semua/IDX80/IDX30/LQ45) */
  universeOptions?: ReadonlyArray<readonly [string, string]>;
  /** Optional override for the profile buttons (default: Aman/Agresif/Dividen) */
  profileOptions?: ReadonlyArray<readonly [string, string]>;
  /** Optional title for the section. Default: "Profil & Mode" + "Rotasi & Risiko" */
  showTitle?: boolean;
}

const DEFAULT_UNIVERSE: ReadonlyArray<readonly [string, string]> = [
  ["all", "Semua"],
  ["idx80", "IDX80"],
  ["idx30", "IDX30"],
  ["lq45", "LQ45"],
];

const DEFAULT_PROFILE: ReadonlyArray<readonly [string, string]> = [
  ["aman", "Aman"],
  ["agresif", "Agresif"],
  ["dividen", "Dividen"],
];

/**
 * Unified strategy settings panel — used identically by Portfolio sidebar
 * (write) and Backtest sidebar (read-only when toggle ON, write when OFF).
 *
 * Renders two collapsible groups:
 *   1. Profil & Mode — profile, simulation mode, universe, custom universe
 *   2. Rotasi & Risiko — top N, crossover, crash protection, safe haven, buffer
 *
 * Order and labels are identical in both contexts so the user can confidently
 * read/write the same fields from either tab.
 */
export function StrategySettingsPanel({
  config,
  onChange,
  disabled = false,
  disabledTooltip = "Locked ke Strategi Portofolio Anda. Toggle off DRAFT MODE di header Backtest untuk edit.",
  universeOptions = DEFAULT_UNIVERSE,
  profileOptions = DEFAULT_PROFILE,
  showTitle = true,
}: StrategySettingsPanelProps) {
  const [risikoOpen, setRisikoOpen] = useState(true);

  // Reusable button group renderer (used for Mode / Profile / Universe / Safe Haven)
  const ButtonGroup = <K extends string>({
    options,
    value,
    onPick,
    ariaLabel,
  }: {
    options: ReadonlyArray<readonly [K, string]>;
    value: K;
    onPick: (k: K) => void;
    ariaLabel: string;
  }) => (
    <div className="flex gap-1 flex-wrap" role="group" aria-label={ariaLabel}>
      {options.map(([k, label]) => (
        <button
          key={k}
          type="button"
          onClick={() => onPick(k)}
          disabled={disabled}
          title={disabled ? disabledTooltip : undefined}
          className="flex-1 py-1 text-caption font-medium rounded-md transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            backgroundColor: value === k ? "rgba(0,201,165,0.15)" : "rgba(255,255,255,0.04)",
            color: value === k ? "#00c9a5" : "#7a7a7a",
            border: "1px solid " + (value === k ? "rgba(0,201,165,0.3)" : "rgba(255,255,255,0.06)"),
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-3">
      {/* === Section 1: Profil & Mode === */}
      <div className="mx-2">
        {showTitle && (
          <div className="px-2 py-1 flex items-center gap-1.5 border-b border-white/[0.04]">
            <Settings2 className="w-3 h-3 text-tertiary" />
            <span className="text-caption font-medium text-tertiary uppercase tracking-wider">Profil & Mode</span>
          </div>
        )}
        <div className="px-2 py-2 space-y-2.5">
          {/* Profile */}
          <div>
            <span className="text-label text-tertiary block mb-1">Profil</span>
            <ButtonGroup
              options={profileOptions}
              value={config.activeProfileId}
              onPick={(k) => onChange("activeProfileId", k)}
              ariaLabel="Profil strategi"
            />
          </div>

          {/* Simulation Mode */}
          <div>
            <span className="text-label text-tertiary block mb-1">Mode</span>
            <ButtonGroup
              options={[
                ["algo", "Algo"],
                ["custom", "Custom"],
              ] as const}
              value={config.simulationMode as "algo" | "custom"}
              onPick={(k) => onChange("simulationMode", k)}
              ariaLabel="Mode simulasi"
            />
            <p className="text-label text-tertiary mt-1.5 leading-relaxed">
              {config.simulationMode === "custom"
                ? "Universe eksklusif — tidak ada rank check, keluar hanya kalau ticker keluar dari custom list."
                : "Rebalancing bulanan berdasarkan ranking profil."}
            </p>
          </div>

          {/* Universe */}
          <div>
            <span className="text-label text-tertiary block mb-1">Universe</span>
            <ButtonGroup
              options={universeOptions}
              value={config.universe as any}
              onPick={(k) => onChange("universe", k)}
              ariaLabel="Universe"
            />
          </div>

          
        </div>
      </div>

      {/* === Section 2: Rotasi & Risiko (collapsible) === */}
      <div className="mx-2">
        <button
          type="button"
          onClick={() => setRisikoOpen(!risikoOpen)}
          disabled={disabled}
          className="w-full px-2 py-1 flex items-center gap-1.5 border-b border-white/[0.04] cursor-pointer disabled:cursor-not-allowed"
        >
          <ShieldAlert className="w-3 h-3 text-tertiary" />
          <span className="text-caption font-medium text-tertiary uppercase tracking-wider">Rotasi & Risiko</span>
          {risikoOpen ? (
            <ChevronUp className="w-3 h-3 text-tertiary ml-auto" />
          ) : (
            <ChevronDown className="w-3 h-3 text-tertiary ml-auto" />
          )}
        </button>
        {risikoOpen && (
          <div className="px-2 py-2 space-y-2.5">
            {/* Top N */}
            <div>
              <span className="text-label text-tertiary block mb-1">Jumlah Saham (Top N)</span>
              <ButtonGroup
                options={[
                  ["1", "1"],
                  ["3", "3"],
                  ["5", "5"],
                  ["10", "10"],
                ] as const}
                value={String(config.topNCount) as any}
                onPick={(k) => onChange("topNCount", parseInt(k, 10))}
                ariaLabel="Jumlah saham Top N"
              />
            </div>

            {/* Crossover */}
            <div>
              <span className="text-label text-tertiary block mb-1">Rotasi Saham (Crossover)</span>
              <ButtonGroup
                options={[
                  ["true", "Rank &lt; 7"],
                  ["false", "Tanpa"],
                ] as const}
                value={String(config.enableCrossover) as any}
                onPick={(k) => onChange("enableCrossover", k === "true")}
                ariaLabel="Crossover"
              />
            </div>

            {/* Crash Protection */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-label text-tertiary">Proteksi Crash</span>
                <button
                  type="button"
                  onClick={() => onChange("enableCrashProtection", !config.enableCrashProtection)}
                  disabled={disabled}
                  title={disabled ? disabledTooltip : undefined}
                  className="px-2 py-0.5 text-caption font-bold rounded-md transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: config.enableCrashProtection ? "rgba(0,201,165,0.15)" : "rgba(255,255,255,0.04)",
                    color: config.enableCrashProtection ? "#00c9a5" : "#7a7a7a",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  {config.enableCrashProtection ? "ON" : "OFF"}
                </button>
              </div>
              <div className="flex gap-1 items-center">
                <input
                  type="range"
                  min={5}
                  max={30}
                  step={1}
                  value={config.crashSensitivity}
                  onChange={(e) => onChange("crashSensitivity", Number(e.target.value))}
                  disabled={disabled || !config.enableCrashProtection}
                  className="flex-1 accent-emerald-500 h-1.5 disabled:opacity-40"
                />
                <span className="text-caption text-tertiary ml-1 w-8 text-right font-mono">{config.crashSensitivity}%</span>
              </div>
            </div>

            {/* Safe Haven */}
            <div>
              <span className="text-label text-tertiary block mb-1">Safe Haven (saat krisis)</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => onChange("safeHavenAsset", "emas")}
                  disabled={disabled || !config.enableCrashProtection}
                  className="flex-1 py-1 text-caption font-medium rounded-md transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: config.safeHavenAsset === "emas" ? "rgba(240,165,0,0.15)" : "rgba(255,255,255,0.04)",
                    color: config.safeHavenAsset === "emas" ? "#f0a500" : "#7a7a7a",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  Emas
                </button>
                <button
                  type="button"
                  onClick={() => onChange("safeHavenAsset", "kas")}
                  disabled={disabled || !config.enableCrashProtection}
                  className="flex-1 py-1 text-caption font-medium rounded-md transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: config.safeHavenAsset === "kas" ? "rgba(0,201,165,0.15)" : "rgba(255,255,255,0.04)",
                    color: config.safeHavenAsset === "kas" ? "#00c9a5" : "#7a7a7a",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  Kas
                </button>
              </div>
            </div>

            {/* Buffer Kas */}
            <div>
              <div className="flex justify-between text-label mb-1">
                <span className="text-tertiary">Buffer Kas (reserve)</span>
                <span className="text-emerald-400 font-mono">{config.reserveBufferPct}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={30}
                step={5}
                value={config.reserveBufferPct}
                onChange={(e) => onChange("reserveBufferPct", Number(e.target.value))}
                disabled={disabled}
                className="w-full accent-emerald-500 h-1.5 disabled:opacity-40"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
