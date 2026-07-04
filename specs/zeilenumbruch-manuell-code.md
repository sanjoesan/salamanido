# Umsetzungsplan „Manueller Zeilenumbruch (Umschalt+Enter)" — dateigenau, gegen den tatsächlichen Code geprüft

Bezug: `E:\docs\specs\zeilenumbruch-manuell-req.md` (Anforderung), `E:\docs\FEATURE-SPEC-DOCX-ODT.md`
(Rahmenbedingungen, Abschnitte 2/15/18/19/20/21), `E:\docs\specs\seitenumbruch-req.md` und
`E:\docs\specs\seitenumbruch-code.md` (Nachbar-Feature, teilt sich `<w:br>`-Codepfad),
`E:\docs\specs\einfuegen-req.md` Abschnitt 3.3 (Abgrenzung Zwischenablage). Code-Stand geprüft am
2026-07-04 in `E:\docs` (kein Git-Repo; Datei-Inhalte direkt gelesen, alle Zeilenangaben unten
gegen den tatsächlichen Dateiinhalt verifiziert, nicht aus der Anforderungsdatei übernommen;
zusätzlich mehrere Verhaltensannahmen per kleinem Node-Skript direkt gegen die installierten
`prosemirror-model`/`prosemirror-state`/`prosemirror-keymap`/`prosemirror-view`-Pakete
verifiziert, siehe Abschnitt 0).

Rolle dieses Dokuments: bestätigt/erweitert den Befund aus `zeilenumbruch-manuell-req.md`
Abschnitt 0 (Abschnitt 0 unten), trifft die Architekturentscheidung „expliziter Command statt
nativer Fallback" (Abschnitt 1), spezifiziert die Command-/Keymap-Änderung inklusive eines dabei
neu gefundenen, konkreten Datenverlust-Bugs (Abschnitt 3), stellt fest, dass am Schema und an
DOCX-/ODT-Reader/Writer **keine** Code-Änderung nötig ist (Abschnitte 2, 9–12), ergänzt die
Playwright-Konfiguration um eine fehlende Browser-Engine (Abschnitt 13) und schließt mit
Testplan, Grenzfall-Mapping und Abnahme-Checkliste (Abschnitte 14–17).

**Kurzfassung des Ergebnisses:** Das Feature ist überwiegend bereits richtig gebaut
(Datenmodell, DOCX-Writer, ODT-Reader/Writer) — es fehlt ausschließlich ein expliziter,
browserunabhängiger Erzeugungsweg für den Zeilenumbruch selbst (aktuell nur nativer
Browser-Fallback) sowie die komplette Testabdeckung dafür. Es sind **keine** Schema- und
**keine** Reader/Writer-Codeänderungen nötig — nur eine neue Command-Funktion, ein neuer
Keymap-Eintrag, eine Playwright-Konfigurationsergänzung und ein umfangreicher neuer Testkorpus.

---

## 0. Bestätigung des Codebefunds aus `zeilenumbruch-manuell-req.md` Abschnitt 0 + Zusatzbefunde

### 0.1 Bestätigt

Gegen den tatsächlichen Dateiinhalt geprüft, Befund aus der Anforderungsdatei **vollständig
bestätigt**:

1. `src/formats/shared/schema.ts:35–43` definiert `hard_break` exakt wie beschrieben
   (`group: 'inline'`, `inline: true`, `selectable: false`, `parseDOM: [{ tag: 'br' }]`,
   `toDOM(): ['br']`). `paragraph` (9–17) und `heading` (19–31) haben `content: 'inline*'`,
   `list_item` (98–104) `content: 'paragraph block*'`, Tabellenzellen aus
   `tableNodes({ cellContent: 'block+' })` (106) — `hard_break` ist damit überall zulässig, wo
   auch ein `paragraph`/`heading` vorkommen kann.
2. `src/formats/shared/editor/commands.ts` (108 Zeilen) exportiert `setAlign`, `isAlignActive`,
   `setHeading`, `toggleList`, `liftFromList`, `insertImage` (66–74), `insertTable` (76–86),
   `applyMarkColor`/`clearMarkColor` — kein `insertHardBreak`.
3. `src/formats/shared/editor/Toolbar.tsx` (247 Zeilen) hat keinen Eintrag für
   „Zeilenumbruch".
4. `src/formats/shared/editor/WordEditor.tsx:71–80`:
   ```ts
   keymap({
     'Mod-z': undo,
     'Mod-y': redo,
     'Mod-Shift-z': redo,
     Enter: splitListItem(wordSchema.nodes.list_item),
     'Mod-b': toggleMark(wordSchema.marks.strong),
     'Mod-i': toggleMark(wordSchema.marks.em),
     'Mod-u': toggleMark(wordSchema.marks.underline),
   }),
   keymap(baseKeymap),
   ```
   Kein `Shift-Enter`-Eintrag. Per `grep` gegen `node_modules/prosemirror-commands/dist/index.js:813–814`
   bestätigt: `baseKeymap` bindet nur `"Enter": chainCommands(newlineInCode, createParagraphNear,
   liftEmptyBlock, splitBlock)` und `"Mod-Enter": exitCode` — kein `Shift-Enter`.
5. Per `grep` gegen `node_modules/prosemirror-view/dist/index.js:3906–3929` bestätigt: der
   `beforeinput`-Handler behandelt ausschließlich einen Chrome-Android-Backspace-Sonderfall,
   nichts für `insertLineBreak`. Ein per Umschalt+Enter erzeugter `<br>` entsteht also
   ausschließlich über natives `contenteditable`-Verhalten + ProseMirrors generische
   DOM-Mutation-Reconciliation, die zufällig auf `hard_break`s `parseDOM: [{ tag: 'br' }]` trifft.
6. `src/formats/docx/writer.ts:58–61` (`inlineToRuns`) schreibt `hard_break` → `<w:r><w:br/></w:r>`
   ohne `w:type`. `src/formats/docx/reader.ts:132–133` (`decodeParagraphRuns`) liest **jedes**
   `<w:br>`-Kind unabhängig von `w:type` identisch als `{ kind: 'break' }` →
   `runsToInline` (188) → `{ type: 'hard_break' }`. Keine Fallunterscheidung für
   `w:type="page"`/`"column"`.
7. `src/formats/odt/writer.ts:50` (`inlineToOdt`) schreibt `hard_break` →
   `<text:line-break/>`. `src/formats/odt/reader.ts:108–109` (`walk`) liest
   `text:line-break` → `{ type: 'hard_break' }`, unabhängig vom Kontext, da `walk` generisch
   rekursiert; `text:s` (110–112) und `text:tab` (113–115) sind separat behandelt.
   `text:soft-page-break` hat **keinen** eigenen `else if`-Zweig — fällt bei der
   `if`/`else if`-Kette (104–115) stillschweigend durch (kein Effekt), wird also **nicht**
   fälschlich als `hard_break` gelesen. Bestätigt: „kein bekannter Sonderfall" trifft zu.
8. `src/formats/docx/__tests__/roundtrip.test.ts:113–125` und
   `src/formats/odt/__tests__/roundtrip.test.ts:113–125` bauen das Dokument direkt aus
   `{ type: 'hard_break' }`-JSON (Writer→Reader-Test), nicht über einen simulierten
   Tastatur-Eingabeweg.
9. `tests/e2e/lifecycle.spec.ts`, `tests/e2e/odt.spec.ts`, `tests/e2e/docx.spec.ts`,
   `tests/e2e/selection-regression.spec.ts` — per `grep` auf „Shift", „hard_break",
   „line-break", „w:br" durchsucht: **keine** Treffer. Kein E2E-Test für den echten
   Tastaturweg vorhanden.
10. ProseMirrors Klartext-Zwischenablage-Parser (`node_modules/prosemirror-view/dist/index.js`,
    `parseFromClipboard`, `text.split(/(?:\r\n?|\n)+/)`) zerlegt mehrzeiligen Text in
    separate Absätze, nie in `hard_break` — bestätigt, siehe Abschnitt 8.

### 0.2 Zusatzbefund A: reale Fixtures für Grenzfall 13/14 (Testplan Punkt 5/6) sind bereits im Repo vorhanden

Die Anforderung verlangt reale, mit echtem Word/LibreOffice erzeugte Fixtures mit manuellem
Zeilenumbruch sowie (Grenzfall 13/14) Dateien, die Zeilenumbruch **und** Seiten-/Spaltenumbruch
bzw. Soft-Page-Break gemeinsam enthalten. Per Skript (`unzip -p … | grep`) gegen die
tatsächlichen ZIP-Inhalte von `tests/fixtures/external/{docx,odt}/` verifiziert — **keine neuen
Dateien müssen beschafft werden**:

| Datei | Format | Verifizierter Inhalt |
|---|---|---|
| `tests/fixtures/external/docx/drawing.docx` | DOCX | 24× `<w:br/>` **und** 1× `<w:br w:type="textWrapping" w:clear="all"/>` — deckt sowohl den impliziten als auch den expliziten `textWrapping`-Fall ab (Anforderung 3.6) |
| `tests/fixtures/external/docx/saut_page.docx` | DOCX | 2× `<w:br w:type="page"/>` (jeweils letzter Run seines Absatzes) **und** 1× einfaches `<w:br/>` mitten in Fließtext (`…BLA<w:br/>BLA…`) — ideale Positiv-/Negativ-Kombination in einer Datei für Grenzfall 13 |
| `tests/fixtures/external/docx/bug57031.docx` | DOCX | 13× `<w:br/>` **und** 1× `<w:br w:type="page"/>` im selben Dokument |
| `tests/fixtures/external/docx/bug65649.docx` | DOCX | 133× `<w:br/>` **und** 8× `<w:br w:type="page"/>` — zusätzlich Performance-Testfall (Grenzfall 17), bereits in `SKIP_SLOW_UNDER_JSDOM` (`docx/__tests__/external-fixtures.test.ts:34`) für Vitest/jsdom vermerkt, per dediziertem Playwright-Test (`tests/e2e/large-document-import.spec.ts`) real geprüft |
| `tests/fixtures/external/odt/TextLineBreakText.odt` | ODT | genau 1× `<text:line-break/>`, **verschachtelt in einem `<text:span style-name="Example">`**: `1<text:span …>2<text:line-break/>3</text:span>4` — deckt zusätzlich „Zeilenumbruch innerhalb einer Formatierungs-Marke" ab, kleine, klar lesbare Datei |
| `tests/fixtures/external/odt/EasyList.odt`, `ListStyleResolution.odt` | ODT | mehrere `<text:line-break/>` **innerhalb von Listenpunkten** — deckt Grenzfall 7 mit einer echten Fremddatei ab |
| `tests/fixtures/external/odt/excelfileformat.odt` | ODT | 343× `<text:line-break/>` **und** 118× `<text:soft-page-break/>` im selben Dokument (nicht direkt benachbart im selben Absatz — siehe 0.3) |
| `tests/fixtures/external/odt/text-extract.odt`, `sections.odt`, u. a. | ODT | `<text:soft-page-break/>` **ohne** `<text:line-break/>` — sauberer „darf nicht fehlinterpretiert werden"-Negativtest |

Diese Dateien werden in Abschnitt 14 als Pflicht-Fixtures verwendet — Testplan Punkt 5 der
Anforderung („reale Test-Fixtures … sind aufzunehmen, falls noch nicht vorhanden") ist damit
bereits erfüllbar, ohne neue Binärdateien ins Repo aufzunehmen.

### 0.3 Zusatzbefund B: kein reales Fixture mit `text:line-break` unmittelbar gefolgt von `text:soft-page-break` im selben Absatz (Grenzfall 14)

`excelfileformat.odt` enthält beide Elemente, aber per Adjazenz-Prüfung
(`grep -o '<text:line-break/><text:soft-page-break[^/]*/>\|<text:soft-page-break[^/]*/><text:line-break/>'`)
**nicht direkt aufeinanderfolgend im selben Absatz**. Für Grenzfall 14 exakt wie in der
Anforderung formuliert („`<text:line-break/>` unmittelbar gefolgt von einem
`text:soft-page-break` im selben Absatz") ist deshalb ein **synthetisches XML-Fixture** nötig
(Abschnitt 14.1) — analog zur in Anforderung Abschnitt 5.1 Punkt 3 bereits vorgesehenen
Praxis „sonst synthetisch als XML-Fixture nachgebaut" für den Seitenumbruch-Fall.

### 0.4 Zusatzbefund C: `playwright.config.ts` hat aktuell **kein** Firefox-Projekt

`playwright.config.ts:19–23`:
```ts
projects: [
  { name: 'Desktop Chrome', use: { ...devices['Desktop Chrome'] } },
  { name: 'Mobile', use: { ...devices['Pixel 7'] } },
  { name: 'Tablet', use: { ...devices['iPad Mini'] } },
],
```
Anforderung Testplan Punkt 4 nennt als Beispiel „Desktop Chrome **und** Desktop Firefox …,
falls dort konfiguriert" — **ist es nicht**. Per
`node_modules/playwright-core/lib/server/deviceDescriptorsSource.json` verifiziert:
`'Desktop Chrome'` und `'Pixel 7'` haben `defaultBrowserType: "chromium"`, `'iPad Mini'` hat
`defaultBrowserType: "webkit"`. Es existiert also aktuell **keine** Firefox-Engine in der
gesamten Suite — nur Chromium (2×) und WebKit (1×, zudem mit Touch-/Mobile-Emulation, was für
reine Tastatur-Interaktionstests eine unnötige Fehlerquelle wäre). Für Testplan Punkt 4
(„mindestens zwei unterschiedliche Browser-Engines") muss `playwright.config.ts` um ein
echtes `'Desktop Firefox'`-Projekt ergänzt werden (Abschnitt 13) — reines Draufsatteln auf
`'Tablet'`/`'Mobile'` würde zwar technisch „zwei Engines" erfüllen (Chromium + WebKit), aber
mit Mobile-/Touch-Eigenheiten vermischen, die mit dem eigentlichen Testgegenstand
(Tastatur-Taste `Shift+Enter`) nichts zu tun haben.

### 0.5 Zusatzbefund D: `hard_break` ist bereits strukturell atomar — Navigationsanforderungen (3.12) sind ohne Codeänderung erfüllt

Per `grep` gegen `node_modules/prosemirror-model/dist/index.js:2125,2130` verifiziert:
```js
get isLeaf() { return this.contentMatch == ContentMatch.empty; }
get isAtom() { return this.isLeaf || !!this.spec.atom; }
```
`hard_break` hat keinen `content`-Ausdruck im Schema → `isLeaf === true` → `isAtom === true`
**automatisch**, ganz ohne explizites `atom: true` im Schema. Pfeiltasten-Navigation und
Selektionsverhalten behandeln jeden `isAtom`-Node bereits als unteilbare Einheit — Anforderung
3.4 („`selectable: false` bleibt bestehen … verhält sich wie ein atomares Inline-Zeichen") ist
damit **bereits durch das bestehende Schema erfüllt**, keine Schemaänderung nötig. Offen bleibt
ausschließlich die **Testabdeckung** (Grenzfall 11/12, Abschnitt 14.2) — nicht der Code.

### 0.6 Zusatzbefund E: App hat keine Cross-Format-Konvertierungsfunktion in der UI

Durchsicht von `src/App.tsx`, `src/app/DocumentWorkspace.tsx`, `src/app/FormatPicker.tsx`
sowie `grep -r "convert|Konvertier|cross-format" src` (keine Treffer): jedes Format-Modul
(DOCX-„Karte", ODT-„Karte") hat eine eigene Upload-/Export-Funktion, die ausschließlich den
eigenen Reader/Writer verwendet. Es gibt **keine** „Speichern unter anderem Format"- oder
„Konvertieren"-Funktion. Ein per DOCX-Karte exportiertes `.docx` in die ODT-Karte hochzuladen,
würde `readOdt` mit einem `content.xml fehlt`-Fehler abbrechen lassen (`odt/reader.ts:243`) —
das ist korrektes, gewolltes Verhalten der bestehenden Fehlerbehandlung, **kein** Bug, aber es
bedeutet: **Anforderung 5.2, Testfall 3 (Cross-Format-Rundreise DOCX↔ODT) kann nicht als echter
Playwright-E2E-Test mit Real-Upload zwischen den Karten ausgeführt werden**, weil dieser
Workflow in der App schlicht nicht existiert. Er wird stattdessen — vollständig regelkonform
zu Testplan Punkt 7 der Anforderung („sowohl als Unit-Tests … als auch als E2E-Test") — auf
**zwei** Ebenen abgedeckt:
- **E2E** (Abschnitt 14.2): Zeilenumbruch per echter Tastatur in der DOCX-Karte erzeugen,
  exportieren (echter Download), **danach** der Reader/Writer-Kette **innerhalb desselben
  Tests** die heruntergeladene Datei zum reinen Format-Wechsel übergeben (`readDocx` auf den
  Download-Buffer, dessen JSON-Body direkt an `writeOdt` weiterreichen) — der Tastatur-Teil
  bleibt dabei echte Browser-Interaktion, nur der Format-Wechsel selbst läuft programmatisch,
  weil die App dafür keine UI hat.
- **Unit** (Abschnitt 14.1): reine Reader/Writer-Verkettung `readDocx → writeOdt → readOdt →
  writeDocx` mit einem `hard_break`-JSON-Fixture, symmetrisch für die umgekehrte Richtung.

### 0.7 Zusatzbefund F (kritisch, verifiziert): naives `replaceSelectionWith`-Muster löscht ein selektiertes Bild/Tabelle beim Einfügen des Umbruchs

Das in der Anforderung selbst als Vorbild genannte Muster („analog zum Muster
`insertImage`/`insertTable`") verwendet für einen Klick-Einfügefall stets
`state.tr.replaceSelectionWith(node)`. Ein naiver `insertHardBreak` nach genau diesem Muster
hat einen konkreten, verifizierten Datenverlust-Bug: Ist die aktuelle Selektion eine
`NodeSelection` auf einem block-artigen, nicht-inline Knoten (z. B. `image`, das in diesem
Schema `selectable`-Standard `true` hat, oder eine ganze `table`) — was z. B. entsteht, wenn
eine Nutzerin per Klick oder Pfeiltaste ein Bild als Ganzes auswählt (Grenzfall 9 betrifft
genau diese Nachbarschaft) — **löscht** `replaceSelectionWith` den ausgewählten Knoten
vollständig und ersetzt ihn durch einen neu synthetisierten, leeren Absatz mit dem
`hard_break` darin.

**Verifiziert per eigenständigem Node-Skript** (direkt gegen die installierten
`prosemirror-model`/`prosemirror-state`-Pakete dieses Repos, ohne App-Code, siehe
Reproduktionsschritte unten):

```
doc(paragraph("Hallo"), image, paragraph("Welt"))
+ NodeSelection(image)
+ state.tr.replaceSelectionWith(hard_break.create())
→ doc(paragraph("Hallo"), paragraph(hard_break), paragraph("Welt"))   // Bild ist WEG
```

Reproduktion: `Schema` mit minimalem `doc`/`paragraph`/`text`/`hard_break`/`image` (analog
`schema.ts`), `NodeSelection.create(doc, imagePos)`, dann
`state.tr.replaceSelectionWith(schema.nodes.hard_break.create())` — Ergebnis wie oben, kein
Fehler/Exception, sondern **stiller** Verlust des Bildes. Grund: `Selection.prototype.replaceWith`
(`node_modules/prosemirror-state/dist/index.js:99–112`) ruft `tr.replaceRangeWith(from, to, node)`
auf; für ein `inline`-Node (unser `hard_break`) überspringt `replaceRangeWith`
(`node_modules/prosemirror-transform/dist/index.js:1739–1746`) die für Block-Nodes vorgesehene
`insertPoint`-Anpassung und ersetzt die volle Node-Range direkt durch die inline Slice — die
umgebende `replaceRange`-Fit-Logik synthetisiert dabei automatisch einen umschließenden
`paragraph`, **anstatt** das Bild zu erhalten.

Das ist **kein rein hypothetisches Edge-Case**, sondern exakt die in Anforderung Grenzfall 9
beschriebene Nachbarschaft-Situation, nur mit dem Bild **selbst** selektiert statt dem Cursor
davor/danach im Text — beide sind über normale Pfeiltasten-Navigation direkt erreichbar,
sobald ein `image`-Node im Dokument steht (dieses Schema setzt keinen `selectable: false`
auf `image`, im Unterschied zu `hard_break`). Ohne Gegenmaßnahme würde das neue Feature also
in einer real erreichbaren Konstellation eine bestehende Kernanforderung verletzen (Bild geht
verloren) — behoben in Abschnitt 3.2 unten. Getestet in Abschnitt 14.2, Grenzfall 9.

Zusätzlich verifiziert: an den beiden Positionen unmittelbar vor/nach dem Bild in obigem
Test-Dokument ist `GapCursor.valid(…)` (`node_modules/prosemirror-gapcursor/dist/index.cjs`)
**`false`** — weil beide Positionen an ein Textblock (`paragraph`) angrenzen, für das bereits
eine normale `TextSelection` existiert. Der in Anforderung Grenzfall 9 beschriebene
„Cursor unmittelbar vor/nach dem Bild"-Fall ist in diesem Schema also der **gewöhnliche**
Fall (Cursor am Ende/Anfang des benachbarten Absatzes, ganz normale `TextSelection`,
`replaceSelectionWith` funktioniert hier unverändert korrekt) — nicht der in 0.7 oben
beschriebene `NodeSelection`-auf-Bild-Fall. Beide Fälle werden in Abschnitt 14.2 getrennt
getestet.

### 0.8 Zusatzbefund G: Warum Löschen (Menüpunkt 5/Grenzfall 10) **keinen** neuen Command braucht

Per `grep` gegen `node_modules/prosemirror-commands/dist/index.js:798–799` verifiziert:
```js
let backspace = chainCommands(deleteSelection, joinBackward, selectNodeBackward);
let del = chainCommands(deleteSelection, joinForward, selectNodeForward);
```
Keine dieser vier Teil-Commands behandelt „lösche das inline Atom unmittelbar vor/nach einer
**nicht-leeren** Cursor-Position innerhalb eines Textblocks" — `deleteSelection` erfordert eine
nicht-leere Selektion, `joinBackward`/`joinForward`/`selectNodeBackward`/`selectNodeForward`
greifen nur an Textblock-**Grenzen**. Das bedeutet: **im gesamten bestehenden Editor** läuft
das Löschen eines einzelnen Zeichens per Backspace/Entf mitten im Text schon heute **nicht**
über einen expliziten ProseMirror-Command, sondern immer über genau denselben Mechanismus wie
in Anforderung Abschnitt 0 Punkt 5 für das *Einfügen* beschrieben: natives
`contenteditable`-Verhalten + DOM-Mutation-Reconciliation. Das ist also **keine
hard_break-spezifische Fragilität**, sondern der normale, bereits an jeder einzelnen
Zeichenlöschung im gesamten Produkt hängende, gut in der ProseMirror-Ökosystem-Praxis
etablierte Mechanismus — ein neuer `removeHardBreak*`-Command wäre unmotivierte
Sonderbehandlung ohne einen zu behebenden Fehler. Konsequenz: **kein neuer Code** für
Menüpunkt 5, aber eine **Testpflicht** (Grenzfall 10, Abschnitt 14.2), weil dieser
Mechanismus für `hard_break` spezifisch noch nie beobachtet/verifiziert wurde.

---

## 1. Architekturentscheidung: expliziter Command + Keymap-Eintrag statt nur nativer Fallback

**Entscheidung:** Anforderung Abschnitt 1 Zeile 1 / Abschnitt 7 verlangt eine Entweder-Oder-Klärung.
Diese fällt auf **explizit** — ein neuer `insertHardBreak()`-Command, gebunden an
`'Shift-Enter'` im bestehenden `keymap({...})`-Plugin in `WordEditor.tsx`.

### 1.1 Begründung

- **Determinismus statt Zufall:** Sobald ein Command in einem `keymap()`-Plugin für eine Taste
  `true` zurückgibt, ruft ProseMirrors `handleKeyDown`-Pfad `event.preventDefault()` auf
  (verifiziert: `node_modules/prosemirror-view/dist/index.js:3195`,
  `view.someProp("handleKeyDown", …) || captureKeyDown(view, event)` → `preventDefault()`).
  Damit wird der native `insertLineBreak`-Fallback (Anforderung Abschnitt 0 Punkt 5) für
  `Shift-Enter` **vollständig durch eine kontrollierte Transaktion ersetzt**, nicht nur
  ergänzt — die Funktion hängt danach an keiner Browser-Eigenheit mehr.
- **Kein Widerspruch zu Anforderung 3.13 (Undo):** eine per `dispatch` ausgelöste Transaktion
  ist laut `prosemirror-history` grundsätzlich ein Undo-Eintrag; das native
  Fallback+Reconciliation hätte dieselbe Eigenschaft (jede DOM-Mutation, die ProseMirror in
  eine Transaktion übersetzt, zählt genauso als ein Eintrag) — dieser Punkt ändert sich durch
  die Umstellung nicht, wird aber jetzt durch einen benannten, testbaren Codepfad statt durch
  Beobachtung von Browser-Verhalten sichergestellt.
- **Bereits etabliertes Muster im selben Code:** `insertImage`/`insertTable`
  (`commands.ts:66–86`) folgen exakt diesem Ansatz für andere Inline-/Block-Einfügungen —
  keine neue Architektur, sondern Fortführung der bestehenden Konvention.
- **Verworfene Alternative — „nativen Fallback dokumentieren und so belassen":** geprüft und
  verworfen. Das Freigabekriterium (Anforderung Abschnitt 7) verlangt ausdrücklich, dass der
  native Fallback **entweder** nachweislich browserübergreifend zuverlässig **oder** durch
  einen expliziten Mechanismus ersetzt wird. Da der native Pfad laut Abschnitt 0 der
  Anforderung nie bewusst getestet wurde und strukturell durch jede künftige globale
  `Enter`-`preventDefault()`-Änderung brechen kann (genanntes Risiko in Anforderung Punkt 5),
  ist „nur dokumentieren" die schwächere, nicht empfehlenswerte Option — zumal der explizite
  Weg mit einer einzigen Zeile Code (Abschnitt 4) umsetzbar ist.

---

## 2. Schema — `src/formats/shared/schema.ts` — keine Änderung

Bestätigt (Zusatzbefund D, Abschnitt 0.5): `hard_break` (Zeilen 35–43) bleibt **unverändert**.
Kein neues Attribut, keine `atom: true`-Ergänzung nötig (bereits strukturell atomar). Einzige
Berührung mit diesem Feature: falls künftig `seitenumbruch-req.md`/eine Spaltenumbruch-Spec
einen neuen `page_break`/`column_break`-Node oder ein `breakBefore`-Attribut ergänzt
(`seitenumbruch-code.md` Abschnitt 2), bleibt `hard_break` davon unberührt — beide Features
teilen sich nur den `<w:br>`-Elementnamen im DOCX-Reader/Writer, nicht das Schema selbst.

---

## 3. Commands — `src/formats/shared/editor/commands.ts`

### 3.1 Import-Ergänzung

Zeile 1 aktuell:
```ts
import type { Command, EditorState } from 'prosemirror-state'
```
wird zu:
```ts
import { NodeSelection, TextSelection, type Command, type EditorState } from 'prosemirror-state'
```
(`NodeSelection`/`TextSelection` als Werte, nicht nur Typen, für den Guard in 3.2.)

### 3.2 `insertHardBreak(): Command` — neu

Platzierung: direkt nach `insertTable` (aktuell Zeilen 76–86), vor dem
`ColorMarkName`-Abschnitt (88), da `insertImage`/`insertTable`/`insertHardBreak` dieselbe
„Einfügen an Cursor/über Selektion"-Familie bilden.

```ts
export function insertHardBreak(): Command {
  return (state, dispatch) => {
    const breakNode = wordSchema.nodes.hard_break.create()
    if (dispatch) {
      const { selection } = state
      let tr = state.tr
      if (selection instanceof NodeSelection && !selection.node.type.isInline) {
        // Eine NodeSelection auf einen block-artigen Knoten (Bild, Tabelle, ...) darf NIE
        // durch replaceSelectionWith ersetzt werden: ProseMirror synthetisiert dabei
        // automatisch einen umschließenden Absatz für den inline hard_break UND LÖSCHT dabei
        // den selektierten Knoten vollständig (verifiziert, siehe zeilenumbruch-manuell-code.md
        // Abschnitt 0.7: doc(p("Hallo"), image, p("Welt")) + NodeSelection(image) +
        // replaceSelectionWith(hard_break) → doc(p("Hallo"), p(hard_break), p("Welt")), Bild
        // weg). Stattdessen einen neuen Absatz mit dem Umbruch NACH dem selektierten Knoten
        // einfügen — der Knoten selbst bleibt vollständig erhalten (Anforderung Grenzfall 9).
        const after = selection.to
        tr = tr.insert(after, wordSchema.nodes.paragraph.create(null, breakNode))
        tr = tr.setSelection(TextSelection.create(tr.doc, after + 1))
      } else {
        // Normalfall: Cursor mitten im Text, am Absatzanfang/-ende, in einem leeren Absatz,
        // oder eine Text-/Cross-Node-Selektion über mehrere Wörter — replaceSelectionWith
        // ersetzt eine vorhandene Selektion (Anforderung 3.2) bzw. fügt am Cursor ein
        // (Anforderung 3.1/3.3), exakt wie insertImage/insertTable es bereits für andere
        // Inline-/Block-Einfügungen tun.
        tr = tr.replaceSelectionWith(breakNode)
      }
      dispatch(tr.scrollIntoView())
    }
    return true
  }
}
```

**Rückgabewert immer `true`:** anders als `applyMarkColor`/`clearMarkColor` (die bei leerer
Selektion `false` liefern, weil „keine Selektion" für Farboperationen bedeutungslos ist) gibt
es für `insertHardBreak` **keinen** Fall, in dem die Aktion sinnvoll verweigert werden sollte —
Anforderung 3.3/Grenzfall 5 verlangt ausdrücklich, dass auch der leere Absatz und
Anfang/Ende-Positionen einen Umbruch erzeugen, „nie stillschweigend zu einem No-Op reduziert"
werden (Anforderung 3.14). Ein `false` würde die Taste ungehandelt lassen und (Abschnitt 1.1)
den native Fallback als Rückfallebene reaktivieren — bewusst vermieden.

**Ein einziger `tr`, eine einzige `dispatch`-Aufruf:** erfüllt Anforderung 3.13 („ein einziger
Undo-Schritt") strukturell, exakt nach demselben in `seitenumbruch-code.md` Abschnitt 3.2
verwendeten Prinzip (mehrere Transform-Methodenaufrufe auf **einem** `tr`-Objekt zählen für
`prosemirror-history` als ein Eintrag, nicht mehrere `dispatch`-Aufrufe).

### 3.3 Exportliste

`insertHardBreak` zur bestehenden Export-Funktionsliste hinzufügen (kein zentrales
Export-Objekt vorhanden — jede Funktion ist bereits einzeln `export function`, also nur die
neue Funktion selbst muss `export` sein, was oben bereits der Fall ist).

### 3.4 Bekannte, bewusst nicht behobene Restlücke: `CellSelection` (Tabellen) wird nicht separat abgefangen

`prosemirror-tables` verwendet für „ganze Tabellenzelle(n) markiert" eine eigene
`CellSelection`, keine `NodeSelection` — der Guard in 3.2 greift dafür nicht. Das ist
**dieselbe, bereits vor diesem Ticket bestehende Exposition** wie bei `insertImage`/
`insertTable` selbst (beide verwenden ebenfalls unguarded `replaceSelectionWith`/
`replaceSelectionWith` bei aktiver `CellSelection`) — kein neues, durch dieses Feature
eingeführtes Risiko, also **nicht** im Geltungsbereich dieses Tickets zu beheben (Abgrenzung
analog zur in `seitenumbruch-code.md` Abschnitt 3.3 dokumentierten Praxis, vorbestehende,
eigenständige Lücken außerhalb des Tickets zu benennen statt sie hier mitzubeheben). Wird als
zu beobachtender Punkt in Grenzfall 8 (Tabellenzelle) vermerkt (Abschnitt 15).

---

## 4. `src/formats/shared/editor/WordEditor.tsx` — Keymap-Verdrahtung

Zeilen 71–79 aktuell:
```ts
keymap({
  'Mod-z': undo,
  'Mod-y': redo,
  'Mod-Shift-z': redo,
  Enter: splitListItem(wordSchema.nodes.list_item),
  'Mod-b': toggleMark(wordSchema.marks.strong),
  'Mod-i': toggleMark(wordSchema.marks.em),
  'Mod-u': toggleMark(wordSchema.marks.underline),
}),
```
wird zu:
```ts
keymap({
  'Mod-z': undo,
  'Mod-y': redo,
  'Mod-Shift-z': redo,
  Enter: splitListItem(wordSchema.nodes.list_item),
  'Shift-Enter': insertHardBreak(),
  'Mod-b': toggleMark(wordSchema.marks.strong),
  'Mod-i': toggleMark(wordSchema.marks.em),
  'Mod-u': toggleMark(wordSchema.marks.underline),
}),
```
Import-Ergänzung (Zeile 11-Bereich, gemeinsam mit den bestehenden `commands`-Importen — aktuell
importiert `WordEditor.tsx` gar keine Funktion aus `./commands` direkt, nur `Toolbar.tsx` tut
das; `insertHardBreak` muss zusätzlich in `WordEditor.tsx` importiert werden):
```ts
import { insertHardBreak } from './commands'
```

**Keine Kollision mit `Enter`:** `'Shift-Enter'` ist laut `prosemirror-keymap`s
Normalisierung (`node_modules/prosemirror-keymap/dist/index.js:6–60`, Modifikator-Präfixe in
beliebiger Reihenfolge, `Shift-` explizit unterstützt) ein eigener, von `'Enter'` und
`'Mod-Enter'` unabhängiger Bindungsschlüssel — `splitListItem` (Zeile 75) bleibt für reines
`Enter` unverändert zuständig, `baseKeymap`s `Enter`-Kette (Zeile 80,
`keymap(baseKeymap)`) ebenso.

**Keine Änderung** an `plugins: [...]` (Zeilen 69–86), `reconcileSelectionOnClick`
(Zeilen 42–53) oder `dispatchTransaction` (Zeilen 91–98) nötig — `insertHardBreak` löst wie
jeder andere Command eine reguläre, über `dispatchTransaction` verarbeitete Transaktion aus,
kein DOM-Mutation-ohne-Transaktion-Pfad. **Trotzdem** verlangt Anforderung Abschnitt 2 /
Grenzfall 15 einen dedizierten Regressionstest hierzu (Abschnitt 14.3).

---

## 5. Löschverhalten (Menüpunkt 5, Grenzfall 10) — kein Code, nur Testpflicht

Siehe Zusatzbefund G (Abschnitt 0.8): kein neuer Command. Backspace/Entf auf einen `hard_break`
läuft über denselben nativen Browser-Löschmechanismus + DOM-Reconciliation wie jede andere
Zeichenlöschung im bestehenden Editor. **Einzige Pflicht:** E2E-Test, der genau das für
`hard_break` spezifisch verifiziert (Abschnitt 14.2, Grenzfall 10) — bislang nirgends geprüft.

Falls dieser Test **fehlschlägt** (d. h. Backspace/Entf löscht den `hard_break` nicht sauber,
verschluckt Text oder fusioniert falsch), ist die Korrektur **nicht** vorab in diesem Plan
spezifiziert, sondern wird dann test-getrieben nachgezogen (voraussichtlicher Ansatzpunkt:
ein zusätzliches, explizites `Backspace`/`Delete`-Command-Paar analog zu
`removePageBreakBackward`/`removePageBreakForward` aus `seitenumbruch-code.md` Abschnitt 3.4,
falls sich der native Pfad als unzuverlässig erweist) — laut aktuellem Codebefund (Abschnitt 0.8)
gibt es aber keinen Hinweis, dass das nötig sein wird, da derselbe Mechanismus bereits für jede
andere Zeichenlöschung im Produkt in Produktion ist.

---

## 6. `src/formats/shared/editor/Toolbar.tsx` — optionaler Button (P1, kein Blocker)

Anforderung Abschnitt 1 Zeile 2 stuft dies explizit als „Nice-to-have, kein Blocker" ein.
Umgesetzt wird er trotzdem (geringer Aufwand, konsistent mit dem übrigen Toolbar-Umfang),
aber **nicht** als Voraussetzung für den Abschluss dieses Tickets behandelt.

Platzierung: in der „Einfügen"-Gruppe, nach „Tabelle einfügen" (Zeilen 228–239), vor dem
„Bild"-Label (241–244) — dieselbe Gruppe wie in `seitenumbruch-code.md` Abschnitt 5 für den
Seitenumbruch-Button vorgesehen (dort **vor** diesem Button, da Seitenumbruch dort zuerst
platziert wurde; Reihenfolge beider Tickets ist bei gemeinsamer Umsetzung untereinander
abzustimmen, aber unabhängig voneinander funktional).

**Eingebettetes SVG, kein Unicode/Emoji** (Anforderung Zeile 159, `FEATURE-SPEC-DOCX-ODT.md`
Abschnitt 20.1 — bereits als eigenständiges, umfassenderes Problem für die **bestehenden**
Toolbar-Symbole dokumentiert, hier nur sichergestellt, dass der **neue** Button dieses Muster
nicht fortschreibt):

```tsx
function HardBreakIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 5h9a2 2 0 0 1 0 4H7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      <path d="M9 7l-2 2 2 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M3 11h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

// … innerhalb von Toolbar(), nach dem Tabelle-Button (Zeile 239), vor dem Bild-Label (241):
<button
  type="button"
  title="Zeilenumbruch einfügen"
  aria-label="Zeilenumbruch einfügen"
  onMouseDown={(e) => {
    e.preventDefault()
    run(view, insertHardBreak())
  }}
  className="px-2 py-1 rounded text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
>
  <HardBreakIcon />
</button>
```

Symbol: ein Pfeil, der nach rechts läuft und nach unten-links abknickt (klassisches
„Zeilenumbruch"-Piktogramm, in Word/verbreiteten Icon-Sets üblich), eindeutig von Tabelle
(`⊞`), Bild (Bildrahmen) und dem in `seitenumbruch-code.md` vorgeschlagenen
Seitenumbruch-Icon (zwei Eckenpaare) unterscheidbar. `title`/`aria-label` liefern denselben,
für Playwright per `getByTitle('Zeilenumbruch einfügen')` adressierbaren Namen wie die
übrigen Buttons.

Import-Ergänzung in `Toolbar.tsx`: `insertHardBreak` zur bestehenden
`import { ... } from './commands'`-Liste (Zeilen 5–17) hinzufügen.

Kein Deaktivieren in Tabellen-/Listen-Kontext — `insertHardBreak` bleibt dort funktional
(Anforderung 3.9), ein deaktivierter Button widerspräche dem geforderten Verhalten.

---

## 7. Kontextmenü / Menüleiste (Menüpunkte 3–4) — außerhalb des Scopes, kein Code

Anforderung selbst stuft beide als „Nice-to-have, kein Blocker" ein und stellt fest, dass der
Editor aktuell **kein** eigenes Kontextmenü besitzt (identischer Befund wie
`seitenumbruch-req.md` Abschnitt 1) und keine Menüleiste existiert. Bestätigt durch
Durchsicht von `WordEditor.tsx`/`Toolbar.tsx` — kein `oncontextmenu`-Handler, keine
Menüleisten-Komponente im gesamten `src/`-Baum. Keine Codeänderung in diesem Ticket.

---

## 8. Sichtbare Unterscheidung Zeilen-/Absatzumbruch (Menüpunkt 6) — dokumentierte, akzeptierte Einschränkung

Bestätigt: die App hat keinerlei „¶ ein-/ausblenden"-Toggle. `hard_break.toDOM()`
(`schema.ts:40–42`) rendert ein einfaches `<br>` ohne visuelle Markierung. Anforderung
Abschnitt 1 Zeile 6 und Abschnitt 7 (Freigabekriterium) lassen ausdrücklich **„bewusst als
akzeptierte Einschränkung dokumentiert"** als gültigen Abschluss zu (Alternative zu „behoben").

**Entscheidung dieses Plans: dokumentieren, nicht beheben.** Begründung: eine korrekte
Umsetzung würde einen waschechten neuen Bedienelement-Typ einführen (Toggle-Button + globaler
Rendering-Modus für „Formatierungszeichen anzeigen", der **auch** Leerzeichen/Tabulatoren
(`text:s`/`w:tab`, bereits an anderer Stelle im Schema/Reader vorhanden) mit einschließen
müsste, um konsistent mit dem Word/LibreOffice-Vorbild zu sein) — das sprengt den engen
Geltungsbereich dieser Datei („ausschließlich die Funktion … per Umschalt+Enter", siehe
Geltungsbereich-Abschnitt der Anforderung) und würde besser als eigenständiges Ticket
(„Formatierungszeichen anzeigen") behandelt. Für **dieses** Ticket genügt die
Dokumentation der Einschränkung (hier + im Abnahme-Abschnitt 17) sowie der Hinweis, dass die
Rundreise-Verifikation deshalb technische Inspektion (Export-Diff, wie in Abschnitt 14
beschrieben) statt bloßen Hinsehens erfordert — exakt wie die Anforderung selbst es in
Abschnitt 1 Zeile 6 vorwegnimmt.

---

## 9. DOCX-Export — `src/formats/docx/writer.ts` — keine Code-Änderung

`inlineToRuns` (Zeilen 39–65), Fall `hard_break` (58–61):
```ts
} else if (node.type === 'hard_break') {
  flush()
  runs.push('<w:r><w:br/></w:r>')
}
```
Bestätigt korrekt (Anforderung 3.5, kein `w:type` = OOXML-Default `textWrapping`, identisch zu
echtem Word). **Empfohlene, rein dokumentierende Ergänzung** (kein Verhaltensunterschied),
damit ein künftiger `seitenumbruch`-Patch diesen Codepfad nicht versehentlich mit einem
Seitenumbruch verwechselt:
```ts
} else if (node.type === 'hard_break') {
  flush()
  // Ausschließlich Zeilenumbruch (Umschalt+Enter) — kein w:type-Attribut, OOXML-Default
  // "textWrapping". Seitenumbruch (Strg+Enter, siehe seitenumbruch-req.md) ist ein
  // eigenständiges Datenmodell-Konzept (paragraph/heading-Attribut `breakBefore`, siehe
  // seitenumbruch-code.md Abschnitt 8) und wird NICHT über diesen hard_break-Zweig
  // geschrieben — beide Zweige müssen unabhängig bleiben.
  runs.push('<w:r><w:br/></w:r>')
}
```

---

## 10. DOCX-Import — `src/formats/docx/reader.ts` — keine Code-Änderung, Testpflicht + Kommentar

`decodeParagraphRuns` (Zeilen 124–143), Fall `w:br` (132–133):
```ts
} else if (child.namespaceURI === OOXML_NAMESPACES.w && child.localName === 'br') {
  runs.push({ kind: 'break' })
}
```
**Keine Codeänderung in diesem Ticket** — die in Anforderung 3.6/Grenzfall 13 beschriebene
Lücke (`w:type="page"`/`"column"` wird identisch zu einem normalen Zeilenumbruch gelesen) ist
laut Geltungsbereich der Anforderung explizit Aufgabe von `seitenumbruch-req.md`/einer
künftigen Spaltenumbruch-Spec, **nicht** dieses Tickets. Pflicht **dieses** Tickets:
1. **Dokumentierender Kommentar** direkt am Codeort, damit die Lücke nicht implizit bleibt:
   ```ts
   } else if (child.namespaceURI === OOXML_NAMESPACES.w && child.localName === 'br') {
     // BEKANNTE, DOKUMENTIERTE LÜCKE (zeilenumbruch-manuell-req.md Abschnitt 3.6/Grenzfall 13,
     // seitenumbruch-req.md Abschnitt 3.5): liest JEDES <w:br>, unabhängig von w:type.
     // <w:br w:type="page"/> und <w:br w:type="column"/> werden dadurch fälschlich als
     // normaler Zeilenumbruch (hard_break) gelesen. Behebung ist Aufgabe von
     // seitenumbruch-code.md (Fallunterscheidung nach w:type). Absichtlich noch NICHT hier
     // behoben — siehe docx/__tests__/external-fixtures.test.ts, Testgruppe
     // "hard_break vs. page/column break", die dieses Verhalten aktiv sichtbar hält.
     runs.push({ kind: 'break' })
   }
   ```
2. **Expliziter Unit-Test**, der das aktuelle (Lücken-)Verhalten **sichtbar dokumentiert**
   statt es stillschweigend als „funktioniert" durchzuwinken (Testplan Punkt 6 der
   Anforderung) — siehe Abschnitt 14.1.

---

## 11. ODT-Export — `src/formats/odt/writer.ts` — keine Code-Änderung

`inlineToOdt` (Zeilen 46–59), Fall `hard_break` (50): `if (node.type === 'hard_break') return
'<text:line-break/>'`. Bestätigt korrekt (Anforderung 3.7). Keine Änderung.

---

## 12. ODT-Import — `src/formats/odt/reader.ts` — keine Code-Änderung, Testpflicht

`decodeInline`/`walk` (Zeilen 79–120), Fall `text:line-break` (108–109): bestätigt korrekt und
kontextunabhängig (Anforderung 3.8). `text:soft-page-break` hat keinen eigenen Zweig — fällt
in der `if`/`else if`-Kette (104–115) durch, ohne Wirkung — bestätigt **kein**
Fehlinterpretations-Bug. Pflicht **dieses** Tickets: expliziter Regressionstest (Grenzfall 14),
der das synthetisch nachgebaute Adjazenz-Fixture aus Abschnitt 0.3 gegen `readOdt` prüft
(Abschnitt 14.1) — reine Absicherung, dass ein künftiger Refactor von `walk` diesen
zufälligen „durchfallen lassen"-Vorteil nicht unbeabsichtigt in eine Fehlinterpretation
verwandelt. Kein Codewechsel nötig, aber ein optionaler, rein dokumentierender Kommentar an
derselben Stelle:
```ts
} else if (el.namespaceURI === ODF_NAMESPACES.text && el.localName === 'tab') {
  result.push({ type: 'text', text: '\t', marks: marks.length ? marks : undefined })
}
// Bewusst KEIN Zweig für text:soft-page-break (reiner Rendering-Hinweis, kein manueller
// Umbruch, siehe seitenumbruch-req.md Abschnitt 3.7) — fällt hier unbehandelt durch und hat
// dadurch korrekt KEINE Auswirkung auf das Ergebnis. Siehe
// odt/__tests__/external-fixtures.test.ts, Testgruppe "soft-page-break wird nicht als
// hard_break fehlinterpretiert" (Grenzfall 14), die genau das absichert.
```

---

## 13. `playwright.config.ts` — Ergänzung Desktop-Firefox-Projekt

Aktuell (Zeilen 19–23):
```ts
projects: [
  { name: 'Desktop Chrome', use: { ...devices['Desktop Chrome'] } },
  { name: 'Mobile', use: { ...devices['Pixel 7'] } },
  { name: 'Tablet', use: { ...devices['iPad Mini'] } },
],
```
wird zu:
```ts
projects: [
  { name: 'Desktop Chrome', use: { ...devices['Desktop Chrome'] } },
  { name: 'Desktop Firefox', use: { ...devices['Desktop Firefox'] } },
  { name: 'Mobile', use: { ...devices['Pixel 7'] } },
  { name: 'Tablet', use: { ...devices['iPad Mini'] } },
],
```
Begründung: Zusatzbefund B (Abschnitt 0.4) — ohne diese Ergänzung gäbe es keine echte
Firefox-Abdeckung überhaupt in der Suite, und Testplan Punkt 4 der Anforderung verlangt
mindestens zwei Browser-Engines **speziell** für den `Shift-Enter`-Test (nicht irgendeine
zwei der drei bestehenden Projekte, von denen zwei auf derselben Chromium-Engine laufen).
Playwright installiert die Firefox-Engine bereits als Teil des Standard-`@playwright/test`-
Browser-Sets (`npx playwright install`), keine neue Abhängigkeit nötig. Alle **bestehenden**
E2E-Tests laufen dadurch zusätzlich auch unter Firefox — das ist eine bewusste, gewollte
Erweiterung der Gesamt-Testabdeckung, kein reiner Spezialfall nur für dieses Feature, und
sollte VOR den in Abschnitt 14.2 neuen Tests separat verifiziert werden (bestehende Suite
muss auch unter der neuen Firefox-Projektzeile grün bleiben, siehe Abschnitt 16, Baseline).

---

## 14. Testplan — neue/angepasste Tests

### 14.1 Unit-Tests (Vitest)

**a) `src/formats/docx/__tests__/roundtrip.test.ts`** — Ergänzung nach dem bestehenden Test
„preserves hard line breaks within a paragraph" (Zeilen 113–125):
```ts
it('preserves multiple consecutive hard breaks in the same paragraph', async () => {
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
  expect(content.filter((n: any) => n.type === 'hard_break')).toHaveLength(3)
})

it('preserves a hard break inside a heading', async () => {
  const original = doc([
    {
      type: 'heading',
      attrs: { level: 2, align: 'left' },
      content: [{ type: 'text', text: 'Zeile eins' }, { type: 'hard_break' }, { type: 'text', text: 'Zeile zwei' }],
    },
  ])
  const result = await roundTrip(original)
  expect(result.body.content).toHaveLength(1)
  expect((result.body as any).content[0].type).toBe('heading')
  expect((result.body as any).content[0].content.some((n: any) => n.type === 'hard_break')).toBe(true)
})

it('preserves a leading and trailing hard break (empty first/last line)', async () => {
  const original = doc([
    {
      type: 'paragraph',
      attrs: { align: 'left' },
      content: [{ type: 'hard_break' }, { type: 'text', text: 'Mitte' }, { type: 'hard_break' }],
    },
  ])
  const result = await roundTrip(original)
  const content = (result.body as any).content[0].content
  expect(content[0].type).toBe('hard_break')
  expect(content[content.length - 1].type).toBe('hard_break')
})
```

**b) `src/formats/odt/__tests__/roundtrip.test.ts`** — identische drei Tests (ODT-Variante),
nach Zeilen 113–125 eingefügt.

**c) `src/formats/docx/__tests__/external-fixtures.test.ts`** — neue, dedizierte
Testgruppe (dokumentiert bewusst die Grenzfall-13-Lücke, siehe Abschnitt 10):
```ts
describe('hard_break vs. page/column break — bekannte, dokumentierte Reader-Lücke (Grenzfall 13)', () => {
  it('reads a plain <w:br/> (saut_page.docx) as hard_break inside its paragraph', async () => {
    const buffer = readFileSync(join(FIXTURES_DIR, 'saut_page.docx'))
    const doc = await readDocx(new Blob([new Uint8Array(buffer)]))
    const hasHardBreak = JSON.stringify(doc.body).includes('"hard_break"')
    expect(hasHardBreak).toBe(true)
  })

  it('documents (does NOT yet correctly distinguish) that <w:br w:type="page"/> in the same ' +
    'file (saut_page.docx) is ALSO read as hard_break — known gap, see seitenumbruch-req.md', async () => {
    const buffer = readFileSync(join(FIXTURES_DIR, 'saut_page.docx'))
    const doc = await readDocx(new Blob([new Uint8Array(buffer)]))
    const hardBreakCount = (JSON.stringify(doc.body).match(/"hard_break"/g) ?? []).length
    // saut_page.docx contains 2× <w:br w:type="page"/> + 1× plain <w:br/> = 3 total; the
    // reader currently folds all three into hard_break. If this count ever drops (e.g.
    // because a future page-break patch starts filtering w:type="page" without also adding
    // its own node type), this test forces an explicit, conscious update — it must not just
    // silently start passing for the wrong reason.
    expect(hardBreakCount).toBe(3)
  })

  it('reads an explicit w:type="textWrapping" break (drawing.docx) as hard_break too', async () => {
    const buffer = readFileSync(join(FIXTURES_DIR, 'drawing.docx'))
    const doc = await readDocx(new Blob([new Uint8Array(buffer)]))
    expect(JSON.stringify(doc.body)).toContain('"hard_break"')
  })
})
```
(Imports `readFileSync`/`join`/`FIXTURES_DIR` bereits am Dateikopf vorhanden, siehe
`external-fixtures.test.ts:1–5`.)

**d) `src/formats/odt/__tests__/external-fixtures.test.ts`** — analoge Testgruppe:
```ts
describe('hard_break aus realen ODT-Fixtures (Grenzfall 13/14-Analogon für ODT)', () => {
  it('reads the styled, nested <text:line-break/> in TextLineBreakText.odt as hard_break', async () => {
    const buffer = readFileSync(join(FIXTURES_DIR, 'TextLineBreakText.odt'))
    const doc = await readOdt(new Blob([new Uint8Array(buffer)]))
    expect(JSON.stringify(doc.body)).toContain('"hard_break"')
  })

  it('does not misinterpret text:soft-page-break as hard_break (text-extract.odt has only the former)', async () => {
    const buffer = readFileSync(join(FIXTURES_DIR, 'text-extract.odt'))
    const doc = await readOdt(new Blob([new Uint8Array(buffer)]))
    expect(JSON.stringify(doc.body)).not.toContain('"hard_break"')
  })
})
```

**e) Neues synthetisches Fixture für Grenzfall 14 (exakte Adjazenz `line-break` + `soft-page-break`
im selben Absatz)** — kein reales Fixture mit dieser exakten Adjazenz gefunden (Abschnitt 0.3).
Neue Datei `src/formats/odt/__tests__/hardBreakVsSoftPageBreak.test.ts`, nach dem Muster von
`tests/e2e/docx.spec.ts`s `buildSampleDocx` (JSZip, aber hier als Vitest-Unit-Test gegen den
Reader direkt, kein Playwright nötig):
```ts
import JSZip from 'jszip'
import { readOdt } from '../reader'

const ODF_NS =
  'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" ' +
  'xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" ' +
  'xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" ' +
  'xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"'

async function buildOdtWithLineBreakAndSoftPageBreak(): Promise<Blob> {
  const zip = new JSZip()
  zip.file('mimetype', 'application/vnd.oasis.opendocument.text')
  zip.file(
    'content.xml',
    `<?xml version="1.0" encoding="UTF-8"?><office:document-content ${ODF_NS} office:version="1.3">` +
      `<office:body><office:text>` +
      `<text:p>Zeile eins<text:line-break/><text:soft-page-break/>Zeile zwei</text:p>` +
      `</office:text></office:body></office:document-content>`,
  )
  zip.file(
    'styles.xml',
    `<?xml version="1.0" encoding="UTF-8"?><office:document-styles ${ODF_NS} office:version="1.3"/>`,
  )
  zip.file(
    'meta.xml',
    `<?xml version="1.0" encoding="UTF-8"?><office:document-meta ${ODF_NS} office:version="1.3"/>`,
  )
  return zip.generateAsync({ type: 'blob' })
}

it('Grenzfall 14: text:line-break unmittelbar gefolgt von text:soft-page-break im selben Absatz', async () => {
  const blob = await buildOdtWithLineBreakAndSoftPageBreak()
  const parsed = await readOdt(blob)
  const content = (parsed.body as any).content[0].content
  const types = content.map((n: any) => n.type)
  expect(types.filter((t: string) => t === 'hard_break')).toHaveLength(1)
  expect(content.map((n: any) => n.text ?? n.type).join('|')).toBe('Zeile eins|hard_break|Zeile zwei')
})
```

**f) Cross-Format-Unit-Test** — neue Datei `src/formats/__tests__/crossFormatHardBreak.test.ts`
(Verzeichnis `src/formats/__tests__/` neu, da dieser Test **beide** Format-Module importiert —
kein bestehendes Verzeichnis ist dafür der natürliche Ort, ohne eine künstliche Abhängigkeit
`docx → odt` oder umgekehrt in eines der bestehenden `__tests__`-Verzeichnisse zu ziehen):
```ts
import { writeDocx } from '../docx/writer'
import { readDocx } from '../docx/reader'
import { writeOdt } from '../odt/writer'
import { readOdt } from '../odt/reader'
import type { WordDocumentContent } from '../shared/documentModel'

function doc(content: unknown[]): WordDocumentContent {
  return { body: { type: 'doc', content }, header: null, footer: null, meta: { title: '' } }
}

describe('Cross-Format-Rundreise: hard_break bleibt über DOCX↔ODT-Wechsel erhalten (Anforderung 5.2.3)', () => {
  it('DOCX → ODT → DOCX', async () => {
    const original = doc([
      {
        type: 'paragraph',
        attrs: { align: 'left' },
        content: [{ type: 'text', text: 'Zeile eins' }, { type: 'hard_break' }, { type: 'text', text: 'Zeile zwei' }],
      },
    ])
    const docxBlob = await writeDocx(original)
    const afterDocx = await readDocx(docxBlob)
    const odtBlob = await writeOdt(afterDocx)
    const afterOdt = await readOdt(odtBlob)
    const finalDocxBlob = await writeDocx(afterOdt)
    const final = await readDocx(finalDocxBlob)

    const content = (final.body as any).content[0].content
    expect(content.map((n: any) => n.text ?? n.type).join('|')).toBe('Zeile eins|hard_break|Zeile zwei')
  })

  it('ODT → DOCX → ODT', async () => {
    const original = doc([
      {
        type: 'paragraph',
        attrs: { align: 'left' },
        content: [{ type: 'text', text: 'Zeile eins' }, { type: 'hard_break' }, { type: 'text', text: 'Zeile zwei' }],
      },
    ])
    const odtBlob = await writeOdt(original)
    const afterOdt = await readOdt(odtBlob)
    const docxBlob = await writeDocx(afterOdt)
    const afterDocx = await readDocx(docxBlob)
    const finalOdtBlob = await writeOdt(afterDocx)
    const final = await readOdt(finalOdtBlob)

    const content = (final.body as any).content[0].content
    expect(content.map((n: any) => n.text ?? n.type).join('|')).toBe('Zeile eins|hard_break|Zeile zwei')
  })

  it('multiple breaks + heading + list + table survive a double format round trip (Grenzfall 16)', async () => {
    const original = doc([
      {
        type: 'heading',
        attrs: { level: 1, align: 'left' },
        content: [{ type: 'text', text: 'Titel' }, { type: 'hard_break' }, { type: 'text', text: 'Untertitel' }],
      },
      {
        type: 'bullet_list',
        content: [
          {
            type: 'list_item',
            content: [
              {
                type: 'paragraph',
                attrs: { align: 'left' },
                content: [{ type: 'text', text: 'Punkt' }, { type: 'hard_break' }, { type: 'text', text: 'Fortsetzung' }],
              },
            ],
          },
        ],
      },
    ])
    const docxBlob = await writeDocx(original)
    const afterDocx = await readDocx(docxBlob)
    const odtBlob = await writeOdt(afterDocx)
    const afterOdt = await readOdt(odtBlob)

    const serialized = JSON.stringify(afterOdt.body)
    expect(serialized).toContain('"Titel"')
    expect(serialized).toContain('"Untertitel"')
    expect(serialized).toContain('"Punkt"')
    expect(serialized).toContain('"Fortsetzung"')
    expect((serialized.match(/"hard_break"/g) ?? []).length).toBe(2)
  })
})
```

### 14.2 E2E-Tests (Playwright) — neue Datei `tests/e2e/zeilenumbruch.spec.ts`

Aufbau wie `tests/e2e/selection-regression.spec.ts` (`docxCard`/`odtCard`-Helper,
`page.locator('.ProseMirror')`, `page.getByRole('button', { name: 'Exportieren' })` +
`page.waitForEvent('download')` wie in `tests/e2e/docx.spec.ts:70–83`):

1. **Grundfall (Anforderung 3.1):** Text tippen, `page.keyboard.press('Shift+Enter')`
   (Playwright-Kurzform, äquivalent zu `down('Shift')`+`press('Enter')`+`up('Shift')`),
   weiter tippen → `page.locator('.ProseMirror p')` zählt weiterhin **genau 1** Absatz, im DOM
   existiert ein `<br>` zwischen den beiden Textteilen
   (`await expect(editor.locator('br')).toHaveCount(1)`).
2. **Selektion ersetzen (3.2):** Text tippen, `ControlOrMeta+a`, `Shift+Enter` → gesamter
   vorheriger Text ist weg, genau ein `<br>` im (jetzt leeren, bis auf den Umbruch) Absatz.
3. **Anfang/Ende (3.3, Grenzfall 1/2):** `Home` + `Shift+Enter` am Anfang → führende leere
   Zeile; `End` + `Shift+Enter` am Ende → leere Folgezeile, direkt weitertippen sichtbar danach.
4. **Mehrfach ohne Text (Grenzfall 3):** dreimal `Shift+Enter` hintereinander ohne Zwischentext
   → `editor.locator('br')` zählt **3**.
5. **Shift+Enter gefolgt von normalem Enter (Grenzfall 4):** Text, `Shift+Enter`, Text,
   `Enter`, Text → `.ProseMirror p` zählt **2** Absätze, der erste enthält genau **1** `<br>`.
6. **Leerer Absatz (Grenzfall 5):** neues Dokument, direkt `Shift+Enter` ohne vorherige
   Eingabe → kein Absturz, `editor.locator('br')` zählt 1.
7. **Überschrift (Grenzfall 6):** `setHeading`-Select (`getByLabel('Absatzformat')` →
   „Überschrift 1"), Text, `Shift+Enter`, Text → `.ProseMirror h1` zählt weiterhin **1**.
8. **Listenpunkt (Grenzfall 7):** „Aufzählung"-Button, Text, `Shift+Enter`, Text →
   `.ProseMirror li` zählt weiterhin **1**, kein neuer `<li>`.
9. **Tabellenzelle (Grenzfall 8):** „Tabelle einfügen", in eine Zelle klicken, Text,
   `Shift+Enter`, Text → Zellenanzahl unverändert (`.ProseMirror td` weiterhin wie nach
   Einfügen), Inhalt beider Zeilen in derselben Zelle sichtbar.
10. **Bild-Nachbarschaft (Grenzfall 9, deckt Zusatzbefund F ab):**
    a) Bild einfügen, Cursor per Klick **im Text davor** (nicht auf dem Bild) positionieren,
       `Shift+Enter` → Bild bleibt sichtbar (`editor.locator('img')` weiterhin **1**), an
       unveränderter Position relativ zum übrigen Inhalt.
    b) Bild per `ArrowLeft`/`ArrowRight`-Navigation direkt **anwählen** (NodeSelection), dann
       `Shift+Enter` → **Pflicht-Assertion, die den in Abschnitt 0.7 verifizierten Bug
       abdeckt:** `editor.locator('img')` muss weiterhin **1** sein (nicht 0) — dieser
       Testfall ist der wichtigste neue Test dieses Tickets, da er einen bereits vor
       Implementierung nachgewiesenen, sonst stillen Datenverlust abfängt.
11. **Löschen (Grenzfall 10, Menüpunkt 5):** Text, `Shift+Enter`, Text → Cursor direkt nach
    dem Umbruch positionieren (`Home` in der zweiten Zeile, dann `Backspace`) → `<br>` weg,
    beide Textteile zu einer durchgehenden Zeile verschmolzen, **kein** Zeichenverlust
    (exakter String-Vergleich per `editor.textContent()`).
12. **Undo/Redo (3.13):** nach Schritt 1 `ControlOrMeta+z` → Zustand vor dem Umbruch
    wiederhergestellt (`br`-Anzahl 0); `ControlOrMeta+y`/`ControlOrMeta+Shift+z` → Umbruch
    wieder da.
13. **Navigation (3.12, Grenzfall 11):** Text+Umbruch+Text, Cursor an den Anfang, dann
    `n`-mal `ArrowRight` zählen, bis er hinter dem `<br>` steht → muss exakt „Länge Zeile 1 + 1"
    Tastendrücke sein (per `page.evaluate(() => window.getSelection()?.anchorOffset)`-artiger
    Prüfung oder indirekt über Tipp-Test: nach den ersten `k` Pfeiltasten-Drücken eingetippter
    Marker-Text muss in der **zweiten** Zeile erscheinen, nicht mehr in der ersten).
14. **Doppelklick-Wortgrenze (Grenzfall 12):** „WortAvor" + `Shift+Enter` + „Wortnach" →
    Doppelklick auf „vor" (unmittelbar vor dem Umbruch) → Selektionstext (per
    `page.evaluate(() => window.getSelection()?.toString())`) ist exakt `"vor"`, ohne den
    Umbruch/das nachfolgende Wort einzuschließen.
15. **Sehr viele Umbrüche (Grenzfall 17):** 60× `Shift+Enter` in einer Schleife → UI bleibt
    responsiv (Test läuft ohne Timeout durch), `editor.locator('br')` zählt **60**, danach
    Export → Re-Import (Muster wie `docx.spec.ts`) → weiterhin 60.
16. **Import aus fremder Word-Datei (3.6, Anforderung 5.2 Testfall 6):**
    `input.setInputFiles({ ..., buffer: readFileSync('tests/fixtures/external/docx/drawing.docx') })`
    in der DOCX-Karte → Export → JSZip-Prüfung `documentXml` enthält `<w:br/>` → Re-Import →
    weiterhin vorhanden (Muster identisch zu `docx.spec.ts:85–125`).
17. **Import aus fremder LibreOffice-Datei (3.8, Anforderung 5.2 Testfall 7):** analog mit
    `tests/fixtures/external/odt/TextLineBreakText.odt` in der ODT-Karte.
18. **DOCX→ODT-„Cross-Format" via echter Tastatur + Download, Format-Wechsel programmatisch**
    (siehe Zusatzbefund E/Abschnitt 0.6): in der DOCX-Karte per echter Tastatur einen Umbruch
    erzeugen, exportieren (`page.waitForEvent('download')`), den heruntergeladenen Buffer per
    `readDocx` (importiert im Testfile aus `src/formats/docx/reader`) einlesen, das
    resultierende `body`-JSON direkt an `writeOdt` übergeben, das Ergebnis per `readOdt`
    zurücklesen → Assertion auf `hard_break` im Ergebnis-JSON. Umgekehrte Richtung
    symmetrisch (ODT-Karte → `readOdt` → `writeDocx` → `readDocx`).
19. **Zwischenablage-Abgrenzung (3.11, Grenzfall 18):** Umbruch in einem Absatz erzeugen,
    danach per `page.evaluate` einen mehrzeiligen Text ins `clipboard` schreiben und
    `Ctrl+V` simulieren (oder direkt `page.keyboard.insertText`-Alternative via
    `dispatchEvent('paste', …)`, falls Playwright-Clipboard-Permissions nötig sind) →
    resultiert in zusätzlichen Absätzen, der ursprüngliche `hard_break` bleibt an seiner
    Position unverändert (`editor.locator('br')` weiterhin exakt 1 an unveränderter
    Reihenfolge-Position) — bestätigt die in Anforderung 3.11 festgelegte, bewusste
    Abgrenzung, kein neuer Code hierfür nötig.

Alle obigen Tests laufen automatisch unter **allen** in `playwright.config.ts` konfigurierten
Projekten (Abschnitt 13: Desktop Chrome, Desktop Firefox, Mobile, Tablet) — Testplan Punkt 4
der Anforderung ist damit für Punkt 1 (und alle anderen Testfälle dieser Datei) automatisch
über mindestens zwei unterschiedliche Engines (Chromium via Desktop Chrome, Gecko via Desktop
Firefox, zusätzlich WebKit via Tablet) erfüllt, ohne test-lokale Sonderkonfiguration.

### 14.3 Ergänzung `tests/e2e/selection-regression.spec.ts` (Grenzfall 15, Pflicht)

Neuer `test()` **innerhalb** des bestehenden `describe`-Blocks (Zeilen 7–72), nicht in einer
separaten Datei, damit er dauerhaft Teil der etablierten Selection-Sync-Regressionssuite
bleibt:
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
(`odtCard(page)` ist bereits Kontext der Datei — Test läuft für die ODT-Karte, analoge
Ergänzung mit `docxCard` optional, da die Anforderung sich nicht auf ein bestimmtes Format
beschränkt und der Mechanismus formatunabhängig im gemeinsamen Editor sitzt.)

---

## 15. Grenzfall-Mapping

| # | Grenzfall | Status nach diesem Plan |
|---|---|---|
| 1 | Umbruch am Absatzanfang | Testfall 14.2 Nr. 3 — funktioniert bereits durch `replaceSelectionWith`, keine Sonderbehandlung nötig |
| 2 | Umbruch am Absatzende | Testfall 14.2 Nr. 3 — dito |
| 3 | Mehrfach ohne Text | Testfall 14.2 Nr. 4 |
| 4 | Umbruch + Enter in Folge | Testfall 14.2 Nr. 5 |
| 5 | Umbruch in leerem Absatz | Testfall 14.2 Nr. 6 |
| 6 | Umbruch in Überschrift | Testfall 14.2 Nr. 7 |
| 7 | Umbruch in Listenpunkt | Testfall 14.2 Nr. 8, zusätzlich reale Fixtures `EasyList.odt`/`ListStyleResolution.odt` (Abschnitt 0.2) für Import |
| 8 | Umbruch in Tabellenzelle | Testfall 14.2 Nr. 9 — **bekannte Restlücke:** `CellSelection` nicht separat abgefangen (Abschnitt 3.4), teilt sich mit `insertImage`/`insertTable`, nicht in diesem Ticket behoben |
| 9 | Umbruch neben Bild | Testfall 14.2 Nr. 10a/b — **10b ist die kritische Regression aus Zusatzbefund F**, durch Guard in Abschnitt 3.2 behoben |
| 10 | Backspace/Entf am Umbruch | Testfall 14.2 Nr. 11 — kein neuer Code (Abschnitt 0.8), nur Testverifikation |
| 11 | Pfeiltasten über den Umbruch | Testfall 14.2 Nr. 13 — bereits strukturell erfüllt (Zusatzbefund D, Abschnitt 0.5) |
| 12 | Doppelklick-Wortgrenze | Testfall 14.2 Nr. 14 — natives Browser-Verhalten auf einem atomaren `<br>`, keine PM-spezifische Logik nötig |
| 13 | Import mit `w:br`+`w:br[type=page/column]` | **Bewusst nicht behoben in diesem Ticket** (Abgrenzung an `seitenumbruch-req.md`), aber jetzt explizit dokumentiert + regressionsgetestet (Abschnitt 10, 14.1c) statt implizit unbekannt |
| 14 | `text:line-break` + `text:soft-page-break` | Bereits korrekt (kein Fehlinterpretations-Bug, Abschnitt 0.1/12), zusätzlich synthetisches Adjazenz-Fixture (14.1e) |
| 15 | Selection-Sync-Regression mit Umbruch | Abschnitt 14.3 — neuer Pflichttest in bestehender Suite |
| 16 | Cross-Format DOCX↔ODT, mehrere Umbrüche | Abschnitt 14.1f (Unit) — echte UI-Cross-Format-Funktion existiert nicht (Zusatzbefund E) |
| 17 | 50+ Umbrüche | Testfall 14.2 Nr. 15 — Pagination misst nur Top-Level-Blockhöhen (`pagination.ts:33–37`), ein einzelner sehr hoher Absatz ist unproblematisch für die Performance dieses Mechanismus |
| 18 | Zwischenablage-Einfügen neben vorhandenem Umbruch | Testfall 14.2 Nr. 19 — bestätigt bewusste Abgrenzung aus Anforderung 3.11, kein Code |

---

## 16. Rundreise-Anforderung — Umsetzung

### 16.1 Baseline (5.1, Regressionsschutz)

- Bestehende `tests/e2e/docx.spec.ts`, `tests/e2e/odt.spec.ts`, beide
  `roundtrip.test.ts`, beide `external-fixtures.test.ts` müssen **vor und nach** allen
  Änderungen dieses Plans grün bleiben — insbesondere unter dem in Abschnitt 13 neu
  hinzugefügten `'Desktop Firefox'`-Projekt (erstmalige Ausführung der gesamten
  Bestandssuite unter Firefox als Nebeneffekt dieses Tickets; jeder dabei neu auftretende
  Firefox-spezifische Fehlschlag ist **kein** Bestandteil dieses Feature-Tickets, muss aber
  gemeldet/separat verfolgt werden, bevor `'Desktop Firefox'` dauerhaft in der CI verbleibt).
- `saut_page.docx`/`bug57031.docx`/`bug65649.docx` (Grenzfall 13) und `text-extract.odt`/
  `sections.odt` (Grenzfall 14) müssen weiterhin **ohne Absturz** importierbar bleiben
  (bereits durch bestehende generische `external-fixtures.test.ts`-Suiten abgedeckt).
- Nach der Keymap-Ergänzung (Abschnitt 4) muss verifiziert bleiben, dass reines `Enter`
  (ohne Shift) weiterhin `splitListItem`/`baseKeymap`-Verhalten auslöst — abgedeckt durch
  die bereits bestehenden Tests in `tests/e2e/selection-regression.spec.ts` (Absatz-Split
  bei `Enter`, Zeilen 14–32/52–71), die durch die Keymap-Änderung strukturell unberührt
  bleiben (`'Shift-Enter'` ist ein separater Bindungsschlüssel, Abschnitt 4).

### 16.2 Feature-Rundreise (5.2)

| Testfall (Anforderung 5.2) | Abdeckung in diesem Plan |
|---|---|
| 1. Neues Dokument, Umbruch per echter Tastatur, DOCX | 14.2 Nr. 1, 16 |
| 2. Dasselbe, ODT | 14.2 Nr. 1 (odtCard-Variante), 17 |
| 3. Cross-Format beide Richtungen | 14.2 Nr. 18 (E2E-Tastatur + programmatischer Format-Wechsel, Zusatzbefund E) **und** 14.1f (reine Unit-Verkettung) |
| 4. Mehrere Umbrüche im selben Absatz | 14.2 Nr. 4, 15; 14.1a/b |
| 5. Umbruch + andere Strukturen (Liste/Tabelle/Bild/Überschrift) | 14.2 Nr. 7–10; 14.1f (kumulativer Test) |
| 6. Import echte Word-Datei | 14.2 Nr. 16; 14.1c |
| 7. Import echte LibreOffice-Datei | 14.2 Nr. 17; 14.1d |
| 8. Doppelte Rundreise mit allen Features | 14.1f (dritter Test, „multiple breaks + heading + list + table") — vollständige Abdeckung aller in `FEATURE-SPEC-DOCX-ODT.md` Abschnitte 3–14 genannten Features wäre ein eigener, größerer Testfall außerhalb des engen Geltungsbereichs dieser Datei; hier auf die für `hard_break` relevanten Strukturen (Überschrift, Liste) beschränkt — vollständige Multi-Feature-Rundreise bleibt Aufgabe der jeweiligen Feature-eigenen Tickets/der Gesamt-Testmatrix (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 21) |

---

## 17. Abnahme-Checkliste (Anforderung Abschnitt 7)

- [ ] Entscheidung getroffen und dokumentiert: expliziter Command + Keymap-Eintrag
      (Abschnitt 1), nicht länger nur nativer Fallback.
- [ ] `insertHardBreak()` in `commands.ts` inkl. `NodeSelection`-Guard (Abschnitt 3.2,
      behebt den in Abschnitt 0.7 verifizierten Bild-Lösch-Bug).
- [ ] `'Shift-Enter'`-Keymap-Eintrag in `WordEditor.tsx` (Abschnitt 4).
- [ ] Löschverhalten (Backspace/Entf) per E2E-Test verifiziert, kein neuer Code nötig
      (Abschnitt 0.8, 5, Testfall 14.2 Nr. 11) — Ergebnis hier nachzutragen, falls der Test
      wider Erwarten fehlschlägt.
- [ ] Alle Testfälle aus Abschnitt 6 der Anforderung automatisiert vorhanden und grün,
      inklusive des zuvor komplett fehlenden E2E-Tests (Abschnitt 14.2).
- [ ] Alle 18 Grenzfälle einzeln befundet (Abschnitt 15 dieser Datei).
- [ ] Baseline-Rundreise (5.1) bleibt grün, inklusive unter dem neu ergänzten
      `'Desktop Firefox'`-Playwright-Projekt (Abschnitt 13, 16.1).
- [ ] Feature-Rundreise (5.2) für DOCX, ODT und beide Cross-Format-Richtungen besteht
      (Abschnitt 16.2) — Cross-Format ausschließlich über die in Abschnitt 0.6 begründete
      Zwei-Ebenen-Strategie (E2E mit programmatischem Format-Wechsel + reine Unit-Kette), da
      keine UI-Cross-Format-Funktion existiert.
- [ ] Selection-Sync-Regressionstest mit Umschalt+Enter-Sequenz ergänzt und grün
      (Abschnitt 14.3, Grenzfall 15).
- [ ] Bekannte Einschränkung „keine visuelle Unterscheidung Zeilen-/Absatzumbruch" bewusst
      als akzeptiert dokumentiert (Abschnitt 8), nicht behoben — zulässig laut
      Freigabekriterium.
- [ ] Bekannte, dokumentierte Lücke „`w:type=page/column` wird wie `hard_break` gelesen"
      explizit befundet und regressionsgetestet (Abschnitt 10, 14.1c), nicht stillschweigend
      als korrekt durchgewunken — Behebung bleibt bei `seitenumbruch-code.md`.
- [ ] Toolbar-Button (Abschnitt 6) und Kontextmenü/Menüleiste (Abschnitt 7) — beide laut
      Anforderung „kein Blocker"; Button optional umgesetzt, Kontextmenü/Menüleiste bewusst
      ausgelassen (keine Grundlage im bestehenden Code).

Nach Erfüllung aller Punkte gilt der Backlog-Status von `zeilenumbruch-manuell` als
**vorhanden** (unqualifiziert) im Sinne von Anforderung Abschnitt 7 — mit den beiden in
Abschnitt 8 und Abschnitt 10 dieser Datei explizit dokumentierten, bewusst akzeptierten
Einschränkungen (keine visuelle ¶-Unterscheidung; `w:type=page/column`-Fehlklassifizierung
bis `seitenumbruch-code.md` umgesetzt ist).
