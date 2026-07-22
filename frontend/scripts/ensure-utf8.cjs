/**
 * Reescribe fuentes en UTF-8 si detecta UTF-16 (null bytes) o contenido corrupto.
 * En Windows, algunos editores pueden guardar .jsx/.css como UTF-16 y Vite/Babel fallan.
 */
const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "..", "src");
const exts = new Set([".js", ".jsx", ".ts", ".tsx", ".css"]);

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

function toUtf8Text(buf) {
  if (buf[0] === 0xff && buf[1] === 0xfe) {
    return buf.slice(2).toString("utf16le");
  }
  if (buf[0] === 0xfe && buf[1] === 0xff) {
    // UTF-16 BE: swap then decode
    const swapped = Buffer.alloc(buf.length - 2);
    for (let i = 2; i + 1 < buf.length; i += 2) {
      swapped[i - 2] = buf[i + 1];
      swapped[i - 1] = buf[i];
    }
    return swapped.toString("utf16le");
  }
  if (hasNullBytes(buf)) {
    return buf.toString("utf16le");
  }
  return buf.toString("utf8");
}

let fixed = 0;
for (const file of walk(SRC)) {
  const buf = fs.readFileSync(file);
  const text = toUtf8Text(buf);
  if (hasNullBytes(buf) || looksCorrupt(text)) {
    fs.writeFileSync(file, text, "utf8");
    fixed += 1;
    console.log("fixed:", path.relative(SRC, file));
  }
}
console.log(fixed ? `ensure-utf8: ${fixed} archivo(s) corregido(s).` : "ensure-utf8: sin cambios.");
