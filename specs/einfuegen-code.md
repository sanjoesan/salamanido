# Umsetzungsplan „Einfügen" — dateigenau, gegen den tatsächlichen Code geprüft

Bezug: `E:\docs\specs\einfuegen-req.md` (Anforderung), `E:\docs\FEATURE-SPEC-DOCX-ODT.md`
(Rahmenbedingungen). Code-Stand erneut geprüft am 2026-07-04 in `E:\docs` (Git-Repo,
Arbeitskopie mit unstaged Änderungen an `WordEditor.tsx`/`docx/reader.ts`/`odt/reader.ts`
aus einem anderen, laufenden Ticket — für „Einfügen" selbst irrelevant, siehe Abschnitt 0).

Rolle dieses Dokuments: Es beantwortet, was am **bestehenden Code** fehlt bzw. falsch ist
(nicht nur „Tests fehlen“, sondern ein konkreter, reproduzierbarer Export-Absturz-Bug),
legt fest, welche Dateien geändert/neu angelegt werden, spezifiziert die ProseMirror-
Schema-/Commands-Änderungen, die Toolbar-Änderungen (optional) sowie die Import-/Export-
Anpassungen für OOXML (DOCX) und ODF (ODT). Alle Zeilenangaben unten wurden gegen den
tatsächlichen Dateiinhalt verifiziert (siehe Belegstellen je Abschnitt), nicht aus der
Anforderungsdatei übernommen.

---

## 0. Bestätigung des Codebefunds aus `einfuegen-req.md` Abschnitt 0

Volltextsuche `grep -rn "paste|clipboard|handleDrop|transformPasted" src/` liefert **keinen
einzigen Treffer** im gesamten `src`-Baum. Konkret geprüft und bestätigt:

1. `src/formats/shared/editor/WordEditor.tsx` — einziges Plugin-Setup des Editors, Zeilen
   69–86 (`plugins: [ history(), keymap({...}), keymap(baseKeymap), columnResizing(),
   tableEditing(), dropCursor(), gapCursor(), createPaginationPlugin() ]`). Kein
   `handlePaste`, `handleDrop`, `transformPasted(HTML)`, `clipboardTextParser`. Die
   Datei enthält aktuell nur den (Paste-unabhängigen) `reconcileSelectionOnClick`-Fix für
   den Selection-Sync-Bug (Zeilen 42–53, `mouseup`-Listener Zeilen 103–104) — das ist ein
   anderes, bereits gelöstes Ticket und wird hier nicht angetastet.
2. `src/formats/shared/editor/Toolbar.tsx` (Zeilen 86–247) hat Buttons nur für
   Absatzformat, Fett/Kursiv/Unterstrichen/Durchgestrichen, Text-/Hervorhebungsfarbe,
   Ausrichtung, Listen, Tabelle (Zeile 228–239) und Bild (Zeilen 241–244,
   `handleImagePick` Zeilen 97–108). Kein Einfügen-Button.
3. `src/formats/shared/schema.ts` (150 Zeilen) erkennt beim Parsen nur `p`, `h1`–`h6`,
   `strong`/`b`, `em`/`i`, `u`, `s`/`strike`, `ul`/`ol`/`li`, `img[src]`, `br`, die
   Inline-Styles `font-weight`/`font-style`/`text-decoration`/`color`/`background-color`
   sowie die Default-`parseDOM`-Regeln von `tableNodes(...)` (Zeile 106). Für alles
   andere greift ProseMirrors **Bibliotheks-Default** — bestätigt gegen
   `node_modules/prosemirror-view/dist/index.cjs` (siehe Abschnitt 2 unten).
4. `node_modules/prosemirror-commands/dist/index.cjs:636–655` (`pcBaseKeymap`/
   `macBaseKeymap`) enthält **keine** `Mod-v`/`Mod-c`/`Mod-x`/`Mod-Shift-v`-Bindung —
   `keymap(baseKeymap)` in `WordEditor.tsx:80` blockiert natives Strg+V also nicht.
5. `grep -rn "contextmenu" src/` liefert **keinen** Treffer — natives Kontextmenü ist
   nicht unterdrückt.
6. `tests/e2e/*.spec.ts` (`docx.spec.ts`, `odt.spec.ts`, `lifecycle.spec.ts`,
   `selection-regression.spec.ts`) enthalten keinen Test mit „paste“/„clipboard“/
   „einfüg“ im Namen oder Inhalt.

Der Befund aus `einfuegen-req.md` Abschnitt 0 ist damit **vollständig bestätigt**.

---

## 1. Kritischer Zusatzbefund (über die Anforderungsdatei hinausgehend): Export-Absturz bei externer Bild-URL

Das ist der wichtigste Fund dieser Prüfung, weil er **unabhängig davon**, ob Paste schon
implementiert ist, schon heute über jeden Codepfad auslösbar ist, der einen `image`-Knoten
mit nicht-`data:`-URL erzeugt — und genau das würde die naheliegendste Paste-Umsetzung
(HTML-`<img src="https://...">` unverändert durch `schema.ts`s vorhandene `parseDOM`-Regel
laufen lassen) sofort tun.

**Belegkette:**

- `src/formats/shared/schema.ts:54–67` — `image.parseDOM` übernimmt `img[src]`
  **ungefiltert**, unabhängig vom URL-Schema:
  ```ts
  parseDOM: [{ tag: 'img[src]', getAttrs: (dom) => ({ src: el.getAttribute('src'), ... }) }]
  ```
- `src/formats/docx/writer.ts:72–75` (`imageParagraphXml`) und
  `src/formats/odt/writer.ts:112–115` (`case 'image'` in `blockToOdt`) rufen beide
  ungeprüft `images.add(src)` auf.
- `src/formats/docx/imageCollector.ts:15–21` und `src/formats/odt/imageCollector.ts:14–20`
  — `ImageCollector.add` matcht `src` gegen `/^data:([^;]+);base64,(.*)$/s` und **wirft
  eine Exception** („Bilder müssen als data-URL vorliegen, um eingebettet zu werden.“),
  wenn das fehlschlägt.
- `src/app/DocumentWorkspace.tsx:17–29` (`handleExport`) fängt diese Exception zwar ab und
  zeigt sie sichtbar an (`exportError`, Zeile 14/24–26) — das Dokument bleibt aber bis zur
  manuellen Entfernung des Bild-Knotens **komplett nicht mehr exportierbar**.

Heute ist dieser Pfad nur über künstlich konstruierte `ProseMirrorJSON` erreichbar (der
einzige App-eigene Bildweg, `Toolbar.tsx:97–108`, nutzt immer `FileReader.readAsDataURL`,
liefert also garantiert eine `data:`-URL). **Sobald Einfügen/Drop implementiert wird und
dabei — wie naheliegend — `schema.ts`s bestehende `img[src]`-Regel unverändert weiter
genutzt wird, wird dieser Bug jedes Mal ausgelöst, wenn eine externe HTML-Quelle ein Bild
mit `http(s)://`-Quelle enthält** (der Normalfall bei „aus einer Webseite kopiert“). Das
ist die konkrete Umsetzung des in `einfuegen-req.md` Abschnitt 3.4/Grenzfall 12
befürchteten Falls. **Behebung ist Teil dieses Tickets, nicht optional** (Abschnitt 7
unten, defense-in-depth zusätzlich zur Sanitisierung beim Einfügen selbst).

---

## 2. Bestätigte Funde zu ProseMirrors Paste-Default (Belegstellen)

Gegen `node_modules/prosemirror-view/dist/index.cjs` (Paket-Version `^1.42.0` laut
`package.json`) geprüft, damit Design-Entscheidungen nicht nur angenommen, sondern
belegt werden:

| Frage | Fundstelle | Ergebnis |
|---|---|---|
| Default-Verhalten von `clipboardTextParser` bei reinem `text/plain` | `node_modules/prosemirror-view/dist/index.d.ts:757–763`: „split the text into lines, wrap them in `<p>` tags“ | **Jeder** einzelne Zeilenumbruch wird ein eigener Absatz — keine Unterscheidung Leerzeile vs. einfacher Umbruch. Muss durch eigene Design-Entscheidung ersetzt werden (Abschnitt 3.1). |
| Muss `handlePaste`/`handleDrop` selbst `event.preventDefault()` aufrufen? | `doPaste` (Zeile 3521–3531) → `editHandlers.paste` (Zeile 3538–3544): `if (data && doPaste(...)) event.preventDefault(); else capturePaste(...)`; `handleDrop`-Funktion (Zeile 3600–3622): `if (view.someProp('handleDrop', ...)) { event.preventDefault(); return }` | **Nein** — ProseMirror ruft `event.preventDefault()` selbst auf, sobald der eigene `handlePaste`/`handleDrop`-Prop `true` liefert. Die einzige echte Anforderung: **`true` muss synchron zurückgegeben werden**, bevor irgendeine asynchrone Fortsetzung (Promise/`FileReader`) abgeschlossen ist — sonst läuft parallel noch der Browser-Default bzw. ProseMirrors eigene Slice-Einfügung. Der native Callback selbst darf also asynchron *weiterarbeiten*, muss aber synchron `true` melden. (Präzisiert gegenüber einer früheren Fassung dieses Plans, die fälschlich einen expliziten `preventDefault()`-Aufruf als zwingend darstellte — technisch redundant, aber unschädlich, falls zusätzlich gesetzt.) |
| `handlePaste`-Signatur | `doPaste`, Zeile 3523–3525: `f(view, event, slice \|\| Slice.empty)` | Dritter Parameter `slice` verfügbar (bereits geparstes Ergebnis aus `text/html`/`text/plain`), muss aber nicht entgegengenommen werden (TS erlaubt kürzere Parameterlisten in der Implementierung). |
| `handleDrop`-Signatur | Zeile 3614–3616: `f(view, event, slice \|\| Slice.empty, move)` | Vierter Parameter `move` (true bei internem Drag mit Verschieben) — für den reinen Datei-Drop-Fall irrelevant, da `dragging` dann `null` ist. |
| Baseline: kein Mod-v/Mod-c/Mod-x in `baseKeymap` | `node_modules/prosemirror-commands/dist/index.cjs:636–655` (`pcBaseKeymap`, `macBaseKeymap`) | Bestätigt — natives Strg+V bleibt in jedem Fall erreichbar, unabhängig vom neuen Plugin. |
| jsdom für Unit-Tests verfügbar | `vite.config.ts:11` → `environment: 'jsdom'` | `DOMParser`/`ClipboardEvent`-nahe Konstrukte in Vitest ohne Zusatz-Setup nutzbar (kein `ClipboardEvent`-Polyfill nötig für die reinen Parser-Funktionen, die ohne echtes Event auskommen). |
| Bestehende Bilder sind immer `data:`-URLs | `src/formats/docx/reader.ts:293–296`, `src/formats/odt/reader.ts:219–222`: `node.attrs = { ..., src: \`data:image/${mime};base64,${base64}\` }` | Bestätigt: Reader erzeugen ausschließlich `data:`-URLs; die einzige Quelle für eine **nicht**-`data:`-URL im Dokument ist künftig der Paste-/Drop-Pfad. |

---

## 3. Architektur-Entscheidung & Leitplanken

1. **Neues Modul `src/formats/shared/editor/paste.ts`** bündelt die gesamte Einfügen-/
   Drop-Logik als ProseMirror-Plugin + reine Hilfsfunktionen. `WordEditor.tsx` bindet das
   Plugin nur ein, enthält selbst keine Paste-Logik — analog zum bestehenden Muster
   `pagination.ts` → `createPaginationPlugin()`.
2. **Kein globaler `document`-Listener.** Die gesamte Logik hängt ausschließlich an
   ProseMirror-`EditorProps` (`handlePaste`, `handleDrop`, `transformPastedHTML`,
   `transformPasted`, `clipboardTextParser`), die nur für Events **innerhalb von
   `view.dom`** ausgelöst werden. Das ist zwingend, damit
   - `einfuegen-req.md` Abschnitt 5.1 (Baseline-Rundreise) nicht durch einen zu breit
     greifenden Listener gebrochen wird,
   - Grenzfall 10 (Paste in einem anderen, nicht fokussierten Eingabefeld darf den
     Dokumentinhalt nicht verändern) strukturell erfüllt ist — es gibt aktuell ohnehin
     kein zweites Texteingabefeld in der App, an das ein globaler Listener andocken
     könnte (verifiziert: `App.tsx`/`DocumentWorkspace.tsx`/`FormatPicker.tsx` enthalten
     keine weiteren `contentEditable`/`<textarea>`/`<input type="text">`-Elemente außer
     dem versteckten Datei-Input).
3. **Kein `event.preventDefault()` auf `contextmenu`** wird ergänzt — natives Kontextmenü
   bleibt unverändert erreichbar.
4. **Schema-Erweiterungen sind nicht nötig.** `paragraph`, `heading`, `hard_break`,
   `image`, Listen- und Tabellen-Knoten sowie alle Marks aus `schema.ts` decken den in
   Abschnitt 3.4 der Anforderungsdatei geforderten Umfang bereits ab (siehe Abschnitt 5
   unten für die Detailbegründung inkl. Testpflicht).
5. **`imageFallbackText` lebt dependency-frei in `src/formats/shared/imageFallback.ts`**
   (neue Datei), **nicht** in `shared/editor/paste.ts`. Begründung, aus dem bestehenden
   Import-Graphen abgeleitet: `docx/writer.ts:2` importiert bereits
   `WordDocumentContent` aus `../shared/documentModel`, das seinerseits (Zeile 1) nur
   einen **Typ** aus `./schema` importiert — der Reader/Writer-Layer ist also bewusst
   frei von jeder Abhängigkeit auf `prosemirror-model`/`prosemirror-view`/React, die
   `shared/editor/*` zwangsläufig mitbringt (`paste.ts` müsste `Slice`/`ResolvedPos` aus
   `prosemirror-model` importieren). Diesen Layer-Schnitt beizubehalten ist keine
   Nice-to-have-Empfehlung, sondern verhindert, dass der reine XML-String-Writer künftig
   ProseMirror/React als Laufzeitabhängigkeit mitschleppt. `imageFallback.ts` exportiert
   nur eine reine Funktion, wird von `paste.ts` **und** von `docx/writer.ts`/
   `odt/writer.ts` importiert.

---

## 4. Verbindliche Design-Entscheidungen zu offenen Fragen der Spezifikation

### 4.1 Klartext-Zeilenumbrüche (Anforderung Abschnitt 3.3)
- **Leerzeilen-getrennte Blöcke → eigener `paragraph`-Knoten.**
- **Einzelne Zeilenumbrüche innerhalb eines Blocks → `hard_break`**, kein zusätzlicher
  Absatz. Ersetzt das in Abschnitt 2 oben belegte Bibliotheks-Default durch eine eigene
  `clipboardTextParser`-Implementierung. Diese Wahl ist die einzige, die Anforderung 3.1
  („Text davor/danach im selben Absatz bleibt exakt erhalten“) und 3.3 gleichzeitig ohne
  Widerspruch erfüllt: ein Klartext-Paste **ohne** Leerzeile mitten in einen bestehenden
  Absatz fügt reinen Inline-Inhalt ein (keine neue Absatzgrenze), ein Paste **mit**
  Leerzeile(n) splittet in mehrere Absätze (Standard-„open slice“-Verhalten von
  ProseMirror beim Einfügen, siehe Abschnitt 3.2 der Anforderung).

### 4.2 Bilder mit externer URL beim Einfügen (Anforderung Abschnitt 3.4, 3.5)
- **Kein automatischer Netzwerk-Fetch/Einbettung.** `fetch()` auf eine beliebige
  Fremd-URL scheitert praktisch überwiegend an CORS (Byte-Zugriff via `fetch`/`XHR` ist
  nicht dasselbe Privileg wie reine `<img>`-Anzeige), und selbst im Erfolgsfall würde eine
  synchrone Nutzeraktion („Einfügen“) von unvorhersehbarer Netzwerklaufzeit abhängen —
  widerspricht Grenzfall 4 („UI friert nicht ein“).
- **Fallback:** Das `<img>`-Element wird durch sichtbaren Platzhaltertext ersetzt:
  `[Bild: <alt>]` falls `alt` vorhanden, sonst `[Bild nicht eingebettet]`. Umgebender
  Text bleibt vollständig erhalten. Zusätzlich erscheint eine sichtbare, nicht-
  blockierende Banner-Meldung im Editor (Abschnitt 6.2), damit die Ersetzung nicht als
  stiller Fehlschlag zählt (Anforderung 3.9, Hauptspezifikation Abschnitt 20.4).
- **Verteidigung in der Tiefe:** Zusätzlich zur Sanitisierung beim Einfügen wird der
  Export (`docx/writer.ts`, `odt/writer.ts`) gehärtet, damit ein nicht-`data:`-Bild
  **niemals** den gesamten Export abbricht (Abschnitt 7) — unabhängig davon, ob der
  Knoten über Paste, Drop oder einen künftigen anderen Pfad ins Dokument gelangt.

### 4.3 „Einfügen ohne Formatierung“ (Anforderung Abschnitt 3.7, Backlog-Slug `einfuegen-unformatiert`)
- Tastenkombination `Mod-Shift-v`.
- **Nicht** über das native `paste`-Event umgesetzt (Browser unterscheiden Strg+V und
  Strg+Umschalt+V nicht auf Ereignisebene — beide lösen dasselbe `paste`-DOM-Event aus).
  Stattdessen eine eigene `keymap`-Bindung, die die Standardaktion verhindert und
  **asynchron** `navigator.clipboard.readText()` liest (liefert ohnehin nur Klartext —
  passt exakt zur Zielsemantik „nur Text, keine Formatierung“).
- Mehrere Leerzeilen-getrennte Absätze aus der Quelle bleiben als mehrere `paragraph`-
  Knoten erhalten; **nur der erste** übernimmt den Blocktyp der Zielposition (z. B. bleibt
  eine Überschrift eine Überschrift), alle weiteren werden `paragraph` — einzige
  widerspruchsfreie Lesart von „übernimmt das Absatzformat der Zielposition“ (Singular)
  bei mehreren neu entstehenden Blöcken, entspricht beobachtbarem Word/LibreOffice-
  Verhalten.
- Leerer Zwischenablage-Text → stiller No-Op (Ausnahme laut Abschnitt 3.9 der
  Anforderung). Abgelehnte Berechtigung/Exception → sichtbare Fehlermeldung (Banner).

### 4.4 Toolbar-Buttons „Einfügen“/„Einfügen ohne Formatierung“ (Anforderung Abschnitt 1, #4/#5)
Laut Anforderungsdatei explizit **Nice-to-have, kein Blocker** für die Freigabe von
`einfuegen`. Werden als **P1** eingeordnet (Abschnitt 6 unten) und **nicht** vorausgesetzt,
damit `einfuegen` (P0) eigenständig abnahmefähig bleibt.

### 4.5 Kontextmenü (Anforderung Abschnitt 1, #2)
**Entscheidung: kein eigenes Kontextmenü**, natives Browser-Kontextmenü bleibt einzige
Umsetzung. Wird durch einen Regressionstest abgesichert, der bestätigt, dass kein
`contextmenu`-Handler `preventDefault()` aufruft (automatisierbarer Ersatz für die laut
Anforderung Abschnitt 6.3 ausdrücklich manuell zu prüfende echte Menü-Optik).

---

## 5. ProseMirror-Schema — Detailplan

**Keine Änderung an `src/formats/shared/schema.ts` nötig für Einfügen selbst.** Belegt:

- Verschachtelte Listen: `list_item` erlaubt `paragraph block*` (Zeile 99), `block`
  schließt `bullet_list`/`ordered_list` ein (beide `group: 'block'`, Zeilen 74/83) — eine
  eingefügte `<ul><li>...<ul>...</ul></li></ul>`-Struktur passt ProseMirrors
  Slice-„Fit“-Algorithmus (`prosemirror-transform`, `Transform.replace`/
  `replaceSelection`) automatisch ein.
- Tabellenzellen: `cellContent: 'block+'` aus `tableNodes({ tableGroup: 'block', ... })`
  (Zeile 106) erlaubt beliebige Block-Inhalte inkl. verschachtelter `table`-Knoten (da
  `table` selbst `tableGroup: 'block'` trägt) — eine eingefügte verschachtelte Tabelle
  wird strukturell akzeptiert, nicht abgelehnt (Grenzfall 7 der Anforderung: „kein
  Absturz“ ist damit strukturell erfüllt; „lesbar“ ist separat per Test zu bestätigen).
- `heading.content = 'inline*'` (Zeile 21) — fügt man mehrabsätzigen Inhalt in eine
  Überschrift ein, kann ProseMirror keinen Block-Inhalt darin unterbringen; der
  Fit-Algorithmus spaltet automatisch auf (Rest wandert in einen neuen, nachfolgenden
  Absatz). Das ist Bibliotheksverhalten und **muss per Test verifiziert werden**
  (Abschnitt 8.1), nicht als Annahme in die Abnahme übernommen werden.

Sollte ein Test hier ein Fehlverhalten aufdecken, ist das ein Nachtrag zu diesem Plan,
kein vorab angenommener Fakt.

---

## 6. Datei-für-Datei-Umsetzungsplan

### 6.1 NEU: `src/formats/shared/imageFallback.ts`

Dependency-freie Konstante/Funktion, von `paste.ts` **und** beiden Writern importiert
(Begründung: Abschnitt 3, Punkt 5).

```ts
/** Placeholder text shown/exported whenever an image cannot be embedded because its
 *  `src` is not a `data:` URL (external HTTP(S) image from pasted/dropped HTML, or any
 *  other non-data-URL source). Single source of truth so the on-screen paste banner and
 *  the DOCX/ODT export fallback always say the same thing. */
export function imageFallbackText(alt: string | null | undefined): string {
  const trimmed = (alt ?? '').trim()
  return trimmed ? `[Bild: ${trimmed}]` : '[Bild nicht eingebettet]'
}

/** True for exactly the `src` values ImageCollector.add() in both formats accepts. */
export function isEmbeddableImageSrc(src: string): boolean {
  return /^data:[^;]+;base64,/i.test(src)
}
```

`isEmbeddableImageSrc` wird zusätzlich exportiert, damit `paste.ts` **und** beide
`imageCollector.ts`/Writer dieselbe Prüfregel verwenden (kein zweites, potenziell
abweichendes Regex an vier Stellen).

### 6.2 NEU: `src/formats/shared/editor/paste.ts`

Zentrales Modul. Exportierte Bausteine:

```ts
import { Slice, type ResolvedPos, type Schema } from 'prosemirror-model'
import { Plugin } from 'prosemirror-state'
import type { EditorView } from 'prosemirror-view'
import { wordSchema } from '../schema'
import { imageFallbackText, isEmbeddableImageSrc } from '../imageFallback'

/** Pure: splits clipboard plain text into paragraphs (blank-line separated) of lines
 *  (single-newline separated). No ProseMirror types involved — independently
 *  unit-testable without a Schema/EditorView. */
export function splitPlainTextIntoParagraphs(text: string): string[][] {
  const normalized = text.replace(/\r\n?/g, '\n')
  return normalized.split(/\n{2,}/).map((block) => block.split('\n'))
}

/** Builds the Slice ProseMirror inserts for a plain-text paste (Abschnitt 4.1): a
 *  single paragraph-chunk yields an inline-only, edge-open Slice that merges into the
 *  surrounding paragraph; multiple chunks yield `paragraph` nodes with `hard_break`
 *  between the lines of each chunk, edges still open so the first/last chunk merge into
 *  the surrounding block (mirrors ProseMirror's own default open-slice behavior, only
 *  with the blank-line/single-newline distinction added). */
export function plainTextClipboardParser(text: string, $context: ResolvedPos, schema: Schema): Slice { /* impl. below */ }

/** transformPastedHTML: strips <script>/<style>/<meta>/<link> and Word/Office
 *  conditional comments (`<!--[if ...]>...<!--[endif]-->`), and rewrites any `<img>`
 *  whose `src` is not embeddable (`isEmbeddableImageSrc`) into the fallback text from
 *  `imageFallbackText`. Everything else is left to the existing `schema.ts` parseDOM
 *  rules / ProseMirror's own fallback. */
export function sanitizePastedHtml(html: string): string { /* impl. below */ }

/** transformPasted: node-level defense in depth — walks the already-parsed Slice and
 *  replaces any surviving non-embeddable `image` node with a `paragraph` node containing
 *  the same fallback text (wrapped in `paragraph`, not bare `text`, because `image` is a
 *  `group: 'block'` node — replacing it in place with an inline `text` node would break
 *  Fragment validity). Covers the drop path and any future code path that bypasses
 *  `sanitizePastedHtml`. */
export function sanitizePastedSlice(slice: Slice, schema: Schema): Slice { /* impl. below */ }

export interface PastePluginOptions {
  /** Called with a user-visible message whenever an implicit, silent failure would
   *  otherwise occur (Anforderung 3.9) — e.g. an external image got replaced by a
   *  placeholder, or an image-blob paste/drop failed to decode. */
  onNotice: (message: string) => void
}

/** The plugin wired into WordEditor.tsx's plugins array. */
export function createPastePlugin(options: PastePluginOptions): Plugin {
  return new Plugin({
    props: {
      transformPastedHTML: (html) => sanitizePastedHtml(html),
      transformPasted: (slice) => sanitizePastedSlice(slice, wordSchema),
      clipboardTextParser: (text, $context) => plainTextClipboardParser(text, $context, wordSchema),

      // Anforderung 3.5: image-only clipboard content (no accompanying text/html).
      handlePaste(view, event) {
        const dt = event.clipboardData
        if (!dt || dt.types.includes('text/html')) return false
        const imageItem = Array.from(dt.items).find((i) => i.type.startsWith('image/'))
        const file = imageItem?.getAsFile()
        if (!file) return false
        insertImageFile(view, file).catch(() =>
          options.onNotice('Bild aus der Zwischenablage konnte nicht eingefügt werden.'),
        )
        return true // synchronous — see Abschnitt 2 (prosemirror-view calls preventDefault() for us)
      },

      // Anforderung 1 #6 (Drag & Drop): plain OS/file-explorer image drops have no HTML
      // slice — text/HTML drags already run through transformPasted/transformPastedHTML
      // above (handleDrop's own fallback path calls parseFromClipboard + those props
      // before ever reaching our handleDrop, see prosemirror-view/dist/index.cjs:3600–3612),
      // so only the pure-file case needs custom handling here.
      handleDrop(view, event) {
        const dt = event.dataTransfer
        if (!dt || dt.files.length === 0 || dt.types.includes('text/html')) return false
        const file = Array.from(dt.files).find((f) => f.type.startsWith('image/'))
        if (!file) return false
        const coords = view.posAtCoords({ left: event.clientX, top: event.clientY })
        insertImageFile(view, file, coords?.pos).catch(() =>
          options.onNotice('Bild konnte nicht eingefügt werden.'),
        )
        return true
      },
    },
  })
}

/** "Einfügen ohne Formatierung" (Abschnitt 4.3) — bound to Mod-Shift-v in the keymap.
 *  Reads navigator.clipboard.readText(); empty string is a silent no-op; rejection
 *  calls onError with a user-visible message. */
export async function pasteAsPlainText(view: EditorView, onError: (message: string) => void): Promise<void> {
  let text: string
  try {
    text = await navigator.clipboard.readText()
  } catch {
    onError('Zwischenablage konnte nicht gelesen werden (Berechtigung verweigert?).')
    return
  }
  if (!text) return // empty clipboard: silent no-op, Anforderung 3.9 exception
  const { $from } = view.state.selection
  const slice = plainTextClipboardParser(text, $from, wordSchema)
  view.dispatch(view.state.tr.replaceSelection(slice).scrollIntoView())
}

/** Shared by the paste-plugin's image-blob branch and the (P1) toolbar rich-paste
 *  button: decodes a File/Blob to a data URL and inserts it as an `image` node, in
 *  exactly one transaction/undo step (Anforderung 3.8). If `pos` is given (drop case),
 *  the node replaces the zero-length range at that position instead of the current
 *  selection — using `tr.replaceRangeWith` directly (rather than dispatching a separate
 *  "move selection" transaction first) avoids splitting drop-insert into two undo
 *  entries. Node attrs (`src`/`alt`) match exactly what `insertImage` in `./commands`
 *  creates for the Toolbar's file-picker path, so default sizing/attrs stay identical
 *  regardless of entry point. */
export async function insertImageFile(view: EditorView, file: File, pos?: number): Promise<void> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
  const { state, dispatch } = view
  const node = wordSchema.nodes.image.create({ src: dataUrl, alt: file.name })
  const from = pos ?? state.selection.from
  const to = pos ?? state.selection.to
  dispatch(state.tr.replaceRangeWith(from, to, node).scrollIntoView())
}
```

**Implementierungsdetail `plainTextClipboardParser`:** baut aus
`splitPlainTextIntoParagraphs` pro Chunk abwechselnd `schema.text(line)` und
`schema.nodes.hard_break.create()`; bei genau einem Chunk eine rein-inline `Slice` mit
`openStart`/`openEnd` passend zur Umgebung (kein neuer `paragraph`-Wrapper), bei mehreren
Chunks eine `Slice` aus mehreren `paragraph`-Knoten mit offenen Rändern.

**Implementierungsdetail `sanitizePastedHtml`/`sanitizePastedSlice`:** beide nutzen
`isEmbeddableImageSrc` aus `../imageFallback`, nicht ein zweites, lokal dupliziertes
Regex — einzige Quelle der Wahrheit für „ist dieses `src` einbettbar“.

### 6.3 GEÄNDERT: `src/formats/shared/editor/WordEditor.tsx`

- Import `createPastePlugin`, `pasteAsPlainText` aus `./paste`.
- Neuer lokaler State für sichtbares Feedback (Anforderung 3.9), analog zum bestehenden
  Muster in `DocumentWorkspace.tsx` (`exportError`, Zeile 14/24–26):
  ```tsx
  const [pasteNotice, setPasteNotice] = useState<string | null>(null)
  ```
- Plugin-Array (Zeilen 69–86) ergänzen um `createPastePlugin({ onNotice: setPasteNotice })`
  (Position unkritisch; sinnvoll neben `dropCursor()`/`gapCursor()` einordnen, da alle vier
  mit Drag/Drop bzw. Cursor-Darstellung zusammenhängen).
- `keymap({...})` (Zeilen 71–79) ergänzen um:
  ```ts
  'Mod-Shift-v': (_state, _dispatch, view) => {
    if (view) void pasteAsPlainText(view, setPasteNotice)
    return true
  },
  ```
  Muss **vor** `keymap(baseKeymap)` registriert bleiben (bereits durch bestehende
  Reihenfolge Zeile 71 vor Zeile 80 sichergestellt).
- Rendering: Banner unterhalb der Toolbar, nur wenn `pasteNotice` gesetzt ist:
  ```tsx
  {pasteNotice && (
    <div role="status" className="px-3 py-1.5 text-xs bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 flex items-center justify-between">
      <span>{pasteNotice}</span>
      <button type="button" onClick={() => setPasteNotice(null)} aria-label="Meldung schließen" className="ml-2">×</button>
    </div>
  )}
  ```
  `role="status"` (nicht `role="alert"` wie in `FormatPicker.tsx:44`), da es sich um eine
  informative Rückmeldung handelt, keinen blockierenden Fehler — Export bleibt trotzdem
  möglich (Bild wurde ja bereits sauber durch Platzhaltertext ersetzt).
- **Keine Änderung** an `reconcileSelectionOnClick` (Zeilen 42–53) nötig: Paste läuft
  immer über eine reguläre, von `dispatchTransaction` verarbeitete Transaktion — auch der
  asynchrone Bild-Zweig dispatcht am Ende ganz normal über `view.dispatch`. Der bekannte
  Selection-Sync-Bug entsteht nur bei einer DOM-Mutation **ohne** Transaktion, was hier
  nirgends der Fall ist. Trotzdem muss ein expliziter Regressionstest das bestätigen
  (Abschnitt 8.2, Testfall „Paste + Klick + Enter“).

### 6.4 GEÄNDERT (P1, optional): `src/formats/shared/editor/Toolbar.tsx`

Nicht erforderlich für die Freigabe von `einfuegen` (Abschnitt 4.4). Falls umgesetzt:

- Zwei neue Buttons „Einfügen“/„Einfügen ohne Formatierung“ nach dem Muster der
  bestehenden Buttons (Zeilen 135–244).
- „Einfügen“-Button: `navigator.clipboard.read()` → `ClipboardItem[]`, Priorität
  `text/html` → `text/plain` → `image/*`; HTML über
  `PmDomParser.fromSchema(wordSchema).parse(...)` **nach** Durchlauf durch
  `sanitizePastedHtml` (Wiederverwendung, keine zweite Sanitize-Implementierung),
  Klartext über `plainTextClipboardParser`, Bild über `insertImageFile`. Rejection
  (Berechtigung verweigert) → sichtbare Meldung (Pflichtvorgabe der Anforderungsdatei
  Abschnitt 1 #4).
- „Einfügen ohne Formatierung“-Button: ruft `pasteAsPlainText(view, onNotice)` auf.
- Kein Klick-Handler darf still fehlschlagen.

### 6.5 GEÄNDERT: `src/formats/shared/editor/commands.ts`

**Keine strukturelle Änderung.** `insertImage` (Zeilen 66–74) bleibt unverändert und wird
weiterhin von `Toolbar.tsx`s `handleImagePick` für den Datei-Auswahl-Weg genutzt.
`paste.ts`s `insertImageFile` dupliziert **nicht** die Knoten-Attribute (`src`/`alt`) neu,
sondern erzeugt den `image`-Knoten mit denselben zwei Attributen wie `insertImage` — nur
über `tr.replaceRangeWith(from, to, node)` statt `tr.replaceSelectionWith(node)`, weil der
Drop-Fall eine vom aktuellen `state.selection` abweichende Zielposition (`pos` aus
`view.posAtCoords(...)`) in **derselben** Transaktion treffen muss (sonst zwei
Undo-Schritte statt einem, siehe Anforderung 3.8). Falls künftig weitere Attribute zu
`insertImage` hinzukommen, muss `insertImageFile` synchron mitgepflegt werden — beide
sollten in einem Review gemeinsam geändert werden, auch wenn sie keine gemeinsame
Funktion mehr teilen.

### 6.6 `src/formats/shared/schema.ts`

**Keine Änderung** — siehe Abschnitt 5.

---

## 7. Import/Export-Anpassungen OOXML (DOCX) und ODF (ODT)

Härtung gegen den in Abschnitt 1 beschriebenen Export-Absturz — **erforderlich, nicht
optional**, als zweiter Schutzwall unabhängig von der Paste-Sanitisierung (Abschnitt 4.2).

### 7.1 `src/formats/docx/writer.ts` — `imageParagraphXml` (Zeilen 72–92)

```ts
import { imageFallbackText, isEmbeddableImageSrc } from '../shared/imageFallback'

function imageParagraphXml(node: JsonNode, images: ImageCollector, rels: RelationshipRegistry): string {
  const src = String(node.attrs?.src ?? '')
  const alt = String(node.attrs?.alt ?? '')
  if (!isEmbeddableImageSrc(src)) {
    // Never let a non-data-URL image reference abort the whole export
    // (einfuegen-req.md Abschnitt 3.4/Grenzfall 12) — fall back to visible text.
    return `<w:p>${paragraphPropsXml('left')}<w:r><w:t xml:space="preserve">${escapeXml(imageFallbackText(alt))}</w:t></w:r></w:p>`
  }
  const fileName = images.add(src)
  // ... unverändert ab hier (relId/cx/cy/Drawing-XML, Zeilen 75–91)
}
```

### 7.2 `src/formats/odt/writer.ts` — `blockToOdt`, `case 'image'` (Zeilen 112–119)

```ts
import { imageFallbackText, isEmbeddableImageSrc } from '../shared/imageFallback'

case 'image': {
  const src = String(node.attrs?.src ?? '')
  if (!isEmbeddableImageSrc(src)) {
    return `<text:p>${escapeXml(imageFallbackText(String(node.attrs?.alt ?? '')))}</text:p>`
  }
  const fileName = images.add(src)
  // ... unverändert ab hier (width/height/draw:frame-XML, Zeilen 115–118)
}
```

**Wichtige Korrektur gegenüber einer ersten Skizze dieses Plans:** Eine frühere Fassung
deklarierte hier zusätzlich `const alt = escapeXml(...)`, ohne die Variable zu verwenden.
Das hätte `tsc -b` mit `noUnusedLocals: true` (`tsconfig.app.json`) zum Scheitern
gebracht — der Build bricht bei **jeder** ungenutzten lokalen Variablen ab, nicht nur bei
Lint-Warnungen. Die obige Fassung vermeidet das, indem `alt`/das Ergebnis von
`imageFallbackText` direkt und einmalig verwendet werden. **Jede Umsetzung muss
`npm run build` (bzw. `tsc -b`) nach dieser Änderung tatsächlich laufen lassen**, nicht
nur `npm test` — `noUnusedLocals`/`noUnusedParameters` sind beides `true` und werden von
Vitest/Playwright nicht geprüft, nur vom TS-Compiler-Schritt des Build-Skripts.

### 7.3 `src/formats/docx/imageCollector.ts` / `src/formats/odt/imageCollector.ts`

**Keine Änderung nötig.** Beide `add()`-Methoden bleiben strikt (werfen weiterhin bei
nicht-`data:`-URLs) — das ist jetzt unschädlich, weil beide Writer `isEmbeddableImageSrc`
**vor** dem Aufruf von `images.add(src)` prüfen und im negativen Fall gar nicht mehr bis
dorthin kommen. Die bestehende, strikte Prüfung in `ImageCollector.add` bleibt als
zusätzliche Absicherung erhalten (fail-fast, falls doch einmal ein Aufrufer die neue
Prüfung vergisst).

### 7.4 Rundreise-Verhalten

Ein Dokument mit einem (durch Paste entstandenen) externen Bild-Platzhalter exportiert
jetzt fehlerfrei als DOCX/ODT; beim Reimport kommt der Platzhaltertext als normaler
`paragraph`/`text`-Knoten zurück (kein `image`-Knoten mehr, da nie einer geschrieben
wurde) — das ist bewusst **kein** Rundreiseverlust im Sinne der Anforderung, weil nie ein
embedd-fähiges Bild vorhanden war; der **Text** (Platzhalter) übersteht die Rundreise
korrekt, was das eigentliche Kriterium ist („Textverlust ist es nicht“, Anforderung
Abschnitt 5).

Für **eingebettete** (Data-URI-)Bilder aus Paste (Anforderung Abschnitt 3.5/5.2 Testfall
5) ist **keine** Writer-Änderung nötig — sie durchlaufen exakt denselben, bereits
vorhandenen `images.add(src)`-Pfad wie ein über die Toolbar eingefügtes Bild.

---

## 8. Tests

### 8.1 Unit-Tests (Vitest, jsdom — siehe Abschnitt 2, `vite.config.ts:11`)

Neue Datei `src/formats/shared/editor/__tests__/paste.test.ts`:

| Funktion | Testfälle |
|---|---|
| `splitPlainTextIntoParagraphs` | einzeiliger Text (1 Chunk/1 Zeile); mehrzeilig ohne Leerzeile (1 Chunk/N Zeilen); zwei Leerzeilen-getrennte Blöcke (2 Chunks); `\r\n`-Normalisierung; Tabulatorzeichen bleibt in der Zeile (Grenzfall 6); Emoji/Zeichen außerhalb BMP bleiben als vollständige Surrogatpaare erhalten (Grenzfall 5) |
| `plainTextClipboardParser` | 1-Chunk-Ergebnis ist rein inline (kein neuer `paragraph`); Mehrfach-Chunk-Ergebnis liefert `paragraph`-Knoten mit `hard_break` an einfachen Zeilenumbrüchen |
| `sanitizePastedHtml` | entfernt `<script>`/`<style>`; entfernt Word-`<!--[if ...]>...<!--[endif]-->`-Kommentare (Fixture mit `mso-list`-Fragment); ersetzt `<img src="https://...">` durch Platzhaltertext; lässt `<img src="data:image/png;base64,...">` unverändert; lässt `p`/`strong`/`ul`/`table` unverändert |
| `sanitizePastedSlice` | Slice mit `image`-Knoten (nicht-embeddable) → wird zu `paragraph` mit Platzhaltertext, keine Fragment-Validierungsfehler; Slice mit `data:`-Bild bleibt unverändert |
| `imageFallbackText`/`isEmbeddableImageSrc` (aus `shared/imageFallback.ts`) | mit/ohne `alt`; `data:image/...;base64,...` → `true`; `https://...`/leerer String/`blob:...` → `false` |

Ergänzung bestehender Roundtrip-Unit-Tests (`src/formats/docx/__tests__/roundtrip.test.ts`,
`src/formats/odt/__tests__/roundtrip.test.ts`, Muster siehe dortige `doc()`/`paragraph()`-
Helper): neuer Testfall „`image`-Knoten mit externer `https://`-URL exportiert ohne
Exception, Ergebnis enthält Platzhaltertext statt Bild-XML“ — direkter Regressionstest für
Abschnitt 1.

### 8.2 E2E-Tests (Playwright)

Neue Datei `tests/e2e/paste.spec.ts`, Aufbau wie `tests/e2e/selection-regression.spec.ts`
(`page.goto('/')` → Privacy-Banner wegklicken → Dokument per „Neu erstellen“ öffnen →
`page.locator('.ProseMirror')`). Zentrale Technik laut Anforderung Abschnitt 6.1:
`ClipboardEvent` mit synthetischem `DataTransfer` per `page.evaluate(...)` direkt auf
`.ProseMirror` dispatchen:

```ts
async function pasteHtml(page: Page, html: string, text?: string) {
  await page.evaluate(({ html, text }) => {
    const dt = new DataTransfer()
    dt.setData('text/html', html)
    if (text) dt.setData('text/plain', text)
    document.querySelector('.ProseMirror')!.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }),
    )
  }, { html, text })
}
```

Testfälle (Nummerierung folgt `einfuegen-req.md`):

1. **3.1** Einfügen an leerer Cursor-Position mitten im Absatz → Text davor/danach exakt
   erhalten, Cursor unmittelbar hinter Eingefügtem.
2. **3.2** Einfügen über Selektion (Wort, ganzer Absatz, `Strg+A`) → Selektion ersetzt.
3. **3.3** Klartext-Paste ohne `text/html`: ein Absatz ohne Leerzeile bleibt im selben
   `<p>`; zwei Leerzeilen-getrennte Blöcke ergeben zwei `<p>`; einzelner Zeilenumbruch
   erzeugt `<br>` (`hard_break`), keinen neuen `<p>`.
4. **3.4** Formatiertes HTML (fett/kursiv/unterstrichen/durchgestrichen/Farbe/Highlight/
   Überschriften 1–6/Listen/Bild mit `data:`-Quelle/Tabelle) → sinnvoll übernommen.
5. **3.4 Grenzfall** `<img src="https://example.invalid/x.png">` einfügen → Bild
   erscheint **nicht**, Platzhaltertext ist sichtbar, umgebender Text bleibt vollständig,
   nachfolgender Export schlägt **nicht** fehl (deckt Abschnitt 1 + 7 auf E2E-Ebene ab).
6. **3.5** Bild-Zwischenablage ohne HTML (`clipboardData` nur mit `image/png`-Eintrag,
   via `DataTransferItem`-Konstruktion aus einem `Blob`) → Bild erscheint als `image`-
   Knoten mit Data-URI.
7. **3.6** Paste mehrerer Absätze in einem `list_item` → keine Duplizierung/kein
   Aufbrechen der Liste; Paste verschachtelter `<ul><li>...<ul>...` → verschachtelte
   Liste im Ergebnis. Paste in einer Tabellenzelle → Struktur bleibt auf die Zelle
   beschränkt. Paste mehrzeiligen Inhalts in eine Überschrift → Rest landet im
   nachfolgenden Absatz (`heading` bleibt reines `inline*`, siehe Abschnitt 5).
8. **3.7** `Mod-Shift-v` mit vorab per `navigator.clipboard.writeText`
   (`context.grantPermissions(['clipboard-read','clipboard-write'])`) gesetztem,
   absichtlich HTML-artigem Text → Ergebnis ist reiner Text ohne Marks, im Absatzformat
   der Zielposition.
9. **3.8** Paste → `Strg+Z` → Originalzustand inkl. Selektion; `Strg+Y` → wieder
   eingefügter Zustand. Ein einzelner Paste-Vorgang erzeugt genau einen
   Undo-Historien-Eintrag.
10. **3.9** Leere Zwischenablage bei `Mod-Shift-v` → kein Banner, keine Änderung.
    Erzwungene Rejection von `navigator.clipboard.readText` (z. B. `context.clearPermissions()`)
    → sichtbares Banner erscheint.
11. **Pflicht-Regressionstest** (Hauptspezifikation Abschnitt 2, Anforderung Grenzfall 13):
    Text tippen → Paste (HTML) über eine `Strg+A`-Selektion → Klick zur Neupositionierung
    → `Enter` → weitertippen → kein unbeabsichtigter Komplettverlust — als neuer `test()`
    in `selection-regression.spec.ts` ergänzt (im bestehenden Regressions-Describe-Block).
12. **Grenzfall 1–3** (Dokumentanfang/-ende/leeres Dokument), **Grenzfall 9**
    (wiederholtes schnelles Paste hintereinander).
13. **Kontextmenü-Guard** (Abschnitt 4.5): `contextmenu`-Event auf `.ProseMirror`
    dispatchen, `event.defaultPrevented === false` erwarten.
14. **Drag & Drop** (Anforderung Abschnitt 1 #6): `drop`-Event mit `text/html`-Payload →
    kein Absturz, Inhalt erscheint; `drop`-Event mit reinem Bild-`File` (kein HTML) →
    Bild erscheint als `image`-Knoten am Drop-Punkt.

**Nicht automatisierbar, laut Anforderung Abschnitt 6.3 ausdrücklich manuell:** Copy-Paste
aus einer echten, lokal installierten Word-/LibreOffice-Writer-Instanz (Grenzfall 14) —
offener manueller Abnahmeschritt, protokolliert in Abschnitt 10. IME-Komposition
(Grenzfall 8): strukturell keine Interferenz zu erwarten, da die Paste-Hooks nur auf
`paste`/`drop`, nicht auf `compositionupdate` reagieren — als Begründung dokumentiert,
kein automatisierter Test möglich.

### 8.3 Rundreise-Tests (Anforderung Abschnitt 5)

- **5.1 Baseline:** bestehende Tests (`docx.spec.ts`, `odt.spec.ts`,
  `roundtrip.test.ts` beider Formate) müssen vor **und** nach den Code-Änderungen
  weiterhin grün laufen — insbesondere weil `createPastePlugin` neue `props` registriert,
  die potenziell mit `columnResizing()`/`tableEditing()`/`dropCursor()`/`gapCursor()`
  interagieren könnten (kein bekannter Konflikt, aber zu verifizieren).
- **5.2 Feature-Rundreise:** in `paste.spec.ts` je Testfall 1–8 der Tabelle in Anforderung
  Abschnitt 5.2 zusätzlich: nach dem Einfügen exportieren (`page.waitForEvent('download')`,
  Muster wie in `docx.spec.ts`), Datei mit `JSZip` laden, erwarteten Inhalt im XML
  verifizieren, danach reimportieren und erneut im Editor prüfen. Cross-Format: einmal
  DOCX-Karte → ODT-Export, einmal umgekehrt.

---

## 9. Grenzfälle-Mapping (Anforderung Abschnitt 4)

| # | Grenzfall | Umsetzung |
|---|---|---|
| 1 | Position 0 | Kein Zusatzcode — Standard-`Transform.replace`-Verhalten, Test 8.2 #12 |
| 2 | Dokumentende | wie #1 |
| 3 | Leeres Dokument | wie #1 (einzelner leerer `paragraph` wird durch `replaceSelection` korrekt ersetzt/erweitert) |
| 4 | Große Textmenge | Keine Sonderbehandlung nötig; `pagination.ts` reagiert bereits entkoppelt, blockiert UI nicht zusätzlich durch Paste |
| 5 | BMP-außerhalb-Zeichen (Emoji) | Alle Funktionen in `paste.ts` arbeiten auf JS-Strings (UTF-16) ohne manuelle Indizierung, die Surrogatpaare zerschneiden könnte → Test 8.1 |
| 6 | Tab-Zeichen | Kein Code in `paste.ts` rührt `\t` an → bleibt erhalten, Test 8.1 |
| 7 | Verschachtelte Tabelle | Schema erlaubt es strukturell (Abschnitt 5) → Test verifiziert „kein Absturz, lesbarer Inhalt“ |
| 8 | IME-Komposition | strukturell keine Interferenz (Abschnitt 8.2), nur eingeschränkt automatisiert prüfbar |
| 9 | Wiederholtes schnelles Paste | jede Paste-Transaktion unabhängig, kein gemeinsamer State in `paste.ts` → Test 8.2 #12 |
| 10 | Fokus außerhalb Editor | durch Plugin-Scoping (Abschnitt 3, Punkt 2) strukturell ausgeschlossen |
| 11 | `text/html` + `text/plain` gleichzeitig | Standard-Browserverhalten (HTML gewinnt) bleibt unverändert — `transformPastedHTML` greift nur bei vorhandenem HTML, `clipboardTextParser` nur bei dessen Fehlen |
| 12 | Bild ohne HTML | Anforderung Abschnitt 3.5 jetzt implementiert, siehe 6.2/8.2 #6 |
| 13 | Paste + Toolbar-Aktion danach | Test 8.2 #11 |
| 14 | Echtes Word/LibreOffice Copy-Paste | manuell, siehe Abschnitt 10 |

---

## 10. Reihenfolge der Umsetzung

1. **Bugfix zuerst, unabhängig vom Rest:** `src/formats/shared/imageFallback.ts` anlegen,
   Härtung von `docx/writer.ts`/`odt/writer.ts` (Abschnitt 7) + Unit-Tests — behebt den
   bestehenden Exportabsturz-Bug für jeden Codepfad, unabhängig davon, ob Paste schon
   fertig ist. **`npm run build` danach ausführen** (siehe Warnung Abschnitt 7.2).
2. `src/formats/shared/editor/paste.ts` mit den reinen Funktionen
   (`splitPlainTextIntoParagraphs`, `sanitizePastedHtml`, `sanitizePastedSlice`) +
   Unit-Tests (Abschnitt 8.1).
3. `clipboardTextParser`/`transformPastedHTML`/`transformPasted` als Plugin verdrahten,
   `WordEditor.tsx` anpassen (State + Banner), E2E-Testfälle 8.2 #1–#4, #7, #11.
4. `handlePaste`/`handleDrop` für Bild-Blobs ergänzen, E2E-Testfälle 8.2 #6, #14.
5. `Mod-Shift-v`/`pasteAsPlainText`, E2E-Testfälle 8.2 #8, #10.
6. Rundreise-Tests (Abschnitt 8.3) für beide Formate und beide Cross-Format-Richtungen.
7. Grenzfall-Restliste (Abschnitt 9) einzeln abhaken.
8. Optional/P1: Toolbar-Buttons (Abschnitt 6.4).
9. Manuelle Prüfschritte (Abschnitt 10) durchführen und Ergebnis dort nachtragen.

---

## 11. Abnahme-Checkliste und offene Punkte (Bezug: `einfuegen-req.md` Abschnitt 7)

- [ ] Alle Testfälle aus Abschnitt 8.2/8.3 automatisiert vorhanden und grün.
- [ ] Jeder Grenzfall aus Abschnitt 9 einzeln befundet (funktioniert / dokumentiert nicht
      unterstützt / repariert).
- [ ] Baseline-Rundreise (Anforderung 5.1) läuft vor **und** nach den Code-Änderungen
      weiterhin grün.
- [ ] Feature-Rundreise (Anforderung 5.2) für DOCX, ODT, beide Cross-Format-Richtungen
      grün.
- [ ] Selection-Sync-Regressionstest mit Paste-Sequenz (Abschnitt 8.2 #11) grün und
      dauerhaft Teil der Suite (`selection-regression.spec.ts`).
- [ ] Export-Absturz-Bug (Abschnitt 1) durch gehärtete Writer + Unit-Test geschlossen,
      **und** `npm run build` läuft danach fehlerfrei durch (Abschnitt 7.2).
- [ ] Manuelle Prüfschritte durchgeführt und dokumentiert:
  1. Echtes Copy-Paste aus lokal installiertem Microsoft Word bzw. LibreOffice Writer
     (Grenzfall 14, höchste inhaltliche Priorität laut Anforderungsdatei, laut deren
     Testplan Abschnitt 6.3 nicht automatisierbar) — wer, wann, welche Word-/
     LibreOffice-Version, welches Ergebnis.
  2. Reale IME-Komposition (Grenzfall 8) — nur strukturelle Begründung, kein Test.
  3. Mobile/Tablet-Playwright-Projekte (`Mobile`/`Tablet` aus `playwright.config.ts:21-22`)
     für Touch-Paste-Menüs — nice-to-have, kein Blocker.
  4. `word/comments.xml`/Änderungsverfolgung-Interaktion beim Einfügen — laut
     `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 13 noch nicht implementiert (Phase 3); sobald
     Track Changes existiert, muss diese Datei um „Einfügen bei aktiver Aufzeichnung
     markiert als Einfügung“ ergänzt werden.

Erst wenn alle Punkte erfüllt sind, darf der Backlog-Status von `einfuegen` (und, sofern
mitumgesetzt, `einfuegen-unformatiert`) von „nicht vertrauenswürdig“ auf „vorhanden“
wechseln — andernfalls bleibt der Status „teilweise“ mit Verweis auf die offenen Punkte
oben.
