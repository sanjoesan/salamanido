# Anforderungsdatei: Feature „Zeile löschen“ (Tabellenzeile entfernen)

Status: **Laut Feature-Backlog „fehlt“ — gilt aktuell als nicht vertrauenswürdig, muss
vollständig verifiziert werden**, bevor der Status im Backlog (`FEATURE-BACKLOG.md`,
Abschnitt 3.2 „Tabellen“, Slug `zeile-loeschen`, Priorität 1) bestätigt werden darf.
„Nicht vertrauenswürdig“ gilt hier in beide Richtungen: Es darf nicht unterstellt werden,
dass „fehlt“ automatisch korrekt ist (ggf. existiert doch ein versteckter Weg), und es
darf erst recht nicht angenommen werden, dass ein späteres „vorhanden“ zutrifft, ohne dass
jeder Punkt dieser Datei einzeln nachgewiesen wurde.

Kurzbeschreibung (Backlog): „Entfernt die markierte Tabellenzeile.“

Geltungsbereich: Diese Datei konkretisiert für das Einzelfeature „Zeile löschen“, was
`FEATURE-SPEC-DOCX-ODT.md` (Abschnitt 6, „Tabellen“) pauschal fordert: „Zeile einfügen
(oberhalb/unterhalb), Zeile löschen.“ Abschnitt 6 markiert Tabellen zudem explizit als
„von der Nutzerin explizit als nicht funktionsfähig gemeldet — höchste Priorität“, und
Abschnitt 17, Zeile 20 führt „Tabellen-Kontextfunktionen (Zeile/Spalte einfügen/löschen,
verbinden/teilen)“ als „fehlt komplett in der UI … größte Einzellücke im gesamten
Funktionsumfang“. Diese Datei gilt für **beide** unterstützten Formate (DOCX und ODT)
über den gemeinsamen ProseMirror-Editor (`src/formats/shared/editor/WordEditor.tsx`,
`src/formats/shared/editor/Toolbar.tsx`, `src/formats/shared/editor/commands.ts`,
`src/formats/shared/schema.ts`), da Tabellenbearbeitung eine reine Editor-Operation ist
und sich zwischen den Formaten nicht unterscheiden darf — nur Import/Export
(`src/formats/docx/reader.ts`+`writer.ts`, `src/formats/odt/reader.ts`+`writer.ts`)
sind formatspezifisch.

---

## 0. Ist-Stand laut Code-Analyse (Befund vor Verifikation)

Vor der eigentlichen Anforderung hier der nachvollziehbare Befund, warum der
Backlog-Status „fehlt“ nach eigener Prüfung tatsächlich zutrifft — und was das für den
Umsetzungsaufwand bedeutet:

- In `src/formats/shared/editor/Toolbar.tsx` existiert **ein einziger** Tabellen-Button:
  „⊞ Tabelle“ (Zeile ~228–239), der ausschließlich `insertTable(2, 2)` auslöst — eine
  feste 2×2-Tabelle. Es gibt **keinen** weiteren Button, kein Untermenü und keine
  kontextabhängige Werkzeugleiste, die erscheint, sobald sich der Cursor in einer
  Tabelle befindet. Es existiert also **keinerlei UI-Element** für „Zeile löschen“
  (und ebenso wenig für Zeile einfügen, Spalte einfügen/löschen, Zellen
  verbinden/teilen, Tabelle löschen).
- In `src/formats/shared/editor/commands.ts` wird aus `prosemirror-tables` **nur**
  `isInTable` importiert/re-exportiert (Zeile 3/6) sowie lokal `insertTable(rows, cols)`
  definiert (Zeile 76ff.), das direkt `table`/`table_row`/`table_cell`-Knoten aus dem
  Schema zusammenbaut. Es gibt **keinen** eigenen `deleteRow`- oder
  „Zeile-löschen“-Befehl in diesem Modul.
- Bemerkenswert: `prosemirror-tables` ist bereits Projektabhängigkeit
  (`package.json`, `"prosemirror-tables": "^1.8.5"`) und die installierte Bibliothek
  exportiert bereits fix und fertig nutzbare Befehle — u. a. `deleteRow`,
  `removeRow`, `addRowBefore`, `addRowAfter`, `deleteColumn`, `addColumnBefore`,
  `addColumnAfter`, `mergeCells`, `splitCell`, `deleteTable`, `deleteCellSelection`,
  `selectedRect`, `CellSelection` — **keiner dieser Befehle wird irgendwo im Repository
  importiert oder verwendet** (Volltextsuche liefert außer `isInTable` keinen Treffer).
  Der Umsetzungsaufwand ist dadurch geringer als bei einer Funktion ganz ohne
  Bibliotheksunterstützung, das darf aber **nicht** mit „ist eigentlich schon
  vorhanden“ verwechselt werden — es fehlt weiterhin jede Verdrahtung zur UI.
- In `src/formats/shared/editor/WordEditor.tsx` sind die Plugins `columnResizing()`
  und `tableEditing()` aus `prosemirror-tables` aktiv (Zeile 81/82) — dadurch
  funktioniert grundsätzlich das Aufziehen einer `CellSelection` per Maus über mehrere
  Zellen/Zeilen. Es gibt aber **keine** `keymap`-Bindung, die auf eine solche
  `CellSelection` reagiert (z. B. für „Entf löscht ganze markierte Zeilen“), und es
  gibt **kein** `contextmenu`-Handling irgendwo im Projekt (Suche nach `contextmenu`
  liefert null Treffer) — ein Rechtsklick zeigt daher ausschließlich das native
  Browser-Kontextmenü ohne jeden Tabellen-Bezug.
- In `src/formats/shared/schema.ts` wird die Tabellenstruktur mit
  `tableNodes({ tableGroup: 'block', cellContent: 'block+', cellAttributes: {} })`
  (Zeile 106) aus `prosemirror-tables` erzeugt — Standard-Schema mit Unterstützung für
  `colspan`/`rowspan`, aber ohne eigene Zellattribute (z. B. keine Kopfzeilen-Markierung,
  keine Hintergrundfarbe). Das Schema selbst steht einer Implementierung nicht im Weg.
- Tests: `src/formats/docx/__tests__/roundtrip.test.ts` und
  `src/formats/odt/__tests__/roundtrip.test.ts` enthalten je einen Abschnitt
  „round trip: tables“, der **direkt konstruierte** ProseMirror-JSON-Dokumente mit
  `colspan`/`rowspan` (z. B. eine über zwei Zeilen verbundene Zelle) auf Erhalt der
  Struktur nach Schreiben/Lesen prüft. Diese Tests decken **keinerlei Lösch-Operation**
  ab — sie prüfen nur, dass eine bereits fertige Tabellenstruktur beim Rundreise-Test
  erhalten bleibt, nicht das Verhalten einer Zeilen-Löschung selbst. Eine Volltextsuche
  nach `deleteRow`, `removeRow` oder „Zeile löschen“ im gesamten Repository
  (`src/`, `tests/`) liefert **keinen einzigen Treffer** außerhalb der Bibliothek selbst.
  Es existiert kein einziger E2E-Test, der überhaupt eine Tabelle im Browser über
  echte Bedienung anlegt oder verändert (`tests/e2e/selection-regression.spec.ts` ist
  der einzige tabellenferne Regressionstest im Verzeichnis).

**Konsequenz für die Bewertung:** Der Backlog-Status „fehlt“ ist für „Zeile löschen“
nach dieser Prüfung **bestätigt korrekt** — es gibt weder einen UI-Weg noch einen
verdrahteten Befehl noch einen Test. Diese Anforderungsdatei legt fest, was gebaut und
nachgewiesen werden muss, damit die Funktion künftig zu Recht als „vorhanden“ geführt
werden darf.

---

## 1. Menüpunkte / Bedienelemente — Soll-Zustand

Eine ernstzunehmende Textverarbeitung (Word: Ribbon „Tabellentools → Layout → Zeilen und
Spalten → Löschen → Zeilen löschen“; LibreOffice Writer: „Tabelle → Löschen → Zeilen“)
bietet „Zeile löschen“ über mehrere gleichwertige Wege an. Jeder dieser Wege muss einzeln
funktionieren und einzeln getestet werden:

| # | Zugriffsweg | Ist-Zustand | Soll |
|---|---|---|---|
| 1 | Kontextabhängige „Tabellen-Werkzeugleiste“ mit Button „Zeile löschen“ (erscheint nur, während Cursor/Selektion sich in einer Tabelle befindet) | **fehlt komplett** — es existiert überhaupt keine kontextabhängige Tabellen-Werkzeugleiste, nur der statische „⊞ Tabelle“-Einfügen-Button in `Toolbar.tsx` | Muss neu gebaut werden: eigene Button-Gruppe (mind. „Zeile oberhalb einfügen“, „Zeile unterhalb einfügen“, „Zeile löschen“, „Spalte links einfügen“, „Spalte rechts einfügen“, „Spalte löschen“, „Zellen verbinden“, „Zellen teilen“, „Tabelle löschen“ — siehe `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6), sichtbar/aktiv nur bei `isInTable(view.state)`, SVG-Icon (kein Emoji/Unicode-Glyphe, siehe Abschnitt 20 der Feature-Spec), `aria-label="Zeile löschen"`. |
| 2 | Rechtsklick-Kontextmenü innerhalb einer Tabellenzeile → „Zeilen löschen“ | Kein eigenes Kontextmenü implementiert (`contextmenu` wird nirgends abgefangen); es erscheint ausschließlich das native Browser-Kontextmenü ohne jeden Tabellenbezug | Muss verifiziert bzw. bewusst entschieden werden: entweder ein eigenes, tabellenbewusstes Kontextmenü bauen (Referenzverhalten Word/LibreOffice), oder explizit dokumentieren, dass dieser Weg **nicht** unterstützt wird und „Zeile löschen“ ausschließlich über die Tabellen-Werkzeugleiste (Zeile 1) erreichbar ist — kein unklarer Zwischenzustand. |
| 3 | Tastenkombination | In Word/LibreOffice existiert **keine** allgemein übliche direkte Tastenkombination für „Zeile löschen“ (anders als z. B. Strg+X) — Referenzverhalten ist bewusst nur über Ribbon/Kontextmenü zugänglich | Kein Soll-Element analog zu Word/LibreOffice; diese Abwesenheit ist hier **explizit** zu dokumentieren, damit sie nicht als vergessene Lücke missverstanden wird (analog zum „Anwendungs-Menü“-Fall in `ausschneiden-req.md`, Abschnitt 1, Zeile 5). |
| 4 | Entf-/Rücktaste bei einer über mehrere Zellen einer Zeile aufgezogenen `CellSelection` | Ungeklärt/ungetestet: `tableEditing()`-Plugin ist aktiv, es existiert aber keine `keymap`-Bindung, die Entf bei `CellSelection` anders behandelt als bei normaler Textselektion | Muss **explizit von echtem Struktur-Löschen abgegrenzt werden** (siehe Abschnitt 2.2 unten sowie `ausschneiden-req.md` Abschnitt 3, Grenzfall 7): Entf/Rücktaste auf einer `CellSelection` darf **nur den Zellinhalt leeren**, niemals strukturell Zeilen entfernen. „Zeile löschen“ bleibt ausschließlich über die dezidierten Wege 1/2 erreichbar — das muss durch einen Regressionstest abgesichert werden, der genau diese Verwechslungsgefahr prüft. |
| 5 | Bestätigungsdialog vor dem Löschen | Nicht vorhanden (Funktion existiert ja gar nicht) | Referenzverhalten (Word/LibreOffice) verlangt **keinen** Bestätigungsdialog — Löschen erfolgt sofort, Rückgängig (Strg+Z) ist das vorgesehene Sicherheitsnetz. Kein Soll-Element, aber explizit zu dokumentieren, damit es nicht versehentlich doch als „fehlende Sicherheitsabfrage“ nachgerüstet wird. |
| 6 | Mobile/Touch: Zeile per Antippen/Long-Press auswählen und über ein Kontextmenü/eine Symbolleiste löschen | Nicht verifizierbar, da die Funktion komplett fehlt; zusätzlich ist unklar, ob überhaupt eine Zeilen-Selektion per Touch-Geste möglich ist (keine „Zeilen-Griffleiste“ links neben der Tabelle vorhanden) | Auf den in `playwright.config.ts` konfigurierten Projekten „Mobile“ (Pixel 7) und „Tablet“ (iPad Mini) muss mindestens ein funktionierender Weg existieren, eine Zeile auszuwählen und zu löschen — sei es über die Tabellen-Werkzeugleiste (Weg 1), die auf Touch-Geräten erreichbar sein muss. |

---

## 2. Gewünschtes Verhalten im Detail

### 2.1 Aktivierungsbedingungen
- „Zeile löschen“ ist nur aktiv/sichtbar, wenn sich der Cursor **innerhalb einer
  Tabelle** befindet (`isInTable(view.state)` liefert `true`) — als kollabierter
  Cursor in einer Zelle oder als `CellSelection` über eine oder mehrere Zellen/Zeilen.
- Außerhalb einer Tabelle ist der Button entweder gar nicht sichtbar (bevorzugt, da die
  Tabellen-Werkzeugleiste laut Abschnitt 1 kontextabhängig eingeblendet wird) oder
  sichtbar-aber-deaktiviert — beides ist zulässig, muss aber konsistent für **alle**
  Tabellen-Kontextfunktionen gleich gehandhabt werden, nicht gemischt.

### 2.2 Welche Zeile(n) betroffen sind
- Steht der Cursor als reiner (kollabierter) Cursor in genau einer Zelle: Die **gesamte
  Zeile**, in der sich diese Zelle befindet, wird gelöscht — unabhängig davon, wie viele
  Spalten die Tabelle hat.
- Ist eine `CellSelection` über mehrere Zellen **innerhalb derselben Zeile, aber nicht
  über alle Spalten** aufgezogen (z. B. nur Spalte 1–2 von insgesamt 4 markiert): Es
  wird trotzdem die **komplette Zeile** gelöscht (Referenzverhalten Word/LibreOffice —
  „Zeile löschen“ bezieht sich immer auf ganze Zeilen, nie auf einzelne Zellen einer
  Zeile). Das ist bewusst von „Ausschneiden“/„Entf“ zu unterscheiden, das bei einer
  `CellSelection` **nur den Inhalt** leert (siehe `ausschneiden-req.md`, Abschnitt 2.2
  und Abschnitt 3, Grenzfall 6/7).
- Ist eine `CellSelection` über mehrere Zeilen aufgezogen: **Alle** von der Selektion
  berührten Zeilen werden in einem einzigen Arbeitsschritt (ein Undo-Schritt) entfernt.
- Über `selectedRect(state)` aus `prosemirror-tables` lässt sich der betroffene
  Zeilenbereich (`rect.top`..`rect.bottom`) zuverlässig ermitteln — die Bibliotheksfunktion
  `deleteRow` deckt den Ein-Zeilen-Fall bereits ab; für Mehrzeilen-Selektionen muss
  wiederholtes Entfernen (von unten nach oben, um Indexverschiebung zu vermeiden) oder
  eine äquivalente Mehrzeilen-Variante verwendet und mit einem eigenen Test abgesichert
  werden.

### 2.3 Verhalten bei verbundenen Zellen (Rowspan/Colspan)
- **Rowspan (vertikal verbundene Zelle) betroffen:** Wird eine Zeile gelöscht, über die
  eine vertikal verbundene Zelle hinwegreicht, muss der `rowspan`-Wert der verbleibenden
  Zelle um die Anzahl der gelöschten, mitbetroffenen Zeilen reduziert werden. Ist die
  gelöschte Zeile die „Ankerzeile“ (also die Zeile, die die tatsächliche Zelle mit
  Inhalt und `rowspan`-Attribut trägt, während die Folgezeilen nur „überdeckte“
  Positionen sind), **muss der Zellinhalt in die nächste noch vorhandene, von dieser
  Verbindung erfasste Zeile wandern** — der Inhalt darf nicht ersatzlos verschwinden.
  `prosemirror-tables`s `deleteRow`/`removeRow` übernimmt diese Migration bereits
  intern; das muss aber durch einen eigenen Test explizit nachgewiesen werden, nicht
  angenommen werden (siehe Grenzfall 3.5 sowie Rundreise-Testfall 4.2/3).
- **Colspan (horizontal verbundene Zelle) betroffen:** Eine horizontal über mehrere
  Spalten verbundene Zelle liegt vollständig innerhalb einer Zeile. Wird diese Zeile
  gelöscht, verschwindet die verbundene Zelle **komplett mit der Zeile** — es gibt hier
  (anders als bei Rowspan) **keine Migration**, da keine andere Zeile durch dieses
  `colspan` mit-referenziert wird. Das muss von Fall „Rowspan“ klar unterschieden und
  getrennt getestet werden (siehe Grenzfall 3.16).

### 2.4 Sonderfall: letzte verbleibende Zeile
- Wird die **einzige noch vorhandene Zeile** einer Tabelle gelöscht, entsteht eine
  Tabelle mit null Zeilen — das ist im ProseMirror-Schema (`tableNodes` aus
  `prosemirror-tables`, siehe `src/formats/shared/schema.ts`) kein gültiger Zustand.
  In diesem Fall muss die **gesamte Tabelle** entfernt werden (Referenzverhalten
  Word/LibreOffice: Löschen der letzten Zeile entfernt die Tabelle als Ganzes). Der
  Cursor landet danach an der Stelle, an der zuvor die Tabelle stand, in einem gültigen
  Absatz (bestehend oder neu eingefügt) — niemals in einem leeren/kaputten Dokumentzustand.
- Ist die Tabelle das **einzige** Element im gesamten Dokument, muss nach dem Löschen
  der letzten Zeile (und damit der ganzen Tabelle) mindestens ein leerer Absatz
  übrigbleiben, damit der Editor weiterhin bedienbar (Cursor aktiv, Tippen möglich)
  bleibt — analog zur Anforderung in `ausschneiden-req.md`, Abschnitt 3, Grenzfall 2.

### 2.5 Cursor-/Selektionszustand nach dem Löschen
- Existiert nach dem Löschen noch mindestens eine Zeile: Der Cursor wird in eine
  sinnvolle Zelle der **nachfolgenden** Zeile (an gleicher Spaltenposition) gesetzt;
  existiert keine nachfolgende Zeile mehr (letzte Zeile wurde gelöscht), in die
  **vorhergehende** Zeile an gleicher Spaltenposition.
- Wurde die gesamte Tabelle entfernt (Abschnitt 2.4), landet der Cursor im
  nachfolgenden bzw. — falls keiner existiert — vorhergehenden Absatz.
- Der Editor bleibt in jedem Fall fokussiert und sofort weiter bedienbar (Tippen
  funktioniert ohne weiteren Klick), konsistent mit `FEATURE-SPEC-DOCX-ODT.md`
  Abschnitt 1.3 („kein Reset, kein Verlust des Fokus“).

### 2.6 Undo/Redo-Verhalten
- „Zeile löschen“ erzeugt **einen** Undo-Schritt — auch wenn mehrere Zeilen auf einmal
  betroffen sind (Mehrzeilen-`CellSelection`, Abschnitt 2.2). Strg+Z stellt exakt den
  ursprünglichen Zeileninhalt, die ursprüngliche Zeilenreihenfolge **und** eine
  sinnvolle Selektion/Cursor-Position wieder her.
- Redo (Strg+Y bzw. Strg+Umschalt+Z) nach einem Undo entfernt die Zeile(n) erneut
  identisch.
- Der Löschvorgang darf sich in der Undo-Historie **nicht** mit einer unmittelbar
  vorausgehenden, unabhängigen Aktion verschmelzen (z. B. Tippen in einer anderen Zelle
  direkt davor — beides muss separat rückgängig machbar bleiben).

### 2.7 Interaktion mit dem bekannten Selection-Sync-Bug
- `FEATURE-SPEC-DOCX-ODT.md` (Abschnitt 2 und 20) beschreibt einen bereits gefundenen
  Fehler: Nach einer Toolbar-Aktion auf eine Selektion, gefolgt von einem Klick zur
  Neupositionierung, blieb die interne ProseMirror-Selektion veraltet stehen, sodass
  nachfolgende Eingaben ungewollt den gesamten Inhalt ersetzten oder löschten. Abschnitt
  6 derselben Datei nennt Tabellen ausdrücklich als „Hauptverdachtsfall, da Klicks
  zwischen Zellen ähnliche Selektionswechsel auslösen“.
- **„Zeile löschen“ ist ein zusätzlicher Verdachtsfall**, weil es — wie „Fett auf Alles
  auswählen“ — eine Selektion (`CellSelection` oder Cursor-in-Zelle) durch eine
  Struktur-Transaktion ersetzt, die anschließende Cursor-Position aber über einen ganz
  anderen Codepfad bestimmt wird als beim normalen Tippen. Pflicht-Testsequenz (siehe
  Testfälle unten): Tabelle mit mehreren Zeilen anlegen → Zeile löschen → per Klick in
  eine verbleibende Zelle neu positionieren → Enter → weiter tippen → Dokument darf
  nicht korrumpiert werden, beide benachbarten Zellen/Absätze bleiben erhalten.

### 2.8 Kein stiller Fehlschlag
- Jeder Versuch, „Zeile löschen“ ohne gültigen Tabellenkontext auszulösen, muss entweder
  gar nicht erst möglich sein (Button ausgeblendet/deaktiviert) oder sichtbar
  zurückgemeldet werden — es darf **keinen** Klick geben, der scheinbar etwas tut, aber
  nichts verändert, ohne dass das erkennbar ist (`FEATURE-SPEC-DOCX-ODT.md`
  Abschnitt 20, Punkt 4).
- Schlägt das Löschen aus einem unerwarteten Grund fehl (z. B. inkonsistenter
  Tabellenzustand nach einem Import einer Fremddatei mit exotischer Struktur), darf
  **kein** Teil-Löschen (nur manche Zellen der Zeile entfernt, Tabelle danach invalide)
  entstehen — entweder vollständiger Erfolg oder unveränderter Ausgangszustand plus
  sichtbarer Hinweis.

---

## 3. Grenzfälle

1. **Kollabierter Cursor in genau einer Zelle:** Löscht die gesamte Zeile, in der sich
   der Cursor befindet — unabhängig von der Spaltenzahl der Tabelle.
2. **`CellSelection` über mehrere Zellen derselben Zeile, aber nicht alle Spalten
   markiert:** Löscht trotzdem die **komplette** Zeile (siehe 2.2) — nicht zu
   verwechseln mit reinem Inhalt-Leeren via Entf/Ausschneiden.
3. **`CellSelection` über mehrere vollständige Zeilen:** Alle betroffenen Zeilen werden
   in einem Schritt entfernt, ein einziger Undo-Schritt stellt alle wieder her.
4. **Löschen der einzigen verbleibenden Zeile einer Tabelle:** Die gesamte Tabelle wird
   entfernt (siehe 2.4), Cursor landet in einem gültigen Absatz davor/danach, kein
   ungültiger Dokumentzustand.
5. **Zeile mit Anker einer vertikal verbundenen Zelle (`rowspan`) löschen:** Inhalt
   wandert in die nächste noch vorhandene, von der Verbindung erfasste Zeile,
   `rowspan`-Wert wird korrekt dekrementiert — kein Inhaltsverlust (siehe 2.3).
6. **Zeile löschen, die nur von einer `rowspan`-Verbindung „überdeckt“ wird (nicht die
   Ankerzeile):** `rowspan`-Wert der Ankerzelle sinkt um 1, kein Einfluss auf den
   Zellinhalt selbst.
7. **Erste Zeile der Tabelle löschen:** Verbleibende Zeilen rücken korrekt nach, keine
   Indexverschiebung/Off-by-one-Fehler bei nachfolgenden Zeilenoperationen.
8. **Letzte Zeile der Tabelle löschen (bei mehr als einer Zeile):** Tabelle bleibt mit
   den verbleibenden Zeilen bestehen, Cursor landet in der neuen letzten Zeile.
9. **Tabelle steht direkt am Dokumentanfang bzw. -ende:** Löschen einer Zeile (auch der
   letzten, wodurch die Tabelle verschwindet) darf die Cursor-Positionierung/den
   `gapCursor` nicht in einen inkonsistenten Zustand bringen — Editor bleibt danach
   normal bedienbar (Analogie zu `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6, Testfall 10).
10. **Zeile mit mehreren Absätzen, gemischter Formatierung oder einem eingebetteten
    Bild in einer Zelle:** Der gesamte Inhalt verschwindet mit der Zeile — kein
    verwaister Knoten bleibt an anderer Stelle im Dokument zurück.
11. **Verschachtelte Tabelle (Tabelle in einer Zelle der äußeren Tabelle):** Löschen
    einer Zeile der äußeren Tabelle darf nicht abstürzen; mindestens darf die innere
    Tabelle nicht in einen korrupten Zustand geraten, auch wenn die Darstellung
    vereinfacht bleibt (Analogie zu `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6, Testfall 8).
12. **Löschen einer Zeile, danach sofort Undo:** Stellt exakt Zeileninhalt, -reihenfolge
    und Cursor-/Selektionszustand wieder her.
13. **Löschen, Undo, danach Redo:** Entfernt die Zeile(n) erneut identisch zum ersten
    Löschvorgang.
14. **Pflicht-Regressionstest für den Selection-Sync-Bug** (siehe 2.7): Tabelle mit
    mehreren Zeilen → Zeile löschen → Klick zur Neupositionierung in verbleibender
    Zelle → Enter → weiter tippen → Dokument bleibt konsistent, keine unbeabsichtigte
    Komplett-Löschung/-Ersetzung.
15. **Versuch, „Zeile löschen“ ohne Tabellenkontext auszulösen** (Cursor außerhalb jeder
    Tabelle): Button nicht sichtbar/aktivierbar, kein Fehler, keine Konsole-Exception.
16. **Zeile mit reiner `colspan`-Zelle (keine `rowspan`-Beteiligung) löschen:** Zelle
    verschwindet vollständig mit der Zeile, keine Migration in andere Zeilen (siehe 2.3,
    Abgrenzung zu Grenzfall 5/6).
17. **Große Tabelle** (>5 Spalten, >10 Zeilen, Analogie zu
    `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6, Testfall 9): Löschen einer mittleren Zeile
    verändert ausschließlich diese Zeile, alle anderen Zellinhalte bleiben unverändert
    und in der richtigen Reihenfolge, keine spürbare Verzögerung.
18. **Reale komplexe Fremddatei mit exotischer Tabellenstruktur** (z. B. unregelmäßige
    `gridSpan`/`vMerge`-Kombinationen aus einer echten Word-Datei) importieren, dort
    eine Zeile löschen: Mindestens kein Absturz und keine stille Korruption; wo eine
    korrekte Rowspan-Migration nicht eindeutig auflösbar ist, muss ein dokumentiertes,
    deterministisches Fallback-Verhalten greifen (kein zufälliges Verhalten).
19. **Track-Changes-Abhängigkeit (zukünftig, Phase 3, aktuell nicht umgesetzt):** Sobald
    Änderungsverfolgung existiert (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 13), muss
    „Zeile löschen“ bei aktiver Aufzeichnung als Löschung markiert werden, statt die
    Zeile sofort endgültig zu entfernen. Für den aktuellen Verifikationsauftrag ist das
    **nicht** im Scope, aber hier als bekannte künftige Abhängigkeit dokumentiert.
20. **Mobile/Touch:** Zeile auf „Mobile“ (Pixel 7) und „Tablet“ (iPad Mini) laut
    `playwright.config.ts` auswählen und löschen — mindestens ein funktionierender Weg
    muss auf beiden Projekten nachweisbar sein.

---

## 4. Rundreise-Anforderung (DOCX und ODT)

### 4.1 Baseline (Voraussetzung, damit Rundreisen zu „Zeile löschen“ überhaupt
aussagekräftig sind)
Wie in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 1.3 gefordert: Datei A (DOCX) mit einer
mehrzeiligen Tabelle (inkl. mindestens einer `rowspan`- und einer `colspan`-Zelle)
hochladen, **ohne jede Änderung** exportieren, erneut importieren → Ergebnis entspricht
inhaltlich A (Tabellenstruktur, Zeilenzahl, verbundene Zellen identisch — bereits
teilweise durch `roundtrip.test.ts` in `src/formats/docx/__tests__/` und
`src/formats/odt/__tests__/` mit direkt konstruierten Daten abgedeckt, hier zusätzlich
über eine reale/importierte Datei zu verifizieren). Ebenso für ODT. Diese Baseline muss
grün sein, damit ein späterer Rundreise-Fehler eindeutig der Zeilen-Löschung zugeordnet
werden kann und nicht mit einem allgemeinen Tabellen-Reader/Writer-Fehler verwechselt
wird.

### 4.2 „Zeile löschen“-spezifische Rundreise — Testfälle
1. DOCX-Datei mit mehrzeiliger Tabelle importieren → eine Zeile im Editor löschen →
   Ergebnis als DOCX exportieren → reimportieren → gelöschte Zeile fehlt vollständig,
   alle übrigen Zeilen/Zellinhalte sind unverändert und in korrekter Reihenfolge
   vorhanden, `w:tblGrid`/Spaltenanzahl bleibt konsistent, kein verwaistes `<w:tr>`.
2. Dieselbe Sequenz für eine ODT-Datei (Import → Zeile löschen → Export als ODT →
   Reimport, `table:table-row`-Elemente entsprechend reduziert).
3. Zeile mit Anker einer vertikal verbundenen Zelle (`rowspan`) löschen → Export →
   Reimport → `rowSpan`/`table:number-rows-spanned` der verbleibenden Zelle korrekt
   dekrementiert, migrierter Inhalt an der richtigen Stelle, keine invalide
   Merge-Referenz im XML.
4. Zeile mit horizontal verbundener Zelle (`colspan`) löschen → Export → Reimport →
   Zeile inkl. verbundener Zelle vollständig entfernt, `gridSpan`/
   `table:number-columns-spanned` der übrigen Zeilen bleibt für sich konsistent.
5. Letzte verbleibende Zeile einer Tabelle löschen (Tabelle verschwindet vollständig,
   siehe 2.4) → Export → Reimport → keine leere/kaputte Tabellenstruktur im Ergebnis,
   restlicher Dokumentinhalt (Absätze davor/danach) bleibt unverändert.
6. Zeile mit einem Bild in einer Zelle löschen → Export → Reimport → Bild ist korrekt
   nicht mehr im Dokument enthalten **und** keine verwaiste Bilddatei verbleibt im
   DOCX-/ODT-Zip-Container (Analogie zu `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 7,
   Testfall 9, sowie `ausschneiden-req.md` Abschnitt 4.2, Testfall 6).
7. Mehrere Zeilen auf einmal löschen (Mehrzeilen-`CellSelection`, siehe 2.2/3.3) →
   Export → Reimport → exakt die erwarteten Zeilen fehlen, keine zusätzliche Zeile
   versehentlich mitentfernt oder übrig gelassen.
8. Cross-Format: ODT mit Tabelle importieren → Zeile löschen → als DOCX exportieren →
   reimportieren → Struktur (verbleibende Zeilen, verbundene Zellen) bleibt konsistent.
9. Cross-Format umgekehrt: DOCX mit Tabelle importieren → Zeile löschen → als ODT
   exportieren → reimportieren.
10. Doppelte Rundreise (Formatwechsel hin und zurück) an einer Tabelle, in der zuvor
    eine Zeile gelöscht wurde: DOCX → Editor (Zeile löschen) → ODT → Editor → DOCX →
    Inhalt bleibt nach zwei Konvertierungen weiterhin identisch zum erwarteten
    Nach-Löschen-Zustand.
11. Große Tabelle (>5 Spalten, >10 Zeilen) → eine mittlere Zeile löschen → Export →
    Reimport → alle übrigen Zellinhalte identisch und in unveränderter Reihenfolge
    (keine Off-by-one-Verschiebung, Analogie zu `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6,
    Testfall 9).

---

## 5. Menü-/Bedienelement-Übersicht (Soll-Zustand, kompakt)

| # | Element | Aktueller Zustand | Soll |
|---|---|---|---|
| 1 | Kontextabhängige Tabellen-Werkzeugleiste (Container für alle Tabellen-Kontextfunktionen) | fehlt komplett | neu bauen, sichtbar nur bei `isInTable(view.state)`, siehe Abschnitt 1 |
| 2 | Button „Zeile löschen“ innerhalb dieser Werkzeugleiste | fehlt komplett | neu bauen, SVG-Icon, `aria-label`, ruft neuen `deleteTableRow`-Befehl in `commands.ts` auf (Wrapper um `deleteRow`/`removeRow` aus `prosemirror-tables`, inkl. Mehrzeilen- und Letzte-Zeile-Sonderfall aus 2.2/2.4) |
| 3 | Kontextmenü-Eintrag „Zeilen löschen“ | ungeprüftes Browser-Standardverhalten, kein Tabellenbezug | verifizieren oder Entscheidung dokumentieren, siehe Abschnitt 1, Zeile 2 |
| 4 | Entf/Rücktaste bei `CellSelection` | keine eigene `keymap`-Bindung, Verwechslungsgefahr mit Struktur-Löschen | muss explizit **nur** Inhalt leeren, niemals Struktur löschen — eigener Test zur Abgrenzung, siehe Abschnitt 2.2 |
| 5 | Mobile/Touch-Zugriff auf „Zeile löschen“ | ungeprüft, da Funktion insgesamt fehlt | auf „Mobile“/„Tablet“-Playwright-Projekten mindestens ein funktionierender Weg |
| 6 | Rowspan/Colspan-korrekte Löschlogik | fehlt (kein Befehl vorhanden, der das prüfen könnte) | eigene Tests für Ankerzeilen-Migration (Rowspan) vs. Komplettverlust (Colspan), siehe Abschnitt 2.3 |
| 7 | Sonderfall „letzte Zeile löscht ganze Tabelle“ | fehlt | neu zu bauen und zu testen, siehe Abschnitt 2.4 |
| 8 | Dauerhafter Regressionstest Selection-Sync-Bug × Zeile löschen | fehlt | Pflichttest gemäß Abschnitt 2.7/3.14 |

---

## 6. Testfälle (Zusammenfassung, E2E-Fokus)

Analog zum Playwright-Aufbau in `tests/e2e/selection-regression.spec.ts` (echte
Browser-Interaktion über `page.keyboard`, `.ProseMirror`-Locator, `getByTitle`/
`getByRole`, keine isolierten Command-Aufrufe):

1. Tabelle mit 3 Zeilen einfügen, Cursor in mittlere Zeile setzen, „Zeile löschen“
   klicken → mittlere Zeile verschwindet, Zeile 1 und 3 bleiben unverändert und rücken
   zu zwei benachbarten Zeilen zusammen.
2. Mehrere Zellen über zwei komplette Zeilen per Maus aufziehen (`CellSelection`),
   „Zeile löschen“ klicken → beide Zeilen verschwinden in einem Schritt.
3. Nur Teilbereich einer einzelnen Zeile markieren (nicht alle Spalten), „Zeile
   löschen“ klicken → die komplette Zeile verschwindet trotzdem (nicht nur die
   markierten Zellen).
4. Tabelle mit genau einer Zeile → „Zeile löschen“ klicken → gesamte Tabelle
   verschwindet, Editor bleibt mit gültigem Absatz an dieser Stelle bedienbar.
5. Tabelle mit vertikal verbundener Zelle (zwei Zeilen als `rowspan`) → Ankerzeile
   löschen → verbleibende Zeile zeigt den migrierten Zellinhalt, kein Datenverlust.
6. Entf-Taste bei markierten Zellen einer ganzen Zeile drücken → nur Zellinhalte
   werden geleert, Zeile bleibt strukturell bestehen (Abgrenzungstest zu 1–3).
7. Regressionstest (Pflicht, dauerhaft in der Suite): Tabelle anlegen → Zeile löschen →
   Klick zur Neupositionierung in verbleibender Zelle → Enter → weiter tippen →
   Dokument bleibt korrekt, keine unbeabsichtigte Löschung/Ersetzung (siehe
   Abschnitt 2.7/3.14).
8. Strg+Z direkt nach „Zeile löschen“ → exakter Ursprungszustand (Inhalt, Reihenfolge,
   verbundene Zellen) wird wiederhergestellt.
9. Strg+Z, danach Strg+Y (Redo) → Zeile wird erneut identisch entfernt.
10. „Zeile löschen“ ohne Tabellenkontext (Cursor im normalen Fließtext) → Button ist
    nicht sichtbar/aktivierbar, keine Konsole-Exception.
11. „Zeile löschen“ → Export nach DOCX → Reimport → siehe Abschnitt 4.2, Testfall 1.
12. „Zeile löschen“ → Export nach ODT → Reimport → siehe Abschnitt 4.2, Testfall 2.
13. Große Tabelle (>5 Spalten, >10 Zeilen) über echten Datei-Import laden, eine mittlere
    Zeile per Toolbar löschen → alle übrigen Zellinhalte bleiben sichtbar unverändert.
14. „Zeile löschen“ auf allen drei in `playwright.config.ts` konfigurierten Projekten
    (Desktop Chrome, Mobile/Pixel 7, Tablet/iPad Mini) → Kernverhalten (Punkte 1, 4, 7)
    funktioniert auf jedem Projekt.

---

## 7. Testmatrix — Zusammenfassung

| Bereich | Unit-Test | E2E-Test | Rundreise-Test (DOCX/ODT) |
|---|---|---|---|
| Basis-Löschen (eine Zeile, Cursor in Zelle) | fehlt | fehlt — muss neu gebaut werden | fehlt |
| Mehrzeilen-`CellSelection` löschen | fehlt | fehlt | fehlt |
| Abgrenzung Entf/`CellSelection` vs. Struktur-Löschen | fehlt | fehlt | n/a |
| Rowspan-Ankerzeile löschen (Migration) | fehlt | fehlt | fehlt |
| Colspan-Zeile löschen (kein Migration nötig) | fehlt | fehlt | fehlt |
| Letzte Zeile löscht ganze Tabelle | fehlt | fehlt | fehlt |
| Undo/Redo nach Zeile löschen | fehlt | fehlt | n/a |
| Selection-Sync-Regressionstest × Zeile löschen | fehlt | **Pflicht, fehlt aktuell** | n/a |
| Cross-Format-Rundreise nach Zeile löschen | n/a | fehlt | fehlt |
| Große Tabelle (>5 Spalten, >10 Zeilen) | fehlt | fehlt | fehlt |
| Mobile/Tablet-Verhalten | n/a | fehlt | n/a |

**Fazit:** Der Backlog-Status „fehlt“ ist für „Zeile löschen“ nach dieser Prüfung
zutreffend — es gibt weder einen UI-Weg noch einen verdrahteten Befehl noch einen
einzigen Test, obwohl die zugrunde liegende Bibliothek (`prosemirror-tables`) die
nötigen Kernbefehle bereits mitliefert. Bevor der Status auf „vorhanden“ geändert werden
darf, müssen mindestens die Pflicht-Testfälle aus Abschnitt 6 (insbesondere Punkt 7, der
Selection-Sync-Regressionstest) grün sein und die Rundreise-Anforderungen aus
Abschnitt 4 für beide Formate nachgewiesen werden.

---

## 8. Abnahmekriterien (Definition of Done)

1. Eine kontextabhängige Tabellen-Werkzeugleiste existiert und enthält einen
   funktionierenden, per Klick auslösbaren Button „Zeile löschen“ (Abschnitt 1, Zeile 1).
2. Für jeden weiteren Zugriffsweg aus Abschnitt 1 ist dokumentiert, ob er unterstützt
   wird — kein unklarer Zwischenzustand.
3. Das Verhalten bei Cursor-in-Zelle, Teil-Zeilen-Selektion und Mehrzeilen-Selektion
   entspricht exakt Abschnitt 2.2 — insbesondere die Abgrenzung „ganze Zeile löschen“
   vs. „nur Zellinhalt leeren“ (Entf/Ausschneiden) ist durch einen eigenen Test belegt.
4. Rowspan- und Colspan-Sonderfälle (Abschnitt 2.3, Grenzfälle 5/6/16) sind je durch
   einen eigenen Test nachgewiesen — Rowspan-Migration funktioniert nachweislich,
   Colspan-Komplettverlust ist als korrektes (nicht fehlerhaftes) Verhalten bestätigt.
5. Der Sonderfall „letzte Zeile löscht ganze Tabelle“ (Abschnitt 2.4) ist implementiert
   und getestet, inklusive des Falls, dass die Tabelle das einzige Dokumentelement ist.
6. Alle Grenzfälle aus Abschnitt 3 sind einzeln durch einen Test abgedeckt oder als
   bewusst nicht unterstützt mit Begründung dokumentiert.
7. Der Pflicht-Regressionstest für den Selection-Sync-Bug in Kombination mit
   „Zeile löschen“ (Abschnitt 2.7/3.14/6.7) ist geschrieben, grün und dauerhaft Teil
   der Suite.
8. Alle Rundreise-Testfälle aus Abschnitt 4.2 sind für DOCX **und** ODT grün, inklusive
   der Prüfung auf verwaiste Bilddateien im Zip-Container (Testfall 6).
9. Kein Testfall zeigt stillen Datenverlust (Zeileninhalt verschwindet ohne
   nachvollziehbare Undo-Möglichkeit) oder eine JS-Exception in der Konsole.
10. Der Backlog-Eintrag `zeile-loeschen` wird erst dann als „vorhanden“ geführt, wenn
    Punkte 1–9 erfüllt sind; andernfalls verbleibt der Status auf „fehlt“ bzw. wird bei
    Teilerfüllung explizit auf „teilweise“ korrigiert, mit den fehlenden Teilen als
    eigene Nachfolge-Aufgaben.
