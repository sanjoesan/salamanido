# Anforderungen: Schriftgröße wählen (`schriftgroesse-waehlen`)

Status: Vom Backlog als **„fehlt"** geführt — gilt gemäß Aufgabenstellung als
**nicht vertrauenswürdig** und muss vollständig verifiziert werden, bevor dieser Status
bestätigt werden darf. Eine erste Code-Verifikation wurde beim Erstellen dieses
Dokuments bereits durchgeführt (siehe Abschnitt 7, „Ist-Zustand laut Code-Analyse") und
**bestätigt** den Backlog-Eintrag: Die Funktion existiert aktuell **weder als
UI-Element noch im internen Dokumentmodell noch im DOCX-/ODT-Reader/-Writer** — mit
Ausnahme einer fest verdrahteten, nicht editierbaren Größe pro Überschriften-Ebene
(siehe 7.2). Diese Datei beschreibt den vollständigen Soll-Zustand, gegen den die
Implementierung gebaut und anschließend per echter Browser-Bedienung (nicht nur
Unit-Tests) verifiziert werden muss.

Bezug: `E:\docs\specs\FEATURE-BACKLOG.md`, Zeile `schriftgroesse-waehlen`
(„Legt die Punktgröße numerisch oder per Auswahlliste fest.", Bereich „2.2
Zeichenformatierung", Priorität **1 – essenziell**), sowie
`E:\docs\FEATURE-SPEC-DOCX-ODT.md`, Abschnitt 3 (Tabellenzeile „Schriftgröße —
Numerische Eingabe/Auswahl") und Abschnitt 17 (Zeile 18, „Schriftart-/
Schriftgrößen-Auswahl — fehlt"). An Stil und Detailtiefe von
`E:\docs\FEATURE-SPEC-DOCX-ODT.md` sowie den bereits vorhandenen
`specs/datei-oeffnen-req.md` und `specs/speichern-exportieren-req.md` orientiert sich
dieses Dokument.

Betroffene Quelldateien (Ist-Stand zum Zeitpunkt dieser Anforderungsdefinition — alle
Stellen, die für die Implementierung angefasst werden müssen):
- `src/formats/shared/schema.ts` — ProseMirror-Schema, Abschnitt `marks`. Enthält
  aktuell `strong`, `em`, `underline`, `strike`, `textColor`, `highlight`. Ein neuer
  Mark `fontSize` (Attribut `pt: number`) fehlt vollständig.
- `src/formats/shared/editor/commands.ts` — enthält `applyMarkColor`/`clearMarkColor`
  als Vorbild für attributbehaftete Marks; für Schriftgröße fehlt das Äquivalent
  (z. B. `setFontSize`/`clearFontSize`).
- `src/formats/shared/editor/Toolbar.tsx` — Toolbar-UI; kein Bedienelement für
  Schriftgröße vorhanden (auch keines für Schriftart, siehe Abgrenzung Abschnitt 6).
- `src/formats/docx/reader.ts` (`marksFromRunProperties`) — liest `w:b`, `w:i`, `w:u`,
  `w:strike`, `w:color`, `w:shd`, aber **nicht** `w:sz` (Run-Schriftgröße in
  Halbpunkten). Ein `w:sz` in einer importierten Fremddatei geht damit aktuell
  stillschweigend verloren (Textinhalt bleibt erhalten, die Größeninformation nicht).
- `src/formats/docx/writer.ts` / `src/formats/docx/styleDefs.ts` — erzeugt
  `w:rPr`/`w:sz` aktuell **nur** fest codiert pro Überschriften-Ebene
  (`HEADING_FONT_SIZES`), nicht für frei gewählte Zeichenformatierung.
- `src/formats/odt/reader.ts` (Zeilen um `runProperties`) — liest `fo:font-weight`,
  `fo:font-style`, `style:text-underline-style`, `style:text-line-through-style`,
  `fo:color`, `fo:background-color`, aber **nicht** `fo:font-size` auf Lauf-Ebene.
- `src/formats/odt/writer.ts` / `src/formats/odt/styleRegistry.ts`
  (`RunProps`, `buildTextStyleXml`, `TextStyleRegistry`) — kennt aktuell nur
  `bold`/`italic`/`underline`/`strike`/`color`/`highlight`; `fontSize` fehlt als Feld.
  `fo:font-size` wird nur in `headingStyleDefs()` fest pro Ebene erzeugt.
- `src/index.css` (`.ProseMirror`) — keine explizite `font-size`-Regel gesetzt; die
  Editor-Darstellung erbt aktuell die Tailwind-/Browser-Basisgröße (siehe 7.3, offene
  Klärungsfrage zur WYSIWYG-Konsistenz mit dem zu definierenden Standardwert).

**Explizit nicht Teil dieser Anforderung** (separate Backlog-Einträge):
- `schriftart-waehlen` (Schriftart wählen, Priorität 1, ebenfalls „fehlt") — eigener,
  separat zu spezifizierender Eintrag. Wo beide Funktionen dieselbe Toolbar-Gruppe
  teilen, wird das hier nur als UI-Anordnungshinweis erwähnt, nicht als Anforderung an
  die Schriftart-Auswahl selbst.
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
| 4 | Anzeige des aktuellen Werts | Teil von Element 1 | Zeigt die Schriftgröße an der aktuellen Cursor-Position bzw. der Selektion an (siehe Abschnitt 3.3 für Verhalten bei uneinheitlicher Selektion). Aktualisiert sich bei jeder Cursor-Bewegung, exakt wie das bestehende Absatzformat-Dropdown (`currentHeadingLevel()` in `Toolbar.tsx` als Vorbild für „Wert aus aktueller Selektion ableiten"). |
| 5 | Tastatur-Bedienbarkeit | Teil von Element 1 | Per Tab erreichbar, mit Pfeiltasten Auf/Ab innerhalb der geöffneten Dropdown-Liste navigierbar, mit Enter übernehmbar — analog zum bestehenden Absatzformat-`<select>`, jedoch mit zusätzlicher Freitexteingabe (natives `<input list="…">`/Datalist oder gleichwertiges eigenes Combobox-Markup). |

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
  Textfarbe/Hervorhebung. Sollte aus Zeitgründen zunächst dieselbe Einschränkung wie
  bei `textColor`/`highlight` übernommen werden, muss das explizit als bekannte
  Abweichung dokumentiert werden, statt stillschweigend zu fehlen.

### 2.3 Anzeige bei uneinheitlicher Selektion

- Umfasst die Selektion Text mit **mehreren unterschiedlichen** Schriftgrößen
  (inkl. impliziter Größen durch Überschriften-Ebenen, siehe 2.4), zeigt das Feld
  einen eindeutig erkennbaren „gemischt"-Zustand (leeres Feld mit Platzhalter oder
  vergleichbar zu Words leerem Schriftgrad-Feld bei gemischter Selektion) — **nicht**
  einfach die Größe an der `$from`-Position, da das fälschlich Einheitlichkeit
  suggerieren würde.
- Wird in diesem „gemischt"-Zustand ein neuer Wert bestätigt, überschreibt dieser
  **die gesamte Selektion** einheitlich mit der neuen Größe (siehe 2.1, Punkt 2).

### 2.4 Zusammenspiel mit Formatvorlagen (Überschriften)

- Überschriften (`Überschrift 1`–`6`) haben aktuell eine implizite,
  vorlagenbasierte Größe (siehe 7.2: DOCX `HEADING_FONT_SIZES`, ODT
  `HEADING_FONT_SIZES` in `styleRegistry.ts`), die **nicht** über einen
  Zeichen-Mark, sondern über das Absatzformat/die Formatvorlage gesetzt wird.
- Wird auf einen Textlauf **innerhalb** einer Überschrift zusätzlich eine explizite
  Schriftgröße über das neue Bedienelement gesetzt (direkte/„lokale" Formatierung),
  **überschreibt diese direkte Formatierung sichtbar die Vorlagen-Größe** für genau
  diesen Textlauf — Standard-Word/ODF-Verhalten „direkte Formatierung schlägt
  Formatvorlage". Der Rest der Überschrift ohne expliziten `fontSize`-Mark bleibt bei
  der Vorlagen-Größe.
- Wechsel der Formatvorlage (z. B. „Überschrift 1" → „Standard") ändert die
  implizite Größe, lässt aber einen zuvor explizit gesetzten `fontSize`-Mark auf
  einzelnen Textläufen unangetastet (die explizite Größe „gewinnt" weiterhin).

### 2.5 Werte, Einheit, Rundung

- Einheit ist ausschließlich **Punkt (pt)** — keine px-/cm-/mm-Eingabe im
  Schriftgrößenfeld (Konsistenz mit DOCX `w:sz` und ODT `fo:font-size`).
- Zulässiger Wertebereich: **1 bis 400 pt**, in Schritten von **0,5 pt**
  (Halbpunkt-Granularität), da DOCX `w:sz` intern in halben Punkten als Ganzzahl
  gespeichert wird (`w:sz w:val="24"` = 12 pt). Eine Eingabe wie „13,3" wird auf den
  nächstliegenden 0,5-pt-Schritt gerundet (hier: 13,5), sichtbar im Feld nach der
  Bestätigung — es gibt keine stille Abweichung zwischen angezeigtem und tatsächlich
  gespeichertem Wert.
- ODT (`fo:font-size="Xpt"`) unterstützt technisch beliebige Dezimalstellen; die App
  rundet dennoch einheitlich auf 0,5-pt-Schritte, damit ein Dokument nach
  Cross-Format-Rundreise (DOCX → ODT → DOCX) nicht durch Rundungsdifferenzen driftet
  (siehe Abschnitt 5).

---

## 3. Datenmodell- und Rundreise-Architektur (Anforderung an die Implementierung)

Diese Anforderung ist nicht rein UI-seitig, sondern erfordert einen neuen Mark im
gemeinsamen Editor-Schema, der von **beiden** Formaten gelesen und geschrieben
werden muss:

1. **Schema (`schema.ts`)**: Neuer Mark `fontSize` mit Attribut `pt` (Zahl, siehe
   Wertebereich 2.5). `toDOM`/`parseDOM` analog zu `textColor`
   (`style="font-size: ${pt}pt"`), damit die HTML-Zwischenrepräsentation (z. B. beim
   Einfügen aus der Zwischenablage, siehe Abschnitt 4.9) korrekt geparst wird.
2. **Commands (`commands.ts`)**: `setFontSize(pt: number): Command` und
   `clearFontSize(): Command`, jeweils **mit** Unterstützung für leere Selektion
   (siehe 2.2 — bewusster Unterschied zu `applyMarkColor`/`clearMarkColor`, die bei
   leerer Selektion `false` zurückgeben und damit nichts bewirken).
3. **DOCX-Reader (`reader.ts`, `marksFromRunProperties`)**: `w:sz` (Halbpunkte)
   aus `w:rPr` lesen, in `pt = wert / 2` umrechnen, als `fontSize`-Mark auf den Lauf
   anwenden. Fehlt `w:sz`, wird **kein** `fontSize`-Mark gesetzt (impliziter
   Standardwert der Zielanwendung gilt weiter, siehe 3.4).
4. **DOCX-Writer (`writer.ts`)**: Für jeden Textlauf mit `fontSize`-Mark
   `<w:sz w:val="${pt * 2}"/>` (und `w:szCs` für Konsistenz mit
   Complex-Script-Rendering) in `w:rPr` schreiben. Bestehende
   `HEADING_FONT_SIZES`-Logik in `styleDefs.ts` bleibt als Vorlagen-Default
   unverändert bestehen (siehe 2.4).
5. **ODT-Reader (`reader.ts`)**: `fo:font-size` aus den referenzierten
   `style:text-properties` lesen (Wert `"Xpt"` → Zahl `X`), als `fontSize`-Mark
   anwenden.
6. **ODT-Writer (`writer.ts`/`styleRegistry.ts`)**: `RunProps` um Feld `fontSize?:
   number` erweitern, `buildTextStyleXml` schreibt bei vorhandenem Wert
   `fo:font-size="${fontSize}pt"` in die `style:text-properties`. Bestehende
   `TextStyleRegistry`-Deduplizierung (Schlüssel per `JSON.stringify(props)`) muss
   `fontSize` automatisch mit einbeziehen, ohne dass bestehende
   Mark-Kombinationen (bold/italic/…) fälschlich denselben Stil-Namen erhalten wie
   eine Kombination mit zusätzlicher Größe.
7. **Editor-CSS (`index.css`)**: Da `fontSize` als Mark mit `toDOM`-Style
   `font-size: ${pt}pt` gerendert wird, ist keine zusätzliche globale CSS-Regel
   nötig — muss aber verifiziert werden (siehe 4. „WYSIWYG-Grenzfälle").

### 3.4 Standardgröße bei fehlendem `fontSize`-Mark (offene Klärungsfrage)

Aktuell setzt **keine** der beiden Formatschreiber-Implementierungen eine explizite
Standard-Schriftgröße für Fließtext (DOCX: `<w:docDefaults/>` bleibt leer; ODT: der
`Standard`-Absatzstil hat keine `style:text-properties`). Gleichzeitig setzt
`index.css` **keine** explizite `font-size` auf `.ProseMirror`, wodurch die
Editor-Darstellung aktuell von der Tailwind-/Browser-Basisgröße abhängt (effektiv
16 px ⇒ rechnerisch 12 pt bei 96 dpi) — ein Zufallswert, der **weder** dem
Word-Standard (11 pt, Calibri) **noch** zwingend dem LibreOffice-Standard (12 pt,
Liberation Serif) entsprechen muss und aktuell nirgends dokumentiert ist.

**Diese Frage gilt als offen und muss vor Abnahme geklärt werden** (analog zum
bereits in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 8 dokumentierten offenen Punkt zum
Seitenlayout-Leerraum):
- Entweder wird ein expliziter App-Standard (Vorschlag: 11 pt) sowohl im
  `.ProseMirror`-CSS **als auch** in `w:docDefaults`/`Standard`-Stil beider Formate
  konsistent verankert, damit WYSIWYG-Anzeige und Exportergebnis übereinstimmen —
  **oder** es wird bewusst dokumentiert, dass kein Mark ⇒ „Zielanwendungs-Standard,
  nicht durch uns festgelegt" gilt, mit dem Risiko einer optischen Abweichung
  zwischen In-App-Anzeige und geöffnetem Ergebnis in Word/LibreOffice.
- Bis zur Klärung gilt: Neu erstellter Text ohne jede Interaktion mit dem
  Schriftgrößenfeld darf **keinen** `fontSize`-Mark erhalten (kein stiller,
  unsichtbarer Default-Wert, der die Rundreise-Prüfung verfälschen würde).

---

## 4. Grenzfälle (Edge Cases)

Jeder Fall ist einzeln zu verifizieren, für **beide** Formate (DOCX und ODT), sofern
nicht anders vermerkt:

| # | Grenzfall | Erwartetes Verhalten |
|---|---|---|
| 4.1 | Eingabe eines nicht-numerischen Werts (z. B. „abc", leeres Feld bei Enter) | Eingabe wird verworfen, vorheriger gültiger Wert bleibt sicht- und wirksam, keine Exception, kein stiller NaN-Wert im Dokumentmodell. |
| 4.2 | Eingabe von 0 oder negativen Werten | Abgelehnt, Feld springt auf den zuletzt gültigen Wert zurück bzw. auf den erlaubten Minimalwert (1 pt), keine Anwendung von 0/negativ auf das Dokument. |
| 4.3 | Eingabe außerhalb des Bereichs (z. B. „5000") | Wird auf den erlaubten Maximalwert (400 pt) begrenzt (Clamping), sichtbar im Feld nach Bestätigung, kein Absturz, kein unbegrenztes `w:sz`, das DOCX/ODT ungültig machen könnte. |
| 4.4 | Dezimalwert außerhalb der 0,5-pt-Schrittweite (z. B. „13,37") | Rundung auf nächsten 0,5-pt-Schritt (hier 13,5), sichtbar korrigiert im Feld — keine unsichtbare interne Abweichung zwischen Anzeige und gespeichertem Wert. |
| 4.5 | Deutsches Dezimaltrennzeichen (Komma statt Punkt, z. B. „12,5") | Wird als 12,5 pt akzeptiert (deutsches Zahlenformat), nicht als Fehleingabe behandelt. |
| 4.6 | Selektion über mehrere Absätze/Listenelemente/Tabellenzellen mit unterschiedlichen Größen | Siehe 2.3 — Feld zeigt „gemischt", neue Auswahl setzt einheitliche Größe über die gesamte Selektion hinweg, inklusive über Zellgrenzen hinweg innerhalb derselben Tabelle. |
| 4.7 | Selektion, die eine Überschrift und normalen Text gemeinsam umfasst | Feld zeigt „gemischt" (da implizite Vorlagen-Größe der Überschrift von der Größe des Fließtexts abweicht), neue explizite Größe wird auf **beide** Anteile als direkte Formatierung angewendet (siehe 2.4). |
| 4.8 | Schriftgröße auf ein Bild oder eine leere Tabellenzelle ohne Text anwenden (keine anwendbare Inline-Selektion) | Keine Wirkung/keine Exception — der Mark kann nur auf Inline-Content (`text`) angewendet werden, ein `image`-Node besitzt kein `fontSize`-Attribut. |
| 4.9 | Einfügen von extern kopiertem Text mit expliziter `font-size` (z. B. aus einer Webseite/Word über die Zwischenablage) | Wird über den `parseDOM`-Pfad des `fontSize`-Marks erkannt und übernommen (nicht auf einen Zufallswert normalisiert), sofern der Wert im gültigen Bereich liegt; außerhalb des Bereichs wird geclamped (4.3). |
| 4.10 | Rückgängig/Wiederholen (Strg+Z/Strg+Y) nach Größenänderung | Einzelner Undo-Schritt macht genau eine Größenänderung rückgängig, auch wenn diese über die Toolbar statt über Tastatur ausgelöst wurde (siehe Undo-Anforderung in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2). |
| 4.11 | Größenänderung unmittelbar nach dem in Abschnitt 2 der Feature-Spec dokumentierten Selection-Sync-Bug-Szenario (Alles auswählen → Format anwenden → Klick zum Neupositionieren → Enter) | Muss denselben Regressionstest wie andere Zeichenformate bestehen — keine versehentliche Löschung/Ersetzung des Dokumentinhalts durch die neue Formatierungsaktion. |
| 4.12 | Reale Fremddatei mit Lauf-Schriftgrößen (`w:sz` bzw. `fo:font-size`), die außerhalb der eigenen Preset-Liste liegen (z. B. 13 pt) | Import zeigt exakt 13 pt im Feld an (keine Rundung auf den nächsten Preset-Wert), Dropdown-Liste ist nur Vorschlagsliste, kein Zwang zu Preset-Werten. |
| 4.13 | Schriftgröße innerhalb einer Kopf-/Fußzeile (sobald `kopfzeile-bearbeiten`/`fusszeile-bearbeiten` existieren) | Muss identisch zum Haupttext funktionieren, sobald diese Bereiche über die UI editierbar sind (aktuell blockiert durch fehlende Kopf-/Fußzeilen-UI, siehe `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 9 — kein Blocker für diese Anforderung, aber nachzutragen). |
| 4.14 | Zwei Schriftgrößen-Änderungen in schneller Folge (z. B. Preset-Klick, bevor die vorherige Eingabe committed wurde) | Kein Race Condition, letzter bestätigter Wert gewinnt deterministisch, keine widersprüchlichen Marks im selben Textlauf. |
| 4.15 | Sehr lange Selektion (gesamtes mehrseitiges Dokument, „Alles auswählen") + neue Größe | Anwendung bleibt performant (kein spürbares Einfrieren), UI bleibt reaktionsfähig, Undo funktioniert weiterhin als ein Schritt. |
| 4.16 | Cross-Format-Rundreise mit Halbpunkt-Werten (z. B. 10,5 pt) DOCX → ODT → DOCX | Wert bleibt exakt erhalten (kein Rundungsverlust durch die in 2.5 beschriebene einheitliche 0,5-pt-Rundung auf beiden Seiten). |

---

## 5. Rundreise-Anforderung (verbindlich für „vollständig verifiziert")

Wie bei jeder Zeichenformatierungsfunktion (siehe `FEATURE-SPEC-DOCX-ODT.md`
Abschnitt 3, Testfälle 4–5) gilt:

> Ein Textlauf mit gesetzter Schriftgröße wird nach Export **und** Re-Import
> (Datei A hochladen → unverändert exportieren → erneut importieren, **sowie**
> Editor-erzeugtes Dokument mit gesetzter Größe exportieren → importieren) mit
> **exakt derselben** Punktgröße am **exakt selben** Textteil wiederhergestellt.

### 5.1 Format-Matrix — jede Zelle ist ein Pflicht-Testfall

| Zyklus | Pflicht |
|---|---|
| Im Editor neuen Text mit expliziter Schriftgröße erzeugen → als DOCX exportieren → reimportieren | Ja — Größe exakt erhalten, an derselben Textstelle |
| Im Editor neuen Text mit expliziter Schriftgröße erzeugen → als ODT exportieren → reimportieren | Ja — Größe exakt erhalten, an derselben Textstelle |
| Reale DOCX-Datei mit mehreren unterschiedlichen Lauf-Schriftgrößen hochladen → unverändert exportieren → reimportieren | Ja — jede einzelne Größe bleibt an ihrer ursprünglichen Textstelle erhalten |
| Reale ODT-Datei mit mehreren unterschiedlichen Lauf-Schriftgrößen hochladen → unverändert exportieren → reimportieren | Ja — dito |
| Dokument mit Schriftgröße **und** weiteren Zeichenformaten (fett, Farbe) auf demselben Textlauf → Rundreise DOCX **und** ODT | Ja — Kombination bleibt vollständig erhalten (keine der Formatierungen verdrängt eine andere) |
| Dokument mit Schriftgröße auf einem Textlauf innerhalb einer Überschrift (direkte Formatierung übersteuert Vorlage, siehe 2.4) → Rundreise DOCX **und** ODT | Ja — Übersteuerung bleibt nach Reimport weiterhin als direkte Formatierung erkennbar, nicht auf die Vorlagen-Größe zurückgefallen |
| Cross-Format: DOCX mit Schriftgröße importieren → als ODT exportieren → reimportieren (sobald `speichern-unter-format` verfügbar ist) | Nachrichtlich, sobald Cross-Format-Export existiert — bis dahin nicht blockierend für den Basis-Scope dieser Datei |

### 5.2 Mindestabdeckung der Testdatei(en)

Analog zu `speichern-exportieren-req.md` Abschnitt 5.2 muss mindestens eine
Testdatei je Format zusätzlich zur dortigen Mindestabdeckung folgende
größenspezifischen Fälle abdecken:
- Mindestens drei unterschiedliche, nicht dem App-Standard entsprechende
  Schriftgrößen im selben Dokument (z. B. 9 pt, 14 pt, 24 pt).
- Mindestens ein Halbpunkt-Wert (z. B. 10,5 pt).
- Mindestens ein Wert außerhalb der Preset-Dropdown-Liste (z. B. 13 pt), um
  Grenzfall 4.12 abzudecken.
- Mindestens eine Überschrift mit einem Textlauf, der eine von der Vorlagen-Größe
  abweichende, explizite Größe trägt (Grenzfall 2.4/4.7).

---

## 6. Nicht-Ziele / bewusste Abgrenzung

Zur Vermeidung von Scope-Creep bei der Verifikation dieses konkreten
Backlog-Eintrags gelten folgende, separat geführte Punkte **ausdrücklich nicht**
als Teil von „Schriftgröße wählen":

- `schriftart-waehlen` — Auswahl der Schriftfamilie. Eigener Eintrag, eigenes
  Anforderungsdokument.
- `schrift-vergroessern` / `schrift-verkleinern` — schrittweise Inkrement-Buttons.
  Eigene Einträge; sollen den hier eingeführten `fontSize`-Mark wiederverwenden,
  sind aber nicht Gegenstand der hier geforderten Verifikation.
- `formatvorlage-erstellen`/`zeichenformatvorlage` — benutzerdefinierte
  Formatvorlagen mit eigener Standardgröße. Eigene, als „fehlt" (Priorität 4)
  geführte Einträge.
- Kopf-/Fußzeilen-Editier-UI selbst (`kopfzeile-bearbeiten`/`fusszeile-bearbeiten`)
  — wird vorausgesetzt, sobald verfügbar (siehe Grenzfall 4.13), aber nicht hier neu
  spezifiziert.
- Die generelle Klärung des App-weiten Standard-Schriftgrads (Abschnitt 3.4) ist
  eng verwandt, aber als **offene, vor Abnahme zu klärende Frage** markiert statt
  als fest vorgegebene Anforderung dieses Dokuments — die Verifikation darf nicht
  daran scheitern, dass diese Grundsatzfrage noch nicht beantwortet ist, muss aber
  auf sie hinweisen, falls sie unbeantwortet bleibt.

---

## 7. Ist-Zustand laut Code-Analyse (Verifikationsbefund zum Backlog-Status)

Zur Einordnung, warum der Backlog-Status „fehlt" bei dieser Verifikation als
**zutreffend bestätigt** gilt (im Gegensatz zu anderen Einträgen im Backlog, bei
denen „fehlt" sich nachträglich als „teilweise vorhanden" herausstellte):

### 7.1 UI

`Toolbar.tsx` enthält Bedienelemente für Absatzformat, Fett/Kursiv/Unterstrichen/
Durchgestrichen, Textfarbe/Hervorhebung (inkl. „Entfernen"), Ausrichtung, Listen,
Tabelle-Einfügen und Bild-Einfügen — **kein** Element für Schriftgröße oder
Schriftart ist vorhanden, auch nicht in eingeschränkter/fester Form.

### 7.2 Datenmodell

`schema.ts` definiert die Marks `strong`, `em`, `underline`, `strike`,
`textColor`, `highlight` — kein `fontSize`-Mark. Die einzige im Repository
vorhandene Verbindung von Text zu einer Punktgröße ist **vollständig an die
Überschriften-Formatvorlage gekoppelt und nicht durch die Nutzer:in einstellbar**:
- DOCX: `styleDefs.ts`, `HEADING_FONT_SIZES = { 1: 48, 2: 40, 3: 36, 4: 32, 5: 28,
  6: 26 }` (Halbpunkte, d. h. 24/20/18/16/14/13 pt), fest in
  `<w:rPr><w:sz w:val="…"/></w:rPr>` der jeweiligen `heading N`-Formatvorlage.
- ODT: `styleRegistry.ts`, `HEADING_FONT_SIZES = { 1: 24, 2: 20, 3: 18, 4: 16,
  5: 14, 6: 13 }` (Punkt), fest in `fo:font-size="…pt"` der jeweiligen
  `HeadingN-<align>`-Formatvorlagen.

### 7.3 Reader/Writer

Weder `docx/reader.ts` noch `odt/reader.ts` liest `w:sz` bzw. `fo:font-size` auf
Lauf-Ebene (außerhalb der Formatvorlagen-Definition) aus — eine importierte
Fremddatei mit expliziter Lauf-Schriftgröße verliert diese Information beim Import
stillschweigend (Text bleibt erhalten, Größe nicht; ein zu ergänzender Grenzfall,
siehe 4.12). Weder `docx/writer.ts` noch `odt/writer.ts`/`styleRegistry.ts` kann
aktuell eine frei gewählte Lauf-Schriftgröße schreiben — `RunProps` (ODT) kennt das
Feld nicht, der DOCX-Writer hat keinen äquivalenten Mechanismus.

**Fazit**: Der Backlog-Status „fehlt" für `schriftgroesse-waehlen` ist nach dieser
Code-Analyse korrekt. Die Verifikationsarbeit für diesen Eintrag besteht folglich
nicht aus dem Prüfen einer bestehenden, aber unbewiesenen Funktion (wie bei
„vorhanden"-Einträgen), sondern aus dem vollständigen **Neubau** gegen die
Anforderungen in Abschnitt 1–6 sowie der anschließenden Verifikation genau dieser
neuen Implementierung.

---

## 8. Testfälle (Zusammenfassung, konkret abhakbar)

1. Schriftgrößen-Feld ist in der Toolbar sichtbar und über Tab erreichbar.
2. Preset-Wert aus der Dropdown-Liste auf eine Selektion anwenden → sichtbar korrekt
   gerendert (`font-size` im DOM), Fokus kehrt in den Editor zurück.
3. Freitext-Zahl eintippen und mit Enter bestätigen → wird auf die Selektion
   angewendet, Rundung auf 0,5-pt-Schritte greift bei Bedarf (4.4).
4. Größe ohne Selektion (an der Schreibmarke) setzen → wirkt sich nur auf als
   Nächstes getippten Text aus, nicht auf umgebenden Text (2.2).
5. Selektion mit mehreren unterschiedlichen Größen → Feld zeigt „gemischt", neue
   Größe vereinheitlicht die gesamte Selektion (2.3, 4.6).
6. Größe auf Textlauf innerhalb einer Überschrift → übersteuert sichtbar die
   Vorlagen-Größe, Rest der Überschrift bleibt unverändert (2.4, 4.7).
7. Ungültige Eingaben (Buchstaben, 0, negativ, >400) werden abgelehnt/geclamped,
   kein Absturz, kein NaN im Dokumentmodell (4.1–4.3).
8. Deutsches Komma als Dezimaltrennzeichen wird akzeptiert (4.5).
9. Undo/Redo macht eine Größenänderung als einzelnen Schritt rückgängig/wiederholt
   sie (4.10), auch nach dem Selection-Sync-Bug-Szenario aus Abschnitt 2 der
   Feature-Spec (4.11).
10. Rundreise DOCX: Editor-erzeugter Text mit expliziter Größe → Export → Reimport →
    Größe exakt erhalten.
11. Rundreise ODT: dito.
12. Reale Fremddatei mit mehreren Lauf-Schriftgrößen (inkl. Nicht-Preset-Wert wie
    13 pt) importieren → unverändert exportieren → reimportieren → jede Größe an
    ihrer ursprünglichen Textstelle exakt erhalten (4.12, 5.1, 5.2).
13. Kombination Schriftgröße + Fett + Schriftfarbe auf demselben Textlauf →
    Rundreise DOCX und ODT erhält alle drei Formate gemeinsam.
14. Cross-Format-Rundreise mit Halbpunkt-Wert (10,5 pt) → kein Rundungsverlust
    (4.16), sobald Cross-Format-Export verfügbar ist.
15. Einfügen von extern kopiertem Text mit `font-size`-Style → wird übernommen,
    nicht auf einen Zufallswert normalisiert (4.9).
16. WYSIWYG-Check: In-App-Darstellung einer gesetzten Größe entspricht optisch
    (nach Umrechnung px↔pt bei 96 dpi) exakt dem im Export erzeugten Wert — deckt
    die in Abschnitt 3.4 beschriebene offene Klärungsfrage aus messtechnischer Sicht
    ab.

---

## 9. Abnahmekriterium für „vollständig verifiziert"

Der Backlog-Status für `schriftgroesse-waehlen` darf erst dann von „fehlt" auf
„vorhanden (verifiziert)" geändert werden, wenn:

1. Das Bedienelement aus Abschnitt 1 gebaut und über echte Browser-Interaktion
   (Playwright, nicht nur Command-Aufruf isoliert) bedienbar ist.
2. Jeder Testfall aus Abschnitt 8 sowie jeder Grenzfall aus Abschnitt 4 einzeln mit
   einem dauerhaft in der Suite verbleibenden, echten E2E-Test nachgewiesen ist.
3. Die vollständige Rundreise-Matrix aus Abschnitt 5.1 für DOCX **und** ODT mit der
   in 5.2 geforderten Mindestabdeckung grün ist.
4. Die offene Klärungsfrage aus Abschnitt 3.4 (App-Standardgröße) beantwortet und
   das Ergebnis hier nachgetragen ist — entweder als konsistent verankerter
   Standardwert oder als bewusst dokumentierte Nicht-Festlegung.
5. Kein aus dieser Datei hervorgegangener Fehlerbefund unbeantwortet bleibt (jeder
   Fund entweder behoben und regressionsgetestet, oder bewusst als bekannte
   Einschränkung dokumentiert), analog zur „Kein stiller Fehlschlag"-Anforderung in
   `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.4.
