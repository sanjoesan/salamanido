# Testplan „Schriftart wählen" — QA-Verifikation

Gegenstück zu `specs/schriftart-waehlen-req.md` (Anforderung) und
`specs/schriftart-waehlen-code.md` (Umsetzungsplan). Dieses Dokument legt fest,
**welche Tests** geschrieben werden, **wo** sie liegen, **wie** sie ausgeführt
werden und **wann** ein Punkt als abgehakt gilt. Anders als bei
`kursiv-qa.md`/`unterstrichen-einfach-qa.md` handelt es sich hier um eine
**komplett neu zu bauende** Funktion (siehe `schriftart-waehlen-req.md` Zeilen
31–36, `schriftart-waehlen-code.md` Abschnitt 0) — dieser Plan verifiziert daher
sowohl den Bau selbst (Abschnitt 7 Punkt 1 der Anforderung) als auch jeden
Grenzfall/jede Rundreise, es gibt keinen Bestandscode, der nur „bestätigt"
werden müsste.

Der Plan ist in zwei Ebenen gegliedert, die sich gegenseitig ergänzen, aber
**keine ersetzen darf**:

1. **Unit-Tests** (Vitest, `jsdom`) für die Reader/Writer-Rundreise auf
   Daten-/XML-Ebene (DOCX **und** ODT) — schnell, präzise, aber blind
   gegenüber Toolbar/Combobox/Tastatur/echtem Datei-Dialog.
2. **Echte Playwright-Browser-Tests** — Klicks auf die tatsächliche
   Schriftart-Combobox, echtes Tippen/Filtern, echte Pfeiltasten-/Enter-/
   Escape-Bedienung, echter `setInputFiles()`-Upload, echter
   `page.waitForEvent('download')`-Export, Prüfung der **tatsächlich
   heruntergeladenen Datei** (nicht nur ein interner Funktionsaufruf von
   `readDocx`/`readOdt`/`writeDocx`/`writeOdt`).

Beide Ebenen sind laut Anforderung Abschnitt 7 Punkt 2 Pflicht — dort steht
wörtlich: „nicht nur Reader/Writer-Unit-Test mit direkt konstruierten
Testdaten". Ein Test, der nur `applyFontFamily(...)`/`readDocx(buffer)`/
`writeOdt(doc)` direkt aufruft, zählt **nicht** als Ebene 2, auch wenn er in
`tests/e2e/` liegt.

Referenzierte Fixtures (siehe `schriftart-waehlen-code.md` Abschnitt 12,
Existenz im Repo verifiziert): `tests/fixtures/external/docx/bug57031.docx`,
`bug59058.docx`, `drawing.docx`, `Bug54771a.docx`, `Bug54771b.docx`;
`tests/fixtures/external/odt/formen_Legende.odt`,
`FruitDepot-SeasonalFruits4.odt`, `compdocfileformat.odt`,
`excelfileformat.odt`, `character-styles.odt`.

---

## 0. Ausführung

| Ebene | Befehl | Neue/geänderte Dateien |
|---|---|---|
| Unit | `npm test` (`vitest run`) | siehe Abschnitt 1 |
| Browser/E2E | `npm run test:e2e` (`playwright test`) | siehe Abschnitt 2 |

Beide Suiten müssen grün sein, bevor `schriftart-waehlen` laut Anforderung
Abschnitt 7 als „vollständig verifiziert" gilt. Reihenfolge:

1. Implementierung gemäß `schriftart-waehlen-code.md` Abschnitte 4–9 (Schema,
   Commands, `fonts.ts`, Combobox, DOCX-/ODT-Reader/Writer).
2. Unit-Tests aus Abschnitt 1 dieses Plans schreiben und grün bekommen.
3. E2E-Tests aus Abschnitt 2 dieses Plans schreiben und grün bekommen.
4. Gemeinsamer Lauf beider Suiten gegen den fertigen Code, danach
   Abnahme-Checkliste (Abschnitt 4) abarbeiten.

---

## 0.1 Determinismus-Regeln für die E2E-Ebene (verbindlich, nicht optional)

Die Playwright-Tests dieses Plans laufen laut `playwright.config.ts` in **allen
projekten ohne `testMatch`-Filter**, d. h. `font-family.spec.ts` und die
Erweiterung von `selection-regression.spec.ts` werden je einmal unter **Desktop
Chrome**, **Mobile (Pixel 7)** und **Tablet (iPad Mini)** ausgeführt. Genau in
den nicht-Desktop-Projekten sind zuletzt mehrere Tests durch
Selektions-Sync-Races geflakt (siehe Git-Historie: „Fix flaky Mobile-project …:
same async-selection-sync race", „give async selection sync time before the
next keystroke"). Die folgenden Regeln sind deshalb **Teil der
Testspezifikation** — ein Test, der sie verletzt, gilt als nicht abgenommen,
auch wenn er auf Desktop Chrome zufällig grün ist.

**R1 — Selektions-Sync nach tastaturgetriebener Cursor-/Selektionsänderung
abwarten.** ProseMirror lernt eine native, tastaturgetriebene Caret-Beweg
(`ArrowLeft/Right/Up/Down`, `Home`, `End`, Klick-Neupositionierung) erst über
das **asynchrone** `selectionchange`-Event des Browsers. Eine unmittelbar
folgende `press()`/`type()` — die in Playwright ohne menschliche Reaktionszeit
feuert — kann diesem Nachziehen vorauslaufen und noch auf der alten Position
wirken. Nach jeder solchen Bewegung, die einer weiteren Tasteneingabe
vorausgeht, ist **`await page.waitForTimeout(50)`** einzufügen — exakt das
bereits in `tests/e2e/selection-regression.spec.ts` (Zeile 34, 72) etablierte
und dort ausführlich kommentierte Muster. Das betrifft in diesem Plan
insbesondere: §2.1 #3–#5 (Stored Mark → Cursorbewegung → Tippen; Enter →
Tippen), §2.9 Zeile 3.7 (Undo/Redo nach mehreren Tippschritten), §2.9 Zeile 3.8
(leeres Dokument → Schriftart → Tippen), §2.10 (Schnellwechsel-Stresstest).

**R2 — Keine Selektions-Sync-freien Schnellwiederholungen.** Ein `for`-Loop, der
`fill()` + `press('Enter')` auf derselben (evtl. veralteten) Selektion mehrfach
in Folge feuert, ist die klassische Race-Quelle. In jeder Iteration ist die
Selektion **frisch neu zu setzen** (z. B. erneutes `ControlOrMeta+a`) und nach
einem selektionsverändernden Schritt R1 anzuwenden. Assertions am Ende prüfen
nicht nur `toContainText`, sondern zusätzlich die **Absatz-/Knotenstruktur**
(`.ProseMirror p` → `toHaveCount(...)`), damit ein stiller Inhalts-/
Strukturverlust nicht durchrutscht (analog zu den bestehenden
`selection-regression`-Assertions).

**R3 — Nur web-first, automatisch wiederholende Assertions für Combobox-Zustand.**
Der Anzeigewert der Combobox stammt aus `getActiveFontFamily(view.state)` und
wird über den `forceRender`-Mechanismus der Toolbar **nach** der Transaktion neu
gerendert (React-async). Der Combobox-Zustand ist deshalb **ausschließlich** über
retrying Matcher zu prüfen — `await expect(fontInput(page)).toHaveValue('Georgia')`,
`await expect(fontInput(page)).toHaveJSProperty('placeholder', 'Gemischt')` bzw.
`toHaveAttribute('placeholder', 'Standard')`, `await expect(editorSpan).toHaveCSS(...)` —
**niemals** über ein synchrones `inputHandle.inputValue()`/`evaluate(...)`
unmittelbar nach der Aktion (das liest evtl. den Zustand vor dem Re-Render). Die
`fill(...)`/`.press('Enter')`-Eingabe selbst bleibt erlaubt; nur die **Prüfung**
muss retrying sein.

**R4 — Fokus-Rückkehr in den Editor vor Stored-Mark-Tippen bestätigen.** Die
Combobox ruft nach `commit()` `view.focus()` auf, während `setOpen(false)`/
`setQuery('')` React-async nachlaufen. Vor einem anschließenden
`keyboard.type(...)` (Stored-Mark-Fälle §2.1 #3, §2.9 Zeile 3.8) wird die
Fokus-Rückkehr über `await expect(editor).toBeFocused()` abgesichert, statt
blind sofort zu tippen.

**R5 — Vor jedem Re-Import zurück zum Datei-Picker navigieren.** Der
`input[type="file"]` existiert **nur** auf dem Auswahl-Bildschirm, nicht im
geöffneten `DocumentWorkspace`. Jeder Rundreise-Test (§2.12) klickt vor dem
zweiten `setInputFiles(...)` erst
`await page.getByRole('button', { name: /formate/i }).click()` (Button „←
Formate", verifiziert in `DocumentWorkspace.tsx` Zeile 113) — sonst schlägt das
Re-Import-`setInputFiles` fehl. Genau dieses Muster nutzt bereits `docx.spec.ts`
(Zeile 241/331).

**R6 — Konkretes Dirty-Signal.** Der einzige UI-Ausdruck von `dirty` ist der
amberfarbene Text **„● ungespeichert"** (`DocumentWorkspace.tsx` Zeile 118–120),
der nur bei `document.dirty === true` gerendert wird. „Kein unnötiges
Dirty-Flag" (§2.12 #5, Kriterium 7) wird deshalb als
`await expect(page.getByText('ungespeichert')).toHaveCount(0)` geprüft —
**unmittelbar nach dem Upload und vor jeder Editor-Interaktion** (jede
Tastatur-/Klickaktion im Editor setzt `dirty` über `onChange` bewusst auf
`true`, und ein Export setzt es wieder auf `false`, `DocumentWorkspace.tsx`
Zeile 84 — die Prüfung muss also vor beidem liegen).

**R7 — Klick auf Options-Einträge statt Tastatur, wo Tastatur nicht Prüfgegenstand
ist.** Optionsklicks sind durch `onMouseDown`+`preventDefault()` (unterdrückt den
Input-Blur) deterministisch; `getByRole('option', { name: '…' }).click()` wartet
web-first auf Sichtbarkeit/Aktionierbarkeit. Reine Tastaturpfade (Pfeile/Enter/
Escape/Tab) werden separat und gezielt in §2.4/§2.8 #2 geprüft, nicht implizit in
jedem anderen Test mitgetestet.

**R8 — Combobox-Locator eindeutig halten (`{ exact: true }`), sonst Strict-Mode-Bruch.**
Die Combobox-Eingabe trägt `aria-label="Schriftart"`, der Entfernen-Button
`aria-label="Schriftart entfernen"` (`schriftart-waehlen-code.md` Abschnitt 7.1, 0.2
Punkt 4). Playwrights `getByLabel('Schriftart')` matcht per Teilstring-Default **beide**
Elemente — jede Aktion darauf (`.fill`/`.press`/`.click`/`expect`) scheitert dann sofort
mit einem Strict-Mode-Verstoß, **auch auf Desktop Chrome** (das ist kein Flake, sondern
ein harter, sofort reproduzierbarer Fehler). Das Eingabefeld wird deshalb **ausnahmslos**
über `page.getByLabel('Schriftart', { exact: true })` (Helfer `fontInput`, §2.0)
adressiert, der Entfernen-Button über `getByRole('button', { name: 'Schriftart
entfernen' })` (Helfer `fontRemoveButton`, §2.0). Diese Regel gilt in **jeder**
E2E-Datei dieses Plans, einschließlich der Schnellwechsel-Erweiterung von
`selection-regression.spec.ts` (§2.10) — dort wurde `{ exact: true }` in einer früheren
Fassung versehentlich weggelassen; der korrigierte Snippet unten führt es wieder.

---

## 1. Unit-Tests: Reader/Writer-Rundreise (DOCX + ODT)

Ziel: jede Reader-/Writer-Behauptung aus `schriftart-waehlen-code.md`
Abschnitte 8/9 sowie die XML-nahen Grenzfälle aus Anforderung Abschnitt 3
(3.2, 3.3, 3.13, 3.14) auf Daten-/XML-Ebene isoliert, deterministisch und ohne
Browser nachweisen. Diese Ebene prüft **Funktionen direkt**
(`readDocx`/`writeDocx`, `readOdt`/`writeOdt`, `cssFontFamily` u. a.) — das ist
hier ausdrücklich erlaubt und richtig, weil sie durch die Playwright-Ebene (2)
ergänzt wird, nicht ersetzt.

### 1.1 Neu: `src/formats/shared/editor/__tests__/fonts.test.ts`

| # | Testfall | Erwartung | Deckt |
|---|---|---|---|
| 1 | `cssFontFamily('Arial')` | `Arial, sans-serif` (keine Quotierung nötig) | 2.6/2.7 |
| 2 | `cssFontFamily('Times New Roman')` | `"Times New Roman", serif` (korrekt gequotet) | 2.7, Grenzfall 3.2 |
| 3 | `cssFontFamily('Müller Sans')` | `"Müller Sans", sans-serif`, Umlaut unverändert, keine Transliteration | 2.7, Grenzfall 3.3 |
| 4 | `cssFontFamily('Courier New')` / `'Consolas'` / `'Liberation Mono'` | jeweils `monospace`-Fallback | 2.6 |
| 5 | `cssFontFamily('Georgia')` / `'Cambria'` / `'Liberation Serif'` | jeweils `serif`-Fallback | 2.6 |
| 6 | `cssFontFamily('Verdana')` / unbekannter exotischer Name | `sans-serif`-Fallback (Default) | 2.6, Grenzfall 3.10 |
| 7 | `parseFirstFontFamily(cssFontFamily(x)) === x` für jeden `CURATED_FONTS`-Eintrag plus `'Müller Sans'` | rundreisefest (Hin- und Rückrichtung CSS ↔ Name) | 2.7, Grenzfall 3.2/3.3 |
| 8 | `usedFontFamilies(doc)` auf leerem Dokument | `[]` | 1 Zeile 4 |
| 9 | `usedFontFamilies(doc)` mit zwei Läufen derselben Schriftart | ein Eintrag (dedupliziert) | 1 Zeile 4 |
| 10 | `usedFontFamilies(doc)` mit zwei unterschiedlichen Schriftarten | beide Einträge, sortiert | 1 Zeile 4, Grenzfall 3.5 |
| 11 | `getSystemFonts()` mit gemocktem `window.queryLocalFonts` → Erfolg | deduplizierte, sortierte Namen | 1 Zeile 3 |
| 12 | `getSystemFonts()` ohne `window.queryLocalFonts` (API fehlt) | `[]`, kein Reject/Throw | Grenzfall 3.12 |
| 13 | `getSystemFonts()` mit `queryLocalFonts`, das rejected/wirft | `[]`, kein Reject nach außen, keine Exception verlässt die Funktion | Grenzfall 3.12 |
| 14 | Zwei aufeinanderfolgende `getSystemFonts()`-Aufrufe im selben „Tab" | `queryLocalFonts` wird nur **einmal** aufgerufen (Spy-Zähler) | Grenzfall 4.5 (Caching) |
| 15 | `__resetSystemFontsCacheForTests()` zwischen den `it()`-Blöcken | Cache/In-Flight-Promise wird zurückgesetzt, Tests beeinflussen sich nicht gegenseitig | Testinfrastruktur |

### 1.2 Neu: `src/formats/shared/editor/__tests__/commands.test.ts`

Reiner Zustands-Unit-Test (kein DOM, kein Browser) für `applyFontFamily`,
`clearFontFamily`, `getActiveFontFamily` — **ergänzt**, ersetzt aber nicht die
Browser-Bestätigung derselben Fälle in Abschnitt 2 dieses Plans, da erst
Ebene 2 beweist, dass die tatsächlich im Browser gerenderte Combobox sich
entsprechend verhält.

| # | Testfall | Erwartung | Deckt |
|---|---|---|---|
| 1 | `applyFontFamily('Arial')` auf einer Selektion `[from, to)` | Mark exakt auf diesem Bereich gesetzt, Text davor/danach ohne Mark | 2.1 |
| 2 | `applyFontFamily('Arial')` bei leerer Selektion (Cursor) | `storedMarks` enthält die Mark (Stored-Mark, **nicht** `false`/No-Op wie bei `applyMarkColor`) | 2.2, ausdrücklich abweichendes Verhalten laut Code-Plan Abschnitt 0/5 |
| 3 | `clearFontFamily()` auf formatierter Selektion | Mark entfernt, sonstige Marks (Fett etc.) unverändert | 1 Zeile 9 |
| 4 | `clearFontFamily()` bei leerer Selektion nach vorherigem `applyFontFamily` an der Schreibmarke | `storedMarks` ohne `fontFamily`-Mark | 2.2 |
| 5 | `applyFontFamily('Arial')` zweimal hintereinander auf denselben Bereich | Ergebnis identisch nach dem zweiten Aufruf, keine doppelte/verschachtelte Mark | Grenzfall 3.9 (hier isoliert auf Transform-Ebene, zusätzlich zum E2E-Nachweis) |
| 6 | `getActiveFontFamily(state)` bei Cursor in Text mit einheitlicher Schriftart | `{ family: 'Arial', mixed: false }` | 2.3 |
| 7 | `getActiveFontFamily(state)` bei Selektion über zwei unterschiedliche Schriftarten | `{ family: null, mixed: true }` | Grenzfall 3.1 |
| 8 | `getActiveFontFamily(state)` bei Text ganz ohne `fontFamily`-Mark | `{ family: null, mixed: false }` (nicht `mixed: true`) | 2.3 |
| 9 | `getActiveFontFamily(state)` bei Selektion über Schriftart-Text **und** schriftartlosen Text | `{ family: null, mixed: true }` (Basis-Fehlen zählt als abweichender Wert) | 1 Zeile 8 |
| 10 | Kombination: `applyFontFamily` + vorhandene `strong`-Mark auf demselben Lauf | beide Marks gleichzeitig vorhanden, keine gegenseitige Verdrängung | 2.5 |
| 11 | Reihenfolge „erst Fett dann Schriftart" vs. „erst Schriftart dann Fett" | identisches Mark-Set am Ende (Rang-Reihenfolge durch `Mark.addToSet`, siehe Code-Plan Abschnitt 4) | 2.5 |

### 1.3 Neu: `src/formats/docx/__tests__/font-family.test.ts`

Reader-/Writer-Tests, je über eine minimal per JSZip gebaute `.docx`-Datei
(Muster: `buildSampleDocx()`/`buildDocxWithRunAndStyles()` analog zu
bestehenden E2E-/Unit-Konventionen) und `readDocx(blob)`/`writeDocx(doc)`.

| # | Testfall | Eingabe | Erwartung | Deckt |
|---|---|---|---|---|
| 1 | `w:ascii` vorhanden | `<w:rFonts w:ascii="Georgia"/>` in `w:rPr` | `fontFamily`-Mark mit `family: 'Georgia'` | 2.8 Basisfall |
| 2 | Nur `w:hAnsi` (kein `w:ascii`) | `<w:rFonts w:hAnsi="Calibri"/>` | Mark mit `family: 'Calibri'` (Fallback greift) | 2.8 |
| 3 | Nur `w:eastAsia` (kein `w:ascii`/`w:hAnsi`) | `<w:rFonts w:eastAsia="MS Mincho"/>` | **keine** `fontFamily`-Mark, kein Absturz, kein leeres Attribut | Grenzfall 3.14 |
| 4 | Reale Fixture `bug57031.docx`, Lauf mit `<w:rFonts w:eastAsia="Times New Roman"/>` ohne `w:ascii`/`w:hAnsi` | Import der echten Datei | betroffener Lauf ohne `fontFamily`-Mark, restliches Dokument liest sich weiterhin fehlerfrei ein | Grenzfall 3.14, echte Belegdatei statt synthetisch |
| 5 | Reale Fixture `bug57031.docx`, Läufe mit `w:ascii="Times New Roman"`/`"Arial"`/`"Cambria Math"`/`"Courier New"` | Import | jeweils passende `fontFamily`-Mark, korrekt dem jeweiligen Lauf zugeordnet | Rundreise-Kriterium 1, gemischte Schriftarten in einer Datei |
| 6 | Schreiben: `applyFontFamily('Times New Roman')` auf Text, dann `writeDocx` | — | `<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman" w:eastAsia="Times New Roman"/>` — alle vier Attribute identisch | 2.8 |
| 7 | Schreiben: Name mit Anführungszeichen/Et-Zeichen (`Foo & "Bar"`) | — | XML-Attributwert korrekt escaped (`&amp;`, `&quot;`), beim Re-Import exakt derselbe Name | 2.7, Grenzfall 3.3 |
| 8 | Kombination `fontFamily` + `strong` + `textColor` auf demselben Lauf | — | alle drei `w:rPr`-Kindelemente (`w:rFonts`, `w:b`, `w:color`) im selben `<w:r>` vorhanden | 2.5, Rundreise-Kriterium 3 |
| 9 | Reale Fixture `bug59058.docx` (`w:ascii="MinionPro-bold"` u. Ä., nicht kuratiert) | Import → unveränderter Export | Name exakt erhalten, keine Ersetzung durch kuratierte/Standard-Schriftart | Grenzfall 3.5, Rundreise-Kriterium 5 |
| 10 | Reale Fixture `Bug54771a.docx`/`Bug54771b.docx` (nur `w:asciiTheme` etc., kein literales `w:ascii`) | Import | kein Crash, **keine** `fontFamily`-Mark (dokumentierte Nicht-Abdeckung, siehe Code-Plan Abschnitt 13.1) | Robustheit, bewusst dokumentierte Einschränkung |

### 1.4 Neu: `src/formats/odt/__tests__/font-family.test.ts`

Analog für ODT, über `buildOdt(automaticStylesXml, fontFaceDeclsXml,
spanMarkup)` (handgebaute Minimal-ODT, unabhängig vom eigenen Writer) und
`readOdt(blob)`/`writeOdt(doc)`.

| # | Testfall | Eingabe | Erwartung | Deckt |
|---|---|---|---|---|
| 1 | `style:font-name` + passender `office:font-face-decls`-Eintrag | `text:span text:style-name="T1"`, `T1` mit `style:font-name="Arial1"`, `office:font-face-decls` mit `style:name="Arial1" svg:font-family="Arial"` | `fontFamily`-Mark mit `family: 'Arial'` (aufgelöst, **nicht** der rohe Deklarationsname) | 2.9 Basisfall |
| 2 | `style:font-name` **ohne** passenden `font-face-decls`-Eintrag (handgebaute Minimal-Datei, da kein Korpus-Fixture diesen Fall zeigt — siehe Code-Plan Abschnitt 12.2) | — | Fallback auf rohen `style:font-name`-Wert als Anzeigename, kein Absturz | Grenzfall 3.13 |
| 3 | Mehrteiliger Name einfach gequotet: `svg:font-family="'Times New Roman'"` | — | korrekt entquotet zu `Times New Roman` | Grenzfall 3.2 |
| 4 | Reale Fixture `FruitDepot-SeasonalFruits4.odt`: `style:name="Arial1"` **und** `"Arial2"`, beide `svg:font-family="Arial"` | Import | beide zugehörigen Läufe lösen auf `family: 'Arial'` auf — der konkrete Beweis, dass Auflösung über `office:font-face-decls` nötig ist, nicht direktes Verwenden von `style:font-name` | 2.9, Code-Plan Abschnitt 11.1 |
| 5 | Dieselbe Fixture: einfach gequotete Mehrwort-/Nicht-Latein-Namen (`'Open Sans Light'`, `'ヒラギノ角ゴ Pro W3'`) | Import | beide Namen exakt (inkl. Nicht-Latein-Zeichen) übernommen, keine Transliteration | Grenzfall 3.3 |
| 6 | Reale Fixture `formen_Legende.odt` (`Verdana`, `Times New Roman`, direkter `font-face-decls`-Eintrag) | Import | beide Schriftarten korrekt den jeweiligen Läufen zugeordnet | Rundreise-Kriterium 1/2, Testdaten-Anforderung Abschnitt 6 |
| 7 | Reale Fixture `compdocfileformat.odt`/`excelfileformat.odt` (exotische Namen wie `Thorndale1`, `StarSymbol`) | Import → unveränderter Export | Name exakt erhalten, keine Ersetzung | Grenzfall 3.5 |
| 8 | Schreiben: `applyFontFamily('Arial')` auf Text, dann `writeOdt` | — | sowohl `style:font-name="Arial"` am Textstil **als auch** `<style:font-face style:name="Arial" svg:font-family="Arial"/>` in `office:font-face-decls` vorhanden | 2.9, Defekt-Kriterium wörtlich aus der Anforderung |
| 9 | Zwei Textläufe mit derselben Schriftart, aber unterschiedlichem Fett-Status | — | zwei verschiedene `T`-Textstile, aber **ein** `style:font-face`-Eintrag (Dedup) | 2.9 Absatz 2 |
| 10 | Schreiben: Name mit Leerzeichen/Umlaut (`Müller Sans`) | — | `style:font-name` und `svg:font-family` korrekt escaped/gequotet, beim Re-Import exakt derselbe Name | 2.7, Grenzfall 3.3 |
| 11 | `RunProps`-Dedup-Key (`TextStyleRegistry.styleNameFor`) mit unterschiedlicher Objekt-Insertionsreihenfolge, aber gleichen Werten inkl. `fontFamily` | derselbe kanonische Key, kein doppelter `T`-Stil (Härtung aus Code-Plan Abschnitt 2.1/9.2) | Robustheit |

### 1.4a Erweiterung: beide `roundtrip.test.ts`

- Neuer Testfall „preserves font family" analog zu den bestehenden
  Bold/Italic/Underline-Fällen, inkl. eines Namens mit Leerzeichen
  (Grenzfall 3.2) und eines mit Umlaut (Grenzfall 3.3).
- Neuer Testfall „preserves font family combined with bold, color and
  highlight on the same run" (Rundreise-Kriterium 3).
- ODT: neuer Testfall „does not duplicate style:font-face when the same font
  is used in differently-formatted runs" (siehe 1.4 #9).
- Testkonvention (siehe `schriftart-waehlen-code.md` Abschnitt 2.1/11.1): in
  handgeschriebenen `marks: […]`-Arrays wird `fontFamily` **zuletzt** notiert
  (`strong, em, underline, strike, textColor, highlight, fontFamily`), damit
  `inlineToRuns`s ordnungssensitiver Lauf-Vergleich nicht durch zufällig
  unterschiedliche Testautor-Reihenfolge zwei eigentlich identische Läufe
  fälschlich als unterschiedlich behandelt.

### 1.5 Nicht-blockierende Grenzfälle in Ebene 1

Grenzfall 3.4 (Performance großer Listen) und 3.12 (API-Feature-Detection)
sind bereits in 1.1 #6/#11–14 abgedeckt; ein harter Performance-Benchmark ist
laut Code-Plan Abschnitt 15 bewusst kein automatisierter Test (manuelle
QA-Notiz, siehe Abschnitt 2.11 dieses Plans), da `MAX_RENDERED_OPTIONS`
bereits eine deterministische Obergrenze für die gerenderten DOM-Knoten
erzwingt.

---

## 2. Echte Playwright-Browser-Tests

**Grundregel dieser Ebene:** Jeder Test bedient die Anwendung ausschließlich
so, wie eine Person es täte — `page.getByLabel('Schriftart', { exact: true }).fill(...)`/
`.press(...)` (zum `{ exact: true }` siehe Regel R8),
`page.getByRole('option', { name: ... }).click()`,
`input.setInputFiles(...)` für Uploads, `page.waitForEvent('download')` +
Lesen der heruntergeladenen Datei vom Datenträger für Exporte. **Kein Test in
diesem Abschnitt darf** `readDocx`/`writeDocx`/`readOdt`/`writeOdt`/
`applyFontFamily`/`clearFontFamily`/`getActiveFontFamily` direkt importieren
oder aufrufen — das wäre Ebene 1, nicht Ebene 2. Wo eine Datei hochgeladen
werden muss, wird sie unabhängig vom Reader/Writer dieses Projekts per JSZip
von Hand gebaut (Muster `buildSampleDocx()`/`buildSampleOdt()` aus
`tests/e2e/docx.spec.ts`/`odt.spec.ts`) — das stellt sicher, dass ein
Rundreise-Test nicht zufällig nur beweist, dass Writer und Reader sich
gegenseitig kompensieren.

### 2.0 Neue Datei: `tests/e2e/font-family.spec.ts`

Locator-Helfer identisch zu den bestehenden Dateien:

```ts
function docxCard(page: Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })
}
function odtCard(page: Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'OpenDocument Text (.odt)' }) })
}
function fontInput(page: Page) {
  // `{ exact: true }` ist PFLICHT (siehe schriftart-waehlen-code.md Abschnitt 0.2 Punkt 4):
  // der Entfernen-Button trägt aria-label="Schriftart entfernen"; ohne `exact` matcht der
  // Teilstring-Default von getByLabel BEIDE Elemente (Eingabefeld + Button) → Playwright-
  // Strict-Mode-Verstoß, der jede Combobox-Aktion (.fill/.press/.click/expect) sofort
  // scheitern lässt. Siehe verbindliche Regel R8 in Abschnitt 0.1.
  return page.getByLabel('Schriftart', { exact: true })
}
function fontRemoveButton(page: Page) {
  // Der Entfernen-Button wird umgekehrt gezielt über seinen vollständigen, eindeutigen
  // Namen adressiert (enthält "Schriftart" nur als Teilstring des längeren Labels).
  return page.getByRole('button', { name: 'Schriftart entfernen' })
}
```

`beforeEach`: `page.goto('/')` → Privacy-Banner „Verstanden" wegklicken → je
nach Testfall `odtCard`/`docxCard` „Neu erstellen" klicken (analog zu
`selection-regression.spec.ts`).

### 2.1 Anwenden auf Selektion und Schreibmarke (Anforderung 2.1/2.2)

| # | Testfall | Schritte (echte Bedienung) | Assertion |
|---|---|---|---|
| 1 | Selektion + Combobox-Auswahl setzt Mark exakt auf Selektion | `editor.click()` → `keyboard.type('Vorher MITTE nachher')` → nur „MITTE" per `keyboard.press('Shift+ArrowLeft')`-Sequenz oder Doppelklick selektieren → `fontInput(page).click()` → `page.getByRole('option', { name: 'Georgia' }).click()` | nur der Textknoten „MITTE" trägt `style="font-family: ...Georgia..."`; „Vorher"/„nachher" bleiben ohne diesen Style |
| 2 | Freitext-Eintippen + Enter übernimmt Schriftart (ohne Listenklick) | Text markieren → `fontInput(page).fill('Verdana')` → `fontInput(page).press('Enter')` | markierter Text trägt `font-family` mit „Verdana" |
| 3 | Schriftart an leerer Schreibmarke wirkt nur auf neu getippten Text (Stored Mark) | Cursor mitten in bestehendem Text positionieren (kein Shift) → Schriftart über Combobox setzen → `keyboard.type('NEU')` | „NEU" trägt die Schriftart, unmittelbar angrenzender Alt-Text nicht |
| 4 | Stored Mark verschwindet nach Cursorbewegung an andere Stelle | Fortsetzung von #3: `keyboard.press('ArrowLeft')` mehrfach an eine andere, unformatierte Stelle, dann tippen | neu getippter Text an der neuen Stelle trägt **nicht** die zuvor gesetzte Schriftart |
| 5 | Enter-Verhalten nach Schriftart an der Schreibmarke ist dokumentiert und konsistent mit Fett | Schriftart an Schreibmarke setzen, `keyboard.press('Enter')`, tippen; paralleler Vergleichstest: Fett an Schreibmarke setzen, Enter, tippen | Ergebnis (Übernahme in neuen Absatz oder Rückfall) ist für Schriftart und Fett **identisch** — kein Sonderfall nur für Schriftart (Anforderung 2.2 Absatz 3) |
| 6 | Text außerhalb der Selektion bleibt unverändert | wie #1 | „Vorher"/„nachher" behalten exakt ihren vorherigen DOM-Zustand (kein zusätzliches `<span>`) |

**Determinismus (R1/R3/R4):** In #3/#4 wird die Schriftart per Combobox gesetzt
(`commit()` → `view.focus()`), danach **`await expect(editor).toBeFocused()`**
(R4), erst dann `keyboard.type('NEU')`. Die anschließende Cursorbewegung in #4
(`ArrowLeft`) ist eine tastaturgetriebene Selektionsänderung → **danach
`await page.waitForTimeout(50)` vor dem nächsten Tippen** (R1). In #5 folgt
`Enter` unmittelbar auf das Setzen der Stored Mark; der Vergleichszweig
(Fett-Stored-Mark) muss dieselbe Warte-/Ablauf-Struktur verwenden, sonst
vergleicht der Test zwei unterschiedlich getaktete Abläufe. Die Assertion, dass
„NEU" die Schriftart trägt, ist eine web-first Locator-Assertion
(`expect(page.locator('.ProseMirror span[style*="font-family"]', { hasText: 'NEU' })).toHaveCount(1)`),
kein synchrones DOM-Auslesen (R3).

### 2.2 Anzeige der aktiven Schriftart (Anforderung 2.3, Grenzfall 3.1)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Cursor in bereits formatiertem Text (nach Upload) → Combobox zeigt korrekten Wert | per JSZip gebaute DOCX mit `w:ascii="Georgia"` in einem Lauf hochladen → Cursor per Klick in diesen Textlauf setzen | `fontInput(page)` hat Wert `Georgia` |
| 2 | Wert aktualisiert sich bei Cursorbewegung zwischen unterschiedlich formatierten Läufen | zwei Läufe mit unterschiedlicher Schriftart in derselben hochgeladenen Datei, Cursor nacheinander in beide setzen | Combobox-Wert wechselt korrekt mit, ohne Neuladen |
| 3 | Text ohne explizite Mark zeigt Platzhalter „Standard", kein leerer/verwirrender Zustand | Cursor in unformatierten Text | `fontInput(page)` hat leeren Wert, `placeholder` ist „Standard" |
| 4 | Selektion über zwei unterschiedliche Schriftarten → „Gemischt" | beide Läufe aus #2 gemeinsam markieren | `fontInput(page)` hat leeren Wert, `placeholder` ist „Gemischt" (Grenzfall 3.1, Anforderung 1 Zeile 8) |
| 5 | Anwenden einer neuen Schriftart auf die „gemischte" Selektion vereinheitlicht | Fortsetzung von #4: Schriftart „Tahoma" auswählen | beide vormals unterschiedlichen Läufe tragen jetzt einheitlich „Tahoma" |

**Determinismus (R1/R3):** Der Cursor wird per **Klick** in den Ziellauf gesetzt
(deterministisch positioniert), nicht per Pfeiltasten-Zählung. Klick-Neupositio
nierung ist ebenfalls eine asynchrone Selektionsänderung → der Combobox-Wert
wird **nur** über retrying Matcher geprüft:
`await expect(fontInput(page)).toHaveValue('Georgia')` (#1),
`await expect(fontInput(page)).toHaveAttribute('placeholder', 'Standard')` bei
markenlosem Text (#3),
`await expect(fontInput(page)).toHaveAttribute('placeholder', 'Gemischt')` bei
gemischter Selektion (#4). Da diese Matcher automatisch wiederholen, wird das
async `forceRender` der Toolbar korrekt abgewartet — kein manuelles Sleep nötig,
aber auch **kein** synchrones `inputValue()` erlaubt (R3). Für #4 wird die
Mehrlauf-Selektion deterministisch per `ControlOrMeta+a` (ganzes Dokument mit
zwei verschieden formatierten Läufen) oder per klar definiertem
Shift+Klick-Bereich erzeugt.

### 2.3 Live-Rendering im Editor (Anforderung 2.6)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Editor-DOM enthält tatsächlich `font-family` nach Anwenden | Text markieren, Schriftart „Georgia" anwenden | `locator.evaluate(el => getComputedStyle(el).fontFamily)` enthält „Georgia" (nicht nur Datenmodell-Änderung ohne sichtbaren Effekt — Anforderung 2.6 nennt das explizit einen Defekt) |
| 2 | Generischer CSS-Fallback vorhanden | Schriftart „Times New Roman" anwenden | `style`-Attribut des Text-`<span>` enthält sowohl `"Times New Roman"` als auch `serif` als Fallback |
| 3 | Nicht installierte/exotische Schriftart bleibt lesbar | Freitext „Absichtlich Erfundene Schrift XYZ" anwenden | Text bleibt sichtbar (kein leerer/kollabierter Textknoten), `font-family`-Deklaration enthält einen generischen Fallback |

### 2.4 Such-/Filterfunktion und Tastaturbedienung (Anforderung 1 Zeile 6/7, Grenzfall 3.10/3.11)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Tippen filtert die Liste live, case-insensitive | Combobox fokussieren, `fontInput(page).fill('cour')` | nur Einträge, die „Cour" enthalten (z. B. „Courier New"), sichtbar; Groß-/Kleinschreibung der Eingabe spielt keine Rolle |
| 2 | Kein Treffer → sichtbarer Hinweis | `fontInput(page).fill('zzzznichtvorhanden')` | Liste zeigt Text „Keine Schriftart gefunden" |
| 3 | Freitext-Übernahme bleibt trotz fehlendem Treffer möglich | Fortsetzung von #2: `fontInput(page).press('Enter')` | Schriftart „zzzznichtvorhanden" wird auf die Selektion angewendet (Grenzfall 3.10/3.11) |
| 4 | Pfeiltasten navigieren die gefilterte Liste | Combobox öffnen, `keyboard.press('ArrowDown')` zweimal | zweiter Eintrag ist optisch/`aria-selected` als markiert erkennbar |
| 5 | Enter übernimmt den markierten Eintrag | Fortsetzung von #4: `keyboard.press('Enter')` | markierte Schriftart wird angewendet, nicht der zuerst getippte Text |
| 6 | Escape schließt die Liste ohne Änderung, alter Wert bleibt | Combobox öffnen, tippen, `keyboard.press('Escape')` | Liste geschlossen, Dokument-Formatierung unverändert, Anzeigewert zeigt wieder die zuvor aktive Schriftart |
| 7 | Tab erreicht die Combobox (reine Tastaturbedienung, kein Maus-only-Weg) | von einem bekannten Startpunkt (das Absatzformat-`<select>` per Klick fokussieren, dann eine definierte Anzahl `keyboard.press('Tab')` — die Combobox folgt in der Tab-Reihenfolge direkt danach, siehe Anforderung 4.8/1 Zeile 1) | Fokus landet auf der Schriftart-Combobox, bestätigt durch die web-first Assertion `await expect(fontInput(page)).toBeFocused()` (retrying, kein synchrones `document.activeElement`-Lesen) |

### 2.5 Live-Vorschau je Listeneintrag (Anforderung 1 Zeile 5)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Jeder Listeneintrag wird in eigener Schriftart gerendert | Combobox öffnen | `page.getByRole('option', { name: 'Georgia' })` hat `style` mit `font-family` enthaltend „Georgia" |
| 2 | Nicht verfügbare Schriftart im Listeneintrag verursacht keinen Absturz/leeren Eintrag | Liste öffnen (enthält u. U. „Comic Sans MS", je nach Testsystem nicht installiert) | Eintrag ist weiterhin sichtbar und klickbar, kein leerer/kaputter Text |

### 2.6 „Im Dokument verwendet" (Anforderung 1 Zeile 4, Grenzfall 3.5)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Fremd-Schriftart aus Upload erscheint als eigener Eintrag | per JSZip gebaute DOCX mit `w:ascii="MinionPro-Regular"` (nicht kuratiert) hochladen, Combobox öffnen | `page.getByRole('option', { name: 'MinionPro-Regular' })` sichtbar |
| 2 | Fremd-Schriftart verschwindet nicht bei unverändertem Re-Export | Fortsetzung von #1: sofort exportieren, Export-Datei prüfen (siehe Abschnitt 2.9) | Name im Export exakt erhalten, nicht durch Listen-/Standardschriftart ersetzt |

### 2.7 Kombination mit anderen Zeichenformaten (Anforderung 2.5)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Schriftart + Fett + Kursiv + Farbe + Hervorhebung gleichzeitig | Text markieren, nacheinander Schriftart „Georgia", `getByTitle('Fett')`, `getByTitle('Kursiv')`, Schriftfarbe, Hervorhebungsfarbe anwenden | Text trägt alle fünf Formatierungen gleichzeitig (DOM-Inspektion: `font-family`, `strong`/`em`-Verschachtelung, Farb-Styles) |
| 2 | Reihenfolge der Anwendung ist irrelevant | Test A: erst Fett dann Schriftart; Test B: erst Schriftart dann Fett | beide Tests liefern denselben resultierenden formatierten Zustand |

### 2.8 UI-Robustheit (Anforderung Abschnitt 4)

| # | Testfall | Schritte | Assertion | Grenzfall |
|---|---|---|---|---|
| 1 | Nur eine Dropdown-Liste gleichzeitig offen | Absatzformat-Dropdown öffnen, dann Klick in Schriftart-Combobox | Absatzformat-Liste ist geschlossen/nicht mehr sichtbar, Schriftart-Liste offen, keine Überlappung | 4.1 |
| 2 | Vollständige Tastaturbedienung ohne Maus | Tab zur Combobox, Pfeiltasten, Enter, Escape (siehe 2.4) — kein `click()` auf die Liste selbst in diesem Testfall | Auswahl funktioniert vollständig ohne Mausereignis | 4.2 |
| 3 | Öffnen der Liste zerstört Editor-Selektion nicht vor Bestätigung | Text markieren, Combobox öffnen (fokussieren), **ohne** Auswahl zu bestätigen `await page.waitForTimeout(50)`, dann `keyboard.press('Escape')` | ursprüngliche Selektion/Formatierung im Dokument ist unverändert (Gegenprobe: unmittelbar danach dieselbe Formatierungsaktion auf der noch stehenden Selektion greift auf denselben Bereich); kein Selection-Sync-Fehler analog zu `selection-regression.spec.ts` | 4.3 |
| 4 | Blur durch Klick außerhalb ohne Auswahl → keine Änderung | Combobox öffnen, Text in Eingabefeld tippen, dann irgendwo außerhalb (z. B. auf den Editor) klicken, ohne Enter/Options-Klick | Dokument unverändert, Anzeigewert kehrt zur zuvor aktiven Schriftart zurück | 4.4 |
| 5 | Wiederholtes schnelles Öffnen/Schließen verursacht keinen doppelten Berechtigungsdialog/kein Speicherleck | Combobox zehnmal hintereinander schnell fokussieren/blurren (`for`-Schleife mit `focus()`/`blur()` via Tastatur-Tab) | Anwendung bleibt reaktionsfähig, keine Konsolen-Fehler (`page.on('console')`/`page.on('pageerror')`-Assertion: keine Errors) | 4.5 |

### 2.9 Grenzfälle aus Anforderung Abschnitt 3

| # | Grenzfall | Testfall | Schritte | Assertion |
|---|---|---|---|---|
| 3.6 | Struktur (Tabelle/Liste/Überschrift) | Schriftart in Tabellenzelle, Listenpunkt, Überschrift | Tabelle einfügen (`getByRole('button', { name: 'Tabelle einfügen' })`) → Text in Zelle, Liste, Überschrift jeweils markieren → Schriftart anwenden | jeweils korrekt angewendet, keine strukturellen Sonderfälle/Abstürze |
| 3.6 (Kopf-/Fußzeile) | Struktur (Kopf-/Fußzeile) | **kein interaktiver E2E-Test** — Kopf-/Fußzeile ist laut Code-Plan Abschnitt 13.2 aktuell nicht editierbar; stattdessen Reader/Writer-Test: Fixture mit Schriftart in Kopf-/Fußzeile importieren → unverändert exportieren → Mark im `header`/`footer`-Teil erhalten (siehe Abschnitt 1.3/1.4 dieses Plans) | — | dokumentierte Abgrenzung, kein stiller Fehlschlag |
| 3.7 | Undo/Redo | Schriftart anwenden, mehrere Tippschritte danach, dann Undo/Redo | Schriftart setzen → `keyboard.type('weiterer Text')` mehrfach → `keyboard.press('ControlOrMeta+z')` mehrfach | Strg+Z macht die Schriftartänderung vollständig rückgängig, Strg+Y/Strg+Shift+Z stellt sie wieder her |
| 3.8 | Leeres Dokument | Schriftart an Schreibmarke in leerem Dokument, dann erstes Zeichen tippen | `docxCard`/`odtCard` „Neu erstellen", Cursor im leeren Editor, Schriftart setzen, `keyboard.type('A')` | erstes und alle folgenden Zeichen tragen die Schriftart |
| 3.9 | No-Op | Dieselbe Schriftart erneut anwenden | Schriftart setzen, erneut dieselbe Schriftart über die Combobox anwenden | keine Fehlermeldung, DOM zeigt kein verschachteltes/doppeltes `<span>` (Kindanzahl unverändert) |
| 3.10 | Freitext-Tippfehler | siehe 2.4 #3 | — | — |
| 3.11 | Kein Treffer | siehe 2.4 #2/#3 | — | — |
| 3.12 | API nicht unterstützt/verweigert | Local Font Access API im Test-Browser nicht verfügbar (Standard in Playwright/Firefox/WebKit-Projekten) | Combobox normal öffnen und bedienen | kuratierte Liste vollständig funktionsfähig, keine Konsolen-Fehler, kein blockierender Dialog |
| 3.15 | Schnelles Umschalten (Stresstest) | siehe Abschnitt 2.10 (Erweiterung `selection-regression.spec.ts`) | — | — |
| 3.16 | Schriftart direkt gefolgt von Bild-/Tabellen-Einfügen | Schriftart an Schreibmarke setzen, sofort Bild einfügen (falls UI vorhanden) bzw. Tabelle einfügen | kein Crash, Verhalten der Stored Mark konsistent zu Fett/Kursiv in derselben Situation |
| 3.17 | Track Changes | **kein Test** — nachrichtlich, da Track Changes selbst noch nicht existiert (Anforderung selbst markiert dies als nicht blockierend) | — | — |
| 3.18 | Race Condition Doppelklick + Dropdown | Doppelklick auf ein Wort (Wort-Selektion) unmittelbar gefolgt von Klick in die Schriftart-Combobox und Auswahl eines Eintrags | deterministisches Ergebnis: die per Doppelklick selektierte Wortgrenze erhält die Schriftart, kein unklarer/vermischter Zustand |

**Determinismus für diese Tabelle (R1/R4):**
- Zeile 3.7 (Undo/Redo): Schriftart per Combobox setzen → `await expect(editor).toBeFocused()` (R4) →
  `keyboard.type('weiterer Text')` → **`await page.waitForTimeout(50)` vor jedem `ControlOrMeta+z`/
  `ControlOrMeta+y`**, weil Undo-Schritte den Selektionszustand ändern und der jeweils folgende
  Tastendruck sonst vorauslaufen kann. Assertion nach jedem Schritt web-first (`toContainText`/
  Span-Count), nicht synchron.
- Zeile 3.8 (leeres Dokument): nach „Neu erstellen" `editor.click()`, Schriftart an der Schreibmarke
  setzen, `await expect(editor).toBeFocused()` (R4), dann `keyboard.type('A')`. Erst danach prüfen,
  dass das erste Zeichen die Schriftart trägt (`span[style*="font-family"]` mit `hasText: 'A'`).
- Zeile 3.18 (Doppelklick + Dropdown): nach `dblclick()` auf das Wort **`await page.waitForTimeout(50)`**
  (Selektions-Sync der Doppelklick-Wortselektion), erst dann `fontInput(page).click()` und
  Options-Klick. Assertion: exakt das doppelt-angeklickte Wort trägt die Schriftart, Nachbartext nicht.
- Zeile 3.16 (Bild/Tabelle direkt nach Schriftart): „Bild einfügen" ist nur als `input[type="file"]`
  hinter dem Label „🖼 Bild" verfügbar (kein Klick-Button) — der belastbare, deterministische Pfad ist
  **Tabelle einfügen** (`getByRole('button', { name: 'Tabelle einfügen' })`); der Bild-Zweig ist optional
  und nur mit einem echten, per JSZip/Buffer bereitgestellten Bild über `setInputFiles` auszuführen.
- Zeile 3.12 (Local Font Access API): `font-family.spec.ts` läuft auf Chromium (Desktop
  Chrome, Mobile/Pixel 7) **und** WebKit (Tablet/iPad Mini). In Chromium ist
  `window.queryLocalFonts` **vorhanden**, rejiziert aber ohne User-Aktivierung/Permission;
  in WebKit fehlt es ganz. Um über alle drei Projekte **dasselbe, deterministische**
  Verhalten zu erzwingen (und nicht von browser-spezifischer Permission-Ablehnung
  abzuhängen), wird die API vor der Navigation gezielt entfernt:
  `await page.addInitScript(() => { delete (window as unknown as { queryLocalFonts?: unknown }).queryLocalFonts })`
  **vor** `page.goto('/')`. Damit liefert `getSystemFonts()` deterministisch `[]`, die
  Assertion (kuratierte Liste voll bedienbar, kein `console`-`error`/`pageerror`, kein
  blockierender Dialog) ist projekt-unabhängig stabil. Der Gegenfall „API vorhanden →
  Systemschriften erscheinen" wird über den Mock in §2.11 abgedeckt (dort wird
  `queryLocalFonts` per `addInitScript` gesetzt statt gelöscht).

### 2.10 Selektions-Sync-Regression mit Schriftart (Grenzfall 3.15, Pflicht)

**Erweiterung der bestehenden Datei** `tests/e2e/selection-regression.spec.ts`
(nicht neue, separate Datei — analog zur in `kursiv-qa.md` Abschnitt 2.9
begründeten Konvention: dauerhaft verankert statt einer zusätzlichen, leicht
vergessbaren Datei). Neuer Test im bestehenden `describe`-Block:

```ts
test('rapid font-family switching does not corrupt content (Grenzfall 3.15)', async ({ page }) => {
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Test Absatz.')
  // R8: { exact: true } ist Pflicht — der Entfernen-Button trägt aria-label="Schriftart
  // entfernen"; ein Teilstring-Match auf "Schriftart" träfe sonst beide Elemente
  // (Strict-Mode-Verstoß). Siehe schriftart-waehlen-code.md Abschnitt 0.2 Punkt 4.
  const fontInput = page.getByLabel('Schriftart', { exact: true })

  for (let i = 0; i < 6; i++) {
    // R2: Selektion in JEDER Iteration frisch setzen — nicht auf einer evtl. schon
    // veränderten/veralteten Selektion aufsetzen. Select-all ist eine
    // (tastaturgetriebene) Selektionsänderung → R1-Wartezeit, bevor die nächste
    // Eingabe feuert, sonst rennt fill()/Enter der Selektions-Sync voraus.
    await page.keyboard.press('ControlOrMeta+a')
    await page.waitForTimeout(50)
    const font = i % 2 === 0 ? 'Arial' : 'Georgia'
    await fontInput.fill(font)
    await fontInput.press('Enter')
    // R3: web-first abwarten, dass die Schriftart tatsächlich angewandt wurde,
    // bevor die nächste Iteration erneut alles selektiert.
    await expect(editor.locator('span[style*="font-family"]').first()).toBeVisible()
  }

  // R2: Inhalt UND Struktur prüfen — nicht nur der Text, sondern genau ein Absatz,
  // kein stiller Split/Verlust (dieselbe Klasse Assertion wie die Bold-Regressionstests).
  await expect(editor).toContainText('Test Absatz.')
  await expect(page.locator('.ProseMirror p')).toHaveCount(1)

  // Editor bleibt normal bedienbar: Anschluss-Tipptest.
  await editor.click()
  await page.keyboard.press('End')
  await page.waitForTimeout(50) // R1: End ist tastaturgetrieben
  await page.keyboard.type(' Weiter.')
  await expect(editor).toContainText('Test Absatz. Weiter.')
})
```

Assertion: Dokumentinhalt **und Absatzstruktur** bleiben vollständig erhalten
(kein Verlust/keine Vermischung, genau ein `<p>`), Editor bleibt normal bedienbar
(Anschluss-Tipptest grün). Der Test läuft auch im Mobile-/Tablet-Projekt grün,
weil R1/R2/R3 die dort zuvor beobachteten Selektions-Sync-Races ausschließen.

### 2.11 Grenzfall 3.4 — Performance großer Listen (manuelle Ergänzung)

Kein automatisierter Performance-Assert (siehe Abschnitt 1.5) — stattdessen
ein funktionaler E2E-Test, der beweist, dass die UI bei einer künstlich
vergrößerten Liste bedienbar bleibt:

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Liste mit `window.queryLocalFonts` gemockt auf >300 Einträge (`page.addInitScript` vor `page.goto`) | Combobox öffnen, im Suchfeld tippen | Liste reagiert innerhalb eines Zeitbudgets (`expect(...).toBeVisible({ timeout: 2000 })`), Anzahl gerenderter `role="option"`-Elemente bleibt durch `MAX_RENDERED_OPTIONS` gedeckelt (`expect(page.getByRole('option')).toHaveCount(200 oder weniger)`) |

Ergänzend, einmalig vor Statuswechsel auf „verifiziert": manuelle Prüfung mit
echter Local Font Access API in einem realen Chromium-Browser mit vielen
installierten Schriftarten (kein Bestandteil der automatisierten CI-Suite,
siehe Abschnitt 4 Checkliste).

### 2.12 Rundreise — vollständige Format-Matrix aus Anforderung Abschnitt 6

Jedes Szenario prüft die **heruntergeladene Datei**
(`download.path()` → `fs.readFile` → `JSZip.loadAsync` → Ziel-XML-Datei aus
dem Zip lesen bzw. `text/xml` per `DOMParser`/Regex prüfen), nicht nur, dass
der Editor nach Re-Import „irgendwie richtig aussieht". Jede Zeile ist gegen
alle sieben Prüfkriterien aus Anforderung Abschnitt 6 abzuhaken, sofern in der
Format-Matrix-Tabelle dort nicht enger gefasst (Kriterien 1–3, 6, 7 für „neu
erstellt").

**Ablauf-Skelett je Rundreise (verbindliche Reihenfolge, siehe R5/R6):**
1. Upload via `docxCard(page).locator('input[type="file"]').setInputFiles({ name, mimeType, buffer })`.
2. `await expect(editor).toContainText(<bekannter Text>)` — Import ist gelandet.
3. **Kriterium 7 sofort hier:** `await expect(page.getByText('ungespeichert')).toHaveCount(0)`
   (R6 — vor jeder Editor-Interaktion, weil jede Editor-Aktion `dirty:true` setzt und der
   spätere Export es wieder auf `false` setzt).
4. Export: `page.waitForEvent('download')` + Klick „Exportieren", Datei-Bytes von `download.path()` lesen.
5. XML-Assertions an den heruntergeladenen Bytes (unten je Szenario).
6. Re-Import: **erst `await page.getByRole('button', { name: /formate/i }).click()`** (R5 — zurück zum
   Picker, sonst existiert der `input[type="file"]` nicht), dann zweites `setInputFiles(...)` mit den
   **exakt heruntergeladenen** Bytes (nicht dem In-Memory-Objekt aus Schritt 1).
7. Re-Import-Assertions (Text vorhanden, Combobox zeigt bei Cursor an der Stelle wieder die Schriftart).

**Fixture-Strategie für die „Bestandsdatei"-Zeilen (1/2) — Determinismus vs. Realismus:**
Der strikte Namens-/Zuordnungs-Vergleich (Kriterien 1/2) läuft primär gegen eine
**unabhängig, von Hand per JSZip gebaute** Minimal-Datei, die die Schriftart genau so trägt,
wie Word/LibreOffice sie setzt (`<w:rFonts w:ascii="…"/>` bzw. `style:font-name` +
`office:font-face-decls`) — das isoliert die Schriftart-Rundreise von unabhängigen
Voll-Fidelity-Themen großer Realdateien und macht den Test deterministisch. **Zusätzlich**
werden die realen Korpus-Fixtures (`bug59058.docx`, `formen_Legende.odt`,
`FruitDepot-SeasonalFruits4.odt`) als Import-/Robustheits- und „kein stiller Verlust"-Nachweis
(Kriterium 5/6) importiert und exportiert; für diese Realdateien wird **gezielt auf die
Schriftartnamen** assertiert (Vorhandensein/Erhalt der konkreten `w:ascii`/`svg:font-family`-Werte),
nicht auf Byte-Gleichheit des Gesamtdokuments — die App normalisiert unabhängige Strukturen, was für
die Schriftart-Abnahme irrelevant ist.

| # | Szenario | Ablauf | Assertion an heruntergeladener Datei | Kriterien |
|---|---|---|---|---|
| 1 | DOCX-Bestandsdatei „unverändert" | `bug59058.docx` (oder `drawing.docx`) hochladen → **ohne Änderung** sofort exportieren → Re-Import in neuer Seite/`setInputFiles` | `word/document.xml`: jeder ursprünglich mit Schriftart versehene Lauf trägt exakt denselben `w:ascii`-Namen, exakt demselben Textteil zugeordnet; kombinierte Formate (Fett/Farbe) am selben Lauf erhalten; kein Crash während des gesamten Zyklus | 1–7 |
| 2 | ODT-Bestandsdatei „unverändert" | `formen_Legende.odt` hochladen → unverändert exportieren → Re-Import | `content.xml`: `style:font-name` + `office:font-face-decls` weiterhin korrekt aufgelöst auf denselben Namen, demselben Lauf zugeordnet | 1–7 |
| 3 | Neues Dokument → Schriftart über Toolbar → DOCX-Export → Re-Import | `docxCard` „Neu erstellen" → tippen → markieren → Schriftart „Georgia" über Combobox → Export → Re-Import | `word/document.xml` enthält `<w:rFonts w:ascii="Georgia" .../>` exakt am erwarteten Lauf; nach Re-Import zeigt Combobox bei Cursor an dieser Stelle wieder „Georgia" | 1–3, 6, 7 |
| 4 | Neues Dokument → Schriftart über Toolbar → ODT-Export → Re-Import | analog, ODT-Karte | `content.xml` enthält `style:font-name` + passenden `office:font-face-decls`-Eintrag für „Georgia"; nach Re-Import korrekt angezeigt | 1–3, 6, 7 |
| 5 | Kein unnötiges Dirty-Flag bei Bestandsdatei-Re-Import (Kriterium 7, Anforderung 2.4) | Szenario 1/2 unmittelbar nach Upload, **vor** jeder Editor-Interaktion (R6) | `await expect(page.getByText('ungespeichert')).toHaveCount(0)` — das amberfarbene „● ungespeichert" (`DocumentWorkspace.tsx` Zeile 118–120) wird nicht angezeigt; Gegenprobe im selben Test: nach einer echten Tipp-Änderung erscheint es (`toHaveCount(1)`), damit der Test nicht nur zufällig grün ist | 7 |
| 6 | Kein Absturz/keine Exception während des gesamten Zyklus | alle Szenarien 1–4 | `page.on('pageerror')`/`page.on('console', msg => msg.type() === 'error')`-Listener wirft in keinem Szenario einen Treffer | 6 |
| 7 | Kein stiller Verlust bei Fremddatei-Schriftarten (Kriterium 5) | Szenario 1 mit `bug59058.docx` (`MinionPro-Regular`, nicht kuratiert) | exportierter Name exakt `MinionPro-Regular`, nicht ersetzt durch eine Listen-/Standardschriftart | 5 |
| 8 | Unabhängige DOCX-Validierung | exportierte Datei aus Szenario 3, `word/document.xml` **per Regex/`DOMParser`, nicht per `readDocx`** geprüft | `<w:rFonts w:ascii="Georgia" w:hAnsi="Georgia" w:cs="Georgia" w:eastAsia="Georgia"\/>` vorhanden, alle vier Attribute identisch | 2, 8 (Anforderung 2.8) |
| 9 | Unabhängige ODT-Validierung | exportierte Datei aus Szenario 4, `content.xml` per Regex/`DOMParser` geprüft | `style:font-name="Georgia"` **und** `<style:font-face style:name="Georgia" svg:font-family="Georgia"\/>` beide vorhanden (2.9-Defektkriterium) | 2, 9 (Anforderung 2.9) |

Nachrichtlich (nicht blockierend für diesen Plan, siehe Anforderung Abschnitt
6 letzter Absatz): Cross-Format-Rundreisen DOCX→ODT und ODT→DOCX werden erst
getestet, sobald `speichern-unter-format` existiert — hier nur als offener
Punkt vermerkt (siehe Abschnitt 4 Checkliste).

---

## 3. Zuordnung Anforderung → Test (Abnahme-Mapping)

| Anforderungs-Abschnitt | Testebene(n) | Datei(en) |
|---|---|---|
| 1 (Bedienelemente, Zeilen 1–13) | E2E | `font-family.spec.ts` §2.0, 2.4–2.6, 2.8 |
| 2.1 (Anwenden auf Selektion) | Unit + E2E | `commands.test.ts` #1, `font-family.spec.ts` §2.1 #1/2/6 |
| 2.2 (Stored Mark an Schreibmarke) | Unit + E2E | `commands.test.ts` #2/#4, `font-family.spec.ts` §2.1 #3–5 |
| 2.3 (Anzeige aktive Schriftart) | Unit + E2E | `commands.test.ts` #6–9, `font-family.spec.ts` §2.2 |
| 2.4 (Basis-/Standardschriftart) | Unit + E2E | `roundtrip.test.ts` (kein `dirty` bei unverändertem Re-Import), `font-family.spec.ts` §2.12 #5 |
| 2.5 (Kombination mit anderen Formaten) | Unit + E2E | `commands.test.ts` #10/#11, `docx/font-family.test.ts` #8, `font-family.spec.ts` §2.7 |
| 2.6 (Live-Rendering) | E2E | `font-family.spec.ts` §2.3 |
| 2.7 (Namens-Normalisierung) | Unit | `fonts.test.ts` #1–7, `docx/font-family.test.ts` #7, `odt/font-family.test.ts` #10 |
| 2.8 (DOCX `w:rFonts`-Konsistenz) | Unit + E2E | `docx/font-family.test.ts` #1–3/6, `font-family.spec.ts` §2.12 #8 |
| 2.9 (ODT `style:font-name`+`font-face-decls`) | Unit + E2E | `odt/font-family.test.ts` #1/4/8/9, `font-family.spec.ts` §2.12 #9 |
| Grenzfall 3.1 | Unit + E2E | `commands.test.ts` #7, `font-family.spec.ts` §2.2 #4/5 |
| Grenzfall 3.2 | Unit + E2E | `fonts.test.ts` #2/#7, `odt/font-family.test.ts` #3, `roundtrip.test.ts` |
| Grenzfall 3.3 | Unit + E2E | `fonts.test.ts` #3/#7, `odt/font-family.test.ts` #5/#10, `docx/font-family.test.ts` #7 |
| Grenzfall 3.4 | Unit + E2E (funktional, kein Perf-Assert) | `fonts.test.ts` #6 (indirekt), `font-family.spec.ts` §2.11 |
| Grenzfall 3.5 | Unit + E2E | `docx/font-family.test.ts` #9, `odt/font-family.test.ts` #7, `font-family.spec.ts` §2.6, §2.12 #7 |
| Grenzfall 3.6 | E2E (+ Reader/Writer-Unit für Kopf/Fußzeile) | `font-family.spec.ts` §2.9 (Zeile 3.6) |
| Grenzfall 3.7 | E2E | `font-family.spec.ts` §2.9 (Zeile 3.7) |
| Grenzfall 3.8 | E2E | `font-family.spec.ts` §2.9 (Zeile 3.8) |
| Grenzfall 3.9 | Unit + E2E | `commands.test.ts` #5, `font-family.spec.ts` §2.9 (Zeile 3.9) |
| Grenzfall 3.10/3.11 | E2E | `font-family.spec.ts` §2.4 #2/3 |
| Grenzfall 3.12 | Unit + E2E | `fonts.test.ts` #12/13, `font-family.spec.ts` §2.9 (Zeile 3.12) |
| Grenzfall 3.13 | Unit | `odt/font-family.test.ts` #2 |
| Grenzfall 3.14 | Unit | `docx/font-family.test.ts` #3/4 |
| Grenzfall 3.15 | E2E | `selection-regression.spec.ts` (erweitert, §2.10) |
| Grenzfall 3.16 | E2E | `font-family.spec.ts` §2.9 (Zeile 3.16) |
| Grenzfall 3.17 | keiner (dokumentiert offen, nachrichtlich) | — |
| Grenzfall 3.18 | E2E | `font-family.spec.ts` §2.9 (Zeile 3.18) |
| Abschnitt 4 (UI-Robustheit, 5 Punkte) | E2E | `font-family.spec.ts` §2.8 |
| Abschnitt 6 (Rundreise-Matrix, 4 Pflichtzellen + 7 Kriterien) | E2E | `font-family.spec.ts` §2.12 |
| Abschnitt 7 Punkt 1 (vollständiger Bau) | Unit + E2E (Existenznachweis über alle Tests) | Abschnitte 1 + 2 gesamt |
| Abschnitt 7 Punkt 2 (echte Browser-Tests je Grenzfall) | E2E | Abschnitt 2 gesamt |
| Abschnitt 7 Punkt 3 (Rundreise-Matrix grün) | E2E | §2.12 |
| Abschnitt 7 Punkt 4 (5.2/13.1 im Backlog vermerkt) | manueller Schritt, kein Test | Abschnitt 4 Checkliste |
| Abschnitt 7 Punkt 5 (kein unbeantworteter Fund) | Review | Abschnitt 4 Checkliste |

---

## 4. Abnahme-Checkliste (vor Statuswechsel „verifiziert")

- [ ] `npm test` grün, inkl. `fonts.test.ts`, `commands.test.ts`,
      `docx/__tests__/font-family.test.ts`, `odt/__tests__/font-family.test.ts`
      sowie der Erweiterungen beider `roundtrip.test.ts`.
- [ ] `npm run test:e2e` grün, inkl. `tests/e2e/font-family.spec.ts` und der
      Erweiterung von `tests/e2e/selection-regression.spec.ts`.
- [ ] Jeder Grenzfall aus Anforderung Abschnitt 3 (3.1–3.18) hat mindestens
      einen grünen Test oder ist explizit als „nachrichtlich/nicht
      blockierend" dokumentiert (3.17 Track Changes, Cross-Format-Teil von
      Abschnitt 6) — kein sonstiger offener Punkt.
- [ ] Jeder Punkt aus Anforderung Abschnitt 4 (UI-Robustheit, 5 Punkte) hat
      einen eigenen grünen E2E-Test.
- [ ] Alle vier Pflichtzellen der Rundreise-Matrix aus Anforderung Abschnitt 6
      grün, jeweils gegen die dort verlangten Prüfkriterien (1–7 bzw. 1–3, 6,
      7) einzeln abgehakt — nicht nur „Test ist grün", sondern jedes
      Kriterium einzeln nachvollzogen (Abschnitt 2.12 dieses Plans).
- [ ] Kein Test in `font-family.spec.ts` bzw. der Erweiterung von
      `selection-regression.spec.ts` ruft `readDocx`/`writeDocx`/`readOdt`/
      `writeOdt`/`applyFontFamily`/`clearFontFamily`/`getActiveFontFamily`
      direkt auf — stichprobenartig per Review bestätigt.
- [ ] Die Determinismus-/Locator-Regeln R1–R8 (Abschnitt 0.1) sind in jedem
      E2E-Testkörper eingehalten: (a) `waitForTimeout(50)` nach jeder
      tastaturgetriebenen Caret-Bewegung/Klick-Neupositionierung vor der
      nächsten Eingabe (R1), (b) frische Selektion je Iteration in
      Schnellwiederholungen + Strukturassertion (R2), (c) ausschließlich
      web-first/retrying Matcher für Combobox-/DOM-Zustand, kein synchrones
      `inputValue()`/`evaluate()` unmittelbar nach einer Aktion (R3),
      (d) `expect(editor).toBeFocused()` vor Stored-Mark-Tippen (R4),
      (e) `←Formate`-Navigation vor jedem Re-Import (R5),
      (f) `getByLabel('Schriftart', { exact: true })` für das Eingabefeld, damit
      der gleichnamige Entfernen-Button keinen Strict-Mode-Verstoß auslöst (R8) —
      per Review in jeder E2E-Datei (inkl. §2.10) stichprobenartig bestätigt.
      **Explizit auf allen
      drei Projekten grün**: Desktop Chrome, Mobile (Pixel 7), Tablet
      (iPad Mini) — nicht nur Desktop (die zuletzt geflakten Selektions-Sync-
      Fälle traten ausschließlich im Mobile-Projekt auf).
- [ ] `font-family.spec.ts` wurde lokal **mehrfach hintereinander** (`--repeat-each=3`)
      und mit `--project=Mobile` grün ausgeführt, um verbleibende Race-Flakes vor
      dem Merge auszuschließen (nicht nur ein einzelner grüner CI-Lauf).
- [ ] Die bewusste Abgrenzung aus Anforderung 5.2 (keine Font-Binärdaten-
      Einbettung) **und** die in `schriftart-waehlen-code.md` Abschnitt 13.1
      (Theme-Schriftarten `w:asciiTheme`) und 13.2 (Kopf-/Fußzeile nicht
      editierbar) dokumentierten Einschränkungen sind im Backlog
      (`FEATURE-BACKLOG.md`, Zeile `schriftart-waehlen`) als akzeptierte,
      bewusste Lücken vermerkt — nicht stillschweigend offen.
- [ ] Für jeden während der Implementierung/Testerstellung gefundenen Fehler
      liegt entweder ein Fix mit grünem Regressionstest vor, oder das
      abweichende Verhalten ist bewusst und explizit als akzeptierte
      Einschränkung dokumentiert (kein stiller Fehlschlag, analog
      `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.4).
- [ ] Manuelle Einmalprüfung von Grenzfall 3.4 (sehr lange Systemschriften-
      Liste) mit echter Local Font Access API in einem realen
      Chromium-Browser durchgeführt und Ergebnis hier vermerkt (Abschnitt
      2.11).
- [ ] Nachrichtlicher Hinweis in `FEATURE-BACKLOG.md` bzw. dieser Datei, dass
      die Cross-Format-Rundreisen (DOCX→ODT, ODT→DOCX) aus Anforderung
      Abschnitt 6 erst nachgetragen werden, sobald `speichern-unter-format`
      existiert (kein Blocker für diesen Statuswechsel).
