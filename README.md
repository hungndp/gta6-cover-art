# gta6-cover-art

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/hungndp/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/hungndp/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

**Neon Vice Cover Studio v3** — an offline web app that turns your own photos into GTA-style multi-panel cover art and exports shareable PNGs at 1080×1080, 1080×1350 and 1920×1080. New in v3: an on-device **pop-out hero cut-out** (colour-distance + flood-fill background removal, the subject overflows its panel), **striped retro-chrome titles plus an extruded 3D variant** (caption styles 6–7), the **Heatwave** layout (title over the art, slanted panels, sky-glow gradient), a **hero close-up** layout, **auto cast tags** suggested from panel size, position and face presence, the **“Golden Mile” signature gold frame**, a 9th colour grade (**Portrait Guard**, which protects skin tones) and a per-panel **painted filter**. Carried over from v2: 8 further layout templates, 9 grades with a strength slider, face-aware crops (skin-tone scan + draggable focus point), editable per-panel cast role tags, callouts with leader lines, the Vice City seal stamp, an editable billing block, 5 classic caption styles with auto-fit, and export-all. Everything runs locally in the browser — photos are never uploaded. Bundled fonts (Fjalla One, Alfa Slab One, Teko) are SIL Open Font License; see `app/fonts/OFL.txt`.

Bounty: [Make GTA 6 Cover Art on make.fun](https://make.fun/bounty/gta6-cover-art-01) ($250).

## Run it

```sh
python3 -m http.server 8080 --directory app   # any static server pointed at app/ works
# then open http://localhost:8080 in desktop Chrome
MAKEFUN_OUTPUT_DIR=out node main.ts           # hand-in: copies app/ + screenshots/ and writes dossier.json
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=ebjdb2tv&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
