/* Neon Vice Cover Studio — turns your photos into GTA 6-style multi-panel
   poster cover art, entirely offline. Canvas renderer + editor. */

const stage = document.getElementById("stage");
const stageCtx = stage.getContext("2d");

/* ------------------------------------------------------------------ */
/* Templates: panels are polygons in normalised 0..1 cover coordinates */
/* ------------------------------------------------------------------ */

function rectPanel(x, y, w, h) {
  return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
}

const TEMPLATES = {
  "hero-split": {
    label: "Hero Split",
    sub: "big left + 2 stacked",
    panels: [
      rectPanel(0, 0, 0.615, 1),
      rectPanel(0.625, 0, 0.375, 0.495),
      rectPanel(0.625, 0.505, 0.375, 0.495),
    ],
  },
  "triple-diagonal": {
    label: "Triple Diagonal",
    sub: "slanted triple cut",
    panels: [
      [[0, 0], [0.42, 0], [0.28, 1], [0, 1]],
      [[0.42, 0], [0.72, 0], [0.58, 1], [0.28, 1]],
      [[0.72, 0], [1, 0], [1, 1], [0.58, 1]],
    ],
  },
  "four-grid": {
    label: "Four-Panel Grid",
    sub: "classic 2 × 2",
    panels: [
      rectPanel(0, 0, 0.495, 0.495),
      rectPanel(0.505, 0, 0.495, 0.495),
      rectPanel(0, 0.505, 0.495, 0.495),
      rectPanel(0.505, 0.505, 0.495, 0.495),
    ],
  },
  "center-hero": {
    label: "Center Hero + Strip",
    sub: "hero middle, side strips",
    panels: [
      rectPanel(0, 0, 0.175, 1),
      rectPanel(0.185, 0, 0.63, 0.795),
      rectPanel(0.825, 0, 0.175, 1),
      rectPanel(0.185, 0.805, 0.63, 0.195),
    ],
  },
  "duo-banner": {
    label: "Duo + Banner",
    sub: "two up top, wide strip",
    panels: [
      rectPanel(0, 0, 0.495, 0.615),
      rectPanel(0.505, 0, 0.495, 0.615),
      rectPanel(0, 0.625, 1, 0.375),
    ],
  },
  "single-poster": {
    label: "Single Poster",
    sub: "one full-bleed photo",
    panels: [rectPanel(0, 0, 1, 1)],
  },
};

const TEMPLATE_ORDER = [
  "hero-split",
  "triple-diagonal",
  "four-grid",
  "center-hero",
  "duo-banner",
  "single-poster",
];

/* ------------------------------------------------------------------ */
/* Colour grades                                                       */
/* ------------------------------------------------------------------ */

const GRADES = {
  "vice-sunset": { label: "Vice Sunset", swatch: "linear-gradient(135deg,#ffd166,#ff7a18 45%,#ff2e88)" },
  "neon-nights": { label: "Neon Nights", swatch: "linear-gradient(135deg,#ff2e88,#7a1fa2 50%,#22e6ff)" },
  "palm-dusk": { label: "Palm Dusk", swatch: "linear-gradient(135deg,#5b2a86,#2a9d8f 60%,#0f3d5c)" },
  "noir": { label: "Noir", swatch: "linear-gradient(135deg,#e8e8e8,#5a5a5a 55%,#0a0a0a)" },
  "candy-pop": { label: "Candy Pop", swatch: "linear-gradient(135deg,#ff5db1,#ffc93c 50%,#22e6ff)" },
};
const GRADE_ORDER = ["vice-sunset", "neon-nights", "palm-dusk", "noir", "candy-pop"];

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

const state = {
  photos: [], // { img, name }
  template: "hero-split",
  grade: "vice-sunset",
  caption: "VICE CITY",
  captionStyle: "solid",
  captionPlace: "bottom",
  captionSize: 96, // at 1080 reference width
  size: { w: 1080, h: 1080 },
  selected: 0,
  panels: [], // per template panel: { photo, zoom, ox, oy }
};

function freshPanels(templateKey) {
  const count = TEMPLATES[templateKey].panels.length;
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push({ photo: state.photos.length ? i % state.photos.length : -1, zoom: 1.15, ox: 0, oy: 0 });
  }
  return out;
}
state.panels = freshPanels(state.template);

/* ------------------------------------------------------------------ */
/* Geometry helpers                                                    */
/* ------------------------------------------------------------------ */

function panelBounds(poly, W, H) {
  let minX = 1, minY = 1, maxX = 0, maxY = 0;
  for (const [x, y] of poly) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { x: minX * W, y: minY * H, w: (maxX - minX) * W, h: (maxY - minY) * H };
}

function shrinkPoly(poly, gapPx, W, H) {
  const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length;
  const cy = poly.reduce((s, p) => s + p[1], 0) / poly.length;
  return poly.map(([x, y]) => {
    const dx = x - cx, dy = y - cy;
    const len = Math.hypot(dx, dy) || 1;
    const gx = (gapPx / W) * (dx / len);
    const gy = (gapPx / H) * (dy / len);
    return [x - gx, y - gy];
  });
}

function pointInPoly(nx, ny, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > ny !== yj > ny && nx < ((xj - xi) * (ny - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function tracePoly(ctx, poly, W, H) {
  ctx.beginPath();
  poly.forEach(([x, y], i) => {
    if (i === 0) ctx.moveTo(x * W, y * H);
    else ctx.lineTo(x * W, y * H);
  });
  ctx.closePath();
}

/* ------------------------------------------------------------------ */
/* Photo drawing                                                       */
/* ------------------------------------------------------------------ */

function drawPhotoIntoPanel(ctx, img, poly, W, H, zoom, ox, oy) {
  const b = panelBounds(poly, W, H);
  const gap = Math.max(3, W * 0.006);
  const small = shrinkPoly(poly, gap, W, H);
  ctx.save();
  tracePoly(ctx, small, W, H);
  ctx.clip();
  const scale = Math.max(b.w / img.naturalWidth, b.h / img.naturalHeight) * zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const cx = b.x + b.w / 2 + ox * b.w;
  const cy = b.y + b.h / 2 + oy * b.h;
  ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
  ctx.restore();
}

function drawPlaceholderPanel(ctx, poly, W, H, index) {
  const b = panelBounds(poly, W, H);
  const gap = Math.max(3, W * 0.006);
  const small = shrinkPoly(poly, gap, W, H);
  ctx.save();
  tracePoly(ctx, small, W, H);
  ctx.clip();
  const grad = ctx.createLinearGradient(b.x, b.y, b.x + b.w, b.y + b.h);
  grad.addColorStop(0, "#2c1a55");
  grad.addColorStop(0.55, "#5c0e3f");
  grad.addColorStop(1, "#1a0b2e");
  ctx.fillStyle = grad;
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = `700 ${Math.max(14, W * 0.022)}px Oswald, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("ADD YOUR PHOTO", b.x + b.w / 2, b.y + b.h / 2 - W * 0.012);
  ctx.font = `${Math.max(12, W * 0.016)}px Oswald, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.fillText("PANEL " + (index + 1), b.x + b.w / 2, b.y + b.h / 2 + W * 0.014);
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Grades, sun, caption                                                */
/* ------------------------------------------------------------------ */

function applyGrade(ctx, W, H, grade) {
  ctx.save();
  if (grade === "vice-sunset") {
    const g = ctx.createLinearGradient(0, 0, W * 0.4, H);
    g.addColorStop(0, "rgba(255,154,61,0.55)");
    g.addColorStop(0.6, "rgba(255,46,136,0.35)");
    g.addColorStop(1, "rgba(122,31,162,0.45)");
    ctx.globalCompositeOperation = "overlay";
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  } else if (grade === "neon-nights") {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "rgba(255,46,136,0.5)");
    g.addColorStop(0.5, "rgba(122,31,162,0.4)");
    g.addColorStop(1, "rgba(34,230,255,0.45)");
    ctx.globalCompositeOperation = "overlay";
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "soft-light";
    ctx.fillStyle = "rgba(255,46,136,0.5)";
    ctx.fillRect(0, 0, W, H);
  } else if (grade === "palm-dusk") {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "rgba(91,42,134,0.55)");
    g.addColorStop(0.6, "rgba(42,157,143,0.35)");
    g.addColorStop(1, "rgba(15,61,92,0.6)");
    ctx.globalCompositeOperation = "soft-light";
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  } else if (grade === "noir") {
    ctx.globalCompositeOperation = "saturation";
    ctx.fillStyle = "rgb(128,128,128)";
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "overlay";
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "rgba(255,255,255,0.25)");
    g.addColorStop(1, "rgba(0,0,0,0.5)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  } else if (grade === "candy-pop") {
    ctx.globalCompositeOperation = "saturation";
    ctx.fillStyle = "rgb(255,0,128)";
    ctx.globalAlpha = 0.55;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "overlay";
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "rgba(255,93,177,0.35)");
    g.addColorStop(0.5, "rgba(255,201,60,0.25)");
    g.addColorStop(1, "rgba(34,230,255,0.35)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();

  // Vignette for every grade: pulls the eye to the middle like a poster.
  const v = ctx.createRadialGradient(
    W / 2, H / 2, Math.min(W, H) * 0.35,
    W / 2, H / 2, Math.max(W, H) * 0.75
  );
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.42)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

function drawViceSun(ctx, W, H, grade) {
  if (grade !== "vice-sunset" && grade !== "neon-nights") return;
  const cx = W * 0.8, cy = H * 0.17, r = W * 0.085;
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const g = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
  if (grade === "vice-sunset") {
    g.addColorStop(0, "rgba(255,230,150,0.95)");
    g.addColorStop(0.55, "rgba(255,122,24,0.75)");
    g.addColorStop(1, "rgba(255,46,136,0)");
  } else {
    g.addColorStop(0, "rgba(180,245,255,0.95)");
    g.addColorStop(0.55, "rgba(255,46,136,0.7)");
    g.addColorStop(1, "rgba(122,31,162,0)");
  }
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function captionFont(sizePx, style) {
  if (style === "sunset") return `400 ${sizePx}px "Archivo Black", sans-serif`;
  return `400 ${sizePx}px Anton, sans-serif`;
}

function drawCaption(ctx, W, H) {
  const text = (state.caption || "").trim().toUpperCase();
  if (!text) return;
  const sizePx = Math.round((state.captionSize / 1080) * W);
  const place = state.captionPlace;
  const style = state.captionStyle;
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  try { ctx.letterSpacing = Math.max(1, Math.round(sizePx * 0.03)) + "px"; } catch (e) { /* older canvas */ }

  let y;
  if (place === "top") y = H * 0.11;
  else if (place === "banner") y = H * 0.5;
  else y = H * 0.86;

  if (place === "banner") {
    ctx.fillStyle = "rgba(10,4,24,0.72)";
    const bandH = sizePx * 1.7;
    ctx.fillRect(0, y - bandH / 2, W, bandH);
    ctx.fillStyle = "#ffc93c";
    ctx.fillRect(0, y - bandH / 2, W, 4);
    ctx.fillRect(0, y + bandH / 2 - 4, W, 4);
  }

  ctx.font = captionFont(sizePx, style);
  ctx.lineJoin = "round";
  if (style === "solid") {
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = sizePx * 0.12;
    ctx.shadowOffsetY = sizePx * 0.04;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(text, W / 2, y);
  } else if (style === "outline") {
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = sizePx * 0.1;
    ctx.lineWidth = Math.max(2, sizePx * 0.07);
    ctx.strokeStyle = "#ffffff";
    ctx.strokeText(text, W / 2, y);
    ctx.fillStyle = "rgba(10,4,24,0.35)";
    ctx.fillText(text, W / 2, y);
  } else if (style === "neon") {
    ctx.shadowColor = "#ff2e88";
    ctx.shadowBlur = sizePx * 0.45;
    ctx.fillStyle = "#ffe9f4";
    ctx.fillText(text, W / 2, y);
    ctx.shadowColor = "#22e6ff";
    ctx.shadowBlur = sizePx * 0.2;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(text, W / 2, y);
  } else if (style === "sunset") {
    const g = ctx.createLinearGradient(0, y - sizePx * 0.6, 0, y + sizePx * 0.6);
    g.addColorStop(0, "#fff3b0");
    g.addColorStop(0.45, "#ff9a3d");
    g.addColorStop(1, "#ff2e88");
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = sizePx * 0.12;
    ctx.shadowOffsetY = sizePx * 0.04;
    ctx.fillStyle = g;
    ctx.fillText(text, W / 2, y);
  }

  // Poster sub-line: small gold credit under a bottom caption, like a
  // magazine cover's kicker. Skipped for the banner, which has its own band.
  if (place === "bottom") {
    const subSize = Math.max(10, sizePx * 0.22);
    ctx.font = `600 ${subSize}px Oswald, sans-serif`;
    try { ctx.letterSpacing = Math.max(1, Math.round(subSize * 0.35)) + "px"; } catch (e) { /* older canvas */ }
    ctx.shadowColor = "rgba(0,0,0,0.7)";
    ctx.shadowBlur = subSize * 0.3;
    ctx.fillStyle = "#ffc93c";
    ctx.fillText("NEON VICE  •  COVER STUDIO", W / 2, y + sizePx * 0.55);
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Master render                                                       */
/* ------------------------------------------------------------------ */

function renderCover(ctx, W, H, opts) {
  const forExport = !!(opts && opts.forExport);
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#0d0618";
  ctx.fillRect(0, 0, W, H);

  const polys = TEMPLATES[state.template].panels;
  polys.forEach((poly, i) => {
    const p = state.panels[i] || { photo: -1, zoom: 1.15, ox: 0, oy: 0 };
    const photo = state.photos[p.photo];
    if (photo && photo.img && photo.img.complete && photo.img.naturalWidth > 0) {
      drawPhotoIntoPanel(ctx, photo.img, poly, W, H, p.zoom, p.ox, p.oy);
    } else {
      drawPlaceholderPanel(ctx, poly, W, H, i);
    }
  });

  drawViceSun(ctx, W, H, state.grade);
  applyGrade(ctx, W, H, state.grade);

  // Poster frame: thin white keyline + pink outer edge.
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = Math.max(2, W * 0.004);
  ctx.strokeRect(W * 0.012, H * 0.012, W * 0.976, H * 0.976);
  ctx.strokeStyle = "rgba(255,46,136,0.9)";
  ctx.lineWidth = Math.max(2, W * 0.006);
  ctx.strokeRect(W * 0.004, H * 0.004, W * 0.992, H * 0.992);
  ctx.restore();

  drawCaption(ctx, W, H);

  // Editor-only: selection outline around the selected panel.
  if (!forExport && opts && opts.showSelection) {
    const poly = polys[state.selected];
    if (poly) {
      ctx.save();
      tracePoly(ctx, poly, W, H);
      ctx.setLineDash([Math.max(6, W * 0.012), Math.max(5, W * 0.009)]);
      ctx.lineWidth = Math.max(2, W * 0.004);
      ctx.strokeStyle = "#22e6ff";
      ctx.stroke();
      ctx.restore();
    }
  }
}

function renderEditor() {
  stage.width = state.size.w;
  stage.height = state.size.h;
  renderCover(stageCtx, state.size.w, state.size.h, { showSelection: true });
}

/* ------------------------------------------------------------------ */
/* Export                                                              */
/* ------------------------------------------------------------------ */

function exportPNG(w, h) {
  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;
  const ctx = off.getContext("2d");
  renderCover(ctx, w, h, { forExport: true });
  off.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `neon-vice-cover-${w}x${h}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }, "image/png");
}

/* ------------------------------------------------------------------ */
/* Photos                                                              */
/* ------------------------------------------------------------------ */

function addPhotoFile(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      state.photos.push({ img, name: file.name || "photo" });
      refreshPhotoSelect();
      renderEditor();
      resolve(true);
    };
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

function loadSamplePhotos() {
  const samples = ["samples/boulevard.jpg", "samples/pier.jpg"];
  return Promise.all(samples.map((src) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      if (!state.photos.some((p) => p.name === src)) {
        state.photos.push({ img, name: src });
      }
      resolve(true);
    };
    img.onerror = () => resolve(false);
    img.src = src;
  }))).then(() => {
    // Assign photos across panels so the cover shows both samples.
    state.panels.forEach((p, i) => { p.photo = i % state.photos.length; });
    refreshPhotoSelect();
    renderEditor();
  });
}

/* ------------------------------------------------------------------ */
/* Controls                                                            */
/* ------------------------------------------------------------------ */

const templateGrid = document.getElementById("templateGrid");
const gradeGrid = document.getElementById("gradeGrid");

TEMPLATE_ORDER.forEach((key) => {
  const t = TEMPLATES[key];
  const b = document.createElement("button");
  b.type = "button";
  b.className = "chip" + (key === state.template ? " active" : "");
  b.dataset.template = key;
  b.innerHTML = "";
  b.textContent = t.label;
  const small = document.createElement("small");
  small.textContent = t.sub;
  b.appendChild(small);
  b.addEventListener("click", () => {
    state.template = key;
    state.panels = freshPanels(key);
    state.selected = 0;
    document.querySelectorAll("#templateGrid .chip").forEach((c) =>
      c.classList.toggle("active", c.dataset.template === key));
    syncPanelControls();
    renderEditor();
  });
  templateGrid.appendChild(b);
});

GRADE_ORDER.forEach((key) => {
  const g = GRADES[key];
  const b = document.createElement("button");
  b.type = "button";
  b.className = "chip" + (key === state.grade ? " active" : "");
  b.dataset.grade = key;
  const sw = document.createElement("span");
  sw.className = "swatch";
  sw.style.background = g.swatch;
  b.appendChild(sw);
  b.appendChild(document.createTextNode(g.label));
  b.addEventListener("click", () => {
    state.grade = key;
    document.querySelectorAll("#gradeGrid .chip").forEach((c) =>
      c.classList.toggle("active", c.dataset.grade === key));
    renderEditor();
  });
  gradeGrid.appendChild(b);
});

const panelPhoto = document.getElementById("panelPhoto");
const panelZoom = document.getElementById("panelZoom");
const panelName = document.getElementById("panelName");

function refreshPhotoSelect() {
  const keep = state.panels[state.selected] ? state.panels[state.selected].photo : -1;
  panelPhoto.innerHTML = "";
  if (state.photos.length === 0) {
    const o = document.createElement("option");
    o.value = "-1";
    o.textContent = "No photos yet — add some";
    panelPhoto.appendChild(o);
    panelPhoto.value = "-1";
    return;
  }
  state.photos.forEach((p, i) => {
    const o = document.createElement("option");
    o.value = String(i);
    o.textContent = `Photo ${i + 1} — ${p.name}`;
    panelPhoto.appendChild(o);
  });
  panelPhoto.value = String(keep >= 0 ? keep : 0);
}

function syncPanelControls() {
  const p = state.panels[state.selected];
  panelName.textContent = `Panel ${state.selected + 1} of ${state.panels.length}`;
  panelZoom.value = p ? String(p.zoom) : "1.15";
  refreshPhotoSelect();
}

panelPhoto.addEventListener("change", () => {
  const p = state.panels[state.selected];
  if (p) p.photo = parseInt(panelPhoto.value, 10);
  renderEditor();
});

panelZoom.addEventListener("input", () => {
  const p = state.panels[state.selected];
  if (p) p.zoom = parseFloat(panelZoom.value);
  renderEditor();
});

document.getElementById("fillAllBtn").addEventListener("click", () => {
  const p = state.panels[state.selected];
  if (!p) return;
  state.panels.forEach((q) => { q.photo = p.photo; });
  renderEditor();
});

document.getElementById("resetPanBtn").addEventListener("click", () => {
  const p = state.panels[state.selected];
  if (!p) return;
  p.ox = 0; p.oy = 0; p.zoom = 1.15;
  syncPanelControls();
  renderEditor();
});

document.getElementById("captionText").addEventListener("input", (e) => {
  state.caption = e.target.value;
  renderEditor();
});
document.getElementById("captionStyle").addEventListener("change", (e) => {
  state.captionStyle = e.target.value;
  renderEditor();
});
document.getElementById("captionPlace").addEventListener("change", (e) => {
  state.captionPlace = e.target.value;
  renderEditor();
});
document.getElementById("captionSize").addEventListener("input", (e) => {
  state.captionSize = parseInt(e.target.value, 10);
  renderEditor();
});

document.querySelectorAll(".size-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    const [w, h] = tab.dataset.size.split("x").map(Number);
    state.size = { w, h };
    document.querySelectorAll(".size-tab").forEach((t) =>
      t.classList.toggle("active", t === tab));
    renderEditor();
  });
});

document.getElementById("exportSquare").addEventListener("click", () => exportPNG(1080, 1080));
document.getElementById("exportPortrait").addEventListener("click", () => exportPNG(1080, 1350));
document.getElementById("exportWide").addEventListener("click", () => exportPNG(1920, 1080));

document.getElementById("fileInput").addEventListener("change", async (e) => {
  const files = Array.from(e.target.files || []);
  for (const f of files) await addPhotoFile(f);
  e.target.value = "";
});

document.getElementById("demoBtn").addEventListener("click", () => loadSamplePhotos());
document.getElementById("clearBtn").addEventListener("click", () => {
  state.photos = [];
  state.panels = freshPanels(state.template);
  state.selected = 0;
  refreshPhotoSelect();
  syncPanelControls();
  renderEditor();
});

/* Drag to pan + wheel to zoom + click to select a panel */
let drag = null;

function canvasPoint(e) {
  const r = stage.getBoundingClientRect();
  const x = ((e.clientX - r.left) / r.width) * state.size.w;
  const y = ((e.clientY - r.top) / r.height) * state.size.h;
  return { x, y };
}

function hitPanel(x, y) {
  const polys = TEMPLATES[state.template].panels;
  for (let i = polys.length - 1; i >= 0; i--) {
    if (pointInPoly(x / state.size.w, y / state.size.h, polys[i])) return i;
  }
  return -1;
}

stage.addEventListener("pointerdown", (e) => {
  const { x, y } = canvasPoint(e);
  const idx = hitPanel(x, y);
  if (idx < 0) return;
  state.selected = idx;
  syncPanelControls();
  renderEditor();
  const p = state.panels[idx];
  drag = { x, y, ox: p.ox, oy: p.oy, moved: false };
  stage.setPointerCapture(e.pointerId);
});

stage.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const { x, y } = canvasPoint(e);
  const p = state.panels[state.selected];
  const b = panelBounds(TEMPLATES[state.template].panels[state.selected], state.size.w, state.size.h);
  p.ox = drag.ox + (x - drag.x) / b.w;
  p.oy = drag.oy + (y - drag.y) / b.h;
  if (Math.abs(x - drag.x) + Math.abs(y - drag.y) > 2) drag.moved = true;
  renderEditor();
});

stage.addEventListener("pointerup", () => { drag = null; });
stage.addEventListener("pointercancel", () => { drag = null; });

stage.addEventListener("wheel", (e) => {
  e.preventDefault();
  const p = state.panels[state.selected];
  if (!p) return;
  p.zoom = Math.min(3, Math.max(1, p.zoom * (1 - e.deltaY * 0.001)));
  panelZoom.value = String(p.zoom);
  renderEditor();
}, { passive: false });

/* Drag & drop files onto the stage */
const dropZone = document.getElementById("dropZone");
["dragenter", "dragover"].forEach((ev) => dropZone.addEventListener(ev, (e) => {
  e.preventDefault();
  dropZone.classList.add("dragging");
}));
["dragleave", "drop"].forEach((ev) => dropZone.addEventListener(ev, (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragging");
}));
dropZone.addEventListener("drop", async (e) => {
  const files = Array.from(e.dataTransfer.files || []).filter((f) => f.type.startsWith("image/"));
  for (const f of files) await addPhotoFile(f);
});

/* ------------------------------------------------------------------ */
/* Demo mode: ?demo=1[&template=..&grade=..&size=WxH]                    */
/* Renders a full-viewport cover for screenshot capture.               */
/* ------------------------------------------------------------------ */

async function bootDemo() {
  const q = new URLSearchParams(window.location.search);
  if (q.get("demo") !== "1") return false;
  if (q.get("template") && TEMPLATES[q.get("template")]) state.template = q.get("template");
  if (q.get("grade") && GRADES[q.get("grade")]) state.grade = q.get("grade");
  if (q.get("caption")) state.caption = q.get("caption");
  if (q.get("captionStyle")) state.captionStyle = q.get("captionStyle");
  if (q.get("captionPlace")) state.captionPlace = q.get("captionPlace");
  const size = q.get("size");
  if (size && /^\d+x\d+$/.test(size)) {
    const [w, h] = size.split("x").map(Number);
    state.size = { w, h };
    document.body.classList.add("cover-only");
  }
  await loadSamplePhotos();
  state.panels = freshPanels(state.template);
  state.panels.forEach((p, i) => { p.photo = i % state.photos.length; });
  if (size) {
    // Size the backing store AFTER loading samples: loadSamplePhotos
    // renders the editor, which resets the canvas to the export size.
    // A stale backing store would leave the first render visible under
    // the second one, so resize first, then draw the cover once.
    stage.width = window.innerWidth;
    stage.height = window.innerHeight;
    renderCover(stageCtx, stage.width, stage.height, { forExport: true });
  } else {
    renderEditor();
  }
  return true;
}

document.fonts.ready.then(async () => {
  const inDemo = await bootDemo();
  if (!inDemo) {
    refreshPhotoSelect();
    syncPanelControls();
    renderEditor();
  }
});
