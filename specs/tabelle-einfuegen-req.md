# Anforderungsspezifikation: Feature „Tabelle einfügen“

Status: **Nicht vertrauenswürdig — vollständige Verifikation ausstehend.** Laut
`specs/FEATURE-BACKLOG.md` Abschnitt 3.2 (Zeile 181, Slug `tabelle-einfuegen`) als
**teilweise** vorhanden geführt (Priorität 1/essenziell), Beschreibung dort: „Fügt
eine Tabelle mit wählbarer Zeilen-/Spaltenzahl ein.“ `FEATURE-SPEC-DOCX-ODT.md`
Abschnitt 6 und Abschnitt 17 (Zeile 359) bestätigen unabhängig denselben Befund:
„vorhanden, aber laut Nutzerin nicht funktional“, „feste 2×2-Größe durch Dialog
ersetzen“. Diese Datei ersetzt diese Beschreibungen nicht, sondern macht sie so
detailliert und einzeln abhakbar, dass ein QA-Agent jeden Punkt über echte
Browser-Bedienung (nicht nur Unit-Tests) nachweisen oder widerlegen kann.

Geltungsbereich: Ausschließlich das **Einfügen** einer neuen Tabelle (Toolbar-
Auslöser, künftiger Größenwahl-Dialog, Platzierung im Dokument, unmittelbare
Bearbeitbarkeit/Editierbarkeit der frisch eingefügten Tabelle inkl. Klick-Navigation,
Tab-Navigation und Undo direkt nach dem Einfügen) für **beide** Formate, DOCX und
ODT — sowohl als neu im Editor erzeugtes Element als auch beim Export und der
anschließenden Rundreise (Datei hochladen bzw. im Editor erzeugen → unverändert
exportieren → erneut importieren → Ergebnis entspricht inhaltlich dem Original).
Stil und Gliederung orientieren sich an `E:\docs\FEATURE-SPEC-DOCX-ODT.md`.

**Ausdrücklich außerhalb des Geltungsbereichs** dieser Datei (eigene, separate
Backlog-Einträge in `FEATURE-BACKLOG.md` Abschnitt 3.2, jeweils Status „fehlt“,
Priorität 1–4, dort einzeln zu verifizieren, sobald gebaut):
`zeile-einfuegen`, `zeile-loeschen`, `spalte-einfuegen`, `spalte-loeschen`,
`zellen-verbinden`, `zellen-teilen`, `tabelle-loeschen`, `tabelle-eigenschaften`,
`tabellenformatvorlagen`, `kopfzeile-wiederholen`, `text-in-tabelle-umwandeln`,
`tabelle-in-text-umwandeln`, `tabellenformel`, `tabelle-sortieren`,
`tabelle-autoanpassen`, `tabelle-zeichnen`. Diese Datei behandelt sie **nur** dort,
wo sie unmittelbar berühren, ob eine frisch eingefügte Tabelle überhaupt sinnvoll
nutzbar ist (z. B. Tab-Navigation zwischen Zellen, Undo, Klick-Bearbeitbarkeit) —
nicht als eigenständig zu verifizierende Funktionen.

Referenzierter Ist-Stand des Codes (Grundlage dieser Anforderung, **kein** Nachweis
der Korrektheit — das ist Aufgabe der Verifikation):

| Ort | Inhalt |
|---|---|
| `src/formats/shared/editor/Toolbar.tsx:228-239` | Toolbar-Button „⊞ Tabelle“, `title="Tabelle einfügen"`, `aria-pressed={isInTable(view.state)}`, `onMouseDown` ruft **fest verdrahtet** `run(view, insertTable(2, 2))` auf — kein Dialog, keine Eingabemöglichkeit für Zeilen-/Spaltenzahl |
| `src/formats/shared/editor/commands.ts:76-86` | `insertTable(rows, cols)` — Command ist bereits **parametrisiert** (nimmt beliebige Zeilen-/Spaltenzahl entgegen), erzeugt Zellen mit `createAndFill()` und ersetzt die aktuelle Selektion (`state.tr.replaceSelectionWith(table)`); die UI nutzt diese Parametrisierung aktuell nicht |
| `src/formats/shared/schema.ts:2,106` | `tableNodes({ tableGroup: 'block', cellContent: 'block+', cellAttributes: {} })` aus `prosemirror-tables` — Standardattribute `colspan`, `rowspan`, `colwidth` je Zelle vorhanden; `tableGroup: 'block'` bedeutet, Tabellen sind an denselben Stellen erlaubt wie Absätze, u. a. **auch innerhalb einer Tabellenzelle** (`cellContent: 'block+'`), verschachtelte Tabellen sind schemaseitig also nicht verboten |
| `src/formats/shared/editor/WordEditor.tsx:8,81-82` | Plugins `columnResizing()` und `tableEditing()` aus `prosemirror-tables` aktiv; **kein** eigener `keymap`-Eintrag für Tab/Umschalt+Tab (`goToNextCell` wird von `prosemirror-tables` exportiert, aber nirgends im Projekt importiert/gebunden — `grep` über `src/` liefert keinen Treffer außer im Paket selbst) |
| `node_modules/prosemirror-tables` (Paket-Exporte) | Stellt fertige Commands `addRowAfter`, `addRowBefore`, `deleteRow`, `addColumnAfter`, `addColumnBefore`, `deleteColumn`, `mergeCells`, `splitCell`, `deleteTable`, `goToNextCell`, `toggleHeaderRow/Column/Cell` bereit — **keine** davon wird aktuell irgendwo in `src/formats/shared/editor/*` importiert oder verwendet; die „größte Einzellücke“ aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 17 (Zeile 373) ist also keine fehlende Bibliotheksfunktion, sondern ausschließlich fehlende UI-Verdrahtung |
| `src/formats/docx/reader.ts:203-256` | `parseTable()`, `MAX_TABLE_NESTING_DEPTH = 25` (Zeile 208) als Schutz gegen absichtlich pathologisch verschachtelte Testdateien; liest `w:gridSpan`/`w:vMerge` korrekt in `colspan`/`rowspan`; setzt `colwidth` **immer fest auf `null`** (Zeile 244) — `w:tcW`/Spaltenbreite aus `w:tblGrid` wird nicht ausgelesen |
| `src/formats/docx/writer.ts:128-171` | `tableToDocx()`; Zeile 131 erzeugt `<w:gridCol w:w="2000"/>` **hartkodiert für jede Spalte**, unabhängig vom tatsächlichen Zellinhalt/einer evtl. im Editor gesetzten Breite; Zeile 170 `<w:tblPr/>` **komplett leer** — kein `<w:tblBorders>`, kein `<w:tblStyle>` — d. h. eine exportierte DOCX-Tabelle hat in einer echten Word-Installation ohne weiteres Zutun **keine sichtbaren Rahmenlinien**, obwohl sie im Editor selbst dank CSS mit Rahmen dargestellt wird |
| `src/formats/odt/writer.ts:86-111` | Tabellenfall in `blockToOdt()`; Zeile 88 `const colCount = rows[0]?.content?.length ?? 1` — zählt **Zellen**, nicht **Spalten**: bei einer horizontal verbundenen Zelle (`colspan > 1`) in der ersten Zeile wird die tatsächliche Spaltenzahl **unterschätzt**, im Gegensatz zum DOCX-Writer (`writer.ts:130`), der korrekt `colspan` aufsummiert — dadurch entsteht potenziell zu wenig `<table:table-column/>`-Elemente relativ zur tatsächlich benötigten Spaltenzahl; Zeile 109 vergibt den Tabellennamen per `Math.random()` (nicht deterministisch, theoretisches Kollisionsrisiko bei mehreren Tabellen) |
| `src/formats/odt/reader.ts:189-203` | Liest `table:number-columns-spanned`/`table:number-rows-spanned` korrekt in `colspan`/`rowspan`; setzt `colwidth` ebenfalls **immer fest auf `null`** |
| `src/index.css:44-59` | `.ProseMirror table { border-collapse: collapse; width: 100%; }`, `.ProseMirror td, th { border: 1px solid #9ca3af; }` — Rahmen ist eine reine **Editor-CSS-Darstellung**, unabhängig davon, ob DOCX/ODT-Export überhaupt Rahmeninformation schreibt (siehe oben) |
| `src/app/PrivacyModal.tsx` | Einziges im Projekt vorhandenes Dialog-/Modal-Muster; es existiert **kein** Dialog-Code für eine Tabellengrößen-Auswahl — muss komplett neu gebaut werden |
| `tests/e2e/selection-regression.spec.ts:34-50` | Einziger vorhandener E2E-Test, der überhaupt eine Tabelle über die UI erzeugt (`page.getByRole('button', { name: 'Tabelle einfügen' }).click()`); testet ausschließlich den Selection-Sync-Bug beim Klickwechsel zwischen zwei Zellen, **keine** Größenwahl, **keine** Rundreise, **keine** Tab-Navigation |
| `src/formats/docx/__tests__/roundtrip.test.ts:173-249` | Unit-Tests für Zeilen/Spalten/Zellinhalt sowie colspan/rowspan — arbeiten ausschließlich mit **direkt konstruierten** JSON-Testdaten, nicht über die Toolbar/den Dialog |
| `src/formats/odt/__tests__/roundtrip.test.ts:162-210` | Analoge Unit-Tests für ODT, ebenfalls nur mit konstruierten Testdaten; der Colspan-Test (Zeile 194) deckt den oben beschriebenen `table:table-column`-Zählfehler **nicht** auf, da er die Spaltenanzahl der exportierten Datei nicht prüft |

---

## 1. Menüpunkte/Bedienelemente

| # | Element | Fundstelle | Ist-Verhalten laut Code | Anforderung |
|---|---|---|---|---|
| 1 | Toolbar-Button „⊞ Tabelle“ (Titel/`aria-label` „Tabelle einfügen“) | `Toolbar.tsx:228-239` | `onMouseDown` mit `preventDefault()` ruft **direkt** `insertTable(2, 2)` auf — keine Rückfrage, keine Auswahl | Klick öffnet einen **Dialog/eine Auswahl** zur Zeilen-/Spaltenwahl, bevor die Tabelle eingefügt wird; die feste 2×2-Größe entfällt als einziger Weg |
| 2 | Zeilen-/Spalten-Auswahldialog | **nicht vorhanden** (kein Dialog-Code im gesamten `src`, siehe `PrivacyModal.tsx` als einziges existierendes Modal-Muster) | — | Numerische Eingabe für Zeilen und Spalten (mind. zwei Zahlenfelder, alternativ ein Hover-Raster analog Word/LibreOffice bis zu einer sinnvollen Obergrenze); sinnvoller Standardwert vorbelegt (z. B. 3×3 oder der zuletzt verwendete Wert); Bestätigen-Button fügt ein, Abbrechen/Escape/Klick außerhalb schließt ohne Änderung |
| 3 | Eingabevalidierung im Dialog | nicht vorhanden (Dialog existiert nicht) | — | Ganzzahlige Werte ≥ 1 für Zeilen und Spalten; nicht-numerische/negative/Null-Eingabe wird abgefangen mit sichtbarer Fehlermeldung statt stillem Fehlschlag oder Absturz; sinnvolle Obergrenze (siehe Grenzfall 3.3) mit Fehlermeldung statt UI-Einfrieren |
| 4 | Command `insertTable(rows, cols)` | `commands.ts:76-86` | Bereits vollständig parametrisiert, funktional unabhängig von der UI verifiziert über direkt konstruierte Aufrufe | Dialog muss ausschließlich diese bestehende Funktion mit den vom Dialog gelieferten Werten aufrufen — keine Änderung an der Commandfunktion selbst nötig, nur an der Toolbar-Anbindung |
| 5 | Tastenkombination zum Einfügen | nicht vorhanden | — | Kein Blocker; falls gewünscht, optional ergänzbar, aber mindestens der Dialog-Weg über die Toolbar muss zuverlässig funktionieren |
| 6 | Kontextmenü (Rechtsklick) „Tabelle einfügen“ | nicht vorhanden | — | Kein Kontextmenü-Eintrag vorhanden; nicht Teil dieser Anforderung, aber als fehlend zu dokumentieren, falls Nutzererwartung vorhanden |
| 7 | Zellen-Klick nach dem Einfügen | `WordEditor.tsx:81-82`, Plugin `tableEditing()` | Klick in eine Zelle positioniert den Cursor über Standard-ProseMirror-Verhalten; keine projektspezifische Sonderbehandlung | Klick in jede Zelle der frisch eingefügten Tabelle muss den Cursor zuverlässig in genau dieser Zelle platzieren, inkl. Interaktion mit dem Selection-Sync-Bug aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2 (siehe Grenzfall 3.13, bereits mit Regressionstest `selection-regression.spec.ts:34-50` abgedeckt) |
| 8 | Tab-/Umschalt+Tab-Navigation zwischen Zellen | `WordEditor.tsx:71-82` — **kein** `keymap`-Eintrag für `goToNextCell` | Tab hat im `contenteditable` ohne eigene Bindung typischerweise **keine** definierte Wirkung innerhalb des Editors (Standard-Browserverhalten: Fokuswechsel aus dem Editor heraus zum nächsten fokussierbaren Element der Seite ist wahrscheinlich, da `baseKeymap` aus `prosemirror-commands` Tab nicht bindet) | Tab springt zur nächsten Zelle, Umschalt+Tab zur vorherigen; Tab in der letzten Zelle der letzten Zeile fügt eine neue Zeile hinzu (siehe `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6) — **muss zuerst gebaut werden** (Bindung von `goToNextCell` aus `prosemirror-tables`, plus eigene Logik für „neue Zeile am Ende“), gilt bis zum Nachweis als **nicht funktional** |
| 9 | Undo (Strg+Z) direkt nach Tabellen-Einfügen | `WordEditor.tsx:72`, `history()`-Plugin generisch für alle Transaktionen | Sollte über den generischen ProseMirror-History-Mechanismus funktionieren, da `insertTable` eine einzelne Transaktion erzeugt | Ein Strg+Z direkt nach dem Einfügen entfernt die komplette Tabelle wieder vollständig, stellt den vorherigen Cursor-/Textzustand her; explizit als Testfall in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2, Testfall 7 gefordert, aber aktuell **nicht** durch einen eigenen Test abgesichert |
| 10 | Zeilen-/Spalten-Kontextfunktionen (Zeile/Spalte einfügen/löschen, verbinden/teilen, Tabelle löschen) | vollständig fehlend in der UI (siehe `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 17, Zeile 373) | — | **Außerhalb des Geltungsbereichs dieser Datei** — siehe eigene Backlog-Slugs `zeile-einfuegen`, `spalte-einfuegen`, `zellen-verbinden` usw.; hier nur insofern relevant, als eine frisch eingefügte Tabelle ohne diese Funktionen zwar „eingefügt“, aber praktisch kaum nachträglich anpassbar ist |

---

## 2. Gewünschtes Verhalten im Detail

### 2.1 Öffnen des Dialogs
- Klick auf den Toolbar-Button „Tabelle einfügen“ öffnet **immer** zuerst den
  Größenwahl-Dialog — es gibt keinen Modus, der ohne Rückfrage direkt eine Tabelle
  einfügt (die aktuelle feste 2×2-Direkteinfügung entfällt vollständig).
- Der Dialog erscheint sichtbar über/neben dem Editor, blockiert die übrige
  Bedienung nicht dauerhaft (Escape/Klick außerhalb schließt ihn wieder), analog
  zum bestehenden Muster in `PrivacyModal.tsx` (Fokus-Falle, Schließen-Mechanismus).
- Fokus liegt beim Öffnen direkt auf dem ersten Eingabefeld (Tastatur-Bedienung
  ohne Maus möglich).

### 2.2 Eingabe und Bestätigung der Größe
- Zwei unabhängige Eingaben: Zeilenzahl und Spaltenzahl, jeweils ganzzahlig ≥ 1.
- Standardwert vorbelegt (z. B. 3×3), damit ein reiner Klick auf „Einfügen“ ohne
  weitere Eingabe ein sinnvolles Ergebnis liefert.
- Bestätigen (Button „Einfügen“ oder Enter-Taste in einem der Felder) ruft
  `insertTable(rows, cols)` (`commands.ts:76`) mit genau den eingegebenen Werten
  auf und schließt den Dialog.
- Abbrechen (Button „Abbrechen“, Escape-Taste, Klick außerhalb) schließt den
  Dialog **ohne** jede Dokumentänderung — Cursor-Position und Selektion im Editor
  bleiben exakt wie vor dem Öffnen.

### 2.3 Einfügen an der Cursor-Position
- Die Tabelle wird an der aktuellen Cursor-Position bzw. anstelle der aktuellen
  Selektion eingefügt (`state.tr.replaceSelectionWith(table)`, `commands.ts:82`).
- Ist Text markiert, wird dieser durch die Tabelle ersetzt (kein Zusammenführen)
  — das ist Standard-ProseMirror-Verhalten und muss so dokumentiert/bestätigt sein,
  nicht stillschweigend Textverlust erzeugen, den Nutzer:innen nicht erwarten.
- Nach dem Einfügen befindet sich der Cursor in einer sinnvollen Zelle (idealerweise
  der ersten Zelle der Tabelle), nicht in einem undefinierten Zustand.

### 2.4 Sofortige Bearbeitbarkeit nach dem Einfügen
- Unmittelbar nach dem Einfügen ist jede Zelle per Klick erreichbar und direkt
  bearbeitbar (Tippen funktioniert ohne zusätzlichen Klick/Reload).
- Zellinhalt kann selbst wieder formatiert werden (fett, Ausrichtung etc.) und
  mehrere Absätze enthalten (Schema erlaubt `cellContent: 'block+'`,
  `schema.ts:106`).
- Text vor und nach der eingefügten Tabelle (falls die Tabelle nicht am
  Dokumentanfang/-ende eingefügt wurde) bleibt unverändert erhalten.

### 2.5 Darstellung direkt nach dem Einfügen
- Zellrahmen sichtbar (`index.css:50-56`, `border: 1px solid`), Tabellenbreite
  füllt die verfügbare Seitenbreite (`width: 100%`, `index.css:46`).
- Alle Zellen zunächst gleich breit; Spaltenbreite ist über das
  `columnResizing()`-Plugin (`WordEditor.tsx:81`) per Ziehen an der Spaltengrenze
  änderbar — zu verifizieren, ob dieser Mechanismus für frisch eingefügte Tabellen
  ebenso funktioniert wie für importierte.
- **Bekannte Einschränkung, muss dokumentiert/verifiziert werden:** Eine per
  Ziehen geänderte Spaltenbreite wird zwar im Editor-Dokumentmodell als
  `colwidth`-Attribut der Zelle gespeichert, aber **weder der DOCX- noch der
  ODT-Writer liest dieses Attribut aus** (kein Treffer für `colwidth` in
  `writer.ts` in beiden Formaten) — die im Editor sichtbare individuelle
  Spaltenbreite geht beim Export vollständig verloren; der DOCX-Writer schreibt
  stattdessen für jede Spalte hartkodiert `w:w="2000"` (`docx/writer.ts:131`).

### 2.6 Undo/Redo
- Einfügen der Tabelle ist ein einzelner, eigenständiger Undo-Schritt.
- Undo direkt nach dem Einfügen entfernt die komplette Tabelle wieder, stellt
  exakt den vorherigen Dokumentzustand (Cursor-Position, umgebender Text) her.
- Redo stellt die eingefügte Tabelle inklusive Größe erneut her.
- Funktioniert auch in gemischten Sequenzen (Tippen → Tabelle einfügen → Tippen in
  Zelle → Undo mehrfach) in korrekter, umgekehrter Reihenfolge.

### 2.7 Zusammenspiel mit dem Selection-Sync-Bug
- Tabellen gelten laut `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6 als „Hauptverdachtsfall“
  für den in Abschnitt 2 dokumentierten Selection-Sync-Bug, da Klicks zwischen
  Zellen ähnliche Selektionswechsel auslösen wie das dort beschriebene Szenario.
- Exakte Sequenz (bereits als Test vorhanden, `selection-regression.spec.ts:34-50`):
  Tabelle einfügen → in Zelle 1 klicken und tippen → Alles auswählen (innerhalb der
  Zelle) → Fett anwenden → in Zelle 2 klicken → tippen → **beide** Zellinhalte
  müssen erhalten bleiben, kein Datenverlust.
- Dieser Test muss als Pflichtbestandteil der Dauer-Suite bestehen bleiben und darf
  nicht als optional betrachtet werden.

### 2.8 Einfügen an Sonderpositionen
- Tabelle direkt am Dokumentanfang einfügen (Cursor vor dem ersten Zeichen des
  Dokuments) → Tabelle wird an erster Stelle eingefügt, Dokument bleibt weiterhin
  editierbar (Cursor kann davor navigiert werden, um weiteren Text voranzustellen).
- Tabelle direkt am Dokumentende einfügen → analog, Cursor kann dahinter platziert
  werden.
- Tabelle einfügen, während der Cursor bereits **innerhalb einer bestehenden
  Tabellenzelle** steht → da `tableGroup: 'block'` und `cellContent: 'block+'`
  (`schema.ts:106`) eine Tabelle schemaseitig als Kind-Node einer Zelle zulassen,
  entsteht hier voraussichtlich eine **verschachtelte Tabelle**. Zu klären und zu
  dokumentieren: Ist das gewolltes Verhalten (analog zu Word/LibreOffice, die
  verschachtelte Tabellen ebenfalls erlauben) oder soll die Aktion in diesem Fall
  verhindert/mit Warnung versehen werden? Aktuell **ungeklärt**, siehe Grenzfall 3.7.
- Tabelle einfügen, während der Cursor innerhalb eines Listenelements steht → zu
  klären, ob die Tabelle das Listenelement ersetzt/darin eingebettet wird oder die
  Liste unterbricht (siehe Grenzfall 3.8).

---

## 3. Grenzfälle

1. **Dialog abbrechen:** Escape/„Abbrechen“/Klick außerhalb → keine Tabelle wird
   eingefügt, Cursor-Position und ggf. vorhandene Selektion bleiben exakt wie vor
   dem Öffnen des Dialogs erhalten.
2. **Ungültige Eingabe (0, negativ, nicht-numerisch, leeres Feld):** Muss mit
   sichtbarer Fehlermeldung abgefangen werden, darf nicht zu einer leeren/kaputten
   Tabelle, einem stillen No-Op oder einem JS-Fehler in der Konsole führen.
3. **Sehr große Werte (z. B. 100×100):** UI muss reaktionsfähig bleiben (kein
   Einfrieren); sinnvolle Obergrenze definieren und bei Überschreitung mit
   Fehlermeldung statt kommentarlosem Abschneiden reagieren.
4. **Sehr große, aber gerade noch zulässige Tabelle (z. B. 20×20):** Einfügen und
   anschließendes Scrollen/Bearbeiten bleibt performant; Export/Re-Import bleibt
   in vertretbarer Zeit (< 3 Sekunden bei realistischer Größe, analog zum
   allgemeinen Anspruch aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 1.2).
5. **Einfügen bei aktiver Textselektion:** Markierter Text wird durch die Tabelle
   ersetzt (kein Zusammenführen von Text und Tabelle) — muss als gewolltes,
   dokumentiertes Verhalten bestätigt werden, nicht als unerwarteter Datenverlust
   empfunden werden (ggf. Sicherheitsabfrage erwägen, falls Selektion nicht leer
   ist und mehr als triviale Textmenge umfasst).
6. **Tabelle direkt am Dokumentanfang/-ende einfügen:** Cursor-Positionierung
   davor/danach bleibt möglich, Dokument bleibt vollständig weiter editierbar
   (bereits als Testfall in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6, Testfall 10
   gefordert).
7. **Verschachtelte Tabelle durch aktives Einfügen** (Cursor bereits in einer
   Tabellenzelle, siehe 2.8): Aktuell **ungeklärt**, ob dies zugelassen, verhindert
   oder mit Rückfrage versehen werden soll — Ergebnis dieser Klärung muss hier
   nachgetragen werden. Unabhängig vom Ergebnis gilt: Es darf zu keinem Absturz
   kommen (Import einer verschachtelten Fremddatei wird bereits über
   `MAX_TABLE_NESTING_DEPTH = 25`, `docx/reader.ts:208`, robust behandelt — für das
   **aktive Einfügen** über die Toolbar existiert diese Schutzschicht nicht
   automatisch, da hier keine Tiefenbegrenzung im Command selbst geprüft wird).
8. **Einfügen innerhalb eines Listenelements:** Verhalten (Liste wird unterbrochen
   vs. Tabelle wird Kind des Listenelements) muss definiert und getestet werden,
   nicht nur zufälliges Schema-Ergebnis sein.
9. **Tab-Navigation, letzte Zelle der letzten Zeile:** Muss laut
   `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6 eine neue Zeile erzeugen — aktuell mit
   hoher Wahrscheinlichkeit **nicht** funktional, da weder `goToNextCell` gebunden
   noch eine eigene „neue Zeile am Ende“-Logik vorhanden ist (siehe Abschnitt 1,
   Zeile 8 der Bedienelemente-Tabelle). Gilt bis zum Gegenbeweis als **fehlend**,
   nicht nur als ungetestet.
10. **Tab-Taste in einer frisch eingefügten Tabelle, aber Fokus verlässt versehentlich
    den Editor:** Zu verifizieren, ob Tab ohne eigene Bindung tatsächlich den
    Browser-Fokus aus dem `contenteditable`-Bereich herausspringen lässt (z. B. zum
    nächsten Toolbar-Button) — falls ja, ist das ein eigenständiger, gravierender
    Bedienbarkeits-Bug, der unabhängig von der hier geforderten Zellnavigation
    behoben werden muss.
11. **Mehrfaches schnelles Klicken auf den Tabelle-Button/„Einfügen“ im Dialog:**
    Kein doppeltes Einfügen durch Event-Bubbling oder doppelte Handler-Aufrufe.
12. **Undo direkt nach Einfügen, gefolgt vom Selection-Sync-Bug-Szenario:** Tabelle
    einfügen → Undo → erneut Text tippen an der wiederhergestellten Cursor-Position
    → darf nicht zu Inhaltverlust führen (Kombination der Grenzfälle 2.6 und 2.7).
13. **Selection-Sync-Bug beim Zellwechsel per Klick** (siehe 2.7): Bereits mit
    Regressionstest abgedeckt (`selection-regression.spec.ts:34-50`) — muss
    dauerhaft Teil der Suite bleiben.
14. **Spaltenanzahl, die die Seitenbreite überschreitet** (z. B. 15 Spalten auf
    A4-Breite): Tabelle nutzt `width: 100%` (`index.css:46`) und `min-width: 2em`
    je Zelle (`index.css:54`) — bei sehr vielen Spalten ist unklar, ob die Tabelle
    horizontal über die Seite hinausragt oder gestaucht wird; muss visuell
    verifiziert werden (kein automatisches Zeilenumbruch-/Skalierungsverhalten für
    Zellinhalt bekannt).
15. **Einfügen in ein vollständig leeres, neu erstelltes Dokument:** Tabelle wird
    als erstes/einziges Element eingefügt → Dokument bleibt danach weiter
    editierbar (Cursor kann vor/nach der Tabelle positioniert werden, um Text zu
    ergänzen), kein Sonderzustand „Dokument besteht nur aus einer Tabelle“, der zu
    einem Fehler führt.

---

## 4. Rundreise-Anforderung (Pflicht für Abnahme)

Für **jeden** der folgenden Fälle gilt: Tabelle mit definierter Zeilen-/Spaltenzahl
und Zellinhalt im Editor erzeugen bzw. per Upload importieren → **unverändert**
exportieren → erneut importieren → Struktur (Zeilen-/Spaltenzahl, Zellinhalt,
Verbund-Zellen soweit über Import entstanden) ist inhaltlich exakt erhalten.

### 4.1 DOCX
1. Über den neuen Dialog eine 4×3-Tabelle einfügen, jede Zelle mit unterschiedlichem
   Text befüllen, als DOCX exportieren → mit einem unabhängigen Parser (z. B.
   python-docx oder direktes Parsen von `word/document.xml`) verifizieren: exakt 4
   `<w:tr>`, in jeder Zeile exakt 3 `<w:tc>`, Zellinhalte an der richtigen Position.
2. Dieselbe Datei erneut importieren → im Editor sichtbar identische Zeilen-/
   Spaltenzahl und Zellinhalte an denselben Positionen.
3. Vorhandene, mit diesem Editor unverändert (ohne jede Bearbeitung) importierte
   fremde DOCX-Datei mit Tabelle → unverändert exportieren → erneut importieren →
   Zellinhalte identisch (kein Verlust durch den hartkodierten `w:w="2000"`-Wert
   aus `docx/writer.ts:131`, auch wenn die ursprüngliche Spaltenbreite dabei nicht
   exakt reproduziert wird — das ist als bekannte, zu dokumentierende Einschränkung
   getrennt von reinem Textverlust zu behandeln, siehe Punkt 4).
4. **Rahmen-Validierung (bekannter offener Punkt):** Exportierte DOCX-Datei mit
   frisch im Editor eingefügter Tabelle in einer echten Word-Installation bzw.
   einem unabhängigen Parser öffnen/prüfen → verifizieren, ob Rahmenlinien
   tatsächlich sichtbar sind. Da `docx/writer.ts:170` ein leeres `<w:tblPr/>` ohne
   `<w:tblBorders>`/`<w:tblStyle>` erzeugt, ist zu erwarten, dass die Tabelle in
   Word **ohne** sichtbare Rahmen erscheint, obwohl sie im Editor selbst dank CSS
   berandet dargestellt wird. Muss geklärt werden, ob das so hingenommen wird
   (Rahmen ist reine Editor-Deko) oder ob der Export explizite Rahmen schreiben
   muss, damit „Rahmen sichtbar“ aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6 auch
   nach Export/Re-Import in einer echten Zielanwendung erfüllt ist.
5. Tabelle mit verbundenen Zellen (colspan/rowspan), die über den Import einer
   Fremddatei entstanden ist → unverändert exportieren → erneut importieren →
   Verbund bleibt erhalten (Unit-Test-Ebene bereits vorhanden,
   `docx/__tests__/roundtrip.test.ts:205-248`; hier zusätzlich über echten
   Datei-Upload/-Download nachzuweisen, nicht nur über konstruierte JSON-Daten).
6. Cross-Format: ODT mit Tabelle importieren → als DOCX exportieren → Zeilen-/
   Spaltenzahl und Zellinhalte bleiben erhalten.
7. Reale komplexe Fremddatei mit großer Tabelle (> 5 Spalten, > 10 Zeilen,
   gemischte Formatierung) importieren, unverändert exportieren, erneut
   importieren → Zellinhalte identisch (bereits als Testfall in
   `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6, Testfall 9 gefordert).

### 4.2 ODT
1. Über den neuen Dialog eine 4×3-Tabelle einfügen, Zellen befüllen, als ODT
   exportieren → `content.xml` enthält exakt 4 `<table:table-row>`, je Zeile exakt
   3 `<table:table-cell>`.
2. **Struktur-Validierung (bekannter offener Punkt):** Anzahl der erzeugten
   `<table:table-column>`-Elemente muss der tatsächlichen Spaltenzahl entsprechen.
   Da `odt/writer.ts:88` die Spaltenzahl über `rows[0]?.content?.length` (Anzahl
   der **Zellen** der ersten Zeile) statt über die Summe der `colspan`-Werte
   ermittelt (im Gegensatz zum korrekten DOCX-Äquivalent in `docx/writer.ts:130`),
   ist bei einer horizontal verbundenen Zelle in der ersten Zeile mit einer **zu
   niedrigen** `<table:table-column>`-Anzahl relativ zur tatsächlich benötigten
   Spaltenzahl zu rechnen. Muss mit einem gezielten Testfall (Tabelle mit
   `colspan`-Zelle **in der ersten Zeile**, gefolgt von einer normalen Zeile mit
   mehr Zellen als `rows[0].content.length`) nachgewiesen und andernfalls als
   Defekt vor Abnahme behoben werden.
3. Dieselbe Datei erneut importieren → identische Zeilen-/Spaltenzahl und
   Zellinhalte.
4. Tabelle mit verbundenen Zellen (colspan/rowspan) → Rundreise erhält Verbund
   (Unit-Test-Ebene bereits vorhanden, `odt/__tests__/roundtrip.test.ts:194-209`;
   hier zusätzlich über echten Datei-Upload/-Download nachzuweisen).
5. Cross-Format: DOCX mit Tabelle importieren → als ODT exportieren → Zeilen-/
   Spaltenzahl und Zellinhalte bleiben erhalten.
6. Zwei Tabellen im selben Dokument → beide erhalten bei Rundreise eindeutige,
   nicht kollidierende Tabellennamen (`odt/writer.ts:109` vergibt aktuell einen
   zufälligen Namen per `Math.random()` — mit einem Testfall nachweisen, dass auch
   bei wiederholten Exporten keine Namenskollision zwischen mehreren Tabellen im
   selben Dokument auftritt).
7. Reale komplexe Fremddatei mit großer Tabelle importieren, unverändert
   exportieren, erneut importieren → Zellinhalte identisch.

### 4.3 Doppelte Rundreise / Cross-Format hin und zurück
1. DOCX mit Tabelle → Editor → Export als ODT → erneuter Import → Export zurück
   als DOCX → Zeilen-/Spaltenzahl und Zellinhalte nach zwei Formatkonvertierungen
   weiterhin identisch zum Original (Spaltenbreite/Rahmen-Feinheiten dürfen sich
   dabei ändern bzw. verloren gehen — das ist laut Abschnitt 4.1/4.2 zu
   dokumentieren, **Zellinhalt/Struktur-Verlust jedoch nicht**).
2. Dieselbe Prüfung mit Startpunkt ODT.

---

## 5. Testfälle für die Verifikation (E2E, echte Bedienung im Browser)

Bereits vorhandener, aber laut Auftrag **nicht als vertrauenswürdig geltender**
Test (muss im Rahmen dieser Verifikation erneut geprüft und ggf. erweitert werden):
- `tests/e2e/selection-regression.spec.ts:34` „same regression inside a table cell
  (click between cells after formatting)“ — deckt ausschließlich den
  Selection-Sync-Bug ab, keine Größenwahl, keine Rundreise.

Zusätzlich zu schreibende Testfälle, damit alle Abschnitte 1–4 dieser Anforderung
abgedeckt sind:

1. Klick auf „Tabelle einfügen“ → Dialog öffnet sich sichtbar (muss zuerst gebaut
   werden, aktuell **nicht vorhanden** — dieser Test kann erst nach Umsetzung des
   Dialogs geschrieben werden).
2. Im Dialog Zeilen=4, Spalten=3 eingeben, „Einfügen“ klicken → Tabelle mit genau 4
   sichtbaren Zeilen und 3 sichtbaren Spalten erscheint im Editor.
3. Dialog mit Standardwerten (ohne Eingabe) direkt bestätigen → sinnvolle
   Standardgröße wird eingefügt.
4. Dialog mit ungültiger Eingabe (0, negativ, Text) → Fehlermeldung sichtbar, keine
   Tabelle eingefügt.
5. Dialog öffnen, Escape drücken → kein Element im DOM verändert, Editor-Fokus/
   Cursor-Position unverändert.
6. In jede Zelle der frisch eingefügten Tabelle per echtem Playwright-Klick tippen
   → Inhalt landet in der richtigen Zelle (Erweiterung des bestehenden Tests
   `selection-regression.spec.ts:34` auf **alle** Zellen, nicht nur zwei).
7. Tab-Taste in einer Zelle drücken → Cursor springt in die nächste Zelle (aktuell
   zu erwartender **Fehlschlag**, siehe Grenzfall 3.9/3.10 — Test dokumentiert den
   Ist-Zustand und wird nach Behebung grün).
8. Tab in der letzten Zelle der letzten Zeile → neue Zeile wird erzeugt (aktuell
   zu erwartender **Fehlschlag**).
9. Undo direkt nach Tabellen-Einfügen → Tabelle verschwindet vollständig, Text
   davor/danach unverändert.
10. Redo stellt die Tabelle inklusive korrekter Größe wieder her.
11. Tabelle einfügen an Cursor-Position mit vorhandenem Text davor und danach →
    beide Textteile bleiben erhalten, Tabelle sitzt exakt dazwischen.
12. Tabelle einfügen bei aktiver Textselektion → markierter Text wird ersetzt,
    definiertes Verhalten aus Grenzfall 3.5 bestätigt.
13. Tabelle einfügen mit Cursor bereits in einer bestehenden Tabellenzelle →
    Ergebnis (verschachtelte Tabelle oder Verhinderung, siehe Grenzfall 3.7)
    entspricht der getroffenen Entscheidung, kein Absturz.
14. Vollständiger Rundreisetest DOCX (4.1) über echten Datei-Upload
    (`filechooser`) und echten Download-Abfangmechanismus
    (`page.waitForEvent('download')`), inklusive Validierung über einen
    unabhängigen Parser.
15. Vollständiger Rundreisetest ODT (4.2) ebenso, inklusive gezieltem Test für die
    `<table:table-column>`-Zählung bei einer `colspan`-Zelle in der ersten Zeile.
16. Cross-Format-Rundreise (4.3) einmal DOCX→ODT→DOCX, einmal ODT→DOCX→ODT.
17. Große Tabelle (z. B. 20×20) einfügen → UI bleibt bedienbar, kein Einfrieren,
    Export/Import bleibt in vertretbarer Zeit.
18. Reale komplexe Fremddatei mit großer Tabelle importieren, unverändert
    exportieren, erneut importieren → Zellinhalte identisch (Ergänzung zu
    `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6, Testfall 9, hier mit Fokus auf den
    hartkodierten `w:w="2000"`- bzw. fehlerhaften `table:table-column`-Fall).
19. Regressionstest `selection-regression.spec.ts:34` erneut ausführen und als
    Pflichtbestandteil der Dauer-Suite bestätigen.

---

## 6. Abnahmekriterien (Definition of Done)

Der Status „teilweise“ für „Tabelle einfügen“ darf erst dann auf „verifiziert“
geändert werden, wenn:

1. Der Zeilen-/Spalten-Auswahldialog gebaut, verdrahtet und über alle Testfälle
   aus Abschnitt 5 (Punkte 1–5) nachgewiesen ist — die feste 2×2-Direkteinfügung
   ist vollständig ersetzt.
2. Tab-/Umschalt+Tab-Navigation zwischen Zellen inklusive „neue Zeile am Ende“
   gebaut und über die Testfälle 7–8 aus Abschnitt 5 nachgewiesen ist.
3. Alle Testfälle aus Abschnitt 5 tatsächlich ausgeführt wurden (echte
   Browser-Interaktion, nicht nur Unit-/Command-Ebene) und grün sind.
4. Alle Rundreise-Anforderungen aus Abschnitt 4 (DOCX, ODT, Cross-Format) durch
   einen unabhängigen Parser bzw. durch erneuten Import bestätigt sind, inklusive
   der beiden konkret benannten Datenfehler:
   - der zu niedrigen `<table:table-column>`-Zählung bei `colspan` in der ersten
     Zeile des ODT-Writers (`odt/writer.ts:88`),
   - der Rahmen-Frage beim DOCX-Export (`docx/writer.ts:170`, leeres `<w:tblPr/>`).
5. Alle Grenzfälle aus Abschnitt 3 einzeln geprüft und deren tatsächliches
   Verhalten dokumentiert ist (auch wenn das Ergebnis „bewusst so gewollt,
   dokumentiert“ statt „Bug, behoben“ lautet).
6. Die offene Frage aus Grenzfall 3.7 (verschachtelte Tabelle durch aktives
   Einfügen) explizit beantwortet und das Ergebnis hier nachgetragen wurde.
7. Der Regressionstest für den Selection-Sync-Bug innerhalb von Tabellenzellen
   (`selection-regression.spec.ts:34`) dauerhaft Teil der Testsuite bleibt und
   weiterhin besteht.
8. Die Spaltenbreiten-Einschränkung aus Abschnitt 2.5 (im Editor änderbar, beim
   Export aber vollständig ignoriert) bewusst als Einschränkung dokumentiert oder
   behoben wurde — nicht länger unbekannt/unentdeckt bleibt.

Erst nach Erfüllung aller acht Punkte darf der Backlog-Status von „teilweise
(nicht vertrauenswürdig)“ auf „verifiziert“ geändert werden.
