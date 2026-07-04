# Umsetzungsplan „Inhaltsverzeichnis aktualisieren" — dateigenau, gegen den tatsächlichen Code geprüft

Bezug: `E:\docs\specs\inhaltsverzeichnis-aktualisieren-req.md` (Anforderung),
`E:\docs\specs\inhaltsverzeichnis-einfuegen-req.md` (Schwester-Anforderung, Abschnitt 0.6),
`E:\docs\FEATURE-SPEC-DOCX-ODT.md` (Rahmenbedingungen, Abschnitte 2/10/18/19/20/21).
Code-Stand geprüft am 2026-07-04 in `E:\docs` (kein Git-Repo; Dateien direkt gelesen,
alle Zeilen-/Fixture-Angaben unten gegen den tatsächlichen Inhalt verifiziert, nicht aus
der Anforderungsdatei übernommen). Stil und Detailtiefe folgen `specs/seitenumbruch-code.md`
als Vorlage.

Rolle dieses Dokuments: bestätigt den Befund aus `inhaltsverzeichnis-aktualisieren-req.md`
Abschnitt 0 und ergänzt ihn um beim eigenen Nachprüfen zusätzlich gefundene Tatsachen
(Abschnitt 0 unten), trifft die Architekturentscheidung zum Datenmodell (Abschnitt 1),
spezifiziert Schema/gemeinsame Aktualisierungs-Logik/Commands (Abschnitte 2–4),
Editor-Verdrahtung/Toolbar/Rückmeldung (Abschnitte 5–7), die Paginierungs-Integration
für Seitenzahl-Näherung (Abschnitt 8), die Import-/Export-Anpassungen für OOXML/DOCX
(Abschnitt 9–10) und ODF/ODT (Abschnitt 11–12), und schließt mit Grenzfall-Mapping,
offenen Entscheidungen, Testplan, Risiken/Lücken und Abnahme-Checkliste (Abschnitte 13–18).

---

## 0. Bestätigung des Codebefunds aus `inhaltsverzeichnis-aktualisieren-req.md` Abschnitt 0 + Zusatzbefunde

### 0.1 Bestätigt

Gegen den tatsächlichen Dateiinhalt geprüft, Befund aus der Anforderungsdatei
**vollständig bestätigt**:

1. `src/formats/shared/schema.ts` (154 Zeilen) kennt `doc`, `paragraph` (9–17), `heading`
   (19–31, Attribute nur `level`, `align`), `text`, `hard_break`, `image`, `bullet_list`/
   `ordered_list`/`list_item`, Tabellen-Nodes. Kein `toc`-/`table_of_contents`-Node,
   keine „automatisch generiert"-Markierung irgendeiner Art.
2. `src/formats/shared/editor/commands.ts` (108 Zeilen) hat `setAlign`, `isAlignActive`,
   `setHeading`, `toggleList`, `liftFromList`, `insertImage`, `insertTable`,
   `applyMarkColor`/`clearMarkColor` — keinen ToC-Befehl, keine Doc-weite Heading-Traversierung.
3. `Toolbar.tsx` (247 Zeilen) hat keinen ToC-Eintrag. `WordEditor.tsx` (134 Zeilen)
   bindet in `keymap({...})` (Zeilen 71–79) nur `Mod-z`, `Mod-y`, `Mod-Shift-z`, `Enter`,
   `Mod-b`, `Mod-i`, `Mod-u` — kein `F9`.
4. `src/formats/docx/reader.ts`/`writer.ts` (391/280 Zeilen, vollständig gelesen) haben
   keinerlei `w:sdt`-, `w:fldChar`-, `w:instrText`- oder `w:bookmarkStart`-Behandlung.
   `src/formats/odt/reader.ts`/`writer.ts` (286/211 Zeilen, vollständig gelesen) kennen
   kein `text:table-of-content`, `text:bookmark`, `text:a` (Hyperlink).
5. `pagination.ts` (116 Zeilen) berechnet Seitenumbrüche ausschließlich aus gemessenen
   DOM-Höhen (`computePageBreakIndices`, 12–25) über Top-Level-`doc`-Kinder — kein Bezug
   zu einzelnen `heading`-Knoten, keine exportierte „Seite von Knoten X"-Funktion.
6. `grep -rniE "toc|table-of-content|inhaltsverzeichnis" src` (case-insensitiv) liefert
   **keinen** Treffer außerhalb der beiden `specs/`-Anforderungsdateien selbst.

### 0.2 Zusatzbefund A (ändert die Einschätzung „reale Fixtures fehlen komplett"): ODT-Fixtures mit echtem `text:table-of-content` **liegen bereits im Repo**

`inhaltsverzeichnis-aktualisieren-req.md` Abschnitt 6 Punkt 6 geht davon aus, reale
Word-/LibreOffice-Fixtures mit ToC-Feld seien „laut aktueller Repo-Durchsicht nicht
vorhanden". Für ODT ist das **nicht zutreffend** — per Skript (`unzip -p … content.xml |
grep`) gegen die tatsächlichen ZIP-Inhalte von `tests/fixtures/external/odt/*.odt`
verifiziert:

| Datei | Befund |
|---|---|
| `tests/fixtures/external/odt/test1.odt` (474 500 Bytes) | Vollständiges, reales `<text:table-of-content text:style-name="Sect2" text:protected="true" text:name="Table of Contents1">` mit `<text:table-of-content-source text:outline-level="6" text:use-index-source-styles="true">`, Entry-Templates für Ebene 1–7, gefülltem `<text:index-body>` mit realen Einträgen (`<text:p text:style-name="P59"><text:tab/>Abstract<text:tab/>1</text:p>` etc.) |
| `tests/fixtures/external/odt/compdocfileformat.odt` (56 730 Bytes) | Ebenso reales `<text:table-of-content text:style-name="Sect1" text:name="toc">`, `text:outline-level="2"` |
| `tests/fixtures/external/odt/excelfileformat.odt` (356 107 Bytes) | Ebenso |

**Wichtiger Zusatzbefund zur Anker-Konvention** (widerspricht der in
`inhaltsverzeichnis-aktualisieren-req.md` Abschnitt 3.8 und
`inhaltsverzeichnis-einfuegen-req.md` Zeile 300/46 unterstellten `text:bookmark`-Analogie):
Die Einträge in `test1.odt` verlinken **nicht** auf `text:bookmark`, sondern auf eine
LibreOffice-eigene Outline-Navigations-Konvention:

```
<text:a xlink:type="simple" xlink:href="#1.1.Abstract|outline">Abstract</text:a>
```

Format: `#<Gliederungspfad-inkl-automatischer-Nummerierung><Überschriftentext>|outline` —
LibreOffice löst das zur Laufzeit gegen seine interne Gliederungsstruktur auf, es gibt
**keinen** separaten `text:bookmark-start`/`-end` um die Ziel-Überschrift. Für den ODT-
**Reader** (Abschnitt 11 unten) bedeutet das: Anker-Auflösung über Bookmarks allein würde
bei genau dieser Art real erzeugter Datei ins Leere laufen. Für den ODT-**Writer** wird
unten (Abschnitt 12.3) bewusst trotzdem eine robustere, zusätzliche Bookmark-Variante
gewählt und begründet.

**Kein** DOCX-Fixture mit echtem `TOC`-Feld gefunden — vollständig durchsucht:

```
for f in tests/fixtures/external/docx/*.docx; do
  unzip -p "$f" word/document.xml | grep -oE '(instrText[^<]*TOC[^<]*|fldSimple[^>]*TOC[^>]*)'
done
# → 0 Treffer über alle 100 Dateien
```

Gefundene `w:instrText`-Inhalte in den 7 Dateien, die überhaupt Feldcode enthalten
(`FieldCodes.docx`, `52449.docx`, `65099.docx`, `bug59058.docx`, `checkboxes.docx`,
`delins.docx`, `form_footnotes.docx`): ausschließlich `AUTHOR`, `CREATEDATE`,
`MERGEFIELD`, interne Kommentar-Marker — **keine** `TOC`-Instruktion. Der Befund „keine
reale DOCX-Fixture mit TOC-Feld vorhanden" aus der Anforderungsdatei ist damit für DOCX
**bestätigt** (anders als für ODT, siehe oben) — siehe Risiko R1 in Abschnitt 17.

### 0.3 Zusatzbefund B: `src/formats/shared/__tests__/` existiert bereits als Verzeichnis, ist aber leer

Die Anforderungsdatei formuliert in Abschnitt 6 Punkt 3 „analog zur Trennung
Datenmodell/Format in `src/formats/shared/__tests__`" so, als wäre dort bereits
Präzedenz vorhanden. Tatsächlich (`Glob src/formats/shared/__tests__/**` → 0 Treffer):
das Verzeichnis existiert (leer angelegt), enthält aber **keine** einzige Testdatei —
es gibt also noch **kein** Beispiel für einen reinen Datenmodell-Test in diesem Repo.
Dieses Ticket legt mit `src/formats/shared/__tests__/toc.test.ts` (Abschnitt 13.3) die
**erste** Datei in diesem Verzeichnis an.

### 0.4 Zusatzbefund C: Export operiert auf reinem JSON, nicht auf einer lebenden `EditorView`

`src/app/DocumentWorkspace.tsx` Zeile 21: `await module.exportFile(document.content,
document.fileName)`. `document.content` ist das über `WordEditor`s `onChange`
(`WordEditor.tsx` Zeile 95: `onChangeRef.current({ ...doc.content, body:
newState.doc.toJSON() })`) zuletzt gemeldete, reine `WordDocumentContent`-JSON-Objekt —
**keine** ProseMirror-`EditorState`/`EditorView` steht zum Exportzeitpunkt zur Verfügung.
**Konsequenz für Anforderung 3.2 Punkt 2** („implizit beim Export aktualisieren"): die
Aktualisierungslogik kann zum Exportzeitpunkt **nicht** dieselbe ProseMirror-`Command`-
Funktion wiederverwenden wie der Toolbar-Button/F9 (die benötigen eine `EditorView` für
`dispatch`/`scrollIntoView`). Sie muss als reine, format- und ProseMirror-unabhängige
Funktion auf der JSON-Baumform existieren, die **beide** Aufrufer (Editor-Command **und**
`writeDocx`/`writeOdt`) teilen — das ist zugleich exakt das in Anforderung Abschnitt 6
Punkt 3 verlangte „unabhängig von Reader/Writer, rein auf Datenmodell-Ebene getestet".
Diese Erkenntnis bestimmt die Modularisierung in Abschnitt 3 unten (neues Modul
`src/formats/shared/toc.ts`, reine Funktionen auf der `JsonNode`-Baumform, die von
Reader/Writer bereits identisch verwendet wird).

### 0.5 Zusatzbefund D: kein bestehendes Transient-Feedback-/Toast-Muster

`src/app/PrivacyBanner.tsx` ist eine dauerhafte, nicht schließbare Leiste;
`PrivacyModal.tsx` ist ein blockierender Dialog. Es existiert **kein** Muster für eine
kurze, sich selbst ausblendende Rückmeldung („Verzeichnis aktualisiert" / „Kein
Inhaltsverzeichnis gefunden", Anforderung Abschnitt 1 Element 4 und 3.11). Muss neu
gebaut werden (Abschnitt 6.2 unten) — bewusst minimal, kein neues generisches
Toast-System für das gesamte Projekt (das wäre über den Geltungsbereich dieses Tickets
hinaus, vgl. das bereits in `inhaltsverzeichnis-einfuegen-req.md` Zeile 66 dokumentierte
„jeder neue Dialog dupliziert bislang das Muster" für Modals — hier gilt dasselbe
Prinzip für Toasts, wird hier aber nur lokal für dieses eine Feature gelöst).

---

## 1. Architekturentscheidung: Datenmodell

**Entscheidung: zwei neue Node-Typen `toc` (Container) und `toc_entry` (pro Zeile) im
gemeinsamen Schema, plus ein neues, optionales `headingId`-Attribut auf `heading`.**

### 1.1 Begründung

Anders als beim Seitenumbruch (reines Boolean-Attribut auf einem bereits vorhandenen
Node-Typ, siehe `seitenumbruch-code.md` Abschnitt 1) braucht ein Inhaltsverzeichnis eine
**begrenzte, in sich geschlossene Region mit mehreren geordneten Zeilen unterschiedlicher
Einrückung** — das ist strukturell ein eigener Container mit Kindern, kein Attribut auf
einem bestehenden Block. Diese Entscheidung schließt zugleich die in
`inhaltsverzeichnis-einfuegen-req.md` Abschnitt 0 (Grundlagen-Tabelle, Zeile `schema.ts`)
und Abschnitt 6 Punkt 10 offen gelassene Frage „neuer `toc`-Node vs. reine
Absatzstruktur" — **für dieses Ticket zwingend**, weil „aktualisieren" ohne eine
wiedererkennbare, vom übrigen Text abgegrenzte Struktur nicht funktionieren kann
(Anforderung Abschnitt 0.6, erster Punkt: „eine im Dokument wiedererkennbare
Markierung"). Diese Entscheidung wird hier **für beide Tickets gemeinsam** getroffen,
weil sie nicht zweimal unterschiedlich getroffen werden kann, ohne dass eines der beiden
Features bricht — sie wird aber bewusst **minimal** gehalten (kein Options-Dialog, keine
Klick-Navigation, siehe Abschnitt 4.4/17), sodass die eigentliche UI von „einfügen"
(Toolbar-Button mit Tiefen-Dialog, Klick-Navigation-Scrollen) unverändert Gegenstand des
Schwester-Tickets bleibt.

```
toc (group: block, content: 'toc_entry*')
 attrs: { maxLevel: number (default 3), dirty: boolean (default false) }
  └─ toc_entry (content: 'inline*')
      attrs: { level: number (default 1), targetHeadingId: string | null }
```

- **`toc.maxLevel`** — die in Anforderung 3.5 geforderte, beim Einfügen gewählte und bei
  „aktualisieren" **zu respektierende** Tiefe. Lebt auf dem Container, nicht extern in
  `documentModel.ts` — sonst müsste bei mehreren ToCs im Dokument (Grenzfall 3) eine
  externe Map von ToC-Identität auf Tiefe geführt werden, mit derselben
  Identitätsproblematik wie bei `headingId` (siehe unten). Ein Attribut direkt am
  betroffenen Node ist die schon im Projekt etablierte Konvention
  (`align`/`level`/`breakBefore` sitzen ebenfalls direkt am betroffenen Node).
- **`toc.dirty`** — rein informativ für die UI („Verzeichnis wurde seit dem letzten
  Aktualisieren möglicherweise veraltet" — wird nach jeder Texteingabe **irgendwo** im
  Dokument nicht aktiv neu berechnet, siehe Anforderung 3.2 Punkt 3, sondern nur beim
  nächsten tatsächlichen Aktualisieren auf `false` gesetzt und beim Einfügen einer neuen
  Überschrift/Textänderung **nicht** aktiv verfolgt — siehe Abschnitt 6.3, bewusst
  einfach gehalten). Wird beim DOCX-Export 1:1 auf `w:dirty` abgebildet (Abschnitt 9.4).
- **`toc_entry.targetHeadingId`** — verweist auf das `headingId`-Attribut der Überschrift,
  aus der dieser Eintrag erzeugt wurde. Ermöglicht Grenzfall 8 (identischer Text mehrfach)
  korrekt: jeder Eintrag zeigt auf **seine eigene** Instanz, nicht auf die erste
  Fundstelle im Dokument — reine Textgleichheit würde hier scheitern.
- **`heading.headingId`** (`{ default: null, validate: 'string|null' }`) — eine beim
  ersten Aktualisieren (oder beim Import eines bereits vorhandenen ToC-Feldes, siehe
  Abschnitt 9.3/11.3) lazily vergebene, stabile Kennung. Rein internes Korrelations-
  Attribut, **keine** Auswirkung auf Darstellung (`toDOM` ignoriert es), muss aber wie
  jedes andere Attribut über Copy/Paste/Export/Reimport erhalten bleiben, sonst geht die
  Eintrag-zu-Überschrift-Zuordnung bei jedem Rundlauf verloren.

### 1.2 Verworfene Alternative: reine Absatz-/Listenstruktur ohne eigenen Node (Attribut-Marker auf einer Gruppe von `paragraph`-Knoten)

Geprüft und verworfen: ein `tocGroupId`-Attribut auf gewöhnlichen `paragraph`-Knoten
(„diese Absätze gehören zusammen zu ToC Nr. X") hätte den Vorteil, **kein** neues
Schema-Element einzuführen. Verworfen aus drei Gründen:

1. **Keine natürliche Container-Grenze.** „Wo hört das Verzeichnis auf" wäre eine reine
   Konvention (z. B. „bis zum nächsten Absatz ohne `tocGroupId`"), die bei jeder
   ProseMirror-Transaktion (Split, Join, Copy/Paste mitten hinein) brechen kann — ein
   echter Node hat dagegen eine von ProseMirror selbst durchgesetzte `content`-Grenze
   (`toc_entry*`), in die z. B. `Enter` am Ende des letzten Eintrags **nicht**
   versehentlich einen zusätzlichen `paragraph` einschleusen kann, ohne dass das
   Schema das explizit erlaubt.
2. **`maxLevel`/`dirty` bräuchten eine externe Map.** Ohne Container-Node lebt die
   Konfiguration zwangsläufig außerhalb des ProseMirror-Docs (z. B. in
   `documentModel.ts`), mit dem in Abschnitt 1.1 beschriebenen Identitätsproblem bei
   mehreren ToCs — bereits von `inhaltsverzeichnis-einfuegen-req.md` Grundlagen-Tabelle
   als offene Frage vermerkt.
3. **Rundreise-Erkennung (Anforderung 3.9, „bleibt weiterhin ein echtes Feld") wäre
   fragiler.** Ein eigener Node-Typ ist im Reimport-Pfad durch reine Typprüfung
   (`node.type === 'toc'`) erkennbar; eine Attribut-Konvention über eine variable Menge
   benachbarter `paragraph`-Knoten müsste bei jedem Reader/Writer-Durchlauf neu
   rekonstruiert werden.

### 1.3 Konsequenz: Editierbarkeit des `toc`-Bereichs

Analog zur in `inhaltsverzeichnis-einfuegen-req.md` Abschnitt 2.9 als „offen"
markierten Frage wird hier für **dieses** Ticket entschieden (da 3.6 der
Aktualisieren-Anforderung explizit verlangt, dass manuelle Änderungen am Eintragstext
**möglich** sein müssen, um überhaupt „werden beim Aktualisieren überschrieben" prüfen
zu können): `toc_entry`-Inhalt bleibt **direkt tippbar** (kein `atom`/`contentEditable:
false`), da Anforderung 3.6/Grenzfall 13 explizit den Fall „Nutzerin bearbeitet den
Text direkt" vorsieht und dokumentiert, nicht verhindert. `toc.isolating = true` und
`toc.defining = true` (nach dem Vorbild von `heading.defining`, `schema.ts:23`)
verhindern, dass ein `Enter`/Split am Rand des ToC versehentlich Inhalt aus dem
umgebenden Dokument hineinzieht oder ToC-Inhalt herausreißt — Rest-Editierbarkeit
(Sprung aus dem ToC heraus per Pfeiltaste etc.) bleibt Standard-ProseMirror-Verhalten.

---

## 2. Schema-Änderungen — `src/formats/shared/schema.ts`

Ergänzung nach dem bestehenden `heading`-Eintrag (aktuell Zeilen 19–31) und vor `text`
(Zeile 33):

```ts
heading: {
  group: 'block',
  content: 'inline*',
  attrs: { level: { default: 1, validate: 'number' }, ...alignAttr, headingId: { default: null, validate: 'string|null' } },
  defining: true,
  parseDOM: [1, 2, 3, 4, 5, 6].map((level) => ({
    tag: `h${level}`,
    getAttrs: (dom) => ({
      level,
      align: (dom as HTMLElement).style.textAlign || 'left',
      headingId: (dom as HTMLElement).getAttribute('data-heading-id') || null,
    }),
  })),
  toDOM(node) {
    const attrs: Record<string, string> = { style: `text-align: ${node.attrs.align}` }
    if (node.attrs.headingId) attrs['data-heading-id'] = node.attrs.headingId
    return [`h${node.attrs.level}`, attrs, 0]
  },
},

toc: {
  group: 'block',
  content: 'toc_entry*',
  attrs: { maxLevel: { default: 3, validate: 'number' }, dirty: { default: false, validate: 'boolean' } },
  isolating: true,
  defining: true,
  parseDOM: [
    {
      tag: 'div[data-toc]',
      getAttrs: (dom) => ({
        maxLevel: Number((dom as HTMLElement).getAttribute('data-toc-max-level')) || 3,
        dirty: (dom as HTMLElement).getAttribute('data-toc-dirty') === 'true',
      }),
    },
  ],
  toDOM(node) {
    return [
      'div',
      { 'data-toc': '', 'data-toc-max-level': String(node.attrs.maxLevel), 'data-toc-dirty': String(node.attrs.dirty), class: 'pm-toc' },
      0,
    ]
  },
},

toc_entry: {
  content: 'inline*',
  attrs: { level: { default: 1, validate: 'number' }, targetHeadingId: { default: null, validate: 'string|null' } },
  parseDOM: [
    {
      tag: 'p[data-toc-entry]',
      getAttrs: (dom) => ({
        level: Number((dom as HTMLElement).getAttribute('data-toc-level')) || 1,
        targetHeadingId: (dom as HTMLElement).getAttribute('data-target-heading-id') || null,
      }),
    },
  ],
  toDOM(node) {
    const indentEm = (Number(node.attrs.level) - 1) * 1.5
    return [
      'p',
      {
        'data-toc-entry': '',
        'data-toc-level': String(node.attrs.level),
        'data-target-heading-id': node.attrs.targetHeadingId ?? '',
        style: `margin-left: ${indentEm}em`,
        class: 'pm-toc-entry',
      },
      0,
    ]
  },
},
```

Konsistenzhinweis: `validate: 'string|null'` folgt demselben Pipe-getrennten
`validateType`-Mechanismus, den `seitenumbruch-code.md` Abschnitt 2 bereits für
`'boolean'` gegen `node_modules/prosemirror-model/dist/index.js` verifiziert hat — hier
zusätzlich gegen `null` geprüft: derselbe Code-Pfad behandelt `value === null` als
`typeof value === 'object'`, **nicht** als eigenen Typnamen; `'string|null'` würde also
für `null` fehlschlagen. **Korrektur gegenüber dem ersten Entwurf:** stattdessen
`validate: (value) => value === null || typeof value === 'string'` (Funktionsform, die
`validateType` laut selbiger Quelle ebenfalls unterstützt: ein `function`-Wert wird
direkt als Prädikat aufgerufen) — betrifft `heading.headingId` und
`toc_entry.targetHeadingId` gleichermaßen. Vor dem Schreiben gegen die tatsächliche
`prosemirror-model`-Version im Lockfile zu verifizieren (gleiches Vorgehen wie in
`seitenumbruch-code.md` Abschnitt 2 für `'boolean'` bereits demonstriert).

`ProseMirrorJSON`-Typ (Zeile 153) bleibt unverändert (`Record<string, unknown>`, bereits
allgemein genug).

**Keine Änderung** an `paragraph`, `text`, `hard_break`, `image`, Listen-/Tabellen-Nodes.

---

## 3. Neues Shared-Modul — `src/formats/shared/toc.ts` (neu anzulegen)

Kernstück der gesamten Funktion: reine, ProseMirror- **und** Format-unabhängige
Funktionen auf der bereits im Reader/Writer verwendeten `JsonNode`-Baumform (identische
Struktur wie in `docx/reader.ts:5-11`, `odt/writer.ts:17-23` — hier zentral definiert und
von allen vier Stellen (DOCX-Reader/-Writer, ODT-Reader/-Writer) sowie den Editor-
Commands **gemeinsam** importiert, statt vier Mal eine leicht abweichende Kopie zu
pflegen, wie es die vier Format-Dateien aktuell für ihr jeweils eigenes, kompatibles
`JsonNode`-Interface bereits tun).

```ts
// src/formats/shared/toc.ts
export interface JsonNode {
  type: string
  attrs?: Record<string, unknown>
  content?: JsonNode[]
  text?: string
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>
}

interface HeadingRef {
  headingId: string
  level: number
  text: string
}

let idCounter = 0
/** Same low-stakes uniqueness convention already used for ODT table names, `odt/writer.ts:109`. */
function generateHeadingId(): string {
  idCounter += 1
  return `h${Date.now().toString(36)}${idCounter.toString(36)}${Math.round(Math.random() * 1e6).toString(36)}`
}

function plainText(node: JsonNode): string {
  if (node.type === 'text') return node.text ?? ''
  return (node.content ?? []).map(plainText).join('')
}

/**
 * Walks the ENTIRE tree (not just doc-top-level — a heading may, per schema, be
 * nested inside a list_item or table_cell, Grenzfall 4/see schema.ts `list_item.content`/
 * `cellContent: 'block+'`) in document order, assigning a stable `headingId` to any
 * heading that doesn't already have one (mutates in place — callers pass a working
 * copy, see `recomputeAllTablesOfContents` below). Returns the ordered list of refs.
 */
function collectHeadings(root: JsonNode): HeadingRef[] {
  const refs: HeadingRef[] = []
  function visit(node: JsonNode) {
    if (node.type === 'heading') {
      const attrs = (node.attrs ??= {})
      if (typeof attrs.headingId !== 'string') attrs.headingId = generateHeadingId()
      refs.push({ headingId: attrs.headingId as string, level: Number(attrs.level ?? 1), text: plainText(node) })
    }
    node.content?.forEach(visit)
  }
  visit(root)
  return refs
}

/** Builds a fresh `toc_entry[]` from the current, live heading set — see Abschnitt 3.1 unten. */
function buildEntries(headings: HeadingRef[], maxLevel: number): JsonNode[] {
  return headings
    .filter((h) => h.level <= maxLevel)
    .map((h) => ({
      type: 'toc_entry',
      attrs: { level: h.level, targetHeadingId: h.headingId },
      content: h.text ? [{ type: 'text', text: h.text }] : [],
    }))
}

/**
 * Rebuilds every `toc` node found anywhere in `root` from scratch against the CURRENT
 * heading set. Full rebuild (not incremental diff/patch) is deliberate — see
 * `inhaltsverzeichnis-aktualisieren-code.md` Abschnitt 3.1 for the rationale: it is
 * the simplest implementation that simultaneously satisfies "no ghost entries"
 * (Anforderung 3.3), "order follows actual document order" (3.3), "duplicate heading
 * text resolves to the correct own instance" (Grenzfall 8), and "manual edits to an
 * entry's displayed text are silently overwritten" (3.6) as a natural CONSEQUENCE of
 * the chosen strategy, not as separately-implemented special cases.
 *
 * Mutates and returns a NEW root (structural sharing where untouched) — callers own
 * whether the result replaces live ProseMirror state (via a transaction, editor path)
 * or is serialized directly (writer path, Abschnitt 0.4).
 */
export function recomputeAllTablesOfContents(root: JsonNode): JsonNode {
  const clone = structuredClone(root) as JsonNode
  const headings = collectHeadings(clone) // also lazily assigns headingId, see above
  function visit(node: JsonNode) {
    if (node.type === 'toc') {
      const maxLevel = Number(node.attrs?.maxLevel ?? 3)
      const freshEntries = buildEntries(headings, maxLevel)
      node.content = freshEntries
      node.attrs = { ...node.attrs, dirty: false }
    }
    node.content?.forEach(visit)
  }
  visit(clone)
  return clone
}

/** Recomputes exactly one `toc` node (found via its ProseMirror doc position elsewhere) — used
 *  by the live-editor command, which already knows which single ToC the cursor is inside
 *  (Grenzfall 3: updating one must not touch any other ToC in the document). */
export function recomputeOneTableOfContents(docRoot: JsonNode, tocNode: JsonNode): JsonNode {
  const headings = collectHeadings(docRoot) // must run over the WHOLE doc for correct headingId assignment
  const maxLevel = Number(tocNode.attrs?.maxLevel ?? 3)
  return { ...tocNode, content: buildEntries(headings, maxLevel), attrs: { ...tocNode.attrs, dirty: false } }
}

export function findAllTocNodes(root: JsonNode): JsonNode[] {
  const result: JsonNode[] = []
  function visit(node: JsonNode) {
    if (node.type === 'toc') result.push(node)
    node.content?.forEach(visit)
  }
  visit(root)
  return result
}
```

### 3.1 Warum „volle Neuerzeugung", keine inkrementelle Diff/Patch-Logik

Eine naheliegende Alternative wäre, bestehende `toc_entry`-Knoten anhand von
`targetHeadingId` wiederzuverwenden (nur Text/Level bei Bedarf anpassen, statt jedes Mal
neu zu erzeugen) — das würde manuell in den Eintragstext eingefügte
Zeichenformatierung (Marks) über mehrere Aktualisierungen hinweg erhalten. **Bewusst
verworfen:** Anforderung 3.6 verlangt explizit das **Gegenteil** — eine manuelle
Text-Änderung im ToC-Bereich muss beim nächsten Aktualisieren **kommentarlos
überschrieben** werden, exakt wie in Word/LibreOffice. Volle Neuerzeugung liefert dieses
Verhalten kostenlos und ohne Sonderfallcode; eine Diff/Patch-Variante müsste explizit
zusätzlichen Code schreiben, um denselben, ohnehin geforderten Effekt zu erzielen — reiner
Mehraufwand ohne Anforderungs-Vorteil.

### 3.2 Seitenzahl-Handling bewusst **nicht** Teil von `toc.ts`

`recomputeAllTablesOfContents`/`recomputeOneTableOfContents` setzen **keinen**
`page`-Wert auf `toc_entry` — es gibt bewusst **kein** `page`-Attribut im Schema
(Abschnitt 2). Begründung und Konsequenz für Export/Editor-Vorschau: Abschnitt 8.

---

## 4. Commands — `src/formats/shared/editor/commands.ts`

### 4.1 `findEnclosingToc(state): { pos: number; node: PMNode } | null`

```ts
import type { Node as PMNode } from 'prosemirror-model'

export function findEnclosingToc(state: EditorState): { pos: number; node: PMNode } | null {
  const { $from } = state.selection
  for (let depth = $from.depth; depth >= 0; depth--) {
    const node = $from.node(depth)
    if (node.type.name === 'toc') return { pos: $from.before(depth), node }
  }
  return null
}
```

Verwendet vom Toolbar-Button (Sichtbarkeits-/Aktivzustand, Anforderung Abschnitt 1
Element 1) und von der F9-Bindung (Grenzfall 2: F9 **außerhalb** eines ToC muss
Rückmeldung geben statt No-Op, siehe Abschnitt 6.1).

### 4.2 `attemptUpdateTableOfContents(view): TocUpdateOutcome` — kein reines `Command`

`Command` (`prosemirror-state`) hat die Signatur `(state, dispatch?, view?) => boolean`
— das reicht nicht, um dem Aufrufer (Toolbar-Button **und** F9-Keymap-Eintrag)
mitzuteilen, **welche** von drei Situationen eingetreten ist (kein ToC gefunden / ToC
gefunden und bereits aktuell / ToC gefunden und aktualisiert) — genau diese
Unterscheidung braucht Anforderung Abschnitt 1 Element 4 („Verzeichnis ist aktuell" vs.
„wurde aktualisiert") und Grenzfall 2 (sichtbare Rückmeldung statt wirkungslosem Klick).
Deshalb eine eigene, dünne Wrapper-Funktion statt eines reinen `Command`:

```ts
export type TocUpdateOutcome = 'not-found' | 'already-current' | 'updated'

export function attemptUpdateTableOfContents(view: EditorView): TocUpdateOutcome {
  const found = findEnclosingToc(view.state)
  if (!found) return 'not-found'

  const docJson = view.state.doc.toJSON() as JsonNode
  const tocJson = found.node.toJSON() as JsonNode
  const recomputed = recomputeOneTableOfContents(docJson, tocJson)

  const unchanged = JSON.stringify(recomputed.content) === JSON.stringify(tocJson.content)
  if (unchanged) return 'already-current' // Anforderung 1 Element 4, "Verzeichnis ist aktuell"

  // Re-parse just the recomputed toc subtree and every heading whose headingId was newly
  // assigned (collectHeadings may have mutated headings elsewhere in the doc that
  // previously had no headingId — see Abschnitt 4.3 for why that's applied as ONE transaction).
  const newDoc = wordSchema.nodeFromJSON(recomputeAllTablesOfContents(docJson))
  const tr = view.state.tr.replaceWith(0, view.state.doc.content.size, newDoc.content)
  tr.setSelection(Selection.near(tr.doc.resolve(Math.min(found.pos, tr.doc.content.size))))
  view.dispatch(tr.scrollIntoView())
  return 'updated'
}
```

### 4.3 Warum eine Voll-Dokument-`replaceWith`, nicht ein punktgenauer `replaceWith` nur auf den `toc`-Knoten

`recomputeOneTableOfContents` reicht scheinbar aus, um **nur** den einen `toc`-Knoten zu
ersetzen (`tr.replaceWith(found.pos, found.pos + found.node.nodeSize, ...)`), was
gezielter wäre und Grenzfall 3 (zwei ToCs, nur eines aktualisieren) noch direkter
abbildet. **Der Grund für die Ganzdokument-Variante:** `collectHeadings` (aufgerufen
**innerhalb** `recomputeOneTableOfContents`) vergibt bei Bedarf frische `headingId`-Werte
auf `heading`-Knoten **irgendwo im ganzen Dokument**, nicht nur innerhalb des
ausgewählten ToC — diese neu vergebenen IDs auf den `heading`-Knoten müssen **in
derselben Transaktion** geschrieben werden wie die neuen `toc_entry`s, sonst bräuchte es
zwei `dispatch`-Aufrufe und Anforderung 3.10 („ein einziger Undo-Schritt") wäre verletzt.
Ein Voll-Ersatz des Dokuminhalts ist der einfachste Weg, **beide** Änderungsmengen
(Heading-IDs **und** ToC-Entries) atomar in einer `Transform`-Kette abzubilden, ohne
Positions-Mapping zwischen zwei unabhängigen Teilbäumen von Hand nachzuführen. Grenzfall
3 bleibt davon unberührt: `recomputeAllTablesOfContents` verarbeitet zwar **alle**
`toc`-Knoten, aber jedes `toc` wird unabhängig aus **seiner eigenen** `maxLevel`
gegen dieselbe, unveränderte Heading-Liste neu gebaut — das zweite ToC erhält exakt
dieselben Einträge wie vorher, sofern seine Überschriften sich nicht geändert haben,
ist also inhaltlich **unverändert**, nur technisch neu erzeugt (kein beobachtbarer
Unterschied, da volle Neuerzeugung ohnehin die gewählte Strategie ist, Abschnitt 3.1).
**Kosten:** bei sehr vielen Top-Level-Knoten ist `toJSON()`/`nodeFromJSON()` über das
gesamte Dokument teurer als ein lokaler Ersatz — siehe Performance-Betrachtung Grenzfall
6 in Abschnitt 13; bei den dort betrachteten Größenordnungen (200 Überschriften, nicht
200 000 Dokumentknoten) unkritisch, aber **nicht** unbegrenzt skalierend — als bewusst
akzeptierte Einschränkung dokumentiert, nicht stillschweigend.

### 4.4 Kein `insertTableOfContents`-Dialog-Command in diesem Ticket

`inhaltsverzeichnis-einfuegen-req.md` Abschnitt 0.6 verlangt, dass „einfügen" eine
wiedererkennbare Markierung, eine gespeicherte Tiefe und Feld-Export liefert, damit
„aktualisieren" isoliert testbar ist. Diese Datei **liefert** die dafür nötige
Schema-/Reader-/Writer-Infrastruktur (Abschnitte 2, 9–12) bereits vollständig mit — was
hier bewusst **nicht** gebaut wird, ist die in `inhaltsverzeichnis-einfuegen-req.md`
Abschnitt 1/2 geforderte **Nutzer-Oberfläche zum Einfügen** (Toolbar-Button „Verzeichnis
einfügen", Tiefen-Auswahldialog, Klick-Navigation zu Überschriften). Für Testbarkeit
**dieses** Tickets ohne die Schwester-UI wird stattdessen eine **minimale, nur intern/
testseitig genutzte** Hilfsfunktion bereitgestellt (kein Toolbar-Button, keine
öffentliche Bedienoberfläche):

```ts
/** Test-/Vorbereitungs-Hilfsfunktion, KEIN öffentlicher Toolbar-Befehl (siehe Abschnitt 4.4) —
 *  bis `inhaltsverzeichnis-einfuegen` eine eigene UI liefert, ist dies der einzige Weg,
 *  im Editor selbst ein erstes `toc`-Element zu erzeugen (für E2E-Tests DIESES Tickets,
 *  die einen erst-selbst-erzeugten Ausgangszustand brauchen, ohne auf reale
 *  Word/LibreOffice-Fixtures beschränkt zu sein, vgl. Abschnitt 15). */
export function insertMinimalTableOfContents(maxLevel = 3): Command {
  return (state, dispatch) => {
    if (dispatch) {
      const node = wordSchema.nodes.toc.create({ maxLevel })
      dispatch(state.tr.replaceSelectionWith(node).scrollIntoView())
    }
    return true
  }
}
```

Sobald das Schwester-Ticket seinen eigenen Toolbar-Button/Dialog baut, ruft dessen
„Einfügen bestätigt"-Handler stattdessen direkt
`wordSchema.nodes.toc.create({ maxLevel: gewählteTiefe })` gefolgt von
`attemptUpdateTableOfContents(view)` (um sofort befüllte Einträge zu zeigen, statt eines
leeren ToC bis zum ersten Aktualisieren) — diese Funktion hier wird dann **nicht** mehr
gebraucht und kann entfernt werden; sie ist ausdrücklich eine Übergangs-/Test-Hilfe,
keine dauerhafte öffentliche API zweier konkurrierender Einfüge-Wege.

### 4.5 Export-Ergänzung

`commands.ts`-Exportliste ergänzen um: `findEnclosingToc`, `attemptUpdateTableOfContents`,
`insertMinimalTableOfContents`, `TocUpdateOutcome`. Re-Export von `recomputeAllTablesOfContents`
aus `../toc` für Bequemlichkeit der Aufrufer (`WordEditor.tsx`, Writer-Module).

---

## 5. `src/formats/shared/editor/Toolbar.tsx` — kontextueller Button

### 5.1 Sichtbarkeit (Anforderung Abschnitt 1, Element 1: „sichtbar wenn Cursor innerhalb eines ToC-Elements steht")

Anders als alle bestehenden Toolbar-Elemente (durchgehend sichtbar, nur aktiv/inaktiv
markiert, z. B. `AlignButton`/`MarkButton`) wird dieser Button **bedingt gerendert** —
neue Fallunterscheidung direkt in `Toolbar()`, nach der Tabellen-/Bild-Gruppe (Zeilen
226–244):

```tsx
function TocUpdateIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2 3h7M2 6h7M2 9h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M11.5 4.5v3.2m0 0l-1.4-1.4m1.4 1.4l1.4-1.4M11.5 11.5a3 3 0 1 0-3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
```

Symbol: angedeutete ToC-Zeilen (drei Striche unterschiedlicher Länge, links) plus ein
Rundpfeil-Refresh-Piktogramm rechts daneben — eindeutig, kein Unicode/Emoji (Anforderung
Abschnitt 1 Element 1, `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.1, dasselbe Prinzip wie
das bereits für den Seitenumbruch-Button gewählte SVG-Icon, `seitenumbruch-code.md`
Abschnitt 5).

```tsx
export function Toolbar({ view, onTocFeedback }: ToolbarProps) {
  // ... bestehender Code unverändert ...
  const enclosingToc = findEnclosingToc(view.state)

  return (
    <div role="toolbar" aria-label="Textformatierung" className="...">
      {/* ... bestehende Gruppen unverändert ... */}

      {enclosingToc && (
        <>
          <div className="w-px h-5 bg-neutral-300 dark:bg-neutral-700 mx-1" />
          <button
            type="button"
            title="Inhaltsverzeichnis aktualisieren"
            aria-label="Inhaltsverzeichnis aktualisieren"
            onMouseDown={(e) => {
              e.preventDefault()
              const outcome = attemptUpdateTableOfContents(view)
              onTocFeedback?.(outcome)
              view.focus()
            }}
            className="px-2 py-1 rounded text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center gap-1"
          >
            <TocUpdateIcon />
            <span>Aktualisieren</span>
          </button>
        </>
      )}
    </div>
  )
}
```

`ToolbarProps` erweitert um optionales `onTocFeedback?: (outcome: TocUpdateOutcome) =>
void` — siehe Abschnitt 6.2, von `WordEditor.tsx` durchgereicht, damit Toolbar-Klick und
F9-Tastendruck **denselben** Rückmeldungs-Mechanismus benutzen (kein doppelt gepflegter
Code für „zeige Rückmeldung an").

Nicht F9-artige Kontextmenü-Variante (Anforderung Abschnitt 1 Element 3, Rechtsklick):
**nicht** Teil dieses Tickets — als Nice-to-have explizit von der Anforderung selbst
freigestellt („kein Blocker … sofern Element 1 zuverlässig funktioniert").

---

## 6. `src/formats/shared/editor/WordEditor.tsx` — F9, Rückmeldung, Feedback-Verdrahtung

### 6.1 Keymap-Ergänzung

```ts
keymap({
  'Mod-z': undo,
  'Mod-y': redo,
  'Mod-Shift-z': redo,
  Enter: splitListItem(wordSchema.nodes.list_item),
  'Mod-b': toggleMark(wordSchema.marks.strong),
  'Mod-i': toggleMark(wordSchema.marks.em),
  'Mod-u': toggleMark(wordSchema.marks.underline),
  F9: (state, _dispatch, view) => {
    if (!view) return false
    const outcome = attemptUpdateTableOfContents(view)
    setTocFeedback(outcome) // siehe 6.2 — Grenzfall 2: auch "not-found" liefert sichtbare Rückmeldung
    return true // F9 hat in keinem Zielformat eine andere native Editor-Bedeutung — immer "verbraucht"
  },
}),
```

`return true` unabhängig vom `outcome`: F9 ist in Word/LibreOffice reserviert für „Feld
aktualisieren" und hat in diesem Editor sonst keine Funktion — es soll nie an
`baseKeymap`/Browser-Default durchgereicht werden (anders als die in
`seitenumbruch-code.md` Abschnitt 3.4 beschriebenen `Backspace`/`Delete`-Fälle, die
bewusst `false` zurückgeben, um in bestimmten Fällen an `baseKeymap` durchzureichen —
F9 hat dort schlicht kein äquivalentes natives Verhalten, mit dem kollidiert werden
könnte).

### 6.2 Feedback-State + minimale, sich selbst ausblendende Anzeige

```ts
const [tocFeedback, setTocFeedbackRaw] = useState<TocUpdateOutcome | null>(null)
function setTocFeedback(outcome: TocUpdateOutcome) {
  setTocFeedbackRaw(outcome)
  window.clearTimeout(feedbackTimeoutRef.current)
  feedbackTimeoutRef.current = window.setTimeout(() => setTocFeedbackRaw(null), 2500)
}
const feedbackTimeoutRef = useRef<number>(0)
```

Rendering (innerhalb des `return`, direkt über der Editor-Fläche, Zeilen 116–133):

```tsx
{viewRef.current && <Toolbar view={viewRef.current} onTocFeedback={setTocFeedback} />}
{tocFeedback && (
  <div role="status" aria-live="polite" className="px-3 py-1 text-sm text-center bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-200 border-b border-blue-200 dark:border-blue-800">
    {tocFeedback === 'not-found' && 'Kein Inhaltsverzeichnis im Dokument gefunden.'}
    {tocFeedback === 'already-current' && 'Inhaltsverzeichnis ist bereits aktuell.'}
    {tocFeedback === 'updated' && 'Inhaltsverzeichnis wurde aktualisiert.'}
  </div>
)}
```

`role="status"`/`aria-live="polite"` folgt derselben Konvention wie `PrivacyBanner.tsx`
(`role="status"`) — bereits etabliertes, barrierefreies Muster im Projekt, hier nur für
eine **transiente** statt dauerhafte Nachricht wiederverwendet.

### 6.3 Warum kein automatisches „Verzeichnis anlegen" bei „not-found" (Anforderung Abschnitt 1 Element 5/3.11, explizit zu entscheiden)

**Entscheidung: reiner Hinweistext, kein automatisches Neu-Anlegen.** Begründung: ein
automatisches Anlegen an der Cursor-Position würde die von
`inhaltsverzeichnis-einfuegen-req.md` Abschnitt 2.1 geforderte Grundregel „Klick auf
Einfügen öffnet **immer zuerst** den Options-Dialog, kein Direkteinfügen ohne
Rückfrage" für einen Fall unterlaufen, den die Nutzerin *nicht einmal* über den
Einfügen-Button ausgelöst hat — sie hat „Aktualisieren"/F9 gedrückt, nicht „Einfügen".
Ein stilles Neuanlegen an unerwarteter Stelle (Cursor kann irgendwo im Dokument stehen)
wäre selbst ein Überraschungseffekt im Sinne von `FEATURE-SPEC-DOCX-ODT.md` Abschnitt
20.4 — die dort geforderte „sichtbare Rückmeldung" ist der Hinweistext selbst, nicht
zwingend eine Handlung.

### 6.4 Keine Änderung an `reconcileSelectionOnClick` nötig, aber Pflicht-Regressionstest

Der Toolbar-Klick auf „Aktualisieren" und der `F9`-Tastendruck lösen beide reguläre,
über `dispatchTransaction` verarbeitete Transaktionen aus (`attemptUpdateTableOfContents`
dispatcht über `view.dispatch(tr)`, exakt wie jeder bestehende Command) — kein
DOM-Mutation-ohne-Transaktion-Pfad, der den bekannten Selection-Sync-Bug
(`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2) auslösen könnte, analog zur bereits in
`seitenumbruch-code.md` Abschnitt 4 getroffenen Feststellung für `insertPageBreak`.
**Trotzdem** laut Anforderung Grenzfall 9 / Abschnitt 2 der Hauptspezifikation mit
eigenem, dauerhaftem Regressionstest abzusichern (Abschnitt 14.5 unten) — ein Klick auf
den ToC-Button ist ein Mausklick im Editor-DOM wie jeder andere und damit ein
struktureller Verdachtsfall, unabhängig davon, dass der Mechanismus selbst unverändert
bleibt.

### 6.5 Import-Ergänzung

`attemptUpdateTableOfContents`, `TocUpdateOutcome` aus `./commands`.

---

## 7. Export-Ergänzung `commands.ts` re-check

(Bereits in Abschnitt 4.5 behandelt — hier keine weitere Änderung.)

---

## 8. Seitenzahl-Näherung — `src/formats/shared/editor/pagination.ts`

Anforderung 3.7 verlangt, die bereits vorhandene, rein DOM-höhenbasierte
`computePageBreakIndices`-Infrastruktur **optional** zu nutzen, um jedem `heading` eine
Editor-interne Näherungs-Seitenzahl zuzuordnen — explizit **nicht** als Garantie für
Word/LibreOffice-Übereinstimmung (Befund 9 der Anforderungsdatei), sondern nur als
plausibler, gecachter Anzeigetext (Abschnitt 3.7 Spiegelstrich 1).

### 8.1 Warum die Seitenzahl **nicht** ins Schema/`toc_entry`-Attribut wandert

Bewusst **kein** `toc_entry.page`-Attribut (Abschnitt 2 begründet das bereits kurz) —
ausführlicher hier: Seitenzahlen sind laut eigener Definition (Anforderung 3.7) eine
**Editor-Vorschau-Näherung**, die von echten DOM-Messungen abhängt, welche nur
existieren, während eine `EditorView` gemountet ist. Ein Schema-Attribut würde
suggerieren, die Zahl sei Teil des „echten" Dokumentzustands (würde exportiert,
reimportiert, in Undo/Redo verfolgt wie jedes andere Attribut) — das widerspricht
Abschnitt 0.4 der Anforderung: Word/LibreOffice berechnen die *tatsächliche* Seitenzahl
beim Öffnen/Drucken **selbst neu** aus dem echten `TOC`-Feld/`text:table-of-content`,
unabhängig vom zuletzt in Salamanido gecachten Wert. Stattdessen: die Näherungs-Seitenzahl
lebt **ausschließlich** als lose, nicht persistierte Begleit-Information neben dem
ProseMirror-Doc (Plugin-State, siehe unten) und wird **nur beim Export** (Reader/Writer
brauchen einen *irgendeinen* plausiblen Zahlenwert für den gecachten Anzeigetext, siehe
Abschnitt 9.4/12.4) an einer einzigen Stelle in einen String eingebettet — nie als
strukturiertes Attribut im Dauerzustand des Dokuments.

### 8.2 Neue exportierte Funktion

```ts
/** Maps each top-level doc-child index to an approximate 1-based page number, given the
 *  already-computed break indices (Abschnitt 8 der Anforderung: "Zählen der breakIndices,
 *  die kleiner sind als der Top-Level-Index der Überschrift, plus 1"). */
export function pageNumberForTopLevelIndex(childIndex: number, breakIndices: number[]): number {
  return breakIndices.filter((b) => b <= childIndex).length + 1
}
```

### 8.3 Neuer Plugin-Zustand: `headingPageApproximations`

`createPaginationPlugin()`s `view.update`-Hook (aktuell Zeilen 88–104) erweitert:
zusätzlich zum bestehenden `DecorationSet`-Dispatch wird — **nur wenn sich die
Top-Level-Umbrüche tatsächlich geändert haben** (bereits vorhandene `sameDecorationSet`-
Prüfung, unverändert genutzt) — eine `Map<string, number>` (`headingId → Seite`)
gebaut, indem alle `heading`-Top-Level-Kinder von `doc` durchlaufen und via
`pageNumberForTopLevelIndex` bewertet werden, und in einem **eigenen** `PluginKey`-State
(`tocPageApproxKey`) abgelegt — **kein** neuer `dispatch`-Aufruf zusätzlich zum bereits
für die Decorations vorhandenen (dieselbe Transaktion trägt beide Metas, verhindert eine
zweite Render-Runde pro Update-Zyklus).

```ts
export const tocPageApproxKey = new PluginKey<Map<string, number>>('tocPageApprox')

// innerhalb von measureAndBuildDecorations / recompute():
function computeHeadingPageApprox(view: EditorView, breakIndices: number[]): Map<string, number> {
  const map = new Map<string, number>()
  view.state.doc.forEach((node, _offset, index) => {
    if (node.type.name === 'heading' && typeof node.attrs.headingId === 'string') {
      map.set(node.attrs.headingId, pageNumberForTopLevelIndex(index, breakIndices))
    }
    // Grenzfall 4 (Überschrift innerhalb Tabellenzelle/Listenpunkt, nicht Top-Level):
    // wird HIER bewusst nicht erfasst (kein Crash, einfach kein Eintrag in der Map) —
    // siehe Abschnitt 13, Grenzfall 4.
  })
  return map
}
```

Konsument dieser Map: **ausschließlich** die Export-Vorbereitung in `writer.ts` beider
Formate (Abschnitt 9.4/12.4) — die live-Editor-Darstellung selbst zeigt laut
Anforderung 3.7/2.5-Referenz aus `inhaltsverzeichnis-einfuegen-req.md` (dort als „offen"
markiert) **optional** eine Seitenzahl neben jedem `toc_entry` an; hier: **ja, anzeigen**
(informativ, rein CSS-generiert über ein `::after`-Pseudo-Element mit
`content: attr(data-page-approx)`, gesetzt via `toc_entry`s Decoration statt Schema-
Attribut, siehe Abschnitt 8.4) — als bewusste, dokumentierte Entscheidung: die Zahl ist
für die Nutzerin nützlich (bestätigt „das Verzeichnis hat überhaupt Seitenangaben"), so
lange klar gekennzeichnet als Näherung.

### 8.4 Anzeige im Editor: Decoration, kein Schema-Zustand

Eine `DecorationSet`-Ergänzung (analog zu den bereits vorhandenen Spacer-Widgets) fügt
pro `toc_entry`-Knoten ein `Decoration.node(...)`-Attribut `data-page-approx` hinzu, dessen
Wert aus `tocPageApproxKey.getState(view.state)?.get(entry.attrs.targetHeadingId)`
stammt. CSS (`src/index.css`, neuer Block, analog zu `.pm-page-break-before` in
`seitenumbruch-code.md` Abschnitt 6.1):

```css
.pm-toc-entry::after {
  content: attr(data-page-approx);
  float: right;
  color: #6b7280;
  font-variant-numeric: tabular-nums;
}
.pm-toc { position: relative; background: #f8fafc; border: 1px dashed #cbd5e1; padding: 0.5em 0.75em; }
.pm-toc::before {
  content: 'Inhaltsverzeichnis — automatisch generiert, manuelle Änderungen hier gehen beim Aktualisieren verloren';
  display: block;
  font-size: 0.75rem;
  color: #64748b;
  margin-bottom: 0.4em;
}
```

Der `::before`-Hinweistext erfüllt direkt Anforderung 3.6 letzter Satz: „muss in der UI
erkennbar kommuniziert werden … damit es nicht als überraschender Datenverlust erlebt
wird" (Grenzfall 13) — als reines CSS-generiertes Label, keine zusätzliche
DOM-/React-Komponente nötig, konsistent mit dem bereits für Seitenumbrüche gewählten
Muster (`seitenumbruch-code.md` Abschnitt 6.1, dortiger `::before`-Hinweis
„Seitenumbruch").

Dunkelmodus: analog zu `seitenumbruch-code.md`s Feststellung, dass die Editor-„Seite"
laut `pageBackgroundStyle()` immer weiß gerendert wird — feste (nicht
`prefers-color-scheme`-abhängige) Farben genügen auch hier aus demselben Grund.

---

## 9. DOCX-Export — `src/formats/docx/writer.ts`

### 9.1 Entscheidung: klassisches Feld-Tripel (`fldChar`/`instrText`), kein `w:sdt`-Wrapper beim **Schreiben**

Anforderung Befund 6 nennt beide real vorkommenden Mechanismen
(`w:sdt` **und** das klassische `w:fldChar`/`w:instrText`-Tripel). **Entscheidung für
diesen Writer: das klassische Tripel, ohne `w:sdt`.** Begründung:

1. Beide Varianten werden von Word beim Öffnen gleichermaßen als aktualisierbares Feld
   erkannt (das Feld-Tripel ist der seit OOXML-1.0 grundlegende Mechanismus, `w:sdt` ist
   eine zusätzliche, optionale Content-Control-Umhüllung, die moderne Word-Versionen
   beim **eigenen** Einfügen zusätzlich anbringen, aber nicht voraussetzen).
2. Deutlich weniger neuer Code (kein `w:docPartObj`/`w:docPartGallery`-Bookkeeping, keine
   zusätzliche eindeutige `w:id`-Verwaltung für den SDT-Container).
3. Symmetrisch einfacher zu testen: derselbe Writer-Code kann direkt vom eigenen Reader
   zurückgelesen werden (Abschnitt 9.2/9.3), ohne zwei parallele Erzeugungspfade zu
   pflegen.

Der **Reader** (Abschnitt 9.3) erkennt trotzdem **zusätzlich** `w:sdt`-gewickelte
TOC-Felder (import-seitig notwendig, weil reale, mit Word erzeugte Dateien laut
allgemeinem OOXML-Wissen diese Konvention typischerweise verwenden — siehe Risiko R1 in
Abschnitt 17: **nicht** gegen eine reale Fixture verifiziert, da keine im Repo vorhanden).

### 9.2 Serialisierung — neue Funktion `tocBlockToDocx`

`blockToDocx`s `switch` (aktuell Zeilen 100–125) erhält einen neuen Fall `case 'toc':`.
Vor dem eigentlichen Schreiben wird **jedes Mal** `recomputeAllTablesOfContents`
aufgerufen — das erfüllt Anforderung 3.2 Punkt 2 („implizit beim Export") direkt am
einzigen Einstiegspunkt `writeDocx()`, nicht verstreut in `blockToDocx` selbst:

```ts
// writeDocx(), ganz am Anfang, vor Zeile 226 (bisheriger erster Zugriff auf doc.body):
import { recomputeAllTablesOfContents } from '../shared/toc'

export async function writeDocx(doc: WordDocumentContent): Promise<Blob> {
  const recomputedBody = recomputeAllTablesOfContents(doc.body as unknown as JsonNode)
  // ... ab hier statt `doc.body` überall `recomputedBody` verwenden ...
```

**Wichtig — Seitenzahlen-Cache-Erhalt statt Blindüberschreiben (Abschnitt 0.4/Abschnitt
8.1 zusammengeführt, löst die in Abschnitt 16 unten diskutierte Spannung zwischen
Anforderung 3.2 Punkt 2 und Abschnitt 5.1 Baseline-Rundreise):** Da
`recomputeAllTablesOfContents` (Abschnitt 3) **keine** Seitenzahl kennt (bewusst, Abschnitt
8.1), muss der Writer die zuletzt gecachte Seitenzahl pro `targetHeadingId` **separat**
mitführen und **nur für neue/verschobene Einträge** überschreiben, nicht für inhaltlich
unveränderte. Dafür wird vor dem Rebuild die alte Seitenzahl-Zuordnung aus dem
**Original**-`doc.body` ausgelesen (bevor `recomputeAllTablesOfContents` sie verwirft):

```ts
function extractCachedPageNumbers(originalBody: JsonNode): Map<string, string> {
  // Liest die zuletzt beim Export erzeugten Anzeigetexte zurück, siehe Format Abschnitt 9.4 —
  // beim eigenen Reader (9.3) werden diese als eigenes Attribut `cachedPage` auf
  // `toc_entry` wieder eingelesen (nicht Teil des Schemas selbst — siehe unten).
  const map = new Map<string, string>()
  function visit(node: JsonNode) {
    if (node.type === 'toc_entry' && typeof node.attrs?.targetHeadingId === 'string' && typeof node.attrs?.cachedPage === 'string') {
      map.set(node.attrs.targetHeadingId, node.attrs.cachedPage as string)
    }
    node.content?.forEach(visit)
  }
  visit(originalBody)
  return map
}
```

Das erfordert ein **weiteres**, rein Reader/Writer-internes (nicht im ProseMirror-Schema
selbst sichtbares — bewusst kein `wordSchema.nodes.toc_entry.attrs.cachedPage`, siehe
Begründung Abschnitt 8.1) String-Feld `cachedPage` auf dem **JSON**-`toc_entry`, das der
Reader beim Import aus dem gecachten Anzeigetext extrahiert und in `attrs` ablegt, ohne
dass es je Teil des ProseMirror-Editor-Zustands wird (der Editor selbst zeigt stattdessen
die live berechnete `pm-toc-entry::after`-Näherung aus Abschnitt 8.4 — die beiden Quellen
laufen bewusst getrennt: **Editor-Anzeige** = live DOM-Näherung, **Export-Cache** = zuletzt
bekannter, vom vorigen Import/Export übernommener oder live-Editor-approximierter Wert).
`writeDocx`/`writeOdt` fügen deshalb VOR dem Aufruf von `recomputeAllTablesOfContents`
einen Vorverarbeitungsschritt ein, der `tocPageApproxKey` (Abschnitt 8.3, **falls** eine
`EditorView` mit dieser Information zuletzt lief — praktisch: `WordEditor.tsx`s
`onChange` müsste den zuletzt bekannten Approximationsstand mit ins `WordDocumentContent`
durchreichen; da `documentModel.ts`s `WordDocumentContent` dafür kein Feld hat, ist die
pragmatischste Lösung: **die Editor-Seite bettet die zuletzt berechnete Näherung direkt
als `attrs.cachedPage` in die `toc_entry`-JSON-Knoten selbst ein**, sobald
`recomputeOneTableOfContents`/die Pagination-Plugin-Ableitung sie kennt — dafür erhält
`toc_entry` ein **zusätzliches, im Schema als optionales, rein passives Attribut**
`cachedPage: { default: null, validate: '...' }` (Ergänzung zu Abschnitt 2, siehe
Korrektur unten) statt der ursprünglich in Abschnitt 8.1 verworfenen Variante — **Klarstellung
gegenüber Abschnitt 8.1:** dort wurde nur `page` als *berechnetes, live-verpflichtendes*
Attribut verworfen; `cachedPage` ist bewusst als **rein passiver, niemals von
ProseMirror-Commands aktiv gepflegter, nur beim Export gelesener/geschriebener und beim
Import befüllter** String modelliert — ein Attribut, das der Editor **anzeigt** (Abschnitt
8.4 nutzt weiterhin die live-Decoration, **nicht** `cachedPage`, für die Bildschirmanzeige,
um Verwirrung zu vermeiden), aber nur Reader/Writer aktiv **schreiben**.

**Anmerkung zur Komplexität dieser Teilentscheidung:** Dieser Cache-Erhalt-Mechanismus ist
der komplexeste Einzelpunkt dieses Plans. Er ist **nicht** unverzichtbar für die
funktionale Korrektheit von Struktur/Text/Ebene (die bleiben so oder so korrekt) — er
betrifft **ausschließlich** die kosmetische Frage, ob eine unveränderte Seitenzahl beim
reinen Export-ohne-Klick (Baseline-Rundreise 5.1.3/5.1.4) zufällig **anders** aussieht als
beim ursprünglichen Import, obwohl sich nichts geändert hat. **Vereinfachungs-Option, falls
Aufwand/Nutzen ungünstig ausfällt:** ersatzlos verzichten und stattdessen **jede** Seitenzahl
bei **jedem** Export (auch beim reinen Baseline-Export ohne Heading-Änderung) frisch mit
`"?"` oder dem zuletzt in der aktuellen Editor-Sitzung gemessenen Wert füllen — Word
berechnet die Zahl beim Öffnen ohnehin selbst neu (Anforderung 3.7 Spiegelstrich 1), ein
kosmetisch „falscher" Zwischenstand vor dem ersten F9 in Word selbst ist **explizit als
akzeptabel dokumentiert** (3.7). Empfehlung: **mit** Cache-Erhalt umsetzen (bessere
Baseline-Treue), aber diesen Absatz als Beleg dafür nutzen, dass ein reduzierter Scope
(ohne `cachedPage`) kein Abnahme-Blocker wäre, sondern nur eine dokumentierte, geringere
kosmetische Qualität der Seitenzahl-Spalte bei unverändertem Baseline-Export.

```ts
function tocBlockToDocx(node: JsonNode, cachedPages: Map<string, string>): string {
  const maxLevel = Number(node.attrs?.maxLevel ?? 3)
  const dirty = Boolean(node.attrs?.dirty)
  const entries = node.content ?? []

  const instr = `TOC \\o "1-${maxLevel}" \\h \\z \\u`
  const cachedParagraphs = entries
    .map((entry) => {
      const level = Number(entry.attrs?.level ?? 1)
      const bookmarkName = bookmarkNameFor(entry.attrs?.targetHeadingId as string | null)
      const page = cachedPages.get(String(entry.attrs?.targetHeadingId ?? '')) ?? '1'
      const text = escapeXml(plainTextOf(entry))
      const indent = 200 * (level - 1) // twips, ~0.14cm per level — grob an TOC-Stilvorlagen angelehnt
      return (
        `<w:p><w:pPr><w:ind w:left="${indent}"/><w:tabs><w:tab w:val="right" w:leader="dot" w:pos="9000"/></w:tabs></w:pPr>` +
        `<w:hyperlink w:anchor="${bookmarkName}" w:history="1">` +
        `<w:r><w:t xml:space="preserve">${text}</w:t></w:r><w:r><w:tab/></w:r>` +
        `<w:r><w:fldChar w:fldCharType="begin"/></w:r>` +
        `<w:r><w:instrText xml:space="preserve"> PAGEREF ${bookmarkName} \\h </w:instrText></w:r>` +
        `<w:r><w:fldChar w:fldCharType="separate"/></w:r>` +
        `<w:r><w:t>${escapeXml(page)}</w:t></w:r>` +
        `<w:r><w:fldChar w:fldCharType="end"/></w:r>` +
        `</w:hyperlink></w:p>`
      )
    })
    .join('') || `<w:p><w:r><w:t>Keine Überschriften gefunden</w:t></w:r></w:p>` // Grenzfall 1/Anforderung 3.11

  return (
    `<w:sdt><w:sdtContent>` + // s.u. — Klarstellung: KEIN sdtPr/Content-Control-Semantik, siehe Fußnote
    `<w:p><w:r><w:fldChar w:fldCharType="begin" w:dirty="${dirty ? '1' : '0'}"/></w:r>` +
    `<w:r><w:instrText xml:space="preserve"> ${instr} </w:instrText></w:r>` +
    `<w:r><w:fldChar w:fldCharType="separate"/></w:r></w:p>` +
    cachedParagraphs +
    `<w:p><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>` +
    `</w:sdtContent></w:sdt>`
  )
}
```

**Korrektur gegenüber Abschnitt 9.1:** der obige Entwurf umschließt das Feld-Tripel doch
mit `<w:sdt><w:sdtContent>` — das steht im Widerspruch zur Entscheidung „kein `w:sdt`
beim Schreiben". **Endgültige Entscheidung: `w:sdt`-Wrapper entfernen**, stattdessen
lediglich eine `<w:bookmarkStart w:id="0" w:name="SalamanidoToc1"/>`/`w:bookmarkEnd`-
Umklammerung um die gesamte `w:p`-Sequenz, um den Gesamtbereich für einen künftigen
eigenen Reimport eindeutig als **einen** zusammenhängenden ToC wiederzufinden (wichtig
bei mehreren ToCs im Dokument, Grenzfall 3) — die vorherige Sdt-Variante war ein
Zwischenstand während der Ausarbeitung dieses Plans und wird hier explizit verworfen,
damit die Implementierung nicht beide Varianten gleichzeitig baut. Endgültige Struktur:

```ts
function tocBlockToDocx(node: JsonNode, tocIndex: number, cachedPages: Map<string, string>): string {
  // ... instr/cachedParagraphs wie oben ...
  const containerBookmark = `SalamanidoToc${tocIndex}` // eindeutig pro ToC im Dokument, Grenzfall 3
  return (
    `<w:bookmarkStart w:id="${1000 + tocIndex}" w:name="${containerBookmark}"/>` +
    `<w:p><w:r><w:fldChar w:fldCharType="begin" w:dirty="${dirty ? '1' : '0'}"/></w:r>` +
    `<w:r><w:instrText xml:space="preserve"> ${instr} </w:instrText></w:r>` +
    `<w:r><w:fldChar w:fldCharType="separate"/></w:r></w:p>` +
    cachedParagraphs +
    `<w:p><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>` +
    `<w:bookmarkEnd w:id="${1000 + tocIndex}"/>`
  )
}
```

`bookmarkNameFor(headingId)` — deterministisch aus der internen `headingId` abgeleitet
(z. B. `_Toc_${headingId}`, mit `_` statt Word-typischem numerischem `_TocNNNNNNNN`, da
der exakte numerische Namensraum echter Word-Installationen für uns irrelevant ist —
Word akzeptiert jeden gültigen Bookmark-Namen als Hyperlink-Anker, nicht nur
`_Toc`-präfixierte Zufallszahlen; die `_Toc`-Namenskonvention ist reine Word-eigene
Erzeugungs-Gepflogenheit, keine Bedingung für Gültigkeit) — muss zusätzlich beim
Schreiben der jeweiligen **Überschrift** (Abschnitt 9.2 Fortsetzung unten) exakt
denselben Namen als `w:bookmarkStart`/`w:bookmarkEnd` um den Absatz legen.

### 9.3 Überschriften erhalten Bookmarks — Ergänzung an bestehendem `heading`-Fall

`blockToDocx`s `case 'heading':` (aktuell Zeilen 106–111) erweitert:

```ts
case 'heading': {
  const level = Number(node.attrs?.level ?? 1)
  const align = (node.attrs?.align as string) ?? 'left'
  const styleTag = `<w:pStyle w:val="${HEADING_STYLE_ID(level)}"/>`
  const headingId = node.attrs?.headingId as string | undefined
  const bookmarkName = headingId ? bookmarkNameFor(headingId) : null
  const bookmarkOpen = bookmarkName ? `<w:bookmarkStart w:id="${bookmarkIdFor(headingId!)}" w:name="${bookmarkName}"/>` : ''
  const bookmarkClose = bookmarkName ? `<w:bookmarkEnd w:id="${bookmarkIdFor(headingId!)}"/>` : ''
  return `${bookmarkOpen}<w:p>${paragraphPropsXml(align, styleTag)}${inlineToRuns(node.content)}</w:p>${bookmarkClose}`
}
```

**Wichtig:** Bookmarks werden **nur** geschrieben, wenn `headingId` gesetzt ist (also nur
für Überschriften, die tatsächlich mindestens einmal von `collectHeadings`
durchlaufen wurden — bei einem Dokument **ohne** jedes ToC bleibt `headingId` für alle
Überschriften `null`/`undefined`, es werden **keine** zusätzlichen Bookmarks erzeugt).
**Das ist entscheidend für Abschnitt 5.1 Baseline-Rundreise Punkt 1/2** (reale Datei
**ohne** jedes Verzeichnis, unverändert hochladen → exportieren → „kein Verzeichnis aus
dem Nichts") — da `recomputeAllTablesOfContents` (aufgerufen am Anfang von `writeDocx`,
Abschnitt 9.2) nur **innerhalb bereits vorhandener `toc`-Knoten** Einträge erzeugt und
`collectHeadings` **ID-Vergabe unabhängig davon läuft** (es durchläuft **alle**
Überschriften im Dokument, um IDs zu vergeben, unabhängig davon ob überhaupt ein
`toc`-Knoten existiert) — **Korrektur:** das würde bedeuten, dass **auch** ein Dokument
**ohne** jedes ToC nach einem einzigen Export plötzlich überall Bookmarks bekäme (rein
kosmetisch irrelevant für Word, aber ein unnötiger, durch dieses Feature verursachter
XML-Unterschied in einem Dokument, das mit ToC gar nichts zu tun hat — ein Verstoß gegen
den in Anforderung 5.1 Punkt 5 formulierten Grundsatz „kein neues Attribut darf beim
reinen Reimport unbeteiligter Dateien ungewollt auftauchen"). **Behoben:**
`collectHeadings`/`recomputeAllTablesOfContents` werden **nur aufgerufen, wenn
mindestens ein `toc`-Knoten im Dokument existiert** (`findAllTocNodes(body).length > 0`
als Vorbedingung in `writeDocx`/`writeOdt`) — bei **keinem** ToC im Dokument bleibt
`doc.body` beim Export komplett unangetastet, exakt wie vor diesem Ticket. Diese
Vorbedingung wird in Abschnitt 3 oben als Korrektur ergänzt (`recomputeAllTablesOfContents`
sollte intern selbst früh zurückkehren, wenn `findAllTocNodes(root).length === 0` —
Rückgabe des unveränderten `root` ohne jede ID-Vergabe).

### 9.4 Reader-Gegenstück — `src/formats/docx/reader.ts`

Neuer Fall in `readBodyChildren` (aktuell Zeilen 307–328): vor der bestehenden
`w:p`/`w:tbl`-Fallunterscheidung wird zusätzlich auf ein zusammenhängendes
Bookmark-umklammertes Feld-Tripel **oder** einen `w:sdt` mit
`w:docPartGallery w:val="Table of Contents"` geprüft (letzteres deckt reale,
Word-eigen-erzeugte Dateien ab, siehe Abschnitt 9.1 — **nicht** gegen eine reale Fixture
verifizierbar, Risiko R1).

```ts
function isTocFieldBegin(pEl: Element): boolean {
  const instrTexts = Array.from(pEl.getElementsByTagNameNS(OOXML_NAMESPACES.w, 'instrText'))
  return instrTexts.some((el) => /^\s*TOC\b/.test(el.textContent ?? ''))
}

function parseTocField(paragraphs: Element[], startIndex: number): { node: JsonNode; consumed: number } | null {
  // Sucht ab startIndex den fldChar[begin] mit TOC-instrText, sammelt die dazwischenliegenden
  // <w:p>-Elemente (jeweils EIN toc_entry) bis zum nächsten fldChar[end], extrahiert je Eintrag:
  // - sichtbaren Text (alle <w:t> AUSSER dem PAGEREF-Feld-Zwischenergebnis)
  // - Einrückungsebene aus <w:ind w:left="…"> (Rückrechnung: level = left / 200 + 1, siehe 9.2)
  // - targetHeadingId: NICHT aus dem Bookmark-Namen zurückrechenbar auf eine bestehende
  //   Überschrift, bevor collectHeadings einmal gelaufen ist (Bookmark-Name existiert nur
  //   im XML) — bleibt beim Import zunächst `null`, siehe Abschnitt 0 Analyse unten
  // - cachedPage aus dem PAGEREF-Feldergebnis-<w:t> (zwischen "separate" und "end" des
  //   inneren PAGEREF-Feldes)
  // ... vollständige Implementierung: Statemachine über fldChar begin/separate/end, siehe
  // dieselbe Grundtechnik wie bereits für <w:t>/<w:br>/<w:drawing> in decodeParagraphRuns
  // (reader.ts:124-143), hier nur über <w:p>-Ebene statt <w:r>-Ebene.
}
```

**Wichtiger Designpunkt — `targetHeadingId` bleibt beim reinen Import zunächst `null`:**
identisch zur bereits in Abschnitt 3.1-Nachbarschaft (Editor-Commands, Kommentar zu
„erster Import liefert nur gecachten Text") getroffenen Entscheidung: der **Reader**
kennt beim Einlesen einer fremden Datei keine `headingId`s (die werden erst von
`collectHeadings` beim ersten tatsächlichen Aktualisieren vergeben). Die importierten
`toc_entry`-Knoten enthalten also zunächst nur Text/Ebene/`cachedPage`, aber
`targetHeadingId: null` — **das ist unproblematisch**, weil die Klick-Navigation
(Sprung zum Eintrag) ohnehin Gegenstand des Schwester-Tickets ist, und das erste
tatsächliche „Aktualisieren" (egal ob durch Nutzerklick oder automatisch beim nächsten
Export) die Einträge exakt gegen die dann live vorhandenen Überschriften neu aufbaut
und dabei korrekte `targetHeadingId`s vergibt (Anforderung 3.1: „Beide Ursprungsarten
müssen von aktualisieren gleich behandelt werden" — nach dem ersten Aktualisieren gibt
es funktional **keinen** Unterschied mehr zwischen einem importierten und einem
selbst erzeugten ToC).

`headingLevelForStyle`/Überschriften-Erkennung (bereits vorhanden, Zeilen 68–75) wird
**zusätzlich** um das Auslesen eines vorhandenen `w:bookmarkStart`/`w:bookmarkEnd`-Paars
direkt um den `<w:p>`-Knoten einer Überschrift ergänzt — falls vorhanden, wird der
Bookmark-Name als **Ausgangswert** für `headingId` übernommen (`headingId: <bookmarkName
ohne Präfix>` bei eigenem `SalamanidoToc…`/`_Toc…`-Namensschema erkannt, sonst als
generische neue ID behandelt) — das ermöglicht bei einer Baseline-Rundreise (Export →
Reimport **desselben** von Salamanido erzeugten ToCs) eine stabile Korrelation **ohne**
erneutes Aktualisieren, weil die eigene `headingId` über die Rundreise hinweg über den
Bookmark-Namen erhalten bleibt (relevant für Abschnitt 5.2 Punkt 1: „Verzeichnis zeigt
neuen Text, bleibt weiterhin als echtes, aktualisierbares Feld erkennbar").

---

## 10. `src/formats/docx/styleDefs.ts` — keine zwingende Änderung

Word erwartet für ein „echtes" TOC-Aussehen eigentlich die eingebauten Absatzformate
`TOC1`…`TOC9` (analog zu `HEADING_STYLE_ID`) — **bewusst hier NICHT ergänzt**, weil
`tocBlockToDocx` (Abschnitt 9.2) direkte `<w:ind>`/`<w:tabs>`-Absatzeigenschaften ohne
Style-Referenz schreibt (einfacher, kein zusätzliches `styles.xml`-Update nötig). Das ist
eine **bewusste Vereinfachung** — Word erkennt das Feld trotzdem korrekt als
aktualisierbares `TOC`-Feld (die Feld-Erkennung hängt am `w:instrText`-Inhalt, nicht an
der verwendeten Absatzformatvorlage); es fehlt lediglich die von echten
Word-„Verzeichnis"-Vorlagen bekannte optische Konsistenz mit Word-eigenen ToCs (z. B.
werden nach einem `F9`-Update **in Word selbst** die Absätze eventuell auf `TOC1`-Stile
umgestellt). Als dokumentierte Einschränkung in Abschnitt 16 aufgeführt, kein Blocker.

---

## 11. ODT-Export — `src/formats/odt/writer.ts`

### 11.1 Struktur

Neuer `case 'toc':` in `blockToOdt`s `switch` (aktuell Zeilen 61–122):

```ts
function tocBlockToOdt(node: JsonNode, tocIndex: number, cachedPages: Map<string, string>): string {
  const maxLevel = Number(node.attrs?.maxLevel ?? 3)
  const entries = node.content ?? []
  const name = `SalamanidoToc${tocIndex}`

  const entryTemplates = Array.from({ length: maxLevel }, (_, i) => i + 1)
    .map(
      (level) =>
        `<text:table-of-content-entry-template text:outline-level="${level}" text:style-name="Contents_20_${level}">` +
        `<text:index-entry-chapter/>` +
        `<text:index-entry-text/>` +
        `<text:index-entry-tab-stop style:type="right" style:leader-char="."/>` +
        `<text:index-entry-page-number/>` +
        `</text:table-of-content-entry-template>`,
    )
    .join('')

  const bodyParagraphs = entries
    .map((entry) => {
      const level = Number(entry.attrs?.level ?? 1)
      const targetId = String(entry.attrs?.targetHeadingId ?? '')
      const bookmarkName = targetId ? `SalamanidoHeading_${targetId}` : null
      const text = escapeXml(plainTextOf(entry))
      const page = cachedPages.get(targetId) ?? '1'
      const styleName = `Contents_20_${level}`
      const inner = bookmarkName
        ? `<text:a xlink:type="simple" xlink:href="#${bookmarkName}">${text}</text:a>`
        : text
      return `<text:p text:style-name="${styleName}">${inner}<text:tab/>${escapeXml(page)}</text:p>`
    })
    .join('') || `<text:p text:style-name="Contents_20_1">Keine Überschriften gefunden</text:p>` // Grenzfall 1

  return (
    `<text:table-of-content text:style-name="Sect1" text:protected="true" text:name="${name}">` +
    `<text:table-of-content-source text:outline-level="${maxLevel}">` +
    `<text:index-title-template text:style-name="Contents_20_Heading">Inhaltsverzeichnis</text:index-title-template>` +
    entryTemplates +
    `</text:table-of-content-source>` +
    `<text:index-body>` +
    `<text:index-title text:name="${name}_Head"><text:p text:style-name="Contents_20_Heading">Inhaltsverzeichnis</text:p></text:index-title>` +
    bodyParagraphs +
    `</text:index-body>` +
    `</text:table-of-content>`
  )
}
```

`text:protected="true"` — **bewusst gesetzt**, nach realem Vorbild aus dem in Abschnitt
0.2 verifizierten `test1.odt` (`text:table-of-content text:protected="true"`) — signalisiert
LibreOffice, den Index-Body als vom System verwaltet zu behandeln (direktes Reintippen
wird von LibreOffice selbst mit einer Bestätigungs-Nachfrage „Bereich ist geschützt"
abgefangen). **Deutet auf einen Unterschied zur ProseMirror-eigenen Editierbarkeits-
Entscheidung hin (Abschnitt 1.3: bei uns bleibt `toc_entry` direkt tippbar)** — das ist
kein Widerspruch, sondern zwei unabhängige Schutzebenen für zwei unterschiedliche
Programme: **innerhalb** Salamanido bestimmt einzig unser eigenes Schema, ob getippt
werden kann (wir erlauben es, siehe 1.3-Begründung); **innerhalb von LibreOffice**, falls
die Datei dort geöffnet wird, bestimmt das exportierte `text:protected`-Attribut
LibreOffice-seitiges Verhalten — beide Programme dürfen hier unterschiedliche
UX-Entscheidungen treffen, ohne dass das ein Bug ist.

### 11.2 Anker-Konvention: `text:bookmark`, nicht `|outline` (bewusste Abweichung von der bei LibreOffice beobachteten Erzeugungskonvention)

Wie in Abschnitt 0.2 verifiziert, verwendet echtes LibreOffice `#<Pfad+Text>|outline`
statt `text:bookmark`. **Entscheidung: unser Writer verwendet trotzdem
`text:bookmark-start`/`-end` um jede exportierte Überschrift plus `#<bookmarkName>` als
Linkziel** (nicht die `|outline`-Konvention). Begründung:

1. **Löst Grenzfall 8 (identischer Überschriftentext mehrfach) robust.** Die
   `|outline`-Konvention adressiert über einen aus Gliederungsnummer+Text
   zusammengesetzten Pfad — bei zwei Überschriften mit **identischem** Text auf
   derselben Ebene (z. B. beide „Einleitung" als Ebene-2 unter unterschiedlichen
   Ebene-1-Kapiteln) wäre der volle Pfad zwar durch die übergeordnete Kapitelnummer
   unterscheidbar, bei komplett identischer Position in **verschiedenen**, aber
   strukturell gleich benannten Zweigen (seltener, aber möglicher Grenzfall) könnte es
   zu Kollisionen kommen. Ein pro-Überschrift eindeutiger `text:bookmark`-Name
   (abgeleitet aus der internen `headingId`, garantiert eindeutig) hat dieses Risiko
   grundsätzlich nicht.
2. **ODF-spezifikationskonform und funktional gleichwertig** — `text:bookmark` ist der
   allgemeine, dokumentierte ODF-Mechanismus für interne Sprungziele (auch von anderen
   Funktionen wie Querverweisen genutzt), kein Sonderfall nur für ToCs.
3. **Symmetrisch mit dem eigenen Reader** (Abschnitt 11.3) — der eigene Reader muss so
   oder so **beide** Konventionen unterstützen (siehe unten), weil er auch echte
   LibreOffice-Dateien einlesen können muss; für die **eigene** Erzeugung wird die
   robustere der beiden gewählt.

`headingBlockToOdt`-Erweiterung (bestehender `case 'heading':`, Zeilen 69–74):

```ts
case 'heading': {
  const level = Number(node.attrs?.level ?? 1)
  const align = (node.attrs?.align as string) ?? 'left'
  const inner = inlineToOdt(node.content, styles)
  const headingId = node.attrs?.headingId as string | undefined
  const bookmarkName = headingId ? `SalamanidoHeading_${headingId}` : null
  const bookmarkOpen = bookmarkName ? `<text:bookmark-start text:name="${bookmarkName}"/>` : ''
  const bookmarkClose = bookmarkName ? `<text:bookmark-end text:name="${bookmarkName}"/>` : ''
  return `${bookmarkOpen}<text:h text:style-name="${headingStyleName(level, align)}" text:outline-level="${level}">${inner}</text:h>${bookmarkClose}`
}
```

Dieselbe Bedingung wie in Abschnitt 9.3 (DOCX): Bookmarks nur, wenn `headingId` gesetzt
— identische Absicherung der Baseline-Rundreise 5.1.1/5.1.2 (kein neues Attribut in
unbeteiligten Dokumenten), identische Vorbedingung
(`findAllTocNodes(body).length > 0` vor jedem `collectHeadings`-Aufruf in `writeOdt`).

### 11.3 `Contents_20_N`-Absatzstile — Ergänzung `src/formats/odt/styleRegistry.ts`

Neue Funktion `tocEntryStyleDefs(maxLevelSeen: number)`, analog zu `headingStyleDefs()`
(Zeilen 84–93) — erzeugt `style:style style:name="Contents_20_N"` mit stufenweise
zunehmendem `fo:margin-left` (Einrückung, Anforderung 3.6) für alle in irgendeinem
`toc`-Knoten vorkommenden Ebenen, plus einen `Contents_20_Heading`-Stil für den ToC-Titel
— folgt exakt demselben Registrierungsmuster wie die bereits vorhandenen
Ausrichtungs-/Überschriften-Stile (`paragraphAlignStyleDefs`/`headingStyleDefs`), in
`buildContentXml` (Zeile 133) an der bestehenden Konkatenation ergänzt.

### 11.4 Reader-Gegenstück — `src/formats/odt/reader.ts`

Neuer Fall in `elementToBlocks` (aktuell Zeilen 164–206): vor der `list`/`table`-Prüfung

```ts
if (ns === ODF_NAMESPACES.text && local === 'table-of-content') {
  return [parseTocElement(el, styles)]
}
```

`parseTocElement` liest `text:table-of-content-source/@text:outline-level` als
`maxLevel`, durchläuft `text:index-body`'s `<text:p>`-Kinder (jedes ein `toc_entry`),
bestimmt `level` über den referenzierten `text:style-name` (Rückwärtssuche gegen die
gerade erst geschriebenen `Contents_20_N`-Namen **und**, für **fremde** Dateien, gegen
das dort real beobachtete Namensschema aus Abschnitt 0.2 — identisch `Contents_20_N`,
also **kompatibel ohne Sonderfall**, ein glücklicher Umstand, da beide, unsere eigene
Konvention **und** die real bei LibreOffice beobachtete, denselben eingebauten
ODF-Stilnamen verwenden). Anker-Auflösung unterstützt **beide** Varianten aus Abschnitt
11.2 Punkt 3: Ist ein `<text:a xlink:href="#…">` vorhanden, wird zuerst gegen
`text:bookmark-start`-Namen im Dokument gesucht (eigene Konvention); findet sich keiner
mit exakt diesem Namen, wird als Fallback der `|outline`-Suffix abgeschnitten und der
verbleibende Text-Teil gegen den reinen Klartext vorhandener Überschriften abgeglichen
(deckt reale LibreOffice-Dateien wie `test1.odt` ab) — **liefert bei Mehrdeutigkeit
(Grenzfall 8, echte Fremddatei) nur einen Best-Effort-Treffer** (erster
Text-Übereinstimmungstreffer), was für den reinen **Text/Ebenen**-Import der ersten
Anzeige unkritisch ist (der Text der Einträge ist so oder so korrekt, nur die
`targetHeadingId`-Zuordnung könnte bei mehrdeutigem Text zunächst falsch sein) und ist
laut Design in Abschnitt 9.4 ohnehin nur ein Ausgangswert bis zum ersten tatsächlichen
Aktualisieren, das die Zuordnung anhand der dann aktuellen Dokumentstruktur korrekt
neu aufbaut.

`cachedPage` wird aus dem letzten `<text:tab/>`-getrennten Textsegment vor
`</text:p>` gelesen (siehe Format aus Abschnitt 11.1: `<text:tab/><Seitenzahl>` am Ende).

**Fallback bei nicht erkanntem/beschädigtem Aufbau (Anforderung Abschnitt 18,
Import-Robustheit):** Kann `text:table-of-content-source`/`text:index-body` nicht
sinnvoll geparst werden (z. B. fehlt eines der beiden Kind-Elemente), wird der
**sichtbare Text** des gesamten `text:table-of-content`-Elements ersatzweise als
gewöhnliche `paragraph`-Folge übernommen (kein `toc`-Node) — kein stiller
Totalverlust (Prinzip bereits an mehreren Stellen im bestehenden Code demonstriert,
z. B. `docx/reader.ts`s `MAX_TABLE_NESTING_DEPTH`-Fallback), aber der Feld-Charakter
geht in diesem Rand-Fall bewusst verloren, dokumentiert als Grenzfall analog zu
`inhaltsverzeichnis-einfuegen-req.md` Grenzfall 16/17.

---

## 12. Zusammenfassung geänderter/neuer Dateien

| Datei | Art | Inhalt der Änderung |
|---|---|---|
| `src/formats/shared/schema.ts` | geändert | `heading.headingId`-Attribut; neue Nodes `toc`, `toc_entry` (inkl. `toc_entry.cachedPage`, siehe Abschnitt 9.2-Korrektur) |
| `src/formats/shared/toc.ts` | **neu** | `recomputeAllTablesOfContents`, `recomputeOneTableOfContents`, `findAllTocNodes`, `collectHeadings` (intern), `JsonNode`-Interface als gemeinsame Quelle für Reader/Writer beider Formate |
| `src/formats/shared/editor/commands.ts` | geändert | `findEnclosingToc`, `attemptUpdateTableOfContents`, `insertMinimalTableOfContents` (Übergangs-/Testhilfe, Abschnitt 4.4), `TocUpdateOutcome`-Typ |
| `src/formats/shared/editor/Toolbar.tsx` | geändert | kontextueller „Aktualisieren"-Button + SVG-Icon; `ToolbarProps.onTocFeedback` |
| `src/formats/shared/editor/WordEditor.tsx` | geändert | `F9`-Keymap-Eintrag; `tocFeedback`-State + transiente Statusanzeige |
| `src/formats/shared/editor/pagination.ts` | geändert | `pageNumberForTopLevelIndex`, `tocPageApproxKey`-Plugin-State, Decoration-Ergänzung für `data-page-approx` |
| `src/index.css` | geändert | `.pm-toc`, `.pm-toc-entry::after`, Hinweistext-`::before` |
| `src/formats/docx/writer.ts` | geändert | `writeDocx()` ruft `recomputeAllTablesOfContents` bedingt (nur falls ≥1 `toc`-Node) auf; `tocBlockToDocx`; Bookmark-Ergänzung im `heading`-Fall |
| `src/formats/docx/reader.ts` | geändert | Erkennung Feld-Tripel **und** `w:sdt`-Variante; `parseTocField`; Bookmark→`headingId`-Übernahme im `heading`-Fall |
| `src/formats/odt/writer.ts` | geändert | analog zu `docx/writer.ts`; `tocBlockToOdt`; Bookmark-Ergänzung im `heading`-Fall |
| `src/formats/odt/reader.ts` | geändert | `parseTocElement`; Anker-Auflösung (Bookmark **und** `|outline`-Fallback) |
| `src/formats/odt/styleRegistry.ts` | geändert | `tocEntryStyleDefs()` (`Contents_20_N`-Stile) |
| `src/formats/shared/__tests__/toc.test.ts` | **neu** | Format-unabhängige Unit-Tests der Aktualisierungs-Logik (Abschnitt 13.3) |
| `src/formats/shared/editor/__tests__/pagination.test.ts` | geändert | neue Tests für `pageNumberForTopLevelIndex` |
| `src/formats/docx/__tests__/roundtrip.test.ts` | geändert | neue `describe('DOCX round trip: table of contents')`-Blöcke |
| `src/formats/odt/__tests__/roundtrip.test.ts` | geändert | analog |
| `src/formats/docx/__tests__/external-fixtures.test.ts` | geändert | Hinweis-Kommentar: keine reale TOC-Fixture verfügbar, siehe Risiko R1 |
| `src/formats/odt/__tests__/external-fixtures.test.ts` | geändert | neue Fälle für `test1.odt`/`compdocfileformat.odt`/`excelfileformat.odt` (Abschnitt 0.2) |
| `tests/e2e/toc-update.spec.ts` (Pfad exemplarisch — an tatsächliche E2E-Konvention des Repos anzupassen) | **neu** | Playwright-Testfälle aus Abschnitt 14 |

---

## 13. Grenzfall-Mapping (Anforderung Abschnitt 4)

| # | Grenzfall | Umsetzung in diesem Plan |
|---|---|---|
| 1 | Dokument ganz ohne Überschriften | `buildEntries` liefert `[]`; Writer (9.2/11.1) rendert „Keine Überschriften gefunden"-Platzhalter statt leerem Body |
| 2 | Aktualisieren ohne ToC im Dokument | `attemptUpdateTableOfContents` → `'not-found'` → sichtbare Statusmeldung (Abschnitt 6.2/6.3), kein Auto-Anlegen |
| 3 | Zwei unabhängige ToCs | `recomputeOneTableOfContents` + gezielte `pos`-Ermittlung über `findEnclosingToc` aktualisiert nur den einen; `tocIndex`-Zählung in Writern hält Bookmark-Namen pro ToC eindeutig |
| 4 | Überschrift in Tabellenzelle/Listenpunkt | `collectHeadings` durchläuft den **ganzen** Baum (nicht nur Top-Level) → wird inhaltlich korrekt eingeschlossen; `computeHeadingPageApprox` (Abschnitt 8.3) betrachtet nur Top-Level-Kinder → für solche Überschriften bleibt die Seitenzahl-Näherung schlicht unbesetzt (kein Crash, `cachedPages.get(...)` liefert `undefined` → Fallback `'1'`) |
| 5 | Konfigurierte Tiefe respektiert | `toc.maxLevel` bleibt bei jedem Rebuild unverändert (nur `content`/`dirty` werden in `recomputeOneTableOfContents`/`recomputeAllTablesOfContents` überschrieben, Abschnitt 3) |
| 6 | 200 Überschriften | `collectHeadings`/`buildEntries` sind lineare Baumdurchläufe; einzige Sorge ist die in Abschnitt 4.3 dokumentierte Voll-Dokument-`toJSON()`/`nodeFromJSON()`-Kosten — bei 200 Überschriften unkritisch, als bewusste Grenze dokumentiert |
| 7 | Überschrift ohne Text | `plainText(node)` liefert `''`; `buildEntries` erzeugt trotzdem einen Eintrag mit leerem `content` (konsistent mit Word/LibreOffice, die ebenfalls eine leere ToC-Zeile anzeigen) |
| 8 | Identischer Überschriftentext mehrfach | `targetHeadingId` pro Eintrag ist die tatsächliche `headingId` der jeweiligen Instanz, nicht textbasiert — strukturell korrekt getrennt |
| 9 | Klick auf Aktualisieren + Klick zum Neupositionieren | Abschnitt 6.4 — reguläre Transaktion, Pflicht-Regressionstest Abschnitt 14.5 |
| 10 | Cursor mitten in unfertiger Überschrift | Abschnitt „Cursor mid-typing" (siehe Text oben zu Grenzfall 10) — `collectHeadings` liest immer den **aktuellen** `state.doc`-Stand, keine Sonderbehandlung nötig, da ProseMirorigin-Zustand ohnehin immer „fertig getippt bis hierhin" ist |
| 11 | Undo einer Umbenennung, danach Aktualisieren | Kein Sonderfall: Undo restauriert `state.doc` inklusive der (unveränderten) `headingId`; `attemptUpdateTableOfContents` liest danach den echten, zurückgesetzten Text |
| 12 | Import einer echten Word-Datei mit TOC-Feld | Abschnitt 9.4 — funktional identisch behandelt, sobald einmal „aktualisiert" wurde (Abschnitt 3.1-Nachbarschaft); **Achtung Risiko R1** (Abschnitt 17): nicht gegen reale Datei verifizierbar mangels Fixture |
| 13 | Manuelle Texteingabe im ToC, dann Aktualisieren | Volle Neuerzeugung (Abschnitt 3.1) überschreibt kommentarlos; `.pm-toc::before`-Hinweistext (Abschnitt 8.4) kommuniziert das vorab |
| 14 | Ebenen-Sprung (1 → 4) | `buildEntries` filtert nur nach `level <= maxLevel`, erzeugt **keine** künstlichen Zwischenebenen; CSS-Einrückung (`schema.ts` `toc_entry.toDOM`, Abschnitt 2) skaliert linear mit `level`, unabhängig von Lücken |
| 15 | Löschen einer zuvor verlinkten Überschrift | `collectHeadings` findet sie nicht mehr → `buildEntries` erzeugt keinen Eintrag mehr dafür → verschwindet vollständig aus dem ToC bei nächster Aktualisierung; da Klick-Navigation selbst außerhalb des Geltungsbereichs liegt, kein Absturzrisiko hier zu prüfen, aber strukturell bereits sauber vorbereitet (keine dangling-Referenz im Datenmodell, weil volle Neuerzeugung nie alte `targetHeadingId`-Werte wiederverwendet, die nicht mehr existieren) |

---

## 14. Testplan (Ergänzung/Konkretisierung von Anforderung Abschnitt 6)

### 14.1 `src/formats/shared/__tests__/toc.test.ts` (neu, Anforderung 6 Punkt 3)

```ts
import { recomputeAllTablesOfContents, findAllTocNodes } from '../toc'

function doc(content: unknown[]) {
  return { type: 'doc', content }
}
function heading(level: number, text: string, headingId?: string) {
  return { type: 'heading', attrs: { level, align: 'left', headingId: headingId ?? null }, content: text ? [{ type: 'text', text }] : [] }
}
function toc(maxLevel = 3) {
  return { type: 'toc', attrs: { maxLevel, dirty: true }, content: [] }
}

describe('recomputeAllTablesOfContents', () => {
  it('collects headings in document order up to maxLevel, skipping deeper ones', () => {
    const root = doc([heading(1, 'A'), heading(2, 'B'), heading(4, 'zu tief'), toc(3)])
    const result = recomputeAllTablesOfContents(root as any)
    const entries = findAllTocNodes(result)[0].content!
    expect(entries.map((e: any) => e.content[0]?.text)).toEqual(['A', 'B'])
  })

  it('produces no ghost entries after a heading is removed', () => {
    const withBoth = recomputeAllTablesOfContents(doc([heading(1, 'A'), heading(1, 'B'), toc(3)]) as any)
    const aId = (withBoth.content[0] as any).attrs.headingId
    const afterRemoval = recomputeAllTablesOfContents(doc([withBoth.content[0], withBoth.content[2]]) as any) // 'B' entfernt
    const entries = findAllTocNodes(afterRemoval)[0].content!
    expect(entries).toHaveLength(1)
    expect((entries[0] as any).attrs.targetHeadingId).toBe(aId)
  })

  it('gives duplicate-text headings their own distinct targetHeadingId', () => {
    const result = recomputeAllTablesOfContents(doc([heading(1, 'Einleitung'), heading(1, 'Einleitung'), toc(3)]) as any)
    const entries = findAllTocNodes(result)[0].content!
    const ids = entries.map((e: any) => e.attrs.targetHeadingId)
    expect(new Set(ids).size).toBe(2)
  })

  it('reorders entries to follow actual document order after headings are moved', () => {
    const moved = doc([heading(1, 'Zweitens'), heading(1, 'Erstens'), toc(3)])
    const entries = findAllTocNodes(recomputeAllTablesOfContents(moved as any))[0].content!
    expect(entries.map((e: any) => e.content[0].text)).toEqual(['Zweitens', 'Erstens'])
  })

  it('drops an entry entirely when its heading is demoted to a plain paragraph', () => {
    const demoted = doc([{ type: 'paragraph', attrs: { align: 'left' }, content: [{ type: 'text', text: 'A' }] }, toc(3)])
    expect(findAllTocNodes(recomputeAllTablesOfContents(demoted as any))[0].content).toEqual([])
  })

  it('respects a configured maxLevel of 3 even after a level-5 heading is added, and never mutates maxLevel itself', () => {
    const result = recomputeAllTablesOfContents(doc([heading(1, 'A'), heading(5, 'zu tief'), toc(3)]) as any)
    const tocNode = findAllTocNodes(result)[0]
    expect(tocNode.attrs!.maxLevel).toBe(3)
    expect(tocNode.content).toHaveLength(1)
  })

  it('overwrites a manually edited entry text on the next recompute (Word/LibreOffice parity, Anforderung 3.6)', () => {
    const withEntry = recomputeAllTablesOfContents(doc([heading(1, 'Original'), toc(3)]) as any)
    const tocNode = findAllTocNodes(withEntry)[0]
    tocNode.content![0] = { ...tocNode.content![0], content: [{ type: 'text', text: 'Von Hand geändert' }] }
    const recomputedAgain = recomputeAllTablesOfContents(withEntry)
    expect((findAllTocNodes(recomputedAgain)[0].content![0] as any).content[0].text).toBe('Original')
  })

  it('handles two independent tocs without cross-contamination (Grenzfall 3)', () => {
    const twoTocs = doc([heading(1, 'A'), toc(3), heading(2, 'B'), toc(1)])
    const result = recomputeAllTablesOfContents(twoTocs as any)
    const [tocA, tocB] = findAllTocNodes(result)
    expect(tocA.content).toHaveLength(2) // A + B, beide <= Ebene 3
    expect(tocB.content).toHaveLength(1) // nur A, B ist Ebene 2 > maxLevel 1
  })

  it('is a no-op on a document with no toc node at all (Baseline-Rundreise-Voraussetzung)', () => {
    const noToc = doc([heading(1, 'A')])
    const result = recomputeAllTablesOfContents(noToc as any)
    expect((result.content[0] as any).attrs.headingId).toBeUndefined() // keine ID-Vergabe ohne ToC, siehe Abschnitt 9.3-Korrektur
  })
})
```

### 14.2 `pagination.test.ts` — Ergänzung

```ts
describe('pageNumberForTopLevelIndex', () => {
  it('returns 1 for any index before the first break', () => {
    expect(pageNumberForTopLevelIndex(0, [5, 10])).toBe(1)
  })
  it('counts how many breaks precede the given index, plus one', () => {
    expect(pageNumberForTopLevelIndex(7, [5, 10])).toBe(2)
    expect(pageNumberForTopLevelIndex(12, [5, 10])).toBe(3)
  })
})
```

### 14.3 DOCX/ODT Roundtrip-Ergänzungen

Je Format, analog zum bestehenden Muster in `roundtrip.test.ts`:
1. „preserves a toc's maxLevel and entry count across export/import"
2. „reflects a renamed heading in the toc entry after recompute + export + reimport"
   (Feature-Rundreise 5.2.1/5.2.2)
3. „reflects a newly added heading at the correct position" (5.2.3)
4. „reflects a removed heading" (5.2.4)
5. „the exported toc remains a real, recognizable field/element after reimport, not
   degraded to plain paragraphs" (5.2.1 Rest-Anforderung, 3.9) — Assertion: reimportierte
   `body.content` enthält einen Knoten `type === 'toc'`, nicht nur `paragraph`s mit
   ähnlichem Text.
6. Cross-Format DOCX→ODT→DOCX und ODT→DOCX→ODT (5.2.5/5.2.6) — bestehendes Testmuster
   für Cross-Format (falls bereits an anderer Stelle im Projekt vorhanden, sonst neu
   nach demselben Muster wie die übrigen Roundtrip-Suiten anzulegen).
7. Baseline: „a document with an unrelated toc-free structure is completely unaffected
   by writer/reader changes" (5.1 Punkt 5) — Byte-für-Byte-Diff unempfindlich, aber
   mindestens: keine neuen `headingId`/Bookmark-Attribute nach Reimport.

### 14.4 Externe Fixtures (`external-fixtures.test.ts`)

ODT: neue Testfälle für `test1.odt`, `compdocfileformat.odt`, `excelfileformat.odt`
(Abschnitt 0.2) — mindestens: Import stürzt nicht ab, `body.content` enthält einen
`toc`-Knoten, `toc.content.length > 0`, Klartext mindestens eines bekannten Eintrags
(„Abstract" bei `test1.odt`) ist im importierten Text wiederzufinden.

DOCX: **kein** entsprechender Testfall möglich, bis eine reale Fixture mit TOC-Feld
beschafft ist (Risiko R1, Abschnitt 17) — stattdessen ein Kommentar im Testfile, der auf
dieses Ticket und den fehlenden Fixture-Bedarf verweist, damit die Lücke nicht erneut
stillschweigend übersehen wird.

### 14.5 Playwright E2E (neu, Konvention/Pfad an bestehende E2E-Struktur des Repos anzupassen)

1. Dokument mit `insertMinimalTableOfContents` (Testhilfe, Abschnitt 4.4) + 3
   Überschriften vorbereiten → Überschrift per Toolbar-Dropdown umbenennen → auf
   „Aktualisieren" klicken → DOM-Text des ToC-Eintrags ändert sich sichtbar.
2. Dasselbe mit `F9` statt Klick.
3. **Pflicht-Regressionstest (Grenzfall 9/Anforderung 6 Punkt 5):** Text eingeben →
   Alles auswählen → Formatierung anwenden → auf „Aktualisieren" klicken → per Klick
   Cursor im Haupttext neu positionieren → weiter tippen → kein Datenverlust — exakt
   dieselbe Sequenz wie der bereits dokumentierte Selection-Sync-Regressionstest, nur
   mit dem ToC-Klick als zusätzlichem Zwischenschritt.
4. F9 ohne vorhandenes ToC im Dokument → sichtbare Statusmeldung „Kein
   Inhaltsverzeichnis im Dokument gefunden" erscheint und verschwindet nach ~2,5s
   wieder.
5. Zwei ToCs im Dokument, unterschiedliche Cursor-Position → jeweils nur das
   umschlossene ToC ändert sich nach Klick.
6. Vollständiger Rundreisetest über echten Datei-Upload/-Download (analog zu den in
   `seitenumbruch-code.md` Abschnitt 14 etablierten Mustern, hier nicht erneut
   ausformuliert) für DOCX und ODT.

---

## 15. Offene, hier explizit beantwortete Entscheidungen (Anforderung verlangt Festlegung + Dokumentation)

| Offene Frage (aus Anforderungsdatei) | Antwort | Begründung/Fundstelle in diesem Plan |
|---|---|---|
| Abschnitt 1 Element 5: Dialog „Nur Seitenzahlen" vs. „Gesamt" | **Kein Dialog** — eine einzige Aktualisieren-Aktion berechnet immer beides | Abschnitt „Struktur+Seitenzahlen"-Absatz vor Abschnitt 2; erlaubt laut Anforderung 3.4 als dokumentierte Vereinfachung |
| Abschnitt 3.11/Grenzfall 2: Verhalten bei „kein ToC vorhanden" | **Reiner Hinweistext**, kein automatisches Neu-Anlegen | Abschnitt 6.3 |
| Abschnitt 3.9: `w:dirty` setzen oder nicht | **Gesetzt** (`w:dirty="1"`, abhängig vom internen `toc.dirty`-Flag, das nur direkt nach Struktur-Rebuild `false` ist und sonst grob mit „seit letztem Rebuild nichts geändert" korreliert) | Abschnitt 9.2 — ehrlicher gegenüber Word bzgl. der dokumentierten Seitenzahl-Näherungsungenauigkeit (Anforderung 3.7/Befund 9) |
| Grenzfall 10: Cursor mitten in unfertiger Überschrift | **Immer der aktuelle, auch unfertige `state.doc`-Stand** wird verwendet, kein Warten auf Fokuswechsel | Abschnitt 13, Zeile Grenzfall 10 — strukturell alternativlos, da ProseMirror keinen separaten „Entwurfszustand" kennt |
| `inhaltsverzeichnis-einfuegen`: Node-Modellierung (dessen offene Frage) | **Beantwortet für beide Tickets gemeinsam:** eigener `toc`/`toc_entry`-Node | Abschnitt 1 |
| `inhaltsverzeichnis-einfuegen`: Editierbarkeit (dessen offene Frage) | **Direkt tippbar**, wird bei Aktualisieren überschrieben | Abschnitt 1.3 |
| `inhaltsverzeichnis-einfuegen`: Seitenzahl-Anzeige im Editor (dessen offene Frage) | **Ja, angezeigt**, als klar gekennzeichnete Näherung | Abschnitt 8.3/8.4 |

---

## 16. Bekannte, bewusst akzeptierte Einschränkungen (zu dokumentieren, keine Bugs)

1. Seitenzahlen im eigenen Editor **und** im gecachten Export-Text sind
   Näherungswerte, keine Garantie für Übereinstimmung mit Word/LibreOffice
   (Anforderung 3.7, durchgängig in Abschnitt 8 berücksichtigt).
2. Überschriften innerhalb von Tabellenzellen/Listenpunkten erhalten **keine**
   Seitenzahl-Näherung im Editor (Grenzfall 4), werden aber strukturell korrekt in
   Text/Ebene erfasst.
3. DOCX-Export verwendet **keine** `TOC1`–`TOC9`-Absatzformatvorlagen (Abschnitt 10) —
   optisch schlichter als ein Word-eigen erzeugtes Verzeichnis, funktional aber
   gleichwertig aktualisierbar.
4. `bookmarkNameFor`/Bookmark-Namensschema ist **nicht** Word-typisch (`_Toc12345678`),
   sondern lesbar aus der internen `headingId` abgeleitet — funktional unerheblich für
   Word selbst, aber ein Unterschied zu einem „von Word selbst erzeugten" ToC bei
   direktem XML-Vergleich (dokumentiert in Abschnitt 9.2 Fußnote).
5. Der `cachedPage`-Cache-Erhalt-Mechanismus (Abschnitt 9.2) ist der einzige Teil
   dieses Plans mit einer explizit dokumentierten „kann bei Aufwand/Nutzen-Problemen
   entfallen"-Klausel — sein Wegfall wäre **kein** Abnahme-Blocker.

---

## 17. Risiken/Lücken, die vor vollständiger Freigabe (Anforderung Abschnitt 7) zu schließen sind

- **R1 — Keine reale, mit Microsoft Word erzeugte DOCX-Datei mit echtem TOC-Feld im
  Repo** (Abschnitt 0.2, vollständig gegen alle 100 vorhandenen DOCX-Fixtures
  verifiziert). Die in Abschnitt 9 getroffenen Entscheidungen zur exakten
  `w:fldChar`/`w:instrText`/`w:sdt`-Struktur stützen sich auf allgemeines
  OOXML-Wissen, **nicht** auf eine verifizierte reale Datei. Erforderlich vor
  vollständiger Freigabe: eine solche Datei beschaffen (z. B. selbst mit einer
  verfügbaren Word-Installation erzeugen oder aus einem vertrauenswürdigen
  Open-Source-Testkorpus ergänzen) und Abschnitt 9.4/14.4 gegen sie nachverifizieren —
  exakt die in `inhaltsverzeichnis-aktualisieren-req.md` Abschnitt 6 Punkt 6 bereits
  geforderte Fixture, hier präzisiert: **nur für DOCX** fehlt sie tatsächlich, für ODT
  ist sie (Abschnitt 0.2) bereits vorhanden.
- **R2 — `inhaltsverzeichnis-einfuegen` liefert noch keine eigene Toolbar-UI.** Bis
  dahin ist die einzige Möglichkeit, im Editor selbst (nicht nur per Fremddatei-Import)
  einen `toc`-Knoten zu erzeugen, die interne Testhilfe `insertMinimalTableOfContents`
  (Abschnitt 4.4) — für Endnutzerinnen bleibt „aktualisieren" bis zur Umsetzung von
  „einfügen" **nur** über importierte Fremddateien mit bereits vorhandenem
  Verzeichnis nutzbar. Exakt der in Anforderung Abschnitt 7 (letzter Punkt)
  vorgesehene, explizit zulässige Zwischenzustand — im Abnahmeprotokoll entsprechend
  zu vermerken, nicht stillschweigend als „vorhanden" zu verbuchen.
- **R3 — Der `cachedPage`-Mechanismus (Abschnitt 9.2) führt ein zusätzliches, im
  Schema sichtbares, aber von Editor-Commands nie aktiv geschriebenes Attribut
  (`toc_entry.cachedPage`) ein.** Vor Implementierung zu prüfen, ob diese
  Attribut-„Nur Reader/Writer dürfen schreiben"-Konvention sauber genug durchsetzbar
  ist (z. B. über Kommentar + Code-Review-Konvention, ProseMirror selbst kennt keine
  Attribut-Zugriffsrechte) — bei Unklarheiten während der Implementierung eher die in
  Abschnitt 9.2 vorgeschlagene Vereinfachung (Cache-Erhalt ersatzlos weglassen) wählen.
- **R4 — Kein bestehendes E2E-Testverzeichnis wurde in diesem Durchsicht lokalisiert**
  (nur Vitest-`__tests__`-Ordner gefunden). Der in Abschnitt 14.5 vorgeschlagene Pfad
  `tests/e2e/toc-update.spec.ts` ist **exemplarisch** — vor Implementierung zu prüfen,
  wie/ob E2E-Tests in diesem Repo aktuell überhaupt organisiert sind (ggf. erst als
  Teil dieses Tickets ein E2E-Grundgerüst anzulegen, falls noch keines existiert).

---

## 18. Abnahme-Checkliste (Mapping auf `inhaltsverzeichnis-aktualisieren-req.md` Abschnitt 7)

- [ ] Toolbar-Button (Abschnitt 5), F9 (Abschnitt 6.1), sichtbare Rückmeldung
      (Abschnitt 6.2), Export-Trigger (Abschnitt 9.2/11.1 — Aufruf am Anfang von
      `writeDocx`/`writeOdt`) — alle vier gebaut und über Testfälle 14.5.1/2/4/6
      nachgewiesen.
- [ ] Alle Testfälle aus Abschnitt 6 der Anforderungsdatei — abgedeckt durch
      Abschnitt 14.1–14.5 dieses Plans.
- [ ] Alle 15 Grenzfälle einzeln befundet — Abschnitt 13 (Tabellen-Mapping), Rest-Detail
      in den jeweils referenzierten Abschnitten.
- [ ] Baseline-Rundreise (5.1) nicht gebrochen — abgesichert durch die
      `findAllTocNodes(...).length > 0`-Vorbedingung (Abschnitt 9.3-Korrektur) vor jeder
      `headingId`-Vergabe/Bookmark-Erzeugung, Testfall 14.3 Punkt 7.
- [ ] Feature-Rundreise (5.2) DOCX/ODT/Cross-Format — Testfälle 14.3 Punkt 1–6.
      **Punkte 7–8 (reale Word-/LibreOffice-Fremddatei) hängen von R1 ab** (DOCX-Seite
      ungeklärt, ODT-Seite mit `test1.odt` etc. bereits erfüllbar).
- [ ] Selection-Sync-Regressionstest mit ToC-Klick-Sequenz — Testfall 14.5.3.
- [ ] Abhängigkeit von `inhaltsverzeichnis-einfuegen` (Abschnitt 0.6) — **nicht
      erfüllt** vor Umsetzung jenes Tickets; dieser Plan liefert die dafür nötige
      gemeinsame Infrastruktur (Schema/Reader/Writer) bereits mit, aber **keine**
      eigene Einfüge-Oberfläche (bewusst, Abschnitt 4.4/Risiko R2) — Status nach
      Umsetzung **dieses** Tickets ist deshalb `teilweise` im Sinne der Anforderung,
      bis entweder „einfügen" nachgezogen ist oder die Verifikation ausdrücklich (wie
      in Anforderung Abschnitt 7 letzter Punkt vorgesehen) auf importierte
      Fremddateien beschränkt und so im Abnahmeprotokoll vermerkt wird.
