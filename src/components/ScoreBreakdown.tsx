interface ScoreBreakdownProps {
  quality: number;
  growth: number;
  value: number;
  momentum: number;
  dividend?: number;
  size?: "sm" | "md";
}

const FACTORS = [
  { key: "quality" as const, label: "Quality", color: "bg-blue-500" },
  { key: "growth" as const, label: "Growth", color: "bg-violet-500" },
  { key: "value" as const, label: "Value", color: "bg-amber-500" },
  { key: "momentum" as const, label: "Momentum", color: "bg-cyan-500" },
  { key: "dividend" as const, label: "Dividen", color: "bg-emerald-500" },
];

export function ScoreBreakdown({ quality, growth, value, momentum, dividend, size = "md" }: ScoreBreakdownProps) {
  const scores = { quality, growth, value, momentum, dividend };
  const barH = size === "sm" ? "h-1.5" : "h-2";
  const labelSize = size === "sm" ? "text-[10px]" : "text-xs";

  return (
    <div className="space-y-1.5">
      {FACTORS.map(({ key, label, color }) => {
        const val = scores[key];
        if (val === undefined) return null;
        return (
          <div key={key} className="flex items-center gap-2">
            <span className={`${labelSize} text-white/50 w-14 shrink-0`}>{label}</span>
            <div className={`flex-1 ${barH} rounded-full bg-white/[0.06] overflow-hidden`}>
              <div
                className={`${barH} rounded-full ${color} transition-all duration-500`}
                style={{ width: `${Math.min(100, Math.max(0, val))}%` }}
              />
            </div>
            <span className={`${labelSize} font-mono text-white/70 w-6 text-right`}>{Math.round(val)}</span>
          </div>
        );
      })}
    </div>
  );
}
