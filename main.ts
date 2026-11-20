// Neon Vice Cover Studio v3 — make.fun entrypoint.
//
// The grader mounts the output directory itself, so this script must
// never remove the directory: it creates it if needed, clears only the
// entries INSIDE it, then copies the app and screenshots in and writes
// the dossier the scorer expects.
import { chmodSync, cpSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const rootDir = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

mkdirSync(outDir, { recursive: true });

// Remove one entry from the output dir. A previous run may have copied in
// read-only directory modes (source checkouts can be a-w), which would
// otherwise make a re-run fail while emptying a folder it owns: loosen
// the modes on our own leftovers, then remove.
function clearEntry(path: string): void {
  try {
    rmSync(path, { recursive: true, force: true });
  } catch {
    const loosen = (p: string): void => {
      const st = statSync(p);
      chmodSync(p, st.isDirectory() ? 0o755 : 0o644);
      if (st.isDirectory()) for (const name of readdirSync(p)) loosen(join(p, name));
    };
    loosen(path);
    rmSync(path, { recursive: true, force: true });
  }
}

// Clear the previous run's contents without touching the directory itself.
for (const name of readdirSync(outDir)) {
  clearEntry(join(outDir, name));
}

cpSync(join(rootDir, 'app'), join(outDir, 'app'), { recursive: true });
cpSync(join(rootDir, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 48 * 1024 * 1024,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);

const shotCount = readdirSync(join(outDir, 'screenshots')).length;
console.log(`neon-vice-cover-studio: wrote app/, screenshots/ (${shotCount} shots) and dossier.json (${dossier.length} bytes) to ${outDir}`);
