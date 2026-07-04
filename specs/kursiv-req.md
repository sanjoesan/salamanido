# Anforderungsspezifikation: Zeichenformatierung „Kursiv“

Status: Entwurf zur Freigabe — Verifikationsauftrag. Laut Feature-Backlog
(`E:\docs\specs\FEATURE-BACKLOG.md`, Slug `kursiv`, Abschnitt „2.2 Zeichenformatierung“)
gilt die Funktion als **„vorhanden“**, dieser Status wird hier aber ausdrücklich als
**nicht vertrauenswürdig** eingestuft und muss vollständig neu verifiziert werden —
sowohl auf tatsächliche Bedienbarkeit (echte Toolbar-/Tastatur-Interaktion im Browser)
als auch auf korrekte Rundreise (DOCX **und** ODT) hin. Diese Datei ersetzt für den
Funktionsumfang „Kursiv“ keine der bestehenden Spezifikationen, sondern konkretisiert
Abschnitt 3 („Zeichenformatierung“) von `E:\docs\FEATURE-SPEC-DOCX-ODT.md` auf das
Detailniveau, das für eine belastbare Abnahme dieser einen Funktion nötig ist.

Geltungsbereich: ausschließlich die Zeichenformatierung „Kursiv“ (ProseMirror-Mark `em`,
DOCX `<w:i/>`, ODT `fo:font-style="italic"`). Alle anderen Marks (Fett, Unterstrichen,
Durchgestrichen, Farben) sind nur insoweit relevant, wie sie mit Kursiv kombiniert
auftreten.

---

## 0. Ist-Stand (Code-Fundstellen, Basis dieser Spezifikation)

| Ebene | Datei | Fundstelle |
|---|---|---|
| Schema (Mark-Definition) | `src/formats/shared/schema.ts` | `marks.em` (Zeile 116–121): `parseDOM` akzeptiert `<em>`, `<i>`, `style="font-style: italic"`; `toDOM` erzeugt `<em>` |
| Toolbar-Button | `src/formats/shared/editor/Toolbar.tsx` | Zeile 136: `<MarkButton view={view} mark="em" label="K" title="Kursiv" glyphClassName="italic" />` |
| Aktiv-Zustand-Logik | `src/formats/shared/editor/Toolbar.tsx` | Zeile 41–42: `markType.isInSet(view.state.selection.$from.marks())` |
| Toggle-Befehl | `src/formats/shared/editor/Toolbar.tsx` | Zeile 49–51: direkter Aufruf von `toggleMark(markType)` aus `prosemirror-commands` — **kein** eigener, testbarer Befehl in `commands.ts` (anders als z. B. `setAlign`, `toggleList`) |
| Tastenkürzel | `src/formats/shared/editor/WordEditor.tsx` | Zeile 77: `'Mod-i': toggleMark(wordSchema.marks.em)` |
| DOCX-Export | `src/formats/docx/writer.ts` | Zeile 22: `if (mark.type === 'em') props.push('<w:i/>')` innerhalb `<w:rPr>` |
| DOCX-Import | `src/formats/docx/reader.ts` | Zeile 103: `if (firstChildNS(rPr, ..., 'i')) marks.push({ type: 'em' })` — prüft nur **Existenz** des Elements, nicht dessen `w:val` |
| ODT-Export | `src/formats/odt/writer.ts` | Zeile 29: `if (mark.type === 'em') props.italic = true` |
| ODT-Export (Stil-XML) | `src/formats/odt/styleRegistry.ts` | Zeile 49: erzeugt `fo:font-style="italic" style:font-style-asian="italic" style:font-style-complex="italic"` in einer automatischen Zeichenformatvorlage (`T1`, `T2`, …) |
| ODT-Import | `src/formats/odt/reader.ts` | Zeile 36–67 (`parseAutomaticStyles`) + Zeile 52/88: liest `fo:font-style === 'italic'` **ausschließlich** aus `office:automatic-styles`, keine Auflösung von `office:styles` oder `style:parent-style-name` |
| Unit-Test (Roundtrip, konstruierte Daten) | `src/formats/docx/__tests__/roundtrip.test.ts` Zeile 64/74/85/90 sowie `src/formats/odt/__tests__/roundtrip.test.ts` Zeile 64/74/85/90 | prüft Export/Import von Mark `em` allein und in Kombination mit `strong`, aber **nur** über direkt konstruierte ProseMirror-JSON-Daten, nicht über echte Bedienung |
| E2E-Test (echte Bedienung) | `tests/e2e/docx.spec.ts`, `tests/e2e/odt.spec.ts`, `tests/e2e/selection-regression.spec.ts` | **Kein einziger** existierender E2E-Test klickt den „Kursiv“-Button oder nutzt Strg+I — alle vorhandenen Toolbar-/Regressions-Tests verwenden ausschließlich „Fett“ (`page.getByTitle('Fett').click()`) |

**Kernaussage:** Für „Kursiv“ existiert Schema-, Reader- und Writer-Unterstützung sowie
ein Toolbar-Button und ein Tastenkürzel — aber **keine einzige** automatisierte
Prüfung, die tatsächlich den Kursiv-Button/Strg+I im Browser bedient. Die gesamte
bisherige Testabdeckung für Kursiv beruht auf direkt konstruierten JSON-Testdaten
(Unit-Ebene) und auf der Analogie „funktioniert wie Fett, weil technisch identisch
implementiert“ — diese Analogie ist genau die Annahme, die hiermit verifiziert werden
soll, nicht vorausgesetzt werden darf.

---

## 1. Bedienelemente / Menüpunkte

| # | Element | Ort | Auslöser | Soll-Verhalten |
|---|---|---|---|---|
| 1 | Toolbar-Button „Kursiv“ | Editor-Toolbar, Gruppe Zeichenformatierung (zwischen „Fett“ und „Unterstrichen“) | Klick (`onMouseDown`, `preventDefault`, damit Editor-Fokus/Selektion nicht verloren geht) | Schaltet Kursiv auf der aktuellen Selektion bzw. an der Schreibmarke um (Toggle) |
| 2 | Tastenkombination Strg+I (Windows/Linux) bzw. Cmd+I (macOS) | global im Editor, solange Editor fokussiert ist | Tastendruck | identische Wirkung wie Klick auf den Toolbar-Button |
| 3 | Aktiv-Anzeige des Buttons | derselbe Button | passiv, aktualisiert sich bei jeder Selektionsänderung | Button erscheint visuell gedrückt/aktiv (`aria-pressed="true"`, dunkler Hintergrund) wenn die Schreibmarke bzw. die Selektion in kursivem Text steht |
| 4 | Tooltip/Accessible Name | derselbe Button | Hover bzw. Screenreader | `title="Kursiv"` und `aria-label="Kursiv"` — muss unabhängig vom sichtbaren Glyphen eindeutig sein |

**Explizit nicht vorhanden (muss dokumentiert, nicht stillschweigend fehlen):**
- Kein eigener Menüpunkt/Kontextmenü-Eintrag „Kursiv“ (nur Toolbar + Tastenkürzel).
- Kein „Formatierung löschen“-Befehl, der Kursiv (neben anderen Marks) gezielt entfernen
  würde — laut Backlog (`formatierung-loeschen`) generell „fehlt“. Einzige Möglichkeit,
  Kursiv zu entfernen, ist erneutes Toggle über denselben Button/dasselbe Tastenkürzel.
- Kein separates „Kursiv“-Icon als SVG — der sichtbare Glyph ist der Buchstabe „K“ mit
  CSS-Klasse `italic` (Tailwind-Utility `font-style: italic`), nicht ein Unicode-Symbol.
  Damit ist Kursiv von dem in Abschnitt 20 der Haupt-Spezifikation beschriebenen
  Emoji-Rendering-Risiko (🖼 ⊞ etc.) **nicht** betroffen — muss aber trotzdem visuell
  geprüft werden, da „K“ kursiv auf manchen Systemschriften kaum von „K“ aufrecht zu
  unterscheiden ist (geringer, aber vorhandener Kontrast-/Erkennbarkeitsrisiko).

---

## 2. Gewünschtes Verhalten im Detail

### 2.1 Grundverhalten (Toggle)

1. **Mit Selektion:** Ist mindestens ein Zeichen markiert, wendet Klick/Strg+I Kursiv auf
   den gesamten markierten Bereich an, sofern nicht bereits (einheitlich) kursiv — dann
   wird Kursiv für den gesamten Bereich entfernt.
2. **Ohne Selektion (an der Schreibmarke):** Kursiv wird nicht auf umgebenden Text
   angewendet, sondern als „Stored Mark“ vorgemerkt — der nächste getippte Text erscheint
   kursiv, bis erneut umgeschaltet oder die Schreibmarke bewegt wird (Standard-ProseMirror-
   Verhalten über `toggleMark`).
3. **Symmetrisch zu Fett:** Ein-/Ausschalten muss in beide Richtungen gleich zuverlässig
   funktionieren (Setzen und Entfernen sind gleichwertig zu testen, nicht nur das Setzen).

### 2.2 Aktiv-Zustand-Anzeige (kritisch, siehe Grenzfälle 3.1–3.2)

- Steht die Schreibmarke (ohne Selektion) in bereits kursivem Text, muss der Button sofort
  (ohne weitere Aktion) als aktiv erscheinen.
- Ist eine Selektion vorhanden, die **durchgehend** kursiv ist, muss der Button aktiv
  erscheinen.
- Ist eine Selektion vorhanden, die **gemischt** ist (teils kursiv, teils nicht), muss
  definiert und konsistent zu Word/LibreOffice reagiert werden (siehe Grenzfall 3.2) —
  mindestens darf der Button nicht fälschlich einen einheitlichen Zustand vortäuschen, der
  nicht der Realität entspricht.
- **Nach Toggle ohne Selektion** (Kursiv an der leeren Schreibmarke ein-/ausschalten, bevor
  etwas getippt wurde) muss der Button sofort den neuen Zustand anzeigen — nicht erst nach
  dem ersten getippten Zeichen (siehe Grenzfall 3.1 — begründeter Verdacht auf einen
  bestehenden Anzeigefehler).

### 2.3 Kombination mit anderen Formaten

- Kursiv muss gleichzeitig mit Fett, Unterstrichen, Durchgestrichen, Schriftfarbe und
  Hervorhebungsfarbe auf demselben Textlauf anwendbar sein, ohne dass sich die Marks
  gegenseitig verdrängen.
- Reihenfolge der Anwendung (z. B. erst Fett dann Kursiv oder umgekehrt) darf keinen
  Unterschied im Ergebnis machen.

### 2.4 Geltungsbereich innerhalb der Dokumentstruktur

Kursiv muss in **jedem** Inline-Kontext funktionieren, in dem Text vorkommen kann:
- Normale Absätze.
- Überschriften (Ebene 1–6).
- Listenelemente (Aufzählung und nummeriert, auch mehrstufig, falls vorhanden).
- Tabellenzellen (inkl. mehrerer Absätze innerhalb einer Zelle).
- Kopf-/Fußzeilen (sobald diese über die UI bedienbar sind — aktuell laut Haupt-Spezifikation
  Abschnitt 9 noch keine UI vorhanden; sobald sie existiert, gilt dieselbe Anforderung).
- Text vor und nach einem `hard_break` (Umschalt+Enter) innerhalb desselben Absatzes.
- Text unmittelbar vor/nach einem eingefügten Bild oder einer Tabelle (Grenzposition).

### 2.5 Zusammenspiel mit Undo/Redo

- Eine Kursiv-Toggle-Aktion muss ein eigener, rückgängig machbarer Schritt sein (ein
  Strg+Z macht genau diese eine Formatierungsänderung rückgängig, nicht mehr und nicht
  weniger).
- Funktioniert in gemischter Sequenz mit Tipp-Vorgängen und anderen Toolbar-Aktionen
  (siehe Abschnitt 2 der Haupt-Spezifikation, Testfall 5).

### 2.6 Zusammenspiel mit Copy/Paste

- Kursiver Text, der innerhalb des Editors kopiert und eingefügt wird, muss seine
  Formatierung behalten.
- Von extern (z. B. aus einer Webseite oder einem Word-Dokument) kopierter Text mit
  `<em>`, `<i>` oder `font-style: italic` muss beim Einfügen als Kursiv erkannt werden
  (Schema-`parseDOM` deckt alle drei Fälle ab — muss aber end-to-end über den echten
  Zwischenablage-Einfügevorgang verifiziert werden, nicht nur über die Schema-Definition).

---

## 3. Grenzfälle (Edge Cases) — mit technischer Einschätzung

Die folgenden Punkte sind keine Vermutungen „ins Blaue“, sondern aus dem tatsächlichen
Code abgeleitete, konkret prüfbare Verdachtsfälle. Jeder Punkt braucht einen eigenen Test,
der das beobachtete Ist-Verhalten festhält (bestätigt den Verdacht **oder** widerlegt ihn).

### 3.1 Aktiv-Anzeige nach Toggle an leerer Schreibmarke (Verdacht: Anzeigefehler)

`Toolbar.tsx` ermittelt den Aktiv-Zustand über
`markType.isInSet(view.state.selection.$from.marks())`. `$from.marks()` liefert die
Marks, die sich aus dem **umgebenden Dokumentinhalt** ergeben — es berücksichtigt
**nicht** `state.storedMarks` (die von ProseMirror nach einem `toggleMark` auf leerer
Selektion gesetzte Zwischenspeicherung für den nächsten getippten Text). Konkret:

> Schreibmarke steht in normalem (nicht-kursivem) Text, kein Zeichen ist selektiert →
> Klick auf „Kursiv“ → `state.storedMarks` wird auf `[em]` gesetzt (nächste Eingabe wird
> kursiv) → der Button liest aber weiterhin `$from.marks()`, das sich nicht geändert hat →
> **Verdacht: Der Button zeigt weiterhin „nicht aktiv“, bis das erste Zeichen getippt
> wurde**, obwohl der interne Zustand „Kursiv aktiv“ bereits korrekt gesetzt ist.

**Anforderung:** entweder nachweisen, dass dieser Fall in der aktuellen Implementierung
tatsächlich korrekt funktioniert (z. B. weil ein Re-Render aus anderem Grund `storedMarks`
doch berücksichtigt), oder als Fehler beheben (Standard-Fix: `state.storedMarks ||
$from.marks()` verwenden). In jedem Fall muss ein Test genau diese Sequenz abdecken:
Cursor in Klartext positionieren → Kursiv umschalten (ohne Selektion) → Button-Zustand
prüfen, bevor irgendetwas getippt wird.

### 3.2 Aktiv-Anzeige bei gemischter Selektion (Verdacht: falsch-positiv/negativ)

Dieselbe Zeile prüft nur `$from.marks()` — bei einer **Selektion**, die mehrere Textläufe
mit unterschiedlicher Kursiv-Formatierung überspannt, wird ausschließlich die Formatierung
**am Anfang der Selektion** berücksichtigt, nicht der gesamte markierte Bereich (kein
Äquivalent zu `rangeHasMark`/„every“-Prüfung über die Selektion).

> Text „AB“ wobei „A“ kursiv und „B“ nicht-kursiv ist → beides markieren → Button-Zustand
> spiegelt nur die Formatierung von „A“ wider (voraussichtlich „aktiv“), obwohl die
> Selektion insgesamt gemischt ist.

**Anforderung:** definieren und testen, was in diesem Fall passieren soll (Word/LibreOffice-
Konvention: Button zeigt „nicht eindeutig aktiv“ bzw. ein Klick macht die gesamte Selektion
einheitlich kursiv). Mindestens muss geklärt und dokumentiert werden, ob das aktuelle
Verhalten so gewollt ist — es darf nicht unbemerkt „falsch, aber zufällig meist unauffällig“
bleiben.

### 3.3 DOCX-Import: `<w:i w:val="false"/>` bzw. `w:val="0"` (Verdacht: Fehlinterpretation)

`marksFromRunProperties` in `docx/reader.ts` prüft nur, **ob** ein `<w:i>`-Element
existiert (`firstChildNS(rPr, ..., 'i')`), nicht dessen `w:val`-Attribut. In echten
Word-Dokumenten kommt `<w:i w:val="false"/>` bzw. `<w:i w:val="0"/>` vor, um eine von
einer Formatvorlage geerbte Kursivformatierung **gezielt auszuschalten** (z. B. in
Zitat- oder Überschrift-Formatvorlagen, die standardmäßig kursiv sind).

> **Verdacht:** Der aktuelle Reader interpretiert `<w:i w:val="false"/>` fälschlich als
> „kursiv aktiv“, weil nur die Existenz des Elements zählt, nicht sein Wert.

**Anforderung:** Testfall mit einer minimal konstruierten DOCX-Datei (analog zu
`buildSampleDocx()` in `tests/e2e/docx.spec.ts`), die einen Lauf mit
`<w:rPr><w:i w:val="false"/></w:rPr>` enthält → nach Import darf dieser Lauf **nicht**
kursiv im Editor erscheinen. Bestätigt sich der Fehler, muss der Reader `w:val` auswerten
(Standard-OOXML-Regel: fehlendes `w:val` oder `w:val="true"/"1"` = an, `w:val="false"/"0"`
= aus).

### 3.4 DOCX-Import: Kursiv über Zeichenformatvorlage statt direktem `<w:i/>` (Verdacht: Datenverlust)

`marksFromRunProperties` liest ausschließlich direkte Kind-Elemente von `w:rPr`
(`w:b`, `w:i`, `w:u`, `w:strike`, `w:color`, `w:shd`). Ein `<w:rStyle w:val="Betont"/>`
(bzw. `"Emphasis"`), das auf eine in `word/styles.xml` definierte Zeichenformatvorlage mit
`<w:i/>` verweist, wird **nicht aufgelöst** — es gibt keinen Code-Pfad, der `w:rStyle`
überhaupt liest.

> **Verdacht:** Text, der in einer echten Word-Datei ausschließlich über die eingebaute
> Formatvorlage „Betont“ (Standard-Zuordnung: kursiv) kursiv dargestellt wird, verliert
> beim Import die Kursiv-Formatierung vollständig und stillschweigend — ein Fall von
> „stillem Datenverlust“, den Abschnitt 18 der Haupt-Spezifikation ausdrücklich verbietet.

**Anforderung:** Testfall mit einer DOCX-Datei, die `word/styles.xml` mit einer
Zeichenformatvorlage „Betont“ (`<w:i/>` in deren `w:rPr`) sowie einen Lauf mit
`<w:rPr><w:rStyle w:val="Betont"/></w:rPr>` enthält → Text muss nach Import als kursiv im
Editor erscheinen. Bestätigt sich der Verdacht, muss der Reader `w:rStyle` auf die
entsprechende Formatvorlage in `styles.xml` auflösen (inkl. Vererbungskette über
`w:basedOn`, falls vorhanden).

### 3.5 ODT-Import: Kursiv über benannte Formatvorlage / Vererbung (Verdacht: Datenverlust)

`parseAutomaticStyles` in `odt/reader.ts` durchsucht ausschließlich
`office:automatic-styles`. Ein `text:style-name`, das auf eine in `office:styles`
(benannte, wiederverwendbare Formatvorlagen, z. B. „Emphasis“/„Betont“) definierte
Zeichenformatvorlage verweist, wird nicht gefunden (`styles.textStyles.get(styleName)`
liefert `undefined` → `marksFor` gibt `[]` zurück, Zeile 82–94). Zusätzlich wird
`style:parent-style-name` (Vererbung zwischen Formatvorlagen) an keiner Stelle
ausgewertet — auch eine automatische Formatvorlage, die Kursiv nur über ihren
Eltern-Stil erbt statt es selbst direkt zu deklarieren, würde nicht erkannt.

> **Verdacht:** Reale LibreOffice-/Word-erzeugte ODT-Dateien, die Kursiv über die
> eingebaute Zeichenformatvorlage „Betont“ (statt über eine direkte Handformatierung)
> anwenden, verlieren die Kursiv-Information beim Import.

**Anforderung:** Testfall mit einer ODT-Datei, die eine Formatvorlage in
`office:styles` mit `fo:font-style="italic"` sowie einen Textlauf mit
`text:style-name="Emphasis"` enthält → Text muss nach Import als kursiv erscheinen.
Ebenso ein Testfall mit einer automatischen Formatvorlage, die Kursiv nur über
`style:parent-style-name` erbt. Bestätigt sich der Verdacht, muss der Reader benannte
Formatvorlagen (`office:styles`) und die Vererbungskette auflösen.

### 3.6 ODT-Import: `fo:font-style="oblique"` (Verdacht: nicht erkannt)

Der Reader prüft exakt auf den String `'italic'`
(`props.getAttributeNS(ODF_NAMESPACES.fo, 'font-style') === 'italic'`). ODF erlaubt auch
den Wert `oblique`. In der Praxis kommt „oblique“ seltener vor als „italic“, ist aber ein
gültiger, in freier Wildbahn vorkommender Wert (z. B. aus manchen Schriftart-Exporten).

**Anforderung:** Klären, ob „oblique“ ebenfalls als Kursiv behandelt werden soll
(vertretbare Vereinfachung, da beide visuell/inhaltlich als „kursiv“ gelten) — falls ja,
Reader entsprechend erweitern und mit Testfall absichern; falls bewusst nicht, explizit
dokumentieren statt stillschweigend zu ignorieren.

### 3.7 Selektions-Sync-Regression mit Kursiv statt Fett (Pflicht-Regressionstest fehlt)

Abschnitt 2 der Haupt-Spezifikation beschreibt einen bereits gefundenen und laut Angabe
behobenen Fehler: Nach einer Toolbar-Formatierungsaktion auf „Alles auswählen“, gefolgt
von einem Klick zur Neupositionierung der Schreibmarke, wurde die interne Selektion nicht
aktualisiert — nachfolgende Eingaben haben Dokumentinhalt gelöscht/ersetzt. Der
existierende Regressionstest (`tests/e2e/selection-regression.spec.ts`) deckt diese
Sequenz **ausschließlich mit „Fett“** ab. Da der Fix (Mouseup-Reconciliation) generisch
in der Editor-Ebene ansetzen sollte, ist unklar (und muss verifiziert werden), ob er auch
greift, wenn statt „Fett“ „Kursiv“ die auslösende Formatierungsaktion ist.

**Anforderung:** Exakt dieselben drei Testfälle aus `selection-regression.spec.ts`
(einfache Sequenz, Tabellenzellen-Variante, Stress-Test über mehrere Zyklen) zusätzlich
mit „Kursiv“ statt „Fett“ als auslösender Aktion durchführen und dauerhaft in der Suite
verankern.

### 3.8 Weitere Grenzfälle

| # | Fall | Erwartung |
|---|---|---|
| 1 | Kursiv am Dokumentanfang (Position 0) bzw. -ende umschalten | funktioniert identisch zu jeder anderen Position |
| 2 | Kursiv in einem leeren Absatz (keinerlei Text) umschalten, danach tippen | getippter Text erscheint kursiv |
| 3 | Kursiv in einer leeren Tabellenzelle umschalten, danach tippen | wie oben, zusätzlich kein Übergriff auf Nachbarzellen |
| 4 | Kursiv-Text unmittelbar vor einem `hard_break`, danach Text nach dem `hard_break` | Kursiv-Zustand beider Zeilenteile unabhängig voneinander korrekt, kein Überlaufen der Formatierung über den Zeilenumbruch hinweg, sofern nicht explizit gewünscht |
| 5 | Kursiv gemeinsam mit Tabulator-Zeichen im selben Lauf | Tab-Zeichen bleibt erhalten (siehe Abschnitt 15 Haupt-Spezifikation), Kursiv-Formatierung schließt das Tab-Zeichen mit ein oder aus, je nach Selektion — muss konsistent sein |
| 6 | Strg+I, während der Fokus auf einem anderen Steuerelement liegt (z. B. Farbwähler-Input, Absatzformat-Dropdown) | darf nicht versehentlich auf den Editor wirken, wenn dieser nicht fokussiert ist |
| 7 | Sehr lange, über mehrere Seiten reichende Selektion (Strg+A in einem langen Dokument) mit Kursiv-Toggle | funktioniert ohne spürbare Verzögerung, UI bleibt reaktionsfähig |
| 8 | Kursiv-Toggle unmittelbar gefolgt von Export (kein Zwischenklick) | Export enthält den gerade gesetzten/entfernten Zustand korrekt, kein Race-Condition-Verlust |
| 9 | Zusammenspiel mit noch nicht existierender Änderungsverfolgung (Track Changes, Phase 3) | aktuell nicht anwendbar/kein Verhalten definiert — muss hier nur als offener Punkt vermerkt bleiben, keine Testpflicht vor Umsetzung von Abschnitt 13 der Haupt-Spezifikation |

---

## 4. Visuelle Darstellung

- Kursiver Text muss im Editor sichtbar schräggestellt dargestellt werden (`<em>` per
  Browser-Standardstil bzw. explizit über CSS, falls das Projekt-Stylesheet
  Standard-`<em>`-Darstellung überschreibt — verifizieren, dass keine globale CSS-Regel
  `em { font-style: normal }` o. Ä. dies unterdrückt).
- Der Toolbar-Button-Glyph „K“ muss im aktiven Zustand (`aria-pressed="true"`) denselben
  Kontrast/dieselbe Erkennbarkeit wie der „Fett“-Button („F“) bieten.
- Aktiv-Zustand-Styling (Hintergrund dunkel in Light-Mode, hell in Dark-Mode) muss in
  beiden Farbschemata funktionieren.

---

## 5. Rundreise-Anforderung (DOCX **und** ODT)

Verbindlich für **beide** Formate, in **beiden** Richtungen (Import und Export), gemäß
Grundprinzip der Haupt-Spezifikation: Datei A hochladen → **unverändert** exportieren →
Ergebnis entspricht inhaltlich A.

### 5.1 Pflicht-Szenarien

1. **DOCX, reine Editor-Erzeugung:** Neues Dokument → Text tippen → Teil davon kursiv
   markieren → als DOCX exportieren → Re-Import (im selben oder in einer neuen
   Editor-Instanz) → derselbe Textteil ist weiterhin (und ausschließlich er) kursiv.
2. **ODT, reine Editor-Erzeugung:** dieselbe Sequenz, Export/Re-Import als ODT.
3. **DOCX-Fremddatei-Rundreise (unverändert):** Eine unabhängig (nicht mit diesem Reader/
   Writer) erzeugte DOCX-Datei mit einem Lauf `<w:rPr><w:i/></w:rPr>` hochladen → **ohne
   jede Änderung** exportieren → im exportierten `word/document.xml` ist derselbe Text
   weiterhin mit `<w:i/>` versehen, kein anderer Text hat ungewollt Kursiv erhalten oder
   verloren.
4. **ODT-Fremddatei-Rundreise (unverändert):** analog mit einer unabhängig erzeugten
   ODT-Datei, deren Textlauf über `text:style-name` auf eine automatische Formatvorlage
   mit `fo:font-style="italic"` verweist.
5. **Cross-Format-Rundreise DOCX → ODT:** DOCX mit kursivem Text importieren → als ODT
   exportieren → Kursiv-Formatierung bleibt erhalten (`fo:font-style="italic"` im
   exportierten `content.xml`).
6. **Cross-Format-Rundreise ODT → DOCX:** umgekehrt, Kursiv bleibt als `<w:i/>` erhalten.
7. **Doppelte Rundreise (Hin und Zurück):** DOCX → Editor → ODT → Editor → DOCX an einem
   Dokument mit Kursiv (ggf. kombiniert mit Fett/Farbe) → nach zwei Konvertierungen ist
   der Text inhaltlich identisch und weiterhin exakt an derselben Stelle kursiv.
8. **Kombination mit anderen Formaten bei Rundreise:** Text, der gleichzeitig fett **und**
   kursiv **und** farbig ist → nach Export/Re-Import (beide Formate einzeln und
   cross-format) bleiben alle drei Eigenschaften an genau diesem Textlauf erhalten, keine
   Vermischung mit benachbartem, nur teilweise formatiertem Text.
9. **Kursiv in Überschrift/Liste/Tabellenzelle bei Rundreise:** dieselbe Prüfung wie
   Szenario 1/2, aber innerhalb einer Überschrift (Ebene beliebig), eines Listenpunkts und
   einer Tabellenzelle — jeweils einzeln.
10. **Validierung gegen unabhängigen Parser:** Der exportierte DOCX-Lauf mit Kursiv muss
    zusätzlich mit einer vom eigenen Reader unabhängigen Bibliothek (z. B. `python-docx`
    oder direkte XML-Schema-Prüfung) als valide erkannt werden — nicht nur durch den
    eigenen Reader wieder einlesbar sein (Gefahr sich gegenseitig ausgleichender
    Schreib-/Lesefehler, siehe Abschnitt 19 der Haupt-Spezifikation).
11. **Validierung ODT analog** gegen das ODF-Schema bzw. eine unabhängige Bibliothek.

### 5.2 Aus Abschnitt 3 übernommene, für Kursiv verbindliche Rundreise-Grenzfälle

- Die Fälle 3.3–3.6 (explizites `w:val="false"`, `w:rStyle`, ODT-Formatvorlagen-Vererbung,
  `oblique`) sind ausdrücklich Teil der Rundreise-Anforderung: „unverändert exportieren“
  darf nicht dazu führen, dass eine beim Import bereits (fälschlich) verlorene oder
  fälschlich hinzugefügte Kursiv-Information erst recht zementiert wird.

---

## 6. Testplan — Zusammenfassung

| Ebene | Was existiert bereits | Was fehlt und muss ergänzt werden |
|---|---|---|
| Schema/Unit (Reader/Writer, konstruierte Daten) | Ja — `em` allein und in Kombination mit `strong`, DOCX **und** ODT (`roundtrip.test.ts` je Format) | Testfälle für die Grenzfälle 3.3–3.6 (w:val=false, w:rStyle, ODT-Vererbung, oblique) |
| E2E über echte Toolbar-Bedienung | **Nein** — kein Test klickt „Kursiv“ oder nutzt Strg+I | Neuer Test analog zu `docx.spec.ts`/`odt.spec.ts`, aber für Kursiv statt Fett: Neu erstellen → tippen → markieren → Kursiv → Export → XML-Prüfung auf `<w:i/>` bzw. `fo:font-style="italic"` |
| E2E Fremddatei-Rundreise „unverändert“ | **Nein**, existiert bisher nur für Fett/Überschrift (`docx.spec.ts`/`odt.spec.ts` „round trip: uploading then exporting unchanged“) | Analoger Test mit einer Kursiv-Fixture (Szenario 5.1.3 / 5.1.4) |
| Selektions-Sync-Regression mit Kursiv | **Nein**, nur mit Fett (`selection-regression.spec.ts`) | Dieselben drei Testfälle mit Kursiv dupliziert (Grenzfall 3.7) |
| Aktiv-Zustand-Anzeige (Button-Zustand) | **Nein**, kein Test prüft `aria-pressed` für Kursiv in irgendeinem Zustand | Neue Tests für Grenzfälle 3.1 (Toggle ohne Selektion) und 3.2 (gemischte Selektion) |
| Kombination mit anderen Marks bei Rundreise | Ja auf Unit-Ebene (`strong`+`em`) | E2E-Bestätigung über echte Bedienung (Fett-Button + Kursiv-Button + Farbwähler nacheinander) |
| Validierung gegen unabhängigen Parser | Nicht ersichtlich vorhanden | Ergänzen (Szenario 5.1.10/5.1.11) |

---

## 7. Abnahmekriterien (Definition of Done)

Die Funktion „Kursiv“ gilt erst dann wieder als **vertrauenswürdig „vorhanden“**, wenn:

1. Alle Testfälle aus Abschnitt 2 (Grundverhalten, Aktiv-Anzeige, Kombination,
   Geltungsbereich, Undo/Redo, Copy/Paste) automatisiert und grün sind.
2. Jeder Grenzfall aus Abschnitt 3 einzeln durch einen Test beantwortet ist — entweder als
   „bestätigt funktionsfähig“ oder als „Fehler gefunden und behoben, mit Regressionstest
   abgesichert“. Kein Punkt darf offenbleiben.
3. Alle elf Rundreise-Szenarien aus Abschnitt 5.1 grün sind, inklusive der beiden
   unabhängigen Validierungen (5.1.10/5.1.11).
4. Der Selektions-Sync-Regressionstest (3.7) mit Kursiv dauerhaft Teil der Suite ist.
5. Für jeden in Abschnitt 3.3–3.6 bestätigten tatsächlichen Fehler ein Fix vorliegt **oder**
   das abweichende Verhalten bewusst als akzeptierte Einschränkung dokumentiert ist
   (kein stiller Fehlschlag, siehe Abschnitt 20 der Haupt-Spezifikation).
