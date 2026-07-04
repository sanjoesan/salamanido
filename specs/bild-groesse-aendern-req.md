# Anforderungen: Bildgröße ändern (`bild-groesse-aendern`)

Status: Vom Backlog als **„fehlt"** geführt — gilt gemäß Aufgabenstellung als
**nicht vertrauenswürdig** und muss vollständig verifiziert werden, bevor dieser Status
bestätigt werden darf. Eine erste Code-Verifikation wurde beim Erstellen dieses
Dokuments bereits durchgeführt (siehe Abschnitt 6, „Ist-Zustand laut Code-Analyse")
und **bestätigt** den Backlog-Eintrag im Kern: Es gibt aktuell **weder ein
Eingabefeld noch Ziehpunkte noch irgendeinen anderen UI-Weg**, die Größe eines
eingefügten Bildes zu verändern. Die Verifikation deckt zusätzlich einen **tieferliegenden,
bereits vorhandenen Datenverlust-Bug** auf, der unabhängig von der fehlenden UI besteht
und der behoben werden muss, damit eine künftige Resize-Funktion überhaupt einen
dauerhaften Effekt haben kann (siehe Abschnitt 6.3): Die Originalgröße eines beim
Import gelesenen Bildes wird **nie** aus der Datei übernommen und geht beim nächsten
Export **stillschweigend** verloren, auch wenn nie irgendjemand eine Größenänderung
vorgenommen hat.

Bezug: `E:\docs\specs\FEATURE-BACKLOG.md`, Zeile `bild-groesse-aendern`
(„Passt Höhe/Breite per Eingabefeld oder Ziehpunkte an.", Bereich „3.3 Bilder &
Grafiken", Priorität **1 – essenziell**), sowie `E:\docs\FEATURE-SPEC-DOCX-ODT.md`,
Abschnitt 7 („Bilder", von der Nutzerin explizit als nicht funktionsfähig gemeldet —
höchste Priorität; dort wörtlich: „Größe nachträglich änderbar (mind. per
Eingabefeld, idealerweise per Ziehpunkte)." sowie „Bildgröße: sinnvolle
Standardgröße beim Einfügen, keine Bilder, die die Seite sprengen oder auf 0×0
kollabieren."), Testfall 8 („Reale komplexe Datei mit mehreren, unterschiedlich
großen Bildern importieren → alle sichtbar, keines fehlt, keines verzerrt.") und
Abschnitt 17, Zeile 7 („Bild einfügen — vorhanden, aber laut Nutzerin nicht
funktional"). An Stil und Detailtiefe von `E:\docs\FEATURE-SPEC-DOCX-ODT.md` sowie
den bereits vorhandenen `specs/tabelle-einfuegen-req.md` und
`specs/schriftgroesse-waehlen-req.md` orientiert sich dieses Dokument.

Betroffene Quelldateien (Ist-Stand zum Zeitpunkt dieser Anforderungsdefinition — alle
Stellen, die für die Implementierung angefasst werden müssen):

| Ort | Inhalt |
|---|---|
| `src/formats/shared/schema.ts:45-72` | ProseMirror-Node `image` — Attribute `src`, `alt` (Default `''`), **`width`** und **`height`** (beide Default `null`) sind bereits im Schema vorhanden. `parseDOM` liest `width`/`height` aus `<img>`-HTML-Attributen (z. B. beim Einfügen aus der Zwischenablage), `toDOM` schreibt sie zurück auf `<img width height>`. Das Datenmodell für die Größe existiert also bereits vollständig — es fehlt ausschließlich die Bedienung. |
| `src/formats/shared/editor/commands.ts:66-74` | `insertImage(src, alt)` — nimmt **keine** Breite/Höhe entgegen, erzeugt den Node immer mit `width: null, height: null` (Schema-Default). Kein `setImageSize(width, height)` oder vergleichbares Command vorhanden. |
| `src/formats/shared/editor/Toolbar.tsx:97-108,242-243` | Button „🖼 Bild" + `handleImagePick()` liest die Datei per `FileReader.readAsDataURL`, ruft `insertImage(dataUrl, file.name)` **ohne** jede Größenermittlung/-vorgabe auf. Kein Bedienelement für Größe irgendwo in der Toolbar. |
| `src/formats/shared/editor/WordEditor.tsx` | Kein `nodeViews`-Eintrag für `image` (Suche über `nodeView`/`NodeView` im gesamten `src/formats/shared/` liefert **keinen** Treffer außer `schema.ts:38`, das sich auf `hard_break` bezieht). Es existiert also **keine** Möglichkeit, eigene Ziehpunkte/Griffe an einem selektierten Bild zu rendern — dafür müsste ein eigener NodeView gebaut werden. |
| `src/index.css:39-42` | `.ProseMirror img { max-width: 100%; height: auto; }` — rein visuelle Deckelung im Editor (verhindert, dass ein zu breites `<img>` den Editor-Container sprengt), **unabhängig** vom tatsächlich im Dokumentmodell gespeicherten `width`/`height`-Attribut. Bei künftigen Ziehpunkten muss geklärt werden, wie sich diese CSS-Deckelung zur live gezogenen Modellbreite verhält (siehe Grenzfall 4.9). |
| `src/formats/docx/reader.ts:134-138,173-176` | `decodeParagraphRuns()`/`paragraphToBlocks()` — liest aus `<w:drawing>` ausschließlich die Bild-Relationship (`r:embed`) und den Namen aus `<wp:docPr name="…">` als `alt`. **`<wp:extent cx="…" cy="…">` wird nirgends ausgelesen** — der erzeugte `image`-Node erhält immer `width: undefined, height: undefined` (Schema-Default `null`), unabhängig von der tatsächlichen Größe in der importierten Datei. |
| `src/formats/docx/writer.ts:72-92` | `imageParagraphXml()` — `const widthPx = Number(node.attrs?.width ?? 300)`, `const heightPx = Number(node.attrs?.height ?? 200)`; da der Reader (siehe oben) `width`/`height` **niemals** setzt, greift bei **jedem** re-exportierten, zuvor importierten Bild der Default **300×200 px**, umgerechnet in EMU (`cx`/`cy`) und in `<a:xfrm><a:ext>`. Das erzwingt eine feste Zielgröße unabhängig vom tatsächlichen Seitenverhältnis des Originalbilds — eine 4000×3000-px-Fotografie würde beim Reimport auf 300×200 px (Seitenverhältnis 3:2 statt 4:3) gequetscht dargestellt. |
| `src/formats/odt/reader.ts:147-149` | Analog zu DOCX: liest nur `draw:image[xlink:href]` und `draw:name` (→ `alt`). **`svg:width`/`svg:height`** des umgebenden `<draw:frame>` werden nirgends ausgelesen. |
| `src/formats/odt/writer.ts:112-120` | `blockToOdt()`, Fall `'image'` — `const width = node.attrs?.width ? `${node.attrs.width}px` : '6cm'`, analog `height` → `'4cm'`. Gleiches Problem wie beim DOCX-Writer, nur mit anderem Default (6 cm × 4 cm statt 300×200 px) und anderer Einheit. |
| `src/formats/docx/imageCollector.ts` / `src/formats/odt/imageCollector.ts` (Äquivalent) | Dedupliziert eingebettete Bilddateien **ausschließlich** über die Daten-URL (`src`), nicht über Größe — mehrere `image`-Nodes mit demselben `src`, aber unterschiedlichem `width`/`height` teilen sich dieselbe eingebettete Binärdatei und bekommen trotzdem individuell korrekte `wp:extent`/`svg:width`/`svg:height` je Node. Das ist bereits jetzt architektonisch korrekt und muss beim Bau der Resize-Funktion **nicht** geändert werden (siehe Grenzfall 4.11 zur Bestätigung). |
| `src/formats/docx/__tests__/roundtrip.test.ts:253-259` | Einziger vorhandener Bild-Unit-Test mit `width`/`height` im Eingabe-Objekt (`attrs: { src: TINY_PNG, alt: 'Testbild', width: 100, height: 80 }`) — die nachfolgenden `expect(...)`-Aufrufe prüfen aber **ausschließlich** `image.type` und `image.attrs.src`, **niemals** `image.attrs.width`/`image.attrs.height` des Ergebnisses. Der oben beschriebene Reader-Bug (Größe geht beim Import verloren) wird durch diesen Test also **nicht** aufgedeckt, obwohl er auf den ersten Blick wie ein Größen-Test aussieht — ein klassischer „False Confidence"-Testfall, der beim Bau dieser Anforderung ergänzt werden muss (siehe Abschnitt 7, Testfall 12). |
| `src/formats/odt/__tests__/roundtrip.test.ts:213-221` | Äquivalenter ODT-Test — hier wird `width`/`height` im Eingabe-Objekt nicht einmal gesetzt, das Problem ist also noch unsichtbarer. |

**Explizit außerhalb des Geltungsbereichs dieser Datei** (eigene, separate
Backlog-Einträge in `FEATURE-BACKLOG.md` Abschnitt 3.3, jeweils Status „fehlt" bzw.
„teilweise", dort einzeln zu verifizieren, sobald gebaut):
`bild-alt-text` (Alternativtext editierbar machen — aktuell laut Backlog
„teilweise", da `alt` nur einmalig aus dem Dateinamen beim Einfügen gesetzt wird,
`Toolbar.tsx:107`, und danach nicht mehr änderbar ist; wird hier nur insofern
berührt, als ein künftiges Bild-Eigenschaften-Panel für die Größe naheliegend auch
ein Alt-Text-Feld enthalten könnte — das ist jedoch **nicht** Gegenstand dieser
Anforderung), `bild-zuschneiden` (Zuschneiden verändert den sichtbaren Ausschnitt,
nicht die Anzeigegröße — eigener Eintrag), `textumbruch-bild`/`bild-position`
(Textumfluss/Verankerung — das Bild ist aktuell `group: 'block'`, schema.ts:46,
also immer ein eigener Block ohne Umfließen; das bleibt so, bis diese separaten
Einträge umgesetzt werden), `bild-korrekturen`, `bild-kuenstlerische-effekte`,
`bild-formatvorlagen`, `bild-hintergrund-entfernen`, `bild-komprimieren` (alle
„fehlt", Priorität 4, reine Bildbearbeitung, keine Geometrie).

---

## 1. Menüpunkte/Bedienelemente (Soll-Zustand)

Da die Funktion aktuell komplett fehlt, listet diese Tabelle den **zu bauenden**
Soll-Zustand statt eines vorhandenen Ist-Zustands:

| # | Element | Ort (geplant) | Soll-Verhalten |
|---|---|---|---|
| 1 | Bild-Eigenschaften-Panel/Mini-Toolbar „Größe" | Erscheint kontextabhängig, sobald ein `image`-Node als `NodeSelection` selektiert ist (Klick auf das Bild) — analog zu Word/LibreOffice, die bei Bildauswahl eine eigene Kontext-Toolbar/-Registerkarte einblenden. Kein dauerhaft sichtbares Element in der Haupt-Toolbar, solange kein Bild selektiert ist. | Zwei numerische Eingabefelder „Breite" und „Höhe" (Einheit sichtbar, siehe 2.6), eine Checkbox/Toggle „Seitenverhältnis beibehalten" (Standard: aktiviert), ein Button „Auf Originalgröße zurücksetzen" (nur aktiv, wenn eine Originalgröße bekannt ist, siehe 2.5/4.4). |
| 2 | Eingabefeld „Breite" | Teil von Element 1 | Numerisch, Bestätigung per Enter oder Blur, ändert `width`-Attribut des selektierten `image`-Node über ein neues Command `setImageSize(width, height)`. Bei aktivierter Seitenverhältnis-Sperre wird `height` automatisch proportional mitgeführt (siehe 2.3). |
| 3 | Eingabefeld „Höhe" | Teil von Element 1 | Analog zu „Breite", umgekehrte Kopplung bei Seitenverhältnis-Sperre. |
| 4 | Ziehpunkte (Resize-Handles) am selektierten Bild | Neuer NodeView für den `image`-Node in `WordEditor.tsx` (aktuell nicht vorhanden) | Acht sichtbare Griffe (vier Ecken, vier Seitenmitten) am Rand des selektierten Bildes, analog Word/LibreOffice/Google Docs. Ziehen an einem **Eckgriff** ändert Breite und Höhe gemeinsam unter Beibehaltung des Seitenverhältnisses (unabhängig vom Zustand der Checkbox aus Element 1 — Eckgriffe sperren das Verhältnis immer, das ist Standardverhalten aller drei Referenzanwendungen). Ziehen an einem **Seitengriff** (oben/unten/links/rechts) ändert ausschließlich die jeweilige Dimension, unabhängig vom Seitenverhältnis. |
| 5 | Live-Vorschau während des Ziehens | Teil von Element 4 | Während des Ziehens wird die Bildgröße sichtbar live aktualisiert (kein Rahmen-Vorschau-Rechteck ohne Bildinhalt), die Eingabefelder aus Element 1 aktualisieren sich synchron mit den während des Ziehens aktuellen Werten. |
| 6 | Button „Auf Originalgröße zurücksetzen" | Teil von Element 1 | Setzt `width`/`height` exakt auf die beim Einfügen/Import ermittelte Originalgröße zurück (siehe 2.5). Ohne bekannte Originalgröße (z. B. bereits mehrfach verändert und Originalwert nicht mehr vorgehalten, siehe Grenzfall 4.4) ist der Button deaktiviert/ausgeblendet, nicht einfach wirkungslos anklickbar. |
| 7 | Tastatur-Bedienbarkeit der Ziehpunkte | Teil von Element 4 | Mindestens die Eingabefelder aus Element 1/2/3 müssen per Tab erreichbar und mit Tastatur bedienbar sein, damit Größenänderung nicht ausschließlich per Maus möglich ist (Barrierefreiheits-Mindestanforderung). Für die Ziehpunkte selbst ist Maus-/Touch-Bedienung der Hauptweg; eine reine Tastaturalternative für die Ziehpunkte selbst ist nicht zwingend Teil dieser Anforderung, solange die Eingabefelder als vollwertige Tastatur-Alternative existieren. |
| 8 | Anzeige der aktuellen Größe ohne Selektion | — | Es gibt **keine** dauerhafte Anzeige der Bildgröße, solange kein Bild selektiert ist (kein Tooltip beim Hovern zwingend erforderlich) — kein Blocker für diese Anforderung, aber als bewusste Abgrenzung dokumentiert. |

Es gibt **keinen** zusätzlichen Menüpunkt „Format" → „Grafik formatieren…" (kein
Ribbon/Backstage-Dialog mit erweiterten Bildoptionen wie Zuschneiden, Textumbruch,
Farbkorrektur) — das ist nicht Bestandteil dieser Anforderung (siehe Abgrenzung
oben) und **keine** eigene Tastenkombination zum Fokussieren der Größenfelder.

---

## 2. Gewünschtes Verhalten im Detail

### 2.1 Bild auswählen

- Klick auf ein eingefügtes Bild erzeugt eine ProseMirror-`NodeSelection` auf genau
  diesem `image`-Node (Standardverhalten, da der Node nicht `selectable: false`
  gesetzt hat, im Unterschied zu `hard_break`, `schema.ts:38`) — muss dennoch
  explizit über echte Browser-Interaktion verifiziert werden, da aktuell kein Test
  dafür existiert.
- Nur bei aktiver `NodeSelection` auf einem `image`-Node erscheint das
  Eigenschaften-Panel aus Abschnitt 1, Element 1, sowie die Ziehpunkte aus Element 4.
- Klick neben das Bild oder auf einen anderen Node hebt die Auswahl auf, Panel und
  Ziehpunkte verschwinden wieder.

### 2.2 Größenänderung per Eingabefeld

1. Bild auswählen (2.1), im Feld „Breite" oder „Höhe" einen neuen Wert eintippen,
   mit Enter oder Blur bestätigen.
2. Bestätigung ruft `setImageSize(width, height)` (neu zu bauendes Command,
   analog zu `setAlign()`/`setHeading()` in `commands.ts`, die per
   `state.tr.setNodeAttribute(pos, …)` arbeiten) mit den – bei aktivem
   Seitenverhältnis-Lock automatisch mitberechneten – Werten für die jeweils andere
   Dimension auf.
3. Änderung erfolgt **sofort** bei Bestätigung, kein zusätzlicher
   „Übernehmen"-Button.
4. Fokus/Selektion bleiben nach Anwenden erhalten (die `NodeSelection` auf dem Bild
   bleibt bestehen, damit unmittelbar eine zweite Größenänderung oder ein Löschen
   ohne erneutes Klicken möglich ist).

### 2.3 Größenänderung per Ziehpunkte

1. Ziehen an einem der vier **Eckgriffe**: Breite und Höhe ändern sich gemeinsam,
   Seitenverhältnis wird dabei immer beibehalten (unabhängig vom Zustand der
   Checkbox aus 2.2) — Standardverhalten sämtlicher Referenzanwendungen.
2. Ziehen an einem der vier **Seitengriffe**: Nur die jeweils betroffene Dimension
   (Breite bei links/rechts, Höhe bei oben/unten) ändert sich, das
   Seitenverhältnis wird bewusst **nicht** gehalten.
3. Während des Ziehens wird die Größe live im Editor sichtbar aktualisiert; die
   endgültige Transaktion (und damit der einzelne Undo-Schritt, siehe 2.7) wird
   erst beim Loslassen der Maustaste (`mouseup`)/Beenden der Touch-Geste
   geschrieben — nicht bei jedem Zwischenschritt des Ziehens (sonst entstünde ein
   Undo-Schritt pro Pixel, siehe Grenzfall 4.7).
4. Ziehen über den sichtbaren Editor-/Seitenrand hinaus wird sinnvoll begrenzt
   (siehe Grenzfall 4.2) statt zu einem unbegrenzt wachsenden/schrumpfenden Bild zu
   führen.

### 2.4 Standardgröße beim Einfügen (aktuell nicht vorhanden)

- Aktuell (`commands.ts:66-74`, `Toolbar.tsx:107`) wird beim Einfügen **kein**
  `width`/`height` gesetzt — der Browser zeigt das Bild in seiner nativen
  Pixelgröße, begrenzt nur durch die CSS-Regel `max-width: 100%` (`index.css:40`).
  Das widerspricht der in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 7 geforderten
  „sinnvollen Standardgröße beim Einfügen, keine Bilder, die die Seite sprengen
  oder auf 0×0 kollabieren" — bei einem sehr kleinen Bild (z. B. 16×16 px Icon)
  wird aktuell tatsächlich ein winziges 16×16-px-Bild eingefügt, nicht sinnvoll
  vergrößert.
- **Anforderung:** Beim Einfügen wird die native Bildgröße ermittelt (z. B. über
  ein `Image`-Objekt/`decode()` im Browser, bevor `insertImage` aufgerufen wird)
  und als Startwert für `width`/`height` im neuen `image`-Node gesetzt — das
  Seitenverhältnis des Originalbilds bleibt dabei erhalten. Übersteigt die
  native Breite die verfügbare Seiten-/Spaltenbreite, wird proportional auf die
  verfügbare Breite herunterskaliert; ein pathologisch kleines Bild wird **nicht**
  künstlich vergrößert (kein Verzerren/Hochskalieren mit Qualitätsverlust ohne
  Nutzerabsicht).
- Diese beim Einfügen ermittelte Größe gilt zugleich als „Originalgröße" für den
  „Zurücksetzen"-Button aus Abschnitt 1, Element 6 (bei neu eingefügten Bildern).
  Bei importierten Fremddateien gilt die im Dokument gespeicherte Ursprungsgröße
  als Originalgröße (siehe 2.5, 3.3).

### 2.5 Zurücksetzen auf Originalgröße

- Solange ein Bild noch nicht manuell in der Größe verändert wurde, sind aktuelle
  Größe und Originalgröße identisch (Button aus 1.6 ist dann sichtbar, aber
  wirkungslos/deaktiviert, da keine Änderung rückgängig zu machen ist).
- Nach mindestens einer Größenänderung stellt der Button die zuvor beim
  Einfügen/Import ermittelte Originalgröße exakt wieder her.
- Die Originalgröße muss dafür getrennt vom aktuellen `width`/`height`
  vorgehalten werden (z. B. als zusätzliche, nicht editierbare Node-Attribute wie
  `naturalWidth`/`naturalHeight`, analog zum bereits im Schema vorhandenen Muster
  attributbehafteter Nodes) — **muss neu ins Schema aufgenommen werden**, ist
  aktuell nicht vorhanden.
- Cross-Format-Rundreise: Da weder das DOCX- noch das ODT-Format ein Standard-Feld
  für „ursprüngliche Bildgröße vor manueller Änderung" kennt, ist zu klären und zu
  dokumentieren, ob dieser Wert beim Export überhaupt persistiert wird oder nur
  innerhalb einer Editier-Sitzung gilt (siehe Grenzfall 4.4 und offene Frage in
  Abschnitt 6.4).

### 2.6 Einheiten und Umrechnung

- Intern (ProseMirror-Schema, `width`/`height`) wird durchgehend in **CSS-Pixeln
  bei 96 dpi** gerechnet — das entspricht der bereits vom DOCX-Writer verwendeten
  Umrechnung (`docx/writer.ts:78-80`: `cx = widthPx / 96 * 914400`).
- Die Anzeige in den Eingabefeldern aus Abschnitt 1 erfolgt in einer für
  Endnutzer:innen vertrauten Einheit — mindestens **Zentimeter** (konsistent zum
  ODT-Default `6cm`/`4cm`, `odt/writer.ts:115-116`) oder Pixel; welche der beiden
  Einheiten Standard ist, muss vor Umsetzung final festgelegt werden (offene Frage,
  siehe Abschnitt 6.4) — es darf aber in jedem Fall **keine** Uneinigkeit zwischen
  angezeigter und tatsächlich im Dokumentmodell gespeicherter Größe entstehen
  (keine stille Rundungsabweichung ohne sichtbare Korrektur im Feld, analog zur
  Anforderung an Rundung in `schriftgroesse-waehlen-req.md` Abschnitt 2.5).
- DOCX-Export rechnet `width`/`height` (px) in EMU um (bereits vorhanden,
  `docx/writer.ts:78-80`, muss nur noch mit **echten**, vom Reader korrekt
  gelesenen bzw. vom Nutzer gesetzten Werten gefüttert werden statt dem
  aktuellen 300×200-Default).
- ODT-Export rechnet `width`/`height` (px) in `cm` um (aktuell nur als
  reiner String-Fallback `'6cm'`/`'4cm'` vorhanden, `odt/writer.ts:115-116`; bei
  gesetztem `width`/`height` wird zwar bereits `${width}px`/`${height}px`
  geschrieben, was von ODF technisch als gültige Einheit akzeptiert wird — zu
  klären, ob eine Umrechnung nach `cm` zur besseren Interoperabilität mit älteren
  ODF-Konsumenten sinnvoller ist, siehe Grenzfall 4.10).

### 2.7 Undo/Redo

- Jede abgeschlossene Größenänderung (Eingabefeld-Bestätigung **oder** eine
  abgeschlossene Ziehgeste von `mousedown` bis `mouseup`) ist genau **ein**
  Undo-Schritt.
- Undo direkt nach einer Größenänderung stellt exakt die vorherige Breite/Höhe
  wieder her, Redo die geänderte Größe erneut — unabhängig davon, ob die Änderung
  über das Eingabefeld oder über Ziehpunkte ausgelöst wurde.
- Funktioniert auch in gemischten Sequenzen (Bild einfügen → Größe ändern →
  weiterer Text davor/danach → Undo mehrfach) in korrekter, umgekehrter
  Reihenfolge, analog zur allgemeinen Undo-Anforderung in
  `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2.

### 2.8 Zusammenspiel mit dem Selection-Sync-Bug

- Der in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2 dokumentierte Selection-Sync-Bug
  betraf bislang Text-Selektionen; eine Bild-`NodeSelection` ist ein anderer
  Selektionstyp. Es ist **zu verifizieren**, ob die dortige Mouseup-Reconciliation
  auch beim Wechsel von einer Text-Selektion zu einer Bild-`NodeSelection` (und
  zurück) korrekt greift, insbesondere direkt nach einer Ziehpunkt-Geste, die
  selbst `mousedown`/`mouseup`-Ereignisse auf dem Editor auslöst und daher
  potenziell mit derselben Reconciliation-Logik interagiert. Bislang **kein**
  Test dafür vorhanden — muss als neuer Testfall ergänzt werden (siehe Abschnitt
  7, Testfall 14).

---

## 3. Datenmodell- und Rundreise-Architektur (Anforderung an die Implementierung)

Im Unterschied zu `schriftgroesse-waehlen-req.md` (dort fehlt der Mark komplett)
ist das Datenmodell für die Größe selbst hier **bereits vorhanden** — die
Kernarbeit liegt in Command/UI **und** im Schließen der bestehenden
Reader-Lücke:

1. **Schema (`schema.ts:45-72`)**: `width`/`height` bereits vorhanden. Neu zu
   ergänzen: `naturalWidth`/`naturalHeight` (siehe 2.5) als zusätzliche,
   nicht über die UI direkt editierbare Attribute für „Zurücksetzen".
2. **Commands (`commands.ts`)**: Neues Command `setImageSize(width: number,
   height: number): Command`, das per `state.tr.setNodeAttribute(pos, 'width',
   width)`/`'height'` auf die aktuell als `NodeSelection` selektierte
   `image`-Node wirkt (analog zum Muster in `setAlign()`, `commands.ts:13-27`,
   das ebenfalls `setNodeAttribute` verwendet). Muss **ohne** Einschränkung auf
   eine nicht-leere Text-Selektion funktionieren (im Unterschied zu
   `applyMarkColor`/`clearMarkColor`, die bei leerer Selektion `false`
   zurückgeben) — hier ist die Selektion per Definition der Bild-Node selbst,
   nicht umgebender Text.
3. **DOCX-Reader (`docx/reader.ts:134-138`)**: `<wp:extent cx="…" cy="…">`
   (Geschwister-Element von `<wp:docPr>` innerhalb von `<w:drawing><wp:inline>`,
   siehe auch vom Writer erzeugte Struktur in `docx/writer.ts:83-91` als
   Vorlage für das zu parsende Gegenstück) auslesen, EMU in px umrechnen
   (`px = cx / 914400 * 96`, Kehrwert der Writer-Formel), als `width`/`height`
   auf den `image`-Node setzen. Fehlt `<wp:extent>` (sollte in validen DOCX-Dateien
   nicht vorkommen, aber Fremddateien sind nicht immer standardkonform), gilt
   dasselbe Fallback wie beim Fehlen jedes anderen optionalen Attributs: kein
   Absturz, `width`/`height` bleiben `null`, sinnvoller Default greift beim
   nächsten Rendern (siehe 2.4-Logik, angewendet auch auf importierte Bilder ohne
   bekannte Größe).
4. **DOCX-Writer (`docx/writer.ts:76-92`)**: Bleibt in der Umrechnungslogik
   unverändert; der 300×200-Fallback (Zeile 76-77) darf **nur** noch greifen, wenn
   tatsächlich kein `width`/`height` im Node vorhanden ist (z. B. bei
   Erst-Erzeugung ohne Einfüge-Logik aus 2.4) — nicht mehr als impliziter
   Normalfall für jedes importierte Bild wie aktuell.
5. **ODT-Reader (`odt/reader.ts:147-149`)**: `svg:width`/`svg:height` des
   `<draw:frame>`-Elements (Elternelement von `<draw:image>`) auslesen.
   ODF erlaubt hier verschiedene Einheiten-Suffixe (`cm`, `mm`, `in`, `px`,
   `pt`) — der Reader muss mindestens `cm`/`mm`/`in`/`px` in interne px (96 dpi)
   umrechnen, da reale ODT-Dateien (LibreOffice-Standardexport) überwiegend `cm`
   verwenden (siehe bestehender Writer-Fallback `'6cm'`, `odt/writer.ts:115`, als
   Beleg für das in diesem Projekt erwartete Einheiten-Format).
6. **ODT-Writer (`odt/writer.ts:112-120`)**: Bleibt im Grundsatz unverändert;
   analog zu Punkt 4 darf der `6cm`/`4cm`-Fallback nur noch für Nodes ohne
   gesetztes `width`/`height` greifen.
7. **Editor-CSS (`index.css:39-42`)**: `max-width: 100%; height: auto;` bleibt
   als Sicherheitsnetz gegen zu breite Bilder bestehen, muss aber mit der neuen
   Ziehpunkte-Logik abgestimmt werden (siehe Grenzfall 4.9) — insbesondere darf
   `height: auto` nicht dazu führen, dass ein per Ziehpunkt gesetzter expliziter
   Höhenwert von der CSS-Regel überschrieben und dadurch die Live-Vorschau beim
   Ziehen an einem Seitengriff (der bewusst das Seitenverhältnis **nicht** hält,
   siehe 2.3.2) falsch/verzerrt zur eingegebenen Zahl im Eingabefeld dargestellt
   wird.

---

## 4. Grenzfälle

1. **Ungültige Eingabe im Größenfeld** (Text, leeres Feld bei Enter): Wird
   verworfen, vorherige gültige Größe bleibt bestehen, kein Absturz, kein
   `NaN`-Wert im Dokumentmodell (analog zu `schriftgroesse-waehlen-req.md`,
   Grenzfall 4.1).
2. **Extreme Werte** (0, negativ, oder sehr groß wie 50000 px): 0/negativ wird
   abgelehnt (Mindestwert z. B. 1 px, damit kein Bild auf 0×0 kollabiert und
   dadurch für die Nutzer:in praktisch unsichtbar/unselektierbar wird — genau der
   in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 7 explizit benannte Fall); sehr große
   Werte werden auf eine sinnvolle Obergrenze begrenzt (z. B. das x-fache der
   Seitenbreite) mit sichtbarer Korrektur im Feld statt eines die Seite
   sprengenden Bildes.
3. **Ziehen an einem Eckgriff bis auf/unter 0 px** (Maus über den gegenüberliegenden
   Rand hinausgezogen): Größe wird auf den Mindestwert aus Grenzfall 4.2 begrenzt,
   kein invertiertes/negatives Bild, kein Einfrieren der Ziehgeste.
4. **„Zurücksetzen auf Originalgröße" ohne bekannte Originalgröße** (z. B. Bild
   aus einer Fremddatei importiert, bevor `naturalWidth`/`naturalHeight`
   eingeführt wurden, oder Dokument mehrfach cross-format konvertiert und der Wert
   dabei nicht mitgeführt, siehe 3.5): Button ist deaktiviert/ausgeblendet statt
   wirkungslos klickbar oder auf einen falschen Default zurückfallend.
5. **Selektion über mehrere Bilder gleichzeitig** (falls die Editor-Selektion das
   erlaubt): Zu klären, ob Größenänderung dann auf alle selektierten Bilder
   gleichzeitig wirkt oder das Eigenschaften-Panel/die Ziehpunkte in diesem Fall
   gar nicht erscheinen (aktuell erlaubt ProseMirror standardmäßig nur die
   Selektion eines einzelnen Nodes als `NodeSelection` — muss verifiziert werden,
   dass eine Mehrfachauswahl von Bildern im aktuellen Editor überhaupt möglich
   ist, bevor dieser Fall praktisch relevant wird).
6. **Bild in einer Tabellenzelle** (`cellContent: 'block+'`, `schema.ts:106`
   erlaubt Bilder als Zellinhalt): Größenänderung muss identisch zu einem Bild im
   Haupttext funktionieren; die verfügbare Breite zur automatischen
   Herunterskalierung beim Einfügen (2.4) orientiert sich dann sinnvollerweise an
   der Zellbreite, nicht an der vollen Seitenbreite — zu verifizieren, ob das
   praktisch (und nicht nur theoretisch) korrekt berechnet wird.
7. **Ziehgeste erzeugt viele Zwischenzustände**: Es darf **kein** Undo-Schritt pro
   Mausbewegung entstehen (siehe 2.3.3) — muss mit einem gezielten Test
   nachgewiesen werden (eine Ziehgeste mit mehreren `mousemove`-Ereignissen →
   genau ein Undo macht die gesamte Geste rückgängig, nicht nur den letzten
   Zwischenschritt).
8. **Mehrere Bilder mit identischem `src`, aber unterschiedlicher Größe** (z. B.
   dasselbe Bild zweimal eingefügt, eine Kopie anschließend vergrößert): Muss bei
   Export weiterhin als **eine** eingebettete Binärdatei, aber **zwei**
   unabhängige `wp:extent`/`svg:width`+`svg:height`-Werte behandelt werden — laut
   Code-Analyse (Abschnitt „Betroffene Quelldateien", `imageCollector.ts`-Zeile)
   bereits architektonisch korrekt vorbereitet (Dedup nur über `src`, Größe ist
   Node-Attribut), muss aber mit einem expliziten Testfall bestätigt werden, da
   aktuell kein solcher Test existiert.
9. **Zusammenspiel mit `.ProseMirror img { max-width: 100%; height: auto; }`**
   (`index.css:40-41`): Ein per Eingabefeld/Ziehpunkt gesetzter expliziter
   `width`-Wert, der die verfügbare Editor-/Seitenbreite überschreitet, wird durch
   `max-width: 100%` visuell gedeckelt — das im Dokumentmodell gespeicherte
   `width`-Attribut (und damit der Wert im Eingabefeld) muss dennoch den
   tatsächlich eingegebenen/gezogenen Wert zeigen, nicht den durch CSS
   sichtbar gedeckelten. Zu klären und zu dokumentieren, ob das als gewollte
   Diskrepanz (Modellwert vs. sichtbare Darstellung) gilt oder ob stattdessen das
   Eingabefeld selbst auf die verfügbare Breite begrenzt werden soll (siehe
   offene Frage Abschnitt 6.4).
10. **ODT-Einheiten-Interoperabilität**: Ein per `px`-Suffix geschriebenes
    `svg:width="300px"` (aktueller Fallback-Pfad, sobald `width` gesetzt ist,
    `odt/writer.ts:115`) wird von manchen älteren/strikten ODF-Konsumenten
    möglicherweise nicht identisch zu `cm`/`in` interpretiert. Muss mit einem
    unabhängigen ODF-Validator/LibreOffice geprüft werden, ob `px` als
    Einheit dort zuverlässig unterstützt wird, oder ob der Writer stattdessen
    durchgängig nach `cm` umrechnen sollte (siehe 2.6).
11. **Cross-Format-Rundreise mit Rundungsdifferenzen** (px → EMU → px bzw.
    px → cm → px): Nach einer einzelnen Konvertierung darf keine sichtbar falsche
    Größe entstehen; nach mehreren Hin- und Her-Konvertierungen ist eine minimale
    Rundungsabweichung (Sub-Pixel-Bereich) tolerierbar und zu dokumentieren, ein
    **kumulativer** Drift über mehrere Zyklen hinweg (z. B. Bild wird mit jeder
    Konvertierung sichtbar kleiner) ist **nicht** tolerierbar und gilt als Defekt.
12. **Größenänderung direkt nach dem Selection-Sync-Bug-Szenario** (Alles
    auswählen → Formatierung anwenden → Klick zum Neupositionieren, siehe
    `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2): Falls sich in der Selektion ein Bild
    befindet, darf eine anschließende Größenänderung an einem beliebigen Bild im
    Dokument nicht zu Inhaltsverlust an anderer Stelle führen (siehe 2.8).
13. **Reale Fremddatei mit mehreren, unterschiedlich großen Bildern** (siehe
    `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 7, Testfall 8): Muss nach Behebung des
    Reader-Bugs (Abschnitt 6.3) jedes Bild mit seiner **individuellen**
    Originalgröße anzeigen, nicht alle auf denselben Default vereinheitlicht.
14. **Sehr kleines Icon-Bild** (z. B. 16×16 px) wird eingefügt: Nach der in 2.4
    geforderten Logik nicht auf einen willkürlichen Mindestwert hochskaliert,
    sondern in nativer Größe belassen (Ausnahme von der „sinnvolle Standardgröße"-
    Regel für bereits kleine Bilder) — Verhalten muss explizit festgelegt und
    getestet werden, da „nicht auf 0×0 kollabieren" und „nicht willkürlich
    verzerren/hochskalieren" hier in Spannung stehen können.
15. **Bild ohne echte Bilddaten (defekte/leere Datei) einfügen**: Größenermittlung
    aus 2.4 kann fehlschlagen (z. B. `Image.decode()` wirft einen Fehler) — muss
    mit sichtbarer Fehlermeldung abgefangen werden statt stillem Fehlschlag oder
    Absturz, analog zur allgemeinen „Kein stiller Fehlschlag"-Anforderung in
    `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.4.

---

## 5. Rundreise-Anforderung (Pflicht für Abnahme)

Für **jeden** der folgenden Fälle gilt gemäß dem projektweiten Grundprinzip aus
`FEATURE-SPEC-DOCX-ODT.md` (Zeile 9-13): Datei A mit einem oder mehreren Bildern
bekannter Größe hochladen bzw. im Editor mit definierter Größe erzeugen →
**unverändert** exportieren → erneut importieren → Ergebnis entspricht inhaltlich
und in der Bildgröße exakt A. Das schließt ausdrücklich den Fall ein, dass **gar
keine** manuelle Größenänderung stattgefunden hat — reines Hochladen und
unverändertes Re-Exportieren darf die Bildgröße **nicht** verändern (das ist nach
aktuellem Code-Stand, siehe Abschnitt 6.3, **nicht** erfüllt und der zentrale zu
behebende Befund dieser Anforderung).

### 5.1 DOCX

1. Eine DOCX-Datei mit einem Bild bekannter Größe (z. B. `wp:extent` entsprechend
   500×300 px) hochladen, **ohne** jede Bearbeitung unverändert exportieren,
   erneut importieren → Größe im wiederhergestellten `image`-Node ist exakt
   500×300 px (nicht der aktuelle 300×200-Default aus `docx/writer.ts:76-77`).
2. Bild über den Toolbar-Button einfügen, über das neue Eingabefeld (Abschnitt
   1, Element 2/3) auf eine konkrete Größe (z. B. 640×480 px) setzen, als DOCX
   exportieren → mit einem unabhängigen Parser (z. B. python-docx oder direktes
   Parsen von `word/document.xml`) verifizieren: `<wp:extent>` entspricht exakt
   der in EMU umgerechneten Zielgröße.
3. Dieselbe Datei erneut importieren → im Editor sichtbar identische Breite/Höhe.
4. Größe über Ziehpunkte ändern (nicht über das Eingabefeld), exportieren,
   reimportieren → Größe exakt wie nach dem Ziehen, nicht wie vor dem Ziehen.
5. Reale komplexe Fremddatei mit **mehreren unterschiedlich großen** Bildern
   (siehe `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 7, Testfall 8) importieren,
   unverändert exportieren, erneut importieren → jedes Bild behält seine
   individuelle Originalgröße, keine Vereinheitlichung.
6. Cross-Format: ODT mit Bild bekannter Größe importieren → als DOCX
   exportieren → Größe bleibt (bis auf dokumentierte Rundungsdifferenzen im
   Sub-Pixel-Bereich, siehe Grenzfall 4.11) erhalten.

### 5.2 ODT

1. Eine ODT-Datei mit einem `draw:frame` bekannter Größe (z. B.
   `svg:width="12cm" svg:height="8cm"`) hochladen, unverändert exportieren,
   erneut importieren → Größe im wiederhergestellten `image`-Node entspricht
   exakt (nach px-Umrechnung und zurück) 12×8 cm, nicht dem aktuellen
   6×4-cm-Default aus `odt/writer.ts:115-116`.
2. Bild einfügen, über das neue Eingabefeld auf eine konkrete Größe setzen, als
   ODT exportieren → `content.xml` enthält ein `<draw:frame>` mit
   `svg:width`/`svg:height` entsprechend der eingegebenen Größe (Einheit gemäß
   der in 2.6/4.10 final festgelegten Konvention).
3. Dieselbe Datei erneut importieren → identische Breite/Höhe im Editor.
4. Größe über Ziehpunkte ändern, exportieren, reimportieren → Größe exakt wie
   nach dem Ziehen.
5. Reale komplexe Fremddatei mit mehreren unterschiedlich großen Bildern
   importieren, unverändert exportieren, erneut importieren → jedes Bild behält
   seine individuelle Originalgröße.
6. Cross-Format: DOCX mit Bild bekannter Größe importieren → als ODT
   exportieren → Größe bleibt (bis auf dokumentierte Rundungsdifferenzen)
   erhalten.

### 5.3 Cross-Format hin und zurück / doppelte Rundreise

1. DOCX mit Bild bekannter Größe → Editor → Export als ODT → erneuter Import →
   Export zurück als DOCX → Größe nach zwei Formatkonvertierungen weiterhin
   ohne sichtbaren, kumulativen Größenverlust/-drift zum Original (minimale,
   einmalig auftretende Rundungsabweichung im Sub-Pixel-Bereich ist laut
   Grenzfall 4.11 zu dokumentieren, aber kein Blocker).
2. Dieselbe Prüfung mit Startpunkt ODT.
3. Bild mit über Ziehpunkte gesetzter, nicht seitenverhältnistreuer Größe (also
   über einen Seitengriff verzerrt) durch dieselbe Doppel-Rundreise schicken →
   die bewusst verzerrte Größe (nicht das ursprüngliche Seitenverhältnis) bleibt
   erhalten, da dies eine gewollte Nutzeraktion war, kein „ungewollter"
   Datenverlust.

---

## 6. Ist-Zustand laut Code-Analyse (Verifikationsbefund zum Backlog-Status)

### 6.1 UI

Weder in `Toolbar.tsx` noch an anderer Stelle in `src/formats/shared/editor/`
existiert ein Bedienelement, ein Panel oder ein NodeView, über das sich die
Größe eines eingefügten Bildes verändern ließe. Der Backlog-Status „fehlt" ist
für die **Bedienbarkeit** damit vollständig bestätigt.

### 6.2 Datenmodell

Im Unterschied zu manchen anderen „fehlt"-Einträgen (z. B.
`schriftgroesse-waehlen`, wo auch der Schema-Mark fehlt) ist das Datenmodell für
die Größe (`width`/`height` als `image`-Node-Attribute, `schema.ts:50-51`)
bereits **vollständig vorhanden**. Es fehlt ausschließlich (a) ein Command, das
diese Attribute nach dem Einfügen noch ändern kann, und (b) jede UI, die dieses
Command aufruft.

### 6.3 Reader/Writer — zusätzlicher, von der UI unabhängiger Befund

Die Verifikation deckt einen Bug auf, der **unabhängig** vom Fehlen der UI
besteht und der die Kernanforderung dieser Datei (Größenänderung muss dauerhaft/
über Rundreisen hinweg wirken) andernfalls von vornherein unerfüllbar machen
würde: Weder `docx/reader.ts` noch `odt/reader.ts` liest die in einer
importierten Datei tatsächlich vorhandene Bildgröße (`wp:extent` bzw.
`svg:width`/`svg:height`) aus. Jedes importierte Bild erhält daher unabhängig von
seiner echten Größe `width: null, height: null` im Editor-Dokumentmodell. Beim
nächsten Export ersetzen `docx/writer.ts:76-77` bzw. `odt/writer.ts:115-116`
diesen fehlenden Wert durch einen **hartkodierten Default** (300×200 px bzw.
6×4 cm) — unabhängig vom ursprünglichen Seitenverhältnis des Bildes. Praktische
Konsequenz: Eine Datei mit einem 4000×3000-px-Foto (Seitenverhältnis 4:3), die
ohne jede Bearbeitung importiert und wieder exportiert wird, enthält danach ein
auf 300×200 px (Seitenverhältnis 3:2) gequetschtes Bild — eine sichtbare
Bildverzerrung, die durch reines Öffnen-und-wieder-Speichern entsteht, ganz ohne
dass die Nutzer:in jemals eine Größenänderung vorgenommen hätte. Der einzige
vorhandene Unit-Test, der oberflächlich wie eine Prüfung dieses Verhaltens
aussieht (`docx/__tests__/roundtrip.test.ts:253`), prüft `width`/`height` im
Ergebnis nicht und hat diesen Bug bisher nicht aufgedeckt.

### 6.4 Offene Klärungsfragen (müssen vor Abnahme beantwortet werden)

1. **Anzeigeeinheit** der Größenfelder: cm (konsistent zum ODT-Fallback) oder px
   (konsistent zur internen Schema-/DOCX-Rechnung)? Siehe Abschnitt 2.6.
2. **ODT-Einheiten-Schreibweise beim Export**: `px`-Suffix (aktuell technisch
   möglich, siehe `odt/writer.ts:115`) oder Umrechnung nach `cm` für bessere
   Kompatibilität mit älteren ODF-Konsumenten? Siehe Grenzfall 4.10.
3. **Persistenz der Originalgröße** (`naturalWidth`/`naturalHeight`) über
   Cross-Format-Exporte hinweg: fester Bestandteil des Exportformats (dann muss
   geklärt werden, in welchem DOCX-/ODT-Feld dieser rein editor-interne Wert
   überhaupt sinnvoll unterzubringen ist, da weder OOXML noch ODF ein
   Standardfeld dafür vorsehen) oder rein editor-intern und bei
   Fremddatei-Import/-Reimport verloren (dann verliert der „Zurücksetzen"-Button
   seine Funktion nach jedem Speichern-und-erneut-Öffnen, was klar dokumentiert
   werden muss)? Siehe Grenzfall 4.4.
4. **Verhältnis von Modellwert zu CSS-Deckelung** (`max-width: 100%`, siehe
   Grenzfall 4.9): Darf das Eingabefeld einen Wert zeigen/speichern, der größer
   als die tatsächlich sichtbare Darstellung ist, oder soll die Eingabe selbst
   auf die verfügbare Seiten-/Zellbreite begrenzt werden?

Diese vier Fragen gelten als **offen** und müssen vor Abnahme (siehe Abschnitt 8)
explizit beantwortet und das Ergebnis hier nachgetragen werden — analog zum
bereits in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 8 dokumentierten offenen Punkt
zum Seitenlayout-Leerraum.

**Fazit:** Der Backlog-Status „fehlt" für `bild-groesse-aendern` ist nach dieser
Code-Analyse hinsichtlich der **Bedienbarkeit** korrekt. Die Verifikationsarbeit
für diesen Eintrag besteht daher aus dem vollständigen **Neubau** von Command und
UI (Abschnitt 1-2) **sowie**, davon nicht trennbar, der **Behebung eines
bestehenden, unabhängigen Datenverlust-Bugs** in Reader/Writer (Abschnitt 6.3),
ohne den jede neu gebaute Resize-Funktion die Rundreise-Anforderung aus
Abschnitt 5 nicht erfüllen könnte.

---

## 7. Testfälle für die Verifikation (E2E, echte Bedienung im Browser)

1. Bild einfügen → per Klick auswählen → Eigenschaften-Panel mit Größenfeldern
   erscheint sichtbar (muss zuerst gebaut werden, aktuell **nicht vorhanden**).
2. Im Breitenfeld einen neuen Wert eingeben, mit Enter bestätigen → Bild ändert
   sichtbar seine Breite; bei aktivem Seitenverhältnis-Lock ändert sich die Höhe
   proportional mit.
3. Seitenverhältnis-Lock deaktivieren, nur Breite ändern → Höhe bleibt
   unverändert (Bild wird sichtbar verzerrt/gestaucht).
4. Ziehpunkt an einer Ecke ziehen → Breite und Höhe ändern sich gemeinsam
   proportional, unabhängig vom Zustand der Lock-Checkbox.
5. Ziehpunkt an einer Seitenmitte ziehen → nur die jeweilige Dimension ändert
   sich.
6. Ungültige Eingabe (Text, 0, negativ, extrem groß) im Größenfeld →
   Fehlerbehandlung/Clamping wie in Grenzfall 4.1/4.2 beschrieben, kein Absturz.
7. Größe ändern, danach Strg+Z → vorherige Größe exakt wiederhergestellt; Strg+Y
   stellt die geänderte Größe wieder her.
8. Ziehgeste mit mehreren Zwischenschritten (mehrere `mousemove`-Ereignisse vor
   `mouseup`) → genau **ein** Undo-Schritt macht die gesamte Geste rückgängig
   (Grenzfall 4.7).
9. „Auf Originalgröße zurücksetzen" nach vorheriger Größenänderung → Bild kehrt
   exakt zur beim Einfügen/Import ermittelten Größe zurück.
10. Bild ohne vorherige Größenänderung → „Zurücksetzen"-Button ist
    deaktiviert/wirkungslos (Grenzfall 4.4).
11. Vollständiger Rundreisetest DOCX (Abschnitt 5.1) über echten
    Datei-Upload (`filechooser`) und echten Download-Abfangmechanismus
    (`page.waitForEvent('download')`), inklusive Validierung über einen
    unabhängigen Parser.
12. **Regressionstest für den in Abschnitt 6.3 beschriebenen Reader-Bug**: DOCX-
    Datei mit Bild bekannter, vom 300×200-Default abweichender Größe (z. B.
    500×300 px) hochladen, **ohne jede Bearbeitung** unverändert exportieren,
    reimportieren → Größe ist weiterhin 500×300 px, nicht 300×200 px. Muss als
    Erweiterung von `docx/__tests__/roundtrip.test.ts:253` (dort fehlt bisher die
    Prüfung von `image.attrs.width`/`image.attrs.height` im Ergebnis) sowohl auf
    Unit- als auch auf E2E-Ebene ergänzt werden.
13. Dasselbe für ODT (Erweiterung von `odt/__tests__/roundtrip.test.ts:213`).
14. Bild-`NodeSelection` unmittelbar nach einer Ziehpunkt-Geste, gefolgt von
    Klick in normalen Text und weiterem Tippen → kein Inhaltsverlust, analog zum
    Selection-Sync-Regressionstest aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2
    (siehe 2.8, Testerweiterung von `selection-regression.spec.ts`).
15. Vollständiger Rundreisetest ODT (Abschnitt 5.2) ebenso.
16. Cross-Format-Rundreise (Abschnitt 5.3) einmal DOCX→ODT→DOCX, einmal
    ODT→DOCX→ODT, jeweul mit Prüfung auf kumulativen Größendrift.
17. Reale komplexe Fremddatei mit mehreren unterschiedlich großen Bildern
    importieren, unverändert exportieren, erneut importieren → jedes Bild
    behält seine individuelle Größe (Ergänzung zu `FEATURE-SPEC-DOCX-ODT.md`
    Abschnitt 7, Testfall 8).
18. Bild in einer Tabellenzelle einfügen und in der Größe ändern → Verhalten
    identisch zu einem Bild im Haupttext (Grenzfall 4.6).
19. Zwei Bilder mit identischem `src`, unterschiedlicher Größe → Rundreise
    erhält für beide die jeweils individuelle Größe (Grenzfall 4.8).
20. Sehr kleines Icon-Bild (z. B. 16×16 px) einfügen → Verhalten aus Grenzfall
    4.14 (bewusst festgelegt und getestet, nicht zufälliges Ergebnis).

---

## 8. Abnahmekriterien (Definition of Done)

Der Backlog-Status für `bild-groesse-aendern` darf erst dann von „fehlt" auf
„vorhanden (verifiziert)" geändert werden, wenn:

1. Das Eigenschaften-Panel mit Eingabefeldern sowie die Ziehpunkte aus Abschnitt
   1 gebaut, verdrahtet und über die Testfälle 1-10 aus Abschnitt 7 nachgewiesen
   sind.
2. Der in Abschnitt 6.3 beschriebene Reader-Bug (fehlendes Auslesen von
   `wp:extent` bzw. `svg:width`/`svg:height`) in **beiden** Formaten behoben und
   über die Testfälle 12-13 aus Abschnitt 7 nachgewiesen ist — ohne diese
   Behebung kann keine Größenänderung dauerhaft (über Export/Reimport hinweg)
   wirken, unabhängig davon, wie gut die UI gebaut ist.
3. Alle Testfälle aus Abschnitt 7 tatsächlich über echte Browser-Interaktion
   ausgeführt wurden (nicht nur Unit-/Command-Ebene) und grün sind.
4. Alle Rundreise-Anforderungen aus Abschnitt 5 (DOCX, ODT, Cross-Format,
   Doppel-Rundreise) durch einen unabhängigen Parser bzw. durch erneuten Import
   bestätigt sind.
5. Alle Grenzfälle aus Abschnitt 4 einzeln geprüft und deren tatsächliches
   Verhalten dokumentiert ist (auch wenn das Ergebnis „bewusst so gewollt,
   dokumentiert" statt „Bug, behoben" lautet).
6. Alle vier offenen Klärungsfragen aus Abschnitt 6.4 explizit beantwortet und
   das Ergebnis hier nachgetragen wurde.
7. Der vorhandene, aber irreführende Unit-Test
   `docx/__tests__/roundtrip.test.ts:253` (setzt `width`/`height`, prüft sie aber
   nicht) sowie sein ODT-Äquivalent (`odt/__tests__/roundtrip.test.ts:213`, setzt
   sie nicht einmal) um echte Größen-Assertions ergänzt sind, damit künftige
   Regressionen an dieser Stelle nicht erneut unbemerkt bleiben.
8. Kein aus dieser Datei hervorgegangener Fehlerbefund unbeantwortet bleibt
   (jeder Fund entweder behoben und regressionsgetestet, oder bewusst als
   bekannte Einschränkung dokumentiert), analog zur „Kein stiller
   Fehlschlag"-Anforderung in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.4.
