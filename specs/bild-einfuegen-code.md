# Umsetzungsplan: Feature „Bild aus Datei einfügen"

Gegenstück zu `specs/bild-einfuegen-req.md` (Anforderung). Dieses Dokument ist der
**dateigenaue Entwicklungsplan**: was am bestehenden Code nachweislich falsch/
unvollständig ist (durch eigene Codesichtung des tatsächlichen Standes verifiziert,
nicht nur aus der Anforderung übernommen), welche Dateien sich ändern bzw. neu
entstehen, und in welcher Reihenfolge.

> **Zitierweise (verbindlich, wie schon `bild-einfuegen-req.md` Abschnitt 0 fordert):**
> Maßgeblich sind die **Symbolnamen** (Datei › Funktion/Node). Zeilennummern sind eine
> Momentaufnahme dieses Prüfdurchlaufs und driften bei jeder Änderung. Alle unten
> genannten Zeilen wurden für **diesen** Durchlauf gegen den aktuellen Code neu
> verifiziert.

---

## Revision gegenüber der Vorfassung dieses Plans

Die vorige Fassung dieser Datei war gegen einen **älteren Code-Stand** geschrieben und
an mehreren Stellen sachlich falsch. Diese Fassung korrigiert das. Wer die Vorfassung
kennt, findet hier die konkreten Korrekturen — sie sind der eigentliche Mehrwert dieser
Revision und alle unten im Plan eingearbeitet:

1. **Reader-Struktur veraltet (kritisch, hätte bestehende Funktion zerstört).** Der
   DOCX-Reader hat **keinen** inline-`'drawing'`-Zweig in `decodeParagraphRuns` mehr;
   Zeichnungen laufen jetzt über die eigene Funktion **`decodeDrawingOrPict`**
   (`docx/reader.ts:143-168`), die Bild **vs. Textbox vs. OLE-Objekt** unterscheidet
   und für Textboxen `unsupported_block`-Inhalte rettet. `RunLike` hat heute die Variante
   `'unsupported'` mit `unsupportedKind`/`unsupportedBlocks`. Der von der Vorfassung
   vorgeschlagene Ersatz (`RunLike` nur `'text' | 'break' | 'image'`, Umschreiben eines
   inline-`'drawing'`-Falls) hätte die Textbox-/Objekt-Rettung **gelöscht**. Analog beim
   ODT-Reader: Frames laufen über **`frameToBlocks`** (`odt/reader.ts:232-248`), das
   zusätzlich **seitenverankerte** Frames abdeckt (direkter Aufruf aus `elementToBlocks`,
   `odt/reader.ts:284`). Der Größen-Lesefix gehört **in `decodeDrawingOrPict` bzw.
   `frameToBlocks`**, nicht in eine Umschreibung der Run-/Frame-Schleife — siehe 4.9/4.11.
2. **Fehlender Muss-Fix ergänzt: eindeutige `wp:docPr/@id`.** Anforderung 3.6 und
   Abnahmekriterium 4 verlangen **eindeutige** DrawingML-IDs je Bild; der Writer
   verdrahtet heute fest `wp:docPr id="1"`/`pic:cNvPr id="0"` (`docx/writer.ts:87,89`).
   Die Vorfassung hatte dazu **keinen** Fix („Rest unverändert") — das ist ein
   blockierendes DoD-Kriterium und jetzt als **F15** enthalten (4.8/5.1).
3. **`list_item`-Content-Modell falsch beschrieben.** Die Vorfassung behauptete
   `list_item: 'paragraph block*'` (mit daraus abgeleiteter „1-Zeichen-Stub"-Analyse).
   Tatsächlich ist `list_item: { content: 'block+' }` (`schema.ts:146-152`, bewusst so,
   siehe Kommentar dort) — ein Bild darf **erstes/einziges** Kind eines `list_item` sein.
   Abschnitt 1.6 ist entsprechend korrigiert und die Command-Testfälle (F11) sind jetzt
   **maßgeblich** statt der überzogenen „empirisch bewiesen"-Zusicherungen der Vorfassung.
4. **`PAGE_CONTENT_WIDTH_PX` korrigiert: 606 px** (nicht „596 px"). Nachgerechnet:
   `round(210·96/25.4) − 2·round(25·96/25.4) = 794 − 188 = 606`. Betraf 3.4 und 9.4.
5. **`commands.test.ts` existiert bereits** (`src/formats/shared/editor/__tests__/commands.test.ts`,
   testet `canCut`/`cutSelection`). Die Vorfassung nannte sie „NEU" — korrekt ist
   **erweitern** um einen `insertImage`-`describe`-Block (5.1).
6. **Erfundene Fixture-Namen ersetzt.** `ContentTypeIsCaseInsensitive.docx`/
   `docx4j-example.docx` existieren **nicht** im Repo. Ersetzt durch die tatsächlich
   vorhandenen, verifiziert bildhaltigen Fixtures mit real gemessenen Größen —
   `headerPic.docx`, `drawing.docx`, `WithGIF.docx`, `image-attributes.odt`,
   `imageAsChar.odt`, `image.odt` (5.3).
7. **Neu dokumentierte Grenzen ergänzt:** Alt-Text aus `@descr` vs. `@name` (F16,
   Anforderung 2.5) und nicht-browserdarstellbare Fremd-Endungen `.emf`/`.wmf`/`.tiff`
   (F17, Anforderung 5.2). Beide in der Vorfassung nicht erwähnt.
8. **Externe Validierungskanäle klargestellt:** Der DOCX-Kanal ist `mammoth`
   (`docx/__tests__/external-validation.test.ts`), **nicht** python-docx — und mammoth ist
   tolerant (extrahiert Bilder, erzwingt **keine** eindeutige `docPr/@id`). Für
   Abnahmekriterium 4 braucht es deshalb eine **eigene XML-Parse-Assertion**, nicht den
   mammoth-Lauf allein. Der ODT-Kanal (RelaxNG via `xmllint-wasm`) prüft heute nur ein
   Bild **ohne** gesetzte Größe; Abnahmekriterium 5.1.12 verlangt ausdrücklich **mit**
   gesetzter Größe (px→cm-Pfad). Beides in 5.1 präzisiert.
9. **Diese Fassung: vollständig gegen den aktuellen Code neu verifiziert, zwei bisher
   fehlende Anforderungspunkte ergänzt.** Jede Zeilen-/Symbolangabe aus Abschnitt 1
   sowie alle Fixture-Inhalte aus 5.3 wurden für diesen Durchlauf erneut gegen die
   tatsächlichen Dateien geprüft (Quellcode gelesen, Fixture-ZIPs mit `JSZip` entpackt
   und `wp:extent`/`svg:width`-Werte real ausgelesen, nicht nur die Vorfassung
   übernommen) — keine Abweichung gefunden, mit zwei Ausnahmen, die jetzt neu
   ergänzt sind: (a) **Anforderung 3.13 (EXIF-Orientierung)** hatte in jeder
   Vorfassung dieses Plans **keine** Entsprechung — trotz expliziter Nennung in
   Abnahmekriterium 9 der Anforderung. Jetzt als **F18** in Abschnitt 2, Kernentscheidung
   3.5 und Umsetzungspunkt 4.13 enthalten. (b) **Anforderung 3.14 (Sonder-Bildinhalte:
   Transparenz, animiertes GIF, CMYK, 1×1-px, Extremformate)** hatte keine eigenen
   Testfälle — jetzt in 5.2 als Punkte 15–18 ergänzt. Außerdem neu: Die real gemessenen
   Fixture-Werte in 5.3 wurden nicht nur übernommen, sondern durch tatsächliches
   Entpacken der Test-Archive nachgerechnet (siehe Fußnoten dort); dabei fiel auf, dass
   `VariousPictures.docx` bereits echte `.wmf`/`.emf`-Bilder enthält — der in 4.12 (F17)
   sonst nur angekündigte reale Testfall ist damit **ohne neue Fixture-Beschaffung**
   sofort umsetzbar (5.3).

---

## 0. Geltungsbereich und Abgrenzung zu Geschwister-Plänen

`image` (`src/formats/shared/schema.ts:58-85`) ist ein gemeinsamer Schema-Knoten für
mehrere separate Backlog-Slugs mit eigenen Anforderungsdateien:

| Slug | Datei | Verhältnis zu diesem Plan |
|---|---|---|
| `bild-einfuegen` | `specs/bild-einfuegen-req.md` | **Dieser Plan.** Einfügen per nativer Dateiauswahl an der Cursor-Position, Formatprüfung, sinnvolle Standardgröße, Rundreise (DOCX+ODT) inkl. Größe **und eindeutiger DrawingML-IDs**, Toolbar-Bedienbarkeit/Icon, Selektions-Rückmeldung. |
| `bild-alt-text` | `specs/bild-alt-text-req.md` (noch nicht geschrieben) | **Nachträglich editierbarer** Alt-Text. Dieser Plan liefert nur den automatischen Startwert (`file.name`) und dokumentiert die `@descr`/`@name`-Grenze (F16). |
| `bild-groesse-aendern` | `specs/bild-groesse-aendern-req.md` | **Nachträgliche** Größenänderung (Ziehpunkte/Eingabefeld, `setImageSize`, NodeView). Bestätigt in ihrem Abschnitt 6 denselben Ist-Stand (`insertImage` setzt nie `width`/`height`). **Dieser Plan liefert die Grundlage** (4.4: `insertImage` setzt echte Maße; 4.9/4.11: Reader lesen die Fremddatei-Größe) — baut aber **keine** Resize-UI. Kann auf das hier eingeführte `src/formats/shared/units.ts` aufsetzen. |
| `bild-loeschen` | `specs/bild-loeschen-req.md` | Markieren+Löschen. Identifiziert **dieselbe** CSS-Lücke (kein `.ProseMirror-selectednode`-Stil). **Dieser Plan behebt die CSS-Regel** (4.6) als Ein-Zeilen-Änderung an gemeinsamer Infrastruktur, weil Anforderung 4 sie explizit fordert — `bild-loeschen-code.md` sollte das voraussetzen. |
| `bild-zuschneiden` / `bild-online` / `textumbruch-bild` / `bild-position` | — (Backlog: fehlt) | Kein Bezug; `image` bleibt `group: 'block'`, keine freie Verankerung. |

**Konsequenz:** Dieses Dokument deckt vollständig ab, was `bild-einfuegen-req.md`
Abschnitt 1–5 fordert, plus die komplette Rundreise aus Abschnitt 5. Es liefert
**keine** Resize-UI, **keinen** editierbaren Alt-Text, **kein** Zuschneiden, **keine**
Online-Bildsuche, **keine** freie Verankerung/Textumbruch, **kein** Drag&Drop/
Zwischenablage-Rohbild (letzteres von der Anforderung selbst ausgeklammert).

---

## 1. Bestätigter Ist-Stand (eigene Codesichtung)

Alle Befunde aus `bild-einfuegen-req.md` Abschnitt 0 wurden gegen den tatsächlichen
Code erneut geprüft und bestätigt. Zusätzlich unten: mehrere in der Vorfassung dieses
Plans falsch beschriebene bzw. gar nicht erwähnte Punkte.

### 1.1 Schema, Command, Toolbar — bestätigt

- `schema.ts:58-85` (`image`): `src`/`alt`/`width`/`height`, `group: 'block'`,
  `draggable: true`. **`width`/`height` (Z. 63-64) sind die einzigen Attribute im
  ganzen Schema ohne `validate`.** `parseDOM.getAttrs` (Z. 70-77) liest
  `el.getAttribute('width'|'height')` → laut DOM **String oder `null`**, keine Zahl;
  `toDOM` (Z. 81-84) gibt `['img', { src, alt, width, height }]`. Bei `width/height === null`
  lässt ProseMirrors `DOMSerializer` das Attribut weg (kein `width="null"`) — heute
  unschädlich, weil `insertImage` nie Maße setzt; nach Fix F1 werden echte Zahlen emittiert.
- `commands.ts:66-74` (`insertImage(src, alt='')`): erzeugt den Node **nur** mit
  `src`/`alt`; `width`/`height` bleiben Default `null`. `state.tr.replaceSelectionWith(node)`.
- `Toolbar.tsx:291-294`: **`<label>`** (kein `<button>`), Text „🖼 Bild", umschließt ein
  verstecktes `<input type="file" accept="image/*" className="hidden" onChange={handleImagePick}>`.
  **Kein `title`/`aria-label`** — anders als jedes andere Toolbar-Element (Ausschneiden
  `Toolbar.tsx:145-156` via `ScissorsIcon`, F/K/U/S via `MarkButton` `55-89`,
  Ausrichtung via `AlignButton` `91-111`, Tabelle `277-289`).
- `Toolbar.tsx:124-135` (`handleImagePick`): `event.target.value = ''` steht **bereits**
  (Z. 126) → dieselbe Datei zweimal feuert `onChange` erneut. `FileReader.readAsDataURL`
  in ein `Promise` mit `reader.onerror = () => reject(reader.error)` gewickelt, aber
  **ohne `try/catch` `await`et** (Z. 128-133) → unbehandelte Promise-Ablehnung bei
  `onerror`. **Keine `file.type`-/Signatur-/Größenprüfung.** `run(view, insertImage(dataUrl, file.name))`
  (Z. 134) — `alt` = Dateiname inkl. Endung.

### 1.2 DOCX-Export/-Import — bestätigt, mit Ergänzungen

- `docx/writer.ts:74-94` (`imageParagraphXml`): Fallback `Number(attrs.width ?? 300)` /
  `Number(attrs.height ?? 200)` (Z. 78-79). EMU-Umrechnung **inline** (`(px/96)*914400`,
  Z. 81-82) — nicht in einem gemeinsamen Modul mit dem (noch fehlenden) Reader-Gegenstück.
  **`wp:docPr id="1"` (Z. 87) und `pic:cNvPr id="0"` (Z. 89) sind fest verdrahtet** ⇒ bei
  mehreren Bildern kollidieren alle IDs. `alt` wird nach `wp:docPr/@name` **und**
  `pic:cNvPr/@name` geschrieben, **nicht** nach `@descr`.
- `docx/reader.ts:143-168` (**`decodeDrawingOrPict`**, aufgerufen aus `decodeRunElement`
  `170-184` für `<w:drawing>` **und** `<w:pict>`): liest `a:blip/@r:embed` bzw. VML
  `v:imagedata/@r:id` → Quelle, und `wp:docPr/@name` → `alt` (Z. 154-155). **`wp:extent`
  wird nie gelesen** — der Bild-Run trägt nur `imageRelId`/`imageAlt`; `paragraphToBlocks`
  (Z. 266-269) baut daraus `{ src, alt }`, `width`/`height` bleiben `null`. Für
  Nicht-Bild-Zeichnungen liefert die Funktion `unsupported`-Runs (Textbox-Rettung/OLE-Platzhalter).
- `docx/reader.ts:442-462` (`resolveImageSources`): wandelt die Relationship in eine
  Data-URL, MIME **aus der Endung** (`ext === 'jpg' ? 'jpeg' : ext`, Z. 451-453).
- **Ein-Fix-deckt-drei-Kontexte:** `paragraphToBlocks` wird von `readBodyChildren`
  (Body **und** Header/Footer, `docx/reader.ts:475`, sowie Header/Footer-Aufrufe
  `520`/`529`) **und** von `parseTable` (Zellen, `337-339`) aufgerufen. Der `wp:extent`-Fix
  in `decodeDrawingOrPict` (4.9) deckt damit alle drei Kontexte (Absatz, Zelle, Kopf-/Fußzeile)
  ohne Sonderlogik ab.

### 1.3 ODT-Export/-Import — bestätigt, plus Zusatzbefunde

- `odt/writer.ts:176-183` (`blockToOdt`, Fall `'image'`): Fallback `'6cm'`/`'4cm'`
  (Z. 179-180); bei gesetzten Maßen wird **wörtlich** `` `${attrs.width}px` `` geschrieben.
  `draw:frame … text:anchor-type="as-char"`.
- **Neufund A (`px`-Einheit ungültig):** `svg:width`/`svg:height` sind laut ODF 1.3 vom
  Datentyp „length" — Zahl **mit** Einheit aus `{cm, mm, in, pt, pc}` (bzw. font-relativ
  `em`); **`px` gehört nicht dazu**. Ein unabhängiger ODF-Schema-Validator (Anforderung
  5.1.12 / Abnahmekriterium 4) weist `"…px"` mit hoher Wahrscheinlichkeit zurück. Behoben
  in F8 (4.10).
- **Neufund B (zwei nicht ineinander umrechenbare Ersatzgrößen):** DOCX fällt auf 300×200 px
  zurück, ODT auf 6×4 cm. `6cm ≙ round(6/2.54·96) = 227 px`, **nicht** 300 px — dasselbe
  größenlose Bild käme in DOCX und ODT physisch **unterschiedlich groß** heraus. Behoben als
  Nebeneffekt von F7 (gemeinsame Ersatzkonstante, 4.3).
- `odt/reader.ts:232-248` (**`frameToBlocks`**): liest `draw:image/@xlink:href` → `src` und
  `draw:frame/@draw:name` → `alt` (Z. 235-237). **`svg:width`/`svg:height` am `draw:frame`
  werden nie gelesen.** `frameToBlocks` deckt sowohl den in `text:p` eingebetteten Frame
  (`paragraphToBlocks` `202-209`) als auch den **seitenverankerten** Frame als direktes
  `office:text`-Kind (`elementToBlocks` `284`) ab — der Fix gehört hierher (4.11), nicht in
  die `paragraphToBlocks`-Schleife (die den seitenverankerten Fall gar nicht sieht).
- `odt/reader.ts:326-349` (`resolveImageSources`): MIME **aus der Endung** (Z. 338-340),
  identisch zum DOCX-Pfad.

### 1.4 Fehlende CSS-Selektions-Rückmeldung — bestätigt

`src/index.css` enthält **keine** `.ProseMirror-selectednode`-Regel; das mitgelieferte
`prosemirror-view/style/prosemirror.css` wird nirgends importiert. ProseMirror-View setzt
diese Klasse automatisch auf das DOM-Element eines per `NodeSelection` markierten Knotens
(ein Klick auf ein Bild erzeugt eine solche, da `image` nicht `selectable: false` ist) —
**unabhängig** von einer Stylesheet-Definition. Ohne eigene Regel ist ein selektiertes
Bild optisch nicht unterscheidbar. Genau die in Anforderung 4 geforderte und in
`bild-loeschen-req.md` Abschnitt 0 unabhängig bestätigte Lücke.

### 1.5 `.ProseMirror img { max-width: 100%; height: auto }` existiert bereits

`src/index.css:39-42` enthält die geforderte Begrenzung. **Kein Fix nötig**, nur
Testabdeckung (5.1). Wichtig für 4.4: `height: auto` überschreibt beim Rendern das
HTML-`height`-Attribut — das ist **erwünscht**. Solange `width`/`height` im Node das
korrekte Seitenverhältnis abbilden (Fix F1), ergibt `height: auto` bei einer durch
`max-width: 100%` erzwungenen Verkleinerung exakt die proportional richtige Höhe statt
Verzerrung. Bestehendes CSS und F1 ergänzen sich.

### 1.6 Grundfall (Absatz-Teilung, Anforderung 2.1.3/3.2): auf Command-Ebene sehr wahrscheinlich kein Bug — durch Tests zu **beweisen**, nicht zu behaupten

`insertImage` ruft `replaceSelectionWith(node)` mit einem Block-Node, während die Marke
meist **innerhalb** eines `paragraph` steht; ProseMirrors Slice-Fitting teilt den Absatz.
Der Verdacht „`replaceSelectionWith` verliert Text" ist auf Command-Ebene **sehr
wahrscheinlich unbegründet** (ProseMirrors Fitting erhält beide Hälften). Das ist eine
**Priorisierung** des wahrscheinlichsten Fehlerorts, **kein** Ersatz für den Test.

> **Korrektur gegenüber der Vorfassung:** Die Vorfassung präsentierte hierzu eine
> Tabelle „empirisch verifiziert" — u. a. mit einer `list_item`-Analyse, die auf dem
> **falschen** Content-Modell `'paragraph block*'` beruhte. Das tatsächliche Modell ist
> `list_item: { content: 'block+' }` (`schema.ts:146-152`): ein Bild darf **erstes/einziges**
> Kind eines `list_item` sein; es gibt **keinen** erzwungenen führenden „Stub"-Absatz. Die
> konkrete Struktur nach dem Einfügen an jeder Cursor-Position ist daher **durch die neuen
> `commands.test.ts`-Fälle (F11) festzunageln**, nicht durch eine vorab behauptete Tabelle.

Zu testende Cursor-Positionen (Anforderung 3.2), jeweils Erwartung „beide Textteile inkl.
Marks bleiben erhalten": (a) Absatzanfang, (b) Absatzende, (c) mitten im Wort,
(d) in fett/kursiv formatiertem Text, (e) leerer Absatz, (f) vor/nach `hard_break`; plus
Kontext-Fälle: Überschrift (Anforderung 2.8 lässt Teilen vs. Herausschieben offen — siehe
9.3), `list_item` (Bild bleibt **innerhalb** desselben `list_item`, keine Vertauschung
zwischen Listenpunkten), `table_cell` (Zelle bleibt gültig, `cellContent: 'block+'`).

**Die drei plausibleren realen Ursachen** des gemeldeten „Text weg"-Eindrucks (alle in
Abschnitt 2 als Fixes behandelt, unabhängig voneinander begründet):

1. **`<label>` statt `<button>`** ohne das im Rest der Toolbar durchgängige
   `onMouseDown`+`preventDefault()`-Muster — unklarer Fokus-/Selektionszustand zwischen
   Klick und Dateiauswahl. Fix F2.
2. **Ohne gesetzte `width`/`height`** rendert der Browser das `<img>` in Originalgröße
   (Smartphone-Foto: mehrere tausend px) → der Folgetext wird weit nach unten verdrängt und
   **wirkt** verschwunden. Fix F1.
3. **Beschädigte/falsch getypte Datei** wird als kaputtes `<img>` **ohne** Fehlermeldung
   eingefügt (bestätigt). Fix F3/F4.

### 1.7 Selektions-Timing (Anforderung 3.1)

`run(view, command)` (`Toolbar.tsx:28-31`) liest `view.state`/`view.dispatch` **zum
Aufrufzeitpunkt**; `handleImagePick` ruft `run(...)` erst **nach** `await` auf ⇒ der Node
landet an der zum Einfügezeitpunkt aktuellen Selektion, nicht an einer beim Klick
zwischengespeicherten. **Strukturell bereits das geforderte Verhalten**, kein Bug. Das in
`WordEditor.tsx:43-50` behandelte `reconcileSelectionOnClick` (per `mouseup` **auf
`view.dom`**) greift hier nicht unmittelbar, weil der Toolbar-Klick kein `mouseup`
**innerhalb** `view.dom` auslöst. **Restrisiko:** Lag vor dem Öffnen bereits eine
veraltete/inkorrekte Selektion vor (z. B. die dokumentierte AllSelection-Situation), wird
sie übernommen. Kein neuer Produktionscode-Fix; abgesichert per Regressionstest (5.2).

---

## 2. Priorisierte Fehler-/Lückenliste

„Muss" = blockierend für die Definition of Done (Anforderung 7). „Soll" = empfohlen,
nicht blockierend. „Dokumentiert" = bewusst nicht behoben (Abschnitt 6/7).

| # | Befund | Einstufung | Fix in Abschnitt |
|---|---|---|---|
| F1 | `insertImage` setzt nie `width`/`height` → Editor-Darstellung/Export-Größe divergieren (3.4) | **Muss** | 3.4/4.4/4.5 |
| F2 | Toolbar-Element ist `<label>`, kein `<button>`; kein `title`/`aria-label`; Emoji-Icon | **Muss** | 3.2/4.5 |
| F3 | Keine Formatprüfung (Byte-Signatur), keine Fehlermeldung, kein `try/catch` (3.3) | **Muss** | 3.1/4.2/4.5 |
| F4 | Keine Größenobergrenze/Messung für sehr große Dateien (3.7) | **Soll** | 4.2/4.5 |
| F5 | DOCX-Reader liest `wp:extent` nicht → Fremddatei-Größe geht verloren (3.5, höchste Priorität) | **Muss** | 4.9 |
| F6 | ODT-Reader liest `svg:width`/`svg:height` nicht (3.5) | **Muss** | 4.11 |
| F7 | DOCX/ODT-Writer verwenden zwei unterschiedliche, nicht umrechenbare Ersatzgrößen (Neufund B) | **Soll** | 4.3/4.8/4.10 |
| F8 | ODT-Writer schreibt `svg:width/height` mit `px` — laut ODF-Schema ungültig (Neufund A) | **Muss** (Abnahmekriterium 5.1.12) | 4.10 |
| F9 | Keine `.ProseMirror-selectednode`-Stilregel (Anforderung 4, Neufund 1.4) | **Muss** | 4.6 |
| F10 | `width`/`height` im Schema ohne `validate`; `parseDOM` liefert Strings statt Zahlen | **Soll** | 4.1 |
| F11 | Kein Unit-Test für `insertImage` selbst | **Muss** | 5.1 |
| F12 | Keine E2E-Tests für Bild-Einfügen | **Muss** | 5.2 |
| F13 | Keine `width`/`height`-Assertions in bestehenden Roundtrip-Unit-Tests | **Muss** | 5.1 |
| F14 | Keine realen Fixture-Dateien mit bekannter Bildgröße im Rundreise-Test eingebunden | **Muss** | 5.1/5.3 |
| **F15** | **DOCX-Writer verdrahtet `wp:docPr id="1"`/`pic:cNvPr id="0"` fest ⇒ ID-Kollision bei mehreren Bildern (Anforderung 3.6, Abnahmekriterium 4)** | **Muss** | 4.8/5.1 |
| **F16** | **DOCX-Reader liest Alt-Text aus `@name`, nicht `@descr` (echter Word-Alt-Text) — Fremddatei-Alt-Text geht verloren (Anforderung 2.5)** | **Dokumentiert** (kleiner In-Scope-Fix optional) | 4.9/6 |
| **F17** | **Reader leiten MIME aus der Endung ab; `.emf`/`.wmf`/`.tiff` ⇒ nicht darstellbares `data:image/emf` (stilles leeres Bild) (Anforderung 5.2)** | **Soll** | 4.12/6 |
| **F18** | **EXIF-Orientierung wird nirgends betrachtet — `computeDisplaySize` speist sich aus `naturalWidth/naturalHeight`, die (in modernen Browsern) bereits die gedrehten Anzeige-Maße sind, während Writer/Reader die rohen, ungedrehten Bild-Bytes unverändert durchreichen (Anforderung 3.13)** | **Dokumentiert** (aktive Korrektur würde Anforderung 3.14 „Bytes bleiben unverändert" verletzen) | 3.5/4.13 |

---

## 3. Kernentscheidungen

### 3.1 Einheitliche interne Größeneinheit: Pixel bei 96 dpi

DOCX rechnet nativ in EMU (914400/Zoll), ODT in `cm`/`mm`/`in`/`pt`/`pc`. Schema-Knoten
und DOCX-Writer (`docx/writer.ts:80`, Kommentar „96px per inch by convention") legen
implizit **Pixel bei 96 dpi** als interne Einheit nahe — dieselbe Konvention wie
`pageLayout.ts:5` (`PX_PER_MM = 96/25.4`). Dieser Plan macht das **explizit und
einheitlich** über ein neues Modul `src/formats/shared/units.ts` (4.3), damit Reader und
Writer **dieselbe** Formel nutzen (behebt F7) und `bild-groesse-aendern-code.md` dieselbe
Quelle verwenden kann.

### 3.2 Toolbar-Element: `<label>` → `<button>` nach bereits im Projekt bewährtem Muster

Exakt das in `src/app/FormatPicker.tsx:77-104` produktiv genutzte Muster: sichtbarer
`<button type="button" onClick={() => fileInputRef.current?.click()}>` plus verstecktes
`<input type="file" className="hidden" ref={fileInputRef} onChange={…}>`. Vorteile:

- Natives `<button>` ist per Tab fokussierbar und öffnet den Dialog bei Enter/Leertaste
  über den nativen `click` — **kein** zusätzlicher `onKeyDown` nötig (Fokusverlust beim
  Öffnen des Dateidialogs ist ohnehin unvermeidlich; ein einfacher `onClick` ist für
  Datei-Buttons das WAI-ARIA-übliche Muster).
- `title`/`aria-label="Bild einfügen"` wie jedes andere Toolbar-Element.
- Icon als eingebettetes SVG (4.5) statt Emoji „🖼" (löst F2 / Anforderung 1 Zeile 3 /
  `FEATURE-SPEC-DOCX-ODT.md` §20.1).

### 3.3 Unterstützte Bildformate

Entscheidung (zur Freigabe, 9.1): **PNG, JPEG, GIF, WebP, BMP** — geprüft per
**Byte-Signatur**, nicht per (fälschbarem/leerem) `file.type` und nicht nur per Endung.
**SVG bewusst ausgeschlossen** (text-/XML-basiert, keine feste Signatur, zusätzlicher
Sanitizing-Aufwand; nachrüstbar). Liste als benannte Konstante in
`src/formats/shared/editor/imageValidation.ts`.

### 3.4 Standardgröße beim Einfügen

Nach Laden der Data-URL `naturalWidth`/`naturalHeight` über ein `Image`-Objekt auslesen
und – unter Beibehaltung des Seitenverhältnisses – auf `PAGE_CONTENT_WIDTH_PX`
(`pageLayout.ts:14`, **aktuell 606 px** bei A4/25 mm Rand) **herunterskalieren**, kleine
Bilder **nie** hochskalieren. Ergebnis **explizit** in `width`/`height` speichern (behebt
F1). `Image.onerror` liefert zugleich die zweite Gültigkeitsprüfung (2.4 der Anforderung).

### 3.5 EXIF-Orientierung (F18): rohe Bytes + browser-korrigierte Maße, bewusst nicht aktiv gedreht

**Befund** (bekanntes Browser-Verhalten, hier noch **nicht** durch einen eigenen Test
gegen ein echtes EXIF-Fixture bestätigt — kein `.jpg`/`.jpeg` mit Exif-Rotationsflag
liegt aktuell unter `tests/fixtures/`; das ist Teil des Fixes, siehe 5.3): Moderne
Chromium-/Firefox-/WebKit-Engines drehen ein `<img>` bereits bei der Anzeige gemäß dem
eingebetteten JPEG-`Orientation`-Tag, **und** `HTMLImageElement.naturalWidth/
naturalHeight` melden bereits die **gedrehten** (angezeigten) Maße, nicht die rohen
Byte-Dimensionen. `loadImageDimensions` (4.2) liest also für ein hochkant aufgenommenes,
aber landscape-kodiertes Smartphone-Foto bereits die **korrekten**, hochkant-Maße — im
Editor (derselbe Browser rendert `<img>` und Node gleich) sind Anzeige und gespeicherte
`width`/`height` daher konsistent.

**Die Lücke liegt beim Export/Fremd-Reimport, nicht im Editor:** `imageCollector.add`
und beide Writer betten die **rohen, unveränderten** Bytes ein (inkl. des originalen
Exif-Tags) und deklarieren `wp:extent`/`svg:width|height` aus den bereits **gedrehten**
`width`/`height`-Werten. Ob eine reale Word-/LibreOffice-Installation dasselbe Bild beim
Öffnen ebenfalls anhand des Exif-Tags dreht (aktuelle Versionen tun das für per „Bild
einfügen" eingefügte Fotos zunehmend, aber nicht zuverlässig über alle Versionen hinweg),
liegt außerhalb der Kontrolle dieses Codes — falls nicht, zeigt Word ein **um 90°
verdrehtes** Bild in einem `wp:extent`-Rahmen, der für die gedrehte Orientierung
bemessen ist ⇒ sichtbare Verzerrung trotz technisch korrekt gelesener/geschriebener
Maße.

**Entscheidung (dokumentiert, keine aktive Korrektur in diesem Plan):** Die Bytes
**nicht** aktiv neu kodieren (z. B. über eine `<canvas>`-Rotation vor dem Einbetten).
Ein Re-Encode würde Anforderung 3.14 verletzen (PNG-Alpha/GIF-Bytes müssen unverändert
bleiben; ein Re-Encode wäre ohnehin nur für JPEG mit Exif-Tag überhaupt anwendbar, nicht
für die anderen unterstützten Formate) und zusätzliche Qualitäts-/Determinismus-Fragen
aufwerfen (erneute JPEG-Kompression ist verlustbehaftet und nicht bit-identisch
reproduzierbar). Bewusst akzeptierter Kompromiss: „best effort", wie in Anforderung
3.13 als Minimalanforderung („kein Absturz, keine *offensichtliche* Verzerrung")
formuliert — abgesichert durch einen dedizierten E2E-Test mit einem echten,
Exif-rotierten JPEG-Fixture (5.2/5.3), der zumindest die **Editor-eigene** Rundreise
(Einfügen → Export → Re-Import in denselben Browser) auf Verzerrungsfreiheit prüft; die
Cross-Anwendungs-Frage (reales Word/LibreOffice) bleibt eine dokumentierte, nicht
automatisiert prüfbare Grenze.

---

## 4. Dateigenauer Umsetzungsplan

### 4.1 `src/formats/shared/schema.ts` — Fix F10

`image`-NodeSpec (Z. 58-85): `validate: 'number|null'` an `width`/`height`, und
`parseDOM.getAttrs` in Zahlen wandeln:

```ts
attrs: {
  src: { validate: 'string' },
  alt: { default: '', validate: 'string' },
  width: { default: null, validate: 'number|null' },
  height: { default: null, validate: 'number|null' },
},
// getAttrs:
const width = el.getAttribute('width')
const height = el.getAttribute('height')
return {
  src: el.getAttribute('src'),
  alt: el.getAttribute('alt') || '',
  width: width ? Number(width) : null,
  height: height ? Number(height) : null,
}
```

`validate: 'number|null'` ist von `prosemirror-model` unterstützt: `validateType`
(`node_modules/prosemirror-model/dist/index.js:2294-2300`) splittet den String an `"|"`
und mappt `value === null` auf den Typnamen `"null"` — **geprüft**, keine Annahme. Reine
Härtung; verhindert, dass ein falsch getypter Wert beim Parsen von per Zwischenablage
eingefügtem `<img>`-HTML durchrutscht.

### 4.2 `src/formats/shared/editor/imageValidation.ts` — NEU

Isoliert unit-testbar (DOM-frei bis auf `loadImageDimensions`):

```ts
export const SUPPORTED_IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/bmp'] as const
export type SupportedImageMimeType = (typeof SUPPORTED_IMAGE_MIME_TYPES)[number]

/** 20 MB — großzügig für ein Smartphone-Foto, klein genug, um eine pathologische Datei nicht
 *  unbegrenzt in den Speicher zu laden. Zur Freigabe, siehe 9.2. */
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024

const SIGNATURES: Array<{ mime: SupportedImageMimeType; bytes: number[] }> = [
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] }, // GIF87a
  { mime: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] }, // GIF89a
  { mime: 'image/bmp', bytes: [0x42, 0x4d] },
]

/** Byte-Signatur ("Magic Number"), nicht `file.type`. */
export function sniffImageMimeType(bytes: Uint8Array): SupportedImageMimeType | null {
  for (const sig of SIGNATURES) {
    if (bytes.length >= sig.bytes.length && sig.bytes.every((b, i) => bytes[i] === b)) return sig.mime
  }
  // WebP: RIFF-Container ('RIFF' @0, 'WEBP' @8).
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) return 'image/webp'
  return null
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const CHUNK = 0x8000
  let binary = ''
  for (let i = 0; i < bytes.length; i += CHUNK) binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  return btoa(binary)
}

/** Skaliert nur verkleinernd, unter Beibehaltung des Seitenverhältnisses. */
export function computeDisplaySize(naturalWidth: number, naturalHeight: number, maxWidth: number): { width: number; height: number } {
  if (naturalWidth <= 0 || naturalHeight <= 0) return { width: maxWidth, height: Math.round(maxWidth * 0.75) }
  if (naturalWidth <= maxWidth) return { width: Math.round(naturalWidth), height: Math.round(naturalHeight) }
  const scale = maxWidth / naturalWidth
  return { width: Math.round(maxWidth), height: Math.max(1, Math.round(naturalHeight * scale)) }
}

/** Lädt die Data-URL über ein `Image`-Element: (a) intrinsische Auflösung, (b) zweite
 *  Dekodier-Prüfung (fängt eine Datei ab, deren Kopf zufällig zu einer Signatur passt,
 *  deren Rumpf aber abgeschnitten ist). Unter jsdom nicht sinnvoll testbar → nur E2E. */
export function loadImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => reject(new Error('Bilddatei ist beschädigt oder kann nicht gelesen werden.'))
    img.src = dataUrl
  })
}
```

### 4.3 `src/formats/shared/units.ts` — NEU

Gemeinsam von `docx/writer.ts`, `docx/reader.ts`, `odt/writer.ts`, `odt/reader.ts`
genutzt (behebt F7):

```ts
export const PX_PER_INCH = 96
const CM_PER_INCH = 2.54

export function pxToEmu(px: number): number { return Math.round((px / PX_PER_INCH) * 914400) }
export function emuToPx(emu: number): number { return Math.round((emu / 914400) * PX_PER_INCH) }
export function pxToCm(px: number): number { return (px / PX_PER_INCH) * CM_PER_INCH }

const UNIT_TO_INCH: Record<string, number> = { in: 1, cm: 1 / CM_PER_INCH, mm: 1 / 25.4, pt: 1 / 72, pc: 1 / 6, px: 1 / PX_PER_INCH }

/** Parst einen ODF-Längenwert ("6cm", "1in", "28.35pt", auch tolerantes "300px") in px@96dpi.
 *  `null` bei fehlendem/nicht parsbarem Wert (defensiv), statt zu werfen. */
export function parseOdfLength(value: string | null | undefined): number | null {
  if (!value) return null
  const match = /^(-?[0-9]*\.?[0-9]+)(cm|mm|in|pt|pc|px)$/.exec(value.trim())
  if (!match) return null
  const inches = Number(match[1]) * UNIT_TO_INCH[match[2]]
  if (!Number.isFinite(inches) || inches <= 0) return null
  return Math.round(inches * PX_PER_INCH)
}

/** Gemeinsamer Ersatzwert für beide Formate (behebt Neufund B). Nur relevant für Nodes,
 *  die weiterhin width/height `null` haben; ab diesem Plan setzen insertImage/Reader immer Werte. */
export const DEFAULT_IMAGE_WIDTH_PX = 300
export const DEFAULT_IMAGE_HEIGHT_PX = 200
```

### 4.4 `src/formats/shared/editor/commands.ts` — Fix F1

`insertImage` (Z. 66-74) auf ein Options-Objekt umstellen:

```ts
export interface InsertImageOptions { alt?: string; width?: number | null; height?: number | null }

export function insertImage(src: string, options: InsertImageOptions = {}): Command {
  return (state, dispatch) => {
    const node = wordSchema.nodes.image.create({
      src, alt: options.alt ?? '', width: options.width ?? null, height: options.height ?? null,
    })
    if (dispatch) dispatch(state.tr.replaceSelectionWith(node))
    return true
  }
}
```

`options.width ?? null` erlaubt weiterhin `insertImage(src)` ohne Maße (verhält sich dann
wie heute). Der einzige Produktiv-Aufrufer ist `Toolbar.tsx:134` (per Grep über `src/`
**und** `tests/` verifiziert: nur `commands.ts` [Definition] und `Toolbar.tsx` [Aufruf];
E2E-Specs referenzieren `insertImage` nur in Kommentaren). Der Mechanismus
`replaceSelectionWith(node)` bleibt unverändert (1.6).

### 4.5 `src/formats/shared/editor/Toolbar.tsx` — Fix F1(Nutzung), F2, F3, F4

Ersetzt `handleImagePick` (Z. 124-135) und den `<label>`-Eintrag (Z. 291-294):

```tsx
import { useRef, useState } from 'react'
import { MAX_IMAGE_BYTES, arrayBufferToBase64, computeDisplaySize, loadImageDimensions, sniffImageMimeType } from './imageValidation'
import { PAGE_CONTENT_WIDTH_PX } from './pageLayout'

const SUPPORTED_FORMATS_LABEL = 'PNG, JPEG, GIF, WebP, BMP'

function ImageIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  )
}

// innerhalb Toolbar(...):
const fileInputRef = useRef<HTMLInputElement>(null)
const [imageError, setImageError] = useState<string | null>(null)

async function handleImagePick(event: ChangeEvent<HTMLInputElement>) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  setImageError(null)
  try {
    if (file.size === 0) throw new Error('Die ausgewählte Datei ist leer.')
    if (file.size > MAX_IMAGE_BYTES) {
      throw new Error(`Datei ist zu groß (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximal ${MAX_IMAGE_BYTES / (1024 * 1024)} MB.`)
    }
    const bytes = new Uint8Array(await file.arrayBuffer())
    const mime = sniffImageMimeType(bytes)
    if (!mime) throw new Error(`Nicht unterstütztes oder beschädigtes Bildformat. Unterstützt: ${SUPPORTED_FORMATS_LABEL}.`)
    const dataUrl = `data:${mime};base64,${arrayBufferToBase64(bytes.buffer)}`
    const { width: nW, height: nH } = await loadImageDimensions(dataUrl)
    const { width, height } = computeDisplaySize(nW, nH, PAGE_CONTENT_WIDTH_PX)
    run(view, insertImage(dataUrl, { alt: file.name, width, height }))
  } catch (err) {
    setImageError(err instanceof Error ? err.message : String(err))
  }
}
```

JSX (ersetzt `<label>` am Toolbar-Ende):

```tsx
<button type="button" title="Bild einfügen" aria-label="Bild einfügen"
  onClick={() => fileInputRef.current?.click()}
  className="px-2 py-1 rounded text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
  <ImageIcon /><span>Bild</span>
</button>
<input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
```

Fehlerbanner: analog zum bestehenden `cutError`-`role="alert"` (`Toolbar.tsx:157-161`).
Am einfachsten wird das `imageError`-`<span role="alert">` **direkt neben** dem
Bild-Button gerendert (wie `cutError` neben dem Ausschneiden-Button) — dann bleibt der
`return`-Wurzelknoten der Toolbar das bestehende einzelne `<div role="toolbar">`, **kein**
Fragment-Umbau nötig:

```tsx
{imageError && (
  <span role="alert" className="text-xs text-red-600 dark:text-red-400 max-w-[20rem] truncate" title={imageError}>
    {imageError}
  </span>
)}
```

Bewusste Entscheidungen:
- **Kein try/catch-loses `FileReader`-Promise mehr:** `file.arrayBuffer()` ist ein natives
  Promise im bestehenden `try`/`catch` — behebt die unbehandelte Promise-Ablehnung
  strukturell.
- **`accept="image/*"` bleibt bewusst breit — NICHT auf die MIME-Whitelist verengt.**
  Anforderung Bedienelement 2 und 2.3 („falsch-negativer Schutz") verlangen ausdrücklich,
  dass der **Dialog-Filter** breit bleibt: eine exakte MIME-Liste als `accept` blendet
  legitime, korrekt signierte Dateien aus, deren Betriebssystem einen abweichenden MIME
  meldet (BMP als `image/x-ms-bmp`, JPEG als `image/pjpeg`). Verbindlich prüfend ist allein
  die Laufzeit-Byte-Signatur (`sniffImageMimeType`), **nicht** der Dialog-Filter. Deshalb
  wird `SUPPORTED_IMAGE_MIME_TYPES` in `Toolbar.tsx` **nicht** importiert (nur in
  `imageValidation.ts`/Tests genutzt); die Nutzer-sichtbare Formatliste ist der separate
  String `SUPPORTED_FORMATS_LABEL`. (Korrektur gegenüber einer früheren Fassung dieses
  Plans, die hier fälschlich `accept={SUPPORTED_IMAGE_MIME_TYPES.join(',')}` vorsah und
  damit gegen die Anforderung verstieß — E2E-Test 5.2 Punkt 8 sichert ab, dass eine als
  `image/x-ms-bmp` gemeldete, korrekt signierte BMP wählbar bleibt und eingefügt wird.)
- **`file.type` wird nicht verwendet:** MIME kommt ausschließlich aus `sniffImageMimeType`.
- **Keine neue Toast-Infrastruktur** (im Projekt nicht vorhanden) — `role="alert"` genügt
  und wird von Screenreadern angekündigt (Anforderung 1 Zeile 4 / 2.3).
- **`ImageIcon`** rein aus primitiven SVG-Formen (`rect`/`circle`/`path`) im Stil des
  vorhandenen `ScissorsIcon` — keine neue Icon-Abhängigkeit.
- **`onKeyDown` nicht nötig** (natives Button-Verhalten, 3.2).

### 4.6 `src/index.css` — Fix F9

Nach `.ProseMirror img` (Z. 42):

```css
.ProseMirror-selectednode {
  outline: 2px solid #2563eb;
  outline-offset: 1px;
}
```

Wirkt auf `NodeSelection`-Ziele (praktisch nur `image`; Tabellenzellen-Selektion läuft
über `CellSelection`/`prosemirror-tables`-Dekorationen, nicht über diese Klasse). Die
Akzentfarbe kontrastiert in Light **und** Dark ausreichend gegen den weißen Seiten-
hintergrund (`WordEditor.tsx:164-171` zeichnet die Seite weiß); keine Theme-Fallunterscheidung nötig.

### 4.7 `src/formats/shared/editor/WordEditor.tsx` — keine Änderung

Kein `nodeViews`-Eintrag (Resize-NodeView gehört zu `bild-groesse-aendern`).
`dropCursor()` (Z. 103) bleibt rein visuell; kein eigener `handleDrop`/`handlePaste` für
Drag&Drop/Zwischenablage-Rohbilder — von der Anforderung selbst ausgeklammert. Hier nur
bestätigt, nicht implementiert.

### 4.8 `src/formats/docx/writer.ts` — Fix F1(Nutzung), F7, **F15 (eindeutige IDs)**

**F15 ist der neue, blockierende Kern dieses Abschnitts.** Der Writer braucht einen
dokumentweit eindeutigen, deterministischen ID-Zähler für Zeichnungen — exakt nach dem
bereits im Repo etablierten Muster von `TableNameSequence` (`odt/writer.ts:54-60`,
eingeführt, um `Math.random()` und dessen Nicht-Determinismus zu ersetzen):

```ts
import { pxToEmu, DEFAULT_IMAGE_WIDTH_PX, DEFAULT_IMAGE_HEIGHT_PX } from '../shared/units'

/** Dokumentweit eindeutige, deterministische DrawingML-Objekt-IDs. wp:docPr/@id muss je
 *  Zeichnung eindeutig und > 0 sein; geteilt über Body/Header/Footer, damit auch ein Bild
 *  in der Fußzeile keine ID mit einem Body-Bild teilt. */
class DrawingIdSequence {
  private count = 0
  next(): number { this.count += 1; return this.count }
}
```

`imageParagraphXml` (Z. 74-94) erhält die Sequence als Parameter und emittiert dieselbe
eindeutige `id` für `wp:docPr` **und** `pic:cNvPr`:

```ts
function imageParagraphXml(node: JsonNode, images: ImageCollector, rels: RelationshipRegistry, ids: DrawingIdSequence): string {
  const src = String(node.attrs?.src ?? '')
  const fileName = images.add(src)
  const relId = rels.add(RELATIONSHIP_TYPES.image, `media/${fileName.split('/').pop()}`)
  const widthPx = Number(node.attrs?.width ?? DEFAULT_IMAGE_WIDTH_PX)
  const heightPx = Number(node.attrs?.height ?? DEFAULT_IMAGE_HEIGHT_PX)
  const cx = pxToEmu(widthPx)
  const cy = pxToEmu(heightPx)
  const id = ids.next()
  const alt = escapeXml(String(node.attrs?.alt ?? ''))
  return (
    `<w:p><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">` +
    `<wp:extent cx="${cx}" cy="${cy}"/>` +
    `<wp:docPr id="${id}" name="${alt || 'Bild'}"/>` +
    `<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<pic:pic><pic:nvPicPr><pic:cNvPr id="${id}" name="${alt || 'Bild'}"/><pic:cNvPicPr/></pic:nvPicPr>` +
    `<pic:blipFill><a:blip r:embed="${relId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
    `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>` +
    `</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`
  )
}
```

Der Zähler muss durch die Aufrufkette gereicht werden: `blockToDocx` (Z. 105-156, Fall
`'image'` Z. 143-144), `tableToDocx` (Z. 158-201), `blocksToDocx` (Z. 203-205). Genau
**eine** `DrawingIdSequence`-Instanz wird in `writeDocx` (Z. 252) erzeugt und an **alle**
`blocksToDocx`-Aufrufe (Body Z. 256, Header Z. 265, Footer Z. 270) übergeben — analog zur
dort schon vorhandenen gemeinsamen `ImageCollector`-Instanz. `pxToEmu` ist bitgleich zur
bisherigen Inline-Formel (`Math.round((px/96)*914400)`), reine Zentralisierung, garantiert
Symmetrie mit `emuToPx` im Reader (4.9).

> **Hinweis zur Signatur-Streuung:** `blockToDocx`/`tableToDocx` bekommen einen zusätzlichen
> Parameter. Das ist derselbe mechanische Durchreiche-Aufwand wie bei `images`/`rels`
> heute; keine Alternative mit weniger Streuung ist sinnvoll (ein modul-globaler Zähler
> würde zwei parallele Exporte nicht-deterministisch verschränken).

### 4.9 `src/formats/docx/reader.ts` — Fix F5 (in `decodeDrawingOrPict`), optional F16

**Der Fix gehört in die Bild-Verzweigung von `decodeDrawingOrPict` (Z. 153-156)**, nicht
in eine Umschreibung der Run-Schleife (siehe Revision Punkt 1). `RunLike` (Z. 117-125)
behält **alle** bestehenden Varianten (`'text' | 'break' | 'image' | 'unsupported'`) und
bekommt nur zwei optionale Felder dazu:

```ts
import { emuToPx } from '../shared/units'

interface RunLike {
  kind: 'text' | 'break' | 'image' | 'unsupported'
  text?: string
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>
  imageRelId?: string
  imageAlt?: string
  imageWidthPx?: number | null   // NEU
  imageHeightPx?: number | null  // NEU
  unsupportedKind?: 'textbox' | 'object'
  unsupportedBlocks?: JsonNode[]
}
```

In `decodeDrawingOrPict`, innerhalb `if (relId) { … }` (Z. 153-156):

```ts
if (relId) {
  const docPr = el.getElementsByTagNameNS(OOXML_NAMESPACES.wp, 'docPr')[0]
  const extent = el.getElementsByTagNameNS(OOXML_NAMESPACES.wp, 'extent')[0]
  const cx = extent ? Number(extent.getAttribute('cx')) : NaN   // wp:extent/@cx ist unprefixed → getAttribute, nicht …NS
  const cy = extent ? Number(extent.getAttribute('cy')) : NaN
  return {
    kind: 'image',
    imageRelId: relId,
    // F16 (optional, kleiner In-Scope-Gewinn für Fremddatei-Rundreise): echter Word-Alt-Text
    // steht in wp:docPr/@descr; @name ist der Objektname. @descr bevorzugen, @name als Fallback.
    imageAlt: docPr?.getAttribute('descr') || docPr?.getAttribute('name') || '',
    imageWidthPx: Number.isFinite(cx) && cx > 0 ? emuToPx(cx) : null,
    imageHeightPx: Number.isFinite(cy) && cy > 0 ? emuToPx(cy) : null,
  }
}
```

`OOXML_NAMESPACES.wp` ist bereits definiert (`docx/xmlUtil.ts:13`). Und in
`paragraphToBlocks`, Bild-Block-Konstruktion (Z. 266-269):

```ts
blocks.push({
  type: 'image',
  attrs: { src: target ?? '', alt: run.imageAlt ?? '', width: run.imageWidthPx ?? null, height: run.imageHeightPx ?? null },
})
```

Da `paragraphToBlocks` von `readBodyChildren` (Body **und** Header/Footer) **und** von
`parseTable` (Zellen) aufgerufen wird, ist Rundreise-Szenario 8 (Bild in Zelle/Listenpunkt/
Kopf-Fußzeile) für DOCX damit **ohne** weitere Codeänderung abgedeckt (nur Tests, 5.1).

> **VML-Grenze (dokumentiert):** Für legacy `<w:pict>` (VML) steckt die Größe im
> `v:shape/@style` (`width:…;height:…` in pt), nicht in `wp:extent`; dort greift der Fix
> nicht und die Ersatzgröße bleibt. Seltener Fremddatei-Fall, kein Blocker — als bekannte
> Grenze festgehalten.

### 4.10 `src/formats/odt/writer.ts` — Fix F7, F8

`blockToOdt`, Fall `'image'` (Z. 176-183): Einheit `cm` statt `px`, gemeinsame Ersatzgröße:

```ts
import { pxToCm, DEFAULT_IMAGE_WIDTH_PX, DEFAULT_IMAGE_HEIGHT_PX } from '../shared/units'

case 'image': {
  const src = String(node.attrs?.src ?? '')
  const fileName = images.add(src)
  const widthPx = Number(node.attrs?.width ?? DEFAULT_IMAGE_WIDTH_PX)
  const heightPx = Number(node.attrs?.height ?? DEFAULT_IMAGE_HEIGHT_PX)
  const width = `${pxToCm(widthPx).toFixed(2)}cm`
  const height = `${pxToCm(heightPx).toFixed(2)}cm`
  const alt = escapeXml(String(node.attrs?.alt ?? ''))
  return `<text:p><draw:frame draw:name="${alt || 'Image'}" svg:width="${width}" svg:height="${height}" text:anchor-type="as-char"><draw:image xlink:href="${fileName}" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/></draw:frame></text:p>`
}
```

Behebt F8 (`px` war kein gültiges ODF-Längenmaß ⇒ RelaxNG-Validierung, Abnahmekriterium
5.1.12) und F7 (Ersatzgröße jetzt dieselbe 300×200-px-Basis wie DOCX: `300px ≙ 7.94cm`,
`200px ≙ 5.29cm`, statt der bisherigen, unabhängig gewählten `6cm`/`4cm`).

### 4.11 `src/formats/odt/reader.ts` — Fix F6 (in `frameToBlocks`)

**Der Fix gehört in die Bild-Verzweigung von `frameToBlocks` (Z. 233-238)**, nicht in die
`paragraphToBlocks`-Schleife (die den seitenverankerten Frame gar nicht sieht; siehe
Revision Punkt 1). `frameToBlocks` bekommt `frameEl` bereits übergeben:

```ts
import { parseOdfLength } from '../shared/units'

const imageEl = firstChildNS(frameEl, ODF_NAMESPACES.draw, 'image')
if (imageEl) {
  const href = imageEl.getAttributeNS(ODF_NAMESPACES.xlink, 'href') ?? ''
  const alt = frameEl.getAttributeNS(ODF_NAMESPACES.draw, 'name') ?? ''
  const width = parseOdfLength(frameEl.getAttributeNS(ODF_NAMESPACES.svg, 'width'))
  const height = parseOdfLength(frameEl.getAttributeNS(ODF_NAMESPACES.svg, 'height'))
  return [{ type: 'image', attrs: { src: href, alt, width, height } }]
}
```

`ODF_NAMESPACES.svg` ist bereits definiert (`odt/xmlUtil.ts:18`,
`urn:oasis:…:svg-compatible:1.0`) — dieselbe URI, die `NAMESPACE_DECLARATIONS`
(`odt/xmlUtil.ts:24`) beim Schreiben unter dem Präfix `svg:` deklariert und die auch echte
LibreOffice-Dateien verwenden. Keine neue Namespace-Registrierung nötig. Da `frameToBlocks`
sowohl aus `paragraphToBlocks` (in `text:p` eingebettet) als auch aus `elementToBlocks`
(seitenverankert, Z. 284) und rekursiv für Zellen/Listen (`elementToBlocks` Z. 290/307)
sowie Kopf-/Fußzeile (`readOdt` Z. 380/384) aufgerufen wird, ist Rundreise-Szenario 8 für
ODT ohne separate Kontext-Logik abgedeckt.

### 4.12 Fremddatei-MIME-Grenze — Fix F17 (beide Reader)

Beide `resolveImageSources` (`docx/reader.ts:451-453`, `odt/reader.ts:338-340`) bilden
`data:image/${ext}`. Für `.emf`/`.wmf`/`.tiff` (in echten Word/LibreOffice-Dateien
verbreitet) ergibt das ein vom Browser **nicht darstellbares** `data:image/emf` ⇒ stilles
leeres Bild (Anforderung 5.2, letzter Punkt). **Mindestmaßnahme (Soll):** eine kleine
Whitelist browserdarstellbarer Endungen; nicht darstellbare werden nicht als `<img>`-Quelle
eingebettet, sondern als `unsupported_block` (`kind: 'object'`, Platzhalter „Bildformat
nicht darstellbar") importiert — der Knoten existiert bereits (`schema.ts:92-113`) und wird
von beiden Writern beim Export als Inhalt entpackt statt still verloren. Kein Absturz, kein
leeres Bild. Als eigenständiger, klar abgegrenzter Zusatz umsetzbar; bei Zeitdruck
mindestens als bekannte Grenze in Abschnitt 7 dokumentiert.

**Bereits vorhandener realer Testfall (neu erkannt, spart eine Fixture-Beschaffung):**
`tests/fixtures/external/docx/VariousPictures.docx` (bereits in 5.3 als Mehr-Bilder-Fixture
gelistet) enthält laut tatsächlichem Entpacken (`word/media/`) **fünf** Bilder, davon
**zwei** in genau den hier relevanten, nicht browserdarstellbaren Formaten —
`image1.wmf` und `image3.emf`/`image4.emf` — neben `image2.png`/`image5.jpeg`. Diese Datei
deckt F17 damit **unverändert, ohne handgebautes XML**, ab: Import → die beiden
WMF/EMF-Bilder müssen als `unsupported_block`-Platzhalter (nach dem Fix) bzw. dürfen
**nicht** als kaputtes `data:image/emf`/`data:image/wmf` (vor dem Fix, roter Regressionstest)
im Dokument landen, während PNG/JPEG daneben normal importiert werden.

### 4.13 EXIF-Orientierung — bewusste Nicht-Korrektur (F18, Anforderung 3.13)

Kein Produktionscode-Fix (siehe Entscheidung 3.5) — dieser Abschnitt hält nur fest, **wo**
das Verhalten sichtbar wird und was stattdessen zu tun ist:

- **`imageValidation.ts` (4.2) bleibt unverändert.** `loadImageDimensions` liest bewusst
  `img.naturalWidth`/`naturalHeight` ohne eigene Exif-Auswertung — genau das nutzt aus,
  dass der Browser diese bereits gedreht liefert (3.5). Eine eigene Exif-Parsing-Bibliothek
  wird **nicht** eingeführt.
- **Kein Re-Encode in `handleImagePick` (4.5).** Die Bytes aus `file.arrayBuffer()` gehen
  unverändert in `arrayBufferToBase64`/die Data-URL ein — dieselbe Data-URL, aus der auch
  `loadImageDimensions` liest. Es gibt also nur **eine** Bytequelle, keine zwei
  divergierenden Repräsentationen.
- **Writer (4.8/4.10) und Reader (4.9/4.11) bleiben unverändert** — sie kennen `width`/
  `height` nur als Zahlen, unabhängig davon, wie diese zustande kamen.
- **Testpflicht (neu, siehe 5.2/5.3):** ein E2E-Test mit einem echten, Exif-rotierten
  JPEG-Fixture ist die einzige Stelle, an der das oben beschriebene Browser-Verhalten
  überhaupt **verifiziert** statt nur angenommen wird — ohne dieses Fixture bleibt F18
  eine unbewiesene Behauptung.

---

## 5. Tests

### 5.1 Unit-Tests (Vitest)

**`src/formats/shared/editor/__tests__/commands.test.ts` — ERWEITERN** (nicht neu; die
Datei existiert bereits und testet `canCut`/`cutSelection`). Neuer `describe('insertImage')`
mit den 1.6-Fällen als **maßgeblichen** Regressionstests (behebt F11). Jeweils
`EditorState.create({ doc, schema: wordSchema })`, Selektion setzen,
`insertImage(src, opts)(state, tr => state = state.apply(tr))`, dann `state.doc.toJSON()`
prüfen:
1. Cursor mitten im Absatz → zwei Absätze, Text davor/danach vollständig, Bild dazwischen.
2. Cursor am Anfang/Ende eines nicht-leeren Absatzes → Bild davor/danach, kein leerer Stub.
3. Leerer Absatz → Bild ersetzt ihn.
4. Mitten in fett-Text → beide Teile behalten `strong`; Bild-Node erhält **keine** Mark.
5. Vor `hard_break` → `hard_break` bleibt im zweiten Teilabsatz.
6. Mitten in Überschrift → aktuelles Verhalten festnageln (Teilen in zwei gleichrangige
   Überschriften **oder** was der Testlauf real zeigt) — dokumentiert das akzeptierte
   Verhalten (9.3).
7. `list_item` (Content `block+`): Cursor am Anfang/Ende/Mitte → Bild bleibt **innerhalb**
   desselben `list_item`; mit zwei `list_item`s prüfen, dass **nichts** zwischen ihnen
   vertauscht wird. (Erwartung explizit gegen das **tatsächliche** `block+`-Modell
   formulieren, nicht gegen das falsche `'paragraph block*'` der Vorfassung.)
8. `table_cell` (`block+`): Cursor mittig → Zelle bleibt gültig.
9. Nicht-leere Selektion → wird ersetzt, nicht ergänzt (Anforderung 2.2).
10. `insertImage(src)` ohne Options → `width`/`height` bleiben `null` (Abwärtskompatibilität).
11. `insertImage(src, { width, height })` → Node trägt exakt diese Werte.

**`src/formats/shared/editor/__tests__/imageValidation.test.ts` — NEU** (F3/F4):
`sniffImageMimeType` (je gültiges Präfix PNG/JPEG/GIF87a/GIF89a/WebP/BMP → erkannt;
leer/zu kurz/zufällig → `null`); `computeDisplaySize` (kleiner als max → unverändert;
breiter → herunterskaliert, Verhältnis erhalten; 0×0 → Fallback statt NaN);
`arrayBufferToBase64` (Rundreise gegen `atob`, inkl. > 0x8000-Byte-Puffer für den
Chunking-Pfad); Konstanten-Snapshot für `MAX_IMAGE_BYTES`/`SUPPORTED_IMAGE_MIME_TYPES`.
`loadImageDimensions` **nicht** hier (jsdom dekodiert keine echten Bilddaten) → nur E2E.

**`src/formats/shared/units.test.ts` — NEU**: `pxToEmu`/`emuToPx` invers (Rundungstoleranz);
`pxToCm` gegen Referenz (`96px = 2.54cm`, `300px ≈ 7.94cm`); `parseOdfLength` für
`"6cm"`/`"1in"`/`"28.35pt"`/`"120mm"`/`"300px"` → korrekt, und `""`/`null`/`"abc"`/`"-5cm"` → `null`.

**`src/formats/docx/__tests__/roundtrip.test.ts` — ERWEITERN** (`describe('DOCX round trip: images')`, Z. 307-332; behebt F13/F15):
1. Bestehender Test (Z. 308-315) um `expect(image.attrs.width).toBe(100)` /
   `.height).toBe(80)` ergänzen — **muss vor F1/F5 rot sein** (Eingabe hat bereits
   `width: 100, height: 80`, Assertion fehlt heute komplett).
2. Bild ohne Maße → nach Rundreise `DEFAULT_IMAGE_WIDTH_PX`/`_HEIGHT_PX` (300/200), nicht
   `null` (Writer schreibt jetzt aktiv, Reader liest zurück).
3. **F5:** handgebautes `document.xml` mit `wp:extent cx="1828800" cy="1143000"`
   (2×1,25 Zoll = 192×120 px) → `readDocx` liefert `width: 192, height: 120` — **vor F5 rot**.
4. **F15 (eindeutige IDs):** Dokument mit **drei** unterschiedlichen Bildern → exportiertes
   `document.xml` parsen, **alle** `wp:docPr/@id` einsammeln, `new Set(ids).size === 3` und
   jede `id > 0`; zusätzlich `pic:cNvPr/@id` == zugehörige `wp:docPr/@id`. (mammoth prüft
   das **nicht**, daher eigene XML-Parse-Assertion — siehe externe Validierung unten.)
5. Bild in Tabellenzelle mit Maßen → Rundreise erhält Größe (Szenario 8, Unit-Ebene).
6. Bild in Kopf-/Fußzeile mit Maßen → Rundreise erhält Größe; die Bild-ID der Fußzeile
   kollidiert **nicht** mit einer Body-Bild-ID (gemeinsame `DrawingIdSequence`).
7. Zwei **identische** Data-URLs an verschiedenen Positionen → beide Vorkommen bleiben,
   `ImageCollector` dedupliziert nur die Mediendatei (`docx/imageCollector.ts:15-28`), nicht
   die Position; Content-Types deklarieren die Endung genau einmal.

**`src/formats/odt/__tests__/roundtrip.test.ts` — ERWEITERN** (`describe('ODT round trip: images')`, Z. 341ff.):
1. Analog DOCX-Punkte 1-2/5-7.
2. **F6:** handgebautes `content.xml` mit `<draw:frame svg:width="5cm" svg:height="3cm">`
   → Reader liefert px (5cm ≈ 189px, 3cm ≈ 113px, Toleranz) — **vor F6 rot**.
3. **F8:** exportiertes `content.xml` enthält **keine** `svg:width="…px"`-Zeichenkette mehr
   (Regex-Assertion) — hält den Neufund als Regression fest.

**Externe Validierung — ERWEITERN, nicht neu:**
- `src/formats/docx/__tests__/external-validation.test.ts` (mammoth): einen **Mehr-Bilder**-
  Fall ergänzen, der von mammoth ohne `error`-Message akzeptiert wird und dessen HTML die
  `<img>` enthält. **Wichtig (Klarstellung):** mammoth ist tolerant und prüft die
  `wp:docPr/@id`-Eindeutigkeit **nicht** — die eigentliche Eindeutigkeits-Assertion ist der
  XML-Parse-Test in roundtrip.test.ts Punkt 4 (Abnahmekriterium 4).
- `src/formats/odt/__tests__/external-validation.test.ts` (RelaxNG/xmllint-wasm): der
  bestehende Fall nutzt ein Bild **ohne** gesetzte Größe (Fallback → früher `px`, jetzt
  `cm`). Für Abnahmekriterium **5.1.12** einen zweiten Fall **mit** gesetzten
  `width`/`height` ergänzen (exerziert den px→cm-Pfad) und gegen das ODF-1.3-Schema
  validieren — beweist, dass der geschriebene `svg:width`/`svg:height`-Wert ein
  schemagültiger Längenwert ist (schlägt mit dem alten `px` fehl).

### 5.2 `tests/e2e/images.spec.ts` — NEU (behebt F12)

Folgt den Konventionen aus `tests/e2e/docx.spec.ts`/`odt.spec.ts`/
`selection-regression.spec.ts`. Der echte `filechooser`-Flow (`input[type="file"]`
`.setInputFiles(...)`) ist im Repo bereits erprobt — u. a. `clipboard.spec.ts:~283`
(Bild-Upload als Vorbedingung fürs Kopieren) und `cut.spec.ts`; ein **dedizierter** Test
für das Einfügen selbst fehlt. Testbilder als Buffer im Testcode, mit **bekanntem
nicht-3:2-Seitenverhältnis** (z. B. 40×40 quadratisch, 160×90 = 16:9). Mindestens:

1. **Grundfall (höchste Priorität, 3.2/2.1.3):** Text tippen, Cursor mittig setzen, Bild
   über `setInputFiles` einfügen → `.ProseMirror img` sichtbar, **beide** Textteile
   unverändert.
2. **Tippen nach Einfügen (3.12/2.1.4):** direkt nach 1 tippen → prüfen, was passiert
   (Bild bleibt + Text dahinter **oder** — falls die NodeSelection-auf-Bild belassen wird —
   dokumentiertes Alternativverhalten). Ergebnis gemäß Freigabeentscheidung 9.3/Anforderung
   2.1.4 festhalten.
3. **Undo (2.6):** `Strg+Z` → Bild weg, Absatz **wieder zusammengeführt** (ein Absatz).
4. **Redo:** Bild inkl. Attribute identisch zurück.
5. **Formatprüfung (3.3/2.3):** `text/plain`-Datei mit `.png`-Namen wählen →
   `role="alert"` sichtbar, **kein** `<img>` im DOM, **keine** `pageerror`
   (`page.on('pageerror', …)`-Assertion für die beseitigte Promise-Ablehnung).
6. **Dialog-Abbruch:** kein File-Event → Dokument unverändert.
7. **Dieselbe Datei zweimal:** zweimal dieselbe Datei → beide Male eingefügt (Regression
   für das `input.value = ''`-Reset).
8. **Bedienelement (Abschnitt 1):** `getByRole('button', { name: 'Bild einfügen' })`
   auffindbar; per `Tab` fokussierbar, Enter/Leertaste löst `filechooser` aus. **Zusätzlich
   (falsch-negativer Schutz, Anforderung 2.3):** eine korrekt PNG/BMP-signierte Datei mit
   leerem oder untypischem `file.type` (via `setInputFiles` mit explizit gesetztem
   `mimeType: 'image/x-ms-bmp'` bzw. `''`) wird trotzdem eingefügt — beweist, dass allein die
   Byte-Signatur entscheidet und der breite `accept="image/*"`-Filter nichts Gültiges
   ausschließt.
9. **Bestehende Selektion (2.2):** Text markieren → Bild → Text weg, Bild an seiner Stelle.
10. **Größe/Verhältnis (3.4):** 16:9-Bild einfügen → DOCX **und** ODT exportieren
    (`waitForEvent('download')` + `JSZip`) → `wp:extent`-`cx/cy` bzw. `svg:width/height`
    auslesen, Verhältnis gegen die Quelle prüfen (Toleranz) — Nachweis: keine Verzerrung.
11. **Rundreise DOCX/ODT (5.1.1/5.1.2):** Bild einfügen → Download → erneut importieren →
    Bild an derselben Stelle, unverzerrt.
12. **Selektions-Regression (3.1):** Text → Bild → Klick-Neupositionierung → Enter →
    weiter tippen → nichts verloren (Erweiterung von `selection-regression.spec.ts`).
13. **Struktur (2.8):** Bild in Tabellenzelle und in Listenpunkt einfügen → Kontext bleibt
    intakt.
14. **Großdatei (3.7):** Bild nahe `MAX_IMAGE_BYTES` einfügen, Zeit protokollieren (kein
    hartes Limit, gegen CI-Flakiness), Toolbar bleibt danach bedienbar; Datei **über** der
    Grenze → `role="alert"`, keine Einfügung.
15. **EXIF-Orientierung (3.13/F18, neues Fixture `exif-rotated.jpg` aus 5.3):** Hochkant-
    Foto mit Exif-Rotation einfügen → im Editor sichtbar **hochkant**, nicht seitenverkehrt
    gestaucht (Screenshot- oder Bounding-Box-Vergleich `naturalWidth < naturalHeight` vs.
    gerendertes Seitenverhältnis); danach als DOCX **und** ODT exportieren und wieder in
    denselben Editor importieren → weiterhin hochkant, unverzerrt. Deckt nur die
    **Editor-eigene** Rundreise ab (3.5 begründet, warum die reale-Word/LibreOffice-Frage
    außerhalb automatisierter Tests bleibt).
16. **Transparenz (3.14):** PNG mit Alpha-Kanal einfügen, als DOCX/ODT exportieren,
    reimportieren → Data-URL-Bytes vor/nach identisch (kein Flatten auf Weiß) — Byte-
    Vergleich, nicht nur „Bild sichtbar".
17. **Animiertes GIF (3.14):** vorhandenes `WithGIF.docx` (5.3) oder ein eigenes
    Mehrbild-GIF einfügen/importieren → Bytes bleiben exakt erhalten (kein Umkodieren in
    ein Standbild); Animation selbst ist **kein** Prüfkriterium.
18. **Extremformate (3.14):** ein 1×1-px-Bild → bleibt bei `computeDisplaySize` in
    Originalgröße (kollabiert nicht auf 0×0, siehe 4.2-Fallback); ein sehr breites
    Bild (z. B. 5000×50) → Herunterskalierung auf `PAGE_CONTENT_WIDTH_PX` erhält das
    Seitenverhältnis (keine Stauchung in der Höhe). CMYK-JPEG: nur „kein Absturz,
    kein `pageerror`" — Farbdarstellung ist explizit „best effort" (Anforderung 3.14),
    keine Pixel-genaue Assertion.

### 5.3 Reale Fixture-Dateien (Anforderung 6.10, Abnahmekriterium 8)

Die vorhandenen Korpora unter `tests/fixtures/external/` wurden für diesen Plan
**tatsächlich gesichtet** (`unzip -l`); die folgenden Dateien sind verifiziert bildhaltig
mit real gemessenen Größen und ersetzen die in der Vorfassung erfundenen Namen:

| Fixture | Verifizierter Inhalt | Nutzung im Test |
|---|---|---|
| `docx/headerPic.docx` | Bild in **`word/header1.xml`**, `wp:extent cx=cy=763270` EMU (**quadratisch**, ≈ 80×80 px) | **F5 real + Szenario 8 (Kopfzeile).** Quadratisch ⇒ die alte 3:2-Ersatzgröße hätte verzerrt; beweist, dass die reale Größe gelesen wird. |
| `docx/drawing.docx` | 10 Medien, u. a. `wp:extent 2466975×781050` (≈ 259×82 px, ~3,16:1) | **Mehrere Bilder + Verzerrungsfreiheit + F15** (viele unterschiedliche `docPr/@id`). |
| `docx/WithGIF.docx` | 1 GIF-Medium | **Content-Type-Treue GIF** (Anforderung 5.2/3.14). |
| `docx/VariousPictures.docx` | 5 Medien: `image1.wmf`, `image2.png`, `image3.emf`, `image4.emf`, `image5.jpeg` (Dateinamen real durch Entpacken verifiziert) | Zusätzlicher gemischter Mehr-Bilder-Fall **und der reale, sofort verfügbare F17-Testfall** (4.12): zwei der fünf Bilder sind `.wmf`/`.emf` — genau die Endungen, die die heutige endungs-basierte MIME-Ableitung zu einem unrenderbaren `data:image/emf` macht. |
| `odt/image-attributes.odt` | 3 `draw:frame` mit realem `svg:width/height` (`2.147cm`, `3.383cm`, `3.494cm`) | **F6 real** (2.147cm ≈ 81 px). |
| `odt/imageAsChar.odt` | `text:anchor-type="as-char"` (= unser Writer), `svg:width` bis `6.507cm` | Quer-Check des As-char-Ankers + Größe. |
| `odt/image.odt` | 1 Bild in `Pictures/` | Minimaler ODT-Bild-Import. |

**Ergänzung von `docx/__tests__/external-fixtures.test.ts` /
`odt/__tests__/external-fixtures.test.ts`:** zusätzlich zur bestehenden „importiert ohne
Absturz"-Prüfung für die o. g. Dateien assertieren, dass gefundene `image`-Knoten
`width`/`height` **nicht** `null` haben (kein Rückfall auf den Nur-`src`-Zustand).

**Manuell zu beschaffen (Testplan-Hinweis 9, außerhalb des automatisierbaren Codes):**
1. Je eine mit echtem Word bzw. LibreOffice erzeugte Datei mit bewusst unüblicher
   Bildgröße (z. B. 5×5 cm), falls die vorhandenen Korpora für die Cross-Format-Rundreise
   (5.1.5/5.1.6) nicht genügen. Die o. g. Fixtures decken die Import-Größen-Fälle bereits ab.
2. **Neu (F18/3.5):** ein reales, mit einem Smartphone aufgenommenes JPEG mit
   Exif-`Orientation`-Tag ≠ 1 (z. B. Hochkant-Foto, dessen Byte-Dimensionen landscape
   sind) — im Repo aktuell **keine** `.jpg`/`.jpeg`-Datei mit Exif-Rotation vorhanden
   (geprüft: `tests/fixtures/` enthält aktuell keine `.jpg`/`.jpeg`-Fixtures überhaupt).
   Ablage-Vorschlag: `tests/fixtures/images/exif-rotated.jpg`, referenziert vom neuen
   E2E-Test (5.2 Punkt 15).

---

## 6. Bewusste Nicht-Umsetzung

1. **Resize-Ziehpunkte/Eingabefeld, `setImageSize`, NodeView** — Slug
   `bild-groesse-aendern`. Dieser Plan liefert nur die Grundlage (echte Maße ab
   Einfügen/Import).
2. **Editierbarer Alt-Text** — Slug `bild-alt-text`. Der automatische Startwert `file.name`
   überlebt die Rundreise; die `@descr`/`@name`-Import-Grenze (F16) ist in 4.9 als kleiner
   optionaler In-Scope-Gewinn beschrieben und ansonsten dort dokumentiert.
3. **Zuschneiden, Online-Bilder, Textumbruch/freie Verankerung** — eigene Slugs, „fehlt".
4. **Drag & Drop / Zwischenablage-Rohbild** — von der Anforderung selbst ausgeklammert.
   `dropCursor()` bleibt rein visuell.
5. **Kontextmenü-Eintrag** — kein Kontextmenü im Projekt (projektweite Lücke).
6. **SVG als Format** — bewusst ausgeschlossen (3.3), nachrüstbar.
7. **„Bild in Überschrift" aktiv umleiten** — offen gelassen (9.3); aktuelles schema-
   konformes Verhalten bleibt, bis Referenzverhalten geklärt ist.
8. **Exif-Rotation aktiv umkodieren (bake-in via `<canvas>`)** — Slug-übergreifend bewusst
   nicht gebaut (F18/3.5): würde Anforderung 3.14 (Byte-Erhalt für PNG/GIF) verletzen und
   wäre ohnehin nur für Exif-tragendes JPEG anwendbar. Es bleibt beim „best effort" aus
   Anforderung 3.13.

---

## 7. Bewusst nicht behobene, aber dokumentierte Punkte

- **Restrisiko Selektion (1.7):** Eine bereits vor dem Dialog vorliegende inkorrekte
  Selektion wird übernommen. Kein neuer Produktionscode; abgesichert durch Regressionstest
  5.2 Punkt 12.
- **VML-`<w:pict>`-Größe (4.9):** kein `wp:extent` ⇒ Ersatzgröße; seltener Fremddatei-Fall.
- **F17 (`.emf`/`.wmf`/`.tiff`)** — falls nicht als Fix umgesetzt, mindestens hier als
  bekannte Grenze: solche Fremd-Endungen dürfen nicht zum stillen leeren Bild führen (4.12
  beschreibt die Mindestmaßnahme; `VariousPictures.docx`, 5.3, liefert dafür bereits eine
  reale Fixture mit echtem `.wmf`/`.emf`-Inhalt, keine neue Beschaffung nötig).
- **„Bild in Überschrift"** — kein hartes Sollverhalten definiert (9.3).
- **F18 (Exif-Orientierung, 3.5):** Bytes bleiben roh, Maße kommen aus dem bereits
  browser-korrigierten `naturalWidth/naturalHeight`. Ob eine reale Word-/LibreOffice-
  Installation dieselbe Korrektur beim Öffnen anwendet, ist außerhalb automatisierter
  Tests dieses Projekts und bleibt eine dokumentierte Grenze, kein Fix.

---

## 8. Phasenplan

1. **Phase A (Fundament, formatunabhängig):** 4.1 `schema.ts`, 4.2 `imageValidation.ts`,
   4.3 `units.ts`, 4.4 `commands.ts` — inkl. Unit-Tests (`commands.test.ts`-Erweiterung,
   `imageValidation.test.ts`, `units.test.ts`). Härtestes zuerst: die Command-Fälle aus
   1.6/5.1, die den gemeldeten Kernfall festnageln.
2. **Phase B (Toolbar/UI):** 4.5 `Toolbar.tsx`, 4.6 `index.css` — macht das Feature über
   den echten `filechooser`-Flow bedienbar/beobachtbar (Voraussetzung für Phase D).
3. **Phase C (DOCX/ODT Reader+Writer):** 4.8-4.12 — mit den Roundtrip-Tests aus 5.1,
   insbesondere den **vor** dem jeweiligen Fix nachweislich roten Regressionstests für
   F5/F6/F8/F15, sowie den beiden externen Validierungen (mammoth-Mehrbild, RelaxNG-mit-Größe).
4. **Phase D (E2E):** 5.2 `tests/e2e/images.spec.ts`, abhängig von A-C.
5. **Phase E (Fixtures/Doku):** 5.3 (externe Fixtures einbinden, inkl. neu zu
   beschaffendem `exif-rotated.jpg` für F18/5.2 Punkt 15), Backlog-Status aktualisieren,
   Übergabe-Notizen an `bild-groesse-aendern`/`bild-alt-text`/`bild-loeschen`.

---

## 9. Offene Entscheidungen zur Freigabe

1. **Formatliste (3.3):** PNG/JPEG/GIF/WebP/BMP genügt, SVG bewusst ausgeschlossen?
2. **`MAX_IMAGE_BYTES = 20 MB` (F4):** Wert bestätigen, oder nur Beobachtung/Protokollierung
   statt harter Grenze (Anforderung lässt es offen).
3. **Selektion/Verhalten nach Einfügen (2.1.4/3.12) + „Bild in Überschrift" (2.8):**
   Textcursor hinter dem Bild (Word-Verhalten) **oder** Bild markiert lassen? Und:
   Überschrift teilen (aktuelles schema-konformes Verhalten) **oder** Bild herausschieben?
   Beides ist eine Entscheidung am Word/LibreOffice-Referenzverhalten; der gewählte Ausgang
   wird in `commands.test.ts` (5.1 Punkt 6) und E2E (5.2 Punkt 2) festgenagelt.
4. **Standard-Maximalbreite:** `PAGE_CONTENT_WIDTH_PX` (**aktuell 606 px**) als Bezugsgröße
   bestätigen (statt eines kleineren festen Werts).
5. **F16 (`@descr`-Alt-Text-Import):** als kleiner In-Scope-Gewinn hier mitnehmen (4.9) oder
   strikt `bild-alt-text` überlassen?
6. **F17 (`.emf`/`.wmf`/`.tiff`):** als Fix umsetzen (4.12) oder nur dokumentieren (7)?
7. **WebP im Export (5.2):** unverändert einbetten (empfohlen, Limitation dokumentieren)
   oder konvertieren?
8. **Icon-Design (`ImageIcon`):** generische SVG-Platzhalter akzeptieren oder erst ein
   projektweites Icon-System entscheiden (die übrige Toolbar nutzt heute Unicode-Glyphen +
   das eine `ScissorsIcon`-SVG).
9. **F18 (Exif-Orientierung, 3.5):** „best effort" (roh einbetten, browser-korrigierte Maße
   speichern, nur die Editor-eigene Rundreise testen) akzeptieren — oder zusätzlichen
   Aufwand für eine echte Cross-Anwendungs-Prüfung (reales Word/LibreOffice öffnen lassen,
   außerhalb der Playwright/Vitest-Suite) einplanen? Vorschlag: „best effort" bestätigen,
   da eine harte Garantie ohnehin außerhalb der Kontrolle dieses Codes läge.
