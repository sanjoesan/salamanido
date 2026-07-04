# Umsetzungsplan: Feature „Texthervorhebungsfarbe" — Code-Abgleich und geplante Änderungen

Rolle: Entwickler-Antwort auf `specs/textmarker-farbe-req.md`. Dieses Dokument prüft
den **tatsächlichen** Code-Stand gegen jede Behauptung/Anforderung der Spezifikation
und legt fest, welche Dateien wie geändert bzw. neu angelegt werden. Stil orientiert
an `FEATURE-SPEC-DOCX-ODT.md` bzw. `specs/fett-code.md`. Kein Punkt hier ist bereits
umgesetzt — dies ist der Plan, nicht der Vollzug.

---

## 0. Kurzfassung

Die in `textmarker-farbe-req.md` referenzierte Ist-Stand-Tabelle ist **vollständig
zeilengenau korrekt** — anders als bei `fett-req.md` gab es hier keine einzige
Zeilenverschiebung oder falsche Behauptung (siehe Abschnitt 1). Der „kritische
Verdacht" aus Grenzfall 3.7 (natives `<w:highlight>` geht beim Import verloren) ist
**bestätigt und zusätzlich mit echten Repo-Fixture-Belegen untermauert**:
`tests/fixtures/external/docx/bug57031.docx` und `bug65649.docx` enthalten
`<w:highlight w:val="lightGray"/>` bzw. weitere Werte, die der aktuelle Reader
stillschweigend verwirft.

Die tatsächliche Codeprüfung deckt außerdem **drei in der Anforderung nicht benannte,
neue Fehler** auf:

1. **DOCX-Export fehlt XML-Escaping für Farbwerte** (`docx/writer.ts:25,27`) —
   schwerwiegender als das in Grenzfall 3.9 beschriebene „nur ungültiges
   `w:fill`"-Problem: Ein Farbwert mit `"`, `<` oder `&` (z. B. aus manipuliertem/
   fremdem `background-color`-Value beim Einfügen) erzeugt **strukturell
   fehlerhaftes, nicht parsebares XML**, nicht nur ein schema-ungültiges Attribut.
   `odt/styleRegistry.ts:56-57` escaped korrekt — die Asymmetrie bestätigt, dass es
   sich um ein Versehen handelt.
2. **Natives `<input type="color">` ist über Reacts `onChange` an das native
   `input`-Ereignis gebunden, nicht an `change`** — bestätigt die in Abschnitt 2.8 /
   Grenzfall 11 geäußerte Vermutung technisch präzise: Chromium feuert `input`
   kontinuierlich während der Farbrad-Interaktion, was hier bei jedem Tick eine
   eigene ProseMirror-Transaktion (= einen eigenen Undo-Schritt) auslöst.
3. **ODT-Reader liest niemals `style:text-properties` einer `paragraph`-Familie-
   Stildefinition** — ODF erlaubt, dass ein `<text:p style-name="X">` direkt (nicht
   in einen `<text:span>` gewickelten) Text über die `style:text-properties` **des
   Absatzstils selbst** formatiert, inkl. `fo:background-color`. Das wird komplett
   ignoriert. Empirisch verifiziert an `lostBackground.odt`: Diese Datei enthält
   genau einen solchen Fall (Stil `a710e24`, `fo:background-color="#ffff00"` +
   fett/kursiv/unterstrichen), der aber auf einem **leeren** `<text:p
   text:style-name="a710e24"/>` liegt — für diese konkrete Datei geht dadurch
   nichts Sichtbares verloren (die 4 tatsächlich referenzierten,
   Span-gebundenen Hervorhebungen der Datei werden alle korrekt gelesen, siehe
   Abschnitt 1). Der Name „lostBackground.odt" ist für **dieses** Feature also
   **irreführend** — die architektonische Lücke ist aber real und muss mit einer
   eigens angelegten Testdatei mit sichtbarem Text abgedeckt werden (keine der 57
   vorhandenen ODT-Fixtures übt diesen Pfad mit sichtbarem Text aus).

Zusätzlich eine latente, aber unter der aktuellen Codebasis nicht auslösbare
Robustheitslücke: Die Deduplizierung in `TextStyleRegistry.styleNameFor`
(`odt/styleRegistry.ts:30`) und die Run-Verschmelzung in `inlineToRuns`
(`docx/writer.ts:52`) basieren auf `JSON.stringify` eines Objekts bzw. Arrays, dessen
Schlüssel-/Elementreihenfolge im Prinzip von der Mark-Anwendungsreihenfolge abhängen
könnte. Empirisch verifiziert (siehe Abschnitt 2.4): ProseMirms
`addMark`/`Node.fromJSON` kanonisiert Mark-Reihenfolge immer nach Schema-Rang,
unabhängig von Anwendungs- oder JSON-Eingabereihenfolge — daher aktuell **kein**
aktiver Bug in irgendeinem tatsächlich durchlaufenen Codepfad, aber implizit und
ungeschützt gegen zukünftige Änderungen. Empfehlung: hart kodieren statt sich auf
dieses Zufallsverhalten zu verlassen (Abschnitt 4.9/4.11).

---

## 1. Verifikation der Ist-Stand-Tabelle aus `textmarker-farbe-req.md`

| Fundstelle laut Anforderung | Ergebnis der Prüfung |
|---|---|
| `schema.ts:141-147` Mark `highlight` | **Bestätigt**, Zeilen exakt. `validate: 'string'`, keine Formatprüfung, `parseDOM` auf `background-color`. |
| `Toolbar.tsx:162-170` Farbwähler `🖍` | Bestätigt, Zeilen exakt (Label 162, Span 163, Input 164-169, schließendes Label 170). Kein `value`-Attribut, bestätigt. |
| `Toolbar.tsx:171-181` „Entfernen"-Button `⌫` | Bestätigt, Zeilen exakt. |
| `commands.ts:88-106` `ColorMarkName`/`applyMarkColor`/`clearMarkColor` | Bestätigt, Zeilen exakt. Beide brechen bei `state.selection.empty` mit `return false` ab (Zeilen 93, 102), kein `storedMarks`-Pfad vorhanden — korrekt zitiert. |
| `WordEditor.tsx:71-80` Keymap ohne Hervorhebungs-Shortcut | Bestätigt. Keymap-Objekt (Zeilen 72-79) enthält `Mod-z/y/Shift-z`, `Enter`, `Mod-b/i/u` — keine Farb-Bindung. |
| `docx/reader.ts:99-114` `marksFromRunProperties` | Bestätigt, Zeilen exakt. `<w:shd>` (Zeile 110-112) wird gelesen, `<w:highlight>` **an keiner Stelle in der gesamten Datei** referenziert (verifiziert per Volltextsuche). |
| `docx/writer.ts:18-31` `runPropertiesXml` | Bestätigt, Zeilen exakt. Nur `<w:shd>` wird erzeugt (Zeile 26-28), niemals `<w:highlight>`. |
| `odt/reader.ts:47-61,92` | Bestätigt, alle Zeilen exakt. `family === 'text'` Zweig liest `fo:background-color` (Zeile 59-60); `family === 'paragraph'`-Zweig (Zeile 62-66) liest **nur** `fo:text-align`, nichts aus `style:text-properties` — bestätigt als Fehler 3/Lücke, siehe Abschnitt 2.3. |
| `odt/writer.ts:25-36` `runPropsFromMarks` | Bestätigt, Zeilen exakt. |
| `odt/styleRegistry.ts:9,13,57` | Bestätigt, alle drei Zeilen exakt (`highlight?: string`, `!props.highlight`, `fo:background-color`-Attribut-Erzeugung). |
| `tests/fixtures/external/odt/…` (7 genannte Dateien) | Alle 7 Dateien existieren tatsächlich im Repo (per `ls` verifiziert): `coloredParagraph.odt`, `character-styles.odt`, `lostBackground.odt`, `TableFunkyBackground.odt`, `text-color-from-paragraph.odt`, `sameLocationSpansUsingMultipleTemplateStyles_BOLD-Outer-ITALIC-Inner-Text-Yellow.odt` sowie zusätzlich (nicht in der Anforderung erwähnt, aber vorhanden) `coloredTable_MSO15.odt`. |
| `tests/fixtures/external/docx/` „kein Fixture-Name deutet spezifisch hin" | Bestätigt (kein Dateiname enthält „highlight"/„shd"/„color"), **aber** Inhaltsprüfung (JSZip, `word/document.xml` nach `w:highlight` durchsucht) findet **2 von 127** Dateien mit echtem `<w:highlight>`: `bug57031.docx` (`w:val="lightGray"`) und `bug65649.docx`; 6 Dateien enthalten `<w:shd>`. Damit ist Grenzfall 3.7 nicht nur theoretisch, sondern mit vorhandenen Testdaten **sofort reproduzierbar**. |
| `src/formats/docx/__tests__/roundtrip.test.ts:94-109` / `odt/__tests__/roundtrip.test.ts:94-109` | Bestätigt, exakt die beschriebenen Tests, arbeiten mit direkt konstruiertem JSON, keine Editor-/Toolbar-Bedienung. |
| `tests/e2e/*.spec.ts` erwähnt Hervorhebung nirgends | Bestätigt per Volltextsuche (`grep -n "Hervorhebung\|highlight\|Textfarbe" tests/e2e` → keine Treffer). |

**Fazit Abschnitt 1:** Keine Korrektur der Ist-Stand-Tabelle nötig — sie kann
unverändert als Grundlage für die Umsetzung dienen.

---

## 2. Neu gefundene Fehler und Lücken (nicht bereits in der Anforderung benannt)

### 2.1 Fehler 1 (kritisch): Fehlendes XML-Escaping für Farbwerte im DOCX-Export

**Datei:** `src/formats/docx/writer.ts`, Funktion `runPropertiesXml` (Zeilen 18-31).

```ts
if (mark.type === 'textColor') props.push(`<w:color w:val="${String(mark.attrs?.color ?? '').replace('#', '')}"/>`)
if (mark.type === 'highlight') {
  props.push(`<w:shd w:val="clear" w:color="auto" w:fill="${String(mark.attrs?.color ?? '').replace('#', '')}"/>`)
}
```

Der Farbwert wird **ungeprüft und unescaped** in ein XML-Attribut interpoliert.
`escapeXml` ist in derselben Datei bereits importiert und wird für Lauftext
(`encodeRunText`), `alt`-Texte und `dc:title` korrekt verwendet — hier fehlt es
schlicht. Zum Vergleich: `odt/styleRegistry.ts:56-57` escaped `props.color`/
`props.highlight` bereits korrekt (`escapeXml(props.color)`), was die Asymmetrie
als Versehen bestätigt.

**Risiko:** Da `schema.ts:143` (`highlight`) und `:136` (`textColor`) jeden String
unvalidiert übernehmen (`validate: 'string'`, kein Regex), kann ein per
Fremd-HTML eingefügter `background-color`-Wert mit `"`, `<` oder `&` (z. B. ein
CSS-Kommentar-Artefakt, eine kaputte `rgba(...)`-Zeichenkette oder — im Extremfall —
absichtlich präparierter Inhalt) das erzeugte `word/document.xml` **strukturell
zerstören** (nicht nur ein ungültiges Attribut, sondern nicht mehr parsebares XML,
also eine komplett unbrauchbare/korrupte exportierte Datei). Das ist eine
Verschärfung von Grenzfall 3.9, die dort nicht als Möglichkeit genannt wurde.

**Fix:** `escapeXml(...)` um beide `mark.attrs?.color`-Verwendungen ergänzen (siehe
Abschnitt 4.7). Wird durch die Normalisierung aus Abschnitt 4.2/4.7 mittelfristig
entschärft (kanonisches Hex kann keine XML-Metazeichen enthalten), soll aber
**zusätzlich** unabhängig davon gefixt werden (Verteidigung in der Tiefe, analog zum
bereits korrekten ODT-Pfad).

### 2.2 Fehler 2 (hoch): Event-Granularität des Farbwählers — Reacts `onChange` ist an das native `input`-Ereignis gebunden

**Datei:** `Toolbar.tsx:148,168` (`onChange={(e) => run(view, applyMarkColor(...))}`).

React normalisiert `onChange` auf allen Text-artigen `<input>`-Typen historisch auf
das native `input`-Ereignis, nicht auf `change` (dokumentiertes React-Verhalten,
ursprünglich eingeführt, damit kontrollierte Eingaben bei jedem Tastendruck
reagieren). Für `<input type="color">` bedeutet das konkret: In Chromium-basierten
Browsern feuert das native Element **während** der Interaktion mit dem eingebetteten
Farbrad/-schieberegler kontinuierlich `input`-Ereignisse (ein Ereignis pro
Zwischenwert), zusätzlich zu einem abschließenden `change`, wenn der Dialog
geschlossen wird. Jedes dieser `input`-Ereignisse läuft hier direkt in
`run(view, applyMarkColor(...))` → **eine eigene ProseMirror-Transaktion pro
Zwischenwert**, nicht nur eine pro tatsächlich abgeschlossener Farbwahl.

Das bestätigt technisch präzise die in Abschnitt 2.8 / Grenzfall 11 der Anforderung
geäußerte Vermutung und liefert die genaue Ursache (Reacts `input`-basiertes
`onChange`, nicht Browser-Bug). Firefox' natives `<input type="color">` öffnet den
systemeigenen Dialog und feuert praxisnah nur je ein `input`- und `change`-Ereignis
beim Bestätigen — muss aber weiterhin browserübergreifend per E2E-Test verifiziert
werden (Abschnitt 6, Testfall 11).

**Fix:** Auf das native `change`-Ereignis umstellen statt Reacts `onChange`-Prop zu
verwenden (siehe Abschnitt 4.4 — `ref` + `addEventListener('change', …)`), damit
unabhängig vom Browser garantiert **ein** Undo-Schritt pro abgeschlossener Farbwahl
entsteht.

### 2.3 Lücke A (bestätigt, architektonisch): ODT-Reader ignoriert `style:text-properties` einer `paragraph`-Familie-Stildefinition

**Datei:** `src/formats/odt/reader.ts`, `parseAutomaticStyles` (Zeilen 36-77),
konkret der `family === 'paragraph'`-Zweig (Zeile 62-66):

```ts
} else if (family === 'paragraph') {
  const props = firstChildNS(styleEl, ODF_NAMESPACES.style, 'paragraph-properties')
  const align = props?.getAttributeNS(ODF_NAMESPACES.fo, 'text-align')
  if (align) paragraphAligns.set(name, align)
}
```

Nach ODF-Spezifikation kann ein `style:style style:family="paragraph"` **zusätzlich**
zu `style:paragraph-properties` ein Geschwister-Element `style:text-properties`
tragen, das die Standard-Zeichenformatierung für **direkten, nicht in
`<text:span>` gewickelten Text** dieses Absatzes definiert (z. B. wenn LibreOffice
für einen ganzen, einheitlich formatierten Absatz keinen zusätzlichen Span erzeugt,
sondern die Formatierung direkt am Absatzstil hinterlegt). Dieser Zweig liest
**ausschließlich** `paragraph-properties`/`text-align` — `style:text-properties`
desselben Stils (inkl. `fo:background-color`) wird nirgends ausgewertet, auch nicht
in `decodeInline` (Zeilen 79-120), das für unverpackten Text keine Marks aus dem
umschließenden Absatzstil herleitet.

**Empirischer Beleg:** In `tests/fixtures/external/odt/lostBackground.odt` existiert
exakt ein solcher Stil (`a710e24`, family `paragraph`):

```xml
<style:style style:family="paragraph" style:name="a710e24">
  <style:paragraph-properties fo:margin-left="15.01mm" .../>
  <style:text-properties fo:background-color="#ffff00" fo:font-style="italic"
    fo:font-weight="bold" style:text-underline-style="solid" .../>
</style:style>
```

verwendet auf `<text:p text:style-name="a710e24"/>` — **einem leeren Absatz** (per
Volltextsuche im Repo-Fixture verifiziert: `readOdt()` auf diese Datei angewendet
liefert exakt 4 `highlight`-Marks, alle an Span-gebundenem Text `„Dienstag"`,
`„Rot Und BOLD"`, `„Text"`, `„pfff"` mit den korrekten Hex-Werten `#FFFF00`,
`#FF0000`, `#FFC000`, `#FFC000` — keiner geht verloren). Die 8 weiteren, im
Automatikstil-Katalog dieser Datei definierten, aber **nirgends referenzierten**
`background-color`-Stile (`a034af9`, `a98b93d`, `aa4fd77`, `ab4de33`, `af2cfa1`,
`a988296`, `a3fafc1`, `a00be58`) sind verwaiste Style-Leichen (typisches
LibreOffice-Editier-Artefakt), keine Datenverlustquelle.

**Konsequenz:** Der Dateiname „lostBackground.odt" ist für **dieses** Feature
**irreführend** — für die Hervorhebungsfarbe im engeren Sinn zeigt diese konkrete
Datei **keinen** Verlust. Die architektonische Lücke (Absatzstil-getragene
`style:text-properties` werden nie gelesen) ist trotzdem real, unabhängig
bestätigt und muss geschlossen werden — sie kann bei einer anderen, nicht im Repo
vorhandenen Datei mit **nicht-leerem** Absatztext in genau diesem Muster
tatsächlich zu unsichtbarem Formatierungsverlust führen. Da keine der 57
vorhandenen ODT-Fixtures diesen Pfad mit sichtbarem Text auslöst, muss eine neue,
synthetische Testdatei angelegt werden (siehe Abschnitt 6.4).

### 2.4 Lücke B (latent, aktuell nicht auslösbar): Reihenfolge-Abhängigkeit der Dedup-/Merge-Schlüssel

**Dateien:** `odt/styleRegistry.ts:30` (`const key = JSON.stringify(props)`),
`docx/writer.ts:52` (`JSON.stringify(buffer.marks) === JSON.stringify(node.marks)`).

`runPropsFromMarks` (`odt/writer.ts:25-36`) baut das `RunProps`-Objekt, indem es das
`marks`-Array durchläuft und je nach Mark-**Reihenfolge im Array** Objektschlüssel
in genau dieser Reihenfolge einfügt (`props.color = …` vs. `props.highlight = …`,
je nachdem, welcher Mark-Typ zuerst im Array steht). `JSON.stringify` liefert für
JS-Objekte die Schlüssel in **Einfügereihenfolge** — zwei inhaltlich identische
Mark-Kombinationen mit unterschiedlicher Array-Reihenfolge (`[highlight, textColor]`
vs. `[textColor, highlight]`) würden also **unterschiedliche** `JSON.stringify`-
Strings und damit unterschiedliche Dedup-Schlüssel in `TextStyleRegistry` erzeugen
→ zwei redundante Stildefinitionen (`T1`, `T2`) statt einer, was Anforderung 4.2.3
("gemeinsame Stildefinition, nicht zwei redundante") verletzen würde. Analog würde
`docx/writer.ts`'s `inlineToRuns`-Lauf-Verschmelzung unnötig in zwei benachbarte,
inhaltlich identische `<w:r>` aufsplitten, statt sie zu einem Lauf zu
verschmelzen (hier nur kosmetisch/ineffizient, kein Datenverlust).

**Verifiziert per Test (siehe unten), dass dies aktuell in keinem tatsächlichen
Codepfad auftritt:**

```ts
// Test A: zwei verschiedene Anwendungsreihenfolgen über echte tr.addMark-Aufrufe
// Test B: Node.fromJSON mit Mark-Array in umgekehrter Reihenfolge
// → in beiden Fällen identisches Ergebnis: ['textColor', 'highlight'], nie umgekehrt
```

ProseMirror kanonisiert Mark-Reihenfolge intern immer nach dem **Rang der Mark-
Registrierung im Schema** (`schema.ts`: `strong, em, underline, strike, textColor,
highlight`), unabhängig davon, in welcher Reihenfolge Marks angewendet wurden oder
in welcher Reihenfolge ein `marks`-Array in `Node.fromJSON` übergeben wird. Sowohl
die editorgetriebene Bearbeitung (`state.tr.addMark`) als auch `wordSchema.nodeFromJSON`
(verwendet beim Mounten des Editors in `WordEditor.tsx:65`) durchlaufen diesen
Kanonisierungspfad. Auch die beiden Reader (`docx/reader.ts:102-112`,
`odt/reader.ts:87-92`) fügen Marks bereits in exakt dieser Reihenfolge ein.

**Ergebnis:** Kein aktiver Bug in einem heute durchlaufenen Pfad — aber die
Korrektheit hängt von einem **impliziten, nirgends dokumentierten oder erzwungenen
Zufallsverhalten** ab (ProseMirror-Kanonisierung + zufällig identische Reader-
Reihenfolge). Empfehlung: trotzdem hart absichern (Abschnitt 4.9/4.11), da sonst ein
zukünftiger, unabhängiger Codepfad (z. B. Paste-Normalisierung, ein neues Feature,
ein Refactoring der Reader-Reihenfolge) dies unbemerkt brechen könnte, ohne dass ein
Test es auffinge, solange der Dedup-Schlüssel selbst nicht reihenfolgeunabhängig
gemacht wird.

---

## 3. Bewertung der in der Anforderung offen gelassenen Fragen

### 3.1 Bedienelement 3 (Tastenkombination) — Empfehlung: bewusste Lücke, dokumentiert

Eine freie Farbwahl kann grundsätzlich nicht durch eine einzelne Tastenkombination
ausgelöst werden (es gibt keine Farbe, die eine Taste „meint" — anders als
Fett/Kursiv, die binäre Zustände umschalten). Empfehlung: **kein** Shortcut für das
Anwenden. Für „Entfernen" wäre technisch ein Shortcut möglich (analog zu
Fett/Kursiv-Toggle), wird aber **nicht** ergänzt, um den Umfang dieser Anforderung
nicht zu erweitern (Backlog fordert nur „freie Farbwahl", kein Tastaturkürzel) — der
„Entfernen"-Button bleibt der einzige Weg. Diese Entscheidung ist hiermit explizit
als bewusste, dokumentierte Lücke festgehalten (erfüllt DoD-Punkt 5 sinngemäß für
diesen Teilaspekt).

### 3.2 Grenzfall 3.1 / Abschnitt 2.2 (leere Selektion) — Empfehlung: Commands unverändert, UI behoben

Die Command-Ebene (`applyMarkColor`/`clearMarkColor` geben bei leerer Selektion
`false` zurück) bleibt **unverändert** — das ist die in Abschnitt 2.2 der
Anforderung bereits als vermutlich beabsichtigt eingestufte „keine Schreibmarken-
Hervorhebung"-Entscheidung, hiermit bestätigt und für diese Anforderung final
festgeschrieben (kein Caret-Mode für Hervorhebungsfarbe, im Gegensatz zu
Fett/Kursiv). Der Verstoß gegen „kein stiller Fehlschlag" wird **nicht** durch eine
Verhaltensänderung der Commands behoben, sondern durch **sichtbares UI-Feedback**
(deaktivierte Steuerelemente mit erklärendem `title`, siehe Abschnitt 4.4) — das
löst DoD-Punkt 6, ohne die in 2.2 bestätigte fachliche Entscheidung zu verwerfen.

### 3.3 Grenzfall 3.8 (`w:shd` statt `w:highlight`) — Empfehlung: bewusster Kompromiss, mit optionaler Verbesserung

Minimalumfang: **`<w:shd>` bleibt der primäre Exportweg**, ausdrücklich als bewusster
Kompromiss dokumentiert (freie Farbwahl ⇒ `<w:highlight>`s ~17-Werte-Palette ist
strukturell unzureichend). Konsequenz für Interoperabilität: In echtem Word wird
„Text hervorheben" (das Werkzeug, nicht die Optik) für aus dieser App exportierten
Text **nicht** als aktiv angezeigt — muss mit echtem Word verifiziert und in
`textmarker-farbe-req.md` nachgetragen werden (nicht Teil dieses Codeplans).
Empfehlung (optional, siehe Abschnitt 4.7): zusätzlich `<w:highlight w:val="…">`
schreiben, wenn die gewählte Farbe exakt einem der Palettenwerte entspricht — rein
additiv, ändert nichts an der `<w:shd>`-Erzeugung, verbessert nur die Trefferquote
für die verbreitetsten 17 Fälle.

### 3.4 Abschnitt 2.3 / Bedienelement 1 und 5 (Zustandsanzeige) — Empfehlung: nachrüsten

Wird umgesetzt (nicht als „bewusst nicht vorhanden" dokumentiert), siehe Abschnitt
4.3/4.4 — Farbwähler zeigt die tatsächliche Farbe der Selektion, unterscheidet
„keine Hervorhebung", „einheitliche Farbe X" und „gemischt".

---

## 4. Dateigenauer Umsetzungsplan

### 4.1 `src/formats/shared/color.ts` (neu)

Gemeinsame Farb-Normalisierung, wiederverwendbar für die separate
Schriftfarbe-Anforderung (wird dort **nicht** verdrahtet, siehe Geltungsbereich),
hier verdrahtet ausschließlich für `highlight`:

```ts
/**
 * Resolves any CSS color syntax (hex, named color, rgb()/rgba(), hsl()/hsla())
 * to a canonical lowercase `#rrggbb` string by letting the browser/DOM parse it
 * — no bundled color-name table, no new dependency. Works in jsdom too (jsdom's
 * CSSOM implements color parsing/serialization sufficiently for this).
 * Returns null for fully-transparent colors (alpha === 0, e.g. `transparent`)
 * and for values the engine can't parse at all — both cases mean "no highlight
 * mark should be created", not "black".
 */
export function normalizeCssColor(input: string): string | null {
  const probe = document.createElement('div')
  probe.style.color = ''
  probe.style.color = input
  if (!probe.style.color) return null // engine rejected the value outright
  document.body.appendChild(probe)
  const resolved = getComputedStyle(probe).color // always "rgb(r,g,b)" or "rgba(r,g,b,a)"
  document.body.removeChild(probe)
  const m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/.exec(resolved)
  if (!m) return null
  const alpha = m[4] === undefined ? 1 : Number(m[4])
  if (alpha === 0) return null
  const [r, g, b] = [m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, '0'))
  return `#${r}${g}${b}`
}

export const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i
```

### 4.2 `src/formats/shared/schema.ts` (geändert)

`highlight`-Mark, `parseDOM` (Zeile 143), Normalisierung beim Einfügen aus
Fremd-HTML (Grenzfall 3.9, 2.7):

```ts
parseDOM: [
  {
    style: 'background-color',
    getAttrs: (value) => {
      const color = normalizeCssColor(value as string)
      return color ? { color } : false // `false` verwirft die Regel komplett -> kein Mark
    },
  },
],
```

`textColor` bleibt **unverändert** (außerhalb des Geltungsbereichs dieser
Anforderung — separates Dokument für „Schriftfarbe"), obwohl `normalizeCssColor`
dafür bereits einsatzbereit ist.

### 4.3 `src/formats/shared/editor/commands.ts` (geändert)

Neue Hilfsfunktion für die Zustandsanzeige (Abschnitt 3.4):

```ts
export type ColorMarkState = { kind: 'none' } | { kind: 'mixed' } | { kind: 'set'; color: string }

/**
 * Determines what the toolbar's color control should show: no mark anywhere in
 * the selection ('none'), a single uniform color across the whole selection/at
 * the caret ('set'), or more than one distinct color and/or a mix of colored
 * and uncolored text ('mixed'). Mirrors the $from-based convention used
 * elsewhere in this file for empty selections; for non-empty selections every
 * text node in range is inspected (not just $from), matching the definedness
 * requirement in Anforderung 2.3/Grenzfall 3.2 (a selection that's "half
 * highlighted, half not" must read as mixed, not as whichever the boundary
 * happens to be).
 */
export function colorMarkStateFor(state: EditorState, markName: ColorMarkName): ColorMarkState {
  const markType = wordSchema.marks[markName]
  const { from, to, empty, $from } = state.selection
  if (empty) {
    const mark = markType.isInSet($from.marks())
    return mark ? { kind: 'set', color: mark.attrs.color } : { kind: 'none' }
  }
  let color: string | null | undefined
  let mixed = false
  state.doc.nodesBetween(from, to, (node) => {
    if (!node.isText) return
    const mark = markType.isInSet(node.marks)
    const value = mark ? mark.attrs.color : null
    if (color === undefined) color = value
    else if (color !== value) mixed = true
  })
  if (mixed) return { kind: 'mixed' }
  return color ? { kind: 'set', color } : { kind: 'none' }
}
```

`applyMarkColor`/`clearMarkColor` (Zeilen 90-106): **keine Verhaltensänderung**
(siehe Abschnitt 3.2) — bleiben No-Op bei leerer Selektion, das UI-Feedback kommt
ausschließlich aus der Toolbar.

### 4.4 `src/formats/shared/editor/Toolbar.tsx` (geändert)

Die vier fast identischen Blöcke für Textfarbe (Zeilen 142-160) und
Hervorhebungsfarbe (Zeilen 162-181) werden durch eine gemeinsame Komponente
ersetzt (behebt die Code-Duplikation als Nebeneffekt, siehe Abschnitt 0 —
Verhaltensänderungen gelten für **beide** Farb-Controls, weil sie exakt denselben
JSX-Block teilen; das ist nicht vermeidbar, ohne die Duplikation aufrechtzuerhalten):

```tsx
function ColorMarkControl({ view, mark, label, applyTitle, removeTitle }: {
  view: EditorView
  mark: ColorMarkName
  label: string
  applyTitle: string
  removeTitle: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const state = colorMarkStateFor(view.state, mark)
  const { empty } = view.state.selection

  useEffect(() => {
    const input = inputRef.current
    if (!input) return
    // Native `change` fires once per completed pick, regardless of how many
    // `input` events the OS color panel emits while dragging — see
    // textmarker-farbe-code.md §2.2 for why React's onChange (bound to the
    // native `input` event) is unsuitable here.
    const onChange = (e: Event) => {
      run(view, applyMarkColor(mark, (e.target as HTMLInputElement).value))
    }
    input.addEventListener('change', onChange)
    return () => input.removeEventListener('change', onChange)
  }, [view, mark])

  const swatchColor = state.kind === 'set' ? state.color : undefined
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
          key={swatchColor ?? 'unset'} // resync the uncontrolled DOM value when selection/state changes
          className="w-6 h-6 p-0 border-0 bg-transparent disabled:opacity-40"
        />
      </label>
      <button
        type="button"
        title={empty ? `${removeTitle}: bitte zuerst Text markieren` : removeTitle}
        aria-label={removeTitle}
        disabled={empty}
        onMouseDown={(e) => {
          e.preventDefault()
          run(view, clearMarkColor(mark))
        }}
        className="px-1.5 py-1 text-xs rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 disabled:opacity-40 disabled:hover:bg-transparent"
      >
        <EraserIcon />
      </button>
    </>
  )
}
```

Aufrufstellen (ersetzen Zeilen 142-181):

```tsx
<ColorMarkControl view={view} mark="textColor" label="A" applyTitle="Textfarbe" removeTitle="Textfarbe entfernen" />
<ColorMarkControl view={view} mark="highlight" label={<HighlighterIcon />} applyTitle="Hervorhebungsfarbe" removeTitle="Hervorhebung entfernen" />
```

Neue SVG-Icon-Komponenten (ersetzen `🖍`/`⌫`, behebt Bedienelement 4 / DoD-Punkt 8,
gleiches Muster wie `BoldIcon` aus `fett-code.md` §4.2 — Material-Icons-Glyphen
„border_color" bzw. „backspace", Apache-2.0):

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

`label`-Prop von `ColorMarkControl` wird auf `React.ReactNode` typisiert, damit
sowohl der Textfarbe-Buchstabe `A` (unverändert) als auch das neue
`<HighlighterIcon />` durchgereicht werden können.

**Wichtiger Hinweis zum `defaultValue`/`key`-Muster:** `<input type="color">` bleibt
bewusst unkontrolliert (kein React-`value`), weil ein natives Farbrad während der
Live-Vorschau (kontinuierliche `input`-Events) nicht durch ein von außen
zurückgesetztes `value` unterbrochen werden darf. Der `key`-Wechsel bei jedem
Selektions-/Zustandswechsel erzwingt stattdessen eine komplette Neuerstellung des
DOM-Knotens mit dem korrekten `defaultValue`, sooft sich `colorMarkStateFor`
ändert (z. B. Cursor bewegt sich in einen anders/nicht hervorgehobenen Bereich) —
das ist der Mechanismus, der Bedienelement 1 der Anforderung tatsächlich behebt.

### 4.5 `src/formats/shared/editor/WordEditor.tsx` (keine Änderung)

Siehe Abschnitt 3.1 — kein Shortcut ergänzt, bewusste Lücke.

### 4.6 `src/formats/docx/highlightPalette.ts` (neu)

ECMA-376 `ST_HighlightColor`-Enumeration (`§17.3.2.15` `w:highlight`), Werte
entsprechen den in Word/python-docx (`WD_COLOR_INDEX`) verwendeten festen RGB-
Werten. Quelle für die Zuordnung: OOXML-Spezifikation + die weithin dokumentierte
`WD_COLOR_INDEX`-Farbtabelle (identische zugrunde liegende Palette):

```ts
export const WORD_HIGHLIGHT_TO_HEX: Record<string, string> = {
  black: '#000000',
  blue: '#0000ff',
  cyan: '#00ffff',
  darkBlue: '#00008b',
  darkCyan: '#008080',
  darkGray: '#808080',
  darkGreen: '#008000',
  darkMagenta: '#800080',
  darkRed: '#8b0000',
  darkYellow: '#808000',
  green: '#00ff00',
  lightGray: '#c0c0c0',
  magenta: '#ff00ff',
  red: '#ff0000',
  white: '#ffffff',
  yellow: '#ffff00',
  // 'none' ist bewusst NICHT enthalten -> bedeutet "keine Hervorhebung", kein Mark.
}

export function hexFromWordHighlightName(val: string | null): string | null {
  if (!val || val === 'none') return null
  return WORD_HIGHLIGHT_TO_HEX[val] ?? null
}

/** Best-effort Rückrichtung für den optionalen Export-Kompromiss (Abschnitt 4.7). */
export function wordHighlightNameFromHex(hex: string): string | null {
  const normalized = hex.toLowerCase()
  const entry = Object.entries(WORD_HIGHLIGHT_TO_HEX).find(([, v]) => v === normalized)
  return entry ? entry[0] : null
}
```

Belegt durch `bug57031.docx` (`w:val="lightGray"` → `#c0c0c0`), reale Fixture im
Repo, siehe Abschnitt 1.

### 4.7 `src/formats/docx/reader.ts` (geändert)

`marksFromRunProperties` (Zeilen 99-114) erweitert um `<w:highlight>`, mit
`<w:shd>` als Vorrang (bleibt kompatibel mit allen von dieser App selbst
erzeugten Dateien, die ausschließlich `<w:shd>` schreiben):

```ts
const shd = firstChildNS(rPr, OOXML_NAMESPACES.w, 'shd')
const fill = shd?.getAttributeNS(OOXML_NAMESPACES.w, 'fill')
const highlightEl = firstChildNS(rPr, OOXML_NAMESPACES.w, 'highlight')
const highlightVal = highlightEl?.getAttributeNS(OOXML_NAMESPACES.w, 'val') ?? null

if (fill && fill !== 'auto' && HEX_COLOR_RE.test(fill)) {
  marks.push({ type: 'highlight', attrs: { color: `#${fill}` } })
} else {
  const hex = hexFromWordHighlightName(highlightVal)
  if (hex) marks.push({ type: 'highlight', attrs: { color: hex } })
}
```

`HEX_COLOR_RE`-Prüfung ist eine neue, defensive Härtung (aktuell würde ein
fremdes, nicht-hexadezimales `w:fill` — theoretisch denkbar bei handeditierten/
kaputten Fremddateien — unverändert in `#${fill}` landen und später ungeprüft in
den Editor gelangen; mit dieser Prüfung wird ein solcher Wert stattdessen
ignoriert statt Garbage weiterzureichen).

### 4.8 `src/formats/docx/writer.ts` (geändert)

**Fix für Fehler 1** (XML-Escaping), `runPropertiesXml` (Zeilen 18-31):

```ts
if (mark.type === 'textColor') props.push(`<w:color w:val="${escapeXml(normalizedHex(mark.attrs?.color))}"/>`)
if (mark.type === 'highlight') {
  props.push(`<w:shd w:val="clear" w:color="auto" w:fill="${escapeXml(normalizedHex(mark.attrs?.color))}"/>`)
}
```

wobei `normalizedHex` die in Grenzfall 3.9 geforderte Validierung/Normalisierung
übernimmt (neue lokale Hilfsfunktion, nutzt `HEX_COLOR_RE` aus `shared/color.ts`):

```ts
function normalizedHex(color: unknown): string {
  const raw = String(color ?? '').replace('#', '')
  if (HEX_COLOR_RE.test(`#${raw}`)) return raw
  throw new Error(
    `Ungültiger Farbwert "${color}" kann nicht als OOXML-Farbe exportiert werden (erwartet #RRGGBB). ` +
      'Dies deutet auf einen nicht normalisierten Fremdfarbwert hin, der die schema.ts-Normalisierung ' +
      '(siehe textmarker-farbe-code.md §4.2) umgangen hat.',
  )
}
```

**Design-Entscheidung:** Bewusst ein **Fehler statt stiller Drop** — da die
Normalisierung in `schema.ts` (Abschnitt 4.2) bereits alle Werte beim Einfügen
kanonisiert, sollte dieser Pfad im Normalfall nie greifen; erreicht er ihn
trotzdem (z. B. über direkt konstruiertes `ProseMirrorJSON`, das die
Schema-`parseDOM`-Stufe umgeht — beide Reader tun das bereits, liefern aber immer
gültiges Hex), ist ein klarer Abbruch beim Export einem still korrupten/ungültigen
Dokument vorzuziehen (Grenzfall 3.9, DoD-Punkt 7).

**Optional (Empfehlung, nicht Mindestumfang, siehe Abschnitt 3.3):** zusätzlich
`<w:highlight w:val="…">` schreiben, wenn `wordHighlightNameFromHex(color)` einen
Treffer liefert:

```ts
const paletteName = wordHighlightNameFromHex(hex)
if (paletteName) props.push(`<w:highlight w:val="${paletteName}"/>`)
```

**Härtung für Lücke B** (Abschnitt 2.4), `inlineToRuns` (Zeile 39-65): Vergleichs-
schlüssel für die Lauf-Verschmelzung reihenfolgeunabhängig machen:

```ts
function marksKey(marks: JsonNode['marks']): string {
  return (marks ?? [])
    .map((m) => `${m.type}:${JSON.stringify(m.attrs ?? {})}`)
    .sort()
    .join('|')
}
// ersetzt beide JSON.stringify(...)-Vergleiche in flush()/der Schleife
```

### 4.9 `src/formats/odt/reader.ts` (geändert)

**Fix für Lücke A** (Abschnitt 2.3): `ParsedStyles` um
`paragraphRunStyles: Map<string, RunStyle>` erweitern; `parseAutomaticStyles`
(Zeilen 36-77), `family === 'paragraph'`-Zweig (Zeile 62-66):

```ts
} else if (family === 'paragraph') {
  const pProps = firstChildNS(styleEl, ODF_NAMESPACES.style, 'paragraph-properties')
  const align = pProps?.getAttributeNS(ODF_NAMESPACES.fo, 'text-align')
  if (align) paragraphAligns.set(name, align)

  const tProps = firstChildNS(styleEl, ODF_NAMESPACES.style, 'text-properties')
  if (tProps) {
    const style: RunStyle = {}
    if (tProps.getAttributeNS(ODF_NAMESPACES.fo, 'font-weight') === 'bold') style.bold = true
    if (tProps.getAttributeNS(ODF_NAMESPACES.fo, 'font-style') === 'italic') style.italic = true
    const underline = tProps.getAttributeNS(ODF_NAMESPACES.style, 'text-underline-style')
    if (underline && underline !== 'none') style.underline = true
    const strike = tProps.getAttributeNS(ODF_NAMESPACES.style, 'text-line-through-style')
    if (strike && strike !== 'none') style.strike = true
    const color = tProps.getAttributeNS(ODF_NAMESPACES.fo, 'color')
    if (color) style.color = color
    const bg = tProps.getAttributeNS(ODF_NAMESPACES.fo, 'background-color')
    if (bg) style.highlight = bg
    if (Object.keys(style).length) paragraphRunStyles.set(name, style)
  }
}
```

`decodeInline` (Zeilen 79-120) muss den Aufrufkontext kennen, welcher Absatzstil
gilt, um ihn als Basis-Marks für direkten (nicht span-verpackten) Text zu
verwenden. `paragraphToBlocks` (Zeile 123 ff.) übergibt bereits `styleName` — dieser
wird zusätzlich an `decodeInline` durchgereicht:

```ts
function decodeInline(pEl: Element, styles: ParsedStyles, paragraphStyleName: string | null): JsonNode[] {
  const baseMarks = paragraphStyleName
    ? marksFor(paragraphStyleName, styles.paragraphRunStyles) // neue Variante von marksFor, die paragraphRunStyles statt textStyles liest
    : []
  // ...
  for (const child of Array.from(pEl.childNodes)) walk(child, baseMarks) // statt walk(child, [])
}
```

Aufrufstellen `paragraphToBlocks` (Zeile 129) und `elementToBlocks`'s
`heading`-Zweig (Zeile 174) entsprechend um das dritte Argument ergänzt (Absatz-
bzw. Überschriftsstilname liegt an beiden Stellen bereits als lokale Variable vor).

Zusätzliche defensive Härtung (analog zu 4.7): `bg`/`color`-Werte gegen
`HEX_COLOR_RE` (bzw. eine ODF-spezifisch etwas laxere Prüfung, da ODF laut Schema
`#RRGGBB` ohnehin erzwingt) validieren, bevor ein Mark erzeugt wird — schützt vor
handeditierten/nicht-schemakonformen Fremddateien.

### 4.10 `src/formats/odt/writer.ts` (geändert)

Keine funktionale Änderung nötig für Escaping (bereits korrekt) — lediglich
dieselbe defensive Validierung wie im DOCX-Writer (Abschnitt 4.8) übernehmen,
bevor `props.highlight`/`props.color` an `buildTextStyleXml` weitergereicht werden,
für den gleichen "fail loud statt still" Grundsatz:

```ts
function runPropsFromMarks(marks: JsonNode['marks']): RunProps {
  const props: RunProps = {}
  for (const mark of marks ?? []) {
    // ... unverändert für bold/italic/underline/strike ...
    if (mark.type === 'textColor') props.color = assertValidHex(mark.attrs?.color)
    if (mark.type === 'highlight') props.highlight = assertValidHex(mark.attrs?.color)
  }
  return props
}
```

### 4.11 `src/formats/odt/styleRegistry.ts` (geändert)

**Fix für Lücke B** (Abschnitt 2.4), `styleNameFor` (Zeile 28-39):

```ts
styleNameFor(props: RunProps): string | null {
  if (isEmpty(props)) return null
  const key = [
    props.bold ? 'b' : '',
    props.italic ? 'i' : '',
    props.underline ? 'u' : '',
    props.strike ? 's' : '',
    props.color ?? '',
    props.highlight ?? '',
  ].join('|') // reihenfolgeunabhängig, da RunProps feste benannte Felder sind, nicht mehr über JSON.stringify(Objekt) mit einfügereihenfolge-abhängigen Schlüsseln
  const existing = this.byKey.get(key)
  // ... Rest unverändert
}
```

---

## 5. Zusammenfassung der Design-Entscheidungen (zur Übernahme nach `textmarker-farbe-req.md`)

1. **Kein Tastaturkürzel** für Anwenden oder Entfernen der Hervorhebungsfarbe
   (Abschnitt 3.1) — bewusste, hier dokumentierte Lücke.
2. **Keine Schreibmarken-Hervorhebung** (Caret-Mode) — Command-Verhalten bleibt wie
   in 2.2 der Anforderung beschrieben; UI-Feedback bei leerer Selektion wird über
   deaktivierte Steuerelemente gelöst, nicht über eine Verhaltensänderung der
   Commands (Abschnitt 3.2).
3. **`<w:shd>` bleibt der primäre DOCX-Exportweg**, `<w:highlight>` wird beim
   Import zusätzlich gelesen (mit `<w:shd>`-Vorrang) und beim Export optional
   (Empfehlung, nicht Mindestumfang) redundant mitgeschrieben, wenn die Farbe exakt
   in die feste 16-Werte-Palette passt (Abschnitt 3.3/4.7).
4. **Zustandsanzeige wird nachgerüstet**, nicht als „bewusst fehlend" dokumentiert
   (Abschnitt 3.4/4.4).
5. **Farbnormalisierung** über eine neue, DOM-gestützte `normalizeCssColor`-Funktion
   (kein Bundled-Farbnamen-Katalog, keine neue Abhängigkeit) statt reiner
   Regex-Validierung — löst Grenzfall 3.9 vollständig (Named Colors, `rgba()`,
   3-stelliges Hex, `transparent` eingeschlossen), nicht nur teilweise.

---

## 6. Testplan (Zuordnung zu Abschnitt 5 der Anforderung)

### 6.1 Neue Datei: `tests/e2e/highlight.spec.ts` (neu)

Struktur analog zu `bold.spec.ts` aus `fett-code.md` §6.1, je Punkt aus
Anforderungs-Abschnitt 5:

1. Farbwähler bedienen: `locator.evaluate((el, hex) => { el.value = hex;
   el.dispatchEvent(new Event('change', { bubbles: true })) }, '#ffff00')` auf eine
   vorherige Textselektion → `background-color: rgb(255, 255, 0)` im DOM des
   markierten Bereichs (per `toHaveCSS`).
2. „Entfernen" klicken → `background-color` verschwindet, Text/andere Marks
   unverändert.
3. Beide Steuerelemente ohne vorherige Selektion → `expect(input).toBeDisabled()`,
   `expect(button).toBeDisabled()`, `title`-Attribut enthält Hinweistext (deckt
   Grenzfall 3.1 UND das Zustandsanzeige-Fix ab).
4. Gemischte Selektion (halb gelb, halb keine Hervorhebung) → Farbwähler-Swatch
   zeigt „gemischt"-Zustand (`aria-disabled`/`title` enthält „gemischt"), nach
   Anwenden einer neuen Farbe ist die **gesamte** Selektion einheitlich gefärbt.
5. Undo (`Strg+Z`) direkt nach einer per `change`-Event simulierten Farbwahl →
   genau **ein** Undo-Schritt entfernt die gesamte Hervorhebung (nicht nur einen
   Teil), Text bleibt; Redo stellt sie wieder her.
6. Hervorhebung+Fett+Schriftfarbe kombiniert auf denselben Textlauf, DOCX-Export
   → JSZip + DOMParser auf `word/document.xml`: ein `<w:r>` mit `<w:b/>`,
   `<w:color w:val="…"/>`, `<w:shd .../>` gemeinsam.
7. Gleicher kombinierter Test für ODT: ein `<text:span>`, eine Stildefinition mit
   allen drei Eigenschaften.
8. Vollständige Rundreise je Format über echten Upload (`setInputFiles`)/Download
   (`page.waitForEvent('download')`) — nicht nur interne Reader/Writer-Aufrufe
   (deckt Abschnitt 4.1/4.2 der Anforderung).
9. **Kritischer Importtest**: `bug57031.docx` aus dem bestehenden Fixture-Ordner
   hochladen (kein künstliches Beispiel nötig — real vorhanden!) →
   `#c0c0c0`-Hervorhebung („lightGray") an der erwarteten Textstelle im Editor
   sichtbar (`getComputedStyle`-Prüfung im Browser-Kontext), belegt Grenzfall
   3.7/4.1.5 abschließend.
10. Import der genannten ODT-Fixtures, insbesondere `lostBackground.odt` (Ergebnis:
    4 sichtbare, korrekt übernommene Hervorhebungen, siehe Abschnitt 2.3 —
    Testfall dokumentiert das **erwartete**, bereits korrekte Verhalten als
    Regression-Schutz) sowie `coloredParagraph.odt`, `character-styles.odt`,
    `TableFunkyBackground.odt`.
11. Einfügen von Fremd-HTML mit `background-color: yellow` bzw.
    `background-color: rgba(255,0,0,0.5)` per `page.evaluate` +
    `ClipboardEvent`/`execCommand('insertHTML')` → resultierender Mark-Farbwert ist
    kanonisches Hex (`#ffff00` bzw. `#ff0000` — Alpha wird auf deckend
    normalisiert, siehe `normalizeCssColor`), DOCX-Export danach enthält gültiges
    `w:fill="[0-9a-f]{6}"` (Regex-Prüfung auf das exportierte XML).
12. Cross-Format-Doppel-Rundreise DOCX→ODT→DOCX und ODT→DOCX→ODT (Abschnitt 4.3).
13. Sichtprüfung/Dokumentation Grenzfall 3.8 (`w:shd`-Kompromiss) — Testfall prüft,
    dass exportiertes `word/document.xml` **kein** `<w:highlight>` enthält, sofern
    die Optionalfunktion aus 4.7 nicht aktiviert wird, bzw. genau den erwarteten
    `w:val` enthält, falls doch.
14. Browserübergreifende Prüfung der Event-Granularität (Fehler 2/Abschnitt 2.2):
    mehrere `input`-Events gefolgt von einem `change` simulieren → genau **ein**
    `Strg+Z` entfernt die komplette Hervorhebung (nicht nur den zuletzt gefeuerten
    Zwischenwert), auf Chromium **und** Firefox-Projekt der Playwright-Config
    ausgeführt.

### 6.2 `src/formats/shared/__tests__/color.test.ts` (neu)

Unit-Tests für `normalizeCssColor`: 6-stelliges Hex (Groß-/Kleinschreibung),
3-stelliges Hex, benannte CSS-Farbe (`yellow`, `rebeccapurple`), `rgb()`, `rgba()`
mit Alpha 1/0.5/0, `hsl()`, `transparent` → `null`, Kauderwelsch (`"not-a-color"`)
→ `null`.

### 6.3 `src/formats/shared/editor/__tests__/commands.test.ts` (neu oder ergänzt)

Unit-Tests für `colorMarkStateFor`: leere Selektion mit/ohne Mark, vollständig
einheitliche Selektion, gemischte Selektion (teils Farbe A, teils keine, teils
Farbe B → `mixed`), Selektion über ein `image`-Knoten hinweg (Grenzfall 3.3 auf
Command-Ebene, darf nicht abstürzen).

### 6.4 `src/formats/odt/__tests__/roundtrip.test.ts` (ergänzt)

- Neuer Fall: synthetisches ODT mit einem `style:family="paragraph"`-Stil, der
  `style:text-properties fo:background-color="…"` trägt, referenziert von einem
  `<text:p>` mit **direktem, nicht span-verpacktem Text** (nicht nur leer wie in
  `lostBackground.odt`) → `highlight`-Mark wird gesetzt. Regressionstest für
  Lücke A (Abschnitt 2.3) — muss synthetisch gebaut werden (per `writeOdt`
  reicht nicht, da dessen Schreibpfad diesen ODF-Fall selbst nie erzeugt; das
  Test-Fixture muss `content.xml` direkt als String konstruieren, analog zum
  Muster in `tests/e2e/docx.spec.ts`s `buildSampleDocx`).
- Neuer Fall: zwei Textläufe mit identischer Mark-Kombination, aber Marks in
  **unterschiedlicher Array-Reihenfolge** konstruiert (`[highlight, textColor]`
  vs. `[textColor, highlight]`) → `TextStyleRegistry` erzeugt trotzdem nur
  **eine** Stildefinition. Regressionstest für Lücke B (Abschnitt 2.4).
- Neuer Fall: `highlight` mit `color: '#ffffff'` (Weiß) rundreist als explizit
  gesetzte Farbe, unterscheidbar von gar keinem `highlight`-Mark (Grenzfall 3.6).
- Ungültiger Farbwert (z. B. `'yellow'` statt `'#ffff00'`, simuliert einen Bug in
  vorgelagertem Code) an `writeOdt` übergeben → wirft strukturierten Fehler statt
  stillschweigend ungültiges `fo:background-color` zu schreiben (Abschnitt 4.10).

### 6.5 `src/formats/docx/__tests__/roundtrip.test.ts` (ergänzt)

- Neuer Fall: `<w:highlight w:val="lightGray"/>` (ohne `<w:shd>`) importieren →
  `highlight`-Mark mit `#c0c0c0`. Neuer Fall: **beide** `<w:highlight>` und
  `<w:shd>` auf demselben Run (unterschiedliche Werte) → `<w:shd>` gewinnt
  (Vorrangregel aus Abschnitt 4.7).
- Neuer Fall: Farbwert mit `"`/`&`/`<` (z. B. `'#ff0000"><evil/>'`, simuliert
  einen nicht normalisierten Fremdwert) an `writeDocx` übergeben → wirft
  strukturierten Fehler statt korruptes XML zu erzeugen (Regressionstest für
  Fehler 1, Abschnitt 4.8).
- Neuer Fall: zwei benachbarte Textläufe mit identischer Markkombination in
  unterschiedlicher Array-Reihenfolge → genau **ein** `<w:r>` im Export (nicht
  zwei), Regressionstest für Lücke B / `marksKey`-Fix (Abschnitt 4.8).
- Neuer Fall: Hervorhebung über einen `hard_break` hinweg (Anforderung 4.1.6).
- Reihenfolge-Unabhängigkeit: Farbe-dann-Fett vs. Fett-dann-Farbe (echte
  `state.tr.addMark`-Sequenz über den Editor, nicht nur JSON) ergibt identisches
  `<w:rPr>` (Anforderung 2.4, nutzt die in Abschnitt 2.4 verifizierte
  ProseMirror-Kanonisierung als Testgrundlage).

### 6.6 `src/formats/docx/__tests__/external-fixtures.test.ts` (ergänzt)

Bestehender Smoke-Test „importiert ohne Absturz" bleibt; zusätzlich gezielte
Assertion für `bug57031.docx`: mindestens ein `highlight`-Mark mit `#c0c0c0` im
resultierenden Dokument vorhanden (pinnt den Fix für Grenzfall 3.7 als
Regressionsschutz fest, nicht nur „stürzt nicht ab").

### 6.7 `src/formats/odt/__tests__/external-fixtures.test.ts` (ergänzt)

Gezielte Assertions für `lostBackground.odt`: exakt 4 `highlight`-Marks mit den
Texten `„Dienstag"`, `„Rot Und BOLD"`, `„Text"`, `„pfff"` und den Hex-Werten
`#ffff00`, `#ff0000`, `#ffc000`, `#ffc000` (pinnt das bereits korrekte
Ist-Verhalten fest, schützt vor einer künftigen Regression, z. B. durch einen
naiven „alle Stile mit `background-color` verwenden"-Refactor, der die 8
verwaisten, unreferenzierten Stile fälschlich mit einbeziehen würde). Ergänzend:
`coloredParagraph.odt`, `character-styles.odt`, `TableFunkyBackground.odt` auf
mindestens einen erwarteten `highlight`-Mark prüfen (Inhalt vor Testerstellung
verifizieren, Dateiname allein ist keine Garantie).

---

## 7. Zuordnung zu den Abnahmekriterien (Abschnitt 6 der Anforderung)

| DoD-Punkt | Abdeckung durch diesen Plan |
|---|---|
| 1. Alle Testfälle aus Abschnitt 5 real im Browser ausgeführt | Abschnitt 6.1 (`highlight.spec.ts`, 14 Punkte) |
| 2. Rundreise-Anforderungen (Abschnitt 4) per unabhängigem Parser/Re-Import bestätigt | 6.1 Punkte 6-10,12 + 6.4/6.5/6.6/6.7 |
| 3. Alle Grenzfälle einzeln geprüft und dokumentiert | Abschnitte 1-3 dieser Datei; 3.7 bestätigt+belegt, 3.8/3.13 als Design-Entscheidung dokumentiert (Abschnitt 3.3/5), 3.9 durch `normalizeCssColor` vollständig gelöst statt nur dokumentiert, neue Lücken A/B (Abschnitt 2.3/2.4) zusätzlich gefunden und behoben |
| 4. `w:shd`-statt-`w:highlight`-Kompromiss dokumentiert | Abschnitt 3.3/5, Punkt 3 |
| 5. Zustandsanzeige behoben oder dokumentiert | Behoben, Abschnitt 3.4/4.3/4.4 |
| 6. Rückmeldung bei leerer Selektion behoben oder dokumentiert | UI behoben (deaktivierte Controls), Commands bewusst unverändert, Abschnitt 3.2 |
| 7. Umgang mit ungültigen Fremdfarbwerten geklärt | Vollständig gelöst durch `normalizeCssColor` (Einfügen) + `escapeXml`-Fix + `normalizedHex`/`assertValidHex` (Export), Abschnitt 2.1/4.2/4.8/4.10 |
| 8. Icon-Rendering-Risiko bewertet | Auf SVG umgestellt (`HighlighterIcon`/`EraserIcon`), Abschnitt 4.4 |

---

## 8. Reihenfolge der Umsetzung (Vorschlag)

1. `shared/color.ts` (4.1) — unabhängig, Grundlage für alles Weitere.
2. `schema.ts` Normalisierung (4.2) — schließt Grenzfall 3.9 an der Wurzel.
3. `docx/writer.ts` Escaping-Fix (4.8, nur der `escapeXml`-Teil) — behebt Fehler 1
   isoliert, höchste Priorität, kleinster Diff.
4. `commands.ts` + `Toolbar.tsx` (4.3/4.4) — Zustandsanzeige, deaktivierte
   Controls, `change`-Event-Fix, SVG-Icons — größte sichtbare Verbesserung.
5. `docx/highlightPalette.ts` + `docx/reader.ts` `<w:highlight>`-Unterstützung
   (4.6/4.7) — behebt den kritischen Verdacht 3.7.
6. `odt/reader.ts` Absatzstil-`text-properties` (4.9) — schließt Lücke A.
7. `odt/styleRegistry.ts` + `docx/writer.ts` Dedup-/Merge-Härtung (4.11, Rest von
   4.8) — schließt Lücke B (niedrige Priorität, da aktuell nicht auslösbar).
8. Testergänzungen 6.1-6.7 parallel zu bzw. unmittelbar nach jedem der obigen
   Schritte, nicht erst am Ende gesammelt.
9. Optionale `<w:highlight>`-Rückrichtung beim Export (Abschnitt 4.7, optionaler
   Teil) — nur falls nach Abschnitt 3.3 gewünscht, unabhängig vom Rest umsetzbar.
