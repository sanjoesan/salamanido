# Testplan „Suchen" — QA-Verifikation (`suchen-qa.md`)

Rolle: QA-Antwort auf `specs/suchen-req.md` (Anforderung) und `specs/suchen-code.md`
(Umsetzungsplan). Dieses Dokument legt **verbindlich** fest, mit welchen konkreten
Tests — auf welcher Ebene, in welcher Datei, mit welchem genauen Ablauf — jeder
Testfall aus der Anforderung nachgewiesen wird, bevor der Backlog-Status von
`suchen`/`suchen-ersetzen` von „fehlt" auf „vorhanden" wechseln darf.

**Grundregel (Anforderung Abschnitt 13, bindend für diesen Plan):** Ein Unit-Test,
der `findMatches`/`replaceAllMatches` direkt gegen ein von Hand gebautes
ProseMirror-Dokument aufruft, beweist **nur** die Logik. Er beweist **nicht**, dass
Strg+F im Browser funktioniert, dass der Toolbar-Button existiert und klickbar ist,
dass beim Tippen im echten Sucheingabefeld etwas sichtbar aufleuchtet, oder dass
eine über die UI hochgeladene Datei nach echtem Exportieren-Klick eine korrekte
Datei auf die Festplatte liefert. Deshalb enthält dieser Plan zwei getrennte,
gleichrangig verbindliche Ebenen:

- **Ebene A — Unit-Tests (Vitest):** Reader/Writer-Rundreise (DOCX **und** ODT) auf
  Objektebene, plus reine Matching-Logik. Schnell, deterministisch, aber **kein**
  Ersatz für Ebene B.
- **Ebene B — echte Playwright-Browser-Tests:** tatsächliche Klicks, tatsächliches
  Tippen über `page.keyboard`, tatsächlicher Datei-Upload über
  `input[type="file"]`, tatsächlicher Export-Klick mit `page.waitForEvent('download')`
  und Prüfung des **heruntergeladenen** Datei-Inhalts (nicht nur eines
  In-Memory-Objekts). Keine Ebene-B-Behauptung darf durch einen internen
  Funktionsaufruf ersetzt werden.

Beide Ebenen zusammen decken alle Testfälle aus `suchen-req.md` Abschnitt 3–12 ab
(Zuordnungstabellen: Abschnitt E/F dieses Dokuments). **Alle Grenzfall-Nummern in
diesem Dokument beziehen sich auf die kanonische Liste `suchen-req.md` Abschnitt 11,
Punkte 1–21** (Abschnitt E bildet sie vollständig ab).

**QA-Review-Vermerk (Selektoren/Konventionen frisch gegen den Arbeitsbaum verifiziert).**
Damit dieser Plan nicht auf erfundenen Selektoren steht, wurden alle unten benutzten
Test-Anker am realen Code geprüft — **bestätigt**:
`tests/e2e/fixtures.ts` exportiert `test`, `expect`, `docxCard`, `odtCard` und die
`errors`-Fixture (sammelt `pageerror` **und** `console`-`error`); `docxCard`/`odtCard`
selektieren über die Überschriften „Word-Dokument (.docx)" / „OpenDocument Text (.odt)".
Externe Fixtures liegen unter `tests/fixtures/external/{docx,odt}` und werden im Bestand
über `join(__dirname, '../fixtures/external/<fmt>/<datei>')` geladen (aus `tests/e2e/`
heraus korrekt aufgelöst); `bible_short.odt` ist vorhanden
(`tests/fixtures/external/odt/bible_short.odt`). Der Dirty-Indikator ist wörtlich
`● ungespeichert` (`DocumentWorkspace.tsx:119`); die Schließen-Rückfrage lautet
`window.confirm('Nicht exportierte Änderungen gehen verloren. Trotzdem schließen?')`
(`DocumentWorkspace.tsx:98`). Buttons: „← Formate" (`DocumentWorkspace.tsx:113`),
„Exportieren" (`:141`, wechselt **während** des Exports zu „Exportiere…" — Tests klicken
den Vor-Klick-Text „Exportieren", `download`-Promise davor, wie im Bestand
`docx.spec.ts:79–80`), „Neu erstellen" (`FormatPicker.tsx:89`). Re-Import läuft über
`docxCard(page).locator('input[type="file"]')` (`docx.spec.ts:242`). **Neu gegenüber der
Vorfassung:** vier konkrete Korrekturen (Abschnitt D-Querverweis bei PW-RT-5/6; erweiterte
Selection-Sync-Regel D0.3 für die Vorbelegungs-Selektion + PW-4; React-Controlled-Input-
Hinweis für die IME-Simulation PW-32; Leerzustand-Zähler-Assertion PW-10) sind unten
eingearbeitet und jeweils kenntlich gemacht.

---

## 0. Determinismus-Regeln (verbindlich für ALLE Ebene-B-Tests)

Diese Regeln sind **kein** Stilhinweis, sondern Abnahmebedingung: Ein Test, der eine
dieser Regeln verletzt, gilt als **nicht** grün, auch wenn er zufällig „durchläuft".
Grund: `suchen` berührt zwei am Code belegte Race-Quellen (`suchen-req.md` Abschnitt 0
— `selectionchange`-Nachziehen; die Live-Debounce von 200 ms aus `suchen-code.md`
Abschnitt 3.3). Beide werden hier **konstruktiv** ausgeschlossen, nicht durch pauschale
`sleep`-Puffer „hingewartet".

### D0.1 Nie auf die Debounce warten — nur auf den Endzustand (Web-First-Assertions)
Die Live-Suche ist um 200 ms entprellt. Tests **dürfen nie** `page.waitForTimeout(200)`
o. Ä. verwenden, um „die Suche fertigwerden zu lassen". Stattdessen ausschließlich
**auto-retriende** Playwright-Assertions, die durch die Debounce hindurch pollen:
- `await expect(page.locator('.search-match')).toHaveCount(n)`
- `await expect(matchCounter).toHaveText('3 von 12')`
- `await expect(page.locator('.search-match-active')).toBeInViewport()`

Diese Assertions pollen bis zum konfigurierten Timeout und konvergieren deterministisch,
egal ob die Debounce 50 ms oder 200 ms braucht. **Verbot:** Feste `waitForTimeout` als
Ersatz für eine Zustandsassertion; Zählen von Treffern über eine Momentaufnahme direkt
nach `type()` ohne Retry.

### D0.2 Nach Upload immer auf das gemountete Editor-DOM warten, bevor Strg+F kommt
Der Dokument-Ebene-Keydown-Listener für Strg+F wird erst registriert, wenn `WordEditor`
gemountet ist (`suchen-code.md` Abschnitt 2.6/3.6). Wird `ControlOrMeta+f` **vor** dem
Mount gedrückt, öffnet die **native** Browser-Suche — der Test würde falsch grün/rot.
Deshalb gilt, auch für die „ohne vorherigen Editor-Klick"-Tests (Grenzfälle 17/18):
```ts
const editor = page.locator('.ProseMirror')
await expect(editor).toBeVisible()   // beweist: WordEditor gemountet, Listener aktiv
// KEIN editor.click() bei Grenzfall 17/18 — nur auf Sichtbarkeit warten
await page.keyboard.press('ControlOrMeta+f')
```

### D0.3 Selection-Sync abwarten, wenn ein NATIVER Caret-Move einer positionsabhängigen Taste vorausgeht
Wenn ein Test **in den Editor klickt** (oder eine native, tastaturgetriebene
Cursorbewegung wie `End`/`Home`/Pfeiltaste ausführt) und **unmittelbar danach** eine
Taste drückt, deren Wirkung von der Cursorposition abhängt (`Enter`, `Backspace`,
Zeichen tippen), muss zwischen beiden die bereits etablierte Wartehilfe aus
`tests/e2e/selection-regression.spec.ts` stehen:
```ts
await editor.click()          // oder page.keyboard.press('End') — NATIVE Caret-Bewegung
await page.waitForTimeout(50) // gibt dem asynchronen `selectionchange`-Nachziehen Zeit
await page.keyboard.press('Backspace')
```
Begründung wörtlich wie im Bestand: ProseMirror zieht eine native Caret-Bewegung nur
asynchron über das Browser-Event `selectionchange` nach; ein sofort folgender Tastendruck
kann diesem Nachziehen vorauslaufen. Betroffen sind v. a. PW-25 (aktiven Treffer im
Editor löschen) und jeder Test, der nach einem Editor-Klick tippt. **Nicht** betroffen:
Tippen im Suchfeld selbst (das ist ein gewöhnliches `<input>`, keine PM-Selektion).

**Erweiterung (verbindlich): auch das *Lesen* der Selektion ist betroffen.** `openSearch`
liest beim Öffnen `view.state.selection`, um das Suchfeld aus einer einzeiligen Selektion
vorzubelegen (`suchen-code.md` Abschnitt 3.6). Folgt Strg+F **unmittelbar** auf einen
nativen `click()`/`dblclick()` im Editor, kann ProseMirror die native Selektion noch nicht
nachgezogen haben → `openSearch` liest eine veraltete/leere Selektion → falsche/leere
Vorbelegung, **flaky**. Diese Regel gilt daher **nicht nur** für positionsabhängige
Tastendrücke, sondern auch für „nativer Editor-Klick/Doppelklick → sofort Strg+F, dessen
Wirkung von der Selektion abhängt" (betrifft PW-4). **Nicht** betroffen ist eine
Selektion, die über einen **PM-Befehl** entstand (z. B. `ControlOrMeta+a` =
`selectAll`-Command, synchron dispatcht) — deshalb braucht PW-4b (Selektion via Strg+A)
**keinen** Wait.

### D0.4 Schließen-dann-tippen braucht KEINEN Timing-Workaround — aber einen Detach-Guard
`closeSearch` setzt die Selektion **synchron** als PM-Transaktion (`tr.setSelection`,
`suchen-code.md` Abschnitt 2.5/3.2) — das ist der bewusste Unterschied zur nativen
Caret-Bewegung aus D0.3 und der Grund, warum der Selection-Sync-Regressionstest **ohne**
künstliche Verzögerung grün sein MUSS. Damit „schließen → sofort tippen" trotzdem
deterministisch ist, wird vor dem Tippen auf das **beobachtbare Ergebnis** des Schließens
gewartet (nicht auf eine Zeit):
```ts
await page.keyboard.press('Escape')
await expect(page.locator('.search-match')).toHaveCount(0)      // Query geleert = Tr. verarbeitet
await expect(page.locator('[data-search-bar]')).toHaveCount(0)  // SearchBar unmountet, Fokus zurück im Editor
await page.keyboard.type('XYZ')                                 // landet an der Fundstelle
```
Weil die Selektion in **derselben** Transaktion gesetzt wird, die die Decorations leert,
garantiert `toHaveCount(0)`, dass die Selektion bereits platziert ist. Ein Test, der hier
ein `waitForTimeout` einbaut, gilt als **fehlerhaft** (er würde den eigentlichen Beweis —
„synchron, race-frei" — verwässern).

### D0.5 Download-Promise vor dem Klick, heruntergeladene Bytes prüfen
Reihenfolge exakt wie im Bestand (`tests/e2e/docx.spec.ts`): erst
`const downloadPromise = page.waitForEvent('download')`, **dann** Export-Klick, dann
`await downloadPromise`. Geprüft werden ausschließlich die von `download.path()` +
`fs.readFile` gelesenen Bytes (per `JSZip`), **nie** ein In-Memory-`Blob`.

### D0.6 Re-Import läuft über die Picker-Ansicht, nicht über den offenen Editor
Der `input[type="file"]` existiert **nur** auf der Startansicht (`FormatPicker`), nicht im
offenen `DocumentWorkspace` (belegt in `tests/e2e/docx.spec.ts`, Kommentar bei der
Re-Upload-Sequenz). Ein Rundreise-Test muss deshalb vor dem zweiten Upload zurück zur
Picker-Ansicht:
```ts
await page.getByRole('button', { name: /formate/i }).click()  // „← Formate"
const reimportInput = docxCard(page).locator('input[type="file"]')
await reimportInput.setInputFiles({ name: '…', mimeType: '…', buffer: exportedBuffer })
```
Achtung Wechselwirkung mit `dirty`: nach reiner Suche ist `dirty === false`, daher darf
„← Formate" **keine** `window.confirm`-Rückfrage auslösen (siehe PW-DIRTY-1). Nach
„Ersetzen" ist `dirty === true`; dann fängt der Test den Dialog bewusst mit
`page.on('dialog', d => d.accept())` ab.

### D0.7 Fehler-/Konsolenüberwachung ab Testbeginn (gemeinsame Fixture nutzen)
Neue Ebene-B-Tests verwenden die vorhandene gemeinsame Fixture
`tests/e2e/fixtures.ts` (`export const test`) statt `@playwright/test` direkt: sie
räumt den Privacy-Banner weg, macht `page.goto('/')` und sammelt ab Testbeginn alle
`pageerror`- und `console.error`-Ereignisse in `errors`. Am Ende jedes neuen Tests:
`expect(errors, errors.join('\n')).toEqual([])` (Anforderung Abschnitt 3, Testfälle 5/6
„keine Konsolen-Exception"; Grenzfälle 13/17/18 „kein Crash"). `docxCard`/`odtCard` kommen
ebenfalls aus dieser Datei.

---

## A. Unit-Tests: Reader/Writer-Rundreise (DOCX + ODT)

### A.1 Voraussetzung: reine Matching-/Plugin-Logik — `src/formats/shared/editor/__tests__/search.test.ts` (neu)

Testet die reinen, `EditorView`-freien Funktionen aus `src/formats/shared/editor/search.ts`
(`findMatches`, `firstMatchAtOrAfter`, `reconcileActiveIndex`) gegen von Hand gebaute
`wordSchema`-Dokumente sowie das `apply`-Verhalten über
`EditorState.create({ schema: wordSchema, plugins: [createSearchPlugin()] })` + `setMeta`
(für die cursor-basierte Initial-Aktivierung und `reconcileActiveIndex` wird eine echte
`TextSelection` gesetzt). Diese Ebene ist **Vorbedingung** für A.2/A.3 (dort läuft die
echte Ersetzungs-Logik über den Produktionspfad), aber **kein** Ersatz für die
Rundreise-Tests. Deckt `suchen-code.md` Abschnitt 7.1, Punkte 1–14 ab.

| ID | Testfall | Zusicherung |
|---|---|---|
| UT-SEARCH-1 | Einfacher Treffer, case-insensitive (Default) | `findMatches(doc, {text:'Wort', caseSensitive:false, wholeWord:false})` findet „wort" **und** „WORT" (gleiche Trefferzahl unabhängig von Schreibung) |
| UT-SEARCH-2 | `caseSensitive:true` | reduziert die Treffer bei gemischter Schreibung korrekt; „Wort" trifft nicht „wort" |
| UT-SEARCH-3a | Diakritika werden exakt gefunden | „ß"/„ä"/„é" werden bei `caseSensitive:false` exakt gefunden; die zurückgegebenen Offsets bleiben 1:1 zur `textContent`-Länge (Beweis: **keine** `"ß".toUpperCase()==="SS"`-Expansion — es wird nur `.toLowerCase()` benutzt) |
| UT-SEARCH-3b | Diakritik-Gegenprobe (verbindlich, `req` TF3) | Suche „ss" findet **nicht** „ß"; Suche „u" findet **nicht** „ü"; Suche „a" findet **nicht** „á" (diakritik-sensitiv, `suchen-req.md` Abschnitt 3.1) |
| UT-SEARCH-4 | Literal-Matching (Regex-Metazeichen) | `a.b*c` findet die Literalfolge in `"a.b*c"`, findet **nicht** `"aXbYYYc"`; Gegenprobe mit `(`, `[`, `\`, `$` als Literal |
| UT-SEARCH-5 | **Nicht überlappende Treffer** (`req` TF5, Grenzfall 5) | „aa" in „aaaa" → **genau 2** (Positionen 0–2, 2–4), nicht 3; „ana" in „banana" → **1** |
| UT-SEARCH-6 | Leerer/Nur-Whitespace-Query | `findMatches(doc, {text:''})` und `{text:'   '}` → beide `[]`, kein Fehler (Grenzfälle 1/2/14; `trim()`-Kriterium) |
| UT-SEARCH-7 | Treffer über Formatierungsgrenze (fett/normal) im selben Absatz | genau **1** Eintrag in `matches[]` (arbeitet auf `node.textContent`) |
| UT-SEARCH-8 | Treffer würde zwei `paragraph`-Knoten überspannen | **0** Treffer (Absatzgrenze hart) |
| UT-SEARCH-9 | **`hard_break` = `\n`, kein Überspannen** (`req` TF10, korrigiert ggü. früherem Entwurf) | Struktur „a\nb" (Umschalt+Enter im selben Absatz): Suche „a" → 1 Treffer, Suche „b" → 1 Treffer; Suche **„a b"** (mit Leerzeichen) und Suche **„ab"** finden **NICHTS** — ein einzeiliger Suchbegriff kann den `\n` nie enthalten und endet spätestens am Umbruch (`suchen-code.md` Abschnitt 2.2); für Whole-Word zählt `\n` als Wortgrenze |
| UT-SEARCH-10 | `wholeWord:true`, Unicode-Wortgrenzen inkl. Umlaut-Falle | „Straße" findet freistehendes „Straße", **nicht** das in „Hauptstraße"; „über" findet „über", **nicht** „überall"; „Café" wird als ganzes Wort gefunden (beweist `/[\p{L}\p{N}_]/u` statt ASCII-`\b`) |
| UT-SEARCH-11 | **`wholeWord:true` + Regex-Metazeichen kombiniert** (`req` TF12) | Suchbegriff `c++` als ganzes Wort: findet freistehendes „c++", nicht „c+++"; literal **und** wortgrenzengenau zugleich (Escaping verfälscht die Wortgrenzen nicht) |
| UT-SEARCH-12 | Ziffern = Wortzeichen, Bindestrich = Grenze (dokumentierte Entscheidung) | `wholeWord` „12" findet freistehendes „12", nicht „123"; „ab" mit Bindestrich-Nachbar („ab-cd") wird als ganzes Wort gefunden |
| UT-SEARCH-13 | Tabellen-Dokument (`table_row`×`table_cell`), Treffer in nicht benachbarten Zellen | Reihenfolge in `matches[]` = zeilenweise links-nach-rechts (folgt `doc.descendants`, keine eigene Sortierung) |
| UT-SEARCH-14 | **Cursor-basierte Initial-Aktivierung** (`firstMatchAtOrAfter`, `req` Abschnitt 4) | 3 Treffer; Selektion **vor** dem 2. Treffer → `activeIndex === 1` (nicht 0); Selektion **hinter** dem letzten → Wrap auf `0`; keine Treffer → `-1` |
| UT-SEARCH-15 | `reconcileActiveIndex` nach Doc-Änderung | aktiven Treffer löschen → nächster verbleibender wird aktiv; alle löschen → `-1` (kein Absturz durch veraltete Position) |
| UT-SEARCH-16 | `apply` hält `docChanged` false bei reiner Suche | Nach `setSearchQuery`/`stepSearch`/`closeSearch`-Transaktionen ist jede erzeugte Transaktion `tr.docChanged === false` (verhindert `dirty`-Kopplung, `suchen-req.md` Abschnitt 6) |

### A.2 `src/formats/docx/__tests__/roundtrip.test.ts` — neuer Testblock „search & replace"

Folgt exakt dem bestehenden Datei-Muster (`doc()`/`paragraph()`-Helfer,
`roundTrip()` über `writeDocx`→`readDocx`). **Neu** ist, dass der Ersetzungs-Schritt nicht
als vorgefertigtes Ziel-JSON geschrieben, sondern über den **echten Produktionscode-Pfad**
erzeugt wird: ein `EditorState` wird mit `createSearchPlugin()` aufgebaut,
`findMatches`/`replaceAllMatches`/`replaceActiveMatch` (`search.ts`, `commands.ts`) werden
als Transaktion dispatcht, und **erst das resultierende `state.doc.toJSON()`** wird an
`writeDocx` übergeben. Das testet zusätzlich, dass der Ersetzungscode selbst
schema-konformen Output erzeugt — nicht nur, dass Reader/Writer mit von Hand geschriebenem
JSON klarkommen.

| ID | Testfall | Ablauf | Zusicherung |
|---|---|---|---|
| UT-DOCX-RT-1 | Reine Suche ohne Ersetzen verändert den Export nicht (`req` Abschnitt 12 TF1; Abschnitt 6 TF1/3) | Fixture mit Überschrift, fett/kursiv/farbigem Text, `bullet_list`, `table` (2×2, bestehende Helfer) → `writeDocx` einmal **direkt** (Kontrollexport), einmal **nachdem** eine komplette Such-Sitzung auf dem `EditorState` lief (`setSearchQuery`, `stepSearch` mehrfach, `closeSearch`) — **ohne** je eine `docChanged`-Transaktion → `writeDocx(state.doc.toJSON())` | Beide re-importierten Ergebnisse (`readDocx`) sind inhaltlich identisch (`toEqual` auf `result.body`); **kein** `w:highlight`, keine Spur der Suche im `highlight`-Mark-Attribut (Diff über **alle** Marks, nicht nur Text); `state.doc.toJSON()` vor/nach der Sitzung strukturgleich |
| UT-DOCX-RT-2 | „Alle ersetzen" auf Fixture mit Formatierung/Liste/Tabelle (`req` Abschnitt 9 TF6; Abschnitt 12 TF3) | Suchbegriff kommt im Fließtext (halb fett), in einem `list_item` und in einer `table_cell` vor → `replaceAllMatches` über echten Command-Aufruf → `roundTrip()` | ersetzter Text an allen drei Stellen korrekt, **inkl.** übernommener Formatierung (fett bleibt fett am Ersetzungsort); nicht betroffene Liste-/Tabellenzellen unverändert |
| UT-DOCX-RT-3 | Ersetzungstext länger als Original, Formatierungsgrenze (`req` Abschnitt 9) | Treffer beginnt in fettem Textlauf, Ersatz 3× so lang | gesamter neuer Text trägt die Formatierung der **Startposition** des Treffers (`tr.doc.resolve(from+1).marks()`) |
| UT-DOCX-RT-4 | „Ersetzen durch" leer → Löschen (`req` Abschnitt 9 TF5) | `replaceAllMatches(matches, '')` | alle Fundstellen entfernt, unmittelbar umgebender Text unverändert |
| UT-DOCX-RT-5 | Schleifensicherheit „Katze"→„Katzenbaby" (`req` Abschnitt 9 TF7) | 3 Vorkommen „Katze", Ersatz „Katzenbaby" | terminiert (kein Timeout), genau **3** Ersetzungen (Snapshot vorne, Ersetzen von hinten nach vorne — nicht erneut auf den entstehenden „Katze"-Teilstring anwenden) |
| UT-DOCX-RT-6 | Ein Undo-Schritt für „Alle ersetzen" (`req` Abschnitt 9 TF4) | `replaceAllMatches` dispatcht **eine** Transaktion in einen `EditorState` mit `history()` → `undo` einmal | nach **einem** Undo alle Originalvorkommen wiederhergestellt (`toJSON()` == Ausgangszustand) |
| UT-DOCX-RT-7 | Einzel-„Ersetzen" ersetzt nur den aktiven Treffer (`req` Abschnitt 9 TF1) | `replaceActiveMatch(matches[activeIndex], repl)` bei 5 Treffern | genau 1 Stelle ersetzt, die übrigen 4 unverändert; nach Neuberechnung rückt die aktive Markierung zum nächsten verbleibenden Treffer |

### A.3 `src/formats/odt/__tests__/roundtrip.test.ts` — spiegelbildlicher Testblock

Identische Tabelle wie A.2, IDs `UT-ODT-RT-1` … `UT-ODT-RT-7`, gegen `writeOdt`/`readOdt`.
Zusätzlich:

| ID | Testfall | Zusicherung |
|---|---|---|
| UT-ODT-RT-8 | `highlight`-Mark bleibt bei reiner Suche unangetastet (ODT-spezifisch: `fo:background-color`) | re-importierte `highlight`-Mark-Attribute (Farbwert) vor/nach Such-Sitzung exakt identisch; **kein** zusätzliches `fo:background-color` durch die Suche eingefügt |

### A.4 Cross-Format-Rundreise (`req` Abschnitt 12 TF5–6) — neue Datei `src/formats/shared/__tests__/search-cross-format-roundtrip.test.ts`

| ID | Testfall | Ablauf |
|---|---|---|
| UT-XFMT-1 | DOCX → Suchen & Ersetzen → als ODT → wieder importieren → als DOCX zurück | `readDocx(fixture)` → Ersetzung über echten Command-Pfad → `writeOdt` → `readOdt` → `writeDocx` → `readDocx` → ersetzter Text in **jedem** Zwischenschritt vorhanden, **kein Textverlust** (Formatierungsverlust bei Cross-Format laut Referenz akzeptabel, wird hier nicht als Fehlschlag gewertet — Textverlust hingegen schon) |
| UT-XFMT-2 | ODT → Suchen & Ersetzen → als DOCX → Re-Import | spiegelbildlich |

---

## B. Echte Playwright-Browser-Tests (Ebene B — verbindlich, keine Ausnahme)

### B.0 Konventionen (aus dem Bestand übernommen; siehe Abschnitt 0 „Determinismus")

- **Gemeinsame Fixture:** `import { test, expect, docxCard, odtCard } from './fixtures'`
  (räumt Banner weg, `goto('/')`, sammelt `errors`; D0.7).
- **Karten-Locator:** `docxCard(page)` / `odtCard(page)`.
- **Datei-Upload:** echter `<input type="file">` über
  `docxCard(page).locator('input[type="file"]').setInputFiles({ name, mimeType, buffer })`
  — **kein** direkter Aufruf von `readDocx`/`readOdt` im Testcode. Reale externe Fixtures
  werden wie im Bestand geladen:
  `readFileSync(join(__dirname, '../fixtures/external/<fmt>/<datei>'))`.
- **Export:** echter Klick auf `page.getByRole('button', { name: 'Exportieren' })`, mit
  `page.waitForEvent('download')` **vor** dem Klick (D0.5), danach `download.path()` +
  `fs.readFile` + `JSZip.loadAsync` auf den **heruntergeladenen Bytes**.
- **Re-Import:** erst `page.getByRole('button', { name: /formate/i }).click()`, dann zweiter
  Upload (D0.6).
- **Editor-Locator:** `page.locator('.ProseMirror')`. Absätze: `.ProseMirror p`.
- **MIME-Typen:** DOCX
  `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, ODT
  `application/vnd.oasis.opendocument.text`.
- **Neue Selektoren, die die Umsetzung bereitstellen MUSS**, damit diese Tests schreibbar
  sind (`suchen-code.md` Abschnitt 3.3/3.5):
  - Toolbar-Button: `page.getByRole('button', { name: 'Suchen' })` bzw.
    `page.getByTitle('Suchen (Strg+F)')`.
  - Sucheingabefeld: `page.getByRole('textbox', { name: /suchen/i })`.
  - Suchleisten-Wurzel: `[data-search-bar]` (aus `suchen-code.md` Abschnitt 3.3; für den
    Detach-Guard D0.4 und die „Suchleiste geschlossen"-Assertion).
  - Trefferzähler: `page.getByTestId('search-match-count')` mit `role="status"
    aria-live="polite"` (Testautoren-Empfehlung an Dev: `data-testid` **und** `role="status"`
    ergänzen; der Text „x von y" ist sonst schwer robust und die aria-live-Prüfung aus
    `req` Abschnitt 4 TF7 sonst nicht durchführbar).
  - Treffer-Decorations: `.search-match` / `.search-match-active` (`suchen-code.md`
    Abschnitt 3.7).
  - Checkboxen: `page.getByRole('checkbox', { name: /Groß-\/Kleinschreibung/i })`,
    `page.getByRole('checkbox', { name: /ganzes Wort/i })`.

### B.1 Neue Datei `tests/e2e/search.spec.ts` — Kernbedienung

Für **beide** Karten (DOCX und ODT) parametrisiert, analog `docx.spec.ts`/`odt.spec.ts`.
Jeder Test startet über die Fixture (Banner weg, auf '/'), erstellt/lädt ein Dokument und
klickt in den Editor, bevor getippt wird — **außer** den ausdrücklich „ohne Editor-Klick"
prüfenden Tests (PW-29/PW-30, Grenzfälle 17/18).

| ID | Testfall (Bezug `req`) | Playwright-Ablauf (konkret, deterministisch) |
|---|---|---|
| PW-1 | Strg+F öffnet Suchleiste, Fokus im Feld (Abschnitt 2 P2; Grenzfall 17) | `editor.click()`; `page.keyboard.type('Hallo Welt')`; `page.keyboard.press('ControlOrMeta+f')`; `await expect(searchInput).toBeFocused()`. Native Browser-Suche lässt sich headless nicht direkt beobachten; indirekter Nachweis: unsere Suchleiste ist offen (`[data-search-bar]` sichtbar) und keine `dialog`-/`beforeunload`-Ereignisse |
| PW-2 | Toolbar-Button öffnet dieselbe Suchleiste (Abschnitt 2 P1; DoD 1) | `page.getByRole('button', { name: 'Suchen' }).click()`; `await expect(searchInput).toBeVisible()` **und** `toBeFocused()`; `aria-expanded="true"` am Button |
| PW-3 | Live-Hervorhebung beim Tippen, ohne „Suchen"-Klick (Abschnitt 3 TF1) | Suchleiste offen; `searchInput.fill('Welt')`; `await expect(page.locator('.search-match')).toHaveCount(1)` (auto-retry durch Debounce, D0.1) |
| PW-4 | Einzeilige Textselektion befüllt das Suchfeld vor (Abschnitt 2 P3) | `editor.dblclick()` auf einem Wort; **`await page.waitForTimeout(50)` (D0.3 — die native Doppelklick-Selektion muss in die PM-State nachgezogen sein, bevor `openSearch` sie für die Vorbelegung liest, sonst flaky-leeres Feld)**; `page.keyboard.press('ControlOrMeta+f')`; `await expect(searchInput).toHaveValue('<Wort>')` |
| PW-4b | Mehrabsätzige Selektion wird **nicht** übernommen (Abschnitt 2 P3) | zwei Absätze, `ControlOrMeta+a` (mehrere Blöcke) → `ControlOrMeta+f` → `await expect(searchInput).toHaveValue('')` |
| PW-5 | „Bereits offen + erneut Strg+F" erhält Text/Treffer, selektiert (Abschnitt 2, Grenzfall) | Suchleiste offen, `searchInput.fill('abc')`; `editor.click()` (Fokus zurück in Editor, **danach D0.3 nicht nötig, da kein positionsabhängiger Tastendruck folgt**); `page.keyboard.press('ControlOrMeta+f')` → `await expect(searchInput).toHaveValue('abc')` **und** `toBeFocused()`; Text ist selektiert (sofort überschreibbar: `page.keyboard.type('x')` → `toHaveValue('x')`) |
| PW-6 | Fokus-Routing: `Strg+B` im Suchfeld formatiert **nicht** das Dokument (Abschnitt 2 TF4) | Suchfeld fokussiert, `page.keyboard.type('abc')`, `page.keyboard.press('ControlOrMeta+b')` → `await expect(searchInput).toHaveValue('abc')`; im Editor entsteht **kein** `<strong>` (`await expect(page.locator('.ProseMirror strong')).toHaveCount(0)`) |
| PW-7 | Case-Toggle ändert Trefferzahl (Abschnitt 3 TF2) | Dokument mit „Wort" **und** „wort"; `.search-match`-Count vor Toggle notieren; `getByRole('checkbox', { name: /Groß-\/Kleinschreibung/i }).check()` → Count halbiert sich (auto-retry) |
| PW-8 | Diakritika ß/ä/é + Gegenprobe (Abschnitt 3 TF3) | Text „Straße über Café"; Suche „ß" → ≥1 Treffer; Suche „ss" → `.search-match` Count 0; Suche „u" → trifft **nicht** das „ü" in „über" (Count entspricht nur echten „u") |
| PW-9 | Literal-Matching `a.b*c` (Abschnitt 3 TF4) | zwei Absätze `a.b*c` und `aXbYYYc`; Suche `a.b*c` → `.search-match` Count **1** |
| PW-10 | Leeres Suchfeld → keine Hervorhebung, Leerzustand-Zähler, kein Fehler (Grenzfall 1; Abschnitt 3.1) | `searchInput.fill('')`; `await expect(page.locator('.search-match')).toHaveCount(0)`; **zusätzlich Leerzustand (a) prüfen: `getByTestId('search-match-count')` zeigt „–" und **nicht** „0 von 0" (`await expect(counter).not.toContainText('von')`). Empfehlung an Dev: die `role="status"`-Live-Region bleibt auch im Leerzustand gemountet (Text „–"), damit `aria-live` konsistent ansagt und der Selektor stabil bleibt.** `errors` bleibt leer |
| PW-11 | Nur-Leerzeichen → keine Highlight-Flut (Grenzfall 2) | `searchInput.fill('   ')` → `.search-match` Count **0** (dokumentiertes Verhalten `suchen-code.md` Abschnitt 2.3), kein Absturz |
| PW-12 | Kein Treffer → „Keine Treffer", keine Fehlerfarbe (Grenzfall 3) | Suche nach frei erfundener Zeichenkette → `getByTestId('search-match-count')` zeigt „Keine Treffer"; `await expect(searchInput).not.toHaveClass(/error|invalid/)` |
| PW-13 | Formatierungsgrenze = ein Treffer (Abschnitt 3 TF8) | „Wort" tippen, erste Hälfte fett (Selektion + Fett-Button), suchen → `.search-match` Count **1** |
| PW-14 | Absatzgrenze = kein Treffer (Abschnitt 3 TF9) | „Satz eins" + Enter + „endeteil"; Suche „einsendeteil" (nur durch Absatzverbindung entstünde) → Count **0** |
| PW-15 | **`hard_break` überspannt NICHT** (Abschnitt 3 TF10, korrigiert) | „Zeile eins", `Shift+Enter`, „Zeile zwei" im selben Absatz; Suche „eins" → 1 Treffer, Suche „zwei" → 1 Treffer; Suche **„einszwei"** und **„eins zwei"** → Count **0** (ein einzeiliges Suchfeld kann den `\n` nicht enthalten, `suchen-code.md` Abschnitt 2.2). **Achtung:** frühere Entwurfsfassung behauptete das Gegenteil — hier bewusst als „findet NICHT" spezifiziert |
| PW-16 | Alle Treffer gleichzeitig markiert (Abschnitt 4 TF1) | Dokument mit 3 Vorkommen → `.search-match` Count **3** |
| PW-17 | Aktiver Treffer optisch unterscheidbar, nicht nur Farbe (Abschnitt 4 TF2) | `.search-match-active` Count **1**; `getComputedStyle`-Check (`page.evaluate`), dass `outline-width` ≠ „0px" **und** `font-weight` ≥ 600 am aktiven Treffer, während ein inaktiver `.search-match` `outline`-frei ist (Rücksicht auf Farbfehlsichtigkeit) |
| PW-18 | Cursor-basierte Initial-Aktivierung (Abschnitt 4 TF6) | 3 Vorkommen; Cursor per Klick **hinter** das erste Vorkommen setzen (D0.3-Wait), Begriff tippen → `getByTestId('search-match-count')` zeigt Index **> 1** (z. B. „2 von 3"), nicht „1 von 3" |
| PW-19 | Scroll zu Treffer auf „Seite 2" (Abschnitt 4 TF3) | mehrseitiges Fixture (genug Absätze für 2 Paginierungsseiten, vgl. `pagination.test.ts`); zu einem Treffer auf Seite 2 navigieren → `await expect(page.locator('.search-match-active')).toBeInViewport()` (deterministisch statt Screenshot) |
| PW-20 | Koexistenz mit `highlight`-Mark (Abschnitt 4 TF4) | Text markieren, Toolbar-Hervorhebungsfarbe setzen, danach suchen → Treffer trägt `.search-match`-Klasse **und** der `highlight`-Span-Hintergrund bleibt sichtbar (`getComputedStyle` zeigt gemischte, nicht reine Suchfarbe); Mark-Attribut im Editor-DOM vor/nach Suche unverändert |
| PW-21 | Formatierung bleibt sichtbar (Abschnitt 4 TF5) | Treffer in fett/kursiv/farbigem Text → `<strong>`/`<em>`/`span[style*=color]` bleiben im DOM, überlagert von `.search-match` |
| PW-22 | aria-live-Trefferanzeige (Abschnitt 4 TF7) | `getByTestId('search-match-count')` hat `role="status"` und `aria-live="polite"`; Textinhalt ändert sich bei neuer Suche/Navigation (`toHaveText` vor/nach) |
| PW-23 | Navigation vorwärts in Dokumentreihenfolge (Abschnitt 5 TF1) | 3 Treffer, `Enter` schrittweise → aktive Decoration wandert in Reihenfolge (Positions-/Indexvergleich über `.search-match-active`) |
| PW-24 | Wrap-Around vorwärts (Abschnitt 5 TF2) | am letzten Treffer `Enter` → aktiv wird wieder der erste |
| PW-25 | Wrap-Around rückwärts (Abschnitt 5 TF3) | am ersten Treffer `Shift+Enter` → aktiv wird der letzte |
| PW-26 | Pfeiltasten + Vor/Zurück-Buttons (Bedienelemente 4/5) | `ArrowDown`/`ArrowUp` im Feld **und** Klick auf „Nächster"/„Vorheriger"-Button bewirken dieselbe Navigation wie Enter/Shift+Enter |
| PW-27 | Suche über Tabellenzellen (Abschnitt 8 TF1/3) | Tabelle einfügen (`getByRole('button', {name:'Tabelle einfügen'})`), Begriff in zwei nicht benachbarte Zellen tippen (D0.3-Wait nach jedem Zellklick), zusätzlich im Haupttext → `.search-match` Count **3**, Navigation folgt Zellreihenfolge |
| PW-28 | Suche über Listenelement (Abschnitt 8 TF2) | Liste einfügen, Begriff in einem `list_item` → gefunden; `ul`/`li`-Struktur nach Öffnen/Schließen der Suche unverändert |
| PW-29 | Suche direkt nach Upload, **ohne** Editor-Klick (Grenzfall 17) | `input.setInputFiles(...)`; `await expect(editor).toBeVisible()` (D0.2) — **kein** `editor.click()`; `page.keyboard.press('ControlOrMeta+f')` → Suchleiste offen, Suche funktioniert |
| PW-30 | Suche direkt nach „Neu erstellen" (leerer Editor, Grenzfall 18) | „Neu erstellen"; `await expect(editor).toBeVisible()`; `ControlOrMeta+f`; beliebigen Begriff tippen → „Keine Treffer", `errors` leer (kein Crash bei leerem `doc`) |
| PW-31 | Checkbox-Standardwerte (Abschnitt 2 P7/8) | beim ersten Öffnen beide Checkboxen `not.toBeChecked()` |
| PW-32 | IME-Komposition im Suchfeld (Grenzfall 20) | über `page.evaluate` `compositionstart` + `input` (Zwischenstand) am Suchfeld feuern **ohne** `compositionend` → `.search-match` bleibt Count **0** (Suche feuert nicht mitten in der Komposition); dann `compositionend` mit finalem Text → Suche feuert, Treffer erscheinen; `errors` leer. **Determinismus-/Realitäts-Caveat (verbindlich, sonst false-green):** Das Suchfeld ist ein **React-controlled** `<input>`. Ein bloßes Setzen von `el.value` + `dispatchEvent(new Event('input'))` wird von React ignoriert (kein `onChange`) — der Test würde nichts beweisen. Der `input`-Wert MUSS über den nativen Setter gesetzt werden (`Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(el, wert)`), **danach** ein `new InputEvent('input',{bubbles:true})` dispatchen; die Kompositions-Events als `new CompositionEvent('compositionstart'|'compositionend',{bubbles:true})`. Nur so durchläuft die Sequenz den echten `composing`-Guard aus `suchen-code.md` Abschnitt 3.3 |
| PW-33 | Escape schließt spurlos (Bedienelement 9; Grenzfall 15 Teil) | Suche mit Treffern offen, `Escape` → `.search-match` Count **0**, `[data-search-bar]` `toHaveCount(0)` |
| PW-34 | Mehrfaches schnelles Öffnen/Schließen (Grenzfall 19) | Schleife 10× `ControlOrMeta+f` → `Escape`; danach einmal öffnen, denselben Begriff eingeben → `.search-match` Count **exakt** die erwartete Zahl (kein kumulierter Anstieg durch doppelt registrierte Plugins/Decoration-Leak) |
| PW-35 | Dokumentänderung während offener Suche: Treffer entsteht (Abschnitt 7 TF2; Grenzfall 12) | Suche offen; in den Editor klicken (D0.3-Wait), Text tippen, der einen weiteren Treffer erzeugt → `.search-match` Count steigt live, Zähler aktualisiert |
| PW-36 | Aktiven Treffer per Backspace löschen (Abschnitt 7 TF1/3; Grenzfall 12) | 3 Treffer; in den Editor an den aktiven Treffer klicken, **`page.waitForTimeout(50)` (D0.3)**, das Wort per `Backspace`-Sequenz löschen → Zähler live auf 2, aktive Markierung rückt zum nächsten Treffer, `errors` leer, kein hängender Zustand |
| PW-37 | **Import einer anderen Datei bei offener Suche** (Grenzfall 13; Abschnitt 7 TF4) | Datei A laden, Suche mit Treffern offen; zurück zu „← Formate" (dirty=false, kein Confirm) → Datei B (anderer Inhalt) hochladen → Editor zeigt B; keine „Geister-Highlights" aus A (`.search-match` Count 0, solange keine neue Suche läuft), `errors` leer (kein Crash durch veraltete Positionen) |

### B.2 Pflicht-Regressionstest: Selection-Sync beim Schließen der Suche

Nicht verhandelbar (`req` Abschnitt 5 TF4/5; Abschnitt 11 Grenzfall 10; Abschnitt 15
DoD-Punkt 5). Muss dauerhaft in der Suite bleiben, im Geist von
`tests/e2e/selection-regression.spec.ts`, aber **ohne** künstlichen Timing-Workaround
(die Selektion wird synchron als PM-Transaktion gesetzt — genau das ist der Beweis; siehe
Determinismus-Regel D0.4).

```ts
test('closing search places a real selection at the last active match, ready to type', async ({ page, errors }) => {
  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()

  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Anfang MARKER Ende des Absatzes.')

  await page.keyboard.press('ControlOrMeta+f')
  await page.getByRole('textbox', { name: /suchen/i }).fill('MARKER')
  await expect(page.locator('.search-match')).toHaveCount(1)

  await page.keyboard.press('Escape')
  // Beobachtbares Ergebnis des synchronen Schließens abwarten — KEIN waitForTimeout (D0.4):
  await expect(page.locator('.search-match')).toHaveCount(0)      // Query geleert = Tr. verarbeitet
  await expect(page.locator('[data-search-bar]')).toHaveCount(0)  // SearchBar unmountet, Fokus zurück im Editor

  // Kritischer Nachweis: sofortiges Tippen fügt Text AN DER FUNDSTELLE ein — nicht am
  // Dokumentanfang/-ende, und ersetzt NICHT den gesamten Inhalt.
  await page.keyboard.type('XYZ')

  await expect(editor).toContainText('Anfang MARKERXYZ Ende des Absatzes.')
  await expect(page.locator('.ProseMirror p')).toHaveCount(1) // kein Absatz verloren/dupliziert
  expect(errors, errors.join('\n')).toEqual([])
})
```

**Zweite Variante (Pflicht):** dieselbe Sequenz mit **≥3 Treffern**, bei der vor dem
Schließen per `Enter` zum **zweiten** (nicht ersten) Treffer navigiert wurde — stellt
sicher, dass die synchrone Selektion auf den **zuletzt aktiven** Treffer zeigt und nicht
zufällig nur der Default-Fall (einziger/erster Treffer) funktioniert.

**Dritte Variante (Grenzfall):** Suche schließen bei „**Keine Treffer**" (`req` Abschnitt 5
TF6) → Cursor bleibt an der vorherigen Position, kein Sprung, `errors` leer.

### B.3 Neue Datei `tests/e2e/search-roundtrip.spec.ts` (`req` Abschnitt 12 vollständig — echte Datei-Ebene)

Jeder Test lädt eine **reale Fixture-Datei** über den echten `<input type="file">`, bedient
die Suchleiste über echte Tastatur-/Mausinteraktion, exportiert per Klick, wartet auf das
`download`-Event, liest die **heruntergeladene Datei** von der Festplatte, entpackt sie mit
`JSZip` und prüft den XML-Inhalt — und lädt diese heruntergeladene Datei **erneut über den
echten Upload-Input** (nach „← Formate", D0.6), um den Re-Import ebenfalls über die UI zu
verifizieren.

| ID | Testfall (Bezug) | Ablauf |
|---|---|---|
| PW-RT-1 | DOCX, reine Suche ohne Ersetzen, Rundreise (Abschnitt 12 TF1; Abschnitt 6 TF1) | Fixture-DOCX mit Formatierung + Liste + Tabelle hochladen → `expect(editor).toBeVisible()` → Strg+F → Begriff eintippen, der in Fließtext, Liste **und** Tabelle vorkommt → mehrfach `Enter` (durch alle Treffer inkl. Tabellenzelle) → Case-Toggle einmal an/aus → `Escape` → **ohne** weitere Änderung „Exportieren" → `download.path()` → `JSZip` → `word/document.xml`-Textknoten identisch zu einem Referenzexport ohne Such-Sitzung; **zusätzlich** heruntergeladene Datei über „← Formate" + Upload erneut laden → Editor zeigt exakt denselben Inhalt |
| PW-RT-2 | ODT-Äquivalent zu PW-RT-1 (Abschnitt 12 TF2) | wie PW-RT-1, ODT-Fixture, `odtCard`, Prüfung auf `content.xml` |
| PW-RT-3 | DOCX, Suchen & Ersetzen inkl. Tabellenzelle, Rundreise (Abschnitt 12 TF3) | Fixture laden → Strg+F → Modus „Suchen & Ersetzen" → Begriff + Ersatz eintippen → „Alle ersetzen" (echter Klick) → `expect(editor).toContainText(<Ersatz>)` → **`page.on('dialog', d => d.accept())` registrieren** (dirty=true, „← Formate" nach Re-Import würde sonst blockieren) → „Exportieren" → Download → `JSZip` → `word/document.xml` enthält den neuen Text an der erwarteten Stelle (inkl. innerhalb `<w:tbl>`), den alten Begriff nur dort, wo er nicht Ziel war → heruntergeladene Datei erneut laden → ersetzter Inhalt korrekt |
| PW-RT-4 | ODT-Äquivalent zu PW-RT-3 (Abschnitt 12 TF4) | wie PW-RT-3, ODT/`content.xml` |
| PW-RT-5 | Cross-Format ODT → Ersetzen → Export **als DOCX** → Re-Import (Abschnitt 12 TF5) | siehe Blocker-Vermerk **Abschnitt D**: falls die UI keinen Cross-Format-Export bietet, deckt UT-XFMT-2 dies auf Objektebene ab und PW-RT-5 wird nachgezogen |
| PW-RT-6 | Cross-Format DOCX → Ersetzen → Export **als ODT** → Re-Import (Abschnitt 12 TF6) | spiegelbildlich, siehe **Abschnitt D** |
| PW-RT-7 | „Ersetzen durch" leer über echte UI (Abschnitt 9 TF5) | Ersetzen-Modus, Ersatzfeld leer, „Alle ersetzen" → Editor zeigt Fundstellen entfernt, umgebender Text unangetastet → Export/Re-Import bestätigt dauerhaftes Fehlen |
| PW-RT-8 | Einzel-„Ersetzen" über echte UI (Abschnitt 9 TF1) | bei 5 Treffern „Ersetzen" einmal → verbleibende Treffer 4, genau eine Stelle ersetzt |
| PW-RT-9 | „Alle ersetzen" = ein Undo-Schritt über echte UI (Abschnitt 9 TF4) | „Alle ersetzen" bei 5 → `ControlOrMeta+z` einmal → alle 5 Originaltexte wieder vollständig |
| PW-RT-10 | Längenänderung „Alle ersetzen" (Abschnitt 9 TF6) | „x" (1 Zeichen) an mehreren Stellen → „xxxxx" → alle Vorkommen korrekt ersetzt, **keiner** übersprungen/doppelt (Positionsverschiebung); Export/Re-Import bestätigt |

### B.4 Neue Datei `tests/e2e/search-nondestructive.spec.ts` — flüchtige Decoration & `dirty` (echte UI)

Beweist über echte Browser-Bedienung, dass reine Suche das Dokument **nicht** anfasst
(`req` Abschnitt 6, die am Code belegte „dirty-Falle"). Das ist der zentrale, in Ebene A nur
auf Objektebene beweisbare Punkt — hier auf UI-Ebene:

| ID | Testfall (Bezug) | Ablauf |
|---|---|---|
| PW-DIRTY-1 | reine Suche lässt `dirty` false (Abschnitt 6 TF4; Grenzfall 11) | Fixture-DOCX hochladen (`● ungespeichert` **nicht** sichtbar); komplette Such-Sitzung (Strg+F, tippen, navigieren, beide Toggles, `Escape`) → `await expect(page.getByText('● ungespeichert')).toHaveCount(0)`; danach ein `dialog`-Handler registrieren, der bei Auslösung den Test **fehlschlagen** lässt, dann „← Formate" klicken → landet auf der Picker-Ansicht **ohne** `window.confirm` (belegt: `dirty` blieb false, `handleClose` löste keine Rückfrage aus) |
| PW-DIRTY-2 | reine Suche verbraucht **keinen** Undo-Schritt (Abschnitt 6 TF2) | Text tippen, ein Wort fett machen (letzte echte Inhaltsänderung); Such-Sitzung durchführen und schließen; `ControlOrMeta+z` einmal → macht die **Fettung** rückgängig (nicht „die Suche"), Text bleibt vollständig |
| PW-DIRTY-3 | Ersetzen setzt `dirty` bewusst true (Abschnitt 9) | nach „Alle ersetzen" ist `● ungespeichert` sichtbar (Gegenprobe zu PW-DIRTY-1 — belegt, dass die dirty-Kopplung intakt ist und nur die reine Suche sie meidet) |

### B.5 Mobile/Tablet-Verifikation (`req` Abschnitt 11 Grenzfall 21; Abschnitt 13, Zeile „E2E Mobile/Tablet")

`tests/e2e/search.spec.ts` läuft über `playwright.config.ts` automatisch auch auf den
Projekten **„Mobile"** (Pixel 7) und **„Tablet"** (iPad Mini). Diese sind **Touch**-Geräte
ohne physische Strg-Taste; deshalb werden dort nur die touch-tauglichen Tests ausgeführt und
die Strg+F-abhängigen ausgelassen. Umsetzung über projektbewusste Skips:

- **Nur Toolbar-Button/Tap:** PW-2, PW-3, PW-12, PW-16, PW-17, PW-23–PW-26, PW-33 laufen auf
  allen Projekten (öffnen die Suche per `getByRole('button', { name: 'Suchen' })`, nicht per
  Tastenkürzel).
- **Skip auf Touch:** Tests, die zwingend `ControlOrMeta+f` brauchen (PW-1, PW-29, PW-34,
  B.2), werden über `test.skip(testInfo.project.name !== 'Desktop Chrome', 'Strg+F nur Desktop')`
  auf Touch-Projekten übersprungen — der Ersatzweg (Toolbar-Button) ist durch PW-2 abgedeckt.
- **Zusätzliche Touch-Assertion** (Grenzfall 21): auf „Mobile"/„Tablet" nach Öffnen per Button
  prüfen, dass das Suchfeld sichtbar/fokussierbar ist und der Trefferzähler **nicht** von der
  Bildschirmtastatur dauerhaft verdeckt wird: `await expect(searchInput).toBeInViewport()` und
  `await expect(getByTestId('search-match-count')).toBeInViewport()`.

---

## C. Performance-Testfall (`req` Abschnitt 11 Grenzfall 16)

| ID | Testfall | Ablauf |
|---|---|---|
| PW-PERF-1 | Großes Dokument, häufiger Begriff, UI bleibt reaktionsfähig | Reale komplexe Fixture `tests/fixtures/external/odt/bible_short.odt` (vorhanden) per `readFileSync(join(__dirname, '../fixtures/external/odt/bible_short.odt'))` hochladen → `expect(editor).toBeVisible()` → Strg+F/Toolbar → nach häufigem Wort („der"/„die"/„das", dutzende bis hunderte Treffer) suchen → `.search-match` Count > 50 erscheint innerhalb eines großzügigen Assertion-Timeouts (`toHaveCount` mit erhöhtem `timeout`), Richtwert < 3 s (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 8) → zusätzlich: unmittelbar danach ein weiteres Zeichen ins Suchfeld tippen und prüfen, dass das Feld den Wert sofort zeigt (`toHaveValue`), d. h. der Main-Thread ist nicht länger als die Debounce blockiert. **Determinismus:** keine harte `performance.now()`-Schwelle als Pass/Fail (flaky in CI) — stattdessen großzügiger, aber endlicher Assertion-Timeout; die Zeitmessung dient nur als protokollierter Richtwert, nicht als Gate |

---

## D. Bekannte Einschränkung — nicht Teil dieses Testplans

**Kopf-/Fußzeilensuche (`req` Abschnitt 8 TF4):** laut `suchen-code.md` Abschnitt 5 **derzeit
nicht durchführbar**, da kein editierbarer Kopf-/Fußzeilenbereich existiert
(`kopfzeile-bearbeiten`/`fusszeile-bearbeiten` laut Backlog „fehlt"; `WordEditor.tsx` bindet
nur `body`). Dieser Testfall wird **nicht** als „nicht bestanden", sondern als
**zurückgestellt** geführt und nachgeholt, sobald Kopf-/Fußzeilen editierbar sind. Er
blockiert den Backlog-Status von `suchen` nicht.

**Cross-Format-Export über die UI (PW-RT-5/PW-RT-6):** hängt davon ab, dass die
Export-Schaltfläche eine Formatwahl anbietet (aktueller Code-Stand: DOCX-Karte exportiert
nach DOCX, ODT-Karte nach ODT; kein Cross-Format-Export-Button in der UI). Solange die UI
keinen Cross-Format-Export bietet, werden PW-RT-5/PW-RT-6 durch die Objektebene-Tests
UT-XFMT-1/UT-XFMT-2 (A.4) abgedeckt und die Playwright-Variante nachgezogen, sobald der
UI-Pfad existiert — dokumentierter Blocker, keine stillschweigende Lücke.

---

## E. Zuordnung: Pflicht-Grenzfälle (`req` Abschnitt 11, Punkte 1–21) → Nachweis-IDs

Vollständige Abbildung der **kanonischen** Grenzfallnummerierung. Jeder Punkt hat mindestens
einen Nachweis oder einen dokumentierten Grund für Zurückstellung.

| # (req Abschnitt 11) | Grenzfall | Ebene A (Unit) | Ebene B (Playwright) |
|---|---|---|---|
| 1 | Leere Sucheingabe | UT-SEARCH-6 | PW-10 |
| 2 | Nur-Leerzeichen-Suchbegriff | UT-SEARCH-6 | PW-11 |
| 3 | Kein Treffer | — | PW-12 |
| 4 | Regex-Metazeichen literal | UT-SEARCH-4 | PW-9 |
| 5 | Nicht überlappende Treffer („aa"→2) | UT-SEARCH-5 | (implizit über Count in PW-16) |
| 6 | Formatierungsgrenze = ein Treffer | UT-SEARCH-7 | PW-13 |
| 7 | Absatzgrenze = kein Treffer | UT-SEARCH-8 | PW-14 |
| 8 | `hard_break` überspannt nicht | UT-SEARCH-9 | PW-15 |
| 9 | Whole-Word mit Umlauten/ß (Unicode-Grenzen) | UT-SEARCH-10, -11, -12 | PW-8 (Diakritik) + Whole-Word-E2E in PW-31-Kontext / eigener Test in `search.spec.ts` |
| 10 | Selection-Sync beim Schließen | UT-SEARCH-16 | **PW-B.2 (Pflicht, 3 Varianten)** |
| 11 | `dirty` bleibt unangetastet | UT-SEARCH-16, UT-DOCX-RT-1 | **PW-DIRTY-1** |
| 12 | Doc-Änderung während offener Suche | UT-SEARCH-15 | PW-35, PW-36 |
| 13 | Dokumentwechsel/Import bei offener Suche | — | **PW-37** |
| 14 | Suche über Tabellen-/Listengrenzen | UT-SEARCH-13 | PW-27, PW-28 |
| 15 | Export/Re-Import während/nach Suche | UT-DOCX-RT-1, UT-ODT-RT-1/8 | PW-RT-1, PW-RT-2, PW-33 |
| 16 | Großes Dokument, häufiger Begriff (Performance) | — | PW-PERF-1 |
| 17 | Suche direkt nach Import (ohne Editor-Klick) | — | PW-29, PW-1 |
| 18 | Suche direkt nach „Neu erstellen" (leerer Editor) | — | PW-30 |
| 19 | Mehrfaches schnelles Öffnen/Schließen | — | PW-34 |
| 20 | IME-Komposition im Suchfeld | — | **PW-32** |
| 21 | Mobile/Tablet | — | **Abschnitt B.5** |

Hinweis: Für Grenzfall 9 wird in `search.spec.ts` zusätzlich zum Diakritik-Test (PW-8) ein
**eigener Whole-Word-E2E-Test** ergänzt (Checkbox „Nur ganzes Wort" aktivieren; Dokument mit
„Straße" und „Hauptstraße"; `.search-match` Count fällt von 2 auf 1) — die reine Logik ist
per UT-SEARCH-10/11/12 abgedeckt, der UI-Toggle muss aber auch im Browser nachgewiesen sein.

---

## F. Definition of Done — Abnahme-Checkliste (`req` Abschnitt 15)

Der Backlog-Status von `suchen` darf erst auf „vorhanden" wechseln, wenn **alle** folgenden
Zeilen grün sind (auf Desktop Chrome; touch-taugliche Teilmenge zusätzlich auf Mobile/Tablet,
Abschnitt B.5):

| DoD-Punkt (`req` Abschnitt 15) | Nachweis-IDs |
|---|---|
| 1. Strg+F **und** Toolbar-Button, dieselbe Leiste, auch direkt nach Import, native Suche unterdrückt | PW-1, PW-2, PW-29 |
| 2. Live-Suche, Literal, nicht überlappend, Case-Toggle, Unicode-Whole-Word, diakritik-sensitiv | UT-SEARCH-1..12, PW-3, PW-7, PW-8, PW-9, PW-11 + Whole-Word-E2E |
| 3. Alle Treffer markiert, aktiver nicht nur farblich, Cursor-basierte Initial-Aktivierung, Navigation+Wrap, Zähler als Live-Region | PW-16, PW-17, PW-18, PW-22, PW-23, PW-24, PW-25, PW-26 |
| 4. Flüchtige Decoration, kein Undo-/Export-/**dirty**-Einfluss | UT-SEARCH-16, UT-DOCX-RT-1, UT-ODT-RT-1/8, **PW-DIRTY-1, PW-DIRTY-2**, PW-RT-1, PW-RT-2, PW-33 |
| 5. Selection-Sync-Regressionstest beim Schließen, synchrone PM-Selektion, dauerhaft in Suite | **PW-B.2 (3 Varianten)** |
| 6. Dokumentwechsel/Import bei offener Suche ohne Geister-Highlights/Crash | PW-37 |
| 7. Rundreise DOCX **und** ODT (reine Suche) | UT-DOCX-RT-1, UT-ODT-RT-1, PW-RT-1, PW-RT-2 |
| 8. Alle Grenzfälle Abschnitt 11 (1–21) einzeln getestet, inkl. Mobile/Tablet + IME | Abschnitt E dieser Datei (vollständig) |
| 9. (für `suchen-ersetzen`) Ersetzen inkl. Positionsverschiebung + Rundreise | UT-DOCX-RT-2..7, UT-ODT-RT-2..8, UT-XFMT-1/2, PW-RT-3..10, PW-DIRTY-3 |

Der Backlog-Status von `suchen-ersetzen` darf zusätzlich erst dann auf „vorhanden" wechseln,
wenn DoD-Punkt 9 vollständig grün ist (inkl. der Cross-Format-Fälle PW-RT-5/PW-RT-6 bzw.
deren dokumentierten Ersatz UT-XFMT-1/2, Abschnitt D).

Bis **alle** Punkte über echte Browser-Tests (Ebene B) belegt sind, bleibt der Status „nicht
vertrauenswürdig" bzw. „fehlt"/„teilweise" — unabhängig davon, ob einzelne Teilfunktionen
bereits im Code sichtbar sind. Nach jedem Push ist der GitHub-Actions-Lauf selbst zu prüfen
(nicht als grün annehmen).
