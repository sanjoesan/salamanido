# Anforderungen: Schriftgröße wählen (`schriftgroesse-waehlen`)

Status: Vom Backlog als **„fehlt"** geführt — gilt gemäß Aufgabenstellung als
**nicht vertrauenswürdig** und muss vollständig verifiziert werden, bevor dieser Status
bestätigt werden darf. Der Backlog-Eintrag wurde für dieses Dokument **zweimal
unabhängig** gegen den lebenden Quellcode geprüft (siehe Abschnitt 7, „Ist-Zustand laut
Code-Analyse") — nicht nur einmalig-oberflächlich — und **bestätigt**: Die Funktion
existiert aktuell **weder als UI-Element noch im internen Dokumentmodell noch im
DOCX-/ODT-Reader/-Writer** — mit Ausnahme einer fest verdrahteten, nicht editierbaren
Größe pro Überschriften-Ebene (siehe 7.2). Diese Datei beschreibt den vollständigen
Soll-Zustand, gegen den die Implementierung gebaut und anschließend per echter
Browser-Bedienung (nicht nur Unit-Tests) verifiziert werden muss.

Überarbeitungshinweis (2. Fassung): Gegenüber der ersten Fassung wurden zwei sachliche
Schwächen behoben, statt sie zu übernehmen — (a) ein **innerer Widerspruch** zwischen der
alten Regel „auf 0,5 pt runden, auch beim Import" (2.5) und der Zusage „Größe exakt
erhalten" (5.1), der für ODT-Dateien mit Nicht-0,5-Werten nicht beides gleichzeitig
erfüllbar war; (b) die **Vermischung von „kein Wert" und „gemischt"** in der Feldanzeige.
Beide Korrekturen sind unten an Ort und Stelle mit „(überarbeitet)" markiert und in
Abschnitt 5 mit einem ausdrücklichen Reconciliation-Hinweis an den Dev versehen, weil zu
`schriftgroesse-waehlen-code.md` bereits ein Umsetzungsplan gegen die erste Fassung
vorliegt.

Überarbeitungshinweis (3. Fassung, diese Prüfung): Der gepaarte Umsetzungsplan
`schriftgroesse-waehlen-code.md` hat sich seit der 2. Fassung dieser Anforderung selbst
weiterentwickelt und genau die beiden oben (2. Fassung) angestoßenen Reconciliation-Punkte
**eigenständig bereits korrekt gelöst** — wodurch zwei Stellen dieser Datei bei erneuter,
direkter Prüfung gegen den **aktuellen** Text des Code-Plans als **stale** identifiziert
wurden (sie forderten Korrekturen ein, die im Code-Plan längst vorgenommen waren, bzw. gaben
dessen Stand schlicht falsch wieder) und deshalb jetzt korrigiert wurden, statt sie
unverändert weiterzuführen: (a) Abschnitt 5 — die ODT-Rundungskorrektur (Import bewahrt
exakt) ist im Code-Plan bereits umgesetzt, nicht mehr offen; (b) Abschnitt 3.4 — die
App-Standardgröße ist entschieden (11 pt ausschließlich als UI-/CSS-Wert, **kein**
Export-Default in `w:docDefaults`/ODT-`Standard`-Stil), konsistent mit der bereits
angenommenen Entscheidung „Kein Produktstandard" aus `neues-dokument-code.md`, Entscheidung 3
— nicht mehr eine bis zur PO-/Lead-Bestätigung offene Frage. Beide Korrekturen wurden direkt
am aktuellen Stand von `schriftgroesse-waehlen-code.md` sowie an den zwei dazugehörigen,
bereits bestehenden und grünen Tripwire-Tests (`src/formats/docx/__tests__/styleDefs.test.ts`,
`src/formats/odt/__tests__/roundtrip.test.ts`) verifiziert, nicht vermutet.

Überarbeitungshinweis (4. Fassung, diese Prüfung): Erneut kritisch geprüft, nicht unbesehen
aus der 3. Fassung übernommen. Alle in Abschnitt 7 zitierten Code-Fundstellen (`schema.ts`,
`commands.ts`, `Toolbar.tsx`, `docx/reader.ts`, `docx/writer.ts`, `docx/styleDefs.ts`,
`odt/reader.ts`, `odt/writer.ts`, `odt/styleRegistry.ts`, `index.css`) sowie die beiden
Tripwire-Tests (`styleDefs.test.ts` Zeile 11, `roundtrip.test.ts` Zeile 426) und
`neues-dokument-code.md` Entscheidung 3 wurden erneut direkt am aktuellen Quellstand
gegengelesen und **unverändert bestätigt** — es existiert weiterhin **kein** `fontSize`-
oder `fontFamily`-Mark irgendwo im `src`-Baum (Volltextsuche). **Eine gefundene und hier
behobene Schwäche:** Abschnitt 5.2 verlangte für den Grenzfall-4.20-Nachweis (DOCX-Fixture
mit Größe **direkt** in `w:rPr`, nicht nur über eine Formatvorlage) eine reale Testdatei,
nannte aber — anders als für ODT, wo drei reale Kandidaten samt verifizierten pt-Werten
namentlich aufgeführt waren — **keine einzige konkrete DOCX-Datei**. Das wurde durch
eigenes Entpacken von `tests/fixtures/external/docx/bug59058.docx` geschlossen (Ergebnis
eigenständig nachvollzogen, nicht nur aus `schriftgroesse-waehlen-code.md` übernommen):
Die Datei trägt u. a. zehn echte `<w:r><w:rPr>`-Läufe mit sichtbarem Text (u. a. „Review
Article", „Abstract", „1. Introduction") bei `w:sz="27"` (= 13,5 pt) sowie einen weiteren
bei `w:sz="33"` (= 16,5 pt) und zahlreiche bei `w:sz="26"` (= 13 pt, Nicht-Preset) — siehe
die jetzt ergänzte Fixture-Nennung in Abschnitt 5.2.

Überarbeitungshinweis (5. Fassung, diese Prüfung): Erneut vollständig gegen den aktuellen
Quellstand geprüft, nicht unbesehen aus der 4. Fassung übernommen. Alle Codeverweise
(`schema.ts`, `commands.ts`, `Toolbar.tsx`, `docx/reader.ts` `marksFromRunProperties`,
`docx/writer.ts`, `docx/styleDefs.ts`, `odt/reader.ts`, `index.css` `.ProseMirror`) sowie
die im gepaarten Umsetzungsplan `schriftgroesse-waehlen-code.md` zitierten Fundstellen
(Abschnitt 3.2 „Import bewahrt exakt", Abschnitt 3.3 „11 pt nur UI-/CSS-Wert",
`FONT_SIZE_DEFAULT_PT = 11`) sowie die Referenzen `neues-dokument-code.md` Entscheidung 3
und `schriftart-waehlen-code.md` Design-Entscheidung 1 wurden erneut direkt am Quelltext
gegengelesen und **unverändert bestätigt** — inklusive stichprobenartigem Entpacken von
`tests/fixtures/external/docx/bug59058.docx` (bestätigt: `w:sz="26"`/„27"/„33" treten exakt
wie behauptet 1571×/20×/2× im Dokument auf). **Eine gefundene und hier behobene Schwäche:**
Die 3. Fassung hatte Abschnitt 3.4 von „offene Klärungsfrage" auf „entschieden" umgestellt,
dabei aber **zwei** an anderer Stelle im selben Dokument stehengebliebene Verweise auf den
alten, inzwischen falschen Stand übersehen — Abschnitt 6 (Nicht-Ziele) führte die
App-Standardgröße weiterhin ausdrücklich als „offene, vor Abnahme zu klärende Frage", und
Testfall 16 (Abschnitt 8) sprach noch von einer „in Abschnitt 3.4 beschriebenen offenen
Klärungsfrage". Beide Stellen widersprachen damit dem eigenen, bereits getroffenen Beschluss
in 3.4 sowie Abnahmekriterium 9.5 (das die Umsetzung der Festlegung bereits als Pflicht
voraussetzt) und sind jetzt korrigiert, statt diesen inneren Widerspruch unbemerkt
weiterzuführen. Ebenso präzisiert: Der Quelldatei-Hinweis zu `index.css` (oben) verwies auf
„Abschnitt 7.3, offene Klärungsfrage" — 7.3 enthält diese Diskussion tatsächlich nicht
(dort geht es um Reader/Writer-Lücken); der Verweis zeigt jetzt korrekt auf den bereits
entschiedenen Soll-Wert aus 3.4.

Bezug: `E:\docs\specs\FEATURE-BACKLOG.md`, Zeile `schriftgroesse-waehlen`
(„Legt die Punktgröße numerisch oder per Auswahlliste fest.", Bereich „2.2
Zeichenformatierung", Priorität **1 – essenziell**), sowie
`E:\docs\FEATURE-SPEC-DOCX-ODT.md`, Abschnitt 3 (Tabellenzeile „Schriftgröße —
Numerische Eingabe/Auswahl") und Abschnitt 17 (Zeile 18, „Schriftart-/
Schriftgrößen-Auswahl — fehlt"). An Stil und Detailtiefe von
`E:\docs\FEATURE-SPEC-DOCX-ODT.md` sowie den bereits vorhandenen
`specs/datei-oeffnen-req.md`, `specs/speichern-exportieren-req.md` und
`specs/schriftart-waehlen-req.md` orientiert sich dieses Dokument.

Betroffene Quelldateien (Ist-Stand zum Zeitpunkt dieser Anforderungsdefinition — alle
Stellen, die für die Implementierung angefasst werden müssen; jede Angabe wurde direkt am
Code verifiziert):
- `src/formats/shared/schema.ts` — ProseMirror-Schema, Abschnitt `marks`. Enthält
  aktuell `strong`, `em`, `underline`, `strike`, `textColor`, `highlight`. Ein neuer
  Mark `fontSize` (Attribut `pt: number`) fehlt vollständig.
- `src/formats/shared/editor/commands.ts` — enthält `applyMarkColor`/`clearMarkColor`
  als Vorbild für attributbehaftete Marks; für Schriftgröße fehlt das Äquivalent
  (z. B. `setFontSize`/`clearFontSize`). **Wichtig:** beide bestehenden Farbbefehle
  brechen bei leerer Selektion mit `if (empty) return false` ab — siehe Abgrenzung 2.2.
- `src/formats/shared/editor/Toolbar.tsx` — Toolbar-UI; kein Bedienelement für
  Schriftgröße vorhanden (auch keines für Schriftart, siehe Abgrenzung Abschnitt 6).
  Vorbild für „Wert aus aktueller Selektion ableiten" ist `currentHeadingLevel()`; der
  Helfer `run(view, cmd)` ruft nach jedem Befehl `view.focus()` auf.
- `src/formats/docx/reader.ts` (`marksFromRunProperties`) — liest `w:b`, `w:i`, `w:u`,
  `w:strike`, `w:color`, `w:shd`, aber **nicht** `w:sz` (Run-Schriftgröße in
  Halbpunkten). Ein `w:sz` in einer importierten Fremddatei geht damit aktuell
  stillschweigend verloren (Textinhalt bleibt erhalten, die Größeninformation nicht).
- `src/formats/docx/writer.ts` (`runPropertiesXml`) / `src/formats/docx/styleDefs.ts` —
  erzeugt `w:rPr`/`w:sz` aktuell **nur** fest codiert pro Überschriften-Ebene
  (`HEADING_FONT_SIZES`), nicht für frei gewählte Zeichenformatierung; `<w:docDefaults/>`
  ist leer.
- `src/formats/odt/reader.ts` (`RunStyle`/`parseAutomaticStyles`) — liest
  `fo:font-weight`, `fo:font-style`, `style:text-underline-style`,
  `style:text-line-through-style`, `fo:color`, `fo:background-color`, aber **nicht**
  `fo:font-size` auf Lauf-Ebene. Für `style:family="paragraph"` wird zudem **nur**
  `fo:text-align` gelesen (siehe 7.3 zum vorbestehenden Absatzformat-Gap).
- `src/formats/odt/writer.ts` (`runPropsFromMarks`) / `src/formats/odt/styleRegistry.ts`
  (`RunProps`, `buildTextStyleXml`, `TextStyleRegistry`) — kennt aktuell nur
  `bold`/`italic`/`underline`/`strike`/`color`/`highlight`; `fontSize` fehlt als Feld.
  `fo:font-size` wird nur in `headingStyleDefs()` fest pro Ebene erzeugt; der
  `Standard`-Absatzstil in `buildStylesXml` hat keine `style:text-properties`.
- `src/index.css` (`.ProseMirror`) — keine explizite `font-size`-Regel gesetzt; die
  Editor-Darstellung erbt aktuell die Tailwind-/Browser-Basisgröße statt des in
  Abschnitt 3.4 festgelegten App-Standards von 11 pt (WYSIWYG-Lücke, die die
  Implementierung schließen muss — siehe Testfall 16).

**Explizit nicht Teil dieser Anforderung** (separate Backlog-Einträge):
- `schriftart-waehlen` (Schriftart wählen, Priorität 1, ebenfalls „fehlt") — eigener,
  bereits separat spezifizierter Eintrag (`specs/schriftart-waehlen-req.md`). Wo beide
  Funktionen dieselbe Toolbar-Gruppe teilen, wird das hier nur als UI-Anordnungshinweis
  erwähnt, nicht als Anforderung an die Schriftart-Auswahl selbst.
- `schrift-vergroessern` / `schrift-verkleinern` (Schrift schrittweise
  vergrößern/verkleinern per Klick, Priorität 3, „fehlt") — eigene Einträge. Diese
  Datei fordert **nur** die direkte Größenwahl (numerisch/Auswahlliste), keine
  Inkrement-Buttons. Eine spätere Implementierung von
  `schrift-vergroessern`/`schrift-verkleinern` **muss** aber denselben `fontSize`-Mark
  wiederverwenden, den diese Anforderung einführt (Architekturhinweis, kein Blocker).
- Absatz-/Formatvorlagen-Schriftgrößen (z. B. Standardgröße einer neu definierten
  Formatvorlage, `formatvorlage-erstellen`) — eigener Eintrag, „fehlt", Priorität 4.

---

## 1. Betroffene Menüpunkte/Bedienelemente (Soll-Zustand)

Da die Funktion aktuell komplett fehlt, listet diese Tabelle den **zu bauenden**
Soll-Zustand statt eines vorhandenen Ist-Zustands:

| # | Element | Ort (geplant) | Soll-Verhalten |
|---|---|---|---|
| 1 | Kombiniertes Auswahl-/Eingabefeld „Schriftgröße" | `Toolbar.tsx`, unmittelbar neben der (separat zu bauenden) Schriftart-Auswahl, in derselben Toolbar-Gruppe wie Fett/Kursiv/Unterstrichen/Durchgestrichen | Editierbare Combobox: Freitext-Zahleneingabe **und** Dropdown mit Preset-Werten gleichzeitig nutzbar (analog Word/LibreOffice „Schriftgrad"-Feld). Kein separates Modal/Dialog nötig. |
| 2 | Dropdown-Liste der Preset-Größen | Teil von Element 1 | Enthält mindestens: 8, 9, 10, 10,5, 11, 12, 14, 16, 18, 20, 24, 28, 36, 48, 72 (Punkt). Klick auf einen Eintrag wendet ihn sofort an, ohne zusätzliche Bestätigung. |
| 3 | Freitext-Zahlenfeld (Teil derselben Combobox) | Teil von Element 1 | Manuelle Eingabe eines Werts außerhalb der Preset-Liste (z. B. „13" oder „22,5"). Bestätigung per Enter oder Fokusverlust (Blur). Escape verwirft die Eingabe und stellt den zuvor angezeigten Wert wieder her, ohne etwas anzuwenden. |
| 4 | Anzeige des aktuellen Werts **(überarbeitet)** | Teil von Element 1 | Zeigt die **effektive** Schriftgröße an der aktuellen Cursor-Position bzw. der Selektion **als konkrete Zahl** an, sofern die Selektion einheitlich ist — aufgelöst in dieser Rangfolge: (a) expliziter `fontSize`-Mark, sonst (b) implizite Vorlagen-Größe einer Überschrift (siehe 2.4), sonst (c) der App-Standardwert aus 3.4. Ein **leeres** Feld mit Platzhalter (`—`) ist ausschließlich dem echten „gemischt"-Zustand vorbehalten (siehe 2.3), **nicht** dem Normalfall von unformatiertem Fließtext (dort würde ein Word-typisches „11" statt eines verwirrend leeren Felds erwartet). Aktualisiert sich bei jeder Cursor-Bewegung, wie das bestehende Absatzformat-Dropdown (`currentHeadingLevel()` in `Toolbar.tsx` als Vorbild). |
| 5 | Tastatur-Bedienbarkeit & Barrierefreiheit | Teil von Element 1 | Per Tab erreichbar, mit Pfeiltasten Auf/Ab innerhalb der geöffneten Dropdown-Liste navigierbar, mit Enter übernehmbar — analog zum bestehenden Absatzformat-`<select>`, jedoch mit zusätzlicher Freitexteingabe (natives `<input list="…">`/Datalist oder gleichwertiges eigenes Combobox-Markup). Das Feld trägt einen zugänglichen Namen (`aria-label="Schriftgröße"`), siehe Grenzfall 4.19. |

Es gibt **keinen** zusätzlichen Menüpunkt „Format" → „Zeichen…" (kein
Ribbon/Backstage-Dialog mit erweiterten Zeichenoptionen) und **keine**
Tastenkombination (Word kennt z. B. Strg+Umschalt+P zum Fokussieren des
Schriftgrad-Felds) — beides ist nicht Bestandteil dieser Anforderung, kann aber als
spätere, hier nicht blockierende Ergänzung nachgetragen werden.

---

## 2. Gewünschtes Verhalten im Detail

### 2.1 Anwenden auf eine bestehende Selektion

1. Text markieren (beliebige Auswahlmethode, siehe `FEATURE-SPEC-DOCX-ODT.md`
   Abschnitt 2), neue Größe im Feld wählen/eintippen und bestätigen.
2. Die gesamte Selektion übernimmt die neue Größe, unabhängig davon, ob die
   Selektion vorher einheitlich formatiert war oder mehrere unterschiedliche
   Größen enthielt (letzte Aktion gewinnt für die gesamte Selektion — kein
   Zusammenführen/Mitteln).
3. Fokus kehrt nach Anwenden der Größe **zurück in den Editor** (analog zum
   bestehenden Muster in `Toolbar.tsx`, Funktion `run()`, die nach jedem Befehl
   `view.focus()` aufruft) — die Selektion darf nicht verloren gehen, sodass eine
   zweite Formatierungsaktion (z. B. zusätzlich Fett) direkt im Anschluss ohne
   erneutes Markieren möglich ist.
4. Die Anwendung erfolgt **sofort** bei Bestätigung (Enter, Blur, Dropdown-Klick) —
   kein zusätzlicher „Übernehmen"-Button nötig.

### 2.2 Anwenden ohne Selektion (an der Schreibmarke)

- Wird eine Größe gewählt, während die Selektion leer ist (reiner Cursor, kein
  markierter Text), muss dies **wie bei Fett/Kursiv/Unterstrichen/Durchgestrichen**
  als „gespeicherte Marke" (`storedMarks`) für als Nächstes getippten Text wirken,
  **nicht** auf umgebenden, bereits vorhandenen Text.
- **Wichtiger Abgrenzungshinweis (Regressionsgefahr):** Die bestehenden
  attributbehafteten Marks `textColor`/`highlight` (`applyMarkColor`/
  `clearMarkColor` in `commands.ts`) brechen bei leerer Selektion aktuell
  bewusst/faktisch ab (`if (empty) return false`) und wirken **nicht** an der
  Schreibmarke. Für `fontSize` ist das **kein** akzeptables Vorbild — die
  Anforderung aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 3, Testfall 2 („Anwenden ohne
  Selektion … wirkt sich auf neu getippten Text aus") gilt für Schriftgröße
  ausdrücklich **mit**, im Unterschied zum aktuellen Verhalten von
  Textfarbe/Hervorhebung. Das korrekte Vorbild ist stattdessen `toggleMark`
  (`prosemirror-commands`) mit `addStoredMark`/`removeStoredMark` bei
  Cursor-Selektion. Sollte aus Zeitgründen zunächst dieselbe Einschränkung wie bei
  `textColor`/`highlight` übernommen werden, muss das explizit als bekannte Abweichung
  dokumentiert werden, statt stillschweigend zu fehlen.

### 2.3 Anzeige bei uneinheitlicher Selektion **(überarbeitet)**

- Umfasst die Selektion Text mit **mehreren unterschiedlichen** effektiven
  Schriftgrößen (inkl. impliziter Größen durch Überschriften-Ebenen, siehe 2.4), zeigt
  das Feld einen eindeutig erkennbaren „gemischt"-Zustand (leeres Feld mit Platzhalter
  `—`, vergleichbar zu Words leerem Schriftgrad-Feld bei gemischter Selektion) —
  **nicht** einfach die Größe an der `$from`-Position, da das fälschlich
  Einheitlichkeit suggerieren würde.
- Ist die Selektion (oder die Cursor-Position) dagegen **einheitlich**, zeigt das Feld
  die konkrete Zahl (siehe Element 4). Der „gemischt"-Zustand ist strikt dem echten
  Uneinheitlichkeitsfall vorbehalten und **nicht** der Regelfall für gewöhnlichen
  Fließtext ohne expliziten Mark — dieser hat eine wohldefinierte effektive Größe (den
  App-Standard aus 3.4) und wird als solche angezeigt. Der Vergleich „einheitlich vs.
  gemischt" erfolgt über die **exakten** effektiven pt-Werte je Textlauf (kein Runden
  vor dem Vergleich, siehe 2.5), damit z. B. 10,3 pt neben 10,5 pt korrekt als
  „gemischt" erkannt wird.
- Wird in diesem „gemischt"-Zustand ein neuer Wert bestätigt, überschreibt dieser
  **die gesamte Selektion** einheitlich mit der neuen Größe (siehe 2.1, Punkt 2).

### 2.4 Zusammenspiel mit Formatvorlagen (Überschriften)

- Überschriften (`Überschrift 1`–`6`) haben aktuell eine implizite,
  vorlagenbasierte Größe (siehe 7.2: DOCX `HEADING_FONT_SIZES`, ODT
  `HEADING_FONT_SIZES` in `styleRegistry.ts`, beide entsprechen 24/20/18/16/14/13 pt),
  die **nicht** über einen Zeichen-Mark, sondern über das Absatzformat/die
  Formatvorlage gesetzt wird.
- Wird auf einen Textlauf **innerhalb** einer Überschrift zusätzlich eine explizite
  Schriftgröße über das neue Bedienelement gesetzt (direkte/„lokale" Formatierung),
  **überschreibt diese direkte Formatierung sichtbar die Vorlagen-Größe** für genau
  diesen Textlauf — Standard-Word/ODF-Verhalten „direkte Formatierung schlägt
  Formatvorlage". Der Rest der Überschrift ohne expliziten `fontSize`-Mark bleibt bei
  der Vorlagen-Größe.
- Wechsel der Formatvorlage (z. B. „Überschrift 1" → „Standard") ändert die
  implizite Größe, lässt aber einen zuvor explizit gesetzten `fontSize`-Mark auf
  einzelnen Textläufen unangetastet (die explizite Größe „gewinnt" weiterhin).

### 2.5 Werte, Einheit, Rundung und Wertebereich **(überarbeitet)**

- Einheit ist ausschließlich **Punkt (pt)** — keine px-/cm-/mm-Eingabe im
  Schriftgrößenfeld (Konsistenz mit DOCX `w:sz` und ODT `fo:font-size`).
- **Für vom Bedienelement neu gesetzte Werte** (Freitext-Commit, Preset-Klick, sowie
  aus der Zwischenablage übernommene `font-size`-Angaben, siehe 4.9) gilt:
  - Zulässiger Eingabebereich: **1 bis 400 pt**. Eingaben außerhalb werden **geclamped**
    (siehe 4.2/4.3). 400 pt ist eine bewusste, produktseitige Obergrenze für die
    Eingabe (deutlich unterhalb der theoretischen OOXML-Grenze `ST_HpsMeasure`, ~1638
    pt) — sie begrenzt nur die **eigene** Eingabe, nicht importierte Fremdwerte (nächster
    Punkt).
  - Granularität: **0,5-pt-Schritte** (Halbpunkt-Raster). Grund ist die Schreibseite:
    DOCX `w:sz` wird intern als ganzzahlige Halbpunkte gespeichert (`w:sz w:val="24"` =
    12 pt); ein in der App neu gewählter Wert soll deshalb in **beiden** Formaten
    verlustfrei darstellbar sein. Eine Eingabe wie „13,3" wird auf den nächstliegenden
    0,5-pt-Schritt (hier 13,5) gerundet und **sichtbar** im Feld korrigiert — es gibt
    keine stille Abweichung zwischen angezeigtem und gespeichertem Wert.
- **Für Werte, die unverändert aus einer importierten DOCX-/ODT-Datei gelesen werden,
  gilt das Gegenteil:** Sie werden **exakt erhalten** — **kein** Clamping, **keine**
  Rundung auf das 0,5-pt-Raster. Das ist zwingend, damit die verbindliche Rundreise
  „hochladen → unverändert exportieren → reimportieren" (Abschnitt 5) für die
  Größeninformation wirklich verlustfrei ist. Konkret:
  - DOCX `w:sz` liegt technisch bereits auf dem 0,5-pt-Raster (ganzzahlige Halbpunkte),
    `pt = wert / 2` ist also von Natur aus 0,5-fein — hier ist „exakt" trivial erfüllt.
  - ODT `fo:font-size` darf beliebige Dezimalstellen tragen (z. B. „10.3pt"); ein solcher
    Wert wird **unverändert** (10,3 pt) übernommen und beim unveränderten Re-Export wieder
    als „10.3pt" geschrieben. Er wird **nicht** auf 10,5 pt gerundet.
  - Ein importierter Wert oberhalb der Eingabe-Obergrenze (z. B. eine reale 500-pt-Datei)
    bleibt beim reinen Rundreise-Export ebenfalls unverändert erhalten; das 400-pt-Clamping
    greift erst, wenn die Nutzer:in an dieser Stelle **selbst** einen neuen Wert einträgt
    (analog zu Word: eine geöffnete Datei mit absurder Größe zeigt genau diesen Wert an, das
    Clamping wirkt erst bei eigener Neueingabe).
- Diese Trennung (Eingabe → runden+clampen; Import → exakt erhalten) ist die
  Auflösung des in der ersten Fassung enthaltenen Widerspruchs zwischen „immer runden"
  und „exakt erhalten"; die frühere Begründung „einheitliche Rundung, damit
  Cross-Format nicht driftet" entfällt, weil Cross-Format-Export (`speichern-unter-format`)
  laut Backlog „fehlt" und für den verbindlichen Basis-Scope dieser Datei ohnehin nicht
  gefordert ist (siehe 5.1, letzte Zeile).

---

## 3. Datenmodell- und Rundreise-Architektur (Anforderung an die Implementierung)

Diese Anforderung ist nicht rein UI-seitig, sondern erfordert einen neuen Mark im
gemeinsamen Editor-Schema, der von **beiden** Formaten gelesen und geschrieben
werden muss:

1. **Schema (`schema.ts`)**: Neuer Mark `fontSize` mit Attribut `pt` (Zahl, siehe
   Wertebereich 2.5). `toDOM`/`parseDOM` analog zu `textColor`
   (`style="font-size: ${pt}pt"`), damit die HTML-Zwischenrepräsentation (z. B. beim
   Einfügen aus der Zwischenablage, siehe Abschnitt 4.9) korrekt geparst wird. Da
   `validate: 'number'` in prosemirror-model wegen `typeof NaN === 'number'` einen
   `NaN`-Wert **nicht** ablehnt, muss die Absicherung gegen `NaN`/`±Infinity`
   vollständig in `getAttrs`/Reader/Toolbar erfolgen, nicht im Schema (siehe 4.1, 4.17).
2. **Commands (`commands.ts`)**: `setFontSize(pt: number): Command` und
   `clearFontSize(): Command`, jeweils **mit** Unterstützung für leere Selektion
   (siehe 2.2 — bewusster Unterschied zu `applyMarkColor`/`clearMarkColor`, die bei
   leerer Selektion `false` zurückgeben und damit nichts bewirken). Beide sammeln alle
   `selection.ranges` in **einer** Transaktion (genau ein Undo-Schritt, auch bei
   Tabellen-Zellselektion und sehr langer Selektion, siehe 4.6/4.10/4.15).
3. **DOCX-Reader (`reader.ts`, `marksFromRunProperties`)**: `w:sz` (Halbpunkte)
   aus `w:rPr` lesen, in `pt = wert / 2` umrechnen, als `fontSize`-Mark auf den Lauf
   anwenden — **exakt, ohne Clamping/Rundung** (siehe 2.5). Fehlt `w:sz` oder ist
   `w:val` nicht als positive Zahl interpretierbar, wird **kein** `fontSize`-Mark
   gesetzt (impliziter Standardwert der Zielanwendung gilt weiter, siehe 3.4; kein
   `NaN` im Modell, siehe 4.17).
4. **DOCX-Writer (`writer.ts`, `runPropertiesXml`)**: Für jeden Textlauf mit
   `fontSize`-Mark `<w:sz w:val="${Math.round(pt * 2)}"/>` (und `w:szCs` mit demselben
   Wert für Complex-Script-Konsistenz) in `w:rPr` schreiben. Ein unverändert aus dem
   Reader durchgereichter Wert muss beim Re-Export unverändert wieder herauskommen (kein
   Clamping beim Schreiben). Bestehende `HEADING_FONT_SIZES`-Logik in `styleDefs.ts`
   bleibt als Vorlagen-Default unverändert bestehen (siehe 2.4).
5. **ODT-Reader (`reader.ts`, `RunStyle`/`parseAutomaticStyles`, `family="text"`)**:
   `fo:font-size` aus den referenzierten `style:text-properties` lesen. Nur reine
   pt-Werte (`"Xpt"`) werden als Zahl `X` übernommen — **exakt, ohne Rundung/Clamping**
   (siehe 2.5). Nicht-pt-Werte (Prozentangaben, cm-Angaben, siehe 4.18) und
   nicht-interpretierbare Werte führen zu **keinem** `fontSize`-Mark (Text bleibt
   erhalten, kein Absturz).
6. **ODT-Writer (`writer.ts`/`styleRegistry.ts`)**: `RunProps` um Feld `fontSize?:
   number` erweitern, `buildTextStyleXml` schreibt bei vorhandenem Wert
   `fo:font-size="${fontSize}pt"` in die `style:text-properties`. Die
   `TextStyleRegistry`-Deduplizierung muss `fontSize` **kollisionsfrei** einbeziehen,
   sodass eine Mark-Kombination **mit** Größe niemals denselben Stil-Namen erhält wie
   dieselbe Kombination **ohne** Größe. Achtung: der aktuelle Dedup-Schlüssel
   `JSON.stringify(props)` ist von der Objekt-Einfügereihenfolge abhängig — mit dem
   siebten Feld steigt das Kollisionsrisiko; ein reihenfolgestabiler Schlüssel ist
   erforderlich (Detail gehört in `-code.md`, hier nur als Kollisionsfreiheits-Pflicht).
7. **Editor-CSS (`index.css`)**: Da `fontSize` als Mark mit `toDOM`-Style
   `font-size: ${pt}pt` gerendert wird, ist keine zusätzliche globale CSS-Regel
   nötig — muss aber verifiziert werden (siehe 4. „WYSIWYG-Grenzfälle" und Testfall 16).

### 3.4 Standardgröße bei fehlendem `fontSize`-Mark (in dieser Fassung entschieden — vormals offene Klärungsfrage)

Aktuell setzt **keine** der beiden Formatschreiber-Implementierungen eine explizite
Standard-Schriftgröße für Fließtext (DOCX: `<w:docDefaults/>` bleibt leer; ODT: der
`Standard`-Absatzstil hat keine `style:text-properties`) — **und das ist bereits eine
bewusste, separat geführte und bereits angenommene Produktentscheidung, keine noch offene
Frage dieser Datei:** `specs/neues-dokument-code.md`, Entscheidung 3 („Schrift-Standard |
**Kein Produktstandard.** Bleibt implizit … Wird nur explizit dokumentiert +
regressionsgetestet, damit es keine stille Annahme bleibt.") ist bereits abgenommen (siehe
Bible-Pipeline-Status „accept ‚Neues Dokument erstellen'"). Zwei bestehende, aktuell grüne
Tests bewachen genau das und wurden für diese Fassung direkt gelesen:
`src/formats/docx/__tests__/styleDefs.test.ts` (erwartet `<w:docDefaults\s*\/>` leer) und
`src/formats/odt/__tests__/roundtrip.test.ts` (erwartet den `Standard`-Stil
selbstschließend/ohne `style:text-properties`). Gleichzeitig setzt `index.css` **keine**
explizite `font-size` auf `.ProseMirror`, wodurch die Editor-Darstellung aktuell von der
Tailwind-/Browser-Basisgröße abhängt (effektiv 16 px ⇒ rechnerisch 12 pt bei 96 dpi) — ein
Zufallswert, der **weder** dem Word-Standard (11 pt, Calibri) **noch** zwingend dem
LibreOffice-Standard (12 pt, Liberation Serif) entsprechen muss und aktuell nirgends
dokumentiert ist.

**Entscheidung dieser Fassung (löst die vormals offene Klärungsfrage auf):** Die 2. Fassung
dieser Datei benannte zwei Varianten und verwies dabei auf einen angeblich bereits
„provisorisch mit 11 pt in `w:docDefaults`/ODT-`Standard`-Stil verankerten" Stand des
gepaarten Umsetzungsplans. Das war bei erneuter, direkter Prüfung des **aktuellen**
`schriftgroesse-waehlen-code.md` (dortiger Abschnitt 3.3) **nicht mehr zutreffend** — dieser
Plan hat seine eigene frühere Variante inzwischen selbst korrigiert und begründet dort
explizit das Gegenteil. Diese Fassung übernimmt die dort bereits sauber begründete
Entscheidung und macht sie **hier** verbindlich, statt die Frage erneut offenzulassen:

- App-Standard ist **11 pt** (wie Word) — aber **ausschließlich als UI-/CSS-Wert**:
  verankert in `.ProseMirror`-CSS (`font-size: 11pt`, für WYSIWYG-Optik und Testfall 16)
  und als reiner Anzeige-Fallback im Schriftgrößenfeld (Element 4/2.3: unformatierter
  Fließtext zeigt die Zahl „11" statt eines leeren Felds).
- **Ausdrücklich NICHT** in `w:docDefaults` (DOCX) oder den `Standard`-Absatzstil (ODT)
  geschrieben. Das wäre eine bewusste Umkehr der bereits angenommenen Entscheidung „Kein
  Produktstandard" und würde die beiden oben genannten, bestehenden Tests rot färben —
  beides ist als Nebenwirkung dieser Datei nicht akzeptabel.
- **Dokumentierte, akzeptierte Konsequenz:** Neu erstellter Text ohne jede Interaktion mit
  dem Schriftgrößenfeld trägt weiterhin **keinen** `fontSize`-Mark und **keinen**
  Export-Default (kein stiller, unsichtbarer Default-Wert, der die Rundreise-Prüfung
  verfälschen würde). Ein solches Dokument öffnet in Word mit dessen eigenem Default (meist
  Calibri 11 pt — deckungsgleich mit der In-App-Optik) und in LibreOffice mit dessen Default
  (oft 12 pt Liberation Serif — geringe, bewusst akzeptierte optische Abweichung von der
  In-App-Anzeige). Das ist **kein** durch diese Anforderung neu eingeführter Fehler, sondern
  der ausdrücklich gewählte Preis dafür, die bestehende Produktentscheidung nicht
  umzukehren.
- Eine hart im Export verankerte 11-pt-Variante bliebe theoretisch denkbar, ist aber
  **nicht** Teil dieser Anforderung: Sie würde `neues-dokument-code.md` Entscheidung 3
  zurücknehmen und beide oben genannten Tripwire-Tests anpassen müssen — eine solche
  Kurskorrektur wäre ein eigener, bewusster PO-Beschluss samt Abstimmung mit dem
  `schriftart-waehlen`-Schwestereintrag (der laut dessen Design-Entscheidung 1 denselben
  Nicht-Festlegungs-Ansatz verfolgt), nicht ein stillschweigender Nebeneffekt dieser Datei.

Abschnitt 3.4 gilt damit als **abgeschlossen**, nicht mehr offen — Abnahmekriterium 9.5 ist
mit genau dieser Festlegung erfüllt, sobald die tatsächliche Implementierung sie
unverändert umsetzt.

---

## 4. Grenzfälle (Edge Cases)

Jeder Fall ist einzeln zu verifizieren, für **beide** Formate (DOCX und ODT), sofern
nicht anders vermerkt:

| # | Grenzfall | Erwartetes Verhalten |
|---|---|---|
| 4.1 | Eingabe eines nicht-numerischen Werts (z. B. „abc", leeres Feld bei Enter) | Eingabe wird verworfen, vorheriger gültiger Wert bleibt sicht- und wirksam, keine Exception, kein stiller NaN-Wert im Dokumentmodell. |
| 4.2 | Eingabe von 0 oder negativen Werten | Abgelehnt, Feld springt auf den zuletzt gültigen Wert bzw. auf den erlaubten Minimalwert (1 pt), keine Anwendung von 0/negativ auf das Dokument. |
| 4.3 | Eingabe **über die Combobox** außerhalb des Bereichs (z. B. „5000") | Wird auf den erlaubten Maximalwert (400 pt) begrenzt (Clamping), sichtbar im Feld nach Bestätigung. Gilt **nur** für eigene Eingabe/Preset/Paste — **nicht** für unverändert importierte Fremdwerte (siehe 2.5 und 4.12). |
| 4.4 | Dezimalwert außerhalb der 0,5-pt-Schrittweite **bei eigener Eingabe** (z. B. „13,37") | Rundung auf nächsten 0,5-pt-Schritt (hier 13,5), sichtbar korrigiert im Feld — keine unsichtbare interne Abweichung. Importierte ODT-Werte mit Nicht-0,5-Dezimalen werden dagegen **exakt** erhalten (siehe 2.5). |
| 4.5 | Deutsches Dezimaltrennzeichen (Komma statt Punkt, z. B. „12,5") | Wird als 12,5 pt akzeptiert (deutsches Zahlenformat), nicht als Fehleingabe behandelt. |
| 4.6 | Selektion über mehrere Absätze/Listenelemente/Tabellenzellen mit unterschiedlichen Größen | Siehe 2.3 — Feld zeigt „gemischt", neue Auswahl setzt einheitliche Größe über die gesamte Selektion hinweg, inklusive über Zellgrenzen hinweg innerhalb derselben Tabelle (alle `selection.ranges` berücksichtigen, nicht nur `from`/`to`). |
| 4.7 | Selektion, die eine Überschrift und normalen Text gemeinsam umfasst | Feld zeigt „gemischt" (da implizite Vorlagen-Größe der Überschrift von der Größe des Fließtexts abweicht), neue explizite Größe wird auf **beide** Anteile als direkte Formatierung angewendet (siehe 2.4). |
| 4.8 | Schriftgröße auf ein Bild oder eine leere Tabellenzelle ohne Text anwenden (keine anwendbare Inline-Selektion) | Keine Wirkung/keine Exception — der Mark kann nur auf Inline-Content (`text`) angewendet werden, ein `image`-Node besitzt kein `fontSize`-Attribut. Die Feldanzeige zeigt in diesem Fall den Platzhalter (kein bestimmbarer Wert). |
| 4.9 | Einfügen von extern kopiertem Text mit expliziter `font-size` (z. B. aus einer Webseite/Word über die Zwischenablage) | Wird über den `parseDOM`-Pfad des `fontSize`-Marks erkannt und übernommen (nicht auf einen Zufallswert normalisiert). Da Browser-Zwischenablage meist `px` liefert (Word meist `pt`), sind beide Einheiten zu parsen (`px → pt` via `×72/96`). Als **neu gesetzter** Wert unterliegt er Rundung+Clamping (2.5); außerhalb des Bereichs wird geclamped (4.3). |
| 4.10 | Rückgängig/Wiederholen (Strg+Z/Strg+Y) nach Größenänderung | Einzelner Undo-Schritt macht genau eine Größenänderung rückgängig, auch wenn diese über die Toolbar statt über Tastatur ausgelöst wurde (siehe Undo-Anforderung in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2). |
| 4.11 | Größenänderung unmittelbar nach dem in Abschnitt 2 der Feature-Spec dokumentierten Selection-Sync-Bug-Szenario (Alles auswählen → Format anwenden → Klick zum Neupositionieren → Enter) | Muss denselben Regressionstest wie andere Zeichenformate bestehen — keine versehentliche Löschung/Ersetzung des Dokumentinhalts durch die neue Formatierungsaktion. |
| 4.12 | Reale Fremddatei mit Lauf-Schriftgrößen (`w:sz` bzw. `fo:font-size`), die außerhalb der eigenen Preset-Liste liegen (z. B. 13 pt) — sowie ein ODT-Wert außerhalb des 0,5-Rasters (z. B. 10,3 pt) oder oberhalb der Eingabe-Obergrenze | Import zeigt exakt den Originalwert im Feld an (13 pt bzw. 10,3 pt; keine Rundung auf Preset, keine Rundung auf 0,5, kein Clamping) — Dropdown-Liste ist nur Vorschlagsliste, kein Zwang zu Preset-Werten; siehe 2.5. |
| 4.13 | Schriftgröße innerhalb einer Kopf-/Fußzeile (sobald `kopfzeile-bearbeiten`/`fusszeile-bearbeiten` existieren) | Muss identisch zum Haupttext funktionieren, sobald diese Bereiche über die UI editierbar sind (aktuell blockiert durch fehlende Kopf-/Fußzeilen-UI, siehe `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 9 — kein Blocker für diese Anforderung, aber nachzutragen). |
| 4.14 | Zwei Schriftgrößen-Änderungen in schneller Folge (z. B. Preset-Klick, bevor die vorherige Eingabe committed wurde) | Kein Race Condition, letzter bestätigter Wert gewinnt deterministisch, keine widersprüchlichen Marks im selben Textlauf. |
| 4.15 | Sehr lange Selektion (gesamtes mehrseitiges Dokument, „Alles auswählen") + neue Größe | Anwendung bleibt performant (kein spürbares Einfrieren), UI bleibt reaktionsfähig, Undo funktioniert weiterhin als ein Schritt. Die „gemischt"-Erkennung (2.3) bricht beim ersten Widerspruch ab, statt das gesamte Dokument durchzuzählen. |
| 4.16 | Rundreise mit Halbpunkt-Werten (z. B. 10,5 pt) DOCX → DOCX und ODT → ODT | Wert bleibt exakt erhalten (10,5 liegt auf dem 0,5-pt-Raster). Cross-Format (DOCX↔ODT) ist erst mit `speichern-unter-format` relevant und dann nachrichtlich (siehe 5.1). |
| 4.17 | **(neu)** Fremddatei mit fehlerhaftem Größenattribut: `w:sz w:val="0"`/negativ/nicht-numerisch bzw. `fo:font-size` mit unlesbarem Wert | Attribut wird ignoriert → **kein** `fontSize`-Mark auf diesem Lauf, Text bleibt vollständig erhalten, kein Absturz, kein `NaN`/`Infinity` im Dokumentmodell (kein stiller Datenverlust, aber auch kein stiller Fehlwert). |
| 4.18 | **(neu)** ODT-Fremddatei mit `fo:font-size` als **Prozentangabe** (z. B. „120%") oder Nicht-pt-Einheit (z. B. „0.5cm") | Kein absoluter pt-Wert ableitbar → dokumentiertes Fallback: der Lauf behält seinen Text, es wird **kein** numerischer `fontSize`-Mark erzeugt (die relative/andere Angabe wird nicht als absolute pt-Zahl fehlinterpretiert). Kein Absturz; die Größe wird vereinfacht (Text-Round-Trip bleibt gewahrt). |
| 4.19 | **(neu)** Bedienelement-Robustheit / kein stiller Fehlschlag | Das Feld ist per Tab erreichbar, trägt einen zugänglichen Namen (`aria-label="Schriftgröße"`) und ist vollständig per Tastatur bedienbar (analog `schriftart-waehlen-req.md` Abschnitt 4). Eine verworfene/ungültige Eingabe erzeugt eine **sichtbare** Rückmeldung (Feld springt sichtbar auf den letzten gültigen Wert zurück) — nie eine Bestätigung, die einfach nichts tut (vgl. `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.4). |
| 4.20 | **(neu)** DOCX-Fremddatei, deren Lauf-Schriftgröße **ausschließlich über eine referenzierte Zeichen-/Absatzformatvorlage** (`w:rStyle`/`w:pStyle` mit `w:sz` im `word/styles.xml`) statt über direktes `w:rPr` gesetzt ist | Dokumentiertes Fallback, **symmetrisch** zum bereits in 7.3 benannten ODT-`family="paragraph"`-Gap: Der Reader liest laut 3, Punkt 3 **nur** die direkte `w:sz` aus `w:rPr` und löst **keine** Stildefinition auf (der bestehende Code nutzt `w:pStyle` ausschließlich zur Ableitung der Überschriften-**Ebene**, nicht der Größe). Eine rein stilbasierte Größe erzeugt daher **keinen** `fontSize`-Mark; Text bleibt vollständig erhalten, kein Absturz. Kein durch diese Anforderung neu eingeführter Fehler (eine vollständige Stilauflösung wäre eine eigene Scope-Erweiterung). **Konsequenz für die Fixture-Auswahl (5.2):** Der DOCX-Nachweis muss eine Datei mit **direkter** `w:rPr`-Größe verwenden, nicht eine, deren Größe nur in einer `w:rStyle`/`w:pStyle`-Definition steht. |
| 4.21 | **(neu)** DOCX-Fremddatei mit `w:szCs` (Complex-Script-Größe) **ohne** begleitendes `w:sz` | Der Reader wertet gemäß 3, Punkt 3 nur `w:sz` aus; eine reine `w:szCs`-Angabe (für lateinischen Fließtext unüblich, real vor allem in RTL-/CJK-Läufen) erzeugt **keinen** `fontSize`-Mark, kein Absturz. Beim **Schreiben** eines im Editor gesetzten Werts werden dagegen `w:sz` **und** `w:szCs` mit demselben Wert konsistent gemeinsam ausgegeben (siehe 3, Punkt 4), sodass ein eigener Rundreise-Export beide Attribute trägt. |

---

## 5. Rundreise-Anforderung (verbindlich für „vollständig verifiziert")

Wie bei jeder Zeichenformatierungsfunktion (siehe `FEATURE-SPEC-DOCX-ODT.md`
Abschnitt 3, Testfälle 4–5) gilt:

> Ein Textlauf mit gesetzter Schriftgröße wird nach Export **und** Re-Import
> (Datei A hochladen → unverändert exportieren → erneut importieren, **sowie**
> Editor-erzeugtes Dokument mit gesetzter Größe exportieren → importieren) mit
> **exakt derselben** Punktgröße am **exakt selben** Textteil wiederhergestellt.

Damit „exakt" hier ohne Einschränkung wörtlich gilt (und nicht durch eine
Import-Rundung unterlaufen wird), werden importierte Werte gemäß 2.5 **unverändert**
erhalten. „Exakt erhalten" bezieht sich auf den Wert, wie er in der jeweiligen Quelldatei
steht: ein DOCX-Halbpunktwert bleibt bitgenau, ein ODT-Dezimalwert wie 10,3 pt bleibt
10,3 pt.

**Reconciliation-Hinweis an den Dev — erledigt, bei dieser (3.) Fassung verifiziert:** Eine
frühere Fassung des gepaarten Umsetzungsplans `schriftgroesse-waehlen-code.md` rundete
importierte ODT-`fo:font-size`-Werte über `roundToHalfPt` auf 0,5 pt. Das wäre mit der
überarbeiteten Regel 2.5/5 **nicht** vereinbar gewesen (es hätte 10,3 pt zu 10,5 pt
verändert und die verbindliche verlustfreie ODT-Rundreise gebrochen). **Bei erneuter,
direkter Prüfung des aktuellen Stands von `schriftgroesse-waehlen-code.md`** (dortiger
Abschnitt 0 „TL;DR", Punkt 1, sowie Abschnitt 3.2) zeigt sich: Der Umsetzungsplan hat diese
Korrektur **bereits selbst** vorgenommen — Rundung/Clamping gelten dort inzwischen
ausdrücklich nur für vom Bedienelement/Preset/Paste **neu gesetzte** Werte, Import bewahrt
exakt (`Math.round`/`roundToHalfPt`/Clamping tauchen im Reader-Pfad nicht mehr auf). Dieser
Punkt ist damit **reconciled**, keine weitere PO↔Dev-Abstimmung mehr nötig — nur die
tatsächliche Implementierung muss bei Abnahme noch mit dieser (bereits übereinstimmenden)
Planlage abgeglichen werden (siehe Abnahmekriterium 9.4).

### 5.1 Format-Matrix — jede Zelle ist ein Pflicht-Testfall

| Zyklus | Pflicht |
|---|---|
| Im Editor neuen Text mit expliziter Schriftgröße erzeugen → als DOCX exportieren → reimportieren | Ja — Größe exakt erhalten, an derselben Textstelle |
| Im Editor neuen Text mit expliziter Schriftgröße erzeugen → als ODT exportieren → reimportieren | Ja — Größe exakt erhalten, an derselben Textstelle |
| Reale DOCX-Datei mit mehreren unterschiedlichen Lauf-Schriftgrößen hochladen → unverändert exportieren → reimportieren | Ja — jede einzelne Größe bleibt an ihrer ursprünglichen Textstelle exakt erhalten |
| Reale ODT-Datei mit mehreren unterschiedlichen Lauf-Schriftgrößen (inkl. mind. einem Nicht-0,5-Dezimalwert) hochladen → unverändert exportieren → reimportieren | Ja — jede Größe bleibt **exakt** erhalten (kein Runden auf 0,5, kein Clamping) |
| Dokument mit Schriftgröße **und** weiteren Zeichenformaten (fett, Farbe) auf demselben Textlauf → Rundreise DOCX **und** ODT | Ja — Kombination bleibt vollständig erhalten (keine der Formatierungen verdrängt eine andere; ODT-Dedup kollisionsfrei, siehe 3, Punkt 6) |
| Dokument mit Schriftgröße auf einem Textlauf innerhalb einer Überschrift (direkte Formatierung übersteuert Vorlage, siehe 2.4) → Rundreise DOCX **und** ODT | Ja — Übersteuerung bleibt nach Reimport weiterhin als direkte Formatierung erkennbar, nicht auf die Vorlagen-Größe zurückgefallen |
| Cross-Format: DOCX mit Schriftgröße importieren → als ODT exportieren → reimportieren (sobald `speichern-unter-format` verfügbar ist) | Nachrichtlich, sobald Cross-Format-Export existiert — bis dahin nicht blockierend für den Basis-Scope dieser Datei |

### 5.2 Mindestabdeckung der Testdatei(en)

Analog zu `speichern-exportieren-req.md` Abschnitt 5.2 muss mindestens eine
Testdatei je Format zusätzlich zur dortigen Mindestabdeckung folgende
größenspezifischen Fälle abdecken. Für die **ganzzahligen bzw. auf dem 0,5-Raster
liegenden, lauf-lokalen** Fälle enthält der Fixture-Bestand unter
`tests/fixtures/external/{docx,odt}` geeignete **reale** Kandidaten mit
`family="text"`-Größen (verifiziert per Entpacken der Dateien, nicht vermutet), z. B.
`odt/bigFont.odt` (72 pt), `odt/character-styles.odt` (16 pt),
`odt/feature_attributes_character_MSO15.odt` (16 pt). **Für DOCX ist
`docx/bug59058.docx` der geeignete reale Kandidat** — eigenständig per Entpacken
verifiziert (nicht nur aus `schriftgroesse-waehlen-code.md` übernommen): Sie trägt u. a.
`w:sz="26"` (= 13 pt, **Nicht-Preset**, Grenzfall 4.12), `w:sz="27"` (= 13,5 pt) und
`w:sz="33"` (= 16,5 pt, beide **Halbpunkt-Werte**, Grenzfall 4.16) — alle drei jeweils in
echten `<w:r><w:rPr>`-Läufen mit sichtbarem Text (u. a. „Review Article", „Abstract",
„1. Introduction"), nicht nur in der textlosen Absatzmarke (`<w:pPr><w:rPr>`), die
denselben Wert an anderer Stelle in derselben Datei zusätzlich trägt, aber vom Reader
ohnehin nicht ausgewertet wird (siehe Punkt 3, Nr. 3). Diese eine Datei deckt damit bereits
drei der folgenden Mindestabdeckungspunkte gleichzeitig ab (unterschiedliche Größen,
Halbpunkt-Wert, Nicht-Preset-Wert). **Für die DOCX-Fixture gilt
zusätzlich** (siehe Grenzfall 4.20 und 7.3): Die gewählte Datei muss die Größe **direkt**
in `w:rPr` (`w:sz`) tragen, nicht bloß über eine referenzierte `w:rStyle`/`w:pStyle`-
Definition, da der Reader keine Stilgrößen auflöst — eine per Zeichenformatvorlage gesetzte
Größe würde die Rundreise-Prüfung mangels Import fälschlich scheitern lassen. `bug59058.docx`
erfüllt das (siehe oben, direkte `<w:r><w:rPr>`-Läufe).
- Mindestens drei unterschiedliche, nicht dem App-Standard entsprechende
  Schriftgrößen im selben Dokument (z. B. 9 pt, 14 pt, 24 pt).
- Mindestens ein Halbpunkt-Wert (z. B. 10,5 pt).
- Mindestens ein Wert außerhalb der Preset-Dropdown-Liste (z. B. 13 pt), um
  Grenzfall 4.12 abzudecken.
- Mindestens ein ODT-Wert außerhalb des 0,5-pt-Rasters (z. B. 10,3 pt), um die
  exakte, ungerundete ODT-Rundreise (2.5/5.1) nachzuweisen. **Dieser Wert muss als
  gezielt konstruiertes (synthetisches) `family="text"`-Fixture bereitgestellt werden**
  — siehe Fixture-Realitätshinweis unten; im vorhandenen realen Bestand existiert kein
  solcher Wert.
- Mindestens eine Überschrift mit einem Textlauf, der eine von der Vorlagen-Größe
  abweichende, explizite Größe trägt (Grenzfall 2.4/4.7). Für die Fixture-Auswahl ist
  darauf zu achten, dass die Größe über einen `text:span`-Stil (`family="text"`) läuft,
  nicht über eine reine Absatzformat-Vorlage (vorbestehender Reader-Gap, siehe 7.3).
- Mindestens ein Lauf mit fehlerhaftem/relativem Größenattribut (0/negativ bzw.
  Prozent), um 4.17/4.18 nachzuweisen (als gezielt konstruiertes Fixture; ODT-Prozentwerte
  wie „100%"/„115%" existieren zwar real im Bestand, ein `0pt`/negativ-Wert dagegen nicht).

**Fixture-Realitätshinweis (verifiziert, damit die QA keinen nicht existierenden realen
Kandidaten sucht):** Ein vollständiger Scan des gesamten ODT-Fixture-Bestands (202 Dateien,
`content.xml` **und** `styles.xml` entpackt) ergibt als **einzige** Nicht-Ganzzahl-Werte
`17,5 pt` und `21,5 pt` — beide liegen (a) **bereits auf dem 0,5-Raster** und tragen daher
gerade **nicht** die von 2.5/5.1 geforderte Nicht-0,5-Dezimale, und (b) hängen in der
einzigen Trägerdatei `odt/tableComplex_DOC_LO41.odt` an `style:family="paragraph"`-Stilen,
die der aktuelle ODT-Reader für die Schriftgröße **gar nicht** ausliest (vorbestehender
Reader-Gap, siehe 7.3). Es gibt im realen Bestand somit **keine** lauf-lokale
(`family="text"`) Schriftgröße außerhalb des 0,5-Rasters. Der Kernnachweis der
2. Fassung — die **exakt ungerundete** ODT-Rundreise eines Werts wie 10,3 pt — ist deshalb
**nur** über ein synthetisch erzeugtes `content.xml`-Fixture (ein `family="text"`-Stil mit
`fo:font-size="10.3pt"`) führbar, nicht über eine reale Fremddatei. Dieser Befund deckt
sich mit dem gepaarten Umsetzungsplan `schriftgroesse-waehlen-code.md` (dortiger Fixture-Scan)
und hält Anforderung und Code reconciled (vgl. Abnahmekriterium 9.4).

---

## 6. Nicht-Ziele / bewusste Abgrenzung

Zur Vermeidung von Scope-Creep bei der Verifikation dieses konkreten
Backlog-Eintrags gelten folgende, separat geführte Punkte **ausdrücklich nicht**
als Teil von „Schriftgröße wählen":

- `schriftart-waehlen` — Auswahl der Schriftfamilie. Eigener Eintrag, eigenes
  Anforderungsdokument (`specs/schriftart-waehlen-req.md`).
- `schrift-vergroessern` / `schrift-verkleinern` — schrittweise Inkrement-Buttons.
  Eigene Einträge; sollen den hier eingeführten `fontSize`-Mark wiederverwenden,
  sind aber nicht Gegenstand der hier geforderten Verifikation.
- `formatierung-loeschen`/`formatvorlage-erstellen`/`zeichenformatvorlage` — globales
  „Formatierung löschen" bzw. benutzerdefinierte Formatvorlagen mit eigener
  Standardgröße. Eigene, als „fehlt" geführte Einträge. `clearFontSize()` muss lediglich
  isoliert funktionieren; ein eigener „Schriftgröße entfernen"-Button ist **nicht**
  gefordert (anders als bei Textfarbe/Hervorhebung) — Abschnitt 1 listet dafür kein
  Element.
- Kopf-/Fußzeilen-Editier-UI selbst (`kopfzeile-bearbeiten`/`fusszeile-bearbeiten`)
  — wird vorausgesetzt, sobald verfügbar (siehe Grenzfall 4.13), aber nicht hier neu
  spezifiziert.
- Echtes Einbetten von Schriftgrößen in Formatvorlagen-Definitionen über die UI
  (z. B. „Standardgröße dieser Vorlage ändern") — nicht Teil dieser Datei.
- Die generelle Klärung des App-weiten Standard-Schriftgrads ist eng mit dieser
  Anforderung verwandt, aber in Abschnitt 3.4 bereits **abschließend entschieden**
  (11 pt als reiner UI-/CSS-Wert, kein Export-Default) und **kein** offener Punkt mehr
  dieses Dokuments — dieser Aufzählungspunkt wurde in einer früheren Fassung
  fälschlich noch als offen geführt und ist hiermit korrigiert (siehe
  Abnahmekriterium 9.5). Nicht Teil dieser Datei ist lediglich die **Rücknahme**
  dieser Entscheidung zugunsten einer hart im Export verankerten Standardgröße
  (siehe 3.4, letzter Absatz) — das bliebe ein eigener, bewusster PO-Beschluss.

---

## 7. Ist-Zustand laut Code-Analyse (Verifikationsbefund zum Backlog-Status)

Zur Einordnung, warum der Backlog-Status „fehlt" bei dieser Verifikation als
**zutreffend bestätigt** gilt. Alle folgenden Aussagen wurden für diese Fassung ein
**zweites Mal direkt am Quellcode** geprüft (nicht aus der ersten Fassung übernommen):

### 7.1 UI

`Toolbar.tsx` enthält Bedienelemente für Ausschneiden, Absatzformat (`<select>` mit
`currentHeadingLevel()`), Fett/Kursiv/Unterstrichen/Durchgestrichen (`MarkButton`),
Textfarbe/Hervorhebung (inkl. „Entfernen"-Buttons `⌫`), Ausrichtung, Listen,
Tabelle-Einfügen und Bild-Einfügen — **kein** Element für Schriftgröße oder
Schriftart ist vorhanden, auch nicht in eingeschränkter/fester Form.

### 7.2 Datenmodell

`schema.ts` definiert die Marks `strong`, `em`, `underline`, `strike`,
`textColor`, `highlight` — kein `fontSize`-Mark. Die einzige im Repository
vorhandene Verbindung von Text zu einer Punktgröße ist **vollständig an die
Überschriften-Formatvorlage gekoppelt und nicht durch die Nutzer:in einstellbar**:
- DOCX: `styleDefs.ts`, `HEADING_FONT_SIZES = { 1: 48, 2: 40, 3: 36, 4: 32, 5: 28,
  6: 26 }` (Halbpunkte, d. h. 24/20/18/16/14/13 pt), fest in
  `<w:rPr><w:b/><w:sz w:val="…"/></w:rPr>` der jeweiligen `Heading N`-Formatvorlage.
- ODT: `styleRegistry.ts`, `HEADING_FONT_SIZES = { 1: 24, 2: 20, 3: 18, 4: 16,
  5: 14, 6: 13 }` (Punkt), fest in `fo:font-size="…pt"` der jeweiligen
  `HeadingN-<align>`-Formatvorlagen.

`commands.ts` enthält kein Äquivalent zu `setFontSize`; `applyMarkColor`/
`clearMarkColor` geben bei leerer Selektion `false` zurück (bewusst **kein** Vorbild
für Schriftgröße, siehe 2.2).

### 7.3 Reader/Writer

Weder `docx/reader.ts` (`marksFromRunProperties`) noch `odt/reader.ts`
(`parseAutomaticStyles`, Zweig `family="text"`) liest `w:sz` bzw. `fo:font-size` auf
Lauf-Ebene (außerhalb der Formatvorlagen-Definition) aus — eine importierte
Fremddatei mit expliziter Lauf-Schriftgröße verliert diese Information beim Import
stillschweigend (Text bleibt erhalten, Größe nicht; ein zu ergänzender Grenzfall,
siehe 4.12). Weder `docx/writer.ts` (`runPropertiesXml`) noch
`odt/writer.ts` (`runPropsFromMarks`)/`odt/styleRegistry.ts` (`RunProps`,
`buildTextStyleXml`, `isEmpty`) kann aktuell eine frei gewählte Lauf-Schriftgröße
schreiben. `odt/writer.ts`, `buildStylesXml`, definiert `Standard` **ohne**
`style:text-properties`; `docx/styleDefs.ts` hat ein leeres `<w:docDefaults/>` — es
gibt also auch keinen expliziten App-Standardwert (siehe 3.4).

**Vorbestehender, hier NICHT zu behebender Nebengap (dokumentiert zur Abgrenzung):**
`odt/reader.ts` liest für `style:family="paragraph"` **nur** `fo:text-align` — direkte
Zeichenformatierung (Fett/Kursiv/Farbe **und** künftig Größe) auf reiner
Absatzformat-Ebene (statt über einen `text:span`) geht dort schon **heute** für die
bereits vorhandenen Marks verloren. Das ist kein durch diese Anforderung neu
eingeführter Fehler und wird hier nicht behoben (Scope-Erweiterung auf alle
Zeichenformate wäre nötig) — es ist aber bei der Fixture-Auswahl (5.2) zu
berücksichtigen.

**Symmetrischer, ebenfalls NICHT zu behebender DOCX-Nebengap (zur Abgrenzung, siehe
Grenzfall 4.20):** `docx/reader.ts` liest Zeichenformatierung ausschließlich aus dem
**direkten** `w:rPr` eines Laufs (`marksFromRunProperties`). `w:pStyle` wird nur zur
Ableitung der Überschriften-**Ebene** herangezogen (`headingLevelForStyle`), und `w:rStyle`
(Zeichenformatvorlage) wird für die Zeichenmarks **gar nicht** aufgelöst. Trägt eine reale
DOCX-Datei die Lauf-Schriftgröße also nur über eine referenzierte Zeichen-/Absatzformat-
vorlage im `word/styles.xml` (statt über direktes `w:sz`), geht diese Größe beim Import
verloren — **genau parallel** zum obigen ODT-`paragraph`-Fall und aus demselben Grund
(fehlende Stilauflösung). Das gilt bereits **heute** für die vorhandenen Marks
(Fett/Farbe/…) und wird durch diese Anforderung weder verschlimmert noch behoben; es ist
lediglich der Grund, warum die DOCX-Fixture in 5.2 die Größe **direkt** im `w:rPr` tragen
muss.

**Fazit**: Der Backlog-Status „fehlt" für `schriftgroesse-waehlen` ist nach dieser
(doppelt durchgeführten) Code-Analyse korrekt. Die Verifikationsarbeit besteht folglich
nicht aus dem Prüfen einer bestehenden, aber unbewiesenen Funktion (wie bei
„vorhanden"-Einträgen), sondern aus dem vollständigen **Neubau** gegen die
Anforderungen in Abschnitt 1–6 sowie der anschließenden Verifikation genau dieser
neuen Implementierung.

---

## 8. Testfälle (Zusammenfassung, konkret abhakbar)

1. Schriftgrößen-Feld ist in der Toolbar sichtbar, über Tab erreichbar und trägt einen
   zugänglichen Namen („Schriftgröße", 4.19).
2. Preset-Wert aus der Dropdown-Liste auf eine Selektion anwenden → sichtbar korrekt
   gerendert (`font-size` im DOM), Fokus kehrt in den Editor zurück.
3. Freitext-Zahl eintippen und mit Enter bestätigen → wird auf die Selektion
   angewendet, Rundung auf 0,5-pt-Schritte greift bei eigener Eingabe bei Bedarf (4.4).
4. Größe ohne Selektion (an der Schreibmarke) setzen → wirkt sich nur auf als
   Nächstes getippten Text aus, nicht auf umgebenden Text (2.2).
5. Uniforme Selektion → Feld zeigt die konkrete Zahl (Mark, Überschriften-Größe oder
   App-Standard); Selektion mit mehreren unterschiedlichen Größen → Feld zeigt
   „gemischt" (leer/`—`), neue Größe vereinheitlicht die gesamte Selektion (2.3, 4.6).
6. Größe auf Textlauf innerhalb einer Überschrift → übersteuert sichtbar die
   Vorlagen-Größe, Rest der Überschrift bleibt unverändert (2.4, 4.7).
7. Ungültige Eingaben (Buchstaben, 0, negativ, >400) werden abgelehnt/geclamped,
   kein Absturz, kein NaN im Dokumentmodell (4.1–4.3), sichtbare Rückmeldung (4.19).
8. Deutsches Komma als Dezimaltrennzeichen wird akzeptiert (4.5).
9. Undo/Redo macht eine Größenänderung als einzelnen Schritt rückgängig/wiederholt
   sie (4.10), auch nach dem Selection-Sync-Bug-Szenario aus Abschnitt 2 der
   Feature-Spec (4.11).
10. Rundreise DOCX: Editor-erzeugter Text mit expliziter Größe → Export → Reimport →
    Größe exakt erhalten.
11. Rundreise ODT: dito, inkl. eines Nicht-0,5-Dezimalwerts, der **exakt** (ungerundet)
    erhalten bleibt (2.5, 5.1).
12. Reale Fremddatei mit mehreren **direkt** (in `w:rPr`/`text:span`) gesetzten
    Lauf-Schriftgrößen (inkl. Nicht-Preset-Wert wie 13 pt und ODT-Wert wie 10,3 pt)
    importieren → unverändert exportieren → reimportieren → jede Größe an ihrer
    ursprünglichen Textstelle exakt erhalten (4.12, 5.1, 5.2). Zusätzlich: Eine Datei mit
    rein **stilbasierter** Größe (`w:rStyle`/`w:pStyle` bzw. ODT-`family="paragraph"`)
    stürzt beim Import nicht ab und verliert nur die Größe, nicht den Text (4.20, 7.3).
13. Kombination Schriftgröße + Fett + Schriftfarbe auf demselben Textlauf →
    Rundreise DOCX und ODT erhält alle drei Formate gemeinsam; ODT-Stil-Dedup bleibt
    kollisionsfrei (3, Punkt 6).
14. Fremddatei mit fehlerhaftem (0/negativ/nicht-numerisch) bzw. relativem
    (Prozent) Größenattribut → kein Mark, Text erhalten, kein Absturz, kein NaN
    (4.17, 4.18).
15. Einfügen von extern kopiertem Text mit `font-size`-Style (`px` und `pt`) → wird
    übernommen, nicht auf einen Zufallswert normalisiert (4.9).
16. WYSIWYG-Check: In-App-Darstellung einer gesetzten Größe entspricht optisch
    (CSS `pt` = Export-`pt`) exakt dem im Export erzeugten Wert, **und** unformatierter
    Fließtext ohne jeden `fontSize`-Mark rendert sichtbar mit 11 pt — verifiziert damit
    messtechnisch die in Abschnitt 3.4 getroffene (bereits entschiedene) Festlegung.

---

## 9. Abnahmekriterium für „vollständig verifiziert"

Der Backlog-Status für `schriftgroesse-waehlen` darf erst dann von „fehlt" auf
„vorhanden (verifiziert)" geändert werden, wenn:

1. Das Bedienelement aus Abschnitt 1 gebaut und über echte Browser-Interaktion
   (Playwright, nicht nur Command-Aufruf isoliert) bedienbar ist — Schema-Mark,
   Toolbar-Combobox, Commands, DOCX- **und** ODT-Reader/Writer, nicht nur eines davon.
2. Jeder Testfall aus Abschnitt 8 sowie jeder Grenzfall aus Abschnitt 4 (inkl. der neuen
   Fälle 4.17–4.21) einzeln mit einem dauerhaft in der Suite verbleibenden, echten
   E2E- bzw. Reader-/Writer-Test nachgewiesen ist. Für die rein stilbasierten Fälle 4.20/
   4.21 genügt ein Reader-Robustheitstest (kein Absturz, kein `NaN`, Text erhalten), da die
   Stilauflösung bewusst außerhalb des Scopes bleibt.
3. Die vollständige Rundreise-Matrix aus Abschnitt 5.1 für DOCX **und** ODT mit der
   in 5.2 geforderten Mindestabdeckung grün ist — insbesondere der Nachweis, dass ein
   ODT-Dezimalwert (z. B. 10,3 pt) die Rundreise **exakt** (ungerundet) übersteht.
4. Die überarbeitete Rundungs-/Clamping-Regel (2.5) und der Reader (Import bewahrt
   exakt) mit dem Umsetzungsplan `schriftgroesse-waehlen-code.md` abgeglichen sind
   (Reconciliation-Hinweis in Abschnitt 5 — bei dieser Fassung bereits als reconciled
   verifiziert), sodass Anforderung und Code nicht auseinanderlaufen. Verbleibend ist
   lediglich der Abgleich der **tatsächlichen** Implementierung gegen diese bereits
   übereinstimmende Planlage, kein weiterer inhaltlicher Klärungsbedarf.
5. Die in Abschnitt 3.4 getroffene Festlegung (App-Standard 11 pt **ausschließlich** als
   UI-/CSS-Wert, **kein** Export-Default in `w:docDefaults`/ODT-`Standard`-Stil, konsistent
   mit der bereits angenommenen Entscheidung „Kein Produktstandard" aus
   `neues-dokument-code.md`) in der tatsächlichen Implementierung identisch umgesetzt ist —
   insbesondere bleiben die beiden bestehenden Tripwire-Tests
   (`docx/__tests__/styleDefs.test.ts`, `odt/__tests__/roundtrip.test.ts`) weiterhin grün.
6. Kein aus dieser Datei hervorgegangener Fehlerbefund unbeantwortet bleibt (jeder
   Fund entweder behoben und regressionsgetestet, oder bewusst als bekannte
   Einschränkung dokumentiert), analog zur „Kein stiller Fehlschlag"-Anforderung in
   `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.4.

---

## 10. Umsetzungsstand (2026-07-11)

**Umgesetzt und verifiziert:** Unit 749/749 (davon 17 neue in `schriftgroesse.test.ts`);
E2E `schriftgroesse.spec.ts` 8 Testfälle grün auf Desktop Chrome, Mobile und Tablet
(inkl. Rundreisen mit Roh-XML-Assertions `w:sz w:val="21"` bzw. `fo:font-size="10.5pt"`);
volle Suite 1100 passed / 0 echte Fails (2 bekannte, isoliert grüne Lastflakes).

**Kernpunkte der Implementierung (spec-konform):**
- `fontSize`-Mark (`pt`), Combobox = `<input list>`+Datalist mit den §1-Presets,
  deutsche Komma-Anzeige, Draft-State (Selektions-Sync überschreibt Tippen nicht),
  Enter/Blur committen, Escape verwirft (§1 #3).
- Anzeige-Rangfolge §1 #4 exakt: Mark → Überschriften-Vorlage (24/20/18/16/14/13) →
  11-pt-Anzeige-Standard; „—"-Platzhalter NUR bei echt gemischter Selektion, Vergleich
  über exakte pt-Werte (§2.3).
- Schreibmarken-Semantik über storedMarks (§2.2 — ausdrücklich das toggleMark-Muster).
- Eingaben: 0,5er-Raster + 1–400-Clamp, SICHTBAR korrigiert (13,3 → „13,5" im Feld);
  Importwerte EXAKT erhalten (ODT 10,3 pt und 500 pt unit-belegt, §2.5).
- §3.4 unverändert übernommen: 11 pt NUR als `.ProseMirror`-CSS + Anzeige-Fallback;
  `w:docDefaults`/ODT-`Standard`-Stil bleiben leer (beide Tripwire-Tests grün).
- DOCX `w:sz`+`w:szCs` (halbe Punkte), ODT `fo:font-size` (+asian/complex); Clipboard-
  parseDOM: pt exakt, px → pt umgerechnet und wie Neueingabe gerastert/geclamped (§4.9).
