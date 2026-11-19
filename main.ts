/* Neon Vice Cover Studio — entry program (main.ts).
 *
 * Copies app/ and screenshots/ from this repository into the output
 * directory (default /output, or $MAKEFUN_OUTPUT_DIR) and writes
 * /output/dossier.json with buildDossier from vendor/makefun-app.ts.
 * Node 22 standard library only; no network, no installs.
 */

import { cpSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-app.ts";

const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

function main(): void {
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)));
  const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? "/output");

  // Start clean so a stale file can never leak into a second run.
  // Never remove outDir itself: in the grader it is a mounted volume
  // and removing it fails with EPERM. Clear its contents instead.
  mkdirSync(outDir, { recursive: true });
  for (const name of readdirSync(outDir)) {
    rmSync(join(outDir, name), { recursive: true, force: true });
  }

  for (const name of ["app", "screenshots"]) {
    const src = join(repoRoot, name);
    const dst = join(outDir, name);
    cpSync(src, dst, { recursive: true });
  }

  const dossier = buildDossier(outDir, CAPS);
  writeFileSync(join(outDir, "dossier.json"), dossier);

  console.log(`wrote ${join(outDir, "dossier.json")} (${dossier.length} bytes)`);
}

main();
