# Anforderungen: „Zeile einfügen" (oberhalb/unterhalb)

Status: Laut Backlog (`specs/FEATURE-BACKLOG.md`, Abschnitt 3.2 „Tabellen", Slug
`zeile-einfuegen`, Beschreibung „Fügt eine neue Tabellenzeile an gewählter Position ein.",
Priorität **1** – essenziell) als **„fehlt"** eingestuft. Diese Einstufung gilt trotzdem
als **nicht vertrauenswürdig**, bis sie durch tatsächliche Code-Recherche und eine
automatisierte Testsuite bestätigt ist — die gleiche Vorsicht, die
`FEATURE-SPEC-DOCX-ODT.md` bereits bei mehreren als „vorhanden" gemeldeten Funktionen
nötig gemacht hat (siehe dortiger Abschnitt 17: „ein erheblicher Teil der als ‚vorhanden'
markierten Funktionen existiert nur als Datenmodell/Reader/Writer, aber noch nicht als
tatsächlich bedienbare UI-Funktion"). Für „fehlt" gilt das Spiegelbild in beide
Richtungen: Es ist zu prüfen, ob wirklich **nichts** vorhanden ist oder ob einzelne
Bausteine (Datenmodell, Bibliotheksfunktion, Reader/Writer-Unterstützung) bereits
existieren und nur die Bedienoberfläche fehlt — das verändert den Umfang der
Implementierungsarbeit, auch wenn der Endstatus „fehlt" für die Nutzerin unverändert
richtig bleibt. Und es darf ein späteres „vorhanden" **nicht** angenommen werden, ohne
dass jeder Punkt dieser Datei einzeln über echte Bedienung nachgewiesen wurde.

Geltungsbereich: ausschließlich die Funktion „neue Tabellenzeile oberhalb/unterhalb der
aktuellen Zeile einfügen" im gemeinsamen DOCX/ODT-Editor
(`src/formats/shared/editor/`, `src/formats/shared/schema.ts`). Eng verwandte
Tabellenfunktionen aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6 bzw.
`FEATURE-BACKLOG.md` Abschnitt 3.2 — Zeile löschen (`zeile-loeschen`), Spalte
einfügen/löschen (`spalte-einfuegen`/`spalte-loeschen`), Zellen verbinden/teilen
(`zellen-verbinden`/`zellen-teilen`), Tabelle löschen (`tabelle-loeschen`) — sind
**nicht** Gegenstand dieser Freigabe, werden aber als Abgrenzung und wegen gemeinsamer
technischer Grundlage (`prosemirror-tables`, gemeinsame kontextabhängige
Tabellen-Werkzeugleiste) an mehreren Stellen mitbehandelt, weil eine robuste
Zeilen-Einfügen-Implementierung nicht unabhängig von ihnen entworfen werden kann
(gleiche Selektionslogik, gleiche Tabellen-Konsistenzprüfung, gemeinsame Sichtbarkeits-/
Deaktivierungs-Politik der Buttons).

Wie in `FEATURE-SPEC-DOCX-ODT.md` festgelegt: DOCX und ODT teilen sich denselben
ProseMirror-Editor. Jede Anforderung unten gilt für **beide** Formate, inklusive
Rundreise (Import → Zeile einfügen → Export → Re-Import → Inhalt bleibt erhalten). Die
Cross-Format-Rundreise (DOCX → … → ODT) ist ein Sonderfall, der aus strukturellen Gründen
nur auf Adapter-/Unit-Ebene prüfbar ist — siehe Befund 0.8 und Abschnitt 5.2.

Stil und Gliederung orientieren sich an `E:\docs\FEATURE-SPEC-DOCX-ODT.md`.

---

## 0. Befund aus Code-Recherche (Ausgangslage vor Verifikation, geprüft 2026-07-04)

Diese Spezifikation beruht auf tatsächlicher Durchsicht des **aktuellen** Codes, nicht nur
auf der Backlog-Beschreibung. Frühere Fassungen dieser Datei enthielten einen inzwischen
überholten Befund zum ODT-Writer (siehe Punkt 6) — dieser wurde bei erneuter Prüfung
korrigiert, statt ihn ungeprüft zu übernehmen. Festgestellt wurde:

1. **Kein Toolbar-Button, kein Kontextmenü, kein Tastatur-Shortcut für Zeilenoperationen.**
   `src/formats/shared/editor/Toolbar.tsx` enthält genau einen Tabellen-Button
   (`⊞ Tabelle`, `title/aria-label="Tabelle einfügen"`, ruft `insertTable(2, 2)` auf, um
   eine komplett neue 2×2-Tabelle einzufügen). Es gibt **keinerlei** Bedienelement, um
   innerhalb einer bestehenden Tabelle eine Zeile hinzuzufügen — weder Button, noch
   Rechtsklick-Kontextmenü, noch Tastenkombination, noch eine kontextabhängige
   Tabellen-Werkzeugleiste. Der Befund aus `FEATURE-BACKLOG.md` Zeile `zeile-einfuegen` =
   „fehlt" ist damit auf UI-Ebene **bestätigt**. (Randnotiz zur Aufwandsschätzung: Die
   Toolbar verwendet das `disabled`-Muster inzwischen bereits an anderer Stelle — der
   „Ausschneiden"-Button ist `disabled={!canCut(view.state)}` — die für Punkt 5 dieser
   Bedienelemente geforderte Deaktivierung außerhalb einer Tabelle folgt also einer im
   Projekt bereits etablierten Konvention und ist kein neues UI-Konzept.)
2. **Kein eigener Command.** `src/formats/shared/editor/commands.ts` importiert/re-exportiert
   aus `prosemirror-tables` **nur** `isInTable` und definiert unter den Tabellen-Operationen
   nur `insertTable(rows, cols)` (erzeugt ausschließlich eine komplette neue Tabelle über
   `state.tr.replaceSelectionWith(table)`). Es gibt **keine** Funktion zum Einfügen einer
   Zeile (kein `addRowBefore`/`addRowAfter`-Wrapper, keine eigene Logik). Seit früheren
   Fassungen sind unabhängige Commands hinzugekommen (`insertHardBreak`, `cutSelection`,
   `canCut`), aber **kein** Zeilen-Command.
3. **Die zugrunde liegende Bibliothek unterstützt die Funktion bereits fix und fertig,
   wird aber nirgends aufgerufen.** `prosemirror-tables` (Version 1.8.5) exportiert
   einsatzbereite Commands `addRowBefore`, `addRowAfter` (sowie `deleteRow`,
   `addColumnBefore`, `addColumnAfter`, `deleteColumn`, `mergeCells`, `splitCell`,
   `deleteTable`, `goToNextCell`, `CellSelection`, `TableMap`, `selectedRect` u. a.).
   `WordEditor.tsx` aktiviert bereits die Plugins `tableEditing()` und `columnResizing()`
   (Grundvoraussetzung, damit Zellselektionen und Tabellen-Commands überhaupt funktionieren),
   **aber keines der Zeilen/Spalten-Commands der Bibliothek wird importiert oder verwendet.**
   Der Implementierungsaufwand für „Zeile einfügen" ist damit überwiegend **Verdrahtung**
   (Bedienelement + Aufruf von `addRowBefore`/`addRowAfter` + sichtbarer
   Aktivierungs-/Deaktivierungszustand), nicht die Neuentwicklung einer
   Tabellen-Manipulationslogik — das ändert nichts am Status „fehlt" für die Nutzerin, ist
   aber für die Aufwandsschätzung wichtig.
4. **Das Datenmodell (Schema) unterstützt beliebige Zeilenanzahl bereits vollständig.**
   `src/formats/shared/schema.ts` definiert die Tabellen-Nodes über
   `tableNodes({ tableGroup: 'block', cellContent: 'block+', cellAttributes: {} })` —
   Standard-`colspan`/`rowspan`/`colwidth`-Attribute sind vorhanden, `cellContent: 'block+'`
   erlaubt mehrere Absätze, verschachtelte Tabellen, Listen und Bilder je Zelle. Eine
   zusätzlich per Command eingefügte Zeile ist strukturell nicht anders als eine beim Import
   bereits vorhandene Zeile.
5. **Reader/Writer wurden für beliebige Zeilenzahl bereits mit Unit-Tests abgesichert —
   aber nur mit direkt konstruierten Test-Fixtures, nie über eine tatsächliche
   Zeilen-Einfügen-Bedienung.** `src/formats/docx/__tests__/roundtrip.test.ts`
   (`describe('DOCX round trip: tables')`) und `src/formats/odt/__tests__/roundtrip.test.ts`
   (`describe('ODT round trip: tables')`) bauen Tabellen mit mehreren Zeilen sowie Zellen
   mit `colspan`/`rowspan` direkt als JSON auf und prüfen Export/Re-Import. Das bestätigt:
   Die Export-/Import-Pfade für eine beliebige Zeilenzahl inklusive Merges funktionieren
   grundsätzlich — offen ist ausschließlich, ob eine über Toolbar/Command **tatsächlich
   eingefügte** Zeile exakt dieselbe, bereits getestete Datenstruktur erzeugt (daraus folgt
   die noch fehlende Rundreise-Prüfung, Abschnitt 5).
6. **Export-Logik für Spaltenzahl und Merges ist im aktuellen Code bereits korrekt — der
   früher hier notierte ODT-Bug existiert nicht mehr (korrigierter Befund).** Frühere
   Fassungen dieser Datei beschrieben `odt/writer.ts` als colspan-blind
   (`colCount = rows[0]?.content?.length`) und ohne Ausgabe von
   `<table:covered-table-cell/>`. **Bei erneuter Prüfung des aktuellen Codes trifft das
   nicht mehr zu:** Der `case 'table'` in `blockToOdt` (`src/formats/odt/writer.ts`)
   berechnet `colCount` inzwischen als **Summe der `colspan`-Werte der ersten Zeile** —
   identisch zu `docx/writer.ts` (`tableToDocx`) — und schreibt für jede von einem
   `colspan` (horizontal) oder `rowspan` (vertikal, über einen `pending[]`-Tracker analog
   zum `vMerge`-Continuation-Mechanismus des DOCX-Writers) überdeckte Rasterzelle ein
   `<table:covered-table-cell/>`. Ein Code-Kommentar verweist auf
   `speichern-exportieren-code.md 1.4`; die Korrektur ist offenbar bereits unter dem Ticket
   `speichern-exportieren` erfolgt, und der ODT-Writer vergibt Tabellennamen inzwischen
   deterministisch (Sequenz statt `Math.random()`). **Beide Writer exportieren Spaltenzahl
   und vertikale/horizontale Merges damit strukturell korrekt.** Konsequenz für dieses
   Feature: Der früher als Hauptrisiko notierte „Spaltenzahl-Kollaps beim Export einer
   oberhalb eingefügten ersten Zeile" ist nach aktuellem Code **kein offener Bug mehr**,
   sondern ein **Regressionsrisiko** — die neue Funktion darf diese bereits korrekte
   Export-Logik nicht brechen. Der Nachweis muss deshalb gegen einen **unabhängigen Parser**
   und über eine **Roh-XML-Prüfung** geführt werden, nicht nur über unseren eigenen Reader
   (der denselben etwaigen blinden Fleck teilen könnte, siehe `FEATURE-SPEC-DOCX-ODT.md`
   Abschnitt 19). Grenzfall 5 und Rundreise 5.2/Punkt 5 sind entsprechend als
   Regressionsschutz formuliert.
7. **Keine Tests für Zeilenoperationen.** Weder in `tests/e2e/*.spec.ts` noch in den
   Unit-Tests gibt es einen Test mit „addRow"/„insertRow"/„Zeile einfügen" im Namen oder
   Inhalt. Die einzige tabellenbezogene E2E-Abdeckung überhaupt ist der
   Selection-Sync-Regressionstest (`tests/e2e/selection-regression.spec.ts`), der einen
   Zellwechsel per Klick prüft, nicht Zeilenoperationen. `playwright.config.ts` definiert
   die Projekte **Desktop Chrome**, **Mobile** (Pixel 7) und **Tablet** (iPad Mini) — jede
   neue Tabellenfunktion muss deshalb auch auf Touch-Geräten bedienbar sein (siehe Abschnitt
   1, # 7 und Grenzfall 16).
8. **Kein Cross-Format-Export in der App.** Ein geöffnetes Dokument kann ausschließlich in
   **sein eigenes** Ursprungsformat re-exportiert werden (jedes `FormatModule.exportFile`
   schreibt nur sein Format; `docxModule` → DOCX, `odtModule` → ODT). Es gibt **keine**
   UI-Funktion „als anderes Format exportieren". Die Cross-Format-Rundreise (in ein als DOCX
   importiertes Dokument eine Zeile einfügen und als ODT exportieren, und umgekehrt) ist
   deshalb **nicht** als E2E-Test über echte Bedienung umsetzbar, sondern nur auf
   Adapter-/Unit-Ebene (Reader liefert `body`-JSON → Zeile per Transaktion einfügen → dem
   Writer des anderen Formats übergeben). Das ist eine dokumentierte strukturelle
   Einschränkung der App, kein stillschweigend erfüllter Punkt (siehe Abschnitt 5.2 und 7).
9. **Keymap-Ausgangslage (für Grenzfall 4 / Tab-Bindung relevant).** `WordEditor.tsx`
   registriert **einen** projekteigenen `keymap({...})`-Block (vor `keymap(baseKeymap)`),
   der aktuell `Mod-z`→`undo`, **`Mod-y`→`redo`, `Mod-Shift-z`→`redo`**, `Enter`→
   `splitListItem`, `Shift-Enter`→`insertHardBreak`, `Mod-b/i/u` und `Shift-Delete`→
   `cutSelection` bindet. **Redo ist damit bereits vorhanden** (Grenzfall 15 benötigt kein
   neues Redo). Es existiert **kein** `Tab`/`Shift-Tab`-Eintrag. Die für Grenzfall 4 nötige
   Tab-Bindung ist genau in **diesen** Block einzuhängen — der trägt einen dokumentierten
   Warnhinweis, dass jede neue Tastenbindung geprüft werden muss, um nicht versehentlich die
   nativ (nicht per Keymap) laufenden Zwischenablage-Tasten `Mod-c/x/v` zu verschlucken
   (siehe `specs/kopieren-req.md` Abschnitt 3, `specs/kopieren-code.md` Abschnitt 8). Der
   Standard-Tab-Handler der Tabellenbibliothek ist `goToNextCell('right')` bzw.
   `goToNextCell('left')` für `Shift-Tab`; in der letzten Zelle liefert dieser `false`, und
   erst dann (verkettet) fügt `addRowAfter` eine neue Zeile an (Grenzfall 4). Beide Commands
   sind in `prosemirror-tables` 1.8.5 vorhanden (Befund 0.3), werden aber bislang nicht
   verdrahtet.

**Konsequenz:** Diese Anforderungsdatei beschreibt den **Soll-Zustand**, gegen den der
Ist-Zustand aus Punkt 1–9 nach Implementierung geprüft werden muss. Der Backlog-Status
„fehlt" ist nach heutigem Stand zutreffend; er darf erst nach vollständiger Umsetzung und
Verifikation der Abschnitte 3–6 auf „vorhanden" geändert werden (Freigabekriterium siehe
Abschnitt 7).

### 0.10 PO-Zweitprüfung (2026-07-05) — unabhängig gegen den Live-Code erneut verifiziert

Diese Datei wurde zu einem früheren Zeitpunkt bereits einmal geschrieben. Statt ihre
Befunde ungeprüft zu übernehmen, wurden sie im Rahmen dieser Freigabe **erneut, unabhängig**
gegen den aktuellen Stand von `E:\docs` geprüft (nicht nur gegen die Dateien selbst,
sondern zusätzlich gegen `node_modules/prosemirror-tables/dist/index.d.ts` und
`package.json`):

- `Toolbar.tsx` enthält weiterhin genau einen Tabellen-Button (`⊞ Tabelle`, Zeile 277–289,
  `insertTable(2, 2)`), kein Zeilen-Bedienelement — **bestätigt**.
- `commands.ts` exportiert weiterhin nur `isInTable` aus `prosemirror-tables`, kein
  Zeilen-Command — **bestätigt**.
- `prosemirror-tables` ist als `^1.8.5` in `package.json` gepinnt; der installierte Export-
  Barrel (`dist/index.d.ts`) enthält tatsächlich `addRow`, `addRowBefore`, `addRowAfter`,
  `deleteRow`, `goToNextCell`, `selectedRect`, `findTable`, `TableMap`, `tableEditing`,
  `columnResizing`, `fixTables` u. a. — **bestätigt, Befund 0.3 ist keine Vermutung**.
  `WordEditor.tsx:109–110` aktiviert `columnResizing()`/`tableEditing()` bereits.
- `schema.ts:154` (`tableNodes({ tableGroup: 'block', cellContent: 'block+', cellAttributes:
  {} })`) — **bestätigt**, keine Schema-Änderung nötig.
- `odt/writer.ts` berechnet `colCount` weiterhin als **Summe der Colspans der ersten Zeile**
  (nicht `rows[0]?.content?.length`) und schreibt `<table:covered-table-cell/>` sowohl für
  horizontale als auch — über den `pending[]`-Tracker — für vertikale Überdeckung; die
  Tabellennamen kommen aus einer deterministischen `TableNameSequence`, nicht aus
  `Math.random()`. **Befund 0.6 (korrigierte Fassung) ist zutreffend, der alte
  „ODT-Bug"-Verdacht bleibt zu Recht verworfen.**
- `WordEditor.tsx:85–107` bindet weiterhin `Mod-z/Mod-y/Mod-Shift-z/Enter/Shift-Enter/
  Mod-b/Mod-i/Mod-u/Shift-Delete`, keinen `Tab`/`Shift-Tab`-Eintrag — **bestätigt**.
- `playwright.config.ts` definiert weiterhin **Desktop Chrome**, **Mobile** (Pixel 7),
  **Tablet** (iPad Mini) sowie zwei auf `clipboard*.spec.ts` beschränkte Zusatzprojekte
  (Desktop Safari/Firefox) — **bestätigt**, keine neuen Projekte, die diese Datei betreffen.
- Alle in Abschnitt 2 zitierten Geschwisterdateien (`zeile-loeschen-req.md`,
  `kopieren-req.md`/`-code.md`, `einfuegen-req.md`, `liste-einruecken-tab-req.md`)
  existieren tatsächlich und enthalten die zitierten Abschnitte (z. B. `zeile-loeschen-
  req.md` Abschnitt 2.1 „Aktivierungsbedingungen").
- Zusätzlich existiert inzwischen ein Umsetzungsplan `specs/zeile-einfuegen-code.md`
  (Dev-Sicht, Stand 2026-07-04), der dieselben Befunde zeilengenau gegen den Code bestätigt
  und daraus ableitet, dass die Funktion noch **nicht** implementiert ist (kein
  `addRowBefore`/`addRowAfter`-Aufruf, kein `Zeile oberhalb/unterhalb`-Bedienelement,
  keine `Tab`-Bindung im Code — mit Volltextsuche erneut bestätigt). Beide Dokumente
  widersprechen sich an keiner Stelle; diese Anforderungsdatei bleibt unverändert die
  verbindliche Quelle für das **Soll**, `zeile-einfuegen-code.md` für das **Wie**.

**Ergebnis dieser Zweitprüfung:** Es wurde kein sachlicher Fehler in den Abschnitten 0–7
gefunden, der eine Korrektur erzwingen würde. Der Backlog-Status „fehlt" bleibt zutreffend
und wird hiermit als Anforderungsgrundlage **freigegeben** (Prüfung erfolgte durch direkte
Quellcode- und Bibliotheks-Einsicht, nicht durch bloße Übernahme der Vorfassung).

---

## 1. Menüpunkte / Bedienelemente (Soll-Zustand)

Die Zeilen-Einfügen-Buttons gehören konzeptionell zu **einer kontextabhängigen
Tabellen-Werkzeugleiste**, die alle Tabellen-Kontextfunktionen bündelt (Zeile
einfügen/löschen, Spalte einfügen/löschen, Zellen verbinden/teilen, Tabelle löschen —
jeweils eigene Backlog-Slugs). Sichtbarkeit und Deaktivierung müssen für **alle** diese
Funktionen **konsistent** gehandhabt werden (entweder durchgängig „nur sichtbar in einer
Tabelle" oder durchgängig „sichtbar-aber-deaktiviert außerhalb"), nicht gemischt — siehe
`specs/zeile-loeschen-req.md` Abschnitt 2.1.

| # | Element | Auslösung | Aktueller Stand (Befund) | Soll |
|---|---|---|---|---|
| 1 | Button „Zeile oberhalb einfügen" | Klick, nur sichtbar/aktivierbar mit Cursor/Selektion in einer Tabellenzelle | **Fehlt komplett** | Fügt eine neue, leere Zeile unmittelbar **oberhalb** der Zeile ein, in der sich der Cursor/die Selektion befindet |
| 2 | Button „Zeile unterhalb einfügen" | Klick, wie oben | **Fehlt komplett** | Fügt eine neue, leere Zeile unmittelbar **unterhalb** der Zeile ein, in der sich der Cursor/die Selektion befindet |
| 3 | Kontextmenü (Rechtsklick) in einer Tabellenzelle → „Zeile oberhalb/unterhalb einfügen" | Rechtsklick | Fehlt (es existiert überhaupt kein tabellenbewusstes Kontextmenü; `contextmenu` wird nirgends abgefangen) | Nice-to-have, **kein Blocker** für die Freigabe von `zeile-einfuegen`, aber empfohlen (in Word/LibreOffice der primäre Weg). Wird er nicht gebaut, ist die Nicht-Unterstützung **explizit zu dokumentieren**, kein unklarer Zwischenzustand |
| 4 | Tastenkombination bzw. Tab in der letzten Zelle der letzten Zeile | Tastatur | Tab-in-letzter-Zelle-Verhalten ist laut `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6 gefordert, aber **nicht** implementiert (kein `Tab`/`Shift-Tab`-Eintrag im projekteigenen Keymap-Block, siehe Befund 0.9) | Mindestens „Tab in der letzten Zelle der letzten Zeile fügt eine neue Zeile unterhalb hinzu und setzt den Cursor in deren erste Zelle" muss funktionieren (Grenzfall 4). Umsetzung als `Tab`→`goToNextCell('right')`, das in der letzten Zelle mit `addRowAfter` verkettet wird; `Shift-Tab`→`goToNextCell('left')` (ohne Zeilenerzeugung). Die Tab-Navigation darf normales Tab-Verhalten **außerhalb** einer Tabelle nicht brechen (siehe 3.8) |
| 5 | Deaktivierter/verborgener Zustand außerhalb einer Tabelle | — | n/a (Button existiert nicht) | Buttons/Menüpunkte müssen **deaktiviert oder unsichtbar** sein, wenn `isInTable(view.state)` `false` liefert — kein Klick, der stillschweigend nichts tut (vgl. `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.4). Konsistent mit allen übrigen Tabellen-Kontextfunktionen (siehe Vorbemerkung) |
| 6 | Sichtbares Feedback bei erfolgreicher Aktion | — | n/a | Neue Zeile ist sofort im Editor sichtbar, Cursor bleibt in einer sinnvollen Zelle (siehe 3.4) — keine zusätzliche Bestätigung/Dialog nötig, die Zeile selbst ist die Bestätigung. Für den Fehlerfall siehe 3.7 |
| 7 | Bedienbarkeit auf Touch/Mobile | Antippen/Touch | n/a (Funktion fehlt); zusätzlich unklar, ob eine Zelle per Touch überhaupt zuverlässig ansteuerbar ist | Auf den in `playwright.config.ts` konfigurierten Projekten **Mobile** (Pixel 7) und **Tablet** (iPad Mini) muss mindestens **ein** funktionierender Weg existieren, in einer Tabelle eine Zeile einzufügen — die Tabellen-Werkzeugleiste (# 1/# 2) muss auf Touch-Geräten erreichbar und auslösbar sein (Grenzfall 16) |
| 8 | Barrierefreiheit/Beschriftung der Buttons | — | n/a | Jeder Button hat ein aussagekräftiges `aria-label` („Zeile oberhalb einfügen"/„Zeile unterhalb einfügen"), ist per Tastatur fokussier- und mit Enter/Leertaste auslösbar, und trägt — falls ein Icon verwendet wird — ein **SVG-Icon** (kein Emoji/Unicode-Glyphe), das system-/schriftartunabhängig eindeutig erkennbar ist bzw. ein eindeutiges Textlabel (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.1) |

**Klarstellung „oberhalb/unterhalb":** Bezugspunkt ist immer die Zeile, in der sich die
aktuelle Selektion befindet — bei einer Selektion, die mehrere Zeilen umspannt
(zeilenübergreifende `CellSelection`), ist das Verhalten in Abschnitt 4, Grenzfall 8
verbindlich festgelegt.

---

## 2. Geltende Randbedingungen aus der Haupt-Spezifikation

Diese Datei ergänzt, ersetzt aber nicht die Anforderungen aus `FEATURE-SPEC-DOCX-ODT.md`,
insbesondere:

- **Abschnitt 6 („Tabellen"):** „Zeile einfügen (oberhalb/unterhalb), Zeile löschen" als
  explizit geforderte Funktion; Testfall 4 („Zeile/Spalte einfügen/löschen → Struktur
  bleibt konsistent, kein Crash") und Testfall 10 („Tabelle direkt am
  Dokumentanfang/-ende … weiterhin editierbar" — relevant, weil Zeilen-Einfügen auch an
  einer Tabelle direkt am Dokumentanfang/-ende funktionieren muss).
- **Abschnitt 2 (Selection-Sync-Bug):** Tabellen sind laut Haupt-Spezifikation „ein
  Hauptverdachtsfall, da Klicks zwischen Zellen ähnliche Selektionswechsel auslösen". Jede
  Zeilen-Einfügen-Testsequenz muss zusätzlich prüfen, dass die Editor-Selektion danach
  konsistent ist (Tippen direkt nach dem Einfügen darf nichts Falsches löschen oder in die
  falsche Zelle schreiben). Der bestehende Fix (`reconcileSelectionOnClick` per
  Mausklick-Abgleich in `WordEditor.tsx`) darf durch die neue Funktion nicht unterlaufen
  werden.
- **Abschnitt 8 (Seitenlayout/Responsivität):** Der Editor muss auf Tablet- und
  Mobile-Viewport bedienbar bleiben — daraus folgt die Touch-Anforderung in Abschnitt 1,
  # 7 und Grenzfall 16.
- **Abschnitt 20.1 („Icon-Rendering"):** eindeutige, system-/emoji-unabhängige Icons —
  bevorzugt SVG (siehe Abschnitt 1, # 8).
- **Abschnitt 20.4 („Kein stiller Fehlschlag"):** gilt uneingeschränkt (siehe 3.7).
- **Abschnitt 19 (Export-Robustheit & Rundreise):** Export nach DOCX und ODT muss in einer
  **echten** Zielanwendung bzw. gegen einen **unabhängigen** Parser/Schema prüfbar valide
  sein, nicht nur durch unseren eigenen Reader wieder einlesbar — gilt für jede über „Zeile
  einfügen" erzeugte Tabellenstruktur genauso wie für importierten Inhalt (siehe Befund 0.6
  und Abschnitt 5).
- **`FEATURE-BACKLOG.md` Abschnitt 3.2:** `zeile-einfuegen` steht in derselben Tabelle wie
  `zeile-loeschen`, `spalte-einfuegen`, `spalte-loeschen`, `zellen-verbinden`,
  `zellen-teilen`, `tabelle-loeschen` (alle Status „fehlt", Priorität 1–2). Diese Datei
  behandelt ausschließlich `zeile-einfuegen`; die Geschwisterfunktionen benötigen eigene,
  gleich strukturierte Anforderungsdateien und teilen sich mit dieser Funktion die
  kontextabhängige Tabellen-Werkzeugleiste (Abschnitt 1).

---

## 3. Gewünschtes Verhalten im Detail

### 3.1 Grundfall: Zeile oberhalb einfügen
- Cursor/Selektion befindet sich in einer beliebigen Zelle einer Zeile *Z* (nicht
  notwendigerweise die erste Zelle).
- Nach Auslösen: Eine neue, leere Zeile erscheint **unmittelbar vor** Zeile *Z*.
- Die neue Zeile hat **exakt dieselbe effektive Spaltenzahl** wie die übrige Tabelle an
  dieser Stelle — inklusive korrekter Berücksichtigung bestehender
  `colspan`/`rowspan`-Strukturen benachbarter Zeilen (siehe Grenzfälle 2–3).
- Alle bisherigen Zeilen, deren Inhalt/Formatierung/Merges betroffen sein könnten
  (insbesondere vertikale Merges, die über die Einfügeposition hinweglaufen), bleiben
  strukturell korrekt (siehe Grenzfall 2).
- Die neue Zeile enthält leere, aber gültige Zellen (mind. ein leerer Absatz je Zelle,
  analog zu neu per `insertTable` erzeugten Zellen), keine `null`/`undefined`-Inhalte.
- Zeilenhöhe/Zellformatierung der neuen Zeile: sinnvoller Standardwert, keine geerbte,
  zufällige Formatierung aus einer Nachbarzeile (siehe 3.5, dort verbindlich entschieden).

### 3.2 Grundfall: Zeile unterhalb einfügen
- Spiegelbildlich zu 3.1: die neue Zeile erscheint **unmittelbar nach** Zeile *Z*.
- Alle übrigen Anforderungen aus 3.1 gelten identisch.

### 3.3 Einfügen in Tabellen mit vertikal verbundenen Zellen (rowspan)
- Wird eine Zeile **innerhalb** eines vertikalen Merge-Bereichs eingefügt (oberhalb oder
  unterhalb einer Zeile, die selbst Teil einer über mehrere Zeilen reichenden verbundenen
  Zelle ist), muss die neue Zeile den Merge-Bereich sinnvoll **verlängern** (die verbundene
  Zelle wächst um eine weitere Zeile), statt die Merge-Struktur zu zerstören oder eine
  ungültige „hängende" Fortsetzungszelle ohne zugehörige Ursprungszelle zu erzeugen.
- Dieses Verhalten wird von `prosemirror-tables`s `addRowBefore`/`addRowAfter`
  standardmäßig geleistet — muss aber mit einem expliziten Test bestätigt werden, da es in
  Salamanido bisher nie über echte Bedienung ausgelöst wurde (Befund 0.7), und der
  verlängerte Merge muss auch die **Rundreise** überstehen (Abschnitt 5.2, Punkt 5), was
  eine Roh-XML-Prüfung des Exports einschließt (Befund 0.6).

### 3.4 Cursor-/Selektionsverhalten nach dem Einfügen
- Nach „Zeile oberhalb einfügen": Cursor bleibt **in derselben logischen Zelle**, in der er
  vor der Aktion stand (jetzt eine Zeile weiter unten im Dokument, da eine neue Zeile vor
  ihr eingeschoben wurde) — nicht in der neuen leeren Zeile.
- Nach „Zeile unterhalb einfügen": Cursor bleibt ebenfalls in derselben logischen Zelle,
  deren Position im Dokument unverändert bleibt (die neue Zeile kommt danach).
- Die Editor-Selektion muss nach der Aktion mit `view.state.selection` **konsistent** sein
  (kein Stale-Selection-Zustand, siehe Abschnitt 2) — direkt anschließendes Tippen darf
  ausschließlich in der erwarteten Zelle landen.
- Ausnahme Grenzfall 4 (Tab in der letzten Zelle): Dort ist das gewünschte
  Cursor-Verhalten abweichend — der Cursor springt in die **erste Zelle der neuen Zeile**
  (siehe Grenzfall 4).

### 3.5 Formatierung/Zellinhalt der neu eingefügten Zeile (entschieden)
- **Entscheidung (zuvor als klärungsbedürftig markiert, hiermit festgelegt):** Es wird
  **keine** Zeichenformatierung und **keine** individuelle Spaltenbreite von der
  Nachbarzeile geerbt. Begründung: Reader (`docx/reader.ts`, `odt/reader.ts`) setzen
  `colwidth` heute **immer** auf `null`, und die Writer schreiben pauschale Spaltenbreiten
  (DOCX hartkodiert `w:w="2000"`, ODT ohne Breitenangabe) — es existiert im heutigen
  Datenmodell **kein** von `null` abweichender, divergierender `colwidth`-Wert, den man
  erben oder nicht erben könnte. Die in älteren Fassungen befürchtete optische
  „Sprung"-Situation kann mit dem aktuellen Code gar nicht auftreten.
- Neu getippter Text in der neuen, leeren Zeile beginnt mit **Basisformat** (die
  Bibliotheks-Standardzelle enthält einen leeren Absatz ohne Marks). Ein automatisches
  Übernehmen von Zeichenformatierung ist **nicht** erwünscht.
- Mindestanforderung an die Darstellung: Die Tabelle bleibt nach dem Einfügen **visuell
  konsistent** (jede Zelle hat einen erkennbaren Rahmen über die Editor-CSS, keine Spalte
  verschiebt sich sichtbar).

### 3.6 Undo/Redo
- Ein Zeilen-Einfügen-Vorgang ist **ein einziger Undo-Schritt** — Strg+Z macht die
  komplette neue Zeile in einem Schritt wieder rückgängig, nicht zellenweise. Auch der
  Grenzfall-4-Vorgang (Tab in letzter Zelle: neue Zeile **plus** Cursor-Positionierung)
  ist **ein** Undo-Schritt.
- Nach Undo: Tabelle entspricht exakt dem Zustand unmittelbar vor dem Einfügen (inklusive
  Cursor-/Selektionsposition).
- Redo stellt den Zustand mit neuer Zeile identisch wieder her.
- Der Einfügevorgang darf sich in der Undo-Historie **nicht** mit einer unmittelbar
  vorausgehenden, unabhängigen Aktion (z. B. Tippen in einer anderen Zelle) verschmelzen.

### 3.7 Rückmeldeverhalten (kein stiller Fehlschlag)
- Ist der Cursor **nicht** in einer Tabelle, ist der Button/Menüpunkt deaktiviert bzw.
  unsichtbar (siehe Abschnitt 1, # 5) — kein Klick ins Leere.
- Schlägt das Einfügen aus einem unerwarteten Grund fehl (z. B. eine strukturell
  inkonsistente, importierte Fremdtabelle, siehe Grenzfall 9), muss eine **sichtbare**
  Rückmeldung erfolgen statt eines stillen No-Ops, und es darf **kein** Teil-Einfügen
  entstehen (entweder vollständiger Erfolg oder unveränderter Ausgangszustand plus
  sichtbarer Hinweis).

### 3.8 Verhalten der Tab-Navigation außerhalb von Tabellen (Abgrenzung)
- Die für Grenzfall 4 nötige Tab-Bindung (Tab = nächste Zelle via `goToNextCell('right')`,
  in der letzten Zelle: neue Zeile via `addRowAfter`) darf das **normale Tab-Verhalten
  außerhalb einer Tabelle nicht verändern**: Steht der Cursor nicht in einer Tabelle, gibt
  `goToNextCell` von sich aus `false` zurück; die Bindung muss dann „durchfallen", damit das
  bestehende Browser-/Editor-Verhalten unverändert bleibt und ein späteres, separates
  Feature (z. B. `liste-einruecken-tab`) weiterhin an dieselbe Taste andocken kann, ohne
  diese Funktion umzubauen. Die Bindung ist in den bestehenden projekteigenen Keymap-Block
  einzuhängen, ohne die dort dokumentierten Zwischenablage-Tasten zu beeinträchtigen (Befund
  0.9). `Shift-Tab` ist das Spiegelbild (vorherige Zelle),
  ohne Zeilenerzeugung.

---

## 4. Grenzfälle (müssen explizit geprüft werden)

| # | Grenzfall | Erwartetes Verhalten |
|---|---|---|
| 1 | Zeile einfügen in einer Tabelle mit nur einer einzigen Zeile | Funktioniert wie im Grundfall, Tabelle hat danach 2 Zeilen |
| 2 | Zeile einfügen oberhalb/unterhalb, während eine Zelle **oberhalb** der Einfügeposition Teil eines vertikalen Merges (rowspan > 1) ist, der über die Einfügeposition hinwegreicht | Merge wird um eine Zeile verlängert (siehe 3.3), keine kaputte/verwaiste Merge-Referenz; Rundreise erhält den verlängerten Merge (Roh-XML-Prüfung, Befund 0.6) |
| 3 | Zeile einfügen in einer Tabelle mit horizontal verbundenen Zellen (colspan > 1) in der Nachbarzeile | Neue Zeile hat **immer** so viele Einzelzellen wie die Tabelle effektive Spalten hat (Summe der effektiven Spalten stimmt exakt mit dem Rest überein) — kein Aufsplitten in mehr/weniger Zellen als die Tabelle Spalten hat |
| 4 | Zeile einfügen per Tab-Taste in der letzten Zelle der letzten Zeile (Anforderung aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6) | Neue Zeile wird unterhalb angehängt, Cursor springt in deren erste Zelle, alles in **einem** Undo-Schritt — außerhalb einer Tabelle bleibt Tab unverändert (3.8) |
| 5 | Zeile **oberhalb der bisherigen ersten Zeile** einfügen (die neue Zeile wird zur neuen Zeile 1), insbesondere wenn die bisherige Zeile 1 `colspan`/`rowspan` enthält | **Regressionsschutz:** Der Export (DOCX **und** ODT) leitet die Tabellen-Spaltenzahl aus der ersten Zeile ab; beide Writer summieren `colspan`-Werte und schreiben `covered-table-cell`/`vMerge`-Continuation-Zellen (Befund 0.6). Die effektive Spaltenzahl und die Merge-Struktur der gesamten Tabelle müssen nach dem Einfügen exakt gleich bleiben. Dedizierter Roh-XML-Regressionstest für **beide** Formate erforderlich, damit eine spätere Änderung diese bereits korrekte Logik nicht bricht |
| 6 | Zeile einfügen, während eine `CellSelection` **mehrere Zellen derselben Zeile** markiert (nicht alle Spalten) | Es wird genau **eine** neue Zeile eingefügt (oberhalb/unterhalb der Zeile, die die Selektion enthält), keine Zeile pro markierter Zelle |
| 7 | Zeile einfügen, während eine `CellSelection` **eine ganze Zeile** markiert | Wie Grundfall — Bezugszeile ist die markierte Zeile |
| 8 | Zeile einfügen, während eine `CellSelection` **mehrere Zeilen** umspannt (rechteckige Mehrzeilen-Selektion) | **Verbindlich festgelegt: Variante (a).** Es wird genau **eine** neue Zeile eingefügt — relativ zur **obersten** Zeile der Selektion („oberhalb"-Aktion) bzw. zur **untersten** Zeile der Selektion („unterhalb"-Aktion). Es werden **nicht** N Zeilen für N markierte Zeilen eingefügt. Begründung: „Zeile einfügen" ist eine Einfüge-Operation für genau eine Zeile; eine „N Zeilen einfügen"-Funktion wäre ein separates Feature. Dies entspricht dem Standardverhalten von `addRowBefore`/`addRowAfter` und ist exakt so zu testen (kein Test, der „irgendein plausibles Ergebnis" akzeptiert) |
| 9 | Zeile einfügen in einer aus einer Fremddatei importierten, strukturell ungewöhnlichen Tabelle (z. B. inkonsistente Zellenzahl je Zeile, wie sie laut `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 18 vorkommen kann) | Kein Crash; das aktive `tableEditing()`-Plugin normalisiert inkonsistente Tabellen (`fixTables`) i. d. R. bereits vor der Aktion. Für den Restfall gilt: falls die Struktur nicht sicher interpretierbar ist, sichtbare Fehlermeldung statt stillem Fehlschlag oder Datenkorruption (3.7) |
| 10 | Zeile einfügen in einer Tabelle, die eine verschachtelte Tabelle in einer ihrer Zellen enthält | Einfügen einer Zeile in die **äußere** Tabelle darf die verschachtelte Tabelle in der betroffenen Zelle nicht beschädigen; Einfügen einer Zeile **innerhalb** der inneren Tabelle wirkt sich nur auf diese aus |
| 11 | Zeile einfügen in einer Tabelle direkt am Dokumentanfang bzw. -ende (vgl. `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6, Testfall 10) | Neue Zeile erscheint korrekt, Editor bleibt danach normal bedienbar (Cursor kann per `gapCursor` aus der Tabelle heraus vor/nach ihr positioniert werden) |
| 12 | Wiederholtes, schnelles Auslösen der Aktion (mehrfacher Klick/Tastendruck in Folge) | Jede Einfügung erzeugt einen eigenen Undo-Schritt, keine doppelt eingefügte Zeile durch ein Event-Race, keine Race Condition mit der Selection-Sync-Logik aus `WordEditor.tsx` |
| 13 | Zeile einfügen, unmittelbar gefolgt von einer Formatierungs-Toolbar-Aktion (z. B. Fett) auf die neue Zeile | Funktioniert wie auf jeder anderen Selektion — Regressionstest aus Abschnitt 2 der Haupt-Spezifikation gilt hier explizit mit |
| 14 | Sehr große Tabelle (vgl. Haupt-Spezifikation Abschnitt 6, Testfall 9: „>5 Spalten, >10 Zeilen") — Zeile in der Mitte einfügen | UI bleibt reaktionsfähig, keine spürbare Verzögerung, alle Zeilen davor/danach bleiben unverändert an ihrer relativen Position |
| 15 | Zeile einfügen, danach Undo, danach Redo, danach erneut Zeile einfügen (gemischte Sequenz) | Jeder Schritt liefert exakt den erwarteten Zwischenzustand, keine kumulierten Abweichungen. Undo (`Mod-z`) und Redo (`Mod-y`/`Mod-Shift-z`) sind bereits gebunden (Befund 0.9) — hier ist nur nachzuweisen, dass die neue Zeile als **ein** Historienschritt sauber vor-/zurückgeht |
| 16 | Zeile einfügen auf Touch-Geräten (`playwright.config.ts`-Projekte **Mobile**/Pixel 7 und **Tablet**/iPad Mini) | Mindestens ein Weg (Tabellen-Werkzeugleiste, Abschnitt 1 # 1/# 2) ist per Touch erreichbar und löst das Einfügen zuverlässig aus; das Kernverhalten (Grundfall 3.1/3.2, Undo 3.6, Selektionskonsistenz 3.4) funktioniert auf beiden Projekten |

---

## 5. Rundreise-Anforderung

Zwei getrennte, beide verpflichtende Rundreise-Prüfungen. Die **Feature-Rundreise** (5.2)
muss über tatsächliche Bedienung im Editor erfolgen (Toolbar-Klick bzw. simulierte
Tastatureingabe), nicht nur über direkt konstruierte JSON-Fixtures, da genau das laut
Befund 0.5/0.7 der bisher fehlende Nachweis ist. Zusätzlich gilt für **jede** Rundreise:
Die Prüfung der exportierten Datei erfolgt gegen einen **unabhängigen** Parser bzw. über
eine **Roh-XML-Assertion** (nicht ausschließlich über unseren eigenen Reader, siehe Befund
0.6 und `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 19).

### 5.1 Baseline-Rundreise (Regressionsschutz — darf durch die neue Funktion nicht kaputtgehen)
Existiert unabhängig vom Feature bereits in `FEATURE-SPEC-DOCX-ODT.md` (Abschnitt
1.2/1.3/19) und muss vor **und** nach jeder Änderung an der Tabellen-Logik weiterhin
bestehen:

1. Reale DOCX-Datei mit mindestens einer Tabelle unverändert hochladen (kein Klick, keine
   Eingabe, insbesondere **kein** Zeilen-Einfügen) → sofort exportieren → erneut importieren
   → Tabelleninhalt (Zeilen, Zellen, Merges) entspricht inhaltlich dem Original.
2. Dasselbe mit einer realen ODT-Datei mit Tabelle (inkl. mindestens einer `rowspan`- und
   einer `colspan`-Zelle).
3. Die bestehenden Unit-Tests `describe('DOCX round trip: tables')` und
   `describe('ODT round trip: tables')` müssen weiterhin grün bleiben.
4. Beide Prüfungen müssen weiterhin bestehen, nachdem an der Zeilen-Einfügen-Funktion etwas
   geändert/repariert wurde (kein Nebenwirkungs-Regressionsfehler durch neue Toolbar-Handler
   oder Tabellen-Commands, die auch beim reinen Import/Anzeigen ungewollt greifen).

### 5.2 Feature-Rundreise (Zeile einfügen selbst)
Für **jede** der folgenden Kombinationen: Zeile über die Toolbar (bzw. simulierte
Bedienung, siehe Abschnitt 6) einfügen → Dokument als DOCX exportieren → reimportieren →
Struktur/Inhalt erhalten; **und** identisch als ODT. Die **Cross-Format-Richtung**
(DOCX → Zeile einfügen → als ODT, und umgekehrt) ist laut Befund 0.8 in der App **nicht**
über echte Bedienung möglich (kein Cross-Format-Export) und wird deshalb auf
**Adapter-/Unit-Ebene** geprüft (Reader liefert `body`-JSON → Zeile per Transaktion
einfügen → Writer des anderen Formats) — dies ist als dokumentierte Einschränkung im
Freigabe-Vermerk zu nennen (Abschnitt 7), nicht als „E2E getestet" zu behaupten.

1. Einfache Tabelle (keine Merges) → Zeile oberhalb der ersten Zeile einfügen → Export
   enthält 3 Zeilen in korrekter Reihenfolge, neue Zeile ist leer, übrige Zeilen inhaltlich
   unverändert.
2. Dieselbe Ausgangstabelle → Zeile unterhalb der letzten Zeile einfügen → analoges
   Ergebnis.
3. Zeile in der Mitte einer Tabelle mit mindestens 3 Zeilen einfügen → Reihenfolge aller
   Zeilen (vorher/neu/nachher) bleibt korrekt.
4. Tabelle mit horizontalem Merge (`colspan`) → Zeile oberhalb/unterhalb der verbundenen
   Zeile einfügen → Merge der bestehenden Zeile bleibt unverändert erhalten, neue Zeile hat
   korrekte effektive Spaltenzahl (siehe Grenzfälle 3/5); Roh-XML-Prüfung, dass jede Zeile
   im Export exakt `colCount` `<w:tc>` bzw. `<table:table-cell>` + `<table:covered-table-cell>`
   deklariert.
5. Tabelle mit vertikalem Merge (`rowspan`) → Zeile **innerhalb** des Merge-Bereichs
   einfügen → Merge wird um eine Zeile verlängert (siehe 3.3) → Rundreise erhält den
   verlängerten Merge als zusammenhängende Zelle. **Pflicht-Roh-XML-Prüfung des ODT-Exports**
   (Anzahl `<table:table-cell>` + `<table:covered-table-cell>` pro Zeile = `colCount`),
   weil ein reiner Reader-Rückweg-Test einen etwaigen gemeinsamen blinden Fleck von
   Reader+Writer verdecken würde (Befund 0.6). Dieser Fall gilt als abnahmerelevant.
6. Zellinhalt mit mehreren Absätzen und Formatierung (z. B. ein fett formatierter Absatz)
   in einer bestehenden Zeile → Zeile daneben einfügen → bestehende, formatierte Zeile
   bleibt bei der Rundreise exakt erhalten (Regressionsschutz auf Zellenebene, nicht nur auf
   Zeilenebene).
7. Zeile einfügen in einer Tabelle direkt am Dokumentanfang bzw. -ende (Grenzfall 11).
8. Doppelte Rundreise (Format-Wechsel hin und zurück, Adapter-Ebene) an einer Tabelle, in
   die zuvor mehrere Zeilen an unterschiedlichen Positionen eingefügt wurden → kein
   kumulativer Datenverlust (analog Haupt-Spezifikation Abschnitt 19, Testfall 3).

**Abnahmekriterium:** Formatierungsverluste bei Cross-Format-Konvertierung sind wie im Rest
der Spezifikation zu dokumentieren und akzeptabel; **Struktur- oder Textverlust ist es
nicht** — weder bei 5.1 noch bei 5.2. Eine falsch berechnete Spaltenzahl oder ein
verlorener/kaputter Merge beim Export (Grenzfälle 2/5) gilt als Strukturverlust und ist ein
Abnahme-Blocker.

---

## 6. Testplan-Hinweise (E2E, Playwright, und Unit-Ebene)

1. **E2E, bevorzugter Ansatz:** Tabelle über den bestehenden `⊞ Tabelle`-Button einfügen,
   Cursor per `page.locator('.ProseMirror td').nth(n).click()` in eine bestimmte Zelle
   setzen, dann den neuen „Zeile oberhalb/unterhalb einfügen"-Button klicken. Anschließend
   Zeilen-/Zellenzahl über `page.locator('.ProseMirror tr')`/`td` auszählen und prüfen,
   nicht nur visuell.
2. **Unit-Test-Ebene für den Command selbst:** Ein direkter Test des neuen Commands
   (Wrapper um `addRowBefore`/`addRowAfter` aus `prosemirror-tables`) gegen einen mit
   `EditorState.create` konstruierten Testzustand — unabhängig vom Browser, für schnelle
   Regressionsprüfung von Merge-Verlängerung (Grenzfall 2), Spaltenzahl-Konsistenz
   (Grenzfälle 3/5), Mehrzeilen-Selektion (Grenzfall 8) und der Tab-in-letzter-Zelle-Kette
   (Grenzfall 4).
3. Jeder E2E-Test für Zeile-einfügen muss wie in Abschnitt 2 gefordert direkt im Anschluss
   eine Tipp- oder Formatierungsaktion in der betroffenen Zelle ausführen und deren
   korrektes Ergebnis prüfen (Selection-Sync-Regressionsschutz), nicht nur den unmittelbaren
   Strukturzustand nach dem Einfügen selbst. Dieser Test gehört dauerhaft in
   `tests/e2e/selection-regression.spec.ts`.
4. Rundreise-Tests (Abschnitt 5) sind **sowohl** als Unit-Test gegen Reader/Writer **als
   auch** zusätzlich als E2E-Test über echte Bedienung zu führen — reine Unit-Tests mit
   direkt konstruierten `ProseMirrorJSON`-Fixtures (wie die bestehenden
   `describe('… round trip: tables')`-Blöcke) reichen laut Befund 0.5/0.7 ausdrücklich
   **nicht** aus, um die Funktion als verifiziert zu betrachten.
5. Für Grenzfall 8 (mehrzeilige `CellSelection`) ist die Verhaltensvariante in dieser Datei
   verbindlich als **Variante (a)** festgelegt und muss exakt so getestet werden (z. B. eine
   Mehrzeilen-Selektion über eine ausreichend große Tabelle → genau eine neue Zeile) — kein
   Test, der nur „irgendein plausibles Ergebnis" akzeptiert.
6. Für Grenzfall 5 (Export-Spaltenzahl/Merge-Erhalt, siehe Befund 0.6) wird ausdrücklich ein
   **dedizierter, benannter** Regressionstest verlangt, der eine Zeile *vor* die bisherige
   erste Zeile einer Tabelle mit `colspan`/`rowspan` einfügt und danach den Export **beider**
   Formate per **Roh-XML** auf korrekte Gesamt-Spaltenzahl und korrekte Merge-Zellenzahl
   prüft — dieser Test darf nicht im allgemeinen Rundreise-Testfall „untergehen".
7. **Mobile/Touch (Grenzfall 16):** Das Kernverhalten (Einfügen + Undo + Selektionskonsistenz)
   ist mindestens auf den Projekten **Mobile** (Pixel 7) und **Tablet** (iPad Mini) aus
   `playwright.config.ts` nachzuweisen — nicht nur auf Desktop Chrome.
8. **Unabhängiger Parser / Roh-XML:** Für die ODT-Rundreise mit Merges ist die von `writeOdt`
   erzeugte Zip-Datei direkt (z. B. per `JSZip.loadAsync`) zu öffnen und `content.xml` als
   Text zu prüfen; für DOCX analog `word/document.xml`. Ein reiner Reader-Rückweg genügt für
   diese Fälle nicht (Befund 0.6).
9. **Cross-Format (Befund 0.8):** ausschließlich als Adapter-/Unit-Test umsetzbar
   (`readDocx(...)` → Zeile in `body`-JSON per Transaktion einfügen → `writeOdt(...)` →
   `readOdt(...)`, und umgekehrt). Kein E2E-Cross-Format-Test möglich, da die App keinen
   Cross-Format-Export bietet — als Einschränkung dokumentieren, nicht als Lücke „vergessen".

---

## 7. Freigabekriterium für „vorhanden"

Der Backlog-Status von `zeile-einfuegen` darf erst dann von „fehlt" auf **vorhanden**
geändert werden, wenn:

- mindestens ein Bedienweg aus Abschnitt 1 (# 1 und # 2, Tabellen-Werkzeugleisten-Buttons)
  tatsächlich implementiert und über eine echte Browser-Interaktion (nicht nur
  Command-Aufruf) auslösbar ist, mit korrektem Aktiv-/Deaktiviert-Zustand (# 5) und
  barrierefreier Beschriftung (# 8);
- alle Testfälle aus Abschnitt 6 automatisiert vorliegen und grün sind;
- die Grenzfälle aus Abschnitt 4 einzeln befundet sind (funktioniert / funktioniert nicht
  und wird dokumentiert / wurde repariert) — insbesondere Grenzfall 5 (Export-Spaltenzahl
  und Merge-Erhalt, per Roh-XML für **beide** Formate) und Grenzfall 8 (mehrzeilige
  Selektion, verbindlich Variante (a), nicht offen gelassen);
- Grenzfall 16 (Touch/Mobile) auf den Projekten **Mobile** und **Tablet** nachgewiesen ist;
- Abschnitt 5.1 (Baseline-Rundreise) nicht durch die Implementierung gebrochen wurde
  (insbesondere die bereits korrekte ODT-Merge-Export-Logik, Befund 0.6, bleibt grün);
- Abschnitt 5.2 (Feature-Rundreise) für DOCX und ODT über echte Bedienung besteht, inklusive
  der Roh-XML-Prüfung der Merge-/Spaltenzahl (Punkt 4/5), und die Cross-Format-Richtung auf
  Adapter-/Unit-Ebene besteht — Letzteres ist als **dokumentierte strukturelle
  Einschränkung** (Befund 0.8) im Freigabe-Vermerk ausdrücklich zu nennen, nicht
  stillschweigend als E2E-getestet auszugeben;
- der Regressionstest aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2 (Selection-Sync-Bug)
  explizit mit einer Zeilen-Einfügen-Sequenz nachgestellt, grün und dauerhaft Teil von
  `tests/e2e/selection-regression.spec.ts` ist.

Andernfalls ist der Status auf **teilweise** zu setzen (z. B. falls die Funktion nur über
einen Command ohne UI existiert, nur für DOCX und nicht für ODT verifiziert ist, oder nur
auf Desktop und nicht auf Touch bedienbar ist) und die konkret fehlenden Teilpunkte sind
hier nachzutragen, analog zur Vorgehensweise in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 17/21
sowie in `specs/einfuegen-req.md` Abschnitt 7. Ein „vorhanden" darf nie auf einer
ungeprüften Annahme beruhen — jeder Punkt dieser Datei ist einzeln nachzuweisen.
