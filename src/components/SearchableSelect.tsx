import { useState, useRef, useEffect } from "react";
import { Search, ChevronDown } from "lucide-react";
import { STOCKS_DATA } from "../stocksData";
import { TickerLogo } from "./TickerLogo";

interface Option {
  value: string;
  label: string;
  logoColor?: string; // Tailwind color fallback
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  theme?: "amber" | "emerald";
  className?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Cari saham...",
  theme = "amber",
  className = ""
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value) || options[0];
  const borderFocusColor = theme === "amber" ? "focus:border-amber-500" : "focus:border-emerald-500";
  const hoverColor = theme === "amber" ? "hover:bg-amber-500/20" : "hover:bg-emerald-500/20";

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

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearch("");
        }}
        className={`w-full text-left text-xs p-2.5 bg-black border border-white/10 ${borderFocusColor} outline-none text-white font-bold rounded-xl font-mono flex items-center justify-between cursor-pointer`}
      >
        <div className="flex items-center gap-2 truncate">
          {selectedOption ? (
            <TickerLogo ticker={selectedOption.value.replace(".JK", "")} size="sm" fallbackColor={selectedOption.logoColor} />
          ) : null}
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        </div>
        <ChevronDown className="w-4 h-4 text-white/50 shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-[#121212] border border-white/10 rounded-xl shadow-xl overflow-hidden flex flex-col">
          <div className="p-2 border-b border-white/5 flex items-center gap-2">
            <Search className="w-4 h-4 text-white/40 shrink-0" />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ketik ticker/nama..."
              className="w-full bg-transparent text-xs text-white outline-none font-mono placeholder:text-white/30"
            />
          </div>
          <div className="max-h-60 overflow-y-auto scrollbar-thin">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                     onChange(opt.value);
                     setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2.5 flex items-center gap-2 text-xs font-mono transition-colors ${hoverColor} ${
                    opt.value === value ? "bg-white/10 text-white font-bold" : "text-white/70 hover:text-white"
                  }`}
                >
                  <TickerLogo ticker={opt.value.replace(".JK", "")} size="sm" fallbackColor={opt.logoColor} />
                  <span className="truncate">{opt.label}</span>
                </button>
              ))
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
