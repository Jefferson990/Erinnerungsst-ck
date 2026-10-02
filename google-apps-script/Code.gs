/**
 * Erinnerungsstücke – Anfrage-Empfang per Google Apps Script
 * --------------------------------------------------------------
 * Empfängt die Anfrage der Website, erstellt daraus ein PDF und
 * sendet eine E-Mail an dein Gmail-Postfach mit:
 *   - Anfrage als PDF (Anhang)
 *   - allen hochgeladenen Fotos (Anhänge)
 * Optional: kurze Eingangsbestätigung an die Kundin.
 *
 * Einrichtung: siehe README.txt, Punkt 4.
 */

const SETTINGS = {
  // Anfragen gehen automatisch an das Google-Konto, dem dieses Skript gehört.
  // Keine Adresse im Code nötig. Andere Adresse gewünscht? Hier z. B. 'name@gmail.com' eintragen.
  // Geschäftsadresse für Anfragen. Skript unbedingt MIT DIESEM KONTO anlegen,
  // sonst kommen Bestätigungsmails von deiner privaten Adresse.
  EMPFAENGER: 'erinnerungsstuecke.sn@gmail.com',
  ABSENDER_NAME: 'Erinnerungsstücke – Website',
  BESTAETIGUNG_AN_KUNDIN: true,              // false = keine automatische Bestätigung
  MAX_BILDER: 9,                             // 8 Fotos + 1 Entwurf aus dem Gestalter
  MAX_GESAMT_MB: 22
};

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const d = body.data || {};
    const files = Array.isArray(body.files) ? body.files.slice(0, SETTINGS.MAX_BILDER) : [];

    if (!d.name || !d.email || d.einwilligung !== 'Ja') return json_({ ok: false, error: 'Pflichtangaben fehlen' });

    // Fotos dekodieren
    let total = 0;
    const bilder = files.map((f, i) => {
      const bytes = Utilities.base64Decode(f.data);
      total += bytes.length;
      const name = String(f.name || ('foto_' + (i + 1) + '.jpg')).replace(/[^\w.\-äöüÄÖÜß]/g, '_');
      return { blob: Utilities.newBlob(bytes, 'image/jpeg', name), b64: f.data, name: name };
    });
    if (total > SETTINGS.MAX_GESAMT_MB * 1024 * 1024) return json_({ ok: false, error: 'Bilder zu groß' });

    // PDF erzeugen (mit Bildern; falls das scheitert, ohne Bilder)
    const datei = 'Anfrage_' + safe_(d.name) + '_' + Utilities.formatDate(new Date(), 'Europe/Berlin', 'yyyy-MM-dd_HHmm') + '.pdf';
    let pdf;
    try { pdf = makePdf_(d, bilder, true).setName(datei); }
    catch (err) { pdf = makePdf_(d, bilder, false).setName(datei); }

    const betreff = 'Neue Anfrage: Babybauch-Abdruck – ' + d.name + (d.ort ? ' (' + d.ort + ')' : '');
    GmailApp.sendEmail(SETTINGS.EMPFAENGER, betreff, plain_(d), {
      htmlBody: html_(d, false),
      attachments: [pdf].concat(bilder.map(b => b.blob)),
      replyTo: d.email,
      name: SETTINGS.ABSENDER_NAME
    });

    if (SETTINGS.BESTAETIGUNG_AN_KUNDIN) {
      const m = CONFIRM[d.sprache] || CONFIRM.de;
      GmailApp.sendEmail(d.email, m.subject, m.body.replace('{name}', d.name),
        { name: SETTINGS.ABSENDER_NAME, replyTo: SETTINGS.EMPFAENGER });
    }

    return json_({ ok: true });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: String(err) });
  }
}

// Sprache der Kundin (von der Website mitgeschickt)
const LANG_NAMES = { de: 'Deutsch', en: 'Englisch', pt: 'Portugiesisch (Brasilien)', es: 'Spanisch', ru: 'Russisch', fr: 'Französisch' };

// Eingangsbestätigung in der Sprache der Kundin
const CONFIRM = {
  de: { subject: 'Deine Anfrage ist bei uns angekommen 🤍', body: 'Hallo {name},\n\nvielen Dank für deine Anfrage! Deine Erinnerung ist bei uns in guten Händen.\nWir schauen uns deine Angaben in Ruhe an und melden uns persönlich bei dir.\n\nHerzliche Grüße' },
  en: { subject: 'We have received your request 🤍', body: 'Hello {name},\n\nthank you very much for your request! Your keepsake is in good hands with us.\nWe will look through your details carefully and get back to you personally.\n\nWarm regards' },
  pt: { subject: 'Recebemos o seu pedido 🤍', body: 'Olá, {name}!\n\nMuito obrigada pelo seu pedido! A sua lembrança está em boas mãos conosco.\nVamos analisar as suas informações com calma e entraremos em contato pessoalmente.\n\nUm abraço carinhoso' },
  es: { subject: 'Hemos recibido tu solicitud 🤍', body: 'Hola, {name}:\n\n¡Muchas gracias por tu solicitud! Tu recuerdo está en buenas manos con nosotros.\nRevisaremos tus datos con calma y te contestaremos personalmente.\n\nUn saludo cariñoso' },
  ru: { subject: 'Мы получили вашу заявку 🤍', body: 'Здравствуйте, {name}!\n\nБольшое спасибо за вашу заявку! Ваша памятная вещь в надёжных руках.\nМы внимательно изучим ваши данные и лично свяжемся с вами.\n\nС теплом' },
  fr: { subject: 'Nous avons bien reçu votre demande 🤍', body: 'Bonjour {name},\n\nmerci beaucoup pour votre demande ! Votre souvenir est entre de bonnes mains.\nNous examinons vos informations avec attention et vous recontactons personnellement.\n\nBien chaleureusement' }
};

function doGet() {
  return ContentService.createTextOutput('Anfrage-Empfang ist aktiv.');
}

/* ---------- Hilfsfunktionen ---------- */

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function esc_(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>');
}

function safe_(v) { return String(v || 'Kundin').replace(/[^\wäöüÄÖÜß]+/g, '_').slice(0, 40); }

function list_(v) { return Array.isArray(v) ? v.join(', ') : (v || ''); }

function rows_(d) {
  return [
    ['Kontakt', null],
    ['Name', d.name], ['E-Mail', d.email], ['Telefon / WhatsApp', d.telefon], ['PLZ / Ort', [d.plz, d.ort].filter(String).join(' ')],
    ['Babybauch-Abdruck', null],
    ['Abdruck vorhanden', d.abdruck_vorhanden], ['Maße', d.masse], ['Zustand', d.zustand], ['Anzahl Fotos', d.anzahl_bilder],
    ['Gestaltungswunsch', null],
    ['Farben', list_(d.farben)], ['Wunschfarbe', [d.farbe_wunsch, d.farbe_hex ? 'Farbcode ' + d.farbe_hex : ''].filter(String).join(' – ')],
    ['Elemente', list_(d.elemente)], ['Idee', d.idee], ['Entwurf (Website-Gestalter)', d.entwurf],
    ['Organisation', null],
    ['Transport', d.transport], ['Budget', d.budget], ['Besondere Hinweise', d.hinweise],
    ['Sonstiges', null],
    ['Sprache der Website', LANG_NAMES[d.sprache] || d.sprache || 'Deutsch'],
    ['Einwilligung Datenverarbeitung', d.einwilligung], ['Gesendet am', d.gesendet_am], ['Seite', d.seite]
  ];
}

function html_(d, forPdf) {
  let t = '';
  rows_(d).forEach(function (r) {
    if (r[1] === null) {
      t += '<tr><td colspan="2" style="padding:18px 0 6px;font-size:15px;color:#7E5F27;border-bottom:1px solid #D8C29D;">' + esc_(r[0]) + '</td></tr>';
    } else {
      t += '<tr><td style="padding:7px 14px 7px 0;width:38%;vertical-align:top;color:#5E554D;">' + esc_(r[0]) + '</td>' +
           '<td style="padding:7px 0;vertical-align:top;color:#2E2A27;">' + (esc_(r[1]) || '–') + '</td></tr>';
    }
  });
  return '<div style="font-family:Georgia,serif;color:#2E2A27;max-width:640px;">' +
    '<h1 style="font-weight:normal;font-size:24px;margin:0 0 4px;">Neue Anfrage</h1>' +
    '<p style="margin:0 0 10px;color:#5E554D;font-family:Arial,sans-serif;font-size:13px;">Babybauch-Abdruck gestalten' + (forPdf ? '' : ' – PDF und Fotos im Anhang') + '</p>' +
    '<table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:13px;line-height:1.45;">' + t + '</table></div>';
}

function makePdf_(d, bilder, mitBildern) {
  let bild = '';
  if (mitBildern && bilder.length) {
    bild = '<h2 style="font-family:Georgia,serif;font-weight:normal;font-size:18px;margin:28px 0 10px;page-break-before:always;">Fotos des Abdrucks</h2>';
    bilder.forEach(function (b) {
      bild += '<div style="margin:0 0 16px;page-break-inside:avoid;"><img src="data:image/jpeg;base64,' + b.b64 +
              '" style="max-width:100%;max-height:640px;"><div style="font-family:Arial,sans-serif;font-size:11px;color:#5E554D;">' + esc_(b.name) + '</div></div>';
    });
  }
  const doc = '<html><head><meta charset="utf-8"></head><body style="margin:24px;">' + html_(d, true) + bild + '</body></html>';
  return Utilities.newBlob(doc, 'text/html', 'anfrage.html').getAs('application/pdf');
}

function plain_(d) {
  return rows_(d).map(function (r) { return r[1] === null ? '\n== ' + r[0] + ' ==' : r[0] + ': ' + (list_(r[1]) || '–'); }).join('\n');
}

/** Zum Testen im Editor: Funktion "testMail" auswählen und ausführen. */
function testMail() {
  doPost({ postData: { contents: JSON.stringify({
    data: { name: 'Test Kundin', email: SETTINGS.EMPFAENGER, plz: '74564', ort: 'Crailsheim', abdruck_vorhanden: 'Ja',
            farben: ['Gold'], elemente: ['Trockenblumen'], transport: 'Weiß ich noch nicht', einwilligung: 'Ja',
            gesendet_am: new Date().toLocaleString('de-DE'), anzahl_bilder: 0 },
    files: [] }) } });
}
