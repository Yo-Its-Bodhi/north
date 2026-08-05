import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const dist = join(process.cwd(), "dist");
const excludedPaths = [
  "Brand",
  "approved-brand-board.png",
  "email",
  "favicons",
  "footer",
  "preview",
  "social",
  "source-tools",
  "transparent-background/png-hires",
  "web",
  "png/bike.png",
  "png/buildwithnova.png",
  "png/myworkouts.png",
  "png/premadeworkout.png",
  "png/recovery.png",
  "png/run.png",
  "png/trainingprogram.png",
  "png/walk.png",
];

for (const relativePath of excludedPaths) {
  const path = join(dist, relativePath);
  if (existsSync(path)) rmSync(path, { recursive: true, force: true });
}

console.log(`Prepared production distribution: ${excludedPaths.length} non-runtime asset paths excluded.`);