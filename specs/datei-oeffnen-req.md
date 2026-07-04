# Anforderungsspezifikation: „Datei öffnen/importieren"

Status: Entwurf zur Freigabe — Verifikationsauftrag. Laut Feature-Backlog
(`specs/FEATURE-BACKLOG.md`, Slug `datei-oeffnen`) aktuell als **vorhanden**
markiert, Priorität **1 (essenziell)**. Dieser Status gilt als **nicht
vertrauenswürdig**: Er beschreibt, dass ein UI-Weg existiert, nicht, dass er
in allen Details, Grenzfällen und Formaten tatsächlich funktioniert. Ziel
dieses Dokuments ist die vollständige, einzeln abhakbare Spezifikation, gegen
die ein QA-Agent die reale Implementierung nachweislich (per echter
Browser-Bedienung, nicht nur Unit-Tests) verifizieren muss.

Geltungsbereich: Ausschließlich der Importweg für bestehende DOCX- und
ODT-Dateien über den Dateiauswahl-Dialog auf dem Startbildschirm
(`src/app/FormatPicker.tsx`, `module.importFile` → `src/formats/docx/reader.ts`
bzw. `src/formats/odt/reader.ts`). Export/Rundreise ist nur insoweit
Gegenstand, wie er zum Nachweis der Import-Korrektheit nötig ist (siehe
Abschnitt 6, Rundreise-Anforderung). Neu-Erstellen (`Neu erstellen`-Button)
und Export-Funktionen selbst sind nicht Gegenstand dieser Datei.

Stilreferenz: `E:\docs\FEATURE-SPEC-DOCX-ODT.md`, Abschnitt 1.2 sowie
Abschnitt 18. Diese Datei vertieft und ersetzt für den Teilbereich „Datei
öffnen/importieren" die dortigen Kurzabschnitte.

---

## 1. Betroffene Bedienelemente

Es gibt für diese Funktion aktuell genau zwei sichtbare Bedienelemente pro
Format-Karte auf dem Startbildschirm (Formatauswahl, vor dem Öffnen eines
Dokuments):

| # | Element | Ort im Code | Sichtbares Verhalten (Soll) |
|---|---|---|---|
| 1 | Button „Datei hochladen" | `FormatPicker.tsx`, pro Format-Karte (Word/ODT) | Klick öffnet den **nativen** Dateiauswahl-Dialog des Betriebssystems/Browsers für genau dieses Format. Kein sichtbarer natives `<input type="file">`-Element, der Button ist der einzige Trigger. |
| 2 | Verstecktes `<input type="file">` je Format-Karte | `FormatPicker.tsx` | `accept`-Attribut muss sowohl die Dateiendung (`.docx` bzw. `.odt`) als auch den MIME-Type enthalten, damit sowohl endungsbasierte als auch inhaltsbasierte Dateimanager-Filter greifen. Nach jeder Auswahl wird `value` zurückgesetzt, damit dieselbe Datei ein zweites Mal ausgewählt werden kann (erneutes `onChange`-Ereignis bei identischem Dateinamen). |
| 3 | Fehler-Banner (`role="alert"`) | `FormatPicker.tsx`, oberhalb der Format-Karten | Erscheint ausschließlich nach einem gescheiterten Import, enthält Dateiname, Zielformat-Label und Fehlermeldung im Format: „<Dateiname>" konnte nicht als <Format-Label> gelesen werden: <Fehlermeldung>. Verschwindet automatisch bei jedem neuen Importversuch (`setError(null)` zu Beginn von `handleFile`). |
| 4 | Format-Karten selbst (Word-Dokument (.docx) / OpenDocument Text (.odt)) | `FormatPicker.tsx` | Jede Karte hat ihren **eigenen** unabhängigen Datei-Dialog/Button — es gibt keinen format-übergreifenden „einen Klick, beide Formate"-Import. Eine `.odt`-Datei über die DOCX-Karte (oder umgekehrt) auswählen zu können, ist ein Grenzfall (siehe Abschnitt 5.4). |

Es gibt **keinen** zusätzlichen Menüpunkt „Datei" → „Öffnen" (kein
Ribbon/Backstage-Menü), keine Tastenkombination (z. B. Strg+O) und keinen
Drag&Drop-Bereich für den Import. Sollte eine dieser drei zusätzlichen
Bedienwege erwartet werden, ist das ein separates, hier nicht enthaltenes
Feature (vgl. `FEATURE-BACKLOG.md`, dort aktuell nicht als eigener Slug
geführt) und keine Voraussetzung für „vollständig verifiziert" in diesem
Dokument.

---

## 2. Gewünschtes Verhalten im Detail

### 2.1 Erfolgreicher Import — Ablauf

1. Nutzer:in klickt „Datei hochladen" auf der Word- oder ODT-Karte.
2. Betriebssystem-Dialog öffnet sich, vorgefiltert auf die passende(n)
   Endung(en)/MIME-Type(s) dieser Karte.
3. Nutzer:in wählt eine Datei aus und bestätigt.
4. Datei wird **vollständig im Browser** verarbeitet (`FileReader`/`ArrayBuffer`
   über `JSZip`) — kein Netzwerk-Request, kein Server-Upload. Dies ist ein
   Kernversprechen der App („komplett im Browser, ohne Server", siehe
   `FormatPicker.tsx` Einleitungstext) und muss auch beim Import gelten
   (Netzwerk-Panel im Browser darf während des gesamten Importvorgangs keine
   Requests zeigen, die Dateiinhalte enthalten).
5. Bei Erfolg: Editor öffnet sich unmittelbar (`onOpen`), Dokumentname in der
   Titelleiste entspricht dem Original-Dateinamen inkl. Endung, „ungespeichert"-
   Badge ist **nicht** gesetzt (`dirty: false`), Inhalt ist sichtbar und
   editierbar, Cursor kann sofort gesetzt werden.
6. Ladezeit: Bei einer realistischen, mehrseitigen Testdatei mit mehreren
   Bildern liegt die Zeit von Dateiauswahl-Bestätigung bis sichtbarem, fertig
   gerendertem Inhalt **unter 3 Sekunden** auf einem üblichen Entwickler-
   Notebook/CI-Runner. Die UI (insbesondere die Format-Karten-Buttons) darf
   während des Ladens nicht dauerhaft einfrieren; ein visuelles
   Lade-/Busy-Signal ist erwünscht, aber mindestens muss der Browser-Tab
   reaktionsfähig bleiben (kein „Seite reagiert nicht"-Dialog).

### 2.2 Fehlgeschlagener Import — Ablauf

1. Nutzer:in wählt eine Datei, die nicht als gültiges DOCX/ODT gelesen werden
   kann (siehe Abschnitt 3 für konkrete Fälle).
2. Es öffnet sich **kein** Editor, der Startbildschirm bleibt sichtbar (keine
   leere weiße Seite, kein halb geladener Editor mit leerem Dokument, das den
   Fehlschlag als „leeres neues Dokument" tarnt).
3. Fehler-Banner erscheint mit verständlicher, auf Deutsch formulierter
   Meldung, die mindestens den Original-Dateinamen und das Zielformat nennt.
   Rohe technische Stacktraces oder reine `Error: undefined`-Meldungen ohne
   Kontext gelten als Verstoß gegen „verständliche Fehlermeldung".
4. **Keine** unbehandelte JS-Exception in der Browser-Konsole (`console.error`
   durch React-Error-Boundary oder unbehandelte Promise-Rejection zählt als
   Verstoß). Der Fehler muss im `try/catch` von `handleFile` abgefangen
   werden — jeder Importfehler, der diesen Pfad umgeht (z. B. durch einen
   synchronen Wurf außerhalb des `await`, oder durch einen Fehler, der erst
   nach dem `onOpen`-Aufruf im Editor selbst auftritt), gilt als Defekt.
5. Nutzer:in kann **ohne Reload der Seite** sofort einen erneuten
   Importversuch (dieselbe oder eine andere Datei, gleiches oder anderes
   Format) unternehmen. Der vorherige Fehler wird dabei automatisch
   ausgeblendet.
6. Ein fehlgeschlagener Import auf der DOCX-Karte darf den Zustand der
   ODT-Karte (und umgekehrt) nicht beeinflussen — kein globaler Fehlerzustand,
   der beide Karten sperrt.

### 2.3 Zustand nach dem Import

- Das im Editor angezeigte Dokument muss dem tatsächlichen Inhalt der
  hochgeladenen Datei entsprechen — nicht nur „irgendein Text sichtbar",
  sondern strukturell korrekt zugeordnet (Absätze bleiben getrennte Absätze,
  Überschriften bleiben als Überschriften erkennbar, Listen als Listen,
  Tabellen als Tabellen, Bilder an ihrer ursprünglichen Position — siehe
  jeweils jeweiliger Fachabschnitt in `FEATURE-SPEC-DOCX-ODT.md`).
- Der importierte Zustand gilt als **unverändert/„clean"**
  (`dirty: false`), bis die Nutzer:in tatsächlich etwas ändert. Ein Import,
  der sofort nach dem Laden bereits `dirty: true` anzeigt (z. B. durch einen
  Normalisierungsschritt, der fälschlich als Änderung gewertet wird), gilt
  als Fehler, weil er unnötig zum Speichern/Exportieren drängt und die
  Rundreise-Prüfung (Abschnitt 6) verfälschen kann.
- Nach dem Import ist der Editor sofort fokussierbar/bearbeitbar, ohne
  zusätzlichen Klick.

---

## 3. Grenzfälle (Edge Cases)

Jeder der folgenden Fälle ist einzeln zu verifizieren, für **beide** Formate
(DOCX und ODT), sofern nicht anders vermerkt:

| # | Grenzfall | Erwartetes Verhalten |
|---|---|---|
| 3.1 | Datei ist gar kein Zip-Container (z. B. reine Textdatei mit `.docx`-Endung umbenannt) | Fehlermeldung, kein Absturz. `JSZip`-Ladefehler muss im `try/catch` landen. |
| 3.2 | Datei ist ein gültiges Zip, aber ohne `word/document.xml` (DOCX) bzw. `content.xml` (ODT) | Definierte Fehlermeldung „… fehlt — keine gültige DOCX/ODT-Datei." (siehe `reader.ts`, bereits vorhanden — muss per E2E nachgewiesen werden, nicht nur Unit-Test). |
| 3.3 | Datei mit falscher Endung, aber richtigem Inhalt (z. B. eine echte DOCX-Datei, umbenannt in `.txt`, dann über den Dateidialog mit gelockerten Filtern ausgewählt) | Kein Absturz; entweder erfolgreicher Import (Inhalt wird anhand des Zip-Inhalts erkannt) oder saubere Fehlermeldung — Verhalten muss dokumentiert und konsistent sein, kein undefiniertes Verhalten. |
| 3.4 | `.odt`-Datei über die DOCX-Karte hochladen (falsches Zielformat trotz `accept`-Filter, z. B. über „Alle Dateien" im OS-Dialog erzwungen) | Sauberer Fehler „... konnte nicht als Word-Dokument (.docx) gelesen werden", kein stiller Fehlimport mit korrumpiertem Inhalt. Analog umgekehrt (.docx über ODT-Karte). |
| 3.5 | Leere Datei (0 Byte) | Fehlermeldung, kein Absturz, kein leerer aber „erfolgreich" wirkender Editor. |
| 3.6 | Sehr große Datei (mehrere zehn MB, z. B. viele/große eingebettete Bilder) | Import gelingt oder schlägt mit verständlicher Meldung fehl (z. B. Speicherlimit) — in jedem Fall kein Tab-Crash, keine dauerhaft eingefrorene UI. Ladezeit darf über der 3-Sekunden-Richtwert aus 2.1 liegen, muss aber ein sichtbares Lade-Signal zeigen statt wirkungslos zu erscheinen. |
| 3.7 | Dateiname mit Umlauten/Sonderzeichen/Leerzeichen (z. B. `Bewerbung Müller & Co (Entwurf).docx`) | Import funktioniert, vollständiger Dateiname inkl. Sonderzeichen bleibt für Titel-Anzeige und späteren Re-Export erhalten (kein Transliterieren/Kürzen). |
| 3.8 | Dateiname ohne Erweiterung oder mit doppelter Erweiterung (`Vertrag`, `Vertrag.docx.docx`) | Import anhand Inhalt (nicht Dateiname) entscheidet über Format-Kompatibilität zur gewählten Karte; Dateiname wird unverändert übernommen. |
| 3.9 | Passwortgeschützte/verschlüsselte DOCX/ODT-Datei | Fehlermeldung statt Absturz oder stillschweigend leerem Dokument. Muss nicht entschlüsselbar sein, aber der Fehlschlag muss sich wie jeder andere ungültige Import verhalten (Abschnitt 2.2). |
| 3.10 | Datei mit reiner `.doc`- oder `.rtf`-Struktur, aber `.docx`-Endung (altes Binärformat fälschlich umbenannt) | Fehlermeldung, kein Absturz, kein unlesbarer Binärmüll im Editor. |
| 3.11 | Abbruch des Dateidialogs (Cancel, keine Datei gewählt) | Kein `onChange`-Ereignis mit Datei → keine Aktion, kein Fehler-Banner, Startbildschirm bleibt unverändert. |
| 3.12 | Zwei Importversuche kurz hintereinander (z. B. Doppelklick oder zweite Dateiauswahl, bevor der erste Import fertig ist) | Kein Race Condition führt zu vermischtem/korruptem Zustand; letzter abgeschlossener Import gewinnt oder erster wird zuverlässig verarbeitet — Verhalten muss deterministisch und nachvollziehbar sein. |
| 3.13 | Reale komplexe Fremddatei mit nicht vollständig unterstützten Elementen (siehe `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 18: `draw:frame`-Textbox, `text:placeholder`, `text:date`, mehrspaltiges Layout, eingebettete Diagramme/OLE) | Kein stiller Textverlust — mindestens der sichtbare Text bleibt irgendwo im importierten Dokument auffindbar, auch wenn Layout/Feld-Charakter vereinfacht dargestellt wird. Nicht unterstützte Objekte erhalten einen Platzhalter statt ersatzlos zu verschwinden. |
| 3.14 | Verschachtelte Tabelle (Tabelle in Tabellenzelle) in importierter Fremddatei | Kein Absturz, Inhalt bleibt lesbar erhalten (auch wenn Verschachtelung ggf. vereinfacht wird). |
| 3.15 | Datei mit ausschließlich leerem/whitespace-Inhalt, aber technisch valider Struktur | Erfolgreicher Import eines leeren, aber validen Dokuments — kein Fehler, kein Crash. |
| 3.16 | Mehrfachauswahl im OS-Dialog (falls Betriebssystem Mehrfachauswahl erlaubt, obwohl `<input>` kein `multiple` trägt) | Nur die erste Datei (`files?.[0]`) wird verarbeitet, keine unerwartete Verarbeitung mehrerer Dateien gleichzeitig, kein Fehler durch übersehene weitere Dateien. |
| 3.17 | Import direkt nachdem bereits ein anderes Dokument im Editor offen war und wieder geschlossen wurde (`← Formate`) | Neuer Import auf dem Startbildschirm verhält sich identisch zu einem „frischen" Seitenaufruf, keine Reste des vorherigen Dokuments (Inhalt, Fehlerzustand, Dirty-Flag) beeinflussen den neuen Import. |

---

## 4. Nicht-Ziele / bewusste Abgrenzung

Zur Vermeidung von Scope-Creep bei der Verifikation dieses konkreten
Backlog-Eintrags gelten folgende, im Feature-Backlog separat geführte Punkte
**ausdrücklich nicht** als Teil von „Datei öffnen/importieren":

- Cross-Format-Export-Auswahl (`speichern-unter-format`) — eigener,
  aktuell als „fehlt" geführter Slug.
- Dokumenteigenschaften/Metadaten-Dialog (`dokumenteigenschaften`) — der
  Import selbst muss vorhandene Metadaten (mind. Titel) verlustfrei lesen
  (siehe Abschnitt 6), eine Bearbeitungs-UI dafür ist separat.
- Drag&Drop-Import, Tastaturkürzel Strg+O, „Zuletzt verwendet"-Liste — nicht
  spezifiziert, nicht Teil dieser Datei, es sei denn, im Zuge der Verifikation
  wird explizit neu beauftragt.
- Inhaltliche Korrektheit von Zeichen-/Absatzformatierung, Listen, Tabellen,
  Bildern **nach** dem Import ist in `FEATURE-SPEC-DOCX-ODT.md` Abschnitte
  2–9 im Detail spezifiziert; diese Datei verweist darauf, statt sie zu
  duplizieren, außer wo es die Rundreise-Anforderung in Abschnitt 6 direkt
  betrifft.

---

## 5. Grenzfälle der Bedienelemente selbst (UI-Robustheit)

1. Klick auf „Datei hochladen", während bereits ein Fehler-Banner sichtbar
   ist → neuer Dialog öffnet trotzdem zuverlässig (Banner blockiert nicht die
   Klickbarkeit des Buttons).
2. Tastatur-Bedienung: Button „Datei hochladen" ist per Tab erreichbar und per
   Enter/Leertaste auslösbar (Accessibility-Grundanforderung, kein reiner
   Maus-only-Weg).
3. Fokus nach Klick auf „Datei hochladen": Fokus darf nach Abbruch des
   OS-Dialogs nicht verloren gehen (zurück auf den auslösenden Button oder ein
   sinnvolles Ziel, nicht auf `<body>`).
4. Format-Karten sind eindeutig beschriftet (`Word-Dokument (.docx)` /
   `OpenDocument Text (.odt)`), sodass eine Verwechslung der Zielkarte durch
   die Nutzer:in unwahrscheinlich ist — dennoch muss Grenzfall 3.4 sauber
   abgefangen sein.

---

## 6. Rundreise-Anforderung (verbindlich für „vollständig verifiziert")

Diese Anforderung ist die zentrale Abnahmebedingung für den Status
„vollständig verifiziert" dieses Backlog-Eintrags und gilt **zusätzlich** zu
allen Einzelfällen aus Abschnitt 3:

> Datei A (DOCX **oder** ODT) hochladen → **ohne jede Änderung** im Editor
> sofort exportieren → Ergebnisdatei erneut über denselben Importweg
> importieren → der resultierende Dokumentinhalt muss dem ursprünglich
> importierten Inhalt aus Datei A **inhaltlich entsprechen**.

Konkretisierung, was „inhaltlich entsprechen" bedeutet (Prüfkriterien, je
Kriterium einzeln abhakbar):

1. **Text**: Sämtlicher sichtbarer Text (alle Absätze, alle Zellen, alle
   Listenelemente, Kopf-/Fußzeilentext, Alt-Texte) ist zeichengetreu
   identisch, keine fehlenden/zusätzlichen/vertauschten Absätze.
2. **Struktur**: Absatz- vs. Überschriften-Ebenen (1–6), Listen-Typ
   (Bullet/nummeriert) und -Verschachtelung, Tabellen-Dimensionen
   (Zeilen/Spalten) und verbundene Zellen (Row-/Colspan) bleiben identisch.
3. **Zeichenformatierung**: Fett/Kursiv/Unterstrichen/Durchgestrichen,
   Schriftfarbe, Hervorhebungsfarbe bleiben je Textlauf identisch zugeordnet
   (nicht nur „irgendwo im Dokument vorhanden", sondern am selben Textteil).
4. **Absatzformatierung**: Ausrichtung (links/zentriert/rechts/Blocksatz)
   bleibt je Absatz identisch erhalten.
5. **Bilder**: Anzahl, Reihenfolge/Position im Textfluss (inkl. Position
   innerhalb einer Tabellenzelle, falls vorhanden) und Bildinhalt
   (Pixel-/Byte-Äquivalenz oder mindestens visuell ununterscheidbar) bleiben
   erhalten. Kein Bild geht verloren, keines wird dupliziert.
6. **Metadaten**: Dokumenttitel (falls in Datei A vorhanden) bleibt erhalten.
7. **Dateiname**: Der für den Export vorgeschlagene Dateiname entspricht dem
   Namen von Datei A mit zum Zielformat passender Endung (bei
   Gleichformat-Rundreise identisch zu Datei A).
8. **Kein Absturz/keine Exception** während des gesamten Zyklus
   Import → Export → Re-Import.

**Format-Matrix — jede Zelle ist ein Pflicht-Testfall:**

| Zyklus | Pflicht |
|---|---|
| DOCX hochladen → unverändert als DOCX exportieren → DOCX re-importieren | Ja — Kriterien 1–8 |
| ODT hochladen → unverändert als ODT exportieren → ODT re-importieren | Ja — Kriterien 1–8 |

Zusätzlich, sobald `speichern-unter-format` (Cross-Format-Export,
aktuell laut Backlog „fehlt") umgesetzt ist, gilt ergänzend (informativ,
nicht Blocker für den Basis-Scope dieser Datei, aber zwingend nachzutragen,
sobald verfügbar):

| Zyklus | Status |
|---|---|
| DOCX hochladen → als ODT exportieren → ODT re-importieren | Nachrichtlich, sobald Cross-Format-Export existiert (siehe `FEATURE-SPEC-DOCX-ODT.md` 1.3, Testfall 3) |
| ODT hochladen → als DOCX exportieren → DOCX re-importieren | Nachrichtlich, sobald Cross-Format-Export existiert (siehe `FEATURE-SPEC-DOCX-ODT.md` 1.3, Testfall 4) |

**Testdaten-Anforderung**: Die Rundreise ist nicht nur mit einer trivialen
Ein-Satz-Datei zu prüfen, sondern zusätzlich mit mindestens je einer
realistischen Testdatei pro Format, die Überschriften, eine mehrstufige
Liste, eine Tabelle mit verbundenen Zellen, mindestens ein Bild sowie
gemischte Zeichenformatierung in einem Textlauf enthält (vgl. bestehende
Fixtures unter `tests/fixtures/external` und `test.odt` im Repo-Root als
Ausgangsbasis, bei Bedarf um eine vergleichbare DOCX-Datei ergänzen).

---

## 7. Abnahmekriterium für „vollständig verifiziert"

Der Backlog-Status für `datei-oeffnen` darf erst dann von „vorhanden
(nicht vertrauenswürdig)" auf „verifiziert" geändert werden, wenn:

1. Jeder Punkt aus Abschnitt 3 (Grenzfälle) und Abschnitt 5 (UI-Robustheit)
   einzeln mit einem echten, im Browser ausgeführten Test (nicht nur
   Reader/Writer-Unit-Test mit direkt konstruierten Testdaten) nachgewiesen
   ist — analog zur in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 22 Punkt 6
   beschriebenen QA-Übergabe.
2. Die vollständige Rundreise-Matrix aus Abschnitt 6 für DOCX **und** ODT mit
   realistischen Testdateien grün ist, inklusive aller acht Prüfkriterien.
3. Kein offener, aus dieser Datei hervorgegangener Fehlerbefund unbeantwortet
   bleibt (jeder Fund entweder behoben und regressionsgetestet, oder bewusst
   als bekannte Einschränkung dokumentiert — kein stillschweigendes
   Ignorieren, analog zur „Kein stiller Fehlschlag"-Anforderung in
   `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.4).
