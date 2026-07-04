# Feature „Suchen" — Anforderungsspezifikation & Testplan

Status: **Entwurf zur Freigabe** — Backlog-Status ist „fehlt" und gilt aktuell als
**nicht vertrauenswürdig**. Diese Datei ersetzt keine Codeaussage, sondern definiert
verbindlich, was „fertig" für dieses Feature bedeutet. Bevor irgendein Status auf
„vorhanden" gesetzt wird, muss jeder Punkt unten durch echte Browser-Bedienung
(Playwright-E2E, kein isolierter Command-Aufruf) nachgewiesen sein — siehe
Abschnitt 13 „Verifikationsauftrag".

Bezug zum Backlog (`E:\docs\specs\FEATURE-BACKLOG.md`, Abschnitt „2.5 Bearbeiten
(Suchen & Navigieren)"):

| Slug | Titel | Status laut Backlog | Priorität | Teil dieser Spezifikation? |
|---|---|---|---|---|
| `suchen` | Suchen | fehlt | 1 (essenziell) | **Ja — Kernumfang, Pflicht** |
| `suchen-ersetzen` | Suchen & Ersetzen | fehlt | 2 (wichtig) | Ja — Abschnitt 9, wünschenswerte Erweiterung |
| `suchen-ersetzen-erweitert` | Erweiterte Suche (Regex/Formatierung) | fehlt | 4 (Randfall) | Nein — explizit außerhalb des Scopes, siehe Abschnitt 10 |
| `gehe-zu` | Gehe zu (Seite/Abschnitt/Zeile) | fehlt | 3 | Nein — eigenes Feature, nur als Abgrenzung erwähnt (Abschnitt 10) |

Die Beschreibung im Aufgabenauftrag lautet wörtlich: „Findet Textstellen im Dokument
und hebt sie hervor." Das ist exakt der Kernumfang von Abschnitt 2–8 dieser Spezifikation
(reines **Suchen**, ohne Textänderung). Alles darüber hinaus (Ersetzen, Regex) ist als
klar abgegrenzte, optionale Erweiterung markiert, damit Umfang und Abnahmekriterien nicht
verwässert werden.

Architektur-Grundprinzip (wie in `FEATURE-SPEC-DOCX-ODT.md`): DOCX und ODT teilen sich
einen gemeinsamen internen Editor (`src/formats/shared/editor/`, ProseMirror-Schema +
Seitenansicht). Die Suche muss deshalb **unabhängig vom Ursprungsformat** funktionieren
und darf **niemals** die Rundreise-Fähigkeit einer Datei beeinträchtigen (siehe
Abschnitt 12 — Rundreise-Anforderung).

Betroffene/zu erweiternde Dateien (Stand heute, laut Code-Recherche):
- `src/formats/shared/editor/Toolbar.tsx` — enthält aktuell **keinen** Suchen-Button.
- `src/formats/shared/editor/commands.ts` — enthält aktuell **keine** Such-Logik.
- `src/formats/shared/editor/WordEditor.tsx` — Plugin-Registrierung (Keymap, Pagination-Plugin);
  ein Such-Plugin (ProseMirror `Plugin` mit `Decoration`-Set) muss hier zusätzlich
  registriert werden.
- `src/formats/shared/schema.ts` — enthält bereits die Marks `highlight` (Textmarker-
  Hervorhebungsfarbe, persistent, exportiert) und `textColor`. **Wichtig:** Die
  Such-Hervorhebung darf **nicht** über diesen bestehenden `highlight`-Mark laufen
  (siehe Abschnitt 6 — sonst Vermischung mit echter Nutzer-Formatierung und
  Datenkorruption bei Export).

---

## 1. Zusammenfassung des Soll-Zustands

„Suchen" ist eine flüchtige (nicht dokumentverändernde), jederzeit ein-/ausblendbare
Funktion, die:
1. eine Sucheingabe entgegennimmt,
2. alle Fundstellen im gesamten Dokument (Haupttext, Kopf-/Fußzeile falls vorhanden,
   Tabellenzellen, Listenelemente) ermittelt,
3. **alle** Fundstellen visuell hervorhebt,
4. die **aktuelle** Fundstelle zusätzlich abweichend hervorhebt und in den sichtbaren
   Bereich scrollt,
5. Navigation zwischen Fundstellen erlaubt (nächste/vorherige, mit Umbruch am
   Dokumentende/-anfang),
6. die Trefferanzahl und Position anzeigt („3 von 12"),
7. beim Schließen/Leeren der Eingabe **spurlos** verschwindet — keine Restmarkierung,
   keine Veränderung am Dokumentinhalt, kein Eintrag in der Undo-Historie.

---

## 2. Aktivierung / Bedienelemente

| # | Element | Beschreibung |
|---|---|---|
| 1 | Toolbar-Button „Suchen" | Neuer Button in `Toolbar.tsx`, eigenes SVG-Icon (Lupe) — **kein Unicode-/Emoji-Zeichen**, siehe Lehre aus Abschnitt 20 von `FEATURE-SPEC-DOCX-ODT.md` (Icon-Rendering-Problem). Öffnet die Suchleiste. |
| 2 | Tastenkürzel Strg+F (Cmd+F auf macOS) | Öffnet die Suchleiste, **verhindert die native Browser-Suche** (`preventDefault`), solange der Editor fokussiert ist. Funktioniert aus jeder Cursor-Position im Dokument, auch aus einer Tabellenzelle oder Kopf-/Fußzeile heraus. |
| 3 | Sucheingabefeld | Einzeiliges Textfeld, erhält beim Öffnen automatisch den Fokus. Vorbelegt mit der aktuellen Textselektion, falls beim Öffnen Text markiert war (Standardverhalten wie in Word/LibreOffice/Browser-Suche). |
| 4 | „Nächster Treffer" (Pfeil runter / Enter) | Springt zum nächsten Treffer nach der aktuellen Cursor-/Trefferposition, mit Umbruch zum ersten Treffer nach dem letzten. |
| 5 | „Vorheriger Treffer" (Pfeil hoch / Umschalt+Enter) | Springt zum vorherigen Treffer, mit Umbruch zum letzten Treffer vor dem ersten. |
| 6 | Trefferzähler-Anzeige | Textanzeige „x von y" bzw. „Keine Treffer" neben dem Eingabefeld. |
| 7 | Option „Groß-/Kleinschreibung beachten" | Checkbox/Toggle, Standard: aus (case-insensitive). |
| 8 | Option „Nur ganzes Wort" | Checkbox/Toggle, Standard: aus. |
| 9 | Schließen-Button (X) / Escape-Taste | Schließt die Suchleiste, entfernt alle Hervorhebungen, gibt den Fokus zurück in den Editor an die zuletzt aktive Cursor-Position (nicht zwingend die Trefferposition, siehe Abschnitt 5). |

**Grenzfall:** Wenn die Suchleiste bereits offen ist und erneut Strg+F gedrückt wird
→ Fokus springt ins Sucheingabefeld (Feld wird nicht neu geöffnet/zurückgesetzt),
vorhandener Suchtext und Trefferliste bleiben erhalten, nur der Fokus wechselt.

---

## 3. Sucheingabe & Live-Verhalten

- Die Suche startet **live**, während getippt wird (kein zusätzlicher „Suchen"-Klick
  nötig) — Debounce ist erlaubt (z. B. 150–250 ms bei sehr großen Dokumenten), darf
  sich aber nicht wie eine spürbare Verzögerung anfühlen.
- Groß-/Kleinschreibung standardmäßig **ignoriert** (Toggle in Abschnitt 2, Punkt 7).
- Umlaute und Sonderzeichen (ä, ö, ü, ß, Akzente) werden korrekt gefunden — keine
  Normalisierungsfehler (z. B. „ß" muss „ß" finden, nicht nur als „ss" oder gar nicht).
- Sucheingabe wird als **reiner Literaltext** behandelt, keine ungewollte
  Regex-Interpretation (Zeichen wie `.`, `*`, `(`, `)`, `[`, `]`, `+`, `?`, `\` müssen
  buchstäblich gesucht werden, nicht als Metazeichen). Echte Regex-Suche ist ein
  separates, hier explizit ausgeschlossenes Feature (Abschnitt 10).
- Leere Sucheingabe → keine Hervorhebung, keine Fehlermeldung, Zähler zeigt keinen Wert
  oder „–" an (kein „0 von 0", das nach einem Fehler aussieht).
- Suchbegriff ohne Treffer → Zähler zeigt „Keine Treffer" (oder gleichwertig), Eingabefeld
  bekommt **keine** Fehlerfarbe, die wie ein blockierender Fehler aussieht (bloßes
  „nichts gefunden" ist kein Anwendungsfehler).
- Suchbegriff, der über eine Formatierungsgrenze hinweg im Dokument steht (z. B. „Wort"
  ist teils fett, teils normal, aber ein zusammenhängender Textlauf) → wird trotzdem als
  ein zusammenhängender Treffer erkannt (Suche arbeitet auf dem reinen Textinhalt, nicht
  auf einzelnen Formatierungs-Textläufen).
- Suchbegriff, der sich über zwei Absätze erstreckt → wird **nicht** als ein Treffer
  gezählt (Absatzgrenze ist eine harte Grenze für die Volltextsuche); das muss
  dokumentiert und getestet sein, damit kein unerwartetes Verhalten entsteht.
- Tab-Zeichen, geschützte Leerzeichen, Zeilenumbrüche (`hard_break`) innerhalb eines
  Absatzes: harte Zeilenumbrüche (Umschalt+Enter) trennen den Suchtext **nicht** —
  ein Treffer darf über einen `hard_break` hinweg gefunden werden, sofern er im selben
  Absatz-Node liegt.

**Testfälle**
1. Tippen im Suchfeld → Hervorhebung erscheint ohne Klick auf einen „Suchen"-Button.
2. Groß-/Kleinschreibung-Toggle an/aus → Trefferzahl ändert sich korrekt bei
   gemischter Schreibung im Dokument.
3. Suche nach „ß", „ä", „é" in einem Dokument mit diesen Zeichen → korrekt gefunden.
4. Suche nach `a.b*c` (Literalzeichen mit Regex-Bedeutung) in einem Dokument, das
   genau diese Zeichenfolge enthält → gefunden; ein Dokument, das stattdessen z. B.
   „aXbYYYc" enthält (was ein echter Regex `a.b*c` fälschlich träfe) → **nicht**
   gefunden.
5. Leeres Suchfeld → keine Hervorhebung, keine Konsolen-Exception.
6. Suchbegriff ohne Treffer → verständliche „Keine Treffer"-Anzeige, kein Absturz.
7. Suchbegriff, der einen fett/normal-Übergang überspannt → als ein Treffer erkannt.
8. Suchbegriff, der zwei Absätze überspannen würde → korrekt **kein** Treffer.
9. Suchbegriff über einen manuellen Zeilenumbruch (Umschalt+Enter) hinweg innerhalb
   desselben Absatzes → **wird** als Treffer erkannt.

---

## 4. Trefferhervorhebung (Darstellung)

- **Alle** Fundstellen im Dokument werden gleichzeitig sichtbar markiert (z. B. gelber
  Hintergrund), nicht nur die aktuell aktive.
- Die **aktuell aktive** Fundstelle wird zusätzlich visuell abgesetzt (z. B. kräftigeres
  Orange/Rahmen), damit sie sich eindeutig von den übrigen, nur „gefundenen" Stellen
  unterscheidet — reine Farbgleichheit zwischen „aktuell" und „alle übrigen" ist nicht
  ausreichend (Kontrast/zusätzliches visuelles Merkmal nötig, auch für
  Farbfehlsichtige — nicht nur über Farbton, sondern zusätzlich über z. B. Rahmen/Fettung
  unterscheidbar).
- Aktive Fundstelle wird automatisch in den sichtbaren Ansichtsbereich gescrollt
  (auch über Seitengrenzen der Seitenansicht hinweg, siehe Abschnitt 8 in
  `FEATURE-SPEC-DOCX-ODT.md` zur Paginierung).
- Die Hervorhebung darf die zugrunde liegende Zeichenformatierung (fett, Farbe, Links,
  bestehende Textmarker-Hervorhebung) **nicht verdecken oder ersetzen** — beide müssen
  gleichzeitig sichtbar bleiben (z. B. Such-Overlay mit Transparenz/Mischmodus statt
  deckendem Hintergrund, der eine bestehende Nutzer-Hervorhebungsfarbe überstreicht).
- Trefferanzahl und aktueller Index aktualisieren sich sofort, wenn während offener
  Suche weiter im Dokument getippt/gelöscht wird (siehe Abschnitt 7 — Suche bleibt
  über Dokumentänderungen hinweg konsistent).

**Testfälle**
1. Mehrere Treffer im Dokument → alle gleichzeitig sichtbar markiert.
2. Aktiver Treffer optisch von den übrigen unterscheidbar (Screenshot-Vergleich/DOM-Klassenprüfung).
3. Treffer auf Seite 2 eines mehrseitigen Dokuments aktivieren → Ansicht scrollt automatisch dorthin.
4. Treffer in einem Textabschnitt, der bereits die Nutzer-Hervorhebungsfarbe
   (`highlight`-Mark) trägt → beide Hervorhebungen bleiben gleichzeitig erkennbar,
   der `highlight`-Mark-Wert selbst bleibt unverändert (Prüfung im Dokumentmodell:
   Mark-Attribute vor/nach Suche identisch).
5. Treffer in fett/kursiv/farbigem Text → Zeichenformatierung bleibt sichtbar unter
   der Such-Hervorhebung.

---

## 5. Navigation zwischen Treffern

- „Nächster"/„Vorheriger" bewegen die aktive Markierung entlang der **Dokumentreihenfolge**
  (nicht der visuellen Bildschirmreihenfolge, falls sich das je unterscheiden sollte,
  z. B. bei mehrspaltigem Layout — aktuell nicht unterstützt, siehe
  `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 18, daher hier nicht relevant).
- Enter im Suchfeld = „Nächster Treffer". Umschalt+Enter = „Vorheriger Treffer".
- Erreichen des letzten Treffers + „Nächster" → springt zurück zum ersten Treffer
  (Umbruch/Wrap-Around), keine Sackgasse.
- Erreichen des ersten Treffers + „Vorheriger" → springt zum letzten Treffer.
- Schließen der Suchleiste (Escape/X) → Cursor wird an der Position des zuletzt
  aktiven Treffers im echten Editor-Dokument platziert (nicht nur visuell markiert,
  sondern als tatsächliche ProseMirror-Selektion), sodass direkt weitergetippt werden
  kann. **Dies ist der kritische Berührungspunkt mit dem bekannten
  Selection-Sync-Bug** aus Abschnitt 2 von `FEATURE-SPEC-DOCX-ODT.md`: Nach dem
  Schließen der Suche muss die interne Editor-Selektion nachweislich synchron mit der
  sichtbaren Cursor-Position sein, bevor getippt wird — ein dedizierter Regressionstest
  ist Pflicht (siehe Abschnitt 11, Testfall 6).

**Testfälle**
1. Mehrere Treffer → „Nächster" bewegt sich in Dokumentreihenfolge vorwärts.
2. Am letzten Treffer „Nächster" drücken → Umbruch zum ersten Treffer.
3. Am ersten Treffer „Vorheriger" drücken → Umbruch zum letzten Treffer.
4. Suche schließen → Cursor steht sichtbar UND selektionstechnisch (ProseMirror-Selection)
   an der Stelle des letzten aktiven Treffers.
5. Nach Schließen der Suche sofort tippen → neuer Text erscheint exakt an dieser Stelle,
   **kein** Ersetzen/Löschen des gesamten Dokumentinhalts (Regressionstest analog zu
   `tests/e2e/selection-regression.spec.ts`).

---

## 6. Technische Anforderung: Hervorhebung als flüchtige Decoration

**Verbindliche Architekturentscheidung, kein Implementierungsdetail zur freien Wahl:**
Die Such-Hervorhebung **muss** über ProseMirror-`Decoration`/`DecorationSet` in einem
eigenen Plugin realisiert werden (analog registriert wie `createPaginationPlugin()` in
`WordEditor.tsx`), **nicht** über den bestehenden `highlight`-Mark aus `schema.ts`.

Begründung/Risiko bei falscher Umsetzung:
- Der `highlight`-Mark ist persistenter Dokumentinhalt, der beim Export nach DOCX
  (`w:highlight`/Schattierung) bzw. ODT (`fo:background-color`) geschrieben wird.
  Würde die Suche diesen Mark missbrauchen, würde jede Suche das Dokument tatsächlich
  verändern (Undo-Historie, Export-Inhalt, Rundreise) — nicht akzeptabel für eine reine
  Lesefunktion.
- Decorations sind rein darstellungsseitig, erzeugen **keinen** Undo-Schritt, sind
  **nicht** Teil von `doc.toJSON()`/des exportierten Inhalts und verschwinden beim
  Schließen der Suche vollständig, ohne Spuren im Dokumentmodell zu hinterlassen.

**Testfälle**
1. Suche mit Treffern durchführen, danach Export (DOCX und ODT) **ohne** die Suche zu
   schließen → exportierte Datei enthält **keine** Such-Hervorhebung (weder als
   `highlight`-Mark-Attribut noch als sonstiges Element); Re-Import zeigt unverändertes
   Dokument.
2. Suche mit Treffern durchführen, danach Strg+Z (Undo) → **kein** Undo-Schritt wird
   durch die Suche selbst verbraucht (Undo wirkt auf die letzte tatsächliche
   Inhaltsänderung vor dem Öffnen der Suche, nicht auf einen „Such-Schritt").
3. Dokumentmodell (`doc.toJSON()` bzw. äquivalente Prüfung) vor und nach einer
   kompletten Such-Sitzung (öffnen, tippen, navigieren, schließen) ist **exakt
   identisch** (Byte-/Struktur-Vergleich), sofern nicht ersetzt wurde (siehe
   Abschnitt 9 für die abweichenden Anforderungen bei Suchen & Ersetzen).

---

## 7. Verhalten bei gleichzeitiger Dokumentbearbeitung

- Die Suchleiste kann geöffnet bleiben, während im Dokument weiter getippt/gelöscht/
  formatiert wird (kein Modal, das die Bearbeitung blockiert — Ausnahme: Ersetzen-Aktionen
  in Abschnitt 9 dürfen kurzzeitig fokussiert sein, aber auch dort bleibt der Haupttext
  editierbar).
- Ändert sich der Dokumentinhalt während offener Suche (Text wird eingefügt/gelöscht,
  wodurch sich Trefferpositionen verschieben oder Treffer wegfallen/neu entstehen),
  wird die Trefferliste **automatisch neu berechnet** (kein manuelles erneutes Suchen
  nötig), Trefferzähler aktualisiert sich live.
- Löschen der aktuell aktiven Fundstelle durch Editieren → aktive Markierung springt
  sinnvoll zum nächsten verbleibenden Treffer (oder zeigt „Keine Treffer", falls keiner
  mehr existiert), ohne Absturz oder veraltete Referenz auf eine nicht mehr existierende
  Textposition.

**Testfälle**
1. Suche mit 3 Treffern offen halten, einen der Treffer durch Löschen des Wortes
   entfernen → Zähler aktualisiert sich auf 2 Treffer, keine Exception.
2. Suche offen, neuen Text eintippen, der einen zusätzlichen Treffer erzeugt →
   Trefferzahl erhöht sich automatisch, neuer Treffer wird mitmarkiert.
3. Aktiven Treffer per Backspace löschen, während Suche offen ist → aktive Markierung
   wechselt kontrolliert zum nächsten Treffer, kein Crash, kein hängender Zustand.

---

## 8. Suche über Dokumentstruktur hinweg (Tabellen, Listen, Kopf-/Fußzeile)

- Suche durchsucht den **gesamten** Dokumentinhalt: normale Absätze, Überschriften,
  Listenelemente (Aufzählung/Nummerierung), **alle** Tabellenzellen, sowie — sobald
  Kopf-/Fußzeilen editierbar sind (siehe `FEATURE-SPEC-DOCX-ODT.md`, Abschnitt 9) —
  auch deren Inhalt.
- Reihenfolge folgt der Dokumentstruktur: Kopfzeile (falls vorhanden) → Haupttext in
  Lesereihenfolge (inkl. Tabellenzellen zeilenweise von links nach rechts) → Fußzeile
  (falls vorhanden). Diese Reihenfolge muss konsistent für „Nächster"/„Vorheriger"
  gelten.
- Ein Treffer, der ausschließlich in der Kopf-/Fußzeile liegt, muss beim Navigieren
  erreichbar sein, auch wenn der Cursor aktuell im Haupttext steht.

**Testfälle**
1. Suchbegriff kommt sowohl im Haupttext als auch in einer Tabellenzelle vor →
   beide werden gefunden, Navigation funktioniert zwischen beiden.
2. Suchbegriff kommt in einem Listenelement vor → wird gefunden, Listenstruktur bleibt
   dabei unangetastet.
3. (Sobald Kopf-/Fußzeile editierbar ist) Suchbegriff nur in der Fußzeile vorhanden,
   Cursor steht im Haupttext, „Nächster Treffer" wird gedrückt → Sprung in die
   Fußzeile funktioniert.
4. Tabelle mit vielen Zellen, Suchbegriff in mehreren nicht benachbarten Zellen →
   Navigationsreihenfolge folgt nachvollziehbar der Zellreihenfolge (zeilenweise).

---

## 9. Erweiterung: Suchen & Ersetzen (wünschenswert, `suchen-ersetzen`, Priorität 2)

Dies ist laut `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2 „idealerweise" zusätzlich zur
reinen Suche gewünscht. Es handelt sich um eine **dokumentverändernde** Erweiterung der
Suchleiste (zweites Eingabefeld „Ersetzen durch") und wird hier als eigener,
klar abgegrenzter Satz von Anforderungen geführt, damit die Kernfunktion „Suchen"
(Abschnitt 1–8) auch unabhängig davon abgenommen werden kann.

- Zweites Eingabefeld „Ersetzen durch", nur sichtbar/aktiv, wenn die Suchleiste im
  „Ersetzen"-Modus ist (z. B. per Umschalter „Suchen" ↔ „Suchen & Ersetzen").
- „Ersetzen" (einzeln): ersetzt **nur** die aktuell aktive Fundstelle, springt danach
  automatisch zum nächsten verbleibenden Treffer.
- „Alle ersetzen": ersetzt **alle** Fundstellen im Dokument in einem Arbeitsschritt.
- Jede Ersetzung übernimmt die **Zeichenformatierung der ersetzten Textstelle** auf den
  neuen Text (Ersetzung ist keine Neuerzeugung von unformatiertem Text mitten in
  formatiertem Kontext) — Grenzfall: Ersetzungstext, der über die ursprüngliche
  Formatierungsgrenze hinausragt (länger als das Original), übernimmt die Formatierung
  der Position, an der die Ersetzung beginnt.
- „Ersetzen"/„Alle ersetzen" erzeugt **genau einen** (bzw. bei „Alle ersetzen" einen
  zusammenhängenden) Undo-Schritt — ein einzelnes Strg+Z macht die komplette
  Ersetzungsaktion rückgängig, nicht nur ein Zeichen davon.
- „Ersetzen durch" mit leerem Feld → entspricht Löschen der Fundstelle (gültiger,
  bewusst unterstützter Grenzfall, keine Fehlermeldung).
- Rundreise: Nach „Alle ersetzen", Export (DOCX **und** ODT), Re-Import → ersetzter
  Text ist an der richtigen Stelle mit korrekt übernommener Formatierung vorhanden,
  keine Reste des alten Textes.

**Testfälle**
1. Einzelnes „Ersetzen" auf aktivem Treffer → nur dieser Treffer wird ersetzt, übrige
   bleiben als Treffer bestehen (Zähler reduziert sich um 1).
2. „Alle ersetzen" bei 5 Treffern → alle 5 werden ersetzt, Zähler zeigt „Keine Treffer"
   für den alten Suchbegriff.
3. Ersetzung in fett formatiertem Text → Ersatztext ist ebenfalls fett.
4. Strg+Z nach „Alle ersetzen" → gesamter Vorgang wird in einem Schritt rückgängig
   gemacht, alle 5 Originaltexte sind wieder vorhanden.
5. „Ersetzen durch" leer lassen + „Alle ersetzen" → alle Fundstellen werden entfernt,
   umgebender Text bleibt unangetastet.
6. Rundreise DOCX: Ersetzen → Export → Re-Import → Inhalt korrekt.
7. Rundreise ODT: Ersetzen → Export → Re-Import → Inhalt korrekt.
8. Ersetzungstext, der Suchbegriff selbst enthält (z. B. „Katze" → „Katzenbaby", wobei
   „Katze" weiter im Ersetzungstext vorkommt) → keine Endlosschleife bei „Alle
   ersetzen", jeder ursprüngliche Treffer wird genau einmal ersetzt.

---

## 10. Explizit außerhalb des Scopes dieser Spezifikation

Um Missverständnisse bei der späteren Abnahme zu vermeiden, wird hier festgehalten,
was **nicht** Teil von „Suchen" (dieser Datei) ist, sondern eigene, separate
Backlog-Einträge mit eigener Priorität bleiben:

- **`suchen-ersetzen-erweitert` (Regex/Formatierungssuche, Priorität 4):** Suche nach
  regulären Ausdrücken oder nach Formatierungsmerkmalen (z. B. „alle fett formatierten
  Wörter finden") ist **nicht** Teil dieser Spezifikation. Der Suchbegriff wird gemäß
  Abschnitt 3 immer literal behandelt.
- **`gehe-zu` (Gehe zu Seite/Abschnitt/Zeile, Priorität 3):** Direktes Springen zu einer
  Seitenzahl/Zeilennummer ohne Textsuche ist ein eigenes Feature und hier nicht
  gefordert.
- Suche über mehrere gleichzeitig geöffnete Dokumente hinweg — es existiert laut
  Backlog kein Mehrfenster-Feature (`neues-fenster`, Priorität 4, fehlt), daher
  irrelevant.
- Persistenz der letzten Sucheingabe über einen Dokumentwechsel/Reload hinweg — nicht
  gefordert (Suche startet bei jedem neuen Dokument/Reload leer).

---

## 11. Grenzfälle (Zusammenfassung, Pflicht-Regressionsliste)

1. Leere Sucheingabe — kein Fehler, keine Hervorhebung (Abschnitt 3).
2. Kein Treffer — verständliche Anzeige, kein Absturz (Abschnitt 3).
3. Regex-Metazeichen im Suchbegriff — rein literal behandelt (Abschnitt 3).
4. Suchbegriff über Formatierungsgrenze hinweg im selben Absatz — ein Treffer
   (Abschnitt 3).
5. Suchbegriff über Absatzgrenze hinweg — **kein** Treffer, dokumentiertes Verhalten
   (Abschnitt 3).
6. **Selection-Sync-Regressionstest beim Schließen der Suche** — Pflichttest, siehe
   Abschnitt 5, Testfall 5. Muss dauerhaft in der E2E-Suite bleiben, analog zu
   `tests/e2e/selection-regression.spec.ts`.
7. Dokumentänderung während offener Suche (Treffer verschwindet/entsteht neu) —
   Abschnitt 7.
8. Suche über Tabellenzellen- und Listengrenzen hinweg — Abschnitt 8.
9. Export/Re-Import während offener bzw. gerade geschlossener Suche — Hervorhebung
   darf **niemals** im exportierten Dokument landen (Abschnitt 6, Testfall 1).
10. Sehr großes Dokument (mehrere hundert Absätze/eine reale komplexe Fixture-Datei)
    mit einem sehr häufigen Suchbegriff (z. B. „der/die/das", dutzende bis hunderte
    Treffer) — UI bleibt reaktionsfähig, kein spürbares Einfrieren beim Tippen
    (Performance-Testfall, siehe Abschnitt 8 in `FEATURE-SPEC-DOCX-ODT.md` zum
    generellen Performance-Anspruch „< 3 Sekunden bei realistischer Testdatei").
11. Suche unmittelbar nach dem Import einer Datei (bevor irgendetwas anderes bedient
    wurde) — muss ohne Vorbedingung funktionieren (kein „Editor muss erst einmal
    fokussiert/geklickt worden sein").
12. Suche unmittelbar nach „Neues Dokument" (leerer Editor) — kein Treffer, keine
    Fehlermeldung, keine Exception bei leerem `doc`.
13. Mehrfaches schnelles Öffnen/Schließen der Suchleiste (Strg+F, Escape, Strg+F, …) —
    kein doppelt registriertes Plugin, keine wachsende Zahl an Decorations/Memory-Leak.
14. Suchbegriff, der nur aus Leerzeichen besteht — behandelt wie „kein sinnvoller
    Suchbegriff", keine Endlos-Highlight-Flut über jedes Leerzeichen im Dokument (muss
    bewusst entschieden und dokumentiert werden: entweder als Treffer auf jedes
    Leerzeichen zulassen und korrekt anzeigen, oder bewusst wie leere Eingabe
    behandeln — beide sind akzeptabel, **still falsches Verhalten** ist es nicht).

---

## 12. Rundreise-Anforderung (DOCX **und** ODT)

Wie in `FEATURE-SPEC-DOCX-ODT.md` gefordert, gilt für jede Interaktion mit der
Such-Funktion die Rundreise-Bedingung: **Datei A hochladen → unverändert exportieren
→ Ergebnis entspricht inhaltlich A.**

Für „Suchen" bedeutet das konkret:

1. **Reine Suche verändert den Dokumentinhalt nie.** Eine DOCX- oder ODT-Datei wird
   importiert, eine beliebige Suchsitzung wird durchgeführt (öffnen, tippen, Treffer
   durchnavigieren, ggf. Groß-/Kleinschreibung-Toggle, schließen) — danach wird
   **ohne** weitere Änderung exportiert. Das Ergebnis muss inhaltlich **byteidentisch
   im Textinhalt** und in **allen Formatierungsattributen** der Originaldatei
   entsprechen (Formatierungs-IDs/XML-Layout dürfen sich technisch unterscheiden,
   der geschriebene Inhalt beim Re-Import aber nicht).
2. Dieser Rundreisetest wird **je einmal für DOCX und einmal für ODT** durchgeführt,
   mit realistischen Testdateien, die mindestens Zeichenformatierung, eine Liste und
   eine Tabelle enthalten (Suche muss durch alle diese Strukturen hindurch bedient
   worden sein, bevor exportiert wird).
3. Wird zusätzlich die Erweiterung „Suchen & Ersetzen" (Abschnitt 9) genutzt, gilt die
   allgemeine Rundreise-Anforderung aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 3/19: der
   geänderte Inhalt (ersetzter Text mit übernommener Formatierung) muss nach Export
   und Re-Import erhalten bleiben — sowohl bei Export nach DOCX als auch nach ODT,
   unabhängig vom Ursprungsformat (Cross-Format: ODT importiert → Ersetzen → als DOCX
   exportiert, und umgekehrt).
4. Cross-Format-Rundreise mit Suche/Ersetzen: DOCX importieren → suchen/ersetzen →
   als ODT exportieren → wieder als ODT importieren → als DOCX zurück-exportieren.
   Auch nach diesem doppelten Formatwechsel darf **kein** durch Ersetzen eingefügter
   oder verbliebener Text verloren gehen (Formatierungsverluste bei Cross-Format sind
   laut `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 19 akzeptabel und zu dokumentieren,
   Textverlust nicht).

**Testfälle**
1. DOCX-Testdatei mit Formatierung/Liste/Tabelle importieren → Suchsitzung
   durchführen (ohne Ersetzen) → Export → Re-Import → Diff gegen Originaldatei-Inhalt
   zeigt **keine** Abweichung.
2. Dasselbe für ODT.
3. DOCX importieren → Suchen & Ersetzen (Abschnitt 9) an mehreren Stellen inkl. einer
   Tabellenzelle → Export nach DOCX → Re-Import → ersetzter Inhalt korrekt vorhanden,
   nicht ersetzte Teile unverändert.
4. Dasselbe für ODT.
5. ODT importieren → Suchen & Ersetzen → Export **als DOCX** (Cross-Format) →
   Re-Import → Inhalt korrekt.
6. DOCX importieren → Suchen & Ersetzen → Export **als ODT** (Cross-Format) →
   Re-Import → Inhalt korrekt.

---

## 13. Verifikationsauftrag (Hinweis zum Backlog-Status „nicht vertrauenswürdig")

Da der Ausgangsstatus laut Backlog „fehlt" ist und dieses Feature vollständig neu
gebaut werden muss, gilt für die Abnahme dieselbe Regel wie in
`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 22 formuliert: **Jeder einzelne Testfall dieser
Datei muss über echte Browser-Interaktion (Playwright, sichtbarer Klick/Tastatureingabe)
nachgewiesen werden — nicht nur durch isolierte Command-/Unit-Tests auf
`commands.ts`-Ebene.** Ein Unit-Test, der eine Suchfunktion direkt mit konstruierten
ProseMirror-Dokumenten aufruft, beweist nicht, dass der Strg+F-Shortcut, der
Toolbar-Button und das sichtbare Hervorheben im echten Editor tatsächlich funktionieren.

Vorgeschlagene Testebenen (analog zur Testmatrix in `FEATURE-SPEC-DOCX-ODT.md`
Abschnitt 21):

| Ebene | Beispiel-Datei/Ort | Deckt ab |
|---|---|---|
| Unit-Test (Plugin-Logik) | `src/formats/shared/editor/__tests__/search.test.ts` (neu) | Treffer-Berechnung, Decoration-Erzeugung, Wrap-Around-Logik, Groß-/Kleinschreibung, Literal-Matching |
| E2E-Test (echte Bedienung) | `tests/e2e/search.spec.ts` (neu) | Strg+F, Toolbar-Button, Tippen im Feld, Navigation, Schließen + Selection-Sync-Regression, Ersetzen-Flow |
| Rundreise-Test | Erweiterung bestehender `tests/e2e/docx.spec.ts` / `tests/e2e/odt.spec.ts` bzw. Reader/Writer-Unit-Tests | Abschnitt 12 dieser Datei |
| Reale Fixture-Datei | vorhandene komplexe Test-ODT/DOCX (siehe `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 18) | Suche über Textboxen/Platzhalter/mehrspaltige Layouts hinweg, sofern deren Text überhaupt importiert wird |

Erst wenn alle Testfälle aus Abschnitt 3–12 auf diesen Ebenen grün sind, darf der
Backlog-Status von `suchen` auf „vorhanden" geändert werden.

---

## 14. Menü-/Bedienelement-Übersicht (Soll-Zustand, kompakt)

| # | Element | Aktueller Zustand | Soll |
|---|---|---|---|
| 1 | Toolbar-Button „Suchen" (Lupe, SVG-Icon) | fehlt komplett | neu bauen, siehe Abschnitt 2 |
| 2 | Tastenkürzel Strg+F | fehlt | neu bauen, überschreibt Browser-Standardsuche im Editor-Kontext |
| 3 | Sucheingabefeld + Live-Trefferhervorhebung | fehlt | siehe Abschnitt 3–4 |
| 4 | Trefferzähler „x von y" | fehlt | siehe Abschnitt 2, 4 |
| 5 | Nächster/Vorheriger Treffer (Pfeile/Enter) | fehlt | siehe Abschnitt 5 |
| 6 | Option Groß-/Kleinschreibung | fehlt | siehe Abschnitt 3 |
| 7 | Option Nur ganzes Wort | fehlt | siehe Abschnitt 3 |
| 8 | Schließen-Button/Escape | fehlt | siehe Abschnitt 2, 5 |
| 9 | Ersetzen-Feld + Ersetzen/Alle ersetzen | fehlt | siehe Abschnitt 9 (wünschenswerte Erweiterung) |

---

## 15. Zusammenfassung der Pflicht-Abnahmekriterien (Definition of Done)

Das Feature „Suchen" gilt erst dann als **vorhanden** im Sinne des Backlogs, wenn:

1. Strg+F **und** ein Toolbar-Button öffnen zuverlässig dieselbe Suchleiste.
2. Live-Suche mit korrektem Literal-Matching (kein ungewollter Regex), Groß-/
   Kleinschreibung-Toggle, Trefferzähler funktionieren.
3. Alle Treffer werden hervorgehoben, der aktive Treffer ist zusätzlich klar
   unterscheidbar, Navigation (nächster/vorheriger, mit Wrap-Around) funktioniert.
4. Die Hervorhebung ist nachweislich eine flüchtige Decoration (Abschnitt 6,
   Testfälle 1–3) — kein Einfluss auf Undo-Historie oder Export.
5. Der Selection-Sync-Regressionstest beim Schließen der Suche (Abschnitt 5,
   Testfall 5) ist grün und dauerhaft Teil der Suite.
6. Die Rundreise-Anforderung aus Abschnitt 12 (DOCX **und** ODT, reine Suche ohne
   Ersetzen) ist mit realistischen Testdateien nachgewiesen.
7. Alle Grenzfälle aus Abschnitt 11 sind einzeln als Testfall vorhanden und grün.
8. (Optional, aber für Backlog-Status „vorhanden" von `suchen-ersetzen` erforderlich)
   Suchen & Ersetzen inkl. eigener Rundreise-Testfälle aus Abschnitt 9 ist umgesetzt.

Bis alle acht Punkte erfüllt und durch echte Browser-Tests (Abschnitt 13) belegt sind,
bleibt der Status **nicht vertrauenswürdig** bzw. „fehlt"/„teilweise" — unabhängig
davon, ob einzelne Teilfunktionen bereits im Code sichtbar sind.
