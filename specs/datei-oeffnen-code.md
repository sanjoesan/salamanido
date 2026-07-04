# Umsetzungsplan (Code-Ebene): „Datei öffnen/importieren"

Gegenstück zu `specs/datei-oeffnen-req.md`. Dieses Dokument beruht auf
tatsächlicher Durchsicht des Codes im aktuellen Repo-Stand (nicht auf dem
Backlog-Text) und benennt je Befund die konkrete(n) Datei(en)/Zeile(n), das
Problem und die geplante Änderung. Referenzierte Zeilennummern beziehen sich
auf den Stand zum Zeitpunkt dieser Prüfung und können nach ersten Edits
verrutschen — die Funktions-/Variablennamen sind der stabile Anker.

Betroffene Kernbereiche: `src/app/FormatPicker.tsx`, `src/App.tsx`,
`src/app/DocumentWorkspace.tsx`, `src/formats/docx/reader.ts`,
`src/formats/odt/reader.ts`, `src/formats/docx/writer.ts`,
`src/formats/odt/writer.ts`, `src/formats/shared/schema.ts`,
`src/formats/shared/editor/*`, `tests/e2e/*`.

---

## 0. Gesamteinschätzung

Der Bedienweg selbst (`FormatPicker.tsx`) ist überraschend gut: verstecktes
`<input type="file">` pro Karte, `value`-Reset, `files?.[0]`-Only, `try/catch`
in `handleFile`, Fehlerbanner mit exakt dem in Abschnitt 1/2.2 der
Anforderungsdatei geforderten Format, `setError(null)` bei jedem neuen
Versuch (Import **und** „Neu erstellen"), kein globaler Sperr-Zustand. Die
meisten Grenzfälle aus Abschnitt 3 und 5 der Anforderungsdatei sind auf
UI-Ebene bereits korrekt gebaut. **Das eigentliche Risiko liegt nicht im
Auswahl-Dialog, sondern (a) im Fehlen eines Sicherheitsnetzes, falls der
Reader ein Dokument liefert, das der Editor nicht darstellen kann, und (b) in
mehreren stillen Textverlust-Bugs in `reader.ts` (DOCX **und** ODT), die
exakt die in Abschnitt 3.13 der Anforderungsdatei benannten Fälle treffen.**
Zusätzlich referenzieren zwei Unit-Test-Dateien eine E2E-Testdatei, die es im
Repo gar nicht gibt — die „im echten Browser bestätigt"-Aussage zu
Ladezeit/Großdatei ist damit unbelegt.

---

## 1. Kritischer Befund: kein Sicherheitsnetz zwischen Reader und Editor-Mount

**Dateien:** `src/app/FormatPicker.tsx` (Zeilen 14–26), `src/App.tsx`
(komplett), `src/formats/shared/editor/WordEditor.tsx` (Zeilen 62–66).

`FormatPicker.handleFile` fängt nur Fehler ab, die **innerhalb** von
`module.importFile(file)` synchron/als rejected Promise auftreten. Danach
wird `onOpen(module.id, {...})` aufgerufen → `App.tsx` setzt `active` per
`setState` → React rendert `DocumentWorkspace` → dessen `Editor` (`WordEditor`)
ruft in einem `useEffect` `wordSchema.nodeFromJSON(doc.content.body)` auf
(`WordEditor.tsx:65`). Dieser Aufruf läuft **nicht** mehr innerhalb des
`try/catch` von `handleFile` (React batcht das Re-Render nach Abschluss des
Event-Handlers). Liefert `readDocx`/`readOdt` ein JSON, das nicht zu
`wordSchema` passt (unbekannter Node-/Mark-Typ, Attribut verletzt `validate`,
Inhalt verletzt das Content-Model, z. B. ein `text`-Node direkt in
`table_cell` ohne `paragraph`-Hülle), wirft `nodeFromJSON` eine Exception
**nach** dem `onOpen`-Aufruf, mitten im Editor. Es existiert **keine**
`ErrorBoundary` im gesamten `src`-Baum (geprüft, keine Treffer für
`ErrorBoundary`/`componentDidCatch`/`getDerivedStateFromError`). Ergebnis:
weißer Bildschirm / kaputte React-Baum, exakt der in
`datei-oeffnen-req.md` Abschnitt 2.2 Punkt 2 und Punkt 4 explizit als Defekt
benannte Fall („ein Fehler, der erst nach dem `onOpen`-Aufruf im Editor
selbst auftritt, gilt als Defekt").

Das ist heute kein theoretisches Risiko: Jeder der unten in Abschnitt 2–4
beschriebenen Reader-Bugs kann (bzw. wird nach der Reparatur, siehe neuer
`unsupported_block`-Node) genau so ein JSON erzeugen, wenn irgendwo ein
Attribut/Node-Typ nicht exakt zum Schema passt — ein einziger vergessener
Fall reicht für einen kompletten Absturz statt einer Fehlermeldung.

### Geplante Änderung

1. **Neu:** `src/formats/shared/validateDocument.ts`
   ```ts
   import { wordSchema } from './schema'
   import type { WordDocumentContent } from './documentModel'

   /** Throws a readable German error if the parsed content cannot be loaded
    *  into the shared ProseMirror schema — converts a would-be white-screen
    *  crash deep in the editor mount into a normal, catchable import error. */
   export function assertLoadableDocument(content: WordDocumentContent): void {
     try {
       wordSchema.nodeFromJSON(content.body).check()
       if (content.header) wordSchema.nodeFromJSON(content.header).check()
       if (content.footer) wordSchema.nodeFromJSON(content.footer).check()
     } catch (err) {
       throw new Error(
         `Dokumentstruktur ist mit dem Editor nicht kompatibel: ${err instanceof Error ? err.message : String(err)}`,
       )
     }
   }
   ```
2. **Ändern:** `src/formats/docx/reader.ts`, Ende von `readDocx` (vor dem
   finalen `return`) und `src/formats/odt/reader.ts`, Ende von `readOdt` —
   `assertLoadableDocument(result)` aufrufen, bevor der Wert zurückgegeben
   wird. Damit landet ein Schema-Mismatch wieder im normalen, bereits
   getesteten Fehlerpfad von `FormatPicker.handleFile` (Fehlerbanner, kein
   Editor-Mount).
3. **Neu (Verteidigung in der Tiefe):** `src/app/EditorErrorBoundary.tsx` —
   Klassenkomponente mit `getDerivedStateFromError`/`componentDidCatch`, die
   im Fehlerfall **nicht** den ganzen Baum leer rendert, sondern ein
   `onCrash`-Callback aufruft (→ zurück zum `FormatPicker` inkl. Fehlerbanner,
   analog zu einem fehlgeschlagenen Import) statt nur eine generische
   Absturz-UI zu zeigen.
4. **Ändern:** `src/App.tsx` — `DocumentWorkspace` mit
   `<EditorErrorBoundary onCrash={(message) => { setActive(null); setCrashError(message) }}>`
   umschließen; `crashError` wird beim nächsten Rendern des `FormatPicker`
   als Fehlerbanner durchgereicht (neue, optionale Prop `initialError` an
   `FormatPicker`, die beim ersten erfolgreichen neuen Importversuch wie
   gehabt durch `setError(null)` gelöscht wird). Dies deckt auch
   Fehlerquellen ab, die **nicht** aus dem Reader stammen (z. B. künftige
   Pagination-/Tabellen-Edge-Cases), und ist damit die einzige Absicherung,
   die alle in Abschnitt 2.2 Punkt 4 gemeinten Fälle abdeckt, nicht nur den
   Schema-Fall.
5. **Test:** `src/app/__tests__/App.test.tsx` (neu, falls es noch keinen
   gibt — aktuell existiert nur `src/App.test.tsx`, prüfen und ggf. dort
   ergänzen) — Testfall: `editor`-Prop eines Fake-Moduls wirft beim Mounten,
   Assertion, dass danach wieder der `FormatPicker` mit Fehlermeldung sichtbar
   ist und **keine** unbehandelte Exception den Testlauf abbricht.

---

## 2. DOCX-Reader: stiller Textverlust bei Hyperlinks, Änderungsverfolgung, Inhaltssteuerelementen, Feldern

**Datei:** `src/formats/docx/reader.ts`, Funktion `decodeParagraphRuns`
(Zeilen 124–143).

```ts
function decodeParagraphRuns(pEl: Element): RunLike[] {
  const runs: RunLike[] = []
  for (const rEl of childElements(pEl, OOXML_NAMESPACES.w, 'r')) { … }
  return runs
}
```

`childElements` liefert **nur direkte Kind-Elemente**. In echten Word-Dateien
ist ein Textlauf (`<w:r>`) aber sehr häufig **nicht** direktes Kind von
`<w:p>`, sondern eingebettet in:

- `<w:hyperlink>` — jeder Link (Standardfall in praktisch jedem realen
  Dokument, z. B. E-Mail-/Web-Adressen),
- `<w:ins>` — angenommene Einfügung bei Änderungsverfolgung (der Text ist
  sichtbarer, akzeptierter Inhalt),
- `<w:smartTag>`,
- `<w:sdt>`/`<w:sdtContent>` — Inhaltssteuerelemente (z. B. Dropdowns,
  Datumsfelder, häufig in Vorlagen-basierten Dokumenten),
- `<w:fldSimple>` — einfache Felder (Seitenzahl, Datum, TOC-Eintrag als
  Cache-Text); Fixture `FldSimple.docx` liegt bereits unter
  `tests/fixtures/external/docx/` und wird aktuell nur auf „stürzt nicht ab"
  geprüft, nicht auf Textinhalt.

In all diesen Fällen wird der enthaltene Text heute **komplett und
stillschweigend verworfen** — nicht nur vereinfacht dargestellt, sondern
vollständig gelöscht. Das ist ein direkter Verstoß gegen
`datei-oeffnen-req.md` Abschnitt 2.3 („Inhalt … strukturell korrekt
zugeordnet") und Abschnitt 3.13 („kein stiller Textverlust"), und gefährdet
Abschnitt 6 Kriterium 1 (zeichengetreuer Text) für jede realistische
Testdatei, die auch nur einen Hyperlink enthält.

Zusätzlich, im selben Bereich: `<w:pict>` (Legacy-VML-Zeichnungen, z. B. aus
älteren Word-Versionen oder Outlook-Signaturen exportiert) wird in der
Run-Kind-Erkennung (Zeilen 129–139: nur `w:t`, `w:br`, `w:drawing` werden
erkannt) **gar nicht** behandelt — auch hier kompletter, stiller Verlust von
Bild/Text.

**Wichtige Abgrenzung:** `specs/hyperlink-einfuegen-req.md` behandelt das
*Feature* „Link einfügen/bearbeiten/entfernen" bereits als eigenen,
separaten Backlog-Eintrag inkl. eigenem Datenmodell-Vorschlag (Mark im
Schema). Diese Datei hier soll **nicht** dieses Feature vorwegnehmen —
lediglich sicherstellen, dass der **sichtbare Text** eines Hyperlinks (bzw.
Feldresultats, Content-Control-Inhalts) beim Import nicht verschwindet.
Solange es keinen `link`-Mark im Schema gibt, wird der Linktext daher als
**einfacher Text ohne Mark** importiert (URL/Ziel geht dabei bewusst noch
verloren — das ist der Umfang von `hyperlink-einfuegen`, nicht von dieser
Datei). Nach Umsetzung von `hyperlink-einfuegen` sollte `reader.ts` erneut
angefasst werden, um stattdessen den dann existierenden Mark zu setzen.

### Geplante Änderung

1. **Refactor** `decodeParagraphRuns` in zwei Funktionen:
   - `collectRuns(container: Element, runs: RunLike[]): void` — iteriert
     `Array.from(container.children)` und behandelt:
     - `w:r` → wie bisher (ausgelagert in `decodeRunElement`),
     - `w:del` → **überspringen** (gelöschter Änderungsverfolgungs-Text darf
       nicht wieder sichtbar werden),
     - `w:ins`, `w:hyperlink`, `w:smartTag` → rekursiv `collectRuns(child, …)`,
     - `w:sdt` → `firstChildNS(child, w, 'sdtContent')` suchen und, falls
       vorhanden, rekursiv hineingehen,
     - `w:fldSimple` → rekursiv `collectRuns(child, …)` (Cache-Text der
       Feldresultate wie Seitenzahl/TOC-Eintrag bleibt sichtbar, das
       Feld-Verhalten selbst bleibt weiterhin unterstützt-„vereinfacht").
   - `decodeParagraphRuns(pEl)` ruft nur noch `collectRuns(pEl, runs)` auf.
2. **Ergänzen:** Behandlung von `w:pict` in `decodeRunElement` — Suche nach
   `v:imagedata` (Bild, `r:id`-Attribut über bereits vorhandene
   `documentRels`-Auflösung wie bei `w:drawing`/`a:blip`) bzw.
   `w:txbxContent` innerhalb `v:textbox` (Textfeld, siehe Punkt 3). Dafür in
   `src/formats/docx/xmlUtil.ts` `OOXML_NAMESPACES` um
   `vml: 'urn:schemas-microsoft-com:vml'` ergänzen.
3. **Test-Ergänzung:** `src/formats/docx/__tests__/external-fixtures.test.ts`
   — für `FieldCodes.docx` und `FldSimple.docx` zusätzlich zur
   Crash-Freiheit prüfen, dass `doc.body` **nicht leer** ist bzw. dass der
   erwartete Cache-Text vorkommt (statt nur `paragraphCount`).
4. **Neuer Test:** Hand-gebaute Fixture mit `<w:hyperlink>` (analog
   `buildSampleDocx` in `tests/e2e/docx.spec.ts`) — Regressionstest, dass der
   Linktext nach Import im Editor sichtbar ist.

---

## 3. DOCX-Reader: Textfelder/Formen/eingebettete Objekte ohne `a:blip` erzeugen leere Bild-Platzhalter statt Text/Platzhalter

**Datei:** `src/formats/docx/reader.ts`, `decodeParagraphRuns` Zeilen
134–139:

```ts
} else if (child.namespaceURI === OOXML_NAMESPACES.w && child.localName === 'drawing') {
  const blip = child.getElementsByTagNameNS(OOXML_NAMESPACES.a, 'blip')[0]
  const relId = blip?.getAttributeNS(OOXML_NAMESPACES.r, 'embed') ?? undefined
  const docPr = child.getElementsByTagNameNS(OOXML_NAMESPACES.wp, 'docPr')[0]
  runs.push({ kind: 'image', imageRelId: relId, imageAlt: docPr?.getAttribute('name') ?? '' })
}
```

Jedes `<w:drawing>` wird bedingungslos als `image`-Run behandelt — auch wenn
gar kein `a:blip` existiert (typisch für Textfelder/Formen via
`mc:AlternateContent`/`wps:txbx`, Diagramme, OLE-Objekte ohne Vorschaubild).
In diesem Fall ist `relId` `undefined`, `resolveImageSources` (Zeilen
285–305) findet kein Zip-Entry, `node.attrs.src` bleibt `''` — es entsteht
ein **leeres Bild** im Dokument, und jeglicher Text, der z. B. in einem
Textfeld (`w:txbxContent`) steht, verschwindet ersatzlos. Das ist exakt der
in `datei-oeffnen-req.md` Abschnitt 3.13 wörtlich genannte Grenzfall
(„eingebettete Diagramme/OLE" sowie implizit Textfelder, da diese ebenfalls
über `w:drawing`/`w:pict` transportiert werden) und verstößt gegen den dort
geforderten Platzhalter („Nicht unterstützte Objekte erhalten einen
Platzhalter statt ersatzlos zu verschwinden").

### Geplante Änderung

1. **Neuer Node im Schema** (siehe Abschnitt 6 dieses Dokuments):
   `unsupported_block`.
2. **Ändern** `decodeRunElement`/`collectRuns`: Beim Verarbeiten von
   `w:drawing` (bzw. `w:pict`) in dieser Reihenfolge prüfen:
   - `a:blip` (bzw. `v:imagedata`) vorhanden → wie bisher `image`-Run.
   - sonst: `child.getElementsByTagNameNS(OOXML_NAMESPACES.w, 'txbxContent')[0]`
     suchen (funktioniert unverändert sowohl für moderne
     `wps:txbx`-Textfelder als auch für die VML-Legacy-Form `v:textbox`,
     weil `w:txbxContent` in beiden Fällen im `w:`-Namensraum liegt) → falls
     gefunden, dessen `<w:p>`-Kinder mit der bestehenden `paragraphToBlocks`
     verarbeiten und als neuer Run-Typ `{ kind: 'unsupported', unsupportedKind: 'textbox', unsupportedBlocks }`
     zurückgeben (braucht `headingInfo`/`imageRels` als zusätzliche
     Parameter für `decodeParagraphRuns`/`collectRuns`/`decodeRunElement` —
     Signaturänderung durchreichen).
   - sonst (Diagramm/OLE ohne jede extrahierbare Textstruktur) →
     `{ kind: 'unsupported', unsupportedKind: 'object' }` ohne `unsupportedBlocks`.
3. **Ändern** `paragraphToBlocks` (Zeilen 146–183): Die bestehende
   Sonderbehandlung für `hasImage` (Absatz wird bei Bild-Runs aufgeteilt) auf
   `kind === 'image' || kind === 'unsupported'` erweitern; im
   `unsupported`-Zweig einen `unsupported_block`-Node mit
   `attrs: { kind: run.unsupportedKind }` und
   `content: run.unsupportedBlocks?.length ? run.unsupportedBlocks : [emptyParagraph()]`
   einfügen (Hilfsfunktion `emptyParagraph()` analog zu
   `documentModel.ts:emptyDocJSON`, da `block+`-Content mindestens einen
   Block braucht).
4. **Rekursionsschutz:** Textfelder in Textfeldern nicht weiter auflösen
   (nur eine Verschachtelungsebene), analog zum bestehenden
   `MAX_TABLE_NESTING_DEPTH`-Muster (Zeile 208), um pathologische Dateien
   nicht in eine Endlosrekursion zu schicken.

---

## 4. ODT-Reader: unbekannte Inline-Elemente werden verworfen statt entpackt

**Datei:** `src/formats/odt/reader.ts`, Funktion `decodeInline`, `walk()`
(Zeilen 96–116):

```ts
function walk(node: ChildNode, marks) {
  if (TEXT_NODE) { … push text … ; return }
  if (!ELEMENT_NODE) return
  if (text:span) { … rekursion … }
  else if (text:line-break) { … }
  else if (text:s) { … }
  else if (text:tab) { … }
  // kein else-Zweig — jedes andere Element wird stillschweigend ignoriert,
  // OHNE in seine Kind-Knoten hinabzusteigen.
}
```

Jedes Inline-Element, das keiner der vier behandelten Fälle entspricht, wird
komplett verworfen — inklusive seines gesamten Textinhalts, weil `walk` bei
unbekannten Elementen **nicht in die Kinder absteigt**. Betroffen unter
anderem:

- `<text:a>` — Hyperlink (Standardfall, s. o. dieselbe Abgrenzung zu
  `hyperlink-einfuegen-req.md` wie bei DOCX: Text bleibt, Ziel-URL bleibt
  bewusst außerhalb des Scopes dieser Datei),
- `<text:placeholder>`, `<text:date>`, `<text:page-number>`,
  `<text:page-count>`, `<text:author-name>` — genau die in
  `datei-oeffnen-req.md` Abschnitt 3.13 wörtlich benannten Fälle
  „`text:placeholder`, `text:date`",
- `<text:note>` (Fußnoten-Anker + `text:note-citation`/`text:note-body`) —
  Fußnoten sind laut `FEATURE-SPEC-DOCX-ODT.md` ein eigenes Feature
  (`fussnote-einfuegen`), aber der reine Lauftext darf beim *Import* nicht
  ersatzlos verschwinden.

Fixture `Hyperlink-AOO401.odt` liegt bereits unter
`tests/fixtures/external/odt/`, wird aber im bestehenden
`external-fixtures.test.ts` nur auf Crash-Freiheit geprüft, nicht auf
erhaltenen Linktext — der Bug fällt daher aktuell durch kein Testnetz.

### Geplante Änderung

1. **Ändern** `walk()`: expliziten `else`-Fallback ergänzen, der bei jedem
   nicht erkannten Element rekursiv in `Array.from(el.childNodes)` absteigt
   (mit denselben `marks` wie am aktuellen Knoten), **außer** bei
   nachweislich leeren Redline-Markern (`text:change`, `text:change-start`,
   `text:change-end`, `text:bookmark`, `text:bookmark-start`,
   `text:bookmark-end` — diese haben laut ODF-Schema ohnehin keine
   Kind-Inhalte, der Ausschluss dient nur der Lesbarkeit/Dokumentation).
2. **Test-Ergänzung:** `src/formats/odt/__tests__/external-fixtures.test.ts`
   — für `Hyperlink-AOO401.odt` zusätzliche Assertion, dass der erwartete
   Linktext in `doc.body` vorkommt (nicht nur „stürzt nicht ab").
3. **Neuer Unit-Test** in einer neuen Datei
   `src/formats/odt/__tests__/reader.test.ts` (hand-gebautes `content.xml`
   mit `text:placeholder`/`text:date` analog zum Muster in
   `tests/e2e/odt.spec.ts`s `buildSampleOdt`) — Regressionstest für genau
   den in Abschnitt 3.13 benannten Fall.

---

## 5. ODT-Reader: `draw:frame`-Textboxen ohne `draw:image` erzeugen leere Bild-Nodes; seitenverankerte Rahmen werden komplett ignoriert

**Datei:** `src/formats/odt/reader.ts`, `paragraphToBlocks` (Zeilen
122–157) und `elementToBlocks` (Zeilen 164–206).

**Bug A (explizit im Anforderungsdokument genannt, 3.13 „`draw:frame`-Textbox"):**
In `paragraphToBlocks` (Zeilen 144–153) wird für **jeden** `draw:frame`
bedingungslos versucht, ein `draw:image`-Kind zu finden und dessen `href` als
Bildquelle zu nehmen:

```ts
const imageEl = firstChildNS(child as Element, ODF_NAMESPACES.draw, 'image')
const href = imageEl?.getAttributeNS(ODF_NAMESPACES.xlink, 'href') ?? ''
blocks.push({ type: 'image', attrs: { src: href, alt: … } })
```

Ein reines Textfeld (`draw:frame > draw:text-box > text:p …`, kein
`draw:image`-Kind) erzeugt dadurch ein **Bild-Node mit leerem `src`** — der
komplette Text im Textfeld verschwindet. Fixture `FrameWithTable.odt` liegt
bereits unter `tests/fixtures/external/odt/` und eignet sich als
Regressionsfixture.

**Bug B (zusätzlich gefunden, nicht in der Anforderungsdatei explizit
benannt, aber derselbe Grundsatz):** `elementToBlocks` (Dispatcher für
direkte Kinder von `office:text`, Tabellenzellen, Listeneinträgen) kennt nur
`text:p`, `text:h`, `text:list`, `table:table` (Zeilen 168–203) und fällt für
alles andere auf `return []` zurück (Zeile 205). Ein seitenverankerter
`draw:frame` (`text:anchor-type="page"`), der laut ODF-Schema **direkt** als
Kind von `office:text` auftreten darf (nicht in einen `text:p` eingebettet),
wird dadurch komplett ignoriert — Bild **und** ein eventuelles Textfeld
gehen ersatzlos verloren, ohne dass überhaupt der bestehende (fehlerhafte)
Bild-Pfad aus Bug A greift.

### Geplante Änderung

1. **Extrahieren** einer gemeinsamen Hilfsfunktion
   `frameToBlocks(frameEl: Element, styles: ParsedStyles): JsonNode[]` in
   `src/formats/odt/reader.ts`:
   - `draw:image`-Kind vorhanden → wie bisher `image`-Node.
   - sonst `draw:text-box`-Kind vorhanden → dessen Kinder mit
     `elementToBlocks` verarbeiten und als
     `{ type: 'unsupported_block', attrs: { kind: 'textbox' }, content: … }`
     zurückgeben (Fallback auf eine leere `paragraph`, falls die Textbox
     leer ist).
   - sonst → `{ type: 'unsupported_block', attrs: { kind: 'object' }, content: [emptyParagraph()] }`.
2. **Ändern** `paragraphToBlocks`: den Inline-Frame-Zweig (Zeilen 144–153)
   auf `frameToBlocks(...)` umstellen.
3. **Ändern** `elementToBlocks`: neuen Fall
   `if (ns === draw && local === 'frame') return frameToBlocks(el, styles)`
   ergänzen, damit seitenverankerte Rahmen nicht mehr auf `[]` fallen.
4. **Test-Ergänzung:** `FrameWithTable.odt` in
   `src/formats/odt/__tests__/external-fixtures.test.ts` explizit auf
   „Text bleibt auffindbar" statt nur „stürzt nicht ab" prüfen; neuer
   Playwright-Test (siehe Abschnitt 8) mit einer selbstgebauten ODT-Datei,
   die ein reines Textfeld enthält.

---

## 6. Neuer Schema-Node: `unsupported_block` (Platzhalter für nicht unterstützte Objekte)

**Datei:** `src/formats/shared/schema.ts`.

Aktuell gibt es im Schema **keinen** Node-Typ, der „ich konnte dieses Element
nicht vollständig interpretieren, hier ist wenigstens der Text" ausdrücken
kann — jedes nicht erkannte Konstrukt verschwindet heute komplett (siehe
Abschnitt 3 und 5). Das widerspricht `datei-oeffnen-req.md` Abschnitt 3.13
Satz 2 explizit.

### Geplante Änderung

1. **Neuer Node** (nach `image`, vor `bullet_list` einfügen, Zeile ~73):
   ```ts
   unsupported_block: {
     group: 'block',
     content: 'block+',
     attrs: { kind: { default: 'object', validate: 'string' } },
     parseDOM: [
       {
         tag: 'div[data-unsupported-kind]',
         getAttrs: (dom) => ({ kind: (dom as HTMLElement).dataset.unsupportedKind || 'object' }),
       },
     ],
     toDOM(node) {
       return [
         'div',
         {
           class: 'unsupported-block',
           'data-unsupported-kind': node.attrs.kind,
           title: UNSUPPORTED_KIND_LABEL[node.attrs.kind as string] ?? UNSUPPORTED_KIND_LABEL.object,
         },
         0,
       ]
     },
   },
   ```
   plus eine kleine exportierte Lookup-Tabelle
   `UNSUPPORTED_KIND_LABEL: Record<string, string>` mit z. B.
   `{ textbox: 'Textfeld — vereinfacht dargestellt', object: 'Eingebettetes Objekt — nicht unterstützt', chart: 'Diagramm — nicht unterstützt' }`
   für Tooltip/Screenreader-Text.
2. **CSS-Ergänzung** in `src/index.css`: gestrichelter Rahmen + dezenter
   Hintergrund für `.unsupported-block`, damit Nutzer:innen optisch erkennen,
   dass hier vereinfacht wurde (kein hartes Anforderungskriterium, aber im
   Sinne von „nicht kommentarlos wie normaler Text erscheinen").
3. **Bewusst keine Toolbar-Änderung.** Der Node wird ausschließlich vom
   Reader erzeugt, nicht von Nutzer:innen manuell eingefügt — er braucht
   daher keinen eigenen Toolbar-Button. Er ist ein normaler Block mit
   editierbarem `block+`-Inhalt (Text kann direkt darin bearbeitet, die
   Absätze können mit den bestehenden Absatz-Commands aus `commands.ts`
   formatiert werden) und lässt sich wie jeder andere Block per
   `Backspace`/Standard-ProseMirror-Verhalten löschen — keine neuen Commands
   nötig.
4. **Schema-Validierung nutzen:** Da dieser Node absichtlich sehr
   permissiv ist (`block+`), kann `assertLoadableDocument` (Abschnitt 1)
   zuverlässig prüfen, dass der Reader auch wirklich immer mindestens einen
   validen Block hineinlegt (leere Content-Arrays würden sonst am
   `block+`-Content-Model scheitern und — ohne die Absicherung aus
   Abschnitt 1 — erneut zum weißen Bildschirm führen).

---

## 7. Writer-Anpassung: `unsupported_block` beim Export sicher entpacken

**Dateien:** `src/formats/docx/writer.ts`, `blockToDocx` (Zeilen 94–126,
`default: return ''`); `src/formats/odt/writer.ts`, `blockToOdt` (Zeilen
61–123, `default: return ''`).

Beide Writer haben aktuell einen stillen `default`-Fall: Ein unbekannter
Node-Typ wird zu einem leeren String — für den neuen `unsupported_block`
hieße das, dass sein kompletter (gerade erst geretteter!) Inhalt beim ersten
Export wieder verloren ginge. Das würde die Rundreise-Anforderung
(`datei-oeffnen-req.md` Abschnitt 6) für genau die Dateien brechen, die
Abschnitt 3.13 abdecken soll.

### Geplante Änderung

1. **Ändern** `blockToDocx`/`blockToOdt`: neuen `case 'unsupported_block':`
   ergänzen, der den Inhalt **entpackt** exportiert (die Kind-Blöcke werden
   wie normale Absätze/Listen/Bilder geschrieben, der „nicht unterstützt"-
   Rahmen selbst geht beim Export bewusst verloren — das ist unschädlich,
   weil Abschnitt 6 der Anforderungsdatei nur Text/Struktur/Formatierung/
   Bilder/Metadaten/Dateiname/Absturzfreiheit verlangt, nicht den Erhalt des
   Platzhalter-Charakters selbst):
   ```ts
   case 'unsupported_block':
     return blocksToDocx(node.content, images, rels) // bzw. blocksToOdt(...)
   ```
2. **Test-Ergänzung:** neuer Fall in
   `src/formats/docx/__tests__/roundtrip.test.ts` und
   `src/formats/odt/__tests__/roundtrip.test.ts`: ein `unsupported_block`
   mit Absatztext im Ausgangsdokument, Assertion, dass nach
   Schreiben→Lesen der Text weiterhin vorhanden ist (auch wenn er jetzt als
   normaler `paragraph` zurückkommt, nicht mehr als `unsupported_block` —
   das ist das erwartete, akzeptierte Verhalten).

---

## 8. Fehlende bzw. irreführende Tests

### 8.1 Referenzierte, aber nicht existierende E2E-Testdatei

**Dateien:** `src/formats/docx/__tests__/external-fixtures.test.ts` (Zeilen
34–40, Kommentar zu `bug65649.docx`), `src/formats/odt/__tests__/external-fixtures.test.ts`
(Zeilen 12–17, Kommentar zu `brokenList.odt`).

Beide Kommentare behaupten, ein „dedizierter Playwright/Chromium-Lauf" habe
bestätigt, dass der Import in `tests/e2e/large-document-import.spec.ts` ca.
1,9 s (DOCX) bzw. 575 ms (ODT) dauert — **diese Datei existiert im Repo
nicht** (geprüft: `tests/e2e/` enthält nur `docx.spec.ts`, `odt.spec.ts`,
`lifecycle.spec.ts`, `selection-regression.spec.ts`). Damit ist die zentrale
Performance-/Nicht-Einfrieren-Anforderung aus `datei-oeffnen-req.md`
Abschnitt 2.1 Punkt 6 und Abschnitt 3.6 aktuell **durch keinen einzigen
realen Browser-Test belegt** — nur durch einen Kommentar, der auf eine
nicht existierende Datei verweist. Das ist bezogen auf die Anforderungsdatei
(„nicht vertrauenswürdig, bis per echter Browser-Bedienung nachgewiesen")
selbst genau der Fehler, den die Anforderungsdatei kritisiert.

**Geplante Änderung:** `tests/e2e/large-document-import.spec.ts` (neu)
anlegen:
- Für DOCX: `tests/fixtures/external/docx/bug65649.docx` (bzw. eine
  generierte große Datei mit vielen Absätzen + mehreren eingebetteten
  Bildern, falls die Fixture zu groß fürs Repo-Diff sein soll) über den
  echten Upload-Weg hochladen, Zeit von `setInputFiles` bis sichtbarem
  Editor-Inhalt (`await expect(editor).toBeVisible()` +
  `await expect(editor).toContainText(...)`) messen und protokollieren
  (nicht zwingend hart auf <3 s assertieren, da CI-Runner variieren —
  aber zumindest einen oberen Zeit-Deckel von z. B. 15 s als
  Realitäts-Check).
- Prüfen, dass die Seite währenddessen nicht „nicht mehr reagiert" (z. B.
  ein `page.evaluate(() => document.title)` unmittelbar nach dem Upload
  erfolgreich zurückkehrt, als Proxy für „Tab nicht eingefroren").
- Analoger Fall für ODT mit `brokenList.odt`.
- Danach die o. g. Kommentare in beiden `external-fixtures.test.ts`-Dateien
  entweder bestätigen (Datei existiert jetzt wirklich) oder — falls die
  gemessenen Werte abweichen — korrigieren.

### 8.2 Abschnitt-3/5-Grenzfälle: nur teilweise als echter Browser-Test vorhanden

`datei-oeffnen-req.md` Abschnitt 7 Punkt 1 verlangt für **jeden** Punkt aus
Abschnitt 3 und 5 einen echten, im Browser ausgeführten Test — nicht nur
einen Reader/Writer-Unit-Test. Abgleich mit dem tatsächlichen Bestand:

| # | Fall | Aktueller Stand | Geplante Ergänzung |
|---|---|---|---|
| 3.1 | Kein Zip-Container | nur Vitest/jsdom (`external-fixtures.test.ts` deckt kaputte Zips indirekt über Fuzzer-Fixtures ab) | E2E: Textdatei mit `.docx`-Endung hochladen, Fehlerbanner prüfen |
| 3.2 | Zip ohne `document.xml`/`content.xml` | nur Unit-Test | E2E: leeres Zip hochladen, exakte Fehlermeldung prüfen |
| 3.3 | Falsche Endung, richtiger Inhalt | nicht getestet | E2E: `beispiel.docx`-Inhalt als `.txt` umbenannt hochladen (über gelockerten `setInputFiles`, der `accept` umgeht) |
| 3.4 | Format auf falscher Karte | nicht getestet | E2E: ODT-Buffer über DOCX-Karten-`<input>` hochladen, exakte deutsche Fehlermeldung prüfen (und umgekehrt) |
| 3.5 | 0-Byte-Datei | nicht getestet | E2E: leere `File` hochladen |
| 3.6 | Große Datei | nur per Kommentar behauptet (siehe 8.1) | siehe 8.1 |
| 3.7 | Sonderzeichen im Dateinamen | nicht getestet | E2E: `Bewerbung Müller & Co (Entwurf).docx` hochladen, Titel-Anzeige prüfen |
| 3.8 | Doppelte/keine Endung | nicht getestet | E2E: `Vertrag` bzw. `Vertrag.docx.docx` hochladen |
| 3.9 | Passwortgeschützt | nur Unit-Test (Fixtures vorhanden) | E2E: eine der vorhandenen Passwort-Fixtures hochladen, Fehlerbanner statt Absturz prüfen |
| 3.10 | `.doc`/`.rtf` als `.docx` | nicht getestet | E2E mit einer echten `.doc`-Datei, umbenannt |
| 3.11 | Dialog-Abbruch | nicht sinnvoll voll automatisierbar (native OS-Dialoge sind von Playwright nicht steuerbar) | Als bekannte Grenze dokumentieren; ersatzweise Test, dass **kein** `onChange`-Effekt eintritt, wenn kein `filechooser`-Event mit Datei beantwortet wird |
| 3.12 | Zwei parallele Importe | nicht getestet | E2E: zwei `setInputFiles`-Aufrufe kurz hintereinander (unterschiedliche Module/Dateien), Assertion auf deterministischen Endzustand + keine Konsolen-Fehler |
| 3.13 | Fremd-Elemente (Textbox, Feld, Platzhalter, mehrspaltig, OLE) | nicht getestet | E2E-Fixtures wie in Abschnitt 2–5 dieses Dokuments beschrieben |
| 3.14 | Verschachtelte Tabelle | nur Unit-Test (Tiefenschutz) | E2E mit `tests/fixtures/external/docx`-Datei, die verschachtelte Tabellen enthält (Suche in Fixture-Ordner nötig) |
| 3.15 | Nur Whitespace, valide Struktur | nicht getestet | E2E: minimal-valide Datei mit leerem `<w:body><w:p/></w:body>` |
| 3.16 | Mehrfachauswahl | nicht getestet (Code ist aber bereits korrekt: `files?.[0]`) | E2E: `setInputFiles` mit Array aus zwei Dateien, Assertion, dass nur die erste geladen wird |
| 3.17 | Re-Import nach Schließen | nicht getestet | E2E: Dokument öffnen → „← Formate" → zweites Dokument hochladen, Assertion auf sauberen Zustand |
| 5.1 | Klick trotz sichtbarem Fehlerbanner | nicht getestet | E2E |
| 5.2 | Tastaturbedienung (Tab/Enter/Space) | nicht getestet | E2E mit `page.waitForEvent('filechooser')` nach `keyboard.press('Enter')` auf fokussiertem Button |
| 5.3 | Fokus nach Dialog-Abbruch | nur eingeschränkt automatisierbar (nativer Dialog) | Playwright kann `filechooser.setFiles()` auslassen/`page.on('filechooser')` ignorieren, um „Abbruch" zu simulieren, und danach `document.activeElement` prüfen |
| 5.4 | Eindeutige Kartenbeschriftung | trivial durch bestehende E2E-Tests mitabgedeckt (Card-Locator nutzt exakten Titeltext) | keine zusätzliche Datei nötig |

**Geplante neue Testdateien:**
- `tests/e2e/file-open-edge-cases.spec.ts` — deckt 3.1–3.12, 3.15–3.17 sowie
  Abschnitt 5 komplett ab (formatunabhängige Bedienlogik).
- `tests/e2e/complex-import-fidelity.spec.ts` — deckt 3.13/3.14 ab (je eine
  hand- oder fixture-basierte Datei pro Unterfall, DOCX **und** ODT).
- `tests/e2e/large-document-import.spec.ts` — siehe 8.1.
- `tests/e2e/roundtrip-fidelity.spec.ts` — siehe Abschnitt 9 (Rundreise nach
  Abschnitt 6 der Anforderungsdatei).

---

## 9. Rundreise-Anforderung (Abschnitt 6 der Anforderungsdatei): fehlender Gesamt-Test

Aktuell prüfen `tests/e2e/docx.spec.ts` und `tests/e2e/odt.spec.ts` jeweils
nur eine **triviale** Ein-Satz-Datei (Überschrift + ein fettes Wort) im
Roundtrip — das erfüllt nicht die in `datei-oeffnen-req.md` Abschnitt 6
„Testdaten-Anforderung" geforderte Mindestkomplexität (Überschriften,
mehrstufige Liste, Tabelle mit verbundenen Zellen, mindestens ein Bild,
gemischte Zeichenformatierung in einem Textlauf — alles in **einer**
Testdatei je Format).

### Geplante Änderung

1. **Neue Fixtures:** entweder das bereits vorhandene `test.odt` im
   Repo-Root (laut Anforderungsdatei als Ausgangsbasis genannt) direkt
   verwenden/erweitern, oder — bevorzugt, um Formate synchron zu halten —
   zwei neue, programmatisch in der Testdatei selbst gebaute Dokumente
   (analog zu `buildSampleDocx`/`buildSampleOdt`, aber mit allen fünf
   geforderten Merkmalen kombiniert), damit DOCX und ODT exakt vergleichbar
   sind und die Datei nicht von einer externen Binärdatei im Repo abhängt.
2. **Neuer Test** `tests/e2e/roundtrip-fidelity.spec.ts`:
   - Hochladen → sofort (ohne Änderung) exportieren → Ergebnisdatei erneut
     über denselben Upload-Weg importieren.
   - Kriterium 1 (Text): alle Absatz-/Zellen-/Listentexte per
     `editor.textContent()` vor/nach vergleichen.
   - Kriterium 2 (Struktur): `h1`–`h6`-Tags, `ul`/`ol`, Tabellenzeilen/-spalten
     und `colspan`/`rowspan`-Attribute im gerenderten DOM vor/nach
     vergleichen.
   - Kriterium 3 (Zeichenformatierung): `<strong>`/`<em>`/`<u>`/`<s>` sowie
     `style="color: …"`/Hervorhebung je Textlauf position-treu vergleichen
     (nicht nur „kommt irgendwo vor").
   - Kriterium 4 (Absatzausrichtung): `style="text-align: …"` je Absatz.
   - Kriterium 5 (Bilder): Anzahl `img`-Elemente, Reihenfolge im Textfluss,
     sowie Byte-Vergleich der eingebetteten Bilddaten (aus der
     exportierten Zip-Datei extrahiert) gegen das Original.
   - Kriterium 6 (Metadaten): Titel aus `docProps/core.xml` bzw. `meta.xml`
     der Ausgangsdatei mit dem der Ergebnisdatei vergleichen.
   - Kriterium 7 (Dateiname): vorgeschlagener Download-Dateiname (aus
     `download.suggestedFilename()`) gegen Originalnamen + Zielendung
     prüfen.
   - Kriterium 8 (Absturzfreiheit): `page.on('console', ...)` und
     `page.on('pageerror', ...)`-Listener über den gesamten Testlauf, harte
     Assertion auf 0 Treffer.
   - Matrix: DOCX→DOCX und ODT→ODT (siehe Pflicht-Tabelle in
     `datei-oeffnen-req.md` Abschnitt 6) — Cross-Format-Zeilen bewusst
     ausgelassen, da `speichern-unter-format` laut Backlog noch fehlt.

---

## 10. Kleinere, nicht blockierende Beobachtungen (zur Kenntnis, kein eigener Task in dieser Datei)

1. **Externe (nicht eingebettete) Bilder.** `resolveImageSources` in
   `docx/reader.ts` (Zeilen 285–305) und `odt/reader.ts` (Zeilen 208–231)
   findet nur Bilder, die als Zip-Eintrag vorliegen. Ein per
   `TargetMode="External"` verlinktes (nicht eingebettetes) Bild bleibt als
   roher Pfad/URL in `attrs.src` stehen; exportiert man ein so importiertes
   Dokument unverändert wieder, wirft `ImageCollector.add`
   (`docx/imageCollector.ts:20`, `odt/imageCollector.ts` analog) eine
   Exception („Bilder müssen als data-URL vorliegen …"), die zwar von
   `DocumentWorkspace.handleExport`s `try/catch` sauber aufgefangen wird
   (kein Absturz), aber die Rundreise-Anforderung (Abschnitt 6, Kriterium 8
   „kein Absturz" ist zwar erfüllt, aber der Export selbst schlägt fehl statt
   zu gelingen) verletzt. Da echte externe Bildverknüpfungen in der Praxis
   selten sind und nicht in der Testdaten-Anforderung von Abschnitt 6
   gefordert werden, wird dies hier nur dokumentiert, nicht behoben —
   Vorschlag für einen Folge-Task: externe Bild-URLs entweder beim Import
   per `fetch` nachladen (bricht das „kein Netzwerk-Request"-Versprechen,
   siehe Abschnitt 2.1 Punkt 4 — daher nicht ohne Weiteres zulässig) oder
   als `unsupported_block` mit Verweis auf die Original-URL importieren.
2. **Race Condition (3.12) ist im Code vermutlich bereits unkritisch**, weil
   `onOpen` in `App.tsx` den kompletten `FormatPicker` durch
   `DocumentWorkspace` ersetzt (kein gemeinsamer mutierbarer Zustand
   zwischen zwei parallelen `handleFile`-Aufrufen außer dem einen
   `error`-State) — „letzter abgeschlossener Import gewinnt" ist bereits
   die tatsächliche Semantik. Trotzdem fehlt ein Test, der das beweist
   (siehe 8.2, Zeile 3.12).
3. **Fokus-Verhalten (5.3)** lässt sich mit Playwright nur eingeschränkt
   gegen einen echten nativen Dialog testen; der Code selbst tut nichts
   Verdächtiges (`fileInputs.current[module.id]?.click()` auf einem
   `display:none`-Input verändert den Fokus nicht aktiv), ein manueller
   Cross-Browser-Check (Chrome/Firefox/Safari) wird trotzdem empfohlen, da
   dieses Verhalten browserabhängig sein kann.

---

## 11. Zusammenfassung: Datei-Liste

| Datei | Art der Änderung |
|---|---|
| `src/formats/shared/schema.ts` | Neuer Node `unsupported_block` + Label-Map |
| `src/formats/shared/validateDocument.ts` | **Neu** — Schema-Vorabprüfung |
| `src/formats/docx/reader.ts` | Rekursive Run-Sammlung (Hyperlink/ins/sdt/fldSimple/del), `w:pict`-Unterstützung, Textbox-/Objekt-Platzhalter, Aufruf von `assertLoadableDocument` |
| `src/formats/docx/xmlUtil.ts` | `vml`-Namensraum ergänzen |
| `src/formats/odt/reader.ts` | `decodeInline`-Fallback für unbekannte Inline-Elemente, `frameToBlocks`-Helper (Textbox/Objekt-Platzhalter, auch seitenverankert), Aufruf von `assertLoadableDocument` |
| `src/formats/docx/writer.ts` | `case 'unsupported_block'` (entpacken) |
| `src/formats/odt/writer.ts` | `case 'unsupported_block'` (entpacken) |
| `src/index.css` | Styling für `.unsupported-block` |
| `src/app/EditorErrorBoundary.tsx` | **Neu** — Absturz-Sicherheitsnetz |
| `src/App.tsx` | `DocumentWorkspace` in `EditorErrorBoundary` einwickeln, Crash-Fehler an `FormatPicker` durchreichen |
| `src/app/FormatPicker.tsx` | Optionale Prop für von außen gesetzten Fehler (aus Error Boundary) |
| `src/formats/docx/__tests__/external-fixtures.test.ts` | Inhaltliche Assertions für `FieldCodes.docx`/`FldSimple.docx` statt nur Crash-Freiheit |
| `src/formats/odt/__tests__/external-fixtures.test.ts` | Inhaltliche Assertions für `Hyperlink-AOO401.odt`/`FrameWithTable.odt` |
| `src/formats/odt/__tests__/reader.test.ts` | **Neu** — Unit-Tests für Inline-Fallback |
| `src/formats/docx/__tests__/roundtrip.test.ts` | Fall für `unsupported_block` |
| `src/formats/odt/__tests__/roundtrip.test.ts` | Fall für `unsupported_block` |
| `tests/e2e/large-document-import.spec.ts` | **Neu** — löst den in Abschnitt 8.1 benannten Beleg-Fehlbestand ein |
| `tests/e2e/file-open-edge-cases.spec.ts` | **Neu** — Abschnitt 3.1–3.12, 3.15–3.17, Abschnitt 5 |
| `tests/e2e/complex-import-fidelity.spec.ts` | **Neu** — Abschnitt 3.13/3.14 |
| `tests/e2e/roundtrip-fidelity.spec.ts` | **Neu** — Abschnitt 6, alle 8 Kriterien, realistische Testdateien |
| `src/app/__tests__/App.test.tsx` bzw. `src/App.test.tsx` | Test für Error-Boundary-Pfad |

---

## 12. Nicht-Ziele dieses Plans (bewusste Abgrenzung)

- Kein Aufbau eines vollständigen `link`-Marks/Hyperlink-Editierwerkzeugs —
  das ist `specs/hyperlink-einfuegen-req.md`.
- Keine Umsetzung von Änderungsverfolgung als sichtbares Feature (Anzeige
  von Einfügung/Löschung mit Autor/Datum, Annehmen/Ablehnen) — nur
  sicherstellen, dass akzeptierter (`w:ins`) Text nicht verloren geht und
  gelöschter (`w:del`) Text nicht fälschlich wieder auftaucht. Volles
  Track-Changes-Feature ist laut Task-Tracker Teil von Phase 3
  (`#6 Phase 3: DOCX/ODT advanced features … track changes`, aktuell
  „in_progress").
- Keine Cross-Format-Rundreise (DOCX→ODT bzw. ODT→DOCX) — abhängig von
  `speichern-unter-format`, laut Backlog aktuell „fehlt".
- Kein Fußnoten-Feature — nur Sicherstellung, dass Fußnotentext beim Import
  nicht komplett verschwindet (Vereinfachung: Body-Text bleibt sichtbar,
  echte Fußnotenverwaltung bleibt separater Slug `fussnote-einfuegen`).
