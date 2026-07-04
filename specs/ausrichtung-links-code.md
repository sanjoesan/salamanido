# Umsetzungsplan: Feature „Ausrichtung links" — Code-Abgleich und geplante Änderungen

Rolle: Entwickler-Antwort auf `specs/ausrichtung-links-req.md`. Dieses Dokument prüft
den **tatsächlichen** Code-Stand (nicht nur die in der Anforderung zitierten
Zeilenangaben) gegen jede Behauptung der Spezifikation, führt zusätzlich **ausführbare**
Reproduktionen einzelner Grenzfälle durch (nicht nur Codelektüre — siehe Methodik unten)
und legt fest, welche Dateien wie geändert bzw. neu angelegt werden. Stil orientiert an
`FEATURE-SPEC-DOCX-ODT.md`, `specs/fett-code.md` und `specs/unterstrichen-einfach-code.md`.
Kein Punkt hier ist bereits umgesetzt — dies ist der Plan, nicht der Vollzug.

---

## 0. Kurzfassung

Die in `ausrichtung-links-req.md` zitierten Fundstellen sind **fast überall exakt**
(siehe Abschnitt 1). Die eigentliche Prüfung deckt aber einen **schwerwiegenden, in der
Anforderung nicht benannten Fehler** auf, der den zentralen, in Abschnitt 1/3.2 der
Anforderung beschriebenen Anwendungsfall komplett bricht:

1. **KRITISCH — `setAlign` wirft eine Exception und bricht ab, sobald die Selektion
   mehr als einen alignierbaren Block (Absatz/Überschrift) umfasst.** Verifiziert
   nicht nur durch Codelektüre, sondern durch **tatsächliche Ausführung** des
   Produktivcodes (`commands.ts`, `schema.ts`) gegen eine echte `EditorView` mit
   `jsdom` (siehe Abschnitt 2 für Reproduktionsschritte und Fehlermeldung). Das
   betrifft exakt den in Abschnitt 3.2 der Anforderung als „Ziel" beschriebenen
   Kernfall („Selektion über mehrere Absätze/Überschriften hinweg") sowie Testfall 4,
   Grenzfall 4.4, Testfall 13 (Strg+A über ein mehrabsätziges Dokument) und — indirekt
   — Grenzfall 4.14 (Selection-Sync-Regression mit „Links" als Auslöser). Kein
   bestehender Test (weder Unit- noch E2E-Test) deckt diesen Fall ab, weil alle
   vorhandenen Tests Ausrichtung nur an **einem einzigen** Absatz/einer einzigen
   Überschrift prüfen (Reader/Writer isoliert) bzw. den `setAlign`-Befehl nie über
   mehr als einen Block hinweg aufrufen.
2. **Tabellen-Zellauswahl (Grenzfall 4.8): tatsächliches Verhalten ist das
   Gegenteil der in der Anforderung geäußerten Vermutung.** Verifiziert durch
   ausführbare Reproduktion gegen `prosemirror-tables`: `state.selection.from`/`.to`
   kollabiert bei einer `CellSelection` auf **nur die zuletzt beim Ziehen berührte
   Zelle** (nicht auf die gesamte Selektionsfläche) — „Links" auf eine 3×3-Tabelle
   mit nur der mittleren Spalte markiert wirkt daher nicht (wie vermutet) versehentlich
   auf Spalten 1/3, sondern **unvollständig nur auf eine der drei markierten
   Zellen der mittleren Spalte** — die anderen zwei bleiben unverändert stehen.
3. **DOCX-Reader ignoriert Ausrichtung, die nur auf Formatvorlagen-Ebene
   (`w:pStyle`/`w:basedOn`) deklariert ist**, nicht direkt im Absatz (`w:pPr/w:jc`).
   Mit einer echten Fremddatei aus dem Testkorpus nachgestellt (`bug-paragraph-alignment.docx`
   — der Dateiname deutet bereits darauf hin, dass diese Datei exakt zu diesem Zweck
   existiert): ein per Formatvorlage zentrierter Absatz ohne eigenes `w:jc` wird
   fälschlich als „links" importiert.
4. **DOCX-Reader bildet `w:jc="end"` auf „links" statt auf „rechts" ab** (nicht nur
   `"start"`, wie die Anforderung in Grenzfall 4.11 nur für `distribute` andeutet) —
   `JC_TO_ALIGN` kennt weder `start` noch `end`, beide fallen über denselben
   `?? 'left'`-Fallback, wodurch aus rechtsbündigem Text stillschweigend linksbündiger
   wird. Das ist eine inhaltsverändernde Fehlinterpretation, kein reines
   Rundreise-Detail.
5. **ODT-Reader normalisiert `fo:text-align` überhaupt nicht** (bestätigt exakt wie
   in der Anforderung beschrieben) — mit mehreren echten Fremddateien aus dem
   ODF-Toolkit-Korpus belegt (`EasyList.odt`, `FruitDepot-SeasonalFruits4.odt` u. a.,
   siehe Abschnitt 1).
6. **Formatvorlagen-Wechsel (`setHeading`) setzt Ausrichtung hart auf `'left'`** —
   bestätigt exakt wie in der Anforderung beschrieben (Grenzfall 4.9). Dieser Plan
   trifft die in Abnahmekriterium 4 geforderte Entscheidung: **das ist ein zu
   behebender Fehler**, kein gewolltes Verhalten (Begründung in Abschnitt 7).
7. **Fehlende Tastenkombinationen und `aria-label`** — bestätigt exakt wie in der
   Anforderung beschrieben; dieser Plan trifft auch hier die in Abnahmekriterium 7
   geforderte Entscheidung (Abschnitt 7): beides wird nachgerüstet, nicht offen gelassen.
8. **`AlignButton` ist wie `MarkButton` (siehe `fett-code.md` Fehler 1) nur per
   Maus, nicht per Tastatur (Tab + Enter/Space) auslösbar** — derselbe Bug-Pfad wie
   in `fett-code.md` Abschnitt 2.1 bereits für Fett/Kursiv/Unterstrichen/
   Durchgestrichen gefunden, hier zusätzlich für alle vier Ausrichtungs-Buttons
   bestätigt (gleicher Komponenten-Code, `Toolbar.tsx`).

Alle acht Punkte sind unten mit Fundstelle, Reproduktionsschritten und konkretem Fix
belegt. Da alle vier Ausrichtungen (`links/zentriert/rechts/blocksatz`) über exakt
denselben Code laufen (`setAlign`/`isAlignActive`/`setHeading`, dieselbe
Schema-Attribut-Definition, dieselben DOCX-/ODT-Mapping-Stellen), **beheben die
Fixes in diesem Plan alle vier Ausrichtungs-Anforderungen gleichzeitig** — das ist
kein Bug, der nur „links" betrifft, sondern die gemeinsame Grundlage aller vier
Backlog-Einträge aus Abschnitt 1 der Anforderung.

---

## 1. Methodik

Neben Codelektüre aller in der Anforderungstabelle genannten Dateien wurden zur
Verifikation der als „zu prüfen" markierten Punkte **ausführbare Reproduktionen**
gegen den echten Produktivcode erstellt (nicht Teil des Repos, nur zur Verifikation
in dieser Prüfung verwendet, mit `jiti` direkt gegen `src/formats/shared/editor/commands.ts`
und `src/formats/shared/schema.ts` sowie den echten `prosemirror-*`-Paketen aus
`node_modules` ausgeführt):

- Ein `EditorView` mit derselben `dispatchTransaction`-Verdrahtung wie
  `WordEditor.tsx` (Zeile 91–98) gegen ein Zwei-Absatz-Dokument, Selektion über
  beide Absätze, `setAlign('left')` aufgerufen — reproduziert Fehler 1 exakt
  (`RangeError: Applying a mismatched transaction`).
- Eine `CellSelection` (aus `prosemirror-tables`) über die mittlere Spalte einer
  3×3-Tabelle konstruiert, `state.selection.from`/`.to` sowie
  `doc.nodesBetween(from, to)` ausgewertet und mit `CellSelection.forEachCell`
  (der von `prosemirror-tables` selbst für `setCellAttr` verwendeten, korrekten
  Iteration) verglichen — reproduziert Fehler 2.
- Alle 330 ODT- und ~50 DOCX-Fixtures unter `tests/fixtures/external/` per Skript
  auf `fo:text-align`- bzw. `w:jc`-Werte durchsucht, um reale (nicht selbst
  konstruierte) Belegdateien für die Grenzfälle 4.10–4.12 zu identifizieren
  (Ergebnisse in Abschnitt 3).

Zusätzlich wurden `FEATURE-BACKLOG.md` Abschnitt 2.3 und `FEATURE-SPEC-DOCX-ODT.md`
Abschnitte 2, 4, 17 und 20 gegengelesen — alle in `ausrichtung-links-req.md` daraus
zitierten Aussagen sind wortgetreu bestätigt (Abschnitt 2 „Selection-Sync-Bug" Zeile
63–71, Abschnitt 4 Testfall 1 Zeile 119, Abschnitt 17 Zeile 357, Abschnitt 20 Punkt 1
Zeile 440–442).

---

## 2. Verifikation der Ist-Stand-Tabelle aus `ausrichtung-links-req.md`

| Fundstelle laut Anforderung | Ergebnis der Prüfung |
|---|---|
| `schema.ts:4` `alignAttr`, Default `'left'` | Bestätigt, Zeile exakt. |
| `schema.ts:14-16`/`:28-30` `toDOM` | Bestätigt, Zeilen exakt (`paragraph.toDOM` Zeile 14–16, `heading.toDOM` Zeile 28–30). |
| `schema.ts:13,26` `getAttrs`, Fallback `'left'` | Bestätigt, Zeilen exakt. **Zusätzlich gefunden:** Fallback ist `dom.style.textAlign \|\| 'left'` — ein per Paste eingefügtes `text-align: start`/`end` (z. B. aus Word-Web/Google-Docs-HTML) würde unverändert als `'start'`/`'end'` übernommen, **nicht** normalisiert. Gleiche Fehlerklasse wie Fehler 5 unten, siehe Abschnitt 5.5. |
| `commands.ts:13-27` `setAlign`, kein Toggle | Bestätigt, Zeilen exakt. **Aber:** siehe Fehler 1 — die Funktion ist nicht nur „reines Setzen ohne Toggle", sie ist bei mehr als einem betroffenen Block **nicht funktionsfähig**. |
| `commands.ts:29-38` `isAlignActive`, nur `$from` | Bestätigt, Zeilen exakt. |
| `Toolbar.tsx:64-84` `AlignButton`, `:185` Einbindung | Bestätigt, Zeilen exakt. `title="Ausrichtung: left"`, kein `aria-label` — bestätigt. **Zusätzlich gefunden:** nur `onMouseDown`, kein `onClick` — siehe Fehler 8. |
| Keine Tastenkombination | Bestätigt — `WordEditor.tsx` Zeile 71–79 enthält keinen `Mod-l`/`Mod-e`/`Mod-r`/`Mod-j`-Eintrag. |
| `docx/reader.ts:13` `JC_TO_ALIGN`, `:150-152` | Bestätigt, Zeilen exakt. **Zusätzlich gefunden:** siehe Fehler 4 (`end`→„links" statt „rechts") und Fehler 3 (Formatvorlagen-Ausrichtung ignoriert). |
| `docx/writer.ts:16` `JC_BY_ALIGN`, `:67-69`, `:100-104`/`:106-110` | Bestätigt, alle Zeilen exakt. |
| `odt/reader.ts:36-77`, `:126,173`, kein Mapping | Bestätigt, Zeilen exakt — mit vier realen Fremddateien konkret belegt (Abschnitt 3.3). |
| `odt/styleRegistry.ts:61-66,68-75,77-92` | Bestätigt, alle Zeilen exakt. |
| `commands.ts:40-55` `setHeading`, setzt `align:'left'` implizit | Bestätigt, Zeilen exakt. |
| `docx/__tests__/roundtrip.test.ts:41-45,48-53`, `odt/…` analog | Bestätigt, Zeilen exakt — beide testen nur Reader/Writer isoliert an genau **einem** Absatz/einer Überschrift pro Testfall, nie mehrere gleichzeitig über den `setAlign`-Befehl. Das ist exakt die Lücke, durch die Fehler 1 unentdeckt blieb. |
| Keine E2E-Tests für Ausrichtung | Bestätigt — kein Treffer für „align"/„Ausrichtung" in `tests/e2e/*.spec.ts`. |
| `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2 (Selection-Sync-Bug), Abschnitt 4 Testfall 1, Abschnitt 17 Zeile 4, Abschnitt 20.1 | Alle vier Zitate wortgetreu bestätigt (Datei liegt im Repo-Root, nicht unter `specs/`). |

Keine der in der Anforderung zitierten Zeilenangaben ist falsch — die Referenztabelle
der Anforderung ist zuverlässig. Die acht in Abschnitt 0 gelisteten Fehler liegen
**zusätzlich** zu den dort bereits als „zu verifizieren" markierten Punkten.

---

## 3. Gefundene Fehler (priorisiert, mit Reproduktion)

### 3.1 Fehler 1 (kritisch): `setAlign` crasht bei Selektion über mehrere Blöcke

**Datei:** `src/formats/shared/editor/commands.ts:13-27`.

```ts
export function setAlign(align: Align): Command {
  return (state, dispatch) => {
    const { from, to } = state.selection
    let applicable = false
    state.doc.nodesBetween(from, to, (node, pos) => {
      if (alignableTypes.has(node.type.name)) {
        applicable = true
        if (dispatch) {
          dispatch(state.tr.setNodeAttribute(pos, 'align', align))
        }
      }
    })
    return applicable
  }
}
```

**Ursache:** `dispatch()` wird **innerhalb** der `nodesBetween`-Schleife pro
gefundenem Block aufgerufen — bei zwei oder mehr Absätzen also **mehrfach**. Jeder
Aufruf baut die Transaktion aus `state.tr`, wobei `state` der beim Command-Aufruf
**einmalig** übergebene, unveränderliche Parameter ist (`EditorState.tr` ist ein
Getter, der laut `prosemirror-state`-Quelltext (`get tr() { return new
Transaction(this) }`) immer eine neue Transaktion **auf Basis desselben,
ursprünglichen Dokuments** liefert). `WordEditor.tsx`s `dispatchTransaction` (Zeile
91–98) ruft dagegen bei jedem Aufruf `view.state.apply(tr)` auf `view.state` auf —
und `view.state` wurde durch den **ersten** Dispatch bereits synchron aktualisiert
(`view.updateState(newState)`, Zeile 92–93). Beim **zweiten** Dispatch prüft
`EditorState.apply` intern `tr.before.eq(this.doc)` — das schlägt fehl, weil `tr`
(gebaut aus dem alten `state`) noch das **ursprüngliche** Dokument als „before"
trägt, `view.state.doc` aber bereits das nach dem ersten Dispatch veränderte
Dokument ist.

**Reproduktion (gegen den echten Code ausgeführt, nicht nur gelesen):**

```
Vorher:  [ 'center', 'center' ]   // Zwei-Absatz-Dokument, Selektion über beide
setAlign('left')(view.state, view.dispatch) aufgerufen
*** CRASHED *** RangeError: Applying a mismatched transaction
```

Der **erste** betroffene Absatz wird noch korrekt auf „links" gesetzt (der erste
Dispatch gelingt), der **zweite und jeder weitere** bleiben unverändert stehen, weil
die Exception die Schleife durchschlägt. Zusätzlich: `run()` in `Toolbar.tsx` ruft
nach `command(view.state, view.dispatch)` unbedingt `view.focus()` auf (Zeile 24–26)
— bei einer geworfenen Exception wird dieser Aufruf **nie erreicht**, der Fokus geht
zusätzlich verloren (verstärkt Grenzfall 4.15 in genau dem Szenario, in dem er
geprüft werden soll).

**Reichweite:** Betrifft **jede** Selektion, die zwei oder mehr alignierbare Blöcke
berührt — der in Abschnitt 3.2 der Anforderung als Kernszenario beschriebene Fall,
Testfall 4/Grenzfall 4.4 (gemischte Selektion), Testfall 13 (Strg+A über ein
mehrabsätziges Dokument — praktisch **jedes** reale Dokument mit mehr als einem
Absatz) sowie — da `AllSelection` (Strg+A) ebenfalls nur eine einzige `SelectionRange`
über das gesamte Dokument bildet — der alltäglichste denkbare Anwendungsfall
überhaupt: „Alles auswählen, linksbündig ausrichten" auf einem Dokument mit mehr als
einem Absatz. Das erklärt auch, warum das bisher nie auffiel: Jeder bestehende Test
(Unit wie E2E) prüft Ausrichtung ausschließlich an **einem** Absatz/einer
Überschrift; `setAlign` selbst wird in keinem Test mit mehr als einem passenden
Block aufgerufen.

**Fix:** `setAlign` so umbauen, dass **eine einzige** Transaktion akkumuliert und
**höchstens einmal** dispatcht wird — analog zu `toggleMark` aus
`prosemirror-commands`, das (verifiziert im dortigen Quelltext) grundsätzlich über
`state.selection.ranges` iteriert, nicht über `.from`/`.to`. Das behebt gleichzeitig
Fehler 2 (siehe unten) und die in Abschnitt 3.9 der Anforderung offene Frage zum
unnötigen Undo-Schritt bei einem no-op-Klick:

```ts
export function setAlign(align: Align): Command {
  return (state, dispatch) => {
    let applicable = false
    let tr = state.tr
    for (const range of state.selection.ranges) {
      state.doc.nodesBetween(range.$from.pos, range.$to.pos, (node, pos) => {
        if (alignableTypes.has(node.type.name)) {
          applicable = true
          if (node.attrs.align !== align) tr = tr.setNodeAttribute(pos, 'align', align)
        }
      })
    }
    if (applicable && dispatch && tr.docChanged) dispatch(tr)
    return applicable
  }
}
```

### 3.2 Fehler 2 (hoch): Tabellen-Zellauswahl — tatsächliches Verhalten ist das Gegenteil der Vermutung in Grenzfall 4.8

**Datei:** dieselbe Funktion, betrifft `state.selection.from`/`.to` bei einer
`CellSelection` aus `prosemirror-tables`.

Grenzfall 4.8 der Anforderung vermutet, `nodesBetween(from, to)` könne
„versehentlich auch dazwischenliegende, nicht markierte Zellen" erfassen. Die
tatsächliche Prüfung (Quelltext von `prosemirror-state`, `class Selection`: `get
from() { return this.$from.pos }`, `get $from() { return this.ranges[0].$from }`,
sowie `prosemirror-tables`, `class CellSelection`: die `ranges`-Liste wird mit
`cells.unshift($headCell...)` aufgebaut, sodass `ranges[0]` **immer die zuletzt beim
Ziehen berührte Zelle** ist) zeigt das **Gegenteil**:

Reproduktion (3×3-Tabelle, `CellSelection` von B1 nach B3 in der mittleren Spalte,
also drei Zellen markiert):

```
selection.from: 49  selection.to: 53
ranges: [ [49,53], [9,13], [29,33] ]   // ranges[0] = Kopf-Zelle (B3), nicht sortiert
Von setAlign erfasste Absätze (nodesBetween(from, to)): [ { pos: 49, text: 'B3' } ]
Von CellSelection.forEachCell erfasste Zellen (korrekte Iteration): [ B1, B2, B3 ]
```

`setAlign` erfasst also **nur die einzelne Zelle, auf der die Auswahlbewegung
endete** (B3 bei einem Drag von oben nach unten; bei umgekehrter Zugrichtung
entsprechend B1) — **nicht** alle drei markierten Zellen der mittleren Spalte, und
insbesondere **nicht** die Zellen der nicht markierten Spalten 1/3 (die
Grenzfall 4.8 als Risiko benennt). Das tatsächliche Problem ist also
**Unter-**, nicht **Überanwendung**: zwei der drei sichtbar markierten Zellen bleiben
bei „Links" unverändert stehen — ein sichtbar inkonsistentes Ergebnis, das
Nutzer:innen als „Button tut nichts/nur teilweise etwas" wahrnehmen.

Der oben in 3.1 gezeigte Fix behebt dies ebenfalls: `for (const range of
state.selection.ranges)` iteriert bei einer `CellSelection` über **alle** Zellen der
Selektionsfläche (jede Zelle liefert eine eigene `SelectionRange`, siehe
`CellSelection`-Konstruktor), exakt wie es `CellSelection.forEachCell` (von
`prosemirror-tables` selbst z. B. für `setCellAttr` verwendet) tut — ohne dass
`setAlign` `CellSelection` als Spezialfall kennen oder importieren müsste.

**Hinweis zu Testfall 7/Grenzfall 4.8 der Anforderung:** Der dort vorgeschlagene
Test (3×3-Tabelle, mittlere Spalte markieren, „Links" anwenden, Spalten 1 und 3
müssen unverändert bleiben) bleibt richtig, deckt nach dem Fix aber **zusätzlich**
ab, dass jetzt auch **alle drei** Zellen der mittleren Spalte tatsächlich geändert
werden (vor dem Fix wurden nur 1 von 3 geändert — ein bloßer „Spalten 1/3
unverändert"-Test hätte das nicht bemerkt, da er nicht auch Spalte 2 vollständig
prüft). Testfall in Abschnitt 6 entsprechend geschärft.

### 3.3 Fehler 3 (hoch): DOCX-Reader ignoriert Formatvorlagen-Ausrichtung

**Datei:** `src/formats/docx/reader.ts`, `parseStylesXml` (Zeile 52–66) und
`paragraphToBlocks` (Zeile 146–183, `jc`-Auswertung Zeile 150–152).

`parseStylesXml` liest aus `styles.xml` ausschließlich `w:outlineLvl` (für
Überschriften-Erkennung) — **nicht** `w:jc` innerhalb der Formatvorlage selbst.
`paragraphToBlocks` liest **ausschließlich** `w:pPr/w:jc` direkt am Absatz; fehlt
das (weil die Ausrichtung nur über die referenzierte Formatvorlage, ggf. über eine
`w:basedOn`-Kette, kommt), fällt der Code über `jcVal ?? 'left'` handelt (Zeile
151–152) auf „links" zurück — unabhängig davon, was die Formatvorlage tatsächlich
festlegt.

**Belegt mit einer echten Fremddatei**, nicht nur konstruiert:
`tests/fixtures/external/docx/bug-paragraph-alignment.docx` enthält genau zwei
Absätze, beide referenzieren die Formatvorlage `Title`:

```
Absatz 1: kein direktes <w:jc>, Text: "This paragraph does not have explicit
          alignment, it's centered per the paragraph style."
Absatz 2: <w:jc w:val="left"/> direkt am Absatz, Text: "This paragraph has explicit
          left alignment, overriding the alignment in the paragraph style."
```

`styles.xml` deklariert `<w:style w:styleId="Title">` mit `<w:jc w:val="center"/>` in
dessen `w:pPr`. Der aktuelle Reader importiert **beide** Absätze als `align: 'left'`
— Absatz 1 verliert seine (laut eigenem Dateiinhalt!) zentrierte Darstellung
vollständig und ununterscheidbar von echtem linksbündigem Text. Diese Datei ist
bereits Teil von `tests/fixtures/external/docx/__tests__/external-fixtures.test.ts`s
generischem „importiert ohne Absturz"-Test (nicht in einer der
`KNOWN_*`-Ausschlusslisten) — sie besteht also bereits heute unbemerkt, weil dieser
Test nur „stürzt nicht ab" prüft, nicht den tatsächlichen Ausrichtungswert.

**Fix:** `parseStylesXml` um eine `alignByStyleId: Map<string, string>` erweitern,
die pro Formatvorlage deren **direkt** deklariertes `w:jc` sowie — über eine
`w:basedOn`-Kette mit Tiefenbegrenzung, analog zum bestehenden
`MAX_TABLE_NESTING_DEPTH`-Muster in dieser Datei — das **geerbte** `w:jc` auflöst.
`paragraphToBlocks` verwendet diese Map als zusätzlichen Fallback **zwischen**
direktem `w:jc` und dem endgültigen `'left'`-Default:

```ts
const jcVal =
  jcEl?.getAttributeNS(OOXML_NAMESPACES.w, 'val') ??
  (styleId ? headingInfo.alignByStyleId.get(styleId) : undefined)
const align = normalizeAlign(jcVal)
```

(`normalizeAlign` siehe Fehler 4/5 unten — direkte Absatzformatierung gewinnt
weiterhin gegen Formatvorlage, das entspricht Word-Semantik und dem bereits
korrekten Verhalten für Absatz 2 der Beispieldatei.)

### 3.4 Fehler 4 (hoch): `w:jc="end"` wird als „links" statt „rechts" importiert

**Datei:** `src/formats/docx/reader.ts:13`, `JC_TO_ALIGN`.

```ts
const JC_TO_ALIGN: Record<string, string> = { left: 'left', center: 'center', right: 'right', both: 'justify' }
```

Weder `start` noch `end` sind enthalten. Grenzfall 4.11 der Anforderung benennt nur
`distribute` als Beispiel für einen unbekannten Wert und fragt nach einer
„sinnvolleren Näherung" — sie übersieht dabei, dass **derselbe** Fallback-Pfad
(`JC_TO_ALIGN[jcVal] ?? 'left'`, Zeile 152) auch `end` trifft: Nach ECMA-376 (und
in der Praxis von neueren Word-/LibreOffice-Exporten zunehmend verwendet) bedeutet
`w:jc="end"` in einem LTR-Dokument „rechtsbündig" — der aktuelle Code bildet das
auf „links" ab, das **exakte Gegenteil** der ursprünglichen Ausrichtung, nicht nur
eine unscharfe Näherung. Das ist eine inhaltsverändernde Fehlinterpretation, kein
reines Rundreise-Detail: Ein rechtsbündiger Absatz aus einer solchen Fremddatei
erscheint nach Import **und** nach jedem weiteren Export weiterhin als „links".

Reale Werte im vorhandenen Testkorpus (`tests/fixtures/external/docx`, nur
`w:pPr/w:jc`, **nicht** `w:tblPr/w:jc` — siehe Warnhinweis in Abschnitt 3.6):
`rtl.docx`, `table-indent.docx`, `unicode-path.docx` verwenden durchgehend
`w:jc="start"`; kein Fixture im vorhandenen Korpus verwendet `w:pPr/w:jc="end"` —
dafür ist ein handgebauter Test nötig (siehe Abschnitt 6.2).

**Fix:** Gemeinsame `normalizeAlign`-Funktion (siehe Abschnitt 5.3, neue Datei
`src/formats/shared/align.ts`) ersetzt `JC_TO_ALIGN`, mit `end` → `right`
(statt `left`) als zentraler Korrektur.

### 3.5 Fehler 5 (hoch): ODT-Reader normalisiert `fo:text-align` überhaupt nicht

**Datei:** `src/formats/odt/reader.ts:36-77` (`parseAutomaticStyles`), `:126`
(Absatz), `:173` (Überschrift). Bestätigt exakt wie in der Anforderung beschrieben
(Grenzfall 4.10) — hier zusätzlich mit **vier** echten Fremddateien aus dem
ODF-Toolkit-Korpus belegt (per Skript über alle 330 ODT-Fixtures nach
`fo:text-align`-Werten durchsucht):

| Datei | gefundene `fo:text-align`-Werte |
|---|---|
| `EasyList.odt`, `feature_bullets_numbering.odt`, `tableRowDeletionTest.odt` | `end` |
| `FruitDepot-SeasonalFruits4.odt`, `FruitDepot-SeasonalFruits5.odt`, `fields.odt`, `HeaderFooter.odt`, `_annotation.odt` | `start` |
| `feature_attributes_paragraph_MSO2013.odt` | `center`, `end`, `justify` (gemischt, gut geeignet für einen kombinierten Testfall) |

Import einer dieser Dateien lässt `align: 'start'` bzw. `align: 'end'` **wörtlich**
im internen ProseMirror-Dokument stehen. Auswirkungen exakt wie in Grenzfall 4.10
beschrieben (Editor zeigt via CSS `text-align: start` optisch korrekt links-/
rechtsbündig an, `isAlignActive` vergleicht aber strikt `=== 'left'`/`'right'` und
zeigt daher **keinen** aktiven Button-Zustand; Export normalisiert erst an dieser
späten Stelle über die bereits vorhandenen `?? PARAGRAPH_ALIGN_STYLE_NAME.left`-
bzw. `JC_BY_ALIGN[align] ?? 'left'`-Fallbacks in den Writern).

**Fix:** `parseAutomaticStyles` wendet `normalizeAlign` auf den gelesenen
`fo:text-align`-Wert an, **bevor** er in die `paragraphAligns`-Map geschrieben wird
(Zeile 64–65), sodass ab dem Zeitpunkt des Imports ausschließlich kanonische Werte
im Dokumentmodell existieren — nicht erst beim (möglicherweise erst viel später,
nach mehreren Zwischenschritten stattfindenden) Export.

**Verwandte, geringere Lücke (Parität zu Fehler 3, kein mit einer echten Datei
belegter sichtbarer Bug, aber dieselbe Fehlerklasse):** `parseAutomaticStyles` liest
nur `office:automatic-styles`, nicht `office:styles` (gemeinsame/benannte Stile) und
löst `style:parent-style-name`-Vererbungsketten nicht auf — analog zu „Lücke B" in
`unterstrichen-einfach-code.md` Abschnitt 3.2, dort für Zeichenstile beschrieben,
hier für Absatz-Ausrichtung. `HelloWorld.odt` referenziert z. B. durchgehend
`text:style-name="Standard"`, was mangels Eintrag korrekt auf `'left'` zurückfällt
(zufällig richtig, nicht weil die Vererbung aufgelöst wird) — ein Beleg, dass diese
Lücke mit dem vorhandenen Korpus nicht als sichtbarer Fehler nachweisbar war, aber
strukturell identisch zu Fehler 3 ist. Empfehlung: bei Gelegenheit (z. B. wenn
Lücke B aus `unterstrichen-einfach-code.md` umgesetzt wird) im selben Zug mit
beheben, siehe Abschnitt 5.5.

### 3.6 Verifikations-Hinweis (kein Fehler): `w:jc` existiert in zwei unabhängigen Bedeutungen

Beim Aufbau der Fixture-Übersicht für Fehler 4 fiel auf, dass
`tests/fixtures/external/docx/table-alignment.docx` trotz seines Namens **keine**
brauchbare Fixture für Absatz-Ausrichtung ist: alle dort enthaltenen `w:jc`-Werte
(`left`, `start`, `center`, `right`, `end`) stehen ausschließlich in `w:tblPr`
(Ausrichtung der **Tabelle als Ganzes** auf der Seite), nicht in `w:pPr`
(Absatz-Textausrichtung) — zwei nach OOXML unabhängige Verwendungen desselben
Elementnamens. Der bestehende Reader-Code ist davon **nicht** betroffen (er liest
`w:jc` ausschließlich über `firstChildNS(pPr, ...)`, also strikt aus `w:pPr`
heraus, Zeile 150) — dies ist also **kein Fund, der einen Fix erfordert**, aber ein
Hinweis für zukünftige Testfixture-Auswahl aus diesem Korpus: ein reines
`grep`/`w:jc`-basiertes Screening (wie initial für diese Prüfung verwendet) kann
ohne Kontext-Prüfung fälschlich table-level Treffer als Absatz-Ausrichtung
interpretieren.

### 3.7 Fehler 6 (mittel): Formatvorlagen-Wechsel setzt Ausrichtung hart zurück

**Datei:** `src/formats/shared/editor/commands.ts:40-55`, `setHeading`. Bestätigt
exakt wie in der Anforderung beschrieben (Grenzfall 4.9):

```ts
const attrs = level === null ? undefined : { level, align: 'left' }
```

Standard→Überschrift setzt `align: 'left'` **hart**, unabhängig vom vorherigen Wert;
Überschrift→Standard übergibt `attrs: undefined`, wodurch ProseMirror den
Schema-Default (`'left'`) einsetzt. Beide Richtungen verwerfen eine zuvor gesetzte
andere Ausrichtung stillschweigend.

**Entscheidung (siehe Abschnitt 7 für Begründung):** Das ist ein zu behebender
Fehler, **kein** gewolltes Verhalten. Word/LibreOffice setzen beim Wechsel der
Formatvorlage (Standard ↔ Überschriftenebene) die Absatzausrichtung nicht zurück —
Nutzer:innen erwarten, dass eine bewusst gewählte Ausrichtung formatvorlagen-
übergreifend erhalten bleibt.

**Fix:**

```ts
export function setHeading(level: number | null): Command {
  return (state, dispatch) => {
    const { $from, $to } = state.selection
    if (!$from.sameParent($to)) return false
    const parent = $from.parent
    if (!alignableTypes.has(parent.type.name)) return false
    const align = parent.attrs.align ?? 'left'
    const type = level === null ? wordSchema.nodes.paragraph : wordSchema.nodes.heading
    const attrs = level === null ? { align } : { level, align }
    if (dispatch) {
      const pos = $from.before($from.depth)
      dispatch(state.tr.setBlockType(pos, pos + parent.nodeSize, type, attrs))
    }
    return true
  }
}
```

### 3.8 Fehler 7 (niedrig, UX/Barrierefreiheit): fehlende Tastenkombinationen, `aria-label`, unlokalisierter Titel

Bestätigt exakt wie in der Anforderung beschrieben (Abschnitt 2, Zeilen 2/4;
Grenzfall 4.16). Entscheidung (Abschnitt 7): beides wird nachgerüstet.

### 3.9 Fehler 8 (mittel, konsistent mit `fett-code.md`): `AlignButton` nur per Maus auslösbar

**Datei:** `Toolbar.tsx`, `AlignButton` (Zeile 64–84), verwendet ausschließlich
`onMouseDown`. Identischer Fehlerpfad wie in `fett-code.md` Abschnitt 2.1 für
`MarkButton` gefunden und dort behoben (`onClick` statt `onMouseDown` für die
eigentliche Aktion, `onMouseDown` bleibt nur für `preventDefault()`). Da
`ausrichtung-links-req.md` (im Unterschied zu `fett-req.md` Abschnitt 1 Zeile 1)
keine explizite Tastatur-Bedienbarkeits-Anforderung für den Button selbst formuliert
(nur für die Ausrichtungs-**Tastenkombination** Strg+L, siehe Fehler 7), wird dieser
Fix hier als Konsistenz-/Barrierefreiheits-Verbesserung mit niedrigerer Priorität
als Fehler 1–6 eingestuft, aber im selben Umbau von `Toolbar.tsx` miterledigt (siehe
Abschnitt 5.2), da sonst zwei Button-Familien in derselben Datei mit demselben Bug
unterschiedlich behandelt würden.

---

## 4. Zusätzliche Klarstellungen (keine Fehler, aber zu dokumentieren)

- **`isAlignActive` bei `CellSelection`:** `$from` einer `CellSelection` ist
  `ranges[0].$from`, also die Kopf-Zelle des Auswahlvorgangs (siehe Fehler 2) — der
  Button zeigt nach einem Fix von Fehler 2 weiterhin nur den Zustand **dieser einen**
  Zelle, nicht einen kombinierten Zustand über die ganze Selektion. Das ist
  konsistent mit dem bereits für normale Mehrfachselektion dokumentierten Verhalten
  (Abschnitt 3.4/Grenzfall 4.4/4.5 der Anforderung: „Zustand des Absatzes am
  Selektionsanfang") und wird nicht separat behoben — nur hier vermerkt, damit es
  nicht als neuer, ungeprüfter Fund missverstanden wird.
- **`normalizeAlign`, RTL/bidi:** `start`/`end` sind schreibrichtungs-relative
  (logische) Werte — in einem RTL-Absatz bedeutet `start` „rechts". Diese
  Anwendung hat **an keiner Stelle** ein RTL-/bidi-Konzept (kein `dir`-Attribut,
  kein `w:bidi`, kein `style:writing-mode` — durchsucht, keine Treffer in `src/`).
  `normalizeAlign` (Abschnitt 5.3) bildet `start`→`left`/`end`→`right`
  **unbedingt** ab, also unter der (bereits an jeder anderen Stelle der Anwendung
  impliziten) Annahme eines LTR-Dokuments. Für die reale Fixture `rtl.docx`
  (arabischer, also RTL-Text mit `w:jc="start"`) bedeutet das: Der Text wird
  weiterhin — wie schon vor diesem Fix, der bestehende `?? 'left'`-Fallback tut
  dasselbe zufällig richtig — als „links" dargestellt, obwohl er in einem
  RTL-Kontext eigentlich rechtsbündig wäre. Das ist **keine Regression** durch
  diesen Plan (identisches Ergebnis wie vorher), aber eine bewusst dokumentierte
  Grenze: echte RTL-Unterstützung ist nicht Teil dieser Anforderung und müsste,
  falls je gefordert, an mehreren Stellen (Schema, CSS, Reader/Writer) neu
  entworfen werden.
- **`distribute` (Grenzfall 4.11):** Wird von `normalizeAlign` auf `'justify'`
  abgebildet (nähere Näherung als „links", wie von der Anforderung selbst
  vorgeschlagen). Keine perfekte Entsprechung (Word unterscheidet „verteilter
  Blocksatz" von normalem Blocksatz auch optisch bei CJK-Text), aber deutlich
  näher am Original als der aktuelle Zustand.

---

## 5. Dateigenauer Umsetzungsplan

### 5.1 `src/formats/shared/align.ts` (neu)

Zentrale, ProseMirror-unabhängige Normalisierung — bewusst **kein** Import von
`prosemirror-*` hier, da diese Datei auch von `docx/reader.ts`/`odt/reader.ts`
verwendet wird, die selbst keine ProseMirror-Abhängigkeit haben:

```ts
export type Align = 'left' | 'center' | 'right' | 'justify'

const ALIGN_ALIASES: Record<string, Align> = {
  left: 'left',
  start: 'left', // LTR-only-Vereinfachung, siehe ausrichtung-links-code.md §4
  center: 'center',
  right: 'right',
  end: 'right',
  justify: 'justify',
  both: 'justify', // OOXML w:jc-Wert für Blocksatz
  distribute: 'justify', // nächstliegende Näherung, siehe ausrichtung-links-code.md §4
}

/**
 * Canonicalizes a raw alignment keyword from OOXML (`w:jc/@w:val`), ODF
 * (`fo:text-align`), or pasted HTML (`style.textAlign`) into one of the four
 * values the schema/commands/writers understand. Missing or unrecognized
 * values fall back to 'left' (the schema default). Single source of truth so
 * the DOCX reader, ODT reader, and the paste-import path in schema.ts can
 * never disagree about how a given raw value is interpreted.
 */
export function normalizeAlign(raw: string | null | undefined): Align {
  if (!raw) return 'left'
  return ALIGN_ALIASES[raw.toLowerCase()] ?? 'left'
}
```

### 5.2 `src/formats/shared/editor/commands.ts` (geändert)

- `export type Align = ...` (Zeile 8) ersetzen durch
  `export type { Align } from '../align'` (behält bestehende Importe wie
  `Toolbar.tsx`s `import { ..., type Align } from './commands'` kompatibel).
- `setAlign` (Zeile 13–27) ersetzt durch die in Abschnitt 3.1 gezeigte Fassung
  (Fix für Fehler 1 und 2 gleichzeitig).
- `setHeading` (Zeile 40–55) ersetzt durch die in Abschnitt 3.7 gezeigte Fassung
  (Fix für Fehler 6).
- `isAlignActive` (Zeile 29–38): keine funktionale Änderung, nur ein Kommentar
  ergänzt, der auf Abschnitt 4 dieses Plans (Verhalten bei `CellSelection`)
  verweist.

### 5.3 `src/formats/shared/editor/Toolbar.tsx` (geändert)

`AlignButton` (Zeile 64–84):

- Lokalisierte, konsistente Titel/`aria-label` (Fix für Fehler 7):

```tsx
const ALIGN_LABELS: Record<Align, string> = {
  left: 'Linksbündig ausrichten',
  center: 'Zentriert ausrichten',
  right: 'Rechtsbündig ausrichten',
  justify: 'Blocksatz',
}

function AlignButton({ view, align, icon }: { view: EditorView; align: Align; icon: React.ReactNode }) {
  const active = isAlignActive(view.state, align)
  const title = ALIGN_LABELS[align]
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => run(view, setAlign(align))}
      className={/* unverändert */}
    >
      {icon}
    </button>
  )
}
```

  (`onMouseDown`/`onClick`-Trennung behebt Fehler 8, identisches Muster wie
  `fett-code.md` Abschnitt 4.2 für `MarkButton`.)

- Vier neue kleine inline-SVG-Icon-Komponenten (`AlignLeftIcon`,
  `AlignCenterIcon`, `AlignRightIcon`, `AlignJustifyIcon`; Material-Icons-Pfade
  `format_align_left`/`_center`/`_right`/`_justify`, Apache-2.0, gleiche
  Begründung/Lizenzlage wie `BoldIcon` in `fett-code.md` Abschnitt 4.2), ersetzen
  die reinen Unicode-Pfeil-/Linien-Labels — behebt den in Abschnitt 2, Zeile 4 der
  Anforderung sowie in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 17 Zeile 357/Abschnitt
  20.1 dokumentierten Icon-Rendering-Risiko konsistent mit der bereits für Fett
  getroffenen Entscheidung.
- Aufrufstellen (Zeile 185–188):

```tsx
<AlignButton view={view} align="left" icon={<AlignLeftIcon />} />
<AlignButton view={view} align="center" icon={<AlignCenterIcon />} />
<AlignButton view={view} align="right" icon={<AlignRightIcon />} />
<AlignButton view={view} align="justify" icon={<AlignJustifyIcon />} />
```

### 5.4 `src/formats/shared/editor/WordEditor.tsx` (geändert)

Keymap (Zeile 71–79) um die vier Standard-Tastenkombinationen ergänzen (Fix für
Fehler 7, Teil 1; deckt gleichzeitig die drei Schwester-Anforderungen
`ausrichtung-zentriert`/`-rechts`/`-blocksatz` ab, siehe Kurzfassung):

```ts
import { setAlign } from './commands'
// ...
keymap({
  // ... bestehende Einträge unverändert ...
  'Mod-l': setAlign('left'),
  'Mod-e': setAlign('center'),
  'Mod-r': setAlign('right'),
  'Mod-j': setAlign('justify'),
}),
```

`setAlign(align)` hat bereits die Signatur `Command` (`(state, dispatch?) =>
boolean`), passt also unverändert in `keymap()`'s Erwartung. Kein Konflikt mit
bestehenden Einträgen (`Mod-z/y/b/i/u`, `Shift-z`) oder mit `baseKeymap`. Analog zu
`fett-code.md` Abschnitt 4.3: `prosemirror-keymap` ruft bei `true`-Rückgabe
automatisch `event.preventDefault()` auf, wodurch eine kollidierende
Browser-Aktion (Chrome „Downloads" auf Strg+J, Firefox/Chrome „Adressleiste" auf
Strg+L) unterdrückt wird, **solange der Fokus im Editor liegt** — kein
Zusatz-Code nötig, aber ein E2E-Testfall muss das nachweisen (Abschnitt 6.4).

### 5.5 `src/formats/shared/schema.ts` (geändert)

`getAttrs` für `paragraph` (Zeile 13) und `heading` (Zeile 26) auf `normalizeAlign`
umstellen (Fix für die in Abschnitt 2 zusätzlich gefundene Paste-Import-Lücke):

```ts
import { normalizeAlign } from './align'
// ...
parseDOM: [{ tag: 'p', getAttrs: (dom) => ({ align: normalizeAlign((dom as HTMLElement).style.textAlign) }) }],
```

(analog für die sechs `heading`-Level-Einträge).

### 5.6 `src/formats/docx/reader.ts` (geändert)

- `JC_TO_ALIGN`-Konstante (Zeile 13) entfernen, durch `normalizeAlign` aus
  `../shared/align` ersetzen (Fix für Fehler 4).
- `HeadingInfo` (Zeile 48–50) um `alignByStyleId: Map<string, string>` erweitern;
  `parseStylesXml` (Zeile 52–66) um die in Abschnitt 3.3 gezeigte
  `w:jc`/`w:basedOn`-Auflösung ergänzen (Fix für Fehler 3), Tiefenbegrenzung nach
  demselben Muster wie `MAX_TABLE_NESTING_DEPTH` (Zeile 208).
- `paragraphToBlocks` (Zeile 146–183): `jcVal`-Ermittlung (Zeile 150–152) wie in
  Abschnitt 3.3 gezeigt um den Formatvorlagen-Fallback erweitern, `align` über
  `normalizeAlign(jcVal)` statt der bisherigen Lookup-Tabelle bestimmen.

### 5.7 `src/formats/docx/writer.ts` (keine funktionale Änderung)

`JC_BY_ALIGN` (Zeile 16) bleibt unverändert — nach den Fixes in 5.5/5.6/5.8 enthält
das Dokumentmodell an dieser Stelle nur noch kanonische `Align`-Werte, die
Lookup-Tabelle deckt bereits alle vier ab. `paragraphPropsXml` (Zeile 67–70)
schreibt weiterhin immer ein explizites `<w:jc w:val="left"/>` auch für den
Default — das ist laut Rundreise-Testfall 5.1.3 der Anforderung bereits als
korrekt (von Word/LibreOffice gleichbedeutend mit fehlendem Element interpretiert)
zu bestätigen, siehe Testfall in Abschnitt 6.5.

### 5.8 `src/formats/odt/reader.ts` (geändert)

`parseAutomaticStyles` (Zeile 36–77): `fo:text-align`-Wert (Zeile 64–65) vor dem
Eintragen in `paragraphAligns` durch `normalizeAlign` schicken (Fix für Fehler 5):

```ts
import { normalizeAlign } from '../shared/align'
// ...
const align = props?.getAttributeNS(ODF_NAMESPACES.fo, 'text-align')
if (align) paragraphAligns.set(name, normalizeAlign(align))
```

Die beiden Konsumstellen (Zeile 126, 173) ändern sich nicht (der Fallback `|| 'left'`
bleibt bestehen, greift jetzt nur noch, wenn wirklich **kein** Stil referenziert
bzw. kein `fo:text-align` gefunden wurde — der Normalisierungsschritt selbst
passiert bereits beim Einlesen der Stile, nicht erst beim Verbrauch).

**Nicht Teil des Mindestumfangs** (siehe Abschnitt 3.5, „verwandte, geringere
Lücke"): Auflösung von `office:styles`/`style:parent-style-name` für
Absatzausrichtung. Empfehlung: gemeinsam mit „Lücke B" aus
`unterstrichen-einfach-code.md` in einem eigenen, formatübergreifenden Umbau
angehen, da beide denselben Stil-Kaskaden-Mechanismus beträfen.

### 5.9 `src/formats/odt/writer.ts` / `src/formats/odt/styleRegistry.ts` (keine Änderung)

`PARAGRAPH_ALIGN_STYLE_NAME`/`headingStyleName` (Zeile 61–92) decken bereits alle
vier kanonischen `Align`-Werte ab; nach dem Fix in 5.8 kommen beim Export nur noch
kanonische Werte an, der bestehende `?? PARAGRAPH_ALIGN_STYLE_NAME.left`-Fallback
(`writer.ts:65`) wird dadurch zu unerreichbarem Verteidigungscode, aber bewusst
nicht entfernt (Robustheit gegen künftige, nicht über `normalizeAlign` laufende
Aufrufer, z. B. direkt konstruierte Test-Dokumente).

### 5.10 `src/formats/shared/documentModel.ts` (keine Änderung)

Bestätigt bereits korrekt: neues Dokument enthält explizit `{ type: 'paragraph',
attrs: { align: 'left' } }` (Zeile 11), nicht nur einen leeren Attribut-Satz, der
sich auf den Schema-Default verlässt — deckt Grenzfall 4.1 bereits ab, nur der Test
fehlt (siehe Abschnitt 6.1).

---

## 6. Testplan

### 6.1 Neu: `src/formats/shared/editor/__tests__/commands.test.ts`

Kernstück — das ist die einzige Test-Ebene, die Fehler 1/2/6 überhaupt fangen kann,
da Reader/Writer-Rundreisetests `setAlign`/`setHeading` nie aufrufen (siehe
Abschnitt 2, letzte Zeile der Tabelle). Verwendet eine echte `EditorView` mit
`jsdom` (im Projekt bereits als Dev-Dependency vorhanden, `vitest` läuft mit
`jsdom`-Environment, siehe `external-fixtures.test.ts`s `Blob`-Nutzung), mit
derselben `dispatchTransaction`-Verdrahtung wie `WordEditor.tsx`:

```ts
import { EditorState, TextSelection } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { wordSchema } from '../../schema'
import { setAlign, isAlignActive, setHeading } from '../commands'

function makeView(json: unknown) {
  const doc = wordSchema.nodeFromJSON(json)
  let state = EditorState.create({ doc, schema: wordSchema })
  const view = new EditorView(document.createElement('div'), {
    state,
    dispatchTransaction(tr) {
      view.updateState(view.state.apply(tr))
    },
  })
  return view
}

describe('setAlign', () => {
  it('regression: does not throw and aligns every paragraph when the selection spans multiple blocks (Fehler 1)', () => {
    const view = makeView({
      type: 'doc',
      content: [
        { type: 'paragraph', attrs: { align: 'center' }, content: [{ type: 'text', text: 'Eins' }] },
        { type: 'paragraph', attrs: { align: 'center' }, content: [{ type: 'text', text: 'Zwei' }] },
      ],
    })
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 1, view.state.doc.content.size - 1)))
    expect(() => setAlign('left')(view.state, view.dispatch)).not.toThrow()
    const aligns = view.state.doc.toJSON().content.map((n: any) => n.attrs.align)
    expect(aligns).toEqual(['left', 'left'])
    view.destroy()
  })

  it('does not dispatch a transaction when every matching block already has the target alignment (Abschnitt 3.9 der Anforderung)', () => {
    const view = makeView({
      type: 'doc',
      content: [{ type: 'paragraph', attrs: { align: 'left' }, content: [{ type: 'text', text: 'Text' }] }],
    })
    const before = view.state
    const applicable = setAlign('left')(view.state, view.dispatch)
    expect(applicable).toBe(true)
    expect(view.state).toBe(before) // keine neue Transaktion angewendet
    view.destroy()
  })

  it('a genuine alignment change produces exactly one undo step', async () => {
    const { history, undo } = await import('prosemirror-history')
    const doc = wordSchema.nodeFromJSON({
      type: 'doc',
      content: [
        { type: 'paragraph', attrs: { align: 'center' }, content: [{ type: 'text', text: 'Eins' }] },
        { type: 'paragraph', attrs: { align: 'center' }, content: [{ type: 'text', text: 'Zwei' }] },
      ],
    })
    let state = EditorState.create({ doc, schema: wordSchema, plugins: [history()] })
    const dispatch = (tr: any) => { state = state.apply(tr) }
    state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 1, state.doc.content.size - 1)))
    setAlign('left')(state, dispatch)
    expect(state.doc.toJSON().content.map((n: any) => n.attrs.align)).toEqual(['left', 'left'])
    undo(state, dispatch)
    expect(state.doc.toJSON().content.map((n: any) => n.attrs.align)).toEqual(['center', 'center']) // EIN Undo, beide Absätze zurück
  })
})

describe('setAlign with CellSelection (Grenzfall 4.8)', () => {
  it('aligns every selected cell, not just the one the drag ended on, and leaves unselected columns untouched', () => {
    // Tabelle 3x3 aufbauen (wordSchema.nodes.table/table_row/table_cell),
    // CellSelection über die mittlere Spalte via cellAround()+CellSelection
    // konstruieren (siehe Reproduktionsskript in Abschnitt 3.2), setAlign('left')
    // aufrufen, prüfen: alle drei Zellen der mittleren Spalte sind 'left',
    // Spalten 1 und 3 unverändert.
  })
})

describe('setHeading preserves alignment (Fehler 6 / Grenzfall 4.9)', () => {
  it('Standard -> Überschrift 1 keeps a previously centered paragraph centered', () => { /* ... */ })
  it('Überschrift 1 -> Standard keeps a previously right-aligned heading right-aligned', () => { /* ... */ })
})
```

### 6.2 Neu: `src/formats/docx/__tests__/alignment.test.ts`

- `w:jc` = `start`/`end`/`distribute`/`both`/Groß-/Kleinschreibung (`LEFT`) → über
  handgebautes XML (Muster wie `buildSampleDocx` in `tests/e2e/docx.spec.ts`)
  gegen `readDocx` geprüft; `end` → `'right'` ist der zentrale Regressionstest für
  Fehler 4.
- Fixture-Test gegen die echte Datei `tests/fixtures/external/docx/bug-paragraph-alignment.docx`
  (Muster wie `external-fixtures.test.ts`): Absatz 1 → `align: 'center'` (Fix für
  Fehler 3), Absatz 2 → `align: 'left'` (direkte Formatierung gewinnt weiterhin).
- Fixtures `rtl.docx`/`table-indent.docx`/`unicode-path.docx` (`w:jc="start"`) →
  `align: 'left'`.
- Fehlendes `w:jc` ganz allgemein (Grenzfall 4.12) → `align: 'left'`.

### 6.3 Neu: `src/formats/odt/__tests__/alignment.test.ts`

- Fixtures `EasyList.odt`/`feature_bullets_numbering.odt` (`end`) → `align: 'right'`.
- Fixtures `FruitDepot-SeasonalFruits4.odt`/`fields.odt` (`start`) → `align: 'left'`.
- Fixture `feature_attributes_paragraph_MSO2013.odt` (gemischt `center`/`end`/
  `justify` im selben Dokument) → je Absatz korrekt unterschieden.
- Fixture `HelloWorld.odt` (Style „Standard", kein `fo:text-align`) → `align:
  'left'` (Testfall 5.2.7).

### 6.4 Neu: `tests/e2e/align-left.spec.ts`

Struktur analog `tests/e2e/docx.spec.ts`/`odt.spec.ts`/
`selection-regression.spec.ts` (gleiche `docxCard`/`odtCard`-Helfer). Deckt
Abschnitt 6 der Anforderung Punkt für Punkt ab, insbesondere:

1. Neues Dokument → „Links"-Button zeigt `aria-pressed="true"` ohne Klick
   (Grenzfall 4.1).
2. **Kernregressionstest für Fehler 1**: zwei Absätze eingeben, Strg+A, „Zentriert"
   klicken, dann Strg+A erneut, „Links" klicken → **kein** Konsolenfehler, **beide**
   Absätze sichtbar linksbündig (`style="text-align: left"` im DOM), Button-Zustand
   für „Links" `true`, für „Zentriert" `false`.
3. Testfall 2/3 der Anforderung (Toolbar-Klick, idempotenter Klick).
4. Gemischte Selektion (Testfall 4/Grenzfall 4.4).
5. Absatzgrenze (Grenzfall 4.5).
6. Liste zentrieren → links → Liste aufheben (Grenzfall 4.7).
7. **3×3-Tabelle, nur mittlere Spalte markieren (Shift-Klick/Drag über
   `td`-Elemente), „Links"** → alle drei Zellen der mittleren Spalte linksbündig,
   Spalten 1/3 unverändert (Testfall 7/Grenzfall 4.8, nach Fix in 3.2 — vor dem Fix
   hätte dieser Test bereits am „alle drei Zellen der mittleren Spalte"-Teil
   scheitern müssen, nicht erst am „Spalten 1/3"-Teil).
8. Formatvorlagen-Wechsel (Testfall 8/Grenzfall 4.9) — Erwartung nach Fix in 3.7:
   Ausrichtung bleibt über den Wechsel erhalten (nicht mehr „wird auf links
   zurückgesetzt").
9. Undo/Redo (Testfall 9).
10. Tastenkombinationen Strg+L/E/R/J je einmal per `page.keyboard.press`, inkl.
    Tab-Fokus + Enter/Space auf den Button selbst (deckt Fehler 7 **und** 8).
11. Vollständige Rundreisen je Format (Abschnitt 5.1/5.2 der Anforderung, echter
    Upload/Download).
12. Cross-Format- und Doppel-Rundreise (Abschnitt 5.3).
13. Fremddatei-Import: `bug-paragraph-alignment.docx`, `EasyList.odt` — Ergebnis
    gemäß Abschnitt 3.3/3.5 dieses Plans im Browser nachvollzogen.
14. Sichtprüfung/Screenshot (Testfall 15).

### 6.5 Erweiterung: `tests/e2e/selection-regression.spec.ts`

Neuer Test, Muster identisch zu den bestehenden Fett-Tests, aber mit „Links" (nach
vorherigem Zentrieren) als auslösender Aktion **über zwei Absätze hinweg** (deckt
Grenzfall 4.14 — und hätte, wäre er schon vor diesem Plan geschrieben worden,
Fehler 1 sofort sichtbar gemacht):

```ts
test('same regression with a multi-paragraph "Links"-alignment as the triggering action (Grenzfall 4.14)', async ({ page }) => {
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Erster Absatz.')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Zweiter Absatz.')
  await page.keyboard.press('ControlOrMeta+a')
  await page.getByTitle('Zentriert ausrichten').click()
  await page.keyboard.press('ControlOrMeta+a')
  await page.getByTitle('Linksbündig ausrichten').click() // vor dem Fix: Exception, zweiter Absatz bleibt zentriert
  await editor.click()
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Dritter Absatz.')
  await expect(page.locator('.ProseMirror p')).toHaveCount(3)
  await expect(editor.locator('p[style*="text-align: left"]')).toHaveCount(3)
})
```

### 6.6 Erweiterung: `roundtrip.test.ts` (beide Formate)

Neuer Fall je Datei: Dokument mit **zwei** unterschiedlich ausgerichteten Absätzen
in einem Schreib-/Lesevorgang (reine Reader/Writer-Prüfung, deckt **nicht** Fehler
1 — das ist nur über 6.1/6.4 möglich, hier nur zur Absicherung, dass der Writer bei
mehreren Blöcken pro Aufruf korrekt bleibt, was er bereits war, da `blocksToDocx`/
`blocksToOdt` ohnehin über ein Array iterieren, unabhängig vom Editor-Befehl).

### 6.7 Erweiterung: `external-fixtures.test.ts` (beide Formate, optional)

Keine neue Assertion nötig (6.2/6.3 decken die konkreten Fixtures bereits gezielt
ab) — nur zur Kenntnisnahme: `bug-paragraph-alignment.docx` bleibt in der
generischen „importiert ohne Absturz"-Suite, jetzt zusätzlich mit einer inhaltlich
korrekten (nicht nur „crasht nicht") Prüfung in `alignment.test.ts` abgesichert.

---

## 7. Entscheidungen zu den offenen Fragen (Abnahmekriterien 4 und 7)

1. **Formatvorlagen-Wechsel (Grenzfall 4.9, DoD 4):** Entschieden als **Fehler**,
   siehe Fehler 6/Fix in Abschnitt 3.7/5.2. Begründung: Word/LibreOffice bewahren
   die Absatzausrichtung beim Wechsel der Formatvorlage; ein stillschweigender
   Reset widerspricht außerdem dem in Abschnitt 1 der Anforderung formulierten Ziel
   „die Ausrichtung bleibt … vollständig erhalten" und wäre der naheliegendste Weg,
   wie ein Absatz **ungewollt** linksbündig wird — was die Anforderung selbst als
   Risiko benennt.
2. **Tastenkombination (Abschnitt 2 Zeile 2, DoD 7):** Entschieden als
   **nachzuliefernde Funktion**, nicht „bewusst nicht im Scope". Begründung:
   Fett/Kursiv/Unterstrichen haben bereits Tastenkombinationen; das Fehlen bei
   Ausrichtung ist eine Inkonsistenz ohne erkennbaren Grund, Word/LibreOffice-
   Konvention (Strg+L/E/R/J) ist eindeutig, keine Kollision mit bestehender Keymap
   (siehe Abschnitt 5.4). Umsetzung siehe dort.
3. **`aria-label` (Grenzfall 4.16, DoD 7):** Entschieden als **zu schließende
   Lücke**, nicht „title reicht aus". Begründung: Konsistenz mit `MarkButton`
   (bereits `aria-label` gesetzt), kein Mehraufwand, kein Nachteil.

---

## 8. Zuordnung zu den Abnahmekriterien (Abschnitt 8 der Anforderung)

| DoD-Punkt | Abdeckung durch diesen Plan |
|---|---|
| 1. Alle Testfälle aus Abschnitt 6 real im Browser | Abschnitt 6.4 (`align-left.spec.ts`) |
| 2. Rundreise-Testfälle 5.1/1,2,6 und 5.2/1,2,6 mit echten Werkzeugen | Abschnitt 6.2/6.3 (echte Fixtures) + Abschnitt 6.4 Punkt 11 (echter Upload/Download) |
| 3. Tabellen-Zellauswahl-Grenzfall (4.8) geprüft, Verhalten dokumentiert | Abschnitt 3.2 (tatsächliches Verhalten verifiziert und korrigiert, Gegenteil der Vermutung) |
| 4. Formatvorlagen-Wechsel-Grenzfall (4.9) entschieden | Abschnitt 7 Punkt 1 (Fehler, behoben) |
| 5. ODF-/OOXML-Wertevarianten (4.10/4.11) mit echten Testdateien geprüft | Abschnitt 3.5/3.4 (vier bzw. drei echte Fixtures je Format) |
| 6. Regressionstest Selection-Sync mit Ausrichtung dauerhaft in Suite | Abschnitt 6.5 |
| 7. Tastenkombination/`aria-label` entschieden | Abschnitt 7 Punkte 2/3 |
| 8. Kein Fund ohne Ticket/Vermerk | Abschnitt 3 (Fehler 1–8) + Abschnitt 4 (Klarstellungen) — nichts offen gelassen |

---

## 9. Reihenfolge der Umsetzung (Vorschlag)

1. `src/formats/shared/align.ts` (5.1) — unabhängig, Grundlage für alle weiteren
   Schritte.
2. `commands.ts` (5.2) — behebt Fehler 1, 2, 6, die schwerwiegendsten Funde
   zuerst, da Fehler 1 den zentralen Anwendungsfall der gesamten Anforderung
   bricht.
3. `src/formats/shared/editor/__tests__/commands.test.ts` (6.1) sofort im Anschluss,
   um Fehler 1/2/6 dauerhaft als Regressionstest zu verankern, bevor an der
   Oberfläche weitergearbeitet wird.
4. `Toolbar.tsx` + `WordEditor.tsx` (5.3/5.4) — Tastenkombinationen, `aria-label`,
   Icons, Tastatur-Auslösbarkeit.
5. `schema.ts` (5.5) — Paste-Import-Normalisierung.
6. `docx/reader.ts` (5.6) — Formatvorlagen-Ausrichtung + `normalizeAlign`.
7. `odt/reader.ts` (5.8) — `normalizeAlign`.
8. Testergänzungen 6.2–6.7, um 5.5–5.8 gezielt mit den bereits identifizierten
   echten Fixtures abzusichern.
9. `tests/e2e/align-left.spec.ts` (6.4) + Erweiterung `selection-regression.spec.ts`
   (6.5) als Abschluss — verifiziert alle vorherigen Schritte end-to-end im
   echten Browser, wie von Abschnitt 7 der Anforderung gefordert.
