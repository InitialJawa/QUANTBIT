import React from "react";

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  // Parse inline styles: bold (**text**) and code (`text`)
  const parseInline = (text: string): React.ReactNode[] => {
    const regex = /(\*\*.*?\*\*|`.*?`)/g;
    const parts = text.split(regex);
    return parts.map((part, idx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={idx} className="font-bold text-white dark:text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={idx}
            className="bg-white/10 dark:bg-black/20 px-1 py-0.5 rounded font-mono text-emerald-400 dark:text-emerald-600 text-[10px]"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];
  
  let currentTable: string[][] = [];
  let inTable = false;
  
  let currentList: string[] = [];
  let inList = false;

  const flushTable = (key: number) => {
    if (currentTable.length === 0) return;
    
    const headerRow = currentTable[0];
    const dataRows = currentTable.slice(1).filter((row) => {
      const isSep = row.every(
        (cell) => cell.trim().match(/^:?-+:?$/) || cell.trim() === ""
      );
      return !isSep;
    });

    blocks.push(
      <div
        key={`table-${key}`}
        className="my-3 overflow-x-auto w-full border border-white/10 dark:border-black/10 rounded-xl bg-black/30 dark:bg-slate-50/50 shadow-sm scrollbar-thin"
      >
        <table className="min-w-full divide-y divide-white/10 dark:divide-black/10 text-[11px] sm:text-xs font-mono">
          <thead className="bg-white/[0.03] dark:bg-slate-100/50">
            <tr>
              {headerRow.map((cell, idx) => (
                <th
                  key={idx}
                  className="px-3 py-2 text-left font-bold text-white dark:text-slate-900 border-b border-white/10 dark:border-slate-200 uppercase tracking-wider"
                >
                  {parseInline(cell)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 dark:divide-slate-200/50">
            {dataRows.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className="hover:bg-white/[0.02] dark:hover:bg-slate-100/20 transition-colors"
              >
                {row.map((cell, cellIdx) => (
                  <td
                    key={cellIdx}
                    className="px-3 py-2 text-white/90 dark:text-slate-800 whitespace-nowrap"
                  >
                    {parseInline(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    currentTable = [];
    inTable = false;
  };

  const flushList = (key: number) => {
    if (currentList.length === 0) return;
    blocks.push(
      <ul
        key={`list-${key}`}
        className="list-disc pl-5 my-3 space-y-1.5 text-white/80 dark:text-slate-700 text-xs sm:text-sm"
      >
        {currentList.map((item, idx) => (
          <li key={idx} className="leading-relaxed">
            {parseInline(item)}
          </li>
        ))}
      </ul>
    );
    currentList = [];
    inList = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Table Row detection
    if (trimmed.startsWith("|")) {
      if (inList) flushList(i);
      inTable = true;
      const cells = line.split("|").map((c) => c.trim());
      if (cells[0] === "") cells.shift();
      if (cells[cells.length - 1] === "") cells.pop();
      currentTable.push(cells);
      continue;
    } else if (inTable) {
      flushTable(i);
    }

    // List Item detection
    if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
      if (inTable) flushTable(i);
      inList = true;
      currentList.push(trimmed.slice(2));
      continue;
    } else if (inList) {
      flushList(i);
    }

    // Headers
    if (trimmed.startsWith("### ")) {
      blocks.push(
        <h3
          key={i}
          className="text-xs sm:text-sm font-extrabold text-white dark:text-slate-900 mt-4 mb-2 flex items-center gap-1.5 uppercase tracking-wide border-b border-white/5 dark:border-slate-100 pb-1"
        >
          {parseInline(trimmed.slice(4))}
        </h3>
      );
      continue;
    }

    if (trimmed.startsWith("#### ")) {
      blocks.push(
        <h4
          key={i}
          className="text-[11px] sm:text-xs font-bold text-white/95 dark:text-slate-800 mt-3 mb-1.5 uppercase tracking-wider"
        >
          {parseInline(trimmed.slice(5))}
        </h4>
      );
      continue;
    }

    if (trimmed.startsWith("## ")) {
      blocks.push(
        <h2
          key={i}
          className="text-sm sm:text-base font-black text-white dark:text-slate-950 mt-5 mb-3 uppercase tracking-wide border-b border-white/10 dark:border-slate-200 pb-1.5"
        >
          {parseInline(trimmed.slice(3))}
        </h2>
      );
      continue;
    }

    if (trimmed === "") {
      continue;
    }

    // Standard Paragraph
    blocks.push(
      <p
        key={i}
        className="text-white/80 dark:text-slate-700 leading-relaxed mb-3 text-xs sm:text-sm"
      >
        {parseInline(line)}
      </p>
    );
  }

  if (inTable) flushTable(lines.length);
  if (inList) flushList(lines.length);

  return <div className="space-y-1 text-left">{blocks}</div>;
}
