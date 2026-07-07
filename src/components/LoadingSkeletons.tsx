import { motion } from "motion/react";
import { Activity, BarChart3, TrendingUp } from "lucide-react";

export function ChartSkeleton({ height = "320px" }: { height?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-2xl border border-white/5 flex items-center justify-center"
      style={{ height }}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div className="w-12 h-12 border-3 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin" />
          <BarChart3 className="w-5 h-5 text-emerald-400/60 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-caption text-emerald-400/80 font-mono animate-pulse">Memuat chart...</p>
          <p className="text-label text-white/30">Sedang memproses data pasar</p>
        </div>
      </div>
    </motion.div>
  );
}

export function CardSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-2 animate-pulse"
    >
      <div className="h-3 bg-white/5 rounded w-1/2" />
      <div className="h-6 bg-white/10 rounded w-3/4" />
      <div className="h-3 bg-white/5 rounded w-1/3" />
    </motion.div>
  );
}

export function TableRowSkeleton() {
  return (
    <motion.tr
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="border-b border-white/5"
    >
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <td key={i} className="px-3 py-4">
          <div className="h-4 bg-white/5 rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
        </td>
      ))}
    </motion.tr>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-3"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-xl animate-pulse"
        >
          <div className="w-10 h-10 bg-white/10 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-white/10 rounded w-1/3" />
            <div className="h-3 bg-white/5 rounded w-1/2" />
          </div>
          <div className="w-16 h-8 bg-white/5 rounded" />
        </motion.div>
      ))}
    </motion.div>
  );
}

export function MetricsGridSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="grid gap-4"
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
    >
      {Array.from({ length: cols }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </motion.div>
  );
}

export function SpinnerOverlay({ message = "Memuat data..." }: { message?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 rounded-2xl"
    >
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin" />
          <Activity className="w-6 h-6 text-emerald-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
        </div>
        <p className="text-sm text-white font-medium">{message}</p>
      </div>
    </motion.div>
  );
}

export function MarketDataSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 bg-white/10 rounded-lg w-48 animate-pulse" />
          <div className="flex gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-8 bg-white/5 rounded-lg w-24 animate-pulse" />
            ))}
          </div>
        </div>
        <ChartSkeleton height="400px" />
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <CardSkeleton key={i} />
        ))}
      </div>
      
      <ListSkeleton rows={8} />
    </motion.div>
  );
}
