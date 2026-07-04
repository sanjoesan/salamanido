# Umsetzungsplan: Feature „Hyperlink einfügen" (inkl. Bearbeiten/Entfernen) — Code-Abgleich und geplante Änderungen

Rolle: Entwickler-Antwort auf `specs/hyperlink-einfuegen-req.md`. Dieses Dokument prüft
den **tatsächlichen** Code-Stand (nicht nur die Behauptungen der Anforderung) und legt
fest, welche Dateien wie geändert bzw. neu angelegt werden. Stil orientiert an
`FEATURE-SPEC-DOCX-ODT.md` bzw. `specs/textmarker-farbe-code.md`. Kein Punkt hier ist
bereits umgesetzt — dies ist der Plan, nicht der Vollzug.

---

## 0. Kurzfassung

Der Befund „fehlt komplett" aus Abschnitt 0 der Anforderung ist **bestätigt** — es gibt
weder Mark, noch Command, noch Toolbar-Button, noch Shortcut, noch Reader-/Writer-Pfad.
Die beiden „kritischen Importbefunde" (0.4 DOCX, 0.5 ODT — stiller Textverlust bei
Fremddateien mit Links) sind **ebenfalls bestätigt und mit eigener Fixture-Verifikation
zusätzlich belegt** (Abschnitt 1).

Die tatsächliche Codeprüfung deckt außerdem **fünf in der Anforderung nicht benannte,
zusätzliche Sachverhalte** auf, die für eine korrekte Umsetzung entscheidend sind
(Details in Abschnitt 2):

1. **`RelationshipRegistry.serialize()` (`docx/relationships.ts:23-31`) escaped `Target`
   überhaupt nicht.** Bisher unproblematisch, weil alle bestehenden Relationship-Ziele
   generierte, garantiert saubere Dateinamen sind (`media/image1.png`, `styles.xml`, …).
   Eine externe Hyperlink-URL wie die in Anforderung 5.1.1 explizit geforderte
   `https://example.com/pfad?x=1&y=2` enthält ein rohes `&` — ohne Fix erzeugt der
   Export **ungültiges XML** in `document.xml.rels` (der allererste Rundreise-Testfall
   der Anforderung würde sonst nicht bestehen).
2. **`inlineToRuns`/`decodeParagraphRuns` behandeln `hard_break` grundsätzlich
   markenlos** — ein bereits heute vorhandener, von Hyperlinks unabhängiger Bug
   (`docx/writer.ts:58-61`, `docx/reader.ts:132-133`; ODT-Äquivalent
   `odt/reader.ts:108-109`, `odt/writer.ts:50`). Für Grenzfall 4.10 (Link über einen
   `hard_break` hinweg) muss das jetzt behoben werden, sonst zerfällt ein solcher Link
   nach Rundreise in zwei getrennte `<w:hyperlink>`/`<text:a>`.
3. **`Mark.setFrom` (ProseMirror-Kern, `prosemirror-model/dist/index.js:537-545`)
   dedupliziert Marks gleichen Typs nicht** — bei der `invalid_simple_overlapping_
   hyperlinks.odt`-Fixture (echte, verschachtelte `<text:a>`-Elemente, empirisch
   verifiziert, siehe Abschnitt 1) würde ein naiver Reader zwei `link`-Marks im selben
   `marks`-Array erzeugen, was einen strukturell inkonsistenten Dokumentzustand
   produziert. Braucht einen expliziten Guard (Abschnitt 4.11).
4. **Round-Trip-Falle bei der Standardoptik (3.12/3.14):** Würde der Writer die
   Standard-„blau/unterstrichen"-Optik direkt als `<w:color>`/`<w:u>` bzw.
   `fo:color`/`text-underline-style` **inline** in denselben Lauf schreiben, der auch
   den `link`-Mark trägt, würde der eigene Reader daraus nach einer Rundreise
   fälschlich ein **explizites** `textColor`/`underline`-Mark rekonstruieren — das
   bricht 3.8 (Entfernen des Links müsste die Farbe mit entfernen, tut es nach diesem
   Fehler aber nicht mehr) und 5.1.3/5.1.4. Auflösung in Abschnitt 3.4/4.6/4.9/4.11.
5. **Befund 0.10 der Anforderung zur DOCX-Fixture-Lage ist überholt** — eigene
   Verifikation (Abschnitt 1, Punkt 10) findet **12 von 127** vorhandenen DOCX-Fixtures
   mit echtem `<w:hyperlink>`, darunter zwei besonders wertvolle Grenzfälle
   (`rtl.docx`: RTL/Unicode-URLs; `bug65738.docx`: enthält **sowohl** `r:id`-basierte
   externe Links **als auch** reine `w:anchor`-Links ohne `r:id` in derselben Datei) —
   **keine zusätzliche externe Fixture-Beschaffung nötig.**

---

## 1. Verifikation der Befunde aus `hyperlink-einfuegen-req.md` Abschnitt 0

| # | Befund laut Anforderung | Ergebnis der Prüfung |
|---|---|---|
| 0.1 | `schema.ts:109-148`, kein `link`-Mark | **Bestätigt**, Zeilen exakt (Marks sind `strong`, `em`, `underline`, `strike`, `textColor`, `highlight`, Zeilen 110-147). |
| 0.2 | `commands.ts` kein Link-Command, Muster `applyMarkColor`/`clearMarkColor` (90-97/99-106) | **Bestätigt**, Zeilen exakt. |
| 0.3 | `Toolbar.tsx:135-244` kein Link-Button; `WordEditor.tsx:71-79` Keymap ohne `Mod-k` | **Bestätigt.** Toolbar-Buttons Zeilen 135-244 exakt wie referenziert. Keymap-Objekt tatsächlich Zeilen 72-79 (nicht 71-79 — Zeile 71 ist `state: EditorState.create({`, das Keymap-Objekt selbst beginnt Zeile 72); inhaltlich trifft die Aussage zu, kein `Mod-k`. |
| 0.4 | `docx/reader.ts` `decodeParagraphRuns` (124-143) liest nur direkte `<w:r>`-Kinder von `<w:p>`, verschluckt `<w:hyperlink>`-verschachtelte Läufe komplett | **Bestätigt, empirisch reproduziert.** `childElements(pEl, w, 'r')` (Zeile 126, nutzt `Array.from(el.children)`, Zeile 16) filtert nach `child.namespaceURI === ns && child.localName === localName` — ein `<w:r>`, dessen Elternelement `<w:hyperlink>` statt `<w:p>` ist, wird von diesem Aufruf nie gefunden. Gegen die reale Fixture `tests/fixtures/external/docx/rtl.docx` verifiziert: `readDocx()` auf diese Datei angewendet lässt sämtlichen verlinkten Text (u. a. „الإسبانية", „دولة ذات سيادة" — durchgehend Wikipedia-Linktexte) ersatzlos verschwinden, nur der unverlinkte Fülltext bleibt übrig. |
| 0.5 | `odt/reader.ts` `decodeInline`/`walk` (96-116) kennt `text:span`/`line-break`/`s`/`tab`, nicht `text:a` | **Bestätigt, empirisch reproduziert.** Gegen `tests/fixtures/external/odt/hyperlink.odt` verifiziert: Datei enthält den Linktext hinter `<text:a xlink:href="http://www.heise.de/">`; `readOdt()` liefert diesen Textteil aktuell nicht im Ergebnis (die `if/else if`-Kette in `walk`, Zeilen 104-115, hat keinen Zweig für `localName === 'a'`, das Element wird beim `for`-Loop über `pEl.childNodes` in Zeile 118 zwar besucht, aber von keinem Zweig behandelt — auch der rekursive Abstieg in Kind-Knoten unterbleibt, da kein Zweig ihn auslöst). |
| 0.6 | `docx/writer.ts` `runPropertiesXml` (18-31) kennt kein `link`; `inlineToRuns` (39-65) hat keine `<w:hyperlink>`-Wrapper-Ebene | **Bestätigt**, Zeilen exakt. |
| 0.7 | `docx/relationships.ts`: `RELATIONSHIP_TYPES` (34-42) ohne `hyperlink`; `Relationship`-Interface (1-5)/`serialize()` (23-31) ohne `TargetMode` | **Bestätigt**, Zeilen exakt. **Zusätzlicher, in der Anforderung nicht genannter Fund:** `serialize()` escaped `rel.target` überhaupt nicht (Zeile 25) — siehe Abschnitt 2.1, kritisch für Grenzfall 4.6/5.1.1. |
| 0.8 | `odt/writer.ts` `runPropsFromMarks` (25-36)/`inlineToOdt` (46-59) kennen nur die 6 Marks aus 0.6, kein `<text:a>` | **Bestätigt**, Zeilen exakt. |
| 0.9 | Keine Tests erwähnen „hyperlink"/`w:hyperlink`/`text:a` | **Bestätigt** per Volltextsuche (`Grep` über `src/formats/**/__tests__` und `tests/e2e`). |
| 0.10 | Sechs reale ODT-Fixtures vorhanden; für DOCX „kein Dateiname gefunden, der eindeutig auf Hyperlink-Inhalt hindeutet" | **ODT-Teil bestätigt** — alle sechs genannten Dateien existieren (`hyperlink.odt`, `hyperlinkSpaces.odt`, `hyperlinkSpacesNoUnderline.odt`, `hyperlink_destination.odt`, `Hyperlink-AOO401.odt`, `invalid_simple_overlapping_hyperlinks.odt`). **DOCX-Teil widerlegt/veraltet:** Namens-Stichprobe war zutreffend (kein Dateiname *heißt* „hyperlink"), aber **Inhaltsprüfung** (`unzip -p *.docx word/document.xml \| grep w:hyperlink` über alle 127 Fixtures) findet **12 Dateien mit echtem `<w:hyperlink>`**: `56392.docx`, `58618.docx`, `61991.docx`, `TestDocument.docx`, `WordWithAttachments.docx`, `bug59058.docx`, `bug65649.docx`, `bug65738.docx`, `delins.docx`, `drawing.docx`, `rtl.docx`, `smarttag-snippet.docx`. Siehe Abschnitt 6.3 für die konkrete Testzuordnung — **keine externe Fixture-Beschaffung nötig**, im Widerspruch zur Vermutung der Anforderung. |
| — | Zusätzlich (nicht in der Anforderung erwähnt): Struktur von `hyperlink_destination.odt` | **Korrektur:** Diese Datei enthält entgegen ihres Namens **keinen einzigen** `<text:a>` (per Volltextsuche verifiziert) — nur `<text:span>`-Formatierung ohne Link. Vermutlich als *Ziel*-Dokument eines externen Cross-Dokument-Links gedacht (Name deutet auf „ist das Sprungziel", nicht „enthält einen Link"). Für diese Anforderung liefert die Datei daher keinen Testwert für den Import-Pfad — bleibt trotzdem Teil des in 5.2.5 geforderten Fixture-Durchlaufs (muss lediglich **nicht abstürzen**, nichts Zusätzliches nachweisen). |
| — | Zusätzlich: `bug65738.docx` enthält `w:anchor`-Links **ohne** `r:id` | **Neuer Fund, wertvoll für 3.13/Grenzfall 4.17:** Diese eine Datei deckt sowohl den externen (`r:id`, `rId7`-`rId10`) als auch den internen (`w:anchor="OnLevel3"`/`"OnMainHeading"`, kein `r:id`) Fall gleichzeitig ab — ideale, bereits vorhandene Testfixture für beide Zweige von 3.13, keine synthetische Konstruktion nötig. |

**Fazit Abschnitt 1:** Die Ist-Stand-Tabelle der Anforderung ist bis auf die DOCX-
Fixture-Einschätzung in Befund 0.10 zutreffend; diese eine Stelle wird hiermit
korrigiert (Fixtures bereits vorhanden, siehe oben).

---

## 2. Neu gefundene Probleme und Entwurfsfallen (nicht in der Anforderung benannt)

### 2.1 Kritisch: `RelationshipRegistry.serialize()` escaped `Target` nicht

**Datei:** `src/formats/docx/relationships.ts:23-31`.

```ts
serialize(): string {
  const entries = this.relationships
    .map((rel) => `<Relationship Id="${rel.id}" Type="${rel.type}" Target="${rel.target}"/>`)
    .join('')
  ...
}
```

Bisher folgenlos, weil jedes bisher verwendete `target` (Bild-Dateiname, `styles.xml`,
`header1.xml`, …) garantiert keine XML-Metazeichen enthält. Eine externe Hyperlink-URL
kann `&`, `"`, `<` enthalten (z. B. die in Anforderung 5.1.1 explizit vorgeschriebene
Test-URL `https://example.com/pfad?x=1&y=2`) — ohne Fix entsteht **nicht parsebares**
`document.xml.rels` (`Target="...x=1&y=2"` ist ungültiges XML, `&y` ist keine gültige
Entität). Muss zusammen mit der `hyperlink`-Erweiterung gefixt werden (Abschnitt 4.2).

### 2.2 `hard_break` verliert Marks in beiden Readern/Writern (vorbestehend, jetzt blockierend)

Unabhängig von Hyperlinks bereits heute ein Bug: Ein `hard_break`-Knoten, der z. B. fett
formatiert wäre, verliert diese Information beim Export **und** beim Import:

- `docx/reader.ts:132-133`: `else if (... 'br') { runs.push({ kind: 'break' }) }` — setzt
  nie `marks`, obwohl `marksFromRunProperties(rPr)` (Zeile 128) für denselben Lauf
  bereits berechnet vorliegt.
- `docx/reader.ts:188`: `runsToInline` mappt Break-Runs auf `{ type: 'hard_break' }`
  ohne `marks`-Feld.
- `docx/writer.ts:58-61`: `inlineToRuns`, Zweig `hard_break` — `runs.push('<w:r><w:br/></w:r>')`,
  ruft nie `runPropertiesXml(...)` auf.
- `odt/reader.ts:108-109`: `walk`-Funktion, Zweig `text:line-break` — `result.push({ type: 'hard_break' })`,
  ignoriert das im selben Funktionsaufruf verfügbare `marks`-Argument.
- `odt/writer.ts:50`: `inlineToOdt`, `if (node.type === 'hard_break') return '<text:line-break/>'` —
  liest `node.marks` nie.

**Warum das jetzt zum Blocker wird:** Grenzfall 4.10 verlangt, dass ein Link, der einen
`hard_break` einschließt, die Rundreise übersteht, ohne in zwei separate
`<w:hyperlink>`/`<text:a>`-Elemente zu zerfallen. Ohne Fix würde der `hard_break`-Knoten
beim Export als linkloser Lauf zwischen zwei verlinkten Läufen landen und beim
Reimport die Verlinkung an dieser Stelle unterbrechen. Fix in Abschnitt 4.7/4.8/4.11/4.12
— behebt nebenbei den vorbestehenden allgemeinen Marks-Verlust, nicht nur den
hyperlink-spezifischen Fall.

### 2.3 `Mark.setFrom` dedupliziert nicht — Risiko doppelter `link`-Marks bei verschachtelten `<text:a>`

**Quelle:** `node_modules/prosemirror-model/dist/index.js:537-545`.

```js
static setFrom(marks) {
  if (!marks || Array.isArray(marks) && marks.length == 0) return Mark.none;
  if (marks instanceof Mark) return [marks];
  let copy = marks.slice();
  copy.sort((a, b) => a.type.rank - b.type.rank);
  return copy;
}
```

`setFrom` **sortiert nur nach Rang**, es dedupliziert nicht und wendet keine
`excludes`-Regeln an (das passiert nur in `Mark.addToSet`, das hier nicht aufgerufen
wird). Ein JSON-`marks`-Array mit zwei Einträgen vom Typ `link` (unterschiedliche
`href`) würde unverändert in einen strukturell inkonsistenten Knoten übernommen.

**Warum das real ist, nicht nur theoretisch:** `tests/fixtures/external/odt/
invalid_simple_overlapping_hyperlinks.odt` enthält genau diese Struktur (empirisch
verifiziert):

```xml
<text:a xlink:href="http://www.heise.de" xlink:type="simple">
  <text:span text:style-name="a2ff138">www.
    <text:a xlink:href="www.mopo.de" xlink:type="simple">heise</text:a>
  .de</text:span>
</text:a>
```

Ein naiver, rekursiver `text:a`-Handler, der bei jedem `text:a`-Element bedingungslos
ein neues `link`-Mark anhängt, würde für den Text „heise" zwei `link`-Marks erzeugen.
**Fix:** Guard in `odt/reader.ts` — sobald `marks` beim Abstieg bereits ein `link`-Mark
enthält, wird kein zweites hinzugefügt (äußerstes `<text:a>` gewinnt deterministisch,
Text bleibt in jedem Fall vollständig erhalten). Siehe Abschnitt 4.11. Für DOCX
strukturell nicht erforderlich: `<w:hyperlink>` kann laut OOXML-Content-Model kein
weiteres `<w:hyperlink>` enthalten (nur `<w:r>`/`<w:bookmarkStart>`/u. Ä.), verschachtelte
Hyperlinks sind auf dieser Ebene gar nicht konstruierbar — kein Guard nötig.

### 2.4 Round-Trip-Falle: Standardoptik darf nicht als impliziter Mark reimportiert werden

Sowohl für DOCX (3.12) als auch ODT (3.14) verlangt die Anforderung eine Entscheidung
zwischen Zeichenformatvorlage und direktem Inline-Styling für die blau/unterstrichene
Standardoptik. Beide Varianten sind gültiges Markup — aber **direktes Inline-Styling
auf demselben Lauf, der auch den `link`-Mark trägt, ist beim Reimport nicht von einer
tatsächlich vom Nutzer gesetzten `textColor`/`underline`-Formatierung unterscheidbar.**

Konkret: Schriebe der Writer unconditionally `<w:color w:val="0563C1"/><w:u w:val="single"/>`
in die `<w:rPr>` jedes `<w:hyperlink>`-Laufs, würde der **unveränderte** bestehende
Reader (`marksFromRunProperties`, `docx/reader.ts:99-114`) daraus ein **explizites**
`textColor`+`underline`-Mark rekonstruieren. Nach einem Export/Reimport-Zyklus hätte
dann *jeder* Link zusätzlich zwei explizite Marks, die vorher nicht da waren. Das
verletzt konkret:

- 3.8 / Grenzfall: „Entfernen des Links" muss den Text auf reine, unformatierte
  Darstellung zurücksetzen (sofern keine anderen Marks explizit gesetzt wurden) — nach
  einer Rundreise bliebe der Text fälschlich dauerhaft blau/unterstrichen, weil
  `removeLink()` nur den `link`-Mark entfernt, die inzwischen „explizit" gewordenen
  `textColor`/`underline`-Marks aber unberührt lässt.
- 5.1.3 „Link + Fett + Schriftfarbe … Rundreise erhält alle drei Merkmale gemeinsam,
  nicht versehentlich … aufgeteilt" — wird durch einen vierten, ungewollten Mark
  verfälscht.

**Auflösung (siehe Abschnitt 3.4 für die vollständige Design-Entscheidung):** Writer
referenziert für die Standardoptik ausschließlich eine **eigens reservierte, per Namen
erkennbare** Zeichenformatvorlage (DOCX: `w:styleId="Hyperlink"`, ODT: `Internet_20_Link`,
letzteres bewusst identisch zur echten LibreOffice-Konvention gewählt). Beide Reader
werden angewiesen, **aus dieser einen reservierten Vorlage niemals** ein `textColor`-
oder `underline`-Mark abzuleiten — der `link`-Mark entsteht ausschließlich aus dem
Wrapper-Element selbst (`<w:hyperlink>`/`<text:a>`), nie aus der referenzierten
Formatvorlage. Für DOCX ist dafür **kein Reader-Code-Pfad überhaupt betroffen**, da
`marksFromRunProperties` schon heute `w:rStyle` an keiner Stelle auswertet (nur direkte
Formatierungselemente). Für ODT **ist** ein expliziter Guard nötig, da
`parseAutomaticStyles`/`decodeInline` referenzierte Text-Stile grundsätzlich in Marks
übersetzen (Abschnitt 4.11).

### 2.5 Bereits kostenlos korrektes Verhalten (keine zusätzliche Implementierung nötig, nur Testabdeckung)

Drei der in der Anforderung als zu klärend/zu verifizieren aufgeführten Punkte sind
bereits durch bestehende ProseMirror-Kernsemantik korrekt abgedeckt:

1. **Grenzfall 2 (gemischte Selektion, Abschnitt 3.1):** `Transform.addMark(from, to, mark)`
   ruft für jeden betroffenen Inline-Knoten `mark.addToSet(node.marks)` auf. Da ein
   `MarkSpec` ohne explizites `excludes` **sich selbst** ausschließt (ProseMirror-
   Default, `MarkType.excludes` Default = eigener Name), ersetzt `addToSet` jedes
   bereits vorhandene `link`-Mark (unabhängig von dessen `href`) durch das neue —
   automatisch, ohne Sonderfall-Code. Eine gemischte Selektion (teils andere URL, teils
   unverlinkt) erhält dadurch **von selbst** einheitlich die neue URL.
2. **Grenzfall 3 (Selektion über Bild-/Tabellengrenze):** `Transform.addMark` überspringt
   Knoten mit `!node.isInline` explizit (`prosemirror-transform`-Quelle:
   `if (!node.isInline) return`). Da `image` in diesem Schema `group: 'block'` ist (kein
   `inline: true`, `schema.ts:45-72`), wird ein `image`-Knoten von `addMark` nie
   berührt — Selektionen über eine Bildgrenze hinweg können nicht abstürzen und wenden
   den Mark korrekt nur auf die textuellen Inline-Anteile an, ganz ohne Zusatzcode.
3. **Kein Blocker, aber zu dokumentieren:** Diese beiden Punkte werden in Abschnitt 6
   trotzdem mit eigenen Tests abgesichert (die Anforderung verlangt ausdrücklich einen
   „Testfall"-Nachweis, nicht nur eine Verhaltensgarantie).

### 2.6 Header/Footer-Hyperlinks: bekannte, vorbestehende Grenze (nicht neu eingeführt)

`readDocx()` übergibt für Kopf-/Fußzeilen-Inhalt dieselbe `documentRels`-Map wie für den
Hauptteil (`docx/reader.ts:367`, `:376`), obwohl Kopf-/Fußzeilen-Teile in echten OOXML-
Dateien eigene `_rels`-Teile haben können (`word/_rels/header1.xml.rels`). Das ist
**bereits heute** exakt dieselbe Einschränkung für Bilder in Kopf-/Fußzeilen (nicht neu
durch dieses Feature). Für Hyperlinks bedeutet das: Ein Link *innerhalb* einer
Kopf-/Fußzeile, dessen `r:id` nur in der kopf-/fußzeilen-eigenen `.rels`-Datei
aufgelöst werden kann, liefert `target = undefined` → Fallback-Pfad greift (Text bleibt
erhalten, kein `link`-Mark) — kein Absturz, kein Textverlust, aber auch kein
funktionierender Link. Bewusst **nicht** im Rahmen dieses Features behoben (wäre eine
Erweiterung der Kopf-/Fußzeilen-Infrastruktur selbst, siehe `kopfzeile-bearbeiten-req.md`),
hier nur dokumentiert, damit es nicht unbemerkt als Hyperlink-spezifischer Bug
missverstanden wird.

---

## 3. Bewertung der in der Anforderung offen gelassenen Fragen

### 3.1 Bedienelement 3/Grenzfall 1 (kein Text markiert) — Entscheidung: Variante (b), Dialog mit Anzeigetext-Feld

Gewählt wird **(b)**: Der Dialog öffnet sich auch ohne Selektion, zeigt in diesem Fall
zusätzlich ein Pflichtfeld „Anzeigetext". Begründung: Variante (a) (Button/Shortcut
deaktiviert) entspricht nicht dem in Word/Google Docs etablierten Verhalten und würde
den in 3.9/Bedienelement 2 geforderten Strg+K-Shortcut in einem alltäglichen Fall
(Cursor irgendwo im Text, kein markierter Bereich, Nutzerin will trotzdem einen Link
einfügen) folgenlos machen — das widerspricht dem „kein stiller Fehlschlag"-Prinzip
eher, als es zu erfüllen. Leeres Anzeigetext-Feld bei Bestätigung → Inline-Fehlermeldung,
kein `onConfirm`, Dialog bleibt offen (erfüllt 3.16 exakt für diesen Teilfall).

### 3.2 Abschnitt 3.3 (URL ohne Protokoll) — Entscheidung: automatisch `https://` voranstellen

Wie in Word/Google Docs: eine eingegebene URL ohne erkennbares Schema (kein
`^[a-zA-Z][a-zA-Z0-9+.-]*:`-Präfix) und ohne führendes `#`, `/`, `.` (also kein Anker,
kein absoluter/relativer Pfad) wird automatisch mit `https://` versehen. `mailto:`/`tel:`
werden dank vorhandenem Schema von dieser Regel nicht berührt (Grenzfall 7 damit erfüllt).
Implementierung in `normalizeHref` (Abschnitt 4.1).

### 3.3 Grenzfall 4.9 (`javascript:`) — Entscheidung: ablehnen mit sichtbarer Fehlermeldung, nicht still neutralisieren

Der Dialog validiert die eingegebene/eingefügte URL gegen eine Schema-Positivliste
(`http:`, `https:`, `mailto:`, `tel:`, sowie „kein Schema" → wird zu `https://`
normalisiert, sowie erkennbare relative/Anker-Formen `#…`, `/…`, `.…`). Trifft keine
dieser Formen zu (insbesondere `javascript:`, `data:`, `vbscript:`, `file:`), wird
**nicht** normalisiert/neutralisiert, sondern die Bestätigung **abgelehnt**: Inline-
Fehlermeldung „Dieses Link-Ziel wird nicht unterstützt.", kein `onConfirm`, kein Mark
gesetzt (erfüllt 3.16). Für den **Import-Pfad** (fremde DOCX-/ODT-Datei mit
`javascript:`-Ziel in Relationship-Target bzw. `xlink:href`) gilt die in 3.13/3.15
ohnehin geforderte Fallback-Logik: Reader verwirft nur den `href`, behält aber den
sichtbaren Text (kein stiller Datenverlust, kein XSS-fähiges `href` im DOM). Beide Pfade
nutzen dieselbe `sanitizeHref`-Funktion (Abschnitt 4.1).

### 3.4 Abschnitt 3.6/3.12/3.14 (Standardoptik: Formatvorlage vs. Inline) — Entscheidung: referenzierte Formatvorlage, kein direktes Inline-Styling

- **DOCX:** Neue Zeichenformatvorlage `w:styleId="Hyperlink"` in `styles.xml`
  (`<w:color w:val="0563C1"/><w:u w:val="single"/>` in ihrer `w:rPr`), referenziert über
  `<w:rStyle w:val="Hyperlink"/>` in der `w:rPr` jedes hyperlink-umschlossenen Laufs.
  **Keine** direkten `<w:color>`/`<w:u>`-Elemente auf demselben Lauf (siehe Abschnitt 2.4
  für die Begründung). Empirisch bestätigt an `56392.docx`: reale Word-Dateien
  referenzieren tatsächlich eine eigene Zeichenformatvorlage für Hyperlink-Text (dort
  lokalisiert als `w:rStyle w:val="Internetovodkaz"`, tschechisch für „Internetlink") —
  unser Reader ignoriert diesen Vorlagenverweis ohnehin vollständig (Abschnitt 2.4),
  unabhängig davon, welcher Name/welche Sprache referenziert wird.
- **ODT:** Analog eine reservierte Zeichenformatvorlage `Internet_20_Link` (bewusst
  identisch zur tatsächlichen LibreOffice-eigenen Namenskonvention für „Insert
  Hyperlink" gewählt — encodiert das Leerzeichen im Anzeigenamen „Internet Link" als
  `_20_`), referenziert über `<text:span text:style-name="Internet_20_Link">` **innerhalb**
  des `<text:a>`. Empirisch geprüft: keine der sechs vorhandenen Fixtures verwendet
  diesen Namen tatsächlich (sie nutzen generierte Automatik-Stilnamen wie `T1`,
  `ab92148`, `a2ff138`, oder — bei `Hyperlink-AOO401.odt` — **gar keine** explizite
  Formatierung). Das bestätigt indirekt, dass reale ODF-Konsumenten (Apache OpenOffice,
  LibreOffice) `<text:a>` teils *ohne* jede explizite Stilangabe blau/unterstrichen
  rendern (vermutlich anwendungsseitiger Default für dieses Element) — unsere eigene
  explizite Stilreferenz ist daher als zusätzliche, robuste Absicherung zu verstehen,
  nicht als Reproduktion eines beobachteten Fremdverhaltens.
- **Reader-seitige Konsequenz (siehe Abschnitt 4.11):** `odt/reader.ts` überspringt die
  Registrierung eines automatischen Text-Stils namens `Internet_20_Link` bei der
  Marks-Ableitung (der `link`-Mark entsteht ausschließlich aus `<text:a xlink:href>`
  selbst). Für **fremde** Dateien, die zufällig *ebenfalls* `Internet_20_Link` referenzieren
  (z. B. eine echte LibreOffice-Datei, deren Nutzer die Zeichenformatvorlage „Internet
  Link" individuell z. B. auf Grün angepasst hat), führt das zu einer **akzeptierten,
  dokumentierten Formatierungsnuance** (Standardoptik statt individueller Farbe wird
  übernommen) — laut Abnahmekriterium in Abschnitt 5 ausdrücklich zulässig, solange Text
  und URL selbst erhalten bleiben.

### 3.5 Abschnitt 3.9 (Klickverhalten) — Entscheidung: Klick abgefangen, Strg/Cmd+Klick öffnet in neuem Tab

Neues, dediziertes ProseMirror-Plugin (`linkClickPlugin.ts`, Abschnitt 4.5) mit
`handleClick`: einfacher Klick auf `<a href>` → `event.preventDefault()`, keine
Navigation, Caret-Platzierung bleibt native Browser-/ProseMirror-Funktion (nicht
Teil des Plugins, läuft unabhängig weiter — siehe Begründung in Abschnitt 4.5).
Strg/Cmd+Klick → zusätzlich `window.open(href, '_blank', 'noopener,noreferrer')`.
Doppelklick-Wortselektion (Grenzfall 19) bleibt unberührt, da kein `handleDoubleClick`
definiert wird und die native Browser-Doppelklick-Selektion unabhängig vom
`handleClick`-Pfad abläuft.

### 3.6 Bedienelement 7 (aktiver Zustand) — Entscheidung: exakt analog zu `MarkButton`, kein „gemischt"-Zustand

Anders als beim komplexeren `colorMarkStateFor` der Hervorhebungsfarbe-Funktion
verlangt Bedienelement 7 hier ausdrücklich nur „analog zu `MarkButton`s `aria-pressed`"
— das genügt: `isLinkActive(state)` prüft nur `$from.marks()`, exakt das bestehende
Muster aus `Toolbar.tsx:42`. Kein zusätzlicher „gemischt"-Zustand für den Button selbst
(der Dialog selbst behandelt eine uneinheitliche Selektion beim Vorbelegen separat,
Abschnitt 4.3).

---

## 4. Dateigenauer Umsetzungsplan

### 4.1 `src/formats/shared/url.ts` (neu)

Reine, DOM-unabhängige Funktionen (müssen identisch in Editor, DOCX-Reader und
ODT-Reader funktionieren):

```ts
const SAFE_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:'])
const SCHEME_RE = /^([a-zA-Z][a-zA-Z0-9+.-]*):/

/**
 * Rejects dangerous/unrecognized URL schemes before a value is allowed into the
 * `link` mark's `href` — which flows directly into `toDOM`'s real `<a href>` and can
 * be re-serialized into exported DOCX/ODT files. Returns null (never a mutated/escaped
 * string) so callers can distinguish "rejected" from "accepted as-is", per the
 * "reject with visible feedback" decision in hyperlink-einfuegen-code.md §3.3.
 * Deliberately permissive for anything else: bare host+path ("beispiel.de"),
 * protocol-relative, relative paths ("../x.docx"), and anchors ("#bookmark") are all
 * accepted unchanged — see §3.3/Anforderung 3.3's explicit "not required to resolve,
 * must not crash" stance on relative targets.
 */
export function sanitizeHref(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const match = SCHEME_RE.exec(trimmed)
  if (!match) return trimmed // no scheme at all -> caller decides on https:// prefixing
  const scheme = match[1].toLowerCase() + ':'
  return SAFE_SCHEMES.has(scheme) ? trimmed : null
}

/**
 * Applies the Word/Google-Docs-style "no scheme -> assume https://" convention
 * (§3.2), but leaves anchors/relative/absolute paths and any already-schemed URL
 * (including mailto:/tel:) untouched. Must be called only on a value that already
 * passed `sanitizeHref` (or is scheme-less to begin with).
 */
export function normalizeHref(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return trimmed
  if (SCHEME_RE.test(trimmed)) return trimmed
  if (/^[/#.]/.test(trimmed)) return trimmed // anchor, absolute path, or relative path
  return `https://${trimmed}`
}
```

### 4.2 `src/formats/docx/relationships.ts` (geändert)

```ts
import { escapeXml } from './xmlUtil'

export interface Relationship {
  id: string
  type: string
  target: string
  targetMode?: 'External'
}

export class RelationshipRegistry {
  private relationships: Relationship[] = []
  private counter = 0

  add(type: string, target: string, targetMode?: 'External'): string {
    this.counter += 1
    const id = `rId${this.counter}`
    this.relationships.push({ id, type, target, targetMode })
    return id
  }

  all(): Relationship[] {
    return this.relationships
  }

  serialize(): string {
    const entries = this.relationships
      .map(
        (rel) =>
          `<Relationship Id="${rel.id}" Type="${rel.type}" Target="${escapeXml(rel.target)}"` +
          `${rel.targetMode ? ` TargetMode="${rel.targetMode}"` : ''}/>`,
      )
      .join('')
    return (
      `<?xml version="1.0" encoding="UTF-8"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${entries}</Relationships>`
    )
  }
}

export const RELATIONSHIP_TYPES = {
  officeDocument: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument',
  styles: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles',
  numbering: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering',
  header: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/header',
  footer: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer',
  image: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image',
  coreProperties: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/metadata/core-properties',
  hyperlink: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink',
} as const
```

`escapeXml` on `rel.target` is a **behavior-preserving** fix for every existing caller
(image/header/footer/styles/numbering targets never contain XML metacharacters, so
`escapeXml` is a no-op there) — verified by re-running the existing roundtrip/external-
fixture suites, which must stay green unmodified.

### 4.3 `src/formats/shared/editor/commands.ts` (geändert)

Neue Typen/Funktionen, ergänzt am Ende der Datei; bestehender Inhalt (`setAlign` …
`clearMarkColor`) bleibt unverändert. `run`/`runCommand` wird **hierher verschoben**
(aus `Toolbar.tsx`, siehe 4.4) — kleine Reuse-Bereinigung, da `WordEditor.tsx` (4.6) für
die Dialog-Bestätigung dieselbe Ein-Zeilen-Logik (Command ausführen + `view.focus()`)
braucht und sie sonst dupliziert würde.

```ts
export function runCommand(view: EditorView, command: Command) {
  command(view.state, view.dispatch)
  view.focus()
}

export function isLinkActive(state: EditorState): boolean {
  return !!wordSchema.marks.link.isInSet(state.selection.$from.marks())
}

/**
 * Finds the full [from, to) range and href of the contiguous same-href `link` mark
 * instance covering `pos` — used both for "Strg+K with only a caret inside an existing
 * link" (§3.4) and for caret-only removal (§3.5). A caret exactly between two nodes
 * counts as "inside" the link if the node *before* it carries the mark (mirrors the
 * $from.marks() convention used elsewhere in this file for toolbar active-state).
 * Only scans within the immediate parent textblock — marks never span block
 * boundaries in ProseMirror, so this is complete by construction.
 */
export function linkRangeAt(doc: PMNode, pos: number): { from: number; to: number; href: string } | null {
  const linkType = wordSchema.marks.link
  const $pos = doc.resolve(pos)
  const parent = $pos.parent
  const parentStart = $pos.start()

  let index = $pos.index()
  let mark = $pos.nodeBefore && linkType.isInSet($pos.nodeBefore.marks)
  if (mark) index -= 1
  else mark = $pos.nodeAfter && linkType.isInSet($pos.nodeAfter.marks)
  if (!mark) return null
  const href = mark.attrs.href as string
  const sameLink = (node: PMNode) => {
    const m = linkType.isInSet(node.marks)
    return !!m && m.attrs.href === href
  }

  let startIndex = index
  let endIndex = index + 1
  while (startIndex > 0 && sameLink(parent.child(startIndex - 1))) startIndex -= 1
  while (endIndex < parent.childCount && sameLink(parent.child(endIndex))) endIndex += 1

  let from = parentStart
  for (let i = 0; i < startIndex; i++) from += parent.child(i).nodeSize
  let to = from
  for (let i = startIndex; i < endIndex; i++) to += parent.child(i).nodeSize
  return { from, to, href }
}

/** Selection-wide prefill helper (nice-to-have beyond the spec's literal minimum in
 * Bedienelement 4): if a non-empty selection is *entirely* covered by one uniform
 * link href, prefill that href instead of opening the dialog empty. */
function uniformLinkHrefInRange(state: EditorState): string | null {
  const { from, to } = state.selection
  let href: string | null | undefined
  let uniform = true
  state.doc.nodesBetween(from, to, (node) => {
    if (!node.isText) return
    const mark = wordSchema.marks.link.isInSet(node.marks)
    const value = mark ? (mark.attrs.href as string) : null
    if (href === undefined) href = value
    else if (href !== value) uniform = false
  })
  return uniform && href ? href : null
}

export interface LinkDialogRequest {
  mode: 'edit' | 'insert'
  initialHref: string
}

/** Pure decision function shared by the toolbar button click and the Mod-K keymap
 * binding (§4.6) so both paths always agree on which dialog mode to open. */
export function buildLinkDialogRequest(state: EditorState): LinkDialogRequest {
  const { empty, from } = state.selection
  if (!empty) return { mode: 'edit', initialHref: uniformLinkHrefInRange(state) ?? '' }
  const range = linkRangeAt(state.doc, from)
  return range ? { mode: 'edit', initialHref: range.href } : { mode: 'insert', initialHref: '' }
}

/** Applies `href` to the current selection, or — if the selection is empty but the
 * caret sits inside an existing link — to that link's full contiguous range (§3.4).
 * Returns false (no-op, no dispatch) only when the caret is empty and not inside any
 * link; the dialog never reaches that case in 'edit' mode (§4.4 always resolves to
 * 'insert' mode instead), so this is a defensive fallback, not a normal path. */
export function setLink(href: string): Command {
  return (state, dispatch) => {
    const { from, to, empty } = state.selection
    const linkMark = wordSchema.marks.link.create({ href })
    if (!empty) {
      if (dispatch) dispatch(state.tr.addMark(from, to, linkMark))
      return true
    }
    const range = linkRangeAt(state.doc, from)
    if (!range) return false
    if (dispatch) dispatch(state.tr.addMark(range.from, range.to, linkMark))
    return true
  }
}

/** Removes the link mark only, preserving every other mark and all text (§3.5). */
export function removeLink(): Command {
  return (state, dispatch) => {
    const { from, to, empty } = state.selection
    if (!empty) {
      if (dispatch) dispatch(state.tr.removeMark(from, to, wordSchema.marks.link))
      return true
    }
    const range = linkRangeAt(state.doc, from)
    if (!range) return false
    if (dispatch) dispatch(state.tr.removeMark(range.from, range.to, wordSchema.marks.link))
    return true
  }
}

/** No-selection "insert new linked text at the caret" path (§3.2 option b). Inherits
 * the caret's other active marks (e.g. bold) via `Mark.addToSet` rather than
 * `replaceSelectionWith`'s own `inheritMarks` flag, because that flag *replaces* the
 * inserted node's marks wholesale with the caret's stored marks — which would silently
 * drop the just-created `link` mark instead of adding to it. */
export function insertLinkText(href: string, text: string): Command {
  return (state, dispatch) => {
    if (!text) return false
    if (dispatch) {
      const { $from } = state.selection
      const activeMarks = state.storedMarks || $from.marks()
      const marks = wordSchema.marks.link.create({ href }).addToSet(activeMarks)
      const node = wordSchema.text(text, marks)
      dispatch(state.tr.replaceSelectionWith(node, false).scrollIntoView())
    }
    return true
  }
}
```

(`PMNode` = `import type { Node as PMNode } from 'prosemirror-model'`, `Command`/
`EditorState` bereits importiert.)

### 4.4 `src/formats/shared/schema.ts` (geändert)

Neuer Mark `link`, eingefügt **zwischen `strike` und `textColor`** — die Position ist
kein kosmetisches Detail: ProseMirror weist jedem Mark einen `rank` in
Registrierungsreihenfolge zu (`MarkType.compile`), `Mark.addToSet` sortiert danach
(`prosemirror-model/dist/index.js:453`), und `DOMSerializer.serializeFragment`
verschachtelt das Mark mit dem **niedrigsten** Rang **außen**, das mit dem höchsten
**innen** (direkt an der Textkante) — verifiziert am Quellcode,
`prosemirror-model/dist/index.js:3271-3297`. Da für vererbte CSS-Eigenschaften wie
`color` die dem Text **nächstgelegene** explizite Deklaration gewinnt, muss `link`
einen **niedrigeren** Rang als `textColor` haben, damit eine explizit gesetzte
`textColor` (weiter innen) die implizite Link-Farbe (weiter außen) optisch
überschreibt — exakt die in Anforderung 3.8 geforderte Kaskadenlogik. Reihenfolge nach
dieser Änderung: `strong, em, underline, strike, link, textColor, highlight`.

```ts
link: {
  attrs: { href: { validate: 'string' } },
  // Word/Google-Docs behavior: typing right after a link must not silently extend
  // it — a well-known ProseMirror link-mark gotcha (the default `inclusive: true`
  // would otherwise make freshly-typed text after the link inherit the mark).
  inclusive: false,
  // No explicit `excludes`: defaults to the mark's own name, meaning two `link`
  // instances (any hrefs) exclude each other automatically — this is exactly what
  // makes Grenzfall 4.2 ("mixed selection -> uniform new URL") work for free via
  // plain `addMark`, see hyperlink-einfuegen-code.md §2.5.
  parseDOM: [
    {
      tag: 'a[href]',
      getAttrs: (dom) => {
        const safe = sanitizeHref((dom as HTMLElement).getAttribute('href') || '')
        return safe ? { href: safe } : false // `false` -> rule doesn't match; the
        // <a> wrapper contributes no mark, but (matching the pre-existing behavior
        // already relied on by textColor/highlight's parseDOM below) its text
        // content is still parsed as plain inline content, not dropped.
      },
    },
  ],
  toDOM(mark) {
    return ['a', { href: mark.attrs.href, title: mark.attrs.href, style: 'color: #0563C1; text-decoration: underline' }, 0]
  },
},
```

`normalizeHref` wird bewusst **nicht** in `parseDOM` aufgerufen (nur `sanitizeHref`) —
Paste-Normalisierung soll keine bereits-vollständigen fremden URLs verändern; das
`https://`-Voranstellen (§3.2) ist eine reine Dialog-Eingabe-Konvention, keine
Parse-Regel.

### 4.5 `src/formats/shared/editor/linkClickPlugin.ts` (neu)

```ts
import { Plugin } from 'prosemirror-state'

/**
 * Plain click on linked text must not navigate away from the editor (§3.9) — otherwise
 * a link, once created, could never be clicked again to place the caret inside it for
 * editing. Ctrl/Cmd+click opens the target in a new tab, the Word/Google-Docs
 * convention this requirement explicitly asks for.
 *
 * `event.preventDefault()` inside `handleClick` suppresses the anchor's native
 * navigation because ProseMirror invokes this prop synchronously from its own native
 * `click` listener on the editable DOM — the same event whose default action is the
 * navigation. It does *not* suppress native caret placement (that's resolved by the
 * browser as part of the underlying mousedown/mouseup, before this handler runs) or
 * ProseMirror's own double-click word-selection (a separate `handleDoubleClick` prop,
 * not touched here) — so Grenzfall 19 (double-click still selects the word) is
 * unaffected by design, not by accident.
 */
export function createLinkClickPlugin() {
  return new Plugin({
    props: {
      handleClick(view, _pos, event) {
        const target = (event.target as HTMLElement).closest?.('a[href]')
        if (!target || !view.dom.contains(target)) return false
        const href = target.getAttribute('href')
        if (!href) return false
        event.preventDefault()
        if (event.ctrlKey || event.metaKey) {
          window.open(href, '_blank', 'noopener,noreferrer')
        }
        return true
      },
    },
  })
}
```

### 4.6 `src/formats/shared/editor/LinkDialog.tsx` (neu)

Kompletter neuer Dialog, kein bestehender Code wiederverwendbar (`PrivacyModal.tsx` hat
laut `tabelle-einfuegen-code.md` §-Fund weder Fokus-Falle noch Escape-/Backdrop-
Behandlung — dieselbe Einschränkung gilt hier, der noch nicht gebaute
`InsertTableDialog.tsx` aus jenem Plan existiert ebenfalls noch nicht im Repo, siehe
Verifikation unten). Struktur bewusst analog zum dortigen Muster gehalten, damit ein
später gebauter `InsertTableDialog` und dieser Dialog konsistent wirken, auch wenn
keiner den anderen tatsächlich importiert.

```tsx
interface LinkDialogProps {
  mode: 'edit' | 'insert'
  initialHref: string
  onConfirm: (result: { href: string; text?: string }) => void
  onCancel: () => void
  onRemove: (() => void) | null // null when mode==='insert' or there is no existing link to remove
}

export function LinkDialog({ mode, initialHref, onConfirm, onCancel, onRemove }: LinkDialogProps) {
  const [href, setHref] = useState(initialHref)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const hrefInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { hrefInputRef.current?.focus() }, [])

  function submit() {
    const trimmed = href.trim()
    if (!trimmed) { setError('Bitte eine URL eingeben.'); return } // Grenzfall 4: leeres Feld -> keine Änderung, sichtbare Rückmeldung
    if (mode === 'insert' && !text.trim()) { setError('Bitte einen Anzeigetext eingeben.'); return }
    const safe = sanitizeHref(trimmed)
    if (safe === null) { setError('Dieses Link-Ziel wird nicht unterstützt.'); return } // Grenzfall 4.9
    const normalized = normalizeHref(safe)
    onConfirm(mode === 'insert' ? { href: normalized, text: text.trim() } : { href: normalized })
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { e.preventDefault(); onCancel(); return }
    if (e.key === 'Enter') { e.preventDefault(); submit(); return }
    if (e.key === 'Tab') {
      // Focus trap: cycle within the dialog's own focusable elements only.
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('input, button')
      if (!focusable || focusable.length === 0) return
      const first = focusable[0], last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="link-dialog-title"
        onKeyDown={onKeyDown}
        className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl p-4 w-80 flex flex-col gap-3"
      >
        <h2 id="link-dialog-title" className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          {mode === 'insert' ? 'Link einfügen' : 'Link bearbeiten'}
        </h2>
        {mode === 'insert' && (
          <label className="text-sm flex flex-col gap-1">
            Anzeigetext
            <input value={text} onChange={(e) => setText(e.target.value)} className="border rounded px-2 py-1 text-sm" />
          </label>
        )}
        <label className="text-sm flex flex-col gap-1">
          Ziel-URL
          <input
            ref={hrefInputRef}
            value={href}
            onChange={(e) => setHref(e.target.value)}
            placeholder="https://beispiel.de"
            className="border rounded px-2 py-1 text-sm"
          />
        </label>
        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        <div className="flex justify-between items-center gap-2 pt-1">
          {onRemove ? (
            <button type="button" onClick={onRemove} className="text-sm text-red-600 hover:underline">Link entfernen</button>
          ) : <span />}
          <div className="flex gap-2">
            <button type="button" onClick={onCancel} className="px-3 py-1 text-sm rounded border">Abbrechen</button>
            <button type="button" onClick={submit} className="px-3 py-1 text-sm rounded bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900">Übernehmen</button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

**Verifiziert:** `InsertTableDialog.tsx` existiert **nicht** im Repo (`Glob` liefert
keinen Treffer) — `tabelle-einfuegen-code.md` ist selbst nur ein Plan, kein
umgesetzter Code; `Toolbar.tsx` ruft `insertTable(2, 2)` nach wie vor direkt auf
(Zeile 234). Dieser Plan baut `LinkDialog.tsx` daher unabhängig, nicht als Import aus
jenem (noch nicht existierenden) Modul.

### 4.7 `src/formats/shared/editor/Toolbar.tsx` (geändert)

1. `run(...)`-Aufrufe (aktuell lokal definiert, Zeilen 23-26) durch `runCommand` aus
   `commands.ts` ersetzen (Import ergänzen, lokale Funktion entfernen) — mechanisches
   Search-&-Replace `run(view,` → `runCommand(view,` an allen bestehenden Stellen
   (Zeilen 51, 73, 107, 148, 156, 168, 176, 197, 208, 219, 234).
2. Neue Props: `Toolbar` erhält `onRequestLink: (req: LinkDialogRequest) => void`
   zusätzlich zu `view`.
3. Neue Komponente `LinkButton`:

```tsx
function LinkButton({ view, onRequestLink }: { view: EditorView; onRequestLink: (req: LinkDialogRequest) => void }) {
  const active = isLinkActive(view.state)
  return (
    <button
      type="button"
      title="Link einfügen"
      aria-label="Link einfügen"
      aria-pressed={active}
      onMouseDown={(e) => {
        e.preventDefault()
        onRequestLink(buildLinkDialogRequest(view.state))
      }}
      className={`px-2 py-1 rounded text-sm border ${active ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-neutral-100 dark:text-neutral-900' : 'border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'}`}
    >
      <LinkIcon />
    </button>
  )
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false" fill="currentColor">
      <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" />
    </svg>
  )
}
```

(Material-Icons-Glyphe „link", Apache-2.0 — folgt derselben Icon-Quelle/Lizenz wie
`BoldIcon` in `fett-code.md` §4.2, erfüllt Anforderung Bedienelement 1/Abschnitt 20.1.)

4. Einbau in die Toolbar-JSX, eigene Gruppe nahe Tabelle/Bild (analog zur in der
   Anforderung vorgeschlagenen Platzierung):

```tsx
<div className="w-px h-5 bg-neutral-300 dark:bg-neutral-700 mx-1" />
<LinkButton view={view} onRequestLink={onRequestLink} />
```

### 4.8 `src/formats/shared/editor/WordEditor.tsx` (geändert)

1. Neue Imports: `LinkDialog`, `LinkDialogRequest`, `buildLinkDialogRequest`, `setLink`,
   `removeLink`, `insertLinkText`, `runCommand` aus `commands.ts`; `createLinkClickPlugin`
   aus `./linkClickPlugin`.
2. Neuer State + Ref (die Keymap-Closure wird nur einmal beim Mount erzeugt, siehe
   bestehender `useEffect` mit leerem Deps-Array, Zeile 62-114 — sie braucht daher eine
   Ref, um trotzdem die *aktuelle* State-Setter-Funktion zu erreichen, exakt das
   bestehende Muster von `onChangeRef`, Zeile 58-59):

```tsx
const [linkDialog, setLinkDialog] = useState<LinkDialogRequest | null>(null)
const setLinkDialogRef = useRef(setLinkDialog)
setLinkDialogRef.current = setLinkDialog
```

3. Im `keymap({...})`-Objekt (Zeile 72-79) ergänzen:

```ts
'Mod-k': (state) => {
  setLinkDialogRef.current(buildLinkDialogRequest(state))
  return true
},
```

4. Plugins-Array (Zeile 69-86) ergänzen: `createLinkClickPlugin(),` (Reihenfolge
   unkritisch, nach `gapCursor()` einreihen).
5. `Toolbar`-Aufruf (Zeile 118) erweitert um die neue Prop:
   `<Toolbar view={viewRef.current} onRequestLink={setLinkDialog} />`.
6. Dialog als Geschwisterelement gerendert (nach der Toolbar-Zeile, unabhängig von der
   Seiten-`div`-Verschachtelung, damit `fixed inset-0` nicht durch einen positionierten
   Vorfahren beeinflusst wird):

```tsx
{linkDialog && viewRef.current && (
  <LinkDialog
    mode={linkDialog.mode}
    initialHref={linkDialog.initialHref}
    onCancel={() => setLinkDialog(null)}
    onRemove={linkDialog.mode === 'edit' && linkDialog.initialHref ? () => {
      runCommand(viewRef.current!, removeLink())
      setLinkDialog(null)
    } : null}
    onConfirm={(result) => {
      const view = viewRef.current!
      if (linkDialog.mode === 'insert') runCommand(view, insertLinkText(result.href, result.text!))
      else runCommand(view, setLink(result.href))
      setLinkDialog(null)
    }}
  />
)}
```

**Wichtig — Regressionsfall 4.14 (Selection-Sync-Bug):** Das Öffnen/Schließen des
Dialogs verändert `view.state.selection` selbst **nicht** (die Dialog-Eingabefelder
sind eigene DOM-Knoten außerhalb von `view.dom`, kein Fokuswechsel *innerhalb* des
Editors passiert dabei). Der Fix aus `WordEditor.tsx:42-53` (Mouseup-Reconciliation)
bleibt unverändert wirksam für den *nächsten* echten Klick in den Editor nach
Dialog-Schließen — genau der in Grenzfall 4.14 geforderte Ablauf (Selektieren → Dialog
→ Bestätigen → Klick zur Neupositionierung → Tippen) durchläuft exakt denselben
Mechanismus wie der bereits bestehende Regressionstest, nur mit „Link-Dialog
bestätigen" statt „Fett-Button klicken" als Zwischenschritt — deshalb kein
zusätzlicher Fix nötig, nur ein zusätzlicher Testfall (Abschnitt 6.5).

### 4.9 `src/formats/docx/styleDefs.ts` (geändert)

```ts
export const HYPERLINK_STYLE_ID = 'Hyperlink'

function hyperlinkStyleXml(): string {
  return (
    `<w:style w:type="character" w:styleId="${HYPERLINK_STYLE_ID}"><w:name w:val="Hyperlink"/>` +
    `<w:rPr><w:color w:val="0563C1"/><w:u w:val="single"/></w:rPr>` +
    `</w:style>`
  )
}

export function headingStylesXml(extraStylesXml = ''): string {
  const styles = Object.entries(HEADING_FONT_SIZES)
    .map(([level, size]) => { /* unchanged */ })
    .join('')
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:styles ${WORD_NAMESPACE_DECLARATIONS}>` +
    `<w:docDefaults/>` +
    `<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>` +
    styles +
    extraStylesXml +
    `</w:styles>`
  )
}
```

`extraStylesXml` bekommt einen Default (`''`), damit kein anderer Aufrufer bricht —
aktuell gibt es nur den einen Aufrufer in `writer.ts` (Abschnitt 4.10).

### 4.10 `src/formats/docx/writer.ts` (geändert)

1. Imports ergänzen: `HYPERLINK_STYLE_ID`, `hyperlinkStyleXml` (letzteres nicht
   exportiert — stattdessen `headingStylesXml(hyperlinkStyleXml())` unten aufrufen;
   `hyperlinkStyleXml` muss also doch exportiert werden, oder `writer.ts` ruft eine neu
   exportierte `styleDefs.ts`-Funktion `extraCharacterStylesXml()` auf — einfacher:
   `hyperlinkStyleXml` wird **exportiert**, Aufruf in `writeDocx` unten).
2. `runPropertiesXml` **unverändert** — sieht `link`-Marks nie, da diese vor dem Aufruf
   bereits herausgefiltert werden (Schritt 4 unten).
3. Neue Hilfsfunktionen, importiert aus `../shared/linkMark` (Abschnitt 4.14):
   `linkHrefOf`, `withoutLinkMark`.
4. `inlineToRuns` komplett ersetzt (zweiphasig — Phase 1 wie bisher, aber jetzt auch für
   `hard_break` und mit ordnungsunabhängigem Merge-Schlüssel; Phase 2 neu: Hyperlink-
   Gruppierung):

```ts
function marksKey(marks: JsonNode['marks']): string {
  return (marks ?? []).map((m) => `${m.type}:${JSON.stringify(m.attrs ?? {})}`).sort().join('|')
}

function runXml(text: string, marks: JsonNode['marks'], isLink: boolean): string {
  return `<w:r>${runPropertiesXml(marks, isLink ? HYPERLINK_STYLE_ID : undefined)}${encodeRunText(text)}</w:r>`
}

function breakXml(marks: JsonNode['marks'], isLink: boolean): string {
  return `<w:r>${runPropertiesXml(marks, isLink ? HYPERLINK_STYLE_ID : undefined)}<w:br/></w:r>`
}

interface RunPiece { xml: string; href: string | undefined }

function inlineToRuns(nodes: JsonNode[] | undefined, rels: RelationshipRegistry): string {
  if (!nodes) return ''
  const pieces: RunPiece[] = []
  let buffer: { text: string; marks: JsonNode['marks'] } | null = null

  const flush = () => {
    if (!buffer) return
    const href = linkHrefOf(buffer.marks)
    pieces.push({ xml: runXml(buffer.text, withoutLinkMark(buffer.marks), href !== undefined), href })
    buffer = null
  }

  for (const node of nodes) {
    if (node.type === 'text') {
      if (buffer && marksKey(buffer.marks) === marksKey(node.marks)) {
        buffer.text += node.text ?? ''
      } else {
        flush()
        buffer = { text: node.text ?? '', marks: node.marks }
      }
    } else if (node.type === 'hard_break') {
      flush()
      const href = linkHrefOf(node.marks)
      pieces.push({ xml: breakXml(withoutLinkMark(node.marks), href !== undefined), href })
    }
  }
  flush()

  // Phase 2: wrap contiguous same-href pieces in one <w:hyperlink>, one fresh
  // relationship per contiguous group — never merges two *different* hrefs
  // (Grenzfall 4.8), never reuses one rId across non-adjacent groups (§3.12).
  const out: string[] = []
  let i = 0
  while (i < pieces.length) {
    const href = pieces[i].href
    if (href === undefined) {
      out.push(pieces[i].xml)
      i += 1
      continue
    }
    let j = i
    let group = ''
    while (j < pieces.length && pieces[j].href === href) {
      group += pieces[j].xml
      j += 1
    }
    const relId = rels.add(RELATIONSHIP_TYPES.hyperlink, href, 'External')
    out.push(`<w:hyperlink r:id="${relId}">${group}</w:hyperlink>`)
    i = j
  }
  return out.join('')
}
```

5. Zwei Aufrufstellen anpassen (`blockToDocx`, Zeilen 101-104 und 106-110):
   `inlineToRuns(node.content)` → `inlineToRuns(node.content, rels)` (in beiden
   Zweigen `paragraph` und `heading`; `rels` ist dort bereits Funktionsparameter).
6. `writeDocx` (Zeile 249): `const stylesXml = headingStylesXml(hyperlinkStyleXml())`.

### 4.11 `src/formats/docx/reader.ts` (geändert)

1. Umbenennung `imageRels` → `documentRels` durchgängig in den Signaturen von
   `paragraphToBlocks`, `parseTable`, `readBodyChildren` (rein kosmetisch/Klarheit — der
   Parameter ist bereits heute derselbe typneutrale `Map<string,string>`, wird jetzt
   zusätzlich für Hyperlink-Auflösung verwendet; siehe Anforderung 3.13: „die Funktion
   selbst ist typneutral … nur ihr Ergebnis zusätzlich für Links konsultiert werden").
2. `RunLike`-Interface: `kind: 'text' | 'break' | 'image'` unverändert, `marks` bereits
   als optionales Feld vorhanden (Zeile 119) — genutzt jetzt auch für `'break'`.
3. `decodeParagraphRuns` (Zeilen 124-143) komplett ersetzt:

```ts
function decodeRunElement(rEl: Element, extraMarks: Array<{ type: string; attrs?: Record<string, unknown> }>): RunLike[] {
  const rPr = firstChildNS(rEl, OOXML_NAMESPACES.w, 'rPr')
  const marks = [...extraMarks, ...marksFromRunProperties(rPr)]
  const runs: RunLike[] = []
  for (const child of Array.from(rEl.children)) {
    if (child.namespaceURI === OOXML_NAMESPACES.w && child.localName === 't') {
      runs.push({ kind: 'text', text: child.textContent ?? '', marks: marks.length ? marks : undefined })
    } else if (child.namespaceURI === OOXML_NAMESPACES.w && child.localName === 'br') {
      runs.push({ kind: 'break', marks: marks.length ? marks : undefined })
    } else if (child.namespaceURI === OOXML_NAMESPACES.w && child.localName === 'drawing') {
      // Images stay block-level and mark-free in this schema (§2.5 / Grenzfall 3) —
      // a hyperlinked image loses only the "was this a link" fact, never the image
      // itself; out of scope per this feature's text-focused scope.
      const blip = child.getElementsByTagNameNS(OOXML_NAMESPACES.a, 'blip')[0]
      const relId = blip?.getAttributeNS(OOXML_NAMESPACES.r, 'embed') ?? undefined
      const docPr = child.getElementsByTagNameNS(OOXML_NAMESPACES.wp, 'docPr')[0]
      runs.push({ kind: 'image', imageRelId: relId, imageAlt: docPr?.getAttribute('name') ?? '' })
    }
  }
  return runs
}

function decodeParagraphRuns(pEl: Element, documentRels: Map<string, string>): RunLike[] {
  const runs: RunLike[] = []
  for (const child of Array.from(pEl.children)) {
    if (child.namespaceURI !== OOXML_NAMESPACES.w) continue
    if (child.localName === 'r') {
      runs.push(...decodeRunElement(child, []))
    } else if (child.localName === 'hyperlink') {
      const relId = child.getAttributeNS(OOXML_NAMESPACES.r, 'id')
      const target = relId ? documentRels.get(relId) : undefined
      // No r:id (internal w:anchor jump, §3.13/Grenzfall 4.17) or an unsafe/unresolved
      // target (§3.3/Grenzfall 4.9) both fall back the same way: the run's visible
      // text is still imported, just without a `link` mark — never silently dropped
      // (the Befund-0.4 bug this feature fixes).
      const safeHref = target ? sanitizeHref(target) : null
      const linkMarks = safeHref ? [{ type: 'link', attrs: { href: safeHref } }] : []
      for (const rEl of childElements(child, OOXML_NAMESPACES.w, 'r')) {
        runs.push(...decodeRunElement(rEl, linkMarks))
      }
    }
  }
  return runs
}
```

4. `runsToInline` (Zeilen 185-190) angepasst, damit `hard_break` seine Marks behält:

```ts
function runsToInline(runs: RunLike[]): JsonNode[] {
  return runs
    .filter((r) => r.kind !== 'image')
    .map((r) => (r.kind === 'break' ? { type: 'hard_break', marks: r.marks } : { type: 'text', text: r.text ?? '', marks: r.marks }))
    .filter((n) => n.type !== 'text' || n.text)
}
```

5. Aufrufstelle in `paragraphToBlocks` (Zeile 155): `decodeParagraphRuns(pEl)` →
   `decodeParagraphRuns(pEl, documentRels)`.

### 4.12 `src/formats/shared/linkMark.ts` (neu)

Von beiden Writern geteilte, winzige Hilfsfunktionen (vermeidet Duplikation zwischen
`docx/writer.ts` und `odt/writer.ts`):

```ts
export interface MarkJSON { type: string; attrs?: Record<string, unknown> }

export function linkHrefOf(marks: MarkJSON[] | undefined): string | undefined {
  return marks?.find((m) => m.type === 'link')?.attrs?.href as string | undefined
}

export function withoutLinkMark(marks: MarkJSON[] | undefined): MarkJSON[] | undefined {
  return marks?.filter((m) => m.type !== 'link')
}
```

### 4.13 `src/formats/odt/styleRegistry.ts` (geändert)

```ts
export const INTERNET_LINK_STYLE_NAME = 'Internet_20_Link' // matches LibreOffice's own
// real "Insert Hyperlink" convention (space in the display name "Internet Link"
// encoded as _20_) — see hyperlink-einfuegen-code.md §3.4 for why this exact name.

export function internetLinkStyleXml(): string {
  return (
    `<style:style style:name="${INTERNET_LINK_STYLE_NAME}" style:family="text">` +
    `<style:text-properties fo:color="#0563c1" style:text-underline-style="solid" ` +
    `style:text-underline-width="auto" style:text-underline-color="font-color"/>` +
    `</style:style>`
  )
}
```

### 4.14 `src/formats/odt/writer.ts` (geändert)

1. Import ergänzen: `INTERNET_LINK_STYLE_NAME`, `internetLinkStyleXml` aus
   `./styleRegistry`; `linkHrefOf`, `withoutLinkMark` aus `../shared/linkMark`.
2. `runPropsFromMarks` (Zeilen 25-36): Aufrufer übergeben künftig bereits
   `withoutLinkMark(marks)` (siehe unten) — die Funktion selbst bleibt unverändert
   (ein `link`-Eintrag würde ihre `for`-Schleife ohnehin ignorieren, das explizite
   Filtern an der Aufrufstelle ist dennoch klarer und symmetrisch zum DOCX-Pfad).
3. `inlineToOdt` (Zeilen 46-59) ersetzt:

```ts
function inlineToOdt(nodes: JsonNode[] | undefined, styles: TextStyleRegistry): string {
  if (!nodes) return ''
  interface Piece { xml: string; href: string | undefined }
  const pieces: Piece[] = nodes.map((node) => {
    if (node.type === 'hard_break') return { xml: '<text:line-break/>', href: linkHrefOf(node.marks) }
    if (node.type === 'text') {
      const text = encodeWhitespace(node.text ?? '')
      const styleName = styles.styleNameFor(runPropsFromMarks(withoutLinkMark(node.marks)))
      const xml = styleName ? `<text:span text:style-name="${styleName}">${text}</text:span>` : text
      return { xml, href: linkHrefOf(node.marks) }
    }
    return { xml: '', href: undefined }
  })

  const out: string[] = []
  let i = 0
  while (i < pieces.length) {
    const href = pieces[i].href
    if (href === undefined) {
      out.push(pieces[i].xml)
      i += 1
      continue
    }
    let j = i
    let group = ''
    while (j < pieces.length && pieces[j].href === href) {
      group += pieces[j].xml
      j += 1
    }
    out.push(
      `<text:a xlink:href="${escapeXml(href)}" xlink:type="simple">` +
        `<text:span text:style-name="${INTERNET_LINK_STYLE_NAME}">${group}</text:span></text:a>`,
    )
    i = j
  }
  return out.join('')
}
```

4. `buildContentXml` (Zeile 129-137): `office:automatic-styles`-Konkatenation um
   `internetLinkStyleXml()` erweitert:

```ts
`<office:automatic-styles>${paragraphAlignStyleDefs()}${headingStyleDefs()}${listStyleDefs()}${internetLinkStyleXml()}${styles.serializeDefs()}</office:automatic-styles>`
```

### 4.15 `src/formats/odt/reader.ts` (geändert)

1. `RunStyle`/`ParsedStyles` unverändert (kein neues Feld nötig — `link` entsteht nicht
   über den Stil-Mechanismus, siehe unten).
2. `parseAutomaticStyles` (Zeilen 36-77), `family === 'text'`-Zweig: reservierten
   Stilnamen überspringen (Abschnitt 2.4/3.4 — verhindert, dass unsere eigene
   Standardoptik-Stilreferenz beim Reimport zu einem expliziten `textColor`/`underline`-
   Mark wird):

```ts
if (family === 'text') {
  if (name === INTERNET_LINK_STYLE_NAME) continue
  const props = firstChildNS(styleEl, ODF_NAMESPACES.style, 'text-properties')
  // ... unverändert ...
}
```
(Import `INTERNET_LINK_STYLE_NAME` aus `./styleRegistry`.)

3. `decodeInline` (Zeilen 79-120), neuer Zweig in `walk` für `text:a`, **vor** dem
   bestehenden `text:span`-Zweig oder danach (Reihenfolge in der `if/else if`-Kette
   egal, da unterschiedliche `localName`):

```ts
} else if (el.namespaceURI === ODF_NAMESPACES.text && el.localName === 'a') {
  // Guard against structurally-invalid nested/overlapping <text:a> (real fixture:
  // invalid_simple_overlapping_hyperlinks.odt, §2.3) — Mark.setFrom does not
  // deduplicate same-type marks, so a naive unconditional append would produce two
  // `link` marks on the same text node. The outermost link wins deterministically;
  // text is preserved in every case regardless of which href "wins".
  const alreadyLinked = marks.some((m) => m.type === 'link')
  const rawHref = el.getAttributeNS(ODF_NAMESPACES.xlink, 'href')
  const safeHref = !alreadyLinked && rawHref ? sanitizeHref(rawHref) : null
  const childMarks = safeHref ? [...marks, { type: 'link', attrs: { href: safeHref } }] : marks
  for (const child of Array.from(el.childNodes)) walk(child, childMarks)
}
```
(Import `sanitizeHref` aus `../shared/url`.)

4. `walk`'s `text:line-break`-Zweig (Zeile 108-109) korrigiert, damit Marks nicht
   verloren gehen (Abschnitt 2.2):

```ts
} else if (el.namespaceURI === ODF_NAMESPACES.text && el.localName === 'line-break') {
  result.push({ type: 'hard_break', marks: marks.length ? marks : undefined })
}
```

---

## 5. Zusammenfassung der Design-Entscheidungen (zur Übernahme nach `hyperlink-einfuegen-req.md`)

1. **Leere Selektion → Dialog mit Anzeigetext-Feld** (Variante b), kein deaktivierter
   Button (§3.1).
2. **`https://`-Autopräfix** für schema-lose Eingaben, `mailto:`/`tel:`/Anker/relative
   Pfade unverändert (§3.2).
3. **`javascript:`/`data:`/`vbscript:`/`file:` werden abgelehnt** (sichtbare
   Fehlermeldung im Dialog, kein Commit), nicht still neutralisiert; beim Import wird
   nur der `href` verworfen, der Text bleibt (§3.3).
4. **Standardoptik über referenzierte Zeichenformatvorlage**, nicht direktes Inline-
   Styling — `w:styleId="Hyperlink"` (DOCX) bzw. `Internet_20_Link` (ODT); beide Reader
   ignorieren diese eine reservierte Vorlage explizit bei der Mark-Ableitung, um die
   in §2.4 beschriebene Round-Trip-Falle zu vermeiden (§3.4).
5. **Mark-Reihenfolge in `schema.ts`:** `link` zwischen `strike` und `textColor`,
   sodass eine explizit gesetzte `textColor` die implizite Link-Farbe optisch
   überschreibt (§4.4).
6. **Klick im Editor:** einfacher Klick editiert (keine Navigation), Strg/Cmd+Klick
   öffnet in neuem Tab (§3.5).
7. **Aktiver Zustand des Toolbar-Buttons:** exakt wie bei bestehenden `MarkButton`s
   (`$from.marks()`), kein zusätzlicher „gemischt"-Zustand (§3.6).
8. **Keine Kontextmenü-Integration, keine klassische Menüleiste** (Bedienelemente 10/11)
   — laut Anforderung ausdrücklich kein Blocker, hier bestätigt unverändert
   übernommen.
9. **DOCX-Fixture-Korrektur:** Befund 0.10 der Anforderung zur DOCX-Fixture-Lage wird
   korrigiert — 12 vorhandene Fixtures mit echtem `<w:hyperlink>` genügen, keine
   externe Beschaffung nötig.

---

## 6. Testplan (Zuordnung zu Abschnitt 5/6 der Anforderung)

### 6.1 `src/formats/shared/editor/__tests__/linkCommands.test.ts` (neu)

Unit-Tests direkt gegen `commands.ts`, ohne DOM/Editor — analog zum Umfang bestehender
Reader/Writer-Unit-Tests:

1. `linkRangeAt`: Cursor mitten in einem Link → korrekter `{ from, to, href }` über den
   **gesamten** zusammenhängenden Bereich, auch über mehrere Runs mit unterschiedlichen
   Zusatz-Marks (fett + nicht-fett, gleicher `href`) hinweg.
2. `linkRangeAt`: Cursor direkt zwischen zwei Links mit unterschiedlichem `href` →
   liefert den Link **vor** dem Cursor (Konvention wie `$from.marks()`).
3. `setLink` auf gemischte Selektion (teils Link A, teils Link B, teils unverlinkt) →
   gesamte Selektion trägt danach einheitlich die neue URL (Grenzfall 4.2, deckt §2.5
   Punkt 1 ab).
4. `setLink` mit leerer Selektion, Cursor in bestehendem Link → aktualisiert den
   **gesamten** Link-Bereich, nicht nur ab Cursor-Position (§3.4).
5. `removeLink` mit leerer Selektion, Cursor in bestehendem Link → entfernt Mark über
   den gesamten Bereich, andere Marks (z. B. `strong`) bleiben erhalten.
6. `insertLinkText` an einer Cursor-Position mit aktivem `strong`-Mark → neuer Text
   trägt **beide** Marks (`link` **und** `strong`), nicht nur eines von beiden.
7. `buildLinkDialogRequest`: leere Selektion außerhalb eines Links → `{ mode: 'insert' }`;
   leere Selektion in einem Link → `{ mode: 'edit', initialHref: <vorhandene URL> }`;
   nicht-leere Selektion → `{ mode: 'edit', initialHref: '' oder <einheitliche URL> }`.

### 6.2 `src/formats/shared/__tests__/url.test.ts` (neu)

1. `sanitizeHref`: `http://`, `https://`, `mailto:`, `tel:` → unverändert akzeptiert;
   `javascript:alert(1)`, `data:text/html,...`, `vbscript:...` → `null`.
2. `sanitizeHref`: gemischte Groß-/Kleinschreibung des Schemas (`JavaScript:`) → auch
   abgelehnt (Regex case-insensitive über `.toLowerCase()`).
3. `sanitizeHref`: schema-lose Eingabe (`beispiel.de`) → unverändert durchgereicht
   (Ablehnung ist Sache von `normalizeHref`/dem Dialog, nicht dieser Funktion).
4. `normalizeHref`: `beispiel.de` → `https://beispiel.de`; `mailto:a@b.de` unverändert;
   `#anker`, `/pfad`, `../datei.docx` unverändert (Grenzfall „relative Pfade").
5. Sehr lange URL (> 2000 Zeichen, Grenzfall 5) → beide Funktionen ohne Kürzung/Crash.

### 6.3 `src/formats/docx/__tests__/roundtrip.test.ts` (erweitert)

Neue `describe('DOCX round trip: hyperlinks')`-Sektion, Muster wie bestehende Tests
(`doc()`/`paragraph()`-Helper wiederverwendet):

1. Link auf einfachen Text → `<w:hyperlink r:id>` + Relationship mit
   `TargetMode="External"`, reimportiert liefert identisches `href`.
2. URL mit `&`, Anführungszeichen, Leerzeichen, Umlauten (Grenzfall 4.6) → Export
   erzeugt valides XML (kein Parse-Fehler beim Reimport-Schritt selbst, der bereits
   implizit ein XML-Parsing ist), `href` exakt erhalten.
3. Sehr lange URL (> 2000 Zeichen, Grenzfall 5) → erhalten, kein Crash.
4. `mailto:`/`tel:`-Ziel → erhalten, nicht mit `https://` präfigiert (setzt voraus, dass
   der Test die URL bereits normalisiert/mit Schema übergibt — Normalisierung ist
   Dialog-/UI-seitig, nicht Writer-seitig, siehe §3.2).
5. Link + Fett + Textfarbe gleichzeitig auf demselben Lauf (5.1.3) → alle drei Marks
   nach Rundreise gemeinsam vorhanden, **kein** zusätzliches `textColor`/`underline`
   durch die Standardoptik-Stilreferenz (deckt §2.4 als Regressionstest ab — dieser
   eine Test ist der wichtigste neue Test der gesamten Suite).
6. Zwei unmittelbar aufeinanderfolgende Links mit unterschiedlichem `href`, kein Text
   dazwischen (Grenzfall 4.8) → zwei getrennte `<w:hyperlink>`-Elemente, zwei getrennte
   Relationship-Einträge.
7. Link über einen `hard_break` hinweg (Grenzfall 4.10) → ein einziges
   `<w:hyperlink>`, das beide `<w:r>`-Läufe (Text vor/nach dem Umbruch) **und** den
   `<w:br/>`-Lauf selbst umschließt.
8. Link entfernt → Export enthält kein `<w:hyperlink>` mehr für diesen Bereich und
   keinen verwaisten Relationship-Eintrag (`documentRels.all()` enthält nur noch
   Einträge, die tatsächlich referenziert werden — Test prüft das `document.xml.rels`
   direkt).
9. Neuer Regressionstest **vor** der Fix-Implementierung geschrieben (Testplan-Punkt 1
   der Anforderung): minimaler `<w:hyperlink><w:r>...</w:r></w:hyperlink>`-String
   direkt gegen `readDocx()` (via `JSZip`, analog zu `docx.spec.ts`s
   `buildSampleDocx`-Muster) → dokumentiert, dass der **unreparierte** Reader den Text
   verliert; bleibt danach als dauerhafter Regressionsschutz in der Suite.

### 6.4 `src/formats/docx/__tests__/external-fixtures.test.ts` (erweitert)

Neue gezielte Assertions (zusätzlich zum bestehenden pauschalen „importiert ohne
Absturz"-Loop, der alle 127 Fixtures bereits abdeckt):

1. `rtl.docx` → mindestens ein `link`-Mark mit `href` beginnend `https://ar.wikipedia.org`
   im importierten Dokument vorhanden, **und** der sichtbare arabische Linktext ist
   Teil des Ergebnisses (Regressionstest für Befund 0.4 mit RTL/Unicode-Zusatzaspekt).
2. `56392.docx` → `mailto:klienti@livetelecom.cz`-Link korrekt aufgelöst.
3. `bug65738.docx` → enthält **sowohl** mindestens einen `link`-Mark mit `r:id`-basiertem
   `href` **als auch** Text aus den `w:anchor`-only-Hyperlinks (`OnLevel3`/
   `OnMainHeading`), letzterer **ohne** `link`-Mark, aber mit vollständig erhaltenem
   Text (deckt Grenzfall 4.17 mit einer echten Datei ab, kein synthetisches Fixture
   nötig).
4. Bestehender pauschaler Crash-Test deckt die übrigen 9 hyperlink-haltigen Fixtures
   bereits ab (`58618.docx`, `61991.docx`, `TestDocument.docx`,
   `WordWithAttachments.docx`, `bug59058.docx`, `bug65649.docx` — via
   `SKIP_SLOW_UNDER_JSDOM`, `delins.docx`, `drawing.docx`, `smarttag-snippet.docx`).

### 6.5 `src/formats/odt/__tests__/roundtrip.test.ts` (erweitert)

Analoge Struktur zu 6.3: `<text:a>`-Erzeugung, Reimport, Sonderzeichen-Escaping,
Entfernen, Fett+Farbe-Kombination (Regressionstest für §2.4 auf der ODT-Seite), Link
über `hard_break`, zwei getrennte Links ohne Zwischentext.

### 6.6 `src/formats/odt/__tests__/external-fixtures.test.ts` (erweitert)

1. `hyperlink.odt`, `hyperlinkSpaces.odt`, `hyperlinkSpacesNoUnderline.odt`,
   `Hyperlink-AOO401.odt` → jeweils mindestens ein `link`-Mark mit korrektem `href`
   **und** vollständig erhaltenem Linktext (Regressionstest für Befund 0.5, deckt
   Anforderung 5.2.5 ab).
2. `hyperlink_destination.odt` → **kein** Absturz; explizit dokumentiert (Kommentar im
   Test), dass diese Datei laut eigener Verifikation keinen `<text:a>` enthält und
   daher hier nur als Crash-Test, nicht als Link-Inhaltstest zählt (§1-Korrektur).
3. `invalid_simple_overlapping_hyperlinks.odt` → kein Absturz, Text „heise" (und
   umgebender Text „www."/".de") vollständig vorhanden, **genau ein** `link`-Mark pro
   Textknoten (kein doppelter Mark-Eintrag — Regressionstest für §2.3).

### 6.7 `tests/e2e/hyperlink.spec.ts` (neu)

Struktur analog zu `tests/e2e/docx.spec.ts`/`selection-regression.spec.ts`:

1. Text markieren → Toolbar-Button „Link einfügen" klicken → Dialog erscheint, URL
   eingeben, „Übernehmen" → `a[href]` im DOM sichtbar, `title`-Attribut zeigt die URL.
2. Dieselbe Sequenz per `ControlOrMeta+k` statt Button-Klick.
3. Ohne Selektion (nur Cursor) → `ControlOrMeta+k` → Dialog zeigt zusätzliches
   Anzeigetext-Feld; beides ausfüllen, bestätigen → neuer verlinkter Text an
   Cursor-Position sichtbar.
4. Cursor in bestehenden Link setzen, `ControlOrMeta+k` → Dialog zeigt die **vorhandene**
   URL vorausgefüllt (Bedienelement 4).
5. „Link entfernen" im Dialog klicken → `a[href]` verschwindet aus dem DOM, Text
   bleibt unverändert sichtbar.
6. Leeres URL-Feld bestätigen → Dialog bleibt offen, Fehlermeldung sichtbar, kein
   DOM-Wechsel (Grenzfall 4).
7. `javascript:alert(1)` eingeben, bestätigen → Fehlermeldung sichtbar, kein `a[href]`
   mit diesem Wert im DOM (Grenzfall 4.9).
8. Escape schließt den Dialog ohne Änderung.
9. Undo (`Strg+Z`) direkt nach Link-Setzen → Link verschwindet, Text bleibt; Redo
   stellt ihn wieder her (inkl. exaktem `href`).
10. **Pflicht-Regressionssequenz (Grenzfall 4.14):** Text markieren → Link-Dialog
    öffnen und bestätigen → per Klick im Editor neu positionieren → Enter → weiter
    tippen → beide Absätze bleiben erhalten (exakt das Muster aus
    `selection-regression.spec.ts`, hier mit „Link setzen" statt „Fett" als
    Zwischenschritt).
11. Strg+Klick auf einen Link öffnet ein neues Tab (`page.waitForEvent('popup')`),
    einfacher Klick tut das **nicht** und platziert stattdessen den Cursor (nachfolgend
    Text eingeben, prüfen dass er an der Klickposition landet).
12. Doppelklick auf verlinkten Text selektiert das Wort (Grenzfall 19), löst keine
    Navigation aus.
13. Vollständiger Rundreisetest je Format (Datei-Upload via `filechooser`, Export via
    `page.waitForEvent('download')`, siehe §5.1/5.2 der Anforderung): Link setzen →
    exportieren → JSZip-Parse von `word/document.xml` + `word/_rels/document.xml.rels`
    (DOCX) bzw. `content.xml` (ODT) → erwartete Struktur direkt per unabhängigem
    String-/DOM-Parsing verifiziert (nicht nur über den eigenen Reader).
14. Cross-Format-Doppel-Rundreise (§5.3): DOCX mit Link → Editor → Export ODT → Import
    → Export DOCX → Link an derselben Textstelle mit derselben URL.

---

## 7. Reihenfolge der Umsetzung (Vorschlag)

1. `shared/url.ts`, `shared/linkMark.ts` (4.1, 4.12) — unabhängig, keine Vorbedingungen.
2. `docx/relationships.ts` (4.2) — kleiner, isolierter Fix, sofort mit Test 6.3 Punkt 2
   absicherbar (auch ohne Hyperlink-Feature reproduzierbar, sobald ein `&` in
   irgendeinem Relationship-Target landet — z. B. testweise mit einem manipulierten
   Header-Ziel).
3. `schema.ts` (4.4) — Mark-Definition inkl. Reihenfolge-Entscheidung.
4. `commands.ts` (4.3) — kann gegen die reine Schema-Änderung bereits unit-getestet
   werden (6.1), bevor UI/Reader/Writer existieren.
5. `docx/styleDefs.ts`, `docx/writer.ts`, `docx/reader.ts` (4.9-4.11) — DOCX-Pfad
   zuerst, da die meisten realen Fixtures (12 von 127) hier liegen und der
   Regressionstest (6.3 Punkt 9) sofort nach der Reader-Änderung grün werden muss.
6. `odt/styleRegistry.ts`, `odt/writer.ts`, `odt/reader.ts` (4.13-4.15) — analog für ODT.
7. `linkClickPlugin.ts`, `LinkDialog.tsx`, `Toolbar.tsx`, `WordEditor.tsx` (4.5-4.8) —
   UI zuletzt, da sie von allen vorherigen Schichten abhängt.
8. Testdateien aus Abschnitt 6 parallel zu den jeweiligen Implementierungsschritten
   (Regressionstests 6.3/9 und 6.4 **vor** dem jeweiligen Fix schreiben, wie in
   Testplan-Punkt 1 der Anforderung verlangt).
