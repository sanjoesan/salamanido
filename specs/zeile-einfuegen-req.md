# Anforderungen: „Zeile einfügen" (oberhalb/unterhalb)

Status: Laut Backlog (`specs/FEATURE-BACKLOG.md`, Slug `zeile-einfuegen`, Abschnitt 3.2
„Tabellen", Priorität **1** – essenziell) als **„fehlt"** eingestuft. Diese Einstufung
gilt trotzdem als **nicht vertrauenswürdig**, bis sie durch tatsächliche Code-Recherche
und eine automatisierte Testsuite bestätigt ist — die gleiche Vorsicht, die
`FEATURE-SPEC-DOCX-ODT.md` bereits bei mehreren als „vorhanden" gemeldeten Funktionen
nötig gemacht hat (siehe dortiger Abschnitt 17: „ein erheblicher Teil der als ‚vorhanden'
markierten Funktionen existiert nur als Datenmodell/Reader/Writer, aber noch nicht als
tatsächlich bedienbare UI-Funktion"). Für „fehlt" gilt das Spiegelbild: zu prüfen ist,
ob wirklich **nichts** vorhanden ist, oder ob einzelne Bausteine (Datenmodell,
Bibliotheksfunktion, Reader/Writer-Unterstützung) bereits existieren und nur die
Bedienoberfläche fehlt — das würde den Umfang der Implementierungsarbeit verändern, auch
wenn der Endstatus „fehlt" für die Nutzerin unverändert richtig bleibt.

Geltungsbereich: ausschließlich die Funktion „neue Tabellenzeile oberhalb/unterhalb der
aktuellen Zeile einfügen" im gemeinsamen DOCX/ODT-Editor
(`src/formats/shared/editor/`, `src/formats/shared/schema.ts`). Eng verwandte
Tabellenfunktionen aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6 bzw.
`FEATURE-BACKLOG.md` Abschnitt 3.2 — Zeile löschen (`zeile-loeschen`), Spalte
einfügen/löschen (`spalte-einfuegen`/`spalte-loeschen`), Zellen verbinden/teilen
(`zellen-verbinden`/`zellen-teilen`), Tabelle löschen (`tabelle-loeschen`) — sind
**nicht** Gegenstand dieser Freigabe, werden aber als Abgrenzung und wegen gemeinsamer
technischer Grundlage (`prosemirror-tables`) an mehreren Stellen mitbehandelt, weil eine
robuste Zeilen-Einfügen-Implementierung nicht unabhängig von ihnen entworfen werden kann
(gleiche Selektionslogik, gleiche Tabellen-Konsistenzprüfung).

Wie in `FEATURE-SPEC-DOCX-ODT.md` festgelegt: DOCX und ODT teilen sich denselben
ProseMirror-Editor. Jede Anforderung unten gilt für **beide** Formate, inklusive
Rundreise (Import → Zeile einfügen → Export → Re-Import → Inhalt bleibt erhalten).

---

## 0. Befund aus Code-Recherche (Ausgangslage vor Verifikation)

Diese Spezifikation beruht auf tatsächlicher Durchsicht des Codes, nicht nur auf der
Backlog-Beschreibung. Festgestellt wurde:

1. **Kein Toolbar-Button, kein Kontextmenü, kein Tastatur-Shortcut.**
   `src/formats/shared/editor/Toolbar.tsx` enthält genau einen Tabellen-Button
   (`⊞ Tabelle`, ruft `insertTable(2, 2)` auf, um eine komplett neue 2×2-Tabelle
   einzufügen). Es gibt **keinerlei** Bedienelement, um innerhalb einer bestehenden
   Tabelle eine Zeile hinzuzufügen — weder Button, noch Rechtsklick-Kontextmenü, noch
   Tastenkombination. Der Befund aus `FEATURE-BACKLOG.md` Zeile `zeile-einfuegen` =
   „fehlt" ist damit auf UI-Ebene **bestätigt**.
2. **Kein eigener Command.** `src/formats/shared/editor/commands.ts` enthält keine
   Funktion zum Einfügen einer Zeile (kein `addRowBefore`/`addRowAfter`-Wrapper, keine
   eigene Logik). Es gibt in der Datei nur `insertTable`, das ausschließlich eine
   komplette neue Tabelle erzeugt, nie eine einzelne Zeile in eine bestehende Tabelle
   einfügt.
3. **Die zugrunde liegende Bibliothek unterstützt die Funktion bereits fix und fertig,
   wird aber nirgends aufgerufen.** `prosemirror-tables` ist in Version 1.8.5
   installiert und exportiert bereits einsatzbereite Commands `addRowBefore`,
   `addRowAfter` (sowie `deleteRow`, `addColumnBefore`, `addColumnAfter`,
   `deleteColumn`, `mergeCells`, `splitCell`, `deleteTable`, `CellSelection`,
   `TableMap` u. a.). `WordEditor.tsx` aktiviert bereits die Plugins `tableEditing()`
   und `columnResizing()` (Grundvoraussetzung, damit Zellselektionen und
   Tabellen-Commands überhaupt funktionieren), **aber keines der Zeilen/Spalten-Commands
   der Bibliothek wird importiert oder verwendet.** Das bedeutet: Der Implementierungs-
   aufwand für „Zeile einfügen" ist überwiegend **Verdrahtung** (Toolbar-Button/Menü +
   Aufruf von `addRowBefore`/`addRowAfter` + sichtbarer Aktivierungszustand), nicht die
   Neuentwicklung einer Tabellen-Manipulationslogik von Grund auf — das ändert nichts am
   Status „fehlt" für die Nutzerin, ist aber für die Aufwandsschätzung wichtig
   festzuhalten.
4. **Das Datenmodell (Schema) unterstützt beliebige Zeilenanzahl bereits vollständig.**
   `src/formats/shared/schema.ts` definiert die Tabellen-Nodes über
   `tableNodes({ tableGroup: 'block', cellContent: 'block+', cellAttributes: {} })` —
   Standard-`colspan`/`rowspan`/`colwidth`-Attribute sind vorhanden, `cellContent:
   'block+'` erlaubt mehrere Absätze je Zelle. Eine zusätzliche, per Command
   eingefügte Zeile ist strukturell nicht anders als eine beim Import bereits
   vorhandene Zeile.
5. **Reader/Writer wurden für beliebige Zeilenzahl bereits mit Unit-Tests
   abgesichert — aber nur mit direkt konstruierten Test-Fixtures, nie über eine
   tatsächliche Zeilen-Einfügen-Bedienung.**
   `src/formats/docx/__tests__/roundtrip.test.ts` (`describe('DOCX round trip:
   tables')`) und `src/formats/odt/__tests__/roundtrip.test.ts` (`describe('ODT round
   trip: tables')`) bauen Tabellen mit 2 Zeilen sowie Zeilen mit `colspan`/`rowspan`
   direkt als JSON auf und prüfen den Export/Re-Import. Das bestätigt: **die
   Export-/Import-Pfade für eine beliebige Zeilenzahl inklusive Merges funktionieren
   bereits grundsätzlich** — offen ist ausschließlich, ob eine über die Toolbar/Command
   tatsächlich eingefügte Zeile exakt dieselbe, bereits getestete Datenstruktur erzeugt
   (siehe Abschnitt 5 unten für die daraus resultierende, noch fehlende
   Rundreise-Prüfung).
6. **Bekannte, vom Feature unabhängige, aber für Grenzfälle relevante
   Export-Eigenart:** Sowohl `docx/writer.ts` (`tableToDocx`) als auch `odt/writer.ts`
   leiten die Spaltenanzahl der exportierten Tabelle **ausschließlich aus der ersten
   Zeile** ab (`docx/writer.ts`: `colCount = (rows[0]?.content ?? []).reduce((sum,
   cell) => sum + Number(cell.attrs?.colspan ?? 1), 0) || 1`; `odt/writer.ts`:
   `colCount = rows[0]?.content?.length ?? 1`, dort **ohne** Berücksichtigung von
   `colspan`). Eine neu eingefügte Zeile, die zur **ersten** Zeile der Tabelle wird
   (Einfügen „oberhalb" der bisherigen Zeile 1), muss deshalb exakt dieselbe effektive
   Spaltenzahl wie die übrige Tabelle ergeben — sonst kollabiert der Export auf eine
   falsche Spaltenzahl für die gesamte Tabelle. Das ist kein Bug, den diese
   Spezifikation beheben muss, aber ein **Grenzfall, der explizit mit einem Test
   abgedeckt sein muss** (Abschnitt 4, Grenzfall 5).
7. **Keine Tests.** Weder in `tests/e2e/*.spec.ts` noch in den Unit-Tests gibt es einen
   Test mit „addRow"/„insertRow"/„Zeile einfügen" im Namen oder Inhalt. Die einzige
   tabellenbezogene E2E-Abdeckung überhaupt betrifft indirekt den
   Selection-Sync-Regressionstest (`tests/e2e/selection-regression.spec.ts`), nicht
   Zeilenoperationen.

**Konsequenz:** Diese Anforderungsdatei beschreibt den **Soll-Zustand**, gegen den der
Ist-Zustand aus Punkt 1–7 nach Implementierung geprüft werden muss. Der Backlog-Status
„fehlt" ist nach heutigem Stand zutreffend; er darf erst nach vollständiger Umsetzung
und Verifikation der Abschnitte 3–6 auf „vorhanden" geändert werden (Freigabekriterium
siehe Abschnitt 7).

---

## 1. Menüpunkte / Bedienelemente (Soll-Zustand)

| # | Element | Auslösung | Aktueller Stand (Befund) | Soll |
|---|---|---|---|---|
| 1 | Toolbar-Button „Zeile oberhalb einfügen" | Klick, nur sichtbar/aktivierbar mit Cursor/Selektion in einer Tabellenzelle | **Fehlt komplett** | Fügt eine neue, leere Zeile unmittelbar **oberhalb** der Zeile ein, in der sich der Cursor/die Selektion befindet |
| 2 | Toolbar-Button „Zeile unterhalb einfügen" | Klick, wie oben | **Fehlt komplett** | Fügt eine neue, leere Zeile unmittelbar **unterhalb** der Zeile ein, in der sich der Cursor/die Selektion befindet |
| 3 | Kontextmenü (Rechtsklick) in einer Tabellenzelle → „Zeile oberhalb einfügen" / „Zeile unterhalb einfügen" | Rechtsklick | Fehlt (kein Tabellen-Kontextmenü existiert überhaupt) | Nice-to-have, kein Blocker für die Freigabe von `zeile-einfuegen`, aber empfohlen, da dies in Word/LibreOffice der primäre Weg ist |
| 4 | Tastenkombination (z. B. Alt+Umschalt+Einfg wie in Word, oder Tab in der letzten Zelle der letzten Zeile) | Tastatur | Tab-in-letzter-Zelle-Verhalten ist laut `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6 gefordert, aber ebenfalls noch **nicht** verifiziert/implementiert | Mindestens „Tab in der letzten Zelle der letzten Zeile fügt neue Zeile unterhalb hinzu" muss funktionieren (Überschneidung mit der dortigen Anforderung — wird hier als Grenzfall 4 in Abschnitt 4 mitgeprüft) |
| 5 | Deaktivierter/verborgener Zustand außerhalb einer Tabelle | — | n/a (Button existiert nicht) | Buttons/Menüpunkte müssen **deaktiviert oder unsichtbar** sein, wenn der Cursor sich nicht in einer Tabelle befindet — kein Klick, der stillschweigend nichts tut (vgl. `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.4) |
| 6 | Sichtbares Feedback bei erfolgreicher Aktion | — | n/a | Neue Zeile ist sofort sichtbar im Editor, Cursor bleibt in einer sinnvollen Zelle (siehe Abschnitt 3.4) — keine zusätzliche Bestätigung/Dialog nötig, die Zeile selbst ist die Bestätigung |

**Klarstellung „oberhalb/unterhalb":** Bezugspunkt ist immer die Zeile, in der sich die
aktuelle Selektion befindet — bei einer Selektion, die mehrere Zeilen umspannt
(Zeilen-übergreifende Zellauswahl), ist das Verhalten in Abschnitt 4, Grenzfall 8
gesondert festgelegt.

---

## 2. Geltende Randbedingungen aus der Haupt-Spezifikation

Diese Datei ergänzt, ersetzt aber nicht die Anforderungen aus
`FEATURE-SPEC-DOCX-ODT.md`, insbesondere:

- Abschnitt 6 („Tabellen"), dort insbesondere: „Zeile einfügen (oberhalb/unterhalb),
  Zeile löschen" als explizit geforderte Funktion, sowie Testfall 4 („Zeile/Spalte
  einfügen/löschen → Struktur bleibt konsistent, kein Crash") und Testfall 10
  („Tabelle direkt am Dokumentanfang/-ende einfügen … weiterhin editierbar" — relevant,
  weil Zeilen-Einfügen auch an einer Tabelle direkt am Dokumentanfang/-ende
  funktionieren muss).
- Abschnitt 2, Regressionstest für den Selection-Sync-Bug: Tabellen sind laut
  Haupt-Spezifikation „ein Hauptverdachtsfall, da Klicks zwischen Zellen ähnliche
  Selektionswechsel auslösen" — jede Zeilen-Einfügen-Testsequenz muss zusätzlich
  prüfen, dass die Editor-Selektion danach konsistent ist (Tippen direkt nach dem
  Einfügen einer Zeile darf nichts Falsches löschen oder in die falsche Zelle
  schreiben).
- Abschnitt 20.1 („Icon-Rendering") — falls die Buttons mit Symbolen statt Textlabels
  umgesetzt werden, gilt dieselbe Anforderung an eindeutige, System-/Emoji-unabhängige
  Icons wie für die bestehenden Toolbar-Symbole.
- Abschnitt 20.4 („Kein stiller Fehlschlag") — gilt uneingeschränkt.
- Abschnitt 19 (Export-Robustheit & Rundreise) — gilt für jede über „Zeile einfügen"
  erzeugte Tabellenstruktur genauso wie für importierten Inhalt.
- `FEATURE-BACKLOG.md` Abschnitt 3.2: `zeile-einfuegen` steht in derselben Tabelle wie
  `zeile-loeschen`, `spalte-einfuegen`, `spalte-loeschen`, `zellen-verbinden`,
  `zellen-teilen`, `tabelle-loeschen` — alle mit Status „fehlt", Priorität 1–2. Diese
  Datei behandelt ausschließlich `zeile-einfuegen`; die Geschwisterfunktionen benötigen
  eigene, gleich strukturierte Anforderungsdateien.

---

## 3. Gewünschtes Verhalten im Detail

### 3.1 Grundfall: Zeile oberhalb einfügen
- Cursor/Selektion befindet sich in einer beliebigen Zelle einer Zeile *Z* (nicht
  notwendigerweise die erste Zelle).
- Nach Auslösen: Eine neue, leere Zeile erscheint **unmittelbar vor** Zeile *Z*.
- Die neue Zeile hat **exakt so viele Zellen bzw. dieselbe effektive Spaltenzahl** wie
  die übrige Tabelle an dieser Stelle — inklusive korrekter Berücksichtigung
  bestehender `colspan`/`rowspan`-Strukturen benachbarter Zeilen (siehe Abschnitt 4,
  Grenzfälle 2–3).
- Alle bisherigen Zeilen, deren Inhalt/Formatierung/Merges betroffen sein könnten
  (insbesondere vertikale Merges, die über die Einfügeposition hinweglaufen), bleiben
  strukturell korrekt (siehe Abschnitt 4, Grenzfall 2).
- Die neue Zeile enthält leere, aber gültige Zellen (mind. ein leerer Absatz je Zelle,
  analog zu neu per `insertTable` erzeugten Zellen), keine `null`/`undefined`-Inhalte.
- Zeilenhöhe/Zellformatierung der neuen Zeile: sinnvoller Standardwert (keine
  geerbte, zufällige Formatierung aus einer Nachbarzeile, sofern nicht explizit anders
  gefordert — siehe Klärungsbedarf in Abschnitt 3.5).

### 3.2 Grundfall: Zeile unterhalb einfügen
- Spiegelbildlich zu 3.1: die neue Zeile erscheint **unmittelbar nach** Zeile *Z*.
- Alle übrigen Anforderungen aus 3.1 gelten identisch.

### 3.3 Einfügen in Tabellen mit vertikal verbundenen Zellen (rowspan)
- Wird eine Zeile **innerhalb** eines vertikalen Merge-Bereichs eingefügt (oberhalb
  oder unterhalb einer Zeile, die selbst Teil einer über mehrere Zeilen reichenden
  verbundenen Zelle ist), muss die neue Zeile den Merge-Bereich sinnvoll verlängern
  (die verbundene Zelle wächst um eine weitere Zeile) statt die Merge-Struktur zu
  zerstören oder eine ungültige „hängende" Fortsetzungszelle ohne zugehörige
  Ursprungszelle zu erzeugen.
- Dieses Verhalten wird von `prosemirror-tables`s `addRowBefore`/`addRowAfter`
  standardmäßig geleistet (Bibliotheksverhalten) — muss aber mit einem expliziten Test
  bestätigt werden, da es in Salamanido bisher nie über echte Bedienung ausgelöst
  wurde (siehe Befund 0.7).

### 3.4 Cursor-/Selektionsverhalten nach dem Einfügen
- Nach „Zeile oberhalb einfügen": Cursor bleibt **in derselben logischen Zelle**, in
  der er vor der Aktion stand (jetzt eine Zeile weiter unten im Dokument, da eine neue
  Zeile vor ihr eingeschoben wurde) — nicht in der neuen leeren Zeile.
- Nach „Zeile unterhalb einfügen": Cursor bleibt ebenfalls in derselben logischen
  Zelle, deren Position im Dokument unverändert bleibt (die neue Zeile kommt danach).
- Die Editor-Selektion muss nach der Aktion mit `view.state.selection`
  **konsistent** sein (kein Stale-Selection-Zustand, siehe Abschnitt 2 und der
  Selection-Sync-Regressionstest) — direkt anschließendes Tippen darf ausschließlich
  in der erwarteten Zelle landen.

### 3.5 Formatierung/Zellinhalt der neu eingefügten Zeile (klärungsbedürftig, muss vor Freigabe entschieden werden)
- Zu entscheiden und zu dokumentieren: Übernimmt die neue Zeile die
  Spaltenbreiten (`colwidth`) der Nachbarzeile (empfohlen, da sonst die Tabelle
  optisch springt) und ggf. Zellrahmen/-schattierung? Mindestanforderung: Die Tabelle
  bleibt nach dem Einfügen **visuell konsistent** (keine Zelle ohne erkennbaren
  Rahmen, keine Spalte, die sich sichtbar verschiebt).
- Zeichenformatierung (fett, Farbe etc.) der neuen, leeren Zellen: **kein**
  automatisches Übernehmen von Formatierung der Nachbarzeile für den (noch
  nicht vorhandenen) Zellinhalt — neu getippter Text in der neuen Zeile beginnt mit
  Basisformat, es sei denn, eine explizite Anforderung dazu wird nachträglich
  ergänzt.

### 3.6 Undo/Redo
- Ein Zeilen-Einfügen-Vorgang ist **ein einziger Undo-Schritt** — Strg+Z macht die
  komplette neue Zeile in einem Schritt wieder rückgängig, nicht zellenweise.
- Nach Undo: Tabelle entspricht exakt dem Zustand unmittelbar vor dem Einfügen
  (inklusive Cursor-/Selektionsposition).
- Redo stellt den Zustand mit neuer Zeile identisch wieder her.

### 3.7 Rückmeldeverhalten (kein stiller Fehlschlag)
- Ist der Cursor **nicht** in einer Tabelle, ist der Button/Menüpunkt deaktiviert bzw.
  unsichtbar (siehe Abschnitt 1, # 5) — kein Klick ins Leere.
- Schlägt das Einfügen aus einem unerwarteten Grund fehl (z. B. eine strukturell
  inkonsistente, importierte Fremdtabelle, siehe Abschnitt 4, Grenzfall 9), muss eine
  sichtbare Rückmeldung erfolgen statt eines stillen No-Ops.

---

## 4. Grenzfälle (müssen explizit geprüft werden)

| # | Grenzfall | Erwartetes Verhalten |
|---|---|---|
| 1 | Zeile einfügen in einer Tabelle mit nur einer einzigen Zeile | Funktioniert wie im Grundfall, Tabelle hat danach 2 Zeilen |
| 2 | Zeile einfügen oberhalb/unterhalb, während eine Zelle **oberhalb** der Einfügeposition Teil eines vertikalen Merges (rowspan > 1) ist, der über die Einfügeposition hinwegreicht | Merge wird um eine Zeile verlängert (siehe 3.3), keine kaputte/verwaiste Merge-Referenz |
| 3 | Zeile einfügen in einer Tabelle mit horizontal verbundenen Zellen (colspan > 1) in der Nachbarzeile | Neue Zeile übernimmt eine **plausible** Spaltenaufteilung (mindestens: Summe der effektiven Spalten stimmt mit dem Rest der Tabelle überein) — kein Aufsplitten in mehr/weniger Zellen als die Tabelle Spalten hat |
| 4 | Zeile einfügen per Tab-Taste in der letzten Zelle der letzten Zeile (Anforderung aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6) | Neue Zeile wird unterhalb angehängt, Cursor springt in deren erste Zelle — muss im Rahmen dieser Spezifikation ebenfalls verifiziert werden, da sie denselben zugrunde liegenden Mechanismus nutzt |
| 5 | Zeile **oberhalb der bisherigen ersten Zeile** einfügen (die neue Zeile wird zur neuen Zeile 1) | Export (DOCX **und** ODT) berechnet die Tabellen-Spaltenzahl aus der neuen Zeile 1 (siehe Befund 0.6) — muss exakt dieselbe effektive Spaltenzahl wie zuvor ergeben, sonst kollabiert die gesamte Tabelle beim Export auf eine falsche Spaltenzahl. Expliziter Regressionstest erforderlich. |
| 6 | Zeile einfügen, während eine Selektion **mehrere Zellen derselben Zeile** markiert (keine ganze Zeile, aber mehr als eine Zelle) | Es wird genau **eine** neue Zeile eingefügt (oberhalb/unterhalb der Zeile, die die Selektion enthält), keine Zeile pro markierter Zelle |
| 7 | Zeile einfügen, während eine `CellSelection` **eine ganze Zeile** markiert | Wie Grundfall — Bezugszeile ist die markierte Zeile |
| 8 | Zeile einfügen, während eine `CellSelection` **mehrere Zeilen** umspannt (rechteckige Mehrzeilen-Selektion) | Verhalten muss explizit festgelegt werden: entweder (a) es wird relativ zur **ersten**/**letzten** Zeile der Selektion je eine Zeile eingefügt, oder (b) es werden so viele Zeilen eingefügt, wie die Selektion Zeilen umfasst (analog zu Words Verhalten „markiere N Zeilen → Einfügen fügt N neue Zeilen ein"). Muss dokumentiert und mit Test abgesichert werden, darf nicht zufällig/undefiniert bleiben. |
| 9 | Zeile einfügen in einer aus einer Fremddatei importierten, strukturell ungewöhnlichen Tabelle (z. B. inkonsistente Zellenzahl je Zeile, wie sie laut `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 18 bei realen komplexen Dateien vorkommen kann) | Kein Crash; falls die Struktur nicht sicher interpretierbar ist, sichtbare Fehlermeldung statt stillem Fehlschlag oder Datenkorruption |
| 10 | Zeile einfügen in einer Tabelle, die eine verschachtelte Tabelle in einer ihrer Zellen enthält | Einfügen einer Zeile in die **äußere** Tabelle darf die verschachtelte Tabelle in der betroffenen Zelle nicht beschädigen; Einfügen einer Zeile **innerhalb** der inneren Tabelle wirkt sich nur auf diese aus |
| 11 | Zeile einfügen in einer Tabelle direkt am Dokumentanfang bzw. -ende (vgl. `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6, Testfall 10) | Neue Zeile erscheint korrekt, Editor bleibt danach normal bedienbar (Cursor kann aus der Tabelle heraus vor/nach ihr positioniert werden) |
| 12 | Wiederholtes, schnelles Auslösen der Aktion (mehrfacher Klick/Tastendruck in Folge) | Jede Einfügung erzeugt einen eigenen Undo-Schritt, keine doppelt eingefügte Zeile durch ein Event-Race, keine Race Condition mit der Selection-Sync-Logik aus `WordEditor.tsx` |
| 13 | Zeile einfügen, unmittelbar gefolgt von einer Formatierungs-Toolbar-Aktion (z. B. Fett) auf die neue Zeile | Funktioniert wie auf jeder anderen Selektion — Regressionstest aus Abschnitt 2 der Haupt-Spezifikation gilt hier explizit mit |
| 14 | Sehr große Tabelle (vgl. Haupt-Spezifikation Abschnitt 6, Testfall 9: „>5 Spalten, >10 Zeilen") — Zeile in der Mitte einfügen | UI bleibt reaktionsfähig, keine spürbare Verzögerung, alle Zeilen davor/danach bleiben unverändert an ihrer relativen Position |
| 15 | Zeile einfügen, danach Undo, danach Redo, danach erneut Zeile einfügen (gemischte Sequenz) | Jeder Schritt liefert exakt den erwarteten Zwischenzustand, keine kumulierten Abweichungen |

---

## 5. Rundreise-Anforderung

Zwei getrennte, beide verpflichtende Rundreise-Prüfungen — beide **müssen** über
tatsächliche Bedienung im Editor erfolgen (Toolbar-Klick bzw. simulierte
Tastatureingabe), nicht nur über direkt konstruierte JSON-Fixtures, da genau das laut
Befund 0.5 der bisher fehlende Nachweis ist.

### 5.1 Baseline-Rundreise (Regressionsschutz — darf durch die neue Funktion nicht kaputtgehen)
Existiert unabhängig vom Feature bereits in `FEATURE-SPEC-DOCX-ODT.md` (Abschnitt
1.2/1.3/19) und muss vor **und** nach jeder Änderung an der Tabellen-Logik weiterhin
bestehen:

1. Reale DOCX-Datei mit mindestens einer Tabelle unverändert hochladen (kein Klick,
   keine Eingabe, insbesondere **kein** Zeilen-Einfügen) → sofort exportieren → erneut
   importieren → Tabelleninhalt (Zeilen, Zellen, Merges) entspricht inhaltlich dem
   Original.
2. Dasselbe mit einer realen ODT-Datei mit Tabelle.
3. Die bestehenden Unit-Tests `describe('DOCX round trip: tables')` und
   `describe('ODT round trip: tables')` (`src/formats/docx/__tests__/roundtrip.test.ts`,
   `src/formats/odt/__tests__/roundtrip.test.ts`) müssen weiterhin grün bleiben.
4. Beide Prüfungen müssen weiterhin bestehen, nachdem an der Zeilen-Einfügen-Funktion
   etwas geändert/repariert wurde (kein Nebenwirkungs-Regressionsfehler durch neue
   Toolbar-Handler oder neue Tabellen-Commands, die auch beim reinen Import/Anzeigen
   ungewollt greifen).

### 5.2 Feature-Rundreise (Zeile einfügen selbst)
Für **jede** der folgenden Kombinationen: Zeile über die Toolbar (bzw. simulierte
Bedienung, siehe Abschnitt 6) einfügen → Dokument als DOCX exportieren → reimportieren
→ Struktur/Inhalt erhalten; **und** identisch als ODT; **und** zusätzlich
Cross-Format (in ein ursprünglich als DOCX importiertes Dokument eine Zeile einfügen
und als ODT exportieren, sowie umgekehrt):

1. Einfache Tabelle (keine Merges) → Zeile oberhalb der ersten Zeile einfügen → Export
   enthält 3 Zeilen in korrekter Reihenfolge, neue Zeile ist leer, übrige Zeilen
   inhaltlich unverändert.
2. Dieselbe Ausgangstabelle → Zeile unterhalb der letzten Zeile einfügen → analoges
   Ergebnis.
3. Zeile in der Mitte einer Tabelle mit mindestens 3 Zeilen einfügen → Reihenfolge
   aller Zeilen (vorher/neu/nachher) bleibt korrekt.
4. Tabelle mit horizontalem Merge (`colspan`) → Zeile oberhalb/unterhalb der
   verbundenen Zeile einfügen → Merge der bestehenden Zeile bleibt unverändert
   erhalten, neue Zeile hat korrekte effektive Spaltenzahl (siehe Grenzfall 3/5).
5. Tabelle mit vertikalem Merge (`rowspan`) → Zeile **innerhalb** des Merge-Bereichs
   einfügen → Merge wird um eine Zeile verlängert (siehe 3.3), Rundreise erhält den
   verlängerten Merge unverändert als zusammenhängende Zelle.
6. Zellinhalt mit mehreren Absätzen und Formatierung (z. B. ein fett formatierter
   Absatz) in einer bestehenden Zeile → Zeile daneben einfügen → bestehende,
   formatierte Zeile bleibt bei der Rundreise exakt erhalten (Regressionsschutz auf
   Zellenebene, nicht nur auf Zeilenebene).
7. Zeile einfügen in einer Tabelle direkt am Dokumentanfang bzw. -ende (Grenzfall 11).
8. Doppelte Rundreise (Format-Wechsel hin und zurück) an einer Tabelle, in die zuvor
   mehrere Zeilen an unterschiedlichen Positionen eingefügt wurden → kein kumulativer
   Datenverlust (analog Haupt-Spezifikation Abschnitt 19, Testfall 3).

**Abnahmekriterium:** Formatierungsverluste bei Cross-Format-Konvertierung sind wie im
Rest der Spezifikation zu dokumentieren und akzeptabel; **Struktur- oder Textverlust
ist es nicht** — weder bei 5.1 noch bei 5.2. Eine falsch berechnete Spaltenzahl beim
Export (Grenzfall 5) gilt als Strukturverlust und ist damit ein Abnahme-Blocker.

---

## 6. Testplan-Hinweise (E2E, Playwright, und Unit-Ebene)

1. **E2E, bevorzugter Ansatz:** Tabelle über den bestehenden `⊞ Tabelle`-Button
   einfügen, Cursor per `page.locator('.ProseMirror td').nth(n).click()` in eine
   bestimmte Zelle setzen, dann den neuen „Zeile oberhalb/unterhalb einfügen"-Button
   klicken. Anschließend Zellenzahl/-inhalt über `page.locator('.ProseMirror tr')`
   auszählen und prüfen, nicht nur visuell.
2. **Unit-Test-Ebene für den Command selbst:** Ein direkter Test des neuen
   Commands (Wrapper um `addRowBefore`/`addRowAfter` aus `prosemirror-tables`) gegen
   einen mit `EditorState.create` konstruierten Testzustand — unabhängig vom Browser,
   für schnelle Regressionsprüfung von Merge-Verlängerung (Grenzfall 2) und
   Spaltenzahl-Konsistenz (Grenzfall 3/5).
3. Jeder E2E-Test für Zeile-einfügen muss wie in Abschnitt 2 gefordert direkt im
   Anschluss eine Tipp- oder Formatierungsaktion in der betroffenen Zelle ausführen und
   deren korrektes Ergebnis prüfen (Selection-Sync-Regressionsschutz), nicht nur den
   unmittelbaren Strukturzustand nach dem Einfügen selbst.
4. Rundreise-Tests (Abschnitt 5) sind **sowohl** als Unit-Test gegen Reader/Writer
   **als auch** zusätzlich als E2E-Test über echte Bedienung zu führen — reine
   Unit-Tests mit direkt konstruierten `ProseMirrorJSON`-Fixtures (wie die bereits
   bestehenden `describe('… round trip: tables')`-Blöcke) reichen laut Befund 0.5/0.7
   ausdrücklich **nicht** aus, um die Funktion als verifiziert zu betrachten.
5. Für Grenzfall 8 (mehrzeilige `CellSelection`) muss die gewählte Verhaltensvariante
   zunächst in dieser Datei oder einem Folge-Commit dokumentiert und dann exakt so
   getestet werden — kein Test, der nur „irgendein plausibles Ergebnis" akzeptiert.
6. Für Grenzfall 5 (Spaltenzahl-Kollaps beim Export, siehe Befund 0.6) wird
   ausdrücklich ein **dedizierter** Regressionstest verlangt, der eine Zeile *vor* die
   bisherige erste Zeile einer Tabelle mit `colspan` in der bisherigen ersten Zeile
   einfügt und danach den Export beider Formate auf korrekte Gesamt-Spaltenzahl prüft
   — dieser Test darf nicht im allgemeinen Rundreise-Testfall „untergehen".

---

## 7. Freigabekriterium für „vorhanden"

Der Backlog-Status von `zeile-einfuegen` darf erst dann von „fehlt" auf **vorhanden**
geändert werden, wenn:

- mindestens ein Bedienweg aus Abschnitt 1 (# 1 und # 2, Toolbar-Buttons) tatsächlich
  implementiert und über eine echte Browser-Interaktion (nicht nur Command-Aufruf)
  auslösbar ist,
- alle Testfälle aus Abschnitt 6 automatisiert vorliegen und grün sind,
- die Grenzfälle aus Abschnitt 4 einzeln befundet sind (funktioniert / funktioniert
  nicht und wird dokumentiert / wurde repariert) — insbesondere Grenzfall 5 (Export-
  Spaltenzahl) und Grenzfall 8 (mehrzeilige Selektion, Verhalten muss explizit
  festgelegt sein, nicht offen bleiben),
- Abschnitt 5.1 (Baseline-Rundreise) nicht durch die Implementierung gebrochen wurde,
- Abschnitt 5.2 (Feature-Rundreise) für DOCX, ODT und beide Cross-Format-Richtungen
  besteht,
- der Regressionstest aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2 (Selection-Sync-Bug)
  explizit mit einer Zeilen-Einfügen-Sequenz nachgestellt und grün ist.

Andernfalls ist der Status auf **teilweise** zu setzen (z. B. falls die Funktion nur
über einen Command ohne UI existiert, oder nur für DOCX, nicht für ODT verifiziert
ist) und die konkret fehlenden Teilpunkte sind hier nachzutragen, analog zur
Vorgehensweise in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 17/21 sowie in
`specs/einfuegen-req.md` Abschnitt 7.
