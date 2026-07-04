# Umsetzungsplan: Feature „Spalte einfügen (links/rechts)" — Code-Abgleich und geplante Änderungen

Rolle: Entwickler-Antwort auf `specs/spalte-einfuegen-req.md`. Stil/Aufbau orientiert an
`specs/ausrichtung-links-code.md` und `specs/fett-code.md`. Dieses Dokument prüft den
**tatsächlichen** Code-Stand (nicht nur die in der Anforderung zitierten Fundstellen),
führt zusätzlich **ausführbare Reproduktionen** einzelner Kernbehauptungen der
Anforderung durch (gegen die echte `wordSchema` und das echte, im Projekt bereits
installierte `prosemirror-tables@1.8.5`, mit `vitest`/`jsdom` — Details Abschnitt 1) und
legt fest, welche Dateien wie geändert bzw. neu angelegt werden. **Kein Punkt hier ist
bereits umgesetzt — dies ist der Plan, nicht der Vollzug.**

---

## 0. Kurzfassung

Die Codeprüfung aus `spalte-einfuegen-req.md` Abschnitt 0 ist **vollständig zutreffend**:
Es existiert tatsächlich keine einzige Zeile, die eine Tabellenspalte gezielt einfügt.
Alle dort zitierten Fundstellen/Zeilennummern sind exakt (Abschnitt 2 unten). Zusätzlich
zur reinen Codelektüre wurden vier Kernbehauptungen der Anforderung **tatsächlich
ausgeführt** (echte `EditorView` + echte `wordSchema` + echtes `prosemirror-tables` aus
`node_modules`, nicht nur an deren Quelltext abgelesen) und dabei **bestätigt und
präzisiert**:

1. **Undo-Gruppierung (Abschnitt 3.8 der Anforderung) ist bereits korrekt, ohne
   Zusatzcode:** `addColumnBefore`/`addColumnAfter` bauen genau **eine** Transaktion
   und dispatchen sie genau **einmal** — ein einzelnes `Strg+Z` stellt beide Zeilen
   einer 2×2-Tabelle nach einem Spalten-Insert exakt wieder her. Verifiziert per
   Ausführung, nicht nur Quelltext-Lektüre.
2. **Grenzfall 4.2 (gemischte Merges) tatsächlich nachgestellt:** 3-Spalten-Tabelle,
   Zeile 1 mit `colspan:2`-Zelle über Spalte 2–3, Zeile 2 normal. Cursor in Zeile 2,
   Spalte 2 (`B2`), `addColumnAfter` ausgeführt → Zeile 1 wächst auf **genau eine**
   Zelle mit `colspan:3` (`[1, 3]`), Zeile 2 bekommt eine **echte neue leere Zelle**
   zwischen `B2` und `C2` (`['A2','B2','','C2']`) — exakt wie in Abschnitt 3.4/
   Grenzfall 4.2 der Anforderung beschrieben, hier aber mit echtem Zellinhalt und
   echten Positionswerten nachgewiesen statt nur aus dem Bibliotheks-Quelltext
   abgeleitet.
3. **Grenzfall 4.4 (Mehrfachauswahl) tatsächlich nachgestellt:** Echte `CellSelection`
   (via `cellAround`, dieselbe Konstruktion, die `prosemirror-tables` selbst intern
   verwendet) über die mittlere und rechte Spalte einer 3×3-Tabelle, `addColumnAfter`
   ausgeführt → Spaltenzahl wächst von 3 auf **4**, nicht auf 5 — bestätigt: **eine**
   Spalte pro Klick, unabhängig von der Selektionsbreite.
4. **Grenzfall 4.5 (verschachtelte Tabelle) tatsächlich nachgestellt:** Äußere Tabelle
   mit innerer 1×2-Tabelle in einer Zelle, Cursor in der inneren Tabelle,
   `addColumnAfter` ausgeführt → äußere Zeile bleibt bei **2** Zellen (unverändert),
   innere Zeile wächst von 2 auf **3** Zellen. Bestätigt.

Zusätzlich wurde **ein bislang nicht durch Ausführung, sondern nur durch
Quelltext-Analyse verifizierter Mechanismus präzisiert** (Abschnitt 3.4 unten): Die
Behauptung in Abschnitt 3.6 der Anforderung, eine neue Spalte bekomme „dieselbe
(Default-)Breite wie alle übrigen Spalten", ist **technisch ungenau** — der tatsächliche
Mechanismus (`updateColumnsOnResize` in `prosemirror-tables`, Quelltext-Inspektion)
setzt bei durchgehend `colwidth: null` **keine** feste Pixelbreite auf einer der
Spalten, sondern überlässt die Breitenverteilung dem Browser-Standard-Tabellenlayout
(`table-layout: auto`, inhaltsbasiert) — eine neue, leere Spalte wird dadurch
in der Praxis **schmaler** dargestellt als bereits befüllte Nachbarspalten, bis Text
hineingetippt wird. Das ist **keine Regression** dieses Features (identisches
Verhalten bei jeder bereits heute bestehenden Mehrspalten-Tabelle), aber eine
Korrektur der in der Anforderung geäußerten Erwartung — siehe Abschnitt 3.4/4.1.

Der in Abschnitt 6 der Anforderung geforderte ODT-`colCount`-Fix ist **bestätigt nötig**
und wird als Teil dieses Plans umgesetzt (Abschnitt 5.5).

Die drei von der Anforderung explizit als „zu entscheiden" markierten offenen Punkte
werden in Abschnitt 4 getroffen: (a) Mehrfachauswahl-Semantik (Abschnitt 3.3) → **wird
für v1 auf Bibliotheksverhalten belassen**, dokumentiert und mit Testfall belegt,
Word/LibreOffice-Parität wird zurückgestellt; (b) sehr breite Tabellen (Grenzfall 4.7)
→ bereits vorhandenes CSS-Verhalten reicht aus (horizontales Scrollen des
Editor-Bereichs, siehe präzise Schwellenwert-Berechnung in Abschnitt 3.5), keine
Codeänderung nötig, nur ein Performance-/Crash-Test; (c) Kontextmenü → **bestätigt
nicht Teil dieses Umfangs**, siehe Abschnitt 4.3.

---

## 1. Methodik

Neben Codelektüre aller in der Anforderung genannten Dateien (`schema.ts`,
`Toolbar.tsx`, `commands.ts`, `WordEditor.tsx`, `docx/writer.ts`, `odt/writer.ts`,
`docx/reader.ts`, `odt/reader.ts`, beide `__tests__/roundtrip.test.ts`) wurden folgende
zusätzliche Prüfungen durchgeführt:

- **Bibliotheks-Quelltext-Inspektion** direkt in `node_modules/prosemirror-tables/dist/index.cjs`
  (Node-Skripte, `require('prosemirror-tables')`) für `addColumn`, `addColumnBefore`,
  `addColumnAfter`, `selectedRect`, `selectionCell`, `cellAround`, `isInTable`,
  `TableMap.rectBetween`, `addColSpan`, `tableNodes`, `columnResizing`, `TableView`,
  `updateColumnsOnResize` — bestätigt alle in der Anforderung Abschnitt 0 zitierten
  Verhaltensbehauptungen und deckt die in Abschnitt 0 dieses Plans genannte
  Breiten-Präzisierung auf.
- **Ausführbare Reproduktion** (temporäre, nicht ins Repo übernommene Testdatei, gegen
  die echte `wordSchema` aus `src/formats/shared/schema.ts` sowie `prosemirror-state`/
  `-view`/`-history`/`-tables` aus `node_modules`, mit `vitest run` im Projekt
  ausgeführt — Ergebnisse siehe Abschnitt 0, Details Abschnitt 3.1–3.3): Undo-Gruppierung,
  Grenzfall 4.2, Grenzfall 4.4, Grenzfall 4.5. Alle vier bestanden ohne Anpassung an der
  Bibliothek — reine Verifikation, keine Implementierung.
- **Testkonventionen des Projekts** gesichtet: `src/formats/shared/editor/__tests__/pagination.test.ts`
  (einziger bestehender Unit-Test unter `editor/__tests__/`, keine Vorlage für
  ProseMirror-Command-Tests vorhanden — neues Muster nötig, siehe Abschnitt 6.1),
  `tests/e2e/selection-regression.spec.ts` (Muster für Tabellen-Selection-Sync-Tests,
  Zeile 34–50 bereits mit einer einfachen 2×2-Tabelle), `tests/e2e/odt.spec.ts`/
  `docx.spec.ts` (Muster für Download+`JSZip`-Inspektion des Exports).
- **Icon-Recherche:** Da im Projekt **kein** SVG-Icon existiert (`grep -rl "<svg" src/`
  liefert keinen Treffer) und `package.json` keine Icon-Bibliothek als Abhängigkeit
  führt, wurde — analog zur bereits in `fett-code.md`/`ausrichtung-links-code.md`
  getroffenen Entscheidung für `BoldIcon`/`AlignLeftIcon` — nach einem passenden,
  frei lizenzierten SVG für „Spalte links/rechts einfügen" gesucht. Gefunden: Googles
  **Material Symbols** (Apache License 2.0, Nachfolgeserie der klassischen Material
  Icons) führt exakt zwei zum Anwendungsfall passende, benannte Glyphen —
  `add_column_left` und `add_column_right`. Beide wurden über das offizielle
  npm-Paket `@material-symbols/svg-400` (outlined-Variante) bezogen und deren
  `viewBox`/`path`-Daten verifiziert (Abschnitt 5.2). Das ist eine **präzisere**
  Wahl als die in `fett-code.md` verwendete generische „format_bold"-Glyphe, weil
  hier tatsächlich passgenau benannte Icons für exakt diesen Anwendungsfall
  existieren, statt eine thematisch naheliegende Glyphe wiederzuverwenden.

---

## 2. Verifikation der Ist-Stand-Tabelle aus `spalte-einfuegen-req.md` Abschnitt 0

| Fundstelle laut Anforderung | Ergebnis der Prüfung |
|---|---|
| `schema.ts:106` `tableNodes({ tableGroup: 'block', cellContent: 'block+', cellAttributes: {} })` | Bestätigt, Zeile exakt. **Zusätzlich gefunden:** `tableNodes()` erzeugt neben `table_cell` auch einen `table_header`-Knotentyp (`tableRole: 'header_cell'`) — dieser wird von **keinem** Reader/Writer/`insertTable` je erzeugt oder gelesen. `addColumn`s interne `columnIsHeader`-Prüfung (bestimmt, ob eine neue Zelle als `table_header` statt `table_cell` angelegt wird) kann daher in dieser Anwendung **nie** zutreffen — jede neu eingefügte Zelle ist garantiert eine `table_cell`. Kein Fund, der einen Fix erfordert, aber eine Absicherung, die im Testplan (Abschnitt 6.1) explizit mitbelegt wird, damit sie nicht unbemerkt durch einen künftigen Header-Support bricht. |
| `Toolbar.tsx:228-239` genau ein „⊞ Tabelle"-Button, `insertTable(2,2)` | Bestätigt, Zeilen exakt. **Zusätzlich gefunden:** Der bestehende Button trägt `aria-pressed={isInTable(view.state)}` (Zeile 231) — semantisch fragwürdig (Einfügen ist kein Umschalter), aber **außerhalb des Scopes** dieser Anforderung (betrifft nur den bestehenden „Tabelle einfügen"-Button, nicht die neuen Spalten-Buttons) und wird nicht angefasst. |
| `commands.ts:76-86` `insertTable`, keine Spalten-Funktion | Bestätigt, Zeilen exakt. `commands.ts` hat 108 Zeilen insgesamt, keine Tabellen-Spalten-Funktion irgendwo enthalten. |
| `WordEditor.tsx:8`/`:81-82` `columnResizing()`/`tableEditing()` aktiv, keine Spalten-Keymap | Bestätigt, Zeilen exakt. **Zusätzlich per Quelltext-Inspektion bestätigt:** `columnResizing()` registriert seinen eigenen `TableView`-NodeView **selbstständig** über `plugin.spec.props.nodeViews` (kein `nodeViews`-Prop nötig in `WordEditor.tsx`s `new EditorView(...)`-Aufruf) — Spalten-Resizing ist also bereits vollständig verdrahtet, unabhängig von diesem Feature. |
| `node_modules/prosemirror-tables` v1.8.5, `addColumnBefore`/`addColumnAfter` ungenutzt | Bestätigt — `grep -rn "addColumn" src/` liefert keinen Treffer. Beide Funktionen sind in der installierten Version vorhanden und exportiert (per `Object.keys(require('prosemirror-tables'))` verifiziert). |
| `docx/writer.ts:128-171`, `colCount` korrekt via Colspan-Summe | Bestätigt, Zeile 130 exakt: `(rows[0]?.content ?? []).reduce((sum, cell) => sum + Number(cell.attrs?.colspan ?? 1), 0) \|\| 1`. |
| `odt/writer.ts:86-110`, `colCount`-Fehler | **Bestätigt, Fehler ist real:** Zeile 88, `const colCount = rows[0]?.content?.length ?? 1` — zählt Zellen statt Colspan-Summe. Siehe Fix Abschnitt 5.5. |
| `docx/reader.ts:244`/`odt/reader.ts:197`, `colwidth: null` fest, keine Writer-seitige Nutzung | Bestätigt, beide Zeilen exakt. Zusätzlich bestätigt (Abschnitt 3.4 unten): Writer-seitig liest auch **kein** anderer Code-Pfad `colwidth` — vollständig entkoppelt, wie behauptet. |
| Kein Kontextmenü im Repo | Bestätigt, `grep -rn "contextmenu\|onContextMenu" src/` liefert keinen Treffer. |
| Bestehende Tests konstruieren Tabellen nur als JSON, keine E2E-Tabellentests | Bestätigt. `tests/e2e/*.spec.ts` enthält genau eine Tabellen-Interaktion, `selection-regression.spec.ts:34-50` (`Tabelle einfügen`-Button-Klick + Zellinhalt), aber keinen Spalten-Test. |

Keine der in der Anforderung zitierten Fundstellen ist falsch. Alle in Abschnitt 0
dieses Plans genannten Zusatzerkenntnisse (Undo-Gruppierung, Grenzfall 4.2/4.4/4.5,
`table_header`-Irrelevanz, Breiten-Mechanismus) liegen **zusätzlich** dazu.

---

## 3. Durch Ausführung verifizierte Detailergebnisse

### 3.1 Undo/Redo (Abschnitt 3.8 der Anforderung) — bereits korrekt, kein Zusatzcode nötig

Bibliotheks-Quelltext (`addColumnBefore`):

```js
function addColumnBefore(state, dispatch) {
  if (!isInTable(state)) return false;
  if (dispatch) {
    const rect = selectedRect(state);
    dispatch(addColumn(state.tr, rect, rect.left)); // genau EIN dispatch
  }
  return true;
}
```

`addColumn` selbst iteriert intern über `map.height` Zeilen und akkumuliert alle
Änderungen (Zellen-Insert **und** Colspan-Erweiterung) auf **derselben** `tr`-Instanz,
bevor sie einmalig dispatcht wird. Reproduktion (2×2-Tabelle, Cursor in Zelle „B1",
`addColumnAfter`, dann `undo()` aus `prosemirror-history`):

```
Vorher:  Zeile 1: 2 Zellen, Zeile 2: 2 Zellen
addColumnAfter ausgeführt
Danach:  Zeile 1: 3 Zellen, Zeile 2: 3 Zellen
undo() ausgeführt
Danach:  Zeile 1: 2 Zellen, Zeile 2: 2 Zellen   ✓ ein einziges Undo genügt
```

**Konsequenz für den Plan:** Kein Wrapper-Code nötig, um Undo-Gruppierung
sicherzustellen — ein direkter Re-Export der Bibliotheksfunktionen genügt (Abschnitt 5.1).

### 3.2 Grenzfall 4.2 (gemischte Merges) — exakt nachgestellt

Tabelle: 3 Spalten, Zeile 1 = `[A1(colspan 1), Merged(colspan 2, Spalte 2–3)]`, Zeile 2 =
`[A2, B2, C2]` (alle `colspan 1`). Cursor in „B2" (Zeile 2, Spaltenindex 1),
`addColumnAfter` (fügt an Spaltengrenze Index 2 ein — das liegt **strikt innerhalb**
der Zeile-1-Merge, die Spalten 1–2 überdeckt):

```
Ergebnis Zeile 1: 2 Zellen, colspan-Werte [1, 3]   // Merge von 2 auf 3 gewachsen
Ergebnis Zeile 2: 4 Zellen, Texte ['A2','B2','','C2']  // echte neue leere Zelle
```

Exakt das in Abschnitt 3.4/Grenzfall 4.2 der Anforderung beschriebene Verhalten:
**beide** Effekte („Zelle verbreitert" und „neue leere Zelle eingefügt") treten in
**derselben** Aktion auf, je nachdem, ob die jeweilige Zeile an der Einfügegrenze
bereits eine sie überspannende Merge-Zelle hat. Kein Zusatzcode nötig — reines
Bibliotheksverhalten, hier mit echtem Zellinhalt nachgewiesen statt nur aus dem
`addColumn`-Quelltext abgeleitet.

### 3.3 Grenzfall 4.4 (Mehrfachauswahl) und Grenzfall 4.5 (verschachtelte Tabelle) — exakt nachgestellt

- **4.4:** 3×3-Tabelle, `CellSelection` (per `cellAround`, derselben internen
  Konstruktion wie `prosemirror-tables` selbst) über die mittlere und rechte Spalte
  (Zellen „B1"–„C1"), `addColumnAfter` → Spaltenzahl wächst von 3 auf **4** (nicht 5).
  Bestätigt: **eine** Spalte pro Klick, unabhängig von der Selektionsbreite — siehe
  Entscheidung Abschnitt 4.1.
- **4.5:** Äußere Tabelle mit 1 Zeile/2 Zellen, in Zelle 1 eine innere 1×2-Tabelle
  verschachtelt. Cursor im Text der inneren Tabelle, `addColumnAfter` → äußere Zeile
  bleibt bei **2** Zellen (unverändert), innere Zeile wächst von 2 auf **3** Zellen.
  Bestätigt: Die Bibliothek löst die relevante Tabelle bereits korrekt über
  `$pos.node(-1)` (in `selectedRect`/`selectionCell`) auf die **innerste** Tabelle
  auf, ohne dass die Anwendung selbst etwas dafür tun muss.

### 3.4 Präzisierung zu Abschnitt 3.6 der Anforderung (Spaltenbreite der neuen Spalte)

`updateColumnsOnResize` (von `columnResizing()`s selbstregistriertem `TableView`
aufgerufen, siehe Zusatzfund in Abschnitt 2) berechnet pro Spalte:

```js
const hasWidth = overrideCol == col ? overrideValue : colwidth && colwidth[j];
const cssWidth = hasWidth ? hasWidth + "px" : "";       // "" wenn colwidth null
...
if (!hasWidth) fixedWidth = false;
...
if (fixedWidth) { table.style.width = totalWidth + "px"; table.style.minWidth = ""; }
else { table.style.width = ""; table.style.minWidth = totalWidth + "px"; }
```

Da `colwidth` in dieser Anwendung **immer** `null` ist (Abschnitt 2), ist `hasWidth`
für **jede** Spalte falsy → jede `<col>` bekommt `style.width = ""` (keine feste
Pixelbreite), `fixedWidth` bleibt `false` → das `<table>`-Element bekommt
`style.minWidth = <Spaltenzahl> × 100px` (Default `defaultCellMinWidth`), aber
**keine** explizite `width`. Die bestehende Stylesheet-Regel `.ProseMirror table {
width: 100% }` (`src/index.css:44-48`) bleibt dadurch wirksam (ein leerer
Inline-`style.width`-String überschreibt keine Stylesheet-Regel). Da zusätzlich
**kein** `table-layout: fixed` irgendwo gesetzt ist (bestätigt, `grep -n
"table-layout" src/index.css` liefert keinen Treffer), verteilt der Browser die
Spaltenbreite nach Standard-Verhalten (`table-layout: auto`) **inhaltsbasiert**, nicht
gleichmäßig. Eine frisch eingefügte, leere Spalte bekommt dadurch in der Praxis nur
ihre CSS-`min-width: 2em`-Mindestbreite (`src/index.css:50-56`), während
bereits befüllte Nachbarspalten breiter bleiben — bis Text in die neue Spalte
eingegeben wird.

**Bewertung:** Das ist **keine Regression** durch dieses Feature (jede bereits
heute bestehende Mehrspalten-Tabelle mit `colwidth: null` verhält sich beim
Neuladen/Rendern identisch), sondern dieselbe vorbestehende, in Abschnitt 3.6/
Abschnitt 7 der Anforderung bereits als „kein Bestandteil dieser Anforderung"
eingestufte Einschränkung — hier nur mit dem exakten technischen Mechanismus
belegt statt der etwas zu optimistischen Formulierung „dieselbe Default-Breite wie
alle übrigen Spalten". **Kein Fix in diesem Plan**, aber die Formulierung im
Abnahme-Testfall wird entsprechend geschärft (Abschnitt 6.2: „neue Spalte ist
mindestens `min-width` breit und editierbar", nicht „exakt gleich breit wie alle
anderen").

### 3.5 Präzisierung zu Grenzfall 4.7 (sehr breite Tabelle)

Mit dem in Abschnitt 3.4 belegten `table.style.minWidth = <Spaltenzahl> × 100px`
lässt sich der tatsächliche Schwellenwert exakt berechnen: `PAGE_CONTENT_WIDTH_PX`
(`pageLayout.ts:13`, `PAGE_WIDTH_PX - 2*PAGE_MARGIN_PX` ≈ 793 − 2·94 ≈ **605px**) wird
von `minWidth` bereits ab **7 Spalten** (7×100 = 700px > 605px) überschritten, nicht
erst „> 10 Spalten" wie Grenzfall 4.7 als Beispiel nennt. Ab diesem Punkt kann der
`.word-editor-surface`-Container (`WordEditor.tsx:128`, kein eigenes
`overflow-x`) die Tabelle nicht mehr innerhalb der Seite darstellen; die **äußere**
scrollende Hülle (`WordEditor.tsx:119`, `className="flex-1 overflow-auto ..."`)
fängt den Überlauf ab und erzeugt einen horizontalen Scrollbalken für den gesamten
Editor-Bereich. **Das ist bereits heute (unabhängig von diesem Feature) das
bestehende Verhalten jeder breiten Tabelle** — Grenzfall 4.7 verlangt lediglich, dass
eine der beiden in der Anforderung genannten Varianten („horizontales Scrollen" vs.
„automatische Schrumpfung aller Spaltenbreiten") **bewusst gewählt** statt
stillschweigend offengelassen wird. **Entscheidung (Abschnitt 4.2): horizontales
Scrollen wird als bereits ausreichende, bestehende Antwort akzeptiert** — kein
Code-/CSS-Fix in diesem Plan, aber ein Test, der 10× „Spalte rechts" klickt und
Absturzfreiheit/Bedienbarkeit nachweist (Abschnitt 6.3).

---

## 4. Zu treffende Entscheidungen (verbindlich für diesen Plan)

### 4.1 Mehrfachauswahl-Semantik (Abschnitt 3.3/Grenzfall 4.4 der Anforderung)

**Entscheidung: Bibliotheksverhalten wird für v1 als ausreichend akzeptiert** — ein
Klick auf „Spalte links/rechts einfügen" fügt bei einer `CellSelection` über mehrere
Spalten **genau eine** neue Spalte an der Grenze der Selektion ein, **nicht** eine pro
markierter Spalte (abweichend von Word/LibreOffice).

**Begründung:** (a) Word-Parität nachzubilden erfordert zusätzliche, potenziell
fehleranfällige Logik (N-fache Wiederholung von `addColumnBefore`/`-After`, wobei nach
jeder Wiederholung die Selektionsgrenzen neu gemappt werden müssten, da sich die
`TableMap` nach jedem Einzelinsert ändert); (b) die Anforderung selbst verlangt an
dieser Stelle nur eine **bewusste Entscheidung mit Testfall**, keine bestimmte
Semantik; (c) das abweichende Verhalten ist nicht stillschweigend, sondern über einen
dedizierten Testfall (Abschnitt 6.1, Grenzfall-4.4-Test) sowie diesen
Abnahme-Vermerk dokumentiert. **Nachbesserungs-Ticket:** Falls Word-Parität später
gefordert wird, eigener Backlog-Eintrag (Vorschlag: `spalte-einfuegen-mehrfachauswahl`),
nicht Teil dieses Umfangs.

### 4.2 Sehr breite Tabellen (Grenzfall 4.7)

**Entscheidung: horizontales Scrollen (bereits vorhandenes Verhalten, siehe
Abschnitt 3.5) wird bewusst als ausreichende Antwort bestätigt.** Keine
automatische Spalten-Schrumpfung wird implementiert. Begründung: automatische
Schrumpfung aller Spalten würde zusätzliche Logik (z. B. `table-layout: fixed` +
prozentuale `colwidth`-Zuweisung) erfordern, obwohl `colwidth` in dieser Anwendung
laut Abschnitt 7 der Anforderung explizit **nicht** Teil dieses Scopes ist — eine
Schrumpfungslösung ohne echte `colwidth`-Rundreise wäre zudem inkonsistent (Breiten
gingen beim nächsten Reader/Writer-Zyklus ohnehin verloren, Abschnitt 0 der
Anforderung). Nachweis über Performance-/Crash-Test (Abschnitt 6.3).

### 4.3 Kontextmenü

**Bestätigt: bewusst nicht Teil dieses Umfangs**, wie in Abschnitt 2 Punkt 4 und
Abschnitt 7 der Anforderung bereits festgelegt. Kein Code hierfür in diesem Plan.

### 4.4 Icon-Wahl

**Entscheidung: Material Symbols `add_column_left`/`add_column_right`** (Apache
License 2.0), siehe Abschnitt 5.2 für exakte Pfaddaten und Bezugsquelle. Begründung:
passgenau benannte, für exakt diesen Anwendungsfall bestimmte Glyphen verfügbar,
konsistent mit der bereits für „Fett"/Ausrichtung getroffenen Icon-Strategie
(kleine, lizenzkonforme, inline-SVGs statt Unicode/Emoji).

---

## 5. Dateigenauer Umsetzungsplan

### 5.1 `src/formats/shared/editor/commands.ts` (geändert)

Neuer Import und zwei neue, dünne Re-Exports direkt neben dem bestehenden
`export { isInTable }` (Zeile 6) — bewusst **keine** Neuimplementierung, siehe
Abschnitt 0/3.1 (Bibliotheksfunktionen bereits vollständig korrekt für alle
geforderten Verhaltensweisen):

```ts
import type { Command, EditorState } from 'prosemirror-state'
import { wrapInList, liftListItem } from 'prosemirror-schema-list'
import { isInTable, addColumnBefore, addColumnAfter } from 'prosemirror-tables'
import { wordSchema } from '../schema'

export { isInTable }

/**
 * Insert a new, empty column immediately to the left of the column containing
 * the current selection (or, for a `CellSelection` spanning several columns,
 * immediately to the left of the selection's bounding rectangle — exactly one
 * column regardless of selection width, a deliberate v1 scope decision, see
 * spalte-einfuegen-code.md Abschnitt 4.1).
 *
 * Thin, intentionally un-wrapped re-export of prosemirror-tables' own
 * `addColumnBefore`: already handles colspan/rowspan at the insertion boundary
 * correctly (grows an existing merge instead of splitting it, per row,
 * independently), already resolves to the innermost enclosing table for
 * nested tables, and already dispatches exactly one transaction (single undo
 * step) — verified by execution, not just source reading, see Abschnitt 3.
 */
export const insertColumnBefore: Command = addColumnBefore

/** Symmetric counterpart of {@link insertColumnBefore}; inserts to the right. */
export const insertColumnAfter: Command = addColumnAfter
```

Keine Änderung an `insertTable`, `setAlign`, `setHeading` oder sonstigen bestehenden
Exporten dieser Datei.

### 5.2 `src/formats/shared/editor/Toolbar.tsx` (geändert)

**Import-Zeile (1–17) erweitern:**

```tsx
import {
  applyMarkColor,
  clearMarkColor,
  insertColumnAfter,
  insertColumnBefore,
  insertImage,
  insertTable,
  isAlignActive,
  isInTable,
  liftFromList,
  setAlign,
  setHeading,
  toggleList,
  type Align,
} from './commands'
import type { Command } from 'prosemirror-state'
```

**Neue Komponente** (direkt nach `AlignButton`, Zeile 84, einfügen) — folgt bewusst
**nicht** dem `onMouseDown`-only-Muster des bestehenden `AlignButton`/`MarkButton`
(dort in `fett-code.md` Abschnitt 2.1 bzw. `ausrichtung-links-code.md` Abschnitt 3.9
als Tastatur-Zugänglichkeitsfehler identifiziert und dort nachträglich auf
`onClick` für die Aktion umgestellt) — die neuen Buttons werden **von Anfang an**
korrekt gebaut, mit `onClick` für die Aktion und `onMouseDown` ausschließlich für
`preventDefault()` (verhindert Fokus-/Selektionsverlust vor dem Klick), damit Tab +
Enter/Leertaste sie zuverlässig auslöst (Abschnitt 2 Punkt 5 der Anforderung):

```tsx
function ColumnButton({
  view,
  command,
  title,
  icon,
}: {
  view: EditorView
  command: Command
  title: string
  icon: React.ReactNode
}) {
  const disabled = !isInTable(view.state)
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => run(view, command)}
      className="px-2 py-1 rounded text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent dark:disabled:hover:bg-transparent"
    >
      {icon}
    </button>
  )
}

function AddColumnLeftIcon() {
  return (
    <svg viewBox="0 -960 960 960" width="16" height="16" aria-hidden="true" focusable="false" fill="currentColor">
      <path d="M820-180v-600H551v600h269Zm-660 60v-150h60v90h271v-600H220v90h-60v-150h720v720H160Zm331-360Zm60 0h-60 60Zm0 0ZM160-370v-80H80v-60h80v-80h60v80h80v60h-80v80h-60Z" />
    </svg>
  )
}

function AddColumnRightIcon() {
  return (
    <svg viewBox="0 -960 960 960" width="16" height="16" aria-hidden="true" focusable="false" fill="currentColor">
      <path d="M140-780v600h269v-600H140ZM80-120v-720h720v150h-60v-90H469v600h271v-90h60v150H80Zm389-360Zm-60 0h60-60Zm0 0Zm331 110v-80h-80v-60h80v-80h60v80h80v60h-80v80h-60Z" />
    </svg>
  )
}
```

(Pfaddaten aus Googles **Material Symbols** [outlined-Variante,
`@material-symbols/svg-400`], Icons `add_column_left`/`add_column_right`,
Apache License 2.0 — bezogen über
`unpkg.com/@material-symbols/svg-400/outlined/add_column_left.svg` bzw.
`.../add_column_right.svg`. Beide unterscheiden sich strukturell voneinander
[gespiegelte Anordnung des hervorgehobenen Spaltenblocks], nicht nur durch
CSS-Farbe — erfüllt Abschnitt 2 Punkt 2 der Anforderung.)

**Aufrufstelle:** direkt nach dem bestehenden „Tabelle einfügen"-Button einfügen
(nach Zeile 239, vor dem `<label>` für den Bild-Upload, Zeile 241):

```tsx
      <button
        type="button"
        title="Tabelle einfügen"
        aria-pressed={isInTable(view.state)}
        onMouseDown={(e) => {
          e.preventDefault()
          run(view, insertTable(2, 2))
        }}
        className="px-2 py-1 rounded text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
      >
        ⊞ Tabelle
      </button>

      <ColumnButton
        view={view}
        command={insertColumnBefore}
        title="Spalte links einfügen"
        icon={<AddColumnLeftIcon />}
      />
      <ColumnButton
        view={view}
        command={insertColumnAfter}
        title="Spalte rechts einfügen"
        icon={<AddColumnRightIcon />}
      />

      <label className="px-2 py-1 rounded text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 cursor-pointer">
        🖼 Bild
        ...
```

Bestehender „⊞ Tabelle"-Button (Zeile 228–239) bleibt unverändert (inkl. des in
Abschnitt 2 dieses Plans vermerkten, aber nicht zu diesem Umfang gehörenden
`aria-pressed`-Sonderfalls).

### 5.3 `src/formats/shared/editor/WordEditor.tsx` (keine Änderung)

Keymap (Zeile 71–79), Plugin-Liste (Zeile 69–86) bleiben unverändert. Die
Anforderung selbst sieht (Abschnitt 2 Punkt 5) **keine** Tastenkombination für dieses
Feature vor — bestätigt, kein Fix nötig. `columnResizing()`/`tableEditing()`
(Zeile 81–82) bleiben aktiv und ausreichend (Abschnitt 2 dieses Plans).

### 5.4 `src/formats/shared/schema.ts` (keine Änderung)

`tableNodes({ tableGroup: 'block', cellContent: 'block+', cellAttributes: {} })`
(Zeile 106) liefert bereits `colspan`/`rowspan`/`colwidth` auf `table_cell` — keine
Schema-Änderung für dieses Feature nötig, bestätigt durch Abschnitt 2/Abschnitt 0.

### 5.5 `src/formats/odt/writer.ts` (geändert — Pflicht-Fix laut Abschnitt 6 der Anforderung)

`colCount`-Berechnung im `case 'table'`-Zweig (Zeile 88) von reiner Zellenzahl auf
Colspan-Summe umstellen, exakt analog zum bereits korrekten DOCX-Writer
(`docx/writer.ts:130`):

```ts
case 'table': {
  const rows = node.content ?? []
  const colCount =
    (rows[0]?.content ?? []).reduce((sum, c) => sum + Number(c.attrs?.colspan ?? 1), 0) || 1
  const columns = Array.from({ length: colCount }, () => '<table:table-column/>').join('')
  // ... Rest der Funktion (Zeile 90–110) unverändert ...
```

Keine weitere Änderung an dieser Datei nötig — `table:number-columns-spanned`/
`-rows-spanned` (Zeile 96–98) sind bereits korrekt.

### 5.6 `src/formats/docx/writer.ts` (keine Änderung)

`tableToDocx` (Zeile 128–171) ist bereits korrekt (Abschnitt 2). Kein Fix nötig.

### 5.7 `src/formats/docx/reader.ts` / `src/formats/odt/reader.ts` (keine Änderung)

`colwidth: null` (Zeile 244 bzw. 197) bleibt bestehen — Spaltenbreiten-Rundreise ist
laut Abschnitt 7 der Anforderung explizit **außerhalb** dieses Scopes. Beide Reader
lesen `colspan`/`rowspan` bereits korrekt (bestätigt, Abschnitt 2); eine neu
eingefügte Spalte fügt sich beim nächsten Export nahtlos in die bestehende
`colCount`-Berechnung ein (nach Fix 5.5 für ODT, bereits korrekt für DOCX) — kein
Sonderfall für „importierte, dann um eine Spalte erweiterte" Tabellen nötig.

### 5.8 `src/index.css` (keine Änderung)

Bestehende `table`/`td`/`th`-Regeln (Zeile 44–61) reichen aus (Abschnitt 3.4/3.5/
Entscheidung 4.2). Keine `table-layout: fixed`- oder `overflow-x`-Ergänzung in
diesem Plan.

---

## 6. Testplan

### 6.1 Neu: `src/formats/shared/editor/__tests__/commands.test.ts`

Einzige Ebene, die Grenzfall 4.2/4.4/4.5 sowie die Undo-Gruppierung tatsächlich gegen
den Befehl selbst (nicht nur gegen Reader/Writer) prüfen kann — kein bestehendes
Muster für ProseMirror-Command-Tests im Projekt vorhanden (Abschnitt 1), neu
etabliert nach dem Muster aus `ausrichtung-links-code.md` Abschnitt 6.1 (echte
`EditorView` + `jsdom`, `dispatchTransaction` ruft `view.updateState(view.state.apply(tr))`):

```ts
import { EditorState, TextSelection } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { history, undo } from 'prosemirror-history'
import { CellSelection, cellAround } from 'prosemirror-tables'
import { wordSchema } from '../../schema'
import { insertColumnBefore, insertColumnAfter, isInTable } from '../commands'

function cell(text = '', attrs: Record<string, unknown> = {}) {
  return {
    type: 'table_cell',
    attrs: { colspan: 1, rowspan: 1, colwidth: null, ...attrs },
    content: [{ type: 'paragraph', attrs: { align: 'left' }, content: text ? [{ type: 'text', text }] : [] }],
  }
}

function makeView(json: unknown) {
  const doc = wordSchema.nodeFromJSON(json)
  const state = EditorState.create({ doc, schema: wordSchema, plugins: [history()] })
  const view = new EditorView(document.createElement('div'), {
    state,
    dispatchTransaction(tr) {
      view.updateState(view.state.apply(tr))
    },
  })
  return view
}

function selectText(view: EditorView, text: string) {
  let pos = -1
  view.state.doc.descendants((node, p) => {
    if (node.isText && node.text === text) pos = p
  })
  view.dispatch(view.state.tr.setSelection(TextSelection.near(view.state.doc.resolve(pos))))
}
```

Testfälle:

1. **Grundverhalten 3.1/3.2:** 2×2-Tabelle, Cursor in Zelle 2 von Zeile 1,
   `insertColumnAfter` → 3 Spalten, neue Zelle leer und an Position 3, Original-Inhalt
   beider Zeilen unverändert an Position 1/2. Analog `insertColumnBefore` von
   Zelle 1 aus → neue erste Spalte, Originalinhalt bleibt in Spalte 2/3.
2. **Grenzfall 4.1 (1-spaltige Tabelle):** 1×2-Tabelle, `insertColumnBefore`/`-After`
   → 2×2-Tabelle, ursprünglicher Inhalt vollständig in der jeweils anderen Spalte.
3. **Grenzfall 4.2 (gemischte Merges):** exakt der in Abschnitt 3.2 dieses Plans
   gezeigte Aufbau/Ablauf, Assertions auf `colspan`-Array `[1,3]` für Zeile 1 und
   Zellinhalt-Array `['A2','B2','','C2']` für Zeile 2.
4. **Grenzfall 4.4 (Mehrfachauswahl):** `CellSelection` via `cellAround` über 2 von
   3 Spalten, `insertColumnAfter` → Spaltenzahl wächst um **genau 1** (nicht 2) —
   dokumentiert die Entscheidung aus Abschnitt 4.1 als Regressionstest.
5. **Grenzfall 4.5 (verschachtelte Tabelle):** äußere 1×2-Tabelle mit innerer
   1×2-Tabelle in Zelle 1, Cursor in der inneren Tabelle, `insertColumnAfter` →
   äußere Zeile bleibt bei 2 Zellen, innere Zeile wächst auf 3.
6. **Undo (Abschnitt 3.8):** ein `insertColumnAfter`-Aufruf, ein `undo()` →
   Zeilen-/Zellstruktur (inkl. `colspan`) exakt wie vor dem Insert.
7. **Deaktiviert außerhalb einer Tabelle (Abschnitt 2 Punkt 3):** Dokument ohne
   Tabelle, Cursor im Absatz, `isInTable(view.state)` → `false`; `insertColumnBefore(view.state, view.dispatch)`
   → gibt `false` zurück, **kein** Dispatch, Dokument unverändert.
8. **`table_header`-Absicherung (Zusatzfund Abschnitt 2):** Testfall, der
   verifiziert, dass eine über `insertTable`/Reader erzeugte Tabelle ausschließlich
   `table_cell`-Knoten enthält und ein Insert daher niemals einen `table_header`
   erzeugt (Regressionsschutz, falls künftig Kopfzeilen-Support ergänzt wird).
9. **Grenzfall 4.11 (mehrabsätzige Zelle):** Zelle mit zwei `paragraph`-Kindern an
   der Einfügeposition → Inhalt bleibt nach Insert vollständig und unverändert
   (beide Absätze, unveränderte Reihenfolge).

### 6.2 Geändert: `src/formats/odt/__tests__/roundtrip.test.ts`

Neue Testfälle im bestehenden `describe('ODT round trip: tables', ...)`-Block
(nach Zeile 208), gemäß Abschnitt 6 Testfall 1/2 der Anforderung — prüft die raw
`content.xml` (nicht nur das re-importierte JSON), analog zum bereits vorhandenen
Muster in `docx/__tests__/roundtrip.test.ts` (dort wird `writeDocx` bereits separat
von `readDocx` aufgerufen, hier wird das für `writeOdt` ergänzt):

```ts
it('exports exactly as many <table:table-column> as the colspan-weighted column count (Abschnitt 6 Testfall 1)', async () => {
  const original = doc([
    {
      type: 'table',
      content: [
        {
          type: 'table_row',
          content: [
            { type: 'table_cell', attrs: { colspan: 2, rowspan: 1 }, content: [paragraph('Merged')] },
            { type: 'table_cell', attrs: { colspan: 1, rowspan: 1 }, content: [paragraph('C')] },
          ],
        },
      ],
    },
  ])
  const blob = await writeOdt(original)
  const zip = await JSZip.loadAsync(blob)
  const contentXml = await zip.file('content.xml')!.async('text')
  const columnCount = (contentXml.match(/<table:table-column\/>/g) ?? []).length
  expect(columnCount).toBe(3) // 2 (Merge) + 1, NICHT 2 (rohe Zellenzahl) — deckt den Fehler aus Abschnitt 0/6 unmittelbar auf
})

it('column count grows correctly after an additional column is present (Abschnitt 6 Testfall 2)', async () => {
  const original = doc([
    {
      type: 'table',
      content: [
        {
          type: 'table_row',
          content: [
            { type: 'table_cell', attrs: { colspan: 2, rowspan: 1 }, content: [paragraph('Merged')] },
            { type: 'table_cell', attrs: { colspan: 1, rowspan: 1 }, content: [paragraph('C')] },
            { type: 'table_cell', attrs: { colspan: 1, rowspan: 1 }, content: [] }, // simuliert die neu eingefügte Spalte
          ],
        },
      ],
    },
  ])
  const blob = await writeOdt(original)
  const zip = await JSZip.loadAsync(blob)
  const contentXml = await zip.file('content.xml')!.async('text')
  const columnCount = (contentXml.match(/<table:table-column\/>/g) ?? []).length
  expect(columnCount).toBe(4)
})
```

(Benötigt `import JSZip from 'jszip'` und `import { writeOdt } from '../writer'` am
Dateikopf, falls dort noch nicht vorhanden — zu prüfen und ggf. zu ergänzen.)

### 6.3 Geändert: `src/formats/docx/__tests__/roundtrip.test.ts`

Ein neuer, rein regressionssichernder Test (DOCX-Writer ist bereits korrekt, siehe
Abschnitt 2) im bestehenden `describe('DOCX round trip: tables', ...)`-Block, analog
zu 6.2, damit beide Formate symmetrisch gegen genau dieselbe Fehlerklasse abgesichert
sind (Abschnitt 5.1.1 der Anforderung, „mit einem unabhängigen Parser verifizieren"):

```ts
it('exports exactly as many <w:gridCol> as the colspan-weighted column count', async () => {
  const original = doc([
    {
      type: 'table',
      content: [
        {
          type: 'table_row',
          content: [
            { type: 'table_cell', attrs: { colspan: 2, rowspan: 1 }, content: [paragraph('Merged')] },
            { type: 'table_cell', attrs: { colspan: 1, rowspan: 1 }, content: [paragraph('C')] },
          ],
        },
      ],
    },
  ])
  const blob = await writeDocx(original)
  const zip = await JSZip.loadAsync(blob)
  const documentXml = await zip.file('word/document.xml')!.async('text')
  const columnCount = (documentXml.match(/<w:gridCol /g) ?? []).length
  expect(columnCount).toBe(3)
})
```

(Benötigt `import JSZip from 'jszip'` am Dateikopf.)

### 6.4 Neu: `tests/e2e/tables.spec.ts`

Playwright-E2E gemäß Abschnitt 8 der Anforderung — Verifikationsauftrag verlangt
echte Browser-Bedienung, nicht nur Unit-Tests. Struktur/Konventionen aus
`tests/e2e/selection-regression.spec.ts` (`odtCard`-Helper, `getByRole('button', ...)`)
übernommen:

```ts
import { test, expect } from '@playwright/test'

function odtCard(page: import('@playwright/test').Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'OpenDocument Text (.odt)' }) })
}

test.describe('Spalte einfügen (links/rechts)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  })

  test('buttons are disabled outside a table and enabled once the cursor is inside one', async ({ page }) => {
    const left = page.getByRole('button', { name: 'Spalte links einfügen' })
    const right = page.getByRole('button', { name: 'Spalte rechts einfügen' })
    await expect(left).toBeVisible()
    await expect(right).toBeVisible()
    await expect(left).toBeDisabled()
    await expect(right).toBeDisabled()

    await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
    await page.locator('.ProseMirror td').first().click()
    await expect(left).toBeEnabled()
    await expect(right).toBeEnabled()
  })

  test('inserts a column to the right of the current cell, preserving existing content (Abschnitt 3.1/3.2)', async ({ page }) => {
    await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
    const cells = page.locator('.ProseMirror td')
    await cells.nth(0).click()
    await page.keyboard.type('A1')
    await cells.nth(1).click()
    await page.keyboard.type('B1')
    await cells.nth(2).click()
    await page.keyboard.type('A2')
    await cells.nth(3).click()
    await page.keyboard.type('B2')

    await cells.nth(1).click() // B1
    await page.getByRole('button', { name: 'Spalte rechts einfügen' }).click()

    await expect(page.locator('.ProseMirror tr').first().locator('td')).toHaveCount(3)
    await expect(page.locator('.ProseMirror tr').nth(1).locator('td')).toHaveCount(3)
    await expect(page.locator('.ProseMirror td').nth(0)).toContainText('A1')
    await expect(page.locator('.ProseMirror td').nth(1)).toContainText('B1')
    await expect(page.locator('.ProseMirror td').nth(2)).toHaveText('')
    // neue Zelle ist sofort tippbar (Abschnitt 3.5)
    await page.locator('.ProseMirror td').nth(2).click()
    await page.keyboard.type('Neu')
    await expect(page.locator('.ProseMirror td').nth(2)).toContainText('Neu')
  })

  test('inserts a column to the left of the first column (Grenzfall 4.3)', async ({ page }) => {
    await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
    const cells = page.locator('.ProseMirror td')
    await cells.nth(0).click()
    await page.getByRole('button', { name: 'Spalte links einfügen' }).click()
    await expect(page.locator('.ProseMirror tr').first().locator('td')).toHaveCount(3)
  })

  test('undo restores the table exactly, redo re-applies the new column (Abschnitt 3.8)', async ({ page }) => {
    await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
    await page.locator('.ProseMirror td').first().click()
    await page.getByRole('button', { name: 'Spalte rechts einfügen' }).click()
    await expect(page.locator('.ProseMirror tr').first().locator('td')).toHaveCount(3)

    await page.locator('.ProseMirror').click()
    await page.keyboard.press('ControlOrMeta+z')
    await expect(page.locator('.ProseMirror tr').first().locator('td')).toHaveCount(2)

    await page.keyboard.press('ControlOrMeta+y')
    await expect(page.locator('.ProseMirror tr').first().locator('td')).toHaveCount(3)
  })

  test('a multi-column CellSelection inserts exactly one column, not one per selected column (Grenzfall 4.4, Entscheidung Abschnitt 4.1)', async ({ page }) => {
    await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
    // 2x2 aus "Tabelle einfügen" reicht für einen 2-Spalten-Auswahltest über beide Spalten
    const cells = page.locator('.ProseMirror td')
    await cells.nth(0).hover()
    await page.mouse.down()
    await cells.nth(1).hover()
    await page.mouse.up()
    await page.getByRole('button', { name: 'Spalte rechts einfügen' }).click()
    await expect(page.locator('.ProseMirror tr').first().locator('td')).toHaveCount(3) // nicht 4
  })

  test('nested table: inserting a column in the inner table leaves the outer table untouched (Grenzfall 4.5)', async ({ page }) => {
    await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
    await page.locator('.ProseMirror td').first().click()
    await page.getByRole('button', { name: 'Tabelle einfügen' }).click() // verschachtelt in Zelle 1 der äußeren Tabelle
    const innerCells = page.locator('.ProseMirror td td')
    await innerCells.first().click()
    await page.getByRole('button', { name: 'Spalte rechts einfügen' }).click()

    await expect(page.locator('.ProseMirror > * table').first().locator('> tbody > tr').first().locator('> td')).toHaveCount(2)
    await expect(innerCells.locator('..')).toHaveCount(3)
  })

  test('does not crash or hang after repeatedly inserting columns (Grenzfall 4.7)', async ({ page }) => {
    await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
    await page.locator('.ProseMirror td').first().click()
    for (let i = 0; i < 10; i++) {
      await page.getByRole('button', { name: 'Spalte rechts einfügen' }).click()
    }
    await expect(page.locator('.ProseMirror tr').first().locator('td')).toHaveCount(12)
    await page.locator('.ProseMirror td').first().click()
    await page.keyboard.type('noch bedienbar')
    await expect(page.locator('.ProseMirror').first()).toContainText('noch bedienbar')
  })
})
```

(Der Selektor für den „verschachtelte Tabelle"-Test ist bewusst konservativ
formuliert und muss beim Implementieren gegen das tatsächliche DOM verifiziert
werden — verschachtelte `<table>`-Selektoren sind erfahrungsgemäß fragil; ggf. über
`page.evaluate` mit direkter DOM-Traversierung robuster lösen.)

### 6.5 Geändert: `tests/e2e/selection-regression.spec.ts` — Pflicht-Regressionstest (Grenzfall 4.10, Abnahmekriterium 7)

Neuer Test im bestehenden `describe`-Block (nach Zeile 50), exakt das in Abschnitt
3.7/Grenzfall 4.10 der Anforderung geforderte Szenario „Spalte einfügen → Klick in
andere Zelle → Enter → weitertippen":

```ts
test('column insert followed by click-to-reposition + Enter + typing does not corrupt table content (Grenzfall 4.10)', async ({ page }) => {
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
  const cells = page.locator('.ProseMirror td')
  await cells.nth(0).click()
  await page.keyboard.type('Zelle A1')
  await cells.nth(3).click()
  await page.keyboard.type('Zelle B2')

  await cells.nth(0).click()
  await page.getByRole('button', { name: 'Spalte rechts einfügen' }).click()

  await page.locator('.ProseMirror td').nth(3).click() // andere Zelle nach dem Insert
  await page.keyboard.press('End')
  await page.keyboard.type(' weiter')

  await expect(editor).toContainText('Zelle A1')
  await expect(editor).toContainText('Zelle B2 weiter')
})
```

### 6.6 Roundtrip-E2E-Erweiterungen (Abschnitt 5 der Anforderung)

`tests/e2e/docx.spec.ts`/`odt.spec.ts` je um einen Test erweitert, der: Tabelle im
Editor erzeugen → Inhalt eintippen → Spalte einfügen → exportieren (echter
Download, wie im bestehenden Muster Zeile 55–68 in `odt.spec.ts`) →
heruntergeladene Datei mit `JSZip` öffnen → für DOCX: `<w:gridCol>`-Anzahl und
`<w:tc>`-Anzahl pro `<w:tr>` prüfen; für ODT: `<table:table-column>`-Anzahl prüfen
→ Blob erneut über einen zweiten Browser-Kontext hochladen (Re-Import) →
Zellinhalte im Editor prüfen. Deckt Abschnitt 5.1.1/5.2.1 der Anforderung
(„echte Datei-Uploads/Downloads, nicht nur intern aufgerufene Reader/Writer-
Funktionen", Abnahmekriterium 6) vollständig ab.

---

## 7. Abnahmekriterien-Mapping (Bezug zu Abschnitt 10 der Anforderung)

| # | Abnahmekriterium laut Anforderung | Abgedeckt durch |
|---|---|---|
| 1 | Beide Buttons existieren, Playwright-bedienbar, außerhalb Tabelle deaktiviert | 5.2 (Buttons + `disabled`), 6.4 Test 1 |
| 2 | Grundverhalten 3.1/3.2 per E2E nachgewiesen | 6.4 Test 2/3 |
| 3 | Merge-Verhalten (3.4/4.2) mit konkretem Testfall belegt | 6.1 Test 3 (Unit, exakte Werte), zusätzlich in 6.4 empfehlenswert als E2E-Ergänzung |
| 4 | Mehrfachauswahl-Abweichung (3.3/4.4) entschieden, nicht offengelassen | Entscheidung 4.1, Test 6.1 Test 4 + 6.4 Test 5 |
| 5 | ODT-`colCount`-Fix umgesetzt, testabgesichert, regressionssicher | 5.5 (Fix), 6.2 (Tests) |
| 6 | Rundreise-Tests 5.1/5.2 mit echten Datei-Uploads/Downloads bestanden | 6.6 |
| 7 | Selection-Sync-Regressionstest mit „Spalte einfügen" als Auslöser | 6.5 |
| 8 | Undo/Redo inkl. Merge-Wiederherstellung bestätigt | 6.1 Test 6 (Unit, inkl. Merge), 6.4 Test 4 (E2E) |
| 9 | Verschachtelte-Tabelle-Grenzfall (4.5) mit echtem Testfall geprüft | 6.1 Test 5 (Unit), 6.4 Test 6 (E2E) |
| 10 | Kein während der Verifikation gefundener Fehler bleibt ohne Ticket/Vermerk | Abschnitt 4.1 (Nachbesserungs-Ticket-Vermerk für Mehrfachauswahl-Word-Parität), Abschnitt 3.4 (Breiten-Präzisierung dokumentiert, kein Fix nötig), Abschnitt 2 (`aria-pressed`-Sonderfall am bestehenden Tabelle-Button vermerkt, bewusst nicht angefasst — außerhalb Scope) |

---

## 8. Zusammenfassung der Dateiliste

**Geändert:**
- `src/formats/shared/editor/commands.ts` — zwei neue Re-Exports (5.1)
- `src/formats/shared/editor/Toolbar.tsx` — zwei neue Buttons + Icons + Import (5.2)
- `src/formats/odt/writer.ts` — `colCount`-Bugfix (5.5)
- `src/formats/odt/__tests__/roundtrip.test.ts` — 2 neue Tests (6.2)
- `src/formats/docx/__tests__/roundtrip.test.ts` — 1 neuer Regressionstest (6.3)
- `tests/e2e/selection-regression.spec.ts` — 1 neuer Pflicht-Regressionstest (6.5)
- `tests/e2e/docx.spec.ts`, `tests/e2e/odt.spec.ts` — je 1 neuer Rundreise-Test (6.6)

**Neu angelegt:**
- `src/formats/shared/editor/__tests__/commands.test.ts` (6.1)
- `tests/e2e/tables.spec.ts` (6.4)

**Bewusst unverändert (mit Begründung im Plan):**
- `src/formats/shared/schema.ts` (5.4)
- `src/formats/shared/editor/WordEditor.tsx` (5.3)
- `src/formats/docx/writer.ts` (5.6)
- `src/formats/docx/reader.ts`, `src/formats/odt/reader.ts` (5.7)
- `src/index.css` (5.8)
