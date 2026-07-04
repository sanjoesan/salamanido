# Anforderungsspezifikation: „Schriftart wählen" (`schriftart-waehlen`)

Status: Laut Backlog (`specs/FEATURE-BACKLOG.md`, Zeile `schriftart-waehlen`, Bereich
„2.2 Zeichenformatierung", Priorität **1 – essenziell**) als **„fehlt"** geführt. Gemäß
Aufgabenstellung gilt auch dieser Status als **nicht vertrauenswürdig** und muss
vollständig verifiziert werden, bevor er im Backlog bestätigt werden darf — und zwar in
beide Richtungen: Es muss geprüft werden, dass wirklich **nichts** vorhanden ist (kein
UI-Fragment, kein Datenmodell-Attribut, das „fehlt" fälschlich zu „teilweise" machen
würde), **und** es muss anschließend gegen genau diese Spezifikation gebaut und
abgenommen werden.

**Code-Audit zum Zeitpunkt dieser Anforderungsdefinition (Befund):** Der Status „fehlt"
ist zutreffend — es existiert **keinerlei** Spur der Funktion:
- `src/formats/shared/schema.ts` — die Marks `strong`, `em`, `underline`, `strike`,
  `textColor`, `highlight` sind definiert; eine Mark für Schriftfamilie fehlt komplett.
- `src/formats/shared/editor/Toolbar.tsx` — kein Dropdown/Combobox-Element für
  Schriftart vorhanden.
- `src/formats/shared/editor/commands.ts` — keine Funktion zum Setzen/Entfernen einer
  Schriftart-Mark.
- `src/formats/docx/reader.ts`, Funktion `marksFromRunProperties()` — wertet `w:b`,
  `w:i`, `w:u`, `w:strike`, `w:color`, `w:shd` aus, aber **kein** `w:rFonts`.
- `src/formats/docx/writer.ts`, Funktion `runPropertiesXml()` — erzeugt entsprechend
  keine `<w:rFonts .../>`-Ausgabe.
- `src/formats/odt/reader.ts`, Funktion `parseAutomaticStyles()`/Interface `RunStyle` —
  wertet `fo:font-weight`, `fo:font-style`, `style:text-underline-style`,
  `style:text-line-through-style`, `fo:color`, `fo:background-color` aus, aber **kein**
  `style:font-name` und keine `office:font-face-decls`.
- `src/formats/odt/styleRegistry.ts`, Interface `RunProps`/`buildTextStyleXml()` —
  entsprechend ohne Feld für Schriftart.

Diese Datei ist deshalb keine reine Verifikationsspezifikation für eine bestehende,
möglicherweise unvollständige Funktion (wie bei `datei-oeffnen-req.md` oder
`speichern-exportieren-req.md`), sondern der **verbindliche Bau- und Abnahme-Maßstab**
für eine komplett neu zu erstellende Funktion — Umsetzung und anschließende
Vollverifikation (echte Browser-Bedienung, keine isolierten Unit-Tests) sind beide
Gegenstand des Abschnitts 7.

Bezug: `E:\docs\specs\FEATURE-BACKLOG.md` (Slug `schriftart-waehlen`),
`E:\docs\FEATURE-SPEC-DOCX-ODT.md` Abschnitt 3 (Zeichenformatierung, Zeile „Schriftart:
Auswahl aus Liste, wird in DOCX/ODT korrekt referenziert") und Abschnitt 17, Zeile 18
(„Schriftart-/Schriftgrößen-Auswahl | fehlt"). An Stil und Detailtiefe von
`FEATURE-SPEC-DOCX-ODT.md` sowie den bereits vorliegenden Anforderungsdateien
`datei-oeffnen-req.md` und `speichern-exportieren-req.md` orientiert sich dieses
Dokument.

**Explizit nicht Teil dieser Anforderung** (separate Backlog-Einträge bzw. bewusste
Abgrenzung, siehe Abschnitt 5):
- `schriftgroesse-waehlen` (Schriftgröße) — eigener Slug, eigene Anforderungsdatei bei
  Bedarf.
- `schrift-vergroessern` / `schrift-verkleinern`, `gross-kleinschreibung`,
  `zeichenabstand`, `texteffekte`, `formatierung-loeschen`, `formatvorlagen-satz`
  (Design-Schriftart-Paare wie in Word-Themes) — alle eigene, aktuell „fehlt"-geführte
  Slugs.
- Echtes Einbetten von Schriftart-**Binärdaten** (Glyphen) in die exportierte Datei
  (`w:embedTrueTypeFonts`/`word/fontTable.xml` in DOCX, entsprechende
  ODF-Erweiterungen) — siehe Abschnitt 5.2.

---

## 1. Betroffene Menüpunkte/Bedienelemente (Soll-Zustand, neu zu bauen)

Da aktuell nichts existiert, beschreibt diese Tabelle den zu bauenden Soll-Zustand samt
vorgeschlagenem Ort im Code, nicht einen Ist-Zustand.

| # | Element | Vorgeschlagener Ort | Soll-Verhalten |
|---|---|---|---|
| 1 | Schriftart-Combobox in der Toolbar | `Toolbar.tsx`, direkt nach dem Absatzformat-Dropdown und vor den Fett/Kursiv/Unterstrichen/Durchgestrichen-Buttons (analog zur Position in Word/LibreOffice) | Editierbares Eingabefeld **mit** Dropdown-Liste (Combobox, nicht reines `<select>`), zeigt den Namen der an der Schreibmarke bzw. auf der Selektion aktiven Schriftart; Freitexteingabe erlaubt zusätzlich das manuelle Eintippen eines Schriftartnamens, der nicht in der kuratierten Liste steht (siehe 1.2 und 1.6). |
| 2 | Kuratierte Schriftarten-Liste | neu: `src/formats/shared/editor/fonts.ts` (o. ä.) | Statische, cross-platform sinnvolle Grundliste (mindestens: Arial, Times New Roman, Calibri, Georgia, Verdana, Tahoma, Courier New, Comic Sans MS sowie deren verbreitete Linux/Libre-Office-Gegenstücke Liberation Sans/Serif/Mono), da eine echte Auflistung „installierter" Schriftarten des Betriebssystems im Browser nicht zuverlässig/portabel möglich ist (siehe 1.3). |
| 3 | Optionale Erweiterung: echte System-Schriftarten | `fonts.ts`, progressive Erweiterung | Falls `window.queryLocalFonts()` (Local Font Access API) im aktuellen Browser verfügbar **und** vom Benutzer per Berechtigungsdialog erlaubt ist, wird die kuratierte Liste um die real installierten Schriftarten ergänzt. Ohne diese API (Firefox, Safari, oder Berechtigung verweigert) bleibt ausschließlich die kuratierte Liste aktiv — das ist **kein** Fehler, sondern dokumentiertes Fallback-Verhalten (siehe 3.14). |
| 4 | Abschnitt „Im Dokument verwendet" in der Dropdown-Liste | Combobox-Liste, eigene Gruppe oberhalb/unterhalb der kuratierten Liste | Enthält jede Schriftart, die im aktuell geöffneten Dokument tatsächlich per Mark referenziert wird — insbesondere Schriftarten aus importierten Fremddateien, die **nicht** in der kuratierten Liste stehen (z. B. eine firmenspezifische Schriftart aus einer echten Word-Datei). Diese Einträge dürfen nicht kommentarlos verschwinden (siehe 3.5). |
| 5 | Live-Vorschau je Listeneintrag | Combobox-Liste | Jeder Eintrag wird, soweit die Schriftart im Browser verfügbar ist, in der eigenen Schriftart gerendert (`style="font-family: ...`"); ist die Schriftart nicht verfügbar, greift der Browser automatisch auf eine Fallback-Schrift zurück — kein Absturz, kein leerer Eintrag. |
| 6 | Such-/Filterfunktion | Combobox-Eingabefeld | Tippen im Eingabefeld filtert die Liste per Teilstring-Suche (case-insensitive), live bei jedem Tastendruck. Kein Treffer → sichtbarer Hinweis „Keine Schriftart gefunden" statt leerer, wirkungsloser Liste. |
| 7 | Tastaturbedienung | Combobox | Per Tab erreichbar; Pfeil-hoch/-runter navigiert die gefilterte Liste; Enter übernimmt den markierten/eingetippten Eintrag; Escape schließt die Liste ohne Änderung und stellt den vorherigen Anzeigewert wieder her. |
| 8 | „Gemischt"-Anzeige bei Mehrfachauswahl | Combobox-Anzeigewert | Steht die Selektion über mehrere Textläufe mit unterschiedlichen Schriftarten (oder Schriftart + schriftartlosem Text), zeigt das Eingabefeld einen leeren/neutralen Platzhalter statt fälschlich einer der beteiligten Schriftarten (analog zu Word). |
| 9 | Neue Commands-Funktion(en) | `src/formats/shared/editor/commands.ts` | `applyFontFamily(family: string)` (setzt/ersetzt die Mark auf Selektion bzw. als „stored mark" an der Schreibmarke) und `clearFontFamily()` (entfernt die Mark, fällt auf Basisformat zurück), analog zu den bestehenden `applyMarkColor()`/`clearMarkColor()`-Funktionen für `textColor`/`highlight`. |
| 10 | Neue Schema-Mark `fontFamily` | `src/formats/shared/schema.ts` | Mark mit Attribut `{ family: string }`, `toDOM`/`parseDOM` analog zu `textColor` (`style="font-family: ..."`), damit die Editor-Darstellung selbst die gewählte Schriftart sofort sichtbar rendert (siehe 2.8 — reine Datenmodell-Änderung ohne sichtbaren Effekt gilt als Defekt). |
| 11 | DOCX-Lese-/Schreibunterstützung | `docx/reader.ts` (`marksFromRunProperties`), `docx/writer.ts` (`runPropertiesXml`) | Lesen: `<w:rFonts w:ascii="..." .../>` innerhalb `w:rPr` → `fontFamily`-Mark. Schreiben: Mark → `<w:rFonts w:ascii="X" w:hAnsi="X" w:cs="X" w:eastAsia="X"/>` (alle vier Attribute konsistent auf denselben Namen, siehe 2.9). |
| 12 | ODT-Lese-/Schreibunterstützung | `odt/reader.ts` (`parseAutomaticStyles`/`RunStyle`), `odt/styleRegistry.ts` (`RunProps`/`buildTextStyleXml`), `odt/writer.ts` (`runPropsFromMarks`) | Lesen: `style:text-properties/@style:font-name` → Nachschlagen des zugehörigen `style:font-face`-Eintrags in `office:font-face-decls` (Attribut `svg:font-family`) → `fontFamily`-Mark. Fehlt der `font-face-decl`-Eintrag (kaputte/vereinfachte Fremddatei), wird ersatzweise der rohe `style:font-name`-Wert direkt übernommen (siehe 3.13). Schreiben: Mark → neuer `style:font-name`-Verweis in `style:text-properties` **plus** passender Eintrag in `office:font-face-decls` (`content.xml` und/oder `styles.xml`, je nachdem wo der Textlauf steht — analog zur bestehenden Trennung `bodyStyles`/`chromeStyles` in `writeOdt()`). |
| 13 | „Formatierung löschen"-Interaktion (Abgrenzung) | separater Slug `formatierung-loeschen` | Diese Datei fordert nur, dass `clearFontFamily()` isoliert funktioniert; die Verzahnung mit einem globalen „Formatierung löschen"-Button ist nicht Gegenstand dieser Datei, muss aber, sobald jener Button existiert, auch die Schriftart zurücksetzen. |

Es gibt **keinen** zusätzlichen Menüpunkt außerhalb der Toolbar (kein Kontextmenü-Eintrag,
kein Tastaturkürzel) für diese Funktion — sollte ein solcher künftig gefordert werden, ist
das ein separater Zusatz zu dieser Spezifikation.

---

## 2. Gewünschtes Verhalten im Detail

### 2.1 Anwenden auf eine bestehende Selektion
- Text markieren → Schriftart in der Combobox wählen oder eintippen + Enter/Klick auf
  Listeneintrag → die `fontFamily`-Mark wird **exakt** auf den markierten Bereich
  angewendet, bestehende Textläufe werden an den Selektionsgrenzen aufgeteilt (wie bei
  `toggleMark`/`applyMarkColor` für die bestehenden Marks).
- Text außerhalb der Selektion bleibt unverändert (weder Schriftart noch sonstige
  Formatierung).

### 2.2 Anwenden ohne Selektion (an der Schreibmarke)
- Ohne Selektion (Cursor blinkt) wirkt die Schriftartwahl als „stored mark" auf den
  **als Nächstes getippten** Text, analog zu Fett/Kursiv an der Schreibmarke — bereits
  vorhandener Text vor/nach der Schreibmarke bleibt unverändert.
- Nach Verlassen des aktuellen Textlaufs (z. B. Pfeiltaste, Klick an andere Stelle) muss
  die „stored mark" verworfen bzw. durch die dort tatsächlich vorhandene Formatierung
  ersetzt werden (ProseMirror-Standardverhalten für Marks), nicht dauerhaft „kleben
  bleiben".
- Verhalten nach **Enter** (neuer Absatz) direkt nach dem Setzen einer Schriftart an der
  Schreibmarke muss eindeutig definiert und getestet sein (Übernahme in den neuen Absatz
  oder Rückfall auf Absatz-Basisformat — beides ist zulässig, **muss aber dokumentiert
  und konsistent mit dem Verhalten von Fett/Kursiv an derselben Stelle sein**, kein
  Sonderfall nur für Schriftart).

### 2.3 Anzeige der aktiven Schriftart
- Steht die Schreibmarke in bereits formatiertem Text (z. B. nach Import einer
  Fremddatei), zeigt die Combobox beim Fokussieren/bei jeder Cursor-Bewegung die
  tatsächlich aktive Schriftart an (nicht den zuletzt manuell gewählten Wert einer
  anderen Stelle).
- Text ohne explizite `fontFamily`-Mark zeigt den definierten Basis-/Standardwert (siehe
  2.4), niemals einen leeren, verwirrenden Zustand, der wie ein Fehler aussieht.
- Selektion über mehrere unterschiedliche Schriftarten → „Gemischt"-Anzeige (siehe
  Abschnitt 1, Zeile 8), keine geratene Einzelschriftart.

### 2.4 Basis-/Standardschriftart
- Für Text **ohne** explizite `fontFamily`-Mark muss ein dokumentierter Standardwert
  gelten (Vorschlag: kein hartes `w:rFonts`/`style:font-name` beim Export erzwingen,
  solange die Nutzer:in nichts gewählt hat — der Text bleibt dann ohne Mark, Darstellung
  über die jeweilige Zielanwendungs-Grundschriftart). Diese Entscheidung muss getroffen
  und hier nachgetragen werden, **bevor** die Rundreise-Tests (Abschnitt 6) geschrieben
  werden, damit ein unveränderter Import (ohne Schriftart-Interaktion der Nutzer:in)
  nicht plötzlich fälschlich `dirty: true` wird oder beim Export eine erfundene
  Standardschriftart einfügt, die im Original nicht vorhanden war (Rundreise-Risiko,
  vgl. `speichern-exportieren-req.md` Abschnitt 2.4/„Dirty durch Normalisierung").

### 2.5 Kombination mit anderen Zeichenformaten
- Schriftart + Fett + Kursiv + Schriftfarbe + Hervorhebung gleichzeitig auf demselben
  Textlauf müssen unabhängig voneinander gesetzt/entfernt werden können (Mark-Kombination
  wie bei den bestehenden Marks), keine gegenseitige Verdrängung.
- Reihenfolge der Anwendung (z. B. erst Fett, dann Schriftart, oder umgekehrt) darf das
  Ergebnis nicht beeinflussen.

### 2.6 Live-Rendering im Editor
- Die Änderung muss **sofort sichtbar** im ProseMirror-Editor selbst gerendert werden
  (`toDOM` der neuen Mark setzt tatsächlich `font-family` im Browser-Rendering) — eine
  Implementierung, die nur das Datenmodell ändert, aber keinen sichtbaren Effekt im
  Editor hat, gilt als Defekt (vgl. bereits bekanntes Muster in diesem Projekt: Backlog
  unterscheidet ausdrücklich zwischen „nur Datenmodell" und „echte UI-Funktion").
- Ist die gewählte Schriftart im Browser/Betriebssystem der Bearbeiterin nicht
  installiert, muss die CSS-`font-family`-Deklaration eine sinnvolle generische
  Fallback-Familie enthalten (`serif`/`sans-serif`/`monospace`, passend zur gewählten
  Schriftart), damit der Text lesbar bleibt statt unsichtbar/verzerrt zu wirken.

### 2.7 Font-Name-Normalisierung
- Der beim Export geschriebene Name muss **exakt** dem von der Nutzer:in gewählten bzw.
  aus der Fremddatei gelesenen Namen entsprechen (keine Groß-/Kleinschreibungsänderung,
  keine Kürzung, keine Ersetzung durch einen „ähnlichen" Namen).
- Enthält der Name Leerzeichen oder Sonderzeichen (z. B. „Times New Roman“, „Segoe UI
  Symbol“, ein Firmenname mit Umlaut), muss dieser sowohl im internen CSS
  (`font-family: "Times New Roman"`, korrekt gequotet) als auch in der exportierten
  XML-Struktur (Attributwert korrekt escaped) unverändert erhalten bleiben.

### 2.8 DOCX-spezifische Konsistenz (`w:rFonts`)
- Alle vier möglichen Attribute (`w:ascii`, `w:hAnsi`, `w:cs`, `w:eastAsia`) werden beim
  Export konsistent auf denselben gewählten Namen gesetzt, um divergierendes Rendering
  zwischen lateinischem und anderem Schriftsystem in der Zielanwendung zu vermeiden. Beim
  Import genügt das Lesen von `w:ascii` (ggf. Fallback auf `w:hAnsi`, falls `w:ascii`
  fehlt) als kanonischer Wert für die interne Mark.

### 2.9 ODT-spezifische Konsistenz (`style:font-name` + `office:font-face-decls`)
- Jede neu referenzierte Schriftart muss **zwingend** sowohl als `style:font-name`-Attribut
  am Textstil **als auch** als eigener `style:font-face`-Eintrag in
  `office:font-face-decls` auftauchen (ODF verlangt diese Doppelverankerung für korrekte
  Interpretation durch LibreOffice/Word). Ein Export, der nur eines von beiden schreibt,
  gilt als Defekt.
- Analog zu den bestehenden Registries (`TextStyleRegistry`) ist eine Deduplizierung
  vorzunehmen — dieselbe Schriftart darf nicht mehrfach als eigener `font-face`-Eintrag
  auftauchen, wenn sie an mehreren Textstilen verwendet wird.

---

## 3. Grenzfälle (Edge Cases)

Jeder Fall ist einzeln zu verifizieren, für **beide** Formate (DOCX und ODT), sofern
nicht anders vermerkt:

| # | Grenzfall | Erwartetes Verhalten |
|---|---|---|
| 3.1 | Selektion über mehrere Textläufe mit unterschiedlichen Schriftarten | Combobox zeigt „gemischt"/leer; Anwenden einer neuen Schriftart vereinheitlicht die gesamte Selektion auf diese eine Schriftart. |
| 3.2 | Schriftartname mit Leerzeichen (z. B. „Times New Roman“) | Bleibt bei Rundreise exakt erhalten, korrekt gequotet in CSS und XML-Attributwert. |
| 3.3 | Schriftartname mit Sonderzeichen/Umlauten (z. B. eine firmeneigene Schriftart „Müller Sans“) | Bleibt exakt erhalten, keine Transliteration/Normalisierung. |
| 3.4 | Sehr lange kuratierte/erweiterte Schriftartenliste (z. B. via Local Font Access API mit hunderten Systemschriften) | UI bleibt performant bedienbar (kein spürbares Einfrieren beim Öffnen der Liste oder beim Tippen im Suchfeld). |
| 3.5 | Schriftart aus importierter Fremddatei, die nicht in der kuratierten Liste steht (z. B. eine Corporate-Schriftart) | Erscheint als eigener Eintrag unter „Im Dokument verwendet" (siehe 1.4); wird beim unveränderten Re-Export **nicht** stillschweigend durch eine Listen-Schriftart ersetzt. |
| 3.6 | Schriftart auf Text in einer Tabellenzelle, einem Listenpunkt, einer Überschrift oder in Kopf-/Fußzeile anwenden | Funktioniert identisch zu normalem Fließtext, keine strukturellen Sonderfälle. |
| 3.7 | Undo/Redo einer Schriftartänderung | Strg+Z macht die Änderung vollständig rückgängig (auch nach mehreren nachfolgenden Tippschritten in der History), Strg+Y/Strg+Umschalt+Z stellt sie wieder her. |
| 3.8 | Schriftart an der Schreibmarke in einem komplett leeren Dokument setzen, dann erstes Zeichen tippen | Erstes und alle folgenden Zeichen erhalten die gewählte Schriftart. |
| 3.9 | Dieselbe Schriftart erneut auf bereits so formatierten Text anwenden (No-Op) | Keine Fehlermeldung, keine doppelten/verschachtelten Marks, Ergebnis bleibt identisch. |
| 3.10 | Freitext-Eingabe eines Schriftartnamens, der weder in der kuratierten Liste noch als Systemschriftart existiert (Tippfehler oder bewusst exotischer Name) | Wird trotzdem übernommen (Word/LibreOffice erlauben das ebenfalls) — Editor-Rendering fällt auf CSS-Fallback zurück (siehe 2.6), Export schreibt den Namen trotzdem unverändert (keine stille Ablehnung). |
| 3.11 | Kein Treffer bei der Such-/Filtereingabe in der Combobox | Sichtbarer Hinweis „Keine Schriftart gefunden“ statt leerer, wirkungslos wirkender Liste; Freitext-Übernahme (3.10) bleibt trotzdem möglich. |
| 3.12 | Local Font Access API nicht unterstützt (Firefox, Safari) oder Berechtigung durch Nutzer:in verweigert | Kuratierte Liste bleibt vollständig funktionsfähig, kein Fehler in der Konsole, kein blockierender Dialog-Loop, kein Hinweis, der wie ein Absturz wirkt. |
| 3.13 | ODT-Fremddatei mit `style:font-name` am Textstil, aber **ohne** passenden Eintrag in `office:font-face-decls` (unvollständige/kaputte Datei) | Kein Absturz; Fallback auf den rohen `style:font-name`-Wert als Anzeigename, Text bleibt lesbar zugeordnet (kein stiller Verlust der Information, dass diese Stelle eine bestimmte Schriftart haben sollte). |
| 3.14 | DOCX-Fremddatei mit `w:rFonts`, das nur `w:eastAsia` (ostasiatisches Schriftsystem) trägt, aber kein `w:ascii` | Definiertes Fallback-Verhalten (z. B. Basis-/Standardschriftart für den lateinischen Textanteil), kein Absturz, kein leeres Attribut. |
| 3.15 | Reines Umschalten zwischen zwei Schriftarten mehrfach hintereinander in schneller Folge (Stresstest für Selection-Sync, vgl. bekannten Bug aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2) | Kein Verlust/keine Vermischung des Dokumentinhalts, Editor bleibt normal bedienbar (Regressionsfall analog zum dort beschriebenen Selection-Sync-Bug — Tabellen und Schnellwechsel von Zeichenformaten waren dort als Hauptverdachtsfälle benannt). |
| 3.16 | Schriftartwahl direkt gefolgt von Bild-Einfügen oder Tabellen-Einfügen an derselben Cursor-Position | Kein Crash, „stored mark“ verhält sich konsistent zu den bestehenden Marks in derselben Situation. |
| 3.17 | Export einer Schriftart-Mark auf einem Textlauf, der gleichzeitig eine Track-Changes-Markierung trägt (sobald Abschnitt 13 aus `FEATURE-SPEC-DOCX-ODT.md` umgesetzt ist) | Nachrichtlich/zukünftig: keine gegenseitige Zerstörung der Marks — aktuell nicht blockierend, da Track Changes selbst noch nicht existiert. |
| 3.18 | Zwei Nutzer:innen-Aktionen quasi gleichzeitig: Schriftart per Dropdown wählen, während parallel noch eine vorherige Selektion per Maus verändert wird (Doppelklick + sofortiger Dropdown-Klick) | Deterministisches, nachvollziehbares Ergebnis — keine Race Condition, die zu unklarer/vermischter Formatierung führt. |

---

## 4. Grenzfälle der Bedienelemente selbst (UI-Robustheit)

1. Klick in die Combobox, während bereits eine andere Toolbar-Dropdown (z. B.
   Absatzformat) geöffnet ist → nur eine Dropdown-Liste gleichzeitig offen, keine
   überlappende/verdeckte Darstellung.
2. Combobox ist per Tab erreichbar und vollständig per Tastatur bedienbar (siehe 1.7),
   kein reiner Maus-only-Weg (Accessibility-Grundanforderung, analog zu Abschnitt 5 in
   `datei-oeffnen-req.md`).
3. Öffnen der Dropdown-Liste darf den Editor-Fokus/die aktuelle Selektion **nicht**
   zerstören, bevor die Auswahl bestätigt ist (Klick in die Liste selbst ist eine
   bekannte Quelle für Selection-Sync-Probleme in diesem Projekt, siehe 3.15).
4. Schließen der Liste per Klick außerhalb (Blur) ohne Auswahl → keine Änderung am
   Dokument, Anzeigewert kehrt zur zuvor aktiven Schriftart zurück.
5. Wiederholtes schnelles Öffnen/Schließen der Liste → kein Speicherleck, kein
   doppeltes Event-Handler-Registrieren (insbesondere falls Local Font Access API pro
   Öffnung neu abgefragt würde — Ergebnis sollte gecacht werden, nicht bei jedem
   Öffnen erneut den Berechtigungsdialog auslösen).

---

## 5. Nicht-Ziele / bewusste Abgrenzung

### 5.1 Getrennte Slugs
Folgende, im Feature-Backlog separat geführte Punkte sind **ausdrücklich nicht** Teil
dieser Anforderung: `schriftgroesse-waehlen`, `schrift-vergroessern`/
`schrift-verkleinern`, `gross-kleinschreibung`, `zeichenabstand`, `texteffekte`,
`formatierung-loeschen`, `formatvorlage-erstellen`, `formatvorlagen-satz`.

### 5.2 Keine Schriftart-Binärdaten-Einbettung
Das tatsächliche Einbetten der Schriftart-**Datei** (Glyphen/TTF-Daten) in die
exportierte DOCX (`w:embedTrueTypeFonts`-Flag in `settings.xml` + `word/fontTable.xml` +
zugehörige `.fntdata`-Teile) bzw. eine entsprechende ODF-Erweiterung ist **nicht**
Gegenstand dieser Anforderung. Diese App speichert und referenziert ausschließlich den
**Namen** der Schriftart, nicht die Schriftdaten selbst — genau wie die
Backlog-Beschreibung „Liste installierter/**eingebetteter** Schriftarten“ es für den
Auswahl-Dialog meint (zeigt auch im Dokument bereits referenzierte/„eingebettete"
Namen an), nicht wie für eine vollständige Font-Embedding-Pipeline. Diese Abgrenzung
muss im Backlog als bewusste, dokumentierte Einschränkung vermerkt werden, sobald diese
Datei umgesetzt/abgenommen wird — nicht stillschweigend offenbleiben (vgl. „Kein
stiller Fehlschlag“-Prinzip aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.4, sinngemäß auf
Scope-Dokumentation übertragen).

### 5.3 Keine volle Parität der Systemschriftarten-Erkennung
Eine zuverlässige, browserübergreifende Erkennung aller tatsächlich auf dem Gerät der
Nutzer:in installierten Schriftarten ist technisch nicht in allen Browsern möglich
(Fingerprinting-Schutz). Es gilt ausschließlich: kuratierte Liste (verbindlich, überall)
+ optionale Local Font Access API-Erweiterung (nur Chromium, nur mit Nutzer-Erlaubnis).
Eine abweichende Erwartungshaltung („muss auf jedem Browser echte Systemschriften
zeigen") ist kein Verifikationskriterium dieser Datei.

---

## 6. Rundreise-Anforderung (verbindlich für „vollständig verifiziert")

Diese Anforderung ist die zentrale Abnahmebedingung für den Status „vollständig
verifiziert" dieses Backlog-Eintrags, zusätzlich zu allen Einzelfällen aus Abschnitt 3:

> Datei A (DOCX **oder** ODT) mit mindestens einem Textlauf, der eine explizite,
> von Word/LibreOffice gesetzte Schriftart trägt, hochladen → **ohne jede Änderung**
> im Editor sofort exportieren → Ergebnisdatei erneut über denselben Importweg
> importieren → die Schriftart jedes betroffenen Textlaufs muss exakt (Name,
> Zuordnung zum richtigen Textteil) erhalten bleiben.
>
> Zusätzlich, weil diese Funktion komplett neu gebaut wird: Ein **neues** Dokument im
> Editor erstellen, auf eine Selektion eine Schriftart über die neue Combobox anwenden,
> als DOCX **und** als ODT exportieren, jeweils re-importieren → die gewählte
> Schriftart bleibt in beiden Formaten exakt erhalten. Dieser zweite Fall ist der
> eigentliche Kernnachweis, dass die Funktion funktioniert, da es zum Zeitpunkt dieser
> Spezifikation noch kein Bestandsdokument mit einer über die App selbst gesetzten
> Schriftart-Mark gibt.

Prüfkriterien (je Kriterium einzeln abhakbar):

1. **Zuordnung**: Die Schriftart bleibt exakt demselben Textlauf zugeordnet, nicht nur
   „irgendwo im Dokument vorhanden".
2. **Name**: Zeichengetreu identisch (Groß-/Kleinschreibung, Leerzeichen,
   Sonderzeichen), keine Normalisierung/Ersetzung.
3. **Kombination**: Bleibt in Kombination mit Fett/Kursiv/Unterstrichen/Durchgestrichen/
   Schriftfarbe/Hervorhebung auf demselben Textlauf zusammen erhalten (vgl.
   `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 3, Testfälle 3–5).
4. **Struktur**: Schriftart auf Text innerhalb einer Tabellenzelle, eines Listenpunkts,
   einer Überschrift und in Kopf-/Fußzeile bleibt jeweils erhalten.
5. **Kein stiller Verlust bei Fremddatei-Schriftarten**: Eine Schriftart aus einer
   Fremddatei, die nicht in der kuratierten Liste steht, bleibt bei unverändertem
   Re-Export exakt erhalten (nicht durch Standard-/Listen-Schriftart ersetzt).
6. **Kein Absturz/keine Exception** während des gesamten Zyklus
   Import → Export → Re-Import bzw. Neu erstellen → Export → Re-Import.
7. **Kein unnötiges Dirty-Flag**: Ein unverändert re-importiertes Dokument mit
   Schriftart-Marks gilt weiterhin als `dirty: false` (siehe 2.4).

**Format-Matrix — jede Zelle ist ein Pflicht-Testfall:**

| Zyklus | Pflicht |
|---|---|
| DOCX mit Schriftart-Formatierung hochladen → unverändert als DOCX exportieren → DOCX re-importieren | Ja — Kriterien 1–7 |
| ODT mit Schriftart-Formatierung hochladen → unverändert als ODT exportieren → ODT re-importieren | Ja — Kriterien 1–7 |
| Neues Dokument → Schriftart über die Toolbar setzen → als DOCX exportieren → DOCX re-importieren | Ja — Kriterien 1–3, 6, 7 |
| Neues Dokument → Schriftart über die Toolbar setzen → als ODT exportieren → ODT re-importieren | Ja — Kriterien 1–3, 6, 7 |

Sobald `speichern-unter-format` (Cross-Format-Export DOCX↔ODT, aktuell laut Backlog
„fehlt") umgesetzt ist, gilt ergänzend (informativ, nicht Blocker für den Basis-Scope
dieser Datei, aber zwingend nachzutragen, sobald verfügbar — Schriftartnamen sind nicht
zwingend 1:1 zwischen Word- und LibreOffice-Standardsätzen austauschbar, z. B.
„Calibri" vs. „Carlito"/„Liberation Sans"):

| Zyklus | Status |
|---|---|
| DOCX mit Schriftart hochladen → als ODT exportieren → ODT re-importieren | Nachrichtlich, sobald Cross-Format-Export existiert (siehe `FEATURE-SPEC-DOCX-ODT.md` 1.3, Testfall 3) |
| ODT mit Schriftart hochladen → als DOCX exportieren → DOCX re-importieren | Nachrichtlich, sobald Cross-Format-Export existiert (siehe `FEATURE-SPEC-DOCX-ODT.md` 1.3, Testfall 4) |

**Testdaten-Anforderung**: Mindestens eine realistische Testdatei pro Format mit
mehreren unterschiedlichen, explizit gesetzten Schriftarten in verschiedenen
Textläufen (inkl. mindestens einer „exotischen"/nicht kuratierten Schriftart) ist
zusätzlich zu einer trivialen Ein-Satz-Datei zu verwenden (vgl. Fixture-Hinweis in
`datei-oeffnen-req.md` Abschnitt 6, `tests/fixtures/external`).

---

## 7. Abnahmekriterium für „vollständig verifiziert"

Der Backlog-Status für `schriftart-waehlen` darf erst dann von „fehlt" auf „verifiziert"
geändert werden, wenn:

1. Die Funktion gemäß Abschnitt 1 und 2 tatsächlich gebaut wurde — Schema-Mark,
   Toolbar-Bedienelement, Commands-Funktionen, DOCX- **und** ODT-Reader/Writer, nicht
   nur eines davon (ein reines Datenmodell-Attribut ohne bedienbare UI wäre nach der in
   `FEATURE-BACKLOG.md` verwendeten Methodik weiterhin „teilweise“, nicht „vorhanden").
2. Jeder Punkt aus Abschnitt 3 (Grenzfälle) und Abschnitt 4 (UI-Robustheit) einzeln mit
   einem echten, im Browser ausgeführten Test nachgewiesen ist (nicht nur
   Reader/Writer-Unit-Test mit direkt konstruierten Testdaten) — analog zur in
   `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 22 Punkt 6 beschriebenen QA-Übergabe.
3. Die vollständige Rundreise-Matrix aus Abschnitt 6 für DOCX **und** ODT sowie für
   „Bestandsdatei" **und** „neu erstelltes Dokument" grün ist, inklusive aller sieben
   Prüfkriterien.
4. Die bewusste Abgrenzung aus Abschnitt 5.2 (keine Font-Binärdaten-Einbettung) im
   Backlog als dokumentierte, akzeptierte Einschränkung vermerkt ist — nicht als
   übersehene Lücke.
5. Kein offener, aus dieser Datei hervorgegangener Fehlerbefund unbeantwortet bleibt
   (jeder Fund entweder behoben und regressionsgetestet, oder bewusst als bekannte
   Einschränkung dokumentiert, analog zur „Kein stiller Fehlschlag"-Anforderung in
   `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.4).
