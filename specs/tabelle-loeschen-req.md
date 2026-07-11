# Anforderungsspezifikation: Feature „Tabelle löschen"

Status: Entwurf zur Freigabe — bitte prüfen, bevor daran weitergearbeitet oder das
Feature als „fertig" abgehakt wird.

Herkunft/Einordnung: Dieses Dokument konkretisiert Abschnitt 6 („Tabellen", Stichpunkt
„Tabelle komplett löschen.", `FEATURE-SPEC-DOCX-ODT.md` Zeile 157) sowie Abschnitt 17,
Zeile 373 („Tabellen-Kontextfunktionen … fehlt komplett in der UI … größte Einzellücke im
gesamten Funktionsumfang") für den Teilaspekt „Tabelle komplett löschen" und ersetzt für
dieses Teilfeature den kurzen Stichpunkt durch eine vollständige Anforderung inkl.
Grenzfällen und Rundreise-Pflicht. Es gilt weiterhin: gemeinsamer interner Editor
(ProseMirror-Schema + Seitenansicht, `src/formats/shared/editor/*`,
`src/formats/shared/schema.ts`) für DOCX und ODT — jede Anforderung unten muss für
**beide** Formate gelten, sowohl beim Import einer bestehenden Datei als auch beim Export
einer im Editor erstellten/bearbeiteten Datei, inklusive Rundreise (Datei A hochladen →
unverändert exportieren → Ergebnis entspricht inhaltlich A). Nur Import/Export
(`src/formats/docx/reader.ts`+`writer.ts`, `src/formats/odt/reader.ts`+`writer.ts`) sind
formatspezifisch; das Löschen selbst ist eine reine Editor-Operation und darf sich
zwischen den Formaten nicht unterscheiden.

Backlog-Bezug (`specs/FEATURE-BACKLOG.md`, Zeile 189):

| Slug | Titel | Beschreibung (wörtlich) | Status laut Backlog | Priorität |
|---|---|---|---|---|
| `tabelle-loeschen` | Tabelle löschen | „Entfernt die komplette Tabelle inklusive Inhalt." | **fehlt** | 1 (essenziell) |

Der Backlog-Status „fehlt" gilt laut Auftrag als **nicht vertrauenswürdig** und muss
vollständig verifiziert werden. „Nicht vertrauenswürdig" gilt in beide Richtungen: Es darf
weder unterstellt werden, dass „fehlt" automatisch korrekt ist (theoretisch könnte ein
versteckter Weg existieren), noch darf ein späteres „vorhanden" ohne Einzelnachweis jedes
Punkts dieser Datei angenommen werden. Dieses Dokument beschreibt sowohl den Soll-Zustand
als auch (Abschnitt 5) durch Code-Sichtung auffindbare, konkrete Verdachtsmomente, die die
Prüfung gezielt bestätigen oder widerlegen muss. Nach erster Code-Sichtung ist der Status
„fehlt" mit hoher Sicherheit **zutreffend**: Es existiert weder ein Toolbar-Button noch ein
Befehl (`Command`) noch eine Tastenkombination, um eine komplette Tabelle samt Inhalt zu
entfernen (Details Abschnitt 5). Für dieses Feature ist „Verifikation" daher zu großen
Teilen zugleich eine **Bau-Aufgabe** — anders als bei Features, bei denen eine vorhandene,
nur unsicher wirkende Funktion bestätigt/widerlegt wird.

**Abgrenzung:** Diese Spezifikation behandelt ausschließlich das **vollständige** Entfernen
einer Tabelle inklusive ihres gesamten Inhalts (Slug `tabelle-loeschen`). Die verwandten,
aber eigenständigen Backlog-Einträge `zeile-loeschen` (Backlog Zeile 184), `spalte-loeschen`
(Zeile 186), `spalte-einfuegen`, `zeile-einfuegen`, `zellen-verbinden`/`zellen-teilen` sind
**nicht** Gegenstand dieses Dokuments und haben eigene Anforderungsdateien. Sie teilen sich
mit diesem Feature dieselbe Grundbeobachtung (keine UI, keine verdrahteten Commands) und
werden hier nur dort erwähnt, wo eine Abgrenzung zur Klarheit nötig ist (siehe Abschnitt
2.7). „Tabelle löschen" muss **unabhängig** davon funktionieren, ob diese Nachbarfunktionen
bereits existieren.

---

## 1. Menüpunkte / Bedienelemente

| # | Element | Ort | Aktuell laut Code | Soll |
|---|---|---|---|---|
| 1 | Button/Menüpunkt „Tabelle löschen" | Toolbar, Gruppe „Tabelle" (neben dem bestehenden Button „⊞ Tabelle" zum Einfügen, `Toolbar.tsx:277-289`) | **existiert nicht.** `Toolbar.tsx` enthält im Tabellenbereich ausschließlich den Einfüge-Button (`insertTable(2, 2)`); kein zweiter Button für Löschen ist vorhanden | Muss neu gebaut werden: aktiv, sobald der Cursor sich irgendwo innerhalb einer Tabelle befindet **oder** die ganze Tabelle als Objekt markiert ist (siehe Abschnitt 2.3); deaktiviert/ausgeblendet außerhalb einer Tabelle. Der bereits vorhandene Helper `isInTable(view.state)` (heute nur als `aria-pressed`-Anzeige am Einfüge-Button, `Toolbar.tsx:281`) reicht als Aktivierungsbedingung **allein nicht** aus (siehe Abschnitt 2.3). |
| 2 | Kontextmenü (Rechtsklick) mit Eintrag „Tabelle löschen" | Tabellenbereich | **existiert nicht.** Die projektweite Suche nach `contextmenu`/`onContextMenu` liefert genau **einen** Treffer: einen erklärenden Kommentar in `WordEditor.tsx:117-121`, der die bewusste Entscheidung dokumentiert, **keinen** eigenen `contextmenu`-Listener zu registrieren, damit das native Browser-Kontextmenü (u. a. dessen „Ausschneiden"-Eintrag) erreichbar bleibt. Ein benutzerdefiniertes In-App-Kontextmenü existiert also für keine Funktion. | Nice-to-have zusätzlich zum Toolbar-Button. Der Toolbar-Button ist die verbindliche Mindestanforderung; ein Kontextmenü ist optional. **Cross-Feature-Hinweis:** Ob ein Kontextmenü-System eingeführt wird, ist eine gemeinsame Entscheidung für **alle** Tabellen-Kontextfunktionen (`zeile-loeschen`, `spalte-loeschen`, `spalte-einfuegen`, `zellen-verbinden` …) und darf nicht pro Einzelfeature unterschiedlich getroffen werden. |
| 3 | Tastaturweg | Editor-Keymap (`WordEditor.tsx:85-107`) | **existiert nicht.** Das Keymap bindet aktuell `Mod-z/y`, `Mod-Shift-z`, `Enter` (Listen-Splitting), `Shift-Enter` (Zeilenumbruch), `Mod-b/i/u`, `Shift-Delete` (Ausschneiden) plus `baseKeymap`; kein Eintrag behandelt eine Tabelle als lösch-/selektierbares Objekt | Referenzverhalten (Word/LibreOffice) kennt **keine** durchgängig übliche direkte Tastenkombination für „Tabelle löschen" (anders als z. B. Strg+X). Ein Tastaturweg ist daher **optional/Nice-to-have**, nicht Pflicht. Wird einer gebaut, muss er (a) **exakt dasselbe** Ergebnis liefern wie der Toolbar-Button (Abschnitt 2.2), (b) eine bislang unbelegte Kombination verwenden (belegt sind bereits `Mod-z/y`, `Mod-Shift-z`, `Enter`, `Shift-Enter`, `Mod-b/i/u`, `Shift-Delete` sowie alle `baseKeymap`-Defaults) und (c) hier dokumentiert werden. Die Abwesenheit einer Pflicht-Tastenkombination ist **explizit** zu dokumentieren, damit sie nicht als vergessene Lücke missverstanden wird (analog `zeile-loeschen-req.md` Abschnitt 1, Zeile 3). |
| 4 | Bestätigungsdialog vor dem Löschen | — | nicht vorhanden (Feature existiert nicht) | **Entscheidung: kein blockierender Bestätigungsdialog.** Word fragt bei „Tabelle löschen" teils nach, LibreOffice und die bereits etablierten destruktiven Aktionen dieser App (z. B. „Bild löschen" per Entf, ohne Rückfrage) tun es nicht. Verbindlich für dieses Feature: **kein** Dialog, stattdessen zuverlässiges Undo (Abschnitt 2.5) als alleiniges Sicherheitsnetz — ein Zusatzdialog widerspräche dem in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20 geforderten reibungsarmen Verhalten und wäre inkonsistent zu „Bild löschen". |
| 5 | Symbol/Icon des neuen Buttons | Toolbar | — | Nach `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20, Punkt 1: **kein** Emoji/Unicode-Glyphe mit Rendering-Risiko, sondern eindeutiges Inline-SVG-Icon (`currentColor`, `aria-hidden`), optisch klar unterscheidbar von „Zeile löschen"/„Spalte löschen". Der zugängliche Name kommt aus `aria-label="Tabelle löschen"`, nicht aus dem Icon. |
| 6 | Sichtbarer/aktiver Zustand außerhalb einer Tabelle | Toolbar | — | Button ist deaktiviert **oder** ausgeblendet, wenn kein Löschziel vorliegt (Abschnitt 2.3) — kein Klick, der wirkungslos bleibt (Grundsatz „kein stiller Fehlschlag", `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20, Punkt 4). **Cross-Feature-Hinweis:** deaktiviert-vs-ausgeblendet muss für **alle** Tabellen-Kontextfunktionen einheitlich gehandhabt werden, nicht gemischt. |
| 7 | Touch-Bedienbarkeit | Toolbar auf Touch-Geräten | — | Auf den in `playwright.config.ts` konfigurierten Projekten „Mobile" (Pixel 7) und „Tablet" (iPad Mini) muss der Button erreichbar und auslösbar sein (siehe Abschnitt 2.8). |

---

## 2. Gewünschtes Verhalten im Detail

### 2.1 Grundverhalten: Ein Klick entfernt die gesamte Tabelle
- Cursor irgendwo innerhalb einer Tabelle (in einer beliebigen Zelle, unabhängig von
  Zeilen-/Spaltenposition) → Klick auf „Tabelle löschen" entfernt den **kompletten**
  Tabellenknoten samt **allen** Zeilen, Zellen und deren Inhalt (Text, Formatierung,
  Bilder, verschachtelte Listen, verschachtelte Tabellen) aus dem Dokument.
- Es genügt ein einzelner Klick; keine vorherige manuelle Selektion des gesamten
  Tabelleninhalts durch die Nutzerin ist erforderlich (im Unterschied zu „Zeile löschen"/
  „Spalte löschen", die sich auf die konkrete Cursor-/Selektionsposition beziehen — hier
  genügt **irgendeine** Cursor-Position innerhalb der Tabelle).
- Auch eine über mehrere Zellen aufgezogene `CellSelection` (Maus-Drag) ist ein gültiger
  Ausgangszustand und führt zum selben Ergebnis: die **ganze** Tabelle wird entfernt, nicht
  nur die markierten Zellen.
- Text/Inhalt **vor** und **nach** der Tabelle im Dokument bleibt vollständig und
  unverändert erhalten (kein Nebenwirkungs-Datenverlust im umgebenden Fließtext — direkte
  Analogie zu `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 7: „Bild löschen … ohne Nebenwirkungen
  auf umgebenden Text").

### 2.2 Abgrenzung zu reinem Inhalt-Löschen (Entf/Backspace auf Zellinhalt)
- Markieren von Text **innerhalb** einer oder mehrerer Zellen und Drücken von
  Entf/Backspace darf **nur** den markierten Zellinhalt leeren, **niemals** implizit die
  Tabellenstruktur (Zeilen/Spalten/Zellen selbst) auflösen — das entspricht dem Verhalten
  von Word/LibreOffice, wo das Entfernen sämtlichen Zellinhalts eine leere, aber weiterhin
  vorhandene Tabelle hinterlässt.
- Diese Abgrenzung ist bereits durch zwei aktive Mechanismen erwartbar, die im Test **als
  weiterhin gültig zu bestätigen** sind (nicht neu zu bauen): (a) das bereits registrierte
  `tableEditing()`-Plugin (`WordEditor.tsx:110`) bindet Backspace/Delete bei einer
  `CellSelection` auf reines Inhalt-Leeren; (b) `table_cell`/`table_header` sind im Schema
  `isolating`, sodass ein einfacher Cursor am Zellrand nicht über die Zellgrenze hinweg
  verschmilzt. Ein Regressionstest muss genau diese Verwechslungsgefahr absichern.
- Das vollständige Entfernen der Tabellenstruktur ist **ausschließlich** über die explizite
  Aktion „Tabelle löschen" (Abschnitt 1) möglich, nicht als Nebeneffekt wiederholten
  Löschens von Zellinhalten.

### 2.3 Ganze Tabelle als ein Objekt markiert (NodeSelection) — Pflichtfall, kein stiller Fehlschlag
- Zusätzlich zum „Cursor in einer Zelle"-Fall muss der Zustand behandelt werden, in dem die
  **gesamte Tabelle als ein einzelnes Objekt** markiert ist (ProseMirror-`NodeSelection` auf
  dem `table`-Knoten). Dieser Zustand ist **kein theoretischer Randfall**: Steht der Cursor
  am Anfang eines Absatzes unmittelbar **nach** einer Tabelle, erzeugt das browsereigene
  Standard-Backspace-Verhalten (`baseKeymap`, `WordEditor.tsx:108`) bereits heute genau diese
  Ganz-Tabelle-Markierung als Zwischenschritt.
- Anforderung — beide Punkte sind Pflicht:
  1. Der Löschen-Button muss in diesem Zustand **aktiv** (nicht deaktiviert) sein, und ein
     Klick muss die Tabelle vollständig entfernen. Eine Aktivierungsbedingung, die nur
     `isInTable(...)` prüft, greift hier **nicht** (bei einer `NodeSelection` auf der Tabelle
     liegt der Selektionsanker vor der Tabelle, nicht in einer Zelle) — die
     Aktivierungslogik muss diesen Selektionstyp zusätzlich berücksichtigen.
  2. Das Auslösen des Löschens in diesem Zustand darf **kein** stiller No-Op sein. (Die
     fertige `deleteTable`-Funktion aus `prosemirror-tables` reagiert auf eine reine
     `NodeSelection` auf der Tabelle **nicht** und würde ohne zusätzliche Behandlung
     wirkungslos zurückkehren — genau der in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20, Punkt
     4 verbotene stille Fehlschlag. Dies ist beim Bau explizit abzufangen; siehe Abschnitt 5,
     Punkt 11.)
- Falls ein zusätzlicher Weg vorgesehen wird, die Tabelle als Objekt zu markieren (z. B.
  Rahmen-Anfasser), muss dieser **dasselbe** Ergebnis liefern wie der Toolbar-Button — beide
  Wege müssen zum vollständigen Entfernen führen, nicht zu unterschiedlichem Verhalten
  („nur Inhalt leeren" vs. „Struktur entfernen").

### 2.4 Cursor-/Fokus-Verhalten nach dem Löschen
- Nach dem Löschen muss der Cursor an einer sinnvollen, deterministischen Stelle landen
  (üblicherweise: Anfang des Absatzes, der unmittelbar auf die Tabelle folgte, bzw. Ende des
  Absatzes davor, falls kein Nachfolge-Absatz existiert), und der Editor muss sofort ohne
  weiteren Klick weiter bedienbar sein (Tippen funktioniert direkt) — konsistent mit
  `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 1.3 („kein Reset, kein Verlust des Fokus").
- **Tabelle ist der einzige Inhalt des Dokuments:** Da das Schema für `doc` mindestens einen
  Block verlangt (`content: 'block+'`, `schema.ts:14`), muss das Löschen der letzten/einzigen
  Tabelle einen leeren Standard-Absatz an ihrer Stelle hinterlassen, damit ein gültiges,
  weiterhin editierbares Dokument bestehen bleibt — kein leerer/ungültiger Dokumentzustand,
  kein Absturz, kein leeres Wurzelelement.
- **Tabelle am Dokumentanfang bzw. -ende** mit vorhandenem umgebendem Inhalt → die
  Cursor-Zielregel muss auch hier greifen, ohne dass Inhalt davor/danach verloren geht oder
  doppelt erscheint. Insbesondere darf ein etwaiger `gapCursor` (ProseMirror-Randfall an
  Tabellen-/Block-Grenzen) nicht in einen inkonsistenten Zustand geraten.

### 2.5 Undo/Redo
- Strg+Z unmittelbar nach dem Löschen stellt die Tabelle **exakt** wieder her: gleiche
  Anzahl Zeilen/Spalten, gleiche verbundene Zellen (colspan/rowspan), derselbe Zellinhalt
  inklusive Formatierung (fett/kursiv/Farbe/Ausrichtung), mehrerer Absätze pro Zelle sowie
  enthaltener Bilder/Listen — nicht nur der sichtbare Text. Auch die Selektion/Cursor-Position
  wird sinnvoll wiederhergestellt.
- Das Löschen erzeugt **einen** Undo-Schritt.
- Strg+Y/Strg+Umschalt+Z (Redo) direkt danach entfernt die Tabelle erneut vollständig.
- Undo/Redo des Löschvorgangs muss sich korrekt in eine gemischte Sequenz aus Tippen und
  anderen Toolbar-Aktionen einfügen (kein Sonderfall, der die History-Kette bricht) und darf
  sich **nicht** mit einer unmittelbar vorausgehenden, unabhängigen Aktion verschmelzen.
  Siehe auch den Selection-Sync-Bug aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2: Tabellen
  gelten dort explizit als „Hauptverdachtsfall"; das Löschen einer Tabelle unmittelbar nach
  einem Klick zur Neupositionierung ist daher ein Pflicht-Testszenario (Abschnitt 3,
  Grenzfall 9).

### 2.6 Verschachtelte Tabellen
- Cursor in einer **inneren** (verschachtelten) Tabelle, die innerhalb einer Zelle einer
  äußeren Tabelle liegt → „Tabelle löschen" entfernt **nur** die innere Tabelle; die äußere
  Tabelle und deren übrige Zellen bleiben vollständig erhalten (die betroffene Zelle behält
  idealerweise einen leeren Absatz an Stelle der inneren Tabelle).
- Cursor in einer Zelle der **äußeren** Tabelle (außerhalb der verschachtelten Tabelle) →
  „Tabelle löschen" entfernt die äußere Tabelle samt allem, was sie enthält, **einschließlich**
  jeder darin verschachtelten Tabelle (erwartetes, dokumentiertes Verhalten — kein separater
  Rettungsmechanismus für verschachtelte Inhalte, aber auch kein Absturz).
- Welche der beiden Ebenen als Ziel „zählt", hängt eindeutig von der genauen Cursor-Position
  ab; diese Regel muss vor Abnahme ausdrücklich festgelegt und je Richtung mit einem Test
  belegt werden.

### 2.7 Zusammenspiel mit anderen Features (und Abgrenzung)
- Zeile/Spalte löschen (`zeile-loeschen` / `spalte-loeschen`) sind **keine** Vorstufe oder
  Sonderfall dieses Features — „Tabelle löschen" muss unabhängig davon funktionieren, ob
  Zeilen-/Spalten-Bearbeitung existiert.
- Löschen einer Tabelle mit **verbundenen Zellen** (colspan/rowspan) → keine
  Sonderbehandlung nötig, die gesamte Struktur inklusive Verbindungen verschwindet
  vollständig.
- Löschen einer Tabelle mit einem **Bild** in einer Zelle → Bild verschwindet mit; nach
  Export darf die Datei **keine verwaisten Bild-Einträge** enthalten (ungenutzte Dateien in
  `word/media/` bzw. `Pictures/` im ODT-Zip, verwaiste Relationship-Einträge) — Analogie zu
  `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 7: „keine verwaisten Bilddateien im Zip".
- Löschen einer Tabelle mit einer **Liste** in einer Zelle → Liste verschwindet mit, keine
  losgelöste Listendefinition ohne Inhalt im exportierten Dokument.
- Cursor-/Selektionszustand nach dem Löschen darf keine „tote" Referenz auf die nicht mehr
  existierende Tabelle behalten; der Button-Zustand muss sich sofort aktualisieren (siehe
  Abschnitt 1, Punkt 6), ein Folge-Klick darf keinen Fehler/Crash auslösen.

### 2.8 Mobile/Touch
- Auf den in `playwright.config.ts` konfigurierten Projekten „Mobile" (Pixel 7) und
  „Tablet" (iPad Mini) muss mindestens ein funktionierender Weg existieren, eine Tabelle
  auszuwählen (Antippen einer Zelle genügt) und über den Toolbar-Button zu löschen. Der
  Button muss auf Touch-Viewports erreichbar (nicht abgeschnitten/verdeckt) und auslösbar
  sein.
- Das Kernverhalten (Grundverhalten 2.1, Sonderfall „einzige Tabelle" 2.4, Selection-Sync-
  Regression 2.5) muss auf allen drei Projekten (Desktop Chrome, Mobile, Tablet) nachweisbar
  sein — konsistent mit der Mobile/Touch-Anforderung der Nachbar-Features `zeile-loeschen`
  und `spalte-loeschen`.

### 2.9 Kein stiller Fehlschlag
- Jeder Versuch, „Tabelle löschen" ohne gültiges Löschziel auszulösen, muss entweder gar
  nicht erst möglich sein (Button deaktiviert/ausgeblendet) oder sichtbar zurückgemeldet
  werden — es darf **keinen** Klick geben, der scheinbar etwas tut, aber nichts verändert,
  ohne dass das erkennbar ist (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20, Punkt 4). Der in
  Abschnitt 2.3 beschriebene NodeSelection-Fall ist die wichtigste konkrete Fehlerquelle für
  einen solchen stillen No-Op.
- Schlägt das Löschen aus einem unerwarteten Grund fehl (z. B. inkonsistenter
  Tabellenzustand nach Import einer exotischen Fremddatei), darf **kein** Teil-Löschen
  entstehen (nur manche Zeilen/Zellen entfernt, Tabelle danach invalide) — entweder
  vollständiger Erfolg oder unveränderter Ausgangszustand plus sichtbarer Hinweis.

### 2.10 Track-Changes-Abhängigkeit (zukünftig, Phase 3 — aktuell nicht im Scope)
- Sobald Änderungsverfolgung existiert (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 13, dort als
  Grenzfall „Änderung, die eine Tabellen- oder Listenstruktur betrifft" ausdrücklich
  genannt), muss „Tabelle löschen" bei aktiver Aufzeichnung als nachverfolgbare Löschung
  markiert werden, statt die Tabelle sofort endgültig zu entfernen. Für den **aktuellen**
  Verifikationsauftrag ist das **nicht** im Scope, hier nur als bekannte künftige
  Abhängigkeit dokumentiert (konsistent mit `zeile-loeschen-req.md` Grenzfall 20 und
  `spalte-loeschen-req.md` Grenzfall 20 — in `zeile-loeschen-req.md` ist Grenzfall 19
  tatsächlich „Schnelles Mehrfach-Auslösen", nicht Track-Changes; verifiziert gegen den
  tatsächlichen Inhalt beider Dateien, nicht nur der Nummerierungs-Konvention angenommen).

---

## 3. Grenzfälle

1. **Einzige Tabelle, einziges Dokumentelement:** Neues leeres Dokument, sofort eine Tabelle
   einfügen, sofort wieder löschen, ohne je Text einzugeben → Dokument bleibt gültig
   (mindestens ein leerer Standard-Absatz gemäß `block+`), kein Crash, kein leeres/ungültiges
   Wurzelelement.
2. **Tabelle mit 1×1** (kleinstmögliche Tabelle) → Löschen funktioniert identisch zu
   größeren Tabellen.
3. **Sehr große Tabelle** (> 10 Spalten, > 20 Zeilen, reale Fixtures
   `tests/fixtures/external/odt/BigTable.odt`, `crazyTable.odt`) → Löschen bleibt performant
   (kein spürbares Einfrieren), Undo stellt die komplette große Struktur korrekt wieder her.
4. **Tabelle am Dokumentanfang** (erster Block ist die Tabelle, kein Absatz davor) → nach dem
   Löschen ist der neue erste Block ein normaler, editierbarer Absatz; Cursor landet dort,
   kein Verlust danach folgenden Inhalts.
5. **Tabelle am Dokumentende** (letzter Block, kein Absatz danach) → analog zu 4, Cursor
   landet im Absatz davor bzw. in einem neu eingefügten leeren Absatz; `gapCursor` bleibt
   konsistent (Abschnitt 2.4).
6. **Zwei aufeinanderfolgende Tabellen ohne trennenden Absatz** → Löschen der einen darf die
   andere nicht mit entfernen oder mit ihr verschmelzen; nur die Tabelle, in der der Cursor
   stand, verschwindet.
7. **Verschachtelte Tabelle** (reale Fixtures `subTables.odt`, `subTables2.odt`,
   `subTables3-nested.odt`, `subTables3-onlyOneColumn.odt`, `subTables4.odt`,
   `table-within-textBox-within-frame.odt`) → siehe Abschnitt 2.6, beide Richtungen (innere
   vs. äußere Tabelle löschen) einzeln testen.
8. **Tabelle mit bereits zuvor gelöschten/gemergten Spalten** (reale Fixtures
   `table-column-delete-with-merge.odt`, `table-column-delete-with-merge-2-times.odt`,
   `tableCoveredContent.odt`, `tableOps.odt`, `tableRowDeletionTest.odt` — „unordentliche",
   aus Fremdanwendungen stammende Spalten-/Merge-Strukturen) → nach Import muss auch eine
   solche Tabelle vollständig und ohne Absturz löschbar sein, trotz ungewöhnlicher
   `colspan`/`colwidth`-Werte bzw. `covered-table-cell`-Platzhalter.
9. **Regressionsmuster des Selection-Sync-Bugs:** Text in einer Tabellenzelle eingeben → per
   Klick den Cursor in eine andere Zelle neu positionieren → sofort „Tabelle löschen"
   auslösen → Tabelle muss vollständig und korrekt entfernt werden, ohne dass eine stale
   Selektion aus dem vorherigen Zellwechsel zu einem falschen Lösch-Ziel oder Crash führt.
   Pflicht-Testfall, da Tabellen laut Hauptspezifikation der „Hauptverdachtsfall" sind.
10. **Löschen unmittelbar nach dem Einfügen** (Tabelle einfügen, kein Klick dazwischen,
    sofort löschen) → funktioniert ebenso zuverlässig wie das Löschen einer bereits länger
    bestehenden, bearbeiteten Tabelle.
11. **Mehrfaches Undo/Redo hintereinander** (löschen → Undo → Redo → Undo → …) → Tabelle
    bleibt bei jedem Undo-Schritt strukturell bit-genau identisch zum Zustand vor dem
    jeweiligen Löschen, kein schleichender Strukturverlust über mehrere Zyklen.
12. **Tabelle mit Zellinhalt aus mehreren Absätzen und gemischter Formatierung** (fett,
    kursiv, unterschiedliche Ausrichtung je Absatz in derselben Zelle) → beim Löschen
    verschwindet alles, beim Undo kommt alles inklusive jeder Formatierungsdetails zurück.
13. **Klick bei Cursor außerhalb jeder Tabelle** (z. B. Cursor in einem Bild/Absatz direkt
    vor der Tabelle, Cursor stand nie in der Tabelle und die Tabelle ist nicht als Objekt
    markiert) → Button ist deaktiviert (Abschnitt 1, Punkt 6); ein etwaiger Klick darf
    **nicht** versehentlich die nächstgelegene Tabelle im Dokument löschen.
14. **Ganze Tabelle als NodeSelection markiert** (z. B. Cursor am Anfang des Absatzes direkt
    nach der Tabelle, ein Backspace erzeugt die Ganz-Tabelle-Markierung — siehe Abschnitt
    2.3) → Button ist **aktiv**, Klick entfernt die Tabelle vollständig, **kein** stiller
    No-Op. Pflicht-Testfall.
15. **Tabelle mit Bild in einer Zelle löschen, danach exportieren** → exportierte Datei
    enthält keine verwaisten Bilddateien/Relationship-Einträge (Abschnitt 2.7); ZIP-Struktur
    bleibt insgesamt valide (kein kaputtes Archiv durch fehlerhafte Aufräumlogik).
16. **Rundreise mit zwischenzeitlichem Format-Wechsel:** DOCX-Datei mit Tabelle importieren,
    Tabelle löschen, als ODT exportieren (Cross-Format), diese ODT-Datei reimportieren →
    Tabelle bleibt in allen Schritten korrekt abwesend, umgebender Text bleibt über den
    Formatwechsel hinweg vollständig erhalten.
17. **Reale komplexe Fremddatei mit Tabelle importieren, unverändert exportieren (ohne
    Löschen), erneut importieren, danach erst löschen** → stellt sicher, dass das allgemeine
    Rundreise-Verhalten (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6, Testfall 9) nicht durch das
    bloße Vorhandensein der neuen Löschfunktion beeinträchtigt wird, bevor sie ausgelöst wird
    (Regressionsschutz für die bestehende Tabellen-Rundreise).
18. **Mobile/Touch** (Projekte „Mobile"/Pixel 7 und „Tablet"/iPad Mini, siehe Abschnitt 2.8):
    Tabelle auf beiden Projekten antippen und über den Toolbar-Button löschen — mindestens
    das Grundverhalten muss auf beiden nachweisbar sein.

---

## 4. Rundreise-Anforderung (Pflicht für DOCX **und** ODT)

Für jede folgende Kombination gilt: **Datei/Zustand A → Tabelle löschen → unverändert (ohne
weitere Bearbeitung) exportieren → Ergebnis erneut importieren → Tabelle ist nicht mehr
vorhanden, aller übriger Inhalt entspricht A minus Tabelle.** Zusätzlich gilt die allgemeine
Rundreise-Grundregel unverändert für den **umgebenden**, nicht gelöschten Inhalt: „Datei A
hochladen → unverändert exportieren → Ergebnis entspricht inhaltlich A" — das Löschen darf
also ausschließlich die Tabelle selbst betreffen, nichts sonst im Dokument verändern.

### 4.1 Im Editor selbst erzeugte/gelöschte Tabellen
1. Einfache Tabelle (2×2, mit einem Absatz davor und danach) einfügen, sofort löschen → als
   DOCX exportieren → reimportieren → nur die beiden umgebenden Absätze vorhanden, keine
   Tabellenreste im XML.
2. Dasselbe als ODT.
3. Tabelle mit Inhalt (Text, Formatierung, Bild, verschachtelter Liste) befüllen, dann
   löschen → DOCX-Rundreise: weder Tabellen- noch Zellinhalt taucht im reimportierten
   Dokument wieder auf, umgebender Text unverändert.
4. Dasselbe als ODT-Rundreise.
5. Zwei Tabellen im Dokument, nur eine löschen → Rundreise DOCX und ODT: die verbleibende
   Tabelle bleibt vollständig und unverändert erhalten, nur die gelöschte fehlt.
6. Verschachtelte Tabelle: äußere Tabelle löschen (mit innerer Tabelle darin) → Rundreise
   DOCX und ODT: komplette Struktur (äußere und innere Tabelle) fehlt, umgebender Inhalt
   bleibt.
7. Verschachtelte Tabelle: nur die innere Tabelle löschen → Rundreise DOCX und ODT: äußere
   Tabelle bleibt mit ihren übrigen (nicht-verschachtelten) Zellen vollständig erhalten, nur
   der Inhalt der einen betroffenen Zelle verliert die innere Tabelle (idealerweise ersetzt
   durch einen leeren Absatz in dieser Zelle).
8. Cross-Format doppelte Rundreise: im Editor erzeugte, dann gelöschte Tabelle als ODT
   exportieren → reimportieren → als DOCX exportieren → reimportieren → Tabelle bleibt über
   beide Konvertierungen korrekt abwesend, keine „Wiederauferstehung" durch einen
   Konvertierungsfehler.

### 4.2 Import realer Fremddateien, danach Löschen
Diese im Repository vorhandenen Testfixtures (`tests/fixtures/external/docx/` bzw.
`.../odt/`) müssen für die Verifikation verwendet werden (nicht nur selbst konstruierte
Minimalbeispiele) — jeweils: importieren, die enthaltene Tabelle über die **tatsächliche
Toolbar-Aktion** löschen, exportieren, reimportieren, prüfen, dass die Tabelle fehlt und
aller übrige Inhalt erhalten blieb:

- `odt/BigTable.odt`, `crazyTable.odt` — große/komplexe Tabellen, siehe Grenzfall 3.
- `odt/subTables.odt`, `subTables2.odt`, `subTables3-nested.odt`, `subTables3-onlyOneColumn.odt`,
  `subTables4.odt`, `table-within-textBox-within-frame.odt` — verschachtelte Tabellen, siehe
  Abschnitt 2.6 und Grenzfall 7.
- `odt/table-column-delete-with-merge.odt`, `table-column-delete-with-merge-2-times.odt`,
  `tableCoveredContent.odt`, `tableOps.odt`, `tableRowDeletionTest.odt` — ungewöhnliche
  Merge-/Spalten-/`covered-table-cell`-Strukturen, siehe Grenzfall 8.
- `odt/OOStyledTable.odt`, `coloredTable_MSO15.odt`, `TableFunkyBackground.odt`,
  `feature_attributes_tables.odt`, `feature_attributes_tables_SMALL.odt`,
  `table_1x3_paragraph_background-MSO2013-LO3_6.odt` — Tabellen mit Rahmen-/Hintergrund-/
  Stilformatierung; nach dem Löschen darf keine dieser Stildefinitionen als Geisterrest im
  exportierten Dokument zurückbleiben.
- `odt/TableWidth.odt`, `tableNotFullWidth.odt` — Tabellen mit expliziten Breitenangaben.
- `odt/simple-table.odt`, `simpleTable.odt`, `simple_table.odt`, `simple-table-with-lists.odt`,
  `listsInTable.odt`, `table.odt`, `table_simple.odt`, `TestTextTable.odt`,
  `doc_heading_table.odt`, `empty4table.odt` — Basisabdeckung, jede Datei mindestens ohne
  Absturz/Textverlust des umgebenden Inhalts löschbar.
- `docx/TestTableCellAlign.docx`, `TestTableColumns.docx`, `deep-table-cell.docx`,
  `table-alignment.docx`, `table-indent.docx` — DOCX-seitige Basis- und
  Formatierungsabdeckung.
- `docx/table_footnotes.docx` — Tabelle mit Fußnotenbezug; prüfen, dass das Löschen der
  Tabelle keine kaputte XML-Struktur/verwaiste Fußnoten-Referenz hinterlässt. **Hinweis:** Da
  eine eigenständige Fußnoten-Repräsentation im aktuellen Reader/Writer noch gar nicht
  existiert (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 11, Phase 3), kann eine „verwaiste Fußnote"
  hier heute nicht entstehen; der Testfall prüft daher nur Import ohne Crash, funktionierende
  Löschung und valide Reimport-Struktur — die vollständige Fußnotenverwaltung ist ein eigener
  Backlog-Bereich, keine durch „Tabelle löschen" eingeführte Lücke.

**Vorgabe:** Für jede oben genannte Fixture-Datei ist mindestens ein automatisierter Test
erforderlich, der (a) den Import ohne Absturz/Datenverlust prüft, (b) das Löschen der
enthaltenen Tabelle über die **tatsächliche Toolbar-Aktion** (nicht nur über direkt am
Dokumentmodell konstruierte Testdaten) auslöst, und (c) die Rundreise (exportieren →
reimportieren) auf vollständiges Fehlen der Tabelle bei intaktem übrigen Inhalt prüft. Für
eine repräsentative Auswahl ist der Export zusätzlich gegen einen **unabhängigen** Parser
(nicht nur den projekteigenen Reader) zu validieren (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt
19). Bloßes manuelles Anschauen genügt für die Abnahme nicht.

---

## 5. Ist-Stand-Analyse laut Code-Sichtung (Ausgangspunkt der Verifikation)

Diese Beobachtungen stammen aus einer Durchsicht des aktuellen Quellcodes und sind als **zu
bestätigende oder zu widerlegende Verdachtsmomente** zu verstehen — nicht als bereits
abgenommene Fehlerliste. Sie geben der Verifikation gezielte Ansatzpunkte. Alle Zeilenangaben
beziehen sich auf den aktuellen Code-Stand **inklusive** der zuletzt ergänzten
„Ausschneiden"-Funktion (Commit `9f8fa03`ff.); da sich Zeilennummern bei jeder Codeänderung
verschieben, ist im Zweifel stets das genannte **Symbol** (Datei + Funktions-/Variablenname)
maßgeblich, nicht die Zeilennummer.

1. **Kein Löschen-Befehl im Datenmodell/Editor vorhanden.**
   `src/formats/shared/editor/commands.ts` exportiert für Tabellen ausschließlich
   `insertTable(rows, cols)`; keine Funktion `deleteTable`/`removeTable`. Auch der von
   `prosemirror-tables` bereitgestellte, fertige `deleteTable`-Befehl wird nirgends
   importiert. Eine repo-weite Suche nach `deleteTable` liefert 0 Treffer; die einzigen
   `prosemirror-tables`-Importe im gesamten Projekt sind `isInTable` (in
   `commands.ts:3`), `tableNodes` (in `schema.ts:2`, fürs Schema) sowie
   `tableEditing`/`columnResizing` (als Editor-Plugins in `WordEditor.tsx:8`).
   **Konsequenz:** Feature zu 100 % ungebaut, nicht nur ungetestet.
2. **Kein Toolbar-Button für Löschen.** `Toolbar.tsx:277-289` enthält im Tabellen-Bereich nur
   den Einfüge-Button (`⊞ Tabelle`, `onMouseDown → insertTable(2, 2)`,
   `aria-pressed={isInTable(...)}` an Zeile 281 als reine Anzeige). Ein zweiter Button fehlt
   komplett.
3. **Kein eigenes Kontextmenü.** Die projektweite Suche nach `contextmenu`/`onContextMenu`
   liefert genau **einen** Treffer — einen Kommentar in `WordEditor.tsx:117-121`, der bewusst
   dokumentiert, **keinen** eigenen `contextmenu`-Listener zu setzen, damit das native
   Browser-Kontextmenü (u. a. für „Ausschneiden") erreichbar bleibt. Ein benutzerdefiniertes
   Kontextmenü-System existiert nicht.
4. **Keine Tastenkombination für „Tabelle löschen".** Das Editor-Keymap
   (`WordEditor.tsx:85-107`) bindet `Mod-z/y`, `Mod-Shift-z`, `Enter` (Listen-Splitting),
   `Shift-Enter` (Zeilenumbruch), `Mod-b/i/u`, `Shift-Delete` (Ausschneiden) sowie `baseKeymap`
   (Zeile 108). Keiner dieser Einträge behandelt eine ganze Tabelle als lösch-/selektierbares
   Objekt.
5. **Bibliotheksbefehl vorhanden, aber nicht verdrahtet.** `prosemirror-tables@^1.8.5` ist
   bereits Projektabhängigkeit (`package.json`) und liefert `deleteTable` fertig mit — der
   Umsetzungsaufwand ist dadurch geringer als bei einer Funktion ganz ohne
   Bibliotheksunterstützung, das darf aber **nicht** mit „ist eigentlich schon vorhanden"
   verwechselt werden. Es fehlt jede Verdrahtung zur UI.
6. **Keine Node-Selektion für ganze Tabellen vorbereitet.** Es gibt keinen Code, der eine
   `CellSelection` in eine `NodeSelection` auf dem `table`-Knoten überführt oder eine
   bestehende `NodeSelection` auf der Tabelle als Löschziel behandelt — für den in Abschnitt
   2.3 geforderten Pflichtfall ist somit weder Aktivierungs- noch Löschlogik vorbereitet.
7. **Fallback für „Tabelle ist einziger Dokumentinhalt" nicht als eigener Code vorhanden.**
   Da es keinen Löschmechanismus gibt, existiert auch keine explizite Logik zum Einsetzen
   eines Ersatz-Absatzes (Grenzfall 1). Ob ProseMirrors eigene Fitting-Logik dies bei einem
   `delete`-Dispatch bereits automatisch erfüllt, ist beim Bau zu verifizieren, nicht
   anzunehmen.
8. **Kein Aufräumen verwaister Bild-Ressourcen für diesen Fall geprüft.** Die Export-Logik
   (`docx/writer.ts` mit `ImageCollector`, analog `odt/writer.ts`) sammelt Bilder durch
   Durchlaufen des zum Exportzeitpunkt aktuellen Dokuments — ein Bild in einer bereits
   entfernten Tabelle würde strukturell nicht erfasst. Dies **sollte** also automatisch
   richtig sein, sobald die Löschfunktion korrekt implementiert ist, ist aber **noch nicht
   durch einen Test bestätigt** (Grenzfall 15) — reine Vermutung aus Code-Lesen.
9. **Verschachtelte Tabellen sind laut Schema erlaubt, aber ungetestet für Löschzwecke.**
   `cellContent: 'block+'` (`schema.ts:154`) erlaubt beliebige Blockinhalte inklusive
   weiterer Tabellen; reale Fixtures (`subTables*.odt`) liegen vor, es gibt aber keinen Code,
   der zwischen innerer und äußerer Tabelle beim Löschen unterscheidet.
10. **Bestehende automatisierte Tests decken Tabellen nur für Reader/Writer/Einfügen ab.**
    `src/formats/docx/__tests__/roundtrip.test.ts`, `.../odt/__tests__/roundtrip.test.ts` und
    die E2E-Dateien unter `tests/e2e/` enthalten keinen einzigen Test, der das **Löschen**
    einer Tabelle über echte Bedienung nachstellt. Die vorhandenen E2E-Dateien verwenden
    Tabellen nur als Kontext für andere Zwecke — `tests/e2e/selection-regression.spec.ts` für
    den allgemeinen Selection-Sync-Bug, `tests/e2e/cut.spec.ts` für das Ausschneiden (u. a. von
    Zellinhalt) —, nicht für das Entfernen der Tabellenstruktur selbst.
11. **Silent-No-Op-Risiko bei NodeSelection (wichtigster Verifikationspunkt).** Der fertige
    `deleteTable` aus `prosemirror-tables` löst über den Selektionsanker auf; steht dieser
    (wie bei einer `NodeSelection` auf der ganzen Tabelle) **vor** der Tabelle statt in einer
    Zelle, bleibt der Aufruf ohne Wirkung und ohne Fehler. Genau dieser Selektionszustand
    entsteht bereits heute durch das browsereigene Standard-Backspace an der Tabellengrenze
    (`baseKeymap`). Ohne explizite Behandlung ist das ein stiller Fehlschlag (`FEATURE-SPEC-
    DOCX-ODT.md` Abschnitt 20, Punkt 4) — muss beim Bau abgefangen und per Test (Grenzfall
    14) nachgewiesen werden.
12. **Verhältnis zu `zeile-loeschen`/`spalte-loeschen`.** Beide Nachbarfunktionen sind laut
    Backlog ebenfalls „fehlt" und teilen denselben Befund (kein Command, keine UI). Sie sind
    nicht Gegenstand dieser Spezifikation, bestätigen aber das Gesamtbild aus Abschnitt 17 der
    Hauptspezifikation: Tabellen-Kontextfunktionen fehlen als Gruppe vollständig in der UI.
    Die UI-Grundsatzentscheidungen (deaktiviert-vs-ausgeblendet, Kontextmenü ja/nein) sollten
    für alle drei Features gemeinsam getroffen werden (Abschnitt 1, Punkte 2/6).

**Einordnung:** Der Backlog-Status „fehlt" trifft nach dieser Code-Sichtung mit hoher
Sicherheit zu. „Verifikation" bedeutet hier zu großen Teilen: **das Feature erstmals bauen**
und jeden Punkt dieser Spezifikation durch echte Bedienung im Browser nachweisen, bevor der
Backlog-Status auf „vorhanden" geändert werden darf.

---

## 6. Menü-/Bedienelement-Übersicht (Soll-Zustand, kompakt)

| # | Element | Aktueller Zustand | Soll |
|---|---|---|---|
| 1 | Toolbar-Button „Tabelle löschen" | fehlt komplett | neu bauen, SVG-Icon, `aria-label`, aktiv bei Cursor-in-Tabelle **oder** NodeSelection auf Tabelle, ruft neuen `deleteTable`-Befehl (Wrapper um `prosemirror-tables`) auf |
| 2 | Aktivierungslogik / `disabled`-Zustand | fehlt | aktiv nur bei gültigem Löschziel (Abschnitt 2.3), sonst deaktiviert/ausgeblendet — einheitlich mit den übrigen Tabellen-Kontextfunktionen |
| 3 | Kontextmenü-Eintrag „Tabelle löschen" | fehlt (kein Kontextmenü im Projekt) | Nice-to-have; gemeinsame Cross-Feature-Entscheidung, nicht pro Feature |
| 4 | Tastaturweg | fehlt | optional; falls gebaut, identisch zum Button (Abschnitt 2.2), dokumentiert; Abwesenheit einer Pflicht-Tastenkombination bewusst dokumentiert |
| 5 | NodeSelection-auf-Tabelle-Behandlung (kein stiller No-Op) | fehlt | Pflicht (Abschnitt 2.3, Grenzfall 14) |
| 6 | Sonderfall „einzige/letzte Tabelle" → Ersatz-Absatz | fehlt | Pflicht (Abschnitt 2.4, Grenzfall 1) |
| 7 | Bild-/Listen-Ressourcen-Aufräumen im Export | ungetestet | Pflicht-Testnachweis (Abschnitt 2.7, Grenzfall 15) |
| 8 | Mobile/Touch-Bedienbarkeit | ungeprüft | Pflicht auf „Mobile"/„Tablet" (Abschnitt 2.8, Grenzfall 18) |
| 9 | Dauerhafter Regressionstest Selection-Sync × Tabelle löschen | fehlt | Pflicht (Abschnitt 2.5, Grenzfall 9) |

---

## 7. Testfälle (Zusammenfassung, Pflichtumfang)

E2E-Tests durchgehend über **echte** Browser-Interaktion (Muster:
`tests/e2e/selection-regression.spec.ts` — `page.keyboard`, `.ProseMirror`-Locator,
`getByRole`/`getByLabel`, echter Datei-Upload via `filechooser`, Download via
`page.waitForEvent('download')`), nicht über isolierte Command-Aufrufe. Neue Tests
vorzugsweise in einer eigenen Datei, z. B. `tests/e2e/table-delete.spec.ts`.

1. Toolbar-Button aktiviert sich korrekt bei Cursor innerhalb einer Tabelle, deaktiviert
   außerhalb (Abschnitt 1, Grenzfall 13).
2. Klick entfernt die komplette Tabelle inkl. Inhalt, unabhängig davon, in welcher Zelle der
   Cursor stand (Abschnitt 2.1).
3. `CellSelection` über mehrere Zellen (Maus-Drag) → Klick entfernt die ganze Tabelle, nicht
   nur die markierten Zellen (Abschnitt 2.1).
4. Abgrenzung: Entf/Backspace auf markiertem Zellinhalt leert nur den Inhalt, entfernt nie
   implizit die Tabellenstruktur (Abschnitt 2.2) — Pflicht-Regressionstest.
5. NodeSelection auf ganzer Tabelle (Cursor hinter Tabelle, ein Backspace) → Button aktiv,
   Klick löscht, **kein** stiller No-Op (Abschnitt 2.3, Grenzfall 14) — Pflicht-Testfall.
6. Falls ein tastaturbasierter Löschweg umgesetzt wird: liefert dasselbe Ergebnis wie der
   Button (Abschnitt 2.2).
7. Cursor-Ziel nach dem Löschen deterministisch, Editor sofort bedienbar, inkl. Sonderfall
   „Tabelle war einziger Dokumentinhalt" (Abschnitt 2.4, Grenzfall 1).
8. Undo/Redo stellt Tabelle strukturell exakt wieder her bzw. entfernt sie erneut, auch über
   mehrere Zyklen (Abschnitt 2.5, Grenzfall 11).
9. Verschachtelte Tabelle: innere und äußere Tabelle je einzeln als Ziel (Abschnitt 2.6,
   Grenzfall 7).
10. Bild-Aufräumen (keine verwaisten Ressourcen im Export) und Listen in Zellen (Abschnitt
    2.7, Grenzfall 15).
11. Selection-Sync-Regressionstest im Tabellenkontext unmittelbar vor dem Löschen (Abschnitt
    2.5, Grenzfall 9) — Pflichttest.
12. Alle Grenzfälle aus Abschnitt 3 (1–18) einzeln als eigener Testfall.
13. Rundreise DOCX **und** ODT für jede im Editor erzeugbare/löschbare Konfiguration
    (Abschnitt 4.1, Punkte 1–8).
14. Import + Löschen + Rundreise für jede reale Fixture-Datei aus Abschnitt 4.2 — kein Test
    gilt als abgeschlossen, solange nicht mindestens diese Dateien einbezogen wurden.
15. Validierung eines DOCX-Exports (Dokument hatte mehrere Tabellen, einige gelöscht) gegen
    einen unabhängigen Parser (nicht nur den projekteigenen Reader),
    `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 19.
16. Dasselbe für ODT gegen das ODF-Schema bzw. einen unabhängigen Parser.
17. Kernverhalten (Testfälle 2, 5, 7, 11) auf allen drei Playwright-Projekten
    (Desktop Chrome, Mobile/Pixel 7, Tablet/iPad Mini), Abschnitt 2.8/Grenzfall 18.

---

## 8. Testmatrix — Zusammenfassung

| Bereich | Unit-Test (Reader/Writer) | E2E-Test (echte Bedienung) | Rundreise-Test (DOCX/ODT) |
|---|---|---|---|
| Grundfunktion: Tabelle per Cursor-in-Zelle löschen | n/a | **fehlt komplett** | fehlt |
| Löschen bei `CellSelection` (Maus-Drag) | n/a | fehlt | fehlt |
| Abgrenzung Entf/Backspace vs. Struktur-Löschen | n/a | **fehlt, Pflicht** | n/a |
| NodeSelection auf ganzer Tabelle (kein stiller No-Op) | n/a | **fehlt, Pflicht** | n/a |
| Sonderfall „einzige/letzte Tabelle" → Ersatz-Absatz | n/a | fehlt | n/a |
| Verschachtelte Tabelle (innen/außen) | fehlt | fehlt | fehlt |
| Undo/Redo nach Tabelle löschen (mehrere Zyklen) | n/a | fehlt | n/a |
| Bild in gelöschter Tabelle → keine verwaisten Ressourcen | fehlt | fehlt | fehlt |
| Selection-Sync-Regressionstest × Tabelle löschen | n/a | **fehlt, Pflicht** | n/a |
| Reale Fremddateien (Abschnitt 4.2) | fehlt | fehlt | fehlt |
| Cross-Format-Rundreise nach Löschen | n/a | fehlt | fehlt |
| Unabhängige Parser-Validierung des Exports | fehlt | n/a | fehlt |
| Mobile/Tablet-Bedienung | n/a | fehlt | n/a |

**Fazit:** Der Backlog-Status „fehlt" ist zutreffend — es existiert weder ein UI-Weg noch ein
verdrahteter Befehl noch ein einziger Test, obwohl `prosemirror-tables` den Kernbefehl bereits
mitliefert. Vor einer Statusänderung auf „vorhanden" müssen mindestens die als **Pflicht**
markierten Testfälle grün sein und die Rundreise-Anforderung aus Abschnitt 4 für beide Formate
nachgewiesen werden.

---

## 9. Definition of Done

Das Feature „Tabelle löschen" gilt erst dann als verifiziert und vertrauenswürdig, wenn:

1. Ein echter, klickbarer Toolbar-Button existiert, der die komplette Tabelle inkl. Inhalt
   sichtbar entfernt (Abschnitt 1, Abschnitt 2.1).
2. Der NodeSelection-auf-Tabelle-Pflichtfall (Abschnitt 2.3, Grenzfall 14) behandelt ist:
   Button aktiv, Klick wirksam, kein stiller No-Op.
3. Die Abgrenzung „Struktur löschen" vs. „nur Zellinhalt leeren" (Abschnitt 2.2) durch einen
   dauerhaften Regressionstest belegt ist.
4. Der Sonderfall „einzige/letzte Tabelle" (Abschnitt 2.4, Grenzfall 1) implementiert und
   getestet ist (gültiges Dokument, Editor bleibt bedienbar).
5. Undo/Redo (Abschnitt 2.5) die Tabelle strukturell exakt wiederherstellt bzw. erneut
   entfernt, auch über mehrere Zyklen.
6. Verschachtelte Tabellen (Abschnitt 2.6) in beiden Richtungen (innen/außen) je durch einen
   Test abgedeckt sind.
7. Jeder Grenzfall aus Abschnitt 3 einen zugeordneten, dauerhaft in der Suite verbleibenden
   Test hat oder bewusst als nicht unterstützt mit Begründung dokumentiert ist.
8. Der Selection-Sync-Regressionstest im Tabellenkontext (Abschnitt 2.5, Grenzfall 9)
   geschrieben, grün und dauerhaft Teil der Suite ist.
9. Die Rundreise-Anforderung aus Abschnitt 4 für **beide** Formate und **alle** dort
   gelisteten realen Fixture-Dateien nachgewiesen ist, inkl. unabhängiger Parser-Validierung
   für eine repräsentative Auswahl (Abschnitt 7, Testfälle 15/16).
10. Das Kernverhalten auf allen drei Playwright-Projekten (Desktop Chrome, Mobile/Pixel 7,
    Tablet/iPad Mini) nachweisbar ist (Abschnitt 2.8).
11. Zu jedem Verdachtspunkt aus Abschnitt 5 ein eindeutiges Ergebnis vorliegt (bestätigt und
    behoben durch tatsächlichen Bau / bestätigt und bewusst als bekannte Einschränkung
    dokumentiert / widerlegt) — kein Punkt bleibt offen.
12. Kein Punkt dieser Spezifikation zu einem stillen Fehlschlag führt (Abschnitt 2.9;
    `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20).
13. Der Backlog-Eintrag `tabelle-loeschen` in `specs/FEATURE-BACKLOG.md` erst nach Erfüllung
    aller obigen Punkte von „fehlt" auf „vorhanden" geändert wird (bei Teilerfüllung
    explizit „teilweise", mit den fehlenden Teilen als eigene Nachfolge-Aufgaben).
