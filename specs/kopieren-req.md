# Anforderungsspezifikation & Testplan: Feature „Kopieren“

Status: Entwurf zur Freigabe — bitte prüfen, bevor weitergearbeitet wird.
Bezug: `E:\docs\specs\FEATURE-BACKLOG.md`, Abschnitt 2.1 „Zwischenablage“, Zeile
`kopieren` — Beschreibung laut Backlog: „Kopiert die Selektion in die Zwischenablage.“
Backlog-Status: **vorhanden**, Priorität **1** (essenziell/fundamental).
Diese Spezifikation setzt den Status auf **nicht vertrauenswürdig — muss vollständig
verifiziert werden** herab, bis jeder Punkt unten mit einem echten, im Browser
ausgeführten Test abgehakt ist. Stil und Tiefe orientieren sich an
`E:\docs\FEATURE-SPEC-DOCX-ODT.md`.

Geltungsbereich: Es geht ausschließlich um **Kopieren** (Selektion → Zwischenablage,
Dokument bleibt unverändert). Ausschneiden (`ausschneiden`) und Einfügen (`einfuegen`)
sind eigene Backlog-Einträge mit eigenem Verifikationsbedarf, werden hier aber an den
Stellen mitbehandelt, an denen ohne sie keine Aussage über Kopieren möglich ist — man
kann den Erfolg eines Kopiervorgangs nur durch anschließendes Einfügen/Auslesen der
Zwischenablage prüfen, und Ausschneiden ist technisch „Kopieren + Löschen“, teilt sich
also denselben Serialisierungspfad.

---

## 0. Ist-Zustand (Bestandsaufnahme im Code)

Geprüft: `src/formats/shared/editor/WordEditor.tsx`, `src/formats/shared/editor/Toolbar.tsx`,
`src/formats/shared/editor/commands.ts`, `src/index.css`, `tests/e2e/*.spec.ts`.

- **Kein einziger projekteigener Code-Pfad für Kopieren existiert.** Es gibt keinen
  `copy`-Event-Handler, kein `handleDOMEvents.copy`, kein `transformCopied`, keinen
  Toolbar-Button, keinen Eintrag in der Tastatur-Keymap (`Mod-c` ist nirgends gebunden)
  und kein eigenes Kontextmenü. Die Funktion „existiert“ ausschließlich, weil
  ProseMirrors `EditorView` intern selbst einen `copy`/`cut`-Handler auf die
  Editor-DOM registriert (Serialisierung der Selektion über das Schema in HTML +
  Klartext) und weil der Browser auf einer `contenteditable`-Fläche das native
  Kontextmenü „Kopieren“ sowie Strg+C/Cmd+C ausliefert.
- Diese Bibliotheks-Voreinstellung wurde **nie projektspezifisch verifiziert**: keine
  Unit-Tests, keine E2E-Tests (`tests/e2e/` enthält nur `docx.spec.ts`, `odt.spec.ts`,
  `lifecycle.spec.ts`, `selection-regression.spec.ts` — keine Datei mit Bezug zu
  Zwischenablage/Copy/Paste/Cut).
- Damit ist unklar, ob Kopieren mit den projektspezifischen Schema-Erweiterungen
  (`textColor`, `highlight`, Tabellen aus `prosemirror-tables`, `image`, Listen,
  `hard_break`) tatsächlich korrekt serialisiert, ob es mit dem bekannten
  Selection-Sync-Bug (siehe `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2 und
  `WordEditor.tsx: reconcileSelectionOnClick`) interferiert, und ob es browserübergreifend
  (Chrome/Firefox/Safari/Edge) konsistent funktioniert.
- Datenschutzprinzip laut `README.md`: kein Server, keine Übertragung von
  Dokumentinhalten irgendwohin, kein `localStorage`/`IndexedDB`. Für Kopieren bedeutet
  das explizit: **niemals** Zwischenablageninhalt protokollieren, an Telemetrie
  weiterreichen oder anderweitig außerhalb der System-Zwischenablage des Nutzergeräts
  persistieren.

**Fazit Bestandsaufnahme:** „vorhanden“ ist im besten Fall „vorhanden durch
Bibliotheks-Default, ungetestet“. Diese Spezifikation definiert, was tatsächlich
geprüft und ggf. nachgerüstet werden muss, bevor der Status auf „verifiziert“
wechseln darf.

---

## 1. Bedienelemente / Auslöser für Kopieren

Jeder der folgenden Wege muss zum **identischen** Ergebnis führen (gleicher
Zwischenablageninhalt, gleiches Verhalten):

| # | Auslöser | Aktueller Stand | Soll |
|---|---|---|---|
| 1 | Tastenkombination Strg+C (Windows/Linux) | ProseMirror-Default, ungetestet | Muss funktionieren, darf durch kein eigenes Keymap-Binding verdeckt/blockiert werden |
| 2 | Tastenkombination Cmd+C (macOS) | ProseMirror-Default, ungetestet | Muss identisch zu Strg+C funktionieren |
| 3 | Rechtsklick-Kontextmenü → „Kopieren“ (natives Browser-Menü) | vorhanden (nativ, kein eigenes Kontextmenü) | Muss erreichbar bleiben, darf nicht durch `event.preventDefault()` auf `contextmenu` unterdrückt werden (aktuell nicht der Fall — muss so bleiben und regressionsgesichert werden) |
| 4 | Toolbar-Button „Kopieren“ | **fehlt komplett** | Nicht zwingend erforderlich für „vorhanden“-Status, aber zu entscheiden: entweder Button ergänzen (Icon-Konvention siehe `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20 — SVG statt Unicode/Emoji) oder in dieser Spezifikation explizit als „bewusst nicht vorhanden, native Wege reichen“ dokumentieren |
| 5 | Menüband-Eintrag Start → Zwischenablage → Kopieren (klassisches Ribbon-Äquivalent) | fehlt (kein Ribbon-Menü im Projekt vorhanden) | Wie Punkt 4 — Entscheidung dokumentieren, kein stiller blinder Fleck |
| 6 | Touch-Gerät: Auswahlgriffe + „Kopieren“ aus dem mobilen Kontextmenü | ungetestet | Muss auf Tablet-Viewport (siehe responsive Playwright-Projekte) funktionieren |
| 7 | Programmatischer Zugriff über `navigator.clipboard` durch die Anwendung selbst | nicht vorhanden, nicht vorgesehen | Bewusst **kein** Soll-Verhalten — Kopieren erfolgt ausschließlich über native Browser-Mechanismen, die App greift nicht eigenständig auf `navigator.clipboard.writeText/write` zu |

**Testfälle**
1. Strg+C bei vorhandener Selektion → Zwischenablage enthält den selektierten Inhalt (verifizierbar durch anschließendes Einfügen an anderer Stelle/in anderes Programm).
2. Cmd+C auf macOS analog (falls CI/Testumgebung macOS abdeckt; sonst als offener Punkt dokumentieren).
3. Rechtsklick → Kontextmenü öffnet sich, „Kopieren“ ist vorhanden und funktioniert.
4. Kontextmenü wird durch keinerlei globalen `contextmenu`-Handler der App unterdrückt (Regressionstest: es gibt aktuell keinen solchen Handler — muss so bleiben, Grep-Check bzw. E2E-Check auf tatsächlich öffnendes Menü).
5. Tablet-Viewport: Text per Touch selektieren, „Kopieren“ aus mobilem Menü verwenden → Inhalt landet in Zwischenablage.
6. Für Punkte 4 und 5 der Tabelle: Entscheidung treffen und in dieser Datei nachtragen (Button ja/nein), keine kommentarlose Lücke.

---

## 2. Gewünschtes Verhalten im Detail

### 2.1 Grundverhalten
- Kopieren verändert das Dokument **nicht** (im Gegensatz zu Ausschneiden). Nach dem
  Kopieren ist Inhalt, Selektion und Cursor-Position unverändert.
- Ist die Selektion leer (nur Cursor, kein markierter Text), passiert beim Auslösen von
  Strg+C **nichts Sichtbares** — insbesondere wird nicht wie in manchen Editoren
  automatisch die aktuelle Zeile/der aktuelle Absatz kopiert. Dieses Verhalten ist
  explizit als Soll festzulegen (Word/LibreOffice-Konvention: leere Selektion → keine
  Aktion) und per Test abzusichern, damit es nicht versehentlich vom Browser-Default
  abweicht.
- Die Zwischenablage wird beim Kopieren mit **mehreren Repräsentationen** befüllt
  (Multi-MIME), analog zum Verhalten, das ProseMirrors Standard-Clipboard-Serialisierung
  vorsieht:
  - `text/html` — die Selektion als HTML-Fragment inkl. Inline-Formatierung, geeignet
    zum Einfügen in andere Rich-Text-Ziele (dieselbe App, Word, LibreOffice Writer,
    Google Docs, E-Mail-Editoren).
  - `text/plain` — reine Textrepräsentation ohne Formatierung, geeignet zum Einfügen in
    Adresszeile, Terminal, Editoren ohne Rich-Text-Unterstützung.
- Kopieren funktioniert für **jede** Selektionsart aus Abschnitt 2 der
  `FEATURE-SPEC-DOCX-ODT.md`: Maus-Ziehauswahl, Doppelklick (Wort), Dreifachklick
  (Absatz), Umschalt+Pfeil, Strg+A (gesamtes Dokument).

### 2.2 Formatierte Inhalte
Kopieren muss für jede der folgenden Formatierungen/Strukturen den Inhalt **inklusive**
seiner Formatierung in die `text/html`-Repräsentation übernehmen (Prüfung gegen die in
`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 3–7 gelisteten Merkmale):

| Inhalt | Erwartung beim Kopieren |
|---|---|
| Fett/Kursiv/Unterstrichen/Durchgestrichen | Entsprechendes HTML-Inline-Tag/-Style in `text/html` |
| Hoch-/Tiefstellung (sobald implementiert) | Entsprechend erhalten |
| Schriftfarbe / Hervorhebungsfarbe | Farbwert exakt erhalten (nicht gerundet/verändert) |
| Schriftart / Schriftgröße (sobald implementiert) | Erhalten |
| Absatzausrichtung, Formatvorlage (Überschrift 1–6) | Blockstruktur bleibt beim Kopieren mehrerer Absätze erkennbar (z. B. `<h2>`/`<p style="text-align:...">`) |
| Listen (Bullet/nummeriert, ein-/mehrstufig) | Kopieren eines Listenausschnitts erhält Listenstruktur (`<ul>`/`<ol>`/`<li>`), nicht nur Klartext mit Aufzählungszeichen |
| Tabellen (ganze Tabelle, einzelne Zellen, Zeilen-/Spaltenausschnitt) | Korrekte `<table>`/`<tr>`/`<td>`-Struktur inkl. `colspan`/`rowspan`, wenn Selektion über verbundene Zellen läuft |
| Bilder | Bild wird als eigenständiges Element in `text/html` mitkopiert (nicht nur als Textplatzhalter) |
| Links (sobald implementiert) | `<a href>` bleibt erhalten |
| Zeilenumbruch (`hard_break`) vs. Absatzumbruch | Bleiben beim Kopieren unterscheidbar (kein Zusammenfallen zu einem einzigen Leerzeichen) |
| Tab-Zeichen im Fließtext | Bleibt als Tab-Zeichen erhalten, nicht als mehrere Leerzeichen |

**Testfälle**
1. Für jede Zeile obiger Tabelle: Inhalt anlegen → markieren → kopieren → an anderer
   Stelle im selben Dokument einfügen → Ergebnis entspricht dem Original (Formatierung,
   Struktur, keine Verluste).
2. Kombination mehrerer Formate im selben Textlauf (fett **und** farbig **und**
   hervorgehoben) kopieren → alle drei bleiben nach dem Einfügen erhalten.
3. Teilselektion, die mitten in einer Formatierung beginnt/endet (z. B. nur die zweite
   Hälfte eines fett gesetzten Wortes) → Formatgrenze bleibt beim Kopieren korrekt,
   kein Verrutschen der Markierung um ein Zeichen.
4. Selektion über mehrere Absätze unterschiedlicher Formatvorlage (Überschrift + Standard
   + Liste) → alle Blocktypen bleiben nach Einfügen unterscheidbar.

### 2.3 Kopieren innerhalb vs. außerhalb der App
- **Intern** (kopieren und einfügen innerhalb desselben Editors/derselben Editor-Instanz):
  verlustfrei für alle oben genannten Merkmale, siehe 2.2.
- **App → externes Ziel** (z. B. Kopieren aus Salamanido, Einfügen in echtes Microsoft
  Word, LibreOffice Writer, eine E-Mail, eine Textarea ohne Rich-Text): mindestens der
  Text bleibt vollständig erhalten; grundlegende Zeichenformatierung (fett/kursiv/
  unterstrichen/Farbe) soll übernommen werden, sofern das Zielprogramm HTML-Einfügung
  unterstützt; ein Klartext-Ziel erhält sinnvollen, unformatierten Text ohne
  HTML-Tag-Reste.
- **Externes Ziel → App** (Kopieren aus Word/LibreOffice/einer Webseite, Einfügen in
  Salamanido): das ist Aufgabe des Backlog-Eintrags `einfuegen`, wird hier nur insoweit
  erwähnt, als der Rundreise-Test in Abschnitt 4 beide Richtungen kombiniert.

**Testfälle**
1. Formatierten Text aus Salamanido kopieren, in eine echte, unabhängige Anwendung
   einfügen (z. B. LibreOffice Writer oder ein `<textarea>`/Editor mit HTML-Einfügen-
   Unterstützung) → Text vollständig lesbar, Grundformatierung sinnvoll übernommen.
2. Denselben Inhalt in ein reines Klartextfeld einfügen → lesbarer Klartext ohne
   sichtbare HTML-Tags/Steuerzeichen.
3. Bild aus dem Editor kopieren, in eine externe Anwendung einfügen, die Bilder aus der
   Zwischenablage akzeptiert → Bild kommt an (mindestens als eingebettetes Bild, wenn
   das Zielprogramm das unterstützt).

---

## 3. Zusammenspiel mit anderen Funktionen (Interferenzen)

- **Selection-Sync-Bug (siehe `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2/20.2):** Kopieren
  darf die interne ProseMirror-Selektion nicht verändern oder invalidieren. Nach einem
  Kopiervorgang muss die Selektion exakt so bestehen bleiben wie vorher — insbesondere
  darf ein nachfolgender Klick zum Neupositionieren weiterhin korrekt funktionieren
  (kein „zweiter“ Bug durch Interaktion Kopieren + Klick-Reconciliation).
- **Toolbar-Aktionen unmittelbar vor/nach Kopieren:** z. B. Fett anwenden → kopieren →
  Ergebnis muss die frisch angewendete Formatierung enthalten (kein Race zwischen
  Zustandsupdate und Clipboard-Serialisierung).
- **Undo/Redo:** Kopieren selbst darf **keinen** Eintrag in der Undo-Historie erzeugen
  (es ist keine Dokumentänderung). Test: Kopieren ausführen, danach Strg+Z → Undo wirkt
  auf die letzte tatsächliche Inhaltsänderung, nicht auf ein „Kopieren rückgängig
  machen“.
- **Tabellen-Zellauswahl (`prosemirror-tables`):** Kopieren einer zellbasierten
  Selektion (mehrere ganze Zellen markiert, nicht nur Text innerhalb einer Zelle) muss
  eine tabellenartige Struktur erzeugen, keinen zusammenhangslosen Text. Da
  Tabellen-Zellinteraktion laut `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6 ein
  Hauptverdachtsfall für den Selection-Sync-Bug ist, hier besonders genau prüfen.
- **Kontextmenü-/Tastatur-Fokus:** Kopieren darf nur wirken, wenn der Fokus tatsächlich
  im Editor liegt; ein Strg+C außerhalb des Editors (z. B. während ein Datei-Upload-
  Dialog offen ist) darf nicht versehentlich Editor-Inhalt in die Zwischenablage legen
  oder zu einer JS-Exception führen.
- **Keine eigene Tastenkombinationsüberschneidung:** Da `Mod-c` in der Keymap
  (`WordEditor.tsx`) aktuell nicht gebunden ist, gibt es keinen Konflikt — das muss so
  bleiben bzw. jede zukünftige Erweiterung der Keymap muss geprüft werden, dass sie
  `Mod-c` nicht versehentlich abfängt (z. B. durch eine zu weit gefasste Bindung).

**Testfälle**
1. Regressionstest analog zum Selection-Sync-Pflichttest aus
   `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2, aber mit Kopieren statt Enter als
   auslösender Folgeaktion: Alles auswählen → Formatierung anwenden → Kopieren →
   Klick zur Neupositionierung → Tippen → beide ursprünglichen Absätze bleiben
   erhalten (kein Überschreiben durch das Kopieren selbst ausgelöst).
2. Kopieren einer Zellauswahl in einer Tabelle → eingefügtes Ergebnis ist eine Tabelle,
   keine flache Textliste.
3. Kopieren, danach Strg+Z → Undo betrifft die letzte inhaltliche Änderung, nicht den
   Kopiervorgang.
4. Kopieren bei fokussiertem Datei-Upload-Dialog (Browser-natives Dialogfenster offen)
   → keine JS-Exception in der Konsole, kein unerwarteter Dokumentzugriff.

---

## 4. Rundreise-Anforderung (DOCX **und** ODT)

Kopieren selbst schreibt keine Datei — die Rundreise-Anforderung bezieht sich darauf,
dass **kopierter/eingefügter Inhalt sich exakt wie regulär erzeugter Inhalt verhält**,
wenn das Dokument anschließend exportiert und wieder importiert wird. Es darf keinen
Unterschied machen, ob ein Absatz getippt oder per Kopieren/Einfügen erzeugt wurde.

Für **beide** Formate (DOCX und ODT) und für **beide** Import-Richtungen (Datei war
ursprünglich DOCX, Datei war ursprünglich ODT) gilt:

1. Datei A (DOCX oder ODT) hochladen → unverändert (ohne jede Kopieraktion) exportieren
   → Re-Import → Inhalt entspricht exakt A. *(Das ist die allgemeine Rundreise-
   Anforderung aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 1.3/19 — muss durch das
   Kopieren-Feature nicht neu bewiesen, aber als Ausgangs-Invariante bestätigt werden:
   das bloße Vorhandensein von Copy-Handlern darf diese Basisrundreise nicht
   beeinträchtigen.)*
2. Datei A hochladen → Inhalt markieren, **innerhalb** des geöffneten Dokuments an
   anderer Stelle einfügen (Kopieren-Nachweis via Einfügen) → als DOCX exportieren →
   Re-Import → sowohl Original- als auch neu eingefügte Kopie sind inhaltlich und
   formatierungstechnisch identisch zur Quelle.
3. Dasselbe für Export als ODT.
4. Cross-Format: Datei A war DOCX, Inhalt kopieren/einfügen, als ODT exportieren,
   reimportieren → Kopie bleibt inhaltlich erhalten (Formatierungsverluste durch
   Cross-Format-Konvertierung sind gemäß `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 19 zu
   dokumentieren, Textverlust ist es nicht).
5. Cross-Format umgekehrt: Datei A war ODT, Ziel-Export DOCX.
6. Kopieren zwischen **zwei geöffneten Dokumenten** (falls die App das gleichzeitig
   erlaubt) bzw. andernfalls: Kopieren aus Dokument A, Dokument schließen, neues
   Dokument B öffnen, einfügen → Inhalt kommt an (sofern die Architektur zwei
   Dokumente/Zwischenablagen zeitlich nacheinander überhaupt vorsieht; falls das
   Schließen eines Dokuments laut `dokument-schliessen` die In-Memory-Zwischenablage
   nicht betrifft — Systemzwischenablage ist browser-/betriebssystemseitig, nicht
   App-seitig — muss dieses Verhalten hier bestätigt und nicht bloß angenommen werden).
7. Für jedes in Abschnitt 2.2 gelistete Merkmal (Formatierung, Tabellen, Bilder, Listen,
   Zeilen-/Absatzumbrüche, Tabs): Kopieren/Einfügen-Rundreise **plus** anschließender
   Datei-Export/Re-Import-Rundreise, kombiniert in einem einzigen Testszenario pro
   Merkmal, damit kein Merkmal nur isoliert (entweder nur Copy/Paste oder nur
   Datei-Rundreise) geprüft wird, sondern die tatsächliche Verkettung beider Vorgänge.

**Testfälle**
1. Für jede Zeile aus Abschnitt 2.2: Kopieren/Einfügen → Export DOCX → Re-Import →
   Merkmal erhalten.
2. Dasselbe je Zeile für ODT.
3. Ein aus mehreren Merkmalen zusammengesetztes Testdokument (Überschrift, formatierter
   Absatz, Liste, Tabelle, Bild) komplett per Strg+A markieren, kopieren, in ein
   **neues, leeres** Dokument einfügen, dieses neue Dokument als DOCX exportieren,
   reimportieren → vollständige Struktur bleibt erhalten.
4. Dasselbe mit Ziel-Export ODT.
5. Doppelte Cross-Format-Rundreise (DOCX → Editor → kopieren/einfügen → ODT-Export →
   Re-Import → erneut kopieren/einfügen → DOCX-Export → Re-Import) → kein kumulativer
   Inhaltsverlust.

---

## 5. Grenzfälle

1. **Leere Selektion:** Strg+C ohne Selektion → keine Aktion, keine Fehlermeldung, keine
   Veränderung der bisherigen Zwischenablage (bestehender Zwischenablageninhalt bleibt
   unangetastet).
2. **Gesamtes Dokument (Strg+A → Kopieren):** auch bei sehr langen Dokumenten (mehrere
   Seiten, viele Bilder) muss der Vorgang in vertretbarer Zeit abschließen, UI darf
   nicht einfrieren.
3. **Selektion, die exakt an einer Formatgrenze beginnt/endet:** keine Verschiebung um
   ein Zeichen, keine doppelte/fehlende Randformatierung.
4. **Selektion über Listen- und Tabellengrenzen hinweg** (z. B. beginnt in einer Liste,
   endet in einer nachfolgenden Tabelle): definiertes, nicht abstürzendes Verhalten;
   mindestens der volle Text bleibt erhalten, auch wenn die resultierende Struktur
   vereinfacht ist — muss dokumentiert werden, welches Verhalten konkret eintritt.
5. **Teilweise markierte Tabellenzelle vs. ganze Zellen markiert:** Word/LibreOffice
   unterscheiden hier (Text-Teilauswahl innerhalb einer Zelle vs. Auswahl kompletter
   Zellen mit Zellrahmen) — für Salamanido festlegen, welches Verhalten Soll ist, und
   testen, dass tatsächlich beides unterschiedlich (und jeweils korrekt) behandelt wird.
6. **Bild allein markiert (ohne umgebenden Text)** kopieren → nur das Bild landet in der
   Zwischenablage, kein umgebender Text wird versehentlich mitgenommen oder verloren.
7. **Sehr großes Bild in der Selektion** (mehrere MB) → Kopieren blockiert die
   Benutzeroberfläche nicht spürbar.
8. **Kopieren unmittelbar nach Undo/Redo:** liefert exakt den aktuell sichtbaren
   Zustand, nicht einen zwischenzeitlich verworfenen.
9. **Kopieren, während IME-Komposition aktiv ist** (z. B. bei ostasiatischen
   Eingabemethoden) → kein Abbruch der Komposition, kein korrupter Zwischenzustand in
   der Zwischenablage.
10. **Zwischenablage-Berechtigung vom Browser verweigert** (z. B. Sicherheitsrichtlinie,
    Iframe-Kontext ohne `clipboard-write`-Permission) → kein unbehandelter JS-Fehler in
    der Konsole, Anwendung bleibt bedienbar; da die App laut README ausschließlich
    client-seitig läuft, ist zu prüfen, ob der Deployment-Kontext (GitHub Pages,
    `https://sanjoesan.github.io/salamanido/`) diese Berechtigung überhaupt jemals
    einschränkt.
11. **Browser-/Plattform-Unterschiede:** Verhalten auf Chrome, Firefox, Safari/WebKit
    und Edge kann bei Rich-Text-Zwischenablage divergieren (unterschiedliche
    MIME-Type-Unterstützung, unterschiedliches HTML-Sanitizing beim Einfügen) — für
    jeden unterstützten Browser mindestens ein Basis-Testdurchlauf.
12. **Wiederholtes, schnelles Kopieren** (z. B. Strg+C mehrfach hintereinander auf
    wechselnde Selektionen) → jede Ausführung überschreibt den vorherigen
    Zwischenablageninhalt korrekt, keine Vermischung/Race Condition.
13. **Rechtsklick-Kontextmenü wird durch kein globales Event-Handling der App verdeckt**
    (aktuell kein globaler `contextmenu`-Handler vorhanden — als Dauerzustand
    regressionssichern, siehe Abschnitt 1, Testfall 4).
14. **Kopieren aus einer Kopf-/Fußzeile, einer Fußnote oder einem Kommentar** (sobald
    diese Features gemäß `FEATURE-SPEC-DOCX-ODT.md` Abschnitte 9/11/12 existieren) muss
    denselben Regeln folgen wie Kopieren aus dem Haupttext — als Nachtrag zu dieser
    Spezifikation vorzumerken, sobald diese Bereiche eine UI erhalten.
15. **Datenschutz:** Zu keinem Zeitpunkt darf der Inhalt der Zwischenablage geloggt,
    an ein Analytics-/Fehlerberichts-Tool gesendet oder in `localStorage`/`IndexedDB`
    gespiegelt werden (siehe README-Datenschutzprinzip) — expliziter Code-Review-Punkt,
    kein reiner Verhaltenstest.

---

## 6. Menü-/Bedienelement-Übersicht (Soll-Zustand je Element)

| # | Element | Aktueller Zustand | Soll |
|---|---|---|---|
| 1 | Strg+C / Cmd+C | funktioniert vermutlich via ProseMirror-/Browser-Default, **ungetestet** | Muss mit E2E-Test verifiziert werden (siehe Abschnitt 7) |
| 2 | Natives Rechtsklick-Kontextmenü „Kopieren“ | funktioniert vermutlich, **ungetestet** | Verifizieren, dass kein App-Handler es unterdrückt |
| 3 | Toolbar-Button „Kopieren“ | fehlt | Entscheidung dokumentieren (siehe Abschnitt 1, Punkt 4/5) |
| 4 | Touch-Kontextmenü „Kopieren“ | ungetestet | Auf Tablet-Viewport verifizieren |
| 5 | Zwischenablageninhalt für externe Rich-Text-Ziele (`text/html`) | ProseMirror-Default, ungetestet mit projektspezifischem Schema | Verifizieren für alle Marks/Nodes aus Abschnitt 2.2 |
| 6 | Zwischenablageninhalt für Klartext-Ziele (`text/plain`) | ProseMirror-Default, ungetestet | Verifizieren, insbesondere für Tabellen/Listen (sinnvolle Klartext-Repräsentation, keine kaputten Steuerzeichen) |

---

## 7. Testplan — Zusammenfassung (Reihenfolge der Abarbeitung)

| Bereich | Unit-/Modelltests | E2E-Tests (echte Browser-Bedienung, inkl. echtem `clipboard`-Zugriff) | Rundreise-Tests (Datei-Export/Re-Import) |
|---|---|---|---|
| Grundverhalten (leere Selektion, Undo-Neutralität) | fehlt | **fehlt komplett — muss neu geschrieben werden** | n/a |
| Zeichenformatierung beim Kopieren | fehlt | fehlt | fehlt |
| Absatz-/Listenstruktur beim Kopieren | fehlt | fehlt | fehlt |
| Tabellen (ganze Zellen vs. Textteilauswahl) | fehlt | fehlt | fehlt |
| Bilder | fehlt | fehlt | fehlt |
| Cross-App (Salamanido ↔ externes Programm) | n/a (nur manuell/E2E möglich) | fehlt | n/a |
| Selection-Sync-Interferenz mit Kopieren | fehlt | fehlt (bestehender Test deckt nur Toolbar+Klick+Enter ab, nicht Kopieren) | n/a |
| DOCX-Rundreise nach Kopieren/Einfügen | fehlt | fehlt | fehlt |
| ODT-Rundreise nach Kopieren/Einfügen | fehlt | fehlt | fehlt |
| Cross-Format-Rundreise nach Kopieren/Einfügen | fehlt | fehlt | fehlt |
| Browserübergreifende Konsistenz (Chrome/Firefox/Safari/Edge) | n/a | fehlt | n/a |
| Datenschutz-Code-Review (kein Logging von Clipboard-Inhalt) | n/a | n/a | manueller Review-Punkt |

**Fazit:** Für „Kopieren“ existiert aktuell **keine einzige** automatisierte Testabdeckung
— weder Unit- noch E2E- noch Rundreise-Ebene. Der Backlog-Status „vorhanden“ beruht
vollständig auf ungeprüftem Bibliotheks-Vertrauen. Bevor der Status auf „verifiziert“
gesetzt werden darf, müssen mindestens die Testfälle aus den Abschnitten 1–5 als
echte, im Browser laufende Playwright-Tests existieren (Zugriff auf die
Systemzwischenablage z. B. über Playwright-Clipboard-Permissions bzw. CDP, nicht nur
über intern konstruierte ProseMirror-Transaktionen).

---

## 8. Offene Fragen / Definition of Done

1. Wird ein sichtbarer Toolbar-Button für Kopieren ergänzt, oder bleibt es bei
   ausschließlich nativen Wegen (Tastenkombination + Kontextmenü)? Muss vor
   Testimplementierung entschieden und hier nachgetragen werden.
2. Ist Safari/WebKit Teil der unterstützten Browsermatrix? Falls ja, gesonderte
   Verifikation notwendig (bekannt unterschiedliches Clipboard-API-Verhalten).
3. Verhalten bei partieller Zellauswahl in Tabellen (Abschnitt 5, Punkt 5) muss als
   konkretes Soll-Verhalten festgelegt werden, nicht nur als offene Frage stehen
   bleiben.
4. Diese Spezifikation gilt erst als erfüllt, wenn:
   - jeder Testfall aus Abschnitt 1–5 als automatisierter, dauerhaft in der Suite
     verbleibender Test existiert und grün ist,
   - die Rundreise-Anforderung aus Abschnitt 4 für **beide** Formate (DOCX und ODT) und
     **beide** Konvertierungsrichtungen nachgewiesen ist,
   - der Datenschutz-Punkt (Abschnitt 5, Punkt 15) durch Code-Review bestätigt ist,
   - die offenen Fragen 1–3 dieses Abschnitts beantwortet und die Antworten in diese
     Datei nachgetragen sind.
   Erst dann darf der Backlog-Eintrag `kopieren` von „nicht vertrauenswürdig“ auf
   „verifiziert“ wechseln.
