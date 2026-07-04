# Anforderung: Unterstrichen (einfach)

Status: **vorhanden laut Backlog — gilt als nicht vertrauenswürdig, muss vollständig
verifiziert werden.** Diese Datei ist die verbindliche Anforderung, gegen die die
Verifikation (echte Browser-Bedienung + Rundreise-Tests) durchgeführt wird, bevor der
Status auf „verifiziert" gehoben werden darf.

Bezug: `specs/FEATURE-BACKLOG.md`, Abschnitt 2.2, Zeile `unterstrichen-einfach` — Titel
„Unterstrichen (einfach)", Beschreibung „Schaltet eine einfache Unterstreichung um.",
Priorität 1 (essenziell/fundamental).

Stil/Methodik dieser Datei orientiert sich an `FEATURE-SPEC-DOCX-ODT.md`: Anforderung in
Fließtext/Listen je Aspekt, danach nummerierte Testfälle, Fokus auf **beide** Formate
(DOCX und ODT) sowie auf die Rundreise (Upload unverändert → Export → Re-Import erhält
Inhalt).

Bereits vorgefundener Implementierungsstand (Referenz für die Verifikation, **kein**
Ersatz für tatsächliches Testen — das ist ja gerade der Punkt: Code-Vorhandensein wurde
bisher mit „funktioniert" verwechselt):

| Ebene | Fundstelle |
|---|---|
| Schema (Mark-Definition) | `src/formats/shared/schema.ts`, Mark `underline`, `parseDOM: [{ tag: 'u' }, { style: 'text-decoration=underline' }]`, `toDOM` → `['u', 0]` |
| Toolbar-Button | `src/formats/shared/editor/Toolbar.tsx`, `MarkButton` mit `mark="underline"`, `label="U"`, `title="Unterstrichen"`, `glyphClassName="underline"` |
| Tastenkürzel | `src/formats/shared/editor/WordEditor.tsx`, Keymap-Eintrag `'Mod-u': toggleMark(wordSchema.marks.underline)` |
| DOCX-Export | `src/formats/docx/writer.ts`, `runPropertiesXml`: `mark.type === 'underline'` → `<w:u w:val="single"/>` |
| DOCX-Import | `src/formats/docx/reader.ts`, `marksFromRunProperties`: `<w:u>` vorhanden **und** `w:val !== 'none'` → Mark `underline` |
| ODT-Export | `src/formats/odt/styleRegistry.ts`, `buildTextStyleXml`: `style:text-underline-style="solid" style:text-underline-width="auto" style:text-underline-color="font-color"` |
| ODT-Import | `src/formats/odt/reader.ts`, `parseAutomaticStyles`: Attribut `style:text-underline-style` vorhanden **und** `!== 'none'` → Mark `underline` |
| Unit-Tests (Rundreise, konstruierte Testdaten) | `src/formats/docx/__tests__/roundtrip.test.ts` und `src/formats/odt/__tests__/roundtrip.test.ts`, Testfall „preserves bold, italic, underline, and strikethrough independently" |
| E2E-Tests (echte Toolbar-/Tastatur-Bedienung im Browser) | **keine gefunden** — Verzeichnis `tests/` enthält aktuell keinen Treffer für „underline"/„Unterstrichen". Das ist die zentrale Lücke, die diese Anforderung schließen soll. |

---

## 1. Ziel

Nutzer:innen können markierten Text mit einer einfachen, durchgezogenen
Unterstreichungslinie versehen und diese Formatierung ebenso wieder entfernen — sowohl
über die Toolbar als auch über Tastatur — konsistent in Editor-Anzeige, DOCX-Export und
ODT-Export, und die Formatierung bleibt bei jeder Rundreise (Import → Export,
Export → Re-Import, Cross-Format) vollständig erhalten.

Explizit **nicht** Gegenstand dieser Anforderung (separate Backlog-Einträge, jeweils
Status „fehlt"):
- `unterstrichen-doppelt` — doppelte Unterstreichungslinie.
- `unterstrichen-nur-woerter` — Unterstreichung, die Leerzeichen zwischen Wörtern ausspart.

Diese beiden dürfen durch die Umsetzung/Verifikation von „einfach" nicht versehentlich
mit abgedeckt vorgetäuscht werden (z. B. indem ein einziges `w:u`/`style:text-
underline-*`-Attribut ohne Stilunterscheidung für alle drei Varianten stünde). Die
Verifikation muss ausdrücklich bestätigen, dass **nur** die einfache Variante
angeboten wird und dies auch so kommuniziert ist (Tooltip/Titel „Unterstrichen", nicht
„Unterstrichen (einfach)" im aktuellen UI-Text — siehe Abschnitt 3, Grenzfall zur
Titel-Konsistenz).

---

## 2. Menüpunkte / Bedienelemente

| # | Bedienelement | Ort | Ist-Zustand (zu verifizieren) | Soll |
|---|---|---|---|---|
| 1 | Toolbar-Button „U" | Zeichenformatierungs-Gruppe der Toolbar, zwischen „Kursiv" (K) und „Durchgestrichen" (S) | Vorhanden (`Toolbar.tsx`), `title`/`aria-label` = „Unterstrichen", `aria-pressed` je nach Zustand am Cursor | Muss per Maus-Klick (mousedown, kein click — Selektion darf beim Klick nicht verloren gehen) Toggle auslösen |
| 2 | Tastenkombination Strg+U (bzw. Cmd+U auf macOS) | Global im Editor | Vorhanden (`Mod-u` in Keymap) | Muss identisches Verhalten wie Toolbar-Button auslösen, auch ohne dass zuvor die Toolbar benutzt wurde |
| 3 | Visueller Aktiv-Zustand des Buttons | Toolbar | `aria-pressed` + CSS-Klassenwechsel (dunkler Hintergrund) abhängig von `markType.isInSet(selection.$from.marks())` | Muss korrekt anzeigen, ob an der aktuellen Cursor-Position/Selektion bereits unterstrichen aktiv ist (siehe Grenzfälle zu gemischten Selektionen) |
| 4 | Icon/Label „U" | Toolbar-Button | Reines Buchstaben-Label „U" mit CSS-Klasse `underline` (per CSS wahrscheinlich selbst unterstrichen dargestellt) | Muss unabhängig von Systemschriftart eindeutig als „Unterstrichen"-Symbol erkennbar sein (vgl. `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.1 zum generellen Icon-Rendering-Problem — hier speziell verifizieren, dass das „U" nicht mit dem „U" für „Unterstrichen (doppelt)" verwechselbar wird, sobald dieses ergänzt wird) |
| 5 | Kontextmenü (Rechtsklick) | — | Nicht vorhanden | Kein Soll-Bestandteil dieser Anforderung (nicht in Backlog gefordert) — nur dokumentieren, falls in der Anwendung generell ein Kontextmenü existiert, dass „Unterstrichen" dort fehlt |

---

## 3. Gewünschtes Verhalten im Detail

### 3.1 Toggle auf bestehender Selektion
- Text markieren → Button „U" klicken oder Strg+U drücken → gesamte Selektion wird
  unterstrichen dargestellt, Button zeigt aktiven Zustand.
- Erneuter Klick/Strg+U auf dieselbe (weiterhin unterstrichene) Selektion → Unterstreichung
  wird vollständig entfernt, Button zeigt inaktiven Zustand.
- Die Selektion selbst darf durch die Aktion nicht verändert werden (Cursor-Position bzw.
  Auswahlgrenzen bleiben erhalten, damit direkt eine weitere Formatierung angewendet
  werden kann, ohne neu markieren zu müssen).

### 3.2 Toggle an der Schreibmarke (keine Selektion)
- Cursor ohne Selektion in normalem Text platzieren → Strg+U/Button klicken → nachfolgend
  getippter Text erscheint unterstrichen, bereits vorhandener Text davor/danach bleibt
  unverändert.
- Erneutes Umschalten an derselben Stelle vor dem nächsten Tastendruck → hebt die
  „gemerkte" Formatierung für das nächste Zeichen wieder auf (Standard-ProseMirror-
  `storedMarks`-Verhalten über `toggleMark`).

### 3.3 Anzeige des aktiven Zustands
- Steht der Cursor (ohne Selektion) irgendwo in bereits unterstrichenem Text, zeigt der
  Button sofort „aktiv" — ohne Klick, allein durch Cursor-Bewegung per Pfeiltasten oder
  Mausklick.
- Bewegt sich der Cursor aus unterstrichenem in nicht-unterstrichenen Text, wechselt der
  Button unmittelbar zurück auf „inaktiv".

### 3.4 Gemischte Selektion (teilweise unterstrichen, teilweise nicht)
- Wird eine Selektion markiert, die sowohl unterstrichenen als auch nicht-unterstrichenen
  Text enthält, muss ein einheitliches, vorhersagbares Verhalten gelten (Standardverhalten
  von `prosemirror-commands` `toggleMark`: Anwenden wirkt, wenn nicht der **gesamte**
  Bereich bereits die Mark trägt → Ergebnis: gesamte Selektion wird unterstrichen; erst ein
  zweiter Klick auf die nun vollständig unterstrichene Selektion entfernt sie wieder).
  Dieses Verhalten ist zu verifizieren und explizit zu dokumentieren, da es für Nutzer:innen
  potenziell überraschend ist (kein Drittzustand „teilweise", kein sofortiges Entfernen bei
  gemischtem Ausgangszustand).
- Der Button-Aktiv-Zustand bei gemischter Selektion richtet sich laut aktueller
  Implementierung nach der Formatierung **am Selektionsanfang** (`$from.marks()`), nicht
  nach der gesamten Selektion — zu verifizieren, ob das für Nutzer:innen nachvollziehbar
  bleibt oder ob ein spezieller „gemischt"-Zustand (z. B. wie in Word ein unbestimmtes
  Kästchen) erwartet wird. Mindestanforderung: keine falsche Anzeige, die zu
  unerwartetem Verhalten beim Klick führt.

### 3.5 Kombination mit anderen Zeichenformaten
- Unterstrichen muss unabhängig und gleichzeitig mit Fett, Kursiv, Durchgestrichen,
  Schriftfarbe und Hervorhebungsfarbe auf demselben Textlauf anwendbar sein (z. B. fett
  **und** unterstrichen **und** farbig gleichzeitig).
- Entfernen einer der Formatierungen darf die anderen nicht beeinflussen (jede Mark ist
  unabhängig togglebar).

### 3.6 Verhalten bei „Formatierung löschen" (sobald diese Funktion existiert, aktuell
`fehlt` laut Backlog)
- Sobald `formatierung-loeschen` umgesetzt ist, muss diese Funktion auch die
  Unterstreichung zuverlässig entfernen. Bis dahin: keine Anforderung an diese Kombination,
  aber im Test explizit als „nicht anwendbar, da Zielfunktion fehlt" vermerken, nicht
  stillschweigend auslassen.

### 3.7 Zusammenspiel mit Hyperlinks (Backlog-Status `fehlt`)
- Sobald Hyperlinks umgesetzt sind: Standard-Darstellung von Links ist laut
  `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 14 ebenfalls „unterstrichen". Zu klären und zu
  dokumentieren, sobald relevant: Ist das eine separate visuelle Default-Darstellung des
  Link-Elements oder wird dafür ebenfalls die `underline`-Mark gesetzt (mit Folgefrage:
  lässt sich die Unterstreichung eines Links über den „U"-Button unabhängig
  ein-/ausschalten)? Für die aktuelle Verifikation ohne Hyperlink-Funktion nicht relevant,
  aber als zukünftige Abhängigkeit hier vermerkt, damit sie bei Umsetzung von Hyperlinks
  nicht übersehen wird.

### 3.8 Farbe der Unterstreichungslinie
- Aktuelle Implementierung setzt **keine eigene Farbe** für die Unterstreichungslinie:
  DOCX schreibt `<w:u w:val="single"/>` ohne `w:color`-Attribut (→ Word interpretiert das
  als „automatisch", i. d. R. gleiche Farbe wie der Text); ODT schreibt
  `style:text-underline-color="font-color"` (linienfarbe folgt explizit der Textfarbe).
  Anforderung: Verifizieren, dass beide Verhaltensweisen in der Praxis (Word/LibreOffice
  oder gleichwertiger Prüf-Parser) tatsächlich zum selben sichtbaren Ergebnis führen
  (Linie in Textfarbe), insbesondere wenn zusätzlich eine explizite Schriftfarbe gesetzt
  ist (Abschnitt 3.5). Eine eigenständige, von der Textfarbe abweichende
  Unterstreichungsfarbe ist **nicht** Teil dieser Anforderung (kein entsprechender
  Toolbar-Eintrag vorhanden/gefordert).

---

## 4. Grenzfälle

1. **Leere Selektion an Absatzgrenze:** Cursor direkt vor/nach einem Zeilenumbruch
   (`hard_break`) oder am Absatzanfang/-ende → Toggle darf keinen JS-Fehler auslösen und
   muss sich korrekt auf nachfolgend getippten Text auswirken.
2. **Selektion über mehrere Absätze hinweg:** Markierung, die einen ganzen Absatzwechsel
   einschließt → Unterstreichung wird auf alle enthaltenen Textläufe in beiden Absätzen
   angewendet, keine Elemente werden ausgelassen oder der Absatzwechsel selbst beschädigt.
3. **Selektion über eine Tabellen-Zellgrenze hinweg:** Markierung, die sich über mehrere
   Tabellenzellen erstreckt (sofern die Editor-Auswahl das zulässt) → Unterstreichung wird
   konsistent in allen betroffenen Zellen angewendet, kein Crash, keine Vermischung mit
   Nachbarzellen.
4. **Rein aus Leerzeichen bestehende Selektion:** Markierung, die nur Leerzeichen/Tabs
   enthält → Toggle funktioniert technisch (Mark wird gesetzt), auch wenn optisch kaum
   sichtbar — kein Sonderfall, der die Aktion verweigert.
5. **Selektion, die ein eingefügtes Bild einschließt (inline Node ohne Marks):** Toggle
   darf nicht abstürzen; auf das Bild selbst hat die Mark keine Wirkung, auf im selben
   Bereich enthaltenen Text schon.
6. **Wiederholtes schnelles Toggle (Doppelklick-Timing) per Tastenkombination:** Zwei
   schnell aufeinanderfolgende Strg+U auf derselben Selektion → Endzustand muss
   deterministisch „aus" sein (an/aus/an/aus, kein Race-Condition-Effekt durch doppeltes
   Event).
7. **Rückgängig/Wiederholen:** Strg+Z nach Toggle → Formatierung wird exakt rückgängig
   gemacht (nicht nur visuell, auch im zugrunde liegenden Dokumentmodell); Strg+Y/Strg+
   Umschalt+Z stellt sie wieder her. Muss auch nach einer Sequenz aus mehreren
   Formatierungsaktionen (fett dann unterstrichen dann wieder unterstrichen aus)
   schrittweise korrekt rückgängig machbar sein.
8. **Kombiniert mit dem bekannten Selection-Sync-Bug** (siehe
   `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2): Alles auswählen → Unterstrichen anwenden →
   per Klick neu positionieren → Enter → weitertippen — beide entstehenden Absätze
   müssen erhalten bleiben UND ihre jeweils korrekte Unterstreichungs-Formatierung
   behalten. Da Abschnitt 2 „Fett" explizit als Beispiel nennt, muss hier geprüft werden,
   ob derselbe Bug-Pfad auch mit „Unterstrichen" reproduzierbar ist (Regressionstest
   entsprechend erweitern, nicht nur für Fett).
9. **Import von Fremddateien mit `w:val` ungleich `single`/`none`** (z. B. `double`,
   `wave`, `dotted`, `dash` — echte Word-Dateien nutzen diese Werte häufig): Aktueller
   Reader-Code behandelt **jeden** Wert ungleich `none` als einfache Unterstreichung
   (`w:val !== 'none'`). Das bedeutet: Eine echte Datei mit doppelter oder gewellter
   Unterstreichung wird beim Import optisch auf „einfach" vereinfacht. Anforderung: Dieses
   Verhalten ist als bewusster, dokumentierter Fallback zu bestätigen (kein Datenverlust
   im Sinne von „Text verschwindet", aber Formatierungsdetail geht verloren) — nicht als
   stiller Bug. Muss mit einer echten Testdatei (z. B. `w:val="double"` oder
   `w:val="wave"`) verifiziert werden.
10. **ODT-Import mit `style:text-underline-style` ungleich `solid`** (z. B. `dash`,
    `dotted`, `wave`): Analog zu Punkt 9 — aktueller Reader prüft nur „vorhanden und
    nicht `none`". Gleiches Fallback-Verhalten zu verifizieren und zu dokumentieren.
11. **Cross-Format-Rundreise Namenskollision:** ODT-Export erzeugt automatische
    Textstil-Namen (`T1`, `T2`, …) über `TextStyleRegistry` je nach gesehener
    Merkmalskombination. Bei einem Dokument mit vielen unterschiedlichen
    Formatkombinationen inklusive Unterstrichen ist zu verifizieren, dass keine
    Kollision/Verwechslung zwischen Stilnamen auftritt und die Unterstreichung exakt der
    richtigen Textstelle zugeordnet bleibt.
12. **Datei ohne jede Formatierung, nur Unterstrichen gesetzt:** Export darf keine
    unnötigen leeren Style-Definitionen erzeugen und muss trotzdem valide bleiben (siehe
    `styleRegistry.ts` `isEmpty`-Prüfung — mit genau einer aktiven aber „nur
    Unterstrichen"-Kombination testen, nicht nur in Kombination mit anderen Marks).
13. **Sehr lange durchgehend unterstrichene Textabschnitte (mehrere Seiten):** Kein
    Performance-Einbruch beim Rendern/Export/Import.
14. **Groß-/Kleinschreibung von `w:val`/`style:text-underline-style` bei Fremddateien**
    (z. B. Export aus älteren/anderen Programmen mit abweichender Attribut-Groß-
    /Kleinschreibung oder zusätzlichen Namespace-Präfixen): Import darf nicht durch
    Groß-/Kleinschreibungsvarianten stillschweigend scheitern (aktuell exakter
    String-Vergleich `!== 'none'`, `!== 'single'` o. ä. — prüfen, ob reale Testdateien das
    tatsächlich als exakten Kleinbuchstaben-Wert liefern).
15. **Fokus-Erhalt nach Klick auf den Toolbar-Button:** Der Button verwendet
    `onMouseDown` mit `preventDefault()`, um den Fokus/die Selektion im Editor nicht zu
    verlieren. Zu verifizieren: Nach dem Klick bleibt der Editor fokussiert und die
    ursprüngliche Selektion sichtbar aktiv (kein Sprung des Cursors an eine andere
    Stelle).

---

## 5. Rundreise-Anforderung (verbindlich)

Für **jede** der folgenden Kombinationen gilt: Datei mit unterstrichenem Text hochladen
(bzw. im Editor erzeugen) → unverändert exportieren → Ergebnis erneut importieren →
Unterstreichung ist an exakt derselben Textstelle weiterhin vorhanden, kein sonstiger
Inhaltsverlust.

1. **DOCX-Eigenrundreise:** Im Editor Text eingeben, unterstreichen, als DOCX
   exportieren, die exportierte Datei erneut importieren → Unterstreichung bleibt exakt
   an der richtigen Textstelle erhalten (bereits als Unit-Test mit konstruierten
   Testdaten vorhanden — hier zusätzlich über echte Toolbar-/Tastatur-Bedienung im
   Browser nachstellen, siehe Abschnitt 7).
2. **ODT-Eigenrundreise:** Dasselbe für ODT.
3. **Cross-Format DOCX → ODT:** Eine DOCX-Datei mit unterstrichenem Text importieren, als
   ODT exportieren, das Ergebnis importieren → Unterstreichung bleibt erhalten.
4. **Cross-Format ODT → DOCX:** Umgekehrt.
5. **Doppelte Cross-Format-Rundreise:** DOCX → Editor → ODT → Editor → DOCX → Editor →
   Unterstreichung bleibt auch nach zweifachem Formatwechsel vollständig erhalten (kein
   kumulativer Verlust, vgl. `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 19).
6. **Echte Fremddatei (nicht mit dem eigenen Editor erzeugt):** Mindestens eine reale,
   mit Microsoft Word erzeugte DOCX-Datei und mindestens eine reale, mit LibreOffice
   Writer erzeugte ODT-Datei, die jeweils einfach unterstrichenen Text enthalten,
   importieren → Unterstreichung wird korrekt erkannt (kein reiner Test gegen selbst
   erzeugte Dateien, die Schreib- und Lesefehler gegenseitig verdecken könnten — vgl.
   `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 19).
7. **Validierung des exportierten XML gegen unabhängigen Parser:** Exportierte DOCX-Datei
   mit unterstrichenem Text mit einer unabhängigen Bibliothek (z. B. python-docx) öffnen
   und prüfen, dass `w:u` mit `w:val="single"` tatsächlich als Unterstreichung erkannt
   wird (nicht nur mit dem anwendungseigenen Reader rückgelesen). Analog ODT gegen eine
   unabhängige ODF-Bibliothek/odfvalidator.
8. **Kombinierte Rundreise mit anderen Formaten gleichzeitig:** Text, der gleichzeitig
   fett, farbig **und** unterstrichen ist → alle drei Merkmale bleiben nach jeder der
   obigen Rundreisen gemeinsam korrekt erhalten (nicht nur Unterstrichen isoliert
   getestet — reale Dokumente kombinieren Formate).

---

## 6. Testfälle (Zusammenfassung, E2E über echte Browser-Bedienung — Pflicht)

1. Text eingeben, markieren, Toolbar-Button „U" klicken → Text wird sichtbar
   unterstrichen dargestellt, Button zeigt aktiven Zustand (`aria-pressed="true"`).
2. Dieselbe Markierung, erneut Button klicken → Unterstreichung verschwindet, Button
   zeigt inaktiven Zustand.
3. Dieselbe Aktion über Tastenkombination Strg+U statt Button — identisches Ergebnis.
4. Cursor ohne Selektion setzen, Strg+U drücken, dann tippen → neu getippter Text ist
   unterstrichen, umgebender Text unverändert.
5. Cursor in bereits unterstrichenen Text bewegen (nur Pfeiltasten, keine neue Aktion) →
   Button zeigt sofort aktiven Zustand ohne Klick.
6. Gemischte Selektion (teils unterstrichen, teils nicht) formatieren → Verhalten
   entspricht Abschnitt 3.4, keine JS-Exception.
7. Kombination Fett + Unterstrichen + Schriftfarbe auf demselben Textlauf setzen →
   alle drei gleichzeitig sichtbar und unabhängig wieder entfernbar.
8. Regressionstest Selection-Sync-Bug mit „Unterstrichen" statt „Fett" (siehe
   Grenzfall 8) — Pflichttest, dauerhaft in der Suite.
9. Undo/Redo über eine Sequenz Tippen → Unterstreichen an → Unterstreichen aus →
   erneut Tippen — jeder Schritt einzeln korrekt rückgängig/wiederherstellbar.
10. Rundreise-Testfälle 1–8 aus Abschnitt 5, jeweils als eigener automatisierter Test.
11. Grenzfälle 1–15 aus Abschnitt 4 — jeweils mindestens ein gezielter Test, kein
    Sammeltest, der Einzelergebnisse verschleiert.
12. Sichtprüfung/Screenshot-Vergleich: Aussehen der Unterstreichung im Editor entspricht
    optisch dem Aussehen nach Re-Import derselben Datei (kein Sprung in Linienstärke/
    -abstand, der auf einen fehlerhaften Reader/Writer hindeuten würde).

---

## 7. Abgrenzung: Vorhandener Unit-Test vs. geforderter Nachweis

Der bestehende Unit-Test „preserves bold, italic, underline, and strikethrough
independently" (in beiden `roundtrip.test.ts`-Dateien) konstruiert das ProseMirror-JSON
direkt und prüft nur Reader/Writer-Funktionen isoliert. Er beweist **nicht**, dass:
- der Toolbar-Button tatsächlich klickbar ist und sichtbar reagiert,
- die Tastenkombination im echten Browser-Editor funktioniert,
- der Button-Aktiv-Zustand sich korrekt mit der Cursor-Position mitbewegt,
- ein über die UI erzeugtes Dokument (nicht künstlich zusammengesetztes JSON) beim
  Export dieselbe Struktur erzeugt.

Diese vier Punkte sind der eigentliche Kern der geforderten Verifikation und müssen
durch neue oder erweiterte E2E-Tests (z. B. Playwright, analog zu den bereits für
Fett/Kursiv über Toolbar vorhandenen Tests laut `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 21)
geschlossen werden, bevor der Backlog-Status von „vorhanden" auf „verifiziert" geändert
werden darf.

---

## 8. Abnahmekriterien (Definition of Done)

Der Status darf erst als „verifiziert" gelten, wenn **alle** folgenden Punkte erfüllt sind:

1. Alle Testfälle aus Abschnitt 6 sind als automatisierte Tests vorhanden und grün.
2. Mindestens die Rundreise-Testfälle 1, 2, 6 und 7 aus Abschnitt 5 sind mit echten,
   nicht selbst erzeugten Prüfwerkzeugen (unabhängiger Parser bzw. reale Fremddatei)
   bestanden.
3. Der Regressionstest aus Grenzfall 8 ist dauerhaft in der Testsuite verankert.
4. Die in Abschnitt 4 genannten Grenzfälle 9, 10 und 14 (Fremddateien mit abweichenden
   Unterstreichungs-Stilwerten) sind geprüft und das Fallback-Verhalten ist in dieser
   Datei oder einer Nachfolgedatei explizit dokumentiert (nicht offen gelassen).
5. Kein während der Verifikation gefundener Fehler bleibt ohne Ticket/Vermerk zurück.
