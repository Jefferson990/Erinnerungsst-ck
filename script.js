/* ==========================================================================
   Erinnerungsstücke – script.js
   ========================================================================== */

/* ==========================================================================
   >>> EINSTELLUNGEN – HIER ÄNDERN <<<
   ========================================================================== */
const CONFIG = {
  // WhatsApp Business: internationales Format, nur Ziffern (0175 7435161 -> 491757435161)
  // Leer lassen ('') = WhatsApp-Buttons werden ausgeblendet.
  WHATSAPP_NUMBER: '491757435161',

  /* ------------------------------------------------------------------------
     FORMULAR-ANBINDUNG
     FORM_MODE:
       'appsscript' -> Google Apps Script (EMPFOHLEN): Anfrage kommt in Gmail an,
                       mit PDF der Anfrage + allen Fotos als Anhang. Kostenlos.
                       Einrichtung: README.txt, Punkt 4 + Datei google-apps-script/Code.gs
       'formspree'  -> Formspree (https://formspree.io). Datei-Uploads nur im
                       kostenpflichtigen Tarif; kein PDF.
       'emailjs'    -> EmailJS, siehe Funktion sendViaEmailJS() unten.
       'demo'       -> Nichts wird versendet, nur Bestätigung (zum Testen).
     Ist bei 'appsscript' noch keine URL eingetragen, läuft automatisch der
     Demo-Modus und auf der Danke-Seite erscheint ein Hinweis.
     ------------------------------------------------------------------------ */
  FORM_MODE: 'appsscript',
  APPS_SCRIPT_URL: '',            // z. B. 'https://script.google.com/macros/s/XXXXXXXX/exec'
  FORMSPREE_URL: '',              // z. B. 'https://formspree.io/f/abcdwxyz'

  // Platzhalter für noch fehlende KI-Bilder anzeigen?
  // true  = gestrichelte Platzhalter-Felder sichtbar (zum Einrichten)
  // false = fehlende KI-Bilder werden einfach ausgeblendet (für die Veröffentlichung)
  SHOW_IMAGE_PLACEHOLDERS: true,

  // Fehlt ein eigenes KI-Bild in assets/images/ki/, wird zufällig eines der
  // KI-Visualisierungen aus assets/images/inspiration/ eingesetzt (bei jedem Seitenaufruf neu).
  // Eigene Bilder in assets/images/ki/ haben immer Vorrang. false = Platzhalter statt Zufallsbild.
  RANDOM_PLACEHOLDER_IMAGES: true,
  RANDOM_IMAGE_COUNT: 10,          // Anzahl Dateien idee-01.jpg … idee-10.jpg

  // Foto-Upload
  MAX_FILES: 8,
  MAX_FILE_MB: 25,                // größere Originale werden abgelehnt
  MAX_TOTAL_MB: 18,               // Summe nach Verkleinerung (Gmail-Limit 25 MB inkl. PDF)
  IMAGE_MAX_EDGE: 2000,           // längste Kante in Pixeln nach Verkleinerung
  IMAGE_QUALITY: 0.85
};
/* ========================================================================== */

(() => {
  'use strict';
  document.documentElement.classList.add('js');

  const T = (k, v) => (window.i18n ? window.i18n.t(k, v) : k);
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- WhatsApp-Links (Text in der jeweiligen Sprache) ---------------- */
  function setWa() {
    $$('[data-wa]').forEach(a => {
      if (!CONFIG.WHATSAPP_NUMBER) { (a.closest('.wa-box, .success-wa, li') || a).hidden = true; return; }
      a.href = `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(T('js.waText'))}`;
    });
  }
  setWa();
  if (window.i18n) window.i18n.onChange(setWa);

  /* ---------------- Header & mobiles Menü ---------------- */
  const header = $('.site-header');
  const nav = $('#nav');
  const toggle = $('.menu-toggle');

  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 20);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  function setMenu(open) {
    nav.classList.toggle('open', open);
    header.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', T(open ? 'js.menuClose' : 'js.menuOpen'));
    document.body.classList.toggle('no-scroll', open);
    if (open) setTimeout(() => $('a', nav)?.focus(), 50);
  }
  toggle.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
  nav.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && nav.classList.contains('open')) { setMenu(false); toggle.focus(); }
    // Fokus im offenen Menü halten
    if (e.key === 'Tab' && nav.classList.contains('open')) {
      const items = [toggle, ...$$('a', nav)];
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  window.matchMedia('(min-width: 1280px)').addEventListener('change', e => { if (e.matches) setMenu(false); });

  /* ---------------- Buttons "Anfrage" -> sanft zum Formular ---------------- */
  $$('[data-open-form]').forEach(btn => btn.addEventListener('click', e => {
    e.preventDefault();
    const target = $('#anfrage');
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    history.replaceState(null, '', '#anfrage');
    // erstes Feld fokussieren, sobald das Scrollen fertig ist
    setTimeout(() => {
      // Überschrift des aktuellen Schritts fokussieren (öffnet auf dem Handy nicht sofort die Tastatur)
      const legend = $('.step.is-active legend', target);
      if (legend && $('#form-success').hidden) { legend.setAttribute('tabindex', '-1'); legend.focus({ preventScroll: true }); }
    }, reduceMotion ? 50 : 900);
  }));

  /* ---------------- Hero: echte Arbeiten wechseln sanft ---------------- */
  const insetImgs = $$('.hero-inset .arch img');
  if (insetImgs.length > 1 && !reduceMotion) {
    let hi = 0;
    setInterval(() => {
      if (document.hidden) return;
      insetImgs[hi].classList.remove('is-on');
      hi = (hi + 1) % insetImgs.length;
      insetImgs[hi].classList.add('is-on');
    }, 4500);
  }

  /* ---------------- Scroll-Animationen ---------------- */
  const reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(el => io.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('is-visible'));
  }

  /* ---------------- KI-Bild-Platzhalter ----------------
     Liegt die Bilddatei im Ordner, wird sie gezeigt (mit Hinweis "Symbolbild (KI)").
     Fehlt sie, erscheint ein dezenter Platzhalter. */
  // Zufalls-Pool aus den KI-Visualisierungen (gemischt, ohne Doppelungen)
  const pool = Array.from({ length: CONFIG.RANDOM_IMAGE_COUNT }, (_, i) =>
    `assets/images/inspiration/idee-${String(i + 1).padStart(2, '0')}.jpg`);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const takeRandom = () => (CONFIG.RANDOM_PLACEHOLDER_IMAGES ? pool.pop() : null);

  $$('[data-slot]').forEach(slot => {
    const img = $('img', slot);
    const ok = () => { slot.hidden = false; slot.classList.remove('is-empty'); slot.classList.add('has-img'); };
    const fail = () => {
      if (!img.dataset.random) {
        const src = takeRandom();
        if (src) {
          img.dataset.random = '1';
          img.alt = T('js.kiAlt'); img.removeAttribute('data-i18n-attr');
          img.src = src;
          return;
        }
      }
      if (!CONFIG.SHOW_IMAGE_PLACEHOLDERS) { slot.hidden = true; return; }
      slot.classList.add('is-empty'); slot.classList.remove('has-img');
    };
    img.addEventListener('load', ok);
    img.addEventListener('error', fail);
    if (img.complete) (img.naturalWidth > 0 ? ok : fail)();
  });

  const finalBg = $('.final-bg');
  if (finalBg) {
    const useBg = src => {
      finalBg.style.backgroundImage = `url("${src}")`;
      finalBg.classList.add('loaded');
      $('.final-tag').hidden = false;
    };
    const probe = new Image();
    probe.onload = () => useBg(probe.src);
    probe.onerror = () => { const src = takeRandom(); if (src) useBg(src); };
    probe.src = finalBg.dataset.bg;
  }

  /* ---------------- Slider-Punkte (Referenzen mobil) ---------------- */
  const refs = $('.refs');
  const dots = $$('.slider-dots span');
  if (refs && dots.length) {
    const update = () => {
      const items = $$('.ref', refs);
      const center = refs.scrollLeft + refs.clientWidth / 2;
      let idx = 0, best = Infinity;
      items.forEach((it, i) => {
        const d = Math.abs(it.offsetLeft + it.offsetWidth / 2 - center);
        if (d < best) { best = d; idx = i; }
      });
      dots.forEach((d, i) => d.classList.toggle('on', i === idx));
    };
    refs.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
    update();
  }

  /* ---------------- Lightbox ---------------- */
  const lb = $('#lightbox');
  const lbImg = $('img', lb);
  const lbCap = $('.lb-cap', lb);
  const lbKind = $('.lb-kind', lb);
  let lbItems = [], lbIndex = 0, lbReturn = null;

  function lbShow(i) {
    lbIndex = (i + lbItems.length) % lbItems.length;
    const b = lbItems[lbIndex];
    const isKi = b.dataset.kind === 'ki';
    lbImg.src = b.dataset.src;
    lbImg.alt = $('img', b).alt;
    lbCap.textContent = b.dataset.caption || '';
    lbKind.textContent = T(isKi ? 'js.ki' : 'js.real');
    lbKind.className = 'lb-kind tag ' + (isKi ? 'is-ki tag-ki' : 'tag-real');
    const multi = lbItems.length > 1;
    $('.lb-prev', lb).hidden = !multi;
    $('.lb-next', lb).hidden = !multi;
  }
  function lbOpen(btn) {
    const gallery = btn.closest('[data-gallery]');
    lbItems = gallery ? $$('[data-lightbox]', gallery) : [btn];
    lbReturn = btn;
    lb.hidden = false;
    document.body.classList.add('no-scroll');
    lbShow(lbItems.indexOf(btn));
    $('.lb-close', lb).focus();
  }
  function lbClose() {
    lb.hidden = true;
    document.body.classList.remove('no-scroll');
    lbImg.removeAttribute('src');
    lbReturn?.focus();
  }
  $$('[data-lightbox]').forEach(b => b.addEventListener('click', () => lbOpen(b)));
  $('.lb-close', lb).addEventListener('click', lbClose);
  $('.lb-prev', lb).addEventListener('click', () => lbShow(lbIndex - 1));
  $('.lb-next', lb).addEventListener('click', () => lbShow(lbIndex + 1));
  lb.addEventListener('click', e => { if (e.target === lb) lbClose(); });
  document.addEventListener('keydown', e => {
    if (lb.hidden) return;
    if (e.key === 'Escape') lbClose();
    else if (e.key === 'ArrowLeft') lbShow(lbIndex - 1);
    else if (e.key === 'ArrowRight') lbShow(lbIndex + 1);
    else if (e.key === 'Tab') {
      const f = $$('button:not([hidden])', lb);
      const i = f.indexOf(document.activeElement);
      e.preventDefault();
      f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  });
  let touchX = null;
  lb.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', e => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50 && lbItems.length > 1) lbShow(lbIndex + (dx < 0 ? 1 : -1));
    touchX = null;
  });

  /* ======================================================================
     ANFRAGEFORMULAR (Multi-Step)
     ====================================================================== */
  const form = $('#request-form');
  if (!form) return;

  const steps = $$('[data-step]', form);
  const btnPrev = $('[data-prev]', form);
  const btnNext = $('[data-next]', form);
  const btnSubmit = $('[data-submit]', form);
  const bar = $('.progress-bar', form);
  const stepNow = $('[data-step-now]', form);
  $('[data-step-total]', form).textContent = steps.length;
  let current = 0;

  function goTo(i, focus = true) {
    steps[current].classList.remove('is-active');
    steps[current].hidden = true;
    current = Math.max(0, Math.min(steps.length - 1, i));
    steps[current].hidden = false;
    steps[current].classList.add('is-active');
    bar.style.width = `${((current + 1) / steps.length) * 100}%`;
    stepNow.textContent = current + 1;
    btnPrev.hidden = current === 0;
    btnNext.hidden = current === steps.length - 1;
    btnSubmit.hidden = current !== steps.length - 1;
    if (focus) {
      const card = $('.form-card');
      const top = card.getBoundingClientRect().top;
      if (top < 0 || top > window.innerHeight * 0.4) {
        card.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      }
      $('legend', steps[current]).setAttribute('tabindex', '-1');
      $('legend', steps[current]).focus({ preventScroll: true });
    }
  }

  const emailOk = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

  function setInvalid(field, bad) {
    field.classList.toggle('invalid', bad);
    $$('input, textarea', field).forEach(el => el.setAttribute('aria-invalid', String(bad)));
  }

  function validateStep(i) {
    let firstBad = null;
    const step = steps[i];
    // Text-/E-Mail-Felder
    $$('input[required]:not([type="radio"]):not([type="checkbox"])', step).forEach(el => {
      const v = el.value.trim();
      let bad = !v;
      if (!bad && el.type === 'email') bad = !emailOk(v);
      if (!bad && el.pattern) bad = !new RegExp(`^(?:${el.pattern})$`).test(v);
      setInvalid(el.closest('.field'), bad);
      if (bad && !firstBad) firstBad = el;
    });
    // Pflicht-Auswahlgruppen
    const groups = new Set($$('input[type="radio"][required]', step).map(r => r.name));
    groups.forEach(name => {
      const bad = !$(`input[name="${name}"]:checked`, step);
      const field = $(`input[name="${name}"]`, step).closest('.field');
      setInvalid(field, bad);
      if (bad && !firstBad) firstBad = $(`input[name="${name}"]`, step);
    });
    // Einwilligung
    $$('input[type="checkbox"][required]', step).forEach(cb => {
      setInvalid(cb.closest('.field'), !cb.checked);
      if (!cb.checked && !firstBad) firstBad = cb;
    });
    // Wunschfarbe (nur wenn "Andere Farbe" gewählt ist)
    const wish = $('[data-color-wish]', step);
    if (wish && !wish.hidden) {
      const bad = !$('#f-color').value.trim() && !hexTouched;
      setInvalid(wish, bad);
      if (bad && !firstBad) firstBad = $('#f-color');
    }
    if (firstBad) firstBad.focus();
    return !firstBad;
  }

  // Fehler entfernen, sobald korrigiert wird
  form.addEventListener('input', e => {
    const field = e.target.closest('.field');
    if (field?.classList.contains('invalid')) setInvalid(field, false);
  });
  form.addEventListener('change', e => {
    const field = e.target.closest('.field');
    if (field?.classList.contains('invalid')) setInvalid(field, false);
  });

  btnNext.addEventListener('click', () => { if (validateStep(current)) goTo(current + 1); });
  btnPrev.addEventListener('click', () => goTo(current - 1));

  // Enter in einem Eingabefeld = "Weiter" (nicht vorzeitig absenden)
  form.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.matches('input:not([type="checkbox"]):not([type="radio"]):not([type="file"])') && current < steps.length - 1) {
      e.preventDefault();
      btnNext.click();
    }
  });

  /* ---------------- Andere Farbe -> Wunschfarbe eingeben ---------------- */
  const otherColor = $('input[name="farben"][value="Andere Farbe"]', form);
  const colorWish = $('[data-color-wish]', form);
  const colorHex = $('#f-color-hex', form);
  let hexTouched = false;
  function updateColorWish(focus) {
    colorWish.hidden = !otherColor.checked;
    if (!otherColor.checked) setInvalid(colorWish, false);
    else if (focus) $('#f-color').focus();
  }
  otherColor.addEventListener('change', () => updateColorWish(true));
  colorHex.addEventListener('input', () => { hexTouched = true; setInvalid(colorWish, false); });

  /* ---------------- Entwurf aus dem Gestalter übernehmen ---------------- */
  const attached = $('.design-attached', form);
  let design = null; // { blob, url, summary }

  // Beschriftung einer Auswahl im Gestalter (in der aktuellen Sprache)
  function chipLabel(name, value) {
    const i = document.querySelector(`#gestalten input[name="${name}"][value="${value}"]`);
    const sp = i && i.closest('label').querySelector('span:not(.switch-track)');
    return sp ? sp.textContent.trim() : value;
  }
  // Zusammenfassung des Entwurfs für die Kundin (aktuelle Sprache); an dich geht die deutsche Fassung
  function localSummary() {
    const g = document.getElementById('gestalten');
    if (!g) return '';
    const head = el => (el ? el.childNodes[0].textContent.trim() : '');
    const parts = [];
    $$('.d-group', g).forEach(gr => {
      const q = $('p.q', gr);
      if (q) {
        const vals = $$('input:checked', gr).map(i => i.closest('label').querySelector('span').textContent.trim());
        if (vals.length) parts.push(`${q.textContent.trim()}: ${vals.join(', ')}`);
      } else {
        $$('label', gr).forEach(l => { const inp = $('input', l); if (inp && inp.value.trim()) parts.push(`${head($('.q', l))}: ${inp.value.trim()}`); });
      }
    });
    if ($('#d-light', g).checked) parts.push(T('js.light'));
    return parts.join(' | ');
  }
  if (window.i18n) window.i18n.onChange(() => {
    if (design) $('.design-sum', attached).textContent = localSummary();
    if (photos.length) say(countMsg());
    $$('.previews li', form).forEach(li => { $('img', li).alt = T('js.previewAlt'); $('button', li).setAttribute('aria-label', T('js.removeImg')); });
    toggle.setAttribute('aria-label', T(nav.classList.contains('open') ? 'js.menuClose' : 'js.menuOpen'));
    $$('[data-slot] img[data-random]').forEach(img => { img.alt = T('js.kiAlt'); });
  });

  function setChecks(name, values) {
    $$(`input[name="${name}"]`, form).forEach(i => { i.checked = values.includes(i.value); });
  }

  function prefillFromDesign(st) {
    const D = window.Designer;
    const farben = [], elemente = [], wishes = [];
    if (st.base === 'weiss' || st.base === 'creme') farben.push('Weiß / Creme');
    else if (st.base === 'beige') farben.push('Beige / Natur');
    else { farben.push('Andere Farbe'); wishes.push(st.base === 'eigene' ? T('js.customFromDesigner') : chipLabel('d_base', st.base)); }
    if (st.accent === 'gold') farben.push('Gold');
    else if (st.accent !== 'ohne') { if (!farben.includes('Andere Farbe')) farben.push('Andere Farbe'); wishes.push(T('js.asAccent', { x: chipLabel('d_accent', st.accent) })); }
    if (st.flowers === 'trocken') elemente.push('Trockenblumen');
    else if (st.flowers !== 'ohne') elemente.push('Blumen');
    if (st.struct !== 'schlicht') elemente.push('Struktur');
    if (st.phrase) elemente.push('Schriftzug');
    if (st.name) elemente.push('Name');
    if (st.date) elemente.push('Geburtsdatum');
    if (st.light) elemente.push('Beleuchtung');
    setChecks('farben', farben);
    setChecks('elemente', elemente);
    if (wishes.length) $('#f-color').value = wishes.join(', ');
    if (st.base === 'eigene') { colorHex.value = st.custom; hexTouched = true; }
    updateColorWish(false);
  }

  document.addEventListener('design:apply', async () => {
    const D = window.Designer;
    if (!D) return;
    try {
      const blob = await D.toJpegBlob();
      if (design?.url) URL.revokeObjectURL(design.url);
      design = { blob, url: URL.createObjectURL(blob), summary: D.summary() };
      $('img', attached).src = design.url;
      $('.design-sum', attached).textContent = localSummary();
      attached.hidden = false;
    } catch (err) {
      console.error('[Gestalter] Export fehlgeschlagen:', err);
      design = { blob: null, url: '', summary: D.summary() };
    }
    prefillFromDesign(D.state());
    if (!$('#form-success').hidden) return;
    $('#anfrage').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  });

  $('[data-design-remove]', attached).addEventListener('click', () => {
    if (design?.url) URL.revokeObjectURL(design.url);
    design = null;
    attached.hidden = true;
  });

  /* ---------------- Foto-Upload mit Vorschau & Größenprüfung ---------------- */
  const fileInput = $('#f-files');
  const drop = $('.drop', form);
  const previews = $('.previews', form);
  const fileMsg = $('.file-msg', form);
  const photos = []; // { id, name, blob, url }

  const fmtMB = b => (b / 1024 / 1024).toLocaleString(window.i18n ? window.i18n.locale : 'de-DE', { maximumFractionDigits: 1 }) + ' MB';
  const countMsg = () => T(photos.length === 1 ? 'js.selected1' : 'js.selectedN', { n: photos.length, mb: fmtMB(totalBytes()) });
  const totalBytes = () => photos.reduce((s, p) => s + p.blob.size, 0);

  function say(msg, warn = false) {
    fileMsg.textContent = msg;
    fileMsg.classList.toggle('warn', warn);
  }

  async function loadBitmap(file) {
    if ('createImageBitmap' in window) {
      try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (_) { /* Fallback unten */ }
    }
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file);
      const im = new Image();
      im.onload = () => { res(im); URL.revokeObjectURL(url); };
      im.onerror = () => { rej(new Error('decode')); URL.revokeObjectURL(url); };
      im.src = url;
    });
  }

  async function shrink(file) {
    const bmp = await loadBitmap(file);
    const w = bmp.width, h = bmp.height;
    const scale = Math.min(1, CONFIG.IMAGE_MAX_EDGE / Math.max(w, h));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    if (bmp.close) bmp.close();
    const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', CONFIG.IMAGE_QUALITY));
    if (!blob) throw new Error('encode');
    return blob;
  }

  async function addFiles(list) {
    const files = Array.from(list);
    const problems = [];
    for (const file of files) {
      if (photos.length >= CONFIG.MAX_FILES) { problems.push(T('js.maxFiles', { n: CONFIG.MAX_FILES })); break; }
      if (!/^image\//.test(file.type) && !/\.(heic|heif)$/i.test(file.name)) { problems.push(T('js.notImage', { name: file.name })); continue; }
      if (file.size > CONFIG.MAX_FILE_MB * 1024 * 1024) { problems.push(T('js.tooBig', { name: file.name, mb: CONFIG.MAX_FILE_MB })); continue; }
      say(T('js.preparing'));
      let blob;
      try { blob = await shrink(file); }
      catch (_) { problems.push(T('js.cantOpen', { name: file.name })); continue; }
      if (totalBytes() + blob.size > CONFIG.MAX_TOTAL_MB * 1024 * 1024) { problems.push(T('js.totalTooBig')); break; }
      const id = Math.random().toString(36).slice(2);
      const base = file.name.replace(/\.[^.]+$/, '').replace(/[^\w\-äöüÄÖÜß]+/g, '_').slice(0, 40) || 'foto';
      const p = { id, name: `${String(photos.length + 1).padStart(2, '0')}_${base}.jpg`, blob, url: URL.createObjectURL(blob) };
      photos.push(p);
      renderPreview(p);
    }
    if (problems.length) say(problems.join(' '), true);
    else say(photos.length ? countMsg() : '');
    fileInput.value = '';
  }

  function renderPreview(p) {
    const li = document.createElement('li');
    li.dataset.id = p.id;
    li.innerHTML = `<img alt="${T('js.previewAlt')}" src="${p.url}"><span class="size">${fmtMB(p.blob.size)}</span><button type="button" aria-label="${T('js.removeImg')}">×</button>`;
    $('button', li).addEventListener('click', () => {
      const i = photos.findIndex(x => x.id === p.id);
      if (i > -1) { URL.revokeObjectURL(photos[i].url); photos.splice(i, 1); }
      li.remove();
      say(photos.length ? countMsg() : T('js.removed'));
      fileInput.focus();
    });
    previews.appendChild(li);
  }

  fileInput.addEventListener('change', () => addFiles(fileInput.files));
  ['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove('drag'); }));
  drop.addEventListener('drop', e => { if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files); });

  /* ---------------- Daten sammeln ---------------- */
  function collect() {
    const fd = new FormData(form);
    const all = name => fd.getAll(name).map(String).filter(Boolean);
    const one = name => (fd.get(name) || '').toString().trim();
    return {
      name: one('name'),
      email: one('email'),
      telefon: one('telefon'),
      plz: one('plz'),
      ort: one('ort'),
      abdruck_vorhanden: one('abdruck_vorhanden'),
      masse: [one('breite_cm') && `Breite ${one('breite_cm')} cm`, one('hoehe_cm') && `Höhe ${one('hoehe_cm')} cm`, one('tiefe_cm') && `Tiefe ${one('tiefe_cm')} cm`].filter(Boolean).join(', '),
      zustand: one('zustand'),
      farben: all('farben'),
      farbe_wunsch: otherColor.checked ? one('farbe_wunsch') : '',
      farbe_hex: otherColor.checked && hexTouched ? one('farbe_hex') : '',
      entwurf: design ? design.summary : '',
      elemente: all('elemente'),
      idee: one('idee'),
      transport: one('transport'),
      budget: form.querySelector('.budget') ? one('budget') : '',   // Budget-Feld kann entfernt werden
      hinweise: one('hinweise'),
      einwilligung: fd.get('einwilligung') ? 'Ja' : 'Nein',
      anzahl_bilder: photos.length,
      sprache: window.i18n ? window.i18n.lang : 'de',
      gesendet_am: new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }),
      seite: location.href.split('#')[0]
    };
  }

  const toBase64 = blob => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(',')[1]);
    r.onerror = rej;
    r.readAsDataURL(blob);
  });

  /* ======================================================================
     FORMULAR-ANBINDUNG – hier wird die Anfrage tatsächlich versendet.
     Modus in CONFIG.FORM_MODE oben wählen.
     ====================================================================== */
  async function sendInquiry(data) {
    const mode = CONFIG.FORM_MODE;

    // --- 1) Google Apps Script (Gmail + PDF + Fotos als Anhang) ---
    if (mode === 'appsscript' && CONFIG.APPS_SCRIPT_URL) {
      const list = [...(design?.blob ? [{ name: '00_Entwurf_Gestalter.jpg', blob: design.blob }] : []), ...photos];
      const files = await Promise.all(list.map(async p => ({ name: p.name, mimeType: 'image/jpeg', data: await toBase64(p.blob) })));
      // Kein Content-Type-Header -> "text/plain", dadurch kein CORS-Preflight (funktioniert mit Apps Script)
      const res = await fetch(CONFIG.APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ data, files }), redirect: 'follow' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json().catch(() => ({}));
      if (!json.ok) throw new Error(json.error || 'Unbekannte Antwort');
      return { demo: false };
    }

    // --- 2) Formspree ---
    if (mode === 'formspree' && CONFIG.FORMSPREE_URL) {
      const fd = new FormData();
      Object.entries(data).forEach(([k, v]) => fd.append(k, Array.isArray(v) ? v.join(', ') : v));
      fd.append('_replyto', data.email);
      fd.append('_subject', `Neue Anfrage: ${data.name} (${data.ort})`);
      if (design?.blob) fd.append('entwurf_bild', design.blob, '00_Entwurf_Gestalter.jpg');
      photos.forEach(p => fd.append('bilder', p.blob, p.name)); // Datei-Upload nur im Formspree-Bezahltarif
      const res = await fetch(CONFIG.FORMSPREE_URL, { method: 'POST', body: fd, headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return { demo: false };
    }

    // --- 3) EmailJS ---
    if (mode === 'emailjs') return sendViaEmailJS(data);

    // --- 4) Demo-Modus: NICHTS wird versendet! ---
    console.warn('[Anfrageformular] DEMO-MODUS – die Anfrage wurde NICHT versendet. ' +
      'In script.js bei CONFIG.APPS_SCRIPT_URL die Web-App-URL eintragen (siehe README.txt, Punkt 4).');
    console.info('[Anfrageformular] Daten dieser Anfrage:', data, photos, design);
    await new Promise(r => setTimeout(r, 800));
    return { demo: true };
  }

  /* EmailJS (optional, Alternative):
     1. In index.html vor script.js einfügen:
        <script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js"></script>
     2. Werte unten eintragen und CONFIG.FORM_MODE = 'emailjs' setzen.
     Achtung: Empfänger-Adresse NUR im EmailJS-Template hinterlegen, nicht hier im Code.
     Hinweis: EmailJS erlaubt im Gratis-Tarif nur sehr kleine Anhänge (ca. 50 KB),
     Fotos daher besser per Google Apps Script senden. */
  async function sendViaEmailJS(data) {
    const SERVICE_ID = '', TEMPLATE_ID = '', PUBLIC_KEY = '';
    if (!window.emailjs || !SERVICE_ID) throw new Error('EmailJS ist nicht eingerichtet.');
    const params = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, Array.isArray(v) ? v.join(', ') : String(v)]));
    await window.emailjs.send(SERVICE_ID, TEMPLATE_ID, params, { publicKey: PUBLIC_KEY });
    return { demo: false };
  }

  /* ---------------- Absenden ---------------- */
  const sendError = $('.send-error', form);
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (current < steps.length - 1) { btnNext.click(); return; }
    if (!validateStep(current)) return;

    // Honeypot: Bots füllen das versteckte Feld aus -> still "Erfolg" zeigen
    if (form.firma_website.value) { showSuccess(false); return; }

    sendError.hidden = true;
    btnSubmit.disabled = true;
    btnPrev.disabled = true;
    const label = btnSubmit.textContent;
    btnSubmit.textContent = T(photos.length ? 'js.sendingPhotos' : 'js.sending');

    try {
      const result = await sendInquiry(collect());
      showSuccess(result.demo);
    } catch (err) {
      console.error('[Anfrageformular] Versand fehlgeschlagen:', err);
      sendError.textContent = T('js.sendError');
      sendError.hidden = false;
      sendError.focus?.();
    } finally {
      btnSubmit.disabled = false;
      btnPrev.disabled = false;
      btnSubmit.textContent = label;
    }
  });

  function showSuccess(isDemo) {
    form.hidden = true;
    const box = $('#form-success');
    $('.demo-note', box).hidden = !isDemo;
    box.hidden = false;
    box.focus({ preventScroll: true });
    $('.form-card').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    photos.forEach(p => URL.revokeObjectURL(p.url));
  }

  goTo(0, false);
})();
