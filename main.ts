// Neon Vice Cover Studio — entrypoint for make.fun's gta6-cover-art-01.
// Copies app/ and screenshots/ into the output directory and writes
// dossier.json with buildDossier from vendor/makefun-app.ts.
// Grader rule (learned the hard way): NEVER delete the output directory
// itself — the grader mounts it as a volume, so removing it fails EPERM.
// We only ever clear its CONTENTS, entry by entry, then write into it.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildDossier } from "./vendor/makefun-app.ts";

const OUT_DIR = process.env.MAKEFUN_OUTPUT_DIR || "/output";
const REPO_ROOT = process.cwd();

function clearOutputContents(dir: string): void {
  mkdirSync(dir, { recursive: true });
  for (const entry of readdirSync(dir)) {
    rmSync(join(dir, entry), { recursive: true, force: true });
  }
}

function copyTreeIntoOutput(): void {
  clearOutputContents(OUT_DIR);
  for (const name of ["app", "screenshots"]) {
    const src = join(REPO_ROOT, name);
    if (existsSync(src)) {
      cpSync(src, join(OUT_DIR, name), { recursive: true });
    }
  }
}

function writeCoverDossier(): void {
  const dossier = buildDossier(OUT_DIR, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  });
  writeFileSync(join(OUT_DIR, "dossier.json"), dossier);
}

copyTreeIntoOutput();
writeCoverDossier();
console.log("Neon Vice Cover Studio packaged into " + OUT_DIR);
