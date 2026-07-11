# Anforderungen: „Manueller Zeilenumbruch (Umschalt+Enter)"

Status: Laut Backlog (`specs/FEATURE-BACKLOG.md`, Slug `zeilenumbruch-manuell`,
Abschnitt „3.10 Sonderzeichen & Umbrüche im Fließtext", Priorität 1) als
**„teilweise"** markiert („Erzeugt eine neue Zeile innerhalb desselben Absatzes
statt eines neuen Absatzes."). Diese Einstufung galt laut Auftrag als **nicht
vertrauenswürdig** und wurde für diese Datei durch direkte Durchsicht des
**aktuellen** Codes (Stand 2026-07-04, mit einem erneuten, unabhängigen
Verifikations-Durchgang am 2026-07-05) geprüft. Der Durchgang vom 2026-07-05
beschränkte sich **nicht** auf Code-Lektüre: die beiden zentralen Befunde dieser
Datei (0.7 und 0.12) wurden zusätzlich durch tatsächliche Ausführung von Testcode
gegen die im Repo installierten `prosemirror-*`-Pakete und das echte `wordSchema`
reproduziert (Ergebnisse in 0.7/0.12 festgehalten), nicht nur durch Lesen des
Quelltexts angenommen. Ergebnis der Verifikation: Der Status „teilweise" ist
weiterhin korrekt — aber aus **anderen, jetzt präzise benannten Gründen** als ein
früherer Entwurf dieser Datei annahm (siehe Abschnitt 0, insbesondere die
Korrektur-Hinweise). Kurzfassung: Ein bewusster Erzeugungsweg (Command **und**
Tastatur-Shortcut) existiert inzwischen bereits — er wurde jedoch **nicht** für
dieses Feature selbst, sondern als Nebenprodukt des Features „Kopieren"
(`kopieren-code.md` Abschnitt 2.4) eingebaut, trägt einen konkreten, durch direkte
Ausführung reproduzierten **Datenverlust-Bug** (Abschnitt 0.7), besitzt für sein
**eigenes** Verhalten so gut wie **keine** gezielte Testabdeckung (kein einziger
tastaturgetriebener E2E-Test, siehe Abschnitt 0.9) — und teilt sich seinen internen
Datentyp mit einem **zweiten, bisher unbeachteten Erzeugungsweg** über externes
HTML-Einfügen (Abschnitt 0.12).

Geltungsbereich: ausschließlich die Funktion „Zeilenumbruch innerhalb desselben
Absatzes per Umschalt+Enter erzeugen" (intern `hard_break`) im gemeinsamen
DOCX/ODT-Editor (`src/formats/shared/editor/`, `src/formats/shared/schema.ts`)
sowie deren Serialisierung/Deserialisierung in `src/formats/docx/` und
`src/formats/odt/`. Explizit **kein** Bestandteil dieser Datei: der manuelle
**Seitenumbruch** (siehe `seitenumbruch-req.md` — laut Befund dort komplett
fehlendes, eigenständiges Feature) und das allgemeine Einfügen-Verhalten aus der
Zwischenablage (`einfuegen-req.md`). Enge Kopplung besteht zum Feature **Kopieren**
(`kopieren-req.md`/`kopieren-code.md`): der einzige In-App-Erzeugungsweg für
`hard_break`, die `leafText`-Ergänzung im Schema und der `clipboardTextSerializer`
stammen aus dessen Umsetzung — Änderungen hier dürfen die Kopieren-Regressionstests
nicht brechen und umgekehrt (siehe Abschnitt 0.8/3.13).

Wie in `FEATURE-SPEC-DOCX-ODT.md` festgelegt: DOCX und ODT teilen sich denselben
ProseMirror-Editor. Jede Anforderung unten gilt für **beide** Formate, inklusive
Rundreise (Import/Erstellen → Umschalt+Enter → Export → Re-Import → Umbruch **und**
Inhalt bleiben erhalten, unverändert gegenüber dem Ausgangszustand bei reinem
Re-Import ohne jede Eingabe).

---

## 0. Befund aus direkter Code-Verifikation (Stand 2026-07-04)

Diese Spezifikation beruht auf tatsächlicher Durchsicht des **aktuellen** Codes,
nicht auf der Backlog-Beschreibung und nicht auf einem älteren Schnappschuss. Alle
Zeilenangaben sind mit diesem Stand-Datum zu verstehen; **load-bearing ist jeweils
das beschriebene Verhalten, nicht die exakte Zeilennummer** (die Dateien haben sich
seit dem ersten Entwurf dieser Datei nachweislich verschoben, siehe Korrektur-Hinweise).

> **Korrektur gegenüber einem früheren Entwurf dieser Datei.** Ein älterer Stand
> dieser Anforderung ging davon aus, es gebe **keinen** expliziten Command und
> **keinen** `Shift-Enter`-Keymap-Eintrag, und das beobachtbare Verhalten sei ein
> reines, nie bewusst gebautes Nebenprodukt des nativen `contenteditable`-Verhaltens
> des Browsers. **Das trifft auf den aktuellen Code nicht mehr zu.** Zwischenzeitlich
> wurde — im Zuge des Features „Kopieren" — sowohl ein `insertHardBreak`-Command
> (0.2) als auch die Bindung `Shift-Enter → insertHardBreak` (0.3) ergänzt. Die
> zentrale offene Frage des alten Entwurfs („expliziter Command **oder** nativer
> Fallback?") ist damit **bereits zugunsten des expliziten Command beantwortet** —
> die Risiken liegen jetzt an ganz anderer Stelle (0.7/0.9).

### 0.1 Datenmodell vorhanden — inklusive neuer `leafText`-Ergänzung
`src/formats/shared/schema.ts` (aktuell Zeilen 42–56) definiert `hard_break`:
`group: 'inline'`, `inline: true`, `selectable: false`, `parseDOM: [{ tag: 'br' }]`,
`toDOM(): ['br']` — **und neu** `leafText: () => '\n'` (Zeile 51). Letzteres wurde
für „Kopieren" ergänzt (`kopieren-code.md` Abschnitt 0.2, Befund A) und ist für
**dieses** Feature ebenfalls relevant: ohne `leafText` liefert jede
ProseMirror-Textextraktion (`Node.textContent`, `textBetween`, und damit die
Klartext-Zwischenablage) für einen `hard_break` den **leeren String** statt eines
Zeilenumbruchs — zwei durch Umbruch getrennte Zeilen verschmölzen sonst kommentarlos
zu einem Wort. `paragraph`/`heading` (16–38) haben `content: 'inline*'`, `list_item`
(146–152) `content: 'block+'`, Tabellenzellen aus `tableNodes({ cellContent: 'block+' })`
(154) — ein `hard_break` ist damit überall zulässig, wo auch ein `paragraph`/`heading`
vorkommen kann (Absatz, Überschrift, Listenpunkt, Tabellenzelle).

### 0.2 Expliziter Command vorhanden (neu gegenüber altem Entwurf)
`src/formats/shared/editor/commands.ts` (aktuell Zeilen 83–90) exportiert
`insertHardBreak(): Command`. Implementierung:
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
Der Kommentar darüber weist die Herkunft explizit aus: der Command wurde als
**Testbarkeits-Voraussetzung** für „Kopieren" eingebaut („Without this there is no
in-app way to create a `hard_break` at all … See specs/kopieren-code.md Abschnitt 2.4").
Er wurde also **nicht** aus einer bewussten Umsetzung dieses Features heraus
geschrieben — mit den Konsequenzen aus 0.7/0.9.

### 0.3 Tastatur-Shortcut vorhanden (neu gegenüber altem Entwurf)
`src/formats/shared/editor/WordEditor.tsx` (aktuell Zeilen 85–99) bindet im ersten
`keymap({...})`-Plugin unter anderem:
```ts
Enter: splitListItem(wordSchema.nodes.list_item),
'Shift-Enter': insertHardBreak(),
```
`Shift-Enter` ist damit ein eigener, von `Enter`/`Mod-Enter` unabhängiger
Bindungsschlüssel; `splitListItem` bleibt für reines `Enter` zuständig,
`keymap(baseKeymap)` (Zeile 100) ebenso. **Konsequenz:** Der native
`insertLineBreak`-Fallback des Browsers ist für `Shift-Enter` nicht mehr die
Grundlage — sobald ein `keymap()`-Command `true` zurückgibt (was
`insertHardBreak` **immer** tut), ruft ProseMirror `event.preventDefault()` auf und
der native Pfad wird vollständig durch die kontrollierte Transaktion ersetzt. Die
Funktion hängt damit nicht mehr an einer Browser-Eigenheit (das war die zentrale
Sorge des alten Entwurfs und ist erledigt).

### 0.4 Kein Toolbar-Button (unverändert korrekt)
`src/formats/shared/editor/Toolbar.tsx` enthält **keinen** Eintrag für
„Zeilenumbruch" (per Grep auf `insertHardBreak`/`Zeilenumbruch`/`Shift` bestätigt:
keine Treffer). Kein sichtbarer Button, kein `title`/`aria-label`, über den eine
Nutzerin oder ein Test die Funktion in der Oberfläche auffinden könnte — der einzige
Zugang ist die Tastenkombination (relevant besonders für Touch-Geräte ohne
physische Umschalt-Taste, siehe 0.11/3.16).

### 0.5 DOCX-Schreib-/Lesepfad vorhanden
- `src/formats/docx/writer.ts` (aktuell Zeilen 60–62): `hard_break` →
  `<w:r><w:br/></w:r>` (kein `w:type`-Attribut). Das entspricht dem, was echtes
  Microsoft Word für Umschalt+Enter schreibt (OOXML-Default von `w:type` ist
  `textWrapping`, inhaltlich identisch zu einem fehlenden Attribut).
- `src/formats/docx/reader.ts` (aktuell Zeilen 177–178 und 284–285): **jedes**
  `<w:br>`-Kind eines Runs wird unabhängig von einem `w:type`-Attribut als
  `{ kind: 'break' }` → `{ type: 'hard_break' }` gelesen. Es gibt **keine**
  Fallunterscheidung nach `w:type="page"`/`"column"` und **keine** Auswertung eines
  `w:clear`-Attributs. Für den Normalfall korrekt; für einen in einer Fremddatei
  enthaltenen Seiten-/Spaltenumbruch degradiert dieselbe Zeile ihn fälschlich zu
  `hard_break` (bekannte, dokumentierte Lücke, Domäne von `seitenumbruch-req.md`,
  siehe 3.8/Grenzfall 13).

### 0.6 ODT-Schreib-/Lesepfad vorhanden und sauber
- `src/formats/odt/writer.ts` (aktuell Zeile 74): `hard_break` →
  `<text:line-break/>`.
- `src/formats/odt/reader.ts` (aktuell Zeilen 150–151): `text:line-break` →
  `hard_break`, kontextunabhängig (Absatz, Überschrift, Listenpunkt, Zelle), da
  `walk` generisch rekursiert. `text:s` (Leerzeichen) und `text:tab` sind separat
  behandelt. `text:soft-page-break` wird **bewusst verworfen** und nicht als
  weiterer Umbruch fehlinterpretiert (siehe expliziten Kommentar/Fallback bei
  `reader.ts` ~291–295: ein Listenpunkt, der nur einen `soft-page-break` enthielte,
  wird mit einem leeren Absatz aufgefüllt, weil `elementToBlocks` das Element
  fallen lässt). Keine bekannte Fehlinterpretation.

### 0.7 KRITISCH (verifiziert): der ausgelieferte Command löscht ein selektiertes Bild/eine Tabelle
Der in 0.2 gezeigte Command verwendet das **ungeschützte** Muster
`state.tr.replaceSelectionWith(hard_break)`. Ist die aktuelle Selektion eine
`NodeSelection` auf einen block-artigen, nicht-inline Knoten — insbesondere ein
**Bild** (`image` ist im Schema `selectable`-Standard **`true`**, hat also **kein**
`selectable: false` wie `hard_break`, und wird durch einen einfachen Klick als
`NodeSelection` markierbar; siehe `schema.ts` Zeilen 58–85) oder eine **ganze
Tabelle** — dann **löscht** `replaceSelectionWith` den selektierten Knoten
vollständig und ersetzt ihn durch einen neu synthetisierten leeren Absatz mit dem
`hard_break` darin.

Verifiziert (siehe `zeilenumbruch-manuell-code.md` Abschnitt 0.7, dort per
eigenständigem Node-Skript gegen die installierten `prosemirror-*`-Pakete dieses
Repos reproduziert):
```
doc(paragraph("Hallo"), image, paragraph("Welt")) + NodeSelection(image)
+ state.tr.replaceSelectionWith(hard_break.create())
→ doc(paragraph("Hallo"), paragraph(hard_break), paragraph("Welt"))   // Bild ist WEG
```
Kein Fehler, keine Exception — **stiller** Verlust des Bildes. Das ist **kein
hypothetischer Edge-Case**, sondern über normale Bedienung direkt erreichbar (Bild
anklicken → `NodeSelection` → Umschalt+Enter) und **im ausgelieferten Command live**.
Es verletzt unmittelbar Grenzfall 9 dieser Datei und das Grundprinzip „kein stiller
Datenverlust" (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 18/20.4). Die im
`code.md`-Dokument beschriebene geschützte Fassung (Guard: bei `NodeSelection` auf
einen nicht-inline Knoten den Umbruch in einem neuen Absatz **nach** dem Knoten
einfügen, statt den Knoten zu ersetzen) wurde **nicht** angewandt. **Behebung ist
Pflichtbestandteil der Abnahme dieses Features** (siehe 3.3/Grenzfall 9/Abschnitt 7).

> Randnotiz: `insertTable`/`insertImage` (`commands.ts`) verwenden dasselbe
> ungeschützte `replaceSelectionWith`. Die vorbestehende Exposition dieser beiden
> Befehle ist **nicht** Gegenstand dieses Tickets; hier ist nur der über
> `Shift-Enter` erreichbare `hard_break`-Fall abzusichern. Ebenfalls zu prüfen,
> aber nachrangig: `CellSelection` (mehrere ganze Tabellenzellen markiert, eigener
> Selektionstyp aus `prosemirror-tables`) wird vom Guard-Muster **nicht** erfasst —
> siehe Grenzfall 8b.

### 0.8 Kopplung an „Kopieren" (Schema-`leafText` + `clipboardTextSerializer`)
`src/formats/shared/editor/clipboard.ts` (`clipboardTextSerializer`, in
`WordEditor.tsx` als `EditorProps.clipboardTextSerializer` verdrahtet) erzeugt die
Klartext-Repräsentation der Zwischenablage und verlässt sich für einen `hard_break`
ausdrücklich auf das in 0.1 genannte `leafText` (Kommentar `clipboard.ts` ~61–64:
„ProseMirror's own logic is sufficient here now that hard_break.leafText is set").
**Konsequenz für dieses Feature:** Das interne Kopieren/Einfügen eines Absatzes mit
`hard_break` und dessen Klartext-Ausgabe sind Teil des Soll-Verhaltens (3.13) und
regressions-relevant in **beide** Richtungen — eine Änderung an `hard_break` im
Schema (z. B. Entfernen/Ändern von `leafText`) bräche die Kopieren-Tests, und
umgekehrt. Zusätzlich verlässt sich `clipboard.ts` `rowToPlainText` (Zeile 73)
darauf, dass die Zellen-Klartextausgabe `\n` durch ein Leerzeichen ersetzt — ein
`hard_break` in einer Tabellenzelle erscheint im `text/plain`-Clipboard also als
Leerzeichen, nicht als Zeilenumbruch (Regression `clipboard.test.ts` „flattens a
hard_break inside a table cell to a space so the tab/row grid stays intact");
diese kontextabhängige Ausgabe ist gewollt und darf nicht versehentlich auf ein
generelles `\n` „vereinheitlicht" werden.

### 0.9 Testabdeckung: Serialisierung ja, echter Eingabeweg nein
- **Unit vorhanden (Reader/Writer-Korrektheit):**
  `src/formats/docx/__tests__/roundtrip.test.ts` (~119–131,
  „preserves hard line breaks within a paragraph") und das ODT-Äquivalent
  (`src/formats/odt/__tests__/roundtrip.test.ts` ~123–133) prüfen „Zeile eins" +
  `hard_break` + „Zeile zwei" (Writer→Reader), inklusive **Reihenfolge**
  (`.join('|') === 'Zeile eins|hard_break|Zeile zwei'`). Beide bauen das Dokument
  **direkt aus JSON**, nicht über einen Tastatur-Eingabeweg.
- **Unit vorhanden (leafText-Regression):**
  `src/formats/shared/editor/__tests__/clipboard.test.ts` („renders a hard_break as
  a newline instead of merging the surrounding words") sowie `kopieren-qa.md`
  (Regression „liefert `'\n'`", „doc.textBetween keeps two hard_break-separated
  lines apart"). Prüft die Klartext-Extraktion, nicht das Einfügen per Taste.
- **E2E fehlt komplett für den echten Eingabeweg.** In `tests/e2e/*.spec.ts` presst
  **kein** Test `Shift+Enter`, um einen `hard_break` zu erzeugen. Die `Shift`-Presses
  in `tests/e2e/clipboard-roundtrip.spec.ts` (Zeilen 47/99) sind
  `Shift+ArrowRight` (Selektion für Teil-Fettung), **nicht** `Shift+Enter`. Der
  Kommentar dort (~239–240, „same class of gap `insertHardBreak`/Shift-Enter closed
  for hard_break") bezieht sich nur auf die **Existenz** der Fähigkeit im Produkt,
  nicht auf einen tatsächlich ausgeführten Test. Der Weg Tastendruck →
  `insertHardBreak` → interner `hard_break` → Serialisierung ist also **nie** im
  echten Browser nachgestellt; ebenso wenig der Datenverlust-Fall aus 0.7 oder die
  Selection-Sync-Regression mit Umschalt+Enter (Grenzfall 15).

### 0.10 Browser-Matrix: Firefox/WebKit existieren, sind aber auf Clipboard-Specs beschränkt
`playwright.config.ts` (aktuell Zeilen 27–54) definiert die Projekte
`Desktop Chrome`, `Mobile` (Pixel 7, Chromium), `Tablet` (iPad Mini, WebKit) sowie
**neu** `Desktop Safari (Clipboard)` und `Desktop Firefox (Clipboard)` — letztere
beiden jedoch mit `testMatch: /clipboard.*\.spec\.ts/`, also **ausschließlich für
die Clipboard-Specs**. Ein künftiger `zeilenumbruch`-E2E-Test würde von Firefox/Safari
somit **nicht** erfasst, solange er nicht in dieses `testMatch` fällt oder die
Projekte nicht erweitert werden. Für die in Abschnitt 6 geforderte
browserübergreifende Abdeckung ist das explizit zu regeln (kein „läuft schon
irgendwo mit").

### 0.11 Kein Cross-Format-Konvertierungspfad in der UI
Jedes Format-Modul (DOCX-Karte, ODT-Karte) besitzt eine eigene Upload-/Export-Funktion,
die ausschließlich den eigenen Reader/Writer nutzt; es gibt **keine** „Speichern als
anderes Format"-/„Konvertieren"-Funktion (bestätigt in `zeilenumbruch-manuell-code.md`
Abschnitt 0.6). Ein aus der DOCX-Karte exportiertes `.docx` in die ODT-Karte
hochzuladen, bricht per Design mit einem Reader-Fehler ab (korrektes Verhalten, kein
Bug). **Konsequenz:** Die Cross-Format-Rundreise (Abschnitt 5.2) ist **nicht** als
reiner UI-E2E-Test durchführbar und wird stattdessen auf Reader/Writer-Ebene (Unit)
plus einem In-Test-Reader→Writer-Handoff verifiziert (siehe 5.2/6).

### 0.12 Zusatzbefund (neu, unabhängig verifiziert): externes HTML-Einfügen mit echtem `<br>` erzeugt bereits heute einen `hard_break` — ungeprüfter zweiter Erzeugungsweg
Abschnitt 3.13 eines älteren Entwurfs dieser Datei behandelte nur **eine** externe
Paste-Variante: mehrzeiligen **Klartext** (`text/plain`), der laut Befund zu separaten
Absätzen wird, nicht zu `hard_break`. Das ist zwar für `text/plain` weiterhin korrekt,
blendet aber einen **zweiten, tatsächlich vorhandenen Weg** aus, auf dem ein `hard_break`
von außen ins Dokument gelangt: Einfügen von **`text/html`**, das ein echtes `<br>`
enthält (z. B. Text mit weichem Zeilenumbruch, aus einer Webseite oder einer anderen
Office-Anwendung kopiert). `WordEditor.tsx` verdrahtet aktuell **keinen**
`transformPastedHTML`/`transformPasted`/`clipboardTextParser` (per Grep bestätigt:
keine Treffer in `src/`; die entsprechende Infrastruktur ist erst als **Plan** in
`einfuegen-req.md`/`einfuegen-code.md` beschrieben, nicht implementiert). Ohne einen
solchen Eingriff parst ProseMirror eingefügtes `text/html` mit dem **Standard-Schema-
Parser** (`DOMParser.fromSchema(wordSchema)`), und `hard_break.parseDOM` (`{ tag: 'br' }`,
0.1) matcht dabei **jedes** `<br>`-Element bedingungslos.

**Unabhängig verifiziert (2026-07-05, nicht nur durch Code-Lektüre, sondern durch
tatsächliche Ausführung):** ein Wegwerf-Test gegen den echten, im Repo installierten
`prosemirror-model`-Parser mit `wordSchema` und dem Eingabe-HTML
`<p>Zeile eins<br>Zeile zwei</p>` liefert einen Slice, der ein `hard_break`-Node
enthält — bestätigt genau dieses Verhalten. Ebenso wurde der Datenverlust-Bug aus 0.7
an derselben Stelle **erneut, unabhängig von der ursprünglichen Analyse**, durch
direkte Ausführung von `insertHardBreak()` gegen `doc(paragraph("Hallo"), image,
paragraph("Welt"))` mit `NodeSelection` auf dem Bild reproduziert: Ergebnis war
exakt `doc(paragraph("Hallo"), paragraph(hard_break), paragraph("Welt"))` — das Bild
verschwindet. Beide Befunde dieser Datei sind damit nicht nur gelesen, sondern
**praktisch bestätigt**.

**Konsequenz für dieses Feature:** Ein Einfügen von extern kopiertem, per `text/html`
transportiertem weichen Zeilenumbruch erzeugt schon heute einen echten `hard_break` —
ohne dass Umschalt+Enter je gedrückt wurde. Das ist (a) ein **zusätzlicher,
bisher komplett ungetesteter Weg**, auf dem die in dieser Datei beschriebenen
Rundreise-/Marken-/Navigations-Anforderungen (3.1–3.15) erreicht werden müssen, und
(b) ein Punkt, der bei Umsetzung von `einfuegen-req.md` (Einführung von
`sanitizePastedHtml`/`transformPastedHTML`) **regressions-relevant** wird: sollte
jene Umsetzung `<br>` versehentlich herausfiltern oder in einen Zeilenumbruch
zwischen zwei Absätzen umwandeln, wäre das eine Regression gegen **dieses** Feature.
Umgekehrt darf eine künftige Änderung an `hard_break.parseDOM` (z. B. Einschränkung
auf bestimmte Kontexte) nicht ungeprüft erfolgen, ohne diesen Paste-Weg erneut zu
verifizieren. Siehe Grenzfall 23 und Testplan-Punkt 11.

### Konsequenz für die Bewertung
Der Status „teilweise" bleibt zutreffend, aber die Begründung verschiebt sich
vollständig: Erzeugungsweg (Command + Keymap) und Serialisierung (beide Formate)
sind **vorhanden und im Kern korrekt**. Der Unsicherheits-/Mangel-Schwerpunkt liegt
auf (a) einem **live ausgelieferten, unabhängig nachvollzogenen Datenverlust-Bug** bei
selektiertem Bild/Tabelle (0.7), (b) **fehlender gezielter Testabdeckung** für das
Eigenverhalten des Features (0.9), (c) fehlendem Bedien-/Touch-Zugang jenseits der
Tastenkombination (0.4/0.11), (d) der bekannten Import-Verwässerung durch
Seiten-/Spaltenumbruch (0.5), (e) der noch nicht auf dieses Feature ausgeweiteten
Browser-Matrix (0.10), sowie (f) einem **zweiten, bisher unbeachteten und ebenfalls
ungetesteten Erzeugungsweg** über externes `text/html`-Einfügen mit echtem `<br>`
(0.12).

---

## 1. Menüpunkte / Bedienelemente (Soll-Zustand)

| # | Element | Auslösung | Aktueller Stand (Befund) | Soll |
|---|---|---|---|---|
| 1 | Tastenkombination Umschalt+Enter (Shift+Enter) | Tastendruck bei fokussiertem Editor | **Vorhanden** als expliziter `keymap`-Eintrag → `insertHardBreak()` (0.2/0.3). **Aber:** der Command löscht bei selektiertem Bild/Tabelle den Knoten (0.7) und hat keinen eigenen E2E-Test (0.9) | Muss zuverlässig und **browserübergreifend** (mind. zwei echte Engines, siehe 0.10) einen `hard_break` erzeugen — **und** den Datenverlust-Bug aus 0.7 beheben (Guard gegen `NodeSelection` auf nicht-inline Knoten). Der Erzeugungsweg selbst ist bereits explizit; die offene Arbeit ist Absicherung + Bugfix, nicht Neubau |
| 2 | Toolbar-Button „Zeilenumbruch einfügen" | Klick auf Toolbar-Icon | **Fehlt** in `Toolbar.tsx` (0.4) | Nice-to-have, **kein Blocker** — Word/LibreOffice bieten die Funktion in der Praxis fast ausschließlich über die Tastenkombination an. Falls ergänzt: eindeutiges, eingebettetes SVG-Icon statt Unicode/Emoji (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.1). **Ausnahme:** Auf Touch-Geräten ist ein Bedienelement die einzige Möglichkeit (siehe Zeile 6/3.16) |
| 3 | Kontextmenü-Eintrag (Rechtsklick im Editor) | Rechtsklick → „Zeilenumbruch einfügen" | Fehlt; der Editor fängt `contextmenu` bewusst nicht ab (natives Browser-Kontextmenü bleibt, vgl. `ausschneiden-req.md`) | Nice-to-have, kein Blocker |
| 4 | Eintrag in einer künftigen Menüleiste („Einfügen → Umbruch → Zeilenumbruch") | Klick | Nicht anwendbar — App hat nur eine Toolbar, keine Menüleiste | Falls künftig eine Menüleiste eingeführt wird, dort ebenfalls verfügbar machen; kein Blocker |
| 5 | Löschen eines vorhandenen Zeilenumbruchs | Cursor unmittelbar davor/danach + Entf/Backspace | Ungetestet für `hard_break` spezifisch; da `selectable: false`, keine eigene Node-Selektion — Löschen läuft über denselben nativen Lösch-/Reconciliation-Mechanismus wie jede andere Einzelzeichen-Löschung im Editor (kein eigener Command, siehe `zeilenumbruch-manuell-code.md` Abschnitt 0.8) | Muss zuverlässig in **einem** Tastendruck den Umbruch entfernen und die beiden umgebenden Textteile im selben Absatz zusammenführen — nicht den ganzen Absatz löschen, keinen Text verschlucken. Kein neuer Code erwartet, aber **Testpflicht** (Grenzfall 10) |
| 6 | Touch-/Mobil-Zugang (Bildschirmtastatur ohne verlässliche Umschalt+Enter-Kombination) | Antippen + Aktion | **Fehlt/ungeprüft** — auf einer Software-Tastatur ist Umschalt+Enter oft nicht erzeugbar; ohne Toolbar-Button (Zeile 2) existiert dann **kein** Weg, einen Zeilenumbruch einzufügen | Auf den Projekten „Mobile"/„Tablet" (`playwright.config.ts`) muss **mindestens ein** funktionierender Weg existieren, einen Zeilenumbruch zu erzeugen (praktisch: der Toolbar-Button aus Zeile 2 wird dadurch auf Touch-Geräten vom Nice-to-have zur Notwendigkeit) — oder die Nicht-Unterstützung ist bewusst zu dokumentieren, nicht stillschweigend zu lassen |
| 7 | Sichtbare Unterscheidung „Zeilenumbruch" vs. „Absatzumbruch" (Formatierungszeichen, vgl. Word „¶") | — (reine Darstellung) | **Fehlt** — kein Toggle für nicht druckbare Zeichen; `hard_break` rendert als schlichtes `<br>`, im WYSIWYG optisch nicht von einem neuen Absatz unterscheidbar | Nice-to-have, kein Blocker — aber als **bekannte Einschränkung** zu dokumentieren, da sie die visuelle Verifikation erschwert (ohne dieses Toggle ist „Zeilen- oder Absatzumbruch?" im Editor nur über Rundreise-Export/technische Inspektion zweifelsfrei zu beantworten). Es existiert bereits ein eigener Backlog-Eintrag `formatierungszeichen-anzeigen`/`formatierungszeichen-toggle` — dieses Feature ist die richtige Heimat der Nachbesserung, nicht `zeilenumbruch-manuell` |
| 8 | Navigationsverhalten (Pfeiltasten überspringen den Umbruch als atomare Einheit) | Pfeiltasten, Doppelklick | Ungetestet; `hard_break` ist strukturell atomar (`isLeaf → isAtom` automatisch, kein `atom: true` nötig — verifiziert in `code.md` 0.5) | Muss sich wie ein normales Inline-Atom verhalten: ein Pfeiltasten-Druck bewegt den Cursor um genau eine Position über den Umbruch hinweg, nicht um zwei oder null |

---

## 2. Geltende Randbedingungen aus der Haupt-Spezifikation

Diese Datei ergänzt, ersetzt aber nicht die Anforderungen aus
`FEATURE-SPEC-DOCX-ODT.md`, insbesondere:

- **Abschnitt 15 („Sonderelemente"):** „Zeilenumbruch (Umschalt+Enter) vs.
  Absatzumbruch (Enter) — beide müssen bei Rundreise unterscheidbar bleiben (bereits
  als `hard_break` vorhanden, mit Unit-Tests abgedeckt — hier nur E2E-Nachtest
  nötig)." Diese Einschätzung ist gemäß Abschnitt 0 in **zwei** Punkten zu
  präzisieren: (a) der E2E-Nachtest fehlt tatsächlich noch komplett (0.9), und
  (b) der Erzeugungsweg trägt einen Datenverlust-Bug (0.7), der über einen reinen
  „Nachtest" hinaus eine Codekorrektur erfordert.
- **Abschnitt 2 (Selection-Sync-Regressionstest):** Der Fix
  `reconcileSelectionOnClick` (`WordEditor.tsx` ~43–50) reagiert auf „DOM zeigt
  kollabierten Cursor, Modell hält noch nicht-leere Selektion". Eine `NodeSelection`
  auf ein Bild ist eine nicht-leere Selektion — genau der Zustand, aus dem heraus
  0.7 zuschlägt. Umschalt+Enter ist damit ein **zusätzlicher Verdachtsfall** für
  diesen Bug und muss mit der dortigen Sequenz nachgestellt werden (Grenzfall 15).
- **Abschnitt 18 (Import-Robustheit):** Prinzip „kein stiller Datenverlust" — hier
  durch 0.7 (Editier-seitig) **konkret verletzt**, und relevant bei der Interaktion
  mit `w:type="page"`/`"column"`/`w:clear` in Fremddateien (0.5/3.8).
- **Abschnitt 19 (Export-Robustheit & Rundreise):** Export muss mit einem
  **unabhängigen** Parser/Schema prüfbar valide sein, nicht nur mit unserem eigenen
  Reader (siehe 5/6) — sonst können sich Schreib- und Lesefehler gegenseitig
  „unsichtbar" ausgleichen.
- **Abschnitt 20.4 (kein stiller Fehlschlag):** gilt uneingeschränkt (3.17).
- **`kopieren-req.md`/`kopieren-code.md`:** teilt Schema-`leafText` und
  `clipboardTextSerializer` (0.8); Regressionstests dort dürfen durch Arbeit hier
  nicht brechen (3.13). Beachte die **kontextabhängige** Klartext-Ausgabe: in einem
  normalen Absatz wird der `hard_break` zu `\n`, **innerhalb einer Tabellenzelle**
  jedoch bewusst zu einem Leerzeichen zusammengefaltet, damit das Tab-/Zeilenraster
  der Zelle erhalten bleibt (`clipboard.ts` `rowToPlainText`, Regression
  `clipboard.test.ts` „flattens a hard_break inside a table cell to a space").
- **`seitenumbruch-req.md`:** teilt DOCX-`<w:br>`-Codepfad (0.5) und Schema-Nachbarschaft;
  Änderungen an einem der beiden Features dürfen das andere nicht regressieren (5.1).
- **`einfuegen-req.md`:** legt fest, dass mehrzeiliger, extern eingefügter Klartext
  aktuell als mehrere Absätze und **nicht** als `hard_break` ankommt — als Abgrenzung
  übernommen (3.13).

---

## 3. Gewünschtes Verhalten im Detail

### 3.1 Grundfall: Umschalt+Enter ohne Selektion (Cursor mitten im Absatz)
- Der Text wird an der Cursor-Position durch einen `hard_break` **getrennt**, beide
  Teile bleiben Bestandteil **desselben** `paragraph`-/`heading`-Nodes — es entsteht
  **kein** neuer Absatz (Abgrenzung zu normalem Enter).
- Der Cursor steht danach unmittelbar **hinter** dem eingefügten Umbruch, bereit zum
  Weitertippen auf der neuen Zeile.
- Visuell erscheint der nachfolgende Text auf einer neuen Zeile innerhalb desselben
  optischen Absatzblocks (kein zusätzlicher Absatzabstand, sofern keiner konfiguriert
  ist — siehe Menüpunkt 7 zur fehlenden visuellen Unterscheidbarkeit).

### 3.2 Umschalt+Enter über eine bestehende **Text**-Selektion
- Eine vorhandene, nicht-leere Text-/Cross-Node-Textselektion wird durch den
  `hard_break` **ersetzt** (nicht ergänzt) — das ist das gewünschte Standardverhalten
  und funktioniert mit dem vorhandenen `replaceSelectionWith` korrekt.
- Gilt auch, wenn die Selektion sich über mehrere Wörter oder einen ganzen Satz
  erstreckt; der markierte Text verschwindet vollständig und wird durch die
  Zeilentrennung ersetzt. Ein einziger Undo-Schritt stellt ihn wieder her (3.15).

### 3.3 KRITISCH: Umschalt+Enter bei selektiertem Block-Knoten (Bild/Tabelle) — **darf nicht löschen**
- Ist eine `NodeSelection` auf einen nicht-inline Knoten aktiv (Bild als Ganzes
  angeklickt; ganze Tabelle selektiert), darf Umschalt+Enter den Knoten **niemals
  ersetzen/löschen** (aktueller Fehler, 0.7). Erwartetes Verhalten: der selektierte
  Knoten bleibt vollständig und an seiner Position erhalten; der Zeilenumbruch wird an
  einer sinnvollen, definierten Stelle eingefügt (empfohlen: in einem neuen Absatz
  **nach** dem Knoten, mit Cursor dort), **oder** die Aktion ist in diesem
  Selektionszustand ein definierter, sichtbar rückgemeldeter No-Op — aber **kein**
  stiller Knotenverlust.
- Dies ist die **wichtigste** offene Korrektur dieses Features. Sie ist mit einem
  gezielten Test abzusichern (Grenzfall 9), der ohne Fix rot ist.

### 3.4 Verhalten am Absatzanfang und -ende
- Umschalt+Enter unmittelbar vor dem ersten Zeichen: erzeugt eine führende leere
  Zeile im selben Absatz, der eigentliche Text beginnt in der zweiten Zeile.
- Umschalt+Enter unmittelbar nach dem letzten Zeichen: erzeugt eine leere Folgezeile
  im selben Absatz, Cursor steht dort bereit.
- Beide Fälle dürfen **nicht** zu einem No-Op reduziert oder stillschweigend
  verworfen werden (der Command gibt bewusst immer `true` zurück).

### 3.5 Datenmodell-Repräsentation
- Bleibt der vorhandene `hard_break`-Node (0.1) **inklusive** `leafText: () => '\n'`
  — keine Schema-Änderung für dieses Feature nötig, aber `leafText` darf nicht
  entfernt werden (Kopplung an Kopieren, 0.8).
- `selectable: false` bleibt bestehen; der Umbruch ist nie als eigene Node-Selektion
  markierbar und verhält sich gegenüber Cursor-Bewegung wie ein atomares
  Inline-Zeichen (strukturell atomar, 0.1/Menüpunkt 8).

### 3.6 Marken über den Umbruch hinweg / aktive Marken beim Weitertippen
- Ein `hard_break` innerhalb eines formatierten Laufs (z. B. mitten in fettem Text)
  **trennt die Mark nicht**: Text vor **und** nach dem Umbruch bleiben fett; der
  Umbruch selbst zerschneidet die Fett-Mark nicht in zwei separate Läufe mit
  Bedeutungsverlust.
- Nach Umschalt+Enter mitten in einem formatierten Lauf bleiben die aktiven Marken
  erhalten: der **nächste getippte** Buchstabe übernimmt dieselbe Formatierung wie
  der Text vor dem Umbruch (keine ungewollte Rücksetzung auf Basisformat).
- Nach Rundreise (Export/Import, beide Formate) müssen beide Seiten des Umbruchs
  ihre Marken behalten (Grenzfall 19).

### 3.7 Export nach DOCX
- Muss `<w:r><w:br/></w:r>` bleiben (kein `w:type`, OOXML-Default `textWrapping`,
  identisch zu echtem Word).
- Muss von einem eventuell künftig hinzukommenden Seitenumbruch-Export
  (`<w:br w:type="page"/>`, `seitenumbruch-req.md`) eindeutig unterscheidbar bleiben —
  der Writer darf beide Fälle nie verwechseln, auch nachdem `page_break`-Unterstützung
  ergänzt wurde.

### 3.8 Import aus DOCX
- Ein `<w:br/>` bzw. `<w:br w:type="textWrapping"/>` aus einer echten Word-Datei muss
  zuverlässig als `hard_break` gelesen werden (0.5) — mit einem realen Word-Fixture
  regressions-abgesichert.
- **Bekannte, dokumentierte Lücke (nicht in diesem Ticket zu beheben, aber sichtbar
  zu halten):** `<w:br w:type="page"/>` und `<w:br w:type="column"/>` werden aktuell
  identisch zu einem normalen Zeilenumbruch gelesen. Behebung ist Domäne von
  `seitenumbruch-req.md`. Für dieses Ticket gilt: das Verhalten ist per Test
  **sichtbar zu dokumentieren** (Grenzfall 13), nicht als „funktioniert"
  durchzuwinken.
- **Minor-Lücke:** Ein `w:clear`-Attribut an `<w:br w:type="textWrapping" w:clear="all"/>`
  (Textfluss-Steuerung um Gleitobjekte) wird beim Import verworfen — der Umbruch
  bleibt als einfacher `hard_break` erhalten (kein Textverlust). Als bewusste
  Vereinfachung zu dokumentieren, kein Blocker.

### 3.9 Export nach ODT
- Muss `<text:line-break/>` bleiben — identisch zu dem, was LibreOffice Writer für
  Umschalt+Enter erzeugt.

### 3.10 Import aus ODT
- `<text:line-break/>` aus einer echten LibreOffice-Datei muss zuverlässig als
  `hard_break` gelesen werden — auch **verschachtelt in einem `text:span`** (Zeichen-
  Formatvorlage): der Umbruch bleibt erhalten **und** die umgebende Formatierung geht
  nicht verloren (reales Fixture `TextLineBreakText.odt`, siehe Grenzfall 20).
- Abgrenzung zu `text:s` (Leerzeichen) und `text:tab` (Tabulator): separat behandelt,
  dürfen durch künftige Änderungen nicht mit `text:line-break` verwechselt werden.
- Ein `text:soft-page-break` (reiner Rendering-Hinweis) darf **nicht** als
  `hard_break` fehlinterpretiert werden (aktuell korrekt verworfen, 0.6/Grenzfall 14).

### 3.11 Verhalten in Sonderkontexten
- **Überschrift (`heading`):** identisch zu 3.1 — bleibt **eine** Überschrift mit
  interner Zeilentrennung, wird nicht zu zwei Überschriften oder Überschrift+Absatz.
- **Listenpunkt (`list_item`):** Umbruch bleibt im selben Listenpunkt, erzeugt keinen
  neuen Punkt, beeinflusst die Nummerierung nicht.
- **Tabellenzelle:** Umbruch bleibt im selben Absatz der Zelle, erzeugt keine neue
  Zelle/Zeile, beschädigt die Tabellenstruktur nicht.
- **Kopf-/Fußzeile:** sobald diese laut `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 9 über
  die UI bedienbar sind (aktuell nicht, `WordEditor.tsx` rendert nur
  `doc.content.body`): identisches Verhalten zum Haupttext. Kein Blocker hier, aber
  bei Umsetzung von Abschnitt 9 mitzudenken.

### 3.12 Abgrenzung zum Absatzumbruch (Enter)
- Ein per Umschalt+Enter erzeugter Umbruch muss auch nach Rundreise als `hard_break`
  erkennbar bleiben und darf sich **nie** in einen neuen Absatz verwandeln (und
  umgekehrt: ein per Enter erzeugter Absatz nie in einen `hard_break`). Dies gilt
  unabhängig davon, dass beide im Editor optisch schwer unterscheidbar sind
  (Menüpunkt 7) — die interne Repräsentation trägt die Unterscheidung verlustfrei.

### 3.13 Kopplung/Abgrenzung zur Zwischenablage
- **Intern (Pflicht, gekoppelt an Kopieren):** Kopieren eines Absatzabschnitts mit
  `hard_break` innerhalb des Editors und Einfügen an anderer Stelle im Editor erhält
  den Umbruch; die Klartext-Repräsentation (`text/plain`) eines `hard_break` ist ein
  einzelnes `\n` (nicht leer, nicht Zusammenfall zweier Zeilen zu einem Wort) — über
  `hard_break.leafText` (0.1/0.8). Diese Eigenschaft ist regressions-relevant und
  darf durch Arbeit an diesem Feature nicht brechen.
- **Extern, Klartext (bewusste Abgrenzung):** Einfügen von mehrzeiligem **Klartext**
  (`text/plain`) aus einer externen Quelle erzeugt aktuell **keine** `hard_break`-Nodes,
  sondern separate Absätze (ProseMirror-Standard-Klartext-Parser). Das ist eine
  dokumentierte Abgrenzung, kein Fehler dieses Features; eine etwaige Änderung ist
  Gegenstand von `einfuegen-req.md`, muss aber, falls umgesetzt, mit den
  Rundreise-Anforderungen hier konsistent sein.
- **Extern, HTML (kein Blocker, aber Pflicht-Testlücke, neu/verifiziert, 0.12):**
  Einfügen von `text/html` mit einem echten `<br>`-Element (z. B. weicher Zeilenumbruch
  aus einer Webseite oder einer anderen Office-Anwendung kopiert) erzeugt **bereits
  heute** einen `hard_break` — unabhängig verifiziert per direktem Schema-Parser-Test
  (0.12), da `hard_break.parseDOM` jedes `<br>` unbedingt matcht und aktuell kein
  `transformPastedHTML`/`transformPasted` diesen Weg abfängt (`einfuegen-req.md` ist
  hierfür noch nicht umgesetzt). Für **dieses** Feature gilt: der so erzeugte
  `hard_break` muss denselben Rundreise-, Marken- und Navigationsanforderungen
  (3.1–3.15) genügen wie ein per Umschalt+Enter erzeugter — es gibt intern **keinen**
  Unterschied zwischen beiden Erzeugungswegen, sobald der Node im Dokument steht.
  Bisher **ungetestet** (Grenzfall 23/Testplan Punkt 11). Bei künftiger Umsetzung von
  `einfuegen-req.md` ist dieser Weg als Regressionstest gegen eine versehentliche
  Filterung/Umwandlung von `<br>` abzusichern (0.12).

### 3.14 Navigation und Selektion
- Pfeiltasten links/rechts bewegen den Cursor um genau eine Position über den Umbruch
  (wie über ein einzelnes Zeichen).
- Pfeiltasten hoch/runter navigieren zur entsprechenden Position in der
  vorherigen/nächsten sichtbaren Zeile **innerhalb desselben Absatzes**, nicht zum
  nächsten Absatz.
- Doppelklick auf ein Wort unmittelbar vor/nach dem Umbruch selektiert nur dieses
  Wort, nicht den Umbruch mit.
- Dreifachklick (Absatzselektion) selektiert den **gesamten** Absatz inklusive aller
  darin enthaltenen `hard_break`-Umbrüche als eine zusammenhängende Selektion.

### 3.15 Undo/Redo
- Einfügen eines Zeilenumbruchs ist **ein einziger** Undo-Schritt (eine `dispatch`-Transaktion).
- Löschen eines Zeilenumbruchs (Backspace/Entf direkt davor/danach) ist ebenfalls ein
  einziger Undo-Schritt und stellt den exakten Zustand davor wieder her (Text davor/danach
  bleibt exakt erhalten, keine falsche Verschmelzung/Reihenfolge).
- Redo stellt den jeweils rückgängig gemachten Zustand identisch wieder her.
- Zu verifizieren: kein unerwartetes Undo-Gruppierungsverhalten (Umbruch und direkt
  danach getippter Text weder fälschlich in einem gemeinsamen Schritt zusammengefasst,
  noch ein Umbruch, der sich nicht in einem Schritt rückgängig machen lässt).

### 3.16 Mobile/Touch
- Auf Touch-Geräten (`playwright.config.ts`-Projekte „Mobile"/„Tablet") ist zu klären
  und zu entscheiden, wie ein Zeilenumbruch ohne verlässlich erzeugbares Umschalt+Enter
  eingefügt werden kann. Ergebnis: **entweder** mindestens ein funktionierender Weg
  (praktisch der Toolbar-Button aus Menüpunkt 2, der dadurch auf Touch zur Pflicht
  wird) **oder** eine bewusst dokumentierte Nicht-Unterstützung — kein stiller Zustand,
  in dem die Funktion auf Touch schlicht unerreichbar ist (`FEATURE-SPEC-DOCX-ODT.md`
  Abschnitt 8: Editor muss auf Tablet/Mobile bedienbar bleiben).

### 3.17 Rückmeldeverhalten (kein stiller Fehlschlag)
- Kann Umschalt+Enter aus irgendeinem Grund keinen Umbruch erzeugen (z. B. weil ein
  künftiger Codechange die Bindung entfernt/überschreibt, oder auf Touch keine
  Eingabemöglichkeit existiert), darf das Ergebnis **nicht** ein stiller No-Op sein —
  mindestens ein Test (Abschnitt 6) muss ein solches Verhalten sofort sichtbar machen.

---

## 4. Grenzfälle (müssen explizit geprüft werden)

| # | Grenzfall | Erwartetes Verhalten |
|---|---|---|
| 1 | Umschalt+Enter am Absatzanfang (vor jedem Zeichen) | Führende leere Zeile im selben Absatz (3.4) |
| 2 | Umschalt+Enter am Absatzende | Leere Folgezeile im selben Absatz (3.4) |
| 3 | Mehrere aufeinanderfolgende Umschalt+Enter ohne Text dazwischen | Entsprechend viele leere Zeilen im selben Absatz — **nicht** automatisch zusammengefasst/reduziert |
| 4 | Umschalt+Enter unmittelbar gefolgt von normalem Enter (oder umgekehrt) | Beide Umbruch-Arten entstehen korrekt und unterscheidbar nebeneinander — kein Umschlagen des einen in den anderen Typ |
| 5 | Umschalt+Enter in einem vollständig leeren Absatz (kein Text, keine Selektion) | Erzeugt einen Umbruch im selben Absatz, kein Crash, kein stiller No-Op |
| 6 | Umschalt+Enter mitten in einer Überschrift (`heading`) | Bleibt **eine** Überschrift mit interner Zeilentrennung (3.11) |
| 7 | Umschalt+Enter in einem Listenpunkt (`list_item`) | Bleibt derselbe Listenpunkt, Nummerierung unverändert (3.11) |
| 8 | Umschalt+Enter mit Cursor **in** einer Tabellenzelle (Text-Cursor) | Bleibt in derselben Zelle, Tabellenstruktur unverändert (3.11). Wird die Zelle anschließend kopiert, erscheint der Umbruch im `text/plain`-Clipboard als **Leerzeichen** (Rasterschutz, 0.8/3.13), nicht als `\n` — das ist gewolltes Kopieren-Verhalten und darf nicht als Fehler „korrigiert" werden |
| 8b | Umschalt+Enter bei aktiver `CellSelection` (mehrere **ganze** Zellen markiert) | Darf die Tabellenstruktur nicht beschädigen und keine Zellen löschen; Verhalten definiert und getestet (der 0.7-Guard erfasst `CellSelection` nicht automatisch — separat prüfen) |
| 9 | **Umschalt+Enter bei als `NodeSelection` markiertem Bild** (Bild angeklickt) bzw. markierter ganzer Tabelle | **Bild/Tabelle bleibt vollständig erhalten** — der Umbruch entsteht an definierter Stelle (empfohlen: neuer Absatz danach), **kein** stiller Knotenverlust. Ohne den 0.7-Fix ist dieser Test rot (Pflicht-Bugfix) |
| 10 | Backspace unmittelbar nach einem Zeilenumbruch bzw. Entf unmittelbar davor | Umbruch verschwindet in einem Schritt, Text davor/danach verschmilzt korrekt zu einer durchgehenden Zeile, kein Zeichenverlust (Menüpunkt 5) |
| 11 | Pfeiltasten (links/rechts, hoch/runter) über einen Zeilenumbruch hinweg | Cursor bewegt sich um genau eine Position/eine sichtbare Zeile (3.14) |
| 12 | Doppelklick zur Wortauswahl unmittelbar vor/nach dem Umbruch | Selektiert nur das angeklickte Wort, nicht den Umbruch mit (3.14) |
| 13 | Import einer echten Word-Datei mit `<w:br/>` **und** `<w:br w:type="page"/>`/`"column"` im selben Dokument | Zeilenumbrüche korrekt als `hard_break`; Seiten-/Spaltenumbrüche werden aktuell **fälschlich** ebenfalls als `hard_break` gelesen (bekannte Lücke, 3.8) — explizit befunden, nicht als „funktioniert" durchgewunken |
| 14 | Import einer echten LibreOffice-Datei mit `<text:line-break/>` und `text:soft-page-break` im selben Dokument | Zeilenumbruch als `hard_break`; `text:soft-page-break` **nicht** als weiterer Umbruch fehlinterpretiert (3.10) |
| 15 | **Selection-Sync-Regressionssequenz mit Umschalt+Enter:** Text eingeben → Alles auswählen → Fett anwenden → per Klick neu positionieren → Umschalt+Enter → weiter tippen | Beide Zeilen im selben Absatz bleiben erhalten, kein Datenverlust (Pflicht-Regressionstest, `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2 — bisher nie mit Umschalt+Enter nachgestellt) |
| 16 | Cross-Format-Rundreise DOCX → ODT → DOCX bzw. ODT → DOCX → ODT mit mehreren Umbrüchen im selben Absatz | Alle Umbrüche bleiben einzeln, an richtiger Position und Reihenfolge — kein kumulativer Verlust (auf Reader/Writer-Ebene geprüft, 0.11/5.2) |
| 17 | Sehr viele (z. B. 50+) aufeinanderfolgende Zeilenumbrüche im selben Absatz | UI bleibt bedienbar, kein Einfrieren, Rundreise erhält alle Umbrüche vollständig |
| 18 | **Intern** kopieren eines Absatzes mit `hard_break` und wieder einfügen (im Editor) | Umbruch bleibt erhalten; Klartext-Repräsentation ist `\n` (nicht leer, keine Wort-Verschmelzung) — Kopplung an Kopieren (3.13). **Ausnahme Tabellenzelle:** dort `\n` → Leerzeichen (Rasterschutz, Grenzfall 8) |
| 19 | Umschalt+Enter mitten in fettem/farbigem Text; danach weiter tippen; danach Rundreise | Beide Seiten des Umbruchs behalten ihre Marken; der nächste getippte Buchstabe ist weiterhin fett/farbig; Rundreise erhält die Marken beidseitig (3.6) |
| 20 | Import realer ODT-Datei mit `<text:line-break/>` **innerhalb** eines `text:span` (Formatvorlage) | Umbruch **und** umgebende Formatierung bleiben erhalten, kein Textverlust (`TextLineBreakText.odt`, 3.10) |
| 21 | **Mobile/Touch:** Zeilenumbruch auf „Mobile" (Pixel 7) und „Tablet" (iPad Mini) erzeugen | Mindestens ein funktionierender Weg vorhanden **oder** Nicht-Unterstützung dokumentiert (3.16) |
| 22 | Umschalt+Enter, danach sofort Undo, danach Redo | Undo entfernt exakt den Umbruch (ein Schritt), Redo stellt ihn identisch wieder her (3.15) |
| 23 | **Externes Einfügen von `text/html` mit echtem `<br>`** (z. B. aus einer Webseite kopierter Text mit weichem Zeilenumbruch) — bisher ungetesteter zweiter Erzeugungsweg, unabhängig verifiziert in 0.12 | Es entsteht ein regulärer `hard_break` (identisch zu einem per Umschalt+Enter erzeugten); Rundreise (DOCX **und** ODT), Marken-Erhalt und Navigation verhalten sich identisch zu 3.1–3.15. Kein Absturz, kein stiller Verlust des Umbruchs |

---

## 5. Rundreise-Anforderung

Zwei getrennte, beide verpflichtende Prüfungen — analog zur Methodik in
`seitenumbruch-req.md` Abschnitt 5 und `einfuegen-req.md`.

### 5.1 Baseline-Rundreise (Regressionsschutz — darf durch Arbeit an diesem Feature nicht kaputtgehen)
1. Reale DOCX-Datei **ohne** jeden manuellen Zeilenumbruch unverändert hochladen
   (kein Klick, keine Eingabe) → sofort exportieren → erneut importieren → Inhalt
   entspricht inhaltlich dem Original; insbesondere entsteht **kein** fälschlich
   erkannter Zeilenumbruch.
2. Dasselbe mit einer realen ODT-Datei.
3. Reale (oder synthetisch als XML-Fixture nachgebaute) DOCX-Datei mit einem echten
   Seitenumbruch (`<w:br w:type="page"/>`) → nach Import erscheint dieser laut
   3.8/Grenzfall 13 aktuell noch fälschlich als `hard_break`; dieses Verhalten muss
   **als bekannte, dokumentierte Abweichung** erfasst sein, nicht stillschweigend als
   korrekt durchgehen.
4. Die Prüfungen 1–2 müssen weiterhin grün bleiben, nachdem der Datenverlust-Fix aus
   0.7/3.3 und ggf. ein Toolbar-Button ergänzt wurden — keine Nebenwirkungs-Regression
   (insbesondere darf der neue Guard normales `Enter`/Text-Selektion-Ersetzen nicht
   verändern).
5. Die Kopieren-Regressionstests (`clipboard.test.ts`, `kopieren-qa.md`:
   `leafText === '\n'`, „keeps two hard_break-separated lines apart") müssen grün
   bleiben (0.8).

### 5.2 Feature-Rundreise (Zeilenumbruch selbst)
Für jede Situation gilt: Umschalt+Enter über **echte Tastatureingabe im Browser**
auslösen (nicht per direkt konstruiertem JSON-Fixture) → als DOCX exportieren →
reimportieren → Umbruch **und** Inhalt bleiben erhalten; **und** identisch als ODT.
Der Export ist zusätzlich mit einem **unabhängigen** Parser/Schema zu prüfen
(`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 19): das erwartete `<w:br/>` bzw.
`<text:line-break/>` steht an der erwarteten Stelle und die Datei ist valide.

1. Neues Dokument, ein Absatz mit einem Umschalt+Enter in der Mitte → Umbruch bleibt
   exakt an derselben Stelle, Text davor/danach unverändert, bleibt `hard_break`
   (nicht zu zwei Absätzen degradiert). Ursprung DOCX **und** ODT.
2. Mehrere Umbrüche im selben Absatz (Grenzfälle 3/17) → alle bleiben einzeln und in
   korrekter Reihenfolge.
3. **Cross-Format** DOCX → ODT und ODT → DOCX. Da kein Cross-Format-UI-Pfad existiert
   (0.11), wird dies verifiziert durch (a) Unit-Verkettung
   `readDocx → writeOdt → readOdt → writeDocx` (und symmetrisch) mit einem
   `hard_break`-Fixture und (b) einen In-Test-Handoff im E2E: den per echter Tastatur
   erzeugten, in der DOCX-Karte exportierten Download programmatisch durch
   `readDocx → writeOdt` schicken — der Tastatur-Teil bleibt echte
   Browser-Interaktion, nur der Format-Wechsel läuft programmatisch.
4. Umbruch mitten in fettem/farbigem Text → Marken beidseitig erhalten (Grenzfall 19).
5. Umbruch kombiniert mit anderen Strukturen im selben Dokument (Liste, Tabelle, Bild,
   Überschrift) → Rundreise erhält sowohl den Umbruch als auch die übrigen Strukturen
   (kumulativer Verlust-Test, `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 19, Testfall 3).
6. Import einer **fremden**, mit echtem Microsoft Word erzeugten DOCX-Datei mit
   `<w:br/>` → erkannt, unverändert exportiert, reimportiert → weiterhin vorhanden.
7. Dasselbe mit einer echten LibreOffice-ODT-Datei (`<text:line-break/>`), inklusive
   des in `text:span` verschachtelten Falls (`TextLineBreakText.odt`, Grenzfall 20).
8. Doppelte Rundreise (Format-Wechsel hin und zurück) an einem Dokument mit
   Zeilenumbrüchen zusammen mit anderen Features aus `FEATURE-SPEC-DOCX-ODT.md`
   Abschnitten 3–14 → kein kumulativer Textverlust.

**Abnahmekriterium:** Formatierungs-/Layout-Nuancen bei Cross-Format-Konvertierung
sind zu dokumentieren und akzeptabel; **das vollständige Verschwinden eines Umbruchs,
seine Umwandlung in einen Absatzumbruch (oder umgekehrt), der Verlust umgebender
Marken oder von Textinhalt ist es nicht** — weder bei 5.1 noch 5.2.

---

## 6. Testplan-Hinweise (Unit + E2E, Playwright)

1. **Bereits vorhanden, bleibt:** `src/formats/docx/__tests__/roundtrip.test.ts` und
   `src/formats/odt/__tests__/roundtrip.test.ts` (Reader/Writer-Serialisierung,
   JSON-konstruiert) sowie die `leafText`-Regressionen in `clipboard.test.ts`/
   `kopieren-qa.md`. Reichen für Serialisierung/Klartext, **nicht** für den
   Eingabeweg.
2. **PFLICHT — Bugfix-Test zu 0.7/3.3 (Datenverlust):** Bild einfügen, per Klick als
   `NodeSelection` markieren, Umschalt+Enter drücken → Bild ist **weiterhin
   vorhanden**, Umbruch an definierter Stelle. Muss **ohne** den Fix rot sein und den
   Fix damit erzwingen. Analog für eine ganze selektierte Tabelle.
3. **PFLICHT — E2E für den echten Eingabeweg (fehlt komplett, 0.9):** Cursor in
   `.ProseMirror` setzen, Text tippen, `page.keyboard.press('Shift+Enter')`, weiter
   tippen → prüfen, dass (a) `page.locator('.ProseMirror p')` **genau einen** Absatz
   zählt (kein neuer `<p>`) und (b) im DOM ein `<br>` zwischen den beiden Textteilen
   steht.
4. **PFLICHT — Regressionstest Grenzfall 15:** direkt im Anschluss an Punkt 3 die
   Selection-Sync-Sequenz nachstellen (Alles auswählen → Fett → per Klick neu
   positionieren → Umschalt+Enter → weiter tippen) — beide Zeilenteile bleiben
   erhalten (Muster aus `tests/e2e/selection-regression.spec.ts`).
5. **Browserübergreifende Abdeckung (0.10):** Punkt 3 muss auf **mindestens zwei
   echten Engines** laufen. Da `Desktop Firefox`/`Desktop Safari` in
   `playwright.config.ts` per `testMatch: /clipboard.*\.spec\.ts/` auf Clipboard-Specs
   beschränkt sind, ist entweder (a) das `testMatch` um die neue Spec-Datei zu
   erweitern, oder (b) die Firefox-/Safari-Abdeckung für diese Spec explizit zu
   konfigurieren. Ein bloßes „läuft auf Chrome + WebKit-Tablet" genügt nicht, weil
   „Tablet" Touch-/Mobile-Eigenheiten mit einbringt, die mit dem Tastatur-Testgegenstand
   nichts zu tun haben.
6. **Mobile/Touch (Grenzfall 21):** auf „Mobile"/„Tablet" den vorgesehenen Weg
   (Toolbar-Button oder dokumentierte Nicht-Unterstützung) nachweisen.
7. **Reale Fixtures:** mindestens eine echte Word-DOCX mit `<w:br/>` und eine echte
   LibreOffice-ODT mit `<text:line-break/>` (auch der in `text:span` verschachtelte
   Fall, `TextLineBreakText.odt`) verwenden; laut `zeilenumbruch-manuell-code.md`
   Abschnitt 0.2 liegen geeignete Fixtures bereits unter
   `tests/fixtures/external/{docx,odt}/` vor (u. a. `drawing.docx`, `saut_page.docx`,
   `bug57031.docx`, `TextLineBreakText.odt`) — es müssen keine neuen Binärdateien
   beschafft werden.
8. **`w:type`-Abgrenzung (Grenzfall 13):** ein Unit-Test, der das aktuelle
   (Lücken-)Verhalten sichtbar dokumentiert (`<w:br w:type="page"/>` wird identisch zu
   `<w:br/>` gelesen) — als Frühwarnsystem, bis `seitenumbruch-req.md` eine
   Fallunterscheidung nachrüstet.
9. **Marken über den Umbruch (Grenzfall 19):** E2E, der mitten in fettem Text
   Umschalt+Enter drückt, weiter tippt und prüft, dass der neue Text fett bleibt;
   plus Rundreise-Unit, der die Marken beidseitig erhält.
10. Rundreise-Tests (Abschnitt 5) sowohl als Unit gegen Reader/Writer **als auch** als
    E2E über echte Bedienung (Tastatur-Sequenz → echter Download → Re-Import bzw.
    In-Test-Handoff für Cross-Format). Reine JSON-Fixtures allein genügen nicht.
11. **PFLICHT — zweiter Erzeugungsweg über HTML-Paste (Grenzfall 23, 0.12, neu):** ein
    Test, der `text/html` mit einem echten `<br>` per simuliertem Paste-Event (E2E:
    `page.evaluate` mit `ClipboardEvent`/`DataTransfer`, analog zum in
    `einfuegen-req.md` Testplan vorgesehenen Muster; oder als Unit direkt gegen
    `DOMParser.fromSchema(wordSchema).parseSlice(...)`) einspielt und prüft, dass ein
    `hard_break` entsteht — sowie eine Rundreise (Export/Re-Import, beide Formate) für
    diesen so erzeugten Umbruch. Muss unabhängig von einer künftigen Umsetzung von
    `einfuegen-req.md` schon jetzt den **aktuellen** Ist-Zustand testen, damit eine
    spätere Sanitisierung (`transformPastedHTML`) diesen Weg nicht unbemerkt verändert.

---

## 7. Freigabekriterium für „vorhanden"

Der Backlog-Status von `zeilenumbruch-manuell` darf erst dann als **vorhanden**
(unqualifiziert) gelten, wenn:

- der **Datenverlust-Bug aus 0.7/3.3** behoben ist (Umschalt+Enter bei selektiertem
  Bild/Tabelle löscht den Knoten nicht mehr) und durch einen Test abgesichert ist,
  der ohne den Fix rot wäre;
- alle Bedienelemente aus Abschnitt 1 befundet sind — mindestens die
  Tastenkombination selbst, das zuverlässige Löschen eines Umbruchs (Grenzfall 10)
  und ein **entschiedener** Touch-/Mobil-Weg (Toolbar-Button **oder** dokumentierte
  Nicht-Unterstützung, 3.16/Grenzfall 21);
- der bisher komplett fehlende **E2E-Test für den echten Tastatur-Eingabeweg** (0.9)
  existiert und grün ist, inklusive der Selection-Sync-Regression mit Umschalt+Enter
  (Grenzfall 15);
- die browserübergreifende Abdeckung (0.10/Testplan Punkt 5) tatsächlich zwei echte
  Engines umfasst — nicht nur konfigurierbar, sondern für diese Spec wirksam;
- die Grenzfälle aus Abschnitt 4 einzeln befundet sind (funktioniert wie spezifiziert
  / bewusst abweichendes, dokumentiertes Verhalten / repariert) — insbesondere 8b, 9,
  13, 14, 19, 20, 21, 23;
- der zweite Erzeugungsweg über externes `<br>`-HTML-Einfügen (0.12/Grenzfall 23) mit
  denselben Rundreise-/Marken-/Navigationsanforderungen abgesichert ist wie der
  Tastatur-Weg;
- die Marken-über-den-Umbruch-Anforderung (3.6/Grenzfall 19) für beide Formate
  rundreise-fest ist;
- Abschnitt 5.1 (Baseline) durch die Arbeit an diesem Feature nicht gebrochen wurde,
  **inklusive** der Kopieren-Regressionstests (0.8/5.1 Punkt 5);
- Abschnitt 5.2 (Feature-Rundreise) für DOCX, ODT und beide Cross-Format-Richtungen
  besteht, mit unabhängiger Parser-/Schema-Validierung des Exports und den beiden
  realen Fixtures aus echtem Word/LibreOffice;
- die bekannten Einschränkungen — keine visuelle Unterscheidung Zeilen-/Absatzumbruch
  (Menüpunkt 7, Heimat: `formatierungszeichen-toggle`), Import-Verwässerung durch
  Seiten-/Spaltenumbruch (3.8, Heimat: `seitenumbruch-req.md`), verworfenes
  `w:clear`-Attribut (3.8) — jeweils bewusst dokumentiert sind.

Andernfalls bleibt der Status auf **teilweise** und die konkret fehlenden Teilpunkte
sind hier nachzutragen (analog zu `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 17/21,
`seitenumbruch-req.md` Abschnitt 7 und `einfuegen-req.md` Abschnitt 7).
