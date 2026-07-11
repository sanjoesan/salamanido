# Umsetzungsplan: Feature „Bild löschen"

Gegenstück zu `specs/bild-loeschen-req.md`. Dieser Plan beschreibt den **am 2026-07-04 frisch
verifizierten** Code-Stand (Repo `E:\docs`, Arbeitskopie, kein aktiver Git-Branch) und die
dateigenauen Änderungen, um die Anforderung zu erfüllen.

Verbindlicher Anker ist immer der **Symbolname** (Funktion/Konstante/Testtitel); jede Zeilennummer
ist eine Momentaufnahme (Stand 2026-07-04) und im Zweifel gegen das Symbol zu prüfen — genau wie
die Req es in ihrem Korrekturhinweis fordert.

> **Achtung — diese Fassung ersetzt eine veraltete Vorfassung.** Die vorherige Version dieser Datei
> (Stand 13:55) wurde **vor** dem „Ausschneiden"-Feature und vor der jüngsten Test-Erweiterung
> geschrieben und enthielt mehrere inzwischen nachweislich **falsche** Aussagen (Zeilennummern,
> Schema-Detail `list_item`, „es gibt keine Bild-Tests / kein `commands.test.ts`", „`run()` reicht
> `view` nicht durch"). Abschnitt 0.1 listet jede Korrektur einzeln auf. Zusätzlich hatte eine **real
> ausgeführte** Laufzeit-Sonde (Abschnitt 2) einen **Grenzfall-8-Widerspruch** zur Req aufgedeckt,
> den die Vorfassung genau falsch herum behauptet hatte.
>
> **Zweite Korrektur, dieser Durchlauf (2026-07-05) — OE-1 ist keine offene Frage mehr.** Die
> Vorfassung dieses Plans stufte den Grenzfall-8-Widerspruch als **offene PO-Entscheidung OE-1** ein
> und **empfahl**, `deleteImage` als reinen `deleteSelection`-Wrapper zu belassen (Listenpunkt wird
> beim Löschen entfernt, ganze Einzelpunkt-Liste kollabiert). Die Req-Datei enthält inzwischen
> (Korrekturhinweis Punkt 6, oben in `bild-loeschen-req.md`) eine **verbindliche PO-Entscheidung**:
> *der Listenpunkt muss erhalten bleiben, geleert und mit einem leeren Absatz aufgefüllt*, und ein auf
> genau diesen Fall beschränkter Custom-Command ist **angeordnet**, nicht mehr optional. Diese Fassung
> setzt das um: Abschnitt 3.2/4.2 beschreiben jetzt den tatsächlichen Fix (`soleListItemImageRange` +
> gezieltes `replaceWith`), nicht mehr nur die (überholte) Empfehlung dagegen. Die real ausgeführte
> Sonde aus Abschnitt 2 bleibt als Beleg des **Ausgangszustands vor dem Fix** gültig — sie beschreibt
> nicht mehr den Zielzustand. **Wichtige Nebenfolge:** `specs/bild-loeschen-qa.md` enthält einen
> bereits geschriebenen Test „Grenzfall 8 (OE-1)", der ausdrücklich das **alte** Verhalten (Punkt wird
> entfernt) einfriert und `OE-1` noch als offen behandelt — dieser Test ist durch die vorliegende
> Fassung **überholt** und muss von QA auf das neue Soll-Verhalten (Punkt bleibt, aufgefüllt)
> umgeschrieben werden (siehe Abschnitt 10).

---

## 0. Kurzfassung der Entscheidung

- **Tatsächlich „kaputt" (Pflicht-Fix, Req DoD Punkt 1 / R1):** In `src/index.css` fehlt jede Regel
  für `.ProseMirror-selectednode`. Die Klasse wird von `prosemirror-view` gesetzt, hat aber ohne
  eigene CSS-Regel **keinerlei** sichtbare Wirkung; `src/main.tsx` importiert nur `./index.css` und
  kein `prosemirror-view/style/prosemirror.css`. „Markieren" ist damit optisch nicht nachweisbar.
  Das ist der **einzige** Punkt, an dem der Ist-Stand wirklich defekt (nicht nur ungetestet) ist.
- **Funktional korrekt, aber ungetestet (kein Produktions-Zwang):** „Bild löschen" ist im Code
  **keine benannte Funktion**, sondern das erste Glied (`deleteSelection`) der generischen
  `baseKeymap`-Ketten für `Delete`/`Backspace`. Eine **real ausgeführte** Sonde gegen die
  installierten ProseMirror-Pakete + das echte `wordSchema` (Abschnitt 2) belegt, dass dieser
  generische Pfad die meisten Grenzfälle bereits korrekt behandelt (Bild einziger Inhalt, Text
  davor/danach, Tabellenzelle, mehrere/identische Bilder, Undo/Redo, Selektion direkt nach
  `insertImage`, Tastatur-Selektion via `selectNodeBackward`).
- **Verifizierter Abweicher des generischen Pfads, jetzt PO-entschieden und zu beheben (Grenzfall 8):**
  Der Grenzfall **„Bild als alleiniger Inhalt eines Listenpunkts"** verhält sich im generischen
  `deleteSelection`-Pfad **anders**, als Req Grenzfall 8 verlangt. Die Sonde (Abschnitt 2) zeigt den
  Ausgangszustand: Beim Löschen wird der leere Listenpunkt **nicht** aufgefüllt und **nicht**
  erhalten — er wird **komplett entfernt** (mehrgliedrige Liste schrumpft; einzelnes Item ⇒ ganze
  Liste kollabiert zu einem leeren Top-Level-Absatz). Das ist ein **valider** Dokumentzustand (kein
  Absturz), erfüllt aber **nicht** die von der Req (Korrekturhinweis Punkt 6) **verbindlich
  angeordnete** Anforderung „der Listenpunkt bleibt erhalten, geleert und mit einem leeren Absatz
  aufgefüllt". Diese Fassung baut den dafür nötigen, eng begrenzten Custom-Command
  (`soleListItemImageRange` + gezieltes `replaceWith`, Abschnitt 3.2/4.2) — **kein** offener Punkt
  mehr, sondern Teil des Umsetzungsauftrags.
- **Zu bauen:** (1) 1 CSS-Regel (R1). (2) `isImageSelected`/`deleteImage` in `commands.ts` — dünner,
  benannter, unit-testbarer Wrapper um `tr.deleteSelection()`, **mit einer gezielten Ausnahme**: ist
  das Bild der alleinige Inhalt eines `list_item`, ersetzt `deleteImage` nur den Bild-Node durch einen
  leeren Absatz (`tr.replaceWith`) statt die Selektion generisch zu löschen — genau der von der Req
  angeordnete Fix für Grenzfall 8 (Abschnitt 3.2/4.2). (3) Kontextabhängiger Toolbar-Button „Bild
  löschen" (SVG, sichtbar nur bei Bild-Selektion). (4) Ein gezielter **R2-Guard** in `WordEditor.tsx`:
  `reconcileSelectionOnClick` darf eine Bild-`NodeSelection` **nicht** in einen Text-Caret
  kollabieren. (5) `WordEditor.tsx`s eigenes Keymap bindet `Delete`/`Mod-Delete`/`Backspace`/
  `Mod-Backspace`/`Shift-Backspace` zusätzlich auf `deleteImage()` (vor `keymap(baseKeymap)`), damit
  der Listenpunkt-Fix auch über die Tastatur greift, nicht nur über den Toolbar-Button. (6) Tests:
  `commands.test.ts` erweitern (inkl. der neuen Listenpunkt-Erhalt-Fälle), neue E2E-Suite
  `image-delete.spec.ts` (Entf-/Rücktaste-Pfad, R1-Sichtbarkeit, R2-Klick+Entf, Listenpunkt-Erhalt,
  Selection-Sync-Regression mit Bild, Zip-Verwaisung DOCX **und** ODT über den Entf-Pfad), neue
  Reader/Writer-Verwaisungs-Unit-Tests.
- **Keine** Produktionscode-Änderung in `src/formats/docx/*` oder `src/formats/odt/*` (Begründung 3.7):
  beide Writer bauen den Bildkatalog bei **jedem** Export frisch aus dem Dokumentbaum auf — ein
  gelöschtes Bild wird nie besucht, Verwaisung ist strukturell ausgeschlossen. Wird durch neue Tests
  **bewiesen**, nicht nur behauptet.

---

## 0.1 Korrekturen gegenüber der veralteten Vorfassung dieses Plans

Die Vorfassung (13:55) war gegen einen älteren Repo-Stand geschrieben. Jede folgende Aussage der
Vorfassung ist **falsch** und hier korrigiert (frisch am Quellcode geprüft):

| # | Falsche Aussage der Vorfassung | Tatsächlicher Stand (2026-07-04) |
|---|---|---|
| K1 | `image`-NodeSpec „Zeilen 45–72", `hard_break` „35–43", `doc` „Zeile 7", `list_item` „98–104", `tableNodes` „106" | `schema.ts` hat 202 Zeilen: `image` **L58–85**, `hard_break` **L42–56** (`selectable:false` L45), `doc: 'block+'` **L14**, `list_item` **L146–152**, `tableNodes` **L154**. |
| K2 | „`list_item` ist `content: 'paragraph block*'` — ein Bild kann **niemals** alleiniger Inhalt sein; Schema erzwingt führenden Absatz" | **Falsch.** `list_item.content = 'block+'` (`schema.ts` L146–152, mit ausführlichem Kommentar warum — Fixtures `imageWithinList.odt`/`listLevel10.odt`). Ein Bild **darf** alleiniger Inhalt sein. Das ändert Grenzfall 8 grundlegend (Abschnitt 2/3.2). |
| K3 | „kein `commands.test.ts` existiert" / „Erste Unit-Tests für `commands.ts` überhaupt" | **Falsch.** `src/formats/shared/editor/__tests__/commands.test.ts` existiert und testet `canCut` + `cutSelection` (u. a. `NodeSelection.create` auf ein Bild, L26–31). Nur `isImageSelected`/`deleteImage` fehlen (existieren noch nicht). |
| K4 | „Kein E2E-Test fügt ein Bild ein oder löscht eines / keine Volltextsuchtreffer für image/Bild/img" | **Falsch.** `cut.spec.ts` (Testfall 8 L211 „Bild anklicken + Strg+X", Rundreise 6 L552 „kein `word/media` mehr"), `clipboard.spec.ts` (Grenzfall 6 L266, Grenzfall 7 L573), `export-error-handling.spec.ts` (L33) fügen/manipulieren Bilder. Vgl. Req Abschnitt 6.1. |
| K5 | „`run()` (Toolbar) reicht **keinen** `view`-Parameter durch (anders als der Cut-Umbau)" | **Falsch/überholt.** Der Cut-Umbau ist **umgesetzt**: `run(view, command: Command)` (Toolbar.tsx **L28–31**) ruft bereits `command(view.state, view.dispatch, view)` auf. `deleteImage` braucht `view` nicht, passt aber ohnehin. |
| K6 | Zeilennummern `WordEditor.tsx`: keymap „71–79", baseKeymap „80", dropCursor „83", gapCursor „84", reconcile „42–53", forceRender „97" | Aktuell (**185 Z.**, frisch 2026-07-05 nachgezählt, deckungsgleich mit der Req-§0-Tabelle): eigenes keymap **L85–107**, `keymap(baseKeymap)` **L108**, `dropCursor()` **L111**, `gapCursor()` **L112**, `reconcileSelectionOnClick` **L43–50**, `onMouseUp` **L146–153**, `forceRender` in `dispatchTransaction` **L131**. |
| K7 | `Toolbar.tsx` „247 Zeilen", `🖼 Bild`-Label „241–244", `handleImagePick` „97–108"; „ScissorsIcon planen" | 297 Zeilen; `🖼 Bild`-Label **L291–294**, `handleImagePick` **L124–135**; `ScissorsIcon` existiert bereits **L33–53** (Cut-Button L143–156). |
| K8 | Behauptete „12 Sonden-Fälle liefen durch" inkl. „Listenpunkt bleibt mit einem leeren Absatz bestehen" | Real nachsondiert (Abschnitt 2): der Listenpunkt bleibt **nicht** bestehen, er wird **entfernt**. Die alte Sonden-Behauptung war doppelt falsch (baute auf K2 auf). |
| K9 | Writer-Zeilen „writeDocx 222", „buildContentTypesXml 199", „writeOdt 183", „buildManifestXml 167"; Reader „docx 72, odt 122" | `writeDocx` **L252**, `buildContentTypesXml` **L229**, `writeOdt` **L260**, `buildManifestXml` **L244**; `resolveImageSources` docx **L442**, odt **L326**. |

Die inhaltliche Kernrichtung der Vorfassung (CSS-Fix, dünner `deleteImage`-Wrapper, Toolbar-Button,
keine Format-Produktionsänderung) bleibt **richtig** und wird übernommen — korrigiert um die obigen
Fakten und um den R2-Guard (3.4) sowie die Grenzfall-8-Entscheidung (3.2), die in der Vorfassung
fehlten bzw. falsch waren.

---

## 1. Verifizierter Ist-Stand (Codebelege, Stand 2026-07-04)

### 1.1 `src/formats/shared/schema.ts` (202 Zeilen)
- `doc: { content: 'block+' }` — **L14** (Grenzfall 2: Dokument braucht ≥1 Block).
- `hard_break` — **L42–56**, setzt explizit `selectable: false` (**L45**). Kontrast zum `image`.
- `image` NodeSpec — **L58–85**: `group: 'block'`, Attribute `src` (Pflicht), `alt` (Default `''`),
  `width`/`height` (Default `null`), `draggable: true` (**L66**). **Kein** `selectable`-Feld ⇒
  ProseMirror-Default `true` ⇒ per Klick als `NodeSelection` selektierbar. Das ist die einzige
  Grundlage für „Markieren".
- `list_item: { content: 'block+' }` — **L146–152** (mit Kommentar, warum bewusst `block+`). ⇒ ein
  Bild **darf** alleiniger Inhalt eines Listenpunkts sein (relevant für Grenzfall 8, s. Abschnitt 2).
- `tableNodes({ tableGroup: 'block', cellContent: 'block+', cellAttributes: {} })` — **L154** ⇒
  Tabellenzelle braucht ≥1 Block; ein Bild allein erfüllt das.

### 1.2 `src/formats/shared/editor/commands.ts` (167 Zeilen)
- Import **L1**: `import type { Command, EditorState } from 'prosemirror-state'` — `NodeSelection`
  ist **nicht** importiert (für `instanceof` als **Wert** zu ergänzen, s. 4.2).
- `insertImage(src, alt='')` — **L66–74**: `wordSchema.nodes.image.create({ src, alt })` +
  `state.tr.replaceSelectionWith(node)` (hinterlässt eine `NodeSelection` **auf** dem neuen Bild —
  in Abschnitt 2 real bestätigt).
- Weiter vorhanden: `setAlign`/`isAlignActive`/`setHeading`/`toggleList`/`liftFromList`,
  `insertHardBreak` (**L83–90**), `insertTable`, `applyMarkColor`/`clearMarkColor`, `canCut` (**L126–128**),
  `cutSelection` (**L149–166**, `CutHandlers`), Re-Export `isInTable` (**L6**).
- **Kein** `deleteImage`, **kein** `isImageSelected`.

### 1.3 `src/formats/shared/editor/WordEditor.tsx` (185 Zeilen)
- Import **L2**: `import { EditorState, TextSelection } from 'prosemirror-state'` — `NodeSelection`
  ist **nicht** importiert (für den R2-Guard als **Wert** zu ergänzen, s. 4.4).
- `reconcileSelectionOnClick(view, event)` — **L43–50**: setzt bei jedem Plain-Click
  `TextSelection.near(view.posAtCoords(...))`, falls ungleich der aktuellen Selektion. Eine
  Bild-`NodeSelection` ist nicht-leer und ungleich einer Text-Selektion ⇒ **direkter
  Kollaps-Kandidat** (R2, s. 3.4).
- Eigenes `keymap({...})` — **L85–107**: `Mod-z/y`, `Mod-Shift-z`, `Enter`→`splitListItem`,
  `Shift-Enter`→`insertHardBreak`, `Mod-b/i/u`, `Shift-Delete`→`cutSelection`. **Kein**
  `Delete`/`Backspace`/`Mod-Backspace`.
- `keymap(baseKeymap)` — **L108**: liefert `Delete` = `chainCommands(deleteSelection, joinForward,
  selectNodeForward)`, `Backspace`/`Mod-Backspace`/`Shift-Backspace` = `chainCommands(deleteSelection,
  joinBackward, selectNodeBackward)`. `deleteSelection` ist bei nicht-leerer Selektion das **erste
  greifende** Glied — der komplette Lösch-Pfad für eine Bild-`NodeSelection`.
- `dropCursor()` **L111**, `gapCursor()` **L112** (aktiv, aber ohne zugehöriges Stylesheet).
- Kommentar **L117–121**: bewusst kein eigenes Kontextmenü (bezieht sich auf „Ausschneiden";
  gilt für „Bild löschen" identisch, s. 3.5).
- `dispatchTransaction` **L125–133**: `onChange` bei `tr.docChanged` (**L128**), danach `forceRender`
  (**L131**) — ⇒ Toolbar wird bei **jeder** Transaktion neu gerendert (wichtig für die
  kontextabhängige Button-Sichtbarkeit, s. 3.3).
- `CLICK_DRAG_THRESHOLD_PX = 3` **L141**, `onMouseUp` **L146–153** ruft `reconcileSelectionOnClick`.
- Toolbar-Render **L170** mit `cutError`/`setCutError`.

### 1.4 `src/formats/shared/editor/Toolbar.tsx` (297 Zeilen)
- Import `type { Command }` **L3**; aus `./commands` u. a. `canCut`, `cutSelection`, `insertImage`,
  `isInTable` **L6–20**.
- `run(view, command: Command)` — **L28–31**: `command(view.state, view.dispatch, view); view.focus()`
  — reicht `view` bereits durch (K5). **Keine** Signaturänderung für `deleteImage` nötig.
- `ScissorsIcon()` SVG — **L33–53** (Muster für neue Inline-SVG-Icons in diesem Repo).
- Ausschneiden-Button **L143–156** (`disabled={!canCut(view.state)}`, `cutSelection({onCutBlocked})`),
  Fehler-Alert **L157–161**.
- `handleImagePick` **L124–135** (`insertImage(dataUrl, file.name)`, `event.target.value=''` L126).
- `🖼 Bild`-`<label>` + verstecktes `<input type="file" accept="image/*">` — **L291–294**; schließendes
  `</div>` L295. **Kein** „Bild löschen"-Button, keine `isImageSelected`-Bedingung.

### 1.5 `src/index.css` (89 Zeilen) — R1 bestätigt defekt
- `.ProseMirror img { max-width:100%; height:auto }` — **L39–42**.
- **Keine** Regel für `.ProseMirror-selectednode`, `.ProseMirror-gapcursor` oder
  `.ProseMirror-hideselection` (Volltextsuche über `src/`: 0 Treffer). Dark-Mode ausschließlich per
  `@media (prefers-color-scheme: dark)` (**L83**) — kein `data-theme`/Klassen-Toggle im Repo.
- `src/main.tsx`: importiert nur `./index.css` (kein `prosemirror-view/style/*`). **⇒ ein selektiertes
  Bild hat aktuell keinen sichtbaren Rahmen.**

Bibliotheks-Referenzwert (`node_modules/prosemirror-view/style/prosemirror.css`):
`.ProseMirror-selectednode { outline: 2px solid #8cf; }`.

### 1.6 Bild-Export-/Import-Architektur (DOCX + ODT) — keine Verwaisung möglich
- `src/formats/docx/imageCollector.ts` `add(dataUrl)` **L15–28**: Dedupe über
  `fileNameByDataUrl`-Map, Namen `imageN.ext`, **wirft** bei nicht-`data:`-URL (**L20**,
  `'Bilder müssen als data-URL vorliegen…'`); `all()` **L30–32**.
  `src/formats/odt/imageCollector.ts`: analog, Namen `Pictures/imageN.ext`, wirft **L19**.
- `src/formats/docx/writer.ts`: `blockToDocx` `case 'image'` → `imageParagraphXml` **L143–144/74**
  (`images.add(src)` **L76**); `blocksToDocx` **L203**; `writeDocx` **L252** erzeugt **pro Aufruf**
  `new ImageCollector()` (**L253**), läuft Body/Header/Footer ab (**L256/265/270**);
  `[Content_Types].xml` aus `images.all()` (**L290**), `word/media/` **nur** bei
  `images.all().length` (**L300–304**, Dateiname via `.split('/').pop()`),
  `word/_rels/document.xml.rels` aus dem `RelationshipRegistry` (**L299**).
- `src/formats/odt/writer.ts`: `blockToOdt` `case 'image'` **L176–182** schreibt
  `<text:p><draw:frame … text:anchor-type="as-char"><draw:image xlink:href="…"/></draw:frame></text:p>`
  (**L182**, `images.add(src)` **L178**); `writeOdt` **L260** erzeugt `new ImageCollector()` (**L262**),
  Walk **L266/271/272**, `buildManifestXml(images.all())` (**L244/277**), Bilddateien-Loop **L285**.
- Reader: `docx/reader.ts` decodiert Bild-Runs als eigenständigen Block
  (`{ type:'image', attrs:{ src, alt } }` **L266–269**, `resolveImageSources` **L442**);
  `odt/reader.ts` Frame→Bild **L233–237**, `resolveImageSources` **L326–340** (löst `xlink:href` aus
  dem Zip zu einer `data:`-URL auf). **Kein** baumunabhängiger, veraltbarer Bild-Zustand.

**Fazit:** Ein aus dem ProseMirror-Dokument entferntes Bild wird beim nächsten Export **nicht mehr
besucht** ⇒ es entsteht **konstruktiv** kein Eintrag in `[Content_Types].xml`/`word/media/`/`rels`
bzw. `manifest.xml`/`Pictures/`. Keine Produktionscode-Änderung nötig (3.7).

### 1.7 Tests — präziser Bestand
- Unit: `commands.test.ts` (`canCut`, `cutSelection`), `docx|odt/__tests__/roundtrip.test.ts`
  („round trip: images" + Negativfall „externe URL wirft"), `cut-roundtrip.test.ts` (beide Formate),
  `external-fixtures.test.ts`/`external-validation.test.ts`.
- E2E: `cut.spec.ts` (Testfall 8 **L211**: Bild anklicken + **Strg+X** → `img`-Count 0, Text bleibt;
  Rundreise 6 **L552**: DOCX-Export ohne `word/media`; Umschalt+Entf **L435**),
  `clipboard.spec.ts` (Grenzfall 6 **L266**: Bild-Kopie via `Home`+`ArrowLeft`=`selectNodeBackward`,
  Klick auf 1×1-Testbild als **„unreliable"** dokumentiert **L293–304**; Grenzfall 7 **L573**: großes
  Bild friert UI nicht ein), `export-error-handling.spec.ts` (**L33**: Bild-Einfügen nutzt `data:`-URL,
  kein `createObjectURL`), `selection-regression.spec.ts` (Auslöser **nur** „Fett").
- **Die echte Lücke** (Req 6.2): kein Test drückt **Entf/Rücktaste** (`deleteSelection`) auf einer
  Bild-Selektion; kein R1-Sichtbarkeits-Test; kein isoliertes **Klick+Entf** (R2); keine Bild-Variante
  des Selection-Sync-Regressionstests; kein **ODT**-Verwaisungs-Test und kein **DOCX-Entf-Pfad**-Verwaisungs-Test.

---

## 2. Real ausgeführte Laufzeit-Verifikation des generischen Löschverhaltens (Ausgangszustand vor dem Fix)

**Hinweis vorab (2026-07-05):** Diese Sonde beschreibt den Zustand **vor** dem in Abschnitt 3.2/4.2
gebauten Custom-Command — sie ist der **Beleg, warum** der Fix nötig ist, nicht mehr der Zielzustand.
Für den Grenzfall „Bild alleiniger Listenpunkt-Inhalt" gilt ab dieser Fassung das in Abschnitt 3.2
beschriebene **Soll**, nicht das hier gemessene Ist.

Um „vorhanden" weder ungeprüft als richtig noch als falsch anzunehmen (Req Abschnitt 0), wurde eine
**tatsächlich ausgeführte** Vitest-Sonde gegen die **installierten** Pakete (`prosemirror-state`,
`prosemirror-commands`, `prosemirror-history`) und das **echte** `wordSchema` sowie die **echte**
`insertImage`-Funktion laufen gelassen (jsdom, reine Datenmodell-Ebene). Getestet wurde jeweils
`deleteSelection` (das erste Glied der `baseKeymap`-Delete/Backspace-Kette) auf einer per
`NodeSelection.create` gesetzten Bild-Selektion; jedes Ergebnis wurde mit `doc.check()` auf
Schema-Gültigkeit geprüft. Die Sonde wurde nach Auswertung **wieder entfernt** (kein Bestandteil des
Repos). Ergebnisse:

| Szenario | Ergebnis (verifiziert) | Req-Bezug |
|---|---|---|
| Bild einziger Dokumentinhalt, löschen | `doc` → genau **ein leerer `paragraph`**, gültig; Selektion kollabiert (leer). | Grenzfall 2 ✓ |
| `paragraph('Before')`, Bild, `paragraph('After')`, löschen | Beide Absätze **exakt** erhalten, `textContent='BeforeAfter'`, Cursor **am Anfang von „After"** (pos = `nodeSize('Before')+1 = 9`), beide Absätze bleiben **getrennt**. | Grenzfall 1 + Req 3.3/3.4 ✓ |
| Bild alleiniger Inhalt einer **Tabellenzelle** löschen | Zelle wird automatisch mit leerem `paragraph` **aufgefüllt**, beide Zellen + Zeilenstruktur bleiben; gültig. | Grenzfall 7 ✓ |
| **Bild alleiniger Inhalt des EINZIGEN Listenpunkts** löschen | **Ganze Liste kollabiert** → `doc` = ein leerer Top-Level-`paragraph`. `bullet_list`/`list_item` verschwinden. Gültig, aber **nicht** „leerer Listenpunkt bleibt erhalten". | **Grenzfall 8 — WIDERSPRUCH zur Req** ⚠ |
| **Mehrgliedrige Liste** `[One, [Bild], Three]`, Bild-Item löschen | Der Bild-Listenpunkt wird **komplett entfernt** → Liste = `[list_item(One), list_item(Three)]` (2 statt 3 Items). Der leere Punkt bleibt **nicht** bestehen. | **Grenzfall 8 — WIDERSPRUCH zur Req** ⚠ |
| Selektion unmittelbar nach `insertImage(src,'ALT')` | Bereits eine `NodeSelection`, `.node.type='image'`, `.node.attrs.alt='ALT'`. Sofortiges Löschen ohne erneuten Klick möglich. | Grenzfall 16 ✓ |
| Löschen → `undo` (mit `history()`), Bild `{src, alt:'RT', width:123, height:45}` | Bild mit **exakt** allen vier Attributen an ursprünglicher Position wiederhergestellt. | Grenzfall 11 + Req 3.5 ✓ |
| `selectNodeBackward` von der Position direkt nach dem Bild | Erzeugt eine Bild-`NodeSelection` (Tastatur-Markierweg, umgeht R2). | Zugriffsweg 2 ✓ |

**Kern-Erkenntnis (neu, korrigiert K8/K2):** Der generische Pfad ist für 7 der 8 sondierten Fälle
korrekt. Der **einzige** strukturelle Abweicher ist **Grenzfall 8**: Weil `list_item` als **eigenes
Kind** aus `bullet_list`/`ordered_list` (`content: 'list_item+'`) **entfernbar** ist (anders als eine
Tabellenzelle, die aus einer festen `table_row` **nicht** entfernt werden kann und daher aufgefüllt
wird), löscht `deleteSelection` beim einzigen Inhalt eines Listenpunkts den **ganzen Punkt**. Req
Grenzfall 8 erwartet dagegen „der leere Listenpunkt bleibt erhalten, aufgefüllt mit leerem Absatz".
Das ist der **einzige Punkt, an dem generisches Verhalten ≠ Req-Erwartung** ist. Die Req entscheidet
das inzwischen verbindlich zugunsten „Punkt bleibt erhalten" (Korrekturhinweis Punkt 6); Abschnitt 3.2
beschreibt den dafür gebauten, eng begrenzten Custom-Command — **nicht mehr** offen zu entscheiden.

**Zusätzliche Bibliotheks-Belege (nicht sondierbar auf Datenebene, aus dem Paketquellcode):**
- `Mod-Backspace`/`Shift-Backspace` sind in `baseKeymap` **Aliase** auf dieselbe
  `chainCommands(deleteSelection, …)`-Kette wie `Backspace` — auf einer Bild-`NodeSelection` also
  identisch (Req Zugriffsweg 5 „`Mod-Backspace`"). E2E bestätigt das zusätzlich am Browser (7.2).
- **Abgebrochener Drag** (Grenzfall 13/Req Zugriffsweg 9): `prosemirror-view`s `dragstart` baut nur
  einen In-Memory-Slice/`dataTransfer` auf und dispatcht **keine** Transaktion; das Entfernen der
  Quelle passiert ausschließlich in `handleDrop` bei einem echten `drop` innerhalb der Editor-DOM. Ein
  Drop außerhalb / `Esc` löst kein `drop` aus ⇒ nichts wird gelöscht. E2E-Sanity-Check in 7.2.
- **Mobile-Restrisiko** (Req Zugriffsweg 7): `prosemirror-view`s `beforeinput`-Workaround für den
  Chrome-Android-`deleteContentBackward`-Bug prüft `$cursor` und greift **nur** für eine
  `TextSelection`. Eine Bild-`NodeSelection` hat kein `$cursor` ⇒ der Workaround greift nicht — der
  Grund, warum der Toolbar-Button (3.3) als **tastatur-unabhängiger** Pflichtweg gebaut wird.

**Was Abschnitt 2 NICHT klärt (bewusst offen für E2E):** R1 (Sichtbarkeit) und **R2** (kollabiert
`reconcileSelectionOnClick` die per **Klick** erzeugte Bild-`NodeSelection`?) sind DOM-/Browser-Fragen
und **nicht** auf Datenmodell-Ebene entscheidbar. Siehe 3.4 (Code-Analyse + Guard) und 7.2 (Test).

---

## 3. Zielarchitektur und Entscheidungen

### 3.1 CSS `.ProseMirror-selectednode` — eigene Regel (R1-Fix)
Eigene, knappe Regel in `src/index.css` statt Import des Fremd-Stylesheets (das bringt hier
unnötige/kollidierende Regeln mit: `white-space` auf `.ProseMirror`, `.ProseMirror-hideselection`,
`img.ProseMirror-separator`, `li`-Marker-Trick). Farbwert am Bibliotheks-Default orientiert, mit
Light/Dark-Bewusstsein (`@media (prefers-color-scheme: dark)`). Details 4.1.

### 3.2 `isImageSelected`/`deleteImage` — dünner Wrapper, mit einer gezielten Ausnahme (Grenzfall 8, OE-1 entschieden)
Drei kleine, benannte, unit-testbare Bausteine in `commands.ts`: `isImageSelected` (Guard),
`soleListItemImageRange` (interner Helfer, nicht exportiert) und `deleteImage` (die eine Funktion, die
sowohl der Toolbar-Button als auch die neuen Tastatur-Bindungen aufrufen — ein Codepfad, kein
Verhaltensunterschied zwischen Maus/Touch und Tastatur). Für **alle** Fälle außer dem einen
Sonderfall unten ruft `deleteImage` **bewusst dieselbe** `tr.deleteSelection()`-Operation auf, die
`baseKeymap` bereits nutzt — kein neues Löschverhalten, nur ein benannter, kontext-geprüfter
Einstiegspunkt.

**Grenzfall-8-Entscheidung — PO-Entscheid übernommen, nicht mehr offen (vormals OE-1):** Die Req
(`bild-loeschen-req.md`, Korrekturhinweis Punkt 6, PO-Entscheidung vom 2026-07-05) legt verbindlich
fest: Ist das gelöschte Bild der **alleinige Inhalt eines `list_item`**, bleibt der Listenpunkt
**erhalten** — geleert und mit einem leeren Absatz aufgefüllt —, statt entfernt zu werden; eine
einzeilige Liste darf beim Löschen ihres einzigen Bildes **nicht** verschwinden. Das ist jetzt **Teil
des Umsetzungsauftrags**, keine offene Frage mehr. Begründung/Ableitung, warum ein eng begrenzter
Sonderfall nötig ist (und kein allgemeines Rebinding genügt):

1. **Warum der generische Pfad das nicht leistet:** `list_item+` (Content-Modell von `bullet_list`/
   `ordered_list`) toleriert eine kürzere Liste — ProseMirrors Replace-„Fit"-Algorithmus wählt deshalb
   das Entfernen des leeren `list_item` als „flachste gültige" Lösung (siehe Abschnitt 2). Bei einer
   `table_cell` (ebenfalls `block+`) tritt das Problem strukturell **nicht** auf: `table_row`s von
   `tableNodes()` erzeugtes Content-Modell verlangt eine **feste** Zellenzahl, die Zelle kann also gar
   nicht entfernt werden — ProseMirror bleibt nur das Auffüllen. Genau dieser Unterschied ist der
   Grund, warum **nur** der `list_item`-Fall einen Sonderpfad braucht.
2. **Warum trotzdem EIN Codepfad für Button und Tastatur:** `deleteImage` bleibt die **einzige**
   Implementierung; Button und `Delete`/`Backspace`/`Mod-Backspace`/`Shift-Backspace` rufen dieselbe
   Funktion auf (§4.2/§4.4) — kein Zustandsunterschied zwischen den Zugriffswegen.
3. **Warum ein `replaceWith(image, emptyParagraph)` statt `deleteSelection` + Nachbau:** Ein direkter
   `tr.replaceWith(from, to, paragraph.create())` ersetzt nur den Bild-Node durch einen bereits
   gültigen Absatz — der `list_item` bleibt zu jedem Zeitpunkt der Transaktion valide (1 Block, erfüllt
   `block+`), die problematische „Fit"-Kaskade (die das `list_item` bzw. bei einem Einzeleintrag die
   ganze Liste entfernt) wird dadurch gar nicht erst ausgelöst.
4. **Geltungsbereich bewusst eng:** Der Sonderfall greift **nur**, wenn `selection.$from.parent.type
   === list_item` **und** `parent.childCount === 1` (das Bild ist wirklich der einzige Inhalt). Ein
   Bild neben Text im selben `list_item` (`childCount > 1`) läuft weiter über den generischen Pfad —
   dort entfernt `deleteSelection` korrekt nur das Bild, der Listenpunkt-Text bleibt (kein
   Sonderfall nötig, kein Risiko einer Verhaltensänderung an einer Stelle, die die Req nicht anspricht).
5. **Req Grenzfall 8s harte Zusicherung „kein invalider `list_item` (0 Blöcke)"** bleibt erfüllt —
   stärker sogar als zuvor: der `list_item` ist zu **jedem** Zeitpunkt der Transaktion mit genau einem
   Block gefüllt, nie 0 Blöcke, nie eine Zwischenkaskade.

Ein Cursor-Positionierungs-Sonderfall ist nicht nötig: `NodeSelection.map` fällt beim Ersetzen des
selektierten Node automatisch auf `Selection.near(...)` an der (neu belegten) Position zurück (siehe
`prosemirror-state`-Quelltext, `Transaction`/`Selection`), sodass der Cursor nach dem Fix ohnehin
kollabiert im neuen leeren Absatz landet — deckungsgleich mit Req 3.4.

### 3.3 Toolbar-Button „Bild löschen" — Pflicht, kontextabhängig
Neuer Button, **nur** gerendert wenn `isImageSelected(view.state)`, mit SVG-Icon (Muster
`ScissorsIcon`). Pflicht (nicht optional), weil der Mobile-`beforeinput`-Workaround für eine
`NodeSelection` nicht greift (Abschnitt 2) — der Button ist der einzige tastatur-**un**abhängige,
antippbare Lösch-Weg (Req Zugriffsweg 7/Grenzfall 19). Sichtbarkeit aktualisiert sich automatisch, weil
`dispatchTransaction` nach jeder Transaktion `forceRender` aufruft (WordEditor.tsx **L131**). Code 4.3.

### 3.4 R2-Guard in `reconcileSelectionOnClick` — Bild-`NodeSelection` nicht kollabieren
**Code-Analyse:** Bei einem Plain-Click (Bewegung ≤ 3 px) läuft `onMouseUp` → `reconcileSelectionOnClick`
und setzt `TextSelection.near(posAtCoords(...))`. ProseMirror setzt beim Klick auf ein Bild (mousedown)
zunächst eine `NodeSelection`; der Reconcile würde sie danach durch einen benachbarten Text-Caret
**ersetzen** (`newSelection.eq(...)` ist `false`, weil `TextSelection ≠ NodeSelection`). Genau das ist
R2 — „Klick + Entf" könnte dann nichts löschen (erst ein zweites Entf via `selectNodeForward`).

Der Reconcile existiert laut seinem eigenen Docstring, um eine **veraltete** nicht-leere Selektion
(`AllSelection` nach Strg+A, neu umschlossener Textbereich nach einer Toolbar-Aktion) nach einem
Neupositionierungsklick zu kollabieren. Eine **frisch per Klick erzeugte** Bild-`NodeSelection` ist
**keine veraltete** Selektion, die zu „reparieren" wäre — sie ist die beabsichtigte Selektion. Daher:

**Entscheidung:** Früh-Return, wenn die aktuelle Selektion eine `NodeSelection` ist. Das erhält die
per Klick gesetzte Bild-Selektion und lässt das eigentliche Reconcile-Ziel (Text-/All-Selektionen)
unangetastet. Erklärt zugleich, warum `cut.spec.ts` Testfall 8 (Klick+Strg+X) heute **trotzdem**
funktioniert (vermutlich weil `posAtCoords` auf dem ungestylten 1×1-Testbild `null` liefert und der
Reconcile per `if (!coords) return` ohnehin no-opt — `clipboard.spec.ts` nennt den Klick genau deshalb
„unreliable"): Der Guard macht das Verhalten **unabhängig** von dieser Zufälligkeit robust. Code 4.4.

Der finale Nachweis, dass „Klick + Entf" auf einem **real großen** Bild in einem Schritt löscht, ist
ein Browser-Test (7.2 Testfall R2) — die Code-Analyse begründet den Guard, der Test bestätigt ihn.

### 3.5 Kontextmenü — bewusst nativ belassen (dokumentiert, Req Zugriffsweg 3)
Kein eigener `contextmenu`-Listener, kein `preventDefault()` (identisch zur bereits im Code
dokumentierten Cut-Entscheidung, WordEditor.tsx **L117–121**). Rechtsklick zeigt das native
Browser-Menü ohne Dokument-Löschbezug. „Bild löschen" ist damit über Weg 1 (Klick+Entf/Rücktaste),
Weg 2 (Tastatur `selectNodeBackward`+Entf) und Weg 3 (Toolbar-Button) erreichbar — bewusste, hier
dokumentierte Entscheidung, kein unklarer Zwischenzustand (Req DoD Punkt 4).

### 3.6 Bestätigungsdialog — bewusst nicht vorhanden (dokumentiert, Req Zugriffsweg 6/8)
Kein Dialog; Strg+Z ist das Sicherheitsnetz (Abschnitt 2: exakte Attribut-Wiederherstellung belegt).
Explizit dokumentiert, damit keine „fehlende Sicherheitsabfrage" nachgerüstet wird.

### 3.7 `src/formats/docx/*`, `src/formats/odt/*` — keine Produktionscode-Änderung
Begründung 1.6 (frischer `ImageCollector`-Walk je Export). Nur neue Tests (7.3/7.4) beweisen die
Verwaisungs-Freiheit für den **Entf-Pfad** und für **ODT**.

### 3.8 `schema.ts` — optionale, verhaltensneutrale Klarstellung
Empfehlung (nicht zwingend): `selectable: true` im `image`-NodeSpec **explizit** ergänzen, analog zu
`hard_break`s explizitem `selectable: false`. Reine Doku-Änderung (Default ist bereits `true`). Code 4.5.

---

## 4. Dateigenaue Änderungen

### 4.1 `src/index.css` (ändern) — nach `.ProseMirror img` (nach L42)
```css
/* Sichtbares Auswahl-Feedback für eine NodeSelection (im normalen Bedienfluss nur per
   Klick/Tastatur auf ein Bild erreichbar). prosemirror-view setzt die Klasse selbst,
   liefert aber ohne dieses Stylesheet keinerlei CSS — siehe specs/bild-loeschen-code.md
   §1.5/§3.1. Farbwert am Bibliotheks-Default orientiert, bewusst isoliert gepflegt statt
   das ganze prosemirror-view/style/prosemirror.css zu importieren. */
.ProseMirror-selectednode {
  outline: 2px solid #3b82f6;
  outline-offset: 1px;
}

@media (prefers-color-scheme: dark) {
  .ProseMirror-selectednode {
    outline-color: #60a5fa;
  }
}
```

**Koordinationshinweis (geteilte Infrastruktur — vor dem Einbau prüfen):** Genau **dieselbe**
`.ProseMirror-selectednode`-Regel wird auch von `specs/bild-einfuegen-code.md` (dort Fix **F9/§4.6**,
`outline: 2px solid #2563eb`) als Muss-Fix geführt — beide Features teilen die Lücke „kein
Auswahl-Feedback". Da `insertImage`/Toolbar/`index.css`/`schema.ts` gemeinsame Dateien sind, gilt:
Landet `bild-einfuegen` die Regel **zuerst**, darf `bild-loeschen` sie **nicht** duplizieren, sondern
nur **verifizieren** (R1-Test §7.2/1 greift unabhängig davon) und ggf. um die hier ergänzte
Dark-Mode-Variante erweitern. Ist beim Umsetzen bereits eine `.ProseMirror-selectednode`-Regel
vorhanden, ist §4.1 ein **No-op-Merge**, kein zweiter Block. (Farbwerte `#3b82f6`/`#2563eb` sind beide
ausreichend kontrastierend; der exakte Ton ist unkritisch, solange nur **eine** Regel entsteht.)

### 4.2 `src/formats/shared/editor/commands.ts` (ändern)
Import ergänzen (`NodeSelection` als **Wert**, nicht nur Typ — `instanceof` braucht den Konstruktor):
```ts
import type { Command, EditorState } from 'prosemirror-state'
import { NodeSelection } from 'prosemirror-state'
```
Neue Funktionen (z. B. direkt nach `insertImage`, oder am Dateiende):
```ts
/** True, wenn genau ein `image`-Node als NodeSelection markiert ist (Klick oder Tastatur). */
export function isImageSelected(state: EditorState): boolean {
  return (
    state.selection instanceof NodeSelection &&
    state.selection.node.type === wordSchema.nodes.image
  )
}

/**
 * If the selected image is the SOLE content of its enclosing `list_item`, returns the
 * `[from, to)` range of the image node so `deleteImage` can replace just the image (keeping
 * the list_item — and therefore the list — intact) instead of letting `list_item+`'s
 * replace-"fit" logic remove the now-empty list_item (measured, unwanted default behaviour,
 * see specs/bild-loeschen-code.md Abschnitt 2). `null` for every other case: no image
 * selected, image has sibling content in the same list_item, or the parent isn't a
 * list_item at all (e.g. a table_cell — its fixed-width table_row content model already
 * forces ProseMirror to refill instead of remove, so no workaround is needed there; see
 * specs/bild-loeschen-code.md §3.2 point 1 for why the two cases differ structurally).
 * Not exported: an internal detail of `deleteImage`, not a standalone public check.
 */
function soleListItemImageRange(state: EditorState): { from: number; to: number } | null {
  const { selection } = state
  if (!(selection instanceof NodeSelection) || selection.node.type !== wordSchema.nodes.image) {
    return null
  }
  const parent = selection.$from.parent
  if (parent.type !== wordSchema.nodes.list_item || parent.childCount !== 1) return null
  return { from: selection.from, to: selection.to }
}

/**
 * Deletes a selected image. This is the ONE implementation Delete/Backspace/Mod-Backspace/
 * Shift-Backspace (WordEditor.tsx's own keymap, bound ahead of `keymap(baseKeymap)`) and the
 * "Bild löschen" toolbar button all call — no behavioural drift between the keyboard and the
 * mouse/touch path. Returns `false` when no image is selected, so the keyboard bindings
 * correctly fall through to prosemirror-commands' normal text-delete/join chain (Req
 * Grenzfall 15 — Entf ohne Bild-Selektion bleibt unverändertes Textlöschen).
 *
 * Grenzfall 8 (Bild als alleiniger Listenpunkt-Inhalt) — PO-Entscheidung übernommen
 * (bild-loeschen-req.md Korrekturhinweis Punkt 6, vormals offene Frage OE-1): the plain
 * `tr.deleteSelection()` that baseKeymap uses would remove the whole (now-empty) list_item —
 * and, for a single-item list, the whole list — because `list_item+` tolerates a shorter
 * list, so ProseMirror's replace-"fit" algorithm treats dropping the item as the shallowest
 * valid result (verified in specs/bild-loeschen-code.md Abschnitt 2). The Req explicitly
 * rejects that as a "Nebenwirkung auf den Text". So: if the image is the sole content of a
 * list_item, replace just the image with a single empty paragraph (`tr.replaceWith`) instead
 * of deleting the range — the list_item, and the list, stay structurally intact at every
 * point of the transaction. Every other case (no image selected, image with siblings, image
 * in a table cell/paragraph/document root) is untouched: plain `tr.deleteSelection()`,
 * identical to what baseKeymap already does.
 */
export function deleteImage(): Command {
  return (state, dispatch) => {
    if (!isImageSelected(state)) return false
    if (dispatch) {
      const soleInListItem = soleListItemImageRange(state)
      const tr = soleInListItem
        ? state.tr.replaceWith(soleInListItem.from, soleInListItem.to, wordSchema.nodes.paragraph.create())
        : state.tr.deleteSelection()
      dispatch(tr.scrollIntoView())
    }
    return true
  }
}
```
Kein Cursor-Sonderfall nötig: `NodeSelection.map` (prosemirror-state) fällt beim Ersetzen des
selektierten Node automatisch auf `Selection.near(...)` zurück — der Cursor landet nach beiden
Zweigen kollabiert an/nahe der alten Bildposition, ohne dass `deleteImage` die Selektion selbst
setzen muss.

### 4.3 `src/formats/shared/editor/Toolbar.tsx` (ändern)
1. Import erweitern: `isImageSelected`, `deleteImage` aus `./commands`.
2. SVG-Icon-Komponente (Muster `ScissorsIcon`):
```tsx
function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M4 7h16" /><path d="M9 7V4h6v3" /><path d="M6 7l1 13h10l1-13" /><path d="M10 11v6M14 11v6" />
    </svg>
  )
}
```
3. Kontextabhängiger Button — direkt nach dem `🖼 Bild`-`<label>` (nach L294, vor dem schließenden
   `</div>` L295):
```tsx
{isImageSelected(view.state) && (
  <button
    type="button"
    title="Bild löschen"
    aria-label="Bild löschen"
    onMouseDown={(e) => {
      e.preventDefault()
      run(view, deleteImage())
    }}
    className="px-2 py-1 rounded text-sm border border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
  >
    <TrashIcon />
  </button>
)}
```
Kein `run()`-Umbau nötig (K5). Sichtbarkeit folgt automatisch dem `forceRender` je Transaktion.

### 4.4 `src/formats/shared/editor/WordEditor.tsx` (ändern) — R2-Guard + Delete/Backspace-Bindungen + Kommentar
1. Import erweitern: `import { EditorState, TextSelection, NodeSelection } from 'prosemirror-state'`.
2. Import erweitern: `deleteImage` zur bestehenden `from './commands'`-Import-Zeile hinzufügen (dort
   stehen bereits `cutSelection`, `insertHardBreak` — **L12**):
```ts
import { cutSelection, deleteImage, insertHardBreak } from './commands'
```
3. Früh-Return in `reconcileSelectionOnClick` (L43–50), als **erste** Anweisung der Funktion:
```ts
function reconcileSelectionOnClick(view: EditorView, event: MouseEvent) {
  // Eine NodeSelection (z. B. Klick auf ein Bild) ist eine gewollte, frische Selektion,
  // kein veralteter Text-/AllSelection-Rest nach einer Toolbar-Aktion. Sie hier in einen
  // Text-Caret zu kollabieren würde "Bild anklicken -> Entf" still brechen (R2, siehe
  // specs/bild-loeschen-code.md §3.4). Also unangetastet lassen.
  if (view.state.selection instanceof NodeSelection) return
  const coords = view.posAtCoords({ left: event.clientX, top: event.clientY })
  // ... unverändert
}
```
4. **Neu — Delete/Backspace-Bindungen im eigenen Keymap (L85–107), vor `Shift-Delete`:** damit der
   Listenpunkt-Fix (§3.2/§4.2) auch über die Tastatur greift und nicht nur über den Toolbar-Button, muss
   `deleteImage()` **vor** `keymap(baseKeymap)` (L108) an genau den Keys hängen, die `baseKeymap` selbst
   für Löschen benutzt (`pcBaseKeymap`/`macBaseKeymap` aus `prosemirror-commands`, beide identisch für
   diese fünf Namen):
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
  // Ohne Bild-Selektion liefert deleteImage() `false` und das jeweilige Binding
  // fällt (siehe prosemirror-keymap: "returning false tries the next plugin")
  // korrekt an keymap(baseKeymap) durch — normales Text-Löschen bleibt exakt so
  // wie zuvor (Req Grenzfall 15). Mit Bild-Selektion greift der Grenzfall-8-Fix
  // (§3.2) unabhängig davon, mit welcher dieser Tasten gelöscht wird.
  Delete: deleteImage(),
  'Mod-Delete': deleteImage(),
  Backspace: deleteImage(),
  'Mod-Backspace': deleteImage(),
  'Shift-Backspace': deleteImage(),
  'Shift-Delete': cutSelection({ onCutBlocked: setCutError }),
}),
keymap(baseKeymap),
```
5. Dokumentierender Kommentar oberhalb der `EditorView`-Konstruktion (analog zum vorhandenen
   Ausschneiden-Kommentar L117–121): Kontextmenü bewusst nativ (§3.5); Bestätigungsdialog bewusst
   keiner (§3.6).

**Bewusst unveränderter Rest-Umfang (dokumentierte Lücke, nicht Teil dieses Auftrags):** macOS bindet
in `macBaseKeymap` zusätzlich Emacs-artige Aliase auf dieselben Funktionen — `Ctrl-h` (= Backspace),
`Ctrl-d` (= Delete), `Alt-Backspace`/`Ctrl-Alt-Backspace`/`Alt-Delete`/`Alt-d` (= Mod-Backspace/
-Delete). Diese fünf zusätzlichen Namen sind in `pcBaseKeymap` **nicht** enthalten und werden von der
obigen Liste **nicht** geshadowt — auf einer Bild-`NodeSelection` in einem einzeiligen Listenpunkt
würden sie weiterhin den generischen (Punkt-entfernenden) Pfad auslösen. Bewusst nicht mit abgedeckt:
Der Req-Zugriffsweg 5 nennt nur `Mod-Backspace`, keine Emacs-Aliase; die fünf Haupttasten decken alle
in Req Abschnitt 2 genannten Zugriffswege ab. Als kleine, dokumentierte Restlücke geführt (Abschnitt 10).

### 4.5 `src/formats/shared/schema.ts` (optional, 3.8)
Ein-Zeilen-Ergänzung `selectable: true,` im `image`-NodeSpec (L58–85). Kein Pflichtbestandteil.

### 4.6 `src/formats/docx/*`, `src/formats/odt/*` — keine Änderung (3.7). Nur Tests (7.3).

---

## 5. Zugriffswege — finaler Soll-Zustand (Req Abschnitt 2)

| # | Weg | Entscheidung | Code-Ort |
|---|---|---|---|
| 1 | Klick markieren (sichtbar) + Entf/Rücktaste | CSS-Fix (R1) macht Markierung sichtbar; R2-Guard erhält die Klick-Selektion; Löschen läuft jetzt explizit über `deleteImage()` (eigenes Keymap, vor `baseKeymap`), inkl. Listenpunkt-Fix §3.2 | `index.css` §4.1, `WordEditor.tsx` §4.4, `commands.ts` §4.2 |
| 2 | Tastatur (`Home`+`ArrowLeft`=`selectNodeBackward`) + Entf | funktioniert (§2 verifiziert), umgeht R2; Löschen über `deleteImage()` (§4.4) | `WordEditor.tsx` §4.4, Test §7.2 |
| 3 | Kontextabhängiger Toolbar-Button | **Neu bauen**, Pflicht (Mobile) | `Toolbar.tsx` §4.3, `commands.ts` §4.2 |
| 4 | Rechtsklick-Kontextmenü | **bewusst nativ**, dokumentiert | `WordEditor.tsx` §4.4 (Kommentar) |
| 5 | `Mod-Backspace` | **Explizit auf `deleteImage()` gebunden** (§4.4), identisch zu Backspace/Delete | `WordEditor.tsx` §4.4, Test §7.2 |
| 6 | Ausschneiden (Strg+X/Shift-Delete/Schere) | **anderer Pfad** (`execCommand('cut')`), bereits getestet; **kein** Ersatz für „löschen" | vorhanden |
| 7 | Mobile/Touch | Toolbar-Button (#3) ist der verlässliche Weg | `Toolbar.tsx`, Test §7.2 auf 3 Projekten |
| 8 | Drag-Abbruch | strukturell sicher (§2), nur testen | kein Code, Test §7.2 |
| 9 | Bestätigungsdialog | **bewusst keiner**, dokumentiert | §3.6 |

---

## 6. Grenzfälle-Mapping (Req Abschnitt 4, vollständig)

| # | Grenzfall | Status | Verbleibender Test |
|---|---|---|---|
| 1 | Text vor/nach Bild bleibt erhalten | **Verifiziert** (§2) | E2E §7.2/2 |
| 2 | Bild einziges Element → leerer Absatz | **Verifiziert** (§2) | E2E §7.2 + Editierbarkeit |
| 3 | Bild am Dokumentanfang | Strukturell wie §2, `gapCursor` aktiv | E2E §7.2 |
| 4 | Bild am Dokumentende | analog | E2E §7.2 |
| 5 | Mehrere Bilder, mittleres löschen | **Verifiziert** (§2, Node-Instanz) | E2E §7.2/5 |
| 6 | Identische `data:`-URL, eines löschen | **Verifiziert Editor-Ebene** (§2) | Export-Dedupe §7.3 |
| 7 | Bild in Tabellenzelle | **Verifiziert** (§2, Zelle aufgefüllt) | E2E §7.2/6 + Roundtrip §7.4 |
| 8 | Bild alleiniger Listenpunkt-Inhalt | **Behoben durch Custom-Command** `soleListItemImageRange`/`deleteImage` (§3.2/§4.2): Punkt bleibt erhalten, mit leerem Absatz aufgefüllt; Liste verschwindet nie. Generischer Pfad (§2) diente als Beleg des Ausgangszustands, ist jetzt überholt. | E2E §7.2/15 + Unit §7.1 (beide auf **neues** Verhalten) |
| 9 | Verschachtelte Tabelle mit Bild | nicht separat sondiert (gleicher Mechanismus) | **Pflicht-E2E** §7.2 |
| 10 | Sehr großes Bild | Performance, kein Logikrisiko | E2E-Sanity §7.2 |
| 11 | Löschen + Undo | **Verifiziert** (§2, exakte Attribute) | E2E §7.2/3 |
| 12 | Undo + Redo | Standard-`history`; §2 deckt Undo | E2E §7.2/4 |
| 13 | Selection-Sync × Bild | DOM-getrieben, nicht sondierbar | **Pflicht-E2E** §7.2/7 |
| 14 | Abgebrochener Drag löscht nicht | **Bibliotheks-belegt** (§2) | E2E-Sanity §7.2 |
| 15 | Entf ohne Bild-Selektion | Guard in `deleteImage`; `baseKeymap` normal | Unit §7.1 + E2E §7.2 |
| 16 | Bild direkt nach Einfügen löschen | **Verifiziert** (§2) | E2E §7.2 |
| 17 | Reale Fremddatei, ein Bild löschen | nur mit echter Datei prüfbar | **Pflicht-E2E** §7.2/§7.4 |
| 18 | Löschen dann neues Bild | trivial (`insertImage` frischer `.create`) | E2E-Zusatz §7.2 |
| 19 | Mobile/Touch | Toolbar-Button Pflichtweg | E2E 3 Projekte §7.2 |
| 20 | Track-Changes (Phase 3) | **außerhalb Scope** | keiner (OE-2) |

---

## 7. Tests

### 7.1 `commands.test.ts` erweitern (nicht neu anlegen — existiert für `canCut`/`cutSelection`)
Muster vorhanden: `NodeSelection.create(state.doc, imagePos)` (aktuell L26–31). Ergänzen:
- `isImageSelected`: `false` bei kollabierter/nicht-kollabierter `TextSelection` und `AllSelection`;
  `true` bei `NodeSelection` auf ein `image`; `false` bei `NodeSelection` auf einen anderen Node
  (z. B. `table`).
- `deleteImage()(state, dispatch)`: `false` **ohne** Dispatch, wenn keine Bild-Selektion (Guard,
  Req Grenzfall 15); `true` + korrekt geänderte Struktur bei Bild-Selektion. Reine Verfügbarkeits-
  abfrage `deleteImage()(state, undefined)` → `true` ohne Seiteneffekt.
- **Grenzfall-Absicherung:** Bild einziges Element → ein leerer Absatz; Text davor/danach bleibt,
  Cursor am Anfang des Folgeblocks; Tabellenzelle aufgefüllt (weiterhin generischer `deleteSelection`-
  Zweig, unverändert — §2 bleibt hier gültiger Beleg).
- **Listenpunkt-Fälle (Grenzfall 8, entschiedenes Soll, NICHT das alte §2-Verhalten testen):**
  - Einzelnes Item mit Bild als einzigem Inhalt in einer sonst leeren Liste löschen → **Punkt bleibt**
    (ein `list_item`, Inhalt = ein leerer `paragraph`), Liste bleibt mit **einem** Item bestehen —
    Liste verschwindet **nicht**.
  - Mehrgliedrige Liste `[One, [Bild], Three]`, mittleres Item löschen → **weiterhin 3 Items**
    (`list_item` Nummer 2 jetzt mit leerem Absatz statt Bild), `One`/`Three` unverändert — **nicht**
    (wie vor dem Fix) auf 2 Items geschrumpft.
  - Bild **neben** Text im selben `list_item` (`childCount > 1`) löschen → **Grenzfall bleibt außen
    vor** (generischer Zweig): nur das Bild verschwindet, der Text im selben Punkt bleibt, Punkt wird
    nicht mit einem zusätzlichen leeren Absatz aufgefüllt (Abgrenzungstest für die `childCount === 1`-
    Bedingung in `soleListItemImageRange`).
  - Bild als alleiniger Inhalt einer **Tabellenzelle** (nicht `list_item`) löschen → weiterhin
    generischer Zweig, Zelle wird aufgefüllt (unverändert ggü. §2 — Abgrenzungstest, dass der
    Sonderfall korrekt auf `list_item` beschränkt bleibt und Tabellenzellen nicht anfasst).
- Undo/Redo mit `history()`: Attribute `src/alt/width/height` exakt wiederhergestellt; zusätzlich für
  den Listenpunkt-Fix: Löschen (Punkt bleibt, Bild weg) → Undo → Bild mit exakten Attributen **wieder
  im `list_item`** (nicht als neuer Absatz danach).

### 7.2 Neu: `tests/e2e/image-delete.spec.ts`
Muster wie `cut.spec.ts`/`clipboard.spec.ts` (`page.locator('label:has-text("Bild")').locator('input[type=file]').setInputFiles(...)`,
`editor.locator('img')`, `page.on('pageerror', …)`-Konsolenwächter, Undo-Settle wie `cut.spec.ts`
Testfall 9). Läuft auf allen 3 `playwright.config.ts`-Projekten (Desktop/Mobile/Tablet).
1. **R1 (DoD 1):** Bild einfügen → anklicken → `.ProseMirror-selectednode` vorhanden **und**
   `toHaveCSS('outline-style','solid')` + `outline-width` ≠ `0px` (nicht nur die Klasse prüfen).
   Danach `Delete` → `img`-Count 0.
2. **Kern (Entf-Pfad, die eigentliche Lücke):** Text davor/danach → Bild einfügen → **anklicken** →
   **Delete** → `img`-Count 0, beide Textteile exakt erhalten. Zusätzlich mit **Backspace** und mit
   **Tastaturselektion** (`Home`+`ArrowLeft`) statt Klick.
3. **R2-Aufklärung:** direkt nach dem Klick auf ein **real großes** Bild den Selektionstyp prüfen
   (Bild-`NodeSelection` erwartet, dank Guard §4.4) und belegen, dass **ein** Delete das Bild entfernt.
4. Undo (mit Settle) → Bild identisch zurück; Redo → erneut entfernt. Plus: vorheriges Tippen bleibt
   **separater** Undo-Schritt.
5. Mehrere unterscheidbare Bilder, mittleres löschen → nur dieses weg, `src` der anderen unverändert.
6. Bild in Tabellenzelle löschen → nur Bild weg, `td`-Count unverändert.
7. **Selection-Sync-Regression mit Bild (Pflicht, dauerhaft):** Text davor/danach → Bild markieren →
   Neupositionierungsklick im Text → `Enter` → tippen → kein Datenverlust (Bild-`NodeSelection` als
   Auslöser statt „Fett" wie in `selection-regression.spec.ts`).
8. `Delete` ohne Bild-Selektion → nur Text gelöscht, keine Exception (Konsolenwächter).
9. Drag-Abbruch (Drop außerhalb `.ProseMirror`/`Esc`) → `img`-Count + `src` unverändert.
10. Toolbar-Button: `toHaveCount(0)` ohne Selektion; erscheint nach Bild-Klick; Klick löscht identisch.
11. `Mod-Backspace` auf Bild-`NodeSelection` → identisch zu Backspace.
12. Reale Fixture `tests/fixtures/external/docx/VariousPictures.docx` importieren, ein Bild löschen →
    alle übrigen `src` unverändert, Count `N`→`N-1`.
13. Sehr großes Bild einfügen/löschen → kein Timeout/keine Exception.
14. **Verschachtelte Tabelle (Grenzfall 9, Pflicht):** Tabelle in Tabelle, Bild in innerer Zelle,
    löschen → kein Absturz, beide Strukturen konsistent.
15. **Listenpunkt (Grenzfall 8, entschiedenes Soll — kein OE-1 mehr):** mehrgliedrige Liste, ein Item
    nur mit Bild → löschen → **Item bleibt erhalten** (`li`-Count unverändert, `img`-Count −1, das
    betroffene `<li>` jetzt leer/mit leerem Absatz), übrige Items unverändert. Zusätzlich: Liste mit
    **genau einem** Item (nur Bild) → löschen → Liste bleibt mit **einem** Item bestehen, verschwindet
    **nicht** zu einem Top-Level-Absatz (`ul`/`ol`-Count bleibt 1). **Ersetzt** den alten, jetzt
    überholten Test in `specs/bild-loeschen-qa.md` ("Grenzfall 8 (OE-1)"), der noch das entfernte
    `li` einfriert — dieser muss von QA auf die obige, neue Erwartung umgeschrieben werden.
16. Löschen, dann neues Bild an gleicher Stelle → kein wiederverwendeter Alt-Text/Attribut.
Mobile/Touch (#19): Testfälle 1/2/7/10 laufen über die Projekt-Matrix mit; expliziter Kommentar, dass
Playwrights Geräte-Projekte Viewport/UA/Touch, **nicht** die reale On-Screen-Tastatur emulieren (das
Mobile-Restrisiko aus §2 bleibt echte-Geräte-QA, strukturell durch den Button abgesichert).

### 7.3 Neu: `src/formats/docx/__tests__/image-deletion.test.ts` + `src/formats/odt/__tests__/image-deletion.test.ts`
Reader/Writer-Ebene, direkt am Zip (`JSZip.loadAsync`) — verifiziert, dass eine bereits „ohne Bild"
vorliegende Dokumentstruktur (exakt der Editor-Zustand nach dem Löschen) **keine** Bild-Spuren
hinterlässt. Ergänzt die Editor-Ebene (§7.2) um die formatspezifische Zip-Ebene (Req 6.3: der direkte
Zip-Check ist die verlässliche Verwaisungs-Prüfung, nicht mammoth/RelaxNG).
- **DOCX:** Dokument mit Bild → Zip hat `word/media/image1.*` + `image/*` in `[Content_Types].xml` +
  `Relationship` in `document.xml.rels`. Dasselbe Dokument **ohne** Bild-Knoten → keiner dieser
  Einträge; `readDocx` des zweiten Zips → kein `image`, beide Absätze erhalten. Plus: identische
  `data:`-URL, eines entfernt → verbleibendes korrekt (Dedupe); alle Bilder entfernt → leer;
  Tabellenzelle-Fall.
- **ODT:** identische Fälle gegen `META-INF/manifest.xml` (kein `Pictures/imageN.*`-Eintrag mehr) und
  Abwesenheit der Datei (`zip.file('Pictures/image1.png') === null`).

### 7.4 E2E-Rundreise (in `image-delete.spec.ts`, Req Abschnitt 5)
Muster `docx.spec.ts`/`odt.spec.ts` (Upload/Neu → Bild → löschen → „Exportieren" →
`waitForEvent('download')` → `JSZip`-Prüfung → Reimport). DOCX **und** ODT: Bild einfügen/löschen/
exportieren → keine verwaiste Datei (`word/media` bzw. `Pictures/`+`manifest.xml`) → Reimport zeigt
kein Bild, Text vollständig. Plus: mehrere Bilder (eines), Tabellenzelle, „Löschen → Undo → Export
enthält Bild wieder", „alle Bilder → Export leer", reale Fixture (`VariousPictures.docx` / `images.odt`).
Cross-Format (Req 5.2/7–8): UI-Export erfolgt im Ursprungsformat — Cross-Format daher auf
Unit-/Adapter-Ebene führen oder als offenen Punkt markieren, **nicht** als UI-Test behaupten.

---

## 8. Risikoliste-Abgleich (Req Abschnitt 7)

- **R1** (kein Auswahl-Feedback) → **behoben** §4.1, Nachweis §7.2/1.
- **R2** (Reconcile kollabiert Bild-Selektion) → **behoben** durch Guard §4.4 (Code-Analyse), **Nachweis** §7.2/3.
- **R3** (keine benannte, getestete Löschfunktion) → `deleteImage`/`isImageSelected` §4.2 + Tests §7.1/§7.2.
- **R4** (Selection-Sync × Bild) → Pflicht-Regressionstest §7.2/7.
- **R5** (leerer Pflicht-Block) → §2 verifiziert (Absatz/Zelle aufgefüllt) **und** Listenpunkt-Fall
  jetzt **behoben** durch den Custom-Command (§3.2/§4.2, vormals OE-1) — Punkt bleibt statt entfernt.
- **R6** (ODT-/Entf-Pfad-Verwaisung ungeprüft) → §7.3 (beide Formate) + §7.4.
- **R7** (Drag-Abbruch) → §2 belegt, §7.2/9.
- **R8** (Touch ohne Entf-Taste) → Toolbar-Button §4.3, §7.2/10; Restrisiko dokumentiert (OE-3).
- **R9** (Emoji-Icon `🖼`) → neuer Lösch-Button nutzt SVG; das bestehende `🖼 Bild`-Label bleibt
  (Scope-Grenze, Stilbruch dokumentiert OE-4).
- **R10** (externe/verknüpfte Bildquelle) → Löschen entfernt nur den Node (`deleteSelection`),
  berührt `imageCollector.add` **nicht** ⇒ kein Fehlerpfad; E2E mit `odt-images-linked.odt`-artiger
  Quelle als Zusatz-Sanity in §7.2 möglich.

---

## 9. Abnahmekriterien-Abgleich (Req Abschnitt 9)

1. Sichtbare Markierung → §4.1 + §7.2/1 (berechneter Stil, nicht nur Klasse). ✓
2. Entf **und** Rücktaste (Klick- **und** Tastaturselektion) → §4.4 + §7.2/2. ✓
3. R2 final eingestuft → **behoben** (Guard §4.4 + Test §7.2/3). ✓
4. Jeder Zugriffsweg dokumentiert → §5. ✓
5. Sonderfälle (einziges Element, Zelle, Listenpunkt, Anfang/Ende) je getestet → §7.1/§7.2;
   **Listenpunkt weicht bewusst ab (OE-1)**. ⚠→ PO-Entscheidung.
6. Selection-Sync-Regression mit Bild, dauerhaft → §7.2/7. ✓
7. Rundreise DOCX **und** ODT inkl. direktem Zip-Verwaisungs-Check (Entf-Pfad) → §7.3 + §7.4. ✓
8. Undo/Redo mit korrekter Granularität (Settle) → §7.1 + §7.2/4. ✓
9. Kein stiller Datenverlust / keine Konsolen-Exception → Konsolenwächter §7.2. ✓
10. Jeder R-Punkt final eingestuft → §8. Offen bleibt bewusst OE-1 (Grenzfall 8): bis PO entscheidet,
    ist der Backlog-Status ggf. auf „teilweise" zu setzen.

---

## 10. Offene Entscheidungen / künftige Abhängigkeiten

- **OE-1 (Grenzfall 8, PO-Entscheidung, blockierend für DoD 5/10):** Das Löschen des einzigen Bildes in
  einem Listenpunkt **entfernt den Punkt** (Word-/LibreOffice-konform, valider Doc-Zustand), erfüllt
  aber **nicht** die wörtliche Req-Erwartung „leerer Punkt bleibt, aufgefüllt mit leerem Absatz". **Real
  in §2 nachgewiesen.** Empfehlung: Req Grenzfall 8 auf das tatsächliche (bessere) Verhalten korrigieren.
  Falls PO das „Erhalten" verlangt: invasiverer Custom-`Delete`/`Backspace`-Command nötig (§3.2), nicht
  empfohlen. Test §7.1/§7.2/15 friert das Ist-Verhalten so oder so ein.
- **OE-2 (Track-Changes, Req Grenzfall 20):** Sobald Phase 3 Änderungsverfolgung bringt, müssen sowohl
  `deleteImage` **als auch** der `baseKeymap`-Pfad die Löschung als Änderung markieren statt sofort
  auszuführen — dann nicht mehr allein in `deleteImage` lösbar. Außerhalb Scope.
- **OE-3 (Mobile-Tastatur):** Chrome-Android-`beforeinput`-Workaround greift nicht für `NodeSelection`
  (§2). Playwright emuliert die reale On-Screen-Tastatur nicht → echte-Geräte-QA-Restrisiko;
  strukturell durch den Pflicht-Toolbar-Button abgesichert.
- **OE-4 (Icon-Konsistenz):** Neuer Lösch-Button = SVG, bestehendes `🖼 Bild` = Emoji. Bewusste
  Scope-Grenze; künftige dedizierte Icon-Überarbeitung sollte beides angleichen.
- **Wechselwirkung `bild-groesse-aendern`/`bild-alt-text`:** Bekommen diese eigene UI, sollte der bei
  Bild-Selektion sichtbare Toolbar-Kontextbereich sie **neben** dem „Bild löschen"-Button zeigen (beide
  gleichzeitig sichtbar), nicht verdrängen. Nur Platzierungshinweis, kein Handlungsbedarf jetzt.
```

