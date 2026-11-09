// After `vite build`, make dist/index.html installable on its own: the manifest and
// its icons become data: URIs so the single file still works when hosted without the
// public/ files beside it (for example as a shared preview page).
import { readFileSync, writeFileSync } from "node:fs";

const html = "dist/index.html";
const b64 = (path) => `data:image/png;base64,${readFileSync(path).toString("base64")}`;
const manifest = JSON.parse(readFileSync("public/manifest.webmanifest", "utf8"));
for (const icon of manifest.icons) icon.src = b64(`public/${icon.src}`);
manifest.start_url = ".";
manifest.scope = ".";
const manifestUri = `data:application/manifest+json,${encodeURIComponent(JSON.stringify(manifest))}`;

let out = readFileSync(html, "utf8");
out = out
  .replace('href="./manifest.webmanifest"', `href="${manifestUri}"`)
  .replace('href="./icons/icon-192.png"', `href="${b64("public/icons/icon-192.png")}"`)
  .replace('href="./icons/apple-touch-icon-180.png"', `href="${b64("public/icons/apple-touch-icon-180.png")}"`);
writeFileSync(html, out);
console.log(`inlined manifest + icons into ${html} (${(out.length / 1024).toFixed(0)} kB)`);
