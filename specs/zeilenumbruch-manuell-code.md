# Umsetzungsplan „Manueller Zeilenumbruch (Umschalt+Enter)" — dateigenau, gegen den tatsächlichen Code geprüft

Bezug: `E:\docs\specs\zeilenumbruch-manuell-req.md` (Anforderung, Stand 2026-07-04),
`E:\docs\FEATURE-SPEC-DOCX-ODT.md` (Rahmenbedingungen, Abschnitte 2/15/18/19/20/21),
`E:\docs\specs\kopieren-code.md`/`kopieren-req.md` (teilt Schema-`leafText` +
`clipboardTextSerializer`), `E:\docs\specs\seitenumbruch-req.md`/`seitenumbruch-code.md`
(Nachbar-Feature, teilt sich den DOCX-`<w:br>`-Codepfad), `E:\docs\specs\einfuegen-req.md`
Abschnitt 3.13 (Abgrenzung Zwischenablage). **Code-Stand direkt gelesen und Zeile für Zeile
verifiziert am 2026-07-05** (Git-Repo `E:\docs`, Branch `main`); alle Zeilenangaben unten sind
gegen den tatsächlichen Dateiinhalt geprüft, nicht aus der Anforderungsdatei übernommen.

## WICHTIG — dieser Plan korrigiert einen früheren, inzwischen überholten Entwurf dieser Datei

Ein **älterer Stand dieser `code.md`** ging davon aus, dass für dieses Feature erst noch
- ein `insertHardBreak()`-Command **neu angelegt**,
- eine `'Shift-Enter'`-Keymap-Bindung **neu verdrahtet**,
- ein `hard_break.leafText` **ergänzt** und
- ein **Desktop-Firefox-Playwright-Projekt neu eingeführt**

werden müsste. **Das trifft auf den aktuellen Code nicht mehr zu.** Alle vier Bausteine
existieren inzwischen bereits — sie wurden im Zuge der Features **Kopieren** (`leafText`,
`clipboardTextSerializer`, `insertHardBreak`, `Shift-Enter`) und der **Clipboard-Browser-Matrix**
(Firefox-/Safari-Playwright-Projekte) eingebaut. Der wahre Arbeitsrest liegt damit an **anderer
Stelle** und ist in dieser überarbeiteten Fassung präzise benannt (identisch zur Korrektur in
`zeilenumbruch-manuell-req.md` Abschnitt 0):

**Kurzfassung des tatsächlichen Ergebnisses (Stand 2026-07-05):**
Erzeugungsweg (`insertHardBreak` + `Shift-Enter`), Schema (`hard_break` inkl. `leafText`) und
Serialisierung (DOCX-Writer/Reader, ODT-Writer/Reader) sind **vorhanden und im Kern korrekt**.
Es sind **keine** Schema- und **keine** Reader/Writer-Codeänderungen nötig. Die offene Arbeit ist:

1. **PFLICHT / Kern:** Der ausgelieferte `insertHardBreak()` (`commands.ts:83–90`) trägt einen
   **live erreichbaren, stillen Datenverlust-Bug** — bei selektiertem Bild/Tabelle
   (`NodeSelection`) löscht `replaceSelectionWith` den Knoten (Abschnitt 0.7/3). Muss durch einen
   Guard behoben werden, abgesichert durch einen Test, der ohne den Fix rot ist.
2. **PFLICHT:** Der Command hat für sein **eigenes** Verhalten **keine gezielte Testabdeckung** —
   **kein einziger** E2E-Test drückt `Shift+Enter` (verifiziert, Abschnitt 0.9). Vollständiger
   neuer Testkorpus (Unit + E2E) nötig.
3. **PFLICHT:** Der neue `zeilenumbruch`-E2E-Test läuft **nicht** automatisch auf Firefox/Safari:
   diese beiden Playwright-Projekte existieren zwar, sind aber per `testMatch:
   /clipboard.*\.spec\.ts/` **ausschließlich** auf die Clipboard-Specs beschränkt (Abschnitt
   0.10/13). Der neue Spec muss aktiv in ihre Reichweite gebracht werden.
4. **Entscheidung nötig (kein Neubau):** Touch-/Mobil-Zugang (Toolbar-Button **oder** dokumentierte
   Nicht-Unterstützung) — Abschnitt 6/8.
5. **Dokumentation:** bekannte DOCX-`w:type=page/column`-Import-Verwässerung (Abschnitt 10) und
   fehlende visuelle ¶-Unterscheidung (Abschnitt 9) sichtbar halten.

---

## 0. Codebefund aus direkter Verifikation (Stand 2026-07-05)

### 0.1 Bestätigt — Datenmodell, Command, Keymap, Serialisierung sind vorhanden

Gegen den tatsächlichen Dateiinhalt geprüft:

1. **Schema — `src/formats/shared/schema.ts:42–56`** definiert `hard_break`:
   `group: 'inline'`, `inline: true`, `selectable: false`, `parseDOM: [{ tag: 'br' }]`,
   `toDOM(): ['br']` — **und `leafText: () => '\n'` (Zeile 51)**. Der `leafText`-Eintrag ist
   vorhanden (Herkunft: „Kopieren", Kommentar Zeilen 46–50) und für dieses Feature relevant:
   ohne ihn liefert jede ProseMirror-Textextraktion (`Node.textContent`, `textBetween`, die
   Klartext-Zwischenablage) für einen `hard_break` den leeren String statt `'\n'`, zwei durch
   Umbruch getrennte Zeilen verschmölzen zu einem Wort. `paragraph`/`heading` (16–38) haben
   `content: 'inline*'`, `list_item` (146–152) `content: 'block+'`, Tabellenzellen aus
   `tableNodes({ cellContent: 'block+' })` (154) — `hard_break` ist überall zulässig, wo ein
   `paragraph`/`heading` vorkommen kann.
2. **Command — `src/formats/shared/editor/commands.ts:83–90`** exportiert bereits
   `insertHardBreak(): Command`. **Implementierung mit ungeschütztem `replaceSelectionWith`**
   (siehe wörtliches Zitat in Abschnitt 3.1) — Herkunft laut Kommentar (76–82): eingebaut als
   Testbarkeits-Voraussetzung für „Kopieren", **nicht** aus einer bewussten Umsetzung dieses
   Features. Trägt den Datenverlust-Bug aus 0.7.
3. **Keymap — `src/formats/shared/editor/WordEditor.tsx:85–107`** bindet im ersten
   `keymap({...})`-Plugin `'Shift-Enter': insertHardBreak()` (Zeile 97); `insertHardBreak` ist
   dort bereits importiert (Zeile 12, `import { cutSelection, insertHardBreak } from './commands'`).
   `Enter: splitListItem(...)` (96) bleibt für reines `Enter` zuständig, `keymap(baseKeymap)`
   (108) ebenso. `'Shift-Enter'` ist ein eigener, von `Enter`/`Mod-Enter` unabhängiger
   Bindungsschlüssel — der native `insertLineBreak`-Fallback ist damit für `Shift-Enter` nicht
   mehr die Grundlage (sobald der Command `true` liefert — was er immer tut — ruft ProseMirror
   `preventDefault()` auf).
4. **Kein Toolbar-Button — `src/formats/shared/editor/Toolbar.tsx`** enthält keinen Eintrag für
   „Zeilenumbruch" (per Grep auf `insertHardBreak`/`Zeilenumbruch`/`hard_break`/`Shift`/
   `line-break`: **keine** Treffer). Einziger Zugang ist die Tastenkombination.
5. **DOCX-Writer — `src/formats/docx/writer.ts:60–62`** (`inlineToRuns`, 41–66):
   `hard_break` → `<w:r><w:br/></w:r>` ohne `w:type` (OOXML-Default `textWrapping`, identisch
   zu echtem Word).
6. **DOCX-Reader — `src/formats/docx/reader.ts:177–178`** (`out.push({ kind: 'break' })`) und
   **`:284–285`** (`runsToInline`: `kind === 'break' ? { type: 'hard_break' }`): **jedes**
   `<w:br>` wird unabhängig von `w:type` als `hard_break` gelesen. Keine Fallunterscheidung
   nach `w:type="page"`/`"column"`, keine `w:clear`-Auswertung (bekannte Lücke, 0.5/Abschnitt 10).
7. **ODT-Writer — `src/formats/odt/writer.ts:74`**: `hard_break` → `<text:line-break/>`.
8. **ODT-Reader — `src/formats/odt/reader.ts:150–151`** (`walk`): `text:line-break` →
   `{ type: 'hard_break' }`, kontextunabhängig. `text:s` (152–154) und `text:tab` (155–156)
   separat behandelt. `text:soft-page-break` hat **keinen** eigenen Zweig und fällt in der
   `if`/`else if`-Kette (146–163) folgenlos durch — wird **nicht** als `hard_break`
   fehlinterpretiert. Bestätigt sauber.
9. **Zwischenablage-Kopplung — `src/formats/shared/editor/clipboard.ts`**: `clipboardTextSerializer`
   ist in `WordEditor.tsx:124` als `EditorProps.clipboardTextSerializer` verdrahtet;
   `nodeToPlainText` (51–69) verlässt sich für Leaf-Nodes (`hard_break`) auf `leafText`
   (Zeilen 53–56) und für Absätze auf `node.textBetween(0, size, '\n')` (Kommentar 64–67:
   „ProseMirror's own logic is sufficient here now that hard_break.leafText is set"). Änderungen
   an `hard_break`/`leafText` brächen die Kopieren-Tests und umgekehrt.

### 0.2 Verifiziert — Testabdeckung: Serialisierung ja, echter Eingabeweg nein

- **Unit vorhanden (Reader/Writer):** `src/formats/docx/__tests__/roundtrip.test.ts:119–132`
  („preserves hard line breaks within a paragraph", prüft Reihenfolge
  `'Zeile eins|hard_break|Zeile zwei'`) und das ODT-Äquivalent
  `src/formats/odt/__tests__/roundtrip.test.ts:121–132`. Beide bauen das Dokument **direkt aus
  JSON** (`{ type: 'hard_break' }`), nicht über einen Tastatur-Eingabeweg.
- **Unit vorhanden (leafText/Klartext):** `clipboard.ts` wird über die Kopieren-Suite abgedeckt
  (`leafText === '\n'`, „keeps two hard_break-separated lines apart"). Prüft die
  Klartext-Extraktion, nicht das Einfügen per Taste.
- **E2E fehlt komplett für den echten Eingabeweg.** In `tests/e2e/*.spec.ts` presst **kein**
  Test `Shift+Enter`, um einen `hard_break` zu erzeugen (per Grep verifiziert). Der einzige
  Treffer auf „Shift-Enter" ist ein **Kommentar** in
  `tests/e2e/clipboard-roundtrip.spec.ts:239–240`, kein tatsächlicher `keyboard.press`. Der Weg
  Tastendruck → `insertHardBreak` → `hard_break` → Serialisierung ist **nie** im echten Browser
  nachgestellt; ebenso wenig der Datenverlust-Fall aus 0.7 oder die Selection-Sync-Regression
  mit Umschalt+Enter (Grenzfall 15). **Es gibt noch keine `tests/e2e/zeilenumbruch.spec.ts`**
  (verifiziert: Datei existiert nicht).

### 0.3 Verifiziert — Browser-Matrix existiert, ist aber auf Clipboard-Specs beschränkt

`playwright.config.ts:27–54` definiert **fünf** Projekte:
```ts
projects: [
  { name: 'Desktop Chrome', use: { ...devices['Desktop Chrome'], permissions: ['clipboard-read', 'clipboard-write'] } },   // Zeile 34, chromium
  { name: 'Mobile', use: { ...devices['Pixel 7'], permissions: ['clipboard-read', 'clipboard-write'] } },                   // Zeile 35, chromium (Touch)
  { name: 'Tablet', use: { ...devices['iPad Mini'] } },                                                                     // Zeile 36, webkit (Touch)
  { name: 'Desktop Safari (Clipboard)', testMatch: /clipboard.*\.spec\.ts/, use: { ...devices['Desktop Safari'] } },        // Zeilen 43–46, webkit, NUR Clipboard-Specs
  { name: 'Desktop Firefox (Clipboard)', testMatch: /clipboard.*\.spec\.ts/, use: { ...devices['Desktop Firefox'] } },      // Zeilen 50–53, firefox, NUR Clipboard-Specs
]
```
**Konsequenz (wichtige Korrektur gegenüber dem alten Entwurf):** Es gibt **bereits** echte
Firefox- und Safari-Desktop-Projekte — ein neues Firefox-Projekt anzulegen wäre falsch. Aber
beide sind per `testMatch: /clipboard.*\.spec\.ts/` **ausschließlich** auf Dateien beschränkt,
deren Name mit `clipboard…` beginnt. Eine neue `tests/e2e/zeilenumbruch.spec.ts` würde von
Firefox/Safari **nicht** erfasst. Für die in Anforderung Abschnitt 6 Punkt 5 geforderte
Abdeckung auf **mindestens zwei echten Engines** ist das aktiv zu regeln (Abschnitt 13) — nicht
durch ein neues Projekt, sondern durch Erweiterung der `testMatch`-Reichweite auf den neuen Spec.

### 0.4 Verifiziert — reale Fixtures für Grenzfall 13/14 sind bereits im Repo

Per `ls tests/fixtures/external/{docx,odt}/` bestätigt vorhanden — **keine neuen Binärdateien
nötig** (Inhalte laut `docx/__tests__/external-fixtures.test.ts` bzw. Anforderung 6.7):

| Datei | Format | Relevanz |
|---|---|---|
| `docx/drawing.docx` | DOCX | mehrere `<w:br/>` + ein expliziter `<w:br w:type="textWrapping" w:clear="all"/>` (deckt impliziten + expliziten `textWrapping`-Fall, 3.8-`w:clear`) |
| `docx/saut_page.docx` | DOCX | `<w:br w:type="page"/>` **und** einfaches `<w:br/>` im selben Dokument (Positiv-/Negativ-Kombination für Grenzfall 13) |
| `docx/bug57031.docx`, `docx/bug65649.docx` | DOCX | `<w:br/>` **und** `<w:br w:type="page"/>`; `bug65649` zusätzlich sehr viele Umbrüche (Grenzfall 17) |
| `odt/TextLineBreakText.odt` | ODT | genau ein `<text:line-break/>`, **verschachtelt in einem `text:span`** (Grenzfall 20) |
| `odt/EasyList.odt`, `odt/ListStyleResolution.odt` | ODT | `<text:line-break/>` **innerhalb von Listenpunkten** (Grenzfall 7 mit echter Fremddatei) |
| `odt/excelfileformat.odt` | ODT | `<text:line-break/>` **und** `<text:soft-page-break/>` im selben Dokument (nicht adjazent, siehe 0.5) |
| `odt/text-extract.odt`, `odt/sections.odt` | ODT | `<text:soft-page-break/>` **ohne** `<text:line-break/>` (sauberer „darf nicht fehlinterpretiert werden"-Negativtest) |

### 0.5 Zusatzbefund — kein reales Fixture mit `text:line-break` unmittelbar gefolgt von `text:soft-page-break` im selben Absatz

`excelfileformat.odt` enthält beide Elemente, aber nicht direkt aufeinanderfolgend im selben
Absatz. Für Grenzfall 14 exakt wie formuliert ist ein **synthetisches XML-Fixture** nötig
(Abschnitt 14.1e) — analog zur bereits in Anforderung 5.1 vorgesehenen Praxis „sonst synthetisch
als XML-Fixture nachgebaut".

### 0.6 Zusatzbefund — App hat keine Cross-Format-Konvertierungsfunktion in der UI

Jedes Format-Modul (DOCX-Karte, ODT-Karte) hat eine eigene Upload-/Export-Funktion, die nur den
eigenen Reader/Writer nutzt; es gibt **keine** „Speichern als anderes Format"-/„Konvertieren"-
Funktion (per Durchsicht von `src/App.tsx`/`src/app/*` und Grep auf `convert`/`Konvertier`
bestätigt). Ein per DOCX-Karte exportiertes `.docx` in die ODT-Karte hochzuladen, bricht per
Design mit einem Reader-Fehler ab (korrektes Verhalten). **Konsequenz:** Anforderung 5.2
Testfall 3 (Cross-Format DOCX↔ODT) ist **nicht** als reiner UI-E2E ausführbar und wird auf zwei
Ebenen abgedeckt:
- **Unit** (14.1f): reine Reader/Writer-Verkettung `readDocx → writeOdt → readOdt → writeDocx`
  (symmetrisch) mit einem `hard_break`-JSON-Fixture.
- **E2E** (14.2 Nr. 18): Umbruch per echter Tastatur in der DOCX-Karte erzeugen, exportieren
  (echter Download), danach den heruntergeladenen Buffer **im Test** per `readDocx` einlesen und
  dessen `body`-JSON an `writeOdt`/`readOdt` weiterreichen — der Tastatur-Teil bleibt echte
  Browser-Interaktion, nur der Format-Wechsel läuft programmatisch.

### 0.7 KRITISCH (verifiziert) — der ausgelieferte Command löscht ein selektiertes Bild/eine Tabelle

Der in `commands.ts:83–90` **ausgelieferte** `insertHardBreak()` verwendet das ungeschützte
Muster `state.tr.replaceSelectionWith(hard_break)`. Ist die aktuelle Selektion eine
`NodeSelection` auf einen block-artigen, nicht-inline Knoten — insbesondere ein **Bild**
(`image` hat im Schema **kein** `selectable: false`, ist also per Klick als `NodeSelection`
markierbar; `schema.ts:58–85`) oder eine **ganze Tabelle** — dann **löscht**
`replaceSelectionWith` den selektierten Knoten und ersetzt ihn durch einen neu synthetisierten
leeren Absatz mit dem `hard_break` darin:

```
doc(paragraph("Hallo"), image, paragraph("Welt")) + NodeSelection(image)
+ state.tr.replaceSelectionWith(hard_break.create())
→ doc(paragraph("Hallo"), paragraph(hard_break), paragraph("Welt"))   // Bild ist WEG
```

Kein Fehler, keine Exception — **stiller** Verlust. Grund: `Selection.replaceWith`
ruft `tr.replaceRangeWith(from, to, node)`; für ein inline-Node (`hard_break`) überspringt
`replaceRangeWith` die für Block-Nodes vorgesehene `insertPoint`-Anpassung und ersetzt die volle
Node-Range durch die inline Slice — die umgebende Fit-Logik synthetisiert automatisch einen
Absatz, statt das Bild zu erhalten. Über normale Bedienung direkt erreichbar (Bild anklicken →
`NodeSelection` → Umschalt+Enter). Verletzt Grenzfall 9 und das Grundprinzip „kein stiller
Datenverlust" (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 18/20.4). **Behebung ist Pflichtbestandteil
der Abnahme** (Abschnitt 3, Grenzfall 9, Abschnitt 17).

> Randnotiz: `insertTable`/`insertImage` (`commands.ts:66–74`, `92–102`) verwenden dasselbe
> ungeschützte `replaceSelectionWith`. Deren vorbestehende Exposition ist **nicht** Gegenstand
> dieses Tickets — hier ist nur der über `Shift-Enter` erreichbare `hard_break`-Fall
> abzusichern. `CellSelection` (mehrere ganze Zellen markiert, eigener Selektionstyp aus
> `prosemirror-tables`) wird vom Guard-Muster nicht erfasst — Grenzfall 8b, separat getestet
> (Abschnitt 3.3/14.2 Nr. 9b).

### 0.8 Zusatzbefund — Löschen (Menüpunkt 5/Grenzfall 10) braucht keinen neuen Command

`baseKeymap`s `Backspace`/`Delete` (`prosemirror-commands`) sind
`chainCommands(deleteSelection, joinBackward/Forward, selectNodeBackward/Forward)` — keine dieser
Teil-Commands behandelt „lösche das inline Atom vor/nach einer kollabierten Cursor-Position
innerhalb eines Textblocks". Das Löschen eines Einzelzeichens mitten im Text läuft im gesamten
Editor bereits heute über nativen Browser-Lösch-Mechanismus + DOM-Reconciliation — **kein**
`hard_break`-Sonderfall. Konsequenz: **kein neuer Code** für Menüpunkt 5, aber **Testpflicht**
(Grenzfall 10, 14.2 Nr. 11), da für `hard_break` spezifisch noch nie verifiziert.

### 0.9 Zusatzbefund — `hard_break` ist bereits strukturell atomar

`hard_break` hat keinen `content`-Ausdruck → `isLeaf === true` → `isAtom === true` automatisch
(ohne explizites `atom: true`). Pfeiltasten-Navigation/Selektion behandeln jeden `isAtom`-Node
als unteilbare Einheit — Anforderung 3.5/Menüpunkt 8/Grenzfall 11 sind **durch das bestehende
Schema erfüllt**, keine Schemaänderung. Offen nur die Testabdeckung (14.2 Nr. 13/14).

---

## 1. Architekturentscheidung — bereits getroffen (expliziter Command), bleibt

Anforderung Abschnitt 1/7 verlangte eine Entweder-Oder-Klärung „expliziter Command **oder**
nativer Fallback". Diese Frage ist im aktuellen Code **bereits zugunsten des expliziten
Command beantwortet** (`insertHardBreak` + `Shift-Enter`, 0.1). Dieser Plan bestätigt und
behält diese Entscheidung — sie ist deterministisch, hängt an keiner Browser-Eigenheit
(`preventDefault` sobald der Command `true` liefert), folgt dem bestehenden Muster von
`insertImage`/`insertTable` und erfüllt die „ein Undo-Schritt"-Anforderung (3.15) strukturell
über eine einzige `dispatch`-Transaktion. **Kein Neubau, nur Absicherung + Bugfix.**

---

## 2. Schema — `src/formats/shared/schema.ts` — keine Änderung

`hard_break` (Zeilen 42–56) bleibt **unverändert**, inklusive `leafText: () => '\n'` (Zeile 51,
darf **nicht** entfernt werden — Kopplung an Kopieren, 0.1 Punkt 9). Kein neues Attribut, kein
`atom: true` (bereits strukturell atomar, 0.9). Falls künftig `seitenumbruch`/eine
Spaltenumbruch-Spec einen `page_break`-Node oder ein `breakBefore`-Attribut ergänzt, bleibt
`hard_break` davon unberührt — beide teilen sich nur den `<w:br>`-Elementnamen im DOCX-Pfad,
nicht das Schema.

---

## 3. Commands — `src/formats/shared/editor/commands.ts` — Bugfix am bestehenden `insertHardBreak`

Dies ist die **einzige Pflicht-Codeänderung** dieses Tickets.

### 3.1 Ist-Zustand (fehlerhaft, ausgeliefert)

`commands.ts:83–90`:
```ts
export function insertHardBreak(): Command {
  return (state, dispatch) => {
    if (dispatch) {
      dispatch(state.tr.replaceSelectionWith(wordSchema.nodes.hard_break.create()).scrollIntoView())
    }
    return true
  }
}
```
Fehler: ungeschütztes `replaceSelectionWith` → Datenverlust bei `NodeSelection` auf Bild/Tabelle
(0.7).

### 3.2 Soll-Zustand (mit Guard)

Import-Ergänzung — Zeile 1 aktuell:
```ts
import type { Command, EditorState } from 'prosemirror-state'
```
wird zu:
```ts
import { NodeSelection, TextSelection, type Command, type EditorState } from 'prosemirror-state'
```
(`NodeSelection`/`TextSelection` als **Werte**, nicht nur Typen, für den Guard.)

`insertHardBreak()` (83–90) wird ersetzt durch:
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
        // den selektierten Knoten (verifiziert, siehe zeilenumbruch-manuell-req.md 0.7 /
        // zeilenumbruch-manuell-code.md 0.7). Stattdessen einen neuen Absatz mit dem Umbruch
        // NACH dem Knoten einfügen — der Knoten selbst bleibt vollständig erhalten
        // (Anforderung 3.3/Grenzfall 9).
        const after = selection.to
        tr = tr.insert(after, wordSchema.nodes.paragraph.create(null, breakNode))
        tr = tr.setSelection(TextSelection.create(tr.doc, after + 1))
      } else {
        // Normalfall: Cursor mitten im Text, am Absatzanfang/-ende, im leeren Absatz, oder
        // eine Text-/Cross-Node-Selektion über mehrere Wörter — replaceSelectionWith ersetzt
        // eine vorhandene Selektion (Anforderung 3.2) bzw. fügt am Cursor ein (3.1), exakt wie
        // insertImage/insertTable es bereits tun.
        tr = tr.replaceSelectionWith(breakNode)
      }
      dispatch(tr.scrollIntoView())
    }
    return true
  }
}
```

**Rückgabewert bleibt immer `true`:** Anforderung 3.4/Grenzfall 5 verlangt, dass auch der leere
Absatz und Anfang/Ende einen Umbruch erzeugen, nie stillschweigend zum No-Op werden. Ein `false`
würde die Taste ungehandelt lassen und (Abschnitt 1) den nativen Fallback reaktivieren — bewusst
vermieden. **Ein einziger `tr`, ein einziger `dispatch`:** erfüllt „ein Undo-Schritt" (3.15).

**Kommentar-Herkunft:** Der bestehende Command-Kommentar (76–82, Verweis auf
`kopieren-code.md`) bleibt sinngemäß erhalten und wird um den Guard-Hinweis ergänzt.

### 3.3 Bewusst nicht behobene Restlücke: `CellSelection` (Grenzfall 8b)

`prosemirror-tables` verwendet für „ganze Zelle(n) markiert" eine eigene `CellSelection`, keine
`NodeSelection` — der Guard greift dafür nicht. Das ist **dieselbe vorbestehende Exposition** wie
bei `insertImage`/`insertTable` (kein durch dieses Feature neu eingeführtes Risiko), daher
**nicht** im Scope dieses Tickets zu beheben, aber per Test zu **charakterisieren** (14.2
Nr. 9b): `CellSelection` + `Shift+Enter` darf die Tabellenstruktur nicht beschädigen/keine
Zellen löschen. Erweist sich der Test als rot (echter Struktur-Schaden), wird ein zusätzlicher
`CellSelection`-Guard-Zweig test-getrieben nachgezogen; laut aktuellem Befund ist das nicht zu
erwarten.

---

## 4. `src/formats/shared/editor/WordEditor.tsx` — keine Änderung (bereits verdrahtet)

`'Shift-Enter': insertHardBreak()` ist bereits gebunden (Zeile 97), der Import ist vorhanden
(Zeile 12). **Keine Codeänderung nötig.** Der Guard-Fix aus Abschnitt 3 wirkt automatisch, da
`WordEditor.tsx` denselben `insertHardBreak`-Export verwendet.

Keine Änderung an `reconcileSelectionOnClick` (43–50) oder `dispatchTransaction` (125–133) —
`insertHardBreak` löst wie jeder Command eine reguläre, über `dispatchTransaction` verarbeitete
Transaktion aus. **Trotzdem** verlangt Anforderung Abschnitt 2/Grenzfall 15 einen dedizierten
Regressionstest (Abschnitt 14.3): eine `NodeSelection` auf ein Bild ist genau der Zustand, aus
dem 0.7 zuschlägt, und Umschalt+Enter ist ein zusätzlicher Verdachtsfall für die
Selection-Sync-Regression.

---

## 5. Löschverhalten (Menüpunkt 5, Grenzfall 10) — kein Code, nur Testpflicht

Siehe 0.8: kein neuer Command. Backspace/Entf auf einen `hard_break` läuft über denselben
nativen Löschmechanismus + DOM-Reconciliation wie jede andere Zeichenlöschung. **Einzige
Pflicht:** E2E-Test (14.2 Nr. 11). Falls der Test fehlschlägt (Text verschluckt/falsch
fusioniert), wird ein explizites `Backspace`/`Delete`-Command-Paar test-getrieben nachgezogen
(Ansatzpunkt analog `seitenumbruch-code.md`, falls dort umgesetzt) — laut Befund nicht zu
erwarten.

---

## 6. `src/formats/shared/editor/Toolbar.tsx` — optionaler Button (Touch-relevant, siehe 8)

Anforderung Menüpunkt 2 stuft den Button generell als „Nice-to-have" ein, macht ihn aber auf
**Touch-Geräten zur Pflicht** (Menüpunkt 6/3.16/Grenzfall 21), weil dort `Shift+Enter` oft nicht
erzeugbar ist. Dieser Plan setzt den Button **um** (geringer Aufwand, löst zugleich die
Touch-Anforderung, siehe Abschnitt 8).

Infrastruktur ist vorhanden: `Toolbar.tsx` hat einen `run(view, command)`-Helper (Zeile 28), eine
Import-Liste aus `./commands` (Zeilen 6–…, u. a. `insertImage`/`insertTable`), einen
„Tabelle einfügen"-Button (~279–291) und ein „Bild"-Label (~292). Platzierung des neuen Buttons:
in der „Einfügen"-Gruppe, nach „Tabelle einfügen", vor dem „Bild"-Label.

**Eingebettetes SVG, kein Unicode/Emoji** (Anforderung Menüpunkt 2, `FEATURE-SPEC-DOCX-ODT.md`
Abschnitt 20.1 — Hinweis: das bestehende „🖼 Bild"-Label nutzt noch ein Emoji; der **neue**
Button soll dieses Muster nicht fortschreiben):
```tsx
function HardBreakIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 5h9a2 2 0 0 1 0 4H7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M9 7l-2 2 2 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 11h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

// … nach dem „Tabelle einfügen"-Button, vor dem Bild-Label:
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
Import-Ergänzung: `insertHardBreak` zur `import { … } from './commands'`-Liste (ab Zeile 6)
hinzufügen. `title`/`aria-label` liefern denselben, per `getByTitle('Zeilenumbruch einfügen')`
adressierbaren Namen wie die übrigen Buttons. Kein Deaktivieren in Tabellen-/Listen-Kontext
(`insertHardBreak` bleibt dort funktional).

---

## 7. Kontextmenü / Menüleiste (Menüpunkte 3–4) — außerhalb des Scopes, kein Code

Der Editor besitzt bewusst kein eigenes Kontextmenü (kein `contextmenu`-Handler mit
`preventDefault`, siehe Kommentar `WordEditor.tsx:117–121` — das native Browser-Kontextmenü
bleibt erreichbar) und keine Menüleiste. Beide laut Anforderung „Nice-to-have, kein Blocker".
Keine Codeänderung.

---

## 8. Touch-/Mobil-Zugang (Menüpunkt 6, 3.16, Grenzfall 21) — Entscheidung: Toolbar-Button

Auf „Mobile" (Pixel 7) und „Tablet" (iPad Mini) ist `Shift+Enter` über die Software-Tastatur
nicht verlässlich erzeugbar. **Entscheidung dieses Plans:** der Toolbar-Button aus Abschnitt 6
ist der definierte Touch-Weg — er wird dadurch von „Nice-to-have" zur **Pflicht** und ist per
`getByTitle('Zeilenumbruch einfügen')` auf beiden Touch-Projekten testbar (14.2 Nr. 20). Damit
existiert auf Touch mindestens ein funktionierender Weg — kein stiller Zustand, in dem die
Funktion unerreichbar wäre (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 8). Sichtbare visuelle
¶-Unterscheidung bleibt separat (Abschnitt 9).

---

## 9. Sichtbare Unterscheidung Zeilen-/Absatzumbruch (Menüpunkt 7) — dokumentierte Einschränkung

Die App hat kein „¶ ein-/ausblenden"-Toggle; `hard_break.toDOM()` (`schema.ts:53–55`) rendert
ein schlichtes `<br>`, im WYSIWYG optisch nicht von einem neuen Absatz unterscheidbar.
Anforderung Menüpunkt 7/Abschnitt 7 lassen ausdrücklich **„bewusst als akzeptierte Einschränkung
dokumentiert"** als gültigen Abschluss zu.

**Entscheidung: dokumentieren, nicht beheben.** Ein korrektes Formatierungszeichen-Toggle wäre
ein eigener Bedienelement-/Rendering-Modus (der auch `text:s`/`w:tab` einschließen müsste) und
sprengt den engen Geltungsbereich dieses Tickets — Heimat ist der eigenständige Backlog-Eintrag
`formatierungszeichen-toggle`. Konsequenz für dieses Ticket: die Rundreise-Verifikation stützt
sich auf technische Inspektion (Export-Diff, `<br>`/`<text:line-break/>`-Position), nicht auf
bloßes Hinsehen (Abschnitt 14).

---

## 10. DOCX-Export/-Import — keine Code-Änderung, Kommentar + Testpflicht

### 10.1 Writer (`src/formats/docx/writer.ts:60–62`) — korrekt, optionaler Doku-Kommentar

`hard_break` → `<w:r><w:br/></w:r>` bleibt (Anforderung 3.7). Optionaler, rein dokumentierender
Kommentar, damit ein künftiger `seitenumbruch`-Patch diesen Zweig nicht mit einem Seitenumbruch
verwechselt:
```ts
} else if (node.type === 'hard_break') {
  flush()
  // Ausschließlich Zeilenumbruch (Umschalt+Enter) — kein w:type-Attribut (OOXML-Default
  // "textWrapping"). Seitenumbruch (Strg+Enter, seitenumbruch-req.md) ist ein eigenes
  // Konzept und wird NICHT über diesen hard_break-Zweig geschrieben.
  runs.push('<w:r><w:br/></w:r>')
}
```

### 10.2 Reader (`src/formats/docx/reader.ts:177–178`) — bekannte Lücke, Kommentar + Test

Keine Codeänderung — die `w:type="page"`/`"column"`-Fehlklassifizierung (Grenzfall 13) ist laut
Geltungsbereich Aufgabe von `seitenumbruch-req.md`. Pflicht **dieses** Tickets:
1. **Dokumentierender Kommentar** am Codeort (Zeile 177):
   ```ts
   } else if (child.namespaceURI === OOXML_NAMESPACES.w && child.localName === 'br') {
     // BEKANNTE, DOKUMENTIERTE LÜCKE (zeilenumbruch-manuell-req.md 3.8/Grenzfall 13,
     // seitenumbruch-req.md): liest JEDES <w:br> unabhängig von w:type. <w:br w:type="page"/>
     // und <w:br w:type="column"/> werden dadurch fälschlich als hard_break gelesen. Behebung
     // ist Aufgabe von seitenumbruch-code.md. Sichtbar gehalten durch die Testgruppe
     // "hard_break vs. page/column break" in docx/__tests__/external-fixtures.test.ts.
     out.push({ kind: 'break' })
   }
   ```
2. **Expliziter Unit-Test** (14.1c), der das aktuelle Lücken-Verhalten sichtbar dokumentiert
   statt es als „funktioniert" durchzuwinken.

---

## 11. ODT-Export — `src/formats/odt/writer.ts:74` — keine Code-Änderung

`hard_break` → `<text:line-break/>` (Anforderung 3.9). Keine Änderung.

---

## 12. ODT-Import — `src/formats/odt/reader.ts:150–151` — keine Code-Änderung, Kommentar + Test

`text:line-break` → `hard_break`, kontextunabhängig (Anforderung 3.10). `text:soft-page-break`
hat keinen eigenen Zweig, fällt in der `if`/`else if`-Kette folgenlos durch — **kein**
Fehlinterpretations-Bug (Anforderung 3.10/Grenzfall 14). Pflicht: Regressionstest (14.1e/14.1d)
gegen ein synthetisches Adjazenz-Fixture, damit ein künftiger `walk`-Refactor diesen „durchfallen
lassen"-Vorteil nicht in eine Fehlinterpretation verwandelt. Optionaler Doku-Kommentar nach dem
`text:tab`-Zweig (Zeile 156):
```ts
} else if (el.namespaceURI === ODF_NAMESPACES.text && el.localName === 'tab') {
  result.push({ type: 'text', text: '\t', marks: marks.length ? marks : undefined })
}
// Bewusst KEIN Zweig für text:soft-page-break (reiner Rendering-Hinweis, kein manueller
// Umbruch) — fällt hier folgenlos durch und hat korrekt KEINE Auswirkung.
```

---

## 13. `playwright.config.ts` — den neuen Spec in die Firefox-/Safari-Reichweite bringen

**Korrektur gegenüber dem alten Entwurf:** Es wird **kein** neues Firefox-Projekt angelegt —
`Desktop Firefox (Clipboard)` (50–53) und `Desktop Safari (Clipboard)` (43–46) existieren
bereits. Sie sind aber per `testMatch: /clipboard.*\.spec\.ts/` auf Clipboard-Specs beschränkt
(0.3), sodass eine neue `zeilenumbruch.spec.ts` dort **nicht** liefe. Testplan Punkt 5 verlangt
den `Shift-Enter`-Test auf **mindestens zwei echten Engines**.

**Umsetzung — `testMatch` beider Desktop-Projekte um den neuen Spec erweitern:**
```ts
name: 'Desktop Safari (Clipboard)',
testMatch: /(clipboard|zeilenumbruch).*\.spec\.ts/,
use: { ...devices['Desktop Safari'] },
```
```ts
name: 'Desktop Firefox (Clipboard)',
testMatch: /(clipboard|zeilenumbruch).*\.spec\.ts/,
use: { ...devices['Desktop Firefox'] },
```
Optional die Projektnamen zu `Desktop Safari`/`Desktop Firefox` entschärfen (der
`(Clipboard)`-Zusatz wird durch die erweiterte Reichweite ungenau) — nicht zwingend.

Damit läuft `zeilenumbruch.spec.ts` auf **Chromium** (Desktop Chrome), **Firefox** und **WebKit**
(Desktop Safari) — Testplan Punkt 5 erfüllt (zwei echte Engines für den Tastatur-Test, ohne die
Mobile-/Touch-Eigenheiten von „Mobile"/„Tablet" hineinzumischen). Der Touch-Button-Test (14.2
Nr. 20) läuft ohnehin auf „Mobile"/„Tablet". **Nicht** die Firefox-/Safari-Projekte auf die
**gesamte** Suite ausweiten (das verdoppelte die Laufzeit ohne Mehrwert für dieses Ticket).

---

## 14. Testplan — neue/angepasste Tests

### 14.1 Unit-Tests (Vitest)

**a) `src/formats/docx/__tests__/roundtrip.test.ts`** — nach dem bestehenden Test bei Zeile
119–132 einfügen (`doc`/`roundTrip`-Helper bereits vorhanden, Zeilen 14/27):
```ts
it('preserves multiple consecutive hard breaks in the same paragraph', async () => {
  const original = doc([
    { type: 'paragraph', attrs: { align: 'left' }, content: [
      { type: 'text', text: 'A' }, { type: 'hard_break' }, { type: 'hard_break' },
      { type: 'hard_break' }, { type: 'text', text: 'B' },
    ] },
  ])
  const result = await roundTrip(original)
  const content = (result.body as any).content[0].content
  expect(content.filter((n: any) => n.type === 'hard_break')).toHaveLength(3)
})

it('preserves a hard break inside a heading', async () => {
  const original = doc([
    { type: 'heading', attrs: { level: 2, align: 'left' }, content: [
      { type: 'text', text: 'Zeile eins' }, { type: 'hard_break' }, { type: 'text', text: 'Zeile zwei' },
    ] },
  ])
  const result = await roundTrip(original)
  expect(result.body.content).toHaveLength(1)
  expect((result.body as any).content[0].type).toBe('heading')
  expect((result.body as any).content[0].content.some((n: any) => n.type === 'hard_break')).toBe(true)
})

it('preserves a leading and trailing hard break (empty first/last line)', async () => {
  const original = doc([
    { type: 'paragraph', attrs: { align: 'left' }, content: [
      { type: 'hard_break' }, { type: 'text', text: 'Mitte' }, { type: 'hard_break' },
    ] },
  ])
  const result = await roundTrip(original)
  const content = (result.body as any).content[0].content
  expect(content[0].type).toBe('hard_break')
  expect(content[content.length - 1].type).toBe('hard_break')
})
```

**b) `src/formats/odt/__tests__/roundtrip.test.ts`** — dieselben drei Tests (ODT-Variante), nach
Zeile 121–132 eingefügt.

**c) `src/formats/docx/__tests__/external-fixtures.test.ts`** — neue Testgruppe (dokumentiert die
Grenzfall-13-Lücke, Abschnitt 10.2):
```ts
describe('hard_break vs. page/column break — bekannte, dokumentierte Reader-Lücke (Grenzfall 13)', () => {
  it('reads plain <w:br/> and <w:br w:type="page"/> in saut_page.docx BOTH as hard_break (known gap)', async () => {
    const buffer = readFileSync(join(FIXTURES_DIR, 'saut_page.docx'))
    const parsed = await readDocx(new Blob([new Uint8Array(buffer)]))
    // saut_page.docx: 2× <w:br w:type="page"/> + 1× plain <w:br/>. Der Reader faltet aktuell
    // alle drei zu hard_break. Sinkt diese Zahl je (z. B. weil ein Seitenumbruch-Patch
    // w:type="page" herausfiltert, ohne einen eigenen Node-Typ zu ergänzen), erzwingt dieser
    // Test eine bewusste Aktualisierung — er darf nicht still aus dem falschen Grund grün werden.
    const count = (JSON.stringify(parsed.body).match(/"hard_break"/g) ?? []).length
    expect(count).toBe(3)
  })

  it('reads an explicit w:type="textWrapping" break (drawing.docx) as hard_break too', async () => {
    const buffer = readFileSync(join(FIXTURES_DIR, 'drawing.docx'))
    const parsed = await readDocx(new Blob([new Uint8Array(buffer)]))
    expect(JSON.stringify(parsed.body)).toContain('"hard_break"')
  })
})
```
(`readFileSync`/`join`/`FIXTURES_DIR`/`readDocx` sind im Dateikopf bereits vorhanden — Zählwert
`3` beim Erstlauf gegen das echte Fixture verifizieren und ggf. anpassen.)

**d) `src/formats/odt/__tests__/external-fixtures.test.ts`** — analoge Gruppe:
```ts
describe('hard_break aus realen ODT-Fixtures (Grenzfall 14/20)', () => {
  it('reads the styled, nested <text:line-break/> in TextLineBreakText.odt as hard_break', async () => {
    const buffer = readFileSync(join(FIXTURES_DIR, 'TextLineBreakText.odt'))
    const parsed = await readOdt(new Blob([new Uint8Array(buffer)]))
    expect(JSON.stringify(parsed.body)).toContain('"hard_break"')
  })
  it('does not misinterpret text:soft-page-break as hard_break (text-extract.odt)', async () => {
    const buffer = readFileSync(join(FIXTURES_DIR, 'text-extract.odt'))
    const parsed = await readOdt(new Blob([new Uint8Array(buffer)]))
    expect(JSON.stringify(parsed.body)).not.toContain('"hard_break"')
  })
})
```

**e) Neues synthetisches Fixture für Grenzfall 14** (exakte Adjazenz `line-break` +
`soft-page-break` im selben Absatz, 0.5) — neue Datei
`src/formats/odt/__tests__/hardBreakVsSoftPageBreak.test.ts`, ein `content.xml` per JSZip bauen
und gegen `readOdt` prüfen:
```ts
it('Grenzfall 14: text:line-break unmittelbar gefolgt von text:soft-page-break im selben Absatz', async () => {
  // …content.xml: <text:p>Zeile eins<text:line-break/><text:soft-page-break/>Zeile zwei</text:p>
  const parsed = await readOdt(blob)
  const content = (parsed.body as any).content[0].content
  expect(content.filter((n: any) => n.type === 'hard_break')).toHaveLength(1)
  expect(content.map((n: any) => n.text ?? n.type).join('|')).toBe('Zeile eins|hard_break|Zeile zwei')
})
```
(Minimales ODT-Paket wie in bestehenden Reader-Unit-Tests; `mimetype`/`styles.xml`/`meta.xml`
als Rümpfe.)

**f) Cross-Format-Unit-Test** — neue Datei `src/formats/__tests__/crossFormatHardBreak.test.ts`
(neues Verzeichnis, da beide Format-Module importiert werden — vermeidet eine künstliche
`docx→odt`-Abhängigkeit in einem der bestehenden `__tests__`-Verzeichnisse):
```ts
import { writeDocx } from '../docx/writer'
import { readDocx } from '../docx/reader'
import { writeOdt } from '../odt/writer'
import { readOdt } from '../odt/reader'

describe('Cross-Format-Rundreise: hard_break über DOCX↔ODT (Anforderung 5.2.3)', () => {
  it('DOCX → ODT → DOCX', async () => { /* readDocx→writeOdt→readOdt→writeDocx, join === 'Zeile eins|hard_break|Zeile zwei' */ })
  it('ODT → DOCX → ODT', async () => { /* symmetrisch */ })
  it('multiple breaks + heading + list survive a double format round trip (Grenzfall 16)', async () => { /* 2× hard_break bleiben erhalten */ })
})
```

### 14.2 E2E-Tests (Playwright) — neue Datei `tests/e2e/zeilenumbruch.spec.ts`

Aufbau wie `tests/e2e/selection-regression.spec.ts` (`odtCard`/`docxCard`-Helper,
`page.locator('.ProseMirror')`, `getByRole('button', { name: 'Neu erstellen' })`) und
`tests/e2e/docx.spec.ts` (`docxCard` Zeile 59; Export via
`page.waitForEvent('download')` + `getByRole('button', { name: 'Exportieren' })`, ~79–80;
Re-Import via `input.setInputFiles({ … buffer: readFileSync(...) })`, ~97/113):

1. **Grundfall (3.1):** Text tippen, `Shift+Enter`, weiter tippen → `.ProseMirror p` zählt
   **genau 1**, `editor.locator('br')` zählt **1** zwischen den Textteilen.
2. **Selektion ersetzen (3.2):** Text, `ControlOrMeta+a`, `Shift+Enter` → vorheriger Text weg,
   genau 1 `<br>`.
3. **Anfang/Ende (3.4, Grenzfall 1/2):** `Home` + `Shift+Enter`; `End` + `Shift+Enter` → je eine
   leere Zeile, direkt weitertippen sichtbar.
4. **Mehrfach ohne Text (Grenzfall 3):** 3× `Shift+Enter` → `editor.locator('br')` zählt **3**.
5. **`Shift+Enter` + normales `Enter` (Grenzfall 4):** Text, `Shift+Enter`, Text, `Enter`, Text →
   `.ProseMirror p` zählt **2**, erster Absatz genau **1** `<br>`.
6. **Leerer Absatz (Grenzfall 5):** neues Dokument, direkt `Shift+Enter` → kein Absturz,
   `br`-Anzahl 1.
7. **Überschrift (Grenzfall 6):** Absatzformat „Überschrift 1", Text, `Shift+Enter`, Text →
   `.ProseMirror h1` zählt weiterhin **1**.
8. **Listenpunkt (Grenzfall 7):** „Aufzählung", Text, `Shift+Enter`, Text → `.ProseMirror li`
   zählt weiterhin **1**.
9. **Tabellenzelle Text-Cursor (Grenzfall 8):** „Tabelle einfügen", in Zelle klicken, Text,
   `Shift+Enter`, Text → `.ProseMirror td`-Anzahl unverändert, beide Zeilen in derselben Zelle.
   **9b (Grenzfall 8b):** ganze Zellen per `CellSelection` markieren (Zell-Range ziehen), dann
   `Shift+Enter` → `td`-Anzahl unverändert, keine Zelle gelöscht (charakterisierend, 3.3).
10. **Bild-Nachbarschaft (Grenzfall 9, PFLICHT — deckt 0.7 ab):**
    a) Bild einfügen, Cursor per Klick **im Text davor** positionieren, `Shift+Enter` →
       `editor.locator('img')` bleibt **1** (normaler `TextSelection`-Pfad).
    b) **Bild per Klick/Pfeiltaste als `NodeSelection` anwählen, dann `Shift+Enter` →
       `editor.locator('img')` muss weiterhin `1` sein (nicht 0).** Ohne den Guard aus Abschnitt
       3.2 ist dieser Test **rot** — er erzwingt den Bugfix und ist der wichtigste neue Test.
       Analog für eine als Ganzes selektierte Tabelle.
11. **Löschen (Grenzfall 10):** Text, `Shift+Enter`, Text, Cursor direkt nach dem Umbruch,
    `Backspace` → `<br>` weg, beide Teile zu einer Zeile verschmolzen, **kein** Zeichenverlust
    (exakter `editor.textContent()`-Vergleich).
12. **Undo/Redo (3.15, Grenzfall 22):** nach Nr. 1 `ControlOrMeta+z` → `br`-Anzahl 0;
    `ControlOrMeta+y` → Umbruch wieder da.
13. **Navigation (3.14, Grenzfall 11):** Cursor an Zeilenanfang, `k` × `ArrowRight`, Marker
    tippen → Marker erscheint in der **zweiten** Zeile, wenn `k` = „Länge Zeile 1 + 1".
14. **Doppelklick-Wortgrenze (Grenzfall 12):** „vor" + `Shift+Enter` + „nach", Doppelklick auf
    „vor" → `window.getSelection()?.toString()` ist exakt `"vor"`.
15. **Marken über den Umbruch (Grenzfall 19):** mitten in fettem Text `Shift+Enter`, weiter
    tippen → neuer Text bleibt fett (`editor.locator('strong')` umschließt beide Seiten); danach
    Export → Re-Import → beide Seiten bleiben fett.
16. **Sehr viele Umbrüche (Grenzfall 17):** 60× `Shift+Enter` → kein Timeout,
    `editor.locator('br')` zählt **60**, Export → Re-Import → weiterhin 60.
17. **Import fremde Word-Datei (5.2 Testfall 6):** `drawing.docx` in die DOCX-Karte laden →
    Export → JSZip-Prüfung enthält `<w:br/>` → Re-Import → weiterhin vorhanden.
18. **Import fremde LibreOffice-Datei (5.2 Testfall 7):** analog mit `TextLineBreakText.odt` in
    der ODT-Karte (deckt den `text:span`-verschachtelten Fall / Grenzfall 20 ab).
19. **Cross-Format via echter Tastatur + Download, Format-Wechsel programmatisch (0.6):** in der
    DOCX-Karte Umbruch per Tastatur erzeugen, exportieren, Download-Buffer per `readDocx` →
    `writeOdt` → `readOdt` → Assertion auf `hard_break`. Umgekehrte Richtung symmetrisch.
20. **Touch (Grenzfall 21):** auf „Mobile"/„Tablet" den **Toolbar-Button**
    (`getByTitle('Zeilenumbruch einfügen')`, Abschnitt 6/8) tippen, Text tippen → `<br>` im
    Absatz, `.ProseMirror p`-Anzahl unverändert (nachweis eines funktionierenden Touch-Wegs).

Alle Tests laufen auf **Desktop Chrome** (chromium), **Desktop Firefox** und **Desktop Safari**
(nach `testMatch`-Erweiterung, Abschnitt 13) sowie **Mobile**/**Tablet** — Testplan Punkt 5
(zwei echte Engines) automatisch erfüllt. Für Touch-inkompatible Tastatur-Tests (Nr. 1–19) ist
per `test.skip(({ isMobile }) => isMobile, …)` oder projektbezogenem `test.describe`-Filter
sicherzustellen, dass auf „Mobile"/„Tablet" nur der Button-Test (Nr. 20) läuft, damit
`Shift+Enter`-Erwartungen dort nicht fälschlich fehlschlagen.

### 14.3 Ergänzung `tests/e2e/selection-regression.spec.ts` (Grenzfall 15, Pflicht)

Neuer `test()` **innerhalb** des bestehenden `describe`-Blocks (Zeilen 7–111), damit er Teil der
etablierten Selection-Sync-Suite bleibt — nach dem Muster des ersten Tests (14–41), inklusive des
dort dokumentierten `await page.waitForTimeout(50)` zwischen `End` und dem nächsten Tastendruck
(async `selectionchange`-Nachlauf, Kommentar Zeilen 26–34):
```ts
test('Shift+Enter after a stale-selection reposition click — both line parts must survive', async ({ page }) => {
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Hallo, das ist ein Test.')
  await page.keyboard.press('ControlOrMeta+a')
  await page.getByTitle('Fett').click()
  await editor.click()
  await page.keyboard.press('End')
  await page.waitForTimeout(50) // gleiche async-Selection-Sync-Race wie im ersten Test dieser Datei
  await page.keyboard.press('Shift+Enter')
  await page.keyboard.type('Zweite Zeile.')
  await expect(editor).toContainText('Hallo, das ist ein Test.')
  await expect(editor).toContainText('Zweite Zeile.')
  await expect(page.locator('.ProseMirror p')).toHaveCount(1)
  await expect(editor.locator('br')).toHaveCount(1)
})
```

---

## 15. Grenzfall-Mapping

| # | Grenzfall | Status nach diesem Plan |
|---|---|---|
| 1 | Umbruch am Absatzanfang | 14.2 Nr. 3 — funktioniert über `replaceSelectionWith`, kein Sonderfall |
| 2 | Umbruch am Absatzende | 14.2 Nr. 3 — dito |
| 3 | Mehrfach ohne Text | 14.2 Nr. 4; 14.1a |
| 4 | Umbruch + Enter in Folge | 14.2 Nr. 5 |
| 5 | Umbruch in leerem Absatz | 14.2 Nr. 6 |
| 6 | Umbruch in Überschrift | 14.2 Nr. 7; 14.1a |
| 7 | Umbruch in Listenpunkt | 14.2 Nr. 8; reale Fixtures `EasyList.odt`/`ListStyleResolution.odt` (0.4) |
| 8 | Umbruch in Tabellenzelle (Text-Cursor) | 14.2 Nr. 9 |
| 8b | `CellSelection` (ganze Zellen) | 14.2 Nr. 9b — **Restlücke bewusst nicht behoben** (Abschnitt 3.3), charakterisierender Test |
| 9 | Umbruch bei `NodeSelection`-Bild/Tabelle | 14.2 Nr. 10a/b — **kritische Regression aus 0.7, durch Guard (3.2) behoben**; 10b ohne Fix rot |
| 10 | Backspace/Entf am Umbruch | 14.2 Nr. 11 — kein neuer Code (0.8), nur Testverifikation |
| 11 | Pfeiltasten über den Umbruch | 14.2 Nr. 13 — strukturell erfüllt (0.9) |
| 12 | Doppelklick-Wortgrenze | 14.2 Nr. 14 — natives Browser-Verhalten auf atomarem `<br>` |
| 13 | Import `w:br` + `w:br[type=page/column]` | **Bewusst nicht behoben** (Abgrenzung `seitenumbruch`), jetzt dokumentiert + regressionsgetestet (10.2, 14.1c) |
| 14 | `text:line-break` + `text:soft-page-break` | Bereits korrekt (0.1 Punkt 8, 12), synthetisches Adjazenz-Fixture (14.1e) + Negativtest (14.1d) |
| 15 | Selection-Sync-Regression mit Umbruch | 14.3 — neuer Pflichttest in bestehender Suite |
| 16 | Cross-Format DOCX↔ODT, mehrere Umbrüche | 14.1f (Unit) + 14.2 Nr. 19 (E2E-Handoff) — keine UI-Cross-Format-Funktion (0.6) |
| 17 | 50+ Umbrüche | 14.2 Nr. 16; Reales Fixture `bug65649.docx` (0.4) |
| 18 | Intern kopieren + einfügen, Klartext `\n` | Abgedeckt durch bestehende Kopieren-Suite (`leafText`, 0.1 Punkt 9) — darf nicht brechen |
| 19 | Marken über den Umbruch | 14.2 Nr. 15; 14.1a (Heading-Marken-Erhalt via Rundreise) |
| 20 | ODT `line-break` in `text:span` | 14.1d + 14.2 Nr. 18 (`TextLineBreakText.odt`) |
| 21 | Touch „Mobile"/„Tablet" | 14.2 Nr. 20 — Toolbar-Button als definierter Weg (Abschnitt 6/8) |
| 22 | Undo, Redo | 14.2 Nr. 12 |

---

## 16. Rundreise-Anforderung — Umsetzung

### 16.1 Baseline (5.1, Regressionsschutz)

- Bestehende `tests/e2e/docx.spec.ts`/`odt.spec.ts`, beide `roundtrip.test.ts`, beide
  `external-fixtures.test.ts` müssen **vor und nach** allen Änderungen grün bleiben.
- Der Guard-Fix (3.2) darf normales `Enter`/Text-Selektion-Ersetzen **nicht** verändern —
  abgedeckt durch die bestehenden `selection-regression`-Tests (Absatz-Split bei `Enter`), die
  strukturell unberührt bleiben (`Shift-Enter` ist ein separater Bindungsschlüssel).
- **Kopieren-Regressionstests** (`leafText === '\n'`, „keeps two hard_break-separated lines
  apart") müssen grün bleiben (0.1 Punkt 9) — keine Änderung an `hard_break`/`leafText`.
- Die `testMatch`-Erweiterung (Abschnitt 13) bringt `zeilenumbruch.spec.ts` zusätzlich auf
  Firefox/Safari; die **bestehenden** Clipboard-Specs dort bleiben unberührt.

### 16.2 Feature-Rundreise (5.2)

| Testfall (Anforderung 5.2) | Abdeckung |
|---|---|
| 1. Neues Dokument, Umbruch per Tastatur, DOCX | 14.2 Nr. 1, 17 |
| 2. Dasselbe, ODT | 14.2 Nr. 1 (odtCard), 18 |
| 3. Cross-Format beide Richtungen | 14.2 Nr. 19 (E2E + programmatischer Wechsel) + 14.1f (Unit) |
| 4. Mehrere Umbrüche im selben Absatz | 14.2 Nr. 4, 16; 14.1a/b |
| 5. Umbruch + andere Strukturen | 14.2 Nr. 7–10; 14.1f (kumulativ) |
| 6. Import echte Word-Datei | 14.2 Nr. 17; 14.1c |
| 7. Import echte LibreOffice-Datei | 14.2 Nr. 18; 14.1d |
| 8. Doppelte Rundreise mit mehreren Features | 14.1f (dritter Test); volle Multi-Feature-Rundreise bleibt Aufgabe der Gesamt-Testmatrix (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 21) |

**Unabhängige Export-Validierung (5.2/`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 19):** DOCX-Export per
JSZip auf `<w:br/>` an erwarteter Stelle prüfen (nicht nur via eigenem Reader); ODT-Export auf
`<text:line-break/>`. Nutzt die bestehende `external-validation.test.ts`-Infrastruktur beider
Formate als Muster.

---

## 17. Abnahme-Checkliste (Anforderung Abschnitt 7)

- [ ] **Datenverlust-Bug (0.7/3) behoben:** `NodeSelection`-Guard in `insertHardBreak`
      (`commands.ts:83–90`), abgesichert durch 14.2 Nr. 10b (ohne Fix rot).
- [ ] Erzeugungsweg bestätigt vorhanden: `insertHardBreak` (`commands.ts`) + `'Shift-Enter'`
      (`WordEditor.tsx:97`) — keine Neuverdrahtung, nur der Guard-Fix.
- [ ] Löschverhalten (Backspace/Entf) per E2E verifiziert, kein neuer Code (14.2 Nr. 11);
      Ergebnis hier nachtragen, falls wider Erwarten rot.
- [ ] Vollständiger neuer E2E-Testkorpus (`tests/e2e/zeilenumbruch.spec.ts`, 14.2) grün,
      inklusive des zuvor komplett fehlenden Tastatur-Eingabewegs (0.2).
- [ ] Selection-Sync-Regression mit Umschalt+Enter (14.3, Grenzfall 15) ergänzt und grün.
- [ ] Browserübergreifende Abdeckung **wirksam**: `zeilenumbruch.spec.ts` läuft auf Chromium +
      Firefox + WebKit (Desktop), nicht nur konfigurierbar (Abschnitt 13, testMatch erweitert).
- [ ] Touch-Weg **entschieden und getestet:** Toolbar-Button (Abschnitt 6/8, 14.2 Nr. 20) auf
      „Mobile"/„Tablet".
- [ ] Alle 22 Grenzfälle einzeln befundet (Abschnitt 15), insbesondere 8b, 9, 13, 14, 19, 20, 21.
- [ ] Marken-über-den-Umbruch (3.6/Grenzfall 19) für beide Formate rundreise-fest (14.2 Nr. 15,
      14.1a).
- [ ] Baseline (5.1) grün geblieben, **inklusive** Kopieren-Regressionstests (16.1).
- [ ] Feature-Rundreise (5.2) für DOCX, ODT und beide Cross-Format-Richtungen, mit unabhängiger
      Parser-/Schema-Validierung und den beiden realen Fixtures (16.2).
- [ ] Bekannte Einschränkungen bewusst dokumentiert: keine visuelle ¶-Unterscheidung
      (Abschnitt 9, Heimat `formatierungszeichen-toggle`), `w:type=page/column`-Import-Verwässerung
      (Abschnitt 10, Heimat `seitenumbruch-code.md`), verworfenes `w:clear`-Attribut (3.8).

Nach Erfüllung gilt der Backlog-Status `zeilenumbruch-manuell` als **vorhanden** (unqualifiziert)
— mit den in Abschnitt 9/10 explizit dokumentierten, bewusst akzeptierten Einschränkungen.
