# Testplan „Kursiv" — QA-Verifikation

Gegenstück zu `specs/kursiv-req.md` (Anforderung) und `specs/kursiv-code.md`
(Umsetzungsplan). Dieses Dokument legt fest, **welche Tests** geschrieben
werden, **wo** sie liegen, **wie** sie **deterministisch** ausgeführt werden und
**wann** ein Punkt als abgehakt gilt. Es ist in zwei Ebenen gegliedert, die sich
gegenseitig ergänzen, wobei **keine die andere ersetzen darf**:

1. **Unit-Tests** (Vitest, `jsdom`) für die Reader/Writer-Rundreise auf
   Daten-/XML-Ebene — schnell, präzise, aber blind gegenüber Toolbar/Tastatur/
   echtem Datei-Dialog.
2. **Echte Playwright-Browser-Tests** — Klicks auf den tatsächlichen
   „Kursiv"-Button, echte Tastatureingabe, echter `setInputFiles()`-Upload,
   echter `page.waitForEvent('download')`-Export, Prüfung der **tatsächlich
   heruntergeladenen Datei** vom Datenträger (nicht nur ein interner
   Funktionsaufruf von `readDocx`/`readOdt`/`writeDocx`/`writeOdt`).

Beide Ebenen sind laut Anforderung Abschnitt 6/7 Pflicht. Ein Test, der nur
`readDocx(buffer)`/`writeOdt(doc)` direkt aufruft, zählt **nicht** als Ebene 2,
auch wenn er in `tests/e2e/` liegt.

**Korrektur gegenüber der Vorfassung dieses QA-Dokuments:** Die Vorfassung
behauptete, Ebene 2 (echte Browser-Bedienung von Kursiv) „fehle bisher
vollständig" (angeblich belegt durch `kursiv-req.md` Zeile 35–43). Das ist
**sachlich falsch** — genau jene Zeilen der Anforderung widerlegen diese
Behauptung und katalogisieren die **bereits vorhandene, substanzielle**
Kursiv-E2E-Abdeckung (u. a. `clipboard-roundtrip.spec.ts:190` klickt real
`getByTitle('Kursiv')`; `docx.spec.ts:300`/`odt.spec.ts:276`;
`roundtrip-fidelity.spec.ts`). Dieser Plan baut Abdeckung daher **nicht von
null** auf, sondern füllt ausschließlich die in `kursiv-req.md` Abschnitt 0b /
`kursiv-code.md` Abschnitt 5.0 benannten **real verbliebenen Lücken** (Abschnitt
1.1 bzw. 2.0 unten katalogisieren den Bestand, der nicht neu gebaut wird).

Referenzierte reale Fixtures: `tests/fixtures/external/docx/form_footnotes.docx`
und `tests/fixtures/external/docx/bug65649.docx` (echte `<w:i w:val="0"/>`-Fälle,
siehe `kursiv-code.md` Abschnitt 7).

---

## 0. Ausführung

| Ebene | Befehl | Neue/geänderte Dateien |
|---|---|---|
| Unit | `npm test` (`vitest run`) | siehe Abschnitt 1 |
| Browser/E2E | `npm run test:e2e` (`playwright test`) | siehe Abschnitt 2 |

Beide Suiten müssen über **alle** Playwright-Projekte (inkl. `Mobile *`, s. u.)
grün sein, bevor „Kursiv" laut DoD (Anforderung Abschnitt 7) als
„vertrauenswürdig vorhanden" gilt. Reihenfolge der Umsetzung: zuerst die Fixes
aus `kursiv-code.md` Abschnitt 4 (sonst schlagen mehrere der hier verlangten
Tests **erwartungsgemäß** fehl — sie sind als Regressionsnachweis der Fixes
formuliert), dann Unit-Tests, dann E2E-Tests, dann gemeinsamer Lauf beider
Suiten gegen den gefixten Code.

---

## 0.1 Determinismus-Regeln (verbindlich für alle E2E-Tests)

Die häufigste Ursache flakiger Tests in genau diesem Repo ist eine **Race
Condition zwischen zu schnellen, automatisierten Eingaben und ProseMirrors
asynchroner Selektions-Synchronisation** — bereits real aufgetreten und behoben
in `selection-regression.spec.ts` und `cut.spec.ts` (siehe Commit-Historie:
„same async-selection-sync race", „give async selection sync time before the
next keystroke"). Jeder Test dieses Plans **muss** die folgenden Regeln
einhalten; ein Test, der sie verletzt, gilt als nicht abnahmefähig, auch wenn er
lokal einmal grün ist.

### Regel 1 — Aktionen nach ihrer Selektions-Semantik unterscheiden

| Klasse | Beispiele | Synchron zum PM-Modell? | Konsequenz |
|---|---|---|---|
| **Modell-synchron** | `Strg+A` (`selectAll` via Keymap), Toolbar-Klick (`onMouseDown`+`toggleInlineMark`, dispatcht synchron), Tippen (`keyboard.type`, ProseMirror handhabt `beforeinput` synchron) | **Ja** | Nachfolgende Aktion darf **ohne** Wartezeit folgen |
| **Native Selektionsänderung** | Maus-Klick zum Umpositionieren (`editor.click()` auf bestehende Selektion), `Home`/`End`, Pfeiltasten, `Shift`+Pfeil zum Aufziehen einer Selektion | **Nein** — ProseMirror lernt sie erst über das **asynchrone** `selectionchange`-Event des Browsers | Vor der **nächsten** Aktion, die `view.state.selection` liest (Toolbar-Toggle, `Strg+I`, `Enter`, tippen mit erwarteter Stored-Mark-Vererbung), muss die Sync **abgewartet** werden |

### Regel 2 — Nach jeder nativen Selektionsänderung die Sync abwarten

Vorbild (bereits im Repo etabliert, `selection-regression.spec.ts:27-34`):

```ts
await editor.click()          // native Umpositionierung
await page.keyboard.press('End')   // native Caret-Bewegung
// ProseMirror erfährt die native Caret-Bewegung nur über das asynchrone
// selectionchange-Event. Ein sofort folgender Tastendruck kann dem Catch-up
// vorauslaufen und noch auf der alten Position wirken. Ein menschliches
// Tempo löst das nie aus; die kurze Wartezeit gibt der bereits laufenden
// Sync die Chance, zuerst zu landen.
await page.waitForTimeout(50)
await page.keyboard.press('Enter')   // liest die (jetzt korrekte) Selektion
```

Diese 50-ms-Settle-Wartezeit ist **ausschließlich** nach Aktionen der Klasse
„native Selektionsänderung" und **nur** dann nötig, wenn unmittelbar danach eine
selektionslesende Aktion folgt. Sie ist **kein** pauschaler „Sleep gegen
Flakiness" und darf nicht als solcher gestreut werden.

### Regel 3 — Ergebnisse ausschließlich über auto-retryende Assertions prüfen

Alle Zustandsprüfungen laufen über Playwrights web-first, **automatisch
wiederholende** Assertions — nie über einen sofortigen, einmaligen Lesevorgang:

```ts
await expect(page.getByTitle('Kursiv')).toHaveAttribute('aria-pressed', 'true')
await expect(editor.locator('em')).toHaveText('kursiv')
await expect(editor.locator('em')).toHaveCount(0)
```

`toHaveAttribute`/`toHaveText`/`toHaveCount` pollen bis zum Timeout und
überbrücken damit das `forceRender`-Re-Render der Toolbar
(`WordEditor.tsx:125-132`, `forceRender((n) => n + 1)` in Zeile 131 — synchron im
`dispatchTransaction`, aber der React-Commit landet minimal später)
**deterministisch**. Verboten sind `elementHandle`-Sofortlesungen
wie `await el.getAttribute(...)` gefolgt von `expect(value)…` — sie erfassen den
Zustand vor dem Re-Render und sind die klassische Flaky-Quelle.

### Regel 4 — Download-Erwartung vor dem Export-Klick registrieren

```ts
const downloadPromise = page.waitForEvent('download')   // ZUERST
await page.getByRole('button', { name: 'Exportieren' }).click()
const download = await downloadPromise
const buf = await (await import('node:fs/promises')).readFile((await download.path())!)
```

Nie erst klicken und danach `waitForEvent` — das verliert das Event.

### Regel 5 — Aktiv-Zustand vor dem ersten Zeichen prüfen (Grenzfall 3.1)

Für den Stored-Mark-Test (leere Schreibmarke) gilt zusätzlich: nach dem
Button-Klick **kein** Zeichen tippen, bevor `aria-pressed` geprüft ist. Das erste
getippte Zeichen konsumiert die Stored Mark und verändert die Datenquelle der
Anzeige — ein Tippen vor der Assertion würde exakt den zu prüfenden Fehler
verdecken. Die auto-retryende Assertion aus Regel 3 genügt hier; **keine**
`waitForTimeout` einbauen (sie würde nur Latenz maskieren, nicht Determinismus
herstellen).

### Regel 6 — Selektions-Aufbau deterministisch gestalten

Eine **gemischte** Selektion (z. B. „A" kursiv, „B" nicht, dann „AB" markieren)
wird über native `Shift`+Pfeil-Schritte aufgebaut → das ist Klasse „native
Selektionsänderung". Vor dem darauf folgenden Toolbar-Klick / der `aria-pressed`-
Prüfung muss Regel 2 (Settle) greifen. Wo möglich, statt `Shift`+Pfeil die
robustere Variante wählen: gezielt per Maus (Doppelklick auf ein Wort, oder
Klick + `Shift`+Klick) — auch dann gilt Regel 2.

### Regel 7 — Keine gemeinsame, testübergreifende Zustandsabhängigkeit

Jeder `test(...)` erzeugt sein Dokument im `beforeEach` neu (Abschnitt 2.0);
keine Reihenfolgeabhängigkeit zwischen Tests. Fixtures werden pro Test frisch per
JSZip gebaut, nicht über Modul-Scope-Variablen geteilt.

### Regel 8 — Re-Import nur nach Rück-Navigation zum Picker

Der Datei-Upload-Input (`docxCard/odtCard → input[type="file"]`) existiert **nur**
auf dem Format-Auswahl-Bildschirm, **nicht** im geöffneten Editor
(`DocumentWorkspace`). Vor jedem Re-Import der gerade heruntergeladenen Datei ist
daher zuerst über `page.getByRole('button', { name: /formate/i }).click()` zum
Picker zurück zu navigieren, **dann** `setInputFiles(...)` auf den Karten-Input
(verifiziert: `docx.spec.ts:239-247`, „the file input only exists on that screen,
not inside the open DocumentWorkspace editor"). Ein `setInputFiles` auf den
Editor-Screen findet den Input nicht — kein Timing-, sondern ein Navigationsfehler.

---

## 1. Unit-Tests: Reader/Writer-Rundreise (DOCX + ODT)

Ziel: jede Rundreise-Behauptung aus Anforderung Abschnitt 5 sowie jeder
Reader-Grenzfall aus Abschnitt 3.3–3.6 auf Daten-/XML-Ebene isoliert,
deterministisch und ohne Browser nachweisen. Diese Ebene prüft **Funktionen
direkt** (`readDocx`, `writeDocx`, `readOdt`, `writeOdt`, `isMarkActive`,
`toggleInlineMark`) — das ist hier ausdrücklich erlaubt und richtig, weil sie
durch die Playwright-Ebene (2) ergänzt, nicht ersetzt wird.

### 1.1 Bestehende Abdeckung (Referenz, NICHT neu bauen)

Verifiziert vorhanden (`kursiv-code.md` Abschnitt 5.0) — bleibt unverändert und
wird durch die neuen Dateien unten ergänzt, nicht dupliziert:

| Ebene | Fundstelle | Was geprüft wird |
|---|---|---|
| Unit-Rundreise DOCX | `src/formats/docx/__tests__/roundtrip.test.ts` | `em` allein + `[strong, em]`, positionstreu |
| Unit-Rundreise ODT | `src/formats/odt/__tests__/roundtrip.test.ts` | analog |
| Unabhängige ODF-Validierung inkl. `em` | `src/formats/odt/__tests__/external-validation.test.ts:62` | Dokument mit `em` gegen OASIS-ODF-1.3-RelaxNG (xmllint-wasm) |

### 1.2 Neu: `src/formats/docx/__tests__/em.test.ts`

Reader-Rundreise/-Grenzfälle für DOCX, je über eine minimal per JSZip gebaute
`.docx`-Datei (Muster: `buildDocxWithRunAndStyles(runXml, stylesXml)`, analog zu
`buildSampleDocx()` in `tests/e2e/docx.spec.ts`, aber mit optionalem
`word/styles.xml`-Override) und `readDocx(blob)`.

| # | Testfall | Eingabe | Erwartung | Deckt |
|---|---|---|---|---|
| 1 | `<w:i/>` (bar) | `<w:rPr><w:i/></w:rPr>` | `em`-Mark vorhanden | Basisfall |
| 2 | `w:val="true"` / `"1"` / `"on"` | je ein Testfall (`it.each`) | `em`-Mark vorhanden | ST_OnOff „an" |
| 3 | `w:val="false"` / `"0"` / `"off"` / `"FALSE"` (Groß-/Kleinschreibung) | je ein Testfall (`it.each`) | **kein** `em`-Mark | Grenzfall 3.3 |
| 4 | Regressionstest gegen reale Fixture | `tests/fixtures/external/docx/form_footnotes.docx` einlesen, den Lauf „Provide services in Brazil…" im resultierenden Dokumentbaum suchen | Lauf trägt **keine** `em`-Mark | Grenzfall 3.3, an echter, unveränderter Drittdatei (kein synthetisches Fixture) |
| 5 | Dieselbe Prüfung gegen `bug65649.docx` | wie oben | wie oben | Grenzfall 3.3, zweite unabhängige Belegdatei |
| 6 | `w:rStyle` → Zeichenformatvorlage mit `<w:i/>` | Lauf referenziert `w:rStyle="Betont"`, `styles.xml` definiert `w:type="character" w:styleId="Betont"` mit `<w:i/>` in `w:rPr` | `em`-Mark vorhanden | Grenzfall 3.4 |
| 7 | Direktes `<w:i w:val="false"/>` überschreibt geerbtes `w:rStyle` | Lauf hat sowohl `w:rStyle="Betont"` (kursiv) als auch direktes `<w:i w:val="false"/>` | **kein** `em`-Mark (Lauf-Ebene schlägt Formatvorlage — OOXML-Kaskade) | Grenzfall 3.4, Präzedenz |
| 8 | `w:rStyle` mit `w:basedOn`-Kette | `Betont` ohne eigenes `<w:i/>`, erbt es via `w:basedOn` von `Base` | `em`-Mark vorhanden | Grenzfall 3.4, Vererbung |
| 9 | Zyklische/zu tiefe `w:basedOn`-Kette bricht kontrolliert ab | `w:basedOn` verweist auf sich selbst bzw. Kette > `MAX_STYLE_CHAIN_DEPTH` | Import wirft **nicht**, `em` wird nicht fälschlich gesetzt | Robustheit (`kursiv-code.md` 4.2) |
| 10 | Unbekannter `w:rStyle`-Verweis (Vorlage fehlt in `styles.xml`) | `w:rStyle="Nichtvorhanden"`, keine Definition | **kein** `em`-Mark, kein Absturz | Robustheit gegen unvollständige Fremddateien |

### 1.3 Neu: `src/formats/odt/__tests__/em.test.ts`

Analog für ODT, über `buildOdt(automaticStylesXml, spanMarkup, namedStylesXmlInStylesXml)`
und `readOdt(blob)`.

| # | Testfall | Eingabe | Erwartung | Deckt |
|---|---|---|---|---|
| 1 | Benannte Formatvorlage ausschließlich in `styles.xml` (`office:styles`), nicht in `content.xml`s `automatic-styles` | `text:span text:style-name="Emphasis"`, `Emphasis` mit `fo:font-style="italic"` nur in `office:styles` | `em`-Mark vorhanden | Grenzfall 3.5 |
| 2 | Vererbung ausschließlich über `style:parent-style-name` | automatische Vorlage `T1` ohne eigenes `font-style`, aber `parent-style-name="Emphasis"` | `em`-Mark vorhanden | Grenzfall 3.5 |
| 3 | Mehrstufige Vererbungskette (`T1` → `Zwischenstufe` → `Emphasis`) | drei verschachtelte Vorlagen | `em`-Mark vorhanden | Grenzfall 3.5, Tiefe > 1 |
| 4 | Automatische Vorlage in `content.xml` erbt von benannter Vorlage in `styles.xml` | `T1` (content.xml) `parent-style-name="Emphasis"`, `Emphasis` kursiv in `styles.xml` | `em`-Mark vorhanden (Zusammenführung **vor** Vererbungsauflösung, `kursiv-code.md` 4.3) | Grenzfall 3.5, containerübergreifend |
| 5 | Eigene Eigenschaft schlägt geerbte (Präzedenz) | `T1` hat eigenes `fo:font-style="normal"` **und** erbt `italic` vom Elternstil | **kein** `em`-Mark (spezifischere Definition gewinnt) | Kaskaden-Regel analog DOCX #7 |
| 6 | `fo:font-style="oblique"` | automatische Vorlage mit `oblique` statt `italic` | `em`-Mark vorhanden (dokumentierte Vereinfachung) | Grenzfall 3.6 |
| 7 | Zyklische `parent-style-name`-Kette bricht kontrolliert ab | `A` erbt von `B`, `B` erbt von `A` | Import wirft **nicht** | Robustheit |

### 1.4 Erweiterung (NICHT neu): `src/formats/shared/editor/__tests__/commands.test.ts`

**Wichtig:** Diese Datei **existiert bereits** (deckt `canCut`/`cutSelection` ab)
— sie wird **erweitert**, nicht überschrieben (`kursiv-code.md` Abschnitt 5.1,
Korrektur #3). Zwei neue `describe`-Blöcke für die in `kursiv-code.md` 4.1
eingeführten `isMarkActive`/`toggleInlineMark`, reiner Zustands-Test (kein DOM,
kein Browser). Deckt Grenzfälle 3.1/3.2 auf kleinstmöglicher Ebene ab —
**ergänzt**, ersetzt aber nicht die Browser-Bestätigung derselben Fälle in
Abschnitt 2.3, da erst Ebene 2 beweist, dass der real gerenderte Button
(`aria-pressed`) sich entsprechend verhält. `TextSelection`/`CellSelection`
regulär importieren (kein `require`).

| # | Testfall | Erwartung |
|---|---|---|
| 1 | Toggle an leerer Schreibmarke (kein Selektionsbereich), vor jeder Eingabe | `isMarkActive(state, em)` liefert `true` unmittelbar nach `toggleInlineMark(em)`, ohne dass etwas getippt wurde (liest `state.storedMarks`) |
| 2 | Selektion über „AB" (A kursiv, B nicht) | `isMarkActive` liefert `false` (nicht fälschlich „aktiv" durch reine `$from`-Prüfung) |
| 3 | `toggleInlineMark(em)` auf dieser gemischten Selektion | Danach ist **der gesamte Bereich** kursiv (`doc.rangeHasMark(1,2,em)` **und** `rangeHasMark(2,3,em)` `true`), nicht entfernt — verifiziert die `removeWhenPresent: false`-Semantik (Fix zu Defekt 3.3) |
| 4 | Durchgehend kursive Selektion | `isMarkActive` liefert `true` |
| 5 | `CellSelection` über mehrere Tabellenzellen, gemischt kursiv/nicht | `isMarkActive` liefert `false` (Iteration über `state.selection.ranges`, nicht nur `$from`/`$to`) |

### 1.5 Erweiterung (NICHT neu): `src/formats/docx/__tests__/external-validation.test.ts`

DoD-Punkt 5 verlangt die **unabhängige** Validierung des Kursiv-Exports auch für
DOCX. Der bestehende Test prüft aktuell **nur** `strong` (`<strong>fettem</strong>`,
Zeile ~30/72). Ergänzung: ein Modell mit `em` exportieren → im exportierten
`word/document.xml` steht `<w:i/>` im korrekten `w:rPr`, geprüft per
Regex/`DOMParser` **ohne** den eigenen `readDocx` (verhindert sich gegenseitig
ausgleichende Schreib-/Lesefehler, Haupt-Spezifikation Abschnitt 19). Die ODT-
Entsprechung ist bereits vorhanden (`odt/__tests__/external-validation.test.ts:62`,
Abschnitt 1.1) — erhalten, nicht duplizieren.

### 1.6 Neu (optional, empfohlen): `src/formats/shared/__tests__/em-cross-format.test.ts`

Cross-Format über die UI ist **blockiert** (Abschnitt 2.5.3). Da beide Writer
(`writeDocx`/`writeOdt`) dasselbe interne Modell (`WordDocumentContent`)
verarbeiten, ist eine **Writer-Ebene-Vorabsicherung** schon jetzt möglich
(`kursiv-code.md` Abschnitt 5.3): ein Modell mit `em` → `writeOdt` → `readOdt`
**und** → `writeDocx` → `readDocx`; in beiden Zweigen bleibt genau dieser Lauf
kursiv. Sichert die Modell-Ebene ab, bevor `speichern-unter-format` den UI-Weg
existiert. **Kein** Blocker für den Status „vertrauenswürdig vorhanden".

### 1.7 Manuelle Zweitvalidierung (einmalig, vor Statuswechsel)

Da dieses Repo keine Python-Toolchain besitzt, erfolgt die vom eigenen
Reader/Writer vollständig unabhängige Endkontrolle einmalig manuell: eine
exportierte Test-DOCX mit Kursiv-Text mit `python-docx` (außerhalb des Repos)
bzw. eine Test-ODT mit LibreOffice/einem ODF-Validator öffnen; Ergebnis in
`kursiv-req.md` oder einer Folgedatei vermerken. **Kein** Bestandteil der
CI-Suite, aber Pflicht-Checkliste-Punkt vor Abnahme (Abschnitt 4).

---

## 2. Echte Playwright-Browser-Tests

**Grundregel dieser Ebene:** Jeder Test bedient die Anwendung ausschließlich so,
wie eine Person es täte — `page.getByTitle(...).click()`,
`page.keyboard.type(...)`/`.press(...)`, `input.setInputFiles(...)` für Uploads,
`page.waitForEvent('download')` + Lesen der heruntergeladenen Datei vom
Datenträger für Exporte. **Kein Test in diesem Abschnitt darf**
`readDocx`/`writeDocx`/`readOdt`/`writeOdt`/`isMarkActive`/`toggleInlineMark`
direkt importieren oder aufrufen — das wäre Ebene 1. Hochzuladende Dateien werden
unabhängig vom Reader/Writer dieses Projekts per JSZip von Hand gebaut (Muster
`buildSampleDocx()`/`buildSampleOdt()`), damit ein Rundreise-Test nicht nur
beweist, dass Writer und Reader sich gegenseitig kompensieren.

**Alle Tests befolgen Abschnitt 0.1 (Determinismus-Regeln).** Insbesondere: kein
selektionslesender Schritt unmittelbar nach einer nativen Caret-/Selektions-
Bewegung ohne Settle (Regel 2); Zustandsprüfung nur über auto-retryende
Assertions (Regel 3).

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

`beforeEach`: `page.goto('/')` → Privacy-Banner (`getByRole('button', { name: /verstanden/i }).click()`)
→ je nach Testfall `odtCard`/`docxCard` „Neu erstellen" klicken (analog
`selection-regression.spec.ts`, `docx.spec.ts`). Erste Interaktion mit dem Editor
stets `editor.click()` (nativer Fokus/Caret; unmittelbar danach ist `keyboard.type`
sicher, da noch keine konkurrierende Vor-Selektion existiert).

**Playwright-Projekte:** Die Tests müssen auch unter den `Mobile *`-Projekten
grün sein. Genau dort sind die async-Selektions-Races zuvor aufgetreten
(Commit-Historie, `cut.spec.ts`/`selection-regression.spec.ts`) — Abschnitt 0.1
Regel 2 ist dort nicht optional.

### 2.1 Toolbar & Tastatur — Grundverhalten (Anforderung Abschnitt 1 + 2.1)

| # | Testfall | Schritte (echte Bedienung) | Assertion (auto-retry) |
|---|---|---|---|
| 1 | Klick auf „Kursiv" setzt Kursiv | `editor.click()` → `keyboard.type('Testtext')` → `keyboard.press('ControlOrMeta+a')` (modell-synchron, kein Settle nötig) → `getByTitle('Kursiv').click()` | `editor.locator('em')` hat Text „Testtext" |
| 2 | Erneuter Klick entfernt Kursiv wieder (Toggle in beide Richtungen, 2.1.3) | Fortsetzung, erneut `getByTitle('Kursiv').click()` | `editor.locator('em')` `toHaveCount(0)`; als **eigener** `test(...)` neben #1, nicht nur als Rundlauf |
| 3 | Aktiv-Anzeige folgt dem Klick | wie #1/#2 | `getByTitle('Kursiv')` `toHaveAttribute('aria-pressed','true')` nach Klick 1, `'false'` nach Klick 2 |
| 4 | `Strg+I` liefert identisches Ergebnis wie Klick | `keyboard.type(...)` → `keyboard.press('ControlOrMeta+a')` → `keyboard.press('ControlOrMeta+i')` | `em`-Locator hat den Text; Button `aria-pressed='true'` (DoD 1 verlangt echten Tastendruck; kein bestehender Test drückt `Mod-i`) |
| 5 | Tooltip/Accessible Name | — | `getByTitle('Kursiv')` **und** `getByLabel('Kursiv')` referenzieren denselben Button (Anforderung 1 #4) |
| 6 | Ohne Selektion: Stored-Mark | `editor.click()` → `keyboard.type('vorher ')` → `getByTitle('Kursiv').click()` (Caret am Ende, modell-synchron) → `keyboard.type('kursiv')` | „kursiv" liegt in `em`, „vorher " nicht |

### 2.2 Kombination mit anderen Formaten (Anforderung 2.3)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Fett + Kursiv + Unterstrichen + Farbe gleichzeitig | Text tippen, `Strg+A`, nacheinander `getByTitle('Fett')`, `getByTitle('Kursiv')`, `getByTitle('Unterstrichen')` klicken, Schriftfarbe über Farbwähler setzen (alle Toolbar-Aktionen modell-synchron) | Text liegt verschachtelt in `strong`, `em`, `u`; Farbe als Inline-Style vorhanden |
| 2 | Anwendungsreihenfolge irrelevant | Test A: erst Fett dann Kursiv; Test B: erst Kursiv dann Fett | beide liefern denselben DOM (Text in `em` **und** `strong`), keine doppelte Stil-Erzeugung |

### 2.3 Aktiv-Zustand-Anzeige — Grenzfälle 3.1/3.2 (kritisch, determinismus-sensibel)

| # | Testfall | Schritte | Assertion | Grenzfall |
|---|---|---|---|---|
| 1 | Toggle an leerer Schreibmarke, Zustand **vor** jeder Eingabe | `editor.click()` → `keyboard.type('abc')` → `keyboard.press('Home')` → **Settle `waitForTimeout(50)`** (Regel 2: `Home` ist native Caret-Bewegung) → `getByTitle('Kursiv').click()` → **kein Zeichen tippen** (Regel 5) | `aria-pressed='true'` (auto-retry) unmittelbar nach dem Klick | 3.1 |
| 2 | Danach getippter Text ist tatsächlich kursiv | Fortsetzung von #1: `keyboard.type('X')` | `editor.locator('em')` enthält „X" | 3.1, Bestätigung des internen Zustands |
| 3 | Gemischte Selektion zeigt Button nicht fälschlich „aktiv" | „AB" tippen; nur „A" kursiv (z. B. `Home` → **Settle** → `Shift+ArrowRight` → **Settle** → `getByTitle('Kursiv').click()`); dann „AB" markieren (`Strg+A`) | `aria-pressed='false'` (nicht fälschlich „true") | 3.2 |
| 4 | Klick auf gemischter Selektion vereinheitlicht auf kursiv (nicht: entfernt) | Fortsetzung von #3: `getByTitle('Kursiv').click()` | `editor.locator('em')` enthält „AB" vollständig (nicht nur „A", nicht leer) — verifiziert `removeWhenPresent: false` / Anforderung 2.1.1 im Browser | 3.2 / Defekt 3.3 |
| 5 | Durchgehend kursive Selektion zeigt Button aktiv | Text markieren, kursiv setzen, denselben Bereich neu selektieren (`Strg+A`) | `aria-pressed='true'` | 2.2 |

### 2.4 Geltungsbereich innerhalb der Dokumentstruktur (Anforderung 2.4)

Je ein eigener Test/Sub-Assert; jede native Caret-Bewegung zwischen Kontexten
folgt Regel 2.

| # | Kontext | Schritte |
|---|---|---|
| 1 | Normaler Absatz | Basisfall, in 2.1 abgedeckt |
| 2 | Überschrift (mind. eine Ebene, idealerweise 1 + 6) | Überschrift über vorhandenes UI-Mittel erzeugen, Text markieren, Kursiv-Button klicken |
| 3 | Listenelement (Aufzählung und nummeriert) | Liste einfügen, in ein Element tippen, kursiv markieren |
| 4 | Tabellenzelle, inkl. mehrerer Absätze in einer Zelle | Tabelle einfügen (`getByRole('button', { name: 'Tabelle einfügen' })`, Muster `selection-regression.spec.ts`), in eine Zelle zwei Absätze tippen (Enter dazwischen — **Settle nach dem Zell-Klick** vor Enter), beide Absätze markieren, kursiv |
| 5 | Text vor/nach `hard_break` (Umschalt+Enter) | Text, `Shift+Enter`, weiterer Text; jeweils getrennt markieren und kursiv — prüfen, dass Kursiv **nicht** über den Umbruch überläuft, wenn nur eine Seite markiert war |
| 6 | Text unmittelbar vor/nach eingefügtem Bild/Tabelle | Bild/Tabelle einfügen, Text davor/danach kursiv markieren, keine Fehlfunktion an der Grenzposition |
| 7 | Kopf-/Fußzeile | **Nur** sobald laut Haupt-Spezifikation Abschnitt 9 UI existiert — bis dahin expliziter, übersprungener (`test.skip`) Platzhalter mit Kommentar, kein stillschweigendes Fehlen |

### 2.5 Rundreise über echte Bedienung

Jedes lauffähige Szenario prüft die **heruntergeladene Datei** (`download.path()`
→ `fs.readFile` → `JSZip.loadAsync` → Ziel-XML aus dem Zip lesen), nicht nur, dass
der Editor nach Re-Import „irgendwie richtig aussieht". Download-Erwartung stets
gemäß Regel 4 vor dem Export-Klick registrieren.

**Re-Import erfordert Rück-Navigation zum Picker (Regel 8, Abschnitt 0.1):** Der
Datei-Upload-Input existiert nur auf dem Format-Auswahl-Bildschirm. Jedes
Szenario, das die exportierte Datei wieder einliest, klickt daher zuerst
`getByRole('button', { name: /formate/i })` und ruft **erst dann**
`setInputFiles(...)` auf den Karten-Input (`docxCard/odtCard`) auf.

#### 2.5.1 Pflicht-Szenarien (Anforderung 5.1, sofort abnahmerelevant, gleiches Format)

| # | Szenario | Ablauf | Assertion an heruntergeladener Datei |
|---|---|---|---|
| 1 | DOCX-Eigenrundreise | Neu erstellen → tippen → Teil markieren → Kursiv → Export → **zurück zum Picker (`/formate/i`, Regel 8)** → Re-Import der gerade heruntergeladenen Datei (`docxCard.locator('input[type="file"]').setInputFiles({ name, mimeType, buffer })`) → nur dieser Teil bleibt kursiv | `word/document.xml`: `<w:i/>` exakt für den erwarteten Lauf, für keinen anderen |
| 2 | ODT-Eigenrundreise | wie 1, aber ODT | `content.xml`: `fo:font-style="italic"` am erwarteten Span |
| 3 | DOCX-Fremddatei „unverändert" | per JSZip gebaute `.docx` mit `<w:rPr><w:i/></w:rPr>` in einem Lauf hochladen → **ohne Änderung** exportieren | exportiertes `word/document.xml`: derselbe Text weiterhin `<w:i/>`, kein anderer Lauf gewinnt/verliert Kursiv |
| 4 | ODT-Fremddatei „unverändert" | analog, `.odt` mit `text:style-name` → automatische Vorlage mit `fo:font-style="italic"` | exportiertes `content.xml`: Kursiv erhalten |
| 5 | Kombination Fett + Kursiv + Farbe bei Rundreise (5.1.5) | Text mit allen drei Eigenschaften über **echte, nacheinander** gesetzte Marks (nicht aus Import), Export/Re-Import je Format | alle drei Eigenschaften am selben Lauf erhalten, keine Vermischung mit Nachbartext, keine Stil-Duplikate |
| 6 | Kursiv in Überschrift/Liste/Tabellenzelle bei Rundreise (5.1.6) | je einzeln: Kursiv im jeweiligen Kontext, Export/Re-Import | Formatierung an exakt dieser Stelle erhalten |

#### 2.5.2 Unabhängige Validierung des Exports (Anforderung 5.2)

| # | Szenario | Ablauf | Assertion |
|---|---|---|---|
| 7 | Unabhängige DOCX-Validierung an der Downloaddatei | Szenario 1/3 exportieren, `word/document.xml` **per Regex/`DOMParser`, nicht per `readDocx`** prüfen | `<w:i\s*/>` im korrekten `w:rPr`, **kein** widersprüchliches `w:val="false"` am selben Lauf |
| 8 | Unabhängige ODT-Validierung an der Downloaddatei | Szenario 2/4, `content.xml` per Regex/`DOMParser` | `fo:font-style="italic"` am erwarteten Span |

*Hinweis:* Die **primäre** DoD-5-Absicherung ist die Vitest-Erweiterung aus
Abschnitt 1.5 (DOCX) bzw. der bestehende `odt`-Validator (1.1). Die E2E-Prüfungen
7/8 hier sind die **zusätzliche** Bestätigung an der real heruntergeladenen Datei
über den echten Export-Mechanismus (Button-Klick, Download-Event), nicht über
`writeDocx(readDocx(buffer))` im Testprozess.

#### 2.5.3 Cross-Format-Rundreise — BLOCKIERT (`test.skip`, nachgelagert)

Cross-Format-Export (DOCX→ODT, ODT→DOCX) ist über die UI **derzeit nicht
möglich**: `DocumentWorkspace.handleExport` (`src/app/DocumentWorkspace.tsx`)
ruft immer `module.exportFile` des **Ursprungs**-Moduls auf; es gibt keinen
Formatwähler. Die entsprechenden E2E-Tests in `roundtrip-fidelity.spec.ts:256-257`
sind bewusst `test.skip` („blocked on backlog slug `speichern-unter-format`").

Diese Szenarien werden hier **nicht** als lauffähige Pflicht-E2E-Tests angelegt,
sondern als `test.skip`-Platzhalter mit Kommentar geführt (kein stillschweigendes
Fehlen), passend zu Anforderung 5.3 (Szenarien 9–11) und `kursiv-code.md` 5.3:

| # | Szenario (blockiert) | Erst lauffähig nach |
|---|---|---|
| 9 | DOCX mit Kursiv → als ODT exportieren → `fo:font-style="italic"` bleibt | `speichern-unter-format` |
| 10 | ODT mit Kursiv → als DOCX exportieren → `<w:i/>` bleibt | `speichern-unter-format` |
| 11 | Doppelte Rundreise DOCX → ODT → DOCX → Kursiv nach zwei Konvertierungen an exakt derselben Stelle | `speichern-unter-format` |

Die schon jetzt mögliche **Writer-Ebene-Vorabsicherung** für 9–11 liegt auf
Unit-Ebene (Abschnitt 1.6, `em-cross-format.test.ts`) — kein Blocker.

#### 2.5.4 Rundreise-Grenzfälle aus Abschnitt 3.3–3.6 (Anforderung 5.4)

„Unverändert exportieren" darf keine beim Import bereits (fälschlich) verlorene
oder hinzugefügte Kursiv-Information zementieren. Szenario 3/4 werden **zusätzlich**
mit Grenzfall-Varianten wiederholt — z. B. Fremddatei mit `<w:i w:val="false"/>`
unverändert exportieren → im Export **kein** aktives `<w:i/>` (bzw. das explizite
`w:val="0"` bleibt erhalten, aber der Text ist nicht kursiv). Diese Varianten als
eigene `test()`-Blöcke in `kursiv.spec.ts`, **nicht** ausschließlich auf Ebene 1
belassen, weil die Anforderung den echten Export-Mechanismus verifizieren will.

### 2.6 Undo/Redo (Anforderung 2.5)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Ein `Strg+Z` macht genau den Kursiv-Toggle rückgängig | Text tippen → `Strg+A` → Kursiv → `keyboard.press('ControlOrMeta+z')` | `em`-Locator `toHaveCount(0)`, getippter Text vollständig erhalten (Undo hat **nicht** das Tippen mitentfernt) |
| 2 | Redo stellt Kursiv wieder her | Fortsetzung: `keyboard.press('ControlOrMeta+y')` (bzw. `ControlOrMeta+Shift+z`) | `em`-Locator wieder vorhanden |
| 3 | Gemischte Sequenz Tippen + mehrere Toolbar-Aktionen | Tippen, Fett, Tippen, Kursiv, je ein `Strg+Z` pro Schritt | jeder Undo-Schritt entfernt genau die zuletzt angewendete Einzeländerung, nicht mehr |

### 2.7 Copy/Paste (Anforderung 2.6)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Intern kopierter kursiver Text behält Formatierung | kursiven Text markieren, `ControlOrMeta+c`, Caret woanders hin (**Settle nach Neupositionierung**, Regel 2), `ControlOrMeta+v` | eingefügter Text liegt in `em`. WebKit ggf. `test.skip` (Clipboard-Rechte, Muster `clipboard-roundtrip.spec.ts:150`) |
| 2 | Extern eingefügtes `<em>`/`<i>`/`style="font-style: italic"` erkannt | synthetisches `ClipboardEvent` mit `text/html`-Payload per `page.evaluate` auf den Editor dispatchen (robuster in CI als OS-Zwischenablage); je ein Testfall | eingefügter Text erscheint als `em` im DOM |
| 3 | Extern eingefügtes `style="font-style: oblique"` | wie #2, aber `oblique` | erscheint **nicht** als `em` (dokumentierte Vereinfachung, `kursiv-code.md` Abschnitt 8 — Paste-Pfad wird bewusst nicht erweitert); hält die bewusste Grenze automatisiert fest |

### 2.8 Weitere Grenzfälle (Anforderung 3.8)

| # | Fall | Test |
|---|---|---|
| 1 | Kursiv am Dokumentanfang/-ende | Caret an Position 0 bzw. Ende (**Settle nach `Home`/`End`**), Kursiv umschalten, tippen |
| 2 | Kursiv in leerem Absatz, danach tippen | neuer leerer Absatz, Kursiv-Button (keine Selektion), tippen → Text kursiv |
| 3 | Kursiv in leerer Tabellenzelle, danach tippen | wie #2, zusätzlich: Nachbarzelle bleibt unformatiert; kein leerer `<w:r>`/`<text:span>` im Export |
| 4 | Kursiv-Text vor/nach `hard_break` unabhängig | siehe 2.4 #5 |
| 5 | Kursiv + Tabulator im selben Lauf | Text mit Tab-Zeichen (falls Tab-Eingabe unterstützt, Haupt-Spezifikation Abschnitt 15), markieren, kursiv — Tab bleibt erhalten (`<text:tab/>`) |
| 6 | `Strg+I` bei Fokus außerhalb des Editors wirkt nicht | Fokus auf anderes Steuerelement (Farbwähler-Input), `keyboard.press('ControlOrMeta+i')`, Editor-Inhalt unverändert |
| 7 | Lange Selektion (`Strg+A` in langem Dokument) mit Kursiv-Toggle bleibt reaktionsfähig | langen Text erzeugen (per `page.evaluate`-Befüllung + einem abschließenden echten Tastendruck/Klick zur Interaktion), `Strg+A`, Kursiv-Klick; Zeitbudget über auto-retry-Timeout (`toHaveAttribute(..., { timeout: 2000 })`) statt fixem Sleep |
| 8 | Kursiv-Toggle unmittelbar gefolgt von Export ohne Zwischenklick | Kursiv-Button klicken (modell-synchroner Dispatch), **sofort** `downloadPromise` registrieren + `Exportieren` klicken | exportierte Datei enthält den gerade gesetzten Zustand (keine Race-Condition; `dispatchTransaction` schreibt synchron) |
| 9 | Doppelter/sehr schneller Klick auf den Kursiv-Button | (a) einzelner `.click()` → `aria-pressed='true'` und `em`-Count 1 (ein Klick = genau ein Toggle, kein Bubbling-Doppelfeuer); (b) `.dblclick()` auf Textselektion → nettoresultierend **kein** `em` (genau zwei Toggles, nicht vier) | Grenzfall 3.8 #9 — kein doppeltes Toggle durch Event-Bubbling |
| 10 | Track Changes (Phase 3) | **kein Test** — Anforderung: „kein Verhalten definiert vor Phase 3"; nur als offener Punkt vermerkt, kein rotes/übersprungenes Artefakt |

### 2.9 Selektions-Sync-Regression mit Kursiv (Grenzfall 3.7, Pflicht)

**Erweiterung der bestehenden Datei** `tests/e2e/selection-regression.spec.ts`
(nicht neue, separate Datei — DoD Punkt 6 verlangt „dauerhaft verankert"; eine
zusätzliche, leicht vergessbare Datei widerspricht dem). Exakt dieselben drei
Testmuster wie die bestehenden Fett-Varianten (verifiziert: `getByTitle('Fett')`
in Zeilen 20/52/68/94), aber mit `getByTitle('Kursiv')`. **Der 50-ms-Settle nach
`End`/Klick-Umpositionierung (Abschnitt 0.1 Regel 2) ist zu übernehmen** — er ist
im Vorbild bereits enthalten (`selection-regression.spec.ts:34/72/103`) und exakt
der Mechanismus, der diese Tests deterministisch hält.

| # | Testfall | Muster (Vorlage) |
|---|---|---|
| 1 | Einfache Sequenz: Alles auswählen → Kursiv → Klick zur Neupositionierung → **Settle** → Enter → tippen | `select-all, bold, click to reposition, …` |
| 2 | Tabellenzellen-Variante | `same regression inside a table cell` |
| 3 | Stress-Test über mehrere Zyklen | `repeated select-all + bold + click cycles stay stable` |

Assertion identisch zum Vorbild: beide Absätze/Zellinhalte bleiben vollständig
erhalten (`toContainText` + `.ProseMirror p` `toHaveCount(...)`), keine
gelöschten/ersetzten Inhalte.

### 2.10 Visuelle Darstellung (Anforderung Abschnitt 4)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Kursiver Text ist tatsächlich schräggestellt | Text kursiv setzen | `getComputedStyle(em).fontStyle === 'italic'` per `locator.evaluate` — bestätigt, dass keine globale Regel `em { font-style: normal }` (auch nicht via Tailwind-Preflight) eingreift |
| 2 | Aktiv-Zustand-Kontrast in Light- und Dark-Mode | Seite je in `page.emulateMedia({ colorScheme: 'dark' })` / `'light'` laden, Button aktiv setzen | Button in beiden Modi sichtbar/erkennbar (Style-Vergleich gegen den „Fett"-Button als Referenz); dokumentiert zugleich das „K"-Glyph-Erkennbarkeitsergebnis (DoD 7) |

---

## 3. Zuordnung Anforderung → Test (Abnahme-Mapping)

| Anforderungs-Abschnitt | Testebene(n) | Datei(en) |
|---|---|---|
| 1 (Bedienelemente) | E2E | `kursiv.spec.ts` §2.1 |
| 2.1 (Grundverhalten Toggle) | E2E | `kursiv.spec.ts` §2.1 |
| 2.2 (Aktiv-Zustand) | Unit + E2E | `commands.test.ts` §1.4, `kursiv.spec.ts` §2.3 |
| 2.3 (Kombination) | E2E | `kursiv.spec.ts` §2.2 |
| 2.4 (Geltungsbereich) | E2E | `kursiv.spec.ts` §2.4 |
| 2.5 (Undo/Redo) | E2E | `kursiv.spec.ts` §2.6 |
| 2.6 (Copy/Paste) | E2E | `kursiv.spec.ts` §2.7 |
| 3.1 (Aktiv-Anzeige leere Schreibmarke) | Unit + E2E | `commands.test.ts` #1, `kursiv.spec.ts` §2.3 #1–2 |
| 3.2 (gemischte Selektion) | Unit + E2E | `commands.test.ts` #2/#3, `kursiv.spec.ts` §2.3 #3–4 |
| 3.3 (`w:val="false"`) | Unit | `docx/__tests__/em.test.ts` #3–5 |
| 3.4 (`w:rStyle`) | Unit | `docx/__tests__/em.test.ts` #6–10 |
| 3.5 (ODT Formatvorlagen-Vererbung) | Unit | `odt/__tests__/em.test.ts` #1–5 |
| 3.6 (`oblique`) | Unit (+ Paste-Grenze E2E) | `odt/__tests__/em.test.ts` #6, `kursiv.spec.ts` §2.7 #3 |
| 3.7 (Selektions-Sync-Regression) | E2E | `selection-regression.spec.ts` (erweitert) §2.9 |
| 3.8 #1–9 | E2E | `kursiv.spec.ts` §2.8 |
| 3.8 #10 (Track Changes) | keiner (dokumentiert offen) | — |
| 4 (visuelle Darstellung) | E2E | `kursiv.spec.ts` §2.10 |
| 5.1 Szenario 1–6 (Pflicht, gleiches Format) | E2E | `kursiv.spec.ts` §2.5.1 |
| 5.2 Szenario 7 (ODT) / 8 (DOCX) (unabhängige Validierung) | Unit (primär) + E2E (an Downloaddatei) | `odt`/`docx` `external-validation.test.ts` §1.1/1.5, `kursiv.spec.ts` §2.5.2 |
| 5.3 Szenario 9–11 (Cross-Format) | **blockiert** (`test.skip`) + Unit-Vorabsicherung | `kursiv.spec.ts` §2.5.3 (`skip`), `em-cross-format.test.ts` §1.6 |
| 5.4 (Rundreise-Grenzfälle 3.3–3.6) | Unit + E2E | §1.2/1.3, `kursiv.spec.ts` §2.5.4 |

---

## 4. Abnahme-Checkliste (vor Statuswechsel „verifiziert")

- [ ] `npm test` grün, inkl. aller neuen/erweiterten Dateien aus Abschnitt 1
      (`docx/em.test.ts`, `odt/em.test.ts`, `commands.test.ts`-Erweiterung,
      `docx/external-validation.test.ts`-Erweiterung, optional
      `em-cross-format.test.ts`).
- [ ] `npm run test:e2e` grün über **alle** Projekte inkl. `Mobile *`, inkl.
      `kursiv.spec.ts` und der Erweiterung von `selection-regression.spec.ts`.
- [ ] Alle E2E-Tests befolgen Abschnitt 0.1: nach jeder nativen
      Selektions-/Caret-Bewegung ein Settle vor der nächsten selektionslesenden
      Aktion (Regel 2), Zustandsprüfung nur über auto-retryende Assertions
      (Regel 3), keine `elementHandle`-Sofortlesungen, `aria-pressed`-Prüfung vor
      dem ersten Zeichen (Regel 5) — per Review stichprobenartig bestätigt.
- [ ] Jeder Grenzfall aus Anforderung Abschnitt 3 (3.1–3.8) hat mindestens einen
      grünen Test, der ihn als „bestätigt funktionsfähig" oder „Fehler behoben,
      mit Regressionstest" schließt — kein offener Punkt außer 3.8 #10 (Track
      Changes, explizit vertagt).
- [ ] Alle Pflicht-Rundreise-Szenarien aus Abschnitt 5.1 (1–6, gleiches Format,
      DOCX **und** ODT) grün.
- [ ] Unabhängige Validierung: ODT (`external-validation.test.ts:62`, erhalten)
      **und** DOCX (`external-validation.test.ts` um `em`-Lauf erweitert) grün,
      plus die E2E-Regex/DOM-Prüfung an der Downloaddatei (§2.5.2 #7/#8).
- [ ] Cross-Format-Szenarien 9–11 sind als `test.skip` mit Backlog-Verweis
      `speichern-unter-format` dokumentiert (nicht stillschweigend fehlend);
      Writer-Vorabsicherung `em-cross-format.test.ts` (falls angelegt) grün.
- [ ] Manuelle Einmalvalidierung einer exportierten Test-Datei gegen
      `python-docx`/LibreOffice bzw. einen ODF-Validator durchgeführt und in
      `kursiv-req.md` oder einer Folgedatei vermerkt (Abschnitt 1.7).
- [ ] Kein E2E-Test in `kursiv.spec.ts` bzw. der Erweiterung von
      `selection-regression.spec.ts` ruft `readDocx`/`writeDocx`/`readOdt`/
      `writeOdt`/`isMarkActive`/`toggleInlineMark` direkt auf — per Review
      bestätigt.
- [ ] Für jeden in `kursiv-code.md` Abschnitt 3 bestätigten Fehler (Aktiv-Anzeige
      `storedMarks`/gemischte Selektion, `toggleMark`-Voreinstellung, `w:val`,
      `w:rStyle`, ODT-Formatvorlagen-Vererbung) liegt ein Fix mit grünem
      Regressionstest vor, oder die Einschränkung ist bewusst dokumentiert (kein
      stiller Fehlschlag, Haupt-Spezifikation Abschnitt 20).
- [ ] „K"-Glyph-Erkennbarkeit (DoD 7) in Light- und Dark-Mode bewertet (§2.10 #2)
      und Ergebnis in `kursiv-req.md`/Folgedatei nachgetragen.
