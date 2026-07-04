# Anforderungen: „Seitenlayoutansicht (Druckansicht)"

Status: Laut Backlog (`specs/FEATURE-BACKLOG.md`, Slug `seitenlayout-ansicht`, Priorität 1,
Abschnitt „8.1 Dokumentenansichten") als **„vorhanden"** markiert
(Beschreibung: „Standardansicht mit sichtbaren Einzelseiten."). Diese Einstufung gilt
explizit als **nicht vertrauenswürdig** und muss vollständig verifiziert werden. Im
konkreten Fall bedeutet das insbesondere: klären, ob „vorhanden" tatsächlich eine bewusst
gebaute, geprüfte Druckansicht bedeutet — oder ob es sich lediglich um den einzigen,
fest verdrahteten Rendering-Modus handelt, der mangels jeder Alternative zwangsläufig
angezeigt wird, ohne dass er je gezielt gegen Word-/LibreOffice-Referenzverhalten
abgenommen wurde.

Geltungsbereich: die visuelle Darstellung des Editors als Abfolge sichtbarer A4-Einzelseiten
mit Rand, Zwischenraum und automatischem Seitenumbruch bei Inhaltsüberlauf, umgesetzt in
`src/formats/shared/editor/pageLayout.ts` (Geometrie-Konstanten, Hintergrund-Streifenmuster)
und `src/formats/shared/editor/pagination.ts` (DOM-Höhenmessung, Decoration-Spacer-Plugin),
eingebunden in `src/formats/shared/editor/WordEditor.tsx`. Ausdrücklich **nicht**
Gegenstand dieser Datei: der manuelle, nutzerausgelöste Seitenumbruch (siehe
`seitenumbruch-req.md`), Kopf-/Fußzeilen-Bearbeitung (siehe `FEATURE-SPEC-DOCX-ODT.md`
Abschnitt 9), Seitenränder/-ausrichtung/-format als einstellbare Funktion (Backlog-Slugs
`seitenraender`, `seitenausrichtung`, `papierformat` — alle „fehlt", nur als Cross-Referenz
erwähnt) sowie Drucken/PDF-Export (Backlog-Slugs `drucken`, `als-pdf-exportieren`).

Wie in `FEATURE-SPEC-DOCX-ODT.md` festgelegt: DOCX und ODT teilen sich denselben
ProseMirror-Editor und dieselbe Seitenansicht. Jede Anforderung unten gilt für **beide**
Formate, inklusive Rundreise (Import → Anzeige in der Seitenlayoutansicht → Export →
Re-Import → Inhalt bleibt unverändert, unabhängig davon, wie viele Seiten währenddessen
angezeigt wurden).

---

## 0. Befund aus Code-Recherche (Ausgangslage vor Verifikation)

Diese Spezifikation beruht auf tatsächlicher Durchsicht des Codes, nicht nur auf der
Backlog-Beschreibung. Festgestellt wurde:

1. **Keine echte „Ansicht" im Sinne mehrerer wählbarer Modi.** Es gibt keinen
   Umschalter zwischen „Seitenlayout"/„Weblayout"/„Entwurf"/„Gliederung"/„Lesemodus"
   (alle diese Backlog-Slugs unter „8.1 Dokumentenansichten" sind als „fehlt" markiert
   außer diesem einen). `WordEditor.tsx` rendert exakt einen fest verdrahteten
   Darstellungsmodus ohne jede Konfigurierbarkeit und ohne ein UI-Element, das diesen
   Modus überhaupt benennt (kein Label „Seitenlayout", kein Menüeintrag „Ansicht").
   Der Backlog-Status „vorhanden" beruht also darauf, dass es keine Alternative gibt,
   nicht darauf, dass eine benannte, bewusst als „Druckansicht" gebaute Funktion
   existiert und geprüft wurde.
2. **Mechanismus ist eine reine Client-seitige Simulation, ohne jeden Bezug zur Datei.**
   - `pageLayout.ts` definiert feste Pixel-Konstanten für A4 bei 96 CSS-px/Zoll:
     `PAGE_WIDTH_PX = 794`, `PAGE_HEIGHT_PX = 1123`, `PAGE_MARGIN_PX = 94`
     (25 mm), `PAGE_SEPARATOR_PX = 32`, sowie `pageBackgroundStyle()`, das über
     `background-image: linear-gradient(...)` abwechselnd weiße „Seiten"- und
     transparente „Lücken"-Bänder mit fester Periode
     (`PAGE_CONTENT_HEIGHT_PX + PAGE_GAP_PX`) hinter den durchgehend scrollenden
     Editor-Inhalt malt.
   - `pagination.ts` (`createPaginationPlugin`) misst nach jedem View-Update per
     `requestAnimationFrame` die tatsächliche gerenderte Höhe jedes Top-Level-Blocks
     (`getBoundingClientRect().height`) und berechnet daraus
     (`computePageBreakIndices`) Stellen, an denen ein reines
     `Decoration.widget`-Spacer-Element (`page-break-spacer`, Höhe `PAGE_GAP_PX`)
     eingefügt wird.
   - Beides — Hintergrundstreifen und Spacer-Positionen — wird **unabhängig
     voneinander** berechnet (siehe Punkt 6 unten für das daraus resultierende Risiko).
3. **Es ist keine echte Mehrfach-Seiten-Darstellung, sondern eine einzige durchgehend
   scrollende Fläche mit optischer Bänderung.** `WordEditor.tsx` rendert einen einzigen
   `containerRef`-`div` (die ProseMirror-Surface) innerhalb eines fest `PAGE_WIDTH_PX`
   breiten Wrapper-`div`s mit **einem einzigen** `shadow-lg` für den gesamten Stapel —
   nicht ein separater Schatten/Rahmen pro simulierter Einzelseite. Ob das optisch
   ausreichend als „mehrere sichtbare Einzelseiten" wahrgenommen wird (Backlog-Wortlaut:
   „Standardansicht mit sichtbaren Einzelseiten"), ist bislang nicht visuell verifiziert.
4. **Seitenformat/Ränder sind vollständig vom tatsächlichen Dateiinhalt entkoppelt** —
   weder gelesen noch geschrieben:
   - `src/formats/docx/writer.ts`, `buildDocumentXml()` (Zeile ~177) erzeugt
     `<w:sectPr>${sectPrExtra}</w:sectPr>`, wobei `sectPrExtra` (aufgebaut ab Zeile
     ~231) **ausschließlich** `headerReference`/`footerReference` enthält — **kein**
     `<w:pgSz>` (Seitengröße), **kein** `<w:pgMar>` (Seitenränder) wird jemals
     geschrieben. Eine in Word geöffnete Export-Datei fällt damit auf Words eigene
     Default-Seitengröße zurück (z. B. Letter statt A4, abhängig von Word-Gebietsschema),
     **nicht** auf die im Editor angezeigten A4/25-mm-Maße.
   - `src/formats/docx/reader.ts` wertet in seinem gesamten Code **kein** `w:pgSz` und
     **kein** `w:pgMar` aus einer Fremddatei aus (Grep über die gesamte Datei ergibt
     keinen Treffer) — ein tatsächlich abweichendes Seitenformat/abweichende Ränder
     der importierten Datei werden also stillschweigend ignoriert.
   - `src/formats/odt/writer.ts` (Zeile ~145) schreibt für **jedes** Dokument
     hartkodiert `<style:page-layout style:name="PL1"><style:page-layout-properties
     fo:margin="2.5cm" fo:page-width="21cm" fo:page-height="29.7cm"/></style:page-layout>`
     — unabhängig vom Ursprungsdokument.
   - `src/formats/odt/reader.ts` liest aus `style:master-page` (Zeile ~257) **nur**
     `style:header`/`style:footer` für Kopf-/Fußzeilen-Inhalt aus, **nicht**
     `fo:page-width`/`fo:page-height`/`fo:margin*` des zugehörigen `style:page-layout`.
   - **Konsequenz:** Die Seitenlayoutansicht zeigt für **jedes** Dokument immer A4 mit
     25 mm Rand — unabhängig vom tatsächlichen Format der importierten Datei. Solange
     kein Dokument mit abweichendem Format existiert (aktuell plausibel, da auch die
     Backlog-Slugs `seitenraender`/`seitenausrichtung`/`papierformat` „fehlt" sind),
     ist das zufällig richtig; sobald eines dieser Features gebaut wird, muss die
     Seitenlayoutansicht auf eine **aus dem Dokument abgeleitete** Geometrie umgestellt
     werden, statt weiter hartkodiert zu bleiben. Bis dahin ist explizit zu
     dokumentieren, dass A4/25 mm eine **Annahme**, keine gelesene Eigenschaft ist.
5. **Keine Kopf-/Fußzeilen-Darstellung in der Seitenansicht.** `WordEditor.tsx` rendert
   ausschließlich `doc.content.body`; `header`/`footer` werden nirgends im Editor
   angezeigt (`src/app/DocumentWorkspace.tsx` enthält keinerlei Referenz auf
   `header`/`footer`). Der Inhalt bleibt zwar beim Bearbeiten unangetastet erhalten
   (`WordEditor.tsx` Zeile 95: `{ ...doc.content, body: newState.doc.toJSON() }` —
   `header`/`footer` werden unverändert durchgereicht), ist aber für die Nutzerin in
   der Seitenansicht **unsichtbar**, obwohl eine echte Druckansicht in Word/LibreOffice
   Kopf-/Fußzeile auf jeder simulierten Seite zeigt. Deckt sich mit dem in
   `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 9 dokumentierten Befund („kein UI-Weg" für
   Kopf-/Fußzeile) — hier zusätzlich relevant, weil es die Seitenansicht selbst
   unvollständig macht.
6. **Strukturelles Drift-Risiko zwischen Hintergrundraster und tatsächlicher
   Umbruchposition.** Das Hintergrundmuster aus `pageBackgroundStyle()` wiederholt sich
   mit einer **festen** Pixel-Periode (`PAGE_CONTENT_HEIGHT_PX + PAGE_GAP_PX`) ab einem
   festen Offset (`backgroundPositionY: PAGE_MARGIN_PX`) — es geht implizit davon aus,
   dass jede simulierte Seite exakt `PAGE_CONTENT_HEIGHT_PX` Pixel Inhalt enthält, bevor
   die nächste Lücke beginnt. `computePageBreakIndices` bricht jedoch **vor** dem Block
   um, der die Seite zum Überlaufen bringen würde — die tatsächlich aufsummierte Höhe
   vor einem Umbruch (`cumulative`) ist damit in aller Regel **kleiner** als
   `PAGE_CONTENT_HEIGHT_PX` (Restplatz, der durch den ausgelassenen, zu großen
   nächsten Block entsteht). Die tatsächliche DOM-Position des eingefügten
   `page-break-spacer` liegt folglich in aller Regel **vor** der Stelle, an der das
   statische Hintergrundraster die zweite Seite beginnen lässt — ein struktureller,
   aus dem Code ableitbarer Versatz, der sich mit jeder weiteren Seite akkumulieren
   kann. Dies ist eine plausible Ursache/Konkretisierung für den in
   `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 8 als „offen/ungeklärt" markierten Verdacht
   auf unerklärten Leerraum und muss vor Abnahme **visuell** verifiziert werden
   (Screenshot-Vergleich über mehrere Seiten hinweg, nicht nur auf der ersten Seite).
7. **Kein Resize-Listener.** `createPaginationPlugin()` berechnet ausschließlich im
   Plugin-`view`-Hook (`init` + `update`, ausgelöst durch ProseMirror-State-Änderungen)
   neu — es gibt **keinen** `window`-`resize`-Listener. Wird das Browserfenster nach dem
   Laden eines Dokuments verkleinert/vergrößert (oder die Browser-Zoomstufe geändert),
   ohne dass der Editor eine weitere Transaktion verarbeitet, bleibt die Paginierung auf
   dem alten Stand, bis irgendeine Bearbeitung eine neue Transaktion auslöst.
8. **Kein Reflow bei asynchron nachladenden Bildern.** Ein per `<img>` eingefügtes Bild
   lädt asynchron; sein `onload` löst **keine** ProseMirror-Transaktion aus. Die
   Höhenmessung in `measureAndBuildDecorations` kann daher zum Zeitpunkt der Messung
   noch die Platzhaltergröße (oder 0) statt der endgültigen Bildhöhe sehen, ohne dass
   danach automatisch neu gemessen wird — bis eine andere Aktion (z. B. Tippen) die
   nächste Transaktion und damit den nächsten `rAF`-Messzyklus auslöst.
9. **Feste Pixelbreite ist nicht responsiv.** `PAGE_WIDTH_PX` (794 px) ist eine
   Konstante, die unabhängig vom Viewport in `WordEditor.tsx` als `style={{ width:
   PAGE_WIDTH_PX, ... }}` gesetzt wird. Sowohl das in `playwright.config.ts` bereits
   konfigurierte `Tablet`- (iPad Mini) als auch das `Mobile`-Projekt (Pixel 7) haben
   eine CSS-Breite, die in derselben Größenordnung wie oder unterhalb von 794 px liegt
   — der äußere Container hat zwar `overflow-auto`, was horizontales Scrollen
   ermöglicht, aber ob eine 794 px breite, nicht schrumpfende Seite auf einem
   Mobile-Viewport noch die in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 8, Testfall 5
   geforderte „mindestens lesbar"-Schwelle erfüllt, ist **nicht verifiziert** und laut
   Code-Befund eher unwahrscheinlich ohne Zoomen/Scrollen.
10. **Seiten-Hintergrund ist hartkodiert weiß, unabhängig vom Farbschema.**
    `pageBackgroundStyle()` verwendet das Literal `white` (nicht theme-aware), während
    der umgebende Scroll-Container `bg-neutral-200 dark:bg-neutral-950` nutzt
    (`WordEditor.tsx` Zeile 119). Das entspricht dem Referenzverhalten von Word/
    LibreOffice (das Papier bleibt auch im Dark Mode weiß) — ist aber nirgends als
    bewusste Entscheidung dokumentiert und muss als solche bestätigt werden, nicht
    stillschweigend vorausgesetzt. Es gibt zudem **keinen In-App-Umschalter** für
    Light/Dark — `tailwind.config`-Suche ergab keine explizite `darkMode`-Strategie,
    Tailwind v4 nutzt hier den Default (`prefers-color-scheme`-Medienabfrage), d. h.
    Verifikation muss über Browser-/OS-Emulation erfolgen, nicht über einen In-App-Klick.
11. **Keine Seitenzahl-Anzeige, kein Zoom, keine Mehrfach-Seiten-Nebeneinander-Ansicht,
    kein Lineal.** Durchsicht von `Toolbar.tsx` bestätigt: keiner dieser Backlog-Slugs
    (`zoom-stufe`, `zoom-seitenbreite`, `mehrere-seiten-anzeigen`, `lineal-anzeigen`,
    `formatierungszeichen-toggle`, `navigationsbereich`) hat eine UI-Entsprechung.
    Deckt sich mit dem Backlog-Status „fehlt" für alle diese Zeilen — hier nur als
    Cross-Referenz, kein Blocker für diese Datei.
12. **Keine automatisierte Verifikation außerhalb reiner Arithmetik-Unit-Tests.**
    `src/formats/shared/editor/__tests__/pagination.test.ts` deckt ausschließlich
    `computePageBreakIndices`/`computePageCount` als reine Zahlenfunktionen ab (Eingabe:
    Array von Höhen in Pixeln, Ausgabe: Bruchindizes) — es gibt **keinen** Test, der
    tatsächliches Rendering, Screenshots, DOM-Struktur (`page-break-spacer`-Elemente),
    Viewport-Verhalten oder das Zusammenspiel mit echten Dokumenten (Bilder, Tabellen,
    Listen) prüft. Der Ordner `tests/e2e` enthält keine Datei mit Bezug zu
    Seitenlayout/Paginierung.
13. **Kein Bezug zu Drucken/PDF.** Es existiert kein `@media print`-Stylesheet und kein
    `window.print()`-Aufruf im gesamten Quellcode — „Drucken" (Backlog-Slug `drucken`)
    ist ein separates, als „fehlt" markiertes Feature und nicht Teil dieser Datei.
14. **`page-break-spacer` ist nachweislich eine reine View-Decoration, kein
    Dokument-Node.** `pagination.ts` erzeugt ausschließlich `Decoration.widget(...)`
    und dispatcht die Decoration-Änderung über `tr.setMeta(paginationKey, next)` — eine
    solche Transaktion verändert `tr.doc` nicht (`tr.docChanged` bleibt `false`), sodass
    `WordEditor.tsx`s `dispatchTransaction`-Handler (Zeile 91–98: `if (tr.docChanged) {
    onChangeRef.current(...) }`) für reine Paginierungs-Updates **keinen**
    `onChange`-Aufruf auslöst. Das ist durch Code-Lektüre bestätigt korrekt (keine
    Gefahr, dass Paginierungs-Artefakte in den exportierten Dateiinhalt gelangen), aber
    **nicht durch einen automatisierten Regressionstest abgesichert**.

**Konsequenz:** Die Backlog-Einstufung „vorhanden" ist im engen Sinn zutreffend (es
gibt eine Darstellung mit optisch simulierten Einzelseiten und automatischem Umbruch bei
Überlauf), aber in mehrfacher Hinsicht ungeprüft und mit mindestens einem konkret aus dem
Code ableitbaren Darstellungsrisiko (Punkt 6) sowie mehreren dokumentationspflichtigen
Lücken (Punkte 4, 5, 9, 11) behaftet. Diese Datei beschreibt den Soll-Zustand für die
vollständige Verifikation (und, wo nötig, Nachbesserung) dieser Funktion.

---

## 1. Menüpunkte / Bedienelemente (Soll-Zustand)

| # | Element | Auslösung | Aktueller Stand (Befund) | Soll |
|---|---|---|---|---|
| 1 | Erkennbare Kennzeichnung „Seitenlayoutansicht" irgendwo in der UI | — (Label/Status) | **Fehlt komplett** — kein Text/Icon benennt den aktuellen Modus | Mindestens intern eindeutig als „Seitenlayoutansicht" dokumentiert; sobald künftig Alternativ-Ansichten (Weblayout etc.) eingeführt werden, muss ein sichtbarer Umschalter mit klarer Kennzeichnung des aktiven Modus existieren — für die aktuelle Abnahme genügt eindeutige Doku, kein Blocker für UI-Neubau |
| 2 | Sichtbare Einzelseiten (weiße „Blätter" mit Rand, Zwischenraum, Schatten) | — (reine Darstellung, kontinuierlich beim Scrollen) | Vorhanden über CSS-Hintergrundstreifen (`pageBackgroundStyle`) + JS-berechnete Spacer (`pagination.ts`); **ein einziger** äußerer Schatten für den gesamten Stapel statt je simulierter Seite | Muss visuell eindeutig als **mehrere getrennte Blätter** wahrgenommen werden (nicht nur als eine lange Fläche mit Streifen) — Screenshot-Verifikation über mind. 3 Seiten erforderlich |
| 3 | Seitenrand (Simulation der Word-/LibreOffice-Papierränder) | — | Vorhanden, aber fest A4/25 mm, unabhängig vom Originaldokument (siehe Befund 4) | Für alle aktuell unterstützten Dokumente (kein einstellbares Format) korrekt; muss als **Annahme, nicht gelesener Wert** dokumentiert werden; sobald Seitenformat/-ränder einstellbar werden, muss die Anzeige daraus abgeleitet werden |
| 4 | Automatischer Seitenumbruch bei Inhaltsüberlauf | — (laufzeitberechnet bei jeder Änderung) | Vorhanden (`computePageBreakIndices`/`createPaginationPlugin`), Genauigkeit/Drift noch zu verifizieren (siehe Befund 6, Grenzfälle) | Muss zuverlässig, ohne sichtbaren Versatz zwischen Hintergrundraster und tatsächlicher Umbruchstelle funktionieren, auch bei Bildern/Tabellen/mehr als 2 Seiten |
| 5 | Kopf-/Fußzeilen-Anzeige je simulierter Seite | — | **Fehlt komplett** (siehe Befund 5) | Muss ergänzt werden, sobald das Kopf-/Fußzeile-Feature (siehe `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 9) UI-seitig existiert; bis dahin ist diese Lücke hier explizit als **bekannt und dokumentationspflichtig** festzuhalten, kein stiller Verzicht |
| 6 | Seitenzahl-/Gesamtseitenzahl-Anzeige (z. B. „Seite 2 von 5") | — | Fehlt (Backlog: nicht separat geführt, implizit Teil dieser Ansicht) | Empfohlen (vgl. `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 8, Testfall 2: „Seitenzahl-Anzeige (falls vorhanden) stimmt") — kein Blocker, aber sinnvolle Ergänzung, sobald gebaut muss sie exakt mit der tatsächlichen Seitenzahl übereinstimmen |
| 7 | Zoom-Regler / Zoom auf Seitenbreite | Klick/Regler | Fehlt (Backlog-Slugs `zoom-stufe`, `zoom-seitenbreite`) | Kein Blocker für diese Datei — Cross-Referenz; falls gebaut, muss die Seitengeometrie (Abschnitt 3) weiterhin korrekt skalieren |
| 8 | Umschalt-Möglichkeit zu anderen Ansichten (Weblayout/Entwurf/Gliederung/Lesemodus) | Klick | Fehlt komplett (alle „fehlt" im Backlog) | Kein Blocker — aktueller Zustand („nur ein Modus") ist explizit als Ist-Zustand zu dokumentieren, nicht stillschweigend als „mehrere Ansichten vorhanden" misszuverstehen |
| 9 | Reaktion auf Tablet-/Mobile-Viewport (horizontales Scrollen vs. Skalierung) | — (responsive Verhalten) | Feste Pixelbreite (`PAGE_WIDTH_PX = 794`), `overflow-auto` erlaubt horizontales Scrollen, aber ungetestet ob „lesbar"/„bedienbar" (siehe Befund 9) | Muss auf den bestehenden Playwright-Projekten `Tablet` und `Mobile` explizit geprüft und das Ergebnis (Scrollen akzeptabel vs. Skalierung nötig) dokumentiert werden |
| 10 | Verhalten bei Fenster-Resize nach dem Laden eines Dokuments | Browser-Resize | Kein Resize-Listener (siehe Befund 7) — Paginierung friert auf altem Stand ein, bis die nächste Bearbeitung erfolgt | Zu entscheiden und zu dokumentieren, ob das akzeptabel ist oder ein `resize`-Listener ergänzt werden muss — kein stiller Freifahrtschein, siehe Grenzfall 8 |

---

## 2. Geltende Randbedingungen aus der Haupt-Spezifikation

Diese Datei ergänzt, ersetzt aber nicht die Anforderungen aus
`FEATURE-SPEC-DOCX-ODT.md`, insbesondere:

- Abschnitt 8 („Seitenlayout & Paginierung") — die komplette Sektion ist der direkte
  Ursprung dieser Datei, insbesondere:
  - „Sichtbare Seiten im A4-Format mit realistischen Rändern."
  - „Inhalt, der eine Seite füllt, fließt sichtbar auf eine zweite Seite über."
  - Der als **offen und ungeklärt** markierte Punkt zum „auffälligen Leerraum" bei
    kurzen Dokumenten — siehe Befund 6 oben für eine konkrete, aus dem Code
    hergeleitete mögliche Ursache, die hier erstmals technisch unterlegt wird.
  - Testfall 4/5 (Tablet-/Mobile-Viewport) — siehe Befund 9/Element 9 oben.
- Abschnitt 9 (Kopf-/Fußzeilen) — Cross-Referenz zu Befund 5/Element 5 oben; die
  fehlende Anzeige in der Seitenansicht ist ein Symptom des dort beschriebenen
  größeren Problems (kein UI-Weg für Kopf-/Fußzeile überhaupt).
- Abschnitt 15 („Sonderelemente") und Abschnitt 18 (Import-Robustheit): Prinzip „kein
  stiller Datenverlust" gilt sinngemäß auch hier — auch wenn diese Ansicht rein
  präsentational ist, darf sie nie dazu führen, dass Inhalt beim Bearbeiten über eine
  Seitengrenze hinweg verloren geht (siehe Abschnitt 4, Grenzfall 9).
- Abschnitt 19 (Export-Robustheit & Rundreise) und Abschnitt 20.4 (kein stiller
  Fehlschlag) gelten uneingeschränkt.
- Abschnitt 20.3 ausdrücklich: „Seitenlayout-Darstellung: … Klärung, ob der sichtbare
  Abstand über kurzem Text ein normaler Seitenrand oder ein Darstellungsfehler ist;
  Ergebnis dieser Klärung wird hier nachgetragen." — diese Datei liefert die
  technische Grundlage für genau diese Klärung (Befund 6) und macht die
  Verifikationsschritte explizit (Abschnitt 6 unten).
- Abschnitt 2, Regressionstest für den Selection-Sync-Bug: Tippen unmittelbar an/über
  einer automatisch eingefügten Umbruch-Decoration ist strukturell ein ähnlicher
  Verdachtsfall (Cursor-Positionierung nahe einem Widget mit `side: -1`) und muss mit
  derselben Sorgfalt getestet werden (siehe Grenzfall 9 unten).
- `seitenumbruch-req.md` Abschnitt 3.8 („Zusammenspiel mit der automatischen
  Paginierung"): diese Datei beschreibt die automatische Paginierung selbst im Detail;
  das dortige Dokument beschreibt nur deren Zusammenspiel mit dem (noch nicht gebauten)
  manuellen Umbruch — beide Dateien sind komplementär, nicht redundant.

---

## 3. Gewünschtes Verhalten im Detail

### 3.1 Seitengeometrie und deren Herkunft
- Für alle aktuell möglichen Dokumente (kein einstellbares Seitenformat/keine
  einstellbaren Ränder existieren) muss die Anzeige A4 (210 × 297 mm) mit realistischen
  Rändern (aktuell 25 mm) zeigen — deckt sich mit `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 8.
- Es muss explizit dokumentiert sein, dass diese Maße **hartkodierte Annahmen** sind,
  nicht aus der importierten Datei gelesene Werte (siehe Befund 4). Diese Dokumentation
  ist Teil der Abnahme dieser Datei, unabhängig davon, ob das zugrunde liegende Feature
  (Seitenformat/-ränder aus der Datei lesen) bereits gebaut ist.
- Sobald Seitenformat/-ränder/-ausrichtung als Feature existieren (separate
  Anforderungsdateien), muss diese Ansicht so umgebaut werden, dass sie die
  **tatsächlichen** Werte des jeweiligen Dokuments anzeigt, nicht weiter die
  Konstanten aus `pageLayout.ts`.

### 3.2 Sichtbare Einzelseiten
- Die Trennung zwischen zwei simulierten Seiten muss optisch eindeutig als
  „hier endet eine Seite, hier beginnt die nächste" erkennbar sein — nicht nur als
  ein schmaler Farbstreifen, der mit dem Scrollbereich-Hintergrund verschmelzen könnte.
- Zu verifizieren: reicht der aktuelle Ein-Schatten-für-den-ganzen-Stapel-Ansatz aus,
  oder wirkt ein mehrseitiges Dokument eher wie „eine lange Fläche mit grauen
  Bändern" als wie „mehrere Blätter"? Ergebnis ist zu dokumentieren (Screenshot-Beleg).

### 3.3 Automatische Umbruch-Berechnung (Pagination)
- Ein Block, der höher als eine ganze Seite ist (z. B. ein sehr großes Bild oder eine
  sehr lange Tabelle), überläuft laut Code-Kommentar in `pagination.ts` bewusst seine
  eigene Seite, statt aufgeteilt zu werden (echtes Intra-Block-Splitting würde
  DOM-Knoten über mehrere Seiten duplizieren, was das Single-`EditorView`-Modell nicht
  unterstützt). Dieses Verhalten weicht vom Referenzverhalten großer Tabellen in
  Word/LibreOffice ab (dort brechen Tabellenzeilen über Seiten um, ggf. mit
  wiederholter Kopfzeile) und muss als **bewusste, dokumentierte Einschränkung**
  bestätigt werden — nicht stillschweigend als Bug oder als vollwertiges Feature
  missverstanden werden (siehe Grenzfall 4).
- Die Neuberechnung erfolgt bei jedem ProseMirror-View-Update per
  `requestAnimationFrame`; während des Tippens in einem mehrseitigen Dokument darf
  dies zu keinem sichtbaren Flackern/Springen der bereits vorhandenen Seiten führen.
- Hintergrundraster (`pageBackgroundStyle`, feste Pixel-Periode) und Decoration-Spacer
  (`pagination.ts`, aus real gemessenen Höhen berechnet) sind zwei unabhängig
  berechnete Dinge (siehe Befund 6). Es muss visuell verifiziert werden, ob und wie
  stark beide auseinanderlaufen — insbesondere bei mehr als zwei Seiten, wo sich ein
  eventueller Versatz akkumulieren könnte.

### 3.4 Kopf-/Fußzeilen in der Seitenansicht (Cross-Referenz)
- Vollständige Spezifikation ist Aufgabe von `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 9;
  hier wird nur festgehalten, dass eine vollständige „Seitenlayoutansicht" im
  Word-/LibreOffice-Sinne Kopf-/Fußzeile auf jeder simulierten Seite zeigt — der
  aktuelle Zustand (komplett unsichtbar) ist eine bekannte, zu dokumentierende Lücke
  dieser Ansicht, deren Behebung von der Umsetzung des Kopf-/Fußzeile-Features abhängt.

### 3.5 Reaktion auf Viewport-Größe (Tablet/Mobile)
- Da `PAGE_WIDTH_PX` fest ist, muss geklärt werden, welches Verhalten auf schmalen
  Viewports (Tablet, Mobile — siehe bestehende Playwright-Projekte) als „Soll" gilt:
  horizontales Scrollen der Seite (aktuell technisch der Fall durch `overflow-auto`)
  oder eine skalierte/schrumpfende Darstellung. Beides ist denkbar; das aktuell
  tatsächlich beobachtbare Verhalten ist zu verifizieren und explizit als Ist-Zustand
  festzuhalten, bevor eine Entscheidung über Soll-Änderungen getroffen wird.
- Unabhängig von der Entscheidung: Toolbar-Erreichbarkeit und Grundbedienbarkeit
  (Tippen, Fett, Export) müssen auf allen drei konfigurierten Playwright-Projekten
  (Desktop Chrome, Tablet, Mobile) funktionieren (vgl. `FEATURE-SPEC-DOCX-ODT.md`
  Abschnitt 8, Testfälle 4–5).

### 3.6 Reaktion auf Farbschema (Light/Dark)
- Der weiße Seiten-Hintergrund bleibt unabhängig vom Farbschema weiß (Referenzverhalten
  von Word/LibreOffice: Papier bleibt weiß). Dies ist zu **bestätigen** als bewusste
  Entscheidung (nicht stillschweigend vorauszusetzen) und mit einem Screenshot in
  beiden Farbschemata zu belegen. Da kein In-App-Umschalter existiert, ist die
  Verifikation über Browser-/OS-Emulation von `prefers-color-scheme` durchzuführen.

### 3.7 Performance bei langen Dokumenten
- Bei einem Dokument mit vielen Top-Level-Blöcken (mehrere Bildschirmhöhen Text, siehe
  `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 8, Testfall 2) darf die pro Transaktion
  ausgelöste Neumessung/Neuberechnung (Befund/Punkt 6–7 aus Abschnitt 0) nicht zu
  spürbarer Verzögerung beim Tippen führen. Der bestehende `sameDecorationSet`-Vergleich
  verhindert zwar eine Endlos-Dispatch-Schleife, aber nicht wiederholte teure
  Neuberechnungen bei jedem Tastendruck — Performance ist unter realistischer
  Dokumentgröße zu messen, nicht nur unter der synthetischen Unit-Test-Last.

### 3.8 Konsistenz nach Undo/Redo und nach Block-Einfügungen
- Nach Undo/Redo, nach Bild-Einfügung, nach Tabellen-Einfügung muss die Paginierung
  korrekt neu berechnet werden (Höhenänderung löst eine neue ProseMirror-Transaktion
  aus, die wiederum die `rAF`-Neumessung anstößt) — keine „hängengebliebenen" Spacer
  an falscher Position, kein doppelter/fehlender Umbruch.

### 3.9 Kein Einfluss auf Rundreise-Fidelity
- Da `page-break-spacer` eine reine View-Decoration ist (Befund 14), darf die
  Seitenansicht selbst **niemals** Einfluss auf den exportierten Dateiinhalt haben —
  weder auf DOCX- noch auf ODT-Export. Dies ist durch Code-Lektüre plausibel, aber
  nicht durch einen Regressionstest abgesichert (siehe Abschnitt 5.1, Abschnitt 6).

### 3.10 Kein stiller Fehlschlag
- Der Guard `if (pageContentHeight <= 0) return []` in `computePageBreakIndices` muss
  verifiziert werden, keine fehlerhafte/NaN-Darstellung zu erzeugen, falls
  `PAGE_CONTENT_HEIGHT_PX` durch eine künftige Änderung (z. B. dynamische Ränder) auf
  einen nicht-positiven Wert fallen sollte — Fallback ist eine einzelne, normal
  nutzbare Seite, kein Crash, keine leere weiße Fläche ohne Editor.

---

## 4. Grenzfälle (müssen explizit geprüft werden)

| # | Grenzfall | Erwartetes Verhalten |
|---|---|---|
| 1 | Kurzes Dokument (ein Absatz) | Seitenrand entspricht dokumentierter Sollgröße (25 mm), kein unerwarteter zusätzlicher Leerraum — direkte Umsetzung des in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 8/20.3 offen gelassenen Punkts; Ergebnis der Klärung ist hier nachzutragen. |
| 2 | Sehr langes Dokument (> 5 Seiten) | Korrekter, fortlaufender Umbruch über alle Seiten; kein sich aufsummierender sichtbarer Versatz zwischen Hintergrundraster und tatsächlicher Umbruchstelle (siehe Befund 6) — explizit auf Seite 4/5, nicht nur auf Seite 2, zu prüfen. |
| 3 | Einzelnes Bild, das höher ist als eine ganze Seite | Bild überläuft bewusst seine eigene Seite (kein Splitting, siehe Abschnitt 3.3) — zu bestätigen als akzeptiertes Verhalten, nicht als Darstellungsfehler misszuverstehen. |
| 4 | Sehr große Tabelle (> 1 Bildschirmhöhe) über eine simulierte Seitengrenze hinweg | Tabelle überläuft ebenso wie ein einzelnes Bild ihre Seite, ohne Zeilenumbruch/Kopfzeilenwiederholung (Abweichung vom Word-/LibreOffice-Referenzverhalten) — explizit als bekannte Einschränkung zu bestätigen, angesichts dessen, dass Tabellen laut `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6 bereits als „höchste Priorität"/nutzerseitig gemeldetes Problem gelten. |
| 5 | Viewport schmaler als bzw. nahe der festen Seitenbreite (794 px) — betrifft die bestehenden Playwright-Projekte `Tablet` und `Mobile` | Zu verifizieren und zu dokumentieren: horizontales Scrollen der Seite (aktuell technisch der Fall) muss die in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 8, Testfall 4/5 geforderte Grundbedienbarkeit (Toolbar erreichbar, Kernfunktionen nutzbar, „mindestens lesbar") tatsächlich erfüllen — nicht nur theoretisch möglich sein. |
| 6 | Farbschema-Wechsel (OS-Ebene `prefers-color-scheme`, kein In-App-Umschalter vorhanden) während der Bearbeitung | Seiten-Hintergrund bleibt weiß (Papier-Analogie), Kontrast zum umgebenden Chrome bleibt in beiden Schemata ausreichend — zu verifizieren per Browser-Emulation, da kein In-App-Toggle existiert. |
| 7 | Asynchron nachladendes Bild (Höhe zum Messzeitpunkt noch nicht final) | Nach vollständigem Laden des Bildes muss die Seitenansicht spätestens bei der nächsten Bearbeitung korrekt nachziehen; sichtbar falsch berechnete Seitenumbrüche dürfen nicht dauerhaft (über mehrere Nutzeraktionen hinweg) bestehen bleiben. |
| 8 | Browserfenster wird nach dem Laden eines mehrseitigen Dokuments in der Größe verändert, ohne dass weiter bearbeitet wird | Da kein Resize-Listener existiert (Befund 7), bleibt die Paginierung auf dem alten Stand — zu entscheiden und explizit zu dokumentieren, ob das als akzeptabel gilt oder ein Resize-Listener ergänzt werden muss. |
| 9 | Text unmittelbar an der Stelle eingeben/löschen, an der ein automatisch berechneter `page-break-spacer` sitzt (Cursor direkt davor/danach) | Kein Textverlust, keine Vertauschung von Inhalt vor/nach dem Spacer, Cursor landet nach der Eingabe an der erwarteten Stelle — Regressionsfall analog zum Selection-Sync-Bug aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2, da der Spacer ein Widget mit `side: -1` ist. |
| 10 | Undo direkt nach einer Aktion, die eine neue Seite ausgelöst hat (z. B. viel Text eingefügt, dann rückgängig) | Seitenzahl/Umbruchpositionen rechnen sich korrekt zurück; kein „Geister-Leerraum" (übrig gebliebener Spacer ohne zugehörigen Inhalt) bleibt sichtbar. |
| 11 | Ganz leeres, frisch erstelltes Dokument | Genau eine Seite, kein unerwarteter Leerraum (`computePageBreakIndices([], …) = []`, `computePageCount = 1`) — als Grundfall mit dem visuellen Ist-Zustand abzugleichen (siehe Grenzfall 1). |
| 12 | Reales importiertes Dokument mit von A4/25 mm abweichendem Ursprungsformat (z. B. US Letter/Legal, individuelle Ränder) | Wird unverändert als A4/25 mm angezeigt, da Format/Ränder weder gelesen noch gespeichert werden (Befund 4) — als **bekannte, dokumentationspflichtige Einschränkung** festzuhalten, kein stiller Blocker für die Abnahme dieser Datei, aber explizit zu vermerken, bis `seitenraender`/`seitenausrichtung`/`papierformat` umgesetzt sind. |
| 13 | Dokument mit vorhandener Kopf-/Fußzeile (Datenmodell vorhanden) wird angezeigt | Kopf-/Fußzeile bleibt im Datenmodell erhalten, ist aber in der Seitenansicht nicht sichtbar (Befund 5) — als bekannte Lücke zu dokumentieren, Cross-Referenz auf `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 9. |
| 14 | Manueller Seitenumbruch (sobald gemäß `seitenumbruch-req.md` gebaut) trifft auf automatische Paginierung | Bereits in `seitenumbruch-req.md` Abschnitt 3.8 spezifiziert — hier nur Cross-Referenz, keine Duplikat-Anforderung. |
| 15 | Datei unverändert hochladen, sofort ohne jede Interaktion exportieren, reimportieren | Da die Seitenansicht rein präsentational ist (Befund 14), darf dieser Zyklus in keinem Fall Paginierungs-Artefakte (Spacer, Hintergrundraster-Metadaten) in den exportierten Dateiinhalt einbringen — zu verifizieren trotz plausibler Korrektheit aus Code-Lektüre. |

---

## 5. Rundreise-Anforderung

Da diese Funktion rein präsentational ist (keine Speicherung von „Ansichtszustand" in
der Datei), unterscheidet sich die Rundreise-Prüfung leicht von einer klassischen
Content-Feature-Prüfung: Kernanforderung ist, dass die Seitenansicht **niemals** Inhalt
verändert oder verliert — weder durch bloßes Anzeigen/Scrollen über mehrere simulierte
Seiten hinweg, noch durch Bearbeitung unmittelbar an einer automatisch berechneten
Umbruchstelle.

### 5.1 Baseline-Rundreise (Regressionsschutz — darf durch Paginierung nicht kaputtgehen)
1. Reale, mehrseitige DOCX-Datei (die in dieser Ansicht mehrere simulierte Seiten
   erzeugt) unverändert hochladen → sofort exportieren → erneut importieren → Inhalt
   entspricht inhaltlich exakt dem Original. Insbesondere darf keine
   Paginierungs-Decoration (Spacer, Hintergrundraster) jemals in den exportierten
   Dateiinhalt gelangen (vgl. Befund 14, Grenzfall 15).
2. Dasselbe mit einer realen, mehrseitigen ODT-Datei.
3. Regressionstest, der bestätigt, dass eine reine Paginierungs-Transaktion
   (`tr.setMeta(paginationKey, …)`) **kein** `tr.docChanged = true` erzeugt und folglich
   **nie** den `onChange`-Callback in `WordEditor.tsx` auslöst — aktuell nur durch
   Code-Lektüre plausibel, nicht automatisiert abgesichert (siehe Abschnitt 6).

### 5.2 Feature-Rundreise (Seitenansicht selbst)
1. Reale, mehrseitige DOCX-Datei importieren (mehrere simulierte Seiten durch
   automatische Paginierung) → unverändert exportieren → reimportieren → Inhalt
   identisch **und** bei erneuter Anzeige entsteht eine funktional äquivalente Anzahl
   Seiten für denselben Inhalt (kein zusätzlicher/fehlender automatischer Umbruch
   allein durch den Export/Reimport-Zyklus, da die Paginierung rein laufzeitbasiert
   und nicht Teil des exportierten Formats ist).
2. Dasselbe mit einer realen, mehrseitigen ODT-Datei.
3. Text unmittelbar vor und unmittelbar nach einer automatisch berechneten
   Umbruchstelle eingeben (Cursor direkt an der Spacer-Position, siehe Grenzfall 9) →
   Dokument als DOCX exportieren → reimportieren → beide Textteile bleiben in
   korrekter Reihenfolge und vollständig erhalten, keine Vertauschung, kein Verlust.
4. Dasselbe als ODT.
5. Dokument mit einem Bild, das größer als eine Seite ist (Grenzfall 3), über den
   automatischen Seitenumbruch hinweg → Rundreise erhält das Bild vollständig und
   unverzerrt, unabhängig vom Overflow-Verhalten in der Anzeige.
6. Cross-Format DOCX → ODT → DOCX eines mehrseitigen Dokuments → Inhalt bleibt über
   beide Konvertierungen hinweg vollständig erhalten (Formatierungsnuancen bei
   Cross-Format sind wie im Rest der Spezifikation zu dokumentieren, Textverlust nicht,
   vgl. `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 19).
7. Datei mit von A4/25 mm abweichendem Originalseitenformat importieren, unverändert
   exportieren, reimportieren → **Textinhalt** bleibt vollständig erhalten; dass der
   ursprüngliche Seitenformat-/Randwert dabei nicht erhalten bleibt (da nie gelesen/
   geschrieben, siehe Befund 4), ist kein Bruch der Rundreise-Anforderung im Sinne
   dieser Datei, muss aber als bekannter, gesondert zu behebender Informationsverlust
   (Seitenformat, nicht Text) explizit dokumentiert werden.

**Abnahmekriterium:** Wie im Rest der Spezifikation gilt: Nuancen bei Formatierung/
Layout (z. B. abweichendes Seitenformat, Cross-Format-Feinheiten) sind zu dokumentieren
und akzeptabel; **das Verschwinden oder Vertauschen von Textinhalt durch die
Seitenansicht selbst ist es nicht.**

---

## 6. Testplan-Hinweise (Unit + E2E, Playwright)

1. **Bestehende Unit-Tests erhalten und erweitern:** `pagination.test.ts` deckt bereits
   Kernfälle von `computePageBreakIndices`/`computePageCount` ab (leer, exakter Fit,
   Überlauf, überdimensionierter Einzelblock, nicht-positive Seitenhöhe) — beizubehalten
   als Regressionsschutz.
2. **Neuer Unit-Test (Rundreise-Absicherung, siehe Abschnitt 5.1, Punkt 3):** eine
   Transaktion, die ausschließlich `tr.setMeta(paginationKey, decorationSet)` setzt,
   muss `tr.docChanged === false` ergeben — pinnt das aktuell aus Code-Lektüre korrekte,
   aber ungetestete Verhalten fest, dass Paginierungs-Updates niemals `onChange`
   auslösen.
3. **E2E-Test (Playwright), mehrseitiges Dokument:** genug Text eingeben/einfügen, um
   automatisch mindestens 3 Seiten zu erzeugen → prüfen, dass mindestens zwei
   `.page-break-spacer`-Elemente in der erwarteten Reihenfolge im DOM erscheinen, und
   dass die tatsächliche Anzahl mit einer aus den gemessenen Höhen erwarteten
   Seitenzahl übereinstimmt.
4. **Screenshot-Regressionstest, kurzes Dokument:** ein Absatz kurzer Text →
   Screenshot-Vergleich des oberen Randbereichs gegen die dokumentierte Sollgröße
   (25 mm) — liefert die in Abschnitt 4, Grenzfall 1 und
   `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.3 geforderte Klärung.
5. **Screenshot-Regressionstest, langes Dokument (≥ 4 Seiten):** Vergleich der
   Übergänge zwischen Seite 1/2 **und** Seite 3/4, um einen möglichen kumulativen
   Versatz (Befund 6) aufzudecken, der bei einem reinen Zwei-Seiten-Test unsichtbar
   bliebe.
6. **Viewport-Tests auf bestehenden Playwright-Projekten `Tablet` und `Mobile`:**
   Editor mit einem realen Dokument öffnen → Toolbar-Erreichbarkeit, Kern-Bedienbarkeit
   (Tippen, Fett, Export) sowie tatsächliches Scroll-/Lese-Verhalten der simulierten
   Seite prüfen und das Ergebnis explizit als Ist-Zustand festhalten (siehe Grenzfall 5).
7. **Farbschema-Test:** Rendering mit emulierter `prefers-color-scheme: dark` und
   `: light` → Seiten-Hintergrund bleibt weiß, ausreichender Kontrast zum Chrome in
   beiden Fällen (siehe Grenzfall 6).
8. **Regressionstest analog Selection-Sync-Bug (siehe Grenzfall 9):** Cursor exakt an
   einer automatisch berechneten Umbruchstelle positionieren (Text eingeben, das einen
   Umbruch erzwingt), dort tippen/löschen, danach Klick zum Neupositionieren + Tippen
   → beide Textteile bleiben korrekt getrennt und vollständig erhalten.
9. **Resize-Test:** Dokument mit mehreren Seiten laden, Browserfenster verkleinern/
   vergrößern **ohne** weitere Bearbeitung → prüfen, ob (wie laut Code erwartet) keine
   automatische Neuberechnung erfolgt, und das Ergebnis explizit als akzeptables oder zu
   behebendes Verhalten dokumentieren (siehe Grenzfall 8).
10. **Rundreise-Tests aus Abschnitt 5** sind sowohl als Unit-Tests gegen Reader/Writer
    **als auch** als E2E-Test über echte Bedienung (echter Upload → echter Download →
    echter Re-Upload) zu führen — reine Unit-Tests mit direkt konstruierten
    ProseMirror-JSON-Fixtures allein reichen nicht aus (vgl. `FEATURE-SPEC-DOCX-ODT.md`
    Abschnitt 17/21).
11. **Reale Test-Fixtures:** mindestens eine mehrseitige, mit echtem Microsoft Word
    erzeugte DOCX-Datei und eine mehrseitige, mit echtem LibreOffice Writer erzeugte
    ODT-Datei sind für die Screenshot- und Rundreise-Tests heranzuziehen (aktuell laut
    Repo-Durchsicht in `tests/fixtures/external` bereits mehrere Seitenumbruch-nahe
    ODT-/DOCX-Fixtures vorhanden — z. B. `pagebreaks.odt`, `saut_page.docx` — deren
    Eignung für diese Tests ist zu prüfen, bevor neue Fixtures beschafft werden).

---

## 7. Freigabekriterium für „vorhanden"

Der Backlog-Status von `seitenlayout-ansicht` darf erst dann als **vorhanden**
(unqualifiziert, im Sinne einer geprüften, verlässlichen Druckansicht statt eines
bloßen „einzigen verfügbaren Modus mangels Alternative") gelten, wenn:

- alle Bedienelemente/Darstellungsaspekte aus Abschnitt 1 tatsächlich existieren und
  wie spezifiziert funktionieren,
- alle Testfälle aus Abschnitt 6 automatisiert vorliegen und grün sind, insbesondere
  die Screenshot-Regressionstests für kurze **und** lange Dokumente (Abschnitt 6,
  Punkte 4–5), die die in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.3 offen gelassene
  Frage zum unerklärten Leerraum abschließend beantworten,
- die Grenzfälle aus Abschnitt 4 einzeln befundet sind (funktioniert wie spezifiziert /
  bewusst abweichendes, dokumentiertes Verhalten / repariert),
- Abschnitt 5.1 (Baseline-Rundreise) bestätigt, dass die Paginierung unter keinen
  Umständen Einfluss auf exportierten Dateiinhalt nimmt,
- Abschnitt 5.2 (Feature-Rundreise) für DOCX, ODT und die Cross-Format-Richtung besteht,
- der Regressionstest aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2
  (Selection-Sync-Bug) explizit mit einer Bearbeitung direkt an einer automatischen
  Umbruchstelle nachgestellt und grün ist,
- die bekannten, dokumentationspflichtigen Lücken (fehlende Kopf-/Fußzeilen-Anzeige,
  hartkodiertes A4/25-mm-Format unabhängig vom Originaldokument, kein Resize-Listener,
  ungeklärtes Tablet-/Mobile-Verhalten) einzeln entweder behoben oder als bewusst
  akzeptierte, dokumentierte Einschränkung festgehalten sind — nicht stillschweigend
  offen bleiben.

Andernfalls ist der Status auf **teilweise** zu setzen und die konkret fehlenden bzw.
noch zu klärenden Teilpunkte sind hier nachzutragen (analog zur Vorgehensweise in
`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 17/21 und in `seitenumbruch-req.md` Abschnitt 7).
