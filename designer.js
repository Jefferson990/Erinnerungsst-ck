/* ==========================================================================
   Entwurfs-Gestalter – Kundinnen stellen sich ihr Erinnerungsstück selbst
   zusammen und sehen eine vereinfachte Live-Vorschau (SVG).
   Der Entwurf kann mit der Anfrage als Bild (JPG) mitgeschickt werden.
   Farben/Optionen unten in BASES / ACCENTS / STRUCT / FLOWERS anpassbar.
   ========================================================================== */
(() => {
  'use strict';
  const root = document.getElementById('gestalten');
  if (!root) return;
  const stage = root.querySelector('#designer-stage');
  const custom = root.querySelector('#d-custom');

  const BASES = {
    weiss:  { label: 'Weiß',   hex: '#F8F5EF' },
    creme:  { label: 'Creme',  hex: '#F1E6D2' },
    beige:  { label: 'Beige',  hex: '#E3D1B6' },
    rose:   { label: 'Rosé',   hex: '#EDD5CC' },
    salbei: { label: 'Salbei', hex: '#D9DFD0' },
    eigene: { label: 'Eigene Farbe' }
  };
  const ACCENTS = {
    gold:     { label: 'Gold',     stops: ['#F3E2A9', '#C9A04A', '#9C7430', '#E9CF85'] },
    rosegold: { label: 'Roségold', stops: ['#F6D5C7', '#C98E78', '#A66D5A', '#EBC0AE'] },
    silber:   { label: 'Silber',   stops: ['#FAFBFC', '#B9BEC6', '#8C929B', '#E4E7EB'] },
    ohne:     { label: 'Ohne Akzent' }
  };
  const STRUCT = { stoff: 'Stoff-Drapierung', wellen: 'Fließende Wellen', schlicht: 'Schlicht' };
  const FLOWERS = { trocken: 'Trockenblumen', weiss: 'Weiße Blüten', rosen: 'Rosen', ohne: 'Ohne Blumen' };

  /* ---------- Hilfsfunktionen ---------- */
  const hex2rgb = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const rgb2hex = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => { const A = hex2rgb(a), B = hex2rgb(b); return rgb2hex(A.map((v, i) => v + (B[i] - v) * t)); };
  const shade = (h, t) => mix(h, '#3A2F25', t);
  const tint = (h, t) => mix(h, '#FFFFFF', t);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const f = n => Math.round(n * 10) / 10;

  /* ---------- Zustand aus den Bedienelementen ---------- */
  function state() {
    const val = n => (root.querySelector(`input[name="${n}"]:checked`) || {}).value;
    return {
      base: val('d_base') || 'creme',
      custom: custom.value,
      accent: val('d_accent') || 'gold',
      struct: val('d_struct') || 'stoff',
      flowers: val('d_flowers') || 'trocken',
      name: root.querySelector('#d-name').value.trim(),
      date: root.querySelector('#d-date').value.trim(),
      light: root.querySelector('#d-light').checked
    };
  }

  function summary(s = state()) {
    const parts = [
      `Grundfarbe: ${s.base === 'eigene' ? 'Eigene Farbe (' + s.custom.toUpperCase() + ')' : BASES[s.base].label}`,
      `Akzent: ${ACCENTS[s.accent].label}`,
      `Struktur: ${STRUCT[s.struct]}`,
      `Blumen: ${FLOWERS[s.flowers]}`
    ];
    if (s.name) parts.push(`Name: ${s.name}`);
    if (s.date) parts.push(`Datum: ${s.date}`);
    parts.push(`Beleuchtung: ${s.light ? 'Ja' : 'Nein'}`);
    return parts.join(' | ');
  }

  /* ---------- Zeichnen ---------- */
  const C = { x: 62, y: 28, w: 276, h: 404 };

  function drape(s, base) {
    const r = rng(s.struct === 'stoff' ? 11 : 23);
    const dark = shade(base, .16), light = tint(base, .5);
    let out = '';
    if (s.struct === 'stoff') {
      for (let i = 0; i < 10; i++) {
        const y0 = C.y + 30 + i * 44 + r() * 14, a = 12 + r() * 18;
        const d = `M${C.x - 20} ${f(y0 + 34)} C${C.x + 70} ${f(y0 - a)},${C.x + 160} ${f(y0 + a + 24)},${C.x + C.w + 20} ${f(y0 - 46)}`;
        out += `<path d="${d}" fill="none" stroke="${dark}" stroke-width="${f(12 + r() * 12)}" stroke-opacity=".32" stroke-linecap="round"/>`;
        out += `<path d="${d}" fill="none" stroke="${light}" stroke-width="${f(2 + r() * 2)}" stroke-opacity=".9" transform="translate(0 -7)"/>`;
      }
    } else if (s.struct === 'wellen') {
      for (let i = 0; i < 7; i++) {
        const y = C.y + 20 + i * 62 + r() * 10, x0 = C.x - 20, x1 = C.x + C.w + 20;
        const d = `M${x0} ${f(y + 30)} C${x0 + 100} ${f(y - 34)},${x0 + 190} ${f(y + 52)},${x1} ${f(y - 14)} L${x1} ${C.y + C.h + 20} L${x0} ${C.y + C.h + 20}Z`;
        out += `<path d="${d}" fill="${i % 2 ? tint(base, .22) : shade(base, .07)}" fill-opacity=".75"/>`;
        out += `<path d="M${x0} ${f(y + 30)} C${x0 + 100} ${f(y - 34)},${x0 + 190} ${f(y + 52)},${x1} ${f(y - 14)}" fill="none" stroke="${light}" stroke-width="1.6"/>`;
      }
    } else {
      for (let i = 0; i < 14; i++) {
        const x = C.x + r() * C.w, y = C.y + r() * C.h;
        out += `<path d="M${f(x)} ${f(y)} l${f(20 + r() * 30)} ${f(-6 - r() * 8)}" stroke="${dark}" stroke-opacity=".12" stroke-width="1"/>`;
      }
    }
    return out;
  }

  function veins(s) {
    if (s.accent === 'ohne') return '';
    const r = rng(77);
    let out = '';
    // Ecken in Akzentfarbe
    out += `<path d="M${C.x} ${C.y}L${C.x + 150} ${C.y}Q${C.x + 70} ${C.y + 46} ${C.x} ${C.y + 150}Z" fill="url(#da)"/>`;
    if (s.struct !== 'schlicht') out += `<path d="M${C.x + C.w} ${C.y + C.h}L${C.x + C.w - 120} ${C.y + C.h}Q${C.x + C.w - 50} ${C.y + C.h - 40} ${C.x + C.w} ${C.y + C.h - 130}Z" fill="url(#da)"/>`;
    for (let i = 0; i < 7; i++) {
      const fromLeft = r() < .6;
      const x0 = fromLeft ? C.x : C.x + 40 + r() * (C.w - 80);
      const y0 = fromLeft ? C.y + 120 + r() * (C.h - 140) : C.y + C.h;
      const len = 120 + r() * 140, ang = -0.5 - r() * 0.5;          // nach rechts oben
      const x3 = x0 + Math.cos(ang) * len, y3 = y0 + Math.sin(ang) * len;
      const x1 = x0 + len * .35, y1 = y0 - len * .05 + (r() - .5) * 40;
      const x2 = x0 + len * .6, y2 = y3 + len * .25 + (r() - .5) * 40;
      out += `<path d="M${f(x0)} ${f(y0)} C${f(x1)} ${f(y1)},${f(x2)} ${f(y2)},${f(x3)} ${f(y3)}" fill="none" stroke="url(#da)" stroke-width="${f(1.1 + r() * 1.6)}" stroke-linecap="round"/>`;
      if (r() < .5) out += `<path d="M${f(x2)} ${f(y2)} q${f(14 + r() * 16)} ${f(-6 - r() * 14)} ${f(30 + r() * 20)} ${f(-20 - r() * 16)}" fill="none" stroke="url(#da)" stroke-width="1" stroke-linecap="round"/>`;
    }
    return out;
  }

  function petals(cx, cy, rad, rot, fill, stroke, center) {
    let o = '';
    for (let p = 0; p < 5; p++) {
      const a = rot + p * 72;
      o += `<ellipse cx="${f(cx)}" cy="${f(cy - rad * .55)}" rx="${f(rad * .5)}" ry="${f(rad * .75)}" transform="rotate(${f(a)} ${f(cx)} ${f(cy)})" fill="${fill}" stroke="${stroke}" stroke-width=".7"/>`;
    }
    return o + `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(rad * .22)}" fill="${center}"/>`;
  }

  function flowers(s) {
    if (s.flowers === 'ohne') return '';
    const r = rng(s.flowers === 'trocken' ? 5 : s.flowers === 'weiss' ? 9 : 13);
    const cx = 200, cy = 182;
    const at = (a, len) => [cx + Math.sin(a) * len, cy - Math.cos(a) * len];
    let back = '', mid = '', front = '';

    const plume = (a, len, col) => {
      const [x, y] = at(a, len), [sx, sy] = at(a, len * .55);
      back += `<path d="M${cx} ${cy} L${f(sx)} ${f(sy)}" stroke="#B89B72" stroke-width="1.1"/>`;
      back += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(5 + r() * 3)}" ry="${f(20 + r() * 12)}" transform="rotate(${f(a * 57.3)} ${f(x)} ${f(y)})" fill="${col}" fill-opacity=".92"/>`;
    };
    const euca = (a, len, col) => {
      const [x, y] = at(a, len);
      mid += `<path d="M${cx} ${cy} L${f(x)} ${f(y)}" stroke="#7D8B76" stroke-width="1"/>`;
      for (let k = 3; k < 10; k++) {
        const [lx, ly] = at(a + (k % 2 ? .07 : -.07), len * k / 10);
        mid += `<circle cx="${f(lx)}" cy="${f(ly)}" r="${f(4 + r() * 2.5)}" fill="${col}"/>`;
      }
    };
    const leaf = (a, len, col) => {
      const [x, y] = at(a, len);
      mid += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(5 + r() * 2)}" ry="${f(17 + r() * 8)}" transform="rotate(${f(a * 57.3)} ${f(x)} ${f(y)})" fill="${col}"/>`;
    };
    const dots = (n, col) => {
      for (let i = 0; i < n; i++) {
        const [x, y] = at(-1.4 + r() * 2.8, 35 + r() * 85);
        front += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(1.4 + r() * 1.2)}" fill="${col}"/>`;
      }
    };

    if (s.flowers === 'trocken') {
      for (let i = 0; i < 22; i++) plume(-1.45 + 2.9 * i / 21 + (r() - .5) * .12, 115 + r() * 65, i % 3 ? '#E2CDA6' : '#D6BC92');
      for (let i = 0; i < 9; i++) euca(-1.25 + 2.5 * i / 8 + (r() - .5) * .2, 95 + r() * 45, i % 2 ? '#7F8F78' : '#A3AE9B');
      for (let i = 0; i < 9; i++) { const a = -1.2 + r() * 2.4, [x, y] = at(a, 80 + r() * 50); front += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="4.5" ry="9" transform="rotate(${f(a * 57.3)} ${f(x)} ${f(y)})" fill="#F3EAD9"/>`; }
      dots(120, '#FBF6EC');
    } else if (s.flowers === 'weiss') {
      for (let i = 0; i < 18; i++) leaf(-1.45 + 2.9 * i / 17, 75 + r() * 55, i % 2 ? '#5F7658' : '#8FA287');
      for (let i = 0; i < 6; i++) { const a = -.9 + r() * 1.8, [x, y] = at(a, 110 + r() * 35); mid += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="6" ry="16" transform="rotate(${f(a * 57.3)} ${f(x)} ${f(y)})" fill="#DCE8C4"/>`; }
      for (let i = 0; i < 16; i++) { const [x, y] = at(-1.3 + 2.6 * (i % 8) / 7 + (r() - .5) * .2, (i < 8 ? 38 : 78) + r() * 30); front += petals(x, y, 15 + r() * 8, r() * 72, '#FFFDF8', '#E2D8C6', '#D9C27A'); }
      dots(90, '#FFFFFF');
    } else {
      for (let i = 0; i < 11; i++) plume(-1.4 + 2.8 * i / 10, 115 + r() * 50, '#E8D5B5');
      for (let i = 0; i < 14; i++) leaf(-1.4 + 2.8 * i / 13, 70 + r() * 50, i % 2 ? '#A3A88E' : '#B9A19A');
      for (let i = 0; i < 9; i++) {
        const [x, y] = at(-1.2 + 2.4 * (i % 5) / 4 + (r() - .5) * .2, (i < 5 ? 42 : 84) + r() * 22), rr = 17 + r() * 6;
        front += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rr)}" fill="#E8C3B9" stroke="#D2A096" stroke-width=".8"/>`;
        front += `<circle cx="${f(x + rr * .12)}" cy="${f(y - rr * .1)}" r="${f(rr * .68)}" fill="#E2B2A8"/>`;
        for (let k = 1; k < 4; k++) front += `<path d="M${f(x - rr * k / 4.5)} ${f(y)} A${f(rr * k / 4.5)} ${f(rr * k / 4.5)} 0 1 1 ${f(x)} ${f(y + rr * k / 4.5)}" fill="none" stroke="#B9817A" stroke-width="1.2"/>`;
      }
      for (let i = 0; i < 6; i++) { const [x, y] = at(-1.3 + r() * 2.6, 60 + r() * 40); front += petals(x, y, 11, r() * 72, '#FFFDF8', '#E5DCCB', '#E8D9A8'); }
      dots(80, '#FBF6EC');
    }
    return back + mid + front;
  }

  function render(s = state()) {
    const base = s.base === 'eigene' ? s.custom : BASES[s.base].hex;
    const belly = tint(base, .62);
    const acc = ACCENTS[s.accent];
    const wallA = s.light ? '#E4DACD' : '#F4EFE8', wallB = s.light ? '#D3C6B5' : '#EAE2D7';
    const txt = s.accent === 'ohne' ? '#5E554D' : acc.stops[2];

    let defs = `<linearGradient id="dw" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${wallA}"/><stop offset="1" stop-color="${wallB}"/></linearGradient>` +
      `<linearGradient id="dc" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${tint(base, .25)}"/><stop offset="1" stop-color="${shade(base, .06)}"/></linearGradient>` +
      `<radialGradient id="db" cx=".38" cy=".3" r=".85"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".45" stop-color="${belly}"/><stop offset="1" stop-color="${shade(belly, .2)}"/></radialGradient>` +
      `<clipPath id="dclip"><rect x="${C.x}" y="${C.y}" width="${C.w}" height="${C.h}"/></clipPath>` +
      `<filter id="dsh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="3" dy="6" stdDeviation="6" flood-color="#5A4630" flood-opacity=".28"/></filter>` +
      `<filter id="dglow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="16"/></filter>`;
    if (s.accent !== 'ohne') defs += `<linearGradient id="da" x1="0" y1="0" x2="1" y2="1">${acc.stops.map((c, i) => `<stop offset="${i / 3}" stop-color="${c}"/>`).join('')}</linearGradient>`;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 520" width="400" height="520"><defs>${defs}</defs>`;
    svg += `<rect width="400" height="520" fill="url(#dw)"/>`;
    if (s.light) svg += `<rect x="${C.x - 8}" y="${C.y - 8}" width="${C.w + 16}" height="${C.h + 16}" rx="6" fill="#FFCF85" opacity=".95" filter="url(#dglow)"/>`;
    svg += `<rect x="${C.x}" y="${C.y}" width="${C.w}" height="${C.h}" fill="url(#dc)" filter="url(#dsh)"/>`;
    svg += `<g clip-path="url(#dclip)">${drape(s, base)}${veins(s)}`;
    if (s.light) svg += `<ellipse cx="205" cy="262" rx="135" ry="150" fill="#FFE2AE" opacity=".55" filter="url(#dglow)"/>`;
    svg += `</g>`;
    svg += flowers(s);
    // Babybauch
    const silhouette = 'M126 214 C116 174,158 150,200 150 C246 150,280 172,272 212 C268 230,282 238,292 258 C310 294,300 350,262 373 C228 394,168 392,138 364 C108 336,110 286,124 260 C130 248,130 232,126 214Z';
    svg += `<path d="${silhouette}" fill="url(#db)" filter="url(#dsh)"/>`;
    svg += `<path d="M213 320 q4 3 8 0" fill="none" stroke="${shade(belly, .3)}" stroke-width="1.6" stroke-linecap="round"/>`;
    // Stoffband über dem Bauch
    svg += `<path d="M124 236 C178 260,248 262,294 234 L298 258 C250 290,178 284,122 260Z" fill="${tint(base, .35)}" fill-opacity=".95" stroke="${shade(base, .14)}" stroke-width=".8" filter="url(#dsh)"/>`;
    if (s.accent !== 'ohne') {
      svg += `<path d="M128 239 C180 262,248 264,292 237" fill="none" stroke="url(#da)" stroke-width="4.5" stroke-linecap="round"/>`;
      svg += `<path d="M252 282 C262 310,246 336,256 360" fill="none" stroke="url(#da)" stroke-width="1.8" stroke-linecap="round"/>`;
      svg += `<path d="M160 300 C150 322,166 340,158 360" fill="none" stroke="url(#da)" stroke-width="1.2" stroke-linecap="round"/>`;
    }
    if (s.name) svg += `<text x="200" y="${C.y + C.h - 30}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-style="italic" font-size="23" fill="${txt}">${esc(s.name)}</text>`;
    if (s.date) svg += `<text x="200" y="${C.y + C.h - 11}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="11.5" letter-spacing="3" fill="${txt}">${esc(s.date)}</text>`;
    return svg + `</svg>`;
  }

  function update() {
    const s = state();
    root.querySelector('.swatch-custom').style.setProperty('--sw', custom.value);
    stage.innerHTML = render(s);
    stage.setAttribute('aria-label', 'Vorschau deines Entwurfs: ' + summary(s));
  }

  /* ---------- Export als JPG (wird an die Anfrage angehängt) ---------- */
  function toJpegBlob(scale = 2) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(new Blob([render()], { type: 'image/svg+xml;charset=utf-8' }));
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = 400 * scale; c.height = 520 * scale;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(b => (b ? resolve(b) : reject(new Error('export'))), 'image/jpeg', 0.9);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('svg')); };
      img.src = url;
    });
  }

  /* ---------- Bedienung ---------- */
  root.addEventListener('input', update);
  root.addEventListener('change', update);
  custom.addEventListener('input', () => { root.querySelector('input[name="d_base"][value="eigene"]').checked = true; update(); });

  root.querySelector('[data-design-random]').addEventListener('click', () => {
    ['d_base', 'd_accent', 'd_struct', 'd_flowers'].forEach(n => {
      const opts = Array.from(root.querySelectorAll(`input[name="${n}"]`)).filter(i => !(n === 'd_base' && i.value === 'eigene'));
      opts[Math.floor(Math.random() * opts.length)].checked = true;
    });
    root.querySelector('#d-light').checked = Math.random() < .35;
    update();
  });

  root.querySelector('[data-design-apply]').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('design:apply'));
  });

  window.Designer = { state, summary, render, toJpegBlob, BASES, ACCENTS, STRUCT, FLOWERS };
  update();
})();
