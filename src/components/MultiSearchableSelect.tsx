import { useState, useRef, useEffect } from "react";
import { Search, X, Check } from "lucide-react";
import { TickerLogo } from "./TickerLogo";

interface Option {
  value: string;
  label: string;
  logoColor?: string;
}

interface MultiSearchableSelectProps {
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  theme?: "indigo" | "emerald";
  className?: string;
}

export function MultiSearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Cari saham...",
  theme = "indigo",
  className = ""
}: MultiSearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const borderFocusColor = theme === "indigo" ? "focus:border-indigo-500" : "focus:border-emerald-500";
  const pillBg = theme === "indigo" ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(
    (o) =>
      o.value.toLowerCase().includes(search.toLowerCase()) ||
      o.label.toLowerCase().includes(search.toLowerCase())
  );

  const toggleTicker = (ticker: string) => {
    if (value.includes(ticker)) {
      onChange(value.filter(t => t !== ticker));
    } else {
      onChange([...value, ticker]);
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className={`flex items-center gap-2 w-full text-left text-xs p-2 bg-black border border-white/10 ${borderFocusColor} outline-none rounded-xl cursor-text`} onClick={() => { setIsOpen(true); }}>
        <Search className="w-3.5 h-3.5 text-white/40 shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={value.length === 0 ? placeholder : `${value.length} saham dipilih`}
          className="w-full bg-transparent text-xs text-white outline-none font-mono placeholder:text-white/30"
        />
        {(value.length > 0 || search) && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange([]); setSearch(""); }}
            className="text-white/40 hover:text-white shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {value.map((t) => (
            <span key={t} className={`px-2 py-0.5 text-xs font-medium rounded-full ${pillBg} border flex items-center gap-1`}>
              #{t}
              <button onClick={() => toggleTicker(t)} className="text-white/60 hover:text-white text-xs leading-none">&times;</button>
            </span>
          ))}
        </div>
      )}

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-[#121212] border border-white/10 rounded-xl shadow-xl overflow-hidden flex flex-col">
          <div className="max-h-60 overflow-y-auto scrollbar-thin">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = value.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleTicker(opt.value)}
                    className={`w-full text-left px-3 py-2.5 flex items-center gap-2 text-xs font-mono transition-colors hover:bg-white/5 ${
                      isSelected ? "bg-white/10 text-white font-bold" : "text-white/70 hover:text-white"
                    }`}
                  >
                    <TickerLogo ticker={opt.value.replace(".JK", "")} size="sm" fallbackColor={opt.logoColor} />
                    <span className="truncate flex-1">{opt.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  </button>
                );
              })
            ) : (
              <div className="p-3 text-xs text-white/40 font-mono text-center">
                Tidak ditemukan
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

