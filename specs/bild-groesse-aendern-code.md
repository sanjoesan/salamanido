# Bildgröße ändern — dateigenauer Umsetzungsplan

Gegenstück zu `specs/bild-groesse-aendern-req.md`. Beschreibt, nach tatsächlicher
Codelektüre (nicht nur Anforderungsangabe), was am bestehenden Code zu ändern ist,
welche Dateien neu angelegt werden, und wie die geforderte Verifikation (Abschnitt 7/8
der Anforderung) technisch umgesetzt wird. Stil/Tiefe orientiert sich an
`specs/schriftgroesse-waehlen-code.md` und `specs/tabelle-einfuegen-code.md`.

## 0. TL;DR

Der Befund aus Anforderung Abschnitt 6 ist **korrekt und wurde durch erneute
Codelektüre bestätigt**: Es existiert kein Bedienelement, kein NodeView, kein
`setImageSize`-Command; `width`/`height` sind im Schema vorhanden, werden aber vom
DOCX-/ODT-Reader nie befüllt. Anders als bei `schriftgroesse-waehlen` ist das
Datenmodell also bereits da — die Arbeit ist zu ~60 % **UI-Neubau** (Panel,
Ziehpunkte, NodeView) und zu ~40 % **Reader-Bugfix + Rundreise-Härtung**. Der Plan
unten:

1. führt eine neue, format- und UI-übergreifende Utility-Datei
   `src/formats/shared/imageSize.ts` ein (px↔cm, px↔EMU, Clamping, Freitext-Parsing,
   Einfüge-Größenlogik) — analog zu `shared/fontSize.ts`, damit Schema, Toolbar,
   Panel, NodeView und **beide** Reader/Writer dieselbe Umrechnung verwenden;
2. ergänzt das Schema um **zwei neue, nicht editierbare** Attribute
   `naturalWidth`/`naturalHeight` (für den „Zurücksetzen"-Button, Anforderung 2.5)
   und deckt dabei einen **eigenständigen, in der Anforderung nicht explizit
   benannten Bug** auf: das bestehende `toDOM` schreibt `width`/`height` nur als
   bloße HTML-Attribute, nicht als Inline-Style — die vorhandene CSS-Regel
   `.ProseMirror img { height: auto }` (`index.css:41`) **überschreibt damit jeden
   im Modell gespeicherten, vom Seitenverhältnis abweichenden Höhenwert visuell**,
   exakt das in Anforderung Abschnitt 3, Punkt 7 und Grenzfall 4.9 befürchtete
   Szenario. Das ist der Kern der Antwort auf offene Frage 4 (Abschnitt 3.3 unten);
3. baut einen **neuen NodeView** (`ImageNodeView`) mit acht Ziehpunkten über die
   **Pointer-Events-API** (nicht `mousedown`/`mousemove`) plus `setPointerCapture`,
   weil das Requirement 4.3 (Ziehen über den Rand hinaus) sonst nicht sauber
   funktioniert, sowie ein **transientes Plugin-State** (`imageResizePlugin`) für die
   Live-Vorschau während des Ziehens, damit **nicht** pro `mousemove` ein
   Undo-Schritt entsteht (Anforderung 2.3.3, Grenzfall 4.7);
4. deckt einen **zweiten, unabhängigen Bug** auf: `image`-Nodes haben `draggable:
   true` (`schema.ts:53`, für natives Verschieben im Dokument) — ohne Gegenmaßnahme
   würde ein Pointerdown auf einem neuen Ziehpunkt-Overlay potenziell einen nativen
   HTML5-Drag der ganzen Grafik auslösen statt eine Größenänderung. Wird über
   `draggable="false"` auf den Handle-Elementen selbst plus `stopEvent`/
   `preventDefault` gelöst (Abschnitt 3.7);
5. behebt den in Anforderung Abschnitt 6.3 beschriebenen Reader-Bug in **beiden**
   Formaten (`wp:extent`, `svg:width`/`svg:height`) — und stellt dabei fest, dass
   **kein einziger Writer geändert werden muss** für die reine Bugbehebung: Beide
   Writer-Fallbacks (`docx/writer.ts:76-77`, `odt/writer.ts:115-116`) waren immer
   schon korrekt „nutze vorhandenen Wert, sonst Default" — der Bug lag
   ausschließlich darin, dass der Reader nie einen vorhandenen Wert lieferte;
6. beantwortet alle vier offenen Fragen aus Anforderung Abschnitt 6.4 mit konkreten
   Entscheidungen (Abschnitt 3.3 unten) statt sie unbeantwortet zu lassen;
7. identifiziert zwei reale Fixture-Dateien mit mehreren unterschiedlich großen
   Bildern (`VariousPictures.docx`, `Seasonal_Fruits2_en.odt`) für die in
   Anforderung Grenzfall 4.13/5.1.5/5.2.5 geforderten Tests, statt nur synthetische
   Daten zu verwenden (Abschnitt 7).

---

## 1. Methodik dieser Prüfung

Gelesen wurden: `src/formats/shared/schema.ts`, `src/formats/shared/editor/commands.ts`,
`src/formats/shared/editor/Toolbar.tsx`, `src/formats/shared/editor/WordEditor.tsx`,
`src/formats/shared/editor/pagination.ts` (als Vorbild für Plugin-State-Stil),
`src/formats/shared/editor/pageLayout.ts`, `src/index.css`, `src/formats/docx/reader.ts`,
`src/formats/docx/writer.ts`, `src/formats/docx/imageCollector.ts`,
`src/formats/odt/reader.ts`, `src/formats/odt/writer.ts`, `src/formats/odt/imageCollector.ts`,
beide `xmlUtil.ts`, beide `__tests__/roundtrip.test.ts`, `docx/__tests__/external-fixtures.test.ts`,
`tests/e2e/selection-regression.spec.ts`, `src/app/DocumentWorkspace.tsx` (als Vorbild für
sichtbare Fehlermeldungen), `specs/schriftgroesse-waehlen-code.md` (Stilvorbild),
`specs/bild-einfuegen-req.md` (Abgrenzung — siehe Abschnitt 9), `FEATURE-SPEC-DOCX-ODT.md`
Abschnitt 7. Zusätzlich wurden zwei reale Fixture-Dateien
(`tests/fixtures/external/docx/VariousPictures.docx`,
`tests/fixtures/external/odt/Seasonal_Fruits2_en.odt`) per Skript entpackt und ihre
`wp:extent`/`svg:width`+`svg:height`-Werte extrahiert (Ergebnis in Abschnitt 7), um echte
Rundreise-Testkandidaten mit mehreren unterschiedlich großen Bildern zu identifizieren
statt nur synthetisches Test-XML zu unterstellen. `node_modules/prosemirror-view` wurde
geprüft, um die NodeView-Lebenszyklus-Methoden (`update`, `selectNode`, `deselectNode`,
`stopEvent`, `ignoreMutation`) und das `draggable`-Verhalten für NodeSpecs mit
`draggable: true` korrekt zu spezifizieren.

---

## 2. Ist-Zustand nach Codelektüre — Abgleich mit der Anforderung

Bestätigt alle Aussagen aus Anforderung Abschnitt 6 und der Fundstellen-Tabelle:

| Fundstelle | Ist-Zustand | Deckt sich mit Anforderung? |
|---|---|---|
| `schema.ts:45-72` | `image`-Node: `src`, `alt` (Default `''`), `width`/`height` (Default `null`), `draggable: true`, `group: 'block'`; `parseDOM`/`toDOM` für `width`/`height` vorhanden | Ja |
| `commands.ts:66-74` | `insertImage(src, alt='')` — kein `width`/`height`-Parameter, kein `setImageSize` | Ja |
| `Toolbar.tsx:97-108,241-244` | `handleImagePick` liest Data-URL, ruft `insertImage` ohne Größenermittlung; kein Bedienelement für Größe | Ja |
| `WordEditor.tsx` | Kein `nodeViews`-Eintrag, keine `image`-bezogene Plugin/Komponente | Ja |
| `index.css:39-42` | `.ProseMirror img { max-width: 100%; height: auto; }` | Ja, siehe zusätzlicher Fund 1 unten |
| `docx/reader.ts:134-139,172-177` | Liest nur `r:embed`/`docPr@name`, **kein** `wp:extent` | Ja |
| `docx/writer.ts:72-92` | `widthPx = Number(node.attrs?.width ?? 300)` | Ja — Fallback selbst ist bereits korrekt bedingt |
| `odt/reader.ts:144-150` | Liest nur `xlink:href`/`draw:name`, **kein** `svg:width`/`svg:height` | Ja |
| `odt/writer.ts:112-119` | `width = node.attrs?.width ? `${width}px` : '6cm'` | Ja — Fallback korrekt bedingt, aber `px`-Suffix als Zieleinheit fragwürdig (siehe offene Frage 2) |
| `docx/imageCollector.ts`, `odt/imageCollector.ts` | Dedup ausschließlich über Daten-URL, Größe bleibt Node-Attribut | Ja, architektonisch bereits korrekt, keine Änderung nötig |
| `docx/__tests__/roundtrip.test.ts:253-259` | Setzt `width:100,height:80`, prüft nur `type`/`src` | Ja, „False Confidence"-Test bestätigt |
| `odt/__tests__/roundtrip.test.ts:213-221` | Setzt `width`/`height` nicht einmal | Ja |

Zusätzlich beim Audit gefunden, **nicht** in der Anforderungstabelle erwähnt (siehe
Abschnitt 3 für Details/Fix):

1. **CSS-Spezifität-Bug (`index.css:39-42` + `schema.ts:68-71`):** `toDOM` schreibt
   `width`/`height` nur als **bloße HTML-Attribute** (`['img', { src, alt, width,
   height }]`). Browser behandeln `width`/`height`-Attribute auf `<img>` mit
   niedrigster CSS-Priorität (Presentational Hints) — **jede** Autoren-CSS-Regel,
   hier `.ProseMirror img { height: auto; }`, überschreibt einen im Modell
   gespeicherten expliziten Höhenwert visuell. Das bedeutet: Ein per Seitengriff
   bewusst nicht-seitenverhältnistreu gesetzter Höhenwert (Anforderung 2.3.2) würde
   **heute schon**, sobald `toDOM` überhaupt einen Höhenwert schreibt, visuell auf
   `auto` (= durch die tatsächliche Breite bestimmt) zurückfallen — ein stiller
   Widerspruch zwischen Modell und Darstellung, der genau das ist, was Anforderung
   Abschnitt 3, Punkt 7 und Grenzfall 4.9 vorsorglich benennen. Muss behoben werden,
   sonst ist Testfall 5 (Seitengriff-Ziehen, Requirement Abschnitt 7) grün im Modell,
   aber sichtbar falsch im Editor. Fix in Abschnitt 3.2.
2. **`draggable: true` vs. neue Ziehpunkte (`schema.ts:53`):** `image` ist bereits
   als natives Drag-Ziel markiert (Verschieben im Dokument). Ohne Gegenmaßnahme kann
   ein `pointerdown` auf einem neuen Resize-Handle (das als Kind-Element **innerhalb**
   desselben NodeView-`dom` liegt) vom Browser als Beginn eines nativen HTML5-Drags
   der ganzen Grafik interpretiert werden, bevor die eigene Resize-Logik overhaupt
   `preventDefault()` aufrufen kann. Muss beim Bau der Handles explizit
   gegengesteuert werden (Abschnitt 3.7).
3. **DOCX-/ODT-Writer benötigen für den reinen Bugfix aus Abschnitt 6.3 keine
   Änderung:** `docx/writer.ts:76-77` und `odt/writer.ts:115-116` verwenden bereits
   heute `node.attrs?.width ?? <Default>` — das ist exakt das von Anforderung
   Abschnitt 3, Punkt 4/6 geforderte Verhalten („Fallback darf nur greifen, wenn
   tatsächlich kein Wert vorhanden ist"). Der Bug liegt **ausschließlich** im
   Reader, der nie einen Wert liefert. Einzige tatsächliche Writer-Änderung in
   diesem Plan betrifft die **Einheit** im ODT-Writer (offene Frage 2, Abschnitt 3.3),
   nicht die Fallback-Logik selbst.
4. **`imageCollector.ts` (beide Formate) ist bereits korrekt**, wie die Anforderung
   selbst vermutet (Grenzfall 4.8) — verifiziert durch Lesen von `add()`: Dedup-Key
   ist die Daten-URL, nicht Größe; zwei `image`-Nodes mit gleichem `src`, aber
   unterschiedlichem `width`/`height` teilen sich eine Mediendatei und bekommen
   unabhängig korrekte `wp:extent`/`svg:width`+`svg:height` je Aufrufstelle
   (`imageParagraphXml`/`blockToOdt` werden pro Node aufgerufen, nicht pro
   Mediendatei). Kein Code hierzu nötig, nur ein Regressionstest (Abschnitt 6).

---

## 3. Architekturentscheidungen (vor dem dateigenauen Plan)

### 3.1 Neue Datei `src/formats/shared/imageSize.ts`

Einheiten-Umrechnung, Clamping und Einfüge-Größenlogik werden an mindestens sechs
Stellen gebraucht (Schema, Toolbar, Panel, NodeView, beide Reader, ODT-Writer) — eine
gemeinsame, reine Utility-Datei ohne ProseMirror-Abhängigkeit, analog zu
`shared/fontSize.ts`:

```ts
// src/formats/shared/imageSize.ts
import { PAGE_CONTENT_WIDTH_PX, PAGE_CONTENT_HEIGHT_PX } from './editor/pageLayout'

export const IMAGE_SIZE_MIN_PX = 1
// "das x-fache der Seitenbreite" (Anforderung Grenzfall 4.2) — Entscheidung: Faktor 3,
// großzügig genug für bewusst großformatige Bilder, verhindert aber ein Bild, das
// die Seite um ein Vielfaches sprengt.
export const IMAGE_SIZE_MAX_WIDTH_PX = 3 * PAGE_CONTENT_WIDTH_PX  // ≈ 1818 px
export const IMAGE_SIZE_MAX_HEIGHT_PX = 3 * PAGE_CONTENT_HEIGHT_PX // ≈ 2805 px

export const PX_PER_CM = 96 / 2.54 // 96 CSS-px/Zoll, konsistent zu pageLayout.ts/docx/writer.ts

export function clampImageWidthPx(px: number): number {
  return Math.min(IMAGE_SIZE_MAX_WIDTH_PX, Math.max(IMAGE_SIZE_MIN_PX, Math.round(px)))
}
export function clampImageHeightPx(px: number): number {
  return Math.min(IMAGE_SIZE_MAX_HEIGHT_PX, Math.max(IMAGE_SIZE_MIN_PX, Math.round(px)))
}

export function pxToCm(px: number): number {
  return px / PX_PER_CM
}
export function cmToPx(cm: number): number {
  return cm * PX_PER_CM
}
export function pxToEmu(px: number): number {
  return Math.round((px / 96) * 914400)
}
export function emuToPx(emu: number): number {
  return Math.round((emu / 914400) * 96)
}

/** Zeigt cm mit 2 Nachkommastellen, deutschem Komma, ohne überflüssige Nullen. */
export function formatSizeCm(px: number): string {
  const cm = pxToCm(px)
  return cm.toFixed(2).replace(/0+$/, '').replace(/\.$/, '').replace('.', ',')
}

/**
 * Parst Freitext-Eingabe aus den Größenfeldern (cm, deutsches Komma). Liefert `null`
 * für alles, was keine reine positive Zahl ist (Grenzfall 4.1) — kein
 * `parseFloat`-Fallback, der z. B. "12cm" oder "abc" fälschlich durchließe.
 */
export function parseSizeInputCm(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null
  const value = Number(normalized)
  return Number.isFinite(value) && value > 0 ? value : null
}

/** ODF erlaubt cm/mm/in/px/pt an `svg:width`/`svg:height` — in interne px (96 dpi) umrechnen. */
const ODT_UNIT_TO_PX: Record<string, number> = { cm: PX_PER_CM, mm: PX_PER_CM / 10, in: 96, px: 1, pt: 96 / 72 }
export function parseOdtLengthToPx(raw: string | null | undefined): number | null {
  if (!raw) return null
  const match = /^([\d.]+)(cm|mm|in|px|pt)$/.exec(raw.trim())
  if (!match) return null
  const value = Number(match[1])
  if (!Number.isFinite(value) || value <= 0) return null
  return Math.round(value * ODT_UNIT_TO_PX[match[2]])
}

/**
 * Einfüge-Standardgröße (Anforderung 2.4): Seitenverhältnis wird beibehalten; ist
 * das Bild schmaler als die verfügbare Breite, wird es NICHT hochskaliert
 * (Grenzfall 4.14 — 16×16-px-Icon bleibt 16×16 px), nur heruntergerechnet, wenn es
 * die verfügbare Breite überschreitet.
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

Reine TS-Funktionen, per Vitest ohne DOM/Editor testbar (Abschnitt 6.1).

### 3.2 Schema-Erweiterung: `naturalWidth`/`naturalHeight` + Inline-Style-Fix

```ts
// Ergänzung in src/formats/shared/schema.ts, image-NodeSpec (Zeile 45-72):
image: {
  group: 'block',
  attrs: {
    src: { validate: 'string' },
    alt: { default: '', validate: 'string' },
    width: { default: null },
    height: { default: null },
    // Nicht über die UI direkt editierbar — dient ausschließlich dem
    // "Auf Originalgröße zurücksetzen"-Button (Anforderung 2.5). Editor-intern,
    // NICHT Teil eines Standard-OOXML-/ODF-Felds — siehe offene Frage 3 (Abschnitt 3.3).
    naturalWidth: { default: null },
    naturalHeight: { default: null },
  },
  draggable: true,
  parseDOM: [
    {
      tag: 'img[src]',
      getAttrs: (dom) => {
        const el = dom as HTMLImageElement
        const naturalW = Number(el.getAttribute('data-natural-width'))
        const naturalH = Number(el.getAttribute('data-natural-height'))
        return {
          src: el.getAttribute('src'),
          alt: el.getAttribute('alt') || '',
          width: el.getAttribute('width'),
          height: el.getAttribute('height'),
          // Nur übernehmen, wenn beide vorhanden und numerisch — sonst bleibt der
          // Schema-Default `null` (kein Absturz, kein stiller NaN, analog zum in
          // schriftgroesse-waehlen-code.md Abschnitt 2 dokumentierten Muster).
          naturalWidth: Number.isFinite(naturalW) && naturalW > 0 ? naturalW : null,
          naturalHeight: Number.isFinite(naturalH) && naturalH > 0 ? naturalH : null,
        }
      },
    },
  ],
  toDOM(node) {
    const { src, alt, width, height, naturalWidth, naturalHeight } = node.attrs
    // Zusätzlich zu den bloßen Attributen ein Inline-Style setzen: HTML-Presentational-
    // Attribute (`width`/`height`) haben die niedrigste CSS-Priorität und werden von
    // JEDER Autoren-Regel überschrieben — hier `.ProseMirror img { height: auto; }`
    // (index.css:41). Ein per Seitengriff bewusst verzerrter, expliziter Höhenwert
    // würde sonst visuell auf "auto" zurückfallen (Anforderung Abschnitt 3, Punkt 7 /
    // Grenzfall 4.9 — siehe Abschnitt 2, zusätzlicher Fund 1 dieses Plans). Inline-
    // Style gewinnt gegen jede Klassenregel, unabhängig von Deklarationsreihenfolge.
    const style = [width != null ? `width:${width}px` : '', height != null ? `height:${height}px` : '']
      .filter(Boolean)
      .join(';')
    return [
      'img',
      {
        src,
        alt,
        width,
        height,
        style: style || undefined,
        'data-natural-width': naturalWidth ?? undefined,
        'data-natural-height': naturalHeight ?? undefined,
      },
    ]
  },
},
```

`data-natural-width`/`-height` sichern **Copy&Paste innerhalb des Editors** ab:
ProseMirror serialisiert Block-Nodes für die Zwischenablage über `toDOM`/liest sie
über `parseDOM` zurück — ohne diese beiden Custom-Attribute würde ein kopiertes Bild
seine bekannte Originalgröße verlieren und der „Zurücksetzen"-Button nach einem
Copy&Paste unerwartet deaktiviert werden.

### 3.3 Auflösung der vier offenen Fragen (Anforderung Abschnitt 6.4)

Alle vier werden hier **verbindlich** beantwortet, wie von Abschnitt 8, Punkt 6 der
Anforderung verlangt:

1. **Anzeigeeinheit:** **Zentimeter**, 2 Nachkommastellen, deutsches Komma
   (`formatSizeCm`/`parseSizeInputCm`, Abschnitt 3.1). Begründung: konsistent zum
   bereits vorhandenen ODT-Fallback (`6cm`/`4cm`) und die für Endnutzer:innen
   vertrautere Einheit gegenüber px bei Dokumentbearbeitung. Intern bleibt alles
   Pixel bei 96 dpi (Anforderung 2.6, unverändert).
2. **ODT-Einheiten-Schreibweise beim Export:** **Umrechnung nach `cm`** statt des
   aktuellen `px`-Suffix-Fallbacks (`odt/writer.ts:115-116`). Begründung: bessere
   Kompatibilität mit älteren/strikten ODF-Konsumenten (Grenzfall 4.10 der
   Anforderung benennt dieses Risiko explizit, `px` als SVG-Längeneinheit ist zwar im
   ODF-Schema zulässig, aber seltener in freier Wildbahn getestet als `cm`). Siehe
   Abschnitt 4.7 für den Diff.
3. **Persistenz der Originalgröße (`naturalWidth`/`naturalHeight`):**
   **rein editor-intern, NICHT Teil des Exportformats.** Weder OOXML noch ODF sehen
   ein Standardfeld für „Größe vor letzter manueller Änderung" vor; ein
   proprietäres Zusatzfeld einzuführen würde die Rundreise-Interoperabilität mit
   echtem Word/LibreOffice gefährden (Fremd-Konsumenten müssten das Feld ignorieren
   können, was zusätzliches Risiko ohne Gegenwert ist). Konkrete Konsequenz,
   **explizit dokumentiert** statt stillschweigend angenommen: Der
   „Zurücksetzen"-Button verliert seine Funktion (wird deaktiviert, siehe Grenzfall
   4.4) nach jedem Speichern-und-erneut-Öffnen. **Ausnahme, die die Anforderung
   selbst vorsieht (2.5, letzter Satz):** Direkt nach einem **Import** gilt die im
   Dokument gespeicherte Größe für die **laufende Sitzung** als Originalgröße —
   Reader setzen `naturalWidth`/`naturalHeight` also auf denselben Wert wie
   `width`/`height` (Abschnitt 4.4/4.5), auch wenn dieser Wert beim nächsten Export
   wieder verloren geht.
4. **Verhältnis Modellwert zu CSS-Deckelung (`max-width: 100%`):** **Modellwert ist
   immer die Wahrheit** — das Eingabefeld/die Ziehpunkte zeigen/speichern exakt den
   eingegebenen/gezogenen Wert, auch wenn `max-width: 100%` ihn optisch kappt (das
   entspricht dem Verhalten von Word/LibreOffice, die ebenfalls Bilder größer als die
   Seite erlauben). Mit dem Inline-Style-Fix aus Abschnitt 3.2 bleibt diese
   Diskrepanz auf den **Breiten**-Fall beschränkt (analog zu jedem anderen zu breiten
   Block-Element in der Seitenansicht) — der ursprünglich befürchtete **Höhen**-Bug
   (`height: auto` überschreibt gespeicherte Höhe) ist damit behoben, nicht nur
   dokumentiert.

### 3.4 Commands: `setImageSize`, `resetImageToNaturalSize`, `canResetImageSize`

Analog zu `setAlign()` (`commands.ts:13-27`), das ebenfalls über die aktuelle
Selektion statt über einen expliziten `pos`-Parameter arbeitet — hier speziell für
`NodeSelection` auf `image` (im Unterschied zu `applyMarkColor`/`clearMarkColor`, die
bei leerer Selektion `false` liefern: hier ist die Selektion per Definition der
Bild-Node selbst, sie ist nie "leer"):

```ts
import { NodeSelection } from 'prosemirror-state'
import { clampImageWidthPx, clampImageHeightPx } from '../imageSize'

function selectedImage(state: EditorState): { pos: number; node: PMNode } | null {
  const { selection } = state
  if (!(selection instanceof NodeSelection)) return null
  if (selection.node.type !== wordSchema.nodes.image) return null
  return { pos: selection.from, node: selection.node }
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

/** Für die UI: Button aktiv nur, wenn eine Originalgröße bekannt UND von der aktuellen
 *  Größe verschieden ist (Anforderung 2.5: sonst sichtbar, aber wirkungslos/deaktiviert). */
export function canResetImageSize(state: EditorState): boolean {
  const target = selectedImage(state)
  if (!target) return false
  const { width, height, naturalWidth, naturalHeight } = target.node.attrs
  if (naturalWidth == null || naturalHeight == null) return false
  return width !== naturalWidth || height !== naturalHeight
}

export function getSelectedImage(state: EditorState) {
  return selectedImage(state)
}
```

Da `setNodeAttribute`/`AttrStep` die Dokumentstruktur nicht verändert (keine
Positionsverschiebung), bleibt die `NodeSelection` nach `state.apply(tr)` automatisch
auf demselben Bild bestehen — **kein** manuelles Neu-Selektieren nötig, erfüllt
Anforderung 2.2.4 ohne Zusatzcode. Beide Ranges/Attribute werden in **einer**
Transaktion gesetzt → genau **ein** Undo-Schritt pro Aufruf (Anforderung 2.7).

`insertImage` wird um einen optionalen dritten Parameter erweitert:

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

`naturalWidth`/`naturalHeight` werden beim Einfügen **gleich** `width`/`height`
gesetzt (Anforderung 2.4, letzter Satz: „Diese beim Einfügen ermittelte Größe gilt
zugleich als Originalgröße"). Rückwärtskompatibel: `size` weglassen ergibt exakt das
heutige Verhalten (`width`/`height`/`naturalWidth`/`naturalHeight` bleiben `null`) —
relevant für den `schema.ts`-`parseDOM`-Pfad (Paste aus Fremd-HTML ohne bekannte
Originalgröße, siehe Abschnitt 3.2).

### 3.5 `insertImage`-Aufrufer in der Toolbar: Naturalgröße ermitteln + Zellkontext

`Toolbar.tsx`, `handleImagePick` (Anforderung 2.4, Grenzfall 4.6/4.15):

```ts
function getAvailableContentWidthPx(view: EditorView): number {
  const { $from } = view.state.selection
  for (let depth = $from.depth; depth >= 0; depth--) {
    if ($from.node(depth).type.name === 'table_cell') {
      const cellDom = view.domAtPos($from.before(depth)).node
      const el = cellDom instanceof HTMLElement ? cellDom : cellDom.parentElement
      const width = el?.getBoundingClientRect().width
      if (width) return width
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
    const reader = new FileReader()
    const dataUrl = await new Promise<string>((resolve, reject) => {
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

`imageError`/`setImageError` als neuer `useState<string | null>` in `Toolbar`,
angezeigt als `<span className="text-xs text-red-600 dark:text-red-400">` **exakt**
nach dem in `DocumentWorkspace.tsx:57` bereits etablierten Muster (kein neues
Fehler-UI-Konzept einführen). `getAvailableContentWidthPx` deckt Grenzfall 4.6
(Bild in Tabellenzelle: verfügbare Breite = Zellbreite, nicht Seitenbreite) konkret
ab, statt es nur „zu verifizieren" zu lassen.

**Bewusst außerhalb des Geltungsbereichs dieses Plans:** MIME-Typ-/Signatur-Prüfung
vor dem Einfügen sowie `title`/`aria-label` am „🖼 Bild"-Kontrolleintrag gehören laut
`specs/bild-einfuegen-req.md` zum separaten Slug `bild-einfuegen` — hier nur soweit
berührt, wie `probe.decode()` ohnehin als Nebeneffekt eine grobe Formatprüfung liefert
(ein `.txt`-Umbenennen auf `.png` lässt `decode()` fehlschlagen, da keine gültigen
Bilddaten vorliegen).

### 3.6 `imageResizePlugin` — transientes Drag-State ohne Undo-Spam

Neues Plugin, Stil analog zu `pagination.ts` (State + `PluginKey`, aber ohne eigenes
`view()`-Lifecycle, da der NodeView selbst die Dispatches auslöst):

```ts
// src/formats/shared/editor/imageResizePlugin.ts
import { Plugin, PluginKey } from 'prosemirror-state'

export interface ImageDragPreview {
  pos: number
  width: number
  height: number
}

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

Während des Ziehens dispatcht der NodeView (Abschnitt 3.7) pro `pointermove` eine
Transaktion, die **keine** Dokumentänderung enthält (`tr.docChanged === false`,
`WordEditor.tsx:94` prüft genau das, bevor es `onChange` aufruft — die App speichert
also während des Ziehens nichts als „dirty" ab) und explizit von der Undo-Historie
ausgeschlossen wird:

```ts
view.dispatch(view.state.tr.setMeta(imageResizeKey, { pos, width, height }).setMeta('addToHistory', false))
```

`WordEditor.tsx` ruft `forceRender` **unabhängig** von `tr.docChanged` bei jeder
Transaktion auf (Zeile 97 im Ist-Code) — die Toolbar/`ImagePropertiesPanel`
bekommen die Live-Werte also **ohne Zusatzcode** synchron mit jedem
`pointermove` (Anforderung Element 5 „Eingabefelder aktualisieren sich synchron").
Erst bei `pointerup` wird die **echte** Transaktion (`setImageSize`, Abschnitt 3.4)
zusammen mit dem Zurücksetzen des Plugin-State in einer Transaktion dispatcht:

```ts
view.dispatch(
  view.state.tr
    .setNodeAttribute(pos, 'width', finalWidth)
    .setNodeAttribute(pos, 'height', finalHeight)
    .setMeta(imageResizeKey, null),
)
```

Damit ist **eine gesamte Ziehgeste (mousedown…mouseup) exakt ein Undo-Schritt**
(Anforderung 2.3.3, Grenzfall 4.7) — die Zwischenschritte erzeugen gar keine
history-fähige Transaktion.

### 3.7 `ImageNodeView` — acht Ziehpunkte, Pointer-Events, `draggable`-Konflikt

```ts
// src/formats/shared/editor/ImageNodeView.ts (Auszug, Kernlogik)
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
      handle.setAttribute('draggable', 'false') // Fund 2 (Abschnitt 2): verhindert nativen HTML5-Drag
      handle.addEventListener('pointerdown', (event) => this.startDrag(event, id))
      this.dom.appendChild(handle)
    }
  }

  private syncImg(node: PMNode) {
    this.img.src = node.attrs.src
    this.img.alt = node.attrs.alt ?? ''
    if (node.attrs.width != null) this.img.style.width = `${node.attrs.width}px`
    if (node.attrs.height != null) this.img.style.height = `${node.attrs.height}px`
  }

  update(node: PMNode) {
    if (node.type !== this.node.type) return false
    this.node = node
    this.syncImg(node)
    return true
  }

  selectNode() {
    this.dom.classList.add('image-node-view--selected')
  }
  deselectNode() {
    this.dom.classList.remove('image-node-view--selected')
  }
  // Eigene Pointer-Gesten auf den Handles sollen NICHT von ProseMirrors eigener
  // Selektions-/Drag-Behandlung interpretiert werden (dokumentiertes NodeView-Muster
  // für interaktive Innen-DOM-Elemente).
  stopEvent(event: Event) {
    return !!(event.target as HTMLElement).closest?.('.image-resize-handle')
  }
  ignoreMutation() {
    return true // Style-Mutationen während des Ziehens sind rein visuell, kein Modell-Zustand.
  }

  private startDrag(event: PointerEvent, handle: HandleId) {
    event.preventDefault()
    event.stopPropagation() // Fund 2: verhindert, dass der Pointerdown zusätzlich als
    // Drag-Start des `draggable: true`-Bild-Node interpretiert wird.
    const target = event.currentTarget as HTMLElement
    target.setPointerCapture(event.pointerId) // hält Events auch bei Verlassen des Viewports (Grenzfall 4.3)

    const startX = event.clientX
    const startY = event.clientY
    const rect = this.img.getBoundingClientRect()
    const startW = rect.width
    const startH = rect.height
    const aspect = startW / startH
    const pos = this.getPos()
    if (typeof pos !== 'number') return

    const compute = (dx: number, dy: number) => {
      let width = startW
      let height = startH
      if (handle.includes('e')) width = startW + dx
      if (handle.includes('w')) width = startW - dx
      if (handle.includes('s')) height = startH + dy
      if (handle.includes('n')) height = startH - dy
      if (CORNER_HANDLES.has(handle)) {
        // Dominante Achse (größere relative Änderung) bestimmt, die andere folgt dem Seitenverhältnis.
        const byWidth = Math.abs(width / startW - 1) >= Math.abs(height / startH - 1)
        if (byWidth) height = width / aspect
        else width = height * aspect
      }
      return { width: clampImageWidthPx(width), height: clampImageHeightPx(height) }
    }

    const onMove = (moveEvent: PointerEvent) => {
      const { width, height } = compute(moveEvent.clientX - startX, moveEvent.clientY - startY)
      this.img.style.width = `${width}px`
      this.img.style.height = `${height}px`
      this.view.dispatch(this.view.state.tr.setMeta(imageResizeKey, { pos, width, height }).setMeta('addToHistory', false))
    }
    const onUp = (upEvent: PointerEvent) => {
      target.releasePointerCapture(event.pointerId)
      target.removeEventListener('pointermove', onMove)
      target.removeEventListener('pointerup', onUp)
      const { width, height } = compute(upEvent.clientX - startX, upEvent.clientY - startY)
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

Design-Entscheidungen, die direkt von der Anforderung gefordert werden:

- **Eckgriffe (`nw/ne/se/sw`) sperren das Seitenverhältnis immer**, unabhängig vom
  Zustand der Panel-Checkbox (Anforderung 2.3.1) — implementiert über
  `CORNER_HANDLES`, nicht über den Lock-Zustand des Panels.
- **Seitengriffe (`n/e/s/w`) ändern nur eine Dimension** (Anforderung 2.3.2) — der
  `compute`-Zweig für `CORNER_HANDLES` wird für sie nicht ausgeführt.
- **Clamping auf `[IMAGE_SIZE_MIN_PX, IMAGE_SIZE_MAX_*_PX]` bei jedem
  `pointermove`**, nicht erst am Ende — erfüllt Grenzfall 4.3 („Ziehen über den
  gegenüberliegenden Rand hinaus… kein Einfrieren der Geste"): die Geste bleibt
  responsiv, das Bild schrumpft nur bis zum Mindestwert, nie darunter/negativ.
- **`setPointerCapture`** statt globaler `window`-Listener: Events werden
  zuverlässig weiter an den Handle geliefert, auch wenn der Zeiger den
  Viewport/das Handle-Element verlässt — direkt relevant für Grenzfall 4.3.

### 3.8 `ImagePropertiesPanel` — Eingabefelder, Lock-Checkbox, Reset-Button

Neue Datei `src/formats/shared/editor/ImagePropertiesPanel.tsx`, gerendert als
zweite, bedingt sichtbare Leiste direkt unter der Haupt-`Toolbar` (bewusste
Vereinfachung gegenüber einem am Bild andockenden Floating-Panel — siehe Abschnitt 9):

```tsx
export function ImagePropertiesPanel({ view }: { view: EditorView }) {
  const [lockAspect, setLockAspect] = useState(true) // Anforderung 1: Default aktiviert
  const target = getSelectedImage(view.state)
  const drag = imageResizeKey.getState(view.state)

  if (!target) return null // Element 1: nur sichtbar bei aktiver Bild-NodeSelection
  const live = drag && drag.pos === target.pos ? drag : null
  const widthPx = live?.width ?? target.node.attrs.width ?? 0
  const heightPx = live?.height ?? target.node.attrs.height ?? 0

  function commitWidth(raw: string) {
    const cm = parseSizeInputCm(raw)
    if (cm === null) return // Grenzfall 4.1: verwerfen, alter Wert bleibt
    const newWidth = clampImageWidthPx(cmToPx(cm))
    const ratio = target!.node.attrs.width ? target!.node.attrs.height / target!.node.attrs.width : 1
    const newHeight = lockAspect ? clampImageHeightPx(newWidth * ratio) : target!.node.attrs.height
    run(view, setImageSize(newWidth, newHeight))
  }
  function commitHeight(raw: string) {
    const cm = parseSizeInputCm(raw)
    if (cm === null) return
    const newHeight = clampImageHeightPx(cmToPx(cm))
    const ratio = target!.node.attrs.height ? target!.node.attrs.width / target!.node.attrs.height : 1
    const newWidth = lockAspect ? clampImageWidthPx(newHeight * ratio) : target!.node.attrs.width
    run(view, setImageSize(newWidth, newHeight))
  }

  return (
    <div role="toolbar" aria-label="Bildgröße" className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 px-2 py-1.5 text-sm">
      <label className="flex items-center gap-1">
        Breite
        <input
          aria-label="Bildbreite in Zentimetern"
          className="w-16 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-1 py-0.5"
          defaultValue={formatSizeCm(widthPx)}
          key={`w-${widthPx}`} // erzwingt Neuanzeige des committeten Modellwerts nach jedem Commit (offene Frage 4)
          onKeyDown={(e) => e.key === 'Enter' && commitWidth((e.target as HTMLInputElement).value)}
          onBlur={(e) => commitWidth(e.target.value)}
        />
        cm
      </label>
      <label className="flex items-center gap-1">
        Höhe
        <input
          aria-label="Bildhöhe in Zentimetern"
          className="w-16 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-1 py-0.5"
          defaultValue={formatSizeCm(heightPx)}
          key={`h-${heightPx}`}
          onKeyDown={(e) => e.key === 'Enter' && commitHeight((e.target as HTMLInputElement).value)}
          onBlur={(e) => commitHeight(e.target.value)}
        />
        cm
      </label>
      <label className="flex items-center gap-1">
        <input type="checkbox" checked={lockAspect} onChange={(e) => setLockAspect(e.target.checked)} />
        Seitenverhältnis beibehalten
      </label>
      <button
        type="button"
        disabled={!canResetImageSize(view.state)}
        onClick={() => run(view, resetImageToNaturalSize())}
        className="px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 disabled:opacity-40"
      >
        Auf Originalgröße zurücksetzen
      </button>
    </div>
  )
}
```

Wichtige Detailentscheidungen:

- **`key={`w-${widthPx}`}`** auf den unkontrollierten (`defaultValue`) Inputs: Nach
  jedem Commit (Eingabefeld **oder** Ziehpunkt-Ende) erzwingt der geänderte `key`
  ein Neu-Mounten mit dem tatsächlichen, ggf. geclampten/gerundeten Modellwert als
  neuem `defaultValue` — das ist exakt die von offener Frage 4 (Abschnitt 3.3)
  geforderte „keine stille Rundungsabweichung ohne sichtbare Korrektur im Feld".
- **`run`** wird aus `Toolbar.tsx` exportiert (dort bereits vorhanden, nur privat)
  und hier importiert — kein zweites, abweichendes Ausführungsmuster für
  Toolbar-Commands im selben Editor.
- **`lockAspect`** ist reiner, nicht persistenter UI-Zustand (State der
  Panel-Komponente selbst) — bleibt über mehrere Bildauswahlen innerhalb einer
  Sitzung erhalten (die Komponente wird nicht bei jedem Selektionswechsel neu
  gemountet, nur ihr Rückgabewert wechselt zwischen Panel und `null`), setzt sich
  aber bei Neuladen der Seite auf den Default (`true`) zurück — bewusst einfache
  Lösung, kein Bestandteil des Dokumentmodells.
- Divisions gegen `0` (Bild mit `width: 0`, sollte durch Clamping praktisch nie
  vorkommen) sind über den `? … : 1`-Fallback in `ratio` abgesichert.

### 3.9 `WordEditor.tsx` — Verdrahtung

```ts
// Neue Imports:
import { createImageResizePlugin } from './imageResizePlugin'
import { ImageNodeView } from './ImageNodeView'
import { ImagePropertiesPanel } from './ImagePropertiesPanel'

// plugins-Array (Zeile 69-86) ergänzen um: createImageResizePlugin(),

// EditorView-Konstruktion (Zeile 89-99) ergänzt um:
const view = new EditorView(containerRef.current, {
  state,
  nodeViews: {
    image: (node, editorView, getPos) => new ImageNodeView(node, editorView, getPos),
  },
  dispatchTransaction(tr) { /* unverändert */ },
})

// JSX (Zeile 116-133):
{viewRef.current && <Toolbar view={viewRef.current} />}
{viewRef.current && <ImagePropertiesPanel view={viewRef.current} />}
```

Kein weiterer Eingriff in `reconcileSelectionOnClick` nötig — die Funktion prüft
`view.state.selection.empty`; eine `NodeSelection` auf einem Bild ist nie "empty",
verhält sich also für diese Prüfung identisch zu jeder anderen nicht-leeren
Selektion (siehe Testfall in Abschnitt 6.2 für Anforderung 2.8).

### 3.10 `docx/reader.ts` — `wp:extent` lesen

`decodeParagraphRuns` (Zeile 124-143), Bild-Zweig (Zeile 134-139):

```ts
} else if (child.namespaceURI === OOXML_NAMESPACES.w && child.localName === 'drawing') {
  const blip = child.getElementsByTagNameNS(OOXML_NAMESPACES.a, 'blip')[0]
  const relId = blip?.getAttributeNS(OOXML_NAMESPACES.r, 'embed') ?? undefined
  const docPr = child.getElementsByTagNameNS(OOXML_NAMESPACES.wp, 'docPr')[0]
  const extent = child.getElementsByTagNameNS(OOXML_NAMESPACES.wp, 'extent')[0]
  const cx = extent ? Number(extent.getAttribute('cx')) : NaN
  const cy = extent ? Number(extent.getAttribute('cy')) : NaN
  runs.push({
    kind: 'image',
    imageRelId: relId,
    imageAlt: docPr?.getAttribute('name') ?? '',
    imageWidthPx: Number.isFinite(cx) && cx > 0 ? emuToPx(cx) : undefined,
    imageHeightPx: Number.isFinite(cy) && cy > 0 ? emuToPx(cy) : undefined,
  })
}
```

`RunLike`-Interface (Zeile 116-122) um `imageWidthPx?: number; imageHeightPx?: number`
ergänzen. `paragraphToBlocks` (Zeile 172-177), Bild-Block-Erzeugung:

```ts
if (run.kind === 'image') {
  flush()
  const target = run.imageRelId ? imageRels.get(run.imageRelId) : undefined
  const attrs: Record<string, unknown> = { src: target ?? '', alt: run.imageAlt ?? '' }
  if (run.imageWidthPx != null && run.imageHeightPx != null) {
    // Anforderung 2.5 letzter Satz: die aus der Datei gelesene Größe gilt für DIESE
    // Sitzung als "Originalgröße" — auch wenn sie nicht persistiert wird (offene
    // Frage 3, Abschnitt 3.3).
    attrs.width = run.imageWidthPx
    attrs.height = run.imageHeightPx
    attrs.naturalWidth = run.imageWidthPx
    attrs.naturalHeight = run.imageHeightPx
  }
  blocks.push({ type: 'image', attrs })
}
```

Fehlt `<wp:extent>` (nicht standardkonforme Fremddatei), bleiben `width`/`height`
`undefined` → Schema-Default `null` greift, **kein Absturz**, exakt wie von
Anforderung Abschnitt 3, Punkt 3 gefordert. Import von `emuToPx` aus
`../shared/imageSize`.

### 3.11 `odt/reader.ts` — `svg:width`/`svg:height` lesen

`paragraphToBlocks` (Zeile 144-150):

```ts
if (child.nodeType === child.ELEMENT_NODE && (child as Element).localName === 'frame' && (child as Element).namespaceURI === ODF_NAMESPACES.draw) {
  flushText()
  const frameEl = child as Element
  const imageEl = firstChildNS(frameEl, ODF_NAMESPACES.draw, 'image')
  const href = imageEl?.getAttributeNS(ODF_NAMESPACES.xlink, 'href') ?? ''
  const widthPx = parseOdtLengthToPx(frameEl.getAttributeNS(ODF_NAMESPACES.svg, 'width'))
  const heightPx = parseOdtLengthToPx(frameEl.getAttributeNS(ODF_NAMESPACES.svg, 'height'))
  const attrs: Record<string, unknown> = { src: href, alt: frameEl.getAttributeNS(ODF_NAMESPACES.draw, 'name') ?? '' }
  if (widthPx != null && heightPx != null) {
    attrs.width = widthPx
    attrs.height = heightPx
    attrs.naturalWidth = widthPx // Anforderung 2.5, siehe Begründung in Abschnitt 3.10
    attrs.naturalHeight = heightPx
  }
  blocks.push({ type: 'image', attrs })
}
```

`parseOdtLengthToPx` (Abschnitt 3.1) deckt `cm`/`mm`/`in`/`px`/`pt` ab (Anforderung
Abschnitt 3, Punkt 5 verlangt mindestens diese vier, `pt` zusätzlich ergänzt, da
ODF es zulässt und die Umrechnung trivial ist). Real geprüft: die
`svg:width`/`svg:height`-Attribute liegen im ODF-Namensraum `svg` (verifiziert per
`getAttributeNS(ODF_NAMESPACES.svg, …)`, exakt das bereits für `xlink:href`
etablierte Muster in derselben Datei, Zeile 148 im Ist-Code).

### 3.12 `odt/writer.ts` — px→cm (Auflösung offener Frage 2)

`blockToOdt`, Fall `'image'` (Zeile 112-119):

```ts
case 'image': {
  const src = String(node.attrs?.src ?? '')
  const fileName = images.add(src)
  const width = node.attrs?.width != null ? `${formatCmForOdt(Number(node.attrs.width))}cm` : '6cm'
  const height = node.attrs?.height != null ? `${formatCmForOdt(Number(node.attrs.height))}cm` : '4cm'
  const alt = escapeXml(String(node.attrs?.alt ?? ''))
  return `<text:p><draw:frame draw:name="${alt || 'Image'}" svg:width="${width}" svg:height="${height}" text:anchor-type="as-char"><draw:image xlink:href="${fileName}" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/></draw:frame></text:p>`
}
```

Neue kleine Hilfsfunktion `formatCmForOdt(px: number): string` (in `odt/writer.ts`
oder direkt `pxToCm(px).toFixed(2)` aus `shared/imageSize.ts` importiert) — **mit
Punkt**, nicht Komma, da XML/ODF-Attributwerte stets den POSIX-Locale-Dezimalpunkt
verwenden (im Unterschied zur UI-Anzeige in `ImagePropertiesPanel`, die deutsches
Komma zeigt). Fallback `6cm`/`4cm` bleibt unverändert (Anforderung 3, Punkt 6: nur
für Nodes ohne gesetztes `width`/`height`, wie bisher).

### 3.13 `docx/writer.ts` — bewusst unverändert

`imageParagraphXml` (Zeile 72-92) bleibt **strukturell unverändert**. Die
Fallback-Zeilen `Number(node.attrs?.width ?? 300)`/`?? 200` sind bereits
bedingt korrekt (Abschnitt 2, Fund 3). Einzige optionale Härtung (nicht
blockierend): `Math.max(1, …)` um den fertigen `widthPx`/`heightPx`-Wert legen,
falls je ein Node mit `width: 0` ins Dokument gelangt — kein bekannter Codepfad
erzeugt das aktuell, aber billige Verteidigungslinie.

---

## 4. Dateigenauer Änderungsplan (Zusammenfassung)

| Datei | Art | Inhalt |
|---|---|---|
| `src/formats/shared/imageSize.ts` | **neu** | Abschnitt 3.1 |
| `src/formats/shared/editor/imageResizePlugin.ts` | **neu** | Abschnitt 3.6 |
| `src/formats/shared/editor/ImageNodeView.ts` | **neu** | Abschnitt 3.7 |
| `src/formats/shared/editor/ImagePropertiesPanel.tsx` | **neu** | Abschnitt 3.8 |
| `src/formats/shared/schema.ts` | geändert | `naturalWidth`/`naturalHeight`, Inline-Style-`toDOM`, `data-natural-*`-`parseDOM` (Abschnitt 3.2) |
| `src/formats/shared/editor/commands.ts` | geändert | `insertImage`-Signatur, neu: `setImageSize`, `resetImageToNaturalSize`, `canResetImageSize`, `getSelectedImage` (Abschnitt 3.4) |
| `src/formats/shared/editor/Toolbar.tsx` | geändert | `handleImagePick` (Naturalgröße/Zellbreite/Fehlerstate, Abschnitt 3.5), `run` exportieren |
| `src/formats/shared/editor/WordEditor.tsx` | geändert | `nodeViews`, `createImageResizePlugin()`, `<ImagePropertiesPanel>` (Abschnitt 3.9) |
| `src/index.css` | geändert | NodeView-/Handle-CSS (Abschnitt 5) |
| `src/formats/docx/reader.ts` | geändert | `wp:extent` lesen (Abschnitt 3.10) |
| `src/formats/odt/reader.ts` | geändert | `svg:width`/`svg:height` lesen (Abschnitt 3.11) |
| `src/formats/odt/writer.ts` | geändert | px→cm (Abschnitt 3.12) |
| `src/formats/docx/writer.ts` | **unverändert** (optional: defensives `Math.max(1,…)`) | Abschnitt 3.13 |
| `src/formats/docx/imageCollector.ts`, `src/formats/odt/imageCollector.ts` | **unverändert** | bereits korrekt (Abschnitt 2, Fund 4) |
| `src/formats/docx/__tests__/roundtrip.test.ts` | erweitert | Abschnitt 6.1 |
| `src/formats/odt/__tests__/roundtrip.test.ts` | erweitert | Abschnitt 6.1 |
| `src/formats/shared/__tests__/imageSize.test.ts` | **neu** | Abschnitt 6.1 |
| `src/formats/docx/__tests__/imageSize.test.ts` | **neu** | Abschnitt 6.1 |
| `src/formats/odt/__tests__/imageSize.test.ts` | **neu** | Abschnitt 6.1 |
| `tests/e2e/image-resize.spec.ts` | **neu** | Abschnitt 6.2 |
| `tests/e2e/selection-regression.spec.ts` | erweitert | Abschnitt 6.2 |

---

## 5. Neues CSS (`src/index.css`)

```css
.ProseMirror img {
  max-width: 100%;
  /* height: auto bleibt NUR als Sicherheitsnetz für Bilder ohne width/height
     (z. B. Fremddatei ohne wp:extent, siehe docx/reader.ts). Sobald width/height
     gesetzt sind, gewinnt das in schema.ts:toDOM erzeugte Inline-Style ohnehin
     gegen diese Klassenregel (Abschnitt 3.2/3.3, offene Frage 4) — die Regel hier
     bleibt unverändert bestehen. */
  height: auto;
}

.image-node-view {
  position: relative;
  display: inline-block;
  max-width: 100%;
}
.image-node-view img {
  display: block;
  max-width: 100%;
}
.image-node-view--selected img {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}
.image-resize-handle {
  position: absolute;
  width: 10px;
  height: 10px;
  background: #2563eb;
  border: 1px solid white;
  border-radius: 2px;
  display: none;
  touch-action: none; /* verhindert Scroll-Gesten, die mit dem Ziehen konkurrieren */
}
.image-node-view--selected .image-resize-handle {
  display: block;
}
.image-resize-handle-nw { top: -5px; left: -5px; cursor: nwse-resize; }
.image-resize-handle-n  { top: -5px; left: calc(50% - 5px); cursor: ns-resize; }
.image-resize-handle-ne { top: -5px; right: -5px; cursor: nesw-resize; }
.image-resize-handle-e  { top: calc(50% - 5px); right: -5px; cursor: ew-resize; }
.image-resize-handle-se { bottom: -5px; right: -5px; cursor: nwse-resize; }
.image-resize-handle-s  { bottom: -5px; left: calc(50% - 5px); cursor: ns-resize; }
.image-resize-handle-sw { bottom: -5px; left: -5px; cursor: nesw-resize; }
.image-resize-handle-w  { top: calc(50% - 5px); left: -5px; cursor: ew-resize; }
```

`touch-action: none` auf den Handles ist notwendig, damit ein Touch-Drag auf einem
Handle nicht zusätzlich als Seiten-Scroll interpretiert wird (Anforderung Punkt 4:
„analog zu Word/LibreOffice/Google Docs", die dieses Verhalten ebenfalls zeigen).

---

## 6. Neue/erweiterte Testdateien

### 6.1 Unit-Tests (Vitest)

**Neu: `src/formats/shared/__tests__/imageSize.test.ts`** — reine Utility-Tests:

```ts
describe('clampImageWidthPx / clampImageHeightPx', () => {
  it('clamps 0 and negative to the minimum (Grenzfall 4.2)', () => {
    expect(clampImageWidthPx(0)).toBe(1)
    expect(clampImageWidthPx(-5)).toBe(1)
  })
  it('clamps extreme values (50000px) to the maximum (Grenzfall 4.2)', () => {
    expect(clampImageWidthPx(50000)).toBeLessThanOrEqual(IMAGE_SIZE_MAX_WIDTH_PX)
  })
})

describe('parseSizeInputCm', () => {
  it('accepts German comma decimal', () => expect(parseSizeInputCm('12,5')).toBe(12.5))
  it('rejects non-numeric/empty/zero/negative input without throwing (Grenzfall 4.1)', () => {
    expect(parseSizeInputCm('abc')).toBeNull()
    expect(parseSizeInputCm('')).toBeNull()
    expect(parseSizeInputCm('0')).toBeNull()
    expect(parseSizeInputCm('-5')).toBeNull()
  })
})

describe('parseOdtLengthToPx', () => {
  it.each([['12cm', Math.round(12 * PX_PER_CM)], ['120mm', Math.round(120 * (PX_PER_CM / 10))], ['5in', 480], ['300px', 300]])(
    'parses %s',
    (raw, expectedPx) => expect(parseOdtLengthToPx(raw)).toBe(expectedPx),
  )
  it('returns null for missing/malformed values without throwing', () => {
    expect(parseOdtLengthToPx(null)).toBeNull()
    expect(parseOdtLengthToPx('abc')).toBeNull()
  })
})

describe('computeInsertSize', () => {
  it('does not upscale a small icon (Grenzfall 4.14)', () => {
    expect(computeInsertSize(16, 16, 606)).toEqual({ width: 16, height: 16 })
  })
  it('downscales an oversized image, preserving aspect ratio', () => {
    const { width, height } = computeInsertSize(4000, 3000, 606)
    expect(width).toBe(606)
    expect(height).toBe(Math.round(3000 * (606 / 4000)))
  })
})
```

**Neu: `src/formats/docx/__tests__/imageSize.test.ts`** — Reader-Grenzfälle
(Muster: kleines DOCX-XML per `buildDocxWithDrawing`-Helfer analog zu bestehenden
Reader-Testhelfern):

```ts
describe('DOCX reader: wp:extent Grenzfälle', () => {
  it('reads cx/cy and converts EMU to px (Regressionstest für Abschnitt 6.3 der Anforderung)', async () => {
    // wp:extent cx="4762500" cy="2857500" (500x300 px bei 96dpi) → attrs.width===500, attrs.height===300
  })
  it('leaves width/height null when wp:extent is missing (kein Absturz, Anforderung 3.3)', async () => { /* ... */ })
  it('sets naturalWidth/naturalHeight equal to width/height on import (Anforderung 2.5)', async () => { /* ... */ })
})
```

**Neu: `src/formats/odt/__tests__/imageSize.test.ts`** — analog, plus reale Fixture
(`Seasonal_Fruits2_en.odt`, siehe Abschnitt 7):

```ts
describe('ODT reader: svg:width/height Grenzfälle', () => {
  it('parses a cm value (12cm × 8cm)', async () => { /* ... */ })
  it('parses mm/in units', async () => { /* ... */ })
  it('leaves width/height null when svg:width/height are missing', async () => { /* ... */ })
  it('reads five distinct image sizes from Seasonal_Fruits2_en.odt without collapsing to one default (Grenzfall 4.13)', async () => {
    // erwartet 5 image-Nodes mit 5 paarweise unterschiedlichen width/height-Werten
  })
})
```

**Erweiterung: `src/formats/docx/__tests__/roundtrip.test.ts`** (Zeile 251-276) —
der bestehende „False Confidence"-Test bekommt echte Assertions:

```ts
it('preserves an embedded image as a self-contained data URL', async () => {
  const original = doc([{ type: 'image', attrs: { src: TINY_PNG, alt: 'Testbild', width: 100, height: 80 } }])
  const result = await roundTrip(original)
  const image = (result.body as any).content[0]
  expect(image.type).toBe('image')
  expect(image.attrs.src).toMatch(/^data:image\/png;base64,/)
  expect(image.attrs.src.split(',')[1]).toBe(TINY_PNG.split(',')[1])
  expect(image.attrs.width).toBe(100) // NEU — Testfall 12 der Anforderung
  expect(image.attrs.height).toBe(80) // NEU
})

it('does not collapse a non-3:2 image to the 300×200 default on pure round trip (Regressionstest Abschnitt 6.3)', async () => {
  const original = doc([{ type: 'image', attrs: { src: TINY_PNG, alt: '', width: 500, height: 300 } }])
  const result = await roundTrip(original)
  const image = (result.body as any).content[0]
  expect(image.attrs.width).toBe(500)
  expect(image.attrs.height).toBe(300)
})

it('preserves two images with identical src but different sizes independently (Grenzfall 4.8)', async () => {
  const original = doc([
    { type: 'image', attrs: { src: TINY_PNG, alt: 'A', width: 100, height: 80 } },
    { type: 'image', attrs: { src: TINY_PNG, alt: 'B', width: 300, height: 240 } },
  ])
  const result = await roundTrip(original)
  const [a, b] = (result.body as any).content
  expect([a.attrs.width, a.attrs.height]).toEqual([100, 80])
  expect([b.attrs.width, b.attrs.height]).toEqual([300, 240])
})
```

**Erweiterung: `src/formats/odt/__tests__/roundtrip.test.ts`** (Zeile 212-244) —
analog, zusätzlich ein Test für die cm-Rundung (offene Frage 2):

```ts
it('preserves width/height across the cm round trip within sub-pixel tolerance (Testfall 13, offene Frage 2)', async () => {
  const original = doc([{ type: 'image', attrs: { src: TINY_PNG, alt: '', width: 400, height: 300 } }])
  const result = await roundTrip(original)
  const image = (result.body as any).content[0]
  expect(Math.abs(image.attrs.width - 400)).toBeLessThanOrEqual(1)
  expect(Math.abs(image.attrs.height - 300)).toBeLessThanOrEqual(1)
})
```

### 6.2 E2E-Tests (Playwright)

**Neu: `tests/e2e/image-resize.spec.ts`** — Kernstück, Struktur analog zu
`docx.spec.ts`/`odt.spec.ts`/`selection-regression.spec.ts`:

```ts
test.describe('Bildgröße — Panel & Ziehpunkte', () => {
  test('Testfall 1: Panel erscheint erst nach Klick auf ein Bild, verschwindet bei Klick daneben', async ({ page }) => { /* ... */ })
  test('Testfall 2/3: Breite ändern mit/ohne Lock ändert Höhe proportional/unverändert', async ({ page }) => { /* ... */ })
  test('Testfall 4: Eckgriff ändert Breite+Höhe proportional, unabhängig von der Lock-Checkbox', async ({ page }) => { /* ... */ })
  test('Testfall 5: Seitengriff ändert nur eine Dimension', async ({ page }) => { /* ... */ })
  test('Testfall 6: ungültige/extreme Eingaben werden verworfen/geclampt (4.1/4.2)', async ({ page }) => { /* "abc", "0", "50000" */ })
  test('Testfall 7: Undo/Redo macht eine Eingabefeld-Größenänderung als einen Schritt rückgängig', async ({ page }) => { /* ... */ })
  test('Testfall 8: eine ganze Ziehgeste mit mehreren mousemove-Events ist ein Undo-Schritt (Grenzfall 4.7)', async ({ page }) => {
    // page.mouse.move mehrfach zwischen down/up, dann genau ein Strg+Z
  })
  test('Testfall 9: "Auf Originalgröße zurücksetzen" stellt die Einfüge-/Importgröße exakt wieder her', async ({ page }) => { /* ... */ })
  test('Testfall 10: Reset-Button ist deaktiviert, solange keine Änderung vorgenommen wurde (Grenzfall 4.4)', async ({ page }) => { /* ... */ })
  test('Grenzfall 4.3: Eckgriff über den gegenüberliegenden Rand hinausziehen kollabiert nicht auf 0/negativ', async ({ page }) => { /* ... */ })
  test('Grenzfall 4.6: Bild in einer Tabellenzelle verhält sich identisch, Einfüge-Standardgröße orientiert sich an der Zellbreite', async ({ page }) => { /* ... */ })
  test('Grenzfall 4.14: sehr kleines Icon (16×16) wird beim Einfügen nicht hochskaliert', async ({ page }) => { /* ... */ })
  test('Grenzfall 4.15: defekte Bilddatei zeigt sichtbare Fehlermeldung statt Absturz/stillem Fehlschlag', async ({ page }) => { /* ... */ })
})

test.describe('Bildgröße — Rundreisen (Anforderung Abschnitt 5)', () => {
  test('DOCX 5.1.1: unverändertes Hochladen/Exportieren/Reimportieren erhält 500×300 px exakt (nicht 300×200)', async ({ page }) => { /* ... */ })
  test('DOCX 5.1.2/5.1.3: Eingabefeld-Größe (640×480) exportiert exakt als wp:extent, reimportiert identisch', async ({ page }) => { /* unabhängiger XML-Parse-Check auf die heruntergeladene Datei */ })
  test('DOCX 5.1.4: über Ziehpunkte gesetzte Größe (nicht Eingabefeld) exportiert/reimportiert exakt', async ({ page }) => { /* ... */ })
  test('DOCX 5.1.5: VariousPictures.docx — 5 unterschiedlich große Bilder bleiben nach Rundreise individuell erhalten (Testfall 8/13/17, Abschnitt 7)', async ({ page }) => { /* ... */ })
  test('ODT 5.2.1-5.2.4: analog, svg:width/height in cm', async ({ page }) => { /* ... */ })
  test('ODT 5.2.5: Seasonal_Fruits2_en.odt — 5 unterschiedlich große Bilder bleiben individuell erhalten', async ({ page }) => { /* ... */ })
  test('Cross-Format 5.3.1/5.3.2: DOCX→ODT→DOCX und ODT→DOCX→ODT ohne kumulativen Drift (Grenzfall 4.11)', async ({ page }) => { /* ... */ })
  test('Cross-Format 5.3.3: über Seitengriff bewusst verzerrte Größe bleibt über Doppel-Rundreise erhalten', async ({ page }) => { /* ... */ })
})
```

**Erweiterung: `tests/e2e/selection-regression.spec.ts`** — Testfall 14 der
Anforderung (Zusammenspiel mit dem Selection-Sync-Bug, Anforderung 2.8), neuer Test
im bestehenden `describe`-Block, nach demselben Muster wie der vorhandene
„Fett"-Regressionstest:

```ts
test('image NodeSelection survives a resize drag, then click-to-reposition + typing loses nothing (2.8)', async ({ page }) => {
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Vorher. ')
  // Bild einfügen (filechooser-Flow, siehe docx.spec.ts-Vorbild)
  // Bild anklicken → Panel erscheint → Eckgriff ziehen (page.mouse.down/move/up)
  // danach in normalen Text klicken, Enter, weitertippen
  await expect(editor).toContainText('Vorher.')
  // ... weiterer getippter Text ebenfalls vorhanden, kein Inhaltsverlust
})
```

---

## 7. Fixture-Inventar — reale Mehrbild-Testkandidaten (Anforderung Grenzfall 4.13/5.1.5/5.2.5)

Ermittelt durch Entpacken und Auslesen von `wp:extent`/`svg:width`+`svg:height` aus
tatsächlichen Dateien in `tests/fixtures/external/{docx,odt}`, nicht durch Vermutung:

**DOCX — `tests/fixtures/external/docx/VariousPictures.docx`:** enthält 5
`<wp:extent>`-Werte, alle unterschiedlich (EMU → px bei 96 dpi, `emuToPx`):

| `cx`/`cy` (EMU) | ≈ px (Breite×Höhe) |
|---|---|
| `1723644`/`1848917` | ≈ 181×194 |
| `1238250`/`876300` | **130×92** (exakt, keine Rundung) |
| `2440969`/`1705680` | ≈ 256×179 |
| `2148750`/`1305000` | ≈ 226×137 |
| `1828800`/`1676400` | **192×176** (exakt, keine Rundung) |

**Primärkandidat** für Testfall 12 (Regressionstest gegen den 300×200-Default,
Abschnitt 6.1): Bild 2 (130×92 px) — bewusst **weit** von 300×200 entfernt und
**bewusst nicht** 3:2, damit ein stiller Rückfall auf den Default sofort auffiele.
Für Anforderung 5.1.5/Grenzfall 4.13 („mehrere unterschiedlich große Bilder,
keines vereinheitlicht") eignet sich die Datei als Ganzes (alle 5 Bilder).

**ODT — `tests/fixtures/external/odt/Seasonal_Fruits2_en.odt`:** enthält 5
`<draw:frame><draw:image>`-Paare (verifiziert: 5×`draw:frame`, 5×`draw:image`,
5 unterschiedliche `Pictures/*`-Dateien im Manifest), `svg:width`/`svg:height` in
`cm`:

| `svg:width`/`svg:height` | ≈ px (`cmToPx`) |
|---|---|
| `5.078cm`/`1.078cm` | ≈ 192×41 |
| `8.177cm`/`5.457cm` | ≈ 309×206 |
| `15.155cm`/`4.576cm` | ≈ 573×173 |
| `5.45cm`/`3.995cm` | ≈ 206×151 |
| `4.366cm`/`4.551cm` | ≈ 165×172 |

**Primärkandidat** für Anforderung 5.2.5/Grenzfall 4.13 auf ODT-Seite — fünf real
unterschiedliche Seitenverhältnisse in einem echten LibreOffice-Export, kein
synthetisches Konstrukt.

**Alternative/ergänzende Kandidaten**, beim Audit ebenfalls gefunden, nicht
zwingend für den Erstaufbau nötig: `WithGIF.docx` (ein Bild, `1677725×1677725`
EMU, quadratisch — nützlich für einen einfachen Seitenverhältnis-Test), diverse
weitere ODT-Fixtures mit `draw:frame`, die aber teils reine Vektor-/Linien-Grafiken
(`gfx_linestyle*`/`gfx_pattern*` in `excelfileformat.odt`) statt echter
`draw:image`-Rasterbilder sind — **beim Implementieren verifizieren**, dass ein
gewähltes Fixture tatsächlich `<draw:image xlink:href="Pictures/…">` enthält, nicht
nur einen leeren/gestylten `<draw:frame>`.

---

## 8. Abnahme-Mapping (Anforderung Abschnitt 7/8 → Testdatei)

| Anforderung | Abgedeckt durch |
|---|---|
| Testfälle 1-10 (Abschnitt 7) | `tests/e2e/image-resize.spec.ts`, describe „Panel & Ziehpunkte" |
| Testfall 11 (DOCX-Rundreise, unabhängiger Parser) | `tests/e2e/image-resize.spec.ts`, describe „Rundreisen"; XML-Parse-Check auf heruntergeladene Datei |
| Testfall 12/13 (Reader-Bug-Regression) | `docx/__tests__/roundtrip.test.ts`, `odt/__tests__/roundtrip.test.ts` (neue Assertions), `docx/__tests__/imageSize.test.ts`, `odt/__tests__/imageSize.test.ts` |
| Testfall 14 (Selection-Sync-Zusammenspiel) | `tests/e2e/selection-regression.spec.ts`, neuer Test |
| Testfall 15 (ODT-Rundreise vollständig) | `tests/e2e/image-resize.spec.ts`, describe „Rundreisen" |
| Testfall 16 (Cross-Format-Rundreise) | `tests/e2e/image-resize.spec.ts`, „Cross-Format"-Tests |
| Testfall 17 (reale Mehrbild-Fremddatei) | `VariousPictures.docx`/`Seasonal_Fruits2_en.odt`-Tests (Abschnitt 6.1/6.2/7) |
| Testfall 18 (Bild in Tabellenzelle) | `image-resize.spec.ts`, Grenzfall-4.6-Test |
| Testfall 19 (identisches `src`, unterschiedliche Größe) | `docx/__tests__/roundtrip.test.ts`, neuer Test (Abschnitt 6.1) |
| Testfall 20 (kleines Icon, kein Hochskalieren) | `imageSize.test.ts` (Unit) + `image-resize.spec.ts` (E2E) |
| Grenzfall 4.1 (ungültige Eingabe) | `shared/__tests__/imageSize.test.ts`, `image-resize.spec.ts` Testfall 6 |
| Grenzfall 4.2/4.3 (Extremwerte, Rand-Überziehen) | `imageSize.test.ts` (Clamp-Funktionen), `image-resize.spec.ts` dedizierter Test |
| Grenzfall 4.4 (Reset ohne bekannte Originalgröße) | `commands.ts` `canResetImageSize` (Abschnitt 3.4), `image-resize.spec.ts` Testfall 10 |
| Grenzfall 4.5 (Mehrfachselektion) | Dokumentiert: ProseMirror erlaubt aktuell nur Einzel-`NodeSelection`, kein Zusatzcode nötig — per E2E kurz verifiziert (kein dedizierter Testfall in Abschnitt 7 gefordert) |
| Grenzfall 4.6 (Tabellenzelle) | `Toolbar.tsx` `getAvailableContentWidthPx` (Abschnitt 3.5), `image-resize.spec.ts` |
| Grenzfall 4.7 (kein Undo pro Mausbewegung) | `imageResizePlugin`/`ImageNodeView` (Abschnitt 3.6/3.7), `image-resize.spec.ts` Testfall 8 |
| Grenzfall 4.8 (identisches `src`) | `docx/__tests__/roundtrip.test.ts`, neuer Test |
| Grenzfall 4.9 (CSS-Deckelung vs. Modellwert) | Schema-Inline-Style-Fix (Abschnitt 3.2), offene Frage 4 (Abschnitt 3.3) |
| Grenzfall 4.10 (ODT-Einheiten-Interop) | Offene Frage 2 (Abschnitt 3.3), `odt/writer.ts`-Änderung (Abschnitt 3.12) |
| Grenzfall 4.11 (kumulativer Rundungsdrift) | `odt/__tests__/roundtrip.test.ts` (Sub-Pixel-Toleranz-Test), Cross-Format-E2E-Tests |
| Grenzfall 4.12 (Selection-Sync + Resize) | `tests/e2e/selection-regression.spec.ts`, neuer Test |
| Grenzfall 4.13 (reale Mehrbild-Fremddatei) | Abschnitt 7 (Fixture-Inventar) |
| Grenzfall 4.14 (kleines Icon) | `computeInsertSize`-Unit-Test + E2E |
| Grenzfall 4.15 (defekte Bilddatei) | `Toolbar.tsx` `try/catch` um `probe.decode()` (Abschnitt 3.5), `image-resize.spec.ts` |
| Abschnitt 5 (vollständige Rundreise-Matrix) | `image-resize.spec.ts` „Rundreisen" + beide `roundtrip.test.ts` |
| Abschnitt 6.4 (vier offene Fragen) | Abschnitt 3.3 dieses Plans (alle vier beantwortet) |
| DoD Punkt 7 (irreführende Tests korrigiert) | Abschnitt 6.1, Erweiterung beider `roundtrip.test.ts` |
| DoD Punkt 8 (kein Fund ohne Vermerk) | Abschnitt 2 (Audit-Zusatzfunde 1-4) + Abschnitt 3.13 (bewusst unverändert) |

---

## 9. Offene Abhängigkeiten / bewusste Vereinfachungen (nur dokumentieren, kein Code jetzt)

- **`bild-einfuegen` (separater Slug):** MIME-Typ-/Signaturprüfung vor dem Einfügen
  sowie `title`/`aria-label` am „🖼 Bild"-Kontrolleintrag sind **nicht** Teil dieses
  Plans (siehe Abgrenzung in `bild-einfuegen-req.md`). `probe.decode()`
  (Abschnitt 3.5) liefert als Nebeneffekt eine grobe Formatprüfung, ersetzt aber
  keine echte Signaturprüfung.
- **`bild-alt-text` (separater Slug):** Ein Bild-Eigenschaften-Panel wäre der
  naheliegende Ort für ein Alt-Text-Feld — laut Anforderung Abschnitt 0
  („Explizit außerhalb des Geltungsbereichs") bewusst **nicht** in
  `ImagePropertiesPanel` mit aufgenommen, aber die Komponente ist so geschnitten,
  dass ein Alt-Text-Feld später ergänzt werden kann, ohne die Größen-Logik
  anzufassen.
- **Floating-Panel statt zweiter Toolbar-Leiste:** `ImagePropertiesPanel` ist in
  diesem Plan eine zweite, immer an gleicher Stelle sitzende Leiste unter der
  Haupt-Toolbar (Abschnitt 3.8) — nicht ein am Bild andockendes Overlay wie in
  Word/Google Docs. Das erfüllt die Anforderung („Panel erscheint kontextabhängig
  bei Bildauswahl"), ist aber UX-seitig einfacher als ein positionsgebundenes
  Overlay. Als Folge-Iteration denkbar, kein Blocker für die Abnahme dieser
  Anforderung.
- **`textumbruch-bild`/`bild-position` (separate Slugs):** Bleiben unberührt —
  `image` bleibt `group: 'block'`, keine Änderung an `draggable`/Umfließen in
  diesem Plan.
- **Konsolidierung `PX_PER_CM`/EMU-Konstanten:** `pageLayout.ts` verwendet
  `PX_PER_MM = 96/25.4`, `docx/writer.ts` bisher eine inline `914400`/`96`-Rechnung.
  Mit `shared/imageSize.ts` gibt es jetzt eine einzige Quelle für alle
  Größen-Umrechnungen — `docx/writer.ts` könnte optional auf `pxToEmu` aus
  `shared/imageSize.ts` umgestellt werden (aktuell inline dupliziert, Zeile 79-80),
  ist aber nicht Teil dieses Plans, da funktional identisch (reine
  Aufräum-Empfehlung, kein Blocker).
