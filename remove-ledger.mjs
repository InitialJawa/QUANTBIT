import fs from "fs";

const path = "src/components/SimulationTab.tsx";
let content = fs.readFileSync(path, "utf-8");

// Remove the button
const buttonRegex = /<button\s+onClick=\{\(\) => setActiveSubTab\("ledger"\)\}[^>]+>\s*<Briefcase className="w-4 h-4" \/>\s*Live Ledger Hari Ini\s*<\/button>/s;
content = content.replace(buttonRegex, "");

// Remove the block
const blockRegex = /\{\/\* BLOCK C: LIVE RE-CALCULATING HOLDINGS LEDGER \*\/\}.+?(?=\s*<\/div>\s*\);\s*\})/s;
content = content.replace(blockRegex, "");

fs.writeFileSync(path, content, "utf-8");
console.log("Removed Ledger from SimulationTab");
