# Umsetzungsplan: Feature „Ausrichtung links" — Code-Abgleich und geplante Änderungen

Rolle: Entwickler-Antwort auf `specs/ausrichtung-links-req.md`. Dieses Dokument prüft
den **tatsächlichen** Code-Stand (nicht nur die in der Anforderung zitierten
Zeilenangaben) gegen jede Behauptung der Spezifikation, führt zusätzlich **ausführbare**
Reproduktionen der kritischen Grenzfälle gegen den echten Produktivcode durch (nicht nur
Codelektüre — siehe Methodik in Abschnitt 1) und legt fest, welche Dateien wie geändert
bzw. neu angelegt werden. Stil orientiert an `FEATURE-SPEC-DOCX-ODT.md`, `specs/fett-code.md`
und `specs/unterstrichen-einfach-code.md`. Kein Punkt hier ist bereits umgesetzt — dies ist
der Plan, nicht der Vollzug.

Alle Code-Referenzen (Symbolname **und** Zeilennummer) wurden am Arbeitsstand vom
**2026-07-04** frisch gegen die Dateien im Working Tree geprüft. Verbindlicher Anker ist
immer der **Symbolname**; die Zeilennummer ist eine Momentaufnahme.

**Nachgeführt am 2026-07-05 (Re-Verifikation gegen den Working Tree nach dem
„Ausschneiden"-Commit `9f8fa03` und den Folge-Commits `db61c89`/`175d86d`/`29cbc80`).** Der
in `WordEditor.tsx` eingefügte `Shift-Delete`-/Cut-Pfad hat die dortige Keymap um ~8 Zeilen
nach unten verschoben — **nur `WordEditor.tsx`** ist betroffen (die Cut-Commits berührten
keine der übrigen Referenzdateien; die Folge-Commits betrafen ausschließlich
Test-Flakiness/Clipboard-Permissions/CI-Skip). Alle `WordEditor.tsx`-Zeilenangaben in diesem
Dokument sind daher **neu gesetzt**: Keymap `85–107` (vorher zitiert `77–99`), `Mod-b/i/u`
`98–100` (vorher `90–92`), `dispatchTransaction` `125–133` (vorher `117–124`),
`onChange`-Aufruf `128–130` (vorher `120–122`), `mouseup`-Handler (`onMouseUp`) `146–153`
(vorher `138–145`); `reconcileSelectionOnClick` bleibt `43–50`. **Alle** Anker in
`commands.ts`, `schema.ts`, `Toolbar.tsx`, `docx/reader.ts`+`writer.ts`,
`odt/reader.ts`+`writer.ts`+`styleRegistry.ts` und `documentModel.ts` wurden erneut Zeile für
Zeile gegen den Working Tree geprüft und sind **unverändert korrekt**. Genau dieses
Nachziehen (statt „sieht plausibel aus, übernehme ich") ist die vom Korrekturhinweis in
`ausrichtung-links-req.md` geforderte Disziplin — und bestätigt den Anker-vor-Zeile-Grundsatz:
der einzige durch die Cut-Commits ungültig gewordene Bezug ist ein reiner Zeilenversatz in
**einer** Datei, kein Symbol.

**Unabhängige Entwickler-Re-Verifikation (2026-07-05, gegen denselben Working Tree nach
`29cbc80`).** Statt die vorherigen Prüfvermerke zu übernehmen, wurde in dieser Runde erneut
direkt am Code und an echten Artefakten geprüft, nicht nur gelesen:

- **Alle** Symbol-/Zeilenanker aus Abschnitt 2 wurden erneut Zeile für Zeile gegen
  `commands.ts`, `schema.ts`, `Toolbar.tsx`, `WordEditor.tsx`, `docx/reader.ts`+`writer.ts`,
  `odt/reader.ts`+`writer.ts`+`styleRegistry.ts`, `documentModel.ts` gelesen — **exakt**
  bestätigt, keine Korrektur nötig.
- **Fehler 1 (kritisch) erneut durch tatsächliche Ausführung reproduziert** (frischer,
  eigenständiger Wegwerf-`vitest`-Test gegen den echten `setAlign` + echtes `wordSchema` +
  eine echte `EditorView` mit der `dispatchTransaction`-Verdrahtung aus `WordEditor.tsx`):
  zwei zentrierte Absätze, Selektion über beide, `setAlign('left')` → wirft
  `RangeError: Applying a mismatched transaction` (Stacktrace zeigt den Wurf exakt in
  `commands.ts:21` innerhalb von `Fragment.nodesBetween`); Doc-Zustand danach
  `['left','center']` — **identisch** zum in Abschnitt 3.1 dokumentierten Befund.
- **Fehler 2 ebenfalls erneut reproduziert:** 3×3-Tabelle, `CellSelection.create` über die
  mittlere Spalte → `ranges.length === 3`, aber nach `setAlign('left')` ist nur **eine** der
  drei Zellen der Spalte auf `left` (die übrigen acht Absätze — inkl. der zwei anderen
  Zellen derselben Spalte — bleiben `center`) — bestätigt „Unter-", nicht „Überanwendung".
- **Fehler 3/4/5 erneut mit den echten Fixtures nachvollzogen** (Zip-Entpacken +
  direkter XML-Textvergleich, unabhängig vom eigenen Reader): `bug-paragraph-alignment.docx`
  — Absatz 1 `<w:pStyle w:val="Title"/>` ohne eigenes `<w:jc>`, `styles.xml`-Stil `Title` mit
  `<w:jc w:val="center"/>`, Absatz 2 zusätzlich direktes `<w:jc w:val="left"/>` — **exakt**
  wie in Abschnitt 3.3 zitiert. `EasyList.odt` → ausschließlich `fo:text-align="end"` (3×),
  `FruitDepot-SeasonalFruits4.odt` → ausschließlich `"start"` (2×),
  `feature_attributes_paragraph_MSO2013.odt` → gemischt `"center"`/`"end"`/`"justify"` — **exakt**
  wie in Abschnitt 3.5 zitiert.
- **Eine Ungenauigkeit gefunden und korrigiert (Abschnitt 6.1):** Die vorherige Fassung
  bezeichnete `src/formats/shared/editor/__tests__/commands.test.ts` als **neu anzulegen**.
  Tatsächlich existiert diese Datei bereits (angelegt durch das „Ausschneiden"-Feature,
  Commit `9f8fa03`, mit `describe('canCut', …)`/`describe('cutSelection', …)`) — der
  vorgeschlagene Datei-Header hätte diese bestehenden Tests überschrieben. Korrigiert auf
  „Erweiterung": neue `describe`-Blöcke plus ergänzte Importe werden an die bestehende Datei
  angehängt, bestehende Importe (`wordSchema`, `canCut`/`cutSelection` aus `../commands`)
  werden wiederverwendet statt dupliziert.
- Kein weiterer Befund dieser Runde erforderte eine Korrektur — der einzige tatsächliche
  Fund ist der `commands.test.ts`-Punkt oben, der genau in die vom Korrekturhinweis in
  `ausrichtung-links-req.md` beschriebene Fehlerklasse fällt (eine ungeprüfte Übernahme
  einer „Neu"-Behauptung) und deshalb hier explizit dokumentiert statt still gefixt wird.

---

## 0.0 Korrekturen gegenüber der vorherigen Fassung dieser Datei (verbindlich)

Diese Datei existierte bereits. Die inhaltliche Analyse (die acht in Abschnitt 0
gelisteten Fehler samt Fixes und Testplan) war **fachlich richtig und wurde bestätigt** —
zwei der schwerwiegendsten Punkte sogar durch **erneute Ausführung** verifiziert (siehe
Abschnitt 1). Die vorherige Fassung hatte jedoch **drei Genauigkeitsmängel**, die genau die
Fehlerklasse reproduzierten, wegen der das Feature laut Anforderung als „nicht
vertrauenswürdig" gilt. Sie sind in dieser Fassung korrigiert:

1. **Durchgehend veraltete Zeilennummern bei gleichzeitiger Behauptung „Zeilen exakt".**
   Die vorherige Verifikationstabelle (Abschnitt 2) nannte u. a. `AlignButton` bei
   `Toolbar.tsx:64-84` (tatsächlich **91–111**; 64–84 liegt **innerhalb** von `MarkButton`),
   die Button-Instanz bei `:185` (tatsächlich **234**), `JC_TO_ALIGN` bei `docx/reader.ts:13`
   (tatsächlich **14**), `paragraphToBlocks`/`jc`-Auswertung bei `reader.ts:146-183`/`150-152`
   (tatsächlich **229–280** / **238–240**), `JC_BY_ALIGN` bei `writer.ts:16` (tatsächlich
   **18**), die ODT-Absatz-/Überschrift-Konsumstellen bei `odt/reader.ts:126`/`173`
   (tatsächlich **178** / **259**), den ODT-Writer-Fallback bei `writer.ts:65` (tatsächlich
   **89**) und die Unit-Rundreisetests bei `roundtrip.test.ts:41-45,48-53` (tatsächlich
   DOCX **47–51** / **54–59**, ODT **49–53** / **56–61**). Ironischerweise waren die in
   `ausrichtung-links-req.md` genannten Zeilen an diesen Stellen **korrekt** — die
   vorherige Code-Fassung hatte sie gegen einen älteren, kürzeren Stand „korrigiert".
   **Alle Zeilenangaben sind hier neu gegen den Working Tree gesetzt.**

2. **Faktisch falsche Aussage „keine E2E-Abdeckung von Ausrichtung".** Die vorherige
   Fassung schrieb in Abschnitt 2: „Keine E2E-Tests für Ausrichtung | Bestätigt — kein
   Treffer für ‚align'/‚Ausrichtung' in `tests/e2e/*.spec.ts`." Das ist **falsch** und ist
   **wortgleich der Fehler, den die Anforderung im Korrekturhinweis ausdrücklich anprangert**
   (eine frühere Anforderungsfassung behauptete dasselbe). Tatsächlich prüft
   `tests/e2e/roundtrip-fidelity.spec.ts` unter „Criterion 4: Absatzausrichtung"
   (Z. 56–58, Re-Verify Z. 128–129 / 178–179 / 242–243) `text-align: center` an einem
   rundgereisten Absatz für DOCX→DOCX **und** ODT→ODT über echten Upload/Download. Die
   **echte** Lücke ist nicht „keine E2E-Tests", sondern „**kein** E2E-Test klickt je einen
   `AlignButton` und **kein** Test weist den Wert `left` über die UI nach" (siehe
   Abschnitt 2, letzte Zeilen, und Anforderung 6.2). Korrigiert.

3. **Ungenaue Querverweise auf `specs/fett-code.md`.** Die vorherige Fassung schrieb, der
   `onMouseDown`-only-Defekt sei „in `fett-code.md` … gefunden **und dort behoben**".
   `fett-code.md` ist selbst ein **Plan** (der Fix „`onClick` statt `onMouseDown`" ist dort
   in Abschnitt 4 nur *vorgesehen*, `fett-code.md:115`), und im aktuellen Working Tree nutzt
   `MarkButton` weiterhin ausschließlich `onMouseDown` (`Toolbar.tsx:76`). Korrekt ist:
   „in `fett-code.md` als Fix **vorgesehen**, im Code **noch nicht** umgesetzt — beide
   Button-Familien teilen den Defekt aktuell". Korrigiert (Abschnitt 3.9).

---

## 0. Kurzfassung

Die in `ausrichtung-links-req.md` genannten Symbol-Fundstellen sind **durchgehend korrekt**
(siehe Abschnitt 2). Die eigentliche Prüfung deckt darüber hinaus einen **schwerwiegenden,
in der Anforderung nicht benannten Fehler** auf, der den in Abschnitt 1/3.2 der Anforderung
beschriebenen Kernanwendungsfall komplett bricht:

1. **KRITISCH — `setAlign` wirft eine Exception und bricht ab, sobald die Selektion mehr als
   einen alignierbaren Block (Absatz/Überschrift) umfasst.** Verifiziert **durch tatsächliche
   Ausführung** des Produktivcodes (`setAlign` aus `commands.ts` + echtes `wordSchema` aus
   `schema.ts`) gegen eine echte `EditorView` unter `jsdom`, mit exakt der
   `dispatchTransaction`-Verdrahtung aus `WordEditor.tsx` (Z. 125–133). Ergebnis (assertiert,
   grün): `RangeError: Applying a mismatched transaction`; der **erste** Absatz wird noch auf
   `left` gesetzt, der **zweite bleibt** `center` (`['left','center']`). Betrifft Abschnitt
   3.2 der Anforderung („Selektion über mehrere Absätze"), Testfall 4 / Grenzfall 4.4,
   Testfall 13 (Strg+A) und Grenzfall 4.14. Kein bestehender Test (Unit oder E2E) deckt das
   ab, weil alle vorhandenen Tests Ausrichtung nur an **einem** Block prüfen bzw. `setAlign`
   nie über mehr als einen Block aufrufen.
2. **Tabellen-Zellauswahl (Grenzfall 4.8): tatsächliches Verhalten ist das Gegenteil der in
   der Anforderung geäußerten Vermutung.** Ebenfalls durch Ausführung gegen
   `prosemirror-tables` verifiziert (assertiert, grün): bei einer `CellSelection` über die
   mittlere Spalte einer 3×3-Tabelle ist `selection.ranges.length === 3` (alle drei Zellen),
   aber `selection.from`/`.to` (und damit `nodesBetween(from, to)`) überspannen **nur die
   Kopf-Zelle** — es wird **exakt 1 von 3** markierten Zellen ausgerichtet, die anderen zwei
   bleiben stehen; die nicht markierten Spalten 1/3 bleiben unberührt. Das tatsächliche
   Problem ist **Unter-**, nicht (wie in 4.8 vermutet) **Überanwendung**.
3. **DOCX-Reader ignoriert Ausrichtung, die nur auf Formatvorlagen-Ebene (`w:pStyle`)
   deklariert ist.** Mit der echten Fremddatei `bug-paragraph-alignment.docx` belegt
   (XML-Inhalt in Abschnitt 3.3 direkt geprüft): ein per Stil `Title` (dessen `w:pPr` ein
   `<w:jc w:val="center"/>` trägt) zentrierter Absatz ohne eigenes `w:jc` wird fälschlich als
   `left` importiert.
4. **DOCX-Reader bildet `w:jc="end"` auf `left` statt `right` ab** (nicht nur `start`) —
   `JC_TO_ALIGN` kennt weder `start` noch `end`; beide fallen über `?? 'left'`, wodurch aus
   rechtsbündigem Text stillschweigend linksbündiger wird. Inhaltsverändernde
   Fehlinterpretation, kein reines Rundreise-Detail.
5. **ODT-Reader normalisiert `fo:text-align` überhaupt nicht** (bestätigt exakt wie
   beschrieben) — mit echten Fremddateien belegt (`EasyList.odt` → `end`,
   `FruitDepot-SeasonalFruits4.odt` → `start`, `feature_attributes_paragraph_MSO2013.odt` →
   gemischt `center`/`end`/`justify`; Werte in Abschnitt 3.5 direkt aus den Dateien
   ausgelesen).
6. **Formatvorlagen-Wechsel (`setHeading`) setzt Ausrichtung hart auf `left`** — bestätigt
   (Grenzfall 4.9). Dieser Plan trifft die von Abnahmekriterium 4 geforderte Entscheidung:
   **zu behebender Fehler**, kein gewolltes Verhalten (Begründung Abschnitt 7).
7. **Fehlende Tastenkombinationen und `aria-label`** — bestätigt; dieser Plan trifft die von
   Abnahmekriterium 8 geforderte Entscheidung (Abschnitt 7): beides wird nachgerüstet.
8. **`AlignButton` ist wie `MarkButton` nur per Maus (`onMouseDown`), nicht per Tastatur
   (Tab + Enter/Space) auslösbar** — im Code bestätigt; in `fett-code.md` bereits als Fix
   vorgesehen, dort aber ebenfalls noch nicht umgesetzt (siehe Abschnitt 0.0 Punkt 3).

Da alle vier Ausrichtungen (`links/zentriert/rechts/blocksatz`) über exakt denselben Code
laufen (`setAlign`/`isAlignActive`/`setHeading`, dieselbe Schema-Attribut-Definition,
dieselben DOCX-/ODT-Mapping-Stellen), **beheben die Fixes in diesem Plan alle vier
Ausrichtungs-Anforderungen gleichzeitig** — es ist kein nur „links" betreffender Bug,
sondern die gemeinsame Grundlage aller vier Backlog-Einträge.

---

## 1. Methodik

Neben Codelektüre **aller** in der Anforderungstabelle genannten Dateien wurden die als „zu
prüfen" markierten Kernpunkte gegen den echten Produktivcode **ausgeführt** — bewusst mit
der bereits im Repo vorhandenen Toolchain (`vitest` v4 mit `jsdom`-Environment), damit die
Reproduktion jederzeit nachstellbar ist und nicht auf externen Skripten beruht:

- **Fehler 1 & 2:** Ein temporärer `vitest`-Test importierte den **echten** `setAlign` aus
  `src/formats/shared/editor/commands.ts` und das **echte** `wordSchema` aus
  `src/formats/shared/schema.ts`, baute eine echte `EditorView` mit der `dispatchTransaction`
  aus `WordEditor.tsx` (Z. 125–133) und prüfte per Assertion:
  - Zwei-Absatz-Dokument, `TextSelection` über beide → `setAlign('left')` **wirft**
    `RangeError: Applying a mismatched transaction`; Doc-Zustand danach `['left','center']`.
  - 3×3-Tabelle, `CellSelection.create(doc, B1, B3)` über die mittlere Spalte →
    `selection.ranges.length === 3`, aber `nodesBetween(from, to)` besucht **1** Absatz;
    nach `setAlign('left')` ist genau **1** der drei B-Zellen `left`, A/C unverändert.
  Beide Tests liefen grün (Hypothese = beobachtetes Verhalten), womit die Aussagen aus
  Abschnitt 0 Punkt 1/2 belegt sind. Der Test war ein Wegwerf-Artefakt und ist **nicht** Teil
  des Repos; der dauerhafte Regressionstest ist in Abschnitt 6.1 spezifiziert.
- **Fehler 3/4/5 (echte Fremddateien):** Die Zip-Container der zitierten Fixtures wurden
  ausgepackt und ihr XML direkt gelesen:
  - `tests/fixtures/external/docx/bug-paragraph-alignment.docx`: Absatz 1 trägt
    `<w:pStyle w:val="Title"/>` **ohne** eigenes `<w:jc>`; `word/styles.xml` deklariert für
    `styleId="Title"` ein `<w:jc w:val="center"/>`; Absatz 2 trägt direkt
    `<w:jc w:val="left"/>`. → Beleg für Fehler 3.
  - `EasyList.odt` → `fo:text-align="end"`, `FruitDepot-SeasonalFruits4.odt` →
    `fo:text-align="start"`, `feature_attributes_paragraph_MSO2013.odt` → `center`/`end`/
    `justify` gemischt. → Beleg für Fehler 4/5.

Zusätzlich wurden `FEATURE-BACKLOG.md` Abschnitt 2.3 und `FEATURE-SPEC-DOCX-ODT.md`
Abschnitte 2/4/17/20 gegengelesen; alle in der Anforderung daraus zitierten Aussagen sind
bestätigt.

---

## 2. Verifikation der Ist-Stand-Tabelle aus `ausrichtung-links-req.md`

Zeilen unten sind die **tatsächlichen** aktuellen Zeilen (Working Tree, 2026-07-04).

| Fundstelle (Symbol) | tatsächliche Zeile | Ergebnis |
|---|---|---|
| `schema.ts` `alignAttr`, Default `'left'` | 4 | Bestätigt. |
| `schema.ts` `paragraph.toDOM` / `heading.toDOM` (`text-align`) | 21–23 / 35–37 | Bestätigt. |
| `schema.ts` `paragraph`/`heading` `parseDOM.getAttrs` (`style.textAlign \|\| 'left'`) | 20 / 33 | Bestätigt. **Zusatzbefund:** kein Normalisieren — per Paste eingefügtes `text-align:start/end` bliebe wörtlich stehen (gleiche Klasse wie Fehler 5, siehe 5.5). |
| `commands.ts` `type Align` / `alignableTypes` | 8 / 10 | Bestätigt. |
| `commands.ts` `setAlign` (kein Toggle, `nodesBetween` Z. 17, `dispatch` in Schleife Z. 21) | 13–27 | Bestätigt — **und** nicht funktionsfähig bei > 1 Block (Fehler 1). |
| `commands.ts` `isAlignActive` (nur `$from`, Vergleich Z. 34) | 29–38 | Bestätigt. |
| `commands.ts` `setHeading` (`align:'left'` Z. 43, `sameParent`-Guard Z. 45) | 40–55 | Bestätigt (Fehler 6). |
| `Toolbar.tsx` `run` (führt Command aus, dann `view.focus()` Z. 30) | 28–31 | Bestätigt. |
| `Toolbar.tsx` `MarkButton` (`aria-label={title}` Z. 74, nur `onMouseDown` Z. 76) | 55–89 | Bestätigt. |
| `Toolbar.tsx` `AlignButton` (`title="Ausrichtung: ${align}"` Z. 96, `aria-pressed` Z. 97, `onMouseDown`+`preventDefault` Z. 98–99, `run(setAlign)` Z. 100, **kein** `aria-label`, **kein** `onClick`) | 91–111 | Bestätigt (Fehler 7/8). |
| `Toolbar.tsx` `AlignButton`-Instanzen (`align="left" label="⇤"` Z. 234) | 234–237 | Bestätigt. |
| `Toolbar.tsx` Absatzformat-`<select>` (`setHeading`) | 165–180 | Bestätigt. |
| `WordEditor.tsx` `reconcileSelectionOnClick` (+ `mouseup`-Handler `onMouseUp` Z. 146–153) | 43–50 | Bestätigt. |
| `WordEditor.tsx` Keymap (`Mod-b/i/u` Z. 98–100, **kein** Ausrichtungskürzel) | 85–107 | Bestätigt (Fehler 7). |
| `WordEditor.tsx` `dispatchTransaction` (`onChange` je `docChanged` Z. 128–130) | 125–133 | Bestätigt (relevant für Fehler 1: `view.state.apply(tr)` gegen den bereits aktualisierten `view.state`). |
| `docx/reader.ts` `JC_TO_ALIGN` (`{left,center,right,both→justify}`) | 14 | Bestätigt — kein `start`/`end`/`distribute` (Fehler 4). |
| `docx/reader.ts` `HeadingInfo` (nur `outlineLvlByStyleId`) / `parseStylesXml` (liest nur `outlineLvl`) | 49–51 / 53–67 | Bestätigt — **keine** Auswertung von Stil-`w:jc` (Fehler 3). |
| `docx/reader.ts` `paragraphToBlocks` (`pStyle` Z. 236, `jc` Z. 238–239, `align = JC_TO_ALIGN[jcVal] ?? 'left'` Z. 240) | 229–280 | Bestätigt. |
| `docx/reader.ts` `emptyParagraph` (`align:'left'`) | 224–226 | Bestätigt. |
| `docx/writer.ts` `JC_BY_ALIGN` (`{…, justify→both}`) | 18 | Bestätigt. |
| `docx/writer.ts` `paragraphPropsXml` (schreibt **immer** `<w:jc>`, `jc` Z. 70, Element Z. 71) | 69–72 | Bestätigt. |
| `docx/writer.ts` Absatz-/Überschrift-`align` (`?? 'left'`) | 113 / 121 | Bestätigt. |
| `odt/reader.ts` `parseAutomaticStyles` (liest `fo:text-align` Z. 65, setzt Map **ohne** Normalisierung Z. 66, nur `office:automatic-styles`) | 37–78 | Bestätigt (Fehler 5). |
| `odt/reader.ts` Absatz-/Überschrift-Konsumstelle (`(styleName && …get(styleName)) \|\| 'left'`) | 178 / 259 | Bestätigt. |
| `odt/styleRegistry.ts` `PARAGRAPH_ALIGN_STYLE_NAME` / `paragraphAlignStyleDefs` | 61–66 / 68–75 | Bestätigt. |
| `odt/styleRegistry.ts` `headingStyleName` / `headingStyleDefs` (pro Ebene × 4 Ausrichtungen) | 80–82 / 84–93 | Bestätigt. |
| `odt/writer.ts` Absatz-Align-Stilwahl (`PARAGRAPH_ALIGN_STYLE_NAME[align] ?? …left` Z. 89) / Überschrift (`headingStyleName` Z. 97) | 87–92 / 93–98 | Bestätigt. |
| `documentModel.ts` `emptyDocJSON` (`{type:'paragraph', attrs:{align:'left'}}`) | 11 | Bestätigt (deckt Grenzfall 4.1 im Modell ab). |
| Unit-Rundreise `docx/__tests__/roundtrip.test.ts` (Heading-Align `center` Z. 47–51; `it.each(['left','center','right','justify'])` Z. 54–59) | — | Bestätigt — nur **ein** Block je Fall, `setAlign` nie aufgerufen. Genau die Lücke, durch die Fehler 1 unentdeckt blieb. |
| Unit-Rundreise `odt/__tests__/roundtrip.test.ts` (Heading-Align Z. 49–53; `it.each` Z. 56–61) | — | Bestätigt, analog. |
| E2E-Abdeckung Ausrichtung: `tests/e2e/roundtrip-fidelity.spec.ts` „Criterion 4" (`text-align: center`) | 56–58 (Re-Verify 128–129/178–179/242–243) | **Existiert** (für `center`, ohne je einen `AlignButton` zu klicken). Siehe Abschnitt 0.0 Punkt 2. |

Keine Symbol-Fundstelle der Anforderung ist falsch. Die acht Fehler in Abschnitt 3 liegen
**zusätzlich** zu den dort als „zu verifizieren" markierten Punkten.

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
          dispatch(state.tr.setNodeAttribute(pos, 'align', align)) // Z. 21
        }
      }
    })
    return applicable
  }
}
```

**Ursache:** `dispatch()` wird **innerhalb** der `nodesBetween`-Schleife pro gefundenem Block
aufgerufen — bei zwei Absätzen also **zweimal**. `state` ist der beim Command-Aufruf einmalig
übergebene, unveränderliche Parameter; `state.tr` ist ein Getter, der jedes Mal eine **neue
Transaktion auf Basis desselben ursprünglichen Dokuments** liefert (`tr.before` = das
Original-Doc). `WordEditor.tsx`s `dispatchTransaction` (Z. 125–133) ruft dagegen bei jedem
Dispatch `view.state.apply(tr)` und `view.updateState(newState)` auf — nach dem **ersten**
Dispatch ist `view.state.doc` bereits verändert. Beim **zweiten** Dispatch prüft
`EditorState.applyInner` intern `tr.before.eq(this.doc)`; das schlägt fehl, weil `tr.before`
noch das Original-Doc trägt, `view.state.doc` aber das nach dem ersten Dispatch geänderte —
`RangeError: Applying a mismatched transaction`.

**Reproduktion (ausgeführt gegen den echten Code, assertiert grün):**

```
Vorher:  ['center','center']   // Zwei-Absatz-Dokument, TextSelection über beide
setAlign('left')(view.state, view.dispatch)
=> wirft RangeError: Applying a mismatched transaction
Doc danach: ['left','center']  // erster Absatz gesetzt, zweiter verloren
```

Zusätzlich: `run()` in `Toolbar.tsx` (Z. 28–31) ruft `view.focus()` **nach** dem
Command auf — bei geworfener Exception wird das nie erreicht, der Fokus geht zusätzlich
verloren (verschärft Grenzfall 4.15 genau im zu prüfenden Szenario).

**Reichweite:** Jede Selektion über ≥ 2 alignierbare Blöcke — der Kernfall aus Abschnitt 3.2
der Anforderung, Testfall 4/Grenzfall 4.4, Testfall 13 (Strg+A/`AllSelection` bildet **eine**
`SelectionRange` über das ganze Dokument), Grenzfall 4.14. „Alles auswählen → linksbündig"
auf einem Dokument mit > 1 Absatz — der alltäglichste denkbare Fall — ist betroffen.

**Fix:** `setAlign` akkumuliert **eine einzige** Transaktion und dispatcht **höchstens einmal**
— analog zu `toggleMark` aus `prosemirror-commands`, das über `state.selection.ranges`
iteriert statt über `.from`/`.to`. Das behebt gleichzeitig Fehler 2 **und** die in Abschnitt
3.10 der Anforderung offene Frage zum wirkungslosen Undo-Schritt (kein Dispatch, wenn nichts
geändert):

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

Positions-Sicherheit: Attribut-Steps verändern keine Positionen/Größen, daher bleiben die aus
dem Original-Doc gesammelten `pos` über alle akkumulierten Steps hinweg gültig — dieselbe
Eigenschaft, auf der auch `toggleMark`s Sammel-Transaktion beruht.

### 3.2 Fehler 2 (hoch): Tabellen-Zellauswahl — Verhalten ist das Gegenteil der Vermutung in Grenzfall 4.8

**Datei:** dieselbe Funktion; betrifft `state.selection.from`/`.to` bei einer `CellSelection`.

Grenzfall 4.8 vermutet, `nodesBetween(from, to)` erfasse „versehentlich auch
dazwischenliegende, nicht markierte Zellen". Die **Ausführung** zeigt das Gegenteil: In
`prosemirror-state` liefert `Selection.from`/`.to` ausschließlich `ranges[0]`; bei einer
`CellSelection` (`prosemirror-tables`) ist `ranges[0]` per Konstruktor die **Kopf-Zelle** des
Auswahlvorgangs (`cells.unshift($headCell…)`). `from`/`.to` überspannen daher nur deren
Inhalt.

Reproduktion (3×3-Tabelle, `CellSelection.create(doc, B1, B3)` über die mittlere Spalte,
assertiert grün):

```
selection.ranges.length          === 3      // B1, B2, B3 sind alle in ranges
nodesBetween(from, to) besucht    === 1 Absatz   // nur die Kopf-Zelle
nach setAlign('left'): B-Zellen mit align==='left' === 1  (von 3)
Spalten A und C                   unverändert 'center'
```

`setAlign` erfasst also **nur die Zelle, auf der die Auswahlbewegung endete** — **nicht** alle
drei markierten Zellen und **nicht** die nicht markierten Spalten 1/3 (die 4.8 als Risiko
benennt). Es ist **Unter-**, nicht **Überanwendung**: zwei sichtbar markierte Zellen bleiben
bei „Links" stehen — ein sichtbar inkonsistentes Ergebnis („Button tut nur teilweise etwas").

Der Fix aus 3.1 behebt dies mit: `for (const range of state.selection.ranges)` iteriert bei
einer `CellSelection` über **alle** Zellen der Selektionsfläche (jede Zelle liefert eine eigene
`SelectionRange`), exakt wie `CellSelection.forEachCell` (das `prosemirror-tables` selbst für
`setCellAttr` nutzt) — ohne dass `setAlign` `CellSelection` als Spezialfall kennen muss.

**Schärfung des Testfalls (Testfall 6.4-7/Grenzfall 4.8):** Der Test muss **Spalte 2
vollständig** prüfen (alle drei Zellen `left`), nicht nur „Spalten 1/3 unverändert" — sonst
bemerkt er die Vor-Fix-Unteranwendung (1 von 3) gar nicht.

### 3.3 Fehler 3 (hoch): DOCX-Reader ignoriert Formatvorlagen-Ausrichtung

**Datei:** `src/formats/docx/reader.ts`, `parseStylesXml` (Z. 53–67) und `paragraphToBlocks`
(Z. 229–280, `jc`-Auswertung Z. 238–240).

`parseStylesXml` liest aus `styles.xml` **ausschließlich** `w:outlineLvl` (Z. 59–64, für die
Überschriften-Ebene) — **nicht** das `w:jc` innerhalb der Formatvorlage. `paragraphToBlocks`
liest **ausschließlich** `w:pPr/w:jc` direkt am Absatz (Z. 238–239); fehlt es (Ausrichtung nur
über die referenzierte Vorlage, ggf. über eine `w:basedOn`-Kette), greift `jcVal = … ?? 'left'`
(Z. 239) und `align = JC_TO_ALIGN[jcVal] ?? 'left'` (Z. 240) — unabhängig davon, was die Vorlage
festlegt.

**Belegt mit echter Fremddatei** (XML direkt geprüft):
`tests/fixtures/external/docx/bug-paragraph-alignment.docx`:

```
Absatz 1: <w:pStyle w:val="Title"/>, KEIN direktes <w:jc>,
          Text: "This paragraph does not have explicit alignment, it's centered per the paragraph style."
Absatz 2: <w:jc w:val="left"/> direkt am Absatz.
styles.xml: <w:style w:styleId="Title"> … <w:pPr><w:jc w:val="center"/></w:pPr> …
```

Der aktuelle Reader importiert **beide** Absätze als `align:'left'` — Absatz 1 verliert seine
(laut eigenem Dateitext!) zentrierte Darstellung ununterscheidbar von echtem linksbündigem
Text. Die Datei ist bereits Teil des generischen „importiert ohne Absturz"-Tests
(`docx/__tests__/external-fixtures.test.ts`) und besteht dort heute unbemerkt, weil er nur
„crasht nicht" prüft, nicht den Ausrichtungswert.

**Fix:** `parseStylesXml` um eine `alignByStyleId: Map<string, Align>` erweitern, die pro
Formatvorlage deren **direkt** deklariertes `w:jc` sowie — über eine `w:basedOn`-Kette mit
Tiefenbegrenzung nach dem Muster `MAX_TABLE_NESTING_DEPTH` (`reader.ts:309`) — das **geerbte**
`w:jc` auflöst. `paragraphToBlocks` verwendet diese Map als Fallback **zwischen** direktem
`w:jc` und dem `'left'`-Default:

```ts
const directJc = jcEl?.getAttributeNS(OOXML_NAMESPACES.w, 'val')
const styleJc = styleId ? headingInfo.alignByStyleId.get(styleId) : undefined
const align = normalizeAlign(directJc ?? styleJc)   // direkt gewinnt gegen Vorlage (Word-Semantik)
```

`normalizeAlign` siehe Fehler 4/5 (Abschnitt 5.1). Direkte Absatzformatierung gewinnt
weiterhin gegen die Vorlage — das entspricht Word-Semantik und dem bereits korrekten
Verhalten für Absatz 2 der Beispieldatei.

### 3.4 Fehler 4 (hoch): `w:jc="end"` wird als „links" statt „rechts" importiert

**Datei:** `src/formats/docx/reader.ts:14`, `JC_TO_ALIGN`.

```ts
const JC_TO_ALIGN: Record<string, string> = { left: 'left', center: 'center', right: 'right', both: 'justify' }
```

Weder `start` noch `end` sind enthalten. Grenzfall 4.11 benennt nur `distribute` und übersieht,
dass **derselbe** Fallback (`JC_TO_ALIGN[jcVal] ?? 'left'`, Z. 240) auch `end` trifft: Nach
ECMA-376 bedeutet `w:jc="end"` in einem LTR-Dokument „rechtsbündig"; der aktuelle Code bildet
es auf `left` ab — das **exakte Gegenteil**, nicht nur eine unscharfe Näherung. Ein
rechtsbündiger Absatz aus einer solchen Datei erscheint nach Import **und** jedem weiteren
Export als „links".

Reale Werte im Korpus (nur `w:pPr/w:jc`, **nicht** `w:tblPr/w:jc` — siehe Abschnitt 3.6):
`rtl.docx`, `table-indent.docx`, `unicode-path.docx` nutzen `w:jc="start"`; kein Fixture nutzt
`w:pPr/w:jc="end"` — dafür ist ein handgebauter Test nötig (Abschnitt 6.2).

**Fix:** Gemeinsame `normalizeAlign`-Funktion (Abschnitt 5.1, neue Datei
`src/formats/shared/align.ts`) ersetzt `JC_TO_ALIGN`, mit `end` → `right` als zentraler
Korrektur.

### 3.5 Fehler 5 (hoch): ODT-Reader normalisiert `fo:text-align` überhaupt nicht

**Datei:** `src/formats/odt/reader.ts`, `parseAutomaticStyles` (Z. 37–78; `fo:text-align`
gelesen Z. 65, ungeprüft in die Map gesetzt Z. 66), Konsum in `paragraphToBlocks` (Z. 178) und
`elementToBlocks`-Heading (Z. 259). Bestätigt wie in Grenzfall 4.10 beschrieben; mit echten
Fremddateien belegt (Werte direkt ausgelesen):

| Datei | `fo:text-align`-Werte |
|---|---|
| `EasyList.odt` | `end` (3×) |
| `FruitDepot-SeasonalFruits4.odt` | `start` (2×) |
| `feature_attributes_paragraph_MSO2013.odt` | `center`, `end`, `justify` (gemischt — ideal für einen kombinierten Testfall) |

Import lässt `align:'start'`/`'end'` **wörtlich** im internen Dokument stehen: Editor zeigt via
CSS `text-align:start` optisch korrekt an, aber `isAlignActive` vergleicht strikt `=== 'left'`
(`commands.ts:34`) und zeigt **keinen** aktiven Button; erst der Export normalisiert spät über
den `?? …left`-Fallback der Writer.

**Fix:** `parseAutomaticStyles` wendet `normalizeAlign` **beim Einlesen** auf den Wert an
(Z. 65–66), sodass ab dem Import ausschließlich kanonische Werte im Dokumentmodell existieren:

```ts
const align = props?.getAttributeNS(ODF_NAMESPACES.fo, 'text-align')
if (align) paragraphAligns.set(name, normalizeAlign(align))
```

**Verwandte, geringere Lücke (Parität zu Fehler 3, kein mit einer echten Datei belegter
sichtbarer Bug):** `parseAutomaticStyles` liest nur `office:automatic-styles`, nicht
`office:styles`, und löst `style:parent-style-name`-Ketten nicht auf — analog „Lücke B" in
`unterstrichen-einfach-code.md` Abschnitt 3.2 (dort für Zeichenstile). `HelloWorld.odt`
referenziert `text:style-name="Standard"`, was mangels Eintrag auf `'left'` zurückfällt
(zufällig richtig). Empfehlung: gemeinsam mit „Lücke B" in einem eigenen, formatübergreifenden
Umbau angehen (Abschnitt 5.8).

### 3.6 Verifikations-Hinweis (kein Fehler): `w:jc` existiert in zwei Bedeutungen

`tests/fixtures/external/docx/table-alignment.docx` ist trotz Namens **keine** brauchbare
Absatz-Fixture: alle `w:jc`-Werte stehen dort in `w:tblPr` (Ausrichtung der **Tabelle** auf der
Seite), nicht in `w:pPr` (Absatztext). Der Reader liest `w:jc` strikt aus `w:pPr`
(`firstChildNS(pPr, …)`, Z. 238) und ist davon **nicht** betroffen. Kein Fix nötig — aber ein
Hinweis für die Fixture-Auswahl: ein reines `grep w:jc` ohne Kontext-Prüfung interpretiert
table-level Treffer fälschlich als Absatz-Ausrichtung.

### 3.7 Fehler 6 (mittel): Formatvorlagen-Wechsel setzt Ausrichtung hart zurück

**Datei:** `src/formats/shared/editor/commands.ts:40-55`, `setHeading`. Bestätigt (Grenzfall 4.9):

```ts
const attrs = level === null ? undefined : { level, align: 'left' }   // Z. 43
```

Standard→Überschrift setzt `align:'left'` **hart**; Überschrift→Standard übergibt
`attrs:undefined` ⇒ Schema-Default `'left'`. Beide Richtungen verwerfen eine zuvor gesetzte
Ausrichtung stillschweigend.

**Entscheidung (Abschnitt 7):** zu behebender Fehler, **kein** gewolltes Verhalten.
Word/LibreOffice setzen die Absatzausrichtung beim Formatvorlagen-Wechsel nicht zurück.

**Fix:**

```ts
export function setHeading(level: number | null): Command {
  return (state, dispatch) => {
    const { $from, $to } = state.selection
    if (!$from.sameParent($to)) return false
    const parent = $from.parent
    if (!alignableTypes.has(parent.type.name)) return false
    const align = parent.attrs.align ?? 'left'   // bestehende Ausrichtung bewahren
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

### 3.8 Fehler 7 (niedrig, UX/Barrierefreiheit): fehlende Tastenkürzel, `aria-label`, unlokalisierter Titel

Bestätigt (Anforderung Abschnitt 2 Zeilen 2/4; Grenzfall 4.16). Keymap `WordEditor.tsx:85-107`
bindet **kein** `Mod-l/e/r/j`; `AlignButton` (`Toolbar.tsx:91-111`) hat `title="Ausrichtung:
${align}"` (Z. 96, zeigt den internen Bezeichner „left") und **kein** `aria-label`.
Entscheidung (Abschnitt 7): alles nachrüsten.

### 3.9 Fehler 8 (mittel, konsistent mit `fett-code.md`): `AlignButton` nur per Maus auslösbar

**Datei:** `Toolbar.tsx` `AlignButton` (Z. 91–111), verwendet ausschließlich `onMouseDown`
(Z. 98). Tastatur-Aktivierung eines `<button>` (Tab + Enter/Space) feuert **`click`**, nicht
`mousedown` — die Aktion bleibt daher per Tastatur unerreichbar. Identischer Defekt wie bei
`MarkButton` (`Toolbar.tsx:76`); in `specs/fett-code.md` (Abschnitt 4, `:115`) als Fix
**vorgesehen** (`onClick` für die Aktion, `onMouseDown` nur noch für `preventDefault`), im Code
aber **noch nicht** umgesetzt — beide Button-Familien teilen den Defekt aktuell. Da
`ausrichtung-links-req.md` keine explizite Tastatur-Bedienbarkeit **des Buttons** fordert (nur
das Ausrichtungs-Kürzel Strg+L, Fehler 7), niedrigere Priorität als Fehler 1–6, aber im selben
`Toolbar.tsx`-Umbau miterledigt (Abschnitt 5.3), damit nicht zwei Button-Familien in derselben
Datei denselben Bug unterschiedlich behandeln.

---

## 4. Zusätzliche Klarstellungen (keine Fehler, aber zu dokumentieren)

- **`isAlignActive` bei `CellSelection`:** `$from` ist `ranges[0].$from`, also die Kopf-Zelle
  (siehe Fehler 2). Der Button zeigt auch nach dem Fix von Fehler 2 nur den Zustand **dieser
  einen** Zelle — konsistent mit dem für normale Mehrfachselektion dokumentierten Verhalten
  (Anforderung 3.4/Grenzfall 4.4/4.5: „Zustand am Selektionsanfang"). Nicht separat behoben,
  hier nur vermerkt, damit es nicht als neuer Fund missverstanden wird. Ein Kommentar an
  `isAlignActive` verweist darauf (Abschnitt 5.2).
- **`normalizeAlign`, RTL/bidi:** `start`/`end` sind schreibrichtungs-relativ. Diese Anwendung
  hat **an keiner Stelle** ein RTL-/bidi-Konzept (kein `dir`, kein `w:bidi`, kein
  `style:writing-mode` — in `src/` gesucht, keine Treffer). `normalizeAlign` bildet
  `start`→`left`/`end`→`right` **unbedingt** ab (LTR-Annahme, die bereits überall implizit
  gilt). Für `rtl.docx` (arabisch, `w:jc="start"`) bleibt das Ergebnis „links" — **identisch**
  zum heutigen `?? 'left'`-Fallback, also **keine Regression**, aber eine bewusst dokumentierte
  Grenze. Echte RTL-Unterstützung ist nicht Teil dieser Anforderung.
- **`distribute` (Grenzfall 4.11):** `normalizeAlign` bildet auf `'justify'` ab (nähere Näherung
  als „links", wie von der Anforderung vorgeschlagen). Keine perfekte Entsprechung, aber
  deutlich näher am Original als der aktuelle Zustand.
- **Wirkungsloser Undo-Schritt (Anforderung 3.10):** Der Fix aus 3.1 dispatcht bei einem
  no-op-Klick (`node.attrs.align === align` für alle betroffenen Blöcke) **gar keine**
  Transaktion (`tr.docChanged === false`) — es entsteht kein nutzloser Undo-Schritt. Der
  Rückgabewert bleibt `applicable === true`, sodass `prosemirror-keymap` das Kürzel als
  „behandelt" wertet und die Browser-Standardaktion unterdrückt.

---

## 5. Dateigenauer Umsetzungsplan

### 5.1 `src/formats/shared/align.ts` (neu)

Zentrale, ProseMirror-unabhängige Normalisierung — bewusst **kein** Import von `prosemirror-*`
(diese Datei wird auch von `docx/reader.ts`/`odt/reader.ts` genutzt, die selbst keine
ProseMirror-Abhängigkeit haben):

```ts
export type Align = 'left' | 'center' | 'right' | 'justify'

const ALIGN_ALIASES: Record<string, Align> = {
  left: 'left',
  start: 'left',        // LTR-only-Vereinfachung, siehe Abschnitt 4
  center: 'center',
  right: 'right',
  end: 'right',
  justify: 'justify',
  both: 'justify',      // OOXML w:jc-Wert für Blocksatz
  distribute: 'justify',// nächstliegende Näherung, siehe Abschnitt 4
}

/**
 * Canonicalizes a raw alignment keyword from OOXML (`w:jc/@w:val`), ODF
 * (`fo:text-align`), or pasted HTML (`style.textAlign`) into one of the four
 * values the schema/commands/writers understand. Missing/unrecognized values
 * fall back to 'left' (the schema default). Single source of truth so DOCX
 * reader, ODT reader, and the paste-import path in schema.ts can never disagree.
 */
export function normalizeAlign(raw: string | null | undefined): Align {
  if (!raw) return 'left'
  return ALIGN_ALIASES[raw.toLowerCase()] ?? 'left'
}
```

### 5.2 `src/formats/shared/editor/commands.ts` (geändert)

- `export type Align = …` (Z. 8) ersetzen durch `export type { Align } from '../align'`
  (bestehende Importe wie `Toolbar.tsx`s `import { …, type Align } from './commands'` bleiben
  kompatibel).
- `setAlign` (Z. 13–27) → Fassung aus Abschnitt 3.1 (behebt Fehler 1 **und** 2).
- `setHeading` (Z. 40–55) → Fassung aus Abschnitt 3.7 (behebt Fehler 6).
- `isAlignActive` (Z. 29–38): keine funktionale Änderung, nur Kommentar mit Verweis auf
  Abschnitt 4 (Verhalten bei `CellSelection`).

### 5.3 `src/formats/shared/editor/Toolbar.tsx` (geändert)

`AlignButton` (Z. 91–111):

- Lokalisierte, konsistente `title`/`aria-label` (Fehler 7) und `onClick`-Trennung (Fehler 8):

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
      onMouseDown={(e) => e.preventDefault()}   // nur Fokus-/Selektionserhalt
      onClick={() => run(view, setAlign(align))} // funktioniert auch per Tastatur
      className={/* unverändert, Z. 102–106 */}
    >
      {icon}
    </button>
  )
}
```

  (Identisches Muster wie `fett-code.md` Abschnitt 4 für `MarkButton`; da dieser Umbau auch
  `MarkButton` in derselben Datei berührt, `MarkButton` bei der Gelegenheit gleich mit
  umstellen — sonst blieben zwei Button-Familien in einer Datei uneinheitlich.)

- Vier kleine inline-SVG-Icon-Komponenten (`AlignLeftIcon`/`Center`/`Right`/`Justify`;
  Material-Symbols-Pfade `format_align_*`, Apache-2.0 — gleiche Lizenz-/Begründungslage wie
  `ScissorsIcon`, `Toolbar.tsx:33-53`, und `BoldIcon` in `fett-code.md`) ersetzen die reinen
  Unicode-Zeichen-Labels (`⇤ ↔ ⇥ ≡`) — behebt das Icon-Rendering-Risiko aus Anforderung
  Abschnitt 2 Zeile 4 sowie `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 17/20.1.
- Aufrufstellen (Z. 234–237):

```tsx
<AlignButton view={view} align="left" icon={<AlignLeftIcon />} />
<AlignButton view={view} align="center" icon={<AlignCenterIcon />} />
<AlignButton view={view} align="right" icon={<AlignRightIcon />} />
<AlignButton view={view} align="justify" icon={<AlignJustifyIcon />} />
```

### 5.4 `src/formats/shared/editor/WordEditor.tsx` (geändert)

Keymap (Z. 85–107) um vier Standard-Tastenkombinationen ergänzen (Fehler 7, Teil 1; deckt
zugleich die drei Schwester-Anforderungen `ausrichtung-zentriert/-rechts/-blocksatz` ab):

```ts
import { cutSelection, insertHardBreak, setAlign } from './commands'
// ...
keymap({
  // ... bestehende Einträge (Z. 93–106) unverändert ...
  'Mod-l': setAlign('left'),
  'Mod-e': setAlign('center'),
  'Mod-r': setAlign('right'),
  'Mod-j': setAlign('justify'),
}),
```

`setAlign(align)` hat bereits die `Command`-Signatur `(state, dispatch?) => boolean`, passt
also unverändert in `keymap()`. Kein Konflikt mit `Mod-z/y/b/i/u`, `Shift-Delete` oder
`baseKeymap`. Bei `true`-Rückgabe ruft `prosemirror-keymap` automatisch `preventDefault()`
auf, wodurch kollidierende Browser-Aktionen (Chrome „Downloads"/Strg+J, Adressleiste/Strg+L)
unterdrückt werden, **solange der Fokus im Editor liegt** — ein E2E-Test muss das nachweisen
(Abschnitt 6.4 Punkt 10).

### 5.5 `src/formats/shared/schema.ts` (geändert)

`getAttrs` für `paragraph` (Z. 20) und die sechs `heading`-Level (Z. 33) auf `normalizeAlign`
umstellen (schließt die in Abschnitt 2 zusätzlich gefundene Paste-Import-Lücke):

```ts
import { normalizeAlign } from './align'
// paragraph (Z. 20):
parseDOM: [{ tag: 'p', getAttrs: (dom) => ({ align: normalizeAlign((dom as HTMLElement).style.textAlign) }) }],
// heading (Z. 31–34, analog für alle Level):
getAttrs: (dom) => ({ level, align: normalizeAlign((dom as HTMLElement).style.textAlign) }),
```

`toDOM` (Z. 21–23 / 35–37) bleibt unverändert — `text-align:<kanonischer Wert>` ist gültiges CSS.

### 5.6 `src/formats/docx/reader.ts` (geändert)

- `JC_TO_ALIGN` (Z. 14) entfernen, durch `normalizeAlign` aus `../shared/align` ersetzen
  (Fehler 4).
- `HeadingInfo` (Z. 49–51) um `alignByStyleId: Map<string, Align>` erweitern; `parseStylesXml`
  (Z. 53–67) um die `w:jc`/`w:basedOn`-Auflösung aus Abschnitt 3.3 ergänzen (Fehler 3),
  Tiefenbegrenzung nach dem Muster `MAX_TABLE_NESTING_DEPTH` (Z. 309).
- `paragraphToBlocks` (Z. 229–280): `jc`-Ermittlung (Z. 238–240) wie in Abschnitt 3.3 um den
  Formatvorlagen-Fallback erweitern, `align` über `normalizeAlign(directJc ?? styleJc)` statt
  der Lookup-Tabelle bestimmen. `emptyParagraph` (Z. 224–226) bleibt (`align:'left'`).

### 5.7 `src/formats/docx/writer.ts` (keine funktionale Änderung)

`JC_BY_ALIGN` (Z. 18) bleibt — nach den Fixes 5.5/5.6/5.8 enthält das Dokumentmodell hier nur
noch kanonische `Align`-Werte, die Tabelle deckt alle vier ab. `paragraphPropsXml` (Z. 69–72)
schreibt weiterhin **immer** ein explizites `<w:jc w:val="left"/>` auch für den Default — laut
Rundreise-Testfall 5.1.3 der Anforderung als korrekt (von Word/LibreOffice gleichbedeutend mit
fehlendem Element) zu bestätigen (Testfall Abschnitt 6.2/6.5).

### 5.8 `src/formats/odt/reader.ts` (geändert)

`parseAutomaticStyles` (Z. 37–78): `fo:text-align`-Wert (Z. 65) vor dem Eintragen in
`paragraphAligns` (Z. 66) durch `normalizeAlign` schicken (Fehler 5):

```ts
import { normalizeAlign } from '../shared/align'
// Z. 65–66:
const align = props?.getAttributeNS(ODF_NAMESPACES.fo, 'text-align')
if (align) paragraphAligns.set(name, normalizeAlign(align))
```

Die Konsumstellen (Z. 178, 259) ändern sich nicht (`|| 'left'` bleibt, greift jetzt nur noch,
wenn wirklich **kein** Stil referenziert bzw. kein `fo:text-align` gefunden wurde).

**Nicht Teil des Mindestumfangs** (Abschnitt 3.5, „verwandte Lücke"): Auflösung von
`office:styles`/`style:parent-style-name` für Absatzausrichtung. Empfehlung: gemeinsam mit
„Lücke B" aus `unterstrichen-einfach-code.md` in einem eigenen, formatübergreifenden Umbau.

### 5.9 `src/formats/odt/writer.ts` / `styleRegistry.ts` (keine Änderung)

`PARAGRAPH_ALIGN_STYLE_NAME`/`headingStyleName` (`styleRegistry.ts:61-66` / `80-82`) decken
bereits alle vier kanonischen Werte ab; nach Fix 5.8 kommen beim Export nur noch kanonische
Werte an. Der `?? PARAGRAPH_ALIGN_STYLE_NAME.left`-Fallback (`writer.ts:89`) wird dadurch
unerreichbarer Verteidigungscode, bleibt aber bewusst stehen (Robustheit gegen künftige, nicht
über `normalizeAlign` laufende Aufrufer, z. B. direkt konstruierte Test-Dokumente).

### 5.10 `src/formats/shared/documentModel.ts` (keine Änderung)

Bereits korrekt: `emptyDocJSON` (Z. 11) enthält explizit `{ type:'paragraph', attrs:{ align:
'left' } }` statt eines leeren Attribut-Satzes — deckt Grenzfall 4.1 im Modell ab, nur der Test
fehlt (Abschnitt 6.4 Punkt 1).

---

## 6. Testplan

### 6.1 Erweiterung: `src/formats/shared/editor/__tests__/commands.test.ts`

**Korrektur gegenüber der vorherigen Fassung dieses Abschnitts:** Diese Datei existiert
bereits (angelegt durch das „Ausschneiden"-Feature, Commit `9f8fa03`) und enthält aktuell
ausschließlich `describe('canCut', …)`/`describe('cutSelection', …)` — keine Zeile zu
`setAlign`/`isAlignActive`/`setHeading`. Die vorherige Fassung dieses Plans behauptete
„Neu: …/commands.test.ts" und lieferte einen kompletten Datei-Header (`import …`,
`makeView`) so, als würde die Datei frisch angelegt — das hätte den bestehenden
`canCut`/`cutSelection`-Import (`import { canCut, cutSelection } from '../commands'`, Z. 3
der bestehenden Datei) und dessen Tests überschrieben. Richtig ist: **ergänzen**, nicht
anlegen — ein neuer `import`-Eintrag (`setAlign, isAlignActive, setHeading` zusätzlich zu
`canCut, cutSelection`) und zwei neue `describe`-Blöcke (`setAlign`/`setHeading`) werden an
die bestehende Datei angehängt; `stateWithDoc()` (bestehende Datei, Z. 5–11) baut ein
Doc **ohne** mehrere Absätze und ist für die Align-Tests ungeeignet — die neuen Tests
brauchen einen eigenen Doc-Aufbau (`makeView`, unten) mit mind. zwei Absätzen bzw. einer
3×3-Tabelle.

Kernstück — die einzige Ebene, die Fehler 1/2/6 fangen kann, da Reader/Writer-Rundreisetests
`setAlign`/`setHeading` nie aufrufen. Echte `EditorView` unter `jsdom` (bereits Dev-Dependency,
`vitest` läuft mit `jsdom`-Environment) mit der `dispatchTransaction`-Verdrahtung aus
`WordEditor.tsx`. Der in Abschnitt 1 verwendete Wegwerf-Test (in dieser Prüfrunde am
2026-07-05 unverändert erneut ausgeführt und identisch reproduziert, siehe Kasten unten) wird
hier zum dauerhaften Regressionstest verstetigt — als **zusätzliche** `describe`-Blöcke in der
bestehenden Datei, mit einem eigenen, lokalen `makeView`-Helfer (Namenskollision mit der
bestehenden `fakeView`-Hilfsfunktion, Z. 41, vermeiden):

```ts
// Bestehende Zeile 1 wird um EditorView-Bedarf ergänzt (EditorState/TextSelection sind
// bereits importiert); bestehende Zeile 3 wird um die drei neuen Symbole erweitert:
import { EditorState, TextSelection, NodeSelection, AllSelection } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { CellSelection } from 'prosemirror-tables'
import { history, undo } from 'prosemirror-history'
import { wordSchema } from '../../schema'                                    // bereits vorhanden (Z. 2)
import { canCut, cutSelection, setAlign, isAlignActive, setHeading } from '../commands' // erweitert (Z. 3)

function makeView(json: unknown, plugins: any[] = []) {
  const doc = wordSchema.nodeFromJSON(json)
  const state = EditorState.create({ doc, schema: wordSchema, plugins })
  const view = new EditorView(document.createElement('div'), {
    state,
    dispatchTransaction(tr) { view.updateState(view.state.apply(tr)) },
  })
  return view
}
```

Tests (mind.):
1. **Regression Fehler 1:** Zwei zentrierte Absätze, `TextSelection` über beide →
   `setAlign('left')` wirft **nicht** und ergibt `['left','left']` (vor dem Fix:
   `RangeError`, `['left','center']`).
2. **No-op-Klick (Anforderung 3.10):** ein bereits linksbündiger Absatz → `setAlign('left')`
   liefert `applicable === true`, aber `view.state` bleibt **identisch** (keine Transaktion).
3. **Ein echter Wechsel = ein Undo-Schritt:** mit `history()`-Plugin; zwei zentrierte Absätze,
   Selektion über beide, `setAlign('left')`, dann **ein** `undo` → wieder `['center','center']`.
4. **Regression Fehler 2 (CellSelection, Grenzfall 4.8):** 3×3-Tabelle, `CellSelection.create`
   über die mittlere Spalte → nach `setAlign('left')` sind **alle drei** Zellen der mittleren
   Spalte `left`, Spalten 1/3 unverändert `center` (prüft Spalte 2 **vollständig**, siehe 3.2).
5. **Fehler 6 (`setHeading`):** Standard→Überschrift 1 erhält eine zuvor gesetzte Zentrierung;
   Überschrift 1→Standard erhält eine zuvor gesetzte Rechtsbündigkeit.
6. **`isAlignActive`:** neuer Default-Absatz → `isAlignActive(state,'left') === true` ohne
   jeden Befehl (Grenzfall 4.1 auf Kommando-Ebene).

### 6.2 Neu: `src/formats/docx/__tests__/alignment.test.ts`

- `w:jc` = `start`/`end`/`distribute`/`both`/`LEFT` (Groß-/Kleinschreibung) über handgebautes
  XML (Muster wie `buildSampleDocx` in `tests/e2e/docx.spec.ts`) gegen `readDocx`; `end` →
  `'right'` ist der zentrale Regressionstest für Fehler 4.
- Fixture `tests/fixtures/external/docx/bug-paragraph-alignment.docx` (Muster wie
  `external-fixtures.test.ts`): Absatz 1 → `align:'center'` (Fix Fehler 3), Absatz 2 →
  `align:'left'` (direkte Formatierung gewinnt).
- Fixtures `rtl.docx`/`table-indent.docx`/`unicode-path.docx` (`w:jc="start"`) → `align:'left'`.
- Fehlendes `w:jc` (Grenzfall 4.12) → `align:'left'`.

### 6.3 Neu: `src/formats/odt/__tests__/alignment.test.ts`

- `EasyList.odt` (`end`) → `align:'right'`.
- `FruitDepot-SeasonalFruits4.odt` (`start`) → `align:'left'`.
- `feature_attributes_paragraph_MSO2013.odt` (gemischt `center`/`end`/`justify`) → je Absatz
  korrekt unterschieden.
- `HelloWorld.odt` (Stil „Standard", kein `fo:text-align`) → `align:'left'` (Testfall 5.2.7).

### 6.4 Neu: `tests/e2e/align-left.spec.ts`

Struktur analog `tests/e2e/docx.spec.ts`/`odt.spec.ts`/`selection-regression.spec.ts` (gleiche
Karten-Helfer). Deckt Anforderung Abschnitt 6.4 Punkt für Punkt:

1. Neues Dokument → „Linksbündig ausrichten" hat `aria-pressed="true"` **ohne** Klick (4.1).
2. **Kernregression Fehler 1:** zwei Absätze eingeben, Strg+A, „Zentriert" klicken, erneut
   Strg+A, „Linksbündig" klicken → **kein** Konsolenfehler, **beide** Absätze
   `style="text-align: left"`, `aria-pressed` „Links"→true / „Zentriert"→false.
3. Toolbar-Klick + idempotenter Zweitklick (Testfälle 2/3 der Anforderung).
4. Gemischte Selektion (Testfall 4/Grenzfall 4.4).
5. Absatzgrenze (Grenzfall 4.5).
6. Listenpunkt zentrieren → links → Liste aufheben, Ausrichtung bleibt (Grenzfall 4.7).
7. **3×3-Tabelle, mittlere Spalte per Drag über `td` markieren, „Linksbündig"** → alle drei
   Zellen der Spalte links, Spalten 1/3 unverändert (Grenzfall 4.8; siehe Schärfung in 3.2).
8. Formatvorlagen-Wechsel (Testfall 8/Grenzfall 4.9) — Erwartung nach Fix 3.7: Ausrichtung
   **bleibt** über den Wechsel erhalten.
9. Undo/Redo (Testfall 9).
10. Tastenkürzel Strg+L/E/R/J je `page.keyboard.press`, plus Tab-Fokus + Enter/Space auf den
    Button (deckt Fehler 7 **und** 8; prüft zusätzlich, dass die Browser-Standardaktion
    unterdrückt bleibt, solange der Editor fokussiert ist).
11. Vollständige Rundreisen je Format (Anforderung 5.1/5.2) über echten `setInputFiles`-Upload
    und `waitForEvent('download')` — für „links" mit **aktivem Rückweg** (zentrieren → links).
12. Cross-Format- und Doppel-Rundreise (Anforderung 5.3).
13. Fremddatei-Import `bug-paragraph-alignment.docx` / `EasyList.odt` im Browser nachvollzogen
    (Abschnitt 3.3/3.5).
14. Sichtprüfung/Screenshot (Testfall 15).

Selektor-Hinweis: Der Titel lautet nach Fix 5.3 „Linksbündig ausrichten" — E2E-Selektoren
nutzen `page.getByTitle('Linksbündig ausrichten')` (nicht mehr „Ausrichtung: left").

### 6.5 Erweiterung: `tests/e2e/selection-regression.spec.ts`

Neuer Test, Muster wie die bestehenden Fett-Regressionstests, aber mit „Linksbündig" (nach
vorherigem Zentrieren) **über zwei Absätze** als auslösender Aktion (Grenzfall 4.14 — und
hätte, früher geschrieben, Fehler 1 sofort sichtbar gemacht):

```ts
test('same regression with a multi-paragraph "Links" alignment as trigger (Grenzfall 4.14)', async ({ page }) => {
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Erster Absatz.')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Zweiter Absatz.')
  await page.keyboard.press('ControlOrMeta+a')
  await page.getByTitle('Zentriert ausrichten').click()
  await page.keyboard.press('ControlOrMeta+a')
  await page.getByTitle('Linksbündig ausrichten').click() // vor Fix: Exception, 2. Absatz bleibt zentriert
  await editor.click()
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Dritter Absatz.')
  await expect(page.locator('.ProseMirror p')).toHaveCount(3)
  await expect(editor.locator('p[style*="text-align: left"]')).toHaveCount(3)
})
```

### 6.6 Erweiterung: `roundtrip.test.ts` (beide Formate)

Je Datei ein Fall mit **zwei** unterschiedlich ausgerichteten Absätzen in **einem**
Schreib-/Lesevorgang (reine Reader/Writer-Prüfung; deckt **nicht** Fehler 1 — das nur über
6.1/6.4 — sondern sichert ab, dass Writer/Reader bei mehreren Blöcken korrekt bleiben, was sie
bereits sind, da `blocksToDocx`/`blocksToOdt` über ein Array iterieren, unabhängig vom
Editor-Befehl).

### 6.7 `external-fixtures.test.ts` (beide Formate, Kenntnisnahme)

Keine neue Assertion nötig — 6.2/6.3 decken die konkreten Fixtures gezielt ab.
`bug-paragraph-alignment.docx` bleibt in der generischen „importiert ohne Absturz"-Suite,
jetzt zusätzlich inhaltlich (nicht nur „crasht nicht") in `alignment.test.ts` abgesichert.

---

## 7. Entscheidungen zu den offenen Fragen (Abnahmekriterien 4/5/8)

1. **Formatvorlagen-Wechsel (Grenzfall 4.9, DoD 4):** **Fehler** (Fehler 6/Fix 3.7).
   Begründung: Word/LibreOffice bewahren die Absatzausrichtung beim Formatvorlagen-Wechsel; ein
   stiller Reset widerspricht dem Anforderungsziel „die Ausrichtung bleibt … erhalten" und ist
   der naheliegendste Weg, wie ein Absatz **ungewollt** linksbündig wird (Risiko R1 der
   Anforderung).
2. **Tabellen-Zellauswahl (Grenzfall 4.8, DoD 5):** geprüft; tatsächliches Verhalten
   (Unteranwendung, 1 von 3) dokumentiert (Fehler 2) und behoben (Fix 3.1).
3. **`start`/`end`/`distribute`, Stilvererbung (DoD 6):** je echte Fremddatei geprüft (Fehler
   3/4/5); `end`→rechts, `start`→links, `distribute`→justify, Stil-`w:jc` wird aufgelöst.
4. **Tastenkombination (Anforderung Abschnitt 2 Zeile 2, DoD 8):** **nachzuliefernde Funktion**
   (Fix 5.4). Begründung: Fett/Kursiv/Unterstrichen haben bereits Kürzel; das Fehlen bei
   Ausrichtung ist eine grundlose Inkonsistenz, Word/LibreOffice-Konvention (Strg+L/E/R/J) ist
   eindeutig, keine Keymap-Kollision.
5. **`aria-label` (Grenzfall 4.16, DoD 8):** **zu schließende Lücke** (Fix 5.3). Begründung:
   Konsistenz mit `MarkButton`, kein Mehraufwand, kein Nachteil.

---

## 8. Zuordnung zu den Abnahmekriterien (Abschnitt 9 der Anforderung)

| DoD-Punkt | Abdeckung durch diesen Plan |
|---|---|
| 1. Alle Testfälle 6.4 automatisiert + ≥ 1 E2E-Klick auf `AlignButton`, Wert `left` über UI | Abschnitt 6.4 (`align-left.spec.ts`, insb. Punkt 2/10) |
| 2. Rundreise 5.1/1,2,6 und 5.2/1,2,6, aktiver Rückweg, je echte Fremddatei | 6.2/6.3 (echte Fixtures) + 6.4 Punkt 11 (echter Upload/Download) |
| 3. Direkter Export-Wert-Check (`w:jc="left"` bzw. Stil `fo:text-align="left"`) zusätzlich zu mammoth/RelaxNG | 6.2/6.3 (direkter `word/document.xml`- bzw. Stil-XML-Check) |
| 4. R1 (Formatvorlagen-Reset) entschieden | Abschnitt 7 Punkt 1 (Fehler, behoben) |
| 5. R6 (Tabellen-Zellauswahl) geprüft/dokumentiert | Abschnitt 3.2 (Verhalten verifiziert, korrigiert) |
| 6. R2/R3 (`start`/`end`/`distribute`, Stilvererbung) je echte Datei je Format | Abschnitt 3.3/3.4/3.5 |
| 7. Selection-Sync-Regressionstest mit Ausrichtung dauerhaft in Suite | Abschnitt 6.5 |
| 8. Tastenkombination (R7) / `aria-label` (R8) entschieden | Abschnitt 7 Punkte 4/5 |
| 9. Jeder Risikopunkt „behoben"/„dokumentiert"/„widerlegt" | Abschnitt 3 (Fehler 1–8, inkl. R4 no-op-Undo widerlegt in 4) + Abschnitt 4 |

Risiko-Abgleich (Anforderung Abschnitt 7): R1→Fehler 6 (behoben) · R2→Fehler 3/5 (behoben) ·
R3→Fehler 4 (behoben) · R4→Abschnitt 4 (behoben: 1 Transaktion, kein no-op-Dispatch) · R5→
Abschnitt 4 (bewusst dokumentiert: `$from`-Zustand) · R6→Fehler 2 (behoben) · R7→Fehler 7
(behoben, Kürzel) · R8→Fehler 7 (behoben, `aria-label`) · R9→Fehler 7 (behoben, lokalisierter
Titel) · R10→Fix 5.3 (SVG-Icons).

---

## 9. Reihenfolge der Umsetzung (Vorschlag)

1. `src/formats/shared/align.ts` (5.1) — Grundlage für alle weiteren Schritte.
2. `commands.ts` (5.2) — behebt Fehler 1, 2, 6; der schwerwiegendste Fund zuerst, da Fehler 1
   den zentralen Anwendungsfall bricht.
3. `commands.test.ts` (6.1) sofort danach — Fehler 1/2/6 als Regressionstest verankern, bevor
   an der Oberfläche weitergearbeitet wird.
4. `Toolbar.tsx` + `WordEditor.tsx` (5.3/5.4) — Tastenkürzel, `aria-label`, Icons, Tastatur-
   Auslösbarkeit.
5. `schema.ts` (5.5) — Paste-Import-Normalisierung.
6. `docx/reader.ts` (5.6) — Formatvorlagen-Ausrichtung + `normalizeAlign`.
7. `odt/reader.ts` (5.8) — `normalizeAlign`.
8. Testergänzungen 6.2/6.3/6.6 gegen die identifizierten echten Fixtures.
9. `tests/e2e/align-left.spec.ts` (6.4) + Erweiterung `selection-regression.spec.ts` (6.5) —
   verifiziert alle vorherigen Schritte end-to-end im echten Browser.

Nach jedem abgeschlossenen Schritt committen/pushen und den GitHub-Actions-Lauf selbst prüfen
(nicht auf „grün" vertrauen), bevor der nächste Schritt beginnt.
