# Anforderungsspezifikation: Feature „Fett“

Status: **Nicht vertrauenswürdig — vollständige Verifikation ausstehend.** Laut
`specs/FEATURE-BACKLOG.md` (Zeile „fett“, Abschnitt 2.2) als **vorhanden** geführt
(Priorität 1/essenziell), Beschreibung dort: „Schaltet Fettdruck auf Selektion bzw.
an der Schreibmarke um.“ Diese Datei ersetzt die Beschreibung nicht, sondern macht
sie so detailliert und einzeln abhakbar, dass ein QA-Agent jeden Punkt über echte
Browser-Bedienung (nicht nur Unit-Tests) nachweisen oder widerlegen kann.

Geltungsbereich: Ausschließlich das Zeichenformat „Fett“ (`strong`-Mark im
gemeinsamen ProseMirror-Schema, `src/formats/shared/schema.ts`). Gilt für **beide**
Formate, DOCX und ODT, sowohl beim Import einer bestehenden Datei als auch beim
Export eines im Editor erstellten/bearbeiteten Dokuments — inklusive Rundreise
(Datei hochladen → unverändert exportieren → Ergebnis entspricht inhaltlich dem
Original). Stil und Gliederung orientieren sich an
`E:\docs\FEATURE-SPEC-DOCX-ODT.md`.

Referenzierter Ist-Stand des Codes (Grundlage dieser Anforderung, **kein** Nachweis
der Korrektheit — das ist Aufgabe der Verifikation):

| Ort | Inhalt |
|---|---|
| `src/formats/shared/schema.ts:110-115` | Mark `strong`, `parseDOM` erkennt `<strong>`, `<b>` sowie CSS `font-weight: bold` sowie numerisch `500`–`999`; `toDOM` rendert `<strong>0</strong>` |
| `src/formats/shared/editor/Toolbar.tsx:135` | Toolbar-Button „F“ (`MarkButton mark="strong" title="Fett"`), Glyph über CSS-Klasse `font-bold`, kein SVG-Icon |
| `src/formats/shared/editor/WordEditor.tsx:76` | Tastenkombination `Mod-b` (Strg+B / Cmd+B) → `toggleMark(wordSchema.marks.strong)` |
| `src/formats/docx/reader.ts:102` | DOCX-Import: `<w:b/>` in `w:rPr` → Mark `strong` |
| `src/formats/docx/writer.ts:21` | DOCX-Export: Mark `strong` → `<w:b/>` in `w:rPr` |
| `src/formats/docx/styleDefs.ts:14` | Absatzformat „Heading 1–6“ deklariert in `styles.xml` bereits `<w:b/>` auf Stil-Ebene (unabhängig vom Run-Mark) |
| `src/formats/odt/reader.ts:51,87` | ODT-Import: `fo:font-weight="bold"` in Text-Style-Eigenschaften → Mark `strong` |
| `src/formats/odt/writer.ts:28` | ODT-Export: Mark `strong` → `fo:font-weight="bold"` (+ `-asian`/`-complex`-Varianten) |
| `src/formats/odt/styleRegistry.ts:48` | Erzeugt deduplizierte `style:style`-Definitionen je Markkombination (`T1`, `T2`, …) |
| `src/formats/odt/styleRegistry.ts:89` | Absatzformat „Überschrift“ deklariert ebenfalls `fo:font-weight="bold"` auf Stil-Ebene, unabhängig vom Run-Mark |
| `src/index.css` (Zeile ~60) | `.ProseMirror h1/h2/h3 { font-weight: 600; }` — Fettdarstellung von Überschriften im Editor kommt aus CSS, **nicht** aus dem `strong`-Mark |
| `tests/e2e/docx.spec.ts:60,99` | Vorhandene, aber laut Auftrag nicht vertrauenswürdige E2E-Tests: „types and bolds text“, Rundreise-Test |
| `tests/e2e/odt.spec.ts:44,80` | Analoge Tests für ODT |
| `tests/e2e/selection-regression.spec.ts` | Regressionstest, der „Fett“ als Auslöser für den Selection-Sync-Bug (siehe Abschnitt 6) verwendet |

---

## 1. Bedienelemente

| # | Element | Fundstelle | Ist-Verhalten laut Code | Anforderung |
|---|---|---|---|---|
| 1 | Toolbar-Button „F“ | `Toolbar.tsx:135`, Titel/`aria-label` „Fett“ | Ruft `toggleMark(strong)` auf, `onMouseDown` mit `preventDefault()` (verhindert Fokusverlust/Selektionsverlust) | Muss per Maus **und** Tastatur (Tab-Fokus + Enter/Space) auslösbar sein; `aria-pressed` muss den tatsächlichen Zustand an der aktuellen Cursor-Position/Selektion widerspiegeln |
| 2 | Tastenkombination Strg+B (Windows/Linux) bzw. Cmd+B (macOS) | `WordEditor.tsx:76`, `keymap({'Mod-b': toggleMark(...)})` | Wirkt identisch zum Toolbar-Button | Muss in allen unterstützten Browsern funktionieren und nicht mit einer Browser-eigenen Tastenkombination kollidieren (z. B. Lesezeichen-Leiste) |
| 3 | Icon-Rendering des Buttons | `Toolbar.tsx:59`, `<span className="font-bold">F</span>` | Reiner Buchstabe „F“ mit CSS-Fettung, kein SVG | Laut `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.1 als Risiko dokumentiert: Muss auf Systemen ohne Standard-Systemschriftart weiterhin eindeutig als „Fett“-Schalter erkennbar sein (Tooltip/`aria-label` vorhanden — rein visuelle Erkennbarkeit dennoch prüfen, ggf. auf SVG umstellen) |
| 4 | Aktiver Zustand des Buttons | `Toolbar.tsx:42`, `markType.isInSet(view.state.selection.$from.marks())` | Prüft Marks **an der Position `$from`**, nicht über die gesamte Selektion gemittelt | Bei gemischter Selektion (teils fett, teils nicht) muss das Verhalten der Zustandsanzeige spezifiziert und konsistent mit dem Toggle-Ergebnis sein (siehe Grenzfall 3.3) |
| 5 | Kontextmenü (Rechtsklick) | nicht vorhanden | — | Kein Kontextmenü-Eintrag „Fett“ vorhanden; nicht Teil dieser Anforderung, aber als fehlend zu dokumentieren, falls Nutzererwartung vorhanden |

---

## 2. Gewünschtes Verhalten im Detail

### 2.1 Toggle auf bestehender Selektion
- Ist mindestens ein Zeichen markiert und **kein** Zeichen davon ist fett → gesamte
  Selektion wird fett.
- Ist die gesamte Selektion bereits fett → Fett wird für die gesamte Selektion
  entfernt (echtes Toggle, kein reines „Setzen“).
- Ist die Selektion gemischt (teils fett, teils nicht) → siehe Grenzfall 3.3
  (Standard-ProseMirror-/Word-Verhalten: erster Durchlauf setzt fett auf den
  gesamten Bereich; das muss hier explizit erwartet und getestet werden, nicht nur
  angenommen).
- Die Aktion ist ein einzelner Undo-Schritt (ein Strg+Z macht die gesamte
  Fett-Anwendung auf die Selektion rückgängig, nicht Zeichen für Zeichen).

### 2.2 Toggle an der Schreibmarke (keine Selektion)
- Cursor ohne Selektion, „Fett“ aktiviert → nachfolgend getippter Text ist fett,
  bereits vorhandener Text links/rechts der Schreibmarke bleibt unverändert.
- Erneutes Umschalten vor dem nächsten Tastendruck → Zustand kippt zurück (kein
  Zwischenspeichern in der Historie, solange nichts getippt wurde — analog zu
  Word/LibreOffice: reines Umschalten des „gespeicherten Marks“ ohne Dokument-
  änderung soll idealerweise **keinen** eigenen Undo-Schritt erzeugen).
- Schreibmarke direkt neben fettem Text (Cursor unmittelbar vor/nach einem fetten
  Textlauf, ohne Selektion) → Grenzfall, siehe 3.2.

### 2.3 Anzeige des aktiven Zustands
- Toolbar-Button zeigt gedrückt/aktiv (`aria-pressed="true"`, visuell abgesetzter
  Hintergrund gemäß `Toolbar.tsx:53-57`), wenn:
  - Cursor ohne Selektion in bereits fettem Text steht, **oder**
  - ein an der Schreibmarke „vorgemerktes“ Fett-Mark aktiv ist (nächstes Getipptes
    wird fett), **oder**
  - bei Selektion: mindestens der Zustand an `$from` fett ist (aktuelle
    Implementierung — zu verifizieren, ob das der gewünschten UX entspricht, siehe
    3.3).
- Zustand aktualisiert sich sofort bei jeder Cursor-Bewegung/Selektionsänderung,
  ohne dass eine zusätzliche Aktion nötig ist.

### 2.4 Kombination mit anderen Zeichenformaten
- Fett lässt sich gleichzeitig mit Kursiv, Unterstrichen, Durchgestrichen,
  Schriftfarbe und Hervorhebungsfarbe auf denselben Textlauf anwenden; das
  Umschalten von Fett darf keines der anderen gleichzeitig aktiven Marks entfernen
  oder verändern.
- Reihenfolge des Anwendens (z. B. erst Farbe, dann Fett, oder umgekehrt) darf zu
  keinem unterschiedlichen Endergebnis führen.

### 2.5 Interaktion mit Absatzformaten (Überschriften)
- Überschriften (`heading`-Node, Ebene 1–6) erscheinen im Editor bereits optisch
  fett durch CSS (`index.css`, `.ProseMirror h1/h2/h3 { font-weight: 600 }`), **nicht**
  durch das `strong`-Mark. Das bedeutet:
  - Das Umschalten von „Fett“ auf Text innerhalb einer Überschrift kann im Editor
    **visuell wirkungslos erscheinen**, selbst wenn intern ein `strong`-Mark
    gesetzt/entfernt wird.
  - Zu klären und zu dokumentieren: Ist dieses Verhalten so gewollt (Überschrift ist
    immer fett, das Mark ist nur für DOCX/ODT-Exportzwecke redundant vorhanden),
    oder wird von Nutzer:innen erwartet, dass sich sichtbar **nicht-fette** Wörter
    innerhalb einer sonst fetten Überschrift erzeugen lassen (z. B. um ein Wort
    bewusst „normal“ innerhalb der Überschrift darzustellen)? Aktuell ist Letzteres
    über die CSS-Fettung der Überschrift **nicht möglich**, unabhängig vom
    Mark-Zustand — das ist ein zu verifizierender/klärender Punkt, kein
    unterstellter Fehler.
- Für DOCX/ODT-Export ist zusätzlich relevant, dass das Absatzformat „Heading 1–6“
  selbst bereits Fettdruck auf Stil-Ebene deklariert (`styleDefs.ts:14` für DOCX,
  `styleRegistry.ts:89` für ODT). Ein explizit im Editor gesetztes `strong`-Mark
  auf Überschriftentext führt dadurch potenziell zu **redundanter**, aber nicht
  falscher Auszeichnung (Run-Ebene UND Stil-Ebene beide „bold“). Das entfernte
  Mark hebt die Stil-Ebene nicht auf — die Überschrift bleibt in DOCX/Word bzw.
  ODT/LibreOffice weiterhin fett, weil die Formatvorlage das vorgibt. Dieses
  Verhalten muss dokumentiert (nicht zwingend geändert) werden.

### 2.6 Zwischenablage / Kopieren & Einfügen
- Kopieren von fettem Text innerhalb des Editors und Einfügen an anderer Stelle
  behält das Fett-Mark.
- Einfügen von extern kopiertem, fett formatiertem Text (z. B. `<strong>`/`<b>` aus
  einer Webseite oder `font-weight: bold` per Inline-Style) wird als `strong`-Mark
  erkannt (`schema.ts:111`, `parseDOM` inkl. numerischer `font-weight`-Werte
  ≥ 500) und im Editor entsprechend fett dargestellt.
- Einfügen von extern kopiertem Text mit `font-weight` unterhalb von 500 (z. B.
  `400`/„normal“) wird **nicht** als fett erkannt — Grenzfall, siehe 3.6.

### 2.7 Undo/Redo
- Anwenden von „Fett“ per Toolbar oder Tastenkombination erzeugt einen einzelnen,
  eigenständigen Undo-Schritt.
- Undo direkt nach „Fett“ stellt exakt den vorherigen Formatierungszustand wieder
  her (kein Nebeneffekt auf Textinhalt oder andere Marks).
- Redo stellt die Fett-Anwendung erneut her.
- Funktioniert auch in gemischten Sequenzen (Tippen → Fett an → Tippen → Fett aus →
  Undo mehrfach) in korrekter, umgekehrter Reihenfolge.

---

## 3. Grenzfälle

1. **Leere Selektion/leeres Dokument:** „Fett“ ohne jeglichen Text im Dokument
   (Cursor im leeren Absatz) → darf nicht abstürzen, setzt lediglich das
   „gespeicherte Mark“ für künftige Eingabe.
2. **Cursor direkt an einer Formatgrenze:** Schreibmarke unmittelbar vor dem ersten
   bzw. nach dem letzten Zeichen eines fetten Textlaufs (kein Selektion) →
   eindeutig festlegen, ob der Zustand des Buttons dem links- oder dem
   rechtsseitigen Zeichen folgt (ProseMirror-Standard: `$from.marks()` folgt der
   Regel „Marks vor dem Cursor, außer am Absatzanfang“) — muss mit Testfall
   nachgewiesen, nicht nur angenommen werden.
3. **Gemischte Selektion:** Selektion enthält sowohl fetten als auch nicht-fetten
   Text → definiertes Verhalten: erster Klick auf „Fett“ setzt die gesamte
   Selektion auf fett (Standardverhalten von `toggleMark`, das auf Basis von
   `markApplies`/vorhandenem Mark am `$from`, nicht auf Basis „ist alles schon
   fett“ entscheidet) — zu verifizieren, ob das für Nutzer:innen intuitiv/korrekt
   wirkt, und ob der Button-Zustand (`aria-pressed`) in diesem Moment nicht
   fälschlich „aktiv“ anzeigt, obwohl nur ein Teil der Selektion fett ist.
4. **Fett + Überschrift:** siehe 2.5 — visuelle Wirkungslosigkeit im Editor trotz
   intern gesetztem Mark.
5. **Fett über eine Bild-/Tabellengrenze hinweg:** Selektion, die Text, ein Bild
   und/oder eine Tabellenzelle umfasst (z. B. Strg+A über ein Dokument mit
   gemischtem Inhalt) → darf nicht abstürzen; Fett wird nur auf textuelle Inline-
   Inhalte angewendet, Bilder/Tabellenstruktur bleiben unverändert.
6. **Extern eingefügter Text mit numerischem `font-weight`:** Werte 500–999 werden
   als fett erkannt (`schema.ts:111`), Werte darunter (100–499, „normal“, `400`)
   nicht — Grenze exakt bei 500 muss mit Testfall abgesichert werden (z. B.
   `font-weight: 450` vs. `font-weight: 500`).
7. **Fett rückgängig direkt gefolgt vom Selection-Sync-Bug-Szenario:** Alles
   auswählen → Fett an → per Klick neu positionieren → Enter → weiter tippen (siehe
   `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2 „Bekannter, bereits gefundener Fehler“ und
   `tests/e2e/selection-regression.spec.ts`) — Fett darf in dieser exakten Sequenz
   nicht dazu führen, dass Dokumentinhalt verloren geht. Dieser Test existiert
   bereits und muss als Teil der Verifikation dieses Features mit-bestanden werden,
   da „Fett“ hier der auslösende Formatierungsschritt ist.
8. **Fett in leerem Listenpunkt/leerer Tabellenzelle:** Umschalten ohne Text davor/
   danach → darf keinen Rendering-Fehler oder leeren `<w:r>`/`<text:span>` ohne
   Inhalt im Export erzeugen (bzw. muss definieren, wie damit umgegangen wird).
9. **Wiederholtes schnelles Umschalten (Doppelklick-Geschwindigkeit) auf denselben
   Button:** Kein doppeltes Toggle durch Event-Bubbling/doppelte Handler-Aufrufe.
10. **Fett auf Text, der bereits über `w:b` **und** eine widersprüchliche
    Zeichenformatvorlage verfügt** (nur beim Import relevant, siehe Abschnitt 4.3):
    Das Editor-Modell kennt nur Direktformatierung (`strong`-Mark), keine
    Zeichenformatvorlagen — verifizieren, dass echte Word-/LibreOffice-Dateien mit
    Fettdruck über eine **Zeichenformatvorlage** (statt Direktformatierung) beim
    Import nicht unsichtbar verloren gehen (aktuell liest der DOCX-Reader nur
    `<w:b/>` direkt aus `w:rPr` des Runs, siehe `reader.ts:102` — ob ererbte Fettung
    aus einer referenzierten `w:rStyle` mit erkannt wird, ist zu prüfen).
11. **Toggle bei aktivierter, aber laut Backlog noch nicht existierender
    Änderungsverfolgung:** kein Blocker aktuell (Feature fehlt komplett laut
    `FEATURE-BACKLOG.md` Abschnitt 7.3), aber als zukünftige Wechselwirkung zu
    vermerken.

---

## 4. Rundreise-Anforderung (Pflicht für Abnahme)

Für **jeden** der folgenden Fälle gilt: Datei mit Fett-Formatierung hochladen (bzw.
im Editor erzeugen) → **unverändert** exportieren → erneut importieren → Fettdruck
ist inhaltlich exakt erhalten (an derselben Textstelle, kein Verlust, keine
zusätzliche/fehlende Fettung an anderer Stelle).

### 4.1 DOCX
1. Einfache DOCX-Datei mit einem fett formatierten Wort importieren → im Editor
   sichtbar fett → unverändert als DOCX exportieren → erneut importieren → Wort
   weiterhin fett, restlicher Text weiterhin nicht-fett.
2. Im Editor neuen Text eingeben, mit Toolbar-Button „Fett“ formatieren, als DOCX
   exportieren → mit einem unabhängigen Parser (z. B. python-docx oder direktes
   Parsen von `word/document.xml`) verifizieren, dass exakt `<w:b/>` im `w:rPr`
   des betroffenen Runs steht, kein anderer Run fälschlich mitbetroffen ist.
3. Fett + Kursiv + Unterstrichen gleichzeitig auf denselben Textlauf → Rundreise
   erhält alle drei Marks gemeinsam auf demselben Textlauf, nicht versehentlich auf
   getrennte Runs aufgeteilt oder vermischt mit Nachbartext.
4. Fett-Umschaltung „aus“ (vormals fetter Text wird wieder normal) → Export enthält
   für diesen Run **kein** `<w:b/>` mehr; Rundreise bestätigt „nicht mehr fett“.
5. Fettes Wort, das eine Absatzgrenze/Zeilenumbruch (`hard_break`) einschließt →
   Fettung bleibt auf beiden Seiten des Umbruchs erhalten.
6. Cross-Format: ODT mit fettem Text importieren → als DOCX exportieren → Fettung
   bleibt erhalten (`<w:b/>` wird korrekt aus dem internen Mark erzeugt, unabhängig
   vom Ursprungsformat).
7. Reale, komplexe Fremddatei (nicht mit diesem Editor erzeugt, z. B. aus einem
   Open-Source-Testkorpus) mit Fettdruck über Direktformatierung importieren →
   mindestens die Fettung an sichtbarem Text bleibt erhalten oder wird zumindest
   nicht durch Textverlust „unsichtbar unauffällig“ verschluckt.

### 4.2 ODT
1. Einfache ODT-Datei mit einem fett formatierten Wort importieren (Fettung über
   `text:span` mit referenzierter `style:style`, `fo:font-weight="bold"`) → im
   Editor sichtbar fett → unverändert als ODT exportieren → erneut importieren →
   Wort weiterhin fett.
2. Im Editor neuen Text eingeben, mit Toolbar-Button „Fett“ formatieren, als ODT
   exportieren → `content.xml` enthält eine automatische Text-Formatvorlage mit
   `fo:font-weight="bold"` (`style:family="text"`), referenziert über
   `text:style-name` auf dem betroffenen `text:span`.
3. Zwei unterschiedliche Textläufe mit **derselben** Markkombination (z. B. beide
   nur fett) im selben Dokument → `TextStyleRegistry` (`styleRegistry.ts`)
   dedupliziert auf **eine** gemeinsame Stildefinition (`T1`), nicht zwei
   redundante — Rundreise bestätigt, dass beide weiterhin fett sind, nach Re-Import
   ggf. unter neu vergebenen, aber inhaltlich gleichwertigen Stilnamen.
4. Fett + Hervorhebungsfarbe kombiniert → eigene Stildefinition mit beiden
   Eigenschaften gemeinsam (nicht zwei getrennte, sich gegenseitig überschreibende
   `text:span`-Ebenen).
5. Fett-Umschaltung „aus“ → Export enthält für diesen Textlauf keine
   `fo:font-weight="bold"`-Referenz mehr (weder eigener Stil noch geerbt).
6. Cross-Format: DOCX mit fettem Text importieren → als ODT exportieren → Fettung
   bleibt erhalten.
7. Reale, komplexe Fremddatei (z. B. aus einem Open-Source-ODT-Testkorpus) mit
   Fettdruck importieren → Fettung sichtbar erhalten.

### 4.3 Doppelte Rundreise / Cross-Format hin und zurück
1. DOCX mit fettem Text → Editor → Export als ODT → erneuter Import → Export
   zurück als DOCX → Fettung nach zwei Formatkonvertierungen weiterhin an exakt
   derselben Textstelle vorhanden.
2. Dieselbe Prüfung mit Startpunkt ODT.

---

## 5. Testfälle für die Verifikation (E2E, echte Bedienung im Browser)

Bereits vorhandene, aber laut Auftrag **nicht als vertrauenswürdig geltende** Tests
(müssen im Rahmen dieser Verifikation erneut geprüft und ggf. als unzureichend
markiert/erweitert werden):
- `tests/e2e/docx.spec.ts:60` „creates a new document, types and bolds text, and
  exports it“
- `tests/e2e/docx.spec.ts:99` Rundreise-Test (Überschrift, Text, Fett)
- `tests/e2e/odt.spec.ts:44` analog für ODT
- `tests/e2e/odt.spec.ts:80` Rundreise-Test für ODT
- `tests/e2e/selection-regression.spec.ts` (Fett als Auslöser-Schritt für den
  Selection-Sync-Bug)

Zusätzlich zu schreibende/erweiternde Testfälle, damit alle Abschnitte 2–4 dieser
Anforderung abgedeckt sind:

1. Toolbar-Button „Fett“ per echtem Playwright-Klick (nicht nur Command-Aufruf) auf
   eine Selektion anwenden → sichtbar `font-weight: bold` im DOM, `aria-pressed`
   wechselt auf `true`.
2. Dieselbe Aktion per Tastenkombination Strg+B statt Klick.
3. Fett ohne Selektion (nur Cursor) aktivieren, tippen → neuer Text ist fett,
   umgebender Text nicht.
4. Fett auf vollständig fette Selektion anwenden → wird entfernt (Toggle aus),
   `aria-pressed` wechselt auf `false`.
5. Fett auf gemischte Selektion (teils fett, teils nicht) → definiertes Ergebnis
   gemäß Grenzfall 3.3 nachweisen.
6. Kombinierter Test Fett+Kursiv+Unterstrichen auf demselben Textlauf, danach DOCX-
   Export → Validierung der `w:rPr`-Reihenfolge/-Vollständigkeit über einen
   unabhängigen Parser.
7. Derselbe kombinierte Test für ODT.
8. Undo direkt nach Fett-Anwendung → Formatierung verschwindet, Text bleibt.
9. Redo stellt Formatierung wieder her.
10. Vollständiger Rundreisetest je Format (4.1/4.2), ausgeführt über echten
    Datei-Upload (`filechooser`) und echten Download-Abfangmechanismus
    (`page.waitForEvent('download')`), nicht nur über intern aufgerufene
    Reader/Writer-Funktionen.
11. Cross-Format-Rundreise (4.3) einmal DOCX→ODT→DOCX, einmal ODT→DOCX→ODT.
12. Regressionstest `selection-regression.spec.ts` erneut ausführen und als
    Pflichtbestandteil der Dauer-Suite bestätigen (nicht optional).
13. Zeichentest für die 500er-`font-weight`-Grenze aus Grenzfall 3.6 (Einfügen von
    HTML mit `font-weight: 499` vs. `500`).
14. Sichtprüfung/Entscheidung zu Grenzfall 2.5 (Fett in Überschriften) — Ergebnis
    dieser Klärung ist in dieser Datei nachzutragen, sobald entschieden.

---

## 6. Abnahmekriterien (Definition of Done)

Der Status „vorhanden“ für „Fett“ darf erst dann wieder als vertrauenswürdig
gelten, wenn:

1. Alle Testfälle aus Abschnitt 5 tatsächlich ausgeführt wurden (echte
   Browser-Interaktion, nicht nur Unit-/Command-Ebene) und grün sind.
2. Alle Rundreise-Anforderungen aus Abschnitt 4 (DOCX, ODT, Cross-Format) durch
   einen unabhängigen Parser bzw. durch erneuten Import bestätigt sind.
3. Alle Grenzfälle aus Abschnitt 3 einzeln geprüft und deren tatsächliches
   Verhalten dokumentiert ist (auch wenn das Ergebnis „bewusst so gewollt,
   dokumentiert“ statt „Bug, behoben“ lautet — Hauptsache, es ist nicht mehr
   unbekannt).
4. Die offene Frage aus Abschnitt 2.5 (Fett in Überschriften, CSS- vs.
   Mark-basierte Fettung) explizit beantwortet und das Ergebnis hier nachgetragen
   wurde.
5. Der Regressionstest für den Selection-Sync-Bug (Abschnitt 3.7) dauerhaft Teil
   der Testsuite bleibt und mit „Fett“ als auslösendem Schritt weiterhin besteht.
6. Das Icon-Rendering-Risiko aus Abschnitt 1, Zeile 3, bewertet wurde (bewusst
   beibehalten oder auf SVG umgestellt).

Erst nach Erfüllung aller sechs Punkte darf der Backlog-Status von „vorhanden
(nicht vertrauenswürdig)“ auf „verifiziert“ geändert werden.
