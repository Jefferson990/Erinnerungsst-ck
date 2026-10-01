// ------------------------------------------------------------
// TEST / KONTAKT
// ------------------------------------------------------------
// WhatsApp ist clientseitig und daher technisch sichtbar, sobald die Seite online ist.
// Diese Nummer ist aktuell nur für den Test gedacht.
const WHATSAPP_NUMBER = ['49','176','2395','9648'].join('');

// WICHTIG: Die Gmail-Adresse steht NICHT im Website-Code.
// Für den automatischen Versand wird eine private Google-Apps-Script-Web-App genutzt.
// Nach dem Bereitstellen die /exec-URL hier eintragen.
const GMAIL_WEBAPP_URL = '';
// ------------------------------------------------------------

const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Mobile Navigation
const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.main-nav');
if (menuButton && nav) {
  menuButton.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(open));
  });
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
  }));
}

// Scroll reveal
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: .12 });
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// Lightbox
const lightbox = document.getElementById('lightbox');
if (lightbox) {
  const lightboxImg = lightbox.querySelector('img');
  function openLightbox(card) {
    lightboxImg.src = card.dataset.full;
    lightboxImg.alt = card.dataset.alt || '';
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }
  function closeLightbox() {
    lightbox.classList.remove('open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }
  document.querySelectorAll('.gallery-card').forEach(card => {
    card.addEventListener('click', () => openLightbox(card));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openLightbox(card);
      }
    });
  });
  lightbox.querySelector('.lightbox-close')?.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
  window.addEventListener('keydown', e => { if (e.key === 'Escape' && lightbox.classList.contains('open')) closeLightbox(); });
}

// Alle Anfrage-Buttons scrollen liebevoll zum Formular.
const requestSection = document.getElementById('anfrage');
document.querySelectorAll('.open-form').forEach(btn => {
  btn.addEventListener('click', e => {
    e.preventDefault();
    requestSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

// Anfrageformular
const form = document.getElementById('request-form');
const steps = [...document.querySelectorAll('.form-step')];
const prevBtn = document.getElementById('prev-step');
const nextBtn = document.getElementById('next-step');
const submitBtn = document.getElementById('submit-form');
const formNav = document.querySelector('.request-form-nav');
const stepNow = document.getElementById('step-now');
const stepLabel = document.getElementById('step-label');
const progressBar = document.getElementById('progress-bar');
const successPanel = document.getElementById('success-panel');
const summaryOutput = document.getElementById('summary-output');
const labels = ['Kontakt', 'Dein Abdruck', 'Gestaltung', 'Transport', 'Abschluss'];
let currentStep = 1;

function updateStep() {
  if (!steps.length) return;
  steps.forEach(s => s.classList.toggle('active', Number(s.dataset.step) === currentStep));
  prevBtn.disabled = currentStep === 1;
  prevBtn.hidden = currentStep === 1;
  nextBtn.hidden = currentStep === steps.length;
  submitBtn.hidden = currentStep !== steps.length;
  formNav?.classList.toggle('single-action', currentStep === 1);
  stepNow.textContent = currentStep;
  stepLabel.textContent = labels[currentStep - 1];
  progressBar.style.width = `${currentStep / steps.length * 100}%`;
  document.querySelector('.request-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function validateCurrentStep() {
  const active = steps[currentStep - 1];
  if (!active) return true;
  const required = [...active.querySelectorAll('[required]')];
  let ok = true;
  const checkedRadioNames = new Set();

  required.forEach(field => {
    field.classList.remove('field-error');
    let valid = true;
    if (field.type === 'radio') {
      if (checkedRadioNames.has(field.name)) return;
      checkedRadioNames.add(field.name);
      valid = !!active.querySelector(`input[name="${field.name}"]:checked`);
    } else if (field.type === 'checkbox') {
      valid = field.checked;
    } else {
      valid = field.checkValidity();
    }
    if (!valid) {
      ok = false;
      field.classList.add('field-error');
    }
  });

  if (!ok) {
    const first = active.querySelector('.field-error') || active.querySelector('[required]');
    first?.focus({ preventScroll: true });
    active.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  return ok;
}

nextBtn?.addEventListener('click', () => {
  if (validateCurrentStep() && currentStep < steps.length) {
    currentStep++;
    updateStep();
  }
});
prevBtn?.addEventListener('click', () => {
  if (currentStep > 1) {
    currentStep--;
    updateStep();
  }
});
updateStep();

// Fotoauswahl / Vorschau
const fileInput = document.getElementById('photos');
const previewGrid = document.getElementById('preview-grid');
let selectedPhotos = [];

function renderPreviews() {
  if (!previewGrid) return;
  previewGrid.innerHTML = '';
  selectedPhotos.forEach(file => {
    const item = document.createElement('div');
    item.className = 'preview-item';
    const img = document.createElement('img');
    img.alt = '';
    const label = document.createElement('span');
    label.textContent = file.name;
    item.append(img, label);
    previewGrid.appendChild(item);
    const url = URL.createObjectURL(file);
    img.src = url;
    img.onload = () => URL.revokeObjectURL(url);
  });
}

fileInput?.addEventListener('change', () => {
  const files = [...fileInput.files];
  if (files.length > 6) {
    alert('Bitte wähle höchstens 6 Bilder aus.');
    fileInput.value = '';
    return;
  }
  const unsupported = files.filter(f => !['image/jpeg', 'image/png', 'image/webp'].includes(f.type));
  if (unsupported.length) {
    alert('Bitte nutze JPG, PNG oder WebP.');
    fileInput.value = '';
    return;
  }
  const tooLarge = files.filter(f => f.size > 8 * 1024 * 1024);
  if (tooLarge.length) {
    alert('Mindestens ein Bild ist größer als 8 MB. Bitte wähle kleinere Bilder.');
    fileInput.value = '';
    return;
  }
  selectedPhotos = files;
  renderPreviews();
});

function valuesByName(name) {
  return [...form.querySelectorAll(`[name="${name}"]:checked`)].map(i => i.value);
}

function getBudgetText(data) {
  const custom = String(data.get('budget_custom') || '').trim();
  if (custom) return `${custom} € (eigener Wunschbetrag)`;
  return data.get('budget_range') || 'nicht angegeben';
}

function getDimensionsText(data) {
  return [
    data.get('width') && `B ${data.get('width')} cm`,
    data.get('height') && `H ${data.get('height')} cm`,
    data.get('depth') && `T ${data.get('depth')} cm`
  ].filter(Boolean).join(' · ') || 'nicht angegeben';
}

function createSummary() {
  const data = new FormData(form);
  const styles = valuesByName('style').join(', ') || 'noch offen';
  const dimensions = getDimensionsText(data);
  const budget = getBudgetText(data);
  const publication = data.get('publication') || 'nicht angegeben';
  const place = [data.get('postal'), data.get('city')].filter(Boolean).join(' ');

  return [
    'UNVERBINDLICHE ANFRAGE – BABYBAUCH-ABDRUCK',
    '',
    'KONTAKT',
    `Name: ${data.get('name') || '-'}`,
    `E-Mail: ${data.get('email') || '-'}`,
    `Telefon / WhatsApp: ${data.get('phone') || '-'}`,
    `PLZ / Ort: ${place || '-'}`,
    '',
    'DER ABDRUCK',
    `Bereits vorhanden: ${data.get('exists') || '-'}`,
    `Maße: ${dimensions}`,
    `Zustand: ${data.get('condition') || '-'}`,
    `Bilder: ${selectedPhotos.length}`,
    '',
    'GESTALTUNG',
    `Wünsche: ${styles}`,
    `Eigene Idee: ${data.get('idea') || '-'}`,
    '',
    'ABWICKLUNG',
    `Transport: ${data.get('transport') || '-'}`,
    `Wunschbudget: ${budget}`,
    `Weitere Hinweise: ${data.get('notes') || '-'}`,
    `Veröffentlichung des fertigen Werks: ${publication}`
  ].join('\n');
}

function setComputedFields(summary) {
  const data = new FormData(form);
  const dimensions = getDimensionsText(data);
  const styles = valuesByName('style').join(', ') || 'noch offen';
  const budget = getBudgetText(data);
  const publication = data.get('publication') || 'nicht angegeben';
  document.getElementById('summary-field').value = summary;
  document.getElementById('dimensions-field').value = dimensions;
  document.getElementById('style-field').value = styles;
  document.getElementById('budget-field').value = budget;
  document.getElementById('publication-field').value = publication;
  document.getElementById('photo-count-field').value = String(selectedPhotos.length);
  document.getElementById('submitted-at-field').value = new Date().toLocaleString('de-DE');
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Bild konnte nicht gelesen werden')); };
    img.src = url;
  });
}

function canvasToBlob(canvas, quality) {
  return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
}

async function preparePhoto(file) {
  const img = await loadImage(file);
  let maxSide = 1600;
  let scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  let width = Math.max(1, Math.round(img.naturalWidth * scale));
  let height = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  let blob = await canvasToBlob(canvas, .78);
  if (blob && blob.size > 1.2 * 1024 * 1024) {
    maxSide = 1350;
    scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    width = Math.max(1, Math.round(img.naturalWidth * scale));
    height = Math.max(1, Math.round(img.naturalHeight * scale));
    canvas.width = width;
    canvas.height = height;
    const ctx2 = canvas.getContext('2d');
    ctx2.fillStyle = '#ffffff';
    ctx2.fillRect(0, 0, width, height);
    ctx2.drawImage(img, 0, 0, width, height);
    blob = await canvasToBlob(canvas, .68);
  }
  if (!blob) throw new Error('Bildkomprimierung fehlgeschlagen');

  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  const base = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]+/g, '_') || 'foto';
  return { name: `${base}.jpg`, type: 'image/jpeg', data: base64 };
}

async function buildGmailPayload(summary) {
  const data = new FormData(form);
  const files = [];
  for (const photo of selectedPhotos) files.push(await preparePhoto(photo));
  return {
    website: data.get('website') || '',
    name: data.get('name') || '',
    email: data.get('email') || '',
    phone: data.get('phone') || '',
    postal: data.get('postal') || '',
    city: data.get('city') || '',
    exists: data.get('exists') || '',
    dimensions: getDimensionsText(data),
    condition: data.get('condition') || '',
    styles: valuesByName('style').join(', ') || 'noch offen',
    idea: data.get('idea') || '',
    transport: data.get('transport') || '',
    budget: getBudgetText(data),
    notes: data.get('notes') || '',
    publication: data.get('publication') || 'nicht angegeben',
    summary,
    submittedAt: new Date().toLocaleString('de-DE'),
    files
  };
}

async function sendToGmailBackend(payload) {
  // text/plain + no-cors verhindert, dass die private Empfängeradresse im Browser stehen muss.
  // Die Web-App sendet die strukturierte E-Mail und hängt die Bilder an.
  await fetch(GMAIL_WEBAPP_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  });
}

form?.addEventListener('submit', async e => {
  e.preventDefault();
  if (!validateCurrentStep()) return;
  const honeypot = form.querySelector('[name="website"]');
  if (honeypot?.value) return;

  const summary = createSummary();
  setComputedFields(summary);
  const originalSubmitText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = selectedPhotos.length ? 'Bilder werden vorbereitet …' : 'Anfrage wird gesendet …';

  let sent = false;
  let errorMessage = '';
  if (GMAIL_WEBAPP_URL) {
    try {
      const payload = await buildGmailPayload(summary);
      submitBtn.textContent = 'Anfrage wird gesendet …';
      await sendToGmailBackend(payload);
      sent = true;
    } catch (err) {
      console.error(err);
      errorMessage = 'Der automatische Versand konnte nicht abgeschlossen werden.';
    }
  }

  form.hidden = true;
  document.querySelector('.request-card .progress-wrap').hidden = true;
  successPanel.hidden = false;
  summaryOutput.value = summary;

  const title = successPanel.querySelector('h3');
  const msg = document.getElementById('success-message');
  if (sent) {
    title.textContent = 'Danke. Deine Anfrage ist angekommen. 🤍';
    msg.textContent = 'Die Angaben wurden als übersichtliche E-Mail versendet; deine ausgewählten Bilder wurden als Anlagen vorbereitet. Wir melden uns persönlich bei dir.';
  } else {
    title.textContent = 'Deine Anfrage ist vorbereitet. 🤍';
    msg.textContent = errorMessage || 'Testmodus: Die Gmail-Web-App ist noch nicht verbunden. Deine Angaben sind vollständig vorbereitet; nach dem einmaligen Einrichten wird derselbe Button alles automatisch versenden.';
  }

  const wa = document.getElementById('whatsapp-summary');
  if (wa) wa.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(summary)}`;

  submitBtn.disabled = false;
  submitBtn.textContent = originalSubmitText;
  successPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

document.getElementById('copy-summary')?.addEventListener('click', async e => {
  const text = summaryOutput.value;
  try {
    await navigator.clipboard.writeText(text);
    e.currentTarget.textContent = 'Kopiert ✓';
  } catch {
    summaryOutput.select();
    document.execCommand('copy');
    e.currentTarget.textContent = 'Kopiert ✓';
  }
});

// WhatsApp im Footer – Nummer selbst wird nirgends ausgeschrieben.
document.getElementById('footer-whatsapp')?.addEventListener('click', e => {
  e.preventDefault();
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hallo, ich interessiere mich für die Gestaltung meines Babybauch-Abdrucks.')}`, '_blank', 'noopener');
});
