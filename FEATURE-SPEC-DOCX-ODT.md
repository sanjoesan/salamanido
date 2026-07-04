# DOCX/ODT Feature-Spezifikation & Testplan

Status: Entwurf zur Freigabe — bitte prüfen, bevor weitergearbeitet wird.
Geltungsbereich: Diese Spezifikation ersetzt den bisherigen Multi-Format-Plan. Es wird
ausschließlich an DOCX und ODT gearbeitet, bis beide Formate diesen Anforderungen
vollständig genügen. Alle anderen Formate (PDF, XLSX/CSV, TXT/Markdown/JSON/XML) sind
gestrichen und werden erst danach überhaupt wieder betrachtet.

Architektur-Grundprinzip: DOCX und ODT teilen sich einen gemeinsamen internen
Editor (ProseMirror-Schema + Seitenansicht). Jedes Feature unten muss deshalb für
**beide** Formate funktionieren — sowohl beim Import einer bestehenden Datei als auch
beim Export einer im Editor erstellten/bearbeiteten Datei, inklusive Rundreise
(Datei A hochladen → unverändert exportieren → Ergebnis entspricht inhaltlich A).

---

## 1. Datei-Lifecycle

### 1.1 Neues Dokument erstellen
- Leeres Dokument mit Standard-Absatzformat, A4-Seite, Standardrändern.
- Sofort bearbeitbar ohne weitere Klicks (Cursor aktiv, Fokus im Editor).
- Exportierbar als DOCX **und** als ODT (Formatwahl beim Export, nicht nur beim Import).

**Testfälle**
1. Neues Dokument → sofort tippen möglich (kein zusätzlicher Klick nötig).
2. Neues Dokument ohne jede Änderung exportieren → Datei lässt sich wieder importieren und ist leer, aber valide.
3. Neues Dokument, Inhalt hinzufügen, als DOCX exportieren → in einem echten Prüf-Parser (nicht nur unserem eigenen Reader) valide.
4. Dasselbe für ODT.

### 1.2 Datei öffnen/importieren
- Upload per Klick auf „Datei hochladen" **und** funktionierende Dateiauswahl (kein stiller Fehlschlag).
- Fehlerhafte/fremde Datei → verständliche Fehlermeldung, keine leere weiße Seite, keine JS-Exception in der Konsole.
- Große/komplexe Datei (mehrere Seiten, viele Bilder) → Ladezeit vertretbar (< 3 Sekunden bei realistischer Testdatei), UI bleibt reaktionsfähig.

**Testfälle**
1. Gültige, einfache DOCX-Datei importieren → Inhalt korrekt sichtbar.
2. Gültige, einfache ODT-Datei importieren → Inhalt korrekt sichtbar.
3. Beschädigte/keine Office-Datei hochladen → Fehlermeldung statt Absturz.
4. Datei mit Umlauten/Sonderzeichen im Dateinamen → Import funktioniert, Dateiname bleibt für Re-Export erhalten.
5. Reale komplexe Datei mit Textfeldern/Platzhaltern/Datumsfeldern (siehe Abschnitt 6) → mindestens lesbarer Text, keine Datenverstümmelung.

### 1.3 Export / Speichern unter
- Export nach DOCX und nach ODT **unabhängig vom Ursprungsformat** wählbar (Format-Konvertierung).
- Export-Dateiname sinnvoll vorbelegt, Endung passend zum gewählten Format.
- Nach Export: Dokument bleibt im Editor weiter bearbeitbar (kein Reset, kein Verlust des Fokus/der Selektion).

**Testfälle**
1. Bearbeitetes Dokument exportieren → Datei-Download wird ausgelöst, Datei ist valide.
2. Export, danach weiter tippen → funktioniert ohne erneuten Klick/Reload.
3. ODT importieren → als DOCX exportieren (Cross-Format) → Inhalt bleibt erhalten.
4. DOCX importieren → als ODT exportieren (Cross-Format) → Inhalt bleibt erhalten.

---

## 2. Text-Grundfunktionen

- Tippen, Löschen (Entf/Backspace), Cursor-Navigation (Pfeiltasten, Pos1/Ende, Strg+Pfeil wortweise).
- Auswahl per Maus (Klick+Ziehen), per Doppelklick (Wort), per Dreifachklick (Absatz), per Tastatur (Umschalt+Pfeil, Strg+A).
- Ausschneiden/Kopieren/Einfügen — sowohl innerhalb des Editors als auch aus/nach extern (z. B. aus einer echten Word-Datei/Browser kopierter Text).
- Rückgängig/Wiederholen (Strg+Z / Strg+Y bzw. Strg+Umschalt+Z) über mehrere Schritte hinweg, auch über Formatierungsaktionen (Toolbar-Klicks) hinweg.
- Suchen (mindestens), idealerweise Suchen & Ersetzen.

**Bekannter, bereits gefundener Fehler (muss mit Regressionstest abgedeckt sein):**
Nach einer Toolbar-Aktion auf eine Selektion (z. B. Fett auf „Alles auswählen") gefolgt von
einem Klick zum Neupositionieren des Cursors wurde die interne Editor-Selektion nicht
aktualisiert — nachfolgende Eingaben (Enter, Tippen) haben unbeabsichtigt den gesamten
Dokumentinhalt ersetzt oder gelöscht. Fix vorhanden (Mouseup-Reconciliation), muss aber
mit einem dauerhaften, in der Suite verbleibenden Test abgesichert sein, der **exakt**
diese Sequenz nachstellt: Text eingeben → Alles auswählen → Formatierung anwenden →
per Klick neu positionieren → Enter → weiter tippen → **beide** Absätze müssen erhalten
bleiben.

**Testfälle**
1. Tippen, Löschen, Cursor-Navigation — Basisfunktion.
2. Auswahl per Maus, Doppelklick, Dreifachklick, Strg+A — jede Methode erzeugt korrekte Selektion.
3. Ausschneiden/Kopieren/Einfügen innerhalb des Dokuments.
4. Einfügen von extern kopiertem, formatiertem Text (z. B. aus einer Webseite) — Formatierung wird sinnvoll übernommen oder sauber auf Klartext reduziert, nicht korrumpiert.
5. Undo/Redo über gemischte Sequenz aus Tippen + Toolbar-Aktionen.
6. **Regressionstest für den Selection-Sync-Bug** (siehe oben) — Pflichttest, darf nie wieder brechen.
7. Undo nach Bild-Einfügen, nach Tabellen-Einfügen — auch komplexe Einfügungen müssen rückgängig machbar sein.

---

## 3. Zeichenformatierung

| Funktion | Anforderung |
|---|---|
| Fett | Toggle auf Selektion und an der Schreibmarke (nächstes Getipptes wird fett) |
| Kursiv | wie Fett |
| Unterstrichen | wie Fett |
| Durchgestrichen | wie Fett |
| Hoch-/Tiefstellen | Toggle, schließt sich gegenseitig aus |
| Schriftfarbe | Freie Farbwahl (Farbwähler), Farbe bleibt nach Formatwechsel erhalten |
| Hervorhebungsfarbe (Textmarker) | Freie Farbwahl, editierbar/entfernbar |
| Schriftart | Auswahl aus Liste, wird in DOCX/ODT korrekt referenziert |
| Schriftgröße | Numerische Eingabe/Auswahl |
| Formatierung löschen | Setzt Auswahl auf Basisformat zurück |

**Testfälle je Funktion (× für jede der obigen Zeilen, insgesamt ~40 Einzeltests)**
1. Anwenden auf bestehende Selektion → sichtbar korrekt gerendert.
2. Anwenden ohne Selektion (an der Schreibmarke) → wirkt sich auf neu getippten Text aus, nicht auf umgebenden Text.
3. Kombination mehrerer Formate gleichzeitig (fett **und** kursiv **und** farbig) auf demselben Textlauf.
4. Export nach DOCX → Rundreise (Re-Import) erhält exakt diese Kombination.
5. Export nach ODT → Rundreise erhält exakt diese Kombination.
6. Toolbar zeigt aktiven Zustand korrekt an (gedrückt/aktiv), wenn Cursor in bereits formatiertem Text steht.
7. Entfernen der Formatierung (Toggle aus) funktioniert ebenso zuverlässig wie das Setzen.

---

## 4. Absatzformatierung

- Ausrichtung: links/zentriert/rechts/Blocksatz — pro Absatz, nicht nur pro Zeichen.
- Formatvorlagen: Standard, Überschrift 1–6 (mind.), Auswahl über Dropdown.
- Zeilenabstand und Absatzabstand (vor/nach) — mindestens „einfach/1,5-fach/doppelt".
- Einzüge: links, rechts, Erstzeileneinzug/hängender Einzug.
- Tabstopps (mindestens Standard-Tabulatorsprünge, keine benutzerdefinierten Tab-Positionen zwingend erforderlich, aber Tab-Zeichen darf nicht verloren gehen).

**Testfälle**
1. Jede der vier Ausrichtungen setzen, exportieren, reimportieren → Ausrichtung erhalten (DOCX **und** ODT — bereits vorhanden, muss aber in Testsuite bleiben und um Zeilenabstand/Einzug erweitert werden).
2. Formatvorlage „Überschrift 1"–„Überschrift 6" setzen → korrektes Element beim Export (`w:pStyle`/`text:h` mit korrektem Level), Rundreise erhält Level.
3. Wechsel von Überschrift zurück zu Standard-Absatz → Element-Typ ändert sich korrekt (nicht nur visuell).
4. Zeilenabstand/Absatzabstand setzen → Rundreise erhält Werte.
5. Einzüge setzen (links/rechts/Erstzeile) → Rundreise erhält Werte.
6. Tab-Zeichen im Text → bleibt bei Rundreise erhalten, wird nicht zu Leerzeichen.

---

## 5. Listen

- Aufzählungsliste (Bullet), nummerierte Liste, jeweils ein-/mehrstufig (Einrücken/Ausrücken einer Zeile ändert die Verschachtelungsebene).
- Ein-/Ausrücken per Tab/Umschalt+Tab innerhalb einer Liste.
- Nummerierung fortsetzen oder neu starten.
- Liste aufheben (zurück zu normalen Absätzen) ohne Textverlust.
- Enter am Ende eines leeren Listenpunkts beendet die Liste (Standard-Editor-Verhalten).

**Testfälle**
1. Bullet-Liste mit mehreren Punkten anlegen, exportieren, reimportieren → Punktzahl und Reihenfolge erhalten.
2. Nummerierte Liste ebenso.
3. Mehrstufige Liste (Einrücken einer Zeile) → Verschachtelungsebene bleibt bei Rundreise erhalten (aktuell **nicht getestet, vermutlich nicht implementiert** — muss geprüft werden).
4. Tab/Umschalt+Tab ändert Ebene korrekt und aktualisiert die Nummerierung sichtbar.
5. Liste aufheben → Text bleibt vollständig erhalten, keine Aufzählungszeichen mehr sichtbar.
6. Zwei separate Listen mit normalem Absatz dazwischen → bleiben beim Import als zwei getrennte Listen erkennbar (DOCX-Reader-Test existiert bereits, ODT-Äquivalent prüfen).
7. Reale komplexe Datei mit mehrstufiger Liste (Fremddatei) importieren → Struktur erkennbar, nicht nur als flacher Text.

---

## 6. Tabellen

**Von der Nutzerin explizit als nicht funktionsfähig gemeldet — höchste Priorität.**

- Tabelle einfügen mit wählbarer Zeilen-/Spaltenzahl (aktuell fest 2×2 — muss ein Dialog/Auswahl werden).
- In Zellen klicken und tippen funktioniert zuverlässig (inkl. des Selection-Sync-Bugs aus Abschnitt 2 — Tabellen sind ein Hauptverdachtsfall, da Klicks zwischen Zellen ähnliche Selektionswechsel auslösen).
- Navigation mit Tab (nächste Zelle) und Umschalt+Tab (vorherige Zelle), Tab in letzter Zelle der letzten Zeile fügt neue Zeile hinzu.
- Zeile einfügen (oberhalb/unterhalb), Zeile löschen.
- Spalte einfügen (links/rechts), Spalte löschen.
- Zellen verbinden (horizontal und vertikal), Zellen wieder teilen.
- Tabelle komplett löschen.
- Zellinhalt kann selbst wieder formatiert werden (fett, Ausrichtung etc. innerhalb einer Zelle) und mehrere Absätze enthalten.
- Rahmen/Spaltenbreite mindestens beim Import aus Fremddateien sinnvoll dargestellt (muss nicht frei editierbar sein, darf aber nicht komplett verschwinden).

**Testfälle**
1. Tabelle einfügen → sichtbar mit korrekter Zeilen-/Spaltenzahl, Zellrahmen sichtbar.
2. In jede Zelle klicken und tippen → Inhalt landet in der richtigen Zelle, kein Bug wie in Abschnitt 2.
3. Tab-Navigation durch alle Zellen inkl. Sprung in neue Zeile am Ende.
4. Zeile/Spalte einfügen/löschen → Struktur bleibt konsistent, kein Crash.
5. Zellen verbinden (colspan) → bereits mit Unit-Tests abgedeckt für Export/Import; **E2E-Test über echte Toolbar-Bedienung fehlt komplett** und muss ergänzt werden (bisher nur über direkt konstruierte Testdaten geprüft, nicht über tatsächliche Zellauswahl+Verbinden-Aktion, da diese Aktion in der UI noch gar nicht existiert).
6. Zellen vertikal verbinden (rowspan) ebenso.
7. Mehrere Absätze innerhalb einer Zelle, davon einer fett → Rundreise erhält Struktur.
8. Verschachtelte Tabelle (Tabelle in Tabellenzelle) — mindestens beim Import einer Fremddatei nicht abstürzen, Inhalt lesbar erhalten.
9. Reale komplexe Datei mit großer Tabelle (>5 Spalten, >10 Zeilen, gemischte Formatierung) importieren, unverändert exportieren, erneut importieren → Zellinhalte identisch.
10. Tabelle direkt am Dokumentanfang/-ende einfügen (Grenzfall für Cursor-Positionierung danach) → weiterhin editierbar.

---

## 7. Bilder

**Von der Nutzerin explizit als nicht funktionsfähig gemeldet — höchste Priorität.**

- Bild einfügen über Dateiauswahl (aktueller Mechanismus: Toolbar-Button öffnet nativen Datei-Dialog) — **muss end-to-end im Browser getestet werden, nicht nur die Command-Funktion isoliert.**
- Unterstützte Formate mindestens PNG, JPEG; sinnvoller Fehler bei nicht unterstütztem Format.
- Bild wird an der Cursor-Position eingefügt (nicht an zufälliger Stelle), umgebender Text bleibt erhalten (kein Überschreiben wie in Abschnitt 2 befürchtet).
- Bildgröße: sinnvolle Standardgröße beim Einfügen, keine Bilder, die die Seite sprengen oder auf 0×0 kollabieren.
- Größe nachträglich änderbar (mind. per Eingabefeld, idealerweise per Ziehpunkte).
- Alt-Text editierbar (Barrierefreiheit).
- Bild löschen (Markieren + Entf) ohne Nebenwirkungen auf umgebenden Text.
- Nach Bild-Einfügen: Editor bleibt normal weiter bedienbar (Tippen davor/danach, siehe bereits gefundenes Diagnose-Bedürfnis).

**Testfälle**
1. Bild über Toolbar einfügen (echter `filechooser`-Flow im Browser, nicht nur Command-Aufruf) → Bild sichtbar im Dokument.
2. Text vor und nach dem Bild eingeben → beide Textteile bleiben erhalten, keine Löschung (expliziter Test für das gemeldete Problem).
3. Bild einfügen, danach Rückgängig → Bild verschwindet, Text unverändert.
4. Bild-Rundreise DOCX (bereits als Unit-Test vorhanden) — zusätzlich per E2E über echten Datei-Upload-Dialog nachstellen.
5. Bild-Rundreise ODT ebenso.
6. Mehrere Bilder im selben Dokument → alle bleiben bei Rundreise unterscheidbar (keine Verwechslung/Überschreibung).
7. Bild in einer Tabellenzelle → Rundreise erhält Zuordnung.
8. Reale komplexe Datei mit mehreren, unterschiedlich großen Bildern importieren → alle sichtbar, keines fehlt, keines verzerrt.
9. Bild löschen → Rundreise-Export enthält es korrekt nicht mehr, keine verwaisten Bilddateien im Zip.
10. Sehr großes Bild (mehrere MB) einfügen → UI bleibt bedienbar, kein Einfrieren.

---

## 8. Seitenlayout & Paginierung

- Sichtbare Seiten im A4-Format mit realistischen Rändern.
- Inhalt, der eine Seite füllt, fließt sichtbar auf eine zweite Seite über (mehrseitige Anzeige).
- **Kein leerer/übergroßer Zwischenraum bei kurzen Dokumenten** — in bisherigen Screenshots war ein auffälliger Leerraum über kurzem Text sichtbar; muss geklärt werden, ob das der normale Seitenrand ist (dann dokumentieren) oder ein Rendering-Fehler (dann beheben). Dieser Punkt gilt als **offen und ungeklärt** und muss vor Abnahme visuell verifiziert werden (Screenshot-Vergleich gegen erwartete Randmaße).
- Seitenumbruch manuell einfügbar.
- Zoom/Ansicht mindestens auf gängigen Bildschirmgrößen inkl. Tablet/Mobile benutzbar (bestehende responsive Tests decken nur das Grundgerüst ab, nicht den eigentlichen Editor mit Seitenansicht).

**Testfälle**
1. Kurzes Dokument (1 Absatz) → Seitenrand entspricht dokumentierter Sollgröße, kein unerwarteter Leerraum.
2. Langes Dokument (mehrere Bildschirmhöhen Text) → korrekter Umbruch auf Folgeseite, Seitenzahl-Anzeige (falls vorhanden) stimmt.
3. Seitenumbruch manuell einfügen → nachfolgender Inhalt beginnt auf neuer Seite, auch nach Export/Reimport.
4. Editor auf Tablet-Viewport (bereits vorhandene Playwright-Projekte nutzen) → Seite bleibt weiterhin weiter bedienbar (Toolbar erreichbar, Tabellen/Bilder einfügbar).
5. Editor auf Mobile-Viewport → mindestens lesbar, Kernfunktionen (Tippen, Fett, Export) bedienbar.

---

## 9. Kopf- und Fußzeilen

- Kopfzeile und Fußzeile jeweils eigener editierbarer Bereich, unabhängig vom Haupttext.
- Mindestens „Standard" (gleiche Kopf-/Fußzeile auf jeder Seite) — abweichende erste Seite/gerade-ungerade optional, aber wenn nicht unterstützt, muss das explizit dokumentiert sein statt stillschweigend zu fehlen.
- Seitenzahl als Feld einfügbar (aktualisiert sich mit tatsächlicher Seitenzahl beim Export, mindestens als korrektes Word/ODF-Feld, das die Zielanwendung selbst berechnet).
- Aktuell laut Plan „vorhanden" — **muss aber über echte UI-Bedienung getestet werden, nicht nur über konstruierte Testdaten** (bisherige Unit-Tests bauen `WordDocumentContent.header/footer` direkt zusammen, es gibt noch keinen UI-Weg, eine Kopf-/Fußzeile über den Editor selbst zu erstellen/bearbeiten — **das ist eine fehlende Funktion, kein reiner Test-Gap**).

**Testfälle**
1. Kopfzeile über UI aktivierbar/editierbar machen (Funktion muss zuerst gebaut werden).
2. Text in Kopfzeile eingeben, exportieren, reimportieren → erhalten.
3. Dasselbe für Fußzeile.
4. Seitenzahl-Feld einfügen → in Word/LibreOffice (bzw. unserem Reader) als Feld erkennbar, nicht als hartkodierte Zahl „1".
5. Formatierung (fett etc.) innerhalb der Kopf-/Fußzeile funktioniert identisch zum Haupttext.

---

## 10. Inhaltsverzeichnis

**Laut Plan Teil von Phase 3 — noch nicht begonnen.**

- Automatische Generierung aus vorhandenen Überschriften (Ebene 1–6, konfigurierbare Tiefe).
- Klick auf Eintrag springt im Editor zur entsprechenden Stelle.
- „Aktualisieren"-Funktion, wenn sich Überschriften geändert haben.
- Export als echtes Feld (Word: `TOC`-Feld, das Word selbst aktualisiert; ODT: `text:table-of-content`), nicht als statischer Text ohne Bezug zu den echten Überschriften.

**Testfälle**
1. Dokument mit 5 Überschriften unterschiedlicher Ebene → ToC listet alle korrekt mit richtiger Einrückung.
2. Überschrift nachträglich umbenennen/hinzufügen → „Aktualisieren" spiegelt Änderung wider.
3. Klick auf ToC-Eintrag → Editor scrollt/springt zur Überschrift.
4. Export nach DOCX → Feld ist in Word tatsächlich als aktualisierbares ToC-Feld erkennbar (Unit-Test: korrekte Feld-Syntax im XML).
5. Export nach ODT → entsprechendes ODF-Element vorhanden.
6. Rundreise: ToC exportieren, reimportieren → weiterhin als ToC erkannt, nicht als normaler Text zerfallen.

---

## 11. Fußnoten

**Laut Plan Teil von Phase 3 — noch nicht begonnen.**

- Fußnote an Cursor-Position einfügen, automatische fortlaufende Nummerierung.
- Fußnotentext eigener editierbarer Bereich am Seitenende.
- Fußnote löschen → Nummerierung der übrigen passt sich an.
- Formatierung innerhalb der Fußnote möglich.

**Testfälle**
1. Fußnote einfügen → Referenzmarke im Text, Text am Seitenende, korrekte Nummer 1.
2. Zweite Fußnote vor der ersten einfügen → Nummerierung aktualisiert sich korrekt (1 wird 2, neue wird 1) oder zumindest konsistent fortlaufend.
3. Fußnote löschen → nachfolgende Nummern rücken nach.
4. Rundreise DOCX (`word/footnotes.xml`) und ODT (`text:note`) — Inhalt und Nummerierung erhalten.
5. Fußnotentext mit Formatierung (z. B. kursiv) → bleibt bei Rundreise erhalten.

---

## 12. Kommentare

**Laut Plan Teil von Phase 3 — noch nicht begonnen.**

- Kommentar an markiertem Textbereich hinzufügen.
- Autor und Zeitstempel werden angezeigt (Autor kann ein fixer/eingebbarer Name sein, da kein Login-System existiert).
- Kommentare sichtbar (z. B. Randspalte oder Hervorhebung mit Hover/Klick).
- Kommentar löschen/auflösen.

**Testfälle**
1. Kommentar zu einer Textstelle hinzufügen → sichtbar markiert, Kommentartext einsehbar.
2. Mehrere Kommentare an unterschiedlichen Stellen → keine Überschneidung/Verwechslung.
3. Kommentar löschen → Markierung im Text verschwindet, Text selbst bleibt unverändert.
4. Rundreise DOCX (`word/comments.xml`) und ODT (`office:annotation`) — Kommentartext, Autor, Bezugstext erhalten.
5. Kommentar über eine Formatierungsgrenze hinweg (z. B. über fett+normal-Text) → Anker bleibt korrekt.

---

## 13. Änderungsverfolgung (Track Changes)

**Laut Plan Teil von Phase 3 — noch nicht begonnen. Höchste Komplexität im gesamten Funktionsumfang.**

- Ein-/Ausschalten der Aufzeichnung.
- Einfügungen werden visuell markiert (z. B. farbig unterstrichen), Löschungen bleiben sichtbar (durchgestrichen), bis akzeptiert/abgelehnt.
- Änderung besitzt Autor (fester/eingebbarer Name) und Zeitstempel.
- Einzelne Änderung annehmen/ablehnen, sowie „Alle annehmen"/„Alle ablehnen".
- Bei ausgeschalteter Aufzeichnung: normales Bearbeiten ohne Markierung.

**Testfälle**
1. Aufzeichnung einschalten, Text einfügen → als Einfügung markiert dargestellt.
2. Text löschen bei aktiver Aufzeichnung → bleibt sichtbar (durchgestrichen), verschwindet nicht sofort.
3. Einzelne Änderung annehmen → wird zu normalem Text/verschwindet endgültig (bei Löschung).
4. Einzelne Änderung ablehnen → ursprünglicher Zustand wird wiederhergestellt.
5. „Alle annehmen" auf Dokument mit gemischten Einfügungen/Löschungen mehrerer (simulierter) Autoren.
6. Rundreise DOCX (`w:ins`/`w:del`) — Änderungen bleiben nach Export/Reimport als Änderungen erkennbar, nicht schon festgeschrieben.
7. Rundreise ODT (`text:change`/`text:change-start`/`text:change-end`) ebenso.
8. Änderung, die eine Tabellen- oder Listenstruktur betrifft (Grenzfall, in Word selbst schon fehleranfällig) — mindestens keine Datenkorruption, auch wenn Darstellung vereinfacht ist.

---

## 14. Hyperlinks

- Link zu markiertem Text hinzufügen (URL-Eingabe).
- Link-Ziel bearbeiten, Link entfernen (Text bleibt).
- Visuelle Standarddarstellung (unterstrichen, farbig).

**Testfälle**
1. Link auf Selektion anwenden → sichtbar als Link, Ziel-URL korrekt hinterlegt.
2. Link bearbeiten → neue URL wird übernommen.
3. Link entfernen → Text bleibt, Verlinkung verschwindet.
4. Rundreise DOCX (`w:hyperlink` + Relationship) und ODT (`text:a`) — Ziel-URL erhalten.

---

## 15. Sonderelemente

- Manueller Seitenumbruch (siehe Abschnitt 8).
- Zeilenumbruch (Umschalt+Enter) vs. Absatzumbruch (Enter) — beide müssen bei Rundreise unterscheidbar bleiben (bereits als `hard_break` vorhanden, mit Unit-Tests abgedeckt — hier nur E2E-Nachtest nötig).
- Tabulator-Zeichen innerhalb eines Absatzes (außerhalb von Listen) — darf nicht mit Listeneinzug verwechselt werden.
- Geschütztes Leerzeichen (nice-to-have, kein Blocker).

**Testfälle**
1. Umschalt+Enter im Editor → erzeugt Zeilenumbruch innerhalb desselben Absatzes (kein neuer Absatz).
2. Rundreise bestätigt: bleibt `hard_break`, wird nicht zu zwei Absätzen.
3. Tab-Taste außerhalb einer Liste → fügt Tabstopp-Sprung ein (nicht versehentlich Listeneinrückung, falls Cursor zufällig in Listenkontext ist — Abgrenzung testen).

---

## 16. Dokumentmetadaten

- Titel (bereits vorhanden) — Eingabemöglichkeit in der UI fehlt noch (bisher nur beim Import gelesen/beim Export geschrieben, aber nirgends im Editor selbst einstellbar, falls neu erstellt).

**Testfälle**
1. Titel bei neuem Dokument setzen können (UI-Element fehlt aktuell — muss ergänzt werden).
2. Titel bleibt bei Rundreise erhalten (Reader/Writer-seitig bereits getestet).

---

## 17. Menü-/Toolbar-Übersicht (Soll-Zustand je Element)

| # | Element | Aktueller Zustand | Soll |
|---|---|---|---|
| 1 | Absatzformat-Dropdown | vorhanden | siehe Abschnitt 4 |
| 2 | Fett/Kursiv/Unterstrichen/Durchgestrichen | vorhanden, Icons als reine Buchstaben (F/K/U/S) | Icons müssen unabhängig von Systemschriftart/Emoji-Unterstützung eindeutig erkennbar sein — auf durch die Nutzerin gemeldetes Rendering-Problem prüfen und ggf. auf verlässliche SVG-Icons umstellen |
| 3 | Textfarbe / Hervorhebung + „Entfernen"-Buttons | vorhanden | funktional prüfen, „Entfernen"-Symbol (⌫) ebenfalls auf Rendering prüfen |
| 4 | Ausrichtung (links/zentriert/rechts/Blocksatz) | vorhanden, Pfeil-/Linien-Symbole | Rendering auf mehreren Systemen/Browsern verifizieren |
| 5 | Aufzählung / Nummerierung / Liste aufheben | vorhanden | siehe Abschnitt 5, mehrstufig prüfen |
| 6 | Tabelle einfügen (⊞ Symbol) | vorhanden, aber laut Nutzerin nicht funktional | siehe Abschnitt 6 — kompletter Nachweis über echte Bedienung nötig, feste 2×2-Größe durch Dialog ersetzen |
| 7 | Bild einfügen (🖼 Symbol) | vorhanden, aber laut Nutzerin nicht funktional | siehe Abschnitt 7 — Symbol ist ein Emoji, Rendering-Ausfall wahrscheinliche Ursache für „nicht sichtbar/nicht auffindbar" |
| 8 | Kopf-/Fußzeile bearbeiten | **fehlt komplett in der UI** | neu zu bauen, siehe Abschnitt 9 |
| 9 | Inhaltsverzeichnis einfügen/aktualisieren | fehlt (Phase 3) | siehe Abschnitt 10 |
| 10 | Fußnote einfügen | fehlt (Phase 3) | siehe Abschnitt 11 |
| 11 | Kommentar einfügen | fehlt (Phase 3) | siehe Abschnitt 12 |
| 12 | Änderungsverfolgung an/aus, annehmen/ablehnen | fehlt (Phase 3) | siehe Abschnitt 13 |
| 13 | Link einfügen/bearbeiten/entfernen | fehlt | siehe Abschnitt 14 |
| 14 | Seitenumbruch einfügen | fehlt | siehe Abschnitt 8 |
| 15 | Suchen (& Ersetzen) | fehlt | siehe Abschnitt 2 |
| 16 | Formatierung löschen | fehlt | siehe Abschnitt 3 |
| 17 | Hoch-/Tiefstellen | fehlt | siehe Abschnitt 3 |
| 18 | Schriftart-/Schriftgrößen-Auswahl | fehlt | siehe Abschnitt 3 |
| 19 | Dokumenttitel setzen | fehlt | siehe Abschnitt 16 |
| 20 | Tabellen-Kontextfunktionen (Zeile/Spalte einfügen/löschen, verbinden/teilen) | fehlt komplett in der UI (nur Datenmodell-seitig über Tests konstruiert) | siehe Abschnitt 6 — **größte Einzellücke im gesamten Funktionsumfang** |

Diese Tabelle macht sichtbar: **ein erheblicher Teil der in der Roadmap als „vorhanden"
markierten Funktionen existiert nur als Datenmodell/Reader/Writer, aber noch nicht als
tatsächlich bedienbare UI-Funktion.** Das erklärt die Rückmeldung „nicht mal ansatzweise
fertig" — die Testsuite hat bisher überwiegend Lese-/Schreib-Rundreisen mit direkt
konstruierten Testdaten geprüft, nicht die tatsächliche Bedienung über die Oberfläche.

---

## 18. Import-Robustheit (reale komplexe Dateien)

Anlass: Die bereitgestellte reale ODT-Datei (LibreOffice-Briefvorlage) enthält Elemente,
die aktuell nicht abgebildet werden:
- `draw:frame` als frei positionierte Textbox (Logo-Platzhalter) — aktuell wird nur
  `draw:frame` mit `draw:image`-Kind als Bild interpretiert; ein Frame mit `draw:text-box`
  wird derzeit vermutlich stillschweigend übersprungen bzw. führt zu Textverlust.
- `text:placeholder` (Platzhaltertext wie „«Firmenname»") — aktuell unbekanntes Element,
  wird vermutlich ignoriert (Textverlust).
- `text:date` (dynamisches Datumsfeld) — aktuell unbekanntes Element.
- `style:master-page-name` auf Absatzebene (Verweis auf „erste Seite" abweichend von
  Folgeseiten) — wird aktuell nicht ausgewertet.

**Anforderung:** Für nicht vollständig unterstützte Elemente gilt ein klar definiertes
Fallback-Verhalten — mindestens der reine Text bleibt erhalten (kein stiller Datenverlust),
auch wenn Layout/Feld-Charakter vereinfacht wird. Ein Import darf niemals dazu führen,
dass sichtbarer Inhalt der Originaldatei ersatzlos verschwindet.

**Testfälle**
1. Die bereitgestellte reale Datei importieren → jeder ursprünglich sichtbare Text
   (inklusive Platzhaltertexte und Logo-Textbox-Inhalt) ist irgendwo im importierten
   Dokument wiederzufinden.
2. Mindestens 10 weitere reale, komplexe DOCX-Dateien aus vertrauenswürdigen Open-Source-
   Testkorpora (z. B. python-docx-Testfixtures, Apache-POI-Testdaten) importieren →
   für jede: kein Absturz, kein leeres Dokument, Kernabsätze lesbar.
3. Mindestens 10 weitere reale, komplexe ODT-Dateien ebenso.
4. Datei mit eingebetteten Diagrammen/OLE-Objekten (nicht unterstützt) → sinnvoller
   Fallback (z. B. Platzhaltertext „[nicht unterstütztes Objekt]"), kein Crash.
5. Datei mit mehrspaltigem Layout → mindestens linearer Text erhalten, auch wenn
   Spaltenlayout nicht nachgebildet wird.

---

## 19. Export-Robustheit & Round-Trip

- Für jede in dieser Spezifikation genannte Funktion: Export nach DOCX und nach ODT
  muss in einer **echten** Zielanwendung (mindestens per unabhängigem Parser/Bibliothek,
  idealerweise LibreOffice/Word, falls verfügbar) prüfbar valide sein — nicht nur durch
  unseren eigenen Reader wieder einlesbar (sonst besteht die Gefahr, dass Schreib- und
  Lesefehler sich gegenseitig „unsichtbar" ausgleichen).
- Cross-Format-Rundreise (DOCX → Editor → ODT → Editor → DOCX) darf keinen
  kumulativen Datenverlust erzeugen.

**Testfälle**
1. Für eine Auswahl komplexer, mit allen Features angereicherter Testdokumente:
   Export nach DOCX → Validierung mit einer unabhängigen Bibliothek (z. B. python-docx
   oder eine XML-Schema-Validierung gegen das offizielle OOXML-Schema).
2. Analog für ODT gegen das ODF-Schema.
3. Doppelte Rundreise (Format-Wechsel hin und zurück) an einem Dokument mit allen
   Features aus Abschnitten 3–14 → Inhalt nach zwei Konvertierungen weiterhin
   inhaltlich identisch zum Original (Formatierungsverluste bei Cross-Format sind
   akzeptabel und zu dokumentieren, Textverlust nicht).

---

## 20. UI/UX-Anforderungen aus bisherigem Testing

1. **Icon-Rendering:** Alle Toolbar-Symbole müssen auf einem System ohne Emoji-Schriftart
   und ohne exotische Unicode-Glyphen-Unterstützung eindeutig erkennbar sein. Bevorzugt:
   eingebettete SVG-Icons statt Unicode-Zeichen (🖼 ⊞ ⇧ ⇤ ↔ ⇥ ≡ ⌫ 🖍 etc.).
2. **Selektions-Stabilität:** siehe Abschnitt 2 — Regressionstest ist Pflichtbestandteil
   der Suite, nicht optional.
3. **Seitenlayout-Darstellung:** siehe Abschnitt 8 — Klärung, ob der sichtbare Abstand
   über kurzem Text ein normaler Seitenrand oder ein Darstellungsfehler ist; Ergebnis
   dieser Klärung wird hier nachgetragen.
4. **Kein stiller Fehlschlag:** Jede Aktion (Einfügen, Löschen, Export, Import), die aus
   irgendeinem Grund nicht ausgeführt werden kann, muss eine sichtbare Rückmeldung
   erzeugen — nie ein Klick, der einfach nichts tut.

---

## 21. Testmatrix — Zusammenfassung

| Bereich | Unit-Tests (Reader/Writer) | E2E-Tests (echte Bedienung im Browser) | Reale Fixture-Tests |
|---|---|---|---|
| Zeichenformatierung | vorhanden (DOCX+ODT) | teilweise (Fett/Kursiv über Toolbar) — restliche Formate fehlen | offen |
| Absatzformatierung | teilweise (Ausrichtung) | teilweise | offen |
| Listen | teilweise (flach) | fehlt | offen |
| Tabellen | vorhanden (Datenmodell) | **fehlt komplett** (keine UI-Funktionen für Zeile/Spalte/Verbinden) | offen |
| Bilder | vorhanden (Datenmodell) | vorhanden, aber laut Rückmeldung fehlerhaft — nachprüfen | offen |
| Seitenlayout | fehlt | fehlt | — |
| Kopf-/Fußzeile | vorhanden (Datenmodell) | **fehlt komplett** (keine UI) | offen |
| Inhaltsverzeichnis | fehlt | fehlt | — |
| Fußnoten | fehlt | fehlt | — |
| Kommentare | fehlt | fehlt | — |
| Änderungsverfolgung | fehlt | fehlt | — |
| Hyperlinks | fehlt | fehlt | — |
| Selektions-Regression | n/a | 1 Diagnosetest vorhanden, muss in Dauer-Suite überführt werden | — |

**Fazit:** Die Einschätzung „ca. 20 % fertig" ist nach dieser Bestandsaufnahme
nachvollziehbar — insbesondere weil zentrale Funktionen (Tabellen-Bearbeitung,
Kopf-/Fußzeile, Inhaltsverzeichnis, Fußnoten, Kommentare, Änderungsverfolgung) entweder
gar keine Bedienoberfläche haben oder noch nicht begonnen wurden.

---

## 22. Vorschlag für weiteres Vorgehen

1. Diese Spezifikation freigeben oder korrigieren/ergänzen.
2. Fehlende UI-Funktionen aus Abschnitt 17 (Tabellen-Bearbeitung, Kopf-/Fußzeile,
   Formatierung-löschen, Hoch-/Tiefstellen, Schriftart/-größe, Link, Suchen) bauen.
3. Icon-Rendering auf SVG umstellen.
4. Phase 3 (Inhaltsverzeichnis, Fußnoten, Kommentare, Änderungsverfolgung) umsetzen.
5. Reale Testkorpora (mindestens 20–30 komplexe DOCX/ODT-Dateien aus vertrauens-
   würdigen Open-Source-Quellen, keine Malware-Gefahr) beschaffen und Importfähigkeit
   systematisch prüfen.
6. **Ab diesem Punkt:** Verifikation jedes einzelnen Punkts dieser Spezifikation sowie
   das Schreiben der zugehörigen Tests wird an einen dedizierten QA-Agenten übergeben,
   der echte Browser-Interaktionen durchführt (nicht nur Datenmodell-Tests) und jeden
   Punkt dieser Spezifikation einzeln abhakt.
