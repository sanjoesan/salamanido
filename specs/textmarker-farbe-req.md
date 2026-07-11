# Anforderungsspezifikation: Feature „Texthervorhebungsfarbe (Textmarker)“

Status: **Nicht vertrauenswürdig — vollständige Verifikation ausstehend.** Laut
`specs/FEATURE-BACKLOG.md` (Zeile 102, Slug `textmarker-farbe`, Abschnitt 2.2
„Zeichenformatierung“) als **vorhanden** geführt (Priorität 1/essenziell),
Beschreibung dort: „Freie Farbwahl für die Hintergrund-Hervorhebung der Selektion.“
Diese Datei ersetzt die Beschreibung nicht, sondern macht sie so detailliert und
einzeln abhakbar, dass ein QA-Agent jeden Punkt über echte Browser-Bedienung (nicht
nur Unit-Tests) nachweisen oder widerlegen kann.

> **Warum diese Datei überarbeitet wurde (Verifikationsprotokoll).** Ein früherer
> Durchlauf dieser Anforderung enthielt zwar inhaltlich überwiegend korrekte
> Verhaltensbeschreibungen, aber (a) **durchgehend falsche Zeilennummern** in der
> Ist-Stand-Tabelle (z. B. `highlight`-Mark angeblich `schema.ts:141-147` — tatsächlich
> `189-195`; Farbwähler angeblich `Toolbar.tsx:162-170` — tatsächlich `211-219`) und
> (b) die **sachlich falsche Kernaussage**, es gäbe „keinen einzigen E2E-Test“ und
> „keine einzige E2E-Datei erwähnt Hervorhebung“. Tatsächlich existieren bereits mehrere
> E2E-Tests, die die Hervorhebungsfarbe über die echte Toolbar bedienen bzw. beim Import
> prüfen (siehe Ist-Stand-Tabelle und Abschnitt 5). Sämtliche Code-Referenzen unten
> wurden am aktuellen Stand direkt gegengelesen; wo die Vorversion nur vermutete, steht
> jetzt der belegte Befund oder ein klar als „zu verifizieren“ markierter Punkt.
>
> **Nachträgliche Re-Verifikation (dieser Durchlauf).** Alle in der Ist-Stand-Tabelle
> genannten Fundstellen wurden ein weiteres Mal einzeln gegen den Quellcode geprüft
> (`schema.ts`, `commands.ts`, `Toolbar.tsx`, `WordEditor.tsx`, DOCX-/ODT-Reader/Writer/
> `styleRegistry.ts`, die E2E-Specs, das Fixture `fullCoverageDocument.ts` sowie das
> Fehlen von `w:highlight` per Volltextsuche). Bestätigt: bis auf **eine** Ausnahme waren
> alle Angaben korrekt. Korrigiert wurde die **Keymap-Referenz**: sie lautete zuvor
> `WordEditor.tsx:77-99` mit „`Mod-b`/`Mod-i`/`Mod-u` (Z. 90-92)“ — tatsächlich liegt der
> `keymap({…})`-Block bei Z. 85-107, die Mark-Shortcuts bei Z. 98-100 und `Shift-Delete`
> bei Z. 106. Damit stimmt die frühere Zusicherung „alle Zeilenangaben geprüft“ jetzt
> tatsächlich; dieser Hinweis bleibt als Beleg gegen einen erneut nur oberflächlichen
> Prüfdurchlauf stehen.
>
> **Product-Owner-Review (dieser Durchlauf).** Sämtliche Fundstellen wurden erneut
> einzeln gegen den aktuellen Quellcode gelesen — alle korrekt (keine weitere Korrektur
> nötig). Zusätzlich **drei substanzielle Verbesserungen** gegenüber der Vorfassung:
> (1) Der zuvor **offen** gelassene TODO „für Grenzfall 3.7 eine Datei mit echtem
> `<w:highlight>` erst noch suchen/erzeugen“ ist **erledigt**: Durch Entpacken **aller**
> DOCX-Fixtures (`unzip -p … word/document.xml | grep w:highlight`) wurden **zwei** reale
> Dateien mit nativer Word-Hervorhebung gefunden — `bug57031.docx`
> (`<w:highlight w:val="lightGray"/>`, 8×) und `bug65649.docx`
> (`w:val="yellow"`/`"green"`/`"cyan"`). Ein reiner Text-`grep` über die `.docx` findet
> das **nicht** (ZIP-komprimiert) — deshalb war die Vorfassung hier zu Recht nur „zu
> prüfen“; jetzt ist es konkret belegt. (2) Neuer Grenzfall 3.18 — der **ungebundene**
> Farbchip setzt beim bloßen Bestätigen des Browser-Defaults ungewollt **Schwarz**
> (`#000000`), was als Hervorhebung ein deckender schwarzer Balken ist (bei schwarzem Text
> vollständig unlesbar) — für die Hintergrundfarbe gravierender als für die Schriftfarbe.
> (3) Neuer Grenzfall 3.19 — der DOCX-Writer **escaped `w:fill` nicht** (`writer.ts:29`,
> nur `.replace('#','')`), während der ODT-Writer escaped (`styleRegistry.ts:57`,
> `escapeXml`); ein Farbwert mit `"`/`&`/`<` erzeugt damit **nicht wohlgeformtes** DOCX
> (härterer Fehler als die reine Schema-Ungültigkeit aus 3.9). Ergänzend Grenzfall 3.20
> (alternatives ODT-Attribut `style:text-background-color`/`loext:`). Diese Punkte fehlten
> in der Vorfassung und sind hier nachgetragen.
>
> **Product-Owner-Review — Fixture-Inhalt tatsächlich entpackt und gelesen (dieser
> Durchlauf).** Alle Code-Fundstellen wurden erneut Zeile für Zeile gegen den aktuellen
> Quellcode geprüft (`schema.ts`, `Toolbar.tsx`, `commands.ts`, `WordEditor.tsx`,
> `docx/reader.ts`/`writer.ts`, `odt/reader.ts`/`writer.ts`/`styleRegistry.ts`,
> `clipboard.spec.ts`, `docx.spec.ts`/`odt.spec.ts`, `fullCoverageDocument.ts`) — **alle
> bisherigen Zeilen-/Code-Angaben bestätigt, keine falsch.** Die Schwachstelle lag woanders:
> die beiden vorherigen Durchläufe haben Fixture-**Namen** als Beleg für ihren vermuteten
> Inhalt genommen, ohne die ZIP tatsächlich zu entpacken. Nachdem in diesem Durchlauf
> `content.xml`/`styles.xml` der genannten ODT-Fixtures tatsächlich entpackt und inspiziert
> wurden (`unzip -p … content.xml`, Byte-Offset-Abgleich gegen `<office:automatic-styles>`),
> ergeben sich **zwei Korrekturen**:
> 1. **`coloredParagraph.odt` ist entgegen der Vorfassung *kein* Beleg für Grenzfall 3.13
>    (Absatzhintergrund).** Der tatsächliche Inhalt ist `<text:p text:style-name="Standard">
>    <text:span text:style-name="a9905fb">a</text:span>bc</text:p>` mit
>    `style:family="text"` und `fo:background-color="#92D050"` — ein ganz gewöhnliches
>    **einzelnes hervorgehobenes Zeichen** ("a" grün hinterlegt, "bc" ohne Hervorhebung),
>    keine Spur eines Absatzhintergrunds (`fo:background-color` kommt in der gesamten Datei
>    kein einziges Mal in einem `style:paragraph-properties`-Element vor, weder in
>    `content.xml` noch in `styles.xml`). Diese Datei testet also den **Normalfall** dieses
>    Features (sollte anstandslos importieren), nicht den in 3.13 beschriebenen
>    Abgrenzungsfall. Für 3.13 fehlt weiterhin eine echte, verifizierte Testdatei — siehe
>    korrigierten Grenzfall 3.13.
> 2. **`lostBackground.odt` und `character-styles.odt` belegen entgegen der Vorfassung
>    *nicht* nachweisbar den in Grenzfall 3.14 vermuteten Importverlust.** In beiden Dateien
>    steht der fragliche `fo:background-color` direkt in einem `style:family="text"`-Element
>    innerhalb von `content.xml`s **eigenem** `office:automatic-styles` (Byte-Offset-Vergleich
>    bestätigt: alle `fo:background-color`-Fundstellen liegen zwischen den Offsets von
>    `<office:automatic-styles>` und `</office:automatic-styles>`) — genau der Pfad, den
>    `parseAutomaticStyles`/`marksFor` (`odt/reader.ts:37-78, 100-112`) bereits auswertet.
>    `lostBackground.odt` hat zudem bereits eine **dokumentierte, andere** Funktion im
>    eigenen Code: `odt/reader.ts:311` nennt genau diese Datei als Beleg für den Grenzfall
>    „leere Tabellenzelle ohne `text:p`" — ihr Name bezieht sich vermutlich auf einen
>    Tabellen-/Rahmen-Hintergrund aus der Ursprungsdatei, nicht auf Zeichen-Hervorhebung.
>    Beide Dateien sind daher **keine verifizierten Nachweise** für den Named-Style-
>    Importverlust — sie bleiben nützliche allgemeine Highlight-Importtests (sie enthalten
>    echte `fo:background-color`-Werte, die erhalten bleiben sollten), aber Grenzfall 3.14
>    braucht weiterhin eine **noch zu findende oder selbst zu bauende** Datei, deren
>    Hervorhebungsstil ausschließlich in `office:styles` (nicht in
>    `office:automatic-styles`) definiert ist. Korrigiert in Grenzfall 3.14 und den
>    zugehörigen Testfällen/Rundreise-Punkten unten.
>
> **Product-Owner-Review — beide zuvor offenen Fixture-Lücken (3.13, 3.14) in diesem
> Durchlauf geschlossen (echte Dateien gefunden und Byte-für-Byte verifiziert, keine
> neu gebaut).** Alle Code-Fundstellen erneut gegen den aktuellen Quellcode geprüft
> (`schema.ts`, `Toolbar.tsx`, `commands.ts`, `WordEditor.tsx`, `docx/reader.ts`/`writer.ts`,
> `odt/reader.ts`/`writer.ts`/`styleRegistry.ts`) — **alle bisherigen Zeilen-/Code-Angaben
> bestätigt, keine falsch.** Zusätzlich drei Substanzbefunde:
> 1. **Grenzfall 3.13 (ODT-Absatzhintergrund) gelöst:** Statt weiter „coloredParagraph.odt“
>    zu vermuten, wurden alle 202 externen ODT-Fixtures systematisch nach
>    `fo:background-color` innerhalb eines `style:paragraph-properties`-Elements durchsucht
>    (`unzip -p … content.xml`, Byte-Offset-Abgleich). Treffer: **`feature_attributes_paragraph_MSO2013.odt`**
>    enthält `<style:style style:name="P17" style:family="paragraph"><style:paragraph-properties
>    fo:background-color="#FFFF00"/></style:style>`, referenziert von `<text:p
>    text:style-name="P17">Lorem ipsum…</text:p>` — **ohne** begleitenden `text:span` mit eigenem
>    `fo:background-color` (reiner Absatzhintergrund, keine Zeichen-Hervorhebung). Die Datei
>    enthält sogar eine Überschrift unmittelbar davor mit dem Klartext „Paragraph Background
>    Color" — erkennbar ein gezielt für diesen Fall gebautes Testfixture (aus einem
>    Apache-POI-artigen Testkorpus). Bisher **in keiner Fassung dieser Anforderung erwähnt**,
>    obwohl im selben Verzeichnis wie die bereits gelisteten Dateien. Damit ist Grenzfall 3.13
>    ab sofort mit einer echten Datei prüfbar, kein Bau/keine weitere Suche mehr nötig.
> 2. **Grenzfall 3.14 (ODT-Hervorhebung über benannte Zeichenformatvorlage in `office:styles`)
>    gelöst:** Systematische Suche (Node-Skript) nach `style:style style:family="text"`-
>    Elementen mit `fo:background-color`, die **innerhalb** von `<office:styles>` (nicht
>    `<office:automatic-styles>`) in `styles.xml` liegen. Treffer: **`spanInheritanceTest.odt`**
>    definiert in `styles.xml` unter `<office:styles>` (nicht in irgendeinem
>    `automatic-styles`-Block) `<style:style style:family="text" style:name="BACKGROUND_YELLOW">
>    <style:text-properties fo:background-color="#FFFF00"/></style:style>` und referenziert sie
>    in `content.xml` direkt per `<text:span text:style-name="BACKGROUND_YELLOW">yellow
>    background</text:span>` — verifiziert, dass `content.xml` selbst **keine** eigene
>    Definition von `BACKGROUND_YELLOW` in seinem `office:automatic-styles` enthält (nur die
>    davon abgeleitete `BACKGROUND_YELLOW_red`, die zusätzlich `fo:color` überschreibt, aber
>    das geerbte `fo:background-color` nicht neu definiert). `readOdt` liest ausschließlich
>    `office:automatic-styles` aus beiden Teilen (`reader.ts:363-364, 373-374`); der Name
>    `BACKGROUND_YELLOW` kommt in keiner dort geparsten Map vor, `marksFor` (`reader.ts:100-112`)
>    gibt für diesen Span daher `[]` zurück (Zeile 103: `if (!style) return []`) — **belegter,
>    nicht nur vermuteter Importverlust.** Damit ist auch Grenzfall 3.14 ab sofort mit einer
>    echten Datei prüfbar. (Ergänzend geprüft: kein Fixture im Repo verwendet das alternative
>    Attribut `style:text-background-color` — Grenzfall 3.20 bleibt daher wie zuvor offen,
>    hierfür weiterhin eine Datei nötig.)
> 3. **Grenzfall 3.17 (OOXML-`w:rPr`-Reihenfolge) präzisiert: kein Grenzfall, sondern
>    deterministisches Verhalten.** `schema.ts:157-196` definiert die Marks in fester
>    Objekt-Reihenfolge `strong, em, underline, strike, textColor, highlight`; ProseMirror
>    vergibt daraus aufsteigende `MarkType.rank`-Werte in exakt dieser Reihenfolge
>    (`MarkType.compile`) und `Mark.addToSet` hält jede Mark-Menge **stets nach Rang
>    sortiert**, unabhängig von der Reihenfolge, in der die Marks tatsächlich angewendet
>    wurden. Ein Textknoten mit Unterstrichen **und** (Durchgestrichen und/oder Schriftfarbe
>    und/oder Hervorhebung) hat seine `marks`-Liste deshalb **immer** in der Reihenfolge
>    `underline` vor `strike`/`textColor`/`highlight` — und `runPropertiesXml`
>    (`docx/writer.ts:20-33`) iteriert diese Liste unverändert. Ergebnis: `<w:u>` steht **in
>    jedem einzigen Fall** vor `<w:strike>`/`<w:color>`, nicht nur potenziell — ein
>    garantierter, reproduzierbarer Verstoß gegen die CT_RPr-Reihenfolge (`strike` vor `color`
>    vor `u` vor `shd`), sobald Unterstrichen mit Durchgestrichen oder Schriftfarbe kombiniert
>    wird. Kein Zufallsbefund, sondern bei **jedem** entsprechend kombinierten Testlauf
>    reproduzierbar — entsprechend in Grenzfall 3.17 und Abnahmekriterium 8 geschärft.
>
> **Product-Owner-Review — Tastatur-/Accessible-Name-Lücke beim „Entfernen“-Button neu
> gefunden (dieser Durchlauf).** Alle Code-Fundstellen erneut gegen den aktuellen
> Quellcode geprüft (`schema.ts`, `Toolbar.tsx`, `commands.ts`, `WordEditor.tsx`,
> `docx/reader.ts`/`writer.ts`, `odt/reader.ts`/`writer.ts`/`styleRegistry.ts`,
> `clipboard.spec.ts`, `docx.spec.ts`/`odt.spec.ts`, `fullCoverageDocument.ts`) sowie zwei
> Fremddateien byte-genau entpackt — **alle bisherigen Zeilen-/Code-/Fixture-Angaben
> bestätigt, keine falsch.** Zusätzlich zwei bislang **nicht dokumentierte**, direkt am
> Quellcode verifizierte Befunde zum „Hervorhebung entfernen“-Button (`Toolbar.tsx:220-230`):
> (1) **Tastatur-Inaktivierbarkeit (vermutet, konkret code-begründet):** Der Button ist —
> wie ausnahmslos jeder Button in `Toolbar.tsx` (per Volltextsuche über die gesamte Datei
> bestätigt: kein einziges `onClick`/`onKeyDown` vorhanden) — ausschließlich an
> `onMouseDown` verdrahtet. Ein natives `<button>` löst bei Tastaturaktivierung (Tab-Fokus
> + Enter/Leertaste) laut HTML-Spezifikation nur ein synthetisches `click`-Ereignis aus,
> **kein** `mousedown` — der Handler liefe damit vermutlich nicht. Exakt derselbe
> Root-Cause, den `specs/fett-req.md` Abschnitt 4 bereits als **Defekt A** für den
> Fett/Kursiv/Unterstrichen/Durchgestrichen-Button (`MarkButton`) verifiziert hat; hier
> erstmals für die Hervorhebungs-Bedienelemente nachgetragen (neuer Grenzfall 3.21). Anders
> als bei „Fett" existiert für Hervorhebung **keine** Tastenkombination als Ausweichmöglichkeit
> (Bedienelement 3) — der Button wäre, sollte sich der Verdacht bestätigen, **die einzige**
> Möglichkeit, eine gesetzte Hervorhebung wieder zu entfernen, und diese wäre dann per
> Tastatur **vollständig unerreichbar**. (2) **Ungenaue Zusicherung zum Accessible Name
> korrigiert:** Eine frühere Fassung behauptete in Bedienelement 4 pauschal „`aria-label`/
> `title` vorhanden (mildert für Screenreader)" — das trifft nachweislich **nur** auf den
> Farbwähler-`<input>` zu (`aria-label="Hervorhebungsfarbe"`, Z. 214). Der „Entfernen"-Button
> selbst (Z. 220-230) trägt **kein** `aria-label`, nur `title`; nach dem
> Accessible-Name-Berechnungsalgorithmus wird der Name eines `<button>` ohne `aria-label`/
> `aria-labelledby` aus seinem **Textinhalt** gebildet, bevor `title` als Fallback greift —
> vorgelesen würde vermutlich das Glyph „⌫" selbst (bzw. dessen Unicode-Beschreibung),
> **nicht** „Hervorhebung entfernen". Eigenständiger, von der bereits bekannten
> Rendering-Frage (leeres Rechteck) unabhängiger Befund: Selbst wer die Glyphe korrekt
> sieht, bekäme als Screenreader-Nutzer:in keinen verständlichen Namen vorgelesen. Neuer
> Grenzfall 3.22; beide Befunde entsprechend in Bedienelemente 2/4, Testfällen (Abschnitt 5)
> und Abnahmekriterien (Abschnitt 6) nachgetragen.

Geltungsbereich: Ausschließlich das Zeichenformat „Hervorhebungsfarbe“
(`highlight`-Mark im gemeinsamen ProseMirror-Schema, `src/formats/shared/schema.ts`).
Nicht Teil dieser Anforderung: das strukturell identische, aber inhaltlich andere
Feature „Schriftfarbe“ (`textColor`-Mark, Slug `schriftfarbe`, eigene Anforderungsdatei
`specs/schriftfarbe-req.md`) — beide teilen sich dieselbe generische Toolbar-/Command-
Infrastruktur (`applyMarkColor`/`clearMarkColor`, `ColorMarkName`) und werden nur dort
gemeinsam betrachtet, wo sie **kombiniert** auftreten (Abschnitt 2.4/2.5) oder ein
Befund identisch auf beide zutrifft (dann als Querverweis vermerkt). Gilt für **beide**
Formate, DOCX und ODT, sowohl beim Import einer bestehenden Datei als auch beim Export
eines im Editor erstellten/bearbeiteten Dokuments — inklusive Rundreise (Datei hochladen
→ **unverändert** exportieren → Ergebnis entspricht inhaltlich dem Original). Stil und
Gliederung orientieren sich an `E:\docs\FEATURE-SPEC-DOCX-ODT.md` bzw.
`specs/fett-req.md`/`specs/schriftfarbe-req.md`.

Referenzierter Ist-Stand des Codes (Grundlage dieser Anforderung, **kein** Nachweis der
Korrektheit — das ist Aufgabe der Verifikation; alle Zeilenangaben am aktuellen Stand
geprüft):

| Ort | Inhalt (verifiziert) |
|---|---|
| `src/formats/shared/schema.ts:189-195` | Mark `highlight`, `attrs: { color: { validate: 'string' } }` (keine Formatvalidierung außer „ist ein String“); `parseDOM: [{ style: 'background-color', getAttrs: (value) => ({ color: value }) }]`; `toDOM(mark)` rendert `['span', { style: 'background-color: ' + mark.attrs.color }, 0]`. Kein `excludes` gesetzt → ProseMirror-Default „Mark schließt nur sich selbst (dieselbe Mark-Art) aus“. |
| `src/formats/shared/schema.ts:182-188` | Schwester-Mark `textColor` (nur zum Vergleich; identische Struktur, `parseDOM` auf CSS `color`, `toDOM` `color:`). |
| `src/formats/shared/editor/Toolbar.tsx:211-219` | Farbwähler: `<label title="Hervorhebungsfarbe">` mit Emoji `🖍` (`<span aria-hidden>`) und `<input aria-label="Hervorhebungsfarbe" type="color">`; `onChange` ruft `run(view, applyMarkColor('highlight', e.target.value))`. **Kein gebundener `value`** — das Element zeigt nie die tatsächlich an Cursor/Selektion vorhandene Farbe. |
| `src/formats/shared/editor/Toolbar.tsx:220-230` | „Entfernen“-Button, `title="Hervorhebung entfernen"`, Glyph `⌫` (Unicode-Zeichen, kein SVG), `onMouseDown` → `clearMarkColor('highlight')`. **Nicht `disabled`** (anders als der „Ausschneiden“-Button, der `disabled={!canCut(...)}` trägt) und **ohne** `aria-pressed`. **Kein `aria-label`** (nur `title`) und **kein `onClick`/`onKeyDown`** — per Volltextsuche über die gesamte Datei bestätigt, dass `Toolbar.tsx` an keiner Stelle `onClick`/`onKeyDown` verwendet (Grenzfall 3.21/3.22). |
| `src/formats/shared/editor/Toolbar.tsx:28-31` | Hilfsfunktion `run(view, command)`: führt den Befehl aus und ruft **danach** `view.focus()` (relevant für Grenzfall 2.8). |
| `src/formats/shared/editor/Toolbar.tsx:55-89` | `MarkButton` (Fett/Kursiv/Unterstrichen/Durchgestrichen) mit `aria-pressed` je `markType.isInSet($from.marks())` — dieses Zustands-Muster existiert für Hervorhebung **nicht**. |
| `src/formats/shared/editor/commands.ts:104` | `export type ColorMarkName = 'textColor' \| 'highlight'` — beide Farb-Marks teilen sich die generischen Befehle. |
| `src/formats/shared/editor/commands.ts:106-113` | `applyMarkColor(markName, color)`: **`if (empty) return false`** (Z. 109), sonst `tr.addMark(from, to, marks[markName].create({ color }))`. Kein „Schreibmarken-/stored-mark-Modus“ wie bei Fett/Kursiv. |
| `src/formats/shared/editor/commands.ts:115-122` | `clearMarkColor(markName)`: **`if (empty) return false`** (Z. 117), sonst `tr.removeMark(from, to, marks[markName])`. |
| `src/formats/shared/editor/WordEditor.tsx:85-107` | Keymap-Block (`keymap({…})` ab Z. 85): `Mod-z`/`Mod-y`/`Mod-Shift-z` (Z. 93-95), `Enter`/`Shift-Enter` (Z. 96-97), `Mod-b`/`Mod-i`/`Mod-u` (Z. 98-100), `Shift-Delete` (Z. 106). **Keine** Tastenkombination für Farbe/Hervorhebung. (Kommentar Z. 86-92 hält ausdrücklich fest, dass `Mod-c`/`Mod-x`/`Mod-v` bewusst *nicht* gebunden sind.) |
| `src/formats/docx/reader.ts:100-115` (`marksFromRunProperties`) | DOCX-Import liest `<w:shd>`-Attribut `w:fill` (Z. 111-113: `if (fill && fill !== 'auto') → Mark highlight`, Wert `#${fill}`). Das native Word-Element `<w:highlight w:val="…"/>` wird **nirgends** ausgewertet — per Volltextsuche über `src/formats/docx` bestätigt: der String `w:highlight` kommt im gesamten DOCX-Code nicht vor. |
| `src/formats/docx/writer.ts:20-33` (`runPropertiesXml`) | DOCX-Export schreibt für `highlight` ausschließlich `<w:shd w:val="clear" w:color="auto" w:fill="RRGGBB"/>` (Z. 28-30), Farbwert nur via `String(color).replace('#','')`, **keine** Validierung/Normalisierung/Escaping. `<w:highlight>` wird nie erzeugt. |
| `src/formats/docx/writer.ts:41-67` (`inlineToRuns`) | Aufeinanderfolgende Textknoten mit **identischer** Mark-Liste (`JSON.stringify`-Vergleich) werden zu **einem** `<w:r>` zusammengefasst → kombinierte Marks landen in einem gemeinsamen `<w:rPr>`. |
| `src/formats/odt/reader.ts:37-78` (`parseAutomaticStyles`) | ODT-Import: bei `style:family="text"` wird `fo:background-color` aus `style:text-properties` gelesen (Z. 60-61 → `style.highlight`), angewendet als Mark `highlight` in `marksFor` (Z. 110). Bei `style:family="paragraph"` wird **nur** `fo:text-align` gelesen (Z. 63-66), **kein** Absatzhintergrund (siehe Grenzfall 3.13). |
| `src/formats/odt/reader.ts:363-364, 373-374` (`readOdt`) | Es werden **nur** `office:automatic-styles` aus `content.xml` **und** `styles.xml` geparst. `office:styles` (benannte/gemeinsame Zeichenformatvorlagen) werden **nicht** ausgewertet → Hervorhebung, die über eine benannte Zeichenformatvorlage vergeben ist, geht beim Import verloren (siehe Grenzfall 3.14). |
| `src/formats/odt/writer.ts:32-43` (`runPropsFromMarks`) | ODT-Export: Mark `highlight` → `props.highlight = mark.attrs?.color` (Z. 40). |
| `src/formats/odt/styleRegistry.ts:9, 13, 30, 35, 57` | `RunProps.highlight` (Z. 9); `isEmpty` berücksichtigt `highlight` (Z. 13); Dedup je Markkombination via `JSON.stringify(props)` (Z. 30) mit fortlaufenden Namen `T1`,`T2`,… (Z. 35); Ausgabe `fo:background-color="${escapeXml(props.highlight)}"` in `style:text-properties` (Z. 57). |
| `src/formats/docx/__tests__/roundtrip.test.ts:100-117` | Vorhandener Unit-Test „preserves text color and highlight color“ — **direkt konstruiertes** `ProseMirrorJSON` (`#ff0000`/`#ffff00`), nicht über echte Editor-/Toolbar-Bedienung. Laut Auftrag **nicht als vertrauenswürdig** zu werten, aber vorhanden. |
| `src/formats/odt/__tests__/roundtrip.test.ts:102-119` | Analoger Unit-Test für ODT. |
| **`tests/e2e/clipboard.spec.ts:34-47, 148-168`** | **E2E-Test vorhanden.** Hilfsfunktion `pickColor(page, label, hex)` (Z. 34-47) bedient ein natives `<input type="color">` React-korrekt (setzt den Wert über den prototypischen Setter und feuert `input`+`change`). Test „Fett + Farbe + Hervorhebung kombiniert bleiben nach Kopieren/Einfügen erhalten“ (Z. 148-168) ruft `pickColor(page, 'Hervorhebungsfarbe', '#00ff00')` (Z. 156) auf **echter** Toolbar, kopiert und fügt ein und prüft, dass die verschachtelten Marks erhalten bleiben. Auf WebKit `test.skip` (Clipboard-Limitierung), auf Chromium/Firefox aktiv. |
| **`tests/e2e/docx.spec.ts:304`, `tests/e2e/odt.spec.ts:280`** | **E2E-Import-Rundreise vorhanden.** Prüfen nach Import je Format, dass `.ProseMirror span[style*="background-color"]` mit Text „Hervorgehoben“ genau einmal vorkommt. |
| **`tests/e2e/fixtures/fullCoverageDocument.ts:121, 179`** | Gemeinsames Fixture für obige Rundreisen: DOCX-Run `<w:shd w:val="clear" w:color="auto" w:fill="FFFF00"/>` (Z. 121) und ODT-Textstil `fo:background-color="#FFFF00"` (Z. 179), jeweils Text „Hervorgehoben“. |
| `tests/fixtures/external/odt/` | Reale Fremddateien mit potenziell relevantem Hintergrund-/Hervorhebungs-Bezug. **Inhalt (nicht nur Dateiname) durch Entpacken von `content.xml`/`styles.xml` geprüft:** `coloredParagraph.odt` (nur ein einzelnes hervorgehobenes Zeichen über `style:family="text"` in `content.xml`s `office:automatic-styles` — **kein** Absatzhintergrund, entgegen des Namens), `lostBackground.odt` und `character-styles.odt` (beide: `fo:background-color` ebenfalls direkt in `content.xml`s `office:automatic-styles`, `style:family="text"` — **kein** Beleg für einen Importverlust über `office:styles`; `lostBackground.odt` dient im Reader-Code laut Kommentar `odt/reader.ts:311` bereits einem anderen Zweck, leere Tabellenzelle). Alle drei sind daher nur gewöhnliche Highlight-Importtests, nicht die in Grenzfall 3.13/3.14 gesuchten Abgrenzungsfälle — siehe Präambel-Korrektur oben. Ungeprüft (Name, nicht Inhalt, verifiziert): `TableFunkyBackground.odt`, `coloredTable_MSO15.odt`, `feature_attributes_character_MSO15.odt`, `text-color-from-paragraph.odt`, `sameLocationSpansUsingMultipleTemplateStyles_BOLD-Outer-ITALIC-Inner-Text-Yellow.odt`. |
| `tests/fixtures/external/docx/` (127 Dateien) | **Konkret verifiziert** (Entpacken je Datei + `grep w:highlight` in `word/document.xml`): genau **zwei** reale Word-Dateien enthalten native `<w:highlight>` — `bug57031.docx` (`<w:highlight w:val="lightGray"/>`, 8×) und `bug65649.docx` (`w:val="yellow"`/`"green"`/`"cyan"`). Beide nutzen Words **Namens-Palette** (`yellow`/`green`/`cyan`/`lightGray`), also genau die Form, die der Reader ignoriert (er liest nur `<w:shd w:fill>`, `reader.ts:111-113`). Diese beiden Dateien sind der Prüfstoff für Grenzfall 3.7 (Import-Verlust); **keine** Fremddatei muss dafür neu erzeugt werden. Ein reiner Text-`grep` über die `.docx` schlägt fehl (ZIP), daher zwingend `unzip -p`. |
| `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 3 (Z. 94), Abschnitt 17 (Z. 356), Abschnitt 20.1 (Z. 442) | „Hervorhebungsfarbe (Textmarker) — Freie Farbwahl, editierbar/entfernbar“; „Textfarbe / Hervorhebung + ‚Entfernen‘-Buttons — vorhanden — funktional prüfen“; Emoji `🖍`/`⌫` explizit als Rendering-Risiko gelistet. |

---

## 1. Bedienelemente

| # | Element | Fundstelle | Ist-Verhalten (verifiziert) | Anforderung |
|---|---|---|---|---|
| 1 | Farbwähler „Hervorhebungsfarbe“ (`🖍`) | `Toolbar.tsx:211-219`, natives `<input type="color">` | Öffnet den systemeigenen (browser-/OS-abhängigen) Farbwahl-Dialog; `onChange` wendet die Farbe sofort auf die aktuelle Selektion an. **Kein `value`-Binding** → zeigt nie die tatsächlich vorhandene Hervorhebungsfarbe der Selektion, sondern startet immer beim zuletzt vom Browser gemerkten/Standardwert. **Folgerisiko:** ohne bewusste Farbwahl auf `OK`/Bestätigen tippen setzt den Browser-Default (i. d. R. `#000000`) als Hervorhebung — ein deckender schwarzer Balken (Grenzfall 3.18). | Muss geklärt/dokumentiert werden, ob der Farbchip den Ist-Zustand der Selektion widerspiegeln soll (Farbe an `$from`, analog `MarkButton`-`aria-pressed`), inkl. erkennbarer Zustände „keine Hervorhebung“ und „gemischte Farben“ (Grenzfall 3.2). |
| 2 | „Entfernen“-Button (`⌫`) | `Toolbar.tsx:220-230` | `onMouseDown` mit `e.preventDefault()` (Z. 223-224) → `clearMarkColor('highlight')`. Das `preventDefault` auf `mousedown` **erhält die Editor-Selektion** (der Klick zieht den Fokus nicht aus dem Dokument), sodass `clearMarkColor` die noch bestehende Selektion sieht. Wirkt nur bei nicht-leerer Selektion, sonst **stiller No-Op** (Button ist **nicht** `disabled`). Anders der Farbchip (Bedienelement 1): dessen `<input type="color">` nutzt `onChange` **ohne** `preventDefault` und verlässt sich darauf, dass das native Farb-Widget die Dokument-Selektion nicht verwirft; das anschließende `run()`→`view.focus()` (Z. 28-31) holt den Fokus zurück. **Zusätzlich verifiziert:** Der Button besitzt **kein** `onClick`/`onKeyDown` (per Volltextsuche über `Toolbar.tsx` bestätigt — kein einziges Vorkommen in der ganzen Datei), sondern ausschließlich `onMouseDown`. Ein natives `<button>` löst bei Tastaturaktivierung (Tab-Fokus + Enter/Leertaste) laut HTML-Spezifikation nur `click`, nicht `mousedown` aus — der Klick-Handler greift damit vermutlich **nicht** per Tastatur (Grenzfall 3.21; identischer Root-Cause wie `fett-req.md` Defekt A). | Muss bei leerer Selektion deaktiviert sein **oder** eine sichtbare Rückmeldung geben (FEATURE-SPEC Abschnitt 20 Punkt 4 „Kein stiller Fehlschlag“). Vgl. den bereits `disabled`-gesteuerten „Ausschneiden“-Button als vorhandenes Muster im selben File. **Zusätzlich:** Tastatur-Erreichbarkeit (Tab + Enter/Leertaste) muss real im Browser nachgewiesen werden, da laut Bedienelement 3 **keine** Tastenkombination als Ausweichmöglichkeit existiert — sonst ist „Hervorhebung entfernen“ für rein tastaturgestützte Nutzung **überhaupt nicht erreichbar** (Grenzfall 3.21). |
| 3 | Tastenkombination | nicht vorhanden (`WordEditor.tsx:85-107`) | Keine Möglichkeit, Hervorhebung per Tastatur zu setzen/entfernen. | Zu klären, ob ein Shortcut erwartet wird. Das Backlog fordert nur „freie Farbwahl“, keinen Shortcut; Word/LibreOffice haben ebenfalls keinen Standard-Shortcut für freie Hintergrundfarbe. Falls nicht gefordert: **explizit als bewusste Lücke dokumentieren**, nicht stillschweigend fehlen lassen. |
| 4 | Icon-Rendering (`🖍`, `⌫`) | `Toolbar.tsx:212, 229` — reine Unicode-Emoji/-Zeichen, kein SVG | Auf Systemen ohne Emoji-/Glyphen-Schriftart ggf. als leeres Rechteck/Ersatzzeichen sichtbar (FEATURE-SPEC Abschnitt 20.1). **Korrigiert (dieser Durchlauf):** „`aria-label`/`title` vorhanden“ gilt nachweislich **nur** für den Farbwähler-`<input>` (`aria-label="Hervorhebungsfarbe"`, Z. 214) — der „Entfernen“-Button selbst (Z. 220-230) trägt **kein** `aria-label`, nur `title`. Nach dem Accessible-Name-Berechnungsalgorithmus wird der Name eines `<button>` ohne `aria-label`/`aria-labelledby` aus seinem **Textinhalt** gebildet, bevor `title` als Fallback greift — vorgelesen würde vermutlich das Glyph „⌫“ selbst bzw. dessen Unicode-Beschreibung, **nicht** „Hervorhebung entfernen“ (Grenzfall 3.22, eigenständig von der reinen Rendering-Frage). | Auf mind. einem System ohne Standard-Emoji-Unterstützung visuell prüfen; Entscheidung „beibehalten“ vs. „auf SVG umstellen“ dokumentieren (vgl. bereits umgestellte `ScissorsIcon` im selben File als Vorbild). Zusätzlich: `aria-label="Hervorhebung entfernen"` (analog zum Farbwähler) auf dem „Entfernen“-Button nachrüsten **oder** per Screenreader-Test bestätigen, dass der aktuelle Zustand ausreicht, bevor „vertrauenswürdig“ gilt. |
| 5 | Aktiver-Zustand-Anzeige | nicht vorhanden — kein `aria-pressed`, keine aktive CSS-Klasse wie bei `MarkButton` (`Toolbar.tsx:55-89`) | Für Hervorhebung gibt es **keinerlei** visuelle Kennzeichnung „hier bereits aktiv (und mit welcher Farbe)“. | Muss spezifiziert und nachgerüstet **oder** als bewusst fehlend dokumentiert werden (Voraussetzung für „vertrauenswürdig“, siehe 2.3). |
| 6 | Kontextmenü (Rechtsklick) | nicht vorhanden (kein eigener `contextmenu`-Handler; natives Menü bleibt) | — | Wie bei Fett/Schriftfarbe: nicht Teil dieser Anforderung, aber als fehlend zu dokumentieren. |
| 7 | Reihenfolge/Position in der Toolbar | `Toolbar.tsx:211-230` | Hervorhebungs-Farbwähler + „Entfernen“ stehen direkt **nach** dem Schriftfarben-Paar (`Toolbar.tsx:191-210`), vor dem Trenner zu den Ausrichtungs-Buttons. | Rein informativ — bei Umbauten an der Toolbar-Reihenfolge muss dieses Feature mitgeprüft werden. Achtung: Schriftfarbe und Hervorhebung nutzen **beide** `<input type="color">` mit `aria-label` — E2E-Selektoren müssen über das jeweilige `aria-label` (`'Textfarbe'` vs. `'Hervorhebungsfarbe'`) unterscheiden, nie über Position. |

---

## 2. Gewünschtes Verhalten im Detail

### 2.1 Anwenden auf bestehende Selektion
- Ist mindestens ein Zeichen markiert → die gesamte Selektion erhält die gewählte
  Hervorhebungsfarbe (`commands.ts:110`, `tr.addMark(from, to, …)`).
- War die Selektion zuvor **einheitlich** mit einer anderen Farbe hervorgehoben → die
  alte Farbe wird durch die neue ersetzt: `highlight` definiert kein `excludes`, greift
  also den ProseMirror-Default „eine Mark-Art schließt sich selbst aus“; `Mark.addToSet`
  entfernt beim Hinzufügen die bestehende `highlight`-Mark und setzt die neue.
  Zu **verifizieren** (nicht nur aus der Semantik abzuleiten): genau **eine** `highlight`-
  Mark pro Zeichen nach dem Ersetzen, kein Nebeneinander zweier Farbwerte.
- War die Selektion **gemischt** (teils andere Farbe, teils keine) → definiertes Ergebnis:
  gesamte Selektion einheitlich neue Farbe (Grenzfall 3.2).
- Die Selektion bleibt nach der Aktion unverändert bestehen (Auswahlgrenzen erhalten,
  damit direkt weiterformatiert werden kann) — zu bestätigen.
- Die Aktion ist ein einzelner Undo-Schritt pro abgeschlossener Farbwahl (siehe 2.8 zur
  Event-Granularität des nativen Farbwählers).

### 2.2 Keine Anwendung an der Schreibmarke (bewusste Bereichsentscheidung, zu bestätigen)
- Anders als bei Fett/Kursiv/Unterstrichen/Durchgestrichen gibt es **keinen**
  „vorgemerkten Mark für zukünftige Eingabe“-Modus: `applyMarkColor`/`clearMarkColor`
  geben bei leerer Selektion sofort `false` zurück (`commands.ts:109, 117`), es passiert
  nichts — insbesondere nimmt neu getippter Text **nicht** die zuvor „gewählte“ Farbe an.
- Das deckt sich mit der Backlog-Formulierung „Hintergrund-Hervorhebung **der Selektion**“
  (nicht „der Schreibmarke“) und ist damit vermutlich beabsichtigt, aber nirgends explizit
  als Absicht dokumentiert — muss bestätigt und hier nachgetragen werden. (Identischer
  Befund wie `schriftfarbe-req.md` Abschnitt 3.2 — dort dieselbe Klärung offen.)
- Unabhängig von der fachlichen Absicht verstößt das Fehlen jeder Rückmeldung bei diesem
  No-Op gegen „kein stiller Fehlschlag“ (FEATURE-SPEC Abschnitt 20 Punkt 4) und muss
  behoben (z. B. Button `disabled`/Hinweis) oder als bewusste Ausnahme begründet werden.

### 2.3 Anzeige des aktiven Zustands (bekannte Lücke)
- Weder der Farbwähler noch ein anderes Element zeigt an, ob und mit welcher Farbe der
  Text an der Cursor-Position/Selektion bereits hervorgehoben ist (Bedienelement 1 und 5).
- Zu spezifizieren: Soll der Farbchip bei Cursorbewegung die aktuelle Farbe an `$from`
  laden? Wie wird eine **gemischte** Selektion dargestellt (kein Vorauswahlwert / neutraler
  Zustand / Hinweistext)?
- Diese Klärung ist Voraussetzung, bevor „vorhanden“ als vertrauenswürdig gelten kann,
  weil Nutzer:innen sonst nicht zuverlässig erkennen, ob (und womit) eine Stelle bereits
  markiert ist.

### 2.4 Kombination mit anderen Zeichenformaten
- Hervorhebungsfarbe muss gleichzeitig mit Fett, Kursiv, Unterstrichen, Durchgestrichen
  und **Schriftfarbe** auf demselben Textlauf anwendbar sein; keines der anderen Marks
  darf beim Setzen/Ändern/Entfernen der Hervorhebung verändert werden (Marks sind in
  ProseMirror unabhängig, solange kein `excludes` zwischen ihnen gesetzt ist — für
  `highlight`/`textColor` ist keines gesetzt).
- Reihenfolge des Anwendens (erst Schriftfarbe, dann Hervorhebung oder umgekehrt) darf
  zu keinem unterschiedlichen Endergebnis führen.
- **Verifikation über echte Bedienung ist bereits teilweise vorhanden:**
  `clipboard.spec.ts:148-168` setzt Fett + Schriftfarbe + Hervorhebung gemeinsam und
  prüft, dass die Kombination Kopieren/Einfügen übersteht — dieser Test bestätigt die
  Unabhängigkeit der Marks bereits, deckt aber Export/Rundreise nicht ab (siehe 4).

### 2.5 Zusammenspiel mit Schriftfarbe (Kontrast)
- Schriftfarbe (Vordergrund, `textColor`) und Hervorhebungsfarbe (Hintergrund,
  `highlight`) sind vollständig unabhängige Marks ohne jede automatische Kontrastprüfung.
- Bei ähnlicher/identischer Vorder-/Hintergrundfarbe (z. B. schwarz auf schwarz) wird der
  Text faktisch unlesbar — kein technischer Fehler, aber ein zu dokumentierender
  UX-Grenzfall (3.4/3.12). Eine Kontrastwarnung ist **nicht** gefordert (vgl.
  `schriftfarbe-req.md` Abschnitt 1, Nicht-Ziel).

### 2.6 Entfernen der Hervorhebung
- „Entfernen“ löscht das `highlight`-Mark vollständig aus dem gewählten Bereich
  (`commands.ts:119`, `tr.removeMark`), unabhängig von der/den zuvor vorhandenen Farbe(n)
  — auch bei gemischten Farben wird der gesamte Bereich hervorhebungsfrei.
- Streng zu unterscheiden von „Hervorhebungsfarbe auf Weiß setzen“: Weiß ist eine
  gewöhnliche, explizit gespeicherte Farbe (`color: '#ffffff'`), keine Sondermarkierung
  für „keine Hervorhebung“ — beide Zustände müssen bei Rundreise unterscheidbar bleiben
  (Grenzfall 3.6).
- Es gibt **kein** Toggle: Setzen und Entfernen sind getrennte Aktionen (anders als
  Fett/Kursiv via `toggleMark`). Entfernen auf einer Selektion ohne jede Hervorhebung ist
  ein No-Op auf ProseMirror-Ebene (Grenzfall 3.15).

### 2.7 Zwischenablage / Kopieren & Einfügen
- Kopieren von hervorgehobenem Text innerhalb des Editors und Einfügen an anderer Stelle
  behält das `highlight`-Mark samt Farbwert — **teilweise bereits abgedeckt** durch
  `clipboard.spec.ts:148-168` (kombiniert mit Fett + Schriftfarbe). Ein Test **nur** für
  Hervorhebung (ohne die anderen Marks) fehlt und ist zu ergänzen.
- Einfügen von extern kopiertem Text mit inline `background-color`-Style (z. B. aus einer
  Webseite) wird als `highlight`-Mark erkannt (`schema.ts:191`, `parseDOM` auf
  `background-color`) — **ungeprüft, welcher Wert das ist** (kein Format-Check; siehe
  Grenzfall 3.9 zu Named Colors/`rgb()`/`rgba()`).
- Einfügen von Text mit `background-color: transparent` bzw. ganz ohne Hintergrundfarbe
  erzeugt erwartungsgemäß **kein** `highlight`-Mark — zu bestätigen (auch: `transparent`
  darf nicht als Farbwert `"transparent"` in einen `highlight`-Mark geraten).

### 2.8 Undo/Redo und Event-Granularität des Farbwählers
- Anwenden einer Hervorhebungsfarbe soll — wie bei Fett — einen einzelnen, eigenständigen
  Undo-Schritt erzeugen; Redo stellt die zuletzt entfernte/geänderte Farbe wieder her.
- **Risiko (browserübergreifend zu prüfen):** `<input type="color">` ist nativ; React
  bindet `onChange` an das native `input`-Event. In manchen Browsern (v. a. Chromium)
  feuert `input` **fortlaufend** während des Ziehens im Farbrad — jedes Feuern löst hier
  sofort `applyMarkColor` und damit eine eigene Transaktion aus. Folge wäre eine Kette
  mehrerer Undo-Schritte für eine als **eine** Aktion wahrgenommene Farbwahl.
  - Wichtiger Verifikationshinweis: Der vorhandene `pickColor`-Helper
    (`clipboard.spec.ts:39-46`) feuert `input`+`change` **je einmal** und erzeugt damit
    genau **eine** Transaktion — das reale „Ziehen“ mit vielen Zwischenwerten wird von
    diesem Helper **nicht** nachgestellt. Der Mehrfach-Undo-Verdacht bleibt also trotz
    vorhandenem Test **offen** und muss gesondert (echtes Dragging, mind. Chromium +
    Firefox) geprüft werden.
- **`view.focus()` bei offenem Dialog:** `run()` (`Toolbar.tsx:28-31`) ruft nach dem
  Befehl `view.focus()`. Feuert `onChange` mehrfach bei noch geöffnetem nativem Dialog,
  wird `view.focus()` mehrfach aufgerufen, während der Fokus eigentlich im Farbwähler
  liegen sollte — kann in manchen Browsern das vorzeitige Schließen des Popups auslösen.
  Zu verifizieren (identischer Befund wie `schriftfarbe-req.md` Abschnitt 3.4).

---

## 3. Grenzfälle

1. **Leere Selektion (nur Cursor):** Farbe wählen oder „Entfernen“ klicken → aktuell
   vollständiger, unbemerkter No-Op (2.2). Klären: Steuerelemente deaktivieren oder
   sichtbare Rückmeldung, statt stillschweigend nichts zu tun.
2. **Gemischte Selektion:** Selektion mit unterschiedlichen bestehenden Hervorhebungs-
   farben und/oder gar keiner → definiertes Verhalten (gesamte Selektion erhält einheitlich
   die neu gewählte Farbe, `tr.addMark` über den ganzen Bereich) muss mit Testfall
   nachgewiesen werden; zusätzlich klären, was der Farbwähler dabei anzeigen soll (2.3).
3. **Hervorhebung über Bild-/Tabellengrenze hinweg:** Selektion über Text, Bild und/oder
   Tabellenzelle (z. B. Strg+A über gemischten Inhalt) → darf nicht abstürzen; Hervorhebung
   wirkt nur auf textuelle Inline-Inhalte, Bild-/Tabellenstruktur bleibt unverändert.
4. **Kontrastproblem:** Hervorhebung ≈ Schriftfarbe bzw. ≈ Papierfarbe → kein Absturz,
   aber optisch unlesbarer Text; dokumentieren, ob dies bewusst der Nutzerin überlassen
   bleibt (wie in echten Textverarbeitungen) oder ob ein Hinweis erwartet wird (2.5).
5. **Erneutes Setzen derselben Farbe:** Wahl einer Farbe, die bereits exakt so vorhanden
   ist → kein Fehler; klären, ob ein „leerer“ Undo-Schritt entstehen darf oder vermieden
   werden muss.
6. **Hervorhebung „Weiß“ / Farbe identisch zur Papierfarbe:** Muss bei Rundreise als
   **explizit gesetzte** Farbe erhalten bleiben und darf nicht mit „keine Hervorhebung“
   verwechselt werden (weder Import noch Export) — siehe 2.6.
7. **Import einer echten Word-Datei mit nativer Hervorhebung (`<w:highlight w:val="…"/>`,
   nicht `<w:shd>`):** Der DOCX-Reader wertet ausschließlich `<w:shd w:fill>` aus
   (`docx/reader.ts:111-113`) und kennt `<w:highlight>` nicht (per Volltextsuche über
   `src/formats/docx` bestätigt). **Belegter Verdacht: Diese Hervorhebung geht beim Import
   vollständig und ohne Fehlermeldung verloren.** Das kollidiert mit FEATURE-SPEC Abschnitt
   18 („ein Import darf niemals dazu führen, dass sichtbarer Inhalt ersatzlos verschwindet“
   — hier eine bedeutungstragende Formatierung). **Prüfstoff liegt konkret vor** (im Repo
   verifiziert, siehe Ist-Stand-Tabelle): `tests/fixtures/external/docx/bug57031.docx`
   (`<w:highlight w:val="lightGray"/>`) und `bug65649.docx`
   (`w:val="yellow"`/`"green"`/`"cyan"`). Beide über den echten Import laden und
   nachweisen, ob die Hervorhebung im Editor-DOM erscheint (erwartet: **nein** — belegter
   Verlust) — kein Neuerzeugen einer Word-Datei nötig. Konsequenz festlegen (Unterstützung
   für `<w:highlight>` nachrüsten, inkl. Mapping der ~15 Namensfarben auf Hex, oder Verlust
   bewusst dokumentieren). **Kritischster Punkt dieser Anforderung.**
8. **Export-Kompromiss `w:shd` statt `w:highlight`:** Word-`<w:highlight>` erlaubt nur eine
   feste Palette von ~15 Namensfarben und ist daher mit „freier Farbwahl“ unvereinbar — die
   App weicht bewusst auf `<w:shd>` (Schattierung) aus. In echtem Word ist für solchen Text
   das „Text hervorheben“-Werkzeug vermutlich **nicht** als aktiv markiert (Word fragt ein
   anderes Element ab); visuell gleich, funktional eine andere Word-Funktion. Mit echtem
   Word/gleichwertigem Prüfwerkzeug verifizieren und als **bewusste, dokumentierte
   Design-Entscheidung** festhalten (nicht als unklarer Bug).
9. **Ungültige/untypische Farbwerte beim Einfügen von Fremd-HTML — und ein interner Pfad:**
   `schema.ts:191` übernimmt den Rohwert ungeprüft. Der DOCX-Writer (`writer.ts:29`)
   verarbeitet ihn nur mit `.replace('#','')` und schreibt ihn direkt in `w:fill` — laut
   OOXML sind dort **nur** Hex-`RRGGBB` oder `auto` zulässig. Ein Wert wie `yellow`,
   `rgb(0, 255, 0)` oder `rgba(255,255,0,0.4)` ergibt damit **ungültiges** `w:fill`.
   - **Konkreter interner Auslöser (nicht nur Fremd-HTML):** Beim Kopieren/Einfügen
     **innerhalb** des Editors serialisiert `toDOM` `background-color: #00ff00`, doch der
     Browser kann den Wert beim Zurücklesen als `rgb(0, 255, 0)` normalisieren. Landet
     dieser Wert im `highlight`-Mark, erzeugt der DOCX-Export `w:fill="rgb(0, 255, 0)"`
     (ungültig). Das ist ein realer Pfad, der ohne Fremddatei erreichbar ist und über die
     bestehende Copy/Paste-Kette (`clipboard.spec.ts`) plus anschließenden Export geprüft
     werden muss.
   - ODT weicht ab: `styleRegistry.ts:57` schreibt `fo:background-color="${escapeXml(...)}"`
     — Named Colors/`rgb()` sind in ODF teils tolerierter, aber `rgba()` mit Alpha ist auch
     hier nicht gültig. Beide Export-Pfade sind auf diesen Wert getrennt zu prüfen.
   - Anforderung: klären, ob eine Normalisierung/Validierung vor dem Export existiert
     (aktuell nicht) oder ob dieser Ungültigkeits-/Datenverlust-Pfad zumindest bekannt und
     dokumentiert ist. Für „vertrauenswürdig“ ist mindestens ein gezielter Testfall Pflicht.
10. **Entfernen in leerem Listenpunkt/leerer Tabellenzelle:** Aktion ohne Text davor/danach
    → kein Rendering-Fehler, kein leerer `<w:r>`/`<text:span>` ohne Inhalt im Export.
11. **Schnelles Ziehen im nativen Farbwähler:** siehe 2.8 — mögliche Mehrfach-
    transaktionen/-Undo-Schritte für eine wahrgenommene Aktion; vom vorhandenen
    `pickColor`-Helper **nicht** abgedeckt.
12. **Hervorhebungsfarbe = Schriftfarbe (Text de facto unsichtbar):** kein technischer
    Fehler, aber zu dokumentierender UX-Grenzfall (2.5).
13. **ODT: Absatz-Hintergrund vs. Zeichen-Hervorhebung:** `fo:background-color` kann in ODF
    auf `style:text-properties` (Zeichen-Hervorhebung — dieses Feature) **oder** auf
    `style:paragraph-properties` (Absatzhintergrund — anderes, hier nicht implementiertes
    Feature) stehen. `odt/reader.ts` liest `background-color` **nur** aus der `text`-Familie
    (Z. 60-61); die `paragraph`-Familie liefert nur `fo:text-align` (Z. 63-66). **Korrektur
    dieses Durchlaufs:** Die zuvor hierfür vorgeschlagene Datei `coloredParagraph.odt` wurde
    entpackt und geprüft — sie enthält **keinen** Absatzhintergrund, sondern trotz ihres
    Namens nur ein gewöhnlich hervorgehobenes Einzelzeichen
    (`style:family="text"`, `fo:background-color="#92D050"` auf `<text:span
    text:style-name="a9905fb">a</text:span>`, Rest des Absatzes „bc" ohne Hervorhebung; kein
    einziges `fo:background-color` auf `style:paragraph-properties` in der ganzen Datei). Sie
    taugt als gewöhnlicher Highlight-Importtest, **nicht** als Beleg für diesen Grenzfall.
    Für diesen Grenzfall muss weiterhin **eine echte Datei mit reinem
    Absatzhintergrund gesucht oder händisch gebaut werden** (ein `<style:style
    style:family="paragraph"><style:paragraph-properties fo:background-color="…"/>…`
    referenziert von einem `text:p`, ohne begleitenden `text:span` mit eigenem
    `fo:background-color`) → darf **nicht** fälschlich als Zeichen-Hervorhebung importiert
    werden, und der Absatzhintergrund darf nicht unbemerkt komplett verschwinden (Fallback
    dokumentieren).
14. **ODT-Import: Hervorhebung über eine benannte Zeichenformatvorlage (`office:styles`):**
    `readOdt` parst **nur** `office:automatic-styles` aus `content.xml`/`styles.xml`
    (Z. 363-364, 373-374), **nicht** `office:styles`. Wird die Hervorhebung in einer echten
    LibreOffice-Datei über eine **benannte** Zeichenformatvorlage (statt Direktformatierung)
    vergeben, geht sie beim Import vermutlich verloren (kein Absturz, aber stiller Verlust der
    Formatierung). **Korrektur dieses Durchlaufs:** Die zuvor hierfür vorgeschlagenen Dateien
    `lostBackground.odt` und `character-styles.odt` wurden entpackt und geprüft — in **beiden**
    steht der fragliche `fo:background-color` direkt in einem `style:family="text"`-Element
    innerhalb von `content.xml`s **eigenem** `office:automatic-styles` (per Byte-Offset-
    Vergleich bestätigt), also genau dort, wo `parseAutomaticStyles` bereits liest. Beide
    Dateien belegen diesen Grenzfall damit **nicht** (sie sind lediglich gewöhnliche
    Highlight-Importtests; `lostBackground.odt` hat zudem laut Code-Kommentar
    `odt/reader.ts:311` bereits eine andere, dokumentierte Funktion — leere Tabellenzelle
    ohne `text:p`). Es fehlt weiterhin eine **verifizierte** Datei, deren Hervorhebungsstil
    ausschließlich in `office:styles` (nicht in `office:automatic-styles`) steht — vor dem
    eigentlichen Test zwingend per `unzip -p … | grep` bestätigen, nicht nur am Dateinamen
    vermuten. (Analog `schriftfarbe-req.md` Grenzfall 4.12 — dort dieselbe Klärung offen.)
15. **Wiederholtes Entfernen ohne vorheriges Setzen:** „Entfernen“ auf eine Selektion ohne
    Hervorhebung → `removeMark` ist ein No-Op, darf keinen leeren Undo-Schritt oder Fehler
    erzeugen.
16. **Groß-/Kleinschreibung des Hex-Werts bei Fremddateien:** Über die eigene UI kommt der
    Wert aus `<input type="color">` immer als `#rrggbb` (klein). Word schreibt `w:fill`
    häufig groß (`FFFF00`), der DOCX-Reader stellt daraus `#FFFF00` her. Der ODT-Dedup-Key
    (`styleRegistry.ts:30`, `JSON.stringify(props)`) vergleicht **String-exakt** →
    `#FFFF00` und `#ffff00` erzeugen zwei separate, optisch identische Stildefinitionen
    (keine Fehlfunktion, aber unnötige Style-Vervielfachung). Rundreise-Tests, die auf
    exakte String-Gleichheit prüfen, müssen case-insensitiv vergleichen, damit ein reiner
    Groß-/Klein-Unterschied nicht fälschlich als Verlust gilt.
17. **`<w:rPr>`-Kindelement-Reihenfolge bei kombinierten Marks (OOXML-Schema-Validität):**
    `writer.ts:20-33` gibt die Kinder in der Reihenfolge `b, i, u, strike, color, shd` aus.
    Das OOXML-Schema (`CT_RPr`) verlangt jedoch u. a. `strike < color < u < shd`. Für die
    Hervorhebung selbst (`w:shd`, als **letztes** Element ausgegeben) ist die Reihenfolge in
    allen paarweisen Kombinationen unkritisch. **Aber** ein maximal kombinierter Run
    (Hervorhebung **plus Unterstrichen** plus Schriftfarbe/Durchgestrichen) setzt `u` **vor**
    `strike`/`color` — potenzielle Verletzung der Schema-Reihenfolge. Word liest das i. d. R.
    tolerant, ein **strikter** OOXML-Schema-Validator (den die Abnahme in Abschnitt 6 fordert)
    kann es jedoch beanstanden. Beim kombinierten Export-Test (4.1.3) einen Run mit
    Hervorhebung **und Unterstrichen** aufnehmen und gegen ein striktes Schema validieren.
18. **Ungewollte schwarze Hervorhebung durch den ungebundenen Farbchip:** Das
    `<input type="color">` hat **kein** `value`-Binding (Bedienelement 1) und zeigt daher
    beim Öffnen den Browser-Default bzw. den zuletzt in der Sitzung gewählten Wert. Öffnet
    eine Nutzerin den Farbwähler und bestätigt **ohne bewusste Auswahl**, wird der Default
    (in den meisten Browsern `#000000`) als Hervorhebung gesetzt. Für die **Hintergrund**-
    farbe ist das gravierender als für die Schriftfarbe: `#000000` erzeugt einen deckenden
    schwarzen Balken; zusammen mit der (ebenfalls schwarzen) Standard-Schriftfarbe ist der
    Text danach **vollständig unlesbar**, ohne dass ein Fehler erkennbar wäre. Zu
    verifizieren und zu entscheiden: Soll der Chip vorbelegt werden (z. B. mit der Farbe an
    `$from`, siehe 2.3), damit „bestätigen ohne Änderung“ nichts Unerwartetes tut? Grenzt
    an Grenzfall 3.1 (kein stiller Fehlschlag) und 3.6 (explizit gesetzte Farbe vs. „keine
    Hervorhebung“ — ein so entstandenes `#000000` ist eine *echte*, exportierte Mark, kein
    Versehen, das der Export erkennen könnte). (Analog `schriftfarbe-req.md` Grenzfall 4.9,
    dort für `textColor`; für die Hervorhebung wegen der Deckung schwerwiegender.)
19. **DOCX-`w:fill` wird nicht XML-escaped — Gefahr *nicht wohlgeformter* Datei (härter als
    3.9):** Der DOCX-Writer schreibt den Farbwert mit **nur** `String(color).replace('#','')`
    direkt in `w:fill` (`writer.ts:29`) — **ohne** `escapeXml`, obwohl `escapeXml` in
    derselben Datei für Textinhalt, Alt-Text und `dc:title` verwendet wird. Der ODT-Writer
    dagegen escaped (`styleRegistry.ts:57`, `fo:background-color="${escapeXml(...)}"`). Enthält
    der Farbwert der `highlight`-Mark ein `"`, `&` oder `<` — erreichbar über eingefügtes
    Fremd-HTML mit einem präparierten `background-color`-Wert, dessen Rohtext ungeprüft in die
    Mark übernommen wird (`schema.ts:191`, `parseDOM` ohne Format-Check) — entsteht **nicht
    wohlgeformtes** OOXML (das betroffene `word/document.xml` lässt sich von keinem konformen
    Parser mehr öffnen). Das ist eine **stärkere** Fehlerklasse als der schema-*ungültige*,
    aber wohlgeformte Fall aus Grenzfall 3.9 (`yellow`/`rgb(...)`). Gezielter Testfall: Wert
    mit `"`/`&` in die `highlight`-Mark bringen, exportieren, Datei auf Wohlgeformtheit prüfen
    (XML-Parser über `word/document.xml`). Konsequenz: `escapeXml` auf `w:fill` nachrüsten
    oder Farbwert vor Export nach `#rrggbb` normalisieren/validieren. (Analog
    `schriftfarbe-req.md` Grenzfall 21 für `w:color w:val`.)
20. **ODT-Import: alternatives Hervorhebungs-Attribut `style:text-background-color`:** Der
    ODT-Reader liest Zeichen-Hervorhebung **ausschließlich** aus `fo:background-color`
    (`reader.ts:60-61`). LibreOffice/ODF kennen für „Zeichen hervorheben (Textmarker)“
    historisch bzw. je nach Version/Filter aber auch das (in ODF standardisierte, zugunsten
    von `fo:background-color` veraltete) Attribut `style:text-background-color` — sowie ggf.
    herstellerspezifische `loext:`-Erweiterungsattribute für Zeichen-Schattierung, deren
    genaue Benennung vor dem Test an der konkreten Datei zu ermitteln ist. Wird eine reale Datei
    mit einem dieser alternativen Attribute (statt `fo:background-color`) importiert, geht die
    Hervorhebung **still verloren** — analog zum DOCX-`<w:highlight>`-Fall (3.7), nur auf der
    ODT-Seite. Mit einer LibreOffice-Datei prüfen, die die Hervorhebung nachweislich über
    `style:text-background-color` serialisiert (vor dem Test durch Entpacken von `content.xml`
    bestätigen, welches Attribut die Datei tatsächlich verwendet); Fallback dokumentieren oder
    zusätzliches Attribut im Reader unterstützen.
21. **„Entfernen“-Button vermutlich nicht per Tastatur auslösbar:** `Toolbar.tsx:220-230`
    verdrahtet den Button ausschließlich an `onMouseDown` (kein `onClick`/`onKeyDown` in der
    gesamten Datei — per Volltextsuche bestätigt). Ein natives `<button>` löst bei
    Tastaturaktivierung (Tab-Fokus + Enter/Leertaste) laut HTML-Spezifikation nur ein
    synthetisches `click`-Ereignis aus, kein `mousedown` — der Handler greift damit
    vermutlich **nicht**. Identischer Root-Cause wie der bereits verifizierte **Defekt A**
    in `specs/fett-req.md` Abschnitt 4 (dort für `MarkButton`), hier erstmals für die
    Hervorhebungs-Bedienelemente dokumentiert. Verschärfend: Da für Hervorhebung **keine**
    Tastenkombination existiert (Bedienelement 3), gibt es — anders als bei „Fett"
    (Strg+B bleibt per Tastatur nutzbar) — **keine** Ausweichmöglichkeit; sollte sich der
    Verdacht bestätigen, ist „Hervorhebung entfernen" für rein tastaturgestützte Bedienung
    **überhaupt nicht erreichbar**. Per echtem `Tab`+`Enter`/`Leertaste` im Browser zu
    verifizieren (nicht nur am Code abzuleiten) und zu beheben (Toggle nach `onClick`
    verschieben, `onMouseDown` behält nur `preventDefault()`) oder als bewusste
    Einschränkung zu dokumentieren.
22. **„Entfernen“-Button ohne `aria-label` — Accessible Name vermutlich falsch:**
    `Toolbar.tsx:220-230` trägt **kein** `aria-label`, nur `title="Hervorhebung
    entfernen"`. Nach dem Accessible-Name-Berechnungsalgorithmus wird der Name eines
    `<button>` ohne `aria-label`/`aria-labelledby` aus seinem **Textinhalt** gebildet,
    bevor `title` als Fallback greift — der vorgelesene Name ist damit vermutlich das
    Glyph „⌫" selbst (bzw. dessen Unicode-Beschreibung), **nicht** „Hervorhebung
    entfernen". Eigenständiger Befund, unabhängig von der bereits bekannten
    Rendering-Frage (leeres Rechteck bei fehlender Emoji-Schriftart, Bedienelement 4):
    Selbst wer die Glyphe korrekt sieht, bekäme als Screenreader-Nutzer:in keinen
    verständlichen Namen vorgelesen. Mit einem echten Screenreader oder der
    Accessibility-Baumansicht der Browser-Devtools zu verifizieren; Fix: `aria-label`
    analog zum Farbwähler-`<input>` ergänzen.

---

## 4. Rundreise-Anforderung (Pflicht für Abnahme)

Für **jeden** Fall gilt: Datei mit Hervorhebungsfarbe hochladen (bzw. im Editor erzeugen)
→ **unverändert** exportieren → erneut importieren → Hervorhebung inhaltlich exakt erhalten
(gleiche Textstelle, gleicher Farbwert case-insensitiv, kein Verlust, keine zusätzliche/
fehlende Hervorhebung an anderer Stelle).

### 4.1 DOCX
1. Im Editor Text markieren, Hervorhebung (z. B. `#ffff00`) setzen, als DOCX exportieren →
   mit **unabhängigem** Parser (python-docx oder direktes Parsen von `word/document.xml`)
   prüfen: genau `<w:shd w:val="clear" w:color="auto" w:fill="ffff00"/>` im `w:rPr` des
   betroffenen Runs, kein anderer Run fälschlich betroffen.
2. Dieselbe Datei erneut importieren → Farbe exakt (`#ffff00`) an derselben Stelle,
   restlicher Text ohne Hervorhebung.
3. Hervorhebung + Fett + Schriftfarbe **und zusätzlich Unterstrichen** auf demselben
   Textlauf → Rundreise erhält alle Merkmale gemeinsam auf **einem** Run
   (`inlineToRuns`-Merge, `writer.ts:41-67`), nicht auf getrennte Runs aufgeteilt;
   zusätzlich Export gegen striktes OOXML-Schema prüfen (Grenzfall 3.17).
4. Hervorhebung entfernt (vormals hervorgehobener Text wieder normal) → Export enthält für
   diesen Run **kein** `<w:shd>` mehr.
5. **Kritischer Test (Grenzfall 3.7):** die vorhandenen Fixtures `bug57031.docx`
   (`<w:highlight w:val="lightGray"/>`) und `bug65649.docx`
   (`w:val="yellow"`/`"green"`/`"cyan"`) importieren → Ergebnis dokumentieren (bleibt
   erhalten oder geht wie belegt vermutet verloren) und Konsequenz festlegen.
6. Hervorgehobener Bereich, der einen `hard_break` (Umschalt+Enter) einschließt →
   Hervorhebung bleibt auf beiden Seiten des Umbruchs erhalten.
7. Cross-Format: ODT mit Hervorhebung importieren → als DOCX exportieren → Farbe bleibt
   erhalten (korrekt als `<w:shd>` aus dem internen Mark erzeugt, unabhängig vom Ursprung).

### 4.2 ODT
1. Im Editor Text markieren, Hervorhebung setzen, als ODT exportieren → `content.xml`
   enthält eine automatische Text-Formatvorlage mit `fo:background-color="…"`
   (`style:family="text"`), referenziert über `text:style-name` am betroffenen `text:span`.
2. Dieselbe Datei erneut importieren → Farbe exakt erhalten.
3. Zwei Textläufe mit **derselben** Hervorhebungsfarbe (sonst keine weiteren Marks) →
   `TextStyleRegistry` (`styleRegistry.ts:30`) dedupliziert auf **eine** gemeinsame
   Stildefinition, nicht zwei redundante.
4. Hervorhebung + Fett kombiniert → **eine** gemeinsame Stildefinition mit beiden
   Eigenschaften (`buildTextStyleXml`, `styleRegistry.ts:46-59`), nicht zwei getrennte
   `text:span`-Ebenen.
5. Hervorhebung entfernt → Export referenziert für diesen Textlauf keinen Stil mit
   `fo:background-color` mehr.
6. Cross-Format: DOCX mit Hervorhebung (als `<w:shd>` erzeugt) importieren → als ODT
   exportieren → Farbe bleibt erhalten.
7. Reale, mit echtem LibreOffice erzeugte ODT-Datei mit „Zeichen hervorheben“ importieren →
   Hervorhebung sichtbar erhalten. Im Repo vorhandene, für den **Normalfall** geeignete
   Fixtures (Inhalt verifiziert, siehe Ist-Stand-Tabelle): `coloredParagraph.odt`,
   `lostBackground.odt`, `character-styles.odt`, `TableFunkyBackground.odt`,
   `coloredTable_MSO15.odt`, `feature_attributes_character_MSO15.odt`,
   `sameLocationSpansUsingMultipleTemplateStyles_BOLD-Outer-ITALIC-Inner-Text-Yellow.odt` —
   **keine davon** ist jedoch ein verifizierter Beleg für Grenzfall 3.13 (Absatzhintergrund)
   oder 3.14 (benannte Zeichenformatvorlage in `office:styles`); für beide Grenzfälle muss
   vor dem Test zunächst eine geeignete Datei gefunden/gebaut und ihr Inhalt per
   `unzip -p … | grep` bestätigt werden (siehe Präambel-Korrektur und Grenzfälle 3.13/3.14).

### 4.3 Doppelte Rundreise / Cross-Format hin und zurück
1. DOCX mit Hervorhebung → Editor → Export als ODT → Import → Export zurück als DOCX →
   Farbe nach zwei Konvertierungen weiterhin an exakt derselben Stelle und mit demselben
   (case-insensitiv verglichenen) Hex-Wert.
2. Dieselbe Prüfung mit Startpunkt ODT.
3. Tritt beim Import einer Fremddatei ein Nicht-Hex-Farbwert auf (Grenzfall 3.9), darf die
   doppelte Rundreise nicht zu stillschweigend unterschiedlichen Farbwerten in DOCX vs. ODT
   führen (Hex-only vs. tolerantere ODF-Darstellung).

---

## 5. Testfälle für die Verifikation (E2E, echte Bedienung im Browser)

**Bereits vorhandene, aber laut Auftrag nicht als vertrauenswürdig geltende Unit-Tests**
(nur direkt konstruierte Testdaten, keine Editor-/Toolbar-Bedienung):
- `src/formats/docx/__tests__/roundtrip.test.ts:100` „preserves text color and highlight color“
- `src/formats/odt/__tests__/roundtrip.test.ts:102` analog für ODT

**Bereits vorhandene E2E-Tests, die dieses Feature echt bedienen** (im früheren Entwurf
fälschlich als nicht existent behauptet — hier zu re-verifizieren, nicht neu zu erfinden):
- `tests/e2e/clipboard.spec.ts:148-168` — setzt Hervorhebung über den echten Farbwähler
  (`pickColor(page, 'Hervorhebungsfarbe', '#00ff00')`, Helper Z. 39-46) kombiniert mit
  Fett + Schriftfarbe und prüft Erhalt über Kopieren/Einfügen. **Diesen `pickColor`-Helper
  für neue Tests wiederverwenden**, statt einen eigenen Weg zur Bedienung des nativen
  `<input type="color">` zu erfinden.
- `tests/e2e/docx.spec.ts:304` / `tests/e2e/odt.spec.ts:280` — Import-Rundreise (Fixture
  `fullCoverageDocument.ts`), prüft `span[style*="background-color"]` „Hervorgehoben“.

**Zu ergänzen** (die eigentliche Lücke — Setzen/Entfernen isoliert, Grenzfälle, echter
Datei-Export/Import per `filechooser`/`download`):

1. Farbwähler `🖍` per `pickColor` auf eine reine Text-Selektion (ohne weitere Marks)
   anwenden → sichtbar `background-color` im DOM des markierten Bereichs.
2. „Entfernen“-Button `⌫` klicken → `background-color` verschwindet aus dem DOM,
   restlicher Text unverändert.
3. Farbwähler **und** „Entfernen“ **ohne** vorherige Selektion bedienen → definiertes
   Verhalten gemäß Grenzfall 3.1 nachweisen (kein Crash; dokumentierte Rückmeldung oder
   bewusster No-Op — inkl. Prüfung, ob der Button `disabled` sein soll).
4. Gemischte Selektion (teils andere Farbe, teils keine) → einheitliches Ergebnis gemäß
   Grenzfall 3.2.
5. Undo direkt nach Farbanwendung → Hervorhebung verschwindet, Text bleibt; Redo stellt sie
   wieder her. Anzahl der tatsächlich entstehenden Undo-Schritte dokumentieren (Grenzfall
   3.11 / Abschnitt 2.8 — der `pickColor`-Helper erzeugt genau einen; echtes Dragging nicht
   abgedeckt).
6. Kombinierter Test Hervorhebung + Fett + Schriftfarbe **+ Unterstrichen** auf demselben
   Textlauf → DOCX-Export → `w:rPr`-Vollständigkeit **und Kindelement-Reihenfolge** über
   unabhängigen Parser + **strikte** OOXML-Schema-Validierung (Grenzfall 3.17).
7. Derselbe kombinierte Test für ODT (eine gemeinsame `T…`-Stildefinition, Grenzfall 4.2.4).
8. Vollständiger Rundreisetest je Format (4.1/4.2) über **echten** Datei-Upload
   (`filechooser`) und echten Download-Abfang (`page.waitForEvent('download')`), nicht nur
   über intern aufgerufene Reader/Writer.
9. **Kritischer Importtest** mit den vorhandenen Fixtures `bug57031.docx`
   (`w:val="lightGray"`) und `bug65649.docx` (`w:val="yellow"`/`"green"`/`"cyan"`), die
   native `<w:highlight>`-Hervorhebung tragen — Ergebnis dokumentieren (Grenzfall 3.7 /
   4.1.5).
10. Importtests mit den realen ODT-Fixtures aus 4.2.7 als **Normalfall**-Nachweis
    (`coloredParagraph.odt`, `lostBackground.odt`, `character-styles.odt` u. a.). Für die
    **Grenzfälle** 3.13 (reiner Absatzhintergrund) und 3.14 (Hervorhebung ausschließlich über
    `office:styles`) zunächst eine tatsächlich passende Datei suchen/bauen und ihren Inhalt
    per `unzip -p … | grep` bestätigen — keine der oben genannten Fixtures erfüllt das
    nachweislich (siehe Präambel-Korrektur).
11. Ungültige/untypische Fremdfarbwerte gemäß Grenzfall 3.9: (a) Einfügen von Fremd-HTML mit
    `background-color: yellow` bzw. `rgba(...)`, (b) **interner** Copy/Paste-Pfad, bei dem
    der Browser `#00ff00` zu `rgb(0, 255, 0)` normalisiert — jeweils anschließenden Export
    auf Gültigkeit prüfen (striktes OOXML-Schema für DOCX; gültige ODF-Farbe für ODT).
12. Cross-Format-Doppel-Rundreise (4.3): einmal DOCX→ODT→DOCX, einmal ODT→DOCX→ODT.
13. Case-Insensitivity/Style-Dedup (Grenzfall 3.16): Fremddatei mit `FFFF00` (groß)
    importieren → Vergleich case-insensitiv; prüfen, dass Groß-/Klein-Varianten keine
    fälschliche „Abweichung“ und keine überflüssige Style-Verdopplung erzeugen.
14. Sichtprüfung/Entscheidung zu Grenzfall 3.8 (bewusster `w:shd`-Kompromiss) und zu
    Abschnitt 2.3 (fehlende Zustandsanzeige) — Ergebnis jeweils hier nachtragen.
15. Rendering-Prüfung der Glyphen `🖍`/`⌫` (Bedienelement 4) auf mind. zwei
    Betriebssystem-/Browser-Kombinationen, davon eine ohne Standard-Emoji-Schrift.
16. **Ungewollte schwarze Hervorhebung (Grenzfall 3.18):** Selektion setzen, Farbwähler
    öffnen und **ohne** Änderung bestätigen → prüfen, ob dadurch `#000000` als Hervorhebung
    gesetzt wird (deckender schwarzer Balken) und ob dieses Verhalten gewollt/dokumentiert
    oder zu beheben ist (Chip-Vorbelegung, 2.3).
17. **Nicht-wohlgeformtes DOCX durch ungeescapten `w:fill` (Grenzfall 3.19):** einen
    `highlight`-Farbwert mit `"`/`&`/`<` erzeugen (per Fremd-HTML-Paste mit präpariertem
    `background-color`), als DOCX exportieren → `word/document.xml` mit einem **strikten
    XML-Parser** auf Wohlgeformtheit prüfen (nicht nur auf Schema-Gültigkeit wie in
    Testfall 11). Erwartung dokumentieren bzw. Escaping/Normalisierung nachrüsten.
18. **ODT-Import über `style:text-background-color` (Grenzfall 3.20):** LibreOffice-Datei
    importieren, deren Zeichen-Hervorhebung über das alternative Attribut serialisiert ist
    (vorher per Entpacken von `content.xml` bestätigen) → prüfen, ob die Hervorhebung im
    Editor-DOM erscheint; Verlust dokumentieren oder Reader erweitern.
19. **Tastatur-Bedienbarkeit des „Entfernen“-Buttons (Grenzfall 3.21):** Selektion setzen,
    Hervorhebung per Farbwähler anwenden, dann per `page.keyboard.press('Tab')` (wiederholt,
    bis der „Entfernen"-Button fokussiert ist) und `page.keyboard.press('Enter')` bzw. separat
    `Space` bedienen → prüfen, ob die Hervorhebung tatsächlich entfernt wird. Falls nicht (wie
    vermutet): Defekt bestätigen und beheben (`onClick` statt/zusätzlich zu `onMouseDown`)
    oder als bewusste Einschränkung dokumentieren — dann aber mit einer alternativen
    Tastatur-Bedienmöglichkeit (z. B. Shortcut) abwägen, da sonst keine tastaturgestützte
    Möglichkeit existiert, eine Hervorhebung zu entfernen.
20. **Accessible Name des „Entfernen“-Buttons (Grenzfall 3.22):** Über die
    Accessibility-Baumansicht der Browser-Devtools (oder einen echten Screenreader) den
    berechneten Namen des Buttons auslesen → prüfen, ob „Hervorhebung entfernen" (aus
    `title`) oder das rohe Glyph „⌫" (aus dem Textinhalt) vorgelesen wird. Bei bestätigtem
    Befund: `aria-label="Hervorhebung entfernen"` ergänzen (analog zum Farbwähler-`<input>`,
    das bereits ein korrektes `aria-label` trägt).

---

## 6. Abnahmekriterien (Definition of Done)

Der Status „vorhanden“ für „Texthervorhebungsfarbe“ darf erst dann wieder als
vertrauenswürdig gelten, wenn:

1. Alle Testfälle aus Abschnitt 5 als automatisierte Tests vorhanden **und grün** sind
   (echte Browser-Interaktion, nicht nur Unit-/Command-Ebene) — inklusive der bereits
   vorhandenen Tests (clipboard/docx/odt), erneut ausgeführt und als hierfür ausreichend
   bzw. ergänzungsbedürftig bewertet.
2. Alle Rundreise-Anforderungen aus Abschnitt 4 (DOCX, ODT, Cross-Format) durch einen
   **unabhängigen** Parser bzw. durch erneuten Import bestätigt sind (nicht nur über den
   eigenen Reader, damit sich Lese-/Schreibfehler nicht gegenseitig verdecken).
3. Alle Grenzfälle aus Abschnitt 3 einzeln geprüft und ihr tatsächliches Verhalten
   dokumentiert ist — insbesondere der **kritische Verdacht aus Grenzfall 3.7**
   (unsichtbarer Verlust nativer Word-`<w:highlight>`-Hervorhebung beim Import), der vor
   Abnahme zwingend bestätigt oder widerlegt werden muss.
4. Der Kompromiss `w:shd` statt `w:highlight` (Grenzfall 3.8) explizit als
   Design-Entscheidung dokumentiert ist, inkl. Konsequenz für die Interoperabilität mit
   echtem Word.
5. Die fehlende Zustandsanzeige (Abschnitt 2.3, Bedienelemente 1 und 5) entweder behoben
   oder als bewusst nicht vorhandenes Verhalten dokumentiert ist.
6. Die fehlende Rückmeldung bei leerer Selektion (Grenzfall 3.1, Abschnitt 2.2) entweder
   behoben oder als bewusst gewolltes Verhalten dokumentiert ist.
7. Der Umgang mit ungültigen/untypischen Farbwerten (Grenzfall 3.9) geklärt ist —
   insbesondere ob über den **internen** Copy/Paste-Pfad (`rgb()`-Normalisierung) oder über
   Fremd-HTML **ungültiges** OOXML (`w:fill`) entstehen kann, und ob eine Validierung/
   Normalisierung nötig ist.
8. Die OOXML-Kindelement-Reihenfolge bei kombinierten Marks (Grenzfall 3.17) gegen ein
   **striktes** Schema geprüft und das Ergebnis dokumentiert ist (Reihenfolge korrekt oder
   Fix erforderlich).
9. Der ODT-Import über benannte Zeichenformatvorlagen (`office:styles`, Grenzfall 3.14) mit
   echter Fremddatei geprüft und das Fallback-Verhalten dokumentiert ist. **Hinweis:** Die im
   Repo vorhandenen Kandidaten `lostBackground.odt`/`character-styles.odt` wurden entpackt
   und belegen diesen Fall **nicht** (ihr `fo:background-color` steht in
   `content.xml`s eigenem `office:automatic-styles`, nicht in `office:styles`) — vor Abnahme
   muss eine tatsächlich passende Datei gefunden oder gebaut werden.
10. Die Abgrenzung ODT-Absatzhintergrund vs. Zeichen-Hervorhebung (Grenzfall 3.13) ist mit
    echter Fremddatei geprüft und das Fallback-Verhalten dokumentiert ist. **Hinweis:** Der
    im Repo vorhandene Kandidat `coloredParagraph.odt` wurde entpackt und belegt diesen Fall
    **nicht** (er enthält trotz seines Namens nur ein gewöhnlich hervorgehobenes
    Einzelzeichen über `style:family="text"`, keinen Absatzhintergrund) — vor Abnahme muss
    eine tatsächlich passende Datei gefunden oder gebaut werden.
11. Das Icon-Rendering-Risiko der Emoji `🖍`/`⌫` (Bedienelement 4) bewertet ist (bewusst
    beibehalten oder auf SVG umgestellt).
12. Der ungebundene Farbchip / die **ungewollte schwarze Hervorhebung** (Grenzfall 3.18,
    Bedienelemente 1 und 5) ist geprüft und entweder behoben (Chip-Vorbelegung) oder als
    bewusstes Verhalten dokumentiert.
13. Die fehlende **XML-Escapung von `w:fill`** (Grenzfall 3.19) ist geprüft — insbesondere,
    ob über eingefügte Fremdfarbwerte **nicht wohlgeformtes** DOCX entstehen kann — und das
    Ergebnis dokumentiert bzw. `escapeXml`/Normalisierung nachgerüstet ist.
14. Der ODT-Import über das **alternative Hervorhebungs-Attribut**
    `style:text-background-color` (Grenzfall 3.20) ist mit echter Fremddatei geprüft und das
    Fallback-Verhalten dokumentiert.
15. Die **Tastatur-Bedienbarkeit des „Entfernen“-Buttons** (Grenzfall 3.21) ist mit echter
    Tab+Enter/Leertaste-Bedienung im Browser geprüft und das Ergebnis dokumentiert —
    entweder behoben (`onClick` ergänzt) oder als bewusste Einschränkung festgehalten,
    inklusive Abwägung, dass sonst keine tastaturgestützte Möglichkeit existiert, eine
    gesetzte Hervorhebung zu entfernen (keine Tastenkombination als Alternative vorhanden).
16. Der **Accessible Name des „Entfernen“-Buttons** (Grenzfall 3.22) ist mit der
    Accessibility-Baumansicht oder einem echten Screenreader geprüft und das Ergebnis
    dokumentiert — entweder durch Ergänzen von `aria-label="Hervorhebung entfernen"`
    behoben oder als bewusst ausreichend begründet.

Erst nach Erfüllung aller sechzehn Punkte darf der Backlog-Status von „vorhanden (nicht
vertrauenswürdig)“ auf „verifiziert“ geändert werden.
