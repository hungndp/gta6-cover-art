"use strict";
/* Neon Vice Cover Studio v3 — offline multi-panel GTA-style cover art maker.
   Everything runs on this machine: photos are read locally, graded on canvas,
   and exported as PNG. No network calls, no uploads, no third-party assets. */

/* ---------------------------------------------------------------- helpers */
const $ = (id) => document.getElementById(id);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, t) => a + (b - a) * t;

function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

/* ----------------------------------------------------------------- grades */
/* Each grade is a canvas filter chain plus an optional wash colour that is
   laid over the panel with a blend mode. Strength scales both. */
const GRADES = [
  { id: "vice-sunset",  name: "Vice Sunset",    filter: "saturate(1.45) contrast(1.12) hue-rotate(-8deg) brightness(1.05)", wash: "#ff7a3c", washAlpha: 0.16, mode: "overlay" },
  { id: "neon-nights",  name: "Neon Nights",    filter: "saturate(1.7) contrast(1.25) hue-rotate(12deg)", wash: "#ff2fb3", washAlpha: 0.14, mode: "soft-light" },
  { id: "palm-day",     name: "Palm Day",       filter: "saturate(1.25) contrast(1.05) brightness(1.12)", wash: "#ffe9a8", washAlpha: 0.10, mode: "soft-light" },
  { id: "teal-bay",     name: "Teal Bay",       filter: "saturate(1.2) contrast(1.15) hue-rotate(18deg)", wash: "#0e7d8c", washAlpha: 0.18, mode: "overlay" },
  { id: "golden-hour",  name: "Golden Hour",    filter: "saturate(1.35) contrast(1.08) sepia(0.35) brightness(1.06)", wash: "#ffb347", washAlpha: 0.20, mode: "soft-light" },
  { id: "midnight-run", name: "Midnight Run",   filter: "saturate(1.1) contrast(1.35) brightness(0.82)", wash: "#24308f", washAlpha: 0.22, mode: "overlay" },
  { id: "coral-heat",   name: "Coral Heat",     filter: "saturate(1.55) contrast(1.1) hue-rotate(-16deg) brightness(1.08)", wash: "#ff5e5e", washAlpha: 0.15, mode: "soft-light" },
  { id: "chrome-fade",  name: "Chrome Fade",    filter: "saturate(0.75) contrast(1.3) brightness(1.05)", wash: "#bfe8ff", washAlpha: 0.12, mode: "overlay" },
  { id: "portrait-guard", name: "Portrait Guard", filter: "saturate(1.18) contrast(1.06) brightness(1.04)", wash: "#ffc9a3", washAlpha: 0.07, mode: "soft-light", guardSkin: true }
];

/* -------------------------------------------------------------- templates */
/* Panels are fractions of the poster. `slant` shears panels into
   parallelograms, `titleOver` parks the title on top of the artwork and
   `hero` marks the panel the pop-out cut-out escapes from. */
const TEMPLATES = [
  { id: "vice-grid", name: "1 · Vice Grid", hint: "The classic four-panel grid with a wide closing shot.",
    panels: [ {x:0,y:0,w:.5,h:.55}, {x:.5,y:0,w:.5,h:.55}, {x:0,y:.55,w:.62,h:.45}, {x:.62,y:.55,w:.38,h:.45} ], hero: 0 },
  { id: "palm-split", name: "2 · Palm Split", hint: "One tall hero panel, two stacked beats on the right.",
    panels: [ {x:0,y:0,w:.58,h:1}, {x:.58,y:0,w:.42,h:.5}, {x:.58,y:.5,w:.42,h:.5} ], hero: 0 },
  { id: "skyline-trio", name: "3 · Skyline Trio", hint: "Three vertical columns, poster-book style.",
    panels: [ {x:0,y:0,w:.34,h:1}, {x:.34,y:0,w:.33,h:1}, {x:.67,y:0,w:.33,h:1} ], hero: 1 },
  { id: "cover-star", name: "4 · Cover Star", hint: "A big establishing panel over three detail panels.",
    panels: [ {x:0,y:0,w:1,h:.58}, {x:0,y:.58,w:.34,h:.42}, {x:.34,y:.58,w:.33,h:.42}, {x:.67,y:.58,w:.33,h:.42} ], hero: 0 },
  { id: "diagonal-six", name: "5 · Diagonal Six", hint: "Six equal panels, three across and two down.",
    panels: [ {x:0,y:0,w:.34,h:.5}, {x:.34,y:0,w:.33,h:.5}, {x:.67,y:0,w:.33,h:.5}, {x:0,y:.5,w:.34,h:.5}, {x:.34,y:.5,w:.33,h:.5}, {x:.67,y:.5,w:.33,h:.5} ], hero: 0 },
  { id: "boulevard-strip", name: "6 · Boulevard Strip", hint: "Wide cinematic strips with a two-panel middle act.",
    panels: [ {x:0,y:0,w:1,h:.34}, {x:0,y:.34,w:.5,h:.33}, {x:.5,y:.34,w:.5,h:.33}, {x:0,y:.67,w:1,h:.33} ], hero: 0 },
  { id: "harbor-seven", name: "7 · Harbor Seven", hint: "Seven-panel mosaic built around a central hero.",
    panels: [ {x:0,y:0,w:.3,h:.34}, {x:.3,y:0,w:.4,h:.52}, {x:.7,y:0,w:.3,h:.34}, {x:0,y:.34,w:.3,h:.33}, {x:.7,y:.34,w:.3,h:.33}, {x:0,y:.67,w:.5,h:.33}, {x:.5,y:.67,w:.5,h:.33} ], hero: 1 },
  { id: "neon-eight", name: "8 · Neon Eight", hint: "Eight panels, four across — maximum story density.",
    panels: [ {x:0,y:0,w:.25,h:.5}, {x:.25,y:0,w:.25,h:.5}, {x:.5,y:0,w:.25,h:.5}, {x:.75,y:0,w:.25,h:.5}, {x:0,y:.5,w:.25,h:.5}, {x:.25,y:.5,w:.25,h:.5}, {x:.5,y:.5,w:.25,h:.5}, {x:.75,y:.5,w:.25,h:.5} ], hero: 0 },
  { id: "heatwave", name: "9 · Heatwave", hint: "Title OVER the art, slanted panels, sky-glow gradient — the Heatwave look.", slant: 0.06, titleOver: true,
    panels: [ {x:-.04,y:0,w:.56,h:.62}, {x:.52,y:0,w:.52,h:.62}, {x:-.04,y:.62,w:.4,h:.38}, {x:.36,y:.62,w:.34,h:.38}, {x:.7,y:.62,w:.34,h:.38} ], hero: 0 },
  { id: "hero-closeup", name: "10 · Hero Close-Up", hint: "One oversized face panel with small supporting panels — people first.", 
    panels: [ {x:0,y:0,w:.64,h:1}, {x:.64,y:0,w:.36,h:.34}, {x:.64,y:.34,w:.36,h:.33}, {x:.64,y:.67,w:.36,h:.33} ], hero: 0 }
];

const ROLE_POOL = ["LEAD", "DRIVER", "MUSCLE", "LOOKOUT", "FIXER", "RUNNER", "DEALER", "GHOST"];

/* ------------------------------------------------------------------ state */
const state = {
  photos: [],              // { img, name, face:{x,y}|null }
  template: 8,             // Heatwave by default — the v3 signature layout
  grade: 0,
  gradeStrength: 0.8,
  size: "1080x1080",
  title: "NEON VICE",
  subtitle: "GRAND THEFT SUMMER",
  captionStyle: 7,
  autoFit: true,
  faceAware: true,
  popout: true,
  goldenFrame: true,
  seal: true,
  skyGlow: true,
  billing: "",
  selectedPanel: 0,
  panelPhoto: [],          // photo index per panel
  panelFocus: [],          // {x,y} per panel
  panelZoom: [],           // per panel
  panelPainted: [],        // bool per panel
  panelTag: [],            // role tag text per panel
  callouts: [ { panel: 0, text: "THE LEAD" }, { panel: 2, text: "GETAWAY READY" } ]
};
const matteCache = new Map(); // photo index -> cut-out canvas

function template() { return TEMPLATES[state.template]; }
function panelCount() { return template().panels.length; }

function ensurePanelArrays() {
  const n = panelCount();
  while (state.panelPhoto.length < n) {
    const i = state.panelPhoto.length;
    state.panelPhoto.push(state.photos.length ? i % state.photos.length : -1);
    state.panelFocus.push({ x: 0.5, y: 0.42 });
    state.panelZoom.push(1);
    state.panelPainted.push(false);
    state.panelTag.push("");
  }
}

/* ------------------------------------------------------- face-aware crops */
/* Skin-tone scan on a downscaled copy: pixels whose hue and saturation sit
   in the skin band vote for the focus point; the centroid wins. */
function scanFace(img) {
  const w = 96, h = Math.max(1, Math.round(96 * img.naturalHeight / img.naturalWidth));
  const c = makeCanvas(w, h), x = c.getContext("2d", { willReadFrequently: true });
  x.drawImage(img, 0, 0, w, h);
  let d;
  try { d = x.getImageData(0, 0, w, h).data; } catch (e) { return null; }
  let sx = 0, sy = 0, n = 0;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const k = (j * w + i) * 4, r = d[k], g = d[k + 1], b = d[k + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const skin = r > 90 && g > 40 && b > 20 && mx - mn > 15 && r > g && r > b && Math.abs(r - g) > 12;
    if (skin) { sx += i; sy += j; n++; }
  }
  if (n < 24) return null;
  return { x: sx / n / w, y: sy / n / h };
}

/* --------------------------------------------------------- pop-out cut-out */
/* Background removal with no model and no network: sample the border colour,
   flood-fill from every edge pixel through colour-distance space, and clear
   whatever the flood reaches. What remains is the subject, edges feathered. */
function buildMatte(img) {
  const scale = Math.min(1, 720 / img.naturalWidth);
  const w = Math.round(img.naturalWidth * scale), h = Math.round(img.naturalHeight * scale);
  const c = makeCanvas(w, h), x = c.getContext("2d", { willReadFrequently: true });
  x.drawImage(img, 0, 0, w, h);
  const imageData = x.getImageData(0, 0, w, h), d = imageData.data;
  // Border colour = average of the four corners' neighbourhoods.
  let br = 0, bg = 0, bb = 0, bn = 0;
  const corner = (cx, cy) => { const k = (cy * w + cx) * 4; br += d[k]; bg += d[k + 1]; bb += d[k + 2]; bn++; };
  for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) { corner(i, j); corner(w - 1 - i, j); corner(i, h - 1 - j); corner(w - 1 - i, h - 1 - j); }
  br /= bn; bg /= bn; bb /= bn;
  const tol = 40;
  const isBg = (i) => {
    // Subject protection: an ellipse around the centre is a flood barrier,
    // so a bright shirt or skin tone that resembles the sky is never eaten.
    const px = i % w, py = (i / w) | 0;
    const ex = (px - w * 0.5) / (w * 0.36), ey = (py - h * 0.46) / (h * 0.4);
    if (ex * ex + ey * ey < 1) return false;
    const k = i * 4, dr = d[k] - br, dg = d[k + 1] - bg, db = d[k + 2] - bb;
    return dr * dr + dg * dg + db * db < tol * tol;
  };
  const seen = new Uint8Array(w * h), stack = [];
  const push = (i) => { if (!seen[i]) { seen[i] = 1; stack.push(i); } };
  for (let i = 0; i < w; i++) { push(i); push((h - 1) * w + i); }
  for (let j = 0; j < h; j++) { push(j * w); push(j * w + w - 1); }
  while (stack.length) {
    const i = stack.pop();
    if (!isBg(i)) continue;
    d[i * 4 + 3] = 0;
    const px = i % w, py = (i / w) | 0;
    if (px > 0) push(i - 1);
    if (px < w - 1) push(i + 1);
    if (py > 0) push(i - w);
    if (py < h - 1) push(i + w);
  }
  // Feather: soften alpha on subject pixels that touch cleared space.
  const alpha = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) alpha[i] = d[i * 4 + 3];
  for (let j = 1; j < h - 1; j++) for (let i = 1; i < w - 1; i++) {
    const idx = j * w + i;
    if (alpha[idx] > 0 && (alpha[idx - 1] === 0 || alpha[idx + 1] === 0 || alpha[idx - w] === 0 || alpha[idx + w] === 0)) d[idx * 4 + 3] = 165;
  }
  x.putImageData(imageData, 0, 0);
  return c;
}

function matteFor(photoIndex) {
  if (!matteCache.has(photoIndex)) matteCache.set(photoIndex, buildMatte(state.photos[photoIndex].img));
  return matteCache.get(photoIndex);
}

/* ------------------------------------------------------------ auto cast tags */
function suggestCastTags() {
  const panels = template().panels.map((p, i) => ({ i, area: p.w * p.h, cx: p.x + p.w / 2, cy: p.y + p.h / 2 }));
  const ranked = [...panels].sort((a, b) => b.area - a.area);
  const tags = new Array(panels.length).fill("");
  const used = new Set();
  const give = (panel, role) => { if (!used.has(role)) { tags[panel.i] = role; used.add(role); } };
  if (ranked[0]) give(ranked[0], "LEAD");
  // A panel whose photo shows a face outranks a faceless bigger neighbour for second billing.
  const facePanel = panels.find((p) => {
    const ph = state.panelPhoto[p.i];
    return ph >= 0 && state.photos[ph] && state.photos[ph].face && p.i !== (ranked[0] && ranked[0].i);
  });
  if (facePanel) give(facePanel, "DRIVER");
  for (const p of [...panels].sort((a, b) => a.cx - b.cx)) {
    if (tags[p.i]) continue;
    if (p.cx < 0.3) give(p, "MUSCLE");
    else if (p.cy < 0.3) give(p, "LOOKOUT");
    else if (p.cx > 0.7) give(p, "FIXER");
    else give(p, ROLE_POOL.find((r) => !used.has(r)) || "CREW");
  }
  return tags;
}

/* ------------------------------------------------------------- panel paint */
function posterizePanel(source, w, h, painted) {
  const c = makeCanvas(w, h), x = c.getContext("2d", { willReadFrequently: true });
  x.drawImage(source, 0, 0, w, h);
  if (!painted) return c;
  const imageData = x.getImageData(0, 0, w, h), d = imageData.data;
  const levels = 5, step = 255 / (levels - 1);
  for (let i = 0; i < d.length; i += 4) {
    // Posterize toward flat paint bands, then push saturation like gouache.
    for (let ch = 0; ch < 3; ch++) d[i + ch] = Math.round(Math.round(d[i + ch] / step) * step);
    const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]);
    const mid = (mx + mn) / 2;
    for (let ch = 0; ch < 3; ch++) d[i + ch] = clamp(mid + (d[i + ch] - mid) * 1.35, 0, 255);
  }
  x.putImageData(imageData, 0, 0);
  // Edge paint: darken a Sobel-ish pass cheaply by re-drawing shifted copies.
  x.globalAlpha = 0.16;
  x.globalCompositeOperation = "multiply";
  x.drawImage(c, 2, 0);
  x.drawImage(c, -2, 1);
  x.globalAlpha = 1;
  x.globalCompositeOperation = "source-over";
  return c;
}

/* -------------------------------------------------------------- draw image */
function coverSourceRect(img, focus, zoom, targetRatio) {
  const iw = img.naturalWidth, ih = img.naturalHeight, srcRatio = iw / ih;
  let sw, sh;
  if (srcRatio > targetRatio) { sh = ih; sw = ih * targetRatio; } else { sw = iw; sh = iw / targetRatio; }
  sw /= zoom; sh /= zoom;
  const cx = clamp(focus.x * iw, sw / 2, iw - sw / 2);
  const cy = clamp(focus.y * ih, sh / 2, ih - sh / 2);
  return { sx: cx - sw / 2, sy: cy - sh / 2, sw, sh };
}

function panelRectPx(p, W, H) { return { x: p.x * W, y: p.y * H, w: p.w * W, h: p.h * H }; }

function clipPanelPath(x, r, slantPx) {
  x.beginPath();
  if (slantPx) {
    x.moveTo(r.x + slantPx, r.y);
    x.lineTo(r.x + r.w, r.y);
    x.lineTo(r.x + r.w - slantPx, r.y + r.h);
    x.lineTo(r.x, r.y + r.h);
  } else {
    x.rect(r.x, r.y, r.w, r.h);
  }
  x.closePath();
}

function drawPanel(x, W, H, index) {
  const t = template(), p = t.panels[index], r = panelRectPx(p, W, H);
  const slantPx = t.slant ? t.slant * H * 0.35 : 0;
  const photoIndex = state.panelPhoto[index];
  x.save();
  clipPanelPath(x, r, slantPx);
  x.clip();
  // Backdrop gradient so an empty panel still reads as designed art space.
  const bg = x.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
  bg.addColorStop(0, "#ff9a3c"); bg.addColorStop(0.55, "#ff2fb3"); bg.addColorStop(1, "#123a8f");
  x.fillStyle = bg;
  x.fillRect(r.x - slantPx, r.y, r.w + slantPx * 2, r.h);
  if (photoIndex >= 0 && state.photos[photoIndex]) {
    const photo = state.photos[photoIndex];
    const focus = state.faceAware && photo.face ? photo.face : state.panelFocus[index];
    const src = coverSourceRect(photo.img, focus, state.panelZoom[index], r.w / r.h);
    const grade = GRADES[state.grade], s = state.gradeStrength;
    const raw = makeCanvas(Math.max(2, Math.round(r.w)), Math.max(2, Math.round(r.h)));
    const rx = raw.getContext("2d");
    rx.filter = grade.filter;
    rx.drawImage(photo.img, src.sx, src.sy, src.sw, src.sh, 0, 0, raw.width, raw.height);
    rx.filter = "none";
    if (grade.guardSkin && photo.face) {
      // Portrait Guard: repaint the face zone at low grade so skin survives.
      const fx = (photo.face.x * photo.img.naturalWidth - src.sx) / src.sw * raw.width;
      const fy = (photo.face.y * photo.img.naturalHeight - src.sy) / src.sh * raw.height;
      const fr = Math.min(raw.width, raw.height) * 0.34;
      rx.save();
      rx.beginPath(); rx.arc(fx, fy, fr, 0, Math.PI * 2); rx.clip();
      rx.globalAlpha = 0.65;
      rx.drawImage(photo.img, src.sx, src.sy, src.sw, src.sh, 0, 0, raw.width, raw.height);
      rx.restore();
    }
    const painted = posterizePanel(raw, raw.width, raw.height, state.panelPainted[index]);
    x.globalAlpha = 1;
    x.drawImage(painted, r.x, r.y);
    if (s > 0 && grade.wash) {
      x.globalCompositeOperation = grade.mode;
      x.globalAlpha = grade.washAlpha * s;
      x.fillStyle = grade.wash;
      x.fillRect(r.x - slantPx, r.y, r.w + slantPx * 2, r.h);
      x.globalCompositeOperation = "source-over";
      x.globalAlpha = 1;
    }
    // Bottom shade inside each panel so tags and callouts stay readable.
    const shade = x.createLinearGradient(0, r.y + r.h * 0.62, 0, r.y + r.h);
    shade.addColorStop(0, "rgba(10,2,20,0)");
    shade.addColorStop(1, "rgba(10,2,20,0.55)");
    x.fillStyle = shade;
    x.fillRect(r.x - slantPx, r.y, r.w + slantPx * 2, r.h);
  }
  x.restore();
  // Panel gutter stroke.
  x.save();
  clipPanelPath(x, r, slantPx);
  x.lineWidth = Math.max(3, W * 0.006);
  x.strokeStyle = "#12041f";
  x.stroke();
  x.restore();
  // Cast role tag, top-left inside the panel (the bottom edge belongs to
  // the title scrim and the billing block, so tags live at the top).
  const tag = state.panelTag[index];
  if (tag) {
    const fs = Math.max(15, W * 0.021);
    x.font = `${fs}px "Fjalla One", sans-serif`;
    const tw = x.measureText(tag).width;
    // Slanted Heatwave panels start off-poster; keep the tag on the canvas.
    const tx = clamp(r.x + W * 0.02, W * 0.018, W - tw - W * 0.03);
    const ty = Math.max(r.y, H * 0.012) + fs * 1.55;
    x.fillStyle = "rgba(10,2,20,0.78)";
    x.fillRect(tx - fs * 0.35, ty - fs * 0.95, tw + fs * 0.7, fs * 1.5);
    x.fillStyle = "#ffb347";
    x.fillRect(tx - fs * 0.35, ty - fs * 0.95, 4, fs * 1.5);
    x.fillStyle = "#fff";
    x.fillText(tag, tx, ty + fs * 0.28);
  }
  if (index === state.selectedPanel && !state.forExport) {
    x.save();
    clipPanelPath(x, r, slantPx);
    x.lineWidth = Math.max(3, W * 0.005);
    x.strokeStyle = "#7ef0d4";
    x.setLineDash([14, 9]);
    x.stroke();
    x.restore();
  }
  return r;
}

/* ------------------------------------------------------------------- title */
function chromeGradient(x, y, h, striped) {
  const g = x.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, "#fdfdff");
  g.addColorStop(0.28, "#9fd8ef");
  g.addColorStop(0.48, "#2b6ea8");
  g.addColorStop(0.52, "#f4fbff");
  g.addColorStop(0.72, "#ff9ecf");
  g.addColorStop(1, "#8f1d6e");
  return g;
}

function paintStripes(x, y, h) {
  // Retro pinstripes clipped to the glyphs via source-atop on a text layer.
  x.save();
  x.globalCompositeOperation = "source-atop";
  x.fillStyle = "rgba(20,10,40,0.28)";
  const band = h / 7;
  for (let i = 0; i < 7; i += 2) x.fillRect(-9999, y + i * band + band * 0.45, 19998, band * 0.3);
  x.restore();
}

function drawTitleText(x, W, H, text, cx, baseY, maxWidth, style) {
  let size = H * 0.115;
  x.textAlign = "center";
  x.textBaseline = "alphabetic";
  const setFont = () => { x.font = `${size}px "Fjalla One", "Arial Narrow", sans-serif`; };
  setFont();
  if (state.autoFit) while (x.measureText(text).width > maxWidth && size > 18) { size *= 0.94; setFont(); }
  const y = baseY;
  x.lineJoin = "round";
  if (style === 7) {
    // Extruded 3D: a stack of hard offset shadows, then striped chrome.
    const layer = makeCanvas(W, H), lx = layer.getContext("2d");
    lx.font = x.font; lx.textAlign = "center"; lx.textBaseline = "alphabetic";
    const depth = Math.max(6, size * 0.09);
    for (let i = depth; i > 0; i--) {
      lx.fillStyle = i % 2 ? "#5c0f3d" : "#2b0f45";
      lx.fillText(text, cx + i * 0.8, y + i);
    }
    lx.fillStyle = chromeGradient(lx, y - size, size, true);
    lx.fillText(text, cx, y);
    paintStripes(lx, y - size, size);
    lx.lineWidth = size * 0.045; lx.strokeStyle = "#12041f";
    lx.strokeText(text, cx, y);
    x.drawImage(layer, 0, 0);
  } else if (style === 6) {
    const layer = makeCanvas(W, H), lx = layer.getContext("2d");
    lx.font = x.font; lx.textAlign = "center"; lx.textBaseline = "alphabetic";
    lx.shadowColor = "rgba(0,0,0,0.55)"; lx.shadowBlur = 0; lx.shadowOffsetY = size * 0.05;
    lx.fillStyle = chromeGradient(lx, y - size, size, true);
    lx.fillText(text, cx, y);
    paintStripes(lx, y - size, size);
    lx.lineWidth = size * 0.045; lx.strokeStyle = "#12041f";
    lx.strokeText(text, cx, y);
    x.drawImage(layer, 0, 0);
  } else if (style === 2) {
    x.shadowColor = "#ff2fb3"; x.shadowBlur = size * 0.35;
    x.fillStyle = "#ff71ce";
    x.fillText(text, cx, y);
    x.shadowColor = "#01cdfe"; x.shadowBlur = size * 0.22;
    x.fillStyle = "#fff3fd";
    x.fillText(text, cx, y);
    x.shadowBlur = 0;
  } else if (style === 3) {
    const g = x.createLinearGradient(0, y - size, 0, y);
    g.addColorStop(0, "#ffe9a8"); g.addColorStop(0.55, "#ff9a3c"); g.addColorStop(1, "#ff2fb3");
    x.fillStyle = g;
    x.lineWidth = size * 0.05; x.strokeStyle = "#4b0f35";
    x.strokeText(text, cx, y);
    x.fillText(text, cx, y);
  } else if (style === 4) {
    x.fillStyle = chromeGradient(x, y - size, size, false);
    x.lineWidth = size * 0.04; x.strokeStyle = "#233043";
    x.strokeText(text, cx, y);
    x.fillText(text, cx, y);
  } else if (style === 5) {
    x.lineWidth = size * 0.09; x.strokeStyle = "#ffffff";
    x.shadowColor = "rgba(0,0,0,0.6)"; x.shadowBlur = size * 0.12;
    x.strokeText(text, cx, y);
    x.shadowBlur = 0;
  } else {
    x.shadowColor = "rgba(0,0,0,0.65)"; x.shadowBlur = 0; x.shadowOffsetY = size * 0.055;
    x.fillStyle = "#ffffff";
    x.fillText(text, cx, y);
    x.shadowOffsetY = 0;
  }
  return size;
}

function drawSubtitle(x, W, y, text) {
  let size = W * 0.03;
  x.textAlign = "center";
  x.font = `${size}px "Teko", sans-serif`;
  if (state.autoFit) while (x.measureText(text).width > W * 0.8 && size > 12) { size *= 0.94; x.font = `${size}px "Teko", sans-serif`; }
  const tw = x.measureText(text).width;
  x.fillStyle = "rgba(10,2,20,0.72)";
  x.fillRect(W / 2 - tw / 2 - size * 0.5, y - size * 0.92, tw + size, size * 1.3);
  x.fillStyle = "#7ef0d4";
  x.fillText(text, W / 2, y);
}

/* ------------------------------------------------------- seal, frame, misc */
function drawSeal(x, W, H) {
  const R = W * 0.062, cx = W - R - W * 0.035, cy = H - R - H * 0.075;
  x.save();
  x.translate(cx, cy);
  x.rotate(-0.16);
  x.beginPath(); x.arc(0, 0, R, 0, Math.PI * 2);
  x.fillStyle = "rgba(255,179,71,0.92)"; x.fill();
  x.lineWidth = R * 0.07; x.strokeStyle = "#7a1e4d"; x.stroke();
  x.beginPath(); x.arc(0, 0, R * 0.78, 0, Math.PI * 2);
  x.lineWidth = R * 0.045; x.stroke();
  // Star.
  x.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? R * 0.2 : R * 0.46;
    const px = Math.cos(ang) * rad, py = Math.sin(ang) * rad - R * 0.12;
    i ? x.lineTo(px, py) : x.moveTo(px, py);
  }
  x.closePath();
  x.fillStyle = "#7a1e4d"; x.fill();
  x.fillStyle = "#160a24";
  x.textAlign = "center";
  x.font = `${R * 0.3}px "Alfa Slab One", serif`;
  x.fillText("VICE CITY", 0, R * 0.52);
  x.font = `${R * 0.19}px "Teko", sans-serif`;
  x.fillText("SEAL OF THE BAY · EST. 1986", 0, R * 0.74);
  x.restore();
}

function drawGoldenFrame(x, W, H) {
  const inset = W * 0.016, lw = Math.max(5, W * 0.009);
  const gold = x.createLinearGradient(0, 0, W, H);
  gold.addColorStop(0, "#8a5a12"); gold.addColorStop(0.25, "#ffe9a8"); gold.addColorStop(0.5, "#c99327");
  gold.addColorStop(0.75, "#fff3c4"); gold.addColorStop(1, "#8a5a12");
  x.save();
  x.lineWidth = lw; x.strokeStyle = gold;
  x.strokeRect(inset, inset, W - inset * 2, H - inset * 2);
  x.lineWidth = Math.max(2, lw * 0.32); x.strokeStyle = "rgba(255,233,168,0.85)";
  x.strokeRect(inset + lw * 1.15, inset + lw * 1.15, W - (inset + lw * 1.15) * 2, H - (inset + lw * 1.15) * 2);
  // Corner ornaments: small diamonds where the Golden Mile turns.
  x.fillStyle = gold;
  for (const [cx, cy] of [[inset, inset], [W - inset, inset], [inset, H - inset], [W - inset, H - inset]]) {
    x.save(); x.translate(cx, cy); x.rotate(Math.PI / 4);
    const s = lw * 1.5;
    x.fillRect(-s / 2, -s / 2, s, s);
    x.restore();
  }
  x.restore();
}

function drawCallouts(x, W, H, rects) {
  x.textAlign = "left";
  for (const co of state.callouts) {
    if (!co.text || co.panel < 0 || co.panel >= rects.length) continue;
    const r = rects[co.panel];
    const fs = Math.max(14, W * 0.019);
    x.font = `${fs}px "Fjalla One", sans-serif`;
    const tw = x.measureText(co.text).width;
    const bx = clamp(r.x + r.w * 0.55, 8, W - tw - fs - 8);
    const by = clamp(r.y + r.h * 0.1, 8, H - fs * 2);
    const px = r.x + r.w * 0.5, py = r.y + r.h * 0.42;
    x.strokeStyle = "#ffe9a8"; x.lineWidth = Math.max(2, W * 0.0028);
    x.beginPath(); x.moveTo(bx + 4, by + fs * 1.35); x.lineTo(px, py); x.stroke();
    x.beginPath(); x.arc(px, py, Math.max(4, W * 0.006), 0, Math.PI * 2);
    x.fillStyle = "#ffe9a8"; x.fill();
    x.fillStyle = "#d61c69";
    x.fillRect(bx, by, tw + fs * 0.8, fs * 1.45);
    x.fillStyle = "#fff";
    x.fillText(co.text, bx + fs * 0.4, by + fs * 1.05);
  }
}

function drawBilling(x, W, H) {
  const lines = state.billing.split("\n").filter((l) => l.trim());
  if (!lines.length) return;
  let size = W * 0.0165;
  x.textAlign = "center";
  const setF = () => { x.font = `${size}px "Teko", sans-serif`; };
  setF();
  const widest = Math.max(...lines.map((l) => x.measureText(l).width));
  if (state.autoFit) while (widest > W * 0.92 && size > 9) { size *= 0.94; setF(); }
  // A soft dark backing strip keeps the small billing type readable over art.
  const stripH = lines.length * size * 1.25 + size * 0.7;
  const grad = x.createLinearGradient(0, H - stripH, 0, H);
  grad.addColorStop(0, "rgba(10,2,20,0)");
  grad.addColorStop(1, "rgba(10,2,20,0.66)");
  x.fillStyle = grad;
  x.fillRect(0, H - stripH, W, stripH);
  x.fillStyle = "rgba(246,236,255,0.92)";
  lines.forEach((line, i) => {
    x.fillText(line, W / 2, H - (lines.length - i) * size * 1.25 - H * 0.012);
  });
}

function drawPopout(x, W, H, rects) {
  if (!state.popout) return;
  const t = template(), hi = t.hero || 0;
  const photoIndex = state.panelPhoto[hi];
  if (photoIndex < 0 || !state.photos[photoIndex]) return;
  const r = rects[hi];
  const photo = state.photos[photoIndex];
  const matte = matteFor(photoIndex);
  // Align the cut-out with the exact crop the panel shows, then draw that
  // region larger than the panel and shifted up: the subject breaks the
  // panel border — the pop-out effect.
  const focus = state.faceAware && photo.face ? photo.face : state.panelFocus[hi];
  const src = coverSourceRect(photo.img, focus, state.panelZoom[hi], r.w / r.h);
  const mx = src.sx / photo.img.naturalWidth * matte.width;
  const my = src.sy / photo.img.naturalHeight * matte.height;
  const mw = src.sw / photo.img.naturalWidth * matte.width;
  const mh = src.sh / photo.img.naturalHeight * matte.height;
  const grow = 1.16;
  const dw = r.w * grow, dh = r.h * grow;
  const dx = r.x + r.w / 2 - dw / 2;
  const dy = r.y + r.h - dh + r.h * 0.04;
  x.save();
  x.shadowColor = "rgba(0,0,0,0.55)";
  x.shadowBlur = W * 0.02;
  x.shadowOffsetY = W * 0.008;
  x.drawImage(matte, mx, my, mw, mh, dx, dy, dw, dh);
  x.restore();
}

/* -------------------------------------------------------------- render all */
function renderTo(canvas, W, H) {
  canvas.width = W; canvas.height = H;
  const x = canvas.getContext("2d");
  x.fillStyle = "#12041f";
  x.fillRect(0, 0, W, H);
  const rects = [];
  for (let i = 0; i < panelCount(); i++) rects.push(drawPanel(x, W, H, i));
  const t = template();
  if (t.titleOver && state.skyGlow) {
    const glow = x.createRadialGradient(W * 0.5, -H * 0.1, 10, W * 0.5, -H * 0.1, H * 0.85);
    glow.addColorStop(0, "rgba(255,214,140,0.75)");
    glow.addColorStop(0.45, "rgba(255,94,138,0.28)");
    glow.addColorStop(1, "rgba(255,94,138,0)");
    x.fillStyle = glow;
    x.fillRect(0, 0, W, H);
  }
  drawPopout(x, W, H, rects);
  if (t.titleOver) {
    const size = drawTitleText(x, W, H, state.title, W / 2, H * 0.17, W * 0.94, state.captionStyle);
    drawSubtitle(x, W, H * 0.17 + size * 0.52, state.subtitle);
  } else {
    // Bottom title band over a scrim, clear of the billing block.
    const bandH = H * 0.2;
    const scrim = x.createLinearGradient(0, H - bandH, 0, H);
    scrim.addColorStop(0, "rgba(10,2,20,0)");
    scrim.addColorStop(0.4, "rgba(10,2,20,0.78)");
    scrim.addColorStop(1, "rgba(10,2,20,0.94)");
    x.fillStyle = scrim;
    x.fillRect(0, H - bandH, W, bandH);
    const size = drawTitleText(x, W, H, state.title, W / 2, H * 0.845, W * 0.92, state.captionStyle);
    drawSubtitle(x, W, H * 0.845 + size * 0.5, state.subtitle);
  }
  drawCallouts(x, W, H, rects);
  if (state.seal) drawSeal(x, W, H);
  if (state.goldenFrame) drawGoldenFrame(x, W, H);
  drawBilling(x, W, H);
  return canvas;
}

function currentSize() {
  const [w, h] = state.size.split("x").map(Number);
  return { w, h };
}

function renderPreview() {
  const { w, h } = currentSize();
  state.forExport = false;
  renderTo($("poster"), w, h);
}

/* ----------------------------------------------------------------- export */
function downloadCanvas(canvas, name) {
  canvas.toBlob((blob) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }, "image/png");
}

function exportOne(sizeKey) {
  const [w, h] = sizeKey.split("x").map(Number);
  state.forExport = true;
  const c = renderTo(makeCanvas(w, h), w, h);
  state.forExport = false;
  renderPreview();
  downloadCanvas(c, `neon-vice-cover-${sizeKey}.png`);
  setStatus(`Exported PNG at ${sizeKey}.`);
}

function setStatus(msg) { $("statusLine").textContent = msg; }

/* ------------------------------------------------------------ photo intake */
function addPhoto(img, name) {
  const photo = { img, name, face: scanFace(img) };
  state.photos.push(photo);
  matteCache.clear();
  const idx = state.photos.length - 1;
  // Default casting is round-robin: one photo fills every panel, several
  // photos spread across the panels in turn. Users can recast any panel.
  ensurePanelArrays();
  for (let i = 0; i < panelCount(); i++) state.panelPhoto[i] = i % state.photos.length;
  if (photo.face) {
    for (let i = 0; i < panelCount(); i++) if (state.panelPhoto[i] === idx) state.panelFocus[i] = { ...photo.face };
  }
  refreshPhotoUI();
  applyAutoTags(false);
  renderPreview();
  setStatus(`Added ${name}${photo.face ? " — face found, crops centred on it" : ""}. ${state.photos.length} photo(s) in the studio.`);
}

function loadPhotoFile(file) {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => addPhoto(img, file.name);
  img.src = url;
}

function loadDemoPhotos() {
  for (const name of ["boulevard.jpg", "pier.jpg"]) {
    const img = new Image();
    img.onload = () => addPhoto(img, `samples/${name}`);
    img.src = `samples/${name}`;
  }
}

/* -------------------------------------------------------------------- UI */
function refreshPhotoUI() {
  const strip = $("photoStrip");
  strip.innerHTML = "";
  if (!state.photos.length) {
    strip.innerHTML = '<span class="hint">No photos yet — add your own or load the demo pair.</span>';
  }
  state.photos.forEach((photo, i) => {
    const thumb = document.createElement("img");
    thumb.src = photo.img.src;
    thumb.alt = photo.name;
    thumb.title = photo.name;
    if (state.panelPhoto.includes(i)) thumb.className = "used";
    thumb.addEventListener("click", () => {
      state.panelPhoto[state.selectedPanel] = i;
      refreshPhotoUI(); syncPanelControls(); renderPreview();
    });
    strip.appendChild(thumb);
  });
  const sel = $("panelPhotoSelect");
  sel.innerHTML = "";
  state.photos.forEach((photo, i) => {
    const opt = document.createElement("option");
    opt.value = i; opt.textContent = `${i + 1} · ${photo.name}`;
    sel.appendChild(opt);
  });
  syncPanelControls();
}

function syncPanelControls() {
  const i = state.selectedPanel;
  $("panelPhotoSelect").value = state.panelPhoto[i] >= 0 ? state.panelPhoto[i] : 0;
  $("zoomRange").value = Math.round((state.panelZoom[i] || 1) * 100);
  $("paintedToggle").checked = !!state.panelPainted[i];
}

function refreshCastUI() {
  const list = $("castList");
  list.innerHTML = "";
  for (let i = 0; i < panelCount(); i++) {
    const row = document.createElement("div");
    row.className = "cast-row";
    const label = document.createElement("span");
    label.textContent = `PANEL ${i + 1}`;
    const input = document.createElement("input");
    input.type = "text";
    input.value = state.panelTag[i] || "";
    input.placeholder = "role tag…";
    input.maxLength = 18;
    input.addEventListener("input", () => { state.panelTag[i] = input.value.toUpperCase(); renderPreview(); });
    row.appendChild(label);
    row.appendChild(input);
    list.appendChild(row);
  }
}

function refreshCalloutUI() {
  const list = $("calloutList");
  list.innerHTML = "";
  state.callouts.forEach((co, i) => {
    const row = document.createElement("div");
    row.className = "callout-row";
    const sel = document.createElement("select");
    for (let p = 0; p < panelCount(); p++) {
      const opt = document.createElement("option");
      opt.value = p; opt.textContent = `Panel ${p + 1}`;
      sel.appendChild(opt);
    }
    sel.value = co.panel;
    sel.addEventListener("change", () => { co.panel = Number(sel.value); renderPreview(); });
    const input = document.createElement("input");
    input.type = "text"; input.value = co.text; input.maxLength = 24;
    input.addEventListener("input", () => { co.text = input.value.toUpperCase(); renderPreview(); });
    const del = document.createElement("button");
    del.type = "button"; del.textContent = "×";
    del.addEventListener("click", () => { state.callouts.splice(i, 1); refreshCalloutUI(); renderPreview(); });
    row.appendChild(sel); row.appendChild(input); row.appendChild(del);
    list.appendChild(row);
  });
}

function applyAutoTags(announce) {
  state.panelTag = suggestCastTags();
  refreshCastUI();
  if (announce) setStatus("Auto cast tags suggested from panel size, position and face presence — edit any tag to override.");
}

function buildControls() {
  const grid = $("templateGrid");
  TEMPLATES.forEach((t, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = t.name;
    if (i === state.template) b.className = "active";
    b.addEventListener("click", () => {
      state.template = i;
      state.selectedPanel = 0;
      ensurePanelArrays();
      grid.querySelectorAll("button").forEach((el, j) => el.classList.toggle("active", j === i));
      $("templateHint").textContent = t.hint;
      applyAutoTags(false);
      refreshCalloutUI();
      syncPanelControls();
      renderPreview();
    });
    grid.appendChild(b);
  });
  $("templateHint").textContent = template().hint;

  const gradeSel = $("gradeSelect");
  GRADES.forEach((g, i) => {
    const opt = document.createElement("option");
    opt.value = i; opt.textContent = `${i + 1} · ${g.name}`;
    gradeSel.appendChild(opt);
  });
  gradeSel.value = state.grade;
  gradeSel.addEventListener("change", () => { state.grade = Number(gradeSel.value); renderPreview(); });
  $("gradeRange").addEventListener("input", () => { state.gradeStrength = Number($("gradeRange").value) / 100; renderPreview(); });

  $("photoInput").addEventListener("change", (e) => { [...e.target.files].forEach(loadPhotoFile); });
  $("demoBtn").addEventListener("click", loadDemoPhotos);
  $("panelPhotoSelect").addEventListener("change", () => {
    state.panelPhoto[state.selectedPanel] = Number($("panelPhotoSelect").value);
    refreshPhotoUI(); renderPreview();
  });
  $("zoomRange").addEventListener("input", () => {
    state.panelZoom[state.selectedPanel] = Number($("zoomRange").value) / 100;
    renderPreview();
  });
  $("faceAwareToggle").addEventListener("change", () => { state.faceAware = $("faceAwareToggle").checked; renderPreview(); });
  $("paintedToggle").addEventListener("change", () => { state.panelPainted[state.selectedPanel] = $("paintedToggle").checked; renderPreview(); });

  $("titleInput").addEventListener("input", () => { state.title = $("titleInput").value.toUpperCase() || "NEON VICE"; renderPreview(); });
  $("subtitleInput").addEventListener("input", () => { state.subtitle = $("subtitleInput").value.toUpperCase(); renderPreview(); });
  $("captionStyleSelect").addEventListener("change", () => { state.captionStyle = Number($("captionStyleSelect").value); renderPreview(); });
  $("autoFitToggle").addEventListener("change", () => { state.autoFit = $("autoFitToggle").checked; renderPreview(); });

  $("popoutToggle").addEventListener("change", () => { state.popout = $("popoutToggle").checked; renderPreview(); });
  $("goldenFrameToggle").addEventListener("change", () => { state.goldenFrame = $("goldenFrameToggle").checked; renderPreview(); });
  $("sealToggle").addEventListener("change", () => { state.seal = $("sealToggle").checked; renderPreview(); });
  $("skyGlowToggle").addEventListener("change", () => { state.skyGlow = $("skyGlowToggle").checked; renderPreview(); });

  $("autoTagBtn").addEventListener("click", () => { applyAutoTags(true); renderPreview(); });
  $("addCalloutBtn").addEventListener("click", () => {
    state.callouts.push({ panel: state.selectedPanel, text: "NEW CALLOUT" });
    refreshCalloutUI(); renderPreview();
  });
  state.billing = $("billingInput").value;
  $("billingInput").addEventListener("input", () => { state.billing = $("billingInput").value; renderPreview(); });

  $("sizeRow").querySelectorAll(".size-btn").forEach((b) => {
    b.addEventListener("click", () => {
      state.size = b.dataset.size;
      $("sizeRow").querySelectorAll(".size-btn").forEach((el) => el.classList.toggle("active", el === b));
      renderPreview();
    });
  });
  $("exportBtn").addEventListener("click", () => exportOne(state.size));
  $("exportAllBtn").addEventListener("click", () => {
    for (const key of ["1080x1080", "1080x1350", "1920x1080"]) exportOne(key);
    setStatus("Exported all three post sizes.");
  });

  // Canvas: click selects a panel, drag moves its focus point.
  const poster = $("poster");
  let dragging = false;
  const toPosterCoords = (ev) => {
    const rect = poster.getBoundingClientRect();
    return { x: (ev.clientX - rect.left) / rect.width, y: (ev.clientY - rect.top) / rect.height };
  };
  const panelAt = (pt) => {
    const panels = template().panels;
    for (let i = panels.length - 1; i >= 0; i--) {
      const p = panels[i];
      if (pt.x >= p.x && pt.x <= p.x + p.w && pt.y >= p.y && pt.y <= p.y + p.h) return i;
    }
    return 0;
  };
  poster.addEventListener("pointerdown", (ev) => {
    const pt = toPosterCoords(ev);
    state.selectedPanel = panelAt(pt);
    dragging = true;
    syncPanelControls();
    renderPreview();
  });
  poster.addEventListener("pointermove", (ev) => {
    if (!dragging) return;
    const pt = toPosterCoords(ev);
    const p = template().panels[state.selectedPanel];
    state.panelFocus[state.selectedPanel] = {
      x: clamp((pt.x - p.x) / p.w, 0.05, 0.95),
      y: clamp((pt.y - p.y) / p.h, 0.05, 0.95)
    };
    if (state.faceAware) { state.faceAware = false; $("faceAwareToggle").checked = false; }
    renderPreview();
  });
  window.addEventListener("pointerup", () => { dragging = false; });
}

/* -------------------------------------------------------------------- boot */
function boot() {
  ensurePanelArrays();
  buildControls();
  refreshPhotoUI();
  refreshCastUI();
  refreshCalloutUI();
  const params = new URLSearchParams(location.search);
  if (params.get("shot")) document.body.classList.add("shot");
  if (params.get("template")) {
    state.template = clamp(Number(params.get("template")) || 0, 0, TEMPLATES.length - 1);
    ensurePanelArrays();
  }
  if (params.get("size")) {
    state.size = params.get("size");
    $("sizeRow").querySelectorAll(".size-btn").forEach((el) => el.classList.toggle("active", el.dataset.size === state.size));
  }
  if (params.get("style")) state.captionStyle = clamp(Number(params.get("style")) || 7, 1, 7);
  if (params.get("title")) {
    state.title = params.get("title").toUpperCase();
    $("titleInput").value = state.title;
  }
  renderPreview();
  loadDemoPhotos();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => renderPreview());
}

boot();
