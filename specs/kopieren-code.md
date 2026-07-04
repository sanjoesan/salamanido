# Umsetzungsplan (Code-Ebene): Feature „Kopieren“

Bezug: `E:\docs\specs\kopieren-req.md` (Anforderung), `E:\docs\FEATURE-SPEC-DOCX-ODT.md`
(Referenzkonventionen). Code-Stand gegen die Arbeitskopie in `E:\docs` geprüft
(kein Git-Repo im engeren Sinne aktiv genutzt für diese Prüfung).

Rolle dieses Dokuments: dateigenauer Umsetzungsplan — was am *tatsächlichen* Code
falsch/unvollständig ist, welche Dateien geändert bzw. neu angelegt werden, und wie
ProseMirror-Schema/Commands, Toolbar sowie DOCX/ODT-Import/Export betroffen sind.
Ändert `kopieren-req.md` nicht selbst, beantwortet aber dessen offene Fragen
(Abschnitt 8 dort) und markiert genau, was dort nachzutragen ist (Abschnitt 10 hier).

**Methodik:** Jede Tatsachenbehauptung unten wurde gegen den echten Code geprüft
(Dateien gelesen, `grep`/`find` gegen `src/` und die installierten
`prosemirror-*`-Pakete ausgeführt) und die kritischen Klartext-Serialisierungsfälle
wurden mit der echten `wordSchema` in Wegwerf-Vitest-Läufen tatsächlich ausgeführt,
nicht nur am Quelltext abgelesen. Eine erste eigene Vermutung (vermeintlicher
Serialisierungsfehler bei `image`-Knoten) wurde dabei durch einen Testlauf
**widerlegt** — siehe Abschnitt 0.3, damit niemand dieser falschen Spur nachjagt.

---

## 0. Verifizierter Ist-Zustand

### 0.1 Bestätigung der Bestandsaufnahme aus `kopieren-req.md` Abschnitt 0

Bestätigt, wörtlich zutreffend:

- `src/formats/shared/editor/WordEditor.tsx` (134 Zeilen): keymap-Objekt (Zeilen
  71–79) enthält `Mod-z`, `Mod-y`, `Mod-Shift-z`, `Enter`, `Mod-b`, `Mod-i`,
  `Mod-u` — **kein** `Mod-c`/`Mod-x`. Kein `handleDOMEvents` in den
  `EditorView`-Props (Zeilen 89–99). Kein `contextmenu`-Listener im Component.
- `src/formats/shared/editor/Toolbar.tsx` (247 Zeilen): Buttons für Fett/Kursiv/
  Unterstrichen/Durchgestrichen, Textfarbe/Hervorhebung, Ausrichtung, Listen,
  Tabelle, Bild — **kein** Kopieren-Button.
- Repo-weite Suche (`grep -rn "clipboard|Clipboard|navigator\.clipboard|
  handleDOMEvents|transformCopied|transformPasted|handlePaste|onCopy"` über
  `src/`) → **0 Treffer**. Suche nach `contextmenu` über `src/` → **0 Treffer**
  (die einzigen `preventDefault()`-Aufrufe liegen in `Toolbar.tsx` für
  Maus-Mousedown-Events auf Buttons und in `useBeforeUnloadWarning.ts` für
  `beforeunload` — beide ohne Zwischenablage-Bezug).
- `tests/e2e/`: nur `docx.spec.ts`, `odt.spec.ts`, `lifecycle.spec.ts`,
  `selection-regression.spec.ts` — keine Clipboard-Datei. Bestätigt.
- Kein SVG-Icon im gesamten Projekt (`grep -rn "<svg|viewBox" src/` → 0
  Treffer); alle Toolbar-Symbole sind Unicode/Emoji, bereits als offener Punkt in
  `FEATURE-SPEC-DOCX-ODT.md:355,360,440–442` vermerkt. Relevant für Abschnitt 2.

### 0.2 Zwei tatsächliche, im Anforderungsdokument nicht benannte Codefehler

Das geht über „ungetestet“ hinaus — nachweisbares Fehlverhalten der aktuellen
Bibliotheks-Voreinstellung, mit der echten `wordSchema` reproduziert und danach
wieder entfernt (Wegwerf-Testdateien, nicht Teil des Repos):

**Befund A — `hard_break` erzeugt in `text/plain` keinen Zeilenumbruch, sondern
gar nichts.** Datei: `src/formats/shared/schema.ts:35–43`.

ProseMirrors Klartext-Extraktion (`Fragment.textBetween`,
`node_modules/prosemirror-model/src/fragment.ts:54–68`) behandelt einen
Leaf-Inline-Node ohne eigenes `leafText` als leeren String:
```
leafText ? … : node.type.spec.leafText ? node.type.spec.leafText(node) : ""
```
`hard_break` ist `isLeaf`, definiert aber kein `leafText`. Reproduziert mit der
echten `wordSchema` (Paragraph „Zeile1“ + `hard_break` + „Zeile2“):
```
doc.textBetween(0, size, '\n\n') === "Zeile1Zeile2"
```
→ Der Zeilenumbruch verschwindet **spurlos** beim Kopieren als `text/plain`; die
zwei Zeilen verschmelzen zu einem Wort. Verletzt `kopieren-req.md` Abschnitt 2.2,
Zeile „Zeilenumbruch (`hard_break`) vs. Absatzumbruch … kein Zusammenfallen zu
einem einzigen Leerzeichen“ — hier fällt es nicht mal zu einem Leerzeichen
zusammen, sondern verschwindet ganz (schlimmer als im Anforderungsdokument
befürchtet). `text/html` ist **nicht** betroffen (`toDOM` liefert bereits
korrekt `['br']`).

**Befund B — kein `clipboardTextSerializer` gesetzt: Tabellen/Listen im
Klartext nicht von einer Kette blanker Absätze zu unterscheiden.** Ohne eigene
`clipboardTextSerializer`-Prop fällt ProseMirror auf
`slice.content.textBetween(0, slice.content.size, "\n\n")` zurück
(`node_modules/prosemirror-view/src/clipboard.ts:36–37`). Reproduziert mit der
echten `wordSchema`:
```
Tabelle 2×2 (A1,B1 / A2,B2): "A1\n\nB1\n\nA2\n\nB2"
Liste (Eins/Zwei/Drei):      "Eins\n\nZwei\n\nDrei"
```
Beides ist als Klartext **nicht** von einer Folge unabhängiger Absätze zu
unterscheiden — Zeilen/Spalten einer Tabelle fallen zusammen, eine Liste verliert
jedes Aufzählungsmerkmal. Verletzt `kopieren-req.md` Abschnitt 6, Zeile 6:
„insbesondere für Tabellen/Listen (sinnvolle Klartext-Repräsentation, keine
kaputten Steuerzeichen)“.

### 0.3 Widerlegte Vermutung (Transparenz-Hinweis)

Vermutung: `image`-Knoten (block, leaf, ohne `leafText`) könnten analog zu Befund A
dazu führen, dass der Absatz-Separator zwischen einem Absatz vor und einem Absatz
nach einem Bild verschluckt wird (`"Absatz A" + Bild + "Absatz B"` → befürchtet
`"Absatz AAbsatz B"`). **Per Testlauf widerlegt:** `Fragment.textBetween` (Zeile
62 der Quelldatei) prüft die Bedingung für den Block-Separator bei jedem
**folgenden** Textblock neu (`node.isBlock && (… || node.isTextblock)`), nicht
kumulativ über das dazwischenliegende Bild hinweg — ein Bild dazwischen
unterdrückt die Separator-Einfügung vor dem nächsten Absatz nicht. Reproduziert:
```
doc = [paragraph("Absatz A"), image, paragraph("Absatz B")]
doc.textBetween(0, size, '\n\n') === "Absatz A\n\nAbsatz B"   // korrekt, kein Bug
```
Kein Fix an `image` nötig. Dieser Abschnitt dient ausschließlich dazu, eine
plausibel klingende, aber falsche Fehlerhypothese nicht unverifiziert stehen zu
lassen.

### 0.4 Cross-Feature-Blocker (nicht Teil von „Kopieren“, aber Voraussetzung für Abschnitt 4 der Anforderung)

**Datei:** `src/app/DocumentWorkspace.tsx`, Funktion `handleExport` (Zeilen 17–29).

```ts
async function handleExport() {
  …
  const blob = await module.exportFile(document.content, document.fileName)
  …
}
```

`module` ist beim Öffnen/Erstellen fest gebunden (`src/App.tsx` löst
`activeModule` einmalig über `findModuleById` auf) und ändert sich während der
Sitzung nicht — es gibt **keine** UI, um „Exportieren als …“ mit einem anderen
Format als dem Ursprungsformat auszulösen. Der Datenmodell-Layer wäre dafür
bereits bereit: `docxModule`/`odtModule` exportieren beide dieselbe
`WordDocumentContent`-Form (`src/formats/shared/documentModel.ts`), `writeDocx`/
`writeOdt` könnten also denselben `document.content` verarbeiten.

**Warum das „Kopieren“ betrifft:** `kopieren-req.md` Abschnitt 4, Testfälle 4/5
verlangen ausdrücklich „Datei A war DOCX, … als ODT exportieren, reimportieren“
bzw. umgekehrt. Ohne Format-Wahl beim Export ist das **nicht durchführbar** —
weder manuell noch automatisiert. Dieser Blocker gehört inhaltlich zum bereits in
`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 1.3 geforderten „Export unabhängig vom
Ursprungsformat“ und liegt außerhalb der Eigentümerschaft „Kopieren“ — wird hier
nur gemeldet und in der Testmatrix (Abschnitt 6.3) als „blockiert“ geführt, statt
die Lücke stillschweigend zu übergehen.

### 0.5 Weitere bestätigte Rahmenbedingungen (kein Fix, nur Dokumentation)

- **Kein In-App-Weg, einen `hard_break` zu erzeugen:** `hard_break` wird von
  DOCX-/ODT-Reader korrekt erzeugt (`src/formats/docx/reader.ts` mappt
  `kind==='break'` auf `{type:'hard_break'}`; `src/formats/odt/reader.ts:98–109`
  mappt `text:line-break` ebenso) und von beiden Writern korrekt zurückgeschrieben
  (`src/formats/docx/writer.ts:58-60` → `<w:br/>`; `src/formats/odt/writer.ts:50`
  → `<text:line-break/>`). Es fehlt aber jede Tastatur-/Toolbar-Möglichkeit, im
  laufenden Editor selbst einen `hard_break` einzufügen — kein `Shift-Enter` in
  `WordEditor.tsx`, `prosemirror-commands`s `baseKeymap` bindet ebenfalls keins.
  Relevant für Testbarkeit von Abschnitt 2.2 (Kopieren-Testfall für
  Zeilenumbrüche muss sonst über einen Datei-Import-Umweg gehen). Siehe
  Abschnitt 1.4 für die Entscheidung.
- **Tab-Zeichen (Abschnitt 2.2, letzte Zeile) haben aktuell kein
  Schema-Äquivalent:** kein `tab`-Node, keine Sonderbehandlung von `\t` in
  `text`-Knoten. `src/formats/odt/writer.ts:39` würde ein `\t` zwar bereits in
  `<text:tab/>` konvertieren, aber `src/formats/docx/writer.ts`s `encodeRunText`
  tut das nicht, und **keiner der beiden Reader** erkennt `<w:tab/>`/`<text:tab/>`
  beim Import (verifiziert per Grep, keine Treffer). Da es zudem keine
  Tastatureingabe gibt, die aktuell ein `\t`-Zeichen in einen Textknoten
  einfügt (Tab wird von `prosemirror-tables`s `tableEditing()` für
  Zellnavigation abgefangen bzw. verlässt außerhalb einer Tabelle das
  `contenteditable`), ist der entsprechende Testfall aus `kopieren-req.md`
  Abschnitt 2.2 aktuell **nicht sinnvoll ausführbar** und in der Testmatrix als
  „N/A — Tab-Stopp-Feature noch nicht implementiert“ zu kennzeichnen, nicht
  stillschweigend zu überspringen.
- **Kopf-/Fußzeile:** `WordEditor.tsx` rendert ausschließlich
  `doc.content.body` (Zeile 65: `wordSchema.nodeFromJSON(doc.content.body)`) —
  `header`/`footer` existieren im Datenmodell (`documentModel.ts`), haben aber
  keine eigene Editor-UI. Grenzfall 14 aus `kopieren-req.md` Abschnitt 5 bleibt
  deshalb wie dort selbst vermerkt zurückgestellt, bis diese UI existiert.
- **Kein Merge/Split-Befehl für Tabellenzellen:** `Toolbar.tsx` hat nur
  „Tabelle einfügen“ (`insertTable(2,2)`, `commands.ts:76–86`). Eine Zelle mit
  `colspan`/`rowspan` > 1 kann daher für Tests nicht über echte
  Toolbar-Bedienung erzeugt werden, nur über Fixture-Import (wie in
  `docx.spec.ts`/`odt.spec.ts` bereits für andere Testfälle üblich).
- **Keine `::selection`-Regel** in `src/index.css` oder anderswo
  (`grep -rn "::selection" src/` → 0 Treffer) — Browser-Standardauswahl bleibt
  unangetastet, nichts zu verifizieren, nur zur Vollständigkeit erwähnt.
- **Bildgröße unbegrenzt:** `handleImagePick` in `Toolbar.tsx:97–108` liest
  jede Bilddatei per `FileReader.readAsDataURL` ohne Größenprüfung ein. Kein
  neuer Kopieren-Bug, aber ein Performance-Risiko für Grenzfall 7
  (`kopieren-req.md` Abschnitt 5) — falls ein E2E-Test mit großem Testbild
  UI-Einfrieren zeigt, liegt die Ursache im Bild-Insert-Pfad, nicht im
  Copy-Handler.

---

## 1. Architekturentscheidung (bindend für die Umsetzung)

1. **Kein eigener `navigator.clipboard`-Zugriff**, an keiner Stelle —
   `kopieren-req.md` Abschnitt 1, Zeile 71 legt das explizit als
   Nicht-Soll-Verhalten fest.
2. Alles läuft über das **native `copy`-DOM-Event** plus explizit gesetzte
   `EditorProps` (`clipboardTextSerializer`), statt sich weiter stillschweigend
   auf einen unbenannten Bibliotheks-Default zu verlassen. Was nachweislich
   bereits richtig ist, bleibt unverändert (Abschnitt 8 — kein
   Over-Engineering).
3. **Kein Toolbar-Button für Kopieren** (siehe Entscheidung 1.4 unten) — dieser
   Plan ändert `Toolbar.tsx` **nicht**.
4. Kopieren erzeugt **keine** Transaktion/keinen Undo-Eintrag und verändert
   **nie** `view.state.selection` — das ist beim reinen `copy`-Pfad (im
   Unterschied zu `cut`) durch ProseMirrors eigenen Handler strukturell
   garantiert (siehe Abschnitt 8), nicht nur zufällig korrekt, und darf durch
   keine Änderung in diesem Ticket angetastet werden.

---

## 2. Entscheidungen zu den offenen Fragen aus `kopieren-req.md` Abschnitt 8

Zum wörtlichen Nachtragen in `kopieren-req.md` vorgesehen (Abschnitt 10).

### 2.1 Toolbar-Button „Kopieren“?

**Entscheidung: Nein.** Begründung, aus dem bestehenden Code abgeleitet
(Konsistenzargument, kein Geschmacksurteil):

- `Toolbar.tsx` hat **auch für Rückgängig/Wiederholen keinen Button**
  (`Mod-z`/`Mod-y` sind nur in der Keymap gebunden, `WordEditor.tsx:72–74`) —
  die Toolbar ist im Ist-Zustand bewusst auf Formatierungsbefehle beschränkt,
  die es *ohne* Tastenkombination/Kontextmenü gar nicht gäbe (Fett, Ausrichtung,
  Farbe, Liste, Tabelle, Bild). Kopieren hat wie Undo/Redo einen vollständigen
  nativen Weg und würde diese Konvention brechen, ohne einen neuen
  Fähigkeitsgewinn zu bringen.
- Ein Button könnte ohnehin nur `document.execCommand('copy')` auslösen
  (kein `navigator.clipboard`, siehe Architekturentscheidung 1) — funktional
  identisch zu Strg+C, zusätzlicher Wartungsaufwand (Fokus-Handling,
  Disabled-Zustand bei leerer Selektion, i18n) ohne Mehrwert.
- Punkt 5 der Anforderungstabelle (Ribbon-Menüpunkt) entfällt ebenso: Diese App
  hat kein Ribbon-Menüsystem (flache Toolbar), also keine Ribbon-Ebene für so
  einen Eintrag.

Konsequenz: **keine Änderung an `Toolbar.tsx`** für Kopieren. Der in
`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20 dokumentierte Icon-Fehler
(Unicode/Emoji statt SVG) bleibt unberührt, weil kein neuer Button entsteht, der
ihn wiederholen könnte.

### 2.2 Ist Safari/WebKit Teil der Browsermatrix?

**Entscheidung: Ja — und zusätzlich Firefox, mit unterschiedlicher Testtechnik
je Engine.** Befund in `playwright.config.ts:19–23`:

```ts
projects: [
  { name: 'Desktop Chrome', use: { ...devices['Desktop Chrome'] } },
  { name: 'Mobile', use: { ...devices['Pixel 7'] } },
  { name: 'Tablet', use: { ...devices['iPad Mini'] } },
]
```

Geprüft (`deviceDescriptorsSource.json` aus `playwright-core`):
`Desktop Chrome` → `chromium`, `Pixel 7` → `chromium`, **`iPad Mini` →
`webkit`**. Das bestehende `Tablet`-Projekt läuft also schon auf der
WebKit-Engine, aber mit Touch-/Mobile-Emulation, nicht als Desktop-Verhalten
für Strg/Cmd+C. Firefox ist aktuell **gar nicht** vertreten.

Ergänzung für dieses Ticket (Abschnitt 5.6):
- Neues Projekt `Desktop Safari` (`devices['Desktop Safari']`, WebKit,
  Desktop-Viewport statt Touch).
- Neues Projekt `Desktop Firefox` (`devices['Desktop Firefox']`).
- **Wichtige technische Einschränkung, die die Testtechnik bestimmt (nicht die
  Abdeckung einschränkt):** Playwrights `context.grantPermissions(
  ['clipboard-read','clipboard-write'])` funktioniert nur für Chromium (CDP-
  basiert). Das bedeutet **nicht**, dass Firefox/WebKit ungetestet bleiben
  müssen — ein In-Page-Tastatur-Rundlauf (auswählen → `ControlOrMeta+c` →
  andernorts klicken → `ControlOrMeta+v` → DOM-Inhalt prüfen) nutzt echte
  Tastatur-Events, die der Browser über die System-Zwischenablage abwickelt,
  **ganz ohne** Permissions-API — das funktioniert engineübergreifend
  identisch. Nur die *tiefere* MIME-Rohinhalts-Prüfung
  (`navigator.clipboard.read()` aus `page.evaluate`) bleibt auf `Desktop
  Chrome` beschränkt. Diese Unterscheidung wird in `tests/e2e/clipboard.spec.ts`
  konkret umgesetzt (Abschnitt 5.2).
- Edge wird **nicht** separat aufgenommen (Chromium-Engine, durch
  `Desktop Chrome` strukturell abgedeckt) — explizit dokumentiert, keine
  stille Lücke.

### 2.3 Verhalten bei partieller Zellauswahl vs. ganzen Zellen?

**Entscheidung: Bibliotheks-Standardverhalten von `prosemirror-tables` wird als
Soll übernommen, nicht neu implementiert.** `tableEditing()` ist bereits in
`WordEditor.tsx:82` registriert:

- Textauswahl **innerhalb einer einzelnen Zelle** (Klick+Ziehen ohne
  Zellgrenze zu verlassen) bleibt eine normale `TextSelection` → Kopieren
  liefert reinen/formatierten Inline-Inhalt, **keine** `<table>`-Hülle
  (entspricht Word/LibreOffice).
- Ziehen **über mindestens zwei ganze Zellen** wird von `prosemirror-tables`
  automatisch zu einer `CellSelection` hochgestuft, deren `content()` bereits
  eine korrekt geschachtelte `table`/`table_row`/`table_cell`-`Slice` inkl.
  `colspan`/`rowspan` erzeugt (Standardverhalten des Pakets, keine
  Projekt-Anpassung), die durch den normalen ProseMirror-Clipboard-Pfad läuft.

**Kein neuer Code nötig** — nur Tests, die beide Fälle unterscheiden
(Abschnitt 5.2, Testfälle 8/9).

### 2.4 `insertHardBreak()`/`Shift-Enter` ergänzen? (zusätzliche, hier neu entschiedene Frage)

**Entscheidung: Ja, als kleine, klar begründete Ergänzung.** Ohne einen
In-App-Erzeugungsweg für `hard_break` (Befund 0.5) lässt sich der in
`kopieren-req.md` Abschnitt 2.2 geforderte Testfall „Zeilenumbruch kopieren“
nicht als echte Tastatureingabe nachstellen, nur über einen Datei-Import-Umweg.
Da dieser Fix minimal, konfliktfrei (siehe Kollisionsprüfung Abschnitt 3.3) und
eine reine Testbarkeits-Voraussetzung ist, wird er hier mit aufgenommen statt an
einen anderen Backlog-Eintrag verwiesen. Sollte er in der Freigabe abgelehnt
werden, ist der Fixture-Import-Weg (analog `docx.spec.ts`) der dokumentierte
Fallback (Abschnitt 6.4).

---

## 3. Dateigenaue Änderungen

### 3.1 `src/formats/shared/schema.ts` — ändern

Root-cause-Fix für Befund A. Wirkt nicht nur auf die Zwischenablage, sondern auf
jede ProseMirror-interne Textextraktion (`Node.textContent`/`textBetween`),
sollte also auch einer künftigen Wortzahl-/Suchfunktion zugutekommen.

```ts
// vorher (Zeilen 35–43):
hard_break: {
  group: 'inline',
  inline: true,
  selectable: false,
  parseDOM: [{ tag: 'br' }],
  toDOM() {
    return ['br']
  },
},

// nachher:
hard_break: {
  group: 'inline',
  inline: true,
  selectable: false,
  // Ohne dies liefert jede ProseMirror-Textextraktion (Node.textContent,
  // textBetween, und damit auch die Klartext-Zwischenablage) für einen
  // hard_break den leeren String statt eines Zeilenumbruchs — zwei durch
  // Umbruch getrennte Zeilen verschmelzen sonst kommentarlos zu einem Wort.
  // Siehe specs/kopieren-code.md Abschnitt 0.2, Befund A.
  leafText: () => '\n',
  parseDOM: [{ tag: 'br' }],
  toDOM() {
    return ['br']
  },
},
```

Keine Änderung an `image` (siehe widerlegte Vermutung, Abschnitt 0.3) und keine
weiteren Schema-Änderungen — alle anderen Marks/Nodes haben bereits korrekte
`toDOM`/`parseDOM`-Paare, die ProseMirrors Standard-`DOMSerializer` für
`text/html` nutzt (siehe Abschnitt 8).

### 3.2 `src/formats/shared/editor/clipboard.ts` — **neu anlegen**

Behebt Befund B und kapselt alles Copy-spezifische an einem Ort statt es in
`WordEditor.tsx` zu verstreuen. Ein Export: `clipboardTextSerializer`. Der
Algorithmus wurde gegen die echte `wordSchema` verifiziert (Wegwerf-Testlauf,
danach gelöscht) und liefert:

```
Tabelle 2×2:        "A1\tB1\nA2\tB2"           (statt "A1\n\nB1\n\nA2\n\nB2")
Bullet-Liste (3):   "- Eins\n- Zwei\n- Drei"    (statt "Eins\n\nZwei\n\nDrei")
Nummerierte Liste:  "1. Erstens\n2. Zweitens"
hard_break:         "Zeile1\nZeile2"            (statt "Zeile1Zeile2", nach Fix 3.1)
Absatzfolge:        "Titel\n\nText.\n\n- Eins\n- Zwei"  (Absatzgrenzen weiterhin "\n\n")
```

```ts
import type { Slice, Node as PMNode } from 'prosemirror-model'
import type { EditorView } from 'prosemirror-view'

/**
 * Baut eine sinnvolle Klartext-Repräsentation für die Zwischenablage
 * (`text/plain`). ProseMirrors Standardverhalten
 * (`slice.content.textBetween(0, size, "\n\n")`) trennt jeden Absatz mit
 * einer Leerzeile, kennt aber keine Tabellen-/Listenstruktur — eine
 * 2×2-Tabelle und eine dreizeilige Liste werden dadurch zu ununterscheidbaren
 * Absatzketten. Siehe specs/kopieren-code.md Abschnitt 0.2, Befund B.
 *
 * Bewusst KEIN `navigator.clipboard`-Zugriff hier oder anderswo in diesem
 * Modul — siehe kopieren-req.md Abschnitt 1, Zeile 71.
 */
export function clipboardTextSerializer(slice: Slice, _view: EditorView): string {
  const parts: string[] = []
  slice.content.forEach((node) => parts.push(nodeToPlainText(node)))
  return parts.join('\n\n')
}

function nodeToPlainText(node: PMNode): string {
  if (node.isText) return node.text ?? ''
  if (node.isLeaf) {
    const leafText = node.type.spec.leafText
    return leafText ? leafText(node) : ''
  }
  switch (node.type.name) {
    case 'table':
      return tableToPlainText(node)
    case 'bullet_list':
    case 'ordered_list':
      return listToPlainText(node)
    default:
      // paragraph, heading, list_item-/table_cell-Inhalt, oder unbekannte
      // zukünftige Blocktypen: ProseMirrors eigene Logik reicht hier aus,
      // sobald hard_break.leafText gesetzt ist (siehe schema.ts, Fix 3.1).
      return node.textBetween(0, node.content.size, '\n')
  }
}

function tableToPlainText(table: PMNode): string {
  const rows: string[] = []
  table.forEach((row) => {
    const cells: string[] = []
    row.forEach((cell) => cells.push(nodeToPlainText(cell).replace(/\n/g, ' ')))
    rows.push(cells.join('\t'))
  })
  return rows.join('\n')
}

function listToPlainText(list: PMNode, depth = 0): string {
  const lines: string[] = []
  const ordered = list.type.name === 'ordered_list'
  let index = (list.attrs.start as number | undefined) ?? 1
  list.forEach((item) => {
    const marker = ordered ? `${index}. ` : '- '
    const indent = '  '.repeat(depth)
    const itemLines: string[] = []
    item.forEach((child) => {
      if (child.type.name === 'bullet_list' || child.type.name === 'ordered_list') {
        itemLines.push(listToPlainText(child, depth + 1))
      } else {
        itemLines.push(nodeToPlainText(child))
      }
    })
    lines.push(indent + marker + itemLines.join('\n' + indent + '  '))
    index += 1
  })
  return lines.join('\n')
}
```

Kein `handleDOMEvents.copy`, kein `transformCopied`, kein `clipboardSerializer`
in diesem Modul oder anderswo — alle drei sind geprüft nicht nötig (Abschnitt 8).
Ein zukünftiger Bedarf (z. B. Kommentare/Fußnoten kopierbar machen, Grenzfall 14)
hätte hier seinen vorgesehenen Erweiterungspunkt.

### 3.3 `src/formats/shared/editor/commands.ts` — ändern

Neue Funktion für Entscheidung 2.4, Signatur konsistent mit den vorhandenen
Commands (`Command`-Typ, gleiches Muster wie `insertImage`/`insertTable`,
Zeilen 66–86):

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

### 3.4 `src/formats/shared/editor/WordEditor.tsx` — ändern

Drei kleine, unabhängige Änderungen:

1. Import ergänzen:
```ts
import { clipboardTextSerializer } from './clipboard'
import { insertHardBreak } from './commands'
```

2. `clipboardTextSerializer` als `EditorView`-Prop setzen (Zeilen 89–99):
```ts
const view = new EditorView(containerRef.current, {
  state,
  clipboardTextSerializer,
  dispatchTransaction(tr) {
    ...
  },
})
```

3. Keymap um `Shift-Enter` ergänzen und Regressions-Kommentar hinzufügen
   (Zeilen 71–79):
```ts
keymap({
  // Mod-c/Mod-x/Mod-v bewusst NICHT gebunden: Kopieren/Ausschneiden/Einfügen
  // laufen ausschließlich über ProseMirrors nativen Clipboard-Default-Handler
  // (prosemirror-view, handlers.copy/cut/paste). Jede neue Bindung hier muss
  // geprüft werden, dass sie diese Kombinationen nicht durch eine zu weit
  // gefasste Regel verschluckt. Siehe specs/kopieren-req.md Abschnitt 3,
  // specs/kopieren-code.md Abschnitt 8.
  'Mod-z': undo,
  'Mod-y': redo,
  'Mod-Shift-z': redo,
  Enter: splitListItem(wordSchema.nodes.list_item),
  'Shift-Enter': insertHardBreak(),
  'Mod-b': toggleMark(wordSchema.marks.strong),
  'Mod-i': toggleMark(wordSchema.marks.em),
  'Mod-u': toggleMark(wordSchema.marks.underline),
}),
```

Kollisionsprüfung: `Shift-Enter` ≠ `Mod-c`/`Ctrl-c` in jeder Keymap-Notation,
keine Überschneidung möglich; per Grep bestätigt, dass `Shift-Enter` in keiner
`baseKeymap`-Variante (`prosemirror-commands`) und in keiner eigenen Bindung
bereits vergeben ist.

Explizit **keine** Änderung: `handleDOMEvents`, `transformCopied`, ein eigener
`contextmenu`-Handler — alle drei bleiben absichtlich ungesetzt (Abschnitt 8).

### 3.5 `src/formats/shared/editor/Toolbar.tsx` — keine Änderung

Siehe Entscheidung 2.1. Explizit hier aufgeführt, damit die Abwesenheit einer
Änderung nicht als Lücke im Plan missverstanden wird.

### 3.6 `src/formats/docx/*`, `src/formats/odt/*` — keine Änderung

Kopieren+Einfügen **innerhalb derselben Editor-Instanz** läuft vollständig über
ProseMirrors Slice-Mechanismus (Node-JSON desselben Schemas, das
`writeDocx`/`writeOdt`/`readDocx`/`readOdt` ohnehin schon für regulär getippten
Inhalt konsumieren). Ein eingefügter Absatz ist für Writer/Reader nicht von
einem getippten Absatz zu unterscheiden — konkret geprüft:

| Merkmal | DOCX | ODT | Bewertung |
|---|---|---|---|
| `hard_break` | `reader.ts` (`kind==='break'`→`hard_break`), `writer.ts:58–60` (`<w:br/>`) | `reader.ts:98–109` (`text:line-break`→`hard_break`), `writer.ts:50` (`<text:line-break/>`) | vollständig, kein Änderungsbedarf |
| `colspan`/`rowspan` | `writer.ts:130,154–164` (`w:gridSpan`,`w:vMerge`), `reader.ts:210–255` | analog (`table:number-columns-spanned` etc.) | vollständig, kein Änderungsbedarf |
| Bilder | `imageCollector.ts` verarbeitet jede `image`-Node mit `data:`-URL unabhängig von der Eingabemethode | analog | vollständig, kein Änderungsbedarf |
| Formatierungs-Marks | bereits vorhandene Reader/Writer-Pfade, unabhängig von Eingabemethode | analog | vollständig, kein Änderungsbedarf |

Das ist genau die in `kopieren-req.md` Abschnitt 4 geforderte Eigenschaft und sie
ist strukturell bereits erfüllt — **muss aber durch die Rundreise-Tests in
Abschnitt 5.3 nachgewiesen werden**, nicht durch neuen Produktionscode hier. Die
einzige indirekte Betroffenheit ist der Blocker aus Abschnitt 0.4 (fehlende
Format-Wahl beim Export) — der liegt nicht an Reader/Writer, sondern an der
fehlenden UI-Verdrahtung in `DocumentWorkspace.tsx`, und wird nicht in diesem
Ticket behoben (siehe Abschnitt 9).

**Cross-Feature-Risiko, nur dokumentiert, nicht hier zu fixen:**
`src/formats/docx/imageCollector.ts:19–20` und
`src/formats/odt/imageCollector.ts:18–19` werfen eine Exception, wenn
`image.src` keine `data:`-URL ist. Für reines *Kopieren* irrelevant (jedes
`image`-Node entsteht hier ausschließlich über `insertImage()`, das immer eine
`data:`-URL liefert, und Kopieren dupliziert nur bestehende Nodes). Relevant
wird es erst, wenn `einfuegen` (separates Backlog-Item) `<img src="https://…">`
aus einer externen Quelle einschleust — dann könnte ein späterer Export
abstürzen. Übergabe an `einfuegen`, siehe Abschnitt 9.

### 3.7 `playwright.config.ts` — ändern

```ts
projects: [
  { name: 'Desktop Chrome', use: { ...devices['Desktop Chrome'] } },
  { name: 'Mobile', use: { ...devices['Pixel 7'] } },
  { name: 'Tablet', use: { ...devices['iPad Mini'] } },
  {
    // WebKit-Desktop, gescoped auf die Clipboard-Tests — siehe Entscheidung 2.2.
    // Läuft nicht gegen die restliche Suite, um die Gesamtlaufzeit nicht zu
    // verdoppeln (docx/odt/lifecycle/selection-regression bleiben Chromium+Mobile+Tablet).
    name: 'Desktop Safari (Clipboard)',
    testMatch: /clipboard.*\.spec\.ts/,
    use: { ...devices['Desktop Safari'] },
  },
  {
    name: 'Desktop Firefox (Clipboard)',
    testMatch: /clipboard.*\.spec\.ts/,
    use: { ...devices['Desktop Firefox'] },
  },
],
```

---

## 4. ProseMirror-Schema/Commands — Zusammenfassung

- **Schema** (`src/formats/shared/schema.ts`): nur die eine `leafText`-Ergänzung
  aus 3.1. Keine neuen Nodes/Marks für Kopieren selbst — Hoch-/Tiefstellung,
  Schriftart/-größe, Links sind laut `kopieren-req.md` Abschnitt 2.2 explizit
  „sobald implementiert“ und aktuell nicht im Schema vorhanden (bestätigt: kein
  `sup`/`sub`/`fontFamily`/`fontSize`/`link`-Mark).
- **Commands** (`src/formats/shared/editor/commands.ts`): eine neue Funktion,
  `insertHardBreak()` (3.3) — für die Testbarkeits-Entscheidung 2.4, nicht für
  Kopieren selbst.
- **Neues Modul** `src/formats/shared/editor/clipboard.ts` (3.2): der
  eigentliche Kopieren-spezifische Code, ein einziger Export
  (`clipboardTextSerializer`), keine `Command`-Signatur (Kopieren erzeugt keine
  Transaktion).
- **Keymap** (`WordEditor.tsx`): eine neue Bindung (`Shift-Enter`), ein neuer
  Kommentar zur Absicherung von `Mod-c`/`Mod-x`/`Mod-v` (3.4). Kein neuer
  Plugin-Code für Copy selbst (kein `handleDOMEvents`, kein `transformCopied`,
  kein `clipboardSerializer`) — der Standard-`DOMSerializer.fromSchema(
  wordSchema)` reicht für `text/html`, weil er dieselben `toDOM`-Regeln nutzt
  wie das On-Screen-Rendering; ein Extra-Layer würde nur
  Divergenz-Risiko zwischen Bildschirmdarstellung und Zwischenablageninhalt
  schaffen.

---

## 5. Toolbar-Änderungen

**Keine** — siehe Entscheidung 2.1. `Toolbar.tsx` bleibt für dieses Ticket
unverändert. Sollte die Produktentscheidung in der Freigabe umgekehrt werden,
wäre der Ansatz: neuer Button analog zu `MarkButton`/`AlignButton`,
`onMouseDown={(e) => { e.preventDefault(); document.execCommand('copy') }}`
(nicht `navigator.clipboard`, siehe Architekturentscheidung 1),
`disabled={view.state.selection.empty}` (neue, spec-getriebene Ausnahme vom
„nie disabled“-Muster der bestehenden Buttons, siehe `kopieren-req.md`
Abschnitt 2.1), Textlabel „Kopieren“ ohne neues Emoji-Icon. Dieser Absatz ist
reine Handlungsoption, **nicht** Teil des aktuellen Plans.

---

## 6. Tests (dateigenau)

### 6.1 Unit: `src/formats/shared/editor/__tests__/clipboard.test.ts` — neu

Vitest, gleiche Struktur wie `pagination.test.ts` (globale `describe`/`it`).
Reine Node-Ebene, kein DOM/`EditorView` nötig:

- Tabelle 2×2 → exakt `"A1\tB1\nA2\tB2"`.
- Tabelle mit `colspan`/`rowspan` → Zellinhalt bleibt vollständig erhalten.
- Bullet-Liste (3 Einträge) → exakt `"- Eins\n- Zwei\n- Drei"`.
- Nummerierte Liste mit `start ≠ 1` → Nummerierung beginnt korrekt.
- Verschachtelte Liste → eingerückte Zeilen, kein Strukturverlust.
- Absatz mit `hard_break` → exakt `"Zeile1\nZeile2"` (Wortvergleich, kein
  Substring-Check — schließt sowohl das ursprüngliche `"Zeile1Zeile2"` als auch
  ein bloßes `"Zeile1 Zeile2"` als falsch aus).
- Mehrere Top-Level-Blöcke (Heading + Paragraph + Liste) → durch `"\n\n"`
  getrennt.
- Leerer Slice → leerer String, keine Exception.
- Regressionstest auf Schema-Ebene: `wordSchema.nodes.hard_break.spec.leafText`
  ist definiert und liefert `'\n'`.

### 6.2 E2E: `tests/e2e/clipboard.spec.ts` — neu

Playwright, Konventionen aus `odt.spec.ts`/`selection-regression.spec.ts`
übernehmen (`odtCard`/`docxCard`-Helper, `.ProseMirror`-Locator). Zwei
Techniken je nach Testfall und Browser (siehe Entscheidung 2.2):

```ts
test.beforeEach(async ({ context, browserName }) => {
  if (browserName === 'chromium') {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  }
  // Firefox/WebKit: kein grantPermissions-Support — dort ausschließlich über
  // den In-Page-Tastatur-Rundlauf verifizieren (siehe Entscheidung 2.2).
})
```

Testfälle (mit Rückverweis auf `kopieren-req.md`):

1. Strg+C bei Selektion → In-Page-Rundlauf liefert identischen Inhalt
   (Abschnitt 1, Testfall 1; Abschnitt 7, Zeile 1). Läuft auf allen drei
   Desktop-Projekten.
2. Strg+C ohne Selektion (nur Cursor) → vorheriger Zwischenablage-Inhalt bleibt
   unverändert (Abschnitt 5, Grenzfall 1): zuerst Text A kopieren, dann Cursor
   ohne Selektion platzieren, `ControlOrMeta+c` drücken, erneut einfügen →
   weiterhin Text A.
3. Kontextmenü-Regressionstest (Abschnitt 1, Testfall 4; Grenzfall 13):
   ```ts
   const prevented = await editor.evaluate((el) => {
     const ev = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
     el.dispatchEvent(ev)
     return ev.defaultPrevented
   })
   expect(prevented).toBe(false)
   ```
4. Fett + Kursiv + Farbe + Hervorhebung kombiniert kopieren → alle vier bleiben
   nach Einfügen erhalten (Abschnitt 2.2, Testfall 2).
5. Teilselektion mitten in einem fett gesetzten Wort → Formatgrenze bleibt
   exakt (Abschnitt 2.2, Testfall 3).
6. Überschrift + Standard-Absatz + Liste selektieren, kopieren, einfügen → alle
   drei Blocktypen bleiben unterscheidbar (Abschnitt 2.2, Testfall 4).
7. Ganze Zellen markieren (Drag über Zellgrenzen via `page.mouse.down/move/up`
   zwischen zwei `td`-Koordinaten, ein reiner Klick erzeugt nur
   `TextSelection`) kopieren → eingefügtes Ergebnis ist eine `<table>`-Struktur
   (Abschnitt 3, Testfall 2; Entscheidung 2.3).
8. Nur Text innerhalb einer Zelle markieren (keine Zellgrenze überschritten)
   kopieren → Ergebnis ist reiner Text, **keine** neue Tabelle (Gegenprobe zu
   Testfall 7, Entscheidung 2.3).
9. Bild allein markiert kopieren → nur Bild im Ergebnis, kein umgebender Text
   (Abschnitt 5, Grenzfall 6).
10. Undo-Neutralität: Kopieren, danach `ControlOrMeta+z` → Undo wirkt auf die
    letzte inhaltliche Änderung, nicht auf „Kopieren“ (Abschnitt 3, Testfall 3).
11. Selection-Sync-Interferenz: siehe 6.4 (Erweiterung von
    `selection-regression.spec.ts`, hier nur referenziert statt dupliziert).
12. Wiederholtes schnelles Kopieren wechselnder Selektionen → letzter
    Kopiervorgang gewinnt, kein Vermischen (Abschnitt 5, Grenzfall 12).
13. `text/plain`-Ziel: Tabelle/Liste kopieren, in ein verstecktes natives
    Test-`<textarea>` auf derselben Seite einfügen (Rundlauf ohne
    ProseMirror-Parsing) → Tab-/Zeilenstruktur wie in 6.1 spezifiziert
    (Abschnitt 6, Zeile 6).
14. Tablet-Viewport (`Tablet`-Projekt): Selektion über Touch-Events herstellen,
    `ControlOrMeta+c`/`v` → Rundlauf erfolgreich. **Dokumentierte
    Einschränkung:** Das native mobile Kontextmenü „Kopieren“ selbst ist über
    Playwright nicht automatisierbar (liegt außerhalb des DOM) — dieser
    Ersatznachweis deckt nur die Tastatur-/Zwischenablage-Mechanik auf
    Touch-Emulation ab, nicht das native Menü-Antippen. Muss so im
    Test-Kommentar stehen, nicht als vollständig erledigt ausgegeben werden
    (Abschnitt 1, Testfall 5 der Anforderung).
15. Fokus-Isolation: `ControlOrMeta+c` auslösen, während das versteckte
    `<input type="file">` fokussiert ist statt `.ProseMirror` → keine
    Konsolen-Exception (`page.on('pageerror', ...)`), Editor-Inhalt landet
    nicht unerwartet in der Zwischenablage (Abschnitt 3, Testfall 4).

### 6.3 E2E-Rundreise: `tests/e2e/clipboard-roundtrip.spec.ts` — neu

Struktur analog zu den Rundreise-Tests in `docx.spec.ts`/`odt.spec.ts`
(Dokument erstellen/hochladen → editieren → exportieren → JSZip öffnen → XML
prüfen → ggf. re-importieren).

1. Neues Dokument → Überschrift + formatierter Absatz + Liste + Tabelle + Bild
   → alles markieren (`ControlOrMeta+a`) → kopieren → in ein zweites, neu
   erstelltes leeres Dokument einfügen → als DOCX exportieren → mit `JSZip`
   prüfen, dass Überschrift, Fett/Farbe, Liste (`<w:numPr>`), Tabelle
   (`<w:tbl>`) und Bild (`<w:drawing>`) vorhanden sind (Abschnitt 4,
   Testfall 3).
2. Dasselbe mit Export als ODT (`<text:list>`/`<table:table>`/`<draw:frame>`)
   (Abschnitt 4, Testfall 4 des Fließtexts, dort als Punkt 3 nummeriert).
3. Cross-Format DOCX→ODT und 4. ODT→DOCX (Abschnitt 4, Testfälle 4/5 der
   Anforderung) — **blockiert** durch den Cross-Feature-Blocker aus
   Abschnitt 0.4/9: als `test.fixme('blockiert durch fehlende
   Cross-Format-Export-UI, siehe kopieren-code.md Abschnitt 0.4')` anlegen, bis
   der Blocker separat gelöst ist, statt den Testfall stillschweigend
   auszulassen.
5. Doppelte Cross-Format-Rundreise (Abschnitt 4, Testfall 5 der Anforderung) —
   ebenfalls `test.fixme(...)` mit demselben Verweis, aus demselben Grund.
6. **Vor Testimplementierung zu klärender Punkt** (Abschnitt 4, Testfall 6 der
   Anforderung): Erlaubt die App mehrere gleichzeitig geöffnete Dokumente?
   `src/App.tsx`/`src/app/FormatPicker.tsx` zeigen keine Multi-Dokument-Ansicht
   — die App rendert pro Zeitpunkt ein aktives Dokument
   (`DocumentWorkspace`/`FormatPicker` schließen sich gegenseitig aus). Der
   Testfall ist deshalb so umzusetzen: Dokument A öffnen, markieren, kopieren,
   zur Formatauswahl zurückkehren (bestehende Navigation, `handleClose` in
   `DocumentWorkspace.tsx:31–36`), Dokument B neu erstellen, einfügen → Inhalt
   kommt an, weil die Zwischenablage System-, nicht App-seitig ist. Dieses
   Ergebnis ist nach Prüfung in `kopieren-req.md` nachzutragen (Abschnitt 10).

### 6.4 Ergänzung bestehender Dateien

- `tests/e2e/selection-regression.spec.ts`: neuen Testblock (vierter `test(...)`
  im bestehenden `describe`) hinzufügen, der den vorhandenen Regressionstest
  (Zeilen 14–32) um einen Kopiervorgang zwischen „Fett“ und „Klick zur
  Neupositionierung“ erweitert — exakt der in `kopieren-req.md` Abschnitt 3,
  Testfall 1 beschriebene Ablauf. Bewusst in dieser Datei (nicht nur in
  `clipboard.spec.ts`), weil sie bereits der etablierte Ort für
  Selection-Sync-Regressionen ist.
- `tests/e2e/docx.spec.ts`, `tests/e2e/odt.spec.ts`: keine Änderung — die
  Rundreise-Fälle leben bewusst in der neuen, eigenen Datei (6.3), analog zur
  bestehenden Trennung durch `selection-regression.spec.ts`.
- **Neu:** `src/formats/shared/editor/__tests__/clipboard-privacy.test.ts` —
  statischer Vitest, der den Quelltext unter `src/` rekursiv einliest und
  sicherstellt, dass `navigator.clipboard` in keiner `.ts`/`.tsx`-Datei
  vorkommt (mit expliziter, kommentierter Ausnahmeliste, falls je ein
  legitimer Treffer entstehen sollte — aktuell keiner nötig). Ergänzt den
  manuellen Code-Review-Punkt aus Abschnitt 7 um eine automatisierte,
  dauerhafte Absicherung.

---

## 7. Datenschutz (Code + Review)

`kopieren-req.md` Abschnitt 5, Grenzfall 15 verlangt einen expliziten
Code-Review-Punkt. Aktuell existiert **kein** `navigator.clipboard`-Aufruf im
Projekt (Abschnitt 0.1), und dieser Plan führt bewusst keinen ein
(Architekturentscheidung 1) — der Zustand ist bereits konform. Zusätzlich
abgesichert durch `clipboard-privacy.test.ts` (6.4) und folgenden manuellen
Review-Punkt bei jedem PR, der `clipboard.ts` berührt: kein
`console.log`/`fetch`/Analytics-Aufruf mit Zwischenablagen-Inhalt, kein
`localStorage`/`IndexedDB`-Zugriff (README-Prinzip, `README.md:11–12`).

---

## 8. Bereits korrekt (kein Code nötig, nur Regressionstest)

Durch Lesen des installierten `prosemirror-view`/`prosemirror-model`/
`prosemirror-tables`-Quelltexts (nicht nur der öffentlichen Doku) verifiziert:

| Verhalten | Beleg | Für Abschnitt |
|---|---|---|
| Leere Selektion → keine Aktion | `prosemirror-view/src/input.ts:652`: `if (sel.empty) return` | Abschnitt 5, Grenzfall 1 |
| Kopieren erzeugt keinen Undo-Eintrag | `input.ts:649–666`: `view.dispatch(...)` wird nur im `cut`-Zweig (Zeile 665) aufgerufen, nie bei reinem `copy` | Abschnitt 3, Testfall 3 |
| Selektion bleibt nach Kopieren unverändert | dieselbe Stelle — kein `setSelection`/`dispatch` im Copy-Pfad | Abschnitt 3, Testfall 1 |
| Kopieren = Ausschneiden minus Löschen, gleicher Serialisierungspfad | `handlers.copy = editHandlers.cut = (view, _event) => { … }` — identische Funktion, nur `cut = event.type === 'cut'` unterscheidet das Verhalten danach | bestätigt `kopieren-req.md` Zeile 17f. wörtlich |
| Multi-MIME (`text/html` + `text/plain`) | `data.setData("text/html", dom.innerHTML); data.setData("text/plain", text)` (`input.ts:660–661`) | Abschnitt 2.1 |
| Kontextmenü nicht unterdrückt | Repo-weiter Grep: kein `contextmenu`-Handler, keine `preventDefault()` außerhalb von `Toolbar.tsx`/`useBeforeUnloadWarning.ts` | Abschnitt 1, Testfall 4; Grenzfall 13 |
| `Mod-c`/`Mod-x` nicht belegt | `WordEditor.tsx:71–79`, keymap-Objekt geprüft | Abschnitt 3, letzter Punkt |
| Tabellen-Zellauswahl → `<table>`-Struktur beim Kopieren | `prosemirror-tables`s `CellSelection.content()` (Standardverhalten des Pakets) + `tableNodes({ ... cellAttributes: {} })` in `schema.ts:106` liefert bereits korrektes `toDOM` mit `colspan`/`rowspan` | Abschnitt 3, Testfall 2 |
| `text/html` für alle Marks/Nodes korrekt (fett/kursiv/unterstrichen/durchgestrichen/Farbe/Hervorhebung/Überschriften 1–6/Listen/Bild/Tabelle) | `schema.ts`-`toDOM`-Definitionen sind vollständig und werden von ProseMirrors Standard-`DOMSerializer` genutzt (`clipboard.ts:17–19` im installierten Paket) | Abschnitt 2.2, gesamte Tabelle |
| Fokus-Gating | ProseMirrors `copy`-Handler ist ausschließlich auf `view.dom` registriert, reagiert nicht auf Events außerhalb des Editor-DOM | Abschnitt 3, Testfall 4 |
| Absatz-Separator übersteht ein dazwischenliegendes Bild in `text/plain` | siehe widerlegte Vermutung, Abschnitt 0.3 | — |

Diese Zeilen werden **nicht** durch neuen Produktionscode „repariert“ — ein
zusätzlicher `handleDOMEvents.copy` würde nachweislich bereits korrektes
Bibliotheksverhalten nur duplizieren und ein neues Fehlerrisiko schaffen.

---

## 9. Übergabe an andere Backlog-Einträge (nicht Teil dieses Plans, nur dokumentiert)

- **Cross-Format-Export-UI fehlt** (Abschnitt 0.4): `DocumentWorkspace.tsx`
  bräuchte einen zweiten Export-Pfad (`handleExportAs(targetModuleId)`), der
  `findModuleById(targetModuleId).exportFile(document.content, …)` aufruft.
  Gehört zu `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 1.3, nicht zu „Kopieren“ —
  wird hier nur gemeldet, damit Testfälle 4/5 aus Abschnitt 4 nicht
  stillschweigend unausführbar bleiben (siehe `test.fixme` in Abschnitt 6.3).
- **Bild-Normalisierung beim Einfügen** (Abschnitt 3.6): `einfuegen` sollte
  extern eingefügte `<img>`-Quellen ohne `data:`-URL entweder auf `data:`
  normalisieren oder `ImageCollector.add()` in beiden Formaten kontrolliert
  degradieren lassen (Bild überspringen statt Exception werfen), damit ein
  späterer Export nach externem Bild-Einfügen nicht abstürzt.
- **Firefox/Safari real (nicht nur Playwright-WebKit) manuell testen**: Die
  Playwright-WebKit-Engine ist keine 1:1-Kopie von Apple Safari; für den in
  `kopieren-req.md` Abschnitt 5 Grenzfall 11 geforderten Nachweis „echtes
  Safari“ bleibt ein manueller Testdurchlauf auf echter Hardware empfohlen
  (Definition of Done, siehe `kopieren-req.md` Abschnitt 8).

---

## 10. Nachträge, die in `kopieren-req.md` selbst fällig sind

Dieses Dokument ändert `kopieren-req.md` nicht; nach Umsetzung dort
nachzutragen:

- Zeilen 68–69 (Punkt 4/5 der Tabelle „Bedienelemente“): Entscheidung „kein
  Button“ (Abschnitt 2.1 dieses Plans) samt Begründung eintragen.
- Zeilen 273–276 (Grenzfall 5): Entscheidung „Bibliotheksverhalten von
  `prosemirror-tables` übernommen“ (Abschnitt 2.3 dieses Plans) eintragen.
- Zeilen 355–362 (Abschnitt 8, offene Fragen 1–3): die drei Entscheidungen aus
  Abschnitt 2 dieses Plans wörtlich übernehmen, inklusive der Firefox-Erweiterung
  aus Entscheidung 2.2.
- Abschnitt 4, Testfall 6 / diese Datei Abschnitt 6.3 Punkt 6: Ergebnis der
  Architektur-Klärung (ein aktives Dokument zur Zeit, Navigation über
  Formatauswahl) nachtragen.
- Vermerk ergänzen, dass die Testfälle zur Cross-Format-Rundreise (Abschnitt 4,
  Testfälle 4/5) bis zur Behebung des Blockers aus Abschnitt 0.4/9 dieses Plans
  als „blockiert“, nicht als „fehlgeschlagen“ oder „übersprungen“ gelten.

---

## 11. Umsetzungsreihenfolge

1. `src/formats/shared/schema.ts` — `leafText`-Fix (3.1). Kleinste,
   risikoärmste Änderung, sofort per Unit-Test verifizierbar.
2. `src/formats/shared/editor/clipboard.ts` neu anlegen (3.2) +
   `clipboard.test.ts` (6.1) — TDD-fähig, reine Node-Ebene ohne DOM.
3. `src/formats/shared/editor/commands.ts` + `WordEditor.tsx` —
   `insertHardBreak`/`Shift-Enter` (3.3/3.4), Serializer verdrahten.
4. `playwright.config.ts` — neue Firefox-/WebKit-Projekte, gescoped (3.7).
5. `tests/e2e/clipboard.spec.ts` neu (6.2).
6. `tests/e2e/selection-regression.spec.ts` erweitern (6.4).
7. `tests/e2e/clipboard-roundtrip.spec.ts` neu (6.3), inkl. Klärung der
   Zwei-Dokumente-Frage vor Testimplementierung und `test.fixme()` für die
   Cross-Format-Fälle.
8. `clipboard-privacy.test.ts` neu (6.4/7).
9. Alle Tests grün → Code-Review-Checkliste (7) abarbeiten → Rückmeldung an
   Spec-Verantwortliche für die Nachträge in Abschnitt 10.
