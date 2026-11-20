# gta6-cover-art

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/hungndp/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/hungndp/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Neon Vice Cover Studio — turn your photo into a GTA 6-style multi-panel poster cover, offline in your browser.

## Run it

```sh
python3 -m http.server 8000 --directory app
```

Then open http://localhost:8000 in desktop Chrome. Add a photo (or tap a sample), pick one of 8 layouts and 8 colour grades, tag the cast, add callouts, and export a PNG in 1080×1080, 1080×1350 or 1920×1080.

## What it does

- **8 layout templates** — Hero Duo, Split Duo, Trio Strip, Quad Grid, Hero Left, Hero Right, Five Panel and Mosaic 8, from 2 to 8 panels.
- **8 colour grades** — Sunset, Neon, Dusk Purple, Teal Noir, Gold Hour, Vice Pink, Mono Noir and Tropical, with a strength slider.
- **Face-aware crops** — per-panel focus point you drag on the preview, plus an auto-detect that scans the photo for skin-tone regions and centres the crop on the face.
- **Cast role tags** — LEAD, CREW, RIVAL, DRIVER, LOOKOUT, ENFORCER, FIXER, WHEELMAN, or any custom tag, per panel.
- **Caption editing** — text, size, placement (top / centre / bottom) and 5 styles: Sunset outline, Neon glow, Solid block, Gold foil, Vice pink.
- **Callouts** — annotation labels with leader lines pointing at a panel, positioned with sliders.
- **Seal stamp** — a Vice City seal on the cover, with editable text.
- **Billing block** — a cast / crew credits strip along the bottom, editable.
- **3-size PNG export** — 1080×1080, 1080×1350 and 1920×1080, one click each or all three at once.
- **Fully offline** — no network requests; scripts, fonts and sample photos all ship under `app/`. Photos never leave your machine.

## Fonts

Anton, Archivo Black and Oswald, all under the SIL Open Font License 1.1 — see `app/fonts/OFL.txt`.

## Originality

An original fan-style poster maker, not affiliated with Rockstar Games. No Rockstar logo, wordmark, official artwork, character or font is used anywhere in the app.

---

<sub>Entered on [make.fun](https://make.fun/?ref=ebjdb2tv&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
