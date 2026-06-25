// ─────────────────────────────────────────────────────────────
// useProactiveAgent — Level 4 proactive monitor.
//
// Watches live BPS (and a few market signals) and fires a notification
// (via useNotifications) on STATE TRANSITION (false→true).
// Unlike cooldown-based approach, persistent conditions (like crisis
// mode) fire exactly ONCE when the condition becomes true.
// Re-fires only when condition goes false→true again.
// ─────────────────────────────────────────────────────────────
import { useEffect, useRef } from "react";
import { useBuyPressure } from "../engine/buyPressure";
import { useEngineConfig } from "../contexts/EngineConfigContext";
import { useUIState } from "./useUIState";
import { useNotifications } from "../contexts/NotificationContext";
import { isCrisisMode } from "../marketRegimeEngine";
import { MKT } from "../marketData";

export const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes per rule (legacy)

/** Pure cooldown gate — kept for backward compat (AITestHarness uses it). */
export function shouldFireRule(
  lastFiredAt: number | undefined | null,
  now: number,
  cooldownMs: number = COOLDOWN_MS,
): boolean {
  if (!lastFiredAt) return true;
  return now - lastFiredAt >= cooldownMs;
}

/** Pure helper — kept for backward compat (AITestHarness uses it). */
export function markRuleFired(
  map: Record<string, number>,
  ruleId: string,
  now: number,
): Record<string, number> {
  return { ...map, [ruleId]: now };
}

/** Pure helper — tracks state transitions. Returns true the FIRST time
 *  `current` is true (transition from false→true). Returns false for
 *  subsequent true evaluations until `current` goes false→true again. */
export function shouldFireOnTransition(
  lastMap: Record<string, boolean>,
  map: Record<string, boolean>,
  key: string,
  current: boolean,
): boolean {
  const was = lastMap[key] ?? false;
  return current && !was;
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

  // Track last known state for each rule (for false→true transition).
  const lastStateRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    if (!proactiveAIEnabled) return;

    // Build current states and compare with last known.
    const prev = { ...lastStateRef.current };
    const curr: Record<string, boolean> = {};

    const transition = (ruleId: string, current: boolean) => {
      curr[ruleId] = current;
      const was = prev[ruleId] ?? false;
      return current && !was;
    };

    // ── Rule 1: BPS crosses into "aggressive" zone (>= 70) ─────────
    const r1 = bps.valid && bps.score >= 70 && bps.score < 90;
    if (transition("bpsAggressive", r1)) {
      addNotification({
        title: "Peluang beli agresif",
        message: `BPS ${bps.score}/100 — action: ${bps.action}. Pertimbangkan deploy ${bps.deployPct}% kas via Top N.`,
        type: "info",
      });
    }

    // ── Rule 2: BPS enters "deploy" zone (>= 90) — capitulation ───
    const r2 = bps.valid && bps.score >= 90;
    if (transition("bpsDeploy", r2)) {
      addNotification({
        title: "Sinyal capitulasi terdeteksi",
        message: `BPS ${bps.score}/100 — pasar turun dalam. Pertimbangkan deploy 90% kas untuk Top N.`,
        type: "success",
      });
    }

    // ── Rule 3: BPS drops below 30 — stay defensive ──────────────
    const r3 = bps.valid && bps.score < 30;
    if (transition("bpsLow", r3)) {
      addNotification({
        title: "BPS rendah — tidak ada peluang beli",
        message: `BPS ${bps.score}/100. Pasar mahal / tidak ada panic. Simpan kas.`,
        type: "info",
      });
    }

    // ── Rule 4: BPS high but DCA recommendations disabled ────────
    const r4 = bps.valid && bps.score >= 80 && engineConfig.dcaActive === false;
    if (transition("dcaOffHighBps", r4)) {
      addNotification({
        title: "BPS tinggi tapi DCA nonaktif",
        message: `BPS ${bps.score}/100, tapi engineConfig.dcaActive=false. Aktifkan DCA untuk melihat rekomendasi.`,
        type: "warning",
      });
    }

    // ── Rule 5: Crisis mode ON — defence override ──────────────────
    const r5 = isCrisisMode() && engineConfig.enableCrashProtection;
    if (transition("crisisOverride", r5)) {
      addNotification({
        title: "CASH DEFENSE — pasar dalam krisis",
        message: "isCrisisMode() aktif. BPS di-override ke 'none'. Pertimbangkan alokasi ke safe haven.",
        type: "warning",
      });
    }

    // ── Rule 6: IHSG monthly drop beyond crashSensitivity ────────
    const monthly = MKT.ihsg?.monthly;
    const sens = engineConfig.crashSensitivity ?? 10;
    const r6 = typeof monthly === "number" && monthly <= -sens && engineConfig.enableCrashProtection;
    if (transition("ihsgDrop", r6)) {
      addNotification({
        title: `IHSG turun ${monthly.toFixed(1)}% (bulanan)`,
        message: `Threshold crashSensitivity ${sens}% terlampaui. Tinjau portofolio + pertimbangkan safe haven.`,
        type: "error",
      });
    }

    // Persist current states for next comparison.
    lastStateRef.current = curr;
  }, [bps.score, bps.action, bps.deployPct, bps.valid, engineConfig.dcaActive, engineConfig.enableCrashProtection, engineConfig.crashSensitivity, proactiveAIEnabled, addNotification]);
}
