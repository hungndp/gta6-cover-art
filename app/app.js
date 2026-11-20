/* Neon Vice Cover Studio v3
 * An offline, canvas-based multi-panel poster studio.
 * Everything runs client-side: photos never leave the machine.
 * v3 additions: pop-out hero cut-out, retro-chrome + extruded chrome titles,
 * Heatwave slanted layout, Hero Close-Up layout, auto cast tags,
 * Golden Mile frame, a 9th grade (Portrait Guard) and a painted panel look.
 */
'use strict';

/* ---------------------------------------------------------------- helpers */
const $ = (id) => document.getElementById(id);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const lerp = (a, b, t) => a + (b - a) * t;

function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/* ---------------------------------------------------------------- layouts
 * Panel rectangles are fractions of the poster. `slant` shears the panel
 * into a parallelogram (Heatwave). `hero` is the index of the hero panel.
 */
const LAYOUTS = {
  duo: {
    label: 'Duo Split', hero: 0,
    panels: [
      { x: 0.00, y: 0.00, w: 0.50, h: 1.00 },
      { x: 0.50, y: 0.00, w: 0.50, h: 1.00 },
    ],
  },
  trio: {
    label: 'Trio Row', hero: 0,
    panels: [
      { x: 0.000, y: 0.00, w: 0.334, h: 1.00 },
      { x: 0.334, y: 0.00, w: 0.333, h: 1.00 },
      { x: 0.667, y: 0.00, w: 0.333, h: 1.00 },
    ],
  },
  quad: {
    label: 'Quad Grid', hero: 0,
    panels: [
      { x: 0.0, y: 0.0, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0.0, w: 0.5, h: 0.5 },
      { x: 0.0, y: 0.5, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ],
  },
  heroStrip: {
    label: 'Hero + Strip', hero: 0,
    panels: [
      { x: 0.00, y: 0.00, w: 0.62, h: 1.00 },
      { x: 0.62, y: 0.00, w: 0.38, h: 0.50 },
      { x: 0.62, y: 0.50, w: 0.38, h: 0.50 },
    ],
  },
  fiveStack: {
    label: 'Headline Five', hero: 0,
    panels: [
      { x: 0.00, y: 0.00, w: 1.00, h: 0.52 },
      { x: 0.00, y: 0.52, w: 0.25, h: 0.48 },
      { x: 0.25, y: 0.52, w: 0.25, h: 0.48 },
      { x: 0.50, y: 0.52, w: 0.25, h: 0.48 },
      { x: 0.75, y: 0.52, w: 0.25, h: 0.48 },
    ],
  },
  sixGrid: {
    label: 'Six Grid', hero: 0,
    panels: [
      { x: 0.000, y: 0.0, w: 0.334, h: 0.5 },
      { x: 0.334, y: 0.0, w: 0.333, h: 0.5 },
      { x: 0.667, y: 0.0, w: 0.333, h: 0.5 },
      { x: 0.000, y: 0.5, w: 0.334, h: 0.5 },
      { x: 0.334, y: 0.5, w: 0.333, h: 0.5 },
      { x: 0.667, y: 0.5, w: 0.333, h: 0.5 },
    ],
  },
  sevenMix: {
    label: 'Seven Mix', hero: 0,
    panels: [
      { x: 0.00, y: 0.000, w: 0.50, h: 1.000 },
      { x: 0.50, y: 0.000, w: 0.25, h: 0.334 },
      { x: 0.75, y: 0.000, w: 0.25, h: 0.334 },
      { x: 0.50, y: 0.334, w: 0.25, h: 0.333 },
      { x: 0.75, y: 0.334, w: 0.25, h: 0.333 },
      { x: 0.50, y: 0.667, w: 0.25, h: 0.333 },
      { x: 0.75, y: 0.667, w: 0.25, h: 0.333 },
    ],
  },
  mosaic8: {
    label: 'Mosaic', hero: 0,
    panels: [
      { x: 0.00, y: 0.00, w: 0.50, h: 0.40 },
      { x: 0.50, y: 0.00, w: 0.25, h: 0.40 },
      { x: 0.75, y: 0.00, w: 0.25, h: 0.40 },
      { x: 0.00, y: 0.40, w: 0.25, h: 0.35 },
      { x: 0.25, y: 0.40, w: 0.50, h: 0.35 },
      { x: 0.75, y: 0.40, w: 0.25, h: 0.35 },
      { x: 0.00, y: 0.75, w: 0.60, h: 0.25 },
      { x: 0.60, y: 0.75, w: 0.40, h: 0.25 },
    ],
  },
  heatwave: {
    label: 'Heatwave', hero: 0, skyGlow: true,
    panels: [
      { x: -0.06, y: 0.00, w: 0.68, h: 0.62, slant: 0.16 },
      { x: 0.56, y: 0.03, w: 0.52, h: 0.57, slant: 0.16 },
      { x: -0.04, y: 0.58, w: 0.60, h: 0.44, slant: 0.16 },
      { x: 0.50, y: 0.60, w: 0.58, h: 0.42, slant: 0.16 },
    ],
  },
  heroClose: {
    label: 'Hero Close-Up', hero: 0,
    panels: [
      { x: 0.00, y: 0.00, w: 0.64, h: 1.00 },
      { x: 0.64, y: 0.00, w: 0.36, h: 0.34 },
      { x: 0.64, y: 0.34, w: 0.36, h: 0.33 },
      { x: 0.64, y: 0.67, w: 0.36, h: 0.33 },
    ],
  },
};

/* ---------------------------------------------------------------- grades
 * Per-pixel colour grades. Split toning via shadow/highlight tints,
 * saturation/contrast/brightness shaping; Portrait Guard blends skin
 * pixels back toward the original so faces stay natural.
 */
const GRADES = {
  vice:     { sat: 1.28, con: 1.10, bri: 1.02, shadow: [38, 10, 46],  high: [255, 166, 88],  vig: 0.22 },
  neon:     { sat: 1.38, con: 1.16, bri: 1.00, shadow: [8, 22, 58],   high: [255, 110, 190], vig: 0.30 },
  ocean:    { sat: 1.16, con: 1.08, bri: 1.03, shadow: [6, 44, 52],   high: [170, 235, 225], vig: 0.18 },
  candy:    { sat: 1.22, con: 0.94, bri: 1.09, shadow: [52, 26, 60],  high: [255, 196, 226], vig: 0.10 },
  noir:     { sat: 0.22, con: 1.32, bri: 0.99, shadow: [10, 12, 20],  high: [228, 232, 240], vig: 0.38 },
  golden:   { sat: 1.15, con: 1.06, bri: 1.06, shadow: [44, 26, 8],   high: [255, 208, 120], vig: 0.20 },
  toxic:    { sat: 1.32, con: 1.12, bri: 1.01, shadow: [8, 42, 18],   high: [196, 255, 150], vig: 0.26 },
  midnight: { sat: 1.05, con: 1.22, bri: 0.90, shadow: [6, 10, 34],   high: [150, 180, 255], vig: 0.42 },
  portrait: { sat: 1.08, con: 1.05, bri: 1.04, shadow: [30, 18, 26],  high: [255, 196, 160], vig: 0.14, guardSkin: true },
};

const ROLE_WORDS = ['LEAD', 'DRIVER', 'MUSCLE', 'LOOKOUT', 'GETAWAY', 'SNIPER', 'FIXER', 'KINGPIN'];

/* ---------------------------------------------------------------- state */
const state = {
  photos: [],            // { src, name, w, h, face|null, faceDone }
  layout: 'heroClose',
  aspect: { w: 1080, h: 1080 },
  title: 'NEON VICE',
  subtitle: 'ONE CITY · ONE SCORE',
  titleStyle: 'chrome3d',
  titlePlace: 'top',
  titleScale: 1,
  grade: 'vice',
  gradeStrength: 0.85,
  faceAware: true,
  panels: [],            // per-panel editable state, rebuilt per layout
  selected: 0,
  seal: true,
  sealPos: 'br',
  billing: true,
  billingText: '',
  frame: false,
  callouts: [],          // { text, ax, ay, bx, by }
  matteThreshold: 58,
};

function freshPanel(photoIdx) {
  return {
    photo: photoIdx,
    zoom: 1,
    fx: 0.5, fy: 0.42,        // focus point, fractions of the photo
    painted: false,
    popout: false,
    tag: '',
    matte: null,              // cached cut-out canvas
    matteKey: '',
  };
}

function rebuildPanels(keep) {
  const def = LAYOUTS[state.layout];
  const old = keep ? state.panels : [];
  state.panels = def.panels.map((_, i) => {
    if (old[i]) return old[i];
    return freshPanel(state.photos.length ? i % state.photos.length : -1);
  });
  if (state.selected >= state.panels.length) state.selected = 0;
  // The hero panel carries the pop-out by default when a photo is present.
  const hero = state.panels[def.hero];
  if (hero && hero.photo >= 0 && !keep) hero.popout = true;
}

/* ------------------------------------------------------- image processing */
function photoSize(photo) {
  return { w: photo.src.naturalWidth || photo.src.width, h: photo.src.naturalHeight || photo.src.height };
}

/* Cover-fit transform: returns draw params so the photo fills the panel
 * with the focus point (fx, fy) placed as centrally as the edges allow. */
function coverTransform(photo, pw, ph, panel) {
  const { w: iw, h: ih } = photoSize(photo);
  const scale = Math.max(pw / iw, ph / ih) * panel.zoom;
  const dw = iw * scale, dh = ih * scale;
  const dx = -(dw - pw) * clamp(panel.fx, 0, 1);
  const dy = -(dh - ph) * clamp(panel.fy, 0, 1);
  return { scale, dw, dh, dx, dy, iw, ih };
}

function isSkinPixel(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  return r > 95 && g > 40 && b > 20 && r > g && r > b &&
    (r - g) > 12 && (mx - mn) > 15 && r < 250;
}

/* Apply the active grade (blended by strength) to an ImageData in place. */
function applyGrade(imgData, gradeKey, strength) {
  const g = GRADES[gradeKey];
  if (!g || strength <= 0) return;
  const d = imgData.data;
  const sT = g.shadow, hT = g.high;
  for (let i = 0; i < d.length; i += 4) {
    const r0 = d[i], g0 = d[i + 1], b0 = d[i + 2];
    let r = r0, gg = g0, b = b0;
    // contrast + brightness
    r = ((r / 255 - 0.5) * g.con + 0.5) * 255 * g.bri;
    gg = ((gg / 255 - 0.5) * g.con + 0.5) * 255 * g.bri;
    b = ((b / 255 - 0.5) * g.con + 0.5) * 255 * g.bri;
    // saturation around luma
    const luma = 0.2126 * r + 0.7152 * gg + 0.0722 * b;
    r = luma + (r - luma) * g.sat;
    gg = luma + (gg - luma) * g.sat;
    b = luma + (b - luma) * g.sat;
    // split tone: shadows lean to shadow tint, highlights to highlight tint
    const t = clamp(luma / 255, 0, 1);
    const sAmt = (1 - t) * 0.16, hAmt = t * 0.14;
    r += (sT[0] - 128) * sAmt + (hT[0] - 128) * hAmt;
    gg += (sT[1] - 128) * sAmt + (hT[1] - 128) * hAmt;
    b += (sT[2] - 128) * sAmt + (hT[2] - 128) * hAmt;
    if (g.guardSkin && isSkinPixel(r0, g0, b0)) {
      // Portrait Guard: keep half of the original skin colour.
      r = lerp(r, r0, 0.55); gg = lerp(gg, g0, 0.55); b = lerp(b, b0, 0.55);
    }
    d[i]     = lerp(r0, clamp(r, 0, 255), strength);
    d[i + 1] = lerp(g0, clamp(gg, 0, 255), strength);
    d[i + 2] = lerp(b0, clamp(b, 0, 255), strength);
  }
}

/* Painted look: posterise colours, then darken Sobel edges like ink lines. */
function applyPainted(imgData) {
  const { width: w, height: h } = imgData;
  const src = new Uint8ClampedArray(imgData.data);
  const d = imgData.data;
  const levels = 5, step = 255 / (levels - 1);
  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    lum[i] = 0.2126 * src[i * 4] + 0.7152 * src[i * 4 + 1] + 0.0722 * src[i * 4 + 2];
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x, o = i * 4;
      d[o]     = Math.round(src[o] / step) * step;
      d[o + 1] = Math.round(src[o + 1] / step) * step;
      d[o + 2] = Math.round(src[o + 2] / step) * step;
      if (x > 0 && y > 0 && x < w - 1 && y < h - 1) {
        const gx = lum[i - w + 1] + 2 * lum[i + 1] + lum[i + w + 1] - lum[i - w - 1] - 2 * lum[i - 1] - lum[i + w - 1];
        const gy = lum[i + w - 1] + 2 * lum[i + w] + lum[i + w + 1] - lum[i - w - 1] - 2 * lum[i - w] - lum[i - w + 1];
        const mag = Math.min(1, Math.sqrt(gx * gx + gy * gy) / 620);
        const ink = 1 - mag * 0.55;
        d[o] *= ink; d[o + 1] *= ink; d[o + 2] *= ink;
      }
    }
  }
}

/* Face scan: downscale, classify skin pixels, keep the largest blob.
 * Returns a normalised box {x, y, w, h} or null. People-first by design. */
function detectFace(photo) {
  const { w: iw, h: ih } = photoSize(photo);
  const sw = 160, sh = Math.max(8, Math.round(160 * ih / iw));
  const c = document.createElement('canvas');
  c.width = sw; c.height = sh;
  const cx = c.getContext('2d', { willReadFrequently: true });
  cx.drawImage(photo.src, 0, 0, sw, sh);
  let px;
  try { px = cx.getImageData(0, 0, sw, sh).data; } catch (e) { return null; }
  const mask = new Uint8Array(sw * sh);
  for (let i = 0; i < sw * sh; i++) {
    if (isSkinPixel(px[i * 4], px[i * 4 + 1], px[i * 4 + 2])) mask[i] = 1;
  }
  const seen = new Uint8Array(sw * sh);
  let best = null;
  for (let s = 0; s < sw * sh; s++) {
    if (!mask[s] || seen[s]) continue;
    const stack = [s]; seen[s] = 1;
    let n = 0, x0 = sw, x1 = 0, y0 = sh, y1 = 0;
    while (stack.length) {
      const p = stack.pop(); n++;
      const x = p % sw, y = (p / sw) | 0;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
      const nb = [p - 1, p + 1, p - sw, p + sw];
      for (const q of nb) {
        if (q < 0 || q >= sw * sh || seen[q] || !mask[q]) continue;
        if (Math.abs((q % sw) - x) > 1) continue;
        seen[q] = 1; stack.push(q);
      }
    }
    if (!best || n > best.n) best = { n, x0, x1, y0, y1 };
  }
  if (!best || best.n < sw * sh * 0.012) return null;
  // Faces sit in the upper part of a skin blob (shoulders widen the base),
  // so trim the box height to the top ~72% around the blob's face core.
  const bw = (best.x1 - best.x0 + 1) / sw, bh = (best.y1 - best.y0 + 1) / sh;
  return {
    x: best.x0 / sw, y: best.y0 / sh,
    w: bw, h: bh * 0.78,
    cx: (best.x0 + best.x1 + 1) / 2 / sw,
    cy: (best.y0 + best.y0 + bh * sh * 0.36) / sh,
    area: bw * bh,
  };
}

function ensureFace(photo) {
  if (photo.faceDone) return photo.face;
  photo.face = detectFace(photo);
  photo.faceDone = true;
  return photo.face;
}

/* Pop-out matte: sample the four corner colours, score every pixel by
 * colour distance, flood-fill the reachable background from the edges,
 * and keep a soft alpha ramp so hair/shoulders feather into the poster. */
function buildMatte(photo, threshold) {
  const { w: iw, h: ih } = photoSize(photo);
  const mw = 440, mh = Math.max(8, Math.round(440 * ih / iw));
  const c = document.createElement('canvas');
  c.width = mw; c.height = mh;
  const cx = c.getContext('2d', { willReadFrequently: true });
  cx.drawImage(photo.src, 0, 0, mw, mh);
  const img = cx.getImageData(0, 0, mw, mh);
  const d = img.data;
  const corners = [];
  const patch = 10;
  for (const [px0, py0] of [[0, 0], [mw - patch, 0], [0, mh - patch], [mw - patch, mh - patch]]) {
    let r = 0, g = 0, b = 0, n = 0;
    for (let y = py0; y < py0 + patch; y++) for (let x = px0; x < px0 + patch; x++) {
      const o = (y * mw + x) * 4;
      r += d[o]; g += d[o + 1]; b += d[o + 2]; n++;
    }
    corners.push([r / n, g / n, b / n]);
  }
  const dist = new Float32Array(mw * mh);
  for (let i = 0; i < mw * mh; i++) {
    const o = i * 4;
    let m = Infinity;
    for (const [cr, cg, cb] of corners) {
      const dr = d[o] - cr, dg = d[o + 1] - cg, db = d[o + 2] - cb;
      const dd = 0.30 * dr * dr + 0.59 * dg * dg + 0.11 * db * db;
      if (dd < m) m = dd;
    }
    dist[i] = Math.sqrt(m);
  }
  // People first: skin pixels and the detected face box are locked as
  // foreground — the flood fill may not cross them and they never fade.
  const locked = new Uint8Array(mw * mh);
  for (let i = 0; i < mw * mh; i++) {
    const o = i * 4;
    if (isSkinPixel(d[o], d[o + 1], d[o + 2])) locked[i] = 1;
  }
  const face = photo.faceDone ? photo.face : detectFace(photo);
  if (face) {
    const fx0 = Math.max(0, Math.floor((face.x - face.w * 0.12) * mw));
    const fy0 = Math.max(0, Math.floor((face.y - face.h * 0.12) * mh));
    const fx1 = Math.min(mw - 1, Math.ceil((face.x + face.w * 1.12) * mw));
    const fy1 = Math.min(mh - 1, Math.ceil((face.y + face.h * 1.12) * mh));
    for (let y = fy0; y <= fy1; y++) for (let x = fx0; x <= fx1; x++) locked[y * mw + x] = 1;
  }
  const reach = new Uint8Array(mw * mh);
  const stack = [];
  // Region growing: the fill spreads through pixels that stay within a
  // generous distance of a corner colour AND change only gradually from
  // their neighbour — so gradient skies and seas flood fully, while the
  // hard colour step at a subject's edge stops the fill cold.
  const stepOk = (from, to) => {
    const fo = from * 4, to2 = to * 4;
    const dr = d[fo] - d[to2], dg = d[fo + 1] - d[to2 + 1], db = d[fo + 2] - d[to2 + 2];
    return 0.30 * dr * dr + 0.59 * dg * dg + 0.11 * db * db < 26 * 26;
  };
  const seed = (p) => { if (!reach[p] && !locked[p] && dist[p] < threshold * 2.2) { reach[p] = 1; stack.push(p); } };
  for (let x = 0; x < mw; x++) { seed(x); seed((mh - 1) * mw + x); }
  for (let y = 0; y < mh; y++) { seed(y * mw); seed(y * mw + mw - 1); }
  // Interior seeding: pockets of unmistakable background colour that are
  // fenced off by the subject (water trapped between an arm, a rod and a
  // rail) seed their own fill — the gradual-step rule still stops the
  // fill at the subject's edge, and skin/face locks still protect people.
  for (let p = 0; p < mw * mh; p++) {
    if (!reach[p] && !locked[p] && dist[p] < threshold * 0.55) { reach[p] = 1; stack.push(p); }
  }
  while (stack.length) {
    const p = stack.pop();
    const x = p % mw;
    const tryGo = (q) => { if (!reach[q] && !locked[q] && dist[q] < threshold * 2.2 && stepOk(p, q)) { reach[q] = 1; stack.push(q); } };
    if (x > 0) tryGo(p - 1);
    if (x < mw - 1) tryGo(p + 1);
    if (p >= mw) tryGo(p - mw);
    if (p < mw * (mh - 1)) tryGo(p + mw);
  }
  for (let i = 0; i < mw * mh; i++) {
    d[i * 4 + 3] = (locked[i] || !reach[i]) ? 255 : 0;
  }
  cx.putImageData(img, 0, 0);
  // The alpha stays binary on purpose: a crisp cut edge reads as a deliberate
  // pop-out, while blurring the matte would soften the whole subject.
  return c;
}

function ensureMatte(panel) {
  const photo = state.photos[panel.photo];
  if (!photo) return null;
  const key = panel.photo + '|' + state.matteThreshold;
  if (panel.matte && panel.matteKey === key) return panel.matte;
  panel.matte = buildMatte(photo, state.matteThreshold);
  panel.matteKey = key;
  return panel.matte;
}

/* ------------------------------------------------------------- rendering */
const stage = $('stage');

function panelRect(def, W, H) {
  return { x: def.x * W, y: def.y * H, w: def.w * W, h: def.h * H, slant: (def.slant || 0) * W };
}

function panelPath(ctx, r) {
  const s = r.slant || 0;
  ctx.beginPath();
  ctx.moveTo(r.x + s, r.y);
  ctx.lineTo(r.x + r.w + s, r.y);
  ctx.lineTo(r.x + r.w - s, r.y + r.h);
  ctx.lineTo(r.x - s, r.y + r.h);
  ctx.closePath();
}

/* Render one panel's photo into an offscreen tile (crop + grade + paint). */
function renderPanelTile(panel, pw, ph) {
  const tile = document.createElement('canvas');
  tile.width = Math.max(2, Math.round(pw));
  tile.height = Math.max(2, Math.round(ph));
  const tc = tile.getContext('2d', { willReadFrequently: true });
  const photo = state.photos[panel.photo];
  if (!photo) {
    const grad = tc.createLinearGradient(0, 0, pw, ph);
    grad.addColorStop(0, '#2a3350'); grad.addColorStop(1, '#141a2c');
    tc.fillStyle = grad; tc.fillRect(0, 0, pw, ph);
    tc.fillStyle = 'rgba(255,255,255,0.5)';
    tc.font = `600 ${Math.max(11, ph * 0.055)}px Montserrat, sans-serif`;
    tc.textAlign = 'center'; tc.textBaseline = 'middle';
    tc.fillText('ADD A PHOTO', pw / 2, ph / 2);
    return tile;
  }
  const t = coverTransform(photo, pw, ph, panel);
  tc.drawImage(photo.src, t.dx, t.dy, t.dw, t.dh);
  const img = tc.getImageData(0, 0, tile.width, tile.height);
  if (panel.painted) applyPainted(img);
  applyGrade(img, state.grade, state.gradeStrength);
  tc.putImageData(img, 0, 0);
  // per-grade vignette + a soft top light for depth
  const vig = GRADES[state.grade].vig || 0;
  if (vig > 0) {
    const rg = tc.createRadialGradient(pw / 2, ph / 2, Math.min(pw, ph) * 0.35, pw / 2, ph / 2, Math.max(pw, ph) * 0.78);
    rg.addColorStop(0, 'rgba(0,0,0,0)');
    rg.addColorStop(1, `rgba(4,4,12,${vig})`);
    tc.fillStyle = rg; tc.fillRect(0, 0, pw, ph);
  }
  return tile;
}

function drawPanels(ctx, W, H) {
  const def = LAYOUTS[state.layout];
  const gap = Math.max(2, W * 0.004);
  def.panels.forEach((p, i) => {
    const panel = state.panels[i];
    const r = panelRect(p, W, H);
    const ir = { x: r.x + gap / 2, y: r.y + gap / 2, w: r.w - gap, h: r.h - gap, slant: r.slant };
    const tile = renderPanelTile(panel, ir.w, ir.h);
    ctx.save();
    panelPath(ctx, ir);
    ctx.clip();
    ctx.drawImage(tile, ir.x - Math.abs(ir.slant), ir.y, ir.w + Math.abs(ir.slant) * 2, ir.h);
    ctx.restore();
    // white keyline, GTA-cover style
    ctx.save();
    panelPath(ctx, ir);
    ctx.lineWidth = Math.max(1.4, W * 0.0022);
    ctx.strokeStyle = 'rgba(245,246,250,0.92)';
    ctx.stroke();
    ctx.restore();
    if (i === state.selected && !document.body.classList.contains('present')) {
      ctx.save();
      panelPath(ctx, ir);
      ctx.lineWidth = Math.max(2, W * 0.0035);
      ctx.strokeStyle = '#ffb340';
      ctx.setLineDash([W * 0.012, W * 0.008]);
      ctx.stroke();
      ctx.restore();
    }
  });
}

function drawSkyGlow(ctx, W, H) {
  const g = ctx.createLinearGradient(0, 0, 0, H * 0.62);
  g.addColorStop(0, 'rgba(255,92,140,0.34)');
  g.addColorStop(0.35, 'rgba(255,140,60,0.20)');
  g.addColorStop(1, 'rgba(255,140,60,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H * 0.62);
  const sun = ctx.createRadialGradient(W * 0.72, H * 0.10, 4, W * 0.72, H * 0.10, W * 0.30);
  sun.addColorStop(0, 'rgba(255,214,140,0.5)');
  sun.addColorStop(1, 'rgba(255,214,140,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, W, H);
}

/* The hero subject, cut out and drawn AFTER the panel keylines so it
 * overflows its frame — the signature v3 pop-out. */
function drawPopOut(ctx, W, H) {
  const def = LAYOUTS[state.layout];
  const hi = def.hero;
  const panel = state.panels[hi];
  if (!panel || !panel.popout || panel.photo < 0) return;
  const photo = state.photos[panel.photo];
  if (!photo) return;
  const matte = ensureMatte(panel);
  if (!matte) return;
  const r = panelRect(def.panels[hi], W, H);
  const t = coverTransform(photo, r.w, r.h, panel);
  const pop = 1.10; // overshoot so the subject breaks the frame
  const dw = t.dw * pop, dh = t.dh * pop;
  const dx = r.x + t.dx - (dw - t.dw) / 2;
  const dy = r.y + t.dy - (dh - t.dh) * 0.60; // bias upward: heads pop highest
  ctx.save();
  // Professional pop-out compositing: the cut-out layer lives in a ring
  // around its panel — outside the panel itself (plus a whisker of overlap
  // under the keyline) but never more than a spill's width beyond it — so
  // the subject spills over the frame without double-printing the panel's
  // own photo or flooding the neighbouring panels.
  const m = Math.min(r.w, r.h) * 0.015;
  const inner = { x: r.x + m, y: r.y + m, w: r.w - m * 2, h: r.h - m * 2, slant: r.slant };
  const ex = r.w * 0.10 + W * 0.012, ey = r.h * 0.10 + H * 0.012;
  const outer = { x: r.x - ex, y: r.y - ey, w: r.w + ex * 2, h: r.h + ey * 2, slant: r.slant };
  const trace = (rc) => {
    const s = rc.slant || 0;
    ctx.moveTo(rc.x + s, rc.y);
    ctx.lineTo(rc.x + rc.w + s, rc.y);
    ctx.lineTo(rc.x + rc.w - s, rc.y + rc.h);
    ctx.lineTo(rc.x - s, rc.y + rc.h);
    ctx.closePath();
  };
  // NOTE: subpaths are inlined here — panelPath() would call beginPath()
  // and wipe the ring this hole-punch depends on.
  ctx.beginPath();
  trace(outer);
  trace(inner);
  ctx.clip('evenodd');
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = W * 0.012;
  ctx.shadowOffsetY = W * 0.004;
  ctx.drawImage(matte, dx, dy, dw, dh);
  ctx.restore();
}

/* ---------------------------------------------------------------- titles */
function chromeGradient(ctx, y, size) {
  const g = ctx.createLinearGradient(0, y - size * 0.55, 0, y + size * 0.45);
  g.addColorStop(0.00, '#1d2a44');
  g.addColorStop(0.16, '#6f8dab');
  g.addColorStop(0.28, '#eef5ff');
  g.addColorStop(0.36, '#f9fcff');
  g.addColorStop(0.44, '#7e97b5');
  g.addColorStop(0.52, '#232f49');
  g.addColorStop(0.545, '#d7e5f5');
  g.addColorStop(0.60, '#54687f');
  g.addColorStop(0.74, '#e8f1fc');
  g.addColorStop(0.88, '#31405c');
  g.addColorStop(1.00, '#0d1526');
  return g;
}

function fitFont(ctx, text, family, weight, maxWidth, startSize, spacingRatio) {
  let size = startSize;
  ctx.font = `${weight} ${size}px ${family}`;
  if (spacingRatio) { try { ctx.letterSpacing = `${size * spacingRatio}px`; } catch (e) { /* ignore */ } }
  while (ctx.measureText(text).width > maxWidth && size > 10) {
    size *= 0.94;
    ctx.font = `${weight} ${size}px ${family}`;
    if (spacingRatio) { try { ctx.letterSpacing = `${size * spacingRatio}px`; } catch (e) { /* ignore */ } }
  }
  return size;
}

function drawTitleText(ctx, W, H) {
  const title = (state.title || '').trim();
  const sub = (state.subtitle || '').trim();
  if (!title && !sub) return;
  const place = state.titlePlace;
  let baseY;
  if (place === 'bottom') baseY = H * 0.90;
  else if (place === 'over') baseY = H * 0.30;
  else baseY = H * 0.115;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // scrim so lettering stays readable over busy art
  if (place !== 'over') {
    const sg = ctx.createLinearGradient(0, place === 'bottom' ? H * 0.74 : 0, 0, place === 'bottom' ? H : H * 0.26);
    if (place === 'bottom') { sg.addColorStop(0, 'rgba(5,6,12,0)'); sg.addColorStop(1, 'rgba(5,6,12,0.55)'); }
    else { sg.addColorStop(0, 'rgba(5,6,12,0.55)'); sg.addColorStop(1, 'rgba(5,6,12,0)'); }
    ctx.fillStyle = sg;
    ctx.fillRect(0, place === 'bottom' ? H * 0.74 : 0, W, H * 0.26);
  }

  const style = state.titleStyle;
  const family = style === 'script' ? '"Segoe Script", "Brush Script MT", cursive'
    : style === 'minimal' ? '"Montserrat", sans-serif'
    : '"Bebas Neue", sans-serif';
  const weight = style === 'minimal' ? 800 : 400;
  const titleSpacing = style === 'minimal' ? 0.16 : 0.03;
  let size = fitFont(ctx, title, family, weight, W * 0.92, H * 0.17 * state.titleScale, titleSpacing);
  if (style === 'script') size *= 0.92;
  ctx.font = `${weight} ${size}px ${family}`;
  try { ctx.letterSpacing = `${size * titleSpacing}px`; } catch (e) { /* older engines */ }

  const cxp = W / 2;
  if (style === 'chrome3d') {
    const depth = Math.max(3, size * 0.085);
    ctx.fillStyle = '#160d2e';
    for (let i = depth; i >= 1; i--) ctx.fillText(title, cxp + i * 0.72, baseY + i);
    ctx.fillStyle = '#ff2e7e';
    ctx.fillText(title, cxp + depth * 0.72, baseY + depth + size * 0.035);
    ctx.fillStyle = chromeGradient(ctx, baseY, size);
    ctx.fillText(title, cxp, baseY);
    ctx.lineWidth = Math.max(1, size * 0.016);
    ctx.strokeStyle = 'rgba(8,10,20,0.85)';
    ctx.strokeText(title, cxp, baseY);
  } else if (style === 'chrome') {
    ctx.fillStyle = chromeGradient(ctx, baseY, size);
    ctx.fillText(title, cxp, baseY);
    ctx.lineWidth = Math.max(1, size * 0.02);
    ctx.strokeStyle = 'rgba(8,10,20,0.9)';
    ctx.strokeText(title, cxp, baseY);
  } else if (style === 'neon') {
    ctx.shadowColor = '#ff2e88'; ctx.shadowBlur = size * 0.32;
    ctx.fillStyle = '#ffd7ec';
    ctx.fillText(title, cxp, baseY);
    ctx.fillText(title, cxp, baseY);
    ctx.shadowColor = '#22d3ee'; ctx.shadowBlur = size * 0.18;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(title, cxp, baseY);
    ctx.shadowBlur = 0;
  } else if (style === 'outline') {
    ctx.lineWidth = Math.max(1.6, size * 0.045);
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText(title, cxp, baseY);
    ctx.lineWidth = Math.max(0.8, size * 0.012);
    ctx.strokeStyle = 'rgba(255,179,64,0.9)';
    ctx.strokeText(title, cxp, baseY + size * 0.02);
  } else if (style === 'script') {
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = size * 0.08; ctx.shadowOffsetY = size * 0.03;
    const g = ctx.createLinearGradient(0, baseY - size / 2, 0, baseY + size / 2);
    g.addColorStop(0, '#ffe9a8'); g.addColorStop(0.55, '#ffb340'); g.addColorStop(1, '#ff5e8a');
    ctx.fillStyle = g;
    ctx.fillText(title, cxp, baseY);
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  } else if (style === 'minimal') {
    ctx.fillStyle = '#f5f6fa';
    ctx.fillText(title.toUpperCase(), cxp, baseY);
  } else { // block
    ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 0;
    ctx.shadowOffsetX = size * 0.045; ctx.shadowOffsetY = size * 0.05;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(title, cxp, baseY);
    ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
  }

  if (sub) {
    const sSize = fitFont(ctx, sub.toUpperCase(), '"Barlow Condensed", sans-serif', 700, W * 0.8, size * 0.34, 0.34);
    ctx.font = `700 ${sSize}px "Barlow Condensed", sans-serif`;
    try { ctx.letterSpacing = `${sSize * 0.34}px`; } catch (e) { /* ignore */ }
    ctx.fillStyle = '#ffd75e';
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = sSize * 0.18;
    ctx.fillText(sub.toUpperCase(), cxp, baseY + size * 0.62);
    ctx.shadowBlur = 0;
  }
  try { ctx.letterSpacing = '0px'; } catch (e) { /* ignore */ }
  ctx.restore();
}

/* ------------------------------------------------------- poster dressing */
function drawTags(ctx, W, H) {
  const def = LAYOUTS[state.layout];
  ctx.save();
  ctx.textBaseline = 'middle';
  def.panels.forEach((p, i) => {
    const tag = (state.panels[i].tag || '').trim();
    if (!tag) return;
    const r = panelRect(p, W, H);
    const size = clamp(Math.min(r.w, r.h) * 0.085, H * 0.016, H * 0.034);
    ctx.font = `700 ${size}px "Barlow Condensed", sans-serif`;
    const tw = ctx.measureText(tag.toUpperCase()).width;
    const padX = size * 0.55, chipH = size * 1.5;
    const chipW = tw + padX * 2;
    let x = r.x + W * 0.012;
    let y = r.y + r.h - chipH - H * 0.012;
    // Panels that reach the poster's bottom edge lift their chip clear of
    // the billing line; every chip is clamped fully inside the poster.
    if (state.billing && r.y + r.h > H * 0.97) y -= H * 0.026;
    x = clamp(x, W * 0.008, W - chipW - W * 0.008);
    y = clamp(y, H * 0.008, H - chipH - H * 0.008);
    ctx.fillStyle = 'rgba(8,10,18,0.85)';
    roundRectPath(ctx, x, y, chipW, chipH, chipH * 0.28);
    ctx.fill();
    ctx.lineWidth = Math.max(1, size * 0.06);
    ctx.strokeStyle = '#ffb340';
    ctx.stroke();
    ctx.fillStyle = '#ffd75e';
    ctx.fillText(tag.toUpperCase(), x + padX, y + chipH / 2 + size * 0.04);
  });
  ctx.restore();
}

function drawCallouts(ctx, W, H) {
  ctx.save();
  for (const co of state.callouts) {
    const ax = co.ax * W, ay = co.ay * H;
    const bx = co.bx * W, by = co.by * H;
    const size = H * 0.021;
    ctx.font = `700 ${size}px "Barlow Condensed", sans-serif`;
    const tw = ctx.measureText(co.text.toUpperCase()).width;
    const bw = tw + size * 1.1, bh = size * 1.7;
    // leader line from the anchor dot to the box edge
    ctx.strokeStyle = 'rgba(255,215,94,0.95)';
    ctx.lineWidth = Math.max(1.2, H * 0.0016);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx + (ax < bx ? 0 : bw), by + bh / 2);
    ctx.stroke();
    ctx.fillStyle = '#ffd75e';
    ctx.beginPath();
    ctx.arc(ax, ay, Math.max(2.5, H * 0.0045), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(8,10,18,0.88)';
    roundRectPath(ctx, bx, by, bw, bh, bh * 0.3);
    ctx.fill();
    ctx.strokeStyle = '#ffd75e';
    ctx.stroke();
    ctx.fillStyle = '#ffe9a8';
    ctx.textBaseline = 'middle';
    ctx.fillText(co.text.toUpperCase(), bx + size * 0.55, by + bh / 2 + size * 0.05);
  }
  ctx.restore();
}

function drawStar(ctx, cxp, cyp, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + i * Math.PI / 5;
    const x = cxp + Math.cos(a) * rad, y = cyp + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawSeal(ctx, W, H) {
  const R = Math.min(W, H) * 0.085;
  const m = R * 1.25;
  const pos = {
    br: [W - m, H - m], bl: [m, H - m],
    tr: [W - m, m], tl: [m, m],
  }[state.sealPos] || [W - m, H - m];
  const [cxp, cyp] = pos;
  ctx.save();
  ctx.translate(cxp, cyp);
  ctx.rotate(-0.16);
  ctx.fillStyle = 'rgba(10,12,22,0.55)';
  ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = R * 0.07;
  ctx.strokeStyle = '#e9c766';
  ctx.beginPath(); ctx.arc(0, 0, R * 0.94, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = R * 0.03;
  ctx.beginPath(); ctx.arc(0, 0, R * 0.66, 0, Math.PI * 2); ctx.stroke();
  // ring text, letter by letter around the circle
  const word = 'VICE CITY • COVER STUDIO • ';
  const fs = R * 0.21;
  ctx.font = `700 ${fs}px "Barlow Condensed", sans-serif`;
  ctx.fillStyle = '#f3d67c';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let i = 0; i < word.length; i++) {
    const a = (i / word.length) * Math.PI * 2 - Math.PI / 2;
    ctx.save();
    ctx.rotate(a);
    ctx.translate(0, -R * 0.80);
    ctx.fillText(word[i], 0, 0);
    ctx.restore();
  }
  ctx.fillStyle = '#ffd75e';
  drawStar(ctx, 0, -R * 0.08, R * 0.30);
  ctx.fill();
  ctx.font = `700 ${R * 0.20}px "Barlow Condensed", sans-serif`;
  ctx.fillStyle = '#f5f6fa';
  ctx.fillText('EST. 2026', 0, R * 0.36);
  ctx.restore();
}

function drawBilling(ctx, W, H) {
  const text = (state.billingText || '').trim();
  if (!text) return;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let size = H * 0.0165;
  ctx.font = `600 ${size}px "Montserrat", sans-serif`;
  try { ctx.letterSpacing = `${size * 0.22}px`; } catch (e) { /* ignore */ }
  while (ctx.measureText(text.toUpperCase()).width > W * 0.9 && size > 7) {
    size *= 0.94;
    ctx.font = `600 ${size}px "Montserrat", sans-serif`;
  }
  ctx.fillStyle = 'rgba(238,240,246,0.92)';
  ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = size * 0.3;
  ctx.fillText(text.toUpperCase(), W / 2, H * 0.978);
  ctx.restore();
}

function drawGoldenFrame(ctx, W, H) {
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#8a6a1f');
  grad.addColorStop(0.25, '#f6e27a');
  grad.addColorStop(0.5, '#caa64b');
  grad.addColorStop(0.75, '#f9ec9a');
  grad.addColorStop(1, '#8a6a1f');
  ctx.save();
  ctx.strokeStyle = grad;
  ctx.lineWidth = Math.max(2, W * 0.0038);
  const i1 = W * 0.012;
  ctx.strokeRect(i1, i1, W - i1 * 2, H - i1 * 2);
  ctx.lineWidth = Math.max(1, W * 0.0016);
  const i2 = W * 0.021;
  ctx.strokeRect(i2, i2, W - i2 * 2, H - i2 * 2);
  // corner flourishes: small diamonds where the two lines meet
  ctx.fillStyle = grad;
  const d = W * 0.006;
  for (const [x, y] of [[i1, i1], [W - i1, i1], [i1, H - i1], [W - i1, H - i1]]) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-d / 2, -d / 2, d, d);
    ctx.restore();
  }
  ctx.restore();
}

function drawFocusHandle(ctx, W, H) {
  if (document.body.classList.contains('present')) return;
  const def = LAYOUTS[state.layout];
  const panel = state.panels[state.selected];
  if (!panel || panel.photo < 0) return;
  const photo = state.photos[panel.photo];
  if (!photo) return;
  const r = panelRect(def.panels[state.selected], W, H);
  const t = coverTransform(photo, r.w, r.h, panel);
  // focus point in photo space -> poster space
  const px = r.x + t.dx + panel.fx * t.dw;
  const py = r.y + t.dy + panel.fy * t.dh;
  ctx.save();
  ctx.strokeStyle = '#ffb340';
  ctx.lineWidth = Math.max(1.6, W * 0.002);
  ctx.beginPath(); ctx.arc(px, py, W * 0.011, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,179,64,0.9)';
  ctx.beginPath(); ctx.arc(px, py, W * 0.0035, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

/* Master render: draws the whole poster onto any 2d context at W×H. */
function renderPoster(ctx, W, H) {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#131a2e');
  bg.addColorStop(0.55, '#0b0e1a');
  bg.addColorStop(1, '#07080f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  drawPanels(ctx, W, H);
  if (LAYOUTS[state.layout].skyGlow) drawSkyGlow(ctx, W, H);
  drawPopOut(ctx, W, H);
  drawTitleText(ctx, W, H);
  drawTags(ctx, W, H);
  drawCallouts(ctx, W, H);
  if (state.seal) drawSeal(ctx, W, H);
  if (state.billing) drawBilling(ctx, W, H);
  if (state.frame) drawGoldenFrame(ctx, W, H);
  drawFocusHandle(ctx, W, H);
}

function renderPreview() {
  const ctx = stage.getContext('2d');
  renderPoster(ctx, stage.width, stage.height);
}

/* ------------------------------------------------------------ photo intake */
function addPhoto(src, name, w, h) {
  const photo = { src, name, w, h, face: null, faceDone: false };
  state.photos.push(photo);
  ensureFace(photo);
  return state.photos.length - 1;
}

function loadImageFile(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(addPhoto(img, file.name, img.naturalWidth, img.naturalHeight));
    img.onerror = () => resolve(-1);
    img.src = url;
  });
}

function loadSample(path, name) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(addPhoto(img, name, img.naturalWidth, img.naturalHeight));
    img.onerror = () => resolve(-1);
    img.src = path;
  });
}

/* Two painted "art cards" drawn in-code, so the studio always has extra
 * demo material with strong corner contrast for the pop-out matte. */
function makeSceneCard(kind) {
  const c = document.createElement('canvas');
  c.width = 880; c.height = 1100;
  const x = c.getContext('2d');
  if (kind === 'sunset') {
    const g = x.createLinearGradient(0, 0, 0, 1100);
    g.addColorStop(0, '#2b1055'); g.addColorStop(0.45, '#c73e7c');
    g.addColorStop(0.72, '#ff8c42'); g.addColorStop(1, '#2a0e2e');
    x.fillStyle = g; x.fillRect(0, 0, 880, 1100);
    x.fillStyle = '#ffd75e';
    x.beginPath(); x.arc(440, 640, 150, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#160a24';
    x.fillRect(0, 800, 880, 300);
    for (const [bx, bw, bh] of [[40, 90, 320], [160, 70, 240], [640, 110, 380], [770, 80, 260]]) {
      x.fillRect(bx, 800 - bh, bw, bh);
      x.fillStyle = '#ffca7a';
      for (let wy = 800 - bh + 22; wy < 780; wy += 34)
        for (let wx = bx + 12; wx < bx + bw - 14; wx += 24)
          if ((wx * wy) % 3) x.fillRect(wx, wy, 9, 13);
      x.fillStyle = '#160a24';
    }
    // palm silhouettes
    x.strokeStyle = '#0d0518'; x.lineWidth = 17; x.lineCap = 'round';
    for (const [px, py, lean] of [[120, 1080, 60], [760, 1080, -70]]) {
      x.beginPath(); x.moveTo(px, py);
      x.quadraticCurveTo(px + lean * 0.4, py - 260, px + lean, py - 430); x.stroke();
      const tx = px + lean, ty = py - 430;
      for (let i = 0; i < 6; i++) {
        const a = Math.PI * (0.08 + i * 0.17);
        x.beginPath(); x.moveTo(tx, ty);
        x.quadraticCurveTo(tx + Math.cos(a) * 90, ty - Math.sin(a) * 60 - 26, tx + Math.cos(a) * 150, ty - Math.sin(a) * 44 + 42);
        x.stroke();
      }
    }
  } else {
    const g = x.createLinearGradient(0, 0, 0, 1100);
    g.addColorStop(0, '#04122e'); g.addColorStop(0.6, '#0a2a52'); g.addColorStop(1, '#03101f');
    x.fillStyle = g; x.fillRect(0, 0, 880, 1100);
    x.fillStyle = '#0e3a5f'; x.fillRect(0, 760, 880, 340);
    x.strokeStyle = 'rgba(64,224,255,0.5)'; x.lineWidth = 3;
    for (let i = 0; i < 7; i++) {
      x.beginPath(); x.moveTo(60 + i * 30, 800 + i * 38);
      x.lineTo(300 + i * 44, 800 + i * 38); x.stroke();
    }
    x.fillStyle = '#ff2e88';
    x.beginPath(); x.arc(660, 240, 92, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#22d3ee';
    x.beginPath(); x.arc(610, 210, 60, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#0a0f1e';
    x.fillRect(90, 470, 700, 290);
    x.fillStyle = '#ffd75e';
    for (let wy = 500; wy < 730; wy += 40)
      for (let wx = 120; wx < 760; wx += 52)
        if ((wx + wy) % 3) x.fillRect(wx, wy, 22, 24);
    x.fillStyle = '#081426'; x.fillRect(0, 700, 880, 60);
  }
  return c;
}

async function loadStarterPhotos() {
  await loadSample('samples/boulevard.jpg', 'Boulevard (sample)');
  await loadSample('samples/pier.jpg', 'Pier (sample)');
}

/* ------------------------------------------------------------ auto tagging */
function autoTag() {
  const def = LAYOUTS[state.layout];
  const items = state.panels.map((panel, i) => {
    if (panel.photo < 0) return null;
    const photo = state.photos[panel.photo];
    if (!photo) return null;
    const face = ensureFace(photo);
    const area = def.panels[i].w * def.panels[i].h;
    return { i, face, area };
  }).filter(Boolean);
  const withFace = items.filter((it) => it.face).sort((a, b) => b.area - a.area);
  const noFace = items.filter((it) => !it.face).sort((a, b) => a.i - b.i);
  withFace.forEach((it, k) => { state.panels[it.i].tag = k === 0 ? 'LEAD' : ROLE_WORDS[Math.min(1 + k, ROLE_WORDS.length - 1)]; });
  let next = 1 + withFace.length;
  noFace.forEach((it) => { state.panels[it.i].tag = ROLE_WORDS[Math.min(next, ROLE_WORDS.length - 1)]; next++; });
  if (!withFace.length && items.length) state.panels[items[0].i].tag = 'LEAD';
  syncPanelControls();
  renderPreview();
}

/* --------------------------------------------------------------- UI wiring */
function assignPhoto(panelIdx, photoIdx) {
  const panel = state.panels[panelIdx];
  panel.photo = photoIdx;
  panel.zoom = 1;
  panel.matte = null; panel.matteKey = '';
  const photo = state.photos[photoIdx];
  if (photo && state.faceAware) {
    const face = ensureFace(photo);
    if (face) { panel.fx = face.cx; panel.fy = face.cy; }
    else { panel.fx = 0.5; panel.fy = 0.42; }
  } else { panel.fx = 0.5; panel.fy = 0.42; }
}

function renderPhotoStrip() {
  const strip = $('photoStrip');
  strip.innerHTML = '';
  if (!state.photos.length) {
    strip.innerHTML = '<p class="hint">No photos yet — add your own, load the bundled samples, or drop files anywhere on the window.</p>';
    return;
  }
  state.photos.forEach((photo, i) => {
    const img = document.createElement('img');
    img.className = 'thumb' + (state.panels[state.selected] && state.panels[state.selected].photo === i ? ' assigned' : '');
    img.alt = photo.name;
    img.title = photo.name + (photo.face ? ' — face found' : '');
    img.src = photo.src.tagName === 'CANVAS' ? photo.src.toDataURL('image/jpeg', 0.7) : photo.src.src;
    img.addEventListener('click', () => {
      assignPhoto(state.selected, i);
      syncPanelControls();
      renderPhotoStrip();
      renderPreview();
    });
    strip.appendChild(img);
  });
}

function syncPanelControls() {
  const panel = state.panels[state.selected];
  if (!panel) return;
  const def = LAYOUTS[state.layout];
  $('panelInfo').textContent =
    `Panel ${state.selected + 1} of ${def.panels.length}` +
    (state.selected === def.hero ? ' — the hero panel (pop-out lives here).' : '.') +
    ' Drag on the poster to pan; drag the ring to move the focus.';
  $('zoomSlider').value = Math.round(panel.zoom * 100);
  $('paintedChk').checked = !!panel.painted;
  $('popoutChk').checked = !!panel.popout;
  $('tagInput').value = panel.tag || '';
  const sel = $('panelPhotoSel');
  sel.innerHTML = '';
  const none = document.createElement('option');
  none.value = '-1'; none.textContent = '— empty panel —';
  sel.appendChild(none);
  state.photos.forEach((photo, i) => {
    const o = document.createElement('option');
    o.value = String(i);
    o.textContent = photo.name;
    sel.appendChild(o);
  });
  sel.value = String(panel.photo);
}

function syncAllControls() {
  $('layoutSel').value = state.layout;
  $('aspectSel').value = `${state.aspect.w}x${state.aspect.h}`;
  $('titleText').value = state.title;
  $('subtitleText').value = state.subtitle;
  $('titleStyle').value = state.titleStyle;
  $('titlePlace').value = state.titlePlace;
  $('titleScale').value = Math.round(state.titleScale * 100);
  $('gradeSel').value = state.grade;
  $('gradeStrength').value = Math.round(state.gradeStrength * 100);
  $('faceAwareChk').checked = state.faceAware;
  $('sealChk').checked = state.seal;
  $('sealPos').value = state.sealPos;
  $('billingChk').checked = state.billing;
  $('billingText').value = state.billingText;
  $('frameChk').checked = state.frame;
  $('matteRange').value = state.matteThreshold;
  syncPanelControls();
  renderPhotoStrip();
  renderCalloutList();
}

function renderCalloutList() {
  const ul = $('calloutList');
  ul.innerHTML = '';
  state.callouts.forEach((co, i) => {
    const li = document.createElement('li');
    const span = document.createElement('span');
    span.textContent = co.text;
    const del = document.createElement('button');
    del.type = 'button'; del.textContent = '×'; del.title = 'Delete callout';
    del.addEventListener('click', () => { state.callouts.splice(i, 1); renderCalloutList(); renderPreview(); });
    li.appendChild(span); li.appendChild(del);
    ul.appendChild(li);
  });
}

function setAspect(w, h) {
  state.aspect = { w, h };
  const maxW = document.body.classList.contains('present') ? w : 980;
  stage.width = Math.min(w, maxW);
  stage.height = Math.round(stage.width * h / w);
  if (document.body.classList.contains('present')) { stage.width = w; stage.height = h; }
}

function bindControls() {
  $('fileInput').addEventListener('change', async (e) => {
    for (const f of e.target.files) await loadImageFile(f);
    afterPhotosChanged();
    e.target.value = '';
  });
  $('loadSamples').addEventListener('click', async () => { await loadStarterPhotos(); afterPhotosChanged(); });
  $('addScenes').addEventListener('click', () => {
    addPhoto(makeSceneCard('sunset'), 'Sunset Strip (art card)', 880, 1100);
    addPhoto(makeSceneCard('neon'), 'Neon Pier (art card)', 880, 1100);
    afterPhotosChanged();
  });
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', async (e) => {
    e.preventDefault();
    for (const f of e.dataTransfer.files) if (f.type.startsWith('image/')) await loadImageFile(f);
    afterPhotosChanged();
  });

  $('layoutSel').addEventListener('change', (e) => {
    state.layout = e.target.value;
    if (state.layout === 'heatwave') state.titlePlace = 'over';
    rebuildPanels(true);
    syncAllControls();
    renderPreview();
  });
  $('aspectSel').addEventListener('change', (e) => {
    const [w, h] = e.target.value.split('x').map(Number);
    setAspect(w, h);
    renderPreview();
  });
  $('titleText').addEventListener('input', (e) => { state.title = e.target.value; renderPreview(); });
  $('subtitleText').addEventListener('input', (e) => { state.subtitle = e.target.value; renderPreview(); });
  $('titleStyle').addEventListener('change', (e) => { state.titleStyle = e.target.value; renderPreview(); });
  $('titlePlace').addEventListener('change', (e) => { state.titlePlace = e.target.value; renderPreview(); });
  $('titleScale').addEventListener('input', (e) => { state.titleScale = Number(e.target.value) / 100; renderPreview(); });
  $('gradeSel').addEventListener('change', (e) => { state.grade = e.target.value; renderPreview(); });
  $('gradeStrength').addEventListener('input', (e) => { state.gradeStrength = Number(e.target.value) / 100; renderPreview(); });
  $('faceAwareChk').addEventListener('change', (e) => { state.faceAware = e.target.checked; });

  $('panelPhotoSel').addEventListener('change', (e) => {
    assignPhoto(state.selected, Number(e.target.value));
    renderPhotoStrip();
    renderPreview();
  });
  $('zoomSlider').addEventListener('input', (e) => {
    state.panels[state.selected].zoom = Number(e.target.value) / 100;
    renderPreview();
  });
  $('faceCropBtn').addEventListener('click', () => {
    const panel = state.panels[state.selected];
    const photo = state.photos[panel.photo];
    if (!photo) return;
    const face = ensureFace(photo);
    const def = LAYOUTS[state.layout].panels[state.selected];
    if (face) {
      panel.fx = face.cx; panel.fy = face.cy;
      const pw = def.w * stage.width, ph = def.h * stage.height;
      const { w: iw, h: ih } = photoSize(photo);
      const scale0 = Math.max(pw / iw, ph / ih);
      panel.zoom = clamp((0.55 * ph) / (face.h * ih * scale0), 1, 3.2);
      $('zoomSlider').value = Math.round(panel.zoom * 100);
    }
    renderPreview();
  });
  $('resetPanelBtn').addEventListener('click', () => {
    const panel = state.panels[state.selected];
    panel.zoom = 1; panel.fx = 0.5; panel.fy = 0.42;
    $('zoomSlider').value = 100;
    renderPreview();
  });
  $('paintedChk').addEventListener('change', (e) => { state.panels[state.selected].painted = e.target.checked; renderPreview(); });
  $('popoutChk').addEventListener('change', (e) => {
    state.panels[state.selected].popout = e.target.checked;
    renderPreview();
  });
  $('matteRange').addEventListener('input', (e) => {
    state.matteThreshold = Number(e.target.value);
    state.panels.forEach((p) => { p.matteKey = ''; });
    renderPreview();
  });
  $('tagInput').addEventListener('input', (e) => { state.panels[state.selected].tag = e.target.value; renderPreview(); });
  $('autoTagBtn').addEventListener('click', autoTag);

  $('sealChk').addEventListener('change', (e) => { state.seal = e.target.checked; renderPreview(); });
  $('sealPos').addEventListener('change', (e) => { state.sealPos = e.target.value; renderPreview(); });
  $('billingChk').addEventListener('change', (e) => { state.billing = e.target.checked; renderPreview(); });
  $('billingText').addEventListener('input', (e) => { state.billingText = e.target.value; renderPreview(); });
  $('frameChk').addEventListener('change', (e) => { state.frame = e.target.checked; renderPreview(); });

  $('addCalloutBtn').addEventListener('click', () => {
    const text = $('calloutText').value.trim();
    if (!text) return;
    const n = state.callouts.length;
    state.callouts.push({
      text: text.toUpperCase(),
      ax: 0.30 + 0.08 * n, ay: 0.34 + 0.07 * n,
      bx: 0.55, by: 0.16 + 0.09 * n,
    });
    $('calloutText').value = '';
    renderCalloutList();
    renderPreview();
  });

  const doExport = (key) => exportPNG(key);
  document.querySelectorAll('[data-export]').forEach((b) =>
    b.addEventListener('click', () => doExport(b.getAttribute('data-export'))));
  $('export1080sq').addEventListener('click', () => doExport('1080x1080'));
  $('export1080x1350').addEventListener('click', () => doExport('1080x1350'));
  $('export1920').addEventListener('click', () => doExport('1920x1080'));
  $('exportAll').addEventListener('click', exportAll);
  $('exportAll2').addEventListener('click', exportAll);
}

function afterPhotosChanged() {
  // Fill any empty panels round-robin, face-first when face-aware is on.
  // The hero panel gets its pop-out cut-out the moment it first holds a
  // photo, so the signature v3 look is on by default.
  const heroIdx = LAYOUTS[state.layout].hero;
  state.panels.forEach((panel, i) => {
    if (panel.photo < 0 && state.photos.length) {
      assignPhoto(i, i % state.photos.length);
      if (i === heroIdx) panel.popout = true;
    }
  });
  syncAllControls();
  renderPreview();
}

/* ------------------------------------------------------- pointer handling */
let drag = null;

function stagePos(e) {
  const r = stage.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * stage.width / r.width,
    y: (e.clientY - r.top) * stage.height / r.height,
  };
}

function calloutHit(p) {
  const W = stage.width, H = stage.height;
  for (let i = state.callouts.length - 1; i >= 0; i--) {
    const co = state.callouts[i];
    const ax = co.ax * W, ay = co.ay * H;
    if (Math.hypot(p.x - ax, p.y - ay) < W * 0.016) return { kind: 'anchor', i };
    const size = H * 0.021;
    const ctx = stage.getContext('2d');
    ctx.font = `700 ${size}px "Barlow Condensed", sans-serif`;
    const bw = ctx.measureText(co.text.toUpperCase()).width + size * 1.1;
    const bh = size * 1.7;
    if (p.x >= co.bx * W && p.x <= co.bx * W + bw && p.y >= co.by * H && p.y <= co.by * H + bh) {
      return { kind: 'box', i, dx: p.x - co.bx * W, dy: p.y - co.by * H };
    }
  }
  return null;
}

function panelAt(p) {
  const def = LAYOUTS[state.layout];
  for (let i = def.panels.length - 1; i >= 0; i--) {
    const r = panelRect(def.panels[i], stage.width, stage.height);
    if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return i;
  }
  return -1;
}

function bindPointer() {
  stage.addEventListener('pointerdown', (e) => {
    const p = stagePos(e);
    const hit = calloutHit(p);
    if (hit) { drag = { ...hit, mode: 'callout' }; stage.setPointerCapture(e.pointerId); return; }
    const idx = panelAt(p);
    if (idx < 0) return;
    if (idx !== state.selected) { state.selected = idx; syncPanelControls(); renderPhotoStrip(); }
    const panel = state.panels[idx];
    const r = panelRect(LAYOUTS[state.layout].panels[idx], stage.width, stage.height);
    // near the focus point? then drag the focus itself
    const photo = state.photos[panel.photo];
    if (photo) {
      const t = coverTransform(photo, r.w, r.h, panel);
      const hx = r.x + t.dx + panel.fx * t.dw, hy = r.y + t.dy + panel.fy * t.dh;
      if (Math.hypot(p.x - hx, p.y - hy) < stage.width * 0.02) {
        drag = { mode: 'focus', idx, r };
        stage.setPointerCapture(e.pointerId);
        return;
      }
    }
    drag = { mode: 'pan', idx, sx: p.x, sy: p.y, fx: panel.fx, fy: panel.fy, r };
    stage.setPointerCapture(e.pointerId);
    renderPreview();
  });
  stage.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const p = stagePos(e);
    const W = stage.width, H = stage.height;
    if (drag.mode === 'callout') {
      const co = state.callouts[drag.i];
      if (drag.kind === 'anchor') { co.ax = clamp(p.x / W, 0, 1); co.ay = clamp(p.y / H, 0, 1); }
      else { co.bx = clamp((p.x - drag.dx) / W, 0, 0.95); co.by = clamp((p.y - drag.dy) / H, 0, 0.97); }
      renderPreview();
      return;
    }
    const panel = state.panels[drag.idx];
    const photo = state.photos[panel.photo];
    if (!photo) return;
    if (drag.mode === 'focus') {
      panel.fx = clamp((p.x - drag.r.x) / drag.r.w, 0, 1);
      panel.fy = clamp((p.y - drag.r.y) / drag.r.h, 0, 1);
    } else if (drag.mode === 'pan') {
      const t = coverTransform(photo, drag.r.w, drag.r.h, panel);
      if (t.dw > drag.r.w) panel.fx = clamp(drag.fx - (p.x - drag.sx) / (t.dw - drag.r.w), 0, 1);
      if (t.dh > drag.r.h) panel.fy = clamp(drag.fy - (p.y - drag.sy) / (t.dh - drag.r.h), 0, 1);
    }
    renderPreview();
  });
  const end = () => { drag = null; };
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', end);
  stage.addEventListener('wheel', (e) => {
    e.preventDefault();
    const panel = state.panels[state.selected];
    panel.zoom = clamp(panel.zoom * (e.deltaY < 0 ? 1.06 : 0.94), 1, 3.2);
    $('zoomSlider').value = Math.round(panel.zoom * 100);
    renderPreview();
  }, { passive: false });
}

/* ----------------------------------------------------------------- export */
function exportPNG(key) {
  const [w, h] = key.split('x').map(Number);
  const off = document.createElement('canvas');
  off.width = w; off.height = h;
  const ctx = off.getContext('2d');
  const wasPresent = document.body.classList.contains('present');
  document.body.classList.add('present'); // hides the focus handle
  renderPoster(ctx, w, h);
  if (!wasPresent) document.body.classList.remove('present');
  off.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-vice-cover-${key}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    $('exportStatus').textContent = `Exported neon-vice-cover-${key}.png at full resolution.`;
  }, 'image/png');
}

async function exportAll() {
  for (const key of ['1080x1080', '1080x1350', '1920x1080']) {
    exportPNG(key);
    await new Promise((r) => setTimeout(r, 450));
  }
}

/* ------------------------------------------------------------------- boot */
function applyParams() {
  const q = new URLSearchParams(location.search);
  if (q.get('present')) {
    document.body.classList.add('present');
    const [w, h] = q.get('present').split('x').map(Number);
    if (w && h) { state.aspect = { w, h }; stage.width = w; stage.height = h; }
  }
  if (q.get('layout') && LAYOUTS[q.get('layout')]) state.layout = q.get('layout');
  if (q.get('grade') && GRADES[q.get('grade')]) state.grade = q.get('grade');
  if (q.get('style')) state.titleStyle = q.get('style');
  if (q.get('place')) state.titlePlace = q.get('place');
  if (q.get('title')) state.title = q.get('title');
  if (q.get('subtitle')) state.subtitle = q.get('subtitle');
  if (q.get('frame')) state.frame = q.get('frame') === '1';
  if (q.get('seal')) state.seal = q.get('seal') === '1';
  return q;
}

async function boot() {
  const q = applyParams();
  state.billingText = $('billingText').value;
  rebuildPanels(false);
  bindControls();
  bindPointer();
  setAspect(state.aspect.w, state.aspect.h);
  syncAllControls();
  renderPreview();
  await loadStarterPhotos();
  if (q.get('scenes') === '1' || q.get('demo') === '1') {
    addPhoto(makeSceneCard('sunset'), 'Sunset Strip (art card)', 880, 1100);
    addPhoto(makeSceneCard('neon'), 'Neon Pier (art card)', 880, 1100);
  }
  afterPhotosChanged();
  if (q.get('demo') === '1') {
    if (!q.get('place') && state.layout === 'heatwave') state.titlePlace = 'over';
    // Demo casting: the pier portrait (subject against open water) gives
    // the cleanest pop-out matte, so it takes the hero panel and the
    // boulevard shot supports it.
    const heroIdx = LAYOUTS[state.layout].hero;
    if (state.photos.length >= 2 && state.panels[1] && heroIdx !== 1) {
      assignPhoto(heroIdx, 1);
      assignPhoto(1, 0);
    }
    autoTag();
    const hero = state.panels[LAYOUTS[state.layout].hero];
    if (hero) hero.popout = true;
    if (!q.get('frame')) state.frame = true;
    syncAllControls();
  }
  // Fonts can arrive after the first paint; re-render once they are in.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => renderPreview());
  }
  renderPreview();
}

boot();
