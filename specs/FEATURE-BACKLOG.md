# Feature-Backlog: Vollständiger Funktionsumfang einer Textverarbeitung

Status: Vollständige Bestandsaufnahme zur Nachvollziehbarkeit — Basis für die
Priorisierung der weiteren Salamanido-Entwicklung (DOCX/ODT-Editor).

Ziel dieses Dokuments: eine **granulare**, einzeln abhakbare Liste jeder Funktion, die
eine ernstzunehmende Textverarbeitung (Microsoft Word / LibreOffice Writer, volle
Ribbon-Tiefe über Datei/Start/Einfügen/Entwurf/Layout/Referenzen/Sendungen/Überprüfen/
Ansicht) anbietet — nicht als grobe Kategorien, sondern als einzelne Menüpunkte/Buttons,
so wie sie in einem echten Ribbon einzeln anklickbar wären.

## Methodik

Für jeden Eintrag wurde geprüft:
1. Existiert die Funktion als **echter, klickbarer UI-Button** in
   `src/formats/shared/editor/Toolbar.tsx`, der einen tatsächlichen Befehl aus
   `src/formats/shared/editor/commands.ts` (bzw. `src/formats/shared/schema.ts` für
   das zugrunde liegende Datenmodell) auslöst?
2. Oder existiert nur Datenmodell-/Reader-/Writer-Unterstützung (z. B. ein Schema-Attribut,
   das beim Import/Export korrekt behandelt wird), aber **keine** Möglichkeit, die Funktion
   über die Oberfläche selbst zu benutzen?
3. Oder fehlt die Funktion komplett — weder UI noch Datenmodell?

Zusätzlich herangezogen: `E:\docs\FEATURE-SPEC-DOCX-ODT.md` (bestehende Teilanalyse),
`src/formats/shared/schema.ts` (ProseMirror-Schema: Marks `strong`, `em`, `underline`,
`strike`, `textColor`, `highlight`; Nodes `paragraph`, `heading` (1–6), `image`,
`bullet_list`, `ordered_list`, `list_item`, Tabellen-Nodes aus `prosemirror-tables`,
`hard_break`), `src/formats/shared/editor/WordEditor.tsx` (Keymap, Plugins),
`src/formats/shared/documentModel.ts` (`WordDocumentContent` mit `body`, `header`,
`footer`, `meta.title`), sowie `src/app/FormatPicker.tsx` und
`src/app/DocumentWorkspace.tsx` (Datei-Lifecycle: Neu/Öffnen/Exportieren/Schließen).

### Status-Legende

| Status | Bedeutung |
|---|---|
| **vorhanden** | Echter, funktionierender UI-Weg in der Anwendung vorhanden. |
| **teilweise** | Ansatzweise vorhanden — entweder nur im Datenmodell (Import/Export), oder als UI-Element mit stark eingeschränkter Funktionalität (z. B. feste statt wählbare Größe). |
| **fehlt** | Weder UI noch Datenmodell vorhanden. |

### Prioritäts-Legende

| Priorität | Bedeutung |
|---|---|
| **1** | Essenziell/fundamental — ohne diese Funktion ist das Werkzeug keine ernstzunehmende Textverarbeitung. |
| **2** | Wichtig — von den meisten Nutzer:innen im Alltag erwartet. |
| **3** | Nice-to-have/fortgeschritten — wird von einem Teil der Nutzer:innen gelegentlich gebraucht. |
| **4** | Randfall/geringer Wert oder bewusst grenzwertig für den Projektumfang (z. B. voller Seriendruck, Makros). |

---

## 1. Datei (Backstage / Datei-Lifecycle)

| Slug | Titel | Beschreibung | Status | Priorität |
|---|---|---|---|---|
| neues-dokument | Neues Dokument erstellen | Legt ein leeres Dokument mit Standardformat an, sofort bearbeitbar. | vorhanden | 1 |
| datei-oeffnen | Datei öffnen/importieren | Lädt eine bestehende DOCX-/ODT-Datei per Dateiauswahl-Dialog. | vorhanden | 1 |
| speichern-exportieren | Exportieren/Speichern | Sichert das aktuelle Dokument als Datei-Download im Ursprungsformat. | vorhanden | 1 |
| speichern-unter-format | Zielformat beim Export wählen (Cross-Format) | Erlaubt Export nach DOCX oder ODT unabhängig vom Format der geöffneten Datei. | fehlt | 2 |
| dokument-schliessen | Dokument schließen | Kehrt zur Formatauswahl zurück, mit Rückfrage bei ungespeicherten Änderungen. | vorhanden | 2 |
| drucken | Drucken | Gibt das Dokument über die Browser-Druckfunktion mit passendem Seitenlayout aus. | fehlt | 2 |
| als-pdf-exportieren | Als PDF exportieren | Erzeugt zusätzlich eine PDF-Version des Dokuments. | fehlt | 3 |
| dokumenteigenschaften | Dokumenteigenschaften/Metadaten | Titel, Autor, Stichwörter und weitere Metadaten einsehen und bearbeiten. | teilweise | 2 |
| dokument-schuetzen-passwort | Dokument mit Kennwort schützen | Öffnen oder Bearbeiten nur nach Eingabe eines Kennworts erlauben. | fehlt | 4 |
| als-endgueltig-kennzeichnen | Als abgeschlossen kennzeichnen | Markiert das Dokument als fertig und schreibgeschützt (Mark as Final). | fehlt | 4 |
| dokument-pruefen | Dokument prüfen (Document Inspector) | Findet versteckte Metadaten/Kommentare vor der Weitergabe des Dokuments. | fehlt | 4 |
| versionsverlauf | Versionsverlauf/Autospeichern | Ermöglicht die Wiederherstellung früherer Bearbeitungsstände. | fehlt | 4 |
| neues-fenster | Neues Fenster für mehrere Dokumente | Öffnet mehrere Dokumente gleichzeitig in getrennten Arbeitsbereichen. | fehlt | 4 |

---

## 2. Start (Home)

### 2.1 Zwischenablage

| Slug | Titel | Beschreibung | Status | Priorität |
|---|---|---|---|---|
| ausschneiden | Ausschneiden | Entfernt die Selektion und legt sie in die Zwischenablage. | vorhanden | 1 |
| kopieren | Kopieren | Kopiert die Selektion in die Zwischenablage. | vorhanden | 1 |
| einfuegen | Einfügen | Fügt den Inhalt der Zwischenablage an der Cursor-Position ein. | vorhanden | 1 |
| einfuegen-unformatiert | Einfügen ohne Formatierung | Reduziert eingefügten Inhalt auf reinen Klartext. | fehlt | 2 |
| format-uebertragen | Formatierung übertragen (Pinsel) | Überträgt das Zeichenformat einer Textstelle auf eine andere Selektion. | fehlt | 2 |

### 2.2 Zeichenformatierung

| Slug | Titel | Beschreibung | Status | Priorität |
|---|---|---|---|---|
| fett | Fett | Schaltet Fettdruck auf Selektion bzw. an der Schreibmarke um. | vorhanden | 1 |
| kursiv | Kursiv | Schaltet Kursivschrift auf Selektion bzw. an der Schreibmarke um. | vorhanden | 1 |
| unterstrichen-einfach | Unterstrichen (einfach) | Schaltet eine einfache Unterstreichung um. | vorhanden | 1 |
| unterstrichen-doppelt | Unterstrichen (doppelt) | Stellt Text mit einer doppelten Unterstreichungslinie dar. | fehlt | 3 |
| unterstrichen-nur-woerter | Unterstrichen (nur Wörter) | Unterstreicht nur Wörter, Leerzeichen dazwischen bleiben frei. | fehlt | 4 |
| durchgestrichen | Durchgestrichen | Schaltet eine einfache Durchstreichung um. | vorhanden | 1 |
| durchgestrichen-doppelt | Doppelt durchgestrichen | Stellt Text mit doppelter Durchstreichungslinie dar. | fehlt | 4 |
| hochgestellt | Hochgestellt (Superscript) | Stellt die Selektion hochgestellt dar. | fehlt | 2 |
| tiefgestellt | Tiefgestellt (Subscript) | Stellt die Selektion tiefgestellt dar. | fehlt | 2 |
| schriftart-waehlen | Schriftart wählen | Wählt die Schriftfamilie aus einer Liste installierter/eingebetteter Schriften. | fehlt | 1 |
| schriftgroesse-waehlen | Schriftgröße wählen | Legt die Punktgröße numerisch oder per Auswahlliste fest. | fehlt | 1 |
| schrift-vergroessern | Schrift vergrößern | Vergrößert die Schriftgröße der Selektion schrittweise per Klick. | fehlt | 3 |
| schrift-verkleinern | Schrift verkleinern | Verkleinert die Schriftgröße der Selektion schrittweise per Klick. | fehlt | 3 |
| schriftfarbe | Schriftfarbe | Freie Farbwahl für die Zeichenfarbe der Selektion. | vorhanden | 1 |
| textmarker-farbe | Texthervorhebungsfarbe | Freie Farbwahl für die Hintergrund-Hervorhebung der Selektion. | vorhanden | 1 |
| gross-kleinschreibung | Groß-/Kleinschreibung wechseln | Wechselt zwischen GROSS, klein, Jedes Wort Groß und Satzanfang. | fehlt | 3 |
| zeichenabstand | Zeichenabstand | Vergrößert oder verkleinert die Laufweite zwischen Buchstaben. | fehlt | 4 |
| texteffekte | Texteffekte (Schatten/Kontur/Glühen) | Dekorative Effekte auf Zeichen anwenden. | fehlt | 4 |
| formatierung-loeschen | Formatierung löschen | Setzt die Selektion auf das Basis-Zeichenformat zurück. | fehlt | 2 |

### 2.3 Absatzformatierung

| Slug | Titel | Beschreibung | Status | Priorität |
|---|---|---|---|---|
| ausrichtung-links | Ausrichtung links | Richtet den Absatz linksbündig aus. | vorhanden | 1 |
| ausrichtung-zentriert | Ausrichtung zentriert | Richtet den Absatz zentriert aus. | vorhanden | 1 |
| ausrichtung-rechts | Ausrichtung rechts | Richtet den Absatz rechtsbündig aus. | vorhanden | 1 |
| ausrichtung-blocksatz | Ausrichtung Blocksatz | Richtet den Absatz im Blocksatz aus. | vorhanden | 1 |
| zeilenabstand | Zeilenabstand | Legt einfachen, 1,5-fachen, doppelten oder genauen Zeilenabstand fest. | fehlt | 2 |
| absatzabstand-vor | Abstand vor Absatz | Definiert Leerraum oberhalb des Absatzes. | fehlt | 2 |
| absatzabstand-nach | Abstand nach Absatz | Definiert Leerraum unterhalb des Absatzes. | fehlt | 2 |
| einzug-links | Einzug links | Rückt den Absatz vom linken Rand ein. | fehlt | 2 |
| einzug-rechts | Einzug rechts | Rückt den Absatz vom rechten Rand ein. | fehlt | 3 |
| erstzeileneinzug | Erstzeileneinzug | Rückt nur die erste Zeile eines Absatzes ein. | fehlt | 3 |
| haengender-einzug | Hängender Einzug | Rückt alle Zeilen außer der ersten ein. | fehlt | 3 |
| einzugsebene-erhoehen | Einzugsebene erhöhen | Rückt den Absatz/Listenpunkt eine Stufe weiter ein. | fehlt | 2 |
| einzugsebene-verringern | Einzugsebene verringern | Rückt den Absatz/Listenpunkt eine Stufe aus. | fehlt | 2 |
| tabstopps | Benutzerdefinierte Tabstopps | Legt eigene Tab-Positionen und -Arten (links/zentriert/rechts/dezimal) fest. | fehlt | 3 |
| formatierungszeichen-anzeigen | Formatierungszeichen anzeigen (¶) | Blendet Absatzmarken, Leerzeichen und Tabs sichtbar ein. | fehlt | 3 |
| absatz-rahmen-schattierung | Absatz-Rahmen & Schattierung | Rahmenlinien und Hintergrundfarbe um einen Absatz. | fehlt | 4 |
| absaetze-sortieren | Absätze/Listen sortieren | Sortiert ausgewählte Zeilen alphabetisch oder numerisch. | fehlt | 4 |

### 2.4 Formatvorlagen (Styles)

| Slug | Titel | Beschreibung | Status | Priorität |
|---|---|---|---|---|
| absatzformat-dropdown | Absatzformat-Dropdown (Standard/Überschrift 1–6) | Weist dem Absatz eine Formatvorlage aus einer Liste zu. | vorhanden | 1 |
| formatvorlagen-katalog | Formatvorlagen-Katalog (Schnellformate) | Galerie mit vorschaubaren Absatz-/Zeichen-Formatvorlagen. | fehlt | 3 |
| formatvorlage-erstellen | Formatvorlage erstellen/ändern | Definiert eine eigene, benannte Formatvorlage. | fehlt | 4 |
| zeichenformatvorlage | Zeichenformatvorlage | Wiederverwendbares Zeichenformat unabhängig vom Absatzformat. | fehlt | 4 |
| formatvorlagen-satz | Dokumentdesign/Formatvorlagen-Satz wechseln | Wechselt einen kompletten Stil-Satz (Farben/Schriften) auf einen Klick. | fehlt | 4 |

### 2.5 Bearbeiten (Suchen & Navigieren)

| Slug | Titel | Beschreibung | Status | Priorität |
|---|---|---|---|---|
| suchen | Suchen | Findet Textstellen im Dokument und hebt sie hervor. | fehlt | 1 |
| suchen-ersetzen | Suchen & Ersetzen | Ersetzt Fundstellen einzeln oder auf einmal im ganzen Dokument. | fehlt | 2 |
| suchen-ersetzen-erweitert | Erweiterte Suche (Regex/Formatierung) | Sucht nach regulären Ausdrücken oder nach Formatierungsmerkmalen. | fehlt | 4 |
| alles-auswaehlen | Alles auswählen | Markiert den gesamten Dokumentinhalt. | vorhanden | 1 |
| gehe-zu | Gehe zu (Seite/Abschnitt/Zeile) | Springt direkt zu einer bestimmten Dokumentstelle. | fehlt | 3 |

### 2.6 Listen

| Slug | Titel | Beschreibung | Status | Priorität |
|---|---|---|---|---|
| aufzaehlungsliste | Aufzählungsliste (Bullet) | Wandelt Absätze in eine unsortierte Liste um. | vorhanden | 1 |
| nummerierte-liste | Nummerierte Liste | Wandelt Absätze in eine fortlaufend nummerierte Liste um. | vorhanden | 1 |
| liste-aufheben | Liste aufheben | Wandelt Listenpunkte zurück in normale Absätze, Text bleibt erhalten. | vorhanden | 1 |
| mehrstufige-liste | Mehrstufige Liste | Verschachtelte Gliederungsebenen mit unterschiedlichem Symbol/Nummernformat je Ebene. | fehlt | 2 |
| liste-einruecken-tab | Listenebene per Tab ändern | Tab/Umschalt+Tab verschiebt einen Listenpunkt eine Ebene tiefer/höher. | fehlt | 1 |
| nummerierung-fortsetzen-neustarten | Nummerierung fortsetzen/neu starten | Setzt die Zählung einer neuen Liste an eine vorherige an oder beginnt neu bei 1. | teilweise | 3 |
| eigene-aufzaehlungszeichen | Eigenes Aufzählungszeichen definieren | Beliebiges Symbol oder Bild als Listenzeichen wählen. | fehlt | 4 |
| eigenes-nummernformat | Eigenes Nummernformat definieren | Legt Formate wie „1.“, „a)“ oder römische Zahlen frei fest. | fehlt | 4 |

---

## 3. Einfügen (Insert)

### 3.1 Seiten & Umbrüche

| Slug | Titel | Beschreibung | Status | Priorität |
|---|---|---|---|---|
| deckblatt-einfuegen | Deckblatt einfügen | Stellt dem Dokument eine vorgefertigte Titelseite voran. | fehlt | 4 |
| leere-seite-einfuegen | Leere Seite einfügen | Schiebt eine leere Seite an der Cursor-Position ein. | fehlt | 3 |
| seitenumbruch | Seitenumbruch einfügen | Erzwingt manuell den Beginn einer neuen Seite. | fehlt | 1 |
| abschnittsumbruch | Abschnittsumbruch (nächste Seite/fortlaufend) | Beginnt einen neuen Abschnitt mit eigenem Seitenlayout. | fehlt | 3 |
| spaltenumbruch | Spaltenumbruch | Erzwingt den Sprung in die nächste Spalte bei mehrspaltigem Layout. | fehlt | 4 |

### 3.2 Tabellen

| Slug | Titel | Beschreibung | Status | Priorität |
|---|---|---|---|---|
| tabelle-einfuegen | Tabelle einfügen | Fügt eine Tabelle mit wählbarer Zeilen-/Spaltenzahl ein. | teilweise | 1 |
| tabelle-zeichnen | Tabelle zeichnen (freihändig) | Erstellt ein Tabellenraster durch Ziehen mit der Maus. | fehlt | 4 |
| zeile-einfuegen | Zeile einfügen (oberhalb/unterhalb) | Fügt eine neue Tabellenzeile an gewählter Position ein. | fehlt | 1 |
| zeile-loeschen | Zeile löschen | Entfernt die markierte Tabellenzeile. | fehlt | 1 |
| spalte-einfuegen | Spalte einfügen (links/rechts) | Fügt eine neue Tabellenspalte an gewählter Position ein. | fehlt | 1 |
| spalte-loeschen | Spalte löschen | Entfernt die markierte Tabellenspalte. | fehlt | 1 |
| zellen-verbinden | Zellen verbinden | Führt mehrere markierte Zellen zu einer zusammen. | fehlt | 1 |
| zellen-teilen | Zellen teilen | Teilt eine Zelle in mehrere Zeilen/Spalten auf. | fehlt | 2 |
| tabelle-loeschen | Tabelle löschen | Entfernt die komplette Tabelle inklusive Inhalt. | fehlt | 1 |
| tabelle-eigenschaften | Tabelleneigenschaften (Rahmen/Schattierung) | Stellt Rahmenlinien, Zellhintergrund und Zellabstände ein. | fehlt | 2 |
| tabellenformatvorlagen | Tabellenformatvorlagen-Galerie | Vorgefertigte Farb-/Rahmen-Designs für Tabellen. | fehlt | 3 |
| kopfzeile-wiederholen | Kopfzeile auf Folgeseiten wiederholen | Wiederholt die erste Tabellenzeile automatisch auf jeder Folgeseite. | fehlt | 2 |
| text-in-tabelle-umwandeln | Text in Tabelle umwandeln | Überführt getrennten Text automatisch in eine Tabellenstruktur. | fehlt | 3 |
| tabelle-in-text-umwandeln | Tabelle in Text umwandeln | Löst eine Tabelle in getrennten Fließtext auf. | fehlt | 3 |
| tabellenformel | Formel in Tabellenzelle | Einfache Berechnungen (z. B. =SUMME) innerhalb von Zellen. | fehlt | 4 |
| tabelle-sortieren | Tabelle sortieren | Sortiert Zeilen nach dem Inhalt einer gewählten Spalte. | fehlt | 3 |
| tabelle-autoanpassen | Tabelle automatisch anpassen | Passt Spaltenbreiten an Inhalt, Fenster oder feste Breite an. | fehlt | 3 |

### 3.3 Bilder & Grafiken

| Slug | Titel | Beschreibung | Status | Priorität |
|---|---|---|---|---|
| bild-einfuegen | Bild aus Datei einfügen | Fügt eine Bilddatei über Dateiauswahl an der Cursor-Position ein. | vorhanden | 1 |
| bild-online | Onlinebilder/Stockbilder einfügen | Bildsuche und -einfügung direkt aus dem Editor heraus. | fehlt | 4 |
| bild-alt-text | Alternativtext bearbeiten | Beschreibungstext für Barrierefreiheit manuell setzen/ändern. | teilweise | 2 |
| bild-groesse-aendern | Bildgröße ändern | Passt Höhe/Breite per Eingabefeld oder Ziehpunkte an. | fehlt | 1 |
| bild-zuschneiden | Bild zuschneiden | Reduziert den sichtbaren Bildausschnitt. | fehlt | 3 |
| bild-korrekturen | Bildkorrekturen (Helligkeit/Kontrast) | Passt Farbwerte des eingefügten Bildes an. | fehlt | 4 |
| bild-kuenstlerische-effekte | Künstlerische Effekte | Wendet Filter wie Skizze oder Graustufen auf ein Bild an. | fehlt | 4 |
| bild-formatvorlagen | Bildformatvorlagen (Rahmen/Schatten) | Vorgefertigter Rahmen/Schatten für eingefügte Bilder. | fehlt | 4 |
| bild-hintergrund-entfernen | Bildhintergrund entfernen | Automatische Freistellung des Bildhintergrunds. | fehlt | 4 |
| bild-komprimieren | Bilder komprimieren | Reduziert die Dateigröße eingebetteter Bilder. | fehlt | 4 |
| textumbruch-bild | Textumbruch um Bild | Steuert, wie Fließtext ein Bild umfließt (quadratisch/passend/transparent/oben&unten/vor/hinter Text). | fehlt | 2 |
| bild-position | Bildposition mit Textumbruch-Voreinstellung | Verankert ein Bild fest auf der Seite statt im Textfluss. | fehlt | 2 |
| bild-loeschen | Bild löschen | Entfernt ein markiertes Bild samt Anker ohne Nebenwirkungen auf den Text. | vorhanden | 1 |

### 3.4 Formen, Textfelder, WordArt, SmartArt

| Slug | Titel | Beschreibung | Status | Priorität |
|---|---|---|---|---|
| formen-einfuegen | Form einfügen (Rechteck/Linie/Pfeil etc.) | Platziert eine Vektorform frei auf der Seite. | fehlt | 3 |
| textfeld-einfuegen | Textfeld einfügen | Frei positionierbarer, eigenständiger Textbereich. | fehlt | 2 |
| wordart-einfuegen | WordArt einfügen | Dekorativ vorformatierter Schrift-Text als Grafikobjekt. | fehlt | 4 |
| smartart-einfuegen | SmartArt einfügen | Vorgefertigte Diagramm-/Prozessgrafiken. | fehlt | 4 |
| diagramm-einfuegen | Diagramm/Chart einfügen | Bettet ein datenbasiertes Diagramm ein. | fehlt | 4 |
| symbolgrafik-icons | Icons einfügen | Fügt Vektor-Icons aus einer Bibliothek ein. | fehlt | 4 |
| bildschirmfoto-einfuegen | Bildschirmfoto/Screenshot einfügen | Bettet einen Screenshot eines anderen Fensters ein. | fehlt | 4 |
| formen-anordnen | Objekte anordnen | Ordnet mehrere eingefügte Objekte zueinander an (Ebene, Gruppieren, Ausrichten). | fehlt | 4 |

### 3.5 Links

| Slug | Titel | Beschreibung | Status | Priorität |
|---|---|---|---|---|
| hyperlink-einfuegen | Hyperlink einfügen | Verknüpft markierten Text mit einer URL. | fehlt | 1 |
| hyperlink-bearbeiten | Hyperlink bearbeiten | Ändert die Ziel-URL eines bestehenden Links. | fehlt | 2 |
| hyperlink-entfernen | Hyperlink entfernen | Löst die Verknüpfung, der Text bleibt erhalten. | fehlt | 2 |
| textmarke-einfuegen | Textmarke (Bookmark) einfügen | Setzt einen benannten Sprungpunkt im Dokument. | fehlt | 3 |
| querverweis-einfuegen | Querverweis einfügen | Fügt einen aktualisierbaren Verweis auf Überschrift/Abbildung/Textmarke ein. | fehlt | 3 |

### 3.6 Kommentare

| Slug | Titel | Beschreibung | Status | Priorität |
|---|---|---|---|---|
| kommentar-einfuegen | Kommentar einfügen | Heftet eine Notiz an eine markierte Textstelle an. | fehlt | 2 |

### 3.7 Kopf- & Fußzeile

| Slug | Titel | Beschreibung | Status | Priorität |
|---|---|---|---|---|
| kopfzeile-bearbeiten | Kopfzeile bearbeiten | Aktiviert und befüllt einen eigenen editierbaren Bereich am oberen Seitenrand. | fehlt | 1 |
| fusszeile-bearbeiten | Fußzeile bearbeiten | Aktiviert und befüllt einen eigenen editierbaren Bereich am unteren Seitenrand. | fehlt | 1 |
| seitenzahl-einfuegen | Seitenzahl einfügen | Fügt ein automatisch fortlaufendes Seitenzahl-Feld ein. | fehlt | 1 |
| erste-seite-anders | Erste Seite anders | Eigene Kopf-/Fußzeile ausschließlich für die erste Seite. | fehlt | 3 |
| gerade-ungerade-anders | Gerade/ungerade Seiten anders | Unterschiedliche Kopf-/Fußzeile je nach Seitenparität. | fehlt | 4 |
| mit-vorheriger-verknuepfen | Mit vorheriger verknüpfen | Übernimmt oder löst die Kopf-/Fußzeile eines Abschnitts von der vorherigen. | fehlt | 4 |
| seitenzahl-format | Seitenzahlformat/Startwert | Legt Nummerierungsformat (1,2,3 / i,ii,iii) und Startzahl fest. | fehlt | 3 |

### 3.8 Text-Sonderelemente

| Slug | Titel | Beschreibung | Status | Priorität |
|---|---|---|---|---|
| datum-uhrzeit-feld | Datum-/Uhrzeitfeld einfügen | Fügt das aktuelle Datum als aktualisierbares Feld ein. | fehlt | 3 |
| objekt-einbetten | Objekt einbetten (OLE) | Bettet eine Datei eines anderen Programms in das Dokument ein. | fehlt | 4 |
| drop-cap | Initiale/Drop Cap | Stellt den ersten Buchstaben eines Absatzes groß über mehrere Zeilen dar. | fehlt | 4 |
| signaturzeile | Signaturzeile | Fügt einen Platzhalter für eine digitale/handschriftliche Unterschrift ein. | fehlt | 4 |
| schnellbausteine | Schnellbausteine/AutoText | Fügt wiederverwendbare Textblöcke per Kürzel ein. | fehlt | 4 |

### 3.9 Symbole & Gleichungen

| Slug | Titel | Beschreibung | Status | Priorität |
|---|---|---|---|---|
| sonderzeichen-einfuegen | Sonderzeichen/Symbol einfügen | Fügt Zeichen außerhalb der Standardtastatur ein. | fehlt | 3 |
| gleichung-einfuegen | Gleichung/Formel einfügen | Fügt eine mathematische Formel über einen Formeleditor ein. | fehlt | 4 |

### 3.10 Sonderzeichen & Umbrüche im Fließtext

| Slug | Titel | Beschreibung | Status | Priorität |
|---|---|---|---|---|
| geschuetztes-leerzeichen | Geschütztes Leerzeichen | Leerzeichen, das keinen Zeilenumbruch an dieser Stelle erlaubt. | fehlt | 4 |
| zeilenumbruch-manuell | Manueller Zeilenumbruch (Umschalt+Enter) | Erzeugt eine neue Zeile innerhalb desselben Absatzes statt eines neuen Absatzes. | teilweise | 1 |
| tabulator-zeichen | Tabulatorzeichen im Fließtext | Tab-Sprung innerhalb eines Absatzes außerhalb von Listen. | teilweise | 3 |

---

## 4. Layout (Seite einrichten)

| Slug | Titel | Beschreibung | Status | Priorität |
|---|---|---|---|---|
| seitenraender | Seitenränder einstellen | Konfiguriert Ober-/Unter-/links-/rechts-Rand der Seite. | fehlt | 2 |
| seitenausrichtung | Seitenausrichtung (Hoch-/Querformat) | Wechselt zwischen Hoch- und Querformat. | fehlt | 2 |
| papierformat | Papierformat wählen | Wählt die Seitengröße (z. B. A4, Letter, A3). | fehlt | 2 |
| spalten-layout | Mehrspaltiges Layout | Lässt Text in zwei oder mehr Zeitungsspalten fließen. | fehlt | 3 |
| zeilennummerierung | Zeilennummerierung | Blendet fortlaufende Zeilennummern am Seitenrand ein. | fehlt | 4 |
| silbentrennung | Silbentrennung | Automatische oder manuelle Worttrennung am Zeilenende. | fehlt | 3 |
| wasserzeichen | Wasserzeichen | Blendet halbtransparenten Text/Grafik hinter dem Seiteninhalt ein. | fehlt | 4 |
| seitenfarbe | Seitenfarbe | Setzt eine Hintergrundfarbe für die gesamte Seite. | fehlt | 4 |
| seitenrahmen | Seitenrahmen | Dekorativer Rahmen um jede Seite. | fehlt | 4 |
| vertikale-ausrichtung-seite | Vertikale Ausrichtung auf der Seite | Richtet Inhalt einer kurzen letzten Seite oben/zentriert/verteilt aus. | fehlt | 4 |
| abschnitts-layout | Abschnittsbezogenes Seitenlayout | Erlaubt unterschiedliche Ränder/Ausrichtung je Abschnitt im selben Dokument. | fehlt | 3 |

---

## 5. Referenzen (References)

### 5.1 Verzeichnisse

| Slug | Titel | Beschreibung | Status | Priorität |
|---|---|---|---|---|
| inhaltsverzeichnis-einfuegen | Inhaltsverzeichnis einfügen | Generiert automatisch ein Verzeichnis aus vorhandenen Überschriften. | fehlt | 1 |
| inhaltsverzeichnis-aktualisieren | Inhaltsverzeichnis aktualisieren | Berechnet das Verzeichnis nach Überschriften-Änderungen neu. | fehlt | 1 |
| abbildungsverzeichnis | Abbildungsverzeichnis | Verzeichnis aller Bild-/Tabellenbeschriftungen. | fehlt | 3 |
| index-eintrag-markieren | Indexeintrag markieren | Kennzeichnet einen Begriff für das alphabetische Stichwortverzeichnis. | fehlt | 4 |
| index-einfuegen | Stichwortverzeichnis (Index) einfügen | Fügt eine alphabetische Liste markierter Begriffe mit Seitenzahlen ein. | fehlt | 4 |

### 5.2 Fußnoten & Endnoten

| Slug | Titel | Beschreibung | Status | Priorität |
|---|---|---|---|---|
| fussnote-einfuegen | Fußnote einfügen | Fügt eine Referenzmarke im Text mit Erläuterung am Seitenende ein. | fehlt | 1 |
| endnote-einfuegen | Endnote einfügen | Fügt eine Erläuterung am Dokumentende statt am Seitenende ein. | fehlt | 2 |
| fussnote-navigation | Zur nächsten/vorherigen Fußnote springen | Schnellnavigation zwischen Fußnoten im Dokument. | fehlt | 4 |
| fussnote-zu-endnote | Fußnoten in Endnoten umwandeln | Konvertiert bestehende Fußnoten global zu Endnoten. | fehlt | 4 |

### 5.3 Zitate & Beschriftungen

| Slug | Titel | Beschreibung | Status | Priorität |
|---|---|---|---|---|
| zitat-einfuegen | Zitat einfügen | Fügt einen Quellenverweis im Text aus einer verwalteten Quellenliste ein. | fehlt | 4 |
| quellen-verwalten | Quellen verwalten | Pflegt eine Liste zitierfähiger Quellen. | fehlt | 4 |
| literaturverzeichnis-einfuegen | Literaturverzeichnis einfügen | Generiert automatisch eine Bibliographie aus verwendeten Zitaten. | fehlt | 4 |
| beschriftung-einfuegen | Beschriftung einfügen (Abbildung/Tabelle) | Fügt eine nummerierte Bildunterschrift/einen Tabellentitel an. | fehlt | 3 |
| querverweis-referenzen | Querverweis auf Beschriftung/Fußnote | Fügt einen aktualisierbaren Verweis auf ein anderes Dokumentelement ein. | fehlt | 4 |

---

## 6. Sendungen (Seriendruck)

| Slug | Titel | Beschreibung | Status | Priorität |
|---|---|---|---|---|
| seriendruck-empfaenger-waehlen | Seriendruck: Empfänger auswählen | Bindet eine Datenquelle (z. B. CSV) für den Serienbrief an. | fehlt | 4 |
| seriendruck-feld-einfuegen | Seriendruck: Feld einfügen | Setzt einen Platzhalter aus der Datenquelle in den Text ein. | fehlt | 4 |
| seriendruck-vorschau-abschliessen | Seriendruck: Vorschau & Abschluss | Prüft die Zusammenführung und gibt sie als Einzeldokumente/Druck/E-Mail aus. | fehlt | 4 |

---

## 7. Überprüfen (Review)

### 7.1 Sprachprüfung

| Slug | Titel | Beschreibung | Status | Priorität |
|---|---|---|---|---|
| rechtschreibpruefung | Rechtschreibprüfung | Erkennt Tippfehler automatisch und schlägt Korrekturen vor. | fehlt | 2 |
| grammatikpruefung | Grammatikprüfung | Erkennt grammatikalische Fehler und schlägt Korrekturen vor. | fehlt | 3 |
| synonymwoerterbuch | Synonymwörterbuch (Thesaurus) | Schlägt alternative Wörter für einen markierten Begriff vor. | fehlt | 4 |
| wortanzahl | Wörter zählen | Zeigt Anzahl Wörter/Zeichen/Absätze/Seiten des Dokuments an. | fehlt | 2 |
| sprache-festlegen | Sprache für Korrekturhilfen festlegen | Legt die Prüfsprache für markierten Text bzw. das Dokument fest. | fehlt | 4 |

### 7.2 Kommentare – Verwaltung

| Slug | Titel | Beschreibung | Status | Priorität |
|---|---|---|---|---|
| kommentar-beantworten | Kommentar beantworten | Erstellt einen Antwort-Thread zu einem bestehenden Kommentar. | fehlt | 3 |
| kommentar-aufloesen | Kommentar auflösen/erledigt markieren | Kennzeichnet einen Kommentar als bearbeitet, ohne ihn zu löschen. | fehlt | 3 |
| kommentar-loeschen | Kommentar löschen | Entfernt einen einzelnen Kommentar. | fehlt | 2 |
| kommentar-navigation | Zum nächsten/vorherigen Kommentar springen | Wechselt schnell zwischen Kommentaren im Dokument. | fehlt | 3 |

### 7.3 Änderungsverfolgung (Track Changes)

| Slug | Titel | Beschreibung | Status | Priorität |
|---|---|---|---|---|
| aenderungen-verfolgen-umschalten | Änderungsverfolgung ein-/ausschalten | Aktiviert/deaktiviert die Aufzeichnung von Einfügungen und Löschungen. | fehlt | 2 |
| aenderung-anzeigen-markup | Markup-Anzeige steuern | Legt fest, welche Änderungsarten (Einfügung/Löschung/Formatierung/Kommentar) sichtbar markiert werden. | fehlt | 4 |
| aenderung-annehmen | Änderung annehmen | Übernimmt eine einzelne nachverfolgte Änderung. | fehlt | 2 |
| aenderung-ablehnen | Änderung ablehnen | Verwirft eine einzelne nachverfolgte Änderung und stellt den Ursprungszustand wieder her. | fehlt | 2 |
| alle-aenderungen-annehmen | Alle Änderungen annehmen | Übernimmt sämtliche nachverfolgten Änderungen auf einmal. | fehlt | 3 |
| alle-aenderungen-ablehnen | Alle Änderungen ablehnen | Verwirft sämtliche nachverfolgten Änderungen auf einmal. | fehlt | 3 |
| ueberarbeitungsbereich | Überarbeitungsbereich (Reviewing Pane) | Listet alle Änderungen und Kommentare in einer Seitenleiste auf. | fehlt | 4 |

### 7.4 Vergleichen & Schützen

| Slug | Titel | Beschreibung | Status | Priorität |
|---|---|---|---|---|
| dokumente-vergleichen | Dokumente vergleichen | Stellt zwei Dokumentversionen gegenüber und markiert Unterschiede. | fehlt | 4 |
| dokumente-kombinieren | Dokumente kombinieren | Führt Änderungen mehrerer Kopien in ein Dokument zusammen. | fehlt | 4 |
| bearbeitung-einschraenken | Bearbeitung einschränken | Erlaubt anderen Nutzer:innen nur bestimmte Änderungsarten/Bereiche. | fehlt | 4 |

---

## 8. Ansicht (View)

### 8.1 Dokumentenansichten

| Slug | Titel | Beschreibung | Status | Priorität |
|---|---|---|---|---|
| seitenlayout-ansicht | Seitenlayoutansicht (Druckansicht) | Standardansicht mit sichtbaren Einzelseiten. | vorhanden | 1 |
| weblayout-ansicht | Weblayoutansicht | Fortlaufende Ansicht ohne Seitengrenzen. | fehlt | 4 |
| gliederungsansicht | Gliederungsansicht (Outline) | Zeigt das Dokument nach Überschriftenebenen strukturiert an und erlaubt Umordnen. | fehlt | 3 |
| entwurfsansicht | Entwurfsansicht (Draft) | Vereinfachte Ansicht ohne Kopf-/Fußzeilen und Seitenränder. | fehlt | 4 |
| lesemodus | Lesemodus (Vollbild) | Reine Lese-/Vollbildansicht ohne Bearbeitungswerkzeuge. | fehlt | 4 |

### 8.2 Anzeigen & Navigation

| Slug | Titel | Beschreibung | Status | Priorität |
|---|---|---|---|---|
| lineal-anzeigen | Lineal anzeigen | Blendet horizontales/vertikales Lineal mit Rändern/Tabstopps ein. | fehlt | 3 |
| gitternetzlinien-anzeigen | Gitternetzlinien anzeigen | Blendet eine Ausrichtungshilfe für Objekte ein. | fehlt | 4 |
| formatierungszeichen-toggle | Formatierungszeichen ein-/ausblenden | Schaltet die globale Sichtbarkeit nicht druckender Zeichen um. | fehlt | 3 |
| navigationsbereich | Navigationsbereich (Überschriften/Seiten) | Seitenleiste zum schnellen Springen zwischen Überschriften/Seiten. | fehlt | 3 |

### 8.3 Zoom & Fenster

| Slug | Titel | Beschreibung | Status | Priorität |
|---|---|---|---|---|
| zoom-stufe | Zoomstufe einstellen | Ändert die Anzeigegröße des Dokuments frei oder prozentual. | fehlt | 2 |
| zoom-seitenbreite | Zoom auf Seitenbreite | Passt die Ansicht automatisch an die Fensterbreite an. | fehlt | 3 |
| mehrere-seiten-anzeigen | Mehrere Seiten nebeneinander anzeigen | Zeigt zwei oder mehr Seiten gleichzeitig im Ansichtsfenster. | fehlt | 4 |
| fenster-teilen | Fenster teilen | Teilt das Dokument in zwei unabhängig scrollbare Bereiche. | fehlt | 4 |

---

## 9. Barrierefreiheit (Accessibility)

| Slug | Titel | Beschreibung | Status | Priorität |
|---|---|---|---|---|
| barrierefreiheit-pruefung | Barrierefreiheit prüfen (Accessibility Checker) | Prüft das Dokument automatisiert auf Barrieren wie fehlenden Alt-Text. | fehlt | 4 |
| lesereihenfolge | Lesereihenfolge festlegen | Definiert die Reihenfolge, in der Screenreader Objekte einer Seite vorlesen. | fehlt | 4 |
| farbkontrast-pruefen | Farbkontrast prüfen | Prüft Text-/Hintergrundfarbkombinationen auf ausreichenden Kontrast. | fehlt | 4 |

*Hinweis: Alternativtext für Bilder (`bild-alt-text`) ist der zentrale Barrierefreiheits-Baustein und wird bereits unter „3.3 Bilder & Grafiken“ geführt (Status: teilweise).*

---

## 10. Makros (bewusst ausgeschlossen)

| Slug | Titel | Beschreibung | Status | Priorität |
|---|---|---|---|---|
| makros | Makros/VBA-Automatisierung | Programmierbare Automatisierung von Dokumentabläufen. | fehlt | 4 |

**Hinweis:** Makros/Skripting sind laut Aufgabenstellung explizit **außerhalb des Projektumfangs**
und werden nicht umgesetzt. Der Eintrag bleibt nur als vollständigkeitshalber dokumentierte
Auslassung stehen, nicht als offene Aufgabe.

---

## Zusammenfassung

**Gesamtzahl erfasster Funktionen: 202**

### Nach Status

| Status | Anzahl |
|---|---|
| vorhanden | 25 |
| teilweise | 6 |
| fehlt | 171 |
| **Summe** | **202** |

### Nach Priorität

| Priorität | Anzahl |
|---|---|
| 1 – Essenziell/fundamental | 45 |
| 2 – Wichtig | 38 |
| 3 – Nice-to-have/fortgeschritten | 45 |
| 4 – Randfall/geringer Wert/grenzwertig | 74 |
| **Summe** | **202** |

### Einordnung

- Von den **45 essenziellen (Priorität 1)** Funktionen sind aktuell **24 vorhanden**,
  **2 teilweise** und **19 fehlen** komplett — das größte Einzeldefizit liegt bei
  Tabellen-Bearbeitung (Zeile/Spalte/Zellen), Kopf-/Fußzeile, Inhaltsverzeichnis,
  Fußnoten, Hyperlinks, Suchen sowie Schriftart-/Schriftgrößen-Auswahl.
- Von den **25 „vorhanden“**-Funktionen insgesamt entfällt der überwiegende Teil auf
  Zeichenformatierung (Fett/Kursiv/Unterstrichen/Durchgestrichen/Farben),
  Absatzausrichtung, einfache Listen, den Datei-Lifecycle (Neu/Öffnen/Exportieren/Schließen)
  sowie Basis-Textbedienung (Zwischenablage, Alles auswählen).
- Die **6 „teilweise“**-Fälle markieren durchgehend Stellen, an denen ein Datenmodell-Attribut
  existiert (bzw. ein UI-Button mit stark eingeschränkter Funktion), aber keine vollwertige
  Bedienung: Tabelle einfügen (feste 2×2-Größe), Bild-Alt-Text (nur aus Dateiname, nicht editierbar),
  Nummerierung fortsetzen/neu starten, manueller Zeilenumbruch, Tabulatorzeichen,
  Dokumenteigenschaften (Titel nur beim Import/Export, nicht im Editor selbst einstellbar).
