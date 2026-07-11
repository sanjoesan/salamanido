# Umsetzungsplan: Feature „Hyperlink einfügen" (inkl. Bearbeiten/Entfernen) — Code-Abgleich und geplante Änderungen

Rolle: Entwickler-Antwort auf `specs/hyperlink-einfuegen-req.md`. Dieses Dokument prüft
den **tatsächlichen** Code-Stand (nicht nur die Behauptungen der Anforderung) und legt
fest, welche Dateien wie geändert bzw. neu angelegt werden. Stil orientiert an
`FEATURE-SPEC-DOCX-ODT.md` bzw. `specs/textmarker-farbe-code.md`. Kein Punkt hier ist
bereits umgesetzt — dies ist der Plan, nicht der Vollzug.

**Alle Zeilenangaben wurden am 2026-07-04 gegen den echten Dateiinhalt frisch
verifiziert** (ein früherer Entwurf dieses Plans zitierte durchgängig veraltete
Zeilennummern und — schwerwiegender — eine veraltete Reader-Architektur; beides ist
unten korrigiert, siehe insbesondere §2.7). Load-bearing ist wie in der Anforderung das
beschriebene Verhalten, nicht die exakte Zeile.

---

## 0. Kurzfassung

Der Befund „das bedienbare Feature fehlt komplett" aus Abschnitt 0 der Anforderung ist
**bestätigt** — es gibt weder Mark, noch Command, noch Toolbar-Button, noch Shortcut,
noch einen Schreibpfad, noch die `href`-Erfassung beim Lesen.

**Wichtige Richtigstellung gegenüber dem früheren Entwurf dieses Plans:** Der frühere
Entwurf behauptete, die beiden Reader hätten einen **stillen Textverlust-Bug bei
Fremddateien mit Links** und dieser sei „empirisch reproduziert". Das ist gegen den
**heutigen** Code **falsch** und deckt sich mit der ausdrücklichen Korrektur in
`hyperlink-einfuegen-req.md` §0.4/§0.5: Beide Reader **bewahren den Linktext bereits
vollständig** (DOCX über `collectRuns`, das in `<w:hyperlink>` absteigt,
`docx/reader.ts:207`; ODT über den `else`-Zweig in `walk`, der in jedes sonstige
Inline-Element inkl. `text:a` absteigt, `odt/reader.ts:160-167`). Die **einzige** echte
Lücke auf der Lese-Seite ist: Die **Ziel-URL** (`r:id`→Relationship bzw. `xlink:href`)
wird nirgends ausgewertet, es entsteht kein `link`-Mark. Es ist eine vollständige
**Funktionslücke**, **kein Datenverlust-Bug** — diese Unterscheidung ist load-bearing für
die Implementierungsart (additiv statt umschreibend, §2.7) und die Testauswahl (bestehende
Text-Erhalt-Tests bleiben grün, werden um `href`-Assertions **erweitert**, nicht ersetzt).

Die tatsächliche Codeprüfung deckt außerdem **sechs in der Anforderung nicht benannte,
zusätzliche Sachverhalte** auf, die für eine korrekte Umsetzung entscheidend sind
(Details in Abschnitt 2):

1. **`RelationshipRegistry.serialize()` (`docx/relationships.ts:23-31`) escaped `Target`
   überhaupt nicht** (`Target="${rel.target}"`, Z. 25). Bisher unproblematisch, weil alle
   bestehenden Ziele generierte, saubere Paketpfade sind. Eine externe Hyperlink-URL wie
   die in Anforderung 5.1.1 explizit geforderte `https://example.com/pfad?x=1&y=2` enthält
   ein rohes `&` — ohne Fix erzeugt der Export **ungültiges XML** in `document.xml.rels`
   (der allererste Rundreise-Testfall würde nicht bestehen).
2. **`hard_break` verliert Marks in beiden Readern und Writern** — ein vorbestehender,
   von Hyperlinks unabhängiger Bug (`docx/writer.ts:60-63`, `docx/reader.ts:178,285`;
   ODT `odt/reader.ts:150-151`, `odt/writer.ts:74`). Für Grenzfall 4.10 (Link über einen
   `hard_break` hinweg) muss das jetzt behoben werden, sonst zerfällt ein solcher Link
   nach Rundreise in zwei getrennte `<w:hyperlink>`/`<text:a>`.
3. **`Mark.setFrom` (ProseMirror-Kern) dedupliziert Marks gleichen Typs nicht** — bei der
   realen Fixture `invalid_simple_overlapping_hyperlinks.odt` (verschachtelte `<text:a>`,
   empirisch verifiziert, §1) erzeugte ein naiver Reader zwei `link`-Marks im selben
   `marks`-Array (inkonsistenter Knoten). Braucht einen Guard (§2.3/§4.15).
4. **Round-Trip-Falle bei der Standardoptik (3.12/3.14):** Schriebe der Writer die
   „blau/unterstrichen"-Optik **inline** (`<w:color>`/`<w:u>` bzw. `fo:color`/
   `text-underline-style`) in denselben Lauf, der den `link`-Mark trägt, rekonstruierte
   der eigene Reader daraus nach einer Rundreise fälschlich **explizite**
   `textColor`/`underline`-Marks — das bricht 3.8 und 5.1.3/5.1.4. Auflösung: referenzierte
   Zeichenformatvorlage statt Inline (§2.4/§3.4).
5. **Befund 0.10 der Anforderung zur DOCX-Fixture-Lage ist überholt** — eigene
   Inhaltsprüfung (§1, empirisch) findet **12 von 127** vorhandenen DOCX-Fixtures mit
   echtem `<w:hyperlink>`, darunter zwei besonders wertvolle Grenzfälle (`rtl.docx`:
   RTL/Unicode-URLs; `bug65738.docx`: **sowohl** `r:id`-externe Links **als auch** reine
   `w:anchor`-Links ohne `r:id`) — **keine externe Fixture-Beschaffung nötig.**
6. **Die Implementierung muss additiv sein, nicht umschreibend (§2.7).** Der DOCX-Reader
   hat heute eine mehrstufige Wrapper-Architektur (`collectRuns` → `decodeRunElement` →
   `decodeDrawingOrPict`), die tracked-changes (`w:del`/`w:ins`), Smart-Tags, Content-
   Controls (`w:sdt`), einfache Felder (`w:fldSimple`) und Textboxen/VML-Bilder bereits
   korrekt behandelt. Der `href` muss **durch** diese Architektur gefädelt werden (ein
   zusätzliches `extraMarks`-Argument), **nicht** durch Ersetzen von `decodeParagraphRuns`
   — sonst gehen genau diese bereits abgesicherten Fähigkeiten (und ihre Tests) verloren.

---

## 1. Verifikation der Befunde aus `hyperlink-einfuegen-req.md` Abschnitt 0

| # | Befund laut Anforderung | Ergebnis der frischen Prüfung (2026-07-04) |
|---|---|---|
| 0.1 | `schema.ts` kein `link`-Mark | **Bestätigt.** Marks-Block `schema.ts:157-196`: genau `strong` (158-163), `em` (164-169), `underline` (170-175), `strike` (176-181), `textColor` (182-188), `highlight` (189-195). Kein `link`, keine `a[href]`-`parseDOM`. |
| 0.2 | `commands.ts` kein Link-Command; Muster `applyMarkColor`/`clearMarkColor` | **Bestätigt.** `applyMarkColor` `commands.ts:106-113`, `clearMarkColor` `115-122`; beide verlangen nicht-leere Selektion (`if (empty) return false`, Z. 109/117). Kein Link-Command. |
| 0.3 | `Toolbar.tsx` kein Link-Button; `WordEditor.tsx` Keymap ohne `Mod-k` | **Bestätigt.** Toolbar-JSX `Toolbar.tsx:137-296` (F/K/U/S über `MarkButton` 55-89, Farbe, Ausrichtung, Listen, ⊞ Tabelle 277-289, 🖼 Bild 291-294) — kein Link-Button. Keymap-Objekt `WordEditor.tsx:77-99` bindet `Mod-z/y`, `Mod-Shift-z`, `Enter`, `Shift-Enter`, `Mod-b/i/u`, `Shift-Delete` — **kein** `Mod-k`; frei. |
| 0.4 | DOCX-Reader: Linktext bleibt erhalten, aber `href` wird verworfen | **Bestätigt — genau wie die *korrigierte* Fassung der Anforderung.** `collectRuns` (`docx/reader.ts:194-216`) steigt in `<w:hyperlink>` ab (Z. 207) → Text überlebt. Empirisch: `readDocx()` auf `rtl.docx` **behält** den arabischen Linktext (frühere Entwurfsbehauptung „Text verschwindet" ist **falsch/überholt**). Die einzige Lücke: `collectRuns` liest das `r:id`-Attribut des `<w:hyperlink>` nicht aus, `marksFromRunProperties` (100-115) kennt kein `link`. `readRelationships` (24-35) existiert und liefert bereits die typneutrale `Map<Id→Target>`. |
| 0.5 | ODT-Reader: Linktext bleibt erhalten, aber `href` wird verworfen | **Bestätigt — genau wie die *korrigierte* Fassung der Anforderung.** `walk` (`odt/reader.ts:138-168`) behandelt `text:span`/`line-break`/`s`/`tab`/Redline explizit und fängt **jedes andere** Inline-Element im `else`-Zweig (160-167) ab, der ausdrücklich in dessen Kind-Knoten absteigt (`for (const child …) walk(child, marks)`, Z. 166, im Kommentar namentlich für `text:a`). Text überlebt. Einzige Lücke: `xlink:href` von `text:a` wird nicht ausgewertet, kein `link`-Mark. |
| 0.6 | DOCX-Writer kein Link-Schreibpfad | **Bestätigt.** `runPropertiesXml` (`docx/writer.ts:20-33`) kennt nur die 6 Marks; `inlineToRuns` (41-67) gruppiert Textknoten nach `JSON.stringify(marks)` (Z. 54), keine `<w:hyperlink>`-Wrapper-Ebene. |
| 0.7 | `RELATIONSHIP_TYPES` ohne `hyperlink`; `Relationship`/`serialize()` ohne `TargetMode` | **Bestätigt.** `RELATIONSHIP_TYPES` `relationships.ts:34-42` (kein `hyperlink`); `Relationship` 1-5 und `serialize()` 23-31 ohne `TargetMode`. **Zusatzfund:** `serialize()` escaped `rel.target` gar nicht (Z. 25) — §2.1. |
| 0.8 | ODT-Writer kein Link-Schreibpfad; `xlink`-Namespace vorhanden | **Bestätigt.** `runPropsFromMarks` (`odt/writer.ts:32-43`)/`inlineToOdt` (70-83) kennen nur die 6 Marks, wrappen nur in `<text:span>`. `ODF_NAMESPACES.xlink` (`odt/xmlUtil.ts:17`) ist in `NAMESPACE_DECLARATIONS` (Z. 24) enthalten — keine neue Deklaration nötig. |
| 0.9 | Tests sichern nur Text-Erhalt, nicht `href` | **Bestätigt** per Volltextsuche über `src/formats/**/__tests__` und `tests/e2e` (kein `href`/`link`-Mark-Assert). Alle referenzierten Testdateien existieren (`docx/__tests__/{roundtrip,reader,external-fixtures}.test.ts`, `odt/__tests__/{roundtrip,external-fixtures}.test.ts`, `tests/e2e/{docx,selection-regression,complex-import-fidelity}.spec.ts`). |
| 0.10 | Sechs reale ODT-Fixtures; für DOCX keine belastbare Hyperlink-Fixture | **ODT bestätigt** (alle sechs Dateien existieren). **DOCX-Teil überholt:** Inhaltsprüfung (`unzip -p *.docx word/document.xml | grep w:hyperlink` über alle 127) findet **12 Dateien** mit echtem `<w:hyperlink>`: `56392`, `58618`, `61991`, `TestDocument`, `WordWithAttachments`, `bug59058`, `bug65649`, `bug65738`, `delins`, `drawing`, `rtl`, `smarttag-snippet`. **Keine externe Beschaffung nötig.** Zuordnung in §6.4. |
| — | Struktur `hyperlink_destination.odt` | **Zusatz-Korrektur:** enthält entgegen des Namens **null** `<text:a>` (verifiziert: `grep -c 'text:a '` → 0) — nur `<text:span>`-Formatierung. Als *Sprungziel*-Dokument gedacht. Liefert für den Import-Pfad **keinen** Link-Testwert; bleibt reiner Crash-Test (5.2.5). |
| — | `bug65738.docx`: `w:anchor`-Links **ohne** `r:id` | **Neuer Fund (wertvoll für 3.13/Grenzfall 4.17):** eine Datei deckt beide Zweige ab — extern (`r:id="rId7"`–`rId10`) **und** intern (`w:anchor="OnMainHeading"`/`"OnLevel3"`, kein `r:id`). Keine synthetische Konstruktion nötig. |
| — | `56392.docx`, `rtl.docx` Detailwerte | **Empirisch verifiziert** (für die punktgenauen Asserts in §6.4): `56392.docx` → `Target="mailto:klienti@livetelecom.cz"` und `w:rStyle w:val="Internetovodkaz"` (bestätigt §3.4: reale Word-Dateien referenzieren eine eigene Zeichenformatvorlage für Linktext); `rtl.docx` → `Target="https://ar.wikipedia.org/wiki/اللغة_الإسبانية"` mit External-Relationship. |

**Fazit Abschnitt 1:** Die Ist-Stand-Tabelle der *korrigierten* Anforderung ist bis auf
den DOCX-Fixture-Umfang (0.10) zutreffend; diese eine Stelle wird korrigiert (12 Fixtures
vorhanden). Der frühere Plan-Entwurf, der einen Datenverlust-Bug behauptete, wird hiermit
richtiggestellt (§2.7).

---

## 2. Neu gefundene Probleme und Entwurfsfallen (nicht in der Anforderung benannt)

### 2.1 Kritisch: `RelationshipRegistry.serialize()` escaped `Target` nicht

**Datei:** `src/formats/docx/relationships.ts:23-31`, konkret Z. 25:

```ts
.map((rel) => `<Relationship Id="${rel.id}" Type="${rel.type}" Target="${rel.target}"/>`)
```

Bisher folgenlos (jedes bisherige `target` — `media/image1.png`, `styles.xml`,
`header1.xml` — enthält keine XML-Metazeichen). Eine externe Hyperlink-URL kann `&`, `"`,
`<` enthalten (z. B. die in Anforderung 5.1.1 vorgeschriebene `https://example.com/pfad?x=1&y=2`).
Ohne Fix entsteht **nicht parsebares** `document.xml.rels`. Fix in §4.2 — `escapeXml` auf
`rel.target`, behavior-preserving für alle bestehenden Aufrufer.

### 2.2 `hard_break` verliert Marks in beiden Readern/Writern (vorbestehend, jetzt blockierend)

Unabhängig von Hyperlinks bereits heute ein Bug — ein fett/farbig formatierter
`hard_break` verliert diese Information bei Export **und** Import:

- `docx/reader.ts:178`: `decodeRunElement`, Zweig `br` → `out.push({ kind: 'break' })`,
  setzt nie `marks`, obwohl `marksFromRunProperties(rPr)` im selben Aufruf vorliegt.
- `docx/reader.ts:282-287`: `runsToInline` mappt Break-Runs auf `{ type: 'hard_break' }`
  ohne `marks`-Feld.
- `docx/writer.ts:60-63`: `inlineToRuns`, Zweig `hard_break` → `runs.push('<w:r><w:br/></w:r>')`,
  ruft nie `runPropertiesXml(...)` auf.
- `odt/reader.ts:150-151`: `walk`, Zweig `text:line-break` → `result.push({ type: 'hard_break' })`,
  ignoriert das im selben Aufruf verfügbare `marks`-Argument.
- `odt/writer.ts:74`: `inlineToOdt` → `if (node.type === 'hard_break') return '<text:line-break/>'`,
  liest `node.marks` nie.

**Warum jetzt Blocker:** Grenzfall 4.10 verlangt, dass ein Link über einen `hard_break`
hinweg die Rundreise übersteht, ohne in zwei `<w:hyperlink>`/`<text:a>` zu zerfallen. Ohne
Fix landet der `hard_break` als linkloser Lauf zwischen zwei verlinkten Läufen und
unterbricht die Verlinkung. Fix in §4.10/§4.11/§4.14/§4.15 — behebt nebenbei den
allgemeinen Marks-Verlust. (Anmerkung: `hard_break` ist im Schema ein Inline-Leaf ohne
`marks`-Restriktion, `schema.ts:42-56` — trägt daher schema-gültig jedes Mark inkl. `link`;
`Transform.addMark` legt das `link`-Mark auf den `hard_break` mit, da er `isInline`.)

### 2.3 `Mark.setFrom` dedupliziert nicht — Risiko doppelter `link`-Marks bei verschachtelten `<text:a>`

`Mark.setFrom` (prosemirror-model) sortiert nur nach `type.rank`, dedupliziert **nicht**
und wendet keine `excludes`-Regeln an (das tut nur `Mark.addToSet`, hier nicht im Spiel).
Ein JSON-`marks`-Array mit zwei `link`-Einträgen (verschiedene `href`) ginge unverändert
in einen inkonsistenten Knoten.

**Real, nicht theoretisch** — `invalid_simple_overlapping_hyperlinks.odt` enthält genau
diese Struktur (empirisch verifiziert, zwei `text:a`: `href="http://www.heise.de"` außen,
`href="www.mopo.de"` innen um den Text „heise"). Ein naiver, bedingungsloser rekursiver
`text:a`-Handler erzeugte für „heise" zwei `link`-Marks. **Fix:** Guard in
`odt/reader.ts` — steigt `walk` in ein `text:a` ab und enthält `marks` bereits ein
`link`-Mark, wird **kein** zweites hinzugefügt (äußerstes `<text:a>` gewinnt
deterministisch; Text bleibt in jedem Fall vollständig). §4.15.

Für DOCX strukturell nicht konstruierbar: `<w:hyperlink>` darf laut OOXML-Content-Model
kein weiteres `<w:hyperlink>` enthalten. Der additive Reader (§4.11) trägt den Guard
trotzdem billig mit (`extraMarks.some(m => m.type === 'link')`), rein defensiv gegen
Fuzzing-Fixtures.

### 2.4 Round-Trip-Falle: Standardoptik darf nicht als impliziter Mark reimportiert werden

Schriebe der Writer unbedingt `<w:color w:val="0563C1"/><w:u w:val="single"/>` in die
`<w:rPr>` jedes Hyperlink-Laufs, rekonstruierte der **unveränderte** Reader
(`marksFromRunProperties`, `docx/reader.ts:100-115`) daraus ein **explizites**
`textColor`+`underline`-Mark. Nach einem Export/Reimport-Zyklus trüge dann *jeder* Link
zwei explizite Zusatz-Marks. Das verletzt konkret:

- **3.8:** „Link entfernen" soll den Text auf die vorige Darstellung zurücksetzen — nach
  Rundreise bliebe er fälschlich dauerhaft blau/unterstrichen, weil `removeLink()` nur
  `link` entfernt, die „explizit" gewordenen `textColor`/`underline` aber nicht.
- **5.1.3:** „Link + Fett + Schriftfarbe … Rundreise erhält alle drei gemeinsam" — würde
  durch zwei ungewollte Zusatz-Marks verfälscht.

**Auflösung (Design in §3.4):** Writer referenziert die Standardoptik ausschließlich über
eine **eigens reservierte, per Namen erkennbare** Zeichenformatvorlage (DOCX
`w:styleId="Hyperlink"`, ODT `Internet_20_Link`), **kein** direktes Inline-Styling auf dem
Link-Lauf. Beide Reader leiten aus dieser Vorlage nie ein `textColor`/`underline`-Mark ab
— der `link`-Mark entsteht ausschließlich aus dem Wrapper-Element (`<w:hyperlink>`/
`<text:a>`). Für DOCX ist **kein** Reader-Pfad betroffen, da `marksFromRunProperties`
`w:rStyle` ohnehin an keiner Stelle auswertet (nur direkte Formatierungselemente;
empirisch: `56392.docx` referenziert `w:rStyle w:val="Internetovodkaz"`, was der Reader
heute schon ignoriert). Für ODT **ist** ein expliziter Guard nötig, da
`parseAutomaticStyles`/`decodeInline` referenzierte Text-Stile grundsätzlich in Marks
übersetzen (§4.15).

### 2.5 Bereits kostenlos korrektes Verhalten (keine Implementierung nötig, nur Testabdeckung)

1. **Grenzfall 2 (gemischte Selektion, 3.1):** `Transform.addMark(from, to, mark)` ruft je
   Inline-Knoten `mark.addToSet(node.marks)`. Da ein `MarkSpec` ohne explizites `excludes`
   **sich selbst** ausschließt (ProseMirror-Default = eigener Name), ersetzt `addToSet`
   jedes vorhandene `link`-Mark (egal welcher `href`) durch das neue — eine gemischte
   Selektion erhält **von selbst** einheitlich die neue URL, ohne Sonderfall-Code.
2. **Grenzfall 3 (Selektion über Bild-/Tabellengrenze):** `Transform.addMark` überspringt
   Knoten mit `!node.isInline`. `image` ist hier `group: 'block'` (kein `inline: true`,
   `schema.ts:58-85`) → wird von `addMark` nie berührt. Kein Absturz, `link` nur auf
   textuelle Inline-Anteile.
3. Beide werden in §6 dennoch mit eigenen Tests abgesichert (die Anforderung verlangt
   ausdrücklich einen „Testfall"-Nachweis).

### 2.6 Header/Footer-Hyperlinks: vorbestehende Grenze (nicht neu eingeführt)

`readDocx()` übergibt Kopf-/Fußzeilen-Inhalt dieselbe `documentRels`-Map wie dem Hauptteil
(`docx/reader.ts:520`, `:529`), obwohl Kopf-/Fußzeilenteile eigene `_rels` haben können
(`word/_rels/header1.xml.rels`). Das ist **bereits heute** exakt dieselbe Einschränkung
für **Bilder** in Kopf-/Fußzeilen (nicht neu durch dieses Feature). Symmetrisch auf der
Schreib-Seite: `writeDocx` legt alle Relationships (inkl. Bild) in **einen**
`documentRels`-Registry und serialisiert nach `word/_rels/document.xml.rels`; ein
`r:id`-Verweis aus `header1.xml` müsste eigentlich in `header1.xml.rels` stehen — dieselbe
vorbestehende Bild-Limitierung. Für Hyperlinks in Kopf-/Fußzeilen gilt daher: Text bleibt,
Link ggf. nicht aufgelöst — **bewusst nicht** Teil dieses Features (gehört zur
Kopf-/Fußzeilen-Infrastruktur, `kopfzeile-bearbeiten-req.md`), hier nur dokumentiert,
damit es nicht als Hyperlink-Bug missverstanden wird.

### 2.7 Kritisch: additiv fädeln, nicht `decodeParagraphRuns` ersetzen

Der DOCX-Reader ist seit der Import-Robustheit (`datei-oeffnen-req.md` §3.13) mehrstufig:

```
decodeParagraphRuns → collectRuns (steigt in del/ins/hyperlink/smartTag/sdt/fldSimple ab)
                        → decodeRunElement (t/br/drawing/pict)
                          → decodeDrawingOrPict (Bild vs. Textbox vs. opakes Objekt)
```

`collectRuns` (`docx/reader.ts:194-216`) **überspringt bewusst `<w:del>`** (getrackte
Löschung darf nicht wieder sichtbar werden, Z. 205-206), **steigt in `<w:ins>`,
`<w:smartTag>`, `<w:sdt>`/`<w:sdtContent>`, `<w:fldSimple>` ab** (Text überlebt) und
`decodeDrawingOrPict` behandelt Textboxen (`w:txbxContent`) und Legacy-VML-Bilder.
Bestehende Tests (`reader.test.ts` U-6: verschachtelt hyperlink→ins→sdt) sichern das ab.

Der `href` muss **durch** diese Kette gefädelt werden — ein zusätzliches, nach unten
durchgereichtes `extraMarks`-Argument, das nur der `<w:hyperlink>`-Zweig um ein
`link`-Mark ergänzt (§4.11). Ein Ersetzen von `decodeParagraphRuns` durch einen
vereinfachten Loop, der nur `r`/`hyperlink` kennt (wie ein früherer Entwurf dieses Plans
vorschlug), würde **`w:del`-Skip, `w:ins`/`w:smartTag`/`w:sdt`/`w:fldSimple`-Abstieg und
die gesamte Textbox-/VML-Behandlung löschen** und damit U-6 sowie mehrere
Fixture-Tests brechen. **Das ist der wichtigste Umsetzungshinweis dieses Plans.**

---

## 3. Bewertung der in der Anforderung offen gelassenen Fragen

### 3.1 Bedienelement 3/Grenzfall 1 (kein Text markiert) — Entscheidung: Variante (b), Dialog mit Anzeigetext-Feld

Gewählt wird **(b)**: Der Dialog öffnet sich auch ohne Selektion und zeigt dann
zusätzlich ein Pflichtfeld „Anzeigetext". Begründung: Variante (a) (Button/Shortcut
deaktiviert) macht den in Bedienelement 2 geforderten Strg+K-Shortcut im Alltagsfall
(Cursor im Text, nichts markiert) folgenlos — das widerspricht dem „kein stiller
Fehlschlag"-Prinzip (3.16) mehr, als es erfüllt. Leeres Anzeigetext-Feld bei Bestätigung →
Inline-Fehlermeldung, kein `onConfirm`, Dialog bleibt offen.

### 3.2 Abschnitt 3.3 (URL ohne Protokoll) — Entscheidung: automatisch `https://` voranstellen

Wie Word/Google Docs: eine Eingabe ohne erkennbares Schema (kein
`^[a-zA-Z][a-zA-Z0-9+.-]*:`) und ohne führendes `#`/`/`/`.` (kein Anker, kein
absoluter/relativer Pfad) wird mit `https://` versehen. `mailto:`/`tel:` bleiben dank
vorhandenem Schema unberührt (Grenzfall 7). Implementierung: `normalizeHref` (§4.1).

### 3.3 Grenzfall 4.9 (`javascript:`/`data:`) — Entscheidung: ablehnen mit sichtbarer Fehlermeldung, nicht still neutralisieren

Der Dialog validiert gegen eine Schema-Positivliste (`http:`, `https:`, `mailto:`, `tel:`
+ „kein Schema" → `https://` + erkennbare relative/Anker-Formen `#…`/`/…`/`.…`). Trifft
nichts zu (insb. `javascript:`, `data:`, `vbscript:`, `file:`), wird die Bestätigung
**abgelehnt** (Inline-Fehler „Dieses Link-Ziel wird nicht unterstützt.", kein `onConfirm`).
Für den **Import-Pfad** (fremde Datei mit `javascript:`-Ziel) gilt die Fallback-Logik aus
3.13/3.15: Reader verwirft nur den `href`, behält den Text (kein XSS-fähiges `href` im DOM,
kein Datenverlust). Beide Pfade nutzen dieselbe `sanitizeHref`-Funktion (§4.1).

### 3.4 Abschnitt 3.6/3.12/3.14 (Standardoptik) — Entscheidung: referenzierte Formatvorlage, kein Inline-Styling

- **DOCX:** neue Zeichenformatvorlage `w:styleId="Hyperlink"` in `styles.xml`
  (`<w:color w:val="0563C1"/><w:u w:val="single"/>`), referenziert über
  `<w:rStyle w:val="Hyperlink"/>` **als erstes Kind** der `<w:rPr>` jedes Hyperlink-Laufs.
  **Keine** direkten `<w:color>`/`<w:u>` auf demselben Lauf (§2.4). Der Reader ignoriert
  `w:rStyle` ohnehin (bestätigt an `56392.docx`).
- **ODT:** reservierte Zeichenformatvorlage `Internet_20_Link` (identisch zur
  LibreOffice-Konvention für „Insert Hyperlink"; Leerzeichen als `_20_`), referenziert über
  `<text:span text:style-name="Internet_20_Link">` **innerhalb** des `<text:a>`. Empirisch:
  keine der sechs Fixtures nutzt diesen Namen (sie nutzen `T1`/`a2ff138`/… oder — bei
  `Hyperlink-AOO401.odt` — gar keine explizite Formatierung; reale ODF-Renderer stellen
  `<text:a>` also teils anwendungsseitig blau/unterstrichen dar). Unsere Stilreferenz ist
  robuste Zusatzabsicherung, keine Reproduktion beobachteten Fremdverhaltens.
- **Reader-Konsequenz (§4.15):** `odt/reader.ts` überspringt die Marks-Registrierung eines
  Text-Stils namens `Internet_20_Link`. Fremde Dateien, die zufällig ebenfalls
  `Internet_20_Link` mit abweichender Farbe referenzieren, erhalten die Standardoptik statt
  der individuellen Farbe — eine laut Abnahmekriterium (§5) zulässige, dokumentierte
  Formatierungsnuance, solange Text und URL erhalten bleiben.

### 3.5 Abschnitt 3.9 (Klickverhalten) — Entscheidung: Klick abgefangen, Strg/Cmd+Klick öffnet neuen Tab

Neues ProseMirror-Plugin `linkClickPlugin.ts` (§4.5) mit `handleClick`: einfacher Klick auf
`<a href>` → `event.preventDefault()`, keine Navigation; Caret-Platzierung bleibt native
Browser-/ProseMirror-Funktion. Strg/Cmd+Klick → zusätzlich
`window.open(href, '_blank', 'noopener,noreferrer')`. Doppelklick-Wortselektion (Grenzfall
20) bleibt unberührt (kein `handleDoubleClick` definiert, native Selektion läuft
unabhängig). Verträglich mit `reconcileSelectionOnClick` (`WordEditor.tsx:43-50`), da
`handleClick` erst nach der Mouseup-Caret-Auflösung feuert.

### 3.6 Bedienelement 7 (aktiver Zustand) — Entscheidung: exakt analog zu `MarkButton`, kein „gemischt"-Zustand

`isLinkActive(state)` prüft nur `$from.marks()` — exakt das bestehende Muster aus
`Toolbar.tsx:69` (`markType.isInSet($from.marks())`). Kein zusätzlicher „gemischt"-Zustand
für den Button; die uneinheitliche Selektion wird nur beim Dialog-Vorbelegen separat
behandelt (§4.3).

---

## 4. Dateigenauer Umsetzungsplan

### 4.1 `src/formats/shared/url.ts` (neu)

Reine, DOM-unabhängige Funktionen (identisch in Editor, DOCX-Reader, ODT-Reader nutzbar):

```ts
const SAFE_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:'])
const SCHEME_RE = /^([a-zA-Z][a-zA-Z0-9+.-]*):/

/**
 * Rejects dangerous/unrecognized URL schemes before a value enters the `link` mark's
 * `href` — which flows into toDOM's real <a href> and into exported DOCX/ODT. Returns
 * null (never a mutated string) so callers can distinguish "rejected" from "accepted".
 * Permissive for everything else: bare host ("beispiel.de"), protocol-relative,
 * relative ("../x.docx") and anchors ("#bookmark") are accepted unchanged (§3.3).
 */
export function sanitizeHref(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const match = SCHEME_RE.exec(trimmed)
  if (!match) return trimmed // no scheme -> caller decides on https:// prefixing
  const scheme = match[1].toLowerCase() + ':'
  return SAFE_SCHEMES.has(scheme) ? trimmed : null
}

/**
 * Word/Google-Docs "no scheme -> assume https://" convention (§3.2); leaves
 * anchors/relative/absolute paths and any already-schemed URL (incl. mailto:/tel:)
 * untouched. Call only on a value that already passed sanitizeHref (or is scheme-less).
 */
export function normalizeHref(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return trimmed
  if (SCHEME_RE.test(trimmed)) return trimmed
  if (/^[/#.]/.test(trimmed)) return trimmed
  return `https://${trimmed}`
}
```

### 4.2 `src/formats/docx/relationships.ts` (geändert)

`escapeXml` auf `rel.target`, optionales `targetMode`, neuer Typ `hyperlink`:

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

  all(): Relationship[] { return this.relationships }

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
  // …bestehende sieben Einträge unverändert…
  hyperlink: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink',
} as const
```

`escapeXml` auf `rel.target` ist für jeden bestehenden Aufrufer **behavior-preserving**
(Bild-/Header-/Footer-/Styles-/Numbering-Ziele enthalten keine XML-Metazeichen, dort
No-Op) — durch erneutes Laufenlassen der bestehenden Roundtrip-/External-Fixture-Suiten
abzusichern (müssen unverändert grün bleiben).

### 4.3 `src/formats/shared/editor/commands.ts` (geändert)

Neue Importe: `import type { EditorView } from 'prosemirror-view'`, `import type { Node as
PMNode } from 'prosemirror-model'` (`Command`/`EditorState` sind bereits importiert).
Bestehender Inhalt (`setAlign` … `clearMarkColor`) unverändert; folgendes am Dateiende
ergänzen.

`runCommand` (geteilt von Toolbar-Refactor 4.7 und Dialog-Bestätigung 4.8) **muss das
dritte `view`-Argument durchreichen** — sonst bricht `cutSelection`, das `view` für
`execCommand('cut')` braucht (`commands.ts:150`):

```ts
export function runCommand(view: EditorView, command: Command) {
  command(view.state, view.dispatch, view) // 3. Argument zwingend, siehe cutSelection
  view.focus()
}

export function isLinkActive(state: EditorState): boolean {
  return !!wordSchema.marks.link.isInSet(state.selection.$from.marks())
}

/**
 * Full [from,to) range + href of the contiguous same-href link covering `pos` — used for
 * caret-only edit (§3.4) and caret-only removal (§3.5). A caret between two nodes counts
 * as inside the link if the node *before* it carries the mark (mirrors the $from.marks()
 * convention). Scans only within the parent textblock — marks never cross block
 * boundaries, so this is complete by construction.
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

/** If a non-empty selection is entirely covered by one uniform href, return it (prefill
 * for edit-mode); else null. Nice-to-have over Bedienelement 4's literal minimum. */
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

/** Shared by toolbar-button click and Mod-K keymap so both agree on dialog mode. */
export function buildLinkDialogRequest(state: EditorState): LinkDialogRequest {
  const { empty, from } = state.selection
  if (!empty) return { mode: 'edit', initialHref: uniformLinkHrefInRange(state) ?? '' }
  const range = linkRangeAt(state.doc, from)
  return range ? { mode: 'edit', initialHref: range.href } : { mode: 'insert', initialHref: '' }
}

/** Applies href to the selection, or — if empty but the caret is inside a link — to that
 * link's full contiguous range (§3.4). false only when the caret is empty and not inside
 * any link (defensive; the dialog resolves to 'insert' mode there, §4.3). */
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

/** Removes only the link mark, preserving every other mark and all text (§3.5). */
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

/** No-selection "insert new linked text at the caret" (§3.2 option b). Inherits the
 * caret's other active marks (e.g. bold) via addToSet rather than replaceSelectionWith's
 * inheritMarks flag, which would *replace* the node's marks wholesale and drop the just-
 * created link mark. */
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

### 4.4 `src/formats/shared/schema.ts` (geändert)

Import ergänzen: `import { sanitizeHref } from './url'`. Neuer Mark `link`, eingefügt
**zwischen `strike` (176-181) und `textColor` (182-188)** — die Position ist load-bearing:
ProseMirror weist Marks einen `rank` in Registrierungsreihenfolge zu, `DOMSerializer`
verschachtelt den Mark mit **niedrigerem** Rang **außen**, den mit höherem **innen** (an
der Textkante). Da für vererbte CSS-Eigenschaften wie `color` die dem Text nächstgelegene
Deklaration gewinnt, muss `link` einen **niedrigeren** Rang als `textColor` haben, damit
eine explizit gesetzte `textColor` (innen) die implizite Link-Farbe (außen) optisch
überschreibt — exakt die Kaskadenlogik aus Anforderung 3.8. Resultierende Reihenfolge:
`strong, em, underline, strike, link, textColor, highlight`.

```ts
link: {
  attrs: { href: { validate: 'string' } },
  // Word/Google-Docs behavior: typing right after a link must not extend it (the default
  // inclusive:true would make freshly-typed text inherit the mark).
  inclusive: false,
  // No explicit `excludes`: defaults to the mark's own name, so two link instances
  // exclude each other automatically — this is what makes Grenzfall 4.2
  // ("mixed selection -> uniform new URL") work for free via plain addMark (§2.5).
  parseDOM: [
    {
      tag: 'a[href]',
      getAttrs: (dom) => {
        const safe = sanitizeHref((dom as HTMLElement).getAttribute('href') || '')
        return safe ? { href: safe } : false // false -> rule doesn't match; the <a>
        // contributes no mark but its text is still parsed as plain inline content.
      },
    },
  ],
  toDOM(mark) {
    return ['a', { href: mark.attrs.href, title: mark.attrs.href, style: 'color: #0563C1; text-decoration: underline' }, 0]
  },
},
```

`normalizeHref` wird in `parseDOM` **nicht** aufgerufen (nur `sanitizeHref`) —
Paste-Normalisierung soll fremde Voll-URLs nicht verändern; das `https://`-Voranstellen
(§3.2) ist reine Dialog-Eingabe-Konvention.

### 4.5 `src/formats/shared/editor/linkClickPlugin.ts` (neu)

```ts
import { Plugin } from 'prosemirror-state'

/**
 * Plain click on linked text must not navigate (§3.9) — otherwise a link could never be
 * clicked again to place the caret for editing. Ctrl/Cmd+click opens in a new tab.
 * preventDefault() suppresses the anchor's native navigation (ProseMirror invokes
 * handleClick synchronously from its own native click listener). It does NOT suppress
 * native caret placement (resolved earlier from mousedown/mouseup) nor double-click word
 * selection (a separate handleDoubleClick prop, untouched) — Grenzfall 20 unaffected.
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
        if (event.ctrlKey || event.metaKey) window.open(href, '_blank', 'noopener,noreferrer')
        return true
      },
    },
  })
}
```

### 4.6 `src/formats/shared/editor/LinkDialog.tsx` (neu)

Kompletter neuer Dialog (kein bestehender wiederverwendbar: `src/app/PrivacyModal.tsx`
— das einzige vorhandene Modal, verifiziert per Glob — hat weder Fokus-Falle noch
Escape-/Backdrop-Behandlung und liegt zudem außerhalb des Editor-Ordners;
`InsertTableDialog.tsx` aus
`tabelle-einfuegen-code.md` existiert im Repo **nicht** — verifiziert per Glob, `Toolbar.tsx`
ruft `insertTable(2,2)` weiterhin direkt auf, `Toolbar.tsx:284`). Struktur bewusst
konsistent, damit ein später gebauter `InsertTableDialog` gleich wirkt.

```tsx
import { useEffect, useRef, useState } from 'react'
import { sanitizeHref, normalizeHref } from '../url'

interface LinkDialogProps {
  mode: 'edit' | 'insert'
  initialHref: string
  onConfirm: (result: { href: string; text?: string }) => void
  onCancel: () => void
  onRemove: (() => void) | null // null in insert mode or when there's no link to remove
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
    if (!trimmed) { setError('Bitte eine URL eingeben.'); return }              // Grenzfall 4
    if (mode === 'insert' && !text.trim()) { setError('Bitte einen Anzeigetext eingeben.'); return }
    const safe = sanitizeHref(trimmed)
    if (safe === null) { setError('Dieses Link-Ziel wird nicht unterstützt.'); return } // Grenzfall 4.9
    const normalized = normalizeHref(safe)
    onConfirm(mode === 'insert' ? { href: normalized, text: text.trim() } : { href: normalized })
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { e.preventDefault(); onCancel(); return }
    if (e.key === 'Enter') { e.preventDefault(); submit(); return }
    if (e.key === 'Tab') { // focus trap within the dialog
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('input, button')
      if (!focusable || focusable.length === 0) return
      const first = focusable[0], last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
  }
  // JSX: role="dialog" aria-modal, Backdrop-onMouseDown → onCancel bei Klick außerhalb,
  // Anzeigetext-Feld nur bei mode==='insert', Ziel-URL-Feld, Fehlerzeile role="alert",
  // Buttons „Link entfernen"(onRemove) / „Abbrechen"(onCancel) / „Übernehmen"(submit).
  // Vollständiges Markup wie im Repo-Muster; hier zur Kürze auf die Logik reduziert.
}
```

### 4.7 `src/formats/shared/editor/Toolbar.tsx` (geändert)

1. Lokale `run`-Hilfsfunktion (`Toolbar.tsx:28-31`) entfernen; stattdessen `runCommand`
   aus `commands.ts` importieren und alle bestehenden `run(view, …)`-Aufrufstellen
   (MarkButton/AlignButton/Cut/Heading/Farbe/Listen/Tabelle/Bild — ~13 Stellen)
   mechanisch auf `runCommand(view, …)` umstellen. **Behavior-preserving**, da `runCommand`
   das `view`-Argument beibehält (§4.3).
2. Neue Prop: `Toolbar` erhält zusätzlich `onRequestLink: (req: LinkDialogRequest) => void`.
3. Neue Komponente `LinkButton` (aktiver Zustand via `isLinkActive(view.state)`, Muster
   exakt wie `MarkButton`, `Toolbar.tsx:55-89`):

```tsx
function LinkButton({ view, onRequestLink }: { view: EditorView; onRequestLink: (req: LinkDialogRequest) => void }) {
  const active = isLinkActive(view.state)
  return (
    <button type="button" title="Link einfügen" aria-label="Link einfügen" aria-pressed={active}
      onMouseDown={(e) => { e.preventDefault(); onRequestLink(buildLinkDialogRequest(view.state)) }}
      className={`px-2 py-1 rounded text-sm border ${active ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-neutral-100 dark:text-neutral-900' : 'border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'}`}>
      <LinkIcon />
    </button>
  )
}

function LinkIcon() { // eingebettetes SVG (Material-Icons „link", Apache-2.0), kein Emoji —
  // erfüllt Bedienelement 1/Abschnitt 20.1, folgt dem ScissorsIcon-Muster (Toolbar.tsx:33-53)
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false" fill="currentColor">
      <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" />
    </svg>
  )
}
```

4. Einbau in die JSX als eigene Gruppe nahe Tabelle/Bild (nach dem Separator vor „⊞
   Tabelle", `Toolbar.tsx:275`):

```tsx
<div className="w-px h-5 bg-neutral-300 dark:bg-neutral-700 mx-1" />
<LinkButton view={view} onRequestLink={onRequestLink} />
```

### 4.8 `src/formats/shared/editor/WordEditor.tsx` (geändert)

1. Neue Importe: `LinkDialog`; `LinkDialogRequest`, `buildLinkDialogRequest`, `setLink`,
   `removeLink`, `insertLinkText`, `runCommand` aus `./commands`; `createLinkClickPlugin`
   aus `./linkClickPlugin`.
2. State + Ref (die Keymap-Closure entsteht nur einmal beim Mount im `useEffect` mit leerem
   Deps-Array, `WordEditor.tsx:76-166`, und braucht daher eine Ref auf den aktuellen
   Setter — exakt das Muster von `onChangeRef`, `:68-69`):

```tsx
const [linkDialog, setLinkDialog] = useState<LinkDialogRequest | null>(null)
const setLinkDialogRef = useRef(setLinkDialog)
setLinkDialogRef.current = setLinkDialog
```

3. Im Keymap-Objekt (`WordEditor.tsx:85-107`) ergänzen — kollidiert nicht mit den bewusst
   nicht gebundenen `Mod-c/x/v` (Warnung `:86-92`):

```ts
'Mod-k': (state) => { setLinkDialogRef.current(buildLinkDialogRequest(state)); return true },
```

4. Plugins-Array (`WordEditor.tsx:83-114`): `createLinkClickPlugin()` ergänzen (nach
   `gapCursor()` `:112`, Reihenfolge unkritisch).
5. `Toolbar`-Aufruf (`WordEditor.tsx:170`) um die neue Prop erweitern:
   `onRequestLink={setLinkDialog}`.
6. Dialog als Geschwisterelement nach der Toolbar-Zeile rendern (außerhalb der
   Seiten-`div`-Verschachtelung, damit `fixed inset-0` nicht durch einen positionierten
   Vorfahren beeinflusst wird):

```tsx
{linkDialog && viewRef.current && (
  <LinkDialog
    mode={linkDialog.mode}
    initialHref={linkDialog.initialHref}
    onCancel={() => setLinkDialog(null)}
    onRemove={linkDialog.mode === 'edit' && linkDialog.initialHref ? () => { runCommand(viewRef.current!, removeLink()); setLinkDialog(null) } : null}
    onConfirm={(result) => {
      const view = viewRef.current!
      if (linkDialog.mode === 'insert') runCommand(view, insertLinkText(result.href, result.text!))
      else runCommand(view, setLink(result.href))
      setLinkDialog(null)
    }}
  />
)}
```

**Regressionsfall 4.14 (Selection-Sync):** Das Öffnen/Schließen des Dialogs verändert
`view.state.selection` **nicht** (die Eingabefelder liegen außerhalb `view.dom`, kein
Fokuswechsel *innerhalb* des Editors). Der Mouseup-Reconciliation-Fix
(`reconcileSelectionOnClick` `WordEditor.tsx:43-50`, mousedown/mouseup-Listener `:143-155`)
bleibt für den nächsten echten Klick nach
Dialog-Schließen unverändert wirksam — die in Grenzfall 4.14 geforderte Sequenz
durchläuft exakt denselben Mechanismus wie der bestehende Regressionstest, nur mit
„Link-Dialog bestätigen" als Zwischenschritt. Kein zusätzlicher Fix nötig, nur ein
zusätzlicher Testfall (§6.7 Punkt 10).

### 4.9 `src/formats/docx/styleDefs.ts` (geändert)

`headingStylesXml` (`styleDefs.ts:9-30`) um einen optionalen Parameter für zusätzliche
Stildefinitionen erweitern und die neue Zeichenformatvorlage exportieren:

```ts
export const HYPERLINK_STYLE_ID = 'Hyperlink'

export function hyperlinkStyleXml(): string {
  return (
    `<w:style w:type="character" w:styleId="${HYPERLINK_STYLE_ID}"><w:name w:val="Hyperlink"/>` +
    `<w:rPr><w:color w:val="0563C1"/><w:u w:val="single"/></w:rPr>` +
    `</w:style>`
  )
}

export function headingStylesXml(extraStylesXml = ''): string {
  // …bestehender Aufbau unverändert…, extraStylesXml direkt vor `</w:styles>` einfügen.
}
```

`extraStylesXml` bekommt Default `''`, damit kein anderer Aufrufer bricht (aktuell nur
`writer.ts`, §4.10). Bislang gibt es nur Paragraph-Styles (`Normal`, `Heading1-6`) — dies
ist der erste **Character**-Style.

### 4.10 `src/formats/docx/writer.ts` (geändert)

1. Importe ergänzen: `HYPERLINK_STYLE_ID`, `hyperlinkStyleXml` aus `./styleDefs`;
   `linkHrefOf`, `withoutLinkMark` aus `../shared/linkMark` (§4.12).
2. **`runPropertiesXml` gewinnt einen optionalen `rStyleId`-Parameter** (Korrektur eines
   Widerspruchs im früheren Entwurf, der die Funktion „unverändert" nannte, sie dann aber
   mit zwei Argumenten aufrief). `<w:rStyle>` **muss erstes Kind** der `<w:rPr>` sein
   (OOXML-Schemareihenfolge):

```ts
function runPropertiesXml(marks: JsonNode['marks'], rStyleId?: string): string {
  const props: string[] = []
  if (rStyleId) props.push(`<w:rStyle w:val="${rStyleId}"/>`) // muss zuerst stehen
  // …bestehende sechs if-Zweige unverändert…
  return props.length ? `<w:rPr>${props.join('')}</w:rPr>` : ''
}
```

3. **`inlineToRuns` (`writer.ts:41-67`) zweiphasig ersetzen** — Phase 1 wie bisher, aber
   jetzt auch für `hard_break` mit Marks und mit ordnungsunabhängigem Merge-Schlüssel;
   Phase 2 neu: zusammenhängende gleiche `href`-Läufe in **einen** `<w:hyperlink>` wrappen,
   eine frische Relationship (`TargetMode="External"`) je Gruppe:

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
      if (buffer && marksKey(buffer.marks) === marksKey(node.marks)) buffer.text += node.text ?? ''
      else { flush(); buffer = { text: node.text ?? '', marks: node.marks } }
    } else if (node.type === 'hard_break') {
      flush()
      const href = linkHrefOf(node.marks)
      pieces.push({ xml: breakXml(withoutLinkMark(node.marks), href !== undefined), href })
    }
  }
  flush()
  // Phase 2: wrap contiguous same-href pieces; one fresh relationship per group. Never
  // merges two different hrefs (Grenzfall 4.8); never reuses an rId across groups (§3.12).
  const out: string[] = []
  let i = 0
  while (i < pieces.length) {
    const href = pieces[i].href
    if (href === undefined) { out.push(pieces[i].xml); i += 1; continue }
    let j = i, group = ''
    while (j < pieces.length && pieces[j].href === href) { group += pieces[j].xml; j += 1 }
    const relId = rels.add(RELATIONSHIP_TYPES.hyperlink, href, 'External')
    out.push(`<w:hyperlink r:id="${relId}">${group}</w:hyperlink>`)
    i = j
  }
  return out.join('')
}
```

4. Beide Aufrufstellen anpassen: `blockToDocx`-Zweig `paragraph` (`writer.ts:117`) und
   `heading` (`:123`): `inlineToRuns(node.content)` → `inlineToRuns(node.content, rels)`
   (`rels` ist dort bereits Funktionsparameter, `:105-110`).
5. `writeDocx` (`writer.ts:281`): `const stylesXml = headingStylesXml(hyperlinkStyleXml())`.

### 4.11 `src/formats/docx/reader.ts` (geändert — additiv, §2.7)

Import ergänzen: `import { sanitizeHref } from '../shared/url'`.

**Nur zwei bestehende Funktionen werden erweitert (nicht ersetzt):** `collectRuns`
(194-216) und `decodeRunElement` (170-184) erhalten ein durchgereichtes `extraMarks`.
`decodeDrawingOrPict`, das `w:del`-Skip, der `w:ins`/`w:smartTag`/`w:sdt`/`w:fldSimple`-
Abstieg und alle Signaturen darüber (`decodeParagraphRuns`, `paragraphToBlocks`,
`parseTable`, `readBodyChildren`) bleiben **unverändert** — der `imageRels`-Parameter ist
bereits die volle `document.xml.rels`-Map und wird als solche für die Hyperlink-Auflösung
mitbenutzt (eine Umbenennung zu `documentRels` ist optionale, rein kosmetische Klarheit).

```ts
function decodeRunElement(
  rEl: Element, headingInfo: HeadingInfo, imageRels: Map<string, string>, depth: number,
  extraMarks: Array<{ type: string; attrs?: Record<string, unknown> }> = [],
): RunLike[] {
  const rPr = firstChildNS(rEl, OOXML_NAMESPACES.w, 'rPr')
  const marks = [...extraMarks, ...marksFromRunProperties(rPr)]
  const applied = marks.length ? marks : undefined
  const out: RunLike[] = []
  for (const child of Array.from(rEl.children)) {
    if (child.namespaceURI === OOXML_NAMESPACES.w && child.localName === 't') {
      out.push({ kind: 'text', text: child.textContent ?? '', marks: applied })
    } else if (child.namespaceURI === OOXML_NAMESPACES.w && child.localName === 'br') {
      out.push({ kind: 'break', marks: applied }) // NEU: trägt jetzt Marks (§2.2 + Grenzfall 4.10)
    } else if (child.namespaceURI === OOXML_NAMESPACES.w && (child.localName === 'drawing' || child.localName === 'pict')) {
      out.push(decodeDrawingOrPict(child, headingInfo, imageRels, depth)) // UNVERÄNDERT: Bild/Textbox/Objekt
    }
  }
  return out
}

function collectRuns(
  container: Element, runs: RunLike[], headingInfo: HeadingInfo, imageRels: Map<string, string>, depth: number,
  extraMarks: Array<{ type: string; attrs?: Record<string, unknown> }> = [],
): void {
  for (const child of Array.from(container.children)) {
    if (child.namespaceURI !== OOXML_NAMESPACES.w) continue
    if (child.localName === 'r') {
      runs.push(...decodeRunElement(child, headingInfo, imageRels, depth, extraMarks))
    } else if (child.localName === 'del') {
      // UNVERÄNDERT: getrackte Löschung überspringen
    } else if (child.localName === 'hyperlink') {
      // NEU: r:id -> External target -> link-Mark; danach exakt wie bisher weiter absteigen,
      // damit verschachtelte <w:r>/<w:ins>/<w:smartTag>-Texte erhalten bleiben.
      const relId = child.getAttributeNS(OOXML_NAMESPACES.r, 'id')
      const target = relId ? imageRels.get(relId) : undefined
      const safeHref = target ? sanitizeHref(target) : null // kein r:id (interner w:anchor,
      // Grenzfall 4.17) oder unsicheres/unauflösbares Ziel (Grenzfall 4.9) -> Text bleibt,
      // nur kein link-Mark. Nie stiller Textverlust.
      const alreadyLinked = extraMarks.some((m) => m.type === 'link') // defensiv (§2.3)
      const next = safeHref && !alreadyLinked ? [...extraMarks, { type: 'link', attrs: { href: safeHref } }] : extraMarks
      collectRuns(child, runs, headingInfo, imageRels, depth, next)
    } else if (child.localName === 'ins' || child.localName === 'smartTag') {
      collectRuns(child, runs, headingInfo, imageRels, depth, extraMarks) // UNVERÄNDERT (Marks durchreichen)
    } else if (child.localName === 'sdt') {
      const sdtContent = firstChildNS(child, OOXML_NAMESPACES.w, 'sdtContent')
      if (sdtContent) collectRuns(sdtContent, runs, headingInfo, imageRels, depth, extraMarks) // UNVERÄNDERT
    } else if (child.localName === 'fldSimple') {
      // UNVERÄNDERT: Text bleibt erhalten. Das Parsen der `w:instr="HYPERLINK …"`-URL ist
      // der optionale, bewusst dokumentierte Teil von Anforderung 3.13/Grenzfall 4.18 —
      // Mindestanforderung (kein Textverlust) ist erfüllt; URL-Erfassung aus dem Feldcode
      // wird als dokumentierte Lücke geführt (§5, Punkt 12), nicht stillschweigend.
      collectRuns(child, runs, headingInfo, imageRels, depth, extraMarks)
    }
  }
}
```

`decodeParagraphRuns` (218-222) bleibt unverändert (der `extraMarks`-Default `[]` greift).

Zusätzlich **`runsToInline` (282-287)** so anpassen, dass `hard_break` seine Marks behält —
der Filter **bleibt** `r.kind === 'text' || r.kind === 'break'` (NICHT `!== 'image'`, das
würde fälschlich `unsupported`-Runs mit einschließen):

```ts
function runsToInline(runs: RunLike[]): JsonNode[] {
  return runs
    .filter((r) => r.kind === 'text' || r.kind === 'break')
    .map((r) => (r.kind === 'break' ? { type: 'hard_break', marks: r.marks } : { type: 'text', text: r.text ?? '', marks: r.marks }))
    .filter((n) => n.type !== 'text' || n.text)
}
```

(Das `RunLike`-Feld `marks` ist bereits optional vorhanden, `reader.ts:120` — für
`'break'` wird es jetzt zusätzlich genutzt.)

### 4.12 `src/formats/shared/linkMark.ts` (neu)

Von beiden Writern geteilte Mini-Helfer (vermeidet Duplikation zwischen `docx/writer.ts`
und `odt/writer.ts`):

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
export const INTERNET_LINK_STYLE_NAME = 'Internet_20_Link' // LibreOffice-Konvention (§3.4)

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

1. Importe ergänzen: `INTERNET_LINK_STYLE_NAME`, `internetLinkStyleXml` aus
   `./styleRegistry`; `linkHrefOf`, `withoutLinkMark` aus `../shared/linkMark`.
2. **`inlineToOdt` (`writer.ts:70-83`) ersetzen** — Aufbau der Läufe wie bisher (`text:span`
   über die `TextStyleRegistry`, jetzt aber über `withoutLinkMark(node.marks)`, damit das
   `link`-Mark nicht fälschlich in die Zeichenstil-Ableitung einfließt), danach
   zusammenhängende gleiche `href` in **ein** `<text:a>` wrappen, das die Standardoptik-
   Zeichenformatvorlage referenziert:

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
    if (href === undefined) { out.push(pieces[i].xml); i += 1; continue }
    let j = i, group = ''
    while (j < pieces.length && pieces[j].href === href) { group += pieces[j].xml; j += 1 }
    out.push(
      `<text:a xlink:href="${escapeXml(href)}" xlink:type="simple">` +
        `<text:span text:style-name="${INTERNET_LINK_STYLE_NAME}">${group}</text:span></text:a>`,
    )
    i = j
  }
  return out.join('')
}
```

   (`<text:a>` ist Wrapper-Ebene **um**, nicht statt der bestehenden `text:span`-Läufe —
   ein Link kann gleichzeitig fett/farbig sein, die inneren `text:span` bleiben erhalten,
   Anforderung 3.14; verschachtelte `text:span` sind in ODF gültig.)
3. `buildContentXml` (`writer.ts:206-214`, Automatik-Stile Z. 210) um
   `internetLinkStyleXml()` erweitern:

```ts
`<office:automatic-styles>${paragraphAlignStyleDefs()}${headingStyleDefs()}${listStyleDefs()}${internetLinkStyleXml()}${styles.serializeDefs()}</office:automatic-styles>`
```
4. **`buildStylesXml` (`writer.ts:216-233`, Automatik-Stile Z. 221) ebenfalls um
   `internetLinkStyleXml()` erweitern.** `inlineToOdt` wird auch für Kopf-/Fußzeilen
   (`chromeStyles`, `writeDocx`/`writeOdt`-Pfad) aufgerufen und emittiert dort dieselbe
   `<text:span text:style-name="Internet_20_Link">`-Referenz — ohne Definition in
   `styles.xml` bliebe sie ein **hängender Stilverweis** (LibreOffice ignoriert ihn
   folgenlos, Text/URL bleiben, aber die Standardoptik fehlt). Kopf-/Fußzeilen-Links sind
   zwar außerhalb des Geltungsbereichs (§2.6), doch die Stildefinition in **beiden**
   Automatik-Stil-Blöcken zu führen ist billig und vermeidet einen inkonsistenten
   Cross-Format-Zustand. Alternativ ausdrücklich als Nuance unter §2.6 dokumentieren.

### 4.15 `src/formats/odt/reader.ts` (geändert)

Import ergänzen: `sanitizeHref` aus `../shared/url`, `INTERNET_LINK_STYLE_NAME` aus
`./styleRegistry`.

1. `parseAutomaticStyles` (`reader.ts:37-78`), `family === 'text'`-Zweig (48-62): den
   reservierten Stilnamen überspringen, damit die eigene Standardoptik-Referenz beim
   Reimport **nicht** zu einem expliziten `textColor`/`underline`-Mark wird (§2.4/§3.4):

```ts
if (family === 'text') {
  if (name === INTERNET_LINK_STYLE_NAME) continue
  // …unverändert…
}
```

2. `walk` (`reader.ts:138-168`), neuer `else if`-Zweig für `text:a` (Position in der Kette
   egal; er ersetzt für `localName === 'a'` den bisherigen generischen `else`-Abstieg um
   die zusätzliche `link`-Mark-Erzeugung, steigt aber weiter in die Kinder ab, damit ein
   innerer `text:span` erhalten bleibt):

```ts
} else if (el.namespaceURI === ODF_NAMESPACES.text && el.localName === 'a') {
  // Guard gegen strukturell ungültige verschachtelte <text:a> (reale Fixture
  // invalid_simple_overlapping_hyperlinks.odt, §2.3): Mark.setFrom dedupliziert nicht,
  // ein bedingungsloses Anhängen erzeugte zwei link-Marks am selben Textknoten. Äußerstes
  // <text:a> gewinnt; Text bleibt in jedem Fall vollständig.
  const alreadyLinked = marks.some((m) => m.type === 'link')
  const rawHref = el.getAttributeNS(ODF_NAMESPACES.xlink, 'href')
  const safeHref = !alreadyLinked && rawHref ? sanitizeHref(rawHref) : null
  const childMarks = safeHref ? [...marks, { type: 'link', attrs: { href: safeHref } }] : marks
  for (const child of Array.from(el.childNodes)) walk(child, childMarks)
}
```

3. `walk`s `text:line-break`-Zweig (`reader.ts:150-151`) korrigieren, damit Marks (inkl.
   `link` beim Link-über-`hard_break`, Grenzfall 4.10) erhalten bleiben (§2.2):

```ts
} else if (el.namespaceURI === ODF_NAMESPACES.text && el.localName === 'line-break') {
  result.push({ type: 'hard_break', marks: marks.length ? marks : undefined })
}
```

Der generische `else`-Zweig (160-167) bleibt für alle **anderen** Inline-Elemente
(`text:placeholder`, `text:date`, `text:note`, …) unverändert — er sichert weiterhin den
Text-Erhalt, der nicht regressieren darf.

---

## 5. Zusammenfassung der Design-Entscheidungen (zur Übernahme nach `hyperlink-einfuegen-req.md`)

1. **Leere Selektion → Dialog mit Anzeigetext-Feld** (Variante b), kein deaktivierter
   Button (§3.1).
2. **`https://`-Autopräfix** für schema-lose Eingaben; `mailto:`/`tel:`/Anker/relative
   Pfade unverändert (§3.2).
3. **`javascript:`/`data:`/`vbscript:`/`file:` werden abgelehnt** (sichtbare
   Fehlermeldung im Dialog, kein Commit), nicht still neutralisiert; beim Import wird nur
   der `href` verworfen, der Text bleibt (§3.3).
4. **Standardoptik über referenzierte Zeichenformatvorlage**, nicht direktes Inline-Styling
   — `w:styleId="Hyperlink"` (DOCX) bzw. `Internet_20_Link` (ODT); beide Reader ignorieren
   diese eine reservierte Vorlage bei der Mark-Ableitung (§2.4/§3.4).
5. **Mark-Reihenfolge in `schema.ts`:** `link` zwischen `strike` und `textColor`, sodass
   eine explizite `textColor` die implizite Link-Farbe optisch überschreibt (§4.4).
6. **Klick im Editor:** einfacher Klick editiert (keine Navigation), Strg/Cmd+Klick öffnet
   neuen Tab (§3.5).
7. **Aktiver Zustand:** exakt wie bestehende `MarkButton`s (`$from.marks()`), kein
   „gemischt"-Zustand (§3.6).
8. **Keine Kontextmenü-/Menüleisten-Integration** (Bedienelemente 10/11) — laut
   Anforderung kein Blocker.
9. **DOCX-Fixture-Korrektur:** 12 vorhandene Fixtures mit echtem `<w:hyperlink>` genügen,
   keine externe Beschaffung.
10. **Implementierung additiv (§2.7):** DOCX-`href` wird durch `collectRuns`/
    `decodeRunElement` gefädelt, `decodeParagraphRuns` **nicht** ersetzt — bewahrt
    `w:del`/`w:ins`/`w:smartTag`/`w:sdt`/`w:fldSimple`/Textbox-Verhalten und deren Tests.
11. **Vorbestehende `hard_break`-Marks-Lücke wird mitbehoben** (§2.2) — nötig für den Link
    über `hard_break` (Grenzfall 4.10).
12. **Feldcode-Hyperlinks (`w:fldSimple`/`instrText HYPERLINK`):** nur Mindestanforderung
    (Text bleibt, bereits erfüllt) — die URL-Erfassung aus dem Feldcode ist eine **bewusst
    dokumentierte Lücke** (§4.11), kein stiller Fehlschlag.
13. **Interne Sprungziele (`w:anchor` ohne `r:id`, ODF-Textmarken):** außerhalb des
    Geltungsbereichs — Text bleibt, als unverlinkter Text importiert (dokumentiert, §4.11).

---

## 6. Testplan (Zuordnung zu Abschnitt 5/6 der Anforderung)

### 6.1 `src/formats/shared/editor/__tests__/linkCommands.test.ts` (neu)

(Alternativ die neuen Fälle an die **bereits vorhandene** `commands.test.ts` im selben
`__tests__`-Ordner anhängen — verifiziert, existiert. Eine eigene Datei hält die
Link-Suite jedoch übersichtlich; beides ist zulässig.) Unit-Tests direkt gegen
`commands.ts`, ohne DOM:

1. `linkRangeAt`: Cursor mitten im Link → korrekter `{from,to,href}` über den **gesamten**
   zusammenhängenden Bereich, auch über mehrere Runs mit unterschiedlichen Zusatz-Marks
   (fett + nicht-fett, gleicher `href`).
2. `linkRangeAt`: Cursor genau zwischen zwei Links verschiedener `href` → liefert den Link
   **vor** dem Cursor.
3. `setLink` auf gemischte Selektion (Link A / Link B / unverlinkt) → einheitlich neue URL
   (Grenzfall 4.2, deckt §2.5 Punkt 1).
4. `setLink` mit leerer Selektion, Cursor im Link → aktualisiert den **gesamten** Bereich
   (§3.4).
5. `removeLink` mit leerer Selektion, Cursor im Link → entfernt nur `link`, `strong` u. a.
   bleiben (§3.5).
6. `insertLinkText` an Cursor mit aktivem `strong` → neuer Text trägt **beide** Marks.
7. `buildLinkDialogRequest`: leer außerhalb Link → `insert`; leer im Link → `edit` +
   vorhandene URL; nicht-leer → `edit` + einheitliche URL oder `''`.
8. **Selektion über eine Bild-/Tabellengrenze (Grenzfall 3, deckt §2.5 Punkt 2):**
   `setLink` auf eine Selektion, die einen `image`-Block bzw. eine Tabellengrenze
   umspannt (analog `Strg+A`) → kein Absturz, `link`-Mark landet **nur** auf den
   textuellen Inline-Knoten (`Transform.addMark` überspringt `!node.isInline`), der
   `image`-Block bleibt markfrei.

### 6.2 `src/formats/shared/__tests__/url.test.ts` (neu)

1. `sanitizeHref`: `http`/`https`/`mailto`/`tel` akzeptiert; `javascript:`/`data:`/
   `vbscript:` → `null`; gemischte Groß-/Kleinschreibung (`JavaScript:`) → `null`.
2. `sanitizeHref`: schema-lose Eingabe (`beispiel.de`) → unverändert durchgereicht.
3. `normalizeHref`: `beispiel.de` → `https://beispiel.de`; `mailto:a@b.de`/`#anker`/
   `/pfad`/`../datei.docx` unverändert.
4. Sehr lange URL (> 2000 Zeichen, Grenzfall 5) → beide Funktionen ohne Kürzung/Crash.

### 6.3 `src/formats/docx/__tests__/roundtrip.test.ts` (erweitert)

Neue `describe('DOCX round trip: hyperlinks')`:

1. Link auf einfachen Text → `<w:hyperlink r:id>` + Relationship mit
   `TargetMode="External"`; reimportiert identisches `href`.
2. URL mit `&`/`"`/Leerzeichen/Umlauten (Grenzfall 4.6) → Export erzeugt valides XML
   (Reimport-Parse gelingt), `href` exakt erhalten. **Deckt §2.1 ab.**
3. Sehr lange URL (Grenzfall 5) → erhalten, kein Crash.
4. `mailto:`/`tel:` → erhalten, nicht mit `https://` präfigiert.
5. Link + Fett + Textfarbe auf demselben Lauf (5.1.3) → alle drei Marks nach Rundreise
   gemeinsam, **kein** zusätzliches `textColor`/`underline` durch die Standardoptik-
   Stilreferenz. **Wichtigster neuer Regressionstest (deckt §2.4).**
6. Zwei aufeinanderfolgende Links mit unterschiedlichem `href`, kein Text dazwischen
   (Grenzfall 4.8) → zwei getrennte `<w:hyperlink>` + zwei Relationships.
7. Link über `hard_break` (Grenzfall 4.10) → **ein** `<w:hyperlink>` umschließt beide
   Text-Läufe **und** den `<w:br/>`-Lauf. **Deckt §2.2 ab.**
8. Link entfernt → kein `<w:hyperlink>` mehr, kein verwaister Relationship-Eintrag
   (`document.xml.rels` direkt geprüft).
9. **Regressionstest vor der Fix-Implementierung** (Testplan-Punkt 1 der Anforderung):
   minimaler `<w:hyperlink r:id="rId2"><w:r><w:t>hier</w:t></w:r></w:hyperlink>`-String
   gegen `readDocx()` → Text „hier" **plus** aufgelöstes `href`; bleibt als
   Regressionsschutz. Ergänzt (nicht ersetzt) das bestehende `reader.test.ts` U-6.
10. **Regression `w:del`/`w:sdt`/Textbox** (deckt §2.7 ab): der bestehende Reader-Test
    U-6 (verschachtelt hyperlink→ins→sdt) **muss unverändert grün bleiben** — explizit als
    Nicht-Regressions-Anker in dieser Suite referenziert.
11. **Link in Tabellenzelle (Grenzfall 11):** Link auf Text **in einer `table_cell`** →
    Rundreise erzeugt das `<w:hyperlink>` **innerhalb** der `<w:tc>` (nicht in einer
    Nachbarzelle), `href` korrekt zugeordnet. Deckt ab, dass `inlineToRuns` je Zelle über
    `blockToDocx`→`tableToDocx` aufgerufen wird und der `rels`-Parameter dort ebenfalls
    ankommt (`writer.ts:189`).
12. **Link über kompletter Überschrift (Grenzfall 12):** Link auf den gesamten Text eines
    `heading` → nach Rundreise `heading`-`level` unverändert **und** `<w:hyperlink>` im
    `<w:p>` mit `<w:pStyle w:val="HeadingN"/>` (Node-Level und Inline-`link`-Mark
    unabhängig, `writer.ts:119-124`).
13. **Link entfernen in leerer Zelle/leerem Listenpunkt (Grenzfall 13):** `removeLink()`
    an einem Cursor in einer leeren `table_cell`/leerem `list_item` → kein Absturz, keine
    leeren `<w:r>`/`<w:hyperlink>`-Hüllen im Export, Struktur bleibt valide.

### 6.4 `src/formats/docx/__tests__/external-fixtures.test.ts` (erweitert)

Gezielte Asserts zusätzlich zum bestehenden pauschalen „importiert ohne Absturz"-Loop
(deckt alle 127 Fixtures ab):

1. `rtl.docx` → mindestens ein `link`-Mark mit `href` beginnend `https://ar.wikipedia.org`
   **und** der sichtbare arabische Linktext ist Teil des Ergebnisses (Regressionstest für
   Befund 0.4 mit RTL/Unicode).
2. `56392.docx` → `mailto:klienti@livetelecom.cz`-Link korrekt aufgelöst; der referenzierte
   `w:rStyle="Internetovodkaz"` erzeugt **kein** zusätzliches `textColor`/`underline`
   (bestätigt §2.4/§3.4 an einer realen Datei).
3. `bug65738.docx` → **sowohl** mindestens ein `link`-Mark mit `r:id`-`href` **als auch**
   Text der `w:anchor`-only-Links (`OnLevel3`/`OnMainHeading`) — letzterer **ohne**
   `link`-Mark, aber vollständig erhalten (Grenzfall 4.17, reale Datei).
4. Restliche 9 hyperlink-haltige Fixtures (`58618`, `61991`, `TestDocument`,
   `WordWithAttachments`, `bug59058`, `bug65649`, `delins`, `drawing`, `smarttag-snippet`)
   über den bestehenden Crash-Loop abgedeckt.

### 6.5 `src/formats/odt/__tests__/roundtrip.test.ts` (erweitert)

Analog zu 6.3: `<text:a>`-Erzeugung, Reimport, Sonderzeichen-Escaping, Entfernen,
Fett+Farbe-Kombination (Regressionstest für §2.4 auf ODT-Seite, inkl. erhaltenem innerem
`text:span`), Link über `hard_break` (§2.2), zwei getrennte Links ohne Zwischentext sowie
— analog 6.3 Punkte 11–13 — Link in Tabellenzelle (Grenzfall 11), Link über kompletter
Überschrift (Grenzfall 12) und `removeLink()` in leerer Zelle/leerem Listenpunkt
(Grenzfall 13).

### 6.6 `src/formats/odt/__tests__/external-fixtures.test.ts` (erweitert)

1. `hyperlink.odt`, `hyperlinkSpaces.odt`, `hyperlinkSpacesNoUnderline.odt`,
   `Hyperlink-AOO401.odt` → je mindestens ein `link`-Mark mit korrektem `href` **und**
   vollständig erhaltenem Linktext (Regressionstest für Befund 0.5, deckt Anforderung
   5.2.5).
2. `hyperlink_destination.odt` → **kein** Absturz; Kommentar dokumentiert, dass die Datei
   (verifiziert) keinen `<text:a>` enthält, daher nur Crash-Test.
3. `invalid_simple_overlapping_hyperlinks.odt` → kein Absturz, Text „www.heise.de" (inkl.
   „heise") vollständig, **genau ein** `link`-Mark pro Textknoten (Regressionstest §2.3).

### 6.7 `tests/e2e/hyperlink.spec.ts` (neu)

Struktur analog `tests/e2e/docx.spec.ts`/`selection-regression.spec.ts`:

1. Text markieren → Toolbar-Button klicken → Dialog, URL eingeben, „Übernehmen" →
   `a[href]` im DOM, `title` zeigt URL.
2. Dieselbe Sequenz per `ControlOrMeta+k`.
3. Ohne Selektion → `ControlOrMeta+k` → Anzeigetext-Feld sichtbar; beides ausfüllen →
   neuer verlinkter Text an Cursor-Position.
4. Cursor in bestehendem Link → `ControlOrMeta+k` → vorhandene URL vorausgefüllt.
5. „Link entfernen" → `a[href]` verschwindet, Text bleibt.
6. Leeres URL-Feld bestätigen → Dialog offen, Fehlermeldung, kein DOM-Wechsel (Grenzfall 4).
7. `javascript:alert(1)` bestätigen → Fehlermeldung, kein solches `a[href]` (Grenzfall 4.9).
8. Escape schließt ohne Änderung.
9. Undo direkt nach Link-Setzen → Link weg, Text bleibt; Redo stellt inkl. `href` wieder her.
10. **Pflicht-Regressionssequenz (Grenzfall 4.14):** markieren → Dialog bestätigen → per
    Klick neu positionieren → Enter → tippen → beide Absätze intakt (Muster aus
    `selection-regression.spec.ts`, mit „Link setzen" als Zwischenschritt).
11. Strg+Klick öffnet neues Tab (`page.waitForEvent('popup')`); einfacher Klick tut das
    **nicht** und platziert den Cursor (danach Tippen landet an der Klickposition).
12. Doppelklick auf Link selektiert das Wort (Grenzfall 20), keine Navigation.
13. Vollständige Rundreise je Format über echten Upload (`filechooser`) und Download
    (`page.waitForEvent('download')`): Link setzen → exportieren → JSZip-Parse von
    `word/document.xml` + `word/_rels/document.xml.rels` (DOCX) bzw. `content.xml` (ODT) →
    Struktur **unabhängig** vom eigenen Reader verifiziert (inkl. `TargetMode="External"`).
14. Cross-Format-Doppel-Rundreise (§5.3): DOCX→ODT→DOCX und ODT→DOCX→ODT, Link an derselben
    Textstelle mit derselben URL; Variante mit drei verschiedenen URLs (keine Vertauschung).

---

## 7. Reihenfolge der Umsetzung (Vorschlag)

1. `shared/url.ts`, `shared/linkMark.ts` (4.1, 4.12) — unabhängig, keine Vorbedingungen.
2. `docx/relationships.ts` (4.2) — kleiner, isolierter Fix, sofort mit 6.3 Punkt 2
   absicherbar (auch ohne Hyperlink-Feature reproduzierbar, sobald ein `&` in irgendein
   Relationship-Target gerät).
3. `schema.ts` (4.4) — Mark inkl. Reihenfolge-Entscheidung + `sanitizeHref`-Import.
4. `commands.ts` (4.3) — gegen die reine Schema-Änderung unit-testbar (6.1), vor UI.
5. `docx/styleDefs.ts`, `docx/writer.ts`, `docx/reader.ts` (4.9-4.11) — DOCX zuerst (die
   meisten realen Fixtures liegen hier). **Reader additiv** (§2.7); Regressionstest 6.3
   Punkt 9 muss unmittelbar nach der Reader-Änderung grün werden, U-6 (6.3 Punkt 10)
   darf nicht brechen.
6. `odt/styleRegistry.ts`, `odt/writer.ts`, `odt/reader.ts` (4.13-4.15) — analog für ODT.
7. `linkClickPlugin.ts`, `LinkDialog.tsx`, `Toolbar.tsx`, `WordEditor.tsx` (4.5-4.8) —
   UI zuletzt (hängt von allen vorherigen Schichten ab).
8. Testdateien aus Abschnitt 6 parallel zum jeweiligen Schritt; die Reader-Regressionstests
   (6.3 Punkt 9, 6.6 Punkt 3) **vor** dem jeweiligen Fix schreiben (Testplan-Punkt 1 der
   Anforderung).
