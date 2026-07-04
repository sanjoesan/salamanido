# Anforderungsspezifikation: Feature „Nummerierte Liste"

Status: Entwurf zur Freigabe — bitte prüfen, bevor daran weitergearbeitet oder das
Feature als „fertig" abgehakt wird.

Herkunft/Einordnung: Dieses Dokument konkretisiert Abschnitt 5 („Listen") von
`FEATURE-SPEC-DOCX-ODT.md` für den Teil „nummerierte Liste" und ersetzt für dieses
Teilfeature dessen kurze Stichpunkte durch eine vollständige Anforderung inkl.
Grenzfällen und Rundreise-Pflicht. Es gilt weiterhin: gemeinsamer interner Editor
(ProseMirror-Schema + Seitenansicht) für DOCX und ODT — jede Anforderung unten muss
für **beide** Formate gelten, sowohl beim Import einer bestehenden Datei als auch beim
Export einer im Editor erstellten/bearbeiteten Datei, inklusive Rundreise (Datei A
hochladen → unverändert exportieren → Ergebnis entspricht inhaltlich A).

Backlog-Status laut Vorgabe: **„vorhanden" — gilt aktuell als nicht vertrauenswürdig,
muss vollständig verifiziert werden.** Dieses Dokument beschreibt sowohl den Soll-Zustand
als auch (Abschnitt 6) bereits durch Code-Sichtung auffindbare, konkrete Verdachtsmomente,
die die Prüfung gezielt bestätigen oder widerlegen muss.

---

## 1. Menüpunkte / Bedienelemente

| # | Element | Ort | Aktuell laut Code | Soll |
|---|---|---|---|---|
| 1 | Button „1. Liste" | Toolbar, Gruppe „Listen" (neben „• Liste" und „⇧ Liste") | vorhanden, wandelt Auswahl/aktuellen Absatz in `ordered_list` um | Muss auf Absatz(en) **und** auf leerer Zeile funktionieren; aktiver Zustand (`aria-pressed`) fehlt aktuell komplett bei diesem Button (im Unterschied zu Zeichenformat-/Ausrichtungs-Buttons) — muss ergänzt werden, damit erkennbar ist, ob der Cursor gerade in einer nummerierten Liste steht |
| 2 | Button „• Liste" (Aufzählung) | Toolbar | vorhanden | siehe eigene Spezifikation Aufzählungsliste; hier nur relevant als Abgrenzung/Umschaltfall (Punkt 4.7) |
| 3 | Button „⇧ Liste" (Liste aufheben) | Toolbar | vorhanden, ruft `liftFromList()` | Muss auch bei mehrstufigen Listen die korrekte Einzelebene anheben, nicht die ganze Liste in einem Schritt zerstören (siehe 4.4) |
| 4 | Tastenkombination zum Ein-/Ausrücken (Tab / Umschalt+Tab) | Editor, Keymap | **fehlt vollständig** — im Editor-Keymap ist kein `Tab`/`Shift-Tab` gebunden, `sinkListItem` wird im gesamten Quellcode nirgends importiert oder verwendet | Muss ergänzt werden: Tab am Zeilenanfang einer Liste rückt die Zeile eine Ebene ein, Umschalt+Tab rückt aus; außerhalb einer Liste darf Tab nicht versehentlich Listenverhalten auslösen (siehe Abschnitt 15 „Sonderelemente" der Hauptspezifikation) |
| 5 | Automatische Umwandlung durch Tippen (z. B. „1. " am Zeilenanfang + Leerzeichen) | Editor, Input Rules | **fehlt vollständig** — es existieren keinerlei ProseMirror-InputRules im Projekt | Nice-to-have, aber wenn nicht umgesetzt, muss das explizit als bewusst nicht unterstützt dokumentiert werden (kein stiller Fehlschlag, siehe Abschnitt 20 der Hauptspezifikation) |
| 6 | Nummerierung fortsetzen/neu beginnen (Kontextmenü oder Dialog) | — | **fehlt komplett in der UI** | Muss gebaut werden, siehe Abschnitt 2.5 |
| 7 | Start-Wert der Liste ändern (z. B. bei 5 statt 1 beginnen) | — | Datenmodell hat `ordered_list.attrs.start` (Default 1), aber **keine UI**, und der DOCX-Export ignoriert dieses Attribut vollständig (siehe Abschnitt 6.3) | UI-Element (mind. Eingabefeld/Kontextaktion) ergänzen, Export muss den Wert tatsächlich verwenden |
| 8 | Symbol des Buttons „1. Liste" | Toolbar | Text „1. Liste" (kein Icon-Rendering-Risiko wie bei den Emoji-Buttons, da reiner Text) | in Ordnung so, aber auf Konsistenz mit ggf. zukünftiger SVG-Icon-Umstellung (Abschnitt 20 Hauptspezifikation) prüfen |

---

## 2. Gewünschtes Verhalten im Detail

### 2.1 Liste erstellen
- Cursor in einem oder mehreren markierten Absätzen, Klick auf „1. Liste" → jeder markierte
  Absatz wird zu einem eigenen Listenpunkt derselben nummerierten Liste.
- Funktioniert sowohl bei einer reinen Cursor-Position (kein markierter Text) — dann nur
  der aktuelle Absatz wird zur Liste — als auch bei einer Mehrfachauswahl über mehrere
  Absätze hinweg.
- Funktioniert auf einer bereits vorhandenen Aufzählungsliste (Bullet) als **Umwandlung**
  in eine nummerierte Liste (nicht als Verschachtelung Liste-in-Liste), siehe 2.7.
- Neue Liste beginnt bei „1." (bzw. bei „a.", „i." etc. auf tieferen Ebenen, siehe 2.4),
  sofern nicht ausdrücklich fortgesetzt wird (siehe 2.5).

### 2.2 Nummerierung ist automatisch und fortlaufend
- Die angezeigte Nummer wird nie manuell eingegeben, sondern vom Editor berechnet und bei
  jeder Änderung (Zeile einfügen, löschen, verschieben, Ebene wechseln) sofort neu
  dargestellt.
- Einfügen eines neuen Punkts in der Mitte einer Liste verschiebt alle nachfolgenden
  Nummern korrekt um eins.
- Löschen eines Punkts in der Mitte schließt die Nummerierungslücke automatisch.

### 2.3 Enter-Verhalten
- Enter am Ende eines nicht-leeren Listenpunkts → neuer Listenpunkt auf derselben Ebene,
  fortlaufend nummeriert.
- Enter am Ende eines **leeren** Listenpunkts beendet die Liste an dieser Stelle (Punkt
  wird zu einem normalen Absatz, Standard-Editor-Verhalten) statt einen weiteren leeren
  nummerierten Punkt zu erzeugen.
- Enter in der Mitte eines Listenpunkts (Cursor zwischen Text) teilt den Text korrekt auf
  zwei aufeinanderfolgende Listenpunkte auf, ohne Textverlust.
- Umschalt+Enter innerhalb eines Listenpunkts erzeugt einen Zeilenumbruch **innerhalb**
  desselben nummerierten Punkts (kein neuer, eigens nummerierter Punkt).

### 2.4 Mehrstufige Listen (Einrücken/Ausrücken)
- Tab am Anfang einer Zeile innerhalb der Liste rückt diese Zeile eine Ebene tiefer ein
  (Unterpunkt der vorherigen Zeile) und ändert das Nummerierungsformat gemäß gängiger
  Konvention pro Ebene (z. B. Ebene 1 „1., 2., 3.", Ebene 2 „a., b., c." oder „i., ii.",
  je nach gewählter Formatvorlage — mindestens muss die Nummerierung der Unterebene
  unabhängig von der Elternebene fortlaufend und optisch unterscheidbar sein, z. B. durch
  zusätzlichen Einzug, auch wenn exakt dasselbe Zahlenformat verwendet wird).
- Umschalt+Tab rückt eine Ebene aus, bis zur obersten Ebene (weiteres Umschalt+Tab am
  obersten Level hebt den Punkt aus der Liste, siehe 2.6, oder ist ein No-Op — muss
  festgelegt und getestet werden).
- Ein-/Ausrücken darf die Nummerierung der Geschwister-Ebenen (gleiche Ebene, andere
  Elternzeile) nicht durcheinanderbringen.
- Mindestens 4 Ebenen tief müssen zuverlässig funktionieren (reale Dokumente mit bis zu
  9–10 Ebenen kommen vor, siehe Testfixture in Abschnitt 5); ab welcher Tiefe ein
  eigenes Nummerierungsformat vs. Wiederholung des Formats greift, muss dokumentiert
  werden.

### 2.5 Nummerierung fortsetzen oder neu starten
- Wird eine zweite, später im Dokument stehende nummerierte Liste angelegt, die
  inhaltlich als eigenständige, neue Liste gedacht ist (z. B. durch dazwischenliegenden
  normalen Text getrennt), muss sie standardmäßig bei „1." neu beginnen.
- Es muss möglich sein, eine Liste stattdessen bewusst **fortzusetzen** (Nummerierung
  einer vorherigen, gleichartigen Liste weiterzählen, z. B. Liste geht bei „4." weiter),
  wenn die Nutzerin das ausdrücklich wählt.
- Ebenso muss es möglich sein, eine Liste bewusst mit einem **beliebigen Startwert**
  beginnen zu lassen (z. B. bei „5." starten), unabhängig vom Vorhandensein einer
  vorherigen Liste.
- Beide Fälle (fortsetzen vs. neu starten vs. beliebiger Start) müssen die Rundreise
  überstehen (siehe Abschnitt 6.3 zum aktuellen Verdacht, dass dies nicht der Fall ist).

### 2.6 Liste aufheben
- Markierte Listenpunkte (oder Cursor in einem Punkt) → Klick auf „Liste aufheben" wandelt
  die betroffenen Punkte in normale Absätze um.
- Der Text bleibt vollständig erhalten, nur das Nummerierungssymbol/-einzug verschwindet.
- Bei einer mehrstufigen Liste: Aufheben eines Punkts auf einer tieferen Ebene hebt
  zunächst nur eine Ebene an (wie Umschalt+Tab) oder direkt in einen normalen Absatz um —
  das genaue Verhalten muss festgelegt und dokumentiert werden (Word-Konvention: erst
  Ebene anheben, erst beim Erreichen der obersten Ebene zum normalen Absatz).

### 2.7 Wechsel zwischen Aufzählung und Nummerierung
- Eine bestehende Aufzählungsliste per Klick auf „1. Liste" in eine nummerierte Liste
  umwandeln (und umgekehrt) — Text und Reihenfolge bleiben erhalten, nur das
  Darstellungsformat wechselt. Es darf **keine** verschachtelte Liste-in-Liste entstehen.

### 2.8 Zusammenspiel mit anderen Features
- Zeichenformatierung (fett, kursiv, Farbe, …) innerhalb eines Listenpunkts funktioniert
  identisch zu einem normalen Absatz (siehe Abschnitt 3 der Hauptspezifikation).
- Absatzausrichtung eines einzelnen Listenpunkts (links/zentriert/rechts/Blocksatz)
  bleibt individuell einstellbar und wird bei Rundreise nicht auf den Listen-Standard
  zurückgesetzt.
- Eine nummerierte Liste **innerhalb einer Tabellenzelle** muss möglich sein und bei
  Rundreise erhalten bleiben (reale Fixture-Datei vorhanden, siehe Abschnitt 5).
- Undo/Redo: Jede der obigen Aktionen (Liste erstellen, Ein-/Ausrücken, aufheben,
  Formatwechsel) muss einzeln rückgängig/wiederherstellbar sein, auch in Kombination mit
  reinem Tippen davor/danach (Regressionsgefahr durch den in Abschnitt 2 der
  Hauptspezifikation dokumentierten Selection-Sync-Bug — Listenbedienung ist ein
  Verdachtsfall, da Toolbar-Klicks + anschließende Cursorpositionierung genau das
  Bug-Muster auslösen können).
- Bild oder Tabelle als zusätzlicher Block **innerhalb** eines Listenpunkts (mehrere
  Absätze/Blöcke pro Punkt) — mindestens beim Import einer Fremddatei darf das nicht zu
  Datenverlust führen, auch wenn im eigenen Editor (noch) nicht direkt erzeugbar.

---

## 3. Grenzfälle

1. **Leere Liste**: Liste erstellen und sofort wieder aufheben, ohne je Text einzugeben →
   kein verwaistes leeres Listen-Element im Dokumentmodell, kein Crash.
2. **Einzelner Listenpunkt**: Liste mit nur einem Element → wird als valide `ordered_list`
   mit genau einem `list_item` exportiert (nicht als Sonderfall unterdrückt).
3. **Liste am Dokumentanfang**: Erster Absatz des Dokuments wird zur Liste → weiterhin
   normal editierbar, Cursor-Positionierung davor funktioniert (z. B. neuer Absatz vor der
   Liste einfügbar).
4. **Liste am Dokumentende**: Letzter Absatz wird zur Liste → Enter am Ende des letzten,
   nicht-leeren Punkts erzeugt weiterhin neuen Punkt; kein impliziter Dokumentabschluss-Bug.
5. **Zwei unmittelbar aufeinanderfolgende, aber inhaltlich getrennte nummerierte Listen
   ohne trennenden Absatz dazwischen** (z. B. durch Copy-Paste zweier Listen
   hintereinander): Müssen als zwei getrennte Listen mit je eigenem Start („1., 2." /
   „1., 2.") erkennbar bleiben und dürfen bei Export/Reimport **nicht** zu einer
   durchlaufenden Liste („1.–4.") verschmelzen. **Konkreter, durch Code-Sichtung
   bereits begründeter Verdacht:** Der DOCX-Export vergibt für **jede** nummerierte Liste
   im Dokument dieselbe feste Nummerierungs-ID; zwei direkt benachbarte, aber getrennt
   gemeinte Listen könnten dadurch beim Reimport fälschlich zu einer einzigen,
   durchlaufenden Liste zusammengefasst werden. Muss gezielt mit genau diesem Szenario
   (zwei Listen ohne trennenden Absatz) geprüft werden — nicht nur mit dem bereits
   bestehenden Test „zwei Listen **mit** trennendem Absatz".
6. **Sehr tiefe Verschachtelung** (mehr als 4 Ebenen, bis hin zu den in realen
   Testdateien vorkommenden ~10 Ebenen) → kein Absturz, keine Endlosschleife, sinnvolle
   visuelle Grenze (z. B. Wiederholung des Formats ab einer bestimmten Tiefe) statt
   unkontrolliertem Verhalten.
7. **Copy-Paste eines Listenpunkts aus einer Liste in eine andere** (unterschiedlicher
   Typ, z. B. aus einer Bullet-Liste in eine nummerierte Liste hinein) → Zielformat
   (Nummerierung) setzt sich durch, kein Bruch der Zielliste in zwei Teile.
8. **Copy-Paste von Listentext aus einer externen Quelle** (z. B. aus Word/LibreOffice
   kopierter nummerierter Text) → wird sinnvoll als Liste erkannt oder zumindest als
   Klartext ohne Verlust übernommen (siehe Abschnitt 2 der Hauptspezifikation zu
   externem Paste allgemein).
9. **Undo unmittelbar nach Listenerstellung** (ein Schritt zurück) → stellt exakt den
   Zustand vor der Umwandlung wieder her (normale Absätze, keine Reste der Listenstruktur).
10. **Start-Wert ungleich 1** (z. B. Liste beginnt bewusst bei „5.") → muss bei Anzeige
    im Editor **und** bei Rundreise erhalten bleiben. **Konkreter Verdacht aus
    Code-Sichtung:** Das Datenmodell besitzt zwar ein Startwert-Attribut für nummerierte
    Listen, der DOCX-Export scheint diesen Wert aber überhaupt nicht auszulesen und
    exportiert stets denselben festen Nummerierungsbeginn — muss geprüft werden, ob der
    Wert nach Rundreise tatsächlich erhalten bleibt oder stillschweigend verworfen wird.
11. **Liste mit Sonderzeichen/Umlauten im Text** eines Punkts → kein Effekt auf
    Nummerierung, Text bleibt zeichengetreu erhalten.
12. **Sehr lange Liste** (z. B. > 50 Punkte) → Nummerierung bleibt performant korrekt
    (kein spürbares Einfrieren beim Tippen in Punkt 50).
13. **Nummerierte Liste, die über einen manuellen Seitenumbruch hinweg fortgesetzt wird**
    → Nummerierung läuft über die Seitengrenze hinweg korrekt weiter.
14. **Reale Fremddatei mit „unordentlicher" Nummerierungs-ID-Reihenfolge** (numId-Werte
    nicht aufsteigend, oder mit expliziten Ebenen-Überschreibungen/„Overrides") → muss
    importierbar bleiben, mindestens Text und Grundnummerierung ohne Absturz, siehe
    konkrete Testfixture in Abschnitt 5.
15. **Datei mit bereits als „kaputt" bekanntem Listen-Markup** (siehe Fixture
    „brokenList" / „ListOddity" in Abschnitt 5) → definierter Fallback statt
    stillem Datenverlust oder Absturz (vgl. Fallback-Anforderung aus Abschnitt 18 der
    Hauptspezifikation).

---

## 4. Rundreise-Anforderung (Pflicht für DOCX **und** ODT)

Für jede der folgenden Kombinationen gilt: **Datei/Zustand A → unverändert exportieren
→ Ergebnis erneut importieren → Inhalt entspricht A** (Nummerierungstyp, Reihenfolge,
Ebene, Startwert je nach Grenzfall). „Unverändert exportieren" bedeutet: Datei wird
hochgeladen bzw. im Editor erzeugt und **ohne jede Bearbeitung** direkt wieder
exportiert — dies deckt reine Lese-/Schreib-Symmetriefehler auf, die bei aktiver
Bearbeitung verdeckt bleiben könnten.

### 4.1 Im Editor selbst erzeugte Listen
1. Einfache einstufige nummerierte Liste (3 Punkte) erzeugen → als DOCX exportieren →
   reimportieren → 3 Punkte, korrekte Reihenfolge, weiterhin als `ordered_list`
   erkennbar (nicht als Bullet-Liste oder Klartext).
2. Dasselbe als ODT.
3. Mehrstufige Liste (mind. 3 Ebenen, gemischt) erzeugen → DOCX-Rundreise → Ebenen
   bleiben erhalten (aktuell laut Codesichtung höchstwahrscheinlich **nicht** der Fall,
   siehe Abschnitt 6 — Kernpunkt dieser Verifikation).
4. Dasselbe als ODT-Rundreise.
5. Liste mit individuellem Startwert (≠ 1) → Rundreise DOCX und ODT.
6. Zwei getrennte Listen ohne trennenden Absatz (Grenzfall 3.5) → Rundreise DOCX und
   ODT, beide bleiben getrennt.
7. Nummerierte Liste innerhalb einer Tabellenzelle → Rundreise DOCX und ODT.
8. Cross-Format: im Editor erzeugte nummerierte Liste als ODT exportieren, reimportieren,
   als DOCX exportieren, reimportieren (doppelte Rundreise) → Struktur bleibt über beide
   Konvertierungen inhaltlich identisch (Formatverluste bei reiner Optik sind
   akzeptabel und zu dokumentieren, Verlust der Nummerierungsstruktur selbst nicht).

### 4.2 Import realer Fremddateien (bereits im Repository vorhandene Testfixtures)
Diese Dateien liegen bereits unter `tests/fixtures/external/docx/` bzw.
`tests/fixtures/external/odt/` und müssen für die Verifikation dieses Features
verwendet werden (nicht nur mit selbst konstruierten Minimalbeispielen testen):

- `tests/fixtures/external/docx/ComplexNumberedLists.docx` — mehrstufige nummerierte
  Listen, Kernfixture für Abschnitt 2.4/3.6.
- `tests/fixtures/external/docx/Numbering.docx`,
  `tests/fixtures/external/docx/NumberingWithOutOfOrderId.docx`,
  `tests/fixtures/external/docx/NumberingWOverrides.docx` — reguläre sowie „unordentliche"
  Nummerierungsdefinitionen und Ebenen-/Start-Überschreibungen, siehe Grenzfall 3.14 und
  Abschnitt 2.5.
- `tests/fixtures/external/odt/ContinueListTest.odt` — Test für „Nummerierung
  fortsetzen", siehe Abschnitt 2.5.
- `tests/fixtures/external/odt/listLevel10.odt` — sehr tiefe Verschachtelung, siehe
  Grenzfall 3.6.
- `tests/fixtures/external/odt/listsInTable.odt`,
  `tests/fixtures/external/odt/simple-table-with-lists.odt` — Liste in Tabellenzelle,
  siehe Abschnitt 2.8.
- `tests/fixtures/external/odt/ListRoundtrip.odt` — expliziter Rundreise-Testfall.
- `tests/fixtures/external/odt/brokenList.odt`, `tests/fixtures/external/odt/ListOddity.odt` —
  bekanntermaßen abweichendes/fehlerhaftes Markup, siehe Grenzfall 3.15.
- `tests/fixtures/external/odt/listStyleId.odt`,
  `tests/fixtures/external/odt/ListStyleResolution.odt` — Auflösung von Listenstilen
  über Referenzen statt Inline-Definition.
- Restliche Listen-Fixtures (`EasyList*.odt`, `simpleList*.odt`,
  `simple_bullet_list*.odt`, `preparedList.odt`, `liste2.odt`, `list.odt`,
  `bulletListTest.odt`, `bullet_list.odt`, `ListHeading*.odt`, `imageWithinList.odt`) —
  Basisabdeckung, jede Datei mindestens ohne Absturz/Textverlust importierbar; für jede
  gilt: Import → unverändert exportieren → Reimport → Textinhalt jedes Listenpunkts
  identisch zum ersten Import.

**Vorgabe:** Für jede oben genannte Fixture-Datei ist mindestens ein automatisierter
Test erforderlich, der (a) den Import ohne Absturz/Datenverlust prüft und (b) die
Rundreise (unverändert exportieren → reimportieren) auf inhaltliche Gleichheit prüft.
Bloßes manuelles Anschauen genügt für die Abnahme dieses Features nicht.

---

## 5. Ist-Stand-Analyse laut Code-Sichtung (Ausgangspunkt der Verifikation)

Diese Beobachtungen stammen aus einer Durchsicht des aktuellen Quellcodes (Stand dieser
Spezifikation) und sind als **zu bestätigende oder zu widerlegende Verdachtsmomente**
zu verstehen — nicht als bereits abgenommene Fehlerliste. Sie sollen der Verifikation
gezielte Ansatzpunkte geben, analog zu Abschnitt 17 der Hauptspezifikation.

1. **Kein Ein-/Ausrücken implementiert.** Es existiert weder eine Tastenkombination
   (Tab/Umschalt+Tab) noch ein Toolbar-Button für das Ändern der Verschachtelungsebene
   einer Liste. Der ProseMirror-Befehl zum Einrücken (`sinkListItem`) wird im gesamten
   Projekt nicht importiert oder verwendet; nur das Ausrücken über den vorhandenen
   „Liste aufheben"-Button existiert. **Konsequenz:** Abschnitt 2.4 dieser Spezifikation
   ist voraussichtlich komplett ungebaut, nicht nur ungetestet.
2. **DOCX-Export ignoriert Verschachtelungsebenen.** Beim Export nach DOCX wird für
   jeden Listenpunkt unabhängig von seiner tatsächlichen Ebene im Dokumentmodell
   dieselbe feste Ebene (0) geschrieben. Selbst wenn im Editor-Datenmodell eine
   verschachtelte Liste vorläge (z. B. durch Import aus ODT), würde der DOCX-Export sie
   auf eine einzige Ebene abflachen.
3. **DOCX-Import liest Ebenen nicht aus.** Beim Import einer DOCX-Datei wird nur die
   Nummerierungs-ID pro Absatz ausgewertet, nicht die zugehörige Ebenenangabe. Eine reale
   mehrstufige Liste (wie in `ComplexNumberedLists.docx`) würde dadurch voraussichtlich
   komplett flach (eine einzige Ebene) importiert.
4. **Nummerierungs-ID ist pro Listentyp global fix.** Sowohl beim DOCX- als auch beim
   ODT-Export wird für **alle** nummerierten Listen im Dokument dieselbe feste
   Nummerierungskennung/derselbe feste Listenstil verwendet, unabhängig davon, wie viele
   inhaltlich getrennte nummerierte Listen im Dokument existieren. Das begründet den in
   Grenzfall 3.5 beschriebenen Verdacht (zwei benachbarte, getrennt gemeinte Listen
   könnten beim Reimport verschmelzen).
5. **Startwert-Attribut ohne Wirkung.** Das Datenmodell für nummerierte Listen besitzt
   ein Attribut für den Startwert, es gibt jedoch weder eine Bedienmöglichkeit dafür in
   der Oberfläche, noch verwendet der DOCX-Export dieses Attribut beim Schreiben der
   Nummerierungsdefinition.
6. **Keine „Nummerierung fortsetzen/neu starten"-Funktion.** Weder Datenmodell noch
   Import/Export werten eine explizite Fortsetzungs-/Neustart-Angabe aus (das DOCX-Format
   kennt hierfür reguläre Mechanismen, die aktuell komplett ignoriert werden).
7. **Nur eine Nummerierungsformat-Definition pro Listentyp.** Sowohl für DOCX als auch
   für ODT existiert im Code nur je eine einzige Formatdefinition (Ebene „1., 2., 3."),
   keine unterschiedlichen Formate für tiefere Ebenen (z. B. Buchstaben oder römische
   Ziffern auf Unterebenen), was Punkt 2 dieser Liste zusätzlich verschärft.
8. **Aktiver Zustand des Toolbar-Buttons fehlt.** Anders als bei den
   Zeichenformatierungs- und Ausrichtungs-Buttons zeigt der „1. Liste"-Button aktuell
   nicht an, ob der Cursor sich gerade in einer nummerierten Liste befindet.
9. **Bereits vorhandene automatisierte Tests decken nur den einfachen Fall ab:** flache
   Liste mit wenigen Punkten, Unterscheidung Bullet/Ordered, sowie zwei Listen **mit**
   trennendem Absatz. Mehrstufigkeit, Startwert, Fortsetzen/Neustart sowie sämtliche der
   in Abschnitt 4.2 gelisteten realen Fixture-Dateien sind nach aktuellem Stand **nicht**
   in die automatisierte Testsuite eingebunden.

**Einordnung:** Der Backlog-Status „vorhanden" trifft nur auf den einfachsten Fall zu
(einstufige Liste anlegen/aufheben, Bullet/Ordered unterscheidbar). Alles, was über
Abschnitt 2.1–2.3 und 2.6–2.7 dieser Spezifikation hinausgeht (insbesondere 2.4
Mehrstufigkeit und 2.5 Fortsetzen/Neustart), ist nach dieser Code-Sichtung mit hoher
Wahrscheinlichkeit nicht oder nur unvollständig implementiert und muss vor jeder
Abnahme dediziert geprüft und ggf. nachgebaut werden.

---

## 6. Testfälle (Zusammenfassung, Pflichtumfang)

1. Liste erstellen (Cursor ohne Selektion; Selektion über mehrere Absätze) — beide Wege.
2. Enter-Verhalten: nicht-leerer Punkt, leerer Punkt (beendet Liste), Cursor mittig im
   Text (Split), Umschalt+Enter (Zeilenumbruch ohne neuen Punkt).
3. Ein-/Ausrücken per Tab/Umschalt+Tab über mind. 3 Ebenen, inkl. Nummerierungsformat
   je Ebene und Rückwirkung auf Geschwisterebenen (Funktion muss ggf. erst gebaut
   werden, siehe Abschnitt 5.1).
4. Nummerierung fortsetzen vs. neu starten vs. beliebiger Startwert — inkl. Rundreise
   (Funktion muss ggf. erst gebaut werden, siehe Abschnitt 5.5/5.6).
5. Liste aufheben — einstufig und mehrstufig, Text bleibt vollständig erhalten.
6. Wechsel Bullet ↔ Ordered ohne Verschachtelung/Datenverlust.
7. Zusammenspiel: Zeichenformatierung, Absatzausrichtung, Liste in Tabellenzelle,
   Undo/Redo über gemischte Sequenzen inkl. Toolbar-Klick + Cursor-Neupositionierung
   (Regressionsmuster aus Abschnitt 2 der Hauptspezifikation).
8. Alle Grenzfälle aus Abschnitt 3 (1–15) einzeln als eigener Testfall.
9. Rundreise DOCX **und** ODT für jede im Editor erzeugbare Konfiguration
   (Abschnitt 4.1, Punkte 1–8).
10. Import + Rundreise für jede reale Fixture-Datei aus Abschnitt 4.2 — kein Test gilt
    als abgeschlossen, solange nicht mindestens diese Dateien mit einbezogen wurden.
11. Validierung des DOCX-Exports einer komplexen, alle Fälle dieser Spezifikation
    vereinenden Testdatei gegen einen unabhängigen Parser (nicht nur den
    projekteigenen Reader), analog Abschnitt 19 der Hauptspezifikation.
12. Dasselbe für ODT gegen das ODF-Schema bzw. einen unabhängigen Parser.

---

## 7. Definition of Done

Das Feature „Nummerierte Liste" gilt erst dann als verifiziert und vertrauenswürdig,
wenn:

- jeder Punkt aus Abschnitt 2 (gewünschtes Verhalten) über echte Bedienung im Browser
  nachgewiesen ist (nicht nur über konstruierte Testdaten für Reader/Writer),
- jeder Grenzfall aus Abschnitt 3 einen zugeordneten, dauerhaft in der Suite
  verbleibenden Test hat,
- die Rundreise-Anforderung aus Abschnitt 4 für **beide** Formate und **alle** dort
  gelisteten realen Fixture-Dateien nachgewiesen ist,
- zu jedem Verdachtspunkt aus Abschnitt 5 ein eindeutiges Ergebnis vorliegt (bestätigt
  und behoben / bestätigt und bewusst als bekannte Einschränkung dokumentiert /
  widerlegt) — kein Punkt darf offen bleiben,
- kein Punkt dieser Spezifikation zu einem stillen Fehlschlag führt (siehe Abschnitt 20
  der Hauptspezifikation: jede nicht ausführbare Aktion muss sichtbar zurückmelden,
  statt wirkungslos zu bleiben).
