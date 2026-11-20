// Neon Vice Cover Studio — entry program (gta6-cover-art-01).
//
// Copies app/ and screenshots/ from this repository into the output
// directory and writes /output/dossier.json with buildDossier from
// vendor/makefun-app.ts, exactly as the kit's starter does.
//
// Grader rule learned the hard way (v1 rejection): the grader mounts
// the output directory as a volume, so this program NEVER deletes the
// output directory itself — it creates it if missing and clears only
// its contents, entry by entry. Local runs hide the failure because
// root can remove anything; the grader runs as uid 65534 and cannot.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-app.ts";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)));
const outputDir = resolve(process.env.MAKEFUN_OUTPUT_DIR || "/output");

function clearDirectoryContents(dir) {
  // Remove every entry inside dir, never dir itself.
  for (const entry of readdirSync(dir)) {
    rmSync(join(dir, entry), { recursive: true, force: true });
  }
}

function copyTreeInto(sourceDir, targetDir) {
  mkdirSync(targetDir, { recursive: true });
  cpSync(sourceDir, targetDir, { recursive: true });
}

function main() {
  mkdirSync(outputDir, { recursive: true });
  clearDirectoryContents(outputDir);
  copyTreeInto(join(repoRoot, "app"), join(outputDir, "app"));
  const screenshotsDir = join(repoRoot, "screenshots");
  if (existsSync(screenshotsDir)) {
    copyTreeInto(screenshotsDir, join(outputDir, "screenshots"));
  }
  const dossier = buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  });
  writeFileSync(join(outputDir, "dossier.json"), dossier);
}

main();
