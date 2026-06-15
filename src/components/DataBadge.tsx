// src/components/DataBadge.tsx
import React from "react";
import { DataStatus } from "../types/DataStatus";
import { CheckCircle, Clock, AlertCircle, HelpCircle } from "lucide-react";

/**
 * Simple badge displaying the provenance/status of market data.
 * Colors:
 *   LIVE      – emerald (green)
 *   CACHED    – blue
 *   STALE     – amber
 *   ESTIMATED – gray
 */
export const DataBadge: React.FC<{ status: DataStatus }> = ({ status }) => {
  const config = {
    [DataStatus.LIVE]: {
      color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      Icon: CheckCircle,
      label: "Live",
    },
    [DataStatus.CACHED]: {
      color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      Icon: Clock,
      label: "Cached",
    },
    [DataStatus.STALE]: {
      color: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      Icon: AlertCircle,
      label: "Stale",
    },
    [DataStatus.ESTIMATED]: {
      color: "bg-gray-500/10 text-gray-400 border-gray-500/20",
      Icon: HelpCircle,
      label: "Estimated",
    },
  }[status];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded border ${config.color}`}>
      <config.Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
};
