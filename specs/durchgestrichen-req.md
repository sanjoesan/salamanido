# Anforderungen: „Durchgestrichen“ (Strikethrough)

Status: **vorhanden, aber nicht vertrauenswürdig — vollständige Verifikation angefordert.**
Diese Datei ist die verbindliche Anforderungsgrundlage für die Verifikation des Features
„Durchgestrichen“ aus `specs/FEATURE-BACKLOG.md` (Slug `durchgestrichen`, Abschnitt 2.2
„Zeichenformatierung“, Priorität 1). Sie ergänzt `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 3
(Zeichenformatierung) um die für dieses eine Feature nötige Detailtiefe: jedes Bedienelement,
jedes Detailverhalten, jeder Grenzfall und die Rundreise-Pflicht (DOCX **und** ODT).

Architektur-Grundprinzip bleibt wie im Hauptdokument: DOCX und ODT teilen sich einen
gemeinsamen internen Editor (ProseMirror-Schema, Mark `strike`). Jede Anforderung unten
gilt für **beide** Formate, sofern nicht ausdrücklich anders vermerkt.

---

## 1. Kontext & Ist-Zustand (Codeanalyse)

Der aktuelle Code wurde vor Erstellung dieser Anforderungen gesichtet, damit die
Verifikation zielgerichtet an den tatsächlich vorhandenen Mechanismen ansetzt:

| Ebene | Fundstelle | Befund |
|---|---|---|
| Datenmodell | `src/formats/shared/schema.ts` (Mark `strike`, ca. Zeile 128) | Eigenständige ProseMirror-Mark `strike`, `parseDOM` akzeptiert `<s>`, `<strike>` sowie CSS `text-decoration: line-through`; `toDOM` rendert `<s>`. |
| Toolbar | `src/formats/shared/editor/Toolbar.tsx` (Zeile 138) | Ein Button `MarkButton` mit `label="S"`, `title="Durchgestrichen"`, `glyphClassName="line-through"` (CSS auf dem Buchstaben „S“ selbst), `aria-pressed` je nach `markType.isInSet($from.marks())`. |
| Tastenkürzel | `src/formats/shared/editor/WordEditor.tsx` (Zeile ~76–78) | Es existieren `Mod-b`, `Mod-i`, `Mod-u` für Fett/Kursiv/Unterstrichen. **Für Durchgestrichen ist kein Tastenkürzel gebunden.** |
| DOCX-Import | `src/formats/docx/reader.ts` (Zeile 106) | `if (firstChildNS(rPr, ..., 'strike')) marks.push({ type: 'strike' })` — prüft nur, **ob** das Element `<w:strike>` existiert, **nicht** dessen `w:val`-Attribut. |
| DOCX-Export | `src/formats/docx/writer.ts` (Zeile 24) | Schreibt bei Vorhandensein der Mark immer `<w:strike/>` ohne `w:val`-Attribut. |
| ODT-Import | `src/formats/odt/reader.ts` (Zeilen 55–56, 90) | Liest `style:text-line-through-style` aus dem referenzierten Automatik-Textstil; `!== 'none'` ⇒ Mark gesetzt. |
| ODT-Export | `src/formats/odt/writer.ts` (Zeile 31) + `src/formats/odt/styleRegistry.ts` (Zeile 55) | Schreibt `style:text-line-through-style="solid" style:text-line-through-type="single"`. |
| Unit-/Roundtrip-Tests | `src/formats/docx/__tests__/roundtrip.test.ts`, `src/formats/odt/__tests__/roundtrip.test.ts` | Je ein Test „preserves bold, italic, underline, and strikethrough independently“ — prüft **nur** Schreiben→eigenes Lesen (Writer→Reader desselben Moduls), nicht gegen eine externe Referenzimplementierung, nicht kombiniert mit anderen Marks in Tabellen/Listen/Überschriften. |
| E2E-Tests (Browser) | `tests/e2e/docx.spec.ts`, `tests/e2e/odt.spec.ts` | Es existiert ein E2E-Test für den Button „Fett“ (`page.getByTitle('Fett').click()`), **kein** äquivalenter E2E-Test für „Durchgestrichen“. |

**Konsequenz:** Der Backlog-Status „vorhanden“ ist für die reine Existenz des Mechanismus
zutreffend, aber unbelegt in Bezug auf echte Browser-Bedienung, Fremd-Dateien und
Grenzfälle. Abschnitt 6 dieser Datei listet die aus der Codeanalyse abgeleiteten
konkreten Verdachtsmomente, die die Verifikation gezielt prüfen muss.

---

## 2. Menüpunkte / Bedienelemente (Soll)

| # | Element | Ort | Soll-Verhalten |
|---|---|---|---|
| 1 | Toolbar-Button „Durchgestrichen“ | Formatierungsleiste, Gruppe Zeichenformatierung (neben Fett/Kursiv/Unterstrichen) | Klick schaltet die Mark auf der aktuellen Selektion bzw. an der Schreibmarke um (Toggle). Muss unabhängig von Maus-Doppelklick, Tastatur-Selektion oder „Alles auswählen“ funktionieren. |
| 2 | Aktiv-Zustand des Buttons (`aria-pressed`, visuelle Hervorhebung) | derselbe Button | Zeigt korrekt an, ob der Text an der Schreibmarke/am Selektionsanfang bereits durchgestrichen ist. Muss sich sofort aktualisieren, wenn der Cursor bewegt wird — auch ohne Klick auf den Button selbst. |
| 3 | Icon/Beschriftung des Buttons | derselbe Button | Aktuell ein reiner Buchstabe „S“ mit CSS-Durchstreichung auf dem Buchstaben selbst. Muss auf allen Zielsystemen eindeutig von anderen Buchstaben-Buttons (F, K, U) unterscheidbar sein und dem in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 17/20 dokumentierten Icon-Rendering-Vorbehalt genügen (Fallback-Test auf System ohne besondere Schriftart-Unterstützung). |
| 4 | Tastenkürzel | Editor, global während Fokus im Dokument | **Muss explizit entschieden und dokumentiert werden** (siehe Abschnitt 3.6) — aktuell nicht vorhanden, obwohl Fett/Kursiv/Unterstrichen jeweils eines haben. Diese Inkonsistenz gilt als zu klärender Punkt, nicht als bereits akzeptierter Zielzustand. |
| 5 | Tooltip/Titel-Attribut | derselbe Button | `title="Durchgestrichen"` vorhanden — muss per Hover und per Screenreader (aria-label) tatsächlich vorgelesen/angezeigt werden. |
| 6 | Kontextmenü/Rechtsklick-Äquivalent | — | Nicht gefordert (kein Rechtsklick-Kontextmenü im Scope), aber falls in Zukunft eingeführt, muss „Durchgestrichen“ dort ebenfalls erscheinen. |

---

## 3. Gewünschtes Verhalten im Detail

### 3.1 Anwenden auf eine bestehende Selektion
- Text markieren (Maus, Doppelklick, Dreifachklick, Umschalt+Pfeil, Strg+A) → Klick auf
  „Durchgestrichen“ → gesamte Selektion wird sichtbar durchgestrichen dargestellt.
- Gilt unabhängig von der Selektionsmethode identisch.
- Gilt auch für eine Selektion, die sich über mehrere Absätze/Listenpunkte/Tabellenzellen
  erstreckt (jede betroffene Textstelle erhält die Mark).

### 3.2 Anwenden an der Schreibmarke ohne Selektion
- Cursor ohne Selektion positionieren → „Durchgestrichen“ aktivieren → **nachfolgend
  getippter Text** wird durchgestrichen dargestellt, bereits vorhandener umgebender Text
  bleibt unverändert (weder davor noch danach).
- Bewegt sich der Cursor (Pfeiltasten, Mausklick) ohne zu tippen, bevor der neue Zustand
  „verbraucht“ wurde, muss der an der Schreibmarke aktivierte, aber noch nicht getippte
  Zustand se sinnvoll zurückgesetzt bzw. an der neuen Position neu bewertet werden
  (Standard-ProseMirror-Verhalten `storedMarks` — muss explizit getestet werden, nicht nur
  angenommen).

### 3.3 Umschalten (Toggle) — Ein und Aus
- Erneuter Klick auf „Durchgestrichen“ bei bereits durchgestrichenem Text entfernt die
  Formatierung wieder vollständig.
- Bei einer Selektion, die **teilweise** durchgestrichen und teilweise normal ist
  (gemischter Zustand): Klick muss ein einheitliches, nachvollziehbares Ergebnis liefern
  (Standardverhalten: „falls irgendein Zeichen in der Selektion bereits durchgestrichen
  ist, entfernt der Klick die Formatierung von der gesamten Selektion; nur wenn **kein**
  Zeichen durchgestrichen ist, wird sie auf die gesamte Selektion angewendet“). Dieses
  Verhalten muss durch einen Test mit gemischter Selektion **explizit** verifiziert werden,
  nicht nur angenommen, weil `toggleMark` aus `prosemirror-commands` verwendet wird.

### 3.4 Kombination mit anderen Formaten
- Durchgestrichen muss gleichzeitig mit Fett, Kursiv, Unterstrichen, Schriftfarbe und
  Hervorhebungsfarbe auf demselben Textlauf bestehen können, ohne dass eine Formatierung
  die andere verdrängt.
- Reihenfolge des Anwendens (z. B. erst Fett dann Durchgestrichen vs. umgekehrt) darf
  keinen Unterschied im Ergebnis machen.

### 3.5 Visuelle Darstellung
- Im Editor: sichtbare horizontale Linie durch die Mitte des Textes (`<s>`-Rendering),
  ohne Verschiebung der Zeilenhöhe oder Überlappung mit ggf. gleichzeitig aktiver
  Unterstreichung.
- Kombination „unterstrichen **und** durchgestrichen“ gleichzeitig: beide Linien müssen
  optisch unterscheidbar bleiben (nicht deckungsgleich/verschmolzen wirken) — expliziter
  Sichtprüfungs-Testfall.

### 3.6 Tastenkürzel (offene Entscheidung)
- **Zu klären und verbindlich festzulegen:** Entweder wird ein Tastenkürzel ergänzt
  (Analogie zu `Mod-b`/`Mod-i`/`Mod-u`, gängiger Kandidat `Mod-Shift-x`, wie in mehreren
  verbreiteten Editoren üblich), oder das Fehlen eines Kürzels wird bewusst als Soll-Zustand
  dokumentiert (Word selbst hat werksseitig ebenfalls keinen globalen Standard-Shortcut
  für Durchgestrichen, nur „Kein Format“ über Font-Dialog). Diese Anforderungsdatei
  fordert **keine** vorgegebene Antwort, sondern verlangt, dass die Entscheidung getroffen,
  umgesetzt und mit einem Test abgesichert wird — der aktuelle Zustand („kommentarlos
  fehlend, keine Notiz dazu“) ist **nicht** akzeptabel.

### 3.7 Entfernen der Formatierung
- Toggle-Aus funktioniert identisch zuverlässig wie Toggle-Ein (siehe 3.3).
- Es gibt aktuell keine globale Funktion „Formatierung löschen“ (Backlog-Slug
  `formatierung-loeschen`, Status „fehlt“) — bis diese existiert, ist der Toolbar-Button
  der **einzige** Weg, Durchgestrichen zu entfernen. Das muss zuverlässig funktionieren,
  auch nachdem das Dokument gespeichert/importiert wurde (nicht nur auf frisch getipptem
  Text derselben Sitzung).

### 3.8 Interaktion mit Listen, Tabellen, Überschriften
- Durchgestrichen muss innerhalb einer Listenzeile, innerhalb einer Tabellenzelle und
  innerhalb einer Überschrift (Ebene 1–6) identisch funktionieren wie in einem normalen
  Absatz — keine Sonderbehandlung, kein stiller Ausschluss.

### 3.9 Undo/Redo
- Anwenden und Entfernen von Durchgestrichen sind jeweils einzelne, undoable Schritte
  (Strg+Z macht genau diesen einen Formatwechsel rückgängig, nicht mehr und nicht
  weniger) — Regressionsgefahr laut `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2
  (Selection-Sync-Bug) ist hier ebenfalls zu berücksichtigen: Toolbar-Aktion auf
  „Alles auswählen“ gefolgt von Klick-Neupositionierung darf keine Dokumentteile
  verschlucken.

---

## 4. Grenzfälle

1. **`w:strike` mit explizitem `w:val="false"`/`w:val="0"` in importierter DOCX-Datei**
   (z. B. aus echtem Word, das eine geerbte Formatvorlage lokal wieder ausschaltet):
   Der aktuelle Reader (`docx/reader.ts:106`) prüft nur die Existenz des Elements, nicht
   den Wert — eine solche Datei würde fälschlich als „durchgestrichen“ importiert.
   **Muss geprüft und ggf. korrigiert werden.**
2. **`style:text-line-through-style="none"` explizit gesetzt** in einer importierten ODT
   (Gegenstück zu Fall 1): laut Code (`odt/reader.ts:56`) korrekt als „nicht
   durchgestrichen“ behandelt (`!== 'none'`-Prüfung) — Testfall zur Bestätigung nötig,
   da dies aktuell nur durch Codelesen, nicht durch einen Test belegt ist.
3. **Doppelt durchgestrichen** (`w:dstrike` in DOCX, `style:text-line-through-type="double"`
   in ODT) — laut Backlog (`durchgestrichen-doppelt`) explizit **nicht** im Funktionsumfang
   dieses Features. Import einer Fremddatei mit doppelter Durchstreichung darf **nicht**
   abstürzen und darf **keinen Textverlust** verursachen; ein Fallback auf „nicht
   durchgestrichen“ oder „einfach durchgestrichen“ ist akzeptabel, muss aber bewusst
   entschieden und dokumentiert sein statt zufälligem Verhalten.
4. **Leere Selektion / leerer Absatz**: Umschalten ohne jegliche Selektion in einem leeren
   Absatz darf nicht zu einem JS-Fehler führen; der Zustand muss beim nächsten Tippen
   sichtbar korrekt angewendet werden.
5. **Selektion über eine Formatierungsgrenze hinweg** (z. B. halb fett, halb durchgestrichen,
   halb beides): Ergebnis nach Toggle muss nachvollziehbar und mit Abschnitt 3.3 konsistent
   sein.
6. **Copy/Paste von extern durchgestrichenem Text** (z. B. aus einer echten Word-Datei
   kopierter Text oder aus einer Webseite mit `<s>`/`<strike>`/`text-decoration:
   line-through`): Die Mark muss beim Einfügen in den Editor erhalten bleiben
   (`parseDOM`-Regeln in `schema.ts` decken das grundsätzlich ab — Testfall zur
   Bestätigung mit echtem Browser-Clipboard nötig, nicht nur synthetisch).
7. **Kombination mit Unterstrichen gleichzeitig** — visuelle Unterscheidbarkeit im Editor
   **und** nach Rundreise-Export/Reimport (siehe 3.5).
8. **Durchgestrichener Text in Kopf-/Fußzeile** — sobald Kopf-/Fußzeile über die UI editierbar
   ist (siehe `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 9, aktuell fehlende UI-Funktion): Format
   muss dort identisch funktionieren; bis dahin gilt dieser Fall als nicht testbar und ist
   entsprechend zu vermerken, nicht stillschweigend auszulassen.
9. **Sehr lange Selektion über viele Seiten** — kein spürbares Einfrieren der UI beim
   Umschalten.
10. **Wiederholtes schnelles Klicken** (Doppel-/Mehrfachklick auf den Button) — darf nicht
    zu inkonsistentem Zwischenzustand führen (z. B. Mark an manchen, nicht an anderen
    Zeichen der Selektion durch Race Condition).
11. **Toolbar-Button-Zustand bei nicht-uniformer Selektion**: `aria-pressed` wird laut Code
    ausschließlich aus `$from.marks()` (Selektionsanfang) berechnet, nicht aus der gesamten
    Selektion. Bei einer Selektion, die vorne durchgestrichen beginnt, aber überwiegend
    normal ist, zeigt der Button ggf. „aktiv“, obwohl ein Klick de facto alles entfernt und
    umgekehrt ein irreführendes Bild vor dem Klick entsteht. **Muss verifiziert und die
    gewünschte Anzeige-Konvention (z. B. Analogie zu Word/LibreOffice) festgelegt werden.**
12. **Track-Changes-Kompatibilität (Zukunftsfall)**: Änderungsverfolgung ist laut
    `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 13 noch nicht begonnen. Sobald sie existiert, darf
    „Durchgestrichen“ als reguläre Formatierung nicht mit der visuellen Lösch-Markierung
    von Track Changes (ebenfalls durchgestrichene Darstellung) verwechselbar sein. Für die
    aktuelle Verifikation reicht die Feststellung, dass diese Abgrenzung dokumentiert
    ist — keine Implementierung nötig.

---

## 5. Rundreise-Anforderung (DOCX **und** ODT — Pflichtbestandteil)

Grundprinzip aus `FEATURE-SPEC-DOCX-ODT.md`: „Datei A hochladen → unverändert exportieren
→ Ergebnis entspricht inhaltlich A.“ Für „Durchgestrichen“ bedeutet das konkret:

1. **DOCX-Rundreise (Upload unverändert):** Eine reale, außerhalb dieser App erzeugte
   DOCX-Datei mit mindestens einer durchgestrichenen Textstelle importieren → **ohne jede
   Bearbeitung** sofort wieder exportieren → erneut importieren → die durchgestrichene
   Textstelle ist inhaltlich (Text **und** Strike-Zustand) identisch zum Ausgangszustand.
2. **ODT-Rundreise (Upload unverändert):** Dasselbe mit einer realen ODT-Datei
   (idealerweise aus echtem LibreOffice Writer erzeugt, nicht nur aus dieser App selbst).
3. **Rundreise nach eigener Bearbeitung (DOCX):** Neues oder importiertes Dokument, im
   Editor Text durchstreichen → als DOCX exportieren → reimportieren → Strike-Zustand und
   exakter Textinhalt bleiben erhalten.
4. **Rundreise nach eigener Bearbeitung (ODT):** Dasselbe für ODT.
5. **Cross-Format-Rundreise DOCX → ODT:** DOCX mit durchgestrichenem Text importieren →
   als ODT exportieren → reimportieren → Strike-Zustand bleibt erhalten.
6. **Cross-Format-Rundreise ODT → DOCX:** Umgekehrt ebenso.
7. **Doppelte Cross-Format-Rundreise:** DOCX → ODT → DOCX an einem Dokument mit
   Durchgestrichen **kombiniert** mit Fett/Kursiv/Farbe → kein kumulativer Verlust der
   Strike-Information über zwei Konvertierungen hinweg.
8. **Validierung gegen unabhängigen Parser:** Der exportierte `<w:strike/>` (DOCX) bzw.
   `style:text-line-through-style="solid"` (ODT) muss zusätzlich gegen eine vom eigenen
   Reader unabhängige Prüfung bestätigt werden (z. B. python-docx / odfpy-Äquivalent oder
   echtes Öffnen in Word/LibreOffice), damit sich Schreib- und Lesefehler nicht gegenseitig
   „unsichtbar“ ausgleichen (siehe `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 19).
9. **Reale Fremddatei mit Grenzfall-Encoding:** Mindestens eine reale DOCX-Datei, die
   `<w:strike w:val="0"/>` (oder gleichwertig „explizit aus“) enthält, importieren →
   Ergebnis muss „nicht durchgestrichen“ sein (siehe Grenzfall 1) — aktuell vermutlich
   ein Fehlerfall, siehe Abschnitt 6.

---

## 6. Bekannte Verdachtsmomente aus der Codeanalyse (Risikoliste für die Verifikation)

Diese Liste benennt konkrete, aus dem Quellcode abgeleitete Verdachtspunkte, die die
QA-Verifikation **gezielt** wiederlegen oder bestätigen muss — sie ersetzt nicht die
vollständige Testabdeckung aus Abschnitt 7, sondern lenkt die Priorität:

1. **DOCX-Import ignoriert `w:val` von `<w:strike>`** (`docx/reader.ts:106`) — potenzieller
   Bug bei echten, außerhalb dieser App erzeugten Dateien, die eine geerbte
   Durchstreichung lokal wieder ausschalten. Bisherige Tests decken das nicht ab, da der
   eigene Writer den Fall nie erzeugt.
2. **Kein E2E-Test über echte Toolbar-Bedienung** — anders als „Fett“ (`tests/e2e/docx.spec.ts`)
   existiert für „Durchgestrichen“ kein Test, der den Button tatsächlich im Browser klickt.
   Bisherige Absicherung ist ausschließlich auf Ebene Writer→eigener-Reader.
3. **Kein Tastenkürzel, keine Dokumentation der Absicht** — Inkonsistenz zu den drei
   Nachbar-Buttons, ungeklärt ob gewollt.
4. **Icon „S“ mit CSS-Durchstreichung auf dem Buchstaben selbst** — laut
   `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 17/20 bereits als generelles Rendering-Risiko für
   die Buchstaben-Icons (F/K/U/S) vermerkt; für „S“ zusätzlich riskant, da die
   CSS-Durchstreichung selbst (nicht nur die Glyphe) bei bestimmten Schriftarten/Browsern
   abweichend gerendert werden könnte.
5. **`aria-pressed`-Berechnung nur aus `$from.marks()`** — siehe Grenzfall 11, keine
   Aussage über den Rest einer mehrteiligen Selektion.
6. **Keine Modellierung von „doppelt durchgestrichen“** — Fremddateien mit `w:dstrike`
   bzw. ODT-Doppellinie werden aktuell vermutlich stillschweigend auf „nicht
   durchgestrichen“ reduziert (da nur `text-line-through-style !== 'none'` geprüft wird,
   dürfte eine doppelte Linie technisch sogar noch als „einfach durchgestrichen“
   durchgehen) — Verhalten muss festgestellt und als bewusster Fallback dokumentiert
   werden.
7. **Unit-Tests testen nur isolierte, einzelne Marks pro Textlauf** — die vorhandenen
   Roundtrip-Tests (`docx/__tests__/roundtrip.test.ts`, `odt/__tests__/roundtrip.test.ts`)
   prüfen Fett/Kursiv/Unterstrichen/Durchgestrichen jeweils an **getrennten** Textläufen,
   nicht die Kombination „durchgestrichen + fett + farbig“ auf demselben Lauf, und nicht
   innerhalb von Tabellenzellen/Listen/Überschriften.

---

## 7. Testfälle (Gesamtübersicht — abzuhaken durch den QA-Agenten)

1. Text markieren (Maus-Ziehen) → „Durchgestrichen“ klicken → sichtbar durchgestrichen.
2. Text markieren (Doppelklick = Wort) → Toggle → korrekt nur das Wort betroffen.
3. Text markieren (Dreifachklick = Absatz) → Toggle → ganzer Absatz betroffen.
4. „Alles auswählen“ (Strg+A) → Toggle → gesamtes Dokument betroffen, inkl. Regressionstest
   gemäß `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2 (danach Klick-Neupositionierung + Enter +
   Tippen → beide entstehenden Absätze bleiben erhalten).
5. Cursor ohne Selektion → Toggle an → tippen → nur neuer Text durchgestrichen, Text davor
   unverändert.
6. Erneuter Klick (Toggle aus) auf bereits durchgestrichenem Text → Formatierung
   verschwindet vollständig.
7. Gemischte Selektion (teils durchgestrichen, teils nicht) → Klick → einheitliches,
   dokumentiertes Ergebnis (siehe 3.3).
8. Kombination mit Fett **und** Kursiv **und** Schriftfarbe auf demselben Textlauf →
   alle vier gleichzeitig sichtbar.
9. Kombination mit Unterstrichen gleichzeitig → beide Linien optisch unterscheidbar.
10. Toolbar-Button zeigt aktiven Zustand korrekt, wenn Cursor in bereits durchgestrichenem
    Text steht (ohne Selektion).
11. Toolbar-Button-Zustand bei einer mehrteiligen, gemischten Selektion → Verhalten wie in
    Abschnitt 6 Punkt 5 festgelegt.
12. Durchstreichen in einer Listenzeile (Bullet und nummeriert) → funktioniert identisch
    zu normalem Absatz.
13. Durchstreichen in einer Tabellenzelle → funktioniert identisch, keine Nebenwirkung auf
    Nachbarzellen.
14. Durchstreichen in einer Überschrift (Ebene 1–6) → funktioniert identisch.
15. Undo (Strg+Z) direkt nach Anwenden von Durchgestrichen → Formatierung verschwindet,
    Text bleibt.
16. Redo (Strg+Y) danach → Formatierung kommt zurück.
17. Copy/Paste von durchgestrichenem Text aus einer externen Quelle (echte Word-Datei oder
    Webseite mit `<s>`/`<strike>`/CSS `line-through`) in den Editor → Mark bleibt erhalten.
18. DOCX-Rundreise: neues Dokument, Text durchstreichen, exportieren, reimportieren →
    Strike-Zustand erhalten.
19. ODT-Rundreise: dasselbe für ODT.
20. Cross-Format-Rundreise DOCX → ODT: Strike-Zustand erhalten.
21. Cross-Format-Rundreise ODT → DOCX: Strike-Zustand erhalten.
22. Doppelte Cross-Format-Rundreise (DOCX→ODT→DOCX) mit Durchgestrichen + Fett + Farbe
    kombiniert → kein Verlust der Strike-Information.
23. Upload einer realen, außerhalb der App erzeugten DOCX-Datei mit durchgestrichenem
    Text (unverändert) → Export → Reimport → Text und Strike-Zustand identisch zum
    Original.
24. Upload einer realen, außerhalb der App erzeugten ODT-Datei mit durchgestrichenem
    Text (unverändert) → Export → Reimport → Text und Strike-Zustand identisch zum
    Original.
25. Upload einer realen DOCX-Datei mit `<w:strike w:val="0"/>` (explizit ausgeschaltete,
    geerbte Durchstreichung) → Import muss Text als **nicht** durchgestrichen zeigen
    (Grenzfall 1 / Verdachtsmoment 1).
26. Upload einer realen ODT-Datei mit `style:text-line-through-style="none"` explizit
    gesetzt → Import muss Text als **nicht** durchgestrichen zeigen (Grenzfall 2).
27. Upload einer Fremddatei mit doppelter Durchstreichung (`w:dstrike` bzw. ODT-Äquivalent)
    → kein Absturz, kein Textverlust, Fallback-Verhalten wie in Abschnitt 6 Punkt 6
    festgestellt und dokumentiert.
28. E2E-Test über echte Browser-Bedienung (Playwright, analog zu `tests/e2e/docx.spec.ts`
    Zeile 68 für „Fett“): Button „Durchgestrichen“ per `page.getByTitle('Durchgestrichen')`
    anklicken, Text eingeben, sichtbar durchgestrichen prüfen — **muss neu ergänzt werden**,
    da aktuell nicht vorhanden.
29. Export nach DOCX validieren gegen einen vom eigenen Reader unabhängigen Parser
    (z. B. python-docx oder OOXML-Schemaprüfung) → `<w:strike/>` korrekt vorhanden.
30. Export nach ODT validieren gegen einen unabhängigen Parser/das ODF-Schema →
    `style:text-line-through-style="solid"` korrekt vorhanden.
31. Icon-Rendering-Test auf einem System ohne besondere Font-Unterstützung: Buchstabe „S“
    (durchgestrichen dargestellt) bleibt von „F“/„K“/„U“ eindeutig unterscheidbar.
32. Tastenkürzel-Test: entweder das neu festgelegte Kürzel funktioniert zuverlässig, oder
    das bewusste Fehlen ist dokumentiert und durch einen Test/Kommentar im Code
    nachvollziehbar gemacht (siehe 3.6) — „stillschweigend fehlend“ gilt nicht als
    erfüllt.
33. Performance/Stabilität: sehr lange Selektion (mehrere Seiten Text) durchstreichen →
    UI bleibt reaktionsfähig, kein spürbares Einfrieren.
34. Schnelles Mehrfachklicken auf den Button innerhalb kurzer Zeit → kein inkonsistenter
    Zwischenzustand in der Selektion.

---

## 8. Abnahmekriterien (Definition of Done)

Das Feature „Durchgestrichen“ gilt erst dann wieder als „vorhanden“ im Sinne von
vertrauenswürdig, wenn:

1. Alle Testfälle aus Abschnitt 7 tatsächlich ausgeführt wurden (nicht nur die bereits
   vorhandenen Writer→eigener-Reader-Unit-Tests) und deren Ergebnis dokumentiert ist.
2. Jedes Verdachtsmoment aus Abschnitt 6 explizit als „bestätigt und behoben“,
   „bestätigt und bewusst als Grenzfall dokumentiert“ oder „widerlegt“ eingestuft wurde —
   keines bleibt unkommentiert offen.
3. Mindestens ein E2E-Test über echte Browser-Bedienung (Playwright) für den
   „Durchgestrichen“-Button dauerhaft in der Testsuite verankert ist (Testfall 28).
4. Die Rundreise-Anforderung aus Abschnitt 5 für DOCX **und** ODT, inklusive Cross-Format
   und inklusive mindestens einer realen (nicht app-eigenen) Testdatei je Format,
   nachweislich erfüllt ist.
5. Die offene Entscheidung zum Tastenkürzel (Abschnitt 3.6) getroffen und umgesetzt oder
   ausdrücklich begründet zurückgestellt wurde.
