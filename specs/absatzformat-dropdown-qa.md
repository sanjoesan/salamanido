# QA-Testplan: Feature „Absatzformat-Dropdown (Standard/Überschrift 1–6)"

Rolle: QA-Antwort auf `specs/absatzformat-dropdown-req.md` (Anforderung) und
`specs/absatzformat-dropdown-code.md` (Entwicklerplan). Dieses Dokument nimmt
**keinen** der beiden Vorgängertexte als bewiesen an — auch
`absatzformat-dropdown-code.md` ist laut eigenem Titel ein *Plan*, keine
verifizierte Umsetzung („Kein Punkt hier ist bereits umgesetzt — dies ist der
Plan, nicht der Vollzug"). Jede Behauptung aus beiden Dokumenten wird hier auf
einen konkreten, ausführbaren Testfall abgebildet. Ergebnis ist ein Testplan,
kein Testbericht — die hier aufgeführten Tests sind zum Zeitpunkt dieses
Dokuments größtenteils **noch nicht geschrieben** (siehe Abschnitt 5, Spalte
„Erwarteter Status").

Stil/Gliederung orientiert an `fett-qa.md`/`absatzformat-dropdown-req.md`/
`absatzformat-dropdown-code.md`/`FEATURE-SPEC-DOCX-ODT.md`.

> **Diese Fassung ersetzt eine frühere QA-Fassung vollständig.** Die frühere
> Fassung war gegen einen älteren Code-/Dokumentstand geschrieben und in
> mehreren tragenden Punkten überholt: sie behauptete (a) `list_item.content`
> sei noch `'paragraph block*'` mit einer „erster-vs-zweiter-Absatz"-
> Inkonsistenz und einem reproduzierbaren `splitListItem`-Absturz, (b) „kein
> einziger Test bedient das Dropdown", (c) enthielt **keinen** Testfall für
> Ebenen > 6 (Befund 6) und nutzte veraltete Zeilennummern sowie den falschen
> Writer-Parameternamen `listNumId`. Alle vier Punkte sind unten korrigiert
> (Abschnitt 0). Wer die alte Fassung kennt: die dort zentralen „Finding
> E/E2/E3"-Tests (Schema-Fix, Absturz) sind **bereits im Code gelöst** und hier
> nur noch als **Regressions-Sperre** geführt; dafür kommt die komplett fehlende
> Ebenen-Klemmung (Befund 6) mit dem **DOCX-Rundreise-Datenverlust** als
> höchstpriorer neuer Testblock hinzu.

---

## 0. Stichprobenprüfung des Ist-Codes (QA-Gegenkontrolle)

Bevor der Plan aufgestellt wird, wurden die zentralen Behauptungen aus
`absatzformat-dropdown-req.md` Abschnitt 0 (Befunde 1–10) und
`absatzformat-dropdown-code.md` Abschnitt 1/2 **direkt am aktuellen Code**
nachvollzogen (Symbolname zuerst, Zeile als Sekundärnachweis — Zeilen driften
pro Pipeline-Lauf):

| Befund/Behauptung | QA-Gegenkontrolle (gelesene Fundstelle) | Ergebnis |
|---|---|---|
| **B1** — `Toolbar.tsx` natives `<select aria-label="Absatzformat">`, Optionen „Standard"/„Überschrift 1–6" | `src/formats/shared/editor/Toolbar.tsx:166` (`aria-label`), `:167` (`value={currentHeadingLevel()}`), `:170` (`onChange → setHeading`), `:177` (`Überschrift {level}`) | **Bestätigt.** Kein `disabled`, kein `title` — der in `code.md` §4.2 geplante Disabled-Zustand existiert noch **nicht**. Option-`value` ist `'normal'` bzw. `'1'`…`'6'`. |
| **B2** — `currentHeadingLevel()` reagiert auf jede Transaktion; für Level > 6 keine passende `<option>` | `Toolbar.tsx:114-122`; Re-Render über `WordEditor.tsx` `forceRender` in `dispatchTransaction` | **Bestätigt.** Reine `for`-Schleife über `$from`-Tiefe, `'normal'` bei `paragraph`, sonst `String(level)`; kein Bezug zu `CellSelection.ranges`. Optionen nur 1–6 → für Level 7–10 zeigt der `<select>` **keinen** Eintrag. |
| **B3** — `setHeading` No-Op bei Mehrblock-Selektion | `commands.ts:40-55`; `if (!$from.sameParent($to)) return false` (`:45`) | **Bestätigt, zeilengenau.** Danach zusätzlich `if (!alignableTypes.has(parent.type.name)) return false` (`:47`). Einzelblock-Umwandlung über `$from.before($from.depth)` (`:49-50`). Kein `collectHeadingTargets`/`canSetHeading`/`headingTargetsInSelection` im Code — reiner Planungsstand (`code.md` §4.1). |
| **B4** — `align` beim Wechsel hart auf `'left'` | `commands.ts:43`: `const attrs = level === null ? undefined : { level, align: 'left' }` | **Bestätigt, zeilengenau.** Bei Rückwechsel zu Standard `attrs === undefined` → `setBlockType` nimmt Node-Default `align: 'left'` (`schema.ts`, `alignAttr`). Verlust bestätigt; Reader/Writer geben `align` beidseitig korrekt durch (der Verlust entsteht **ausschließlich** in dieser Editor-Zeile). |
| **B5** — `list_item.content` ist **bereits** `'block+'` (nicht `'paragraph block*'`) | `src/formats/shared/schema.ts:146-147` (`list_item: { content: 'block+' }`, mit Kommentar zu realen verschachtelten Fixtures, Z. 139); `tableNodes({ … cellContent: 'block+' })` (`:154`) | **Bestätigt — korrigiert die frühere QA-Fassung.** Überschrift ist an **jeder** Position eines Listenpunkts erzeugbar; die „erster-vs-zweiter-Absatz"-Inkonsistenz **existiert nicht mehr**. Der frühere „Finding E3"-Absturz ist damit **bereits behoben** (`code.md` Finding D/§2.4). Offen bleibt nur die **Export-Rundreise** (Finding F). |
| **B6** — **keine** Klemmung des Levels auf 1–6; DOCX-Rundreise verliert Level > 6, ODT behält es | `schema.ts` `heading.attrs.level` = `{ default: 1, validate: 'number' }`; `docx/reader.ts:69-76` `headingLevelForStyle` (Regex `^Heading\s?([1-6])$`, `:73`; `outlineLvl+1`, **kein** `Math.min`); `odt/reader.ts:257` `Number(outline-level) \|\| 1` (**kein** `Math.min`) | **Bestätigt — in der früheren QA-Fassung komplett fehlend.** DOCX schreibt `Heading7` (in `styleDefs.ts` **undefiniert**) → Reimport: Regex trifft nicht, kein `outlineLvl` → Absatz wird **Standard = Ebene verloren**. ODT liest `text:outline-level` direkt → **Ebene bleibt**. Asymmetrie + stiller DOCX-Datenverlust bestätigt. Kein Fix im Code (`code.md` §3.4/§4.4/§4.5 geplant). |
| **B7** — ODT: nur `office:automatic-styles` ausgewertet, `office:styles` (benannte/vererbte Vorlagen) **nirgends** | `odt/reader.ts:363-364` (`contentAutomaticStyles`), `:373-374` (Chrome), `parseAutomaticStyles` (`:37-77`); Heading-Align `styles.paragraphAligns.get(styleName) \|\| 'left'` (`:259`), Absatz-Align (`:178`) | **Bestätigt, zeilengenau.** Kein Zugriff auf den `office:styles`-Container; `style:parent-style-name` nirgends aufgelöst. Ausrichtungsverlust bei realen LibreOffice-Dateien mit gemeinsamer Heading-Vorlage bestätigt (Text/Level bleiben, da `outline-level` am Element steht). Fix `code.md` §3.5/§4.5, **abgestimmt mit `fett-code.md` §4.8 — dieselbe Funktion**. |
| **B8** — DOCX: `w:basedOn`-Vererbung nicht aufgelöst | `docx/reader.ts:49-66` `HeadingInfo`/`parseStylesXml` (nur `outlineLvlByStyleId`, **kein** `basedOnByStyleId`), `:69-76` `headingLevelForStyle` | **Bestätigt.** Eine per `w:basedOn` von „Heading N" erbende Vorlage ohne eigenes `w:outlineLvl` und ohne Regex-treffende Style-ID → als Standard importiert = Level verloren. Fix `code.md` §4.4. |
| **B9** — Export: „Heading N"-Vorlage trägt selbst Fett + Größe (kein Fix nötig) | `docx/styleDefs.ts` `headingStylesXml` (`<w:b/>`+`<w:sz>`); `odt/styleRegistry.ts` `headingStyleDefs` (`font-weight="bold"`+`font-size`), je 1–6 | **Bestätigt.** Wechsel „Überschrift → Standard" entfernt die stilgebundene Fettung korrekt (Node-Typ + Stilreferenz wechseln). Keine Änderung. |
| **B10** — vorhandene E2E-Abdeckung bedient das Dropdown bereits (Ebene 1/2) | `Grep 'Absatzformat'/'selectOption'` in `tests/e2e/` | **Bestätigt — korrigiert die frühere QA-Behauptung „kein Test bedient das Dropdown".** Treffer: `clipboard.spec.ts:174` (`selectOption('2')`)/`:179` (`selectOption('normal')`); `clipboard-roundtrip.spec.ts:38/43/90/95`. Grundpfad (Ebene 1/2 erzeugen, auf Standard zurück, rendern, DOCX/ODT exportieren) **ist** end-to-end getestet. Neue Tests bauen darauf **auf**. |
| **Finding A** (`code.md` §2.1) — `CellSelection.from/.to` = `ranges[0]`, deckt nur Anker-Zelle | `commands.ts:44-47`; `prosemirror-tables`-Semantik | **Plausibel, aber von QA (noch) nicht durch einen eigenen dauerhaften Testlauf empirisch belegt** — `code.md` verweist auf ein bereits entferntes Scratch-Skript. **Konsequenz: Test C9 unten schreibt genau diesen Nachweis als dauerhaften Unit-Test fest.** Zusatz: der heutige `CellSelection`-No-Op entsteht **nicht** über `sameParent` (das ist bei einer `CellSelection` **wahr**, da `$from`/`$to` in derselben Anker-Zelle liegen), sondern über `commands.ts:47` (`parent` ist `table_cell`, nicht in `alignableTypes`) — die Ursachenangabe „unterschiedliche Elternknoten" aus `req.md` 2.7 ist zu korrigieren. |
| **Finding C** (`code.md` §2.3) — Überschriften im Editor **nicht** per CSS fett | `Grep 'font-weight'` in `src/index.css` | **Bestätigt** (auch in `fett-qa.md` §0 dokumentiert). `.ProseMirror h1…h6` setzt nur `margin`, kein `font-weight`; das einzige `font-weight:600` steht bei `th`. Relevant für H18/H19 unten. |
| **Finding F** (`code.md` §2.5) — DOCX-Writer verliert `<w:numPr>` bei Überschrift-in-Liste; Parameter heißt `listContext` (`{numId, level}`), **nicht** `listNumId` | `docx/writer.ts:109-123`: Fall `'paragraph'` (`:112-117`) baut `numPr` aus `listContext`; Fall `'heading'` (`:119-122`) referenziert `listContext` **nirgends** | **Bestätigt, zeilengenau, eigenständig durch QA gelesen.** Der Parametername ist `listContext` mit Feldern `{numId, level}` (`:109`, `:114-115`, `:134-136`) — die frühere QA-Fassung nannte fälschlich `listNumId`. Fix `code.md` §4.6. |
| **Finding F2** (`code.md` §2.5a) — DOCX-**Reader** streift die Listenzugehörigkeit einer Überschrift beim Reimport wieder ab; der Writer-Fix (F) allein ergibt **keine** funktionierende Rundreise | `docx/reader.ts:475-476`: `for (const block of paragraphToBlocks(child, …)) items.push({ marker: block.type === 'paragraph' ? marker : { numId: null, ilvl: 0 }, block })` | **Bestätigt, zeilengenau, eigenständig durch QA gelesen — in der früheren QA-Fassung und in der Erst-Fassung dieses Plans komplett fehlend.** Nur `'paragraph'`-Blöcke behalten den `numPr`-Marker; jeder Nicht-Paragraph — **inkl. `'heading'`** — bekommt zwangsweise `{ numId: null, ilvl: 0 }` und wird von `groupLists` (`:379-427`) als listenfremd behandelt → schließt die offene Liste und landet als **eigenständiger Top-Level-Block daneben**. Folge: Selbst **nach** dem Writer-Fix (F) wäre die `<w:numPr>`-XML-Assertion grün, die **echte Rundreise** (Editor → DOCX → Editor) aber rot — genau der stille Reimport-Datenverlust, den Abnahme 9 verbietet. **Der QA-Nachweis darf sich daher nicht auf die XML-Ebene beschränken** (siehe neuen Test **D6b**). Fix `code.md` §4.6 Teil 2 (Reader). |
| Fixture-Existenz | `Glob tests/fixtures/external/**` + gezielte `styles.xml`-Inspektion (nicht nur Dateiname) | **Vorhanden & für dieses Feature relevant:** `docx/heading123.docx` (einfache Überschriften); **`docx/Styles.docx` — reale Fixture für Befund 8:** Überschriften-Vorlagen mit **lokalisierter/verstümmelter Style-ID** `berschrift1`/`berschrift2`/`berschrift3` (Regex `^Heading\s?([1-6])$` **verfehlt** sie), aber **mit eigenem `w:outlineLvl`** (0/1/2) und `w:basedOn="Standard"` — deckt den in `req.md` Grenzfall 17 genannten Realfall „lokalisiert benannte Überschrift-Vorlage" ab (heute über `w:outlineLvl` erkannt → **grün als Regressionstest**, siehe T4). `odt/MyHeading1.odt`, `ListHeading.odt`, `ListHeading2.odt`, `listStyleId.odt`, `ListStyleResolution.odt`, `doc_heading_table.odt`. **Wichtige Einschränkung für Abnahme 7:** Für den **reinen** `w:basedOn`-Vererbungsfall *ohne* eigenes `w:outlineLvl* (Befund 8 im engeren Sinn, T1) ist **keine** reale Fixture bestätigt — `Styles.docx` trägt eigenes `outlineLvl`, deckt diesen Unterfall also **nicht** ab. T1 bleibt daher **synthetisch**; dass DoD 7 „an je mindestens einer realen Fremddatei" für genau diesen Unterfall nur teilweise (über den `Styles.docx`-Nachbarfall) erfüllbar ist, ist als **offener Punkt** zu führen (Abschnitt 8), nicht durch eine synthetische Fixture zu kaschieren. Etwaige weitere Kandidaten (`Numbering.docx` o. ä.) vor Verwendung am tatsächlichen `styles.xml`-Inhalt prüfen. |

**Konsequenz für diesen Testplan:** Alle zehn Befunde und die **fünf** zitierten
`code.md`-Findings (A, C, F, **F2**, sowie die Fixture-Realität) sind sachlich
zutreffend und durch QA unabhängig nachvollzogen. Der aktuelle Code entspricht
exakt dem in `req.md`/`code.md` beschriebenen **Vor-Fix-Stand**. Die in `code.md`
Abschnitt 4 geplanten Funktionen (`collectHeadingTargets`, `canSetHeading`,
`headingTargetsInSelection`, `disabled`-Dropdown, `w:basedOn`-Auflösung,
Ebenen-Klemmung, `office:styles`-Kaskade, `<w:numPr>`-**Writer**-Erhalt **und**
`<w:numPr>`-**Reader**-Erhalt der Listenzugehörigkeit einer Überschrift, Finding
F2) sind **im Code nicht vorhanden**. Jeder Testfall, der das **Ziel**-Verhalten
(Mehrblock erweitert, Ausrichtung erhalten, Ebene-Klemmung, Reader-Lücken
geschlossen, `numPr` beim Export **und** beim Reimport erhalten) prüft, ist daher
**heute als ROT erwartet** zu führen (Abschnitt 5), nicht als bereits bestehendes
grünes Verhalten.

> **QA-Review-Nachtrag (diese Revision):** Gegenüber der ersten QA-Fassung dieses
> Plans wurden fünf Lücken geschlossen, die eine Gegenkontrolle am Ist-Code
> aufgedeckt hat: (1) **Finding F2** (Reader streift den Listenmarker der
> Überschrift beim Reimport ab, `docx/reader.ts:476`) war weder in Abschnitt 0
> noch als Testfall erfasst → neuer Rundreise-Test **D6b**; (2) die reale Fixture
> **`docx/Styles.docx`** (lokalisierte Style-ID `berschrift1` + eigenes
> `outlineLvl`) war übersehen → Test **T4** nutzt sie jetzt real, Test **H35b**
> importiert sie im Browser; (3) die Traceability-Zuordnung für `req.md` §5.13/§5.14
> war **vertauscht** (Ebene>6 ↔ Selection-Sync) → korrigiert; (4) `req.md` §5.19
> und Abnahme-Punkt **10** (sichtbare Editor-Darstellung der Überschriften,
> Befund 11) fehlten in Traceability und DoD-Tabelle → Test **H51** + DoD-Zeile
> ergänzt; (5) eine **deterministischere** Selektions-Sync-Primitive (Polling
> statt fixem 50-ms-Schlaf) als optionale Härtung ergänzt (1.2).

---

## 1. Testumgebung und Determinismus-Grundsätze

### 1.1 Umgebung
- **Unit-Tests:** `npm test` (Vitest, `jsdom`-Environment).
- **E2E-Tests:** `npm run test:e2e` (Playwright, `playwright.config.ts`):
  - `baseURL` auf `vite preview`; `webServer` baut (`npm run build`) und startet
    die Vorschau automatisch.
  - Drei Projekte: **Desktop Chrome**, **Mobile** (`Pixel 7`), **Tablet**
    (`iPad Mini`) — jeder neue Testfall muss in **allen drei** grün sein, sofern
    er nicht explizit auf reine Tastaturbedienung angewiesen ist (siehe 3.7).
- **Bestehende Konventionen** (aus `docx.spec.ts`/`odt.spec.ts`/
  `selection-regression.spec.ts`/`clipboard.spec.ts` übernommen, in neuen Tests
  beizubehalten):
  - `page.goto('/')` → Privacy-Banner wegklicken:
    `page.getByRole('button', { name: /verstanden/i }).click()`.
  - Neues leeres Dokument: über die Format-Karte,
    `card.getByRole('button', { name: 'Neu erstellen' }).click()`
    (`selection-regression.spec.ts:11`).
  - Karten-Locator: `page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'OpenDocument Text (.odt)' }) })`
    bzw. für DOCX analog.
  - Editor-Locator: `page.locator('.ProseMirror')`.
  - **Absatzformat-Dropdown:** `page.getByLabel('Absatzformat')`, bedient über
    `selectOption({ label: 'Überschrift 1' })` bzw. `selectOption('normal')` /
    `selectOption('3')` (Option-`value` ist die Ebenen-Zeichenkette oder
    `'normal'`, `Toolbar.tsx:174-179`). **Kein** Testfall in Teil B darf
    stattdessen `setHeading(...)` direkt importieren/aufrufen — das ist die im
    Auftrag ausdrücklich verlangte Abgrenzung.
  - Fett-/Ausrichtungs-Buttons: `page.getByTitle('Fett')` bzw. Ausrichtungs-Titel
    (`selection-regression.spec.ts:20`) — genaue Titel vor Testimplementierung an
    `Toolbar.tsx` verifizieren.
  - Export: `page.getByRole('button', { name: 'Exportieren' })` +
    `page.waitForEvent('download')`.
  - Datei-Upload, **echter** Klickpfad (3.4): `page.waitForEvent('filechooser')`
    gemeinsam mit dem Klick auf „Datei hochladen".

### 1.2 Determinismus (bindende Vorgabe aus dem Auftrag)

Der Absatzformat-Wechsel ist — wie „Fett" — eine Toolbar-Transaktion auf eine
ggf. leere/asynchron nachgezogene Selektion und daher ein bekannter Auslöser für
den Selection-Sync-Bug (`req.md` Grenzfall 15). Alle E2E-Tests **müssen**
deterministisch sein; folgende Regeln sind Pflicht:

1. **Selektions-Sync abwarten nach jeder tastatur-/mausgetriebenen
   Cursorbewegung, bevor die nächste Aktion folgt.** ProseMirror lernt einen
   nativen Caret-Move (z. B. `End`, ein Klick zur Neupositionierung) erst über
   das **asynchrone** `selectionchange`-Event des Browsers. Eine sofort folgende
   `press('Enter')`/`selectOption(...)` kann diesem Nachziehen vorauslaufen. Das
   etablierte Muster der Suite ist ein kurzer `await page.waitForTimeout(50)`
   **zwischen** dem Caret-Move und der Folgeaktion (identisch zu
   `selection-regression.spec.ts:34/72/103`, dort ausführlich kommentiert). Neue
   Tests übernehmen exakt dieses Muster — **nicht** kürzer, **nicht** entfernt.
2. **Keine zu schnellen Tastatureingaben.** Statt eines einzigen
   `keyboard.type('...')` mit Standard-0ms-Delay dort, wo unmittelbar danach eine
   selektionsabhängige Transaktion (Dropdown-Wechsel, Enter) folgt, gilt: erst
   tippen, dann Cursor bewusst positionieren, dann `waitForTimeout(50)`, dann die
   Transaktion. Wo Tippgeschwindigkeit selbst Teil des Tests ist (H44,
   „viele Wechsel in kurzer Folge"), wird **nicht** über die Tastatur gerast,
   sondern deterministisch über wiederholte `selectOption(...)`-Aufrufe, deren
   Ergebnis nach jedem Schritt per `expect(select).toHaveValue(...)` abgewartet
   wird.
3. **Zustand über auto-retriggernde Web-First-Assertions abwarten, nie über
   feste Schlafzeiten prüfen.** Nach `selectOption(...)` wird das Ergebnis mit
   `await expect(editor.locator('h1')).toBeVisible()` bzw.
   `await expect(select).toHaveValue('1')` verifiziert (Playwright pollt
   automatisch bis zum Timeout). `waitForTimeout` ist **ausschließlich** für den
   in Regel 1 beschriebenen `selectionchange`-Sync erlaubt, **nie** als Ersatz
   für eine Zustands-Assertion.
4. **Downloads deterministisch abgreifen:** `const [download] =
   await Promise.all([page.waitForEvent('download'), exportButton.click()])`,
   dann `await download.saveAs(path)` und erst danach parsen — kein Prüfen der
   Datei, bevor das `download`-Event aufgelöst ist.
5. **Uploads deterministisch:** `filechooser`-Event **im selben** `Promise.all`
   wie der auslösende Klick (siehe 3.4), danach auf ein sichtbares Ergebnis im
   Editor warten (`await expect(editor.locator('h1')).toBeVisible()`), bevor
   weitergearbeitet wird.
6. **Konsolen-/Seitenfehler global scharf stellen:** In jedem Spec
   `page.on('pageerror', …)` und `page.on('console', msg => msg.type()==='error')`
   sammeln und am Testende `expect(errors).toEqual([])` — kein stiller
   JS-Fehler darf durchrutschen (Abnahme 9).

**Optionale Härtung gegen Rest-Flakiness (empfohlen für die Selection-Sync-Fälle
H23–H25):** Der in Regel 1 vorgeschriebene `waitForTimeout(50)` ist der
**etablierte** Suite-Standard und deterministisch genug für die bekannten Fälle,
bleibt aber ein **fester Heuristik-Schlaf** — auf einem stark ausgelasteten
CI-Runner ist ein einzelner `selectionchange` theoretisch nicht garantiert
innerhalb 50 ms nachgezogen. Wo ein Fall unter CI dennoch flakt, ist die
**robustere** Primitive: nicht fest schlafen, sondern **auf den tatsächlich
nachgezogenen Selektionszustand pollen**. Der ProseMirror-`view` ist heute
**nicht** auf `window` exponiert (nur `window.__testHooks__.forceNextExportError`,
`DocumentWorkspace.tsx:58`, gated über `__ENABLE_TEST_HOOKS__`). Empfehlung:
`__testHooks__` **test-only** um einen Lesezugriff auf `view.state.selection.head`
(oder den Node-Typ an `$from`) erweitern und dann
`await page.waitForFunction((h) => window.__testHooks__.selectionHead() === h, expected)`
statt `waitForTimeout(50)` verwenden. Das ist eine echte Zustands-Assertion (Regel
3) statt eines Schlafs und macht die Selection-Sync-Tests unabhängig von der
Runner-Last. Bis dieser Hook existiert, bleibt `waitForTimeout(50)` der bindende
Standard (Regel 1) — die Härtung ist ein **Verbesserungs-**, kein Blocker-Punkt.

---

## 2. Teil A — Unit-Tests: Reader/Writer-Rundreise (DOCX + ODT) + Command-Ebene

**Zweck:** Schnelle, browserunabhängige Absicherung der Datenebene (Node-Typ/
Level/Ausrichtung ⇄ XML) und der Editor-Command-Ebene (`setHeading` und die in
`code.md` §4.1 geplanten Hilfsfunktionen). Diese Ebene ist von der
UI-Bedienung entkoppelt. **Keine** Playwright-Interaktion.

### 2.1 Bestandsaufnahme (bereits vorhanden, als Basisschutz zu erhalten)

| Datei | Test (heute) | Deckt ab |
|---|---|---|
| `src/formats/docx/__tests__/roundtrip.test.ts` | `describe('DOCX round trip: headings')` → „preserves heading levels and text" (Level 1/2), „preserves heading alignment" (**nur** `center`) | `req.md` 4.1.1 (Grundfall), 4.1.5 (nur center) |
| `src/formats/odt/__tests__/roundtrip.test.ts` | analog | `req.md` 4.2.1 |
| `src/formats/{docx,odt}/__tests__/external-fixtures.test.ts` | Import realer Fixtures, bisher überwiegend „importiert ohne Absturz" | Teilabdeckung 4.1.7/4.2.7 (siehe 2.5 für gezielte Assertions) |
| `src/formats/shared/editor/__tests__/commands.test.ts` | existiert (bisher `canCut`/`cutSelection` u. a.) | Ziel-Datei für den `setHeading`-Block (2.2) |

Diese Tests bleiben Teil der Suite; sie werden **ergänzt**, nicht ersetzt.

### 2.2 Erweitert: `src/formats/shared/editor/__tests__/commands.test.ts` (heading-Block)

**Koordinationshinweis:** `fett-code.md`/`fett-qa.md` planen in derselben Datei
einen `isMarkActive`-Block. Beide Gruppen als je eigener `describe`-Block in
**derselben** Datei zusammenführen, nicht als konkurrierende Dateien.

Unit-Tests **gegen den aktuellen Code** (dokumentieren die in Abschnitt 0
bestätigten Bugs, bevor `code.md` §4.1 umgesetzt ist):

| # | Testfall | Vorgehen | Erwartung (aktueller Code) | Bezug |
|---|---|---|---|---|
| C1 | Cursor ohne Selektion in einem Absatz → Überschrift | `EditorState` mit Cursor in `paragraph`, `setHeading(1)(state, dispatch)` | `true`; Node wechselt zu `heading`, `level: 1` | 2.1, §5.1 |
| C2 | Direkter Ebenenwechsel 2 → 5 in einem Aufruf | Cursor in `heading(level:2)`, `setHeading(5)(…)` | `true`, `level: 5`, kein Zwischenzustand | 2.1, Grenzfall 10 |
| C3 | Rückwechsel zu Standard | Cursor in `heading`, `setHeading(null)(…)` | Node-Typ `paragraph` (echter Typwechsel, `node.type.name === 'paragraph'`) | 2.4 |
| C4 | **Befund 3** — Selektion über zwei Absätze | `$from`/`$to` in verschiedenen `paragraph`-Nodes, `setHeading(1)(…)` | `false` (No-Op), **kein** `dispatch`. **Status heute: GRÜN** (dokumentiert den Ist-Bug). **Nach `code.md` §4.1 auf „beide Blöcke konvertiert" umschreiben** (→ dann C12). | 2.3, Grenzfall 2 |
| C5 | **Befund 4** — Ausrichtungsverlust beim Wechsel | `paragraph` mit `align:'center'`, `setHeading(1)(…)` | Ergebnis-`heading` hat `align:'left'`, **nicht** `'center'`. **Status heute: GRÜN** (Bug). **Nach Fix §3.2/§4.1: Erwartung `align:'center'`.** | 2.5, Grenzfall 8 |
| C6 | Kumulativer Ausrichtungsverlust über zwei Wechsel | `align:'center'` → `setHeading(1)` → `setHeading(null)` | Aktuell nach beiden Wechseln `align:'left'`; nach Fix bleibt `'center'` über beide erhalten | Grenzfall 9 |
| C7 | **Regressions-Sperre Befund 5** — Überschrift an **jeder** Position im Listenpunkt | Zwei Fixtures: (a) Cursor im **ersten** Kind eines `list_item` (`content:'block+'`), (b) im **zweiten** Kind desselben `list_item`; je `setHeading(1)(…)` | **Beide** liefern `true` (keine „erster-vs-zweiter"-Inkonsistenz mehr). **Status heute: GRÜN** — sichert den bereits vorhandenen `'block+'`-Zustand gegen ein stilles Zurückregredieren (`code.md` Finding D/§2.4). | 2.6, Grenzfall 4/5 |
| C8 | Tabellenzelle, einzelne Position | Cursor in `table_cell` (`block+`), `setHeading(2)(…)` | `true`, jede Position konvertierbar | 2.7, Grenzfall 6 |
| C9 | **`CellSelection` über mehrere Zellen — Ursachennachweis Finding A** | 2×2-`CellSelection` (Anker A1, Kopf B2) via `prosemirror-tables` aufbauen; `state.selection.from/.to`, `$from.sameParent($to)` und `$from.parent.type.name` protokollieren, dann `setHeading(2)(state, dispatch)` | Aktuell: `sameParent` ist **true** (widerlegt „unterschiedliche Elternknoten" aus `req.md` 2.7); `$from.parent` ist `table_cell`; `setHeading` liefert dennoch `false`, weil `table_cell ∉ alignableTypes` (`commands.ts:47`). **Dauerhafter QA-Nachweis für Finding A** (ersetzt das entfernte Scratch-Skript); **Status heute: GRÜN**, nach Fix mit umgekehrter Erwartung (alle vier Zellen Ziel). | Grenzfall 7, `code.md` §2.1 Finding A |
| C10 | Selektion über Absatz **und** Überschrift gemeinsam | `$from` in `paragraph`, `$to` in benachbartem `heading` | `false` (No-Op, `sameParent` falsch); Dropdown-Anzeige separat auf Toolbar-Ebene (H43) | Grenzfall 3 |
| C11 | Leerer Absatz | leeres `paragraph`, Cursor darin, `setHeading(1)(…)` | `true`, kein Wurf | Grenzfall 1 |

Zusätzliche Tests **für den in `code.md` §4.1 geplanten** (noch nicht
existierenden) Funktionsumfang — dürfen erst geschrieben werden, wenn
`collectHeadingTargets`/`canSetHeading`/`headingTargetsInSelection` tatsächlich
exportiert sind (vorher scheitert bereits der Import):

| # | Testfall | Erwartung nach Umsetzung §4.1 |
|---|---|---|
| C12 | Selektion über zwei Absätze → zwei Targets | `collectHeadingTargets` liefert 2; `setHeading` konvertiert **beide** in **einer** Transaktion (`tr.docChanged`, ein Undo-Schritt); jeder Block behält seine **eigene** vorherige `align` |
| C13 | `CellSelection` über 2×2 Zellen → vier Targets | Alle vier Zellen werden Überschriften; **ein** Undo-Schritt nimmt alle vier zurück (Nachweis über `selection.ranges`, nicht `selection.from/.to`) |
| C14 | `CellSelection` über eine reine Bild-/Nicht-Textblock-Zelle | Keine Targets, `canSetHeading(state) === false` |
| C15 | Cursor im ersten **und** zweiten Kind eines Listenpunkts | Je genau ein Target (Konsistenz mit C7) |
| C16 | Konsistenz Anzeige ↔ Verhalten | `canSetHeading`/`headingTargetsInSelection` liefern für dieselbe Selektion Ergebnisse, die exakt zu `setHeading`s Rückgabe passen — kein Auseinanderlaufen von `disabled`-Logik und Command (Abnahme 9) |

### 2.3 Erweitert: `src/formats/docx/__tests__/roundtrip.test.ts`

| # | Testfall | Vorgehen | Erwartung | Bezug |
|---|---|---|---|---|
| D1 | Alle vier Ausrichtungen für Überschriften | `it.each(['left','center','right','justify'])`, `heading`-Node je `align` → `writeDocx` → `readDocx` (analog vorhandener Absatz-Parametrisierung Z. 55) | `align` bleibt je Fall erhalten (erweitert die heute nur für `center` bestehende Abdeckung) | 4.1.5 |
| D2 | Level 3–6 (heute nur 1/2) | `it.each([3,4,5,6])` | Level bleibt erhalten | 4.1.1 |
| D3 | Struktur-Test mit **unabhängigem** Parser | Nach `writeDocx`: rohes `word/document.xml` per JSZip + `DOMParser` (nicht die `writeDocx→readDocx`-Rundreise) auf `<w:pStyle w:val="Heading3"/>` im `w:pPr` des betroffenen `w:p` prüfen | Erfüllt Abnahme 4.1.2 wörtlicher als ein reiner Reader-Rundreise-Test | 4.1.2 |
| D4 | Rückwechsel „Heading3" → Standard | `paragraph` statt `heading` → `writeDocx` | Export enthält **kein** `<w:pStyle>` (bzw. keine `HeadingN`-Referenz) für diesen Absatz | 4.1.3 |
| D5 | Ebenenwechsel „Heading2" → „Heading5" in einem Schritt | `heading(level:5)` direkt → `writeDocx` | Export referenziert ausschließlich `Heading5`, keine `Heading2`-Reste | 4.1.4 |
| D6 | **Regressions-Sperre Finding F (nur XML-Ebene)** — Überschrift-in-Liste behält `<w:numPr>` | `bullet_list` → `list_item` mit **`heading`**-Kind (Level beliebig) → `writeDocx` → `document.xml` per JSZip+DOMParser parsen | `<w:numPr>` mit passender `w:numId`/`w:ilvl` im `w:pPr` der Überschrift, **`w:pStyle` vor `w:numPr`** (OOXML-`pPr`-Reihenfolge). **Status heute: ROT** (Fall `'heading'` in `docx/writer.ts:119-122` ignoriert `listContext`) — nach `code.md` §4.6 **Teil 1** grün. **Achtung: D6 allein genügt nicht** — es wird auch mit nur dem Writer-Fix grün, deckt Finding F2 aber **nicht** auf (siehe D6b). | Finding F, §4.6 Teil 1 |
| **D6b** | **Regressions-Sperre Finding F2 (Rundreise-Ebene, entscheidend)** — Überschrift bleibt beim **Reimport** Listenmitglied | Wie D6, aber **volle Rundreise**: `writeDocx` → `readDocx` → das Ergebnis-Dokumentmodell strukturell prüfen | Die Überschrift liegt wieder **innerhalb** eines `bullet_list`/`ordered_list` → `list_item` → `heading`, **nicht** als Top-Level-Block **neben** der Liste. **Status heute: ROT** und bleibt **auch mit nur Writer-Teil-1 ROT** (der Reader streift den Marker in `docx/reader.ts:476` wieder ab) — erst mit `code.md` §4.6 **Teil 2** (Reader) grün. **Ohne diesen Test bliebe der stille Reimport-Verlust unbemerkt (Abnahme 9);** D6 (XML-grün) würde fälschlich „behoben" suggerieren. Zusätzlich: aus einem Absatz herausgelöste `image`/`unsupported_block`-Blöcke dürfen den Marker weiterhin **nicht** erben (Guard-Zweck von `:476` bleibt) — negativ mitprüfen. | **Finding F2, §4.6 Teil 2** |
| D7 | **Befund 6** — DOCX-Rundreise einer Ebene 7 | Reader-seitig ein Dokument mit Stil-ID `Heading7` (bzw. `w:outlineLvl` 6) importieren → `writeDocx` → erneut `readDocx` | **Status heute: ROT** — Reimport verliert die Ebene (Absatz wird Standard). Nach Clamp (§4.4) landet die Rundreise verlustfrei auf **Level 6**. Dieser Test macht den **stillen DOCX-Datenverlust** maschinell sichtbar. | Befund 6, Grenzfall 11, §4.4 |
| D8 | Cross-Format-Datenebene für 4.1.6 | ODT-Modell mit Überschriften → (simulierter Import) → DOCX-Modell → `writeDocx` | Level/Text bleiben erhalten (Datenebene, ergänzt Browser-Test H33/H34) | 4.1.6 |

### 2.4 Erweitert: `src/formats/odt/__tests__/roundtrip.test.ts`

Analog 2.3:

| # | Testfall | Erwartung | Bezug |
|---|---|---|---|
| O1 | Alle vier Ausrichtungen für Überschriften | `align` bleibt je Fall erhalten | 4.2.5 |
| O2 | Level 3–6 | Level bleibt erhalten | 4.2.1 |
| O3 | Überschrift (simuliert) → Export | `content.xml` enthält `<text:h text:style-name="Heading4-<align>" text:outline-level="4">` (`odt/writer.ts:97`, `headingStyleName`; Stildefinition in `office:automatic-styles`) | 4.2.2 |
| O4 | Rückwechsel zu Standard | Export enthält `<text:p>` (mit Ausrichtungs-Stil) statt `<text:h>`, **kein** `text:outline-level` mehr (`odt/writer.ts:91`) | 4.2.3 |
| O5 | Ebenenwechsel in einem Schritt | Nur neue Ebene referenziert | 4.2.4 |
| O6 | Überschrift innerhalb eines Listenpunkts | Bleibt strukturell korrekt verschachtelt (`<text:h>` in `<text:list-item>`); **kein** Finding-F-Gegenstück nötig (ODF bildet Listenmitgliedschaft rein strukturell ab, `odt/writer.ts` Listen-Fall reicht jedes Kind unverändert weiter) | 4.2.2, Grenzfall 5 |
| O7 | **Befund 6** — ODT-Rundreise einer Ebene 7 als Kontrast zu D7 | ODT mit `text:outline-level="7"` importieren → export → reimport | **Heute:** Level bleibt 7 (direktes `outline-level`), Stilreferenz undefiniert. **Nach Clamp (§4.5):** Level wird **6** — beide Formate verhalten sich danach identisch (Kontrast zum DOCX-Verlust in D7). | Befund 6, 4.2.6 |

### 2.5 Erweitert: `external-fixtures.test.ts` (DOCX + ODT) — gezielte Assertions

| # | Fixture | Testfall | Erwartung | Bezug |
|---|---|---|---|---|
| E1 | `tests/fixtures/external/odt/MyHeading1.odt` | `Heading2`-Überschrift korrekt als `level: 2` erkannt, obwohl `Heading2` in `office:styles` (nicht `automatic-styles`) deklariert ist | Text/Level bleiben (heute schon, da `outline-level` am Element); **zusätzlich den `align`-Wert des importierten Node protokollieren** (Nachweis für Befund 7 — vor Fix vermutlich `'left'`, sofern die Fixture überhaupt ein `fo:text-align` in `office:styles` deklariert) | Befund 7, Grenzfall 16, 4.2.7 |
| E2 | `odt/ListHeading.odt` | `list_item` mit zwei Kindern (erstes `paragraph`, zweites `heading`) | Beide Kinder korrekt erkannt, `outline-level` des zweiten stimmt | Befund 5, Grenzfall 5 |
| E3 | `odt/ListHeading2.odt` | analog E2 | analog | Befund 5 |
| E4 | `odt/listStyleId.odt` | **Regressions-Sperre (bereits behobener Absturz):** `wordSchema.nodeFromJSON(doc.body)`, dann `splitListItem` an der Überschrift-im-Listenpunkt-Position als Dry-Run (`command(state, undefined)`) | Darf **nicht** werfen (`RangeError: … invalid content` ist mit dem `'block+'`-Schema behoben). **Status heute: GRÜN** (dokumentiert den behobenen Zustand); dauerhafte Sperre gegen ein Schema-Rückregredieren. | `code.md` §2.4, Grenzfall 4/5 |
| E5 | `docx/heading123.docx` | Level und Text korrekt erkannt | Einfache Rundreise-Kandidatin | 4.1.7 |
| E6 | `odt/ListStyleResolution.odt` / `odt/doc_heading_table.odt` | Bereits vorhandene reale Fixtures inhaltlich öffnen und als Zusatz-Regressionsschutz mit gezielter Level-/Struktur-Assertion versehen (statt nur „kein Absturz") | Text/Level/Struktur wie beim ersten Import stabil | Befund 5/7 |

### 2.6 Neu: `src/formats/docx/__tests__/reader-edge-cases.test.ts`

| # | Testfall | Vorgehen | Erwartung | Bezug |
|---|---|---|---|---|
| T1 | **Befund 8** — Level nur über `w:basedOn` geerbt | Hand-gebauter `styles.xml`-Ausschnitt: Stil `CustomHeading` mit `<w:basedOn w:val="Heading1"/>`, **ohne** eigenes `w:outlineLvl`; Dokument referenziert `w:pStyle w:val="CustomHeading"` | `heading`-Node mit `level: 1`. **Status heute: ROT** (`HeadingInfo` hat kein `basedOnByStyleId`) — nach `code.md` §4.4 grün. | Befund 8, Grenzfall 17 |
| T2 | Zyklischer `w:basedOn` (A→B→A) | Analog T1, zyklische Kette | Kein Hang/Absturz, Rückgabe `null` (analog `MAX_TABLE_NESTING_DEPTH`-Muster; §4.4 `MAX_STYLE_INHERITANCE_DEPTH`) | Robustheit, Abnahme 9 |
| T3 | **Befund 6** — Stil-ID „Heading7" bzw. `w:outlineLvl`-8-Vorlage | Hand-gebauter Stil, importiert | Level **6** (geklemmt), nicht 7/8 und nicht „Standard". **Status heute: ROT** (kein Clamp, Regex `[1-6]` trifft „Heading7" nicht → Standard) — nach §4.4 grün. | Befund 6 |
| T4 | **Reale Fixture `Styles.docx`** — lokalisierte/verstümmelte Style-ID (`berschrift1`/`berschrift2`/`berschrift3`, Regex-Miss), aber eigenes `w:outlineLvl` (0/1/2) und `w:basedOn="Standard"` | `readDocx('tests/fixtures/external/docx/Styles.docx')`; QA hat den `styles.xml`-Inhalt direkt inspiziert (nicht am Dateinamen geraten) | Die drei Überschriften werden als `heading` mit `level` 1/2/3 erkannt — über `w:outlineLvl`, **nicht** über den Regex (der `berschrift1` verfehlt). **Status heute: GRÜN** (Regressionstest für den heute schon funktionierenden `outlineLvl`-Pfad) — sichert, dass der `w:basedOn`-Fix in §4.4 diesen realen Fall nicht verschlechtert. Deckt den `req.md`-Grenzfall-17-Realfall „lokalisiert benannte Vorlage" **an echter Fremddatei** ab; der reine basedOn-**ohne**-outlineLvl-Fall bleibt synthetisch (T1). | Befund 8, Grenzfall 17, Abnahme 7 |

### 2.7 Neu: `src/formats/odt/__tests__/reader-edge-cases.test.ts`

Hand-gebaute, minimale ODT-Zips (Muster: `odt.spec.ts`s `buildSampleOdt()`, auf
Unit-Ebene mit JSZip) für deterministische synthetische Fälle:

| # | Testfall | Vorgehen | Erwartung | Bezug |
|---|---|---|---|---|
| S1 | **Befund 7** — `office:styles` statt `automatic-styles`, mit explizitem `fo:text-align` | `<text:h text:style-name="Common1" …>`, `Common1` **nur** in `office:styles`, `fo:text-align="center"` | `align: 'center'` korrekt gelesen. **Status heute: ROT** (vor Fix `'left'`, stiller Verlust) — nach `code.md` §4.5 grün. | Befund 7, §3.5/§4.5 |
| S2 | `style:parent-style-name`-Kette | Stil A erbt von B, nur B deklariert `fo:text-align` | Ausrichtung über die Kette aufgelöst. **Status heute: ROT.** | Befund 7 |
| S3 | Zyklische `style:parent-style-name`-Kette | Analog T2 | Kein Hang/Absturz, Fallback `'left'` (§4.5 `MAX_STYLE_PARENT_DEPTH`) | Robustheit, Abnahme 9 |
| S4 | Namenskollision: derselbe Stilname in `automatic-styles` **und** `office:styles` | Beide mit unterschiedlichem `fo:text-align` | **Automatischer Stil hat Vorrang** (`code.md` §4.5 Vorrangordnung) | §4.5 |
| S5 | **Befund 6** — `text:outline-level="8"` | Minimales ODT | Level **6** (geklemmt). **Status heute: ROT** (kein Clamp, heute Level 8) — nach §4.5 grün. | Befund 6 |

### 2.8 Neu: `src/formats/shared/__tests__/schema.test.ts` (Regressions-Sperre)

Schnelle, browserunabhängige Absicherung des **bereits vorhandenen**
`'block+'`-Zustands (Finding D/§2.4), damit ein stilles Zurücksetzen sofort
auffällt:

| # | Testfall | Erwartung |
|---|---|---|
| SC1 | `list_item.content` aktueller Wert | Ist **`'block+'`** (nicht `'paragraph block*'`) — dokumentiert und sperrt den Ist-Zustand. **Status heute: GRÜN.** |
| SC2 | `canReplaceWith`-Verhalten | **Erstes** und **zweites+** Kind eines `list_item` akzeptieren gleichermaßen `heading` (keine Positions-Asymmetrie) — reproduziert Befund 5 direkt am Schema | 
| SC3 | `createAndFill()` für einen leeren Listenpunkt | Liefert weiterhin einen einzelnen leeren `paragraph` (kein Regressionsrisiko für den Normalfall trotz `'block+'`) |
| SC4 | `wrapInList` auf eine einzelne `heading` | Liefert `true` (mit `'block+'` möglich; mit dem alten `'paragraph block*'` wäre es No-Op). **Status heute: GRÜN**, Regressions-Sperre |
| SC5 | `heading.attrs.level` bleibt `{ default: 1, validate: 'number' }`; `toDOM` erzeugt nach optionaler Härtung (§4.3) nie ein Tag außerhalb `h1`…`h6` | Nach §4.3: `Math.min(Math.max(1, level),6)` in `toDOM`; vor §4.3 dokumentiert der Test, dass `level:7` heute `h7` erzeugt (ungültiges HTML) | Befund 6, §4.3 |

### 2.9 Neu: `src/formats/shared/editor/__tests__/cross-format-roundtrip.test.ts`

Unit-Ebene für Anforderung 4.3 (schneller als E2E, ergänzt Browser-Tests
H38–H40):

| # | Testfall | Vorgehen | Erwartung |
|---|---|---|---|
| X1 | DOCX → ODT → DOCX | Modell mit Überschriften unterschiedlicher Ebenen → `readOdt(writeOdt(readDocx(writeDocx(c))))` → erneut DOCX | Level/Text nach zwei Konvertierungen identisch |
| X2 | ODT → DOCX → ODT | Spiegelbildlich | analog |
| X3 | Formatwechsel + Cross-Format (4.3.3) | Simulierter Formatwechsel (Standard → Überschrift → Standard, inkl. aktuell verlorener Ausrichtung) → Cross-Format-Export/Reimport | Ergebnis = exakter Nach-Wechsel-Zustand; **kein** zufälliges Wiederauftauchen der alten Ausrichtung durch Konvertierungs-Nebeneffekt (expliziter Negativtest) |

---

## 3. Teil B — Echte Playwright-Browser-Tests

**Grundsatz (bindend, wörtliche Auftragsvorgabe):** Kein Testfall in Teil B darf
durch direkten Aufruf interner Funktionen (`setHeading(...)`,
`collectHeadingTargets(...)`, `readDocx(...)` etc.) ersetzt werden. Jeder Fall
läuft über echte Nutzer:innen-Handlungen: `locator.click()`,
`keyboard.press(...)`/`.type(...)`, `select.selectOption(...)`, echtes
`filechooser`-Event für Uploads, `waitForEvent('download')` + Auslesen der
heruntergeladenen Datei mit einem **unabhängigen** Parser (JSZip + DOMParser,
nicht der App-eigene Reader). Determinismus-Regeln aus 1.2 gelten für **jeden**
dieser Fälle.

### 3.1 Neu: `tests/e2e/absatzformat.spec.ts`

Durchgehend `page.getByLabel('Absatzformat')`/`selectOption`. Baut auf der
bestehenden Abdeckung (`clipboard.spec.ts`, `clipboard-roundtrip.spec.ts`, B10)
**auf** und fokussiert die bisher ungetesteten Grenzfälle.

#### 3.1.1 Grundfunktion (Anforderung 2.1/2.2, Testfälle 5.1–5.3)

| # | Test | Konkrete Schritte | Assertion | Bezug |
|---|---|---|---|---|
| H1 | Neuer Absatz → „Überschrift 1" | Editor anklicken, Text tippen, Cursor im Absatz belassen, `selectOption({ label: 'Überschrift 1' })` | `await expect(editor.locator('h1')).toHaveText(text)`; `await expect(select).toHaveValue('1')` | §5.1 |
| H2 | Direkt „Überschrift 4" ohne Zwischenschritt | im Anschluss an H1: `selectOption({ label: 'Überschrift 4' })` | `h4` sichtbar, `h1` weg, kein sichtbarer Zwischenzustand; `select` zeigt `'4'` | §5.2, Grenzfall 10 |
| H3 | Zurück zu „Standard" | `selectOption('normal')` | `p` sichtbar; **zusätzlich** per `page.evaluate` prüfen, dass es ein echter DOM-Tag-Wechsel ist (`querySelector('.ProseMirror p')` existiert, `h4` nicht), keine bloße CSS-Klasse | §5.3, 2.4 |
| H4 | Mehrfachselektion über zwei Absätze | Zwei Absätze tippen; per Maus-Drag markieren (`mouse.down/move/up`, **nicht** `ControlOrMeta+a`, um gezielt eine Mehrblock- ohne Ganzdokument-/Tabellensonderfall zu erzeugen); `waitForTimeout(50)` (Selektions-Sync); `selectOption({ label: 'Überschrift 2' })` | **Vor §3.1/§4.1:** beide bleiben `<p>`, `select` fällt nach kurzer optischer Änderung auf den echten Wert zurück (React-kontrolliert) — nach der nächsten Cursorbewegung prüfen: `await expect(select).toHaveValue('normal')`. **Nach Fix:** beide werden `<h2>`. **Zentraler Nachweis der Design-Entscheidung `req.md` §7 Punkt 3** — Ergebnis nach jedem Lauf konkret eintragen. | §5.4, 2.3, Grenzfall 2 |
| H5 | Konsolenfehler-Freiheit bei H1–H4 | globale `pageerror`/`console.error`-Sammlung (1.2 Regel 6) | Keine JS-Exception, auch nicht beim (aktuellen) stillen No-Op in H4 | Abnahme 9 |

#### 3.1.2 Listen (Anforderung 2.6, Grenzfälle 4/5, Testfälle 5.5/5.6)

| # | Test | Schritte | Assertion | Bezug |
|---|---|---|---|---|
| H6 | Erster (einziger) Absatz eines Listenpunkts → Überschrift | Liste einfügen (Listen-Button), in den Absatz tippen, `selectOption({ label: 'Überschrift 1' })` | **Funktioniert bereits heute** (Schema ist `'block+'`): Listenpunkt wird `<h1>` innerhalb `<li>`. **Status heute: GRÜN.** | §5.5, Grenzfall 4 |
| H7 | Zweiter Block **desselben** Listenpunkts → Überschrift | Falls per UI ein zweiter Block im selben `<li>` erzeugbar ist (vor Implementierung verifizieren, welche Eingabe das auslöst — `req.md` 2.8 behandelt `Enter` in Listen gesondert), Cursor hinein, `selectOption({ label: 'Überschrift 1' })` | Funktioniert ebenfalls; **konsistent** mit H6 (keine Positions-Asymmetrie mehr). **Status heute: GRÜN** — H6 und H7 liefern für ähnliche Ausgangslagen **dasselbe** Ergebnis (Befund 5 korrigiert). | §5.6, Grenzfall 5 |
| H8 | Reale Fremddatei `ListHeading.odt` | Echter Upload (3.4), auf sichtbaren Import warten, an beiden Positionen (Absatz/Überschrift im Listenpunkt) Konvertierbarkeit prüfen | Konsistent mit H6/H7 an realer Datei | E2, Grenzfall 4/5 |
| H9 | **Regressions-Sperre (behobener Absturz)** — `listStyleId.odt`, Enter am Ende der eingebetteten Überschrift | Echter Upload; Cursor exakt ans Ende der Überschrift im Listenpunkt (Textsuche + `End`); `waitForTimeout(50)` (Sync, 1.2 Regel 1); `press('Enter')`; weiter tippen | Editor bleibt bedienbar, **kein** `pageerror`/keine Konsolen-`error`, aller vorherige **und** neuer Text vorhanden. **Status heute: GRÜN** (der frühere `RangeError` ist mit `'block+'` behoben); dauerhaft in der Suite als Sperre. | `code.md` §2.4, Grenzfall 4/5 |

#### 3.1.3 Tabellenzellen (Anforderung 2.7, Testfälle 5.7/5.8)

| # | Test | Schritte | Assertion | Bezug |
|---|---|---|---|---|
| H10 | Einzelne Zelle | Tabelle einfügen, in eine Zelle klicken, `selectOption({ label: 'Überschrift 2' })` | Zelle zeigt `<h2>`, restliche Zellen unverändert `<p>` | §5.7 |
| H11 | `CellSelection` über mehrere Zellen | Tabelle einfügen, per Maus-Drag über ≥ 4 Zellen selektieren (vor Implementierung am UI verifizieren, dass ein Drag über Zellgrenzen tatsächlich eine `CellSelection`, keine Text-Selektion erzeugt); `selectOption({ label: 'Überschrift 1' })` | **Vor Fix:** No-Op, keine Zelle wird `<h1>` (Ursache: `alignableTypes`, nicht `sameParent` — siehe C9). **Nach Fix (§3.1 Finding A):** **alle** selektierten Zellen werden `<h1>` — ersetzt das in `req.md` 5.8 formulierte „No-Op nachweisen". Ergebnis konkret eintragen. | §5.8, 2.7, Grenzfall 7 |
| H12 | Rest der Tabelle bei H11 unverändert | im Anschluss an H11 | Nicht-selektierte Zellen bleiben `<p>` (auch nach Fix) | 2.7 |

#### 3.1.4 Ausrichtung (Anforderung 2.5, Grenzfälle 8/9, Testfall 5.9)

| # | Test | Schritte | Assertion | Bezug |
|---|---|---|---|---|
| H13 | Zentrierter Absatz → Formatwechsel | Absatz zentrieren (Ausrichtungs-Button, Titel vorab an `Toolbar.tsx` verifizieren), `selectOption({ label: 'Überschrift 1' })` | **Vor Fix:** Ausrichtung springt sichtbar auf links (`text-align: left`). **Nach Fix (§3.2):** bleibt `center`. Prüfung über `getComputedStyle(...).textAlign` bzw. das `style`-Attribut des `<h1>`. Pflicht-Testfall unabhängig vom Ausgang. | §5.9, Grenzfall 8 |
| H14 | Kumulativer Verlust über zwei Wechsel | Zentrieren → „Überschrift 1" → „Standard" | **Vor Fix:** links (zweifacher Verlust). **Nach Fix:** `center` bleibt über beide Wechsel erhalten. | Grenzfall 9 |
| H15 | Rundreise: zentrierte Überschrift exportieren/reimportieren | Wie H13, dann exportieren (je ein Lauf DOCX **und** ODT), Download mit JSZip+DOMParser prüfen (`<w:jc w:val="center"/>` bzw. `fo:text-align="center"` in der Stildefinition), erneut hochladen | Ergebnis (erhalten/verloren) durch **echten** Datei-Export/-Reimport belegt, nicht nur DOM-Zustand — erfüllt 4.1.5/4.2.5 wörtlich | 4.1.5, 4.2.5 |

#### 3.1.5 Enter-/Fett-Verhalten (Anforderung 2.8/2.9, Grenzfälle 12/13/14, Testfälle 5.10/5.11)

| # | Test | Schritte | Assertion | Bezug |
|---|---|---|---|---|
| H16 | Enter am **Ende** einer Überschrift | „Überschrift 1" setzen, Cursor ans Ende (`End`), `waitForTimeout(50)`, `Enter`, weiter tippen — **bewusst ohne** manuelles `selectOption('normal')`, um das Auto-Verhalten zu prüfen | Neuer Block ist `<p>`, **keine** weitere `<h1>` | §5.10, Grenzfall 12 |
| H17 | Enter **mitten** in einer Überschrift | „Überschrift 2" mit Text, Cursor in die Mitte, `waitForTimeout(50)`, `Enter` | Beide Hälften bleiben `<h2>` (gleiche Ebene) | §5.11, Grenzfall 13 |
| H18 | Sichtprüfung: Überschrift im Editor optisch fett? (Cross-Ref `fett-qa.md`) | `page.evaluate(() => getComputedStyle(document.querySelector('.ProseMirror h1')).fontWeight)` | Ergebnis protokollieren (erwartungsgemäß **kein** `700`, Finding C) — reine Dokumentation, kein eigenes Kriterium | 2.9, Finding C |
| H19 | Fett-Mark auf Überschriftentext, dann Rückwechsel zu Standard | Überschrift setzen, Text markieren, `getByTitle('Fett').click()`, dann `selectOption('normal')` | Text danach **echt** fett (Mark bleibt), unabhängig vom optischen Zustand aus H18 — genau der in Grenzfall 14/2.9 beschriebene Übergang | Grenzfall 14, 2.9 |

#### 3.1.6 Undo/Redo (Anforderung 2.10, Testfall 5.12)

| # | Test | Schritte | Assertion | Bezug |
|---|---|---|---|---|
| H20 | Undo direkt nach Formatwechsel | „Überschrift 1" setzen, `ControlOrMeta+z` | Vorheriger Node-Typ wieder da (`<p>` falls vorher Standard); **nach §3.2** zusätzlich: vorherige Ausrichtung wiederhergestellt | §5.12, 2.10 |
| H21 | Redo | nach H20: `ControlOrMeta+y` bzw. `ControlOrMeta+Shift+z` | Formatwechsel erneut hergestellt | 2.10 |
| H22 | Mehrere Wechsel einzeln rückgängig | Standard → Ü1 → Ü3 → Standard, dann dreimal Undo | Jeder Schritt einzeln, in umgekehrter Reihenfolge; ein Formatwechsel = **ein** Undo-Schritt | 2.10 |

#### 3.1.7 Selection-Sync-Regression (Anforderung Grenzfall 15, Testfall 5.14) — Pflicht

Direkte Adaption von `selection-regression.spec.ts`, aber mit dem
**Absatzformat-Dropdown** statt „Fett" als auslösendem Schritt. Determinismus
zwingend nach 1.2 (der `waitForTimeout(50)` zwischen Caret-Move und `Enter` ist
hier der eigentliche Testgegenstand).

| # | Test | Schritte | Assertion | Bezug |
|---|---|---|---|---|
| H23 | Formatwechsel als Auslöser statt Fett | Text tippen → `ControlOrMeta+a` → `selectOption({ label: 'Überschrift 1' })` → in den Text klicken (Neupositionierung) → `End` → `waitForTimeout(50)` → `Enter` → weiter tippen | Beide Textteile bleiben erhalten; korrekte Blockanzahl (`.ProseMirror h1, .ProseMirror p` gezählt); kein JS-Fehler | Grenzfall 15, §5.14, §7 Punkt 8 |
| H24 | Analoge Variante in einer Tabellenzelle | Wie `selection-regression.spec.ts` Test 2, aber Formatwechsel statt Fett zwischen zwei Zellen | Beide Zellinhalte bleiben erhalten | Grenzfall 15 |
| H25 | Stresstest, mehrere Zyklen | Wie `selection-regression.spec.ts` Test 3, Formatwechsel statt Fett, 4 Zyklen, je `waitForTimeout(50)` vor `Enter` | Alle Absätze erhalten, korrekte Blockanzahl | Grenzfall 15, Grenzfall 18 |

#### 3.1.8 Vollständige Rundreise über echten Upload/Download (Anforderung Abschnitt 4)

| # | Test | Schritte | Assertion | Bezug |
|---|---|---|---|---|
| H26 | DOCX-Rundreise, **echter** Upload-Button + `filechooser` | Hand-gebaute DOCX (Muster `docx.spec.ts` `buildSampleDocx()`, um „Heading1"/„Heading2" erweitert) über den echten Klickpfad (3.4) hochladen, unverändert exportieren, Download mit JSZip+DOMParser prüfen | Level/Text identisch zum Original | §5.15, 4.1.1 |
| H27 | ODT-Rundreise, analog | Analog, `content.xml` prüfen | Analog | §5.15, 4.2.1 |
| H28 | DOCX: im Editor erzeugte „Überschrift 3", exportiert, unabhängig geparst | Neues Dokument, Text tippen, „Überschrift 3", exportieren | `document.xml` enthält exakt `<w:pStyle w:val="Heading3"/>` im `w:pPr` (DOMParser, keine reine String-Suche) | 4.1.2 |
| H29 | Rückwechsel zu Standard, exportiert | Wie H28, dann „Standard", exportieren | Export enthält **kein** `<w:pStyle>` mehr für diesen Absatz | 4.1.3 |
| H30 | Ebenenwechsel „Ü2" → „Ü5", exportiert | Wie H28 mit direktem Ebenenwechsel | Export referenziert ausschließlich `Heading5` | 4.1.4 |
| H31 | ODT: im Editor erzeugte „Überschrift 4", exportiert | Neues Dokument, „Überschrift 4", exportieren | `content.xml` enthält `<text:h … text:outline-level="4">` | 4.2.2 |
| H32 | ODT Rückwechsel/Ebenenwechsel, exportiert | Analog H29/H30 für ODT | `<text:p>` ohne `outline-level` bzw. nur neue Ebene | 4.2.3/4.2.4 |
| H33 | Cross-Format einfach: ODT → DOCX | ODT mit Überschriften hochladen, als DOCX exportieren (bzw. Reimport-Umweg, falls kein direkter Formatwechsel beim Export — vorab am UI verifizieren) | Level/Text bleiben erhalten | 4.1.6 |
| H34 | Cross-Format einfach: DOCX → ODT | Spiegelbildlich | analog | 4.2.6 |
| H35 | Reale Fremddatei DOCX (`heading123.docx`) | Echter Upload | Level/Text korrekt, sichtbar im Editor | 4.1.7 |
| H36 | Reale Fremddatei ODT (`MyHeading1.odt`) | Echter Upload | Text/Ebene erhalten; `align` protokollieren (vor Fix vermutlich `left`) und mit E1 abgleichen | 4.2.7, Befund 7, Grenzfall 16 |
| H37 | Reale Fremddatei ODT (`ListHeading.odt`/`ListHeading2.odt`) | Echter Upload | `list_item` mit Absatz+Überschrift korrekt dargestellt; Konvertierbarkeit an beiden Positionen im Browser (ergänzt H6–H8) | Grenzfall 4/5 |
| H38 | **Befund 6** — DOCX „Heading 7" hochladen, Rundreise | Hand-gebaute/reale DOCX mit `w:outlineLvl` 6 (Stil „Heading7") über echten Upload; DOM prüfen; unverändert exportieren; Download parsen; reimportieren | **Vor Clamp (§4.4):** nach Reimport wird der Absatz **Standard** (Ebene verloren) — dieser Datenverlust ist der **höchstpriore** nachzuweisende Befund. **Nach Clamp:** DOM zeigt `h6`, Dropdown „Überschrift 6", Rundreise verlustfrei auf Level 6. Ergebnis konkret eintragen. | Befund 6, Grenzfall 11, §4.4 |
| H39 | **Befund 6, Kontrast** — ODT `text:outline-level="7"` hochladen, Rundreise | Analog H38 für ODT | **Vor Clamp:** Ebene bleibt 7 (kein Abfall auf Standard) — Kontrast zur DOCX-Asymmetrie. **Nach Clamp:** `h6`, verlustfrei auf 6. | Befund 6, 4.2.6 |

#### 3.1.9 Cross-Format-Rundreise hin und zurück (Anforderung 4.3, Testfall 5.16)

| # | Test | Schritte | Assertion | Bezug |
|---|---|---|---|---|
| H40 | DOCX → ODT → DOCX | DOCX mit Überschriften verschiedener Ebenen → als ODT exportieren (Download) → diese Datei über die ODT-Karte erneut hochladen → als DOCX zurück → letzten Download per DOMParser prüfen | Level/Text nach zwei Konvertierungen identisch | 4.3.1 |
| H41 | ODT → DOCX → ODT | Spiegelbildlich | analog | 4.3.2 |
| H42 | Formatwechsel + Cross-Format kombiniert | Standard → Überschrift → Standard (per Dropdown) → Export ins jeweils andere Format → Reimport | Ergebnis = exakter Nach-Wechsel-Zustand (inkl. ggf. verlorener Ausrichtung, falls §3.2 noch nicht umgesetzt) — **kein** überraschendes Wiederauftauchen der alten Ausrichtung | 4.3.3 |

#### 3.1.10 Mobile/Tablet (Anforderung §1 Zeile 6, Testfall 5.18)

| # | Test | Projekte | Assertion | Bezug |
|---|---|---|---|---|
| H43 | Kernfunktion H1–H3 auf allen drei Projekten | Desktop Chrome, Mobile (Pixel 7), Tablet (iPad Mini) | Dropdown erreichbar (nicht verdeckt/abgeschnitten), `selectOption` projektunabhängig identisch zu H1–H3 | §1 Zeile 6, §5.18 |
| H44 | Toolbar-Layout nicht abgeschnitten | `boundingBox()` des `<select>` auf Mobile/Tablet | `select` vollständig im sichtbaren Viewport | §1 Zeile 6 |

### 3.2 Ergänzende Grenzfall-Tests (Anforderung Abschnitt 3, vollständige Abdeckung)

H1–H44 decken die Grenzfälle 1, 2, 4–15, 16 (teilw.), 17 bereits ab. Zusätzlich:

| # | Test | Schritte/Assertion | Bezug |
|---|---|---|---|
| H45 | Grenzfall 3 — Selektion über Absatz **und** Überschrift, Dropdown-Anzeige | Absatz + Überschrift per Maus-Drag gemeinsam markieren, `waitForTimeout(50)`, `select`-Wert **vor** einer Aktion prüfen (`toHaveValue(...)`) — nach §4.2 die Tie-Break-Regel „erster erfasster Block", heute die alte Tiefensuche; **definiertes, nicht-widersprüchliches** Verhalten nachweisen | Grenzfall 3, Abnahme 2 |
| H46 | Grenzfall 18 — viele Wechsel in kurzer Folge (deterministisch) | 20× `selectOption` mit wechselnden Werten, **nach jedem** Schritt `await expect(select).toHaveValue(v)` (kein Rasen über die Tastatur, 1.2 Regel 2) | Kein doppeltes/verzögertes Dispatch; `select`-Wert am Ende = letzter gewählter Wert; kein veralteter Zwischenzustand | Grenzfall 18 |
| H47 | **Disabled-Zustand** (Abnahme 9, `code.md` §4.2) — **erst nach §4.2** | Nicht-anwendbare Selektion herstellen (z. B. `CellSelection` über eine reine Bildzelle), `select` prüfen | `await expect(select).toBeDisabled()` **und** `title`-Attribut vorhanden. **Status heute: n/a** (`disabled` existiert noch nicht) — nach §4.2 Pflicht. | Abnahme 9, §4.2 |
| H48 | Grenzfall 19 — Track-Changes | Kein Testfall möglich/nötig (Änderungsverfolgung existiert laut Backlog nicht) — als „nicht anwendbar, vermerkt" geführt | Grenzfall 19, explizit **nicht im Scope** |

### 3.3 Tastenkombination (Anforderung §1 Zeile 3, optional laut `code.md` §4.8)

| # | Test | Schritte | Assertion | Bezug |
|---|---|---|---|---|
| H49 | `Strg+Alt+1`…`6`/`Strg+Alt+0`, **nur falls** §4.8 umgesetzt | Cursor in Absatz, `page.keyboard.press('ControlOrMeta+Alt+1')` | Wechselt zu „Überschrift 1", analog 2–6 und `0` (Standard) | §1 Zeile 3 |
| H50 | Falls **nicht** umgesetzt | Kein Testfall — im Testreport vermerken: „bewusst fehlende Komfortfunktion, dokumentiert, kein Blocker" (wörtliche `req.md`-Vorgabe) | §1 Zeile 3 |

### 3.4 Datei-Upload: echter `filechooser`, nicht nur `setInputFiles` auf versteckten Input

Die bestehenden Upload-Tests rufen `input.setInputFiles(...)` **direkt** auf dem
versteckten `<input type="file" class="hidden">` und umgehen den sichtbaren
„Datei hochladen"-Button. Für „echte Bedienung" im Sinne des Auftrags nutzt
mindestens **ein** Testfall pro Format (H26/H27, H40/H41, H38/H39) den echten
Klickpfad:

```ts
const [fileChooser] = await Promise.all([
  page.waitForEvent('filechooser'),
  docxCard(page).getByRole('button', { name: 'Datei hochladen' }).click(),
])
await fileChooser.setFiles({ name: 'beispiel.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer })
await expect(page.locator('.ProseMirror h1')).toBeVisible() // deterministisch auf Importergebnis warten
```

Die übrigen Fälle (H8, H9, H35–H37) dürfen `input.setInputFiles(...)` nutzen,
solange **mindestens** die Kern-Rundreise-Tests den echten Klickpfad abdecken.

### 3.5 Unabhängige Prüfung der heruntergeladenen Datei

Anforderung 4.1.2/4.2.2 verlangt einen **unabhängigen** Parser statt reiner
String-Suche. Für alle strukturellen Prüfungen (H15, H28–H32, H38–H42):

```ts
const zip = await JSZip.loadAsync(await fs.readFile(downloadPath))
const documentXml = await zip.file('word/document.xml')!.async('string')
const xmlDoc = new DOMParser().parseFromString(documentXml, 'application/xml')
const headingP = [...xmlDoc.getElementsByTagNameNS(W_NS, 'p')]
  .find((p) => p.textContent?.includes('Erwarteter Text'))
const pStyle = headingP?.getElementsByTagNameNS(W_NS, 'pPr')[0]
  ?.getElementsByTagNameNS(W_NS, 'pStyle')[0]
expect(pStyle?.getAttributeNS(W_NS, 'val')).toBe('Heading3')
```

Analog ODT: `content.xml` per DOMParser auf `<text:h text:outline-level="…">`
bzw. **Abwesenheit** von `text:outline-level` bei `<text:p>` prüfen.

### 3.6 Bestehende Tests, die unverändert weiterlaufen müssen

- `tests/e2e/selection-regression.spec.ts` (alle Tests) — Pflichtbestandteil,
  bleibt zusätzlich zu H23–H25 bestehen.
- `tests/e2e/clipboard.spec.ts` (Dropdown-Nutzung Z. 174/179),
  `tests/e2e/clipboard-roundtrip.spec.ts` (Z. 38/43/90/95) — Grundpfad Ebene 1/2,
  bleiben bestehen; neue Tests bauen darauf auf, ersetzen sie nicht.
- `tests/e2e/docx.spec.ts`/`odt.spec.ts` (Überschriften-Rundreise vorgefertigter
  Dateien) — bleiben bestehen.

### 3.7 Cross-Browser-Matrix

| Testgruppe | Desktop Chrome | Mobile (Pixel 7) | Tablet (iPad Mini) | Anmerkung |
|---|---|---|---|---|
| `selectOption`-basiert (H1–H3, H6–H19, H26–H42, H45) | Pflicht | Pflicht | Pflicht | `selectOption` löst natives `change` aus, projektunabhängig |
| Maus-Drag-Selektion (H4, H11, H12, H45) | Pflicht | Best-effort/dokumentieren | Best-effort/dokumentieren | Touch ohne Maus — Playwright simuliert `page.mouse` geräteunabhängig; reales Touch-Drag ist ein zu dokumentierender Sonderfall, kein Ausschluss |
| Tastatur-only (H16, H17, H20–H22, H49) | Pflicht | Best-effort/dokumentieren | Best-effort/dokumentieren | Analog `fett-qa.md` 3.7 |
| Layout/Erreichbarkeit (H44) | n/a | Pflicht | Pflicht | Kernzweck sind die kleineren Viewports |

---

## 4. Traceability-Matrix

### 4.1 Anforderung §5 (Testfälle) → QA-Testfall

| `req.md` §5 Punkt | QA-Testfall(e) |
|---|---|
| 1 | H1 / C1 |
| 2 | H2 / C2 |
| 3 | H3 / C3 |
| 4 | H4 / C4, C12 |
| 5 | H6, H8 / C7 |
| 6 | H7, H8 / C7, C15 |
| 7 | H10 / C8 |
| 8 | H11, H12 / C9, C13 |
| 9 | H13, H14, H15 / C5, C6 |
| 10 | H16 |
| 11 | H17 |
| 12 | H20, H21, H22 |
| 13 | H23, H24, H25 |
| 14 (Ebene > 6) | H38, H39 / D7, O7, T3, S5 |
| 15 (Rundreise je Format, Ebene 3–6) | H26–H32 / D1, D2, O1, O2 |
| 16 (Cross-Format) | H40, H41 / X1, X2 |
| 17 (reale Fremddateien) | H36, H37 / E1, E2, E3, T1 |
| 18 (Mobile/Tablet) | H43, H44 |

### 4.2 Anforderung Abschnitt 3 (Grenzfälle) → QA-Testfall

| Grenzfall | QA-Testfall(e) |
|---|---|
| 1 | C11 |
| 2 | H4, C4 |
| 3 | H45, C10 |
| 4 | H6, C7 |
| 5 | H7, H37, C7, C15 |
| 6 | H10, C8 |
| 7 | H11, H12, C9, C13 |
| 8 | H13, C5 |
| 9 | H14, C6 |
| 10 | H2, C2 |
| 11 (Ebene > 6) | H38, H39, D7, O7, T3, S5 |
| 12 | H16 |
| 13 | H17 |
| 14 | H19 |
| 15 (Selection-Sync × Absatzformat) | H23, H24, H25 |
| 16 (ODT `office:styles`) | H36, E1, S1, S2 |
| 17 (DOCX `w:basedOn`) | H35, T1, T2 |
| 18 (viele Wechsel schnell) | H46 |
| 19 (Track-Changes) | H48 (nicht anwendbar, vermerkt) |

---

## 5. Erwarteter Ist-Status je Testfall (vor Umsetzung von `absatzformat-dropdown-code.md`)

| Status | Testfälle | Grund |
|---|---|---|
| **Erwartet ROT** (Ziel-Verhalten noch nicht implementiert / bestätigter Datenverlust) | C12–C16 (Funktionen existieren nicht), D6 (Finding F), D7 (DOCX-Verlust Ebene>6), O7 (Clamp), T1 (basedOn), T3 (Clamp), S1, S2 (office:styles), S5 (Clamp), H38 (DOCX-Verlust Ebene>6), H39 (Clamp), sowie die „nach Fix"-Erwartung von H4, H11, H13, H14 (Mehrblock/CellSelection/Ausrichtungserhalt) | Befunde 3/4/6/7/8, Finding F; `code.md` §4 noch nicht umgesetzt |
| **Erwartet GRÜN** (dokumentiert den Ist-Zustand — teils Feature, teils Bug-als-Ist) | C1–C3, C4 (No-Op als Ist), C5 (Verlust als Ist), C6, C7, C8, C9 (No-Op-Ursache), C10, C11; H1–H3, H5, H6, H7, H8, H9 (behobener Absturz), H10, H12, H16–H18, H20–H25, H26–H37, H40–H46; D1–D5, D8, O1–O6, E1–E6, T2, T4, S3, S4, SC1–SC5, X1–X3 | Bereits funktionierendes Reader/Writer/Command-/Schema-Grundverhalten (inkl. bereits behobenem `'block+'`-Schema) |
| **n/a bis Fix existiert** | H47 (`disabled`), H49 (Tastenkürzel), C12–C16 (Import scheitert vor Umsetzung) | Abhängige Funktionen existieren im Code noch nicht |

Nach Umsetzung von `code.md` Abschnitt 4 müssen wechseln: **C4/C5/C6/C7/C9**
(Assertions auf das neue Verhalten umgeschrieben), **D6, D7, O7, T1, T3, S1, S2,
S5, H38, H39** von ROT auf GRÜN, und **H4/H11/H13/H14/H45** auf ihr „nach
Fix"-Ergebnis. Das ist der konkrete, maschinell prüfbare Nachweis, dass die
Fixes wirken — nicht nur Code-Review.

---

## 6. Abgleich mit Abnahmekriterien (`absatzformat-dropdown-req.md` Abschnitt 7)

| DoD-Punkt | Abdeckung |
|---|---|
| 1. Alle §5-Testfälle real im Browser, inkl. Ebene 3–6 | 3.1 (H1–H44) + Traceability 4.1 |
| 2. Rundreise §4 durch unabhängigen Parser/Reimport | H15, H26–H42, 3.5; D1–D8, O1–O7, X1–X3 |
| 3. Mehrblock-Selektion entschieden (§2.3) | Entscheidung `code.md` §3.1 (**erweitern**); belegt durch H4, C4/C12, H11, C9/C13 |
| 4. Ausrichtungserhalt entschieden (§2.5) | Entscheidung §3.2 (**erhalten**); belegt durch H13–H15, C5/C6 |
| 5. Überschrift in Liste/Zelle entschieden + getestet (§2.6/2.7) | Entscheidung §3.3 (**erlauben**, Schema bereits `'block+'`) + Finding-F-Fix §4.6; belegt durch H6–H12, C7/C8, D6, SC1–SC4, E2–E4 |
| 6. Ebenen > 6 entschieden, DOCX-Verlust beseitigt (§3.4) | Entscheidung **Clamp 1–6** an beiden Readern (§4.4/§4.5); belegt durch H38/H39, D7, O7, T3, S5, SC5 |
| 7. ODT-`office:styles` (Befund 7) + DOCX-`w:basedOn` (Befund 8) an realer Datei | H36, E1, S1, S2 (Befund 7); T1, T2, H35 (Befund 8) |
| 8. Selection-Sync-Regression × Absatzformat, dauerhaft grün | H23–H25 (+ `selection-regression.spec.ts` bleibt) |
| 9. Kein stiller Datenverlust/keine JS-Exception | H5 (Konsole scharf), H9 (kein Absturz), H47 (`disabled` nach §4.2), globale `pageerror`-Sammlung (1.2 Regel 6); Clamp statt Verlust (D7/H38) |
| 10. Backlog-Status | Nicht Gegenstand dieses Plans; nach grünem Abschnitt 5 kann `absatzformat-dropdown` bestätigt bzw. auf „teilweise" korrigiert werden |

---

## 7. Ausführungsreihenfolge (Vorschlag)

1. **Abschnitt 0 dieser Datei** (Stichprobenprüfung) — bereits geschehen,
   Ergebnis oben.
2. **Unit-Tests, die den Ist-Zustand/die Bugs festschreiben** (bewusst
   dokumentierend, kein Fix vorausgesetzt): C4, C5, C6, C7, C9, D7, O7, T1, T3,
   S1, S2, S5, SC1–SC5 — als Ausgangsnachweis, dass Befunde 3/4/6/7/8 real und
   reproduzierbar sind, **bevor** irgendetwas gefixt wird. Insbesondere D7/H38
   (DOCX-Datenverlust Ebene > 6) zuerst rot/nachweisend belegen — höchste
   Severity.
3. `absatzformat.spec.ts` H1–H25 (Bedienung/Zustand/Grenzfälle/Regression),
   Determinismus-Regeln (1.2) strikt.
4. `absatzformat.spec.ts` H26–H42 (Rundreise einfach + Ebene > 6 + Cross-Format).
5. `absatzformat.spec.ts` H43–H50 (Mobile/Tablet, Grenzfälle, Tastenkürzel) +
   verbleibende Unit-Tests (2.3–2.9).
6. **Nach Umsetzung von `code.md` Abschnitt 4:** alle „ROT erwartet"-Fälle
   erneut ausführen und Statuswechsel auf GRÜN dokumentieren; C4/C5/C6/C7/C9 auf
   das neue Verhalten umschreiben; H47 (`disabled`) ergänzen;
   `selection-regression.spec.ts` **und** H23–H25 erneut laufen lassen.
7. Traceability (Abschnitt 4) und DoD (Abschnitt 6) final gegenprüfen, bevor der
   Backlog-Status geändert wird.

---

## 8. Offene Punkte für QA

- **Befund 6 / DOCX-Datenverlust (D7, H38)** ist der **schwerste** Punkt: eine
  aus einer Fremddatei importierte Ebene 7 geht bei der DOCX-Rundreise **still**
  verloren (Absatz wird Standard), während ODT sie behält. Dieser Test ist vor
  allen kosmetischen Fällen zu schreiben und muss den Verlust **vor** dem Clamp
  reproduzierbar zeigen.
- **C9 (Finding A):** von `code.md` nur einmalig unter Vitest nachgewiesen —
  Abschnitt 2.2 schreibt bewusst einen **dauerhaften** Test fest, statt die
  Behauptung unverifiziert zu übernehmen. Die Ursache ist `alignableTypes`
  (`commands.ts:47`), **nicht** `sameParent` — die Begründung in `req.md` 2.7 ist
  entsprechend zu korrigieren.
- **H4/H11/H13/H14/H45** hängen vollständig von den Design-Entscheidungen
  `code.md` §3.1/§3.2 ab. Fällt eine Entscheidung anders aus (z. B.
  Mehrfachselektion doch nicht erweitern), sind diese Fälle vor Ausführung
  umzuschreiben — die Tabellen nennen für jeden Fall explizit „vor Fix"/„nach
  Fix", damit ein Entscheidungswechsel keine still falschen Erwartungen
  hinterlässt.
- **H7** (zweiter Block im **selben** `<li>` per UI) setzt voraus, dass sich ein
  zweiter Block im selben Listenpunkt über die bestehende UI überhaupt erzeugen
  lässt — vor Testimplementierung am echten Editor verifizieren, welche Eingabe
  das auslöst (`WordEditor.tsx`s `Enter`-Bindung behandelt Listenpunkte laut
  `req.md` 2.8 gesondert).
- **DOCX `w:basedOn`-Fixture (Grenzfall 17):** keine bestätigte reale Fixture
  vorhanden → synthetische Fixture (T1) verwenden; etwaige Kandidaten vor
  Verwendung am tatsächlichen `styles.xml`-Inhalt prüfen, nicht am Dateinamen.
- **H13/H15** benötigen vorab die genauen `Toolbar.tsx`-Locators der
  Ausrichtungs-Buttons (nicht Gegenstand dieser Anforderung, aber
  Testvoraussetzung) — kurz gegen den aktuellen Code verifizieren.
- **H47 (`disabled`-Zustand):** erst schreibbar, sobald `code.md` §4.2 real
  existiert (`disabled`/`title` am `<select>`); bis dahin als „n/a bis Fix"
  geführt (Abschnitt 5), aber vor Abnahme (DoD 9) zwingend nachzutragen.
- **Koordination `commands.test.ts` und `odt/reader.ts`:** Die heading-Unit-Tests
  (2.2) und der `fett`-`isMarkActive`-Block müssen dieselbe Datei teilen; die
  `office:styles`-Kaskade (§4.5) muss **gemeinsam** mit `fett-code.md` §4.8
  umgesetzt werden (dieselbe Funktion `parseAutomaticStyles`), sonst überschreibt
  eine Änderung die andere — QA prüft beide Erweiterungen in einem Lauf.
