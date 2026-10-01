ERINNERUNGSSTÜCK – WEBSITE
=========================

Die Website ist fertig und läuft komplett statisch.
Zum Testen einfach index.html öffnen.
Für die Veröffentlichung eignet sich z.B. GitHub Pages.

WICHTIG VOR VERÖFFENTLICHUNG
----------------------------
1. Arbeitsname „Erinnerungsstück“ ggf. durch euren gewünschten Namen ersetzen.
2. Prüfen, ob der gewünschte Name marken-/kennzeichenrechtlich frei ist.
3. E-Mail-Adresse ersetzen.
4. WhatsApp-Nummer eintragen.
5. Impressum und Datenschutz mit echten Angaben füllen und rechtlich prüfen.
6. Formularversand aktivieren.

DIE DREI REFERENZBILDER
-----------------------
Die drei echten Bilder liegen bereits hier:
assets/images/referenz-1.jpg
assets/images/referenz-2.jpg
assets/images/referenz-3.jpg

Wenn du ein Bild austauschen möchtest, ersetze einfach die jeweilige JPG-Datei und behalte den Dateinamen bei.

WHATSAPP-NUMMER ÄNDERN
----------------------
Datei: script.js
Ganz oben steht:
const WHATSAPP_NUMBER = '491234567890';

Beispiel:
+49 171 1234567 wird zu 491711234567
Kein Pluszeichen, keine Leerzeichen.

E-MAIL ÄNDERN
-------------
Datei: index.html
Suche nach:
DEINE-EMAIL@BEISPIEL.DE
und ersetze diesen Text durch die echte E-Mail-Adresse.

FORMULAR AUTOMATISCH PER E-MAIL SENDEN
--------------------------------------
Aktuell zeigt die Seite nach dem Absenden eine Zusammenfassung und kann sie für WhatsApp vorbereiten.

Für echten automatischen Versand kann Formspree verwendet werden:
1. Bei Formspree ein Formular erstellen.
2. Den Endpoint kopieren, z.B. https://formspree.io/f/xxxxxxx
3. In script.js oben eintragen:
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xxxxxxx';

Danach versucht die Website den Inhalt inklusive hochgeladener Bilder automatisch zu übermitteln.
Bitte die Datenschutzseite entsprechend anpassen.

GITHUB PAGES
------------
1. Neues GitHub Repository anlegen.
2. Alle Dateien und Ordner aus diesem Website-Ordner hochladen.
3. GitHub → Settings → Pages.
4. „Deploy from a branch“ auswählen.
5. Branch „main“ und Ordner „/root“ auswählen.
6. Speichern.

IMPRESSUM / DATENSCHUTZ
-----------------------
Dateien:
impressum.html
datenschutz.html

Alle Angaben in [ECKIGEN KLAMMERN] ersetzen.
Bitte vor einer echten Veröffentlichung rechtlich prüfen lassen.

WEITERE REFERENZBILDER
----------------------
1. Neues Bild nach assets/images/ kopieren.
2. In index.html im Bereich „gallery-grid“ eine bestehende <figure>...</figure>-Karte kopieren.
3. Dateiname, alt-Text und Beschreibung anpassen.

VERSAND
-------
Auf der Seite werden keine festen Versandpreise versprochen.
Bei großen/empfindlichen Abdrücken wird die Transportart individuell geprüft; Spedition ist als Option erwähnt.

HINWEIS ZU KI-BILDERN
---------------------
Diese Version verwendet absichtlich nur eure drei echten Arbeiten und abstrakte Gestaltungselemente. So wird nichts KI-generiertes mit echten Referenzen verwechselt.
Wenn später KI-Stimmungsbilder ergänzt werden, sollten sie ausdrücklich nur als Atmosphäre/Illustration eingesetzt und nie als echte Kundenarbeit dargestellt werden.


PAYPAL / PREISE
---------------
Die Website erklärt, dass Preise individuell nach Wunsch, Material und Aufwand erstellt werden.
Die Bezahlung ist aktuell als PayPal vorgesehen. Die PayPal-Adresse selbst ist bewusst noch nicht fest im Code hinterlegt.
Versandkosten werden zusätzlich berechnet und nach fertig verpackten Maßen ermittelt.


TESTKONTAKT
-----------
Die Testversion enthält einen WhatsApp-Testkontakt und einen E-Mail-Testkontakt im JavaScript. Beide werden nicht als Klartext auf der sichtbaren Website angezeigt. Achtung: Bei einer statischen GitHub-Pages-Seite kann JavaScript technisch von Besuchern eingesehen werden. Für den Live-Betrieb sollten die endgültige Empfänger-E-Mail und sensible Kontaktdaten über einen serverseitigen Formular-Dienst (z. B. Formspree) hinterlegt werden.


ANFRAGEFORMULAR / GMAIL
-----------------------
Das Anfrageformular ist jetzt als eigener, liebevoll gestalteter Bereich direkt in die Seite eingebaut.
Die automatische Gmail-Zustellung wird über eine private Google-Apps-Script-Web-App vorbereitet.
Siehe GMAIL-EINRICHTUNG.txt und GOOGLE-APPS-SCRIPT-Code.gs.txt.
Die private Empfänger-E-Mail-Adresse gehört nur in Google Apps Script und nicht in die öffentliche Website.
Bis zu 6 Fotos werden für den E-Mail-Versand automatisch verkleinert und können vom Apps-Script als Anlagen verschickt werden.
