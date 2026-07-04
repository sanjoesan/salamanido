# Schriftgröße wählen — dateigenauer Umsetzungsplan

Gegenstück zu `specs/schriftgroesse-waehlen-req.md`. Dieses Dokument beschreibt, nach
tatsächlicher Codelektüre (nicht nur Backlog-/Anforderungsangabe), was am bestehenden
Code zu ändern ist, welche Dateien neu angelegt werden, und wie die in der Anforderung
geforderte Verifikation technisch umgesetzt wird.

## 0. TL;DR

Der Befund aus Abschnitt 7 der Anforderung ist **korrekt und wurde durch erneute
Codelektüre bestätigt**: Es existiert kein `fontSize`-Mark, kein Toolbar-Element, kein
Reader-/Writer-Code für Lauf-Schriftgrößen. Anders als bei `unterstrichen-einfach`
(siehe `specs/unterstrichen-einfach-code.md`) ist das hier ein **echter Neubau**, kein
Härtungs-/Test-Nachtrag. Der Plan unten:

1. führt eine neue, von beiden Formaten und dem Schema gemeinsam genutzte Utility-Datei
   `src/formats/shared/fontSize.ts` ein (Presets, Rundung, Clamping, Freitext-Parsing) —
   damit Schema, Toolbar, DOCX- und ODT-Reader **dieselbe** Rundungs-/Clamping-Logik
   verwenden statt sie viermal separat zu duplizieren;
2. deckt beim Audit einen **wichtigen, in der Anforderung nicht explizit benannten
   Konflikt** auf: „Rundung auf 0,5-pt-Schritte" (Anforderung 2.5) muss **immer**
   gelten (auch beim reinen Datei-Import), „Clamping auf 1–400 pt" (Anforderung 4.2/4.3)
   dagegen **nur** für vom Bedienelement/Paste neu gesetzte Werte — sonst würde der
   Reader eine reale, mit >400 pt formatierte Fremddatei beim reinen Reimport
   unzulässig verstümmeln und Abschnitt 5 („Rundreise verlustfrei") verletzen. Siehe
   Abschnitt 3.2;
3. findet einen **weiteren, aus einem früheren Plan bekannten, aber nie behobenen
   Fehler**: `odt/styleRegistry.ts`, `TextStyleRegistry.styleNameFor()` dedupliziert
   über `JSON.stringify(props)` mit objekt-insertionsreihenfolge-abhängigem Key — exakt
   das in `specs/unterstrichen-einfach-code.md` Abschnitt 3.3 vorgeschlagene, aber
   **nicht umgesetzte** Fix. Mit einem 7. Feld (`fontSize`) wächst das Kollisionsrisiko
   deutlich; die Anforderung selbst verlangt in Abschnitt 3, Punkt 6 explizit
   Kollisionsfreiheit — der Fix wird deshalb **in diesem** Plan mit erledigt (Abschnitt
   4.9);
4. findet eine **schema-seitige Lücke**: `validate: 'number'` in `prosemirror-model`
   prüft nur `typeof value === 'number'` — und `typeof NaN === 'number'` ist `true`.
   Das Schema schützt also **nicht** vor einem stillen `NaN`-Wert; die in der
   Anforderung geforderte „kein stiller NaN-Wert im Dokumentmodell" (Grenzfall 4.1)
   muss vollständig in Reader/Toolbar/`parseDOM` sichergestellt werden, nicht im
   Schema. Siehe Abschnitt 3.6;
5. beantwortet die offene Frage aus Anforderung Abschnitt 3.4 (App-Standardgröße) mit
   einer konkreten Entscheidung (11 pt, konsistent in CSS + beiden Formaten verankert,
   siehe Abschnitt 3.3) statt sie unbeantwortet zu lassen;
6. listet den vollständigen Satz neuer/geänderter Produktivdateien (Abschnitt 4) sowie
   neuer Testdateien (Abschnitt 6), inklusive bereits im Repo vorhandener
   Fremddatei-Fixtures, die sich für die in Abschnitt 5 der Anforderung geforderte
   Rundreise-Matrix eignen (Abschnitt 7).

---

## 1. Methodik dieser Prüfung

Gelesen wurden: `src/formats/shared/schema.ts`, `src/formats/shared/editor/commands.ts`,
`src/formats/shared/editor/Toolbar.tsx`, `src/formats/shared/editor/WordEditor.tsx`,
`src/formats/docx/reader.ts`, `src/formats/docx/writer.ts`, `src/formats/docx/styleDefs.ts`,
`src/formats/odt/reader.ts`, `src/formats/odt/writer.ts`, `src/formats/odt/styleRegistry.ts`,
`src/formats/shared/documentModel.ts`, `src/index.css`, beide `__tests__/roundtrip.test.ts`,
beide `__tests__/external-fixtures.test.ts`, `tests/e2e/*.spec.ts`, `playwright.config.ts`,
`FEATURE-SPEC-DOCX-ODT.md` (Abschnitte 1–4, 17), `specs/unterstrichen-einfach-code.md`
(als Stil-/Methodik-Vorbild), `specs/schriftart-waehlen-req.md` und
`specs/schriftfarbe-req.md` (Abgrenzung/verwandte Einträge). Zusätzlich wurde
`node_modules/prosemirror-model` (Attribut-Validierung, `MarkType`/`Attribute`) sowie
`node_modules/prosemirror-commands` (`toggleMark`, insb. `addStoredMark`/
`removeStoredMark` bei leerer Selektion) im Quellcode geprüft, um die in Abschnitt 2.2/
3.2 der Anforderung geforderte Abweichung von `applyMarkColor`/`clearMarkColor` korrekt
zu spezifizieren. Der vorhandene Fixture-Bestand unter
`tests/fixtures/external/{docx,odt}` wurde per Skript nach `w:sz`/`fo:font-size`-Werten
durchsucht (Ergebnis in Abschnitt 7), um reale (nicht selbst erzeugte) Rundreise-Test-
kandidaten für Anforderung Abschnitt 5.2 zu identifizieren, statt nur synthetische
Test-XML zu unterstellen.

---

## 2. Ist-Zustand nach Codelektüre — Abgleich mit der Anforderung

Bestätigt alle Aussagen aus Anforderung Abschnitt 7:

| Fundstelle | Ist-Zustand | Deckt sich mit Anforderung? |
|---|---|---|
| `schema.ts` Zeile 109–148 | Marks `strong, em, underline, strike, textColor, highlight`; kein `fontSize` | Ja |
| `commands.ts` Zeile 88–106 | `applyMarkColor`/`clearMarkColor` geben bei `empty` Selektion `false` zurück, kein Äquivalent für Größe | Ja |
| `Toolbar.tsx` | Kein Element für Schriftgröße oder Schriftart | Ja |
| `docx/reader.ts` Zeile 99–114 | `marksFromRunProperties` liest `w:b/i/u/strike/color/shd`, **kein** `w:sz` | Ja |
| `docx/writer.ts` Zeile 18–31 | `runPropertiesXml` schreibt kein `w:sz` für Läufe | Ja |
| `docx/styleDefs.ts` Zeile 3, 17 | `HEADING_FONT_SIZES` nur für `heading N`-Formatvorlagen, `w:docDefaults` leer (Zeile 25) | Ja |
| `odt/reader.ts` Zeile 13–20, 47–61 | `RunStyle`/`parseAutomaticStyles` liest `fo:font-weight/style/color/background-color` + Unterstreichungs-/Durchstreichungs-Stile, **kein** `fo:font-size` | Ja |
| `odt/writer.ts` Zeile 25–36 | `runPropsFromMarks` kennt kein `fontSize`-Feld | Ja |
| `odt/styleRegistry.ts` Zeile 3–10, 77 | `RunProps` ohne `fontSize`; `HEADING_FONT_SIZES` nur für Überschriften-Formatvorlagen | Ja |
| `index.css` Zeile 22–27 | `.ProseMirror` ohne explizite `font-size` | Ja |

Zusätzlich beim Audit gefunden, **nicht** in der Anforderungstabelle erwähnt (siehe
Abschnitt 3 für die Details und den jeweiligen Fix):

1. **`odt/styleRegistry.ts`, `TextStyleRegistry.styleNameFor` (Zeile 28–39):** Dedup-Key
   ist `JSON.stringify(props)` — objekt-insertionsreihenfolge-abhängig. Bereits in
   `specs/unterstrichen-einfach-code.md` Abschnitt 3.3 als Härtungsbedarf identifiziert,
   **aber im aktuellen Code-Stand nicht behoben** (verifiziert: Zeile 30 lautet exakt
   `const key = JSON.stringify(props)`, keine kanonische Feldreihenfolge). Mit dem
   siebten Feld `fontSize` steigt das Kollisionsrisiko; wird in diesem Plan behoben
   (Abschnitt 4.9).
2. **`prosemirror-model`, `Attribute`/`validateType` (`node_modules/prosemirror-model/dist/index.cjs`,
   Zeile 1874–1880):** `validate: 'number'` prüft ausschließlich `typeof value ===
   'number'`. Da `typeof NaN === 'number'`, würde ein Schema-Attribut mit
   `validate: 'number'` einen `NaN`-Wert **nicht** ablehnen. Grenzfall 4.1 der
   Anforderung („kein stiller NaN-Wert im Dokumentmodell") kann sich also **nicht** auf
   das Schema verlassen — die Absicherung muss vollständig in Reader/`parseDOM`/Toolbar
   erfolgen (Abschnitt 3.6).
3. **ODT-Sonderfall „Schriftgröße auf Absatzformat-Ebene statt per `text:span`":** Reale
   LibreOffice-Dateien setzen Zeichenformatierung (inkl. Schriftgröße) teils direkt in
   den `style:text-properties` einer **paragraph**-`family`-Formatvorlage (referenziert
   über `text:style-name` am `<text:p>`/`<text:h>` selbst), nicht über einen
   `text:span` mit `family="text"`-Stil. Beispiel im vorhandenen Fixture-Korpus:
   `tableComplex_DOC_LO41.odt`, Stil `P2` (`style:family="paragraph"`,
   `style:text-properties fo:font-size="21.5pt" fo:font-weight="bold" …`), direkt am
   Absatz referenziert, **ohne** inneren `text:span`. Der bestehende Reader
   (`parseAutomaticStyles`) liest bei `family === 'paragraph'` **nur** `fo:text-align`
   (Zeile 62–66) — Fett/Kursiv/Farbe/Größe auf reiner Absatzformat-Ebene gehen dort
   schon **heute** (für die bereits vorhandenen Marks) verloren, nicht erst durch diese
   Anforderung neu eingeführt. Das ist ein **vorbestehender, nicht auf Schriftgröße
   beschränkter Reader-Gap**, kein durch diese Anforderung neu einzuführender Fehler —
   wird hier **nicht** behoben (Scope-Erweiterung auf alle Zeichenformate wäre nötig,
   nicht Gegenstand von `schriftgroesse-waehlen`), aber dokumentiert, damit er nicht
   fälschlich als „hier neu eingeführter Bug" missverstanden wird, und damit bei der
   Fixture-Auswahl für Testfall 4.12/5.2 (Abschnitt 7) bewusst ein Fixture gewählt wird,
   bei dem die Größe über einen `text:span`-Stil (`family="text"`) läuft, nicht über
   eine reine Absatzformat-Vorlage.

---

## 3. Architekturentscheidungen (vor dem dateigenauen Plan)

### 3.1 Neue Datei `src/formats/shared/fontSize.ts`

Presets, Wertebereich, Rundung und Freitext-Parsing werden an **vier** Stellen
gebraucht (Schema-`parseDOM`, `commands.ts`, Toolbar-Eingabefeld, beide Reader) — als
eine gemeinsame, reine Utility-Datei statt vierfacher Duplikation:

```ts
// src/formats/shared/fontSize.ts
export const FONT_SIZE_MIN_PT = 1
export const FONT_SIZE_MAX_PT = 400
export const FONT_SIZE_STEP_PT = 0.5
export const FONT_SIZE_PRESETS_PT = [8, 9, 10, 10.5, 11, 12, 14, 16, 18, 20, 24, 28, 36, 48, 72]

/**
 * Rundet auf den nächsten 0,5-pt-Schritt — OHNE Bereichsbegrenzung. Wird auf JEDEN
 * fontSize-Wert angewendet, der neu ins System kommt, INKLUSIVE Datei-Import (siehe
 * Anforderung 2.5: "die App rundet dennoch einheitlich auf 0,5-pt-Schritte, damit ein
 * Dokument nach Cross-Format-Rundreise nicht durch Rundungsdifferenzen driftet").
 */
export function roundToHalfPt(pt: number): number {
  return Math.round(pt / FONT_SIZE_STEP_PT) * FONT_SIZE_STEP_PT
}

/**
 * Rundet UND begrenzt auf [1, 400] pt. Bewusst NUR für Werte verwendet, die die App
 * selbst neu setzt (Toolbar-Eingabe/-Commit, Preset-Klick, geclampter Paste-Import,
 * siehe Grenzfall 4.9) — NICHT für Werte, die unverändert aus einer importierten
 * DOCX-/ODT-Datei gelesen werden (siehe Abschnitt 3.2 dieses Plans für die Begründung).
 */
export function clampFontSizePt(pt: number): number {
  return Math.min(FONT_SIZE_MAX_PT, Math.max(FONT_SIZE_MIN_PT, roundToHalfPt(pt)))
}

/**
 * Parst Freitext-Eingabe aus dem Schriftgrößenfeld. Akzeptiert deutsches Komma als
 * Dezimaltrennzeichen (Grenzfall 4.5). Liefert `null` bei allem, was keine reine
 * Zahl ist (Grenzfall 4.1) — kein `parseFloat`-Fallback, der z. B. "abc123" fälschlich
 * als 123 durchließe, und kein `Number()`-Fallback, der "Infinity"/"NaN" als
 * String-Literal durchließe.
 */
export function parseFontSizeInput(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.')
  if (!/^[+-]?\d+(\.\d+)?$/.test(normalized)) return null
  const value = Number(normalized)
  return Number.isFinite(value) ? value : null
}

/** Zeigt halbe Punkte mit deutschem Komma an ("13,5"), ganze Zahlen ohne Nachkommastelle. */
export function formatFontSizePt(pt: number): string {
  return Number.isInteger(pt) ? String(pt) : String(pt).replace('.', ',')
}
```

### 3.2 Rundung vs. Clamping — warum das zwei getrennte Funktionen sein müssen

Anforderung 2.5 verlangt einheitliche 0,5-pt-Rundung **überall**, damit eine
Cross-Format-Rundreise (Grenzfall 4.16) nicht driftet. Anforderung 4.2/4.3 verlangt
Clamping auf **1–400 pt**, aber der Wortlaut dort spricht ausdrücklich von „Eingabe"
(„Eingabe von 0 oder negativen Werten", „Eingabe außerhalb des Bereichs") — das ist eine
Validierungsregel für das **Bedienelement**, keine Nachbearbeitungsregel für **Datei-
Import**. Anforderung Abschnitt 3, Punkt 3 verlangt zum DOCX-Reader ausdrücklich nur:
„`w:sz` … in `pt = wert / 2` umrechnen, als `fontSize`-Mark … anwenden" — **keine**
Bereichsprüfung. Würde der Reader dennoch auf 400 pt clampen, würde eine reale, mit
z. B. 500 pt formatierte Fremddatei (im Fixture-Korpus nicht vorhanden, aber laut
OOXML-Schema zulässig — `w:sz` ist technisch nur durch die 16-Bit-Ganzzahl des
`ST_HpsMeasure`-Typs begrenzt) beim reinen „Hochladen → unverändert exportieren →
reimportieren" (Anforderung 5.1, erste Pflichtzeile: „jede einzelne Größe bleibt an
ihrer ursprünglichen Textstelle erhalten") **unzulässig verändert**. Konsequenz für
diesen Plan:

- **Reader** (`docx/reader.ts`, `odt/reader.ts`): nur `roundToHalfPt`, niemals
  `clampFontSizePt`.
- **`schema.ts` `parseDOM`** (Paste-Pfad): `clampFontSizePt` — Grenzfall 4.9 der
  Anforderung sagt das explizit („außerhalb des Bereichs wird geclamped").
- **Toolbar-Eingabefeld-Commit**: `clampFontSizePt` — direkte Anforderung aus 4.2/4.3.
- **`commands.ts` `setFontSize`**: `clampFontSizePt` als zusätzliche Verteidigungslinie
  (falls die Funktion je aus einem anderen Kontext als der Toolbar aufgerufen wird),
  **ändert aber nichts an bereits im Dokument vorhandenen, ggf. außerhalb des Bereichs
  liegenden Werten** — die Toolbar-Anzeige (`getFontSizeAtSelection`, Abschnitt 3.5)
  zeigt einen vorhandenen, außerhalb von [1, 400] liegenden Wert unverändert an (analog
  zu Word: öffnet man eine Datei mit absurder Größe, zeigt das Schriftgrad-Feld genau
  diesen Wert, das Clamping greift erst, wenn man selbst einen **neuen** Wert einträgt).
- **DOCX-/ODT-Writer**: rundet defensiv erneut (`Math.round`/`roundToHalfPt`), clampt
  aber **nicht** — ein aus dem Reader unverändert durchgereichter Wert >400 pt muss
  beim Reexport unverändert wieder herauskommen.

### 3.3 Auflösung der offenen Frage 3.4 (App-Standardgröße)

Anforderung 3.4 verlangt explizit eine Entscheidung vor Abnahme. Entscheidung dieses
Plans: **11 pt**, konsistent in CSS **und** beiden Export-Defaults verankert, **ohne**
dass dafür je ein `fontSize`-Mark gesetzt wird (das bleibt weiterhin nur bei expliziter
Nutzer-Interaktion mit dem neuen Bedienelement der Fall — Anforderung 3.4 letzter Satz
bleibt erfüllt):

- `src/index.css`, `.ProseMirror`: `font-size: 11pt;` ergänzen (Zeile 22–27). Bewusst
  die CSS-Einheit `pt` selbst verwendet (Browser unterstützen `pt` nativ, 1 pt = 1/96×
  1.333… px durch die CSS-Spezifikation exakt auf 96 dpi normiert) — das vermeidet jede
  manuelle px-Umrechnung/Rundungsdifferenz und macht Testfall 16 (WYSIWYG-Check) trivial
  exakt nachprüfbar.
- `src/formats/docx/styleDefs.ts`: `<w:docDefaults/>` (Zeile 25) wird zu
  `<w:docDefaults><w:rPrDefault><w:rPr><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults>`
  (22 Halbpunkte = 11 pt).
- `src/formats/odt/writer.ts`, `buildStylesXml` (Zeile 143): `<style:style
  style:name="Standard" style:family="paragraph"/>` bekommt
  `<style:text-properties fo:font-size="11pt"/>`.

### 3.4 Kombiniertes Bedienelement: natives `<input list>` + Preset-Klick-Erkennung

Anforderung Punkt 5 der Tabelle in Abschnitt 1 erlaubt ausdrücklich „natives `<input
list="…">`/Datalist" als Umsetzung — das wird gewählt, weil der Browser dafür
Pfeiltasten-Navigation und Enter-Übernahme **kostenlos** mitliefert (Anforderung Punkt
5), was ein selbstgebautes Dropdown erst nachbauen müsste.

Offene technische Frage dabei: ein natives `<input list>` löst für „Freitext tippen"
und „Vorschlag aus der Liste anklicken" **dasselbe** `input`/`change`-Event aus — es
gibt keine dedizierte „Option angeklickt"-Callback wie bei einer `<select>`. Die
Anforderung verlangt aber unterschiedliches Verhalten: Freitext **erst** bei
Enter/Blur übernehmen (Punkt 3 der Tabelle), Preset-Klick **sofort ohne** Bestätigung
(Punkt 2). Lösung: Chromium (und damit auch das in `playwright.config.ts` einzig
konfigurierte Test-Target `Desktop Chrome`/`Pixel 7`/`iPad Mini`, alle Chromium-basiert)
setzt beim Auswählen eines Datalist-Vorschlags `InputEvent.inputType` auf
`"insertReplacementText"` — **anders** als bei getippten Zeichen (`"insertText"`). Der
`onChange`-Handler unterscheidet danach:

```tsx
onChange={(e) => {
  const native = e.nativeEvent as InputEvent
  setDraft(e.target.value)
  if (native.inputType === 'insertReplacementText') {
    commit(e.target.value) // Preset-Klick: sofort anwenden, keine Bestätigung nötig
  }
}}
```

Dies ist ein Chromium-spezifisches, aber für dieses Repo (nur Chromium-Testtargets)
ausreichendes Verhalten. **Risiko, hier explizit dokumentiert statt stillschweigend
angenommen:** Sollte sich dieses Verhalten in einer zukünftigen Chromium-Version ändern
oder in einem außerhalb der Test-Matrix liegenden Browser (Firefox/Safari) abweichen,
bleibt als Rückfallebene der `onBlur`-Commit erhalten — der Preset-Wert würde dann erst
beim nächsten Fokuswechsel statt sofort übernommen, was **keinen Datenverlust**, aber
eine UX-Abweichung von Anforderungspunkt 2 bedeutet. Empfehlung, falls das beim
Implementieren nicht robust genug ist: Fallback auf ein selbstgebautes
Dropdown-Markup (eigenes `<ul>` mit `onMouseDown`+`preventDefault()` pro Eintrag,
exakt wie die bestehenden Toolbar-Buttons es schon für Fett/Kursiv/etc. tun) —
das wäre bedeutend mehr Code, aber ereignis-eindeutig. Diese Entscheidung sollte beim
Implementieren anhand eines echten Playwright-Laufs getroffen werden, nicht anhand
dieses Plans allein.

### 3.5 `getFontSizeAtSelection` — Algorithmus für Anzeige (inkl. „gemischt")

Neue Funktion in `commands.ts`, analog zu `currentHeadingLevel()` in `Toolbar.tsx` als
Vorbild (Anforderungspunkt 4), aber komplexer, weil sie über die **gesamte** Selektion
(nicht nur `$from`) urteilen und implizite Überschriften-Größen (Anforderung 2.3, 2.4)
mit einbeziehen muss:

```ts
import { FONT_SIZE_PRESETS_PT } from '../fontSize' // re-exportiert falls von der Toolbar gebraucht

const HEADING_FONT_SIZES_PT: Record<number, number> = { 1: 24, 2: 20, 3: 18, 4: 16, 5: 14, 6: 13 }

function implicitFontSizePt($pos: import('prosemirror-model').ResolvedPos): number | null {
  for (let depth = $pos.depth; depth >= 0; depth--) {
    const node = $pos.node(depth)
    if (node.type.name === 'heading') return HEADING_FONT_SIZES_PT[node.attrs.level as number] ?? null
    if (node.type.name === 'paragraph') return null
  }
  return null
}

function effectiveFontSizePt(node: import('prosemirror-model').Node, $pos: import('prosemirror-model').ResolvedPos): number | null {
  const mark = wordSchema.marks.fontSize.isInSet(node.marks)
  return mark ? (mark.attrs.pt as number) : implicitFontSizePt($pos)
}

class MixedFontSizeSignal {} // Sentinel zum frühzeitigen Abbruch, siehe Grenzfall 4.15 (Performance)

/** `null` bedeutet sowohl "kein bestimmbarer Wert an der Schreibmarke" (2.2, kein Mark, kein Heading)
 *  als auch "gemischte Selektion" (2.3) — beides wird UI-seitig identisch als leeres Feld mit
 *  Platzhalter dargestellt, siehe Anforderung 2.3. */
export function getFontSizeAtSelection(state: EditorState): number | null {
  const { selection } = state
  if (selection.empty) {
    const marks = state.storedMarks || selection.$from.marks()
    const mark = wordSchema.marks.fontSize.isInSet(marks)
    return mark ? (mark.attrs.pt as number) : implicitFontSizePt(selection.$from)
  }
  try {
    let seen: number | null | 'unset' = 'unset'
    for (const range of selection.ranges) {
      state.doc.nodesBetween(range.$from.pos, range.$to.pos, (node, pos) => {
        if (!node.isText) return
        const value = effectiveFontSizePt(node, state.doc.resolve(pos))
        if (seen === 'unset') seen = value
        else if (seen !== value) throw new MixedFontSizeSignal()
      })
    }
    return seen === 'unset' ? null : seen
  } catch (err) {
    if (err instanceof MixedFontSizeSignal) return null
    throw err
  }
}
```

Design-Entscheidungen hier, die von der Anforderung direkt gefordert werden:

- **Mehrere `selection.ranges` statt nur `.from`/`.to`:** notwendig für Grenzfall 4.6
  („inklusive über Zellgrenzen hinweg innerhalb derselben Tabelle") — eine
  `CellSelection` aus `prosemirror-tables` liefert pro selektierter Zelle einen
  eigenen Eintrag in `.ranges`; `.from`/`.to` allein würde bei nicht-rechteckigen
  Selektionen falsch auch Inhalt zwischen den Zellen einbeziehen. Das ist eine
  bewusste Verbesserung gegenüber dem in der Anforderung explizit als **kein**
  Vorbild markierten `applyMarkColor`/`clearMarkColor` (die nur `.from`/`.to` nutzen).
- **Sentinel-Exception zum Abbruch bei „gemischt" erkannt:** `nodesBetween` hat keinen
  eingebauten Early-Exit über Geschwister-Knoten hinweg (ein `false`-Return im Callback
  bricht nur den Abstieg in Kind-Knoten ab, nicht die Geschwister-Iteration). Für
  Grenzfall 4.15 („Alles auswählen" bei sehr langem Dokument) sorgt das dafür, dass die
  Prüfung beim ersten Widerspruch abbricht, statt das gesamte Dokument durchzuzählen.
- **Heading-Größen-Tabelle dupliziert `HEADING_FONT_SIZES` aus `odt/styleRegistry.ts`
  (pt) bzw. `docx/styleDefs.ts` (Halbpunkte, `/2` gerechnet identisch: 24/20/18/16/14/13
  pt in beiden Formaten).** Diese drei Stellen könnten auf eine gemeinsame Konstante
  konsolidiert werden (z. B. `shared/headingFontSizes.ts`, von der UI **und** beiden
  Formatschreibern importiert) — das ist **nicht** zwingend Teil dieser Anforderung,
  wird aber als Aufräum-Empfehlung vermerkt, weil sonst **drei** unabhängige
  Quellen für dieselben sechs Zahlen existieren, die bei einer künftigen Änderung
  auseinanderlaufen könnten. Kein Blocker für diese Anforderung.

### 3.6 Commands: `setFontSize`/`clearFontSize` — leere Selektion MUSS wirken

Anforderung 2.2/3, Punkt 2 verlangt ausdrücklich das **Gegenteil** von
`applyMarkColor`/`clearMarkColor`s Verhalten bei leerer Selektion. Vorbild dafür ist
**nicht** `applyMarkColor`, sondern `toggleMark` aus `prosemirror-commands`
(`node_modules/prosemirror-commands/dist/index.cjs`, Zeile 521 ff.), das bei leerer
Selektion mit Cursor (`$cursor`) über `tr.addStoredMark`/`tr.removeStoredMark` genau
das in Anforderung 2.2 verlangte Verhalten zeigt (wirkt auf als Nächstes getippten
Text, nicht auf umgebenden Text) — das bereits über die bestehende `Mod-b`/`Mod-i`/
`Mod-u`-Tastenkombination im Editor beobachtbar ist:

```ts
export function setFontSize(pt: number): Command {
  const clamped = clampFontSizePt(pt) // Verteidigungslinie, siehe Abschnitt 3.2 — Toolbar clamped bereits selbst
  return (state, dispatch) => {
    const mark = wordSchema.marks.fontSize.create({ pt: clamped })
    if (dispatch) {
      let tr = state.tr
      if (state.selection.empty) {
        tr = tr.removeStoredMark(wordSchema.marks.fontSize).addStoredMark(mark)
      } else {
        for (const range of state.selection.ranges) {
          tr = tr.addMark(range.$from.pos, range.$to.pos, mark)
        }
      }
      dispatch(tr)
    }
    return true
  }
}

export function clearFontSize(): Command {
  return (state, dispatch) => {
    if (dispatch) {
      let tr = state.tr
      if (state.selection.empty) {
        tr = tr.removeStoredMark(wordSchema.marks.fontSize)
      } else {
        for (const range of state.selection.ranges) {
          tr = tr.removeMark(range.$from.pos, range.$to.pos, wordSchema.marks.fontSize)
        }
      }
      dispatch(tr)
    }
    return true
  }
}
```

Beide geben **immer** `true` zurück (anders als `applyMarkColor`/`clearMarkColor`, die
bei `empty` `false` liefern) — das ist der in Anforderung 2.2 geforderte, bewusste
Unterschied und wird als solcher im Code kommentiert (Verweis auf diese Anforderung),
damit ein künftiger Refactor die beiden Verhaltensweisen nicht versehentlich
angleicht.

Alle Ranges werden in **derselben** Transaktion (`tr`) gesammelt und **einmal**
dispatcht — das ergibt genau **einen** Undo-Schritt auch bei Mehrfachbereichen
(Tabellenzellen) oder sehr langen Selektionen (Grenzfall 4.10, 4.15).

### 3.7 Schema-Mark `fontSize`

```ts
// Ergänzung in src/formats/shared/schema.ts, im marks-Record, analog zu textColor:
fontSize: {
  attrs: { pt: { validate: 'number' } },
  parseDOM: [
    {
      style: 'font-size',
      getAttrs: (value) => {
        const match = /^([\d.]+)(pt|px)$/.exec(String(value).trim())
        if (!match) return false
        const raw = Number(match[1])
        const pt = match[2] === 'px' ? (raw * 72) / 96 : raw
        if (!Number.isFinite(pt) || pt <= 0) return false
        return { pt: clampFontSizePt(pt) } // Grenzfall 4.9: Bereich wird beim Paste-Import geclampt
      },
    },
  ],
  toDOM(mark) {
    return ['span', { style: `font-size: ${mark.attrs.pt}pt` }, 0]
  },
},
```

`schema.ts` importiert dafür `clampFontSizePt` aus `./fontSize`. Deckt Grenzfall 4.9
(externer Copy&Paste-Text mit `font-size`-Style, sowohl `pt`- als auch `px`-Einheiten,
da Browser-kopierter Text meist `px` liefert, Word-Zwischenablage meist `pt`) ab, ohne
neue Rundungslogik zu duplizieren.

---

## 4. Dateigenauer Änderungsplan

### 4.1 Neu: `src/formats/shared/fontSize.ts`

Siehe vollständiger Inhalt in Abschnitt 3.1. Keine Abhängigkeit auf ProseMirror —
reines TS-Utility-Modul, von `schema.ts`, `commands.ts`, `Toolbar.tsx`,
`docx/reader.ts`, `docx/writer.ts`, `odt/reader.ts`, `odt/writer.ts` importierbar, ohne
Zirkularität (liegt in `shared/`, wird von `docx/`/`odt/` importiert — exakt das
bestehende Muster von `../shared/documentModel`).

### 4.2 `src/formats/shared/schema.ts`

Neuer Mark `fontSize` im `marks`-Record (Abschnitt 3.7), eingefügt z. B. nach
`highlight` (Zeile 147). Kein Node betroffen — `paragraph`/`heading`/`list_item`/
`table_cell` erlauben bereits implizit alle Marks (keine `marks`-Einschränkung in den
NodeSpecs vorhanden), genau wie bei `textColor`/`highlight` heute schon.

### 4.3 `src/formats/shared/editor/commands.ts`

Neu: `setFontSize(pt: number): Command`, `clearFontSize(): Command` (Abschnitt 3.6),
`getFontSizeAtSelection(state: EditorState): number | null` (Abschnitt 3.5). Import von
`clampFontSizePt` aus `../fontSize`. `ColorMarkName`-Typ/`applyMarkColor`/
`clearMarkColor` bleiben **unverändert** — bewusst **kein** Versuch, sie auf dasselbe
Empty-Selection-Verhalten wie `fontSize` zu heben (das wäre eine Verhaltensänderung an
Textfarbe/Hervorhebung, die außerhalb dieser Anforderung liegt und in
`specs/schriftfarbe-req.md`/`specs/textmarker-farbe-req.md` gehört, falls dort je
gewünscht).

### 4.4 `src/formats/shared/editor/Toolbar.tsx`

Neue Importe: `setFontSize, clearFontSize, getFontSizeAtSelection` aus `./commands`;
`FONT_SIZE_PRESETS_PT, parseFontSizeInput, clampFontSizePt, formatFontSizePt` aus
`../fontSize`. Neue Komponente `FontSizeControl` (lokal in derselben Datei, analog zu
`MarkButton`/`AlignButton` — kein neues Component-File, entspricht dem bestehenden
Stil dieser Datei):

```tsx
function FontSizeControl({ view }: { view: EditorView }) {
  const current = getFontSizeAtSelection(view.state)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const displayValue = editing ? draft : current === null ? '' : formatFontSizePt(current)

  function commit(rawValue: string) {
    setEditing(false)
    const parsed = parseFontSizeInput(rawValue)
    if (parsed === null) return // Grenzfall 4.1: verwerfen, alter Wert bleibt sicht-/wirksam
    run(view, setFontSize(clampFontSizePt(parsed))) // Grenzfall 4.2–4.4: Clamp+Rundung, sichtbar nach Commit
  }

  return (
    <>
      <input
        aria-label="Schriftgröße"
        title="Schriftgröße (in Punkt)"
        list="font-size-presets"
        placeholder="—"
        value={displayValue}
        className="w-16 text-sm rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-1 py-1"
        onFocus={() => {
          setDraft(current === null ? '' : formatFontSizePt(current))
          setEditing(true)
        }}
        onChange={(e) => {
          setDraft(e.target.value)
          const native = e.nativeEvent as InputEvent
          if (native.inputType === 'insertReplacementText') commit(e.target.value) // Preset-Klick, siehe Abschnitt 3.4
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commit(draft)
          } else if (e.key === 'Escape') {
            e.preventDefault()
            setEditing(false) // verwirft Eingabe, alter Wert wird wieder angezeigt
            view.focus()
          }
        }}
        onBlur={() => {
          if (editing) commit(draft)
        }}
      />
      <datalist id="font-size-presets">
        {FONT_SIZE_PRESETS_PT.map((pt) => (
          <option key={pt} value={formatFontSizePt(pt)} />
        ))}
      </datalist>
    </>
  )
}
```

Einbindung in `Toolbar()` — direkt vor der bestehenden Fett/Kursiv/Unterstrichen/
Durchgestrichen-Gruppe (Zeile 135–138), als Platzhalter-Position auch für die separat
zu bauende Schriftart-Auswahl (`schriftart-waehlen`) links davon (Kommentar im Code
ergänzen, der auf diese künftige Erweiterung verweist, analog zum in Anforderung
Abschnitt 1 genannten UI-Anordnungshinweis):

```tsx
<div className="w-px h-5 bg-neutral-300 dark:bg-neutral-700 mx-1" />

{/* Platz für künftige Schriftart-Auswahl (schriftart-waehlen) links von der Größe */}
<FontSizeControl view={view} />

<div className="w-px h-5 bg-neutral-300 dark:bg-neutral-700 mx-1" />

<MarkButton view={view} mark="strong" label="F" title="Fett" glyphClassName="font-bold" />
...
```

Bewusst **kein** separater „Schriftgröße entfernen"-Button (anders als bei
Textfarbe/Hervorhebung): Anforderung Abschnitt 1 listet dafür kein Element, `
clearFontSize()` bleibt für die künftige `formatierung-loeschen`-Funktion (Anforderung
Abschnitt 6) programmatisch nutzbar, ohne eigenes UI jetzt zu benötigen.

### 4.5 `src/formats/docx/reader.ts`

`marksFromRunProperties` (Zeile 99–114), Ergänzung analog zu `color`:

```ts
const sz = firstChildNS(rPr, OOXML_NAMESPACES.w, 'sz')
const szVal = sz?.getAttributeNS(OOXML_NAMESPACES.w, 'val')
const szNum = szVal ? Number(szVal) : NaN
if (Number.isFinite(szNum) && szNum > 0) {
  marks.push({ type: 'fontSize', attrs: { pt: roundToHalfPt(szNum / 2) } })
}
```

Import von `roundToHalfPt` aus `../shared/fontSize`. **Bewusst kein** `clampFontSizePt`
hier (Abschnitt 3.2). Die explizite `Number.isFinite`-Prüfung fängt sowohl fehlendes
`w:val` als auch nicht-numerische/leere Werte ab, bevor je ein `NaN` den Weg in den
`fontSize`-Mark findet (Abschnitt 2, Fund 2 — das Schema selbst würde das nicht
verhindern).

### 4.6 `src/formats/docx/writer.ts`

`runPropertiesXml` (Zeile 18–31), neuer Zweig:

```ts
if (mark.type === 'fontSize') {
  const halfPoints = Math.max(1, Math.round(Number(mark.attrs?.pt ?? 0) * 2))
  props.push(`<w:sz w:val="${halfPoints}"/><w:szCs w:val="${halfPoints}"/>`)
}
```

`w:szCs` wird zusätzlich geschrieben (Complex-Script-Konsistenz), wie von Anforderung
Abschnitt 3, Punkt 4 explizit gefordert.

### 4.7 `src/formats/docx/styleDefs.ts`

`headingStylesXml()` (Zeile 9–30) bleibt strukturell **unverändert** — vorlagenbasierte
Größe bleibt Vorlagen-Default (Anforderung 2.4). Einzige Änderung: `<w:docDefaults/>`
(Zeile 25) → `<w:docDefaults><w:rPrDefault><w:rPr><w:sz w:val="22"/><w:szCs
w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults>` (Abschnitt 3.3, App-Standard 11 pt).
Optionale, nicht blockierende Aufräum-Empfehlung: `HEADING_FONT_SIZES` (Zeile 3) auf
eine mit `odt/styleRegistry.ts` geteilte Konstante umstellen (Abschnitt 3.5, letzter
Punkt).

### 4.8 `src/formats/odt/reader.ts`

`RunStyle`-Interface (Zeile 13–20): `fontSize?: number` ergänzen. In
`parseAutomaticStyles`, `family === 'text'`-Zweig (Zeile 47–61):

```ts
const fontSizeAttr = props.getAttributeNS(ODF_NAMESPACES.fo, 'font-size')
const fontSizeMatch = fontSizeAttr && /^([\d.]+)pt$/.exec(fontSizeAttr.trim())
if (fontSizeMatch) style.fontSize = roundToHalfPt(Number(fontSizeMatch[1]))
```

In `marksFor` (Zeile 82–94): `if (style.fontSize !== undefined) marks.push({ type:
'fontSize', attrs: { pt: style.fontSize } })`. Import `roundToHalfPt` aus
`../shared/fontSize`. **Bewusst kein** `clampFontSizePt` (Abschnitt 3.2) — anders als
DOCX kann `fo:font-size` beliebige Dezimalstellen enthalten (Anforderung 2.5), die
Rundung auf 0,5 pt ist hier **funktional relevant** (nicht nur defensiv wie bei DOCX,
wo `w:sz` bereits ganzzahlige Halbpunkte sind).

### 4.9 `src/formats/odt/writer.ts`

`runPropsFromMarks` (Zeile 25–36): `if (mark.type === 'fontSize') props.fontSize =
mark.attrs?.pt as number`. `buildStylesXml` (Zeile 143): `Standard`-Stil um
`fo:font-size="11pt"` ergänzen (Abschnitt 3.3).

### 4.10 `src/formats/odt/styleRegistry.ts`

`RunProps`-Interface (Zeile 3–10): `fontSize?: number` ergänzen.

`isEmpty` (Zeile 12–14):

```ts
function isEmpty(props: RunProps): boolean {
  return !props.bold && !props.italic && !props.underline && !props.strike && !props.color && !props.highlight && props.fontSize === undefined
}
```

(`=== undefined` statt Falsy-Check für `fontSize`, da `0` kein gültiger Wert ist —
Minimum ist 1 pt — aber zur Robustheit sauberer explizit auf Abwesenheit statt auf
Falsy-Wert zu prüfen.)

`styleNameFor` (Zeile 28–39) — **Fix des in Abschnitt 2, Fund 1 dokumentierten,
vorbestehenden Ordnungs-Bugs**, jetzt mit `fontSize` als siebtem Feld:

```ts
styleNameFor(props: RunProps): string | null {
  if (isEmpty(props)) return null
  const key = JSON.stringify([
    props.bold ?? false,
    props.italic ?? false,
    props.underline ?? false,
    props.strike ?? false,
    props.color ?? null,
    props.highlight ?? null,
    props.fontSize ?? null,
  ])
  const existing = this.byKey.get(key)
  if (existing) return existing
  this.counter += 1
  const name = `T${this.counter}`
  this.byKey.set(key, name)
  this.defs.push(buildTextStyleXml(name, props))
  return name
}
```

`buildTextStyleXml` (Zeile 46–59): `if (props.fontSize !== undefined) attrs.push(\`fo:font-size="${props.fontSize}pt"\`)`.

`headingStyleDefs()`/`HEADING_FONT_SIZES` (Zeile 77–93) bleiben **unverändert**
(Vorlagen-Default, Anforderung 2.4). Optionale Aufräum-Empfehlung siehe 3.5/4.7.

### 4.11 `src/index.css`

`.ProseMirror`-Regel (Zeile 22–27): `font-size: 11pt;` ergänzen (Abschnitt 3.3).

---

## 5. Zusammenfassung: bewusst NICHT geänderter Code

- `WordEditor.tsx` — **keine Änderung nötig.** `reconcileSelectionOnClick` ist bereits
  formatneutral (Grenzfall 4.11 damit ohne Codeänderung abgedeckt, nur Test fehlt,
  siehe Abschnitt 6). Kein neuer Keymap-Eintrag (`Mod-…`) für Schriftgröße gefordert —
  Anforderung Abschnitt 1 nennt explizit **keine** Tastenkombination als Teil dieses
  Scopes (Word kennt zwar Strg+Umschalt+P, das ist laut Anforderung ausdrücklich
  „nicht Bestandteil dieser Anforderung").
- `docx/relationships.ts`, `docx/imageCollector.ts`, `odt/imageCollector.ts`,
  `odt/xmlUtil.ts`, `docx/xmlUtil.ts` — kein Bezug zu Zeichenformatierung.
- `applyMarkColor`/`clearMarkColor` in `commands.ts` — bewusst unverändert
  (Abschnitt 4.3).
- `headingStylesXml()`/`HEADING_FONT_SIZES` in beiden Formaten — bleiben strukturell
  wie sie sind, nur `docDefaults`/`Standard`-Stil bekommen den neuen App-Default
  (Abschnitt 3.3).

---

## 6. Neue/erweiterte Testdateien

### 6.1 Unit-Tests (Vitest)

**Neu: `src/formats/shared/editor/__tests__/fontSize.test.ts`** — reine
Utility-Funktionstests (kein DOM/Editor nötig):

```ts
import { roundToHalfPt, clampFontSizePt, parseFontSizeInput, formatFontSizePt } from '../../fontSize'

describe('roundToHalfPt', () => {
  it.each([[13.37, 13.5], [13.1, 13], [13.26, 13.5], [10, 10]])('rounds %s to %s', (input, expected) => {
    expect(roundToHalfPt(input)).toBe(expected)
  })
})

describe('clampFontSizePt', () => {
  it('clamps 0 and negative values up to 1pt (Grenzfall 4.2)', () => {
    expect(clampFontSizePt(0)).toBe(1)
    expect(clampFontSizePt(-5)).toBe(1)
  })
  it('clamps values above 400 down to 400pt (Grenzfall 4.3)', () => {
    expect(clampFontSizePt(5000)).toBe(400)
  })
  it('rounds AND clamps in combination', () => {
    expect(clampFontSizePt(399.8)).toBe(400)
  })
})

describe('parseFontSizeInput', () => {
  it('accepts German comma decimal (Grenzfall 4.5)', () => {
    expect(parseFontSizeInput('12,5')).toBe(12.5)
  })
  it('rejects non-numeric input without throwing (Grenzfall 4.1)', () => {
    expect(parseFontSizeInput('abc')).toBeNull()
    expect(parseFontSizeInput('')).toBeNull()
    expect(parseFontSizeInput('Infinity')).toBeNull()
    expect(parseFontSizeInput('NaN')).toBeNull()
  })
})

describe('formatFontSizePt', () => {
  it('renders whole numbers without decimals and halves with German comma', () => {
    expect(formatFontSizePt(12)).toBe('12')
    expect(formatFontSizePt(13.5)).toBe('13,5')
  })
})
```

**Neu: `src/formats/docx/__tests__/fontSize.test.ts`** — Reader-Robustheit gegen
Fremddatei-Grenzfälle, analog zum Muster in `specs/unterstrichen-einfach-code.md`
Abschnitt 5.1 (`buildDocxWithRun`-Helfer wiederverwendbar/duplizierbar):

```ts
describe('DOCX reader: w:sz Grenzfälle', () => {
  it('reads a preset value correctly (24 half-points = 12pt)', async () => { /* w:sz val="24" → pt: 12 */ })
  it('reads a non-preset value (26 half-points = 13pt, Grenzfall 4.12)', async () => { /* pt: 13, nicht auf Preset gerundet */ })
  it('reads a half-point value (27 half-points = 13.5pt, Grenzfall 4.16)', async () => { /* pt: 13.5 */ })
  it('ignores a missing w:sz (kein Mark, Anforderung Abschnitt 3 Punkt 3)', async () => { /* kein fontSize-Mark im Ergebnis */ })
  it('ignores a non-numeric w:val without throwing (kein NaN, Fund 2 in Abschnitt 2)', async () => { /* w:sz w:val="abc" → kein Mark, kein Crash */ })
  it('does NOT clamp an out-of-range real-world value on pure import (Abschnitt 3.2)', async () => { /* w:sz val="1000" → pt: 500, NICHT auf 400 gekappt */ })
})
```

**Neu: `src/formats/odt/__tests__/fontSize.test.ts`** — analog, plus gezielte
Assertions gegen echte Fixtures (Abschnitt 7):

```ts
describe('ODT reader: fo:font-size Grenzfälle', () => {
  it('reads TestTextSelection.odt: T10-Stil (13pt) korrekt am erwarteten Textlauf (Grenzfall 4.12)', async () => { /* ... */ })
  it('rounds tableComplex_DOC_LO41.odt half-point value (21.5pt) unverändert, da bereits auf 0,5-Schritt (Grenzfall 4.16)', async () => { /* ... */ })
  it('reads bigFont.odt (72pt, Preset-Wert) korrekt', async () => { /* ... */ })
})
```

**Erweiterung: `src/formats/docx/__tests__/roundtrip.test.ts`** und
**`src/formats/odt/__tests__/roundtrip.test.ts`** — neue `describe`-Blöcke analog zu
„DOCX/ODT round trip: text formatting" (bestehende Zeilen 56–133 bzw. äquivalent):

```ts
describe('DOCX/ODT round trip: font size', () => {
  it('preserves a preset size (14pt)', async () => { /* ... */ })
  it('preserves a non-preset size (13pt, Grenzfall 4.12)', async () => { /* ... */ })
  it('preserves a half-point size (10.5pt, Grenzfall 4.16)', async () => { /* ... */ })
  it('preserves fontSize combined with bold and textColor on the same run (Anforderung 5.1, Zeile 5)', async () => { /* ... */ })
  it('preserves an explicit fontSize mark on a run inside a heading, distinct from the heading default size (Anforderung 2.4/5.1, Zeile 6)', async () => {
    // heading level 1 (implizit 24pt) + ein Textlauf darin mit explizitem fontSize-Mark (z. B. 30pt)
    // → nach Rundreise: Lauf mit Mark exakt 30pt, Rest der Überschrift weiterhin ohne Mark (implizit 24pt)
  })
})
```

**Erweiterung: `src/formats/odt/__tests__/roundtrip.test.ts`** — Regressionstest für
den in Abschnitt 2/4.9 gefundenen, vorbestehenden Dedup-Key-Bug (jetzt mit `fontSize`
als zusätzlichem Feld, Test-Vorlage aus `specs/unterstrichen-einfach-code.md`
Abschnitt 5.1 übernommen und um `fontSize` erweitert):

```ts
it('does not create duplicate automatic text styles when the same bold+fontSize combination arrives in different mark-array order', async () => {
  const original = doc([
    {
      type: 'paragraph',
      attrs: { align: 'left' },
      content: [
        { type: 'text', text: 'A', marks: [{ type: 'strong' }, { type: 'fontSize', attrs: { pt: 14 } }] },
        { type: 'text', text: 'B', marks: [{ type: 'fontSize', attrs: { pt: 14 } }, { type: 'strong' }] },
      ],
    },
  ])
  const blob = await writeOdt(original)
  const zip = await JSZip.loadAsync(blob)
  const contentXml = await zip.file('content.xml')!.async('text')
  const styleDefCount = (contentXml.match(/<style:style style:name="T\d+"/g) ?? []).length
  expect(styleDefCount).toBe(1)
})
```

### 6.2 E2E-Tests (Playwright)

**Neu: `tests/e2e/font-size.spec.ts`** — Kernstück der Anforderung, Struktur analog zu
`tests/e2e/docx.spec.ts`/`odt.spec.ts`/`selection-regression.spec.ts` (gleiche
`docxCard`/`odtCard`-Locator-Helfer wiederverwenden):

```ts
test.describe('Schriftgröße — Toolbar & Tastatur', () => {
  test('Testfall 1: Feld ist sichtbar und per Tab erreichbar', async ({ page }) => { /* ... */ })

  test('Testfall 2: Preset-Klick wendet sofort an, Fokus kehrt in den Editor zurück (2.1.3)', async ({ page }) => {
    // Text tippen, auswählen, Feld fokussieren, Preset "24" per Klick/Tastatur wählen
    // → Editor-DOM enthält font-size: 24pt, Editor hat wieder den Fokus
  })

  test('Testfall 3: Freitext + Enter wendet Größe an, Rundung auf 0,5pt greift (4.4)', async ({ page }) => { /* "13,37" → 13,5 */ })

  test('Testfall 4: Größe ohne Selektion wirkt nur auf neu getippten Text (2.2)', async ({ page }) => {
    // Cursor in bereits getipptem Text (ohne Auswahl), Größe setzen, weiter tippen
    // → nur der NEU getippte Teil hat die neue Größe, umgebender Text unverändert
  })

  test('Testfall 5: Gemischte Selektion zeigt leeres Feld, neue Größe vereinheitlicht (2.3, 4.6)', async ({ page }) => { /* ... */ })

  test('Testfall 6: Größe in Überschrift übersteuert sichtbar die Vorlagen-Größe (2.4, 4.7)', async ({ page }) => { /* ... */ })

  test('Testfall 7: Ungültige Eingaben werden abgelehnt/geclamped (4.1–4.3)', async ({ page }) => {
    // "abc" → alter Wert bleibt; "0" → springt auf 1; "5000" → springt auf 400
  })

  test('Testfall 8: Deutsches Komma wird akzeptiert (4.5)', async ({ page }) => { /* "12,5" → 12,5pt */ })

  test('Testfall 9: Undo/Redo macht eine Größenänderung als einen Schritt rückgängig (4.10)', async ({ page }) => { /* ... */ })

  test('Escape verwirft Freitext-Eingabe ohne Anwendung (Tabelle Element 3)', async ({ page }) => { /* ... */ })

  test('Grenzfall 4.8: Anwenden auf Bild/leere Zelle ohne Text — keine Exception', async ({ page }) => { /* ... */ })

  test('Grenzfall 4.9: Einfügen von extern kopiertem Text mit font-size-Style wird übernommen', async ({ page }) => {
    // Clipboard-API/page.evaluate zum Simulieren eines Paste mit HTML-Payload
    // <span style="font-size: 22px">Text</span> → nach Einfügen zeigt Feld ~16.5pt (22px * 72/96)
  })

  test('Grenzfall 4.14: zwei schnelle Größenänderungen hintereinander sind deterministisch (letzte gewinnt)', async ({ page }) => { /* ... */ })

  test('Grenzfall 4.15: sehr lange Selektion bleibt performant (Alles auswählen + neue Größe)', async ({ page }) => {
    // Großes generiertes Dokument, Zeitmessung um "Alles auswählen" + Größe setzen, Assertion auf angemessene Obergrenze
  })
})

test.describe('Schriftgröße — Rundreisen (Anforderung Abschnitt 5)', () => {
  test('Rundreise 1: DOCX — Editor-Text mit expliziter Größe → Export → Reimport', async ({ page }) => { /* ... */ })
  test('Rundreise 2: ODT — dito', async ({ page }) => { /* ... */ })
  test('Rundreise 3: reale DOCX-Fixture mit mehreren Lauf-Größen inkl. Nicht-Preset-Wert (Abschnitt 7)', async ({ page }) => { /* ... */ })
  test('Rundreise 4: reale ODT-Fixture mit mehreren Lauf-Größen inkl. Nicht-Preset-Wert (Abschnitt 7)', async ({ page }) => { /* ... */ })
  test('Rundreise 5: Kombination Größe+Fett+Farbe, DOCX und ODT', async ({ page }) => { /* ... */ })
  test('Rundreise 6: Größe auf Textlauf innerhalb einer Überschrift, DOCX und ODT', async ({ page }) => { /* ... */ })
  test('Testfall 16 / WYSIWYG: In-App font-size (getComputedStyle) entspricht exportiertem Wert', async ({ page }) => {
    // Ohne jede Interaktion mit dem Größenfeld: getComputedStyle(...).fontSize === "14.6667px" (11pt bei 96dpi)
    // UND Export enthält w:docDefaults/w:sz val=22 (DOCX) bzw. Standard-Stil fo:font-size="11pt" (ODT),
    // OHNE dass irgendein Textlauf einen expliziten fontSize-Mark/w:sz/fo:font-size erhält (Abschnitt 3.4 letzter Satz).
  })
})
```

**Erweiterung: `tests/e2e/selection-regression.spec.ts`** — neuer Test im bestehenden
`describe`-Block (Grenzfall 4.11), nach demselben Muster wie der vorhandene
„Fett"-Regressionstest:

```ts
test('same regression with font-size instead of bold (Grenzfall 4.11)', async ({ page }) => {
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Hallo, das ist ein Test.')
  await page.keyboard.press('ControlOrMeta+a')
  await page.getByLabel('Schriftgröße').fill('24')
  await page.getByLabel('Schriftgröße').press('Enter')
  await editor.click()
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Zweiter Absatz.')
  await expect(editor).toContainText('Hallo, das ist ein Test.')
  await expect(editor).toContainText('Zweiter Absatz.')
  await expect(page.locator('.ProseMirror p')).toHaveCount(2)
})
```

---

## 7. Fixture-Inventar — reale Rundreise-Testkandidaten (Anforderung 5.2)

Ermittelt per Skript (`w:sz w:val="…"` bzw. `fo:font-size="…pt"` über alle Dateien in
`tests/fixtures/external/{docx,odt}`), nicht durch Vermutung:

**DOCX** (`word/document.xml`, tatsächlich in `<w:r><w:rPr>`, nicht nur in
Formatvorlagen-Definitionen, geprüft):

| Datei | gefundene `w:sz`-Werte (Halbpunkte → pt) | Eignung |
|---|---|---|
| `bug59058.docx` | u. a. `26` (13pt, **nicht** Preset — Grenzfall 4.12), `17` (8.5pt, Halbpunkt — Grenzfall 4.16) | **Primärkandidat** für Rundreise-Testfall 3/12 — enthält sowohl Nicht-Preset- als auch Halbpunkt-Wert in derselben Datei. Vor Verwendung im Test verifizieren, dass die konkret gewählte Textstelle in `<w:r><w:rPr>` liegt (nicht in `<w:pPr><w:rPr>` — Absatzmarken-Formatierung, siehe Warnhinweis unten) |
| `61470.docx` | `16, 22, 11` (8pt, 11pt, 5.5pt) | Alternativkandidat |
| `IllustrativeCases.docx` | `24, 22, 18, 16` (12, 11, 9, 8pt) | Alternativkandidat, mehrere unterschiedliche Größen im selben Dokument (Anforderung 5.2, erste Anforderung: „mind. drei unterschiedliche … Schriftgrößen") |

**Wichtiger Warnhinweis, beim Implementieren zu verifizieren:** In `bug59058.docx`
liegen mehrere `w:sz`-Vorkommen (u. a. `w:val="27"`, `"33"`, `"19"`) **nicht** in einem
Textlauf (`<w:r><w:rPr>`), sondern in der Absatzmarken-Formatierung
(`<w:pPr><w:rPr>…</w:rPr></w:pPr>`, die den Pilcrow selbst betrifft, nicht sichtbaren
Text). Der bestehende `decodeParagraphRuns`/`marksFromRunProperties`-Code liest
ausschließlich `<w:r><w:rPr>` (Zeile 127 in `docx/reader.ts`), **nicht** `<w:pPr><w:rPr>`
— das ist korrekt so (Pilcrow-Formatierung soll keinen sichtbaren Textlauf betreffen)
und **kein** neuer Fehler, aber es bedeutet: nicht jeder in der Datei gefundene
`w:sz`-String ist automatisch ein gültiger Testkandidat für „Lauf-Schriftgröße". Vor
der finalen Testimplementierung mit einem gezielten Dump von `word/document.xml`
verifizieren, welche der oben gelisteten Werte tatsächlich in `<w:r><w:rPr>` (nicht
`<w:pPr><w:rPr>`) liegen — beim Audit für dieses Dokument wurden `w:val="26"` (mehrfach)
und `w:val="17"` (mehrfach) bereits als in echten `<w:r><w:rPr>`-Kontexten liegend
verifiziert.

**ODT** (`content.xml`, `style:family="text"`-Stile, über `text:span` referenziert,
geprüft):

| Datei | gefundene `fo:font-size`-Werte | Eignung |
|---|---|---|
| `TestTextSelection.odt` | u. a. Stil `T10` = `13pt` (**nicht** Preset), referenziert über `<text:span text:style-name="T10">` — verifiziert | **Primärkandidat** für Grenzfall 4.12 |
| `tableComplex_DOC_LO41.odt` | `21.5pt`, `17.5pt` (Halbpunkt-Werte) | **Nicht direkt verwendbar** — liegt auf `style:family="paragraph"`-Ebene (Stil `P2`, siehe Abschnitt 2, Fund 3), nicht auf `family="text"`, wird vom aktuellen Reader nicht gelesen (vorbestehender Gap, nicht Teil dieser Anforderung) |
| `bigFont.odt` | `72pt` (Preset-Wert) | Für einen einfachen Positivtest geeignet |
| `excelfileformat.odt`, `Seasonal_Fruits2_en.odt` | mehrere unterschiedliche Werte (6–36pt) im selben Dokument | Alternativkandidaten für Anforderung 5.2 „mind. drei unterschiedliche Größen" |

Für Anforderung 5.2, Punkt „mindestens eine Überschrift mit einem Textlauf, der eine
von der Vorlagen-Größe abweichende, explizite Größe trägt" (Grenzfall 2.4/4.7) wurde
im vorhandenen Korpus **keine** passende reale Fixture gefunden — dieser Fall muss
wie in `specs/unterstrichen-einfach-code.md` Abschnitt 5.1 für Nicht-Standard-Werte
bereits vorgemacht, über eine **handgebaute** Test-XML (analog `buildSampleDocx`/
`buildSampleOdt` in `tests/e2e/docx.spec.ts`/`odt.spec.ts`) konstruiert werden, nicht
über einen Korpus-Fund.

---

## 8. Abnahme-Mapping (Anforderung Abschnitt 8/9 → Testdatei)

| Anforderung | Abgedeckt durch |
|---|---|
| Testfälle 1–9 (Abschnitt 8) | `tests/e2e/font-size.spec.ts`, describe „Toolbar & Tastatur" |
| Rundreise-Testfälle 10–15 (Abschnitt 8, Abschnitt 5) | `tests/e2e/font-size.spec.ts`, describe „Rundreisen"; ergänzt durch `roundtrip.test.ts` (Vitest, isolierte Reader/Writer-Prüfung ohne Browser) |
| Grenzfälle 4.1–4.5 (Eingabevalidierung) | `src/formats/shared/editor/__tests__/fontSize.test.ts` (Utility-Ebene) + `font-size.spec.ts` Testfall 7/8 (End-to-End) |
| Grenzfall 4.6 (Tabellen-Mehrfachselektion) | `font-size.spec.ts` Testfall 5, `getFontSizeAtSelection`/`setFontSize` über `selection.ranges` (Abschnitt 3.5/3.6) |
| Grenzfall 4.7 (Überschrift + Fließtext gemischt) | `font-size.spec.ts` Testfall 6 |
| Grenzfall 4.8 (Bild/leere Zelle) | `font-size.spec.ts`, dedizierter Test |
| Grenzfall 4.9 (Paste mit `font-size`) | `font-size.spec.ts`, dedizierter Test; `schema.ts` `parseDOM` (Abschnitt 3.7) |
| Grenzfall 4.10/4.11 (Undo/Redo, Selection-Sync-Regression) | `font-size.spec.ts` Testfall 9; `selection-regression.spec.ts`, neuer Test |
| Grenzfall 4.12 (Nicht-Preset-Fremdwert) | `docx/__tests__/fontSize.test.ts`, `odt/__tests__/fontSize.test.ts` (Fixtures aus Abschnitt 7) |
| Grenzfall 4.13 (Kopf-/Fußzeile) | Nachrichtlich, siehe Anforderung — kein Blocker, kein Test jetzt (Kopf-/Fußzeilen-UI existiert noch nicht) |
| Grenzfall 4.14 (Race Condition) | `font-size.spec.ts`, dedizierter Test |
| Grenzfall 4.15 (Performance, langes Dokument) | `font-size.spec.ts`, dedizierter Test; Sentinel-Early-Exit in `getFontSizeAtSelection` (Abschnitt 3.5) |
| Grenzfall 4.16 (Cross-Format Halbpunkt) | `docx/__tests__/roundtrip.test.ts`/`odt/__tests__/roundtrip.test.ts`, neue Fälle; `font-size.spec.ts` Rundreise 3/4 |
| Abschnitt 5.1 (vollständige Rundreise-Matrix) | `font-size.spec.ts`, describe „Rundreisen" + beide `roundtrip.test.ts` |
| Abschnitt 5.2 (Mindestabdeckung Testdateien) | Abschnitt 7 dieses Plans (Fixture-Auswahl) + handgebaute Ergänzung für Überschrift+Override |
| Abschnitt 3.4 (offene Frage App-Standard) | Beantwortet in Abschnitt 3.3 dieses Plans (11 pt) + `font-size.spec.ts` „Testfall 16 / WYSIWYG" |
| DoD Punkt 5 (kein Fund ohne Vermerk) | Abschnitt 2 (Audit-Zusatzfunde) + Abschnitt 5 (bewusst unverändert) dieses Plans |

---

## 9. Offene Abhängigkeiten (nur dokumentieren, kein Code jetzt)

- **`schriftart-waehlen`**: Sobald umgesetzt, UI-Platzierung links von
  `FontSizeControl` in derselben Toolbar-Gruppe (Code-Kommentar in Abschnitt 4.4 markiert
  die Stelle bereits).
- **`schrift-vergroessern`/`schrift-verkleinern`**: müssen laut Anforderung Abschnitt 6
  denselben `fontSize`-Mark und dieselben `setFontSize`/`clampFontSizePt`-Funktionen
  wiederverwenden (Inkrement/Dekrement um einen Schritt aus `FONT_SIZE_PRESETS_PT` oder
  einfach `±1pt` auf den aktuellen `getFontSizeAtSelection()`-Wert, dann durch
  `clampFontSizePt` schicken). Kein Code jetzt, nur Vermerk.
- **`formatierung-loeschen`**: muss `clearFontSize()` (bereits jetzt exportiert, siehe
  Abschnitt 3.6/4.3) in ihre Clear-Logik mit aufnehmen, sobald diese Funktion gebaut
  wird.
- **`kopfzeile-bearbeiten`/`fusszeile-bearbeiten`** (Grenzfall 4.13): Sobald diese
  Bereiche editierbar sind, funktioniert Schriftgröße dort automatisch identisch (die
  Toolbar/Commands sind bereits jetzt bereichsunabhängig implementiert — Kopf-/
  Fußzeile nutzen denselben `wordSchema`), aber ein dedizierter E2E-Test dafür ist erst
  sinnvoll, sobald die Editier-UI existiert.
- **Optionale Konsolidierung** `HEADING_FONT_SIZES` (DOCX-Halbpunkte, ODT-Punkte,
  UI-Punkte) auf eine gemeinsame `shared/headingFontSizes.ts`-Konstante — siehe
  Abschnitt 3.5/4.7/4.10. Kein Blocker, nur Empfehlung für einen Folge-Commit.
