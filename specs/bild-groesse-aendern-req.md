# Anforderungsspezifikation: „Bildgröße ändern"

Status: **Entwurf zur Freigabe, nicht vertrauenswürdig bis einzeln über echte
Browser-Bedienung verifiziert.** Diese Datei ersetzt die bisherige
`specs/bild-groesse-aendern-req.md` vollständig. Sie übernimmt deren sorgfältige
Code-Recherche (der bislang **einzige** Bild-Grenzfall-Katalog des Projekts, siehe
Abschnitt 0), **behebt aber deren größte Schwäche**: Die Vorfassung ließ zentrale
Entscheidungen (Min/Max-Grenzen, Einheit, Verhalten bei Größe > Seitenbreite, „Tippen nach
Größenänderung") als „offene Klärungsfrage" stehen, statt sie aus Nutzersicht zu
entscheiden. Diese Fassung trifft diese Entscheidungen **verbindlich** — analog zum
Vorgehen in `specs/tabelle-struktur-bearbeiten-req.md` §2.8 („letzte Zeile/Spalte") und
`specs/zellen-verbinden-req.md` §2.3/§2.6 (Cursor-Korrektur), die beide zeigen, dass eine
req.md offene Verhaltensfragen selbst beantworten muss, statt sie an Dev/QA
weiterzureichen.

**Rollentrennung (verbindlich, `specs/UX-INVARIANTEN.md` Abschnitt 3):** Diese Datei ist
aus **Nutzersicht** geschrieben, kennt den Implementierungsaufwand bewusst **nicht** und
fordert deshalb offensichtliche Nutzererwartungen ein (sichtbare Auswahl, Tastatur-/
Touch-Alternative, View-Sync, Zusammenspiel mit Zoom/A4-Darstellung), statt sie
wegzurationalisieren. Sie enthält **keinen Code und keine Tests** — nur die Anforderung,
an der sich Umsetzung (Dev) und Abnahme (QA) messen lassen.

Bezug: `specs/FEATURE-BACKLOG.md`, Slug `bild-groesse-aendern`, Bereich „3.3 Bilder &
Grafiken", Priorität **1 – essenziell** („Passt Höhe/Breite per Eingabefeld oder
Ziehpunkte an."); `E:\docs\FEATURE-SPEC-DOCX-ODT.md` Abschnitt 7 („Bilder", von der
Nutzerin explizit als nicht funktionsfähig gemeldet — höchste Priorität; „Größe
nachträglich änderbar (mind. per Eingabefeld, idealerweise per Ziehpunkte)."). Grundlage
und Geschwisterdateien: `specs/bild-einfuegen-req.md`, `specs/bild-loeschen-req.md`
(gemeinsamer Bild-Kontext, DOCX/ODT-Editor teilt Schema, Toolbar, `WordEditor.tsx`);
Vorbild für Gliederung, Detailtiefe und insbesondere für eine vollständige, prüfbare
Testliste/DoD: `specs/tabelle-struktur-bearbeiten-req.md`, `specs/zellen-verbinden-req.md`
(beide mussten wegen untervollständiger Testabdeckung je einen QA-Nachbesserungslauf
machen — diese Datei ist bewusst so vollständig gehalten, dass das hier vermieden wird).

**Geltungsbereich:** ausschließlich das nachträgliche Ändern der Anzeigegröße
(Breite/Höhe) eines bereits im Dokument vorhandenen `image`-Node, für DOCX **und** ODT
identisch (gemeinsamer Editor), inklusive Rundreise. **Ausdrücklich nicht** Teil dieser
Datei (eigene Backlog-Slugs): `bild-einfuegen` (Standardgröße **beim** Einfügen),
`bild-loeschen`, `bild-alt-text`, `bild-zuschneiden` (verändert den sichtbaren Ausschnitt,
nicht die Anzeigegröße), `textumbruch-bild`/`bild-position` (Textumfluss/Verankerung —
`image` bleibt `group: 'block'`), `kopfzeile-bearbeiten`/`fusszeile-bearbeiten` (eigene
UI-Lücke, hier nur als Grenzfall erwähnt).

Stil: Zeilennummern sind Momentaufnahmen (Stand dieser Analyse, 2026-07-05) und bei
Umsetzung per **Symbolsuche** neu zu verankern — das gilt für jede Zahl in dieser Datei.

---

## 0. Verifizierter Ist-Stand

Unabhängig gegen den aktuellen Quellstand (`E:\docs\src`) neu geprüft, nicht ungeprüft aus
der Vorfassung übernommen. Wo unten „laut Vorlage" steht, stammt der Befund aus den
Grundlagen-Spezifikationen (`bild-einfuegen-req.md`, `bild-loeschen-req.md`) und wurde für
diese Datei per Symbolsuche gegengelesen — beides ist bei Umsetzung **erneut** per
Symbolsuche zu verankern, da sich der Code seit deren Abnahme weiterentwickelt hat
(u. a. sind die Bedienblöcke „Tabellenstruktur bearbeiten" und „Zellen verbinden/teilen"
seither hinzugekommen, was die Zeilennummern in `Toolbar.tsx` spürbar verschoben hat).

| # | Fundstelle | Befund |
|---|---|---|
| 1 | `src/formats/shared/schema.ts` › `nodes.image` (Zeile 58–85) | `group: 'block'`, `draggable: true`, **kein** `selectable: false` (anders als `hard_break`, Zeile 42–56) ⇒ per ProseMirror-Standard bereits per Klick als `NodeSelection` auswählbar — bereits durch `bild-loeschen-req.md` genutzt. Attribute: `src` (`validate: 'string'`), `alt` (Default `''`, `validate: 'string'`), **`width`/`height` (beide `{ default: null }`, Zeile 63–64, weiterhin **ohne** `validate`** — einzige Attribute im ganzen Schema ohne Validierung). `parseDOM.getAttrs` liest `width`/`height` per `el.getAttribute(...)` (Zeile 75–76) ⇒ liefert **String oder `null`**, nie eine Zahl. `toDOM` gibt `['img', { src, alt, width, height }]` aus (Zeile 82–83). **Datenmodell für die Größe existiert bereits** — es fehlt jedes Bedienelement, das es nach dem Einfügen ändert. |
| 2 | `src/formats/shared/editor/commands.ts` › `insertImage(src, alt='')` (Zeile 82–84) | Erzeugt den Node ausschließlich mit `{ src, alt }` — `width`/`height` bleiben beim Einfügen `null`. **Kein** `setImageSize`- oder vergleichbares Command vorhanden (Volltextsuche in der Datei: kein Treffer). Muster für das neue Command: `setAlign` (Zeile 29ff.), das per `tr.setNodeAttribute(pos, …)` arbeitet, sowie die aus dem Vorgänger-Feature stammenden Guard-Wrapper `deleteRowOrTable`/`mergeCellsWithCursor` (dispatch-loser Verfügbarkeits-Check + Cursor-Korrektur in derselben Transaktion) als direktes Vorbild für „Command + anschließende Selektions-/Cursor-Korrektur in einem Schritt". |
| 3 | `src/formats/shared/editor/Toolbar.tsx` (`handleImagePick`, Zeile 274–…; Bild-`<label>` Zeile 488–491) | Einziges bildbezogenes Bedienelement ist weiterhin der **Einfügen**-Weg (`<label>🖼 Bild<input type="file">`). **Kein** Eigenschaften-Panel, keine Ziehpunkte, kein Größenfeld. Die Datei enthält inzwischen (seit Vorgänger-Features) bereits **zwei** direkt wiederverwendbare Muster für neue, kontextabhängige Buttons: `TableOpButton` (Zeile 228–260, `onMouseDown` + `preventDefault()` **plus** `onClick` für zuverlässige Maus-**und**-Tastatur-Auslösung, `disabled`-Zustand mit sprechendem `title`/`aria-label`) und `runTable` (Zeile 48–51, ruft das Kommando mit einem Dispatch-Callback auf, der `tr.scrollIntoView()` anhängt — direktes View-Sync-Vorbild für 2.8). |
| 4 | `src/formats/shared/editor/WordEditor.tsx` | Eine Suche nach `nodeViews`/`NodeView` über **ganz** `src/formats/shared/` liefert weiterhin **keinen** Treffer — es existiert keine Möglichkeit, eigene Ziehpunkte an einem selektierten Bild zu rendern; dafür muss ein eigener `image`-NodeView neu gebaut werden. |
| 5 | `src/formats/shared/editor/WordEditor.tsx` › `reconcileSelectionOnClick` (Zeile 44–47) + Maus-Handler mit `CLICK_DRAG_THRESHOLD_PX = 3` (Zeile 257–270) | Bei jedem „Plain-Click" (Maus < 3 px bewegt) wird die Selektion per `posAtCoords`/`TextSelection.near` neu gesetzt. Eine Bild-`NodeSelection` ist nicht-leer — direkter Anwendungsfall, analog zu `bild-loeschen-req.md` R2/R4. Für ein neues Resize-Overlay (eigene `mousedown`/`mouseup`-Handler auf den Griffen) ist zu verifizieren, dass diese Reconciliation nicht zwischen die Ziehgeste funkt. |
| 6 | `src/formats/shared/editor/WordEditor.tsx` (Zoom, Zeile 128–316) | **Neu gegenüber der Vorfassung** (Feature „Dokument-Basisdarstellung" ist seither umgesetzt): Die Seite wird über einen skalierten Footprint-Wrapper **und** `transform: scale(zoom)` auf dem Blatt selbst dargestellt (Zeile 300–309, `transformOrigin: 'top left'`). Laut `specs/dokument-darstellung-req.md` §9 ist Klick→Dokumentposition (`posAtCoords`) unter Zoom bereits empirisch korrekt verifiziert — **aber** eine **eigene** Ziehpunkte-Implementierung dieses Features liest `event.clientX/clientY`-**Deltas** während `mousemove`, die in **Bildschirm-Pixeln** ankommen, während das Modell `width`/`height` in **ungezoomten** CSS-Pixeln führt. Ein neuer, hier zu bauender Resize-Handler muss die Bewegungsdifferenz durch den aktuellen `zoom`-Faktor teilen, sonst skaliert eine Ziehgeste bei z. B. 50 % Zoom die Bildgröße nur mit dem halben (oder bei falscher Multiplikationsrichtung doppelten) Betrag der sichtbaren Mausbewegung — **direkte, neue Konsequenz** aus dem seit der Vorfassung hinzugekommenen Zoom-Feature, in der Vorfassung noch nicht existent und daher dort auch nicht bedacht. |
| 7 | `src/index.css` (Zeile 39–42: `.ProseMirror img`; Zeile 64–83: `.selectedCell`-Overlay) | `.ProseMirror img { max-width: 100%; height: auto }` weiterhin unverändert vorhanden — rein visuelle Deckelung, **unabhängig** vom Modell-`width`/`height` (Grenzfall 3.9). Seit der Vorfassung ist zusätzlich eine `.selectedCell`-Overlay-Regel für Tabellen entstanden (Zeile 71–78, Muster: `position: relative` auf der Zelle + `::after`-Overlay mit `pointer-events: none`, hell-/dunkelmodustauglich) — **direkt als Vorlage für die in 3.13 geforderte `.ProseMirror-selectednode`-Markierung nutzbar**, die für Bilder weiterhin **fehlt** (Volltextsuche über `src/`: kein Treffer für `ProseMirror-selectednode`). Ein selektiertes Bild ist damit **weiterhin optisch nicht** vom unselektierten unterscheidbar — bestätigter, unverändert offener Befund aus der Vorfassung. |
| 8 | `src/formats/docx/writer.ts` › `imageParagraphXml` (Zeile 75–…) | `Number(node.attrs?.width ?? 300)` / `?? 200`, EMU-Umrechnung (`px/96*914400`), Ausgabe als `<wp:extent cx cy>` (Zeile 95). **Writer bereits korrekt**: liegt eine Größe am Node vor, wird sie exakt geschrieben. `?? 300`/`?? 200` fängt nur `null`/`undefined`, **nicht** `0` ab. |
| 9 | `src/formats/docx/reader.ts` › `decodeDrawingOrPict` (Zeile 143ff.) | Liest weiterhin **nur** die Bild-Relationship und `wp:docPr/@name` (→ `alt`); **`<wp:extent>` wird nirgends gelesen** ⇒ jedes importierte Bild erhält `width: null, height: null`. **Bestätigter, unverändert bestehender Datenverlust-Bug**, unabhängig von jeder UI (siehe 0.1). |
| 10 | `src/formats/odt/reader.ts` › `frameToBlocks` (Zeile 232ff.) | Liest `draw:image/@xlink:href` und `draw:name` (→ `alt`); **`svg:width`/`svg:height` werden nirgends gelesen** — analoge Kernursache wie DOCX. |
| 11 | `src/formats/odt/writer.ts` › `blockToOdt`, Fall `'image'` (Zeile 185–188) | `node.attrs?.width ? `${width}px` : '6cm'`, analog `height` → `'4cm'`; Ausgabe als `<draw:frame svg:width svg:height text:anchor-type="as-char">`. Bereits korrekt für Nodes **mit** Größe, Default nur mangels Größe. |
| 12 | `src/formats/docx/imageCollector.ts` / `src/formats/odt/imageCollector.ts` | Dedupliziert ausschließlich über die Daten-URL, **nicht** über die Größe — mehrere Nodes mit gleichem `src`, aber unterschiedlichem `width`/`height` teilen sich eine Binärdatei und erhalten je Node korrekte `wp:extent`/`svg:width`+`svg:height`. Bereits architektonisch korrekt, beim Bau der Resize-Funktion **nicht** zu ändern. |
| 13 | `src/formats/docx/__tests__/roundtrip.test.ts` (Zeile 323–330) | Test „preserves an embedded image …" setzt im Eingabe-Node `width: 100, height: 80` (Zeile 325), **prüft aber ausschließlich `image.type`** (Zeile 328) — `width`/`height` werden im Ergebnis **nie** assertet. Klassischer „False-Confidence"-Test, deckt den Reader-Bug **nicht** auf. Frisch nachgelesen, unverändert gegenüber der Vorfassung. |
| 14 | `src/formats/odt/__tests__/roundtrip.test.ts` (Zeile 356–364) | Äquivalenter Test setzt **gar kein** `width`/`height` im Input (Zeile 357), prüft nur `src`/`alt`. Größe hier also noch unsichtbarer als bei DOCX. |
| 15 | `src/formats/shared/__tests__/zipInspect.ts` | Bereits vorhandener Roh-ZIP-Helfer (`readZipEntryInfo`) für Byte-Ebenen-Prüfungen. Für die in Abschnitt 4 geforderte unabhängige Roh-XML-Prüfung ist stattdessen — wie in `tests/e2e/table-merge-split.spec.ts`, `docx.spec.ts`, `odt.spec.ts` bereits etabliert — direkt `JSZip.loadAsync(buffer)` gegen `word/document.xml`/`content.xml` zu verwenden (Textsuche nach `<wp:extent`/`<draw:frame`), **nicht** der eigene Reader — sonst könnten sich Schreib- und Lesefehler gegenseitig verdecken. |
| 16 | `playwright.config.ts` (Zeile 27–50) | Fünf Projekte: **Desktop Chrome**, **Mobile** (Pixel 7, Touch), **Tablet** (iPad Mini) laufen die volle `tests/e2e`-Suite; zusätzlich zwei auf `clipboard*.spec.ts` beschränkte Browser-Projekte (Safari/Firefox, für dieses Feature irrelevant). Jede neue Bedienoberfläche muss auf den ersten drei nachgewiesen werden. |

### 0.1 Kernbefund (unverändert gegenüber der Vorfassung, hier bestätigt)

Zwei voneinander unabhängige Lücken, **beide** Voraussetzung für ein abnahmefähiges
Feature:

1. **UI fehlt vollständig** (Fundstellen 3–4): kein Eigenschaften-Panel, keine
   Ziehpunkte, kein Command.
2. **Reader-Datenverlust-Bug** (Fundstellen 9–10, unabhängig von jeder UI): Die
   Originalgröße eines beim Import gelesenen Bildes wird von **keinem** der beiden Reader
   aus der Datei übernommen und geht beim nächsten Export **stillschweigend** verloren —
   ersetzt durch einen hartkodierten Default (DOCX 300×200 px, ODT 6×4 cm), **auch wenn
   nie jemand eine Größenänderung vorgenommen hat**. Ohne Behebung dieses Bugs kann keine
   noch so gut gebaute Resize-UI die Rundreise-Anforderung (Abschnitt 4) erfüllen — eine
   Datei mit einem 4000×3000-px-Foto (4:3), unbearbeitet geöffnet und wieder gespeichert,
   enthält danach ein auf 300×200 px (3:2) verzerrtes Bild, allein durch Öffnen-und-
   Speichern.

---

## 1. Bedienelemente (Soll)

Referenzverhalten Word/LibreOffice/Google Docs: Ziehgriffe an den Ecken/Kanten des
ausgewählten Bildes; zusätzlich (Google Docs, Bildformatierungs-Seitenleiste) numerische
Eingabefelder. Da reines Ziehen für Tastatur- und für viele Touch-Nutzer:innen nicht
zuverlässig erreichbar ist, ist die numerische Eingabe **kein optionales Extra, sondern
die verbindliche, gleichwertige Alternative**.

| # | Element | Ort | Soll-Verhalten |
|---|---|---|---|
| 1 | Bild-Eigenschaften-Panel „Größe" | Erscheint **ausschließlich**, sobald ein `image`-Node als `NodeSelection` selektiert ist (Klick auf das Bild oder Tastaturselektion, siehe 2.1) — analog zur kontextabhängigen Kopieren-Werkzeugleiste realer Textverarbeitungen. Nicht dauerhaft in der Haupt-Toolbar sichtbar. | Enthält: zwei numerische Eingabefelder „Breite"/„Höhe" (Einheit sichtbar, 2.6), eine Checkbox „Seitenverhältnis beibehalten" (Default: **aktiviert**), einen Button „Auf Originalgröße zurücksetzen" (nur aktiv, wenn eine Originalgröße bekannt ist, 2.5/3.4). |
| 2 | Eingabefeld „Breite" (**verbindliche Tastatur-/Touch-Alternative**) | Teil von Element 1 | Numerisch, `<input type="number">` oder gleichwertig, per **Tab** erreichbar, Bestätigung per **Enter oder Blur**. Bei aktiver Seitenverhältnis-Sperre wird „Höhe" proportional mitgeführt (2.3). Dies ist der **garantierte** Weg, eine Bildgröße **ohne Maus und ohne feinmotorische Ziehgeste** zu ändern — funktioniert identisch auf Desktop, Tablet und Mobile. |
| 3 | Eingabefeld „Höhe" | Teil von Element 1 | Analog zu „Breite", umgekehrte Kopplung bei aktivem Lock. |
| 4 | Ziehpunkte (Resize-Handles) am selektierten Bild | Neuer `image`-NodeView (aktuell nicht vorhanden, Befund 0/4) | Acht sichtbare Griffe (vier Ecken, vier Seitenmitten). **Eckgriff** → Breite und Höhe gemeinsam, Seitenverhältnis **immer** beibehalten (unabhängig von der Checkbox — Standardverhalten aller Referenzanwendungen). **Seitengriff** → nur die jeweilige Dimension, Seitenverhältnis bewusst **nicht** gehalten. Zusätzlicher, nicht ersetzender Weg zu Element 2/3 — niemals der **einzige** Weg. |
| 5 | Touch-Zielgröße der Griffe | Teil von Element 4 | **Sichtbare** Griffgröße darf klein/dezent bleiben (analog Word/LibreOffice), die **Trefferfläche** (`hit area`, z. B. per größerem transparentem Hüllelement oder `padding`) muss ≥ 40×40 px betragen (`specs/UX-INVARIANTEN.md` §1 Nr. 4). |
| 6 | Live-Vorschau während des Ziehens | Teil von Element 4 | Bildgröße wird sichtbar live aktualisiert; die Eingabefelder aus Element 1 spiegeln die laufenden Werte synchron mit. |
| 7 | Button „Auf Originalgröße zurücksetzen" | Teil von Element 1 | Setzt `width`/`height` exakt auf die beim Einfügen/Import ermittelte Originalgröße zurück (2.5). Ohne bekannte Originalgröße **deaktiviert** mit sprechendem `title` (3.5), nicht wirkungslos klickbar. |
| 8 | Sichtbare Auswahlmarkierung | Editor-Fläche | Ein ausgewähltes Bild muss optisch erkennbar sein (Rahmen/Outline), **bevor** Panel/Griffe überhaupt sinnvoll bedienbar sind — bereits als offener Befund aus `bild-loeschen-req.md` bekannt (R1), hier erneut bestätigt (Befund 0/7) und für **dieses** Feature verbindlich vorausgesetzt: Ohne sichtbares Feedback ist nicht erkennbar, **welches** Bild sich gerade ändert, wenn mehrere Bilder im Dokument stehen. |
| 9 | Tastaturaktivierung von Panel-Buttons (Enter **und** Leertaste) | Teil von Element 1 | Wie im Vorgänger-Feature verbindlich gelöst (`specs/tabelle-struktur-bearbeiten-req.md` §1 Nr. 8, `TableOpButton`-Muster `Toolbar.tsx` Zeile 228–256: `onMouseDown`+`preventDefault()` **plus** `onClick`): der „Zurücksetzen"-Button muss diesem Muster folgen, nicht nur `onMouseDown` allein verwenden. |
| 10 | (Bewusste Abgrenzung) Größenanzeige ohne Selektion | — | Es gibt **keine** dauerhafte Größenanzeige, solange kein Bild selektiert ist; kein Hover-Tooltip zwingend. Kein Blocker, nur zur Klarheit dokumentiert. |
| 11 | (Bewusste Abgrenzung) Eigener Menüpunkt/Dialog | — | Es gibt **keinen** zusätzlichen Menüpunkt „Format → Grafik formatieren…" (kein Dialog mit Zuschneiden/Textumbruch/Farbkorrektur — separate Backlog-Einträge) und **keine** eigene Tastenkombination zum Fokussieren der Größenfelder (kein Referenzverhalten in Word/LibreOffice, das ein Nachbau rechtfertigt). |

---

## 2. Gewünschtes Verhalten im Detail

### 2.1 Bild auswählen
- Klick auf ein eingefügtes Bild erzeugt eine `NodeSelection` auf genau diesem Node
  (Standardverhalten, Befund 0/1). Tastaturweg: Cursor unmittelbar neben das Bild
  bewegen, `ArrowLeft`/`ArrowRight` (= `selectNodeBackward`/`-Forward` aus `baseKeymap`)
  wählt das Bild als `NodeSelection` — bereits von `bild-loeschen-req.md` als
  barrierefrei bestätigter Weg.
- Nur bei aktiver Bild-`NodeSelection` erscheinen Panel (1.1) und Ziehpunkte (1.4).
- Klick neben das Bild / auf einen anderen Node hebt die Auswahl auf; Panel und
  Ziehpunkte verschwinden **sofort**, keine „Geister"-Anzeige.

### 2.2 Größenänderung per Eingabefeld
1. Bild auswählen, im Feld „Breite" oder „Höhe" neuen Wert eintippen, mit **Enter oder
   Blur** bestätigen.
2. Bestätigung ruft ein neues Command `setImageSize(width, height)` (Muster: `setAlign`,
   per `tr.setNodeAttribute`) auf die aktuell selektierte `image`-Node auf. Das Command
   wirkt **ohne** `empty`-Guard wie `applyMarkColor` — die Selektion ist hier per
   Definition der Bild-Node selbst und daher nie „leer".
3. Änderung erfolgt **sofort** bei Bestätigung, kein separater „Übernehmen"-Button.
4. **View-Sync (Pflicht):** In derselben Transaktion wird — analog zum bereits etablierten
   `runTable`-Muster (`Toolbar.tsx` Zeile 48–51, `tr.scrollIntoView()`) — sichergestellt,
   dass das geänderte Bild im sichtbaren Bereich bleibt, insbesondere wenn eine
   Größenzunahme es aus dem aktuellen Scrollausschnitt schieben würde.
5. Die `NodeSelection` bleibt nach der Bestätigung bestehen (damit eine zweite
   Größenänderung oder ein Löschen ohne erneutes Klicken möglich ist) — mit der in 2.10
   verbindlich geforderten Absicherung gegen das „Tippen ersetzt das Bild"-Risiko.

### 2.3 Größenänderung per Ziehpunkte
1. **Eckgriff:** Breite und Höhe ändern sich gemeinsam, Seitenverhältnis wird **immer**
   beibehalten (unabhängig von der Checkbox aus 1.1).
2. **Seitengriff:** Nur die betroffene Dimension ändert sich; Seitenverhältnis wird
   bewusst **nicht** gehalten.
3. Während des Ziehens wird die Größe live sichtbar aktualisiert; die endgültige
   Transaktion (und damit **ein** Undo-Schritt) wird erst beim Loslassen
   (`mouseup`/Touch-Ende) geschrieben — nicht bei jedem `mousemove` (sonst ein
   Undo-Schritt pro Pixel, siehe 3.7).
4. **Zoom-Korrektur (Pflicht, neu gegenüber der Vorfassung — Befund 0/6):** Die
   Bewegungsdifferenz aus `mousemove`/`touchmove` liegt in **Bildschirm-Pixeln** vor, das
   Blatt kann aber über die seit der Vorfassung hinzugekommene Zoom-Funktion
   (`specs/dokument-darstellung-req.md` §2.2, `WordEditor.tsx` `transform: scale(zoom)`)
   verkleinert/vergrößert dargestellt sein. Die Ziehlogik muss die Bewegungsdifferenz
   durch den aktuellen `zoom`-Faktor teilen, bevor sie auf `width`/`height` (ungezoomte
   CSS-Pixel) angewendet wird — sonst ändert dieselbe Zieh-Geste je nach Zoomstufe eine
   sichtbar andere Bildgröße (3.20).
5. Ziehen über den verfügbaren Bereich hinaus wird begrenzt (3.2), nicht in ein
   unbegrenzt wachsendes/schrumpfendes Bild.

### 2.4 Referenz-Seitenverhältnis (welche Ratio wird gekoppelt?)
- Die proportionale Kopplung (Feld-Eingabe bei aktivem Lock, 2.2; jede Eckgriff-Geste,
  2.3.1) verwendet das **aktuelle** Verhältnis des Node zum Zeitpunkt, an dem die
  Eingabe/Geste beginnt — **nicht** das native (`naturalWidth`/`naturalHeight`)
  Verhältnis. Ein bereits bewusst über einen Seitengriff verzerrtes Bild wird unter
  Beibehaltung seiner **aktuellen** Verzerrung weiterskaliert, nicht eigenmächtig auf das
  native Verhältnis zurückgeschnappt.
- Bei der Ziehgeste wird die Referenz-Ratio **einmal bei Gestenbeginn eingefroren** und
  über die gesamte Geste konstant gehalten (kein Neuberechnen aus bereits gerundeten
  Zwischenwerten bei jedem `mousemove` — sonst kumulativer Rundungsdrift bei langem
  Ziehen).
- Nur unmittelbar nach „Auf Originalgröße zurücksetzen" (2.5) sind aktuelles und natives
  Verhältnis wieder identisch.

### 2.5 Zurücksetzen auf Originalgröße
- Solange ein Bild nicht manuell verändert wurde, sind aktuelle Größe und Originalgröße
  identisch (Button sichtbar, aber deaktiviert).
- Nach mindestens einer Änderung stellt der Button die beim Einfügen/Import ermittelte
  Originalgröße exakt wieder her (ein Undo-Schritt).
- Die Originalgröße wird getrennt von `width`/`height` vorgehalten — als zusätzliche,
  **nicht editierbare** und **nicht in DOM/Export serialisierte** Node-Attribute
  (z. B. `naturalWidth`/`naturalHeight`, neu im Schema, 3.3).
- **Entscheidung (verbindlich, ersetzt die offene Frage 6.4.3 der Vorfassung):** Die
  Originalgröße ist ein rein **editor-interner, sitzungslokaler** Wert und wird **nicht**
  in DOCX/ODT exportiert (weder OOXML noch ODF sehen ein Feld dafür vor, ein
  Zweckentfremden bestehender Felder wäre nicht standardkonform). Konsequenz, die
  **verpflichtend sichtbar zu machen** ist: Nach jedem Speichern-und-erneut-Öffnen
  (auch ohne Formatwechsel) gilt die beim **Reimport** vorgefundene Größe als neue
  Originalgröße — der „Zurücksetzen"-Button verliert nach einem Reimport seine Wirkung
  auf eine davor im Editor vorgenommene Änderung (das ist unvermeidbar, sobald der
  In-Memory-Zustand verlassen und neu geladen wird, und konsistent mit dem
  Datenschutz-Grundprinzip „nichts wird über die Sitzung hinaus persistiert",
  `specs/UX-INVARIANTEN.md` §1 Nr. 5). Kein stiller Fehlschlag: Der Button bleibt dann
  korrekt **deaktiviert** (2.5, Grenzfall 3.4), er zeigt nicht fälschlich eine falsche
  „Originalgröße" an.

### 2.6 Einheiten und Umrechnung
- Intern (Schema `width`/`height`) wird durchgehend in **CSS-Pixeln bei 96 dpi**
  gerechnet — konsistent zur DOCX-Writer-Umrechnung und zu `pageLayout.ts`
  (`PX_PER_MM = 96/25.4`).
- **Entscheidung (verbindlich, ersetzt die offene Frage 6.4.1 der Vorfassung): Anzeige in
  den Eingabefeldern in Zentimetern (cm), auf eine Nachkommastelle gerundet.** Begründung:
  Anders als bei Schriftgröße (`specs/schriftgroesse-waehlen-req.md`, dort **eine**
  einzige formatübergreifend native Einheit „pt") gibt es bei Bildgröße keine gemeinsame
  native Einheit — aber die Seitengeometrie der App ist bereits durchgängig
  metrisch/cm-basiert (A4 210×297 mm, Rand 2,5 cm, `pageGeometry.ts`,
  `specs/dokument-darstellung-req.md` §2.1) und für Nutzer:innen ist „wie groß ist das
  Bild im Verhältnis zur Seite" die naheliegende mentale Einheit — nicht Pixel. Die
  Umrechnung zum internen px-Modell erfolgt beim Anzeigen/Bestätigen
  (`px = cm / 2.54 * 96`), **keine** sichtbare Rundungsabweichung zwischen angezeigtem
  Feldwert und intern gespeicherter Modellgröße darf entstehen (sichtbare Korrektur im
  Feld nach Bestätigung, wie bei `specs/schriftgroesse-waehlen-req.md`).
- DOCX-Export: px→EMU bereits vorhanden, muss nur mit **echten** (korrekt gelesenen bzw.
  gesetzten) Werten statt dem 300×200-Default gefüttert werden.
- ODT-Export: aktuell wird `width`/`height` (px) als `${…}px`-Suffix geschrieben.
  **Entscheidung (verbindlich, ersetzt die offene Frage 6.4.2):** Umstellung auf `cm`,
  konsistent mit dem bereits für die Seitengeometrie genutzten `mmToCm`-Helfer in
  `odt/writer.ts` und geprüft gegen den bereits vorhandenen RelaxNG-Validator
  (`odt/__tests__/external-validation.test.ts`) — `cm` ist der intern bereits
  konsistentere und interoperabel unstrittigere Weg als der aktuelle `px`-Fallback.

### 2.7 Größe größer als die verfügbare Seiten-/Zellbreite (Entscheidung, ersetzt offene Frage 6.4.4)
- **Entscheidung (verbindlich):** Ein Bild darf explizit auf eine Breite gesetzt werden,
  die die verfügbare Inhaltsbreite (`PAGE_CONTENT_WIDTH_PX` bzw. die Zellbreite in einer
  Tabelle) übersteigt — genau wie in Word/LibreOffice, wo ein Bild bewusst über den
  Satzspiegel hinaus vergrößert werden kann. Die bestehende CSS-Regel `.ProseMirror img {
  max-width: 100%; height: auto }` (`index.css` Zeile 39–42) darf ein **explizit
  gesetztes** `width`/`height` **nicht mehr** unsichtbar auf die verfügbare Breite
  zusammenstauchen, ohne dass Eingabefeld und tatsächliche Darstellung noch
  übereinstimmen — das war die in der Vorfassung offen gelassene Diskrepanz (dortiger
  Grenzfall 4.9/6.4.4) und wird hiermit entschieden: **die Eingabefelder und die
  sichtbare Darstellung zeigen immer denselben Wert**, ein zu breites Bild darf die
  Editor-Seite sichtbar überragen bzw. innerhalb des Blattes horizontal scrollbar werden
  (konsistent mit dem bereits für „sehr breite Tabelle" getroffenen Präzedenzfall,
  `specs/dokument-darstellung-req.md` §2.1) — es darf aber **nicht** die A4-Blattbreite
  selbst sprengen oder das Gesamtlayout horizontal überlaufen lassen
  (`specs/UX-INVARIANTEN.md` §1 Nr. 4).

### 2.8 Untergrenze/Obergrenze (Entscheidung, ersetzt die in der Vorfassung nur vage benannten Werte)
- **Untergrenze: 8 px** in jeder Dimension. Zweck ist **ausschließlich** der Schutz gegen
  0/negative/kollabierte Bilder (3.2) — **nicht** eine Mindestgröße für „schön aussehende"
  Bilder. Ein bewusst auf 8×8 px verkleinertes Bild bleibt gültig, auswählbar (per Klick
  knapp, aber per Tastaturweg 2.1 immer) und über den „Zurücksetzen"-Button (1.7)
  wiederherstellbar.
- **Obergrenze: 3000 px** in jeder Dimension (deutlich über jeder sinnvollen
  Bildschirm-/Druckgröße, verhindert einen absichtlich oder versehentlich auf z. B.
  50 000 px gesetzten Wert, der Editor-Performance und Exportgröße unnötig belastet).
  Eingabe darüber wird auf die Obergrenze **geklemmt**, mit **sichtbarer Korrektur** im
  Feld (kein stilles Verwerfen).
- Beide Grenzen gelten **im Command**, nicht erst im Export-Writer (siehe 3.3, 3.18).

### 2.9 Undo/Redo
- Jede abgeschlossene Größenänderung (Feld-Bestätigung **oder** komplette Ziehgeste von
  Gestenbeginn bis -ende) ist genau **ein** Undo-Schritt.
- Undo stellt exakt die vorherige Breite/Höhe wieder her, Redo die geänderte — unabhängig
  vom gewählten Bedienweg (Feld/Ziehpunkt).
- Funktioniert in gemischten Sequenzen (Bild einfügen → Größe ändern → Text davor/danach
  → mehrfach Undo) in korrekter umgekehrter Reihenfolge.

### 2.10 Tippen unmittelbar nach abgeschlossener Größenänderung (verbindliche Anforderung, kein optionaler Punkt)
Da die `NodeSelection` nach jeder abgeschlossenen Größenänderung bewusst bestehen bleibt
(2.2.5), besteht dasselbe Risiko, das `specs/bild-einfuegen-req.md` §3.12/§2.1.4 bereits
für den **Einfüge**-Moment beschreibt: ProseMirrors Standardverhalten für Texteingabe bei
aktiver `NodeSelection` ist, den selektierten Node zu **ersetzen**, nicht Text danach
einzufügen. Bestätigt eine Nutzerin eine neue Breite mit Enter und tippt danach — im
naheliegenden „Größe angepasst, jetzt weiterschreiben"-Workflow — ohne erneuten Klick
weiter, träfe der nächste Tastendruck auf dieselbe Gefahr, nur an einem **zweiten,
eigenen Auslösezeitpunkt** (Abschluss der Größenänderung, nicht nur Abschluss des
Einfügens).

**Anforderung (verbindlich, keine Option mehr): Ein einzelnes getipptes Zeichen darf ein
Bild unmittelbar nach einer abgeschlossenen Größenänderung niemals ersetzen.** Wie genau
das technisch gelöst wird (z. B. Zeicheneingabe bei aktiver Bild-`NodeSelection`
verschiebt die Selektion zuerst hinter das Bild, bevor der Text eingefügt wird), ist
Sache der Umsetzung — **ob**, nicht **ob überhaupt**, ist hier entschieden. Delete/
Backspace bleiben davon unberührt die vorgesehene, korrekte Lösch-Geste
(`specs/bild-loeschen-req.md`) — nur die **Ersetzung durch getippten Text**, nicht das
absichtliche Löschen, ist der zu verhindernde Fehlerfall. Falls diese Absicherung als
**gemeinsamer** Editor-Guard (statt zweimal unabhängig in `bild-einfuegen` und
`bild-groesse-aendern`) gebaut wird, ist das ausdrücklich zulässig und sogar
wünschenswert (eine Lösung, zwei Auslöser) — es muss aber für **beide** Auslöser
nachweislich wirken, nicht nur für einen.

### 2.11 Bild in einer Tabellenzelle
- Größenänderung funktioniert identisch zum Haupttext. Die verfügbare Breite als
  Referenz für 2.8/3.6 orientiert sich an der **Zellbreite**, nicht der vollen
  Seitenbreite.

---

## 3. Grenzfälle

1. **Ungültige Eingabe** (Text, leeres Feld bei Enter): verworfen, vorherige gültige
   Größe bleibt, kein Absturz, **kein `NaN`** im Modell — hängt an der Typ-Normalisierung
   aus 3.16.
2. **Extreme Werte** (0, negativ, > 3000 px): auf die Grenzen aus 2.8 geklemmt, mit
   sichtbarer Korrektur im Feld, nie ein `NaN`/`0`/negativer Wert im Modell.
3. **Eckgriff bis auf/unter die Untergrenze gezogen**: auf 8 px geklemmt, kein
   invertiertes/negatives Bild, kein Einfrieren der Geste.
4. **„Zurücksetzen" ohne bekannte Originalgröße** (Fremddatei-Import, oder nach einem
   zwischenzeitlichen Speichern-und-Reimport, siehe 2.5): Button deaktiviert/ausgeblendet,
   nicht wirkungslos klickbar oder auf einen falschen Default zurückfallend.
5. **Mehrere Bilder gleichzeitig selektiert:** ProseMirror erlaubt standardmäßig nur eine
   einzelne Node als `NodeSelection` — zu verifizieren, dass eine Mehrfachauswahl im
   aktuellen Editor überhaupt nicht entsteht; falls doch, erscheinen Panel/Ziehpunkte
   **nicht** statt eines undefinierten Verhaltens.
6. **Bild in einer Tabellenzelle** (2.11): Verhalten identisch zum Haupttext, verfügbare
   Breite = Zellbreite; praktisch zu verifizieren, nicht nur theoretisch anzunehmen.
7. **Ziehgeste erzeugt viele Zwischenzustände:** **kein** Undo-Schritt pro
   Mausbewegung (2.3.3) — mit gezieltem Test nachweisen.
8. **Mehrere Bilder mit identischem `src`, unterschiedlicher Größe:** bei Export **eine**
   Binärdatei, aber zwei unabhängige `wp:extent`/`svg:width`+`svg:height` (bereits
   architektonisch vorbereitet, Befund 0/12, mit Testfall zu bestätigen).
9. **Zusammenspiel mit `.ProseMirror img { max-width:100%; height:auto }`:** durch die
   Entscheidung in 2.7 aufgelöst — Feldwert und Darstellung stimmen immer überein, auch
   wenn das Bild dadurch sichtbar breiter als die Seite wird.
10. **ODT-Einheiten-Interoperabilität:** Nach der Entscheidung in 2.6 (`cm` statt `px`)
    gegen den vorhandenen RelaxNG-Validator **und** gegen einen realen
    LibreOffice-Reimport zu bestätigen.
11. **Cross-Format-Rundreise mit Rundungsdifferenzen** (px→EMU→px bzw. px→cm→px): nach
    einer Konvertierung keine sichtbar falsche Größe; nach mehreren eine minimale
    Sub-Pixel-Abweichung tolerierbar (4.5); ein **kumulativer** Drift (Bild wird mit
    jedem Zyklus sichtbar kleiner/größer) ist **Defekt**.
12. **Größenänderung direkt nach dem Selection-Sync-Szenario** (Alles auswählen →
    Formatierung → Klick zum Neupositionieren): Enthält die Selektion ein Bild, darf eine
    anschließende Größenänderung an einem beliebigen Bild keinen Inhaltsverlust an
    anderer Stelle auslösen.
13. **Reale Fremddatei mit mehreren, unterschiedlich großen Bildern:** Nach Behebung des
    Reader-Bugs (0.1) muss **jedes** Bild seine individuelle Originalgröße zeigen, nicht
    auf einen Default vereinheitlicht.
14. **Sehr kleines Icon-Bild** (z. B. 16×16 px): Wird beim **Einfügen** nicht künstlich
    hochskaliert (Sache von `bild-einfuegen-req.md` §2.4) — für **dieses** Feature
    relevant ist nur: ein solches Bild bleibt über die Eingabefelder/Ziehpunkte normal
    änderbar, die Untergrenze aus 2.8 (8 px) liegt bewusst **unterhalb** typischer
    Icon-Maße, damit ein 16×16-Icon nicht am Verkleinern gehindert wird.
15. **Bild ohne echte Bilddaten (defekte/leere Datei):** außerhalb des Geltungsbereichs
    dieser Datei (Sache von `bild-einfuegen-req.md`) — hier nur zu verifizieren, dass ein
    bereits im Dokument befindliches, defekt dargestelltes `<img>` trotzdem eine
    `NodeSelection` erlaubt und die Größenfelder nicht abstürzen (z. B. bei fehlendem
    `naturalWidth`, siehe 3.17).
16. **Typ-Inkonsistenz `width`/`height` (String vs. Zahl):** `parseDOM.getAttrs` liefert
    für ein aus HTML geklebtes Bild einen **String** (`"100"`) oder `null`, während
    `setImageSize` **Zahlen** setzt. Die Implementierung muss auf einen einheitlichen Typ
    (`number | null`) normalisieren (`validate` + numerische Umwandlung in `parseDOM`),
    damit weder ein String-Wert in Rundreise-Assertions gegen eine Zahl scheitert noch
    ein nicht-numerischer String zu `NaN` führt.
17. **Editor-interne Attribute dürfen nicht ins `<img>`/den Export lecken:** `toDOM` gibt
    aktuell `{ src, alt, width, height }` aus. `naturalWidth`/`naturalHeight` (2.5) dürfen
    dort **nicht** ergänzt werden (sonst ungültige `<img naturalwidth …>`-Attribute, die
    zusätzlich bei erneutem `parseDOM` ungewollt zurückgelesen werden könnten). Ebenso
    dürfen sie in keiner der beiden Export-Serialisierungen auftauchen.
18. **Writer-Fallback `?? 300` fängt `0` nicht ab:** `Number(node.attrs?.width ?? 300)`
    liefert bei `width === 0` den Wert `0` (nicht 300), weil `??` nur `null`/`undefined`
    abfängt → `cx=0` → unsichtbares 0-breites Bild im Export. Die Untergrenze (2.8) muss
    deshalb bereits im Command durchgesetzt werden, sodass `0` nie im Modell landet.
19. **Referenz-Seitenverhältnis nach Verzerrung** (2.4): Bild über einen Seitengriff
    verzerren (z. B. auf 3:1), Lock aktivieren, Breite über das Feld ändern → Höhe folgt
    dem **aktuellen** (verzerrten) Verhältnis, nicht dem nativen — kein sichtbarer
    Formsprung.
20. **Ziehgeste unter aktivem Zoom** (Befund 0/6, neu gegenüber der Vorfassung): Bei
    50 %-Zoom und bei 200 %-Zoom (`specs/dokument-darstellung-req.md` §2.2 Zoom-Stufen)
    dieselbe Bildschirm-Zieh-Distanz ausführen → resultierende Modell-Größenänderung ist
    unter **jedem** Zoomfaktor gleich (bezogen auf die ungezoomte Modellgröße) — **nicht**
    je nach Zoomstufe unterschiedlich stark. Mit dediziertem Test je Zoomstufe
    abzusichern (5.2.7), da dies ein reales, seit dem Zoom-Feature neu entstandenes
    Risiko ist, kein theoretischer Fall.
21. **Ziehpunkte auf Touch-/Mobilgeräten** (`playwright.config.ts` Projekte Mobile/
    Tablet): Die acht Griffe sind für Mauspräzision ausgelegt. **Anforderung:** Entweder
    funktionieren sie zusätzlich per `touchstart`/`touchmove`/`touchend` mit
    vergrößerter, unsichtbarer Trefferfläche (1.5) — **oder** es wird explizit
    dokumentiert, dass auf Touch-/Mobile-Viewports die Eingabefelder (1.2/1.3) der
    garantierte, unterstützte Weg sind. Das gewählte Verhalten ist zu verifizieren, nicht
    stillschweigend dem Zufall zu überlassen (deckt sich mit der
    Barrierefreiheits-Anforderung, dass Größe nie **nur** per Maus/Ziehen änderbar sein
    darf).
22. **Konflikt mit `image`-Node `draggable: true`** (`schema.ts` Zeile 66): Ein
    `mousedown`/`pointerdown` auf einem Ziehpunkt muss die native
    ProseMirror-Drag-to-Move-Geste unterbinden (`stopPropagation`/`preventDefault` bzw.
    `draggable={false}` auf dem Griff-Element), sonst wird statt der Größenänderung das
    Bild verschoben. Zusätzlich zu verifizieren: Drag-to-Move an einer griff-freien
    Stelle des Bildes funktioniert unverändert (keine Regression).
23. **Tippen unmittelbar nach abgeschlossener Größenänderung** (2.10): über Feld-Enter
    **und** über Ziehgeste-Ende separat zu prüfen — beide Auslösewege dürfen das Bild
    nicht durch das nächste getippte Zeichen ersetzen lassen.
24. **Fehlendes visuelles Auswahl-Feedback** (Befund 0/7): `src/index.css` enthält
    weiterhin **keine** `.ProseMirror-selectednode`-Regel, obwohl ProseMirror diese
    Klasse bereits automatisch bei einer Bild-`NodeSelection` setzt. Ohne eine passende
    CSS-Regel ist nicht erkennbar, welches Bild sich das Panel/die Griffe gerade
    beziehen — besonders bei mehreren Bildern im Dokument (Grenzfall 8) ein praktisch
    relevanter Bedienbarkeits-Mangel. Muss vor Abnahme entweder als Teil dieser Funktion
    mitgeliefert oder nachweislich an eine andere Stelle delegiert werden (z. B. den
    neuen `image`-NodeView selbst, der ohnehin gebaut wird) — nicht stillschweigend
    offenbleiben.
25. **(Abgrenzung, geprüft) Bilder in Kopf-/Fußzeile:** `documentModel.ts` modelliert
    `header`/`footer` als eigenständiges `ProseMirrorJSON | null` desselben Schemas — ein
    Bild dort ist strukturell nicht ausgeschlossen. Da Kopf-/Fußzeilen-Bearbeitung selbst
    noch keine UI hat (`kopfzeile-bearbeiten`/`fusszeile-bearbeiten`), ist Bild-Resize
    dort **nicht** Bestandteil dieser Anforderung — hier nur dokumentiert, damit die
    Lücke bei Fertigstellung jener Features nicht als „durch `bild-groesse-aendern`
    bereits abgedeckt" missverstanden wird.
26. **Bild ohne intrinsische Größe** (z. B. `naturalWidth`/`naturalHeight` beim Laden aus
    irgendeinem Grund nicht ermittelbar, siehe 3.15): „Auf Originalgröße zurücksetzen"
    bleibt deaktiviert (analog 3.4), Eingabefelder/Ziehpunkte funktionieren dennoch
    normal mit der aktuellen `width`/`height`.
27. **Mehrfaches Resizen in Folge** (Feld → Ziehpunkt → Feld → Ziehpunkt, ohne
    Zwischenaktion): jede Änderung ein eigener Undo-Schritt, keine
    Zwischenzustands-Verschmelzung, Endzustand entspricht exakt der letzten Eingabe.
28. **Resize, dann Undo, dann Redo, dann erneutes Resizen:** korrekte Endgröße, keine
    „Zombie"-Werte aus einem zwischenzeitlich verworfenen Redo-Zweig.

---

## 4. Rundreise / Regressionsschutz

Grundprinzip (`FEATURE-SPEC-DOCX-ODT.md`): Datei A mit einem/mehreren Bildern bekannter
Größe hochladen bzw. im Editor mit definierter Größe erzeugen → **unverändert**
exportieren → erneut importieren → Ergebnis entspricht inhaltlich **und in der
Bildgröße** exakt A. Das schließt ausdrücklich den Fall ein, dass **gar keine** manuelle
Größenänderung stattfand — reines Hochladen und unverändertes Re-Exportieren darf die
Bildgröße **nicht** verändern (aktuell laut 0.1 **nicht** erfüllt, zentraler zu
behebender Befund). Export-Prüfung erfolgt über einen **unabhängigen** Parser bzw.
Roh-XML-Assertion via `JSZip.loadAsync` gegen `word/document.xml`/`content.xml` (Muster:
`tests/e2e/table-merge-split.spec.ts`, `docx.spec.ts`, `odt.spec.ts`), **nicht nur** über
den eigenen Reader — sonst könnten sich Schreib- und Lesefehler gegenseitig verdecken.

### 4.1 Baseline (muss vor und nach jeder Änderung grün bleiben)
- Bestehende Bild-Rundreise (`docx/__tests__/roundtrip.test.ts` „images", Zeile 323ff.;
  ODT-Äquivalent Zeile 356ff.; `tests/e2e/roundtrip-fidelity.spec.ts`,
  `export-error-handling.spec.ts`) bleibt grün — insbesondere darf das Ergänzen von
  `width`/`height`-Assertions (4.6, DoD Punkt 9) bestehende, bereits grüne Tests nicht
  verändern, nur erweitern.

### 4.2 DOCX
1. DOCX mit Bild bekannter Größe (`wp:extent` = 500×300 px) hochladen, **ohne**
   Bearbeitung exportieren, reimportieren → Größe im wiederhergestellten `image`-Node
   ist exakt 500×300 px (nicht der 300×200-Default) — **Regressionstest für den
   Kernbefund aus 0.1**.
2. Bild über Toolbar einfügen, über das Eingabefeld auf z. B. 640×480 px setzen, als
   DOCX exportieren → per `JSZip.loadAsync` gegen `word/document.xml` verifiziert:
   `<wp:extent>` entspricht exakt der in EMU umgerechneten Zielgröße.
3. Dieselbe Datei erneut importieren → sichtbar identische Breite/Höhe.
4. Größe über **Ziehpunkte** (nicht Feld) ändern, exportieren, reimportieren → Größe wie
   nach dem Ziehen.
5. Reale Fremddatei mit **mehreren unterschiedlich großen** Bildern importieren,
   unverändert exportieren, reimportieren → jedes Bild behält individuelle
   Originalgröße.
6. Cross-Format: ODT mit Bild bekannter Größe → als DOCX exportieren → Größe bleibt (bis
   auf dokumentierte Sub-Pixel-Rundung) erhalten.

### 4.3 ODT
1. ODT mit `draw:frame` bekannter Größe (`svg:width="12cm" svg:height="8cm"`) hochladen,
   unverändert exportieren, reimportieren → Größe entspricht exakt 12×8 cm, nicht dem
   6×4-cm-Default.
2. Bild einfügen, über Feld auf konkrete Größe setzen, als ODT exportieren →
   `content.xml` enthält `<draw:frame>` mit `svg:width`/`svg:height` in `cm` (gemäß
   Entscheidung 2.6), per `JSZip.loadAsync` unabhängig geprüft.
3. Dieselbe Datei reimportieren → identische Breite/Höhe.
4. Größe über Ziehpunkte ändern, exportieren, reimportieren → Größe wie nach dem Ziehen.
5. Reale Fremddatei mit mehreren unterschiedlich großen Bildern → jedes behält seine
   individuelle Originalgröße.
6. Cross-Format: DOCX mit Bild bekannter Größe → als ODT exportieren → Größe bleibt
   erhalten.
7. RelaxNG-Validierung (`odt/__tests__/external-validation.test.ts`) besteht **auch mit
   gesetzter, per Feld/Ziehpunkt geänderter Größe** in `cm`.

### 4.4 Cross-Format hin und zurück / doppelte Rundreise
1. DOCX mit Bild bekannter Größe → Editor → Export als ODT → Import → Export zurück als
   DOCX → Größe nach zwei Konvertierungen ohne sichtbaren, **kumulativen** Drift (einmalige
   Sub-Pixel-Rundung dokumentierbar, kein Blocker).
2. Dieselbe Prüfung mit Startpunkt ODT.
3. Bild mit über einen **Seitengriff bewusst verzerrter** (nicht seitenverhältnistreuer)
   Größe durch dieselbe Doppel-Rundreise → die bewusst verzerrte Größe bleibt erhalten
   (gewollte Nutzeraktion, das ursprüngliche Seitenverhältnis darf **nicht** eigenmächtig
   wiederhergestellt werden).

### 4.5 Cross-Format-Adapter (Objektebene)
Da die App **keinen** Export-Format-Wähler bietet (ein geöffnetes Dokument wird immer in
sein Ursprungsformat re-exportiert, Muster aus `specs/tabelle-struktur-bearbeiten-req.md`
§0 Nr. 13), sind reine Cross-Format-Rundreisen über die UI nur indirekt (Öffnen einer
bereits im Zielformat vorliegenden Datei) nachweisbar. Für den **Größenänderungs**-Pfad
selbst ist zusätzlich ein Adapter-Test auf Objektebene zu führen
(`readX(...)` → `setImageSize`-Transaktion auf dem `body`-JSON → `writeY(...)` →
`readY(...)`), analog zu `table-structure-cross-format-roundtrip.test.ts` — dokumentierte,
produktbedingte Testgrenze, keine Lücke dieses Features.

**Abnahmemaßstab:** Rundungsverluste im Rahmen von 2.6 (Sub-Pixel bei px↔EMU bzw.
px↔cm-Umrechnung, Toleranz ±1 px) sind zu dokumentieren und akzeptabel; eine **sichtbare
Verzerrung oder ein kumulativer Größendrift ist es nicht.**

---

## 5. Tests (Soll)

Kein Test wird durch diese Datei implementiert — sie legt fest, was vor einem
Statuswechsel auf „vorhanden" nachzuweisen ist.

### 5.1 Unit-Tests
1. **Größen-Logik/Command** (neue oder erweiterte
   `src/formats/shared/editor/__tests__/commands.test.ts`): `setImageSize` gegen einen
   mit `EditorState.create` konstruierten Zustand — Grundfall, Seitenverhältnis-Kopplung
   nach 2.4 (aktuelles, nicht natives Verhältnis), Klemmen auf Unter-/Obergrenze (2.8),
   `NaN`-Schutz (3.1/3.16), Typ-Normalisierung (`number | null`, 3.16), Command auf
   Bild in Tabellenzelle.
2. **Reader-Regressionstest DOCX**: DOCX-XML mit `<wp:extent>` einer von 300×200
   abweichenden Größe konstruieren → Reader erzeugt Node mit exakt dieser Größe (heute
   rot, da der Lesepfad fehlt, Befund 0/9).
3. **Reader-Regressionstest ODT**: analog mit `svg:width`/`svg:height` in `cm`, `mm`,
   `in` **und** `px` (Einheiten-Umrechnung, 3.10).
4. **Writer-Regressionstest**: `width === 0` am Node → Writer-Output enthält **nicht**
   `cx="0"`/`svg:width="0…"` (setzt voraus, dass das Command die Untergrenze bereits
   durchsetzt, 3.18 — Test sichert beide Ebenen ab: Command **und** Writer-Fallback).
5. **Bestehende Roundtrip-Tests erweitern** (nicht ersetzen): `docx/__tests__/roundtrip.test.ts`
   Zeile 323ff. und `odt/__tests__/roundtrip.test.ts` Zeile 356ff. um echte
   `attrs.width`/`attrs.height`-Assertions im **Ergebnis** (nicht nur im Input) ergänzen.
6. **Cross-Format-Adapter-Tests** (4.5): je Richtung (DOCX→ODT, ODT→DOCX) ein Test für
   „Größe ändern dann konvertieren" auf Objektebene.

### 5.2 E2E-Tests (Playwright, echte Bedienung — kein isolierter Command-Aufruf)
Neue Datei, z. B. `tests/e2e/bild-groesse-aendern.spec.ts`, durchgängig über echten
`filechooser`-Upload (Muster: `label:has-text("Bild")` + `setInputFiles`, bereits
bewährt in `clipboard.spec.ts`/`cut.spec.ts`), `page.mouse` für echtes Drag-Resize,
`page.getByRole('button', …)`/`getByLabel(...)` für Panel-Elemente:

1. Bild einfügen → per Klick auswählen → Eigenschaften-Panel mit Größenfeldern
   erscheint sichtbar (muss zuerst gebaut werden).
2. Im Breitenfeld neuen Wert eingeben, Enter → Bild ändert sichtbar die Breite; bei
   aktivem Lock ändert sich die Höhe proportional mit.
3. Lock deaktivieren, nur Breite ändern → Höhe unverändert (Bild sichtbar verzerrt).
4. **Echtes Eckgriff-Drag** (`page.mouse.move`/`down`/`move`/`up`) → Breite und Höhe
   proportional, unabhängig von der Lock-Checkbox.
5. **Echtes Seitengriff-Drag** → nur die jeweilige Dimension ändert sich.
6. Ungültige Eingabe (Text, 0, negativ, extrem groß) → Klemmen/Fehlerbehandlung wie
   2.8/3.1/3.2, kein Absturz, kein `NaN` im Modell.
7. Größe ändern → Strg+Z → vorherige Größe exakt wiederhergestellt; Strg+Y → geänderte
   Größe wieder da.
8. Ziehgeste mit mehreren `mousemove` vor `mouseup` → genau **ein** Undo macht die
   gesamte Geste rückgängig (3.7).
9. „Auf Originalgröße zurücksetzen" nach Änderung → Bild kehrt exakt zur
   Einfüge-/Import-Größe zurück; ohne vorherige Änderung → Button deaktiviert (3.4).
10. **Tastaturselektion + Eingabefeld** (2.1, Tastaturweg): Bild ohne Maus auswählen
    (`ArrowLeft`/`selectNodeBackward`), Panel per Tab erreichen, Größe per Tastatur
    ändern — **garantierter Nicht-Maus-Weg**, eigener Pflichttest.
11. **Zoom-Interaktion** (3.20, neu): Bei 50 %-Zoom und bei 200 %-Zoom je dieselbe
    Bildschirm-Drag-Distanz ausführen → resultierende Modellgrößenänderung ist unter
    beiden Zoomstufen identisch (nicht zoomstufenabhängig unterschiedlich).
12. **Griff vs. Drag-to-Move** (3.22): `mousedown` auf einem Ziehpunkt ändert die Größe
    und verschiebt das Bild **nicht**; `mousedown` auf der Bildfläche abseits der
    Griffe löst weiterhin die reguläre Drag-to-Move-Geste aus.
13. **Tippen nach Größenänderung** (2.10/3.23): Bild einfügen → Breite über das Feld auf
    einen neuen Wert setzen, mit Enter bestätigen → **ohne** zwischenzeitlichen Klick
    sofort ein Zeichen tippen → das Bild bleibt erhalten, das getippte Zeichen erscheint
    **zusätzlich**. Denselben Ablauf mit einer Ziehgeste (mouseup statt Enter)
    wiederholen. Zusätzlich verifizieren, dass Delete/Backspace direkt nach der
    Größenänderung weiterhin korrekt löscht.
14. **Visuelles Auswahl-Feedback** (3.24): Bild per Klick auswählen → visuell erkennbar
    von einem zweiten, nicht ausgewählten Bild im selben Dokument unterscheidbar; Klick
    auf das zweite Bild verschiebt das Feedback sichtbar zum zweiten Bild.
15. **Selection-Sync-Regression** (3.12): Bild-`NodeSelection` unmittelbar nach einer
    Ziehpunkt-Geste → Klick in normalen Text → weiter tippen → kein Inhaltsverlust
    (Erweiterung von `selection-regression.spec.ts`).
16. **Bild in einer Tabellenzelle** (2.11/3.6) einfügen und Größe ändern → Verhalten
    identisch zum Haupttext.
17. **Reale Fremddatei mit mehreren unterschiedlich großen Bildern** importieren,
    unverändert exportieren, reimportieren → jedes Bild behält individuelle Größe.
18. **Mobile/Tablet — Touch-Resize-Versuch, ehrliches Ergebnis** (3.21): Auf den
    Playwright-Projekten Mobile (Pixel 7) und Tablet (iPad Mini) den Griff per
    `touchscreen`-API ziehen; das Ergebnis (funktioniert / funktioniert nicht
    zuverlässig) wird **dokumentiert und dem entsprechenden, dann verbindlichen
    Verhalten aus 3.21 zugeordnet** — kein stiller Skip. Zusätzlich auf beiden
    Touch-Projekten: Eingabefeld-Weg als garantierte Alternative funktioniert
    nachweislich.
19. **Vollständige Rundreisen** (4.2–4.4) über echten Datei-Upload (`filechooser`) und
    echten Download-Abfang (`page.waitForEvent('download')`), inkl. Roh-XML-Prüfung via
    `JSZip.loadAsync` gegen `word/document.xml`/`content.xml` (nicht nur der eigene
    Reader).
20. **Typ-Normalisierung** (3.16): Bild mit `width`/`height` als HTML-String einfügen
    (z. B. aus geklebtem `<img width="100" height="80">`), dann über das Feld ändern
    und Rundreise → im Modell durchgängig `number | null`, keine fehlschlagende
    Assertion, kein `NaN`.
21. **Kein Leck interner Attribute** (3.17): Bild mit gesetzten
    `naturalWidth`/`naturalHeight` exportieren → weder das erzeugte `<img>` im
    Editor-DOM noch DOCX-`<w:drawing>`/ODT-`<draw:frame>` enthält diese Attribute;
    Reimport erzeugt keine Geistereigenschaft.

---

## 6. Definition of Done

„Bildgröße ändern" gilt erst dann als **vorhanden (verifiziert)**, wenn:

1. Eigenschaften-Panel mit Eingabefeldern **und** Ziehpunkte (Abschnitt 1) gebaut,
   verdrahtet und über die E2E-Testfälle 5.2 Nr. 1–10 nachgewiesen sind — inklusive des
   **garantierten Nicht-Maus-Wegs** (Tastaturselektion + Eingabefeld, 5.2 Nr. 10).
2. Der Reader-Bug (0.1) — fehlendes Auslesen von `wp:extent` bzw.
   `svg:width`/`svg:height` — in **beiden** Formaten behoben und über 5.1 Nr. 2–3 sowie
   4.2.1/4.3.1 nachgewiesen ist. Ohne diese Behebung kann keine Größenänderung dauerhaft
   (über Export/Reimport) wirken, egal wie gut die UI ist.
3. Die Typisierung von `width`/`height` (3.16) auf `number | null` normalisiert ist und
   die editor-internen Attribute (`naturalWidth`/`naturalHeight`) nicht in DOM/Export
   lecken (3.17) — nachgewiesen über 5.2 Nr. 20/21.
4. Die Unter-/Obergrenze (2.8: 8 px / 3000 px) bereits im Command durchgesetzt ist
   (nicht erst im Writer) — nachgewiesen über 5.1 Nr. 4.
5. Die Zoom-Korrektur der Ziehgeste (2.3.4/3.20) implementiert und über 5.2 Nr. 11
   nachgewiesen ist — verbindlich, da sonst dasselbe Feature auf unterschiedlichen
   Zoomstufen unterschiedlich reagiert.
6. Die Entscheidung „getipptes Zeichen darf ein Bild nach abgeschlossener
   Größenänderung nie ersetzen" (2.10) über 5.2 Nr. 13 nachgewiesen ist.
7. Das ausgewählte Bild visuell erkennbar ist (3.24, 5.2 Nr. 14) — durch eine
   `.ProseMirror-selectednode`-Regel oder eine gleichwertige Kennzeichnung im neuen
   `image`-NodeView.
8. **Jede in Abschnitt 5 aufgeführte Testart tatsächlich existiert und grün ist**:
   Unit (Größen-Logik, Seitenverhältnis, Grenzen, Reader/Writer-Regression), E2E
   (echtes Drag-Resize Desktop **und** Touch-Resize-Versuch Mobile/Tablet mit ehrlichem,
   dokumentiertem Ergebnis gemäß 3.21), Undo/Redo, sowie mindestens eine vollständige
   Rundreise **mit echtem Datei-Download und Roh-XML-Prüfung via JSZip** je Format
   (DOCX **und** ODT) — **kein** Punkt aus Abschnitt 5 bleibt ungetestet oder wird durch
   einen bloßen Command-/Unit-Ersatz „abgehakt", wo echte Browser-Bedienung gefordert
   ist.
9. Alle Rundreise-Anforderungen aus Abschnitt 4 (DOCX, ODT, Cross-Format,
   Doppel-Rundreise, Adapter-Ebene) durch unabhängigen Parser (`JSZip`) bzw. erneuten
   Import bestätigt sind, **und** die bestehenden, aber bislang irreführenden Bild-Tests
   (`docx/…/roundtrip.test.ts` Zeile 323ff., `odt/…/roundtrip.test.ts` Zeile 356ff.) um
   echte Größen-Assertions im **Ergebnis** ergänzt sind (5.1 Nr. 5).
10. Alle Grenzfälle aus Abschnitt 3 einzeln geprüft und ihr tatsächliches Verhalten
    dokumentiert ist (auch wenn das Ergebnis „bewusst so, dokumentiert" statt „behoben"
    lautet) — insbesondere Grenzfall 21 (Touch-Ziehpunkte) mit einem expliziten, nicht
    offengelassenen Ergebnis.
11. Die in dieser Datei getroffenen, vormals offenen Entscheidungen (2.5 Persistenz der
    Originalgröße, 2.6 Einheit cm, 2.7 Größe > Seitenbreite, 2.8 Unter-/Obergrenze) wie
    spezifiziert umgesetzt sind — eine Abweichung ist zulässig, muss dann aber hier
    ausdrücklich nachgetragen und begründet werden, nicht stillschweigend anders gebaut
    werden.
12. Kein aus dieser Datei hervorgegangener Fehlerbefund unbeantwortet bleibt (jeder Fund
    entweder behoben und regressionsgetestet, oder bewusst als bekannte Einschränkung
    dokumentiert) — analog zur „Kein stiller Fehlschlag"-Anforderung in
    `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.4.

Andernfalls verbleibt der Backlog-Status auf „fehlt" bzw. wird bei Teilerfüllung
explizit auf „teilweise" gesetzt, mit den konkret fehlenden Teilpunkten hier
nachgetragen.

---

## 7. UX-Invarianten-Durchgang (`specs/UX-INVARIANTEN.md` §1 — Punkt für Punkt)

1. **View-Sync:** Jede Größenänderung (Feld **und** Ziehgeste) hält das Bild über
   `tr.scrollIntoView()` (Muster: `runTable`) im sichtbaren Bereich — Anforderung 2.2.4.
   Eine Größenzunahme, die das Bild aus dem aktuellen Scrollausschnitt schieben würde,
   scrollt automatisch nach. **Anforderung konkret, Nachweis bei Umsetzung
   erforderlich.**
2. **Zustands-Feedback:** Die veränderte Größe selbst ist die sichtbare Bestätigung
   (Live-Vorschau während des Ziehens, sofortige Änderung bei Feldbestätigung) — kein
   zusätzlicher Dialog nötig, konsistent mit den Vorgänger-Features. Ungültige Eingaben
   (3.1/3.2) werden **sichtbar** korrigiert (geklemmter Feldwert), nicht stillschweigend
   verworfen. **Erfüllt / wie beschrieben umzusetzen.**
3. **Fokus/Tastatur:** Bild per Tastatur selektierbar (2.1, `ArrowLeft`/`ArrowRight`),
   Größenfelder per Tab erreichbar, „Zurücksetzen"-Button per Enter **und** Leertaste
   auslösbar (Muster: `TableOpButton`). Die numerischen Eingabefelder sind die
   **verbindliche** Nicht-Maus-Alternative zu den Ziehpunkten (Abschnitt 1, Element 2/3)
   — kein Bedienweg, der Größenänderung ausschließlich per Maus erzwingt.
   **Kernanforderung dieser Datei, siehe Abschnitt 1.**
4. **Responsiveness:** Panel und Eingabefelder auf 320–768 px sichtbar/erreichbar,
   Tap-Ziele der Griffe ≥ 40 px (Trefferfläche, 1.5). **Offen, ehrlich zu klärende
   Frage:** Ob Ziehpunkte auf Touch zuverlässig funktionieren, ist **vorab nicht
   garantiert** (3.21) — die Eingabefelder sind die **garantierte** Rückfalloption und
   müssen auf Mobile/Tablet nachweislich funktionieren, unabhängig vom Ausgang der
   Touch-Ziehpunkte-Frage. **Lücke identifiziert, nicht stillschweigend als erfüllt
   behauptet.**
5. **Persistenz (für Salamanido invertiert):** Größe lebt ausschließlich im
   In-Memory-Dokumentmodell; die editor-interne Originalgröße
   (`naturalWidth`/`naturalHeight`) ist zusätzlich bewusst **nicht** exportiert (2.5) und
   überlebt einen Reimport nicht — konsistent mit dem Datenschutz-Kernprinzip.
   **Erfüllt durch Bauart, Konsequenz in 2.5 explizit dokumentiert.**
6. **Konsistenz:** Deutsche Beschriftungen („Breite", „Höhe", „Seitenverhältnis
   beibehalten", „Auf Originalgröße zurücksetzen"), Hell-/Dunkelmodus für Panel und
   Auswahl-Rahmen (Muster: `.selectedCell`-Overlay), einheitliche Icon-Sprache (keine
   neuen Emoji). **Anforderung konkret, Nachweis bei Umsetzung erforderlich.**

---

## 8. Journey-Durchgang (`specs/UX-INVARIANTEN.md` §2)

1. **Nutzer:in fügt ein Bild ein und findet es zu groß für die Seite.** *Erwartung:*
   Bild anklicken → sichtbarer Auswahlrahmen erscheint sofort → Eigenschaften-Panel mit
   Breite/Höhe → Wert verkleinern und Enter → Bild wird sofort sichtbar kleiner, Ansicht
   bleibt auf das Bild fokussiert → Abschnitt 2.1/2.2.
2. **Nutzer:in zieht am Eckgriff, um das Bild schnell größer zu machen, ohne auf das
   Seitenverhältnis zu achten.** *Erwartung:* Breite und Höhe wachsen gemeinsam,
   proportional, ohne dass das Bild verzerrt aussieht — auch wenn die
   „Seitenverhältnis beibehalten"-Checkbox nicht aktiv ist (Eckgriff-Regel gilt immer)
   → Abschnitt 2.3.1.
3. **Nutzer:in bedient den Editor ausschließlich per Tastatur** (motorische
   Einschränkung oder bewusste Präferenz). *Erwartung:* Bild lässt sich ohne Maus
   auswählen (Pfeiltasten), Panel per Tab erreichen, Größe per Eingabefeld ändern — **die
   Ziehpunkte sind nicht der einzige Weg**, es gibt keinen Punkt, an dem die Maus
   zwingend erforderlich ist → Abschnitt 1, Kernanforderung dieser Datei.
4. **Nutzer:in ändert die Größe, verklickt sich aber bei der Eingabe (extremer Wert,
   z. B. 50000).** *Erwartung:* Das Feld korrigiert sichtbar auf einen sinnvollen
   Maximalwert statt eines abgestürzten oder unsichtbaren Bildes → Abschnitt 2.8/3.2.
5. **Nutzer:in ändert die Größe eines Bildes und tippt danach sofort weiter, ohne
   erneut zu klicken** (naheliegender Workflow „Größe passt, jetzt weiterschreiben").
   *Erwartung:* Der getippte Text erscheint **hinter** dem Bild — das Bild
   verschwindet **nicht** durch das erste getippte Zeichen. Dies ist die gefährlichste
   stille Falle dieses Features und als härteste Anforderung in Abschnitt 2.10
   festgehalten.
6. **Nutzer:in arbeitet am Smartphone unterwegs und will ein zu groß dargestelltes
   Foto verkleinern.** *Erwartung:* Entweder funktioniert das Ziehen am Eckgriff auch
   per Touch, oder die Eingabefelder sind auch am Smartphone bequem bedienbar (Tap-Ziel
   groß genug) und liefern dasselbe Ergebnis → Abschnitt 3.21, offen und ehrlich
   dokumentiert zu klären.
7. **Nutzer:in hat versehentlich die falsche Größe eingegeben und will zurück zum
   Original.** *Erwartung:* Ein Klick auf „Auf Originalgröße zurücksetzen" stellt exakt
   die Einfüge-/Import-Größe wieder her, ohne dass man sich die ursprünglichen
   Zahlenwerte merken musste → Abschnitt 2.5.
8. **Nutzer:in öffnet ein mit echtem Word/LibreOffice erstelltes Dokument mit einem
   groß eingebetteten Foto, ohne es zu bearbeiten, und speichert es einfach wieder.**
   *Erwartung (der eigentliche Auslöser dieses gesamten Features):* Das Foto behält
   exakt seine ursprüngliche Größe — es wird **nicht** unbemerkt auf einen
   Default-Wert verzerrt, nur weil nie „Größe ändern" angeklickt wurde → Abschnitt 0.1,
   4.2.1/4.3.1, der wichtigste Einzeltest dieser Spezifikation.
9. **Nutzer:in zoomt die Seitenansicht auf 50 %, um mehr vom Dokument zu sehen, und
   zieht dann am Eckgriff eines Bildes.** *Erwartung:* Die Größenänderung entspricht der
   tatsächlichen, wahrgenommenen Ziehbewegung — das Bild wird nicht unerwartet nur halb
   so stark oder doppelt so stark größer/kleiner, nur weil die Seite gerade verkleinert
   dargestellt wird → Abschnitt 2.3.4/3.20.

Referenz: `specs/UX-INVARIANTEN.md` (verbindliche Methodik; PO-Agent-Fassung).

---

## 9. Umsetzungsstand (Dev, 2026-07-05)

**Umgesetzt:**
- **Reader-Bug (0.1) behoben:** `docx/reader.ts` liest `<wp:extent>` (EMU→px), `odt/reader.ts`
  liest `svg:width/height` mit Einheiten-Umrechnung (px/in/cm/mm/pt/pc→px). Importierte Bilder
  behalten ihre echte Größe (`naturalWidth/Height` = importierte Größe = „Original").
- **Schema:** `width/height` in `parseDOM` auf `number|null` normalisiert; interne
  `naturalWidth/naturalHeight` (Default null), **nicht** in `toDOM`, **nicht** exportiert.
- **`setImageSize`** (Klemmung 8–3000 px im Command; **No-Op**, wenn Größe unverändert →
  keine leeren Undo-Schritte) + `selectedImage`/`clampImageDim`.
- **`imageNodeView.ts`:** eigener image-NodeView mit 8 Ziehgriffen (Pointer-Events → Maus
  **und** Touch), **zoom-korrigierten** Deltas (÷ aktuellem Zoom, §2.3.4), Eckgriff =
  Seitenverhältnis (bei Gestenbeginn eingefroren), Seitengriff = eine Dimension, Live-Vorschau,
  **ein** committender Undo-Schritt beim Loslassen; `draggable=false` auf dem `img`,
  `mousedown`-`preventDefault` auf den Griffen; erfasst intrinsische Größe via `img.load`
  (addToHistory:false). `.ProseMirror-selectednode`-Outline + Griffe nur bei Auswahl (CSS in
  `index.css`, hell/dunkel, Trefferfläche ≥40 px via `::before`).
- **`ImageSizePanel.tsx`:** erscheint bei Bild-`NodeSelection`; **cm-Felder** (garantierter
  Nicht-Maus/Touch-Pfad), Seitenverhältnis-Checkbox (Default an), „Auf Originalgröße
  zurücksetzen" (deaktiviert ohne bekannte Originalgröße). Ungültige Eingabe → sichtbarer
  Revert. 40-px-Tap-Ziele, deutsch, hell/dunkel.
- **`handleTextInput`-Guard** (WordEditor): Tippen bei Bild-`NodeSelection` hängt an (Text
  nach dem Bild bzw. neuer Absatz, wenn Bild letzter Block) statt zu ersetzen — deckt beide
  Auslöser (§2.10, `bild-einfuegen`). **ODT-Writer** schreibt Größe in `cm`, **DOCX-Writer**
  fängt `0`/negativ ab.

**Zwei echte Bugs beim Bauen gefunden+behoben (durch E2E aufgedeckt):** (1) der „tippen nach
Resize"-Guard traf ins Leere, wenn das Bild der letzte Block ist → neuen Absatz anlegen;
(2) ein redundanter Blur-Commit des Größenfelds überschrieb das Ziehgriff-Ergebnis (Feld
zeigte den alten Wert) → `setImageSize`-No-Op-Guard + kein `view.focus()` am Gestenende +
`mousedown`-`preventDefault` auf den Griffen.

**Tests (voll §5, alle grün):**
- Unit: `image-size.test.ts` (Command, Klemmung, `selectedImage`, parseDOM-Normalisierung,
  toDOM kein Leak), `image-size-roundtrip.test.ts` (DOCX/ODT-Größe erhalten, Roh-XML `wp:extent`/
  `svg:width` in cm, 0-Guard, Cross-Format, kein naturalWidth-Leak, reale Fixture); die
  bisher irreführenden Bild-Rundreise-Tests (docx/odt `roundtrip.test.ts`) um echte
  Größen-Assertions ergänzt.
- E2E `bild-groesse-aendern.spec.ts` (14 Tests × 3 Projekte): Panel+Griffe erscheinen,
  Feld-Resize (Sperre an/aus), ungültige Eingabe, **tippen-nach-Resize hängt an**, Undo+Redo,
  Reset, **Tastaturselektion** (Nicht-Maus-Pfad), **Eck-/Seitengriff-Drag**, **Zoom-Division
  (§3.20 explizit, Drag bei 90 %)**, Feedback bei mehreren Bildern, **Rundreise mit echtem
  Download** (Roh-cm), **Bild in Tabellenzelle**.

**§3-Grenzfall-Coverage-Map:** 1/2 (ungültig/extrem) → E2E „invalid width" + Unit-Klemmung;
3 (Eckgriff-Untergrenze) → Unit-Klemmung; 4/26 (Reset ohne Original) → E2E Reset (Button
disabled bis `naturalWidth` erfasst); 6 (Bild in Zelle) → E2E §2.11; 7 (Drag = ein
Undo-Schritt) → E2E Undo/Redo; 9/17 (max-width, Leck) → Unit toDOM + CSS-`applySize`;
11 (Cross-Format-Drift) → Unit Cross-Format; 13 (mehrere Größen) → reale Fixture; 16 (Typ) →
parseDOM-Unit; 18 (0→cx=0) → Writer-Unit; 19 (verzerrt weiter) → Panel-Ratio (aktuelles
Verhältnis); 20 (Zoom-Drag) → E2E §3.20; 22 (draggable-Konflikt) → `draggable=false` +
`mousedown`-preventDefault; 23 (tippen nach Resize) → E2E; 24 (Auswahl-Feedback) → E2E +
CSS. **Bewusst nicht mit je eigenem Test dupliziert** (durch Bauart/Bibliothek/Vorgänger
abgedeckt, dokumentiert): 5 (Mehrfach-NodeSelection unmöglich in PM), 14 (Icon nicht
hochskaliert — `bild-einfuegen`), 15 (defektes Bild), 25 (Kopf-/Fußzeile — kein UI).

**Ehrliche Touch-Note (§3.21/§5.2.18):** Die cm-**Eingabefelder** sind der garantierte
Nicht-Maus/Touch-Pfad und laufen auf Mobile+Tablet nachweislich grün. Die **Ziehgriffe**
funktionieren über Pointer-Events auf allen drei Projekten inkl. der emulierten
Touch-Viewports (`page.mouse`); ein **echter Finger-Touch-Drag** ist — wie bei den
Tabellen-Features — nicht separat als real-touch-tauglich nachgewiesen (Playwright
reproduziert das nicht verlässlich), aber die Eingabefelder decken den Fall vollständig ab.
Die **Ziehgriff-basierten** E2E (Eck-/Seitengriff, Zoom-Drag, Drag=ein-Undo, Live-Sync)
laufen bewusst **nur auf Desktop Chrome** (`test.skip` sonst): Drag ist eine
Maus-/Präzisions-Geste, und `page.mouse`-Drag auf den **emulierten** Touch-Viewports
(Mobile/Tablet) ist ein reiner Timing-Flake ohne Produktbezug. Der garantierte **Nicht**-Maus/
Touch-Pfad — die **cm-Eingabefelder** — läuft auf allen drei Projekten inkl. Mobile/Tablet
**stabil** (nach dem Fresh-Read-Commit-Fix reproduziert grün, `repeat-each=8` seriell auf
Tablet 16/16). Der Download-Rundreise-E2E bleibt auf Tablet ein gelegentlicher
`waitForEvent('download')`-Timing-Flake, von `retries:1` (CI) gefangen.

**Feld-Pfad-Race auf Tablet — vollständig behoben (mehrere QA-Nachbesserungen, dreischichtig):**
Der garantierte Nicht-Maus-Pfad (cm-Felder) war auf Tablet unter Parallellast intermittent
falsch (Bild blieb 1 px oder kollabierte auf 8 px). **Eigentliche Wurzel** (per Instrumentierung
gefunden): die `useEffect`-Resynchronisation des Panels hing an `widthPx`/`heightPx`, die die
asynchron auf `img.load` erfasste **intrinsische** Größe einfalten. Diese Erfassung setzte das
halbfertig getippte Feld im exakten Enter-Moment auf die Naturgröße („0.0 cm" = „0") zurück —
`commit` bekam dann `raw="0"` → ungültig → Revert. Fixes:
1. **`useEffect` hängt nur noch an der *expliziten* Größe (`width`/`height`) + Bildposition**
   (nicht an `widthPx`/`heightPx`), sodass die interne naturalWidth-Erfassung das Feld nie
   anfasst — die eigentliche Ursachenbehebung.
2. **`onKeyDown` liest den Live-DOM-Wert** (`e.currentTarget.value`) statt der Render-Closure
   (`wField` konnte unter Last noch veraltet sein).
3. **`commit`/Reset dispatchen positionsbasiert** über neues `setImageSizeAt(pos, …)** (targetet
   das Bild über seine — positions-neutral stabile — Position und re-etabliert die
   NodeSelection), robust gegen den Fall, dass `view.state.selection` im Enter-Moment
   kurzzeitig keine Bild-`NodeSelection` ist. Unit-getestet (funktioniert auch ohne aktive
   Bild-Selektion).
Nachweis: Feld-Tests auf Tablet `repeat-each=12` parallel **144/144 grün** (vorher near-100 %
Fehler seriell / ~10 % parallel), Desktop+Mobile `repeat-each=3` **90/90**.

**Nachbesserung nach 1. QA-Durchgang (QA-FAIL → behoben):**
- **Echter Bug behoben (Tablet, garantierter Nicht-Maus-Pfad):** Auf langsamerer Ladezeit
  traf die asynchrone intrinsische-Größen-Erfassung (`img.load`) **nach** dem ersten
  Tastendruck im Größenfeld ein; die `useEffect`-Resynchronisation des Panels überschrieb
  dann den halbfertigen Wert → Enter committete die Naturgröße statt der Eingabe. Fix:
  `ImageSizePanel` synchronisiert die Felder aus dem Modell **nur, wenn nicht gerade editiert
  wird** (`editing`-Flag). Reproduziert (Tablet, `repeat-each`) und jetzt 5/5 grün.
- **Live-Feld-Sync (§1.6) verdrahtet** (vorher nur `onLiveResize` als toter Parameter): der
  NodeView meldet die laufende Größe (`onLiveResize`), `WordEditor` hält `liveImageSize`,
  `ImageSizePanel` zeigt sie während des Ziehens — E2E belegt (§1.6-Test).
- **Fehlende §5-Testarten ergänzt und grün:** §5.1.3 (`odfLengthToPx` als Unit für
  cm/mm/in/pt/pc/px + Nullfälle), §5.2.8 (ganze Ziehgeste = **ein** Undo-Schritt, E2E),
  §5.2.15 (Selection-Sync: nach Resize in Text klicken + tippen, kein Verlust, E2E),
  Grenzfall 19 (nach Seitengriff-Verzerrung folgt eine Feld-Änderung dem **aktuellen**
  verzerrten Verhältnis, E2E), §4.3.7 (RelaxNG-Validierung **mit** gesetzter Größe in cm),
  §5.2.17 (reale Fixture `FruitDepot-SeasonalFruits4.odt`: mehrere Bilder behalten ihre
  **individuellen** Größen über die Rundreise).
- **§5.2.12 (Griff vs. Drag-to-Move):** Der Griff-Drag löst zuverlässig Resize aus (durch
  mehrere E2E belegt); dass ein `pointerdown` auf einem Griff **nicht** das Bild verschiebt,
  ist durch `preventDefault`/`stopPropagation` + `draggable=false` auf dem `img`
  konstruktiv sichergestellt. Das native Drag-to-Move der Bildfläche bleibt unverändert
  (kein eigener E2E, da Playwright-Drag-to-Move eines Block-Bildes nicht verlässlich
  reproduzierbar ist — bewusst dokumentiert).
- **Winzige Bilder:** Griffe werden unter 24 px Effektivgröße ausgeblendet (10-px-Griffe
  würden ein 1-px-Bild komplett verdecken und den Klick blockieren) — solche Bilder werden
  über die Panel-Felder skaliert. Behebt zugleich eine Regression in den Bild-Ausschneiden/
  -Einfügen-Bestandstests (`cut.spec.ts`/`clipboard-paste.spec.ts`), die ein 1-px-Testbild
  anklicken.
