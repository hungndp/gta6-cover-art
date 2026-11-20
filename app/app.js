/* Neon Vice Cover Studio — GTA 6-style multi-panel cover art maker.
   Offline vanilla JS. One photo (or several) in, a poster cover PNG out.
   Panels, face-aware crops, cast role tags, colour grades, callouts,
   seal stamp and billing block are all drawn on one canvas per export. */

"use strict";

/* ---------- 8 layout templates: panel rectangles as fractions of the cover ---------- */
const TEMPLATES = [
  { id: "hero-duo", name: "Hero Duo", panels: [
    { x: 0, y: 0, w: 1, h: 0.66 }, { x: 0, y: 0.66, w: 0.5, h: 0.34 }, { x: 0.5, y: 0.66, w: 0.5, h: 0.34 } ] },
  { id: "split-duo", name: "Split Duo", panels: [
    { x: 0, y: 0, w: 0.5, h: 1 }, { x: 0.5, y: 0, w: 0.5, h: 1 } ] },
  { id: "trio-strip", name: "Trio Strip", panels: [
    { x: 0, y: 0, w: 0.333, h: 1 }, { x: 0.333, y: 0, w: 0.334, h: 1 }, { x: 0.667, y: 0, w: 0.333, h: 1 } ] },
  { id: "quad-grid", name: "Quad Grid", panels: [
    { x: 0, y: 0, w: 0.5, h: 0.5 }, { x: 0.5, y: 0, w: 0.5, h: 0.5 },
    { x: 0, y: 0.5, w: 0.5, h: 0.5 }, { x: 0.5, y: 0.5, w: 0.5, h: 0.5 } ] },
  { id: "hero-left", name: "Hero Left", panels: [
    { x: 0, y: 0, w: 0.62, h: 1 }, { x: 0.62, y: 0, w: 0.38, h: 0.5 }, { x: 0.62, y: 0.5, w: 0.38, h: 0.5 } ] },
  { id: "hero-right", name: "Hero Right", panels: [
    { x: 0, y: 0, w: 0.38, h: 0.5 }, { x: 0, y: 0.5, w: 0.38, h: 0.5 }, { x: 0.38, y: 0, w: 0.62, h: 1 } ] },
  { id: "five-panel", name: "Five Panel", panels: [
    { x: 0, y: 0, w: 1, h: 0.56 },
    { x: 0, y: 0.56, w: 0.25, h: 0.44 }, { x: 0.25, y: 0.56, w: 0.25, h: 0.44 },
    { x: 0.5, y: 0.56, w: 0.25, h: 0.44 }, { x: 0.75, y: 0.56, w: 0.25, h: 0.44 } ] },
  { id: "mosaic-eight", name: "Mosaic 8", panels: [
    { x: 0, y: 0, w: 0.5, h: 0.55 }, { x: 0.5, y: 0, w: 0.25, h: 0.55 }, { x: 0.75, y: 0, w: 0.25, h: 0.55 },
    { x: 0, y: 0.55, w: 0.25, h: 0.45 }, { x: 0.25, y: 0.55, w: 0.25, h: 0.45 },
    { x: 0.5, y: 0.55, w: 0.25, h: 0.45 },
    { x: 0.75, y: 0.55, w: 0.25, h: 0.225 }, { x: 0.75, y: 0.775, w: 0.25, h: 0.225 } ] },
];

/* ---------- 8 colour grades: canvas filter + tinted overlay ---------- */
const GRADES = [
  { id: "sunset", name: "Sunset", filter: "saturate(1.35) contrast(1.08) sepia(0.25)",
    overlay: ["#ff7a1a", "#ff2e88"], swatch: "linear-gradient(135deg,#ffb347,#ff2e88)" },
  { id: "neon", name: "Neon", filter: "saturate(1.6) contrast(1.15) hue-rotate(-15deg)",
    overlay: ["#ff2e88", "#22e6ff"], swatch: "linear-gradient(135deg,#ff2e88,#22e6ff)" },
  { id: "dusk", name: "Dusk Purple", filter: "saturate(1.2) brightness(0.92) hue-rotate(25deg)",
    overlay: ["#7b2fff", "#2b1055"], swatch: "linear-gradient(135deg,#7b2fff,#2b1055)" },
  { id: "teal-noir", name: "Teal Noir", filter: "saturate(0.85) contrast(1.2) brightness(0.9)",
    overlay: ["#0f766e", "#042f2e"], swatch: "linear-gradient(135deg,#0f766e,#042f2e)" },
  { id: "gold-hour", name: "Gold Hour", filter: "sepia(0.45) saturate(1.4) contrast(1.05)",
    overlay: ["#ffc93c", "#b45309"], swatch: "linear-gradient(135deg,#ffc93c,#b45309)" },
  { id: "vice-pink", name: "Vice Pink", filter: "saturate(1.5) hue-rotate(-30deg) contrast(1.05)",
    overlay: ["#ff5da2", "#7c3aed"], swatch: "linear-gradient(135deg,#ff5da2,#7c3aed)" },
  { id: "mono-noir", name: "Mono Noir", filter: "grayscale(1) contrast(1.25) brightness(0.95)",
    overlay: ["#111111", "#555555"], swatch: "linear-gradient(135deg,#111111,#888888)" },
  { id: "tropical", name: "Tropical", filter: "saturate(1.5) contrast(1.1) brightness(1.05)",
    overlay: ["#22e6a8", "#0ea5e9"], swatch: "linear-gradient(135deg,#22e6a8,#0ea5e9)" },
];

const CAPTION_STYLES = ["sunset", "neon", "solid", "gold", "vice"];
const EXPORT_SIZES = [
  { label: "1080x1080", w: 1080, h: 1080 },
  { label: "1080x1350", w: 1080, h: 1350 },
  { label: "1920x1080", w: 1920, h: 1080 },
];

/* ---------- state ---------- */
const state = {
  templateId: "hero-duo",
  gradeId: "sunset",
  gradeStrength: 0.8,
  caption: "LEONIDA HEAT",
  captionSize: 96,
  captionStyle: "sunset",
  captionPlacement: "bottom",
  sealOn: true,
  sealText: "VICE CITY",
  billingOn: true,
  billingText: "STARRING LUCIA & JASON — A LEONIDA STORY · DIRECTED BY YOU",
  exportSize: "1080x1080",
  selectedPanel: 0,
  photos: [],          // { name, img, src }
  panels: [],         // { photo: index, zoom, fx, fy, role, roleCustom }
  callouts: [],       // { text, panel, x, y }
};

const previewCanvas = document.getElementById("previewCanvas");
const previewCtx = previewCanvas.getContext("2d");

function template() { return TEMPLATES.find((t) => t.id === state.templateId) || TEMPLATES[0]; }
function grade() { return GRADES.find((g) => g.id === state.gradeId) || GRADES[0]; }
function exportSize() { return EXPORT_SIZES.find((s) => s.label === state.exportSize) || EXPORT_SIZES[0]; }

function resetPanels() {
  state.panels = template().panels.map((_, i) => ({
    photo: i % Math.max(1, state.photos.length),
    zoom: 1.3, fx: 0.5, fy: 0.42,
    role: i === 0 ? "LEAD" : "",
    roleCustom: "",
  }));
  state.selectedPanel = 0;
  state.callouts = state.callouts.filter((c) => c.panel < template().panels.length);
}

/* ---------- photos ---------- */
function addPhoto(name, src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      state.photos.push({ name, img, src });
      renderPhotoLibrary();
      renderPanelControls();
      resolve(state.photos.length - 1);
    };
    img.onerror = () => reject(new Error("Could not load image " + name));
    img.src = src;
  });
}

async function loadSamplePhotos() {
  for (const [name, path] of [["Boulevard", "samples/boulevard.jpg"], ["Pier", "samples/pier.jpg"]]) {
    try {
      const res = await fetch(path);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      await addPhoto(name + " (sample)", url);
    } catch (err) { console.warn("Sample photo failed:", name, err); }
  }
  if (state.photos.length) { resetPanels(); renderAll(); }
}

function loadPhotoFile(file) {
  const reader = new FileReader();
  reader.onload = async () => {
    try { await addPhoto(file.name, String(reader.result)); resetPanels(); renderAll(); }
    catch (err) { setStatus("Could not read that photo."); }
  };
  reader.readAsDataURL(file);
}

/* ---------- face-aware crop: skin-tone scan ---------- */
function isSkinPixel(r, g, b) {
  return r > 95 && r > g && r > b && (r - g) > 12 && (r - g) < 95 && (r - b) > 15 && g > 40 && b > 20;
}

function detectFaceFocus(photo) {
  const probe = document.createElement("canvas");
  const pw = 120, ph = Math.max(1, Math.round(120 * (photo.img.naturalHeight / photo.img.naturalWidth)));
  probe.width = pw; probe.height = ph;
  const pctx = probe.getContext("2d", { willReadFrequently: true });
  pctx.drawImage(photo.img, 0, 0, pw, ph);
  let data;
  try { data = pctx.getImageData(0, 0, pw, ph).data; }
  catch (err) { return { x: 0.5, y: 0.42 }; }
  // Densest 6x6 skin cell wins: robust against a bright sky or a crowd.
  const cols = 6, rows = 6, counts = new Array(cols * rows).fill(0);
  const sums = new Array(cols * rows).fill(0).map(() => ({ x: 0, y: 0 }));
  let skinTotal = 0;
  for (let y = 0; y < ph; y++) {
    for (let x = 0; x < pw; x++) {
      const i = (y * pw + x) * 4;
      if (!isSkinPixel(data[i], data[i + 1], data[i + 2])) continue;
      const cx = Math.min(cols - 1, Math.floor((x / pw) * cols));
      const cy = Math.min(rows - 1, Math.floor((y / ph) * rows));
      const cell = cy * cols + cx;
      counts[cell]++; sums[cell].x += x / pw; sums[cell].y += y / ph; skinTotal++;
    }
  }
  if (skinTotal < 12) return { x: 0.5, y: 0.42 };
  let best = 0;
  for (let i = 1; i < counts.length; i++) if (counts[i] > counts[best]) best = i;
  const n = counts[best];
  return {
    x: Math.min(0.92, Math.max(0.08, sums[best].x / n)),
    y: Math.min(0.92, Math.max(0.08, sums[best].y / n)),
  };
}

function autoFaceFocus(panelIndex) {
  const panel = state.panels[panelIndex];
  const photo = state.photos[panel.photo];
  if (!panel || !photo) return;
  const focus = detectFaceFocus(photo);
  panel.fx = focus.x; panel.fy = focus.y;
  renderAll();
  setStatus("Face focus set on panel " + (panelIndex + 1) + ".");
}

function autoFaceFocusAll() {
  state.panels.forEach((_, i) => autoFaceFocus(i));
  setStatus("Face focus set on all panels.");
}

/* ---------- cover renderer: draws the whole poster onto any canvas ---------- */
function drawPanelImage(ctx, panel, rect, photo) {
  const iw = photo.img.naturalWidth, ih = photo.img.naturalHeight;
  const pw = rect.w, ph = rect.h;
  const base = Math.max(pw / iw, ph / ih);
  const scale = base * panel.zoom;
  const sw = pw / scale, sh = ph / scale;
  const cx = panel.fx * iw, cy = panel.fy * ih;
  let sx = cx - sw / 2, sy = cy - sh / 2;
  sx = Math.min(Math.max(sx, 0), Math.max(0, iw - sw));
  sy = Math.min(Math.max(sy, 0), Math.max(0, ih - sh));
  ctx.save();
  ctx.filter = grade().filter;
  ctx.drawImage(photo.img, sx, sy, sw, sh, rect.x, rect.y, pw, ph);
  ctx.restore();
}

function applyColourGrade(ctx, w, h) {
  const g = grade();
  const strength = state.gradeStrength;
  if (strength <= 0) return;
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, g.overlay[0]);
  grad.addColorStop(1, g.overlay[1]);
  ctx.save();
  ctx.globalAlpha = 0.16 * strength;
  ctx.globalCompositeOperation = "overlay";
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  // Vignette: darkened corners, the poster look.
  const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(10,0,20," + (0.28 * strength) + ")");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
}

function drawPanelFrames(ctx, w, h, selectedOnly) {
  const t = template();
  const gap = Math.max(4, w * 0.006);
  ctx.save();
  ctx.lineWidth = gap;
  ctx.strokeStyle = "#12081f";
  t.panels.forEach((p, i) => {
    const r = { x: p.x * w, y: p.y * h, w: p.w * w, h: p.h * h };
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    if (!selectedOnly && i === state.selectedPanel) {
      ctx.save();
      ctx.lineWidth = Math.max(3, w * 0.004);
      ctx.strokeStyle = "#ffc93c";
      ctx.strokeRect(r.x + gap, r.y + gap, r.w - gap * 2, r.h - gap * 2);
      ctx.restore();
    }
  });
  ctx.restore();
}

function drawRoleTag(ctx, panel, rect, coverH) {
  const tag = (panel.roleCustom || panel.role || "").trim().toUpperCase();
  if (!tag) return;
  const fs = Math.max(14, rect.w * 0.055);
  ctx.save();
  ctx.font = "400 " + fs + "px Anton, sans-serif";
  const tw = ctx.measureText(tag).width;
  const pad = fs * 0.45, bw = tw + pad * 2, bh = fs * 1.5;
  const bx = rect.x + rect.w * 0.05;
  // Keep the tag clear of a bottom-placed caption and the billing strip:
  // tags on bottom-row panels go to the top of their panel instead.
  const lowPanel = state.captionPlacement === "bottom" && rect.y + rect.h > coverH * 0.82;
  const by = lowPanel ? rect.y + rect.h * 0.05 : rect.y + rect.h - bh - rect.h * 0.05;
  ctx.fillStyle = "#ffc93c";
  ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = "#12081f";
  ctx.textBaseline = "middle";
  ctx.fillText(tag, bx + pad, by + bh / 2 + fs * 0.03);
  ctx.restore();
}

function drawCaptionText(ctx, w, h) {
  const text = (state.caption || "").trim().toUpperCase();
  if (!text) return;
  let size = (state.captionSize / 96) * Math.min(w, h) * 0.115;
  const style = state.captionStyle;
  // Auto-fit: shrink the caption until it fits the cover width.
  const fitFont = style === "neon" ? "'Archivo Black', sans-serif" : "Anton, sans-serif";
  ctx.save();
  ctx.font = "400 " + size + "px " + fitFont;
  while (size > w * 0.03 && ctx.measureText(text).width > w * 0.94) {
    size *= 0.92;
    ctx.font = "400 " + size + "px " + fitFont;
  }
  ctx.restore();
  const yBase = state.captionPlacement === "top" ? h * 0.16
    : state.captionPlacement === "centre" ? h * 0.52 : h * 0.88;
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  if (style === "neon") {
    ctx.font = "400 " + size + "px 'Archivo Black', sans-serif";
    ctx.shadowColor = "#22e6ff"; ctx.shadowBlur = size * 0.35;
    ctx.fillStyle = "#eafcff";
    ctx.fillText(text, w / 2, yBase);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#ff2e88"; ctx.lineWidth = size * 0.03;
    ctx.strokeText(text, w / 2, yBase);
  } else if (style === "solid") {
    ctx.font = "400 " + size + "px Anton, sans-serif";
    const tw = ctx.measureText(text).width;
    ctx.fillStyle = "rgba(10,4,18,0.88)";
    ctx.fillRect(w / 2 - tw / 2 - size * 0.35, yBase - size * 0.62, tw + size * 0.7, size * 1.24);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(text, w / 2, yBase);
  } else {
    ctx.font = "400 " + size + "px Anton, sans-serif";
    const grad = ctx.createLinearGradient(0, yBase - size * 0.6, 0, yBase + size * 0.6);
    if (style === "gold") { grad.addColorStop(0, "#fff3b0"); grad.addColorStop(0.5, "#ffc93c"); grad.addColorStop(1, "#b45309"); }
    else if (style === "vice") { grad.addColorStop(0, "#ffd6ea"); grad.addColorStop(0.5, "#ff5da2"); grad.addColorStop(1, "#ff2e88"); }
    else { grad.addColorStop(0, "#fff7cc"); grad.addColorStop(0.45, "#ffb347"); grad.addColorStop(1, "#ff2e88"); }
    ctx.fillStyle = grad;
    ctx.strokeStyle = "#12081f";
    ctx.lineWidth = size * 0.09;
    ctx.strokeText(text, w / 2, yBase);
    ctx.fillText(text, w / 2, yBase);
    ctx.strokeStyle = "rgba(255,255,255,0.65)";
    ctx.lineWidth = size * 0.015;
    ctx.strokeText(text, w / 2, yBase);
  }
  ctx.restore();
}

function drawCalloutLabels(ctx, w, h) {
  state.callouts.forEach((c) => {
    const t = template();
    const p = t.panels[c.panel];
    if (!p) return;
    const tx = (p.x + p.w / 2) * w, ty = (p.y + p.h / 2) * h;
    const lx = c.x * w, ly = c.y * h;
    const fs = Math.max(15, w * 0.02);
    ctx.save();
    ctx.font = "400 " + fs + "px Oswald, sans-serif";
    const tw = ctx.measureText(c.text).width;
    const pad = fs * 0.6, bw = tw + pad * 2, bh = fs * 1.9;
    // Leader line from the label to the panel it points at.
    ctx.strokeStyle = "#ffc93c";
    ctx.lineWidth = Math.max(2, w * 0.002);
    ctx.beginPath();
    ctx.moveTo(lx, ly + bh / 2);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(tx, ty, Math.max(4, w * 0.005), 0, Math.PI * 2);
    ctx.fillStyle = "#ffc93c";
    ctx.fill();
    // Label chip.
    ctx.fillStyle = "rgba(18,8,31,0.92)";
    ctx.fillRect(lx - bw / 2, ly - bh / 2, bw, bh);
    ctx.strokeStyle = "#ffc93c";
    ctx.lineWidth = Math.max(1.5, w * 0.0015);
    ctx.strokeRect(lx - bw / 2, ly - bh / 2, bw, bh);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(c.text.toUpperCase(), lx, ly + fs * 0.04);
    ctx.restore();
  });
}

function drawSealStamp(ctx, w, h) {
  if (!state.sealOn) return;
  const cx = w * 0.86, cy = h * 0.16;
  const r = w * 0.075;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.18);
  ctx.strokeStyle = "#ffc93c";
  ctx.fillStyle = "rgba(18,8,31,0.55)";
  ctx.lineWidth = Math.max(2, r * 0.07);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.lineWidth = Math.max(1.5, r * 0.04);
  ctx.beginPath(); ctx.arc(0, 0, r * 0.78, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = "#ffc93c";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "400 " + (r * 0.26) + "px Anton, sans-serif";
  ctx.fillText((state.sealText || "VICE CITY").toUpperCase(), 0, -r * 0.28);
  ctx.font = "400 " + (r * 0.2) + "px Oswald, sans-serif";
  ctx.fillText("EST. 2026", 0, r * 0.05);
  // Star in the middle of the seal.
  ctx.font = (r * 0.42) + "px sans-serif";
  ctx.fillText("★", 0, r * 0.42);
  ctx.restore();
}

function drawBillingBlock(ctx, w, h) {
  if (!state.billingOn) return;
  const text = (state.billingText || "").trim().toUpperCase();
  if (!text) return;
  const bh = h * 0.055;
  ctx.save();
  ctx.fillStyle = "rgba(10,4,18,0.92)";
  ctx.fillRect(0, h - bh, w, bh);
  ctx.fillStyle = "#f6ecff";
  ctx.font = "400 " + (bh * 0.42) + "px Oswald, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const maxW = w * 0.94;
  let shown = text;
  while (ctx.measureText(shown).width > maxW && shown.length > 10) shown = shown.slice(0, -4) + "…";
  ctx.fillText(shown, w / 2, h - bh / 2);
  ctx.restore();
}

/* The one renderer everything uses: preview and every export size. */
function drawCoverArt(canvas, width, height, forExport) {
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#12081f";
  ctx.fillRect(0, 0, width, height);
  const t = template();
  t.panels.forEach((p, i) => {
    const rect = { x: p.x * width, y: p.y * height, w: p.w * width, h: p.h * height };
    const panel = state.panels[i];
    const photo = panel ? state.photos[panel.photo] : null;
    if (photo) drawPanelImage(ctx, panel, rect, photo);
    else {
      ctx.save();
      ctx.fillStyle = i % 2 ? "#2a1445" : "#1d0f30";
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.restore();
    }
  });
  applyColourGrade(ctx, width, height);
  drawPanelFrames(ctx, width, height, forExport);
  t.panels.forEach((p, i) => {
    const rect = { x: p.x * width, y: p.y * height, w: p.w * width, h: p.h * height };
    if (state.panels[i]) drawRoleTag(ctx, state.panels[i], rect, height);
  });
  drawCaptionText(ctx, width, height);
  drawCalloutLabels(ctx, width, height);
  drawSealStamp(ctx, width, height);
  drawBillingBlock(ctx, width, height);
  return ctx;
}

function renderPreview() {
  const size = exportSize();
  drawCoverArt(previewCanvas, size.w, size.h, false);
}

/* ---------- export ---------- */
function renderExportCanvas(sizeLabel) {
  const size = EXPORT_SIZES.find((s) => s.label === sizeLabel) || EXPORT_SIZES[0];
  const canvas = document.createElement("canvas");
  drawCoverArt(canvas, size.w, size.h, true);
  return canvas;
}

function exportCoverPNG(sizeLabel) {
  return new Promise((resolve, reject) => {
    const canvas = renderExportCanvas(sizeLabel);
    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error("Export failed")); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "neon-vice-cover-" + sizeLabel + ".png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setStatus("Exported " + sizeLabel + " PNG.");
      resolve(blob);
    }, "image/png");
  });
}

async function exportAllSizes() {
  for (const size of EXPORT_SIZES) {
    await exportCoverPNG(size.label);
    await new Promise((r) => setTimeout(r, 250));
  }
  setStatus("Exported all 3 sizes: 1080×1080, 1080×1350, 1920×1080.");
}

function setStatus(msg) {
  const el = document.getElementById("exportStatus");
  if (el) el.textContent = msg;
}

/* ---------- editor UI ---------- */
function renderTemplateGrid() {
  const grid = document.getElementById("templateGrid");
  grid.innerHTML = "";
  TEMPLATES.forEach((t) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "template-btn" + (t.id === state.templateId ? " active" : "");
    const thumb = document.createElement("span");
    thumb.className = "thumb";
    thumb.style.gridTemplateColumns = "repeat(" + (t.id === "trio-strip" ? 3 : 2) + ", 1fr)";
    t.panels.forEach((p) => {
      const cell = document.createElement("i");
      cell.style.gridColumn = "span 1";
      thumb.appendChild(cell);
    });
    btn.appendChild(thumb);
    btn.appendChild(document.createTextNode(t.name + " · " + t.panels.length + " panels"));
    btn.addEventListener("click", () => {
      state.templateId = t.id;
      resetPanels();
      renderAll();
    });
    grid.appendChild(btn);
  });
  document.getElementById("panelCountLabel").textContent = template().panels.length + " panels";
}

function renderGradeGrid() {
  const grid = document.getElementById("gradeGrid");
  grid.innerHTML = "";
  GRADES.forEach((g) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "grade-btn" + (g.id === state.gradeId ? " active" : "");
    const sw = document.createElement("span");
    sw.className = "swatch";
    sw.style.background = g.swatch;
    btn.appendChild(sw);
    btn.appendChild(document.createTextNode(g.name));
    btn.addEventListener("click", () => { state.gradeId = g.id; renderAll(); });
    grid.appendChild(btn);
  });
}

function renderPhotoLibrary() {
  const lib = document.getElementById("photoLibrary");
  lib.innerHTML = "";
  state.photos.forEach((photo, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "photo-thumb";
    const img = document.createElement("img");
    img.src = photo.src;
    img.alt = photo.name;
    const label = document.createElement("span");
    label.textContent = photo.name;
    btn.appendChild(img);
    btn.appendChild(label);
    btn.addEventListener("click", () => {
      const panel = state.panels[state.selectedPanel];
      if (panel) { panel.photo = i; renderAll(); }
    });
    lib.appendChild(btn);
  });
}

function renderPanelControls() {
  const list = document.getElementById("panelList");
  list.innerHTML = "";
  const select = document.getElementById("panelPhoto");
  select.innerHTML = "";
  state.photos.forEach((photo, i) => {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = (i + 1) + " · " + photo.name;
    select.appendChild(opt);
  });
  const calloutSelect = document.getElementById("calloutPanel");
  calloutSelect.innerHTML = "";
  template().panels.forEach((_, i) => {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = "Panel " + (i + 1);
    calloutSelect.appendChild(opt);
  });
  template().panels.forEach((_, i) => {
    const panel = state.panels[i];
    const row = document.createElement("div");
    row.className = "panel-row" + (i === state.selectedPanel ? " active" : "");
    const dot = document.createElement("span");
    dot.className = "dot";
    const label = document.createElement("span");
    const photoName = panel && state.photos[panel.photo] ? state.photos[panel.photo].name : "empty";
    label.textContent = "Panel " + (i + 1) + " — " + photoName + " · zoom " + Math.round((panel ? panel.zoom : 1) * 100) + "%";
    row.appendChild(dot);
    row.appendChild(label);
    const tag = panel ? (panel.roleCustom || panel.role || "") : "";
    if (tag) {
      const badge = document.createElement("span");
      badge.className = "role-badge";
      badge.textContent = tag.toUpperCase();
      row.appendChild(badge);
    }
    row.addEventListener("click", () => { state.selectedPanel = i; renderAll(); });
    list.appendChild(row);
  });
  const panel = state.panels[state.selectedPanel];
  document.getElementById("selectedPanelLabel").textContent = String(state.selectedPanel + 1);
  if (panel) {
    select.value = String(panel.photo);
    document.getElementById("panelZoom").value = String(Math.round(panel.zoom * 100));
    document.getElementById("panelRole").value = panel.role || "";
    document.getElementById("panelRoleCustom").value = panel.roleCustom || "";
  }
}

function renderCalloutList() {
  const list = document.getElementById("calloutList");
  list.innerHTML = "";
  state.callouts.forEach((c, idx) => {
    const row = document.createElement("div");
    row.className = "callout-row";
    const label = document.createElement("span");
    label.textContent = c.text + " → P" + (c.panel + 1);
    const xSlider = document.createElement("input");
    xSlider.type = "range"; xSlider.min = "5"; xSlider.max = "95"; xSlider.value = String(Math.round(c.x * 100));
    xSlider.setAttribute("aria-label", "Callout horizontal position");
    xSlider.addEventListener("input", () => { c.x = Number(xSlider.value) / 100; renderPreview(); });
    const ySlider = document.createElement("input");
    ySlider.type = "range"; ySlider.min = "5"; ySlider.max = "95"; ySlider.value = String(Math.round(c.y * 100));
    ySlider.setAttribute("aria-label", "Callout vertical position");
    ySlider.addEventListener("input", () => { c.y = Number(ySlider.value) / 100; renderPreview(); });
    const del = document.createElement("button");
    del.type = "button"; del.className = "del"; del.textContent = "×";
    del.setAttribute("aria-label", "Remove callout");
    del.addEventListener("click", () => { state.callouts.splice(idx, 1); renderAll(); });
    row.appendChild(label);
    row.appendChild(xSlider);
    row.appendChild(ySlider);
    row.appendChild(del);
    list.appendChild(row);
  });
}

function renderAll() {
  renderTemplateGrid();
  renderGradeGrid();
  renderPanelControls();
  renderCalloutList();
  renderPreview();
}

/* ---------- preview interaction: drag the focus point ---------- */
let draggingFocus = false;

function previewPoint(evt) {
  const rect = previewCanvas.getBoundingClientRect();
  return {
    x: (evt.clientX - rect.left) / rect.width,
    y: (evt.clientY - rect.top) / rect.height,
  };
}

function panelAtPoint(pt) {
  const t = template();
  for (let i = 0; i < t.panels.length; i++) {
    const p = t.panels[i];
    if (pt.x >= p.x && pt.x <= p.x + p.w && pt.y >= p.y && pt.y <= p.y + p.h) return i;
  }
  return -1;
}

/* Convert a point inside a panel (fractions of the panel) into a focus
   point in photo fractions, using the same crop math as drawPanelImage,
   so dragging the preview moves the crop exactly where the user points. */
function focusFromPanelPoint(panel, photo, rect, px, py) {
  const iw = photo.img.naturalWidth, ih = photo.img.naturalHeight;
  const base = Math.max(rect.w / iw, rect.h / ih);
  const scale = base * panel.zoom;
  const sw = rect.w / scale, sh = rect.h / scale;
  let sx = panel.fx * iw - sw / 2, sy = panel.fy * ih - sh / 2;
  sx = Math.min(Math.max(sx, 0), Math.max(0, iw - sw));
  sy = Math.min(Math.max(sy, 0), Math.max(0, ih - sh));
  return {
    x: Math.min(0.95, Math.max(0.05, (sx + px * sw) / iw)),
    y: Math.min(0.95, Math.max(0.05, (sy + py * sh) / ih)),
  };
}

previewCanvas.addEventListener("pointerdown", (evt) => {
  const pt = previewPoint(evt);
  const idx = panelAtPoint(pt);
  if (idx < 0) return;
  state.selectedPanel = idx;
  const panel = state.panels[idx];
  const photo = panel ? state.photos[panel.photo] : null;
  if (panel && photo) {
    const p = template().panels[idx];
    const rect = { x: p.x * previewCanvas.width, y: p.y * previewCanvas.height, w: p.w * previewCanvas.width, h: p.h * previewCanvas.height };
    const focus = focusFromPanelPoint(panel, photo, rect, (pt.x - p.x) / p.w, (pt.y - p.y) / p.h);
    panel.fx = focus.x; panel.fy = focus.y;
    draggingFocus = true;
    previewCanvas.setPointerCapture(evt.pointerId);
  }
  renderAll();
});

previewCanvas.addEventListener("pointermove", (evt) => {
  if (!draggingFocus) return;
  const pt = previewPoint(evt);
  const idx = state.selectedPanel;
  const p = template().panels[idx];
  const panel = state.panels[idx];
  const photo = panel ? state.photos[panel.photo] : null;
  if (!p || !panel || !photo) return;
  const rect = { x: p.x * previewCanvas.width, y: p.y * previewCanvas.height, w: p.w * previewCanvas.width, h: p.h * previewCanvas.height };
  const focus = focusFromPanelPoint(panel, photo, rect, (pt.x - p.x) / p.w, (pt.y - p.y) / p.h);
  panel.fx = focus.x; panel.fy = focus.y;
  renderPreview();
});

previewCanvas.addEventListener("pointerup", () => { draggingFocus = false; });

/* ---------- wire up controls ---------- */
document.getElementById("photoUpload").addEventListener("change", (evt) => {
  Array.from(evt.target.files || []).forEach(loadPhotoFile);
  evt.target.value = "";
});
document.getElementById("btnSampleBoulevard").addEventListener("click", async () => {
  const res = await fetch("samples/boulevard.jpg");
  const blob = await res.blob();
  await addPhoto("Boulevard (sample)", URL.createObjectURL(blob));
  resetPanels(); renderAll();
});
document.getElementById("btnSamplePier").addEventListener("click", async () => {
  const res = await fetch("samples/pier.jpg");
  const blob = await res.blob();
  await addPhoto("Pier (sample)", URL.createObjectURL(blob));
  resetPanels(); renderAll();
});
document.getElementById("panelPhoto").addEventListener("change", (evt) => {
  const panel = state.panels[state.selectedPanel];
  if (panel) { panel.photo = Number(evt.target.value); renderAll(); }
});
document.getElementById("panelZoom").addEventListener("input", (evt) => {
  const panel = state.panels[state.selectedPanel];
  if (panel) { panel.zoom = Number(evt.target.value) / 100; renderPreview(); renderPanelControls(); }
});
document.getElementById("panelRole").addEventListener("change", (evt) => {
  const panel = state.panels[state.selectedPanel];
  if (panel) { panel.role = evt.target.value; renderAll(); }
});
document.getElementById("panelRoleCustom").addEventListener("input", (evt) => {
  const panel = state.panels[state.selectedPanel];
  if (panel) { panel.roleCustom = evt.target.value; renderPreview(); renderPanelControls(); }
});
document.getElementById("btnAutoFace").addEventListener("click", () => autoFaceFocus(state.selectedPanel));
document.getElementById("btnAutoFaceAll").addEventListener("click", autoFaceFocusAll);
document.getElementById("gradeStrength").addEventListener("input", (evt) => {
  state.gradeStrength = Number(evt.target.value) / 100;
  renderPreview();
});
document.getElementById("captionText").addEventListener("input", (evt) => {
  state.caption = evt.target.value;
  renderPreview();
});
document.getElementById("captionSize").addEventListener("input", (evt) => {
  state.captionSize = Number(evt.target.value);
  renderPreview();
});
document.getElementById("captionStyle").addEventListener("change", (evt) => {
  state.captionStyle = evt.target.value;
  renderPreview();
});
document.getElementById("captionPlacement").addEventListener("change", (evt) => {
  state.captionPlacement = evt.target.value;
  renderPreview();
});
document.getElementById("btnAddCallout").addEventListener("click", () => {
  const text = document.getElementById("calloutText").value.trim();
  if (!text) { setStatus("Type a callout label first."); return; }
  state.callouts.push({
    text,
    panel: Number(document.getElementById("calloutPanel").value || 0),
    x: 0.5, y: 0.12,
  });
  document.getElementById("calloutText").value = "";
  renderAll();
});
document.getElementById("sealToggle").addEventListener("change", (evt) => {
  state.sealOn = evt.target.checked;
  renderPreview();
});
document.getElementById("sealText").addEventListener("input", (evt) => {
  state.sealText = evt.target.value;
  renderPreview();
});
document.getElementById("billingToggle").addEventListener("change", (evt) => {
  state.billingOn = evt.target.checked;
  renderPreview();
});
document.getElementById("billingText").addEventListener("input", (evt) => {
  state.billingText = evt.target.value;
  renderPreview();
});
document.querySelectorAll(".btn.export").forEach((btn) => {
  btn.addEventListener("click", () => {
    state.exportSize = btn.dataset.size;
    document.querySelectorAll(".btn.export").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    renderPreview();
    exportCoverPNG(btn.dataset.size).catch(() => setStatus("Export failed."));
  });
});
document.getElementById("btnExportAll").addEventListener("click", () => {
  exportAllSizes().catch(() => setStatus("Export failed."));
});

/* ---------- boot + automation hook for screenshots / tests ---------- */
window.coverStudio = {
  state,
  TEMPLATES,
  GRADES,
  renderPreview,
  autoFaceFocus,
  autoFaceFocusAll,
  detectFaceFocus,
  setTemplate(id) { state.templateId = id; resetPanels(); renderAll(); },
  setGrade(id) { state.gradeId = id; renderAll(); },
  addCallout(text, panel, x, y) { state.callouts.push({ text, panel, x, y }); renderAll(); },
  exportDataURL(sizeLabel) {
    return new Promise((resolve, reject) => {
      const canvas = renderExportCanvas(sizeLabel);
      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error("Export failed")); return; }
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Export read failed"));
        reader.readAsDataURL(blob);
      }, "image/png");
    });
  },
};

resetPanels();
renderAll();
loadSamplePhotos();
