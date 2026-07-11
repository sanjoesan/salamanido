# Durchgestrichen — dateigenauer Umsetzungsplan

Gegenstück zu `specs/durchgestrichen-req.md`. Dieses Dokument beschreibt, nach
**erneuter, direkter Codelektüre des aktuellen Standes** (nicht aus einem früheren
Durchlauf übernommen), was am bestehenden Code zu ändern ist, welche Dateien neu
angelegt bzw. erweitert werden, und wie die geforderte Verifikation technisch
umgesetzt wird. Alle Zeilenangaben wurden gegen den **jetzigen** Quellstand geprüft;
im Zweifel gelten die **Symbolnamen**, nicht die Zeilennummer.

> Revisionshinweis: Eine frühere Fassung dieses Plans trug veraltete Zeilennummern
> (Codestand vor mehreren Umbauten), bezeichnete `commands.test.ts` fälschlich als
> „neue" Datei (sie existiert bereits mit `canCut`/`cutSelection`-Tests), schlug eine
> **fehlerhafte** `<w:rPr>`-Reihenfolge vor (`<w:shd>` vor `<w:u>`, siehe 3.2) und ließ
> die von der Anforderung ausdrücklich verlangte Erweiterung der
> `external-validation.test.ts` (Testfall 29/30) aus. Diese Fassung korrigiert alle
> vier Punkte. Zusätzlich in dieser Revision gegen den **jetzigen** Quellstand
> nachgezogen: die Keymap-Zeilennummern in 3.5/TL;DR/Abschnitt 2 (`Mod-b/-i/-u` steht
> real bei `98–100`, nicht `90–92`; Block `85–107`), und die zuvor **komplett fehlende**
> Abdeckung der Touch-/Mobile-Bedienung (Testfall 36 / Grenzfall 14 / Risiko 10 /
> Menüpunkt 7) als neuer Abschnitt 5.2.1 samt Mapping-Zeilen in Abschnitt 10 — die
> Projekte `Mobile` (Pixel 7) / `Tablet` (iPad Mini) sind in `playwright.config.ts`
> verifiziert vorhanden.

## 0. TL;DR

> **Revisionshinweis (diese Fassung):** Die vorige Fassung hatte den in
> `durchgestrichen-req.md` als **„höchste Priorität"** gekennzeichneten Defekt
> (Grenzfall 15 / Risiko 11 — der Button ist per Tastatur vermutlich nicht auslösbar)
> **komplett ausgelassen**: kein Fix, kein Test, keine Erwähnung in TL;DR/Abnahme-
> Mapping, obwohl die Anforderung ihn als **eigenständiges** Abnahmekriterium (DoD 7)
> führt, das nicht implizit über die `.click()`-Testfälle 1–17 als „miterledigt" gelten
> darf. Diese Fassung ergänzt Fix + Tests (neuer Abschnitt 3.6a) und die fehlende
> DoD-7-Zeile in Abschnitt 10. Zusätzlich neu: Abschnitt 3.6b deckt eine **verifizierte
> Drei-Wege-Kollision** mit `specs/fett-code.md` und `specs/kursiv-code.md` auf, die
> beide **dieselbe** geteilte Datei (`Toolbar.tsx`/`commands.ts`) mit **unterschiedlichen**
> Funktionsnamen/-semantiken für den Aktiv-Zustand ändern wollen — muss vor der
> Umsetzung irgendeines der drei Pläne geklärt werden, sonst committet der zweite/dritte
> Plan gegen eine bereits gelandete, abweichende Funktion.

Schema-Mark `strike`, Toolbar-Button, DOCX-/ODT-Reader/Writer für „Durchgestrichen"
existieren und funktionieren im Kern. Die Anforderung benennt **vier echte, im Code
bestätigte Defekte/Lücken**, davon einer mit „höchster Priorität":

1. **`src/formats/shared/editor/Toolbar.tsx:76–79`** (`MarkButton`) — es ist
   **ausschließlich** `onMouseDown` gebunden, **kein** `onClick`, **kein** `onKeyDown`.
   Ein natives `<button>` feuert bei Tastatur-Aktivierung (Tab-Fokus + Enter/Leertaste)
   laut HTML-Spezifikation **kein** `mousedown`, sondern nur `click` — der Button ist
   damit vermutlich **nur per Maus/Touch bedienbar, nicht per Tastatur** (WCAG-2.1.1-
   Verstoß). **Höchste Priorität** (Grenzfall 15 / Risiko 11 / DoD 7 — als
   „eigenständiges Abnahmekriterium" markiert, nicht optional). Betrifft alle vier
   Buttons (F/K/U/S). **Wird gefixt** (Abschnitt 3.6a) — **Kollision mit
   `fett-code.md` Defekt A**, siehe Abschnitt 3.6b.
2. **`src/formats/docx/reader.ts:107`** — `<w:strike>` wird unabhängig von `w:val`
   als „durchgestrichen" gewertet. Import von `<w:strike w:val="0"/>` (geerbte
   Durchstreichung lokal ausgeschaltet) markiert Text fälschlich als durchgestrichen.
   **Echter Bug, wird gefixt** (Grenzfall 1 / Risiko 1). Das Vorbild steht eine Zeile
   höher: Unterstrichen guardt bereits `val !== 'none'` (`reader.ts:105–106`).
3. **`src/formats/shared/editor/Toolbar.tsx:69`** (`MarkButton`) — `active`/
   `aria-pressed` wird ausschließlich aus `selection.$from.marks()` berechnet,
   ignoriert `storedMarks` (leere Schreibmarke) **und** den Rest einer mehrteiligen
   Selektion. Betrifft **alle vier** Buttons (F/K/U/S), da sie dieselbe Komponente
   teilen. **Wird gefixt** (Grenzfälle 11/12 · Risiko 3) mit dokumentierter Anzeige-
   Konvention — **Kollision mit `fett-code.md` Defekt B und `kursiv-code.md`
   Abschnitt 4.1**, siehe Abschnitt 3.6b (nicht ignorierbar: alle drei Pläne ändern
   dieselbe Funktion in derselben Datei).
4. **`src/formats/shared/editor/WordEditor.tsx`** (Keymap, `85–107`) — kein
   Tastenkürzel für Durchgestrichen, obwohl F/K/U je eines haben (`98–100`). Die
   Anforderung 3.6 verlangt eine **getroffene, umgesetzte** Entscheidung.
   **Entscheidung: `Mod-Shift-x` wird ergänzt** (aktuell unbelegt).

Zusätzlich beim Audit gefunden, **nicht** in der Anforderungstabelle erwähnt:

5. **`src/formats/docx/writer.ts:20–33`** (`runPropertiesXml`) — die Reihenfolge der
   erzeugten `<w:rPr>`-Kindelemente folgt der Reihenfolge des `marks`-Arrays
   (praktisch immer `b, i, u, strike, color, shd`), **nicht** der von ECMA-376
   (§17.3.2.28, `EG_RPrBase`, `xsd:sequence`) vorgeschriebenen. Reine
   Schema-Konformitäts-Härtung — **optional**, siehe Abschnitt 3.2, wo auch die
   **korrekte** Zielreihenfolge hergeleitet wird (`b, i, strike, color, u, shd`; die
   frühere Planfassung hatte sie falsch).
6. **Drei unabhängige, sich widersprechende Pläne für dieselbe geteilte Funktion**
   (`fett-code.md` Abschnitt 4.1 `isMarkActive`, `kursiv-code.md` Abschnitt 4.1
   `isMarkActive` mit abweichendem Rumpf, diese Datei Abschnitt 3.6 `markActive`) —
   `kursiv-code.md` Abschnitt 9 dokumentiert die Kollision bereits **zwischen sich und
   `fett-code.md`**, ohne diese Datei zu kennen. Siehe Abschnitt 3.6b für die
   Einordnung und Handlungsempfehlung.

Alle übrigen in Abschnitt 4/6 der Anforderung benannten Grenzfälle/Risiken sind
**keine Bugs**, sondern entweder bereits korrektes Bibliotheksverhalten (nur Test
nötig) oder bewusste, zu dokumentierende Fallback-Entscheidungen. Der weit
überwiegende Aufwand ist **neue Testabdeckung**: gezielte Reader-Unit-Tests für
Fremddatei-Grenzfälle (inkl. drei realer ODT-Fixtures aus dem vorhandenen Korpus),
Erweiterung beider `roundtrip.test.ts` und beider `external-validation.test.ts` sowie
ein komplett neuer E2E-Test über echte Browser-Bedienung (Toolbar **und** Re-Import).

---

## 1. Methodik dieser Prüfung

Direkt gelesen (aktueller Stand): `src/formats/shared/schema.ts`,
`src/formats/shared/editor/{Toolbar.tsx,WordEditor.tsx,commands.ts}`,
`src/formats/docx/{reader.ts,writer.ts}`, `src/formats/odt/{reader.ts,writer.ts,
styleRegistry.ts}`, `src/formats/docx/__tests__/{roundtrip,external-validation}.test.ts`,
`src/formats/odt/__tests__/external-validation.test.ts`,
`src/formats/shared/editor/__tests__/commands.test.ts`, `src/index.css`,
`tests/e2e/{docx,odt,selection-regression,clipboard-roundtrip}.spec.ts`. Der
Fixture-Korpus `tests/fixtures/external/odt` (202 Dateien) wurde programmatisch nach
`text-line-through-style` durchsucht und die Treffer-Dateien im Detail entpackt
(Stilnamen, `type`, umschlossener Text) — siehe Abschnitt 6; die dort genannten
Werte (`T11`/`T12`/`T13`, „Lorem ipsum"/„lor sit ") sind **verifiziert, nicht
angenommen**. Das Verhalten von `prosemirror-commands` `toggleMark` (Entfernen, wenn
die Mark *irgendwo* im Bereich vorkommt) und `prosemirror-model` `Node.rangeHasMark`
wurde als Grundlage für die Anzeige-Konvention (3.6) herangezogen.

Zusätzlich in dieser Revision: `specs/fett-code.md` und `specs/kursiv-code.md`
gegengelesen, weil beide **denselben** geteilten Code (`Toolbar.tsx` `MarkButton`,
`commands.ts`) ändern wollen, den auch diese Datei anfasst. Ergebnis: eine reale,
bisher unbemerkte Drei-Wege-Kollision (Abschnitt 3.6b) sowie ein in `durchgestrichen-
req.md` als „höchste Priorität" markierter Defekt (Tastatur-Aktivierung, Grenzfall 15 /
Risiko 11), der in der vorigen Fassung dieses Plans komplett fehlte (siehe
Revisionshinweis in Abschnitt 0).

---

## 2. Ist-Zustand nach Codelektüre — Abgleich mit der Anforderungstabelle

Alle in `durchgestrichen-req.md` Abschnitt 1.1 genannten Fundstellen wurden am
aktuellen Code **bestätigt** (die Anforderungsdatei ist zeilengenau aktuell):

| Fundstelle (aktuell) | Verifiziert | Abweichung? |
|---|---|---|
| `schema.ts:176–181` Mark `strike`, `parseDOM: [{tag:'s'},{tag:'strike'},{style:'text-decoration=line-through'}]`, `toDOM → ['s',0]` | ja, exakt | keine |
| `Toolbar.tsx:187` `MarkButton mark="strike" label="S" title="Durchgestrichen" glyphClassName="line-through"` | ja, exakt | keine |
| `Toolbar.tsx:69` `active = markType.isInSet(view.state.selection.$from.marks()) !== undefined` | ja, exakt | **Bug**, siehe 3.6 |
| `WordEditor.tsx:98–100` Keymap `Mod-b/-i/-u`, **kein** Strike-Eintrag | ja | fehlt, siehe 3.5 |
| `docx/reader.ts:107` `if (firstChildNS(rPr, w, 'strike')) marks.push({type:'strike'})` — nur Existenz | ja, exakt | **Bug**, siehe 3.1 |
| `docx/reader.ts:105–106` Unterstrichen mit `val !== 'none'`-Guard | ja | Vorbild für den Fix 3.1 |
| `docx/writer.ts:26` `if (mark.type === 'strike') props.push('<w:strike/>')`, kein `w:val` | ja | inhaltlich korrekt; Reihenfolge siehe 3.2 |
| `odt/reader.ts:56–57` `text-line-through-style !== 'none'` ⇒ `style.strike`; `:108` Mark setzen | ja, exakt | korrekt f. Grenzfall 2; ignoriert `type`, siehe 3.3 |
| `odt/writer.ts:38` `props.strike = true` + `odt/styleRegistry.ts:55` `style:text-line-through-style="solid" style:text-line-through-type="single"` | ja, exakt | keine |
| Unit-Roundtrips: nur Writer→eigener-Reader, `strike` nur isoliert; Kombitest nur `strong`+`em` (`docx/__tests__/roundtrip.test.ts:63–84` bzw. `86–98`) | ja | Lücke, siehe 5.1 |
| E2E-Button-Klick vorhanden (`clipboard-roundtrip.spec.ts` R-7, `:204–211/252`), aber DOCX-only, kein Re-Import, WebKit-Skip | ja | Lücke, siehe 5.2 |
| E2E-Import-Render aus Voll-Fixture (`docx.spec.ts:302`, `odt.spec.ts:278`, Fixture `fullCoverageDocument.ts:119/177`) | ja | bleibt grün |
| `docx/__tests__/external-validation.test.ts` (mammoth) — assertiert Strike **nicht**; `odt/__tests__/external-validation.test.ts:66` — Strike-Lauf enthalten, aber **nicht** gezielt geprüft | ja | Lücke, siehe 5.3 |

Zusätzlich beim Audit gefunden, **nicht** in der Anforderungstabelle:

- `docx/writer.ts:20–33` `runPropertiesXml`: Elementreihenfolge folgt nicht der
  `EG_RPrBase`-Sequenz — Abschnitt 3.2 (TL;DR 4). Optional.
- `docx/reader.ts` liest `<w:dstrike>` (doppelt) **nirgends** — bereits der
  gewünschte Fallback, aber **unkommentiert und ungetestet** — Abschnitt 3.3.
- `src/formats/shared/editor/__tests__/commands.test.ts` **existiert bereits**
  (Tests für `canCut`/`cutSelection`, 106 Zeilen). Der `markActive`-Test aus 5.1 ist
  daher eine **Erweiterung**, keine neue Datei.

---

## 3. Gefundene Defekte / Verbesserungen im bestehenden Code

### 3.1 `src/formats/docx/reader.ts` — `w:val` von `<w:strike>` wird ignoriert (Bug)

Aktuell (Zeile 107, innerhalb `marksFromRunProperties`, 100–115):

```ts
if (firstChildNS(rPr, OOXML_NAMESPACES.w, 'strike')) marks.push({ type: 'strike' })
```

`w:strike` ist laut ECMA-376 `CT_OnOff`: `w:val` kann `true/1/on` **oder**
`false/0/off` sein; fehlt `w:val`, gilt **an** (Default). Der aktuelle Code prüft nur
die Existenz des Elements. Eine reale Word-Datei, die eine geerbte Durchstreichung
lokal mit `<w:strike w:val="0"/>` ausschaltet, wird fälschlich als durchgestrichen
importiert — Grenzfall 1 / Risiko 1. Der Fix hat sein Vorbild **eine Zeile höher**
(Unterstrichen, 105–106: `underline.getAttributeNS(w,'val') !== 'none'`).

Neuer Helfer (nahe `firstChildNS`, ~Zeile 20–22) und Anwendung:

```ts
/** ECMA-376 `CT_OnOff`: fehlt `val` ⇒ an; `false`/`0`/`off` (bel. Schreibweise) ⇒
 * aus; alles andere ⇒ an. Gilt für `w:strike` und — gleicher Typ — auch `w:b`/`w:i`. */
function isOnOffEnabled(el: Element | null): boolean {
  if (!el) return false
  const val = el.getAttributeNS(OOXML_NAMESPACES.w, 'val')
  if (val === null) return true
  const v = val.trim().toLowerCase()
  return v !== 'false' && v !== '0' && v !== 'off'
}
```

```ts
// Zeile 107 wird zu:
if (isOnOffEnabled(firstChildNS(rPr, OOXML_NAMESPACES.w, 'strike'))) marks.push({ type: 'strike' })
```

**Rückwärtskompatibilität:** Unser eigener Writer schreibt `<w:strike/>` **ohne**
`val` → `val === null` → weiterhin „an". Alle bestehenden Roundtrip-/E2E-Tests
bleiben grün.

**Empfehlung (optional, gleicher Codepfad):** `w:b`/`w:i` (Zeile 103–104) sind
ebenfalls `CT_OnOff` und haben denselben Blindfleck (`<w:b w:val="0"/>` würde heute
fälschlich als „fett" gelesen). Da `isOnOffEnabled` ohnehin entsteht, spricht nichts
dagegen, es im selben Commit auch dort einzusetzen. Kein Bestandteil der
Abnahmekriterien dieses Plans.

Zusätzlich ein Klarstellungs-Kommentar oberhalb der `strike`-Zeile, dass
`<w:dstrike>` (doppelt) bewusst nicht ausgewertet wird — siehe 3.3.

### 3.2 `src/formats/docx/writer.ts` — `<w:rPr>`-Elementreihenfolge (optionaler Fund)

`runPropertiesXml` (20–33) iteriert über das `marks`-Array in Ankunftsreihenfolge.
Weil `prosemirror-model` Marks beim Anwenden nach Schema-Rang einsortiert
(`strong, em, underline, strike, textColor, highlight` gemäß `schema.ts:157–196`),
lautet das erzeugte XML praktisch **immer** `b, i, u, strike, color, shd`. ECMA-376
§17.3.2.28 (`EG_RPrBase`) schreibt `<w:rPr>` jedoch als **geordnete** `xsd:sequence`
vor. Die Positionen der sechs von uns erzeugten Elemente in dieser Sequenz sind:

| Mark | Element | Position in `EG_RPrBase` |
|---|---|---|
| `strong` | `<w:b>` | 3 |
| `em` | `<w:i>` | 5 |
| `strike` | `<w:strike>` | 9 |
| `textColor` | `<w:color>` | 19 |
| `underline` | `<w:u>` | 27 |
| `highlight` | `<w:shd>` | 30 |

Daraus folgt die **korrekte** Zielreihenfolge `b, i, strike, color, u, shd`.
**Wichtig:** Highlight wird als `<w:shd>` (Element `shd`, Position 30) geschrieben —
also **nach** `<w:u>` (27). Die frühere Planfassung ordnete `shd` vor `u` an; das war
falsch. Korrigierter Fix:

```ts
function runPropertiesXml(marks: JsonNode['marks']): string {
  const byType = new Map((marks ?? []).map((m) => [m.type, m] as const))
  const props: string[] = []
  // Reihenfolge = ECMA-376 EG_RPrBase (§17.3.2.28), NICHT die marks-Array-Reihenfolge.
  // Highlight wird als <w:shd> emittiert (Sequenzposition NACH <w:u>) -> u vor shd.
  // Siehe durchgestrichen-code.md Abschnitt 3.2.
  if (byType.has('strong')) props.push('<w:b/>')
  if (byType.has('em')) props.push('<w:i/>')
  if (byType.has('strike')) props.push('<w:strike/>')
  const textColor = byType.get('textColor')
  if (textColor) props.push(`<w:color w:val="${String(textColor.attrs?.color ?? '').replace('#', '')}"/>`)
  if (byType.has('underline')) props.push('<w:u w:val="single"/>')
  const highlight = byType.get('highlight')
  if (highlight) props.push(`<w:shd w:val="clear" w:color="auto" w:fill="${String(highlight.attrs?.color ?? '').replace('#', '')}"/>`)
  return props.length ? `<w:rPr>${props.join('')}</w:rPr>` : ''
}
```

**Ehrliche Einordnung / Risiko:** Der in der Suite verwendete unabhängige
DOCX-Parser (`mammoth`) prüft die Elementreihenfolge **nicht**; der eigene Reader
liest ordnungsunabhängig (per Namespace+Lokalname). Es gibt also aktuell **keinen**
automatisierten Test, der die falsche Reihenfolge fängt — die Änderung ist reine
Härtung für strikte Validatoren (Open-XML-SDK-Validator), die dieses Repo nicht
einbindet. Damit der Fix nicht ungeprüft bleibt, wird in `strike.test.ts` (5.1) eine
kleine String-Positions-Assertion auf `word/document.xml` ergänzt
(`indexOf('<w:strike/>') < indexOf('<w:color') < indexOf('<w:u ')`). Wer die
zusätzliche Streubreite auf **alle** Marks vermeiden will, kann diesen Punkt zurück-
stellen — er ist als **optional** markiert (nicht Teil der Abnahmekriterien 8).

### 3.3 Doppelte Durchstreichung (`w:dstrike` / `text-line-through-type="double"`) — bewusster Fallback, keine Verhaltensänderung

Bestätigt durch Codelesen **und** reale Fixtures (Abschnitt 6):

- **DOCX:** `marksFromRunProperties` fragt nirgends nach `<w:dstrike>`. Ein Lauf mit
  **nur** `<w:dstrike/>` landet als „nicht durchgestrichen" — kein Absturz, kein
  Textverlust, nur das Attribut geht verloren.
- **ODT:** `parseAutomaticStyles` (`reader.ts:56–57`) liest nur
  `text-line-through-style` (`solid`/`none`), nie `text-line-through-type`
  (`single`/`double`). Datei mit `…style="solid" …type="double"` (reale Fixture
  `character-styles.odt`, Stil `T12`, Text „Lorem ipsum") wird **wie einfach**
  durchgestrichen gelesen — an echter Datei bestätigt, nicht spekuliert.

**Entscheidung (verbindlich, Grenzfall 3):** Beide Fallbacks bleiben. „Doppelt
durchgestrichen" ist laut `FEATURE-BACKLOG.md` ein **eigenes** Feature
(`durchgestrichen-doppelt`, Status „fehlt"); Fallback auf „einfach" ist das
gewünschte, konsistente Zielverhalten für **beide** Formate (statt beim DOCX-Fall
die Durchstreichung ganz zu verlieren). Kein neues Schema-Attribut/keine neue Mark.
Umzusetzen:

1. Klarstellende Code-Kommentare an **beiden** Stellen (statt stillschweigend). In
   `odt/reader.ts` direkt über Zeile 56:

   ```ts
   // Durchgestrichen (durchgestrichen-req.md Grenzfall 3 / Risiko 2):
   // `text-line-through-type` ("single" vs. "double") wird bewusst NICHT gelesen.
   // `durchgestrichen-doppelt` ist laut FEATURE-BACKLOG.md nicht im Funktionsumfang;
   // jeder Wert != "none" kollabiert absichtlich auf die einfache `strike`-Mark.
   // Kein Textverlust, kein Absturz - dokumentierter Fallback (code.md Abschnitt 3.3).
   ```

   und analog in `docx/reader.ts` über der `strike`-Zeile für `<w:dstrike>`.
2. Dedizierte Tests, die dieses Verhalten **feststellen und einfrieren** (5.1), inkl.
   der realen ODT-`double`-Fixture.

### 3.4 Reihenfolge-Unabhängigkeit beim Kombinieren (Anforderung 3.4) — bereits erfüllt, nur Test nötig

Anforderung 3.4 verlangt, dass „erst Fett dann Durchgestrichen" dasselbe Ergebnis
liefert wie umgekehrt. `prosemirror-model` ordnet Marks beim Hinzufügen stets nach
Schema-Rang ein, unabhängig von der Klickreihenfolge. Keine der sechs Marks hat ein
`excludes` (in `schema.ts:157–196` ist keine `excludes`-Eigenschaft definiert), sie
verdrängen sich also nicht. **Keine Codeänderung**, nur ein Test, der das nachweist
(5.1).

### 3.5 `src/formats/shared/editor/WordEditor.tsx` — Tastenkürzel (Entscheidung, Anforderung 3.6)

**Entscheidung: `Mod-Shift-x` wird ergänzt.** Begründung: Analogie zu `Mod-b/-i/-u`
(Zeile 98–100) und verbreitete Konvention (Google Docs, Slack, Notion) — von der
Anforderung selbst als „gängiger Kandidat" genannt. `Mod-Shift-x` ist aktuell
unbelegt; kollidiert nicht mit `Mod-z`/`Mod-y`/`Mod-Shift-z` (Redo, Zeile 93–95),
`Enter`/`Shift-Enter` (96–97), `Mod-b/-i/-u` oder `Shift-Delete` (106) und **nicht**
mit dem bewusst nativen Clipboard-Pfad (`Mod-c/x/v` sind ungebunden, Kommentar 86–92).
Änderung in der Keymap (85–107):

```ts
'Mod-b': toggleMark(wordSchema.marks.strong),
'Mod-i': toggleMark(wordSchema.marks.em),
'Mod-u': toggleMark(wordSchema.marks.underline),
// Durchgestrichen (durchgestrichen-req.md Abschnitt 3.6): bewusst entschiedenes
// Tastenkuerzel, analog zu Mod-b/-i/-u und zu Ctrl/Cmd+Shift+X in Google Docs/
// Slack/Notion. Zuvor unbelegt - siehe Abnahmekriterium 5 der Anforderung.
'Mod-Shift-x': toggleMark(wordSchema.marks.strike),
```

Der Toolbar-`title="Durchgestrichen"` (Toolbar.tsx:187) bleibt unverändert (kein
`"(Strg+Umschalt+X)"`-Zusatz) — minimal-invasiv; `getByTitle('Durchgestrichen')`
bleibt unberührt.

### 3.6 `src/formats/shared/editor/Toolbar.tsx` — Aktiv-Zustand nur aus `$from.marks()` (Grenzfälle 11/12)

Aktuell (Zeile 69, in `MarkButton`, 55–89):

```ts
const active = markType.isInSet(view.state.selection.$from.marks()) !== undefined
```

Zwei Defizite:

- **Grenzfall 12 (`storedMarks`):** Nach „Durchgestrichen" an leerem Cursor ist die
  Mark in `state.storedMarks` vorgemerkt, aber (noch) nicht in `$from.marks()` → der
  Button zeigt „inaktiv", obwohl das nächste getippte Zeichen durchgestrichen wird.
- **Grenzfall 11 (mehrteilige Selektion):** Nur `$from` (Anfang) wird betrachtet. Bei
  einer Selektion, die **hinten** durchgestrichen ist, `$from` aber normal, zeigt der
  Button „inaktiv", obwohl `toggleMark` (Default: entfernen, sobald die Mark
  **irgendwo** im Bereich vorkommt) de facto **die gesamte Selektion entfernt**.

**Entscheidung (verbindliche Anzeige-Konvention):** `aria-pressed` bildet genau die
Bedingung ab, die einen Klick zum **Entfernen** veranlasst — „Mark kommt irgendwo im
selektierten Bereich vor" (dieselbe Semantik wie `toggleMark`s Default). So zeigt der
Button immer an, was ein Klick als Nächstes tut: „aktiv" ⇒ Klick entfernt aus der
gesamten Selektion; „inaktiv" ⇒ Klick wendet auf die gesamte Selektion an. Die
Alternative („nur aktiv, wenn *überall* vorhanden") würde den schlimmeren Widerspruch
erzeugen, „inaktiv" anzuzeigen, während ein Klick trotzdem entfernt.

Neuer, wiederverwendbarer Helper in `src/formats/shared/editor/commands.ts` (die
Datei importiert bereits `EditorState`; `MarkType` aus `prosemirror-model` ergänzen):

```ts
import type { Command, EditorState } from 'prosemirror-state'
import type { MarkType } from 'prosemirror-model'

/**
 * Ob `markType` im Toolbar-Button als "aktiv" gezeigt werden soll.
 * Leere Selektion (Cursor): reflektiert `storedMarks` (an der Schreibmarke
 * vorgemerkt, noch nicht getippt) bzw. die Marks an der Schreibmarke -> Grenzfall 12.
 * Nicht-leere Selektion: aktiv, wenn die Mark *irgendwo* im Bereich vorkommt
 * (`rangeHasMark` ueber jede `selection.ranges` - dieselbe Pro-Range-Definition, die
 * `toggleMark`s Default-Entfernen verwendet). Deckt CellSelection automatisch mit ab
 * (mehrere ranges). Siehe durchgestrichen-code.md Abschnitt 3.6 / Grenzfaelle 11/12.
 */
export function markActive(state: EditorState, markType: MarkType): boolean {
  const { $from, empty, ranges } = state.selection
  if (empty) return !!markType.isInSet(state.storedMarks || $from.marks())
  return ranges.some(({ $from: rf, $to: rt }) => state.doc.rangeHasMark(rf.pos, rt.pos, markType))
}
```

`Toolbar.tsx` — Import aus `./commands` um `markActive` ergänzen und Zeile 69
ersetzen:

```ts
const markType = wordSchema.marks[mark]
const active = markActive(view.state, markType)
```

Der Toggle-Aufruf selbst wandert dabei von `onMouseDown` nach `onClick` — siehe
3.6a, das denselben `MarkButton`-Codeblock anfasst; `aria-pressed={active}` bleibt
unverändert. Da `WordEditor.tsx` nach jeder Transaktion `forceRender` auslöst
(dispatchTransaction, 117–124), aktualisiert sich die Anzeige sofort bei
Cursorbewegung. Betrifft **alle vier** Buttons gleich — bewusste, dokumentierte
Konsistenzverbesserung, kein Toggle-*Verhalten* wird geändert (nur *wann* getoggelt
wird, siehe 3.6a, und *wie die Anzeige berechnet* wird, hier).

### 3.6a `src/formats/shared/editor/Toolbar.tsx` — Button per Tastatur nicht auslösbar (Grenzfall 15 / Risiko 11, **höchste Priorität**)

**Verifiziert am aktuellen Code** (`MarkButton`, Zeile 55–89):

```tsx
<button
  type="button"
  title={title}
  aria-label={title}
  aria-pressed={active}
  onMouseDown={(e) => {
    e.preventDefault()
    run(view, toggleMark(markType))
  }}
  ...
>
```

Es existiert **ausschließlich** `onMouseDown` — kein `onClick`, kein `onKeyDown`. Nach
HTML-Spezifikation löst ein natives `<button>` bei Tastatur-Aktivierung (Enter-Keydown
bzw. Leertaste-Keyup, während der Button per Tab fokussiert ist) **kein**
`mousedown`-Event aus, sondern ausschließlich ein synthetisches `click`. Der
Umschalt-Handler hängt aber an `mousedown`, nicht an `click` → ein rein
tastaturgestützter Nutzer (Tab zum Button, dann Enter/Leertaste, ohne Maus/Touch) kann
„Durchgestrichen" darüber vermutlich **nicht** auslösen. Der Editor selbst bleibt über
`Mod-Shift-x` (3.5) tastaturbedienbar, aber **der Button** wäre für Tab-Navigation
funktionslos — ein WCAG-2.1.1-Verstoß und ein in der Anforderung als „höchste
Priorität" markiertes, **eigenständiges** Abnahmekriterium (DoD 7), das **nicht**
implizit über die `.click()`-lastigen Testfälle 1–17 als erledigt gelten darf (die
Anforderung sagt das ausdrücklich).

**Fix (Standardmuster, von der Anforderung selbst vorgeschlagen, Grenzfall 15 letzter
Satz):** Toggle-Logik von `onMouseDown` nach `onClick` verlagern; `onMouseDown` behält
nur `e.preventDefault()` (verhindert Fokus-/Selektionsverlust im Editor bei
Maus-Bedienung — das ist der einzige Zweck, den `onMouseDown` je hatte, siehe
`WordEditor.tsx`s Reconciliation-Kommentar zum selben Thema). `click` feuert
zuverlässig für **alle drei** Eingabewege — Maus (nach `mousedown`→`mouseup` auf
demselben Element), Tastatur (Enter/Leertaste auf fokussiertem `<button>`) und Touch
(nach `touchend`, moderne Browser ohne 300-ms-Delay dank `touch-action`) — jeweils
**genau einmal**, kein Doppel-Toggle:

```tsx
function MarkButton({ view, mark, label, title, glyphClassName = '' }: { ... }) {
  const markType = wordSchema.marks[mark]
  const active = markActive(view.state, markType)
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onMouseDown={(e) => {
        // NUR Fokus-/Selektionsschutz fuer Maus-Bedienung - der eigentliche Toggle
        // laeuft ueber onClick (s.u.), damit Tab+Enter/Leertaste (Tastatur) und Tap
        // (Touch) denselben Codepfad wie ein Mausklick durchlaufen.
        // durchgestrichen-req.md Grenzfall 15 / Risiko 11 (hoechste Prioritaet).
        e.preventDefault()
      }}
      onClick={() => run(view, toggleMark(markType))}
      className={...}
    >
      <span className={glyphClassName}>{label}</span>
    </button>
  )
}
```

**Nebenbefund, dokumentiert (außerhalb Scope dieser Datei):** `AlignButton`
(`Toolbar.tsx:91–111`), die Listen-Buttons (`241–273`) und Tabelle/Bild (`277–294`)
tragen denselben `onMouseDown`-only-Mangel. Sie sind **nicht** Gegenstand von
„Durchgestrichen", aber derselbe Barrierefreiheits-Befund gilt dort strukturell
identisch — für ein künftiges, eigenes Ticket vermerkt (deckungsgleich mit
`fett-code.md` Abschnitt 2.1 „Nebenbefund").

**Kompatibilität mit bestehenden Tests:** Alle vorhandenen E2E-Tests, die
`getByTitle(...).click()` verwenden (`selection-regression.spec.ts`,
`clipboard-roundtrip.spec.ts` R-7, `docx.spec.ts`/`odt.spec.ts`), bleiben grün — Playwrights
`.click()` löst die volle `mousedown → mouseup → click`-Sequenz aus, und die
Reconciliation-Listener in `WordEditor.tsx` (`onMouseDown`/`onMouseUp` auf `view.dom`,
nicht auf dem Button) interferieren nicht mit dem Button-eigenen `onMouseDown`.

### 3.6b Cross-Spec-Kollision: drei Pläne ändern dieselbe Funktion in derselben Datei — **muss vor Umsetzung geklärt werden**

Beim Gegenlesen der Geschwister-Pläne (Abschnitt 1) bestätigt: **drei** unabhängig
geschriebene `-code.md`-Pläne wollen `Toolbar.tsx`/`commands.ts` — denselben
`MarkButton`, dieselbe Aktiv-Zustand-Berechnung — mit **unterschiedlichem** Namen
**und** unterschiedlicher Semantik ändern:

| Plan | Funktionsname | Leere Selektion | Nicht-leere Selektion |
|---|---|---|---|
| `fett-code.md` Abschnitt 4.1 (Defekt B) | `isMarkActive` | `state.storedMarks ?? $from.marks()` | **Volldeckung**: aktiv nur, wenn **jede** Textstelle im Bereich das Mark trägt (`nodesBetween`, kein `selection.ranges`) |
| `kursiv-code.md` Abschnitt 4.1 | `isMarkActive` (**derselbe Name, anderer Rumpf**) | `state.storedMarks \|\| $from.marks()` | **Volldeckung**, aber über `selection.ranges` iteriert (deckt `CellSelection` mit ab) — laut `kursiv-code.md` Abschnitt 9 die „allgemeinere" Variante, die die `fett`-Fälle mitdeckt |
| **diese Datei**, Abschnitt 3.6 | `markActive` | `state.storedMarks \|\| $from.marks()` | **„Irgendwo"**: aktiv, sobald **eine** Textstelle im Bereich das Mark trägt (`ranges.some(rangeHasMark)`) — bewusst identisch zu `toggleMark`s eigener Entfernen-Bedingung |

`kursiv-code.md` Abschnitt 9 dokumentiert bereits eine „Kollisionswarnung" **zwischen
sich und `fett-code.md`** („beide Definitionen dürfen nicht nebeneinander landen") —
aber **ohne** diese Datei zu kennen, die eine **dritte**, semantisch abweichende
Variante vorschlägt. Da `MarkButton` eine einzige, geteilte Komponente ist (F/K/U/S),
können nicht alle drei Pläne unverändert nebeneinander umgesetzt werden — der zuerst
committete Plan legt de facto die Funktion fest, jeder folgende Plan würde entweder
einen Merge-Konflikt mit widersprüchlicher Semantik erzeugen oder eine zweite,
verwirrende Parallel-Funktion einführen.

**Fachliche Einordnung (nicht nur Formalie):** Die „Volldeckung"-Variante
(`fett`/`kursiv`) und die „Irgendwo"-Variante (diese Datei) sind **keine**
austauschbaren Stilfragen, sondern führen zu unterschiedlichem, jeweils in sich
konsistentem, aber gegenseitig widersprüchlichem Nutzer-sichtbarem Verhalten bei
gemischter Selektion:

- **„Irgendwo"** (diese Datei, 3.6): `aria-pressed` zeigt exakt das, was ein Klick als
  Nächstes tut, weil es `toggleMark`s tatsächliche Entfernen-Bedingung
  (`rangeHasMark`, verifiziert im `prosemirror-commands`-Quellcode: `has =
  doc.rangeHasMark(...)`, dann `has ? removeMark : addMark` über die **gesamte**
  Range) exakt widerspiegelt.
- **„Volldeckung"** (`fett`/`kursiv`): `aria-pressed` kann bei gemischter Selektion
  „inaktiv" zeigen, **während ein Klick trotzdem die gesamte Selektion entfernt**
  (weil `toggleMark` „irgendwo" prüft, nicht „überall") — genau der Widerspruch, den
  `durchgestrichen-req.md` Grenzfall 11 explizit als „schlimmeren" Fall benennt und
  ausschließen will.

**Empfehlung dieses Plans:** Die „Irgendwo"-Semantik ist die technisch korrektere, weil
sie tatsächlich beschreibt, was ein Klick bewirkt — nicht nur eine Stilfrage. Da dies
aber **eine einzige**, repo-weite Entscheidung für vier Buttons ist, die drei Feature-
Teams/Pläne unabhängig getroffen haben, gehört die endgültige Festlegung **nicht**
mehr in einen einzelnen Feature-Code-Plan, sondern muss zentral (Leiter/PO im
Bible-Prozess, siehe `projektbibel.md`) entschieden und dann **einmalig** in
`commands.ts` umgesetzt werden — mit **einem** Funktionsnamen (Empfehlung:
`isMarkActive`, um den bereits in zwei Plänen etablierten Namen nicht zusätzlich zu
fragmentieren) und **einer** Semantik. Bis diese Entscheidung getroffen ist:

1. Diese Datei implementiert **ihre eigene** Funktion vorerst weiter unter dem Namen
   `markActive` (nicht `isMarkActive`), damit sie **nicht** unbeabsichtigt exakt den
   Namen einer möglicherweise bereits mit anderer Semantik gelandeten Funktion
   claimt/überschreibt — ein Name-Clash beim Merge ist offensichtlicher (Compile-
   Fehler durch doppelten Export) als ein still unterschiedliches Verhalten hinter
   demselben Namen.
2. Wer diesen Plan tatsächlich umsetzt, **muss** vorher in `commands.ts` prüfen, ob
   `isMarkActive` bereits existiert (aus `fett`/`kursiv`). Falls ja: **keine** zweite
   Funktion einführen, sondern (a) die dortige Semantik für Durchgestrichen
   übernehmen und die Tests aus Abschnitt 5.1 auf „Volldeckung" umschreiben, **oder**
   (b) diese Kollision aktiv an Leiter/PO eskalieren, bevor Code committet wird.
3. Die Unit-Tests in 5.1 sind unten für **beide** Semantiken kommentiert, damit ein
   Wechsel keine Testarchitektur-Änderung erfordert, nur andere Erwartungswerte in den
   beiden „gemischte Selektion"-Fällen.

---

## 4. Dateigenauer Änderungsplan — bestehende Dateien

| # | Datei | Änderung | Typ |
|---|---|---|---|
| 1 | `src/formats/shared/editor/Toolbar.tsx` | `MarkButton`: Toggle von `onMouseDown` nach `onClick` verlagern, `onMouseDown` nur noch `e.preventDefault()` (3.6a, **höchste Priorität**, Grenzfall 15/Risiko 11) | Fix |
| 2 | `src/formats/docx/reader.ts` | `isOnOffEnabled`-Helper + Anwendung auf `<w:strike>` (3.1); Kommentar zu bewusst nicht gelesenem `<w:dstrike>` (3.3) | Fix + Doku |
| 3 | `src/formats/shared/editor/commands.ts` | neuer Export `markActive(state, markType)` + `MarkType`-Import (3.6) — **vorbehaltlich Cross-Spec-Klärung, siehe 3.6b** | Neu (Funktion) |
| 4 | `src/formats/shared/editor/Toolbar.tsx` | `MarkButton`: Zeile 69 auf `markActive(...)` umstellen, Import ergänzen (3.6) | Fix |
| 5 | `src/formats/shared/editor/WordEditor.tsx` | Keymap-Zeile `'Mod-Shift-x': toggleMark(wordSchema.marks.strike)` + Kommentar (3.5) | Neu (Zeile) |
| 6 | `src/formats/odt/reader.ts` | Kommentar zu bewusst nicht gelesenem `text-line-through-type` (3.3) | Doku |
| 7 | `src/formats/docx/writer.ts` | **optional:** `runPropertiesXml` auf feste `EG_RPrBase`-Reihenfolge (3.2) | Optionaler Fix |
| 8 | `src/formats/shared/schema.ts` | **keine** Änderung — Mark `strike` (176–181) korrekt | — |
| 9 | `src/formats/odt/writer.ts` / `odt/styleRegistry.ts` | **keine** Änderung — Ausgabe (`solid`/`single`) korrekt | — |

**Keine neue Toggle-Command-Abstraktion:** Toolbar und Keymap rufen beide direkt
`toggleMark(wordSchema.marks.strike)` — identisch zu F/K/U. Einzige neue
Code-Abstraktion ist `markActive` (nur Anzeige, vorbehaltlich 3.6b).

---

## 5. Neue / erweiterte Testdateien

### 5.1 Unit-Tests (Vitest, `jsdom`)

**Neu: `src/formats/docx/__tests__/strike.test.ts`** — Reader-Tests für Grenzfall
1/3/9, die `roundtrip.test.ts` nicht abdeckt (eigener Writer erzeugt nie `w:val="0"`
/`w:dstrike`). Baut Minimal-DOCX von Hand:

```ts
import JSZip from 'jszip'
import { readDocx } from '../reader'

const W_NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'

async function buildDocxWithRun(rPrInner: string): Promise<Blob> {
  const zip = new JSZip()
  zip.file('[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
    `</Types>`)
  zip.folder('_rels')!.file('.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
    `</Relationships>`)
  zip.folder('word')!.file('document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W_NS}><w:body>` +
    `<w:p><w:r><w:rPr>${rPrInner}</w:rPr><w:t>Text</w:t></w:r></w:p><w:sectPr/></w:body></w:document>`)
  return new Blob([await zip.generateAsync({ type: 'nodebuffer' })])
}

const strikeOf = (doc: any) => {
  const run = doc.body.content[0].content[0]
  return { text: run.text, struck: (run.marks ?? []).some((m: any) => m.type === 'strike') }
}

describe('DOCX reader: <w:strike> w:val handling (Grenzfall 1 / Risiko 1)', () => {
  it.each([
    ['<w:strike/>', true],            // kein val -> an (ECMA-376 Default)
    ['<w:strike w:val="true"/>', true],
    ['<w:strike w:val="1"/>', true],
    ['<w:strike w:val="on"/>', true],
    ['<w:strike w:val="false"/>', false], // Grenzfall 1 - bisher faelschlich true
    ['<w:strike w:val="0"/>', false],     // Testfall 25
    ['<w:strike w:val="off"/>', false],
    ['<w:strike w:val="FALSE"/>', false], // Gross-/Kleinschreibung
  ])('%s -> struck=%s', async (rPr, expected) => {
    const { text, struck } = strikeOf(await readDocx(await buildDocxWithRun(rPr)))
    expect(text).toBe('Text')       // kein Textverlust in keinem Fall
    expect(struck).toBe(expected)
  })
})

describe('DOCX reader: <w:dstrike> fallback (Grenzfall 3 / Risiko 2)', () => {
  it('a run with only <w:dstrike/> imports as plain text (documented fallback, no crash/loss)', async () => {
    const { text, struck } = strikeOf(await readDocx(await buildDocxWithRun('<w:dstrike/>')))
    expect(text).toBe('Text')
    expect(struck).toBe(false)
  })
})

// Optional (nur wenn Fix 3.2 umgesetzt): fixe EG_RPrBase-Reihenfolge im Export.
describe('DOCX writer: <w:rPr> element order (Abschnitt 3.2, optional)', () => {
  it('emits b,i,strike,color,u,shd in EG_RPrBase order', async () => {
    const { writeDocx } = await import('../writer')
    const blob = await writeDocx({
      body: { type: 'doc', content: [{ type: 'paragraph', attrs: { align: 'left' }, content: [
        { type: 'text', text: 'x', marks: [
          { type: 'strong' }, { type: 'em' }, { type: 'strike' },
          { type: 'textColor', attrs: { color: '#ff0000' } }, { type: 'underline' },
          { type: 'highlight', attrs: { color: '#ffff00' } },
        ] },
      ] }] },
      header: null, footer: null, meta: { title: '' },
    } as any)
    const xml = await (await JSZip.loadAsync(await blob.arrayBuffer())).file('word/document.xml')!.async('text')
    const order = ['<w:b/>', '<w:i/>', '<w:strike/>', '<w:color', '<w:u ', '<w:shd'].map((t) => xml.indexOf(t))
    expect(order.every((i) => i >= 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
  })
})
```

**Neu: `src/formats/odt/__tests__/strike.test.ts`** — synthetisch **plus** drei reale
Korpus-Fixtures (Abschnitt 6). Werte verifiziert (nicht angenommen):

```ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { readOdt } from '../reader'

const DIR = join(__dirname, '../../../../tests/fixtures/external/odt')
const loadFixture = (name: string) => readOdt(new Blob([readFileSync(join(DIR, name))]))

function textRuns(node: any, out: any[] = []): any[] {
  if (node.type === 'text') out.push({ text: node.text, marks: node.marks })
  ;(node.content ?? []).forEach((n: any) => textRuns(n, out))
  return out
}
const isStruck = (r: any) => (r.marks ?? []).some((m: any) => m.type === 'strike')

describe('ODT reader: real-world strikethrough fixtures (odftoolkit corpus)', () => {
  it('character-styles.odt: single (T11) AND double (T12) both read as struck; none (T13) does not (Grenzfall 2/3, Testfall 26/27)', async () => {
    const runs = textRuns(await loadFixture('character-styles.odt') as any)
    // Verifiziert: NUR T11 (single) und T12 (double) tragen text-line-through-style="solid";
    // beide umschliessen "Lorem ipsum" -> genau 2 durchgestrichene "Lorem ipsum"-Laeufe.
    // "double" kollabiert bewusst auf "single" (code.md 3.3): kein Verlust, kein Absturz.
    expect(runs.filter((r) => isStruck(r) && r.text === 'Lorem ipsum')).toHaveLength(2)
    // T13 ("lor sit ", mit Leerzeichen) hat style="none" -> nicht durchgestrichen.
    expect(runs.some((r) => !isStruck(r) && r.text.includes('lor sit'))).toBe(true)
    expect(runs.some((r) => isStruck(r) && r.text.includes('lor sit'))).toBe(false)
  })

  it('feature_attributes_character_MSO15.odt + listStyleId.odt: contain at least one struck run, no crash', async () => {
    for (const name of ['feature_attributes_character_MSO15.odt', 'listStyleId.odt']) {
      const runs = textRuns(await loadFixture(name) as any)
      expect(runs.some(isStruck)).toBe(true)
    }
  })
})

describe('ODT reader: explicit text-line-through-style="none" is not struck (Grenzfall 2)', () => {
  it('fixtures that only carry ="none" produce no strike mark at all', async () => {
    for (const name of ['compdocfileformat.odt', 'excelfileformat.odt', 'HeaderFooter.odt']) {
      const runs = textRuns(await loadFixture(name) as any)
      expect(runs.some(isStruck)).toBe(false)
    }
  })
})
```

> Hinweis zur Robustheit: `toHaveLength(2)` ist zulässig, weil im Korpus-Scan **nur**
> `T11`/`T12` `="solid"` tragen (Abschnitt 6) — kein weiterer Stil erzeugt eine
> `strike`-Mark. `"lor sit "` trägt bewusst ein abschließendes Leerzeichen (Rohtext
> der Fixture); deshalb `.includes('lor sit')` statt Gleichheit — die frühere
> Planfassung nutzte `toContain('lor sit')` (exakte Array-Mitgliedschaft) und wäre am
> Leerzeichen gescheitert.

**Neu: `src/formats/docx/__tests__/roundtrip.test.ts` & `.../odt/__tests__/roundtrip.test.ts` (Erweiterung, keine neue Datei)**

Beide Dateien haben bereits die Helfer `doc(...)`, `paragraph(text, align, marks)`,
`roundTrip(...)` (docx: 14–30) und einen isolierten Strike-Test (63–84) sowie einen
Kombitest, der nur `strong`+`em` abdeckt (86–98). Ergänzen (je Datei, gleiche
Helfer):

```ts
it('preserves strike combined with bold, italic and color on the SAME run (Risiko 4)', async () => {
  const original = doc([{ type: 'paragraph', attrs: { align: 'left' }, content: [
    { type: 'text', text: 'kombiniert', marks: [
      { type: 'strong' }, { type: 'em' }, { type: 'strike' },
      { type: 'textColor', attrs: { color: '#ff0000' } },
    ] },
  ] }])
  const run = (await roundTrip(original) as any).body.content[0].content[0]
  expect(run.marks).toEqual(expect.arrayContaining([
    { type: 'strong' }, { type: 'em' }, { type: 'strike' },
    { type: 'textColor', attrs: { color: '#ff0000' } },
  ]))
  expect(run.marks).toHaveLength(4)
})

it('preserves strike inside heading, list item and table cell (Anforderung 3.8)', async () => {
  const original = doc([
    { type: 'heading', attrs: { level: 2, align: 'left' }, content: [{ type: 'text', text: 'Titel', marks: [{ type: 'strike' }] }] },
    { type: 'bullet_list', content: [{ type: 'list_item', content: [paragraph('Punkt', 'left', [{ type: 'strike' }])] }] },
    { type: 'table', content: [{ type: 'table_row', content: [
      { type: 'table_cell', attrs: { colspan: 1, rowspan: 1 }, content: [paragraph('Zelle', 'left', [{ type: 'strike' }])] },
    ] }] },
  ])
  const r = (await roundTrip(original) as any).body
  const heading = r.content[0].content[0]
  const listText = r.content[1].content[0].content[0].content[0]
  const cellText = r.content[2].content[0].content[0].content[0].content[0]
  for (const run of [heading, listText, cellText]) {
    expect((run.marks ?? []).some((m: any) => m.type === 'strike')).toBe(true)
  }
})

it('mark-application order does not affect the resulting mark set (Anforderung 3.4)', async () => {
  const a = doc([paragraph('x', 'left', [{ type: 'strong' }, { type: 'strike' }])])
  const b = doc([paragraph('x', 'left', [{ type: 'strike' }, { type: 'strong' }])])
  const [ra, rb] = await Promise.all([roundTrip(a), roundTrip(b)])
  expect((ra as any).body.content[0].content[0].marks)
    .toEqual((rb as any).body.content[0].content[0].marks)
})
```

**Erweiterung: `src/formats/shared/editor/__tests__/commands.test.ts` (existiert bereits)**

Die Datei testet aktuell `canCut`/`cutSelection` (106 Zeilen). **Nicht** überschreiben
— einen neuen `describe`-Block für `markActive` (3.6) anhängen; DOM-frei, nur
`wordSchema`:

```ts
import { markActive } from '../commands'
// (EditorState/TextSelection werden bereits importiert; wordSchema ebenfalls.)

function paragraphsState(...texts: string[]) {
  const paras = texts.map((t) => wordSchema.node('paragraph', { align: 'left' }, t ? [wordSchema.text(t)] : []))
  return EditorState.create({ doc: wordSchema.node('doc', null, paras), schema: wordSchema })
}

// ACHTUNG (Abschnitt 3.6b): Diese Tests gelten fuer die "Irgendwo"-Semantik
// (rangeHasMark) dieser Datei. Faellt die Cross-Spec-Entscheidung stattdessen auf die
// "Volldeckung"-Semantik von fett-code.md/kursiv-code.md (isMarkActive), kippen genau
// die beiden mit "MIXED" markierten expect()-Werte unten von true auf false - alle
// anderen bleiben unveraendert. Vor dem Implementieren pruefen, welche Semantik
// tatsaechlich gelandet ist (siehe 3.6b Punkt 2).
describe('markActive (Grenzfaelle 11/12, durchgestrichen-code.md 3.6)', () => {
  const strike = wordSchema.marks.strike

  it('false for empty selection without stored marks', () => {
    expect(markActive(paragraphsState(''), strike)).toBe(false)
  })

  it('reflects storedMarks at an empty cursor (Grenzfall 12)', () => {
    let s = paragraphsState('abc')
    s = s.apply(s.tr.addStoredMark(strike.create()))
    expect(markActive(s, strike)).toBe(true)
  })

  it('MIXED selection, only the START has the mark -> true under "Irgendwo", false under "Volldeckung"', () => {
    let s = paragraphsState('abcdef')
    s = s.apply(s.tr.addMark(1, 4, strike.create()))
    s = s.apply(s.tr.setSelection(TextSelection.create(s.doc, 1, 7)))
    expect(markActive(s, strike)).toBe(true)
  })

  it('MIXED selection, only the END has the mark (the actual old bug) -> true under "Irgendwo", false under "Volldeckung"', () => {
    let s = paragraphsState('abcdef')
    s = s.apply(s.tr.addMark(4, 7, strike.create()))
    s = s.apply(s.tr.setSelection(TextSelection.create(s.doc, 1, 7)))
    expect(markActive(s, strike)).toBe(true) // altes $from-only haette false gemeldet
  })

  it('false when no part of the selection has the mark', () => {
    let s = paragraphsState('abcdef')
    s = s.apply(s.tr.setSelection(TextSelection.create(s.doc, 1, 7)))
    expect(markActive(s, strike)).toBe(false)
  })

  it('true for a fully-covered selection (both semantics agree here)', () => {
    let s = paragraphsState('abcdef')
    s = s.apply(s.tr.addMark(1, 7, strike.create()))
    s = s.apply(s.tr.setSelection(TextSelection.create(s.doc, 1, 7)))
    expect(markActive(s, strike)).toBe(true)
  })
})
```

### 5.2 E2E-Tests (Playwright) — **Neu: `tests/e2e/strike.spec.ts`**

Kernstück (DoD Punkt 3). Locator-Helfer **wörtlich** wie in `odt.spec.ts:43–46`
übernommen (verifiziert):

```ts
import { test, expect, type Page } from '@playwright/test'
import JSZip from 'jszip'

const odtCard = (page: Page) =>
  page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'OpenDocument Text (.odt)' }) })
const docxCard = (page: Page) =>
  page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })

test.describe('Durchgestrichen - Toolbar & Tastatur', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  })

  test('Testfall 1/6: Toolbar-Klick togglet an und aus', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Testtext')
    await page.keyboard.press('ControlOrMeta+a')
    const button = page.getByTitle('Durchgestrichen')
    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    await expect(editor.locator('s')).toContainText('Testtext')
    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'false')
    await expect(editor.locator('s')).toHaveCount(0)
  })

  test('Testfall 32: Strg+Umschalt+X == Toolbar-Klick (Entscheidung 3.5)', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Kurzform')
    await page.keyboard.press('ControlOrMeta+a')
    await page.keyboard.press('ControlOrMeta+Shift+x')
    await expect(editor.locator('s')).toContainText('Kurzform')
    await expect(page.getByTitle('Durchgestrichen')).toHaveAttribute('aria-pressed', 'true')
  })

  test('Testfall 37/Grenzfall 15/Risiko 11 (hoechste Prioritaet): reine Tastaturbedienung des Buttons', async ({ page }) => {
    // Bewusst KEIN .click()/.focus() per Locator - das wuerde ein synthetisches Klick-
    // Event ausloesen und genau den Verdacht "nur per Maus/Touch bedienbar" verdecken,
    // den dieser Test widerlegen/bestaetigen soll (durchgestrichen-req.md Testfall 37
    // verlangt ausdruecklich echten Tastatur-Fokuswechsel).
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Tastaturtest')
    await page.keyboard.press('ControlOrMeta+a')
    const button = page.getByTitle('Durchgestrichen')
    // Tab wiederholt zum Button navigieren, statt eine Locator-Annahme ueber die
    // Tab-Reihenfolge zu treffen - robust gegen Toolbar-Umbau/-Reihenfolge.
    let reachedButton = false
    for (let i = 0; i < 40 && !reachedButton; i++) {
      await page.keyboard.press('Tab')
      reachedButton = await button.evaluate((el) => el === document.activeElement)
    }
    expect(reachedButton, 'Tab-Navigation muss den Durchgestrichen-Button erreichen').toBe(true)
    await page.keyboard.press('Enter')
    await expect(editor.locator('s')).toContainText('Tastaturtest')
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    // Separat: Leertaste muss ebenso togglen (Toggle-Aus).
    await page.keyboard.press(' ')
    await expect(editor.locator('s')).toHaveCount(0)
    await expect(button).toHaveAttribute('aria-pressed', 'false')
  })

  test('Testfall 5: Toggle an der Schreibmarke wirkt nur auf neu getippten Text', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('vorher ')
    await page.getByTitle('Durchgestrichen').click()
    await page.keyboard.type('neu')
    await expect(editor.locator('s')).toContainText('neu')
    await expect(editor.locator('s')).not.toContainText('vorher')
  })

  test('Testfall 7/Grenzfall 5: gemischte Selektion entfernt einheitlich (3.3)', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('abcdef')
    await page.keyboard.press('Home')
    for (let i = 0; i < 3; i++) await page.keyboard.press('Shift+ArrowRight') // "abc"
    await page.getByTitle('Durchgestrichen').click()
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Durchgestrichen').click() // muss ALLES entfernen, nicht hinzufuegen
    await expect(editor.locator('s')).toHaveCount(0)
  })

  test('Testfall 11/Grenzfall 11: Button-Zustand bei nicht-uniformer Selektion', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('abcdef')
    await page.keyboard.press('Home')
    for (let i = 0; i < 3; i++) await page.keyboard.press('Shift+ArrowRight')
    await page.getByTitle('Durchgestrichen').click() // "abc" durchgestrichen
    await page.keyboard.press('ControlOrMeta+a')     // ganze Zeile (teils/teils)
    await expect(page.getByTitle('Durchgestrichen')).toHaveAttribute('aria-pressed', 'true')
  })

  test('Testfall 8/9: Kombination Fett+Kursiv+Unterstrichen+Durchgestrichen gleichzeitig', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Alles')
    await page.keyboard.press('ControlOrMeta+a')
    for (const t of ['Fett', 'Kursiv', 'Unterstrichen', 'Durchgestrichen']) await page.getByTitle(t).click()
    // Marks verschachteln in Schema-Rang-Reihenfolge (strong>em>u>s): <s> ist INNERSTE.
    // Deshalb jede Auszeichnung EINZELN pruefen (nicht "<u> in <s>" - das gaebe es nicht).
    for (const tag of ['strong', 'em', 'u', 's']) await expect(editor.locator(tag)).toContainText('Alles')
  })

  test('Testfall 10: Button aktiv, wenn Cursor (ohne Selektion) in durchgestrichenem Text', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Wort')
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Durchgestrichen').click()
    await page.keyboard.press('Home') // Selektion kollabiert in durchgestrichenen Text
    await expect(page.getByTitle('Durchgestrichen')).toHaveAttribute('aria-pressed', 'true')
  })

  test('Testfall 13: Bullet- und nummerierte Liste', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByTitle('Aufzählung').click()
    await page.keyboard.type('Listenpunkt')
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Durchgestrichen').click()
    await expect(editor.locator('li s')).toContainText('Listenpunkt')
  })

  test('Testfall 14: Tabellenzelle ohne Nebenwirkung auf Nachbarzelle', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
    const cells = editor.locator('td')
    await cells.nth(0).click()
    await page.keyboard.type('Eins')
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Durchgestrichen').click()
    await cells.nth(1).click()
    await page.keyboard.type('Zwei')
    await expect(cells.nth(0).locator('s')).toContainText('Eins')
    await expect(cells.nth(1).locator('s')).toHaveCount(0)
  })

  test('Testfall 16: Undo/Redo direkt nach Anwenden', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Text')
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Durchgestrichen').click()
    await expect(editor.locator('s')).toHaveCount(1)
    await page.keyboard.press('ControlOrMeta+z')
    await expect(editor.locator('s')).toHaveCount(0)
    await expect(editor).toContainText('Text')
    await page.keyboard.press('ControlOrMeta+y')
    await expect(editor.locator('s')).toHaveCount(1)
  })

  test('Testfall 17: Paste von extern durchgestrichenem HTML behaelt die Mark (Grenzfall 6)', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.evaluate(() => {
      const pm = document.querySelector('.ProseMirror') as HTMLElement
      const dt = new DataTransfer()
      dt.setData('text/html', '<p>vor <s>gestrichen</s> nach</p>')
      dt.setData('text/plain', 'vor gestrichen nach')
      pm.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dt }))
    })
    await expect(editor.locator('s')).toContainText('gestrichen')
  })

  test('Testfall 34: schnelles Mehrfachklicken (gerade Anzahl = Ausgangszustand)', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Klicktest')
    await page.keyboard.press('ControlOrMeta+a')
    const button = page.getByTitle('Durchgestrichen')
    for (let i = 0; i < 4; i++) await button.click()
    await expect(editor.locator('s')).toHaveCount(0)
    await expect(editor).toContainText('Klicktest')
  })

  test('Grenzfall 4: Toggle im leeren Absatz wirft keinen Fehler', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByTitle('Durchgestrichen').click()
    await page.keyboard.type('jetzt')
    await expect(editor.locator('s')).toContainText('jetzt')
  })
})
```

**Rundreisen mit Pflicht-Re-Import (Anforderung Abschnitt 5, DoD Punkt 3/4)** — im
selben File, zweiter `describe`. Anders als R-7 (`clipboard-roundtrip.spec.ts`, nur
XML-String) wird die exportierte Datei **wieder eingelesen** und gerendert:

```ts
import fs from 'node:fs/promises'

async function exportAndReload(page: Page, card: (p: Page) => ReturnType<Page['locator']>,
  ext: 'docx' | 'odt', mime: string) {
  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const buffer = await fs.readFile((await (await dl).path())!)
  // Frischer Tab-Import derselben Datei = echter Re-Import ueber die UI:
  await page.goto('/')
  await page.getByRole('button', { name: /verstanden/i }).click()
  await card(page).locator('input[type="file"]').setInputFiles({ name: `rt.${ext}`, mimeType: mime, buffer })
  return buffer
}

test.describe('Durchgestrichen - Rundreisen mit Re-Import', () => {
  for (const [name, card, ext, mime, xmlPart, needle] of [
    ['DOCX (Testfall 18)', docxCard, 'docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'word/document.xml', /<w:strike\s*\/>/],
    ['ODT (Testfall 19)',  odtCard,  'odt',  'application/vnd.oasis.opendocument.text', 'content.xml', /text-line-through-style="solid"/],
  ] as const) {
    test(`Eigenrundreise ${name}: durchstreichen -> Export -> Re-Import -> Strike erhalten`, async ({ page }) => {
      await page.goto('/')
      await page.getByRole('button', { name: /verstanden/i }).click()
      await card(page).getByRole('button', { name: 'Neu erstellen' }).click()
      const editor = page.locator('.ProseMirror')
      await editor.click()
      await page.keyboard.type('Durchgestrichener Text')
      await page.keyboard.press('ControlOrMeta+a')
      await page.getByTitle('Durchgestrichen').click()
      const buffer = await exportAndReload(page, card, ext, mime)
      // (a) unabhaengige XML-Pruefung des Exports (ohne eigenen Reader):
      const xml = await (await JSZip.loadAsync(buffer)).file(xmlPart)!.async('text')
      expect(xml).toMatch(needle)
      // (b) Pflicht-Re-Import/Re-Render (das, was R-7 fehlt):
      await expect(page.locator('.ProseMirror s')).toContainText('Durchgestrichener Text')
    })
  }

  test('Testfall 24: reale, app-fremde ODT (character-styles.odt) importieren -> Export -> Strike erhalten', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    const buffer = await fs.readFile('tests/fixtures/external/odt/character-styles.odt')
    await odtCard(page).locator('input[type="file"]').setInputFiles({
      name: 'character-styles.odt', mimeType: 'application/vnd.oasis.opendocument.text', buffer })
    await expect(page.locator('.ProseMirror s')).toContainText('Lorem ipsum')
    const dl = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportieren' }).click()
    const out = await fs.readFile((await (await dl).path())!)
    const xml = await (await JSZip.loadAsync(out)).file('content.xml')!.async('text')
    expect(xml).toContain('style:text-line-through-style="solid"')
  })

  // Skizzen (Anforderung 5.3-5.7 / Testfaelle 20-22): identisches Muster, jeweils
  // exportieren -> in die ANDERE Card re-importieren -> `.ProseMirror s` pruefen.
  test.fixme('Testfall 20/21: Cross-Format DOCX<->ODT erhaelt Strike', async () => {})
  test.fixme('Testfall 22: Doppel-Cross DOCX->ODT->DOCX mit Strike+Fett+Farbe, kein Verlust', async () => {})
  test.fixme('Testfall 23/25: reale/handgebaute DOCX (w:strike bzw. w:val="0"), siehe Abschnitt 9', async () => {})
})
```

**Erweiterung: `tests/e2e/selection-regression.spec.ts`** — die Datei nutzt aktuell
`getByTitle('Fett')` (Zeilen 20/52/68/94) mit denselben `odtCard`-/„Neu erstellen"-
/„verstanden"-Locators. Anforderung 3.9 verlangt denselben Nachweis für
Durchgestrichen; als neuen Test **im selben `describe`** anhängen (dauerhaft neben dem
Bold-Pendant):

```ts
test('same Ctrl+A -> format -> reposition -> Enter regression with "Durchgestrichen" (Testfall 4)', async ({ page }) => {
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Hallo, das ist ein Test.')
  await page.keyboard.press('ControlOrMeta+a')
  await page.getByTitle('Durchgestrichen').click()
  await editor.click()
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Zweiter Absatz.')
  await expect(editor).toContainText('Hallo, das ist ein Test.')
  await expect(editor).toContainText('Zweiter Absatz.')
  await expect(editor.locator('p')).toHaveCount(2)
})
```

### 5.2a Browser-Matrix-Lücke: `strike.spec.ts` läuft nicht auf Firefox/Safari — Testfall 37 verlangt aber genau das

**Verifiziert in `playwright.config.ts` (27–55):** Nur die Projekte `Desktop Chrome`,
`Mobile` (Pixel 7, Chromium) und `Tablet` (iPad Mini, WebKit) laufen **standardmäßig**
gegen **alle** `tests/e2e/*.spec.ts`-Dateien. `Desktop Safari (Clipboard)` und
`Desktop Firefox (Clipboard)` (Zeilen 43–53) sind bewusst per `testMatch:
/clipboard.*\.spec\.ts/` **eingeschränkt** — laut Kommentar dort, um „die Laufzeit der
gesamten Suite" nicht zu verdoppeln. Ein neu angelegtes `tests/e2e/strike.spec.ts`
matcht dieses Muster **nicht** und liefe daher **nie** auf Firefox oder Desktop
Safari — obwohl `durchgestrichen-req.md` Testfall 37 für **genau** den
Tastatur-Aktivierungs-Test (Abschnitt 5.2, Testfall 37) ausdrücklich verlangt: „Ergänzend:
derselbe Ablauf mit Firefox …, da sich Browser in der Emulation von Tastatur-Aktivierung
auf `<button>` unterscheiden können." Ohne Gegenmaßnahme bliebe dieser Teil der
Anforderung schlicht unerfüllt, ohne dass ein rotes Testergebnis das anzeigen würde.

**Fix (kein Config-Umbau, keine Laufzeit-Verdopplung der übrigen Suite):** Der
Tastatur-Aktivierungstest aus 5.2 wird **zusätzlich**, wortgleich, in
`tests/e2e/clipboard-roundtrip.spec.ts` platziert (neuer, eigener `test.describe`, nicht
im bestehenden `R-7`-Block) — diese Datei matcht `/clipboard.*\.spec\.ts/` bereits und
läuft dadurch automatisch auch auf `Desktop Firefox (Clipboard)` und `Desktop Safari
(Clipboard)`, zusätzlich zu Chrome/Mobile/Tablet:

```ts
// In tests/e2e/clipboard-roundtrip.spec.ts ergänzen (eigener describe-Block, NICHT im
// bestehenden R-7 FEATURE_CASES-Loop, damit dieser gezielte Tastatur-Test nicht am
// WebKit-Clipboard-Skip von R-7 haengt und unabhaengig lesbar bleibt):
test.describe('Durchgestrichen - Tastaturbedienung des Buttons (Testfall 37, Browser-Matrix)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  })

  test('Tab-Fokus + Enter/Leertaste toggeln wie ein Mausklick (hoechste Prioritaet, Grenzfall 15/Risiko 11)', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Browsermatrix')
    await page.keyboard.press('ControlOrMeta+a')
    const button = page.getByTitle('Durchgestrichen')
    let reachedButton = false
    for (let i = 0; i < 40 && !reachedButton; i++) {
      await page.keyboard.press('Tab')
      reachedButton = await button.evaluate((el) => el === document.activeElement)
    }
    expect(reachedButton).toBe(true)
    await page.keyboard.press('Enter')
    await expect(editor.locator('s')).toContainText('Browsermatrix')
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    await page.keyboard.press(' ')
    await expect(editor.locator('s')).toHaveCount(0)
  })
})
```

Damit läuft der Tastatur-Aktivierungstest auf **vier** Engines (Chromium via `Desktop
Chrome`/`Mobile`, WebKit via `Tablet`/`Desktop Safari (Clipboard)`, **und** Firefox via
`Desktop Firefox (Clipboard)`) — die von Testfall 37 geforderte Cross-Browser-Abdeckung
ist damit **tatsächlich**, nicht nur behauptet, erfüllt. Der wortgleiche Test bleibt
zusätzlich in `strike.spec.ts` (5.2) stehen, damit die Datei für sich allein lesbar
bleibt und nicht implizit von `clipboard-roundtrip.spec.ts` abhängt — bewusste, geringe
Redundanz statt einer stillen Lücke.

> **Repo-weiter Hinweis (nicht Teil dieses Plans):** Dieselbe Lücke betrifft
> `kursiv-code.md`s neu geplante `tests/e2e/kursiv.spec.ts` (dort nicht erwähnt) und
> jede zukünftige Zeichenformatierungs-Datei, die denselben `MarkButton`-Tastaturfix
> braucht. Eine sauberere langfristige Lösung wäre, `playwright.config.ts`s
> `testMatch`-Muster auf z. B. `/(clipboard|strike|kursiv|fett|unterstrichen).*\.spec\.ts/`
> zu erweitern — das ist eine Config-Änderung mit Auswirkung auf alle Geschwister-Pläne
> und daher außerhalb des Scopes dieser Datei; hier nur als Alternative vermerkt, falls
> das Duplizieren des Tests in mehreren Feature-Specs zu unübersichtlich wird.

### 5.2.1 Touch-/Mobile-Bedienung (Testfall 36 / Grenzfall 14 / Risiko 10 / Menüpunkt 7) — **von der früheren Planfassung ausgelassen**

Weder ein Testartefakt noch die Abnahme-Mapping-Tabelle (Abschnitt 10) der vorigen
Fassung deckte Testfall 36 / Risiko 10 ab, obwohl die Anforderung ihn ausdrücklich
fordert (Grenzfall 14, Menüpunkt 7) und das Repo aktiv touch-fähige Projekte pflegt:
`playwright.config.ts` definiert (verifiziert) `{ name: 'Mobile', use: devices['Pixel 7'] }`
und `{ name: 'Tablet', use: devices['iPad Mini'] }` — beide mit `hasTouch`. Der
Toolbar-Auslöser ist `onMouseDown`+`preventDefault` (`Toolbar.tsx:76–79`); auf
Touch-Geräten entsteht `mousedown` nur als synthetisiertes Folge-Event nach
`pointerdown`/`touchstart`. Zu verifizieren ist, dass ein **Tap** (nicht Maus-Klick)
zuverlässig togglet und `preventDefault(mousedown)` weder den Tap noch die zuvor mit
„Alles auswählen" gesetzte Selektion verschluckt.

Da alle Tests aus 5.2 ohnehin auf den Projekten `Mobile`/`Tablet` mitlaufen, ist der
`.click()`-Pfad dort bereits abgedeckt; **neu** ist ein expliziter **Touch-Tap**-Test.
In `strike.spec.ts` als eigener `describe`, der sich per `test.skip`-Guard auf die
touch-fähigen Projekte beschränkt (Projektnamen `Mobile`/`Tablet` sind in
`playwright.config.ts` verifiziert — `.tap()` verlangt `hasTouch` und würde auf einem
Desktop-Projekt hart fehlschlagen, deshalb der Guard statt eines stillen `.click()`-
Fallbacks):

```ts
test.describe('Durchgestrichen - Touch/Mobile (Testfall 36 / Grenzfall 14)', () => {
  test.skip(({}, testInfo) => !/Mobile|Tablet/.test(testInfo.project.name),
    'Nur auf den touch-faehigen Projekten Mobile (Pixel 7) / Tablet (iPad Mini).')

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  })

  test('Tap togglet an und aus, Ctrl+A-Selektion bleibt erhalten', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.tap()
    await page.keyboard.type('Fingertipp')
    await page.keyboard.press('ControlOrMeta+a')
    const button = page.getByTitle('Durchgestrichen')
    await button.scrollIntoViewIfNeeded() // deckt Toolbar-Umbruch/-Scroll auf schmalem Viewport ab
    await button.tap()                     // Touch, nicht Maus
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    await expect(editor.locator('s')).toContainText('Fingertipp')
    // preventDefault(mousedown) darf die Ctrl+A-Selektion nicht zerstoert haben:
    await button.tap()                     // Toggle-Aus auf DERSELBEN Selektion
    await expect(button).toHaveAttribute('aria-pressed', 'false')
    await expect(editor.locator('s')).toHaveCount(0)
  })
})
```

Hinweis: Der `flex-wrap`-Toolbar-Container (`Toolbar.tsx:141`) bricht auf schmalem
Viewport um, schneidet den Button aber nicht ab; `scrollIntoViewIfNeeded()` vor dem Tap
deckt den Umbruch-/Scroll-Fall aus Grenzfall 14 explizit mit ab. Dieser Test ist die
einzige **neue** Absicherung für Risiko 10 — er benötigt **keine** Codeänderung (der
`onMouseDown`-Pfad funktioniert unter Touch über die synthetisierten Kompatibilitäts-
Mausevents); schlägt er fehl, ist das der von der Anforderung gesuchte, bislang
unbelegte Defekt und erst dann ist ein `onPointerDown`-Zusatz zu erwägen.

### 5.3 Unabhängige Parser-Validierung erweitern (Testfall 29/30, DoD Punkt 4) — **von der früheren Planfassung ausgelassen**

Die Anforderung verlangt ausdrücklich, die **bestehenden** `external-validation`-Tests
um eine gezielte Strike-Assertion zu erweitern — nicht nur eine manuelle Prüfung.

**DOCX — `src/formats/docx/__tests__/external-validation.test.ts`** (mammoth, aktuell
18–79; assertiert `<strong>`, aber keinen Strike). Neuer, eigenständiger `it`-Block,
damit der bestehende Kombitest unberührt bleibt:

```ts
it('strikethrough survives to an independent parser (mammoth) as <s> (Testfall 29)', async () => {
  const content = {
    body: { type: 'doc', content: [{ type: 'paragraph', attrs: { align: 'left' },
      content: [{ type: 'text', text: 'durchgestrichen', marks: [{ type: 'strike' }] }] }] },
    header: null, footer: null, meta: { title: '' },
  } as WordDocumentContent
  const buffer = Buffer.from(await (await writeDocx(content)).arrayBuffer())
  // WICHTIG - nicht annehmen: mammoths Default-Style-Map behandelt Strikethrough je
  // nach Version unterschiedlich. Deshalb "strike => s" EXPLIZIT setzen (wird an die
  // Default-Map ANGEHAENGT, Fett/Kursiv bleiben erhalten). Beim Umsetzen die real
  // installierte mammoth-Version verifizieren; falls sie Strike bereits ohne styleMap
  // als <s> ausgibt, ist der Eintrag harmlos redundant.
  const { value: html } = await mammoth.convertToHtml({ buffer }, { styleMap: ['strike => s'] })
  expect(html).toContain('<s>durchgestrichen</s>')
})
```

**ODT — `src/formats/odt/__tests__/external-validation.test.ts`** (aktuell 44–130).
Das dort validierte Dokument enthält bereits einen Strike-Lauf (Zeile 66:
`{ type: 'text', text: 'durchgestrichen', marks: [{ type: 'strike' }] }`) und `content.xml`
wird ohnehin gelesen (117) und gegen das OASIS-Schema validiert. Es fehlt nur die
**gezielte** Erhalt-Assertion (unabhängig von `readOdt`) — direkt nach der
`content.xml`-Schemaprüfung ergänzen:

```ts
// Testfall 30 / DoD 4: gezielter Nachweis, dass die Durchstreichung im schema-validen
// content.xml tatsaechlich als solide Linie kodiert ist (nicht nur "Datei ist gueltig").
expect(contentXml).toContain('style:text-line-through-style="solid"')
```

Damit ist die „unabhängige Prüfung assertiert die Durchstreichung gezielt"-Pflicht
(Anforderung 5.8) für **beide** Formate automatisiert erfüllt — ohne auf einen
manuellen Einmal-Schritt auszuweichen.

---

## 6. Fixture-Inventar — reale Dateien (verifiziert)

Programmatisches Entpacken von `tests/fixtures/external/odt` (202 Dateien), Suche nach
`text-line-through-style` in `content.xml`. **Genau drei** Dateien tragen `="solid"`:

| Datei | Strike-Stile (`solid`) | `text-line-through-type` | umschlossener Text |
|---|---|---|---|
| `character-styles.odt` | `T11`, `T12` (`T13` = `none`) | `T11`=single, `T12`=double, `T13`=none | „Lorem ipsum" (T11), „Lorem ipsum" (T12), „lor sit " (T13) |
| `feature_attributes_character_MSO15.odt` | vorhanden | u. a. `double` | ≥1 durchgestrichener Lauf |
| `listStyleId.odt` | vorhanden | — | ≥1 durchgestrichener Lauf |

`character-styles.odt` ist der **Primär-Fixture**: eine einzige, reale (nicht
app-eigene) Datei mit allen drei relevanten Zuständen an unterscheidbarem, **direkt
verifiziertem** Text. Deckt Testfall 24 (reale Fremddatei-Rundreise), 26 (explizites
„none") und 27 (doppelt → Fallback „einfach") gleichzeitig ab. **DOCX-Korpus:** Der
Apache-POI-Bestand enthält **keine** Datei mit `w:strike`/`w:dstrike` — Grenzfall
1/9/Testfall 25/27 (DOCX) müssen daher über handgebautes XML getestet werden
(`strike.test.ts`, 5.1); für Testfall 23 (reale, app-fremde DOCX-Datei) fehlt ein
Korpus-Kandidat → offene Abhängigkeit, Abschnitt 9.

> Diese Dateien waren bisher nur indirekt über den generischen „importiert ohne
> Absturz"-Lauf in `external-fixtures.test.ts` abgedeckt — **ohne** eine einzige
> `strike`-Assertion. Genau die in Anforderung 6/7 kritisierte Lücke, geschlossen
> durch `odt/__tests__/strike.test.ts` (5.1).

---

## 7. Visuelle Darstellung & Icon (Anforderung 3.5 / Grenzfälle 7, Icon)

- **`src/index.css` (88 Zeilen) verifiziert:** keine eigene `s`/`u`/`text-decoration`-
  Regel auf der `.ProseMirror`-Fläche. `<s>` (Linie mittig durch die x-Höhe) und
  `<u>` (Linie an der Grundlinie) rendern im Browser-Default auf **unterschiedlicher**
  Höhe → „unterstrichen + durchgestrichen" bleibt optisch unterscheidbar (Grenzfall 7)
  **ohne** CSS-Zutun. Nur Sichtprüfungstest nötig (Testfall 9), keine Änderung.
- **Toolbar-Icon „S"** — keine Änderung. Anders als die echten Symbol-/Emoji-Icons im
  selben Toolbar (`⌫`, `🖍`, `⊞`, `🖼`, `⇤ ↔ ⇥ ≡`, das eigentliche Font-Risiko aus
  `FEATURE-SPEC-DOCX-ODT.md` §17/20) ist „S" ein gewöhnlicher lateinischer Buchstabe
  wie „F"/„K"/„U", in jeder Systemschrift eindeutig. Empfehlung: Testfall 31 als
  `toHaveScreenshot`-Vergleich der Button-Reihe absichern (kein Code-Änderung am
  Icon). Die CSS-`line-through` auf dem Buchstaben (`glyphClassName`) ist rein
  dekorativ; selbst falls sie je Font minimal variiert, bleibt „S" lesbar.

---

## 8. Bewusst nicht geänderter Code (und warum)

- **`schema.ts:176–181` Mark `strike`** — korrekt; `parseDOM` deckt `<s>`, `<strike>`
  und CSS `text-decoration: line-through` ab (Grenzfall 6 / Copy-Paste strukturell
  erledigt, nur Test fehlte → E2E Testfall 17).
- **`odt/writer.ts:38` / `odt/styleRegistry.ts:55`** — Ausgabe (`solid`/`single`)
  exakt wie von Anforderung/Rundreise verlangt.
- **`odt/styleRegistry.ts` Dedup-Key** (`JSON.stringify(props)`, 28–39) — bekanntes
  Härtungsthema aus `unterstrichen-einfach-code.md` §3.3, **weiterhin folgenlos**,
  weil `prosemirror-model` die Mark-Array-Reihenfolge kanonisch hält (3.4). Kein Fix
  in diesem Plan.
- **`prosemirror-commands` `toggleMark`** — Verhalten bei gemischter Selektion (3.3),
  leerer Selektion/`storedMarks` (3.2 der Anforderung) und mehreren `ranges` einer
  `CellSelection` ist korrektes Fremdbibliotheks-Standardverhalten: nur verifizieren
  (Testfälle 7/13/14), nicht implementieren.

---

## 9. Offene Abhängigkeiten (nur dokumentieren, kein Code jetzt)

- **`durchgestrichen-doppelt`** (Backlog „fehlt"): Bei Umsetzung ist zu entscheiden,
  ob neue Mark oder Attribut auf `strike`. Attribut-Variante würde DOCX-seitig
  `<w:strike>`/`<w:dstrike>` und ODT-seitig `text-line-through-type` (`single`/
  `double`) unterscheiden — dann müssen `docx/reader.ts` (3.1) und `odt/reader.ts`
  (3.3) erneut angefasst werden. Weichenstellung vermerkt.
- **`formatierung-loeschen`** (Backlog „fehlt", Anforderung 3.7): Bei Umsetzung muss
  `wordSchema.marks.strike` in die Clear-Logik aufgenommen werden.
- **Track Changes** (`FEATURE-SPEC-DOCX-ODT.md` §13, Grenzfall 13): reguläre
  `strike`-Mark muss visuell von der (ebenfalls durchgestrichenen) Lösch-Markierung
  unterscheidbar bleiben — z. B. per Farbe/CSS-Klasse auf dem Track-Changes-Rendering,
  nicht auf `<s>`. Für diese Verifikation genügt der **dokumentierte** Vermerk (so von
  Grenzfall 13 verlangt).
- **Kopf-/Fußzeilen-Bearbeitung** (Grenzfall 8): Es gibt aktuell **keine** UI zum
  Editieren von Header/Footer (`src/formats/shared/editor` enthält keine
  Header/Footer-Komponente; Daten existieren nur in Modell/Reader/Writer). „Durch-
  gestrichen in Kopf-/Fußzeile" ist damit **nicht testbar**, bis diese UI-Lücke
  geschlossen ist — hier ausdrücklich vermerkt statt stillschweigend ausgelassen.
- **Reale, app-fremde DOCX mit Durchstreichung** (Abschnitt 6): fehlt im
  Apache-POI-Korpus. Für Testfall 23 einmalig eine kleine, mit echtem Word erzeugte
  `.docx` unter `tests/fixtures/external/docx/` ergänzen (Herkunft/Lizenz in
  `tests/fixtures/external/README.md`). Bis dahin deckt `strike.test.ts` den
  DOCX-`w:val`-/`dstrike`-Grenzfall **synthetisch** ab; das ODT-Pendant ist über
  `character-styles.odt` bereits real abgedeckt.
- **Cross-Spec-Kollision `markActive`/`isMarkActive` (Abschnitt 3.6b, blockierend vor
  Umsetzung):** `fett-code.md` (Defekt B) und `kursiv-code.md` (Abschnitt 4.1) planen
  bereits **zwei** gegenseitig kollidierende Versionen von `isMarkActive` in derselben
  Datei `commands.ts`; dieser Plan fügt mit `markActive` (Abschnitt 3.6) eine
  **dritte**, semantisch abweichende Variante hinzu. Muss zentral (Leiter/PO)
  entschieden werden, **bevor** einer der drei Pläne `commands.ts`/`Toolbar.tsx`
  tatsächlich committet — sonst entsteht entweder ein Merge-Konflikt oder ein still
  inkonsistentes Verhalten zwischen den vier Buttons F/K/U/S.
- **Cross-Spec-Fix `MarkButton` Tastatur-Aktivierung (Abschnitt 3.6a):** identisch zu
  `fett-code.md` Defekt A — derselbe `onMouseDown`→`onClick`-Umbau. Wer zuerst
  committet, behebt ihn für **alle vier** Buttons mit; der zweite Plan muss dann nur
  noch die eigenen Tests (Testfall 37 hier, das Pendant in `fett-req.md` Abschnitt 4)
  gegen den bereits gefixten Code verifizieren, statt den Fix zu wiederholen.

---

## 10. Abnahme-Mapping (Anforderung 6/7/8 → Testartefakt)

| Anforderung | Abgedeckt durch |
|---|---|
| Testfälle 1–17 (UI-Verhalten) | `tests/e2e/strike.spec.ts`, describe „Toolbar & Tastatur" |
| Testfall 4 / Selection-Sync-Regression (3.9) | Erweiterung `tests/e2e/selection-regression.spec.ts` |
| Testfälle 18/19 (Eigenrundreise **mit Re-Import**) | `strike.spec.ts`, describe „Rundreisen mit Re-Import" |
| Testfälle 20–22 (Cross-Format / Doppel-Cross) | `strike.spec.ts` (`test.fixme`-Skizzen, Muster vorgegeben) |
| Testfall 23/24 (reale Fremddatei-Rundreise) | ODT: `character-styles.odt` in `strike.spec.ts`; DOCX: offene Abhängigkeit §9 |
| Testfall 25 (DOCX `w:val="0"`) | `docx/__tests__/strike.test.ts` + Fix 3.1 |
| Testfall 26 (ODT `="none"`) | `odt/__tests__/strike.test.ts` (reale + „none"-Fixtures) |
| Testfall 27 (doppelt → Fallback „einfach") | `docx/__tests__/strike.test.ts` (`w:dstrike`) + `odt/__tests__/strike.test.ts` (`character-styles.odt`, `type=double`) + Doku 3.3 |
| Testfall 28 (E2E über echte Bedienung **inkl. Re-Import**, DOCX **und** ODT) | `strike.spec.ts` — komplett neu (DoD Punkt 3) |
| Testfall 29 (DOCX mammoth assertiert Strike) | Erweiterung `docx/__tests__/external-validation.test.ts` (5.3) |
| Testfall 30 (ODT gezielte `text-line-through`-Assertion) | Erweiterung `odt/__tests__/external-validation.test.ts` (5.3) |
| Testfall 31 (Icon-Rendering) | Abschnitt 7 + empfohlener Screenshot-Test |
| Testfall 32 (Tastenkürzel) | `strike.spec.ts` + Entscheidung/Fix 3.5 |
| Testfälle 33/34 (Performance, Mehrfachklick) | `strike.spec.ts` |
| Testfall 35 (Import-Render aus Voll-Fixture bleibt grün) | bestehende `docx.spec.ts:302` / `odt.spec.ts:278` |
| Testfall 36 / Menüpunkt 7 (Touch-/Mobile-Bedienung) | `strike.spec.ts` describe „Touch/Mobile" (5.2.1), Projekte `Mobile`/`Tablet` |
| Testfall 37 / Grenzfall 15 / Risiko 11 (**höchste Priorität**, reine Tastaturbedienung) | Fix 3.6a (`onClick` statt `onMouseDown`) + `strike.spec.ts` (Chromium/Mobile/Tablet) + `clipboard-roundtrip.spec.ts` (5.2a, **inkl. Firefox/Safari** über `testMatch`) |
| Risiko 1 / Grenzfall 1 (`w:val`-Ignoranz) | Fix 3.1 + `docx/__tests__/strike.test.ts` |
| Risiko 2 / Grenzfall 3 (Doppelstrich-Fallback) | Doku 3.3 + reale/synthetische Tests |
| Risiko 3 / Grenzfälle 11/12 (`aria-pressed`) | Fix 3.6 + `markActive`-Erweiterung in `commands.test.ts` |
| Risiko 4 (`strike`+andere Marks) | Erweiterung beider `roundtrip.test.ts` (5.1) |
| Risiko 5 (`strike` in Tabelle/Liste/Überschrift) | Erweiterung `roundtrip.test.ts` + E2E Testfälle 13/14 |
| Risiko 6 (fehlender Re-Import in E2E, ODT-Pendant) | `strike.spec.ts` „Rundreisen mit Re-Import" |
| Risiko 7 (Parser-Validierung assertiert Strike nicht) | 5.3 (beide `external-validation.test.ts`) |
| Risiko 8 (Tastenkürzel) | Entscheidung + Fix 3.5 |
| Risiko 9 (Icon „S") | Abschnitt 7 |
| Risiko 10 / Grenzfall 14 (Touch-/Mobile-Bedienbarkeit) | `strike.spec.ts` describe „Touch/Mobile" (5.2.1), touch-fähige Projekte `Mobile`/`Tablet` |
| Neuer Fund: `<w:rPr>`-Reihenfolge (optional) | Fix 3.2 + optionaler Order-Test in `strike.test.ts` |
| Neuer Fund: Drei-Wege-Kollision `markActive`/`isMarkActive` | Abschnitt 3.6b — blockierende Klärung vor Umsetzung |
| DoD 1 (alle Testfälle ausgeführt/dokumentiert) | diese Tabelle + Testartefakte 5.1–5.3 |
| DoD 2 (jedes Risiko eingestuft) | Abschnitt 3 (behoben / bewusst dokumentiert / bereits korrekt) |
| DoD 3 (E2E-Button-Klick **+ Re-Import**, dauerhaft, DOCX+ODT) | `strike.spec.ts` |
| DoD 4 (Rundreise inkl. realer Fremddatei + gezielte unabh. Validierung) | 5.2/5.3/6, ODT vollständig real; DOCX synthetisch + §9-Vermerk |
| DoD 5 (Tastenkürzel-Entscheidung) | 3.5 (`Mod-Shift-x`) |
| DoD 6 (Aktiv-Zustand `storedMarks`/Selektion) | 3.6 (`markActive`, vorbehaltlich 3.6b) |
| **DoD 7 (reine Tastaturbedienung des Buttons, eigenständiges Kriterium — in der Vorfassung dieses Plans fehlend)** | Fix 3.6a + Testfall 37 (`strike.spec.ts` + `clipboard-roundtrip.spec.ts` 5.2a, inkl. Firefox) |
