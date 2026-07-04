# Testplan „Schriftfarbe" — QA-Verifikation

Gegenstück zu `specs/schriftfarbe-req.md` (Anforderung) und
`specs/schriftfarbe-code.md` (Umsetzungsplan, inkl. der dort getroffenen
Entscheidung „nachrüsten" für Abschnitt 3.2/Abnahmekriterium 4). Dieses
Dokument legt fest, **welche Tests** geschrieben werden, **wo** sie liegen,
**wie** sie ausgeführt werden und **wann** ein Punkt als abgehakt gilt. Zwei
Ebenen, die sich ergänzen, aber **keine ersetzen darf**:

1. **Unit-Tests** (Vitest) für die Reader/Writer-Rundreise (DOCX + ODT) auf
   Daten-/XML-Ebene — schnell, präzise, aber blind gegenüber Toolbar,
   Tastatur, echtem Datei-Upload/-Download und dem nativen
   `<input type="color">`-Widget.
2. **Echte Playwright-Browser-Tests** — Klicks auf die tatsächliche Toolbar,
   echte Tastatureingabe, echter `setInputFiles()`-Upload, echter
   `page.waitForEvent('download')`-Export, Prüfung der **tatsächlich
   heruntergeladenen Datei** (nicht nur ein interner Aufruf von
   `readDocx`/`readOdt`/`writeDocx`/`writeOdt`).

Ebene 2 ist laut `schriftfarbe-req.md` Abschnitt 7–9 der eigentliche Zweck
dieses Auftrags (Abschnitt 8 der Anforderung: „keine E2E-Tests gefunden — das
ist die zentrale Lücke"). Ein Test, der nur `readDocx(buffer)`/`writeOdt(doc)`
direkt aufruft, zählt **nicht** als Ebene 2, auch wenn er unter `tests/e2e/`
liegt.

Voraussetzung: Die in `schriftfarbe-code.md` Abschnitt 3–4 beschriebenen Fixes
(`escapeXml` im DOCX-Writer, stilvererbte Farbe in beiden Readern,
`addStoredMark`/`removeStoredMark` in `applyMarkColor`/`clearMarkColor`,
`change`- statt `input`-Event-Bindung in der Toolbar) sind **vor** dem
Testlauf umgesetzt — mehrere hier verlangte Tests sind bewusst so formuliert,
dass sie den **korrigierten** Zustand prüfen (z. B. Testfall 3: Farbe an der
Schreibmarke wirkt jetzt auf neu getippten Text), nicht den ursprünglichen
Ist-Zustand aus `schriftfarbe-req.md` Abschnitt 3.2.

---

## 0. Ausführung

| Ebene | Befehl | Neue/geänderte Dateien |
|---|---|---|
| Unit | `npm test` (`vitest run`) | siehe Abschnitt 1 |
| Browser/E2E | `npm run test:e2e` (`playwright test`) | siehe Abschnitt 2 |

Reihenfolge: zuerst die Fixes aus `schriftfarbe-code.md` Abschnitt 3
umsetzen, dann Unit-Tests (Abschnitt 1), dann E2E-Tests (Abschnitt 2), dann
gemeinsamer Lauf beider Suiten gegen den gefixten Code. Beide Suiten müssen
grün sein, bevor „Schriftfarbe" laut Abnahmekriterium 1 der Anforderung als
„verifiziert" gilt.

---

## 1. Unit-Tests: Reader/Writer-Rundreise (DOCX + ODT)

Ziel: jede Rundreise-Behauptung aus Anforderung Abschnitt 6 sowie jeder
Reader-/Writer-Grenzfall aus Abschnitt 3.8/4 auf Daten-/XML-Ebene isoliert,
deterministisch und ohne Browser nachweisen. Diese Ebene ruft Funktionen
direkt auf (`readDocx`, `writeDocx`, `readOdt`, `writeOdt`) — das ist hier
ausdrücklich erlaubt, weil Ebene 2 (Abschnitt 2) dieselben Szenarien
zusätzlich über echte Bedienung nachweist.

### 1.1 Bestehende Abdeckung (Referenz, keine Änderung nötig)

`src/formats/docx/__tests__/roundtrip.test.ts` und
`src/formats/odt/__tests__/roundtrip.test.ts` enthalten bereits den Testfall
„preserves text color and highlight color" (konstruiertes ProseMirror-JSON,
nur `#ff0000`/`#ffff00`). Bleibt unverändert bestehen, wird durch die neuen
Dateien unten ergänzt, nicht dupliziert (siehe `schriftfarbe-req.md`
Abschnitt 8 zur Abgrenzung, was dieser bestehende Test **nicht** beweist).

### 1.2 Neu: `src/formats/docx/__tests__/textColor.test.ts`

Reader-/Writer-Tests über eine minimal per JSZip gebaute `.docx`-Datei
(Muster: `buildDocxWithRunAndStyles(runXml, stylesXml)`, analog zu
`buildSampleDocx()` aus `tests/e2e/docx.spec.ts`, aber mit optionalem
`word/styles.xml`-Override) und `readDocx(blob)`.

| # | Testfall | Eingabe | Erwartung | Deckt |
|---|---|---|---|---|
| 1 | Einfacher Fall | `<w:color w:val="ff0000"/>` | Mark `textColor` mit `#ff0000` | Basisfall |
| 2 | Großbuchstaben-Hex | `<w:color w:val="FF0000"/>` | Mark `#FF0000` (unverändert übernommen); Test vergleicht **case-insensitiv**, nicht auf exakte Schreibweise | Anforderung 3.8, Rundreise-Testfall 6 |
| 3 | `w:val="auto"` | `<w:color w:val="auto"/>` | **keine** `textColor`-Mark | bestätigtes Ist-Verhalten |
| 4 | Theme-Farbe ohne brauchbaren Fallback | `<w:color w:val="auto" w:themeColor="accent1"/>` (handgebaut, kein Fixture deckt diesen engen Teilfall ab) | keine Mark, Text bleibt in Standardfarbe | Grenzfall 4.11, dokumentierter Fallback |
| 5 | Theme-Farbe **mit** RGB-Fallback, echte Fremddatei | `tests/fixtures/external/docx/SampleDoc.docx` (`w:val="548DD4" w:themeColor="text2"`) einlesen | Mark `#548DD4` vorhanden (Theme-Metadaten werden bewusst ignoriert) | Grenzfall 4.11, echte Datei 1 |
| 6 | Zweite unabhängige Theme-Farbe-Fremddatei | `tests/fixtures/external/docx/shapes-with-text.docx` (`w:val="000000" w:themeColor="dark1"`) | Mark `#000000` vorhanden | Grenzfall 4.11, echte Datei 2 |
| 7 | Stilvererbte Farbe (nach Fix `schriftfarbe-code.md` 3.2) | `tests/fixtures/external/docx/52288.docx`, Absatz „CHAPTER 1" (`w:pStyle="ChapterNumber"`, kein Lauf-`w:rPr`, Stil definiert `w:rPr/w:color`) einlesen | Lauf trägt `textColor`-Mark mit der geerbten Farbe | Kern-Fix aus `schriftfarbe-code.md` 3.2, echte Fremddatei |
| 8 | Lauf-Farbe schlägt Stil-Farbe | Lauf mit eigenem `<w:color w:val="0000ff"/>`, Absatzstil mit `<w:color w:val="ff0000"/>` | Mark `#0000ff` (Lauf gewinnt, Kaskade) | Kaskaden-Präzedenz |
| 9 | `w:basedOn`-Kette über zwei Ebenen | Stil A ohne Farbe, `w:basedOn` auf Stil B mit Farbe | Farbe von B übernommen | `resolveStyleColor`-Vererbung |
| 10 | Zirkuläre `w:basedOn`-Kette | Stil A `basedOn` B, B `basedOn` A (konstruiert) | kein Stack-Overflow/Endlosschleife, Import liefert `null`/keine Mark statt zu werfen | Robustheit, Tiefenlimit analog `MAX_TABLE_NESTING_DEPTH` |
| 11 | Explizites `#000000` vs. keine Farbe | ein Lauf mit `<w:color w:val="000000"/>`, ein zweiter Lauf ganz ohne `w:rPr` | erster Lauf hat `textColor`-Mark `#000000`, zweiter Lauf hat **keine** Mark | Grenzfall 4.9 |
| 12 | Ungültiger/pathologischer Attributwert beim **Lesen** | `w:val` enthält z. B. eingebettetes `"` (simulierte korrupte Fremddatei) | Reader übernimmt Wert unverändert, kein Absturz | Grenzfall 4.10 |

**Neu: `src/formats/docx/__tests__/writer-escaping.test.ts`**

| # | Testfall | Eingabe | Erwartung | Deckt |
|---|---|---|---|---|
| 1 | `color`-Mark-Attribut mit `"`/`&`/`<` (pathologisch, z. B. via zuvor aus ODT importiertem, unvalidiertem `fo:color`-String) exportieren | ProseMirror-Doc mit `textColor`-Mark, `color: '"/><w:b/><w:color w:val="ff0000'` | exportiertes `word/document.xml` ist mit `DOMParser`/einem XML-Parser **fehlerfrei parsbar** (kein `parsererror`-Knoten); der Wert erscheint escaped, nicht als eingeschleustes Markup | Fix `schriftfarbe-code.md` Abschnitt 3.1 — zentraler Regressionstest gegen kaputtes XML |
| 2 | Dieselbe Prüfung für `highlight`-Mark (`w:shd w:fill`) | analog | XML bleibt valide | Fix 3.1, Hervorhebung (geteilter Codepfad, cross-referenziert zu `textmarker-farbe`) |

### 1.3 Neu: `src/formats/odt/__tests__/textColor.test.ts`

Analog für ODT, über `buildOdt(automaticStylesXml, spanMarkup, ...)` und
`readOdt(blob)`, sowie gegen reale Fixtures.

| # | Testfall | Eingabe | Erwartung | Deckt |
|---|---|---|---|---|
| 1 | Einfacher Fall | `fo:color="#ff0000"` in automatischer Textformatvorlage, referenziert von `<text:span>` | Mark `#ff0000` | Basisfall |
| 2 | Stilvererbte Absatzfarbe (nach Fix 3.2), echte Fremddatei | `tests/fixtures/external/odt/text-color-from-paragraph.odt`, Absatz „Entire paragraph in red." (`style:family="paragraph"`, `fo:color="#ff0000"`, **kein** `<text:span>`) | jeder Textknoten des Absatzes trägt `textColor`-Mark `#ff0000` | Kern-Fix, echte Fremddatei |
| 3 | Leerer Absatz mit farbigem Stil | `<text:p text:style-name="P1"/>` (kein Text) aus derselben Datei | kein Absturz, leerer Block ohne Marks | Robustheit, in derselben Fixture enthalten |
| 4 | Span-Farbe schlägt Absatz-Farbe | Absatzstil `fo:color="#ff0000"`, Span mit eigenem `fo:color="#0000ff"` | Mark `#0000ff` (Span gewinnt, Kaskade „näher am Text gewinnt") | Kaskaden-Präzedenz |
| 5 | Benannte Zeichenformatvorlage in `office:styles` (bewusst **nicht** gefixt) | `tests/fixtures/external/odt/character-styles.odt`, Span mit `Default_20_Paragraph_20_Font` | **keine** `textColor`-Mark — Test hält das bestätigte Ist-Verhalten nach dem engeren Fix fest (Kommentar: „siehe schriftfarbe-code.md Abschnitt 3.2, bewusst außerhalb des Fix-Umfangs") | Grenzfall 4.12 |
| 6 | Zweite unabhängige Fremddatei für denselben Fallback | `tests/fixtures/external/odt/spanInheritanceTest.odt` (`style:parent-style-name`-Verweis auf `office:styles`) | Formatierung aus `office:styles` bleibt unberücksichtigt, dokumentiert, kein Absturz | Grenzfall 4.12, zweite Belegdatei |
| 7 | Ungültiger/exotischer Farbwert | `fo:color="notacolor"` (konstruiert) | Reader übernimmt String unverändert als Mark-Attribut, kein Absturz beim Lesen | Grenzfall 4.10 |
| 8 | Explizites `#000000` vs. keine Farbe | ein Lauf mit `color: '#000000'`-Mark, ein zweiter ohne jede Mark, Export via `writeOdt` | `TextStyleRegistry` erzeugt zwei unterschiedliche Stildefinitionen/-namen, zweiter Lauf referenziert keinen Farbstil | Grenzfall 4.9, gegen `isEmpty()` |
| 9 | Nur Schriftfarbe, keine weiteren Marks | Dokument mit genau einem farbigen Lauf, sonst keine Formatierung | keine unnötigen leeren Style-Definitionen, Export bleibt valide | Grenzfall 4.14 |
| 10 | Sehr viele unterschiedliche Farbwerte (Regenbogen-Text) | z. B. 200 Läufe mit je eigenem Farbwert | Export läuft in vertretbarer Zeit (`expect(...).toBeLessThan(...)`-Zeitbudget) durch, exakt N Stildefinitionen für N unterschiedliche Farben, keine quadratische Explosion | Grenzfall 4.15 |
| 11 | Case-Sensitivität im Dedup-Schlüssel | zwei Läufe mit `#ff0000` bzw. `#FF0000` | zwei separate Stildefinitionen entstehen (bekanntes, akzeptiertes Verhalten — kein Fehler, nur Dokumentation der Style-Vervielfachung) | Grenzfall 4.13 |

### 1.4 Erweiterung `src/formats/docx/__tests__/roundtrip.test.ts` und `.../odt/__tests__/roundtrip.test.ts`

| # | Testfall | Erwartung |
|---|---|---|
| 1 | Kombination Fett + Unterstrichen + Schriftfarbe + Hervorhebungsfarbe auf einem Lauf, zweiter Lauf mit Schriftfarbe + Hervorhebungsfarbe | alle Merkmale nach Export/Re-Import am jeweils richtigen Lauf erhalten, keine Vermischung mit Nachbarlauf |
| 2 | Doppelte Cross-Format-Rundreise (konstruiertes Dokument: DOCX-JSON → `writeDocx` → `readDocx` → `writeOdt` → `readOdt` → `writeDocx` → `readDocx`) | Farbe nach zweifachem Formatwechsel exakt erhalten (case-insensitiver Vergleich), kein kumulativer Verlust |
| 3 | Cursor-an-Schreibmarke-Verhalten nach Fix 3.3 (reiner Zustands-Test, kein DOM) | `applyMarkColor('textColor', '#ff0000')` auf einem State mit leerer Selektion dispatcht eine Transaktion mit `storedMarks`, die die Mark enthält (nicht `return false`); `clearMarkColor` analog mit `removeStoredMark` |

### 1.5 Validierung gegen unabhängigen Parser (Rundreise-Testfall 7 der Anforderung)

Da dieses Repo keine Python-Toolchain besitzt (siehe `schriftfarbe-code.md`
Abschnitt 9), zweistufiger Ansatz:

1. **Automatisiert, Teil der E2E-Suite:** Prüfung des exportierten
   XML-Strings per Regex/`DOMParser`, **ohne** `readDocx`/`readOdt` zu
   benutzen — umgesetzt in Abschnitt 2.5 dieses Plans (die real
   heruntergeladene Datei liegt dort vor, das Unit-Level allein kann „echten"
   Export/Download nicht beweisen).
2. **Manuell, einmalig vor Statuswechsel auf „verifiziert":** eine
   exportierte Test-DOCX/-ODT mit farbigem Text außerhalb dieses Repos mit
   `python-docx` bzw. LibreOffice/einem ODF-Validator öffnen; Ergebnis in
   `schriftfarbe-req.md`/`-code.md` oder einer Folgedatei vermerken. Kein
   Bestandteil der automatisierten CI-Suite, aber Pflicht-Checkliste-Punkt
   vor Abnahme (siehe Abschnitt 4 dieses Plans).

---

## 2. Echte Playwright-Browser-Tests

**Grundregel dieser Ebene:** Jeder Test bedient die Anwendung ausschließlich
so, wie eine Person es täte — `page.getByTitle(...)`/`page.locator('input[aria-label=...]')
.fill(...)`, `page.keyboard.type(...)`/`.press(...)`, `input.setInputFiles(...)`
für Uploads, `page.waitForEvent('download')` + Lesen der heruntergeladenen
Datei vom Datenträger für Exporte. **Kein Test in diesem Abschnitt darf**
`readDocx`/`writeDocx`/`readOdt`/`writeOdt`/`applyMarkColor`/`clearMarkColor`
direkt importieren oder aufrufen — das wäre Ebene 1, nicht Ebene 2. Wo eine
Datei hochgeladen werden muss, wird sie unabhängig vom Reader/Writer dieses
Projekts per JSZip von Hand gebaut (Muster `buildSampleDocx()`/
`buildSampleOdt()` aus `tests/e2e/docx.spec.ts`/`odt.spec.ts`), **außer** bei
den in Abschnitt 2.4 verlangten Uploads echter Fremddateien aus
`tests/fixtures/external/{docx,odt}` — dort wird die Datei direkt vom
Datenträger gelesen und per `setInputFiles({ buffer })` hochgeladen.

**Native Farbwahl in Playwright:** `<input type="color">` lässt sich nicht
über einen echten OS-Dialog automatisieren. Playwright kann den Wert aber
direkt per `locator.fill('#ff0000')` setzen — das löst dasselbe `input`/
`change`-Event aus, das ein Nutzer durch Bestätigen des nativen Dialogs
auslösen würde, und ist für die Formatierungslogik ausreichend. Das
tatsächliche Öffnen/Bedienen des nativen Dialogs selbst ist **nicht**
automatisierbar und bleibt manueller Prüfschritt (Abschnitt 2.8/Abschnitt 4).

### 2.0 Neue Datei: `tests/e2e/schriftfarbe.spec.ts`

Locator-Helfer identisch zu den bestehenden Dateien:

```ts
function docxCard(page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })
}
function odtCard(page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'OpenDocument Text (.odt)' }) })
}
const colorInput = (page) => page.locator('input[aria-label="Textfarbe"]')
const removeButton = (page) => page.getByTitle('Textfarbe entfernen')
```

`beforeEach`: `page.goto('/')` → Privacy-Banner „Verstanden" wegklicken →
je nach Testfall `odtCard`/`docxCard` „Neu erstellen" klicken.

### 2.1 Grundverhalten (Anforderung Testfall 1/2, Abschnitt 3.1)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Setzen auf Selektion | Text tippen → `ControlOrMeta+a` → `colorInput(page).fill('#ff0000')` | `editor.locator('span[style*="color"]')` enthält den Text; `locator.evaluate(el => getComputedStyle(el).color)` liefert `rgb(255, 0, 0)` |
| 2 | Entfernen | Fortsetzung von #1: `removeButton(page).click()` | Farb-`span` verschwindet, Text bleibt inhaltlich unverändert, `getComputedStyle` liefert die geerbte Standardfarbe |
| 3 | Selektion bleibt nach Farbwahl unverändert | Text markieren, Farbe setzen, sofort `keyboard.type('X')` ohne erneute Selektion | `X` ersetzt die vormals selektierte Selektion nicht unerwartet an falscher Stelle — Selektionsgrenzen sind nach der Aktion erhalten (Anforderung 3.1, zweiter Punkt) |
| 4 | Erneutes Setzen einer anderen Farbe ersetzt (kein additiver Effekt) | Farbe A setzen, dieselbe Selektion erneut markieren, Farbe B setzen | genau **eine** `textColor`-Mark mit Farbe B im DOM/Export, keine verschachtelten/doppelten `span[style*="color"]` |

### 2.2 Verhalten an der Schreibmarke nach Fix (Anforderung 3.2, Entscheidung in `schriftfarbe-code.md` 3.3)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Farbe an leerer Schreibmarke wirkt jetzt auf neu getippten Text | Text tippen, `Home` (keine Selektion), `colorInput(page).fill('#ff0000')`, dann `keyboard.type('Neu')` | „Neu" erscheint in `span[style*="color: #ff0000"]`, vorher getippter Text bleibt unverändert in Standardfarbe |
| 2 | Test-Kommentar verweist explizit auf die getroffene Entscheidung | — | Testname/Kommentar nennt „schriftfarbe-code.md Abschnitt 3.3 — Entscheidung: nachrüsten", damit der geänderte Erwartungswert gegenüber der ursprünglichen Anforderung nachvollziehbar bleibt |
| 3 | „⌫" an leerer Schreibmarke wirkt konsistent | Farbe an Schreibmarke setzen (wie #1, aber noch nichts getippt), `removeButton(page).click()`, dann tippen | neu getippter Text erscheint **ohne** Farbe |

### 2.3 Aktiv-Zustand-Anzeige — Ist-Zustand bestätigen (Anforderung 3.3, Abschnitt 2 Punkt 4)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Farbchip aktualisiert sich **nicht** beim Cursor-Bewegen | Farbigen Text (`#ff0000`) und unformatierten Text nacheinander erzeugen, Cursor zwischen beiden bewegen (`ArrowLeft`/Klick) | `colorInput(page)` behält denselben `value` unabhängig von der Cursor-Position — Test bestätigt den in der Anforderung dokumentierten Ist-Zustand als Fakt, nicht als Bug |

### 2.4 Gemischte Selektion und Kombination mit anderen Formaten (Anforderung Testfall 4/5, Grenzfall 6)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Gemischte Selektion (teils farbig, teils nicht) | „AB" tippen, nur „A" rot färben, dann beide Zeichen selektieren, Farbe Blau setzen | gesamte Selektion „AB" ist danach einheitlich blau, keine JS-Exception (`page.on('pageerror', ...)`-Assertion über den ganzen Test) |
| 2 | Fett + Unterstrichen + Schriftfarbe + Hervorhebungsfarbe gemeinsam | Text markieren, `getByTitle('Fett')`, `getByTitle('Unterstrichen')` klicken, `colorInput(page).fill(...)`, `input[aria-label="Hervorhebungsfarbe"].fill(...)` | Text liegt in `strong`/`u` **und** hat beide Inline-Farb-Styles gleichzeitig; jedes Merkmal einzeln wieder entfernbar (je ein Test pro Merkmal), Rest bleibt beim Entfernen unangetastet |
| 3 | Setzen der einen Farbe verliert nicht die andere | Schriftfarbe **und** Hervorhebungsfarbe setzen, danach nur Schriftfarbe erneut ändern | Hervorhebungsfarbe bleibt nach der zweiten Aktion unverändert bestehen (Anforderung 3.7) |
| 4 | `formatierung-loeschen` — nicht anwendbar | — | **kein Test**, explizit als „nicht anwendbar, Zielfunktion `formatierung-loeschen` Status `fehlt`" im Testfile vermerkt (Anforderung 3.6) |
| 5 | Absatzformat-Wechsel lässt Zeichenfarbe unangetastet | Farbigen Text markieren, Absatzformat auf „Überschrift 1" wechseln und zurück auf „Standard" | Zeichenfarbe bleibt während und nach beiden Wechseln erhalten (Anforderung 3.9 Punkt 2) |
| 6 | Bool-Mark-Toggle lässt Zeichenfarbe unangetastet | Farbigen Text markieren, Fett an-/ausschalten | Zeichenfarbe bleibt unverändert (Anforderung 3.9 Punkt 3) |

### 2.5 Rundreise — alle 9 Pflicht-Szenarien aus Anforderung Abschnitt 6

Jedes Szenario prüft die **heruntergeladene Datei**
(`download.path()` → `fs.readFile` → `JSZip.loadAsync` → Ziel-XML aus dem Zip
lesen), nicht nur, dass der Editor nach Re-Import „irgendwie richtig
aussieht".

| # | Szenario | Ablauf | Assertion an heruntergeladener Datei |
|---|---|---|---|
| 1 | DOCX-Eigenrundreise | Neu erstellen → tippen → markieren → `colorInput(page).fill('#ff0000')` → Export → Re-Import (neue Seite/`setInputFiles` mit heruntergeladener Datei) | `word/document.xml` enthält `<w:color w:val="[Ff]{2}0000"/>` exakt am erwarteten Lauf; nach Re-Import zeigt der Editor die Farbe erneut |
| 2 | ODT-Eigenrundreise | wie 1, ODT-Karte | `content.xml` enthält `fo:color="#ff0000"` (case-insensitiv verglichen) |
| 3 | Cross-Format DOCX → ODT | DOCX mit Farbe hochladen (per JSZip gebaut) → als ODT exportieren → Re-Import | exportiertes `content.xml` enthält `fo:color`, Editor zeigt Farbe nach Re-Import |
| 4 | Cross-Format ODT → DOCX | umgekehrt | `word/document.xml` enthält `<w:color w:val="…"/>` |
| 5 | Doppelte Cross-Format-Rundreise | DOCX → Editor → ODT (Export+Re-Import) → DOCX (Export+Re-Import) → Editor | Farbe nach zweifachem Formatwechsel weiterhin vorhanden, case-insensitiv identisch zum Ursprungswert |
| 6 | Echte Fremddatei DOCX | Upload `tests/fixtures/external/docx/Tika-792.docx` (echtes `w:val="FF0000"`) | Editor zeigt Text in Rot; **Pflicht laut Abnahmekriterium 2** |
| 7 | Echte Fremddatei ODT | Upload `tests/fixtures/external/odt/coloredParagraph.odt` | Editor zeigt farbigen Text; **Pflicht laut Abnahmekriterium 2** |
| 8 | Unabhängige XML-Validierung DOCX | Export von Szenario 6 (**ohne** vorherige Änderung) erneut exportieren, `word/document.xml` per Regex/`DOMParser`, **ohne `readDocx` zu benutzen**, prüfen | `/<w:color\s+w:val="[Ff]{2}0000"\s*\/>/` matcht; **Pflicht laut Abnahmekriterium 2** |
| 9 | Unabhängige XML-Validierung ODT | analog für Szenario 7, `content.xml` | `fo:color="#[Ff]{2}0000"` per Regex bestätigt; **Pflicht laut Abnahmekriterium 2** |
| 10 | Kombinierte Rundreise (Anforderung Rundreise-Testfall 8) | Text fett+unterstrichen+farbig, zweiter Lauf farbig+hervorgehoben, über Rundreise 1–5 hinweg | alle Merkmale je Lauf nach jeder Rundreise-Variante korrekt erhalten |
| 11 | `#000000` explizit vs. keine Farbe (Rundreise-Testfall 9) | ein Lauf mit explizit gesetztem Schwarz, zweiter Lauf ganz ohne Farbmarkierung, Export/Re-Import je Format | beide Läufe bleiben strukturell unterscheidbar (erster Lauf hat `<w:rPr><w:color w:val="000000"/></w:rPr>`/ODT-Textstil, zweiter Lauf hat keins) |

### 2.6 Grenzfälle mit echten Fremddateien (Anforderung Grenzfall 4.11/4.12, Abnahmekriterium 5)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Theme-Farbe mit RGB-Fallback, Datei 1 | Upload `tests/fixtures/external/docx/SampleDoc.docx` | Editor zeigt die im `w:val` hinterlegte RGB-Farbe; Testkommentar: Theme-Zuordnung selbst bewusst nicht ausgewertet (Nicht-Ziel laut Anforderung Abschnitt 5) |
| 2 | Theme-Farbe mit RGB-Fallback, Datei 2 | Upload `tests/fixtures/external/docx/shapes-with-text.docx` | wie oben, zweite unabhängige Datei |
| 3 | Benannte ODT-Zeichenformatvorlage, Datei 1 | Upload `tests/fixtures/external/odt/spanInheritanceTest.odt` | betroffene Textstelle zeigt **keine** aus `office:styles` geerbte Formatierung; Testkommentar verweist auf `schriftfarbe-code.md` Abschnitt 3.2 als bestätigten, nicht in diesem Schritt behobenen Fallback |
| 4 | Benannte ODT-Zeichenformatvorlage, Datei 2 | Upload `tests/fixtures/external/odt/character-styles.odt` | wie oben, zweite unabhängige Datei (`Default_20_Paragraph_20_Font`-Verweis) |

### 2.7 Undo/Redo (Anforderung Testfall 7, Grenzfall 4.16/4.17)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Sequenz Tippen → Farbe A → Farbe B → Entfernen → Tippen | `keyboard.type('Text')` → `ControlOrMeta+a` → `colorInput(page).fill('#ff0000')` → erneut markieren → `colorInput(page).fill('#0000ff')` → erneut markieren → `removeButton(page).click()` → `keyboard.type('Ende')` | jeder Schritt liefert das erwartete Zwischenergebnis (Farbe A sichtbar → Farbe B sichtbar → keine Farbe → „Ende" ohne Farbe) |
| 2 | Einzelschritte per Strg+Z zurücknehmbar | Fortsetzung von #1: mehrfach `ControlOrMeta+z`, nach jedem Tastendruck Editor-Zustand prüfen | Zustand kehrt schrittweise zu „nur Farbe B", „nur Farbe A", „keine Farbe", „kein Text" zurück, in dieser Reihenfolge |
| 3 | Strg+Y/Strg+Umschalt+Z stellt wieder her | Fortsetzung: `ControlOrMeta+y` mehrfach | Zustände werden in umgekehrter Reihenfolge wiederhergestellt |
| 4 | Anzahl der durch `fill()` ausgelösten Undo-Schritte dokumentiert | Kommentar im Test, kein separates Assertion-Ziel | verweist auf Fix `schriftfarbe-code.md` Abschnitt 3.4 (`change`- statt `input`-Bindung): `fill()` in Playwright löst ohnehin nur ein Event aus, das eigentliche „viele Zwischenschritte beim echten Ziehen"-Risiko ist **nicht** durch Playwright automatisiert nachweisbar, siehe Abschnitt 2.8 (manuell) |

### 2.8 Weitere Grenzfälle (Anforderung Abschnitt 4, je dedizierter Test)

| # | Grenzfall | Testfall | Schritte | Assertion |
|---|---|---|---|---|
| 1 | 4.1 | siehe Abschnitt 2.2 | — | — |
| 2 | 4.2 | Selektion über Absatzwechsel | zwei Absätze tippen, Selektion über beide markieren, Farbe setzen | beide Absätze vollständig farbig, Absatzstruktur (`<p>`-Anzahl) unverändert |
| 3 | 4.3 | Selektion über Tabellen-Zellgrenze | Tabelle einfügen, über zwei Zellen selektieren, Farbe setzen, dritte Zelle unberührt lassen | beide selektierten Zellen zeigen die Farbe, dritte Zelle bleibt unformatiert, kein Crash (`pageerror`-Assertion) |
| 4 | 4.4 | Reine Leerzeichen-Selektion | nur Leerzeichen selektieren, Farbe setzen | Mark technisch gesetzt (`span[style*="color"]` um das Leerzeichen im DOM), keine Fehlermeldung |
| 5 | 4.5 | Selektion Text + angrenzendes Bild | Bild einfügen, Selektion von Text bis einschließlich Bild-Block aufspannen, Farbe setzen | kein Absturz; Text im Bereich erhält Farbe, Bild selbst bleibt unverändert |
| 6 | 4.6 | siehe Abschnitt 2.4 #1 | — | — |
| 7 | 4.7 | Erneutes Anwenden derselben Farbe | Farbe setzen, dieselbe Farbe erneut auf derselben Selektion setzen | im Export genau **ein** `<w:color>`/ein Textstil, keine verdoppelte/verschachtelte Mark |
| 8 | 4.8 | Schriftfarbe = Hintergrundfarbe (Weiß auf Weiß) | `colorInput(page).fill('#ffffff')` | kein Absturz, Export enthält `#ffffff` unverändert (Datenintegrität unabhängig von Lesbarkeit) |
| 9 | 4.9 | siehe Abschnitt 2.5 #11 | — | — |
| 10 | 4.10 | Ungültiger Farbwert aus Fremddatei | Upload einer per JSZip gebauten ODT mit `fo:color="notacolor"` | Text erscheint in geerbter Farbe (Browser ignoriert ungültigen CSS-Wert), kein JS-Fehler |
| 11 | 4.11 | siehe Abschnitt 2.6 #1/#2 | — | — |
| 12 | 4.12 | siehe Abschnitt 2.6 #3/#4 | — | — |
| 13 | 4.13 | Cross-Format-Namenskollision | Dokument mit vielen unterschiedlichen Farbwerten als ODT exportieren | jede Farbe an der richtigen Textstelle nach Re-Import, keine Verwechslung zwischen generierten `Tn`-Stilnamen |
| 14 | 4.14 | siehe Abschnitt 1.3 #9 (Unit ausreichend, kein zusätzlicher E2E-Test nötig) | — | — |
| 15 | 4.15 | Sehr viele Farbwerte (Regenbogen-Text) | Text mit vielen unterschiedlichen Farben pro Wort erzeugen (z. B. per Schleife: markieren, Farbe setzen, weiter), exportieren | Export/Re-Import bleiben innerhalb eines Zeitbudgets (`test.setTimeout(...)`), keine Style-Explosion die die Datei unbrauchbar macht |
| 16 | 4.16 | siehe Abschnitt 2.7 #4 und Abschnitt 2.9 (manuell) | — | — |
| 17 | 4.17 | siehe Abschnitt 2.7 | — | — |
| 18 | 4.18 | siehe Abschnitt 2.10 (Pflicht-Regressionstest) | — | — |
| 19 | 4.19 | Fokus-Erhalt nach Bedienung | Text markieren, Farbe setzen | `editor` bleibt fokussiert (`expect(editor).toBeFocused()`), Cursor springt nicht an eine andere Stelle |

### 2.9 Rendering-Prüfung „⌫" und Tastatur-Bedienbarkeit (Anforderung Testfall 11/12)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Button hat nicht-leeres Textalternativ | — | `removeButton(page)` hat sichtbaren Textinhalt „⌫" und einen im Accessibility-Tree lesbaren Namen (`accessibleName` via `page.accessibility.snapshot()` oder `getByRole('button')`-Name) |
| 2 | Tab-Erreichbarkeit Farb-Input | `page.keyboard.press('Tab')` wiederholt bis Fokus auf `colorInput(page)` liegt | `colorInput(page)` ist fokussiert (`toBeFocused()`) |
| 3 | Tab-Erreichbarkeit „Entfernen"-Button | weiter tabben | `removeButton(page)` ist fokussiert |
| 4 | Öffnen des nativen Dialogs per Tastatur | **kein automatisierter Test** — nativer OS-Dialog, kein DOM; expliziter Kommentar/`test.skip` mit Verweis auf Abschnitt 2.11 (manueller Prüfschritt) |
| 5 | Visuelle Glyph-Lesbarkeit auf verschiedenen Systemen | **kein automatisierter Test** — Playwright kann keine echte Font-Rendering-Qualität über Betriebssysteme hinweg beurteilen; Kommentar verweist auf Abschnitt 2.11 (manuell, Abnahmekriterium 6) |

### 2.10 Selektions-Sync-Regression mit Schriftfarbe (Grenzfall 4.18, Pflicht)

**Erweiterung der bestehenden Datei** `tests/e2e/selection-regression.spec.ts`
(nicht neue, separate Datei — Abnahmekriterium 3 verlangt „dauerhaft
verankert"). Übernimmt den Aufbau des bestehenden Fett-Tests exakt (siehe
`schriftfarbe-code.md` Abschnitt 8.2), nur mit `colorInput(page).fill('#ff0000')`
statt `getByTitle('Fett').click()`:

```ts
test('same regression with "Schriftfarbe" instead of "Fett" (Grenzfall 4.18 / Testfall 6)', async ({ page }) => {
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Hallo, das ist ein Test.')
  await page.keyboard.press('ControlOrMeta+a')
  await page.locator('input[aria-label="Textfarbe"]').fill('#ff0000')
  await editor.click()
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Zweiter Absatz.')
  await expect(editor).toContainText('Hallo, das ist ein Test.')
  await expect(editor).toContainText('Zweiter Absatz.')
  await expect(page.locator('.ProseMirror p')).toHaveCount(2)
  // Kernpunkt von Grenzfall 4.18: nicht nur "Absätze überleben", sondern
  // "Absätze behalten ihre jeweils korrekte Formatierung".
  await expect(editor.locator('p', { hasText: 'Hallo, das ist ein Test.' })).toHaveCSS('color', 'rgb(255, 0, 0)')
})
```

Analog eine zweite Variante innerhalb einer Tabellenzelle (Muster:
„same regression inside a table cell" aus der bestehenden Datei) und eine
Stress-Variante über mehrere Zyklen (Muster: „repeated select-all + … cycles
stay stable"), jeweils mit Schriftfarbe statt Fett — identische Struktur zu
den bestehenden Fett-Tests, damit derselbe Bug-Pfad auch für Schriftfarbe
dauerhaft abgedeckt bleibt.

### 2.11 Sichtprüfung/Screenshot-Vergleich (Anforderung Testfall 10)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Aussehen vor Export vs. nach Re-Import identisch | Farbigen Text erzeugen, Screenshot des Editor-Ausschnitts, exportieren, Editor leeren/neu laden, Datei re-importieren, erneut Screenshot | `expect(locator).toHaveScreenshot(...)` — Baseline einmalig erzeugen, danach Regressionsvergleich |

### 2.12 Manuelle Prüfschritte (nicht automatisierbar, aber Teil der Abnahme)

Explizit festgehalten, damit sie nicht stillschweigend übergangen werden
(Anforderung Abschnitt 9 Punkt 6, Testfall 11/12):

1. **„⌫"-Glyph-Rendering** auf mindestens zwei System-/Browser-Kombinationen
   (z. B. Windows+Chrome und macOS+Safari oder Linux+Firefox) — Ergebnis
   (lesbar / Fragezeichen / leeres Rechteck) in `schriftfarbe-req.md` oder
   einer Folgedatei vermerken, sobald durchgeführt.
2. **Natives Farbwähler-Dialogverhalten** — öffnet sich der Dialog
   zuverlässig per Klick **und** per Tastatur (Tab, dann Enter/Leertaste) in
   mindestens Chrome, Firefox und einem WebKit-Browser; lässt sich ein
   Hex-Wert direkt im nativen Dialog eingeben.
3. **Undo-Schrittanzahl nach echtem Ziehen im nativen Dialog** — durch
   tatsächliches Ziehen (nicht per Playwright `fill()`, das den Dialog nicht
   öffnet) bestätigen, dass nach dem Fix aus `schriftfarbe-code.md`
   Abschnitt 3.4 höchstens ein Undo-Schritt pro abgeschlossener Farbwahl
   entsteht, und dass der Dialog dabei nicht vorzeitig durch wiederholten
   `view.focus()`-Aufruf schließt.
4. **Manuelle unabhängige Parser-Validierung** (Abschnitt 1.5 Punkt 2).
5. Ergebnis von 1–4 fließt in die endgültige Statusänderung „vorhanden" →
   „verifiziert" in `specs/FEATURE-BACKLOG.md` ein, sobald durchgeführt.

---

## 3. Zuordnung Anforderung → Test (Abnahme-Mapping)

| Anforderungs-Abschnitt | Testebene(n) | Datei(en) |
|---|---|---|
| 3.1 (Anwenden auf Selektion) | E2E | `schriftfarbe.spec.ts` §2.1 |
| 3.2/3.5 (leere Selektion, nach Fix) | Unit + E2E | `roundtrip.test.ts` (Abschnitt 1.4 #3), `schriftfarbe.spec.ts` §2.2 |
| 3.3 (Aktiv-Zustand, Ist-Zustand bestätigen) | E2E | `schriftfarbe.spec.ts` §2.3 |
| 3.4 (natives Widget, kontinuierliches `onChange`) | E2E (automatisiert) + manuell | `schriftfarbe.spec.ts` §2.7 #4, Abschnitt 2.12 #2/#3 |
| 3.6 (Kombination mit anderen Formaten) | E2E | `schriftfarbe.spec.ts` §2.4 |
| 3.7 (Zusammenspiel mit Hervorhebung) | E2E | `schriftfarbe.spec.ts` §2.4 #3 |
| 3.8 (exakte Farbwerterhaltung, Case-Sensitivität) | Unit | `docx/__tests__/textColor.test.ts` #2, `odt/__tests__/textColor.test.ts` #11 |
| 3.9 (Formatwechsel) | E2E | `schriftfarbe.spec.ts` §2.4 #5–6, §2.5 (Cross-Format) |
| Grenzfälle 4.1–4.19 | Unit + E2E, je dediziert | `schriftfarbe.spec.ts` §2.8, Querverweise siehe Tabelle dort |
| Rundreise-Testfälle 1–9 (Abschnitt 6) | Unit + E2E | `roundtrip.test.ts`/`textColor.test.ts` (Abschnitt 1) + `schriftfarbe.spec.ts` §2.5 |
| Rundreise-Testfall 6 (echte Fremddatei) | E2E, Pflicht | `schriftfarbe.spec.ts` §2.5 #6/#7 |
| Rundreise-Testfall 7 (unabhängiger Parser) | E2E (automatisiert Regex/DOM) + manuell | `schriftfarbe.spec.ts` §2.5 #8/#9, Abschnitt 1.5/2.12 #4 |
| Testfälle 1–12 (Abschnitt 7) | E2E | `schriftfarbe.spec.ts` §2.1–2.9 |
| Testfall 6/Grenzfall 4.18 (Selection-Sync-Regression) | E2E, Pflicht dauerhaft | `selection-regression.spec.ts` (erweitert), §2.10 |
| Testfall 11 (⌫-Rendering) | manuell | Abschnitt 2.12 #1 |
| Testfall 12 (Tastatur-Bedienbarkeit) | E2E (Tab-Erreichbarkeit) + manuell (Dialogöffnen) | `schriftfarbe.spec.ts` §2.9, Abschnitt 2.12 #2 |
| Abnahmekriterium 4 (Entscheidung leere Selektion) | dokumentiert | `schriftfarbe-code.md` Abschnitt 3.3, verifiziert in §2.2 |
| Abnahmekriterium 5 (Grenzfall 4.11/4.12, echte Fremddateien) | Unit + E2E | `textColor.test.ts` (beide Formate), `schriftfarbe.spec.ts` §2.6 |
| Abnahmekriterium 6 (⌫-Rendering ≥2 Systeme) | manuell | Abschnitt 2.12 #1 |

---

## 4. Abnahme-Checkliste (vor Statuswechsel „verifiziert")

- [ ] Alle Fixes aus `schriftfarbe-code.md` Abschnitt 3 (`escapeXml`,
      stilvererbte Farbe DOCX+ODT, `addStoredMark`/`removeStoredMark`,
      `change`-Event-Bindung) sind umgesetzt.
- [ ] `npm test` grün, inkl. `docx/__tests__/textColor.test.ts`,
      `docx/__tests__/writer-escaping.test.ts`,
      `odt/__tests__/textColor.test.ts` und der Erweiterungen der beiden
      `roundtrip.test.ts`-Dateien.
- [ ] `npm run test:e2e` grün, inkl. `schriftfarbe.spec.ts` und der
      Erweiterung von `selection-regression.spec.ts`.
- [ ] Jeder Grenzfall aus Anforderung Abschnitt 4 (4.1–4.19) hat mindestens
      einen grünen, dedizierten Test (kein Sammeltest, der Einzelergebnisse
      verschleiert) — Zuordnung siehe Abschnitt 3 dieser Datei.
- [ ] Alle neun Rundreise-Testfälle aus Anforderung Abschnitt 6 grün,
      inklusive der beiden Pflicht-Fremddatei-Tests (Testfall 6) und der
      beiden unabhängigen XML-Validierungen (Testfall 7).
- [ ] Grenzfälle 4.11 und 4.12 mit je zwei unabhängigen echten Fremddateien
      geprüft, Fallback-Verhalten dokumentiert (Abnahmekriterium 5).
- [ ] Regressionstest zu Grenzfall 4.18 dauerhaft in
      `selection-regression.spec.ts` verankert (Abnahmekriterium 3).
- [ ] Manuelle Prüfschritte aus Abschnitt 2.12 (⌫-Rendering ≥2 Systeme,
      natives Dialogverhalten, Undo-Schrittanzahl beim echten Ziehen,
      unabhängige Parser-Validierung) durchgeführt und Ergebnis vermerkt.
- [ ] Entscheidung zum Verhalten bei leerer Selektion
      (`schriftfarbe-code.md` Abschnitt 3.3: „nachrüsten") ist über
      `schriftfarbe.spec.ts` §2.2 verifiziert (Abnahmekriterium 4).
- [ ] Kein Test in `schriftfarbe.spec.ts` bzw. der Erweiterung von
      `selection-regression.spec.ts` ruft `readDocx`/`writeDocx`/`readOdt`/
      `writeOdt`/`applyMarkColor`/`clearMarkColor` direkt auf —
      stichprobenartig per Review bestätigt.
- [ ] Kein während der Verifikation gefundener Fehler bleibt ohne
      Ticket/Vermerk zurück (Abnahmekriterium 7) — offene Punkte aus
      `schriftfarbe-code.md` Abschnitt 11 sind hier referenziert, nicht
      erneut verhandelt.
