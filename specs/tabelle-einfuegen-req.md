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
Bearbeitbarkeit der frisch eingefügten Tabelle inkl. Klick-Navigation,
Tab-Navigation und Undo direkt nach dem Einfügen) für **beide** Formate, DOCX und
ODT — sowohl als neu im Editor erzeugtes Element als auch beim Export und der
anschließenden Rundreise (Datei hochladen bzw. im Editor erzeugen → unverändert
exportieren → erneut importieren → Ergebnis entspricht inhaltlich dem Original).
Stil und Gliederung orientieren sich an `E:\docs\FEATURE-SPEC-DOCX-ODT.md`.

**Ausdrücklich außerhalb des Geltungsbereichs** dieser Datei (eigene, separate
Backlog-Einträge in `FEATURE-BACKLOG.md` Abschnitt 3.2, Zeilen 182–197, jeweils
Status „fehlt“, dort einzeln zu verifizieren, sobald gebaut): `zeile-einfuegen`
(Z. 183), `zeile-loeschen` (184), `spalte-einfuegen` (185), `spalte-loeschen`
(186), `zellen-verbinden` (187), `zellen-teilen` (188), `tabelle-loeschen` (189),
`tabelle-eigenschaften` (190), `tabellenformatvorlagen` (191),
`kopfzeile-wiederholen` (192), `text-in-tabelle-umwandeln` (193),
`tabelle-in-text-umwandeln` (194), `tabellenformel` (195), `tabelle-sortieren`
(196), `tabelle-autoanpassen` (197), `tabelle-zeichnen` (182). Diese Datei
behandelt sie **nur** dort, wo sie unmittelbar berühren, ob eine frisch eingefügte
Tabelle überhaupt sinnvoll nutzbar ist (z. B. Tab-Navigation zwischen Zellen, Undo,
Klick-Bearbeitbarkeit) — nicht als eigenständig zu verifizierende Funktionen.

---

## 0. Verifikations-Notiz (diese Überarbeitung)

Diese Datei stammt aus einem früheren Durchlauf und enthielt zahlreiche
**inhaltlich veraltete Aussagen**. Der gesamte referenzierte Code wurde am
2026-07-04 gegen den lokalen Arbeitsstand (`E:\docs\src`) neu geprüft. Ergebnis der
Prüfung, das in diese Fassung eingearbeitet ist:

1. **Alle Zeilennummern der Vorfassung waren verschoben** (die Quelldateien sind
   seither gewachsen). Sämtliche Fundstellen unten wurden gegen den aktuellen Stand
   korrigiert. **Nachkontrolle am 2026-07-05:** Sämtliche Fundstellen wurden erneut
   direkt gegen `E:\docs\src` geprüft. Ergebnis: alle Referenzen auf `Toolbar.tsx`,
   `commands.ts`, `schema.ts`, `docx/writer.ts`, `docx/reader.ts`, `odt/writer.ts`,
   `odt/reader.ts`, `index.css` sowie die zitierten Test- und Backlog-Zeilen stimmen
   weiterhin. **Ausschließlich die `WordEditor.tsx`-Zeilennummern waren erneut
   gedriftet** (genau der in dieser Notiz gewarnte Fall) und sind in dieser Fassung
   auf den Stand vom 2026-07-05 nachgezogen: `history()` Z. 84, `keymap`-Blöcke
   Z. 85-108, `columnResizing()` Z. 109, `tableEditing()` Z. 110, `gapCursor()`
   Z. 112, Kontextmenü-Kommentar Z. 117-121, Mouse-Listener-Setup Z. 141-155.
   **Hinweis für Folge-Agenten:** Zeilennummern können erneut driften — im Zweifel
   per Symbol-/Textsuche (`insertTable`, `tableToDocx`, `MAX_TABLE_NESTING_DEPTH`,
   `TableNameSequence`) verankern, nicht blind auf die Zahl vertrauen.
2. **Zwei in der Vorfassung als offene Defekte geführte ODT-Fehler sind bereits
   behoben und durch bestehende Tests abgesichert** — sie dürfen **nicht** erneut
   als „zu findende/zu behebende Bugs“ in die Definition of Done aufgenommen werden
   (das wäre eine übernommene Schwäche). Konkret:
   - **ODT-Spaltenzahl (`table:table-column`):** Der ODT-Writer summiert die
     `colspan`-Werte der ersten Zeile korrekt auf (`odt/writer.ts:115-116`), exakt
     wie der DOCX-Writer (`docx/writer.ts:160`). Ein Test prüft für eine
     `colspan=2`-Zelle in der ersten Zeile bereits, dass genau 2
     `<table:table-column/>` erzeugt werden (`odt/__tests__/roundtrip.test.ts:298`,
     `expect(...).toBe(2)`). Die Vorfassung behauptete das Gegenteil (Zählung über
     `rows[0].content.length`, kein Test) — **falsch**.
   - **ODT-Tabellenname (`table:name`):** Vergabe erfolgt deterministisch über die
     Klasse `TableNameSequence` → „Table1“, „Table2“ … (`odt/writer.ts:54-60`,
     Aufruf `:173`), **nicht** mehr über `Math.random()`. Ein Determinismus-Test
     (`odt/__tests__/roundtrip.test.ts:529-572`) sichert ab, dass zwei Exporte
     desselben Dokuments byte-identisch sind und zwei Tabellen zwei verschiedene
     Namen tragen.
   Für beide gilt daher: **Regressions-Absicherung erhalten, nicht neu „beheben“.**
3. **Weiterhin gültig** (unabhängig geprüft, keine Reparatur im Code gefunden):
   feste 2×2-Direkteinfügung ohne Dialog; keine Tab-/Umschalt+Tab-Zellnavigation;
   leeres `<w:tblPr/>` im DOCX-Export (keine Rahmen in echtem Word); hartkodierte
   Spaltenbreite `w:w="2000"` im DOCX-Export; `colwidth` wird von **keinem** Writer
   ausgelesen (im Editor per Ziehen geänderte Spaltenbreite geht beim Export
   verloren); beide Reader setzen `colwidth: null`. Details in der Tabelle unten.
4. **Diese Überarbeitung (erneute kritische PO-Prüfung, 2026-07-05):** Der gesamte
   Text wurde nochmals gegen den Code gelesen (Ergebnis: alle Fundstellen weiterhin
   exakt zutreffend, siehe Tabelle unten) und zusätzlich auf inhaltliche Lücken statt
   nur auf Zeilennummern-Drift geprüft. Zwei Lücken wurden gefunden und unten
   geschlossen, statt unverändert übernommen zu werden:
   - **Touch-/Mobile-/Tablet-Bedienung des neuen Dialogs fehlte vollständig.** Das
     Projekt betreibt drei Playwright-Projekte, die jede UI-Änderung abdecken müssen
     (`playwright.config.ts:34-36`: „Desktop Chrome“, „Mobile“ (Pixel 7, Touch),
     „Tablet“ (iPad Mini)); die parallele Anforderung `spalte-einfuegen-req.md`
     verlangt für ihre neuen Toolbar-Buttons explizit einen Touch-Grundfall
     (Menüpunkt 6, Grenzfall 15, DoD 10). Diese Datei hatte dazu bislang **keine**
     Zeile — ergänzt als Menüpunkt 11, Abschnitt 2.10, Grenzfall 17, Testfall 21,
     DoD 10.
   - **Tastatur-Aktivierung des Toolbar-Buttons selbst war nicht gefordert.** Der
     Button löst wie alle Toolbar-Buttons über `onMouseDown`+`preventDefault()` aus
     (`Toolbar.tsx:282-283`), **nicht** über `onClick`. Browserübergreifend gilt:
     Aktivierung eines fokussierten `<button>` per **Leertaste** löst vor dem
     `click` zusätzlich ein synthetisches `mousedown`/`mouseup`-Paar aus, Aktivierung
     per **Enter** löst **ausschließlich** ein `click`-Ereignis aus, **ohne**
     vorausgehendes `mousedown`. Ein Button, der nur auf `onMouseDown` reagiert,
     reagiert damit möglicherweise **nicht** auf Enter, obwohl er per Leertaste und
     Maus funktioniert. Bisher von keiner der drei Bible-Phasen (Anforderung, Plan,
     Testplan) und von keinem bestehenden E2E-Test geprüft — vorhandene Tests
     lösen Klicks ausschließlich über Playwrights `click()` aus (vollständige
     Maus-Ereignisfolge), nie über einen fokussierten, per Tastatur ausgelösten
     Button. Da dieser Button gerade von einer sofortigen Direktaktion zu einem
     **Dialog-Öffner** umgebaut wird, wiegt ein stiller Fehlschlag hier schwerer als
     zuvor (Enter tut scheinbar nichts, statt wie bisher zumindest eine feste 2×2-
     Tabelle einzufügen) — ergänzt als Menüpunkt 12, Grenzfall 18, Testfall 22, DoD 11.
   - **Die „reale komplexe Fremddatei“-Rundreise (Abschnitt 4.1/4.2, Punkt 7) war
     ohne konkreten Dateinamen formuliert**, anders als die parallelen Anforderungen
     `spalte-einfuegen-req.md`/`zellen-verbinden-req.md`, die jeweils einen
     namentlich verifizierten Fixture nennen. Ergänzt um zwei tatsächlich geprüfte
     Kandidaten: `tests/fixtures/external/docx/bug57031.docx` (230 `<w:tr>`,
     verifiziert bereits in `zellen-verbinden-req.md` Abschnitt 0/5 als reale Datei
     mit großer Tabellenstruktur) und `tests/fixtures/external/odt/BigTable.odt`
     (verifiziert: 25 `<table:table-row>`, 16 `<table:table-column>` — erfüllt „> 5
     Spalten, > 10 Zeilen“ deutlich).

Referenzierter Ist-Stand des Codes (Grundlage dieser Anforderung, **kein** Nachweis
der Korrektheit — das ist Aufgabe der Verifikation):

| Ort | Inhalt |
|---|---|
| `src/formats/shared/editor/Toolbar.tsx:277-289` | Toolbar-Button „⊞ Tabelle“, `title`/`aria-label="Tabelle einfügen"`, `aria-pressed={isInTable(view.state)}`; `onMouseDown` mit `preventDefault()` (Z. 282-283) ruft **fest verdrahtet** `run(view, insertTable(2, 2))` auf (Z. 284) — kein Dialog, keine Eingabe der Zeilen-/Spaltenzahl. Der Helper `run()` (Z. 28-31) führt das Command aus und ruft danach `view.focus()`. |
| `src/formats/shared/editor/commands.ts:92-102` | `insertTable(rows, cols)` — Command ist bereits **parametrisiert** (nimmt beliebige Zeilen-/Spaltenzahl), erzeugt jede Zelle mit `table_cell.createAndFill()!` (Z. 95, füllt jede Zelle mit einem leeren Absatz → sofort beschreibbar) und ersetzt die aktuelle Selektion (`state.tr.replaceSelectionWith(table)`, Z. 98). Die UI nutzt diese Parametrisierung derzeit nicht. `isInTable` wird aus `prosemirror-tables` re-exportiert (Z. 6). |
| `src/formats/shared/schema.ts:2,154` | `import { tableNodes }` (Z. 2); `...tableNodes({ tableGroup: 'block', cellContent: 'block+', cellAttributes: {} })` (Z. 154). Standardattribute `colspan`, `rowspan`, `colwidth` je Zelle vorhanden (von `tableNodes` immer erzeugt, unabhängig von `cellAttributes`). `tableGroup: 'block'` + `cellContent: 'block+'` bedeutet: Tabellen sind überall dort erlaubt, wo Absätze erlaubt sind — **auch innerhalb einer Tabellenzelle**; verschachtelte Tabellen sind schemaseitig also nicht verboten. Es gibt zusätzlich einen Header-Zell-Typ (`table_header`) samt CSS (`index.css:58-61`); `insertTable` erzeugt jedoch ausschließlich `table_cell`, also **keine** Kopfzeile. |
| `src/formats/shared/editor/WordEditor.tsx:8,109-110` | `import { tableEditing, columnResizing }` (Z. 8). Plugins `columnResizing()` (Z. 109) und `tableEditing()` (Z. 110) aktiv. Der `keymap`-Block (Z. 85-107) bindet `Mod-z/y`, `Mod-Shift-z`, `Enter=splitListItem`, `Shift-Enter=insertHardBreak`, `Mod-b/i/u`, `Shift-Delete=cutSelection` — **kein** Eintrag für `Tab`/`Shift-Tab`; `baseKeymap` (Z. 108) bindet `Tab` ebenfalls nicht. `goToNextCell` aus `prosemirror-tables` wird nirgends importiert (Textsuche über `src/` liefert keinen Treffer). `history()` (Z. 84) macht `insertTable` zu einem einzelnen Undo-Schritt. Der Selection-Sync-Fix (Mouseup-Reconciliation) liegt in `reconcileSelectionOnClick` (Z. 43-50) und dem Mouse-Listener-Setup (Z. 141-155). |
| `node_modules/prosemirror-tables` (Paket-Exporte) | Stellt fertige Commands `addRowAfter/Before`, `deleteRow`, `addColumnAfter/Before`, `deleteColumn`, `mergeCells`, `splitCell`, `deleteTable`, `goToNextCell`, `toggleHeaderRow/Column/Cell` bereit — **keine** davon wird aktuell in `src/formats/shared/editor/*` importiert oder verwendet; die „größte Einzellücke“ aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 17 (Zeile 373) ist also keine fehlende Bibliotheksfunktion, sondern ausschließlich fehlende UI-Verdrahtung. |
| `src/formats/docx/reader.ts:309,311,350` | `MAX_TABLE_NESTING_DEPTH = 25` (Z. 309) als Schutz gegen absichtlich pathologisch verschachtelte Testdateien; `parseTable()` ab Z. 311, verschachtelte Tabellen nur bis Tiefe 25 (Z. 340-342); liest `w:gridSpan`/`w:vMerge` korrekt in `colspan`/`rowspan` (Z. 324-333); setzt `colwidth` **immer fest auf `null`** (Z. 350) — `w:tcW`/`w:tblGrid`-Spaltenbreite wird nicht ausgelesen. |
| `src/formats/docx/writer.ts:158-201` | `tableToDocx()`; `colCount` **summiert `colspan` korrekt** (Z. 160); Z. 161 erzeugt `<w:gridCol w:w="2000"/>` **hartkodiert für jede Spalte**, unabhängig vom Zellinhalt/einer im Editor gesetzten Breite; voll ausgebaute `pending`-Logik für vertikal verbundene Zellen (`<w:vMerge/>`); Z. 200 `<w:tbl><w:tblPr/>${grid}${rowsXml}</w:tbl>` — `<w:tblPr/>` **komplett leer**, kein `<w:tblBorders>`, kein `<w:tblStyle>`. Eine exportierte DOCX-Tabelle hat in echtem Word ohne weiteres Zutun **keine sichtbaren Rahmenlinien**, obwohl sie im Editor per CSS berandet dargestellt wird. |
| `src/formats/odt/writer.ts:54-60,110-175` | Tabellenfall in `blockToOdt()` (Z. 110-175). `colCount` summiert **`colspan` korrekt** (Z. 115-116, mit erläuterndem Kommentar) — erzeugt so viele `<table:table-column/>` wie tatsächlich Spalten (Z. 117). Voll ausgebaute `pending`-Logik erzeugt pro Zeile das nach ODF 1.3 §9.1.1 erforderliche volle Raster aus `<table:table-cell/>`/`<table:covered-table-cell/>` (Z. 126-169). Tabellenname deterministisch via `TableNameSequence` (Klasse Z. 54-60, Aufruf `tableNames.next()` Z. 173). **Keine** Spaltenbreite im Export (`<table:table-column/>` ohne `style-name`/Breite) → `colwidth` geht auch hier verloren. |
| `src/formats/odt/reader.ts:305-306,315` | Liest `table:number-columns-spanned`/`table:number-rows-spanned` korrekt in `colspan`/`rowspan` (Z. 305-306); setzt `colwidth` ebenfalls **immer fest auf `null`** (Z. 315). |
| `src/index.css:44-61` | `.ProseMirror table { border-collapse: collapse; width: 100%; margin: 0.6em 0; }` (Z. 44-48); `.ProseMirror td, th { border: 1px solid #9ca3af; padding: 4px 8px; min-width: 2em; vertical-align: top; }` (Z. 50-56); `.ProseMirror th { background: #f3f4f6; font-weight: 600; }` (Z. 58-61). Der Rahmen ist eine reine **Editor-CSS-Darstellung**, unabhängig davon, ob der Export Rahmeninformation schreibt (siehe DOCX-Writer oben). |
| `src/app/PrivacyModal.tsx` | Einziges im Projekt vorhandenes Modal-Muster: ein `fixed inset-0 z-50`-Overlay mit einer zentrierten Karte und einem einzigen „Verstanden“-Button. Es implementiert **weder** Escape-Schließen **noch** Klick-außerhalb-Schließen **noch** eine Fokus-Falle — taugt also nur als **Styling-Vorlage**, nicht als fertiges A11y-Dialogmuster. Ein Tabellengrößen-Dialog muss komplett neu gebaut werden (inkl. der genannten Schließ-/Fokus-Mechanismen). |
| `tests/e2e/selection-regression.spec.ts:43-59` | Einziger vorhandener E2E-Test, der eine Tabelle über die UI erzeugt (`page.getByRole('button', { name: 'Tabelle einfügen' }).click()`, Z. 46 → fügt aktuell die feste 2×2 ein). Testet ausschließlich den Selection-Sync-Bug beim Klickwechsel zwischen zwei Zellen (Z. 43-59); **keine** Größenwahl, **keine** Rundreise, **keine** Tab-Navigation. |
| `src/formats/docx/__tests__/roundtrip.test.ts:229-303` | Unit-Tests für Zeilen/Spalten/Zellinhalt (Z. 229-259) sowie `colspan` (Z. 261-277) und `rowspan` (Z. 279-304); zusätzlich Tabelle in „whole-document fidelity“ (Z. 387) und CellSelection-Paste inkl. `colspan` (Z. 512-533) — alle arbeiten mit **direkt konstruierten** JSON-Testdaten, **nicht** über Toolbar/Dialog. |
| `src/formats/odt/__tests__/roundtrip.test.ts:219-339` | Analoge ODT-Unit-Tests: Zeilen/Spalten/Text (Z. 220), `colspan/rowspan` (Z. 251); **plus** zwei ODF-Konformitätstests: horizontaler Merge mit **Prüfung der Spaltenzahl** (`<table:table-column/>`-Count `.toBe(2)`, Z. 298) und `covered-table-cell` (Z. 275-308) sowie vertikaler Merge (Z. 310-339); außerdem Determinismus/`table:name`-Test (Z. 529-572, prüft zwei verschiedene Namen). Ebenfalls nur konstruierte Testdaten, nicht über die UI. |

---

## 1. Menüpunkte/Bedienelemente

| # | Element | Fundstelle | Ist-Verhalten laut Code | Anforderung |
|---|---|---|---|---|
| 1 | Toolbar-Button „⊞ Tabelle“ (`title`/`aria-label` „Tabelle einfügen“) | `Toolbar.tsx:277-289` | `onMouseDown` mit `preventDefault()` ruft **direkt** `insertTable(2, 2)` auf (Z. 284) — keine Rückfrage, keine Auswahl | Klick öffnet einen **Dialog/eine Auswahl** zur Zeilen-/Spaltenwahl, bevor die Tabelle eingefügt wird; die feste 2×2-Größe entfällt als einziger Weg |
| 2 | Zeilen-/Spalten-Auswahldialog | **nicht vorhanden** (kein Dialog-Code im gesamten `src`; `PrivacyModal.tsx` ist das einzige Modal-Muster, jedoch ohne Escape/Klick-außerhalb/Fokus-Falle) | — | Numerische Eingabe für Zeilen und Spalten (mind. zwei Zahlenfelder, alternativ ein Hover-Raster analog Word/LibreOffice bis zu einer sinnvollen Obergrenze); sinnvoller Standardwert vorbelegt (z. B. 3×3 oder der zuletzt verwendete Wert); Bestätigen-Button fügt ein, Abbrechen/Escape/Klick außerhalb schließt ohne Änderung |
| 3 | Eingabevalidierung im Dialog | nicht vorhanden (Dialog existiert nicht) | — | Ganzzahlige Werte ≥ 1 für Zeilen und Spalten; nicht-numerische/negative/Null/leere Eingabe wird abgefangen mit sichtbarer, **per Screenreader angekündigter** Fehlermeldung (`role="alert"`/`aria-live`, analog `FEATURE-SPEC-DOCX-ODT.md` §20.4 „Kein stiller Fehlschlag“) statt stillem Fehlschlag oder Absturz; sinnvolle Obergrenze (siehe Grenzfall 3.3) mit Fehlermeldung statt UI-Einfrieren. **Wiederverwendbares Muster bereits im Editor vorhanden:** das transiente `role="alert"`-Banner mit `useAutoDismiss` (`WordEditor.tsx:52-74`), das heute die „Ausschneiden“-Fehlermeldung anzeigt |
| 4 | Command `insertTable(rows, cols)` | `commands.ts:92-102` | Bereits vollständig parametrisiert; funktional unabhängig von der UI über direkt konstruierte Aufrufe belegbar | Dialog ruft ausschließlich diese bestehende Funktion mit den eingegebenen Werten auf — **keine** Änderung an der Commandfunktion nötig, nur an der Toolbar-Anbindung |
| 5 | Tastenkombination zum Einfügen | nicht vorhanden | — | Kein Blocker; optional ergänzbar. Mindestens der Dialog-Weg über die Toolbar muss zuverlässig funktionieren |
| 6 | Kontextmenü (Rechtsklick) „Tabelle einfügen“ | nicht vorhanden (WordEditor bindet bewusst kein eigenes `contextmenu`, siehe `WordEditor.tsx:117-121`) | — | Nicht Teil dieser Anforderung; als fehlend dokumentiert, falls Nutzererwartung besteht |
| 7 | Zellen-Klick nach dem Einfügen | `WordEditor.tsx:110` (`tableEditing()`) | Klick in eine Zelle positioniert den Cursor über Standard-ProseMirror-Verhalten; projektspezifisch greift zusätzlich die Mouseup-Reconciliation (`WordEditor.tsx:43-50,141-155`) | Klick in jede Zelle der frisch eingefügten Tabelle platziert den Cursor zuverlässig in genau dieser Zelle, inkl. Zusammenspiel mit dem Selection-Sync-Bug aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2 (siehe Grenzfall 3.13, bereits mit `selection-regression.spec.ts:43-59` abgedeckt) |
| 8 | Tab-/Umschalt+Tab-Navigation zwischen Zellen | `WordEditor.tsx:85-108` — **kein** `keymap`-Eintrag für `Tab`, `goToNextCell` nicht gebunden | Ohne eigene Bindung hat `Tab` im `contenteditable` keine definierte Editor-Wirkung; wahrscheinlich springt der Browser-Fokus aus dem Editor heraus zum nächsten fokussierbaren Seitenelement | `Tab` springt zur nächsten Zelle, `Shift+Tab` zur vorherigen; `Tab` in der letzten Zelle der letzten Zeile fügt eine neue Zeile hinzu (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6). **Muss zuerst gebaut werden** (Bindung von `goToNextCell` plus eigene „neue Zeile am Ende“-Logik); gilt bis zum Nachweis als **nicht funktional** |
| 9 | Undo (Strg+Z) direkt nach Tabellen-Einfügen | `WordEditor.tsx:84` (`history()`) | Sollte generisch funktionieren, da `insertTable` genau **eine** Transaktion erzeugt | Ein Strg+Z direkt nach dem Einfügen entfernt die komplette Tabelle wieder vollständig und stellt Cursor-/Textzustand her; als Testfall in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2, Testfall 7 gefordert, aktuell **nicht** durch einen eigenen Test abgesichert |
| 10 | Zeilen-/Spalten-Kontextfunktionen (Zeile/Spalte einfügen/löschen, verbinden/teilen, Tabelle löschen) | vollständig fehlend in der UI (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 17, Zeile 373) | — | **Außerhalb des Geltungsbereichs** — eigene Backlog-Slugs (siehe Kopf). Hier nur insofern relevant, als eine frisch eingefügte Tabelle ohne diese Funktionen zwar „eingefügt”, aber kaum nachträglich anpassbar ist |
| 11 | Touch-Bedienung von Toolbar-Button und Dialog (Mobile/Tablet) | ungeprüft (Feature existiert noch nicht; die drei Playwright-Projekte „Desktop Chrome“/„Mobile“ (Pixel 7)/„Tablet“ (iPad Mini) aus `playwright.config.ts:34-36` decken jede neue UI grundsätzlich ab) | — | Antippen des Buttons öffnet den Dialog, Antippen der Eingabefelder und des „Einfügen“-Buttons fügt die Tabelle ein — auf **allen drei** Projekten, nicht nur Desktop Chrome (siehe 2.10, Grenzfall 17) |
| 12 | Tastatur-Aktivierung des Toolbar-Buttons selbst (Enter **und** Leertaste, nicht nur Mausklick) | Button löst wie alle Toolbar-Buttons über `onMouseDown`+`preventDefault()` aus (`Toolbar.tsx:282-283`), **nicht** über `onClick`; **zu verifizieren**, ob ein fokussierter Button, der nur auf `onMouseDown` reagiert, auf eine per **Enter** ausgelöste Aktivierung reagiert (Enter erzeugt browserübergreifend nur ein `click`-Ereignis ohne vorausgehendes `mousedown`; Leertaste erzeugt zusätzlich ein synthetisches `mousedown`/`mouseup`) | Der Button muss sich per Maus, Leertaste **und** Enter zuverlässig auslösen lassen — kein stiller Fehlschlag bei Tastaturbedienung (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.4). Reagiert er auf Enter nicht, ist die Auslösung entsprechend zu ergänzen (z. B. zusätzliche `onClick`-Bindung), nicht nur zu dokumentieren (siehe 2.9, Grenzfall 18) |

---

## 2. Gewünschtes Verhalten im Detail

### 2.1 Öffnen des Dialogs
- Klick auf den Toolbar-Button „Tabelle einfügen“ öffnet **immer** zuerst den
  Größenwahl-Dialog — es gibt keinen Modus, der ohne Rückfrage direkt einfügt (die
  feste 2×2-Direkteinfügung aus `Toolbar.tsx:284` entfällt vollständig).
- Der Dialog erscheint sichtbar über/neben dem Editor und ist schließbar via
  Escape/„Abbrechen“/Klick außerhalb. Das bestehende `PrivacyModal.tsx` liefert nur
  das Styling-Muster (Overlay + zentrierte Karte); die Schließ- und
  Fokus-Mechanismen (Escape, Klick-außerhalb, Fokus-Falle, Fokus-Rückgabe an den
  Editor beim Schließen) müssen **neu** implementiert werden.
- Fokus liegt beim Öffnen auf dem ersten Eingabefeld (vollständige
  Tastatur-Bedienung ohne Maus möglich).
- **Implementierungs-Fallstrick (Selektion):** Der bestehende Button nutzt
  `onMouseDown`+`preventDefault()`, um Fokus/Selektion vor dem Einfügen nicht zu
  verlieren. Beim Dialog-Weg findet das eigentliche Einfügen **später** statt
  (Klick auf „Einfügen“ im Dialog), wenn der Editor den Fokus möglicherweise an den
  Dialog verloren hat. Die Cursor-Position/Selektion zum Öffnungszeitpunkt muss
  daher festgehalten und beim Einfügen wiederhergestellt werden, sonst landet die
  Tabelle an unerwarteter Stelle (siehe Grenzfall 3.16).

### 2.2 Eingabe und Bestätigung der Größe
- Zwei unabhängige Eingaben: Zeilenzahl und Spaltenzahl, jeweils ganzzahlig ≥ 1.
- Standardwert vorbelegt (z. B. 3×3), damit ein reiner Klick auf „Einfügen“ ohne
  weitere Eingabe ein sinnvolles Ergebnis liefert.
- Bestätigen (Button „Einfügen“ oder Enter in einem der Felder) ruft
  `insertTable(rows, cols)` (`commands.ts:92`) mit genau den eingegebenen Werten auf
  und schließt den Dialog.
- Abbrechen (Button „Abbrechen“, Escape, Klick außerhalb) schließt den Dialog
  **ohne** jede Dokumentänderung — Cursor-Position und Selektion bleiben exakt wie
  vor dem Öffnen.

### 2.3 Einfügen an der Cursor-Position
- Die Tabelle wird an der aktuellen Cursor-Position bzw. anstelle der aktuellen
  Selektion eingefügt (`state.tr.replaceSelectionWith(table)`, `commands.ts:98`).
- Ist Text markiert, wird dieser durch die Tabelle **ersetzt** (kein
  Zusammenführen) — das ist Standard-ProseMirror-Verhalten und muss dokumentiert/
  bestätigt sein, nicht als unerwarteter Datenverlust erlebt werden (siehe 3.5).
- Nach dem Einfügen befindet sich der Cursor in einer sinnvollen Zelle (idealerweise
  der ersten), nicht in einem undefinierten Zustand. Der `run()`-Helper ruft nach
  dem Command `view.focus()` (`Toolbar.tsx:30`) — beim Dialog-Weg muss das
  äquivalent sichergestellt sein.

### 2.4 Sofortige Bearbeitbarkeit nach dem Einfügen
- Jede Zelle ist unmittelbar per Klick erreichbar und direkt beschreibbar; jede
  Zelle enthält bereits einen leeren Absatz (`createAndFill()`, `commands.ts:95`),
  Tippen funktioniert also ohne zusätzlichen Klick/Reload.
- Zellinhalt ist selbst formatierbar (fett, Ausrichtung etc.) und kann mehrere
  Absätze enthalten (Schema `cellContent: 'block+'`, `schema.ts:154`).
- Text vor und nach der Tabelle (falls nicht am Dokumentanfang/-ende eingefügt)
  bleibt unverändert erhalten.
- Hinweis: `insertTable` erzeugt nur `table_cell`, **keine** `table_header`-Zeile —
  eine frisch eingefügte Tabelle hat also keine hervorgehobene Kopfzeile (der
  `th`-Stil `index.css:58-61` greift nur bei importierten/anders erzeugten Tabellen).

### 2.5 Darstellung direkt nach dem Einfügen
- Zellrahmen sichtbar (`index.css:52`, `border: 1px solid #9ca3af`), Tabellenbreite
  füllt die Seitenbreite (`width: 100%`, `index.css:46`), Mindestzellbreite `2em`
  (`index.css:54`).
- Alle Zellen zunächst gleich breit; Spaltenbreite ist über `columnResizing()`
  (`WordEditor.tsx:109`) per Ziehen an der Spaltengrenze änderbar — zu verifizieren,
  ob das für frisch eingefügte Tabellen ebenso funktioniert wie für importierte.
- **Bekannte Einschränkung (verifiziert), muss dokumentiert werden:** Eine per
  Ziehen geänderte Spaltenbreite wird im Dokumentmodell als `colwidth` der Zelle
  gespeichert, aber **weder der DOCX- noch der ODT-Writer liest `colwidth` aus**
  (keine `colwidth`-Referenz in beiden Writern). Die individuelle Spaltenbreite geht
  beim Export vollständig verloren: DOCX schreibt für jede Spalte hartkodiert
  `w:w="2000"` (`docx/writer.ts:161`), ODT schreibt `<table:table-column/>` ganz
  ohne Breitenangabe (`odt/writer.ts:117`).

### 2.6 Undo/Redo
- Einfügen der Tabelle ist ein einzelner, eigenständiger Undo-Schritt
  (`history()`, `WordEditor.tsx:84`).
- Undo direkt nach dem Einfügen entfernt die komplette Tabelle wieder und stellt den
  vorherigen Zustand (Cursor-Position, umgebender Text) her.
- Redo stellt die Tabelle inklusive Größe erneut her.
- Funktioniert auch in gemischten Sequenzen (Tippen → Tabelle einfügen → Tippen in
  Zelle → mehrfaches Undo) in korrekter, umgekehrter Reihenfolge.

### 2.7 Zusammenspiel mit dem Selection-Sync-Bug
- Tabellen gelten laut `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6 als „Hauptverdachts-
  fall“ für den in Abschnitt 2 dokumentierten Selection-Sync-Bug, da Klicks zwischen
  Zellen ähnliche Selektionswechsel auslösen.
- Der bereits vorhandene Test (`selection-regression.spec.ts:43-59`) stellt genau
  die kritische Sequenz nach: Tabelle einfügen → in Zelle 1 tippen → Alles auswählen
  → Fett → in Zelle 2 klicken → tippen → **beide** Zellinhalte müssen erhalten
  bleiben. Muss dauerhaft Pflichtbestandteil der Suite bleiben.

### 2.8 Einfügen an Sonderpositionen
- **Dokumentanfang/-ende:** Tabelle wird an erster/letzter Stelle eingefügt, das
  Dokument bleibt weiter editierbar (Cursor kann davor/dahinter navigiert werden, um
  Text zu ergänzen; ggf. wird der `gapCursor` aus `WordEditor.tsx:112` benötigt, um
  vor/hinter einer Tabelle am Rand überhaupt einen Cursor setzen zu können — zu
  verifizieren).
- **Cursor bereits in einer Tabellenzelle:** Da `tableGroup: 'block'` und
  `cellContent: 'block+'` (`schema.ts:154`) eine Tabelle als Kind-Node einer Zelle
  zulassen, entsteht voraussichtlich eine **verschachtelte Tabelle**. Zu
  entscheiden und zu dokumentieren: gewolltes Verhalten (wie Word/LibreOffice) oder
  verhindern/mit Warnung? Aktuell **ungeklärt**, siehe Grenzfall 3.7.
- **Cursor innerhalb eines Listenelements:** Verhalten (Liste unterbrechen vs.
  Tabelle als Kind des Listenelements) muss definiert und getestet werden, nicht nur
  zufälliges Schema-Ergebnis sein (siehe Grenzfall 3.8).

### 2.9 Tastatur-Aktivierung des Toolbar-Buttons selbst
- Der Toolbar-Button „Tabelle einfügen“ muss sich per Mausklick, **Leertaste** und
  **Enter** gleichermaßen zuverlässig öffnen lassen, sobald er per Tab fokussiert
  ist — nicht nur per Maus.
- **Konkretes Risiko:** Der Button feuert wie alle Toolbar-Buttons ausschließlich
  über `onMouseDown`+`e.preventDefault()` (`Toolbar.tsx:282-283`), ein Muster, das
  bewusst gewählt wurde, um beim Öffnen die Editor-Selektion nicht zu verlieren
  (siehe 2.1, „Implementierungs-Fallstrick“). Browserübergreifend gilt aber: Ein
  fokussierter `<button>`, der per **Enter** aktiviert wird, erzeugt **nur** ein
  `click`-Ereignis, **kein** vorausgehendes `mousedown`; per **Leertaste** aktiviert,
  erzeugt er zusätzlich ein synthetisches `mousedown`/`mouseup`-Paar vor dem `click`.
  Ein ausschließlich an `onMouseDown` gebundener Handler reagiert damit möglicherweise
  auf Leertaste und Maus, aber **nicht** auf Enter.
- Bisher **ungetestet**: Kein bestehender E2E-Test löst einen Toolbar-Button über
  eine fokussierte, per Tastatur ausgelöste Aktivierung aus — alle bestehenden Tests
  nutzen Playwrights `page.locator(...).click()`, das eine vollständige
  Maus-Ereignisfolge simuliert, nie eine reine Tastaturaktivierung.
- **Anforderung:** Vor Abnahme per echtem `page.keyboard.press('Enter')` auf dem
  fokussierten Button verifizieren. Reagiert der Button nicht, ist die Auslösung so
  zu ergänzen (z. B. zusätzliche, gleichwertige `onClick`-Bindung neben
  `onMouseDown`), dass Enter zuverlässig funktioniert — **nicht** nur als bekannte
  Einschränkung zu dokumentieren, da dies sonst der einzige Weg für rein
  tastaturgestützte Nutzer:innen wäre, überhaupt eine Tabelle einzufügen, seit die
  Direkteinfügung durch einen Dialog ersetzt wird (siehe Grenzfall 3.18).

### 2.10 Bedienung per Touch (Mobile/Tablet)
- Das Projekt betreibt drei Playwright-Projekte für jede UI-Änderung
  (`playwright.config.ts:34-36`): „Desktop Chrome“, „Mobile“ (Pixel 7, Touch-fähig)
  und „Tablet“ (iPad Mini). Der neue Dialog ist **kein** Sonderfall, der nur auf
  Desktop-Chrome nachgewiesen werden darf.
- **Anforderung:** Antippen des Toolbar-Buttons öffnet den Dialog sichtbar;
  Antippen eines Eingabefelds öffnet die native Bildschirmtastatur und erlaubt
  Eingabe; Antippen von „Einfügen“ fügt die Tabelle ein — dieser Grundfall muss auf
  **allen drei** Projekten funktionieren, nicht nur auf Desktop Chrome (analog zur
  bereits für `spalte-einfuegen-req.md` Menüpunkt 6 geforderten Touch-Bedienung).
  Eine Mehrzellen-Auswahl per Touch-Drag ist **nicht** Teil dieser Anforderung
  (betrifft ohnehin erst „Zellen verbinden“, nicht das Einfügen selbst).

---

## 3. Grenzfälle

1. **Dialog abbrechen:** Escape/„Abbrechen“/Klick außerhalb → keine Tabelle,
   Cursor-Position und ggf. Selektion bleiben exakt erhalten.
2. **Ungültige Eingabe (0, negativ, nicht-numerisch, leeres Feld):** sichtbare
   Fehlermeldung; keine leere/kaputte Tabelle, kein stilles No-Op, kein JS-Fehler.
3. **Sehr große Werte (z. B. 100×100):** UI bleibt reaktionsfähig; definierte
   Obergrenze, bei Überschreitung Fehlermeldung statt kommentarlosem Abschneiden
   oder Einfrieren.
4. **Große, gerade noch zulässige Tabelle (z. B. 20×20):** Einfügen, Scrollen,
   Bearbeiten bleiben performant; Export/Re-Import in vertretbarer Zeit (< 3 s,
   analog `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 1.2).
5. **Einfügen bei aktiver Textselektion:** markierter Text wird ersetzt (kein
   Zusammenführen). Dokumentiertes, gewolltes Verhalten bestätigen; ggf.
   Sicherheitsabfrage erwägen, wenn die Selektion nicht-trivial ist.
6. **Am Dokumentanfang/-ende einfügen:** Cursor-Positionierung davor/danach bleibt
   möglich, Dokument voll editierbar (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6,
   Testfall 10). `gapCursor`-Verhalten am Rand mitprüfen.
7. **Verschachtelte Tabelle durch aktives Einfügen** (Cursor in einer Zelle, siehe
   2.8): **ungeklärt**, ob zugelassen/verhindert/mit Rückfrage — Ergebnis hier
   nachtragen. Unabhängig davon: **kein Absturz**. Der Import fremder verschachtelter
   Tabellen ist über `MAX_TABLE_NESTING_DEPTH = 25` (`docx/reader.ts:309`)
   abgesichert; das **aktive Einfügen** über die Toolbar hat **keine** solche
   Tiefenbegrenzung im Command (`insertTable` prüft keine Verschachtelungstiefe).
8. **Einfügen innerhalb eines Listenelements:** Verhalten definieren und testen
   (Liste unterbrechen vs. Tabelle als Kind), kein zufälliges Schema-Ergebnis.
9. **Tab-Navigation, letzte Zelle der letzten Zeile:** muss eine neue Zeile erzeugen
   (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6) — aktuell mit hoher Wahrscheinlichkeit
   **nicht** funktional (weder `goToNextCell` gebunden noch „neue Zeile“-Logik
   vorhanden, `WordEditor.tsx:85-108`). Gilt bis zum Gegenbeweis als **fehlend**.
10. **Tab lässt den Fokus aus dem Editor springen:** Zu verifizieren, ob `Tab` ohne
    eigene Bindung den Browser-Fokus aus dem `contenteditable` herausträgt (z. B. zum
    nächsten Toolbar-Button). Falls ja, eigenständiger Bedienbarkeits-Bug, der
    unabhängig von der Zellnavigation behoben werden muss.
11. **Mehrfaches schnelles Klicken** auf den Tabelle-Button bzw. „Einfügen“: kein
    doppeltes Einfügen durch Event-Bubbling/doppelte Handler-Aufrufe.
12. **Undo direkt nach Einfügen, dann Selection-Sync-Szenario:** Tabelle einfügen →
    Undo → an wiederhergestellter Position tippen → kein Inhaltsverlust (Kombination
    3.6/2.7).
13. **Selection-Sync-Bug beim Zellwechsel per Klick** (2.7): bereits abgedeckt
    (`selection-regression.spec.ts:43-59`); muss dauerhaft Teil der Suite bleiben.
14. **Spaltenzahl überschreitet die Seitenbreite** (z. B. 15 Spalten auf A4):
    `width: 100%` + `min-width: 2em` je Zelle (`index.css:46,54`) — unklar, ob die
    Tabelle über die Seite hinausragt oder gestaucht wird; visuell verifizieren.
15. **Einfügen in ein vollständig leeres, neues Dokument:** Tabelle wird
    einziges/erstes Element → Dokument bleibt danach editierbar (Cursor vor/nach der
    Tabelle setzbar), kein Fehlerzustand „Dokument besteht nur aus einer Tabelle“.
16. **Selektion über Dialog-Lebensdauer:** Wird der Editor-Fokus/-Cursor während des
    geöffneten Dialogs nicht festgehalten (siehe 2.1), landet die Tabelle beim
    Bestätigen an falscher Stelle oder ersetzt eine unbeabsichtigte Selektion —
    gezielt testen (Dialog öffnen, ins Dokument zurückklicken, „Einfügen”).
17. **Touch-Bedienung (Mobile/Tablet):** Button antippen → Dialog öffnet sich;
    Eingabefelder antippen → Bildschirmtastatur erscheint, Eingabe funktioniert;
    „Einfügen” antippen → Tabelle wird eingefügt — auf den Projekten „Mobile”
    (Pixel 7) und „Tablet” (iPad Mini) ebenso wie auf „Desktop Chrome” (siehe 2.10).
18. **Enter-Taste auf dem fokussierten Toolbar-Button:** Button per Tab fokussieren
    (kein Klick), dann Enter drücken → Dialog muss sich öffnen. Da der Button
    ausschließlich über `onMouseDown` auslöst (`Toolbar.tsx:282-283`) und Enter
    browserübergreifend **kein** `mousedown`-Ereignis erzeugt (anders als
    Leertaste), ist dies **explizit als eigener Testfall zu verifizieren, nicht
    anzunehmen** (siehe 2.9). Reagiert der Button nicht, ist das ein zu behebender
    Bedienbarkeits-Bug, kein hinnehmbarer Grenzfall — ohne funktionierendes Enter
    hätte eine rein tastaturgestützte Person keinen Weg, überhaupt eine Tabelle
    einzufügen.

---

## 4. Rundreise-Anforderung (Pflicht für Abnahme)

Für **jeden** Fall gilt: Tabelle mit definierter Zeilen-/Spaltenzahl und Zellinhalt
im Editor erzeugen bzw. per Upload importieren → **unverändert** exportieren →
erneut importieren → Struktur (Zeilen-/Spaltenzahl, Zellinhalt, über Import
entstandene Verbund-Zellen) ist inhaltlich exakt erhalten.

### 4.1 DOCX
1. Über den neuen Dialog eine 4×3-Tabelle einfügen, jede Zelle mit unterschiedlichem
   Text füllen, als DOCX exportieren → mit einem unabhängigen Parser (z. B.
   python-docx oder direktes Parsen von `word/document.xml`) prüfen: exakt 4
   `<w:tr>`, je Zeile exakt 3 `<w:tc>`, Zellinhalte an der richtigen Position.
2. Dieselbe Datei erneut importieren → sichtbar identische Zeilen-/Spaltenzahl und
   Zellinhalte.
3. Unverändert (ohne jede Bearbeitung) importierte fremde DOCX-Datei mit Tabelle →
   unverändert exportieren → erneut importieren → Zellinhalte identisch. Dass die
   ursprüngliche Spaltenbreite dabei durch hartkodiertes `w:w="2000"`
   (`docx/writer.ts:161`) ersetzt wird, ist eine **dokumentierte Einschränkung**,
   getrennt von reinem Textverlust zu behandeln (siehe Punkt 4).
4. **Rahmen-Validierung (offener Punkt):** Exportierte DOCX mit frisch eingefügter
   Tabelle in echtem Word bzw. mit unabhängigem Parser prüfen. Da
   `docx/writer.ts:200` ein leeres `<w:tblPr/>` ohne `<w:tblBorders>`/`<w:tblStyle>`
   erzeugt, ist zu erwarten, dass die Tabelle in Word **ohne** sichtbare Rahmen
   erscheint, obwohl der Editor sie per CSS berandet zeigt. Zu klären: hinnehmbar
   (Rahmen ist reine Editor-Deko) **oder** muss der Export explizite Rahmen
   schreiben, damit „Zellrahmen sichtbar“ (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6)
   auch in der Zielanwendung erfüllt ist? Ergebnis hier nachtragen.
5. Tabelle mit verbundenen Zellen (colspan/rowspan) aus einer Fremddatei →
   unverändert exportieren → erneut importieren → Verbund bleibt erhalten
   (Unit-Ebene bereits abgedeckt, `docx/__tests__/roundtrip.test.ts:261-304`; hier
   zusätzlich über echten Upload/Download, nicht nur über konstruierte JSON-Daten).
6. Cross-Format: ODT mit Tabelle importieren → als DOCX exportieren → Zeilen-/
   Spaltenzahl und Zellinhalte bleiben erhalten.
7. Reale komplexe Fremddatei mit großer Tabelle (> 5 Spalten, > 10 Zeilen, gemischte
   Formatierung) importieren, unverändert exportieren, erneut importieren →
   Zellinhalte identisch (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6, Testfall 9).
   **Konkret verifizierter Kandidat:** `tests/fixtures/external/docx/bug57031.docx`
   (verifiziert: 230 `<w:tr>`, 12× `<w:gridSpan>`, 8× `<w:vMerge>` — bereits als
   reale Fixture mit großer Tabellenstruktur in `zellen-verbinden-req.md` Abschnitt 0
   geführt; für „Tabelle einfügen" reicht der reine Zeilen-/Spalten-/Textinhalt der
   Rundreise, die vorhandenen Merges müssen dabei lediglich unangetastet erhalten
   bleiben, nicht zusätzlich geprüft werden — das ist Sache von
   `zellen-verbinden-req.md`).

### 4.2 ODT
1. Über den neuen Dialog eine 4×3-Tabelle einfügen, Zellen füllen, als ODT
   exportieren → `content.xml` enthält exakt 4 `<table:table-row>`, je Zeile exakt 3
   `<table:table-cell>`.
2. **Spaltenzahl-Regression (bereits behoben — Absicherung, keine Neu-Behebung):**
   Der ODT-Writer summiert `colspan` korrekt und erzeugt die richtige Anzahl
   `<table:table-column>` (`odt/writer.ts:115-117`). Ein bestehender Test prüft für
   eine `colspan=2`-Zelle in der ersten Zeile bereits `.toBe(2)`
   (`odt/__tests__/roundtrip.test.ts:298`). **Anforderung:** dieser Test bleibt Teil
   der Suite und grün; zusätzlich über echten Export nachweisen. (Die Vorfassung
   führte dies fälschlich als offenen Defekt — siehe Abschnitt 0.)
3. Dieselbe Datei erneut importieren → identische Zeilen-/Spaltenzahl und
   Zellinhalte.
4. Tabelle mit verbundenen Zellen (colspan/rowspan) → Rundreise erhält Verbund;
   ODF-konforme `covered-table-cell`-Platzhalter (Unit-Ebene bereits abgedeckt,
   `odt/__tests__/roundtrip.test.ts:275-339`; hier zusätzlich über echten
   Upload/Download).
5. Cross-Format: DOCX mit Tabelle importieren → als ODT exportieren → Zeilen-/
   Spaltenzahl und Zellinhalte bleiben erhalten.
6. **Tabellenname-Determinismus (bereits behoben — Absicherung):** Zwei Tabellen im
   selben Dokument erhalten verschiedene, deterministische Namen („Table1“,
   „Table2“) via `TableNameSequence` (`odt/writer.ts:54-60,173`); zwei Exporte sind
   byte-identisch. Test vorhanden (`odt/__tests__/roundtrip.test.ts:529-572`) —
   bleibt grün. (Vorfassung führte `Math.random()`-Kollision fälschlich als offenen
   Defekt — siehe Abschnitt 0.)
7. Reale komplexe Fremddatei mit großer Tabelle importieren, unverändert
   exportieren, erneut importieren → Zellinhalte identisch. **Konkret verifizierter
   Kandidat:** `tests/fixtures/external/odt/BigTable.odt` (verifiziert: 25
   `<table:table-row>`, 16 `<table:table-column>` — erfüllt „> 5 Spalten, > 10
   Zeilen" deutlich; merge-frei, siehe auch `spalte-einfuegen-req.md` Grenzfall 13,
   damit die reine Zeilen-/Spalten-/Textrundreise ohne Merge-Sonderfälle geprüft
   wird).

### 4.3 Doppelte Rundreise / Cross-Format hin und zurück
1. DOCX mit Tabelle → Editor → Export als ODT → erneuter Import → Export zurück als
   DOCX → Zeilen-/Spaltenzahl und Zellinhalte nach zwei Formatkonvertierungen
   weiterhin identisch. Spaltenbreite/Rahmen-Feinheiten dürfen sich ändern bzw.
   verloren gehen (dokumentierte Einschränkung, 4.1/4.2) — **Zellinhalt/Struktur
   jedoch nicht**.
2. Dieselbe Prüfung mit Startpunkt ODT.

---

## 5. Testfälle für die Verifikation (E2E, echte Bedienung im Browser)

Bereits vorhandener, laut Auftrag **nicht als vertrauenswürdig geltender** Test
(erneut prüfen, ggf. erweitern):
- `tests/e2e/selection-regression.spec.ts:43-59` „same regression inside a table
  cell (click between cells after formatting)“ — deckt nur den Selection-Sync-Bug
  ab, keine Größenwahl, keine Rundreise. Nutzt aktuell die feste 2×2-Einfügung.

Zusätzlich zu schreibende Testfälle (decken Abschnitte 1–4 ab):

1. Klick auf „Tabelle einfügen“ → Dialog öffnet sich sichtbar (**Dialog existiert
   noch nicht** — Test erst nach Umsetzung schreibbar).
2. Zeilen=4, Spalten=3 eingeben, „Einfügen“ → Tabelle mit genau 4 sichtbaren Zeilen
   und 3 sichtbaren Spalten (Zählung über `.ProseMirror tr`/`td`).
3. Dialog mit Standardwerten direkt bestätigen → sinnvolle Standardgröße wird
   eingefügt.
4. Ungültige Eingabe (0, negativ, Text, leer) → Fehlermeldung sichtbar, keine
   Tabelle eingefügt.
5. Dialog öffnen, Escape → kein DOM-Element verändert, Editor-Fokus/Cursor
   unverändert; ebenso „Abbrechen“ und Klick außerhalb.
6. In **jede** Zelle der frisch eingefügten Tabelle per echtem Playwright-Klick
   tippen → Inhalt landet in der richtigen Zelle (Erweiterung von
   `selection-regression.spec.ts:43-59` auf alle Zellen, nicht nur zwei).
7. `Tab` in einer Zelle → Cursor springt in die nächste Zelle (aktuell erwarteter
   **Fehlschlag**, Grenzfall 3.9/3.10 — Test dokumentiert den Ist-Zustand und wird
   nach Behebung grün).
8. `Tab` in der letzten Zelle der letzten Zeile → neue Zeile (aktuell erwarteter
   **Fehlschlag**).
9. Undo direkt nach Einfügen → Tabelle verschwindet vollständig, Text davor/danach
   unverändert.
10. Redo → Tabelle inklusive korrekter Größe wiederhergestellt.
11. Einfügen mit Text davor und danach → beide Textteile bleiben erhalten, Tabelle
    sitzt exakt dazwischen.
12. Einfügen bei aktiver Textselektion → markierter Text wird ersetzt (Grenzfall
    3.5 bestätigt).
13. Einfügen mit Cursor bereits in einer bestehenden Tabellenzelle → Ergebnis
    (verschachtelte Tabelle oder Verhinderung, Grenzfall 3.7) entspricht der
    getroffenen Entscheidung, kein Absturz.
14. Selektion über Dialog-Lebensdauer (Grenzfall 3.16): Dialog öffnen, ins Dokument
    zurückklicken, „Einfügen“ → Tabelle landet an der zuletzt geklickten Position.
15. Vollständiger Rundreisetest DOCX (4.1) über echten `filechooser`-Upload und
    echten Download (`page.waitForEvent('download')`), inkl. Validierung über einen
    unabhängigen Parser.
16. Vollständiger Rundreisetest ODT (4.2) ebenso, inkl. erneuter Bestätigung, dass
    die `<table:table-column>`-Zählung bei `colspan` in der ersten Zeile korrekt
    bleibt (Regressions-Absicherung, nicht Neu-Behebung).
17. Cross-Format-Rundreise (4.3): einmal DOCX→ODT→DOCX, einmal ODT→DOCX→ODT.
18. Große Tabelle (z. B. 20×20) einfügen → UI bleibt bedienbar, kein Einfrieren,
    Export/Import in vertretbarer Zeit.
19. Reale komplexe Fremddatei mit großer Tabelle importieren, unverändert
    exportieren, erneut importieren → Zellinhalte identisch (`FEATURE-SPEC-DOCX-ODT.md`
    Abschnitt 6, Testfall 9), mit Fokus auf hartkodiertes `w:w="2000"` bzw. den
    ODF-Spaltenfall.
20. Regressionstest `selection-regression.spec.ts:43-59` erneut ausführen und als
    Pflichtbestandteil der Dauer-Suite bestätigen.
21. Touch-Grundfall auf den Projekten „Mobile" (Pixel 7) und „Tablet" (iPad Mini):
    Button antippen → Dialog öffnet sich; Felder antippen und befüllen; „Einfügen"
    antippen → Tabelle eingefügt (Grenzfall 17).
22. Toolbar-Button per Tab fokussieren (kein Klick), Enter drücken → Dialog öffnet
    sich (Grenzfall 18) — bislang ungetesteter Pfad, da bestehende Tests
    ausschließlich über `click()` (volle Maus-Ereignisfolge) auslösen.

---

## 6. Abnahmekriterien (Definition of Done)

Der Status „teilweise“ für „Tabelle einfügen“ darf erst auf „verifiziert“ geändert
werden, wenn:

1. Der Zeilen-/Spalten-Auswahldialog gebaut, verdrahtet und über die Testfälle 1–5
   und 14 aus Abschnitt 5 nachgewiesen ist — die feste 2×2-Direkteinfügung
   (`Toolbar.tsx:284`) ist vollständig ersetzt; die Selektion über die
   Dialog-Lebensdauer bleibt korrekt (Grenzfall 3.16).
2. Tab-/Umschalt+Tab-Navigation zwischen Zellen inklusive „neue Zeile am Ende“
   gebaut und über die Testfälle 7–8 nachgewiesen ist; zusätzlich verifiziert ist,
   dass `Tab` den Fokus nicht aus dem Editor springen lässt (Grenzfall 3.10).
3. Alle Testfälle aus Abschnitt 5 tatsächlich ausgeführt wurden (echte
   Browser-Interaktion, nicht nur Unit-/Command-Ebene) und grün sind.
4. Alle Rundreise-Anforderungen aus Abschnitt 4 (DOCX, ODT, Cross-Format) durch
   einen unabhängigen Parser bzw. erneuten Import bestätigt sind. **Die beiden
   bereits behobenen ODT-Punkte (Spaltenzahl bei `colspan`, deterministischer
   `table:name`) sind KEINE offenen Defekte mehr**, sondern als Regression durch die
   bestehenden Tests `odt/__tests__/roundtrip.test.ts:298` bzw. `:529-572`
   dauerhaft abzusichern (bleiben grün).
5. Die offene **Rahmen-Frage** beim DOCX-Export (`docx/writer.ts:200`, leeres
   `<w:tblPr/>`) aus Abschnitt 4.1 Punkt 4 explizit beantwortet und das Ergebnis
   hier nachgetragen ist (bewusst hingenommen **oder** Rahmen-Export ergänzt).
6. Alle Grenzfälle aus Abschnitt 3 einzeln geprüft und ihr tatsächliches Verhalten
   dokumentiert ist (auch wenn das Ergebnis „bewusst so gewollt, dokumentiert“
   statt „Bug, behoben“ lautet).
7. Die offene Frage aus Grenzfall 3.7 (verschachtelte Tabelle durch aktives
   Einfügen; `insertTable` hat keine Tiefenbegrenzung) explizit beantwortet und das
   Ergebnis hier nachgetragen ist.
8. Die Spaltenbreiten-Einschränkung aus Abschnitt 2.5 (im Editor per
   `columnResizing` änderbar, beim Export von beiden Writern ignoriert) bewusst als
   Einschränkung dokumentiert **oder** behoben wurde — nicht länger
   unbekannt/unentdeckt bleibt.
9. Der Regressionstest für den Selection-Sync-Bug innerhalb von Tabellenzellen
   (`selection-regression.spec.ts:43-59`) dauerhaft Teil der Suite bleibt und
   weiterhin besteht.
10. Der Touch-Grundfall (Dialog öffnen, Felder befüllen, Einfügen bestätigen) auf
    den Projekten „Mobile" (Pixel 7) und „Tablet" (iPad Mini) nachweislich
    funktioniert, nicht nur auf „Desktop Chrome" (Grenzfall 3.17, Testfall 21).
11. Die Enter-Taste auf dem fokussierten Toolbar-Button den Dialog zuverlässig
    öffnet (Grenzfall 3.18, Testfall 22) — geprüft über eine echte, rein
    tastaturgestützte Aktivierung (`page.keyboard.press('Enter')` auf dem
    fokussierten Button, nicht über `click()`); reagiert der Button nicht, ist die
    Auslösung entsprechend nachzubessern, bevor dieser Punkt als erfüllt gilt.

Erst nach Erfüllung aller elf Punkte darf der Backlog-Status von „teilweise
(nicht vertrauenswürdig)“ auf „verifiziert“ geändert werden.
