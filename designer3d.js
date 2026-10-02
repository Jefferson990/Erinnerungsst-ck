/* ==========================================================================
   Entwurfs-Gestalter – echte 3D-Vorschau (three.js, lokal eingebunden)
   - Leinwand mit plastischem Relief: Babybauch, tiefe Stoff-Drapierung,
     Stoff, der sich um den Bauch legt, diagonales Stoffband mit Falten
   - eingebrannte Verschattung (AO) + Feinstruktur, damit die Plastizität
     auch beim Drehen erhalten bleibt
   - Blattgold/Perlen mit echtem Glanz, Blumen, Mond & Sterne, Ornamente
   - Schriftzug im Bogen unter dem Bauch, Name und Datum
   Ohne WebGL bleibt automatisch die 2D-Vorschau.
   ========================================================================== */
(() => {
  'use strict';
  const root = document.getElementById('gestalten');
  if (!root) return;
  const stage = root.querySelector('#designer-stage');
  const hint = root.querySelector('.designer-hint');
  const THREE_SRC = 'assets/js/three.min.js';

  const W = 2.76, H = 4.04;          // Leinwand
  const SX = 170, SY = 250;          // Auflösung des Reliefs
  const CW = 1024, CH = 1500;        // Auflösung der Bemalung

  let T, renderer, scene, camera, rig, relief, side, wall, halo, flowers, pearls, keyLight, rimLight, hemi;
  let mapCv, mapCtx, mapTex, ormCv, ormCtx, ormTex, aoTex, bumpTex, shared = null;
  let heights = null;
  let keys = { relief: '', paint: '', flowers: '', pearls: '' };
  let yaw = 0.18, pitch = 0.06, pending = false;

  const api = { active: false, update, toBlob };
  window.Designer3D = api;

  /* ---------- Laden ---------- */
  function webglOk() {
    try { const c = document.createElement('canvas'); return !!(c.getContext('webgl') || c.getContext('experimental-webgl')); }
    catch (e) { return false; }
  }
  function load() {
    if (!webglOk()) return;
    const s = document.createElement('script');
    s.src = THREE_SRC;
    s.onload = () => { try { init(); } catch (e) { console.warn('[3D] Fallback auf 2D-Vorschau:', e); } };
    document.head.appendChild(s);
  }
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); load(); } }, { rootMargin: '700px 0px' });
    io.observe(root);
  } else load();

  /* ---------- Hilfen ---------- */
  const rngOf = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const col = hex => new T.Color(hex).convertSRGBToLinear();
  const smax = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.max(a, b) + h * h * k * 0.25; };
  const sstep = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
  const X = x => (x / W + 0.5) * CW;
  const Y = y => (0.5 - y / H) * CH;
  const PXU = CW / W;                // Pixel pro Einheit

  /* ---------- Formen ---------- */
  const CHEST = { cx: -0.04, cy: 0.62, rx: 0.66, ry: 0.44, h: 0.30 };
  const BELLY = { cx: 0.05, cy: -0.22, rx: 0.90, ry: 0.95, h: 0.56 };
  const edgeY = x => 0.55 + 0.42 * x;                    // Oberkante des Stoffs

  // Stoffband: diagonal von oben rechts über den Bauch nach unten links
  const SP = [[1.55, 0.86], [0.62, 0.66], [-0.22, 0.04], [-1.55, -0.62]];
  const bez = t => { const m = 1 - t; return [m * m * m * SP[0][0] + 3 * m * m * t * SP[1][0] + 3 * m * t * t * SP[2][0] + t * t * t * SP[3][0], m * m * m * SP[0][1] + 3 * m * m * t * SP[1][1] + 3 * m * t * t * SP[2][1] + t * t * t * SP[3][1]]; };
  const SASH = Array.from({ length: 161 }, (_, i) => { const t = i / 160; return [...bez(t), t]; });
  SASH.forEach((p, i) => { const a = SASH[Math.max(0, i - 1)], b = SASH[Math.min(SASH.length - 1, i + 1)]; const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; p.push(-dy / l, dx / l); });
  const sashW = t => 0.2 + 0.08 * Math.sin(Math.PI * t);
  function sashAt(x, y) {
    let best = 1e9, bi = 0;
    for (let i = 0; i < SASH.length; i += 4) { const d = (x - SASH[i][0]) ** 2 + (y - SASH[i][1]) ** 2; if (d < best) { best = d; bi = i; } }
    for (let i = Math.max(0, bi - 4); i <= Math.min(SASH.length - 1, bi + 4); i++) { const d = (x - SASH[i][0]) ** 2 + (y - SASH[i][1]) ** 2; if (d < best) { best = d; bi = i; } }
    const p = SASH[bi];
    return { d: (x - p[0]) * p[3] + (y - p[1]) * p[4], t: p[2] };
  }

  function ell(x, y, e) {
    const d = ((x - e.cx) / e.rx) ** 2 + ((y - e.cy) / e.ry) ** 2;
    return d >= 1 ? 0 : e.h * Math.pow(1 - d, 0.55);
  }
  function bellyH(x, y) {
    let h = smax(ell(x, y, CHEST), ell(x, y, BELLY), 0.12);
    if (h > 0.05) h -= 0.022 * Math.exp(-(((x - 0.12) ** 2) + ((y + 0.34) ** 2)) / 0.0011);   // Bauchnabel
    return h;
  }

  function makeFolds(struct) {
    const r = rngOf(31), th = 0.6, c = Math.cos(th), s = Math.sin(th);
    const folds = Array.from({ length: 12 }, (_, i) => ({ c: -2.7 + i * 0.47 + r() * 0.18, w: 0.06 + r() * 0.09, a: 0.08 + r() * 0.1, f: 1.1 + r() * 1.4, p: r() * 6 }));
    return (x, y) => {
      const u = x * c + y * s, v = -x * s + y * c;
      if (struct === 'stoff') {
        let h = 0;
        for (const fo of folds) { const t = u - fo.c - 0.14 * Math.sin(v * fo.f + fo.p); h += fo.a * Math.exp(-((t / fo.w) ** 2)); }
        return h + 0.008 * Math.sin(x * 23 + y * 7) * Math.sin(y * 19);
      }
      if (struct === 'wellen') return 0.13 * (0.5 + 0.5 * Math.sin(u * 5.2 + 0.9 * Math.sin(v * 1.3))) + 0.025 * Math.sin(u * 12 + v * 2);
      return 0.006 * Math.sin(x * 17) * Math.sin(y * 13);
    };
  }

  function crescent(x, y) {           // Mond oben rechts
    const a = Math.hypot(x - 0.9, y - 1.45), b = Math.hypot(x - 1.04, y - 1.53);
    return sstep(0.36, 0.33, a) * sstep(0.27, 0.3, b);
  }
  const STARS = [[0.45, 1.78, 0.13], [1.2, 1.0, 0.1], [0.62, 1.2, 0.07], [1.25, 1.85, 0.06]];
  function starAt(x, y) {
    let v = 0;
    for (const [sx, sy, r] of STARS) {
      const dx = Math.abs(x - sx), dy = Math.abs(y - sy);
      if (dx > r || dy > r) continue;
      const k = Math.pow(dx / r, 0.5) + Math.pow(dy / r, 0.5);   // 4-zackiger Stern
      v = Math.max(v, sstep(1.0, 0.85, k));
    }
    return v;
  }

  function heightAt(x, y, folds, s) {
    const border = sstep(0, 0.07, Math.min(W / 2 - Math.abs(x), H / 2 - Math.abs(y)));
    const dy = y - edgeY(x);
    const m = sstep(0.05, -0.05, dy);
    const corner = sstep(1.04, 0.96, (W / 2 - x) / 1.2 + (y + H / 2) / 1.3);
    // Stoff, der sich um den Bauch legt (Wulst mit radialen Falten)
    const bd = Math.hypot((x - BELLY.cx) / BELLY.rx, (y - BELLY.cy) / BELLY.ry);
    const ang = Math.atan2(y - BELLY.cy, x - BELLY.cx);
    const hug = s.struct === 'schlicht' ? 0.05 : 0.15;
    const ring = hug * Math.exp(-(((bd - 1.03) / 0.13) ** 2)) * (0.65 + 0.35 * Math.sin(ang * 9 + 1.3));
    let h = ((0.05 + folds(x, y) + ring) * m + 0.04 * Math.exp(-((dy / 0.045) ** 2))) * (1 - corner);
    h = smax(h, bellyH(x, y), 0.09);

    if (s.extras.includes('mond')) h += 0.035 * crescent(x, y) + 0.03 * starAt(x, y);

    if (s.sash !== 'ohne') {
      const si = sashAt(x, y), w = sashW(si.t), a = Math.abs(si.d) / w;
      if (a < 1.25) {
        const prof = Math.sqrt(Math.max(0, 1 - a * a));
        const pleat = 0.022 * Math.sin(si.d / w * Math.PI * 2.2 + si.t * 9) * prof;
        const lip = 0.03 * Math.exp(-(((a - 0.97) / 0.07) ** 2));
        const hs = h + 0.07 * prof + pleat + lip;
        h += (hs - h) * sstep(1.25, 0.98, a);
      }
    }
    return h * border;
  }

  function buildRelief(s) {
    const folds = makeFolds(s.struct);
    const pos = relief.geometry.attributes.position;
    heights = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) { const h = heightAt(pos.getX(i), pos.getY(i), folds, s); heights[i] = h; pos.setZ(i, h); }
    pos.needsUpdate = true;
    relief.geometry.computeVertexNormals();
    bakeAO();
  }

  // Höhe an beliebiger Stelle (für Perlen)
  function sampleH(x, y) {
    const fx = (x / W + 0.5) * SX, fy = (0.5 - y / H) * SY;
    const ix = Math.max(0, Math.min(SX - 1, Math.floor(fx))), iy = Math.max(0, Math.min(SY - 1, Math.floor(fy)));
    const tx = fx - ix, ty = fy - iy, n = SX + 1;
    const h = (a, b) => heights[b * n + a];
    return (h(ix, iy) * (1 - tx) + h(ix + 1, iy) * tx) * (1 - ty) + (h(ix, iy + 1) * (1 - tx) + h(ix + 1, iy + 1) * tx) * ty;
  }

  // Eingebrannte Verschattung in Vertiefungen (bleibt beim Drehen sichtbar)
  function bakeAO() {
    const n = SX + 1, data = aoTex.image.data, K = 5;
    const g = (ix, iy) => heights[Math.max(0, Math.min(SY, iy)) * n + Math.max(0, Math.min(SX, ix))];
    for (let iy = 0; iy <= SY; iy++) {
      for (let ix = 0; ix <= SX; ix++) {
        const h = g(ix, iy);
        let sum = 0;
        for (const [ox, oy] of [[K, 0], [-K, 0], [0, K], [0, -K], [K, K], [-K, -K], [K, -K], [-K, K]]) sum += g(ix + ox, iy + oy);
        const cav = Math.max(0, sum / 8 - h);
        const ao = 1 - Math.min(0.62, cav * 7.5);
        const v = Math.round(ao * 255), o = ((SY - iy) * n + ix) * 4;
        data[o] = data[o + 1] = data[o + 2] = v; data[o + 3] = 255;
      }
    }
    aoTex.needsUpdate = true;
  }

  /* ---------- Bemalung ---------- */
  function goldGrad(g, stops, x0 = 0, y0 = 0, x1 = CW, y1 = CH) {
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c));
    return gr;
  }

  function sashPath(c, scale = 1) {
    c.beginPath();
    SASH.forEach((p, i) => { const w = sashW(p[2]) * scale; const x = X(p[0] + p[3] * w), y = Y(p[1] + p[4] * w); i ? c.lineTo(x, y) : c.moveTo(x, y); });
    for (let i = SASH.length - 1; i >= 0; i--) { const p = SASH[i], w = sashW(p[2]) * scale; c.lineTo(X(p[0] - p[3] * w), Y(p[1] - p[4] * w)); }
    c.closePath();
  }
  function sashLine(c, k) {           // Linie parallel zum Band, k = -1 … 1
    c.beginPath();
    SASH.forEach((p, i) => { const w = sashW(p[2]) * k; const x = X(p[0] + p[3] * w), y = Y(p[1] + p[4] * w); i ? c.lineTo(x, y) : c.moveTo(x, y); });
  }

  function ornament(g, o, cx, cy, rad, style, metal) {
    const ctxs = metal ? [[g, style], [o, metal]] : [[g, style]];
    ctxs.forEach(([c, st]) => {
      c.save(); c.translate(X(cx), Y(cy)); c.strokeStyle = st; c.fillStyle = st; c.lineCap = 'round';
      const R = rad * PXU;
      c.lineWidth = R * 0.05; c.beginPath(); c.arc(0, 0, R * 0.62, 0, Math.PI * 2); c.stroke();
      c.lineWidth = R * 0.03; c.beginPath(); c.arc(0, 0, R * 0.5, 0, Math.PI * 2); c.stroke();
      for (let i = 0; i < 12; i++) {
        c.save(); c.rotate(i * Math.PI / 6);
        c.beginPath(); c.moveTo(0, -R * 0.66); c.bezierCurveTo(R * 0.18, -R * 0.8, R * 0.1, -R * 0.98, 0, -R * 0.92); c.bezierCurveTo(-R * 0.1, -R * 0.98, -R * 0.18, -R * 0.8, 0, -R * 0.66); c.fill();
        c.beginPath(); c.arc(R * 0.26, -R * 0.75, R * 0.035, 0, Math.PI * 2); c.fill();
        c.restore();
      }
      for (let i = 0; i < 6; i++) { c.save(); c.rotate(i * Math.PI / 3 + 0.26); c.beginPath(); c.ellipse(0, -R * 0.26, R * 0.07, R * 0.2, 0, 0, Math.PI * 2); c.fill(); c.restore(); }
      c.beginPath(); c.arc(0, 0, R * 0.07, 0, Math.PI * 2); c.fill();
      c.restore();
    });
  }

  function arcText(c, text, style, px) {
    // Schriftzug im Bogen unter dem Bauch
    const cx = X(BELLY.cx), cy = Y(BELLY.cy), R = (BELLY.ry + 0.2) * PXU;
    c.save(); c.font = `italic ${px}px Georgia, "Times New Roman", serif`; c.fillStyle = style; c.textAlign = 'center'; c.textBaseline = 'middle';
    const widths = [...text].map(ch => c.measureText(ch).width), total = widths.reduce((a, b) => a + b, 0);
    let ang = Math.PI / 2 + total / R / 2;            // Mitte unten, von links nach rechts
    [...text].forEach((ch, i) => {
      const a = ang - widths[i] / R / 2;
      c.save(); c.translate(cx + Math.cos(a) * R, cy + Math.sin(a) * R); c.rotate(a - Math.PI / 2); c.fillText(ch, 0, 0); c.restore();
      ang -= widths[i] / R;
    });
    c.restore();
  }

  function paint(s) {
    const D = window.Designer, U = D.util;
    const base = D.baseHex(s), belly = U.tint(base, 0.4);
    const acc = s.accent !== 'ohne' ? D.ACCENTS[s.accent].stops : null;
    const g = mapCtx, o = ormCtx;
    const ROUGH = 'rgb(0,205,0)', METAL = 'rgb(0,60,255)', SATIN = 'rgb(0,115,150)';
    const gg = acc ? goldGrad(g, acc) : null;
    const deco = gg || U.shade(base, 0.35);         // Farbe für Mond/Ornament ohne Akzent
    const decoMetal = acc ? METAL : null;

    g.fillStyle = U.tint(base, 0.12); g.fillRect(0, 0, CW, CH);
    o.fillStyle = ROUGH; o.fillRect(0, 0, CW, CH);

    // Stofffläche mit feiner Maserung
    g.beginPath(); g.moveTo(X(-W / 2), Y(edgeY(-W / 2))); g.lineTo(X(W / 2), Y(edgeY(W / 2))); g.lineTo(CW, CH); g.lineTo(0, CH); g.closePath();
    g.fillStyle = U.shade(base, 0.04); g.fill();
    const r = rngOf(7);
    g.save(); g.clip();
    for (let i = 0; i < 160; i++) {
      const x = r() * CW, y = r() * CH, l = 60 + r() * 180;
      g.strokeStyle = r() < 0.5 ? 'rgba(255,255,255,.14)' : 'rgba(80,60,40,.08)';
      g.lineWidth = 2 + r() * 6;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + l * 0.82, y - l * 0.57); g.stroke();
    }
    g.restore();

    // Babybauch
    g.save(); g.shadowColor = belly; g.shadowBlur = 40; g.fillStyle = belly;
    for (const e of [CHEST, BELLY]) { g.beginPath(); g.ellipse(X(e.cx), Y(e.cy), e.rx / W * CW * 0.97, e.ry / H * CH * 0.97, 0, 0, Math.PI * 2); g.fill(); }
    g.restore();

    const stroke = (pts, w, ctxs) => ctxs.forEach(([c, style]) => {
      c.strokeStyle = style; c.lineWidth = w; c.lineCap = 'round'; c.beginPath();
      c.moveTo(X(pts[0]), Y(pts[1])); c.bezierCurveTo(X(pts[2]), Y(pts[3]), X(pts[4]), Y(pts[5]), X(pts[6]), Y(pts[7])); c.stroke();
    });

    // Blattgold-Ecken und Adern
    if (acc) {
      const tri = (pts, curve) => [[g, gg], [o, METAL]].forEach(([c, st]) => {
        c.fillStyle = st; c.beginPath(); c.moveTo(X(pts[0]), Y(pts[1])); c.lineTo(X(pts[2]), Y(pts[3]));
        c.quadraticCurveTo(X(curve[0]), Y(curve[1]), X(pts[4]), Y(pts[5])); c.closePath(); c.fill();
      });
      if (!s.extras.includes('mond')) tri([-W / 2, H / 2, -W / 2 + 1.5, H / 2, -W / 2, H / 2 - 1.45], [-W / 2 + 0.7, H / 2 - 0.45]);
      else tri([-W / 2, H / 2, -W / 2 + 1.1, H / 2, -W / 2, H / 2 - 1.0], [-W / 2 + 0.5, H / 2 - 0.3]);
      if (s.struct !== 'schlicht') tri([W / 2, -H / 2, W / 2 - 1.2, -H / 2, W / 2, -H / 2 + 1.3], [W / 2 - 0.5, -H / 2 + 0.4]);
      const rv = rngOf(77);
      for (let i = 0; i < 8; i++) {
        const x0 = -W / 2 + rv() * W * 0.7, y0 = -H / 2 + 0.2 + rv() * (H * 0.65), len = 0.9 + rv() * 1.2;
        const an = 0.5 + rv() * 0.5, x3 = x0 + Math.cos(an) * len, y3 = y0 + Math.sin(an) * len;
        stroke([x0, y0, x0 + len * 0.35, y0 + (rv() - 0.5) * 0.4, x0 + len * 0.6, y3 - (rv() - 0.5) * 0.4, x3, y3], 3 + rv() * 5, [[g, gg], [o, METAL]]);
      }
      stroke([0.55, -0.4, 0.62, -0.7, 0.5, -0.9, 0.58, -1.1], 4, [[g, gg], [o, METAL]]);
    }

    // Stoffband mit Falten, Glanz und Paspel
    if (s.sash !== 'ohne') {
      const gold = s.sash === 'akzent' && acc;
      const fill = gold ? goldGrad(g, acc.map(c => U.mix(c, base, 0.25)), X(-1.5), Y(-0.6), X(1.5), Y(0.9)) : U.tint(base, 0.28);
      sashPath(g); g.fillStyle = fill; g.fill();
      sashPath(o); o.fillStyle = gold ? SATIN : 'rgb(0,150,0)'; o.fill();
      g.save(); sashPath(g); g.clip();
      for (let k = -0.8; k <= 0.81; k += 0.2) {
        sashLine(g, k); g.lineWidth = 7; g.strokeStyle = 'rgba(255,255,255,.22)'; g.stroke();
        sashLine(g, k + 0.07); g.lineWidth = 5; g.strokeStyle = 'rgba(60,40,20,.10)'; g.stroke();
      }
      g.restore();
      const edge = acc ? [[g, gg], [o, METAL]] : [[g, U.shade(base, 0.2)]];
      edge.forEach(([c, st]) => { c.lineWidth = 6; c.strokeStyle = st; sashLine(c, 0.97); c.stroke(); sashLine(c, -0.97); c.stroke(); });
    }

    // Mond & Sterne
    if (s.extras.includes('mond')) {
      [[g, deco], ...(decoMetal ? [[o, decoMetal]] : [])].forEach(([c, st]) => {
        c.save(); c.fillStyle = st;
        c.beginPath(); c.arc(X(0.9), Y(1.45), 0.35 * PXU, 0, Math.PI * 2); c.moveTo(X(1.04) + 0.285 * PXU, Y(1.53)); c.arc(X(1.04), Y(1.53), 0.285 * PXU, 0, Math.PI * 2); c.fill('evenodd');
        for (const [sx, sy, rr] of STARS) {
          const R = rr * PXU; c.beginPath();
          for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rad = i % 2 ? R * 0.22 : R; const px = X(sx) + Math.sin(a) * rad, py = Y(sy) - Math.cos(a) * rad; i ? c.lineTo(px, py) : c.moveTo(px, py); }
          c.closePath(); c.fill();
        }
        c.restore();
      });
    }

    // Ornamente
    if (s.extras.includes('ornament')) {
      ornament(g, o, -0.78, -1.32, 0.42, deco, decoMetal);
      ornament(g, o, 0.3, 0.72, 0.17, deco, decoMetal);
      if (!s.extras.includes('mond')) ornament(g, o, 0.85, 1.5, 0.4, deco, decoMetal);
    }

    // Schriftzug, Name, Datum
    const txt = acc ? U.shade(acc[2], 0.15) : U.shade(base, 0.6);
    const tctx = acc ? [[g, txt], [o, METAL]] : [[g, txt]];
    if (s.phrase) tctx.forEach(([c, st]) => arcText(c, s.phrase, st, 58));
    const write = (text, y, font) => tctx.forEach(([c, st]) => { c.font = font; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = st; c.fillText(text, CW / 2, Y(y)); });
    if (s.name) write(s.name, -1.66, 'italic 78px Georgia, "Times New Roman", serif');
    if (s.date) write(s.date.split('').join(' '), -1.84, '36px Georgia, "Times New Roman", serif');

    mapTex.needsUpdate = true; ormTex.needsUpdate = true;
    side.material.color.copy(col(U.tint(base, 0.05)));
  }

  /* ---------- Blumen ---------- */
  function geos() {
    if (!shared) {
      const st = new T.CylinderGeometry(1, 1, 1, 5); st.translate(0, 0.5, 0);
      shared = {
        sphere: new T.SphereGeometry(1, 14, 10), stem: st, torus: new T.TorusGeometry(1, 0.34, 8, 22),
        mat: new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0, envMapIntensity: 0.6 }),
        pearl: new T.MeshStandardMaterial({ color: col('#F7F2EA'), roughness: 0.18, metalness: 0.15, envMapIntensity: 1.4 })
      };
    }
    return shared;
  }

  function instanced(geo, mat, items, group) {
    const o = new T.Object3D(), m = new T.InstancedMesh(geo, mat, items.length);
    items.forEach((it, i) => {
      o.position.copy(it.p); o.quaternion.copy(it.q); o.scale.set(...it.s); o.updateMatrix();
      m.setMatrixAt(i, o.matrix); m.setColorAt(i, col(it.c || '#FFFFFF'));
    });
    m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.castShadow = true; group.add(m);
  }

  function buildFlowers(type) {
    if (flowers) { rig.remove(flowers); flowers.children.forEach(m => m.dispose && m.dispose()); }
    flowers = new T.Group();
    rig.add(flowers);
    if (type === 'ohne') return;

    const { sphere, stem, torus, mat } = geos();
    const r = rngOf(type === 'trocken' ? 5 : type === 'weiss' ? 9 : 13);
    const A = new T.Vector3(0, 0.9, 0.05);
    const UP = new T.Vector3(0, 1, 0);
    const buckets = new Map();
    const add = (geo, item) => { if (!buckets.has(geo)) buckets.set(geo, []); buckets.get(geo).push(item); };
    const dirOf = (a, tz) => new T.Vector3(Math.sin(a), Math.cos(a), tz).normalize();
    const along = (dir, d) => A.clone().addScaledVector(dir, d);
    const qAlong = dir => new T.Quaternion().setFromUnitVectors(UP, dir);
    const qFace = (rz, tilt = 0) => new T.Quaternion().setFromEuler(new T.Euler(tilt, 0, rz));

    const addStem = (dir, len, c = '#A68D66', w = 0.008) => add(stem, { p: A, q: qAlong(dir), s: [w, len, w], c });
    const plume = (a, len, c) => {
      const dir = dirOf(a, 0.12 + r() * 0.35);
      addStem(dir, len * 0.75);
      // Pampas: mehrere feine Büschel statt einer Form
      for (let k = 0; k < 3; k++) add(sphere, { p: along(dir, len * (0.74 + k * 0.08)), q: qAlong(dir), s: [0.03 + r() * 0.015 - k * 0.004, 0.09 + r() * 0.05, 0.025], c });
    };
    const leafOn = (a, len, c) => {
      const dir = dirOf(a, 0.1 + r() * 0.3);
      add(sphere, { p: along(dir, len), q: qAlong(dir), s: [0.055 + r() * 0.02, 0.17 + r() * 0.06, 0.014], c });
    };
    const euca = (a, len, c) => {
      const dir = dirOf(a, 0.1 + r() * 0.3), sd = new T.Vector3(-dir.y, dir.x, 0).normalize();
      addStem(dir, len, '#6F7D69', 0.006);
      for (let k = 3; k <= 10; k++) add(sphere, { p: along(dir, len * k / 10).addScaledVector(sd, (k % 2 ? 1 : -1) * 0.045), q: qFace(r() * 3), s: [0.05, 0.05, 0.012], c });
    };
    const blossom = (pos, size, petal, center) => {
      const rot = r() * 1.3, tilt = -0.25 + r() * 0.3;
      for (let p = 0; p < 5; p++) {
        const an = rot + p * Math.PI * 2 / 5;
        const off = new T.Vector3(-Math.sin(an), Math.cos(an), 0).multiplyScalar(size * 0.75);
        add(sphere, { p: pos.clone().add(off), q: qFace(an, tilt), s: [size * 0.55, size * 0.9, size * 0.18], c: petal });
      }
      add(sphere, { p: pos.clone().add(new T.Vector3(0, 0, size * 0.2)), q: qFace(0), s: [size * 0.25, size * 0.25, size * 0.2], c: center });
    };
    const gyps = (n, c) => {
      for (let i = 0; i < n; i++) {
        const dir = dirOf(-1.4 + r() * 2.8, 0.2 + r() * 0.5);
        add(sphere, { p: along(dir, 0.25 + r() * 0.75), q: qFace(0), s: [0.017, 0.017, 0.017], c });
      }
    };
    const fanPos = (a, d, tz) => along(dirOf(a, tz), d);

    if (type === 'trocken') {
      for (let i = 0; i < 30; i++) plume(-1.45 + 2.9 * r(), 0.8 + r() * 0.7, ['#E2CDA6', '#D2B68A', '#EBDDC2'][i % 3]);
      for (let i = 0; i < 9; i++) euca(-1.25 + 2.5 * i / 8 + (r() - 0.5) * 0.2, 0.8 + r() * 0.35, i % 2 ? '#7F8F78' : '#9DAA95');
      for (let i = 0; i < 10; i++) { const dir = dirOf(-1.2 + r() * 2.4, 0.3); add(sphere, { p: along(dir, 0.7 + r() * 0.35), q: qAlong(dir), s: [0.038, 0.075, 0.038], c: '#F3EAD9' }); }
      gyps(220, '#FBF6EC');
    } else if (type === 'weiss') {
      for (let i = 0; i < 20; i++) leafOn(-1.45 + 2.9 * i / 19, 0.55 + r() * 0.45, i % 2 ? '#56704F' : '#86A07E');
      for (let i = 0; i < 6; i++) { const dir = dirOf(-0.9 + r() * 1.8, 0.25); add(sphere, { p: along(dir, 0.95 + r() * 0.25), q: qAlong(dir), s: [0.04, 0.13, 0.04], c: '#DCE8C4' }); }
      for (let i = 0; i < 16; i++) blossom(fanPos(-1.3 + 2.6 * (i % 8) / 7 + (r() - 0.5) * 0.2, (i < 8 ? 0.3 : 0.62) + r() * 0.2, 0.35 + r() * 0.3), 0.1 + r() * 0.04, '#FFFDF8', '#D9C27A');
      gyps(160, '#FFFFFF');
    } else {
      for (let i = 0; i < 14; i++) plume(-1.4 + 2.8 * r(), 0.85 + r() * 0.55, i % 2 ? '#E8D5B5' : '#DCC6A0');
      for (let i = 0; i < 16; i++) leafOn(-1.4 + 2.8 * i / 15, 0.5 + r() * 0.4, i % 2 ? '#9EA48A' : '#B39C95');
      for (let i = 0; i < 9; i++) {
        const p = fanPos(-1.2 + 2.4 * (i % 5) / 4 + (r() - 0.5) * 0.2, (i < 5 ? 0.33 : 0.66) + r() * 0.15, 0.45 + r() * 0.3), sz = 0.13 + r() * 0.04;
        const c1 = i % 2 ? '#E2B2A8' : '#DCA79D';
        add(sphere, { p, q: qFace(0), s: [sz, sz, sz * 0.6], c: '#E8C3B9' });
        add(torus, { p: p.clone().add(new T.Vector3(0, 0, sz * 0.45)), q: qFace(r() * 3), s: [sz * 0.72, sz * 0.72, sz * 0.9], c: c1 });
        add(torus, { p: p.clone().add(new T.Vector3(0, 0, sz * 0.62)), q: qFace(r() * 3), s: [sz * 0.42, sz * 0.42, sz * 0.8], c: c1 });
        add(sphere, { p: p.clone().add(new T.Vector3(0, 0, sz * 0.6)), q: qFace(0), s: [sz * 0.2, sz * 0.2, sz * 0.2], c: '#C98F86' });
      }
      for (let i = 0; i < 6; i++) blossom(fanPos(-1.3 + r() * 2.6, 0.45 + r() * 0.35, 0.4), 0.075, '#FFFDF8', '#E8D9A8');
      gyps(140, '#FBF6EC');
    }
    buckets.forEach((items, geo) => instanced(geo, mat, items, flowers));
  }

  /* ---------- Perlen ---------- */
  function buildPearls(s) {
    if (pearls) { rig.remove(pearls); pearls.children.forEach(m => m.dispose && m.dispose()); pearls = null; }
    if (!s.extras.includes('perlen')) return;
    const { sphere, pearl } = geos();
    pearls = new T.Group(); rig.add(pearls);
    const items = [], q = new T.Quaternion();
    const put = (x, y, rad) => Math.abs(x) < W / 2 - 0.06 && Math.abs(y) < H / 2 - 0.06 && items.push({ p: new T.Vector3(x, y, sampleH(x, y) + rad * 0.55), q, s: [rad, rad, rad] });
    if (s.sash !== 'ohne') {
      for (let i = 4; i < SASH.length - 4; i += 5) { const p = SASH[i], w = sashW(p[2]) * 1.02; put(p[0] - p[3] * w, p[1] - p[4] * w, 0.032 + (i % 3) * 0.004); }
    } else {
      for (let i = 0; i <= 26; i++) { const a = Math.PI * (1.08 + 0.84 * i / 26); put(BELLY.cx + Math.cos(a) * BELLY.rx * 1.02, BELLY.cy + Math.sin(a) * BELLY.ry * 1.02, 0.03 + (i % 4) * 0.005); }
    }
    const r = rngOf(3);
    for (let i = 0; i < 9; i++) put(-1.1 + r() * 2.2, -1.85 + r() * 3.4, 0.022 + r() * 0.015);
    instanced(sphere, pearl, items, pearls);
  }

  /* ---------- Szene ---------- */
  function radialTexture(inner, outer) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'), gr = g.createRadialGradient(128, 128, 10, 128, 128, 128);
    gr.addColorStop(0, inner); gr.addColorStop(1, outer);
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    return new T.CanvasTexture(c);
  }

  function noiseTexture() {           // Feinstruktur (Gips/Stoff) als Bumpmap
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const g = c.getContext('2d'), r = rngOf(99);
    g.fillStyle = '#808080'; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 9000; i++) { const v = 90 + r() * 90 | 0; g.fillStyle = `rgba(${v},${v},${v},.5)`; g.fillRect(r() * 512, r() * 512, 1 + r() * 2.5, 1 + r() * 2.5); }
    for (let i = 0; i < 260; i++) { const v = r() < 0.5 ? 200 : 60; g.strokeStyle = `rgba(${v},${v},${v},.18)`; g.lineWidth = 1 + r() * 2; const x = r() * 512, y = r() * 512, l = 20 + r() * 60; g.beginPath(); g.moveTo(x, y); g.lineTo(x + l * 0.8, y - l * 0.6); g.stroke(); }
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(2.5, 3.6);
    return t;
  }

  function envMap() {
    const env = new T.Scene();
    const c = document.createElement('canvas'); c.width = 16; c.height = 256;
    const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#FFF8EC'); gr.addColorStop(0.5, '#E9DCC8'); gr.addColorStop(1, '#8F7A62');
    g.fillStyle = gr; g.fillRect(0, 0, 16, 256);
    env.add(new T.Mesh(new T.SphereGeometry(10, 32, 16), new T.MeshBasicMaterial({ map: new T.CanvasTexture(c), side: T.BackSide })));
    const panel = (x, y, z, w, h, k) => { const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(k, k * 0.95, k * 0.85), side: T.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m); };
    panel(-4, 5, 6, 5, 3, 5); panel(5, 2, 4, 3, 4, 2.5); panel(0, -3, 6, 6, 1.5, 1.6);
    const pm = new T.PMREMGenerator(renderer);
    const tex = pm.fromScene(env, 0.03).texture;
    pm.dispose();
    return tex;
  }

  function init() {
    T = window.THREE;
    renderer = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.74;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;

    scene = new T.Scene();
    scene.environment = envMap();
    camera = new T.PerspectiveCamera(30, 400 / 520, 0.1, 60);
    camera.position.set(0, 0.2, 9.6);
    camera.lookAt(0, 0.2, 0);

    hemi = new T.HemisphereLight(0xfff6ea, 0x9c8a74, 0.25); scene.add(hemi);
    keyLight = new T.DirectionalLight(0xfff1dc, 2.2);
    keyLight.position.set(-5.5, 3.5, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    Object.assign(keyLight.shadow.camera, { left: -3.2, right: 3.2, top: 3.2, bottom: -3.2, near: 1, far: 20 });
    keyLight.shadow.bias = -0.0004; keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);
    rimLight = new T.DirectionalLight(0xffe7c4, 0.55);   // Streiflicht von rechts für Konturen
    rimLight.position.set(5, -1, 2.5);
    scene.add(rimLight);

    wall = new T.Mesh(new T.PlaneGeometry(40, 40), new T.MeshStandardMaterial({ color: col('#F1EBE2'), roughness: 1 }));
    wall.position.z = -0.14; wall.receiveShadow = true; scene.add(wall);

    rig = new T.Group(); scene.add(rig);

    halo = new T.Mesh(new T.PlaneGeometry(W * 1.55, H * 1.32), new T.MeshBasicMaterial({ map: radialTexture('rgba(255,190,100,.85)', 'rgba(255,190,100,0)'), transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
    halo.position.z = -0.12; halo.visible = false; rig.add(halo);

    side = new T.Mesh(new T.BoxGeometry(W, H, 0.1), new T.MeshStandardMaterial({ color: 0xf1e6d2, roughness: 0.9 }));
    side.position.z = -0.05; side.castShadow = true; side.receiveShadow = true; rig.add(side);

    mapCv = document.createElement('canvas'); mapCv.width = CW; mapCv.height = CH; mapCtx = mapCv.getContext('2d');
    ormCv = document.createElement('canvas'); ormCv.width = CW; ormCv.height = CH; ormCtx = ormCv.getContext('2d');
    mapTex = new T.CanvasTexture(mapCv); mapTex.encoding = T.sRGBEncoding; mapTex.anisotropy = 4;
    ormTex = new T.CanvasTexture(ormCv);
    aoTex = new T.DataTexture(new Uint8Array((SX + 1) * (SY + 1) * 4), SX + 1, SY + 1, T.RGBAFormat);
    aoTex.magFilter = T.LinearFilter; aoTex.minFilter = T.LinearFilter;
    bumpTex = noiseTexture();

    const geo = new T.PlaneGeometry(W, H, SX, SY);
    geo.setAttribute('uv2', geo.attributes.uv);
    relief = new T.Mesh(geo, new T.MeshStandardMaterial({
      map: mapTex, roughnessMap: ormTex, metalnessMap: ormTex, roughness: 1, metalness: 1, envMapIntensity: 0.6,
      aoMap: aoTex, aoMapIntensity: 1, bumpMap: bumpTex, bumpScale: 0.012
    }));
    relief.castShadow = true; relief.receiveShadow = true;
    rig.add(relief);

    const cv = renderer.domElement;
    cv.className = 'designer-3d';
    cv.setAttribute('aria-hidden', 'true');
    stage.appendChild(cv);
    stage.classList.add('is-3d');
    if (hint) hint.hidden = false;
    resize();
    window.addEventListener('resize', resize);
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(stage);

    bindDrag(cv);
    api.active = true;
    update(window.Designer.state());
    intro();
  }

  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    requestRender();
  }

  function applyRig() { rig.rotation.set(pitch, yaw, 0); requestRender(); }
  function requestRender() {
    if (pending || !renderer) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; renderer.render(scene, camera); });
  }

  function update(s) {
    if (!api.active) return;
    s = Object.assign({ extras: [], phrase: '' }, s);
    const rk = JSON.stringify([s.struct, s.sash, s.extras.includes('mond')]);
    let reliefChanged = false;
    if (rk !== keys.relief) { keys.relief = rk; buildRelief(s); reliefChanged = true; }
    const pk = JSON.stringify([s.base, s.custom, s.accent, s.struct, s.sash, s.extras, s.phrase, s.name, s.date]);
    if (pk !== keys.paint) { keys.paint = pk; paint(s); }
    if (s.flowers !== keys.flowers) { keys.flowers = s.flowers; buildFlowers(s.flowers); }
    const pe = JSON.stringify([s.extras.includes('perlen'), s.sash]);
    if (pe !== keys.pearls || reliefChanged) { keys.pearls = pe; buildPearls(s); }
    halo.visible = s.light;
    wall.material.color.copy(col(s.light ? '#A89A88' : '#F1EBE2'));
    keyLight.intensity = s.light ? 1.4 : 2.2;
    hemi.intensity = s.light ? 0.15 : 0.25;
    requestRender();
  }

  function toBlob() {
    return new Promise((resolve, reject) => {
      const pr = renderer.getPixelRatio();
      renderer.setPixelRatio(1);
      renderer.setSize(800, 1040, false);
      camera.aspect = 800 / 1040; camera.updateProjectionMatrix();
      renderer.render(scene, camera);
      renderer.domElement.toBlob(b => (b ? resolve(b) : reject(new Error('export'))), 'image/jpeg', 0.9);
      renderer.setPixelRatio(pr);
      resize();
    });
  }

  /* ---------- Drehen ---------- */
  function bindDrag(cv) {
    let down = null;
    cv.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, yaw, pitch, type: e.pointerType }; cv.setPointerCapture(e.pointerId); cv.classList.add('grabbing'); });
    cv.addEventListener('pointermove', e => {
      if (!down) return;
      yaw = Math.max(-0.75, Math.min(0.75, down.yaw + (e.clientX - down.x) * 0.008));
      if (down.type === 'mouse') pitch = Math.max(-0.35, Math.min(0.4, down.pitch + (e.clientY - down.y) * 0.006));
      applyRig();
    });
    const up = () => { down = null; cv.classList.remove('grabbing'); };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
    cv.addEventListener('dblclick', () => animateTo(0.18, 0.06));
  }

  function animateTo(ty, tp, ms = 700) {
    const y0 = yaw, p0 = pitch, t0 = performance.now();
    const step = now => {
      const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3);
      yaw = y0 + (ty - y0) * e; pitch = p0 + (tp - p0) * e; applyRig();
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function intro() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { applyRig(); return; }
    yaw = 0.6; pitch = 0.1; applyRig();
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); animateTo(0.18, 0.06, 1600); } }, { threshold: 0.4 });
    io.observe(stage);
  }
})();
