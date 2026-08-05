import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { gzipSync } from "node:zlib";

const root = process.cwd();
const dist = join(root, "dist");
const budgets = JSON.parse(readFileSync(new URL("./performance-budgets.json", import.meta.url), "utf8"));

if (!existsSync(join(dist, "index.html"))) throw new Error("Production build missing. Run npm run build first.");

function filesUnder(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

const files = filesUnder(dist);
const indexHtml = readFileSync(join(dist, "index.html"), "utf8");
const entryMatch = indexHtml.match(/<script[^>]+src="([^"]+\.js)"/);
const stylesheetMatch = indexHtml.match(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+\.css)"/);
if (!entryMatch || !stylesheetMatch) throw new Error("Could not resolve entry JavaScript and stylesheet from dist/index.html.");

const fromPublicPath = (path) => join(dist, path.replace(/^\//, ""));
const entry = fromPublicPath(entryMatch[1]);
const stylesheet = fromPublicPath(stylesheetMatch[1]);
const rawSize = (path) => statSync(path).size;
const gzipSize = (path) => gzipSync(readFileSync(path), { level: 9 }).length;
const sum = (paths, measure = rawSize) => paths.reduce((total, path) => total + measure(path), 0);
const byExtension = (extensions) => files.filter((path) => extensions.has(extname(path).toLowerCase()));

const javascript = byExtension(new Set([".js"]));
const fonts = byExtension(new Set([".woff", ".woff2"]));
const images = byExtension(new Set([".avif", ".gif", ".jpeg", ".jpg", ".png", ".webp"]));
const apk = join(dist, "north-health.apk");
const largestImage = images.reduce((largest, path) => rawSize(path) > rawSize(largest) ? path : largest, images[0]);
const metrics = {
  memberEntryRawBytes: rawSize(entry),
  memberEntryGzipBytes: gzipSize(entry),
  stylesheetRawBytes: rawSize(stylesheet),
  stylesheetGzipBytes: gzipSize(stylesheet),
  allJavaScriptRawBytes: sum(javascript),
  allJavaScriptGzipBytes: sum(javascript, gzipSize),
  allFontsRawBytes: sum(fonts),
  largestImageBytes: rawSize(largestImage),
  androidApkBytes: rawSize(apk),
  distributionBytes: sum(files),
};

const failures = Object.entries(metrics).filter(([name, value]) => value > budgets[name]);
for (const [name, value] of Object.entries(metrics)) console.log(`${name}: ${value} / ${budgets[name]} bytes`);
console.log(`largestImage: ${relative(dist, largestImage).replaceAll("\\", "/")}`);

if (failures.length) {
  console.error("Performance budget exceeded:");
  for (const [name, value] of failures) console.error(`- ${name}: ${value} > ${budgets[name]} bytes`);
  process.exitCode = 1;
} else {
  console.log(`Performance budget passed: ${files.length} production files checked.`);
}