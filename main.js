// a12n4v.github.io
// 1. Dithered ramps between paper and night sections (8x8 Bayer, as a CSS background).
// 2. The probe: the hero figure re-dithered live, with an orange lens that
//    follows the pointer (or drifts on its own) and reads out ink density.
(() => {
  'use strict';

  const BAYER = [
    0, 48, 12, 60, 3, 51, 15, 63, 32, 16, 44, 28, 35, 19, 47, 31,
    8, 56, 4, 52, 11, 59, 7, 55, 40, 24, 36, 20, 43, 27, 39, 23,
    2, 50, 14, 62, 1, 49, 13, 61, 34, 18, 46, 30, 33, 17, 45, 29,
    10, 58, 6, 54, 9, 57, 5, 53, 42, 26, 38, 22, 41, 25, 37, 21,
  ].map((b) => (b + 0.5) / 64);
  const bayer = (x, y) => BAYER[(y & 7) * 8 + (x & 7)];
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const css = getComputedStyle(document.documentElement);
  const color = (name) => hex(css.getPropertyValue(name).trim());
  const PAPER = color('--paper'), NIGHT = color('--night'), INK = color('--ink'), ACC = color('--acc');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- 1. ramps ----------------------------------------------------------
  function ramp(down) {
    const w = 64, h = 20, c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d'), id = g.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const t = (y + 0.5) / h, v = down ? t : 1 - t, p = v > bayer(x, y) ? NIGHT : PAPER, i = (y * w + x) * 4;
      id.data[i] = p[0]; id.data[i + 1] = p[1]; id.data[i + 2] = p[2]; id.data[i + 3] = 255;
    }
    g.putImageData(id, 0, 0);
    return `url(${c.toDataURL()})`;
  }
  try {
    document.documentElement.style.setProperty('--ramp-down', ramp(true));
    document.documentElement.style.setProperty('--ramp-up', ramp(false));
  } catch (_) { /* the CSS gradient fallback stays */ }

  // ---- 2. probe ----------------------------------------------------------
  const fig = document.getElementById('probe');
  if (!fig) return;
  const stage = fig.querySelector('.probe__stage');
  const cv = fig.querySelector('.probe__canvas');
  const src = fig.querySelector('.probe__fallback');
  const out = fig.querySelector('.probe__readout');
  const outXY = out.querySelector('[data-k="xy"]'), outRho = out.querySelector('[data-k="rho"]');
  const g = cv.getContext('2d');

  const CELL = 2;                 // css px per dither cell
  let gw = 0, gh = 0, D = null, X = null, frame = null;
  let px = 0, py = 0, tx = 0, ty = 0, lastPointer = -1e9, visible = true, raf = 0;

  function layout() {
    const r = stage.getBoundingClientRect();
    if (!r.width || !src.naturalWidth) return;
    gw = Math.max(64, Math.round(r.width / CELL));
    gh = Math.round(gw * src.naturalHeight / src.naturalWidth);
    cv.width = gw; cv.height = gh;
    // two fields from the (transparent-backed) figure, sampled down with high-quality
    // smoothing: D, ink = alpha * (1 - luminance); X, light = alpha * luminance
    const oc = document.createElement('canvas'); oc.width = gw; oc.height = gh;
    const og = oc.getContext('2d');
    og.imageSmoothingEnabled = true; og.imageSmoothingQuality = 'high';
    og.drawImage(src, 0, 0, gw, gh);
    const px4 = og.getImageData(0, 0, gw, gh).data;
    D = new Float32Array(gw * gh); X = new Float32Array(gw * gh);
    for (let i = 0; i < D.length; i++) {
      const a = px4[i * 4 + 3] / 255;
      const l = a ? (0.2126 * px4[i * 4] + 0.7152 * px4[i * 4 + 1] + 0.0722 * px4[i * 4 + 2]) / 255 / a : 0;
      D[i] = a * Math.max(0, Math.min(1, (1 - l - 0.04) / 0.9));
      X[i] = a * Math.min(1, l * 1.9 + 0.04);
    }
    frame = g.createImageData(gw, gh);
    if (!px && !py) { px = tx = gw * 0.5; py = ty = gh * 0.36; }
  }

  function draw(t) {
    if (!D) return;
    const R = Math.max(22, gw * 0.12), R2 = R * R, ring = R + 1.5;
    const scan = ((t / 5200) % 1) * (gh + 40) - 20;       // a slow scan line down the body
    const d = frame.data;
    let sum = 0, n = 0;
    for (let y = 0; y < gh; y++) {
      const dy = y - py, sy = Math.abs(y - scan), band = sy < 6 ? (1 - sy / 6) * 0.35 : 0;
      for (let x = 0; x < gw; x++) {
        const i = y * gw + x, dx = x - px, r2 = dx * dx + dy * dy, lens = r2 < R2;
        // outside the lens: ink. Inside: an x-ray, where the light in the image
        // (the metal of the mask, the weave of the hood) comes up in orange.
        let v = lens ? X[i] : D[i];
        if (lens) { sum += D[i]; n++; }
        else if (band) v = Math.min(1, v + band * v);
        let c = null;
        if (v > bayer(x, y)) c = lens ? ACC : INK;
        // dashed ring and crosshair ticks on the lens edge
        const rr = Math.sqrt(r2);
        if (Math.abs(rr - ring) < 0.7 && ((Math.atan2(dy, dx) * 20) & 1)) c = ACC;
        if ((Math.abs(dx) < 0.5 && rr > R + 3 && rr < R + 9) || (Math.abs(dy) < 0.5 && rr > R + 3 && rr < R + 9)) c = ACC;
        const j = i * 4;
        if (c) { d[j] = c[0]; d[j + 1] = c[1]; d[j + 2] = c[2]; d[j + 3] = 255; } else d[j + 3] = 0;
      }
    }
    g.putImageData(frame, 0, 0);
    // readout sits beside the lens, in css px
    const k = stage.clientWidth / gw, ox = (px + R + 12) * k, oy = (py - R) * k;
    const flip = ox + 120 > stage.clientWidth;
    out.style.transform = `translate(${Math.round(flip ? (px - R - 12) * k - 118 : ox)}px, ${Math.round(Math.max(0, oy))}px)`;
    outXY.textContent = `x ${(px / gw).toFixed(2)} · y ${(py / gh).toFixed(2)}`;
    outRho.textContent = `ρ ${(n ? sum / n : 0).toFixed(2)}`;
  }

  function tick(t) {
    raf = 0;
    if (!visible || document.hidden) return;
    if (t - lastPointer > 1800) {           // idle: drift over the mask and the chest
      const s = t / 1000;
      tx = gw * (0.5 + 0.2 * Math.sin(s * 0.45));
      ty = gh * (0.42 + 0.2 * Math.sin(s * 0.71 + 1.3));
    }
    px += (tx - px) * 0.12; py += (ty - py) * 0.12;
    draw(t);
    if (!reduced) raf = requestAnimationFrame(tick);
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };

  function onMove(e) {
    const r = stage.getBoundingClientRect();
    tx = ((e.clientX - r.left) / r.width) * gw;
    ty = ((e.clientY - r.top) / r.height) * gh;
    lastPointer = performance.now();
    if (reduced) { px = tx; py = ty; }
    kick();
  }

  async function start() {
    try { if (!src.complete) await src.decode(); } catch (_) { return; }
    layout();
    if (!D) return;
    fig.classList.add('is-live');
    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerdown', onMove);
    new ResizeObserver(() => { layout(); kick(); }).observe(stage);
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; kick(); }).observe(stage);
    document.addEventListener('visibilitychange', kick);
    kick();
  }
  start();
})();
