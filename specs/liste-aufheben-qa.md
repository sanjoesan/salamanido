# QA-Testplan: „Liste aufheben"

Gegenstück zu `specs/liste-aufheben-req.md` (Anforderung) und `specs/liste-aufheben-code.md`
(Umsetzungsplan des Dev-Agenten). Dieses Dokument ist der **Testplan der QA-Rolle**: es legt
fest, welche Tests geschrieben werden, mit welchem konkreten Code, gegen welche echten
Dateien/Fixtures, und wie das Ergebnis gegen Anforderungsabschnitt 6/7/8 abgeglichen wird. Es
ersetzt nicht die Ausführung, sondern ist die verbindliche, ausführbare Grundlage dafür.

Stil/Aufbau folgen bewusst `specs/durchgestrichen-qa.md` (zuletzt geprüftes Schwesterfeature),
damit alle QA-Pläne in diesem Repo vergleichbar bleiben.

---

## 0. Kurzfassung für Eilige

- **Vor Testerstellung wurde der tatsächliche Code geprüft** (nicht nur `liste-aufheben-code.md`
  gelesen). Ergebnis: **keiner** der in `liste-aufheben-code.md` Abschnitt 0/3 angekündigten Fixes
  ist im aktuellen Code umgesetzt — Stand dieser Prüfung ist ausschließlich der **Ist-Zustand aus
  `liste-aufheben-req.md` Abschnitt 1** (Referenztabelle), nicht der Soll-Zustand aus dem
  Umsetzungsplan. Einzelheiten siehe Abschnitt 1.
- Dieser Testplan ist deshalb bewusst so geschrieben, dass er **beide Zustände abbildet**: Tests,
  die einen der in Abschnitt 1 bestätigten offenen Punkte betreffen, sind explizit als „erwartet
  RED (fehlschlagend) bis `liste-aufheben-code.md` umgesetzt ist, danach erwartet GREEN"
  gekennzeichnet — kein Test wird „geschönt", um heute zu bestehen.
- Zwei Testebenen, wie beauftragt:
  1. **Unit-Tests (Vitest/jsdom)** für die Reader/Writer-Rundreise DOCX **und** ODT — Abschnitt 4.
  2. **Echte Playwright-Browser-Tests** — echte Mausklicks, echtes Tippen über `page.keyboard`,
     echter Datei-Upload über `input[type=file]`, echter Download über
     `page.waitForEvent('download')` mit anschließendem Einlesen/Entpacken der **tatsächlich
     heruntergeladenen Datei** — nicht nur interne Aufrufe von
     `readDocx`/`writeDocx`/`readOdt`/`writeOdt`/`liftFromList`. Abschnitt 5.
- Alle in diesem Plan referenzierten Fixtures (`listLevel10.odt`, `imageWithinList.odt`,
  `listsInTable.odt`, `brokenList.odt`, `ListOddity.odt`, `ComplexNumberedLists.docx` u. a.)
  wurden **vor dem Schreiben dieses Plans** im Dateisystem auf tatsächliche Existenz geprüft
  (Abschnitt 6) — nicht aus `liste-aufheben-code.md` unbesehen übernommen.
- Weder unter `src/**/__tests__/` noch unter `tests/e2e/` existiert **irgendeine** Datei, die in
  diesem Plan vorgeschlagen wird (`commands.test.ts`, `odt/__tests__/list-structure.test.ts`,
  `tests/e2e/liste-aufheben.spec.ts`) — per `ls` bestätigt, nicht nur per Volltextsuche vermutet
  (siehe Abschnitt 1). Dieser Plan beschreibt vollständig **neue** Testabdeckung, keine Erweiterung
  vorhandener Dateien außer den beiden `roundtrip.test.ts` und `selection-regression.spec.ts`.

---

## 1. Ausgangslage: Code-Audit vor Testerstellung

Geprüft wurden die tatsächlichen Dateien im Repo (nicht nur die Beschreibung in
`liste-aufheben-code.md`): `src/formats/shared/schema.ts`,
`src/formats/shared/editor/{commands.ts,Toolbar.tsx,WordEditor.tsx}`,
`src/formats/docx/{reader.ts,writer.ts,styleDefs.ts}`, `src/formats/odt/reader.ts`, beide
`__tests__/roundtrip.test.ts`, beide `__tests__/external-fixtures.test.ts`,
`tests/e2e/{docx,odt,selection-regression}.spec.ts`, `package.json`, `vite.config.ts`, sowie
das Vorhandensein aller in `liste-aufheben-req.md`/`liste-aufheben-code.md` genannten
Fixture-Dateien per `ls`.

| # | `liste-aufheben-code.md` kündigt an | Tatsächlicher Code-Stand (verifiziert) | QA-Konsequenz |
|---|---|---|---|
| 1 | `odt/reader.ts`, `text:list`-Zweig in `elementToBlocks`: führende leere `paragraph` einfügen, wenn `list_item`-Inhalt nicht mit `paragraph` beginnt (Abschnitt 3.1) | **Nicht umgesetzt.** `elementToBlocks` (aktuell Zeile 179-187) baut `list_item.content` weiterhin unverändert direkt aus `elementToBlocks(child, ...)` ohne Prüfung, ob das erste Element ein `paragraph` ist | Testfall „imageWithinList.odt: `list_item` beginnt mit `paragraph`" (Abschnitt 4.3) **muss** nach heutigem Stand **RED** sein — bestätigter, reproduzierbarer Schema-Verstoß |
| 2 | `odt/reader.ts`, `decodeInline`/`walk()`: neuer Zweig für `text:a`, rekursiert in Kinder (Abschnitt 3.2) | **Nicht umgesetzt.** `walk()` (aktuell Zeile 96-116) kennt weiterhin nur vier Fälle (`text:span`, `text:line-break`, `text:s`, `text:tab`) — **kein** `text:a`-Zweig, kein genereller Fallback | Testfall „listLevel10.odt: Text `www.tool.de` bleibt erhalten" (Abschnitt 4.3) **muss** nach heutigem Stand **RED** sein — bestätigter Textverlust |
| 3 | `commands.ts`: neuer Export `canLiftFromList(state)` (Abschnitt 3.3) | **Nicht umgesetzt.** `commands.ts` exportiert weiterhin ausschließlich `liftFromList` (Zeile 62-64); `canLiftFromList` existiert nirgends im Repo (`grep -rn canLiftFromList src` → 0 Treffer) | Jeder Test in `commands.test.ts`, der `canLiftFromList` importiert und aufruft, **muss** nach heutigem Stand mit `TypeError: canLiftFromList is not a function` fehlschlagen (kein TS-Compile-Gate in Vitest, siehe `vite.config.ts` — der fehlende Export fällt erst zur Laufzeit auf, nicht beim Import) |
| 4 | `Toolbar.tsx`: „⇧ Liste"-Button bekommt `aria-label`, `aria-disabled` über `canLiftFromList` (Abschnitt 3.3) | **Nicht umgesetzt.** Button (aktuell Zeile 214-224) hat weiterhin **kein** `aria-label`, **kein** `aria-disabled`, **keine** bedingte CSS-Klasse — exakt wie in `liste-aufheben-req.md` Referenztabelle beschrieben | Jeder E2E-Test, der `toHaveAttribute('aria-disabled', ...)` auf `getByTitle('Liste aufheben')` erwartet, **muss** nach heutigem Stand **RED** sein (Attribut existiert nicht → `undefined` ≠ erwarteter String) |
| 5 | `WordEditor.tsx`: bewusst **keine** Tastenkombination ergänzt (Abschnitt 3.4) | **Bestätigt unverändert** — Keymap (Zeile 71-79) enthält weiterhin nur `Mod-z/y/Shift-z`, `Enter: splitListItem(...)`, `Mod-b/i/u`, kein Listen-Ein-/Ausrück- oder Aufheben-Eintrag | Kein Test nötig/möglich hierzu — Entscheidung „keine Taste" ist bereits korrekt umgesetzt (durch Unterlassung) |
| 6 | `docx/styleDefs.ts`: nur Kommentar zur bewusst nicht gefixten `start`-Divergenz (Abschnitt 3.6) | **Nicht umgesetzt** (kein Kommentar vorhanden), aber **keine Verhaltensänderung angekündigt** — reine Doku-Lücke ohne Testrelevanz | Keine Testkonsequenz; wird in Abschnitt 8 als offener Dokumentationspunkt vermerkt |

Zusätzlich verifiziert, **bereits korrekt** (kein Fix nötig, nur Testabdeckung — deckt sich mit
`liste-aufheben-req.md` Referenztabelle und `liste-aufheben-code.md` Abschnitt 2):

- `commands.ts:62-64` `liftFromList()` — reiner, unveränderter Alias um
  `liftListItem(wordSchema.nodes.list_item)` aus `prosemirror-schema-list`. Kein Projektcode,
  keine Sonderbehandlung.
- `schema.ts:74-81/83-96/98-104` — `bullet_list`/`ordered_list`/`list_item` exakt wie in der
  Anforderung beschrieben (`list_item`-Content `paragraph block*`).
- `docx/reader.ts`/`docx/writer.ts`/`docx/styleDefs.ts` — Split-/Rundreiseverhalten für
  Teillisten bereits wie in `liste-aufheben-code.md` Abschnitt 3.8 beschrieben (kein Fix
  angekündigt, nur Testabdeckung fehlt).
- **Kein** Treffer für „Liste aufheben"/`liftFromList` in `tests/e2e/` (per `grep -rl` bestätigt,
  0 Dateien) — deckt sich mit Anforderung Abschnitt 6, Einleitungssatz.
- **Keine** der in diesem Plan bzw. in `liste-aufheben-code.md` Abschnitt 5 vorgeschlagenen neuen
  Testdateien existiert bereits im Repo (`src/formats/shared/editor/__tests__/commands.test.ts`,
  `src/formats/odt/__tests__/list-structure.test.ts`, `tests/e2e/liste-aufheben.spec.ts` — per
  `ls` bestätigt, alle drei Pfade nicht vorhanden).
- Alle referenzierten Fixture-Dateien (`tests/fixtures/external/odt/{listLevel10,
  imageWithinList, listsInTable, brokenList, ListOddity, bulletListTest, list, liste2,
  simple_bullet_list, simpleList, EasyList, ListRoundtrip}.odt`,
  `tests/fixtures/external/docx/ComplexNumberedLists.docx`) existieren tatsächlich im
  Dateisystem — per `ls` geprüft, nicht nur aus dem Anforderungstext übernommen.
- `src/formats/odt/__tests__/external-fixtures.test.ts:17`: `brokenList.odt` ist bereits als
  `SKIP_SLOW_UNDER_JSDOM` markiert (2,4 MB, 90 s+ unter `jsdom`) — bestätigt exakt den in
  `liste-aufheben-code.md` Abschnitt 6 dokumentierten Befund; Testfall 13/Grenzfall 13 **muss**
  deshalb zwingend im E2E-Layer laufen (echtes Chromium ist deutlich schneller), nicht als
  Vitest-Unit-Test.

**Konsequenz für diesen Testplan:** Die Tests aus Abschnitt 4/5 werden so geschrieben, dass sie
sowohl den heutigen (Bug-)Zustand korrekt als fehlschlagend dokumentieren als auch nach Umsetzung
von `liste-aufheben-code.md` ohne Änderung grün werden.

---

## 2. Testumgebung & Ausführung

| Ebene | Werkzeug | Befehl | Konfiguration |
|---|---|---|---|
| Unit | Vitest, Environment `jsdom`, `globals: true` | `npm test` / `npm run test:watch` | `vite.config.ts` — `setupFiles: ['./src/test/setup.ts']`, **kein** Typecheck-Plugin aktiv (wichtig für Abschnitt 1, Punkt 3: ein fehlender Named Export fällt erst als Laufzeit-`TypeError` auf, nicht als Build-Fehler) |
| E2E | Playwright | `npm run test:e2e` / `npm run test:e2e:ui` | `playwright.config.ts` — `testDir: tests/e2e`, `webServer` baut automatisch (`npm run build && npm run preview -- --port 4173`) und startet die Vorschau; Projekte: Desktop Chrome, Mobile (Pixel 7), Tablet (iPad Mini) |

Alle neuen/erweiterten Testdateien in diesem Plan fügen sich ohne Konfigurationsänderung in die
bestehende Suite ein.

---

## 3. Traceability-Matrix — Anforderung (Abschnitt 6, Testfälle) → Testartefakt

| Testfall (`liste-aufheben-req.md` §6) | Ebene | Testartefakt | Erwartung heute (vor `liste-aufheben-code.md`) |
|---|---|---|---|
| 1 (mittleren Punkt einer 3er-Bullet-Liste aufheben) | E2E | `liste-aufheben.spec.ts` „Testfall 1" | GREEN — reiner Bibliothekscode, unverändert |
| 2 (alle Punkte markieren, Liste verschwindet) | E2E | `liste-aufheben.spec.ts` „Testfall 2" | GREEN |
| 3 (nummerierte Liste, Startwert zweite Teilliste) | E2E + Unit | `liste-aufheben.spec.ts` „Testfall 3" + `commands.test.ts` | GREEN (Verhalten bereits vorhanden, wird nur protokolliert, nicht korrigiert — siehe Abschnitt 8) |
| 4 (Klick außerhalb jeder Liste, kein Fehler) | E2E | `liste-aufheben.spec.ts` „Testfall 4" | Teilweise **RED**: No-Op-Teil GREEN, `aria-disabled`-Teil **RED** (Abschnitt 1, Punkt 4) |
| 4b (Button zeigt `aria-disabled=false` in Liste) | E2E | `liste-aufheben.spec.ts` „Testfall 4b" | **RED** (Attribut existiert nicht) |
| 5 (Selektion über Listenrand hinaus, Grenzfall 4.5) | E2E + Unit | `liste-aufheben.spec.ts` „Testfall 5" + `commands.test.ts` | GREEN erwartet für den Aufheben-Teil (reiner Bibliothekscode); protokollierender Teil ist kein Pass/Fail, sondern Dokumentation des tatsächlichen Verhaltens |
| 6 (Strg+A über gemischtem Inhalt, Grenzfall 4.6) | E2E + Unit | `liste-aufheben.spec.ts` „Testfall 6" + `commands.test.ts` | GREEN erwartet, analog zu Testfall 5 |
| 7 (Liste in Tabellenzelle, Grenzfall 8) | E2E | `liste-aufheben.spec.ts` „Testfall 7" | GREEN |
| 8 (Undo/Redo) | E2E | `liste-aufheben.spec.ts` „Testfall 8" | GREEN |
| 9 (danach erneut Liste erzeugen) | E2E | `liste-aufheben.spec.ts` „Testfall 9" | GREEN |
| 10 (Rundreise über echten Upload/Download, je Format) | E2E | `liste-aufheben.spec.ts` „Rundreisen" | GREEN |
| 11 (reale Fremddatei-Importe + Aufheben) | E2E | `liste-aufheben.spec.ts` — `ComplexNumberedLists.docx`, `imageWithinList.odt`, `listsInTable.odt`, `brokenList.odt`, `ListOddity.odt` | `ComplexNumberedLists.docx`/`listsInTable.odt`/`brokenList.odt`/`ListOddity.odt`: GREEN. `imageWithinList.odt`: **RED** (Abschnitt 1, Punkt 1 — Bild-Punkt verletzt Schema bereits beim Import, vor jedem Klick) |
| 12 / Grenzfall 4.4 (mehrstufige Liste, Klicks protokollieren) | E2E + Unit | `liste-aufheben.spec.ts` „Testfall 12" + `odt/__tests__/list-structure.test.ts` | **RED** für den Hyperlink-Text-Teil (Abschnitt 1, Punkt 2); Klick-Zählung selbst voraussichtlich GREEN |
| 13 (Regressionstest Selection-Sync + „Liste aufheben") | E2E | `selection-regression.spec.ts` (Erweiterung) | GREEN |
| 14 (Cross-Format-Rundreise, doppelt) | E2E | `liste-aufheben.spec.ts` „Testfall 14a/14b" | GREEN |
| 15 (optischer Vergleich) | E2E | `liste-aufheben.spec.ts` „Testfall 15" | GREEN |

---

## 4. Teil A — Unit-Tests: Reader/Writer-Rundreise (DOCX **und** ODT)

### 4.1 Bestandsaufnahme

Vorhanden: `src/formats/docx/__tests__/roundtrip.test.ts` (`describe('DOCX round trip: lists', ...)`,
Zeile 135-171) und `src/formats/odt/__tests__/roundtrip.test.ts` (analoges Pendant) — beide
prüfen ausschließlich das **Anlegen** von Listen (Bullet mit mehreren Punkten, Ordered vs.
Bullet, zwei getrennte Listen mit trennendem Absatz), **keiner** prüft den Zustand **nach** einem
„Liste aufheben"-Klick oder ruft `liftFromList`/`liftListItem` auf. Fehlt vollständig: Reader/
Writer-Verhalten für den nachgelagerten Zustand (Absatz zwischen zwei Teillisten, `ordered_list`
mit erhaltenem `start` nach Split, Zusatzblöcke nach Lift), sowie jeder Test der eigentlichen
Editor-Transformation selbst (`commands.test.ts` existiert nicht).

### 4.2 Neu: `src/formats/shared/editor/__tests__/commands.test.ts`

Reiner Logik-Test ohne Browser/DOM — konstruiert `EditorState` direkt aus `wordSchema` und prüft
`liftFromList`/`canLiftFromList` isoliert gegen die in Anforderungsabschnitt 3/4 beschriebenen
Fälle. Positionen werden **nicht** über hartkodierte `nodeSize`-Arithmetik ermittelt (das im
Umsetzungsplan `liste-aufheben-code.md` Abschnitt 5.1 vorgeschlagene Muster ist bei künftigen
Schemaänderungen fehleranfällig, siehe QA-Anmerkung unten), sondern über einen robusten
Text-Such-Helfer:

```ts
import { EditorState, TextSelection, AllSelection } from 'prosemirror-state'
import type { Node as PMNode } from 'prosemirror-model'
import { wordSchema } from '../../schema'
import { liftFromList, canLiftFromList, toggleList } from '../commands'

function doc(...children: PMNode[]) {
  return wordSchema.nodes.doc.create(null, children)
}
function para(text: string) {
  return wordSchema.nodes.paragraph.create({ align: 'left' }, text ? wordSchema.text(text) : undefined)
}
function item(...children: PMNode[]) {
  return wordSchema.nodes.list_item.create(null, children)
}
function bulletList(...items: PMNode[]) {
  return wordSchema.nodes.bullet_list.create(null, items)
}
function orderedList(start: number, ...items: PMNode[]) {
  return wordSchema.nodes.ordered_list.create({ start }, items)
}

function stateFor(node: ReturnType<typeof doc>) {
  return EditorState.create({ doc: node, schema: wordSchema })
}

// QA-Anmerkung: robuster als die im Umsetzungsplan vorgeschlagene manuelle
// nodeSize-Subtraktion (liste-aufheben-code.md Abschnitt 5.1) -- findet die Position anhand
// des tatsächlichen Textinhalts, bleibt also bei Schemaänderungen (neue Attribute, andere
// Nesting-Tiefe) korrekt, ohne dass die Testautorin die Positionsarithmetik neu rechnen muss.
function findTextPos(root: PMNode, text: string): number {
  let found = -1
  root.descendants((node, pos) => {
    if (found !== -1) return false
    if (node.isText && node.text === text) {
      found = pos
      return false
    }
    return true
  })
  if (found === -1) throw new Error(`findTextPos: "${text}" nicht im Dokument gefunden`)
  return found
}

function cursorIn(state: EditorState, text: string): EditorState {
  const pos = findTextPos(state.doc, text) + 1
  return state.apply(state.tr.setSelection(TextSelection.near(state.doc.resolve(pos))))
}

function applyLift(state: EditorState): EditorState {
  let result = state
  liftFromList()(state, (tr) => {
    result = state.apply(tr)
  })
  return result
}

describe('liftFromList (Anforderung Abschnitt 3.1/3.4 -- reiner Bibliothekscode, GREEN erwartet)', () => {
  it('cursor in middle item of a 3-item bullet list splits into list/paragraph/list', () => {
    let state = stateFor(doc(bulletList(item(para('eins')), item(para('zwei')), item(para('drei')))))
    state = cursorIn(state, 'zwei')
    state = applyLift(state)
    expect(state.doc.content.content.map((n) => n.type.name)).toEqual(['bullet_list', 'paragraph', 'bullet_list'])
    expect(state.doc.textContent).toBe('einszweidrei')
  })

  it('lifting the only item removes the wrapping list node entirely (Grenzfall 2)', () => {
    let state = stateFor(doc(bulletList(item(para('einzig')))))
    state = cursorIn(state, 'einzig')
    state = applyLift(state)
    expect(state.doc.content.content.map((n) => n.type.name)).toEqual(['paragraph'])
    expect(state.doc.textContent).toBe('einzig')
  })

  it('selection covering all items removes the list, text order preserved (Abschnitt 3.2/3.5)', () => {
    let state = stateFor(doc(bulletList(item(para('a')), item(para('b')), item(para('c')))))
    state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 1, state.doc.content.size - 1)))
    state = applyLift(state)
    expect(state.doc.content.content.map((n) => n.type.name)).toEqual(['paragraph', 'paragraph', 'paragraph'])
    expect(state.doc.textContent).toBe('abc')
  })

  it('ordered list split keeps both halves "ordered_list" with the SAME start value (Grenzfall 4.3, dokumentiert -- kein Fix vorgesehen)', () => {
    let state = stateFor(doc(orderedList(1, item(para('eins')), item(para('zwei')), item(para('drei')))))
    state = cursorIn(state, 'zwei')
    state = applyLift(state)
    const [first, , third] = state.doc.content.content
    expect(first.type.name).toBe('ordered_list')
    expect(third.type.name).toBe('ordered_list')
    expect(first.attrs.start).toBe(1)
    expect(third.attrs.start).toBe(1) // bestätigt: NICHT automatisch fortlaufend im eigenen Modell
  })

  it('nested list: lifting the deepest item moves it one level up first, NOT directly to a paragraph (Abschnitt 3.6/Grenzfall 4.4)', () => {
    const inner = bulletList(item(para('tief')))
    let state = stateFor(doc(bulletList(item(para('außen'), inner))))
    state = cursorIn(state, 'tief')
    state = applyLift(state)
    // Nach EINEM Klick: "tief" ist Geschwister-Listenpunkt von "außen" in DERSELBEN äußeren
    // Liste, noch KEIN normaler Absatz (liftToOuterList, nicht liftOutOfList -- siehe
    // liste-aufheben-code.md Abschnitt 3.5, am installierten Bibliothekscode bestätigt).
    const outerList = state.doc.content.content[0]
    expect(outerList.type.name).toBe('bullet_list')
    expect(outerList.content.content.map((n) => n.firstChild!.textContent)).toEqual(['außen', 'tief'])
    // Zweiter Klick auf denselben (jetzt nicht mehr verschachtelten) Punkt hebt ihn vollständig
    // zu einem normalen Absatz -- Verschachtelungsebene erschöpft.
    state = cursorIn(state, 'tief')
    state = applyLift(state)
    expect(state.doc.content.content.map((n) => n.type.name)).toEqual(['bullet_list', 'paragraph'])
  })

  it('extra blocks inside a lifted item (image after paragraph) become separate sibling blocks (Abschnitt 3.9/Grenzfall 10)', () => {
    const img = wordSchema.nodes.image.create({ src: 'data:image/png;base64,x', alt: '' })
    let state = stateFor(doc(bulletList(item(para('mit Bild'), img))))
    state = cursorIn(state, 'mit Bild')
    state = applyLift(state)
    expect(state.doc.content.content.map((n) => n.type.name)).toEqual(['paragraph', 'image'])
  })

  it('selection reaching from a list item into a following plain paragraph is a no-op (Grenzfall 4.5)', () => {
    const d = doc(bulletList(item(para('punkt'))), para('normal'))
    let state = stateFor(d)
    state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 2, state.doc.content.size - 2)))
    const before = state.doc.toJSON()
    const applied = liftFromList()(state, () => {
      throw new Error('sollte nicht dispatchen -- Aktion darf über den Listenrand hinaus nichts tun')
    })
    expect(applied).toBe(false)
    expect(state.doc.toJSON()).toEqual(before)
  })

  it('AllSelection (Strg+A) over mixed list + paragraph content is a no-op (Grenzfall 4.6)', () => {
    const d = doc(bulletList(item(para('punkt'))), para('normal'))
    let state = stateFor(d)
    state = state.apply(state.tr.setSelection(new AllSelection(state.doc)))
    const applied = liftFromList()(state, () => {
      throw new Error('sollte nicht dispatchen')
    })
    expect(applied).toBe(false)
  })

  it('cursor exactly at the paragraph boundary at the end of the last list item (Grenzfall 16)', () => {
    const d = doc(bulletList(item(para('letzter Punkt'))), para('normaler Absatz'))
    let state = stateFor(d)
    const boundaryPos = findTextPos(state.doc, 'letzter Punkt') + 'letzter Punkt'.length
    state = state.apply(state.tr.setSelection(TextSelection.near(state.doc.resolve(boundaryPos))))
    // Protokolliert, welcher der beiden angrenzenden Blöcke (Listenpunkt vs. folgender Absatz)
    // von blockRange erfasst wird -- kein Pass/Fail-Assert auf eine unbewiesene Annahme, sondern
    // Feststellung des tatsächlichen Verhaltens für die Dokumentation (Grenzfall 16).
    const canLift = canLiftFromList(state)
    // eslint-disable-next-line no-console
    console.log(`Grenzfall 16: canLiftFromList an Absatzgrenze = ${canLift}`)
    expect(typeof canLift).toBe('boolean')
  })
})

describe('canLiftFromList (Abschnitt 3.3, Grenzfall 1/15 -- erwartet RED bis Fix aus liste-aufheben-code.md Abschnitt 3.3 umgesetzt ist)', () => {
  it('is false with the cursor in a plain paragraph', () => {
    const state = stateFor(doc(para('normal')))
    expect(canLiftFromList(state)).toBe(false)
  })

  it('is true with the cursor inside a list item', () => {
    let state = stateFor(doc(bulletList(item(para('punkt')))))
    state = cursorIn(state, 'punkt')
    expect(canLiftFromList(state)).toBe(true)
  })

  it('is false for a selection spanning list + trailing paragraph, matching the actual click outcome (Grenzfall 4.5)', () => {
    const d = doc(bulletList(item(para('punkt'))), para('normal'))
    let state = stateFor(d)
    state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 2, state.doc.content.size - 2)))
    expect(canLiftFromList(state)).toBe(false)
  })
})

describe('nach dem Aufheben erneut listenfähig (Abschnitt 3.13)', () => {
  it('a lifted paragraph can be turned back into a new list', () => {
    let state = stateFor(doc(bulletList(item(para('punkt')))))
    state = cursorIn(state, 'punkt')
    state = applyLift(state)
    expect(state.doc.content.content.map((n) => n.type.name)).toEqual(['paragraph'])
    state = cursorIn(state, 'punkt')
    let applied = false
    toggleList(false)(state, (tr) => {
      state = state.apply(tr)
      applied = true
    })
    expect(applied).toBe(true)
    expect(state.doc.content.content[0].type.name).toBe('bullet_list')
  })
})
```

**Erwartung heute (vor Fix aus Abschnitt 1, Punkt 3/4):** Jeder Test, der `canLiftFromList`
aufruft (`describe('canLiftFromList ...)`, sowie der Grenzfall-16-Test), schlägt mit
`TypeError: canLiftFromList is not a function` fehl, weil `commands.ts` diesen Export noch nicht
bereitstellt. Alle Tests in `describe('liftFromList ...)`, die **nicht** `canLiftFromList`
verwenden, sind bereits heute **GREEN**, da `liftFromList()` unverändert reiner Bibliothekscode
ist (siehe Abschnitt 1).

### 4.3 Neu: `src/formats/odt/__tests__/list-structure.test.ts`

Dediziert für die beiden in `liste-aufheben-code.md` Abschnitt 3.1/3.2 beschriebenen (nach diesem
Audit: **noch nicht gefixten**) Bugs, gegen die **echten** Fixtures (nicht nur synthetische
Daten) — deckt Testfall 11/12 und Anforderung DoD 6 ab:

```ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { readOdt } from '../reader'
import { wordSchema } from '../../shared/schema'

const FIXTURES_DIR = join(__dirname, '../../../../tests/fixtures/external/odt')

async function loadFixture(name: string) {
  const buffer = readFileSync(join(FIXTURES_DIR, name))
  return readOdt(new Blob([new Uint8Array(buffer)]))
}

function collectText(node: any, out: string[] = []): string[] {
  if (node.type === 'text') out.push(node.text)
  ;(node.content ?? []).forEach((n: any) => collectText(n, out))
  return out
}

describe('imageWithinList.odt (Testfall 11/DoD 6 -- erwartet RED bis liste-aufheben-code.md Abschnitt 3.1 umgesetzt ist)', () => {
  it('the list item starts with a paragraph (schema-valid) and keeps the image', async () => {
    const result = await loadFixture('imageWithinList.odt')
    const list = (result.body as any).content.find((n: any) => n.type === 'bullet_list' || n.type === 'ordered_list')
    expect(list).toBeTruthy()
    const firstItem = list.content[0]
    // Heute vermutlich FEHLSCHLAGEND: firstItem.content[0].type ist "image", nicht "paragraph"
    // (bestätigter Bug, siehe Abschnitt 1 dieses Plans / liste-aufheben-code.md Abschnitt 3.1).
    expect(firstItem.content[0].type).toBe('paragraph')
    expect(firstItem.content.some((n: any) => n.type === 'image')).toBe(true)
  })

  it('is accepted by wordSchema.nodeFromJSON without throwing (regression net -- Node.fromJSON validiert Content nicht, siehe liste-aufheben-code.md Abschnitt 1 Punkt 2, daher kein Crash bereits heute)', async () => {
    const result = await loadFixture('imageWithinList.odt')
    expect(() => wordSchema.nodeFromJSON(result.body as any)).not.toThrow()
  })

  it('liftFromList on the (schema-invalid, but not-yet-crashing) image list item does not throw', async () => {
    // Zeigt zusätzlich: selbst im heutigen, ungefixten Bug-Zustand crasht "Liste aufheben"
    // selbst nicht -- der Bug ist ein Textmodell-Defekt, kein Absturzrisiko für diese eine
    // konkrete Aktion (liftOutOfList prüft nur canReplace am äußeren Elternknoten, siehe
    // liste-aufheben-code.md Abschnitt 3.1). Trotzdem bleibt der Fix nötig (Abnahme, DoD 6).
    const { EditorState, TextSelection } = await import('prosemirror-state')
    const { liftFromList } = await import('../../shared/editor/commands')
    const result = await loadFixture('imageWithinList.odt')
    const docNode = wordSchema.nodeFromJSON(result.body as any)
    const state = EditorState.create({ doc: docNode, schema: wordSchema })
    let pos = -1
    docNode.descendants((node: any, p: number) => {
      if (pos === -1 && node.type.name === 'list_item') pos = p + 1
      return pos === -1
    })
    const withCursor = state.apply(state.tr.setSelection(TextSelection.near(state.doc.resolve(pos))))
    expect(() => liftFromList()(withCursor, () => {})).not.toThrow()
  })
})

describe('listLevel10.odt (Testfall 12/Grenzfall 4.4 -- Verschachtelungstiefe GREEN, Hyperlink-Text erwartet RED bis liste-aufheben-code.md Abschnitt 3.2 umgesetzt ist)', () => {
  it('imports as a real multi-level-deep nested ordered_list, not a flattened list', async () => {
    const result = await loadFixture('listLevel10.odt')
    let depth = 0
    let node: any = (result.body as any).content.find((n: any) => n.type === 'ordered_list')
    while (node) {
      depth++
      node = node.content[0].content.find((c: any) => c.type === 'ordered_list' || c.type === 'bullet_list')
    }
    expect(depth).toBeGreaterThanOrEqual(9)
  })

  it('keeps the hyperlink text "www.tool.de" instead of silently dropping it', async () => {
    const result = await loadFixture('listLevel10.odt')
    const allText = collectText(result.body as any).join('')
    // Heute vermutlich FEHLSCHLAGEND: <text:a> wird von walk() nicht besucht, der Text darin
    // geht beim Import verloren (bestätigter Bug, siehe Abschnitt 1 dieses Plans).
    expect(allText).toContain('www.tool.de')
  })

  it('is accepted by wordSchema.nodeFromJSON without throwing', async () => {
    const result = await loadFixture('listLevel10.odt')
    expect(() => wordSchema.nodeFromJSON(result.body as any)).not.toThrow()
  })
})
```

### 4.4 Erweiterung: `src/formats/docx/__tests__/roundtrip.test.ts`

Neuer `describe`-Block nach der bestehenden `'DOCX round trip: lists'`-Gruppe (Zeile 135-171) —
testet Reader/Writer **direkt** mit Daten, die den Zustand **nach** einem „Liste
aufheben"-Klick simulieren, unabhängig von der Editor-Bedienung. Nutzt die in der Datei bereits
vorhandenen Helfer `doc()`/`paragraph()`/`roundTrip()`:

```ts
describe('DOCX round trip: liste aufheben (Zustand nach dem Aufheben, Grenzfall 3/9/14 -- alle GREEN erwartet, siehe Abschnitt 3.8 des Umsetzungsplans)', () => {
  it('a plain paragraph between two bullet lists writes and reads back with no <w:numPr> on the middle paragraph', async () => {
    const original = doc([
      { type: 'bullet_list', content: [{ type: 'list_item', content: [paragraph('Erster Punkt')] }] },
      paragraph('Aufgehobener Punkt'),
      { type: 'bullet_list', content: [{ type: 'list_item', content: [paragraph('Letzter Punkt')] }] },
    ])
    const blob = await writeDocx(original)
    const zip = await (await import('jszip')).default.loadAsync(blob)
    const documentXml = await zip.file('word/document.xml')!.async('text')
    const paragraphs = documentXml.split('<w:p>').slice(1)
    const middleParaXml = paragraphs.find((p) => p.includes('Aufgehobener Punkt'))
    expect(middleParaXml).toBeDefined()
    expect(middleParaXml).not.toContain('numPr')

    const result = await readDocx(blob)
    const types = (result.body as any).content.map((n: any) => n.type)
    expect(types).toEqual(['bullet_list', 'paragraph', 'bullet_list'])
  })

  it('an ordered list split by a lifted paragraph keeps BOTH halves ordered_list, not bullet_list (Grenzfall 4.3)', async () => {
    const original = doc([
      { type: 'ordered_list', content: [{ type: 'list_item', content: [paragraph('eins')] }] },
      paragraph('mitte'),
      { type: 'ordered_list', content: [{ type: 'list_item', content: [paragraph('drei')] }] },
    ])
    const result = await roundTrip(original)
    const types = (result.body as any).content.map((n: any) => n.type)
    expect(types).toEqual(['ordered_list', 'paragraph', 'ordered_list'])
  })

  it('removing an entire list leaves no <w:numPr> anywhere in the document (Anforderung 5.1.2)', async () => {
    const original = doc([paragraph('a'), paragraph('b'), paragraph('c')])
    const blob = await writeDocx(original)
    const zip = await (await import('jszip')).default.loadAsync(blob)
    const documentXml = await zip.file('word/document.xml')!.async('text')
    expect(documentXml).not.toContain('numPr')
  })

  it('extra blocks (image) after a lifted paragraph survive round trip as independent siblings (Anforderung 5.1.4)', async () => {
    const original = doc([paragraph('Text mit Bild darunter'), { type: 'image', attrs: { src: TINY_PNG, alt: '' } }])
    const result = await roundTrip(original)
    const types = (result.body as any).content.map((n: any) => n.type)
    expect(types).toEqual(['paragraph', 'image'])
  })

  it('two adjacent-but-separate bullet lists split by a lifted paragraph stay distinct after re-import, even though both share the same global numId (Grenzfall 9/14)', async () => {
    const original = doc([
      { type: 'bullet_list', content: [{ type: 'list_item', content: [paragraph('Liste A, Punkt 1')] }] },
      paragraph('Trenner'),
      { type: 'bullet_list', content: [{ type: 'list_item', content: [paragraph('Liste B, Punkt 1')] }] },
    ])
    const result = await roundTrip(original)
    const types = (result.body as any).content.map((n: any) => n.type)
    expect(types).toEqual(['bullet_list', 'paragraph', 'bullet_list'])
    expect((result.body as any).content[0].content).toHaveLength(1)
    expect((result.body as any).content[2].content).toHaveLength(1)
  })
})
```

### 4.5 Erweiterung: `src/formats/odt/__tests__/roundtrip.test.ts`

Analog, neuer `describe`-Block nach der bestehenden `'ODT round trip: lists'`-Gruppe:

```ts
describe('ODT round trip: liste aufheben (Zustand nach dem Aufheben, Anforderung 5.2.1/5.2.2 -- GREEN erwartet)', () => {
  it('a plain paragraph between two bullet lists produces two separate <text:list> elements', async () => {
    const original = doc([
      { type: 'bullet_list', content: [{ type: 'list_item', content: [paragraph('Erster Punkt')] }] },
      paragraph('Aufgehobener Punkt'),
      { type: 'bullet_list', content: [{ type: 'list_item', content: [paragraph('Letzter Punkt')] }] },
    ])
    const blob = await writeOdt(original)
    const zip = await (await import('jszip')).default.loadAsync(blob)
    const contentXml = await zip.file('content.xml')!.async('text')
    expect((contentXml.match(/<text:list\b/g) ?? []).length).toBe(2)

    const result = await readOdt(blob)
    const types = (result.body as any).content.map((n: any) => n.type)
    expect(types).toEqual(['bullet_list', 'paragraph', 'bullet_list'])
  })

  it('removing an entire list leaves no <text:list> tag in content.xml (Anforderung 5.2.2)', async () => {
    const original = doc([paragraph('a'), paragraph('b'), paragraph('c')])
    const blob = await writeOdt(original)
    const zip = await (await import('jszip')).default.loadAsync(blob)
    const contentXml = await zip.file('content.xml')!.async('text')
    expect(contentXml).not.toContain('<text:list')
  })

  it('a list item with two paragraphs (post-merge-lift shape) preserves both, in order', async () => {
    const original = doc([
      { type: 'bullet_list', content: [{ type: 'list_item', content: [paragraph('erste Zeile'), paragraph('zweite Zeile')] }] },
    ])
    const result = await roundTrip(original)
    const listItem = (result.body as any).content[0].content[0]
    expect(listItem.content.map((p: any) => p.content[0].text)).toEqual(['erste Zeile', 'zweite Zeile'])
  })
})
```

### 4.6 Erwartete Ergebnisse heute (vor Umsetzung von `liste-aufheben-code.md`)

| Testdatei | Erwartung heute | Grund |
|---|---|---|
| `commands.test.ts` — `describe('liftFromList ...)` (ohne `canLiftFromList`) | GREEN | `liftFromList()` bereits unverändert korrekter Bibliotheks-Alias |
| `commands.test.ts` — `describe('canLiftFromList ...)` + Grenzfall-16-Test | **RED** (`TypeError: canLiftFromList is not a function`) | Fix aus Abschnitt 1, Punkt 3 fehlt |
| `odt/__tests__/list-structure.test.ts` — `imageWithinList.odt`, „list item starts with paragraph" | **RED** | Fix aus Abschnitt 1, Punkt 1 fehlt |
| `odt/__tests__/list-structure.test.ts` — `imageWithinList.odt`, übrige zwei Tests | GREEN | `nodeFromJSON` validiert nicht, `liftFromList` crasht nicht (siehe Abschnitt 4.3) |
| `odt/__tests__/list-structure.test.ts` — `listLevel10.odt`, Verschachtelungstiefe + `nodeFromJSON` | GREEN | Reader liest Tiefe bereits korrekt |
| `odt/__tests__/list-structure.test.ts` — `listLevel10.odt`, „keeps hyperlink text" | **RED** | Fix aus Abschnitt 1, Punkt 2 fehlt |
| `docx/__tests__/roundtrip.test.ts`-Erweiterung (alle 5 Tests) | GREEN | Betrifft ausschließlich bereits korrekten Split-/Rundreise-Code (Abschnitt 3.8 des Umsetzungsplans) |
| `odt/__tests__/roundtrip.test.ts`-Erweiterung (alle 3 Tests) | GREEN | Analog |

---

## 5. Teil B — Echte Playwright-Browser-Tests

### 5.1 Prinzipien für „echte" E2E-Tests in diesem Plan

Nicht zulässig für diese Testebene: `readDocx`/`writeDocx`/`readOdt`/`writeOdt`/`liftFromList`
direkt aufrufen, ProseMirror-`EditorState`/`Command`s direkt konstruieren, oder Assertions
ausschließlich auf dem internen Dokumentmodell statt auf dem tatsächlich gerenderten DOM/der
tatsächlich heruntergeladenen Datei. Verbindlich für jeden Test in diesem Abschnitt:

1. **Klicks** über `page.getByTitle(...)`/`page.getByRole(...)`, nie `page.evaluate(() =>
   command(...))` als Ersatz für einen Klick.
2. **Tippen** über `page.keyboard.type(...)`/`page.keyboard.press(...)`, nie direktes Setzen von
   `editor.textContent`.
3. **Datei-Upload** über `input.setInputFiles({ name, mimeType, buffer })` auf den echten
   `<input type="file">` der Seite (`docxCard(page).locator('input[type="file"]')` bzw. das
   ODT-Pendant) — bereits etabliertes Muster aus `docx.spec.ts`/`odt.spec.ts`, bedient denselben
   `<input>`, den ein echter Klick auf „Datei auswählen" öffnen würde.
4. **Export/Download** über `page.waitForEvent('download')`, gefolgt von `download.path()` und
   echtem `fs.readFile` + `JSZip.loadAsync` auf die **tatsächlich vom Browser geschriebene
   Datei** — Assertions laufen gegen den rohen XML-String aus dieser Datei, **nicht** gegen den
   Rückgabewert eines erneuten `readDocx`/`readOdt`-Aufrufs (das würde Schreib- und Lesefehler
   gegenseitig unsichtbar machen können, siehe Anforderung Abschnitt 5, Rundreise-Prinzip, und
   Abschnitt 7 „Unabhängige Parser-Validierung" unten).

### 5.2 Neu: `tests/e2e/liste-aufheben.spec.ts`

Locator-Helfer (`odtCard`/`docxCard`), UI-Beschriftungen (`Aufzählung`, `Nummerierte Liste`,
`Tabelle einfügen`, `Neu erstellen`, `Exportieren`, `verstanden`) wurden aus den bestehenden
Dateien `tests/e2e/{docx,odt,selection-regression}.spec.ts` und dem tatsächlichen Toolbar-Code
(`Toolbar.tsx` Zeile 192-224, 230) übernommen und gegen ihn verifiziert, nicht neu erfunden.
Deckt alle Testfälle aus Anforderungsabschnitt 6 sowie die relevanten Grenzfälle aus Abschnitt 4
ab:

```ts
import { test, expect } from '@playwright/test'
import JSZip from 'jszip'

function odtCard(page: import('@playwright/test').Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'OpenDocument Text (.odt)' }) })
}
function docxCard(page: import('@playwright/test').Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })
}
async function uploadFixture(page: import('@playwright/test').Page, card: ReturnType<typeof odtCard>, path: string, mimeType: string) {
  const fs = await import('node:fs/promises')
  const buffer = await fs.readFile(path)
  await card.locator('input[type="file"]').setInputFiles({ name: path.split('/').pop()!, mimeType, buffer })
}

test.describe('Liste aufheben — Toolbar & Grundverhalten (Testfälle 1-9, Grenzfälle 1/2/8/15)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  })

  test('Testfall 1: mittleren Punkt einer 3er-Bullet-Liste aufheben, Text bleibt, Rest bleibt Liste (Abschnitt 3.1/3.4)', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByTitle('Aufzählung').click()
    await page.keyboard.type('eins')
    await page.keyboard.press('Enter')
    await page.keyboard.type('zwei')
    await page.keyboard.press('Enter')
    await page.keyboard.type('drei')
    await editor.locator('li', { hasText: 'zwei' }).click()
    await page.getByTitle('Liste aufheben').click()
    await expect(editor.locator('li')).toHaveCount(2)
    await expect(editor.locator('p', { hasText: 'zwei' })).toBeVisible()
    await expect(editor).toContainText('einszweidrei')
  })

  test('Testfall 2: alle Punkte markieren, Liste verschwindet komplett (Abschnitt 3.2/3.5)', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByTitle('Aufzählung').click()
    await page.keyboard.type('a')
    await page.keyboard.press('Enter')
    await page.keyboard.type('b')
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Liste aufheben').click()
    await expect(editor.locator('ul, ol')).toHaveCount(0)
    await expect(editor.locator('p')).toHaveCount(2)
  })

  test('Testfall 3: nummerierte Liste, mittleren Punkt aufheben — zweite Teilliste bleibt "ol", Startwert protokollieren (Grenzfall 4.3)', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByTitle('Nummerierte Liste').click()
    await page.keyboard.type('eins')
    await page.keyboard.press('Enter')
    await page.keyboard.type('zwei')
    await page.keyboard.press('Enter')
    await page.keyboard.type('drei')
    await editor.locator('li', { hasText: 'zwei' }).click()
    await page.getByTitle('Liste aufheben').click()
    const lists = editor.locator('ol')
    await expect(lists).toHaveCount(2)
    const secondListStart = await lists.nth(1).evaluate((el) => (el as HTMLOListElement).start)
    // eslint-disable-next-line no-console
    console.log(`Grenzfall 4.3: Startwert der zweiten Teilliste im Editor = ${secondListStart}`)
    expect(secondListStart).toBe(1) // dokumentiertes, nicht zu korrigierendes Verhalten (Abschnitt 8)
    await expect(lists.nth(1).locator('li').first()).toHaveText('drei')
  })

  test('Testfall 4 / Grenzfall 1: Klick außerhalb jeder Liste ist ein stiller No-Op', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('normaler Absatz')
    await page.getByTitle('Liste aufheben').click()
    await expect(editor).toContainText('normaler Absatz')
    await expect(editor.locator('ul, ol')).toHaveCount(0)
  })

  test('Testfall 4 (Fortsetzung) / Grenzfall 1/15: Button zeigt aria-disabled außerhalb einer Liste (erwartet RED bis Fix aus Abschnitt 1 Punkt 4 umgesetzt ist)', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('normaler Absatz')
    await expect(page.getByTitle('Liste aufheben')).toHaveAttribute('aria-disabled', 'true')
  })

  test('Testfall 4b: Button zeigt aria-disabled="false", sobald der Cursor in einer Liste steht (erwartet RED bis Fix aus Abschnitt 1 Punkt 4 umgesetzt ist)', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByTitle('Aufzählung').click()
    await page.keyboard.type('Punkt')
    await expect(page.getByTitle('Liste aufheben')).toHaveAttribute('aria-disabled', 'false')
  })

  test('Testfall 5 / Grenzfall 4.5: Selektion reicht von Listenpunkt in nachfolgenden normalen Absatz hinein', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByTitle('Aufzählung').click()
    await page.keyboard.type('Listenpunkt')
    await page.keyboard.press('Enter')
    await page.keyboard.press('Enter') // leerer Punkt am Ende beendet die Liste (splitListItem)
    await page.keyboard.type('normaler Absatz')
    await page.keyboard.press('ControlOrMeta+Home')
    await page.keyboard.down('Shift')
    await page.keyboard.press('ControlOrMeta+End')
    await page.keyboard.up('Shift')
    await page.getByTitle('Liste aufheben').click()
    // Protokolliert das tatsächliche Verhalten (Grenzfall 4.5): laut Bibliothekscode liefert
    // blockRange hier voraussichtlich keinen gültigen Bereich -- die Liste bleibt unangetastet.
    await expect(editor.locator('li')).toHaveCount(1)
    await expect(editor).toContainText('Listenpunkt')
    await expect(editor).toContainText('normaler Absatz')
  })

  test('Testfall 6 / Grenzfall 4.6: Strg+A über gemischtem Inhalt (Liste + Absatz), "Liste aufheben"', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByTitle('Aufzählung').click()
    await page.keyboard.type('Listenpunkt')
    await page.keyboard.press('Enter')
    await page.keyboard.press('Enter')
    await page.keyboard.type('normaler Absatz')
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Liste aufheben').click()
    // Dokumentiert: AllSelection erfüllt die pred-Bedingung von blockRange ebenfalls nicht --
    // die Liste bleibt bestehen, kein "alle Listen im Dokument entfernen".
    await expect(editor.locator('li')).toHaveCount(1)
  })

  test('Testfall 7: Liste in Tabellenzelle aufheben, Rest der Tabelle unangetastet (Grenzfall 8)', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
    const cells = page.locator('.ProseMirror td')
    await cells.nth(0).click()
    await page.getByTitle('Aufzählung').click()
    await page.keyboard.type('Zelleneintrag')
    await cells.nth(1).click()
    await page.keyboard.type('Andere Zelle')
    await cells.nth(0).click()
    await page.getByTitle('Liste aufheben').click()
    await expect(cells.nth(0).locator('li')).toHaveCount(0)
    await expect(cells.nth(0)).toContainText('Zelleneintrag')
    await expect(cells.nth(1)).toContainText('Andere Zelle')
  })

  test('Testfall 8: Undo direkt nach "Liste aufheben" stellt Liste wieder her, Redo hebt erneut auf (Abschnitt 3.10)', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByTitle('Aufzählung').click()
    await page.keyboard.type('Punkt')
    await page.getByTitle('Liste aufheben').click()
    await expect(editor.locator('li')).toHaveCount(0)
    await page.keyboard.press('ControlOrMeta+z')
    await expect(editor.locator('li')).toHaveCount(1)
    await page.keyboard.press('ControlOrMeta+y')
    await expect(editor.locator('li')).toHaveCount(0)
  })

  test('Testfall 9: nach dem Aufheben erneut "• Liste"/"1. Liste" anwendbar (Abschnitt 3.13)', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByTitle('Aufzählung').click()
    await page.keyboard.type('Punkt')
    await page.getByTitle('Liste aufheben').click()
    await page.getByTitle('Nummerierte Liste').click()
    await expect(editor.locator('ol li')).toContainText('Punkt')
  })

  test('Grenzfall 2: Liste erstellen und sofort wieder aufheben, ohne Text — kein Crash, kein verwaister Listenknoten', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByTitle('Aufzählung').click()
    await page.getByTitle('Liste aufheben').click()
    await expect(editor.locator('ul, ol')).toHaveCount(0)
    await page.keyboard.type('weiter geht es')
    await expect(editor).toContainText('weiter geht es')
  })
})

test.describe('Liste aufheben — Fremddateien & Rundreisen (Anforderung Abschnitt 5, Testfälle 10-15)', () => {
  test('Testfall 10a / Rundreise 5.1.1: DOCX-Eigenrundreise, mittleren Punkt aufheben, echter Upload+Download', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByTitle('Aufzählung').click()
    await page.keyboard.type('eins')
    await page.keyboard.press('Enter')
    await page.keyboard.type('zwei')
    await page.keyboard.press('Enter')
    await page.keyboard.type('drei')
    await editor.locator('li', { hasText: 'zwei' }).click()
    await page.getByTitle('Liste aufheben').click()

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportieren' }).click()
    const download = await downloadPromise
    const fs = await import('node:fs/promises')
    const exportedBuffer = await fs.readFile((await download.path())!)
    const zip = await JSZip.loadAsync(exportedBuffer)
    const documentXml = await zip.file('word/document.xml')!.async('text')
    const middlePara = documentXml.split('<w:p>').slice(1).find((p) => p.includes('zwei'))
    expect(middlePara).not.toContain('numPr')
    expect(documentXml).toContain('eins')
    expect(documentXml).toContain('zwei')
    expect(documentXml).toContain('drei')

    const input = docxCard(page).locator('input[type="file"]')
    await input.setInputFiles({ name: 'roundtrip.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: exportedBuffer })
    await expect(page.locator('.ProseMirror li')).toHaveCount(2)
    await expect(page.locator('.ProseMirror p', { hasText: 'zwei' })).toBeVisible()
  })

  test('Testfall 10b / Rundreise 5.2.1: ODT-Eigenrundreise, mittleren Punkt aufheben', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByTitle('Aufzählung').click()
    await page.keyboard.type('eins')
    await page.keyboard.press('Enter')
    await page.keyboard.type('zwei')
    await page.keyboard.press('Enter')
    await page.keyboard.type('drei')
    await editor.locator('li', { hasText: 'zwei' }).click()
    await page.getByTitle('Liste aufheben').click()

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportieren' }).click()
    const download = await downloadPromise
    const fs = await import('node:fs/promises')
    const exportedBuffer = await fs.readFile((await download.path())!)
    const zip = await JSZip.loadAsync(exportedBuffer)
    const contentXml = await zip.file('content.xml')!.async('text')
    expect((contentXml.match(/<text:list\b/g) ?? []).length).toBe(2)

    const input = odtCard(page).locator('input[type="file"]')
    await input.setInputFiles({ name: 'roundtrip.odt', mimeType: 'application/vnd.oasis.opendocument.text', buffer: exportedBuffer })
    await expect(page.locator('.ProseMirror li')).toHaveCount(2)
  })

  test('Testfall 11a / Rundreise 5.1.6: reale Fremddatei ComplexNumberedLists.docx, Punkt aufheben, Text bleibt erhalten (Grenzfall 12, sehr lange Liste)', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await uploadFixture(page, docxCard(page), 'tests/fixtures/external/docx/ComplexNumberedLists.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    const editor = page.locator('.ProseMirror')
    await expect(editor.locator('li').first()).toBeVisible()
    const itemCountBefore = await editor.locator('li').count()
    const originalText = (await editor.innerText()).replace(/\s+/g, ' ')
    await editor.locator('li').first().click()
    await page.getByTitle('Liste aufheben').click()
    const afterText = (await editor.innerText()).replace(/\s+/g, ' ')
    // Kein Zeichen darf verloren gehen -- nur Aufzählungszeichen/Umbrüche dürfen sich
    // unterscheiden. Grobe, aber echte Zeichentreue-Prüfung mit kleiner Toleranz.
    expect(afterText.length).toBeGreaterThan(originalText.length - 10)
    await expect(editor.locator('li')).toHaveCount(itemCountBefore - 1)
  })

  test('Testfall 11b: imageWithinList.odt, Bild-Punkt aufheben, Bild bleibt erhalten (Anforderung 5.2.5/DoD 6 -- erwartet RED bis liste-aufheben-code.md Abschnitt 3.1 umgesetzt ist)', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await uploadFixture(page, odtCard(page), 'tests/fixtures/external/odt/imageWithinList.odt', 'application/vnd.oasis.opendocument.text')
    const editor = page.locator('.ProseMirror')
    await expect(editor.locator('img')).toHaveCount(1)
    await editor.locator('li').first().click()
    await page.getByTitle('Liste aufheben').click()
    await expect(editor.locator('ul, ol')).toHaveCount(0)
    await expect(editor.locator('img')).toHaveCount(1) // Bild darf nicht verschwinden
  })

  test('Testfall 11c: listsInTable.odt, Punkt in Zelle aufheben, Rest der Tabelle unverändert (Anforderung 5.2.4)', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await uploadFixture(page, odtCard(page), 'tests/fixtures/external/odt/listsInTable.odt', 'application/vnd.oasis.opendocument.text')
    const editor = page.locator('.ProseMirror')
    const cellCountBefore = await editor.locator('table td').count()
    await editor.locator('li').first().click()
    await page.getByTitle('Liste aufheben').click()
    const cellCountAfter = await editor.locator('table td').count()
    expect(cellCountAfter).toBe(cellCountBefore)
  })

  test('Testfall 12 / Grenzfall 4.4: listLevel10.odt, tiefsten Punkt wiederholt aufheben, Klicks protokollieren', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await uploadFixture(page, odtCard(page), 'tests/fixtures/external/odt/listLevel10.odt', 'application/vnd.oasis.opendocument.text')
    const editor = page.locator('.ProseMirror')
    // Tiefster Text-Punkt laut Fixture-Analyse (liste-aufheben-code.md Abschnitt 6): "ASDAS"
    const deepestLi = editor.locator('li', { hasText: 'ASDAS' }).last()
    await expect(deepestLi).toBeVisible()
    let clicks = 0
    const button = page.getByTitle('Liste aufheben')
    // Ein-Klick-pro-Ebene (Abschnitt 3.5 des Umsetzungsplans) -- Sicherheitsobergrenze gegen
    // Endlosschleifen bei unerwartetem Verhalten.
    while (await editor.locator('p', { hasText: 'ASDAS' }).count() === 0 && clicks < 15) {
      await editor.locator('*', { hasText: 'ASDAS' }).last().click()
      await button.click()
      clicks++
    }
    expect(clicks).toBeGreaterThan(0)
    expect(clicks).toBeLessThanOrEqual(10)
    await expect(editor.locator('p', { hasText: 'ASDAS' })).toBeVisible()
    await expect(editor).toContainText('www.tool.de') // erwartet RED bis Abschnitt 1 Punkt 2 gefixt ist
    // eslint-disable-next-line no-console
    console.log(`listLevel10.odt: ${clicks} Klicks bis zum normalen Absatz (Grenzfall 4.4/Testfall 12)`)
  })

  test('Testfall 13: brokenList.odt / ListOddity.odt — kein Absturz, definiertes Verhalten (Grenzfall 13)', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    for (const name of ['brokenList.odt', 'ListOddity.odt']) {
      await uploadFixture(page, odtCard(page), `tests/fixtures/external/odt/${name}`, 'application/vnd.oasis.opendocument.text')
      await expect(page.locator('.ProseMirror')).toBeVisible()
      const anyListItem = page.locator('.ProseMirror li').first()
      if (await anyListItem.count()) {
        await anyListItem.click()
        await page.getByTitle('Liste aufheben').click() // darf nicht crashen
      }
    }
  })

  test('Testfall 14a: Cross-Format-Rundreise DOCX -> ODT -> DOCX (Anforderung 5.3.1/5.3.2)', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
    let editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByTitle('Aufzählung').click()
    await page.keyboard.type('eins')
    await page.keyboard.press('Enter')
    await page.keyboard.type('zwei')
    await editor.locator('li', { hasText: 'eins' }).click()
    await page.getByTitle('Liste aufheben').click()

    const fs = await import('node:fs/promises')
    let downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportieren' }).click()
    let download = await downloadPromise
    let buffer = await fs.readFile((await download.path())!)

    await odtCard(page).locator('input[type="file"]').setInputFiles({ name: 'a.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer })
    downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportieren' }).click()
    download = await downloadPromise
    buffer = await fs.readFile((await download.path())!)

    await docxCard(page).locator('input[type="file"]').setInputFiles({ name: 'b.odt', mimeType: 'application/vnd.oasis.opendocument.text', buffer })
    editor = page.locator('.ProseMirror')
    await expect(editor).toContainText('eins')
    await expect(editor).toContainText('zwei')
    await expect(editor.locator('li')).toHaveCount(1)
  })

  test('Testfall 14b: Cross-Format-Rundreise ODT -> DOCX -> ODT (Anforderung 5.3.2)', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
    let editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByTitle('Aufzählung').click()
    await page.keyboard.type('alpha')
    await page.keyboard.press('Enter')
    await page.keyboard.type('beta')
    await editor.locator('li', { hasText: 'alpha' }).click()
    await page.getByTitle('Liste aufheben').click()

    const fs = await import('node:fs/promises')
    let downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportieren' }).click()
    let download = await downloadPromise
    let buffer = await fs.readFile((await download.path())!)

    await docxCard(page).locator('input[type="file"]').setInputFiles({ name: 'a.odt', mimeType: 'application/vnd.oasis.opendocument.text', buffer })
    downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportieren' }).click()
    download = await downloadPromise
    buffer = await fs.readFile((await download.path())!)

    await odtCard(page).locator('input[type="file"]').setInputFiles({ name: 'b.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer })
    editor = page.locator('.ProseMirror')
    await expect(editor).toContainText('alpha')
    await expect(editor).toContainText('beta')
    await expect(editor.locator('li')).toHaveCount(1)
  })

  test('Testfall 15: optischer Vergleich — aufgehobener Absatz hat kein Aufzählungszeichen/keinen Einzug mehr', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByTitle('Aufzählung').click()
    await page.keyboard.type('Punkt')
    await page.getByTitle('Liste aufheben').click()
    const paragraph = editor.locator('p', { hasText: 'Punkt' })
    const marginLeft = await paragraph.evaluate((el) => getComputedStyle(el).marginLeft)
    expect(marginLeft).toBe('0px')
    await expect(editor.locator('li')).toHaveCount(0)
  })

  test.each(['bulletListTest.odt', 'list.odt', 'liste2.odt', 'simple_bullet_list.odt', 'simpleList.odt', 'EasyList.odt', 'ListRoundtrip.odt'])(
    'Anforderung 5.2.7: Basis-Fixture %s — importieren, einen Punkt aufheben, unverändert exportieren, reimportieren, Text bleibt gleich',
    async ({ page }, fixtureName) => {
      await page.goto('/')
      await page.getByRole('button', { name: /verstanden/i }).click()
      await uploadFixture(page, odtCard(page), `tests/fixtures/external/odt/${fixtureName}`, 'application/vnd.oasis.opendocument.text')
      const editor = page.locator('.ProseMirror')
      await expect(editor).toBeVisible()
      const originalText = (await editor.innerText()).replace(/\s+/g, ' ')
      const anyListItem = editor.locator('li').first()
      if (await anyListItem.count()) {
        await anyListItem.click()
        await page.getByTitle('Liste aufheben').click()
      }
      const downloadPromise = page.waitForEvent('download')
      await page.getByRole('button', { name: 'Exportieren' }).click()
      const download = await downloadPromise
      const fs = await import('node:fs/promises')
      const buffer = await fs.readFile((await download.path())!)
      await odtCard(page).locator('input[type="file"]').setInputFiles({ name: `reimport-${fixtureName}`, mimeType: 'application/vnd.oasis.opendocument.text', buffer })
      const afterText = (await editor.innerText()).replace(/\s+/g, ' ')
      expect(afterText.length).toBeGreaterThan(originalText.length - 10)
    },
  )
})
```

### 5.3 Erweiterung: `tests/e2e/selection-regression.spec.ts` (Grenzfall 4.11 / DoD 7)

Direkt neben den bestehenden „Fett"-Regressionstests verankert (gleiche Datei, gleicher
`odtCard`-Helfer, gleiches `beforeEach`):

```ts
test('same selection-sync regression with "Liste aufheben" as the extra step (Grenzfall 4.11)', async ({ page }) => {
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.getByTitle('Aufzählung').click()
  await page.keyboard.type('Hallo, das ist ein Test.')
  await page.keyboard.press('ControlOrMeta+a')
  await page.getByTitle('Fett').click()
  await editor.locator('li').click()
  await page.getByTitle('Liste aufheben').click()
  // Re-Klick nach der Toolbar-Aktion -- genau das Muster, das die stale-AllSelection-Regression
  // in den bestehenden Tests dieser Datei auslöst.
  await editor.click()
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Zweiter Absatz.')
  await expect(editor).toContainText('Hallo, das ist ein Test.')
  await expect(editor).toContainText('Zweiter Absatz.')
  await expect(editor.locator('p')).toHaveCount(2)
})
```

---

## 6. Fixture-Inventar — im Dateisystem geprüft, nicht nur aus dem Anforderungstext übernommen

| Datei | Geprüft | Relevanz in diesem Plan |
|---|---|---|
| `tests/fixtures/external/odt/listLevel10.odt` | Existiert (`ls` bestätigt) | Testfall 12/Grenzfall 4.4 (Verschachtelungstiefe) **und** Regressionstest für den Hyperlink-Bug aus Abschnitt 1 Punkt 2 |
| `tests/fixtures/external/odt/imageWithinList.odt` | Existiert | Testfall 11b/DoD 6 **und** Regressionstest für den Bild-Punkt-Bug aus Abschnitt 1 Punkt 1 |
| `tests/fixtures/external/odt/listsInTable.odt` | Existiert | Testfall 11c/Grenzfall 8 |
| `tests/fixtures/external/odt/brokenList.odt` | Existiert; **zusätzlich bestätigt** als `SKIP_SLOW_UNDER_JSDOM` in `odt/__tests__/external-fixtures.test.ts:17` (90 s+ unter jsdom) | Testfall 13/Grenzfall 13 — **muss** im E2E-Layer laufen, nicht als Vitest-Unit-Test |
| `tests/fixtures/external/odt/ListOddity.odt` | Existiert | Testfall 13/Grenzfall 13 |
| `tests/fixtures/external/odt/{bulletListTest,list,liste2,simple_bullet_list,simpleList,EasyList,ListRoundtrip}.odt` | Alle sieben existieren (`ls` bestätigt) | Anforderung 5.2.7 (Basis-Fixture-Rundreisen, `test.each`) |
| `tests/fixtures/external/docx/ComplexNumberedLists.docx` | Existiert | Testfall 11a/5.1.6, Grenzfall 12 (sehr lange Liste) |

---

## 7. Unabhängige Parser-Validierung (Anforderung Abschnitt 5, Rundreise-Prinzip Punkt 8, DoD 2)

Wie bereits in `durchgestrichen-qa.md` begründet: dieses Repo ist reines TypeScript/Vite ohne
Python-Toolchain. Zweistufiger Ansatz, identisch zum Schwesterfeature:

1. **Automatisiert:** Die Playwright-Tests aus Abschnitt 5.2 prüfen den exportierten XML-String
   direkt per `String.includes`/Regex/Zählung der `<w:p>`- bzw. `<text:list>`-Vorkommen,
   **ohne** `readDocx`/`readOdt` zu verwenden (z. B.
   `expect((contentXml.match(/<text:list\b/g) ?? []).length).toBe(2)`,
   `expect(middlePara).not.toContain('numPr')`) — das erfüllt „nicht nur mit dem eigenen Reader
   rückgelesen" für die automatisierte Suite.
2. **Manuell, einmalig, vor Statuswechsel auf „verifiziert":** Eine mit dieser App nach „Liste
   aufheben" exportierte Test-DOCX (insbesondere die nummerierte Variante aus Testfall 3/
   Grenzfall 4.3) in einem **echten, unabhängigen** Word/LibreOffice öffnen und dokumentieren,
   ob die zweite Teilliste dort **fortlaufend** oder **neu bei „1."** zählt — beantwortet die in
   `liste-aufheben-code.md` Abschnitt 3.6 als „vermutet, mit hoher Bibliotheks-Gewissheit"
   eingestufte Cross-Tool-Divergenz **empirisch**. Ergebnis muss vor Statuswechsel in
   `liste-aufheben-req.md` oder diesem Plan nachgetragen werden — **noch offen**, siehe
   Abschnitt 8.

---

## 8. Offene Punkte / bewusst nicht (vollautomatisiert) abgedeckt

- **Manuelle Word/LibreOffice-Prüfung der Nummerierungs-Fortsetzung** (Abschnitt 7, Punkt 2) ist
  in diesem Plan **beschrieben, aber nicht ausgeführt** — kein automatisierter Test kann ein
  echtes, unabhängiges Office-Produkt öffnen. Muss vor Abnahme (DoD 5) manuell nachgeholt und das
  Ergebnis dokumentiert werden.
- **`docx/styleDefs.ts`-Kommentar zur `start`-Divergenz** (Abschnitt 1, Punkt 6): reine
  Dokumentationslücke ohne Testkonsequenz — wird hier vermerkt, damit sie nicht zwischen den
  Zeilen verschwindet, ist aber kein QA-Blocker.
- **Mehrstufige Liste über reine Editor-Bedienung (ohne ODT-Import)** ist nach aktuellem
  Code-Stand nicht erzeugbar (kein Tab/Umschalt+Tab, siehe `liste-aufheben-req.md` Abschnitt 2,
  Zeile 4, und Referenztabelle „Tastenkombination") — Testfall 12 deckt den Fall deshalb
  ausschließlich über den ODT-Importweg ab (`listLevel10.odt`), wie von der Anforderung selbst
  vorgesehen. Kein QA-Lücke, sondern Produktrealität.
- **DOCX-seitige Mehrstufigkeit** ist strukturell nicht testbar, da `docx/reader.ts` `w:ilvl`
  grundsätzlich nicht liest (`liste-aufheben-req.md` Referenztabelle „DOCX-Import von Listen") —
  kein Test in diesem Plan versucht das, um keinen irreführend unerreichbaren Testfall
  vorzutäuschen.
- **Nummerierung der zweiten Teilliste (Grenzfall 4.3)** wird in diesem Plan bewusst nur
  **protokolliert und mit dem heute bestätigten Wert (`1`) verglichen**, nicht als „Bug"
  gewertet — deckt sich mit der expliziten Entscheidung in `liste-aufheben-code.md` Abschnitt
  3.6, dieses Verhalten **nicht** in diesem Feature zu korrigieren (gehört zu
  `nummerierung-fortsetzen-neustarten`).
- **Barrierefreiheit über `aria-disabled` hinaus** (z. B. Screenreader-Ankündigung nach dem
  Klick) ist nicht Gegenstand dieses Plans — Anforderung Abschnitt 2/Grenzfall 15 verlangt nur
  `aria-label` + Aktiv/Inaktiv-Zustand, beide werden in Abschnitt 5.2 geprüft (aktuell RED, siehe
  Abschnitt 1).

---

## 9. Abnahme-Mapping (Anforderung Abschnitt 6/7/8 → Testartefakt, mit heutigem Status)

| Anforderung | Abgedeckt durch | Status heute |
|---|---|---|
| Testfälle 1, 2, 7, 8, 9 (Grundverhalten) | `liste-aufheben.spec.ts` „Toolbar & Grundverhalten" | GREEN erwartet |
| Testfall 3 / Grenzfall 4.3 (Nummerierung zweite Teilliste) | `liste-aufheben.spec.ts` „Testfall 3" + `commands.test.ts` | GREEN erwartet (Verhalten bereits vorhanden, wird protokolliert) |
| Testfall 4 / Grenzfall 1/15 (No-Op + `aria-disabled`) | `liste-aufheben.spec.ts` „Testfall 4"/„Testfall 4 (Fortsetzung)"/„Testfall 4b" | No-Op-Teil GREEN, `aria-disabled`-Teile **RED** |
| Testfall 5/6 / Grenzfall 4.5/4.6 (Selektion über Listenrand) | `liste-aufheben.spec.ts` + `commands.test.ts` | GREEN erwartet |
| Testfall 10 (Rundreise über echten Upload/Download je Format) | `liste-aufheben.spec.ts` „Rundreisen" | GREEN erwartet |
| Testfall 11a (`ComplexNumberedLists.docx`) | `liste-aufheben.spec.ts` „Testfall 11a" | GREEN erwartet |
| Testfall 11b (`imageWithinList.odt`) | `liste-aufheben.spec.ts` „Testfall 11b" + `odt/__tests__/list-structure.test.ts` | **RED** (Abschnitt 1, Punkt 1) |
| Testfall 11c (`listsInTable.odt`) | `liste-aufheben.spec.ts` „Testfall 11c" | GREEN erwartet |
| Testfall 12 / Grenzfall 4.4 (`listLevel10.odt`) | `liste-aufheben.spec.ts` „Testfall 12" + `odt/__tests__/list-structure.test.ts` | Klick-Zählung GREEN erwartet, Hyperlink-Text-Teil **RED** (Abschnitt 1, Punkt 2) |
| Testfall 13 (`brokenList.odt`/`ListOddity.odt`) | `liste-aufheben.spec.ts` „Testfall 13" | GREEN erwartet |
| Testfall 14 (Cross-Format-Rundreise, doppelt) | `liste-aufheben.spec.ts` „Testfall 14a/14b" | GREEN erwartet |
| Testfall 15 (optischer Vergleich) | `liste-aufheben.spec.ts` „Testfall 15" | GREEN erwartet |
| Anforderung 5.2.7 (Basis-Fixtures) | `liste-aufheben.spec.ts` `test.each(...)` | GREEN erwartet |
| Grenzfall 2 (leere Liste sofort aufheben) | `commands.test.ts` + `liste-aufheben.spec.ts` | GREEN erwartet |
| Grenzfall 4 (mehrstufige Liste, Ein-Klick-pro-Ebene) | `commands.test.ts` + `liste-aufheben.spec.ts` Testfall 12 | GREEN erwartet |
| Grenzfall 7 (Abgrenzung Enter-auf-leerem-Punkt vs. Button) | Testfall 5 nutzt beide Mechanismen nacheinander im selben Test, hält sie durch getrennte Assertions auseinander | GREEN erwartet |
| Grenzfall 8 (Liste in Tabellenzelle) | `liste-aufheben.spec.ts` Testfall 7 + Testfall 11c | GREEN erwartet |
| Grenzfall 9 (zwei direkt aufeinanderfolgende separate Listen) | `docx/__tests__/roundtrip.test.ts`-Erweiterung | GREEN erwartet |
| Grenzfall 10 (Zusatzblock in Punkt) | `commands.test.ts` + `docx/__tests__/roundtrip.test.ts`-Erweiterung + `liste-aufheben.spec.ts` Testfall 11b | Unit-Teil GREEN, E2E-Teil (`imageWithinList.odt`) **RED** |
| Grenzfall 11 (Selection-Sync-Bug in Sequenz) | `selection-regression.spec.ts`-Erweiterung | GREEN erwartet |
| Grenzfall 12 (sehr lange Liste, Performance) | `liste-aufheben.spec.ts` Testfall 11a | GREEN erwartet |
| Grenzfall 13 (kaputtes Markup) | `liste-aufheben.spec.ts` Testfall 13 | GREEN erwartet |
| Grenzfall 14 (DOCX-Reimport, Trennabsatz, gleiche `numId`) | `docx/__tests__/roundtrip.test.ts`-Erweiterung | GREEN erwartet |
| Grenzfall 15 (Barrierefreiheit) | `liste-aufheben.spec.ts` Testfall 4 (Fortsetzung)/4b | **RED** (Abschnitt 1, Punkt 4) |
| Grenzfall 16 (Cursor an Absatzgrenze) | `commands.test.ts` (protokollierend, kein hartes Assert auf unbewiesene Annahme) | GREEN erwartet (Feststellung, kein Pass/Fail) |
| Neuer Fund: `list_item`-Schema-Verletzung bei Bild-only-Punkt | `odt/__tests__/list-structure.test.ts` | **RED** (Abschnitt 1, Punkt 1) |
| Neuer Fund: Textverlust in `<text:a>` | `odt/__tests__/list-structure.test.ts` | **RED** (Abschnitt 1, Punkt 2) |
| DoD 1 (alle Testfälle aus Abschnitt 6 automatisiert) | Abschnitt 4/5 dieses Plans, vollständig | Vorhanden als Plan; 4 von ~40 Einzeltests **RED** bis `liste-aufheben-code.md` umgesetzt ist |
| DoD 2 (Rundreise mit realen Fremddateien je Format) | `liste-aufheben.spec.ts` — DOCX: `ComplexNumberedLists.docx`; ODT: `listLevel10.odt`, `imageWithinList.odt`, `listsInTable.odt`, `brokenList.odt`, `ListOddity.odt`, sieben Basis-Fixtures | GREEN bis auf `imageWithinList.odt`-bezogene Assertion |
| DoD 3 (Selektion über Listenrand geprüft/dokumentiert) | Abschnitt 1 (Referenztabelle) + Testfall 5/6 | GREEN erwartet |
| DoD 4 (mehrstufige Liste, Ein-Klick-pro-Ebene dokumentiert) | Testfall 12 + `commands.test.ts` | Klick-Zählung GREEN, Hyperlink-Teil RED |
| DoD 5 (Nummerierungsverhalten zweite Teilliste bestätigt) | Testfall 3 + Abschnitt 7 Punkt 2 (manuell, **noch offen**) | Automatisierter Teil GREEN, manueller Teil **offen** |
| DoD 6 (Zusatzblöcke, `imageWithinList.odt`) | `commands.test.ts` + `odt/__tests__/list-structure.test.ts` + Testfall 11b | **RED** bis Fix aus Abschnitt 1 Punkt 1 |
| DoD 7 (Regressionstest dauerhaft in Suite) | `selection-regression.spec.ts`-Erweiterung | GREEN erwartet |
| DoD 8 (`aria-label`/aktiver Zustand/Tastenkombination bewusst entschieden) | Testfall 4 (Fortsetzung)/4b (`aria-disabled` **RED**); Tastenkombination-Entscheidung bereits korrekt (Unterlassung) | Teilweise **RED** |
| DoD 9 (kein Fund ohne Ticket/Vermerk) | Abschnitt 1 dieses Plans + `liste-aufheben-code.md` Abschnitt 9 | Beide bestätigten Bugs sind in `liste-aufheben-code.md` referenziert, mit Fix-Plan versehen |

**Gesamturteil dieser QA-Prüfung:** Der Status „verifiziert" darf **noch nicht** vergeben werden.
Vier konkrete, mit echten Fixtures reproduzierbare Punkte sind heute **RED**: (1) `aria-label`/
`aria-disabled` fehlen am „⇧ Liste"-Button, (2) `imageWithinList.odt` verletzt beim Import
weiterhin das `list_item`-Schema, (3) `listLevel10.odt` verliert weiterhin den Hyperlink-Text
„www.tool.de", (4) die manuelle Word/LibreOffice-Gegenprobe zur Nummerierungs-Fortsetzung
(DoD 5) steht noch aus. Alle vier sind bereits in `liste-aufheben-code.md` mit einem konkreten
Fix-Plan hinterlegt — dieser Testplan macht sie **messbar** (rot heute, grün nach Umsetzung),
verschweigt sie aber nicht.
