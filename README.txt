ERINNERUNGSSTÜCKE – Website für Babybauch-Abdrücke
==================================================

ORDNER
  index.html              Startseite
  style.css               Gestaltung
  script.js               Funktionen + EINSTELLUNGEN (ganz oben)
  designer.js             „Selbst gestalten“ (Bedienung + 2D-Ersatzvorschau)
  designer3d.js           3D-Vorschau (Relief, Blattgold, Blumen, drehbar)
  assets/js/three.min.js  3D-Bibliothek three.js (MIT-Lizenz)
  impressum.html          Impressum (Platzhalter ausfüllen!)
  datenschutz.html        Datenschutz (Platzhalter ausfüllen!)
  assets/images/          Bilder
    referenz-1.jpg        ECHT: Strukturdesign mit Weiß- und Goldakzenten
    referenz-2.jpg        ECHT: Natürliches Design mit Trockenblumen
    referenz-3.jpg        ECHT: Florales Design mit weißen Blüten und Gold (auch im Hero)
    inspiration/          10 KI-Visualisierungen (Bereich „Gestaltungsideen“, als KI gekennzeichnet)
    ki/                   hier kommen die selbst erzeugten KI-Bilder hinein (siehe KI-BILDER-PROMPTS.txt)
    og-image.jpg          Vorschaubild für WhatsApp/Facebook
  assets/fonts/           Schriften (lokal, keine Google-Verbindung)
  google-apps-script/Code.gs   Empfang der Anfragen per Gmail (PDF + Fotos)
  KI-BILDER-PROMPTS.txt   Prompts für die KI-Bilder


1. DIE DREI ECHTEN BILDER
-------------------------
Sind bereits eingebaut:
  assets/images/referenz-1.jpg
  assets/images/referenz-2.jpg
  assets/images/referenz-3.jpg
Austauschen: neue Datei mit GLEICHEM Namen dort speichern (JPG, Hochformat 4:5 ideal).


2. + 3. KONTAKT / E-MAIL / TELEFON
----------------------------------
Kontakt läuft AUSSCHLIESSLICH über das Anfrageformular. Telefonnummer und
E-Mail-Adresse stehen nirgends im öffentlichen Code (index.html, script.js).
Empfänger: automatisch das Gmail-Konto, mit dem das Apps Script angelegt wird.
Die Adresse steht auch in Code.gs nicht drin – der ganze Ordner kann also
bedenkenlos zu GitHub hochgeladen werden.
Impressum: Eine E-Mail-Adresse ist dort gesetzlich Pflicht (§ 5 DDG) – dafür
am besten eine eigene, separate Adresse anlegen (z. B. neues Gmail-Konto).


4. FORMULAR ANBINDEN
--------------------
Solange nichts eingerichtet ist, läuft der DEMO-MODUS: Die Kundin sieht die
Danke-Seite mit dem Hinweis „Demo-Modus“, es wird aber NICHTS versendet.

EMPFOHLEN: Google Apps Script (kostenlos)
-> Jede Anfrage kommt in Gmail an: Anfrage als PDF + alle Fotos als Anhang,
   Hinweis: Die Bestätigungsmail an die Kundin kommt von deinem Gmail-Konto
   (zeigt also deine Adresse). Nicht gewünscht? Code.gs: BESTAETIGUNG_AN_KUNDIN: false
   „Antworten“ geht direkt an die Kundin. Optional erhält die Kundin
   eine kurze Eingangsbestätigung (Code.gs: BESTAETIGUNG_AN_KUNDIN).

  a) Mit dem Gmail-Konto anmelden, das die Anfragen bekommen soll.
  b) https://script.google.com  ->  „Neues Projekt“.
  c) Inhalt von Code.gs komplett löschen, Inhalt von google-apps-script/Code.gs
     einfügen, speichern (Disketten-Symbol).
  d) Oben die Funktion „testMail“ auswählen  ->  „Ausführen“.
     Berechtigungen erlauben (bei „Google hat diese App nicht überprüft“:
     „Erweitert“ -> „Zu … wechseln (unsicher)“ – es ist dein eigenes Skript).
     Es kommt eine Test-Mail mit PDF.
  e) „Bereitstellen“ -> „Neue Bereitstellung“ -> Zahnrad -> „Web-App“
       Ausführen als:  Ich
       Zugriff:        Jeder
     -> „Bereitstellen“ -> Web-App-URL kopieren (endet auf /exec).
  f) script.js:  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/.../exec'
     Bei späteren Änderungen an Code.gs: „Bereitstellen“ -> „Bereitstellungen
     verwalten“ -> Stift -> Version „Neue Version“ -> Bereitstellen (URL bleibt gleich).
  Limits: Fotos werden im Browser automatisch auf max. 2000 px verkleinert,
  max. 8 Fotos, max. 18 MB gesamt. Gmail (privat): ca. 100 Mails pro Tag.

ALTERNATIVE Formspree:
  formspree.io -> Formular anlegen -> URL kopieren
  script.js: FORM_MODE: 'formspree', FORMSPREE_URL: 'https://formspree.io/f/...'
  Hinweis: Foto-Anhänge nur im Bezahltarif, kein PDF.

ALTERNATIVE EmailJS:
  script.js -> Funktion sendViaEmailJS() (Anleitung steht im Code).
  Hinweis: Gratis-Tarif erlaubt praktisch keine Foto-Anhänge.


5. VERÖFFENTLICHEN MIT GITHUB PAGES
-----------------------------------
  a) github.com -> „New repository“ (z. B. „babybauch“) -> Public -> Create.
  b) „uploading an existing file“ -> den GESAMTEN Inhalt dieses Ordners
     (alle Dateien UND Ordner) ins Fenster ziehen -> „Commit changes“.
     Wichtig: index.html muss direkt im Hauptverzeichnis liegen.
  c) Settings -> Pages -> Source: „Deploy from a branch“ -> Branch „main“, Ordner
     „/ (root)“ -> Save. Nach 1–2 Minuten ist die Seite online:
     https://DEIN-NAME.github.io/babybauch/
  d) In index.html alle „[DEINE-DOMAIN]“ durch diese Adresse ersetzen
     (canonical, og:url, og:image, JSON-LD) – wichtig für die WhatsApp-Vorschau.
  e) Eigene Domain (optional): Settings -> Pages -> Custom domain.


6. IMPRESSUM UND DATENSCHUTZ
----------------------------
impressum.html und datenschutz.html öffnen und alle Platzhalter in
[ECKIGEN KLAMMERN] ersetzen: [NAME] [ANSCHRIFT] [E-MAIL] [TELEFON] usw.
VOR VERÖFFENTLICHUNG RECHTLICHE ANGABEN ERGÄNZEN UND PRÜFEN.
Die Texte sind Vorlagen, keine Rechtsberatung.


7. WEITERE REFERENZBILDER HINZUFÜGEN
------------------------------------
  a) Foto als JPG speichern, z. B. assets/images/referenz-4.jpg
  b) index.html -> Bereich „4. ECHTE REFERENZEN“ -> einen kompletten Block
     <li class="ref reveal"> … </li> kopieren und darunter einfügen.
  c) Im kopierten Block anpassen: data-src, src, alt, data-caption und
     den Text in <p class="ref-caption">.
  d) Überschrift „Drei Erinnerungen …“ ggf. anpassen.
  e) Nur bei 4+ Bildern auf dem Handy: in index.html bei <div class="slider-dots">
     ein weiteres <span></span> ergänzen.
  KI-Bilder NIEMALS dort einfügen – dafür gibt es den Bereich „Gestaltungsideen“
  (data-kind="ki", Kennzeichnung „KI-Visualisierung“).


SONSTIGES
---------
- „Selbst gestalten“ (Entwurfs-Gestalter): Logik in designer.js. Die Kundin wählt
  Grundfarbe (auch eigene Farbe), Akzent, Struktur, Stoffband, Blumen,
  Schriftzug (im Bogen), Extras (Perlen, Mond & Sterne, Ornamente), Name, Datum, Licht.
  „Diesen Entwurf anfragen“ füllt das Formular vor und schickt den Entwurf als
  Bild (00_Entwurf_Gestalter.jpg) + Zusammenfassung im PDF mit.
  Farben ändern: designer.js -> BASES / ACCENTS; Buttons dazu in index.html (5b).
  3D-Vorschau: designer3d.js mit three.js (lokal in assets/js/, keine externe
  Verbindung). Wird erst geladen, wenn der Bereich sichtbar wird. Ohne WebGL
  erscheint automatisch die einfache 2D-Vorschau.
- „Andere Farbe“ im Formular: Es erscheint ein Feld für die Wunschfarbe
  (Text + Farbwähler), Pflichtangabe sobald „Andere Farbe“ angehakt ist.
- Markenname „Erinnerungsstücke“: in index.html (Kopfzeile, Footer, JSON-LD),
  impressum.html und datenschutz.html suchen & ersetzen.
- Preise später ergänzen: index.html -> Bereich „7. PREISE“ -> auskommentierten
  Block <dl class="price-list"> aktivieren.
- Budget-Frage entfernen: index.html -> zwischen BUDGET-START und BUDGET-ENDE löschen.
- KI-Bilder (Platzhalter): Datei mit passendem Namen in assets/images/ki/ legen –
  wird automatisch angezeigt und mit „Symbolbild (KI)“ markiert.
  Solange dort kein eigenes Bild liegt, wird automatisch ein zufälliges Bild aus
  assets/images/inspiration/ eingesetzt (bei jedem Seitenaufruf neu, ohne Doppelungen).
  Abschalten: script.js -> RANDOM_PLACEHOLDER_IMAGES: false
  (dann Platzhalter-Felder bzw. mit SHOW_IMAGE_PLACEHOLDERS: false ausgeblendet).
  Bis dahin zeigt die Browser-Konsole für diese Dateien „404“ – das ist normal.
