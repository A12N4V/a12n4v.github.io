// a12n4v.github.io
// 1. Project cards: each card's artwork (public-domain plates) is dithered live
//    with an 8x8 Bayer matrix, in the card's own ink, on black.
// 2. Post-AI: as the last section scrolls in, the whole viewport dissolves in
//    blocks into a dream: a DeepDream-style field generated on the GPU, or real
//    footage if assets/dream/deepdream.mp4 exists, scrubbed by scroll. Text
//    hallucinates (words slip into DeepDream's dogs and eyes), then the page
//    wakes up at the contact.
(() => {
  'use strict';

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const hash = (i, j) => { let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const BAYER = [0, 48, 12, 60, 3, 51, 15, 63, 32, 16, 44, 28, 35, 19, 47, 31, 8, 56, 4, 52, 11, 59, 7, 55, 40, 24, 36, 20, 43, 27, 39, 23, 2, 50, 14, 62, 1, 49, 13, 61, 34, 18, 46, 30, 33, 17, 45, 29, 10, 58, 6, 54, 9, 57, 5, 53, 42, 26, 38, 22, 41, 25, 37, 21].map((b) => (b + 0.5) / 64);

  // ---- 1. dithered artworks ---------------------------------------------
  const images = new Map();
  const load = (src) => {
    if (!images.has(src)) images.set(src, new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }));
    return images.get(src);
  };
  const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

  async function paint(card, boost = 0) {
    const cv = card.querySelector('.card__art');
    const img = await load(card.dataset.art).catch(() => null);
    if (!img) return;
    const r = cv.getBoundingClientRect(), cell = 2;
    const w = Math.max(40, Math.round(r.width / cell)), h = Math.max(30, Math.round(r.height / cell));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    // crop (fractions of the source), then cover the panel
    const [cx, cy, cw, ch] = (card.dataset.crop || '0 0 1 1').split(/\s+/).map(Number);
    const sx = cx * img.naturalWidth, sy = cy * img.naturalHeight, sw = cw * img.naturalWidth, sh = ch * img.naturalHeight;
    const s = Math.max(w / sw, h / sh), dw = sw * s, dh = sh * s;
    const g = cv.getContext('2d', { willReadFrequently: true });
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, sx, sy, sw, sh, (w - dw) / 2, (h - dh) / 2, dw, dh);
    const id = g.getImageData(0, 0, w, h), d = id.data, n = w * h, L = new Float32Array(n);
    // line density = 1 - luminance, auto-levelled
    let lo = 1, hi = 0;
    for (let i = 0; i < n; i++) { const v = 1 - (d[i * 4] * 0.2126 + d[i * 4 + 1] * 0.7152 + d[i * 4 + 2] * 0.0722) / 255; L[i] = v; }
    const sorted = Float32Array.from(L).sort(); lo = sorted[Math.floor(n * 0.02)]; hi = sorted[Math.floor(n * 0.995)] || 1;
    const [R, G, B] = rgb(card.dataset.ink || '#e8e2d9');
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, dx = (x / w - 0.5) * 2, dy = (y / h - 0.5) * 2;
      const vig = clamp((1.18 - Math.hypot(dx * 0.8, dy)) / 0.35);       // fade into the black at the edges
      const v = clamp((L[i] - lo) / (hi - lo + 1e-3)) ** (0.85 - boost * 0.25) * vig;
      const on = v > BAYER[(y & 7) * 8 + (x & 7)];
      d[i * 4] = on ? R : 0; d[i * 4 + 1] = on ? G : 0; d[i * 4 + 2] = on ? B : 0; d[i * 4 + 3] = 255;
    }
    g.putImageData(id, 0, 0);
  }

  const cards = [...document.querySelectorAll('.card[data-art]')];
  const seen = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { paint(e.target); seen.unobserve(e.target); } }), { rootMargin: '400px 0px' });
  cards.forEach((c) => {
    seen.observe(c);
    // hover develops the plate a little further
    c.addEventListener('pointerenter', () => paint(c, 1));
    c.addEventListener('pointerleave', () => paint(c, 0));
  });
  let rz = 0;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => cards.forEach((c) => c.getBoundingClientRect().top < innerHeight * 2 && paint(c)), 200); });

  // ---- 2. hallucinating text ----------------------------------------------
  const VOCAB = ['dog', 'eye', 'eyes', 'pagoda', 'slug', 'bird', 'fur', 'feather', 'temple', 'iris', 'spiral', 'scales', 'dogslug', 'tower', 'snout', 'eye'];
  const words = [];
  document.querySelectorAll('[data-hallucinate]').forEach((host) => {
    const targets = host.matches('h2, p') ? [host] : [...host.querySelectorAll('.card__t, .card__d')];
    targets.forEach((el) => {
      const text = el.textContent, sr = document.createElement('span'), vis = document.createElement('span');
      sr.className = 'sr'; sr.textContent = text; vis.setAttribute('aria-hidden', 'true');
      text.split(/(\s+)/).forEach((w) => {
        if (!w || /^\s+$/.test(w)) { vis.append(w); return; }
        const s = document.createElement('span'); s.className = 'hw'; s.textContent = w; s.dataset.w = w; vis.append(s); words.push(s);
      });
      el.textContent = ''; el.append(sr, vis);
    });
  });
  let lastKey = '';
  function hallucinate(amount, t) {
    const bucket = Math.floor(scrollY / 40) + (reduced ? 0 : Math.floor(t / 380)), key = bucket + ':' + (amount > 0.01);
    if (key === lastKey && amount <= 0.01) return;
    lastKey = key;
    words.forEach((s, i) => {
      const swap = !reduced && hash(i, bucket) < amount * 0.45;
      const w = swap ? VOCAB[Math.floor(hash(i + 3e4, bucket) * VOCAB.length)] : s.dataset.w;
      if (s.textContent !== w) s.textContent = w;
      s.classList.toggle('hw--swap', swap);
      s.style.transform = amount > 0.02 && !reduced ? `translate(${((hash(i, bucket + 1) - 0.5) * amount * 8).toFixed(1)}px, ${((hash(i + 1e4, bucket) - 0.5) * amount * 6).toFixed(1)}px) rotate(${((hash(i + 2e4, bucket) - 0.5) * amount * 7).toFixed(1)}deg)` : '';
    });
  }

  // ---- 3. the dream --------------------------------------------------------
  const post = document.getElementById('post');
  const opera = document.getElementById('opera');
  const dc = document.querySelector('.dream');
  if (!post || !dc) return;

  const FRAG = `precision mediump float;
uniform vec2 u_res; uniform float u_t, u_z, u_a, u_d, u_vid, u_vasp; uniform sampler2D u_tex;
float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i), h(i + vec2(1.0, 0.0)), f.x), mix(h(i + vec2(0.0, 1.0)), h(i + vec2(1.0, 1.0)), f.x), f.y); }
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * n(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return v; }
vec3 pal(float t) { return 0.5 + 0.5 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + t)); }
void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 p = (gl_FragCoord.xy - 0.5 * u_res) / min(u_res.x, u_res.y);
  float r = length(p), an = atan(p.y, p.x);
  // log-polar coordinates: scrolling moves inward forever
  vec2 lp = vec2(log(r + 0.02) * 1.2 - u_z, an / 3.14159 * 2.0);
  vec2 q = vec2(fbm(lp * 2.0 + u_t * 0.05), fbm(lp * 2.0 + 4.1 - u_t * 0.04));
  vec2 w = lp * 3.0 + 2.6 * q;
  float f = fbm(w);
  vec2 c = fract(w * 1.1) - 0.5; float d = length(c);
  float eye = smoothstep(0.26, 0.24, d) * (1.0 - smoothstep(0.16, 0.14, d)) + smoothstep(0.07, 0.05, d);
  vec3 col = pal(f * 1.6 + u_t * 0.03 + r * 0.3) * (0.45 + 0.7 * f);
  col = mix(col, pal(f + 0.5) * 1.15, eye * 0.55);
  if (u_vid > 0.5) {
    float sa = u_res.x / u_res.y; vec2 vv = uv - 0.5;
    if (sa > u_vasp) vv.y *= u_vasp / sa; else vv.x *= sa / u_vasp;
    vv += 0.012 * u_a * vec2(sin(uv.y * 30.0 + u_t), cos(uv.x * 27.0 - u_t));
    col = mix(col, texture2D(u_tex, vec2(vv.x + 0.5, 0.5 - vv.y)).rgb, 0.88);
  }
  // the dissolve: large blocks first, finer as it completes
  float cs = mix(40.0, 3.0, u_d);
  float m = step(h(floor(gl_FragCoord.xy / cs)), u_d * 1.04);
  gl_FragColor = vec4(col * m, m);
}`;
  let gl = null, uni = {}, video = null, hasVideo = false;
  function initGL() {
    if (gl !== null) return !!gl;
    gl = dc.getContext('webgl', { antialias: false, premultipliedAlpha: true, alpha: true }) || false;
    if (!gl) return false;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    try {
      const pr = gl.createProgram();
      gl.attachShader(pr, sh(gl.VERTEX_SHADER, 'attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }'));
      gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(pr); gl.useProgram(pr);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      ['u_res', 'u_t', 'u_z', 'u_a', 'u_d', 'u_vid', 'u_vasp'].forEach((k) => (uni[k] = gl.getUniformLocation(pr, k)));
      gl.uniform1f(uni.u_vid, 0);
    } catch (e) { console.warn('dream disabled:', e.message); gl = false; return false; }
    // real footage, if it has been added: assets/dream/deepdream.mp4
    fetch('assets/dream/deepdream.mp4', { method: 'HEAD' }).then((res) => {
      if (!res.ok || !(res.headers.get('content-type') || '').includes('video')) return;
      video = Object.assign(document.createElement('video'), { src: 'assets/dream/deepdream.mp4', muted: true, playsInline: true, preload: 'auto', loop: true });
      video.addEventListener('loadeddata', () => {
        const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
        [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach((p) => gl.texParameteri(gl.TEXTURE_2D, p, gl.CLAMP_TO_EDGE));
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.uniform1f(uni.u_vasp, video.videoWidth / video.videoHeight);
        gl.uniform1f(uni.u_vid, 1); hasVideo = true;
      });
    }).catch(() => {});
    return true;
  }

  function state() {
    const vh = innerHeight, r = post.getBoundingClientRect();
    const q = (-r.top) / Math.max(1, r.height - vh);              // 0 when the section reaches the top, 1 when it leaves
    const dissolve = smooth(-0.32, 0.3, q) * (1 - smooth(0.86, 1.0, q));
    return { q, dissolve, dream: smooth(0.1, 0.45, q) * (1 - smooth(0.86, 1.0, q)) };
  }

  let raf = 0, active = false, lastSeek = -1;
  function frame(t) {
    raf = 0;
    const { q, dissolve, dream } = state();
    const amount = Math.max(dissolve * 0.6, dream);
    root.style.setProperty('--dream', amount.toFixed(3));
    hallucinate(amount, t);
    // the page itself smears as it goes
    opera.style.filter = dissolve > 0.01 ? `blur(${(dissolve * 3).toFixed(2)}px) saturate(${(1 + dissolve * 2).toFixed(2)}) hue-rotate(${(dissolve * 140).toFixed(0)}deg)` : '';
    if (dissolve > 0.003 && initGL()) {
      const w = Math.round(innerWidth * 0.5), h = Math.round(innerHeight * 0.5);
      if (dc.width !== w || dc.height !== h) { dc.width = w; dc.height = h; gl.viewport(0, 0, w, h); }
      if (hasVideo && video) {
        if (!reduced && video.duration) {
          const target = clamp(q) * video.duration;
          if (Math.abs(target - lastSeek) > 1 / 24 && !video.seeking) { video.currentTime = target; lastSeek = target; }
        }
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
      }
      gl.uniform2f(uni.u_res, w, h); gl.uniform1f(uni.u_t, reduced ? 0 : t / 1000);
      gl.uniform1f(uni.u_z, q * 5); gl.uniform1f(uni.u_a, dream); gl.uniform1f(uni.u_d, reduced ? dissolve * 0.6 : dissolve);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      dc.style.visibility = 'visible';
    } else dc.style.visibility = 'hidden';
    if (active && !document.hidden && !reduced) raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
  new IntersectionObserver(([e]) => { active = e.isIntersecting; kick(); }, { rootMargin: '100% 0px 20% 0px' }).observe(post);
  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', kick);
  document.addEventListener('visibilitychange', kick);
  kick();
})();
