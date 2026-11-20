/* Neon Vice Cover Studio — GTA 6-style multi-panel cover art maker.
   Single-file app: layouts, grades, face-aware crops, role tags,
   callouts, seal, billing block, caption styles and 3-size PNG export.
   Everything runs offline from files under app/; photos are read on the
   user's own machine and never uploaded anywhere. */

"use strict";

/* ------------------------------------------------------------------ */
/* Layout templates — 8 arrangements, 2 to 8 panels.                  */
/* A cell is [x, y, width, height] in fractions of the cover.         */
/* ------------------------------------------------------------------ */

const LAYOUTS = [
  {
    id: "duo", name: "Duo Split", panels: 2,
    cells: [[0, 0, 0.5, 1], [0.5, 0, 0.5, 1]],
  },
  {
    id: "trio", name: "Trio Strip", panels: 3,
    cells: [[0, 0, 1 / 3, 1], [1 / 3, 0, 1 / 3, 1], [2 / 3, 0, 1 / 3, 1]],
  },
  {
    id: "quad", name: "Quad Grid", panels: 4,
    cells: [[0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5], [0, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]],
  },
  {
    id: "five", name: "Hero Five", panels: 5,
    cells: [
      [0, 0, 0.5, 1],
      [0.5, 0, 0.25, 0.5], [0.75, 0, 0.25, 0.5],
      [0.5, 0.5, 0.25, 0.5], [0.75, 0.5, 0.25, 0.5],
    ],
  },
  {
    id: "six", name: "Six Stack", panels: 6,
    cells: [
      [0, 0, 1 / 3, 0.5], [1 / 3, 0, 1 / 3, 0.5], [2 / 3, 0, 1 / 3, 0.5],
      [0, 0.5, 1 / 3, 0.5], [1 / 3, 0.5, 1 / 3, 0.5], [2 / 3, 0.5, 1 / 3, 0.5],
    ],
  },
  {
    id: "seven", name: "Seven Strip", panels: 7,
    cells: [
      [0, 0, 1, 0.5],
      [0, 0.5, 1 / 3, 0.25], [1 / 3, 0.5, 1 / 3, 0.25], [2 / 3, 0.5, 1 / 3, 0.25],
      [0, 0.75, 1 / 3, 0.25], [1 / 3, 0.75, 1 / 3, 0.25], [2 / 3, 0.75, 1 / 3, 0.25],
    ],
  },
  {
    id: "mosaic", name: "Mosaic 8", panels: 8,
    cells: [
      [0, 0, 0.42, 1],
      [0.42, 0, 0.1933, 0.34], [0.6133, 0, 0.1933, 0.34], [0.8067, 0, 0.1933, 0.34],
      [0.42, 0.34, 0.29, 0.33], [0.71, 0.34, 0.29, 0.33],
      [0.42, 0.67, 0.29, 0.33], [0.71, 0.67, 0.29, 0.33],
    ],
  },
  {
    id: "octo", name: "Octo Grid", panels: 8,
    cells: [
      [0, 0, 0.25, 0.5], [0.25, 0, 0.25, 0.5], [0.5, 0, 0.25, 0.5], [0.75, 0, 0.25, 0.5],
      [0, 0.5, 0.25, 0.5], [0.25, 0.5, 0.25, 0.5], [0.5, 0.5, 0.25, 0.5], [0.75, 0.5, 0.25, 0.5],
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Colour grades — 8 looks. Each grade is a canvas filter plus a      */
/* diagonal two-colour wash painted over the photo at the slider's    */
/* strength. Sunset and Neon are the flagships.                       */
/* ------------------------------------------------------------------ */

const GRADES = [
  { id: "sunset", name: "Sunset", filter: "saturate(1.55) contrast(1.12) brightness(1.06) sepia(0.22)", wash: ["#ff7a18", "#ff2d78"], swatch: "linear-gradient(135deg,#ff7a18,#ff2d78)" },
  { id: "neon", name: "Neon", filter: "saturate(1.9) contrast(1.16) brightness(1.08) hue-rotate(-8deg)", wash: ["#00e5ff", "#ff00c8"], swatch: "linear-gradient(135deg,#00e5ff,#ff00c8)" },
  { id: "dusk", name: "Dusk Purple", filter: "saturate(1.45) contrast(1.16) brightness(0.94) hue-rotate(28deg)", wash: ["#7b2fff", "#ff5e8a"], swatch: "linear-gradient(135deg,#7b2fff,#ff5e8a)" },
  { id: "teal", name: "Teal Noir", filter: "saturate(1.3) contrast(1.22) brightness(0.92) sepia(0.08)", wash: ["#00b8a9", "#0b2a4a"], swatch: "linear-gradient(135deg,#00b8a9,#0b2a4a)" },
  { id: "gold", name: "Gold Hour", filter: "saturate(1.5) contrast(1.08) brightness(1.1) sepia(0.45)", wash: ["#ffd76a", "#b8860b"], swatch: "linear-gradient(135deg,#ffd76a,#b8860b)" },
  { id: "vicepink", name: "Vice Pink", filter: "saturate(1.85) contrast(1.1) brightness(1.06)", wash: ["#ff7ad9", "#ff2e88"], swatch: "linear-gradient(135deg,#ff7ad9,#ff2e88)" },
  { id: "mono", name: "Mono Noir", filter: "grayscale(1) contrast(1.28) brightness(1.02)", wash: ["#ffffff", "#111111"], swatch: "linear-gradient(135deg,#ffffff,#111111)" },
  { id: "tropical", name: "Tropical", filter: "saturate(1.7) contrast(1.08) brightness(1.07)", wash: ["#2ee6a8", "#ff9f1c"], swatch: "linear-gradient(135deg,#2ee6a8,#ff9f1c)" },
];

/* ------------------------------------------------------------------ */
/* Caption styles — 5 lettering treatments for the cover caption.     */
/* ------------------------------------------------------------------ */

const CAPTION_STYLES = {
  sunset: { font: "Anton", fill: null, fillGradient: ["#ffd76a", "#ff7a18", "#ff2d78"], stroke: "#1a0b2e", strokeWidth: 0.16, shadow: "rgba(0,0,0,0.45)", glow: 0 },
  neon: { font: "Anton", fill: "#ffffff", fillGradient: null, stroke: "#00e5ff", strokeWidth: 0.06, shadow: "#ff00c8", glow: 34 },
  solid: { font: "Archivo Black", fill: "#ffffff", fillGradient: null, stroke: "#111111", strokeWidth: 0.02, shadow: "rgba(0,0,0,0.5)", glow: 0, block: true },
  gold: { font: "Anton", fill: null, fillGradient: ["#fff3b0", "#ffc44d", "#b8860b"], stroke: "#241505", strokeWidth: 0.1, shadow: "rgba(0,0,0,0.5)", glow: 0 },
  vicepink: { font: "Anton", fill: "#ff7ad9", fillGradient: null, stroke: "#ffffff", strokeWidth: 0.12, shadow: "rgba(255,45,120,0.8)", glow: 18 },
};

/* Role tag colours — one accent per cast role. */
const ROLE_COLORS = {
  LEAD: "#ff2d78", CREW: "#00e5ff", RIVAL: "#ff5c5c", DRIVER: "#ffc44d",
  LOOKOUT: "#2ee6a8", ENFORCER: "#8b5cf6", FIXER: "#ff9f1c", WHEELMAN: "#7bd7ff",
};

/* Export sizes: the three common post sizes. */
const EXPORT_SIZES = {
  square: { width: 1080, height: 1080, label: "1080x1080" },
  portrait: { width: 1080, height: 1350, label: "1080x1350" },
  landscape: { width: 1920, height: 1080, label: "1920x1080" },
};

const SAMPLE_PHOTOS = {
  boulevard: "samples/boulevard.jpg",
  pier: "samples/pier.jpg",
};

/* ------------------------------------------------------------------ */
/* State                                                              */
/* ------------------------------------------------------------------ */

function makePanel() {
  return {
    image: null,        // HTMLImageElement once loaded
    srcKind: "empty",   // "empty" | "sample-boulevard" | "sample-pier" | "upload"
    focusX: 0.5,        // 0..1 across the photo
    focusY: 0.42,       // 0..1 down the photo
    zoom: 1.2,          // 1..3 crop zoom
    role: "LEAD",       // "" = no tag
    customRole: "",
  };
}

const state = {
  layoutId: "mosaic",
  gradeId: "neon",
  gradeStrength: 0.7,
  caption: "VICE CITY",
  captionStyle: "neon",
  previewSize: "landscape",
  selectedPanel: 0,
  panels: Array.from({ length: 8 }, () => makePanel()),
  callouts: [
    { text: "THE HEIST BEGINS", pos: 0.32 },
    { text: "OCEAN DRIVE, 2AM", pos: 0.62 },
    { text: "", pos: 0.85 },
  ],
  sealText: "VICE CITY",
  billingText: "STARRING LUCIA & JASON \u00b7 A LEONIDA STORY \u00b7 NEON VICE PICTURES",
};

/* ------------------------------------------------------------------ */
/* DOM helpers                                                        */
/* ------------------------------------------------------------------ */

const $ = (id) => document.getElementById(id);
const canvas = $("coverCanvas");
const ctx = canvas.getContext("2d");

function layoutOf() {
  return LAYOUTS.find((l) => l.id === state.layoutId) || LAYOUTS[0];
}

function gradeOf() {
  return GRADES.find((g) => g.id === state.gradeId) || GRADES[0];
}

function panelCount() {
  return layoutOf().panels;
}

function selectedPanelState() {
  return state.panels[state.selectedPanel];
}

function roleLabel(panel) {
  if (!panel.role) return "";
  if (panel.role === "CUSTOM") return panel.customRole.trim().toUpperCase();
  return panel.role;
}

/* Panel rectangle in cover pixels, with a thin gutter between panels. */
function panelRect(layout, index, width, height) {
  const cell = layout.cells[index];
  const gutter = Math.max(4, Math.round(Math.min(width, height) * 0.008));
  const x = cell[0] * width + gutter / 2;
  const y = cell[1] * height + gutter / 2;
  const w = cell[2] * width - gutter;
  const h = cell[3] * height - gutter;
  return { x, y, w, h };
}

/* ------------------------------------------------------------------ */
/* Photo loading                                                      */
/* ------------------------------------------------------------------ */

function loadImageFromUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image: " + url));
    img.src = url;
  });
}

async function loadSampleIntoPanel(panelIndex, sampleKey) {
  const panel = state.panels[panelIndex];
  const img = await loadImageFromUrl(SAMPLE_PHOTOS[sampleKey]);
  panel.image = img;
  panel.srcKind = "sample-" + sampleKey;
  renderPreview();
  return panel;
}

async function loadUploadIntoPanel(panelIndex, file) {
  const panel = state.panels[panelIndex];
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImageFromUrl(url);
    panel.image = img;
    panel.srcKind = "upload";
  } finally {
    URL.revokeObjectURL(url);
  }
  renderPreview();
  return panel;
}

async function fillPanelsWithSample(sampleKey) {
  const n = panelCount();
  for (let i = 0; i < n; i++) {
    await loadSampleIntoPanel(i, sampleKey);
  }
}

async function alternateBothSamples() {
  const n = panelCount();
  for (let i = 0; i < n; i++) {
    await loadSampleIntoPanel(i, i % 2 === 0 ? "boulevard" : "pier");
  }
}

/* ------------------------------------------------------------------ */
/* Face-aware focus: skin-tone scan.                                  */
/* Draws the photo small, samples its pixels, finds the densest 6x6   */
/* cell of skin-tone pixels and centres the crop on it. Falls back    */
/* to the panel centre when no skin is found.                         */
/* ------------------------------------------------------------------ */

function isSkinPixel(r, g, b) {
  if (r < 95 || g < 40 || b < 20) return false;
  if (r <= g || r <= b) return false;
  if (r - g < 15 || r - b < 15) return false;
  const spread = Math.max(r, g, b) - Math.min(r, g, b);
  return spread > 15;
}

function detectFaceFocus(panel) {
  if (!panel.image) return false;
  const probe = document.createElement("canvas");
  const size = 48;
  probe.width = size;
  probe.height = size;
  const pctx = probe.getContext("2d", { willReadFrequently: true });
  pctx.drawImage(panel.image, 0, 0, size, size);
  let data;
  try {
    data = pctx.getImageData(0, 0, size, size).data;
  } catch (err) {
    return false;
  }
  const cells = 6;
  const cellSize = size / cells;
  const counts = new Array(cells * cells).fill(0);
  let totalSkin = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      if (isSkinPixel(data[i], data[i + 1], data[i + 2])) {
        totalSkin++;
        const cx = Math.min(cells - 1, Math.floor(x / cellSize));
        const cy = Math.min(cells - 1, Math.floor(y / cellSize));
        counts[cy * cells + cx]++;
      }
    }
  }
  if (totalSkin < 8) return false; // No face-like region: keep centre.
  let best = 0;
  for (let i = 1; i < counts.length; i++) {
    if (counts[i] > counts[best]) best = i;
  }
  const bestX = best % cells;
  const bestY = Math.floor(best / cells);
  panel.focusX = (bestX + 0.5) / cells;
  panel.focusY = (bestY + 0.5) / cells;
  return true;
}

function autoFacePanel(panelIndex) {
  const panel = state.panels[panelIndex];
  const found = detectFaceFocus(panel);
  syncPanelControls();
  renderPreview();
  return found;
}

function autoFaceAllPanels() {
  let found = 0;
  for (let i = 0; i < panelCount(); i++) {
    if (detectFaceFocus(state.panels[i])) found++;
  }
  syncPanelControls();
  renderPreview();
  return found;
}

/* ------------------------------------------------------------------ */
/* Cover drawing — one function draws the cover at any size, so the   */
/* preview and every export are the same picture.                     */
/* ------------------------------------------------------------------ */

function drawPanelPhoto(targetCtx, panel, rect, grade) {
  targetCtx.save();
  targetCtx.beginPath();
  targetCtx.rect(rect.x, rect.y, rect.w, rect.h);
  targetCtx.clip();

  if (!panel.image) {
    // Empty panel: deep violet placeholder with a panel number.
    const grad = targetCtx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
    grad.addColorStop(0, "#241a3d");
    grad.addColorStop(1, "#120a24");
    targetCtx.fillStyle = grad;
    targetCtx.fillRect(rect.x, rect.y, rect.w, rect.h);
    targetCtx.fillStyle = "rgba(244,236,255,0.35)";
    targetCtx.font = "600 " + Math.round(rect.h * 0.09) + "px Oswald, sans-serif";
    targetCtx.textAlign = "center";
    targetCtx.textBaseline = "middle";
    targetCtx.fillText("ADD A PHOTO", rect.x + rect.w / 2, rect.y + rect.h / 2);
    targetCtx.restore();
    return;
  }

  // Cover-fit crop centred on the focus point, at the panel's zoom.
  const img = panel.image;
  const zoom = panel.zoom || 1;
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * zoom;
  const shownW = rect.w / scale;
  const shownH = rect.h / scale;
  let srcX = panel.focusX * img.naturalWidth - shownW / 2;
  let srcY = panel.focusY * img.naturalHeight - shownH / 2;
  srcX = Math.max(0, Math.min(img.naturalWidth - shownW, srcX));
  srcY = Math.max(0, Math.min(img.naturalHeight - shownH, srcY));

  targetCtx.filter = grade.filter;
  targetCtx.drawImage(img, srcX, srcY, shownW, shownH, rect.x, rect.y, rect.w, rect.h);
  targetCtx.filter = "none";

  drawGradeWash(targetCtx, rect, grade);
  targetCtx.restore();
}

function drawGradeWash(targetCtx, rect, grade) {
  const strength = state.gradeStrength;
  if (strength <= 0) return;
  const wash = targetCtx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  wash.addColorStop(0, grade.wash[0]);
  wash.addColorStop(1, grade.wash[1]);
  targetCtx.save();
  targetCtx.globalAlpha = strength * 0.28;
  targetCtx.globalCompositeOperation = "overlay";
  targetCtx.fillStyle = wash;
  targetCtx.fillRect(rect.x, rect.y, rect.w, rect.h);
  targetCtx.globalAlpha = strength * 0.1;
  targetCtx.globalCompositeOperation = "soft-light";
  targetCtx.fillRect(rect.x, rect.y, rect.w, rect.h);
  targetCtx.restore();
}

function drawRoleTag(targetCtx, panel, rect) {
  const label = roleLabel(panel);
  if (!label) return;
  const color = ROLE_COLORS[panel.role] || "#ff2d78";
  const pad = Math.max(8, Math.round(rect.w * 0.03));
  const fontSize = Math.max(13, Math.round(Math.min(rect.w, rect.h) * 0.085));
  targetCtx.save();
  targetCtx.font = "400 " + fontSize + "px 'Archivo Black', sans-serif";
  const textW = targetCtx.measureText(label).width;
  const tagW = textW + pad * 2;
  const tagH = fontSize + pad * 1.1;
  // Top-left corner of the panel: clear of the caption and billing below.
  const tx = rect.x + Math.max(6, rect.w * 0.04);
  const ty = rect.y + Math.max(6, rect.h * 0.045);
  targetCtx.fillStyle = "rgba(8,4,18,0.82)";
  roundRect(targetCtx, tx, ty, tagW, tagH, tagH / 2);
  targetCtx.fill();
  targetCtx.fillStyle = color;
  targetCtx.beginPath();
  targetCtx.arc(tx + tagH / 2, ty + tagH / 2, fontSize * 0.28, 0, Math.PI * 2);
  targetCtx.fill();
  targetCtx.fillStyle = "#ffffff";
  targetCtx.textAlign = "left";
  targetCtx.textBaseline = "middle";
  targetCtx.fillText(label, tx + pad + fontSize * 0.45, ty + tagH / 2 + 1);
  targetCtx.restore();
}

function roundRect(targetCtx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  targetCtx.beginPath();
  targetCtx.moveTo(x + radius, y);
  targetCtx.arcTo(x + w, y, x + w, y + h, radius);
  targetCtx.arcTo(x + w, y + h, x, y + h, radius);
  targetCtx.arcTo(x, y + h, x, y, radius);
  targetCtx.arcTo(x, y, x + w, y, radius);
  targetCtx.closePath();
}

/* Auto-fit caption: shrink the lettering until it fits the cover. */
function fitCaptionFont(targetCtx, text, style, width, startSize) {
  let size = startSize;
  targetCtx.font = size + "px '" + style.font + "', sans-serif";
  const maxWidth = width * 0.94;
  while (size > 18 && targetCtx.measureText(text).width > maxWidth) {
    size = Math.floor(size * 0.94);
    targetCtx.font = size + "px '" + style.font + "', sans-serif";
  }
  return size;
}

function drawCaption(targetCtx, width, height) {
  const text = (state.caption || "").trim().toUpperCase();
  if (!text) return;
  const style = CAPTION_STYLES[state.captionStyle] || CAPTION_STYLES.neon;
  const bandY = height * 0.79;
  // Capped at 11% of the cover height so the lettering (and its glow and
  // scrim) never reaches the role tags on the bottom-row panels, whose
  // tags end near 0.73H.
  const startSize = Math.round(Math.min(width * 0.11, height * 0.11));
  const size = fitCaptionFont(targetCtx, text, style, width, startSize);
  const fontPx = size + "px '" + style.font + "', sans-serif";
  targetCtx.save();
  targetCtx.font = fontPx;
  targetCtx.textAlign = "center";
  targetCtx.textBaseline = "middle";
  targetCtx.lineJoin = "round";
  targetCtx.miterLimit = 2;

  // Soft dark scrim behind the lettering so it stays legible over bright
  // panels. The solid-block style already paints its own block, so it skips this.
  if (!style.block) {
    const scrim = targetCtx.createLinearGradient(0, bandY - size * 0.7, 0, bandY + size * 0.7);
    scrim.addColorStop(0, "rgba(5,2,12,0)");
    scrim.addColorStop(0.5, "rgba(5,2,12,0.42)");
    scrim.addColorStop(1, "rgba(5,2,12,0)");
    targetCtx.fillStyle = scrim;
    targetCtx.fillRect(0, bandY - size * 0.7, width, size * 1.4);
  }

  if (style.block) {
    const textW = targetCtx.measureText(text).width;
    const padX = size * 0.35;
    const padY = size * 0.22;
    targetCtx.fillStyle = "rgba(8,4,18,0.88)";
    roundRect(targetCtx, width / 2 - textW / 2 - padX, bandY - size / 2 - padY, textW + padX * 2, size + padY * 2, 6);
    targetCtx.fill();
  }

  if (style.glow > 0) {
    targetCtx.shadowColor = style.shadow;
    targetCtx.shadowBlur = (style.glow * width) / 1920;
  } else {
    targetCtx.shadowColor = style.shadow;
    targetCtx.shadowBlur = Math.round(width * 0.006);
    targetCtx.shadowOffsetY = Math.round(width * 0.003);
  }

  if (style.fillGradient) {
    const grad = targetCtx.createLinearGradient(0, bandY - size / 2, 0, bandY + size / 2);
    grad.addColorStop(0, style.fillGradient[0]);
    grad.addColorStop(0.5, style.fillGradient[1]);
    grad.addColorStop(1, style.fillGradient[style.fillGradient.length - 1]);
    targetCtx.fillStyle = grad;
  } else {
    targetCtx.fillStyle = style.fill;
  }

  const strokeW = Math.max(1, Math.round(size * style.strokeWidth));
  if (strokeW > 0) {
    targetCtx.strokeStyle = style.stroke;
    targetCtx.lineWidth = strokeW;
    targetCtx.strokeText(text, width / 2, bandY);
  }
  targetCtx.fillText(text, width / 2, bandY);
  targetCtx.restore();
}

function drawCalloutLabels(targetCtx, width, height) {
  const active = state.callouts.filter((c) => c.text.trim() !== "");
  if (active.length === 0) return;
  const labelH = Math.max(30, Math.round(height * 0.045));
  const fontSize = Math.max(14, Math.round(labelH * 0.42));
  targetCtx.save();
  targetCtx.font = "600 " + fontSize + "px Oswald, sans-serif";
  targetCtx.textAlign = "left";
  targetCtx.textBaseline = "middle";
  active.forEach((callout, i) => {
    const label = callout.text.trim().toUpperCase();
    const anchorX = callout.pos * width;
    const labelY = height * 0.055 + i * (labelH + 8);
    const textW = targetCtx.measureText(label).width;
    const padX = Math.round(labelH * 0.45);
    let boxX = anchorX - textW / 2 - padX;
    boxX = Math.max(6, Math.min(width - textW - padX * 2 - 6, boxX));
    // Leader line: from the label down to the poster's top edge.
    targetCtx.strokeStyle = "rgba(255,255,255,0.9)";
    targetCtx.lineWidth = Math.max(1.5, width * 0.0012);
    targetCtx.beginPath();
    targetCtx.moveTo(boxX + textW / 2 + padX, labelY + labelH / 2);
    targetCtx.lineTo(anchorX, height * 0.16);
    targetCtx.stroke();
    targetCtx.fillStyle = "#ff2d78";
    targetCtx.beginPath();
    targetCtx.arc(anchorX, height * 0.16, Math.max(4, width * 0.003), 0, Math.PI * 2);
    targetCtx.fill();
    // Label chip.
    targetCtx.fillStyle = "rgba(8,4,18,0.85)";
    roundRect(targetCtx, boxX, labelY, textW + padX * 2, labelH, labelH / 2);
    targetCtx.fill();
    targetCtx.strokeStyle = "#00e5ff";
    targetCtx.lineWidth = 1.5;
    roundRect(targetCtx, boxX, labelY, textW + padX * 2, labelH, labelH / 2);
    targetCtx.stroke();
    targetCtx.fillStyle = "#ffffff";
    targetCtx.fillText(label, boxX + padX, labelY + labelH / 2 + 1);
  });
  targetCtx.restore();
}

function drawViceSeal(targetCtx, width, height) {
  const label = (state.sealText || "VICE CITY").trim().toUpperCase();
  if (!label) return;
  const radius = Math.max(44, Math.round(Math.min(width, height) * 0.075));
  const cx = width - radius - Math.round(width * 0.03);
  const cy = height * 0.74;
  targetCtx.save();
  targetCtx.translate(cx, cy);
  targetCtx.rotate(-0.1);
  targetCtx.globalAlpha = 0.94;
  // Outer ring + inner ring.
  targetCtx.strokeStyle = "#ffd76a";
  targetCtx.lineWidth = Math.max(3, radius * 0.07);
  targetCtx.beginPath();
  targetCtx.arc(0, 0, radius, 0, Math.PI * 2);
  targetCtx.stroke();
  targetCtx.lineWidth = Math.max(1.5, radius * 0.03);
  targetCtx.beginPath();
  targetCtx.arc(0, 0, radius * 0.78, 0, Math.PI * 2);
  targetCtx.stroke();
  // Seal text across the middle, EST. 2026 beneath it.
  const fontSize = Math.max(13, Math.round(radius * 0.30));
  targetCtx.fillStyle = "#ffd76a";
  targetCtx.font = "400 " + fontSize + "px 'Archivo Black', sans-serif";
  targetCtx.textAlign = "center";
  targetCtx.textBaseline = "middle";
  const lines = wrapSealText(targetCtx, label, radius * 1.35);
  const lineH = fontSize * 1.15;
  const startY = -((lines.length - 1) * lineH) / 2 - fontSize * 0.22;
  lines.forEach((line, i) => {
    targetCtx.fillText(line, 0, startY + i * lineH);
  });
  targetCtx.font = "600 " + Math.round(fontSize * 0.62) + "px Oswald, sans-serif";
  targetCtx.fillStyle = "#ffffff";
  targetCtx.fillText("EST. 2026", 0, radius * 0.52);
  // Small stars flanking the year line.
  targetCtx.font = Math.round(fontSize * 0.6) + "px Oswald, sans-serif";
  targetCtx.fillText("\u2605", -radius * 0.52, radius * 0.52);
  targetCtx.fillText("\u2605", radius * 0.52, radius * 0.52);
  targetCtx.restore();
}

function wrapSealText(targetCtx, label, maxWidth) {
  const words = label.split(/\s+/);
  const lines = [];
  let current = "";
  words.forEach((word) => {
    const trial = current ? current + " " + word : word;
    if (targetCtx.measureText(trial).width <= maxWidth || !current) {
      current = trial;
    } else {
      lines.push(current);
      current = word;
    }
  });
  if (current) lines.push(current);
  return lines.slice(0, 2);
}

function drawBillingBlock(targetCtx, width, height) {
  const text = (state.billingText || "").trim();
  if (!text) return;
  const stripH = Math.max(26, Math.round(height * 0.045));
  const fontSize = Math.max(12, Math.round(stripH * 0.42));
  targetCtx.save();
  targetCtx.fillStyle = "rgba(5,2,12,0.88)";
  targetCtx.fillRect(0, height - stripH, width, stripH);
  targetCtx.fillStyle = "#ffd76a";
  targetCtx.fillRect(0, height - stripH, width, Math.max(2, stripH * 0.06));
  targetCtx.font = "500 " + fontSize + "px Oswald, sans-serif";
  targetCtx.fillStyle = "#f4ecff";
  targetCtx.textAlign = "center";
  targetCtx.textBaseline = "middle";
  let display = text.toUpperCase();
  while (fontSize > 9 && targetCtx.measureText(display).width > width * 0.96) {
    display = display.slice(0, -1);
  }
  targetCtx.fillText(display, width / 2, height - stripH / 2 + 1);
  targetCtx.restore();
}

/* The full cover, drawn at any size. Preview and exports share it. */
function drawCover(targetCtx, width, height) {
  targetCtx.save();
  targetCtx.clearRect(0, 0, width, height);
  targetCtx.fillStyle = "#0c0817";
  targetCtx.fillRect(0, 0, width, height);
  const layout = layoutOf();
  const grade = gradeOf();
  const n = layout.panels;
  for (let i = 0; i < n; i++) {
    const rect = panelRect(layout, i, width, height);
    drawPanelPhoto(targetCtx, state.panels[i], rect, grade);
    drawRoleTag(targetCtx, state.panels[i], rect);
  }
  // Selected panel gets a thin gold outline in the preview only.
  if (targetCtx === ctx && state.selectedPanel < n) {
    const rect = panelRect(layout, state.selectedPanel, width, height);
    targetCtx.save();
    targetCtx.strokeStyle = "#ffc44d";
    targetCtx.lineWidth = Math.max(2, width * 0.002);
    targetCtx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    targetCtx.restore();
  }
  drawCalloutLabels(targetCtx, width, height);
  drawCaption(targetCtx, width, height);
  drawViceSeal(targetCtx, width, height);
  drawBillingBlock(targetCtx, width, height);
  targetCtx.restore();
}

/* ------------------------------------------------------------------ */
/* Preview                                                            */
/* ------------------------------------------------------------------ */

function renderPreview() {
  const size = EXPORT_SIZES[state.previewSize];
  canvas.width = size.width;
  canvas.height = size.height;
  drawCover(ctx, size.width, size.height);
}

function setPreviewSize(sizeKey) {
  state.previewSize = sizeKey;
  document.querySelectorAll(".sizeBtn").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.size === sizeKey);
  });
  renderPreview();
}

/* ------------------------------------------------------------------ */
/* Export                                                             */
/* ------------------------------------------------------------------ */

function renderCoverToCanvas(sizeKey) {
  const size = EXPORT_SIZES[sizeKey];
  const off = document.createElement("canvas");
  off.width = size.width;
  off.height = size.height;
  const offCtx = off.getContext("2d");
  drawCover(offCtx, size.width, size.height);
  return off;
}

function downloadCanvasPng(offCanvas, filename) {
  return new Promise((resolve, reject) => {
    offCanvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("PNG export failed"));
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      resolve(blob.size);
    }, "image/png");
  });
}

function setExportStatus(message) {
  $("exportStatus").textContent = message;
}

async function exportCoverPng(sizeKey) {
  const size = EXPORT_SIZES[sizeKey];
  const off = renderCoverToCanvas(sizeKey);
  const bytes = await downloadCanvasPng(off, "neon-vice-cover-" + size.label + ".png");
  setExportStatus("Exported " + size.label + " PNG (" + Math.round(bytes / 1024) + " KB).");
  return bytes;
}

async function exportAllSizes() {
  setExportStatus("Exporting all 3 sizes\u2026");
  for (const key of ["square", "portrait", "landscape"]) {
    await exportCoverPng(key);
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  setExportStatus("Exported all 3 sizes: 1080x1080, 1080x1350, 1920x1080.");
}

/* ------------------------------------------------------------------ */
/* Controls                                                           */
/* ------------------------------------------------------------------ */

function buildLayoutButtons() {
  const grid = $("layoutGrid");
  LAYOUTS.forEach((layout) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "layoutBtn";
    btn.dataset.layout = layout.id;
    const name = document.createElement("span");
    name.textContent = layout.name;
    const count = document.createElement("span");
    count.className = "panelCount";
    count.textContent = layout.panels + (layout.panels === 1 ? " panel" : " panels");
    btn.appendChild(name);
    btn.appendChild(count);
    btn.addEventListener("click", () => {
      state.layoutId = layout.id;
      if (state.selectedPanel >= layout.panels) {
        state.selectedPanel = 0;
      }
      syncLayoutButtons();
      syncPanelControls();
      renderPreview();
    });
    grid.appendChild(btn);
  });
  syncLayoutButtons();
}

function syncLayoutButtons() {
  document.querySelectorAll(".layoutBtn").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.layout === state.layoutId);
  });
}

function buildGradeButtons() {
  const grid = $("gradeGrid");
  GRADES.forEach((grade) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "gradeBtn";
    btn.dataset.grade = grade.id;
    const swatch = document.createElement("span");
    swatch.className = "gradeSwatch";
    swatch.style.background = grade.swatch;
    const name = document.createElement("span");
    name.textContent = grade.name;
    const tag = document.createElement("span");
    tag.className = "gradeTag";
    tag.textContent = grade.id === "sunset" || grade.id === "neon" ? "flagship" : "grade";
    btn.appendChild(swatch);
    btn.appendChild(name);
    btn.appendChild(tag);
    btn.addEventListener("click", () => {
      state.gradeId = grade.id;
      syncGradeButtons();
      renderPreview();
    });
    grid.appendChild(btn);
  });
  syncGradeButtons();
}

function syncGradeButtons() {
  document.querySelectorAll(".gradeBtn").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.grade === state.gradeId);
  });
}

function syncPanelControls() {
  const panel = selectedPanelState();
  $("selectedPanelLabel").textContent = "Panel " + (state.selectedPanel + 1) + " of " + panelCount();
  $("panelZoomSlider").value = Math.round(panel.zoom * 100);
  $("panelZoomValue").textContent = panel.zoom.toFixed(2) + "\u00d7";
  $("focusXSlider").value = Math.round(panel.focusX * 100);
  $("focusXValue").textContent = Math.round(panel.focusX * 100) + "%";
  $("focusYSlider").value = Math.round(panel.focusY * 100);
  $("focusYValue").textContent = Math.round(panel.focusY * 100) + "%";
  $("roleSelect").value = panel.role;
  $("customRoleInput").value = panel.customRole;
}

function selectPanel(index) {
  if (index < 0 || index >= panelCount()) return;
  state.selectedPanel = index;
  syncPanelControls();
  renderPreview();
}

/* Map a pointer position on the canvas element to cover coordinates. */
function canvasPointFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
  const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
  return { x, y };
}

function panelIndexAtPoint(x, y) {
  const layout = layoutOf();
  for (let i = 0; i < layout.panels; i++) {
    const rect = panelRect(layout, i, canvas.width, canvas.height);
    if (x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h) {
      return { index: i, rect };
    }
  }
  return null;
}

function bindCanvasPointer() {
  let dragging = false;
  canvas.addEventListener("pointerdown", (event) => {
    const point = canvasPointFromEvent(event);
    const hit = panelIndexAtPoint(point.x, point.y);
    if (!hit) return;
    selectPanel(hit.index);
    dragging = true;
    canvas.setPointerCapture(event.pointerId);
    moveFocusToPoint(hit, point);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    const point = canvasPointFromEvent(event);
    const hit = panelIndexAtPoint(point.x, point.y);
    if (hit && hit.index === state.selectedPanel) {
      moveFocusToPoint(hit, point);
    }
  });
  canvas.addEventListener("pointerup", () => {
    dragging = false;
  });
  canvas.addEventListener("pointercancel", () => {
    dragging = false;
  });
}

/* Dragging inside a panel moves that panel's focus point. */
function moveFocusToPoint(hit, point) {
  const panel = state.panels[hit.index];
  if (!panel.image) return;
  const img = panel.image;
  const zoom = panel.zoom || 1;
  const scale = Math.max(hit.rect.w / img.naturalWidth, hit.rect.h / img.naturalHeight) * zoom;
  const shownW = hit.rect.w / scale;
  const shownH = hit.rect.h / scale;
  const srcX = Math.max(0, Math.min(img.naturalWidth - shownW, panel.focusX * img.naturalWidth - shownW / 2));
  const srcY = Math.max(0, Math.min(img.naturalHeight - shownH, panel.focusY * img.naturalHeight - shownH / 2));
  const localX = (point.x - hit.rect.x) / hit.rect.w;
  const localY = (point.y - hit.rect.y) / hit.rect.h;
  panel.focusX = Math.max(0, Math.min(1, (srcX + localX * shownW) / img.naturalWidth));
  panel.focusY = Math.max(0, Math.min(1, (srcY + localY * shownH) / img.naturalHeight));
  syncPanelControls();
  renderPreview();
}

function bindControls() {
  $("photoFileInput").addEventListener("change", (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    loadUploadIntoPanel(state.selectedPanel, file).catch((err) => {
      setExportStatus("Could not load that photo: " + err.message);
    });
    event.target.value = "";
  });

  $("sampleBoulevardBtn").addEventListener("click", () => {
    loadSampleIntoPanel(state.selectedPanel, "boulevard").catch((err) => setExportStatus(err.message));
  });
  $("samplePierBtn").addEventListener("click", () => {
    loadSampleIntoPanel(state.selectedPanel, "pier").catch((err) => setExportStatus(err.message));
  });
  $("applyToAllBtn").addEventListener("click", async () => {
    const panel = selectedPanelState();
    if (!panel.image) {
      setExportStatus("Load a photo into the selected panel first.");
      return;
    }
    for (let i = 0; i < panelCount(); i++) {
      state.panels[i].image = panel.image;
      state.panels[i].srcKind = panel.srcKind;
    }
    renderPreview();
    setExportStatus("Same photo applied to every panel.");
  });
  $("alternateSamplesBtn").addEventListener("click", () => {
    alternateBothSamples().catch((err) => setExportStatus(err.message));
  });

  document.querySelectorAll(".sizeBtn").forEach((btn) => {
    btn.addEventListener("click", () => setPreviewSize(btn.dataset.size));
  });

  $("gradeStrengthSlider").addEventListener("input", (event) => {
    state.gradeStrength = Number(event.target.value) / 100;
    $("gradeStrengthValue").textContent = event.target.value + "%";
    renderPreview();
  });

  $("captionInput").addEventListener("input", (event) => {
    state.caption = event.target.value;
    renderPreview();
  });
  $("captionStyleSelect").addEventListener("change", (event) => {
    state.captionStyle = event.target.value;
    renderPreview();
  });

  $("panelZoomSlider").addEventListener("input", (event) => {
    const panel = selectedPanelState();
    panel.zoom = Number(event.target.value) / 100;
    $("panelZoomValue").textContent = panel.zoom.toFixed(2) + "\u00d7";
    renderPreview();
  });
  $("focusXSlider").addEventListener("input", (event) => {
    const panel = selectedPanelState();
    panel.focusX = Number(event.target.value) / 100;
    $("focusXValue").textContent = event.target.value + "%";
    renderPreview();
  });
  $("focusYSlider").addEventListener("input", (event) => {
    const panel = selectedPanelState();
    panel.focusY = Number(event.target.value) / 100;
    $("focusYValue").textContent = event.target.value + "%";
    renderPreview();
  });
  $("autoFaceBtn").addEventListener("click", () => {
    const found = autoFacePanel(state.selectedPanel);
    setExportStatus(found ? "Face found — focus moved to it." : "No face-like region found — focus stays centred.");
  });
  $("autoFaceAllBtn").addEventListener("click", () => {
    const found = autoFaceAllPanels();
    setExportStatus("Auto-face ran on every panel: " + found + " face" + (found === 1 ? "" : "s") + " found.");
  });
  $("centreFocusBtn").addEventListener("click", () => {
    const panel = selectedPanelState();
    panel.focusX = 0.5;
    panel.focusY = 0.5;
    syncPanelControls();
    renderPreview();
  });

  $("roleSelect").addEventListener("change", (event) => {
    const panel = selectedPanelState();
    panel.role = event.target.value;
    renderPreview();
  });
  $("customRoleInput").addEventListener("input", (event) => {
    const panel = selectedPanelState();
    panel.customRole = event.target.value;
    if (panel.role === "CUSTOM") renderPreview();
  });

  state.callouts.forEach((callout, i) => {
    $("calloutText" + i).addEventListener("input", (event) => {
      callout.text = event.target.value;
      renderPreview();
    });
    $("calloutPos" + i).addEventListener("input", (event) => {
      callout.pos = Number(event.target.value) / 100;
      $("calloutPosValue" + i).textContent = event.target.value + "%";
      renderPreview();
    });
  });

  $("sealTextInput").addEventListener("input", (event) => {
    state.sealText = event.target.value;
    renderPreview();
  });
  $("billingInput").addEventListener("input", (event) => {
    state.billingText = event.target.value;
    renderPreview();
  });

  $("exportSquareBtn").addEventListener("click", () => exportCoverPng("square").catch((err) => setExportStatus(err.message)));
  $("exportPortraitBtn").addEventListener("click", () => exportCoverPng("portrait").catch((err) => setExportStatus(err.message)));
  $("exportLandscapeBtn").addEventListener("click", () => exportCoverPng("landscape").catch((err) => setExportStatus(err.message)));
  $("exportAllBtn").addEventListener("click", () => exportAllSizes().catch((err) => setExportStatus(err.message)));

  bindCanvasPointer();
}

/* ------------------------------------------------------------------ */
/* Startup: load the bundled fonts, seed the demo, draw the preview.  */
/* ------------------------------------------------------------------ */

async function initCoverStudio() {
  buildLayoutButtons();
  buildGradeButtons();
  bindControls();
  syncPanelControls();
  renderPreview();
  // Wait for the shipped OFL fonts so the first paint uses real lettering.
  try {
    await Promise.all([
      document.fonts.load("100px Anton"),
      document.fonts.load("100px 'Archivo Black'"),
      document.fonts.load("600 20px Oswald"),
    ]);
  } catch (err) {
    // Canvas falls back to system fonts; the app still works.
  }
  renderPreview();
  // Seed the demo: both sample photos across the mosaic panels.
  try {
    await alternateBothSamples();
    autoFaceAllPanels();
  } catch (err) {
    setExportStatus("Sample photos could not load: " + err.message);
  }
}

/* Handle for scripted checks and screenshots: state + key functions. */
window.coverStudio = {
  state,
  LAYOUTS,
  GRADES,
  EXPORT_SIZES,
  renderPreview,
  setPreviewSize,
  selectPanel,
  loadSampleIntoPanel,
  fillPanelsWithSample,
  alternateBothSamples,
  autoFacePanel,
  autoFaceAllPanels,
  exportCoverPng,
  exportAllSizes,
  drawCover,
  renderCoverToCanvas,
  detectFaceFocus,
};

initCoverStudio();
