# gta6-cover-art

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/hungndp/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/hungndp/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

**Neon Vice Cover Studio v3** — an offline, canvas-based poster studio that turns your own photos into GTA-style multi-panel cover art. Ten layout templates (including the slanted, title-over-art **Heatwave** and the **Hero Close-Up**), a **pop-out hero cut-out** that lifts the subject out of its panel, face-aware crops, auto cast role tags, nine colour grades (Portrait Guard protects skin tones), a per-panel painted look, seven caption styles (Block, Outline, Neon Glow, Retro Script, Minimal Sans, **Retro Chrome** and extruded **Chrome 3D**), draggable callouts, a Vice City seal, an editable billing block and the Golden Mile signature frame. Export print-ready PNGs at 1080×1080, 1080×1350 and 1920×1080 — everything runs locally in the browser, no uploads, no build step. All lettering and art are original; bundled fonts are SIL OFL.

## Run it

```sh
# Serve the static app (any static server works — it is fully offline):
python3 -m http.server 8000 --directory app
# then open http://localhost:8000 in a browser.
# Grader entrypoint (copies app/ + screenshots/ to the output dir and writes dossier.json):
node --experimental-strip-types main.ts
```

---
<sub>Entered on [make.fun](https://make.fun/?ref=ebjdb2tv&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
