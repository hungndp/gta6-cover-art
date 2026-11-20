// Neon Vice Cover Studio v3 — make.fun entrypoint.
// Copies the static app and the screenshots into the output directory and
// writes the dossier the grader compares byte for byte. The output directory
// itself is a mounted volume: it is created if missing and only its contents
// are cleared, entry by entry — the directory is never removed.
import { cpSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-app.ts";

const repoDir = dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

mkdirSync(outputDir, { recursive: true });
for (const entry of readdirSync(outputDir)) {
  rmSync(join(outputDir, entry), { recursive: true, force: true });
}

cpSync(join(repoDir, "app"), join(outputDir, "app"), { recursive: true });
cpSync(join(repoDir, "screenshots"), join(outputDir, "screenshots"), { recursive: true });

// buildDossier reads app/ and screenshots/ from one root directory and caps
// the source text it embeds at the competition's 160 KiB dossier limit.
const dossier = buildDossier(outputDir, { text_max_bytes: 163_840 });
writeFileSync(join(outputDir, "dossier.json"), dossier);

const dossierBytes = Buffer.byteLength(dossier);
console.log(`Neon Vice Cover Studio v3 handed in: app/ + screenshots/ + dossier.json (${dossierBytes} bytes) -> ${outputDir}`);
