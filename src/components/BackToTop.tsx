import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

interface BackToTopProps {
  /** Scroll threshold (px) before button appears */
  threshold?: number;
  /** Optional className for the button container */
  className?: string;
}

/**
 * Floating "back to top" button — appears after scrolling past `threshold`.
 * Place once at the AppContent level so it's available on every long page
 * (Portfolio, Backtest, Analytics, etc.).
 */
export function BackToTop({ threshold = 600, className = "" }: BackToTopProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Kembali ke atas"
      className={`fixed bottom-24 right-6 z-50 w-10 h-10 rounded-full bg-emerald-500/90 hover:bg-emerald-500 text-black shadow-lg shadow-emerald-500/20 flex items-center justify-center cursor-pointer transition-all hover:scale-105 ${className}`}
    >
      <ArrowUp className="w-4 h-4" />
    </button>
  );
}
