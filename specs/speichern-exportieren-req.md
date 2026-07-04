# Anforderungen: Exportieren/Speichern (`speichern-exportieren`)

Status: Vom Backlog als **„vorhanden"** geführt — gilt gemäß Aufgabenstellung als
**nicht vertrauenswürdig** und muss vollständig verifiziert werden, bevor der Status
bestätigt werden darf. Diese Datei beschreibt den Soll-Zustand im Detail, damit die
Verifikation (manuelle Bedienung + automatisierte Tests) daran geprüft werden kann.

Bezug: `E:\docs\specs\FEATURE-BACKLOG.md`, Zeile `speichern-exportieren` (Priorität 1,
Bereich „1. Datei (Backstage / Datei-Lifecycle)"), sowie Abschnitt 1.3 in
`E:\docs\FEATURE-SPEC-DOCX-ODT.md` ("Export / Speichern unter"), an dessen Stil und
Detailtiefe sich dieses Dokument orientiert.

Betroffene Quelldateien (Ist-Stand zum Zeitpunkt dieser Anforderungsdefinition):
- `src/app/DocumentWorkspace.tsx` — „Exportieren"-Button, Export-Auslösung, Fehleranzeige.
- `src/lib/download.ts` — `downloadBlob()`, erzeugt den eigentlichen Browser-Download.
- `src/formats/docx/writer.ts` (`writeDocx`) / `src/formats/odt/writer.ts` (`writeOdt`) —
  Serialisierung des internen Dokumentmodells zurück ins Dateiformat.
- `src/formats/docx/docx.ts` / `src/formats/odt/odt.ts` — `exportFile()`-Bindung je Modul.
- `src/formats/types.ts` — `FormatModule.exportFile(content, fileName): Promise<Blob>`.
- `src/lib/useBeforeUnloadWarning.ts` — Warnung bei Tab-Schließen mit ungesicherten Änderungen.

**Explizit nicht Teil dieser Anforderung** (separate Backlog-Einträge, „fehlt"):
- `speichern-unter-format` — Zielformat beim Export wählen (Cross-Format-Export DOCX↔ODT
  über einen expliziten UI-Dialog). Diese Datei fordert **nur** Export im Ursprungsformat.
  Cross-Format-Rundreise (Import als ODT → Export als DOCX) ist aktuell **nicht** über
  die UI erreichbar und wird hier nicht gefordert, aber als Abgrenzung dokumentiert.
- `als-pdf-exportieren`, `drucken`, `dokument-schuetzen-passwort`, `als-endgueltig-kennzeichnen`,
  `versionsverlauf` — alle „fehlt", nicht Gegenstand dieser Verifikation.

---

## 1. Betroffene Menüpunkte/Bedienelemente

| # | Element | Fundort | Ist-Beschreibung | Soll |
|---|---|---|---|---|
| 1 | Button „Exportieren" | `DocumentWorkspace.tsx`, Kopfleiste rechts | Löst `handleExport()` aus, Text wechselt zu „Exportiere…" während des Vorgangs | siehe Abschnitt 2 |
| 2 | Statusanzeige „● ungespeichert" | `DocumentWorkspace.tsx`, Kopfleiste links, neben Dateiname | Wird angezeigt, wenn `document.dirty === true` | siehe Abschnitt 2.4 |
| 3 | Fehleranzeige neben dem Export-Button | `DocumentWorkspace.tsx`, `exportError`-State | Rotes Textfeld mit Fehlermeldung, erscheint bei fehlgeschlagenem Export | siehe Abschnitt 4 |
| 4 | Browser-eigener Download-Mechanismus | `download.ts`, `downloadBlob()` | Erzeugt `<a download>`-Element, klickt es programmatisch, räumt Object-URL wieder auf | siehe Abschnitt 2.2 |
| 5 | Beforeunload-Warnung | `useBeforeUnloadWarning.ts`, global in `App.tsx` aktiv, solange ein Dokument offen ist | Zeigt native Browser-Warnung bei Tab-Schließen/Reload, wenn `dirty === true` | siehe Abschnitt 2.5 |
| 6 | Button „← Formate" (Schließen) mit Rückfrage | `DocumentWorkspace.tsx`, `handleClose()` | `window.confirm(...)`, wenn `dirty === true` | siehe Abschnitt 2.6 (Abgrenzung zu Export, aber im selben Lifecycle) |

Es gibt **keinen** separaten Menüpunkt „Speichern unter", kein Tastaturkürzel (z. B.
Strg+S) und keinen Dateinamen-Editierdialog vor dem Export — der Dateiname wird beim
Export unverändert aus `document.fileName` übernommen (siehe Abschnitt 3.2). Sollte ein
Tastaturkürzel künftig gefordert werden, ist das ein separater Backlog-Eintrag, nicht
Teil dieser Anforderung.

---

## 2. Gewünschtes Verhalten im Detail

### 2.1 Auslösen des Exports

- Klick auf „Exportieren" muss in **jedem** Editor-Zustand funktionieren: leeres neues
  Dokument, unverändert importiertes Dokument, bearbeitetes Dokument, Dokument mit
  Cursor/Selektion an beliebiger Stelle (auch z. B. mitten in einer Tabellenzelle oder
  direkt nach Bild-Einfügen).
- Während des Exportvorgangs: Button ist disabled (`exporting === true`), zeigt
  „Exportiere…" statt „Exportieren". Der Button darf sich **nicht** dauerhaft in diesem
  Zustand festsetzen, weder bei Erfolg noch bei Fehler (siehe `finally`-Block in
  `handleExport()` — muss geprüft werden, dass dieser tatsächlich in allen Codepfaden
  erreicht wird, auch wenn `module.exportFile()` synchron wirft statt eine rejektierte
  Promise zurückzugeben).
- Ein zweiter Klick auf „Exportieren", während bereits ein Export läuft, darf keinen
  zweiten parallelen Download/Exportvorgang auslösen (Button ist disabled — muss aber
  auch bei sehr schnellen Doppelklicks/synthetischen Events standhalten, nicht nur bei
  normaler Nutzung).

### 2.2 Der eigentliche Download

- Es wird **kein** Server kontaktiert, keine Datei auf Server-Storage abgelegt — die
  gesamte Erzeugung läuft im Browser (`Blob` → Object-URL → `<a download>`-Klick). Dies
  ist ein Kernversprechen der App (siehe `FormatPicker.tsx`: „komplett im Browser, ohne
  Server") und muss durch Netzwerk-Beobachtung verifiziert werden (kein Request an einen
  Server mit dem Dateiinhalt während des Exports).
- Der Download muss vom Browser als **echter Dateidownload** ausgelöst werden (nicht nur
  im Tab geöffnet) — Test über Playwrights `page.waitForEvent('download')`.
- Nach dem Download: Die erzeugte Object-URL wird mit `URL.revokeObjectURL()`
  freigegeben (Speicherleck-Vermeidung bei wiederholtem Export im selben Tab — Testfall:
  10× hintereinander exportieren ohne Reload, kein wachsender Speicherverbrauch, keine
  Exception).
- Das an `document.body` angehängte `<a>`-Element wird nach dem Klick wieder entfernt
  (`anchor.remove()`), damit sich das DOM nicht durch wiederholten Export unbemerkt füllt.

### 2.3 Dateiinhalt und -format

- Export erzeugt eine Datei **im Ursprungsformat** des aktuell offenen Dokuments:
  - Wurde eine `.docx`-Datei importiert oder ein neues DOCX-Dokument erstellt → Export
    als valides OOXML-Package (`.docx`, MIME-Type
    `application/vnd.openxmlformats-officedocument.wordprocessingml.document`).
  - Wurde eine `.odt`-Datei importiert oder ein neues ODT-Dokument erstellt → Export als
    valides ODF-Package (`.odt`, MIME-Type
    `application/vnd.oasis.opendocument.text`).
- Die exportierte Datei muss **valide** sein — nicht nur durch den eigenen Reader
  wieder einlesbar, sondern auch:
  - als gültiges ZIP-Archiv mit korrekter interner Struktur öffenbar
    (`word/document.xml`, `word/styles.xml`, `_rels/`, `[Content_Types].xml` bei DOCX
    bzw. `content.xml`, `styles.xml`, `META-INF/manifest.xml`, `mimetype` bei ODT),
  - idealerweise zusätzlich mit einem unabhängigen Parser/einer unabhängigen Bibliothek
    geprüft (z. B. `python-docx` bzw. XML-Schema-Validierung), nicht nur mit
    projekteigenem Code (Abgrenzung analog Abschnitt 19 in `FEATURE-SPEC-DOCX-ODT.md`).
- Der exportierte Inhalt entspricht exakt dem aktuellen Editor-Zustand zum Zeitpunkt des
  Klicks — nicht einem zwischengespeicherten/veralteten Stand. Testfall: Text tippen,
  **sofort** (ohne Wartezeit, ohne Blur-Event) auf Exportieren klicken → getippter Text
  ist enthalten.

### 2.4 Zustand nach erfolgreichem Export

- `document.dirty` wird auf `false` zurückgesetzt (`onChange({ ...document, dirty: false })`
  in `handleExport()`), die Anzeige „● ungespeichert" verschwindet unmittelbar nach
  erfolgreichem Export.
- Der Editor bleibt **vollständig weiter bedienbar**: kein Reset des Inhalts, kein
  Verlust von Cursor-Position/Selektion, kein erzwungener Reload. Testfall: Nach Export
  direkt weitertippen, ohne vorherigen Klick in den Editor — Zeichen erscheinen an der
  Stelle, an der der Cursor vor dem Export stand.
- Direkt nach Export erneut exportieren (ohne zwischenzeitliche Änderung) muss ebenfalls
  funktionieren und liefert eine inhaltlich identische Datei (deterministisches
  Re-Export, kein Fehler durch „bereits exportiert"-Zustand).
- Wird nach dem Export weiter editiert, muss `dirty` wieder auf `true` wechseln (bereits
  über den `onChange`-Pfad im Editor abgedeckt) und die „● ungespeichert"-Anzeige wieder
  erscheinen — Testfall: Export → ein Zeichen tippen → Anzeige erscheint wieder.

### 2.5 Zusammenspiel mit der Beforeunload-Warnung

- Solange `dirty === true`, warnt der Browser beim Schließen/Neuladen des Tabs
  (`useBeforeUnloadWarning`). Nach erfolgreichem Export (→ `dirty: false`) darf diese
  Warnung **nicht** mehr ausgelöst werden, bis erneut editiert wird.
- Testfall: Dokument ändern → Tab-Schließen-Warnung erscheint (bzw. `beforeunload`-Event
  hat `defaultPrevented === true`) → Export durchführen → erneut Tab schließen versuchen
  → keine Warnung mehr.

### 2.6 Zusammenspiel mit „Dokument schließen"

- Der „← Formate"-Button fragt bei `dirty === true` per `window.confirm(...)` nach, ob
  ungespeicherte Änderungen verworfen werden sollen. Dies ist **kein** Aufruf von
  Export/Speichern, sondern ein Verwerfen — muss im Test klar von einem tatsächlichen
  Export unterschieden werden (keine Verwechslung „Schließen mit Rückfrage" ≙ „Speichern").
- Nach Export (`dirty: false`) und anschließendem Klick auf „← Formate" darf **keine**
  Rückfrage mehr erscheinen, da keine ungespeicherten Änderungen mehr vorliegen.

---

## 3. Grenzfälle

### 3.1 Leeres Dokument

- Neu erstelltes, komplett unverändertes Dokument exportieren → Datei ist valide (kein
  leeres/korruptes ZIP), lässt sich reimportieren, zeigt ein leeres, aber gültiges
  Dokument (Standard-Absatzformat, A4-Seite).

### 3.2 Dateiname

- Bei importierten Dokumenten: Der beim Export vorbelegte Dateiname entspricht exakt
  `document.fileName` (unverändert vom Original-Upload übernommen), **inklusive**
  Endung — es gibt keine Logik, die die Endung neu anhängt oder korrigiert. Grenzfall:
  Falls eine hochgeladene Datei eine „falsche"/fehlende Endung hätte (z. B.
  `Vertrag` ohne `.docx`), würde diese unverändert für den Download übernommen — zu
  prüfen, ob das ein akzeptables Verhalten ist oder ob eine Absicherung nötig wäre
  (aktuell keine Korrektur vorhanden, siehe `downloadBlob(blob, document.fileName)` in
  `DocumentWorkspace.tsx`).
- Bei neu erstellten Dokumenten: Dateiname ist `${module.defaultName}${ext}`, z. B.
  „Unbenanntes Dokument.docx" bzw. „Unbenanntes Dokument.odt" (siehe
  `FormatPicker.handleCreateNew()`). Export ohne vorherige Umbenennung muss trotzdem
  funktionieren.
- Dateiname mit Umlauten/Sonderzeichen/Leerzeichen (z. B. „Bewerbung Müller (Entwurf).docx")
  → bleibt beim Export exakt erhalten, Download-Dateiname im Browser entspricht 1:1 dem
  Originalnamen (siehe auch Abschnitt 1.2 Testfall 4 in `FEATURE-SPEC-DOCX-ODT.md`).
- Es gibt **keine** Möglichkeit, den Dateinamen vor dem Export in der UI zu ändern (kein
  Eingabefeld, kein „Speichern unter"-Dialog) — falls das gefordert wird, ist das ein
  separater Backlog-Eintrag; aktueller Soll-Zustand dieser Datei ist: Export unter dem
  bestehenden Namen ist ausreichend für Status „vorhanden".

### 3.3 Sehr große / komplexe Dokumente

- Dokument mit vielen Bildern (mehrere MB Gesamtgröße), großen Tabellen oder sehr langem
  Text → Export darf die UI nicht dauerhaft einfrieren (zumindest sichtbares Feedback
  „Exportiere…"), darf nicht zu einem Browser-Tab-Crash durch Speicherüberlauf führen,
  muss innerhalb einer vertretbaren Zeit abschließen (Richtwert: < 5 Sekunden bei
  realistischer Testdatei, analog Ladezeit-Vorgabe beim Import in Abschnitt 1.2 der
  Feature-Spec).

### 3.4 Fehlerfälle beim Export

- Serialisierungsfehler (z. B. durch einen internen, nicht abgefangenen Zustand im
  Dokumentmodell) → `exportError` wird gesetzt und **sichtbar** neben dem Button
  angezeigt (rotes Textfeld) — kein stiller Fehlschlag, keine unbehandelte Exception in
  der Konsole, die die App in einen kaputten Zustand versetzt.
- Nach einem fehlgeschlagenen Export bleibt der Editor unverändert benutzbar, `dirty`
  bleibt `true` (kein fälschliches Zurücksetzen bei Fehler — zu verifizieren, dass
  `onChange({ ...document, dirty: false })` **nur** im Erfolgspfad, nicht im
  `catch`-Zweig aufgerufen wird).
- Erneuter Export-Versuch nach einem Fehler muss ohne Reload möglich sein (Button ist
  nach `finally` wieder aktiv).
- Sollte der Download vom Browser selbst blockiert werden (z. B. Pop-up-/Download-Blocker
  in restriktiven Browser-Einstellungen) → dieser Fall liegt außerhalb der
  Kontrollmöglichkeit der App über `<a download>`; mindestens darf die App selbst dabei
  nicht abstürzen oder einen falschen Erfolgszustand vortäuschen (`dirty: false`, obwohl
  kein Download beim Nutzer ankam) — als bekannte Grenze zu dokumentieren, nicht
  zwingend technisch lösbar.

### 3.5 Wiederholter/paralleler Export

- Export → sofort erneut Export (ohne Änderung dazwischen) → zweite Datei ist
  inhaltlich identisch zur ersten (Determinismus, abgesehen von ggf. zeitstempelbasierten
  Metadaten wie „zuletzt geändert", falls solche geschrieben werden — zu prüfen, ob
  `docProps/core.xml`/ODT-Metadaten ein Änderungsdatum enthalten und ob das als
  „inhaltlich identisch" akzeptiert wird).
- Zwei Exportvorgänge, die durch sehr schnelles Doppelklicken ausgelöst werden könnten
  (siehe 2.1) → es darf nicht zu zwei sich überschneidenden `URL.createObjectURL`/
  `revokeObjectURL`-Zyklen kommen, die zu einem kaputten/leeren Download führen.

---

## 4. Nicht-stiller-Fehlschlag (Querverweis Abschnitt 20 der Feature-Spec)

Jede Export-Aktion, die aus irgendeinem Grund nicht ausgeführt werden kann, muss eine
sichtbare Rückmeldung erzeugen. Für dieses Feature konkret zu verifizieren:
1. Kein Klick auf „Exportieren", der ohne jede sichtbare Reaktion bleibt (weder Erfolg
   noch Fehleranzeige) — insbesondere bei den Grenzfällen aus Abschnitt 3.4.
2. Die Fehlermeldung ist verständlich (kein reiner Stack-Trace/„undefined"), analog zur
   Anforderung an Importfehler in Abschnitt 1.2 der Feature-Spec.

---

## 5. Rundreise-Anforderung (Pflicht — Kern dieser Verifikation)

Diese Anforderung ist der zentrale Prüfmaßstab für den Status „vorhanden" laut Backlog
und muss für **beide** Formate unabhängig voneinander nachgewiesen werden:

> Datei A (DOCX **oder** ODT) hochladen → **ohne jede Änderung** direkt exportieren →
> Ergebnisdatei erneut in die App importieren → Inhalt entspricht inhaltlich exakt
> Datei A.

### 5.1 Ablauf je Format

**DOCX:**
1. Reale, gültige `.docx`-Testdatei per „Datei hochladen" importieren.
2. Ohne jede Bearbeitung sofort auf „Exportieren" klicken.
3. Heruntergeladene Datei erneut über „Datei hochladen" in die App importieren.
4. Text, Formatierung (mind. fett/kursiv/unterstrichen/durchgestrichen, Ausrichtung,
   Überschriften-Level), Listen, Tabellen und Bilder sind inhaltlich identisch zum
   Zustand nach dem ursprünglichen Import von Datei A (Vergleich „nach Import A" vs.
   „nach Import Reimport", nicht zwingend byte-identisch zur Originaldatei, da eine
   Editor-Repräsentation dazwischenliegt — aber ohne Datenverlust).

**ODT:** identischer Ablauf mit einer realen, gültigen `.odt`-Testdatei.

### 5.2 Mindestabdeckung der Testdatei(en)

Damit die Rundreise aussagekräftig ist, muss mindestens eine Testdatei je Format
folgende Elemente enthalten (Kombination aus mehreren der in
`FEATURE-SPEC-DOCX-ODT.md` behandelten Bereiche):
- Mehrere Absätze mit gemischter Zeichenformatierung (fett, kursiv, unterstrichen,
  durchgestrichen, Schriftfarbe, Hervorhebung).
- Mindestens eine Überschrift (Formatvorlage „Überschrift 1" o. ä.).
- Eine Aufzählungsliste und eine nummerierte Liste.
- Eine Tabelle mit mehreren Zeilen/Spalten und mind. einer formatierten Zelle.
- Mindestens ein eingebettetes Bild.
- Sonderzeichen/Umlaute im Fließtext **und** im Dateinamen selbst (siehe 3.2).

### 5.3 Explizit als Nicht-Bestehen zu werten

- Jeglicher **stiller** Verlust von sichtbarem Text (auch Teiltext) zwischen Import A
  und Reimport nach Export.
- Verlust der Tabellen- oder Listenstruktur (Verflachung zu reinem Text ohne
  Kennzeichnung als Liste/Tabelle).
- Fehlendes oder verzerrtes Bild nach der Rundreise.
- Eine Ergebnisdatei, die zwar vom App-eigenen Reader wieder eingelesen werden kann,
  aber kein gültiges Office-Dokument ist (siehe unabhängige Validierung, Abschnitt 2.3).
- Absturz/unbehandelte Exception irgendwo im Ablauf (Import → Export → Reimport).

### 5.4 Bereits vorhandene Automatisierung (Ausgangsbasis für Verifikation)

`tests/e2e/docx.spec.ts` enthält bereits E2E-Tests, die einen Teil dieser Rundreise
abdecken (`round trip: uploading then exporting unchanged preserves heading, text, and
bold formatting`, `editing an uploaded document and exporting reflects the edit`). Diese
Tests sind der Ausgangspunkt, decken aber laut aktuellem Kenntnisstand **nicht** die
volle Mindestabdeckung aus 5.2 ab (insbesondere fehlen dort ganze Tabellen/Bilder/Listen
in Kombination sowie ein ODT-Äquivalent mit gleichem Umfang in `tests/e2e/odt.spec.ts` —
muss geprüft und ggf. ergänzt werden, nicht als bereits erfüllt annehmen).

---

## 6. Testfälle (Zusammenfassung, konkret abhakbar)

1. Neues, leeres Dokument (DOCX) exportieren → valide Datei, Reimport zeigt leeres
   Dokument.
2. Neues, leeres Dokument (ODT) exportieren → dasselbe.
3. Bearbeitetes DOCX-Dokument exportieren → echter Datei-Download (`page.waitForEvent
   ('download')`), Datei ist valides ZIP mit erwarteter OOXML-Struktur.
4. Bearbeitetes ODT-Dokument exportieren → echter Datei-Download, valides ZIP mit
   erwarteter ODF-Struktur inkl. korrektem `mimetype`-Eintrag.
5. Export, danach ohne Klick/Reload weitertippen → funktioniert, Cursor-Position bleibt
   erhalten.
6. „● ungespeichert" verschwindet unmittelbar nach Export und erscheint nach der
   nächsten Änderung wieder.
7. Beforeunload-Warnung ist nach Export (bei `dirty:false`) inaktiv, nach erneuter
   Änderung wieder aktiv.
8. DOCX-Rundreise mit Mindestabdeckung (5.2): Import → unverändert exportieren →
   reimportieren → Inhalt vollständig erhalten.
9. ODT-Rundreise ebenso.
10. Export eines Dokuments mit Sonderzeichen im Dateinamen → Downloadname exakt erhalten.
11. Zwei aufeinanderfolgende Exporte ohne Änderung dazwischen → beide Dateien inhaltlich
    identisch, kein Fehler, kein doppelter/fehlender Download.
12. Erzwungener Serialisierungsfehler (z. B. via Test-Mock von `module.exportFile`) →
    sichtbare Fehlermeldung, Button kehrt in bedienbaren Zustand zurück, `dirty` bleibt
    `true`.
13. Export bei sehr großem Dokument (viele Bilder/große Tabelle) → schließt in
    vertretbarer Zeit ab, UI bleibt reaktionsfähig, kein Crash.
14. Zehnfacher Export im selben Tab ohne Reload → kein Speicherleck/keine Exception
    durch nicht freigegebene Object-URLs.
15. „← Formate" nach erfolgreichem Export (dirty:false) → keine Rückfrage mehr, im
    Gegensatz zu vorher (dirty:true) mit Rückfrage.

---

## 7. Abnahmekriterium für Status „vorhanden" (bestätigt statt nur behauptet)

Der Backlog-Status „vorhanden" für `speichern-exportieren` darf erst dann als
**verifiziert** (statt weiterhin „nicht vertrauenswürdig") gelten, wenn:
- alle Testfälle aus Abschnitt 6 tatsächlich über echte Browser-Bedienung (Playwright,
  nicht nur konstruierte Unit-Test-Daten) grün sind,
- die Rundreise-Anforderung aus Abschnitt 5 für **beide** Formate mit der in 5.2
  geforderten Mindestabdeckung nachweislich besteht,
- mindestens eine Validierung der Exportdatei außerhalb des projekteigenen
  Reader/Writer-Codes stattgefunden hat (Abschnitt 2.3), um „Schreib- und Lesefehler
  gleichen sich gegenseitig aus"-Risiken auszuschließen (vgl. Abschnitt 19 der
  Feature-Spec).
