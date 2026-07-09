interface SignalBadgeProps {
  tier: number;
  label: string;
}

const TIER_CONFIG: Record<number, { bg: string; text: string; border: string }> = {
  5: { bg: "bg-emerald-600/20", text: "text-emerald-400", border: "border-emerald-600/30" },
  4: { bg: "bg-green-600/15", text: "text-green-400", border: "border-green-600/25" },
  3: { bg: "bg-yellow-600/15", text: "text-yellow-400", border: "border-yellow-600/25" },
  2: { bg: "bg-orange-600/15", text: "text-orange-400", border: "border-orange-600/25" },
  1: { bg: "bg-rose-600/15", text: "text-rose-400", border: "border-rose-600/25" },
};

export function SignalBadge({ tier, label }: SignalBadgeProps) {
  const c = TIER_CONFIG[tier] || TIER_CONFIG[1];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${c.bg} ${c.text} ${c.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.text.replace("text-", "bg-")}`} />
      {label}
    </span>
  );
}
