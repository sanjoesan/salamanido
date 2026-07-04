# Umsetzungsplan: Feature „Absatzformat-Dropdown (Standard/Überschrift 1–6)" — Code-Abgleich und geplante Änderungen

Rolle: Entwickler-Antwort auf `specs/absatzformat-dropdown-req.md`. Dieses Dokument prüft
den **tatsächlichen** Code-Stand gegen jede Behauptung/Anforderung der Spezifikation und
legt fest, welche Dateien wie geändert bzw. neu angelegt werden. Stil orientiert an
`specs/fett-code.md` (Vorbild für dieses Format) und `FEATURE-SPEC-DOCX-ODT.md`. **Kein
Punkt hier ist bereits umgesetzt — dies ist der Plan, nicht der Vollzug.**

---

## 0. Kurzfassung

Die Ist-Stand-Tabelle aus `absatzformat-dropdown-req.md` Abschnitt 0 ist gegen den
tatsächlichen Code geprüft und in **allen neun Zeilen sachlich und zeilengenau exakt**
(siehe Abschnitt 1 — kein anderes bisher geprüftes `-req.md` in diesem Repo war so
präzise). Die drei offenen Design-Fragen (Mehrfachselektion 2.3, Ausrichtungserhalt 2.5,
Listen-Inkonsistenz 2.6) werden in Abschnitt 3 verbindlich beantwortet.

Die eigentliche Code-Prüfung deckt aber **sechs zusätzliche, in der Anforderung nicht
benannte Befunde** auf — zwei davon korrigieren die in der Anforderung selbst vermutete
Fehlerursache, einer davon ist ein empirisch reproduzierter **Absturz** mit einer echten
Datei aus dem bereits im Repo vorhandenen Testkorpus:

1. **Finding A** — Die in Grenzfall 2.7 vermutete Ursache („unterschiedliche Elternknoten
   je Zelle, `sameParent` ist `false`") für den `CellSelection`-No-Op ist **empirisch
   widerlegt**: `sameParent` ist bei einer `CellSelection` tatsächlich immer `true`
   (verifiziert gegen `prosemirror-tables@1.8.5`/`prosemirror-state`). Die wirkliche
   Ursache ist eine andere Zeile im selben Befund (`alignableTypes.has(parent.type.name)`
   scheitert an `table_cell`, nicht an unterschiedlichen Eltern). Das beobachtbare
   Verhalten (No-Op) stimmt mit der Anforderung überein, die Fix-Konstruktion muss aber
   auf der richtigen Ursache aufbauen.
2. **Finding B** — Aus Finding A folgt ein **eigenständiger, bereits produktiv
   ausgelieferter Bug in `setAlign`** (Ausrichtungs-Buttons): Bei einer `CellSelection`
   über mehrere Zellen wirkt `setAlign` nachweislich nur auf die **eine** „Kopf"-Zelle der
   Selektion, alle anderen sichtbar mitselektierten Zellen bleiben still unverändert.
   Außerhalb des Geltungsbereichs dieser Datei (gehört zu `ausrichtung-*-req.md`), aber
   entscheidend dafür, wie der `setHeading`-Fix **nicht** gebaut werden darf (siehe
   Abschnitt 3.1).
3. **Finding C** — Abschnitt 2.9 der Anforderung übernimmt aus `fett-req.md` die
   Behauptung, Überschriften erschienen im Editor bereits über CSS
   (`.ProseMirror h1/h2/h3 { font-weight: 600 }`) fett. Das ist bereits in
   `fett-code.md` §1/§2.4 widerlegt und hier direkt gegen `src/index.css` erneut
   bestätigt: Diese Regel existiert nicht (Zeile 60 ist `.ProseMirror th`, keine
   `h1`–`h6`-Regel vorhanden). Überschriften sind im Editor aktuell **nicht** fett
   dargestellt.
4. **Finding D** — `docx/reader.ts` (`parseStylesXml`/`headingLevelForStyle`) liest
   `<w:basedOn>` nirgends. Grenzfall 16 ist damit eine **bestätigte, nicht nur
   theoretische** Lücke.
5. **Finding E** — `list_item.content = 'paragraph block*'` (statt `block+` wie bei
   `table_cell`) ist nicht nur die Ursache von Befund 5, sondern auch von zwei weiteren,
   unabhängig verifizierten Fehlern:
   - **E2:** `toggleList` (Button „• Liste") auf eine markierte Überschrift ist heute ein
     stiller No-Op (per Vitest-Testaufbau empirisch nachgewiesen).
   - **E3 (schwerwiegend):** Ein Nutzer, der die im Repo bereits vorhandene reale
     ODF-Toolkit-Testdatei `tests/fixtures/external/odt/listStyleId.odt` importiert (sie
     enthält `<text:list-item><text:h ...>…</text:h></text:list-item>` — eine Überschrift
     als **einziges/erstes** Kind eines Listenpunkts) und danach am Ende dieser
     Überschrift **Enter** drückt (`WordEditor.tsx:75`, `splitListItem`), löst einen
     **echten, reproduzierten Absturz** aus: `RangeError: Called contentMatchAt on a node
     with invalid content`. Empirisch nachgestellt (siehe Abschnitt 3.3) — kein
     theoretisches Risiko.
6. **Finding F** — `docx/writer.ts` `blockToDocx`, Fall `'heading'` (Zeile 106–111),
   ignoriert den `listNumId`-Parameter, den derselbe Funktionsaufruf für Listeneinträge
   erhält (Zeile 116). Jede Überschrift innerhalb eines Listenpunkts verliert beim
   DOCX-Export ihre Listenzugehörigkeit (`<w:numPr>` fehlt), unabhängig davon, ob sie
   Kind 1 oder Kind 2+ ist. Der ODT-Writer hat dieses Problem **nicht** (ODF modelliert
   Listenzugehörigkeit rein strukturell durch Verschachtelung, keine `numId`-Referenz
   nötig) — verifiziert durch Codelesen.

Finding E führt dazu, dass die Empfehlung zu Grenzfall 2.6 in Abschnitt 3.3 **von der
naheliegenden ersten Intuition abweicht**: Nicht „Überschrift in Listen einheitlich
verbieten", sondern „einheitlich erlauben" (Schema-Fix `list_item.content: 'block+'`) —
weil zwei im Repo bereits vorhandene, echte ODF-Toolkit-Fixtures (`ListHeading.odt`,
`ListHeading2.odt`) beweisen, dass reale Werkzeuge genau dieses Konstrukt bereits
erzeugen, und ein Verbot vorhandene importierte Inhalte nicht mehr reparierbar machen
würde.

---

## 1. Verifikation der Ist-Stand-Tabelle aus `absatzformat-dropdown-req.md` Abschnitt 0

| # | Fundstelle laut Anforderung | Ergebnis der Prüfung |
|---|---|---|
| 1 | `Toolbar.tsx:116-131` natives `<select aria-label="Absatzformat">` | **Bestätigt, zeilengenau exakt.** `<select>` Zeile 116, schließendes `</select>` Zeile 131. |
| 2 | `Toolbar.tsx:87-95` `currentHeadingLevel()` | **Bestätigt, zeilengenau exakt.** |
| 3 | `commands.ts:40-55` `setHeading`, `$from.sameParent($to)` bricht bei Mehrfachselektion ab; Vergleich mit `setAlign` (`commands.ts:13-27`, `nodesBetween`) | **Bestätigt, zeilengenau exakt** in der Diagnose der Asymmetrie. **Aber:** die in Grenzfall 2.7 daraus abgeleitete Erklärung für den `CellSelection`-Fall ist nicht ganz richtig — siehe Finding A. |
| 4 | `commands.ts:42-43` `attrs = level === null ? undefined : { level, align: 'left' }` | **Bestätigt, zeilengenau exakt.** Verifiziert außerdem: DOCX-/ODT-Reader und -Writer geben `align` bereits heute in **beiden** Richtungen korrekt durch (`JC_TO_ALIGN`/`JC_BY_ALIGN` in `docx/reader.ts`/`writer.ts`, `paragraphAligns`/`headingStyleName(level, align)` in `odt/reader.ts`/`writer.ts`) — der Verlust passiert **ausschließlich** in dieser einen Editor-Command-Zeile, nicht beim Import/Export. Der Fix ist entsprechend auf `commands.ts` beschränkt (siehe Abschnitt 4.1). |
| 5 | `schema.ts:98-104` (`list_item.content = 'paragraph block*'`) vs. `tableNodes({ cellContent: 'block+' })` (`schema.ts:106`) | **Bestätigt, zeilengenau exakt.** Geht laut eigener Prüfung noch weiter als beschrieben — siehe Finding E. |
| 6 | `odt/reader.ts:245-246` vs. `:252-256`, nur `office:automatic-styles` wird gelesen | **Bestätigt, zeilengenau exakt**, inklusive der genauen Zeile des `readOfficeTextChildren`-Aufrufs (Zeile 248, wie in der Anforderung referenziert). |
| 7 | `docx/reader.ts:48-75` `parseStylesXml`/`headingLevelForStyle`, Erkennung über `w:outlineLvl` oder Regex `^Heading\s?([1-6])$` | **Bestätigt, zeilengenau exakt.** `w:basedOn` wird nirgends gelesen — Finding D bestätigt die in der Anforderung nur als „ungetestet" markierte Vermutung als **tatsächliche Lücke**. |
| 8 | `docx/styleDefs.ts:9-30`, `odt/styleRegistry.ts:77-93`, feste Fett-Deklaration auf Formatvorlagen-Ebene | **Bestätigt.** `styleDefs.ts` Zeile 9–30 exakt; `styleRegistry.ts` `headingStyleDefs` liegt auf Zeile 84–93, die referenzierten Zeilen 77–93 schließen die vorangehenden Konstantendeklarationen (`HEADING_FONT_SIZES`, `ALIGNS`) mit ein — inhaltlich korrekt, keine Abweichung. |
| 9 | `tests/e2e/docx.spec.ts:99`, `tests/e2e/odt.spec.ts:80`, keine Dropdown-Bedienung in Tests | **Bestätigt, zeilengenau exakt.** Suche nach `Absatzformat`/`getByLabel`/`selectOption` in `tests/` bestätigt: keine Treffer. |

**Fazit Abschnitt 1:** Alle neun Fundstellen der Anforderung sind sachlich zutreffend.
Einzige Einschränkung: die in Zeile 3/Grenzfall 2.7 unterstellte Fehlerursache für den
`CellSelection`-Fall ist unpräzise (Finding A).

---

## 2. Bestehende Code-Bausteine, die für den Fix relevant sind (Referenz)

- `src/formats/shared/editor/commands.ts` — `setAlign`, `setHeading`, `alignableTypes`,
  `isInTable`.
- `src/formats/shared/schema.ts` — `list_item.content`, `tableNodes({ cellContent: 'block+' })`.
- `src/formats/shared/editor/Toolbar.tsx` — `<select aria-label="Absatzformat">`,
  `currentHeadingLevel()`.
- `src/formats/shared/editor/WordEditor.tsx` — `keymap({ Enter: splitListItem(...), ... })`.
- `src/formats/docx/reader.ts` — `parseStylesXml`, `headingLevelForStyle`.
- `src/formats/docx/writer.ts` — `blockToDocx` (Fälle `'paragraph'`, `'heading'`,
  `'bullet_list'`/`'ordered_list'`).
- `src/formats/odt/reader.ts` — `parseAutomaticStyles`, `elementToBlocks`,
  `paragraphToBlocks`.
- Testfixtures bereits im Repo, die für diese Anforderung besonders relevant sind (alle
  unter `tests/fixtures/external/odt/` bzw. `.../docx/`, ODF-Toolkit-/Apache-POI-Korpus):
  - `MyHeading1.odt` — `<text:h text:style-name="Heading2" ...>`, wobei `Heading2`
    **ausschließlich** in `office:styles` (nicht `office:automatic-styles`) deklariert
    ist. Direkter Beleg für Befund 6/Grenzfall 15.
  - `ListHeading.odt`, `ListHeading2.odt` — `<text:list-item>` mit **zwei** Kindern:
    zuerst `<text:p>`, danach `<text:h ... text:outline-level="1">…Line2 - first list
    item</text:h>` (Kommentar im Original-Testdatennamen weist selbst auf den Grenzfall
    hin). Direkter Beleg für Befund 5 („2. Kind eines Listenpunkts funktioniert bereits
    heute").
  - `listStyleId.odt` — enthält u. a. `<text:list-item><text:h
    text:outline-level="3" ...>…</text:h></text:list-item>`, also eine Überschrift als
    **einziges/erstes** Kind eines Listenpunkts. Grundlage für Finding E3.
  - `heading123.docx` — einfache Rundreise-Kandidatin für Abnahme 4.1.7.

---

## 3. Design-Entscheidungen (beantwortet Abnahmekriterien 3–6 der Anforderung)

### 3.1 Abschnitt 2.3/Grenzfall 2 — Mehrfachselektion über mehrere Blöcke

**Entscheidung: Erweitern, analog zu `setAlign`, aber *nicht* durch Kopieren von dessen
Implementierungsmuster.**

Begründung: `setAlign` ist als Vorbild in der Anforderung selbst genannt. Es gibt aber
zwei Gründe, es nicht 1:1 zu kopieren:

1. **Finding A/B (empirisch verifiziert, siehe unten):** `state.selection.from`/`.to`
   entsprechen bei einer `CellSelection` **nicht** der gesamten selektierten Fläche,
   sondern ausschließlich dem Bereich der „Kopf"-Zelle
   (`prosemirror-state`: `get $from() { return this.ranges[0].$from }`;
   `prosemirror-tables`: `CellSelection`-Konstruktor baut `ranges[0]` immer aus
   `$headCell`). Ein `doc.nodesBetween(selection.from, selection.to, …)`-Aufruf —
   genau das Muster von `setAlign` — träfe bei einer Mehrzellen-`CellSelection` daher
   nur die zuletzt gezogene Zelle.
   - **Verifiziert per Vitest-Skript** (temporär angelegt unter
     `src/formats/shared/editor/__tests__/_scratch-cellselection.test.ts`, nach der
     Prüfung wieder entfernt — Ergebnis hier dokumentiert, da es sonst nirgends
     festgehalten wäre): Bei einer 2×2-`CellSelection` über vier Zellen mit Text
     `A1/B1/A2/B2` (Anker `A1`, Kopf `B2`) ergab sich
     `selection.from=23, selection.to=27`, `$from.parent.type === $to.parent.type ===
     'table_cell'`, `$from.sameParent($to) === true` und
     `doc.nodesBetween(selection.from, selection.to, …)` traf **ausschließlich** den
     Text `'B2'` — die drei anderen selektierten Zellen wurden nicht erreicht. Ein
     Durchlauf über `selection.ranges` (ein `SelectionRange` pro Zelle) traf dagegen
     korrekt alle vier: `['B2', 'A1', 'B1', 'A2']`.
   - **Konsequenz für Finding A:** `sameParent` ist damit tatsächlich `true` (beide
     Punkte liegen in derselben Kopf-Zelle), nicht `false` wie in Grenzfall 2.7
     vermutet. Der heutige `setHeading`-No-Op für **jede** `CellSelection`
     (unabhängig von 1 oder N Zellen!) entsteht über die **nächste** Zeile,
     `alignableTypes.has(parent.type.name)` (`commands.ts:47`) — `parent` ist dort
     `table_cell`, nicht `paragraph`/`heading`, und `table_cell` ist nicht in
     `alignableTypes`. Beobachtbares Verhalten (No-Op) deckt sich mit der Erwartung der
     Anforderung; die **Begründung** in Grenzfall 2.7 ist zu korrigieren.
   - **Finding B (Nebenbefund, nicht Teil dieser Datei, aber dokumentationspflichtig):**
     Da `setAlign` exakt dieses `nodesBetween(selection.from, selection.to, …)`-Muster
     bereits produktiv verwendet, hat der Button „Ausrichtung" **heute schon** denselben
     Fehler: Bei einer Mehrzellen-`CellSelection` wird nur die Kopf-Zelle
     zentriert/ausgerichtet, alle anderen sichtbar markierten Zellen bleiben
     unverändert — ein stiller Teil-Fehlschlag, der gegen
     `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.4 verstößt. Gehört fachlich zu
     `ausrichtung-links-req.md`/`ausrichtung-zentriert-req.md`/etc., nicht zu dieser
     Datei — hier nur als Präzedenzfall dafür vermerkt, **warum** der `setHeading`-Fix
     nicht einfach `setAlign` kopieren darf.
2. **Code-Geruch in `setAlign` selbst** (`commands.ts:13-27`): Bei mehreren
   qualifizierenden Knoten ruft `setAlign` `dispatch(...)` **mehrmals** innerhalb eines
   einzigen `nodesBetween`-Durchlaufs auf, jedes Mal erneut von `state.tr` (dem
   **ursprünglichen**, nicht dem zwischenzeitlich aktualisierten State) ausgehend. Das
   funktioniert nur, weil `setNodeAttribute` **größenerhaltend** ist (keine
   Struktur-/Positionsverschiebung) — ein fragiles, unübliches Muster, das bei einer
   strukturverändernden Operation (wie `setBlockType`, das `setHeading` braucht) nicht
   mehr verlässlich funktionieren würde und zudem **mehrere separate Transaktionen**
   statt einer atomaren erzeugt. Für `setHeading` wird stattdessen **eine** Transaktion
   akkumuliert und **einmal** dispatcht (siehe Abschnitt 4.1) — sauberer, ein
   garantierter Undo-Schritt, kein Rennen mit zwischenzeitlich veraltetem State.

**Ergebnis:** Eine Selektion über mehrere Absätze/Überschriften wandelt **alle**
erfassten, geeigneten Blöcke auf einmal um (nicht nur den ersten, nicht gar keinen).
Jeder Block behält dabei seine **eigene** vorherige Ausrichtung (siehe 3.2), nicht eine
global auf die gesamte Selektion angewandte. Für eine `CellSelection` gilt das
konsequent auch über mehrere Zellen hinweg (siehe 3.1 Finding A/B oben) — das ändert das
in der Anforderung für Testfall 5.8/Grenzfall 2.7 erwartete Ergebnis von „No-Op" zu
„alle selektierten Zellen erhalten das gewählte Format", **exakt wie von der
Anforderung selbst als konsistente Fortführung von 2.3 vorgezeichnet**
(„konsistent mit dem generellen Verhalten aus 2.3").

### 3.2 Abschnitt 2.5/Grenzfall 8-9 — Erhalt der Ausrichtung beim Formatwechsel

**Entscheidung: Ausrichtung bleibt erhalten (Direktformatierung überlebt den
Stilwechsel), analog zu Word/LibreOffice.**

Begründung: Wie in Abschnitt 1 dieser Datei verifiziert, geben **beide** Import-/
Export-Pfade (DOCX und ODT, Lese- **und** Schreibrichtung) den `align`-Wert eines
`heading`- oder `paragraph`-Knotens bereits vollständig korrekt durch — der einzige
Ort, an dem Ausrichtung heute verloren geht, ist die hartcodierte `align: 'left'` in
`commands.ts:43`. Der Fix ist ein reiner Editor-Command-Fix, keine Reader-/Writer-
Änderung nötig. Damit ist auch Grenzfall 9 (kumulativer Verlust über zwei Wechsel)
gelöst: Da jeder Wechsel die tatsächliche `align` des Quellknotens fortschreibt statt
sie zu verwerfen, geht auch nach beliebig vielen aufeinanderfolgenden Wechseln nichts
verloren.

### 3.3 Abschnitt 2.6/Grenzfall 4-5 — Überschrift innerhalb eines Listenpunkts

**Entscheidung (weicht von der ersten Intuition ab): Einheitlich *erlauben*, nicht
einheitlich verbieten — per Schema-Fix `list_item.content: 'paragraph block*'` →
`'block+'`, exakt wie bereits bei `table_cell` (`schema.ts:106`).**

Ein Verbot (die naheliegendere erste Idee, da Word/LibreOffice das UI-seitig auch nicht
vorsehen) scheitert an drei konkreten, verifizierten Gegenbefunden:

1. **Reale Fremddateien beweisen den Anwendungsfall.** `tests/fixtures/external/odt/
   ListHeading.odt` und `ListHeading2.odt` (beide bereits im Repo, ODF-Toolkit-Korpus)
   enthalten strukturell exakt Befund 5's Grenzfall: ein `<text:list-item>` mit zuerst
   `<text:p>Line1</text:p>`, danach `<text:h ...>Line2 - first list item</text:h>` —
   der Dateiname des Testinhalts selbst weist auf genau diesen Grenzfall hin. Ein
   Verbot würde bereits importierte, real erzeugte Inhalte dieser Art nicht mehr
   korrigierbar machen (Nutzer könnte „Line2" nicht mehr zurück zu „Standard" wandeln).
2. **Der Schema-Fix behebt einen weiteren, unabhängig verifizierten Bug (Finding E2):**
   Mit der aktuellen Regel scheitert auch `wrapInList` (Button „• Liste"/„1. Liste"),
   wenn eine **Überschrift** (nicht ein Absatz) in eine neue Liste gewickelt werden soll
   — strukturell verboten, da eine Überschrift nicht als erstes/einziges Kind eines
   `list_item` zulässig ist. Verifiziert per Vitest-Vergleich zweier lokaler
   Testschemata: `wrapInList(bullet_list)` auf eine einzelne Überschrift lieferte mit
   `list_item.content: 'paragraph block*'` `false` (No-Op), mit `'block+'` `true`
   (funktioniert). Das ist ein bisher nirgends dokumentierter, zusätzlicher stiller
   Fehlschlag (verwandt mit, aber unabhängig von `aufzaehlungsliste-req.md`/
   `nummerierte-liste-req.md`).
3. **Finding E3 (schwerwiegend, empirisch reproduziert): ein echter Absturz.**
   `tests/fixtures/external/odt/listStyleId.odt` enthält (u. a., innerhalb tief
   verschachtelter Listen) einen Listenpunkt, dessen **einziges** Kind eine
   Überschrift ist (`<text:list-item><text:h text:outline-level="3" ...>…</text:h>
   </text:list-item>`). Import via `readOdt` liefert dafür anstandslos JSON zurück
   (`Node.fromJSON`/`Fragment.fromJSON` validieren die Content-Ausdrücke **nicht** —
   das ist ein bewusster Kompromiss von ProseMirror für performantes
   Deserialisieren, kein Fehler dieses Projekts), und auch das Mounten einer
   `EditorView` mit diesem Dokument gelingt zunächst anstandslos. Der Bruch passiert
   erst beim **nächsten Bearbeitungsversuch in der Nähe**: Ein Cursor in dieser
   Überschrift und ein Aufruf von `splitListItem` (also exakt das, was
   `WordEditor.tsx:75`'s `Enter`-Bindung auslöst) wirft
   `RangeError: Called contentMatchAt on a node with invalid content` — verifiziert
   per temporärem Vitest-Testaufbau (jsdom + echte `EditorView`-Instanz + echte
   `readOdt`-Ausgabe dieser realen Datei, danach wieder entfernt). Das ist ein
   **echter, reproduzierbarer Absturz** für reale Dokumente mit gliederungsnummerierten
   Überschriften (ein in Word/LibreOffice völlig gängiges Muster: „1. Einleitung",
   „1.1 Hintergrund" als nummerierte Gliederungs-Überschriften) — kein Rand-, sondern
   ein Zuverlässigkeitsproblem.

**Konsequenz:** Der Schema-Fix ist nicht nur die konsistentere, sondern die einzige
Lösung, die alle drei Befunde gleichzeitig behebt, ohne bereits importierbare reale
Inhalte unreparierbar zu machen. Er erfordert als Kehrseite eine kleine Ergänzung in
`docx/writer.ts` (Finding F, Abschnitt 4.6), da sonst eine neu erlaubte
Überschrift-als-erstes-Kind beim DOCX-Export ihre Listenzugehörigkeit verlöre (ein
für ODT nicht bestehendes Problem, da ODF Listenmitgliedschaft rein strukturell durch
Verschachtelung abbildet, nicht über eine `numId`-Referenz).

### 3.4 Befund 6/Grenzfall 15 — ODT `office:styles` (gemeinsame/benannte Formatvorlagen)

**Entscheidung: Beheben — `office:styles` zusätzlich zu `office:automatic-styles`
auswerten, inklusive `style:parent-style-name`-Kette.**

Diese exakte Codestelle (`odt/reader.ts:36-77`, `parseAutomaticStyles`) ist **bereits**
Gegenstand eines Fixes in `fett-code.md` §4.8 (dort für die `text`-Familie/Marks
relevant, Lücke B jener Datei). Diese Anforderung braucht **dieselbe** Funktion
zusätzlich für die `paragraph`-Familie (Ausrichtung). Da beide Pläne dieselbe
Codestelle anfassen, siehe Abschnitt 4.7 für die kombinierte, abgestimmte
Umsetzung (**nicht** unabhängig voneinander implementieren — sonst überschreibt eine
Änderung die andere).

---

## 4. Dateigenauer Umsetzungsplan

### 4.1 `src/formats/shared/editor/commands.ts` (geändert)

Neuer Import (Zeile 3, nach den bestehenden Importen):

```ts
import { isInTable, CellSelection } from 'prosemirror-tables'
```

(`isInTable` wird bereits importiert und re-exportiert, Zeile 3/6 — hier nur um
`CellSelection` als benannten Typ-Import ergänzt.)

`setHeading` (aktuell Zeile 40–55) wird ersetzt durch eine gemeinsame Hilfsfunktion plus
zwei Exporte:

```ts
interface HeadingTarget {
  pos: number
  node: ReturnType<typeof wordSchema.nodes.paragraph.create>
}

/**
 * Collects every paragraph/heading block reachable from the current selection that is
 * eligible for a Standard <-> Überschrift switch. A CellSelection needs its own branch:
 * `selection.from`/`selection.to` (and therefore a naive
 * `doc.nodesBetween(selection.from, selection.to, ...)` walk, as `setAlign` below still
 * does) only ever cover the *head* cell of a CellSelection, never the full selected
 * rectangle — verified empirically against prosemirror-tables@1.8.5/prosemirror-state
 * (see absatzformat-dropdown-code.md §3.1, Finding A/B). Iterating `selection.ranges`
 * instead visits every selected cell correctly. List items are intentionally *not*
 * excluded here — see absatzformat-dropdown-code.md §3.3 for why the list_item content
 * rule itself is relaxed (schema.ts) instead of special-cased here.
 */
function collectHeadingTargets(state: EditorState): HeadingTarget[] {
  const { selection } = state
  const targets: HeadingTarget[] = []
  const visit = (from: number, to: number) => {
    state.doc.nodesBetween(from, to, (node, pos) => {
      if (alignableTypes.has(node.type.name)) targets.push({ pos, node })
    })
  }
  if (selection instanceof CellSelection) {
    for (const range of selection.ranges) visit(range.$from.pos, range.$to.pos)
  } else {
    visit(selection.from, selection.to)
  }
  return targets
}

/** Whether `setHeading` has *any* eligible target for the current selection — drives the
 *  toolbar's `disabled` state (FEATURE-SPEC-DOCX-ODT.md §20.4, "kein stiller Fehlschlag"). */
export function canSetHeading(state: EditorState): boolean {
  return collectHeadingTargets(state).length > 0
}

/** Also exported for Toolbar.tsx's display logic (see §4.2) — reuses the exact same
 *  target collection so the displayed value and the enabled/disabled state can never
 *  disagree with what a click would actually do. */
export function headingTargetsInSelection(state: EditorState): HeadingTarget[] {
  return collectHeadingTargets(state)
}

export function setHeading(level: number | null): Command {
  return (state, dispatch) => {
    const type = level === null ? wordSchema.nodes.paragraph : wordSchema.nodes.heading
    const targets = collectHeadingTargets(state)
    if (targets.length === 0) return false
    if (dispatch) {
      let tr = state.tr
      for (const { pos, node } of targets) {
        // Preserve each block's own existing alignment (direct formatting survives a
        // style/type switch, matching Word/LibreOffice — see §3.2). Resolved once per
        // block, not once for the whole selection, so a multi-block conversion keeps
        // each paragraph's individual prior alignment.
        const attrs = level === null ? { align: node.attrs.align } : { level, align: node.attrs.align }
        tr = tr.setBlockType(pos, pos + node.nodeSize, type, attrs)
      }
      dispatch(tr)
    }
    return true
  }
}
```

Wichtig: `tr.setBlockType` wird **mehrfach auf dieselbe, einmal akkumulierte
Transaktion** angewendet, nicht mehrfach `dispatch`t wie in `setAlign` (Abschnitt 3.1,
Punkt 2). Das ist sicher, weil ein Absatz-↔-Überschrift-Wechsel die Knotengröße nicht
verändert (nur Typ/Attribute) — bereits vor dem ersten `setBlockType`-Aufruf gesammelte
`pos`-Werte bleiben über die gesamte Schleife hinweg gültig, auch wenn sie aus mehreren
Tabellenzellen (`CellSelection.ranges`) stammen.

`setAlign` (Zeile 13–27) und `isAlignActive` (Zeile 29–38) bleiben **unverändert** — der
in Finding B beschriebene `CellSelection`-Bug dort ist bewusst nicht Teil dieser Datei
(gehört zu `ausrichtung-*-req.md`), wird aber als Cross-Reference-Kommentar direkt über
`setAlign` ergänzt:

```ts
// TODO(ausrichtung-*-req.md): setAlign teilt mit setHeading (vor dessen Fix in
// absatzformat-dropdown-code.md §3.1) den Bug, dass eine CellSelection über mehrere
// Zellen hier nur die Kopf-Zelle erreicht (selection.from/.to decken nur ranges[0] ab).
// Siehe absatzformat-dropdown-code.md Finding A/B für die Verifikation.
```

### 4.2 `src/formats/shared/editor/Toolbar.tsx` (geändert)

Import ergänzen (Zeile 5–17):

```tsx
import {
  applyMarkColor,
  clearMarkColor,
  insertImage,
  insertTable,
  isAlignActive,
  isInTable,
  liftFromList,
  setAlign,
  setHeading,
  canSetHeading,
  headingTargetsInSelection,
  toggleList,
  type Align,
} from './commands'
```

`currentHeadingLevel()` (Zeile 87–95) wird vereinfacht und nutzt dieselbe
Zielsuche wie `setHeading` selbst — Anzeige und tatsächliches Verhalten können dadurch
nie auseinanderlaufen (behebt nebenbei eine kleinere Ungenauigkeit: die alte,
tiefenbasierte Suche zeigte für eine `CellSelection` immer „Standard", unabhängig vom
tatsächlichen Inhalt der Zelle(n), weil `$from` bei einer `CellSelection` innerhalb der
`table_cell`-Grenze selbst liegt, siehe §3.1 Finding A):

```tsx
function currentHeadingLevel(): string {
  const target = headingTargetsInSelection(view.state)[0]
  if (!target) return 'normal'
  return target.node.type.name === 'heading' ? String(target.node.attrs.level) : 'normal'
}
```

Bei einer Selektion, die mehrere unterschiedliche Blocktypen/-ebenen umfasst
(Grenzfall 3), zeigt das Dropdown den Typ des **ersten** erfassten Blocks — bewusste,
dokumentierte Tie-Break-Regel für Abnahmekriterium 2 der Anforderung („definiertes,
nicht-widersprüchliches Verhalten"), kein zusätzlicher „gemischt"-Zustand (das native
`<select>` hat dafür ohnehin keine saubere Darstellung ohne einen künstlichen
Platzhalter-Eintrag, der selbst wählbar wäre — das würde neue Verwirrung stiften statt
Klarheit).

`<select>`-Element (Zeile 116–131) erhält `disabled` und ein erklärendes `title`:

```tsx
<select
  aria-label="Absatzformat"
  value={currentHeadingLevel()}
  disabled={!canSetHeading(view.state)}
  title={canSetHeading(view.state) ? undefined : 'Für die aktuelle Auswahl nicht verfügbar'}
  onChange={(e) => {
    const value = e.target.value
    run(view, setHeading(value === 'normal' ? null : Number(value)))
  }}
  className="text-sm rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-1 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
>
  ...
</select>
```

Damit ist Abschnitt 1 Zeile 7 der Anforderung („Deaktivierter Zustand bei nicht
anwendbarer Selektion") und Abnahmekriterium 8 („kein stiller Fehlschlag") erfüllt: ein
deaktiviertes, sichtbar ausgegrautes `<select>` mit erklärendem `title` ist eine
sichtbare Rückmeldung, kein Klick, der wirkungslos verpufft.

### 4.3 `src/formats/shared/schema.ts` (geändert)

Zeile 99, `list_item`:

```diff
   list_item: {
-    content: 'paragraph block*',
+    content: 'block+',
     parseDOM: [{ tag: 'li' }],
     toDOM() {
       return ['li', 0]
     },
   },
```

Einzeiliger Fix, siehe Abschnitt 3.3 für die vollständige Begründung (behebt Befund 5,
Finding E2 und den empirisch reproduzierten Absturz aus Finding E3). Risiko: minimal —
`createAndFill()` für einen neu angelegten, leeren Listenpunkt liefert unverändert einen
einzelnen leeren Absatz (da `paragraph` weiterhin als erster Kandidat ohne
Pflicht-Attribute in der `block`-Gruppe registriert ist, exakt wie bei `table_cell`
bereits heute), der bestehende Verhalten für den Normalfall (Text tippen, Enter,
`splitListItem`) ändert sich nicht.

### 4.4 `src/formats/shared/editor/WordEditor.tsx` (optional, kein Blocker)

Laut Anforderung Abschnitt 1 Zeile 3 **kein Blocker** für den Status „vorhanden", aber
als bewusst fehlende Komfortfunktion zu dokumentieren. Empfehlung: trotzdem ergänzen, da
sehr geringer Aufwand und 1:1-Wiederverwendung von `setHeading`:

```ts
import { setHeading } from './commands'
```

In `keymap({...})` (Zeile 71–79) ergänzen:

```ts
'Mod-Alt-0': setHeading(null),
'Mod-Alt-1': setHeading(1),
'Mod-Alt-2': setHeading(2),
'Mod-Alt-3': setHeading(3),
'Mod-Alt-4': setHeading(4),
'Mod-Alt-5': setHeading(5),
'Mod-Alt-6': setHeading(6),
```

Falls diese Ergänzung **nicht** umgesetzt wird, muss das (wie von der Anforderung
verlangt) explizit im Backlog als bewusst fehlende Komfortfunktion vermerkt bleiben,
nicht stillschweigend übergangen werden.

### 4.5 `src/formats/docx/reader.ts` (geändert)

`HeadingInfo`/`parseStylesXml`/`headingLevelForStyle` (Zeile 48–75) um eine
`w:basedOn`-Kette erweitern (Finding D, Grenzfall 16):

```ts
interface HeadingInfo {
  outlineLvlByStyleId: Map<string, number>
  basedOnByStyleId: Map<string, string>
}

function parseStylesXml(stylesDoc: Document | null): HeadingInfo {
  const outlineLvlByStyleId = new Map<string, number>()
  const basedOnByStyleId = new Map<string, string>()
  if (!stylesDoc) return { outlineLvlByStyleId, basedOnByStyleId }
  for (const styleEl of Array.from(stylesDoc.getElementsByTagNameNS(OOXML_NAMESPACES.w, 'style'))) {
    const styleId = styleEl.getAttributeNS(OOXML_NAMESPACES.w, 'styleId')
    if (!styleId) continue
    const pPr = firstChildNS(styleEl, OOXML_NAMESPACES.w, 'pPr')
    const outlineLvl = pPr && firstChildNS(pPr, OOXML_NAMESPACES.w, 'outlineLvl')
    if (outlineLvl) {
      const val = Number(outlineLvl.getAttributeNS(OOXML_NAMESPACES.w, 'val') ?? '0')
      outlineLvlByStyleId.set(styleId, val)
    }
    const basedOn = firstChildNS(styleEl, OOXML_NAMESPACES.w, 'basedOn')
    const basedOnVal = basedOn?.getAttributeNS(OOXML_NAMESPACES.w, 'val')
    if (basedOnVal) basedOnByStyleId.set(styleId, basedOnVal)
  }
  return { outlineLvlByStyleId, basedOnByStyleId }
}

// Same guard pattern as MAX_TABLE_NESTING_DEPTH further down this file — a malformed or
// cyclic w:basedOn chain must not hang/crash the import.
const MAX_STYLE_INHERITANCE_DEPTH = 25

function headingLevelForStyle(styleId: string | null, info: HeadingInfo): number | null {
  if (!styleId) return null
  const seen = new Set<string>()
  let current: string | null = styleId
  for (let depth = 0; current && depth < MAX_STYLE_INHERITANCE_DEPTH && !seen.has(current); depth++) {
    seen.add(current)
    const fromStyles = info.outlineLvlByStyleId.get(current)
    if (fromStyles !== undefined) return fromStyles + 1
    const match = /^Heading\s?([1-6])$/i.exec(current)
    if (match) return Number(match[1])
    current = info.basedOnByStyleId.get(current) ?? null
  }
  return null
}
```

Löst Grenzfall 16: eine Formatvorlage, die per `w:basedOn` von „Heading N" erbt, ohne
selbst ein `w:outlineLvl` zu deklarieren, wird jetzt korrekt als Überschrift der
geerbten Ebene erkannt statt fälschlich als „Standard" importiert zu werden.

### 4.6 `src/formats/docx/writer.ts` (geändert — Finding F)

`blockToDocx`, Fall `'heading'` (Zeile 106–111), muss wie der Fall `'paragraph'`
(Zeile 101–105) den `listNumId`-Parameter auswerten:

```diff
     case 'heading': {
       const level = Number(node.attrs?.level ?? 1)
       const align = (node.attrs?.align as string) ?? 'left'
-      const styleTag = `<w:pStyle w:val="${HEADING_STYLE_ID(level)}"/>`
+      const numPr = listNumId ? `<w:numPr><w:ilvl w:val="0"/><w:numId w:val="${listNumId}"/></w:numPr>` : ''
+      const styleTag = `<w:pStyle w:val="${HEADING_STYLE_ID(level)}"/>${numPr}`
       return `<w:p>${paragraphPropsXml(align, styleTag)}${inlineToRuns(node.content)}</w:p>`
     }
```

Ohne diesen Fix würde jede Überschrift innerhalb eines Listenpunkts (nach dem
Schema-Fix aus 4.3 jetzt auch als **erstes** Kind möglich, vorher nur als zweites+)
beim DOCX-Export ihre Listenzugehörigkeit verlieren (`<w:numPr>` fehlt, Absatz wird zu
einer freistehenden, nicht nummerierten Überschrift). `odt/writer.ts` braucht **keine**
entsprechende Änderung — ODF bildet Listenmitgliedschaft rein strukturell durch
Verschachtelung ab (`blockToOdt`s `'bullet_list'`/`'ordered_list'`-Fall reicht jedes
Kind, unabhängig vom Typ, unverändert an `blockToOdt` weiter, Zeile 75–85), es gibt
keine separate `numId`-Referenz, die verloren gehen könnte — verifiziert durch
Codelesen, keine Änderung nötig.

### 4.7 `src/formats/odt/reader.ts` (geändert, abgestimmt mit `fett-code.md` §4.8)

`parseAutomaticStyles` (Zeile 36–77) wird durch eine kombinierte Kaskaden-Funktion
ersetzt, die **beide** Pläne gemeinsam bedient (diese Datei: `paragraph`-Familie/
Ausrichtung; `fett-code.md` §4.8: `text`-Familie/Marks) — **wichtig: beide Änderungen
müssen in derselben Umsetzung landen, nicht nacheinander unabhängig, da sie dieselbe
Funktion ersetzen.**

```ts
interface ParsedStyles {
  textStyles: Map<string, RunStyle>
  paragraphAligns: Map<string, string>
  listKinds: Map<string, 'bullet' | 'ordered'>
}

function collectStyleFamilies(
  containerEl: Element | null,
  textStyles: Map<string, RunStyle>,
  paragraphAligns: Map<string, string>,
  parentByName: Map<string, string>,
): void {
  if (!containerEl) return
  for (const styleEl of childElements(containerEl, ODF_NAMESPACES.style, 'style')) {
    const name = styleEl.getAttributeNS(ODF_NAMESPACES.style, 'name')
    const family = styleEl.getAttributeNS(ODF_NAMESPACES.style, 'family')
    if (!name) continue
    const parent = styleEl.getAttributeNS(ODF_NAMESPACES.style, 'parent-style-name')
    if (parent && !parentByName.has(name)) parentByName.set(name, parent)

    if (family === 'text' && !textStyles.has(name)) {
      // ... unverändert aus der heutigen parseAutomaticStyles-Logik für family === 'text'
      // (fo:font-weight, fo:font-style, style:text-underline-style, ..., siehe fett-code.md §4.8)
    } else if (family === 'paragraph' && !paragraphAligns.has(name)) {
      const props = firstChildNS(styleEl, ODF_NAMESPACES.style, 'paragraph-properties')
      const align = props?.getAttributeNS(ODF_NAMESPACES.fo, 'text-align')
      if (align) paragraphAligns.set(name, align)
    }
  }
}

const MAX_STYLE_PARENT_DEPTH = 25

function resolveParagraphAlign(
  styleName: string,
  paragraphAligns: Map<string, string>,
  parentByName: Map<string, string>,
): string | undefined {
  const seen = new Set<string>()
  let current: string | undefined = styleName
  for (let depth = 0; current && depth < MAX_STYLE_PARENT_DEPTH && !seen.has(current); depth++) {
    seen.add(current)
    const direct = paragraphAligns.get(current)
    if (direct) return direct
    current = parentByName.get(current)
  }
  return undefined
}
```

`readOdt` (Zeile 239 ff.) ruft `collectStyleFamilies` für **automatische** Stile
**zuerst** auf (Vorrang bei Namenskollision, wie in `fett-code.md` §4.8 gefordert),
danach für `office:styles` aus **beiden** Teilen (`content.xml`, falls dort
ausnahmsweise vorhanden, und `styles.xml`, der übliche Ort für gemeinsame Stile):

```ts
const textStyles = new Map<string, RunStyle>()
const paragraphAligns = new Map<string, string>()
const parentByName = new Map<string, string>()
collectStyleFamilies(contentAutomaticStyles, textStyles, paragraphAligns, parentByName)
// ... stylesAutomaticStyles analog ...
const contentOfficeStyles = contentDoc.getElementsByTagNameNS(ODF_NAMESPACES.office, 'styles')[0] ?? null
const stylesOfficeStyles = stylesDoc?.getElementsByTagNameNS(ODF_NAMESPACES.office, 'styles')[0] ?? null
collectStyleFamilies(contentOfficeStyles, textStyles, paragraphAligns, parentByName)
collectStyleFamilies(stylesOfficeStyles, textStyles, paragraphAligns, parentByName)
```

`paragraphToBlocks`/`elementToBlocks` (Zeile 123–157, 164–206) ändern sich **nicht**
inhaltlich — beide rufen weiterhin `styles.paragraphAligns.get(styleName)` auf; nur
dass diese Map jetzt zusätzlich `office:styles`-Einträge (mit aufgelöster
`parent-style-name`-Kette) enthält, muss über `resolveParagraphAlign(...)` statt eines
reinen `.get(...)` erfolgen:

```diff
- const align = (styleName && styles.paragraphAligns.get(styleName)) || 'left'
+ const align = (styleName && resolveParagraphAlign(styleName, styles.paragraphAligns, styles.parentByName)) || 'left'
```

(zwei Fundstellen: `paragraphToBlocks` Zeile 126, `elementToBlocks`-Fall `'h'` Zeile
173 — jeweils analog anzupassen; `ParsedStyles` bekommt dafür ein zusätzliches Feld
`parentByName: Map<string, string>`).

Löst Befund 6/Grenzfall 15: Eine Überschrift, deren Formatierung über eine
gemeinsame/benannte Formatvorlage aus `office:styles` bezogen wird (wie in
`MyHeading1.odt` bereits real vorhanden — `Heading2` ist dort **nur** in `styles.xml`s
`office:styles` definiert, nicht in `office:automatic-styles`), verliert ihre
Ausrichtung beim Import nicht mehr still.

### 4.8 Keine Änderung erforderlich (verifiziert, zur Vollständigkeit dokumentiert)

- `src/formats/docx/styleDefs.ts`, `src/formats/odt/styleRegistry.ts` — Export-seitige
  Formatvorlagen-Definitionen sind korrekt (siehe Abschnitt 1, Zeile 8); die
  Fett-Deklaration auf Stil-Ebene ist laut `fett-code.md` §5 bereits als bewusst
  akzeptiertes Verhalten dokumentiert, hier nicht erneut zu ändern.
- `src/formats/odt/writer.ts` — bereits korrekt (Finding F betrifft ausschließlich
  `docx/writer.ts`, siehe Abschnitt 4.6).
- `src/formats/shared/editor/commands.ts` `setAlign`/`isAlignActive` — bewusst
  unverändert, siehe Abschnitt 4.1 (Finding B ist Cross-Reference, kein Fix hier).

---

## 5. Testplan (Zuordnung zu Abschnitt 5 der Anforderung)

### 5.1 Neue Datei: `tests/e2e/absatzformat.spec.ts` (neu)

Analog zur in `fett-code.md` §6.1 für „Fett" empfohlenen `bold.spec.ts` — dediziert per
`page.getByLabel('Absatzformat')`/`selectOption`, nicht über direkte Command-Aufrufe:

1. Cursor in neu getippten Absatz, „Überschrift 1" wählen → `<h1>` im DOM, Dropdown
   zeigt weiterhin „Überschrift 1" (Testfall 5.1).
2. Direkt danach „Überschrift 4" ohne Zwischenschritt → `<h4>`, kein Zwischenzustand
   (Testfall 5.2/Grenzfall 10).
3. „Standard" wählen → wieder `<p>`, echte Node-Typ-Änderung, nicht nur visuell
   (Testfall 5.3/Abschnitt 2.4).
4. Zwei Zeilen per Maus-Drag markieren, „Überschrift 2" wählen → **beide** werden zu
   `<h2>` (neues Ergebnis gemäß Entscheidung 3.1, ersetzt die in der Anforderung noch
   offene Erwartung aus Testfall 5.4).
5. Cursor in ersten Absatz eines Listenpunkts, „Überschrift 1" wählen → funktioniert
   jetzt (neues Ergebnis gemäß Entscheidung 3.3, ersetzt „aktuell: kein sichtbarer
   Effekt" aus Testfall 5.5/Grenzfall 4).
6. Cursor in zweiten Absatz desselben Listenpunkts (Umschalt+Enter), „Überschrift 1"
   wählen → funktioniert weiterhin (Testfall 5.6/Grenzfall 5) — **jetzt konsistent**
   mit Test 5, nicht mehr die in der Anforderung dokumentierte Inkonsistenz.
7. Cursor in Tabellenzelle, „Überschrift 2" → Zelle zeigt `<h2>`, Rest unverändert
   (Testfall 5.7).
8. Mehrere Tabellenzellen markieren (`CellSelection`), Format wählen → **alle**
   selektierten Zellen erhalten das Format (neues Ergebnis gemäß Entscheidung 3.1
   Finding A, ersetzt „No-Op" aus Testfall 5.8/Grenzfall 2.7/7).
9. Absatz zentrieren, danach „Überschrift 1" → Ausrichtung bleibt `center` erhalten
   (neues Ergebnis gemäß Entscheidung 3.2, ersetzt den in Grenzfall 8 als „potenzieller
   Fehler" markierten Zustand).
10. Enter am Ende einer Überschrift → neuer Block ist `<p>`, keine weitere Überschrift
    (Testfall 5.10/Abschnitt 2.8, bisher komplett ungetestet).
11. Enter mitten in einer Überschrift → beide Hälften bleiben `<hN>` derselben Ebene
    (Testfall 5.11/Abschnitt 2.8).
12. Undo direkt nach Formatwechsel → vorheriger Node-Typ **und** Ausrichtung
    wiederhergestellt (dank 3.2 jetzt auch die Ausrichtung, nicht nur der Typ); Redo
    stellt beides erneut her (Testfall 5.12/Abschnitt 2.10).
13. **Neuer Pflichttest, Regression:** Datei `listStyleId.odt` hochladen (oder eine
    kleinere, gezielt gebaute Kopie desselben Konstrukts — Überschrift als einziges
    Kind eines Listenpunkts), Cursor ans Ende dieser Überschrift setzen, **Enter**
    drücken, weiter tippen → Editor bleibt bedienbar, kein JS-Fehler in der Konsole,
    Dokument bleibt konsistent. Direkter Regressionstest für Finding E3 — **muss vor
    dem Schema-Fix aus 4.3 fehlschlagen und danach grün sein**, sonst ist der Fix nicht
    wirksam.
14. Analog zu Grenzfall 14/Testfall 5.13 der Anforderung: Tippen → Absatzformat setzen
    → Klick zur Neupositionierung → Enter → weiter tippen → Dokument bleibt konsistent
    (Selection-Sync-Regression, analog `selection-regression.spec.ts`, jetzt mit
    Absatzformat-Wechsel als auslösendem Schritt statt Fett).
15. Vollständige Rundreisetests je Format (4.1/4.2 der Anforderung) über echten
    Datei-Upload/-Download (Testfall 5.14).
16. Cross-Format-Rundreise DOCX→ODT→DOCX und ODT→DOCX→ODT (Testfall 5.15).
17. Reale Fremddatei-Tests: `MyHeading1.odt` (Befund 6/Grenzfall 15 — Text und Ebene
    bleiben erhalten; Ausrichtung wird nach dem Fix aus 4.7 ebenfalls korrekt gelesen,
    sofern die betroffene reale Formatvorlage `fo:text-align` deklariert — bei
    `MyHeading1.odt`s `Heading1`/`Heading2` selbst ist das **nicht** der Fall, die
    Fixture beweist daher nur die **strukturelle** Seite des Bugs, nicht sichtbar die
    Ausrichtung; für einen deterministischen Ausrichtungs-Nachweis zusätzlich eine
    **synthetische** ODT-Datei bauen, siehe 5.3), `ListHeading.odt`/`ListHeading2.odt`
    (Grenzfall 4/5 — Text/Ebene bleiben erhalten, Konvertierbarkeit an beiden
    Positionen jetzt konsistent), `heading123.docx` (einfache Rundreise, Abnahme
    4.1.7). (Testfall 5.16)
18. Mobile/Tablet: Testfälle 1–3 auf allen drei `playwright.config.ts`-Projekten
    (Desktop Chrome, Mobile/Pixel 7, Tablet/iPad Mini) (Testfall 5.17).

### 5.2 `src/formats/shared/editor/__tests__/commands.test.ts` (neu — geteilt mit `fett-code.md` §6.2)

**Koordinationshinweis:** `fett-code.md` §6.2 plant bereits eine Datei mit exakt diesem
Pfad (für `isMarkActive`). Beide Testgruppen müssen in **derselben** Datei
zusammengeführt werden (z. B. je ein `describe`-Block), nicht als zwei konkurrierende
Dateien mit demselben Namen entstehen.

Unit-Tests (Vitest, ohne DOM/E2E) für `collectHeadingTargets`/`canSetHeading`/
`setHeading` aus Abschnitt 4.1:

- Collapsed Cursor in einem Absatz/einer Überschrift → genau ein Target.
- Selektion über zwei Absätze → zwei Targets, `setHeading` konvertiert beide, jeder
  behält seine eigene vorherige `align`.
- `CellSelection` über 2×2 Zellen (Aufbau wie in Abschnitt 3.1 beschrieben) →
  vier Targets (einer je Zelle), `setHeading` konvertiert alle vier in einer einzigen
  Transaktion (`tr.docChanged`, genau ein Undo-Schritt).
- `CellSelection` über eine leere Bild-Zelle (kein Absatz/keine Überschrift als
  Content) → keine Targets, `canSetHeading` liefert `false`.
- Cursor im ersten **und** im zweiten Kind eines Listenpunkts → beide liefern ein
  Target (Regressionstest für den Schema-Fix aus 4.3 — vorher lieferte nur die zweite
  Position ein strukturell gültiges Ergebnis).
- Direkter Ebenenwechsel (Level 2 → Level 5 in einem Aufruf) → funktioniert, `align`
  bleibt erhalten.

### 5.3 `src/formats/odt/__tests__/reader-edge-cases.test.ts` (neu)

Hand-gebaute, minimale ODT-Zips (Muster: `tests/e2e/odt.spec.ts`s `buildSampleOdt()`,
aber auf Unit-Ebene mit JSZip direkt) für deterministische, synthetische Fälle, die die
reale Fixture-Korpus nicht in der benötigten Präzision liefert:

- `<text:h text:style-name="Common1" ...>` mit `Common1` **ausschließlich** in
  `office:styles` (nicht `office:automatic-styles`) definiert, mit explizitem
  `fo:text-align="center"` → nach Fix aus 4.7 wird `align: 'center'` korrekt gelesen
  (vor dem Fix: `'left'`, stiller Verlust — dieser Test **muss vor dem Fix fehlschlagen
  und danach grün sein**).
- Dieselbe Konstruktion mit einer `style:parent-style-name`-Kette (Stil A erbt von
  Stil B, nur B deklariert `fo:text-align`) → Ausrichtung wird über die Kette
  aufgelöst.
- Real-Fixture-Smoke-Tests (ergänzt in `external-fixtures.test.ts`, siehe 5.5):
  `MyHeading1.odt`, `ListHeading.odt`, `ListHeading2.odt`, `listStyleId.odt` — gezielte
  Assertions statt nur „importiert ohne Absturz" (Text und `outline-level` je Fixture
  konkret geprüft, siehe 5.5).

### 5.4 `src/formats/docx/__tests__/reader-edge-cases.test.ts` (neu)

- Hand-gebauter `styles.xml`-Ausschnitt: Stil `CustomHeading` mit
  `<w:basedOn w:val="Heading1"/>`, ohne eigenes `w:outlineLvl` → `readDocx` erkennt
  Level 1 (Regressionstest für Finding D/Grenzfall 16 — **muss vor dem Fix aus 4.5
  fehlschlagen und danach grün sein**).
- Zyklischer `w:basedOn` (A basiert auf B, B auf A) → kein Hang/Absturz, Rückgabe
  `null` (Level unbekannt), analog zum bereits bestehenden
  `MAX_TABLE_NESTING_DEPTH`-Muster in derselben Datei.
- `heading123.docx` (reale Fixture) → Level und Text korrekt erkannt (Abnahme 4.1.7).

### 5.5 `src/formats/odt/__tests__/external-fixtures.test.ts` (ergänzt)

Aktuell nur „importiert ohne Absturz" (siehe Abschnitt 1 dieser Datei). Ergänzen um:

- `listStyleId.odt`: **zusätzlich zum reinen Crash-Test** eine Schema-Validitäts-
  Prüfung — `wordSchema.nodeFromJSON(doc.body)` gefolgt vom Versuch, `EditorView` zu
  mounten **und** `splitListItem` an der betroffenen Position dry-run auszuführen
  (`command(state, undefined)`), darf **nicht** werfen. Dieser Test deckt exakt die
  Lücke ab, die der bisherige „importiert ohne Absturz"-Test **nicht** sieht (er prüft
  nur `readOdt` selbst, nie das Ergebnis gegen das Schema oder gegen
  Bearbeitungs-Commands) — siehe Finding E3.
- `MyHeading1.odt`: `Heading2`-Überschrift korrekt als `level: 2` erkannt trotz
  ausschließlicher Definition in `office:styles`.
- `ListHeading.odt`/`ListHeading2.odt`: `list_item` mit zwei Kindern
  (`paragraph`, `heading`) korrekt erkannt.

### 5.6 `src/formats/docx/__tests__/roundtrip.test.ts` (ergänzt)

- Bestehende Gruppe „preserves heading alignment" (aktuell nur `align: 'center'`, ein
  Fall) zu `it.each(['left', 'center', 'right', 'justify'])` erweitern, analog zur
  bereits vorhandenen Parametrisierung für Absätze (Zeile 49) — schließt die Lücke,
  dass bisher nur eine von vier Ausrichtungen für Überschriften geprüft wird.
- Neuer Fall: Level 3–6 (bisher nur 1/2 abgedeckt).
- Neuer, unabhängigerer Struktur-Test (ergänzt, ersetzt nicht die bestehenden
  Fidelity-Tests): nach `writeDocx` das rohe `word/document.xml` direkt per Regex/
  `DOMParser` auf `<w:pStyle w:val="Heading3"/>` prüfen (Muster aus `docx.spec.ts`s
  E2E-Tests, hier auf Unit-Ebene) — erfüllt Abnahme 4.1.2 wörtlicher als der bisherige
  reine Round-Trip-über-die-eigene-Reader-Test.
- Neuer Fall: Wechsel „Heading3" → kein `w:pStyle` mehr (Standard-Absatz), erfüllt
  Abnahme 4.1.3.
- Neuer Fall: Überschrift **innerhalb eines Listenpunkts** → `<w:numPr>` bleibt
  erhalten (Regressionstest für Finding F/Fix aus 4.6 — **muss vor dem Fix
  fehlschlagen und danach grün sein**).

### 5.7 `src/formats/odt/__tests__/roundtrip.test.ts` (ergänzt)

Analog zu 5.6: alle vier Ausrichtungen für Überschriften, Level 3–6, Wechsel zurück zu
`<text:p>` (Abnahme 4.2.2/4.2.3), Überschrift innerhalb eines Listenpunkts (hier ohne
Gegenstück zu Finding F nötig, siehe Abschnitt 4.6 — nur zur Vollständigkeit
mitgetestet).

---

## 6. Zuordnung zu den Abnahmekriterien (Abschnitt 7 der Anforderung)

| DoD-Punkt | Abdeckung durch diesen Plan |
|---|---|
| 1. Alle Testfälle aus Abschnitt 5 real im Browser ausgeführt | Abschnitt 5.1 dieser Datei (neue `absatzformat.spec.ts`, 18 Punkte) |
| 2. Rundreise-Anforderungen (Abschnitt 4) per unabhängigem Parser/Re-Import bestätigt | Abschnitt 5.1 Punkte 15–17 + 5.6/5.7 |
| 3. Design-Frage Mehrfachselektion (2.3/Grenzfall 2) entschieden | Abschnitt 3.1 dieser Datei: **erweitern**, mit `CellSelection`-sicherer Umsetzung |
| 4. Design-Frage Ausrichtungserhalt (2.5/Grenzfall 8-9) entschieden | Abschnitt 3.2 dieser Datei: **erhalten** |
| 5. Listen-Inkonsistenz (2.6/Grenzfall 4-5) aufgelöst | Abschnitt 3.3 dieser Datei: **Schema-Fix, einheitlich erlauben** (nicht verbieten — Begründung inkl. zweier realer Fixtures und eines reproduzierten Absturzes) |
| 6. ODT-`office:styles`-Befund (6/Grenzfall 15/Testfall 4.2.7) an realer Fremddatei nachvollzogen | Abschnitt 3.4 + 4.7 dieser Datei; `MyHeading1.odt` als reale Fixture, zusätzliche synthetische Fixture für den quantitativen Ausrichtungs-Nachweis (Abschnitt 5.3) |
| 7. Selection-Sync-Regressionstest × Absatzformat geschrieben, grün, dauerhaft Teil der Suite | Abschnitt 5.1 Punkt 14 |
| 8. Kein Testfall zeigt stillen Datenverlust/JS-Exception | Abschnitt 4.2 (`disabled`-Zustand), 4.1 (Ausrichtung/Undo atomar), 5.1 Punkt 13 (Finding E3, jetzt mit Regressionstest abgesichert) |
| 9. Backlog-Status-Korrektur | Nicht Gegenstand dieser Datei (ändert `absatzformat-dropdown-req.md`/`FEATURE-BACKLOG.md` nicht selbst) — nach Umsetzung von Abschnitt 4 und grünem Abschnitt 5 kann der Status von „teilweise" auf „vorhanden" zurückgestuft/bestätigt werden. |

---

## 7. Reihenfolge der Umsetzung (Vorschlag)

1. `schema.ts` (4.3) — einzeiliger, risikoarmer Fix, entblockt sowohl Befund 5 als auch
   den Absturz aus Finding E3; sofort mit dem Regressionstest aus 5.1 Punkt 13 /
   5.5 absichern (**vor** dem Fix rot, danach grün — Beweis der Wirksamkeit).
2. `commands.ts` (4.1) — `setHeading`/`canSetHeading`/`headingTargetsInSelection`,
   behebt Befund 3/4 sowie Finding A/B-bewusste, korrekte Mehrzellen-Behandlung.
   Begleitend Unit-Tests aus 5.2.
3. `Toolbar.tsx` (4.2) — `disabled`-Zustand, vereinfachte `currentHeadingLevel`,
   nutzt 1/2 direkt.
4. `docx/writer.ts` (4.6, Finding F) — kleiner, isolierter Fix, direkt nach 1, da erst
   ab dann eine Überschrift als erstes Kind eines Listenpunkts real vorkommen kann.
5. `docx/reader.ts` (4.5, Finding D) und `odt/reader.ts` (4.7, Befund 6, **abgestimmt
   mit `fett-code.md` §4.8** — beide Änderungen in einem Zug umsetzen) — unabhängig
   von 1–4, kann parallel erfolgen.
6. `WordEditor.tsx` (4.4, optional) — nach Abschluss von 2, sehr geringer Aufwand.
7. Testergänzungen 5.3–5.7 (Unit-/Reader-Ebene), dann 5.1 (E2E), um alle vorherigen
   Schritte einzeln abzusichern, bevor der Backlog-Status (Abnahme 9) angepasst wird.
