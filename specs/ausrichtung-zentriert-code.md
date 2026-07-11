# Umsetzungsplan: Feature „Ausrichtung zentriert" — Code-Abgleich und geplante Änderungen

Rolle: Entwickler-Antwort auf `specs/ausrichtung-zentriert-req.md`. Dieses Dokument prüft
den **tatsächlichen** aktuellen Code-Stand gegen jede Behauptung/jedes Verdachtsmoment der
Anforderung und legt dateigenau fest, welche Dateien wie geändert bzw. neu angelegt werden.
Stil orientiert an `FEATURE-SPEC-DOCX-ODT.md` und `specs/fett-code.md`. Kein Punkt hier ist
bereits umgesetzt — dies ist der Plan, nicht der Vollzug.

**Revisionshinweis (diese Fassung):** Eine frühere Fassung dieses Plans war gegen einen
älteren Quell- und Anforderungsstand geschrieben und enthielt durchgehend **veraltete
Zeilennummern** (z. B. `AlignButton` bei `Toolbar.tsx:64` statt tatsächlich `91`,
`paragraphToBlocks` bei `docx/reader.ts:146` statt `229`) sowie **falsche
Abschnittsverweise** auf die Anforderung (Verdachtsmomente als „Abschnitt 6" statt aktuell
Abschnitt 7, Testfälle als „Abschnitt 7" statt Abschnitt 8, DoD als „Abschnitt 8" statt
Abschnitt 10). Außerdem behandelte sie den `setAlign`-`RangeError` als „bislang unentdeckt",
obwohl die aktuelle Anforderung ihn bereits selbst als bestätigten Kernfehler in Abschnitt
3.2/7.1 führt, und ging von nicht existierenden Testdateien aus (`commands.test.ts` existiert
bereits; `tests/e2e/roundtrip-fidelity.spec.ts` deckt einen zentrierten Absatz bereits ab).
Alle Zeilen- und Abschnittsangaben unten sind gegen den **jetzigen** Stand neu verifiziert.

**Nachtrag (zweite Durchsicht):** Bei einer erneuten, dateigenauen Gegenprüfung fielen in
dieser Fassung selbst noch zwei Fehler auf, die jetzt korrigiert sind: (a) **alle
`WordEditor.tsx`-Zeilennummern waren veraltet** — das Keymap-Objekt steht bei Z. 85–107 (nicht
77–99), die Mark-Bindings `Mod-b/i/u` bei Z. 98–100 (nicht 90–92), `dispatchTransaction` bei
Z. 125–132 (nicht 117–124), `Shift-Enter` bei Z. 97, `Shift-Delete` bei Z. 106; (b) die
Mechanik-Begründung in 2.1 nannte fälschlich `setNodeMarkup` — das installierte
`prosemirror-transform` (Z. 2130–2131) baut `setNodeAttribute` über einen **`AttrStep`** (reine
Attributänderung, `StepMap`=Identität), was die „Positionen bleiben gültig"-Aussage sogar
stärker trägt. Alle übrigen Zeilenangaben (`schema.ts`, `commands.ts`, `Toolbar.tsx`,
`docx/reader.ts`, `docx/writer.ts`, `odt/reader.ts`, `odt/writer.ts`, `styleRegistry.ts`) sowie
die Aussagen zu vorhandenen Tests/Fixtures wurden dabei bestätigt.

**Nachtrag (dritte Durchsicht, gegen die aktuelle Fassung von `ausrichtung-zentriert-req.md`
abgeglichen):** Die Anforderung wurde seit der letzten Prüfung dieses Plans selbst
weiterentwickelt (ihr eigener Revisionshinweis benennt das explizit: der Tastatur-Bug am
`AlignButton` war „bislang nur eine Nebenbeobachtung in `ausrichtung-zentriert-code.md`
Abschnitt 2.5" — genau die Fassung dieses Plans, die hier vorlag). Die Anforderung hat daraus
jetzt einen eigenständigen, verbindlichen Anforderungspunkt gemacht: Abschnitt 3.11, Grenzfall 16,
**Risiko 12** (neu, Abschnitt 7 zählt jetzt 1–12 statt 1–11), **Entscheidung 9.8** (neu, Abschnitt
9 zählt jetzt 1–8 statt 1–7, mit dem ausdrücklichen Hinweis „keine Abwägung nötig, WCAG 2.1.1"),
**Testfall 36** und **Abnahmekriterium 7** (Abschnitt 10 zählt jetzt 1–7 statt 1–6). Der zugrunde
liegende Code-Befund und der geplante Fix ändern sich dadurch **nicht** — beides stand bereits
in Abschnitt 2.5/4.2 dieses Plans (Zeilenangaben erneut gegen `Toolbar.tsx` bestätigt, siehe
Abschnitt 1). Ergänzt wurden ausschließlich die fehlenden Querverweise/Traceability-Einträge:
Zeile 9.8 in der Entscheidungstabelle (Abschnitt 5), ein eigener, vom Tastenkürzel-Test
getrennter Testfall (Abschnitt 6.1, neuer Punkt 24 — angehängt statt eingeschoben, damit die
Verweise `6.1(18)`/`6.1(19–23)` auf die bestehenden Punkte 18/19–23 gültig bleiben), Zeile 7.12
in der Verdachtsmomente-Zuordnung und Zeile 7 in der Abnahmekriterien-Tabelle (beide Abschnitt 7
dieses Plans).

Alle Befunde in Abschnitt 2 sind gegen die konkret gelesenen Quelldateien geprüft; die
laufzeitkritischen Punkte (v. a. Fehler 1) zusätzlich gegen die installierten
ProseMirror-Interna. Wo eine echte Ausführung (Vitest-`EditorState`/`EditorView` in jsdom,
`readDocx`/`readOdt` gegen echte Fixture-Bytes, JSZip-Rohbyte-Inspektion) zur endgültigen
Verifikation nötig ist, ist das benannt und in den Testplan (Abschnitt 6) überführt.

---

## 0. Kurzfassung

Die Ist-Stand-Tabelle in `ausrichtung-zentriert-req.md` Abschnitt 1 ist in ihren
Zeilenangaben **exakt korrekt** (im Gegensatz zu diesem Plan in seiner Vorfassung — siehe
Revisionshinweis). Jede dort genannte Fundstelle wurde nachgeprüft (Abschnitt 1). Die
Anforderung benennt den kritischen Fehler bereits selbst; dieser Plan **bestätigt** ihn und
ergänzt drei weitere, in der Anforderung nur als Verdacht oder Grenzfall markierte
Code-Defekte als real:

1. **Zentrieren einer Mehrabsatz-Selektion wirft `RangeError: Applying a mismatched
   transaction` und zentriert nur den ersten Absatz.** Das ist exakt der von der Anforderung
   in **Abschnitt 3.2** und **Verdachtsmoment 7.1** beschriebene Kernfehler. Ursache in
   `commands.ts:13–27` (`setAlign` ruft in der `nodesBetween`-Schleife für **jeden** Treffer
   `dispatch(state.tr.setNodeAttribute(...))` auf demselben, eingefrorenen `state` auf).
   Höchste Priorität. Siehe Abschnitt 2.1.
2. **`setHeading` setzt bei jedem Formatvorlagenwechsel `align` hart auf `'left'`**
   (`commands.ts:43`) — bestätigt Verdachtsmoment 7.2 / Grenzfall 3. Siehe Abschnitt 2.2.
3. **ODT-Reader reicht einen nicht-kanonischen `fo:text-align`-Wert (z. B. `start`/`end`)
   roh als `align` durch** (`odt/reader.ts:66`), statt — wie der DOCX-Reader — auf einen der
   vier Schema-Werte abzubilden. Für `center` selbst unschädlich (ODF kennt nur den einen
   Wert `center`), aber derselbe geteilte Code-Pfad, und ein realer Rundreise-Datenverlust
   für `right` (aus `end`). Präzisiert Verdachtsmoment 7.4 / Grenzfall 2. Siehe Abschnitt 2.3.
4. **Keine Auswertung stil-/vererbungsbasierter Ausrichtung beim Import** (DOCX `w:pStyle`
   → `styles.xml`; ODT `office:styles` / `style:parent-style-name`) — bestätigt
   Verdachtsmoment 7.3 / Grenzfall 1. Siehe Abschnitt 2.6.

Zusätzlich bestätigen sich `isAlignActive`-Nur-`$from` (2.4), die fehlende
Tastatur-Auslösbarkeit / das fehlende `aria-label` / der englische Tooltip / die
mehrdeutige `↔`-Glyphe am `AlignButton` (2.5), die unvollständige `jc`-Wertetabelle (2.7)
und der Copy/Paste-Verlust bei Ausrichtung auf einem Vorfahren-Element (2.9, **optional/
riskant** — die Anforderung verlangt hier laut Grenzfall 10 nur die Dokumentation des
Fallbacks, nicht zwingend eine Behebung).

**Wichtige Korrektur zur Testabdeckung:** Anders als in der Vorfassung dieses Plans behauptet,
existiert bereits ein echter Browser-Rundreisetest für einen zentrierten Absatz
(`tests/e2e/roundtrip-fidelity.spec.ts`, Kriterium 4, DOCX **und** ODT). Er **klickt aber
nie** den „Zentriert"-Button (ruft `setAlign` nie auf) und deckt nur **einen** zentrierten
Absatz ab — der eigentliche Bedien-Pfad und der Mehrabsatz-Fall bleiben ungetestet. Ebenso
existiert `src/formats/shared/editor/__tests__/commands.test.ts` bereits (deckt aber nur
`canCut`/`cutSelection` ab, **keine** Ausrichtungs-Commands). Der Testplan (Abschnitt 6)
trägt dem Rechnung (ergänzen statt neu anlegen).

---

## 1. Verifikation der Ist-Stand-Tabelle (`ausrichtung-zentriert-req.md` Abschnitt 1)

Alle Fundstellen der Anforderung nachgeprüft. Die Anforderung ist zeilengenau korrekt.

| Fundstelle laut Anforderung | Ergebnis der Prüfung (aktueller Stand) |
|---|---|
| `schema.ts:4` `alignAttr`, angewendet Zeile 19 (paragraph) / 29 (heading) | **Bestätigt, exakt.** `alignAttr = { align: { default: 'left', validate: 'string' } }` (Z. 4). `validate: 'string'` = kein Enum. |
| `schema.ts:21,36` `toDOM` `style="text-align: …"` | **Bestätigt.** paragraph `toDOM` Z. 21–23 (Style Z. 22), heading `toDOM` Z. 35–37 (Style Z. 36). |
| `schema.ts:20,33` `parseDOM getAttrs` liest `style.textAlign \|\| 'left'` | **Bestätigt.** paragraph Z. 20, heading Z. 33. Liest nur das Inline-`style` des `<p>`/`<hN>` selbst (Grundlage Befund 2.9). |
| `commands.ts:13–27` `setAlign` (N Einzeldispatches) | **Bestätigt, exakt.** Der `dispatch(state.tr.setNodeAttribute(pos, 'align', align))` in der Schleife (Z. 21) ist der Kernfehler (2.1). |
| `commands.ts:29–38` `isAlignActive` nur `$from` | **Bestätigt, exakt.** |
| `commands.ts:40–55` `setHeading` setzt `align:'left'` (Z. 43) | **Bestätigt, exakt** (`const attrs = level === null ? undefined : { level, align: 'left' }`, Z. 43). Beide Wechselrichtungen betroffen (2.2). |
| `Toolbar.tsx:91–111,235` `AlignButton`, center Z. 235; `title` interner Bezeichner; kein `aria-label` | **Bestätigt, exakt.** `AlignButton` Z. 91–111, `title={\`Ausrichtung: ${align}\`}` Z. 96, **kein** `aria-label`, nur `onMouseDown` (Z. 98–101). Aufruf center Z. 235. `MarkButton` setzt `aria-label={title}` (Z. 74) — Inkonsistenz bestätigt. |
| `WordEditor.tsx:85–107` Keymap ohne Ausrichtungs-Kürzel | **Bestätigt.** Keymap-Objekt Z. 85–107 (Mark-Bindings `Mod-b/i/u` Z. 98–100, `Shift-Enter` Z. 97, `Shift-Delete` Z. 106); kein `Mod-*` für `setAlign`. `dispatchTransaction` (für den Kernfehler relevant) Z. 125–132. |
| `docx/reader.ts:14` `JC_TO_ALIGN`; Z. 236–241 nur Heading-Level aus `pStyle`; Z. 240 `?? 'left'` | **Bestätigt, exakt.** `JC_TO_ALIGN = { left, center, right, both→justify }` (Z. 14). `pStyle` Z. 236–237 nur für `headingLevelForStyle` (Z. 241); `align` allein aus direktem `w:jc` (Z. 238–240). |
| `docx/writer.ts:18,69–71` `JC_BY_ALIGN`, schreibt `<w:jc>` immer | **Bestätigt, exakt.** `JC_BY_ALIGN` Z. 18, `paragraphPropsXml` Z. 69–72 (`<w:jc w:val="${jc}"/>`, Fallback `'left'`). Kein Fix nötig. |
| `odt/reader.ts:37–68` `parseAutomaticStyles`; Z. 178/259 Fallback `'left'`; Z. 364/374 | **Bestätigt, exakt.** `fo:text-align` nur aus `office:automatic-styles`, Familie `paragraph` (Z. 63–66). Verwendung: paragraph Z. 178, heading Z. 259. content.xml-Automatikstile Z. 363–364; styles.xml-Automatikstile Z. 373–374 (nur Kopf/Fuß). **Zusatzbefund:** Rohwert wird ungeprüft übernommen (Z. 66, `if (align) paragraphAligns.set(name, align)`) — siehe 2.3. |
| `odt/writer.ts:88–97` + `styleRegistry.ts:61–72,80–89` fester Stil je Ausrichtung | **Bestätigt, exakt.** `blockToOdt` paragraph Z. 88–89, heading Z. 95–97; `PARAGRAPH_ALIGN_STYLE_NAME` Z. 61–66, `paragraphAlignStyleDefs` Z. 68–75, `headingStyleName` Z. 80–82, `headingStyleDefs` Z. 84–93. Kein Fix nötig. |
| `docx/__tests__/roundtrip.test.ts` / `odt/__tests__/roundtrip.test.ts` nur Einzelabsatz | **Bestätigt** als Einzelabsatz-/Einzelheading-Writer→eigener-Reader-Kette (siehe Abschnitt 6.3/6.4 zur Ergänzung). |
| E2E: bereits vorhandener zentrierter-Absatz-Rundreisetest, ohne Button-Klick | **Bestätigt.** `tests/e2e/roundtrip-fidelity.spec.ts` Kriterium 4 (Z. 56–58, 128–129, 178–179, 242–243) prüft `toHaveCSS('text-align','center')` für DOCX **und** ODT, aus vorkonstruierten Fixtures (`tests/e2e/fixtures/richDocument.ts`); **kein** `setAlign`-Aufruf, nur **ein** zentrierter Absatz. Cross-Format-Rundreise dort bewusst `test.skip` (Z. 256–257, „blocked on backlog slug speichern-unter-format") — siehe Abschnitt 6.7. |
| Reale Fixtures unter `tests/fixtures/external/{docx,odt}/` | Dateinamen existieren; drei der genannten Alternativkandidaten sind für Ausrichtungstests ungeeignet — siehe Befund 2.8. |

---

## 2. Gefundene Fehler (priorisiert)

### 2.1 Fehler 1 (kritisch): Mehrabsatz-Zentrierung wirft `RangeError`, nur der erste Absatz wird zentriert

**Datei:** `src/formats/shared/editor/commands.ts:13–27`.

```ts
export function setAlign(align: Align): Command {
  return (state, dispatch) => {
    const { from, to } = state.selection
    let applicable = false
    state.doc.nodesBetween(from, to, (node, pos) => {
      if (alignableTypes.has(node.type.name)) {
        applicable = true
        if (dispatch) {
          dispatch(state.tr.setNodeAttribute(pos, 'align', align)) // Z. 21
        }
      }
    })
    return applicable
  }
}
```

`state.tr` ist ein Getter, der bei jedem Zugriff eine **neue** `Transaction` erzeugt, deren
`.before` der zum Aufrufzeitpunkt eingefrorene `state.doc` ist (`state` ist der
Funktionsparameter, nicht `view.state` zur Laufzeit). `WordEditor.tsx:125–132`
(`dispatchTransaction`) wendet jede Transaktion auf das **jeweils aktuelle** `view.state` an
(`view.state.apply(tr)`). Nach dem ersten `dispatch()` ist `view.state.doc` bereits verändert;
die zweite Transaktion wird aber weiter aus dem alten `state` gebaut → `tr.before` (altes Doc)
≠ `view.state.doc` (neues Doc).

`prosemirror-state` prüft in `applyInner` zwingend
`if (!tr.before.eq(this.doc)) throw new RangeError("Applying a mismatched transaction")`.
→ **`RangeError` ab dem zweiten betroffenen Block.** Der erste Absatz ist da schon zentriert,
alle weiteren bleiben unverändert, `view.focus()` in `Toolbar.tsx`s `run()` (Z. 28–31) wird
wegen des Throws nicht mehr erreicht. Erwartetes Endergebnis bei 3 Absätzen:
`['center','left','left']` statt `['center','center','center']`.

**Betroffene Anforderungen:** Abschnitt 3.2 (Kernfehler), Testfälle 3, 4, 5, 21, 32, 33;
Grenzfälle 4, 11, 14 — alle schlagen fehl, sobald mehr als ein alignierbarer Block in der
Selektion liegt (u. a. „Alles auswählen → Zentriert"). Direkter Verstoß gegen
`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20 Punkt 4 („Kein stiller Fehlschlag").

**Fix:** **Eine** Transaktion über alle betroffenen Positionen, plus No-Op-Kurzschluss
(Grenzfall 9 / offene Entscheidung 9.1 — kein leerer Undo-Schritt bei wiederholtem Klick):

```ts
export function setAlign(align: Align): Command {
  return (state, dispatch) => {
    const { from, to } = state.selection
    const positions: number[] = []
    let allAlreadySet = true
    state.doc.nodesBetween(from, to, (node, pos) => {
      if (alignableTypes.has(node.type.name)) {
        positions.push(pos)
        if (node.attrs.align !== align) allAlreadySet = false
      }
    })
    if (positions.length === 0) return false
    if (allAlreadySet) return true // No-Op: kein leerer Undo-Schritt (Grenzfall 9)
    if (dispatch) {
      let tr = state.tr
      for (const pos of positions) tr = tr.setNodeAttribute(pos, 'align', align)
      dispatch(tr)
    }
    return true
  }
}
```

Die `pos`-Werte bleiben über die Schleife gültig, weil `setNodeAttribute` im installierten
`prosemirror-transform` (Z. 2130–2131) einen **`AttrStep`** erzeugt (`this.step(new
AttrStep(pos, attr, value))`), **nicht** `setNodeMarkup`. Ein `AttrStep` ändert
ausschließlich ein einzelnes Attribut des Nodes an `pos`; seine `StepMap` ist die Identität
(keinerlei Struktur-/Größenänderung), nachfolgende Positionen verschieben sich also garantiert
nicht. **Ein** Klick = **eine** Transaktion = **ein** Undo-Schritt (per
`prosemirror-history`), was zugleich offene Entscheidung 9.1 und Testfall 4/20 abschließend
beantwortet.

### 2.2 Fehler 2 (hoch): `setHeading` verwirft die Ausrichtung bei jedem Formatvorlagenwechsel

**Datei:** `src/formats/shared/editor/commands.ts:40–55`, Kernzeile 43:

```ts
const attrs = level === null ? undefined : { level, align: 'left' }
```

Bestätigt Verdachtsmoment 7.2 / Grenzfall 3 exakt. Betrifft **jeden** Wechsel: Standard→
Überschrift, Überschrift→Überschrift, Überschrift→Standard (letzterer über `attrs = undefined`
→ Schema-Default `'left'`, also ebenso). Wirkt nur bei Einzelblock-Selektion (`if
(!$from.sameParent($to)) return false`, Z. 45).

**Fix** (bestehende Ausrichtung des Absatzes übernehmen; `attrs`-Berechnung hinter die
`parent`-Auflösung ziehen):

```ts
export function setHeading(level: number | null): Command {
  return (state, dispatch) => {
    const type = level === null ? wordSchema.nodes.paragraph : wordSchema.nodes.heading
    const { $from, $to } = state.selection
    if (!$from.sameParent($to)) return false
    const parent = $from.parent
    if (!alignableTypes.has(parent.type.name)) return false
    const align = (parent.attrs.align as string | undefined) ?? 'left'
    const attrs = level === null ? { align } : { level, align }
    if (dispatch) {
      const pos = $from.before($from.depth)
      const tr = state.tr.setBlockType(pos, pos + parent.nodeSize, type, attrs)
      dispatch(tr)
    }
    return true
  }
}
```

`parent.attrs.align` existiert immer (nur `paragraph`/`heading` in `alignableTypes`, beide mit
`align`-Default `'left'`); der `?? 'left'` ist rein defensiv. Entscheidung zu 9.2:
**Bug beheben** (Ausrichtung überträgt sich) — siehe Abschnitt 5.2.

### 2.3 Fehler 3 (hoch): ODT-Reader reicht nicht-kanonische `fo:text-align`-Werte roh durch

**Datei:** `src/formats/odt/reader.ts:65–66`:

```ts
const align = props?.getAttributeNS(ODF_NAMESPACES.fo, 'text-align')
if (align) paragraphAligns.set(name, align) // Rohwert, kein Mapping
```

Anders als der DOCX-Reader (`JC_TO_ALIGN[jcVal] ?? 'left'`, immer einer der 4 Werte) fehlt
jede Normalisierung. ODF erlaubt neben `left/center/right/justify` auch die logischen Werte
`start`/`end` (ODF 1.3 §20.276). Diese landen unverändert in `attrs.align` (verwendet in
`paragraphToBlocks` Z. 178 und der Heading-Verzweigung Z. 259) und damit im Dokument.

Folgen für z. B. `end`:
- `isAlignActive(state, 'right')` vergleicht `=== 'right'` → `false` → kein Button aktiv,
  obwohl der Absatz rechtsbündig gemeint ist.
- `docx/writer.ts:70` `JC_BY_ALIGN['end'] ?? 'left'` → Cross-Export schreibt `left`.
- `odt/writer.ts:89` `PARAGRAPH_ALIGN_STYLE_NAME['end'] ?? …left` → auch der unveränderte
  ODT-Reexport (Testfall 27) macht den Absatz **still linksbündig**.

`center` selbst ist unbetroffen (ODF hat kein `start`/`end`-Analogon für „zentriert"), aber es
ist derselbe geteilte Code-Pfad, den `center` durchläuft, und die Anforderung behandelt alle
vier Werte als einen Mechanismus. **Fix:** Normalisierungsfunktion analog DOCX, siehe 4.5a.

### 2.4 Fehler 4 (mittel-hoch): `isAlignActive` wertet nur `$from` aus

**Datei:** `commands.ts:29–38`. Bestätigt Verdachtsmoment 7.5 / Abschnitt 3.4. Bei einer
Selektion, die mit einem zentrierten Absatz beginnt, aber weitere anders ausgerichtete
enthält, zeigt der Button fälschlich „aktiv". (Verschärft im aktuellen Code den stillen
Teilfehlschlag aus 2.1: nach dem Throw steht `$from` im ersten, zentrierten Absatz, der Button
signalisiert „ganze Selektion zentriert".) Zielverhalten laut Anforderung 3.4:
Word/LibreOffice-Konvention — bei gemischter Selektion **kein** Button aktiv.

**Fix** (volle Selektionsabdeckung; leere Selektion unverändert über Vorfahren):

```ts
export function isAlignActive(state: EditorState, align: Align): boolean {
  const { $from, from, to, empty } = state.selection
  if (empty) {
    for (let depth = $from.depth; depth >= 0; depth--) {
      const node = $from.node(depth)
      if (alignableTypes.has(node.type.name)) return node.attrs.align === align
    }
    return false
  }
  let sawAny = false
  let allMatch = true
  state.doc.nodesBetween(from, to, (node) => {
    if (alignableTypes.has(node.type.name)) {
      sawAny = true
      if (node.attrs.align !== align) allMatch = false
    }
  })
  return sawAny && allMatch
}
```

Entscheidung zu 9.5: **auf „alle betroffenen Blöcke"** umstellen — Abschnitt 5.5.

### 2.5 Fehler 5 (gebündelt; Tastatur-Teilaspekt jetzt Pflicht, nicht mehr optional): `AlignButton` — Tastatur, `aria-label`, Tooltip-Sprache, Glyphe

**Datei:** `Toolbar.tsx:91–111`. Vier eng zusammenhängende Mängel an derselben Komponente,
bestätigt aus Verdachtsmomenten 7.7–7.9 **und 7.12** und Abschnitt 2 (Elemente 3–6):

- **Nur `onMouseDown` (Z. 98–101), kein `onClick`.** Ein natives `<button>` löst bei
  Tastatur-Aktivierung (Tab-Fokus + Enter/Leertaste) `click`, **nicht** `mousedown` aus →
  per Tastatur nicht auslösbar. (Gilt als geteiltes Muster für alle Toolbar-Buttons inkl.
  `MarkButton` Z. 76; hier für den `AlignButton` behoben, Scope-Disziplin analog `fett-code.md`.)
  **Einstufung geschärft:** Dieser Teilpunkt war in der Vorfassung der Anforderung nur eine
  Nebenbeobachtung dieses Abschnitts; die aktuelle `ausrichtung-zentriert-req.md` führt ihn jetzt
  als eigenen, verbindlichen Punkt (Abschnitt 3.11, Grenzfall 16, **Risiko 12**, Testfall 36,
  **Entscheidung 9.8**) und stuft ihn explizit als „keine Abwägung nötig" (WCAG 2.1.1) ein — anders
  als die übrigen drei Mängel dieses Fehlers (aria-label/Tooltip/Glyphe), die UX-Verbesserungen
  ohne eigene WCAG-Erfolgskriterium-Nummer sind. Der hier bereits geplante Fix (Abschnitt 4.2)
  ändert sich dadurch nicht; es ändert sich nur die Priorität/Nachweispflicht (dedizierter
  Testfall 6.1 Punkt 24, eigene Zeile in der DoD-Tabelle Abschnitt 7).
- **Kein `aria-label`** (Z. 94–106), anders als `MarkButton` (`aria-label={title}`, Z. 74).
- **`title={\`Ausrichtung: ${align}\`}` (Z. 96)** rendert „Ausrichtung: center" — interner
  englischer Bezeichner im sonst deutschen UI (Verdachtsmoment 7.8).
- **Glyphe `↔` (Z. 235)** ist semantisch mehrdeutig („verschieben"/„Breite ändern") und
  schwer von `⇤`/`⇥`/`≡` unterscheidbar (Verdachtsmoment 7.9, `FEATURE-SPEC-DOCX-ODT.md`
  Abschnitt 17/20.1).

**Fix:** siehe Abschnitt 4.2 (onClick + `aria-label` + deutscher Tooltip via `ALIGN_LABELS` +
Inline-SVG-Zentrier-Icon nur für `center`).

### 2.6 Fehler 6 (hoch): Keine stil-/vererbungsbasierte Ausrichtungsauflösung beim Import

Bestätigt Verdachtsmoment 7.3 / Grenzfall 1 — ein in echten Word-/LibreOffice-Dateien
gängiges Muster (Titel/Untertitel-Formatvorlagen, zentriert vordefiniert).

**DOCX** (`docx/reader.ts`): `parseStylesXml` (Z. 53–67) liest aus jedem `<w:style>` **nur**
`w:pPr/w:outlineLvl` (Heading-Level), **nicht** `w:jc`. `paragraphToBlocks` (Z. 235–240)
ermittelt `align` allein aus dem direkten `<w:jc>` des Absatzes. Ein Absatz mit `<w:pStyle
w:val="Title"/>` ohne eigenes `<w:jc>`, dessen Stil in `styles.xml` `<w:jc w:val="center"/>`
definiert, wird als `align:'left'` importiert (Grenzfall 1). Die Fixture
`bug-paragraph-alignment.docx` ist genau dafür konstruiert (ihr zweiter Absatz belegt zugleich,
dass direkte Formatierung Vorrang vor dem Stil hat — Kontrollfall).

**ODT** (`odt/reader.ts`): `readOdt` (Z. 357–388) parst nur `office:automatic-styles` (Z. 363–
364 aus content.xml; Z. 373–374 aus styles.xml, letzteres nur für Kopf/Fuß). Weder
`office:styles` (benannte/gemeinsame Stile) noch eine `style:parent-style-name`-Kette werden
aufgelöst.

**Fix:** Abschnitt 4.4 (DOCX, `w:basedOn`-Kette) und 4.5b (ODT, `office:styles` +
`style:parent-style-name`), jeweils mit Zyklenschutz nach dem im Code etablierten
`MAX_TABLE_NESTING_DEPTH`- (`docx/reader.ts:309`) bzw. `MAX_NESTING_DEPTH`-Muster
(`odt/reader.ts:218`). Direkte Absatzformatierung schlägt immer die Formatvorlage.

### 2.7 Fehler 7 (mittel): Unvollständige `jc`-/`text-align`-Wertetabelle

**Datei:** `docx/reader.ts:14` (`JC_TO_ALIGN` kennt nur `left/center/right/both`). Werte wie
`start`, `end`, `distribute`, `thaiDistribute`, `highKashida`/`lowKashida`/`mediumKashida`,
`numTab` fallen still auf `'left'`. Für RTL-Absätze (`rtl.docx`: `<w:bidi w:val="1"/>` +
`<w:jc w:val="start"/>`) ist `start` physisch **rechts**, wird aber als `left` importiert.
Für `center` unkritisch (eindeutig), relevant für Nachbarabsätze in gemischten Testdokumenten
(Grenzfall 2, Testfall 34) und für die RTL-Fixture (Testfall 29). **Fix:** 4.4b
(`resolveJc(jcVal, isBidi)`).

**Scope-Hinweis:** Der Code hat aktuell keinerlei `w:bidi`/Textrichtungs-Behandlung (kein
`dir`-Attribut in `schema.ts`s `toDOM`). Volle RTL-Unterstützung ist **nicht** Teil dieses
Plans (Abschnitt 5.6); es geht ausschließlich um die korrekte Abbildung `start`/`end` →
`left`/`right` unter Berücksichtigung des bereits am Absatz vorhandenen `w:bidi`-Flags.

### 2.8 Fehler 8 (Testplanungs-Korrektur, kein Code-Fehler): drei vorgeschlagene Fixtures sind ungeeignet

Diese Bewertung basiert auf einer JSZip-Rohbyte-Inspektion und ist **vor der Testumsetzung
erneut zu bestätigen** (die einzelnen Fixture-Inhalte können sich seit der ursprünglichen
Prüfung geändert haben — deshalb sind die Abschnitt-6.5/6.6-Tests bewusst als
„dokumentierende" Tests angelegt, die die Eignung selbst mitprüfen):

| Datei (vorgeschlagen für) | Vermuteter Inhalt | Eignung |
|---|---|---|
| `table-alignment.docx` (Testfall 31) | `<w:jc>` nur in `<w:tblPr>` (Tabellen-Fließausrichtung auf der Seite), **nicht** in `<w:pPr>` einer Zelle | Ungeeignet für Absatz-/Zellenausrichtung |
| `TestTableCellAlign.docx` (Testfall 31) | nur `<w:vAlign>` (vertikale Zellausrichtung), kein `<w:jc>` | Ungeeignet (anderes Feature) |
| `CharacterParagraphFormat.odt` (Testfall 27, primärer Kandidat der Anforderung) | vermutlich kein `fo:text-align` in content.xml/styles.xml | Falls bestätigt: **`feature_attributes_paragraph_MSO2013.odt` als Ersatz** (enthält `fo:text-align` = `center`/`end`/`justify` an beschrifteten Abschnitten) |

**Konsequenz:** Für Testfall 31 (zentrierter Tabellenzellen-Absatz, Rundreise) ist eine
**neu angelegte, handgebaute** DOCX/ODT-Fixture nötig (`w:tbl > w:tr > w:tc > w:p > w:pPr >
w:jc w:val="center"` bzw. das ODF-Pendant), da keine der vorgeschlagenen Dateien zentrierten
Zelltext enthält. Testfall 27 ggf. gegen `feature_attributes_paragraph_MSO2013.odt` fahren.

### 2.9 Fehler 9 (optional/riskant): Copy/Paste verliert Ausrichtung, wenn der Stil auf einem Vorfahren sitzt

**Datei:** `schema.ts:20,33` — `getAttrs` liest `(dom as HTMLElement).style.textAlign || 'left'`,
also nur das Inline-`style` **des `<p>`/`<hN>` selbst**, keine geerbte Eigenschaft. Struktur
`<div style="text-align: center"><p>…</p></div>` (real bei Webseiten/manchen
Word-HTML-Clipboards) liefert `align:'left'`.

**Bewertung / Scope-Entscheidung:** Die Anforderung verlangt hierfür in **Grenzfall 10** nur,
das erwartete Fallback (vermutlich Verlust) **nachzuweisen und zu dokumentieren** — **nicht**
zwingend eine Behebung. Der naheliegende Fix (`getComputedStyle(dom).textAlign`) ist
**riskant**:

- In jsdom (Vitest) löst `getComputedStyle` Vererbung nicht auf (liefert leeren String) → per
  Unit-Test nicht verifizierbar; nur E2E.
- `getComputedStyle` liefert den **berechneten** Wert. Für ein nicht-gelayoutetes/detached
  Element (ProseMirrors Paste-Parsing) kann `text-align` als Initialwert `"start"`
  zurückkommen — genau der **nicht-kanonische** Wert, der die Writer bricht (dieselbe Klasse
  wie Befund 2.3). Ein solcher Fix **muss** daher durch dieselbe `start`/`end`→`left`/`right`-
  Normalisierung laufen wie 2.3, nicht roh übernommen werden.

**Empfehlung:** In diesem Plan wird 2.9 **nicht** über `getComputedStyle` „behoben", sondern
als **dokumentierter Grenzfall** geführt (Anforderung erfüllt via Grenzfall 10 + Testfall 15).
Wer den Fix dennoch will, muss die Normalisierung aus 2.3 mitverwenden — siehe Abschnitt 4.7
(als **optional** markiert).

---

## 3. Bereits korrekt — nur zu testen, kein Code-Fix

- **3.3 Kein Toggle-Aus:** `setAlign` setzt immer den übergebenen Wert (Radio-Semantik) — korrekt.
- **3.6 Listen/Tabellenzellen:** `alignableTypes` prüft nur den Node-Typ; ein `paragraph` in
  `list_item`/`table_cell` verhält sich strukturell identisch. `text-align` sitzt auf dem
  inneren `<p>`, nicht auf `<li>` → Listensymbol bleibt (Browser-Standard). Colspan/Rowspan-
  Zellen sind eigenständige `table_cell`-Knoten mit eigenem `align` → keine Nebenwirkung.
- **3.7 Visuelle Darstellung / 3.8 Kombination mit Marks:** reines CSS bzw. orthogonale Ebenen
  (Node-Attribut vs. Mark) — keine Custom-Logik, keine gegenseitige Beeinflussung.
- **Copy/Paste Grundmechanismus (Stil direkt auf `<p>`):** `parseDOM` liest `style.textAlign`
  → funktioniert; nur der Vorfahren-Fall (2.9) ist ein — bewusst als Grenzfall geführter — Verlust.

---

## 4. Dateigenauer Umsetzungsplan

### 4.1 `src/formats/shared/editor/commands.ts` (geändert)

- `setAlign` (Z. 13–27) → Fassung aus 2.1 (eine Transaktion, No-Op-Kurzschluss).
- `isAlignActive` (Z. 29–38) → Fassung aus 2.4 (volle Selektionsabdeckung).
- `setHeading` (Z. 40–55) → Fassung aus 2.2 (Ausrichtung übernehmen).

Keine Import-Änderungen nötig (`EditorState`, `Command`, `wordSchema`, `alignableTypes` bereits
vorhanden).

### 4.2 `src/formats/shared/editor/Toolbar.tsx` (geändert)

`AlignButton` (Z. 91–111) und Aufrufstelle center (Z. 235):

- `onMouseDown` (Z. 98–101) reduzieren auf `e.preventDefault()`; **neuer**
  `onClick={() => run(view, setAlign(align))}`. (Mausklick: `mousedown` hält den Editorfokus,
  `click` löst die Aktion aus; Tastatur: `click` via Enter/Leertaste. `run()` re-fokussiert den
  Editor, die Selektion lebt in `view.state` unabhängig vom DOM-Fokus.)
- `aria-label={title}` ergänzen (Konsistenz zu `MarkButton` Z. 74).
- Neue Modulkonstante (neben dem `type Align`-Import, Z. 19):

  ```ts
  const ALIGN_LABELS: Record<Align, string> = {
    left: 'Links', center: 'Zentriert', right: 'Rechts', justify: 'Blocksatz',
  }
  ```

  und `title={\`Ausrichtung: ${ALIGN_LABELS[align]}\`}` statt `${align}` (Z. 96) — behebt
  Verdachtsmoment 7.8 risikofrei für alle vier Werte gleichzeitig (rein textuell).
- Neue Komponente `CenterAlignIcon` (Inline-SVG, gleiches Muster wie die vorhandene
  `ScissorsIcon`, Z. 33–53 — keine externe Icon-Bibliothek im Projekt):

  ```tsx
  function CenterAlignIcon() {
    return (
      <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false" fill="currentColor">
        <rect x="3" y="5" width="18" height="2" /><rect x="6" y="10" width="12" height="2" />
        <rect x="3" y="15" width="18" height="2" /><rect x="6" y="20" width="12" height="2" />
      </svg>
    )
  }
  ```

- `AlignButton` um optionalen `icon?: ReactNode`-Prop erweitern (Fallback: `label`), Aufruf
  center (Z. 235):

  ```tsx
  <AlignButton view={view} align="center" label="↔" icon={<CenterAlignIcon />} />
  ```

  Die drei Geschwister-Buttons (`⇤`/`⇥`/`≡`, Z. 234/236/237) bleiben unangetastet
  (Scope-Disziplin; ihre Icons gehören zu `ausrichtung-links/-rechts/-blocksatz`).

### 4.3 `src/formats/shared/editor/WordEditor.tsx` (geändert)

**Nur eine Zeile ergänzen** — das bestehende Keymap-Objekt (Z. 85–107) behält **alle**
vorhandenen Bindungen (insbesondere `Shift-Enter: insertHardBreak()` Z. 97 und
`Shift-Delete: cutSelection(...)` Z. 106 dürfen **nicht** entfallen). Konkret nach den
Mark-Bindings `Mod-b/i/u` (Z. 98–100) einfügen:

```ts
'Mod-e': setAlign('center'),
```

und `setAlign` zum bestehenden Import aus `./commands` (Z. 12) hinzufügen. Begründung für
**nur** `Mod-e` (nicht `Mod-l/r/j`): Abschnitt 5.7.

### 4.4 `src/formats/docx/reader.ts` (geändert)

**a) Stil-Auflösung** (behebt 2.6/DOCX). Das bestehende `HeadingInfo`-Interface (Z. 49–51)
wird um `alignByStyleId` erweitert (Umbenennung in `StylesInfo` optional/kosmetisch). **Wichtig:
kein neuer Fädelungspfad** — das Objekt wird bereits durch `decodeDrawingOrPict` (Z. 143),
`decodeRunElement` (Z. 170), `collectRuns` (Z. 194), `decodeParagraphRuns` (Z. 218),
`paragraphToBlocks` (Z. 229), `parseTable` (Z. 311), `readBodyChildren` (Z. 464) bis `readDocx`
(Z. 487, Aufbau Z. 496) durchgereicht; diese Durchreiche-Funktionen bleiben unverändert (nur
der Typname, falls umbenannt). Es ändern sich exakt drei Codestellen plus zwei neue Helfer:

```ts
interface StylesInfo {
  outlineLvlByStyleId: Map<string, number>
  alignByStyleId: Map<string, string> // bereits auf 4 Schema-Werte normalisiert
}
const MAX_STYLE_CHAIN_DEPTH = 25 // Zyklenschutz, analog MAX_TABLE_NESTING_DEPTH (Z. 309)
```

`parseStylesXml` (Z. 53–67) sammelt zusätzlich je Stil das direkte `w:pPr/w:jc/@w:val` und
`w:basedOn/@w:val`, danach Auflösung mit Memoisierung (direktes `w:jc` schlägt Vererbung):

```ts
function resolveStyleAlign(
  styleId: string, directJc: Map<string, string>, basedOn: Map<string, string>,
  memo: Map<string, string>, depth = 0,
): string | null {
  if (memo.has(styleId)) return memo.get(styleId)!
  if (depth > MAX_STYLE_CHAIN_DEPTH) return null
  const direct = directJc.get(styleId)
  if (direct) { const r = resolveJc(direct, false); memo.set(styleId, r); return r }
  const parentId = basedOn.get(styleId)
  const inherited = parentId ? resolveStyleAlign(parentId, directJc, basedOn, memo, depth + 1) : null
  if (inherited) memo.set(styleId, inherited)
  return inherited
}
```

**b) Erweiterte `jc`-Tabelle inkl. bidi-bewusster `start`/`end`-Auflösung** (behebt 2.7):

```ts
const JC_TO_ALIGN: Record<string, string> = {
  left: 'left', center: 'center', right: 'right', both: 'justify',
  distribute: 'justify', thaiDistribute: 'justify',
  mediumKashida: 'justify', highKashida: 'justify', lowKashida: 'justify',
}
function resolveJc(jcVal: string, isBidi: boolean): string {
  if (jcVal === 'start') return isBidi ? 'right' : 'left'
  if (jcVal === 'end') return isBidi ? 'left' : 'right'
  return JC_TO_ALIGN[jcVal] ?? 'left' // z. B. numTab: dokumentierter Fallback
}
```

**c) `paragraphToBlocks`** (Z. 235–240) — direkte Formatierung schlägt Stil:

```ts
const jcEl = pPr && firstChildNS(pPr, OOXML_NAMESPACES.w, 'jc')
const isBidi = !!(pPr && firstChildNS(pPr, OOXML_NAMESPACES.w, 'bidi'))
const directAlign = jcEl ? resolveJc(jcEl.getAttributeNS(OOXML_NAMESPACES.w, 'val') ?? 'left', isBidi) : null
const align = directAlign ?? (styleId ? stylesInfo.alignByStyleId.get(styleId) : undefined) ?? 'left'
```

Die Heading-Verzweigung (Z. 253) nutzt dasselbe `align`. `readDocx` (Z. 496) übergibt das
erweiterte `stylesInfo`-Objekt wie bisher `headingInfo`.

### 4.5 `src/formats/odt/reader.ts` (geändert)

**a) Normalisierung statt Rohwert** (behebt 2.3). In `parseAutomaticStyles` (Z. 63–66):

```ts
const ODF_ALIGN_TO_SCHEMA: Record<string, string> = { left:'left', center:'center', right:'right', justify:'justify' }
function isRtlParagraphProps(props: Element | null): boolean {
  const wm = props?.getAttributeNS(ODF_NAMESPACES.style, 'writing-mode')
  return !!wm && wm.startsWith('rl')
}
function resolveOdfAlign(raw: string, isRtl: boolean): string {
  if (raw === 'start') return isRtl ? 'right' : 'left'
  if (raw === 'end') return isRtl ? 'left' : 'right'
  return ODF_ALIGN_TO_SCHEMA[raw] ?? 'left'
}
// Z. 66 →:
if (align) paragraphAligns.set(name, resolveOdfAlign(align, isRtlParagraphProps(props)))
```

**b) Stil-Kaskade** (behebt 2.6/ODT). `parseAutomaticStyles` (Z. 37–78) so erweitern, dass
zusätzlich `office:styles` (Familie `paragraph`) eingelesen wird und `style:parent-style-name`
rekursiv aufgelöst wird (Automatikstile haben bei Namenskollision Vorrang, da näher am Absatz),
mit Zyklenschutz nach dem `MAX_NESTING_DEPTH`-Muster (Z. 218). `readOdt` (Z. 357–388) übergibt
dazu zusätzlich das `<office:styles>`-Element aus content.xml **und** styles.xml an die
Auflösung. Ein per `style:parent-style-name` nur geerbtes `fo:text-align` wird darüber
aufgelöst; ein direkt am (Automatik-)Stil gesetztes hat Vorrang.

### 4.6 Writer (keine Änderung)

`docx/writer.ts` (`JC_BY_ALIGN` Z. 18, `paragraphPropsXml` Z. 69–72), `odt/writer.ts`
(Z. 88–97) und `odt/styleRegistry.ts` (Z. 61–93) sind für alle vier kanonischen Werte bereits
korrekt. Kein Fix — die Reader-Fixes (4.4/4.5) garantieren jetzt kanonische `align`-Werte, die
diese Writer korrekt schreiben. Nur neue Tests (Abschnitt 6.3/6.4).

### 4.7 `src/formats/shared/schema.ts` (optional, siehe 2.9 — nicht empfohlen)

Nur falls der Vorfahren-Paste-Fall (2.9) aktiv behoben werden soll: `getAttrs` (Z. 20, 33) auf
`getComputedStyle(dom as HTMLElement).textAlign` umstellen — **zwingend** kombiniert mit einer
`start`/`end`/`""`→kanonisch-Normalisierung (Wiederverwendung der Logik aus 2.3/4.5a), sonst
gelangt `"start"` ins Schema. Verifikation ausschließlich per E2E (jsdom untauglich). Ohne
diesen Fix bleibt 2.9 ein dokumentierter Grenzfall (empfohlen).

---

## 5. Entscheidungen zu den offenen Fragen (`ausrichtung-zentriert-req.md` Abschnitt 9)

| # (Abschnitt 9) | Entscheidung | Ort |
|---|---|---|
| 9.1 Behebung 3.2 als eine Transaktion, ein Undo-Schritt | **Ja**, umgesetzt inkl. Nachweis „ein Klick = ein Undo" | 2.1 / 4.1 / 6.2 |
| 9.2 Formatvorlagen-Wechsel: Bug oder gewollt? | **Bug beheben** — Ausrichtung überträgt sich (Word/LibreOffice-Verhalten) | 2.2 / 4.1 |
| 9.3 Stil-/geerbte Zentrierung beim Import | **Auflösen** (DOCX `w:basedOn`, ODT `parent-style-name`), direkte Formatierung hat Vorrang | 2.6 / 4.4 / 4.5b |
| 9.4 Normalisierung `start`/`end` | **Auf `left`/`right` abbilden** (bidi-/`writing-mode`-bewusst) | 2.3 / 2.7 / 4.4b / 4.5a |
| 9.5 `aria-pressed` bei gemischter Selektion | **Nur aktiv, wenn alle betroffenen Blöcke zentriert** | 2.4 / 4.1 |
| 9.6 Tastenkürzel | **`Mod-e` (Strg/Cmd+E) für „zentriert"**; die drei anderen bewusst den Geschwister-Reqs überlassen | 4.3 / 5.7 |
| 9.7 Tooltip-Text + `aria-label` | **Deutscher `title` (`ALIGN_LABELS`) + `aria-label`** für alle vier | 4.2 |
| 9.8 Tastatur-Erreichbarkeit des `AlignButton` selbst (neu, 3.11/Risiko 12) | **Muss behoben werden**, keine Abwägung (WCAG 2.1.1) — zusätzlicher `onClick`-Handler neben dem bestehenden `onMouseDown`, Mausverhalten unverändert | 2.5 / 4.2 / 6.1(24) |

Ergänzend zu Verdachtsmoment 7.9 (Icon): `↔` → Inline-SVG-Zentrier-Icon **nur für `center`**
(4.2), Geschwister-Icons unverändert.

### 5.7 Warum nur `Mod-e`

`Strg/Cmd+E` ist in keinem verbreiteten Desktop-Browser reserviert und erreicht den Editor
zuverlässig. `Strg+L` (Adressleiste), `Strg+R` (Reload), `Strg+J` (Downloads) sind
browserseitig belegt und von einer reinen Web-App (Vite/React, kein Electron) nicht
zuverlässig abfangbar — unabhängig von `preventDefault()`. Deshalb wird hier nur `center`
belegt (deckungsgleich mit dem Fokus dieser Anforderung); `ausrichtung-links/-rechts/-blocksatz`
klären ihr Kürzel je einzeln mit echter Browser-Verifikation. Damit ist Abschnitt 3.10 /
Abnahmekriterium 4 (offene Entscheidung getroffen, umgesetzt, getestet) erfüllt.

### 5.6 (Nicht-Ziel) Volle RTL-Absatzrichtung

Außerhalb des Umfangs: `dir="rtl"` im Editor-DOM, `w:bidi`/`style:writing-mode` als eigenes
Schema-Attribut, Zeichen-Shaping. Dieser Plan löst nur die **horizontale physische
Ausrichtung** (`start`/`end` → `left`/`right`) unter Nutzung des vorhandenen `w:bidi`/
`writing-mode`-Flags. Empfehlung: eigenständiges Backlog-Item „RTL-Absatzrichtung", Fixture
`rtl.docx`.

---

## 6. Testplan

### 6.1 `tests/e2e/alignment.spec.ts` (neu)

Struktur analog `tests/e2e/docx.spec.ts`/`odt.spec.ts`/`selection-regression.spec.ts`
(`docxCard`/`odtCard`/`errors`-Fixture aus `tests/e2e/fixtures` wiederverwenden). **Dies ist
der erste Test, der `setAlign` über einen echten Button-Klick auslöst** (Abnahmekriterium 5).
Zuordnung der Punkte zu Anforderung Abschnitt 8:

1. Cursor ohne Selektion in einen Absatz → `getByTitle('Ausrichtung: Zentriert').click()` →
   `expect(p).toHaveCSS('text-align','center')`, `aria-pressed="true"`. (TF 1)
2. Text markieren (Ziehen/Doppel-/Dreifachklick) → ganzer Absatz zentriert. (TF 2)
3. **Regressionstest Fehler 1:** ≥3 Absätze, `ControlOrMeta+a`, „Zentriert" → **alle**
   `text-align: center`, `page.on('pageerror')` bleibt leer (`expect(errors).toEqual([])`).
   (TF 3/4/21)
4. Direkt danach **ein** `ControlOrMeta+z` → alle drei zurück auf Ausgangsausrichtung. (TF 4/20)
5. Erneuter Klick bei bereits zentriert → keine Änderung; zweites `Ctrl+z` führt zum Zustand
   **vor** dem Zentrieren (Nachweis: kein leerer Undo-Schritt). (TF 6, Grenzfall 9)
6. „Links"/„Rechts"/„Blocksatz" auf zentriert → korrekt ersetzt. (TF 7)
7. `aria-pressed` bei Cursor in zentriertem Text ohne Selektion. (TF 8)
8. **Regressionstest Fehler 4:** zwei Absätze (einer zentriert, einer links), beide markiert →
   **kein** Ausrichtungs-Button `aria-pressed="true"`. (TF 9)
9. Überschrift (Ebene 1–6) zentrieren → identisch. (TF 10)
10. **Regressionstest Fehler 2:** Absatz zentrieren → Dropdown „Überschrift 1" → bleibt
    zentriert; zurück zu „Standard" → bleibt zentriert; Überschrift 1 → Überschrift 3 → bleibt
    zentriert. (TF 11)
11. Tabelle einfügen, Zelle zentrieren → nur diese Zelle; zusätzlich verbundene Zelle. (TF 12)
12. Bullet- und nummerierte Liste, Eintrag zentrieren → Text zentriert, Symbol bleibt. (TF 13)
13. Zentrierung + Fett + Schriftfarbe im selben Lauf → alle drei sichtbar. (TF 14)
14. Leeren Absatz zentrieren, dann tippen → getippter Text zentriert. (TF 16)
15. Icon-/Tooltip-/`aria-label`-Prüfung: deutscher `title`, unterscheidbares Icon. (TF 17/18)
16. Tastenkürzel `ControlOrMeta+e` zentriert den Absatz. (TF 19)
17. Selection-Sync-Regressionstest (analog `selection-regression.spec.ts`, „Zentriert" als
    Auslöser): „Alles auswählen" → „Zentriert" → Klick-Neupositionierung → Enter → tippen →
    beide Absätze erhalten und zentriert. (TF 21, Grenzfall 11)
18. **(optional, nur falls 4.7 umgesetzt)** echtes Paste von
    `<div style="text-align:center"><p>…</p></div>` → zentriert; sonst als dokumentierter
    Verlust geführt. (TF 15, Grenzfall 10)
19. DOCX-Rundreise eigene Bearbeitung: Absatz zentrieren → Export (`waitForEvent('download')`)
    → Reimport → zentriert; exportiertes `word/document.xml` enthält `<w:jc w:val="center"/>`
    (JSZip). (TF 22/30)
20. ODT-Rundreise eigene Bearbeitung analog; `content.xml` enthält `fo:text-align="center"`
    am referenzierten `Ppara-center`. (TF 23/30)
21. Reale Fixture DOCX: `bug-paragraph-alignment.docx` hochladen → unverändert exportieren →
    `word/document.xml`: Absatz 1 muss **nach dem Fix 4.4** `<w:jc w:val="center"/>` tragen
    (obwohl die Quelle kein direktes `w:jc` an ihm hatte — Nachweis der Stilauflösung). (TF 26)
22. Reale Fixture ODT: `feature_attributes_paragraph_MSO2013.odt` (bzw. bestätigter Kandidat) →
    „Center"-Absatz `center`, „Align Text Right"-Absatz `right` (nicht mehr `end`/`left`). (TF 27/28)
23. `rtl.docx` → Absatz mit `w:bidi`/`jc="start"` als `text-align: right`. (TF 29, Grenzfall 13)
24. **Reine Tastaturbedienung ohne Maus (TF 36, Grenzfall 16, Risiko 12, Entscheidung 9.8) —
    bewusst als letzter, angehängter Punkt geführt, damit die Nummerierung 1–23 und die darauf
    verweisenden Querverweise (`6.1(18)`, `6.1(19–23)`) stabil bleiben:** Editor-Toolbar
    ausschließlich per Tastatur erreichen (wiederholt `page.keyboard.press('Tab')`, **kein**
    `page.mouse.*`/`.click()` im gesamten Testablauf) → zum „Zentriert"-Button navigieren
    (`expect(button).toBeFocused()`) → einmal mit `page.keyboard.press('Enter')`, in einem
    zweiten, unabhängigen Testlauf mit `page.keyboard.press(' ')` auslösen → beide Male
    identisches Ergebnis wie ein Mausklick (`text-align: center`, `aria-pressed` wechselt auf
    `true`). Getrennt von Punkt 16 (Tastenkürzel `ControlOrMeta+e`, TF 19) zu protokollieren:
    Punkt 16 prüft ein zusätzliches globales Kürzel, dieser Punkt prüft die native
    Tastaturauslösbarkeit des `<button>`-Elements selbst unabhängig davon. **Muss vor dem
    `onClick`-Fix aus 4.2 fehlschlagen** (aktuell nur `onMouseDown`, kein `click`-Handler am
    `AlignButton`, Z. 98–101) und danach zuverlässig bestehen — der dauerhafte Regressionsnachweis
    für den in 2.5 geschärften Tastatur-Teilbefund.

### 6.2 `src/formats/shared/editor/__tests__/commands.test.ts` (**ergänzt** — Datei existiert bereits)

Die Datei existiert und testet aktuell nur `canCut`/`cutSelection`. **Ergänzen** (echte
`EditorState`/`EditorView`, `history()`-Plugin):

- `setAlign`: Einzelabsatz; 3-Absatz-Selektion → alle drei geändert, **kein Throw**
  (Regressionstest Fehler 1); No-Op bei bereits gesetztem Wert erzeugt keine weitere
  Transaktion; ein Klick auf Mehrabsatz-Selektion = **ein** `undo()`.
- `isAlignActive`: leere Selektion (Vorfahren-Suche); volle einheitliche Selektion → `true`;
  gemischte Selektion → `false` für **alle vier** Werte (Regressionstest Fehler 4); Selektion
  über `image`/`table` hinweg zählt nur alignierbare Blöcke.
- `setHeading`: `align:'center'` → „Überschrift 1" → bleibt `center`; Überschrift 1 (center) →
  Überschrift 3 → bleibt; Überschrift (center) → Standard → bleibt (nicht `'left'`).

### 6.3 `src/formats/docx/__tests__/roundtrip.test.ts` (ergänzt)

- `w:pStyle` → Stil in `styles.xml` mit `<w:jc w:val="center"/>`, kein direktes `w:jc` →
  importiert als `center` (synthetischer Nachbau von 2.6).
- `w:basedOn`-Kette über zwei Ebenen → korrekt; Zyklus → wirft nicht, bricht nach
  `MAX_STYLE_CHAIN_DEPTH` ab.
- `jc="start"`/`"end"` mit/ohne `<w:bidi/>` (vier Kombinationen) → physisch erwartetes Ergebnis.
- `jc="distribute"`/`"thaiDistribute"`/`"mediumKashida"` → `justify`.
- Zentrierter Absatz in `table_cell` und in `list_item` → Rundreise erhält `align`. (TF 31)
- Leerer zentrierter Absatz → Rundreise erhält `align:'center'`. (Grenzfall 5)
- Absatz zentrieren → `setHeading(2)` (JSON-Aufbau) → Export → Reimport → `align` bleibt
  `center`. (Abschnitt 5.3.4 der Anforderung)
- Ungültiger `align`-Wert `"foo"` → Export schreibt gültiges Fallback-XML, kein Absturz. (TF 35)

### 6.4 `src/formats/odt/__tests__/roundtrip.test.ts` (ergänzt)

Analog 6.3:
- `fo:text-align` nur über `style:parent-style-name` geerbt → korrekt aufgelöst (ODT-Teil 2.6,
  da keine externe Fixture den reinen Vererbungsfall abdeckt).
- `fo:text-align="end"`/`"start"` → `right`/`left`, inkl. `style:writing-mode="rl-tb"`-Variante
  (invertiert). (Regressionstest 2.3)
- Zentrierter Absatz in `table_cell`/`list_item`; leerer zentrierter Absatz;
  Formatvorlagen-Wechsel vor Export.

### 6.5 `src/formats/docx/__tests__/alignment-fixtures.test.ts` (neu)

Dediziert (nicht in `external-fixtures.test.ts`, das nur „importiert ohne Absturz" prüft).
**Diese Tests bestätigen zugleich Befund 2.8** (Eignung der Fixtures):
- `bug-paragraph-alignment.docx`: Absatz 1 → `center` (**muss vor Fix 4.4 fehlschlagen**:
  vorher `left`); Absatz 2 → `left` (direkte Formatierung schlägt durch).
- `rtl.docx`: betroffener Absatz → `right`.
- `table-alignment.docx` / `TestTableCellAlign.docx`: dokumentierender Test, **kein**
  `table_cell`-Absatz mit von `left` abweichendem `align` (verhindert versehentliche
  Wiederverwendung als Ausrichtungs-Fixture; falls sich der Inhalt wider Erwarten doch eignet,
  schlägt der Test an und Befund 2.8 ist zu revidieren).

### 6.6 `src/formats/odt/__tests__/alignment-fixtures.test.ts` (neu)

- `feature_attributes_paragraph_MSO2013.odt`: „Center" → `center`; „Align Text Right" →
  `right` (**muss vor Fix 4.5a fehlschlagen**: vorher `end`); „Justify" → `justify`.
- `CharacterParagraphFormat.odt`: dokumentierender Test zur Eignungsbestätigung (Befund 2.8).

### 6.7 Cross-Format (Anforderung Abschnitt 5.3) — Einschränkung + Umsetzung

**UI-Einschränkung:** Cross-Format-Export (DOCX→ODT / ODT→DOCX über die Oberfläche) ist noch
**kein** Feature — `tests/e2e/roundtrip-fidelity.spec.ts:256–257` führt beide Richtungen
bewusst als `test.skip` („blocked on backlog slug speichern-unter-format"). Die
UI-Rundreise-Testfälle 24/25 der Anforderung sind daher aktuell **nicht** über die Oberfläche
durchführbar und bleiben — mit sichtbarer Begründung — zurückgestellt.

**Ersatz auf Reader/Writer-Ebene** (neu, `src/formats/shared/editor/__tests__/cross-format-
roundtrip.test.ts`, oder Erweiterung, falls durch `fett-code.md` bereits angelegt):
`readDocx(writeDocx(doc))` → `readOdt(writeOdt(Ergebnis))` und umgekehrt, für ein Dokument mit
zentriertem Absatz **kombiniert** mit Fett/Farbe/Überschrift-Ebene → `align:'center'` bleibt
über beide Konvertierungsrichtungen erhalten (Anforderung 5.3.1–5.3.3 / Testfälle 24/25 auf
Datenmodell-Ebene abgedeckt, UI-Ebene dokumentiert zurückgestellt).

---

## 7. Zuordnung zu Verdachtsmomenten (Abschnitt 7) und Abnahmekriterien (Abschnitt 10)

**Verdachtsmomente (Anforderung Abschnitt 7):**

| # | Einstufung | Ort |
|---|---|---|
| 7.1 `setAlign`-RangeError (Mehrabsatz) | bestätigt + behoben | 2.1 / 4.1 / 6.1(3,4) / 6.2 |
| 7.2 `setHeading` reset auf links | bestätigt + behoben | 2.2 / 4.1 / 6.1(10) / 6.2 |
| 7.3 Kein Import stil-/geerbter Zentrierung | bestätigt + behoben | 2.6 / 4.4 / 4.5b / 6.3–6.6 |
| 7.4 Unvollständige `jc`/`text-align`-Tabelle | bestätigt + behoben | 2.3 / 2.7 / 4.4b / 4.5a |
| 7.5 `isAlignActive` nur `$from` | bestätigt + behoben | 2.4 / 4.1 / 6.1(8) |
| 7.6 Kein Enum für `align` | bestätigt; Export-Fallback vorhanden, jetzt getestet | 2.3-Umfeld / 6.3 (TF 35) |
| 7.7 Fehlendes `aria-label` | bestätigt + behoben | 2.5 / 4.2 |
| 7.8 Englischer Tooltip | bestätigt + behoben | 2.5 / 4.2 |
| 7.9 Icon-Rendering/`↔`-Mehrdeutigkeit | bestätigt + behoben (nur `center`) | 2.5 / 4.2 |
| 7.10 Kein Tastenkürzel | Entscheidung: `Mod-e` ergänzt | 4.3 / 5.7 |
| 7.11 Kein Test ruft `setAlign` auf | behoben (E2E klickt Button) | 6.1 |
| 7.12 (neu) `AlignButton` per Tastatur (Tab+Enter/Leertaste) nicht auslösbar, nur `onMouseDown` | bestätigt + behoben | 2.5 / 4.2 / 6.1(24) |

**Abnahmekriterien (Anforderung Abschnitt 10):**

| DoD | Abdeckung |
|---|---|
| 1. Kernfehler 3.2 behoben + Regressionstest (TF 3/4) + Mehrfachabsatz-Rundreise (TF 32) | 2.1 / 4.1 / 6.1(3,4) / 6.2 / 6.3–6.4 |
| 2. Alle Testfälle Abschnitt 8 real ausgeführt + dokumentiert | 6.1–6.6 (Ergebnis bei Vollzug) |
| 3. Jedes Verdachtsmoment Abschnitt 7 eingestuft | Tabelle oben (inkl. 7.12) |
| 4. Offene Entscheidungen Abschnitt 9 (jetzt 1–8, inkl. 9.8) getroffen/umgesetzt/nachgetragen | Abschnitt 5 |
| 5. Mind. 1 E2E klickt den Button (`setAlign`) + Formatvorlagen-Regressionstest (TF 11) + Tastatur-only-Test (TF 36) | 6.1(1,3,10,24) |
| 6. Rundreise DOCX+ODT inkl. Cross-Format/Tabellen/Listen + je 1 reale Datei (TF 26/27) + unabh. Parser (TF 30) | 6.1(19–23) / 6.3–6.7 (Cross-Format-UI dokumentiert zurückgestellt, 6.7) |
| 7. (neu) Fehler aus 3.11/Risiko 12 (Button per Tastatur ohne Maus nicht auslösbar) behoben + dauerhaft durch Testfall 36 abgesichert | 2.5 / 4.2 / 6.1(24) |

---

## 8. Reihenfolge der Umsetzung

1. **`commands.ts`** (4.1) — behebt zuerst den kritischen Fehler 1 (blockiert sonst fast jeden
   Mehrabsatz-Test).
2. **`commands.test.ts`** (6.2, ergänzen) — sichert Fehler 1/2/4 dauerhaft ab.
3. **`Toolbar.tsx` + `WordEditor.tsx`** (4.2/4.3) — Fehler 5, Verdachtsmomente 7.7–7.10 und 7.12
   (Tastatur-Pflichtfix aus 3.11/Risiko 12/Entscheidung 9.8); `WordEditor.tsx` nur eine
   Keymap-Zeile ergänzen, bestehende Bindungen unangetastet.
4. **`alignment.spec.ts`** (6.1, Punkte 1–18 **und** Punkt 24) — sichert die Bedien-Ebene im
   echten Browser; Punkt 24 (reine Tastaturbedienung ohne Maus, TF 36) gehört inhaltlich hierher
   und wird nur aus Nummerierungsgründen am Ende der Liste geführt (siehe Abschnitt 6.1).
5. **`docx/reader.ts`** (4.4) und **`odt/reader.ts`** (4.5) — größte Änderungen; direkt danach
   6.3/6.4/6.5/6.6.
6. **(optional) `schema.ts`** (4.7) — nur mit Normalisierung; Test ausschließlich E2E (6.1(18)).
7. `alignment.spec.ts` Punkte 19–23 + Cross-Format-Reader/Writer-Test (6.7).
8. Abschließend: `ausrichtung-zentriert-req.md` um die in Abschnitt 5 getroffenen Entscheidungen
   ergänzen (Kürzel, Tooltip, Icon, Stil-/`start`/`end`-Auflösung, `aria-pressed`-Regel) —
   dieser Plan ändert die Anforderungsdatei selbst nicht.
