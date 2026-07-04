# Anforderungsspezifikation: „Bild aus Datei einfügen“

Status: Laut Feature-Backlog (`E:\docs\specs\FEATURE-BACKLOG.md`, Slug `bild-einfuegen`,
Abschnitt „3.3 Bilder & Grafiken“, Priorität 1) gilt die Funktion als **„vorhanden“**
(Beschreibung: „Fügt eine Bilddatei über Dateiauswahl an der Cursor-Position ein.“).
Dieser Status wird hier ausdrücklich als **nicht vertrauenswürdig** eingestuft und muss
vollständig neu verifiziert werden — sowohl auf tatsächliche Bedienbarkeit (echter
`filechooser`-Flow im Browser, nicht nur Command-Aufruf) als auch auf korrekte Rundreise
(DOCX **und** ODT) hin. `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 7 („Bilder“) markiert das
Gesamtthema Bilder zusätzlich als **„von der Nutzerin explizit als nicht funktionsfähig
gemeldet — höchste Priorität“**. Diese Datei konkretisiert für den Teilausschnitt
„Einfügen über Dateiauswahl“ (nicht: Größenänderung, Zuschneiden, Textumbruch, Online-Bilder
— siehe Abgrenzung unten) das Detailniveau, das für eine belastbare Abnahme nötig ist.

Geltungsbereich: ausschließlich das **Einfügen** einer Bilddatei per nativer Dateiauswahl
an der Cursor-Position im gemeinsamen DOCX/ODT-Editor sowie dessen Rundreise-Verhalten.
Explizit **nicht** Gegenstand dieser Datei (separate Backlog-Slugs, jeweils eigene
Anforderung, hier nur so weit erwähnt, wie sie das Einfüge-Verhalten unmittelbar berühren):

| Slug | Beschreibung | Status laut Backlog |
|---|---|---|
| `bild-alt-text` | Alternativtext nachträglich bearbeiten | teilweise |
| `bild-groesse-aendern` | Bildgröße per Eingabefeld/Ziehpunkte ändern | fehlt |
| `bild-zuschneiden` | Bild zuschneiden | fehlt |
| `bild-online` | Online-/Stockbilder einfügen | fehlt |
| `textumbruch-bild` / `bild-position` | Textumbruch-Verhalten, freie Verankerung | fehlt |
| `bild-loeschen` | Bild markieren + löschen | vorhanden (eigene Datei, falls vorhanden) |

Wie in `FEATURE-SPEC-DOCX-ODT.md` festgelegt: DOCX und ODT teilen sich denselben
ProseMirror-Editor (Schema + Seitenansicht). Jede Anforderung unten gilt für **beide**
Formate, inklusive Rundreise (Datei A hochladen → unverändert exportieren → Ergebnis
entspricht inhaltlich A) sowie für im Editor selbst neu eingefügte Bilder.

---

## 0. Ist-Stand (Code-Fundstellen, Basis dieser Spezifikation)

Diese Spezifikation beruht auf tatsächlicher Durchsicht des Codes, nicht nur auf der
Backlog-Beschreibung.

| Ebene | Datei | Fundstelle |
|---|---|---|
| Schema (Node-Definition) | `src/formats/shared/schema.ts` | `nodes.image` (Zeile 45–72): `group: 'block'`, Attribute `src` (Pflicht), `alt` (Default `''`), `width`/`height` (Default `null`), `draggable: true`; `parseDOM` akzeptiert `img[src]`; `toDOM` erzeugt `['img', { src, alt, width, height }]` |
| Einfüge-Befehl | `src/formats/shared/editor/commands.ts` | `insertImage(src, alt = '')` (Zeile 66–74): erzeugt den Bild-Node **ausschließlich** mit `src` und `alt` — **`width`/`height` werden nie gesetzt**, bleiben also immer `null` — und ruft `state.tr.replaceSelectionWith(node)` auf |
| Toolbar-Bedienelement | `src/formats/shared/editor/Toolbar.tsx` | Zeile 241–244: `<label>` mit Text „🖼 Bild“, das ein verstecktes `<input type="file" accept="image/*" className="hidden" onChange={handleImagePick} />` umschließt — **kein** `<button>`, **kein** `title`/`aria-label`-Attribut (im Unterschied zu jedem anderen Toolbar-Element, das durchgehend `title="…"` trägt) |
| Datei-Einlese-Logik | `src/formats/shared/editor/Toolbar.tsx` | `handleImagePick` (Zeile 97–108): liest die gewählte Datei per `FileReader.readAsDataURL`, ruft danach `insertImage(dataUrl, file.name)` auf — **keine Prüfung von `file.type`** (also keine echte MIME-Validierung über das `accept="image/*"`-Attribut hinaus, das nur ein UI-Filter des nativen Dialogs ist, keine Laufzeitprüfung), **keine Dateigrößenprüfung**, **kein try/catch** um die `FileReader`-Promise — ein `reader.onerror` führt zu einer abgelehnten, aber nirgends behandelten Promise (potenziell stiller Fehlschlag statt sichtbarer Fehlermeldung) |
| Alt-Text bei Einfügung | `src/formats/shared/editor/Toolbar.tsx` Zeile 107 | `alt` wird **automatisch auf den Dateinamen** (`file.name`) gesetzt, nicht auf einen leeren/editierbaren Wert — deckt sich mit Backlog-Status `bild-alt-text: teilweise` |
| Tastenkürzel | `src/formats/shared/editor/WordEditor.tsx` | Zeile 71–80 (`keymap({...})`): enthält `Mod-z`, `Mod-y`, `Mod-Shift-z`, `Mod-b`, `Mod-i`, `Mod-u` sowie `baseKeymap` — **kein** Tastenkürzel für Bild-Einfügen (in Word/LibreOffice ebenfalls nicht standardmäßig belegt, daher kein Fehlbefund, aber explizit zu dokumentieren) |
| Bild-Eigenschaften-UI (Resize/Alt-Text nach Einfügung) | gesamtes `src/formats/shared/editor/` | **Es existiert keine eigene Komponente/NodeView** für das Bild — kein Klick-Handler, der Ziehpunkte, ein Eingabefeld für Breite/Höhe oder ein Alt-Text-Feld nach dem Einfügen anzeigt. Passt zu Backlog `bild-groesse-aendern: fehlt` |
| Drag&Drop / Zwischenablage | `src/formats/shared/editor/WordEditor.tsx` Zeile 9, 83 | Es ist nur `dropCursor()` aus `prosemirror-dropcursor` eingebunden — ein rein visueller Einfüge-Indikator. Es gibt **keinen** eigenen `handleDrop`/`handlePaste`, der eine aus dem Betriebssystem gezogene Bilddatei oder ein aus der Zwischenablage eingefügtes Bild (z. B. Screenshot, Strg+V) in eine Data-URL umwandelt und einfügt. Das Schema-`parseDOM` (`img[src]`) hilft nur, wenn die Zwischenablage bereits HTML mit einem `<img src="…">` enthält (z. B. aus einer Webseite kopiert), nicht bei rohen Bilddaten. **Bewusst außerhalb des Geltungsbereichs dieser Datei** (diese behandelt nur „über Dateiauswahl“), aber als existierende Lücke hier explizit dokumentiert, damit sie nicht stillschweigend als „durch bild-einfuegen mit abgedeckt“ missverstanden wird |
| DOCX-Export | `src/formats/docx/writer.ts` | `imageParagraphXml` (Zeile 72–92): erzeugt für jedes Bild einen **eigenen** `<w:p>` mit `<w:drawing>`/`<wp:inline>`; **Breite/Höhe werden aus `node.attrs?.width ?? 300` bzw. `node.attrs?.height ?? 200` (Pixel) berechnet und nach EMU umgerechnet** — da `insertImage` `width`/`height` nie setzt, wird **jedes frisch im Editor eingefügte Bild beim Export immer auf fest 300×200 px gezwungen**, unabhängig vom tatsächlichen Seitenverhältnis der Bilddatei |
| DOCX-Import | `src/formats/docx/reader.ts` | Bild-Erkennung Zeile 134–138/173–176: liest aus `<w:drawing>` ausschließlich `r:embed` (Relationship-ID → Bildquelle) und `wp:docPr/@name` (→ `alt`). **`<wp:extent cx cy>`/`<a:ext cx cy>` (die tatsächlich in der Fremddatei gespeicherte Bildgröße) wird an keiner Stelle gelesen** — der erzeugte Bild-Node erhält nur `src`/`alt`, `width`/`height` bleiben `null` |
| ODT-Export | `src/formats/odt/writer.ts` | `blockToOdt`, Fall `'image'` (Zeile 112–119): erzeugt `<draw:frame svg:width="…" svg:height="…">`; Fallback `6cm`/`4cm`, falls `width`/`height` fehlen — aus denselben Gründen wie bei DOCX praktisch immer der Fall bei editor-erzeugten Bildern |
| ODT-Import | `src/formats/odt/reader.ts` | `paragraphToBlocks` (Zeile 144–149): liest aus `<draw:frame>`/`<draw:image>` ausschließlich `xlink:href` (→ `src`) und `draw:name` (→ `alt`). **`svg:width`/`svg:height` des `draw:frame` werden nie gelesen** — identische Lücke wie bei DOCX |
| Unit-Test (Roundtrip, konstruierte Daten) — DOCX | `src/formats/docx/__tests__/roundtrip.test.ts` Zeile 251–276 | Test „preserves an embedded image as a self-contained data URL“ (Zeile 252–259) konstruiert das Eingabe-Attribut **mit** `width: 100, height: 80` (Zeile 253), prüft nach der Rundreise aber **ausschließlich `image.type` und `image.attrs.src`** (Zeile 256–258) — **`image.attrs.width`/`image.attrs.height` werden nie geprüft**. Zweiter Test (Zeile 261–275) prüft nur, dass „Vorher“-Text und Bild als getrennte Blocktypen erhalten bleiben, ebenfalls ohne Maßangaben |
| Unit-Test (Roundtrip, konstruierte Daten) — ODT | `src/formats/odt/__tests__/roundtrip.test.ts` Zeile 212–244 | Test „preserves an embedded image as a self-contained data URL“ (Zeile 213–221) enthält im Eingabe-Node **gar keine** `width`/`height`-Attribute, prüft zusätzlich `image.attrs.alt` (Zeile 220) — Alt-Text-Rundreise ist hier also abgedeckt, Maß-Rundreise nicht einmal versucht |
| Whole-Document-Fidelity-Test (DOCX) | `src/formats/docx/__tests__/roundtrip.test.ts` Zeile 310–357 | Bild taucht als **letztes, oberstes Geschwisterelement** neben Überschrift/Absatz/Liste/Tabelle auf (Zeile 342) — **keine Abdeckung** für ein Bild **innerhalb** einer Tabellenzelle oder eines Listenpunkts, **keine** Abdeckung für Bild in Kopf-/Fußzeile |
| E2E-Test (echte Bedienung im Browser) | `tests/e2e/docx.spec.ts`, `tests/e2e/odt.spec.ts`, `tests/e2e/selection-regression.spec.ts` | **Kein einziger Treffer** für „image“, „Bild“, „filechooser“ oder „insertImage“ in irgendeiner dieser Dateien (per Volltextsuche verifiziert) — es gibt **keinen** existierenden Browser-Test, der den „🖼 Bild“-Kontrolleintrag tatsächlich per Datei-Upload bedient |
| Reale Test-Fixtures | `tests/fixtures/external/README.md` | erwähnt Fixtures „mit Kopf-/Fußzeilen, Bildern, Tabellen“ aus einer Referenzbibliothek — muss verifiziert werden, ob eine solche Datei tatsächlich vorhanden und in einen Test eingebunden ist (Stand dieser Recherche: nur die Erwähnung in der README gefunden, keine zugehörige Testdatei mit Bild-Assertion) |

**Kernaussage:** Für „Bild einfügen“ existieren Schema-, Command-, Toolbar-, Reader- und
Writer-Unterstützung — aber **kein einziger** automatisierter Test bedient den echten
Datei-Upload-Weg im Browser, und die Größen-Rundreise (`width`/`height`) ist durch
Code-Durchsicht **bereits jetzt als defekt identifizierbar**, nicht nur als ungetestet: Der
Reader liest die Maße nie aus der Fremddatei, der Writer erzwingt beim Export ohne
vorhandene Maße einen festen Ersatzwert (300×200 px bzw. 6×4 cm). Das bedeutet konkret:
Eine Datei mit einem Bild fester Größe X×Y, unverändert hochgeladen und unverändert wieder
exportiert, kommt mit **300×200 px / 6×4 cm** zurück, sofern X×Y nicht zufällig genau
diesem Verhältnis entspricht — ein direkter Verstoß gegen das Rundreise-Grundprinzip
(„Datei A hochladen → unverändert exportieren → Ergebnis entspricht inhaltlich A“) und
gegen `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 7, Testfall 8 („keines verzerrt“).

---

## 1. Menüpunkte / Bedienelemente

| # | Element | Ort | Auslöser | Ist-Zustand (Befund) | Soll-Verhalten |
|---|---|---|---|---|---|
| 1 | „🖼 Bild“-Kontrolleintrag | Editor-Toolbar, letzte Gruppe, direkt nach „⊞ Tabelle“ | Klick öffnet nativen Dateiauswahl-Dialog (`<input type="file">`) | Ist ein `<label>`, kein `<button>`; kein `title`/`aria-label` | Muss wie jedes andere Toolbar-Element per Klick/Tastatur (Tab + Enter/Space) erreichbar und mit `title`/`aria-label="Bild einfügen"` (oder gleichwertig) beschriftet sein |
| 2 | Datei-Auswahl-Dialog | Betriebssystem-nativ | Auswahl einer Datei | Filter `accept="image/*"` steuert nur die Dialog-Vorauswahl, keine Laufzeitprüfung danach | Nach Auswahl muss serverseitig/clientseitig (da keine Server-Komponente: clientseitig) real geprüft werden, dass die Datei ein unterstütztes Bildformat ist, bevor sie eingefügt wird |
| 3 | Icon/Symbol „🖼“ | derselbe Kontrolleintrag | passiv (visuell) | Unicode-Emoji — laut `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 17/20 als wahrscheinliche Ursache für „nicht sichtbar/nicht auffindbar“ auf Systemen ohne Emoji-Schriftart benannt | Muss auf Rendering ohne Emoji-Unterstützung geprüft werden; bevorzugt Ersatz durch eingebettetes SVG-Icon (wie in Abschnitt 20.1 der Haupt-Spezifikation gefordert) |
| 4 | Tastenkürzel | — | — | **existiert nicht** | Kein Blocker (Word/LibreOffice haben ebenfalls keinen Standard-Shortcut für „Bild aus Datei einfügen“ über Tastatur allein, da ein Dateidialog ohnehin Mausbedienung nahelegt) — explizit als „bewusst nicht vorhanden“ zu dokumentieren, nicht stillschweigend zu übergehen |
| 5 | Kontextmenü-Eintrag (Rechtsklick) | — | — | fehlt; Editor hat aktuell kein eigenes Kontextmenü | Nice-to-have, kein Blocker |
| 6 | Alt-Text-Eingabefeld beim/nach dem Einfügen | — | — | **fehlt** (Alt-Text wird automatisch = Dateiname gesetzt, Zeile 107 Toolbar.tsx) | Getrennter Slug `bild-alt-text` — hier nur als Randbedingung: das automatische Setzen darf nicht als „editierbar“ missverstanden werden |
| 7 | Ziehpunkte / Eingabefeld für Bildgröße nach dem Einfügen | — | — | **fehlt** | Getrennter Slug `bild-groesse-aendern` — hier nur als Randbedingung: das Fehlen dieser Funktion verschärft das Problem aus Abschnitt 0 (keine Möglichkeit, die durch den Export erzwungene 300×200-px-Größe im Nachhinein zu korrigieren) |
| 8 | Fehlermeldung bei nicht unterstütztem Format/beschädigter Datei | — | — | **fehlt** (kein Code-Pfad dafür vorhanden, siehe Abschnitt 0) | Muss ergänzt werden — sichtbare, verständliche Meldung statt stillem Fehlschlag oder kaputtem `<img>`-Platzhalter (verstößt sonst gegen `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.4 „Kein stiller Fehlschlag“) |

---

## 2. Gewünschtes Verhalten im Detail

### 2.1 Grundfall: Einfügen an der Cursor-Position

1. Klick auf den „Bild“-Kontrolleintrag öffnet den nativen Dateiauswahl-Dialog, gefiltert
   (aber nicht hart beschränkt) auf Bilddateien.
2. Nach Auswahl einer gültigen Bilddatei wird das Bild **exakt an der Position eingefügt,
   an der sich die Schreibmarke unmittelbar vor dem Klick auf den Kontrolleintrag befand**
   — nicht am Dokumentanfang/-ende, nicht an einer aus dem letzten Klick abgeleiteten,
   inzwischen veralteten Position (siehe Grenzfall 3.1, Bezug zum Selection-Sync-Bug aus
   `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2).
3. Steht die Schreibmarke inmitten eines Textabsatzes, wird dieser an der Cursor-Position
   geteilt; das Bild erscheint als eigener Block zwischen den beiden entstehenden
   Absatz-Teilen (Konsequenz aus `group: 'block'` in Kombination mit
   `replaceSelectionWith`) — **beide Textteile (davor und danach) müssen vollständig
   erhalten bleiben**. Das ist exakt der von der Nutzerin gemeldete, als nicht
   funktionsfähig markierte Kernfall und damit der wichtigste Einzeltest dieser
   gesamten Spezifikation.
4. Nach dem Einfügen bleibt der Editor normal bedienbar: Tippen unmittelbar vor und nach
   dem Bild funktioniert ohne weitere Klicks oder Reloads.

### 2.2 Einfügen über eine bestehende Selektion

- Eine vorhandene Textselektion wird durch das Bild **ersetzt** (nicht ergänzt) —
  konsistent mit dem Verhalten von `insertTable`, das denselben Mechanismus
  (`replaceSelectionWith`) nutzt.

### 2.3 Dateiauswahl und Formatprüfung

- Unterstützte Formate mindestens PNG und JPEG (siehe `FEATURE-SPEC-DOCX-ODT.md`
  Abschnitt 7). Die tatsächlich unterstützte Formatliste ist explizit festzulegen und zu
  dokumentieren (mindestens PNG/JPEG, GIF/WebP/SVG/BMP nach Entscheidung).
- Wird eine nicht unterstützte Datei ausgewählt (falscher MIME-Typ, beschädigte Datei,
  0-Byte-Datei, umbenannte Nicht-Bild-Datei mit Bild-Dateiendung), muss eine
  **verständliche, sichtbare Fehlermeldung** erscheinen — kein kaputtes `<img>`-Symbol im
  Dokument, keine unbehandelte Promise-Ablehnung in der Konsole (siehe Befund zu
  `handleImagePick` in Abschnitt 0), kein stiller Fehlschlag.
- Abbrechen des Dateiauswahl-Dialogs (kein Datei ausgewählt) darf zu keiner Aktion führen
  — insbesondere darf `handleImagePick` bei `file === undefined` sauber und ohne
  Seiteneffekt zurückkehren (aktuell Zeile 100: `if (!file) return` — bereits korrekt,
  muss aber mit Test abgesichert werden).

### 2.4 Bildgröße beim Einfügen

- Es muss eine **sinnvolle Standardgröße** entstehen: weder ein Bild, das die Seitenbreite
  sprengt (z. B. ein 6000×4000-px-Foto direkt in Originalgröße), noch eines, das auf 0×0
  kollabiert.
- **Anforderung, die über den heutigen Ist-Stand hinausgeht:** Die im Editor sichtbare
  Darstellungsgröße und die beim Export tatsächlich geschriebene Größe müssen
  übereinstimmen. Aktuell (siehe Abschnitt 0) rendert der Editor das `<img>` ohne
  `width`/`height` (natürliche Bildgröße im Browser, potenziell beliebig groß), während
  der Export beim Fehlen dieser Attribute auf fest 300×200 px bzw. 6×4 cm zurückfällt —
  **ein sichtbarer Unterschied zwischen Editor-Ansicht und Export-Ergebnis** ist damit ein
  konkret zu prüfender, aus dem Code plausibler Verdachtsfall (siehe Grenzfall 3.4).
- Empfohlene, zu bestätigende oder zu verwerfende Zielvorgabe: Beim Einfügen wird die
  tatsächliche intrinsische Auflösung der Bilddatei ermittelt (z. B. über
  `Image.naturalWidth/naturalHeight` nach Laden der Data-URL) und – unter Beibehaltung des
  Seitenverhältnisses – auf eine sinnvolle Standardbreite (z. B. maximale Textbreite der
  Seite) herunterskaliert, **und diese Werte werden explizit in `width`/`height` des
  Bild-Node gespeichert** (heute nicht der Fall, siehe `insertImage` in Abschnitt 0).

### 2.5 Alt-Text bei Einfügung

- Automatisches Setzen von `alt` auf den Dateinamen (aktueller Ist-Stand) ist als
  Startwert akzeptabel, muss aber klar von „editierbarem Alt-Text“ (separater Slug
  `bild-alt-text`) unterschieden bleiben — diese Datei fordert nur, dass der
  automatische Startwert selbst bei Rundreise erhalten bleibt (siehe Abschnitt 5) und
  nicht versehentlich verloren geht oder mit einem Leerstring überschrieben wird.

### 2.6 Zusammenspiel mit Undo/Redo

- Einfügen eines Bildes ist **ein einziger Undo-Schritt**: Strg+Z direkt danach entfernt
  das Bild vollständig und stellt den vorherigen Text (inklusive der Absatz-Teilung aus
  2.1.3, die dabei wieder zusammengeführt werden muss) exakt wieder her — kein
  Nebeneffekt auf umgebenden Text (explizit als Testfall in `FEATURE-SPEC-DOCX-ODT.md`
  Abschnitt 2, Testfall 7 und Abschnitt 7, Testfall 3 gefordert).
- Redo stellt das Bild inklusive aller Attribute identisch wieder her.

### 2.7 Zusammenspiel mit Löschen

- Markieren des Bildes (Klick, da `draggable: true` im Schema — zu prüfen, ob dadurch
  auch eine Node-Selection per Klick entsteht) und Drücken von Entf/Backspace entfernt das
  Bild vollständig, ohne umgebenden Text zu beeinträchtigen (Slug `bild-loeschen`,
  Backlog-Status „vorhanden“ — hier nur als Randbedingung für den Einfüge-Undo-Test aus
  2.6 relevant).

### 2.8 Geltungsbereich innerhalb der Dokumentstruktur

Da `image` vom Typ `group: 'block'` ist, muss geprüft werden, in welchen Block-Kontexten
das Einfügen tatsächlich funktioniert:
- Normaler Absatz (Grundfall, siehe 2.1).
- Innerhalb einer Tabellenzelle (Cursor in einer Zelle, Bild einfügen) — Zelle muss danach
  weiterhin eine gültige Tabellenzelle mit Bild **und** ggf. umgebendem Text sein.
- Innerhalb eines Listenpunkts — Bild darf die Listenstruktur nicht brechen (z. B. nicht
  versehentlich die gesamte Liste beenden).
- Innerhalb einer Überschrift — zu klären, ob dies überhaupt sinnvoll zugelassen werden
  soll oder ob das Bild automatisch aus der Überschrift heraus verschoben wird (Word/
  LibreOffice-Referenzverhalten als Vorbild nehmen, Ergebnis dokumentieren).
- Innerhalb von Kopf-/Fußzeile, sobald diese laut `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 9
  über die UI bedienbar sind.

---

## 3. Grenzfälle (Edge Cases) — mit technischer Einschätzung

Die folgenden Punkte sind keine Vermutungen „ins Blaue“, sondern aus dem tatsächlichen
Code abgeleitete, konkret prüfbare Verdachtsfälle. Jeder Punkt braucht einen eigenen Test,
der das beobachtete Ist-Verhalten festhält (bestätigt den Verdacht **oder** widerlegt ihn).

### 3.1 Cursor-Position nach Toolbar-Klick (Selection-Sync-Bezug, höchste Priorität)

Der Klick auf den „Bild“-Kontrolleintrag (bzw. das Öffnen des nativen Datei-Dialogs)
entzieht dem Editor kurzzeitig den Fokus; `handleImagePick` wird erst **nach** Auswahl der
Datei (asynchron, nach Abschluss von `FileReader.readAsDataURL`) aufgerufen und arbeitet
dann mit `view.state`/`view.dispatch` zum Zeitpunkt des `run(...)`-Aufrufs.

> **Verdacht:** Zwischen Toolbar-Klick (Fokusverlust) und dem tatsächlichen Einfügen
> (nach dem asynchronen Dateilesen) kann prinzipiell Zeit vergehen, in der sich die
> ProseMirror-Selektion durch andere Interaktionen ändern könnte — im Normalfall
> unkritisch, da der native Dateidialog blockierend ist, aber bei manchen
> Betriebssystemen/Browsern (nicht-blockierende oder sehr lange offene Dialoge) ein
> Risiko, das dem in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2 beschriebenen
> Selection-Sync-Bug strukturell ähnelt (Aktion, die zeitversetzt auf eine möglicherweise
> veraltete Selektion angewendet wird).

**Anforderung:** Test, der Text eingibt, den Cursor an einer definierten Stelle
positioniert, den Bild-Dialog öffnet, **vor** Abschluss der Dateiauswahl den Fokus/die
Selektion im Editor absichtlich verändert (soweit im Testrahmen simulierbar) und
anschließend die Datei auswählt → das Bild muss an der Position landen, die zum Zeitpunkt
des tatsächlichen Einfüge-Aufrufs (`run(view, insertImage(...))`) aktuell war, nicht an
einer zwischenzeitlich veralteten. Mindestens der Grundfall (kein Fokuswechsel während des
Dialogs) muss als Regressionstest analog zu `selection-regression.spec.ts` abgesichert
sein: Bild einfügen → Klick zur Neupositionierung → Enter → weiter tippen → nichts geht
verloren.

### 3.2 Text-Absatz-Teilung beim Einfügen inmitten eines Absatzes (Kernverdacht des gemeldeten Fehlers)

`insertImage` ruft `state.tr.replaceSelectionWith(node)` mit einem Node vom Typ `block`
auf, während sich die Schreibmarke typischerweise **innerhalb** eines `paragraph`-Node
(Typ `block`, Inhalt `inline*`) befindet. ProseMirror muss in diesem Fall den
umgebenden Absatz aufteilen, um den Block-Node an einer strukturell gültigen Stelle
einzufügen.

> **Verdacht (Kern des von der Nutzerin gemeldeten Problems):** Es ist durch reine
> Code-Durchsicht nicht auszuschließen, dass diese Aufteilung in bestimmten Fällen (z. B.
> Cursor direkt am Anfang oder Ende eines Absatzes, Cursor in einem Absatz, der bereits
> Marks/Formatierungen enthält, oder in Kombination mit dem in Abschnitt 2 der
> Haupt-Spezifikation beschriebenen Selection-Sync-Bug) zu Textverlust führt oder dass das
> Bild an einer anderen als der erwarteten Stelle landet.

**Anforderung:** Explizite Testmatrix für die Position der Schreibmarke relativ zum
umgebenden Text: (a) ganz am Anfang eines nicht-leeren Absatzes, (b) ganz am Ende, (c)
inmitten eines Wortes, (d) inmitten eines bereits fett/kursiv formatierten Textteils, (e)
in einem komplett leeren Absatz, (f) unmittelbar vor/nach einem bereits vorhandenen
`hard_break`. In jedem Fall müssen **beide** Textteile (soweit vorhanden) und die
Formatierung des jeweiligen Teils vollständig erhalten bleiben — dies ist der explizite
Testfall 2 aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 7 und muss zuerst per echtem
`filechooser`-Flow im Browser nachgestellt werden, nicht nur über direkt konstruierte
ProseMirror-JSON-Daten (die bereits vorhandenen Unit-Tests in Abschnitt 0 – Zeile
261–275/223–244 – testen genau diesen Fall bereits auf Reader/Writer-Ebene für
**konstruierte** Daten, nicht aber über die echte Editor-Bedienung `insertImage` selbst).

### 3.3 Fehlende MIME-Typ-Prüfung (bestätigter Code-Befund, kein reiner Verdacht)

Wie in Abschnitt 0 belegt, prüft `handleImagePick` `file.type` an keiner Stelle. Eine
Nutzerin kann in den meisten Betriebssystem-Dateidialogen den `accept`-Filter umgehen
(„Alle Dateien“ auswählen) und z. B. eine `.txt`- oder `.pdf`-Datei auswählen.

> **Bestätigter Befund:** Eine solche Datei würde anstandslos per `FileReader` als
> Data-URL gelesen und über `insertImage(dataUrl, file.name)` als `<img src="data:text/
> plain;base64,…">` eingefügt — der Browser zeigt dafür das native „Bild kann nicht
> angezeigt werden“-Platzhaltersymbol, es gibt keine App-eigene Fehlermeldung.

**Anforderung:** Vor dem Aufruf von `insertImage` muss `file.type` (bzw. ergänzend eine
Signatur-/Magic-Number-Prüfung der gelesenen Bytes, da `file.type` clientseitig fälschbar/
leer sein kann) gegen die Liste unterstützter Bildformate geprüft werden; bei Nichterfüllung
erscheint eine sichtbare Fehlermeldung, **keine** Einfügung erfolgt.

### 3.4 Diskrepanz Editor-Darstellung vs. Export-Größe (bestätigter Code-Befund)

Siehe Abschnitt 0 und 2.4: `insertImage` setzt nie `width`/`height`; der DOCX-/ODT-Writer
fällt dann auf feste Ersatzwerte zurück. Das bedeutet, ein im Editor eingefügtes,
z. B. quadratisches 1:1-Bild wird beim DOCX-Export auf ein 300×200-px-Rechteck (Verhältnis
3:2) gezwungen — **sichtbare Verzerrung** ist die zu erwartende, durch Code-Analyse
begründete Konsequenz.

**Anforderung:** Test, der ein Bild mit bekanntem, nicht-3:2-Seitenverhältnis (z. B.
quadratisch oder 16:9) über den echten `filechooser`-Flow einfügt, als DOCX **und** als
ODT exportiert und das exportierte `wp:extent`/`svg:width`+`svg:height` gegen das
tatsächliche Seitenverhältnis der Quelldatei prüft. Bestätigt sich die Verzerrung, muss
entweder `insertImage` die intrinsischen Maße ermitteln und setzen (siehe 2.4) oder der
Writer die tatsächlichen Bilddaten selbst vermessen, bevor er einen Ersatzwert wählt.

### 3.5 Verlust der Bildgröße bei Fremddatei-Rundreise (bestätigter Code-Befund, kritischster Rundreise-Fall)

Siehe Abschnitt 0: Weder DOCX- noch ODT-Reader lesen die in der Fremddatei vorhandene
Bildgröße (`wp:extent`/`svg:width`+`svg:height`) aus.

> **Bestätigter Befund:** Eine mit echtem Microsoft Word oder LibreOffice Writer erzeugte
> Datei mit einem bewusst auf z. B. 5×5 cm verkleinerten Bild verliert diese Information
> beim Import vollständig; ein unveränderter Re-Export bringt das Bild auf 300×200 px
> (DOCX) bzw. 6×4 cm (ODT) zurück — **unabhängig vom Originalmaß**. Dies ist ein direkter,
> bereits durch Code-Durchsicht (nicht erst durch Testlauf) nachweisbarer Verstoß gegen die
> zentrale Rundreise-Anforderung dieser App.

**Anforderung:** Höchste Priorität unter allen Grenzfällen dieser Datei. Reader müssen
`wp:extent`/`a:ext` (DOCX) bzw. `svg:width`/`svg:height` (ODT) auslesen und in
`width`/`height` (in einer einheitlichen internen Einheit, z. B. Pixel bei 96 dpi) ablegen;
Writer müssen bei vorhandenen `width`/`height` diese exakt (nicht den Ersatzwert)
verwenden. Pflicht-Testfall: reale Datei mit bekannter, von 300×200 px/6×4 cm
abweichender Bildgröße unverändert hochladen → unverändert exportieren → exportierte
Maße entsprechen (im Rahmen der Einheiten-Umrechnungsgenauigkeit) dem Original.

### 3.6 Mehrere Bilder mit identischem Binärinhalt

`ImageCollector.add()` (`src/formats/docx/imageCollector.ts` Zeile 15–28,
`src/formats/odt/imageCollector.ts` analog) dedupliziert Bilder **nach exakt gleicher
Data-URL** und vergibt in diesem Fall denselben Dateinamen im Zip-Archiv.

> **Einschätzung:** Für zwei tatsächlich (byte-)identische Bilder ist das unproblematisch,
> solange beide `image`-Nodes im Dokument unabhängig voneinander bestehen bleiben und
> jeweils korrekt auf dieselbe Mediendatei verweisen (kein Verlust, keine Verwechslung
> der **Position** im Dokument). Zu verifizieren, nicht nur anzunehmen: Fügt man dasselbe
> Bild zweimal an unterschiedlichen Stellen ein, bleiben nach Rundreise **beide** Stellen
> mit je einem sichtbaren Bild erhalten (nicht nur eines).

**Anforderung:** Testfall mit zweimaligem Einfügen derselben Datei an unterschiedlichen
Cursor-Positionen → Rundreise erhält beide Vorkommen an ihren jeweiligen Positionen.

### 3.7 Sehr große Bilddatei

- `FileReader.readAsDataURL` liest die komplette Datei synchron in den Speicher und
  wandelt sie in eine Base64-Data-URL um (ca. 33 % größer als die Originaldatei); diese
  Data-URL wird direkt als ProseMirror-Attribut (`src`) im Dokumentzustand gehalten.
- **Anforderung:** Ein mehrere MB großes Foto (z. B. 10–20 MB, wie von einer modernen
  Smartphone-Kamera) darf die UI nicht spürbar einfrieren (siehe
  `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 7, Testfall 10). Zu klären und zu dokumentieren,
  ob eine Obergrenze mit Fehlermeldung sinnvoll ist oder ob (und mit welcher tatsächlich
  gemessenen Ladezeit) beliebig große Dateien akzeptiert werden.

### 3.8 Bild am Dokumentanfang/-ende

- Bild als allererstes bzw. allerletztes Element des Dokuments einfügen (kein Text davor/
  danach) → Editor bleibt weiterhin normal bedienbar, Cursor-Positionierung davor/danach
  funktioniert (vgl. `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6, Testfall 10, analoger
  Grenzfall bei Tabellen).

### 3.9 Bild unmittelbar neben einem anderen Block-Element

- Bild unmittelbar vor/nach einer Tabelle, einer Liste oder einem Seitenumbruch (sobald
  `seitenumbruch-req.md` umgesetzt ist) einfügen → keine Vermischung/Verschiebung der
  benachbarten Strukturen.

### 3.10 Wiederholtes schnelles Einfügen mehrerer Bilder hintereinander

- Mehrere Bilder kurz hintereinander einfügen (z. B. drei Dateien nacheinander ohne
  Zwischenklick auf den Editor) → jedes Bild landet an der zum jeweiligen Einfüge-
  Zeitpunkt korrekten, aktuellen Cursor-Position (nicht alle an derselben, veralteten
  Position) — verwandter Fall zu Grenzfall 3.1.

### 3.11 Undo einer Bild-Einfügung, die eine Absatz-Teilung ausgelöst hat

- Direkt im Anschluss an 3.2: Strg+Z nach einer Einfügung, die einen Absatz geteilt hat,
  muss nicht nur das Bild entfernen, sondern auch die Absatz-Teilung rückgängig machen
  (ein einziger zusammenhängender Absatz wie vor der Einfügung, nicht zwei leere
  Absätze übrig).

---

## 4. Visuelle Darstellung

- Das eingefügte Bild muss im Editor unmittelbar sichtbar sein (kein Reload/Refresh
  nötig).
- Solange keine explizite Größe gesetzt ist, darf die Browser-Standarddarstellung
  (natürliche Bildgröße) nicht dazu führen, dass das Bild die sichtbare Seitenbreite
  überschreitet — mindestens eine CSS-Begrenzung (`max-width: 100%` innerhalb der
  Seiten-Darstellung) ist zu verifizieren.
- Das „🖼“-Symbol des Kontrolleintrags muss auf einem System ohne Emoji-Schriftstütze
  eindeutig erkennbar bleiben (siehe Abschnitt 1, Zeile 3, und
  `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.1).
- Markiertes (selektiertes) Bild muss sich visuell erkennbar von unselektiertem Zustand
  unterscheiden (Voraussetzung u. a. für zuverlässiges Löschen, Slug `bild-loeschen`).

---

## 5. Rundreise-Anforderung (DOCX **und** ODT)

Verbindlich für **beide** Formate, in **beiden** Richtungen (Import und Export), gemäß
Grundprinzip der Haupt-Spezifikation: Datei A hochladen → **unverändert** exportieren →
Ergebnis entspricht inhaltlich A. Für Bilder gilt das zusätzlich für die im Editor selbst
neu eingefügten Bilder (Export → Re-Import).

### 5.1 Pflicht-Szenarien

1. **DOCX, reine Editor-Erzeugung:** Neues Dokument → Text tippen → Cursor mitten im
   Text platzieren → Bild über echten `filechooser`-Flow einfügen → als DOCX exportieren
   → Re-Import → Bild an derselben relativen Position, **beide** Textteile davor/danach
   unverändert vorhanden, Bild sichtbar und nicht verzerrt.
2. **ODT, reine Editor-Erzeugung:** dieselbe Sequenz, Export/Re-Import als ODT.
3. **DOCX-Fremddatei-Rundreise (unverändert):** Eine unabhängig (nicht mit diesem Reader/
   Writer, sondern mit echtem Microsoft Word) erzeugte DOCX-Datei mit einem eingebetteten
   Bild bekannter Größe hochladen → **ohne jede Änderung** exportieren → im exportierten
   `word/document.xml` ist dasselbe Bild mit **derselben** `wp:extent`-Größe (nicht dem
   Ersatzwert 300×200 px, siehe Grenzfall 3.5) weiterhin vorhanden, keine verwaisten
   Bilddateien im Zip, keine zusätzlichen/fehlenden Bilder.
4. **ODT-Fremddatei-Rundreise (unverändert):** analog mit einer unabhängig, mit echtem
   LibreOffice Writer erzeugten ODT-Datei — Größe (`svg:width`/`svg:height`) muss
   ebenfalls exakt erhalten bleiben.
5. **Cross-Format-Rundreise DOCX → ODT:** DOCX mit Bild importieren → als ODT exportieren
   → Bild, Alt-Text **und** Größe (umgerechnet in die jeweilige Einheit) bleiben erhalten.
6. **Cross-Format-Rundreise ODT → DOCX:** umgekehrt, analog.
7. **Doppelte Rundreise (Hin und Zurück):** DOCX → Editor → ODT → Editor → DOCX an einem
   Dokument mit Bild → nach zwei Konvertierungen ist das Bild inhaltlich identisch,
   weiterhin an derselben Stelle, ohne kumulativen Qualitäts-/Maßverlust.
8. **Bild in Kombination mit anderen Strukturen bei Rundreise:** Bild innerhalb einer
   Tabellenzelle, innerhalb eines Listenpunkts, sowie in Kopf-/Fußzeile (sobald über die
   UI bedienbar) → jeweils einzeln testen, dass Zuordnung/Position erhalten bleibt (siehe
   `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 7, Testfall 7 — aktuell laut Abschnitt 0 nicht
   einmal auf Unit-Ebene abgedeckt).
9. **Mehrere Bilder im selben Dokument:** mindestens drei unterschiedliche Bilder an
   unterschiedlichen Positionen → nach Rundreise bleiben alle drei einzeln,
   unterscheidbar und an ihrer jeweiligen Position erhalten (kein Vertauschen, siehe auch
   Grenzfall 3.6 für den Sonderfall identischer Bilder).
10. **Bild löschen, dann exportieren:** Bild einfügen → wieder löschen (Entf) → exportieren
    → exportierte Datei enthält **kein** verwaistes Bild im Zip-Archiv (weder als
    `media/*`-Datei noch als Relationship-/Manifest-Eintrag) — siehe
    `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 7, Testfall 9.
11. **Validierung gegen unabhängigen Parser:** Der exportierte DOCX-`<w:drawing>`-Block
    muss zusätzlich mit einer vom eigenen Reader unabhängigen Bibliothek (z. B.
    `python-docx`) als valides eingebettetes Bild erkannt werden — nicht nur durch den
    eigenen Reader wieder einlesbar sein.
12. **Validierung ODT analog** gegen das ODF-Schema bzw. eine unabhängige Bibliothek
    (`draw:frame`/`draw:image`, Eintrag in `META-INF/manifest.xml`).

### 5.2 Aus Abschnitt 3 übernommene, für Bild-Einfügen verbindliche Rundreise-Grenzfälle

- Grenzfall 3.4 (Diskrepanz Editor-Darstellung/Export-Größe) und 3.5 (Verlust der
  Bildgröße bei Fremddatei-Rundreise) sind ausdrücklich Teil der Rundreise-Anforderung —
  „unverändert exportieren“ darf nicht dazu führen, dass eine beim Import bereits
  (fälschlich) verlorene Größeninformation erst recht zementiert wird.
- Grenzfall 3.6 (identische Bilder) und 3.3 (Formatprüfung, verhindert von vornherein
  ungültige `image`-Nodes, die sonst eine Rundreise verunreinigen könnten).

---

## 6. Testplan-Hinweise (Unit + E2E, Playwright)

1. **Unit-Tests DOCX/ODT (bereits vorhanden, aber lückenhaft — siehe Abschnitt 0):**
   Bestehende Roundtrip-Tests um Assertions für `attrs.width`/`attrs.height` ergänzen
   (aktuell nicht geprüft trotz teilweise vorhandener Eingabewerte); zusätzlich neue
   Tests für: Bild in Tabellenzelle, Bild in Listenpunkt, Bild in Kopf-/Fußzeile, zwei
   identische Bilder an unterschiedlichen Positionen.
2. **Unit-Test „`<wp:extent>`/`svg:width` wird beim Import gelesen“:** gegebenes DOCX-/
   ODT-XML mit einer von den Ersatzwerten abweichenden Größe → Reader erzeugt Node mit
   exakt dieser Größe (aktuell laut Abschnitt 0 mit Sicherheit rot, da der Lesepfad
   schlicht nicht existiert).
3. **E2E-Test (Playwright), Grundfall:** `page.locator('.ProseMirror')` fokussieren,
   Text eingeben, Cursor mitten im Text platzieren, echten `filechooser`-Flow auslösen
   (`page.on('filechooser', ...)` bzw. `input.setInputFiles(...)` auf den versteckten
   `<input type="file">`), Testbild auswählen → Bild sichtbar im DOM, **beide**
   Textteile davor/danach unverändert vorhanden (deckt den zentralen gemeldeten Fehler
   ab, siehe Grenzfall 3.2). **Dieser Test existiert laut Abschnitt 0 aktuell nicht.**
4. **E2E-Test Undo:** direkt im Anschluss an 3 → `Strg+Z` → Bild verschwindet, Text
   (inkl. wiederhergestellter Absatz-Zusammenführung) exakt wie vor der Einfügung.
5. **E2E-Test Rundreise DOCX:** Bild einfügen → echten Datei-Download auslösen (Export)
   → Datei erneut über den echten Upload-Weg importieren → Bild weiterhin vorhanden
   (ergänzt den bereits als Unit-Test vorhandenen, aber nur konstruierte Daten
   verwendenden Test aus Abschnitt 0).
6. **E2E-Test Rundreise ODT:** analog.
7. **Regressionstest-Pflicht (Selection-Sync):** Bild-Einfügen zusätzlich zu „Fett“
   (bereits vorhanden) und ggf. „Seitenumbruch“ als dritte auslösende Aktion in
   `selection-regression.spec.ts` (oder einer Bild-spezifischen Variante) mit exakt
   derselben Sequenz aufnehmen: Text eingeben → Bild einfügen → per Klick neu
   positionieren → Enter → weiter tippen → nichts geht verloren.
8. **Formatprüfung-Test:** Nicht-Bild-Datei (z. B. `.txt` mit Bild-Endung umbenannt oder
   direkt mit falschem MIME-Typ) über den echten Upload-Weg auswählen → sichtbare
   Fehlermeldung, keine Einfügung, keine unbehandelte Promise-Ablehnung in der Konsole.
9. **Reale Test-Fixtures:** mindestens eine mit echtem Microsoft Word und eine mit
   echtem LibreOffice Writer erzeugte Datei mit mindestens einem Bild bekannter,
   von den Ersatzwerten abweichender Größe sind ins Test-Fixture-Verzeichnis
   aufzunehmen (laut aktueller Durchsicht von `tests/fixtures/external/README.md` nur
   erwähnt, nicht zweifelsfrei mit zugehöriger Bild-Assertion vorhanden) — rein
   synthetisch konstruiertes Test-XML reicht nicht aus, um reale Word-/
   LibreOffice-Eigenheiten (z. B. `wp:docPr`-IDs, Bildbeschnitt-Metadaten,
   `a:srcRect`) abzudecken.
10. **Großdatei-Test:** Bilddatei im Bereich mehrerer MB über den echten Upload-Weg
    einfügen → gemessene Zeit bis zur sichtbaren Darstellung protokollieren, UI bleibt
    währenddessen bedienbar (keine eingefrorene Seite).

---

## 7. Abnahmekriterien (Definition of Done)

Die Funktion „Bild aus Datei einfügen“ gilt erst dann wieder als **vertrauenswürdig
„vorhanden“**, wenn:

1. Alle Testfälle aus Abschnitt 2 (Grundfall, Selektion, Formatprüfung, Bildgröße,
   Alt-Text, Undo/Redo, Löschen, Geltungsbereich in der Dokumentstruktur) automatisiert
   und grün sind — insbesondere über den **echten** `filechooser`-Flow im Browser, nicht
   nur über direkten Command-Aufruf mit konstruierten Daten.
2. Jeder Grenzfall aus Abschnitt 3 einzeln durch einen Test beantwortet ist — insbesondere
   die beiden bereits durch Code-Durchsicht **bestätigten** Defekte 3.4 (Diskrepanz
   Editor-Darstellung/Export-Größe) und 3.5 (Verlust der Bildgröße bei
   Fremddatei-Rundreise) sind entweder behoben und mit Regressionstest abgesichert oder
   ihre Nichtbehebung ist bewusst und ausdrücklich als akzeptierte Einschränkung
   dokumentiert (kein stiller Fehlschlag, siehe `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.4).
3. Der zentrale, von der Nutzerin gemeldete Fall (Grenzfall 3.2: Text vor und nach dem
   Bild bleibt bei Einfügung inmitten eines Absatzes vollständig erhalten) ist mit einem
   echten Browser-Test für **alle** in 3.2 gelisteten Cursor-Positionen abgesichert.
4. Alle zwölf Rundreise-Szenarien aus Abschnitt 5.1 grün sind, inklusive der beiden
   unabhängigen Validierungen (5.1.11/5.1.12) und ausdrücklich inklusive Szenario 8
   (Bild in Tabellenzelle/Listenpunkt/Kopf-Fußzeile), das laut Abschnitt 0 aktuell nicht
   einmal auf Unit-Ebene existiert.
5. Der Selektions-Sync-Regressionstest (Grenzfall 3.1, analog
   `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2) mit Bild-Einfügen als auslösender Aktion
   dauerhaft Teil der Suite ist.
6. Die MIME-Typ-/Formatprüfung (Grenzfall 3.3) implementiert und mit Test abgesichert ist
   — aktuell laut Abschnitt 0 vollständig fehlend.
7. Das Toolbar-Bedienelement selbst den in Abschnitt 1 geforderten Mindeststandard
   erfüllt (`title`/`aria-label`, tastaturerreichbar, Icon eindeutig erkennbar).
8. Reale Fixture-Dateien aus echtem Microsoft Word **und** echtem LibreOffice Writer mit
   Bildern bekannter, von den Ersatzwerten abweichender Größe im Test-Fixture-Verzeichnis
   vorhanden und in mindestens je einen Rundreise-Test eingebunden sind.

Andernfalls ist der Backlog-Status auf **teilweise** zu setzen und die konkret fehlenden
Teilpunkte sind hier nachzutragen (analog zur Vorgehensweise in
`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 17/21 und in `seitenumbruch-req.md` Abschnitt 7).
