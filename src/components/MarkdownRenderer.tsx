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
          <strong key={idx} className="font-bold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={idx}
            className="bg-white/10 px-1 py-0.5 rounded font-mono text-emerald-400 text-caption"
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

  let currentBulletList: string[] = [];
  let inBulletList = false;

  let currentOrderedList: string[] = [];
  let inOrderedList = false;

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
        className="my-2 overflow-x-auto w-full border border-white/10 rounded-xl bg-black/30 shadow-sm scrollbar-thin"
      >
        <table className="min-w-full divide-y divide-white/10 text-body sm:text-xs font-mono">
          <thead className="bg-white/[0.03]">
            <tr>
              {headerRow.map((cell, idx) => (
                <th
                  key={idx}
                  className="px-3 py-1.5 text-left font-bold text-white border-b border-white/10 uppercase tracking-wider text-caption"
                >
                  {parseInline(cell)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {dataRows.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className="hover:bg-white/[0.02] transition-colors"
              >
                {row.map((cell, cellIdx) => (
                  <td
                    key={cellIdx}
                    className="px-3 py-1.5 text-white/90 whitespace-nowrap text-caption"
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

  const flushBulletList = (key: number) => {
    if (currentBulletList.length === 0) return;
    blocks.push(
      <ul
        key={`blist-${key}`}
        className="list-disc pl-4 my-2 space-y-0.5 text-white/80 text-xs sm:text-sm"
      >
        {currentBulletList.map((item, idx) => (
          <li key={idx} className="leading-relaxed">
            {parseInline(item)}
          </li>
        ))}
      </ul>
    );
    currentBulletList = [];
    inBulletList = false;
  };

  const flushOrderedList = (key: number) => {
    if (currentOrderedList.length === 0) return;
    blocks.push(
      <ol
        key={`olist-${key}`}
        className="list-decimal pl-4 my-2 space-y-0.5 text-white/80 text-xs sm:text-sm"
      >
        {currentOrderedList.map((item, idx) => (
          <li key={idx} className="leading-relaxed">
            {parseInline(item)}
          </li>
        ))}
      </ol>
    );
    currentOrderedList = [];
    inOrderedList = false;
  };

  const flushAllLists = (key: number) => {
    flushBulletList(key);
    flushOrderedList(key);
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Horizontal rule
    if (/^---+\s*$/.test(trimmed)) {
      flushAllLists(i);
      blocks.push(
        <hr key={`hr-${i}`} className="my-2 border-t border-white/10" />
      );
      continue;
    }

    // Table Row
    if (trimmed.startsWith("|")) {
      flushAllLists(i);
      inTable = true;
      const cells = line.split("|").map((c) => c.trim());
      if (cells[0] === "") cells.shift();
      if (cells[cells.length - 1] === "") cells.pop();
      currentTable.push(cells);
      continue;
    } else if (inTable) {
      flushTable(i);
    }

    // Bullet list
    if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
      flushAllLists(i);
      inBulletList = true;
      currentBulletList.push(trimmed.slice(2));
      continue;
    } else if (inBulletList) {
      flushBulletList(i);
    }

    // Numbered list
    if (/^\d+[\.\)]\s/.test(trimmed)) {
      flushAllLists(i);
      inOrderedList = true;
      currentOrderedList.push(trimmed.replace(/^\d+[\.\)]\s/, ""));
      continue;
    } else if (inOrderedList) {
      flushOrderedList(i);
    }

    // Empty line = separator
    if (trimmed === "") {
      continue;
    }

    // Standard paragraph
    blocks.push(
      <p
        key={i}
        className="text-white/80 leading-relaxed mb-2 text-xs sm:text-sm"
      >
        {parseInline(line)}
      </p>
    );
  }

  if (inTable) flushTable(lines.length);
  flushBulletList(lines.length);
  flushOrderedList(lines.length);

  return <div className="space-y-0.5 text-left">{blocks}</div>;
}
