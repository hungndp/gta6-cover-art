// Neon Vice Cover Studio — entrypoint for make.fun's gta6-cover-art-01.
// Copies app/ and screenshots/ into the output directory and writes the
// dossier with the kit's buildDossier. The output directory itself is
// NEVER removed: the grader mounts it as a volume, so deleting it fails
// with EPERM. We create it if missing and clear only its CONTENTS,
// entry by entry, then copy the app in.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-app.ts";

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";

function clearDirectoryContents(dir) {
  // Remove every entry inside dir, but never dir itself.
  for (const entry of readdirSync(dir)) {
    rmSync(join(dir, entry), { recursive: true, force: true });
  }
}

function main() {
  mkdirSync(outDir, { recursive: true });
  clearDirectoryContents(outDir);
  const appSrc = join(repoRoot, "app");
  const shotsSrc = join(repoRoot, "screenshots");
  if (!existsSync(appSrc)) throw new Error("app/ directory is missing from the repository");
  cpSync(appSrc, join(outDir, "app"), { recursive: true });
  if (existsSync(shotsSrc)) {
    cpSync(shotsSrc, join(outDir, "screenshots"), { recursive: true });
  }
  const dossier = buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  });
  writeFileSync(join(outDir, "dossier.json"), dossier);
  console.log("Wrote dossier.json (" + dossier.length + " bytes) to " + outDir);
}

main();
