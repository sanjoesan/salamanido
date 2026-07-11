# Umsetzungsplan „Alles auswählen" — dateigenau, gegen den tatsächlichen Code geprüft

Bezug: `E:\docs\specs\alles-auswaehlen-req.md` (Anforderung), `E:\docs\FEATURE-SPEC-DOCX-ODT.md`
(Referenzkonventionen), `E:\docs\specs\alles-auswaehlen-qa.md` (QA-Testplan, unabhängig gegen
diesen Plan gegengeprüft). Code-Stand **erneut geprüft am 2026-07-05** in `E:\docs` (das
Arbeitsverzeichnis **ist** ein Git-Repository — `git status`/`git log` liefern reale Historie;
die Vorfassung dieses Plans behauptete fälschlich „kein Git-Repo", siehe Korrektur H unten).
Geprüfte Dateien/Pakete: `src/formats/shared/editor/WordEditor.tsx`,
`src/formats/shared/editor/Toolbar.tsx`, `src/formats/shared/editor/commands.ts`,
`src/formats/shared/editor/__tests__/commands.test.ts`, `src/formats/shared/schema.ts`,
`src/formats/shared/editor/pageLayout.ts`, `src/index.css`, `src/app/DocumentWorkspace.tsx`,
`playwright.config.ts`, `tests/e2e/selection-regression.spec.ts`, `tests/e2e/cut.spec.ts`,
`tests/e2e/clipboard.spec.ts`, `tests/e2e/clipboard-roundtrip.spec.ts`, `tests/e2e/docx.spec.ts`,
`tests/e2e/odt.spec.ts`, `tests/e2e/fixtures.ts`, `tests/e2e/fixtures/richDocument.ts`,
`tests/e2e/fixtures/fullCoverageDocument.ts`, `src/formats/docx/__tests__/cut-roundtrip.test.ts`,
`src/formats/odt/__tests__/cut-roundtrip.test.ts`, `node_modules/prosemirror-commands`,
`-state`, `-history`, `-tables`, `node_modules/playwright-core` (Device-Definitionen).

**Warnung an Leser:innen dieses Plans:** Eine frühere Fassung dieses Dokuments wurde geschrieben,
**bevor** die Schwester-Tickets „Kopieren" und „Ausschneiden" umgesetzt waren. Diese Fassung
korrigiert die dadurch entstandene Veralterung. Wer die Vorgängerfassung kennt, lese **zuerst
Abschnitt 1** („Was sich seit der letzten Planfassung real geändert hat") — dort stehen die
konkreten, verhaltensrelevanten Korrekturen, die verhindern, dass jemand bereits existierende
Tests ein zweites Mal schreibt oder ein bereits existierendes Playwright-Projekt für
„nicht vorhanden" hält.

Rolle dieses Dokuments: Es beantwortet, was am **bestehenden Code** falsch/unvollständig ist,
und legt fest, welche Dateien geändert bzw. neu angelegt werden. Das **inhaltliche Kernergebnis
bleibt unverändert:** „Alles auswählen" selbst benötigt **keine einzige Zeile neuen
Anwendungscodes** — jede Anforderung ist entweder durch `prosemirror-commands`/`-state`/
`-history`/`-tables` strukturell garantiert (Abschnitt 4) oder gehört einem anderen Ticket
(Abschnitt 5). Was sich gegenüber der Vorfassung ändert, ist der **Testumfang**: ein großer
Teil der in `alles-auswaehlen-req.md` geforderten Verifikation ist inzwischen als **Nebenprodukt**
der Kopieren-/Ausschneiden-Umsetzung bereits vorhanden (Abschnitt 3). Der echte Restauftrag ist
kleiner und anders geschnitten als in der Vorfassung angenommen (Abschnitt 5/6).

---

## 0. Kurzfassung des Codebefunds

- **Kein eigener Code-Pfad für „Alles auswählen".** Verifiziert per Volltextsuche über `src/`:
  `selectAll`/`select-all`/`AllSelection` haben in **Anwendungscode** keinen Treffer. Zwei
  Nicht-Anwendungs-Treffer, die die Vorfassung noch als „keine Treffer" führte, sind zu
  präzisieren:
  1. `WordEditor.tsx` Zeilen 20–42 — reiner Kommentar (Beschreibung des Selection-Sync-Bugs;
     `AllSelection` namentlich auf Zeile 22).
  2. `src/formats/shared/editor/__tests__/commands.test.ts` Zeilen 1/33–37 — **ein echter Test**
     (`'is true for an AllSelection'`), der `new AllSelection(state.doc)` konstruiert und gegen
     `canCut` prüft. Das ist neu gegenüber der Vorfassung und relevant für Abschnitt 6.4 (das
     dort geplante Unit-File ist **nicht** das „erste" seiner Art).
  `commands.ts` exportiert `setAlign`, `isAlignActive`, `setHeading`, `toggleList`,
  `liftFromList`, `insertImage`, `insertHardBreak`, `insertTable`, `applyMarkColor`,
  `clearMarkColor`, `canCut`, `cutSelection` — **nichts** mit `selectAll`/Select-All-Bezug.
- **`selectAll` ist Bibliothekscode** (`node_modules/prosemirror-commands/dist/index.js`):
  ```js
  const selectAll = (state, dispatch) => {
      if (dispatch) dispatch(state.tr.setSelection(new AllSelection(state.doc)));
      return true;
  };
  ```
  `WordEditor.tsx` bindet die projekteigene `keymap({...})` (Objekt-Literal Zeilen 85–107, enthält
  `Mod-z`/`Mod-y`/`Mod-Shift-z`/`Enter`/`Shift-Enter`/`Mod-b`/`Mod-i`/`Mod-u`/`Shift-Delete`,
  **kein** `Mod-a`) und **danach** `keymap(baseKeymap)` (Zeile 108). `baseKeymap`s
  `"Mod-a": selectAll` ist damit der einzige Grund, warum Strg+A/Cmd+A funktioniert.
- **Kein gestuftes Tabellenverhalten.** `prosemirror-tables` bindet kein `Mod-a`, überschreibt
  `selectAll` nicht. `columnResizing()`/`tableEditing()` (`WordEditor.tsx` Zeilen
  109–110) binden nur Zellnavigations-/Löschtasten. „Sofort ganzes Dokument" ist durch
  Abwesenheit jeder Gegen-Bindung **bestätigt**.
- **Kein `contextmenu`-`preventDefault`-Handler.** `grep -rn "contextmenu" src/` liefert
  **genau einen** Treffer — einen **Kommentar** in `WordEditor.tsx` (Zeilen 117–121), der die
  bewusste Abwesenheit eines eigenen Kontextmenüs/`preventDefault` dokumentiert (durch die
  Ausschneiden-Umsetzung ergänzt). Kein tatsächlicher Handler. Die Vorfassung schrieb „keinen
  Treffer" — substanziell weiterhin korrekt (natives Kontextmenü bleibt erreichbar), aber der
  Grep-Befund ist jetzt „ein dokumentierender Kommentar", nicht „nichts".
- **Kein eigenes `::selection`-Styling.** `src/index.css` (**88 Zeilen**, vollständig gelesen und
  per `wc -l` nachgezählt — die Vorfassung nannte 72) enthält keine `::selection`-Regel;
  `.ProseMirror { color: #111827 }` steht unverändert auf Zeile 26.
- **Selection-Sync-Regressionstest vorhanden — mit inzwischen VIER Tests, nicht drei.**
  `tests/e2e/selection-regression.spec.ts` enthält:
  1. `'select-all, bold, click to reposition, Enter, and type — both paragraphs must survive'`
  2. `'same regression inside a table cell (click between cells after formatting)'`
  3. `'repeated select-all + bold + click cycles stay stable (stress check)'`
  4. `'select-all, bold, copy, click to reposition, type — both paragraphs must survive'`
     — **ein Kopieren-Variantentest**, hinzugekommen mit der Kopieren-Umsetzung, mit Verweis
     auf `kopieren-req.md` Abschnitt 3, Testfall 1. **Jede** Stelle der Vorfassung, die von
     „den drei bestehenden Tests" sprach, ist auf **vier** zu korrigieren (Abschnitt 1).

**Zusätzliche, weiterhin gültige Bibliotheks-Funde** (unabhängig nachvollzogen, unverändert
korrekt gegenüber der Vorfassung):

1. **`AllSelection` überschreibt nur `replace`/`toJSON`/`map`/`eq`/`getBookmark`**
   (`prosemirror-state`) — `ranges`/`from`/`to`/`$from`/`$to`/`empty`/`content()` sind die
   generischen Basisklassen-Implementierungen. Jeder Fix, der über
   `state.selection.ranges`/`from`/`to` statt allein über `$from` geht, arbeitet automatisch
   auch für `AllSelection` korrekt (relevant für Frage 3).
2. **Undo-Neutralität strukturell erzwungen.** `prosemirror-history`, `applyTransaction`:
   `if (tr.steps.length == 0) { return history; }`. `selectAll`s Transaktion ist reine
   Selektion → **null** `Step`s → wird verworfen, bevor Undo-Gruppierung überhaupt greift.
   Beweist Grenzfall 8 strukturell.
3. **`AllSelection.replace` garantiert ein gültiges Restdokument.** `tr.delete(0, size)` +
   Schema `doc: { content: 'block+' }` (`schema.ts:14`) → ProseMirrors Fit-Logik ergänzt beim
   Löschen des Gesamtinhalts automatisch einen leeren Absatz. Trägt Grenzfall 1/6.
4. **Editierfläche unabhängig vom Theme hell.** `pageLayout.ts::pageBackgroundStyle()` malt
   `linear-gradient(to bottom, white 0, white ${PAGE_CONTENT_HEIGHT_PX}px, transparent …)` — die
   „Seiten"-Bänder sind **fest weiß**, nur die „Lücken"-Bänder sind transparent und zeigen die
   Chrome-Farbe (`bg-neutral-200 dark:bg-neutral-950`, `WordEditor.tsx:163`). Zusammen mit der
   festen Textfarbe `#111827` reagiert die eigentliche Editierfläche **nicht** auf Dark Mode.
   Das Risiko „unlesbarer Selektionshintergrund im Dark Mode" ist gering — ersetzt aber nicht
   den in Abschnitt 6, Testfall 14 der Anforderung geforderten visuellen Check.
5. **Kein Standard-ProseMirror-CSS eingebunden** (`prosemirror-view/style/*`,
   `prosemirror-tables/style/*` werden nirgends importiert). `.ProseMirror-selectednode` hat
   damit keine visuelle Wirkung. **Für „Alles auswählen" kein Blocker** (eine `AllSelection`
   bettet kein Bild als eigene `NodeSelection` ein → das eingeschlossene Bild bekommt nur die
   native Range-Hervorhebung). Betrifft nur **Einzelklick-Bildauswahl** → gehört
   `bild-einfuegen`/`bild-groesse-aendern` (Abschnitt 15).
6. **Cross-Format-Export-Blocker besteht fort.** `DocumentWorkspace.tsx::handleExport`
   (**Zeilen 68–95** — die Vorfassung nannte 17–29; die Datei ist seither um Re-Entrancy-Guard,
   Export-Fehlerbehandlung und Test-Hooks gewachsen) ruft weiterhin nur
   `module.exportFile(snapshot.content, snapshot.fileName)` im **Ursprungsformat** auf. Kein
   „Exportieren als …". Blockiert die Cross-Format-Testfälle 6/7/8 aus `alles-auswaehlen-req.md`
   Abschnitt 4.2 — **derselbe** Blocker, den Kopieren/Ausschneiden bereits gemeldet haben
   (Abschnitt 5.3).

---

## 1. Was sich seit der letzten Planfassung real geändert hat (die kritische Korrektur)

Diese Tabelle ist der Kern der „kritisch prüfen und verbessern"-Überarbeitung. Jede Zeile ist
eine falsch gewordene Aussage der Vorfassung samt verifizierter Realität. Wer nach der Vorfassung
arbeitet, würde ohne diese Korrekturen doppelte Arbeit leisten oder falsche Voraussetzungen
annehmen.

| # | Aussage der Vorfassung | Verifizierte Realität heute | Konsequenz |
|---|---|---|---|
| A | „`selection-regression.spec.ts`: **drei** bestehende Tests" (durchgängig) | **Vier** Tests; der vierte ist bereits ein Kopieren-Variantentest (`…, bold, copy, …`) | „Alles auswählen" ergänzt **keinen** eigenen Kopieren-Regressionstest hier — der existiert. Zählung überall auf 4 korrigiert (Abschnitt 6.3). |
| B | Ergänze `selection-regression.spec.ts` um einen **Ausschneiden**-Regressionstest (Strg+A → Strg+X → Klick → Enter → tippen) | `tests/e2e/cut.spec.ts` **Testfall 5 (PFLICHT)** ist exakt dieser Test: „Tippen → Strg+A → Strg+X → Klick zur Neupositionierung → Enter → weiter tippen bleibt korrekt" | **Nicht duplizieren.** Referenzieren statt neu schreiben (Abschnitt 3). |
| C | „weder `kopieren-code.md` noch `ausschneiden-code.md` sind umgesetzt" | **Beide umgesetzt:** `commands.ts` hat `cutSelection`/`canCut`; `WordEditor.tsx` bindet `Shift-Delete: cutSelection`; E2E: `cut.spec.ts`, `clipboard.spec.ts`, `clipboard-roundtrip.spec.ts`; Unit: `commands.test.ts` | Die Test-Lücke ist **viel kleiner** als angenommen; große Teile der Select-All-Oberfläche sind bereits mitgetestet (Abschnitt 3). |
| D | `playwright.config.ts` hat **drei** Projekte; ein `Desktop Safari`-Projekt „existiert noch nicht" | **Fünf** Projekte: `Desktop Chrome`, `Mobile`, `Tablet`, **`Desktop Safari (Clipboard)`** und **`Desktop Firefox (Clipboard)`** (beide `testMatch: /clipboard.*\.spec\.ts/`). Chrome+Mobile tragen zusätzlich `permissions: ['clipboard-read','clipboard-write']` | Die von `alles-auswaehlen-req.md` Frage 4 vorausgesetzte Bedingung („sobald ein Desktop-Safari-Projekt existiert …") ist **erfüllt**. Cmd+A auf Desktop-WebKit ist jetzt mit einer **Ein-Zeilen-`testMatch`-Änderung** testbar (Abschnitt 2/10). |
| E | Das neue Unit-File wäre „die erste Unit-Test-Datei, die `EditorState.create` direkt aufbaut" | `commands.test.ts` baut `EditorState.create({ doc, schema: wordSchema })` bereits direkt auf und testet `AllSelection` bereits (Zeilen 10, 33–37) | Neues Unit-File folgt dem **bestehenden** Muster; „erstmalig"-Formulierung gestrichen (Abschnitt 6.4). |
| F | `src/index.css` „72 Zeilen"; `grep contextmenu` „keinen Treffer"; `handleExport` „Zeilen 17–29" | `index.css` **88 Zeilen** (`wc -l`, erneut nachgezählt — nicht 89); `contextmenu`-Grep trifft **einen Kommentar** in `WordEditor.tsx`; `handleExport` **Zeilen 68–95** (exakt bestätigt) | Reine Faktenkorrektur; die inhaltlichen Schlüsse (kein `::selection`, kein Handler, kein Cross-Format-Export) bleiben gültig. |
| G | Der `pageerror`/Konsolenfehler-Helper werde „erstmals" in `ausschneiden-code.md` eingeführt | Helper `watchForConsoleErrors(page)` existiert bereits **mehrfach dupliziert** (u. a. `cut.spec.ts`, `clipboard.spec.ts`, `clipboard-roundtrip.spec.ts`, `export-error-handling.spec.ts`) — und zusätzlich verifiziert: `docxCard`/`odtCard` sind **ebenfalls** dreifach dupliziert (`cut.spec.ts`, `clipboard.spec.ts`, `clipboard-roundtrip.spec.ts`) statt aus der bereits existierenden `tests/e2e/fixtures.ts` (die genau diese Helper exportiert und von `complex-import-fidelity.spec.ts` bereits genutzt wird) importiert zu werden | `select-all.spec.ts`/`select-all-roundtrip.spec.ts` übernehmen das etablierte **lokale** Duplikations-Muster (nicht `fixtures.ts`, da `cut.spec.ts`/`clipboard*.spec.ts` bewusst ohne dessen Test-Wrapper auskommen); Zentralisierung (`watchForConsoleErrors` **und** `docxCard`/`odtCard` in `fixtures.ts` verschieben) bleibt eine sinnvolle, aber ticketübergreifende Aufräumempfehlung (Abschnitt 6.1). |
| H | Kopfzeile der Vorfassung: „Code-Stand geprüft … (kein Git-Repo, Dateistand = Arbeitskopie)" | `E:\docs` **ist** ein Git-Repository (`git status`/`git log` liefern reale Commit-Historie, u. a. `d65cde0 Implement Kopieren …`, `175d86d Grant explicit clipboard …`, `9f8fa03 Implement Ausschneiden …`) | Reine Faktenkorrektur ohne inhaltliche Konsequenz für diesen Plan — aber relevant für Abschnitt 12 (Commits nach jedem Schritt, siehe Projektbibel-Konvention). |
| I | Abschnitt 10 (Vorfassung) empfahl `testMatch: /(clipboard\|select-all).*\.spec\.ts/` | **Diese Regex ist fehlerhaft**, geprüft per Wortprobe: `select-all` gefolgt von `.*` (das auch `-roundtrip` matcht) gefolgt von `\.spec\.ts` matcht **auch** `select-all-roundtrip.spec.ts` — genau die Datei, die Abschnitt 10 selbst „bewusst nicht mit aufnehmen" wollte. Der unabhängig gegengeprüfte QA-Plan (`alles-auswaehlen-qa.md` §6.5, Korrektur K9) fand denselben Fehler und verifizierte die korrekte Form | **Korrigiert** auf `testMatch: /(clipboard.*\|select-all)\.spec\.ts/` (Abschnitt 2/10 unten) — erhält `clipboard.spec.ts` **und** `clipboard-roundtrip.spec.ts`, ergänzt nur den Tastatur-Kern `select-all.spec.ts`, schließt `select-all-roundtrip.spec.ts` aus. |
| J | Abschnitt 6.2, §4.2 Testfall 5 (Tabelle) unterstellte stillschweigend, eine per Toolbar gebaute Tabelle tauge auch für den `colspan`/`rowspan`-Erhalt-Nachweis | `Toolbar.tsx` bietet **nur** `insertTable(2, 2)` (`Toolbar.tsx:277–289`, `commands.ts:92–102`) — einen **plain**, ungemergten Raster; es gibt **keinen** Merge-Zellen-Bedienelement in der UI. Eine `colspan`/`rowspan`-tragende Tabelle ist über die UI **nicht** herstellbar. Bereits vorhandene Fixtures mit gemergten Zellen: `tests/e2e/fixtures/richDocument.ts` (`w:gridSpan`/`table:number-columns-spanned`), `tests/e2e/fixtures/fullCoverageDocument.ts` — exakt das Muster, das `docx.spec.ts`s eigener Merged-Table-Rundtrip-Test bereits per Fixture-Upload (nicht UI-Bau) verwendet | **Korrigiert** in Abschnitt 6.2 unten: `colspan`/`rowspan`-Erhalt wird über (a) einen neuen Unit-Rundreisetest mit direkt gebautem doc-JSON (analog `cut-roundtrip.test.ts` Testfall 7) und (b) einen E2E-Test mit **Fixture-Upload** der bestehenden gemergten Fixtures bewiesen; die per Toolbar gebaute 2×2-Tabelle bleibt nur für den einfacheren Fall „Zeilen-/Spaltenzahl unverändert, Formatierung in unverbundenen Zellen" zuständig. |

**Das Kernergebnis bleibt:** Kein neuer Anwendungscode für „Alles auswählen". Die einzige
substanzielle Neubewertung ist, **wie wenig** noch zu tun ist und dass ein Teil davon eine
`playwright.config.ts`-Änderung ist, die die Vorfassung für unmöglich hielt.

---

## 2. Entscheidungen zu den Fragen (`alles-auswaehlen-req.md` Abschnitt 8)

Fragen 1–3 sind gegenüber der Vorfassung unverändert korrekt; Frage 4 wird durch Fund D neu
und **stärker** beantwortet.

### Frage 1: Eigener Toolbar-Button? **Nein.**
Unverändert: „Alles auswählen" hat laut `alles-auswaehlen-req.md` Abschnitt 2.1 keinen
deaktivierten Zustand → ein Button wäre immer aktiv, böte keinen Zustand/kein Feedback
gegenüber der universellen Tastenkombination. Konsistent mit „Kopieren" (kein Button),
abweichend von „Ausschneiden" (Button wegen deaktiviertem, destruktivem Charakter — im Code
sichtbar als `disabled={!canCut(view.state)}` in `Toolbar.tsx`, `ScissorsIcon`). **Keine
Änderung an `Toolbar.tsx`.**

### Frage 2: Tabellenverhalten? **(a) — sofort ganzes Dokument.**
Unverändert: entspricht dem ProseMirror-Standard, erfordert keinen Code, ist mit Grenzfall 2
(Idempotenz) vereinbar; ein gestuftes Zelle→Tabelle→Dokument-Verhalten bräuchte ein eigenes,
zustandsbehaftetes Plugin und widerspräche Grenzfall 2. Strukturell sicher via Fund 3.

### Frage 3: Toolbar-Zustandsanzeige bei uneinheitlicher Formatierung? **Nicht dieses Ticket.**
Unverändert: Ursache ist `Toolbar.tsx` Zeile 69 (`markType.isInSet(view.state.selection.$from.marks())`
in `MarkButton`) — sie wertet nur `$from` aus. Das ist ein querschnittliches Thema von
`fett-code.md`/`kursiv-code.md`/`durchgestrichen-code.md`/`unterstrichen-einfach-code.md`.
Verifiziert, dass **keiner** dieser vier bereits umgesetzt ist: `commands.ts` enthält keine
`isMarkActive`-Funktion, `Toolbar.tsx` ruft `toggleMark` weiterhin direkt auf. „Alles auswählen"
liefert nur einen `AllSelection`-Regressionstest, sobald einer der vier landet (Fund 1 sagt
voraus, dass jede `ranges`/`from`/`to`-basierte Korrektur automatisch auch für `AllSelection`
greift; Pflicht-Test bestätigt das). Koordinationsrisiko der vier Tickets siehe Abschnitt 5.2.

### Frage 4: Safari/WebKit bzw. macOS (Cmd+A) in der Testmatrix? **Jetzt konkret umsetzbar.**
Die Vorfassung stufte dies als „offenen Punkt, bis ein Desktop-Safari-Projekt existiert" ein.
**Dieses Projekt existiert jetzt** (`playwright.config.ts` Zeilen 43–46):
```ts
{
  name: 'Desktop Safari (Clipboard)',
  testMatch: /clipboard.*\.spec\.ts/,
  use: { ...devices['Desktop Safari'] },
},
```
sowie analog `Desktop Firefox (Clipboard)` (Zeilen 50–53). Beide sind auf `clipboard*.spec.ts`
gescoped und würden `select-all*.spec.ts` **nicht** automatisch erfassen. `alles-auswaehlen-req.md`
Abschnitt 8, Frage 4 hat exakt diesen Fall vorweggenommen: „dessen `testMatch` ist dann um
`select-all*.spec.ts` zu erweitern, statt ein weiteres WebKit-Projekt anzulegen." **Empfohlene
konkrete Änderung** (Abschnitt 10, **korrigiert** — Korrektur I in Abschnitt 1): die
`testMatch`-Regex **beider** Clipboard-Projekte auf `/(clipboard.*|select-all)\.spec\.ts/`
erweitern (**nicht** `/(clipboard|select-all).*\.spec\.ts/` — diese naheliegendere Form wurde
zunächst erwogen, matcht aber per Wortprobe **auch** `select-all-roundtrip.spec.ts`, weil `.*`
nach der Gruppe beliebigen Text bis `.spec.ts` zulässt; die korrigierte Form lässt `.*` nur
**innerhalb** der `clipboard`-Alternative zu, sodass `select-all` unmittelbar von `.spec.ts`
gefolgt sein muss). Dann läuft der Tastatur-Kern von
`select-all.spec.ts` (Strg/Cmd+A, Idempotenz, Tippen-ersetzt-alles) zusätzlich auf echtem
Desktop-WebKit **und** Desktop-Firefox — das schließt „echtes macOS/Cmd+A" so weit wie in dieser
Umgebung möglich (Playwright-WebKit-Desktop; ein physischer Apple-Rechner bleibt außerhalb des
CI-Scopes, aber der WebKit-`selectAll`-Codepfad ist dann Desktop-verifiziert, nicht nur
Touch-emuliert über `Tablet`/iPad Mini).

Hinweis: `Tablet` (iPad Mini) ist laut
`require('playwright-core').devices['iPad Mini'].defaultBrowserType` → `webkit`; `Pixel 7` und
`Desktop Chrome` → `chromium`. Die neuen Specs laufen ohne Sonderkonfiguration bereits auf
`Desktop Chrome`/`Mobile`/`Tablet`; die `testMatch`-Erweiterung fügt nur die beiden **Desktop**-
Nicht-Chromium-Engines hinzu.

---

## 3. Bereits vorhandene Testabdeckung, die „Alles auswählen" mitprüft

Der wichtigste inhaltliche Zugewinn dieser Überarbeitung: Seit Kopieren/Ausschneiden umgesetzt
sind, ist ein erheblicher Teil der in `alles-auswaehlen-req.md` geforderten Verifikation bereits
vorhanden — als Nebenprodukt. **Vor** dem Schreiben neuer Tests ist diese Abdeckung
gegenzuprüfen, um Duplikate zu vermeiden.

| Anforderung (`alles-auswaehlen-req.md`) | Bereits abgedeckt durch | Verbleibende Select-All-eigene Lücke |
|---|---|---|
| §2.6 / Grenzfall 7: Strg+A → **Ausschneiden** (statt Formatierung) → Klick → Enter → tippen | `cut.spec.ts` **Testfall 5 (PFLICHT)** | **Keine** — nicht duplizieren |
| §2.6 / Grenzfall 7: Strg+A → **Kopieren** → Klick → Enter → tippen | `selection-regression.spec.ts` **Test 4** (`…, bold, copy, …`) | Marginal: „Kopieren **ohne** vorheriges Fett" fehlt literal (Abschnitt 6.3) |
| Grenzfall 6 / §4.2 Testfall 3: Strg+A → Entf/Ausschneiden → valider leerer Zustand + Export/Reimport | `cut.spec.ts` Testfall 4 (leert in validen Zustand) **und** `cut.spec.ts` „Rundreise 10" (Strg+A → Strg+X → Export → Reimport = gültige leere Datei) | Nur die **Entf-Taste** (statt Strg+X) als Auslöser ist select-all-eigen |
| Grenzfall 10: Fokus im Textfarbe-`<input type=color>`, systemweites Strg+X/A verändert Editor nicht | `cut.spec.ts` „Grenzfall 14" (Farbwähler-Fokus, Strg+X) | Analogon mit **Strg+A** statt Strg+X ist select-all-eigen (Abschnitt 6.1, Testfall 9) |
| Grenzfall 8: Strg+X → Undo stellt her (Undo-Grundverhalten) | `cut.spec.ts` Testfall 9, „Zusatz (Req §2.5)" (separater Undo-Schritt) | **Undo-Neutralität von Strg+A selbst** (kein eigener Undo-Eintrag) ist select-all-eigen |
| §4.2 Testfall 1/2: Strg+A → **Formatierung (Fett)** über alles → Export → jeder Lauf trägt Formatierung | — (Ausschneiden testet nur Löschen-Rundreisen, nicht Formatieren-über-alles) | **Vollständig offen** — echte Select-All-eigene Rundreise (Abschnitt 6.2) |
| §1/§6: „Strg+A markiert wirklich **alles**" als eigenständige Behauptung | — (überall nur als Trigger genutzt, nie selbst assertiert) | **Vollständig offen** — Kern dieses Tickets (Abschnitt 6.1) |

Muster, die dabei wiederverwendet werden (statt neu erfunden): `watchForConsoleErrors(page)`,
der `settle(page)`/`waitForTimeout(50)`-Umgang mit dem asynchronen `selectionchange`-Rennen
(`selection-regression.spec.ts` Zeilen 27–34, `cut.spec.ts`, `clipboard.spec.ts`), der
`odtCard`/`docxCard`-Locator und das JSZip-Auslesen von `document.xml`/`content.xml` in den
`Rundreise`-Tests von `cut.spec.ts` (Zeilen 473–630).

---

## 4. Verifizierte Anforderungs-Codebelege (Bibliotheks-Ebene)

Unverändert gegenüber der Vorfassung (weiterhin korrekt). Belegt, dass keine Anforderung neuen
Anwendungscode braucht:

| Anforderung | Codebeleg | Ergebnis |
|---|---|---|
| 2.1 Immer auslösbar, kein deaktivierter Zustand | `selectAll` prüft nur `dispatch` vorhanden | Bereits erfüllt, nur Test |
| 2.2 Markiert den ganzen Baum | `AllSelection`-Konstruktor `super(doc.resolve(0), doc.resolve(doc.content.size))` deckt jede Position ab | Bereits erfüllt, nur Test |
| 2.4 Pfeiltasten kollabieren an den Rand | Standard-`Selection`-Unterklasse, ProseMirror-Standardcursorlogik | Bereits erfüllt, nur Test |
| Grenzfall 1/6 (leer, Entf danach) | `AllSelection.replace` + `doc: 'block+'` (Fund 3) | Bereits erfüllt, nur Test |
| Grenzfall 2 (Idempotenz) | `AllSelection.eq(other) = other instanceof AllSelection` | Bereits erfüllt, nur Test |
| Grenzfall 3 (Tabellenzelle) | Frage 2 = (a) | Bereits erfüllt (als Soll bestätigt), nur Test |
| Grenzfall 4 (Bild + Ausrichtung danach) | `setAlign` (`commands.ts:13–27`) iteriert `nodesBetween`, wendet nur auf `{paragraph, heading}` an, überspringt `image` wirkungslos | Bereits erfüllt, nur Test |
| Grenzfall 8 (Undo-Neutralität) | Fund 2 (`tr.steps.length == 0`) | Strukturell bewiesen, nur Test |
| Grenzfall 9 (IME) | View verarbeitet Composition intern; `Mod-a` als Keydown wird vom IME i. d. R. abgefangen | Browserabhängig — nur per Test verifizierbar |
| Grenzfall 10 (Fokus außerhalb Editor) | `prosemirror-keymap` registriert `handleKeyDown` nur für `view.dom`; Toolbar-`<input type=color>` liegt außerhalb | Strukturell erfüllt, nur Test |
| Grenzfall 11 (Performance) | `AllSelection`-Konstruktion O(1) (zwei `resolve`) | Bereits erfüllt, nur Test (Zeitmessung) |
| Grenzfall 16 (kein globaler `contextmenu`-Handler) | Abschnitt 0 (nur ein Kommentar) | Bereits erfüllt, Regressionstest hält es fest |

---

## 5. Was tatsächlich fehlt bzw. wem es gehört

### 5.1 Kernlücke dieses Tickets: „Strg+A markiert wirklich alles" + Formatier-Rundreise
Zwei Dinge sind **select-all-eigen** und **nirgends** abgedeckt (siehe Abschnitt 3, letzte zwei
Zeilen):
1. Ein eigenständiger E2E-Test, der behauptet und beweist „Strg+A markiert den gesamten Inhalt"
   (unabhängig vom Selection-Sync-Bug, unabhängig von Ausschneiden).
2. Die Formatier-Rundreise „Strg+A → Fett über alles → Export → jeder `<w:r>`/jeder Absatz trägt
   die Formatierung" für DOCX und ODT (Ausschneiden testet nur Lösch-Rundreisen).
Alles Übrige aus `alles-auswaehlen-req.md` ist entweder Bibliotheksgarantie (Abschnitt 4), schon
abgedeckt (Abschnitt 3) oder gehört einem anderen Ticket (5.2/5.3).

### 5.2 Frage-3-Koordinationsrisiko (vier Tickets, dieselbe Zeile)
Unverändert relevant: `fett-`/`kursiv-`/`durchgestrichen-`/`unterstrichen-einfach-code.md`
planen je eine eigene Korrektur derselben `Toolbar.tsx`-Zeile 69 und potenziell derselben neuen
`commands.ts`-Funktion (`isMarkActive`/`toggleInlineMark`), mit unterschiedlichem Umfang
(`ranges` vs. `from`/`to`) und Toggle-Ziel. Keiner ist umgesetzt (verifiziert). „Alles auswählen"
dupliziert das **nicht**; Empfehlung ans Backlog: `kursiv-code.md` als kanonische Quelle
bestimmen (behandelt als einziges `ranges` **und** das Toggle-Verhalten selbst), die anderen drei
referenzieren. Nicht Teil dieses Plans.

### 5.3 Geerbter Cross-Format-Export-Blocker
`DocumentWorkspace.tsx::handleExport` exportiert nur im Ursprungsformat (Fund 6). Betrifft
`alles-auswaehlen-req.md` §4.2 Testfälle 6/7/8. **Precedent aus `cut.spec.ts` (Zeile 585):** dort
wurde der Cross-Format-Fall als „Rundreise 4/5 (Cross-Format, **angepasst**)" auf **denselben
Format**-Export reduziert und real getestet, statt komplett zu überspringen. Dieser Plan bietet
für §4.2 #6–#8 **beide** dokumentierten Optionen an (Abschnitt 6.2): entweder `test.fixme(...)`
mit Blocker-Verweis (wie von der Anforderung §4.3 vorgeschrieben) **oder** die
`cut.spec.ts`-Anpassung (Same-Format-Ersatz + Unit-Test der reinen Konvertierung). Empfohlen:
`test.fixme(...)` für die literale Cross-Format-UI-Rundreise **plus** je ein Same-Format-Test,
damit die Konvertierungslogik nicht ungetestet bleibt — deckungsgleich mit dem, was
`cut.spec.ts` bereits vorlebt.

### 5.4 `.ProseMirror-selectednode` betrifft „Alles auswählen" nicht
Fund 5. Kein Fix hier; als Weitermeldung an ein Bild-Ticket in Abschnitt 15.

---

## 6. Datei-für-Datei-Umsetzungsplan

### 6.0 Übersicht

| Datei | Art | Änderung |
|---|---|---|
| `tests/e2e/select-all.spec.ts` | **neu** | Haupt-E2E-Suite: „Strg+A markiert alles" + select-all-eigene Grenzfälle (6.1) |
| `tests/e2e/select-all-roundtrip.spec.ts` | **neu** | Formatier-Rundreise DOCX/ODT über echten Export/Reimport im Browser (6.2) |
| `src/formats/docx/__tests__/select-all-roundtrip.test.ts` | **neu** | Vitest-Rundreise (Reader+Writer, kein Browser): Formatierung über **alle** Blöcke inkl. `colspan`/`rowspan`, nach dem Muster von `cut-roundtrip.test.ts` (6.2a) |
| `src/formats/odt/__tests__/select-all-roundtrip.test.ts` | **neu** | Spiegelbildlich zu obigem, ODT-Seite (6.2a) |
| `src/formats/shared/editor/__tests__/select-all.test.ts` | **neu** | Vitest-Unit-Belege der Bibliotheksgarantien (6.4) |
| `playwright.config.ts` | **geändert (empfohlen)** | `testMatch` der beiden Clipboard-Projekte um `select-all` erweitern (Frage 4 / Abschnitt 10) |
| `tests/e2e/selection-regression.spec.ts` | **optional, minimal** | höchstens **ein** Test (Kopieren ohne vorheriges Fett), nur falls literale §2.6-Deckung gewünscht (6.3) |
| `src/formats/shared/editor/WordEditor.tsx` | **optional** | reiner Klarstellungskommentar über `keymap(baseKeymap)` (6.5) |
| `specs/alles-auswaehlen-req.md` | **geändert** | Abschnitt 8 um die Entscheidungen aus Abschnitt 2 ergänzen |

**Explizit NICHT geändert** (und warum): `commands.ts` (keine Selektionslogik nötig, Abschnitt 4;
`isMarkActive` gehört den vier Formatierungstickets, 5.2), `Toolbar.tsx` (Frage 1 — insbesondere
**kein** Merge-Zellen-Bedienelement wird ergänzt, obwohl dessen Fehlen den `colspan`/`rowspan`-Test
in 6.2a auf Fixture-Upload verweist; das ist ein Scope-Grenze-Hinweis, kein Auftrag, ein
Merge-Feature nachzurüsten), `schema.ts`
(kein neuer Node/Mark), `src/index.css` (kein belegter Kontrastfehler — Fund 4; ein Eingriff
ohne Befund wäre Scope-Creep; ein realer Fund im Visualtest 6.2/Testfall 14 wäre ein **neuer**,
separat zu behandelnder Punkt), `src/app/DocumentWorkspace.tsx` (fremder Blocker, 5.3),
`src/formats/docx/writer.ts`/`reader.ts`, `src/formats/odt/writer.ts`/`reader.ts` selbst (Abschnitt 9
— nur ihre **Tests** werden ergänzt, nicht ihre Implementierung, da sie bereits generisch über
`body.content` iterieren und keinen Sonderfall für „erster/letzter Block" oder `AllSelection`
brauchen).

### 6.1 `tests/e2e/select-all.spec.ts` (neu)

Nach dem Muster von `selection-regression.spec.ts`/`cut.spec.ts` (echte Browser-Interaktion,
`.ProseMirror`-Locator, `odtCard`-Helper, `watchForConsoleErrors`, `settle`). Testfälle
(Doppelungen mit Abschnitt 3 bewusst vermieden):

1. **Basisverhalten (Req §6.1):** Mehrere Absätze tippen → `ControlOrMeta+a` → `Delete` →
   `.ProseMirror p` Anzahl = 1 und leer (indirekter Nachweis „wirklich alles markiert").
2. **Leeres Dokument (Grenzfall 1/§6.2):** Frisches Dokument → `ControlOrMeta+a` → kein
   `pageerror` (via `watchForConsoleErrors`), danach weiterhin tippbar.
3. **Idempotenz (Grenzfall 2/§6.3):** Zweimal `ControlOrMeta+a` → `Delete` → weiterhin
   vollständige Löschung, keine Exception. (Nicht in `cut.spec.ts` enthalten — genuin neu.)
4. **Tabellenzelle (Grenzfall 3/§6.4, Frage 2 = (a)):** Tabelle einfügen, Text in zwei Zellen,
   Cursor in eine Zelle, `ControlOrMeta+a` → `Delete` → `.ProseMirror table` = 0,
   `.ProseMirror p` = 1. Bestätigt „sofort ganzes Dokument". (Abgrenzung: `cut.spec.ts`
   Testfall 6 testet das **Gegenteil** — Strg+X **ohne** vorheriges Strg+A leert nur die Zelle;
   dieser Test prüft explizit die Strg+A-Eskalation auf das ganze Dokument.)
5. **Bild in der Selektion (Grenzfall 4/§6.5):** Bild über den `🖼 Bild`-Button einfügen (kleine
   Data-URL-PNG wie in `docx.spec.ts`), Text davor/danach, `ControlOrMeta+a` → Ausrichtung
   „zentriert" per Toolbar → kein `pageerror`, Text zentriert, `.ProseMirror img` unverändert.
6. **Tippen ersetzt alles (Grenzfall 5/§6.6):** Text → `ControlOrMeta+a` → neuen Text tippen →
   nur neuer Text, genau ein Absatz.
7. **Undo-Neutralität (Grenzfall 8/§6.7):** „A" tippen, Enter, „B" tippen → `ControlOrMeta+a`
   (reine Selektion) → `ControlOrMeta+z` → der zuletzt getippte Block wird rückgängig gemacht,
   **nicht** „Auswahl aufheben" als eigener Schritt. (Prüft select-all-**Neutralität** — anders
   als `cut.spec.ts` Testfall 9, das Undo **nach einer Inhaltsänderung** prüft.)
8. **IME-Komposition (Grenzfall 9):** `CompositionEvent('compositionstart')` dispatchen, dann
   `ControlOrMeta+a`, sauber mit `compositionend` beenden → kein `pageerror`. Dokumentierter
   Hinweis: nähert reale IME nur an.
9. **Fokus außerhalb Editor (Grenzfall 10):** `page.getByLabel('Textfarbe').focus()` →
   `ControlOrMeta+a` → `.ProseMirror`-Inhalt unverändert. (Strg+A-Analogon zu `cut.spec.ts`
   Grenzfall 14, das dieselbe Idee mit Strg+X prüft.)
10. **Performance/langes Dokument (Grenzfall 11/§6.13):** ~300 Absätze programmatisch erzeugen,
    `ControlOrMeta+a` mit `performance.now()`-Messung < Schwellenwert (z. B. 500 ms), danach
    `Delete` → `.ProseMirror p` = 1 (bis zum Dokumentende erfasst).
11. **Kontextmenü erreichbar (Req-Testfall 3/Grenzfall 16):** `dispatchEvent`-`contextmenu` →
    `expect(ev.defaultPrevented).toBe(false)` (Muster wie in `kopieren`/`cut`).
12. **Cursor-Kollaps (Abschnitt 2.4):** `ControlOrMeta+a`, `ArrowLeft` → Cursor am Anfang;
    separat `ArrowRight` → Cursor am Ende (jeweils über nächsten getippten Buchstaben geprüft).
13. **Visueller Kontrast-Check (Req-Testfall 14):** nach `ControlOrMeta+a` Screenshot in
    `emulateMedia({ colorScheme: 'light' })` und `'dark'`,
    `expect(editor).toHaveScreenshot('select-all-<scheme>.png')`. Erwartung (Fund 4): beide
    Screenshots nahezu identisch (Fläche reagiert nicht auf Dark Mode) — Baseline bewusst prüfen
    und committen, nicht blind akzeptieren.

Matrix (Req-Testfall 12): Testfälle 1–3 laufen ohne Sonderbehandlung auf `Desktop Chrome`/
`Mobile`/`Tablet`; nach der `testMatch`-Erweiterung (Abschnitt 10) zusätzlich auf `Desktop
Safari`/`Desktop Firefox`. Kommentar zur Mobile-Popup-Einschränkung wie in `cut.spec.ts`: das
native OS-Auswahlpopup ist Browser-/OS-Chrome und mit Playwright nicht anklickbar; der Test
verifiziert den zugrunde liegenden Mechanismus, nicht das Popup selbst.

### 6.2 `tests/e2e/select-all-roundtrip.spec.ts` (neu)

Nach dem `Rundreise`-Muster in `cut.spec.ts` (Zeilen 473–630: „Exportieren" →
`waitForEvent('download')` → JSZip → `document.xml`/`content.xml` prüfen). Deckt
`alles-auswaehlen-req.md` §4.2 — die **Formatier**-Rundreisen, die Ausschneiden nicht abdeckt:

1. **§4.2 Testfall 1 (DOCX):** neues Dokument → mehrere Absätze → `ControlOrMeta+a` → „Fett" →
   Export → `document.xml` → **jeder** `<w:r>` trägt `<w:b/>`, **erster und letzter** Absatz
   explizit geprüft (nicht nur einer).
2. **§4.2 Testfall 2 (ODT):** dieselbe Sequenz → `content.xml` → `fo:font-weight="bold"` bzw.
   das entsprechende Auto-Style aus `odt/styleRegistry.ts`.
3. **§4.2 Testfall 3 (Entf, beide Formate):** `ControlOrMeta+a` → **`Delete`** (Entf-Taste, nicht
   Strg+X — das ist die select-all-eigene Variante gegenüber `cut.spec.ts` „Rundreise 10") →
   Export DOCX **und** ODT → Reimport → je eine valide Datei mit einem leeren Absatz.
4. **§4.2 Testfall 5 (Tabelle) — zweigeteilt, da per Toolbar keine gemergte Zelle baubar ist
   (Korrektur J, Abschnitt 1):** `Toolbar.tsx` bietet nur `insertTable(2, 2)` — einen **plain**
   2×2-Raster ohne `colspan`/`rowspan` (kein Merge-Bedienelement existiert). Zwei Teiltests statt
   einem:
   - **4a (plain, per UI gebaut):** Tabelle über den Toolbar-Button einfügen, Text in zwei Zellen,
     Cursor in eine Zelle → `ControlOrMeta+a` → „Fett" → Export/Reimport → Zeilen-/Spaltenzahl
     unverändert (2×2), Formatierung in **beiden** Zellen vorhanden. Beweist den Normalfall.
   - **4b (`colspan`/`rowspan`, per Fixture-Upload):** Eine der bereits vorhandenen Fixtures mit
     gemergter Zelle hochladen (`tests/e2e/fixtures/richDocument.ts` bzw.
     `fullCoverageDocument.ts`, DOCX `w:gridSpan="2"` / ODT `table:number-columns-spanned="2"` —
     exakt das Muster, das `docx.spec.ts`s eigener Merged-Table-Rundtrip-Test bereits per
     Fixture-Upload statt UI-Bau verwendet) → `ControlOrMeta+a` → „Fett" → Export/Reimport →
     `colspan`/`rowspan` erhalten, Formatierung **auch innerhalb** der gemergten Zelle vorhanden.
     Der reine `colspan`/`rowspan`-Erhalt (unabhängig von „Fett über alles") ist zusätzlich am
     direkt gebauten doc-JSON durch 6.2a (Unit-Ebene, schneller/deterministischer) abgesichert.
5. **§4.2 Testfall 4 (Kopieren in neues Dokument):** `ControlOrMeta+a` → `ControlOrMeta+c` →
   zweites leeres Dokument öffnen → einfügen → Export/Reimport → Struktur erhalten. Clipboard-
   Rechte sind auf `Desktop Chrome`/`Mobile` bereits **projektweit** gewährt
   (`playwright.config.ts` Zeilen 34–35) — kein per-Test-`grantPermissions` nötig; verlässlich
   nur auf Chromium (wie in `clipboard.spec.ts` dokumentiert).
6. **§4.2 Testfälle 6/7/8 (Cross-Format):** primär `test.fixme(true, 'Blockiert durch fehlende
   Cross-Format-Export-UI, siehe alles-auswaehlen-code.md §5.3 / kopieren-code.md / ausschneiden-
   code.md — derselbe Blocker.')`. Zusätzlich empfohlen (Precedent `cut.spec.ts` „Rundreise 4/5,
   angepasst"): je ein **Same-Format**-Ersatztest (z. B. ODT → Strg+A → Aktion → als ODT
   exportieren), damit die Konvertierung nicht ungetestet bleibt, während die literale
   Cross-Format-UI blockiert ist.
7. **§4.2 Testfall 9 (Regressionskette + Export):** Sequenz aus `selection-regression.spec.ts`
   Test 1 (Strg+A → Fett → Klick → Enter → tippen) **zusätzlich** gefolgt von Export DOCX **und**
   ODT → Reimport → beide Absätze in beiden Formaten vorhanden. Einziger Testfall, der die
   Selection-Sync-Sequenz mit einer echten Datei-Rundreise verkettet.

### 6.2a `src/formats/docx/__tests__/select-all-roundtrip.test.ts` +
`src/formats/odt/__tests__/select-all-roundtrip.test.ts` (neu, Vitest, kein Browser)

**Neu gegenüber der Vorfassung** (Korrektur J): reine Reader/Writer-Rundreisen, die die
**Formatierung-über-alle-Blöcke**-Fälle browserunabhängig und schneller als 6.2 nachweisen —
Ergänzung, kein Ersatz für den echten Browser-Beweis in 6.2. Vorlage ist `cut-roundtrip.test.ts`
(existiert bereits identisch benannt in beiden Formatordnern; `doc()`/`paragraph(text, align,
marks)`/`roundTrip()`-Helper sowie `TINY_PNG` von dort übernehmen, nicht neu erfinden):

| Testfall | Aufbau | Prüfung |
|---|---|---|
| Formatierung über alle Blöcke, erster/letzter explizit (§4.2 #1/#2) | `doc([paragraph('Erster','left',[{type:'strong'}]), heading(1,'Mitte',[{type:'strong'}]), paragraph('Letzter','left',[{type:'strong'}])])` | Nach `roundTrip()`: **jeder** Block trägt `strong`; `content[0]` **und** `content[content.length-1]` explizit per Index geprüft — deckt eine mögliche Off-by-one-Writer-Regel auf, die ein Test, der nur „irgendwo strong" prüft, übersehen würde |
| `colspan`/`rowspan`-Erhalt bei durchgehender Formatierung (§4.2 #5, Korrektur J) | Tabelle mit einer gemergten Zelle (analog `cut-roundtrip.test.ts` Testfall 7 — direkt als doc-JSON gebaut, **nicht** über die UI, da `insertTable(2,2)` keine Merges kennt), **jede** Zelle inkl. der gemergten mit fett formatiertem Text | Zeilen-/Spaltenzahl unverändert; `attrs.colspan`/`attrs.rowspan` (DOCX: `w:gridSpan`) bzw. `table:number-columns-/rows-spanned` (ODT) erhalten; **jede** Zelle trägt die Formatierung |
| Vollständig geleertes Dokument (§4.2 #3) | `doc([paragraph('')])` | `roundTrip()` wirft nicht; genau ein leerer Absatz. *(Deckungsgleich mit `cut-roundtrip.test.ts` Testfall 10 — hier nur knapp referenzieren, nicht neu beweisen.)* |
| Liste, jede Ebene formatiert (Req 2.2 „alle Ebenen") | Verschachtelte `bullet_list` (2 Ebenen), jeder `list_item`-Text fett | Verschachtelungstiefe unverändert, Formatierung auf beiden Ebenen erhalten |
| Bild + Text (§4.2 #4, Kopieren-Ziel) | `doc([paragraph('Vor Bild'), image(TINY_PNG), paragraph('Nach Bild','left',[{type:'strong'}])])` | Bild-Node vorhanden, Reihenfolge unverändert, Text davor/danach inkl. Formatierung erhalten |

Diese beiden Dateien sind der einzige Ort, an dem der `colspan`/`rowspan`-Erhalt nach „Alles
auswählen + Formatierung" ohne die per-UI-Einschränkung aus Korrektur J nachweisbar ist — die
E2E-Testfälle 4b (6.2) beweisen zusätzlich den echten Browser-/Datei-Pfad über eine hochgeladene
Fixture, aber nicht die Formatierungs-Variante mit beliebigem, frei konstruierbarem doc-Baum.

### 6.3 `tests/e2e/selection-regression.spec.ts` (optional, höchstens ein Test)

**Wichtig:** Die Vorfassung wollte hier zwei Tests ergänzen (Ausschneiden- und Kopieren-Variante).
Beide sind faktisch überflüssig geworden:
- **Ausschneiden-Variante:** existiert als `cut.spec.ts` Testfall 5 (PFLICHT). **Nicht anlegen.**
- **Kopieren-Variante:** existiert als Test 4 dieser Datei (`…, bold, copy, …`).

Genuin noch nicht vorhanden ist einzig „Kopieren **ohne** vorheriges Fett" (reines
`ControlOrMeta+a` → `ControlOrMeta+c` → Klick → `End` → `Enter` → tippen; prüft, dass Kopieren die
Selektion **überhaupt nicht** perturbiert, ganz ohne dazwischenliegende Doc-ändernde
Transaktion). Das ist ein **near-duplicate** von Test 4 mit geringem Zusatznutzen. Empfehlung:
nur anlegen, falls literale §2.6-Wortlautdeckung gefordert wird; sonst als „durch Test 4 +
`cut.spec.ts` Testfall 5 abgedeckt" dokumentieren. **Die vier bestehenden Tests bleiben in jedem
Fall unangetastet und grün** (Pflichtbestandteil laut Anforderung §2.6).

### 6.4 `src/formats/shared/editor/__tests__/select-all.test.ts` (neu, Vitest/jsdom)

Folgt dem **bestehenden** Muster aus `commands.test.ts` (`EditorState.create({ doc, schema:
wordSchema })`, `wordSchema.node(...)`-Baumaufbau) — **nicht** „erstmalig". Deckt die
Bibliotheksgarantien aus Abschnitt 4 browserunabhängig ab, ergänzend zur E2E-Ebene:

- `new AllSelection(doc)` über ein Ein-Absatz-Dokument wirft nicht; `selection.empty` ist nur bei
  `doc.content.size === 0` `true`.
- `state.tr.setSelection(new AllSelection(state.doc))` hat `tr.steps.length === 0` und
  `tr.docChanged === false` (direkter Beweis Grenzfall 8/Fund 2).
- Dokument mit drei Absätzen: Löschen über `AllSelection` (bzw. `deleteSelection`-Logik)
  resultiert in genau einem leeren Absatz (Grenzfall 1/6/Fund 3), nie in leerem `doc.content`.
- Nur-Bild-Dokument: `AllSelection` konstruierbar; `setAlign('center')(state, dispatch)` liefert
  `false` **ohne** zu werfen (Grenzfall 4). Ergänzt die bereits vorhandene
  `commands.test.ts`-Prüfung `'is true for an AllSelection'` (dort gegen `canCut`) um die
  Ausrichtungs-Seite.
- `new AllSelection(doc).eq(new AllSelection(doc)) === true` (Idempotenz auf State-Ebene).

### 6.5 `src/formats/shared/editor/WordEditor.tsx` (optional, reiner Kommentar)

Keine Verhaltensänderung. Empfohlen: analog zum bestehenden Erklärkommentar für Mod-c/x/v
(Zeilen 86–92) einen Kommentar **über** `keymap(baseKeymap)` (Zeile 108) ergänzen:
```ts
// "Mod-a" (Alles auswählen) kommt bewusst aus prosemirror-commands' baseKeymap
// (selectAll → AllSelection); keine eigene Bindung hier. Entscheidung/Verifikation:
// specs/alles-auswaehlen-code.md; Tests: tests/e2e/select-all.spec.ts.
keymap(baseKeymap),
```
Verhindert, dass ein:e künftige:r Bearbeiter:in Strg+A für ungetestet/unbeabsichtigt hält.

---

## 7. ProseMirror-Schema/Commands — Detailplan

**Keine Änderung.** Weder `wordSchema` (`schema.ts`) noch `commands.ts` brauchen neue Nodes,
Marks oder Befehle. Ein projekteigener `selectAllCommand`-Wrapper böte keinen Nutzen (kein
zusätzlicher Zustand, keine Fehlerbehandlung nötig — `selectAll` kann strukturell nicht
fehlschlagen) und schüfe nur eine zweite Quelle der Wahrheit neben `baseKeymap`.

Einzige Ausnahme (nur falls Frage 2 später von (a) auf (b) revidiert würde): ein
zustandsbehafteter `stagedSelectAll(): Command` plus eigene `Mod-a`-Bindung **vor**
`keymap(baseKeymap)` in der projekteigenen `keymap({...})`. Nicht Teil dieses Auftrags.

---

## 8. Toolbar-Änderungen

**Keine** (Frage 1, Frage 3 / 5.2). Falls die Produktentscheidung zu Frage 1 umgekehrt würde:
Button analog zu den bestehenden, `onMouseDown → e.preventDefault(); run(view, selectAll)` (Import
`selectAll` aus `prosemirror-commands`, kein eigener Wrapper), ohne „aktiv"-Zustand. Reine
Handlungsoption, nicht Teil dieses Plans.

---

## 9. Import/Export-Anpassungen OOXML (DOCX) und ODF (ODT)

**Keine Änderungen nötig.** „Alles auswählen" schreibt selbst keine Datei; die Rundreise-Relevanz
liegt nur darin, dass eine **mit** Strg+A durchgeführte Aktion beim Export/Reimport zum selben
Ergebnis führt wie ohne den Strg+A-Umweg. Das ist strukturell gegeben, weil Strg+A ausschließlich
die **Selektion** ändert, nie den Dokumentbaum — Reader/Writer sehen exakt dasselbe
ProseMirror-Dokument.

| Merkmal | DOCX (`src/formats/docx/`) | ODT (`src/formats/odt/`) | Bewertung |
|---|---|---|---|
| Formatierung über gesamtes Dokument je Lauf | `reader.ts`/`writer.ts` iterieren generisch über `body.content`, kein „erster/letzter Block"-Sonderfall | analog `reader.ts`/`writer.ts` | Vollständig, kein Bedarf |
| `colspan`/`rowspan` nach Strg+A+Formatierung | `writer.ts` (`w:gridSpan`/`w:vMerge`, verifiziert Zeilen 174/187–188), `reader.ts` | `writer.ts` (`table:number-columns-/rows-spanned`, Zeilen 150–151), `reader.ts` | Reader/Writer vollständig, kein Bedarf — **aber** die UI (`Toolbar.tsx`, `insertTable(2,2)`) kann selbst keine gemergte Zelle erzeugen; der Testnachweis läuft daher über Fixture-Upload (§6.2 Testfall 4b) bzw. direkt gebautes doc-JSON (§6.2a), nicht über eine per Editor gebaute Tabelle (Korrektur J) |
| Vollständige Löschung → valide leere Datei | Schema `doc: 'block+'` garantiert ≥ 1 leeren Absatz (Fund 3) | analog | Vollständig, kein Bedarf |
| Bilder in `AllSelection`-Formatierung unverändert | `setAlign` überspringt `image`; `docx/imageCollector.ts` je Node unabhängig | analog `odt/imageCollector.ts` | Vollständig, kein Bedarf |

Einziger indirekter Blocker: der Cross-Format-Export in `DocumentWorkspace.tsx` (5.3) — liegt an
der UI, nicht an Reader/Writer (die sind cross-format-fähig).

---

## 10. Playwright-Konfiguration

**Empfohlene reale Änderung** (im Unterschied zur Vorfassung, die keine für nötig hielt): Da die
Projekte `Desktop Safari (Clipboard)` und `Desktop Firefox (Clipboard)` inzwischen existieren und
auf `testMatch: /clipboard.*\.spec\.ts/` gescoped sind, erfassen sie `select-all*.spec.ts` nicht.
Um Cmd+A / den WebKit-`selectAll`-Codepfad auf **Desktop** (statt nur touch-emuliert über
`Tablet`) abzudecken — genau wie `alles-auswaehlen-req.md` Frage 4 es vorsieht — beide `testMatch`
erweitern:
```ts
testMatch: /(clipboard.*|select-all)\.spec\.ts/,
```
**Nicht** die naheliegendere `/(clipboard|select-all).*\.spec\.ts/` verwenden (Korrektur I,
Abschnitt 1): dort matcht `.*` **nach** der Gruppe auch beliebigen Text zwischen `select-all` und
`.spec.ts`, sodass die Regex **auch** `select-all-roundtrip.spec.ts` erfasst — genau die Datei,
die laut nächstem Absatz bewusst ausgeschlossen bleiben soll. Die korrigierte Form verschiebt
`.*` in die `clipboard`-Alternative hinein, sodass `select-all` nur bei **exakt** anschließendem
`.spec.ts` matcht (`select-all.spec.ts` ja, `select-all-roundtrip.spec.ts` nein), während
`clipboard.spec.ts` **und** `clipboard-roundtrip.spec.ts` weiterhin beide erfasst bleiben (sonst
träte eine stille Regression der bestehenden Desktop-Safari/Firefox-Clipboard-Abdeckung ein).
Unabhängig verifiziert durch den companion-QA-Plan `alles-auswaehlen-qa.md` §6.5 (Korrektur K9).

Danach läuft der Tastatur-Kern von `select-all.spec.ts` zusätzlich auf Desktop-WebKit und
Desktop-Firefox. `select-all-roundtrip.spec.ts` bleibt bewusst **außen vor**, weil dessen
Clipboard-/Download-Schritte auf diesen Engines unzuverlässig sind (Cross-Engine-Download-
Handling, dieselbe Einschränkung wie bei `clipboard-roundtrip.spec.ts`); der reine Tastatur-Kern
genügt für die Frage-4-Abdeckung.

Kein neues Projekt anlegen (vermeidet doppelte CI-Laufzeit für dasselbe Gerät). Ist die
`testMatch`-Erweiterung nicht erwünscht, bleibt „echtes Desktop-macOS/Cmd+A" ein dokumentierter
offener Punkt (nicht stillschweigend als erledigt markieren).

---

## 11. Grenzfälle-Mapping (`alles-auswaehlen-req.md` Abschnitt 3, vollständig)

| # | Grenzfall | Beleg | Test (neu, sofern nicht bereits abgedeckt) |
|---|---|---|---|
| 1 | Leeres Dokument | `AllSelection` + `doc: 'block+'` (Fund 3) | §6.1 Testfall 2, §6.4 |
| 2 | Wiederholtes Strg+A | `AllSelection.eq` (Abschnitt 4) | §6.1 Testfall 3, §6.4 |
| 3 | Cursor in Tabellenzelle | Frage 2 = (a) (Fund 3) | §6.1 Testfall 4 |
| 4 | Nur-Bild-Dokument | `setAlign` überspringt `image` | §6.1 Testfall 5, §6.4 |
| 5 | Strg+A → Tippen | Standard-Replace | §6.1 Testfall 6 |
| 6 | Strg+A → Entf/Backspace | `AllSelection.replace` (Fund 3) | §6.1 Testfall 1; **Strg+X-Variante bereits** in `cut.spec.ts` Testfall 4 |
| 7 | Regressions-Pflichtfall | `reconcileSelectionOnClick` unverändert | **bereits abgedeckt:** `selection-regression.spec.ts` (4 Tests) + `cut.spec.ts` Testfall 5 |
| 8 | Strg+A → Undo | `tr.steps.length === 0` (Fund 2) | §6.1 Testfall 7, §6.4 |
| 9 | IME-Komposition | View-natives Verhalten | §6.1 Testfall 8 |
| 10 | Fokus außerhalb Editor | Keymap nur auf `view.dom` | §6.1 Testfall 9 (Strg+X-Analogon bereits `cut.spec.ts` Grenzfall 14) |
| 11 | Großes Dokument | `AllSelection` O(1) | §6.1 Testfall 10 |
| 12 | Strg+A → Kopieren/Ausschneiden | siehe `kopieren`/`ausschneiden` | **bereits abgedeckt** (Abschnitt 3); Verkettung §6.2 Testfall 5/7; `colspan`/`rowspan`-Erhalt zusätzlich §6.2a |
| 13 | Kopf-/Fußzeile/Fußnoten | keine eigene Editor-Instanz (`WordEditor.tsx` lädt nur `doc.content.body`) | keiner (außerhalb Scope, §15) |
| 14 | Track-Changes | nicht implementiert (Phase 3) | keiner (außerhalb Scope) |
| 15 | Mehrfach-Strg+A + Zoom/Resize | `createPaginationPlugin()` reagiert auf Layout, nicht Selektion | §6.1 Testfall 10 (implizit); optionaler Zusatztest |
| 16 | Kein globaler `contextmenu`-Handler | nur Kommentar (Abschnitt 0) | §6.1 Testfall 11 |
| 17 | Datenschutz | keine Selektions-Telemetrie | kein Test nötig |

---

## 12. Reihenfolge der Umsetzung

1. `src/formats/shared/editor/__tests__/select-all.test.ts` — schnellste, risikoärmste
   Absicherung zuerst (State-/Transform-Prüfungen, kein Browser), nach dem `commands.test.ts`-Muster.
2. `src/formats/docx/__tests__/select-all-roundtrip.test.ts` +
   `src/formats/odt/__tests__/select-all-roundtrip.test.ts` (6.2a) — ebenfalls Vitest, kein
   Browser; klärt den `colspan`/`rowspan`-Fall (Korrektur J) unabhängig von Schritt 3/4, bevor
   der langsamere E2E-Weg drankommt.
3. `tests/e2e/select-all.spec.ts` — Kernauftrag (Abschnitt 6.1). Vor dem Schreiben jedes
   Testfalls Abschnitt 3 prüfen, um Duplikate mit `cut.spec.ts`/`clipboard.spec.ts` zu vermeiden.
4. `tests/e2e/select-all-roundtrip.spec.ts` — Formatier-Rundreisen (6.2), inkl. Testfall 4a/4b
   (Korrektur J: 4b lädt eine vorgefertigte Fixture mit gemergter Zelle hoch), Cross-Format als
   `test.fixme(...)` + Same-Format-Ersatz.
5. `playwright.config.ts` — `testMatch` beider Clipboard-Projekte auf
   `/(clipboard.*|select-all)\.spec\.ts/` erweitern (Abschnitt 10, Korrektur I — **nicht** die
   naheliegendere `/(clipboard|select-all).*\.spec\.ts/`, die `select-all-roundtrip.spec.ts`
   ungewollt mit hineinzöge); `select-all.spec.ts` auf Desktop-WebKit/Firefox grün bestätigen.
6. (Optional) `selection-regression.spec.ts` — höchstens der eine „Kopieren-ohne-Fett"-Test
   (6.3), **nur** falls literale §2.6-Deckung gefordert; bestehende 4 Tests unverändert lassen.
7. (Optional) `WordEditor.tsx` — Klarstellungskommentar (6.5).
8. `specs/alles-auswaehlen-req.md` Abschnitt 8 um die Entscheidungen (Abschnitt 2) ergänzen;
   Backlog-Status **erst nach** grünem Lauf von Schritt 1–5 von „nicht vertrauenswürdig" auf
   „verifiziert" heben.

---

## 13. Abnahmekriterien — Abgleich mit `alles-auswaehlen-req.md` Abschnitt 8, Punkt 5

- **„Jeder Testfall aus Abschnitt 1, 3 und 6 als dauerhafter Test, grün"** → teils neu
  (§6.1/§6.4, Mapping §11), teils **bereits** durch `cut.spec.ts`/`clipboard.spec.ts`/
  `selection-regression.spec.ts` erfüllt (Abschnitt 3) — kein Duplikat nötig.
- **„Drei [recte: vier] Selection-Sync-Regressionstests grün, um Ausschneiden/Kopieren-Variante
  ergänzt"** → Ausschneiden-Variante **bereits** `cut.spec.ts` Testfall 5; Kopieren-Variante
  **bereits** `selection-regression.spec.ts` Test 4; literale „Kopieren-ohne-Fett"-Ergänzung
  optional (6.3). Die vier bestehenden Tests bleiben unverändert grün.
- **„Rundreise Abschnitt 4 für beide Formate/Richtungen"** → §6.2 Testfälle 1–5, 7 vollständig
  (Testfall 5 zweigeteilt in 4a/4b, Korrektur J); `colspan`/`rowspan`-Formatierungsfall zusätzlich
  browserunabhängig über §6.2a abgesichert; 6–8 (Cross-Format) via `test.fixme(...)` +
  Same-Format-Ersatz, bis der Blocker (5.3) gelöst ist.
- **„Visueller Kontrast-Check Light/Dark durchgeführt und dokumentiert"** → §6.1 Testfall 13;
  erwarteter Ausgang (Fund 4) vorhergesagt, aber real zu beobachten, bevor die Baseline gilt.
- **„Fragen 1–4 beantwortet und nachgetragen"** → Abschnitt 2; Frage 4 jetzt konkret umsetzbar
  (Abschnitt 10), nicht mehr nur deferrt.

---

## 14. Zusammenfassung der Datei-Änderungen (Schnellreferenz)

- **Neu:** `tests/e2e/select-all.spec.ts`, `tests/e2e/select-all-roundtrip.spec.ts`,
  `src/formats/docx/__tests__/select-all-roundtrip.test.ts`,
  `src/formats/odt/__tests__/select-all-roundtrip.test.ts`,
  `src/formats/shared/editor/__tests__/select-all.test.ts`.
- **Geändert (empfohlen):** `playwright.config.ts` (`testMatch` ×2, korrigierte Regex — Korrektur I),
  `specs/alles-auswaehlen-req.md` (Abschnitt 8).
- **Optional:** `tests/e2e/selection-regression.spec.ts` (≤ 1 Test), `WordEditor.tsx` (Kommentar).
- **Bewusst NICHT geändert:** `commands.ts`, `Toolbar.tsx`, `schema.ts`, `src/index.css`,
  `DocumentWorkspace.tsx`, `src/formats/docx/writer.ts`/`reader.ts`,
  `src/formats/odt/writer.ts`/`reader.ts` (nur ihre Tests werden ergänzt, siehe 6.0).

---

## 15. Was noch offen bleibt (zurück an Backlog/Anforderung)

- **Frage-3-Koordinationsrisiko** (5.2): vier Tickets ändern dieselbe `Toolbar.tsx`-Zeile 69 /
  potenziell dieselbe neue `commands.ts`-Funktion mit unterschiedlichen Details. Eines
  (empfohlen `kursiv-code.md`) als kanonisch bestimmen, bevor eines umgesetzt wird.
- **Cross-Format-Export-UI fehlt weiterhin** (5.3) — bereits von Kopieren/Ausschneiden gemeldet,
  hier erneut unverändert vorgefunden. Blockiert §4.2 #6–#8 (mit `test.fixme` + Same-Format-Ersatz
  überbrückt).
- **Fehlendes Default-ProseMirror-CSS** (`.ProseMirror-selectednode`, Fund 5) — kein Blocker für
  „Alles auswählen", aber ein realer Darstellungsfehler bei Einzelklick-Bildauswahl. Gehört
  `bild-einfuegen`/`bild-groesse-aendern`, hier nur vermerkt.
- **Kopf-/Fußzeile/Fußnote/Kommentar** (Grenzfall 13) — keine eigene Editor-Instanz vorhanden,
  zurückgestellt.
- **Track-Changes** (Grenzfall 14) — Phase 3, nicht umgesetzt.
- **Echtes physisches macOS/Cmd+A** bleibt außerhalb des CI-Scopes; der WebKit-**Desktop**-
  Codepfad ist nach der `testMatch`-Erweiterung (Abschnitt 10) jedoch abgedeckt — deutlich mehr
  als die Vorfassung für möglich hielt.
