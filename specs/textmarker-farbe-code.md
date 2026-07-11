# Umsetzungsplan: Feature „Texthervorhebungsfarbe" — Code-Abgleich und geplante Änderungen

Rolle: Entwickler-Antwort auf `specs/textmarker-farbe-req.md`. Dieses Dokument prüft
den **tatsächlichen** Code-Stand gegen jede Behauptung/Anforderung der Spezifikation
und legt fest, welche Dateien wie geändert bzw. neu angelegt werden. Stil orientiert
an `FEATURE-SPEC-DOCX-ODT.md` bzw. `specs/fett-code.md`. Kein Punkt hier ist bereits
umgesetzt — dies ist der Plan, nicht der Vollzug.

> **Revisionshinweis (dieser Durchlauf).** Eine frühere Fassung dieses Codeplans war
> gegen einen **älteren** Code-Stand geschrieben und dadurch in mehreren
> lasttragenden Punkten stillschweigend falsch geworden. Sie wurde vollständig gegen
> den aktuellen Code neu gegengelesen. Konkret korrigiert/ergänzt gegenüber der
> Vorfassung:
> 1. **Alle Zeilennummern** waren veraltet — die Vorfassung nannte in ihrer
>    Ist-Stand-„Verifikation" ausgerechnet genau die falschen Zeilen (`schema.ts:141-147`,
>    `Toolbar.tsx:162-170`, `commands.ts:88-106`, …), die `textmarker-farbe-req.md` in
>    seinem eigenen Vorwort ausdrücklich als Fehler der **dortigen** Vorversion benennt
>    und auf die tatsächlichen Werte (`189-195`, `211-230`, `104-122`) korrigiert hat.
>    Alle Referenzen unten sind neu am Ist-Stand geprüft.
> 2. Die Vorfassung behauptete, **kein E2E-Test** erwähne die Hervorhebung — das ist
>    (wie schon `textmarker-farbe-req.md` klarstellt) **falsch**: `clipboard.spec.ts:39/148-156`,
>    `docx.spec.ts:304`, `odt.spec.ts:280` tun es. Direkt per `grep` am Repo bestätigt.
> 3. Neu aufgenommen: **Grenzfall 3.17** (OOXML-`<w:rPr>`-Kindelement-Reihenfolge, DoD 8)
>    und **Grenzfall 3.14** (ODT `office:styles`/benannte Zeichenformatvorlagen, DoD 9) —
>    beide fehlten in der Vorfassung komplett, obwohl die Anforderung sie als
>    Abnahmekriterien führt.
> 4. Zwei **konkrete Fehler im vorgeschlagenen Code** der Vorfassung behoben: eine
>    kaputte Hex-Regex-Prüfung im DOCX-Reader (`HEX_COLOR_RE.test(fill)` gegen einen
>    Wert **ohne** `#`) und ein „verlorener Change-Listener" im Toolbar-Umbau
>    (`key`-Remount + `useEffect`-Deps kollidieren).
> 5. Die Design-Entscheidung „Export **wirft** bei ungültiger Farbe" wurde zu
>    **anmutigem Weglassen** (graceful degradation) revidiert — ein harter Throw lässt
>    den **gesamten** Export scheitern und verletzt damit „ein Export darf nie sichtbaren
>    Inhalt verlieren" schlimmer als der Einzelfehler.
>
> **Zweite Re-Verifikation (dieser Durchlauf, gegen den aktuellen Code *und* die
> aktuelle Anforderung).** Alle Fundstellen erneut einzeln am Ist-Stand gegengelesen.
> Ergebnis: die Ist-Stand-Tabelle (Abschnitt 1) ist bis auf **eine** Ausnahme korrekt —
> die **Keymap-Zeilen** waren noch auf dem alten, von `textmarker-farbe-req.md` bereits
> verworfenen Stand (`WordEditor.tsx:77-99`, `Mod-b/i/u 90-92`, `Shift-Delete 98`);
> tatsächlich liegt der `keymap({…})`-Block bei **85-107**, `Mod-b/i/u` bei **98-100**,
> `Shift-Delete` bei **106** (in Abschnitt 1 und 4.5 korrigiert). Zusätzlich wurde die
> in Abschnitt 4.1 nur behauptete jsdom-Tauglichkeit von `normalizeCssColor` **erneut
> empirisch** gegen die repo-eigene jsdom-Installation ausgeführt und bestätigt
> (`yellow → #ffff00`, `rebeccapurple → #663399`, `#0f0 → #00ff00`,
> `rgba(255,0,0,0.5) → #ff0000`, `hsl(120,100%,50%) → #00ff00`, `transparent → null`,
> `not-a-color → null`). **Wesentliche inhaltliche Ergänzung:** Der Codeplan war gegen
> eine **ältere** Fassung von `textmarker-farbe-req.md` geschrieben und deckte deren
> **später nachgetragene** Grenzfälle **3.18** (ungewollte schwarze Hervorhebung durch den
> ungebundenen Chip), **3.19** (fehlendes XML-Escaping von `w:fill` → *nicht wohlgeformtes*
> DOCX) und **3.20** (alternatives ODT-Attribut `style:text-background-color`) sowie die
> zugehörigen Abnahmekriterien **DoD 11–13** nicht ausdrücklich ab. 3.19 war inhaltlich
> bereits über §2.1/§4.8b gelöst; 3.18 war **nur teilweise** gelöst (§4.4 belegte den Chip
> weiterhin mit `#000000`, siehe **neuer §3.6**); 3.20 fehlte **vollständig** (jetzt in §4.9c
> und §6.7 nachgetragen). Abschnitt 7 mappt jetzt **alle 13** DoD-Punkte statt nur 10.
>
> **Dritte Re-Verifikation (dieser Durchlauf, mit Laufzeit-Beleg statt nur Codelektüre).**
> Sämtliche Zeilen-/Fundstellen-Angaben aus Abschnitt 1 wurden erneut einzeln am Ist-Stand
> gegengelesen (`schema.ts:182-195`, `Toolbar.tsx:28-31,55-89,185-230`, `commands.ts:104-122`,
> `WordEditor.tsx:85-107`, `docx/reader.ts:100-115`, `docx/writer.ts:1-67`,
> `odt/reader.ts:37-78,97-172,357-374`, `odt/writer.ts:32-43`, `odt/styleRegistry.ts:1-58`)
> — **keine Abweichung gefunden**, alle Zeilen stimmen exakt. Zusätzlich wurden die externen
> Fixtures direkt entpackt und geprüft (nicht nur die Behauptung übernommen):
> `bug57031.docx` enthält tatsächlich **8×** `<w:highlight w:val="lightGray"/>` **und**
> zusätzlich `<w:shd w:fill="FAFBFE"/>`/`"FFFFFF"` (bestätigt den Vorrang-Caveat in §4.7
> exakt); `bug65649.docx` enthält `<w:highlight w:val="yellow"/>`/`"green"`/`"cyan"`;
> `coloredParagraph.odt` enthält exakt `<text:span text:style-name="a9905fb">a</text:span>bc`
> mit `style:family="text"` (kein Absatzhintergrund, wie behauptet); `lostBackground.odt`
> enthält exakt 12 Textstile mit `fo:background-color`, von denen nur **4** tatsächlich per
> `text:style-name` referenziert werden (die übrigen 8 sind verwaist) — und den behaupteten
> `style:family="paragraph"`-Stil `a710e24` mit eigenem `style:text-properties
> fo:background-color="#ffff00"`, referenziert von einem **leeren** `<text:p
> text:style-name="a710e24"/>` (keine sichtbare Auswirkung, exakt wie in §2.3 beschrieben).
> Auch die empirische jsdom-Behauptung zu `normalizeCssColor` (§4.1) wurde nicht nur erneut
> zitiert, sondern **tatsächlich gegen die im Repo gepinnte `jsdom@29.1.1` ausgeführt**
> (eigenständiges Skript, `getComputedStyle` über ein reales `JSDOM`-Fenster) — alle
> zitierten Ergebnisse bestätigt. **Dabei neu gefunden (bislang in keiner Fassung dieses
> Plans oder der Anforderung enthalten):** ein **fünfter** Fehler — CSS-Wide-Keywords
> (`inherit`/`initial`/`unset`/`currentColor`/`revert`) durchlaufen `normalizeCssColor`
> unbehandelt und lösen bei **beiden** Nutzungsarten des `color`-Wertes (Trick der Funktion:
> sie missbraucht `color` als generischen `<color>`-Parser) im Test **`#000000`** aus, statt
> wie `transparent`/`not-a-color` als `null` erkannt zu werden — siehe **neuer Abschnitt 2.7**.
> Das ist derselbe Fehlerklasse wie Grenzfall 3.18 (unbemerktes Schwarz), nur über den
> **Einfüge-Pfad** statt über den Farbchip, und wurde bislang von keinem der drei
> vorherigen Durchläufe entdeckt, weil keiner die Funktion tatsächlich ausgeführt hat.
> **Zweiter, strukturell schwerwiegenderer Fund dieses Durchlaufs:** Abschnitt 7 (Zuordnung
> zu den Abnahmekriterien) hatte in **jeder** Vorfassung nur **13** Zeilen, obwohl
> `textmarker-farbe-req.md` Abschnitt 6 wörtlich **vierzehn** Punkte verlangt. Der fehlende
> Punkt ist **DoD 10** (Grenzfall 3.13, ODT-Absatzhintergrund vs. Zeichen-Hervorhebung) — er
> kam in keiner Fassung dieses Plans als eigene Bewertung vor, und alle nachfolgenden
> DoD-Nummern im gesamten Dokument (Icon-Risiko, schwarze Hervorhebung, XML-Escaping,
> `style:text-background-color`) waren dadurch durchgehend um eins verschoben — jede frühere
> Fassung nannte also an mehreren Stellen eine **falsche** DoD-Nummer, obwohl der Titel
> „Abschnitt 7 mappt jetzt alle 13 DoD-Punkte" Vollständigkeit suggerierte. Neu behandelt und
> durchgehend korrigiert in **Abschnitt 3.8**; Tabelle in Abschnitt 7 jetzt **vollständig 14
> Zeilen** mit korrekter Nummerierung.

---

## 0. Kurzfassung

Die in `textmarker-farbe-req.md` referenzierte Ist-Stand-Tabelle ist **zeilengenau
korrekt** (Abschnitt 1 — jede der dort genannten Fundstellen am Ist-Stand nachgeprüft,
keine Abweichung). Der „kritische Verdacht" aus Grenzfall 3.7 (natives `<w:highlight>`
geht beim Import verloren) ist **bestätigt und mit realen Repo-Fixtures belegt**:

- `tests/fixtures/external/docx/bug57031.docx` enthält `<w:highlight w:val="lightGray"/>`
  (direkt per JSZip aus `word/document.xml` verifiziert).
- `tests/fixtures/external/docx/bug65649.docx` enthält `<w:highlight>` mit `yellow`,
  `green`, `cyan` (ebenfalls verifiziert).

Der aktuelle Reader (`docx/reader.ts:100-115`) wertet ausschließlich `<w:shd w:fill>`
aus; `w:highlight` kommt im gesamten `src/formats/docx` nicht vor → diese Hervorhebungen
gehen heute still verloren. Grenzfall 3.7 ist damit nicht theoretisch, sondern **mit
vorhandenen Testdaten sofort reproduzierbar**.

Die Codeprüfung deckt **fünf in der Anforderung nicht benannte, eigenständige Punkte** auf:

1. **DOCX-Export fehlt XML-Escaping für Farbwerte** (`docx/writer.ts:27,29`) — Verschärfung
   von Grenzfall 3.9: ein Farbwert mit `"`, `<` oder `&` erzeugt **strukturell kaputtes,
   nicht parsebares XML**, nicht bloß ein schema-ungültiges Attribut. `odt/styleRegistry.ts:56-57`
   escaped bereits korrekt — die Asymmetrie bestätigt das Versehen. (Abschnitt 2.1.)
2. **Reacts `onChange` am `<input type="color">` ist an das native `input`-Ereignis
   gebunden, nicht an `change`** (`Toolbar.tsx:197,217`) — belegt die in Anforderung 2.8 /
   Grenzfall 11 vermutete Mehrfach-Undo-Kette technisch präzise. (Abschnitt 2.2.)
3. **ODT-Reader liest `style:text-properties` einer `paragraph`-Familie-Stildefinition
   nie** (`odt/reader.ts:63-67`) — direkter, nicht span-verpackter Absatztext verliert
   seine am Absatzstil hinterlegte Zeichenformatierung inkl. `fo:background-color`.
   Empirisch an `lostBackground.odt` verifiziert (Abschnitt 2.3).
4. **OOXML-`<w:rPr>`-Kindelement-Reihenfolge ist schema-ungültig** (`docx/writer.ts:23-30`
   gibt `b, i, u, strike, color, shd` aus, `CT_RPr` verlangt `b, i, strike, color, u, shd`,
   und `highlight` — falls per Abschnitt 4.8 optional geschrieben — muss zwischen `color`
   und `u`) — das ist Grenzfall 3.17 / DoD-Punkt 8, den die Vorfassung überging.
   (Abschnitt 2.5.)
5. **Der in Abschnitt 4.1 vorgeschlagene `normalizeCssColor` liefert bei CSS-Wide-Keywords
   eine willkürliche Farbe statt `null`** — **empirisch gegen die im Repo gepinnte
   `jsdom@29.1.1` verifiziert**: `inherit`/`initial`/`unset`/`currentColor` ergeben
   `#000000`, weil die Funktion `color` (nicht `background-color`) als generischen
   `<color>`-Parser missbraucht und diese Schlüsselwörter kontextabhängig auflösen, nicht
   als literale Farbe. Genau die Fehlerklasse aus Grenzfall 3.18 (unbemerktes Schwarz),
   nur über den **Einfüge-Pfad** statt über den Farbchip erreichbar. (Abschnitt 2.7 — neu,
   von keiner vorherigen Fassung entdeckt.)

Zusätzlich eine **latente, aktuell nicht auslösbare** Robustheitslücke (Reihenfolge-
Abhängigkeit der Dedup-/Merge-Schlüssel via `JSON.stringify`, Abschnitt 2.4) und eine
**architektonische, mangels Fixture nicht reproduzierbare** Lücke (ODT `office:styles`
werden nie gelesen, Grenzfall 3.14 / DoD 9, Abschnitt 2.6).

**Verifizierte Positivbefunde** (von mir direkt geprüft, nicht nur übernommen):
- Die vorgeschlagene DOM-gestützte `normalizeCssColor` (Abschnitt 4.1) funktioniert
  **auch im Testumfeld jsdom** (das Repo nutzt `environment: 'jsdom'`, `vite.config.ts:24`):
  **in diesem Durchlauf tatsächlich ausgeführt** (eigenständiges Node-Skript gegen ein
  reales `JSDOM`-Fenster der im Repo gepinnten Version `jsdom@29.1.1`, nicht nur behauptet)
  ergibt `yellow → #ffff00`, `rebeccapurple → #663399`, `#0f0 → #00ff00`,
  `rgb(0, 255, 0) → #00ff00` (Browser-Normalisierungsform aus Grenzfall 3.9),
  `rgba(255,0,0,0.5) → #ff0000`, `hsl(120,100%,50%) → #00ff00`, `rgba(0,0,0,0) → null`,
  `transparent → null`, `not-a-color → null`. Die in der Vorfassung nur behauptete
  jsdom-Tauglichkeit ist damit belegt — **mit einer Einschränkung**: `inherit`/`initial`/
  `unset`/`currentColor` liefern **nicht** `null`, sondern `#000000` (bzw. `revert → null`,
  `var(--x) → null`, `color-mix(...) → null` — diese drei sind unkritisch, siehe Abschnitt
  2.7). Das ist ein echter, in dieser Fassung neu entdeckter Fehler in Abschnitt 4.1, nicht
  bloß eine Fußnote — siehe Abschnitt 2.7 für Befund und Fix.
- Die ProseMirror-Mark-Kanonisierung (Grundlage von Abschnitt 2.4) hält: Marks liegen
  immer in Schema-Rang-Reihenfolge vor.

---

## 1. Verifikation der Ist-Stand-Tabelle aus `textmarker-farbe-req.md`

Alle Fundstellen am **aktuellen** Code nachgeprüft. Anders als die frühere Fassung
dieses Plans nenne ich hier die **tatsächlichen** Zeilen — sie stimmen mit den in
`textmarker-farbe-req.md` genannten überein.

| Fundstelle (Anforderung, korrekt) | Ergebnis der Prüfung am Ist-Stand |
|---|---|
| `schema.ts:189-195` Mark `highlight` | **Bestätigt.** `attrs: { color: { validate: 'string' } }` (190), `parseDOM: [{ style: 'background-color', getAttrs: (value) => ({ color: value }) }]` (191), `toDOM` rendert `background-color: …` (192-194). Kein `excludes`. `textColor` als Schwester 182-188. |
| `Toolbar.tsx:211-219` Farbwähler `🖍` | **Bestätigt.** `<label title="Hervorhebungsfarbe">` (211), `<span aria-hidden>🖍` (212), `<input aria-label="Hervorhebungsfarbe" type="color" onChange=…applyMarkColor('highlight', …)>` (213-218). **Kein** `value`-Binding. |
| `Toolbar.tsx:220-230` „Entfernen"-Button `⌫` | **Bestätigt.** `title="Hervorhebung entfernen"` (222), Glyph `⌫` (229), `onMouseDown → clearMarkColor('highlight')` (223-225). **Nicht** `disabled`, **kein** `aria-pressed`. |
| `Toolbar.tsx:28-31` `run(view, command)` | **Bestätigt.** Ruft nach dem Befehl `view.focus()` (30). |
| `Toolbar.tsx:55-89` `MarkButton` mit `aria-pressed` | **Bestätigt.** `active` via `markType.isInSet(...$from.marks())` (69), `aria-pressed` (75) — dieses Muster fehlt für Hervorhebung. |
| `commands.ts:104` `ColorMarkName` | **Bestätigt.** `export type ColorMarkName = 'textColor' \| 'highlight'`. |
| `commands.ts:106-113` `applyMarkColor` | **Bestätigt.** `if (empty) return false` (109), sonst `tr.addMark(from, to, marks[markName].create({ color }))` (110). Kein stored-mark-Pfad. |
| `commands.ts:115-122` `clearMarkColor` | **Bestätigt.** `if (empty) return false` (117), sonst `tr.removeMark(from, to, marks[markName])` (119). |
| `WordEditor.tsx:85-107` Keymap ohne Farb-Shortcut | **Bestätigt (Zeilen korrigiert).** `keymap({…})`-Block **85-107**; `Mod-z/y/Shift-z` (93-95), `Enter`/`Shift-Enter` (96-97), `Mod-b/i/u` (**98-100**), `Shift-Delete` (**106**) — keine Farb-Bindung. (Die früheren Angaben `77-99`/`90-92`/`98` waren der von `textmarker-farbe-req.md` bereits verworfene Altstand.) |
| `docx/reader.ts:100-115` `marksFromRunProperties` | **Bestätigt.** `<w:shd>`/`w:fill` gelesen (111-113: `if (fill && fill !== 'auto') → highlight #${fill}`). `w:highlight` **nirgends** in `src/formats/docx` (per Volltextsuche bestätigt). |
| `docx/writer.ts:20-33` `runPropertiesXml` | **Bestätigt.** `highlight → <w:shd w:val="clear" w:color="auto" w:fill="…"/>` (28-30), Farbe nur `String(color).replace('#','')`, **kein** Escaping/Validierung. `<w:highlight>` nie erzeugt. Kindreihenfolge `b(23) i(24) u(25) strike(26) color(27) shd(28-30)` — siehe Abschnitt 2.5. |
| `docx/writer.ts:41-67` `inlineToRuns` | **Bestätigt.** Merge benachbarter Textknoten mit identischer Mark-Liste via `JSON.stringify`-Vergleich (54). |
| `odt/reader.ts:37-78` `parseAutomaticStyles` | **Bestätigt.** `family==='text'`-Zweig liest `fo:background-color` (60-61 → `style.highlight`); `family==='paragraph'`-Zweig (63-67) liest **nur** `fo:text-align` (65) — siehe Abschnitt 2.3. |
| `odt/reader.ts:100-112,170` `decodeInline`/`marksFor` | **Bestätigt.** `marksFor` erzeugt `highlight` aus `style.highlight` (110); `walk` startet mit **leerer** Markliste (`walk(child, [])`, 170) — keine Absatzstil-Basis-Marks. |
| `odt/reader.ts:363-364,373-374` `readOdt` | **Bestätigt.** Nur `office:automatic-styles` aus `content.xml` (363) **und** `styles.xml` (373) werden geparst; `office:styles` **nirgends** — siehe Abschnitt 2.6 / Grenzfall 3.14. |
| `odt/writer.ts:32-43` `runPropsFromMarks` | **Bestätigt.** `highlight → props.highlight = mark.attrs?.color` (40). |
| `odt/styleRegistry.ts:9,13,30,35,57` | **Bestätigt.** `RunProps.highlight` (9), `isEmpty` (13), Dedup-Key `JSON.stringify(props)` (30), Namen `T${counter}` (34-35), Ausgabe `fo:background-color="${escapeXml(props.highlight)}"` (57 — escaped korrekt). |
| **E2E-Tests vorhanden** | **Bestätigt (entgegen der Vorfassung dieses Plans).** `tests/e2e/clipboard.spec.ts:39` (`pickColor`-Helper), `:148-156` (`pickColor(page, 'Hervorhebungsfarbe', '#00ff00')` kombiniert mit Fett + Textfarbe), `tests/e2e/docx.spec.ts:304` und `tests/e2e/odt.spec.ts:280` (Import-Rundreise, `span[style*="background-color"]` „Hervorgehoben", Count 1), Fixture `tests/e2e/fixtures/fullCoverageDocument.ts`. |
| `roundtrip.test.ts` Unit-Tests | **Bestätigt.** `src/formats/docx/__tests__/roundtrip.test.ts` und `.../odt/__tests__/roundtrip.test.ts` enthalten je einen „text color and highlight color"-Fall mit **direkt konstruiertem** JSON (keine Editor-/Toolbar-Bedienung). |
| Externe Fixtures | **Bestätigt.** Alle in der Anforderung genannten ODT-Fixtures existieren (`lostBackground.odt`, `character-styles.odt`, `coloredParagraph.odt`, `TableFunkyBackground.odt`, `coloredTable_MSO15.odt`, `feature_attributes_character_MSO15.odt`, `text-color-from-paragraph.odt`, `sameLocationSpansUsingMultipleTemplateStyles_…odt`); 127 DOCX-Fixtures vorhanden. |

**Fazit Abschnitt 1:** Keine Korrektur der Anforderungs-Ist-Stand-Tabelle nötig — sie ist
belastbar. (Die frühere Fassung *dieses* Plans war es nicht; siehe Revisionshinweis.)

---

## 2. Neu gefundene Fehler und Lücken (nicht bereits in der Anforderung benannt)

### 2.1 Fehler 1 (kritisch): Fehlendes XML-Escaping für Farbwerte im DOCX-Export

**Datei/Zeilen:** `src/formats/docx/writer.ts:27` (`textColor`) und `:28-30` (`highlight`),
Funktion `runPropertiesXml` (20-33):

```ts
if (mark.type === 'textColor') props.push(`<w:color w:val="${String(mark.attrs?.color ?? '').replace('#', '')}"/>`)
if (mark.type === 'highlight') {
  props.push(`<w:shd w:val="clear" w:color="auto" w:fill="${String(mark.attrs?.color ?? '').replace('#', '')}"/>`)
}
```

Der Farbwert wird **ungeprüft und unescaped** in ein XML-Attribut interpoliert. `escapeXml`
ist in derselben Datei importiert und für Lauftext (`encodeRunText`, 35-39), `alt`-Texte
und `dc:title` bereits korrekt benutzt — hier fehlt es. Zum Vergleich escaped
`odt/styleRegistry.ts:56-57` bereits (`escapeXml(props.color)`/`escapeXml(props.highlight)`),
was die Asymmetrie als Versehen bestätigt.

**Risiko:** `schema.ts:190` (`highlight`) und `:183` (`textColor`) übernehmen jeden String
unvalidiert (`validate: 'string'`). Ein per Fremd-HTML eingefügter `background-color`-Wert
mit `"`, `<` oder `&` zerstört das erzeugte `word/document.xml` **strukturell** (nicht nur
ein ungültiges Attribut, sondern nicht mehr parsebares XML → komplett unbrauchbare Datei).
Verschärfung von Grenzfall 3.9. **Fix:** Abschnitt 4.8 (Escaping **plus** Hex-Prüfung —
Verteidigung in der Tiefe, unabhängig von der schema-seitigen Normalisierung aus 4.2).

### 2.2 Fehler 2 (hoch): `<input type="color">`-Event-Granularität — Reacts `onChange` bindet an `input`, nicht `change`

**Datei/Zeilen:** `Toolbar.tsx:197` (`textColor`) und `:217` (`highlight`):
`onChange={(e) => run(view, applyMarkColor(…, e.target.value))}`.

React normalisiert `onChange` auf `<input>` historisch auf das native `input`-Ereignis
(nicht `change`). Für `<input type="color">` heißt das in Chromium: das Element feuert
**während** der Interaktion mit dem eingebetteten Farbrad kontinuierlich `input`
(ein Ereignis pro Zwischenwert). Jedes läuft hier direkt in `run(view, applyMarkColor(…))`
→ **eine ProseMirror-Transaktion pro Zwischenwert**, also eine Kette von Undo-Schritten für
eine als **eine** Aktion wahrgenommene Farbwahl. Das bestätigt Grenzfall 11 präzise und
liefert die Ursache (Reacts `input`-basiertes `onChange`, kein Browser-Bug).

**Fix:** Auf das native `change`-Ereignis umstellen (Abschnitt 4.4) — **aber** ohne den in
der Vorfassung eingebauten Fallstrick: ein `key`-basiertes Remounten des `<input>` (zur
Swatch-Synchronisation) **zusammen mit** einem `useEffect([view, mark])`, der den
`change`-Listener anhängt, würde den Listener nach dem ersten Selektionswechsel verlieren
(das neu gemountete Input-DOM-Element bekommt keinen Listener, weil die Effekt-Deps
unverändert sind). Deshalb: Listener **einmal** anhängen, den DOM-Wert **imperativ** per
separatem Effekt synchronisieren, **kein** `key`-Remount (siehe 4.4).

### 2.3 Lücke A (bestätigt, architektonisch): ODT-Reader ignoriert `style:text-properties` eines `paragraph`-Familie-Stils

**Datei/Zeilen:** `src/formats/odt/reader.ts:63-67`, `family === 'paragraph'`-Zweig:

```ts
} else if (family === 'paragraph') {
  const props = firstChildNS(styleEl, ODF_NAMESPACES.style, 'paragraph-properties')
  const align = props?.getAttributeNS(ODF_NAMESPACES.fo, 'text-align')
  if (align) paragraphAligns.set(name, align)
}
```

Nach ODF kann ein `style:family="paragraph"`-Stil **zusätzlich** ein Geschwister-Element
`style:text-properties` tragen, das die Zeichenformatierung für **direkten, nicht in
`<text:span>` gewickelten** Absatztext definiert (inkl. `fo:background-color`). Dieser Zweig
liest nur `paragraph-properties`/`text-align`; `decodeInline` (97-172) startet für
unverpackten Text mit **leerer** Markliste (`walk(child, [])`, 170) und leitet keine
Basis-Marks aus dem Absatzstil ab. Ergebnis: solche Hervorhebung geht still verloren.

**Empirischer Beleg (direkt aus `lostBackground.odt` verifiziert):** Genau ein solcher Stil
existiert — `a710e24`, family `paragraph`, mit `style:text-properties fo:background-color="#ffff00"`
(+ fett/kursiv/unterstrichen). Er liegt jedoch auf einem **leeren** Absatz
(`<text:p text:style-name="a710e24"/>`), sichtbar geht also für **diese** Datei nichts
verloren. Die 4 tatsächlich referenzierten, span-gebundenen Hervorhebungen der Datei werden
korrekt gelesen (verifiziert: Texte „Dienstag" `#FFFF00`, „Rot Und BOLD" `#FF0000`, „Text"
`#FFC000`, „pfff" `#FFC000`; daneben **8** im Katalog definierte, aber **nirgends**
referenzierte `background-color`-Textstile — verwaiste LibreOffice-Editier-Artefakte, keine
Verlustquelle). Der Name „lostBackground.odt" ist für **dieses** Feature also irreführend.

**Konsequenz:** Die architektonische Lücke ist real und unabhängig bestätigt, aber von
**keiner** der vorhandenen ODT-Fixtures mit **sichtbarem** Text ausgelöst. Fix in
Abschnitt 4.9; Regressionstest über eine neu anzulegende synthetische Datei (Abschnitt 6.4).

### 2.4 Lücke B (latent, aktuell nicht auslösbar): Reihenfolge-Abhängigkeit der Dedup-/Merge-Schlüssel

**Dateien/Zeilen:** `odt/styleRegistry.ts:30` (`const key = JSON.stringify(props)`),
`docx/writer.ts:54` (`JSON.stringify(buffer.marks) === JSON.stringify(node.marks)`).

`runPropsFromMarks` (`odt/writer.ts:32-43`) baut `RunProps` in **Array-Reihenfolge** der
Marks auf; `JSON.stringify` serialisiert Objektschlüssel in Einfügereihenfolge. Zwei
inhaltlich gleiche Mark-Kombinationen mit unterschiedlicher Array-Reihenfolge
(`[highlight, textColor]` vs. `[textColor, highlight]`) ergäben verschiedene Schlüssel →
zwei redundante `T…`-Stildefinitionen (verletzt Anforderung 4.2.3) bzw. eine unnötige
`<w:r>`-Aufspaltung im DOCX.

**Verifiziert, dass das heute nirgends auftritt:** ProseMirror kanonisiert Mark-Sets immer
nach Schema-Rang (`schema.ts`-Reihenfolge `strong, em, underline, strike, textColor,
highlight`), sowohl bei `tr.addMark` als auch bei `nodeFromJSON` (`WordEditor.tsx:71`). Beide
Reader fügen Marks bereits in exakt dieser Reihenfolge ein (`docx/reader.ts:103-113`,
`odt/reader.ts:105-110`). Also aktuell **kein** aktiver Bug — aber die Korrektheit hängt an
implizitem Zufallsverhalten. **Empfehlung:** reihenfolgeunabhängigen Schlüssel hart kodieren
(Abschnitt 4.8/4.11), damit ein künftiger unabhängiger Pfad (Paste-Normalisierung,
Refactoring der Reader-Reihenfolge) dies nicht unbemerkt bricht.

### 2.5 Fehler 3 / Grenzfall 3.17 (mittel–hoch, in Vorfassung übergangen): OOXML-`<w:rPr>`-Kindelement-Reihenfolge ist schema-ungültig

**Datei/Zeilen:** `docx/writer.ts:23-30` gibt die `rPr`-Kinder in der Reihenfolge
`b (23), i (24), u (25), strike (26), color (27), shd (28-30)` aus.

Das OOXML-Schema `CT_RPr` (ECMA-376, EG_RPrBase) schreibt eine **feste** Kindreihenfolge vor;
für die hier erzeugten Elemente lautet sie:

```
b  <  i  <  strike  <  color  <  highlight  <  u  <  shd
```

Der Writer setzt `u` **vor** `strike` und `color` — für einen maximal kombinierten Run
(Hervorhebung + **Unterstrichen** + Schriftfarbe/Durchgestrichen) ist das eine
**Schema-Verletzung**. Word liest es tolerant, ein **strikter** OOXML-Validator (den
Anforderung 3.17 / DoD 8 fordert) beanstandet es. Wird zusätzlich der optionale
`<w:highlight>`-Export aus Abschnitt 4.8 aktiviert, **muss** dieser zwischen `color` und
`u` stehen — das geht nur mit korrigierter Reihenfolge.

**Fix:** `runPropertiesXml` gibt die Kinder in kanonischer `CT_RPr`-Reihenfolge aus
(Abschnitt 4.8). Da beide Reader Kinder namensbasiert (`firstChildNS`) lesen, ist die
Reihenfolge rein export-/validierungsrelevant; die Reader bleiben unberührt.

### 2.6 Lücke C / Grenzfall 3.14 (architektonisch, in Vorfassung übergangen): ODT `office:styles` werden nie gelesen

**Datei/Zeilen:** `odt/reader.ts:363-364` (nur `content.xml`-`automatic-styles`) und
`:373-374` (nur `styles.xml`-`automatic-styles`). `office:styles` (benannte, gemeinsame
Zeichenformatvorlagen) wird an **keiner** Stelle geparst.

Wird eine Hervorhebung über eine **benannte** Zeichenformatvorlage (statt Direktformatierung
in einem Automatikstil) vergeben, geht sie beim Import verloren. **Verifiziert:** Keine der
untersuchten Kandidat-Fixtures reproduziert das für Hervorhebung — bei `character-styles.odt`,
`coloredParagraph.odt`, `TableFunkyBackground.odt`, `feature_attributes_character_MSO15.odt`
liegt die `fo:background-color` durchweg in **`office:automatic-styles`** (family `text`),
**nicht** in `office:styles` (dort: keine benannten Textstile mit `background-color`). Die
Lücke ist also real, aber **mangels Fixture heute nicht mit sichtbarem Text belegbar**.

**Konsequenz für DoD 9:** entweder `office:styles` mitparsen (Abschnitt 4.9, Zusatz) **oder**
als bewusst zurückgestellte, dokumentierte Lücke mit Begründung führen. Dieser Plan
implementiert das Mitparsen (geringer Aufwand, kommt auch Fett/Kursiv/Textfarbe zugute) und
hält die verbleibende Grenze (mehrstufige `style:parent-style-name`-Vererbung in
`office:styles`) als bekannte, nicht durch Fixtures abgedeckte Restlücke fest.

### 2.7 Fehler 4 (neu, empirisch gegen jsdom@29.1.1 verifiziert): `normalizeCssColor` liefert bei CSS-Wide-Keywords Schwarz statt „kein Mark“

**Betrifft den in Abschnitt 4.1 vorgeschlagenen, noch ungeschriebenen Code** — kein
bestehender Bug, sondern ein Fehler, der ohne diesen Fund **so mit implementiert würde**.

`normalizeCssColor` (Entwurf, Abschnitt 4.1) parst einen beliebigen CSS-Farbwert, indem es
ihn testweise in `probe.style.color` schreibt und anschließend `getComputedStyle(probe).color`
ausliest — ein valider Kniff, weil `color` und `background-color` dieselbe `<color>`-Syntax
akzeptieren und so kein Farbkatalog gebündelt werden muss. Er versagt jedoch bei den
**CSS-Wide-Keywords** `inherit`, `initial`, `unset`, `currentColor` (und Fällen wie
`revert`, die aber unkritisch auf `null` fallen): Diese Werte sind **kontextabhängig**
(„die vom übergeordneten Element geerbte Farbe“ bzw. „die Textfarbe an dieser Stelle“) —
gültig als Wert von `background-color`, aber beim Umweg über `color` lösen sie sich
**gegen eine andere, hier bedeutungslose Referenz** auf: den (nicht gesetzten) Text-Farbwert
des isolierten Test-`div`. Sowohl in jsdom als auch in echten Browsern ist das der
implementierte Default (typischerweise Schwarz), unabhängig vom tatsächlichen Kontext des
Quelldokuments.

**Empirischer Beleg (dieser Durchlauf, gegen die im Repo gepinnte `jsdom@29.1.1`
tatsächlich ausgeführt, nicht nur behauptet):**

| Eingabe | `normalizeCssColor(...)` liefert | Erwartet |
|---|---|---|
| `'inherit'` | `'#000000'` | `null` |
| `'initial'` | `'#000000'` | `null` |
| `'unset'` | `'#000000'` | `null` |
| `'currentColor'` | `'#000000'` | `null` |
| `'revert'` | `null` | `null` (zufällig bereits korrekt — `cssstyle` kennt `revert` für `color` nicht) |
| `'var(--x)'` / `'color-mix(in srgb, red 50%, blue)'` | `null` | `null` (unkritisch, degradiert bereits sauber) |

**Warum das relevant ist, nicht nur eine Kuriosität:** `background-color: inherit` ist ein
real vorkommender Wert in aus Word/Outlook/älteren Webseiten kopiertem HTML (u. a. wenn ein
äußeres Element die Hintergrundfarbe trägt und ein inneres `<span>` sie explizit erbt) —
genau der Einfüge-Pfad, den Grenzfall 3.9/Testfall 11 bereits prüft. Ohne Fix erzeugt ein
Paste mit `background-color: inherit` (oder `currentColor`/`initial`/`unset`) über
`schema.ts`s `parseDOM` (Abschnitt 4.2) eine **echte, deckende `#000000`-Hervorhebungs-Mark**
— exakt die in Grenzfall 3.18 als kritisch eingestufte Konsequenz (schwarzer Balken, mit
schwarzer Standard-Schriftfarbe unlesbar), nur dass §3.6/§4.4 dort **nur den Farbchip**
absichert, nicht den Einfüge-Pfad. Diese Lücke wäre ohne den Fix **live**, sobald Abschnitt
4.1/4.2 wie ursprünglich entworfen umgesetzt würde — sie entsteht also durch den eigenen
Fix für Grenzfall 3.9, nicht durch bestehenden Code.

**Fix (eine zusätzliche Zeile in `normalizeCssColor`, vor dem DOM-Probe):**

```ts
const CSS_WIDE_KEYWORDS = new Set(['inherit', 'initial', 'unset', 'revert', 'revert-layer', 'currentcolor'])
if (CSS_WIDE_KEYWORDS.has(input.trim().toLowerCase())) return null
```

Eingearbeitet in den Code-Entwurf in Abschnitt 4.1. Test in Abschnitt 6.2 (Unit) und
6.1 Testfall 11 (E2E-Paste) ergänzt.

**Bewusst nicht behandelt (dokumentierte Restgrenze, kein Fix vorgeschlagen):** Legacy-
`<system-color>`-Schlüsselwörter (`window`, `buttonface`, `threedface`, …), wie sie ältere
Word-/Outlook-HTML-Exporte gelegentlich für Hintergründe verwenden. `normalizeCssColor`
liefert dafür einen deterministischen, aber OS-/Theme-abhängigen und ggf. vom
Originaldokument abweichenden Farbwert (z. B. `window → weiß`, `buttonface → hellgrau` unter
jsdom) — kein Absturz, aber potenziell eine „falsche“ statt „keine“ Farbe. Dieser
Grenzfall ist im Vergleich zu den CSS-Wide-Keywords seltener, tritt nicht als deckendes
Schwarz auf und wird hier nur dokumentiert, nicht behoben (kein Repo-Fixture bestätigt ihn
für dieses Feature).

---

## 3. Bewertung der in der Anforderung offen gelassenen Fragen

### 3.1 Bedienelement 3 (Tastenkombination) — Empfehlung: bewusste, dokumentierte Lücke
Freie Farbwahl lässt sich nicht sinnvoll auf **eine** Taste abbilden (es gibt keine „gemeinte"
Farbe). **Kein** Shortcut fürs Anwenden; für „Entfernen" technisch möglich, aber bewusst
**nicht** ergänzt (Backlog fordert nur „freie Farbwahl"). Der „Entfernen"-Button bleibt der
einzige Weg. Hiermit als bewusste Lücke festgehalten.

### 3.2 Grenzfall 3.1 / Abschnitt 2.2 (leere Selektion) — Commands unverändert, UI behoben
`applyMarkColor`/`clearMarkColor` bleiben No-Op bei leerer Selektion (kein Caret-Mode für
Hervorhebung — die in 2.2 der Anforderung als beabsichtigt eingestufte Entscheidung, hiermit
final bestätigt). „Kein stiller Fehlschlag" wird nicht über eine Verhaltensänderung der
Commands gelöst, sondern über **sichtbares UI-Feedback**: Steuerelemente `disabled` bei
leerer Selektion, erklärender `title` (Abschnitt 4.4). Löst DoD 6, ohne die fachliche
Entscheidung zu verwerfen.

### 3.3 Grenzfall 3.8 (`w:shd` statt `w:highlight`) — bewusster Kompromiss, optional additiv
`<w:shd>` bleibt **primärer** Exportweg (freie Farbwahl ⇒ `<w:highlight>`s ~16-Werte-Palette
ist strukturell unzureichend), ausdrücklich als Kompromiss dokumentiert. Konsequenz: In echtem
Word ist „Text hervorheben" (das Werkzeug) für so exportierten Text **nicht** aktiv — mit
echtem Word zu verifizieren und in `textmarker-farbe-req.md` nachzutragen. **Optional/additiv**
(Abschnitt 4.8): zusätzlich `<w:highlight w:val="…">` schreiben, wenn die Farbe exakt einem
Palettenwert entspricht — verbessert die Trefferquote der 16 häufigsten Fälle, **erfordert
aber** die korrigierte Kindreihenfolge aus Abschnitt 2.5.

### 3.4 Abschnitt 2.3 / Bedienelemente 1 und 5 (Zustandsanzeige) — nachrüsten
Wird umgesetzt (nicht als „bewusst fehlend" dokumentiert): Der Farbwähler spiegelt die Farbe
der Selektion und unterscheidet „keine Hervorhebung", „einheitliche Farbe X" und „gemischt"
(Abschnitt 4.3/4.4).

### 3.5 Bedienelement 4 (`🖍`/`⌫` Emoji-Rendering) — auf SVG umstellen
`🖍`/`⌫` werden durch inline-SVG-Icons ersetzt (gleiches Muster wie die bereits umgestellte
`ScissorsIcon` im selben File), löst **DoD 11** (nicht 10 — siehe Korrektur in §3.8). Abschnitt 4.4.

### 3.6 Grenzfall 3.18 (ungewollte schwarze Hervorhebung) — nur teilweise durch 3.4 gelöst; Restrisiko behandeln
Die Zustandsanzeige aus §3.4/4.4 mildert 3.18 (der Chip zeigt jetzt bei einheitlich
hervorgehobenem Text die vorhandene Farbe). **Aber:** `<input type="color">` hat **keinen**
„leer"-Zustand — bei einer Selektion **ohne** Hervorhebung ist `swatchColor === undefined`,
und der in §4.4 vorgeschlagene `defaultValue`/imperative Sync auf `'#000000'` bedeutet, dass
„Chip öffnen und **ohne Änderung** bestätigen" **weiterhin `#000000`** als deckenden schwarzen
Hintergrund setzt (Grenzfall 3.18, für den **Hintergrund** gravierender als für Schriftfarbe).
Das behebt §4.4 in seiner ursprünglichen Form also **nicht**. **Entscheidung/Fix (in §4.4
eingearbeitet):** Der `change`-Handler wendet die Farbe **nur** an, wenn sich der Wert
tatsächlich vom vorbelegten Ausgangswert unterscheidet **oder** eine bestehende Hervorhebung
vorliegt — ein „bestätigen ohne Änderung" auf zuvor **nicht** hervorgehobenem Text erzeugt
**keine** Mark. Alternativ dokumentierbar als bewusstes Verhalten; hier wird der Fix
implementiert (schließt **DoD 12**, nicht 11 — siehe Korrektur in §3.8). Vollständig lässt sich das ungewollte Schwarz mit dem
nativen Widget nicht ausschließen (der Nutzer *kann* Schwarz bewusst wählen — das ist dann
eine echte, gewollte Mark, exakt wie in Grenzfall 3.6 gefordert).

### 3.7 Grenzfall 3.20 (ODT-`style:text-background-color`/`loext:`) — Reader-Erweiterung
Der ODT-Reader liest Zeichen-Hervorhebung bisher **nur** aus `fo:background-color`
(`reader.ts:60-61`). ODF kennt für „Zeichen hervorheben" historisch/filterabhängig auch das
(zugunsten `fo:background-color` veraltete) `style:text-background-color` sowie ggf.
herstellerspezifische `loext:`-Attribute. Ohne Behandlung geht solche Hervorhebung **still
verloren** (analog zum DOCX-`<w:highlight>`-Fall 3.7, nur ODT-seitig). Fix in §4.9c, Test in
§6.7 — schließt **DoD 14** (nicht 13 — siehe Korrektur in §3.8/Abschnitt 7).

### 3.8 Grenzfall 3.13 (ODT-Absatzhintergrund vs. Zeichen-Hervorhebung, DoD 10) — bislang in diesem Plan komplett fehlend, hier nachgetragen; korrigiert zugleich eine durchgehende DoD-Nummern-Verschiebung

**Fund dieses Durchlaufs:** `textmarker-farbe-req.md` Abschnitt 6 verlangt ausdrücklich
**vierzehn** Abnahmepunkte („Erst nach Erfüllung aller vierzehn Punkte..."). Die Vorfassung
dieses Plans bildete in Abschnitt 7 jedoch nur **13 Zeilen** ab — der fehlende Punkt ist
**DoD 10** (Grenzfall 3.13). Er kam in **keiner** bisherigen Fassung dieses Plans vor, weder
als eigene Bewertung noch als Testfall noch als Tabellenzeile. Weil die nachfolgenden
Tabellenzeilen einfach lückenlos weiterzählten, waren **alle** späteren DoD-Verweise im
gesamten Dokument um eins verschoben: das Icon-Rendering-Risiko wurde als „DoD 10" geführt
(korrekt: **DoD 11**), Grenzfall 3.18 (schwarze Hervorhebung) als „DoD 11" (korrekt:
**DoD 12**), Grenzfall 3.19 (XML-Escaping) in der Tabelle als „DoD 12" (korrekt: **DoD 13**),
Grenzfall 3.20 als „DoD 13" (korrekt: **DoD 14**). Alle betroffenen Stellen sind in diesem
Durchlauf durchgehend korrigiert (§3.3–3.7, §4.4, §4.9, Abschnitt 7).

**Inhaltliche Behandlung (neu, war zuvor an keiner Stelle bewertet):**
`parseAutomaticStyles`s `family === 'paragraph'`-Zweig (`odt/reader.ts:63-67`) liest aus
`style:paragraph-properties` **ausschließlich** `fo:text-align`. Das dort ebenfalls mögliche
`fo:background-color` (ein echter **Absatzhintergrund** — z. B. eine farbig hinterlegte ganze
Zeile, unabhängig vom Text darin) wird **an keiner Stelle** gelesen, auch nicht versehentlich
als `highlight`-Mark. Die **schärfere** Hälfte von Grenzfall 3.13 („darf nicht fälschlich als
Zeichen-Hervorhebung importiert werden") ist damit bereits **heute** erfüllt — und bleibt es
auch nach dem Lücke-A-Fix aus §2.3/§4.9(a): jener liest **`style:text-properties`**
(Zeichenebene) desselben `paragraph`-Stils, ein **anderes** Geschwisterelement als
`style:paragraph-properties` (Absatzebene); beide dürfen nicht verwechselt werden, gerade weil
§4.9(a) den bislang kaum genutzten `paragraph`-Zweig ohnehin umbaut.

Die **zweite** Hälfte von Grenzfall 3.13 („der Absatzhintergrund darf nicht unbemerkt komplett
verschwinden — Fallback dokumentieren") ist dagegen **nicht** erfüllt: ein echter
Absatzhintergrund geht beim Import kommentarlos verloren. **Entscheidung (konsistent mit dem
Umgang mit den übrigen offenen Fragen in diesem Abschnitt):** Absatzhintergrund („paragraph
shading"/Box-Hintergrund für den ganzen Absatz) ist ein vom hier behandelten Zeichenformat
„Hervorhebungsfarbe" (`highlight`-Mark) **verschiedenes** ODF-Feature und liegt außerhalb des
in `textmarker-farbe-req.md` Abschnitt 0 gezogenen Geltungsbereichs („Ausschließlich das
Zeichenformat..."). Dieser Plan implementiert daher **kein** neues Paragraph-Background-
Feature, sondern:
1. Dokumentiert den Verlust bewusst als **bekannte, akzeptierte Lücke außerhalb des
   Geltungsbereichs** (kein neues Feature „Absatzhintergrund" im Rahmen dieses Plans).
2. Sichert per Regressionstest die Abgrenzung ab: eine synthetische ODT-Datei mit
   `style:family="paragraph"`, `style:paragraph-properties fo:background-color="#..."`
   (**ohne** begleitendes `style:text-properties fo:background-color`), referenziert von
   einem `<text:p>` mit direktem Text → **kein** `highlight`-Mark entsteht — insbesondere
   auch **nach** dem Lücke-A-Umbau in §4.9(a) (Test ergänzt in §6.4).
3. Hält fest: Sollte „Absatzhintergrund" künftig als **eigenes** Backlog-Feature beauftragt
   werden, ist `paragraphAligns` in `ParsedStyles` (`odt/reader.ts:23-27`) der naheliegende
   Erweiterungspunkt (analog zur bestehenden `text-align`-Behandlung) — hier bewusst **nicht**
   vorgezogen (Scope-Disziplin).

Wie `textmarker-farbe-req.md` selbst vermerkt, fehlt weiterhin eine reale, verifizierte
Fremddatei für diesen Grenzfall (`coloredParagraph.odt` widerlegt, siehe §2.3-Beleg/Präambel)
— die Abnahme von DoD 10 stützt sich daher auf den **synthetischen** Test plus die obige
Dokumentation, nicht auf einen realen Fremddatei-Import (dieselbe Einschränkung wie bei
Grenzfall 3.14/DoD 9).

---

## 4. Dateigenauer Umsetzungsplan

### 4.1 `src/formats/shared/color.ts` (neu)

Gemeinsame Farb-Normalisierung. **Im jsdom-Testumfeld verifiziert** (siehe Abschnitt 0). Hier
ausschließlich für `highlight` verdrahtet; für `textColor` bereit, aber bewusst nicht verdrahtet
(Geltungsbereich → `schriftfarbe-*`).

```ts
/**
 * Resolves any CSS color syntax (hex incl. 3-digit, named color, rgb()/rgba(),
 * hsl()/hsla()) to a canonical lowercase `#rrggbb` by letting the DOM parse it —
 * no bundled color table, no new dependency. Verified to work under jsdom
 * (vite.config.ts environment). Returns null for fully-transparent colors
 * (alpha 0, incl. `transparent`) and for values the engine rejects outright —
 * both mean "create no highlight mark", never "black".
 *
 * CSS-wide keywords (`inherit`/`initial`/`unset`/`currentColor`/`revert`) are
 * rejected explicitly, BEFORE the DOM probe (§2.7, found by actually running
 * this against jsdom, not just reasoning about it): they resolve relative to
 * cascade/context (e.g. "the inherited color"), but this function repurposes
 * the unrelated `color` property as a generic `<color>` parser, so the engine
 * resolves them against the probe's own (unset) context instead — typically to
 * black. Silently turning "background-color: inherit" (a real value seen in
 * pasted Word/Outlook/web HTML) into an opaque #000000 highlight would be
 * exactly the Grenzfall-3.18 failure this file guards against elsewhere, via a
 * different intake path (paste, not the toolbar chip).
 *
 * Order matters: the inline-style truthiness check must come first — jsdom (and
 * browsers) leave `probe.style.color === ''` for an unparsable value, whereas
 * getComputedStyle would fall back to a resolved "rgb(0, 0, 0)" (black) and hide
 * the rejection.
 */
export function normalizeCssColor(input: string): string | null {
  const CSS_WIDE_KEYWORDS = new Set(['inherit', 'initial', 'unset', 'revert', 'revert-layer', 'currentcolor'])
  if (CSS_WIDE_KEYWORDS.has(input.trim().toLowerCase())) return null
  const probe = document.createElement('div')
  probe.style.color = ''
  probe.style.color = input
  if (!probe.style.color) return null // engine rejected the value outright
  document.body.appendChild(probe)
  const resolved = getComputedStyle(probe).color // "rgb(r,g,b)" or "rgba(r,g,b,a)"
  document.body.removeChild(probe)
  const m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/.exec(resolved)
  if (!m) return null
  if (m[4] !== undefined && Number(m[4]) === 0) return null // fully transparent
  const [r, g, b] = [m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, '0'))
  return `#${r}${g}${b}`
}

/** True for a canonical `#rrggbb` (case-insensitive). */
export const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i
```

Hinweis (kleine Optimierung, optional): Bei sehr großem Paste würde je `background-color`-Span
ein `appendChild`/`removeChild` am `document.body` erfolgen. Ein einmal angelegtes,
wiederverwendetes verstecktes Probe-Element reduziert Reflow — funktional nicht erforderlich,
Reihenfolge der Guards bleibt gleich.

### 4.2 `src/formats/shared/schema.ts` (geändert)

`highlight`-Mark `parseDOM` (Zeile 191), Normalisierung beim Einfügen aus Fremd-HTML
(Grenzfall 3.9, 2.7):

```ts
parseDOM: [
  {
    style: 'background-color',
    getAttrs: (value) => {
      const color = normalizeCssColor(value as string)
      return color ? { color } : false // `false` verwirft die Regel -> kein Mark (deckt `transparent`, kein Hintergrund, Unparsbares)
    },
  },
],
```

`textColor` (182-188) bleibt **unverändert** (Geltungsbereich). Import von
`normalizeCssColor` aus `./color` (nur in `getAttrs` aufgerufen, also nie beim
Modul-Laden — kein DOM-Zugriff zur Importzeit).

### 4.3 `src/formats/shared/editor/commands.ts` (geändert)

Neue Hilfsfunktion für die Zustandsanzeige (Abschnitt 3.4). `applyMarkColor`/`clearMarkColor`
(106-122) bleiben **verhaltensgleich** (siehe 3.2).

```ts
export type ColorMarkState = { kind: 'none' } | { kind: 'mixed' } | { kind: 'set'; color: string }

/**
 * What the toolbar color control should show: no mark anywhere ('none'), one
 * uniform color across the whole selection/at the caret ('set'), or more than one
 * distinct value and/or a colored+uncolored mix ('mixed'). Empty selection uses
 * $from (matching the file's convention); a non-empty selection inspects every
 * text node in range so "half highlighted" reads as mixed, not as the boundary
 * (Anforderung 2.3 / Grenzfall 3.2). Non-text nodes (image/table structure) are
 * skipped -> selecting across an image never throws (Grenzfall 3.3).
 */
export function colorMarkStateFor(state: EditorState, markName: ColorMarkName): ColorMarkState {
  const markType = wordSchema.marks[markName]
  const { from, to, empty, $from } = state.selection
  if (empty) {
    const mark = markType.isInSet($from.marks())
    return mark ? { kind: 'set', color: mark.attrs.color as string } : { kind: 'none' }
  }
  let color: string | null | undefined
  let mixed = false
  state.doc.nodesBetween(from, to, (node) => {
    if (!node.isText) return
    const mark = markType.isInSet(node.marks)
    const value = mark ? (mark.attrs.color as string) : null
    if (color === undefined) color = value
    else if (color !== value) mixed = true
  })
  if (mixed) return { kind: 'mixed' }
  return color ? { kind: 'set', color } : { kind: 'none' }
}
```

### 4.4 `src/formats/shared/editor/Toolbar.tsx` (geändert)

Die beiden fast identischen Blöcke Textfarbe (191-210) und Hervorhebung (211-230) werden durch
eine gemeinsame Komponente ersetzt (behebt zugleich die Duplikation). **Wichtig:** Der
Import-Kopf (Zeile 1, aktuell nur `import type { ChangeEvent } from 'react'`) muss um
`useEffect, useRef` erweitert werden; aus `./commands` zusätzlich `colorMarkStateFor` und der
Typ `ColorMarkName` importieren.

**Listener/Swatch-Muster (behebt Fehler 2 **ohne** den Vorfassungs-Fallstrick):**
- Der native `change`-Listener wird **einmal** je Control angehängt (`useEffect([view, mark])`)
  — garantiert **einen** Undo-Schritt pro abgeschlossener Farbwahl, browserunabhängig.
- Der DOM-Wert des unkontrollierten `<input>` wird **imperativ** in einem **separaten**
  Effekt (`useEffect([swatchColor])`) gesetzt. **Kein** `key`-Remount (der würde den
  einmalig angehängten Listener beim ersten Selektionswechsel verlieren, weil das neue
  DOM-Element keinen erhält — genau der Bug der Vorfassung).

```tsx
function ColorMarkControl({ view, mark, label, applyTitle, removeTitle }: {
  view: EditorView
  mark: ColorMarkName
  label: React.ReactNode // 'A' (Textfarbe) oder <HighlighterIcon/>
  applyTitle: string
  removeTitle: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const state = colorMarkStateFor(view.state, mark)
  const { empty } = view.state.selection
  const swatchColor = state.kind === 'set' ? state.color : undefined

  // Attach the native `change` listener ONCE. `change` fires once per completed
  // pick regardless of how many `input` events the OS panel emits while dragging
  // (see §2.2). Deliberately NOT React's onChange (bound to `input`).
  useEffect(() => {
    const input = inputRef.current
    if (!input) return
    const onChange = (e: Event) => {
      const value = (e.target as HTMLInputElement).value
      // Grenzfall 3.18 (§3.6): on a selection WITHOUT any existing highlight,
      // a bare '#000000' is overwhelmingly "user confirmed the native panel's
      // default without picking" -> do NOT paint an opaque black background.
      // A real non-black pick, or any pick while a mark already exists
      // (recolor), applies normally. `view.state` is live via closure, so this
      // stays correct without adding it to the deps (which would drop the
      // listener on selection change -> the §2.2 pitfall).
      if (colorMarkStateFor(view.state, mark).kind === 'none' && value === '#000000') return
      run(view, applyMarkColor(mark, value))
    }
    input.addEventListener('change', onChange)
    return () => input.removeEventListener('change', onChange)
  }, [view, mark])

  // Sync the uncontrolled input's value imperatively — no key-remount, so the
  // single change-listener above stays attached across selection changes.
  useEffect(() => {
    if (inputRef.current) inputRef.current.value = swatchColor ?? '#000000'
  }, [swatchColor])

  const stateLabel = state.kind === 'mixed' ? 'gemischt' : state.kind === 'set' ? state.color : 'keine'

  return (
    <>
      <label
        className="flex items-center gap-1 text-sm text-neutral-600 dark:text-neutral-400 aria-disabled:opacity-40"
        aria-disabled={empty}
        title={empty ? `${applyTitle}: bitte zuerst Text markieren` : `${applyTitle}: ${stateLabel}`}
      >
        <span aria-hidden>{label}</span>
        <span
          aria-hidden
          className="w-2 h-2 rounded-full border border-neutral-400"
          style={{
            background: swatchColor ?? 'transparent',
            outline: state.kind === 'mixed' ? '1px dashed currentColor' : undefined,
          }}
        />
        <input
          ref={inputRef}
          aria-label={applyTitle}
          type="color"
          disabled={empty}
          defaultValue={swatchColor ?? '#000000'}
          className="w-6 h-6 p-0 border-0 bg-transparent disabled:opacity-40"
        />
      </label>
      <button
        type="button"
        title={empty ? `${removeTitle}: bitte zuerst Text markieren` : removeTitle}
        aria-label={removeTitle}
        disabled={empty}
        onMouseDown={(e) => { e.preventDefault(); run(view, clearMarkColor(mark)) }}
        className="px-1.5 py-1 text-xs rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 disabled:opacity-40 disabled:hover:bg-transparent"
      >
        <EraserIcon />
      </button>
    </>
  )
}
```

Aufrufstellen (ersetzen 191-230):

```tsx
<ColorMarkControl view={view} mark="textColor" label="A" applyTitle="Textfarbe" removeTitle="Textfarbe entfernen" />
<ColorMarkControl view={view} mark="highlight" label={<HighlighterIcon />} applyTitle="Hervorhebungsfarbe" removeTitle="Hervorhebung entfernen" />
```

Neue Icon-Komponenten (ersetzen `🖍`/`⌫`, Material-Icons-Pfad „border_color"/„backspace",
Apache-2.0 — analog `ScissorsIcon`):

```tsx
function HighlighterIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false" fill="currentColor">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
    </svg>
  )
}
function EraserIcon() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" focusable="false" fill="currentColor">
      <path d="M16.24 3.56l4.2 4.2c.78.78.78 2.05 0 2.83L12 19.03H7.05L2 14c-.78-.78-.78-2.05 0-2.83l9.19-9.19c.78-.78 2.05-.78 2.83 0zM7.05 17.03h3.53l6.44-6.44-3.53-3.53-6.44 6.44v3.53z" />
    </svg>
  )
}
```

**Koordinationshinweis (verschärft — konkreter, verifizierter Konflikt, nicht nur Risiko):**
Dieser Umbau berührt bewusst **auch** das Textfarbe-Control (geteilter JSX-Block). Geprüft:
`specs/schriftfarbe-code.md` (§3.4, Z. 361-409) enthält **bereits einen eigenen,
unabhängig entworfenen** `ColorMarkControl`-Vorschlag für **exakt dieselben** Zeilen
(`Toolbar.tsx:191-210`/`211-230`) — und die beiden Entwürfe sind **nicht kompatibel**:

| | `schriftfarbe-code.md` §3.4 | dieser Plan (§4.4) |
|---|---|---|
| Prop-Name für die Mark | `markName` | `mark` |
| Titel-Props | ein `title` | getrennt `applyTitle`/`removeTitle` |
| Zustandsanzeige (§2.3/DoD 5) | keine (kein `colorMarkStateFor`, kein Swatch) | Swatch + „gemischt"/„keine"/Farbe |
| `disabled` bei leerer Selektion (DoD 6) | nein | ja |
| `#000000`-Guard (Grenzfall 3.18/DoD 12) | nein | ja (§3.6) |
| Icons (DoD 11) | Emoji `🖍`/`⌫` unverändert | SVG (`HighlighterIcon`/`EraserIcon`) |
| Event-Fix (Fehler 2/§2.2) | ja (`change` statt `input`) | ja (`change` statt `input`) |

Ebenso bei `docx/writer.ts`s `runPropertiesXml`: `schriftfarbe-code.md` §3.1 schlägt **nur**
`escapeXml` um die bestehende, **unveränderte** Kindreihenfolge vor; dieser Plan (§4.8)
schlägt **zusätzlich** die kanonische `CT_RPr`-Reihenfolge **und** `safeHex`-Validierung
(Weglassen statt Escaping-only) vor — beide ändern dieselben Zeilen 20-33 grundlegend
unterschiedlich.

**Da beide Merkmale unabhängig vom Backlog als eigene Priorität-1-Features durch dieselbe
Lead↔PO↔Dev↔QA↔PO↔Lead-Pipeline laufen, ist das kein theoretisches, sondern ein bei
paralleler/nacheinander erfolgender Umsetzung sicher eintretendes Konflikt-Risiko** (Stand
dieses Durchlaufs: `git log` bestätigt, **keines** von beiden ist bereits im Code umgesetzt —
`Toolbar.tsx`/`docx/writer.ts` wurden zuletzt nur für „Ausschneiden"/Barrierefreiheit
geändert). **Auflösung, verbindlich für die Umsetzung dieses Plans:**
1. Die Fassung **dieses** Plans ist die **funktional strikt umfassendere** (Superset: sie
   deckt alles ab, was `schriftfarbe-code.md` §3.1/3.4 fordert, plus Zustandsanzeige,
   `disabled`, `#000000`-Guard, SVG, `CT_RPr`-Reihenfolge) — sie wird zur **kanonischen**
   Umsetzung für **beide** Farb-Controls und für `runPropertiesXml` insgesamt.
2. Wird `schriftfarbe-*` **zuerst** umgesetzt (einfachere Variante landet im Code): Diese
   Umsetzung **ersetzt** die dort eingeführte `ColorMarkControl`/`runPropertiesXml`-Fassung
   vollständig, statt eine zweite, parallele Komponente danebenzustellen. `aria-label`
   („Textfarbe"/„Hervorhebungsfarbe") und `title`-Texte bleiben **stringent unverändert**,
   damit `schriftfarbe.spec.ts` (falls bereits ergänzt) weiter grün bleibt.
3. Wird `textmarker-farbe` **zuerst** umgesetzt: `specs/schriftfarbe-code.md` §3.4/§3.1 sind
   damit **erledigt** (Superset) — bei der QA/PO-Abnahme von `schriftfarbe-*` ist auf diesen
   Plan zu verweisen statt der dortigen (dann veralteten) Eigenumsetzung zu folgen.
4. In jedem Fall: nach der Umsetzung `specs/schriftfarbe-code.md` §3.1/§3.4 als „durch
   `textmarker-farbe-code.md` §4.4/§4.8 überholt/ersetzt" nachtragen, damit kein zweiter
   Dev-Durchlauf denselben Code ein zweites Mal divergent umbaut.

### 4.5 `src/formats/shared/editor/WordEditor.tsx` (keine Änderung)
Siehe 3.1 — kein Shortcut, bewusste Lücke. Keymap-Block (85-107) bleibt unverändert.

### 4.6 `src/formats/docx/highlightPalette.ts` (neu)

ECMA-376 `ST_HighlightColor`-Enumeration (§17.18.40) → feste RGB-Werte (deckungsgleich mit
`WD_COLOR_INDEX`). Belegt durch `bug57031.docx` (`w:val="lightGray"`) und `bug65649.docx`
(`yellow`/`green`/`cyan`), reale Repo-Fixtures.

```ts
export const WORD_HIGHLIGHT_TO_HEX: Record<string, string> = {
  black: '#000000', blue: '#0000ff', cyan: '#00ffff', darkBlue: '#00008b',
  darkCyan: '#008080', darkGray: '#808080', darkGreen: '#008000', darkMagenta: '#800080',
  darkRed: '#8b0000', darkYellow: '#808000', green: '#00ff00', lightGray: '#c0c0c0',
  magenta: '#ff00ff', red: '#ff0000', white: '#ffffff', yellow: '#ffff00',
  // 'none' bewusst NICHT enthalten -> "keine Hervorhebung", kein Mark.
}

export function hexFromWordHighlightName(val: string | null): string | null {
  if (!val || val === 'none') return null
  return WORD_HIGHLIGHT_TO_HEX[val] ?? null
}

/** Best-effort Rückrichtung für den optionalen `<w:highlight>`-Export (§4.8). */
export function wordHighlightNameFromHex(hex: string): string | null {
  const normalized = hex.toLowerCase()
  return Object.entries(WORD_HIGHLIGHT_TO_HEX).find(([, v]) => v === normalized)?.[0] ?? null
}
```

### 4.7 `src/formats/docx/reader.ts` (geändert)

`marksFromRunProperties` (100-115) um `<w:highlight>` erweitern, `<w:shd>` mit Vorrang
(bewahrt Kompatibilität zu allen von dieser App selbst erzeugten Dateien, die nur `<w:shd>`
schreiben):

```ts
const shd = firstChildNS(rPr, OOXML_NAMESPACES.w, 'shd')
const fill = shd?.getAttributeNS(OOXML_NAMESPACES.w, 'fill')
const highlightEl = firstChildNS(rPr, OOXML_NAMESPACES.w, 'highlight')
const highlightVal = highlightEl?.getAttributeNS(OOXML_NAMESPACES.w, 'val') ?? null

if (fill && fill !== 'auto' && HEX_COLOR_RE.test(`#${fill}`)) {   // #-Präfix ZWINGEND: fill ist "FFFF00" ohne '#'
  marks.push({ type: 'highlight', attrs: { color: `#${fill.toLowerCase()}` } })
} else {
  const hex = hexFromWordHighlightName(highlightVal)
  if (hex) marks.push({ type: 'highlight', attrs: { color: hex } })
}
```

> **Behobener Fehler der Vorfassung:** Diese schrieb `HEX_COLOR_RE.test(fill)`. Da `fill`
> **ohne** führendes `#` vorliegt (Word: `w:fill="FFFF00"`) und `HEX_COLOR_RE` mit `^#`
> beginnt, hätte das **jeden** gültigen Word-Fill verworfen → Totalregression (u. a. der
> `fullCoverageDocument`-E2E-Import und beide `roundtrip.test.ts`). Korrekt ist
> `HEX_COLOR_RE.test(\`#${fill}\`)` (bzw. eine bare-Hex-Regex `/^[0-9a-f]{6}$/i`).

Die Hex-Prüfung ist eine neue defensive Härtung: ein nicht-hexadezimales `w:fill` aus
handeditierten Fremddateien wird ignoriert statt als Garbage weitergereicht.

**Caveat zur Vorrangregel (mit Blick auf `bug57031.docx`):** Diese Datei enthält **sowohl**
`<w:highlight w:val="lightGray"/>` **als auch** `<w:shd w:fill="FAFBFE"/>`/`"FFFFFF"`
(nahezu weiße Schattierung, vermutlich Zell-/Absatzhintergrund). Zwei Konsequenzen, die der
Test (6.6) explizit prüfen muss: (a) Steht die `lightGray`-Hervorhebung auf einem Run **ohne**
eigenes `<w:shd>`, greift die `<w:highlight>`-Auswertung und `#c0c0c0` entsteht — sonst
gewönne `<w:shd>`. (b) Der Reader macht bereits **jedes** Run-`<w:shd>` (auch nahezu weiße
Zellschattierung) zu einer `highlight`-Mark — das ist bestehendes Verhalten und kein Regress
dieses Features, aber der Test darf nicht „genau eine Highlight-Mark" erwarten, sondern die
**Anwesenheit** von `#c0c0c0` gezielt prüfen.

`HEX_COLOR_RE`, `hexFromWordHighlightName` importieren (aus `../shared/color` bzw.
`./highlightPalette`).

### 4.8 `src/formats/docx/writer.ts` (geändert)

**(a) Kanonische `CT_RPr`-Kindreihenfolge (Fix Grenzfall 3.17 / Fehler 3, §2.5).**
`runPropertiesXml` (20-33) sammelt die Kinder nicht mehr in Iterationsreihenfolge der Marks,
sondern gibt sie in fester Schemareihenfolge aus:

```ts
function runPropertiesXml(marks: JsonNode['marks']): string {
  let b = false, i = false, u = false, strike = false
  let color: string | null = null, highlight: string | null = null
  for (const mark of marks ?? []) {
    if (mark.type === 'strong') b = true
    else if (mark.type === 'em') i = true
    else if (mark.type === 'underline') u = true
    else if (mark.type === 'strike') strike = true
    else if (mark.type === 'textColor') color = safeHex(mark.attrs?.color)
    else if (mark.type === 'highlight') highlight = safeHex(mark.attrs?.color)
  }
  const props: string[] = []
  // CT_RPr order: b < i < strike < color < highlight < u < shd
  if (b) props.push('<w:b/>')
  if (i) props.push('<w:i/>')
  if (strike) props.push('<w:strike/>')
  if (color) props.push(`<w:color w:val="${escapeXml(color)}"/>`)
  if (highlight) {
    const name = wordHighlightNameFromHex(`#${highlight}`) // optional/additiv, §3.3
    if (name) props.push(`<w:highlight w:val="${name}"/>`)
  }
  if (u) props.push('<w:u w:val="single"/>')
  if (highlight) props.push(`<w:shd w:val="clear" w:color="auto" w:fill="${escapeXml(highlight)}"/>`)
  return props.length ? `<w:rPr>${props.join('')}</w:rPr>` : ''
}
```

**(b) Fix Fehler 1 (Escaping) + Grenzfall 3.9 (Validierung), ohne harten Export-Abbruch.**
`safeHex` liefert kanonisches bare-Hex oder `null` (→ Element wird **weggelassen**, Run und
Text bleiben erhalten):

```ts
function safeHex(color: unknown): string | null {
  const raw = String(color ?? '').replace('#', '').toLowerCase()
  return HEX_COLOR_RE.test(`#${raw}`) ? raw : null
}
```

> **Revidierte Design-Entscheidung ggü. Vorfassung:** Die Vorfassung ließ den Writer bei
> ungültiger Farbe eine **Exception werfen**. Das lässt den **gesamten** Export scheitern
> (das ganze Dokument wird unspeicherbar) wegen **einer** Farbmarke — ein härterer Verstoß
> gegen „ein Export darf nie sichtbaren Inhalt verlieren" (FEATURE-SPEC §18) als der Einzelfall.
> Da `schema.ts` (4.2) beim Einfügen bereits kanonisiert, ist dieser Pfad ohnehin
> Defense-in-Depth; erreicht ein Nicht-Hex-Wert ihn dennoch (z. B. direkt konstruiertes JSON,
> das die `parseDOM`-Stufe umgeht), ist **anmutiges Weglassen der Farbe bei erhaltenem Text**
> die robustere Wahl. `escapeXml` bleibt zusätzlich (Gürtel + Hosenträger — ein kanonisches
> Hex kann keine XML-Metazeichen enthalten, aber die Kombination ist die eigentliche Absicherung).

**(c) Härtung Lücke B (§2.4).** In `inlineToRuns` (41-67) den Vergleich `JSON.stringify(...)`
(Zeile 54) durch einen reihenfolgeunabhängigen Schlüssel ersetzen:

```ts
function marksKey(marks: JsonNode['marks']): string {
  return (marks ?? []).map((m) => `${m.type}:${JSON.stringify(m.attrs ?? {})}`).sort().join('|')
}
// im flush()/Loop: marksKey(buffer.marks) === marksKey(node.marks)
```

`escapeXml` ist bereits importiert; `HEX_COLOR_RE` aus `../shared/color`,
`wordHighlightNameFromHex` aus `./highlightPalette` ergänzen.

### 4.9 `src/formats/odt/reader.ts` (geändert)

**(a) Fix Lücke A (§2.3): Absatzstil-`text-properties` als Basis-Marks.** `ParsedStyles`
(23-27) um `paragraphRunStyles: Map<string, RunStyle>` erweitern. Im `family === 'paragraph'`-
Zweig (63-67) zusätzlich `style:text-properties` lesen (gleiche Attributlogik wie der
`text`-Zweig 48-62), und `decodeInline` (97-172) eine Basis-Markliste des Absatzstils
übergeben:

```ts
// parseAutomaticStyles, family === 'paragraph':
const tProps = firstChildNS(styleEl, ODF_NAMESPACES.style, 'text-properties')
if (tProps) {
  const s: RunStyle = {}
  if (tProps.getAttributeNS(ODF_NAMESPACES.fo, 'font-weight') === 'bold') s.bold = true
  if (tProps.getAttributeNS(ODF_NAMESPACES.fo, 'font-style') === 'italic') s.italic = true
  const ul = tProps.getAttributeNS(ODF_NAMESPACES.style, 'text-underline-style'); if (ul && ul !== 'none') s.underline = true
  const st = tProps.getAttributeNS(ODF_NAMESPACES.style, 'text-line-through-style'); if (st && st !== 'none') s.strike = true
  const col = tProps.getAttributeNS(ODF_NAMESPACES.fo, 'color'); if (col) s.color = col
  const bg = tProps.getAttributeNS(ODF_NAMESPACES.fo, 'background-color'); if (bg) s.highlight = bg
  if (Object.keys(s).length) paragraphRunStyles.set(name, s)
}
```

`decodeInline(pEl, styles, paragraphStyleName)`: erzeugt aus `paragraphRunStyles.get(name)`
eine Basis-Markliste und ruft `walk(child, baseMarks)` statt `walk(child, [])` (Zeile 170);
`mergeMarks` (125-136) sorgt bereits dafür, dass ein span-eigener Stil den Absatzstil
überschreibt (innerste Spezifität gewinnt). Aufrufstellen `paragraphToBlocks` (Zeile 181)
und der `heading`-Zweig in `elementToBlocks` (Zeile 260) reichen den bereits lokal
vorliegenden `styleName` als drittes Argument durch.

**(b) Fix Lücke C / Grenzfall 3.14 (§2.6): `office:styles` mitparsen.** In `readOdt`
(357-409) zusätzlich das `office:styles`-Element aus **`content.xml` und `styles.xml`** mit
derselben `parseAutomaticStyles`-Logik einlesen und in die Style-Maps **mergen** (Automatik-
und benannte Stile teilen sich den Namensraum der `text:style-name`-Referenzen). Minimaler
Zusatz:

```ts
const contentOfficeStyles = contentDoc.getElementsByTagNameNS(ODF_NAMESPACES.office, 'styles')[0] ?? null
mergeStyles(contentStyles, parseAutomaticStyles(contentOfficeStyles))
// analog für styles.xml (office:styles) in stylesForChrome bzw. gemeinsam mit dem Body-Katalog
```

`mergeStyles` fügt fehlende Einträge der Maps hinzu (Automatikstile behalten bei Namensgleichheit
Vorrang, da spezifischer). **Dokumentierte Restlücke:** Mehrstufige
`style:parent-style-name`-Vererbung innerhalb `office:styles` wird **nicht** aufgelöst (flaches
Lesen) — von keiner Repo-Fixture für Hervorhebung ausgeübt, daher als bekannte, aktuell nicht
testbare Grenze geführt (erfüllt DoD 9: geprüft + Fallback dokumentiert).

**(c) Fix Grenzfall 3.20 / DoD 14 (§3.7): alternatives Hervorhebungs-Attribut lesen.** Sowohl
im `family === 'text'`-Zweig (48-62) als auch im neuen `paragraph`-`text-properties`-Leser aus
(a) wird `fo:background-color` um einen Fallback auf das (veraltete, aber real
vorkommende) `style:text-background-color` ergänzt; ein `transparent`-Wert wird verworfen
(keine Hervorhebung), nicht als Farbe `"transparent"` durchgereicht:

```ts
const bg =
  props.getAttributeNS(ODF_NAMESPACES.fo, 'background-color') ??
  props.getAttributeNS(ODF_NAMESPACES.style, 'text-background-color') // veraltet, real (Grenzfall 3.20)
if (bg && bg !== 'transparent') style.highlight = bg
```

`style:text-background-color` liegt im `style`-Namespace (in `ODF_NAMESPACES.style` bereits
vorhanden — keine neue Namespace-Konstante nötig). **Vor** dem Test ist gemäß Anforderung
3.20/Testfall 18 durch Entpacken von `content.xml` der konkreten Fremddatei zu bestätigen,
welches Attribut sie tatsächlich verwendet; ergibt sich dabei ein herstellerspezifisches
`loext:`-Attribut (LibreOffice-Zeichenschattierung), ist eine `loext`-Namespace-Konstante zu
`ODF_NAMESPACES` zu ergänzen und analog als weiterer Fallback zu lesen — dieser Zweig bleibt
bis zur Fixture-Bestätigung als konditionale, dokumentierte Erweiterung geführt.

**(d) Defensive Härtung:** `bg`/`color` vor Mark-Erzeugung gegen `HEX_COLOR_RE` prüfen (ODF
erzwingt `#RRGGBB` ohnehin schematisch); nicht konforme Werte ignorieren statt weiterreichen.

### 4.10 `src/formats/odt/writer.ts` (geändert)

Escaping ist bereits korrekt (`styleRegistry.ts:56-57`). Nur dieselbe **anmutige** Härtung wie
im DOCX-Writer (§4.8b, **kein** Throw): `runPropsFromMarks` (32-43) lässt eine ungültige Farbe
weg statt sie weiterzureichen, Text bleibt erhalten:

```ts
if (mark.type === 'textColor') { const h = safeHex(mark.attrs?.color); if (h) props.color = `#${h}` }
if (mark.type === 'highlight') { const h = safeHex(mark.attrs?.color); if (h) props.highlight = `#${h}` }
```

(`safeHex` aus einem gemeinsamen Ort, z. B. `../shared/color`, exportiert; ODF-`fo:*`-Farben
werden als `#rrggbb` geschrieben, konsistent mit dem Reader.)

### 4.11 `src/formats/odt/styleRegistry.ts` (geändert)

**Fix Lücke B (§2.4):** `styleNameFor` (28-39), reihenfolgeunabhängiger Dedup-Schlüssel statt
`JSON.stringify(props)` (Zeile 30):

```ts
const key = [
  props.bold ? 'b' : '', props.italic ? 'i' : '', props.underline ? 'u' : '',
  props.strike ? 's' : '', props.color ?? '', props.highlight ?? '',
].join('|')
```

(`RunProps` hat feste benannte Felder → der Schlüssel ist per Konstruktion
einfügereihenfolge-unabhängig.)

---

## 5. Zusammenfassung der Design-Entscheidungen (zur Übernahme nach `textmarker-farbe-req.md`)

1. **Kein Tastaturkürzel** (Anwenden/Entfernen) — bewusste, dokumentierte Lücke (§3.1).
2. **Keine Schreibmarken-Hervorhebung** (kein Caret-Mode); UI-Feedback bei leerer Selektion
   über **deaktivierte** Controls statt Command-Verhaltensänderung (§3.2).
3. **`<w:shd>` bleibt primärer DOCX-Exportweg**; `<w:highlight>` wird beim Import **zusätzlich**
   gelesen (mit `<w:shd>`-Vorrang) und beim Export **optional/additiv** mitgeschrieben, wenn die
   Farbe exakt in die 16-Werte-Palette passt (§3.3/4.7/4.8) — inkl. **korrigierter**
   `CT_RPr`-Kindreihenfolge (§2.5).
4. **Zustandsanzeige wird nachgerüstet** (§3.4/4.4), Emoji → **SVG** (§3.5/4.4).
5. **Farbnormalisierung** über DOM-gestützte `normalizeCssColor` (kein Bundled-Katalog, keine
   neue Abhängigkeit), im jsdom-Testumfeld **verifiziert** — löst Grenzfall 3.9 vollständig
   (Named Colors, `rgb()/rgba()`, 3-stelliges Hex, `hsl()`, `transparent`).
6. **Ungültige Farbwerte beim Export**: **anmutiges Weglassen** der Farbe bei erhaltenem Text
   (nicht: harter Export-Abbruch) — revidiert ggü. der Vorfassung (§4.8b).
7. **Schwarze Hervorhebung (Grenzfall 3.18/DoD 12)**: Chip spiegelt die Selektionsfarbe, und
   „Panel-Default `#000000` ohne bewusste Auswahl bestätigen" auf **nicht** hervorgehobenem Text
   erzeugt **keine** Mark (`change`-Guard, §3.6/4.4). Bewusst gewähltes Schwarz auf
   hervorgehobenem Text bleibt eine echte Mark (Konsistenz mit Grenzfall 3.6).
8. **ODT-Alternativattribut (Grenzfall 3.20/DoD 14)**: `style:text-background-color` wird als
   Fallback zu `fo:background-color` gelesen; `loext:`-Zeichenschattierung konditional nach
   Fixture-Bestätigung (§4.9c).
9. **ODT-Absatzhintergrund (Grenzfall 3.13/DoD 10)**: bleibt außerhalb des Geltungsbereichs
   (eigenständiges ODF-Feature, keine `highlight`-Mark) — der Reader liest `fo:background-color`
   aus `style:paragraph-properties` schon heute nicht und wird das auch nach dem Lücke-A-Umbau
   nicht tun; der Verlust wird dokumentiert statt eines neuen Features implementiert (§3.8).
10. **CSS-Wide-Keywords beim Einfügen (§2.7, neu)**: `normalizeCssColor` weist `inherit`/
   `initial`/`unset`/`currentColor`/`revert` explizit zurück (`null`, kein Mark), **bevor**
   der DOM-Probe-Trick greift — verhindert, dass ein per Fremd-HTML eingefügtes
   `background-color: inherit` (o. ä.) unbemerkt zu einer deckenden `#000000`-Hervorhebung
   wird (dieselbe Fehlerklasse wie Grenzfall 3.18, nur über den Einfüge- statt den
   Chip-Pfad). Legacy-`<system-color>`-Schlüsselwörter (`window`, `buttonface`, …) bleiben
   bewusst unbehandelt (dokumentierte Restgrenze, kein deckendes Schwarz, kein Absturz).

---

## 6. Testplan (Zuordnung zu Abschnitt 5 der Anforderung)

### 6.1 `tests/e2e/highlight.spec.ts` (neu)
Native `<input type="color">`-Bedienung über den vorhandenen Muster-Helper (analog
`pickColor`, `clipboard.spec.ts:39` — **wiederverwenden**, nicht neu erfinden):
`el.value = hex; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true}))`.

1. Farbwähler auf reine Textselektion → `background-color: rgb(255, 255, 0)` im DOM des Bereichs.
2. „Entfernen" klicken → `background-color` verschwindet, restlicher Text/andere Marks unverändert.
3. Beide Controls **ohne** Selektion → `toBeDisabled()`, `title` enthält Hinweistext (deckt
   Grenzfall 3.1 + Zustandsanzeige).
4. Gemischte Selektion (halb gelb, halb keine) → Swatch/`title` zeigt „gemischt"; nach Anwenden
   neuer Farbe ist die **gesamte** Selektion einheitlich (Grenzfall 3.2).
5. Undo direkt nach einer per **einem** `change`-Event simulierten Farbwahl → **ein**
   Undo-Schritt entfernt die komplette Hervorhebung; Redo stellt sie wieder her. (Der Helper
   erzeugt genau eine Transaktion; echtes Dragging bleibt separat zu prüfen, Grenzfall 3.11.)
6. Hervorhebung + Fett + Schriftfarbe **+ Unterstrichen** auf einem Textlauf → DOCX-Export →
   JSZip+DOMParser auf `word/document.xml`: **ein** `<w:r>` mit `<w:b/>`, `<w:color/>`,
   `<w:u/>`, `<w:shd/>` in **kanonischer CT_RPr-Reihenfolge** (Grenzfall 3.17) — plus
   **strikte** OOXML-Schema-Validierung des Exports.
7. Gleicher kombinierter Test für ODT: **ein** `<text:span>`, **eine** `T…`-Stildefinition mit
   allen Eigenschaften.
8. Vollständige Rundreise je Format über echten Upload (`setInputFiles`) / Download
   (`page.waitForEvent('download')`) — nicht nur interne Reader/Writer (Abschnitt 4.1/4.2 der Anforderung).
9. **Kritischer Importtest**: `bug57031.docx` hochladen → `#c0c0c0`-Hervorhebung an der
   erwarteten Textstelle sichtbar (`getComputedStyle` im Browser-Kontext). Assertion prüft die
   **Anwesenheit** von `#c0c0c0`, nicht „genau eine Highlight-Mark" (Caveat §4.7 wegen der
   zusätzlichen nahezu weißen `<w:shd>`-Schattierungen der Datei). Belegt Grenzfall 3.7/4.1.5.
10. ODT-Fixtures: `lostBackground.odt` (Erwartung: 4 sichtbare, korrekt übernommene
    Hervorhebungen — Regressionsschutz für das bereits korrekte Verhalten); `coloredParagraph.odt`
    (**korrigiert**: dessen `fo:background-color="#92D050"` liegt an einem `family="text"`-Stil,
    also **erwartet** als `highlight`-Mark `#92d050` — **nicht** als „Absatzhintergrund, nicht
    verwechseln"-Fall, wie in Vorfassung/Anforderung angenommen; direkt am Fixture verifiziert);
    `character-styles.odt`, `TableFunkyBackground.odt` auf erwartete Highlight-Marks (Inhalt vor
    Testerstellung geprüft).
11. Fremd-HTML-Paste mit `background-color: yellow` bzw. `rgba(255,0,0,0.5)` → resultierender
    Mark-Farbwert kanonisches Hex (`#ffff00`/`#ff0000`); DOCX-Export danach mit gültigem
    `w:fill="[0-9a-f]{6}"`. Zusätzlich interner Copy/Paste-Pfad, bei dem der Browser
    `#00ff00 → rgb(0,255,0)` normalisiert → Export weiterhin gültig (Grenzfall 3.9).
    **Ergänzt (§2.7, neu):** Fremd-HTML-Paste mit `background-color: inherit` (bzw.
    `currentColor`/`initial`/`unset`) → **kein** `highlight`-Mark im DOM entsteht (insb.
    **kein** `#000000`) — Regressionstest gegen den in §2.7 gefundenen Fehler, der ohne
    Fix erst mit der Umsetzung von Abschnitt 4.1/4.2 entstünde.
12. Cross-Format-Doppel-Rundreise DOCX→ODT→DOCX und ODT→DOCX→ODT (Abschnitt 4.3).
13. `w:shd`-Kompromiss (Grenzfall 3.8): exportiertes `word/document.xml` enthält **kein**
    `<w:highlight>`, sofern die Farbe **nicht** in der Palette liegt; **genau** den erwarteten
    `w:val` (an korrekter CT_RPr-Position), falls doch (optionaler Export aktiv).
14. Event-Granularität browserübergreifend (Chromium **und** Firefox): mehrere `input` gefolgt
    von einem `change` → genau **ein** `Strg+Z` entfernt die komplette Hervorhebung.
15. **Grenzfall 3.18 (§3.6):** Selektion **ohne** vorhandene Hervorhebung, Chip auf `#000000`
    (Panel-Default) bestätigen → **kein** `background-color` im DOM (der `change`-Guard greift).
    Gegenprobe: dieselbe Selektion, `#000000` **bewusst** über den Helper gesetzt bei bereits
    vorhandener Hervorhebung → Schwarz **wird** angewandt (echte, gewollte Mark, Grenzfall 3.6).

### 6.2 `src/formats/shared/__tests__/color.test.ts` (neu)
`normalizeCssColor`: 6-/3-stelliges Hex (Groß/klein), Named (`yellow`, `rebeccapurple`),
`rgb()`, `rgba()` α=1/0.5/0, `hsl()`, `transparent`→`null`, `"not-a-color"`→`null`. (Läuft in
jsdom; die erwarteten Ergebnisse sind in Abschnitt 0 direkt am jsdom-Build belegt.)
**Ergänzt (§2.7, neu, Regressionstest für den in diesem Durchlauf gefundenen Fehler):**
`'inherit'`, `'initial'`, `'unset'`, `'currentColor'`, `'CURRENTCOLOR'` (Groß-/Kleinschreibung),
`'  inherit  '` (Whitespace) → alle `null`, **nicht** `'#000000'`; `'revert'`,
`'var(--x)'`, `'color-mix(in srgb, red 50%, blue)'` → ebenfalls `null` (bereits ohne
Sonderbehandlung korrekt, als Regressionsschutz mit aufgenommen).

### 6.3 `src/formats/shared/editor/__tests__/commands.test.ts` (ergänzt)
`colorMarkStateFor`: leere Selektion mit/ohne Mark; einheitliche Selektion; gemischt (Farbe A /
keine / Farbe B → `mixed`); Selektion über einen `image`-Knoten → kein Absturz, `none`/korrekt
(Grenzfall 3.3 auf Command-Ebene).

### 6.4 `src/formats/odt/__tests__/roundtrip.test.ts` (ergänzt)
- **Synthetisches** ODT (`content.xml` als String konstruiert), `style:family="paragraph"` mit
  `style:text-properties fo:background-color`, referenziert von `<text:p>` mit **direktem,
  nicht span-verpacktem** Text → `highlight`-Mark gesetzt (Regressionstest Lücke A, §2.3;
  `writeOdt` erzeugt diesen ODF-Fall selbst nie).
- Synthetisches ODT mit Hervorhebung in **`office:styles`** (benannte Zeichenformatvorlage) →
  `highlight`-Mark gesetzt (Regressionstest Grenzfall 3.14, §2.6).
- Zwei Textläufe, identische Markkombination, Marks in **umgekehrter** Array-Reihenfolge
  konstruiert → **eine** `T…`-Stildefinition (Lücke B, §2.4).
- `highlight` `#ffffff` (Weiß) rundreist als explizit gesetzte Farbe, unterscheidbar von „kein
  Mark" (Grenzfall 3.6).
- Ungültige Farbe (`'yellow'` statt `'#ffff00'`) an `writeOdt` → Farbe **weggelassen**, Text
  erhalten, **kein** Throw, gültiges `content.xml` (Regressionstest §4.10; **korrigiert** ggü.
  der Vorfassung, die einen Throw erwartete).
- **Synthetisches** ODT mit `style:text-background-color="#ffff00"` (statt `fo:background-color`)
  an einem `family="text"`-Stil → `highlight`-Mark `#ffff00` gesetzt (Regressionstest Grenzfall
  3.20 / §4.9c). Zusätzlich `style:text-background-color="transparent"` → **kein** `highlight`-Mark.
- **Synthetisches** ODT mit `style:family="paragraph"`, `style:paragraph-properties
  fo:background-color="#ff0000"` (**ohne** begleitendes `style:text-properties
  fo:background-color`), referenziert von `<text:p>` mit direktem, nicht span-verpacktem Text
  → **kein** `highlight`-Mark entsteht (Regressionstest Grenzfall 3.13/DoD 10, §3.8) — pinnt
  gezielt die Abgrenzung zum vorigen Fall (Lücke A liest `text-properties`, nicht
  `paragraph-properties`, desselben Stil-Elements), insbesondere **nach** dem Lücke-A-Umbau
  in §4.9(a), der den `paragraph`-Zweig ohnehin anfasst.

### 6.5 `src/formats/docx/__tests__/roundtrip.test.ts` (ergänzt)
- `<w:highlight w:val="lightGray"/>` (ohne `<w:shd>`) importieren → `#c0c0c0`. Zusätzlich:
  **beide** `<w:highlight>` und `<w:shd>` auf einem Run → `<w:shd>` gewinnt (§4.7).
- Farbwert mit `"`/`&`/`<` (z. B. `'#ff0000"><evil/>'`) an `writeDocx` → Farbe **weggelassen**,
  Run/Text erhalten, **valides** XML (Regressionstest Fehler 1 + revidierte Entscheidung §4.8b;
  **korrigiert** ggü. Vorfassung, die einen Throw erwartete).
- Kombinierter Run Hervorhebung + Unterstrichen + Schriftfarbe + Durchgestrichen → exportierte
  `<w:rPr>`-Kindreihenfolge = `b?, i?, strike, color, (highlight?), u, shd`, gegen **striktes**
  Schema validiert (Grenzfall 3.17, §2.5).
- Zwei benachbarte Textläufe, gleiche Markkombination in **unterschiedlicher** Array-Reihenfolge
  → genau **ein** `<w:r>` (Lücke B / `marksKey`, §4.8c).
- Hervorhebung über einen `hard_break` hinweg (Anforderung 4.1.6).
- Reihenfolge-Unabhängigkeit Farbe↔Fett über echte `tr.addMark`-Sequenz → identisches `<w:rPr>`
  (Anforderung 2.4).

### 6.6 `src/formats/docx/__tests__/external-fixtures.test.ts` (ergänzt)
Smoke-Test bleibt; zusätzlich gezielt für `bug57031.docx`: mindestens eine `highlight`-Mark mit
`#c0c0c0` im Ergebnis (pinnt Fix Grenzfall 3.7). **Nicht** auf „genau eine" prüfen (Caveat §4.7:
die Datei trägt zusätzlich nahezu weiße `<w:shd>`-Schattierungen, die der bestehende Reader
ebenfalls zu Highlight-Marks macht).

### 6.7 `src/formats/odt/__tests__/external-fixtures.test.ts` (ergänzt)
`lostBackground.odt`: exakt 4 `highlight`-Marks mit Texten „Dienstag"/„Rot Und BOLD"/„Text"/„pfff"
und Hex `#ffff00`/`#ff0000`/`#ffc000`/`#ffc000` (case-insensitiv; pinnt das korrekte Verhalten,
schützt gegen einen naiven „alle `background-color`-Stile verwenden"-Refactor, der die 8 verwaisten
Stile fälschlich einbezöge). Ergänzend `coloredParagraph.odt` → `#92d050`-Highlight (korrigierte
Erwartung, §6.1.10), `character-styles.odt`, `TableFunkyBackground.odt` auf erwartete Highlight-Marks.
**Grenzfall 3.20 (§4.9c):** Falls eine reale LibreOffice-Fixture die Hervorhebung nachweislich
über `style:text-background-color` (bzw. ein `loext:`-Attribut) serialisiert — vorher per
Entpacken von `content.xml` bestätigen —, hier als weiteren Import-Fall aufnehmen; solange keine
solche Repo-Fixture bestätigt ist, deckt der synthetische Test in §6.4 den Reader-Zweig ab und
die reale-Datei-Prüfung bleibt als dokumentierter, fixture-abhängiger Rest (DoD 14).

---

## 7. Zuordnung zu den Abnahmekriterien (Abschnitt 6 der Anforderung — alle 14 Punkte)

> **Korrektur dieses Durchlaufs:** Diese Tabelle hatte in jeder Vorfassung nur **13** Zeilen,
> obwohl die Anforderung **14** Punkte verlangt — Punkt **10** (Grenzfall 3.13,
> ODT-Absatzhintergrund) fehlte ersatzlos, wodurch alle nachfolgenden Zeilen (vormals „10.“
> bis „13.“) tatsächlich die Punkte 11-14 abbildeten, aber falsch nummeriert waren. Jetzt
> vollständig und mit korrekter Nummerierung (siehe §3.8).

| DoD-Punkt | Abdeckung durch diesen Plan |
|---|---|
| 1. Alle Testfälle aus Abschnitt 5 als grüne E2E-Tests (echte Bedienung) | §6.1 (`highlight.spec.ts`, 15 Punkte) + Re-Ausführung der vorhandenen `clipboard/docx/odt`-Tests |
| 2. Rundreise per **unabhängigem** Parser/Re-Import bestätigt | §6.1 P6-12 + §6.4/6.5/6.6/6.7 (JSZip+DOMParser bzw. Re-Import, nicht nur eigener Reader) |
| 3. Alle Grenzfälle einzeln geprüft und dokumentiert | Abschnitte 1-2 (3.7 belegt via `bug57031/bug65649.docx`; 3.13 **korrigiert**: `coloredParagraph.odt` ist Text-Highlight, siehe §3.8 für die eigentliche Bewertung von 3.13; 3.9 via `normalizeCssColor` **inkl. CSS-Wide-Keywords §2.7**; neue Lücken A/B/C zusätzlich) |
| 4. `w:shd`-statt-`w:highlight`-Kompromiss dokumentiert | §3.3/5 P3 |
| 5. Zustandsanzeige behoben oder dokumentiert | Behoben, §3.4/4.3/4.4 |
| 6. Rückmeldung bei leerer Selektion behoben/dokumentiert | UI behoben (deaktivierte Controls), Commands bewusst unverändert, §3.2 |
| 7. Umgang mit ungültigen Fremdfarbwerten geklärt | `normalizeCssColor` (Einfügen, **inkl. CSS-Wide-Keyword-Ablehnung §2.7**) + `escapeXml` + `safeHex`/Weglassen (Export), §2.1/2.7/4.1/4.2/4.8/4.10 |
| 8. **OOXML-Kindelement-Reihenfolge** (Grenzfall 3.17) gegen striktes Schema geprüft | **Neu abgedeckt** — Fix §2.5/4.8a, Test §6.1.6/§6.5 (strikte Schema-Validierung) |
| 9. **ODT `office:styles`/benannte Zeichenformatvorlagen** (Grenzfall 3.14) geprüft, Fallback dokumentiert | **Neu abgedeckt** — Parsing §4.9b + dokumentierte Restlücke (Parent-Chain); Test §6.4. Fixture-Befund: kein Repo-Fixture reproduziert es für Highlight (§2.6) |
| 10. **ODT-Absatzhintergrund vs. Zeichen-Hervorhebung** (Grenzfall 3.13) mit echter Fremddatei geprüft, Fallback dokumentiert | **Bislang in dieser Tabelle komplett fehlend — jetzt nachgetragen** (§3.8): `coloredParagraph.odt` widerlegt (kein Absatzhintergrund, siehe Präambel/§2.3); kein Repo-Fixture verfügbar → Abgrenzung „liest `paragraph-properties`/`background-color` nie, auch nicht als Fehl-Import" **verifiziert bestehend** + Verlust bewusst als Scope-Grenze dokumentiert (Absatzhintergrund ist ein anderes Feature); Regressionstest §6.4 (synthetisch) |
| 11. Icon-Rendering-Risiko `🖍`/`⌫` bewertet | Auf SVG umgestellt (`HighlighterIcon`/`EraserIcon`), §3.5/4.4 |
| 12. Ungebundener Farbchip / **ungewollte schwarze Hervorhebung** (Grenzfall 3.18) behoben oder dokumentiert | **Neu abgedeckt** — Chip spiegelt Selektionsfarbe (§3.4/4.4) **plus** `change`-Guard gegen `#000000` auf nicht-hervorgehobener Selektion (§3.6/4.4); **plus** derselbe Fehlerpfad über Fremd-HTML-Paste (§2.7, `inherit`/`currentColor` → sonst `#000000`); Test §6.1.15/§6.1.11 |
| 13. Fehlende **XML-Escapung von `w:fill`** (Grenzfall 3.19) geprüft/nachgerüstet | `escapeXml` + `safeHex`-Normalisierung im DOCX-Writer (§2.1/4.8b); Test §6.5 (Wert mit `"`/`&`/`<` → **valides** XML) |
| 14. ODT-Import über **`style:text-background-color`** (Grenzfall 3.20) geprüft, Fallback dokumentiert | **Neu abgedeckt** — Reader-Fallback §4.9c (+ `loext:` konditional); Test §6.4 (synthetisch) / §6.7 (reale Fixture, fixture-abhängiger Rest) |

---

## 8. Reihenfolge der Umsetzung (Vorschlag — Härtestes/Kern zuerst)

1. **`docx/reader.ts` + `docx/highlightPalette.ts`** (§4.6/4.7) — der **kritischste** Punkt
   (Grenzfall 3.7, unsichtbarer `<w:highlight>`-Verlust), sofort an `bug57031.docx` belegbar.
   Enthält den behobenen Hex-Regex-Fehler.
2. **`docx/writer.ts`** (§4.8) — CT_RPr-Reihenfolge (Grenzfall 3.17/DoD 8), Escaping (Fehler 1),
   `safeHex`-Weglassen, `marksKey`. Zweitkritischste, schema-relevante Korrektur.
3. **`shared/color.ts`** (§4.1, **inkl. CSS-Wide-Keyword-Ablehnung §2.7**) + **`schema.ts`**
   (§4.2) — Farbnormalisierung an der Wurzel (Grenzfall 3.9). Den §2.7-Fix **von Anfang an**
   mit einbauen, nicht nachträglich — sonst wird die in §2.7 beschriebene Lücke für einen
   Commit lang scharf geschaltet (Paste mit `background-color: inherit` → `#000000`).
4. **`odt/reader.ts`** (§4.9) — Lücke A (Absatzstil-`text-properties`), `office:styles`
   (Grenzfall 3.14/DoD 9) **und** `style:text-background-color`-Fallback (Grenzfall 3.20/DoD 14).
   **Zusammen mit dem in §3.8/§6.4 ergänzten Regressionstest für Grenzfall 3.13/DoD 10**
   (`paragraph-properties`-Hintergrund bleibt weiterhin ungelesen, auch nach diesem Umbau).
5. **`commands.ts` + `Toolbar.tsx`** (§4.3/4.4) — Zustandsanzeige, deaktivierte Controls,
   `change`-Event ohne Listener-Drop-Fallstrick **plus `#000000`-Guard** (Grenzfall 3.18/DoD 12),
   SVG-Icons (DoD 5/6/11/12).
6. **`odt/writer.ts` + `odt/styleRegistry.ts`** (§4.10/4.11) — anmutige Härtung + Lücke B
   (niedrige Priorität, aktuell nicht auslösbar).
7. Testergänzungen §6.1-6.7 **unmittelbar zu jedem** obigen Schritt (nicht am Ende gesammelt) —
   deckt sich mit der Repo-Vorgabe „nach jeder abgeschlossenen Leiter-/Feature-Akzeptanz committen".
8. Optionaler `<w:highlight>`-Export (§4.8a, Palettenzweig) — nur falls nach §3.3 gewünscht;
   unabhängig vom Rest, aber **erst nach** Schritt 2 (braucht korrekte CT_RPr-Position).
