# Bildgröße ändern — dateigenauer Umsetzungsplan

Gegenstück zu `specs/bild-groesse-aendern-req.md`. Beschreibt, nach **erneuter,
tatsächlicher Codelektüre** (nicht nur Anforderungsangabe), was am bestehenden Code zu
ändern ist, welche Dateien neu angelegt werden, und wie die geforderte Verifikation
(Abschnitt 7/8 der Anforderung) technisch umgesetzt wird.

> **Verweis-Konvention (wie in der Anforderung):** Stabiler Anker ist jeweils der
> **Datei- und Symbolname** (Funktion/NodeSpec). Zeilennummern sind der Stand dieser
> Analyse (Repo `sanjoesan/salamanido`, gegen den Arbeitsbaum verifiziert am 2026-07-04)
> und nur Sprungmarke. Wo dieser Plan konkrete Zeilen nennt, wurden sie gegen den
> aktuellen Code geprüft.

---

## 0. Revisionshinweis — Korrekturen gegenüber der ersten Fassung dieses Plans

Diese Datei existierte bereits und wurde **kritisch gegen den realen Code
gegengelesen**. Dabei traten mehrere Fehler der ersten Fassung zu Tage, die hier
behoben sind (sonst hätte ein wörtliches Umsetzen der alten Snippets funktionierenden
Code regressiert):

1. **DOCX-Reader-Patch zielte auf die falsche Funktion und hätte den `<w:pict>`/VML-
   sowie den Textbox-Pfad zerstört.** Die erste Fassung zeigte einen neuen
   `} else if (child.localName === 'drawing') { … }`-Zweig mit inline gelesenem
   `a:blip`/`wp:extent`. Der reale Code dekodiert Bilder aber **nicht** inline in einer
   Run-Schleife, sondern in der dedizierten Funktion **`decodeDrawingOrPict`**
   (`docx/reader.ts`, ~Z. 143–168), die **sowohl** `w:drawing` **als auch** das
   Legacy-`w:pict`/VML-`v:imagedata` behandelt **und** den Textbox-/Unsupported-Zweig
   enthält. Der korrekte, minimale Fix sitzt **in `decodeDrawingOrPict`** (Abschnitt
   3.10), nicht in einem erfundenen Drawing-Zweig.
2. **ODT-Reader-Patch zielte ebenfalls auf die falsche Stelle.** Die erste Fassung
   modifizierte den Frame-Zweig in `paragraphToBlocks` und ersetzte dabei die
   Delegation an **`frameToBlocks`** — die aber die **einzige** Stelle ist, die neben
   Bildern auch `draw:text-box` (Textbox) und Objekt-Platzhalter erzeugt **und** die
   von **zwei** Aufrufern genutzt wird (`paragraphToBlocks` **und** `elementToBlocks`
   für seitenverankerte Frames, `text:anchor-type="page"`). Der korrekte Fix sitzt
   **in `frameToBlocks`** (Abschnitt 3.11) und deckt damit beide Aufrufpfade ab; die
   erste Fassung hätte seitenverankerte Bilder ungemessen gelassen und in-paragraph
   Textboxen zerstört.
3. **Die Typ-Normalisierung von `width`/`height` (Anforderung Grenzfall 4.16,
   DoD-Punkt 3) fehlte im Schema-Snippet der ersten Fassung.** Sie normalisierte nur
   die **neuen** `naturalWidth`/`naturalHeight` auf Zahlen, ließ aber
   `width: el.getAttribute('width')` (String!) unverändert — genau der in der
   Anforderung als Pflicht (DoD 3, Testfall 21) benannte Bug bliebe offen. Abschnitt
   3.2 normalisiert jetzt **alle vier** Maß-Attribute auf `number | null` und ergänzt
   `validate`.
4. **Interaktions-Bug mit `reconcileSelectionOnClick` übersehen — und aktiv falsch
   begründet.** Die erste Fassung behauptete (3.9), es sei „kein Eingriff in
   `reconcileSelectionOnClick` nötig, weil die Funktion `view.state.selection.empty`
   prüft". Das ist faktisch falsch: `reconcileSelectionOnClick` (`WordEditor.tsx`,
   ~Z. 43–50) prüft **kein** `.empty`, sondern ersetzt bei jedem Plain-Click die
   Selektion **bedingungslos** durch `TextSelection.near(pos)`. Ein Klick auf ein Bild
   erzeugt zwar zunächst eine `NodeSelection` (Feature-Einstieg 2.1), die der eigene
   `mouseup`-Handler danach aber **sofort in einen Text-Cursor zurückverwandelt** →
   Panel/Ziehpunkte verschwänden im selben Klick. Abschnitt 3.9 enthält jetzt den
   nötigen Guard.
5. **Falsche/veraltete Zeilennummern durchgängig korrigiert** — inklusive **exakt der
   zwei Verwechslungen, vor denen die Anforderung ausdrücklich warnt**: Die erste
   Fassung verwies für den DOCX-Bildtest auf `roundtrip.test.ts:253-259` (dort steht
   ein **Tabellen-/rowspan**-Test) und für den ODT-Bildtest auf `:213-221` (dort steht
   der **Negativ-Test** „externe URL"). Die realen Bildtests liegen bei
   `docx/…/roundtrip.test.ts:307-315` bzw. `odt/…/roundtrip.test.ts:341-350` (Abschnitt
   6.1).
6. **Erfundene Referenzdatei entfernt.** Die erste Fassung berief sich mehrfach auf
   `src/formats/shared/fontSize.ts` als Vorbild — **diese Datei existiert nicht**
   (`src/formats/shared/` enthält nur `documentModel.ts`, `pageGeometry.ts`,
   `schema.ts`, `validateDocument.ts`, `zipDeterminism.ts`). Als reales Vorbild für
   eine reine, ProseMirror-freie Utility im selben Verzeichnis dienen `pageGeometry.ts`
   und `zipDeterminism.ts`.

Unverändert **korrekt** aus der ersten Fassung (nachverifiziert, hier beibehalten): die
CSS-Spezifitäts-Analyse (Abschnitt 2, Fund 1), die Nichtänderung beider Writer für den
reinen Bugfix (Fund 3), die Nichtänderung beider `imageCollector.ts` (Fund 4) und das
**per Entpacken der echten Fixtures verifizierte** Größen-Inventar (Abschnitt 7 — alle
5+5 Werte gegen `VariousPictures.docx`/`Seasonal_Fruits2_en.odt` bestätigt).

**Zweiter, unabhängiger Verifikationsdurchlauf (2026-07-05):** Sämtliche in diesem Plan
genannten Symbol-Anker wurden erneut gegen den Arbeitsbaum gelesen und **ausnahmslos
bestätigt** — insbesondere die beiden zusätzlichen, nicht in der Anforderungstabelle
stehenden Funde: (Fund 1) `schema.ts` `toDOM` schreibt tatsächlich nur `{ src, alt,
width, height }` als bloße Attribute (bestätigt Zeilen 82–83), und (Fund 5)
`reconcileSelectionOnClick` (`WordEditor.tsx` Z. 43–50) baut wirklich **bedingungslos**
eine `TextSelection.near(...)` (keine `.empty`-Prüfung) — der Bild-`NodeSelection`-
Zerstörungs-Bug ist real. Zusätzlich **am Quellcode von prosemirror-model belegt**, dass
`validate: 'number|null'` (Abschnitt 3.2) unterstützt ist: `validateType` in
`node_modules/prosemirror-model/dist/index.js` (Z. 2294–2301) macht `type.split('|')`
und mappt `value === null` auf den Typnamen `"null"` — ein Pipe-String mit `null` ist also
gültig und wirft nicht bei der Schema-Konstruktion. Damit ist der in 3.2 gewählte Ansatz
kein Risiko mehr, sondern quellcodeseitig abgesichert.

---

## 0b. TL;DR

Der Befund aus Anforderung Abschnitt 6 ist **korrekt**: Es existiert kein
Bedienelement, kein NodeView, kein `setImageSize`-Command; `width`/`height` sind im
Schema vorhanden (`schema.ts`, `image`-NodeSpec ~Z. 58–85), werden aber von DOCX-/ODT-
Reader nie befüllt. Anders als bei `schriftgroesse-waehlen` ist das Datenmodell also
schon da — die Arbeit ist grob zu ~60 % **UI-Neubau** (Panel, Ziehpunkte, NodeView) und
~40 % **Reader-Bugfix + Rundreise-Härtung**. Der Plan:

1. führt eine neue, format- und UI-übergreifende Utility-Datei
   `src/formats/shared/imageSize.ts` ein (px↔cm, px↔EMU, Clamping, Freitext-Parsing,
   Einfüge-Größenlogik) — reine TS-Funktionen ohne ProseMirror-Abhängigkeit, im Stil
   der bestehenden `shared/pageGeometry.ts`/`shared/zipDeterminism.ts`, damit Schema,
   Toolbar, Panel, NodeView und **beide** Reader/Writer dieselbe Umrechnung verwenden;
2. ergänzt das Schema (`image`-NodeSpec) um **zwei nicht editierbare** Attribute
   `naturalWidth`/`naturalHeight` (für „Zurücksetzen", Anforderung 2.5), **normalisiert
   `width`/`height` auf `number | null`** (Anforderung 4.16/DoD 3) und behebt einen
   **eigenständigen CSS-Spezifitäts-Bug**: `toDOM` schreibt `width`/`height` nur als
   bloße HTML-Attribute; die Regel `.ProseMirror img { height: auto }` (`index.css:41`)
   überschreibt damit jede vom Seitenverhältnis abweichende Höhe **visuell** — exakt das
   in Anforderung Abschnitt 3 Punkt 7 / Grenzfall 4.9 befürchtete Szenario (Kern der
   Antwort auf offene Frage 4);
3. baut einen **neuen `ImageNodeView`** mit acht Ziehpunkten über die
   **Pointer-Events-API** + `setPointerCapture` (nicht `mousedown`/`mousemove`), weil
   Grenzfall 4.3 (Ziehen über den Rand) sonst nicht sauber funktioniert, plus ein
   **transientes Plugin-State** (`imageResizePlugin`) für die Live-Vorschau, damit
   **nicht** pro `pointermove` ein Undo-Schritt entsteht (Anforderung 2.3.3 / 4.7);
4. deckt einen **zweiten Interaktions-Bug** auf und behebt ihn: der bestehende
   `mouseup`-Reconciler in `WordEditor.tsx` (`reconcileSelectionOnClick`) würde die
   Bild-`NodeSelection` bei jedem Auswahl-Klick sofort wieder auf einen Text-Cursor
   zurücksetzen (Abschnitt 3.9);
5. berücksichtigt, dass `image` `draggable: true` ist (`schema.ts`, ~Z. 66) — ein
   `pointerdown` auf einem Ziehpunkt darf keinen nativen HTML5-Drag der Grafik starten
   (gelöst über `draggable="false"` an den Handles + `stopEvent`/`preventDefault`/
   `stopPropagation`, Abschnitt 3.7);
6. behebt den Reader-Bug aus Anforderung 6.3 in **beiden** Formaten in **je genau einer
   Funktion** (`decodeDrawingOrPict` bzw. `frameToBlocks`) — **ohne** eine der beiden
   Writer-Fallback-Logiken anzufassen (die waren immer schon korrekt „nimm Wert, sonst
   Default"); einzige Writer-Änderung ist die **Einheit** im ODT-Writer (offene Frage
   2);
7. beantwortet alle vier offenen Fragen aus Anforderung 6.4 verbindlich (Abschnitt 3.3);
8. nennt zwei **verifizierte** reale Fixture-Dateien mit je fünf unterschiedlich großen
   Bildern (`VariousPictures.docx`, `Seasonal_Fruits2_en.odt`) für die Tests aus
   Grenzfall 4.13 / 5.1.5 / 5.2.5 (Abschnitt 7).

---

## 1. Methodik dieser Prüfung

Gelesen (Arbeitsbaum, nicht nur Anforderung): `src/formats/shared/schema.ts`,
`src/formats/shared/editor/commands.ts`, `.../Toolbar.tsx`, `.../WordEditor.tsx`,
`.../pageLayout.ts`, `src/index.css`, `src/formats/docx/reader.ts`, `.../writer.ts`,
`.../imageCollector.ts`, `.../xmlUtil.ts`, `src/formats/odt/reader.ts`, `.../writer.ts`,
`.../imageCollector.ts`, `.../xmlUtil.ts`, beide `__tests__/roundtrip.test.ts`,
`src/formats/shared/pageGeometry.ts`. Verzeichnisinhalte real geprüft:
`src/formats/shared/*` (kein `fontSize.ts`), `tests/e2e/*.spec.ts` (u. a.
`selection-regression.spec.ts`, `docx.spec.ts`, `odt.spec.ts` vorhanden),
`src/app/DocumentWorkspace.tsx` (vorhanden). Zwei reale Fixtures wurden **entpackt** und
ihre `wp:extent`/`svg:width`+`svg:height`-Werte **ausgelesen** (Ergebnis Abschnitt 7),
statt Testwerte zu unterstellen. Die verwendeten Namespaces wurden gegen
`docx/xmlUtil.ts` (`OOXML_NAMESPACES.wp`/`.a`/`.r`/`.vml` vorhanden) und
`odt/xmlUtil.ts` (`ODF_NAMESPACES.svg`/`.draw`/`.xlink` vorhanden) verifiziert.

---

## 2. Ist-Zustand nach Codelektüre — Abgleich mit der Anforderung

Bestätigt alle Aussagen aus Anforderung Abschnitt 6. Anker = Symbol; Zeilen geprüft:

| Fundstelle (Symbol) | Ist-Zustand | Deckt sich? |
|---|---|---|
| `schema.ts` `image` (~Z. 58–85) | `src`, `alt` (Default `''`, `validate:'string'`), `width`/`height` (`{default:null}`, **ohne `validate`**), `draggable:true` (Z. 66), `group:'block'`. `parseDOM.getAttrs` liest `width`/`height` per `getAttribute` (~Z. 75–76) → **String\|null**. `toDOM` gibt `['img',{src,alt,width,height}]` (~Z. 81–84). | Ja |
| `commands.ts` `insertImage` (Z. 66–74) | `image.create({src,alt})` — **kein** `width`/`height`-Parameter; **kein** `setImageSize` | Ja |
| `commands.ts` `setAlign` (Z. 13–27) | Muster für ein Node-Attribut-Command via `tr.setNodeAttribute(pos,…)` | (Vorbild) |
| `Toolbar.tsx` `handleImagePick` (Z. 124–135) | liest Data-URL, ruft `run(view, insertImage(dataUrl, file.name))` (Z. 134) **ohne** Größenermittlung; `run()` ist modulprivat (Z. 28–31); „🖼 Bild"-`<input type=file>` (Z. 291–294) | Ja |
| `WordEditor.tsx` | **kein** `nodeViews`; `reconcileSelectionOnClick` (Z. 43–50); Plugin-Array (Z. 75–106); EditorView-Konstruktion (Z. 114–125), `dispatchTransaction` mit `if (tr.docChanged)` (Z. 120) + `forceRender` (Z. 123); eigener `mousedown`/`mouseup`-Listener auf `view.dom` (Z. 135–147); JSX (Z. 160–176) | Ja (+ Fund 5 unten) |
| `index.css` `.ProseMirror img` (Z. 39–42) | `{ max-width:100%; height:auto }`; `height:auto` (Z. 41) | Ja, siehe Fund 1 |
| `docx/reader.ts` `decodeDrawingOrPict` (Z. 143–168) | liest `a:blip@r:embed` **bzw.** `v:imagedata@r:id` und `wp:docPr@name`; gibt `{kind:'image',imageRelId,imageAlt}` (Z. 153–156). **Kein `wp:extent`.** Bild-Block-Erzeugung in `paragraphToBlocks` (Z. 266–269) | Ja |
| `docx/writer.ts` `imageParagraphXml` (Z. 74–94) | `Number(node.attrs?.width ?? 300)` / `?? 200` (Z. 78–79); px→EMU (Z. 81–82); `wp:extent` (Z. 86), `a:ext` (Z. 91) | Ja — Fallback bereits korrekt bedingt |
| `odt/reader.ts` `frameToBlocks` (Z. 232–248) | Bild-Zweig `if (imageEl)` liest `xlink:href` (Z. 235) + `draw:name`→`alt` (Z. 236), gibt `{type:'image',attrs:{src,alt}}` (Z. 237). **Kein `svg:width`/`svg:height`.** Aufrufer: `paragraphToBlocks` (Z. 205) **und** `elementToBlocks` (Z. 284, seitenverankerte Frames) | Ja |
| `odt/writer.ts` `blockToOdt` Fall `'image'` (Z. 176–183) | `node.attrs?.width ? \`${…}px\` : '6cm'` (Z. 179), `height`→`'4cm'` (Z. 180); `draw:frame svg:width/svg:height` (Z. 182) | Ja — Fallback korrekt, `px`-Suffix aber fragwürdig (offene Frage 2) |
| `docx/imageCollector.ts`, `odt/imageCollector.ts` | Dedup ausschließlich über Daten-URL (`fileNameByDataUrl`), Größe bleibt Node-Attribut | Ja — bereits korrekt, keine Änderung |
| `docx/__tests__/roundtrip.test.ts` `describe('… images')` (Z. 307), Test „preserves an embedded image" (Z. 308–315) | setzt `width:100,height:80` (Z. 309), prüft nur `type` (Z. 312) und `src` (Z. 313–314) | Ja, „False Confidence" bestätigt |
| `odt/__tests__/roundtrip.test.ts` `describe('… images')` (Z. 341), Test „preserves an embedded image" (Z. 342–350) | setzt `width`/`height` **gar nicht** (Z. 343), prüft `src` (Z. 347–348) + `alt` (Z. 349) | Ja |

> **Achtung, häufige Verwechslung (von der Anforderung explizit benannt):** In
> `docx/…/roundtrip.test.ts` ist ~Z. 279 ein **rowspan**-Test und ~Z. 222 der
> Negativ-Test; in `odt/…/roundtrip.test.ts` ist ~Z. 213 der **Negativ**-Test
> („externe URL wirft Fehler"). Das sind **nicht** die Bild-Größen-Tests.

Zusätzlich beim Audit gefunden, **nicht** in der Anforderungstabelle (Details/Fix in
Abschnitt 3):

1. **CSS-Spezifitäts-Bug (`index.css:39–42` + `schema.ts` `toDOM`):** `toDOM` schreibt
   `width`/`height` nur als **bloße HTML-Attribute**. Browser behandeln diese als
   „presentational hints" mit niedrigster Priorität — **jede** Autoren-Regel, hier
   `.ProseMirror img { height:auto }`, überschreibt einen gespeicherten expliziten
   Höhenwert **visuell**. Ein per Seitengriff bewusst nicht-proportional gesetzter
   Höhenwert (Anforderung 2.3.2) fiele optisch auf `auto` zurück → stiller Widerspruch
   Modell↔Darstellung. Fix: Inline-Style in `toDOM` **und** im NodeView (Abschnitt
   3.2/3.7).
2. **`draggable:true` vs. Ziehpunkte (`schema.ts`, Z. 66):** `image` ist natives
   Drag-Ziel. Ohne Gegenmaßnahme kann ein `pointerdown` auf einem Handle als Start
   eines nativen HTML5-Drags interpretiert werden. Gegenmaßnahme in Abschnitt 3.7.
3. **Beide Writer brauchen für den reinen Bugfix (6.3) keine Änderung:**
   `docx/writer.ts` `imageParagraphXml` und `odt/writer.ts` `blockToOdt` verwenden
   bereits `attrs?.width ?? <Default>` — exakt das von Anforderung 3.4/3.6 geforderte
   Verhalten. Der Bug liegt **ausschließlich** in den Readern. (Einzige Writer-Änderung:
   ODT-Einheit, offene Frage 2.)
4. **`imageCollector.ts` (beide) ist bereits korrekt** (Anforderung Grenzfall 4.8):
   Dedup-Key ist die Daten-URL; zwei `image`-Nodes gleichen `src`, aber
   unterschiedlicher Größe teilen sich eine Mediendatei und bekommen je Aufruf von
   `imageParagraphXml`/`blockToOdt` eigenständig korrekte `wp:extent`/`svg:*`. Kein
   Code, nur Regressionstest (Abschnitt 6.1).
5. **`reconcileSelectionOnClick` zerstört die Bild-`NodeSelection` (neuer Fund, in der
   ersten Planfassung übersehen):** siehe Abschnitt 3.9. Ohne Fix ist der komplette
   Feature-Einstieg (2.1 „Klick auf ein Bild → NodeSelection") kaputt.

---

## 3. Architekturentscheidungen (vor dem dateigenauen Plan)

### 3.1 Neue Datei `src/formats/shared/imageSize.ts`

Einheiten-Umrechnung, Clamping und Einfüge-Größenlogik werden an ≥ sechs Stellen
gebraucht (Schema, Toolbar, Panel, NodeView, beide Reader, ODT-Writer) — eine
gemeinsame, reine Utility ohne ProseMirror-Abhängigkeit, im Stil der bereits
vorhandenen reinen Shared-Utilities `pageGeometry.ts`/`zipDeterminism.ts`:

```ts
// src/formats/shared/imageSize.ts
import { PAGE_CONTENT_WIDTH_PX, PAGE_CONTENT_HEIGHT_PX } from './editor/pageLayout'

export const IMAGE_SIZE_MIN_PX = 1
// "Vielfaches der Seitenbreite" (Anforderung Grenzfall 4.2) — Entscheidung: Faktor 3.
export const IMAGE_SIZE_MAX_WIDTH_PX = 3 * PAGE_CONTENT_WIDTH_PX
export const IMAGE_SIZE_MAX_HEIGHT_PX = 3 * PAGE_CONTENT_HEIGHT_PX

export const PX_PER_CM = 96 / 2.54 // 96 CSS-px/Zoll, konsistent zu pageLayout.ts/docx/writer.ts

export function clampImageWidthPx(px: number): number {
  return Math.min(IMAGE_SIZE_MAX_WIDTH_PX, Math.max(IMAGE_SIZE_MIN_PX, Math.round(px)))
}
export function clampImageHeightPx(px: number): number {
  return Math.min(IMAGE_SIZE_MAX_HEIGHT_PX, Math.max(IMAGE_SIZE_MIN_PX, Math.round(px)))
}

export function pxToCm(px: number): number { return px / PX_PER_CM }
export function cmToPx(cm: number): number { return cm * PX_PER_CM }
export function pxToEmu(px: number): number { return Math.round((px / 96) * 914400) }
export function emuToPx(emu: number): number { return Math.round((emu / 914400) * 96) }

/** Anzeige in cm, 2 Nachkommastellen, deutsches Komma, ohne überflüssige Endnullen. */
export function formatSizeCm(px: number): string {
  return pxToCm(px).toFixed(2).replace(/0+$/, '').replace(/\.$/, '').replace('.', ',')
}

/** cm-Wert mit POSIX-Dezimalpunkt für ODF-Attribute (KEIN Komma). */
export function pxToOdtCm(px: number): string {
  return pxToCm(px).toFixed(2)
}

/**
 * Freitext aus den Größenfeldern (cm, deutsches Komma). `null` für alles, was keine
 * reine positive Zahl ist (Grenzfall 4.1) — kein `parseFloat`-Fallback, der "12cm"
 * oder "abc" fälschlich durchließe. Verhindert `NaN` im Modell.
 */
export function parseSizeInputCm(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null
  const value = Number(normalized)
  return Number.isFinite(value) && value > 0 ? value : null
}

/** ODF erlaubt cm/mm/in/px/pt an svg:width/height — nach interne px (96 dpi). */
const ODT_UNIT_TO_PX: Record<string, number> = { cm: PX_PER_CM, mm: PX_PER_CM / 10, in: 96, px: 1, pt: 96 / 72 }
export function parseOdtLengthToPx(raw: string | null | undefined): number | null {
  if (!raw) return null
  const match = /^(\d+(?:\.\d+)?)(cm|mm|in|px|pt)$/.exec(raw.trim())
  if (!match) return null
  const value = Number(match[1])
  if (!Number.isFinite(value) || value <= 0) return null
  return Math.round(value * ODT_UNIT_TO_PX[match[2]])
}

/**
 * Normalisiert einen aus HTML/DOM gelesenen Maß-Attributwert auf `number | null`
 * (Anforderung Grenzfall 4.16). Kein `NaN`, kein String im Modell.
 */
export function normalizeDimAttr(raw: string | number | null | undefined): number | null {
  if (raw == null || raw === '') return null
  const n = typeof raw === 'number' ? raw : Number(String(raw).trim())
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null
}

/**
 * Einfüge-Standardgröße (Anforderung 2.4): Seitenverhältnis bleibt; ein Bild schmaler
 * als die verfügbare Breite wird NICHT hochskaliert (Grenzfall 4.14 — 16×16-Icon bleibt
 * 16×16), nur heruntergerechnet, wenn es die verfügbare Breite überschreitet.
 */
export function computeInsertSize(
  naturalWidth: number,
  naturalHeight: number,
  availableWidthPx: number,
): { width: number; height: number } {
  if (naturalWidth <= availableWidthPx) {
    return { width: Math.round(naturalWidth), height: Math.round(naturalHeight) }
  }
  const scale = availableWidthPx / naturalWidth
  return { width: Math.round(availableWidthPx), height: Math.round(naturalHeight * scale) }
}
```

Reine TS-Funktionen, per Vitest ohne DOM/Editor testbar (Abschnitt 6.1). `normalizeDimAttr`
und `pxToOdtCm` sind gegenüber der ersten Fassung **neu** (schließen Fund 3 bzw. offene
Frage 2 sauber, statt sie im Aufrufer inline zu duplizieren).

### 3.2 Schema-Erweiterung: Typ-Normalisierung + `naturalWidth`/`naturalHeight` + Inline-Style

Der `image`-NodeSpec (`schema.ts`, ~Z. 58–85) wird so geändert:

```ts
image: {
  group: 'block',
  attrs: {
    src: { validate: 'string' },
    alt: { default: '', validate: 'string' },
    // NEU: validate + Normalisierung auf number|null (Anforderung 4.16 / DoD 3).
    width: { default: null, validate: 'number|null' },
    height: { default: null, validate: 'number|null' },
    // Nicht über die UI editierbar — nur für "Auf Originalgröße zurücksetzen"
    // (Anforderung 2.5). Editor-intern, NICHT Teil eines OOXML-/ODF-Standardfelds
    // (offene Frage 3, Abschnitt 3.3).
    naturalWidth: { default: null, validate: 'number|null' },
    naturalHeight: { default: null, validate: 'number|null' },
  },
  draggable: true,
  parseDOM: [
    {
      tag: 'img[src]',
      getAttrs: (dom) => {
        const el = dom as HTMLImageElement
        // normalizeDimAttr: aus HTML geklebtes <img width="100"> liefert einen STRING —
        // hier zwingend auf number|null normalisieren, sonst koexistieren String (Paste)
        // und Zahl (setImageSize) im selben Attribut (Grenzfall 4.16). Auch el.style.*
        // als Zweitquelle, weil unser eigenes toDOM Breite/Höhe als Inline-Style schreibt.
        const w = el.getAttribute('width') ?? el.style.width.replace('px', '')
        const h = el.getAttribute('height') ?? el.style.height.replace('px', '')
        return {
          src: el.getAttribute('src'),
          alt: el.getAttribute('alt') || '',
          width: normalizeDimAttr(w),
          height: normalizeDimAttr(h),
          naturalWidth: normalizeDimAttr(el.getAttribute('data-natural-width')),
          naturalHeight: normalizeDimAttr(el.getAttribute('data-natural-height')),
        }
      },
    },
  ],
  toDOM(node) {
    const { src, alt, width, height, naturalWidth, naturalHeight } = node.attrs
    // Inline-Style ZUSÄTZLICH zu den bloßen Attributen: HTML-width/height-Attribute
    // haben die niedrigste CSS-Priorität und werden von .ProseMirror img{height:auto}
    // (index.css:41) überschrieben — ein bewusst verzerrter Höhenwert fiele sonst
    // visuell auf "auto" zurück (Fund 1 / Grenzfall 4.9). Inline-Style gewinnt gegen
    // jede Klassenregel.
    const style = [width != null ? `width:${width}px` : '', height != null ? `height:${height}px` : '']
      .filter(Boolean)
      .join(';')
    return [
      'img',
      {
        src,
        alt,
        width: width ?? undefined,
        height: height ?? undefined,
        style: style || undefined,
        // Sichert die Originalgröße über Copy&Paste INNERHALB des Editors (ProseMirror
        // serialisiert Block-Nodes für die Zwischenablage über toDOM/parseDOM). Diese
        // data-*-Attribute dürfen NICHT in den DOCX-/ODT-Export gelangen — das ist dort
        // ohnehin ausgeschlossen, weil die Writer aus dem JSON-Modell serialisieren, nicht
        // aus dem DOM (Grenzfall 4.17).
        'data-natural-width': naturalWidth ?? undefined,
        'data-natural-height': naturalHeight ?? undefined,
      },
    ]
  },
},
```

Hinweise:

- `validate: 'number|null'` ist von prosemirror-model unterstützt (pipe-getrennte
  Typliste inkl. `null`). Alternativ eine `validate`-**Funktion**
  `(v) => { if (v !== null && typeof v !== 'number') throw new RangeError('…') }`.
  Wichtig: Nach dieser Änderung **müssen** alle Erzeuger von `image`-Nodes (beide
  Reader, `insertImage`, `setImageSize`, Drag-Pfad) `width`/`height` als **Zahl oder
  `null`** liefern — genau das stellen Abschnitt 3.4/3.10/3.11 sicher.
- `width: width ?? undefined` statt `width` direkt: prosemirror-model überspringt
  `null`/`undefined`-Attributwerte beim Serialisieren; explizit `undefined` macht die
  Absicht klar und verhindert ein `width="null"`-Artefakt bei künftigen Änderungen.
- **Warum Copy&Paste-Absicherung nötig ist:** ohne `data-natural-*` verlöre ein im
  Editor kopiertes Bild seine bekannte Originalgröße und der „Zurücksetzen"-Button wäre
  nach Paste grundlos deaktiviert.

### 3.3 Auflösung der vier offenen Fragen (Anforderung Abschnitt 6.4)

Verbindlich beantwortet (Anforderung DoD-Punkt 6/8):

1. **Anzeigeeinheit:** **Zentimeter**, 2 Nachkommastellen, deutsches Komma
   (`formatSizeCm`/`parseSizeInputCm`). Begründung: konsistent zum vorhandenen
   ODT-Fallback (`6cm`/`4cm`), vertrautere Einheit bei Dokumentbearbeitung. Intern bleibt
   alles px bei 96 dpi (Anforderung 2.6).
2. **ODT-Einheiten-Schreibweise beim Export:** **Umrechnung nach `cm`**
   (`pxToOdtCm`) statt des `px`-Suffix-Fallbacks. Begründung: bessere Kompatibilität mit
   strikten/älteren ODF-Konsumenten (Grenzfall 4.10). `px` ist zwar ODF-zulässig, aber
   real seltener getestet als `cm` (die eigenen LibreOffice-Fixtures verwenden
   durchgehend `cm`, siehe Abschnitt 7). Diff in Abschnitt 3.12.
3. **Persistenz von `naturalWidth`/`naturalHeight`:** **rein editor-intern, NICHT im
   Exportformat.** Weder OOXML noch ODF haben ein Standardfeld „Größe vor letzter
   Änderung"; ein proprietäres Zusatzfeld gefährdete die Interoperabilität. **Explizite,
   dokumentierte Konsequenz:** Der „Zurücksetzen"-Button wird nach jedem
   Speichern-und-erneut-Öffnen deaktiviert (Grenzfall 4.4). **Ausnahme laut Anforderung
   2.5 letzter Satz:** Direkt nach einem **Import** gilt die aus der Datei gelesene Größe
   für die **laufende Sitzung** als Originalgröße — die Reader setzen `naturalWidth`/
   `naturalHeight` auf denselben Wert wie `width`/`height` (Abschnitt 3.10/3.11), auch
   wenn dieser beim nächsten Export nicht persistiert wird.
4. **Modellwert vs. CSS-Deckelung (`max-width:100%`):** **Modellwert ist die Wahrheit** —
   Feld/Ziehpunkte zeigen/speichern exakt den eingegebenen/gezogenen Wert, auch wenn
   `max-width:100%` ihn optisch kappt (wie Word/LibreOffice). Mit dem Inline-Style-Fix
   (3.2) bleibt die Diskrepanz auf den **Breiten**-Fall beschränkt; der **Höhen**-Bug
   (`height:auto` überschreibt gesetzte Höhe) ist damit **behoben**, nicht nur
   dokumentiert.

### 3.4 Commands: `setImageSize`, `resetImageToNaturalSize`, `canResetImageSize`, `getSelectedImage`

Neu in `commands.ts` (Muster `setAlign`, aber gezielt für `NodeSelection` auf `image` —
**kein** `empty`-Guard wie `applyMarkColor`, weil die Selektion hier per Definition die
Bild-Node ist, siehe Anforderung 2.2.2):

```ts
import { NodeSelection, type EditorState } from 'prosemirror-state'
import type { Node as PMNode } from 'prosemirror-model'
import { clampImageWidthPx, clampImageHeightPx } from '../imageSize'

function selectedImage(state: EditorState): { pos: number; node: PMNode } | null {
  const { selection } = state
  if (!(selection instanceof NodeSelection)) return null
  if (selection.node.type !== wordSchema.nodes.image) return null
  return { pos: selection.from, node: selection.node }
}

export function getSelectedImage(state: EditorState) {
  return selectedImage(state)
}

export function setImageSize(width: number, height: number): Command {
  return (state, dispatch) => {
    const target = selectedImage(state)
    if (!target) return false
    if (dispatch) {
      dispatch(
        state.tr
          .setNodeAttribute(target.pos, 'width', clampImageWidthPx(width))
          .setNodeAttribute(target.pos, 'height', clampImageHeightPx(height)),
      )
    }
    return true
  }
}

export function resetImageToNaturalSize(): Command {
  return (state, dispatch) => {
    const target = selectedImage(state)
    if (!target) return false
    const { naturalWidth, naturalHeight } = target.node.attrs
    if (naturalWidth == null || naturalHeight == null) return false // Grenzfall 4.4
    if (dispatch) {
      dispatch(
        state.tr
          .setNodeAttribute(target.pos, 'width', naturalWidth)
          .setNodeAttribute(target.pos, 'height', naturalHeight),
      )
    }
    return true
  }
}

/** UI: Button nur aktiv, wenn Originalgröße bekannt UND von der aktuellen abweichend. */
export function canResetImageSize(state: EditorState): boolean {
  const target = selectedImage(state)
  if (!target) return false
  const { width, height, naturalWidth, naturalHeight } = target.node.attrs
  if (naturalWidth == null || naturalHeight == null) return false
  return width !== naturalWidth || height !== naturalHeight
}
```

`setNodeAttribute`/`AttrStep` verändert die Dokumentstruktur nicht (keine
Positionsverschiebung) → die `NodeSelection` bleibt nach `apply(tr)` automatisch auf
demselben Bild (Anforderung 2.2.4 ohne Zusatzcode). Beide Attribute in **einer**
Transaktion → genau **ein** Undo-Schritt (Anforderung 2.7). Die **Untergrenze gegen 0/
negativ ist über `clampImageWidthPx`/`clampImageHeightPx` bereits im Command
durchgesetzt** (DoD-Punkt 4 / Grenzfall 4.18), nicht erst im Writer.

`insertImage` (Z. 66–74) wird um einen optionalen dritten Parameter erweitert:

```ts
export function insertImage(
  src: string,
  alt = '',
  size?: { width: number; height: number } | null,
): Command {
  return (state, dispatch) => {
    const attrs =
      size == null
        ? { src, alt }
        : { src, alt, width: size.width, height: size.height, naturalWidth: size.width, naturalHeight: size.height }
    const node = wordSchema.nodes.image.create(attrs)
    if (dispatch) dispatch(state.tr.replaceSelectionWith(node))
    return true
  }
}
```

`naturalWidth`/`naturalHeight` = `width`/`height` beim Einfügen (Anforderung 2.4 letzter
Satz). Rückwärtskompatibel: ohne `size` exakt heutiges Verhalten (alle vier `null`).

### 3.5 Toolbar `handleImagePick`: Naturalgröße ermitteln, Zellkontext, Fehleranzeige

`Toolbar.tsx`, `handleImagePick` (Z. 124–135), Anforderung 2.4 / Grenzfall 4.6 / 4.15:

```ts
function getAvailableContentWidthPx(view: EditorView): number {
  const { $from } = view.state.selection
  for (let depth = $from.depth; depth >= 0; depth--) {
    if ($from.node(depth).type.name === 'table_cell') {
      const dom = view.domAtPos($from.before(depth)).node
      const el = dom instanceof HTMLElement ? dom : dom.parentElement
      const width = el?.getBoundingClientRect().width
      if (width && width > 0) return width
    }
  }
  return PAGE_CONTENT_WIDTH_PX
}

async function handleImagePick(event: ChangeEvent<HTMLInputElement>) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  setImageError(null)
  try {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error ?? new Error('Datei konnte nicht gelesen werden.'))
      reader.readAsDataURL(file)
    })
    const probe = new Image()
    probe.src = dataUrl
    await probe.decode() // Grenzfall 4.15: wirft bei defekter/leerer Bilddatei
    const available = getAvailableContentWidthPx(view)
    const size = computeInsertSize(probe.naturalWidth, probe.naturalHeight, available)
    run(view, insertImage(dataUrl, file.name, size))
  } catch {
    setImageError('Bild konnte nicht eingefügt werden — Datei ist beschädigt oder kein unterstütztes Bildformat.')
  }
}
```

- `imageError`/`setImageError` als neuer `useState<string | null>` in `Toolbar`,
  angezeigt als `<span role="alert" className="text-xs text-red-600 dark:text-red-400">`
  **nach exakt dem bereits in derselben Datei vorhandenen Muster** der `cutError`-Anzeige
  (`Toolbar.tsx` Z. 157–161) — kein neues Fehler-UI-Konzept. Optional die 4-Sekunden-
  Auto-Dismiss-Logik aus `WordEditor.tsx` (Z. 62–66) spiegeln.
- `getAvailableContentWidthPx` deckt Grenzfall 4.6 konkret ab (verfügbare Breite in einer
  Tabellenzelle = Zellbreite). Der `getBoundingClientRect().width`-Wert enthält
  Zell-Padding — für die grobe Einfüge-Auto-Skalierung akzeptabel; bei Bedarf
  `PAGE_MARGIN`-analog reduzieren. **Praktisch (nicht nur theoretisch) im E2E-Test 4.6
  verifizieren.**
- **Außerhalb des Geltungsbereichs** (Slug `bild-einfuegen`): MIME-/Signaturprüfung und
  `title`/`aria-label` am „🖼 Bild"-Element. `probe.decode()` liefert nur als
  Nebeneffekt eine grobe Formatprüfung.

`run` wird in `Toolbar.tsx` von modulprivat auf **exportiert** umgestellt (Z. 28–31), da
`ImagePropertiesPanel` (3.8) dasselbe Ausführungsmuster nutzt.

### 3.6 `imageResizePlugin` — transientes Drag-State ohne Undo-Spam

Neue Datei `src/formats/shared/editor/imageResizePlugin.ts`:

```ts
import { Plugin, PluginKey } from 'prosemirror-state'

export interface ImageDragPreview { pos: number; width: number; height: number }
export const imageResizeKey = new PluginKey<ImageDragPreview | null>('imageResize')

export function createImageResizePlugin(): Plugin {
  return new Plugin({
    key: imageResizeKey,
    state: {
      init: () => null,
      apply(tr, value) {
        const meta = tr.getMeta(imageResizeKey)
        return meta !== undefined ? (meta as ImageDragPreview | null) : value
      },
    },
  })
}
```

Während des Ziehens dispatcht der NodeView pro `pointermove` eine Transaktion **ohne**
Dokumentänderung (`tr.docChanged === false` → `WordEditor.tsx` Z. 120 ruft `onChange`
nicht auf, die App wird also nicht als „dirty" markiert) und **außerhalb der Historie**:

```ts
view.dispatch(view.state.tr.setMeta(imageResizeKey, { pos, width, height }).setMeta('addToHistory', false))
```

`WordEditor.tsx` ruft `forceRender` (Z. 123) **unabhängig** von `docChanged` bei jeder
Transaktion auf → `ImagePropertiesPanel` bekommt die Live-Werte **ohne Zusatzcode** mit
jedem `pointermove` synchron (Anforderung Element 5). Erst bei `pointerup` folgt die
**echte** Transaktion (History-fähig, `setImageSize`-Attribute + Plugin-Reset):

```ts
view.dispatch(
  view.state.tr
    .setNodeAttribute(pos, 'width', finalWidth)
    .setNodeAttribute(pos, 'height', finalHeight)
    .setMeta(imageResizeKey, null),
)
```

→ **eine ganze Ziehgeste = genau ein Undo-Schritt** (Anforderung 2.3.3 / Grenzfall 4.7),
weil die Zwischenschritte gar keine history-fähige Transaktion erzeugen.

### 3.7 `ImageNodeView` — acht Ziehpunkte, Pointer-Events, `draggable`-Konflikt

Neue Datei `src/formats/shared/editor/ImageNodeView.ts` (Kernlogik):

```ts
import type { Node as PMNode } from 'prosemirror-model'
import type { EditorView, NodeView } from 'prosemirror-view'
import { imageResizeKey } from './imageResizePlugin'
import { clampImageWidthPx, clampImageHeightPx } from '../imageSize'

const HANDLE_IDS = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const
type HandleId = (typeof HANDLE_IDS)[number]
const CORNER_HANDLES = new Set<HandleId>(['nw', 'ne', 'se', 'sw'])

export class ImageNodeView implements NodeView {
  dom: HTMLElement
  private img: HTMLImageElement
  private node: PMNode

  constructor(node: PMNode, private view: EditorView, private getPos: () => number | undefined) {
    this.node = node
    this.dom = document.createElement('div')
    this.dom.className = 'image-node-view'
    this.img = document.createElement('img')
    this.dom.appendChild(this.img)
    this.syncImg(node)
    for (const id of HANDLE_IDS) {
      const handle = document.createElement('div')
      handle.className = `image-resize-handle image-resize-handle-${id}`
      handle.setAttribute('draggable', 'false') // Fund 2: verhindert nativen HTML5-Drag
      handle.addEventListener('pointerdown', (event) => this.startDrag(event, id))
      this.dom.appendChild(handle)
    }
  }

  private syncImg(node: PMNode) {
    this.img.src = node.attrs.src
    this.img.alt = node.attrs.alt ?? ''
    // Inline-Style (nicht nur Attribut) — konsistent mit schema.ts:toDOM (Fund 1).
    this.img.style.width = node.attrs.width != null ? `${node.attrs.width}px` : ''
    this.img.style.height = node.attrs.height != null ? `${node.attrs.height}px` : ''
  }

  update(node: PMNode) {
    if (node.type !== this.node.type) return false
    this.node = node
    this.syncImg(node)
    return true
  }

  selectNode() { this.dom.classList.add('image-node-view--selected') }
  deselectNode() { this.dom.classList.remove('image-node-view--selected') }

  // Pointer-Gesten auf den Handles NICHT von ProseMirrors Selektions-/Drag-Behandlung
  // interpretieren lassen; Klicks/Drags auf dem Bildkörper selbst dagegen durchlassen
  // (damit der Node normal als NodeSelection selektierbar und im Dokument verschiebbar
  // bleibt).
  stopEvent(event: Event) {
    return !!(event.target as HTMLElement).closest?.('.image-resize-handle')
  }
  ignoreMutation() { return true } // Leaf-NodeView ohne contentDOM: Style-Mutationen sind rein visuell.

  private startDrag(event: PointerEvent, handle: HandleId) {
    event.preventDefault()
    event.stopPropagation() // Fund 2: kein zusätzlicher Drag-Start des draggable:true-Node
    const target = event.currentTarget as HTMLElement
    target.setPointerCapture(event.pointerId) // Events auch außerhalb des Viewports (Grenzfall 4.3)

    const startX = event.clientX, startY = event.clientY
    const rect = this.img.getBoundingClientRect()
    const startW = rect.width, startH = rect.height
    const aspect = startW / startH
    const pos = this.getPos()
    if (typeof pos !== 'number') return

    const compute = (dx: number, dy: number) => {
      let width = startW, height = startH
      if (handle.includes('e')) width = startW + dx
      if (handle.includes('w')) width = startW - dx
      if (handle.includes('s')) height = startH + dy
      if (handle.includes('n')) height = startH - dy
      if (CORNER_HANDLES.has(handle)) {
        // Eckgriff: Seitenverhältnis IMMER halten (Anforderung 2.3.1), dominante Achse führt.
        const byWidth = Math.abs(width / startW - 1) >= Math.abs(height / startH - 1)
        if (byWidth) height = width / aspect
        else width = height * aspect
      }
      return { width: clampImageWidthPx(width), height: clampImageHeightPx(height) }
    }

    const onMove = (e: PointerEvent) => {
      const { width, height } = compute(e.clientX - startX, e.clientY - startY)
      this.img.style.width = `${width}px`
      this.img.style.height = `${height}px`
      this.view.dispatch(this.view.state.tr.setMeta(imageResizeKey, { pos, width, height }).setMeta('addToHistory', false))
    }
    const onUp = (e: PointerEvent) => {
      target.releasePointerCapture(event.pointerId)
      target.removeEventListener('pointermove', onMove)
      target.removeEventListener('pointerup', onUp)
      const { width, height } = compute(e.clientX - startX, e.clientY - startY)
      this.view.dispatch(
        this.view.state.tr.setNodeAttribute(pos, 'width', width).setNodeAttribute(pos, 'height', height).setMeta(imageResizeKey, null),
      )
      this.view.focus()
    }
    target.addEventListener('pointermove', onMove)
    target.addEventListener('pointerup', onUp)
  }
}
```

Direkt von der Anforderung getriebene Entscheidungen:

- **Eckgriffe halten das Seitenverhältnis immer** (Anforderung 2.3.1) — über
  `CORNER_HANDLES`, **nicht** über den Panel-Lock.
- **Seitengriffe ändern nur eine Dimension** (Anforderung 2.3.2).
- **Clamping bei jedem `pointermove`** (nicht erst am Ende) — Grenzfall 4.3: die Geste
  bleibt responsiv, das Bild schrumpft nur bis zum Mindestwert, nie negativ/invertiert.
- **`setPointerCapture`** statt globaler `window`-Listener — Grenzfall 4.3.
- **Beide Wege clampen** (Feld über `setImageSize`, Ziehen über `compute`) → nie `0` im
  Modell (Grenzfall 4.18).

### 3.8 `ImagePropertiesPanel` — Eingabefelder, Lock-Checkbox, Reset-Button

Neue Datei `src/formats/shared/editor/ImagePropertiesPanel.tsx`, gerendert als zweite,
bedingt sichtbare Leiste direkt unter der Haupt-`Toolbar` (bewusste Vereinfachung
gegenüber einem am Bild andockenden Floating-Panel, Abschnitt 9):

```tsx
import { useState } from 'react'
import type { EditorView } from 'prosemirror-view'
import { run } from './Toolbar'
import { getSelectedImage, setImageSize, resetImageToNaturalSize, canResetImageSize } from './commands'
import { imageResizeKey } from './imageResizePlugin'
import { formatSizeCm, parseSizeInputCm, cmToPx, clampImageWidthPx, clampImageHeightPx } from '../imageSize'

export function ImagePropertiesPanel({ view }: { view: EditorView }) {
  const [lockAspect, setLockAspect] = useState(true) // Anforderung Element 1: Default aktiviert
  const target = getSelectedImage(view.state)
  if (!target) return null // nur sichtbar bei aktiver Bild-NodeSelection

  const drag = imageResizeKey.getState(view.state)
  const live = drag && drag.pos === target.pos ? drag : null
  const attrW = target.node.attrs.width as number | null
  const attrH = target.node.attrs.height as number | null
  const widthPx = live?.width ?? attrW ?? 0
  const heightPx = live?.height ?? attrH ?? 0

  function commitWidth(raw: string) {
    const cm = parseSizeInputCm(raw)
    if (cm === null) return // Grenzfall 4.1: verwerfen, alter Wert bleibt
    const newWidth = clampImageWidthPx(cmToPx(cm))
    const ratio = attrW && attrH ? attrH / attrW : 1
    const newHeight = lockAspect ? clampImageHeightPx(newWidth * ratio) : (attrH ?? newWidth)
    run(view, setImageSize(newWidth, newHeight))
  }
  function commitHeight(raw: string) {
    const cm = parseSizeInputCm(raw)
    if (cm === null) return
    const newHeight = clampImageHeightPx(cmToPx(cm))
    const ratio = attrW && attrH ? attrW / attrH : 1
    const newWidth = lockAspect ? clampImageWidthPx(newHeight * ratio) : (attrW ?? newHeight)
    run(view, setImageSize(newWidth, newHeight))
  }

  return (
    <div role="toolbar" aria-label="Bildgröße" className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 px-2 py-1.5 text-sm">
      <label className="flex items-center gap-1">
        Breite
        <input aria-label="Bildbreite in Zentimetern" className="w-16 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-1 py-0.5"
          defaultValue={formatSizeCm(widthPx)} key={`w-${widthPx}`}
          onKeyDown={(e) => e.key === 'Enter' && commitWidth((e.target as HTMLInputElement).value)}
          onBlur={(e) => commitWidth(e.target.value)} />
        cm
      </label>
      <label className="flex items-center gap-1">
        Höhe
        <input aria-label="Bildhöhe in Zentimetern" className="w-16 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-1 py-0.5"
          defaultValue={formatSizeCm(heightPx)} key={`h-${heightPx}`}
          onKeyDown={(e) => e.key === 'Enter' && commitHeight((e.target as HTMLInputElement).value)}
          onBlur={(e) => commitHeight(e.target.value)} />
        cm
      </label>
      <label className="flex items-center gap-1">
        <input type="checkbox" checked={lockAspect} onChange={(e) => setLockAspect(e.target.checked)} />
        Seitenverhältnis beibehalten
      </label>
      <button type="button" disabled={!canResetImageSize(view.state)}
        onClick={() => run(view, resetImageToNaturalSize())}
        className="px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 disabled:opacity-40">
        Auf Originalgröße zurücksetzen
      </button>
    </div>
  )
}
```

- **`key={`w-${widthPx}`}`** auf den unkontrollierten (`defaultValue`) Inputs: nach jedem
  Commit (Feld **oder** Ziehen) erzwingt der geänderte `key` ein Neu-Mounten mit dem
  **tatsächlich gespeicherten** (ggf. geclampten/gerundeten) Modellwert — exakt die von
  offener Frage 4 / Anforderung 2.6 geforderte „sichtbare Korrektur im Feld".
- **`lockAspect`** ist nicht persistenter Panel-State (bleibt über mehrere Bildauswahlen
  innerhalb einer Sitzung, Reset auf `true` beim Seiten-Neuladen) — kein Dokumentmodell.
- Division gegen `0`/`null` ist über `attrW && attrH ? … : 1` bzw. den `?? …`-Fallback
  abgesichert. Da nach 3.2 `width`/`height` **immer `number | null`** sind (nie String),
  ist die Verhältnisrechnung typsicher (kein zufälliges String-Coercion mehr).

### 3.9 `WordEditor.tsx` — Verdrahtung **inkl. Selection-Reconcile-Fix (Fund 5)**

```ts
// Neue Imports:
import { NodeSelection } from 'prosemirror-state'
import { createImageResizePlugin } from './imageResizePlugin'
import { ImageNodeView } from './ImageNodeView'
import { ImagePropertiesPanel } from './ImagePropertiesPanel'

// Plugin-Array (Z. 75–106) ergänzen um: createImageResizePlugin(),

// EditorView-Konstruktion (Z. 114–125) ergänzen um nodeViews:
const view = new EditorView(containerRef.current, {
  state,
  clipboardTextSerializer,
  nodeViews: {
    image: (node, editorView, getPos) => new ImageNodeView(node, editorView, getPos),
  },
  dispatchTransaction(tr) { /* unverändert (Z. 117–124) */ },
})

// JSX (Z. 160–176): Panel direkt unter der Toolbar:
{viewRef.current && <Toolbar view={viewRef.current} cutError={cutError} setCutError={setCutError} />}
{viewRef.current && <ImagePropertiesPanel view={viewRef.current} />}
```

**Kritischer Fix — `reconcileSelectionOnClick` (Z. 43–50) zerstört sonst die Bild-
`NodeSelection`:** Die bestehende Funktion ersetzt bei jedem Plain-Click (Bewegung
≤ 3 px, `onMouseUp` Z. 138–145) die Selektion **bedingungslos** durch
`TextSelection.near(pos)`. Ein Klick auf ein Bild erzeugt zunächst eine `NodeSelection`
(ProseMirror-Standard) — der eigene `mouseup`-Handler verwandelt sie unmittelbar danach
in einen Text-Cursor zurück, wodurch Panel und Ziehpunkte **im selben Klick wieder
verschwinden**. Der Feature-Einstieg 2.1 wäre damit kaputt. Fix (timing-unabhängig, über
das Klickziel):

```ts
function reconcileSelectionOnClick(view: EditorView, event: MouseEvent) {
  // NEU: Klicks auf ein Bild(-NodeView) nicht in einen Text-Cursor "reparieren" —
  // die vom Klick erzeugte Bild-NodeSelection (Anforderung 2.1) muss bestehen bleiben,
  // damit ImagePropertiesPanel/Ziehpunkte sichtbar werden.
  if ((event.target as HTMLElement).closest?.('.image-node-view')) return
  // NEU (Gürtel + Hosenträger): eine bereits aktive NodeSelection nicht zerschlagen.
  if (view.state.selection instanceof NodeSelection) return
  const coords = view.posAtCoords({ left: event.clientX, top: event.clientY })
  if (!coords) return
  const newSelection = TextSelection.near(view.state.doc.resolve(coords.pos))
  if (!newSelection.eq(view.state.selection)) {
    view.dispatch(view.state.tr.setSelection(newSelection))
  }
}
```

Der ursprüngliche Zweck der Reconciliation (stale `AllSelection`/Text-Range nach einer
Toolbar-Formatierung kollabieren) bleibt für **Text**-Selektionen voll erhalten — nur der
Bildfall wird ausgenommen. Für Anforderung 2.8 (Zusammenspiel mit dem Selection-Sync-Bug)
ist genau dieser Guard die relevante Stelle; Regressionstest in Abschnitt 6.2.

### 3.10 `docx/reader.ts` — `wp:extent` in `decodeDrawingOrPict` lesen

**Korrektur gegenüber der ersten Fassung:** Der Fix sitzt in **`decodeDrawingOrPict`**
(Z. 143–168), der einzigen Bild-Dekodierstelle, die `w:drawing` **und** Legacy
`w:pict`/VML behandelt. `RunLike` (Z. 117–125) um zwei Felder ergänzen:

```ts
interface RunLike {
  // … bestehend …
  imageWidthPx?: number
  imageHeightPx?: number
}
```

In `decodeDrawingOrPict`, unmittelbar im `if (relId) { … }`-Zweig (Z. 153–156):

```ts
import { emuToPx } from '../shared/imageSize'
// …
if (relId) {
  const docPr = el.getElementsByTagNameNS(OOXML_NAMESPACES.wp, 'docPr')[0]
  const extent = el.getElementsByTagNameNS(OOXML_NAMESPACES.wp, 'extent')[0]
  const cx = extent ? Number(extent.getAttribute('cx')) : NaN
  const cy = extent ? Number(extent.getAttribute('cy')) : NaN
  return {
    kind: 'image',
    imageRelId: relId,
    imageAlt: docPr?.getAttribute('name') ?? '',
    imageWidthPx: Number.isFinite(cx) && cx > 0 ? emuToPx(cx) : undefined,
    imageHeightPx: Number.isFinite(cy) && cy > 0 ? emuToPx(cy) : undefined,
  }
}
```

Und die Bild-Block-Erzeugung in `paragraphToBlocks` (Z. 266–269) setzt die Größe **und**
`naturalWidth`/`naturalHeight` (Anforderung 2.5, sitzungslokale Originalgröße):

```ts
if (run.kind === 'image') {
  flush()
  const target = run.imageRelId ? imageRels.get(run.imageRelId) : undefined
  const attrs: Record<string, unknown> = { src: target ?? '', alt: run.imageAlt ?? '' }
  if (run.imageWidthPx != null && run.imageHeightPx != null) {
    attrs.width = run.imageWidthPx
    attrs.height = run.imageHeightPx
    attrs.naturalWidth = run.imageWidthPx
    attrs.naturalHeight = run.imageHeightPx
  }
  blocks.push({ type: 'image', attrs })
}
```

Fehlt `<wp:extent>`, bleiben `width`/`height` `undefined` → Schema-Default `null`, **kein
Absturz** (Anforderung 3.3). `<wp:extent>` ist in `<wp:inline>`/`<wp:anchor>` ein
Geschwister von `<wp:docPr>`; `getElementsByTagNameNS(wp,'extent')[0]` trifft es zuverlässig
(das andere Extent-Element heißt `wp:effectExtent` — kein Namenskonflikt). Die Größe
innerhalb der DrawingML (`a:ext`, Namespace `a`) wird bewusst **nicht** herangezogen; die
äußere `wp:extent` ist die maßgebliche Anzeigebox.

> **Bewusste Abgrenzung (dokumentiert, kein Blocker):** Für Legacy-`<w:pict>`/VML sitzt die
> Größe **nicht** in `wp:extent`, sondern im `style="width:…;height:…"` des `v:shape`.
> `decodeDrawingOrPict` gibt für solche Bilder weiterhin einen `image`-Run **ohne** Größe
> zurück → Default-Logik greift. Reale DOCX aus Word verwenden nahezu ausschließlich
> `w:drawing`; VML-Bildgrößen sind ein separater, seltener Fall und nicht Teil dieser
> Anforderung. Falls gewünscht, kann später ein `parseOdtLengthToPx`-artiger
> `pt`/`px`-Parser den `v:shape@style` auslesen — hier bewusst ausgeklammert.

### 3.11 `odt/reader.ts` — `svg:width`/`svg:height` in `frameToBlocks` lesen

**Korrektur gegenüber der ersten Fassung:** Der Fix sitzt in **`frameToBlocks`**
(Z. 232–248), im `if (imageEl) { … }`-Zweig (Z. 233–238) — **nicht** im
`paragraphToBlocks`-Frame-Zweig. Nur so wird der Fix **einmal** angewandt und deckt
**beide** Aufrufpfade ab (in-paragraph über Z. 205 **und** seitenverankert über
`elementToBlocks` Z. 284), ohne die Textbox-/Objekt-Zweige derselben Funktion zu berühren:

```ts
import { parseOdtLengthToPx } from '../shared/imageSize'
// …
function frameToBlocks(frameEl: Element, styles: ParsedStyles, depth: number): JsonNode[] {
  const imageEl = firstChildNS(frameEl, ODF_NAMESPACES.draw, 'image')
  if (imageEl) {
    const href = imageEl.getAttributeNS(ODF_NAMESPACES.xlink, 'href') ?? ''
    const alt = frameEl.getAttributeNS(ODF_NAMESPACES.draw, 'name') ?? ''
    const widthPx = parseOdtLengthToPx(frameEl.getAttributeNS(ODF_NAMESPACES.svg, 'width'))
    const heightPx = parseOdtLengthToPx(frameEl.getAttributeNS(ODF_NAMESPACES.svg, 'height'))
    const attrs: Record<string, unknown> = { src: href, alt }
    if (widthPx != null && heightPx != null) {
      attrs.width = widthPx
      attrs.height = heightPx
      attrs.naturalWidth = widthPx  // Anforderung 2.5, sitzungslokale Originalgröße
      attrs.naturalHeight = heightPx
    }
    return [{ type: 'image', attrs }]
  }
  // … draw:text-box / Objekt-Zweige UNVERÄNDERT …
}
```

`parseOdtLengthToPx` (3.1) deckt `cm`/`mm`/`in`/`px`/`pt` ab (Anforderung 3.5 verlangt
mindestens `cm`/`mm`/`in`/`px`; `pt` trivial ergänzt). `svg:width`/`svg:height` liegen im
ODF-Namespace `svg` (`ODF_NAMESPACES.svg` in `odt/xmlUtil.ts` vorhanden, verifiziert) —
Zugriff per `getAttributeNS(ODF_NAMESPACES.svg, …)`, exakt das für `xlink:href` bereits
etablierte Muster in derselben Datei. Fehlen die Attribute → `null` → Schema-Default,
kein Absturz.

### 3.12 `odt/writer.ts` — px→cm (Auflösung offener Frage 2)

`blockToOdt`, Fall `'image'` (Z. 176–183):

```ts
import { pxToOdtCm } from '../shared/imageSize'
// …
case 'image': {
  const src = String(node.attrs?.src ?? '')
  const fileName = images.add(src)
  const width = node.attrs?.width != null ? `${pxToOdtCm(Number(node.attrs.width))}cm` : '6cm'
  const height = node.attrs?.height != null ? `${pxToOdtCm(Number(node.attrs.height))}cm` : '4cm'
  const alt = escapeXml(String(node.attrs?.alt ?? ''))
  return `<text:p><draw:frame draw:name="${alt || 'Image'}" svg:width="${width}" svg:height="${height}" text:anchor-type="as-char"><draw:image xlink:href="${fileName}" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/></draw:frame></text:p>`
}
```

`pxToOdtCm` (3.1) liefert cm mit **POSIX-Dezimalpunkt** (im Unterschied zur UI-Anzeige mit
Komma). Fallback `6cm`/`4cm` unverändert (nur für Nodes ohne Größe, Anforderung 3.6). Vor
dem Umsetzen prüfen, dass **kein** bestehender Test den alten `px`-Schreibpfad für Bilder
festschreibt (aktuell setzt kein ODT-Roundtrip-Test `width`/`height` auf Bildern — siehe
Abschnitt 2/6.1).

### 3.13 `docx/writer.ts` — bewusst unverändert

`imageParagraphXml` (Z. 74–94) bleibt **strukturell unverändert** — die Fallbacks
`Number(node.attrs?.width ?? 300)`/`?? 200` sind bereits bedingt korrekt (Fund 3). Optional
(nicht blockierend): `Math.max(1, …)` um `widthPx`/`heightPx`, falls je ein `width:0`-Node
entstünde. Da die Untergrenze bereits im Command/Drag durchgesetzt ist (3.4/3.7), ist das
reine Verteidigungslinie; `?? 300` fängt `0` bekanntlich **nicht** ab (Grenzfall 4.18).

---

## 4. Dateigenauer Änderungsplan (Zusammenfassung)

| Datei | Art | Inhalt |
|---|---|---|
| `src/formats/shared/imageSize.ts` | **neu** | 3.1 (inkl. `normalizeDimAttr`, `pxToOdtCm`) |
| `src/formats/shared/editor/imageResizePlugin.ts` | **neu** | 3.6 |
| `src/formats/shared/editor/ImageNodeView.ts` | **neu** | 3.7 |
| `src/formats/shared/editor/ImagePropertiesPanel.tsx` | **neu** | 3.8 |
| `src/formats/shared/schema.ts` | geändert | `image`: `width`/`height` `validate`+Normalisierung, `naturalWidth`/`naturalHeight`, Inline-Style-`toDOM`, `data-natural-*`-`parseDOM` (3.2) |
| `src/formats/shared/editor/commands.ts` | geändert | `insertImage`-Signatur; neu: `setImageSize`, `resetImageToNaturalSize`, `canResetImageSize`, `getSelectedImage` (3.4) |
| `src/formats/shared/editor/Toolbar.tsx` | geändert | `handleImagePick` (Naturalgröße/Zellbreite/Fehlerstate), `run` exportieren (3.5) |
| `src/formats/shared/editor/WordEditor.tsx` | geändert | `nodeViews`, `createImageResizePlugin()`, `<ImagePropertiesPanel>`, **`reconcileSelectionOnClick`-Guard** (3.9) |
| `src/index.css` | geändert | NodeView-/Handle-CSS (Abschnitt 5); `.ProseMirror img` bleibt inhaltlich |
| `src/formats/docx/reader.ts` | geändert | `wp:extent` in `decodeDrawingOrPict` + Größe/natural in `paragraphToBlocks` (3.10) |
| `src/formats/odt/reader.ts` | geändert | `svg:width`/`svg:height` in `frameToBlocks` (3.11) |
| `src/formats/odt/writer.ts` | geändert | px→cm via `pxToOdtCm` (3.12) |
| `src/formats/docx/writer.ts` | **unverändert** (optional `Math.max(1,…)`) | 3.13 |
| `src/formats/docx/imageCollector.ts`, `src/formats/odt/imageCollector.ts` | **unverändert** | bereits korrekt (Fund 4) |
| `src/formats/docx/__tests__/roundtrip.test.ts` | erweitert | 6.1 (Bildtest ~Z. 307–315) |
| `src/formats/odt/__tests__/roundtrip.test.ts` | erweitert | 6.1 (Bildtest ~Z. 341–350) |
| `src/formats/shared/__tests__/imageSize.test.ts` | **neu** | 6.1 |
| `src/formats/docx/__tests__/imageSize.test.ts` | **neu** | 6.1 |
| `src/formats/odt/__tests__/imageSize.test.ts` | **neu** | 6.1 |
| `tests/e2e/image-resize.spec.ts` | **neu** | 6.2 |
| `tests/e2e/selection-regression.spec.ts` | erweitert | 6.2 (Anforderung 2.8 / Testfall 14) |

---

## 5. Neues CSS (`src/index.css`)

```css
.ProseMirror img {
  max-width: 100%;
  /* height:auto bleibt NUR als Sicherheitsnetz für Bilder ohne width/height
     (Fremddatei ohne wp:extent). Sobald width/height gesetzt sind, gewinnt das in
     schema.ts:toDOM/ImageNodeView erzeugte Inline-Style gegen diese Klassenregel
     (Fund 1, offene Frage 4). Unverändert lassen. */
  height: auto;
}

.image-node-view { position: relative; display: inline-block; max-width: 100%; }
.image-node-view img { display: block; max-width: 100%; }
.image-node-view--selected img { outline: 2px solid #2563eb; outline-offset: 2px; }

.image-resize-handle {
  position: absolute; width: 10px; height: 10px;
  background: #2563eb; border: 1px solid white; border-radius: 2px;
  display: none; touch-action: none; /* Touch-Drag konkurriert nicht mit Seiten-Scroll */
}
.image-node-view--selected .image-resize-handle { display: block; }
.image-resize-handle-nw { top: -5px; left: -5px; cursor: nwse-resize; }
.image-resize-handle-n  { top: -5px; left: calc(50% - 5px); cursor: ns-resize; }
.image-resize-handle-ne { top: -5px; right: -5px; cursor: nesw-resize; }
.image-resize-handle-e  { top: calc(50% - 5px); right: -5px; cursor: ew-resize; }
.image-resize-handle-se { bottom: -5px; right: -5px; cursor: nwse-resize; }
.image-resize-handle-s  { bottom: -5px; left: calc(50% - 5px); cursor: ns-resize; }
.image-resize-handle-sw { bottom: -5px; left: -5px; cursor: nesw-resize; }
.image-resize-handle-w  { top: calc(50% - 5px); left: -5px; cursor: ew-resize; }
```

Da `.image-node-view img` per Inline-Style eine explizite Höhe bekommt, überschreibt die
`.ProseMirror img { height:auto }`-Regel diese **nicht** mehr (Inline-Style schlägt
Klassenregel) — genau der in Fund 1 beschriebene Widerspruch ist damit aufgelöst.

---

## 6. Neue/erweiterte Testdateien

### 6.1 Unit-Tests (Vitest)

**Neu: `src/formats/shared/__tests__/imageSize.test.ts`** — reine Utility-Tests:

```ts
describe('clamp', () => {
  it('clamps 0/negativ auf den Mindestwert (4.2/4.18)', () => {
    expect(clampImageWidthPx(0)).toBe(1)
    expect(clampImageWidthPx(-5)).toBe(1)
  })
  it('clamps Extremwerte (50000px) auf das Maximum (4.2)', () =>
    expect(clampImageWidthPx(50000)).toBeLessThanOrEqual(IMAGE_SIZE_MAX_WIDTH_PX))
})
describe('parseSizeInputCm', () => {
  it('akzeptiert deutsches Komma', () => expect(parseSizeInputCm('12,5')).toBe(12.5))
  it('verwirft Text/leer/0/negativ ohne Wurf (4.1)', () => {
    for (const bad of ['abc', '', '0', '-5', '12cm']) expect(parseSizeInputCm(bad)).toBeNull()
  })
})
describe('normalizeDimAttr (4.16)', () => {
  it('macht aus String "100" die Zahl 100', () => expect(normalizeDimAttr('100')).toBe(100))
  it('liefert null für null/""/NaN/0/negativ', () => {
    for (const bad of [null, '', 'abc', '0', '-3']) expect(normalizeDimAttr(bad as any)).toBeNull()
  })
})
describe('parseOdtLengthToPx', () => {
  it.each([['12cm', Math.round(12 * PX_PER_CM)], ['120mm', Math.round(120 * (PX_PER_CM / 10))], ['5in', 480], ['300px', 300]])(
    'parst %s', (raw, px) => expect(parseOdtLengthToPx(raw as string)).toBe(px))
  it('liefert null für fehlend/kaputt', () => {
    expect(parseOdtLengthToPx(null)).toBeNull()
    expect(parseOdtLengthToPx('abc')).toBeNull()
  })
})
describe('computeInsertSize', () => {
  it('skaliert ein 16×16-Icon NICHT hoch (4.14)', () => expect(computeInsertSize(16, 16, 606)).toEqual({ width: 16, height: 16 }))
  it('skaliert ein überbreites Bild proportional herunter', () => {
    const { width, height } = computeInsertSize(4000, 3000, 606)
    expect(width).toBe(606)
    expect(height).toBe(Math.round(3000 * (606 / 4000)))
  })
})
```

**Neu: `src/formats/docx/__tests__/imageSize.test.ts`** — Reader-Grenzfälle (kleines
DOCX-XML per Helfer analog zu bestehenden Reader-Testhelfern, `wp:extent cx="4762500"
cy="2857500"` = 500×300 px):

```ts
describe('DOCX-Reader: wp:extent', () => {
  it('liest cx/cy und rechnet EMU→px (Regression zu 6.3): 500×300', async () => { /* attrs.width===500, height===300 */ })
  it('lässt width/height null, wenn wp:extent fehlt (kein Absturz, 3.3)', async () => { /* … */ })
  it('setzt naturalWidth/naturalHeight = width/height beim Import (2.5)', async () => { /* … */ })
})
```

**Neu: `src/formats/odt/__tests__/imageSize.test.ts`** — analog, plus reale Fixture:

```ts
describe('ODT-Reader: svg:width/height', () => {
  it('parst cm (12cm × 8cm)', async () => { /* … */ })
  it('parst mm/in', async () => { /* … */ })
  it('lässt width/height null, wenn svg:* fehlt', async () => { /* … */ })
  it('liest aus Seasonal_Fruits2_en.odt fünf paarweise verschiedene Größen (4.13)', async () => {
    // erwartet 5 image-Nodes mit 5 unterschiedlichen (width,height)-Paaren, keine auf Default vereinheitlicht
  })
})
```

**Erweiterung `docx/__tests__/roundtrip.test.ts`** — der bestehende „False Confidence"-Test
(`describe('… images')` Z. 307, Test Z. 308–315) bekommt echte Assertions; zwei neue Tests:

```ts
it('preserves an embedded image as a self-contained data URL', async () => {
  const original = doc([{ type: 'image', attrs: { src: TINY_PNG, alt: 'Testbild', width: 100, height: 80 } }])
  const image = (await roundTrip(original)).body.content[0]
  expect(image.type).toBe('image')
  expect(image.attrs.src).toMatch(/^data:image\/png;base64,/)
  expect(image.attrs.width).toBe(100)  // NEU — Anforderung Testfall 12 / DoD 9
  expect(image.attrs.height).toBe(80)  // NEU
})
it('kollabiert ein Nicht-3:2-Bild NICHT auf den 300×200-Default (Regression 6.3)', async () => {
  const image = (await roundTrip(doc([{ type: 'image', attrs: { src: TINY_PNG, alt: '', width: 500, height: 300 } }]))).body.content[0]
  expect(image.attrs.width).toBe(500)
  expect(image.attrs.height).toBe(300)
})
it('erhält zwei Bilder mit identischem src, aber verschiedener Größe unabhängig (4.8)', async () => {
  const [a, b] = (await roundTrip(doc([
    { type: 'image', attrs: { src: TINY_PNG, alt: 'A', width: 100, height: 80 } },
    { type: 'image', attrs: { src: TINY_PNG, alt: 'B', width: 300, height: 240 } },
  ]))).body.content
  expect([a.attrs.width, a.attrs.height]).toEqual([100, 80])
  expect([b.attrs.width, b.attrs.height]).toEqual([300, 240])
})
```

**Erweiterung `odt/__tests__/roundtrip.test.ts`** (Bildtest `describe('… images')` Z. 341,
Test Z. 342–350 — **nicht** mit dem Negativ-Test Z. 213 verwechseln): analog, plus
cm-Rundungstoleranz (offene Frage 2 / Grenzfall 4.11):

```ts
it('erhält width/height über die cm-Rundreise innerhalb Sub-Pixel-Toleranz', async () => {
  const image = (await roundTrip(doc([{ type: 'image', attrs: { src: TINY_PNG, alt: '', width: 400, height: 300 } }]))).body.content[0]
  expect(Math.abs(image.attrs.width - 400)).toBeLessThanOrEqual(1)
  expect(Math.abs(image.attrs.height - 300)).toBeLessThanOrEqual(1)
})
```

(Rechnerisch verifiziert: 400 px → `pxToOdtCm` = `10.58cm` → `parseOdtLengthToPx` = 400 px;
300 px → `7.94cm` → 300 px. Kein kumulativer Drift.)

### 6.2 E2E-Tests (Playwright)

**Neu: `tests/e2e/image-resize.spec.ts`** (Struktur analog `docx.spec.ts`/`odt.spec.ts`/
`selection-regression.spec.ts`):

```ts
test.describe('Bildgröße — Panel & Ziehpunkte', () => {
  test('Tf 1: Panel erscheint nach Klick auf ein Bild, verschwindet bei Klick daneben')
  test('Tf 2/3: Breite ändern mit/ohne Lock → Höhe proportional/unverändert')
  test('Tf 4: Eckgriff ändert Breite+Höhe proportional, unabhängig von der Lock-Checkbox')
  test('Tf 5: Seitengriff ändert nur eine Dimension (Höhe bleibt nach Inline-Style-Fix sichtbar)')
  test('Tf 6: ungültige/extreme Eingaben verworfen/geclampt (4.1/4.2), kein NaN')
  test('Tf 7: Undo/Redo einer Feld-Größenänderung als ein Schritt')
  test('Tf 8: ganze Ziehgeste (mehrere mousemove) = genau ein Undo (4.7)')
  test('Tf 9: "Auf Originalgröße zurücksetzen" stellt Einfüge-/Importgröße exakt wieder her')
  test('Tf 10: Reset-Button deaktiviert, solange keine Änderung erfolgte (4.4)')
  test('4.3: Eckgriff über den Gegenrand ziehen kollabiert nicht auf 0/negativ')
  test('4.6: Bild in Tabellenzelle — identisches Verhalten, Einfügegröße an Zellbreite')
  test('4.14: 16×16-Icon wird beim Einfügen nicht hochskaliert')
  test('4.15: defekte Bilddatei zeigt sichtbare Fehlermeldung statt Absturz')
})

test.describe('Bildgröße — Rundreisen (Anforderung Abschnitt 5)', () => {
  test('DOCX 5.1.1: unverändertes Hoch-/Runterladen erhält 500×300 exakt (nicht 300×200)')
  test('DOCX 5.1.2/3: Feldgröße 640×480 → wp:extent exakt (unabhängiger XML-Parse) → Reimport identisch')
  test('DOCX 5.1.4: über Ziehpunkte gesetzte Größe exportiert/reimportiert exakt')
  test('DOCX 5.1.5: VariousPictures.docx — 5 Bilder bleiben individuell (4.13/Tf 17)')
  test('ODT 5.2.1-4: analog, svg:* in cm')
  test('ODT 5.2.5: Seasonal_Fruits2_en.odt — 5 Bilder bleiben individuell')
  test('Cross 5.3.1/2: DOCX→ODT→DOCX und ODT→DOCX→ODT ohne kumulativen Drift (4.11)')
  test('Cross 5.3.3: über Seitengriff bewusst verzerrte Größe bleibt über Doppel-Rundreise erhalten')
})
```

Downloads über `page.waitForEvent('download')`, Uploads über `filechooser` (Vorbild
`docx.spec.ts`). DOCX-Verifikation per direktem Parsen von `word/document.xml` auf
`wp:extent` (kein Extra-Dependency nötig).

**Erweiterung `tests/e2e/selection-regression.spec.ts`** — Anforderung 2.8 / Testfall 14,
neuer Test im bestehenden `describe`:

```ts
test('Bild-NodeSelection überlebt Resize-Drag; danach Klick in Text + Tippen verliert nichts (2.8)', async ({ page }) => {
  // Text tippen → Bild einfügen (filechooser) → Bild anklicken (Panel erscheint,
  // NodeSelection dank reconcile-Guard aus 3.9 STABIL) → Eckgriff ziehen →
  // in normalen Text klicken → Enter → weitertippen → kein Inhaltsverlust.
})
```

Dieser Test deckt zugleich Fund 5 ab: ohne den `reconcileSelectionOnClick`-Guard würde
schon der Bild-Klick die `NodeSelection` verlieren und das Panel nicht erscheinen.

---

## 7. Fixture-Inventar — reale Mehrbild-Testkandidaten (verifiziert)

**Durch Entpacken der echten Dateien ausgelesen** (nicht vermutet):

**DOCX — `tests/fixtures/external/docx/VariousPictures.docx`:** 5×`a:blip`, 5×`wp:extent`,
alle unterschiedlich:

| `cx`/`cy` (EMU) | `emuToPx` → px |
|---|---|
| `1723644`/`1848917` | ≈ 181×194 |
| `1238250`/`876300` | **130×92** (exakt) |
| `2440969`/`1705680` | ≈ 256×179 |
| `2148750`/`1305000` | ≈ 226×137 |
| `1828800`/`1676400` | **192×176** (exakt) |

**Primärkandidat** für den 300×200-Regressionstest: Bild 2 (130×92) — bewusst weit von
300×200 und **nicht** 3:2, damit ein stiller Default-Rückfall sofort auffiele.

**ODT — `tests/fixtures/external/odt/Seasonal_Fruits2_en.odt`:** 5×`draw:frame` mit je
`svg:width`/`svg:height` (die Datei enthält mehr als fünf `draw:image`-Elemente —
zweiter Verifikationsdurchlauf: 9 Vorkommen —, weil einzelne Frames neben dem
Hauptbild ein Fallback-`draw:image` tragen; der Reader nimmt per `firstChildNS` **das
erste** `draw:image` je Frame → genau 5 `image`-Nodes mit 5 Größen). Die maßgebliche
Größe steht am **Frame** (`svg:width`/`svg:height`), von denen es exakt 5 gibt:

| `svg:width`/`svg:height` | `cmToPx` → px |
|---|---|
| `5.078cm`/`1.078cm` | ≈ 192×41 |
| `8.177cm`/`5.457cm` | ≈ 309×206 |
| `15.155cm`/`4.576cm` | ≈ 573×173 |
| `5.45cm`/`3.995cm` | ≈ 206×151 |
| `4.366cm`/`4.551cm` | ≈ 165×172 |

Alle 10 Quellwerte oben wurden gegen die entpackten `word/document.xml` bzw. `content.xml`
**abgeglichen** (identisch). Beim Implementieren dennoch verifizieren, dass ein gewähltes
ODT-Fixture ein echtes `<draw:image xlink:href="Pictures/…">` enthält (manche Fixtures wie
`gfx_*` in `excelfileformat.odt` sind reine Vektor-`draw:frame` ohne Rasterbild).

---

## 8. Abnahme-Mapping (Anforderung Abschnitt 7/8 → Testartefakt)

| Anforderung | Abgedeckt durch |
|---|---|
| Testfälle 1–10 | `image-resize.spec.ts`, describe „Panel & Ziehpunkte" |
| Testfall 11 (DOCX-Rundreise, unabhängiger Parser) | `image-resize.spec.ts` „Rundreisen"; `word/document.xml`-Parse |
| Testfall 12/13 (Reader-Bug-Regression) | beide `roundtrip.test.ts` (neue Assertions) + beide `imageSize.test.ts` |
| Testfall 14 / 2.8 (Selection-Sync + Fund 5) | `selection-regression.spec.ts`, neuer Test; Fix in 3.9 |
| Testfall 15 (ODT-Rundreise) | `image-resize.spec.ts` „Rundreisen" |
| Testfall 16 (Cross-Format) | `image-resize.spec.ts` „Cross" |
| Testfall 17 (reale Mehrbilddatei) | `VariousPictures.docx`/`Seasonal_Fruits2_en.odt`-Tests (6.1/6.2/7) |
| Testfall 18 (Tabellenzelle) | `image-resize.spec.ts` 4.6-Test |
| Testfall 19 (identisches src, andere Größe) | `docx/…/roundtrip.test.ts`, neuer Test |
| Testfall 20 (kleines Icon) | `imageSize.test.ts` + E2E |
| Testfall 21 (Typ-Normalisierung, 4.16) | `normalizeDimAttr`-Unit-Test + Schema-Fix (3.2); Roundtrip-Assertions prüfen `=== number` |
| Testfall 21a (kein Leck interner Attribute, 4.17) | Writer serialisieren aus JSON (nie `naturalWidth` im XML); Assertion im Roundtrip-Test, dass Export-XML kein `natural`/`data-natural` enthält |
| Testfall 21b (0-Wert-Schutz, 4.18) | `clampImageWidthPx` im Command/Drag (3.4/3.7); Unit + E2E-Tf 6 |
| Grenzfall 4.1 | `imageSize.test.ts` (`parseSizeInputCm`), E2E-Tf 6 |
| Grenzfall 4.2/4.3 | Clamp-Unit-Tests, dedizierter E2E-Test |
| Grenzfall 4.4 | `canResetImageSize` (3.4), E2E-Tf 10 |
| Grenzfall 4.5 (Mehrfachselektion) | Dokumentiert: ProseMirror erlaubt nur eine einzelne `NodeSelection` → Panel/Ziehpunkte erscheinen nur für ein Bild; kein Zusatzcode, kurz per E2E bestätigen |
| Grenzfall 4.6 | `getAvailableContentWidthPx` (3.5), E2E |
| Grenzfall 4.7 | `imageResizePlugin`/`ImageNodeView` (3.6/3.7), E2E-Tf 8 |
| Grenzfall 4.8 | `docx/…/roundtrip.test.ts`, neuer Test |
| Grenzfall 4.9 | Inline-Style-Fix (3.2/3.7), offene Frage 4 (3.3) |
| Grenzfall 4.10 | offene Frage 2 (3.3), `odt/writer.ts` (3.12) |
| Grenzfall 4.11 | `odt/…/roundtrip.test.ts` Toleranztest, Cross-Format-E2E |
| Grenzfall 4.12 / 2.8 | `selection-regression.spec.ts` (Fund 5) |
| Grenzfall 4.13 | Abschnitt 7 (verifiziertes Inventar) |
| Grenzfall 4.14 | `computeInsertSize`-Unit + E2E |
| Grenzfall 4.15 | `try/catch` um `probe.decode()` (3.5), E2E |
| Grenzfall 4.16 | `normalizeDimAttr` + `validate` (3.1/3.2) |
| Grenzfall 4.17 | Export aus JSON-Modell; Schema `data-natural-*` nur im Editor-DOM; Roundtrip-XML-Assertion |
| Grenzfall 4.18 | Command-Clamp (3.4), optional Writer-`Math.max` (3.13) |
| Abschnitt 5 (Rundreise-Matrix) | `image-resize.spec.ts` + beide `roundtrip.test.ts` |
| Abschnitt 6.4 (vier offene Fragen) | 3.3 (alle vier beantwortet) |
| DoD 3 (Typisierung + kein Leck) | 3.2, Testfall 21/21a |
| DoD 4 (Untergrenze im Command) | 3.4, Testfall 21b |
| DoD 9 (irreführende Tests korrigiert) | 6.1 (beide `roundtrip.test.ts`) |
| DoD 10 (kein Fund ohne Vermerk) | Abschnitt 0 (Korrekturen), Abschnitt 2 (Funde 1–5), 3.13 (bewusst unverändert) |

---

## 9. Offene Abhängigkeiten / bewusste Vereinfachungen (nur dokumentieren)

- **`bild-einfuegen` (separater Slug):** MIME-/Signaturprüfung und `title`/`aria-label`
  am „🖼 Bild"-Element sind **nicht** Teil dieses Plans. `probe.decode()` (3.5) liefert
  nur nebenbei eine grobe Formatprüfung.
- **`bild-alt-text` (separater Slug):** Ein Alt-Text-Feld wäre im
  `ImagePropertiesPanel` naheliegend, ist laut Anforderung Abschnitt 0 aber **außerhalb
  des Geltungsbereichs**. Die Komponente ist so geschnitten, dass es später ohne Eingriff
  in die Größenlogik ergänzt werden kann.
- **Floating-Panel vs. zweite Toolbar-Leiste:** `ImagePropertiesPanel` ist hier eine
  zweite, fest sitzende Leiste unter der Haupt-Toolbar — nicht ein am Bild andockendes
  Overlay. Erfüllt „Panel erscheint kontextabhängig bei Bildauswahl", ist UX-seitig
  einfacher; positionsgebundenes Overlay als Folge-Iteration denkbar, kein Blocker.
- **VML-`<w:pict>`-Bildgröße:** bewusst nicht gelesen (3.10) — seltener Legacy-Fall,
  nicht Teil dieser Anforderung; Default-Logik greift, kein Datenverlust gegenüber heute.
- **`textumbruch-bild`/`bild-position` (separate Slugs):** unberührt — `image` bleibt
  `group:'block'`, keine Änderung an `draggable`/Umfließen.
- **Konsolidierung EMU-Konstanten:** `docx/writer.ts` rechnet EMU aktuell inline
  (`/96*914400`). Mit `shared/imageSize.ts` (`pxToEmu`/`emuToPx`) gibt es eine einzige
  Quelle; ein optionaler Umbau von `docx/writer.ts` auf `pxToEmu` ist funktional
  identisch und **nicht** Teil dieses Plans (reine Aufräum-Empfehlung).
```

