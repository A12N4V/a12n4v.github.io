// a12n4v.github.io
// 1. Historia: a sticky particle stage that morphs with the timeline, from a
//    sign to Peirce's triad, Saussure's arbor, feedback loops, a spiking
//    neuron, Turing spots, a DNA helix, a protein fold and neural networks.
// 2. After 2023 the page hallucinates: text swaps into DeepDream's dogs and
//    eyes and blurs, and a WebGL layer zooms endlessly into the persona. At
//    the last entry, Homonin, the particles resolve into the figure and the
//    dream fades.
(() => {
  'use strict';

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const rng = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const hash = (i, j) => rng(i * 7919 + j * 104729 + 1)();

  const historia = document.getElementById('historia');
  if (!historia) return;

  // ---- 1. shapes ---------------------------------------------------------
  const N = 1400, S = 320;

  // draw into an S x S canvas, then pick N lit pixels as particle targets
  function sample(draw, seed) {
    const c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
    g.fillStyle = g.strokeStyle = '#fff'; g.lineWidth = 3; g.lineCap = 'round'; g.lineJoin = 'round';
    draw(g);
    const d = g.getImageData(0, 0, S, S).data, lit = [];
    for (let i = 0; i < S * S; i++) if (d[i * 4] > 127) lit.push(i);
    const r = rng(seed), out = new Float32Array(N * 2);
    for (let k = 0; k < N; k++) {
      const i = lit.length ? lit[Math.floor(r() * lit.length)] : 0;
      out[k * 2] = ((i % S) + r()) / S; out[k * 2 + 1] = (Math.floor(i / S) + r()) / S;
    }
    return out;
  }
  const circle = (g, x, y, r, fill) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); fill ? g.fill() : g.stroke(); };
  const line = (g, pts) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); };
  const arrow = (g, x, y, ang, s = 12) => line(g, [[x - s * Math.cos(ang - 0.5), y - s * Math.sin(ang - 0.5)], [x, y], [x - s * Math.cos(ang + 0.5), y - s * Math.sin(ang + 0.5)]]);

  const DRAW = {
    sign: (g) => {
      g.font = `400 ${S * 0.2}px Italiana, serif`; g.textAlign = 'center'; g.fillText('SIGNVM', S / 2, S * 0.56);
      g.lineWidth = 2; line(g, [[S * 0.2, S * 0.64], [S * 0.8, S * 0.64]]);
    },
    triad: (g) => {
      const v = [[S / 2, S * 0.2], [S * 0.2, S * 0.76], [S * 0.8, S * 0.76]];
      line(g, [v[0], v[1], v[2], v[0]]);
      v.forEach(([x, y]) => { g.fillStyle = '#000'; circle(g, x, y, S * 0.075, true); g.fillStyle = '#fff'; circle(g, x, y, S * 0.075); circle(g, x, y, S * 0.025, true); });
      circle(g, S / 2, S * 0.58, 4, true);
    },
    arbor: (g) => {
      g.beginPath(); g.ellipse(S / 2, S / 2, S * 0.28, S * 0.4, 0, 0, Math.PI * 2); g.stroke();
      line(g, [[S * 0.22, S / 2], [S * 0.78, S / 2]]);
      const tree = (x, y, len, ang, d) => { if (d > 5) return; const x2 = x + len * Math.cos(ang), y2 = y + len * Math.sin(ang); line(g, [[x, y], [x2, y2]]); tree(x2, y2, len * 0.7, ang - 0.45, d + 1); tree(x2, y2, len * 0.7, ang + 0.4, d + 1); };
      g.lineWidth = 2.5; tree(S / 2, S * 0.46, S * 0.1, -Math.PI / 2, 0);
      g.font = `italic ${S * 0.13}px "Crimson Pro", serif`; g.textAlign = 'center'; g.fillText('arbor', S / 2, S * 0.72);
    },
    unit: (g) => {
      const cx = S * 0.56, cy = S / 2, r = S * 0.12;
      [0.25, 0.5, 0.75].forEach((y) => { circle(g, S * 0.12, S * y, 6, true); line(g, [[S * 0.12, S * y], [cx - r * 0.95, cy + (S * y - cy) * 0.35]]); });
      circle(g, cx, cy, r);
      g.font = `italic ${S * 0.12}px "Crimson Pro", serif`; g.textAlign = 'center'; g.fillText('θ', cx, cy + S * 0.04);
      line(g, [[cx + r, cy], [S * 0.9, cy]]); arrow(g, S * 0.9, cy, 0, 14);
    },
    loop: (g) => {
      g.beginPath(); g.arc(S / 2, S / 2, S * 0.32, -0.35, Math.PI * 2 - 0.75); g.stroke();
      const a = -0.35, x = S / 2 + S * 0.32 * Math.cos(a), y = S / 2 + S * 0.32 * Math.sin(a); arrow(g, x, y, a + Math.PI / 2, 16);
      g.lineWidth = 2.5; const w = []; for (let i = 0; i <= 60; i++) w.push([S * 0.3 + (i / 60) * S * 0.4, S / 2 + S * 0.05 * Math.sin((i / 60) * Math.PI * 4)]); line(g, w);
    },
    loop2: (g) => {
      [0.14, 0.32, 0.5].forEach((y) => g.strokeRect(S * 0.56, S * y, S * 0.32, S * 0.13));
      [0.7, 0.86].forEach((y) => circle(g, S * 0.48, S * y, S * 0.05));
      g.beginPath(); g.ellipse(S * 0.2, S * 0.76, S * 0.13, S * 0.16, 0, 0, Math.PI * 2); g.stroke();
      line(g, [[S * 0.72, S * 0.27], [S * 0.72, S * 0.32]]); line(g, [[S * 0.72, S * 0.45], [S * 0.72, S * 0.5]]);
      line(g, [[S * 0.72, S * 0.63], [S * 0.72, S * 0.86], [S * 0.53, S * 0.86]]); line(g, [[S * 0.72, S * 0.7], [S * 0.53, S * 0.7]]);
      line(g, [[S * 0.33, S * 0.76], [S * 0.43, S * 0.7]]); line(g, [[S * 0.33, S * 0.8], [S * 0.43, S * 0.86]]);
    },
    spike: (g) => {
      const pts = [], base = S * 0.64;
      for (let i = 0; i <= 400; i++) {
        const x = i / 400, ph = (x * 3) % 1; let y = 0;
        if (ph > 0.3 && ph < 0.36) y = -((ph - 0.3) / 0.06) * 0.42;
        else if (ph >= 0.36 && ph < 0.44) y = -0.42 + ((ph - 0.36) / 0.08) * 0.52;
        else if (ph >= 0.44 && ph < 0.7) y = 0.1 * (1 - (ph - 0.44) / 0.26);
        pts.push([S * 0.06 + x * S * 0.88, base + y * S]);
      }
      line(g, pts); g.lineWidth = 1.5; line(g, [[S * 0.06, S * 0.84], [S * 0.94, S * 0.84]]);
    },
    turing: (g) => {
      const n = 96, U = new Float32Array(n * n).fill(1), V = new Float32Array(n * n), r = rng(52);
      for (let s = 0; s < 14; s++) { const cx = Math.floor(r() * n), cy = Math.floor(r() * n); for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) { const i = ((cy + y + n) % n) * n + ((cx + x + n) % n); U[i] = 0.5; V[i] = 0.25; } }
      const F = 0.0367, K = 0.0649, U2 = new Float32Array(n * n), V2 = new Float32Array(n * n);
      for (let it = 0; it < 2600; it++) {
        for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
          const i = y * n + x, l = y * n + ((x + n - 1) % n), rr = y * n + ((x + 1) % n), u = ((y + n - 1) % n) * n + x, d = ((y + 1) % n) * n + x;
          const uvv = U[i] * V[i] * V[i];
          U2[i] = U[i] + 0.2 * (U[l] + U[rr] + U[u] + U[d] - 4 * U[i]) - uvv + F * (1 - U[i]);
          V2[i] = V[i] + 0.1 * (V[l] + V[rr] + V[u] + V[d] - 4 * V[i]) + uvv - (F + K) * V[i];
        }
        U.set(U2); V.set(V2);
      }
      const cs = S / n;
      for (let i = 0; i < n * n; i++) if (V[i] > 0.2 && Math.hypot((i % n) - n / 2, Math.floor(i / n) - n / 2) < n * 0.46) g.fillRect((i % n) * cs, Math.floor(i / n) * cs, cs, cs);
    },
    eye: (g) => {
      g.beginPath(); g.moveTo(S * 0.1, S / 2); g.quadraticCurveTo(S / 2, S * 0.12, S * 0.9, S / 2); g.quadraticCurveTo(S / 2, S * 0.88, S * 0.1, S / 2); g.stroke();
      [0.16, 0.11, 0.07].forEach((r) => circle(g, S / 2, S / 2, S * r)); circle(g, S / 2, S / 2, S * 0.035, true);
      for (let k = -3; k <= 3; k++) { const a = -Math.PI / 2 + k * 0.28; line(g, [[S / 2 + S * 0.3 * Math.cos(a), S / 2 + S * 0.3 * Math.sin(a) + S * 0.04], [S / 2 + S * 0.38 * Math.cos(a), S / 2 + S * 0.38 * Math.sin(a) + S * 0.04]]); }
    },
    attn: (g) => {
      const n = 7, xs = Array.from({ length: n }, (_, i) => S * (0.14 + (i * 0.72) / (n - 1)));
      xs.forEach((x) => { g.strokeRect(x - 9, S * 0.2, 18, 18); g.strokeRect(x - 9, S * 0.76, 18, 18); });
      g.lineWidth = 1.5; const r = rng(9);
      xs.forEach((x1) => xs.forEach((x2) => { if (r() < 0.45) { g.beginPath(); g.moveTo(x1, S * 0.2 + 18); g.bezierCurveTo(x1, S * 0.5, x2, S * 0.5, x2, S * 0.76); g.stroke(); } }));
    },
    fold: (g) => {
      const r = rng(31), pts = []; let x = S * 0.2, y = S * 0.8, a = -0.8;
      for (let i = 0; i < 260; i++) { a += (r() - 0.5) * 0.5 + 0.035 * Math.sin(i / 9); x += 3.2 * Math.cos(a); y += 3.2 * Math.sin(a); x = clamp(x, S * 0.12, S * 0.88); y = clamp(y, S * 0.12, S * 0.88); const coil = i % 50 < 18 ? 7 * Math.sin(i * 1.3) : 0; pts.push([x + coil * Math.sin(a), y - coil * Math.cos(a)]); }
      g.lineWidth = 3.5; line(g, pts); circle(g, pts[0][0], pts[0][1], 6, true); circle(g, pts[pts.length - 1][0], pts[pts.length - 1][1], 6, true);
    },
    net: (g) => {
      const layers = [4, 6, 6, 3], X = (l) => S * (0.14 + (l * 0.72) / (layers.length - 1)), Y = (n, i) => S * (0.5 + (i - (n - 1) / 2) * 0.13);
      g.lineWidth = 1.2;
      for (let l = 0; l < layers.length - 1; l++) for (let i = 0; i < layers[l]; i++) for (let j = 0; j < layers[l + 1]; j++) line(g, [[X(l), Y(layers[l], i)], [X(l + 1), Y(layers[l + 1], j)]]);
      g.lineWidth = 3; layers.forEach((n, l) => { for (let i = 0; i < n; i++) { g.fillStyle = '#000'; circle(g, X(l), Y(n, i), 9, true); g.fillStyle = '#fff'; circle(g, X(l), Y(n, i), 9); } });
    },
  };

  const shapes = {};
  const helixP = new Float32Array(N * 3);        // t along the helix, strand/rung, position on rung
  { const r = rng(77); for (let k = 0; k < N; k++) { helixP[k * 3] = r(); helixP[k * 3 + 1] = r() < 0.72 ? (r() < 0.5 ? 0 : 1) : 2; helixP[k * 3 + 2] = r(); } }
  const dreamP = new Float32Array(N * 2);
  { const r = rng(5); for (let k = 0; k < N; k++) { dreamP[k * 2] = r(); dreamP[k * 2 + 1] = 0.08 + 0.42 * Math.sqrt(r()); } }

  function target(name, k, t) {
    if (name === 'helix') {
      const u = helixP[k * 3], s = helixP[k * 3 + 1], v = helixP[k * 3 + 2], ph = u * Math.PI * 2 * 2.2 + t * 0.0009;
      const xa = 0.5 + 0.22 * Math.cos(ph), xb = 0.5 + 0.22 * Math.cos(ph + Math.PI), y = 0.08 + 0.84 * u;
      return [s === 0 ? xa : s === 1 ? xb : xa + (xb - xa) * v, y, s === 2 ? 0.5 : Math.sin(ph + (s ? Math.PI : 0))];
    }
    if (name === 'dream') {
      const a = dreamP[k * 2] * Math.PI * 2 + t * 0.00025 * (1 + dreamP[k * 2 + 1] * 3), r = dreamP[k * 2 + 1] * (1 + 0.12 * Math.sin(t * 0.001 + k));
      return [0.5 + r * Math.cos(a + r * 6), 0.5 + r * Math.sin(a + r * 6), 1];
    }
    const arr = shapes[name] || shapes.sign;
    return [arr[k * 2], arr[k * 2 + 1], 1];
  }

  // the figure, for the last entry: pixels of the persona, weighted toward its light
  function sampleFigure(img) {
    const c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d'), h = S * 0.96, w = h * img.naturalWidth / img.naturalHeight;
    g.drawImage(img, (S - w) / 2, S - h, w, h);
    const d = g.getImageData(0, 0, S, S).data, lit = [];
    for (let i = 0; i < S * S; i++) { const a = d[i * 4 + 3], l = (d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2]) / 765; if (a > 140) { lit.push(i); if (l > 0.3) lit.push(i, i, i); } }
    const r = rng(11), out = new Float32Array(N * 2);
    for (let k = 0; k < N; k++) { const i = lit[Math.floor(r() * lit.length)] || 0; out[k * 2] = ((i % S) + r()) / S; out[k * 2 + 1] = (Math.floor(i / S) + r()) / S; }
    return out;
  }

  // ---- 2. stage ---------------------------------------------------------
  const cv = historia.querySelector('.stage__cv'), g = cv.getContext('2d');
  const items = [...historia.querySelectorAll('.timeline > li')];
  const P = new Float32Array(N * 2);
  { const r = rng(3); for (let i = 0; i < N * 2; i++) P[i] = r(); }
  let shape = 'sign', W = 0, H = 0, dpr = 1, inView = false, dream = 0, depth = 0;

  function size() {
    dpr = Math.min(2, devicePixelRatio || 1);
    const r = cv.getBoundingClientRect();
    W = cv.width = Math.max(1, Math.round(r.width * dpr)); H = cv.height = Math.max(1, Math.round(r.height * dpr));
  }

  function drawStage(t) {
    g.clearRect(0, 0, W, H);
    const sz = Math.max(2, Math.round(2 * dpr)), ease = reduced ? 1 : 0.075, jit = dream * 0.004;
    for (let k = 0; k < N; k++) {
      const [tx, ty, z] = target(shape, k, t);
      P[k * 2] += (tx - P[k * 2]) * ease; P[k * 2 + 1] += (ty - P[k * 2 + 1]) * ease;
      const x = P[k * 2] + (jit ? (hash(k, t >> 6) - 0.5) * jit : 0), y = P[k * 2 + 1] + (jit ? (hash(k + 9e5, t >> 6) - 0.5) * jit : 0);
      g.fillStyle = k % 9 === 0 ? '#f97f3a' : z < 0 ? '#5d5750' : '#e8e2d9';
      g.fillRect(Math.round(x * (W - sz)), Math.round(y * (H - sz)), sz, sz);
    }
  }

  function pickActive() {
    const mid = innerHeight * 0.5; let best = null, bd = Infinity;
    for (const el of items) { const r = el.getBoundingClientRect(), d = Math.abs(r.top + r.height / 2 - mid); if (d < bd) { bd = d; best = el; } }
    items.forEach((el) => el.classList.toggle('is-on', el === best));
    const first = items[0].getBoundingClientRect();
    shape = first.top > mid ? 'sign' : (best && best.dataset.shape) || 'sign';
  }

  // ---- 3. the dream -------------------------------------------------------
  const dreamEls = [...historia.querySelectorAll('[data-dream]')], wake = historia.querySelector('[data-wake]');
  function dreamState() {
    if (!dreamEls.length || !wake) return [0, 0];
    const vh = innerHeight, mid = vh * 0.5, r0 = dreamEls[0].getBoundingClientRect(), rl = dreamEls[dreamEls.length - 1].getBoundingClientRect(), rw = wake.getBoundingClientRect();
    const past = mid - r0.top;
    const up = smooth(-vh * 0.15, Math.max(vh * 0.4, (rl.top - r0.top) * 0.75), past);
    const down = 1 - smooth(-vh * 0.3, vh * 0.1, mid - rw.top);
    return [clamp(up * down) * (reduced ? 0.45 : 1), past / vh];
  }

  // text: every word in the dreaming entries becomes a span that can slip
  const VOCAB = ['dog', 'eye', 'eyes', 'pagoda', 'slug', 'bird', 'fur', 'feather', 'temple', 'iris', 'spiral', 'scales', 'dogslug', 'tower', 'snout', 'eye'];
  const words = [];
  historia.querySelectorAll('.ev--dream h3, .ev--dream p').forEach((el) => {
    const text = el.textContent, sr = document.createElement('span'), vis = document.createElement('span');
    sr.className = 'sr'; sr.textContent = text; vis.setAttribute('aria-hidden', 'true');
    text.split(/(\s+)/).forEach((w) => {
      if (/^\s+$/.test(w) || !w) { vis.append(w); return; }
      const s = document.createElement('span'); s.className = 'hw'; s.textContent = w; s.dataset.w = w; vis.append(s); words.push(s);
    });
    el.textContent = ''; el.append(sr, vis);
  });
  let lastBucket = -1;
  function hallucinate(t) {
    const bucket = Math.floor(scrollY / 40) + (reduced ? 0 : Math.floor(t / 420));
    if (bucket === lastBucket && dream < 0.01) return;
    lastBucket = bucket;
    words.forEach((s, i) => {
      const swap = !reduced && hash(i, bucket) < dream * 0.42;
      const w = swap ? VOCAB[Math.floor(hash(i + 3e4, bucket) * VOCAB.length)] : s.dataset.w;
      if (s.textContent !== w) s.textContent = w;
      s.classList.toggle('hw--swap', swap);
      s.style.transform = dream > 0.02 && !reduced ? `translate(${((hash(i, bucket + 1) - 0.5) * dream * 7).toFixed(1)}px, ${((hash(i + 1e4, bucket) - 0.5) * dream * 5).toFixed(1)}px) rotate(${((hash(i + 2e4, bucket) - 0.5) * dream * 6).toFixed(1)}deg)` : '';
    });
  }

  // WebGL: an endless zoom into the persona, warped and recoloured
  const dc = document.querySelector('.dream');
  let gl = null, uni = {}, texReady = false;
  const FRAG = `precision mediump float;
uniform sampler2D u_img; uniform vec2 u_res; uniform float u_t, u_z, u_a, u_asp;
const float K = 1.1631508;
vec3 hueRot(vec3 c, float a) { const vec3 k = vec3(0.57735); float ca = cos(a); return c * ca + cross(k, c) * sin(a) + k * dot(k, c) * (1.0 - ca); }
vec4 img(vec2 q) {
  vec2 uv = vec2(0.5 + q.x * 0.5 / u_asp, 0.36 - q.y * 0.5);
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return vec4(0.0);
  return texture2D(u_img, uv);
}
void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * u_res) / (0.5 * min(u_res.x, u_res.y));
  float a = u_a, t = u_t, ang = u_z * 0.35;
  p = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * p;
  p += a * 0.045 * vec2(sin(p.y * 7.0 + t * 0.9) + 0.5 * sin(p.y * 19.0 - t * 1.3), cos(p.x * 6.0 - t * 0.7) + 0.5 * cos(p.x * 23.0 + t * 1.1));
  float f = fract(u_z);
  vec3 col = vec3(0.0); float acc = 0.0;
  for (int i = 0; i < 6; i++) {
    float m = exp((f - float(i)) * K) * 1.25;
    vec4 c = img(p / m);
    float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
    float w = c.a * smoothstep(0.03, 0.12, l);
    if (i == 0) w *= 1.0 - smoothstep(0.55, 1.0, f);
    col += (1.0 - acc) * w * c.rgb; acc += (1.0 - acc) * w;
  }
  float r = length(p), L = dot(col, vec3(0.3333));
  col = mix(vec3(L), col, 1.0 + 1.6 * a);
  col = hueRot(col, a * (4.0 * r - t * 0.35 + 2.0 * L));
  col += a * 0.28 * (0.5 + 0.5 * cos(38.0 * L - t * 2.0)) * acc * hueRot(vec3(1.0, 0.45, 0.15), r * 3.0 + t * 0.2);
  vec3 bg = 0.5 + 0.5 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + 0.22 * sin(p.x * 5.0 + t * 0.4) + 0.22 * sin(p.y * 6.0 - t * 0.33) + r * 0.5 - t * 0.06));
  bg *= 0.42 * a * (0.55 + 0.45 * sin(r * 26.0 - u_z * 8.0));
  gl_FragColor = vec4(clamp(col + (1.0 - acc) * bg, 0.0, 1.0), 1.0);
}`;
  function initGL() {
    if (gl !== null) return !!gl;
    gl = dc.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false }) || false;
    if (!gl) return false;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    try {
      const pr = gl.createProgram();
      gl.attachShader(pr, sh(gl.VERTEX_SHADER, 'attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }'));
      gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(pr); gl.useProgram(pr);
      const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      ['u_res', 'u_t', 'u_z', 'u_a', 'u_asp'].forEach((n) => (uni[n] = gl.getUniformLocation(pr, n)));
    } catch (e) { console.warn('dream disabled:', e.message); gl = false; return false; }
    const img = new Image();
    img.onload = () => {
      const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach((p) => gl.texParameteri(gl.TEXTURE_2D, p, gl.CLAMP_TO_EDGE));
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.uniform1f(uni.u_asp, img.naturalWidth / img.naturalHeight);
      texReady = true;
      shapes.body = sampleFigure(img);
    };
    img.src = 'assets/img/persona-ignis.webp';
    return true;
  }
  function drawDream(t) {
    dc.style.opacity = dream < 0.004 ? '0' : Math.min(1, dream * 1.15).toFixed(3);
    if (dream < 0.004 || !initGL() || !texReady) return;
    const w = Math.round(innerWidth * 0.5), h = Math.round(innerHeight * 0.5);
    if (dc.width !== w || dc.height !== h) { dc.width = w; dc.height = h; gl.viewport(0, 0, w, h); }
    gl.uniform2f(uni.u_res, w, h); gl.uniform1f(uni.u_t, reduced ? 0 : t / 1000); gl.uniform1f(uni.u_z, Math.max(0, depth) * 0.9); gl.uniform1f(uni.u_a, dream);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  // ---- 4. loop ------------------------------------------------------------
  let raf = 0;
  function frame(t) {
    raf = 0;
    pickActive();
    [dream, depth] = dreamState();
    root.style.setProperty('--dream', dream.toFixed(3));
    hallucinate(t);
    drawDream(t);
    if (inView && !document.hidden) { drawStage(t); if (!reduced || dream > 0.004) raf = requestAnimationFrame(frame); }
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };

  async function start() {
    try { await document.fonts.load(`400 ${S * 0.2}px Italiana`); await document.fonts.load(`italic ${S * 0.13}px "Crimson Pro"`); } catch (_) { /* draw with fallbacks */ }
    Object.keys(DRAW).forEach((k, i) => { if (k !== 'turing') shapes[k] = sample(DRAW[k], 100 + i); });
    size();
    // Turing's spots take a moment to grow, so they are computed when the history is near
    const idle = window.requestIdleCallback || ((f) => setTimeout(f, 200));
    idle(() => { shapes.turing = sample(DRAW.turing, 999); });
    new ResizeObserver(() => { size(); kick(); }).observe(cv);
    new IntersectionObserver(([e]) => { inView = e.isIntersecting; if (inView) initGL(); kick(); }, { rootMargin: '200px 0px' }).observe(historia);
    addEventListener('scroll', kick, { passive: true });
    document.addEventListener('visibilitychange', kick);
    kick();
  }
  start();
})();
