import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface LastUpdatedChipProps {
  /** ISO string or any parseable date */
  iso?: string | null;
  /** If true, refresh relative time every 30s (default true) */
  live?: boolean;
  className?: string;
}

/**
 * Small "Updated 14:23 WIB" chip. Uses Asia/Jakarta timezone.
 * Self-refreshes every 30s to update relative description.
 */
export function LastUpdatedChip({ iso, live = true, className = "" }: LastUpdatedChipProps) {
  const [, force] = useState(0);

  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => force((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, [live]);

  if (!iso) return null;

  const date = new Date(iso);
  if (isNaN(date.getTime())) return null;

  const time = date.toLocaleTimeString("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
  });

  const ageMin = Math.round((Date.now() - date.getTime()) / 60_000);
  let relative = "";
  if (ageMin < 1) relative = "baru saja";
  else if (ageMin < 60) relative = `${ageMin} menit lalu`;
  else if (ageMin < 1440) relative = `${Math.round(ageMin / 60)} jam lalu`;
  else relative = `${Math.round(ageMin / 1440)} hari lalu`;

  return (
    <span
      title={`Diperbarui ${date.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB`}
      className={`inline-flex items-center gap-1 text-label font-mono text-white/30 ${className}`}
    >
      <Clock className="w-3 h-3" />
      {time} WIB · {relative}
    </span>
  );
}
