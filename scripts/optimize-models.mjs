// Compresses every source GLB (*.src.glb) under public/models with gltf-transform.
// Usage: drop e.g. public/models/garments/men/m-tee-01.src.glb, then `npm run models:optimize`
// to produce m-tee-01.glb next to it (meshopt-compressed, deduped, pruned, textures as webp).
import { execFileSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = new URL("../public/models", import.meta.url).pathname;

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const sources = walk(root).filter((p) => p.endsWith(".src.glb"));
if (sources.length === 0) {
  console.log("No *.src.glb files found under public/models — nothing to optimize.");
  console.log("(The demo builds its avatars and garments procedurally in code.)");
  process.exit(0);
}

for (const src of sources) {
  const out = src.replace(/\.src\.glb$/, ".glb");
  console.log(`optimize ${src} -> ${out}`);
  execFileSync(
    "npx",
    ["gltf-transform", "optimize", src, out, "--compress", "meshopt", "--texture-compress", "webp"],
    { stdio: "inherit" },
  );
}
