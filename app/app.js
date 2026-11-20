/* Neon Vice Cover Studio — GTA-style multi-panel cover art maker.
   Everything renders on one canvas: panels, grades, cast role tags,
   face-aware crops, callouts, the Vice City seal and the billing block.
   Photos stay on the user's machine; exports are plain PNG downloads. */

"use strict";

/* ---------- Layout templates: 8 arrangements, 2 to 8 panels ---------- */
const TEMPLATES = [
  { id: "duo", name: "Duo Split", panels: [
    { x: 0, y: 0, w: 0.5, h: 1 }, { x: 0.5, y: 0, w: 0.5, h: 1 } ] },
  { id: "trio", name: "Triple Threat", panels: [
    { x: 0, y: 0, w: 0.5, h: 1 },
    { x: 0.5, y: 0, w: 0.5, h: 0.5 }, { x: 0.5, y: 0.5, w: 0.5, h: 0.5 } ] },
  { id: "quad", name: "Quad City", panels: [
    { x: 0, y: 0, w: 0.5, h: 0.5 }, { x: 0.5, y: 0, w: 0.5, h: 0.5 },
    { x: 0, y: 0.5, w: 0.5, h: 0.5 }, { x: 0.5, y: 0.5, w: 0.5, h: 0.5 } ] },
  { id: "hero5", name: "Hero Five", panels: [
    { x: 0, y: 0, w: 0.55, h: 1 },
    { x: 0.55, y: 0, w: 0.225, h: 0.5 }, { x: 0.775, y: 0, w: 0.225, h: 0.5 },
    { x: 0.55, y: 0.5, w: 0.225, h: 0.5 }, { x: 0.775, y: 0.5, w: 0.225, h: 0.5 } ] },
  { id: "grid6", name: "Six Grid", panels: [
    { x: 0, y: 0, w: 1 / 3, h: 0.5 }, { x: 1 / 3, y: 0, w: 1 / 3, h: 0.5 },
    { x: 2 / 3, y: 0, w: 1 / 3, h: 0.5 },
    { x: 0, y: 0.5, w: 1 / 3, h: 0.5 }, { x: 1 / 3, y: 0.5, w: 1 / 3, h: 0.5 },
    { x: 2 / 3, y: 0.5, w: 1 / 3, h: 0.5 } ] },
  { id: "strip7", name: "Seven Strip", panels: [
    { x: 0, y: 0, w: 1, h: 0.42 },
    { x: 0, y: 0.42, w: 1 / 3, h: 0.29 }, { x: 1 / 3, y: 0.42, w: 1 / 3, h: 0.29 },
    { x: 2 / 3, y: 0.42, w: 1 / 3, h: 0.29 },
    { x: 0, y: 0.71, w: 1 / 3, h: 0.29 }, { x: 1 / 3, y: 0.71, w: 1 / 3, h: 0.29 },
    { x: 2 / 3, y: 0.71, w: 1 / 3, h: 0.29 } ] },
  { id: "mosaic8", name: "Mosaic Eight", panels: [
    { x: 0, y: 0, w: 0.5, h: 2 / 3 },
    { x: 0.5, y: 0, w: 0.25, h: 1 / 3 }, { x: 0.75, y: 0, w: 0.25, h: 1 / 3 },
    { x: 0.5, y: 1 / 3, w: 0.25, h: 1 / 3 }, { x: 0.75, y: 1 / 3, w: 0.25, h: 1 / 3 },
    { x: 0, y: 2 / 3, w: 0.25, h: 1 / 3 }, { x: 0.25, y: 2 / 3, w: 0.25, h: 1 / 3 },
    { x: 0.5, y: 2 / 3, w: 0.5, h: 1 / 3 } ] },
  { id: "collage8", name: "Vice Collage", panels: [
    { x: 0, y: 0, w: 0.5, h: 0.6 },
    { x: 0.5, y: 0, w: 0.25, h: 0.3 }, { x: 0.75, y: 0, w: 0.25, h: 0.3 },
    { x: 0.5, y: 0.3, w: 0.5, h: 0.3 },
    { x: 0, y: 0.6, w: 0.25, h: 0.4 }, { x: 0.25, y: 0.6, w: 0.25, h: 0.4 },
    { x: 0.5, y: 0.6, w: 0.25, h: 0.4 }, { x: 0.75, y: 0.6, w: 0.25, h: 0.4 } ] },
];

/* ---------- Colour grades: 8 looks, Sunset and Neon are the flagships ---------- */
const GRADES = [
  { id: "sunset", name: "Sunset",
    filter: "saturate(1.5) contrast(1.12) brightness(1.06) sepia(0.25)",
    tint: "255,94,0", tintAlpha: 0.16, wash: ["#ff7a18", "#ff2e63"] },
  { id: "neon", name: "Neon",
    filter: "saturate(1.8) contrast(1.15) brightness(1.05) hue-rotate(-12deg)",
    tint: "255,46,136", tintAlpha: 0.14, wash: ["#ff2e88", "#19e3c2"] },
  { id: "dusk", name: "Dusk Purple",
    filter: "saturate(1.3) contrast(1.1) brightness(0.92) hue-rotate(18deg)",
    tint: "90,40,160", tintAlpha: 0.18, wash: ["#5b2a86", "#ff5e78"] },
  { id: "teal", name: "Teal Noir",
    filter: "saturate(1.2) contrast(1.15) brightness(0.95)",
    tint: "10,120,110", tintAlpha: 0.16, wash: ["#0f766e", "#082f49"] },
  { id: "gold", name: "Gold Hour",
    filter: "saturate(1.4) contrast(1.1) brightness(1.08) sepia(0.45)",
    tint: "255,176,46", tintAlpha: 0.15, wash: ["#ffb02e", "#b45309"] },
  { id: "vicepink", name: "Vice Pink",
    filter: "saturate(1.6) contrast(1.12) brightness(1.05)",
    tint: "255,45,149", tintAlpha: 0.16, wash: ["#ff2e88", "#7c3aed"] },
  { id: "mono", name: "Mono Noir",
    filter: "grayscale(1) contrast(1.25) brightness(1.02)",
    tint: "0,0,0", tintAlpha: 0.08, wash: ["#111111", "#666666"] },
  { id: "tropical", name: "Tropical",
    filter: "saturate(1.9) contrast(1.08) brightness(1.07)",
    tint: "20,200,160", tintAlpha: 0.12, wash: ["#10b981", "#f59e0b"] },
];

/* ---------- Cast role tags ---------- */
const ROLE_TAGS = ["LEAD", "CREW", "RIVAL", "DRIVER", "LOOKOUT", "ENFORCER", "FIXER", "WHEELMAN"];
const ROLE_COLORS = {
  LEAD: "#ffb02e", RIVAL: "#ff2e2e", DRIVER: "#19e3c2", LOOKOUT: "#7c3aed",
  CREW: "#3b82f6", ENFORCER: "#f97316", FIXER: "#22c55e", WHEELMAN: "#ec4899",
};
const DEFAULT_ROLES = ["LEAD", "RIVAL", "DRIVER", "LOOKOUT", "CREW", "ENFORCER", "FIXER", "WHEELMAN"];
const SAMPLE_A = "samples/boulevard.jpg";
const SAMPLE_B = "samples/pier.jpg";

/* ---------- State ---------- */
function makePanel(i) {
  return {
    src: i % 2 === 0 ? SAMPLE_A : SAMPLE_B,
    focusX: 0.5, focusY: 0.42, zoom: 1.05,
    role: DEFAULT_ROLES[i] || "CREW", customRole: "",
  };
}
const state = {
  template: "mosaic8",
  grade: "neon",
  gradeStrength: 80,
  caption: "VICE CITY",
  captionStyle: "neon",
  captionSize: 100,
  sealText: "VICE CITY",
  sealYear: "EST. 2026",
  billing: "STARRING LUCIA & JASON — A LEONIDA PICTURE",
  panels: Array.from({ length: 8 }, (_, i) => makePanel(i)),
  callouts: [
    { text: "THE HEIST BEGINS", panel: 0, pos: 18 },
    { text: "GETAWAY DRIVER", panel: 2, pos: 72 },
  ],
  selectedPanel: 0,
  previewSize: "1080x1080",
};

/* ---------- Image cache ---------- */
const imageCache = new Map();
function loadImage(src) {
  if (imageCache.has(src)) return imageCache.get(src);
  const img = new Image();
  const p = new Promise((resolve) => {
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
  });
  img.src = src;
  const entry = { img, promise: p };
  imageCache.set(src, entry);
  return entry;
}
function preloadAll() {
  for (const panel of state.panels) {
    loadImage(panel.src).promise.then(() => renderPreview());
  }
}

/* ---------- Face-aware focus: densest skin-tone cell wins ---------- */
function isSkinPixel(r, g, b) {
  return r > 95 && g > 40 && b > 20 && r > g && r > b &&
    (r - g) > 15 && (r - b) > 15 && Math.abs(r - g) < 110;
}
function detectSkinFocus(img) {
  const probe = document.createElement("canvas");
  const S = 120;
  probe.width = S; probe.height = S;
  const pctx = probe.getContext("2d", { willReadFrequently: true });
  pctx.drawImage(img, 0, 0, S, S);
  let data;
  try {
    data = pctx.getImageData(0, 0, S, S).data;
  } catch (e) {
    return { x: 0.5, y: 0.42 };
  }
  const CELLS = 6, cell = S / CELLS;
  const counts = new Array(CELLS * CELLS).fill(0);
  let total = 0;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 4;
      if (isSkinPixel(data[i], data[i + 1], data[i + 2])) {
        counts[Math.floor(y / cell) * CELLS + Math.floor(x / cell)]++;
        total++;
      }
    }
  }
  if (total < 40) return { x: 0.5, y: 0.42 }; // no skin found: fall back to centre
  let best = 0;
  for (let i = 1; i < counts.length; i++) if (counts[i] > counts[best]) best = i;
  const cx = (best % CELLS + 0.5) / CELLS;
  const cy = (Math.floor(best / CELLS) + 0.5) / CELLS;
  return { x: cx, y: cy };
}
async function autoDetectFace(panelIndex) {
  const panel = state.panels[panelIndex];
  const entry = loadImage(panel.src);
  const img = await entry.promise;
  if (!img) return false;
  const focus = detectSkinFocus(img);
  panel.focusX = focus.x; panel.focusY = focus.y;
  return true;
}
async function autoDetectAllFaces() {
  const template = currentTemplate();
  for (let i = 0; i < template.panels.length; i++) await autoDetectFace(i);
  renderPreview();
  syncPanelList();
}

/* ---------- Geometry helpers ---------- */
function currentTemplate() {
  return TEMPLATES.find((t) => t.id === state.template) || TEMPLATES[0];
}
function currentGrade() {
  return GRADES.find((g) => g.id === state.grade) || GRADES[0];
}
function panelRects(w, h) {
  const gap = Math.round(Math.min(w, h) * 0.008);
  return currentTemplate().panels.map((p) => ({
    x: p.x * w + gap, y: p.y * h + gap,
    w: p.w * w - gap * 2, h: p.h * h - gap * 2,
  }));
}

/* ---------- Cover renderer: draws the whole poster on any canvas ---------- */
function drawPanelPhoto(ctx, img, panel, rect, grade, strength) {
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const zoom = panel.zoom || 1;
  const cover = Math.max(rect.w / iw, rect.h / ih) * zoom;
  const sw = rect.w / cover, sh = rect.h / cover;
  let sx = panel.focusX * iw - sw / 2;
  let sy = panel.focusY * ih - sh / 2;
  sx = Math.max(0, Math.min(iw - sw, sx));
  sy = Math.max(0, Math.min(ih - sh, sy));
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.filter = grade.filter;
  ctx.drawImage(img, sx, sy, sw, sh, rect.x, rect.y, rect.w, rect.h);
  ctx.filter = "none";
  // Grade tint wash, scaled by the strength slider.
  ctx.globalAlpha = (strength / 100) * grade.tintAlpha;
  ctx.fillStyle = "rgb(" + grade.tint + ")";
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.globalAlpha = (strength / 100) * 0.10;
  const wash = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  wash.addColorStop(0, grade.wash[0]);
  wash.addColorStop(1, grade.wash[1]);
  ctx.fillStyle = wash;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.globalAlpha = 1;
  // Vignette so panels read as one poster.
  const vg = ctx.createRadialGradient(
    rect.x + rect.w / 2, rect.y + rect.h / 2, Math.min(rect.w, rect.h) * 0.35,
    rect.x + rect.w / 2, rect.y + rect.h / 2, Math.max(rect.w, rect.h) * 0.75);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.28)");
  ctx.fillStyle = vg;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
  // Panel frame.
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = Math.max(2, rect.w * 0.004);
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

function drawRoleTag(ctx, panel, rect) {
  const label = (panel.customRole || panel.role || "").trim().toUpperCase();
  if (!label) return;
  const h = Math.max(20, rect.h * 0.085);
  const padX = h * 0.45;
  ctx.save();
  ctx.font = "700 " + Math.round(h * 0.62) + "px 'Barlow Condensed', sans-serif";
  const tw = ctx.measureText(label).width;
  const x = rect.x + rect.w * 0.03, y = rect.y + rect.h * 0.035;
  ctx.fillStyle = ROLE_COLORS[panel.role] || "#ff2e88";
  ctx.fillRect(x, y, tw + padX * 2, h);
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + padX, y + h / 2 + 1);
  ctx.restore();
}

function drawCaption(ctx, w, h) {
  const text = (state.caption || "").trim().toUpperCase();
  if (!text) return;
  const billingH = h * 0.045;
  const bandH = h * 0.16;
  const bandY = h - billingH - bandH;
  const base = bandH * 0.82 * (state.captionSize / 100);
  let size = base;
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // Auto-fit: shrink until the caption fits the cover width.
  for (;;) {
    ctx.font = Math.round(size) + "px 'Bebas Neue', sans-serif";
    if (ctx.measureText(text).width <= w * 0.94 || size < 12) break;
    size *= 0.92;
  }
  const cx = w / 2, cy = bandY + bandH / 2;
  const style = state.captionStyle;
  if (style === "solid") {
    ctx.fillStyle = "rgba(10,5,18,0.88)";
    const tw = ctx.measureText(text).width;
    ctx.fillRect(cx - tw / 2 - size * 0.25, bandY + bandH * 0.08, tw + size * 0.5, bandH * 0.84);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(text, cx, cy);
  } else if (style === "neon") {
    ctx.shadowColor = "#ff2e88";
    ctx.shadowBlur = size * 0.35;
    const grad = ctx.createLinearGradient(cx - w * 0.4, cy, cx + w * 0.4, cy);
    grad.addColorStop(0, "#ffffff"); grad.addColorStop(0.5, "#ffd7ec"); grad.addColorStop(1, "#19e3c2");
    ctx.fillStyle = grad;
    ctx.fillText(text, cx, cy);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,46,136,0.9)";
    ctx.lineWidth = Math.max(2, size * 0.03);
    ctx.strokeText(text, cx, cy);
  } else if (style === "gold") {
    const grad = ctx.createLinearGradient(0, bandY, 0, bandY + bandH);
    grad.addColorStop(0, "#fff3c4"); grad.addColorStop(0.5, "#ffb02e"); grad.addColorStop(1, "#b45309");
    ctx.fillStyle = grad;
    ctx.fillText(text, cx, cy);
    ctx.strokeStyle = "rgba(60,30,0,0.85)";
    ctx.lineWidth = Math.max(2, size * 0.035);
    ctx.strokeText(text, cx, cy);
  } else if (style === "vicepink") {
    const grad = ctx.createLinearGradient(0, bandY, 0, bandY + bandH);
    grad.addColorStop(0, "#ff8ac2"); grad.addColorStop(0.5, "#ff2e88"); grad.addColorStop(1, "#b5179e");
    ctx.fillStyle = grad;
    ctx.fillText(text, cx, cy);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = Math.max(2, size * 0.03);
    ctx.strokeText(text, cx, cy);
  } else { // sunset outline
    const grad = ctx.createLinearGradient(0, bandY, 0, bandY + bandH);
    grad.addColorStop(0, "#ffe259"); grad.addColorStop(0.5, "#ff7a18"); grad.addColorStop(1, "#ff2e63");
    ctx.fillStyle = grad;
    ctx.fillText(text, cx, cy);
    ctx.strokeStyle = "rgba(20,5,25,0.95)";
    ctx.lineWidth = Math.max(3, size * 0.05);
    ctx.strokeText(text, cx, cy);
  }
  ctx.restore();
}

function drawCallouts(ctx, w, h, rects) {
  const grade = currentGrade();
  state.callouts.forEach((callout) => {
    const rect = rects[callout.panel];
    if (!rect) return;
    const angle = (callout.pos / 100) * Math.PI * 2 - Math.PI / 2;
    const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
    const reach = Math.max(rect.w, rect.h) * 0.62;
    const ax = cx + Math.cos(angle) * rect.w * 0.5;
    const ay = cy + Math.sin(angle) * rect.h * 0.5;
    let lx = cx + Math.cos(angle) * reach;
    let ly = cy + Math.sin(angle) * reach;
    lx = Math.max(w * 0.06, Math.min(w * 0.94, lx));
    ly = Math.max(h * 0.06, Math.min(h * 0.90, ly));
    const fontSize = Math.max(16, h * 0.022);
    ctx.save();
    ctx.font = "700 " + Math.round(fontSize) + "px 'Barlow Condensed', sans-serif";
    const label = (callout.text || "").toUpperCase();
    const tw = ctx.measureText(label).width;
    const padX = fontSize * 0.6, padY = fontSize * 0.35;
    const bx = Math.max(4, Math.min(w - tw - padX * 2 - 4, lx - (tw + padX * 2) / 2));
    const by = Math.max(4, Math.min(h - fontSize - padY * 2 - 4, ly - (fontSize + padY * 2) / 2));
    // Leader line from the label to the panel edge.
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = Math.max(2, h * 0.003);
    ctx.beginPath();
    ctx.moveTo(bx + (tw + padX * 2) / 2, by + (fontSize + padY * 2) / 2);
    ctx.lineTo(ax, ay);
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(ax, ay, Math.max(3, h * 0.006), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(12,6,22,0.92)";
    ctx.fillRect(bx, by, tw + padX * 2, fontSize + padY * 2);
    ctx.strokeStyle = grade.wash[0];
    ctx.lineWidth = Math.max(2, h * 0.003);
    ctx.strokeRect(bx, by, tw + padX * 2, fontSize + padY * 2);
    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "middle";
    ctx.fillText(label, bx + padX, by + (fontSize + padY * 2) / 2 + 1);
    ctx.restore();
  });
}

function drawSeal(ctx, w, h) {
  const text = (state.sealText || "").trim().toUpperCase();
  if (!text) return;
  const r = h * 0.058;
  const cx = w - r - w * 0.035;
  const cy = h - h * 0.045 - h * 0.16 - r - h * 0.02;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.12);
  ctx.strokeStyle = "#ffd166";
  ctx.lineWidth = Math.max(2, r * 0.07);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = Math.max(1, r * 0.035);
  ctx.beginPath(); ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = "rgba(12,6,22,0.55)";
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#ffd166";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const words = text.split(/\s+/);
  const fontSize = Math.max(10, r * 0.34);
  ctx.font = Math.round(fontSize) + "px 'Bebas Neue', sans-serif";
  if (words.length > 1) {
    ctx.fillText(words.slice(0, Math.ceil(words.length / 2)).join(" "), 0, -fontSize * 0.55);
    ctx.fillText(words.slice(Math.ceil(words.length / 2)).join(" "), 0, fontSize * 0.55);
  } else {
    ctx.fillText(text, 0, -fontSize * 0.25);
  }
  ctx.font = "600 " + Math.round(r * 0.22) + "px 'Montserrat', sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(state.sealYear || "", 0, r * 0.62);
  ctx.restore();
}

function drawBilling(ctx, w, h) {
  const text = (state.billing || "").trim().toUpperCase();
  const billingH = h * 0.045;
  ctx.save();
  ctx.fillStyle = "rgba(8,4,14,0.92)";
  ctx.fillRect(0, h - billingH, w, billingH);
  if (text) {
    ctx.fillStyle = "#e8ddf2";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    let size = Math.max(11, h * 0.016);
    ctx.font = "600 " + Math.round(size) + "px 'Montserrat', sans-serif";
    if (ctx.measureText(text).width > w * 0.96) {
      size = size * (w * 0.96) / ctx.measureText(text).width;
      ctx.font = "600 " + Math.round(size) + "px 'Montserrat', sans-serif";
    }
    try { ctx.letterSpacing = Math.round(size * 0.12) + "px"; } catch (e) { /* older canvas */ }
    ctx.fillText(text, w / 2, h - billingH / 2 + 1);
    try { ctx.letterSpacing = "0px"; } catch (e) { /* older canvas */ }
  }
  ctx.restore();
}

/* Renders the full cover onto ctx at size w x h. Returns the panel rects. */
function renderCover(ctx, w, h) {
  const grade = currentGrade();
  ctx.save();
  ctx.fillStyle = "#0d0618";
  ctx.fillRect(0, 0, w, h);
  const rects = panelRects(w, h);
  rects.forEach((rect, i) => {
    const panel = state.panels[i];
    const entry = loadImage(panel.src);
    const img = entry.img;
    if (img && img.complete && img.naturalWidth > 0) {
      drawPanelPhoto(ctx, img, panel, rect, grade, state.gradeStrength);
    } else {
      ctx.fillStyle = "#241640";
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      entry.promise.then(() => renderPreview());
    }
    drawRoleTag(ctx, panel, rect);
  });
  drawCaption(ctx, w, h);
  drawCallouts(ctx, w, h, rects);
  drawSeal(ctx, w, h);
  drawBilling(ctx, w, h);
  ctx.restore();
  return rects;
}

/* ---------- Preview ---------- */
const canvas = document.getElementById("cover-canvas");
const previewCtx = canvas.getContext("2d");
let lastRects = [];
function renderPreview() {
  const size = state.previewSize.split("x").map(Number);
  canvas.width = size[0];
  canvas.height = size[1];
  lastRects = renderCover(previewCtx, size[0], size[1]);
  const label = document.getElementById("preview-size-label");
  if (label) label.textContent = "Preview — " + size[0] + " × " + size[1] +
    (size[0] === size[1] ? " square" : size[0] > size[1] ? " landscape" : " portrait");
}

/* Drag on the preview to move the selected panel's face focus point. */
let dragging = false;
function canvasPoint(evt) {
  const box = canvas.getBoundingClientRect();
  const scaleX = canvas.width / box.width, scaleY = canvas.height / box.height;
  return { x: (evt.clientX - box.left) * scaleX, y: (evt.clientY - box.top) * scaleY };
}
function panelAt(point) {
  for (let i = lastRects.length - 1; i >= 0; i--) {
    const r = lastRects[i];
    if (point.x >= r.x && point.x <= r.x + r.w && point.y >= r.y && point.y <= r.y + r.h) return i;
  }
  return -1;
}
canvas.addEventListener("pointerdown", (evt) => {
  const point = canvasPoint(evt);
  const idx = panelAt(point);
  if (idx < 0) return;
  state.selectedPanel = idx;
  dragging = true;
  canvas.setPointerCapture(evt.pointerId);
  moveFocus(idx, point);
  syncPanelList();
});
canvas.addEventListener("pointermove", (evt) => {
  if (!dragging) return;
  moveFocus(state.selectedPanel, canvasPoint(evt));
});
canvas.addEventListener("pointerup", () => { dragging = false; });
function moveFocus(idx, point) {
  const rect = lastRects[idx];
  if (!rect) return;
  const panel = state.panels[idx];
  panel.focusX = Math.max(0, Math.min(1, (point.x - rect.x) / rect.w));
  panel.focusY = Math.max(0, Math.min(1, (point.y - rect.y) / rect.h));
  renderPreview();
}

/* ---------- Export ---------- */
function renderExportCanvas(w, h) {
  const off = document.createElement("canvas");
  off.width = w; off.height = h;
  renderCover(off.getContext("2d"), w, h);
  return off;
}
function downloadCanvas(off, filename) {
  return new Promise((resolve) => {
    off.toBlob((blob) => {
      if (!blob) { resolve(null); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      const preview = document.getElementById("last-export");
      if (preview) { preview.src = url; preview.hidden = false; }
      resolve(url);
    }, "image/png");
  });
}
async function exportPNG(sizeKey) {
  const size = sizeKey.split("x").map(Number);
  const off = renderExportCanvas(size[0], size[1]);
  const status = document.getElementById("export-status");
  const url = await downloadCanvas(off, "vice-city-cover-" + sizeKey + ".png");
  if (status) {
    status.textContent = url
      ? "Exported " + size[0] + " × " + size[1] + " PNG — check your downloads."
      : "Export failed — try again.";
  }
  return url;
}
async function exportAll() {
  const status = document.getElementById("export-status");
  if (status) status.textContent = "Exporting all three sizes…";
  for (const key of ["1080x1080", "1080x1350", "1920x1080"]) {
    await exportPNG(key);
    await new Promise((r) => setTimeout(r, 250));
  }
  if (status) status.textContent = "Exported all 3 sizes: square, portrait and landscape.";
}

/* ---------- Panel editor list ---------- */
const panelList = document.getElementById("panel-list");
function syncPanelList() {
  const template = currentTemplate();
  panelList.innerHTML = "";
  template.panels.forEach((_, i) => {
    const panel = state.panels[i];
    const row = document.createElement("div");
    row.className = "panel-row" + (state.selectedPanel === i ? " selected" : "");
    row.innerHTML =
      "<h3>Panel " + (i + 1) + " — <span class='role-name'>" +
      (panel.customRole || panel.role) + "</span></h3>" +
      "<div class='grid2'>" +
      "<label>Role tag<select class='role-select'>" +
      ROLE_TAGS.map((r) => "<option value='" + r + "'" + (panel.role === r ? " selected" : "") + ">" + r + "</option>").join("") +
      "</select></label>" +
      "<label>Custom tag text<input class='custom-role' type='text' maxlength='18' placeholder='e.g. SNIPER' value='" + panel.customRole.replace(/"/g, "&quot;") + "'></label>" +
      "</div>" +
      "<label>Photo<input class='photo-input' type='file' accept='image/*'></label>" +
      "<div class='row'>" +
      "<button class='btn sample-a' type='button'>Boulevard</button>" +
      "<button class='btn sample-b' type='button'>Pier</button>" +
      "<button class='btn autoface' type='button'>Auto face</button>" +
      "</div>" +
      "<label>Zoom <output>" + Math.round(panel.zoom * 100) + "%</output>" +
      "<input class='zoom-range' type='range' min='100' max='260' value='" + Math.round(panel.zoom * 100) + "'></label>";
    row.querySelector(".role-select").addEventListener("change", (e) => {
      panel.role = e.target.value;
      renderPreview(); syncPanelList();
    });
    row.querySelector(".custom-role").addEventListener("input", (e) => {
      panel.customRole = e.target.value;
      renderPreview();
      row.querySelector(".role-name").textContent = panel.customRole || panel.role;
    });
    row.querySelector(".photo-input").addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => { panel.src = String(reader.result); preloadAll(); renderPreview(); };
      reader.readAsDataURL(file);
    });
    row.querySelector(".sample-a").addEventListener("click", () => {
      panel.src = SAMPLE_A; preloadAll(); renderPreview();
    });
    row.querySelector(".sample-b").addEventListener("click", () => {
      panel.src = SAMPLE_B; preloadAll(); renderPreview();
    });
    row.querySelector(".autoface").addEventListener("click", async () => {
      await autoDetectFace(i);
      renderPreview(); syncPanelList();
    });
    row.querySelector(".zoom-range").addEventListener("input", (e) => {
      panel.zoom = Number(e.target.value) / 100;
      row.querySelector("output").textContent = e.target.value + "%";
      renderPreview();
    });
    row.addEventListener("click", (e) => {
      if (e.target.tagName === "BUTTON" || e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
      state.selectedPanel = i;
      syncPanelList();
    });
    panelList.appendChild(row);
  });
}

/* ---------- Callout editor list ---------- */
const calloutList = document.getElementById("callout-list");
function syncCalloutList() {
  calloutList.innerHTML = "";
  const template = currentTemplate();
  state.callouts.forEach((callout, ci) => {
    const row = document.createElement("div");
    row.className = "callout-row";
    row.innerHTML =
      "<label>Callout text<input class='callout-text' type='text' maxlength='40' value='" +
      callout.text.replace(/"/g, "&quot;") + "'></label>" +
      "<button class='btn callout-remove' type='button'>Remove</button>" +
      "<label>Points at panel<select class='callout-panel'>" +
      template.panels.map((_, i) => "<option value='" + i + "'" + (callout.panel === i ? " selected" : "") + ">Panel " + (i + 1) + "</option>").join("") +
      "</select></label>" +
      "<label>Position <output>" + callout.pos + "</output>" +
      "<input class='callout-pos' type='range' min='0' max='100' value='" + callout.pos + "'></label>";
    row.querySelector(".callout-text").addEventListener("input", (e) => {
      callout.text = e.target.value; renderPreview();
    });
    row.querySelector(".callout-panel").addEventListener("change", (e) => {
      callout.panel = Number(e.target.value); renderPreview();
    });
    row.querySelector(".callout-pos").addEventListener("input", (e) => {
      callout.pos = Number(e.target.value);
      row.querySelector("output").textContent = e.target.value;
      renderPreview();
    });
    row.querySelector(".callout-remove").addEventListener("click", () => {
      state.callouts.splice(ci, 1);
      renderPreview(); syncCalloutList();
    });
    calloutList.appendChild(row);
  });
}

/* ---------- Top-level controls ---------- */
function fillSelect(select, items, current) {
  select.innerHTML = items.map((it) =>
    "<option value='" + it.id + "'" + (it.id === current ? " selected" : "") + ">" + it.name + "</option>").join("");
}
function wireControls() {
  const templateSelect = document.getElementById("select-template");
  const gradeSelect = document.getElementById("select-grade");
  fillSelect(templateSelect, TEMPLATES, state.template);
  fillSelect(gradeSelect, GRADES, state.grade);

  templateSelect.addEventListener("change", (e) => {
    state.template = e.target.value;
    document.getElementById("template-name").textContent = currentTemplate().name;
    state.selectedPanel = 0;
    renderPreview(); syncPanelList(); syncCalloutList();
  });
  gradeSelect.addEventListener("change", (e) => {
    state.grade = e.target.value;
    document.getElementById("grade-name").textContent = currentGrade().name;
    renderPreview();
  });
  document.getElementById("range-grade-strength").addEventListener("input", (e) => {
    state.gradeStrength = Number(e.target.value);
    document.getElementById("grade-strength-out").textContent = e.target.value + "%";
    renderPreview();
  });
  document.getElementById("input-caption").addEventListener("input", (e) => {
    state.caption = e.target.value; renderPreview();
  });
  document.getElementById("select-caption-style").addEventListener("change", (e) => {
    state.captionStyle = e.target.value; renderPreview();
  });
  document.getElementById("range-caption-size").addEventListener("input", (e) => {
    state.captionSize = Number(e.target.value); renderPreview();
  });
  document.getElementById("input-seal").addEventListener("input", (e) => {
    state.sealText = e.target.value; renderPreview();
  });
  document.getElementById("input-seal-year").addEventListener("input", (e) => {
    state.sealYear = e.target.value; renderPreview();
  });
  document.getElementById("input-billing").addEventListener("input", (e) => {
    state.billing = e.target.value; renderPreview();
  });
  document.getElementById("select-preview-size").addEventListener("change", (e) => {
    state.previewSize = e.target.value; renderPreview();
  });
  document.getElementById("input-photo").addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      state.panels[state.selectedPanel].src = String(reader.result);
      preloadAll(); renderPreview();
    };
    reader.readAsDataURL(file);
  });
  document.getElementById("btn-sample-a").addEventListener("click", () => {
    state.panels[state.selectedPanel].src = SAMPLE_A; preloadAll(); renderPreview();
  });
  document.getElementById("btn-sample-b").addEventListener("click", () => {
    state.panels[state.selectedPanel].src = SAMPLE_B; preloadAll(); renderPreview();
  });
  document.getElementById("btn-autoface-all").addEventListener("click", autoDetectAllFaces);
  document.getElementById("btn-centre-all").addEventListener("click", () => {
    for (const panel of state.panels) { panel.focusX = 0.5; panel.focusY = 0.42; }
    renderPreview(); syncPanelList();
  });
  document.getElementById("btn-add-callout").addEventListener("click", () => {
    state.callouts.push({ text: "NEW CALLOUT", panel: state.selectedPanel, pos: 50 });
    renderPreview(); syncCalloutList();
  });
  document.querySelectorAll(".btn-export").forEach((btn) => {
    btn.addEventListener("click", () => exportPNG(btn.dataset.export));
  });
  document.getElementById("btn-export-all").addEventListener("click", exportAll);
}

/* ---------- Boot ---------- */
wireControls();
syncPanelList();
syncCalloutList();
preloadAll();
renderPreview();
if (document.fonts && document.fonts.ready) {
  document.fonts.load("34px 'Bebas Neue'").catch(() => {});
  document.fonts.load("700 20px 'Barlow Condensed'").catch(() => {});
  document.fonts.load("600 16px 'Montserrat'").catch(() => {});
  document.fonts.ready.then(() => renderPreview());
}

/* Test and automation handle: Playwright drives the app through this. */
window.CoverStudio = {
  state, TEMPLATES, GRADES, ROLE_TAGS,
  renderPreview, renderCover, renderExportCanvas,
  exportPNG, exportAll, autoDetectFace, autoDetectAllFaces,
  loadSample(i) { state.panels[state.selectedPanel].src = i === 0 ? SAMPLE_A : SAMPLE_B; preloadAll(); renderPreview(); },
  async fontsReady() {
    if (!document.fonts) return false;
    await document.fonts.ready;
    return ["34px 'Bebas Neue'", "700 20px 'Barlow Condensed'", "600 16px 'Montserrat'"]
      .every((f) => document.fonts.check(f));
  },
};
