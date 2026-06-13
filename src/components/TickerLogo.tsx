import React, { useState } from "react";

export function TickerLogo({ ticker, size = "md", fallbackColor = "bg-blue-600", className = "" }: { ticker: string; size?: "sm" | "md" | "lg"; fallbackColor?: string; className?: string }) {
  const [error, setError] = useState(false);
  const cleanTicker = ticker.replace(".JK", "");

  const sizeClasses = {
    sm: "w-6 h-6 text-[8px] rounded",
    md: "w-9 h-9 text-[10px] rounded-lg",
    lg: "w-10 h-10 text-xs rounded-xl"
  };

  if (error) {
    return (
      <div className={`${sizeClasses[size]} ${fallbackColor} text-white flex items-center justify-center font-extrabold shrink-0 filter brightness-90 ${className}`}>
        {cleanTicker}
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} bg-white flex items-center justify-center shrink-0 overflow-hidden ${className}`}>
      <img
        src={`https://assets.stockbit.com/logos/companies/${cleanTicker}.png`}
        alt={`${cleanTicker} logo`}
        className="w-full h-full object-contain p-0.5"
        onError={() => setError(true)}
      />
    </div>
  );
}
