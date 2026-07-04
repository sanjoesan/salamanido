# QA-Testplan: „Manueller Zeilenumbruch (Umschalt+Enter)"

Bezug: `specs/zeilenumbruch-manuell-req.md` (Anforderung, Stand geprüft 2026-07-04) und
`specs/zeilenumbruch-manuell-code.md` (Umsetzungsplan, Stand geprüft 2026-07-04). Rolle
dieses Dokuments: konkreter, ausführbarer Testplan für die Freigabe nach Anforderung
Abschnitt 7. Referenzierte Bestandsdateien wurden für diesen Testplan gegen den tatsächlichen
Repo-Inhalt verifiziert (`playwright.config.ts`, `tests/e2e/docx.spec.ts`,
`tests/e2e/odt.spec.ts`, `tests/e2e/selection-regression.spec.ts`,
`src/formats/shared/schema.ts`, `src/formats/shared/editor/commands.ts`,
`src/formats/shared/editor/Toolbar.tsx`, `src/formats/shared/editor/WordEditor.tsx`,
`src/formats/docx/__tests__/roundtrip.test.ts`, `src/formats/docx/__tests__/external-fixtures.test.ts`).

**Grundprinzip dieses Testplans (bindend):** Zwei getrennte, beide verpflichtende Ebenen —
(1) Unit-Tests gegen Reader/Writer direkt (schnell, deterministisch, aber blind für den
Tastatur-Eingabeweg) und (2) **echte** Playwright-Browser-Tests, die den kompletten Weg
Klick/Tastendruck → sichtbare DOM-Änderung → echter Datei-Download → Byte-Inspektion der
heruntergeladenen Datei → echter Re-Upload nachstellen. Interne Funktionsaufrufe
(`readDocx`/`writeOdt` o. Ä. direkt im Testcode aufgerufen) zählen **nicht** als Ersatz für
Ebene (2) — sie sind zulässig als Ebene (1) oder als klar gekennzeichnete Ergänzung *innerhalb*
eines E2E-Tests (siehe Abschnitt 0.2 zur Cross-Format-Einschränkung), niemals als vollwertiger
Ersatz für „im Browser geklickt/getippt".

---

## 0. Prüfmethodik — Abweichungen/Verschärfungen gegenüber dem Umsetzungsplan

### 0.1 Übernommen

Die Testfall-Enumeration aus `zeilenumbruch-manuell-code.md` Abschnitt 14 (18 Grenzfälle,
Rundreise-Matrix, Fixture-Liste aus Abschnitt 0.2) wird inhaltlich übernommen und unten in
konkrete, ausführbare Testdateien überführt. Ebenso übernommen: die Playwright-Projekt-Ergänzung
`'Desktop Firefox'` (`zeilenumbruch-manuell-code.md` Abschnitt 13) als **Voraussetzung**, nicht
optional — ohne sie ist Anforderung Testplan-Punkt 4 (mind. zwei Browser-Engines) nicht erfüllt,
da `playwright.config.ts` aktuell (verifiziert) nur `'Desktop Chrome'` (Chromium),
`'Mobile'`/Pixel 7 (ebenfalls Chromium) und `'Tablet'`/iPad Mini (WebKit) enthält — **keine**
Firefox-Engine.

### 0.2 Verschärfung: Cross-Format-Test (Grenzfall 16, Rundreise 5.2.3) ist nur teilweise ein „echter" Browser-Test — muss so gekennzeichnet, nicht verschleiert werden

`zeilenumbruch-manuell-code.md` Abschnitt 0.6 / Testfall 14.2 Nr. 18 löst die Cross-Format-
Rundreise (DOCX-Karte → ODT „exportieren", oder umgekehrt) so, dass der **Eingabeteil** (Text
tippen, Umschalt+Enter, Export-Klick, echter Download) echte Browser-Interaktion ist, der
**Format-Wechsel selbst** aber programmatisch im Testcode erfolgt (`readDocx(...)` auf den
heruntergeladenen Buffer, Ergebnis direkt an `writeOdt(...)` übergeben) — weil die App **keine**
UI-Funktion „als anderes Format speichern"/„konvertieren" besitzt (verifiziert:
`src/App.tsx`, `src/app/DocumentWorkspace.tsx`; keine Treffer für „convert"/„Konvertier" im
gesamten `src`-Baum).

**QA-Entscheidung:** Dieser Test wird **nicht** als vollwertiger E2E-Test für den Aspekt
„Cross-Format" gezählt, sondern ausschließlich als E2E-Test für „Umschalt+Enter erzeugt beim
Export via echtem Download eine korrekt lesbare Datei" geführt (Abschnitt 4, Testfall E11/E12
unten). Die Cross-Format-Behauptung selbst wird **ausschließlich** über die reine
Unit-Verkettung (Abschnitt 3, Testfall U9/U10) abgedeckt. Diese Aufteilung ist im Testbericht
explizit zu vermerken — **nicht** als „E2E: Cross-Format ✅" zusammenfassen, weil das den
tatsächlichen Testumfang verschleiern würde. Zusätzlich: an PO zu melden (Abschnitt 10), dass
eine echte browsergetriebene Cross-Format-Prüfung produktseitig aktuell grundsätzlich
unmöglich ist, unabhängig von diesem Feature — das ist eine Produktlücke, keine Testlücke.

### 0.3 Verschärfung: jede Rundreise-Prüfung schließt eine echte Byte-Inspektion der heruntergeladenen Datei ein, nicht nur „Re-Import zeigt richtigen Text"

Reines „nach Re-Import steht der Text wieder im Editor" kann einen stillen Strukturverlust
verdecken (z. B. `hard_break` → Absatz degradiert, aber sichtbarer Text bleibt gleich, weil beide
Zeilenteile ohnehin nacheinander im DOM stehen). Jeder E2E-Rundreise-Test in Abschnitt 4 prüft
deshalb **zusätzlich** zur Editor-Sichtprüfung die entpackte XML-Struktur der heruntergeladenen
Datei selbst (`<w:br/>` in `word/document.xml` bzw. `<text:line-break/>` in `content.xml`, jeweils
über echtes `download.path()` → `fs.readFile` → `JSZip.loadAsync`, exakt wie in
`tests/e2e/docx.spec.ts`/`tests/e2e/odt.spec.ts` bereits etabliert) sowie die **Anzahl** von
`<p>`-Elementen im Editor-DOM (kein stiller Absatz-Split).

### 0.4 Verschärfung: Bild-Selektions-Bug (Zusatzbefund F) ist Blocker für „grün", nicht optionale Zusatzprüfung

`zeilenumbruch-manuell-code.md` Abschnitt 0.7 weist einen verifizierten Datenverlust-Bug nach
(`NodeSelection` auf einem block-artigen Knoten wie `image` + `replaceSelectionWith` löscht den
Knoten). `src/formats/shared/schema.ts` bestätigt: `image` ist `group: 'block'`
(kein `inline: true`, kein `selectable: false`) — die Voraussetzung für den Bug ist also real im
Schema vorhanden, nicht nur hypothetisch. **QA-Einstufung:** Testfall E9b (Abschnitt 4) ist ein
**Pflicht-Blocker**. Schlägt er fehl (Bild verschwindet), ist der gesamte Feature-Rundreise-Status
(Anforderung 5.2) als **nicht bestanden** zu werten, unabhängig davon, ob alle anderen Tests grün
sind — Anforderung Abnahmekriterium in Abschnitt 5 verbietet explizit „vollständiges Verschwinden
… von Textinhalt".

### 0.5 Ergänzung: Undo/Redo-Gruppierung wird als eigener, nicht impliziter Testfall geführt

Anforderung 3.13 verlangt explizite Verifikation, dass die Erzeugung (aktuell über
Mutation-Reconciliation, nach Umsetzung ggf. über expliziten Command) zu **keiner**
unerwarteten Undo-Gruppierung führt. Der Umsetzungsplan erwähnt das nur am Rande (Testfall
14.2 Nr. 12). QA führt dafür einen eigenen, doppelt geprüften Testfall (Abschnitt 4, E10): einmal
„Umbruch allein rückgängig machen, Text bleibt", einmal „Umbruch + direkt nachfolgend getippter
Text nicht fälschlich in einem Schritt verschmolzen".

---

## 1. Teststufen-Übersicht

| Ebene | Werkzeug | Deckt ab | Deckt **nicht** ab |
|---|---|---|---|
| Unit | Vitest, `readDocx`/`writeDocx`/`readOdt`/`writeOdt` direkt aufgerufen | Reader/Writer-Korrektheit, Serialisierungsformat, Fremd-Fixture-Parsing, Cross-Format-Verkettung, bekannte Reader-Lücken (Grenzfall 13/14) | Den tatsächlichen Tastatur-Eingabeweg (Shift+Enter im echten `contenteditable`), UI-Bedienbarkeit, Datei-Upload/-Download über die reale Programmoberfläche |
| E2E (Playwright, echter Browser) | `page.keyboard`, `page.locator(...).click()`, `input.setInputFiles(...)`, `page.waitForEvent('download')` | Den kompletten Nutzerweg: Klicks, echte Tastatureingabe inkl. `Shift+Enter`, Datei-Upload, Datei-Export mit echtem Download-Event, Byte-Inspektion der heruntergeladenen Datei, Re-Upload zur Rundreise-Verifikation, Cross-Browser-Verhalten (Chromium/Firefox/WebKit) | Feinkörnige interne Datenmodell-Zustände ohne DOM-Auswirkung (dafür ist Unit-Ebene zuständig und günstiger) |

Beide Ebenen sind laut Anforderung Testplan-Punkt 7 **beide verpflichtend** — keine Ebene ersetzt
die andere.

---

## 2. Testumgebung & Fixtures

### 2.1 Voraussetzung: `playwright.config.ts` um Firefox-Projekt ergänzen

Aktuell (verifiziert):
```ts
projects: [
  { name: 'Desktop Chrome', use: { ...devices['Desktop Chrome'] } },
  { name: 'Mobile', use: { ...devices['Pixel 7'] } },
  { name: 'Tablet', use: { ...devices['iPad Mini'] } },
],
```
Erforderlich für diesen Testplan:
```ts
projects: [
  { name: 'Desktop Chrome', use: { ...devices['Desktop Chrome'] } },
  { name: 'Desktop Firefox', use: { ...devices['Desktop Firefox'] } },
  { name: 'Mobile', use: { ...devices['Pixel 7'] } },
  { name: 'Tablet', use: { ...devices['iPad Mini'] } },
],
```
**Vor** dem ersten Testlauf dieses Plans zu erledigen. Nebenwirkung (bewusst in Kauf genommen,
siehe Abschnitt 5): die **gesamte bestehende** E2E-Suite läuft danach zusätzlich unter Firefox —
jeder dadurch neu auftretende, mit diesem Feature nicht in Zusammenhang stehende Firefox-Fehlschlag
ist separat zu melden, blockiert aber nicht die Freigabe dieses Features.

### 2.2 Reale Fixture-Dateien (bereits im Repo vorhanden, verifiziert per Verzeichnis-Listing)

| Datei | Verwendung |
|---|---|
| `tests/fixtures/external/docx/drawing.docx` | Import eines echten, mit Microsoft Word erzeugten `<w:br/>` (Anforderung 3.6/5.2.6) |
| `tests/fixtures/external/docx/saut_page.docx` | Grenzfall 13: `<w:br/>` + `<w:br w:type="page"/>` im selben Dokument |
| `tests/fixtures/external/docx/bug57031.docx`, `bug65649.docx` | Zusätzliche Grenzfall-13-Fixtures; `bug65649.docx` zusätzlich Performance/Massentest (Grenzfall 17) |
| `tests/fixtures/external/odt/TextLineBreakText.odt` | Import eines echten, mit LibreOffice erzeugten `<text:line-break/>` (Anforderung 3.8/5.2.7), zusätzlich verschachtelt in `<text:span>` |
| `tests/fixtures/external/odt/EasyList.odt`, `ListStyleResolution.odt` | Grenzfall 7 (Zeilenumbruch in Listenpunkt) mit echter Fremddatei |
| `tests/fixtures/external/odt/text-extract.odt` | Negativtest Grenzfall 14: enthält `<text:soft-page-break/>` ohne `<text:line-break/>` |

### 2.3 Neu zu erstellendes synthetisches Fixture (Grenzfall 14, exakte Adjazenz)

Kein reales Fixture mit `<text:line-break/>` **unmittelbar gefolgt von** `<text:soft-page-break/>`
im selben Absatz wurde gefunden (bestätigt in `zeilenumbruch-manuell-code.md` Abschnitt 0.3).
Wird als kleines, im Testcode selbst per JSZip gebautes ODT-Fixture erzeugt (Abschnitt 3,
Testfall U8) — kein Blocker für den Testplan, da synthetisch reproduzierbar.

### 2.4 Voraussetzung: `insertHardBreak()`-Command + `'Shift-Enter'`-Keymap-Eintrag müssen umgesetzt sein, bevor E2E-Tests aus Abschnitt 4 sinnvoll sind

Dieser Testplan geht davon aus, dass die Architekturentscheidung aus
`zeilenumbruch-manuell-code.md` Abschnitt 1 (expliziter Command statt nur nativer Fallback)
umgesetzt wurde. **Falls nicht:** Testfall E1 (Grundfall) ist trotzdem **zuerst** auszuführen,
bevor jede weitere Arbeit an diesem Testplan beginnt — schlägt er bereits im aktuellen (Vor-
Umsetzungs-)Zustand fehl, ist das der empirische Beleg für die in Anforderung Abschnitt 0 Punkt 5
vermutete Fragilität des nativen Fallbacks und muss als **Blocker-Befund** an Lead/Dev
zurückgemeldet werden, bevor mit den restlichen Testfällen fortgefahren wird.

---

## 3. Unit-Testplan (Reader/Writer-Rundreise, DOCX + ODT)

| ID | Datei | Testname (sinngemäß) | Prüft | Grenzfall/Anforderungsbezug |
|---|---|---|---|---|
| U1 | `src/formats/docx/__tests__/roundtrip.test.ts` | „preserves hard line breaks within a paragraph" | **bereits vorhanden** (Zeilen 113–125) — Regressionsschutz, bleibt unverändert | 3.5/3.6 Baseline |
| U2 | `src/formats/odt/__tests__/roundtrip.test.ts` | „preserves hard line breaks within a paragraph" | **bereits vorhanden** (Zeilen 113–125) — Regressionsschutz, bleibt unverändert | 3.7/3.8 Baseline |
| U3 | `src/formats/docx/__tests__/roundtrip.test.ts` (neu) | „preserves multiple consecutive hard breaks in the same paragraph" | 3 aufeinanderfolgende `hard_break` bleiben exakt 3, korrekte Reihenfolge | Grenzfall 3/17 |
| U4 | `src/formats/docx/__tests__/roundtrip.test.ts` (neu) | „preserves a hard break inside a heading" | Überschrift bleibt 1 Node, `hard_break` erhalten | Grenzfall 6, 3.9 |
| U5 | `src/formats/docx/__tests__/roundtrip.test.ts` (neu) | „preserves a leading and trailing hard break" | führende/folgende leere Zeile nicht verworfen | Grenzfall 1/2, 3.3 |
| U6 (U2-Pendant) | `src/formats/odt/__tests__/roundtrip.test.ts` (neu) | identische drei Tests wie U3–U5, ODT-Variante | dito für ODT | wie oben |
| U7a | `src/formats/docx/__tests__/external-fixtures.test.ts` (neue `describe`-Gruppe) | „reads a plain `<w:br/>` (saut_page.docx) as hard_break" | Fremd-Fixture korrekt gelesen | 3.6, 5.2.6 |
| U7b | dito | „documents (does NOT distinguish) that `<w:br w:type=\"page\"/>` is ALSO read as hard_break — count assertion `=== 3`" | **bewusst dokumentierte Lücke** sichtbar gemacht, kein Fix in diesem Ticket | Grenzfall 13, 3.6 |
| U7c | dito | „reads an explicit `w:type=\"textWrapping\"` break (drawing.docx) as hard_break too" | Default-Fall korrekt | 3.6 |
| U7d | `src/formats/odt/__tests__/external-fixtures.test.ts` (neue `describe`-Gruppe) | „reads the styled, nested `<text:line-break/>` in TextLineBreakText.odt as hard_break" | Fremd-Fixture, verschachtelt in `<text:span>` | 3.8, 5.2.7 |
| U7e | dito | „does not misinterpret text:soft-page-break as hard_break (text-extract.odt)" | Negativtest | Grenzfall 14, 3.8 |
| U8 | `src/formats/odt/__tests__/hardBreakVsSoftPageBreak.test.ts` (neu) | „Grenzfall 14: text:line-break unmittelbar gefolgt von text:soft-page-break im selben Absatz" | genau 1 `hard_break`, korrekte Text-Reihenfolge `Zeile eins\|hard_break\|Zeile zwei` | Grenzfall 14 |
| U9 | `src/formats/__tests__/crossFormatHardBreak.test.ts` (neu) | „DOCX → ODT → DOCX" | `hard_break` übersteht doppelten Formatwechsel, Text davor/danach unverändert | Grenzfall 16, 5.2.3 |
| U10 | dito | „ODT → DOCX → ODT" | wie U9, umgekehrte Richtung | Grenzfall 16, 5.2.3 |
| U11 | dito | „multiple breaks + heading + list survive a double format round trip" | kumulativer Verlust-Test über Heading+Liste+2×`hard_break` | Grenzfall 16, 5.2.8 |

**Referenzimplementierung** für U3–U8 und U9–U11 liegt bereits vollständig als Code in
`zeilenumbruch-manuell-code.md` Abschnitt 14.1 vor (a–f) — QA übernimmt diese Snippets 1:1 als
verbindliche Testimplementierung, mit folgenden **Pflichtergänzungen**, die im Umsetzungsplan
fehlen:

```ts
// Ergänzung zu U3 (roundtrip.test.ts) — Anforderung 3.13 verlangt zusätzlich, dass die
// Reihenfolge der Textteile um die Umbrüche herum nicht vertauscht wird, nicht nur die Anzahl:
it('preserves exact ordering around multiple consecutive hard breaks', async () => {
  const original = doc([
    {
      type: 'paragraph',
      attrs: { align: 'left' },
      content: [
        { type: 'text', text: 'A' },
        { type: 'hard_break' },
        { type: 'hard_break' },
        { type: 'hard_break' },
        { type: 'text', text: 'B' },
      ],
    },
  ])
  const result = await roundTrip(original)
  const content = (result.body as any).content[0].content
  expect(content.map((n: any) => n.text ?? n.type).join('|')).toBe(
    'A|hard_break|hard_break|hard_break|B',
  )
})
```

```ts
// Ergänzung zu U9/U10 (crossFormatHardBreak.test.ts) — QA verlangt zusätzlich eine explizite
// Negativ-Assertion: der hard_break darf NICHT in einen zweiten Absatz degradiert sein
// (Anforderung 3.10 „darf sich nie in einen neuen Absatz verwandeln"):
expect((final.body as any).content).toHaveLength(1) // weiterhin genau 1 Absatz, kein Split
```

---

## 4. Playwright E2E-Testplan — echte Browser-Interaktion (Pflicht)

Neue Datei `tests/e2e/zeilenumbruch.spec.ts`, Aufbau analog `tests/e2e/docx.spec.ts` /
`tests/e2e/odt.spec.ts` (`docxCard`/`odtCard`-Helper per `page.locator('div.rounded-lg', { has: … })`,
`.ProseMirror`-Editor-Locator, `getByRole('button', { name: 'Exportieren' })` +
`page.waitForEvent('download')`, `JSZip.loadAsync` auf den heruntergeladenen Buffer). **Jeder**
Testfall unten verwendet ausschließlich `page.keyboard.*`/`page.locator(...).click()`/
`input.setInputFiles(...)` für die Interaktion — **keine** direkten Aufrufe von
`insertHardBreak()`/`readDocx()`/`writeOdt()` etc. im Testkörper, außer explizit als
„Byte-Inspektion der heruntergeladenen Datei" (JSZip) oder in dem einen, klar gekennzeichneten
Grenzfall aus Abschnitt 0.2.

### 4.1 Kern-Testfälle

| ID | Name | Schritte (echte Interaktion) | Assertion | Bezug |
|---|---|---|---|---|
| E1 | Grundfall Shift+Enter | `docxCard(page).getByRole('button', {name:'Neu erstellen'}).click()` → `editor.click()` → `page.keyboard.type('Zeile eins')` → `page.keyboard.press('Shift+Enter')` → `page.keyboard.type('Zeile zwei')` | `page.locator('.ProseMirror p')` hat Count **1**; `editor.locator('br')` hat Count **1**; `editor` enthält beide Texte | 3.1, Testplan-Pkt. 2 |
| E2 | Selektion ersetzen | wie E1, danach `ControlOrMeta+a`, dann `Shift+Enter` | vorheriger Text weg, `br`-Count weiterhin 1, Absatz-Count 1 | 3.2 |
| E3 | Anfang/Ende | `Home` + `Shift+Enter` am Anfang; separat `End` + `Shift+Enter` am Ende, direkt weitertippen | führende bzw. folgende leere Zeile entsteht, kein No-Op (`br`-Count erhöht sich sichtbar) | 3.3, Grenzfall 1/2 |
| E4 | Mehrfach ohne Text | 3× `Shift+Enter` hintereinander ohne Zwischentext | `br`-Count **3**, kein Zusammenfallen auf 1 | Grenzfall 3 |
| E5 | Shift+Enter + Enter gemischt | Text, `Shift+Enter`, Text, `Enter`, Text | `.ProseMirror p`-Count **2**; erster Absatz enthält genau **1** `br` | Grenzfall 4 |
| E6 | Leerer Absatz | Neues Dokument, sofort `Shift+Enter` ohne vorherige Eingabe | kein Absturz/Konsolenfehler, `br`-Count **1** | Grenzfall 5 |
| E7 | Überschrift | `getByLabel('Absatzformat')` → `selectOption` „Überschrift 1" (Wert `'1'`), Text, `Shift+Enter`, Text | `.ProseMirror h1`-Count weiterhin **1**, kein Split in 2 Überschriften | Grenzfall 6, 3.9 |
| E8 | Listenpunkt | `getByTitle('Aufzählung').click()`, Text, `Shift+Enter`, Text | `.ProseMirror li`-Count weiterhin **1** | Grenzfall 7, 3.9 |
| E9a | Tabellenzelle | `getByTitle('Tabelle einfügen').click()`, in Zelle klicken, Text, `Shift+Enter`, Text | Zellenzahl unverändert, beide Zeilenteile in derselben Zelle sichtbar | Grenzfall 8, 3.9 |
| E9b (**Blocker**) | Bild-NodeSelection + Shift+Enter | Bild via `label:has-text('Bild') input[type=file]` mit `setInputFiles` einfügen (kleines PNG-Fixture), Bild per `ArrowLeft`/`ArrowRight` bis zur Node-Selektion anwählen, dann `Shift+Enter` | `editor.locator('img')`-Count bleibt **1** (nicht 0) — siehe Abschnitt 0.4, Pflicht-Blocker | Grenzfall 9, Zusatzbefund F |
| E9c | Bild-Textnachbarschaft (Cursor, nicht NodeSelection) | Bild einfügen, per Klick Cursor **im Text davor** setzen, `Shift+Enter` | Bild bleibt sichtbar, Position relativ zum Text unverändert | Grenzfall 9 |
| E10a | Löschen (Backspace direkt nach Umbruch) | Text, `Shift+Enter`, Text; Cursor an Anfang zweiter Zeile (`Home`), `Backspace` | `br`-Count **0**, beide Textteile zu einer durchgehenden Zeile verschmolzen, exakter String-Vergleich per `editor.textContent()` — kein Zeichenverlust | Grenzfall 10 |
| E10b | Löschen (Entf direkt vor Umbruch) | wie E10a, aber Cursor ans Ende erster Zeile (`End`), `Delete` | dieselbe Assertion wie E10a | Grenzfall 10 |
| E11 | Undo/Redo — Umbruch allein | E1-Sequenz, danach `ControlOrMeta+z` | `br`-Count **0**, Text vor/nach unverändert; danach `ControlOrMeta+y` (bzw. `ControlOrMeta+Shift+z`) → `br`-Count wieder **1** | 3.13 |
| E12 | Undo-Gruppierung Umbruch+Tippen | E1-Sequenz, danach **ein** `ControlOrMeta+z` | NUR der zuletzt getippte Text („Zeile zwei") verschwindet, Umbruch bleibt bestehen **oder** (je nach tatsächlichem Verhalten) Umbruch+Text verschwinden gemeinsam — **Ergebnis explizit protokollieren**, nicht stillschweigend annehmen; Anforderung verlangt nur „kein unerwartetes Verhalten", keine feste Vorgabe der Gruppierung, aber das beobachtete Verhalten muss dokumentiert und danach stabil (reproduzierbar) sein | 3.13, Abschnitt 0.5 |
| E13 | Navigation (Pfeiltasten) | Text A + Umbruch + Text B, Cursor an Anfang, `ArrowRight` × (Länge A + 1) | nach genau „Länge A + 1" Tastendrücken landet der Cursor hinter dem `<br>` — verifiziert per Tipp-Marker: an dieser Stelle eingetippter Text erscheint in Zeile B, nicht mehr in Zeile A | Grenzfall 11, 3.12 |
| E14 | Doppelklick-Wortgrenze | „WortAvor" + `Shift+Enter` + „Wortnach", Doppelklick auf „vor" unmittelbar vor dem Umbruch | `page.evaluate(() => window.getSelection()?.toString())` ist exakt `"vor"`, schließt Umbruch/Folgewort nicht ein | Grenzfall 12, 3.12 |
| E15 | Massentest (50+) | 60× `Shift+Enter` in Schleife | Test läuft ohne Timeout durch (UI bleibt responsiv), `br`-Count **60** | Grenzfall 17 |
| E16 | Zwischenablage-Abgrenzung | Umbruch erzeugen, danach mehrzeiligen Text per simuliertem `paste`-Event einfügen | resultiert in zusätzlichen `<p>`-Absätzen, ursprünglicher `br` bleibt an unveränderter Position/Count 1 | Grenzfall 18, 3.11 |

### 4.2 Datei-Upload/-Export-Testfälle (echter Download + Byte-Inspektion, Pflicht)

| ID | Name | Schritte | Assertion (inkl. Byte-Ebene) | Bezug |
|---|---|---|---|---|
| E17 | DOCX-Export enthält `<w:br/>` | Neues Dokument (DOCX-Karte), Text+`Shift+Enter`+Text, `Exportieren`-Klick, `page.waitForEvent('download')`, `download.path()` → `fs.readFile` → `JSZip.loadAsync` → `zip.file('word/document.xml')!.async('text')` | `documentXml` enthält `<w:br/>` (kein `w:type`-Attribut, siehe 3.5); enthält **beide** Textteile | 3.5, Baseline |
| E18 | DOCX-Re-Import erhält Umbruch | direkt nach E17: den heruntergeladenen Buffer über `input.setInputFiles({ name, mimeType, buffer: exportedBuffer })` **erneut in die DOCX-Karte hochladen** (echter Re-Upload über die UI, kein `readDocx()`-Aufruf im Test) | `.ProseMirror p`-Count weiterhin 1, `br`-Count weiterhin 1, beide Texte sichtbar | 5.2.1 |
| E19 | ODT-Export enthält `<text:line-break/>` | wie E17, ODT-Karte, `content.xml` prüfen | enthält `<text:line-break/>`, beide Textteile | 3.7 |
| E20 | ODT-Re-Import erhält Umbruch | wie E18, ODT-Karte | dieselbe Assertion wie E18 | 5.2.2 |
| E21 | Import fremde Word-Datei | `input.setInputFiles({ buffer: readFileSync('tests/fixtures/external/docx/drawing.docx') })` in DOCX-Karte, danach Export, Re-Import | nach Import: Editor enthält Inhalt sichtbar; nach Export: `documentXml` enthält `<w:br/>`; nach Re-Import: weiterhin vorhanden | 3.6, 5.2.6 |
| E22 | Import fremde LibreOffice-Datei | wie E21 mit `tests/fixtures/external/odt/TextLineBreakText.odt` in ODT-Karte | analoge Assertion mit `<text:line-break/>` | 3.8, 5.2.7 |
| E23 | Baseline-Regression: Datei ohne Umbruch bleibt frei von `<w:br/>` | reale DOCX-Datei **ohne** manuellen Zeilenumbruch hochladen (z. B. der bereits im Repo genutzte `buildSampleDocx()`-Fixture-Baustein aus `docx.spec.ts`, ohne Änderung exportieren) | `documentXml` enthält **kein** `<w:br/>` — kein fälschlich erkannter Umbruch | 5.1.1 |
| E24 | Baseline-Regression ODT-Pendant | wie E23 für ODT | `content.xml` enthält **kein** `<text:line-break/>` | 5.1.2 |
| E25 | Baseline-Regression nach Keymap-Änderung: reines Enter unverändert | nach Umsetzung von `'Shift-Enter'`: Text, reines `Enter`, Text | weiterhin **2** `<p>`-Absätze (kein Verschlucken/keine Vermischung mit Shift-Variante) — bereits abgedeckt durch bestehende `selection-regression.spec.ts`-Tests, hier zusätzlich explizit im neuen Testfile wiederholt als direkter Nachbartest zu E1 | 5.1.4 |

### 4.3 Ergänzung `tests/e2e/selection-regression.spec.ts` (Grenzfall 15, Pflicht)

Neuer Test **innerhalb** des bestehenden `describe`-Blocks (nicht als separate Datei, damit er
dauerhaft Teil der etablierten Selection-Sync-Suite bleibt):

```ts
test('Shift+Enter after a stale-selection reposition click — both line parts must survive', async ({ page }) => {
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Hallo, das ist ein Test.')

  await page.keyboard.press('ControlOrMeta+a')
  await page.getByTitle('Fett').click()

  await editor.click()
  await page.keyboard.press('End')
  await page.keyboard.press('Shift+Enter')
  await page.keyboard.type('Zweite Zeile.')

  await expect(editor).toContainText('Hallo, das ist ein Test.')
  await expect(editor).toContainText('Zweite Zeile.')
  await expect(page.locator('.ProseMirror p')).toHaveCount(1)
  await expect(editor.locator('br')).toHaveCount(1)
})
```

### 4.4 Referenz-Implementierung E1 (vollständiges Beispiel, Muster für alle übrigen Testfälle)

```ts
import { test, expect } from '@playwright/test'
import JSZip from 'jszip'
import { readFileSync } from 'node:fs'

function docxCard(page: import('@playwright/test').Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' } ) })
}

test.describe('Zeilenumbruch (Shift+Enter) — DOCX', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  })

  test('E1: Shift+Enter erzeugt einen Umbruch im selben Absatz, kein neuer <p>', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Zeile eins')
    await page.keyboard.press('Shift+Enter')
    await page.keyboard.type('Zeile zwei')

    await expect(page.locator('.ProseMirror p')).toHaveCount(1)
    await expect(editor.locator('br')).toHaveCount(1)
    await expect(editor).toContainText('Zeile eins')
    await expect(editor).toContainText('Zeile zwei')
  })

  test('E17+E18: Export enthält <w:br/>, Re-Upload erhält den Umbruch', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Zeile eins')
    await page.keyboard.press('Shift+Enter')
    await page.keyboard.type('Zeile zwei')

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportieren' }).click()
    const download = await downloadPromise
    const downloadedPath = await download.path()
    expect(downloadedPath).toBeTruthy()

    const fs = await import('node:fs/promises')
    const exportedBuffer = await fs.readFile(downloadedPath!)
    const zip = await JSZip.loadAsync(exportedBuffer)
    const documentXml = await zip.file('word/document.xml')!.async('text')
    expect(documentXml).toContain('<w:br/>')
    expect(documentXml).toContain('Zeile eins')
    expect(documentXml).toContain('Zeile zwei')

    // Echter Re-Upload über die UI — kein direkter readDocx()-Aufruf im Test.
    await page.reload()
    await page.getByRole('button', { name: /verstanden/i }).click()
    const input = docxCard(page).locator('input[type="file"]')
    await input.setInputFiles({
      name: 'reimport.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer: exportedBuffer,
    })
    const reimportedEditor = page.locator('.ProseMirror')
    await expect(reimportedEditor.locator('br')).toHaveCount(1)
    await expect(reimportedEditor.locator('p')).toHaveCount(1)
    await expect(reimportedEditor).toContainText('Zeile eins')
    await expect(reimportedEditor).toContainText('Zeile zwei')
  })
})
```

Alle übrigen Testfälle (E2–E16, E19–E25) folgen demselben Muster (`page.keyboard`/`click`/
`setInputFiles`/`waitForEvent('download')`) mit den in Abschnitt 4.1/4.2 beschriebenen,
testfallspezifischen Schritten/Assertions.

---

## 5. Browser-Coverage-Matrix

| Testfall-Gruppe | Desktop Chrome (Chromium) | Desktop Firefox (Gecko) | Tablet (WebKit) | Mobile (Chromium, Touch) |
|---|---|---|---|---|
| E1–E16 (Kern-Interaktion) | Pflicht | **Pflicht** (Testplan-Pkt. 4: mind. 2 Engines) | Empfehlung, kein Blocker | Nicht zwingend — Touch-Interaktion für reine Tastaturfeatures wenig aussagekräftig, siehe `zeilenumbruch-manuell-code.md` Abschnitt 0.4 |
| E17–E25 (Datei-Upload/-Export) | Pflicht | Empfehlung (Download-Handling ist browserabhängig, aber nicht Kern dieses Features) | Optional | Optional |
| E9b (Blocker-Test Bild) | Pflicht | Pflicht (identischer ProseMirror-Code, aber Selektionsverhalten kann sich pro Engine leicht unterscheiden) | Optional | Optional |

**Minimalanforderung zur Freigabe:** E1 (Grundfall) muss unter **mindestens** Desktop Chrome
**und** Desktop Firefox grün sein, exakt wie in Anforderung Testplan-Punkt 4 gefordert.

---

## 6. Grenzfall-Abdeckungsmatrix (Anforderung Abschnitt 4)

| # | Grenzfall | Test-ID(s) |
|---|---|---|
| 1 | Umbruch am Absatzanfang | E3 |
| 2 | Umbruch am Absatzende | E3 |
| 3 | Mehrfach ohne Text | E4, U3 |
| 4 | Umbruch + Enter gemischt | E5 |
| 5 | Umbruch in leerem Absatz | E6 |
| 6 | Umbruch in Überschrift | E7, U4 |
| 7 | Umbruch in Listenpunkt | E8, U7d-analog (EasyList.odt/ListStyleResolution.odt manuell/Import-Fixture) |
| 8 | Umbruch in Tabellenzelle | E9a |
| 9 | Umbruch neben Bild | E9b (**Blocker**), E9c |
| 10 | Backspace/Entf am Umbruch | E10a, E10b |
| 11 | Pfeiltasten über Umbruch | E13 |
| 12 | Doppelklick-Wortgrenze | E14 |
| 13 | `w:br` + `w:br[type=page/column]` | U7a, U7b (bewusst dokumentierte Lücke, kein Fix) |
| 14 | `text:line-break` + `text:soft-page-break` | U7e, U8 |
| 15 | Selection-Sync-Regression mit Umbruch | Abschnitt 4.3 (neuer Test in `selection-regression.spec.ts`) |
| 16 | Cross-Format DOCX↔ODT, mehrere Umbrüche | U9, U10, U11 (**nicht** vollwertig E2E, siehe Abschnitt 0.2) |
| 17 | 50+ Umbrüche | E15, U3 (Reader/Writer-seitig unproblematisch bei 3, E15 deckt die tatsächliche UI-Massenperformance ab) |
| 18 | Zwischenablage neben vorhandenem Umbruch | E16 |

---

## 7. Rundreise-Testmatrix (Anforderung Abschnitt 5)

### 7.1 Baseline (5.1 — Regressionsschutz)

| Anforderung | Test-ID(s) |
|---|---|
| 5.1.1 reale DOCX ohne Umbruch, unverändert exportiert/reimportiert | E23 |
| 5.1.2 reale ODT ohne Umbruch | E24 |
| 5.1.3 reale/synthetische Datei mit echtem Seitenumbruch, bekannte Abweichung dokumentiert | U7b (dokumentiert bewusst die Lücke, kein „grün im falschen Sinne") |
| 5.1.4 5.1.1/5.1.2 bleiben grün nach Keymap-Änderung | E25, bestehende Tests in `selection-regression.spec.ts` (unverändert grün halten) |

### 7.2 Feature-Rundreise (5.2)

| Anforderung | Test-ID(s) |
|---|---|
| 5.2.1 Neues Dokument, Umbruch per echter Tastatur, DOCX | E1, E17, E18 |
| 5.2.2 dasselbe, ODT | E19, E20 |
| 5.2.3 Cross-Format beide Richtungen | U9, U10 (Unit) — **kein** vollwertiger E2E-Nachweis möglich, siehe Abschnitt 0.2; an PO gemeldet |
| 5.2.4 mehrere Umbrüche im selben Absatz | E4, E15, U3 |
| 5.2.5 Umbruch + andere Strukturen (Liste/Tabelle/Bild/Überschrift) | E7, E8, E9a, E9b, E9c, U11 |
| 5.2.6 Import echte Word-Datei | E21, U7a, U7c |
| 5.2.7 Import echte LibreOffice-Datei | E22, U7d |
| 5.2.8 doppelte Rundreise mit allen Features | U11 |

**Abnahmekriterium (aus Anforderung übernommen, hier bindend):** vollständiges Verschwinden eines
Umbruchs, seine Umwandlung in einen Absatzumbruch (oder umgekehrt), oder Textverlust lässt die
gesamte Rundreise-Prüfung als nicht bestanden gelten — unabhängig vom Status der übrigen
Testfälle.

---

## 8. Abnahmekriterien / Exit-Kriterium für diesen Testplan

Der Testplan gilt als **erfüllt** (Voraussetzung für Freigabe nach `zeilenumbruch-manuell-req.md`
Abschnitt 7), wenn:

- [ ] Alle Unit-Testfälle U1–U11 grün (Vitest).
- [ ] Alle E2E-Testfälle E1–E25 grün unter **Desktop Chrome und Desktop Firefox** (Abschnitt 5).
- [ ] E9b (Blocker) grün — kein Bilddatenverlust bei Shift+Enter über eine Bild-`NodeSelection`.
- [ ] Grenzfall-Matrix (Abschnitt 6) vollständig, jede Zeile mit mindestens einem Test-Ergebnis
      belegt (grün, oder bewusst dokumentierte Abweichung wie bei Grenzfall 13).
- [ ] Rundreise-Matrix (Abschnitt 7) vollständig — Baseline **und** Feature-Rundreise.
- [ ] Neuer `selection-regression.spec.ts`-Testfall (Grenzfall 15) grün.
- [ ] `playwright.config.ts` enthält `'Desktop Firefox'`; bestehende Suite bleibt unter diesem
      neuen Projekt grün (oder neu auftretende Firefox-Fehlschläge sind separat gemeldet, siehe
      Abschnitt 2.1).
- [ ] Abschnitt 0.2 (Cross-Format-Einschränkung) ist im Testbericht **explizit als Einschränkung
      vermerkt**, nicht als vollständiges „E2E bestanden" dargestellt.
- [ ] Bekannte, akzeptierte Einschränkungen aus der Anforderung (keine visuelle ¶-Unterscheidung,
      Menüpunkt 6; `w:type=page/column`-Fehlklassifizierung, Grenzfall 13) sind im Testbericht
      verlinkt/übernommen, nicht stillschweigend ignoriert.

---

## 9. Bekannte Test-Limitationen (bewusst, zu dokumentieren, kein Blocker für sich allein)

1. **Keine echte Cross-Format-UI-Funktion** (Abschnitt 0.2) — Grenzfall 16/Anforderung 5.2.3
   kann nicht vollständig browsergetrieben getestet werden, weil die App keine
   „Konvertieren"/„Speichern unter anderem Format"-Funktion besitzt. Produktlücke, an PO zu
   melden (Abschnitt 10), nicht durch diesen Testplan zu beheben.
2. **Keine visuelle ¶-Unterscheidung im Editor** (Anforderung Menüpunkt 6) — Testfälle, die
   „ist das ein Zeilen- oder Absatzumbruch" beantworten müssen, tun dies ausschließlich über
   DOM-Struktur (`<p>`-/`<br>`-Anzahl) und Export-Byte-Inspektion, nicht über visuelle Prüfung
   eines Screenshots. Das ist die einzig verlässliche Methode, solange dieses Toggle fehlt —
   bewusst akzeptierte Einschränkung, keine Testlücke.
3. **`CellSelection` in Tabellen nicht separat gegen den Bild-Lösch-Bug abgesichert**
   (`zeilenumbruch-manuell-code.md` Abschnitt 3.4) — vorbestehende, nicht durch dieses Feature
   neu eingeführte Exposition bei `insertImage`/`insertTable` selbst; nicht Gegenstand dieses
   Testplans, aber als Beobachtungspunkt in E9a vermerkt (keine dedizierte `CellSelection`-
   Assertion in diesem Plan — falls gewünscht, als separates Ticket nachzuziehen).
4. **`bug65649.docx` (Massentest, Grenzfall 17) unter Vitest/jsdom bewusst übersprungen**
   (bestehendes `SKIP_SLOW_UNDER_JSDOM`-Set in `external-fixtures.test.ts`) — Performance-Aspekt
   wird stattdessen ausschließlich über E15 (echter Browser) geprüft, nicht doppelt in Unit
   erzwungen.

---

## 10. Offene Punkte / Risiken für PO und Dev vor Freigabe

1. **Architekturentscheidung muss vor E2E-Testlauf feststehen** (Abschnitt 2.4): läuft
   `insertHardBreak()` + `'Shift-Enter'`-Keymap bereits, oder wird noch auf dem nativen Fallback
   getestet? Falls Letzteres: E1 zuerst isoliert ausführen und Ergebnis vor Fortsetzung an
   Dev/Lead zurückmelden.
2. **E9b ist der wichtigste Einzeltest dieses Plans** — er deckt einen bereits vor Testbeginn
   nachgewiesenen, stillen Datenverlust-Bug ab (Bild verschwindet). Sollte er fehlschlagen, ist
   das kein Testfehler, sondern Bestätigung des in `zeilenumbruch-manuell-code.md` Abschnitt 0.7
   verifizierten Bugs — Freigabe-Blocker, bis der `NodeSelection`-Guard in `insertHardBreak()`
   umgesetzt ist.
3. **Cross-Format-Testabdeckung bleibt strukturell unvollständig auf E2E-Ebene** (Abschnitt 0.2/
   9.1) — an PO zu meldende Produktlücke (keine UI-Funktion für Formatwechsel), unabhängig vom
   Ausgang dieses Tickets.
4. **Firefox-Projekt ist Neuland für die gesamte Suite** (Abschnitt 2.1) — vor Beginn dieses
   Testplans einmal die **komplette bestehende** E2E-Suite unter dem neuen `'Desktop Firefox'`-
   Projekt laufen lassen und etwaige, mit `hard_break` nicht zusammenhängende Fehlschläge separat
   dokumentieren, damit sie nicht fälschlich diesem Feature zugerechnet werden.
5. **Undo-Gruppierungsverhalten (E12) hat keine feste Sollvorgabe** in der Anforderung — das
   tatsächlich beobachtete Verhalten ist zu dokumentieren und als Snapshot/Referenz für künftige
   Regressionsprüfung festzuhalten, nicht nachträglich als „Bug" zu werten, sofern es stabil und
   nicht datenverlustbehaftet ist.
