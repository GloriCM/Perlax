/**
 * Reescribe .js/.jsx en UTF-8 sin BOM si detecta UTF-16 o contenido corrupto.
 */
const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "..", "src");
const exts = new Set([".js", ".jsx", ".ts", ".tsx"]);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (exts.has(path.extname(entry.name))) files.push(full);
  }
  return files;
}

function hasNullBytes(buf) {
  for (let i = 0; i < buf.length; i++) if (buf[i] === 0) return true;
  return false;
}

function looksCorrupt(text) {
  const first = (text.split(/\r?\n/)[0] || "").trim();
  return /^[A-Z]:\\/.test(first);
}

let fixed = 0;
for (const file of walk(SRC)) {
  const buf = fs.readFileSync(file);
  const text = buf.toString("utf8");
  if (hasNullBytes(buf) || looksCorrupt(text)) {
    const clean = text.replace(/\u0000/g, "");
    fs.writeFileSync(file, clean, "utf8");
    fixed += 1;
    console.log("fixed:", path.relative(SRC, file));
  }
}
console.log(fixed ? `ensure-utf8: ${fixed} archivo(s) corregido(s).` : "ensure-utf8: sin cambios.");