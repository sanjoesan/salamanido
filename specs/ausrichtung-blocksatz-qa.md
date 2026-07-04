# QA-Testplan: Feature „Ausrichtung Blocksatz"

Rolle: QA-Antwort auf `specs/ausrichtung-blocksatz-req.md` (Anforderung) und
`specs/ausrichtung-blocksatz-code.md` (Entwicklerplan). Wie bei `fett-qa.md`
gilt: **keiner** der beiden Vorgängertexte wird als bewiesen angenommen — auch
`ausrichtung-blocksatz-code.md` ist laut eigenem Titel ein *Plan* („Kernbug
bestätigt, aber noch nicht behoben"; siehe TL;DR dort). Dieses Dokument ist ein
Testplan, kein Testbericht: Die meisten unten aufgeführten Testfälle sind zum
Zeitpunkt dieses Plans **noch nicht geschrieben** (siehe Abschnitt 5, Spalte
„Erwarteter Status"). Wo möglich, wurde der behauptete Ist-Zustand bereits vorab
stichprobenartig direkt am Code bzw. an den realen Fixture-Dateien
gegengeprüft (Abschnitt 0) — das ist keine vollständige Ausführung der Tests,
sondern die Grundlage, um pro Testfall einen belastbaren Status „ROT erwartet"/
„GRÜN erwartet" zuzuweisen, statt zu raten.

Stil/Gliederung orientiert an `fett-qa.md` (nächstverwandter, bereits erstellter
QA-Plan mit identischem Methodik-Anspruch) und an
`ausrichtung-blocksatz-req.md`/`-code.md` selbst.

---

## 0. Stichprobenprüfung des Ist-Codes (QA-Gegenkontrolle von `ausrichtung-blocksatz-code.md`)

Vor Aufstellung des Plans wurden die zentralen Behauptungen aus
`ausrichtung-blocksatz-code.md` direkt am aktuellen Code sowie — für die
Fixture-Behauptungen aus dessen Abschnitt 6 — programmatisch (Node-Skript mit
`jszip`, derselbe Ansatz wie im Entwicklerplan selbst) nachvollzogen, nicht nur
aus dem Dokument übernommen:

| Behauptung | QA-Gegenkontrolle | Ergebnis |
|---|---|---|
| Kernbug: `setAlign` (`commands.ts:13-27`) dispatcht je Block eine aus derselben `state`-Closure gebaute Transaction | `src/formats/shared/editor/commands.ts:13-27` gelesen | **Bestätigt, Code ist unverändert zum in beiden Vorgängerdokumenten zitierten Stand.** Der Fix aus `-code.md` Abschnitt 3.1 (`ranges`-basierte Einzel-Transaction) ist **noch nicht umgesetzt** — der Kernbug ist zum Zeitpunkt dieses Plans **real vorhanden**, nicht nur historisch dokumentiert. |
| `isAlignActive` prüft nur `$from` | `commands.ts:29-38` gelesen | **Bestätigt**, unverändert — Fix aus Abschnitt 3.3 ebenfalls noch nicht umgesetzt. |
| `setHeading` setzt `align` hart auf `'left'` | `commands.ts:40-55`, Zeile 43 `{ level, align: 'left' }` | **Bestätigt**, unverändert — Fix aus Abschnitt 3.5 noch nicht umgesetzt. |
| `AlignButton` hat `title`, `aria-pressed`, kein `aria-label` | `Toolbar.tsx:64-84` gelesen | **Bestätigt, mit einer wichtigen Präzisierung für diesen Testplan:** `title={`Ausrichtung: ${align}`}` — für Blocksatz also **wörtlich `"Ausrichtung: justify"`**, nicht `"Blocksatz"`. Die in `-code.md` Abschnitt 5.2 bereits vorgeschlagenen E2E-Snippets verwenden aber durchgehend `page.getByTitle('Blocksatz')` bzw. `page.getByLabel('Blocksatz')` — das sind **Post-Fix-Locators** (setzen den in Abschnitt 3.6 vorgeschlagenen Fix bereits voraus) und funktionieren **gegen den aktuellen Code nicht**. Siehe 0.1. |
| **Neuer QA-eigener Fund, in keinem der beiden Vorgängerdokumente erwähnt:** `AlignButton` verdrahtet identisch zu `MarkButton` (bekannter Fehler 1 aus `fett-code.md`/`fett-qa.md`) **ausschließlich** `onMouseDown`, kein `onClick`/`onKeyDown` | `Toolbar.tsx:71-74` gelesen (`onMouseDown={(e) => { e.preventDefault(); run(view, setAlign(align)) }}`) — kein weiterer Event-Handler auf dem `<button>` | **Bestätigt, und von `ausrichtung-blocksatz-code.md` Abschnitt 3.6 nicht behoben** (der dort gezeigte Fix-Code für `AlignButton` behält exakt dasselbe `onMouseDown`-only-Muster bei). Ein natives `<button>`-Element feuert bei Tastatur-Aktivierung (Enter/Leertaste am fokussierten Element) **kein** `mousedown`-Event, nur `click` — der in Anforderung Abschnitt 1 Zeile 1 explizit geforderte Weg „Tab-Fokus + Enter/Space" funktioniert daher mit hoher Wahrscheinlichkeit **nicht**, unabhängig vom Kernbug aus 2.2. Siehe Testfall 3.1.3/3.1.4. |
| `WordEditor.tsx`-Keymap ohne Ausrichtungs-Kürzel | `WordEditor.tsx:71-80` gelesen: nur `Mod-z/y/Shift-z`, `Enter`, `Mod-b/i/u` | **Bestätigt.** Kürzel aus `-code.md` Abschnitt 3.8 (`Mod-Alt-l/e/r/j`) **noch nicht eingebaut**. |
| `docx/reader.ts`: `JC_TO_ALIGN` kennt nur `left/center/right/both` | `docx/reader.ts:13` gelesen | **Bestätigt**, unverändert. |
| `odt/reader.ts`: `fo:text-align` wird roh übernommen | `odt/reader.ts:63-65` gelesen | **Bestätigt**, unverändert. |
| Fixture-Werte laut `-code.md` Abschnitt 6 | Eigenes Node-Skript (`jszip`, unabhängig von `-code.md`s Skript neu geschrieben) gegen die realen Dateien ausgeführt | **Vollständig bestätigt, siehe 0.2.** |

### 0.1 Konsequenz: Locator-Migration zwischen Vor-Fix- und Nach-Fix-Zustand

Dieser Testplan führt **zwei** Locator-Varianten für den Blocksatz-Button, weil
Fix 3.6 (`aria-label`/`title` → `"Blocksatz"`) zum Zeitpunkt dieses Plans noch
nicht umgesetzt ist:

```ts
// Vor Fix 3.6 (aktueller Ist-Zustand, funktioniert JETZT):
const alignJustifyButton = (page) => page.getByTitle('Ausrichtung: justify')
// Nach Fix 3.6 (siehe ausrichtung-blocksatz-code.md Abschnitt 3.6):
const alignJustifyButtonPostFix = (page) => page.getByTitle('Blocksatz')
```

Alle E2E-Testfälle unten sind mit der **Vor-Fix**-Variante geschrieben, damit
sie sofort ausführbar sind und einen validen Ist-Zustand liefern. Nach
Umsetzung von Fix 3.6 muss der Locator projektweit (nicht nur in diesem Plan)
auf die zweite Variante migriert werden — dies ist **zusätzlich** zur bereits
in `-code.md` Abschnitt 9 vermerkten offenen Abhängigkeit festzuhalten, da sie
sonst als stiller Bruch aller neuen Blocksatz-Tests unbemerkt bliebe.

### 0.2 Fixture-Inventar — eigene, unabhängige Nachprüfung (nicht aus `-code.md` übernommen)

Per eigenem Skript direkt aus den `.docx`/`.odt`-Dateien extrahiert:

| Datei | Gefundene Werte | Bewertung für diesen Testplan |
|---|---|---|
| `bug-paragraph-alignment.docx` (`word/document.xml`) | `w:jc="left"` (genau **1×** direkt im Dokument) | `styles.xml` deklariert zusätzlich separat `w:jc="center"` auf der referenzierten Formatvorlage `Title` — bestätigt exakt Grenzfall 3.10 (ein Absatz ohne direktes `w:jc` liest sich als `left` statt korrekt `center`). **Primär-Fixture für Testfall 3.2.5.** |
| `table-alignment.docx` | `left, start, center, right, end` (je 1×) | **Enthält kein `both`/`justify`** — bestätigt `-code.md`s eigene Einschränkung. Nutzbar für Grenzfall 3.9 (start/end-Fallback), **nicht** als Blocksatz-Positivbeispiel. |
| `56392.docx` | `both` (18×, durchgängig) | **Primär-Fixture für echten Blocksatz-Import**, unabhängig bestätigt. |
| `rtl.docx` | `start` (4×, keine anderen Werte) | Bestätigt: LTR-Näherungs-Fallback (`start→left`) ist für diese Datei die **inhaltlich unplausibelste** Wahl (RTL-Dokument) — wie in `-code.md` Abschnitt 3.9 selbst eingeräumt. |
| `TestTableCellAlign.docx` | **keine** `w:jc`-Treffer (0) | **Bestätigt `-code.md`s Korrektur der Anforderung**: diese Datei ist für horizontale Ausrichtung irrelevant (nur `w:vAlign`). |
| `feature_attributes_paragraph_MSO2013.odt` (`content.xml`) | `center` (2×), `end` (2×), `justify` (2×) | Bestätigt: einzige geprüfte Datei mit **echtem** `justify` **und** `end` gleichzeitig — Primär-Fixture für Grenzfall 3.8/ODT-Justify-Import. |
| `listStyleId.odt` | u. a. `start` (≥1×), sehr viele `justify`/`right`/`left`/`center` (>100 Werte insgesamt) | Bestätigt: `start` kommt real vor, zusätzlich ungewöhnlich viele echte `justify`-Absätze — geeignet auch als Stresstest für „viele Blocksatz-Absätze in einer Fremddatei". |
| `tabelleAlignMargin.odt` | **keine** `fo:text-align`-Treffer (0) | **Bestätigt `-code.md`s Korrektur**: irrelevant für horizontale Ausrichtung. |

Konsequenz: Testfall 5.14 der Anforderung (vier benannte Fixtures) wird — wie
von `-code.md` Abschnitt 6 bereits vorgeschlagen — **mit Korrektur**
umgesetzt: `TestTableCellAlign.docx`/`tabelleAlignMargin.odt` erhalten nur
einen Crash-frei-plus-Default-Test, keinen Blocksatz-Positivtest.

---

## 1. Testumgebung

- Unit-Tests: `npm test` (Vitest, `jsdom`-Environment).
- E2E-Tests: `npm run test:e2e` (Playwright, `playwright.config.ts`, per Lektüre
  bestätigt):
  - `baseURL: 'http://localhost:4173/salamanido/'`, `webServer` baut
    (`npm run build`) und startet `vite preview` automatisch.
  - Drei Projekte: **Desktop Chrome**, **Mobile** (`Pixel 7`), **Tablet**
    (`iPad Mini`) — jeder neue Testfall muss in **allen drei** grün sein,
    sofern nicht explizit auf reine Tastaturbedienung angewiesen (siehe 3.7).
- Bestehende Konventionen (aus `docx.spec.ts`/`odt.spec.ts`/
  `selection-regression.spec.ts` übernommen, per Lektüre bestätigt):
  - `page.goto('/')` → Privacy-Banner wegklicken:
    `page.getByRole('button', { name: /verstanden/i }).click()`.
  - Karten-Locator: `docxCard(page)`/`odtCard(page)` über
    `page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: '...' }) })`.
  - Editor-Locator: `page.locator('.ProseMirror')`.
  - Sichtbarer Upload-Button existiert real (`FormatPicker.tsx:64-68`,
    „Datei hochladen"), wird aber von den bestehenden Tests **nicht** genutzt
    (`input.setInputFiles(...)` direkt auf den versteckten Input, siehe 3.4).
  - Export: `page.getByRole('button', { name: 'Exportieren' })` +
    `page.waitForEvent('download')`.
  - Absatzformat-Dropdown: `page.getByLabel('Absatzformat')` (bestätigt,
    `Toolbar.tsx:117`), Werte `'normal'`/`'1'`…`'6'`.
  - Blocksatz-Button **vor** Fix 3.6: `page.getByTitle('Ausrichtung: justify')`
    (siehe 0.1).

---

## 2. Teil A — Unit-Tests: Reader/Writer-Rundreise (DOCX + ODT)

**Zweck:** Schnelle, browserunabhängige Absicherung der Datenebene
(`align`-Attribut ⇄ `w:jc`/`fo:text-align`). Diese Ebene ist vom Kernbug 2.2
(Toolbar-/`setAlign`-Bedienung) komplett entkoppelt — ein wegen des Kernbugs
rotes E2E-Verhalten darf hier keine Unit-Tests rot färben und umgekehrt.
Testet ausschließlich `writeDocx`/`readDocx`/`writeOdt`/`readOdt` sowie
`wordSchema`/`commands.ts` direkt, **keine** Playwright-Interaktion.

### 2.1 Bestandsaufnahme (bereits vorhanden, als Basisschutz zu erhalten)

| Datei | Test | Deckt ab | Einschränkung |
|---|---|---|---|
| `src/formats/docx/__tests__/roundtrip.test.ts:49` | `it.each(['left','center','right','justify'])('preserves "%s" alignment')` | Grundfall Rundreise, ein Absatz | **Bestätigt per Lektüre:** konstruiert je Testlauf genau **ein** `paragraph(...)`-Objekt — nie mehr als ein Absatz gleichzeitig. |
| `src/formats/odt/__tests__/roundtrip.test.ts` (analog) | analog | analog | analog |
| `src/formats/{docx,odt}/__tests__/external-fixtures.test.ts` | Import diverser Fremddateien | „importiert ohne Absturz" | **Bestätigt:** keine Ausrichtungs-Assertion enthalten. |

Diese Tests bleiben unverändert Teil der Suite; sie werden **ergänzt**, nicht
ersetzt.

### 2.2 Erweiterung — `src/formats/docx/__tests__/roundtrip.test.ts`

| # | Testfall | Vorgehen | Erwartung | Bezug |
|---|---|---|---|---|
| D1 | Blocksatz auf **mehreren** aufeinanderfolgenden Absätzen gleichzeitig | `doc([paragraph('Erster',...), paragraph('Zweiter',...), paragraph('Dritter',...)])`, alle drei mit `attrs:{align:'justify'}` → `roundTrip` | Alle drei Absätze kommen als `align:'justify'` zurück | Anforderung 4.1.3 — **rein datenseitig unabhängig vom Kernbug** (der Bug liegt im Editor-Command, nicht im Reader/Writer); dieser Test war laut Anforderungstabelle „nie getestet", nicht „bekannt defekt" — **Erwarteter Status: GRÜN** |
| D2 | Blocksatz + Überschriften-Level im selben `w:pPr` | `{ type:'heading', attrs:{level:2, align:'justify'}, content:[...] }` → `roundTrip` | `level===2` **und** `align==='justify'` beide erhalten | 4.1.5, GRÜN erwartet |
| D3 | Blocksatz in einer Tabellenzelle, Nachbarzelle bleibt unberührt | Tabelle mit 2 Zellen, Zelle 1 `align:'justify'`, Zelle 2 Default `'left'` | Zelle 1 `justify`, Zelle 2 `left` nach Rundreise | 4.1.6, GRÜN erwartet |
| D4 | Blocksatz über `hard_break` hinweg | Ein Absatz `align:'justify'`, Content `text → hard_break → text` | `align` bleibt `justify` für den gesamten Absatz | 4.1.7, GRÜN erwartet |
| D5 | Blocksatz + Fett + Textfarbe gemeinsam auf demselben Absatz/Lauf | Absatz `align:'justify'`, Run mit `marks:[strong, textColor]` | Nach Rundreise: `align==='justify'` **und** beide Marks erhalten, keine verdrängt die andere | 4.1.4/2.9, GRÜN erwartet |
| D6 | Rundreise erhält **alle vier** Ausrichtungen gemeinsam in einem Dokument, ohne Vermischung | Vier Absätze `left/center/right/justify` in einem `doc([...])` | Nach Rundreise: exakt dieselbe Zuordnung Absatz→Ausrichtung, keine Verschiebung | 4.3.3 (Teilaspekt, Unit-Ebene) |
| D7 | Absatz mit direktem `w:jc`, dessen (simulierte) Formatvorlage einen abweichenden Wert hätte | Kann auf reiner Unit-Ebene mit synthetischen Daten **nicht** sinnvoll nachgebildet werden, da `writeDocx` keine `w:pStyle`-Vererbung erzeugt — **auf die Fixture-Tests in 2.4 verwiesen** (`bug-paragraph-alignment.docx`) | — | 4.1.10, siehe 2.4 |

### 2.3 Erweiterung — `src/formats/odt/__tests__/roundtrip.test.ts`

Analog zu 2.2, mit `writeOdt`/`readOdt`, zusätzlich:

| # | Testfall | Vorgehen | Erwartung | Bezug |
|---|---|---|---|---|
| O1–O6 | Analog D1–D6 | Analog, `content.xml`/Stilnamen statt `document.xml` | Analog | 4.2.x, GRÜN erwartet |
| O7 | Zwei unterschiedliche Blocksatz-Absätze referenzieren **denselben** (oder inhaltlich gleichwertigen) Stil, nicht zwei redundante Definitionen | Zwei Absätze `align:'justify'` im selben Dokument → `writeOdt` → `content.xml` parsen: Anzahl `<style:style ...>` mit `fo:text-align="justify"` zählen | Erwartung: **genau 1** solche Stildefinition (`Ppara-justify`, `styleRegistry.ts:61-65` bestätigt per Lektüre), beide Absätze referenzieren denselben `text:style-name` | 4.2.3 |

### 2.4 Neue Datei: `src/formats/docx/__tests__/alignment-fixtures.test.ts`

Reale Fixtures statt nur synthetischer Daten — Werte laut Abschnitt 0.2
unabhängig verifiziert.

```ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { readDocx } from '../reader'

const FIXTURES_DIR = join(__dirname, '../../../../tests/fixtures/external/docx')
async function loadFixture(name: string) {
  return readDocx(new Blob([readFileSync(join(FIXTURES_DIR, name))]))
}
function allAligns(node: any, out: Array<{ text: string; align: string }> = []) {
  if ((node.type === 'paragraph' || node.type === 'heading') && node.attrs) {
    out.push({ text: (node.content ?? []).map((n: any) => n.text ?? '').join(''), align: node.attrs.align })
  }
  ;(node.content ?? []).forEach((n: any) => allAligns(n, out))
  return out
}
```

| # | Testfall | Erwartung JETZT (unverändertes `JC_TO_ALIGN`) | Bezug |
|---|---|---|---|
| F1 | `56392.docx` importiert mindestens einen Absatz mit `align:'justify'` | **GRÜN** — `both→justify` ist bereits im Ist-Code korrekt gemappt (`JC_TO_ALIGN.both==='justify'`, per Lektüre bestätigt) | 4.1.9, Testfall 5.14 |
| F2 | `rtl.docx`: alle Absätze importieren aktuell als `align:'left'` (stiller Fallback, `start` ist nicht in `JC_TO_ALIGN`) | **GRÜN, aber dokumentiert eine Lücke** — Test bestätigt exakt den in Grenzfall 3.9 beschriebenen Ist-Zustand, nicht die Wunsch-Normalisierung | Grenzfall 3.9 |
| F3 | `table-alignment.docx`: nach Fix `-code.md` Abschnitt 3.9 müssten `start`/`end` auf `left`/`right` normalisiert werden, `align` darf nie den rohen String `'start'`/`'end'` enthalten | **ROT jetzt** (aktuell fallen `start`/`end` beide auf denselben `'left'`-Fallback — Test wie in `-code.md` Abschnitt 5.1 vorgeschlagen, prüft auf getrennte `left`/`right`-Zählung, was mit dem *aktuellen* `?? 'left'`-Fallback für **beide** Werte identisch `'left'` ergibt) | Grenzfall 3.9, wird GRÜN nach Fix 3.9 |
| F4 | `bug-paragraph-alignment.docx`: Absatz „does not have explicit alignment" liest sich als `'left'` (nicht `'center'`); Absatz „overriding" liest sich korrekt als `'left'` | **GRÜN** — beides ist der laut Anforderung 4.1.10 **bewusst nicht zu behebende** Ist-Zustand; dieser Test friert ihn ein, statt ihn stillschweigend unbeobachtet zu lassen | Grenzfall 3.10 |
| F5 | `TestTableCellAlign.docx`: importiert ohne Absturz, **jedes** `align`-Attribut ist der Schema-Default `'left'` (keine horizontale Ausrichtung in der Datei) | **GRÜN** — Korrektur zur Anforderung, siehe 0.2 | Testfall 5.14 (korrigiert) |

### 2.5 Neue Datei: `src/formats/odt/__tests__/alignment-fixtures.test.ts`

Analog, mit `readOdt`:

| # | Testfall | Erwartung JETZT | Bezug |
|---|---|---|---|
| G1 | `feature_attributes_paragraph_MSO2013.odt`: enthält sowohl `align:'justify'` als auch (roh, unnormalisiert) `align:'end'` | **GRÜN** (dokumentiert Ist-Zustand: `justify` korrekt, `end` unnormalisiert durchgereicht — Fix aus `-code.md` 3.11 noch nicht umgesetzt) | Grenzfall 3.8 |
| G2 | Nach Fix 3.11: `align` darf nie `'start'`/`'end'` roh enthalten, `listStyleId.odt`s `start`-Vorkommen muss als `'left'` ankommen | **ROT jetzt** | Grenzfall 3.8, GRÜN nach Fix |
| G3 | `tabelleAlignMargin.odt`: importiert ohne Absturz, jedes `align` ist Default `'left'` | **GRÜN** — Korrektur zur Anforderung | Testfall 5.14 (korrigiert) |

### 2.6 Neue Datei: `src/formats/shared/editor/__tests__/commands.test.ts`

**Kernstück von Teil A** — isolierter, browserunabhängiger Nachweis des
Kernverdachts (2.2) und der weiteren in `-code.md` Abschnitt 3 beschriebenen
Fixes, bevor überhaupt ein Browser im Spiel ist.

#### 2.6.1 Kernverdacht 2.2/Testfall 5.1 — höchste Priorität

```ts
import { EditorState, AllSelection } from 'prosemirror-state'
import { wordSchema } from '../../schema'
import { setAlign, isAlignActive, setHeading } from '../commands'

function stateFromParagraphs(...aligns: string[]) {
  const paragraphs = aligns.map((align) => wordSchema.nodes.paragraph.create({ align }, wordSchema.text('x')))
  return EditorState.create({ doc: wordSchema.nodes.doc.create(null, paragraphs), schema: wordSchema })
}
```

| # | Testfall | Vorgehen | Erwartung | Erwarteter Status JETZT |
|---|---|---|---|---|
| C1 | **Bug-Beleg** (temporär — dokumentiert exakt den Ist-Zustand, muss nach Fix 3.1 gelöscht/ersetzt werden, nicht angepasst): `setAlign('justify')` auf eine `AllSelection` über 3 Absätze wirft `RangeError`, nur der erste Absatz wurde geändert | `state` mit `('left','center','right')`, `AllSelection`, `setAlign('justify')(state, dispatch)` mit `dispatch(tr) { state = state.apply(tr) }` — **exakt dasselbe Muster wie `WordEditor.tsx`s `dispatchTransaction`** | `expect(() => setAlign(...)).toThrow(/Applying a mismatched transaction/i)`; danach `state.doc`-Absätze `['justify','center','right']` (nur Absatz 1 geändert) | **GRÜN** — dieser Test bestätigt den Bug, er ist zum jetzigen Zeitpunkt korrekt und **soll** grün sein. Sobald `-code.md` Abschnitt 3.1 umgesetzt ist, wirft `setAlign` nicht mehr → dieser Test **muss dann fehlschlagen** und ist zu entfernen (nicht zu reparieren) — das ist selbst der Beweis, dass der Fix greift. |
| C2 | **Ziel-/Regressionstest** (dauerhaft, laut Anforderung DoD Punkt 1 verbindlich gefordert): dieselbe Situation wie C1, aber Erwartung ist das **gewünschte** Verhalten | Gleicher Aufbau wie C1 | Kein Wurf; `dispatchCount === 1` (ein Undo-Schritt); alle drei Absätze `align==='justify'` | **ROT jetzt** (siehe C1 — aktueller Code wirft und ändert nur einen Block). **Muss nach Fix 3.1 GRÜN werden — dies ist der in Anforderung DoD Punkt 1 geforderte dauerhafte Regressionstest.** |
| C3 | Dieselbe Prüfung mit `Strg+A` (`AllSelection`) auf ein **4**-Absatz-Dokument (häufigster real genutzter Ablauf laut Anforderung 2.2/Grenzfall 3.3) | Analog C2, 4 statt 3 Absätze | Alle 4 Absätze `justify`, kein Wurf | **ROT jetzt**, GRÜN nach Fix 3.1 |
| C4 | Kleinstmöglicher Fall (Grenzfall 3.2 der Anforderung): Selektion über **exakt zwei** Absätze | Analog, 2 Absätze `('left','center')` | Beide `justify`, kein Wurf | **ROT jetzt**, GRÜN nach Fix 3.1 |

#### 2.6.2 Zweiter, unabhängiger Fund aus `-code.md` (`CellSelection`-Rechteck-Fehler) — isoliert vom Kernbug testbar

**Wichtiger methodischer Hinweis:** Der `CellSelection`-Fehler (`-code.md`
Abschnitt 3.1, „Fehler 2") lässt sich **nicht** durch einen Aufruf des
aktuellen `setAlign` demonstrieren, ohne sofort Fehler 1 (den `RangeError`
aus 2.6.1) auszulösen — sobald zwei oder mehr Zellen betroffen sind, crasht
der Kernbug bereits beim zweiten `dispatch()`, bevor überhaupt sichtbar würde,
ob eine dritte, nicht selektierte Zelle mitgefasst wurde. Um den zweiten
Fehler **unabhängig** vom ersten zu belegen, wird direkt die Diskrepanz
zwischen `nodesBetween(selection.from, selection.to, …)` (aktuell verwendet)
und `selection.ranges` (korrekte Grundlage) gemessen, **ohne** `setAlign`
selbst aufzurufen:

```ts
import { CellSelection } from 'prosemirror-tables'
// Tabelle 2x3 aufbauen, CellSelection auf Spalte 2 (Zeile 1 + Zeile 2)
// ... state.doc.nodesBetween(state.selection.from, state.selection.to, ...) sammelt table_cell-Positionen
// ... state.selection.ranges iterieren, ebenfalls table_cell-Positionen sammeln
```

| # | Testfall | Erwartung | Erwarteter Status JETZT |
|---|---|---|---|
| C5 | Der rohe `from`/`to`-Spann einer Spalten-`CellSelection` (Spalte 2 von 3, zwei Zeilen) umfasst mindestens eine **nicht** selektierte Zelle (Spalte 3, Zeile 1) zusätzlich zu den tatsächlich per `ranges` selektierten Zellen | `nodesBetween(from,to,...)`-Zellmenge ist eine **echte Obermenge** von `ranges`-Zellmenge | **GRÜN** — dieser Test beweist den zweiten, von der Anforderung nicht genannten Fehler direkt an der Bibliotheks-/Dokument-Geometrie, unabhängig davon, ob `setAlign` bereits gefixt ist. Bleibt nach Fix 3.1 weiterhin gültig (dokumentiert **warum** `ranges` statt `from`/`to` nötig ist), sollte aber nach dem Fix zusätzlich um C6 ergänzt werden. |
| C6 | Nach Fix 3.1: `setAlign('justify')` auf dieselbe Spalten-`CellSelection` justiert **nur** die zwei tatsächlich selektierten Zellen, nicht die dazwischenliegende dritte | Ergebnis-Array `['left','justify','left','left','justify','left']` (Spalte 2 = Index 1,4) | **Blockiert bis Fix 3.1** (kann erst sinnvoll ausgeführt werden, ohne selbst am Kernbug zu scheitern) |

#### 2.6.3 `isAlignActive` bei gemischter Mehrfachselektion (2.3/Grenzfall 3.4)

| # | Testfall | Erwartung | Erwarteter Status JETZT |
|---|---|---|---|
| C7 | Cursor (leere Selektion) in einem `justify`-Absatz | `isAlignActive(state,'justify') === true` | **GRÜN** — Alltagsfall, unverändert vom Fix betroffen |
| C8 | `AllSelection` über zwei **uniform** `justify` Absätze | `=== true` | **GRÜN** (zufällig identisch zu Ist-Code, da `$from` in diesem Fall ohnehin `justify` ist) |
| C9 | `AllSelection` über `('justify','left')` — **gemischt**, erster Block passt | Gewünscht: `isAlignActive(state,'justify') === false` (Word-Konvention, Entscheidung `-code.md` 3.3) | **ROT jetzt** — aktueller Code liest nur `$from` (den ersten Block) und meldet fälschlich `true` |
| C10 | `AllSelection` über `('left','justify')` — gemischt, **letzter** Block passt | Gewünscht: `=== false` | **GRÜN zufällig** (aktueller Code liest `$from` = erster Block = `left` → bereits `false`, aber aus dem **falschen** Grund — nicht weil „gemischt" erkannt wird, sondern weil zufällig der erste Block nicht passt). **Wichtig für QA:** dieser Test ist kein verlässlicher Nachweis der korrekten Logik, nur C9 ist das — beide zusammen nötig. |

#### 2.6.4 `setHeading` und Ausrichtung (2.5)

| # | Testfall | Erwartung | Erwarteter Status JETZT |
|---|---|---|---|
| C11 | `justify`-Absatz → `setHeading(1)` | Gewünscht (Entscheidung `-code.md` 3.5): `align` bleibt `'justify'` | **ROT jetzt** — aktueller Code setzt hart `align:'left'` (`commands.ts:43`, per Lektüre bestätigt) |
| C12 | `justify`-Überschrift → `setHeading(null)` (zurück zu „Standard") | Gewünscht: `align` bleibt `'justify'` | **ROT jetzt** — `attrs: undefined` greift Schema-Default `'left'` |

#### 2.6.5 Grenzfälle 3.6/3.7 (Bild-Selektion, Fremdwert)

| # | Testfall | Erwartung | Erwarteter Status JETZT |
|---|---|---|---|
| C13 | `setAlign('justify')` auf eine reine `NodeSelection` (ein Bild, kein Text) | `applicable === false`, kein Dispatch | **GRÜN** — `alignableTypes` enthält `image` nicht, `nodesBetween` findet keinen Treffer; bereits korrekt im Ist-Code |
| C14 | Absatz mit Fremdwert `align:'start'` (z. B. nach externem Paste) | Keiner der vier `isAlignActive(state, align)`-Aufrufe (`left/center/right/justify`) liefert `true` | **GRÜN** — exakter Vergleich in `isAlignActive` lässt `'start'` bereits heute bei keinem der vier Werte matchen |

---

## 3. Teil B — Echte Playwright-Browser-Tests

**Grundsatz (bindend für diesen Abschnitt, wie im Auftrag gefordert):** Kein
Testfall darf durch direkten Aufruf interner Funktionen (`setAlign(...)`,
`isAlignActive(...)`, `readDocx(...)` etc.) im Node-Kontext ersetzt werden.
Jeder Testfall läuft über echte Nutzer:innen-Handlungen im Browser:
`locator.click()`, `page.keyboard.press(...)`/`.type(...)`,
`input.setInputFiles(...)` bzw. echtes `filechooser`-Event,
`page.waitForEvent('download')` + strukturelle Prüfung der heruntergeladenen
Datei (JSZip + DOMParser, nicht nur `.toContain`).

### 3.1 Neue Datei: `tests/e2e/alignment.spec.ts`

Analog zu `docx.spec.ts`/`odt.spec.ts`/`selection-regression.spec.ts`
(gleiche `odtCard`/`docxCard`-Locator-Helfer). **Testfall 1 steht bewusst
zuerst**, exakt wie in Anforderung Abschnitt 5 gefordert.

```ts
import { test, expect } from '@playwright/test'
import JSZip from 'jszip'

function odtCard(page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'OpenDocument Text (.odt)' }) })
}
function docxCard(page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })
}
// Vor Fix 3.6 (siehe Abschnitt 0.1) — NICHT page.getByTitle('Blocksatz') verwenden:
const justifyBtn = (page) => page.getByTitle('Ausrichtung: justify')
```

#### 3.1.1 Kernverdacht (2.2/Testfall 5.1) — höchste Priorität

| # | Test | Schritte | Assertion | Erwarteter Status JETZT |
|---|---|---|---|---|
| E1 | Drei per Tippen/`Strg+A` markierte Absätze werden alle justiert, keine unbehandelte Konsolen-Exception, ein Undo-Schritt | `page.on('pageerror', ...)`/`page.on('console', ...)` registrieren; drei Absätze tippen; `ControlOrMeta+a`; `justifyBtn(page).click()` | Erwartet: alle drei `<p>` haben `text-align: justify`, `consoleErrors` leer, ein `ControlOrMeta+z` macht alle drei rückgängig | **ROT jetzt** — der reale Klick löst im Browser denselben `RangeError` aus wie in C1/C2 nachgestellt; erwartetes tatsächliches Fehlerbild: `pageerror` mit „Applying a mismatched transaction", **nur der erste Absatz** ist sichtbar justiert, die übrigen bleiben unverändert. Dieses exakte Fehlerbild muss beim ersten realen Testlauf dokumentiert und mit C1/C2 abgeglichen werden (Anforderung verlangt „exaktes Fehlerbild dokumentieren"). |
| E2 | Dasselbe mit `Strg+A` (`AllSelection`) über ein 5-Absatz-Dokument — laut Anforderung mutmaßlich häufigster Ablauf | Analog E1, 5 statt 3 Absätze | Analog | **ROT jetzt**, aus demselben Grund |

#### 3.1.2 Bedienung: Toolbar-Klick, Cursor-Fall, Tastatur-Fokus (Bedienelement 1/2, Anforderung 2.1)

| # | Test | Schritte | Assertion | Erwarteter Status JETZT |
|---|---|---|---|---|
| E3 | Klick auf Blocksatz-Button ohne Selektion (Cursor in einem Wort) justiert den **gesamten** umschließenden Absatz | Text tippen, nur ein Wort markieren (`Home`+4×`Shift+ArrowRight`), `justifyBtn(page).click()` | Gesamter `<p>` hat `text-align: justify`, `aria-pressed` wechselt auf `true` | **GRÜN erwartet** — Einzelblock-Fall ist vom Kernbug nicht betroffen (nur 1 Block in der Selektion → nur 1 `dispatch()`, kein zweiter Aufruf, der crashen könnte) |
| E4 | **Regressionstest, neuer QA-Fund (siehe Abschnitt 0, Zeile „AlignButton … onMouseDown"):** reiner Tastatur-Fokus-Pfad auf den Button | Wiederholt `Tab` bis `justifyBtn(page)` fokussiert ist (`toBeFocused()`), Text vorher per Maus/Tastatur markieren, dann `page.keyboard.press('Enter')` **und** separat `page.keyboard.press(' ')` | Blocksatz wird auf die vorher gesetzte Selektion angewendet | **ROT erwartet** (nicht in `ausrichtung-blocksatz-code.md` als zu behebender Fund geführt — dort bleibt der Fix in 3.6 beim `onMouseDown`-only-Muster). Widerspricht direkt Anforderung Bedienelement 1: „Muss per Maus **und** Tastatur (Tab-Fokus + Enter/Space) auslösbar sein". Ergebnis an `-code.md`-Autor:innen zurückzuspiegeln (siehe Abschnitt 8). |
| E5 | `aria-pressed` aktualisiert sich sofort bei Cursor-Bewegung zwischen einem `justify`- und einem `left`-Absatz | Zwei Absätze, einer justiert, Cursor abwechselnd hineinsetzen | `aria-pressed` folgt korrekt dem jeweils aktuellen Block (Einzelcursor-Fall, nicht Mehrfachselektion) | **GRÜN erwartet** — `isAlignActive`s `$from`-Logik ist für den Cursor-Fall bereits korrekt, nur die Mehrfachselektions-Anzeige ist der bekannte Mangel (siehe E11) |
| E6 | Doppel-/schnelles Mehrfachklicken auf den bereits aktiven Button erzeugt **keinen** zusätzlichen Undo-Schritt | Einzelnen Absatz justieren, Button danach 2× weiter klicken, dann **ein** `Strg+Z` | Nach einem Undo ist der Absatz bereits wieder nicht-justiert | **ROT jetzt** — aktueller Code dispatcht bei **jedem** Klick unbedingt eine neue Transaction, auch wenn der Block bereits `justify` ist (kein „already matches"-Check in `commands.ts:13-27`); ein einzelnes Undo stellt daher **nicht** den ursprünglichen Zustand her (drei Undo-Schritte nötig). Grenzfall 3.11/Anforderung 2.4 |

#### 3.1.3 Formatvorlage-Wechsel (2.5/Grenzfall 3.5, Testfall 4)

| # | Test | Schritte | Assertion | Erwarteter Status JETZT |
|---|---|---|---|---|
| E7 | Absatz im Blocksatz, Wechsel zu „Überschrift 1" — dokumentiert tatsächliches Verhalten | Text tippen, justieren, `page.getByLabel('Absatzformat').selectOption('1')` | **Ist-Verhalten (GRÜN als Dokumentation):** `<h1>` hat **nicht** mehr `text-align: justify`, sondern den Default `left` — Verlust ist kommentarlos, kein Konsolenfehler | **GRÜN jetzt** (das ist der unerwünschte, aber unverändert bestehende Ist-Zustand); **muss nach Fix `-code.md` 3.5 auf das Gegenteil wechseln** (Ausrichtung bleibt erhalten) — dann wird aus diesem Test ein ROT-jetzt/GRÜN-nach-Fix-Test wie E8 |
| E8 | Ziel-/Regressionstest für die in `-code.md` 3.5 getroffene Entscheidung | Analog E7 | Gewünscht: `<h1>` hat weiterhin `text-align: justify` | **ROT jetzt**, GRÜN nach Fix 3.5 |

#### 3.1.4 Listen und Tabellenzellen (2.6, Testfall 5)

| # | Test | Schritte | Assertion | Erwarteter Status JETZT |
|---|---|---|---|---|
| E9 | Blocksatz auf eine einzelne Tabellenzelle, Nachbarzelle bleibt unberührt | Tabelle einfügen, in Zelle 1 Text + justieren | Zelle 1 justiert, Zelle 2 nicht | **GRÜN erwartet** (Einzelblock-Fall) |
| E10 | Blocksatz auf einen einzelnen Listenpunkt | Liste einfügen, Text + justieren | Listenpunkt justiert | **GRÜN erwartet** (Einzelblock-Fall) |
| E11 | Blocksatz auf eine Selektion über **mehrere** Listenpunkte bzw. eine Tabellen-Spalten-`CellSelection` | Mehrere Listenpunkte markieren, justieren; separat: Tabellenspalte markieren (Playwright: `Shift`+Klick über mehrere Zellen bzw. natives Drag), justieren | Alle erfassten Blöcke justiert, **nur** die tatsächlich selektierten Zellen (nicht rechteckig „dazwischenliegende"), kein Konsolenfehler | **ROT jetzt** (Kernbug 2.2, plus — falls in dieser Browser-Session mehr als 2 Blöcke betroffen sind — zusätzlich der `CellSelection`-Fund aus 2.6.2, sobald 2.2 gefixt ist) |

#### 3.1.5 Selektion mit Bild (Grenzfall 3.6, Testfall 6/7)

| # | Test | Schritte | Assertion | Erwarteter Status JETZT |
|---|---|---|---|---|
| E12 | Selektion mit Text **und** Bild → kein Absturz, nur Text betroffen | Text + Bild einfügen, `Strg+A`, justieren | Kein Konsolenfehler, Text-Absätze justiert, Bild unverändert | **ROT möglich** — sobald mehr als ein textueller Block in der Selektion liegt, greift wieder Kernbug 2.2; bei genau einem umgebenden Absatz **GRÜN erwartet** |
| E13 | Selektion, die **ausschließlich** ein Bild markiert (`NodeSelection`) | Bild einfügen, Bild selbst anklicken/selektieren, justieren | Klick bewirkt sichtbar nichts, kein Fehler | **GRÜN erwartet** (bestätigt durch C13 auf Unit-Ebene) |

#### 3.1.6 Zwischenablage (2.7, Testfall 8/9)

| # | Test | Schritte | Assertion | Erwarteter Status JETZT |
|---|---|---|---|---|
| E14 | Einfügen von externem HTML mit **inline** `style="text-align: justify"` | `page.evaluate(...)` mit synthetischem `ClipboardEvent`/`DataTransfer`, `dt.setData('text/html', '<p style="text-align: justify">…</p>')` | Eingefügter Absatz zeigt `text-align: justify` | **GRÜN erwartet** (`schema.ts` liest `dom.style.textAlign`, unverändert korrekt) |
| E15 | Einfügen von externem HTML mit **klassenbasierter** (nicht inline) Blocksatz-Formatierung | `<style>.j{text-align:justify}</style><p class="j">…</p>` | Eingefügter Absatz zeigt **nicht** `text-align: justify` (dokumentiertes Fallback-Verhalten) | **GRÜN erwartet** — bestätigt exakt die in Grenzfall 3.7 der Anforderung beschriebene, bewusst so belassene Lücke |

#### 3.1.7 Undo/Redo (2.8, Testfall 10)

| # | Test | Schritte | Assertion | Erwarteter Status JETZT |
|---|---|---|---|---|
| E16 | Undo/Redo direkt nach Blocksatz auf einen **einzelnen** Absatz | Text tippen, justieren, `Strg+Z`, `Strg+Y` | Undo entfernt Blocksatz, Redo stellt ihn wieder her | **GRÜN erwartet** (Einzelblock-Fall) |

#### 3.1.8 Screenreader-Name (Bedienelement 4, Testfall 13)

| # | Test | Schritte | Assertion | Erwarteter Status JETZT |
|---|---|---|---|---|
| E17 | Automatisierte Näherung des Accessible Name: `page.getByRole('button', { name: 'Blocksatz' })` muss den Button finden | — | Button gefunden | **ROT jetzt** — kein `aria-label`, sichtbarer Text-Inhalt ist das Unicode-Zeichen `≡`; laut WAI-ARIA-Accname-Berechnung ist der berechnete Name daher `"≡"` (bzw. dessen Unicode-Zeichenname, je nach AT), **nicht** „Blocksatz". Wird GRÜN nach Fix 3.6. |
| E18 | **Manuelle Ergänzung, kein automatisierbarer Ersatz:** NVDA/VoiceOver-Stichprobe, welcher Name tatsächlich angekündigt wird | Manuell, außerhalb CI | Ergebnis hier/in `-req.md` nachzutragen | Nicht automatisiert — Pflichtpunkt vor Statuswechsel auf „verifiziert" (Anforderung Testfall 13) |

#### 3.1.9 Tastenkombination (Bedienelement 2, `-code.md` 3.8)

| # | Test | Schritte | Assertion | Erwarteter Status JETZT |
|---|---|---|---|---|
| E19 | `Strg/Cmd+Alt+J` justiert die Selektion, identisch zum Toolbar-Klick | Text tippen, `Strg+A`, `page.keyboard.press('ControlOrMeta+Alt+j')` | `<p>` justiert | **ROT jetzt** — keine Tastenkombination in der Keymap vorhanden (`WordEditor.tsx:71-80` bestätigt per Lektüre); der Tastendruck tut aktuell **nichts**. Wird GRÜN nach Umsetzung von `-code.md` 3.8. |

#### 3.1.10 Performance bei sehr langer Selektion (Grenzfall 3.13)

| # | Test | Schritte | Assertion | Erwarteter Status JETZT |
|---|---|---|---|---|
| E20 | 200 Absätze, `Strg+A`, justieren bleibt performant | 200× tippen+Enter, dann `Strg+A` + Klick, Zeitmessung | `< 5s`, mindestens der erste Absatz justiert | **ROT jetzt** (aus demselben Kernbug-Grund wie E1 — bricht bereits beim zweiten Absatz ab; die Zeitmessung selbst wäre technisch schnell, aber die **inhaltliche** Assertion „alle 200 justiert" scheitert). Erst nach Fix 3.1 sinnvoll als reiner Performance-Test lauffähig. |

#### 3.1.11 Rundreisen über echten Upload/Download (Anforderung Abschnitt 4)

| # | Test | Schritte | Assertion | Erwarteter Status JETZT |
|---|---|---|---|---|
| E21 | DOCX-Eigenrundreise: Toolbar-erzeugter Blocksatz exportiert exakt `<w:jc w:val="both"/>` | Einzelnen Absatz justieren, `page.waitForEvent('download')` + „Exportieren"-Klick, `download.path()` einlesen, `JSZip.loadAsync`, `word/document.xml` per DOMParser strukturell prüfen (nicht nur `.toContain`) | `<w:jc w:val="both"/>` im `w:pPr` des betroffenen Absatzes | **GRÜN erwartet** (Einzelblock-Fall, Writer unverändert korrekt) |
| E22 | Re-Import der in E21 exportierten Datei | `page.reload()`, exportierte Datei per `setInputFiles` hochladen | Absatz weiterhin `text-align: justify` im DOM | **GRÜN erwartet** |
| E23 | Mehrere aufeinanderfolgende Absätze markieren, justieren, exportieren → **alle** bleiben justiert (Testfall 5.11, 4.1.3/4.2.4) | 3 Absätze, `Strg+A`, justieren, exportieren, `document.xml` auf **3** Vorkommen von `<w:jc w:val="both"/>` prüfen | 3 Treffer | **BLOCKIERT/ROT** — hängt direkt vom Ausgang von E1/E2 ab (Anforderung selbst macht diese Abhängigkeit explizit: „abhängig vom Ausgang von Testfall 5.1"); mit aktuellem Code bricht bereits die Editor-Bedienung vor dem Export ab |
| E24 | Reale Fremddatei `56392.docx` (echtes `both`) importieren, unverändert exportieren, Blocksatz bleibt | `setInputFiles`, sichtbar `justify` im DOM, exportieren, `<w:jc w:val="both"/>` im Export | Blocksatz bleibt über die Rundreise erhalten | **GRÜN erwartet** |
| E25 | ODT-Eigenrundreise, analog E21/E22 | Analog, `content.xml` auf `fo:text-align="justify"` prüfen | Analog | **GRÜN erwartet** |
| E26 | Cross-Format: DOCX mit Blocksatz importieren → als ODT exportieren → Blocksatz bleibt (4.1.8) | Upload DOCX, Formatwechsel-UI vor Testimplementierung verifizieren (siehe Offene Punkte, Abschnitt 8) | `fo:text-align="justify"` im ODT-Export | **GRÜN erwartet, sofern UI-Formatwechsel existiert** — vor Implementierung zu klären |
| E27 | Cross-Format-Doppelrundreise mit **allen vier** Ausrichtungen gemeinsam (4.3.3) | Vier Absätze `left/center/right/justify`, je einzeln (nicht per Mehrfachselektion!) formatieren → Export ODT → Re-Import → Export DOCX | Jeder Absatz behält exakt seine ursprüngliche Ausrichtung | **GRÜN erwartet**, **sofern** jeder Absatz einzeln (nicht per Mehrfachselektion) formatiert wird — bewusst so konstruiert, um unabhängig vom Kernbug zu sein; eine Variante mit Mehrfachselektion wäre wieder blockiert |

#### 3.1.12 Reale Fixture-Dateien mit gezielter Ausrichtungsprüfung (Testfall 5.14, mit Korrektur aus 0.2)

| # | Test | Schritte | Assertion | Erwarteter Status JETZT |
|---|---|---|---|---|
| E28 | `bug-paragraph-alignment.docx` importieren, beide benannten Absätze im DOM sichtbar prüfen | Upload, `getComputedStyle`/`toHaveCSS` auf beide Absätze | „does not have explicit alignment"-Absatz zeigt `text-align: left` (bestätigt Ist-Lücke, bewusst nicht behoben); „overriding"-Absatz zeigt `text-align: left` (korrekt) | **GRÜN erwartet** (dokumentiert Ist-Zustand) |
| E29 | `table-alignment.docx` importieren | Upload | Kein Absturz; **kein** sichtbarer `justify`-Absatz vorhanden (Datei enthält laut 0.2 kein `both`) — Test darf **nicht** fälschlich einen Blocksatz-Treffer erwarten | **GRÜN erwartet** |
| E30 | `TestTableCellAlign.docx` importieren | Upload | Kein Absturz, alle Absätze `text-align: left` (Default) — **kein** Blocksatz-Test, da Datei keine horizontale Ausrichtung enthält (Korrektur) | **GRÜN erwartet** |
| E31 | `tabelleAlignMargin.odt` importieren | Upload | Analog E30, ODT-Seite | **GRÜN erwartet** |
| E32 | `feature_attributes_paragraph_MSO2013.odt` importieren, sichtbar `justify` **und** unnormalisiertes `end`-Verhalten dokumentieren | Upload | Mindestens ein Absatz zeigt `text-align: justify`; keiner der vier Toolbar-Buttons zeigt für den `end`-Absatz `aria-pressed="true"` (Ist-Zustand, Grenzfall 3.8) | **GRÜN erwartet** (dokumentiert Ist-Zustand) |

#### 3.1.13 `w:jc`/`fo:text-align` = `start` (Grenzfall 3.8/3.9, Testfall 15)

| # | Test | Schritte | Assertion | Erwarteter Status JETZT |
|---|---|---|---|---|
| E33 | `rtl.docx` importieren (`w:jc="start"` durchgängig) | Upload | Alle Absätze zeigen `text-align: left` (Ist-Fallback), **keiner** der vier Buttons zeigt `aria-pressed="true"` | **GRÜN erwartet** (dokumentiert Ist-Zustand vor Fix 3.9) |
| E34 | `listStyleId.odt` importieren (enthält `start`) | Upload | Analog | **GRÜN erwartet** |

### 3.2 Erweiterung: `tests/e2e/selection-regression.spec.ts` (Grenzfall 3.12)

Direkt im selben `describe`-Block ergänzt, analog zum bereits vorhandenen
„Fett"-Test — **wichtiger Unterschied zu den Kernbug-Tests oben:** Der
bestehende Regressionstest arbeitet mit **genau einem** Absatz zum Zeitpunkt
des Toolbar-Klicks (Text wird erst danach per `Enter` in einen zweiten Absatz
erweitert) — der Kernbug 2.2 (mehrere Blöcke in **einer** Selektion) wird
dabei **nicht** ausgelöst, da zum Zeitpunkt von `Strg+A` + Klick nur ein
Absatz existiert.

```ts
test('same regression with "Blocksatz" instead of "Fett" (Grenzfall 3.12)', async ({ page }) => {
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Hallo, das ist ein Test für Blocksatz und Selection-Sync.')
  await page.keyboard.press('ControlOrMeta+a')
  await page.getByTitle('Ausrichtung: justify').click() // vor Fix 3.6, siehe 0.1
  await editor.click()
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Zweiter Absatz.')
  await expect(editor).toContainText('Hallo, das ist ein Test für Blocksatz und Selection-Sync.')
  await expect(editor).toContainText('Zweiter Absatz.')
  await expect(page.locator('.ProseMirror p')).toHaveCount(2)
})
```

**Erwarteter Status JETZT: GRÜN** — orthogonal zum Kernbug 2.2 (siehe oben),
sollte bereits mit unverändertem Code bestehen, sofern der bereits behobene
Selection-Sync-Bug (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2) nicht erneut
auftritt.

### 3.3 Datei-Upload: echter `filechooser`, nicht nur `setInputFiles`

Wie in `fett-qa.md` Abschnitt 3.4 bereits für „Fett" festgestellt: Die
bestehenden Upload-Tests (`docx.spec.ts`, `odt.spec.ts`, per Lektüre
bestätigt) rufen `input.setInputFiles(...)` **direkt** auf dem versteckten
`<input type="file" className="hidden">` auf und umgehen damit den sichtbaren
„Datei hochladen"-Button (`FormatPicker.tsx:64-68`, real vorhanden, per Grep
bestätigt). Mindestens **ein** Testfall je Format in `alignment.spec.ts`
(E24, E28–E34) sollte den echten Klickpfad nutzen:

```ts
const [fileChooser] = await Promise.all([
  page.waitForEvent('filechooser'),
  docxCard(page).getByRole('button', { name: 'Datei hochladen' }).click(),
])
await fileChooser.setFiles({ name: '56392.docx', mimeType: '...', buffer })
```

### 3.4 Unabhängige Prüfung der heruntergeladenen Datei (nicht nur `.toContain`)

Analog `fett-qa.md` Abschnitt 3.6 — für die strukturellen Prüfungen in E21/E23
wird ein echter `DOMParser` (`jsdom`, bereits Devdependency) statt reiner
`.toContain('<w:jc')`-Stringsuche empfohlen:

```ts
import { JSDOM } from 'jsdom'
const xmlDoc = new JSDOM('').window.DOMParser().parseFromString(documentXml, 'application/xml')
const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const jc = [...xmlDoc.getElementsByTagNameNS(W_NS, 'jc')]
expect(jc.filter((el) => el.getAttributeNS(W_NS, 'val') === 'both')).toHaveLength(3)
```

Das stellt sicher, dass **genau** die erwartete Anzahl Absätze `both` trägt,
nicht nur, dass der String irgendwo in der Datei vorkommt.

### 3.5 Bestehende Tests, die unverändert weiterlaufen müssen

- `tests/e2e/selection-regression.spec.ts` — Pflichtbestandteil (Abnahme-
  kriterium 5 sinngemäß analog zu `fett-req.md`), plus die neue Erweiterung
  aus 3.2.
- `tests/e2e/docx.spec.ts`, `tests/e2e/odt.spec.ts` — bleiben bestehen, keine
  Blocksatz-Assertion enthalten (per Lektüre bestätigt), daher keine
  Ablösung nötig.
- `tests/e2e/lifecycle.spec.ts` — unverändert, keine Blocksatz-Berührung
  erwartet, muss aber grün bleiben.

### 3.6 Bereits vorhandene, laut Auftrag nicht vertrauenswürdige Tests

- `src/formats/docx/__tests__/roundtrip.test.ts:49` „preserves justify
  alignment" (`it.each`) — bestätigt per Lektüre: testet **nur** einen
  einzelnen Absatz je Durchlauf. Bleibt bestehen, wird durch 2.2/D1
  **ergänzt** (Mehrfachabsatz), nicht ersetzt.
- `src/formats/odt/__tests__/roundtrip.test.ts` analog.
- `src/formats/{docx,odt}/__tests__/external-fixtures.test.ts` — bestätigt:
  nur „importiert ohne Absturz". Bleibt bestehen, wird durch die neuen
  `alignment-fixtures.test.ts`-Dateien (2.4/2.5) um gezielte
  Ausrichtungsprüfung ergänzt.

### 3.7 Cross-Browser-Matrix

| Testgruppe | Desktop Chrome | Mobile (Pixel 7) | Tablet (iPad Mini) | Anmerkung |
|---|---|---|---|---|
| Klick-basierte Tests (E1–E3, E5–E18, E21–E34) | Pflicht | Pflicht | Pflicht | `.click()` funktioniert projektunabhängig |
| Tastatur-only-Tests (E4, E19) | Pflicht | Best-effort/dokumentieren | Best-effort/dokumentieren | `page.keyboard.press` sendet CDP-Events unabhängig vom simulierten Gerät; reales Touch-Nutzer:innen-Verhalten ohne Hardware-Tastatur ist gesondert zu dokumentieren, kein Testausschluss |
| Undo/Redo (E16) | Pflicht | Pflicht | Pflicht | Tastenkombination bleibt via `page.keyboard` projektunabhängig auslösbar |

---

## 4. Traceability-Matrix (Anforderung §5 → Testfall)

| `ausrichtung-blocksatz-req.md` §5, Punkt | Testfall(e) |
|---|---|
| 1 (Kernverdacht) | E1, E2, C1–C4 |
| 2 | E3 |
| 3 | E3 |
| 4 | E7, E8 |
| 5 | E9–E11 |
| 6 | E12 |
| 7 | E13, C13 |
| 8 | E14 |
| 9 | E15 |
| 10 | E16 |
| 11 | E21–E26, D1–D6, O1–O7 |
| 12 | E27, D6 |
| 13 | E17, E18 |
| 14 | E28–E31, F1–F5, G1–G3 |
| 15 | E32–E34, F2/F3, G1/G2 |

---

## 5. Erwarteter Ist-Status je Testfall (vor Umsetzung von `ausrichtung-blocksatz-code.md`)

| Status | Testfälle | Grund |
|---|---|---|
| **Erwartet ROT** (Fix aus `-code.md` noch nicht umgesetzt) | E1, E2, E4, E6, E8, E11 (teilweise), E19, E20, E23, C2–C4, C9, C11, C12, F3, G2 | Kernbug 2.2 (nicht umgesetzt), `isAlignActive`-Fix (nicht umgesetzt), `setHeading`-Fix (nicht umgesetzt), Tastenkombination (nicht vorhanden), `start`/`end`-Normalisierung (nicht umgesetzt), sowie ein **von QA zusätzlich gefundener** Bug (E4: fehlende Tastatur-Aktivierung, in `-code.md` **nicht** behoben) |
| **Erwartet GRÜN** (sollte mit aktuellem, unverändertem Code bereits bestehen) | E3, E5, E7 (als Ist-Dokumentation), E9, E10, E12 (Einzelblock-Variante), E13–E18, E21, E22, E24–E34, C1 (Bug-Beleg, absichtlich), C5, C7, C8, C10, C13, C14, D1–D6, O1–O7, F1, F2, F4, F5, G1, G3 | Basiert auf unverändertem, bereits funktionierendem Einzelblock-/Reader-/Writer-Verhalten bzw. dokumentiert bewusst den Ist-Zustand |
| **Blockiert bis Fix 3.1** | E23, E27 (Mehrfachselektions-Variante), C6 | Hängt direkt vom Ausgang des Kernbugs ab — sinnvoll erst nach dessen Behebung ausführbar |
| **Manuell, nicht automatisiert** | E18 | Screenreader-Stichprobe |

Sobald `-code.md` Abschnitt 3.1 (Kernfix) umgesetzt ist, müssen E1, E2, E23,
C2–C4, C6 von ROT/blockiert auf GRÜN wechseln — **das** ist der konkrete,
maschinell prüfbare Nachweis, dass der wichtigste Einzelpunkt der gesamten
Anforderung behoben ist (DoD Punkt 1). C1 muss zum selben Zeitpunkt **aktiv
entfernt** werden (siehe 2.6.1).

---

## 6. Abgleich mit Abnahmekriterien (`ausrichtung-blocksatz-req.md` Abschnitt 6)

| DoD-Punkt | Abdeckung in diesem Testplan |
|---|---|
| 1. Kernverdacht nachgestellt, widerlegt/behoben, dauerhafter Regressionstest | Abschnitt 0 (Gegenkontrolle: bestätigt vorhanden), C1/C2 (Unit), E1/E2 (E2E) — C2/E1/E2 sind die geforderten dauerhaften Regressionstests |
| 2. Alle Testfälle aus §5 real im Browser ausgeführt, grün | Abschnitt 3 (E1–E34) + Traceability-Matrix Abschnitt 4 — **derzeit nicht alle grün, siehe Abschnitt 5** |
| 3. Rundreisen §4 durch unabhängigen Parser/Re-Import bestätigt | E21–E27, D1–D6, O1–O7, Abschnitt 3.4 |
| 4. Alle Grenzfälle §3 einzeln geprüft, dokumentiert | Durchgängig referenziert je Testfall (Spalte „Bezug"/Testbeschreibung); insbesondere 3.9/3.10 durch reale Fixtures (F2–F4, G1) eingefroren |
| 5. Offene Fragen 2.4 (Toggle/Undo) und 2.5 (setHeading-Reset) beantwortet | E6/C-Reihe (2.4), E7/E8/C11/C12 (2.5) — Entscheidungen selbst stehen in `-code.md` 3.4/3.5, hier nur die Verifikation |
| 6. `aria-label`-Defizit/Icon-Rendering bewertet | E17/E18 (`aria-label`), **plus neuer QA-Fund E4** (fehlende Tastaturaktivierung — von `-code.md` nicht abgedeckt, siehe Abschnitt 8) |
| 7. Vier bislang ungenutzte Fixtures angebunden | E28–E31, F1/F5, G1/G3 — **inklusive Korrektur**, dass zwei der vier Fixtures keine horizontale Ausrichtung enthalten (Abschnitt 0.2) |

---

## 7. Ausführungsreihenfolge (Vorschlag)

1. `commands.test.ts` C1–C4 (Kernbug, Unit-Ebene) zuerst schreiben und
   ausführen — C1 bestätigt den Bug bewusst als GRÜN, C2–C4 sind bewusst ROT;
   das ist der schnellste, maschinelle Nachweis, dass der Kernverdacht real
   ist, bevor der Browser überhaupt involviert wird.
2. `alignment.spec.ts` E1/E2 (Kernverdacht im echten Browser) — deckt sich mit
   C1–C4, bestätigt zusätzlich, dass der Bug auch über die reale
   Toolbar-Bedienung (nicht nur synthetisch im Node-Kontext) auftritt, und
   dokumentiert das exakte Konsolen-Fehlerbild.
3. `alignment.spec.ts` E3–E20 (Einzelblock-Bedienung, Grenzfälle, Tastatur/
   Screenreader-Näherung).
4. `alignment.spec.ts` E21–E34 (Rundreisen, reale Fixtures).
5. `roundtrip.test.ts`-Erweiterungen (D1–D6, O1–O7) und
   `alignment-fixtures.test.ts` (F1–F5, G1–G3) — Unit-Ebene, parallel zu 3/4
   möglich, da entkoppelt vom Kernbug.
6. `selection-regression.spec.ts`-Erweiterung (3.2).
7. Nach Umsetzung von `ausrichtung-blocksatz-code.md` Abschnitt 3.1/3.3/3.5/
   3.9/3.11: alle als „ROT erwartet"/„blockiert" markierten Fälle erneut
   ausführen, Statuswechsel auf GRÜN dokumentieren; C1 aktiv entfernen;
   Locator-Migration aus Abschnitt 0.1 durchführen, sobald Fix 3.6 landet.
8. Traceability-Matrix (Abschnitt 4) und DoD-Abgleich (Abschnitt 6) final
   gegenprüfen, bevor der Backlog-Status auf „verifiziert" geändert wird.

---

## 8. Offene Punkte für QA

- **Neuer, in `ausrichtung-blocksatz-code.md` nicht behobener Fund (E4):**
  `AlignButton` hat wie `MarkButton` (bekanntes Fehler-1-Muster aus
  `fett-code.md`) ausschließlich `onMouseDown`, kein `onClick`/`onKeyDown` —
  der von `-code.md` Abschnitt 3.6 vorgeschlagene Fix behält dieses Muster
  bei. Sollte an die Autor:innen von `-code.md` zurückgespiegelt werden, da
  Anforderung Bedienelement 1 Tastaturbedienung explizit fordert.
- **Locator-Abhängigkeit (Abschnitt 0.1):** Alle E2E-Tests in diesem Plan
  verwenden bewusst `page.getByTitle('Ausrichtung: justify')` statt der in
  `-code.md` selbst bereits vorgeschlagenen Post-Fix-Locators
  (`getByTitle('Blocksatz')`/`getByLabel(...)`) — nach Umsetzung von Fix 3.6
  müssen **alle** hier aufgeführten Testfälle auf die neuen Locators migriert
  werden. Nicht vergessen, da sonst ein stiller, plötzlicher Bruch der
  gesamten neuen Suite droht.
- **E26 (Cross-Format-Export direkt aus einer Karte heraus)** hängt davon ab,
  ob die UI überhaupt einen Formatwechsel beim Export aus derselben Karte
  erlaubt oder zwingend der Umweg über Re-Import in die jeweils andere Karte
  nötig ist (wie in E27 beschrieben) — vor Testimplementierung an der
  tatsächlichen UI zu verifizieren (identische offene Frage wie in
  `fett-qa.md` Abschnitt 8 für „Fett").
- **E14/E15 (Clipboard-Paste-Simulation)** können je nach Playwright-/
  Browser-Version und CI-Sandbox-Einstellungen für Zwischenablage-
  Berechtigungen instabil sein; Fallback auf `execCommand('insertHTML')` im
  Seitenkontext vorsehen, falls `ClipboardEvent`-Konstruktion in CI blockiert
  wird (identisches Risiko wie in `fett-qa.md` für B29/B30 dokumentiert).
- **E11 (Tabellenspalten-`CellSelection` per echter Maus-/Tastaturbedienung)**
  erfordert vorab Klärung, wie sich eine `CellSelection` über mehrere Zellen
  in diesem Editor per Playwright überhaupt zuverlässig erzeugen lässt (Drag
  über Zellgrenzen vs. `Shift`+Klick vs. Tastatur) — vor Testimplementierung
  am realen Editor zu verproben, da ProseMirror-Tabellen dafür je nach
  Konfiguration unterschiedliche Interaktionsmuster unterstützen.
- **C6 (Unit-Test für den `CellSelection`-Rechteck-Fix)** ist erst sinnvoll
  ausführbar, sobald Fix 3.1 umgesetzt ist — vorher bereits vorbereiten
  (Testcode schreiben), aber als „blockiert" führen statt fälschlich rot
  laufen zu lassen und zu ignorieren.
- **E18 (Screenreader-Stichprobe NVDA/VoiceOver)** ist und bleibt ein
  manueller Prüfschritt außerhalb der CI — Ergebnis vor Statuswechsel auf
  „verifiziert" hier und in `-req.md`/`-code.md` nachzutragen.
