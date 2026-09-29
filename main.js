// a12n4v.github.io
// 1. Origins: three pencil sketches (Delhi, Irvine, San Francisco) are drawn in
//    as the section scrolls: strokes first, then shading, along a fluid front.
// 2. Inspirations: each thinker is a small ink machine, dithered live on paper.
//    Most of them recurse.
// 3. Project cards: public-domain paintings, dithered with an 8x8 Bayer matrix
//    in each card's own ink, on black.
// 4. Seams between light and dark sections are Bayer gradients.
// 5. Post-AI: the page dissolves in blocks into Google's 2015 DeepDream frames,
//    zoomed and cross-faded with the scroll, posterised through the same dither.
//    Text hallucinates, then the page wakes up at the contact.
(() => {
  'use strict';

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const hash = (i, j) => { let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const BAYER = [0, 48, 12, 60, 3, 51, 15, 63, 32, 16, 44, 28, 35, 19, 47, 31, 8, 56, 4, 52, 11, 59, 7, 55, 40, 24, 36, 20, 43, 27, 39, 23, 2, 50, 14, 62, 1, 49, 13, 61, 34, 18, 46, 30, 33, 17, 45, 29, 10, 58, 6, 54, 9, 57, 5, 53, 42, 26, 38, 22, 41, 25, 37, 21].map((b) => (b + 0.5) / 64);
  const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const images = new Map();
  const load = (src) => {
    if (!images.has(src)) images.set(src, new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }));
    return images.get(src);
  };
  const near = (el, cb, margin = '300px 0px') => { const io = new IntersectionObserver((es) => es.forEach((e) => cb(e.isIntersecting, e.target)), { rootMargin: margin }); io.observe(el); return io; };

  // shared GLSL: value noise, fbm and an 8x8 Bayer threshold
  const GLSL_LIB = `
float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i), h(i + vec2(1.0, 0.0)), f.x), mix(h(i + vec2(0.0, 1.0)), h(i + vec2(1.0, 1.0)), f.x), f.y); }
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * n(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return v; }
float b2(vec2 a) { a = floor(a); return fract(a.x * 0.5 + a.y * a.y * 0.75); }
float b8(vec2 a) { return b2(a * 0.25) * 0.0625 + b2(a * 0.5) * 0.25 + b2(a); }`;
  function program(gl, frag) {
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, 'attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }'));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, frag));
    gl.linkProgram(pr); gl.useProgram(pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = {};
    for (let i = 0, k = gl.getProgramParameter(pr, gl.ACTIVE_UNIFORMS); i < k; i++) { const name = gl.getActiveUniform(pr, i).name; u[name] = gl.getUniformLocation(pr, name); }
    return u;
  }
  function texture(gl, img) {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach((p) => gl.texParameteri(gl.TEXTURE_2D, p, gl.CLAMP_TO_EDGE));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    return t;
  }

  // ---- 1. origins -----------------------------------------------------------
  (() => {
    const sec = document.getElementById('origins');
    if (!sec) return;
    const cv = sec.querySelector('.origins__cv'), plates = [...sec.querySelectorAll('.origins__plates img')], stops = [...sec.querySelectorAll('.origins__route li')], route = sec.querySelector('.origins__route');
    const FOCUS = [[0.5, 0.42], [0.42, 0.52], [0.4, 0.42]];
    // scroll progress through the pinned section -> scene position (-1 blank, 0 Delhi, 1 Irvine, 2 SF)
    const KEYS = [[0, -1], [0.1, 0], [0.28, 0], [0.48, 1], [0.6, 1], [0.8, 2], [1, 2]];
    const sceneAt = (q) => { if (q <= 0) return -1; for (let i = 1; i < KEYS.length; i++) if (q <= KEYS[i][0]) { const [a, sa] = KEYS[i - 1], [b, sb] = KEYS[i]; return sa + (sb - sa) * smooth(a, b, q); } return 2; };

    const gl = cv.getContext('webgl', { antialias: false, alpha: false });
    let u = null, tex = [], shown = -2, intro = 0, s = -1, last = 0, active = false, raf = 0;
    const setStop = (k) => {
      if (k === shown) return; shown = k;
      stops.forEach((li, i) => li.classList.toggle('is-on', i === k));
      plates.forEach((im, i) => im.classList.toggle('is-on', i === k));
    };
    if (gl) {
      try {
        u = program(gl, `precision mediump float;
uniform vec2 u_res; uniform float u_t, u_x, u_ha, u_px; uniform sampler2D u_a, u_b; uniform vec3 u_fa, u_fb;
${GLSL_LIB}
vec2 fit(vec2 uv, vec3 f) {
  float sa = u_res.x / u_res.y, ia = 1.5;
  vec2 s = sa > ia ? vec2(1.0, ia / sa) : vec2(sa / ia, 1.0);   // cover
  if (s.x < 0.62) s *= 0.62 / s.x;                               // portrait: show more, let paper fill the rest
  s /= f.z;
  vec2 c = vec2(clamp(f.x, s.x * 0.5, 1.0 - s.x * 0.5), s.y < 1.0 ? clamp(f.y, s.y * 0.5, 1.0 - s.y * 0.5) : 0.5);
  return c + (uv - 0.5) * s;
}
float gray(sampler2D t, vec2 uv) { if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return 1.0; return texture2D(t, uv).r; }
void main() {
  vec2 uv = vec2(gl_FragCoord.x / u_res.x, 1.0 - gl_FragCoord.y / u_res.y);
  vec2 fl = vec2(fbm(uv * 3.0 + vec2(u_t * 0.04, 0.0)), fbm(uv * 3.0 + vec2(5.2, 1.3) - u_t * 0.03));
  float gb0 = gray(u_b, fit(uv, u_fb));
  // when each pixel arrives: dark strokes first, paper last, along a flowing front
  float T = 0.5 * gb0 + 0.5 * fbm(uv * vec2(4.0, 3.0) + 2.0 * fl + u_t * 0.02);
  float W = 0.16, front = clamp((u_x * (1.0 + W) - T) / W, 0.0, 1.0), band = front * (1.0 - front) * 4.0;
  vec2 warp = (fl - 0.5) * 0.035 * band;
  float gb = gray(u_b, fit(uv + warp, u_fb));
  float ga = u_ha > 0.5 ? gray(u_a, fit(uv + warp * 0.6, u_fa)) : 1.0;
  float m = step(b8(gl_FragCoord.xy / u_px), front);
  float g = mix(ga, gb, m);
  // pencil hatching runs ahead of the front, underdrawing what is coming
  float hatch = step(0.62, fract((gl_FragCoord.x + gl_FragCoord.y) / (4.0 * u_px)));
  g = mix(g, min(g, gb * 0.8 + 0.2), hatch * band * (1.0 - m));
  gl_FragColor = vec4(mix(vec3(0.047, 0.039, 0.035), vec3(0.922, 0.902, 0.863), g), 1.0);
}`);
        gl.uniform1i(u.u_a, 0); gl.uniform1i(u.u_b, 1);
      } catch (e) { console.warn('origins: no shader', e.message); u = null; }
    }
    if (u) Promise.all(plates.map((im) => load(im.currentSrc || im.src))).then((ims) => { tex = ims.map((im) => texture(gl, im)); sec.classList.add('gl'); kick(); }).catch(() => {});

    function frame(now) {
      raf = 0;
      const dt = Math.min(100, now - (last || now)); last = now;
      const vh = innerHeight, r = sec.getBoundingClientRect();
      const q = -r.top / Math.max(1, r.height - vh);
      // Delhi sketches itself in once the section arrives; after that, the scroll leads
      if (r.top < vh * 0.5) intro = Math.min(1, intro + dt / 4200);
      const target = Math.max(sceneAt(q), -1 + intro);
      s = reduced ? target : s + (target - s) * (1 - Math.exp(-dt / 420));
      const k = Math.round(clamp(s, 0, 2));
      setStop(k);
      route.style.setProperty('--route', clamp(s / 2).toFixed(3));
      if (u && tex.length) {
        const scale = Math.min(devicePixelRatio || 1, 1.5), w = Math.round(cv.clientWidth * scale), h = Math.round(cv.clientHeight * scale);
        if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; gl.viewport(0, 0, w, h); }
        let i = Math.floor(s), x = s - i; if (i >= 2) { i = 1; x = 1; }
        const zoom = (j) => 1 + 0.035 * clamp(s - j + 1, 0, 2);   // a slow push-in on each sketch
        gl.uniform2f(u.u_res, w, h); gl.uniform1f(u.u_t, reduced ? 0 : now / 1000); gl.uniform1f(u.u_x, x); gl.uniform1f(u.u_px, 2 * scale);
        gl.uniform1f(u.u_ha, i >= 0 ? 1 : 0);
        if (i >= 0) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex[i]); gl.uniform3f(u.u_fa, ...FOCUS[i], zoom(i)); }
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tex[i + 1]); gl.uniform3f(u.u_fb, ...FOCUS[i + 1], zoom(i + 1));
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
      if (active && !document.hidden) raf = requestAnimationFrame(frame);
    }
    const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
    near(sec, (on) => { active = on; last = 0; kick(); }, '50% 0px');
    addEventListener('resize', kick);
    document.addEventListener('visibilitychange', kick);
  })();

  // ---- 2. inspirations: ink machines ---------------------------------------
  // Each draws in gray (ink) and red (accent) on a white offscreen canvas; the
  // result is thresholded against the Bayer matrix into ink, accent and paper.
  const TAU = Math.PI * 2;
  const rnd = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);   // Park-Miller
  const ACC = (a) => `rgba(255,0,0,${a})`, GRAY = (a) => `rgba(0,0,0,${a})`;
  const unit = (g, w, h, k = 0.46) => { const S = Math.min(w, h) * k; g.setTransform(S, 0, 0, S, w / 2, h / 2); g.lineWidth = 1 / S; return S; };
  const circle = (g, x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, TAU); };
  const seg = (g, pts) => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.stroke(); };
  const along = (pts, f) => { // point at fraction f of a polyline's length
    const L = []; let tot = 0;
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); L.push(d); tot += d; }
    let d = ((f % 1) + 1) % 1 * tot;
    for (let i = 0; i < L.length; i++) { if (d <= L[i]) { const k = d / L[i]; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k]; } d -= L[i]; }
    return pts[pts.length - 1];
  };
  const C = { mul: (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]], add: (a, b) => [a[0] + b[0], a[1] + b[1]], sub: (a, b) => [a[0] - b[0], a[1] - b[1]], div: (a, b) => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; }, pow: (a, p) => { const r = Math.hypot(a[0], a[1]) ** p, th = Math.atan2(a[1], a[0]) * p; return [r * Math.cos(th), r * Math.sin(th)]; } };

  const EMB = {
    // Beer: the Viable System Model. Every operation (S1) is itself a viable
    // system; the view zooms into one of them forever.
    beer: (() => {
      const K = 0.12, OPS = [[-0.34, 0.06], [-0.34, 0.44], [-0.34, 0.82]], R = 0.15, c = OPS[1], p = [c[0] / (1 - K), c[1] / (1 - K)];
      function glyph(g, px) {
        const lw = 1 / px; g.lineWidth = lw;
        g.strokeStyle = GRAY(1);
        [[-0.92], [-0.62], [-0.32]].forEach(([y], i) => { g.fillStyle = GRAY(0.1 + i * 0.08); g.fillRect(0.12, y, 0.44, 0.22); g.strokeRect(0.12, y, 0.44, 0.22); });
        seg(g, [[0.34, -0.7], [0.34, -0.62]]); seg(g, [[0.34, -0.4], [0.34, -0.32]]); seg(g, [[0.34, -0.1], [0.34, 0.9]]);
        OPS.forEach(([x, y], i) => {
          if (i === 1) g.strokeStyle = ACC(1);             // the one the view descends into
          circle(g, x, y, R); g.stroke(); g.strokeStyle = GRAY(1);
          g.strokeRect(0.24, y - 0.08, 0.2, 0.16);                        // its management
          seg(g, [[x + R, y], [0.24, y]]);
          g.setLineDash([lw * 2, lw * 2]); circle(g, -0.78, y, 0.13); g.stroke(); g.setLineDash([]); // its environment
          seg(g, [[-0.65, y], [x - R, y]]);
        });
        g.beginPath(); g.moveTo(0.44, 0.06); g.lineTo(0.58, 0.25); g.lineTo(0.44, 0.44); g.lineTo(0.58, 0.63); g.lineTo(0.44, 0.82); g.stroke(); // S2
        g.strokeRect(-0.97, -0.97, 1.64, 1.94);
      }
      function level(g, px, depth) {
        glyph(g, px);
        if (depth <= 0 || px * K < 5) return;
        OPS.forEach(([x, y]) => { g.save(); g.translate(x, y); g.scale(K, K); level(g, px * K, depth - 1); g.restore(); });
      }
      return { draw(g, w, h, t) {
        const S0 = Math.min(w, h) * 0.44, ph = (t / 6.5) % 1, Z = K ** -ph;
        g.setTransform(S0 * Z, 0, 0, S0 * Z, w / 2 + S0 * p[0] * (1 - Z) - S0 * 0.1, h / 2 + S0 * p[1] * (1 - Z) - S0 * 0.05);
        let px = S0 * Z;
        for (let j = 0; j < 2; j++) { g.scale(1 / K, 1 / K); g.translate(-c[0], -c[1]); px /= K; }  // the systems this one sits inside
        level(g, px, 5);
      } };
    })(),

    // Wiener: a feedback loop, and the damped response it settles into.
    wiener: { draw(g, w, h, t) {
      unit(g, w, h, 0.44);
      g.strokeStyle = GRAY(1); const lw = g.lineWidth;
      const ph = (t % 5.5) / 4.5;
      g.setLineDash([lw * 2, lw * 3]); seg(g, [[-1.25, -0.72], [1.25, -0.72]]); g.setLineDash([]);
      seg(g, [[-1.25, -0.2], [1.25, -0.2]]);
      g.beginPath();
      for (let i = 0; i <= 120 * Math.min(1, ph); i++) { const x = -1.25 + (i / 120) * 2.5, tau = (i / 120) * 3.2, y = -0.2 - 0.52 * (1 - Math.exp(-1.4 * tau) * Math.cos(5.5 * tau)); i ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke();
      const loop = [[-1.0, 0.36], [-0.72, 0.36], [-0.3, 0.36], [0.05, 0.36], [0.5, 0.36], [0.85, 0.36], [0.85, 0.78], [-1.0, 0.78], [-1.0, 0.46]];
      circle(g, -1.0, 0.36, 0.1); g.stroke(); seg(g, [[-1.07, 0.36], [-0.93, 0.36]]); seg(g, [[-1.0, 0.29], [-1.0, 0.43]]);
      g.fillStyle = GRAY(0.14); g.fillRect(-0.72, 0.2, 0.42, 0.32); g.strokeRect(-0.72, 0.2, 0.42, 0.32);
      g.fillStyle = GRAY(0.28); g.fillRect(0.05, 0.2, 0.45, 0.32); g.strokeRect(0.05, 0.2, 0.45, 0.32);
      seg(g, [[-0.9, 0.36], [-0.72, 0.36]]); seg(g, [[-0.3, 0.36], [0.05, 0.36]]); seg(g, [[0.5, 0.36], [1.25, 0.36]]);
      seg(g, [[0.85, 0.36], [0.85, 0.78], [-1.0, 0.78], [-1.0, 0.46]]);
      seg(g, [[1.15, 0.3], [1.25, 0.36], [1.15, 0.42]]);
      for (let k = 0; k < 4; k++) { const [x, y] = along(loop, t * 0.3 - k * 0.02); g.fillStyle = ACC(1 - k * 0.25); circle(g, x, y, 0.06 - k * 0.01); g.fill(); }
    } },

    // Ashby: the homeostat. Four coupled units; when one is pushed out of
    // bounds its uniselector re-wires it at random, until the whole settles.
    ashby: { init() { const r = rnd(7); return { r, x: [0.3, -0.2, 0.1, -0.4], W: Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => (r() - 0.5) * 2.4)), out: [0, 0, 0, 0], flash: [0, 0, 0, 0], kick: 0 }; },
      draw(g, w, h, t, st, dt) {
        const { x, W, out, flash, r } = st;
        st.kick += dt; if (st.kick > 7) { st.kick = 0; x[Math.floor(r() * 4)] += (r() - 0.5) * 2.2; }  // a disturbance now and then
        for (let s = 0; s < 3; s++) {
          const nx = x.map((xi, i) => xi + (dt / 3) * (-0.9 * xi + W[i].reduce((a, wij, j) => a + wij * x[j], 0) + (r() - 0.5) * 0.3));
          nx.forEach((v, i) => {
            x[i] = clamp(v, -1.3, 1.3);
            out[i] = Math.abs(x[i]) > 1 ? out[i] + dt / 3 : 0;
            if (out[i] > 0.35) { W[i] = W[i].map(() => (r() - 0.5) * 2.4); out[i] = 0; flash[i] = 1; }
          });
        }
        unit(g, w, h, 0.46); g.strokeStyle = GRAY(1); const lw = g.lineWidth;
        const P = [[-0.62, -0.46], [0.62, -0.46], [-0.62, 0.5], [0.62, 0.5]];
        g.setLineDash([lw * 1.5, lw * 2.5]);
        for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) seg(g, [P[i], P[j]]);
        g.setLineDash([]);
        P.forEach(([cx, cy], i) => {
          flash[i] = Math.max(0, flash[i] - dt * 1.2);
          g.fillStyle = '#fff'; g.fillRect(cx - 0.4, cy - 0.34, 0.8, 0.68);
          if (flash[i] > 0) { g.fillStyle = ACC(flash[i] * 0.7); g.fillRect(cx - 0.4, cy - 0.34, 0.8, 0.68); }
          g.strokeRect(cx - 0.4, cy - 0.34, 0.8, 0.68);
          g.fillStyle = GRAY(0.12); g.beginPath(); g.arc(cx, cy + 0.16, 0.3, Math.PI, 0); g.closePath(); g.fill(); g.stroke();
          g.setLineDash([lw, lw * 2]); g.beginPath(); g.arc(cx, cy + 0.16, 0.2, Math.PI * 1.25, Math.PI * 1.75); g.stroke(); g.setLineDash([]);
          const a = -Math.PI / 2 + x[i] * 1.05; g.lineWidth = lw * 2; seg(g, [[cx, cy + 0.16], [cx + Math.cos(a) * 0.28, cy + 0.16 + Math.sin(a) * 0.28]]); g.lineWidth = lw;
          circle(g, cx, cy + 0.16, 0.035); g.fillStyle = GRAY(1); g.fill();
        });
      } },

    // von Foerster: squares turning inside squares toward a fixed point, an
    // eigenform: what stays the same under its own recursion.
    foerster: { draw(g, w, h, t) {
      const S = unit(g, w, h, 0.5), a = 0.09, r = Math.hypot(a, 1 - a), d = Math.atan2(a, 1 - a);
      const ph = (t * 0.45) % 1, cyc = Math.floor(t * 0.45), R0 = Math.hypot(w, h) / S * 0.75;
      for (let i = 0; i < 70; i++) {
        const R = R0 * r ** (i - ph); if (R * S < 0.6) break;
        const th = d * (i - ph) + Math.PI / 4 + t * 0.08, id = i + cyc;
        g.beginPath(); for (let k = 0; k < 4; k++) { const an = th + (k * Math.PI) / 2; k ? g.lineTo(R * Math.cos(an), R * Math.sin(an)) : g.moveTo(R * Math.cos(an), R * Math.sin(an)); } g.closePath();
        g.fillStyle = id % 11 === 0 ? ACC(0.55) : ['#fff', GRAY(0.12), GRAY(0.3)][id % 3]; g.fill();
        g.strokeStyle = GRAY(1); g.stroke();
      }
    } },

    // Peirce: sign, object, interpretant. Each interpretant is the sign of the
    // next triad, so meaning never stops; the view follows it inward.
    peirce: (() => {
      const S = [0, -0.72], O = [-0.82, 0.52], I = [0.82, 0.52], A = [0.56 * Math.cos(2.35), 0.56 * Math.sin(2.35)];
      const f = (z) => C.add(I, C.mul(A, C.sub(z, S))), fi = (z) => C.add(S, C.div(C.sub(z, I), A));
      const P = C.div(C.sub(I, C.mul(A, S)), C.sub([1, 0], A));
      return { draw(g, w, h, t) {
        g.setTransform(1, 0, 0, 1, 0, 0);
        const s0 = Math.min(w, h) * 0.34, ph = (t / 5) % 1, Z = C.pow(A, -ph);
        const scr = (z) => { const v = C.mul(Z, C.sub(z, P)); return [w / 2 + v[0] * s0, h / 2 + v[1] * s0]; };
        let tri = [S, O, I]; for (let k = 0; k < 3; k++) tri = tri.map(fi);
        let sc = Math.hypot(Z[0], Z[1]) * s0 / 0.56 ** 3;
        for (let lvl = -3; lvl < 12; lvl++, tri = tri.map(f), sc *= 0.56) {
          if (sc < 1) break;
          const [s, o, i] = tri.map(scr), rr = clamp(sc * 0.08, 0.8, 5);
          if (sc > Math.hypot(w, h) * 6) continue;
          g.lineWidth = 1; g.strokeStyle = GRAY(1);
          g.fillStyle = GRAY(0.1); g.beginPath(); g.moveTo(...s); g.lineTo(...o); g.lineTo(...i); g.closePath(); g.fill(); g.stroke();
          circle(g, ...s, rr); g.fillStyle = GRAY(1); g.fill();
          circle(g, ...o, rr); g.fillStyle = '#fff'; g.fill(); g.stroke();
          circle(g, ...i, rr); g.fillStyle = ACC(1); g.fill();
        }
      } };
    })(),

    // Saussure: the sign as a two-sided thing; the concept above the bar, the
    // sound-image below. The concept is itself a recursion.
    saussure: { draw(g, w, h, t) {
      const S = unit(g, w, h, 0.46); const lw = g.lineWidth; g.strokeStyle = GRAY(1);
      g.beginPath(); g.ellipse(0, 0, 0.6, 0.94, 0, 0, TAU); g.stroke(); seg(g, [[-0.6, 0], [0.6, 0]]);
      const tree = (x, y, a, len, d) => {
        const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
        g.lineWidth = lw * Math.max(1, d * 0.45); seg(g, [[x, y], [x2, y2]]);
        if (d > 1) { const sw = 0.42 + 0.06 * Math.sin(t * 0.9 + d); tree(x2, y2, a - sw, len * 0.72, d - 1); tree(x2, y2, a + sw * 0.85, len * 0.7, d - 1); }
        else { g.fillStyle = GRAY(0.5); circle(g, x2, y2, 0.02); g.fill(); }
      };
      tree(0, -0.06, -Math.PI / 2 + 0.03 * Math.sin(t * 0.7), 0.24, 7);
      g.lineWidth = lw;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = GRAY(1); g.font = `italic ${Math.round(S * 0.3)}px "Crimson Pro", Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('arbor', w / 2, h / 2 + S * 0.44);
      unit(g, w, h, 0.46);
      seg(g, [[-0.82, 0.62], [-0.82, -0.62]]); seg(g, [[-0.88, -0.52], [-0.82, -0.62], [-0.76, -0.52]]);
      seg(g, [[0.82, -0.62], [0.82, 0.62]]); seg(g, [[0.76, 0.52], [0.82, 0.62], [0.88, 0.52]]);
      const k = (t * 0.4) % 1; g.fillStyle = ACC(1);
      circle(g, -0.82, 0.62 - k * 1.24, 0.05); g.fill(); circle(g, 0.82, -0.62 + k * 1.24, 0.05); g.fill();
    } },

    // von Uexküll: the functional circle. Perception runs from the object to
    // the subject's receptor, action from its effector back to the object.
    uexkull: { draw(g, w, h, t) {
      unit(g, w, h, 0.44); g.strokeStyle = GRAY(1); const lw = g.lineWidth;
      const k = (t * 0.22) % 1;
      const sub = [-1.25, -0.55, 0.85, 1.1], obj = [0.45, -0.45, 0.75, 0.9];
      g.fillStyle = GRAY(k < 0.5 && k > 0.38 ? 0.35 : 0.14); g.fillRect(sub[0] + 0.12, sub[1] + 0.12, 0.61, 0.36); g.strokeRect(sub[0] + 0.12, sub[1] + 0.12, 0.61, 0.36);
      g.fillStyle = GRAY(k > 0.5 && k < 0.6 ? 0.35 : 0.14); g.fillRect(sub[0] + 0.12, 0.07, 0.61, 0.36); g.strokeRect(sub[0] + 0.12, 0.07, 0.61, 0.36);
      g.strokeRect(...sub); seg(g, [[sub[0], 0], [sub[0] + sub[2], 0]]);
      g.fillStyle = k > 0.88 || k < 0.05 ? ACC(0.6) : GRAY(0.05); g.fillRect(...obj); g.strokeRect(...obj);
      g.setLineDash([lw * 2, lw * 2]); seg(g, [[obj[0], 0], [obj[0] + obj[2], 0]]); g.setLineDash([]);
      const top = [], bot = [];
      for (let i = 0; i <= 30; i++) { const s = i / 30; top.push([0.82 - 1.64 * s, -0.45 - Math.sin(s * Math.PI) * 0.5 - (1 - s) * 0 + s * -0.1]); bot.push([-0.82 + 1.64 * s, 0.55 + Math.sin(s * Math.PI) * 0.5 - s * 0.1]); }
      seg(g, top); seg(g, bot);
      seg(g, [[-0.74, -0.62], [-0.82, -0.55], [-0.74, -0.5]]); seg(g, [[0.72, 0.52], [0.82, 0.45], [0.72, 0.38]]);
      const loop = [...top, [-0.82, -0.2], [-0.82, 0.3], ...bot, [0.82, 0.2], [0.82, -0.35]];
      for (let j = 0; j < 4; j++) { const [x, y] = along(loop, k - j * 0.012); g.fillStyle = ACC(1 - j * 0.22); circle(g, x, y, 0.06 - j * 0.008); g.fill(); }
    } },

    // Eco: the labyrinth, carved by a recursive backtracker, then solved.
    eco: { init(w, h) {
        const cs = Math.max(6, Math.floor(Math.min(w / 14, h / 10))), cols = Math.floor((w - 4) / cs), rows = Math.floor((h - 4) / cs);
        const walls = Array.from({ length: cols * rows }, () => [1, 1]), seen = new Uint8Array(cols * rows); seen[0] = 1;
        return { cs, cols, rows, walls, seen, stack: [0], acc: 0, phase: 0, path: null, hold: 0, r: rnd(Math.floor(performance.now()) % 9973 + 1) };
      },
      draw(g, w, h, t, st, dt) {
        const { cs, cols, rows, walls, seen, stack, r } = st, N = cols * rows;
        const nb = (c) => { const x = c % cols, y = (c / cols) | 0, o = []; if (x > 0) o.push(c - 1); if (x < cols - 1) o.push(c + 1); if (y > 0) o.push(c - cols); if (y < rows - 1) o.push(c + cols); return o; };
        const open = (a, b) => { const lo = Math.min(a, b), hi = Math.max(a, b); if (hi - lo === 1) walls[lo][0] = 0; else walls[lo][1] = 0; };
        st.acc += dt;
        while (st.phase === 0 && st.acc > 0.025) {
          st.acc -= 0.025;
          if (!stack.length) { st.phase = 1; break; }
          const c = stack[stack.length - 1], n = nb(c).filter((k) => !seen[k]);
          if (!n.length) { stack.pop(); continue; }
          const k = n[Math.floor(r() * n.length)]; open(c, k); seen[k] = 1; stack.push(k);
        }
        if (st.phase === 1 && !st.path) { // solve: breadth-first from the entrance to the far corner
          const prev = new Int32Array(N).fill(-1), q = [0]; prev[0] = 0;
          const passable = (a, b) => { const lo = Math.min(a, b), hi = Math.max(a, b); return hi - lo === 1 ? !walls[lo][0] : !walls[lo][1]; };
          while (q.length) { const c = q.shift(); for (const k of nb(c)) if (prev[k] < 0 && passable(c, k)) { prev[k] = c; q.push(k); } }
          const path = []; for (let c = N - 1; c !== 0; c = prev[c]) path.push(c); path.push(0); st.path = path.reverse(); st.acc = 0;
        }
        if (st.phase === 1) { st.hold += dt; if (st.hold > st.path.length * 0.05 + 3) Object.assign(st, EMB.eco.init(w, h)); }
        g.setTransform(1, 0, 0, 1, Math.floor((w - cols * cs) / 2) + 0.5, Math.floor((h - rows * cs) / 2) + 0.5);
        g.fillStyle = GRAY(0.08);
        for (let c = 0; c < N; c++) if (seen[c]) g.fillRect((c % cols) * cs, ((c / cols) | 0) * cs, cs, cs);
        g.strokeStyle = GRAY(1); g.lineWidth = 1; g.beginPath();
        for (let c = 0; c < N; c++) { const x = (c % cols) * cs, y = ((c / cols) | 0) * cs; if (walls[c][0] && c % cols < cols - 1) { g.moveTo(x + cs, y); g.lineTo(x + cs, y + cs); } if (walls[c][1] && y / cs < rows - 1) { g.moveTo(x, y + cs); g.lineTo(x + cs, y + cs); } }
        g.stroke(); g.strokeRect(0, 0, cols * cs, rows * cs);
        g.fillStyle = ACC(1);
        if (st.phase === 0 && stack.length) { const c = stack[stack.length - 1]; g.fillRect((c % cols) * cs + 2, ((c / cols) | 0) * cs + 2, cs - 4, cs - 4); }
        if (st.path) {
          const n = Math.min(st.path.length, Math.floor(st.hold / 0.05) + 1);
          g.strokeStyle = ACC(1); g.lineWidth = Math.max(1, cs * 0.3); g.beginPath();
          for (let i = 0; i < n; i++) { const c = st.path[i], x = (c % cols) * cs + cs / 2, y = ((c / cols) | 0) * cs + cs / 2; i ? g.lineTo(x, y) : g.moveTo(x, y); }
          g.stroke(); g.lineWidth = 1;
        }
      } },

    // Turing: Gray-Scott reaction-diffusion; spots grow and divide.
    turing: { init(w, h) {
        const n = w * h, U = new Float32Array(n).fill(1), V = new Float32Array(n), r = rnd(3);
        const st = { U, V, U2: new Float32Array(n), V2: new Float32Array(n), r, clock: 0, age: 0, id: null };
        for (let k = 0; k < 7; k++) EMB.turing.seed(st, w, h);
        return st;
      },
      seed(st, w, h) { const { U, V, r } = st, cx = Math.floor(r() * w), cy = Math.floor(r() * h), s = 3 + Math.floor(r() * 3);
        for (let y = -s; y <= s; y++) for (let x = -s; x <= s; x++) { const i = ((cy + y + h) % h) * w + ((cx + x + w) % w); U[i] = 0.5; V[i] = 0.25 + r() * 0.05; } },
      draw(g, w, h, t, st, dt) {
        const F = 0.0367, k = 0.0649;
        st.clock += dt; st.age += dt;
        if (st.clock > 6) { st.clock = 0; EMB.turing.seed(st, w, h); }
        if (st.age > 70) Object.assign(st, EMB.turing.init(w, h));
        for (let it = 0; it < 8; it++) {
          const { U, V, U2, V2 } = st;
          for (let y = 0; y < h; y++) {
            const yu = ((y - 1 + h) % h) * w, yd = ((y + 1) % h) * w, yc = y * w;
            for (let x = 0; x < w; x++) {
              const xl = (x - 1 + w) % w, xr = (x + 1) % w, i = yc + x, u = U[i], v = V[i];
              const lu = U[yc + xl] + U[yc + xr] + U[yu + x] + U[yd + x] - 4 * u, lv = V[yc + xl] + V[yc + xr] + V[yu + x] + V[yd + x] - 4 * v, uvv = u * v * v;
              U2[i] = u + (0.2 * lu - uvv + F * (1 - u)); V2[i] = v + (0.1 * lv + uvv - (F + k) * v);
            }
          }
          st.U = U2; st.U2 = U; st.V = V2; st.V2 = V;
        }
        if (!st.id || st.id.width !== w) st.id = g.createImageData(w, h);
        const d = st.id.data, V = st.V;
        for (let i = 0; i < w * h; i++) { const on = clamp(V[i] * 3.2); const c = 255 * (1 - on); d[i * 4] = c; d[i * 4 + 1] = c; d[i * 4 + 2] = c; d[i * 4 + 3] = 255; }
        g.setTransform(1, 0, 0, 1, 0, 0); g.putImageData(st.id, 0, 0);
      } },

    // von Neumann: a one-dimensional automaton; from a single live cell, rules
    // 90 and 150 draw Sierpinski's triangle, a picture that contains itself.
    neumann: { init(w, h) { const cols = Math.floor(w / 2), rows = Math.floor(h / 2), row = new Uint8Array(cols); row[cols >> 1] = 1; return { cols, rows, hist: [row], acc: 0, gen: 0, rule: 90, ri: 0 }; },
      draw(g, w, h, t, st, dt) {
        const RULES = [90, 150, 18, 90, 105];
        st.acc += dt;
        while (st.acc > 0.07) {
          st.acc -= 0.07;
          const a = st.hist[st.hist.length - 1], b = new Uint8Array(st.cols);
          for (let x = 0; x < st.cols; x++) b[x] = (st.rule >> ((a[(x - 1 + st.cols) % st.cols] << 2) | (a[x] << 1) | a[(x + 1) % st.cols])) & 1;
          st.hist.push(b); if (st.hist.length > st.rows) st.hist.shift();
          if (++st.gen > st.rows * 2.2) { const n = EMB.neumann.init(w, h); n.ri = (st.ri + 1) % RULES.length; n.rule = RULES[n.ri]; Object.assign(st, n); }
        }
        g.setTransform(1, 0, 0, 1, 0, 0);
        st.hist.forEach((row, y) => {
          const last = y === st.hist.length - 1; g.fillStyle = last ? ACC(1) : GRAY(1);
          for (let x = 0; x < st.cols; x++) if (row[x]) g.fillRect(x * 2, y * 2, 2, 2);
        });
      } },

    // D'Arcy Thompson: a nautilus grows by adding chambers of the same shape,
    // so zooming by one chamber gives back the same shell.
    darcy: { draw(g, w, h, t) {
      g.setTransform(1, 0, 0, 1, 0, 0);
      const N = 13, D = TAU / N, b = Math.log(3.1) / TAU, ph = (t * 0.3) % 1, cyc = Math.floor(t * 0.3);
      const s0 = Math.min(w, h) * 0.03, cx = w * 0.5, cy = h * 0.52, big = Math.hypot(w, h);
      const P = (th) => { const r = s0 * Math.exp(b * (th + D * ph)); const a = th + D * ph; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
      // a septum: the curved wall from the outer whorl at th to the whorl inside it
      const sept = (th) => { const A = P(th), B = P(th - TAU), T = P(th - D * 0.6); return [A, B, [(A[0] + B[0]) / 2 + (T[0] - A[0]) * 0.55, (A[1] + B[1]) / 2 + (T[1] - A[1]) * 0.55]]; };
      for (let k = -60; k < 60; k++) {
        const t0 = k * D, t1 = t0 + D;
        if (s0 * Math.exp(b * (t0 - TAU + D * ph)) > big) break;
        if (s0 * Math.exp(b * (t1 + D * ph)) < 1) continue;
        const [a0, b0, c0] = sept(t0), [a1, b1, c1] = sept(t1);
        g.beginPath(); g.moveTo(...a0);
        for (let i = 1; i <= 8; i++) g.lineTo(...P(t0 + (D * i) / 8));
        g.quadraticCurveTo(...c1, ...b1);
        for (let i = 7; i >= 0; i--) g.lineTo(...P(t0 - TAU + (D * i) / 8));
        g.quadraticCurveTo(...c0, ...a0);
        const id = k + cyc;
        g.fillStyle = ((id % N) + N) % N === 0 ? ACC(0.5) : [GRAY(0.05), GRAY(0.22), GRAY(0.12)][((id % 3) + 3) % 3]; g.fill();
        g.strokeStyle = GRAY(1); g.lineWidth = 1; g.stroke();
      }
    } },

    // Cajal: a pyramidal neuron, grown by recursive branching; now and then a
    // spike runs down the axon.
    cajal: { init() { return { seed: 11, age: 0 }; },
      draw(g, w, h, t, st, dt) {
        st.age += dt; if (st.age > 13) { st.age = 0; st.seed = (st.seed * 7 + 3) % 997; }
        const S = unit(g, w, h, 0.5), lw = g.lineWidth, grow = reduced ? 1 : clamp(st.age / 6);
        const r = (id, k) => hash(id * 7 + k, st.seed);   // keyed by branch, so growth never reshuffles the tree
        g.strokeStyle = GRAY(1);
        const branch = (id, x, y, a, len, d, D, start) => {
          const span = 0.9 / D, f = clamp((grow - start) / span); if (f <= 0) return;
          const aa = a + 0.05 * Math.sin(t * 0.8 + d * 1.7), l = len * f, x2 = x + Math.cos(aa) * l, y2 = y + Math.sin(aa) * l;
          g.lineWidth = lw * Math.max(1, d * 0.55); seg(g, [[x, y], [x2, y2]]);
          if (d <= 1) { g.fillStyle = GRAY(0.7); circle(g, x2, y2, 0.018); g.fill(); return; }
          if (f < 1) return;
          const n = r(id, 0) < 0.25 ? 3 : 2;
          for (let i = 0; i < n; i++) branch(id * 4 + i + 1, x2, y2, aa + (i - (n - 1) / 2) * (0.5 + r(id, i + 1) * 0.35), len * (0.62 + r(id, i + 5) * 0.16), d - 1, D, start + span);
        };
        const sx = 0, sy = 0.38;
        branch(1, sx, sy - 0.1, -Math.PI / 2 + (r(0, 1) - 0.5) * 0.1, 0.38, 6, 6, 0);
        for (let i = 0; i < 4; i++) branch(1e4 + i, sx + (i - 1.5) * 0.06, sy + 0.05, Math.PI / 2 + (i - 1.5) * 0.75 + (r(0, i + 2) - 0.5) * 0.3, 0.16, 4, 6, 0.1);
        g.lineWidth = lw * 1.5; seg(g, [[sx, sy + 0.08], [sx + 0.02, 1.2]]); seg(g, [[sx + 0.01, 0.75], [sx + 0.2, 0.95]]);
        g.fillStyle = GRAY(1); g.beginPath(); g.moveTo(sx, sy - 0.14); g.lineTo(sx - 0.1, sy + 0.08); g.lineTo(sx + 0.1, sy + 0.08); g.closePath(); g.fill();
        const k = (t * 0.5) % 2.2; if (k < 1 && grow >= 1) { g.fillStyle = ACC(1); circle(g, sx + 0.02 * k, sy + 0.1 + k * 0.9, 0.045); g.fill(); }
        g.lineWidth = lw;
      } },
  };

  (() => {
    const INK = [12, 10, 9], ACCENT = rgb('#a8400c'), PAPER = rgb('#efebe3');
    const items = [...document.querySelectorAll('.mind[data-emb]')].map((el) => ({ el, cv: el.querySelector('.mind__art'), e: EMB[el.dataset.emb], st: null, w: 0, h: 0, on: false, t: 0 }));
    if (!items.length) return;
    const off = document.createElement('canvas'), og = off.getContext('2d', { willReadFrequently: true });
    function render(it, dt) {
      const r = it.cv.getBoundingClientRect(), w = Math.max(60, Math.round(r.width / 2)), h = Math.max(45, Math.round(r.height / 2));
      if (w !== it.w || h !== it.h) { it.w = it.cv.width = w; it.h = it.cv.height = h; it.st = it.e.init ? it.e.init(w, h) : {}; }
      if (off.width !== w || off.height !== h) { off.width = w; off.height = h; }
      og.setTransform(1, 0, 0, 1, 0, 0); og.fillStyle = '#fff'; og.fillRect(0, 0, w, h);
      og.lineCap = 'round'; og.lineJoin = 'round'; og.setLineDash([]);
      og.save(); it.e.draw(og, w, h, it.t, it.st, dt); og.restore();
      const src = og.getImageData(0, 0, w, h).data, g = it.cv.getContext('2d'), out = g.createImageData(w, h), d = out.data;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4, R = src[i] / 255, G = src[i + 1] / 255, th = BAYER[(y & 7) * 8 + (x & 7)];
        const c = R - G > th ? ACCENT : 1 - R > th ? INK : PAPER;
        d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
      }
      g.putImageData(out, 0, 0);
    }
    let raf = 0, last = 0;
    function loop(now) {
      raf = 0;
      const dt = Math.min(0.1, (now - (last || now)) / 1000); last = now;
      let any = false;
      items.forEach((it) => { if (it.on) { any = true; it.t += dt; render(it, dt); } });
      if (any && !document.hidden) raf = requestAnimationFrame(loop); else last = 0;
    }
    if (reduced) {
      // one still per machine, after letting it run for a while
      items.forEach((it) => near(it.el, (on) => { if (!on || it.w) return; it.t = 0; render(it, 0.05); for (let k = 0; k < 160; k++) { it.t += 0.05; it.e.draw(og, it.w, it.h, it.t, it.st, 0.05); } render(it, 0.05); }));
      return;
    }
    items.forEach((it) => near(it.el, (on) => { it.on = on; if (on && !raf) raf = requestAnimationFrame(loop); }, '80px 0px'));
    document.addEventListener('visibilitychange', () => { if (!document.hidden && !raf) raf = requestAnimationFrame(loop); });
    let rz = 0; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => items.forEach((it) => { it.w = 0; }), 200); });
  })();

  // ---- 3. dithered paintings ------------------------------------------------
  (() => {
    const cards = [...document.querySelectorAll('.card[data-art]')];
    async function prepare(card) {
      const cv = card.querySelector('.card__art');
      const img = await load(card.dataset.art).catch(() => null);
      if (!img) return null;
      const r = cv.getBoundingClientRect(), cell = 2;
      const w = Math.max(40, Math.round(r.width / cell)), h = Math.max(30, Math.round(r.height / cell));
      cv.width = w; cv.height = h;
      // crop (fractions of the source), then cover the panel
      const [cx, cy, cw, ch] = (card.dataset.crop || '0 0 1 1').split(/\s+/).map(Number);
      const sx = cx * img.naturalWidth, sy = cy * img.naturalHeight, sw = cw * img.naturalWidth, sh = ch * img.naturalHeight;
      const s = Math.max(w / sw, h / sh), dw = sw * s, dh = sh * s;
      const g = cv.getContext('2d', { willReadFrequently: true });
      g.imageSmoothingQuality = 'high';
      g.drawImage(img, sx, sy, sw, sh, (w - dw) / 2, (h - dh) / 2, dw, dh);
      const d = g.getImageData(0, 0, w, h).data, n = w * h, L = new Float32Array(n), inv = card.hasAttribute('data-invert');
      for (let i = 0; i < n; i++) { const v = (d[i * 4] * 0.2126 + d[i * 4 + 1] * 0.7152 + d[i * 4 + 2] * 0.0722) / 255; L[i] = inv ? 1 - v : v; }
      const sorted = Float32Array.from(L).sort(), lo = sorted[Math.floor(n * 0.02)], hi = sorted[Math.floor(n * 0.995)] || 1;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x, dx = (x / w - 0.5) * 2, dy = (y / h - 0.5) * 2;
        L[i] = clamp((L[i] - lo) / (hi - lo + 1e-3)) * clamp((1.2 - Math.hypot(dx * 0.8, dy)) / 0.35);   // levels, then fade into the black
      }
      card._p = { g, w, h, L, ink: rgb(card.dataset.ink || '#e8e2d9') };
      return card._p;
    }
    function draw(card, k = 1, boost = 0) {
      const p = card._p; if (!p) return;
      const { g, w, h, L, ink } = p, id = g.createImageData(w, h), d = id.data, gam = 1.05 - boost * 0.3;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x, on = L[i] ** gam * k > BAYER[(y & 7) * 8 + (x & 7)];
        d[i * 4] = on ? ink[0] : 0; d[i * 4 + 1] = on ? ink[1] : 0; d[i * 4 + 2] = on ? ink[2] : 0; d[i * 4 + 3] = 255;
      }
      g.putImageData(id, 0, 0);
    }
    // the plate develops when it first comes into view
    function develop(card) {
      if (reduced) { draw(card); return; }
      const t0 = performance.now();
      const step = (now) => { const k = clamp((now - t0) / 1100); draw(card, 1 - (1 - k) ** 3); if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }
    const seen = new IntersectionObserver((es) => es.forEach(async (e) => { if (e.isIntersecting) { seen.unobserve(e.target); if (await prepare(e.target)) develop(e.target); } }), { rootMargin: '0px 0px -10% 0px' });
    cards.forEach((c) => {
      seen.observe(c);
      c.addEventListener('pointerenter', () => draw(c, 1, 1));
      c.addEventListener('pointerleave', () => draw(c, 1, 0));
    });
    let rz = 0;
    addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => cards.forEach(async (c) => { if (c._p && await prepare(c)) draw(c); }), 200); });
  })();

  // ---- 4. dithered seams ----------------------------------------------------
  (() => {
    const fades = [...document.querySelectorAll('.fade')];
    function draw(el) {
      const cv = el.querySelector('canvas'), cell = 3, w = Math.ceil(el.clientWidth / cell), h = Math.ceil(el.clientHeight / cell);
      cv.width = w; cv.height = h;
      const g = cv.getContext('2d'), id = g.createImageData(w, h), d = id.data, A = rgb(el.dataset.from), B = rgb(el.dataset.to);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const f = (y + 0.5) / h + (hash(x, y) - 0.5) * 0.12 + Math.sin(x * 0.07 + y * 0.02) * 0.04, c = f > BAYER[(y & 7) * 8 + (x & 7)] ? B : A, i = (y * w + x) * 4;
        d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
      }
      g.putImageData(id, 0, 0);
    }
    fades.forEach(draw);
    let rz = 0; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => fades.forEach(draw), 200); });
  })();

  // ---- 5. hallucinating text ------------------------------------------------
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

  // ---- 6. the dream ---------------------------------------------------------
  const post = document.getElementById('post');
  const opera = document.getElementById('opera');
  const dc = document.querySelector('.dream');
  if (!post || !dc) return;
  // Frames from Google's DeepDream notebook (2015): the sky, then the sky dreamt
  // at deeper and deeper layers, ending in the zoom's frame 29 (dogs, pagodas).
  const FRAMES = [0, 1, 2, 3, 4].map((i) => `assets/dream/frames/${i}.jpg`);

  const FRAG = `precision mediump float;
uniform vec2 u_res; uniform float u_t, u_z, u_a, u_d, u_x, u_z0, u_z1, u_hf, u_px; uniform sampler2D u_f0, u_f1;
${GLSL_LIB}
vec3 pal(float t) { return 0.5 + 0.5 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + t)); }
vec3 frame(sampler2D s, vec2 uv, float z) {
  float sa = u_res.x / u_res.y, ia = 1.78;
  vec2 k = sa > ia ? vec2(1.0, ia / sa) : vec2(sa / ia, 1.0);
  return texture2D(s, 0.5 + (uv - 0.5) * k / z).rgb;
}
void main() {
  vec2 uv = vec2(gl_FragCoord.x / u_res.x, 1.0 - gl_FragCoord.y / u_res.y);
  vec2 p = (gl_FragCoord.xy - 0.5 * u_res) / min(u_res.x, u_res.y);
  float r = length(p), an = atan(p.y, p.x);
  // log-polar fbm: the fallback dream, and a slow liquid warp over the frames
  vec2 lp = vec2(log(r + 0.02) * 1.2 - u_z, an / 3.14159 * 2.0);
  vec2 q = vec2(fbm(lp * 2.0 + u_t * 0.05), fbm(lp * 2.0 + 4.1 - u_t * 0.04));
  float f = fbm(lp * 3.0 + 2.6 * q);
  vec3 col = pal(f * 1.6 + u_t * 0.03 + r * 0.3) * (0.45 + 0.7 * f);
  if (u_hf > 0.5) {
    vec2 w = uv + (q - 0.5) * 0.03 * u_a;
    col = mix(frame(u_f0, w, u_z0), frame(u_f1, w, u_z1), u_x);
    col = mix(col, col * (0.7 + 0.6 * f), 0.35 * u_a);
  }
  // posterise through the same ordered dither as the rest of the page
  float b = b8(gl_FragCoord.xy / u_px);
  col = floor(col * 4.0 + b) / 4.0;
  // the dissolve: large blocks first, finer as it completes
  float cs = mix(40.0, 3.0, u_d);
  float m = step(h(floor(gl_FragCoord.xy / cs)), u_d * 1.04);
  gl_FragColor = vec4(col * m, m);
}`;
  let gl = null, uni = {}, ftex = [];
  function initGL() {
    if (gl !== null) return !!gl;
    gl = dc.getContext('webgl', { antialias: false, premultipliedAlpha: true, alpha: true }) || false;
    if (!gl) return false;
    try { uni = program(gl, FRAG); gl.uniform1i(uni.u_f0, 0); gl.uniform1i(uni.u_f1, 1); gl.uniform1f(uni.u_hf, 0); }
    catch (e) { console.warn('dream disabled:', e.message); gl = false; return false; }
    Promise.all(FRAMES.map(load)).then((ims) => { ftex = ims.map((im) => texture(gl, im)); }).catch(() => {});
    return true;
  }

  function state() {
    const vh = innerHeight, r = post.getBoundingClientRect();
    const q = (-r.top) / Math.max(1, r.height - vh);              // 0 when the section reaches the top, 1 when it leaves
    const dissolve = smooth(-0.32, 0.3, q) * (1 - smooth(0.86, 1.0, q));
    return { q, dissolve, dream: smooth(0.1, 0.45, q) * (1 - smooth(0.86, 1.0, q)) };
  }

  let raf = 0, active = false;
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
      if (ftex.length) {
        // walk the frames with the scroll, zooming into each as the next fades up
        const fq = clamp((q + 0.1) / 0.85) * (ftex.length - 1), i = Math.min(ftex.length - 2, Math.floor(fq)), x = fq - i;
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, ftex[i]);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, ftex[i + 1]);
        gl.uniform1f(uni.u_x, smooth(0.45, 1, x)); gl.uniform1f(uni.u_z0, 1 + 0.45 * x); gl.uniform1f(uni.u_z1, 1 + 0.1 * x); gl.uniform1f(uni.u_hf, 1);
      }
      gl.uniform2f(uni.u_res, w, h); gl.uniform1f(uni.u_t, reduced ? 0 : t / 1000); gl.uniform1f(uni.u_px, 1.5);
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
