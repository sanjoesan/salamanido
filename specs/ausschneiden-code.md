# Umsetzungsplan: Feature „Ausschneiden“ (Cut)

Gegenstück zu `specs/ausschneiden-req.md`. Dieser Plan beschreibt den **tatsächlich
verifizierten** Code-Stand (Stichtag 2026-07-04, Repo `E:\docs`, kein aktiver Branch-Stand
geprüft außer Arbeitskopie) und die dateigenauen Änderungen, um die Anforderung zu
erfüllen. Alle Aussagen unten sind durch Lesen des tatsächlichen Quellcodes (nicht nur der
Spec) verifiziert; Fundstellen sind mit Pfad+Zeile zitiert.

---

## 0. Kurzfassung der Entscheidung

- Bestätigt: Es existiert **kein** eigener Cut-Code. `commands.ts`, `Toolbar.tsx` und die
  `keymap({...})` in `WordEditor.tsx` enthalten nichts, was „cut“, „clipboard“ oder
  `Mod-x` heißt. Verifiziert per Volltextsuche über `src/` — keine Treffer.
- Bestätigt (und mit Bibliotheks-Quellcode belegt, siehe §1.4): Ctrl+X/Cmd+X und das
  Kontextmenü funktionieren aktuell ausschließlich, weil `prosemirror-view` selbst einen
  nativen `cut`-Event-Handler mitbringt (`editHandlers.cut` in
  `node_modules/prosemirror-view/dist/index.js`), der für **jede** Selektionsart
  (Text/Bild/Zellen/Alles) korrekt funktioniert — inklusive des von
  `prosemirror-tables` überschriebenen `CellSelection.replace()`, das beim Löschen nur
  Zellinhalte leert, nie Zeilen/Spalten entfernt.
- **Architekturentscheidung für den neuen Toolbar-Button/Shift+Entf:** Es wird **kein**
  händisch gebauter, auf `navigator.clipboard.write()` basierender Befehl implementiert,
  sondern der Button/die Taste lösen über `document.execCommand('cut')` exakt denselben
  nativen `cut`-Event-Pfad aus, den Ctrl+X bereits nutzt. Begründung in §2.
- Für DOCX/ODT-Reader/Writer sind **keine** Code-Änderungen nötig (siehe §3.5) — die
  Rundreise-Anforderungen aus Abschnitt 4 der Req sind reine **Test**-Lücken, keine
  Implementierungslücken, weil Writer/Reader ausschließlich den aktuellen ProseMirror-
  Dokumentzustand serialisieren/parsen und keinerlei sitzungsübergreifenden Zustand
  (Bild-Listen, Nummerierungs-IDs) führen, der durch Ausschneiden veralten könnte.
- Neu zu bauen: 1 Toolbar-Button (SVG-Icon, disabled-Zustand, Fehleranzeige), 1
  Command-Paar in `commands.ts`, 1 Keymap-Eintrag (`Shift-Delete`), 1 dokumentierte
  Entscheidung zum Kontextmenü, 1 neue Unit-Test-Datei, 1 neue E2E-Test-Datei mit allen
  Pflichttests inkl. des Selection-Sync-Regressionstests.

---

## 1. Verifizierter Ist-Stand (Codebelege)

### 1.1 `src/formats/shared/editor/commands.ts`
Aktuell 108 Zeilen, exportiert `setAlign`, `isAlignActive`, `setHeading`, `toggleList`,
`liftFromList`, `insertImage`, `insertTable`, `applyMarkColor`, `clearMarkColor`. Kein
`cut`, kein `canCut`, keine Clipboard-Referenz. Bestätigt Req §0.

### 1.2 `src/formats/shared/editor/Toolbar.tsx`
Alle vorhandenen Icons sind Unicode-Glyphen (`🖼`, `⊞`, `⇧`, `⇤`, `↔`, `⇥`, `≡`, `⌫`,
`🖍`) oder Buchstaben (`F`, `K`, `U`, `S`). Kein `<svg>` existiert irgendwo im Repo
außer als XML-Namespace-String in `odt/xmlUtil.ts` (kein UI-Icon). Bestätigt Req §1
Zeile 1 **und** das allgemeine Icon-Problem aus `FEATURE-SPEC-DOCX-ODT.md` §20 Punkt 1 —
ein neuer Ausschneiden-Button darf dieses Muster nicht fortsetzen.

### 1.3 `src/formats/shared/editor/WordEditor.tsx`
`keymap({...})` (Zeilen 71–79) bindet nur `Mod-z`, `Mod-y`, `Mod-Shift-z`, `Enter`,
`Mod-b`, `Mod-i`, `Mod-u`. Kein `Mod-x`, kein `Shift-Delete`. Es gibt **keinen**
`contextmenu`-Listener und **keinen** `handleDOMEvents`-Prop auf der `EditorView` — das
native Browser-Kontextmenü ist also tatsächlich unangetastet erreichbar (Req §1 Zeile 2
kann mit „native, unverändert, funktioniert“ beantwortet werden, siehe §4 unten).

### 1.4 Warum das native Verhalten trotzdem (großteils) korrekt ist — Bibliotheks-Beleg
Geprüft in `node_modules/prosemirror-view/dist/index.js`:
```js
handlers.copy = editHandlers.cut = (view, _event) => {
  let sel = view.state.selection, cut = event.type == "cut";
  if (sel.empty) return;
  let data = event.clipboardData;
  let slice = sel.content(), { dom, text } = serializeForClipboard(view, slice);
  if (data) { event.preventDefault(); data.clearData();
    data.setData("text/html", dom.innerHTML); data.setData("text/plain", text); }
  if (cut) view.dispatch(view.state.tr.deleteSelection().scrollIntoView().setMeta("uiEvent", "cut"));
};
```
Das ist bereits genau die von der Req in §2.7 geforderte Reihenfolge „erst schreiben,
dann löschen“ — synchron, kein Promise, kein Berechtigungsdialog nötig (bestätigt
Req §2.7 Zeile 1). `sel.content()`/`tr.deleteSelection()` sind generische `Selection`-
Methoden; für Tabellen überschreibt `prosemirror-tables` (`node_modules/prosemirror-tables/
dist/index.js`, `CellSelection.replace()`, ca. Zeile 580) das Verhalten so, dass **nur**
die einzelnen Zellbereiche einzeln ersetzt werden (`tr.replace(...)` pro Zelle), niemals
die Tabellenstruktur — das erfüllt Req §2.2/§3.6 bereits ohne eigenen Code. Für
`AllSelection` (Strg+A) sorgt `AllSelection.replace()` in `prosemirror-state` dafür, dass
nach `tr.delete(0, size)` `Selection.atStart(tr.doc)` gesetzt wird; da `doc: 'block+'`
im Schema (`src/formats/shared/schema.ts` Z. 7) mindestens einen Block erzwingt, bleibt
immer ein gültiges Dokument übrig (Req §2.2 letzter Punkt, §3.2).

**Wichtige Einschränkung, die die Req nicht explizit nennt:** `editHandlers.cut` wird nur
aufgerufen, wenn `view.editable` wahr ist (Standard, da kein `editable`-Prop gesetzt ist)
— und der native Event feuert nur auf dem tatsächlich fokussierten Element. Das
beantwortet Req §3 Grenzfall 14 (Fokus außerhalb des Editors) bereits strukturell mit
„sicher“, muss aber trotzdem per Test belegt werden (siehe §6).

### 1.5 `prosemirror-tables`: Delete/Backspace für Zellinhalte bereits vorhanden
`tableEditing()` (aus `WordEditor.tsx` Z. 82) bindet intern (nicht sichtbar in unserem
Code, aber Teil des Plugins) `Backspace`/`Delete`/`Mod-Delete` auf `deleteCellSelection`
— zusätzliche Absicherung, dass Zellinhalte bei diesen Tasten korrekt geleert statt
Struktur gelöscht wird. Für `cut` selbst ist das nicht relevant (dort greift `sel.content()`/
`CellSelection.replace()` wie oben), aber es zeigt: das Zell-Lösch-Verhalten der
Bibliothek ist in sich konsistent und bereits getestet-durch-die-Bibliothek selbst.

### 1.6 DOCX/ODT Writer — keine sitzungsübergreifenden Zustände
`src/formats/docx/writer.ts` Z. 222–223 und `src/formats/odt/writer.ts` Z. 184–185:
`new ImageCollector()` wird bei **jedem** Export frisch erzeugt und ausschließlich durch
Ablaufen des aktuellen `doc.body`/`header`/`footer`-JSON befüllt (`images.add(src)` nur
aus tatsächlich im Baum vorhandenen `image`-Knoten). Es gibt keine globale/gecachte
Bilderliste. Numerierungs-IDs (`BULLET_NUM_ID`/`ORDERED_NUM_ID` in
`src/formats/docx/styleDefs.ts` Z. 34–35, `BULLET_LIST_STYLE_NAME`/
`ORDERED_LIST_STYLE_NAME` in `src/formats/odt/styleRegistry.ts`) sind **statische**,
immer gleich emittierte Konstanten — nicht dynamisch pro Liste vergeben. Konsequenz:
„verwaiste Bilddateien“ (Req §4.2 Testfall 6) oder „Nummerierungsdefinition ohne
Listeneinträge“ (Req §4.2 Testfall 8) sind mit der aktuellen Architektur **strukturell
ausgeschlossen**, unabhängig davon, was Ausschneiden tut — vorausgesetzt, Ausschneiden
entfernt den Knoten korrekt aus dem ProseMirror-Dokument, was laut §1.4 bereits der Fall
ist. Das schema (`bullet_list`/`ordered_list: { content: 'list_item+' }`,
`src/formats/shared/schema.ts` Z. 74–96) verhindert zusätzlich strukturell, dass eine
leere Liste (0 `list_item`) überhaupt im Dokument existieren kann — ProseMirrors
Transform-Validierung lässt so einen Zwischenzustand nie zu.

**Schlussfolgerung:** In §3.5 unten wird begründet, warum an `docx/*` und `odt/*` **keine**
Zeile geändert wird — die Rundreise-Testfälle aus Req §4.2 werden ausschließlich über
neue E2E-Tests abgesichert, nicht über Produktionscode-Änderungen.

---

## 2. Zielarchitektur für die neuen Zugriffswege

Zwei Zugriffswege fehlen als *eigener, klickbarer/tastaturseitig expliziter* Weg:
Toolbar-Button und (optional) Shift+Entf. Für beide wird **derselbe** Mechanismus
verwendet: `document.execCommand('cut')`, ausgelöst auf dem fokussierten
`view.dom`-Element.

**Warum `execCommand('cut')` und nicht ein händisch gebauter
`navigator.clipboard.write()`-Befehl (wie in Req §2.7 als Beispiel skizziert)?**

1. `execCommand('cut')` löst denselben synchronen, bereits verifiziert korrekten
   `editHandlers.cut`-Pfad aus (§1.4) — für Bild/Zellen/Alles-Selektion **ohne** dass wir
   Selektionsarten in eigenem Code unterscheiden müssen. Ein manueller
   `navigator.clipboard.write()`-Befehl müsste `sel.content()` + einen eigenen
   `DOMSerializer` nachbauen und würde die interne `data-pm-slice`-Metadaten-Anreicherung
   verlieren, die `serializeForClipboard` (privat in `prosemirror-view`) für
   originalgetreues internes Wiedereinfügen bei Teil-Knoten-Selektionen nutzt — ein
   Genauigkeitsverlust gegenüber nativem Ctrl+X, den wir so vermeiden.
2. Es ist synchron: kein Promise, kein Race mit Fokus/Selektion, keine
   Berechtigungsdialog-Problematik (Req §2.7 Zeile 2 betrifft explizit nur den Fall
   „schreibt über die asynchrone `navigator.clipboard`-API“ — das vermeiden wir bewusst).
3. Schlägt `execCommand('cut')` fehl (Rückgabewert `false`, oder Exception in seltenen
   Sandbox-/Permissions-Policy-Fällen), wurde der native `cut`-Event **nicht** ausgelöst
   → es gibt keinen Zwischenzustand „geschrieben, aber Löschung schon passiert“ oder
   umgekehrt. Das erfüllt die kritische Anforderung aus Req §2.7 („kein stiller
   Datenverlust“) strukturell, weil Schreiben+Löschen ein einziger atomarer nativer
   Vorgang sind, nicht zwei von uns manuell verkettete Schritte.

**Bekanntes Risiko, das dokumentiert und getestet werden muss (siehe §9):**
`execCommand` ist eine als „legacy“ eingestufte API. Für `cut`/`copy`/`paste` bleibt sie in
Chromium/Firefox/WebKit (Stand Kenntnisstand bis Januar 2026) funktional, im Gegensatz zu
den längst uneinheitlich gewordenen Formatierungs-Befehlen (`bold` etc., die dieses Repo
ohnehin nicht per `execCommand` nutzt). Trotzdem: **Pflicht, dies in allen 3
Playwright-Projekten zu verifizieren** (siehe §6.2) und nicht nur anzunehmen.

---

## 3. Dateigenaue Änderungen

### 3.1 `src/formats/shared/editor/commands.ts` (ändern)

Neu zu ergänzen, am Ende der Datei:

```ts
import type { EditorView } from 'prosemirror-view'

/** True, wenn eine nicht-leere Selektion vorliegt (Text/Bild/Zellen/Alles) — 
 * einzige Bedingung aus Req §2.1, da `Selection.empty` für NodeSelection/
 * CellSelection/AllSelection bereits korrekt "nicht leer" ergibt. */
export function canCut(state: EditorState): boolean {
  return !state.selection.empty
}

export interface CutHandlers {
  /** Aufgerufen, wenn der native Cut-Versuch scheitert — für sichtbares Feedback
   * gemäß Req §2.7 ("kein stiller Fehlschlag"). Bekommt einen fertigen,
   * anzeigefähigen deutschen Text. */
  onCutBlocked?: (message: string) => void
}

/**
 * Cut-Befehl für Zugriffswege, die keinen nativen `cut`-DOM-Event erzeugen
 * (Toolbar-Button-Klick, `Shift-Delete`). Natives Strg+X/Cmd+X und das
 * Kontextmenü laufen NICHT über diese Funktion — die funktionieren bereits
 * korrekt über `prosemirror-view`s eingebauten `cut`-Event-Handler (siehe
 * specs/ausschneiden-code.md §1.4/§2).
 *
 * Löst absichtlich `document.execCommand('cut')` aus, statt Zwischenablage-
 * Zugriff und Löschung selbst zu verketten: das reproduziert exakt denselben,
 * bereits korrekten Pfad wie natives Ctrl+X (inkl. Bild-/Zellen-/Alles-Selektion)
 * und vermeidet die asynchrone Clipboard-API bewusst (siehe Begründung in
 * specs/ausschneiden-code.md §2).
 */
export function cutSelection(handlers: CutHandlers = {}): Command {
  return (state, dispatch, view) => {
    if (state.selection.empty) return false
    if (!dispatch || !view) return true // reine Verfügbarkeits-Abfrage (z. B. für "disabled")

    view.focus()
    let succeeded = false
    try {
      succeeded = view.dom.ownerDocument.execCommand('cut')
    } catch {
      succeeded = false
    }
    if (!succeeded) {
      handlers.onCutBlocked?.(
        'Ausschneiden wurde vom Browser blockiert. Es wurde nichts verändert.',
      )
    }
    return succeeded
  }
}
```

Anmerkung für Implementierende: `cutSelection(...)` liefert eine echte `Command`
(`(state, dispatch?, view?) => boolean`), passt also in `keymap({...})` **und** kann aus
`Toolbar.tsx` wie die übrigen Befehle aufgerufen werden — dafür muss `run()` in
`Toolbar.tsx` den `view`-Parameter durchreichen (siehe §3.2).

### 3.2 `src/formats/shared/editor/Toolbar.tsx` (ändern)

1. **`run()` erweitern**, um `view` als drittes Argument an die Command-Funktion
   durchzureichen (rückwärtskompatibel, bestehende Aufrufer ignorieren das dritte
   Argument):

```ts
function run(view: EditorView, command: Command) {
  command(view.state, view.dispatch, view)
  view.focus()
}
```
(erfordert `import type { Command } from 'prosemirror-state'`).

2. **Neue Imports**: `canCut`, `cutSelection`, `type CutHandlers` aus `./commands`.

3. **`ToolbarProps` erweitern**:
```ts
interface ToolbarProps {
  view: EditorView
  cutError: string | null
  setCutError: (message: string | null) => void
}
```

4. **Neue Komponente `ScissorsIcon`** (SVG statt Unicode/Emoji, erfüllt Req §1 Zeile 1
   und die allgemeine Icon-Anforderung aus `FEATURE-SPEC-DOCX-ODT.md` §20.1):

```tsx
function ScissorsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="6" cy="6" r="2.4" />
      <circle cx="6" cy="18" r="2.4" />
      <line x1="8.2" y1="7.6" x2="20" y2="20" />
      <line x1="8.2" y1="16.4" x2="20" y2="4" />
    </svg>
  )
}
```

5. **Neuer Button** — als eigene Gruppe **vor** dem Absatzformat-Dropdown (Clipboard-
   Gruppe steht in Word/LibreOffice ebenfalls konventionell zuerst):

```tsx
<button
  type="button"
  title="Ausschneiden"
  aria-label="Ausschneiden"
  disabled={!canCut(view.state)}
  onMouseDown={(e) => {
    e.preventDefault()
    setCutError(null)
    run(view, cutSelection({ onCutBlocked: setCutError }))
  }}
  className="px-2 py-1 rounded text-sm border border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
>
  <ScissorsIcon />
</button>
{cutError && (
  <span role="alert" className="text-xs text-red-600 dark:text-red-400 max-w-[16rem] truncate">
    {cutError}
  </span>
)}
<div className="w-px h-5 bg-neutral-300 dark:bg-neutral-700 mx-1" />
```

`disabled` verhindert bereits nativ, dass `onMouseDown` bei leerer Selektion feuert
(HTML-Standardverhalten deaktivierter Buttons) — erfüllt Req §2.1/§3.1 ohne
Zusatzcode; der `command`-interne `state.selection.empty`-Guard in `cutSelection` ist
eine zweite, defensive Absicherung (z. B. falls sich Selektion zwischen Render und
Klick ändert).

### 3.3 `src/formats/shared/editor/WordEditor.tsx` (ändern)

1. **Neuer State** für die Fehlermeldung (geteilt zwischen Toolbar-Button und
   `Shift-Delete`-Pfad, damit beide Zugriffswege dieselbe sichtbare Rückmeldung nutzen):
```ts
const [cutError, setCutError] = useState<string | null>(null)
```

2. **Auto-Dismiss** (kein blockierender Dauerzustand):
```ts
useEffect(() => {
  if (!cutError) return
  const id = window.setTimeout(() => setCutError(null), 4000)
  return () => window.clearTimeout(id)
}, [cutError])
```

3. **Keymap-Ergänzung** — `Shift-Delete` ist in `prosemirror-commands`s `baseKeymap`
   **nicht** gebunden (verifiziert: weder `pcBaseKeymap` noch `macBaseKeymap` enthalten
   diesen Eintrag) und wird von Browsern für `contenteditable` nicht automatisch als Cut
   interpretiert (anders als bei nativen Windows-Steuerelementen) — die Req-Vermutung in
   §1 Zeile 4 bestätigt sich als „nicht nativ unterstützt“, also wird bewusst ergänzt:
```ts
keymap({
  'Mod-z': undo,
  'Mod-y': redo,
  'Mod-Shift-z': redo,
  Enter: splitListItem(wordSchema.nodes.list_item),
  'Mod-b': toggleMark(wordSchema.marks.strong),
  'Mod-i': toggleMark(wordSchema.marks.em),
  'Mod-u': toggleMark(wordSchema.marks.underline),
  'Shift-Delete': cutSelection({ onCutBlocked: setCutError }),
}),
```
Da `keymap({...})` als erstes Plugin in der `plugins`-Liste steht (vor
`keymap(baseKeymap)` und vor `tableEditing()`), hat dieser Eintrag Vorrang; da
`Shift-Delete` nirgendwo sonst gebunden ist, gibt es keine Kollision mit bestehendem
Zellen-/Text-Löschverhalten (`Delete`/`Backspace` bleiben unverändert).

Import-Ergänzung: `cutSelection` aus `./commands`.

4. **Kontextmenü-Entscheidung dokumentieren** (Req §1 Zeile 2 verlangt explizit eine
   dokumentierte Entscheidung statt eines unklaren Zwischenzustands) — kurzer Kommentar
   oberhalb der `EditorView`-Konstruktion:
```ts
// Rechtsklick "Ausschneiden": bewusst kein eigenes Kontextmenü und kein
// `contextmenu`-Listener mit `preventDefault()` — das native Browser-Kontextmenü
// bleibt erreichbar und sein "Ausschneiden"-Eintrag nutzt denselben
// `editHandlers.cut`-Pfad wie Strg+X (siehe specs/ausschneiden-code.md §1.4/§4).
// Entscheidung siehe specs/ausschneiden-req.md Abschnitt 1, Zeile 2.
```

5. **Toolbar-Aufruf erweitern**:
```tsx
{viewRef.current && <Toolbar view={viewRef.current} cutError={cutError} setCutError={setCutError} />}
```

### 3.4 `src/formats/shared/schema.ts` — **keine Änderung**
Ausschneiden benötigt keine neuen Node-/Mark-Typen. Alle in Req §2.2/§2.3 genannten
Strukturen (Marks, Bilder, Tabellenzellen, `hard_break`, Listen) existieren bereits im
Schema und werden von den generischen `Selection.content()`/`replace()`-Implementierungen
korrekt gehandhabt (§1.4).

### 3.5 `src/formats/docx/*`, `src/formats/odt/*` — **keine Änderung**
Begründung siehe §1.6. Es werden ausschließlich **Tests** ergänzt (§6.3), keine
Reader/Writer-Codeänderungen. Sollte ein neuer Rundreise-Test dennoch fehlschlagen
(z. B. weil ein noch nicht entdeckter Bug in `blockToDocx`/`blockToOdt` beim Verarbeiten
eines nach Cut entstandenen Dokumentzustands auftritt), ist das ein **neuer, bislang
unbekannter Befund** außerhalb des hier begründeten Scopes und separat zu behandeln —
dieser Plan sagt lediglich voraus, dass kein Änderungsbedarf besteht, und das muss durch
die neuen Tests in §6.3 verifiziert, nicht nur angenommen werden.

---

## 4. Zugriffswege — finaler Soll-Zustand (Req Abschnitt 1/5)

| # | Zugriffsweg | Entscheidung | Code-Ort |
|---|---|---|---|
| 1 | Toolbar-Button „Ausschneiden“ | **Neu bauen**, SVG-Icon, disabled bei leerer Selektion | `Toolbar.tsx` §3.2 |
| 2 | Kontextmenü | **Bewusst nativ belassen**, kein eigenes Kontextmenü | dokumentiert in `WordEditor.tsx` §3.3.4 |
| 3 | Strg+X/Cmd+X | **Bereits nativ korrekt** (prosemirror-view), nur testen | keine Codeänderung, Test in §6.2 |
| 4 | Umschalt+Entf | **Nicht nativ unterstützt** → explizit ergänzt | `WordEditor.tsx` §3.3.3, `commands.ts` §3.1 |
| 5 | App-Menü „Bearbeiten“ | Kein Soll-Element (kein Menüband im Produkt) | — (dokumentiert, keine Lücke) |
| 6 | Mobile/Touch-Auswahlblase | Native Browser-/OS-Funktion, gleicher `cut`-Event-Pfad | keine Codeänderung, eingeschränkter Test in §6.2/§9 |

---

## 5. Undo/Redo- und Selection-Sync-Analyse (Req §2.5/§2.6, Grenzfall 15/16)

**Undo-Gruppierung (§2.5):** Der native `cut`-Handler setzt
`.setMeta('uiEvent', 'cut')` auf seine eigene Transaktion; `prosemirror-history`
gruppiert Transaktionen standardmäßig nur bei zeitlich unmittelbar aufeinanderfolgenden,
strukturell gleichartigen Tipp-Schritten (Zeichen-Einfügungen), nicht bei einer
`addMark`-Transaktion (Fett) gefolgt von einer `deleteSelection`-Transaktion (Cut) —
diese unterscheiden sich sowohl im Schrittyp als auch im gesetzten `uiEvent`-Meta. Es
wird **kein** Code-Fix erwartet, aber das **muss** per Test verifiziert werden (§6.2,
Testfall „Fett direkt vor Ausschneiden, zwei getrennte Undo-Schritte“).

**Selection-Sync-Bug (§2.6, Grenzfall 15):** Der bestehende Fix
(`reconcileSelectionOnClick`, `WordEditor.tsx` Z. 42–53) korrigiert nur den Fall „DOM
zeigt kollabierten Cursor, Modell hält noch nicht-leere Selektion“. Nach jedem
Cut-Vorgang (nativ **und** über `execCommand('cut')`, da beide über
`tr.deleteSelection()` laufen) aktualisiert `AllSelection.replace()`/
`TextSelection`-Kollabierung die Modell-Selektion bereits **als Teil derselben
Transaktion** — anders als bei „Fett“ (`addMark`), das die Selektion unverändert lässt.
Das ist der strukturelle Grund, warum Bold+Klick anfällig war, Cut es aber grundsätzlich
nicht sein sollte. **Fazit:** Es wird kein zusätzlicher Code-Fix für diese Interaktion
erwartet — aber genau das ist eine Erwartung, keine Garantie, und der in §6.2 Pflicht
gemachte Regressionstest ist genau dafür da, das zu belegen. Schlägt der Test fehl, ist
das ein neu entdeckter, eigenständiger Bug und erfordert eine eigene Analyse/Fix
außerhalb dieses Plans.

---

## 6. Tests

### 6.1 Neu: `src/formats/shared/editor/__tests__/commands.test.ts`
Erste Unit-Tests überhaupt für `commands.ts` (bislang ungetestet). Deckt nur reine
Logik ab, die ohne echten Browser/Clipboard prüfbar ist (jsdom hat kein
`navigator.clipboard` und `document.execCommand` ist in jsdom ein wirkungsloser Stub —
das eigentliche Cut-Verhalten wird in §6.2 per Playwright/echtem Browser geprüft, analog
zum bestehenden Test-Stil in `selection-regression.spec.ts`).

Zu testen:
- `canCut(state)`: `false` bei kollabierter `TextSelection` (nur Cursor); `true` nach
  `TextSelection.create(doc, 0, n)` mit `n > 0`; `true` für eine `NodeSelection` auf
  ein `image`; `true` für `AllSelection`.
- `cutSelection()(state, dispatch, view)`: gibt `false` zurück und ruft **nicht**
  `view.focus()`/`execCommand` auf, wenn `state.selection.empty` (Guard, Req §2.1).
- `cutSelection()(state, undefined, view)`: reine Verfügbarkeitsabfrage — gibt bei
  nicht-leerer Selektion `true` zurück, ohne `execCommand` aufzurufen (kein Dispatch ⇒
  keine Seiteneffekte).
- `cutSelection({ onCutBlocked })(...)` mit einem Fake-`view`
  (`{ dom: { ownerDocument: { execCommand: () => false } }, focus: () => {}, state, dispatch }`
  als `as unknown as EditorView`): `onCutBlocked` wird mit einer nicht-leeren
  deutschen Meldung aufgerufen, Rückgabewert `false`.
- Gegenprobe: `execCommand` gemockt mit `() => true` ⇒ `onCutBlocked` wird **nicht**
  aufgerufen, Rückgabewert `true`.
- `execCommand` wirft eine Exception ⇒ wird abgefangen, gleiches Verhalten wie
  Rückgabe `false` (kein Rewurf, `onCutBlocked` wird aufgerufen).

### 6.2 Neu: `tests/e2e/cut.spec.ts`
Neue, eigenständige Datei nach dem Vorbild von `tests/e2e/selection-regression.spec.ts`
(echte Browser-Interaktion, `page.keyboard`, `.ProseMirror`-Locator, `getByTitle`). Läuft
automatisch auf allen 3 in `playwright.config.ts` konfigurierten Projekten (Desktop
Chrome/Mobile/Tablet), da die Projekt-Matrix pro Datei greift — keine Sonderbehandlung
pro Testfall nötig, außer wo unten explizit vermerkt.

Zusätzlich am Dateianfang: ein wiederverwendbarer Helper, der `page.on('pageerror', ...)`
und `page.on('console', msg => msg.type() === 'error' ...)` sammelt und am Ende jedes
Tests assertet, dass keine JS-Exception auftrat (Req Abnahmekriterium 5, DoD §8.5) — bisher
existiert in keiner bestehenden Spec-Datei ein solcher Helper, dies ist die erste
Einführung dieses Musters im Repo.

Testfälle (Nummerierung folgt Req Abschnitt 6):
1. Text eingeben, per Maus markieren (`page.mouse` drag über den Text oder
   `page.keyboard` mit `Shift+ArrowRight`), `ControlOrMeta+x` → Editor-Text verschwindet.
2. Direkt danach `ControlOrMeta+v` an anderer Cursorposition → Text erscheint dort mit
   erhaltener Formatierung (z. B. vorher Fett gesetzt, danach noch immer `<strong>`
   sichtbar/aktiver Fett-Button).
3. Nur Cursor (keine Selektion), `ControlOrMeta+x` → kein sichtbarer Unterschied, keine
   Konsole-Exception (Helper aus s.o.).
4. `ControlOrMeta+a` → `ControlOrMeta+x` → Editor zeigt validen leeren Zustand
   (`.ProseMirror p` Anzahl 1, leer), weiterhin tippbar (Text danach eintippen und
   sichtbar prüfen).
5. **Pflicht-Regressionstest** (Req §2.6/§3.15/§8.3, dauerhaft in der Suite): Text
   eingeben → `ControlOrMeta+a` → `ControlOrMeta+x` → Klick zur Neupositionierung →
   `Enter` → weiter tippen → Dokument bleibt konsistent (kein Datenverlust, keine
   Ersetzung). Analog zur bestehenden Struktur in
   `selection-regression.spec.ts`, aber mit Cut statt Fett als auslösender Aktion.
6. Tabelle einfügen, in eine Zelle klicken, Text eingeben, Teil des Zelltexts per Maus
   markieren, `ControlOrMeta+x` → nur der markierte Teil verschwindet, Zelle/Tabelle
   bleibt strukturell unverändert.
7. `CellSelection` über mehrere Zellen: Tabelle einfügen, Text in zwei Zellen eintippen,
   dann per Maus-Drag über Zellgrenzen selektieren (`page.mouse.move` auf Mittelpunkt
   Zelle A → `page.mouse.down()` → `page.mouse.move` auf Mittelpunkt Zelle B mit
   `{ steps: 5 }` → `page.mouse.up()` — löst `prosemirror-tables`s internen
   `handleMouseDown`-Zellbereichs-Handler aus), dann `ControlOrMeta+x` → beide
   Zellinhalte leer, Zeilen-/Spaltenzahl (`page.locator('.ProseMirror td').count()`)
   unverändert.
8. Bild einfügen (über den Bild-Button mit einer kleinen Test-PNG-Datei), auf das Bild
   klicken (erzeugt `NodeSelection`), `ControlOrMeta+x` → Bild verschwindet
   (`page.locator('.ProseMirror img')` Anzahl 0), umgebender Text bleibt.
9. `ControlOrMeta+x`, danach sofort `ControlOrMeta+z` → exakter Ursprungszustand
   (Text **und** sinnvolle Cursor-/Selektionsposition, z. B. erneutes Tippen fügt an
   erwarteter Stelle ein).
9b. *(zusätzlich zu Req-Liste, deckt §2.5 ab)* Text eingeben → `ControlOrMeta+a` → Fett
   per Toolbar → `ControlOrMeta+x` → **ein** `ControlOrMeta+z` stellt nur den
   ausgeschnittenen Text wieder her (weiterhin fett), **zweites** `ControlOrMeta+z` macht
   erst danach die Fett-Formatierung rückgängig — belegt getrennte Undo-Schritte.
10./11. Siehe §6.3 (Rundreise).
12. Extern formatierten Text einfügen und danach erneut ausschneiden: Über
    `context.grantPermissions(['clipboard-read', 'clipboard-write'])` (nur auf dem
    Chromium-Projekt zuverlässig unterstützt, siehe Einschränkung unten) und
    `page.evaluate(() => navigator.clipboard.writeText(html))`
    (bzw. `write` mit `ClipboardItem` für `text/html`) einen Word/LibreOffice-artigen
    HTML-Schnipsel in die System-Zwischenablage schreiben, `ControlOrMeta+v` einfügen,
    Formatierung prüfen, dann erneut markieren und `ControlOrMeta+x` → Formatierung
    bleibt über beide Schritte erhalten. **Nur auf dem Projekt „Desktop Chrome“**
    ausführen (`test.skip(browserName !== 'chromium', ...)`), da Firefox/WebKit
    `clipboard-write`/`clipboard-read`-Permissions in Playwright nicht zuverlässig
    unterstützen — das ist eine bewusste, dokumentierte Einschränkung, kein
    unklarer Zwischenzustand (Req DoD §8.1 Prinzip auch auf Testebene angewendet).
13. Wird durch die Playwright-Projekt-Matrix automatisch erfüllt (Testfälle 1–5 laufen
    auf allen 3 Projekten); zusätzlich ein expliziter Kommentar im Testfile, der
    festhält, dass die native OS-Auswahlblase (Android/iOS) selbst nicht
    UI-durchklickbar ist (Playwright hat keinen Zugriff auf dieses OS-Chrome), und dass
    „Ausschneiden funktioniert für Mobile/Tablet“ hier über den identischen
    `cut`-Event-Pfad **abgeleitet**, nicht direkt durch Antippen der Blase getestet wird
    — das ist die in Req Abnahmekriterium 8.2 vorgesehene „bewusst nicht unterstützt/
    nicht direkt testbar, mit Begründung dokumentiert“-Option.

Zusätzliche, in der Req nicht explizit nummerierte, aber durch Abschnitt 3 geforderte
Tests:
- Grenzfall 3 (Absatzgrenzen-Selektion): Zwei Absätze eintippen, Selektion vom Ende des
  ersten bis Anfang des zweiten, `ControlOrMeta+x` → ein zusammengeführter Absatz, keine
  doppelten/verschluckten Zeichen.
- Grenzfall 4 (Liste ausschneiden): Bullet-Liste mit 3 Punkten, alle per `ControlOrMeta+a`
  (innerhalb der Liste) oder Maus-Drag selektieren, `ControlOrMeta+x` → Liste
  verschwindet vollständig, keine leeren `<li>`.
- Grenzfall 11 (Zwischenablage-Zugriff verweigert) — **deterministisch simuliert** statt
  auf einen echten Berechtigungsdialog angewiesen zu sein:
  ```ts
  await page.addInitScript(() => {
    const original = document.execCommand.bind(document)
    // @ts-expect-error – Testinstrumentierung
    document.execCommand = (cmd: string, ...rest: unknown[]) =>
      cmd === 'cut' ? false : original(cmd, ...rest)
  })
  ```
  Danach: Text markieren, Toolbar-Button „Ausschneiden“ klicken → Text bleibt im
  Dokument (kein Datenverlust!), sichtbare Fehlermeldung (`getByRole('alert')`)
  erscheint, keine Konsole-Exception. Deckt Req §2.7/Grenzfall 11 vollständig und
  reproduzierbar ab, ohne von echtem Browser-Berechtigungsverhalten abhängig zu sein.
- Grenzfall 13 (Cut an Dokumentanfang/-ende): Selektion von Position 0 bis Zeichen 3,
  bzw. von vorletztem bis letztem Zeichen, `ControlOrMeta+x` → Editor bleibt editierbar,
  kein Absturz.
- Grenzfall 14 (Fokus außerhalb des Editors): Fokus in den Textfarbe-`<input type=color>`
  der Toolbar setzen, `ControlOrMeta+x` drücken → Editor-Inhalt bleibt unverändert
  (das Farbfeld verarbeitet die Tastenkombination selbst oder ignoriert sie; wichtig ist
  nur, dass `.ProseMirror`-Inhalt sich nicht ändert).
- Grenzfall 17 (letzte nicht-leere Zelle einer Tabelle ausschneiden): Tabelle mit Inhalt
  nur in einer Zelle, diese Zelle markieren und ausschneiden → Zelle bleibt als leere,
  gültige Zelle bestehen (kein struktureller Fehler, `.ProseMirror td` Anzahl
  unverändert).
- Toolbar-spezifisch: Button ohne Selektion ist `disabled` (Playwright:
  `await expect(page.getByRole('button', { name: 'Ausschneiden' })).toBeDisabled()`),
  wird nach Erzeugen einer Selektion aktiv, und ein Klick funktioniert identisch zu
  Strg+X (gleicher Endzustand des Dokuments).

### 6.3 Rundreise-Tests (Req Abschnitt 4.2) — ergänzt in `tests/e2e/cut.spec.ts`
Analog zum bestehenden Muster in `docx.spec.ts`/`odt.spec.ts` (Upload/Neu erstellen →
editieren → „Exportieren“ → `page.waitForEvent('download')` → mit `JSZip` den Inhalt der
heruntergeladenen Datei prüfen):

1. DOCX: Neues Dokument, Text eintippen, Teil ausschneiden, exportieren, `document.xml`
   aus dem Zip lesen → ausgeschnittener Text fehlt, übriger Text vorhanden, kein
   verwaistes `<w:p/>`-Fragment an falscher Stelle (Struktur bleibt derjenigen ohne Cut
   entsprechend, abzüglich des Textes).
2. Dieselbe Sequenz für ODT (`content.xml`).
3. Cut+Paste als „Verschieben“ innerhalb desselben Dokuments, dann Export/Reimport in
   beiden Formaten → Text an neuer Stelle, nicht mehr an alter Stelle, Formatierung
   erhalten.
4./5. Cross-Format: ODT hochladen → ausschneiden → als DOCX exportieren → reimportieren
   (und umgekehrt) → Inhalt (abzüglich Ausgeschnittenem) konsistent. Nutzt
   `buildSampleOdt()`/`buildSampleDocx()`-Hilfsfunktionen aus den bestehenden Spec-Dateien
   (ggf. dorthin exportieren/duplizieren, siehe Hinweis unten).
6. Bild per Ausschneiden entfernen → Export (DOCX **und** ODT) → im Zip prüfen: kein
   `word/media/imageN.*` bzw. keine `<manifest:file-entry>` für das entfernte Bild mehr
   vorhanden (erwartet gemäß §1.6 — dieser Test **verifiziert** die in §1.6
   dokumentierte Annahme, statt sie nur zu behaupten).
7. Tabellenzellen-Inhalt ausschneiden → Export → `<w:tbl>`/`<table:table>`-Struktur
   (Zeilen-/Spaltenanzahl, `gridSpan`/`number-columns-spanned`) unverändert im Zip
   nachweisbar.
8. Komplette Liste ausschneiden → Export → keine `<w:numPr>`-Referenz mehr im Dokument,
   `numbering.xml`/Listenstile selbst bleiben (statisch, s. §1.6) vorhanden, aber
   unbenutzt — das ist bei dieser Architektur **das erwartete, korrekte** Ergebnis
   (kein Bug), im Test explizit so kommentieren, damit es nicht als Regressions-Treffer
   missverstanden wird.
9. Doppelte Rundreise (DOCX → Editor/Cut → ODT → Editor → DOCX) → Inhalt nach zwei
   Konvertierungen weiterhin dem erwarteten Nach-Cut-Zustand entsprechend.
10. `ControlOrMeta+a` → `ControlOrMeta+x` → Export → Reimport → gültige, leere Datei
    (ein leerer Absatz), kein defekter Export/Import-Zyklus.

**Hinweis zur Testinfrastruktur:** `buildSampleDocx()`/`buildSampleOdt()` sind aktuell
lokal in `docx.spec.ts`/`odt.spec.ts` definiert (nicht exportiert). Für die
Cross-Format-Tests (4./5.) entweder duplizieren (konsistent mit dem bisherigen
Copy-Paste-Stil der Spec-Dateien in diesem Repo) oder — sauberer — nach
`tests/e2e/fixtures/buildSampleDocuments.ts` auslagern und aus allen drei Spec-Dateien
importieren. Empfehlung: auslagern, da es sich um eine reine Testverbesserung ohne
Verhaltensänderung handelt und Duplikation von Testinfrastruktur vermeidet.

---

## 7. Grenzfälle-Mapping (Req Abschnitt 3, vollständig)

| # | Grenzfall | Lösung | Test |
|---|---|---|---|
| 1 | Leere Selektion/nur Cursor | `disabled`-Button + `canCut`/`state.selection.empty`-Guard in `cutSelection` | §6.2 Testfall 3 |
| 2 | Strg+A → Ausschneiden | Native `AllSelection.replace()`, keine Codeänderung | §6.2 Testfall 4 |
| 3 | Absatzgrenzen-Selektion | Native `TextSelection`-Replace-Logik | §6.2 Zusatztest |
| 4 | Liste über mehrere Punkte | Native Replace-Logik + Schema-Constraint `list_item+` | §6.2 Zusatztest |
| 5 | Bild-`NodeSelection` | Native `NodeSelection.content()`/Replace | §6.2 Testfall 8 |
| 6 | `CellSelection` mehrere Zellen | `CellSelection.replace()` in `prosemirror-tables` (§1.4) | §6.2 Testfall 7 |
| 7 | Ganze Zeile/Spalte selektiert, aber nicht strukturell löschen | Gleicher Mechanismus wie #6, keine separate Zeilen-/Spalten-Lösch-Funktion beteiligt | §6.2 Testfall 7 (Struktur-Assertion) |
| 8 | Gemischt formatierter Text | `DOMSerializer`/native Clipboard-Serialisierung erhält alle Marks | §6.2 Testfall 2/12 |
| 9 | Zweites Dokument/Tab | Systemweite Zwischenablage, kein App-Code nötig | nicht separat automatisiert (Playwright-Kontext-Limitierung), als bewusst nicht automatisiert dokumentieren |
| 10 | Einfügen in externe Anwendung | `text/plain`-Fallback immer vorhanden (nativer Handler) | manuell verifizieren, in DoD-Bericht vermerken (Playwright kann nicht in echte externe Apps einfügen) |
| 11 | Zwischenablage verweigert/blockiert | `execCommand`-Fehlerpfad → `onCutBlocked` → sichtbarer Alert, kein Datenverlust | §6.2 Zusatztest (deterministisch simuliert) |
| 12 | Mehrfaches Ausschneiden ohne Paste | Standard-Clipboard-Verhalten, kein eigener Stack | kein Extra-Test nötig (kein App-Code betroffen) |
| 13 | Cut an Dokumentanfang/-ende | Native Replace-Logik | §6.2 Zusatztest |
| 14 | Fokus außerhalb Editor | Native Event-Zielsteuerung durch Browser | §6.2 Zusatztest |
| 15 | Selection-Sync-Bug × Cut | Strukturell unwahrscheinlich (§5), Pflichttest zur Absicherung | §6.2 Testfall 5 (Pflicht) |
| 16 | Cut direkt gefolgt von Undo | `history()`-Plugin, kein Zusatzcode | §6.2 Testfall 9 |
| 17 | Letzte nicht-leere Zelle | `createAndFill()`-Constraint (`cellContent: 'block+'`) | §6.2 Zusatztest |
| 18 | Track-Changes-Abhängigkeit | Explizit **außerhalb** des Scopes (Phase 3 noch nicht gebaut) | keiner — als künftige Abhängigkeit in `FEATURE-SPEC-DOCX-ODT.md` §13-Tracking belassen |

---

## 8. Abnahmekriterien — Abgleich mit Req Abschnitt 8

1. **Jeder Zugriffsweg dokumentiert** → §4 dieser Datei.
2. **Alle Grenzfälle einzeln testabgedeckt oder begründet ausgenommen** → §7.
3. **Pflicht-Regressionstest Selection-Sync × Cut** → §6.2 Testfall 5, dauerhaft in
   `tests/e2e/cut.spec.ts`.
4. **Alle Rundreise-Testfälle DOCX+ODT grün** → §6.3, keine Produktionscode-Änderung
   erwartet (§1.6/§3.5), aber Tests sind Pflicht, um das zu beweisen statt anzunehmen.
5. **Kein stiller Datenverlust, keine Konsolen-Exception** → `execCommand`-Fehlerpfad in
   §3.1/§3.2 plus deterministischer Test in §6.2 (Grenzfall 11); Konsole-Helper in §6.2.
6. **Backlog-Status-Korrektur:** Nach Umsetzung dieses Plans **und** grünen Tests aus §6
   kann der Backlog-Eintrag `ausschneiden` (`specs/FEATURE-BACKLOG.md` Zeile 78) weiterhin
   „vorhanden“ bleiben. Wird nur ein Teil umgesetzt (z. B. Tests ohne Toolbar-Button),
   ist der Status auf „teilweise“ zu korrigieren, mit den fehlenden Teilen als eigene
   Nachfolge-Punkte — das ist eine Entscheidung für nach der Umsetzung, nicht Teil dieses
   Plans.

---

## 9. Offene Risiken / künftige Abhängigkeiten

- **`execCommand`-Zukunftssicherheit:** `execCommand('cut'/'copy'/'paste')` ist Legacy,
  aber Stand aktuellem Kenntnisstand in allen drei Ziel-Engines (Chromium/Firefox/
  WebKit) für Zwischenablage-Befehle (im Unterschied zu Formatierungsbefehlen) weiterhin
  unterstützt. Sollte ein Ziel-Browser das künftig entfernen, greift der bereits in
  `cutSelection()` eingebaute Fehlerpfad (`onCutBlocked`) automatisch — kein stiller
  Ausfall, aber der Button würde dann in diesem Browser dauerhaft fehlschlagen und
  bräuchte einen Nachfolge-Fix (z. B. Rückfall auf die in §2 bewusst vermiedene
  `navigator.clipboard.write()`-Variante). Empfehlung: bei jedem größeren
  Browser-Upgrade-Zyklus erneut per E2E-Suite verifizieren (§6.2 deckt das ab, solange
  die Suite in CI läuft).
- **Mobile/Touch-Auswahlblase:** wie in §6.2 Testfall 13 begründet, nicht direkt per
  Playwright antippbar — Risiko bleibt "durch Bibliotheksverhalten abgeleitet, nicht
  Ende-zu-Ende auf echtem Gerät verifiziert". Falls das Produkt künftig echte
  Geräte-QA bekommt, dort nachholen.
- **Track Changes (Req Grenzfall 18):** Sobald Phase 3 (`FEATURE-SPEC-DOCX-ODT.md`
  Abschnitt 13) Änderungsverfolgung einführt, muss `cutSelection` (und der native
  Cut-Pfad!) um eine Prüfung "ist Aufzeichnung aktiv?" erweitert werden, die eine
  Löschung als Änderung markiert statt sie sofort auszuführen — das betrifft dann auch
  den nativen `editHandlers.cut`-Pfad und lässt sich nicht mehr allein in
  `cutSelection()` lösen (vermutlich zusätzliches `transaction`-Filter-Plugin nötig, das
  jede über `uiEvent: 'cut'` markierte Transaktion abfängt). Nicht Teil dieses Plans,
  hier nur nachvollziehbar referenziert.
- **Cross-Format-Test-Hilfsfunktionen-Duplikation:** siehe Hinweis am Ende von §6.3 —
  Auslagern von `buildSampleDocx`/`buildSampleOdt` ist eine kleine, unabhängige
  Aufräumarbeit, kein Blocker.
