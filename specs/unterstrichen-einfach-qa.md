# Unterstrichen (einfach) — QA-Testplan

Gegenstück zu `specs/unterstrichen-einfach-req.md` (verbindliche Anforderung) und
`specs/unterstrichen-einfach-code.md` (Dev-Umsetzungsplan mit Code-Audit). Dieser Plan
beschreibt, **wie** die in der Anforderung Abschnitt 6/8 geforderte Verifikation konkret
als automatisierte Tests umgesetzt wird — Datei für Datei, Testfall für Testfall,
zurückgeführt auf tatsächlich im Repo vorhandene Selektoren, Fixtures, Funktionsnamen und
**bereits etablierte, committete Test-Konventionen** (gegengeprüft am Stand dieses Repos,
nicht nur an den beiden Spec-Dateien).

**Nicht Ziel dieses Dokuments:** Bugs zu fixen. Ziel ist, Tests so zu schreiben, dass sie
den in `unterstrichen-einfach-code.md` Abschnitt 3 dokumentierten Ist-Zustand ehrlich
sichtbar machen, statt ihn durch zu lasche Assertions oder übersprungene Tests zu
verschleiern (das ist exakt die Kritik aus Anforderungsabschnitt 7).

**Zweiter, gleichrangiger Fokus (Auftrag QA):** Alle E2E-Tests müssen **deterministisch**
sein. Der häufigste Flakiness-Grund in diesem Repo ist eine Race-Condition zwischen
Playwrights Null-Verzögerungs-Tastatur und ProseMirrors **asynchronem**
`selectionchange`-Sync. Sie ist bereits mehrfach real reproduziert und in mehreren
committeten Tests dokumentiert und behoben worden (siehe Commits `0797d13`, `db61c89`,
`9f8fa03` sowie die Kommentare in `tests/e2e/selection-regression.spec.ts` und
`tests/e2e/cut.spec.ts`). Abschnitt 3 dieses Plans macht die daraus abgeleiteten Regeln
**verbindlich** — jeder Testfall unten wendet sie an. Ein Testfall, der eine Selektion per
`Shift+Pfeil` aufbaut oder den Cursor per Klick/Taste neu setzt und **unmittelbar** darauf
eine selektionsabhängige Aktion auslöst, ohne die Sync-Regel zu befolgen, gilt in diesem
Plan als fehlerhaft.

**Kritische Überarbeitung gegenüber dem Vorentwurf dieses QA-Dokuments.** Der Vorentwurf
war inhaltlich brauchbar, aber in vier Punkten technisch falsch bzw. nicht deterministisch
und wurde deshalb korrigiert (Details jeweils an Ort und Stelle vermerkt):

1. **Determinismus fehlte in den E2E-Snippets.** Mehrere Snippets bauten Selektionen per
   `Shift+Pfeil` ohne Per-Tasten-Delay und ohne den `waitForTimeout(50)`-Sync-Puffer auf,
   und der `U-GF-8`-Snippet ließ den **im committeten Original zwingenden**
   `waitForTimeout(50)` zwischen `End` und `Enter` weg — er hätte damit exakt die schon
   behobene Flakiness aus `selection-regression.spec.ts` wieder eingeschleppt. Korrigiert.
2. **Cross-Format-Rundreisen `U-RT-3/4/5` unterstellten einen UI-Export-Pfad, den die App
   nicht hat.** `src/app/DocumentWorkspace.tsx` besitzt **genau einen** „Exportieren"-Button,
   der immer `module.exportFile(...)` für das Format aufruft, in dem das Dokument geöffnet
   wurde — **kein** Format-Umschalter (verifiziert; dieselbe Feststellung steht bereits
   committet in `cut.spec.ts` bei „Rundreise 4/5"). Cross-Format ist per UI **nicht**
   auslösbar. Deshalb werden die Cross-Format-Rundreisen (Req Abschnitt 5.3/5.4/5.5)
   ehrlich auf die **Unit-Ebene** (`readDocx`→`writeOdt`→`readOdt` usw.) verlagert; E2E
   deckt nur die per UI tatsächlich möglichen **Gleichformat**-Rundreisen ab. Siehe 4.6/5.3.
3. **Der Re-Import-Snippet in `U-RT-1` war kaputt** (toter `downloadPromise2`, `page.reload()`
   statt des etablierten Rückweges). Ersetzt durch das committete Muster aus
   `docx.spec.ts`/`cut.spec.ts`: Download-Bytes aus `download.path()` lesen, über den
   „← Formate"-Button (`getByRole('button', { name: /formate/i })`) zurück zur
   Formatauswahl, dann echter Re-Upload über den Karten-`input[type="file"]`.
4. **Der Export-Helper scopte den „Exportieren"-Button auf eine Karte.** Der Button liegt
   in der Workspace-Kopfzeile, **nicht** in der Karte (die Karten sind nach dem Öffnen gar
   nicht mehr im DOM). Der Helper nutzt jetzt korrekt `page.getByRole('button', { name:
   'Exportieren' })`.
5. **Die Primärnachweise für Defekt A und B fehlten als konkrete Testfälle.** Der Vorentwurf
   nannte Defekt A (Button per Tastatur) und Defekt B (`aria-pressed` folgt `storedMarks`)
   nur im Abnahme-Mapping, schrieb aber **keinen** ausführbaren Test dafür: `U-TF-3` prüft
   nur Strg+U (Keymap-Pfad, **anderer** Codepfad als der Button), und `U-TF-5` prüft nur den
   Cursor-in-unterstrichenem-Text-Fall (den der heutige `$from.marks()`-Code bereits
   erfüllt), **nicht** den `storedMarks`-Fall. Ergänzt: `U-TF-4a` (Button-Fokus + Enter/Space)
   und `U-TF-8` (nach Strg+U an leerer Schreibmarke sofort `aria-pressed="true"`, vor dem
   Tippen). Beide sind heute erwartet rot und in Abschnitt 10 als „Fix im selben PR"
   geführt. Zusätzlich Zitat korrigiert: die Keymap-Bindings liegen in `WordEditor.tsx:93-100`
   (`Mod-u` bei `:100`), nicht `:85-92` (das ist der Kommentarblock).

**Gegengeprüft am aktuellen Code (Stand dieses QA-Plans):** `src/formats/odt/reader.ts`
liest `<style:text-properties>` in `parseAutomaticStyles` weiterhin nur für
`family === 'text'`; `family === 'paragraph'` wertet nur `fo:text-align` aus. Der
DOCX-Reader (`marksFromRunProperties`) konsultiert weiterhin nur das `<w:rPr>` des Laufs
selbst, keinen Formatvorlagen-Default. Die in `unterstrichen-einfach-code.md`
Abschnitt 3.1/3.2 vorgeschlagenen Fixes sind zum Zeitpunkt dieses Testplans **noch nicht
implementiert.** Abschnitt 10 dieses Dokuments benennt genau, welche Tests deshalb den Bug
adressieren und wie sie CI-grün und trotzdem ehrlich gehalten werden.

---

## 1. Testumgebung & Rahmenbedingungen (verifiziert)

| Aspekt | Wert |
|---|---|
| Unit-Test-Runner | Vitest (`jsdom`-Environment), Befehl `npm test` (= `vitest run`) |
| E2E-Runner | Playwright, Befehl `npm run test:e2e` (= `playwright test`), Config `playwright.config.ts` |
| E2E Base-URL | `http://localhost:4173/salamanido/` (Preview-Build; `webServer` in der Config startet Build + Preview automatisch) |
| E2E-Projekte | „Desktop Chrome" (Chromium), „Mobile" (Pixel 7, **Chromium** mit Touch-Emulation), „Tablet" (iPad Mini, **WebKit**) — jede `.spec.ts` läuft auf allen dreien |
| Referenz-Testdateien (Konventionen) | `tests/e2e/docx.spec.ts`, `tests/e2e/odt.spec.ts`, `tests/e2e/cut.spec.ts`, `tests/e2e/selection-regression.spec.ts`, `tests/e2e/fixtures/builders.ts`, `src/formats/{docx,odt}/__tests__/roundtrip.test.ts`, `.../external-fixtures.test.ts`, `.../external-validation.test.ts` |
| Fixture-Verzeichnisse | `tests/fixtures/external/docx/`, `tests/fixtures/external/odt/` (reale Fremddateien; alle unten genannten Fixtures **im Repo vorhanden verifiziert**) |
| Shared Builder-Helfer (E2E) | `tests/e2e/fixtures/builders.ts`: `buildSampleDocx()`, `buildSampleOdt()`, `DOCX_MIME`, `ODT_MIME` — **wiederverwenden statt duplizieren** |

### 1.1 Verifizierte UI-Fakten (aus tatsächlicher Codelektüre, nicht angenommen)

- **Landing/Karten:** Nach `page.goto('/')` erst Privacy-Banner bestätigen
  (`page.getByRole('button', { name: /verstanden/i }).click()`). Zwei Karten (`div.rounded-lg`)
  mit Heading „Word-Dokument (.docx)" bzw. „OpenDocument Text (.odt)"; je Karte ein Button
  „Neu erstellen" und ein `input[type="file"]`.
- **Toolbar-Button „U":** `page.getByTitle('Unterstrichen')`; `title` **und** `aria-label`
  = „Unterstrichen"; `aria-pressed` reaktiv aus `markType.isInSet($from.marks())`
  (`Toolbar.tsx:69,75`); Auslösung per `onMouseDown`+`preventDefault` → `toggleMark` →
  `view.focus()` (Selektion/Fokus bleiben erhalten). Analog `getByTitle('Fett')`,
  `'Kursiv'`, `'Durchgestrichen'`, `'Aufzählung'`, `'Tabelle einfügen'`.
- **Tastenkürzel (verifiziert in `WordEditor.tsx:93-100`; die Zeilen `86-92` darüber sind der
  Zwischenablage-Kommentarblock, **nicht** die Bindings):** `Mod-z` = Undo (`:93`),
  `Mod-y` UND `Mod-Shift-z` = Redo (`:94`/`:95`, **beide** gebunden — Tests dürfen jede der
  beiden Varianten verwenden), `Mod-b` = Fett (`:98`), `Mod-i` = Kursiv (`:99`),
  **`Mod-u` = Unterstrichen (`:100`)** — deckt sich mit der ausdrücklichen Korrektur in
  `req` Abschnitt 0.1 / `code.md` (die Vorfassungen nannten fälschlich `:92`). In Playwright
  stets `ControlOrMeta+…` schreiben (deckt Windows/Linux und macOS ab).
- **Toolbar-Re-Render (verifiziert `WordEditor.tsx:125-132`):** `dispatchTransaction` ruft
  `forceRender` auf **jeder** Transaktion, auch bei **selektions-only**-Änderungen (kein
  `docChanged`). Deshalb aktualisiert sich `aria-pressed` auch nach reinen Caret-Bewegungen
  (Pfeiltasten, Klick) — aber **asynchron**, weil native Caret-Moves ProseMirror erst über
  `selectionchange` erreichen. Konsequenz für die Tests: `aria-pressed`-Prüfungen nach einem
  Caret-Move **immer** web-first (`await expect(button).toHaveAttribute(...)`, R4), nie als
  Einmal-Auslesung. Das ist die Code-Grundlage für die Determinismus von `U-TF-5`/`U-TF-6`/
  `U-TF-8`.
- **Farb-Selektor-Schärfe (verifiziert `schema.ts:182-194`):** `textColor.toDOM` →
  `['span', { style: 'color: …' }, 0]`, `highlight.toDOM` →
  `['span', { style: 'background-color: …' }, 0]`. `span[style*="color"]` matcht daher
  **beide** (auch `background-color` enthält den Substring). In `U-TF-7`/`U-RT-8` wird **keine**
  Hervorhebungsfarbe gesetzt → kein Fehlmatch; sobald ein Test Text- **und**
  Hervorhebungsfarbe kombiniert, auf `span[style*="color:"]` + separaten
  `span[style*="background-color"]`-Check verschärfen.
- **Textfarbe:** `<input type="color" aria-label="Textfarbe">` (`Toolbar.tsx:194`), löst
  `onChange` → `applyMarkColor('textColor', value)` aus. In Playwright per
  `page.getByLabel('Textfarbe').fill('#ff0000')` bedienbar (`fill` auf `type=color`
  dispatcht das change-Event). Analog „Hervorhebungsfarbe".
- **Export:** **Ein** Button in der Workspace-Kopfzeile:
  `page.getByRole('button', { name: 'Exportieren' })` (`DocumentWorkspace.tsx:124-142`).
  **Kein** Cross-Format-Umschalter (siehe Intro Punkt 2). Download über
  `page.waitForEvent('download')`, Bytes über `await download.path()` + `fs.readFile`.
- **Zurück zur Formatauswahl (für Re-Import):**
  `page.getByRole('button', { name: /formate/i }).click()` („← Formate",
  `DocumentWorkspace.tsx:108-114`), danach Karten-`input[type="file"]` erneut befüllen.
- **Bild-Upload:** `page.locator('label:has-text("Bild")').locator('input[type=file]')`
  (Toolbar-Geschwister, **nicht** im `.ProseMirror` verschachtelt).
- **Schema (verifiziert `schema.ts:157-198`):** Mark-Reihenfolge `strong, em, underline,
  strike, textColor, highlight`. ProseMirror verschachtelt Marks in dieser Schema-Rang-
  Reihenfolge → kombiniert fett+unterstrichen rendert als `<strong><u>…</u></strong>`
  (Selektor `.ProseMirror strong u` matcht). `underline.parseDOM` matcht **exakt**
  `text-decoration=underline` → zusammengesetzter Paste-Wert `underline line-through` wird
  **nicht** getroffen (Grundlage von Grenzfall 16).

---

## 2. Teststrategie-Überblick

Zwei unabhängige, sich ergänzende Ebenen — **keine ersetzt die andere**:

| Ebene | Beweist | Beweist NICHT |
|---|---|---|
| **A. Unit-Tests (Vitest)**, Abschnitt 4 | Reader/Writer sind für gegebenes XML/JSON korrekt (inkl. echter Fremddatei-Bytes und **Cross-Format**, das per UI gar nicht auslösbar ist) | dass der Button klickbar ist, Strg+U im echten Editor wirkt, der Button-Zustand dem Cursor folgt, ein über die UI erzeugtes Dokument dieselbe Struktur wie handgebautes JSON hat |
| **B. E2E-Tests (Playwright)**, Abschnitt 5 | Klick/Tastatur im echten DOM, echter Datei-Upload über `<input type="file">`, echter Export über den Browser-`download`-Event, heruntergeladene Datei entpackt und ihr XML geprüft | Detailverhalten exotischer XML-Varianten (dafür Ebene A); **Cross-Format** (UI kann es nicht) |

---

## 3. Determinismus-Regeln (verbindlich für alle E2E-Tests)

Diese Regeln sind aus real reproduzierten Races abgeleitet und in bereits committeten
Tests belegt. **Jeder** E2E-Testfall unten wendet sie an; Reviewer prüfen ihre Einhaltung.

### R1 — `Shift+Pfeil`-Selektionen: Per-Tasten-Delay + Sync-Puffer

Aufbau einer Selektion mit `Shift+ArrowLeft/Right/Up/Down` ist nativ (Browser), ProseMirror
erfährt davon nur über das **asynchrone** `selectionchange`-Event. Eine Kette von
Null-Delay-Keydowns, unmittelbar gefolgt von einer selektionsabhängigen Aktion (Button-Klick,
`Strg+X`, weiterer Tastendruck), kann die Sync überholen und auf einer **falschen** Selektion
operieren (in `cut.spec.ts` verifiziert: `window.getSelection()` meldete korrekt, die real
betroffene Zeichenzahl schwankte dennoch zwischen 1 und 11).

**Regel:** (a) jeder `Shift+Arrow`-Druck mit `{ delay: 20 }`; (b) nach `keyboard.up('Shift')`
und **vor** der nächsten Aktion `await page.waitForTimeout(50)`.

```ts
await page.keyboard.down('Shift')
for (let i = 0; i < n; i++) await page.keyboard.press('ArrowRight', { delay: 20 })
await page.keyboard.up('Shift')
await page.waitForTimeout(50) // Sync-Puffer, siehe cut.spec.ts / selection-regression.spec.ts
await page.getByTitle('Unterstrichen').click()   // erst JETZT selektionsabhängige Aktion
```

Ausnahme: `ControlOrMeta+a` (Select-All) ist über `baseKeymap` an `selectAll` gebunden und
dispatcht die `AllSelection` **synchron** — danach ist **kein** Puffer nötig (so auch in
`docx.spec.ts`/`cut.spec.ts`).

### R2 — Cursor neu setzen und danach tippen: Sync-Puffer

Nach einem Klick zum Neupositionieren oder einem nativen Caret-Move (`End`, `Home`, `Arrow`
ohne Shift) und einem **unmittelbar** folgenden Tastendruck denselben `waitForTimeout(50)`
einfügen. Das ist der Kern des Selection-Sync-Bugs aus Grenzfall 8 (`selection-regression.spec.ts`):
`End` → `waitForTimeout(50)` → `Enter`. **Dieser Puffer darf in `U-GF-8` nicht fehlen.**

### R3 — Getrennte Undo-Schritte: History-Group-Delay

`prosemirror-history` fasst zeitlich nahe Transaktionen (Default `newGroupDelay` ≈ 500 ms)
zu **einem** Undo-Schritt zusammen. Wenn ein Test verlangt, dass eine Aktion ein **eigener**
Undo-Schritt ist (z. B. „Tippen", dann „Unterstrichen an" als getrennt rückgängig machbar),
vor der abzugrenzenden Aktion `await page.waitForTimeout(600)` einfügen (so committet in
`cut.spec.ts` Testfall 9).

### R4 — Nur web-first-Assertions für Endzustände

Endzustände immer über auto-retryende Assertions prüfen (`await expect(locator).toHaveText/
toContainText/toHaveCount/toHaveAttribute(...)`), **nie** einen Wert nach einem manuellen
`waitForTimeout` einmalig auslesen und vergleichen. `waitForTimeout` wird ausschließlich als
Sync-Puffer **vor einer Aktion** (R1–R3) verwendet, nie als Ersatz für eine Assertion.

### R5 — Projekt-Matrix-Fallen (WebKit-Clipboard, Mobile-CI)

- **Clipboard-Tests** (Paste mit `navigator.clipboard`, `grantPermissions`) sind nur unter
  Chromium zuverlässig: `test.skip(browserName !== 'chromium', '…')` (so in `cut.spec.ts`
  Testfall 12). Betrifft hier den Paste-Test 5.4.
- **Konsolen-/JS-Fehler-Assertion** über den etablierten Helfer `watchForConsoleErrors(page)`
  aus `cut.spec.ts` (sammelt `pageerror` + `console.error`, assert am Ende `toEqual([])`) —
  für alle „kein Crash"-Grenzfälle statt ad-hoc `page.on('pageerror', …)`.
- **Mobile-CI-Sonderfall:** Eine per `Shift+Pfeil` bis ans **Dokumentende** aufgebaute
  Selektion, unmittelbar gefolgt von einer Aktion, ist in GitHub-Actions-Headless auf dem
  „Mobile"-Projekt einmal als vollständiger No-Op beobachtet worden (lokal nie reproduzierbar,
  siehe `cut.spec.ts` „Rundreise 1/2"). Die Unterstrichen-Rundreisen 5.3 vermeiden das
  bewusst, indem sie **`ControlOrMeta+a`** (synchron, R1-Ausnahme) statt einer
  End-erreichenden `Shift+Pfeil`-Kette verwenden. Testfälle, die dennoch eine solche Kette
  brauchen (`U-TF-6` gemischte Selektion), erhalten denselben dokumentierten
  `test.skip(testInfo.project.name === 'Mobile', …)`-Vorbehalt **nur falls** sich die
  CI-Instabilität dort zeigt — zuerst ohne Skip einchecken, Skip erst bei belegter CI-Flake.

---

## 4. Teil A — Unit-Tests Reader/Writer-Rundreise (Vitest)

### 4.1 Bestehender Test — bleibt, ersetzt aber nichts

`src/formats/{docx,odt}/__tests__/roundtrip.test.ts`, Testfall
`'preserves bold, italic, underline, and strikethrough independently'` (verifiziert:
DOCX Zeile 65/73/83, ODT analog): konstruiert ProseMirror-JSON mit `underline`, schreibt/liest
über `writeDocx`/`readDocx` bzw. `writeOdt`/`readOdt`, prüft `marks` `toEqual([{ type:
'underline' }])`. Deckt den einfachsten Eigenrundreise-Fall ab; ersetzt laut
Anforderungsabschnitt 7 **nicht** die Fremddatei-, Formatvorlagen- und Cross-Format-Tests.

### 4.2 Neu: `src/formats/docx/__tests__/underline.test.ts`

Handgebauter DOCX-Zip (JSZip) mit steuerbarem `document.xml` **und** `styles.xml`, analog
`buildSampleDocx` (`tests/e2e/fixtures/builders.ts`) bzw. den bestehenden Reader-Tests —
unabhängig vom eigenen Writer.

| # | Testname | Eingabe | Erwartung |
|---|---|---|---|
| 4.2.1 | `w:val="single"` → underline | `<w:r><w:rPr><w:u w:val="single"/></w:rPr><w:t>Text</w:t></w:r>` | `marks` enthält `underline` |
| 4.2.2 | `w:val="none"` → kein underline | dito `w:val="none"` | **kein** `underline` |
| 4.2.3 (`U-GF-9`) | Fremdwerte `w:val` ∈ {`double`,`wave`,`dotted`,`dash`} (im Korpus nicht vorhanden → handgebaut), `it.each` | je ein Wert | Reader vereinfacht **bewusst** auf „einfach" → `underline` gesetzt. Test fixiert dieses **dokumentierte Fallback** (Req Grenzfall 9), kein stiller Bug |
| 4.2.4 (`U-GF-14`) | Groß-/Kleinschreibung `w:val="NONE"` / `"SINGLE"`, `it.each` | | **Ist-Verhalten heute** (Code vergleicht exakt kleingeschrieben, `reader.ts:105-106`): `"NONE"` wird **nicht** als none erkannt → Mark fälschlich gesetzt. Siehe Härtung 3.3 in code.md. Handhabung CI-grün: Abschnitt 10 (`it.fails`-Markierung mit Kommentar), **nicht** das falsche Verhalten als „richtig" fixieren |
| 4.2.5 (`U-BUG-3.2`) | Absatz `<w:pStyle w:val="TitleTest"/>`, `styles.xml` mit `<w:style w:type="paragraph" w:styleId="TitleTest"><w:rPr><w:u w:val="single"/></w:rPr></w:style>`, Lauf **ohne** eigenes `<w:u>` | `readDocx` | **Soll:** `underline` vorhanden. **Heute (unfixed):** fehlt (Reader liest keinen Formatvorlagen-Default). Assertion auf das **korrekte Soll**; CI-Handhabung siehe Abschnitt 10 |
| 4.2.6 | wie 4.2.5, Lauf hat zusätzlich `<w:u w:val="none"/>` | `readDocx` | Lauf-eigenes Element überschreibt Default → **kein** `underline` (heute schon grün, weil der Lauf sein eigenes `<w:u>` hat) |
| 4.2.7 | Fett+Farbe+Unterstrichen am selben Lauf (`<w:b/><w:color w:val="FF0000"/><w:u w:val="single"/>`) | `readDocx` | alle drei Marks gleichzeitig, unabhängig |

### 4.3 Neu: `src/formats/odt/__tests__/underline.test.ts`

Fremddatei-Loader analog `external-fixtures.test.ts` (`readOdt(new Blob([readFileSync(...)]))`),
plus Hilfsfunktionen `underlinedTexts(node)`/`allTexts(node)` (rekursiv über `content`).

| # | Fixture | Erwartung |
|---|---|---|
| 4.3.1 | `character-styles.odt` | „Lorem ipsum" (family=text-Span, `solid`+italic) trägt `underline` — **heute grün**, sauberer Span-Fall; empfohlener Fremddatei-Kandidat für die ODT-Rundreise |
| 4.3.2 | `UNDERLINE.odt` | enthält `solid` **und** `none` → mindestens ein Knoten mit, mindestens einer ohne `underline` |
| 4.3.3 (`U-GF-10`/`U-GF-14`) | `InvalidUnderlineAttribute.odt` (`"ImSoInvalid"`) | Fallback „vorhanden und `!== 'none'`" → Mark **gesetzt** (dokumentiertes Soll, **heute grün** — per code.md Abschnitt 1.1 verifiziert) |
| 4.3.4 (`U-BUG-3.1`, kritisch) | `Tabelle1.odt` | Fünf Absätze „Gomez bewege sich zu wenig" ohne `<text:span>`, Absatzstil trägt Unterstreichung (P83 **`solid`** = in-scope, P86 `wave`, P92 `dotted`+bold). **Soll:** ≥1 Mark je Absatz. **Heute (unfixed):** `marks` leer. Assertion auf Soll; CI-Handhabung Abschnitt 10 |
| 4.3.5 | handgebauter Minimalfall: `<text:p text:style-name="Ppara">Direkter Text</text:p>`, `Ppara` = `family="paragraph"` mit eigener `<style:text-properties style:text-underline-style="solid"/>` | wie 4.3.4, aber gezielt mit dem **in-scope**-Wert `solid` — beweist den relevanten Fall unabhängig von `Tabelle1.odt`s Fremdwerten |
| 4.3.6 (`U-BUG-3.3`, Korrektur ggü. Vorentwurf) | `hyperlinkSpaces.odt` | **Text überlebt** den Import (12 Läufe inkl. „Kapitel", per code.md Abschnitt 1.1/3.5 verifiziert — der Vorentwurf-Befund „`<text:a>` verschluckt Text" ist **falsch**). Verloren geht nur die Unterstreichung, wegen unaufgelöster `parent-style-name`-Vererbung — **out of scope** (`hyperlink-einfuegen-req.md`). Test dokumentiert genau das; **kein** Rundreise-Kandidat |
| 4.3.7 | Negativ-/Doku-Testfall | Kommentar im File: `hyperlinkSpaces.odt`, `hyperlink.odt`, `Hyperlink-AOO401.odt`, `hyperlink_destination.odt`, `hyperlinkSpacesNoUnderline.odt` **nicht** als Underline-Rundreise-Beleg verwenden (Grund: 4.3.6, `parent-style-name`, nicht Textverlust) |

### 4.4 Erweiterung `src/formats/odt/__tests__/roundtrip.test.ts`

- **`U-GF-11` (Stilnamen-Dedup):** gleiche Markkombination (`strong`+`underline`) in
  **unterschiedlicher** Array-Reihenfolge in zwei Textknoten → Export erzeugt **genau eine**
  `<style:style style:name="T…">`-Definition. (Härtung 3.4; im UI-Datenfluss aktuell nicht
  auslösbar, deshalb reine Registry-Härtung — Priorität niedrig, siehe Abschnitt 10.)
- **`U-GF-12` (nur Underline):** Dokument mit **genau einer** Formatkombination — nur
  `underline` — exportieren; prüfen, dass `isEmpty` (`styleRegistry.ts:12-14`) diese
  Kombination **nicht** als leer verwirft und `buildTextStyleXml` korrekt
  `style:text-underline-style="solid" style:text-underline-width="auto"
  style:text-underline-color="font-color"` schreibt, ohne parallele leere Stildefinition.
- **`U-GF-13` (Performance):** ein Textlauf ~500 000 Zeichen mit `underline` durch
  `writeOdt`/`readOdt` (und analog DOCX) mit großzügigem Zeitbudget (`performance.now()`,
  z. B. < 2000 ms) — Regressionsschutz gegen versehentlich quadratische Komplexität, kein
  strenger Benchmark. Niedrige Priorität.

### 4.5 Erweiterung `src/formats/docx/__tests__/external-validation.test.ts`

Fehlendes DOCX-Schema-Validierungs-Pendant zu `odt/__tests__/external-validation.test.ts:64`
(Req 5.7 / DoD 2): ein DOCX mit `underline`-Run über `writeDocx` exportieren und gegen das
OOXML-Schema mit dem **bereits als Dev-Dependency vorhandenen** `xmllint-wasm` validieren
(gleiche Mechanik wie der bestehende ODT-Validierungstest).

### 4.6 Neu: Cross-Format-Rundreisen als Unit-Tests (`U-RT-3/4/5`)

**Begründung (korrigiert):** Cross-Format-Export ist per UI **nicht** auslösbar (Intro
Punkt 2 / `DocumentWorkspace.tsx`). Req Abschnitt 5.3/5.4/5.5 verlangt trotzdem den Nachweis,
dass Unterstreichung einen Formatwechsel übersteht. Das ist auf Reader/Writer-Ebene
**deterministisch und vollständig** prüfbar und gehört daher hierher, nicht in E2E.

Neu: `src/formats/__tests__/cross-format-underline.test.ts` (oder je ein Block in den
beiden `underline.test.ts`):

```ts
// U-RT-3  DOCX -> ODT -> zurück
const a = await readDocx(fixture('docx/52449.docx'))     // reale Word-Datei, 9 underline-Runs
const odt = await writeOdt(a)
const b = await readOdt(odt)
expect(underlinedTexts(b.body)).toEqual(underlinedTexts(a.body)) // gleiche Stellen, kein Verlust

// U-RT-4  ODT -> DOCX -> zurück
const c = await readOdt(fixture('odt/character-styles.odt')) // "Lorem ipsum" underline (Span, in-scope)
const docx = await writeDocx(c)
const d = await readDocx(docx)
expect(underlinedTexts(d.body)).toContain('Lorem ipsum')

// U-RT-5  doppelte Runde DOCX -> ODT -> DOCX (kein kumulativer Verlust)
const e = await readDocx(await writeDocx(await readOdt(await writeOdt(a))))
expect(underlinedTexts(e.body)).toEqual(underlinedTexts(a.body))
```

Zusätzlich **`U-RT-8` (Kombi-Rundreise)** auf Unit-Ebene: konstruiertes JSON mit einem Lauf,
der gleichzeitig `strong`+`underline`+`textColor` trägt, durch DOCX- und ODT-Rundreise
schicken; prüfen, dass alle drei Marks **auf demselben Lauf** bleiben (nicht auf getrennte
Runs aufgespalten). Ergänzt die UI-Kombi-Rundreise 5.3 (`U-RT-8` E2E) auf Datenebene.

---

## 5. Teil B — E2E-Tests (Playwright, echte Browser-Bedienung)

Zentrale, laut Anforderungsabschnitt 7 bislang fehlende Ebene: echte Mausklicks,
`keyboard.type/press` in den echten `contenteditable`, echte Datei-Uploads, Export über den
echten `download`-Event mit nachträglichem Entpacken + Regex-Prüfung — **nie** interne
`readDocx`/`writeOdt`-Aufrufe.

### 5.1 Neue Datei: `tests/e2e/underline.spec.ts` — Helfer

```ts
import { test, expect, type Page } from '@playwright/test'
import JSZip from 'jszip'
import { DOCX_MIME, ODT_MIME } from './fixtures/builders'

function docxCard(page: Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })
}
function odtCard(page: Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'OpenDocument Text (.odt)' }) })
}

// Etablierter Konsolen-/JS-Fehler-Wächter (identisch cut.spec.ts).
function watchForConsoleErrors(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (err) => errors.push(String(err)))
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()) })
  return () => expect(errors, `Unerwartete Konsolen-/JS-Fehler: ${errors.join('\n')}`).toEqual([])
}

// Export über den EINEN, page-weiten "Exportieren"-Button (NICHT auf eine Karte scopen —
// die Karten sind nach dem Öffnen nicht mehr im DOM). Bytes aus download.path() lesen.
async function exportAndUnzip(page: Page): Promise<JSZip> {
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const download = await downloadPromise
  const path = await download.path()
  expect(path).toBeTruthy()
  const fs = await import('node:fs/promises')
  return JSZip.loadAsync(await fs.readFile(path!))
}

// Rückweg zur Formatauswahl + echter Re-Upload (committetes Muster docx.spec.ts:331).
async function reimport(page: Page, card: (p: Page) => ReturnType<typeof docxCard>, name: string, mimeType: string, buffer: Buffer) {
  await page.getByRole('button', { name: /formate/i }).click()
  await card(page).locator('input[type="file"]').setInputFiles({ name, mimeType, buffer })
}
```

### 5.1.1 `describe('Unterstrichen (einfach) — Toolbar & Tastatur')` — `U-TF-1 … U-TF-9`

```ts
test.describe('Unterstrichen (einfach) — Toolbar & Tastatur', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  })

  test('U-TF-1/2: Toolbar-Klick togglet an und aus, aria-pressed korrekt', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Testtext')
    await page.keyboard.press('ControlOrMeta+a')          // R1-Ausnahme: synchron, kein Puffer
    const button = page.getByTitle('Unterstrichen')
    await expect(button).toHaveAttribute('aria-pressed', 'false')
    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    await expect(editor.locator('u')).toContainText('Testtext')
    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'false')
    await expect(editor.locator('u')).toHaveCount(0)
  })

  test('U-TF-3: Strg+U liefert identisches Ergebnis wie der Klick', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Tastaturtest')
    await page.keyboard.press('ControlOrMeta+a')
    await page.keyboard.press('ControlOrMeta+u')
    await expect(editor.locator('u')).toContainText('Tastaturtest')
    await expect(page.getByTitle('Unterstrichen')).toHaveAttribute('aria-pressed', 'true')
    await page.keyboard.press('ControlOrMeta+u')
    await expect(editor.locator('u')).toHaveCount(0)
  })

  test('U-TF-4: Toggle an der Schreibmarke wirkt nur auf neu getippten Text', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Vorher')
    await page.keyboard.press('ControlOrMeta+u')
    await page.keyboard.type('Neu')
    await page.keyboard.press('ControlOrMeta+u')
    await page.keyboard.type('Nachher')
    await expect(editor.locator('u')).toContainText('Neu')
    await expect(editor.locator('u')).not.toContainText('Vorher')
    await expect(editor.locator('u')).not.toContainText('Nachher')
  })

  // U-TF-4a (Defekt A / code.md 3.8, Req Testfall 4) — PRIMÄRNACHWEIS für Defekt A:
  // Der Toolbar-Button muss auch per TASTATUR auslösbar sein. Der heutige Code bindet nur
  // `onMouseDown` (Toolbar.tsx:76-79); Enter/Leertaste auf einem nativen <button> feuern
  // aber nur `click`, KEIN `mousedown` -> Toggle läuft bei Tastaturbedienung nie.
  // -> HEUTE ERWARTET ROT, grün erst nach dem 3.8-Fix (onMouseDown behält nur
  // preventDefault, Toggle wandert nach onClick). CI-Handhabung siehe Abschnitt 10.
  // Strg+U (U-TF-3) deckt diesen Defekt NICHT ab — das läuft über die Keymap, einen
  // anderen Codepfad; hier wird der Button selbst tastaturbedient.
  test('U-TF-4a: Toolbar-Button per Tastatur auslösbar (Enter und Leertaste) — Defekt A', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    const button = page.getByTitle('Unterstrichen')
    await editor.click()
    await page.keyboard.type('Tastaturbutton')
    await page.keyboard.press('ControlOrMeta+a')       // synchron (R1-Ausnahme)
    await button.focus()                               // entspricht Tab-Fokus, ohne Tab-Stops zu zählen
    await expect(button).toBeFocused()
    await page.keyboard.press('Enter')                 // Aktivierung per Enter -> Toggle an
    await expect(editor.locator('u')).toContainText('Tastaturbutton')
    await button.focus()                               // view.focus() gab Fokus an den Editor zurück
    await page.keyboard.press('Space')                 // Aktivierung per Leertaste -> Toggle aus
    await expect(editor.locator('u')).toHaveCount(0)
  })

  // U-TF-8 (Defekt B / code.md 3.9, Req Testfall 5) — PRIMÄRNACHWEIS für Defekt B (storedMarks):
  // Nach Strg+U an einer LEEREN Schreibmarke muss der Button SOFORT aktiv sein, BEVOR ein
  // Zeichen getippt ist (toggleMark setzt state.storedMarks=[underline]). Der heutige Code
  // liest nur `$from.marks()` (Toolbar.tsx:69) und ignoriert storedMarks -> Button bleibt
  // fälschlich `false`. -> HEUTE ERWARTET ROT, grün nach dem 3.9-Fix (isMarkActive prüft
  // state.storedMarks im Empty-Fall). CI-Handhabung siehe Abschnitt 10. aria-pressed ist
  // web-first (R4); der Toggle setzt storedMarks synchron via Keymap, die Toolbar re-rendert
  // über forceRender (WordEditor.tsx:131) auf jeder Transaktion.
  test('U-TF-8: aria-pressed folgt storedMarks sofort nach Strg+U an leerer Schreibmarke (vor dem Tippen) — Defekt B', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    const button = page.getByTitle('Unterstrichen')
    await editor.click()
    await page.keyboard.type('Vorher')                 // Cursor am Ende, KEINE Selektion
    await page.keyboard.press('ControlOrMeta+u')        // setzt nur storedMarks, ändert das Dokument nicht
    await expect(button).toHaveAttribute('aria-pressed', 'true')   // KERN: aktiv OHNE Dokumentänderung
    await expect(editor.locator('u')).toHaveCount(0)    // storedMark != <u> im Dokument
    await page.keyboard.type('Neu')                     // jetzt tippen -> unterstrichen
    await expect(editor.locator('u')).toContainText('Neu')
    await expect(button).toHaveAttribute('aria-pressed', 'true')   // bleibt aktiv im unterstrichenen Text
  })

  // U-TF-5: Aktiv-Zustand folgt dem Cursor OHNE neue Aktion. Deterministisch dank
  // getrennter, klar unterstrichener vs. normaler Region und R2-Puffer nach jedem
  // Caret-Move; die aria-pressed-Assertion retryt web-first (R4).
  test('U-TF-5: Button-Aktiv-Zustand folgt der Cursorposition (Pfeiltasten, kein Klick)', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    const button = page.getByTitle('Unterstrichen')
    await editor.click()
    await page.keyboard.type('normal')
    await page.keyboard.press('Enter')
    await page.keyboard.type('unter')
    // "unter" (Zeile 2) selektieren und unterstreichen — Selektion per Home+Shift+End (R1)
    await page.keyboard.press('Home')
    await page.keyboard.down('Shift')
    await page.keyboard.press('End', { delay: 20 })
    await page.keyboard.up('Shift')
    await page.waitForTimeout(50)                 // R1-Puffer vor der Aktion
    await button.click()
    await expect(editor.locator('u')).toContainText('unter')
    // Cursor mitten in "unter" -> aktiv
    await page.keyboard.press('ArrowLeft')        // Selektion nach links kollabieren
    await page.keyboard.press('ArrowRight')       // in den unterstrichenen Bereich
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    // Cursor in "normal" (Zeile 1) -> inaktiv
    await page.keyboard.press('ControlOrMeta+Home')
    await expect(button).toHaveAttribute('aria-pressed', 'false')
  })

  // U-TF-6 / U-GF-4: gemischte Selektion (3.4) + reine-Leerzeichen-Selektion, kein Crash.
  test('U-TF-6/U-GF-4: gemischte Selektion und Leerzeichen-Selektion', async ({ page }) => {
    const assertNoErrors = watchForConsoleErrors(page)
    const editor = page.locator('.ProseMirror')
    const button = page.getByTitle('Unterstrichen')
    await editor.click()
    await page.keyboard.type('eins zwei')
    // nur "eins " unterstreichen (5 Zeichen) — R1
    await page.keyboard.press('Home')
    await page.keyboard.down('Shift')
    for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight', { delay: 20 })
    await page.keyboard.up('Shift')
    await page.waitForTimeout(50)
    await button.click()
    await expect(editor.locator('u')).toContainText('eins')
    // gesamte (gemischte) Selektion togglen — Req 3.4: nicht vollständig unterstrichen ->
    // erster Klick unterstreicht ALLES; ControlOrMeta+a ist synchron (R1-Ausnahme).
    await page.keyboard.press('ControlOrMeta+a')
    await button.click()
    await expect(editor.locator('u')).toContainText('eins zwei')
    await button.click()                          // jetzt vollständig -> entfernt
    await expect(editor.locator('u')).toHaveCount(0)
    // reine Leerzeichen-Selektion darf nicht crashen
    await page.keyboard.press('ControlOrMeta+a')
    await page.keyboard.press('Delete')
    await page.keyboard.type('a   b')
    await page.keyboard.press('Home')
    for (let i = 0; i < 1; i++) await page.keyboard.press('ArrowRight', { delay: 20 })
    await page.keyboard.down('Shift')
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight', { delay: 20 })
    await page.keyboard.up('Shift')
    await page.waitForTimeout(50)
    await button.click()
    await expect(editor).toBeVisible()
    assertNoErrors()
  })

  test('U-TF-7: Fett + Unterstrichen + Schriftfarbe gleichzeitig, unabhängig entfernbar', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Kombiniert')
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Fett').click()
    await page.getByTitle('Unterstrichen').click()
    await page.getByLabel('Textfarbe').fill('#ff0000')
    await expect(editor.locator('strong u')).toContainText('Kombiniert')  // Schema-Nest-Reihenfolge
    await expect(editor.locator('span[style*="color"]')).toContainText('Kombiniert')
    // Unterstrichen einzeln entfernen -> Fett + Farbe bleiben
    await page.getByTitle('Unterstrichen').click()
    await expect(editor.locator('u')).toHaveCount(0)
    await expect(editor.locator('strong')).toContainText('Kombiniert')
    await expect(editor.locator('span[style*="color"]')).toContainText('Kombiniert')
  })

  // U-TF-9: Undo/Redo als GETRENNTE Schritte -> R3-Group-Delays zwischen den Phasen,
  // damit history sie nicht zu einem Schritt verschmilzt. Web-first-Assertions (R4).
  test('U-TF-9: Undo/Redo über Tippen -> an -> aus -> Tippen', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('A')
    await page.waitForTimeout(600)                 // "A" als eigener Undo-Schritt (R3)
    await page.keyboard.press('ControlOrMeta+u')   // storedMark an
    await page.keyboard.type('B')                  // "B" unterstrichen
    await page.waitForTimeout(600)
    await page.keyboard.press('ControlOrMeta+u')   // storedMark aus
    await page.keyboard.type('C')                  // "C" normal
    await expect(editor.locator('u')).toContainText('B')
    await expect(editor).toContainText('ABC')
    await page.keyboard.press('ControlOrMeta+z')   // "C" weg
    await expect(editor).toContainText('AB')
    await expect(editor).not.toContainText('ABC')
    await page.keyboard.press('ControlOrMeta+z')   // "B" weg
    await expect(editor).toContainText('A')
    await expect(editor).not.toContainText('AB')
    await page.keyboard.press('ControlOrMeta+Shift+z') // Redo -> "B" zurück, weiter unterstrichen
    await expect(editor).toContainText('AB')
    await expect(editor.locator('u')).toContainText('B')
  })
})
```

**Hinweis zur Undo-Granularität (Req 3.2, offener Klärungspunkt):** Ob reines Umschalten des
`storedMark` **ohne** nachfolgende Eingabe einen eigenen Undo-Schritt/Dokumentsprung erzeugt,
ist beim Schreiben von `U-TF-9` empirisch festzuhalten und das Ergebnis in
`unterstrichen-einfach-req.md` Abschnitt 3.2 nachzutragen (DoD Punkt 6). Der Test oben tippt
nach jedem Toggle bewusst Text, um Reproduzierbarkeit unabhängig von dieser Klärung zu
sichern.

### 5.1.2 `describe('Unterstrichen (einfach) — Grenzfälle')` — `U-GF-1 … U-GF-15`

Ein dedizierter Test je Grenzfall (Req Abschnitt 6, Testfall 13: „kein Sammeltest").

| ID | Kurz | Testidee (Playwright, mit Determinismus-Regel) |
|---|---|---|
| `U-GF-1` | Toggle an `hard_break`-Grenze | `watchForConsoleErrors`; `Shift+Enter`, Cursor davor/danach, `Strg+U`, dann tippen; assert kein JS-Fehler, neuer Text unterstrichen |
| `U-GF-2` | Selektion über Absatzgrenze | zwei Absätze; `Home` in Absatz 2, `Shift+ArrowUp` ×2 mit `{delay:20}`, `up('Shift')`, **`waitForTimeout(50)` (R1)**, `Strg+U`; `editor.locator('u')` deckt beide Absätze |
| `U-GF-3` | Selektion über Zellgrenze | Tabelle einfügen; Text in zwei Zellen; `CellSelection` per Maus-Drag zwischen den Zellen (Muster `cut.spec.ts` Testfall 7: `boundingBox` + `mouse.down/move({steps:5})/up`) statt Tastatur — deterministischer als das Erraten einer Tastenkombi; `Strg+X`→hier `Strg+U`; beide Zellen unterstrichen, keine Nachbarzelle betroffen, kein Crash |
| `U-GF-4` | reine Leerzeichen-Selektion | in `U-TF-6` enthalten |
| `U-GF-5` (korrigiert, code.md 3.6: `image` ist Block-Node) | Selektion Text→benachbarter Bild-Block | `watchForConsoleErrors`; Text tippen, Bild einfügen (`label:has-text("Bild")` → `input[type=file]`, Mini-PNG als Buffer, gleiche Base64-Konstante wie `cut.spec.ts`), Selektion Textanfang→über die Blockgrenze (`Shift+ArrowDown`/`Shift+End` mit `{delay:20}` + **`waitForTimeout(50)`**), `Strg+U`; kein Crash, Text unterstrichen, `img`-Count unverändert 1 |
| `U-GF-6` | zwei schnelle `Strg+U` → deterministisch „aus" | **zwei sequenzielle** `press('ControlOrMeta+u')` (NICHT `Promise.all` — parallele Keydowns sind selbst nicht deterministisch). Jeder Druck ist ein diskretes `toggleMark`-Kommando → nach zweien wieder „aus": `expect(editor.locator('u')).toHaveCount(0)` |
| `U-GF-7` | Undo/Redo nach „fett→unterstrichen→unterstrichen-aus" | wie `U-TF-9`, erster Schritt `Fett`; R3-Delays zwischen den Phasen; jeder Einzelschritt per Undo geprüft |
| `U-GF-8` | Selection-Sync mit „Unterstrichen" | **Nicht** hier, sondern dauerhaft in `selection-regression.spec.ts` (5.2) — DoD Punkt 4 |
| `U-GF-9` | DOCX `w:val`-Fremdwerte | **Unit** 4.2.3 (Browser-Upload einer handgebauten XML wäre nur ein Duplikat) |
| `U-GF-10` | ODT `text-underline-style`-Fremdwert | **Unit** 4.3.3 |
| `U-GF-11` | Stilnamen-Dedup | **Unit** 4.4 |
| `U-GF-12` | nur-Underline-Datei | **Unit** 4.4; zusätzlich E2E-Rauchtest: neues ODT, nur Unterstrichen, exportieren, `content.xml` enthält `text-underline-style="solid"`, keine zusätzliche leere `<style:style>` |
| `U-GF-13` | Performance lange Läufe | **Unit** 4.4; optionaler E2E-Rauchtest mit `page.keyboard.insertText(langerString)` (schneller/deterministischer als `type`) + `Strg+U`; niedrige Priorität |
| `U-GF-14` | Groß-/Kleinschreibung | **Unit** 4.2.4 / 4.3.3 |
| `U-GF-15` | Fokus-Erhalt nach Toolbar-Klick | Code-Block unten |

```ts
test('U-GF-15: Fokus + Selektion bleiben nach Toolbar-Klick erhalten', async ({ page }) => {
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Fokustest')
  await page.keyboard.press('ControlOrMeta+a')
  await page.getByTitle('Unterstrichen').click()
  await expect(editor).toBeFocused()
  // Selektion erhalten: direktes Tippen ERSETZT "Fokustest" (kein Anhängen, kein Cursor-Sprung)
  await page.keyboard.type('Ersetzt')
  await expect(editor).toContainText('Ersetzt')
  await expect(editor).not.toContainText('Fokustest')
})
```

### 5.2 Erweiterung: `tests/e2e/selection-regression.spec.ts` (`U-GF-8`)

Neuer Test **im bestehenden `describe`-Block** (DoD Punkt 4: dauerhaft verankert, nicht in
separater Datei), exakt analog zum committeten Bold-Test — inklusive des **zwingenden**
`waitForTimeout(50)` zwischen `End` und `Enter` (R2). Der Vorentwurf ließ genau diesen Puffer
weg und hätte die bereits behobene Flakiness reaktiviert.

```ts
test('same regression with "Unterstrichen" instead of "Fett" (Grenzfall 8 / U-GF-8)', async ({ page }) => {
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Hallo, das ist ein Test.')
  await page.keyboard.press('ControlOrMeta+a')
  await page.getByTitle('Unterstrichen').click()
  await editor.click()
  await page.keyboard.press('End')
  await page.waitForTimeout(50)                 // R2 — identisch zum Bold-Test in dieser Datei
  await page.keyboard.press('Enter')
  await page.keyboard.type('Zweiter Absatz.')
  await expect(editor).toContainText('Hallo, das ist ein Test.')
  await expect(editor).toContainText('Zweiter Absatz.')
  await expect(page.locator('.ProseMirror p')).toHaveCount(2)
  // beide Absätze behalten ihre korrekte Unterstreichung
  await expect(page.locator('.ProseMirror p').nth(0).locator('u')).toContainText('Hallo, das ist ein Test.')
  await expect(page.locator('.ProseMirror p').nth(1).locator('u')).toHaveCount(0)
})
```

### 5.3 Rundreisen (`U-RT-1`, `U-RT-2`, `U-RT-6/7`, `U-RT-8`) — echte Uploads/Exporte

**Nur Gleichformat-Rundreisen** (die einzige per UI mögliche Variante). Cross-Format
(`U-RT-3/4/5`) läuft als Unit-Test (4.6). Echter Upload (`setInputFiles`), echter Export
(`waitForEvent('download')` + `JSZip`), keine internen Reader/Writer-Aufrufe.

```ts
test.describe('Unterstrichen (einfach) — Rundreisen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
  })

  test('U-RT-1: DOCX-Eigenrundreise über echte Toolbar-Bedienung', async ({ page }) => {
    await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Unterstrichener Text')
    await page.keyboard.press('ControlOrMeta+a')                 // synchron (R1-Ausnahme)
    await page.getByTitle('Unterstrichen').click()

    const zip = await exportAndUnzip(page)
    const documentXml = await zip.file('word/document.xml')!.async('text')
    expect(documentXml).toMatch(/<w:u\s+w:val="single"\s*\/>/)   // verschärft ggü. Substring '<w:u '
    const buffer = await zip.generateAsync({ type: 'nodebuffer' })

    await reimport(page, docxCard, 'reimport.docx', DOCX_MIME, buffer)
    await expect(page.locator('.ProseMirror u')).toContainText('Unterstrichener Text')
  })

  test('U-RT-2: ODT-Eigenrundreise über echte Toolbar-Bedienung', async ({ page }) => {
    await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Unterstrichener Text')
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Unterstrichen').click()

    const zip = await exportAndUnzip(page)
    const contentXml = await zip.file('content.xml')!.async('text')
    expect(contentXml).toContain('style:text-underline-style="solid"')
    const buffer = await zip.generateAsync({ type: 'nodebuffer' })

    await reimport(page, odtCard, 'reimport.odt', ODT_MIME, buffer)
    await expect(page.locator('.ProseMirror u')).toContainText('Unterstrichener Text')
  })

  test('U-RT-6/7 DOCX: reale Word-Datei importieren, Export unabhängig von readDocx geprüft', async ({ page }) => {
    const fs = await import('node:fs/promises')
    const path = await import('node:path')
    const buffer = await fs.readFile(path.join(process.cwd(), 'tests/fixtures/external/docx/52449.docx'))
    await docxCard(page).locator('input[type="file"]').setInputFiles({ name: '52449.docx', mimeType: DOCX_MIME, buffer })
    await expect(page.locator('.ProseMirror u').first()).toBeVisible()   // reale underline-Runs sichtbar
    const zip = await exportAndUnzip(page)
    const documentXml = await zip.file('word/document.xml')!.async('text')
    expect(documentXml).toMatch(/<w:u\s+w:val="single"\s*\/>/)           // Regex, NICHT über readDocx
  })

  test('U-RT-6/7 ODT: reale LibreOffice-Datei importieren, Export unabhängig von readOdt geprüft', async ({ page }) => {
    const fs = await import('node:fs/promises')
    const path = await import('node:path')
    const buffer = await fs.readFile(path.join(process.cwd(), 'tests/fixtures/external/odt/character-styles.odt'))
    await odtCard(page).locator('input[type="file"]').setInputFiles({ name: 'character-styles.odt', mimeType: ODT_MIME, buffer })
    await expect(page.locator('.ProseMirror u')).toContainText('Lorem ipsum')
    const zip = await exportAndUnzip(page)
    const contentXml = await zip.file('content.xml')!.async('text')
    expect(contentXml).toContain('style:text-underline-style="solid"')
  })

  test('U-RT-8: kombiniert fett + farbig + unterstrichen bleibt über die Rundreise erhalten', async ({ page }) => {
    await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Kombitext')
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Fett').click()
    await page.getByTitle('Unterstrichen').click()
    await page.getByLabel('Textfarbe').fill('#0000ff')

    const zip = await exportAndUnzip(page)
    const buffer = await zip.generateAsync({ type: 'nodebuffer' })
    await reimport(page, odtCard, 'kombi.odt', ODT_MIME, buffer)
    const reimported = page.locator('.ProseMirror')
    await expect(reimported.locator('strong u')).toContainText('Kombitext')
    await expect(reimported.locator('span[style*="color"]')).toContainText('Kombitext')
  })
})
```

**Verschärfung `tests/e2e/clipboard-roundtrip.spec.ts` (Testfall 10):** die schwache
Assertion `expectedXml: '<w:u '` auf `/<w:u\s+w:val="single"\s*\/>/` heben und zusätzlich
sicherstellen, dass **kein anderer** Run fälschlich `w:u` trägt (z. B. Anzahl der
`w:val="single"`-Vorkommen gegen die Anzahl unterstrichener Läufe prüfen). Bereits durch
`U-RT-1`/`U-RT-6-7` mit abgedeckt; die Bestandsdatei wird zusätzlich nachgezogen, damit sie
nicht länger als Falschbeleg dient (Req Abschnitt 0/7).

### 5.4 Paste-Test (`U-TF-14` / Grenzfall 16) — Chromium-only

```ts
test('U-TF-14/U-GF-16: Paste erkennt <u> und text-decoration:underline; underline line-through geht verloren (dokumentiert)', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'clipboard-read/-write nur unter Chromium zuverlässig (siehe cut.spec.ts Testfall 12).') // R5
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await page.getByRole('button', { name: /verstanden/i }).click()
  await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()

  // 1) <u>-HTML wird als Unterstrichen erkannt
  await page.evaluate(async () => {
    const html = '<p><u>Aus u-Tag</u></p>'
    await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }) })])
  })
  await page.keyboard.press('ControlOrMeta+v')
  await expect(editor.locator('u')).toContainText('Aus u-Tag')

  // 2) text-decoration: underline wird erkannt
  await page.evaluate(async () => {
    const html = '<p><span style="text-decoration: underline">Aus Style</span></p>'
    await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }) })])
  })
  await page.keyboard.press('ControlOrMeta+v')
  await expect(editor.locator('u')).toContainText('Aus Style')

  // 3) zusammengesetzter Wert -> Unterstreichung geht verloren (dokumentiertes Ist, schema.ts:171
  //    matcht exakt "text-decoration=underline"). Kein stiller Verlust: hier explizit fixiert.
  await page.evaluate(async () => {
    const html = '<p><span style="text-decoration: underline line-through">Zusammengesetzt</span></p>'
    await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }) })])
  })
  await page.keyboard.press('ControlOrMeta+v')
  await expect(editor).toContainText('Zusammengesetzt')
  await expect(editor.locator('u')).not.toContainText('Zusammengesetzt') // dokumentierter Verlust (Req 3.6/DoD 5)
})
```

### 5.5 Sichtprüfung (`U-TF-15`) — bewusst als niedrigprioritär und determinismus-gehärtet

Ein Screenshot-Vergleich der Unterstreichungslinie ist über Viewports/Schriftrendering
**inhärent nicht deterministisch** und widerspricht dem Determinismus-Auftrag, wenn er auf
allen drei Projekten mit strikter Pixelgleichheit läuft. Deshalb:

- Nur auf **„Desktop Chrome"** ausführen (`test.skip(testInfo.project.name !== 'Desktop
  Chrome', …)`) — eine stabile Baseline, kein Viewport-Rauschen.
- `toHaveScreenshot('underline.png', { maxDiffPixelRatio: 0.02 })` (Toleranzbudget gegen
  Sub-Pixel-Antialiasing), Baseline initial per `--update-snapshots`.
- Vergleich: Editor-Darstellung der Unterstreichung **vor** Export vs. **nach** Re-Import
  derselben Datei — ein Sprung deutet auf fehlerhaften Reader/Writer hin.

Alternativ (falls Screenshot-Baselines im CI unerwünscht sind) genügt zur Erfüllung von
Req Abschnitt 6/Testfall 15 die **strukturelle** Prüfung, dass nach Re-Import erneut genau
`.ProseMirror u` mit demselben Text existiert (bereits durch `U-RT-2` abgedeckt) — dann
`U-TF-15` als optionalen Zusatz führen, nicht als Blocker.

---

## 6. Nomenklatur

- `U-TF-<n>` — Testfall aus Req Abschnitt 6; `U-GF-<n>` — Grenzfall aus Req Abschnitt 4;
  `U-RT-<n>` — Rundreise aus Req Abschnitt 5; `U-BUG-<n>` — in `unterstrichen-einfach-code.md`
  Abschnitt 3 dokumentierter Fund (Nummer folgt der dortigen Abschnittsnummer).
- IDs erscheinen im Testnamen und in Commit-/PR-Texten, damit die Abnahme (Req Abschnitt 8)
  eindeutig nachvollziehbar bleibt.

---

## 7. Abnahme-Mapping (Anforderung → Testartefakt)

| Anforderung | Testfall-ID | Datei |
|---|---|---|
| Req 6, Testfälle 1–9 | `U-TF-1 … U-TF-9` | `tests/e2e/underline.spec.ts` (Toolbar & Tastatur) |
| **Defekt A** (Button per Tastatur, code.md 3.8) | `U-TF-4a` | `tests/e2e/underline.spec.ts` — Primärnachweis, siehe Abschnitt 10 |
| **Defekt B** (aria-pressed folgt `storedMarks`, code.md 3.9) | `U-TF-8` | `tests/e2e/underline.spec.ts` — Primärnachweis, siehe Abschnitt 10 |
| Req 6, Testfall 8 / Grenzfall 8 | `U-GF-8` | `tests/e2e/selection-regression.spec.ts` (Erweiterung) |
| Req 6, Testfall 10 (Export-Assertion verschärft) | `U-RT-1`, `U-RT-6/7`, + Nachzug `clipboard-roundtrip.spec.ts` | `tests/e2e/underline.spec.ts` |
| Req 6, Testfall 11 (UI-ODT-Export, fehlte) | `U-RT-2` | `tests/e2e/underline.spec.ts` |
| Req 6, Testfall 12 (Rundreisen) | `U-RT-1/2/6/7/8` + Unit 4.6 (`U-RT-3/4/5`) | E2E + Vitest |
| Req 6, Testfall 13 (Grenzfälle) | `U-GF-1 … U-GF-15` | `tests/e2e/underline.spec.ts` + Unit 4.2–4.4 |
| Req 6, Testfall 14 (Paste) | `U-TF-14`/`U-GF-16` | `tests/e2e/underline.spec.ts` (Chromium-only) |
| Req 6, Testfall 15 (Sichtprüfung) | `U-TF-15` | `tests/e2e/underline.spec.ts` (Desktop Chrome, optional) |
| Req 5, Rundreise 1–2 (Eigen) | `U-RT-1`, `U-RT-2` | E2E |
| Req 5, Rundreise 3–5 (Cross-Format, UI unmöglich) | `U-RT-3/4/5` | **Unit** `cross-format-underline.test.ts` (4.6) |
| Req 5, Rundreise 6 (reale Fremddatei) | `U-RT-6/7` (`52449.docx`, `character-styles.odt`) | E2E + Unit 4.2/4.3 |
| Req 5, Rundreise 7 (unabhängiger Parser) | `U-RT-6/7` (Regex, ohne Reader) + DOCX-Schema-Validierung 4.5 + Manuell 11 | E2E + Vitest + Manuell |
| Req 5, Rundreise 8 (kombiniert) | `U-RT-8` (E2E) + Unit 4.6 | E2E + Vitest |
| Grenzfall 9/10/11/12/13/14 | 4.2.3 / 4.3.3 / 4.4 / 4.4 / 4.4 / 4.2.4+4.3.3 | Vitest |
| `U-BUG-3.1` (ODT Absatzstil) | 4.3.4 / 4.3.5 | Vitest — siehe Abschnitt 10 |
| `U-BUG-3.2` (DOCX Formatvorlagen-Default) | 4.2.5 | Vitest — siehe Abschnitt 10 |
| Korrektur 3.5 (`<text:a>` NICHT ignoriert) | bereits grün `external-fixtures.test.ts` „U-4" + 4.3.6 | Vitest |
| DoD 2 (unabhängiger Parser / DOCX-Schema) | 4.5 + `U-RT-6/7` + Manuell 11 | — |
| DoD 4 (Regressionstest verankert) | `U-GF-8` | — |
| DoD 5 (Fallback dokumentiert) | 4.2.3/4.2.4, 4.3.3, `U-TF-14`, Abschnitt 10 | — |
| DoD 6 (offene Klärungen 3.2/3.6/3.7) | `U-TF-9`-Hinweis (storedMark), `U-TF-14` (Paste), `U-GF`-Überschrift-Test unten | — |

**Zusatz zu DoD 6 / Req 3.7 (Unterstrichen in Überschrift):** ein E2E-Test — Absatzformat
per `getByLabel('Absatzformat')` auf „Überschrift 1", Text, `Strg+A`, `Strg+U` — prüft, dass
`.ProseMirror h1 u` sichtbar ist (Unterstreichung in Überschrift **sichtbar**, anders als
Fett), und die ODT/DOCX-Rundreise (analog `U-RT-1/2`) sie erhält, ohne die
Überschriften-Formatvorlage zu beschädigen. Ergebnis in Req 3.7 nachtragen.

---

## 8. Bestehende Tests: neu bewerten (Req Abschnitt 0/7)

- `tests/e2e/clipboard-roundtrip.spec.ts:194-202` — prüft nur Substring `'<w:u '`:
  **unzureichend**, verschärfen (5.3).
- `tests/e2e/docx.spec.ts:301` / `tests/e2e/odt.spec.ts:277` — prüfen nur **Import** einer
  selbst erzeugten Fixture: als Teilnachweis behalten, aber **keine** vollständige
  UI-Rundreise; ersetzt durch `U-RT-1/2`.
- `src/formats/{docx,odt}/__tests__/roundtrip.test.ts` (underline) — konstruiertes JSON:
  behalten (4.1), ersetzt nicht die Fremddatei-/Cross-Format-Tests.

---

## 9. Ausführung — Kommandos

```bash
# Unit-Tests
npm test                              # vitest run (inkl. neuer underline.test.ts + cross-format)
npm test -- underline                 # nur Underline-Unit-Tests (Namensfilter)

# E2E (Playwright startet Preview-Server automatisch)
npm run test:e2e -- tests/e2e/underline.spec.ts
npm run test:e2e -- tests/e2e/selection-regression.spec.ts
npm run test:e2e -- --update-snapshots tests/e2e/underline.spec.ts   # Baseline U-TF-15 (Desktop Chrome)
```

---

## 10. Umgang mit den Bug-Tests (CI-grün UND ehrlich)

Vier neue Tests treffen reale, noch nicht behobene Bugs: zwei Unit-Tests die Reader-Bugs
(`unterstrichen-einfach-code.md` 3.1/3.2) **und** die zwei E2E-Tests `U-TF-4a` (Defekt A,
Button-Tastaturbedienung, code.md 3.8) und `U-TF-8` (Defekt B, `storedMarks`-Aktivzustand,
code.md 3.9). Ziel ist, sie **weder** grün zu lügen (Assertion auf das falsche Verhalten)
**noch** die CI dauerhaft rot zu lassen (der Pipeline-Grundsatz verlangt grüne CI nach
jedem Schritt). Reihenfolge der Präferenz:

1. **Bevorzugt — Test + Fix im selben Arbeitspaket:** Die Assertion beschreibt das
   **korrekte Soll** (`toContain('underline')`), und der zugehörige Reader-Fix aus code.md
   3.1/3.2 wird **im selben PR** mitgeliefert. Dann ist der Test von Anfang an grün und
   ehrlich. Das ist der Regelfall, weil code.md die Fixes ohnehin als „Hoch"-Priorität führt.
2. **Falls Tests vor dem Fix landen müssen — expliziter xfail-Marker:** In Vitest
   `it.fails('… (KNOWN BUG U-BUG-3.1, remove marker when odt/reader.ts paragraph-style fix
   lands)', …)` mit Soll-Assertion. `it.fails` ist grün, **solange** die Soll-Assertion
   fehlschlägt, und schlägt **rot** um, sobald der Bug behoben ist — das erzwingt aktiv das
   Entfernen des Markers und verhindert stilles Vergessen. Der Testname deklariert den Bug,
   also kein „grün lügen".
3. **Verboten:** `it.skip`/`test.skip` ohne Bug-Bezug, oder Assertion auf das aktuell falsche
   Verhalten — genau die in Req Abschnitt 7 kritisierte Praxis.

| Test | Bug | Präferenz | Muss vor Status „verifiziert" grün? |
|---|---|---|---|
| 4.3.4 / 4.3.5 (`Tabelle1.odt`, `solid` auf Absatzstil) | `U-BUG-3.1` | Fix mitliefern | **Ja** — rundreiserelevant (Req 5), DoD 4 |
| 4.2.5 (DOCX Formatvorlagen-Default) | `U-BUG-3.2` | Fix mitliefern | **Ja** (Konsistenz zum ODT-Bug; Code-Pfad strukturell gleich riskant) |
| 4.2.4 (`w:val="NONE"` Groß-/Kleinschreibung) | Härtung 3.3 | Fix mitliefern oder `it.fails` | Empfohlen; sonst als bekannte Restlücke im DoD vermerken |
| 4.3.6 (`hyperlinkSpaces.odt`, Underline via `parent-style-name`) | `U-BUG-3.3` (out of scope) | Test prüft **Text überlebt** (grün) + kommentiert fehlende Underline als bekannt (`hyperlink-einfuegen-req.md`) | **Nein** — dokumentierter Fund, kein Fix in diesem Ticket (DoD 5 via Doku erfüllt) |
| `U-TF-4a` (Button-Tastaturbedienung Enter/Space) | Defekt A / 3.8 (UI, „hoch") | Fix mitliefern (Toolbar `onMouseDown`→`onClick`) | **Ja** — DoD Punkt 2 verlangt Defekt A behoben **und** mit Regressionstest abgesichert |
| `U-TF-8` (aria-pressed folgt `storedMarks`) | Defekt B / 3.9 (UI, „hoch") | Fix mitliefern (`isMarkActive`) | **Ja** — DoD Punkt 2 verlangt Defekt B behoben **und** mit Regressionstest abgesichert |

**Playwright-Äquivalent zu `it.fails`:** Muss ein E2E-Test (`U-TF-4a`/`U-TF-8`)
ausnahmsweise **vor** dem UI-Fix landen, ist `test.fail()` zu verwenden (Playwright markiert
den Test als erwartet-fehlschlagend: grün solange die Assertion rot ist, rot sobald der Fix
sie grün macht — erzwingt aktiv das Entfernen des Markers). Bevorzugt bleibt aber „Fix +
Test im selben PR", weil code.md Defekt A/B als „hoch" führt und die Fixes klein/lokal sind.

---

## 11. Unabhängige Parser-Validierung (DoD Punkt 2, manueller Einmalschritt)

Automatisiert deckt `U-RT-6/7` (Regex direkt gegen `document.xml`/`content.xml`, **ohne**
`readDocx`/`readOdt`) plus die neue DOCX-Schema-Validierung (4.5) „unabhängig vom eigenen
Reader" weitgehend ab — bleibt aber dieselbe Laufzeit wie die App. Zusätzlich **einmalig vor
dem Statuswechsel** (bewusst **nicht** in CI — keine Python-Laufzeit einführen):

1. Export lokal auslösen (`npm run test:e2e -- tests/e2e/underline.spec.ts -g "U-RT-6/7"`;
   Datei aus dem Playwright-Artefakt/Trace ziehen oder im Dev-Server manuell exportieren).
2. DOCX mit `python-docx` öffnen und `run.underline` prüfen:
   ```python
   from docx import Document
   for p in Document('export.docx').paragraphs:
       for r in p.runs:
           if r.underline: print('python-docx erkennt Unterstreichung:', r.text)
   ```
3. ODT in **LibreOffice Writer** öffnen und visuell bestätigen (LibreOffice = unabhängige
   ODF-Referenz).
4. Ergebnis (Datum, Versionen, Ausgabe/Screenshot) in Abschnitt 12 eintragen — sonst ist
   DoD Punkt 2 nicht erfüllt, egal wie grün die automatisierte Suite ist.

---

## 12. Vermerk manueller Prüfschritt (bei Durchführung ausfüllen)

| Datum | Von | python-docx-Ergebnis | LibreOffice-Ergebnis | Anmerkungen |
|---|---|---|---|---|
| _offen_ | _offen_ | _offen_ | _offen_ | Noch nicht durchgeführt — Abschnitt 11. Vor Statuswechsel auf „verifiziert" nachzutragen (DoD 2). |

---

## 13. Offene Punkte / Risiken für die Umsetzung

1. **`U-GF-3` (Tabellen-Zellgrenze):** welche Aktion eine `CellSelection` erzeugt, ist am
   konkreten Editor-Setup zu bestätigen — der Plan setzt auf den **committeten** Maus-Drag
   zwischen Zellen (`cut.spec.ts` Testfall 7), nicht auf eine zu erratende Tastenkombi.
2. **`U-BUG-3.1`/`3.2`:** siehe Abschnitt 10 — Test bevorzugt gemeinsam mit dem Reader-Fix
   landen, sonst xfail-Marker; im PR-Text transparent machen.
3. **DoD Punkt 2:** bleibt bis zur manuellen Durchführung offen (Abschnitt 11/12).
4. **`U-GF-5`/Bild-Upload:** dieselbe Mini-PNG-Base64-Konstante wie in `cut.spec.ts`
   verwenden (kein neues Binär-Asset ins Repo aufnehmen).
5. **Mobile-CI-Vorbehalt (R5):** falls `U-TF-6` (gemischte `Shift+Pfeil`-Selektion) auf dem
   „Mobile"-Projekt in CI als No-Op flaket, denselben dokumentierten
   `test.skip(testInfo.project.name === 'Mobile', …)` setzen wie in `cut.spec.ts` — aber
   erst bei belegter CI-Flake, nicht prophylaktisch.
6. **Req 3.10 (`formatierung-loeschen`) / 3.11 (Hyperlinks):** Zielfunktionen fehlen; im
   Testfile als „nicht anwendbar, Zielfunktion fehlt" vermerken, nicht stillschweigend
   auslassen (Req 3.10/3.11).
