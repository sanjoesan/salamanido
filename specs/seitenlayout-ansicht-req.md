# Anforderungen: „Seitenlayoutansicht (Druckansicht)"

Status: Laut Backlog (`specs/FEATURE-BACKLOG.md`, Slug `seitenlayout-ansicht`, Priorität 1,
Abschnitt „8.1 Dokumentenansichten", Zeile: „Seitenlayoutansicht (Druckansicht) — Standardansicht
mit sichtbaren Einzelseiten. — vorhanden") als **„vorhanden"** markiert. Diese Einstufung gilt
laut Auftrag als **nicht vertrauenswürdig** und muss vollständig verifiziert werden. Im konkreten
Fall bedeutet das insbesondere: klären, ob „vorhanden" tatsächlich eine bewusst gebaute, geprüfte
Druckansicht bedeutet — oder ob es sich lediglich um den einzigen, fest verdrahteten
Rendering-Modus handelt, der mangels jeder Alternative zwangsläufig angezeigt wird, ohne dass er je
gezielt gegen Word-/LibreOffice-Referenzverhalten abgenommen wurde.

Geltungsbereich: die visuelle Darstellung des Editors als Abfolge sichtbarer A4-Einzelseiten mit
Rand, Zwischenraum und automatischem Seitenumbruch bei Inhaltsüberlauf, umgesetzt in
`src/formats/shared/editor/pageLayout.ts` (Geometrie-Konstanten, Hintergrund-Streifenmuster) und
`src/formats/shared/editor/pagination.ts` (DOM-Höhenmessung, Decoration-Spacer-Plugin), eingebunden
in `src/formats/shared/editor/WordEditor.tsx`, sowie die gemeinsame Geometrie-Quelle
`src/formats/shared/pageGeometry.ts` (A4/25-mm-Konstanten in mm, plus `mmToTwips`), aus der sich
sowohl die Bildschirmsimulation als auch die DOCX- und ODT-Seitengeometrie beim Export ableiten.
Ausdrücklich **nicht** Gegenstand dieser Datei: der manuelle, nutzerausgelöste Seitenumbruch (siehe
`seitenumbruch-req.md`), Kopf-/Fußzeilen-Bearbeitung (siehe `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 9),
Seitenränder/-ausrichtung/-format als **einstellbare** Funktion (Backlog-Slugs `seitenraender`,
`seitenausrichtung`, `papierformat` — alle „fehlt", nur als Cross-Referenz erwähnt) sowie
Drucken/PDF-Export (Backlog-Slugs `drucken`, `als-pdf-exportieren`).

Wie in `FEATURE-SPEC-DOCX-ODT.md` festgelegt: DOCX und ODT teilen sich denselben ProseMirror-Editor
und dieselbe Seitenansicht. Jede Anforderung unten gilt für **beide** Formate, inklusive Rundreise
(Import → Anzeige in der Seitenlayoutansicht → Export → Re-Import → Inhalt bleibt unverändert,
unabhängig davon, wie viele Seiten währenddessen angezeigt wurden).

---

## 0. Befund aus direkter Code-Verifikation (Stand 2026-07-05)

Diese Spezifikation beruht auf tatsächlicher Durchsicht des **aktuellen** Codes, nicht nur auf der
Backlog-Beschreibung. Alle Aussagen unten wurden zuletzt am 2026-07-05 erneut gegen den echten
Dateiinhalt geprüft (Re-Verifikation eines am 2026-07-04 erstellten Entwurfs). Ergebnis der
Re-Verifikation: sämtliche Befunde 1–14 sind gegen den aktuellen Code weiterhin gültig — insbesondere
`pageGeometry.ts` (A4/25 mm + `mmToTwips`), `pageLayout.ts` (`pageBackgroundStyle` mit Literal `white`,
`PAGE_GAP_PX`), `pagination.ts` (modul-privater `paginationKey`, `computePageBreakIndices`-Guard,
reine `Decoration.widget`-Spacer, `sameDecorationSet`-Vergleich, kein Resize-/`onload`-Listener),
`docx/pageSetup.ts` + `docx/writer.ts` (`sectPrExtra += defaultPageSetupXml()` → `w:pgSz`/`w:pgMar`),
`odt/writer.ts` (`style:page-layout` „PL1" mit `fo:margin`/`fo:page-width`/`fo:page-height`,
`style:master-page` „Standard"), sowie die beiden Reader (`docx/reader.ts` liest `w:sectPr` nur für
`headerReference`/`footerReference`, **nicht** `w:pgSz`/`w:pgMar`; `odt/reader.ts` liest
`style:master-page` nur für Header/Footer, **nicht** die zugehörige `style:page-layout`-Geometrie) und
`src/index.css` (`.page-break-spacer { width: 100% }`, sonst nichts) wurden Datei für Datei bestätigt.
Load-bearend ist jeweils das beschriebene **Verhalten**; Zeilenangaben sind indikativ und mit diesem
Stand-Datum zu verstehen (die betroffenen Dateien wachsen/verschieben sich, `WordEditor.tsx` wurde
seit dem ersten Entwurf dieser Datei erkennbar erweitert). **Ein zentraler Befund eines früheren
Entwurfs dieser Datei wurde bei dieser Re-Verifikation als überholt entlarvt und korrigiert — siehe
Befund 4, ausdrücklich als Korrektur markiert.** Das unterstreicht, warum die Backlog-Einstufung
nicht ungeprüft übernommen werden darf.

1. **Keine echte „Ansicht" im Sinne mehrerer wählbarer Modi.** Es gibt keinen Umschalter zwischen
   „Seitenlayout"/„Weblayout"/„Entwurf"/„Gliederung"/„Lesemodus" (alle diese Backlog-Slugs unter
   „8.1 Dokumentenansichten" außer diesem einen sind „fehlt"). `WordEditor.tsx` rendert exakt einen
   fest verdrahteten Darstellungsmodus ohne jede Konfigurierbarkeit und ohne ein UI-Element, das
   diesen Modus benennt (kein Label „Seitenlayout", kein Menüeintrag „Ansicht"). Der Backlog-Status
   „vorhanden" beruht also darauf, dass es keine Alternative gibt, nicht darauf, dass eine benannte,
   bewusst als „Druckansicht" gebaute und geprüfte Funktion existiert.
2. **Mechanismus ist eine reine client-seitige Bildschirmsimulation.** Die Maße sind **nicht** als
   Pixel-Literale hartkodiert, sondern werden abgeleitet:
   - `pageGeometry.ts` ist die **einzige Quelle der Wahrheit** für die feste Seitengeometrie:
     `PAGE_WIDTH_MM = 210`, `PAGE_HEIGHT_MM = 297`, `PAGE_MARGIN_MM = 25` (A4, 2,5 cm Rand ringsum),
     plus `mmToTwips()`. Der Datei-Kommentar nennt selbst drei Konsumenten: die Bildschirmsimulation
     (`pageLayout.ts`, in px), den DOCX-Writer (`w:pgSz`/`w:pgMar`, in Twips) und den ODT-Writer
     (`style:page-layout-properties`, in cm) — siehe Befund 4.
   - `pageLayout.ts` rechnet daraus über `PX_PER_MM = 96 / 25.4` die Pixelmaße: `PAGE_WIDTH_PX ≈ 794`,
     `PAGE_HEIGHT_PX ≈ 1123`, `PAGE_MARGIN_PX ≈ 94`; dazu `PAGE_SEPARATOR_PX = 32`,
     `PAGE_CONTENT_HEIGHT_PX = PAGE_HEIGHT_PX − 2·PAGE_MARGIN_PX ≈ 935` und
     `PAGE_GAP_PX = 2·PAGE_MARGIN_PX + PAGE_SEPARATOR_PX ≈ 220`. `pageBackgroundStyle()` malt über
     `background-image: linear-gradient(...)` abwechselnd weiße „Seiten"- und transparente
     „Lücken"-Bänder mit **fester** Periode `PAGE_CONTENT_HEIGHT_PX + PAGE_GAP_PX` (≈ 1155) hinter
     den durchgehend scrollenden Editor-Inhalt.
   - `pagination.ts` (`createPaginationPlugin`) misst nach jedem View-Update per
     `requestAnimationFrame` die tatsächlich gerenderte Höhe jedes Top-Level-Blocks
     (`getBoundingClientRect().height`) und berechnet daraus (`computePageBreakIndices`) Stellen, an
     denen ein reines `Decoration.widget`-Spacer-Element (`page-break-spacer`, Höhe `PAGE_GAP_PX`)
     eingefügt wird.
   - Hintergrundstreifen und Spacer-Positionen werden **unabhängig voneinander** berechnet (feste
     Pixel-Periode vs. real gemessene Höhen) — siehe Befund 6 für das daraus resultierende Risiko.
3. **Es ist keine echte Mehrfach-Seiten-Darstellung, sondern eine einzige durchgehend scrollende
   Fläche mit optischer Bänderung — und die Bänderung hängt allein am Hintergrund, nicht am Spacer.**
   `WordEditor.tsx` rendert einen einzigen `containerRef`-`div` (die ProseMirror-Surface) innerhalb
   eines fest `PAGE_WIDTH_PX` breiten Wrapper-`div`s mit **einem einzigen** `shadow-lg` für den
   gesamten Stapel — nicht ein Schatten/Rahmen pro simulierter Einzelseite. **Verschärfend** (aus
   `src/index.css` verifiziert): die einzige CSS-Regel für `.page-break-spacer` ist `width: 100%` —
   **keine** Hintergrundfarbe, **kein** Rahmen, **kein** Schatten. Der Spacer ist visuell komplett
   unsichtbar; er schiebt nur Höhe ein. Die gesamte sichtbare „Seitentrennung" hängt somit
   ausschließlich am **unabhängig** berechneten `pageBackgroundStyle()`-Gradienten — ausgerechnet an
   dem System, das **nicht** an die real gemessene Inhaltshöhe gekoppelt ist. Ob das optisch
   ausreichend als „mehrere sichtbare Einzelseiten" (Backlog-Wortlaut) wahrgenommen wird, ist bislang
   nicht visuell verifiziert.
4. **KORREKTUR gegenüber früherem Entwurf — Seitenformat/Ränder werden inzwischen sehr wohl
   geschrieben (aus derselben festen Quelle), aber weiterhin nie gelesen.** Ein früherer Entwurf
   dieser Datei behauptete, der DOCX-Writer schreibe „**kein** `w:pgSz`, **kein** `w:pgMar` … jemals"
   und eine in Word geöffnete Datei falle deshalb auf Words Locale-Default (z. B. Letter) zurück.
   Das ist **nicht mehr zutreffend**. Verifiziert wurde:
   - `src/formats/docx/pageSetup.ts`, `defaultPageSetupXml()` erzeugt
     `<w:pgSz w:w="11906" w:h="16838"/>` **und**
     `<w:pgMar w:top="1417" w:right="1417" w:bottom="1417" w:left="1417" w:header="708" w:footer="708" w:gutter="0"/>`
     — die Werte kommen über `mmToTwips()` aus **denselben** `pageGeometry.ts`-Konstanten wie die
     Bildschirmsimulation (11906/16838 Twips = 210/297 mm = A4; 1417 Twips = 25 mm). `docx/writer.ts`
     hängt diesen Block über `sectPrExtra += defaultPageSetupXml()` an, und `buildDocumentXml`
     schreibt ihn in `<w:body>…<w:sectPr>${sectPrExtra}</w:sectPr></w:body>`. Der DOCX-Export
     transportiert also **aktiv** A4/25 mm.
   - `src/formats/odt/writer.ts` (`buildStylesXml`) schreibt
     `<style:page-layout style:name="PL1"><style:page-layout-properties fo:margin="${mmToCm(PAGE_MARGIN_MM)}" fo:page-width="${mmToCm(PAGE_WIDTH_MM)}" fo:page-height="${mmToCm(PAGE_HEIGHT_MM)}"/></style:page-layout>`
     (Ergebnis: `fo:margin="2.5cm" fo:page-width="21cm" fo:page-height="29.7cm"`) — ebenfalls aus
     `pageGeometry.ts` abgeleitet, nicht als Literal-String. `<style:master-page style:name="Standard"
     style:page-layout-name="PL1">` referenziert diese Geometrie.
   - **Neuer, wichtiger Positiv-Befund daraus:** Bildschirm, DOCX-Export und ODT-Export sind jetzt
     **konsistent** auf A4/25 mm, weil alle drei aus `pageGeometry.ts` speisen — die im alten Entwurf
     befürchtete DOCX-„fällt-auf-Letter-zurück"-Divergenz existiert nicht (mehr).
   - **Was aber unverändert fehlt (die eigentliche, weiter gültige Lücke): die Lese-Seite.**
     `src/formats/docx/reader.ts` liest den `w:sectPr` **ausschließlich** für `headerReference`/
     `footerReference` aus — **kein** `w:pgSz`, **kein** `w:pgMar` (per Grep über die gesamte Datei
     bestätigt: null Treffer). `src/formats/odt/reader.ts` liest `style:master-page` **nur** für
     `style:header`/`style:footer`, **nicht** `fo:page-width`/`fo:page-height`/`fo:margin*` des
     zugehörigen `style:page-layout`.
   - **Konsequenz (präzisiert):** Ein importiertes Dokument mit **abweichendem** Ursprungsformat
     (US Letter/Legal, individuelle Ränder) wird nicht nur A4/25 mm **angezeigt**, sondern beim Export
     auch **aktiv nach A4/25 mm überschrieben** — die Originalgeometrie geht schon beim Import
     verloren (nie erfasst) und wird durch die feste Standardgeometrie ersetzt. Das ist ein realer,
     dokumentationspflichtiger **Informationsverlust auf Seitenformat-Ebene** (kein Textverlust). Er
     ist zufällig unschädlich, solange alle Dokumente ohnehin A4/25 mm sind (aktuell plausibel, da
     `seitenraender`/`seitenausrichtung`/`papierformat` „fehlt"); sobald eines dieser Features gebaut
     wird, müssen **beide Reader** die tatsächliche Dokumentgeometrie erfassen und **pageLayout.ts**
     auf eine daraus abgeleitete, nicht mehr hartkodierte Geometrie umgestellt werden. Bis dahin ist
     A4/25 mm überall explizit als **feste Annahme, nicht gelesene Eigenschaft** zu dokumentieren.
5. **Keine Kopf-/Fußzeilen-Darstellung in der Seitenansicht.** `WordEditor.tsx` rendert
   ausschließlich `doc.content.body`; `header`/`footer` werden nirgends im Editor angezeigt
   (`src/app/DocumentWorkspace.tsx` enthält per Grep **keinerlei** Referenz auf `header`/`footer`).
   Der Inhalt bleibt beim Bearbeiten unangetastet erhalten (`dispatchTransaction` reicht via
   `{ ...doc.content, body: newState.doc.toJSON() }` `header`/`footer` unverändert durch), ist aber
   für die Nutzerin in der Seitenansicht **unsichtbar**, obwohl eine echte Druckansicht in
   Word/LibreOffice Kopf-/Fußzeile auf jeder simulierten Seite zeigt. Deckt sich mit
   `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 9 („kein UI-Weg" für Kopf-/Fußzeile) — hier zusätzlich
   relevant, weil es die Seitenansicht selbst unvollständig macht.
6. **Strukturelles Drift-Risiko zwischen Hintergrundraster und tatsächlicher Umbruchposition
   (verifiziert, mit durchgerechnetem Beispiel).** Das Hintergrundmuster aus `pageBackgroundStyle()`
   wiederholt sich mit **fester** Pixel-Periode (`PAGE_CONTENT_HEIGHT_PX + PAGE_GAP_PX`) ab festem
   Offset (`backgroundPositionY: PAGE_MARGIN_PX`) — es nimmt implizit an, dass jede Seite exakt
   `PAGE_CONTENT_HEIGHT_PX` Pixel Inhalt trägt, bevor die nächste Lücke beginnt. `computePageBreakIndices`
   bricht jedoch **vor** dem Block um, der die Seite zum Überlaufen brächte; die tatsächlich
   aufsummierte Höhe vor einem Umbruch (`cumulative`) ist damit in aller Regel **kleiner** als
   `PAGE_CONTENT_HEIGHT_PX`. Konkret gegen den echten Algorithmus **und** einen bestehenden Unit-Test
   (`pagination.test.ts`: `computePageBreakIndices([200,200,200,200], 300) = [1,2,3]`): jede simulierte
   Seite trägt hier nur 200 von 300 px Inhalt, der Spacer wird nach 200 px eingefügt, während das
   statische Raster die nächste Seite erst nach 300 px beginnt — **100 px Versatz pro Seite**, der
   sich über mehrere Seiten akkumuliert. Da der Spacer selbst unsichtbar ist (Befund 3), ist es das
   **nicht** an den Inhalt gekoppelte Hintergrundraster, das die sichtbaren Seitenkanten bestimmt —
   der Inhalt „wandert" also relativ zu den gezeichneten Blättern. Dies ist die plausible,
   aus dem Code hergeleitete Konkretisierung des in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 8/20.3 als
   „offen/ungeklärt" markierten Verdachts auf unerklärten Leerraum und muss vor Abnahme **visuell**
   über **mehrere** Seiten hinweg verifiziert werden (nicht nur auf Seite 1/2).
7. **Kein Resize-Listener.** `createPaginationPlugin()` rechnet ausschließlich im Plugin-`view`-Hook
   (`init` + `update`, ausgelöst durch ProseMirror-State-Änderungen) neu — es gibt **keinen**
   `window`-`resize`-Listener (`WordEditor.tsx` registriert nur `mousedown`/`mouseup` für die
   Selektions-Reconciliation, nichts für Resize). Wird das Browserfenster nach dem Laden verkleinert/
   vergrößert oder die Zoomstufe geändert, ohne dass eine weitere Transaktion läuft, bleibt die
   Paginierung auf altem Stand, bis irgendeine Bearbeitung eine neue Transaktion auslöst.
8. **Kein Reflow bei asynchron nachladenden Bildern.** Ein per `<img>` eingefügtes Bild lädt
   asynchron; sein `onload` löst **keine** ProseMirror-Transaktion aus. Die Höhenmessung kann daher
   zum Messzeitpunkt noch Platzhaltergröße (oder 0) statt der endgültigen Bildhöhe sehen, ohne dass
   danach automatisch neu gemessen wird — bis eine andere Aktion (z. B. Tippen) den nächsten
   `rAF`-Messzyklus anstößt.
9. **Feste Pixelbreite ist nicht responsiv — Viewport-Maße jetzt exakt gegen die installierte
   Playwright-Version verifiziert, nicht nur geschätzt.** `PAGE_WIDTH_PX` (= 794 px, exakte Rechnung
   siehe Befund 2) wird in `WordEditor.tsx` unabhängig vom Viewport als
   Inline-`style={{ width: PAGE_WIDTH_PX, padding: ... }}` gesetzt. Per `node -e "require('@playwright/test').devices"`
   gegen die im Repo installierte Version ausgelesen: `playwright.config.ts`s Projekt `Mobile`
   (`devices['Pixel 7']`) hat eine CSS-Viewport-Breite von **412 px**, Projekt `Tablet`
   (`devices['iPad Mini']`) von **768 px** — beide **schmaler** als die feste `PAGE_WIDTH_PX` (794 px),
   nicht nur „in derselben Größenordnung". Der äußere Container hat `overflow-auto` **und**
   gleichzeitig `flex justify-center` (aus `WordEditor.tsx` verifiziert:
   `className="flex-1 overflow-auto ... flex justify-center py-8"`) — die feste 794-px-Seite wird
   also in einem zu schmalen, zentrierenden Flex-Scrollcontainer gerendert. Das ist eine zusätzliche,
   bisher nicht benannte Präzisierung des Risikos: „center"-Ausrichtung eines überlaufenden
   Flex-Kindes plus `overflow-auto` ist browser-/Engine-abhängig dafür bekannt, dass der frühe
   (linke) überlaufende Teil ohne „safe"-Center-Fallback nur durch Scrollen erreichbar ist, während
   der Startpunkt beim Laden ggf. bereits abgeschnitten im sichtbaren Bereich liegt — ob genau dieses
   Verhalten hier zutrifft, ist **nicht** aus dem Quelltext allein entscheidbar (reines CSS-Verhalten
   der jeweiligen Browser-Engine) und muss **visuell** in beiden Playwright-Projekten geprüft werden,
   zusätzlich zur ursprünglichen Frage, ob eine 794 px breite, nicht schrumpfende Seite auf einem
   Mobile-Viewport die in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 8, Testfall 5 geforderte „mindestens
   lesbar"-Schwelle erfüllt. Beides ist **nicht verifiziert** und laut Code-Befund eher unwahrscheinlich
   ohne Zoomen/Scrollen.
10. **Seiten-Hintergrund ist hartkodiert weiß, unabhängig vom Farbschema.** `pageBackgroundStyle()`
    verwendet das Literal `white` (nicht theme-aware), während der umgebende Scroll-Container
    `bg-neutral-200 dark:bg-neutral-950` nutzt. Das entspricht dem Referenzverhalten von Word/
    LibreOffice (das Papier bleibt auch im Dark Mode weiß) — ist aber nirgends als bewusste
    Entscheidung dokumentiert und muss als solche bestätigt werden. Es gibt zudem **keinen**
    In-App-Umschalter für Light/Dark (Tailwind v4 Default: `prefers-color-scheme`-Medienabfrage),
    d. h. Verifikation muss über Browser-/OS-Emulation erfolgen, nicht über einen In-App-Klick.
11. **Keine Seitenzahl-Anzeige, kein Zoom, keine Mehrfach-Seiten-Nebeneinander-Ansicht, kein Lineal,
    kein Formatierungszeichen-Toggle, kein Navigationsbereich.** Keiner dieser Backlog-Slugs
    (`zoom-stufe`, `zoom-seitenbreite`, `mehrere-seiten-anzeigen`, `lineal-anzeigen`,
    `formatierungszeichen-toggle`, `navigationsbereich`) hat eine UI-Entsprechung — deckt sich mit
    dem Backlog-Status „fehlt" (per Grep gegen `specs/FEATURE-BACKLOG.md` bestätigt: alle sechs Slugs
    dort mit Status „fehlt" geführt; die einzige Fundstelle des Wortes „Zoom" im Quellcode (`src/`,
    außerhalb von Spezifikationsdateien) ist eine unabhängige Beschreibung des noch nicht begonnenen,
    separaten PDF-Formats in `src/formats/registry.ts` — ohne jeden Bezug zu dieser Ansicht). Hier nur
    Cross-Referenz, kein Blocker für diese Datei.
    **Ergänzender Befund (per Grep neu verifiziert):** `computePageCount()` — die Funktion, die eine
    künftige Seitenzahl-Anzeige naheliegend nutzen würde — existiert bereits in `pagination.ts` und ist
    exportiert, hat aber **aktuell keinen einzigen Aufrufer außerhalb ihres eigenen Unit-Tests**
    (`pagination.test.ts`); `measureAndBuildDecorations` ruft ausschließlich `computePageBreakIndices`
    direkt auf. Ebenso ist `PAGE_CONTENT_WIDTH_PX` aus `pageLayout.ts` exportiert, aber **projektweit
    nirgends referenziert** (auch nicht in Tests) — der gleiche Zahlenwert entsteht in `WordEditor.tsx`
    faktisch nur implizit durch `width: PAGE_WIDTH_PX` plus `padding: PAGE_MARGIN_PX` unter Tailwinds
    globalem `box-sizing: border-box`-Preflight (`@import 'tailwindcss'` in `src/index.css`), nicht
    über die benannte Konstante. Das ist kein Funktionsfehler, aber ein dokumentationspflichtiger
    Hinweis: eine spätere Seitenzahl-Anzeige (Element 6) fände bereits eine fertige, korrekt getestete
    Berechnungsfunktion vor, statt bei null anzufangen — und `PAGE_CONTENT_WIDTH_PX` ist toter Code, der
    bei einer Aufräumaktion entweder verwendet oder entfernt werden sollte.
12. **Keine automatisierte Verifikation außerhalb reiner Arithmetik-Unit-Tests.**
    `src/formats/shared/editor/__tests__/pagination.test.ts` deckt ausschließlich
    `computePageBreakIndices`/`computePageCount` als reine Zahlenfunktionen ab (10 Fälle: leer,
    exakter Fit, Überlauf, Reset nach Umbruch, nie vor dem ersten Block, überdimensionierter
    Einzelblock, nicht-positive Seitenhöhe usw.) — es gibt **keinen** Test für tatsächliches
    Rendering, Screenshots, DOM-Struktur (`page-break-spacer`-Elemente), Viewport-Verhalten oder das
    Zusammenspiel mit echten Dokumenten (Bilder, Tabellen, Listen). `tests/e2e/` enthält keine Datei
    mit Bezug zu Seitenlayout/Paginierung.
13. **Kein Bezug zu Drucken/PDF.** Es existiert kein `@media print`-Stylesheet und kein
    `window.print()`-Aufruf — „Drucken" (Backlog-Slug `drucken`) ist ein separates, als „fehlt"
    markiertes Feature und nicht Teil dieser Datei.
14. **`page-break-spacer` ist nachweislich eine reine View-Decoration, kein Dokument-Node.**
    `pagination.ts` erzeugt ausschließlich `Decoration.widget(...)` und dispatcht die
    Decoration-Änderung über `tr.setMeta(paginationKey, next)` — eine solche Transaktion verändert
    `tr.doc` nicht (`tr.docChanged` bleibt `false`), sodass `WordEditor.tsx`s
    `dispatchTransaction`-Handler (`if (tr.docChanged) { onChangeRef.current(...) }`) für reine
    Paginierungs-Updates **keinen** `onChange`-Aufruf auslöst. Durch Code-Lektüre bestätigt korrekt
    (keine Gefahr, dass Paginierungs-Artefakte in den exportierten Dateiinhalt gelangen), aber
    **nicht durch einen automatisierten Regressionstest abgesichert** — zusätzlich erschwert dadurch,
    dass `paginationKey` in `pagination.ts` **modul-privat** (nicht exportiert) ist, sodass ein
    solcher Test aktuell gar nicht ohne vorherigen Export des Schlüssels geschrieben werden kann.

**Konsequenz:** Die Backlog-Einstufung „vorhanden" ist im engen Sinn zutreffend (es gibt eine
Darstellung mit optisch simulierten Einzelseiten und automatischem Umbruch bei Überlauf), aber in
mehrfacher Hinsicht ungeprüft und mit mindestens einem konkret aus dem Code ableitbaren
Darstellungsrisiko (Befund 6, verschärft durch Befund 3) sowie mehreren dokumentationspflichtigen
Lücken (Befunde 4, 5, 9, 11, 14) behaftet. Der wichtigste Einzelbefund dieser Re-Verifikation ist,
dass sich der Code seit dem ersten Entwurf verändert hat (Seitengeometrie wird jetzt **exportiert**,
Befund 4) — ein Beleg dafür, dass die Verifikation gegen den **aktuellen** Code laufen muss und ein
früherer Schnappschuss nicht ausreicht. Diese Datei beschreibt den Soll-Zustand für die vollständige
Verifikation (und, wo nötig, Nachbesserung) dieser Funktion.

---

## 1. Menüpunkte / Bedienelemente (Soll-Zustand)

| # | Element | Auslösung | Aktueller Stand (Befund) | Soll |
|---|---|---|---|---|
| 1 | Erkennbare Kennzeichnung „Seitenlayoutansicht" irgendwo in der UI | — (Label/Status) | **Fehlt komplett** — kein Text/Icon benennt den aktuellen Modus | Mindestens intern eindeutig als „Seitenlayoutansicht" dokumentiert (z. B. stabiles `data-view-mode`-Attribut als Test-/Zukunftshaken); sobald künftig Alternativ-Ansichten (Weblayout etc.) eingeführt werden, muss ein sichtbarer Umschalter mit klarer Kennzeichnung des aktiven Modus existieren — für die aktuelle Abnahme genügt eindeutige Doku, kein Blocker für UI-Neubau |
| 2 | Sichtbare Einzelseiten (weiße „Blätter" mit Rand, Zwischenraum, Schatten) | — (reine Darstellung, kontinuierlich beim Scrollen) | Vorhanden über CSS-Hintergrundstreifen (`pageBackgroundStyle`); der JS-berechnete Spacer (`pagination.ts`) trägt visuell **nichts** bei (nur `width:100%`, Befund 3); **ein einziger** äußerer Schatten für den gesamten Stapel statt je Seite | Muss visuell eindeutig als **mehrere getrennte Blätter** wahrgenommen werden (nicht nur als eine lange Fläche mit Streifen) — Screenshot-Verifikation über mind. 3 Seiten erforderlich; empfohlen wird, die sichtbare Seitenkante an die real gemessene Umbruchstelle zu koppeln (behebt zugleich Befund 6) statt an das unabhängige Hintergrundraster |
| 3 | Seitenrand (Simulation der Word-/LibreOffice-Papierränder) | — | Vorhanden, fest A4/25 mm aus `pageGeometry.ts`; wird beim Export inzwischen **aktiv** nach DOCX (`w:pgMar`) und ODT (`fo:margin`) geschrieben, aber aus keiner importierten Datei **gelesen** (Befund 4) | Für alle aktuell unterstützten Dokumente korrekt; muss als **feste Annahme, nicht gelesener Wert** dokumentiert werden; sobald Seitenformat/-ränder einstellbar/lesbar werden, muss die Anzeige **und** der Export aus der tatsächlichen Dokumentgeometrie abgeleitet werden |
| 4 | Automatischer Seitenumbruch bei Inhaltsüberlauf | — (laufzeitberechnet bei jeder Änderung) | Vorhanden (`computePageBreakIndices`/`createPaginationPlugin`), Genauigkeit/Drift noch zu verifizieren (Befund 6) | Muss zuverlässig, ohne sichtbaren Versatz zwischen sichtbarer Seitenkante und tatsächlicher Umbruchstelle funktionieren, auch bei Bildern/Tabellen/mehr als 2 Seiten |
| 5 | Kopf-/Fußzeilen-Anzeige je simulierter Seite | — | **Fehlt komplett** (Befund 5) | Muss ergänzt werden, sobald das Kopf-/Fußzeile-Feature (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 9 / `kopfzeile-bearbeiten-req.md`) UI-seitig existiert; bis dahin explizit als **bekannt und dokumentationspflichtig** festgehalten, kein stiller Verzicht |
| 6 | Seitenzahl-/Gesamtseitenzahl-Anzeige (z. B. „Seite 2 von 5") | — | Fehlt in der UI (Backlog: nicht separat geführt, implizit Teil dieser Ansicht); die dafür nötige Berechnung (`computePageCount`) existiert bereits, ist aber aktuell **toter Code ohne Aufrufer** außerhalb ihres eigenen Unit-Tests (Befund 11) | Empfohlen (vgl. `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 8, Testfall 2). Kein Blocker; sobald gebaut, muss die Anzeige exakt mit der tatsächlichen Seitenzahl (`computePageCount`, dann erstmals produktiv verdrahtet) übereinstimmen |
| 7 | Zoom-Regler / Zoom auf Seitenbreite | Klick/Regler | Fehlt (Backlog-Slugs `zoom-stufe`, `zoom-seitenbreite`) | Kein Blocker — Cross-Referenz; falls gebaut, muss die Seitengeometrie (Abschnitt 3) weiterhin korrekt skalieren (Vorsicht: `getBoundingClientRect` misst im transformierten Koordinatenraum — eine CSS-`transform: scale()` würde die Höhenmessung verfälschen) |
| 8 | Umschalt-Möglichkeit zu anderen Ansichten (Weblayout/Entwurf/Gliederung/Lesemodus) | Klick | Fehlt komplett (alle „fehlt" im Backlog) | Kein Blocker — aktueller Zustand („nur ein Modus") ist explizit als Ist-Zustand zu dokumentieren, nicht stillschweigend als „mehrere Ansichten vorhanden" misszuverstehen |
| 9 | Reaktion auf Tablet-/Mobile-Viewport (horizontales Scrollen vs. Skalierung) | — (responsive Verhalten) | Feste Pixelbreite (`PAGE_WIDTH_PX` = 794 px) breiter als beide Playwright-Viewports (`Tablet`/iPad Mini = 768 px, `Mobile`/Pixel 7 = 412 px, exakt verifiziert); Scrollcontainer hat `overflow-auto` **zusammen mit** `flex justify-center`, ungetestet ob „lesbar"/„bedienbar" und ob die Center-Ausrichtung das Scrollen zum linken Seitenrand behindert (Befund 9) | Muss auf den bestehenden Playwright-Projekten `Tablet` und `Mobile` explizit geprüft und das Ergebnis (Scrollen akzeptabel vs. Skalierung nötig, inkl. ob der linke Seitenrand trotz `justify-center` erreichbar bleibt) dokumentiert werden |
| 10 | Verhalten bei Fenster-Resize nach dem Laden eines Dokuments | Browser-Resize | Kein Resize-Listener (Befund 7) — Paginierung friert auf altem Stand ein, bis die nächste Bearbeitung erfolgt | Zu entscheiden und zu dokumentieren, ob das akzeptabel ist oder ein `resize`-Listener ergänzt werden muss — kein stiller Freifahrtschein, siehe Grenzfall 8 |

---

## 2. Geltende Randbedingungen aus der Haupt-Spezifikation

Diese Datei ergänzt, ersetzt aber nicht die Anforderungen aus `FEATURE-SPEC-DOCX-ODT.md`,
insbesondere:

- Abschnitt 8 („Seitenlayout & Paginierung") — der direkte Ursprung dieser Datei, insbesondere:
  - „Sichtbare Seiten im A4-Format mit realistischen Rändern."
  - „Inhalt, der eine Seite füllt, fließt sichtbar auf eine zweite Seite über."
  - Der als **offen und ungeklärt** markierte Punkt zum „auffälligen Leerraum" bei kurzen Dokumenten
    — siehe Befund 6 für eine konkrete, aus dem Code hergeleitete mögliche Ursache.
  - Testfall 4/5 (Tablet-/Mobile-Viewport) — siehe Befund 9/Element 9.
- Abschnitt 9 (Kopf-/Fußzeilen) — Cross-Referenz zu Befund 5/Element 5; die fehlende Anzeige ist ein
  Symptom des dort beschriebenen größeren Problems (kein UI-Weg für Kopf-/Fußzeile überhaupt).
- Abschnitt 15/18 (Sonderelemente, Import-Robustheit): Prinzip „kein stiller Datenverlust" gilt
  sinngemäß — auch wenn diese Ansicht rein präsentational ist, darf sie nie dazu führen, dass Inhalt
  beim Bearbeiten über eine Seitengrenze hinweg verloren geht (Abschnitt 4, Grenzfall 9). Der in
  Befund 4 beschriebene Seitenformat-Überschreibungs-Effekt ist ausdrücklich **kein** Textverlust,
  aber als Format-Informationsverlust zu dokumentieren.
- Abschnitt 19 (Export-Robustheit & Rundreise) und Abschnitt 20.4 (kein stiller Fehlschlag) gelten
  uneingeschränkt.
- Abschnitt 20.3 ausdrücklich: „Seitenlayout-Darstellung: … Klärung, ob der sichtbare Abstand über
  kurzem Text ein normaler Seitenrand oder ein Darstellungsfehler ist; Ergebnis dieser Klärung wird
  hier nachgetragen." — diese Datei liefert die technische Grundlage (Befund 6) und macht die
  Verifikationsschritte explizit (Abschnitt 6).
- Abschnitt 2 (Selection-Sync-Bug): Tippen unmittelbar an/über einer automatisch eingefügten
  Umbruch-Decoration ist strukturell ein ähnlicher Verdachtsfall (Cursor-Positionierung nahe einem
  Widget mit `side: -1`) und muss mit derselben Sorgfalt getestet werden (Grenzfall 9). Der bereits
  im Code vorhandene `reconcileSelectionOnClick`-Mechanismus (`WordEditor.tsx`) ist der Fix für die
  Grundvariante dieses Bugs und darf durch die Seitenansicht nicht unterlaufen werden.
- `seitenumbruch-req.md` Abschnitt 3.8 („Zusammenspiel mit der automatischen Paginierung"): diese
  Datei beschreibt die automatische Paginierung selbst; das dortige Dokument beschreibt nur deren
  Zusammenspiel mit dem (noch nicht gebauten) manuellen Umbruch — beide Dateien sind komplementär,
  nicht redundant.

---

## 3. Gewünschtes Verhalten im Detail

### 3.1 Seitengeometrie und deren Herkunft
- Für alle aktuell möglichen Dokumente (kein einstellbares/lesbares Seitenformat) muss die Anzeige A4
  (210 × 297 mm) mit realistischen Rändern (25 mm) zeigen — deckt sich mit `FEATURE-SPEC-DOCX-ODT.md`
  Abschnitt 8.
- Es muss explizit dokumentiert sein, dass diese Maße **feste Annahmen** aus `pageGeometry.ts` sind,
  nicht aus der importierten Datei gelesene Werte (Befund 4). Ergänzend ist der bei der
  Re-Verifikation entdeckte, korrigierte Sachverhalt festzuhalten: diese Geometrie wird beim Export
  **aktiv** in DOCX (`w:pgSz`/`w:pgMar`) und ODT (`style:page-layout`) geschrieben — Bildschirm und
  beide Exportformate sind dadurch konsistent, aber alle drei stammen aus **einer** festen Quelle,
  nicht aus dem jeweiligen Dokument.
- Sobald Seitenformat/-ränder/-ausrichtung als Feature existieren (separate Anforderungsdateien),
  müssen (a) beide **Reader** die tatsächliche Geometrie erfassen, (b) diese Ansicht die
  tatsächlichen Werte des jeweiligen Dokuments anzeigen und (c) beide **Writer** sie unverändert
  zurückschreiben, statt weiter die Konstanten aus `pageGeometry.ts` zu verwenden.

### 3.2 Sichtbare Einzelseiten
- Die Trennung zwischen zwei simulierten Seiten muss optisch eindeutig als „hier endet eine Seite,
  hier beginnt die nächste" erkennbar sein — nicht nur als ein schmaler Farbstreifen, der mit dem
  Scrollbereich-Hintergrund verschmelzen könnte.
- Zu verifizieren: reicht der aktuelle Ein-Schatten-für-den-ganzen-Stapel-Ansatz (mit visuell
  unsichtbarem Spacer, Befund 3) aus, oder wirkt ein mehrseitiges Dokument eher wie „eine lange
  Fläche mit grauen Bändern" als wie „mehrere Blätter"? Ergebnis ist per Screenshot zu dokumentieren.

### 3.3 Automatische Umbruch-Berechnung (Pagination)
- Ein Block, der höher als eine ganze Seite ist (sehr großes Bild, sehr lange Tabelle), überläuft
  laut Code-Kommentar in `pagination.ts` **bewusst** seine eigene Seite, statt aufgeteilt zu werden
  (echtes Intra-Block-Splitting würde DOM-Knoten über mehrere Seiten duplizieren, was das
  Single-`EditorView`-Modell nicht unterstützt). Dieses Verhalten weicht vom Referenzverhalten großer
  Tabellen in Word/LibreOffice ab (dort brechen Tabellenzeilen über Seiten um, ggf. mit wiederholter
  Kopfzeile) und muss als **bewusste, dokumentierte Einschränkung** bestätigt werden (Grenzfall 4).
- Die Neuberechnung erfolgt bei jedem ProseMirror-View-Update per `requestAnimationFrame`; während
  des Tippens in einem mehrseitigen Dokument darf dies zu keinem sichtbaren Flackern/Springen der
  bereits vorhandenen Seiten führen.
- Hintergrundraster (feste Pixel-Periode) und Decoration-Spacer (aus real gemessenen Höhen) sind zwei
  unabhängig berechnete Dinge (Befund 6). Es muss visuell verifiziert werden, ob und wie stark beide
  auseinanderlaufen — insbesondere bei mehr als zwei Seiten, wo sich ein Versatz akkumuliert.

### 3.4 Kopf-/Fußzeilen in der Seitenansicht (Cross-Referenz)
- Vollständige Spezifikation ist Aufgabe von `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 9 /
  `kopfzeile-bearbeiten-req.md` / `fusszeile-bearbeiten-req.md`; hier wird nur festgehalten, dass eine
  vollständige „Seitenlayoutansicht" im Word-/LibreOffice-Sinne Kopf-/Fußzeile auf jeder simulierten
  Seite zeigt — der aktuelle Zustand (komplett unsichtbar) ist eine bekannte, zu dokumentierende
  Lücke, deren Behebung von der Umsetzung des Kopf-/Fußzeile-Features abhängt.

### 3.5 Reaktion auf Viewport-Größe (Tablet/Mobile)
- Da `PAGE_WIDTH_PX` (794 px) fest ist und **breiter** als beide konfigurierten schmalen
  Playwright-Viewports (`Tablet`/iPad Mini = 768 px CSS-Breite, `Mobile`/Pixel 7 = 412 px
  CSS-Breite — beide Werte per `devices['iPad Mini'].viewport`/`devices['Pixel 7'].viewport` aus der
  im Repo installierten `@playwright/test`-Version exakt ausgelesen, nicht geschätzt), muss geklärt
  werden, welches Verhalten auf schmalen Viewports als „Soll" gilt: horizontales Scrollen der Seite
  (aktuell technisch der Fall durch `overflow-auto`) oder eine skalierte/schrumpfende Darstellung. Das
  aktuell beobachtbare Verhalten ist zu verifizieren und explizit als Ist-Zustand festzuhalten, bevor
  eine Entscheidung über Soll-Änderungen getroffen wird. **Hinweis:** eine `transform: scale()`-Lösung
  ist nicht trivial, weil `getBoundingClientRect` im transformierten Raum misst und die
  Umbruchberechnung dann gegen eine unskalierte Grenze rechnen würde (siehe Element 7) — eine solche
  Erweiterung ist nicht Teil dieser Datei.
- **Zusätzlich zu verifizieren (aus dem Code neu präzisiert):** Der Scrollcontainer in `WordEditor.tsx`
  trägt gleichzeitig `overflow-auto` **und** `flex justify-center` — die überlaufende, feste 794-px-
  Seite wird also in einem zentrierenden Flex-Container gerendert. Ob Nutzerinnen auf einem schmalen
  Viewport tatsächlich bis zum linken Seitenrand scrollen können (statt dass der Anfang der Seite durch
  „unsafe" Center-Alignment beim Laden bereits unerreichbar abgeschnitten im Blickfeld liegt, bis aktiv
  gescrollt wird), ist reines Laufzeit-/Browser-Engine-Verhalten und **nicht** allein aus dem Quelltext
  ableitbar — erfordert einen echten visuellen/interaktiven Test auf beiden Projekten.
- Unabhängig von der Entscheidung: Toolbar-Erreichbarkeit und Grundbedienbarkeit (Tippen, Fett,
  Export) müssen auf allen drei konfigurierten Playwright-Projekten (Desktop Chrome, Tablet, Mobile)
  funktionieren (vgl. `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 8, Testfälle 4–5).

### 3.6 Reaktion auf Farbschema (Light/Dark)
- Der weiße Seiten-Hintergrund bleibt unabhängig vom Farbschema weiß (Referenzverhalten von Word/
  LibreOffice: Papier bleibt weiß). Dies ist als bewusste Entscheidung zu **bestätigen** und mit einem
  Screenshot in beiden Farbschemata zu belegen. Da kein In-App-Umschalter existiert, ist die
  Verifikation über Browser-/OS-Emulation von `prefers-color-scheme` durchzuführen.

### 3.7 Performance bei langen Dokumenten
- Bei einem Dokument mit vielen Top-Level-Blöcken (mehrere Bildschirmhöhen Text) darf die pro
  Transaktion ausgelöste Neumessung/Neuberechnung (Befund 6–7) nicht zu spürbarer Verzögerung beim
  Tippen führen. Der bestehende `sameDecorationSet`-Vergleich verhindert eine Endlos-Dispatch-Schleife,
  aber nicht wiederholte teure Neuberechnungen bei jedem Tastendruck — Performance ist unter
  realistischer Dokumentgröße zu messen, nicht nur unter synthetischer Unit-Test-Last (eine reale,
  große Fixture existiert bereits im Repo, siehe Abschnitt 6).

### 3.8 Konsistenz nach Undo/Redo und nach Block-Einfügungen
- Nach Undo/Redo, nach Bild-Einfügung, nach Tabellen-Einfügung muss die Paginierung korrekt neu
  berechnet werden (Höhenänderung löst eine neue ProseMirror-Transaktion aus, die die `rAF`-Neumessung
  anstößt) — keine „hängengebliebenen" Spacer an falscher Position, kein doppelter/fehlender Umbruch.

### 3.9 Kein Einfluss auf Rundreise-Fidelity
- Da `page-break-spacer` eine reine View-Decoration ist (Befund 14), darf die Seitenansicht selbst
  **niemals** Einfluss auf den exportierten Dateiinhalt haben — weder auf DOCX- noch auf ODT-Export.
  Dies ist durch Code-Lektüre plausibel, aber nicht durch einen Regressionstest abgesichert; der
  dafür nötige Test erfordert zudem den Export von `paginationKey` (Befund 14, Abschnitt 6).

### 3.10 Kein stiller Fehlschlag
- Der Guard `if (pageContentHeight <= 0) return []` in `computePageBreakIndices` muss verifiziert
  werden, keine fehlerhafte/NaN-Darstellung zu erzeugen, falls `PAGE_CONTENT_HEIGHT_PX` durch eine
  künftige Änderung (z. B. dynamische Ränder) auf einen nicht-positiven Wert fiele — Fallback ist eine
  einzelne, normal nutzbare Seite, kein Crash, keine leere weiße Fläche ohne Editor.

---

## 4. Grenzfälle (müssen explizit geprüft werden)

| # | Grenzfall | Erwartetes Verhalten |
|---|---|---|
| 1 | Kurzes Dokument (ein Absatz) | Seitenrand entspricht dokumentierter Sollgröße (25 mm), kein unerwarteter zusätzlicher Leerraum — direkte Umsetzung des in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 8/20.3 offen gelassenen Punkts; Ergebnis der Klärung ist hier nachzutragen. |
| 2 | Sehr langes Dokument (> 5 Seiten) | Korrekter, fortlaufender Umbruch über alle Seiten; kein sich aufsummierender sichtbarer Versatz zwischen sichtbarer Seitenkante und tatsächlicher Umbruchstelle (Befund 6) — explizit auf Seite 4/5, nicht nur auf Seite 2, zu prüfen. |
| 3 | Einzelnes Bild, das höher ist als eine ganze Seite | Bild überläuft bewusst seine eigene Seite (kein Splitting, Abschnitt 3.3) — zu bestätigen als akzeptiertes Verhalten, nicht als Darstellungsfehler misszuverstehen. |
| 4 | Sehr große Tabelle (> 1 Bildschirmhöhe) über eine simulierte Seitengrenze hinweg | Tabelle überläuft ebenso wie ein einzelnes Bild ihre Seite, ohne Zeilenumbruch/Kopfzeilenwiederholung (Abweichung vom Word-/LibreOffice-Referenzverhalten) — explizit als bekannte Einschränkung zu bestätigen, angesichts dessen, dass Tabellen laut `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6 bereits als „höchste Priorität"/nutzerseitig gemeldetes Problem gelten. |
| 5 | Viewport schmaler als die feste Seitenbreite (794 px) — betrifft beide Playwright-Projekte `Tablet` (768 px) und `Mobile` (412 px, exakt verifiziert) | Zu verifizieren und zu dokumentieren: horizontales Scrollen der Seite (aktuell technisch der Fall) muss die in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 8, Testfall 4/5 geforderte Grundbedienbarkeit (Toolbar erreichbar, Kernfunktionen nutzbar, „mindestens lesbar") tatsächlich erfüllen — nicht nur theoretisch möglich sein; zusätzlich zu prüfen, ob die Kombination `overflow-auto` + `flex justify-center` das Erreichen des linken Seitenrands per Scroll tatsächlich zulässt (Abschnitt 3.5). |
| 6 | Farbschema-Wechsel (OS-Ebene `prefers-color-scheme`, kein In-App-Umschalter) während der Bearbeitung | Seiten-Hintergrund bleibt weiß (Papier-Analogie), Kontrast zum umgebenden Chrome bleibt in beiden Schemata ausreichend — zu verifizieren per Browser-Emulation. |
| 7 | Asynchron nachladendes Bild (Höhe zum Messzeitpunkt noch nicht final) | Nach vollständigem Laden des Bildes muss die Seitenansicht spätestens bei der nächsten Bearbeitung korrekt nachziehen; sichtbar falsch berechnete Seitenumbrüche dürfen nicht dauerhaft (über mehrere Nutzeraktionen hinweg) bestehen bleiben. |
| 8 | Browserfenster wird nach dem Laden eines mehrseitigen Dokuments in der Größe verändert, ohne dass weiter bearbeitet wird | Da kein Resize-Listener existiert (Befund 7), bleibt die Paginierung auf altem Stand — zu entscheiden und explizit zu dokumentieren, ob das als akzeptabel gilt oder ein Resize-Listener ergänzt werden muss. |
| 9 | Text unmittelbar an der Stelle eingeben/löschen, an der ein automatisch berechneter `page-break-spacer` sitzt (Cursor direkt davor/danach) | Kein Textverlust, keine Vertauschung von Inhalt vor/nach dem Spacer, Cursor landet nach der Eingabe an der erwarteten Stelle — Regressionsfall analog zum Selection-Sync-Bug (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2), da der Spacer ein Widget mit `side: -1` ist. |
| 10 | Undo direkt nach einer Aktion, die eine neue Seite ausgelöst hat (viel Text eingefügt, dann rückgängig) | Seitenzahl/Umbruchpositionen rechnen sich korrekt zurück; kein „Geister-Leerraum" (übrig gebliebener Spacer ohne zugehörigen Inhalt) bleibt sichtbar. |
| 11 | Ganz leeres, frisch erstelltes Dokument | Genau eine Seite, kein unerwarteter Leerraum (`computePageBreakIndices([], …) = []`, `computePageCount = 1` — durch bestehende Unit-Tests belegt) — als Grundfall mit dem visuellen Ist-Zustand abzugleichen (Grenzfall 1). |
| 12 | Reales importiertes Dokument mit von A4/25 mm abweichendem Ursprungsformat (US Letter/Legal, individuelle Ränder) | Wird als A4/25 mm angezeigt **und** beim Export aktiv nach A4/25 mm überschrieben (`w:pgSz`/`w:pgMar` bzw. `fo:page-*`), da Format/Ränder beim Import nie gelesen werden (Befund 4) — als **bekannte, dokumentationspflichtige Einschränkung** festzuhalten (Seitenformat-Informationsverlust, **kein** Textverlust); kein stiller Blocker für die Abnahme dieser Datei, aber explizit zu vermerken, bis `seitenraender`/`seitenausrichtung`/`papierformat` umgesetzt sind. Konkrete, bereits im Repo liegende Fixture: `tests/fixtures/external/odt/a4-hoch-und-quer.odt` (verifiziert: enthält **zwei** `style:page-layout` — Hochformat 21,001 × 29,7 cm und Querformat 29,7 × 21,001 cm mit `style:print-orientation="landscape"`). |
| 12a | Dokument mit **mehreren** Abschnitten unterschiedlicher Seitengeometrie/-ausrichtung innerhalb **einer** Datei (Hoch- und Querformat gemischt, z. B. `a4-hoch-und-quer.odt`) | Verschärfung von Grenzfall 12: das aktuelle Ein-Geometrie-Modell (eine einzige feste A4-Hochformat-Geometrie aus `pageGeometry.ts` für den gesamten Editor) kann eine dokumentinterne Geometrie-/Orientierungs-Umschaltung **grundsätzlich nicht** abbilden — der Querformat-Abschnitt wird in der Anzeige wie im Export unterschiedslos als A4-Hochformat behandelt. Als bekannte, dokumentationspflichtige Einschränkung festzuhalten; **kein** Textverlust, aber vollständiger Verlust der Abschnitts-Seitengeometrie. Cross-Referenz auf ein künftiges „Abschnittswechsel/Section"-Feature (im Backlog noch nicht geführt). |
| 13 | Dokument mit vorhandener Kopf-/Fußzeile (Datenmodell vorhanden) wird angezeigt | Kopf-/Fußzeile bleibt im Datenmodell erhalten, ist aber in der Seitenansicht nicht sichtbar (Befund 5) — als bekannte Lücke zu dokumentieren, Cross-Referenz `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 9. |
| 14 | Manueller Seitenumbruch (sobald gemäß `seitenumbruch-req.md` gebaut) trifft auf automatische Paginierung | Bereits in `seitenumbruch-req.md` Abschnitt 3.8 spezifiziert — hier nur Cross-Referenz, keine Duplikat-Anforderung. |
| 15 | Datei unverändert hochladen, sofort ohne jede Interaktion exportieren, reimportieren | Da die Seitenansicht rein präsentational ist (Befund 14), darf dieser Zyklus in keinem Fall Paginierungs-Artefakte (Spacer, Hintergrundraster-Metadaten) in den exportierten Dateiinhalt einbringen — zu verifizieren trotz plausibler Korrektheit aus Code-Lektüre. |

---

## 5. Rundreise-Anforderung

Da diese Funktion rein präsentational ist (kein „Ansichtszustand" wird in der Datei gespeichert),
unterscheidet sich die Rundreise-Prüfung leicht von einer klassischen Content-Feature-Prüfung:
Kernanforderung ist, dass die Seitenansicht **niemals** Inhalt verändert oder verliert — weder durch
bloßes Anzeigen/Scrollen über mehrere simulierte Seiten hinweg, noch durch Bearbeitung unmittelbar an
einer automatisch berechneten Umbruchstelle. **Kernanforderung laut Aufgabenstellung: Datei
unverändert hochladen → Export → Re-Import erhält den Inhalt — sowohl für DOCX als auch für ODT.**

### 5.1 Baseline-Rundreise (Regressionsschutz — darf durch Paginierung nicht kaputtgehen)
1. Reale, mehrseitige DOCX-Datei (die in dieser Ansicht mehrere simulierte Seiten erzeugt)
   unverändert hochladen → sofort exportieren → erneut importieren → Inhalt entspricht inhaltlich
   exakt dem Original. Insbesondere darf keine Paginierungs-Decoration (Spacer, Hintergrundraster)
   jemals in den exportierten Dateiinhalt gelangen (vgl. Befund 14, Grenzfall 15).
2. Dasselbe mit einer realen, mehrseitigen ODT-Datei.
3. Regressionstest, der bestätigt, dass eine reine Paginierungs-Transaktion
   (`tr.setMeta(paginationKey, …)`) **kein** `tr.docChanged = true` erzeugt und folglich **nie** den
   `onChange`-Callback in `WordEditor.tsx` auslöst — aktuell nur durch Code-Lektüre plausibel, nicht
   automatisiert abgesichert; **setzt voraus, dass `paginationKey` aus `pagination.ts` exportiert
   wird** (Befund 14, Abschnitt 6).
4. Verifikations-Ergänzung zu Befund 4: Export einer **beliebigen** (auch einfachen, einseitigen)
   Datei nach DOCX enthält genau **ein** `<w:pgSz>` und **ein** `<w:pgMar>` mit den A4/25-mm-Werten;
   Export nach ODT enthält genau **ein** `<style:page-layout>` mit `fo:page-width="21cm"`,
   `fo:page-height="29.7cm"`, `fo:margin="2.5cm"`. Das ist kein Textinhalt, pinnt aber das in Befund 4
   verifizierte (korrigierte) Verhalten fest, damit ein späterer Umbau auf dokumentabgeleitete
   Geometrie nicht unbemerkt die Standardgeometrie verliert.

### 5.2 Feature-Rundreise (Seitenansicht selbst)
1. Reale, mehrseitige DOCX-Datei importieren (mehrere simulierte Seiten durch automatische
   Paginierung) → unverändert exportieren → reimportieren → Inhalt identisch **und** bei erneuter
   Anzeige entsteht eine funktional äquivalente Anzahl Seiten für denselben Inhalt (kein
   zusätzlicher/fehlender automatischer Umbruch allein durch den Export/Reimport-Zyklus, da die
   Paginierung rein laufzeitbasiert und nicht Teil des exportierten Formats ist).
2. Dasselbe mit einer realen, mehrseitigen ODT-Datei.
3. Text unmittelbar vor und unmittelbar nach einer automatisch berechneten Umbruchstelle eingeben
   (Cursor direkt an der Spacer-Position, Grenzfall 9) → Dokument als DOCX exportieren →
   reimportieren → beide Textteile bleiben in korrekter Reihenfolge und vollständig erhalten, keine
   Vertauschung, kein Verlust.
4. Dasselbe als ODT.
5. Dokument mit einem Bild, das größer als eine Seite ist (Grenzfall 3), über den automatischen
   Seitenumbruch hinweg → Rundreise erhält das Bild vollständig und unverzerrt, unabhängig vom
   Overflow-Verhalten in der Anzeige.
6. Cross-Format DOCX → ODT → DOCX eines mehrseitigen Dokuments → Inhalt bleibt über beide
   Konvertierungen hinweg vollständig erhalten (Formatierungsnuancen bei Cross-Format sind wie im Rest
   der Spezifikation zu dokumentieren, Textverlust nicht, vgl. `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 19).
7. Datei mit von A4/25 mm abweichendem Originalseitenformat importieren (konkrete, verifizierte
   Fixture: `tests/fixtures/external/odt/a4-hoch-und-quer.odt` — gemischtes Hoch-/Querformat),
   unverändert exportieren, reimportieren → **Textinhalt** bleibt vollständig erhalten. Dass die Ausgabe stattdessen die
   **feste** A4/25-mm-Geometrie trägt (Import liest die Originalgeometrie nie, Export schreibt immer
   A4/25 mm, Befund 4), ist **kein** Bruch der Rundreise-Anforderung im Sinne dieser Datei (kein
   Textverlust), muss aber als bekannter, gesondert zu behebender Seitenformat-Informationsverlust
   explizit dokumentiert werden. Zu unterscheiden vom alten (überholten) Befund, dass „nichts"
   geschrieben werde: die Ausgabe ist jetzt aktiv A4/25 mm, nicht Words Locale-Default.

**Abnahmekriterium:** Nuancen bei Formatierung/Layout (abweichendes Seitenformat, Cross-Format-
Feinheiten) sind zu dokumentieren und akzeptabel; **das Verschwinden oder Vertauschen von Textinhalt
durch die Seitenansicht selbst ist es nicht.**

---

## 6. Testplan-Hinweise (Unit + E2E, Playwright)

1. **Bestehende Unit-Tests erhalten und erweitern:** `pagination.test.ts` deckt bereits Kernfälle von
   `computePageBreakIndices`/`computePageCount` ab (leer, exakter Fit, Überlauf, Reset, nie vor dem
   ersten Block, überdimensionierter Einzelblock, nicht-positive Seitenhöhe) — beizubehalten als
   Regressionsschutz.
2. **Neuer Unit-Test (Rundreise-Absicherung, Abschnitt 5.1 Punkt 3):** eine Transaktion, die
   ausschließlich `tr.setMeta(paginationKey, decorationSet)` setzt, muss `tr.docChanged === false`
   ergeben. **Voraussetzung:** `paginationKey` muss aus `pagination.ts` exportiert werden (aktuell
   modul-privat, Befund 14) — ein neu erzeugter zweiter `PluginKey('pagination')` ist **nicht**
   derselbe Schlüssel (Identität, nicht String), der Test wäre sonst nicht schreibbar.
3. **E2E-Test (Playwright), mehrseitiges Dokument:** genug Text eingeben/einfügen, um automatisch
   mindestens 3 Seiten zu erzeugen → prüfen, dass mindestens zwei `.page-break-spacer`-Elemente in
   der erwarteten Reihenfolge im DOM erscheinen, und dass die Anzahl konsistent zu `computePageCount`
   ist (`pageCount === Spacer-Anzahl + 1`). Dieser Test wäre die **erste** produktionsnahe Verwendung
   von `computePageCount` überhaupt (Befund 11: aktuell nur im eigenen Unit-Test aufgerufen) — er
   sichert also nicht nur die Paginierung ab, sondern verifiziert erstmals, dass die Funktion mit real
   im DOM gemessenen Höhen dasselbe Ergebnis liefert wie mit den synthetischen Zahlen aus
   `pagination.test.ts`.
4. **Screenshot-Regressionstest, kurzes Dokument:** ein Absatz kurzer Text → Screenshot-Vergleich des
   oberen Randbereichs gegen die dokumentierte Sollgröße (25 mm) — liefert die in Abschnitt 4,
   Grenzfall 1 und `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.3 geforderte Klärung.
5. **Screenshot-Regressionstest, langes Dokument (≥ 4 Seiten):** Vergleich der Übergänge zwischen
   Seite 1/2 **und** Seite 3/4, um einen möglichen kumulativen Versatz (Befund 6) aufzudecken, der bei
   einem reinen Zwei-Seiten-Test unsichtbar bliebe.
6. **Viewport-Tests auf bestehenden Playwright-Projekten `Tablet` (768 px) und `Mobile` (412 px):**
   Editor mit einem realen Dokument öffnen → Toolbar-Erreichbarkeit, Kern-Bedienbarkeit (Tippen, Fett,
   Export) sowie tatsächliches Scroll-/Lese-Verhalten der simulierten Seite prüfen — explizit
   einschließlich eines Scroll-zum-linken-Rand-Checks (`scrollLeft` nach `scrollIntoView`/manuellem
   Scroll auf `0` setzbar trotz `flex justify-center`, Abschnitt 3.5) — und das Ergebnis explizit als
   Ist-Zustand festhalten (Grenzfall 5).
7. **Farbschema-Test:** Rendering mit emulierter `prefers-color-scheme: dark` und `: light` →
   Seiten-Hintergrund bleibt weiß, ausreichender Kontrast zum Chrome in beiden Fällen (Grenzfall 6).
8. **Regressionstest analog Selection-Sync-Bug (Grenzfall 9):** Cursor exakt an einer automatisch
   berechneten Umbruchstelle positionieren (Text eingeben, der einen Umbruch erzwingt), dort tippen/
   löschen, danach Klick zum Neupositionieren + Tippen → beide Textteile bleiben korrekt getrennt und
   vollständig erhalten. Sinnvoll als Ergänzung der bestehenden `tests/e2e/selection-regression.spec.ts`.
9. **Resize-Test:** Dokument mit mehreren Seiten laden, Browserfenster verkleinern/vergrößern **ohne**
   weitere Bearbeitung → prüfen, ob (wie laut Code erwartet) keine automatische Neuberechnung erfolgt,
   und das Ergebnis explizit als akzeptables oder zu behebendes Verhalten dokumentieren (Grenzfall 8).
10. **Export-Geometrie-Test (neu, sichert Befund 4 ab):** Export einer einfachen Datei nach DOCX →
    `word/document.xml` enthält genau ein `<w:pgSz>` (A4-Twips) und ein `<w:pgMar>` (25-mm-Twips);
    Export nach ODT → `styles.xml` enthält genau ein `<style:page-layout>` mit
    `fo:page-width="21cm"`/`fo:page-height="29.7cm"`/`fo:margin="2.5cm"`. Pinnt das korrigierte,
    aktuell korrekte Verhalten fest, damit ein späterer Umbau auf dokumentabgeleitete Geometrie nicht
    unbemerkt die Standardgeometrie oder ihre Konsistenz mit der Bildschirmsimulation verliert.
11. **Rundreise-Tests aus Abschnitt 5** sind sowohl als Unit-Tests gegen Reader/Writer **als auch**
    als E2E-Test über echte Bedienung (echter Upload → echter Download → echter Re-Upload) zu führen —
    reine Unit-Tests mit direkt konstruierten ProseMirror-JSON-Fixtures allein reichen nicht aus (vgl.
    `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 17/21).
12. **Reale Test-Fixtures (alle Namen am 2026-07-05 gegen das Repo verifiziert):** mindestens eine
    mehrseitige, mit echtem Microsoft Word erzeugte DOCX-Datei und eine mehrseitige, mit echtem
    LibreOffice Writer erzeugte ODT-Datei sind für die Screenshot- und Rundreise-Tests heranzuziehen.
    Unter `tests/fixtures/external/{docx,odt}/` liegen bereits mehrere seitenumbruch-/mehrseiten-nahe
    Fixtures, deren Eignung zu prüfen ist, bevor neue beschafft werden — verifiziert vorhanden:
    - DOCX: `saut_page.docx` (Seitenumbruch), `DiffFirstPageHeadFoot.docx`,
      `PageSpecificHeadFoot.docx`, `MultipleBodyBug.docx`.
    - ODT: `pagebreaks.odt`, `pageBreakProblem.odt`, `AB_pageBreakBefore.odt`,
      `35585_-_no_pagebreak.odt` / `no_pagebreak.odt` (Gegenprobe „kein Umbruch") sowie —
      besonders wertvoll für Grenzfall 12/12a — `a4-hoch-und-quer.odt` bzw. dessen kleinere Variante
      `a4-hoch-und-quer-SMALL.odt` (verifiziert gemischtes Hoch-/Querformat, siehe Grenzfall 12).
    Für den Performance-Punkt (Abschnitt 3.7) existiert bereits eine große reale Datei im Repo
    (`tests/fixtures/external/docx/bug65649.docx`, ~475 kB, ~16 000 Absätze — Existenz und Größe am
    2026-07-05 bestätigt) — der zugehörige Import-/Performance-E2E-Test fehlt aber noch und ist zu
    ergänzen. **Grundsatz (vgl. Memory „Verify names thoroughly"):** kein Fixture-Name darf ungeprüft
    aus einer früheren Fassung übernommen werden; jeder in dieser Datei genannte Dateiname ist vor
    Test-Erstellung erneut gegen das Dateisystem zu prüfen, da sich der Fixture-Bestand ändert.

---

## 7. Freigabekriterium für „vorhanden"

Der Backlog-Status von `seitenlayout-ansicht` darf erst dann als **vorhanden** (unqualifiziert, im
Sinne einer geprüften, verlässlichen Druckansicht statt eines bloßen „einzigen verfügbaren Modus
mangels Alternative") gelten, wenn:

- alle Bedienelemente/Darstellungsaspekte aus Abschnitt 1 tatsächlich existieren und wie spezifiziert
  funktionieren,
- alle Testfälle aus Abschnitt 6 automatisiert vorliegen und grün sind, insbesondere die
  Screenshot-Regressionstests für kurze **und** lange Dokumente (Abschnitt 6, Punkte 4–5), die die in
  `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.3 offen gelassene Frage zum unerklärten Leerraum
  abschließend beantworten,
- die Grenzfälle aus Abschnitt 4 einzeln befundet sind (funktioniert wie spezifiziert / bewusst
  abweichendes, dokumentiertes Verhalten / repariert),
- Abschnitt 5.1 (Baseline-Rundreise) bestätigt, dass die Paginierung unter keinen Umständen Einfluss
  auf exportierten Dateiinhalt nimmt (inkl. des `docChanged`-Regressionstests, der den Export von
  `paginationKey` voraussetzt),
- Abschnitt 5.2 (Feature-Rundreise) für DOCX, ODT und die Cross-Format-Richtung besteht,
- der Regressionstest aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2 (Selection-Sync-Bug) explizit mit
  einer Bearbeitung direkt an einer automatischen Umbruchstelle nachgestellt und grün ist,
- die bekannten, dokumentationspflichtigen Lücken einzeln entweder behoben oder als bewusst
  akzeptierte, dokumentierte Einschränkung festgehalten sind — nicht stillschweigend offen bleiben:
  - fehlende Kopf-/Fußzeilen-Anzeige (Befund 5),
  - festes A4/25-mm-Format aus `pageGeometry.ts`, das beim Export aktiv geschrieben, beim Import aber
    nie gelesen wird → abweichende Originalformate werden überschrieben (Befund 4 — der korrigierte,
    gegenüber dem früheren Entwurf verschärfte Sachverhalt ist hier verbindlich festzuhalten);
    einschließlich der prinzipiellen Unfähigkeit des Ein-Geometrie-Modells, dokumentinterne
    Geometrie-/Orientierungswechsel abzubilden (Grenzfall 12a, verifizierbar an
    `a4-hoch-und-quer.odt`),
  - kein Resize-Listener (Befund 7),
  - ungeklärtes Tablet-/Mobile-Verhalten (Befund 9),
  - visuell unsichtbarer Spacer / Ein-Schatten-für-den-Stapel und die daraus folgende Abhängigkeit der
    Seitenoptik allein vom nicht-inhaltsgekoppelten Hintergrundraster (Befunde 3/6).

Andernfalls ist der Status auf **teilweise** zu setzen und die konkret fehlenden bzw. noch zu
klärenden Teilpunkte sind hier nachzutragen (analog zur Vorgehensweise in `FEATURE-SPEC-DOCX-ODT.md`
Abschnitt 17/21 und in `seitenumbruch-req.md` Abschnitt 7).
