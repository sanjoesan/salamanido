# Testplan „Kursiv" — QA-Verifikation

Gegenstück zu `specs/kursiv-req.md` (Anforderung) und `specs/kursiv-code.md`
(Umsetzungsplan). Dieses Dokument legt fest, **welche Tests** geschrieben
werden, **wo** sie liegen, **wie** sie ausgeführt werden und **wann** ein Punkt
als abgehakt gilt. Es ist in zwei Ebenen gegliedert, die sich gegenseitig
ergänzen, aber **keine ersetzen darf**:

1. **Unit-Tests** (Vitest, `jsdom`) für die Reader/Writer-Rundreise auf
   Daten-/XML-Ebene — schnell, präzise, aber blind gegenüber Toolbar/Tastatur/
   echtem Datei-Dialog.
2. **Echte Playwright-Browser-Tests** — Klicks auf den tatsächlichen
   „Kursiv"-Button, echte Tastatureingabe, echter `setInputFiles()`-Upload,
   echter `page.waitForEvent('download')`-Export, Prüfung der **tatsächlich
   heruntergeladenen Datei** (nicht nur ein interner Funktionsaufruf von
   `readDocx`/`readOdt`/`writeDocx`/`writeOdt`).

Beide Ebenen sind laut Anforderung Abschnitt 6/7 Pflicht — Ebene 2 ist der Teil,
der laut `kursiv-req.md` Zeile 35–43 bisher **vollständig fehlt** und dessen
Nachholung der eigentliche Zweck dieses Auftrags ist. Ein Test, der nur
`readDocx(buffer)`/`writeOdt(doc)` direkt aufruft, zählt **nicht** als Ebene 2,
auch wenn er in `tests/e2e/` liegt.

Referenzierte Fixtures: `tests/fixtures/external/docx/form_footnotes.docx`
und `tests/fixtures/external/docx/bug65649.docx` (echte `<w:i w:val="0"/>`-Fälle,
siehe `kursiv-code.md` Abschnitt 7).

---

## 0. Ausführung

| Ebene | Befehl | Neue/geänderte Dateien |
|---|---|---|
| Unit | `npm test` (`vitest run`) | siehe Abschnitt 1 |
| Browser/E2E | `npm run test:e2e` (`playwright test`) | siehe Abschnitt 2 |

Beide Suiten müssen grün sein, bevor „Kursiv" laut DoD (Anforderung
Abschnitt 7) als „vertrauenswürdig vorhanden" gilt. Reihenfolge der Umsetzung:
zuerst die Fixes aus `kursiv-code.md` Abschnitt 4 (sonst schlagen mehrere der
hier verlangten Tests erwartungsgemäß fehl), dann Unit-Tests, dann E2E-Tests,
dann gemeinsamer Lauf beider Suiten gegen den gefixten Code.

---

## 1. Unit-Tests: Reader/Writer-Rundreise (DOCX + ODT)

Ziel: jede Rundreise-Behauptung aus Anforderung Abschnitt 5 sowie jeder
Reader-Grenzfall aus Abschnitt 3.3–3.6 auf Daten-/XML-Ebene isoliert,
deterministisch und ohne Browser nachweisen. Diese Ebene prüft **Funktionen
direkt** (`readDocx`, `writeDocx`, `readOdt`, `writeOdt`) — das ist hier
ausdrücklich erlaubt und richtig, weil sie durch die Playwright-Ebene (2)
ergänzt wird, nicht ersetzt.

### 1.1 Bestehende Abdeckung (Referenz, keine Änderung nötig)

`src/formats/docx/__tests__/roundtrip.test.ts` und
`src/formats/odt/__tests__/roundtrip.test.ts` decken bereits `em` allein und
in Kombination mit `strong` über konstruierte ProseMirror-JSON-Daten ab
(Import → PM-Doc → Export → Re-Import, Gleichheit der Marks). Bleibt
unverändert bestehen; wird durch die neuen Dateien unten ergänzt, nicht
dupliziert.

### 1.2 Neu: `src/formats/docx/__tests__/em.test.ts`

Reader-Rundreise/-Grenzfälle für DOCX, je über eine minimal per JSZip gebaute
`.docx`-Datei (Muster: `buildDocxWithRunAndStyles(runXml, stylesXml)`, analog
zu `buildSampleDocx()` in `tests/e2e/docx.spec.ts`, aber mit optionalem
`word/styles.xml`-Override) und `readDocx(blob)`.

| # | Testfall | Eingabe | Erwartung | Deckt |
|---|---|---|---|---|
| 1 | `<w:i/>` (bar) | `<w:rPr><w:i/></w:rPr>` | `em`-Mark vorhanden | Basisfall |
| 2 | `w:val="true"` / `"1"` | je ein Testfall | `em`-Mark vorhanden | ST_OnOff „an" |
| 3 | `w:val="false"` / `"0"` / `"FALSE"` (Groß-/Kleinschreibung) | je ein Testfall (`it.each`) | **kein** `em`-Mark | Grenzfall 3.3 |
| 4 | Regressionstest gegen reale Fixture | `tests/fixtures/external/docx/form_footnotes.docx` einlesen, den Lauf „Provide services in Brazil…" im resultierenden Dokumentbaum suchen | Lauf trägt **keine** `em`-Mark | Grenzfall 3.3, bestätigt an echter, unveränderter Drittdatei (kein synthetisches Fixture) |
| 5 | Dieselbe Prüfung gegen `bug65649.docx` | wie oben | wie oben | Grenzfall 3.3, zweite unabhängige Belegdatei |
| 6 | `w:rStyle` → Zeichenformatvorlage mit `<w:i/>` | Lauf referenziert `w:rStyle="Betont"`, `styles.xml` definiert `w:type="character" w:styleId="Betont"` mit `<w:i/>` in `w:rPr` | `em`-Mark vorhanden | Grenzfall 3.4 |
| 7 | Direktes `<w:i w:val="false"/>` überschreibt geerbtes `w:rStyle` | Lauf hat sowohl `w:rStyle="Betont"` (kursiv) als auch direktes `<w:i w:val="false"/>` | **kein** `em`-Mark (Lauf-Ebene schlägt Formatvorlage — OOXML-Kaskadenregel) | Grenzfall 3.4, Kaskaden-Präzedenz |
| 8 | `w:rStyle` mit `w:basedOn`-Kette | `Betont` selbst hat kein `<w:i/>`, erbt es aber via `w:basedOn` von `Base` | `em`-Mark vorhanden | Grenzfall 3.4, Vererbung |
| 9 | Zyklische/zu tiefe `w:basedOn`-Kette bricht kontrolliert ab | `w:basedOn` verweist auf sich selbst bzw. Kette > `MAX_STYLE_CHAIN_DEPTH` | Import wirft **nicht**, `em` wird nicht fälschlich `true` | Robustheit (aus `kursiv-code.md` Abschnitt 4.2 abgeleitet) |
| 10 | Unbekannter `w:rStyle`-Verweis (Formatvorlage existiert nicht in `styles.xml`) | `w:rStyle="Nichtvorhanden"`, keine passende Definition | **kein** `em`-Mark, kein Absturz | Robustheit gegen unvollständige Fremddateien |

### 1.3 Neu: `src/formats/odt/__tests__/em.test.ts`

Analog für ODT, über `buildOdt(automaticStylesXml, spanMarkup, namedStylesXmlInStylesXml)`
und `readOdt(blob)`.

| # | Testfall | Eingabe | Erwartung | Deckt |
|---|---|---|---|---|
| 1 | Benannte Formatvorlage ausschließlich in `styles.xml` (`office:styles`), nicht in `content.xml`s `automatic-styles` | `text:span text:style-name="Emphasis"`, `Emphasis` mit `fo:font-style="italic"` nur in `office:styles` | `em`-Mark vorhanden | Grenzfall 3.5 |
| 2 | Vererbung ausschließlich über `style:parent-style-name` | automatische Formatvorlage `T1` ohne eigenes `font-style`, aber `parent-style-name="Emphasis"` | `em`-Mark vorhanden | Grenzfall 3.5 |
| 3 | Mehrstufige Vererbungskette (`T1` → `Zwischenstufe` → `Emphasis`) | drei verschachtelte Formatvorlagen | `em`-Mark vorhanden | Grenzfall 3.5, Tiefe > 1 |
| 4 | Eigene Eigenschaft schlägt geerbte (Kaskaden-Präzedenz) | `T1` hat eigenes `fo:font-style="normal"` **und** erbt `italic` vom Elternstil | **kein** `em`-Mark (eigene, spezifischere Definition gewinnt) | Kaskaden-Regel analog DOCX-Testfall 7 |
| 5 | `fo:font-style="oblique"` | automatische Formatvorlage mit `oblique` statt `italic` | `em`-Mark vorhanden (dokumentierte Vereinfachung) | Grenzfall 3.6 |
| 6 | Zyklische `parent-style-name`-Kette bricht kontrolliert ab | `A` erbt von `B`, `B` erbt von `A` | Import wirft **nicht** | Robustheit |
| 7 | Kombination mit Kopf-/Fußzeilen-Formatvorlagen (falls zu diesem Zeitpunkt UI-bedienbar) | Formatvorlage aus `styles.xml` referenziert von einem Lauf in `stylesDoc`s Kopfzeilen-Container | `em`-Mark im Kopfzeilentext vorhanden | Anforderung 2.4, Kopf-/Fußzeile |

### 1.4 Neu: `src/formats/shared/editor/__tests__/commands.test.ts`

Reiner Zustands-Unit-Test (kein DOM, kein Browser) für die in
`kursiv-code.md` Abschnitt 4.1 vorgeschlagenen `isMarkActive`/
`toggleInlineMark`. Deckt Grenzfälle 3.1/3.2 auf kleinstmöglicher Ebene ab —
**ergänzt**, ersetzt aber nicht die Browser-Bestätigung derselben Fälle in
Abschnitt 2.3 dieses Plans, da erst Ebene 2 beweist, dass der tatsächlich im
Browser gerenderte Button (`aria-pressed`) sich entsprechend verhält.

| # | Testfall | Erwartung |
|---|---|---|
| 1 | Toggle an leerer Schreibmarke (kein Selektionsbereich), vor jeder Eingabe | `isMarkActive(state, em)` liefert `true`, unmittelbar nach dem Toggle, ohne dass etwas getippt wurde |
| 2 | Selektion über „AB" (A kursiv, B nicht) | `isMarkActive` liefert `false` (nicht fälschlich „aktiv") |
| 3 | Toggle derselben gemischten Selektion | Danach ist **der gesamte Bereich** kursiv (`doc.rangeHasMark` über A **und** B `true`), nicht entfernt — verifiziert `toggleInlineMark`s `removeWhenPresent: false`-Semantik |
| 4 | Durchgehend kursive Selektion | `isMarkActive` liefert `true` |
| 5 | `CellSelection` über mehrere Tabellenzellen, gemischt kursiv/nicht | `isMarkActive` liefert `false` (Iteration über `state.selection.ranges`, nicht nur `$from`/`$to`) |

### 1.5 Validierung gegen unabhängigen Parser (Rundreise-Szenario 5.1.10/5.1.11)

Da dieses Repo keine Python-Toolchain besitzt (siehe `kursiv-code.md`
Abschnitt 10), erfolgt die unabhängige Validierung zweistufig:

1. **Automatisiert, Teil der Unit-/E2E-Suite:** Prüfung des exportierten
   XML-Strings per Regex/`DOMParser`, **ohne** den eigenen `readDocx`/`readOdt`
   zu benutzen (verhindert sich gegenseitig ausgleichende Schreib-/Lesefehler,
   siehe Anforderung Abschnitt 19). Umgesetzt in den E2E-Szenarien 10/11
   (Abschnitt 2.5 dieses Plans), da dort die real heruntergeladene Datei
   vorliegt.
2. **Manuell, einmalig vor Statuswechsel auf „verifiziert":** eine exportierte
   Test-DOCX/-ODT mit Kursiv-Text außerhalb dieses Repos mit `python-docx`
   bzw. LibreOffice/einem ODF-Validator öffnen; Ergebnis in `kursiv-req.md`
   oder einer Folgedatei vermerken. Kein Bestandteil der automatisierten
   CI-Suite, aber Pflicht-Checkliste-Punkt vor Abnahme (siehe Abschnitt 4
   dieses Plans).

---

## 2. Echte Playwright-Browser-Tests

**Grundregel dieser Ebene:** Jeder Test in diesem Abschnitt bedient die
Anwendung ausschließlich so, wie eine Person es täte — `page.getByTitle(...)
.click()`, `page.keyboard.type(...)`/`.press(...)`, `input.setInputFiles(...)`
für Uploads, `page.waitForEvent('download')` + Lesen der heruntergeladenen
Datei vom Datenträger für Exporte. **Kein Test in diesem Abschnitt darf**
`readDocx`/`writeDocx`/`readOdt`/`writeOdt`/`isMarkActive`/`toggleInlineMark`
direkt importieren oder aufrufen — das wäre Ebene 1, nicht Ebene 2. Wo eine
Datei hochgeladen werden muss, wird sie unabhängig vom Reader/Writer dieses
Projekts per JSZip von Hand gebaut (Muster `buildSampleDocx()`/
`buildSampleOdt()` aus `tests/e2e/docx.spec.ts`/`odt.spec.ts`) — das stellt
sicher, dass ein Roundtrip-Test nicht zufällig nur beweist, dass Writer und
Reader sich gegenseitig kompensieren.

### 2.0 Neue Datei: `tests/e2e/kursiv.spec.ts`

Struktur/Locator-Helfer identisch zu den bestehenden Dateien:

```ts
function docxCard(page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })
}
function odtCard(page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'OpenDocument Text (.odt)' }) })
}
```

`beforeEach`: `page.goto('/')` → Privacy-Banner „Verstanden" wegklicken →
je nach Testfall `odtCard`/`docxCard` „Neu erstellen" klicken (analog zu
`selection-regression.spec.ts`).

### 2.1 Toolbar & Tastatur — Grundverhalten (Anforderung Abschnitt 1 + 2.1)

| # | Testfall | Schritte (echte Bedienung) | Assertion |
|---|---|---|---|
| 1 | Klick auf „Kursiv" schaltet um (an/aus) | `editor.click()` → `keyboard.type('Testtext')` → `keyboard.press('ControlOrMeta+a')` → `getByTitle('Kursiv').click()` | `editor.locator('em')` enthält „Testtext"; erneuter Klick → `em`-Locator hat Anzahl 0 |
| 2 | Aktiv-Anzeige nach Klick | wie oben | `getByTitle('Kursiv')` hat `aria-pressed="true"` nach dem ersten Klick, `"false"` nach dem zweiten |
| 3 | Strg+I liefert identisches Ergebnis wie Klick | `keyboard.type(...)` → `keyboard.press('ControlOrMeta+a')` → `keyboard.press('ControlOrMeta+i')` | `em`-Locator enthält Text, Button zeigt `aria-pressed="true"` |
| 4 | Tooltip/Accessible Name | — | `getByTitle('Kursiv')` und `getByLabel('Kursiv')` referenzieren denselben Button (Anforderung 1 #4) |
| 5 | Ohne Selektion: Stored-Mark-Verhalten | Cursor in Text positionieren (kein Shift), Klick auf „Kursiv", dann tippen | neu getippter Text erscheint in `em`, vorher vorhandener Text bleibt unverändert |
| 6 | Setzen und Entfernen gleichwertig getestet (2.1.3) | einmal Setzen-Test, einmal separater Entfernen-Test (nicht nur Round-Trip eines einzigen Tests) | je eigener `test(...)`-Block |

### 2.2 Kombination mit anderen Formaten (Anforderung 2.3)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Fett + Kursiv + Unterstrichen + Farbe gleichzeitig | Text tippen, markieren, nacheinander `getByTitle('Fett')`, `getByTitle('Kursiv')`, `getByTitle('Unterstrichen')` klicken, Schriftfarbe über den Farbwähler setzen | Text liegt verschachtelt in `strong > em > u` (oder äquivalent, je nach DOM-Reihenfolge), Farbe als Inline-Style vorhanden |
| 2 | Reihenfolge der Anwendung ist irrelevant | Test A: erst Fett dann Kursiv; Test B: erst Kursiv dann Fett | beide Tests liefern denselben resultierenden DOM (Text in `em` **und** `strong`) |

### 2.3 Aktiv-Zustand-Anzeige — Grenzfälle 3.1/3.2 (kritisch)

| # | Testfall | Schritte | Assertion | Grenzfall |
|---|---|---|---|---|
| 1 | Toggle an leerer Schreibmarke, Zustand **vor** jeder Eingabe | `keyboard.type('abc')` → `keyboard.press('Home')` → `getByTitle('Kursiv').click()` → **sofort** prüfen, bevor getippt wird | `aria-pressed="true"` unmittelbar nach dem Klick, nicht erst nach dem nächsten Tastendruck | 3.1 |
| 2 | Danach getippter Text ist tatsächlich kursiv | Fortsetzung von Testfall 1: `keyboard.type('X')` | `editor.locator('em')` enthält „X" | 3.1, Bestätigung des internen Zustands |
| 3 | Gemischte Selektion zeigt Button nicht fälschlich „aktiv" | „AB" tippen, nur „A" kursiv machen, dann **beide** Zeichen selektieren | `aria-pressed="false"` (nicht fälschlich „true" durch reine `$from`-Prüfung) | 3.2 |
| 4 | Klick auf gemischter Selektion vereinheitlicht auf kursiv (nicht: entfernt) | Fortsetzung von Testfall 3: `getByTitle('Kursiv').click()` | `em`-Locator enthält „AB" vollständig (nicht nur „A", nicht leer) — verifiziert zugleich Anforderung 2.1.1 „Word/LibreOffice-Konvention bei gemischter Selektion" | 3.2 |
| 5 | Durchgehend kursive Selektion zeigt Button aktiv | Text markieren, kursiv setzen, erneut denselben Bereich (neu) selektieren | `aria-pressed="true"` | 2.2 |

### 2.4 Geltungsbereich innerhalb der Dokumentstruktur (Anforderung 2.4)

Je ein eigener Test/Sub-Assert für:

| # | Kontext | Schritte |
|---|---|---|
| 1 | Normaler Absatz | Basisfall, in 2.1 bereits abgedeckt |
| 2 | Überschrift (mind. eine Ebene, idealerweise 1 + 6) | Überschrift erzeugen (über vorhandenes UI-Mittel), Text markieren, Kursiv-Button klicken |
| 3 | Listenelement (Aufzählung und nummeriert) | Liste einfügen, in ein Element tippen, kursiv markieren |
| 4 | Tabellenzelle, inkl. mehrerer Absätze in einer Zelle | Tabelle einfügen (`getByRole('button', { name: 'Tabelle einfügen' })`, Muster aus `selection-regression.spec.ts`), in eine Zelle zwei Absätze tippen (Enter dazwischen), beide Absätze markieren, kursiv |
| 5 | Text vor/nach `hard_break` (Umschalt+Enter) | Text, Umschalt+Enter, weiterer Text, jeweils getrennt markieren und kursiv setzen — prüfen, dass Kursiv **nicht** über den Zeilenumbruch überläuft, wenn nur eine Seite markiert wurde |
| 6 | Text unmittelbar vor/nach eingefügtem Bild/Tabelle | Bild/Tabelle einfügen, Text davor/danach kursiv markieren, keine Fehlfunktion an der Grenzposition |
| 7 | Kopf-/Fußzeile | **Nur** sobald laut Haupt-Spezifikation Abschnitt 9 UI dafür existiert — bis dahin expliziter, übersprungener (`test.skip`) Platzhalter mit Kommentar, kein stillschweigendes Fehlen |

### 2.5 Rundreise — alle 11 Pflicht-Szenarien aus Anforderung 5.1

Jedes Szenario prüft die **heruntergeladene Datei** (`download.path()` →
`fs.readFile` → `JSZip.loadAsync` → Ziel-XML-Datei aus dem Zip lesen), nicht
nur, dass der Editor nach Re-Import „irgendwie richtig aussieht".

| # | Szenario | Ablauf | Assertion an heruntergeladener Datei |
|---|---|---|---|
| 1 | DOCX-Eigenrundreise | Neu erstellen → tippen → Teil markieren → Kursiv → Export → Re-Import (`setInputFiles` mit der gerade heruntergeladenen Datei, oder neue Seite) → Text bleibt genau an dieser Stelle kursiv | `word/document.xml` enthält `<w:i/>` exakt für den erwarteten Lauf, für keinen anderen |
| 2 | ODT-Eigenrundreise | wie 1, aber ODT | `content.xml` enthält `fo:font-style="italic"` |
| 3 | DOCX-Fremddatei „unverändert" | per JSZip gebaute `.docx` mit `<w:rPr><w:i/></w:rPr>` in einem Lauf hochladen → **ohne Änderung** sofort exportieren | exportiertes `word/document.xml`: derselbe Text weiterhin `<w:i/>`, kein anderer Lauf hat Kursiv gewonnen/verloren |
| 4 | ODT-Fremddatei „unverändert" | analog, `.odt` mit `text:style-name` → automatische Formatvorlage mit `fo:font-style="italic"` | exportiertes `content.xml`: Kursiv erhalten |
| 5 | Cross-Format DOCX → ODT | DOCX mit Kursiv hochladen → als ODT exportieren (Wechsel der Karte/des Zielformats über UI, falls vorhanden, sonst Re-Upload in ODT-Karte nach Export) | `content.xml` enthält `fo:font-style="italic"` |
| 6 | Cross-Format ODT → DOCX | umgekehrt | `word/document.xml` enthält `<w:i/>` |
| 7 | Doppelte Rundreise DOCX → Editor → ODT → Editor → DOCX | drei Exporte/Re-Importe hintereinander | nach der zweiten Konvertierung: Text inhaltlich identisch, exakt derselbe Textteil kursiv |
| 8 | Kombination Fett + Kursiv + Farbe bei Rundreise | Text mit allen drei Eigenschaften, Export/Re-Import (einzeln je Format **und** cross-format) | alle drei Eigenschaften am selben Lauf erhalten, keine Vermischung mit Nachbartext |
| 9 | Kursiv in Überschrift/Liste/Tabellenzelle bei Rundreise | je einzeln: Kursiv in Überschrift, Listenpunkt, Tabellenzelle, Export/Re-Import | Formatierung an exakt dieser Stelle erhalten |
| 10 | Unabhängige DOCX-Validierung | exportierte Datei laden, `word/document.xml` **per Regex/`DOMParser`, nicht per `readDocx`** prüfen | `<w:i\s*\/>` vorhanden, kein widersprüchliches `w:val="false"` am selben Lauf |
| 11 | Unabhängige ODT-Validierung | analog | `fo:font-style="italic"` per Regex/`DOMParser` bestätigt |

Ergänzend, aus Anforderung 5.2 (aus Abschnitt 3 übernommene Grenzfälle):
Szenario 3 und 4 werden **zusätzlich** mit den Grenzfall-Varianten aus 3.3–3.6
wiederholt (z. B. Fremddatei mit `<w:i w:val="false"/>` unverändert
exportieren → darf im Export **nicht** als aktives `<w:i/>` erscheinen).
Diese Varianten können entweder als zusätzliche `test()`-Blöcke in
`kursiv.spec.ts` oder — da sie XML-lastig und ohne UI-Interaktion mit
Ausnahme von Upload/Export sind — als eigene `test.describe`-Gruppe geführt
werden; **nicht** ausschließlich in Ebene 1 (Unit) belassen, weil die
Anforderung „unverändert exportieren" ausdrücklich den echten
Export-Mechanismus (Button-Klick, Download-Event) verifizieren will, nicht nur
`writeDocx(readDocx(buffer))` im Testprozess.

### 2.6 Undo/Redo (Anforderung 2.5)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Ein Strg+Z macht genau den Kursiv-Toggle rückgängig | Text tippen → markieren → Kursiv → `keyboard.press('ControlOrMeta+z')` | `em`-Locator Anzahl 0, getippter Text bleibt vollständig erhalten (Strg+Z hat **nicht** das Tippen mit rückgängig gemacht) |
| 2 | Redo stellt Kursiv wieder her | Fortsetzung: `keyboard.press('ControlOrMeta+y')` (bzw. `ControlOrMeta+Shift+z`) | `em`-Locator wieder vorhanden |
| 3 | Gemischte Sequenz aus Tippen + mehreren Toolbar-Aktionen | Tippen, Fett, Tippen, Kursiv, je ein Strg+Z pro Schritt | jeder Undo-Schritt entfernt genau die zuletzt angewendete Einzeländerung, nicht mehr |

### 2.7 Copy/Paste (Anforderung 2.6)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Intern kopierter kursiver Text behält Formatierung | kursiven Text markieren, `ControlOrMeta+c`, Cursor woanders hin, `ControlOrMeta+v` | eingefügter Text liegt in `em` |
| 2 | Extern eingefügtes `<em>`/`<i>`/`style="font-style: italic"` wird erkannt | synthetisches `ClipboardEvent` mit `text/html`-Payload per `page.evaluate` auf den Editor dispatchen (kein echter OS-Zwischenablage-Zugriff nötig, robuster in CI) — je ein Testfall für `<em>`, `<i>`, `style="font-style: italic"` | eingefügter Text erscheint als `em` im DOM |

### 2.8 Weitere Grenzfälle (Anforderung 3.8)

| # | Fall | Test |
|---|---|---|
| 1 | Kursiv am Dokumentanfang/-ende | Cursor an Position 0 bzw. Ende, Kursiv umschalten, tippen |
| 2 | Kursiv in leerem Absatz, danach tippen | neuer leerer Absatz, Kursiv-Button klicken (keine Selektion), tippen → Text ist kursiv |
| 3 | Kursiv in leerer Tabellenzelle, danach tippen | wie oben, zusätzlich: Nachbarzelle bleibt unformatiert |
| 4 | Kursiv-Text vor/nach `hard_break` unabhängig | siehe 2.4 #5 |
| 5 | Kursiv + Tabulator im selben Lauf | Text mit Tab-Zeichen (falls Tab-Eingabe im Editor unterstützt, siehe Haupt-Spezifikation Abschnitt 15), markieren, kursiv — Tab bleibt erhalten |
| 6 | Strg+I bei Fokus außerhalb des Editors wirkt nicht auf den Editor | Fokus auf ein anderes Steuerelement legen (z. B. Farbwähler-Input), `keyboard.press('ControlOrMeta+i')`, Editor-Inhalt unverändert |
| 7 | Lange Selektion (Strg+A in langem Dokument) mit Kursiv-Toggle bleibt reaktionsfähig | langen Text erzeugen (z. B. per `keyboard.type` mit wiederholtem Absatz oder `page.evaluate` zum schnellen Befüllen + einem abschließenden echten Klick/Tastendruck zur Interaktion), Strg+A, Kursiv-Klick, Zeitbudget einhalten (z. B. `expect(...).toHaveAttribute(..., { timeout: 2000 })`) |
| 8 | Kursiv-Toggle unmittelbar gefolgt von Export ohne Zwischenklick | Kursiv-Button klicken, sofort (ohne weitere Interaktion) `getByRole('button', { name: 'Exportieren' }).click()` | exportierte Datei enthält den gerade gesetzten Zustand korrekt |
| 9 | Track Changes | **kein Test** — laut Anforderung ausdrücklich „nicht anwendbar vor Phase 3"; hier nur als offener Punkt vermerkt, kein rotes/übersprungenes Testartefakt nötig |

### 2.9 Selektions-Sync-Regression mit Kursiv (Grenzfall 3.7, Pflicht)

**Erweiterung der bestehenden Datei** `tests/e2e/selection-regression.spec.ts`
(nicht neue, separate Datei — Anforderung DoD Punkt 4 verlangt „dauerhaft
verankert", eine zusätzliche, leicht vergessbare Datei widerspricht dem).
Exakt dieselben drei Testmuster wie die bestehenden Fett-Varianten, aber mit
`getByTitle('Kursiv')` statt `getByTitle('Fett')`:

| # | Testfall | Muster (Vorlage) |
|---|---|---|
| 1 | Einfache Sequenz: Alles auswählen → Kursiv → Klick zur Neupositionierung → Enter → tippen | `select-all, bold, click to reposition, ...` |
| 2 | Tabellenzellen-Variante | `same regression inside a table cell` |
| 3 | Stress-Test über mehrere Zyklen | `repeated select-all + bold + click cycles stay stable` |

Assertion identisch zum Vorbild: beide Absätze/Zellen-Inhalte bleiben
vollständig erhalten, keine gelöschten/ersetzten Inhalte, `<p>`-Anzahl bzw.
Zellinhalt stimmt.

### 2.10 Visuelle Darstellung (Anforderung Abschnitt 4)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Kursiver Text ist tatsächlich schräggestellt | Text kursiv setzen | `getComputedStyle(em).fontStyle === 'italic'` (per `locator.evaluate`) — bestätigt, dass keine globale CSS-Regel `em { font-style: normal }` o. Ä. eingreift |
| 2 | Aktiv-Zustand-Kontrast in Light- und Dark-Mode | Seite in beiden `prefers-color-scheme`-Varianten laden (`page.emulateMedia({ colorScheme: 'dark' })` / `'light'`), Button aktiv setzen | Button bleibt sichtbar/erkennbar in beiden Modi (mind. Snapshot- oder Style-Vergleich gegen den „Fett"-Button als Referenz) |

---

## 3. Zuordnung Anforderung → Test (Abnahme-Mapping)

| Anforderungs-Abschnitt | Testebene(n) | Datei(en) |
|---|---|---|
| 1 (Bedienelemente) | E2E | `kursiv.spec.ts` §2.1 |
| 2.1 (Grundverhalten Toggle) | E2E | `kursiv.spec.ts` §2.1 |
| 2.2 (Aktiv-Zustand) | Unit + E2E | `commands.test.ts`, `kursiv.spec.ts` §2.3 |
| 2.3 (Kombination) | E2E | `kursiv.spec.ts` §2.2 |
| 2.4 (Geltungsbereich) | E2E | `kursiv.spec.ts` §2.4 |
| 2.5 (Undo/Redo) | E2E | `kursiv.spec.ts` §2.6 |
| 2.6 (Copy/Paste) | E2E | `kursiv.spec.ts` §2.7 |
| 3.1 (Aktiv-Anzeige leere Schreibmarke) | Unit + E2E | `commands.test.ts` #1, `kursiv.spec.ts` §2.3 #1–2 |
| 3.2 (gemischte Selektion) | Unit + E2E | `commands.test.ts` #2/#3, `kursiv.spec.ts` §2.3 #3–4 |
| 3.3 (`w:val="false"`) | Unit | `docx/__tests__/em.test.ts` #3–5 |
| 3.4 (`w:rStyle`) | Unit | `docx/__tests__/em.test.ts` #6–8 |
| 3.5 (ODT Formatvorlagen-Vererbung) | Unit | `odt/__tests__/em.test.ts` #1–4 |
| 3.6 (`oblique`) | Unit | `odt/__tests__/em.test.ts` #5 |
| 3.7 (Selektions-Sync-Regression) | E2E | `selection-regression.spec.ts` (erweitert) |
| 3.8 #1–8 | E2E | `kursiv.spec.ts` §2.8 |
| 3.8 #9 (Track Changes) | keiner (dokumentiert offen) | — |
| 4 (visuelle Darstellung) | E2E | `kursiv.spec.ts` §2.10 |
| 5.1 Szenario 1–9 | E2E | `kursiv.spec.ts` §2.5 |
| 5.1 Szenario 10–11 | E2E (Regex/DOM, echte Downloaddatei) | `kursiv.spec.ts` §2.5 #10–11 |
| 5.1 Szenario 10–11, manuelle Zweitvalidierung | manuell, einmalig | Abschnitt 1.5 dieses Plans |

---

## 4. Abnahme-Checkliste (vor Statuswechsel „verifiziert")

- [ ] `npm test` grün, inkl. aller neuen Dateien aus Abschnitt 1.
- [ ] `npm run test:e2e` grün, inkl. `kursiv.spec.ts` und der Erweiterung von
      `selection-regression.spec.ts`.
- [ ] Jeder Grenzfall aus Anforderung Abschnitt 3 (3.1–3.8) hat mindestens
      einen grünen Test, der ihn entweder als „bestätigt funktionsfähig" oder
      als „Fehler behoben, mit Regressionstest" schließt — kein offener Punkt
      außer 3.8 #9 (Track Changes, laut Anforderung explizit vertagt).
- [ ] Alle elf Rundreise-Szenarien aus Abschnitt 5.1 grün, inklusive der
      beiden unabhängigen XML-Validierungen (Szenario 10/11).
- [ ] Manuelle Einmalvalidierung einer exportierten Test-Datei gegen
      `python-docx`/LibreOffice bzw. einen ODF-Validator durchgeführt und in
      `kursiv-req.md` oder einer Folgedatei vermerkt (Abschnitt 1.5).
- [ ] Kein Test in `kursiv.spec.ts` bzw. der Erweiterung von
      `selection-regression.spec.ts` ruft `readDocx`/`writeDocx`/`readOdt`/
      `writeOdt` direkt auf — stichprobenartig per Review bestätigt.
- [ ] Für jeden in `kursiv-code.md` Abschnitt 3 bestätigten Fehler (Aktiv-
      Anzeige `storedMarks`/gemischte Selektion, `toggleMark`-Voreinstellung,
      `w:val`, `w:rStyle`, ODT-Formatvorlagen-Vererbung) liegt entweder ein
      Fix mit grünem Regressionstest vor, oder das abweichende Verhalten ist
      bewusst und explizit als akzeptierte Einschränkung dokumentiert (kein
      stiller Fehlschlag, Anforderung Abschnitt 20 der Haupt-Spezifikation).
