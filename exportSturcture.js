const fs = require("fs");
const path = require("path");

const IGNORE = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".cache",
  ".next",
  "coverage",
  ".vscode"
]);

function walk(dir, prefix = "", depth = 0, maxDepth = 4) {
  if (depth > maxDepth) return;

  const items = fs.readdirSync(dir)
    .filter(item => !IGNORE.has(item))
    .sort((a, b) => a.localeCompare(b));

  items.forEach((item, index) => {
    const full = path.join(dir, item);
    const isLast = index === items.length - 1;
    const connector = isLast ? "└── " : "├── ";
    console.log(prefix + connector + item);

    if (fs.statSync(full).isDirectory()) {
      const nextPrefix = prefix + (isLast ? "    " : "│   ");
      walk(full, nextPrefix, depth + 1, maxDepth);
    }
  });
}

console.log(path.basename(process.cwd()));
walk(process.cwd());