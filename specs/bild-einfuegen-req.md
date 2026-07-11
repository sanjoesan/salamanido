# Anforderungsspezifikation: „Bild aus Datei einfügen"

Status: Laut Feature-Backlog (`specs/FEATURE-BACKLOG.md`, Slug `bild-einfuegen`,
Abschnitt „Bilder & Grafiken", Priorität 1) gilt die Funktion als **„vorhanden"**
(Beschreibung: „Fügt eine Bilddatei über Dateiauswahl an der Cursor-Position ein."). Dieser
Status wird hier ausdrücklich als **nicht vertrauenswürdig** eingestuft und muss vollständig
neu verifiziert werden — sowohl auf tatsächliche Bedienbarkeit (echter `filechooser`-Flow im
Browser, nicht nur Command-Aufruf) als auch auf korrekte Rundreise (DOCX **und** ODT) hin.
`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 7 („Bilder") markiert das Gesamtthema zusätzlich als
**„von der Nutzerin explizit als nicht funktionsfähig gemeldet — höchste Priorität"**.

Geltungsbereich: ausschließlich das **Einfügen** einer Bilddatei per nativer Dateiauswahl an
der Cursor-Position im gemeinsamen DOCX/ODT-Editor sowie dessen Rundreise-Verhalten. Explizit
**nicht** Gegenstand dieser Datei (separate Backlog-Slugs, jeweils eigene Anforderung; hier nur
so weit erwähnt, wie sie das Einfüge-Verhalten unmittelbar berühren):

| Slug | Beschreibung | Status laut Backlog |
|---|---|---|
| `bild-alt-text` | Alternativtext nachträglich bearbeiten | teilweise |
| `bild-groesse-aendern` | Bildgröße per Eingabefeld/Ziehpunkte ändern | fehlt |
| `bild-zuschneiden` | Bild zuschneiden | fehlt |
| `bild-online` | Online-/Stockbilder einfügen | fehlt |
| `textumbruch-bild` / `bild-position` | Textumbruch-Verhalten, freie Verankerung | fehlt |
| `bild-loeschen` | Bild markieren + löschen | vorhanden (eigene Datei) |

Wie in `FEATURE-SPEC-DOCX-ODT.md` festgelegt: DOCX und ODT teilen sich denselben
ProseMirror-Editor (Schema + Seitenansicht). Jede Anforderung unten gilt für **beide** Formate,
inklusive Rundreise (Datei A hochladen → unverändert exportieren → Ergebnis entspricht
inhaltlich A) sowie für im Editor selbst neu eingefügte Bilder.

---

## 0. Ist-Stand (Code-Fundstellen, Basis dieser Spezifikation)

Diese Spezifikation beruht auf **tatsächlicher, für diesen Durchlauf erneut durchgeführter**
Durchsicht des Codes, nicht auf der Backlog-Beschreibung und nicht auf einer früheren Fassung
dieser Datei. Ein vorheriger Durchlauf dieser `-req.md` enthielt an mehreren Stellen veraltete
Zeilennummern und eine inzwischen überholte Testabdeckungs-Aussage; beides ist unten korrigiert.

> **Hinweis zur Zitierweise (behebt eine Schwäche der Vorfassung):** Maßgeblich sind die
> **Symbolnamen** (Datei + Funktion/Node). Zeilennummern sind eine Momentaufnahme (Stand dieser
> Prüfung) und driften bei jeder Codeänderung — Dev/QA müssen sich an Symbolen orientieren, nicht
> an exakten Zeilen. Wo unten „ca." steht, ist die Zeile ungefähr.

| Ebene | Datei / Symbol | Befund (verifiziert) |
|---|---|---|
| Schema (Node) | `src/formats/shared/schema.ts` › `nodes.image` (ca. Z. 58–85) | `group: 'block'`, `draggable: true`. Attribute: `src` (`validate: 'string'`, Pflicht), `alt` (Default `''`, `validate: 'string'`), `width`/`height` (Default `null`, **ohne `validate`** — die einzigen Attribute im ganzen Schema ohne `validate`). `parseDOM` (`img[src]`) liest `width`/`height` per `el.getAttribute(...)` → liefert laut DOM **String oder `null`**, keine Zahl; `toDOM` gibt `['img', { src, alt, width, height }]` zurück. |
| Einfüge-Command | `src/formats/shared/editor/commands.ts` › `insertImage(src, alt = '')` (Z. 66–74) | Erzeugt den Node **nur** mit `{ src, alt }` — **`width`/`height` werden nie gesetzt**, bleiben `null`. Ruft `state.tr.replaceSelectionWith(node)`. |
| Toolbar-Bedienelement | `src/formats/shared/editor/Toolbar.tsx` (ca. Z. 291–294) | Ein `<label>` mit Text „🖼 Bild", das ein verstecktes `<input type="file" accept="image/*" className="hidden" onChange={handleImagePick} />` umschließt. **Kein `<button>`, kein `title`/`aria-label`** — im Gegensatz zu jedem anderen Toolbar-Element (Ausschneiden, F/K/U/S, Ausrichtung, Tabelle tragen durchgehend `title`+`aria-label`). |
| Datei-Einleseweg | `src/formats/shared/editor/Toolbar.tsx` › `handleImagePick` (ca. Z. 124–135) | `const file = event.target.files?.[0]`; **`event.target.value = ''` ist bereits vorhanden** (Z. 126) → „dieselbe Datei zweimal hintereinander" feuert `onChange` erneut, funktioniert also grundsätzlich; muss aber mit Test abgesichert werden. Danach `if (!file) return`. Liest per `FileReader.readAsDataURL`, in ein `Promise` mit `reader.onerror = () => reject(reader.error)` gewickelt, das aber **ohne `try/catch` `await`et** wird → ein `onerror` erzeugt eine unbehandelte Promise-Ablehnung (stiller Fehlschlag). **Keine `file.type`-Prüfung, keine Signaturprüfung, keine Größenprüfung.** Abschließend `run(view, insertImage(dataUrl, file.name))` — `alt` = Dateiname (inkl. Endung). |
| Selektion nach Einfügen | `insertImage` + `tests/e2e/clipboard.spec.ts` (Kommentar Z. 284–287) | `replaceSelectionWith` hinterlässt eine **`NodeSelection` auf dem gerade eingefügten Bild**. Direktes Tippen danach würde also das Bild **ersetzen**, nicht Text dahinter einfügen (im bestehenden E2E-Test wird die Selektion vor dem Tippen bewusst hinter das Bild bewegt). **Real relevanter UX-Punkt, siehe 2.1/3.12.** |
| Tastenkürzel | `src/formats/shared/editor/WordEditor.tsx` (`keymap`) | Kein Shortcut für Bild-Einfügen. In Word/LibreOffice ebenfalls kein Standard-Shortcut → kein Fehlbefund, aber explizit zu dokumentieren. |
| Resize/Alt-Text-UI nach Einfügen | gesamtes `src/formats/shared/editor/` | **Keine** eigene NodeView/Komponente für Bilder (keine Ziehpunkte, kein Größen-/Alt-Text-Feld). Passt zu `bild-groesse-aendern: fehlt`. |
| Drag&Drop / Zwischenablage-Bild | `WordEditor.tsx` (`dropCursor()`) | Nur ein visueller Einfüge-Cursor; **kein** eigener `handleDrop`/`handlePaste`, der eine gezogene Datei oder ein aus der Zwischenablage eingefügtes Rohbild (Screenshot) in eine Data-URL wandelt. `parseDOM img[src]` greift nur bei bereits vorhandenem `<img>`-HTML in der Zwischenablage. **Bewusst außerhalb dieser Datei** (nur „über Dateiauswahl"), hier nur dokumentiert, damit die Lücke nicht als „durch bild-einfuegen abgedeckt" missverstanden wird. |
| DOCX-Export | `src/formats/docx/writer.ts` › `imageParagraphXml` (Z. 74–94) | Ein eigener `<w:p>` mit `<w:drawing>`/`<wp:inline>` je Bild. `widthPx = Number(attrs.width ?? 300)`, `heightPx = Number(attrs.height ?? 200)`, EMU-Umrechnung **inline** (`(px/96)*914400`). **`<wp:docPr id="1" …>` und `<pic:cNvPr id="0" …>` sind fest verdrahtet — bei mehreren Bildern kollidieren alle auf dieselbe DrawingML-Objekt-ID** (in OOXML muss `wp:docPr/@id` je Zeichnung eindeutig sein; Word „repariert" solche Dateien teils). `alt` wird nach `wp:docPr/@name` **und** `pic:cNvPr/@name` geschrieben (nicht nach `@descr`). |
| DOCX-Import | `src/formats/docx/reader.ts` › `decodeDrawingOrPict` (Z. 143–168), `paragraphToBlocks` | Liest `a:blip/@r:embed` (bzw. VML `v:imagedata/@r:id`) → Quelle und `wp:docPr/@name` → `alt`. **`<wp:extent>`/`<a:ext>` (die reale Bildgröße) wird nirgends gelesen** — der Node erhält nur `{ src, alt }`, `width`/`height` bleiben `null`. `alt` kommt aus `@name`, **nicht** aus `@descr` — der echte Alternativtext realer Word-Bilder (steht in `@descr`) geht daher beim Import verloren. `resolveImageSources` wandelt die Relationship in eine Data-URL und leitet den MIME-Typ **aus der Dateiendung** ab (nur `jpg → jpeg` gemappt). |
| ODT-Export | `src/formats/odt/writer.ts` › `blockToOdt` Fall `'image'` (Z. 176–183) | `<text:p><draw:frame … text:anchor-type="as-char">`. `svg:width = attrs.width ? `${width}px` : '6cm'`, `svg:height` analog `'4cm'`. **Die Einheit `px` ist für `svg:width`/`svg:height` nach ODF-1.3 fraglich** und muss gegen den bereits eingebundenen RelaxNG-Validator geprüft werden (siehe 5). Fallback `6×4 cm`. |
| ODT-Import | `src/formats/odt/reader.ts` › `frameToBlocks` (Z. 232–248) | Liest `draw:image/@xlink:href` → `src` und `draw:frame/@draw:name` → `alt`. **`svg:width`/`svg:height` werden nie gelesen** — identische Größen-Lücke wie bei DOCX. |
| Media-Sammler | `src/formats/docx/imageCollector.ts`, `src/formats/odt/imageCollector.ts` | **Dedupliziert nach exakt gleicher Data-URL** (gleiches Bild → **eine** Mediendatei, geteilte Referenz). Dateiname `image{n}.{ext}` (DOCX) bzw. `Pictures/image{n}.{ext}` (ODT); `ext`/`mimeType` aus dem Data-URL-MIME. DOCX-`[Content_Types].xml` erhält je Endung einen `<Default>`-Eintrag (`buildContentTypesXml`), ODT-`manifest.xml` je Bild einen `manifest:file-entry` mit `media-type`. |
| Nur Data-URLs einbettbar | `imageCollector.add` | Wirft „Bilder müssen als data-URL vorliegen…", wenn `src` **keine** Data-URL ist. Ein Bild mit `src="https://…"` (z. B. aus per Zwischenablage eingefügtem Web-HTML) lässt sich daher **nicht exportieren** (bestätigt durch Negativ-Unit-Test in `docx/__tests__/roundtrip.test.ts`, „external image URL"). |
| Standardgröße im Editor | `src/formats/shared/editor/pageLayout.ts` | `PAGE_CONTENT_WIDTH_PX` (= A4-Breite minus 2× 25 mm Rand) ≈ **606 px** ist bereits vorhanden und die naheliegende Ziel-Standardbreite. `src/index.css` enthält bereits `.ProseMirror img { max-width: 100%; height: auto }` (verhindert seitensprengende Darstellung). Es fehlt eine `.ProseMirror-selectednode`-Regel → ein selektiertes Bild ist optisch nicht vom nicht-selektierten unterscheidbar. |
| Interne Einheit | `pageLayout.ts` (`PX_PER_MM = 96/25.4`), `docx/writer.ts` (Kommentar „96px per inch") | Der Code legt implizit **Pixel bei 96 dpi** als interne Größeneinheit nahe; DOCX/ODT-Reader/-Writer sollten dieselbe Umrechnung teilen (heute nicht in einem gemeinsamen Modul). |
| Unit-Tests (konstruierte Daten) | `docx/__tests__/roundtrip.test.ts` (ca. Z. 307–330, 537–548), `odt/__tests__/roundtrip.test.ts` | Vorhanden: Bild überlebt als Data-URL; „Vorher/Bild/Danach" bleibt als drei Blöcke erhalten. **Aber:** der DOCX-Test setzt im Eingabe-Node `width: 100, height: 80`, **prüft danach jedoch nur `type` und `src`** — `width`/`height` werden **nie** assertet (Größen-Rundreise ungetestet). Kein Test für Bild in Tabellenzelle/Listenpunkt/Kopf-Fußzeile; kein Test für zwei identische Bilder an verschiedenen Positionen. |
| Externe Validierung | `docx/__tests__/external-validation.test.ts`, `odt/__tests__/external-validation.test.ts` | **Bereits vorhanden:** ODT-Export wird gegen das offizielle **OASIS ODF 1.3 RelaxNG**-Schema (`tests/fixtures/external/odf-schema/OpenDocument-v1.3-schema.rng`) via `xmllint-wasm` validiert; DOCX analog. Damit ist der `px`-Einheit-Verdacht (oben) **direkt testbar**, nicht nur theoretisch. |
| E2E (echter Upload) | `tests/e2e/clipboard.spec.ts`, `tests/e2e/cut.spec.ts` | **Korrektur der Vorfassung** (die behauptete „kein einziger E2E-Treffer"): Der echte `filechooser`-Weg **wird** bereits bedient — `page.locator('label:has-text("Bild")').locator('input[type=file]').setInputFiles(...)` mit den Fixtures `tiny-copy-6.png`, `tiny-cut-8.png`, `large-copy-perf.png`. **Aber:** diese Tests nutzen das Einfügen nur als **Vorbedingung** für Kopieren/Ausschneiden. Es gibt **keinen** dedizierten Test für die Einfüge-Funktion selbst (Cursor-Position, beide Textteile, Undo, Formatprüfung, Rundreise über die UI). Kein `bild-einfuegen*.spec.ts` vorhanden. |

**Kernaussagen (verifiziert):**
1. Schema-, Command-, Toolbar-, Reader-, Writer- und Media-Sammler-Unterstützung existiert.
2. Die **Größen-Rundreise ist bereits durch Code-Durchsicht als defekt belegt** (nicht nur
   ungetestet): Reader lesen die reale Bildgröße nie aus; Writer erzwingen bei fehlender Größe
   feste Ersatzwerte (DOCX 300×200 px, ODT 6×4 cm — **zwei nicht ineinander umrechenbare**
   Ersatzgrößen). Eine Fremddatei mit Bild der Größe X×Y kommt nach „unverändert hochladen →
   unverändert exportieren" mit dem Ersatzwert zurück ⇒ direkter Verstoß gegen das
   Rundreise-Grundprinzip und gegen `FEATURE-SPEC-DOCX-ODT.md` §7 Testfall 8 („keines verzerrt").
3. **Mehrere Bilder** teilen sich die feste `wp:docPr id="1"` (DOCX) ⇒ ungültige/„reparierte"
   Datei-Gefahr in echtem Word.
4. **Formatprüfung fehlt** ⇒ eine Nicht-Bild-Datei wird stumm als kaputtes `<img>` eingefügt.
5. Der von der Nutzerin gemeldete „Text verschwindet"-Fall ist auf **Command-Ebene**
   wahrscheinlich **kein** Bug (siehe 3.2) — die plausibleren realen Ursachen sind die
   Selektion-auf-Bild nach dem Einfügen (2.1/3.12), ein ohne gesetzte Größe riesig gerendertes
   Bild (verdrängt Text scheinbar) und der fehlende Fehlerhinweis bei ungültigen Dateien.

---

## 1. Menüpunkte / Bedienelemente

| # | Element | Ort | Auslöser | Ist-Zustand | Soll-Verhalten |
|---|---|---|---|---|---|
| 1 | „Bild einfügen"-Button | Editor-Toolbar, letzte Gruppe, nach „⊞ Tabelle" | Klick öffnet nativen Dateidialog | `<label>`+verstecktes `<input>`, **kein `<button>`, kein `title`/`aria-label`** | `<button type="button">` mit `title`+`aria-label="Bild einfügen"`, per Tab fokussierbar, öffnet den Dialog per Enter/Leertaste; verstecktes `<input>` wird per `ref.click()` ausgelöst (bewährtes Muster im Projekt). |
| 2 | Datei-Auswahl-Dialog | Betriebssystem-nativ | Dateiauswahl | `accept="image/*"` filtert nur die Dialog-Vorauswahl, **keine** Laufzeitprüfung | Nach Auswahl clientseitig real prüfen (Byte-Signatur, nicht `file.type`), dass es ein unterstütztes Bildformat ist, **bevor** eingefügt wird. Der Dialog-Filter (`accept`) bleibt bewusst **breit** (`image/*`) und wird **nicht** auf die exakte MIME-Whitelist verengt: eine MIME-Liste als `accept` blendet legitime, korrekt signierte Dateien aus, deren Betriebssystem einen abweichenden MIME meldet (z. B. BMP als `image/x-ms-bmp`, JPEG als `image/pjpeg`). Verbindlich prüfend ist allein die Laufzeit-Byte-Signatur (2.3), nicht der Dialog-Filter. |
| 3 | Icon/Symbol | derselbe Button | passiv | Unicode-Emoji „🖼" — laut `FEATURE-SPEC-DOCX-ODT.md` §17/§20 wahrscheinliche Ursache für „nicht sichtbar/nicht auffindbar" auf Systemen ohne Emoji-Font | Ersatz durch **eingebettetes SVG-Icon** (wie bereits `ScissorsIcon` in `Toolbar.tsx`), unabhängig von Emoji-Font erkennbar. |
| 4 | Fehlerhinweis | Toolbar/Editor | nach ungültiger/fehlgeschlagener Auswahl | **fehlt** | Sichtbarer, **per Screenreader angekündigter** Hinweis (`role="alert"` bzw. `aria-live`), verständlicher deutscher Text; keine Einfügung; kein kaputtes `<img>`; keine Konsolen-Exception. |
| 5 | Ladeanzeige (bei großer Datei) | Toolbar/Editor | während des asynchronen Einlesens/Dekodierens | fehlt | Nice-to-have: bei spürbarer Wartezeit ein kurzer „wird eingefügt…"-Zustand; kein Blocker, aber die UI darf nie „tot" wirken (siehe 3.7 / `FEATURE-SPEC` §20.4). |
| 6 | Tastenkürzel | — | — | **existiert nicht** | Bewusst nicht vorhanden (Word/LibreOffice haben keinen Standard-Shortcut); explizit so dokumentieren, nicht stillschweigend übergehen. |
| 7 | Kontextmenü-Eintrag (Rechtsklick) | — | — | fehlt (kein Editor-Kontextmenü) | Nice-to-have, kein Blocker. |
| 8 | Alt-Text-Feld beim Einfügen | — | — | fehlt (Alt = Dateiname automatisch) | Getrennter Slug `bild-alt-text`; hier nur Randbedingung: der automatische Startwert muss die Rundreise überleben (siehe 5). |
| 9 | Größen-Ziehpunkte/-Feld | — | — | fehlt | Getrennter Slug `bild-groesse-aendern`; das Fehlen verschärft das Problem aus Abschnitt 0 (keine nachträgliche Korrektur der Größe). |

---

## 2. Gewünschtes Verhalten im Detail

### 2.1 Grundfall: Einfügen an der Cursor-Position

1. Klick auf den Bild-Button öffnet den nativen Dateidialog (gefiltert, aber nicht hart
   beschränkt auf Bilddateien).
2. Nach Auswahl einer gültigen Bilddatei wird das Bild **an der Position eingefügt, die zum
   Zeitpunkt des tatsächlichen Einfügens** (nach Abschluss des asynchronen Einlesens) aktuell
   ist — nicht am Dokumentanfang/-ende, nicht an einer veralteten, beim Klick
   zwischengespeicherten Position (Bezug: Selection-Sync-Thematik, `FEATURE-SPEC` §2; siehe 3.1).
3. Steht die Schreibmarke inmitten eines Textabsatzes, wird dieser an der Cursor-Position
   geteilt; das Bild erscheint als eigener Block zwischen den beiden Absatz-Teilen. **Beide
   Textteile (davor und danach) müssen vollständig und mit ihrer Formatierung erhalten bleiben.**
   Das ist der von der Nutzerin als „nicht funktionsfähig" gemeldete Kernfall und der wichtigste
   Einzeltest dieser Spezifikation.
4. **Selektion/Cursor nach dem Einfügen (neu, verbindlich):** Aktuell bleibt eine `NodeSelection`
   **auf** dem Bild stehen (siehe Abschnitt 0). Das ist eine Stolperfalle: Wer sofort tippt,
   ersetzt das Bild. Sollverhalten wie in Word/LibreOffice: Nach dem Einfügen steht die
   Schreibmarke als **Textcursor unmittelbar hinter** dem Bild, sodass Weitertippen Text hinter
   dem Bild erzeugt (das Bild nicht ersetzt). Falls stattdessen die bewusste Entscheidung fällt,
   das Bild markiert zu lassen (z. B. für sofortiges Resize), muss das dokumentiert **und** so
   getestet sein, dass „Tippen ersetzt das Bild" nicht als Datenverlust wahrgenommen wird.
5. Der Editor bleibt danach normal bedienbar (Tippen davor/danach ohne weitere Klicks/Reload).

### 2.2 Einfügen über eine bestehende Selektion

- Eine vorhandene Textselektion wird durch das Bild **ersetzt** (nicht ergänzt) — konsistent mit
  `insertTable`, das denselben `replaceSelectionWith`-Mechanismus nutzt. Der ersetzte Text gilt
  als bewusst gelöscht und muss per **einem** Undo-Schritt vollständig zurückkehren (siehe 2.6).

### 2.3 Dateiauswahl und Formatprüfung

- **Festlegung des Product Owners (unterstützte Formate):** verbindlich mindestens **PNG und
  JPEG**; empfohlen zusätzlich **GIF, WebP, BMP**. **SVG vorerst ausgeschlossen** (text-/XML-basiert,
  keine feste Byte-Signatur, zusätzlicher Sanitizing-Aufwand; nachrüstbar). Die tatsächlich
  akzeptierte Liste ist als benannte Konstante zu führen und in dieser Datei zu dokumentieren.
- Die Prüfung erfolgt über die **Byte-Signatur („Magic Number")** der gelesenen Bytes, **nicht**
  über `file.type` (clientseitig fälschbar/leer) und nicht allein über die Dateiendung.
- Nicht unterstützte/beschädigte Auswahl (falscher Typ, 0-Byte-Datei, umbenannte Nicht-Bild-Datei
  mit Bild-Endung, abgeschnittene Bilddatei) ⇒ **sichtbare, per Screenreader angekündigte
  Fehlermeldung**; **keine** Einfügung; **keine** unbehandelte Promise-Ablehnung; kein kaputtes
  `<img>`. (Behebt den bestätigten Befund aus Abschnitt 0; `FEATURE-SPEC` §20.4 „Kein stiller
  Fehlschlag".)
- **Umgekehrter Fall (falsch-negativer Schutz):** Eine korrekt signierte, unterstützte Bilddatei
  muss **auch dann** eingefügt werden, wenn `file.type` leer ist oder das Betriebssystem einen
  unüblichen MIME meldet (siehe Bedienelement 2). Die Byte-Signatur ist die alleinige Entscheidung —
  weder `file.type` noch die Dateiendung dürfen eine gültige Datei ablehnen.
- Abbrechen des Dialogs (keine Datei gewählt) ⇒ keine Aktion, kein Seiteneffekt (`if (!file)
  return`, bereits vorhanden — mit Test absichern).
- **Dieselbe Datei zweimal hintereinander** auswählen ⇒ funktioniert (das `input.value`-Reset ist
  bereits vorhanden; Regressionstest, damit es nicht entfernt wird).

### 2.4 Bildgröße beim Einfügen

- Es muss eine **sinnvolle Standardgröße** entstehen: weder ein Bild, das die Seitenbreite sprengt
  (Originalgröße eines 6000×4000-px-Fotos), noch eines, das auf 0×0 kollabiert.
- **Editor-Darstellung und Export-Größe müssen übereinstimmen.** Heute setzt `insertImage`
  `width`/`height` nie; der Editor rendert das `<img>` in natürlicher (per `max-width: 100%`
  begrenzter) Größe, während der Export bei fehlenden Maßen auf feste Ersatzwerte zurückfällt ⇒
  sichtbare Diskrepanz und Verzerrung (siehe 3.4).
- **Zielvorgabe:** Beim Einfügen die intrinsische Auflösung ermitteln (`Image.naturalWidth/
  naturalHeight` nach Laden der Data-URL), unter Beibehaltung des Seitenverhältnisses auf
  `PAGE_CONTENT_WIDTH_PX` (≈ 606 px) **herunterskalieren** (kleine Bilder **nie** hochskalieren)
  und die Ergebniswerte **explizit** in `width`/`height` des Node speichern. Diese Ermittlung
  liefert zugleich eine zweite Gültigkeitsprüfung (ein `Image.onerror` bei nicht dekodierbaren
  Bytes ⇒ Fehlermeldung wie in 2.3).

### 2.5 Alt-Text bei Einfügung

- Der automatische Startwert `alt = Dateiname` ist akzeptabel, muss aber klar von „editierbarem
  Alt-Text" (Slug `bild-alt-text`) getrennt bleiben. Diese Datei fordert nur, dass dieser
  Startwert die Rundreise überlebt und nicht mit Leerstring überschrieben wird. **Caveat für
  Fremddateien:** Beim DOCX-Import wird `alt` aus `wp:docPr/@name` gelesen, nicht aus `@descr`
  (wo echtes Word den Alternativtext ablegt) — der echte Alt-Text realer Word-Bilder geht daher
  heute verloren (Detail-Fix Sache von `bild-alt-text`, hier als bekannte Grenze dokumentiert).

### 2.6 Zusammenspiel mit Undo/Redo

- Bild-Einfügen ist **ein** Undo-Schritt: Strg+Z entfernt das Bild vollständig **und** führt eine
  durch 2.1.3 ausgelöste Absatz-Teilung wieder zusammen (kein leerer Rest-Absatz), stellt eine
  durch 2.2 ersetzte Selektion vollständig wieder her — ohne Nebeneffekt auf umgebenden Text
  (`FEATURE-SPEC` §2 Testfall 7, §7 Testfall 3). Redo stellt das Bild inkl. aller Attribute
  (`src`, `alt`, `width`, `height`) identisch wieder her.

### 2.7 Zusammenspiel mit Löschen

- Bild markieren (Klick ⇒ `NodeSelection`, da `image` selektierbar) und Entf/Backspace entfernt es
  vollständig ohne Nebenwirkung auf umgebenden Text (Slug `bild-loeschen`). Hier nur als
  Randbedingung für den Undo-Test aus 2.6 und den „verwaiste Mediendatei"-Test aus 5 relevant.

### 2.8 Geltungsbereich innerhalb der Dokumentstruktur

Da `image` `group: 'block'` ist, ist zu prüfen, in welchen Kontexten das Einfügen funktioniert:
- Normaler Absatz (Grundfall, 2.1).
- **Tabellenzelle** (`cellContent: 'block+'`) — Zelle bleibt danach gültig (`[…, image, …]`).
- **Listenpunkt** (`list_item` = `block+`) — Bild bleibt **innerhalb** desselben `list_item`, die
  Liste wird nicht versehentlich beendet, keine Vertauschung zwischen Listenpunkten.
- **Überschrift** — Referenzverhalten (Word/LibreOffice) prüfen und Ergebnis dokumentieren (teilen
  vs. Bild aus der Überschrift herausschieben).
- **Kopf-/Fußzeile**, sobald diese laut `FEATURE-SPEC` §9 über die UI bedienbar sind.

---

## 3. Grenzfälle (Edge Cases)

Jeder Punkt braucht einen eigenen Test, der das beobachtete Ist-Verhalten festhält (bestätigt oder
widerlegt den Verdacht). „Bestätigt" = bereits durch Code-Durchsicht belegt.

### 3.1 Cursor-Position nach Toolbar-Klick (Selection-Sync-Bezug)

Der Klick auf den Button und das Öffnen des Dialogs entziehen dem Editor kurz den Fokus;
`handleImagePick` fügt erst nach dem asynchronen Einlesen ein und liest `view.state`/`view.dispatch`
**zum Einfügezeitpunkt** (nicht zwischengespeichert) — strukturell bereits das gewünschte Verhalten.
**Restrisiko:** Lag vor dem Öffnen bereits eine veraltete/inkorrekte Selektion vor (die in
`WordEditor.tsx` per `mouseup`-Reconciliation für normale Klicks behandelte AllSelection-Situation),
wird diese in die Einfügung übernommen. **Anforderung:** Regressionstest analog
`selection-regression.spec.ts` mit Bild-Einfügen als auslösender Aktion: Text → Cursor setzen → Bild
einfügen → per Klick neu positionieren → Enter → weiter tippen → nichts geht verloren.

### 3.2 Text-Absatz-Teilung beim Einfügen inmitten eines Absatzes (gemeldeter Kernfall)

`insertImage` ruft `replaceSelectionWith(node)` mit einem Block-Node, während die Marke meist
**innerhalb** eines `paragraph` steht; ProseMirror teilt den Absatz, um den Block gültig einzufügen.

> **Einschätzung (revidiert gegenüber der Vorfassung):** Der Verdacht „`replaceSelectionWith`
> verliert Text" ist auf **Command-Ebene sehr wahrscheinlich unbegründet** — ProseMirrors
> Slice-Fitting teilt den Absatz korrekt und erhält beide Hälften. Die real gemeldete
> „Text-weg"-Wahrnehmung ist plausibler durch (a) die auf dem Bild verbleibende `NodeSelection` +
> sofortiges Tippen (3.12), (b) ein ohne Größe riesig gerendertes Bild, das den Folgetext aus dem
> Sichtbereich drängt (2.4/3.4), oder (c) eine stumm als kaputtes `<img>` eingefügte Nicht-Bild-Datei
> (2.3) zu erklären. Diese Einschätzung ersetzt **nicht** den Test — sie priorisiert ihn.

**Anforderung:** Testmatrix für die Marke relativ zum Text: (a) Anfang eines nicht-leeren Absatzes,
(b) Ende, (c) inmitten eines Wortes, (d) inmitten fett/kursiv formatierten Textes, (e) leerer Absatz,
(f) unmittelbar vor/nach einem `hard_break`. In jedem Fall bleiben **beide** Textteile (soweit
vorhanden) inkl. Marks erhalten. Zuerst per echtem `filechooser`-Flow im Browser (§7 Testfall 2 der
`FEATURE-SPEC`), nicht nur über konstruierte ProseMirror-JSON-Daten.

### 3.3 Fehlende Formatprüfung (bestätigt)

`handleImagePick` prüft `file.type`/Signatur nicht. Eine über „Alle Dateien" gewählte `.txt`/`.pdf`
wird als `data:…;base64,…` per `insertImage` eingefügt ⇒ kaputtes `<img>`, keine App-Fehlermeldung.
**Anforderung:** Byte-Signatur-Prüfung vor `insertImage`; bei Nichterfüllung sichtbare Meldung, keine
Einfügung (siehe 2.3).

### 3.4 Diskrepanz Editor-Darstellung vs. Export-Größe (bestätigt)

`insertImage` setzt nie `width`/`height`; der Writer erzwingt dann DOCX 300×200 px / ODT 6×4 cm. Ein
quadratisches (1:1) Bild wird beim DOCX-Export auf 3:2 gezwungen ⇒ **sichtbare Verzerrung**.
**Anforderung:** Test, der ein Bild mit bekanntem, von 3:2 abweichendem Seitenverhältnis über den
echten Flow einfügt, als DOCX **und** ODT exportiert und `wp:extent` bzw. `svg:width`/`svg:height`
gegen das reale Seitenverhältnis prüft (Behebung: 2.4).

### 3.5 Verlust der Bildgröße bei Fremddatei-Rundreise (bestätigt, höchste Priorität)

Weder DOCX- (`wp:extent`/`a:ext`) noch ODT-Reader (`svg:width`/`svg:height`) lesen die reale Größe.
Eine mit echtem Word/LibreOffice erzeugte Datei mit z. B. 5×5 cm-Bild verliert die Größe beim Import
und kommt nach unverändertem Re-Export mit dem Ersatzwert zurück.
**Anforderung (Pflicht):** Reader lesen die Größe aus und legen sie in `width`/`height` (in Pixel bei
96 dpi) ab; Writer verwenden vorhandene `width`/`height` exakt statt des Ersatzwerts. Pflicht-Testfall:
reale Datei mit bekannter, vom Ersatzwert abweichender Größe unverändert hochladen → unverändert
exportieren → exportierte Maße entsprechen dem Original (im Rahmen der Umrechnungsgenauigkeit, siehe
5.3 zur Toleranz).

### 3.6 Mehrere Bilder — Positionstreue und eindeutige IDs

- **Identischer Binärinhalt:** `ImageCollector` dedupliziert nach Data-URL (eine Mediendatei, geteilte
  Referenz). Zu verifizieren: dasselbe Bild zweimal an verschiedenen Stellen ⇒ nach Rundreise bleiben
  **beide** Stellen mit je einem sichtbaren Bild an ihrer Position erhalten.
- **Unterschiedliche Bilder / eindeutige DrawingML-ID (bestätigter Befund):** Der DOCX-Writer schreibt
  für **jedes** Bild `wp:docPr id="1"`/`pic:cNvPr id="0"`. Bei mehreren Bildern kollidieren die IDs ⇒
  Word kann die Datei als reparaturbedürftig ansehen. **Anforderung:** je Bild eine eindeutige
  `wp:docPr/@id` (und `pic:cNvPr/@id`); der Mehr-Bilder-Test wird zusätzlich gegen einen unabhängigen
  Parser (5.1.11) validiert.

### 3.7 Sehr große Bilddatei

`readAsDataURL` hält die komplette Datei als Base64-Data-URL (≈ +33 %) direkt im Dokumentzustand.
**Anforderung:** Ein mehrere MB großes Foto (10–20 MB) darf die UI nicht spürbar einfrieren
(`FEATURE-SPEC` §7 Testfall 10; ein `large-copy-perf.png`-Fixture existiert bereits). Eine Obergrenze
mit klarer Fehlermeldung ist festzulegen und zu dokumentieren (Vorschlag: 20 MB) — oberhalb: Meldung
statt Einfrieren.

### 3.8 Bild am Dokumentanfang/-ende

Bild als allererstes/allerletztes Element (kein Text davor/danach) ⇒ Editor bleibt normal bedienbar,
Cursor davor/danach positionierbar (analog `FEATURE-SPEC` §6 Testfall 10 für Tabellen).

### 3.9 Bild unmittelbar neben anderem Block-Element

Bild direkt vor/nach Tabelle, Liste oder Seitenumbruch ⇒ keine Vermischung/Verschiebung der Nachbarn.

### 3.10 Schnelles Einfügen mehrerer Bilder hintereinander

Mehrere Dateien nacheinander ohne Zwischenklick ⇒ jedes Bild landet an der jeweils aktuellen
Cursor-Position (nicht alle an derselben veralteten) — verwandt mit 3.1/3.12.

### 3.11 Undo einer Einfügung mit Absatz-Teilung

Strg+Z nach einer Einfügung, die einen Absatz geteilt hat, entfernt das Bild **und** stellt den
zusammenhängenden Absatz wieder her (nicht zwei Rest-Absätze) — siehe 2.6.

### 3.12 Tippen unmittelbar nach dem Einfügen (bestätigter UX-Befund)

Nach `replaceSelectionWith` steht eine `NodeSelection` auf dem Bild. **Anforderung:** Nach dem
Einfügen sofort getippter Text darf das Bild **nicht** ersetzen, sondern erscheint dahinter (siehe
2.1.4). Test: Bild einfügen → sofort tippen → Bild bleibt, Text steht dahinter.

### 3.13 EXIF-Orientierung (Foto vom Smartphone)

Ein JPEG mit EXIF-Orientierungsflag (z. B. 90° gedreht) liefert über `naturalWidth/naturalHeight`
die **ungedrehten** Maße, während der Browser das `<img>` je nach `image-orientation` gedreht
darstellt. **Anforderung:** Prüfen und dokumentieren, dass die gespeicherte `width`/`height` zur
tatsächlich dargestellten Orientierung passt (sonst wird ein Hochkant-Foto quer verzerrt). Mindestens:
kein Absturz, keine offensichtliche Quer-/Hochkant-Verzerrung.

### 3.14 Sonder-Bildinhalte

- **Transparenz (PNG-Alpha):** bleibt erhalten (Bytes werden unverändert eingebettet), kein
  Flatten auf weißen Hintergrund — bei Rundreise verifizieren.
- **Animiertes GIF:** Animation ist kein Feature-Ziel, aber die Bytes bleiben erhalten (Rundreise
  darf das GIF nicht in ein Standbild anderer Kodierung umwandeln).
- **CMYK-JPEG:** darf nicht abstürzen; Farbdarstellung „best effort".
- **Endianness/Extremverhältnisse:** 1×1-px-Bild (bleibt in Originalgröße, kollabiert nicht auf 0);
  sehr breites (z. B. 5000×50) bzw. sehr hohes Bild ⇒ Herunterskalierung erhält das Verhältnis.
- **Sehr langer / Sonderzeichen-Dateiname:** wird als `alt` und (nur intern relevant) als
  Media-Dateiname verarbeitet — `alt` wird XML-escaped (bestätigt); Media-Dateien heißen
  formatintern `image{n}.{ext}` unabhängig vom Originalnamen ⇒ kein Pfad-/Escaping-Problem, aber der
  Umlaut-Dateiname aus `FEATURE-SPEC` §1.2 Testfall 4 muss den Editor nicht brechen.

### 3.15 Nicht einbettbare Quelle (externe URL)

Ein Bild-Node mit `src="https://…"` (etwa aus per Zwischenablage eingefügtem Web-HTML, das über
`parseDOM img[src]` in den Editor gelangt) lässt sich **nicht** exportieren (`ImageCollector.add`
wirft). **Anforderung:** Dieser Fall darf beim Export nicht zu einem stillen Abbruch/Datenverlust
führen — verständliche Fehlermeldung (bestätigt durch bestehenden Negativ-Unit-Test; E2E/Export-Pfad
muss die Meldung sichtbar machen, `FEATURE-SPEC` §20.4).

### 3.16 Kumulative Dokumentgröße (viele Bilder)

Da jedes Bild als Base64 im Dokumentzustand liegt und bei jedem Export neu serialisiert wird, ist das
Verhalten bei vielen/großen Bildern zu beobachten (Editor-Reaktionsfähigkeit, Export-Dauer). Mindestens
dokumentieren; harte Grenze optional.

### 3.17 Verbreitertes Async-Einfügefenster durch Signaturprüfung + Dimensionsermittlung

Der Soll-Ablauf (2.3/2.4) fügt gegenüber dem heutigen reinen `FileReader.readAsDataURL` zwei zusätzliche
asynchrone Schritte ein — Bytes lesen + Signatur prüfen und die Data-URL über ein `Image`-Objekt
dekodieren, um `naturalWidth/naturalHeight` zu erhalten. Dadurch vergrößert sich das Zeitfenster zwischen
Klick und tatsächlichem Einfügen. **Anforderung:** Das Bild wird an der Selektion **zum Dispatch-Zeitpunkt**
eingefügt (`run(view, …)` erst **nach** allen `await`s, den Live-`view` lesend — nicht an einer beim Klick
zwischengespeicherten Position). Testfall: Cursor mitten im Text setzen → Einfügen auslösen → **während**
der Dekodierung den Cursor per Klick an eine andere Stelle bewegen → Bild landet an der **neuen** Position,
kein Textverlust. Verwandt mit 3.1 (Selection-Sync) und 3.10 (schnelles Mehrfach-Einfügen).

---

## 4. Visuelle Darstellung

- Das eingefügte Bild ist im Editor **sofort** sichtbar (kein Reload).
- `.ProseMirror img { max-width: 100%; height: auto }` ist bereits vorhanden und verhindert, dass ein
  Bild die Seitenbreite sprengt — mit Test absichern (nicht entfernen). In Kombination mit korrekt
  gesetztem `width`/`height` (2.4) ergibt `height: auto` die proportional richtige Höhe.
- Es fehlt eine `.ProseMirror-selectednode`-Regel: ein per Klick markiertes Bild ist optisch nicht
  vom nicht-markierten unterscheidbar. **Anforderung:** sichtbare Markierung (z. B. Outline) für den
  `NodeSelection`-Zustand — Voraussetzung u. a. für zuverlässiges Löschen (Slug `bild-loeschen`) und
  für die Erkennbarkeit der Situation aus 2.1.4/3.12.
- Das Button-Icon muss ohne Emoji-Font eindeutig erkennbar sein (SVG statt „🖼", siehe 1/§20.1).

---

## 5. Rundreise-Anforderung (DOCX **und** ODT)

Verbindlich für **beide** Formate, in **beiden** Richtungen (Import und Export): Datei A hochladen →
**unverändert** exportieren → Ergebnis entspricht inhaltlich A; zusätzlich für im Editor neu
eingefügte Bilder (Export → Re-Import).

### 5.1 Pflicht-Szenarien

1. **DOCX, Editor-Erzeugung:** Neues Dokument → Text → Cursor mitten im Text → Bild über echten
   `filechooser`-Flow → als DOCX exportieren → Re-Import → Bild an derselben relativen Position,
   **beide** Textteile unverändert, Bild sichtbar und **nicht verzerrt** (Seitenverhältnis erhalten).
2. **ODT, Editor-Erzeugung:** dieselbe Sequenz als ODT.
3. **DOCX-Fremddatei (unverändert):** mit echtem Word erzeugte DOCX mit eingebettetem Bild bekannter
   Größe hochladen → **ohne Änderung** exportieren → dasselbe Bild mit **derselben** `wp:extent`-Größe
   (nicht 300×200 px), keine verwaisten Mediendateien, keine zusätzlichen/fehlenden Bilder.
4. **ODT-Fremddatei (unverändert):** analog mit echtem LibreOffice; `svg:width`/`svg:height` bleiben
   exakt erhalten.
5. **Cross-Format DOCX → ODT:** Bild, Alt-Text **und** Größe (in die jeweilige Einheit umgerechnet)
   bleiben erhalten.
6. **Cross-Format ODT → DOCX:** analog.
7. **Doppelte Rundreise:** DOCX → Editor → ODT → Editor → DOCX ⇒ Bild inhaltlich identisch, an
   derselben Stelle, ohne kumulativen Maß-/Qualitätsverlust.
8. **Bild in Struktur:** Bild in Tabellenzelle, in Listenpunkt und in Kopf-/Fußzeile (sobald UI-fähig)
   ⇒ Zuordnung/Position bleibt je einzeln erhalten (`FEATURE-SPEC` §7 Testfall 7 — heute nicht einmal
   auf Unit-Ebene abgedeckt).
9. **Mehrere Bilder:** mindestens drei unterschiedliche Bilder an verschiedenen Positionen ⇒ nach
   Rundreise alle einzeln, unterscheidbar, positionsrichtig (kein Vertauschen; eindeutige DrawingML-IDs,
   siehe 3.6). Zusätzlich ein Fall mit zwei **identischen** Bildern (Dedup-Pfad).
10. **Bild löschen, dann exportieren:** Bild einfügen → löschen (Entf) → exportieren ⇒ **kein**
    verwaistes Bild im Archiv (weder `media/*`/`Pictures/*` noch Relationship-/Manifest-Eintrag)
    (`FEATURE-SPEC` §7 Testfall 9).
11. **Unabhängige DOCX-Validierung:** der exportierte `<w:drawing>`-Block wird von einer vom eigenen
    Reader unabhängigen Prüfung (z. B. `python-docx` bzw. das bereits eingebundene
    `external-validation.test.ts`) als valides eingebettetes Bild erkannt — inkl. eindeutiger
    `wp:docPr/@id` und korrektem `[Content_Types].xml`-Eintrag zur Bildendung.
12. **Unabhängige ODT-Validierung:** Export besteht die **bereits vorhandene** RelaxNG-Validierung
    gegen das OASIS-ODF-1.3-Schema (`external-validation.test.ts`) — **auch mit gesetzter Größe**;
    d. h. der `svg:width`/`svg:height`-Wert muss ein schemagültiger ODF-Längenwert sein (die heutige
    `px`-Einheit ist genau hier zu verifizieren, siehe 0).

### 5.2 Format-/Content-Type-Treue

- Das eingebettete Medienformat bleibt bei der Rundreise erhalten: PNG bleibt PNG, JPEG bleibt JPEG,
  GIF/WebP/BMP entsprechend. **Anforderung:** DOCX-`[Content_Types].xml` deklariert je verwendeter
  Endung den korrekten `ContentType` (der Writer tut das je Endung — mit Test absichern); ODT-`manifest.xml`
  führt je Bild den korrekten `media-type`. **Dokumentierte Grenze:** WebP wird von älteren Word-Versionen
  ggf. nicht dargestellt — ob eingebettet belassen oder beim Export konvertiert wird, ist als bewusste
  Entscheidung festzuhalten (Vorschlag: unverändert einbetten, Limitation dokumentieren).
- Reader-MIME-Ableitung erfolgt aus der Dateiendung (`jpg → jpeg`); Endungen ohne darstellbaren
  Browser-MIME (z. B. `.emf`/`.wmf`/`.tiff` aus Fremddateien) dürfen nicht zu einem stillen leeren Bild
  führen — mindestens Platzhalter/Meldung, kein Absturz.

### 5.3 Maß-Toleranz und übernommene Grenzfälle

- Größen-Rundreise gilt als erfüllt, wenn die Maße im Rahmen der Einheiten-Umrechnung (px↔EMU bzw.
  px↔cm bei 96 dpi) übereinstimmen (Rundungstoleranz ± 1 px bzw. entsprechend); das ist als konkrete
  Toleranz im Test festzuschreiben, damit „unverändert" nicht an Rundung scheitert, aber echte
  Verzerrung (3.4) sicher auffällt.
- Die Grenzfälle 3.4 (Diskrepanz Darstellung/Export), 3.5 (Größenverlust Fremddatei), 3.6 (mehrere
  Bilder/IDs), 3.14 (Transparenz/GIF), 3.15 (externe URL) sind ausdrücklich Teil der Rundreise-Abnahme.

---

## 6. Testplan-Hinweise (Unit + E2E, Playwright)

1. **Unit-Tests ergänzen:** bestehende DOCX/ODT-Roundtrip-Tests um Assertions für
   `attrs.width`/`attrs.height` erweitern (heute im DOCX-Test trotz gesetzter Eingabewerte nicht
   geprüft); neue Tests für Bild in Tabellenzelle, in Listenpunkt, in Kopf-/Fußzeile, zwei identische
   Bilder an verschiedenen Positionen, mehrere unterschiedliche Bilder (eindeutige `wp:docPr/@id`).
2. **Unit-Test Import-Größe:** DOCX-/ODT-XML mit von den Ersatzwerten abweichender Größe ⇒ Reader
   erzeugt Node mit exakt dieser Größe (heute rot, da der Lesepfad fehlt).
3. **Unit/Command-Test `insertImage`:** direkter Test, dass der Command bei allen Cursor-Positionen aus
   3.2 beide Textteile erhält (heute existiert kein Test für den Command selbst, nur Reader/Writer-Roundtrip).
4. **E2E-Grundfall (dedizierter `bild-einfuegen.spec.ts`):** `.ProseMirror` fokussieren, Text tippen,
   Cursor mitten im Text, echten Flow auslösen via `page.locator('label:has-text("Bild")')
   .locator('input[type=file]').setInputFiles(...)` (Muster **existiert bereits** in `clipboard.spec.ts`/
   `cut.spec.ts` und ist damit bewährt) → Bild im DOM sichtbar, **beide** Textteile unverändert (deckt
   3.2 ab). Der Datei-Upload-Mechanismus ist erprobt, aber ein Test für die Einfüge-Funktion **selbst**
   fehlt und ist zu ergänzen.
5. **E2E-Tippen-nach-Einfügen (3.12):** Bild einfügen → sofort tippen → Bild bleibt, Text dahinter.
6. **E2E-Undo (2.6):** direkt nach 4 → Strg+Z → Bild weg, Text (inkl. wieder zusammengeführtem Absatz)
   exakt wie vorher.
7. **E2E-Rundreise DOCX & ODT:** Bild einfügen → echten Export-Download auslösen → wieder importieren →
   Bild + Größe erhalten (ergänzt die konstruierten Unit-Tests).
8. **E2E-Formatprüfung (3.3):** Nicht-Bild-Datei über den echten Upload-Weg wählen → sichtbare,
   angekündigte Fehlermeldung, keine Einfügung, keine Konsolen-Ablehnung.
9. **Regressionstest Selection-Sync (3.1):** Bild-Einfügen als auslösende Aktion in
   `selection-regression.spec.ts` (oder Variante): Text → Bild → per Klick neu positionieren → Enter →
   weiter tippen → nichts verloren.
10. **Reale Fixtures:** je eine mit echtem Word und echtem LibreOffice erzeugte Datei mit Bild
    **bekannter, vom Ersatzwert abweichender Größe** ins Fixture-Verzeichnis (`tests/fixtures/external/…`)
    aufnehmen und in je einen Rundreise-Test einbinden — synthetisches Test-XML deckt reale Eigenheiten
    (`a:srcRect`, Beschnitt-Metadaten, `@descr`-Alt-Text) nicht ab. (Kleine Einfüge-Fixtures
    `tiny-copy-6.png`/`large-copy-perf.png` existieren bereits für den Upload-Weg.)
11. **Großdatei (3.7):** mehrere MB großes Bild über den echten Weg einfügen → Zeit bis zur Darstellung
    messen, UI bleibt bedienbar; Datei über der Grenze ⇒ Meldung.
12. **Externe Validierung:** DOCX- und ODT-Export mit gesetzter Bildgröße durch die bestehenden
    `external-validation.test.ts` schleusen (ODF-RelaxNG bzw. OOXML) — deckt 5.1.11/5.1.12 inkl.
    `px`-Einheit-Frage und eindeutige IDs ab.

---

## 7. Abnahmekriterien (Definition of Done)

Hardest-first geordnet. Die Funktion gilt erst wieder als vertrauenswürdig **„vorhanden"**, wenn:

1. **Kernfall (3.2/2.1.3):** Text vor **und** nach dem Bild bleibt bei Einfügen inmitten eines Absatzes
   für **alle** Cursor-Positionen aus 3.2 erhalten — abgesichert per echtem Browser-`filechooser`-Test.
2. **Größe-Rundreise (3.5/3.4):** die beiden durch Code-Durchsicht bestätigten Defekte sind behoben und
   per Regressionstest (Unit **und** E2E) abgesichert — Reader lesen `wp:extent`/`svg:width|height`,
   Writer verwenden vorhandene Maße exakt, Editor-Darstellung und Export-Größe stimmen überein; **oder**
   eine bewusste, ausdrücklich dokumentierte Einschränkung (kein stiller Fehlschlag).
3. **Alle 12 Rundreise-Szenarien aus 5.1 grün**, inkl. der beiden unabhängigen Validierungen
   (5.1.11 OOXML/`python-docx`, 5.1.12 ODF-RelaxNG **mit gesetzter Größe**) und Szenario 8 (Bild in
   Tabellenzelle/Listenpunkt/Kopf-Fußzeile).
4. **Mehrere Bilder (3.6):** eindeutige `wp:docPr/@id`/`pic:cNvPr/@id` je Bild; Mehr-Bilder- und
   Identisch-Bilder-Fall positionsrichtig und unabhängig-validiert.
5. **Formatprüfung (3.3/2.3):** Byte-Signatur-Prüfung implementiert; sichtbare, angekündigte
   Fehlermeldung; unhandled Promise-Rejection beseitigt (`try/catch`); Test vorhanden.
6. **Selektion nach Einfügen (2.1.4/3.12):** Tippen unmittelbar nach dem Einfügen ersetzt das Bild
   nicht (oder das Alternativverhalten ist dokumentiert und getestet).
7. **Selection-Sync-Regressionstest (3.1)** mit Bild-Einfügen ist dauerhaft Teil der Suite.
8. **Bedienelement (Abschnitt 1):** `<button>` mit `title`/`aria-label`, tastaturerreichbar,
   SVG-Icon statt Emoji; `.ProseMirror-selectednode`-Markierung vorhanden.
9. **Robustheit:** großes Bild friert die UI nicht ein und/oder wird sauber abgelehnt (3.7); externe-URL-
   Export erzeugt eine sichtbare Meldung statt stillem Abbruch (3.15); EXIF-Orientierung (3.13),
   Transparenz/GIF (3.14) verifiziert.
10. **Dieselbe-Datei-zweimal** und **Dialog-Abbruch** sind mit Tests abgesichert (2.3).

Andernfalls ist der Backlog-Status auf **teilweise** zu setzen und die konkret fehlenden Teilpunkte sind
hier nachzutragen (analog `FEATURE-SPEC-DOCX-ODT.md` §17/§21).

---

## 8. Offene Entscheidungen zur Freigabe

1. **Formatliste:** PNG+JPEG verbindlich; GIF/WebP/BMP empfohlen; SVG vorerst ausgeschlossen — bestätigen
   oder anpassen (2.3).
2. **Größenobergrenze:** Vorschlag 20 MB mit Fehlermeldung — bestätigen oder Wert festlegen (3.7).
3. **Selektion nach Einfügen:** Textcursor hinter dem Bild (Word-Verhalten, empfohlen) **oder** Bild
   markiert lassen — Entscheidung treffen und dokumentieren (2.1.4).
4. **WebP im Export:** unverändert einbetten (empfohlen, Limitation dokumentieren) **oder** konvertieren
   (5.2).
5. **Überschrift als Einfüge-Kontext:** teilen wie ein Absatz **oder** Bild herausschieben — am
   Word/LibreOffice-Referenzverhalten festmachen (2.8).
