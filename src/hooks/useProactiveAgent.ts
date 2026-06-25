// ─────────────────────────────────────────────────────────────
// useProactiveAgent — Level 4 proactive monitor.
//
// Watches live BPS (and a few market signals) and fires a notification
// (via useNotifications) when a threshold is crossed. Hardcoded 5-min
// cooldown per rule prevents spam. Honours the global
// proactiveAIEnabled toggle from useUIState.
//
// The cooldown gate (shouldFireRule) is exported as a pure function
// for unit testing without React or DOM.
// ─────────────────────────────────────────────────────────────
import { useEffect, useRef } from "react";
import { useBuyPressure } from "../engine/buyPressure";
import { useEngineConfig } from "../contexts/EngineConfigContext";
import { useUIState } from "./useUIState";
import { useNotifications } from "../contexts/NotificationContext";
import { isCrisisMode } from "../marketRegimeEngine";
import { MKT } from "../marketData";

export const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes per rule

/** Pure cooldown gate — returns true iff the rule should fire given the
 *  current time and the last fired timestamp. Returns true on first
 *  invocation (lastFiredAt is undefined or 0). */
export function shouldFireRule(
  lastFiredAt: number | undefined | null,
  now: number,
  cooldownMs: number = COOLDOWN_MS,
): boolean {
  if (!lastFiredAt) return true;
  return now - lastFiredAt >= cooldownMs;
}

/** Pure helper — returns a new lastFiredMap with the given rule marked
 *  as fired at `now`. Does not mutate input. */
export function markRuleFired(
  map: Record<string, number>,
  ruleId: string,
  now: number,
): Record<string, number> {
  return { ...map, [ruleId]: now };
}

interface ProactiveRule {
  id: string;
  evaluate: () => boolean;
  title: string;
  message: () => string;
  type: "info" | "success" | "warning" | "error";
}

export function useProactiveAgent(): void {
  const bps = useBuyPressure();
  const { engineConfig } = useEngineConfig();
  const { proactiveAIEnabled } = useUIState();
  const { addNotification } = useNotifications();

  // Map of rule-id -> last fired timestamp (ms).
  const lastFiredRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!proactiveAIEnabled) return;

    const now = Date.now();
    const fire = (ruleId: string, title: string, message: string, type: ProactiveRule["type"]) => {
      if (!shouldFireRule(lastFiredRef.current[ruleId], now)) return;
      lastFiredRef.current[ruleId] = now;
      addNotification({ title, message, type });
    };

    // ── Rule 1: BPS crosses into "aggressive" zone (>= 70) ─────────
    if (bps.valid && bps.score >= 70 && bps.score < 90) {
      fire(
        "bpsAggressive",
        "Peluang beli agresif",
        `BPS ${bps.score}/100 — action: ${bps.action}. Pertimbangkan deploy ${bps.deployPct}% kas via Top N.`,
        "info",
      );
    }

    // ── Rule 2: BPS enters "deploy" zone (>= 90) — capitulation ───
    if (bps.valid && bps.score >= 90) {
      fire(
        "bpsDeploy",
        "Sinyal capitulasi terdeteksi",
        `BPS ${bps.score}/100 — pasar turun dalam. Pertimbangkan deploy 90% kas untuk Top N.`,
        "success",
      );
    }

    // ── Rule 3: BPS drops below 30 — stay defensive ──────────────
    if (bps.valid && bps.score < 30) {
      fire(
        "bpsLow",
        "BPS rendah — tidak ada peluang beli",
        `BPS ${bps.score}/100. Pasar mahal / tidak ada panic. Simpan kas.`,
        "info",
      );
    }

    // ── Rule 4: BPS high but DCA recommendations disabled ────────
    if (bps.valid && bps.score >= 80 && engineConfig.dcaActive === false) {
      fire(
        "dcaOffHighBps",
        "BPS tinggi tapi DCA nonaktif",
        `BPS ${bps.score}/100, tapi engineConfig.dcaActive=false. Aktifkan DCA untuk melihat rekomendasi.`,
        "warning",
      );
    }

    // ── Rule 5: Crisis mode ON — defence override ──────────────────
    if (isCrisisMode() && engineConfig.enableCrashProtection) {
      fire(
        "crisisOverride",
        "CASH DEFENSE — pasar dalam krisis",
        "isCrisisMode() aktif. BPS di-override ke 'none'. Pertimbangkan alokasi ke safe haven.",
        "warning",
      );
    }

    // ── Rule 6: IHSG monthly drop beyond crashSensitivity ────────
    const monthly = MKT.ihsg?.monthly;
    const sens = engineConfig.crashSensitivity ?? 10;
    if (typeof monthly === "number" && monthly <= -sens && engineConfig.enableCrashProtection) {
      fire(
        "ihsgDrop",
        `IHSG turun ${monthly.toFixed(1)}% (bulanan)`,
        `Threshold crashSensitivity ${sens}% terlampaui. Tinjau portofolio + pertimbangkan safe haven.`,
        "error",
      );
    }
  }, [bps.score, bps.action, bps.deployPct, bps.valid, engineConfig.dcaActive, engineConfig.enableCrashProtection, engineConfig.crashSensitivity, proactiveAIEnabled, addNotification]);
}
