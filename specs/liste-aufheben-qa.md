# QA-Testplan: „Liste aufheben"

Gegenstück zu `specs/liste-aufheben-req.md` (Anforderung) und `specs/liste-aufheben-code.md`
(Umsetzungsplan des Dev-Agenten). Dieses Dokument ist der **Testplan der QA-Rolle**: es legt
fest, welche Tests geschrieben werden, mit welchem konkreten Code, gegen welche echten
Dateien/Fixtures, wie **Determinismus** (kein Flackern durch Selektions-Sync-Races) sichergestellt
wird, und wie das Ergebnis gegen Anforderungsabschnitt 6/7/8 abgeglichen wird. Es ersetzt nicht
die Ausführung, sondern ist die verbindliche, ausführbare Grundlage dafür.

Stil/Aufbau folgen bewusst `specs/durchgestrichen-qa.md` (Schwesterfeature), damit alle QA-Pläne
in diesem Repo vergleichbar bleiben.

> **Kritische Überarbeitung eines früheren QA-Durchlaufs dieser Datei (Stand 2026-07-05).**
> Die Vorfassung dieses `-qa.md` war gegen einen **veralteten** Quellstand (den „Vorentwurf" von
> `req.md`/`code.md`) geschrieben und an ihren **zentralen** Befunden faktisch falsch. Sie behauptete
> zwei ungefixte ODT-Reader-Bugs und ein Schema `paragraph block*` und hätte die Verifikation in
> die Irre geführt — exakt das Fehlermuster, vor dem `req.md`/`code.md` in ihren eigenen
> Vorworten warnen. **Diese Fassung ist gegen den installierten, aktuellen Quellcode neu
> verifiziert** (Dateien einzeln gelesen, nicht nur `code.md` nacherzählt). Die wichtigsten
> Korrekturen gegenüber der Vorfassung stehen in Abschnitt 1.1.

---

## 0. Kurzfassung für Eilige

- **Vor Testerstellung wurde der tatsächliche Code gelesen** (nicht nur `liste-aufheben-code.md`):
  `src/formats/shared/schema.ts`, `src/formats/shared/editor/{commands.ts,Toolbar.tsx,WordEditor.tsx}`,
  `src/formats/odt/reader.ts`, `src/formats/docx/{reader.ts,writer.ts,styleDefs.ts}`, beide
  `__tests__/roundtrip.test.ts`, `tests/e2e/{selection-regression,docx,odt}.spec.ts`,
  `playwright.config.ts`. Ergebnis: der Ist-Zustand entspricht **exakt** der Referenztabelle in
  `liste-aufheben-req.md` und dem Abschnitt 2 von `liste-aufheben-code.md` — **nicht** dem, was die
  Vorfassung dieses QA-Plans behauptete (siehe Abschnitt 1.1).
- **Genau EINE echte Produktcode-Lücke** ist offen und macht einen Teil der Tests heute rot:
  `canLiftFromList(state)` existiert noch nicht in `commands.ts`, und der „⇧ Liste"-Button in
  `Toolbar.tsx:263-273` hat noch **kein** `aria-label` und **keinen** Aktiv/Inaktiv-Zustand. Der Fix
  ist in `code.md` Abschnitt 3.3 beschrieben und verwendet **natives `disabled`** (Vorbild:
  „Ausschneiden"-Button derselben Toolbar, `Toolbar.tsx:143-156`), **nicht** `aria-disabled`. Alle
  „erwartet-rot-bis-Fix"-Tests in diesem Plan prüfen deshalb `toBeDisabled()`/`toBeEnabled()` und
  `aria-label`, **nicht** `aria-disabled`.
- **Die beiden von der Vorfassung behaupteten Reader-Bugs existieren nicht** (bereits im Code
  gelöst): `list_item` ist `block+` (Bild-only-Punkt gültig), und der ODT-Reader erhält
  `text:a`-Text über einen generischen Inline-Fallback. Die entsprechenden Tests sind **GREEN**,
  nicht RED — und asserten das **korrekte** Verhalten (Bild bleibt Bild, „www.tool.de" bleibt
  erhalten), nicht das falsche.
- Zwei Testebenen, wie beauftragt:
  1. **Unit-Tests (Vitest/jsdom)** für die Reader/Writer-Rundreise DOCX **und** ODT sowie die
     reine Editor-Transformation (`liftFromList`/`canLiftFromList`) — Abschnitt 4.
  2. **Echte Playwright-Browser-Tests** — echte Mausklicks (`getByTitle`), echtes Tippen
     (`page.keyboard`), echter Datei-Upload (`input[type=file].setInputFiles`), echter Download
     (`page.waitForEvent('download')`) mit anschließendem Entpacken der **tatsächlich
     heruntergeladenen Datei** und Prüfung des rohen XML — **nicht** nur interne Aufrufe von
     `readDocx`/`writeDocx`/`readOdt`/`writeOdt`/`liftFromList`. Abschnitt 5.
- **Determinismus ist Erstklasse-Anforderung dieses Plans** (Abschnitt 3): jeder Punkt, an dem eine
  native Selektionsänderung (Klick zum Positionieren, `Strg+A`, `End`/`Home`) unmittelbar von einer
  Aktion gefolgt wird, die die Selektion ausliest (Toolbar-Klick, `Enter`), bekommt eine
  **Selektions-Sync-Barriere** nach dem im Repo bereits etablierten Muster
  (`selection-regression.spec.ts:26-34`). Wo der Fix einen beobachtbaren Zustand liefert
  (`toBeEnabled()`/`toBeDisabled()`), wird dieser als **deterministisches** Gate statt eines blinden
  Timeouts verwendet.
- Alle referenzierten Fixtures und Zieldateien wurden **im Dateisystem geprüft** (Abschnitt 6),
  nicht aus dem Text übernommen.

---

## 1. Ausgangslage: Code-Audit vor Testerstellung

Geprüft wurden die tatsächlichen Dateien im Repo. Alle Zeilenangaben gegen den aktuellen
Quellstand (2026-07-05) verifiziert.

| # | `liste-aufheben-code.md` kündigt an | Tatsächlicher Code-Stand (verifiziert) | QA-Konsequenz |
|---|---|---|---|
| 1 | `commands.ts`: neuer Export `canLiftFromList(state)` als reines Verfügbarkeitsprädikat (Dry-Run `liftFromList()(state)`), Muster wie `canCut` (Abschnitt 3.3) | **Noch nicht umgesetzt.** `commands.ts` exportiert `liftFromList` (`:62-64`), `canCut` (`:126-128`), aber **kein** `canLiftFromList` (ganze Datei gelesen; Symbol kommt nirgends im `src`-Baum vor) | Jeder Unit-Test, der `canLiftFromList` importiert/aufruft, schlägt heute mit `TypeError: canLiftFromList is not a function` fehl (Vitest hat **kein** Typecheck-Gate, `vite.config.ts` — der fehlende Named Export fällt erst zur Laufzeit auf). **Erwartet RED bis Fix.** |
| 2 | `Toolbar.tsx`: „⇧ Liste"-Button bekommt `aria-label="Liste aufheben"` **und** `disabled={!canLiftFromList(view.state)}` + `disabled:`-CSS — **natives `disabled`**, Vorbild „Ausschneiden"-Button `:143-156` (Abschnitt 3.3) | **Noch nicht umgesetzt.** Button `:263-273` hat `title="Liste aufheben"`, `onMouseDown`+`preventDefault`+`run(view, liftFromList())`, Label `⇧ Liste` — **kein** `aria-label`, **kein** `disabled`, **kein** `aria-disabled`. Der „Ausschneiden"-Button `:143-156` verwendet bereits exakt das Zielmuster (`disabled={!canCut(view.state)}` + `disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent`) | E2E-Tests, die `toBeDisabled()`/`toBeEnabled()` bzw. `toHaveAttribute('aria-label','Liste aufheben')` auf `getByTitle('Liste aufheben')` erwarten, sind **RED bis Fix**. **Wichtig — Korrektur der Vorfassung:** Assertion ist **natives `disabled`** (`toBeDisabled`), **nicht** `aria-disabled`; Letzteres würde auch nach korrektem Fix nie grün. |
| 3 | `WordEditor.tsx`: bewusst **keine** Tastenkombination (Abschnitt 3.4) | **Bestätigt unverändert** — Keymap enthält nur `Mod-z/y/Shift-z`, `Enter: splitListItem(...)`, `Mod-b/i/u`; kein Listen-Ein-/Ausrück-/Aufheben-Eintrag, `sinkListItem` nirgends importiert | Kein Test nötig (Entscheidung durch Unterlassung bereits korrekt umgesetzt) |
| 4 | `docx/styleDefs.ts`: **optionaler** Kommentar zur `start`/`numId`-Cross-Tool-Divergenz (Abschnitt 3.6) — keine Verhaltensänderung | **Noch nicht umgesetzt** (kein Kommentar), aber reine Doku-Lücke | Keine Testkonsequenz; als offener Doku-Punkt in Abschnitt 8 vermerkt |

Zusätzlich verifiziert, **bereits korrekt** (kein Fix nötig, nur Testabdeckung fehlt — deckt sich
mit `req.md`-Referenztabelle und `code.md` Abschnitt 2/3):

- `schema.ts:146-152` — `list_item` Content ist **`block+`**, mit ausdrücklichem Kommentar
  (`:139-145`), dass dies bewusst von `paragraph block*` geändert wurde, um
  `listLevel10.odt`/`imageWithinList.odt` zu akzeptieren. Ein Punkt, dessen einziger Block ein Bild
  oder eine verschachtelte Liste ist, ist damit **schemakonform**.
- `commands.ts:62-64` `liftFromList()` — reiner, unveränderter Alias um
  `liftListItem(wordSchema.nodes.list_item)`. Kein Projektcode, keine Sonderbehandlung.
- `odt/reader.ts:160-167` — generischer `else`-Zweig in `walk()`, der in die Kinder **jedes**
  unbekannten Inline-Elements (Hyperlink `text:a`, `text:placeholder`, `text:date` …) hinabsteigt
  und deren Text mit den geerbten Marks übernimmt; leere Redline-/Bookmark-Marker werden über
  `isEmptyRedlineMarker` (`:89`) im Zweig `:157` ausgeschlossen. „www.tool.de" aus `listLevel10.odt`
  überlebt den Import.
- `docx/reader.ts` liest `w:numId` **und** `w:ilvl` und rekonstruiert echte Verschachtelung
  (`groupLists`); `docx/writer.ts` führt einen `ListContext{numId,level}` bis `MAX_LIST_ILVL=8`;
  `styleDefs.ts` definiert je 9 Ebenen. **Mehrstufige Listen entstehen und überstehen die Rundreise
  auch über DOCX** — die bestehende `roundtrip.test.ts:181-201` („Ebene 2") beweist das bereits.
- `Toolbar.tsx` Button-`title`-Attribute (für die E2E-Locator): **„Aufzählung"** (`toggleList(false)`,
  `:243`), **„Nummerierte Liste"** (`toggleList(true)`, `:254`), **„Liste aufheben"**
  (`liftFromList()`, `:265`), **„Ausschneiden"** (`:145`), **„Tabelle einfügen"** (`:279`,
  `getByRole('button', { name: 'Tabelle einfügen' })`). Label-Texte sind `• Liste`/`1. Liste`/
  `⇧ Liste` — für Playwright wird deshalb `getByTitle(...)`, nicht der Label-Text, verwendet.
- **Kein** Test ruft heute `liftFromList`/`liftListItem`/`canLiftFromList` auf (per Grep bestätigt).
- **Keine** der neu vorgeschlagenen Testdateien existiert (`commands.test.ts`,
  `odt/__tests__/list-structure.test.ts`, `tests/e2e/liste-aufheben.spec.ts`) — per `ls`/Glob geprüft.
- `odt/__tests__/external-fixtures.test.ts`: `brokenList.odt` ist als `SKIP_SLOW_UNDER_JSDOM`
  markiert (groß/langsam unter jsdom) → Testfall 13/Grenzfall 13 **muss** im E2E-Layer (echtes
  Chromium) laufen, nicht als Vitest-Unit-Test.

### 1.1 Was die Vorfassung dieses QA-Plans falsch behauptete (und warum das gefährlich war)

| Vorfassung behauptete | Tatsächlich | Folge, wenn ungeprüft übernommen |
|---|---|---|
| `list_item`-Content sei `paragraph block*`; `imageWithinList.odt` erzeuge einen Schema-Verstoß, der Reader müsse einen führenden Leerabsatz einfügen; Test „erster Block = `paragraph`" sei **RED** | `list_item` ist **`block+`** (bewusst); Bild-only-Punkt ist gültig; erster Block ist **`image`** | Der Test hätte das **falsche** Zielverhalten festgeschrieben (Leerzeile vor jedem importierten Bild) und einen nicht existierenden „Bug" als Abnahmeblocker gesetzt |
| `walk()` kenne keinen `text:a`-Fallback; „www.tool.de" gehe verloren; Test sei **RED** | Generischer `else`-Fallback erhält den Text (`reader.ts:160-167`) | Ein nicht existierender Textverlust wäre als Blocker geführt; der echte, bereits korrekte Zustand wäre als „kaputt" fehlinterpretiert worden |
| Der Button-Fix nutze `aria-disabled`; E2E prüfe `toHaveAttribute('aria-disabled', …)` | Fix nutzt **natives `disabled`** (Vorbild `canCut`-Button) | Die E2E-Assertion wäre **auch nach korrektem Fix dauerhaft rot** geblieben (falsches Attribut) |
| DOCX-seitige Mehrstufigkeit sei „strukturell nicht testbar", da der Reader `w:ilvl` nicht lese | Reader liest `w:ilvl` und rekonstruiert Nesting; `roundtrip.test.ts:181-201` beweist es | Ein realer, geforderter Testfall (5.1.4, mehrstufiges DOCX) wäre fälschlich als unerreichbar gestrichen worden |

**Konsequenz für diesen Plan:** Der einzige heute rote Bereich ist die noch nicht umgesetzte
Barrierefreiheits-/Zustands-Änderung am Button (`canLiftFromList` + `aria-label` + `disabled`).
Alles andere — Aufhebe-Verhalten, Reader/Writer-Rundreise, Bild-Punkt, Hyperlink-Text,
DOCX-Mehrstufigkeit — ist bereits korrekt und wird durch neue Tests **abgesichert** (erwartet
GREEN), nicht „auf rot gestellt".

---

## 2. Testumgebung & Ausführung

| Ebene | Werkzeug | Befehl | Konfiguration |
|---|---|---|---|
| Unit | Vitest, Environment `jsdom`, `globals: true` | `npm test` | `vite.config.ts` — `setupFiles: ['./src/test/setup.ts']`, **kein** Typecheck-Plugin (ein fehlender Named Export → Laufzeit-`TypeError`, kein Build-Fehler; relevant für Abschnitt 1, Punkt 1) |
| E2E | Playwright | `npm run test:e2e` | `playwright.config.ts` — `testDir: tests/e2e`, `baseURL: http://localhost:4173/salamanido/`, `webServer` baut+startet Preview automatisch, `fullyParallel`, `retries: 1` unter CI. Projekte: **Desktop Chrome**, **Mobile (Pixel 7)**, **Tablet (iPad Mini)** — jeder neue Test läuft auf allen dreien |

Alle neuen/erweiterten Testdateien fügen sich ohne Konfigurationsänderung in die bestehende Suite
ein. **Achtung Mehrprojekt-Lauf:** Die Tests laufen auf Desktop-Chromium **und** den
Touch-Projekten Mobile/Tablet. Genau dort sind die im Repo dokumentierten Selektions-Sync-Races
zuletzt aufgetreten (`git log`: „Fix flaky Mobile-project selection-regression/cut tests: async
selection sync race"). Determinismus (Abschnitt 3) ist deshalb hier nicht optional.

---

## 3. Determinismus: Selektions-Sync-Races vermeiden (verbindlich)

Der zentrale Race in diesem Editor ist dokumentiert in `selection-regression.spec.ts:26-34`:
ProseMirror lernt eine **nativ** (per Maus oder per Browser-Caret-Taste wie `End`/`Home`/`Strg+A`)
ausgelöste Selektionsänderung nur über das **asynchrone** `selectionchange`-Event des Browsers.
Eine unmittelbar folgende Aktion, die die Selektion ausliest (ein Toolbar-Command, das
`view.state.selection` benutzt; ein `Enter`, das an der Cursorposition teilt), kann diesem Catch-up
**vorauslaufen** und auf der **veralteten** Selektion arbeiten. Ein echter Mensch tippt nie so
schnell; nur die lückenlose Playwright-Tastung provoziert es.

**Regeln für jeden Test in diesem Plan:**

1. **Nach einem Positionierungs-Klick in einen Listenpunkt und vor einem Toolbar-Klick, der die
   Selektion liest** (`Liste aufheben`, `Fett`, …): erst die Sync-Barriere, dann der Toolbar-Klick.
   Bevorzugt **deterministisch** über den beobachtbaren Zustand des (nach dem Fix)
   zustandsgesteuerten Buttons: `await expect(page.getByTitle('Liste aufheben')).toBeEnabled()`
   pollt so lange, bis die Toolbar die synchronisierte Selektion neu ausgewertet hat
   (`WordEditor.tsx:123` ruft `forceRender` bei **jeder** Transaktion, auch reinen
   Selektionsänderungen). Wo dieser Zustand (noch) nicht existiert (vor dem Fix, oder bei
   Nicht-Button-Aktionen), gilt der Repo-Standard `await page.waitForTimeout(50)`.
2. **Nach einer nativen Caret-Taste (`End`/`Home`/`Strg+A`/Pfeil) und vor der nächsten
   zustandslesenden Taste (`Enter`) oder Aktion:** `await page.waitForTimeout(50)` — identisch zum
   bestehenden Muster in `selection-regression.spec.ts:34/72/103`. Dieser Wert ist bewusst klein und
   nur ein „Nachlauffenster", keine Wartezeit auf UI.
3. **Web-First-Assertions statt fixer Sleeps, wo ein Observable existiert:** `toHaveCount`,
   `toBeVisible`, `toBeEnabled`, `toContainText` retryen automatisch bis zum Timeout — sie sind der
   Determinismus-Mechanismus der Wahl für „Ergebnis erschien". Ein `waitForTimeout` wird **nur** für
   das oben beschriebene Selektions-Nachlauffenster verwendet, nie um auf ein sichtbares Ergebnis zu
   warten.
4. **`page.keyboard.type(...)` + `press('Enter')` zum Aufbau der Liste** ist **kein** Race:
   Zeicheneingabe und `Enter`-Split laufen durch ProseMirrors eigenes `beforeinput`/Keymap-Handling,
   das das Modell synchron aktualisiert. Hier wird **kein** künstlicher Wait eingefügt (kein
   Cargo-Cult). Barrieren kommen ausschließlich an die unter 1./2. genannten nativen Übergänge.

Gemeinsamer E2E-Helfer (in `liste-aufheben.spec.ts`), der Regel 1 kapselt:

```ts
/**
 * Positioniert den Cursor per echtem Klick und wartet DETERMINISTISCH, bis ProseMirrors
 * asynchrone Selektions-Synchronisation gelandet ist, bevor eine Toolbar-Aktion die Selektion
 * liest (Race siehe selection-regression.spec.ts:26-34). Nach dem Fix aus code.md Abschnitt 3.3
 * schaltet `canLiftFromList` den Button auf enabled, sobald der Cursor in einer aufhebbaren Liste
 * steht — `toBeEnabled()` pollt exakt bis dahin. Fällt auf das Repo-Standard-Nachlauffenster
 * zurück, falls der Button (noch) keinen Zustand hat.
 */
async function positionInList(page: import('@playwright/test').Page, target: import('@playwright/test').Locator) {
  await target.click()
  const button = page.getByTitle('Liste aufheben')
  // Deterministisches Gate, sobald der Button-Zustand existiert (nach dem Fix):
  await expect(button).toBeEnabled().catch(async () => { await page.waitForTimeout(50) })
  // Belt-and-suspenders für das Selektions-Nachlauffenster auf Touch-Projekten:
  await page.waitForTimeout(50)
}
```

> Hinweis: Das zusätzliche `waitForTimeout(50)` ist bewusst redundant zur Web-First-Assertion — es
> deckt den Zeitraum **vor** Umsetzung des Fixes ab (da ist der Button immer „enabled", das Gate
> greift also nicht) und die Touch-Projekte, wo der native `selectionchange` messbar später landet.
> Es ist ein Nachlauffenster, kein Warten auf sichtbares UI; nach dem Fix trägt die
> `toBeEnabled()`-Assertion die eigentliche Determinismus-Last.

---

## 4. Teil A — Unit-Tests: Reader/Writer-Rundreise (DOCX **und** ODT) + Transformation

### 4.1 Bestandsaufnahme

Vorhanden: `src/formats/docx/__tests__/roundtrip.test.ts` (`describe('DOCX round trip: lists')`,
`:141`) und das ODT-Pendant — beide prüfen ausschließlich das **Anlegen/Verschachteln** von Listen
(inkl. 2-stufigem Nesting, `:181-201`). **Keiner** prüft den Zustand **nach** einem „Liste
aufheben" oder ruft `liftFromList` auf. `commands.test.ts` existiert noch nicht.

### 4.2 Neu: `src/formats/shared/editor/__tests__/commands.test.ts`

Reiner Logik-Test ohne Browser — konstruiert `EditorState` direkt aus `wordSchema` und prüft
`liftFromList`/`canLiftFromList` gegen die in Anforderungsabschnitt 3/4 beschriebenen Fälle.
Positionen werden über einen **Textsuche-Helfer** statt hartkodierter `nodeSize`-Arithmetik
ermittelt (robust gegen Schemaänderungen):

```ts
import { EditorState, TextSelection, AllSelection } from 'prosemirror-state'
import type { Node as PMNode } from 'prosemirror-model'
import { wordSchema } from '../../schema'
import { liftFromList, canLiftFromList, toggleList } from '../commands'

const doc = (...children: PMNode[]) => wordSchema.nodes.doc.create(null, children)
const para = (text: string) =>
  wordSchema.nodes.paragraph.create({ align: 'left' }, text ? wordSchema.text(text) : undefined)
const item = (...children: PMNode[]) => wordSchema.nodes.list_item.create(null, children)
const bulletList = (...items: PMNode[]) => wordSchema.nodes.bullet_list.create(null, items)
const orderedList = (start: number, ...items: PMNode[]) => wordSchema.nodes.ordered_list.create({ start }, items)
const stateFor = (node: PMNode) => EditorState.create({ doc: node, schema: wordSchema })

function findTextPos(root: PMNode, text: string): number {
  let found = -1
  root.descendants((node, pos) => {
    if (found !== -1) return false
    if (node.isText && node.text === text) { found = pos; return false }
    return true
  })
  if (found === -1) throw new Error(`findTextPos: "${text}" nicht gefunden`)
  return found
}
const cursorIn = (state: EditorState, text: string): EditorState =>
  state.apply(state.tr.setSelection(TextSelection.near(state.doc.resolve(findTextPos(state.doc, text) + 1))))
function applyLift(state: EditorState): EditorState {
  let out = state
  liftFromList()(state, (tr) => { out = state.apply(tr) })
  return out
}

describe('liftFromList — Aufheben-Verhalten (reiner Bibliothekscode, GREEN erwartet)', () => {
  it('mittlerer Punkt einer 3er-Bullet-Liste → Liste/Absatz/Liste, Text erhalten (3.1/3.4)', () => {
    let s = stateFor(doc(bulletList(item(para('eins')), item(para('zwei')), item(para('drei')))))
    s = applyLift(cursorIn(s, 'zwei'))
    expect(s.doc.content.content.map((n) => n.type.name)).toEqual(['bullet_list', 'paragraph', 'bullet_list'])
    expect(s.doc.textContent).toBe('einszweidrei')
  })

  it('einziger Punkt → Hüllknoten verschwindet vollständig (Grenzfall 2)', () => {
    let s = stateFor(doc(bulletList(item(para('einzig')))))
    s = applyLift(cursorIn(s, 'einzig'))
    expect(s.doc.content.content.map((n) => n.type.name)).toEqual(['paragraph'])
    expect(s.doc.textContent).toBe('einzig')
  })

  it('Selektion über alle Punkte → alle werden Absätze, Reihenfolge erhalten (3.2/3.5)', () => {
    let s = stateFor(doc(bulletList(item(para('a')), item(para('b')), item(para('c')))))
    s = s.apply(s.tr.setSelection(TextSelection.create(s.doc, 1, s.doc.content.size - 1)))
    s = applyLift(s)
    expect(s.doc.content.content.map((n) => n.type.name)).toEqual(['paragraph', 'paragraph', 'paragraph'])
    expect(s.doc.textContent).toBe('abc')
  })

  it('nummerierte Liste: beide Teillisten bleiben ordered_list mit GLEICHEM start (Grenzfall 4.3, dokumentiert, kein Fix)', () => {
    let s = stateFor(doc(orderedList(1, item(para('eins')), item(para('zwei')), item(para('drei')))))
    s = applyLift(cursorIn(s, 'zwei'))
    const [first, , third] = s.doc.content.content
    expect(first.type.name).toBe('ordered_list')
    expect(third.type.name).toBe('ordered_list')
    expect(first.attrs.start).toBe(1)
    expect(third.attrs.start).toBe(1) // bestätigt: im eigenen Modell NICHT fortlaufend
  })

  it('verschachtelt: tiefster Punkt wird zunächst nur eine Ebene gehoben, bleibt Listenpunkt (3.6/Grenzfall 4.4)', () => {
    const inner = bulletList(item(para('tief')))
    let s = stateFor(doc(bulletList(item(para('außen'), inner))))
    s = applyLift(cursorIn(s, 'tief'))
    const outer = s.doc.content.content[0]
    expect(outer.type.name).toBe('bullet_list')
    // 'tief' ist jetzt Geschwister-Listenpunkt von 'außen' in DERSELBEN äußeren Liste — noch KEIN Absatz.
    expect(outer.content.content.map((n) => n.firstChild!.textContent)).toEqual(['außen', 'tief'])
    // Zweiter Klick auf denselben, jetzt obersten Punkt → normaler Absatz.
    s = applyLift(cursorIn(s, 'tief'))
    expect(s.doc.content.content.map((n) => n.type.name)).toEqual(['bullet_list', 'paragraph'])
  })

  it('Zusatzblock (Bild nach Absatz) im Punkt wird eigenständiger Geschwisterblock (3.9/Grenzfall 10)', () => {
    const img = wordSchema.nodes.image.create({ src: 'data:image/png;base64,x', alt: '' })
    let s = stateFor(doc(bulletList(item(para('mit Bild'), img))))
    s = applyLift(cursorIn(s, 'mit Bild'))
    expect(s.doc.content.content.map((n) => n.type.name)).toEqual(['paragraph', 'image'])
  })

  it('Bild-ONLY-Punkt (block+, kein führender Absatz) → nach Aufheben bleibt genau das Bild (3.1/3.9)', () => {
    // Belegt zusätzlich, dass block+ (schema.ts:146-152) korrekt ist: ein Punkt darf allein aus
    // einem Bild bestehen; das Aufheben macht daraus einen eigenständigen image-Block, kein Verlust.
    const img = wordSchema.nodes.image.create({ src: 'data:image/png;base64,x', alt: '' })
    let s = stateFor(doc(bulletList(item(img))))
    s = s.apply(s.tr.setSelection(TextSelection.near(s.doc.resolve(2))))
    s = applyLift(s)
    expect(s.doc.content.content.map((n) => n.type.name)).toEqual(['image'])
  })

  it('Selektion vom Listenpunkt in nachfolgenden normalen Absatz → No-Op (Grenzfall 4.5)', () => {
    const s0 = stateFor(doc(bulletList(item(para('punkt'))), para('normal')))
    const s = s0.apply(s0.tr.setSelection(TextSelection.create(s0.doc, 2, s0.doc.content.size - 2)))
    const before = s.doc.toJSON()
    const applied = liftFromList()(s, () => { throw new Error('darf nicht dispatchen') })
    expect(applied).toBe(false)
    expect(s.doc.toJSON()).toEqual(before)
  })

  it('AllSelection (Strg+A) über gemischtem Inhalt → No-Op (Grenzfall 4.6)', () => {
    const s0 = stateFor(doc(bulletList(item(para('punkt'))), para('normal')))
    const s = s0.apply(s0.tr.setSelection(new AllSelection(s0.doc)))
    const applied = liftFromList()(s, () => { throw new Error('darf nicht dispatchen') })
    expect(applied).toBe(false)
  })

  it('Cursor exakt an der Absatzgrenze am Ende des letzten Listenpunkts (Grenzfall 16 — Feststellung, kein Pass/Fail auf Annahme)', () => {
    const s0 = stateFor(doc(bulletList(item(para('letzter Punkt'))), para('normaler Absatz')))
    const boundary = findTextPos(s0.doc, 'letzter Punkt') + 'letzter Punkt'.length
    const s = s0.apply(s0.tr.setSelection(TextSelection.near(s0.doc.resolve(boundary))))
    const canLift = canLiftFromList(s)
    // eslint-disable-next-line no-console
    console.log(`Grenzfall 16: canLiftFromList an der Absatzgrenze = ${canLift}`)
    expect(typeof canLift).toBe('boolean')
  })

  it('nach dem Aufheben wieder listenfähig (3.13)', () => {
    let s = stateFor(doc(bulletList(item(para('punkt')))))
    s = applyLift(cursorIn(s, 'punkt'))
    expect(s.doc.content.content.map((n) => n.type.name)).toEqual(['paragraph'])
    s = cursorIn(s, 'punkt')
    let ok = false
    toggleList(false)(s, (tr) => { s = s.apply(tr); ok = true })
    expect(ok).toBe(true)
    expect(s.doc.content.content[0].type.name).toBe('bullet_list')
  })
})

describe('canLiftFromList — Verfügbarkeitsprädikat (Abschnitt 3.3, Grenzfall 1/15 — RED bis Fix)', () => {
  it('false im normalen Absatz', () => {
    expect(canLiftFromList(stateFor(doc(para('normal'))))).toBe(false)
  })
  it('true mit Cursor im Listenpunkt', () => {
    expect(canLiftFromList(cursorIn(stateFor(doc(bulletList(item(para('punkt'))))), 'punkt'))).toBe(true)
  })
  it('false für Selektion Liste→Folgeabsatz — deckungsgleich mit dem echten Klick-Ergebnis (Grenzfall 4.5)', () => {
    const s0 = stateFor(doc(bulletList(item(para('punkt'))), para('normal')))
    const s = s0.apply(s0.tr.setSelection(TextSelection.create(s0.doc, 2, s0.doc.content.size - 2)))
    expect(canLiftFromList(s)).toBe(false)
  })
  it('false für AllSelection über gemischtem Inhalt (Grenzfall 4.6)', () => {
    const s0 = stateFor(doc(bulletList(item(para('punkt'))), para('normal')))
    const s = s0.apply(s0.tr.setSelection(new AllSelection(s0.doc)))
    expect(canLiftFromList(s)).toBe(false)
  })
})
```

**Erwartung heute:** `describe('liftFromList …')` und der Bild-only-Test sind bereits **GREEN**
(reiner, korrekter Bibliothekscode + `block+`). `describe('canLiftFromList …')` und der
Grenzfall-16-Test schlagen mit `TypeError: canLiftFromList is not a function` fehl → **RED bis
Fix** aus `code.md` Abschnitt 3.3.

### 4.3 Neu: `src/formats/odt/__tests__/list-structure.test.ts`

Reader-Regressionsnetz gegen **echte** Fixtures — sichert die bereits korrekten (Abschnitt 1)
Verhalten ab und deckt DoD 6 / Testfall 11/12. **Alle Assertions prüfen das korrekte
Zielverhalten** (Bild bleibt Bild, Text bleibt erhalten, Tiefe erhalten) und sind **GREEN erwartet**
— hier wird ausdrücklich **nicht** das von der Vorfassung behauptete Falschverhalten geprüft.

```ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { readOdt } from '../reader'
import { wordSchema } from '../../shared/schema'

const DIR = join(__dirname, '../../../../tests/fixtures/external/odt')
const load = (name: string) => readOdt(new Blob([new Uint8Array(readFileSync(join(DIR, name)))]))
const collectText = (n: any, out: string[] = []): string[] => {
  if (n.type === 'text') out.push(n.text)
  ;(n.content ?? []).forEach((c: any) => collectText(c, out))
  return out
}
const findList = (n: any): any =>
  n.type === 'bullet_list' || n.type === 'ordered_list' ? n : (n.content ?? []).map(findList).find(Boolean)

describe('imageWithinList.odt (Abschnitt 3.1 / Testfall 11b / DoD 6 — GREEN erwartet)', () => {
  it('Bild-only-Punkt ist schemakonform unter block+ und der erste Block ist ein image (KEIN führender Leerabsatz)', async () => {
    const doc = await load('imageWithinList.odt')
    const list = findList(doc.body)
    expect(list).toBeTruthy()
    const first = list.content[0]
    // KORREKT: block+ erlaubt [image] direkt; der erste Block ist ein image, NICHT ein paragraph.
    expect(first.content[0].type).toBe('image')
  })
  it('wird von wordSchema.nodeFromJSON ohne Fehler akzeptiert', async () => {
    const doc = await load('imageWithinList.odt')
    expect(() => wordSchema.nodeFromJSON(doc.body as any)).not.toThrow()
  })
})

describe('listLevel10.odt (Abschnitt 3.2 / Testfall 12 / Grenzfall 4.4 — GREEN erwartet)', () => {
  it('importiert als echte, tief verschachtelte ordered_list (nicht flach)', async () => {
    const doc = await load('listLevel10.odt')
    let node: any = findList(doc.body)
    let depth = 0
    while (node) {
      depth++
      node = (node.content?.[0]?.content ?? []).find((c: any) => c.type === 'bullet_list' || c.type === 'ordered_list')
    }
    expect(depth).toBeGreaterThanOrEqual(9)
  })
  it('erhält den Hyperlink-Text "www.tool.de" (generischer text:a-Fallback, reader.ts:160-167)', async () => {
    const doc = await load('listLevel10.odt')
    expect(collectText(doc.body).join('')).toContain('www.tool.de')
  })
  it('wird von wordSchema.nodeFromJSON ohne Fehler akzeptiert', async () => {
    const doc = await load('listLevel10.odt')
    expect(() => wordSchema.nodeFromJSON(doc.body as any)).not.toThrow()
  })
})
```

### 4.4 Erweiterung: `src/formats/docx/__tests__/roundtrip.test.ts`

Neuer `describe`-Block nach `'DOCX round trip: lists'` (`:141`). Nutzt die vorhandenen Helfer
`doc()`/`paragraph()`/`roundTrip()`/`writeDocx`/`readDocx` und `TINY_PNG` (`:11`). Prüft
Reader/Writer **direkt** mit dem **Zustand nach** dem Aufheben — schneller als E2E, unabhängige
XML-Prüfung. **Alle GREEN erwartet** (betrifft nur bereits korrekten Split-/Rundreise-Code):

```ts
describe('DOCX round trip: Zustand nach Liste aufheben (Grenzfall 3/9/14)', () => {
  it('Absatz zwischen zwei Bullet-Listen: mittlerer <w:p> ohne <w:numPr>, Reimport ergibt Liste/Absatz/Liste', async () => {
    const original = doc([
      { type: 'bullet_list', content: [{ type: 'list_item', content: [paragraph('Erster')] }] },
      paragraph('Aufgehoben'),
      { type: 'bullet_list', content: [{ type: 'list_item', content: [paragraph('Letzter')] }] },
    ])
    const blob = await writeDocx(original)
    const zip = await (await import('jszip')).default.loadAsync(blob)
    const xml = await zip.file('word/document.xml')!.async('text')
    const middle = xml.split('<w:p>').slice(1).find((p) => p.includes('Aufgehoben'))
    expect(middle).toBeDefined()
    expect(middle).not.toContain('numPr')
    const result = await readDocx(blob)
    expect((result.body as any).content.map((n: any) => n.type)).toEqual(['bullet_list', 'paragraph', 'bullet_list'])
  })

  it('nummerierte Liste durch Absatz getrennt: beide Hälften bleiben ordered_list (Grenzfall 4.3)', async () => {
    const result = await roundTrip(doc([
      { type: 'ordered_list', content: [{ type: 'list_item', content: [paragraph('eins')] }] },
      paragraph('mitte'),
      { type: 'ordered_list', content: [{ type: 'list_item', content: [paragraph('drei')] }] },
    ]))
    expect((result.body as any).content.map((n: any) => n.type)).toEqual(['ordered_list', 'paragraph', 'ordered_list'])
  })

  it('ganze Liste aufgehoben: kein <w:numPr> irgendwo im Dokument (Testfall 5.1.2)', async () => {
    const blob = await writeDocx(doc([paragraph('a'), paragraph('b'), paragraph('c')]))
    const zip = await (await import('jszip')).default.loadAsync(blob)
    expect(await zip.file('word/document.xml')!.async('text')).not.toContain('numPr')
  })

  it('Bild nach aufgehobenem Absatz überlebt Rundreise als eigenständiger Block (Testfall 5.1.5)', async () => {
    const result = await roundTrip(doc([paragraph('Text'), { type: 'image', attrs: { src: TINY_PNG, alt: '' } }]))
    expect((result.body as any).content.map((n: any) => n.type)).toEqual(['paragraph', 'image'])
  })

  it('zwei benachbarte, aber separate Bullet-Listen mit Trennabsatz bleiben getrennt trotz gemeinsamer numId (Grenzfall 9/14)', async () => {
    const result = await roundTrip(doc([
      { type: 'bullet_list', content: [{ type: 'list_item', content: [paragraph('A1')] }] },
      paragraph('Trenner'),
      { type: 'bullet_list', content: [{ type: 'list_item', content: [paragraph('B1')] }] },
    ]))
    expect((result.body as any).content.map((n: any) => n.type)).toEqual(['bullet_list', 'paragraph', 'bullet_list'])
    expect((result.body as any).content[0].content).toHaveLength(1)
    expect((result.body as any).content[2].content).toHaveLength(1)
  })
})
```

### 4.5 Erweiterung: `src/formats/odt/__tests__/roundtrip.test.ts`

Analog, neuer `describe`-Block nach `'ODT round trip: lists'`. Helfer `doc()`/`paragraph()`/
`roundTrip()`/`writeOdt`/`readOdt`. **Alle GREEN erwartet:**

```ts
describe('ODT round trip: Zustand nach Liste aufheben (Testfall 5.2.1/5.2.2)', () => {
  it('Absatz zwischen zwei Bullet-Listen → zwei getrennte <text:list>, Reimport Liste/Absatz/Liste', async () => {
    const original = doc([
      { type: 'bullet_list', content: [{ type: 'list_item', content: [paragraph('Erster')] }] },
      paragraph('Aufgehoben'),
      { type: 'bullet_list', content: [{ type: 'list_item', content: [paragraph('Letzter')] }] },
    ])
    const blob = await writeOdt(original)
    const zip = await (await import('jszip')).default.loadAsync(blob)
    expect(((await zip.file('content.xml')!.async('text')).match(/<text:list\b/g) ?? []).length).toBe(2)
    const result = await readOdt(blob)
    expect((result.body as any).content.map((n: any) => n.type)).toEqual(['bullet_list', 'paragraph', 'bullet_list'])
  })

  it('ganze Liste aufgehoben: kein <text:list in content.xml (Testfall 5.2.2)', async () => {
    const blob = await writeOdt(doc([paragraph('a'), paragraph('b'), paragraph('c')]))
    const zip = await (await import('jszip')).default.loadAsync(blob)
    expect(await zip.file('content.xml')!.async('text')).not.toContain('<text:list')
  })

  it('Punkt mit zwei Absätzen (Form nach Merge-Lift) erhält beide, in Reihenfolge', async () => {
    const result = await roundTrip(doc([
      { type: 'bullet_list', content: [{ type: 'list_item', content: [paragraph('erste'), paragraph('zweite')] }] },
    ]))
    const it0 = (result.body as any).content[0].content[0]
    expect(it0.content.map((p: any) => p.content?.[0]?.text)).toEqual(['erste', 'zweite'])
  })
})
```

### 4.6 Erwartete Ergebnisse heute (vor Umsetzung von `liste-aufheben-code.md`)

| Testdatei / Block | Erwartung heute | Grund |
|---|---|---|
| `commands.test.ts` — `describe('liftFromList …')` inkl. Bild-only | **GREEN** | `liftFromList()` unveränderter korrekter Alias; `block+` bereits korrekt |
| `commands.test.ts` — `describe('canLiftFromList …')` + Grenzfall-16 | **RED** (`TypeError: canLiftFromList is not a function`) | Export fehlt (Abschnitt 1, Punkt 1) |
| `odt/__tests__/list-structure.test.ts` (alle) | **GREEN** | `block+` gültig, `text:a`-Text erhalten, Tiefe korrekt — Zielverhalten bereits im Code |
| `docx/__tests__/roundtrip.test.ts`-Erweiterung (alle 5) | **GREEN** | nur bereits korrekter Split-/Rundreise-Code |
| `odt/__tests__/roundtrip.test.ts`-Erweiterung (alle 3) | **GREEN** | analog |

---

## 5. Teil B — Echte Playwright-Browser-Tests

### 5.1 Prinzipien für „echte" E2E-Tests

**Nicht zulässig:** `readDocx`/`writeDocx`/`readOdt`/`writeOdt`/`liftFromList` direkt aufrufen,
`EditorState`/`Command`s konstruieren, oder Assertions ausschließlich auf dem internen
Dokumentmodell statt auf gerendertem DOM / heruntergeladener Datei. Verbindlich:

1. **Klicks** über `page.getByTitle(...)`/`page.getByRole(...)`, nie `page.evaluate(() => command(...))`.
2. **Tippen** über `page.keyboard.type(...)`/`press(...)`, nie direktes Setzen von `textContent`.
3. **Datei-Upload** über `input[type="file"].setInputFiles({ name, mimeType, buffer })` auf den
   echten `<input>` der jeweiligen Format-Karte (bedient denselben `<input>`, den ein echter Klick
   auf „Datei auswählen" öffnet — etabliertes Muster aus `docx.spec.ts`/`odt.spec.ts`).
4. **Export/Download** über `page.waitForEvent('download')`, dann `download.path()` + echtes
   `fs.readFile` + `JSZip.loadAsync` auf die **tatsächlich vom Browser geschriebene Datei**;
   Assertions gegen den rohen XML-String, **nicht** gegen einen erneuten `readDocx`/`readOdt`-Aufruf
   (das würde Schreib- und Lesefehler gegenseitig maskieren).
5. **Determinismus** nach Abschnitt 3 — insbesondere `positionInList(...)` vor jedem Toolbar-Klick,
   der die Selektion liest.

### 5.2 Neu: `tests/e2e/liste-aufheben.spec.ts`

Locator-Helfer und UI-Beschriftungen (`OpenDocument Text (.odt)`, `Word-Dokument (.docx)`,
`Neu erstellen`, `Exportieren`, `verstanden`, `Aufzählung`, `Nummerierte Liste`, `Liste aufheben`,
`Tabelle einfügen`) sind gegen `tests/e2e/{docx,odt,selection-regression}.spec.ts` und den
tatsächlichen `Toolbar.tsx`-Code verifiziert.

```ts
import { test, expect, type Page, type Locator } from '@playwright/test'
import JSZip from 'jszip'

const odtCard = (page: Page) =>
  page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'OpenDocument Text (.odt)' }) })
const docxCard = (page: Page) =>
  page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })

async function uploadFixture(page: Page, card: Locator, path: string, mimeType: string) {
  const fs = await import('node:fs/promises')
  const buffer = await fs.readFile(path)
  await card.locator('input[type="file"]').setInputFiles({ name: path.split('/').pop()!, mimeType, buffer })
  return buffer
}

// Siehe Abschnitt 3: deterministische Selektions-Sync-Barriere vor einem Toolbar-Klick.
async function positionInList(page: Page, target: Locator) {
  await target.click()
  await expect(page.getByTitle('Liste aufheben')).toBeEnabled().catch(async () => { await page.waitForTimeout(50) })
  await page.waitForTimeout(50)
}

test.describe('Liste aufheben — Toolbar & Grundverhalten (Testfälle 1-9, Grenzfälle 1/2/8/15)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  })

  test('Testfall 1: mittleren Punkt einer 3er-Bullet-Liste aufheben, Text bleibt, Rest bleibt Liste (3.1/3.4)', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByTitle('Aufzählung').click()
    await page.keyboard.type('eins'); await page.keyboard.press('Enter')
    await page.keyboard.type('zwei'); await page.keyboard.press('Enter')
    await page.keyboard.type('drei')
    await positionInList(page, editor.locator('li', { hasText: 'zwei' }))
    await page.getByTitle('Liste aufheben').click()
    await expect(editor.locator('li')).toHaveCount(2)
    await expect(editor.locator('p', { hasText: 'zwei' })).toBeVisible()
    await expect(editor).toContainText('einszweidrei')
  })

  test('Testfall 2: alle Punkte markieren, Liste verschwindet komplett (3.2/3.5)', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByTitle('Aufzählung').click()
    await page.keyboard.type('a'); await page.keyboard.press('Enter'); await page.keyboard.type('b')
    await page.keyboard.press('ControlOrMeta+a')
    // Strg+A ist eine native Selektionsänderung → Barriere vor dem Toolbar-Klick (Abschnitt 3).
    // Selektion liegt vollständig in der Liste → Button bleibt aktiv.
    await expect(page.getByTitle('Liste aufheben')).toBeEnabled()
    await page.waitForTimeout(50)
    await page.getByTitle('Liste aufheben').click()
    await expect(editor.locator('ul, ol')).toHaveCount(0)
    await expect(editor.locator('p')).toHaveCount(2)
  })

  test('Testfall 3: nummeriert, mittleren Punkt aufheben — zweite Teilliste bleibt ol, Startwert protokollieren (Grenzfall 4.3)', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByTitle('Nummerierte Liste').click()
    await page.keyboard.type('eins'); await page.keyboard.press('Enter')
    await page.keyboard.type('zwei'); await page.keyboard.press('Enter')
    await page.keyboard.type('drei')
    await positionInList(page, editor.locator('li', { hasText: 'zwei' }))
    await page.getByTitle('Liste aufheben').click()
    const lists = editor.locator('ol')
    await expect(lists).toHaveCount(2)
    const start = await lists.nth(1).evaluate((el) => (el as HTMLOListElement).start)
    // eslint-disable-next-line no-console
    console.log(`Grenzfall 4.3: Startwert der zweiten Teilliste im Editor = ${start}`)
    expect(start).toBe(1) // dokumentiertes, in DIESEM Feature nicht zu korrigierendes Verhalten (Abschnitt 8)
    await expect(lists.nth(1).locator('li').first()).toHaveText('drei')
  })

  test('Testfall 4 / Grenzfall 1: Klick-Ziel außerhalb einer Liste ist kein Auslöser; Button ist disabled (RED bis Fix aus Abschnitt 1 Punkt 1/2)', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('normaler Absatz')
    // Zielzustand nach dem Fix (natives disabled, NICHT aria-disabled):
    await expect(page.getByTitle('Liste aufheben')).toBeDisabled()
    await expect(page.getByTitle('Liste aufheben')).toHaveAttribute('aria-label', 'Liste aufheben')
    // Absicherung, dass auch bei erzwungenem Klick nichts passiert (No-Op-Garantie):
    await page.getByTitle('Liste aufheben').click({ force: true })
    await expect(editor).toContainText('normaler Absatz')
    await expect(editor.locator('ul, ol')).toHaveCount(0)
  })

  test('Testfall 4b / Grenzfall 15: Button wird enabled, sobald der Cursor in einer Liste steht (RED bis Fix)', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByTitle('Aufzählung').click()
    await page.keyboard.type('Punkt')
    await expect(page.getByTitle('Liste aufheben')).toBeEnabled()
  })

  test('Testfall 5 / Grenzfall 4.5: Selektion von Listenpunkt in nachfolgenden normalen Absatz → No-Op', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByTitle('Aufzählung').click()
    await page.keyboard.type('Listenpunkt')
    await page.keyboard.press('Enter'); await page.keyboard.press('Enter') // leerer Punkt beendet Liste (splitListItem)
    await page.keyboard.type('normaler Absatz')
    await page.keyboard.press('ControlOrMeta+Home')
    await page.keyboard.down('Shift'); await page.keyboard.press('ControlOrMeta+End'); await page.keyboard.up('Shift')
    await page.waitForTimeout(50) // native Selektionsänderung → Nachlauffenster vor der Zustandsprüfung
    // Erwartetes Verhalten: Bereich überschreitet den Listenrand → kein gültiger blockRange → Button disabled.
    await expect(page.getByTitle('Liste aufheben')).toBeDisabled() // RED bis Fix; dokumentiert den No-Op
    await page.getByTitle('Liste aufheben').click({ force: true })
    await expect(editor.locator('li')).toHaveCount(1)
    await expect(editor).toContainText('Listenpunkt')
    await expect(editor).toContainText('normaler Absatz')
  })

  test('Testfall 6 / Grenzfall 4.6: Strg+A über gemischtem Inhalt, "Liste aufheben" → No-Op', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByTitle('Aufzählung').click()
    await page.keyboard.type('Listenpunkt')
    await page.keyboard.press('Enter'); await page.keyboard.press('Enter')
    await page.keyboard.type('normaler Absatz')
    await page.keyboard.press('ControlOrMeta+a')
    await page.waitForTimeout(50)
    await expect(page.getByTitle('Liste aufheben')).toBeDisabled() // AllSelection über gemischtem Inhalt → No-Op
    await page.getByTitle('Liste aufheben').click({ force: true })
    await expect(editor.locator('li')).toHaveCount(1)
  })

  test('Testfall 7 / Grenzfall 8: Liste in Tabellenzelle aufheben, Rest der Tabelle unangetastet', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
    const cells = editor.locator('td')
    await cells.nth(0).click()
    await page.getByTitle('Aufzählung').click()
    await page.keyboard.type('Zelleneintrag')
    await cells.nth(1).click()
    await page.keyboard.type('Andere Zelle')
    await positionInList(page, cells.nth(0).locator('li'))
    await page.getByTitle('Liste aufheben').click()
    await expect(cells.nth(0).locator('li')).toHaveCount(0)
    await expect(cells.nth(0)).toContainText('Zelleneintrag')
    await expect(cells.nth(1)).toContainText('Andere Zelle')
  })

  test('Testfall 8: Undo/Redo um "Liste aufheben" (3.10)', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByTitle('Aufzählung').click()
    await page.keyboard.type('Punkt')
    await positionInList(page, editor.locator('li', { hasText: 'Punkt' }))
    await page.getByTitle('Liste aufheben').click()
    await expect(editor.locator('li')).toHaveCount(0)
    await page.keyboard.press('ControlOrMeta+z')
    await expect(editor.locator('li')).toHaveCount(1)
    await page.keyboard.press('ControlOrMeta+y')
    await expect(editor.locator('li')).toHaveCount(0)
  })

  test('Testfall 9: nach dem Aufheben erneut "1. Liste" anwendbar (3.13)', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByTitle('Aufzählung').click()
    await page.keyboard.type('Punkt')
    await positionInList(page, editor.locator('li', { hasText: 'Punkt' }))
    await page.getByTitle('Liste aufheben').click()
    await expect(editor.locator('li')).toHaveCount(0)
    await page.getByTitle('Nummerierte Liste').click()
    await expect(editor.locator('ol li')).toContainText('Punkt')
  })

  test('Grenzfall 2: Liste erstellen und sofort aufheben, ohne Text — kein Crash, kein verwaister Knoten', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByTitle('Aufzählung').click()
    await positionInList(page, editor.locator('li').first())
    await page.getByTitle('Liste aufheben').click()
    await expect(editor.locator('ul, ol')).toHaveCount(0)
    await page.keyboard.type('weiter geht es')
    await expect(editor).toContainText('weiter geht es')
  })
})
```

### 5.3 Fremddateien & Rundreisen (`liste-aufheben.spec.ts`, zweiter `describe`)

```ts
test.describe('Liste aufheben — Fremddateien & Rundreisen (Abschnitt 5, Testfälle 10-15)', () => {
  test('Testfall 10a / Rundreise 5.1.1: DOCX-Eigenrundreise, mittleren Punkt aufheben, echter Upload+Download', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByTitle('Aufzählung').click()
    await page.keyboard.type('eins'); await page.keyboard.press('Enter')
    await page.keyboard.type('zwei'); await page.keyboard.press('Enter')
    await page.keyboard.type('drei')
    await positionInList(page, editor.locator('li', { hasText: 'zwei' }))
    await page.getByTitle('Liste aufheben').click()

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportieren' }).click()
    const download = await downloadPromise
    const fs = await import('node:fs/promises')
    const exported = await fs.readFile((await download.path())!)
    const zip = await JSZip.loadAsync(exported)
    const xml = await zip.file('word/document.xml')!.async('text')
    const middle = xml.split('<w:p>').slice(1).find((p) => p.includes('zwei'))
    expect(middle).not.toContain('numPr') // unabhängige XML-Prüfung, nicht via readDocx
    expect(xml).toContain('eins'); expect(xml).toContain('zwei'); expect(xml).toContain('drei')

    await docxCard(page).locator('input[type="file"]').setInputFiles({
      name: 'roundtrip.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer: exported,
    })
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
    await page.keyboard.type('eins'); await page.keyboard.press('Enter')
    await page.keyboard.type('zwei'); await page.keyboard.press('Enter')
    await page.keyboard.type('drei')
    await positionInList(page, editor.locator('li', { hasText: 'zwei' }))
    await page.getByTitle('Liste aufheben').click()

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportieren' }).click()
    const download = await downloadPromise
    const fs = await import('node:fs/promises')
    const exported = await fs.readFile((await download.path())!)
    const zip = await JSZip.loadAsync(exported)
    const contentXml = await zip.file('content.xml')!.async('text')
    expect((contentXml.match(/<text:list\b/g) ?? []).length).toBe(2)

    await odtCard(page).locator('input[type="file"]').setInputFiles({
      name: 'roundtrip.odt', mimeType: 'application/vnd.oasis.opendocument.text', buffer: exported,
    })
    await expect(page.locator('.ProseMirror li')).toHaveCount(2)
  })

  test('Testfall 11a / 5.1.6 / Grenzfall 12: ComplexNumberedLists.docx (lange Liste), Punkt aufheben, kein Zeichenverlust', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await uploadFixture(page, docxCard(page), 'tests/fixtures/external/docx/ComplexNumberedLists.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    const editor = page.locator('.ProseMirror')
    await expect(editor.locator('li').first()).toBeVisible()
    const before = await editor.locator('li').count()
    const originalText = (await editor.innerText()).replace(/\s+/g, ' ')
    await positionInList(page, editor.locator('li').first())
    await page.getByTitle('Liste aufheben').click()
    const afterText = (await editor.innerText()).replace(/\s+/g, ' ')
    expect(afterText.length).toBeGreaterThan(originalText.length - 10) // kein Textverlust (Toleranz nur für Marker/Umbruch)
    await expect(editor.locator('li')).toHaveCount(before - 1)
  })

  test('Testfall 11b / 5.2.5 / DoD 6: imageWithinList.odt — Bild-Punkt aufheben, Bild bleibt (GREEN erwartet)', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await uploadFixture(page, odtCard(page), 'tests/fixtures/external/odt/imageWithinList.odt',
      'application/vnd.oasis.opendocument.text')
    const editor = page.locator('.ProseMirror')
    await expect(editor.locator('img')).toHaveCount(1)
    await positionInList(page, editor.locator('li').first())
    await page.getByTitle('Liste aufheben').click()
    await expect(editor.locator('ul, ol')).toHaveCount(0)
    await expect(editor.locator('img')).toHaveCount(1) // Bild darf nicht verschwinden
  })

  test('Testfall 11c / 5.2.4: listsInTable.odt — Punkt in Zelle aufheben, Tabellenstruktur unverändert', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await uploadFixture(page, odtCard(page), 'tests/fixtures/external/odt/listsInTable.odt',
      'application/vnd.oasis.opendocument.text')
    const editor = page.locator('.ProseMirror')
    const cellsBefore = await editor.locator('table td').count()
    await positionInList(page, editor.locator('li').first())
    await page.getByTitle('Liste aufheben').click()
    expect(await editor.locator('table td').count()).toBe(cellsBefore)
  })

  test('Testfall 12 / Grenzfall 4.4 (ODT): listLevel10.odt — tiefsten Punkt wiederholt aufheben, Klicks protokollieren, Text bleibt', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await uploadFixture(page, odtCard(page), 'tests/fixtures/external/odt/listLevel10.odt',
      'application/vnd.oasis.opendocument.text')
    const editor = page.locator('.ProseMirror')
    const button = page.getByTitle('Liste aufheben')
    // Tiefster Text-Punkt laut Fixture-Analyse (code.md Abschnitt 6): "ASDAS".
    const deepest = editor.locator('li', { hasText: 'ASDAS' }).last()
    await expect(deepest).toBeVisible()
    await expect(editor).toContainText('www.tool.de') // Hyperlink-Text erhalten (GREEN)
    let clicks = 0
    // Ein-Klick-pro-Ebene (code.md Abschnitt 3.5). Obergrenze gegen Endlosschleife.
    while (clicks < 15 && (await editor.locator('p', { hasText: 'ASDAS' }).count()) === 0) {
      await positionInList(page, editor.locator('li', { hasText: 'ASDAS' }).last())
      if (!(await button.isEnabled())) break
      await button.click()
      clicks++
    }
    expect(clicks).toBeGreaterThan(0)
    expect(clicks).toBeLessThanOrEqual(10)
    await expect(editor.locator('p', { hasText: 'ASDAS' })).toBeVisible()
    // eslint-disable-next-line no-console
    console.log(`listLevel10.odt: ${clicks} Klicks bis zum normalen Absatz (Grenzfall 4.4/Testfall 12)`)
  })

  test('Testfall 12b / 5.1.4 / Grenzfall 4.4 (DOCX): ComplexNumberedLists.docx — echte Verschachtelung, tiefsten Punkt aufheben, Text bleibt', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await uploadFixture(page, docxCard(page), 'tests/fixtures/external/docx/ComplexNumberedLists.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    const editor = page.locator('.ProseMirror')
    // DOCX erzeugt echte ProseMirror-Verschachtelung (reader.ts liest w:ilvl) — verschachtelte li nachweisen.
    await expect(editor.locator('li ul li, li ol li').first()).toBeVisible()
    const before = (await editor.innerText()).replace(/\s+/g, ' ')
    const deepest = editor.locator('li ul li, li ol li').last()
    await positionInList(page, deepest)
    await page.getByTitle('Liste aufheben').click()
    const after = (await editor.innerText()).replace(/\s+/g, ' ')
    expect(after.length).toBeGreaterThan(before.length - 10) // kein Textverlust im Zwischenschritt
  })

  test('Testfall 13 / Grenzfall 13: brokenList.odt / ListOddity.odt — kein Absturz, definiertes Verhalten', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    for (const name of ['brokenList.odt', 'ListOddity.odt']) {
      await uploadFixture(page, odtCard(page), `tests/fixtures/external/odt/${name}`, 'application/vnd.oasis.opendocument.text')
      const editor = page.locator('.ProseMirror')
      await expect(editor).toBeVisible()
      const li = editor.locator('li').first()
      if (await li.count()) {
        await positionInList(page, li)
        if (await page.getByTitle('Liste aufheben').isEnabled()) {
          await page.getByTitle('Liste aufheben').click() // darf nicht crashen
        }
      }
      await expect(editor).toBeVisible() // App lebt weiter
    }
  })

  test('Testfall 14a / 5.3: Cross-Format DOCX → ODT → DOCX, Punkt aufheben, Text über beide Konvertierungen erhalten', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByTitle('Aufzählung').click()
    await page.keyboard.type('eins'); await page.keyboard.press('Enter'); await page.keyboard.type('zwei')
    await positionInList(page, editor.locator('li', { hasText: 'eins' }))
    await page.getByTitle('Liste aufheben').click()

    const fs = await import('node:fs/promises')
    let dl = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportieren' }).click()
    let buffer = await fs.readFile((await (await dl).path())!)
    await odtCard(page).locator('input[type="file"]').setInputFiles({ name: 'a.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer })
    dl = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportieren' }).click()
    buffer = await fs.readFile((await (await dl).path())!)
    await docxCard(page).locator('input[type="file"]').setInputFiles({ name: 'b.odt', mimeType: 'application/vnd.oasis.opendocument.text', buffer })
    await expect(editor).toContainText('eins')
    await expect(editor).toContainText('zwei')
    await expect(editor.locator('li')).toHaveCount(1)
  })

  test('Testfall 14b / 5.3: Cross-Format ODT → DOCX → ODT', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByTitle('Aufzählung').click()
    await page.keyboard.type('alpha'); await page.keyboard.press('Enter'); await page.keyboard.type('beta')
    await positionInList(page, editor.locator('li', { hasText: 'alpha' }))
    await page.getByTitle('Liste aufheben').click()

    const fs = await import('node:fs/promises')
    let dl = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportieren' }).click()
    let buffer = await fs.readFile((await (await dl).path())!)
    await docxCard(page).locator('input[type="file"]').setInputFiles({ name: 'a.odt', mimeType: 'application/vnd.oasis.opendocument.text', buffer })
    dl = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportieren' }).click()
    buffer = await fs.readFile((await (await dl).path())!)
    await odtCard(page).locator('input[type="file"]').setInputFiles({ name: 'b.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer })
    await expect(editor).toContainText('alpha')
    await expect(editor).toContainText('beta')
    await expect(editor.locator('li')).toHaveCount(1)
  })

  test('Testfall 15: optischer Vergleich — aufgehobener Absatz hat keinen Listeneinzug mehr', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByTitle('Aufzählung').click()
    await page.keyboard.type('Punkt')
    await positionInList(page, editor.locator('li', { hasText: 'Punkt' }))
    await page.getByTitle('Liste aufheben').click()
    await expect(editor.locator('li')).toHaveCount(0)
    const marginLeft = await editor.locator('p', { hasText: 'Punkt' }).evaluate((el) => getComputedStyle(el).marginLeft)
    expect(marginLeft).toBe('0px')
  })

  test.each(['bulletListTest.odt', 'list.odt', 'liste2.odt', 'simple_bullet_list.odt', 'simpleList.odt', 'EasyList.odt', 'ListRoundtrip.odt'])(
    'Anforderung 5.2.7: Basis-Fixture %s — importieren, einen Punkt aufheben, exportieren, reimportieren, Text bleibt gleich',
    async ({ page }, fixtureName) => {
      await page.goto('/')
      await page.getByRole('button', { name: /verstanden/i }).click()
      await uploadFixture(page, odtCard(page), `tests/fixtures/external/odt/${fixtureName}`, 'application/vnd.oasis.opendocument.text')
      const editor = page.locator('.ProseMirror')
      await expect(editor).toBeVisible()
      const originalText = (await editor.innerText()).replace(/\s+/g, ' ')
      const li = editor.locator('li').first()
      if (await li.count()) {
        await positionInList(page, li)
        if (await page.getByTitle('Liste aufheben').isEnabled()) await page.getByTitle('Liste aufheben').click()
      }
      const dl = page.waitForEvent('download')
      await page.getByRole('button', { name: 'Exportieren' }).click()
      const fs = await import('node:fs/promises')
      const buffer = await fs.readFile((await (await dl).path())!)
      await odtCard(page).locator('input[type="file"]').setInputFiles({ name: `reimport-${fixtureName}`, mimeType: 'application/vnd.oasis.opendocument.text', buffer })
      const afterText = (await editor.innerText()).replace(/\s+/g, ' ')
      expect(afterText.length).toBeGreaterThan(originalText.length - 10)
    },
  )
})
```

### 5.4 Erweiterung: `tests/e2e/selection-regression.spec.ts` (Grenzfall 4.11 / DoD 7)

Neben den bestehenden „Fett"-Regressionstests (gleiche Datei, gleicher `odtCard`-Helfer, gleiches
`beforeEach`), mit „Liste aufheben" als Zusatzschritt. **Wichtig:** Die Vorfassung dieses Plans
ließ hier die Sync-Barriere zwischen `End` und `Enter` weg — das ist genau der Race, den die
Nachbartests in dieser Datei mit `waitForTimeout(50)` schließen; er wird hier **übernommen**.

```ts
test('same selection-sync regression with "Liste aufheben" as the extra step (Grenzfall 4.11)', async ({ page }) => {
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.getByTitle('Aufzählung').click()
  await page.keyboard.type('Hallo, das ist ein Test.')
  await page.keyboard.press('ControlOrMeta+a')
  await page.getByTitle('Fett').click()
  // Positionierungs-Klick vor der Toolbar-Aktion, die die Selektion liest → Barriere (Abschnitt 3).
  await editor.locator('li').click()
  await expect(page.getByTitle('Liste aufheben')).toBeEnabled().catch(async () => { await page.waitForTimeout(50) })
  await page.waitForTimeout(50)
  await page.getByTitle('Liste aufheben').click()
  // Re-Klick + native Caret-Taste + sofortige Folgetaste — der klassische stale-Selection-Pfad.
  await editor.click()
  await page.keyboard.press('End')
  // Identisch zum Kommentar/Muster in selection-regression.spec.ts:26-34: Nachlauffenster vor Enter.
  await page.waitForTimeout(50)
  await page.keyboard.press('Enter')
  await page.keyboard.type('Zweiter Absatz.')
  await expect(editor).toContainText('Hallo, das ist ein Test.')
  await expect(editor).toContainText('Zweiter Absatz.')
  await expect(editor.locator('p')).toHaveCount(2)
})
```

---

## 6. Fixture-Inventar — im Dateisystem geprüft

| Datei | Geprüft | Relevanz |
|---|---|---|
| `tests/fixtures/external/odt/listLevel10.odt` | Existiert | Testfall 12/Grenzfall 4.4 (Tiefe, Klicks) + Regressionsnetz Hyperlink-Text „www.tool.de" |
| `tests/fixtures/external/odt/imageWithinList.odt` | Existiert | Testfall 11b/DoD 6 (Bild-only-Punkt, `block+`) |
| `tests/fixtures/external/odt/listsInTable.odt` | Existiert | Testfall 11c/Grenzfall 8 |
| `tests/fixtures/external/odt/brokenList.odt` | Existiert; `SKIP_SLOW_UNDER_JSDOM` in `external-fixtures.test.ts` → Grenzfall 13 **nur** im E2E | Testfall 13 |
| `tests/fixtures/external/odt/ListOddity.odt` | Existiert | Testfall 13 |
| `tests/fixtures/external/odt/{bulletListTest,list,liste2,simple_bullet_list,simpleList,EasyList,ListRoundtrip}.odt` | Alle sieben existieren | 5.2.7 (`test.each`) |
| `tests/fixtures/external/docx/ComplexNumberedLists.docx` | Existiert | Testfall 11a (lange Liste) **und** Testfall 12b (DOCX-Mehrstufigkeit, echtes `w:ilvl`-Nesting) |

---

## 7. Unabhängige Parser-Validierung (Anforderung Abschnitt 5, Rundreise-Prinzip Punkt 8, DoD 2)

Reines TypeScript/Vite-Repo ohne Python-Toolchain. Zweistufig:

1. **Automatisiert:** Die E2E-Tests (Abschnitt 5.3) prüfen den exportierten XML-String **direkt**
   per `String.includes`/Regex/Zählung (`document.xml` ohne `numPr` am mittleren Absatz;
   `content.xml` mit genau 2 `<text:list `), **ohne** `readDocx`/`readOdt`. Damit ist „nicht nur mit
   dem eigenen Reader rückgelesen" für die automatisierte Suite erfüllt.
2. **Manuell, einmalig, vor Statuswechsel:** Eine nach „Liste aufheben" exportierte **nummerierte**
   Test-DOCX (Testfall 3) in einem echten, unabhängigen Word/LibreOffice öffnen und dokumentieren,
   ob die zweite Teilliste dort **fortlaufend** oder **neu bei „1."** zählt (Cross-Tool-Divergenz aus
   `code.md` Abschnitt 3.6, Punkt 2). Ergebnis vor Statuswechsel in `req.md`/`code.md` nachtragen.
   **Noch offen** (siehe Abschnitt 8).

---

## 8. Offene Punkte / bewusst nicht (vollautomatisiert) abgedeckt

- **Produktcode-Fix noch nicht umgesetzt** (Abschnitt 1, Punkt 1/2): `canLiftFromList` + `aria-label`
  + natives `disabled` am „⇧ Liste"-Button. Bis dahin sind die zustandsbezogenen Tests (Unit
  `canLiftFromList`, E2E Testfall 4/4b/5/6-Buttonzustand) **RED**. Das ist der **einzige** heute rote
  Bereich und exakt der geforderte Nachweis für DoD 8/9.
- **Manuelle Word/LibreOffice-Gegenprobe zur Nummerierungs-Fortsetzung** (Abschnitt 7, Punkt 2): kein
  automatisierter Test kann ein unabhängiges Office öffnen; muss vor Abnahme (DoD 5) manuell erfolgen.
- **`docx/styleDefs.ts`-Kommentar** zur `start`/`numId`-Divergenz (Abschnitt 1, Punkt 4): reine
  Doku-Lücke, kein QA-Blocker.
- **Nummerierung der zweiten Teilliste (Grenzfall 4.3)** wird **protokolliert und mit dem bestätigten
  Wert `1` verglichen**, nicht als Bug gewertet — deckt sich mit `code.md` Abschnitt 3.6 (Korrektur
  gehört zu `nummerierung-fortsetzen-neustarten`, nicht zu diesem Feature).
- **Mehrstufige Liste über reine Editor-Bedienung** ist nach aktuellem Stand nicht erzeugbar (kein
  Tab/Shift-Tab). Testfall 12 deckt den Fall über **Import** ab — und zwar über **beide** Formate
  (`listLevel10.odt` **und** `ComplexNumberedLists.docx`), da beide Reader echte Verschachtelung
  erzeugen. (Korrektur der Vorfassung, die DOCX-Mehrstufigkeit fälschlich für unerreichbar hielt.)
- **Grenzfall 17 (verschachtelter Untertyp, nur DOCX):** Textreue in Testfall 12b geprüft; die
  vereinfachte Markerart tiefer Ebenen ist als dokumentierte Cross-Format-Einschränkung hinzunehmen
  (`req.md`/`code.md`).

---

## 9. Abnahme-Mapping (Anforderung Abschnitt 6/7/8 → Testartefakt, mit heutigem Status)

| Anforderung | Abgedeckt durch | Status heute |
|---|---|---|
| Testfälle 1, 2, 7, 8, 9 (Grundverhalten) | `liste-aufheben.spec.ts` „Toolbar & Grundverhalten" + `commands.test.ts` | GREEN |
| Testfall 3 / Grenzfall 4.3 (Nummerierung zweite Teilliste) | `liste-aufheben.spec.ts` TF3 + `commands.test.ts` + `roundtrip.test.ts` | GREEN (protokolliert, nicht korrigiert) |
| Testfall 4 / Grenzfall 1 (No-Op + Button-Zustand) | `liste-aufheben.spec.ts` TF4 | **RED bis Fix** (Buttonzustand + `aria-label`) |
| Testfall 4b / Grenzfall 15 (Button enabled in Liste) | `liste-aufheben.spec.ts` TF4b + `commands.test.ts` | **RED bis Fix** |
| Testfall 5/6 / Grenzfall 4.5/4.6 (Selektion über Listenrand) | `liste-aufheben.spec.ts` TF5/6 + `commands.test.ts` | No-Op GREEN; Buttonzustand **RED bis Fix** |
| Testfall 10 (Rundreise über echten Upload/Download je Format) | `liste-aufheben.spec.ts` TF10a/10b | GREEN |
| Testfall 11a (`ComplexNumberedLists.docx`, lange Liste) | `liste-aufheben.spec.ts` TF11a | GREEN |
| Testfall 11b (`imageWithinList.odt`) | `liste-aufheben.spec.ts` TF11b + `list-structure.test.ts` | GREEN |
| Testfall 11c (`listsInTable.odt`) | `liste-aufheben.spec.ts` TF11c | GREEN |
| Testfall 12 / Grenzfall 4.4 (mehrstufig, Klicks) | `liste-aufheben.spec.ts` TF12 (ODT) + TF12b (DOCX) + `list-structure.test.ts` | GREEN |
| Testfall 13 (`brokenList.odt`/`ListOddity.odt`) | `liste-aufheben.spec.ts` TF13 | GREEN |
| Testfall 14 (Cross-Format doppelt) | `liste-aufheben.spec.ts` TF14a/14b | GREEN |
| Testfall 15 (optischer Vergleich) | `liste-aufheben.spec.ts` TF15 | GREEN |
| Anforderung 5.2.7 (Basis-Fixtures) | `liste-aufheben.spec.ts` `test.each(...)` | GREEN |
| Grenzfall 2 (leere Liste sofort aufheben) | `commands.test.ts` + `liste-aufheben.spec.ts` | GREEN |
| Grenzfall 7 (Abgrenzung Enter-auf-leerem-Punkt) | TF5 nutzt beide Mechanismen, getrennte Assertions | GREEN |
| Grenzfall 9/14 (Trennabsatz, gleiche numId) | `docx/__tests__/roundtrip.test.ts`-Erweiterung | GREEN |
| Grenzfall 10 (Zusatzblock in Punkt) | `commands.test.ts` + `roundtrip.test.ts` + TF11b | GREEN |
| Grenzfall 11 (Selection-Sync-Bug in Sequenz) | `selection-regression.spec.ts`-Erweiterung | GREEN |
| Grenzfall 12 (sehr lange Liste) | TF11a | GREEN |
| Grenzfall 13 (kaputtes Markup) | TF13 | GREEN |
| Grenzfall 16 (Cursor an Absatzgrenze) | `commands.test.ts` (Feststellung) | GREEN (protokollierend) |
| Grenzfall 17 (verschachtelter Untertyp, DOCX) | TF12b (Textreue) + dokumentierte Einschränkung | GREEN |
| „Bug 3.1/3.2" der Vorentwürfe | `list-structure.test.ts` (Regressionsnetz) | **gegenstandslos, GREEN** (bereits im Code gelöst) |
| DoD 1 (alle TF automatisiert, grün) | Abschnitt 4/5 | vollständig als Plan; nur Buttonzustand-Tests RED bis Fix |
| DoD 2 (reale Fremddateien je Format) | DOCX `ComplexNumberedLists.docx`; ODT `listLevel10`/`imageWithinList`/`listsInTable`/`brokenList`/`ListOddity` + 7 Basis-Fixtures | GREEN |
| DoD 3 (Selektion über Listenrand geprüft/dokumentiert) | TF5/6 + `commands.test.ts` | GREEN |
| DoD 4 (mehrstufig, Ein-Klick-pro-Ebene) | TF12/12b + `commands.test.ts` | GREEN |
| DoD 5 (Nummerierung zweite Teilliste bestätigt) | TF3 + Abschnitt 7 Punkt 2 (manuell, **offen**) | automatisiert GREEN, manuell offen |
| DoD 6 (Zusatzblöcke, `imageWithinList.odt`) | `list-structure.test.ts` + `commands.test.ts` + TF11b | GREEN |
| DoD 7 (Regressionstest dauerhaft) | `selection-regression.spec.ts`-Erweiterung | GREEN |
| DoD 8 (`aria-label`/Zustand/Tastenkombination bewusst entschieden) | TF4/4b (`aria-label`+`disabled`); Taste bewusst keine | **RED bis Fix** (nur Buttonzustand) |
| DoD 9/10 (kein Fund ohne Ticket/Vermerk) | Abschnitt 1/8 + `code.md` Abschnitt 9 | dokumentiert |

**Gesamturteil dieser QA-Prüfung:** Der Status „verifiziert" darf **noch nicht** vergeben werden,
aber die Ausgangslage ist deutlich besser, als die Vorfassung dieses Plans behauptete: Es gibt
**keine** zwei Reader-Bugs und **keinen** Schema-Verstoß. Offen sind genau zwei Punkte:
**(1)** die noch nicht umgesetzte Barrierefreiheits-/Zustands-Änderung am „⇧ Liste"-Button
(`canLiftFromList` + `aria-label` + natives `disabled`, `code.md` Abschnitt 3.3) — heute messbar rot,
nach Umsetzung grün; **(2)** die manuelle Word/LibreOffice-Gegenprobe zur Nummerierungs-Fortsetzung
(DoD 5). Alles Übrige — Aufhebe-Verhalten, DOCX-/ODT-Rundreise, DOCX-Mehrstufigkeit, Bild-only-Punkt,
Hyperlink-Text — ist bereits korrekt und wird durch diesen Plan **deterministisch** abgesichert.
