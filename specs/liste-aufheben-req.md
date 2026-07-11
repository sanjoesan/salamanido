# Anforderung: Liste aufheben

Status: **vorhanden laut Backlog — gilt aktuell als nicht vertrauenswürdig, muss
vollständig verifiziert werden.** Diese Datei ist die verbindliche Anforderung, gegen
die die Verifikation (echte Browser-Bedienung + Rundreise-Tests) durchgeführt wird,
bevor der Status auf „verifiziert" gehoben werden darf.

Bezug: `specs/FEATURE-BACKLOG.md`, Abschnitt „2.6 Listen" (Überschrift Zeile 150), Zeile
`liste-aufheben` (Zeile 156) — Titel „Liste aufheben", Beschreibung „Wandelt Listenpunkte
zurück in normale Absätze, Text bleibt erhalten.", Priorität 1 (essenziell/fundamental).

Stil/Methodik dieser Datei orientiert sich an `FEATURE-SPEC-DOCX-ODT.md` (Abschnitt 5
„Listen") sowie an den bereits vorliegenden Einzel-Anforderungen
`specs/ausrichtung-links-req.md` und `specs/nummerierte-liste-req.md`: Referenztabelle
mit Code-Fundstellen, danach Soll-Verhalten in Fließtext/Listen je Aspekt, danach
Grenzfälle, danach Rundreise-Pflicht (Upload unverändert → Export → Re-Import erhält
Inhalt) für **beide** Formate (DOCX und ODT), danach nummerierte Testfälle.

> **Verifikationsstand / Korrekturen gegenüber dem Vorentwurf (Stand 2026-07-04).**
> Diese Fassung ist eine kritische Überarbeitung eines früheren Durchlaufs. Sämtliche
> Code-Fundstellen wurden gegen den **aktuellen** Quellstand neu geprüft; der Vorentwurf
> war an mehreren zentralen Stellen faktisch falsch bzw. veraltet und hätte die
> Verifikation in die Irre geführt. Die wichtigsten Korrekturen:
> 1. **Schema `list_item`:** Content ist **`block+`** (`schema.ts:147`), **nicht**
>    `paragraph block*` wie zuvor behauptet. Ein Listenpunkt muss deshalb **keinen**
>    führenden Absatz haben — er kann als einzigen/ersten Block eine verschachtelte Liste
>    oder ein blankes Bild enthalten (Schema-Kommentar `schema.ts:139-145`). Das ist für
>    das Aufheben und für „Text bleibt erhalten" direkt relevant (siehe 3.9).
> 2. **DOCX kann Mehrstufigkeit — sowohl schreiben als auch lesen.** Der Vorentwurf
>    behauptete, DOCX-Export schreibe **fest** `w:ilvl=0` und DOCX-Import verwerfe jede
>    Ebeneninformation, sodass Mehrstufigkeit nur über ODT erreichbar sei. **Beides ist
>    falsch.** Der Writer führt einen `ListContext` mit `level` bis `MAX_LIST_ILVL=8`
>    (`docx/writer.ts:96-140`), die Nummerierungsdefinition definiert je **9** Ebenen
>    (`docx/styleDefs.ts:37-74`), und der Reader liest `w:ilvl` (`reader.ts:294-302`) und
>    rekonstruiert die Verschachtelung über einen Frame-Stack (`groupLists`,
>    `reader.ts:366-440`). Mehrstufige Listen entstehen daher **auch** über DOCX-Import und
>    überstehen die DOCX-Rundreise. Abschnitte 3.6, 4.4, 4.14, 5.1, 5.3 sind entsprechend
>    neu gefasst.
> 3. **Testabdeckung.** Der Vorentwurf behauptete, es gebe „keinen einzigen" Listentest.
>    Tatsächlich existiert Abdeckung für das **Erzeugen/Verschachteln** von Listen
>    (`docx/__tests__/roundtrip.test.ts:141-201` inkl. 2-stufigem Nesting;
>    ODT-Äquivalent; E2E `tests/e2e/roundtrip-fidelity.spec.ts:95-136` prüft `li`- und
>    verschachtelte-`li ul/li ol`-Zählung über die Rundreise). **Ungetestet ist genau die
>    Aufheben-Aktion** (`liftFromList`/`liftListItem` kommen im gesamten Testcode nicht
>    vor). Das ist die eigentliche Lücke, die diese Anforderung schließt.
> 4. Sämtliche Zeilennummern in der Referenztabelle wurden korrigiert (der Vorentwurf war
>    durchgängig um Dutzende Zeilen verschoben).
> 5. **Erneute Anker-Kontrolle am Live-Quellstand 2026-07-05.** Die tragenden Code-Fundstellen
>    wurden unabhängig gegen den aktuellen Quellcode nachgeprüft und stimmen **zeilengenau**:
>    `schema.ts:115-152` (`bullet_list`/`ordered_list` = `list_item+`, `list_item` = `block+`,
>    Kommentar `:139-145`), `commands.ts:62-64` (`liftFromList`-Alias) und `:126-128` (`canCut`
>    als Vorbild-Prädikat), `Toolbar.tsx:241-273` (drei Listen-Buttons; „⇧ Liste" `title` `:265`,
>    ohne `aria-label`/`disabled`), `styleDefs.ts:32-35/50-74` (je 9 Ebenen, kein
>    `w:startOverride`), `writer.ts:96-140` (`ListContext`, `MAX_LIST_ILVL=8`, `<w:numPr>` nur
>    bei vorhandenem `listContext`). Es wurde **keine** Drift gegenüber dem Stand 2026-07-04
>    festgestellt. Nicht erneut Zeile-für-Zeile geprüft (unverändert vom 2026-07-04-Pass
>    übernommen): `docx/reader.ts` `groupLists`, `odt/reader.ts`/`odt/writer.ts` und der
>    `node_modules/prosemirror-schema-list`-Bibliothekscode — vor Abnahme im Zuge der
>    Verifikation gegenzuprüfen.
> 6. **Zusätzliche, in diesem Durchlauf (2026-07-05, nach den `Ausschneiden`-Commits) neu
>    ergänzte Ankerprüfung — vollständiger Bibliothekscode und Test-/Config-Abgleich.** Über
>    Punkt 5 hinaus wurden in diesem Durchlauf zusätzlich gegengeprüft und bestätigt: (a) der
>    komplette `liftListItem`/`liftToOuterList`/`liftOutOfList`-Bibliothekscode
>    (`node_modules/prosemirror-schema-list/dist/index.js:206-260`) — die in 3.1/3.4/3.6
>    beschriebene Splitting-/Ein-Ebene-Logik stimmt Zeile für Zeile; insbesondere bestätigt
>    `liftOutOfList:248-257`, dass bei „Punkt ist gleichzeitig erster **und** letzter der
>    Liste" (`atStart && atEnd`) **beide** `Fragment`-Anteile der eingefügten Slice leer
>    bleiben, der Listenknoten also vollständig verschwindet (3.1) — bei nur `atStart` **oder**
>    nur `atEnd` bleibt genau eine Teilliste als `list.copy(Fragment.empty)` stehen, die andere
>    Seite wird zur zweiten Teilliste (3.4); (b) alle referenzierten realen Fixture-Pfade
>    existieren tatsächlich im Repo (per Dateisystemprüfung, alle 25 in der Tabelle unten
>    genannten DOCX-/ODT-Dateien vorhanden); (c) `odt/writer.ts:99-108`, `odt/reader.ts:70-77`
>    (`parseAutomaticStyles`-Listenart-Erkennung) und `:286-298` (`elementToBlocks`-Listenaufbau,
>    Leerpunkt-Fallback), `odt/styleRegistry.ts:95-96/100-101` (`BULLET_LIST_STYLE_NAME='LB'`/
>    `ORDERED_LIST_STYLE_NAME='LO'`, je nur `text:level="1"` definiert) — alle unverändert
>    gegenüber der Referenztabelle; (d) `docx/__tests__/roundtrip.test.ts:141-201` sowie
>    `tests/e2e/roundtrip-fidelity.spec.ts:36-37/108-122/139-166` — Testnamen, Zeilen und
>    geprüfte Aussagen (u. a. `nestedListsAfter`-Vergleich `:120-122`) stimmen. **Neu
>    entdeckt und unten ergänzt (Abschnitt „Playwright-Projektmatrix" in der Referenztabelle,
>    Grenzfall 4.11, Testfall 6.16, Abnahmekriterium 12):** Aus den zeitlich nach dem
>    Vorentwurf gelandeten `Ausschneiden`(Cut)-Commits (siehe `git log`: „Fix flaky
>    Mobile-project cut.spec.ts failures…", „Grant explicit clipboard-read/write
>    permissions…") stammt ein für **diese** Anforderung unmittelbar relevantes, verifiziertes
>    Muster: E2E-Tests, die eine Selektion per Tastatur aufbauen und danach sofort einen
>    Toolbar-/Tastatur-Befehl auslösen, benötigen auf dem `Mobile`-Playwright-Projekt
>    (`playwright.config.ts:35`, Pixel-7-Touch-Emulation) ein kurzes `page.waitForTimeout(50)`
>    zwischen Selektionsaufbau und Befehl, um die asynchrone `selectionchange`-Synchronisation
>    abzuwarten (`cut.spec.ts:505-507`, `selection-regression.spec.ts:34/72/103`) — sonst
>    drohen genau die Race-Flakes, die die jüngsten Commits beheben mussten. **Da „Liste
>    aufheben" ebenfalls auf einer per Tastatur/Maus aufgebauten Selektion operiert, gilt
>    dasselbe Risiko für die hier zu schreibenden E2E-Tests (insbesondere Testfall 6.2 „alle
>    Punkte markieren").** Zusätzlich existiert dort ein **präzedenzfähiges** Beispiel für den
>    Umgang mit einer nicht behebbaren, CI-only reproduzierbaren Mobile-Flakiness: ein
>    dokumentierter, mit ausführlicher Begründung versehener `test.skip(testInfo.project.name
>    === 'Mobile', …)` (`cut.spec.ts:473-492/522-526`), **nicht** ein stillschweigendes
>    Auslassen des Projekts. Sollte während der Verifikation dieser Anforderung eine analoge,
>    nur auf `Mobile` und nur in CI reproduzierbare Flakiness auftreten, ist nach demselben
>    Muster zu verfahren (siehe Grenzfall 4.11, Testfall 6.16, Abnahmekriterium 12) statt den
>    Fall unkommentiert zu ignorieren.
> Die aus dem Bibliothekscode abgeleitete Verhaltensanalyse (ein Aufheben-Schritt pro
> Ebene, Teilung in zwei Listen, `start`-Übernahme) hat der erneuten Prüfung **standgehalten**
> und ist unverändert übernommen — sie bleibt jedoch bis zur echten Browser-Verifikation
> eine begründete Annahme, kein Nachweis.

Explizit **nicht** alleiniger Gegenstand dieser Anforderung (eigene bzw. noch zu
schreibende Backlog-Einträge/Anforderungsdateien):
- `aufzaehlungsliste` / `nummerierte-liste` — das *Erzeugen* einer Liste
  (`toggleList`/`wrapInList`). `specs/nummerierte-liste-req.md` existiert bereits und
  behandelt Erzeugen, Enter-Verhalten, Ein-/Ausrücken, Fortsetzen/Neustart im Detail.
  Diese Datei hier behandelt ausschließlich das **Aufheben** einer bestehenden Liste
  (Button „⇧ Liste" / `liftFromList()`), verweist aber an den Stellen, an denen beide
  Features denselben Code-Pfad oder dieselbe offene Frage teilen (insbesondere
  Mehrstufigkeit), explizit auf `specs/nummerierte-liste-req.md`, statt die dortige
  Analyse zu duplizieren.
- `mehrstufige-liste` (Backlog „fehlt", Priorität 2, Zeile 157) / `liste-einruecken-tab`
  (Backlog „fehlt", Priorität 1, Zeile 158): Es gibt aktuell **keine** UI-Möglichkeit
  (kein Toolbar-Button, keine Tastenkombination), im Editor selbst eine
  mehrstufige/verschachtelte Liste zu **erzeugen** oder eine Ebene ein-/auszurücken (siehe
  Referenztabelle, Zeile „Tastenkombination / Ein-/Ausrücken"). Das begrenzt den in der
  Praxis über die reine UI-Bedienung erreichbaren Anwendungsfall von „Liste aufheben" auf
  Listen, die entweder einstufig im Editor erzeugt oder aus einer Datei importiert wurden.
  Der mehrstufige Fall ist trotzdem **nicht** irrelevant, da er über einen **DOCX- oder
  ODT-Import** einer echten verschachtelten Fremddatei sehr wohl im Dokumentmodell
  entstehen kann (siehe Abschnitt 3.6/4.4 unten) und dann ebenfalls per „Liste aufheben"
  bedient werden muss.

Bereits vorgefundener Implementierungsstand (Referenz für die Verifikation, **kein**
Ersatz für tatsächliches Testen — alle Zeilenangaben Stand 2026-07-04):

| Ebene | Fundstelle |
|---|---|
| Schema: Listenknoten | `src/formats/shared/schema.ts:115-122` (`bullet_list`, Content `list_item+`), `:124-137` (`ordered_list`, zusätzliches Attribut `start`, Default `1`, `:127`; native Anzeige über `<ol start=…>` in `toDOM`, `:134-136`), `:146-152` (`list_item`, Content **`block+`**, `:147`). **Wichtig:** `list_item` verlangt **keinen** führenden Absatz — ein Punkt kann als ersten/einzigen Block eine verschachtelte Liste oder ein Bild enthalten (Schema-Kommentar `:139-145` nennt genau die Fixtures `listLevel10.odt`/`imageWithinList.odt`). |
| Befehl „Liste aufheben" | `src/formats/shared/editor/commands.ts:62-64`, `liftFromList()`: reiner Alias-Wrapper um `liftListItem(wordSchema.nodes.list_item)` aus `prosemirror-schema-list` (Import `commands.ts:2`) — **kein** eigener Code, keine projektspezifische Sonderbehandlung. |
| Semantik von `liftListItem` (Bibliothekscode, `node_modules/prosemirror-schema-list/dist/index.js:206-219`) | Ermittelt per `$from.blockRange($to, pred)` den von der Selektion abgedeckten Bereich; `pred` (`:209`) verlangt, dass der unmittelbare Elternknoten der betroffenen Blöcke ein erstes Kind vom Typ `list_item` besitzt. Ist der Knoten **eine Ebene über** dem Bereich selbst wieder ein `list_item` (Selektion in einer **verschachtelten** Liste, Prüfung `:214`), wird `liftToOuterList` (`:220-237`) aufgerufen: die betroffenen Punkte werden nur **eine Ebene** höher in die äußere Liste gehoben — bleiben also weiterhin Listenpunkt, nur weniger tief verschachtelt (nachfolgende Geschwister werden dabei Kinder des zuletzt gehobenen Punkts, `:222-227`). Nur wenn die Selektion in der **obersten** Listenebene liegt (`:216`), wird `liftOutOfList` (`:238-260`) aufgerufen, das die Punkte tatsächlich in normale Geschwister-Blöcke außerhalb jeder Liste umwandelt. **Konsequenz:** Ein einzelner Klick auf „Liste aufheben" wandelt einen mehrstufig verschachtelten Punkt **nicht** direkt in einen normalen Absatz, sondern rückt ihn zunächst nur aus — deckungsgleich mit der in `specs/nummerierte-liste-req.md` Abschnitt 2.6 offen gelassenen Frage, hier anhand des tatsächlichen Bibliothekscodes bestätigt. **Zusatz-Fakt:** Wird der Befehl mit `dispatch === null` aufgerufen, liefert er `true` genau dann, wenn ein gültiger Bereich existiert (`:212-213`) — d. h. `liftFromList()(state, null)` ist bereits ein fertiges Verfügbarkeits-Prädikat „Cursor steht in einer aufhebbaren Liste" (relevant für Grenzfall 4.1/4.15). |
| Toolbar-Button | `src/formats/shared/editor/Toolbar.tsx:263-273`: `title="Liste aufheben"` (`:265`), Label-Text `"⇧ Liste"` (`:272`), `onMouseDown` mit `e.preventDefault()` und `run(view, liftFromList())` (`:266-269`). **Kein** `aria-label`, **kein** `aria-pressed`/aktiver Zustand, **kein** `disabled`-Zustand außerhalb einer Liste — im Unterschied zu `MarkButton` (`:55-89`), das zusätzlich zu `title` auch `aria-label` und `aria-pressed` setzt (`:73-75`). |
| Nachbar-Buttons (Kontext) | `Toolbar.tsx:241-251` „• Liste" (`toggleList(false)`), `:252-262` „1. Liste" (`toggleList(true)`) — ebenfalls ohne aktiven Zustand; alle drei Listen-Buttons liegen in derselben Toolbar-Gruppe direkt hintereinander (`:241-273`). |
| `run()`-Hilfsfunktion | `Toolbar.tsx:28-31`: ruft `command(view.state, view.dispatch, view)` und danach `view.focus()`. Der **Rückgabewert** des Command wird **nicht** geprüft — ein `false` (nichts aufzuheben) bleibt daher ohne jede Rückmeldung (siehe 3.12). |
| Tastenkombination | **Keine vorhanden** — weder für „Liste aufheben" selbst noch für Ein-/Ausrücken. Kein `Tab`/`Shift-Tab`-Eintrag in der Keymap (`WordEditor.tsx:77-99`); `sinkListItem` wird im gesamten Projekt-Quellcode (außerhalb `node_modules`) nirgends importiert oder verwendet (nur `splitListItem` ist importiert, `WordEditor.tsx:7`). |
| Enter-Verhalten (verwandter, aber separater Code-Pfad) | `WordEditor.tsx:88`: `Enter: splitListItem(wordSchema.nodes.list_item)`. `splitListItem` (Bibliothekscode `:136-186`) enthält einen Sonderfall für einen **leeren** Listenpunkt am Ende der Liste, der diesen unter bestimmten Tiefenbedingungen aus der Liste heraushebt („Enter auf leerem Punkt beendet Liste") — **anderer Mechanismus als der Button** und nicht Gegenstand dieser Anforderung, wird aber in Grenzfall 4.7 zur Abgrenzung erwähnt. |
| DOCX-Export von Listen | `src/formats/docx/writer.ts:105-156`. `bullet_list`/`ordered_list` (`:125-140`) werden **nicht** als eigene XML-Elemente geschrieben, sondern rekursiv auf ihre `list_item`-Kinder durchgereicht (`flatMap`, `:137-139`); jeder daraus entstehende Absatz bekommt ein `<w:numPr>` mit `<w:ilvl w:val="${listContext.level}"/>` und `<w:numId>` (`:114-115`). Der `level` ist **nicht** fest 0: Ein verschachtelter Listenknoten teilt sich die `numId` des Elternknotens und geht **eine** `w:ilvl` tiefer (`:134-135`), gedeckelt auf `MAX_LIST_ILVL=8` (`:103`). **Bekannte Vereinfachung:** Der verschachtelte Knoten übernimmt nur `numId`+`level`, **nicht** seinen eigenen Typ — eine z. B. **nummerierte** Unterliste innerhalb einer **Aufzählung** wird beim DOCX-Export mit der Bullet-`numId` geschrieben und käme als Bullet-Unterebene zurück (Text bleibt erhalten, nur die Markerart der Unterebene vereinfacht sich). Das `start`-Attribut einer `ordered_list` wird vom Writer **gar nicht** gelesen — es geht beim DOCX-Export verloren (kein `w:startOverride`). |
| DOCX-Nummerierungsdefinition | `src/formats/docx/styleDefs.ts:32-74`: `BULLET_ABSTRACT_ID=0`, `ORDERED_ABSTRACT_ID=1`, `BULLET_NUM_ID=1`, `ORDERED_NUM_ID=2` (`:32-35`). Für **beide** abstrakten Definitionen werden **je 9 Ebenen** (`w:ilvl` 0–8) erzeugt (`bulletLevelsXml`/`orderedLevelsXml`, `:50-62`; Bullet-Glyphen zyklisch `• ◦ ▪`, geordnet zyklisch decimal/lowerLetter/lowerRoman). Damit besitzt jede exportierte Verschachtelungsebene eine echte Ebenendefinition (**korrigiert** gegenüber Vorentwurf, der „nur eine Ebene" behauptete). |
| DOCX-Import von Listen | `src/formats/docx/reader.ts`: `ListMarker { numId, ilvl }` (`:289-292`); `listMarkerFor` liest **beide**, `w:numId` **und** `w:ilvl` (`:294-302`). `groupLists` (`:366-440`) rekonstruiert die Verschachtelung aus der flachen `w:ilvl`-Folge über einen Stack von „offenen Ebenen"-Frames: tiefere `ilvl` öffnet eine neue verschachtelte Liste im zuletzt hinzugefügten Punkt (`:421-423`), flachere `ilvl` schließt Frames und hängt die fertige Unterliste an (`:424-434`); ein Absatz **ohne** `numPr` schließt **alle** offenen Frames (`closeAll`, `:410-414`). **Konsequenz:** Eine real mehrstufige DOCX-Liste wird **nicht** flach abgebildet, und ein per „Liste aufheben" entstandener normaler Absatz zwischen zwei Teillisten trennt diese beim Reimport zuverlässig. **Detail:** Der Listen-Marker wird nur `paragraph`-Blöcken zugeordnet — ein aus derselben `<w:p>` extrahiertes Bild/Objekt erhält `numId:null` (`:476`) und unterbricht die Liste. |
| ODT-Export von Listen | `src/formats/odt/writer.ts:99-109`: rekursiver, generischer Aufruf von `blockToOdt` über `item.content` — verschachtelte `bullet_list`/`ordered_list`-Knoten **innerhalb** eines `list_item` werden dadurch strukturell korrekt als verschachteltes `<text:list>` geschrieben. Beide Ebenen referenzieren jedoch **denselben** Listenstil (`BULLET_LIST_STYLE_NAME='LB'`/`ORDERED_LIST_STYLE_NAME='LO'`, `styleRegistry.ts:95-96`), der nur eine einzige Formatdefinition für `text:level="1"` enthält (`styleRegistry.ts:98-103`) — für tiefere Ebenen existiert keine eigene Einzugs-/Formatdefinition. |
| ODT-Import von Listen | `src/formats/odt/reader.ts`: Listenart Bullet/Ordered je Stilname (`parseAutomaticStyles`, `:70-75`, unterschieden am Vorhandensein von `text:list-level-style-number`), Listenaufbau in `elementToBlocks` (`:286-299`): rekursiv, ein verschachteltes `<text:list>` **innerhalb** eines `<text:list-item>` wird als verschachtelter `bullet_list`/`ordered_list`-Block abgebildet (Tiefenbegrenzung `MAX_NESTING_DEPTH=25`, `:218`; leerer Punkt fällt auf einen leeren Absatz zurück, `:296`). Über einen ODT-Import kann also ebenso wie über DOCX eine echte Mehrfachverschachtelung im Dokumentmodell entstehen. |
| Unit-Tests (Reader/Writer, konstruierte Testdaten) | `src/formats/docx/__tests__/roundtrip.test.ts:141-201` („DOCX round trip: lists"): Bullet-Liste mit mehreren Punkten (`:142-155`), Ordered≠Bullet (`:159-164`), zwei getrennte Listen mit trennendem Absatz (`:167-175`), **2-stufige verschachtelte** Liste (`:181-201`, „Ebene 2"). ODT-Äquivalent in `src/formats/odt/__tests__/roundtrip.test.ts`. **Kein** Test ruft `liftFromList`/`liftListItem` auf oder prüft das **Aufheben** einer Liste. |
| E2E-Tests (echte Browser-Bedienung) | `tests/e2e/roundtrip-fidelity.spec.ts` prüft für DOCX→DOCX (`:95-136`) und ODT→ODT (`:139+`) u. a. die Erhaltung der `li`-Anzahl und der **verschachtelten** `li ul`/`li ol`-Anzahl über die Rundreise (`:108-122`). **Kein** E2E-Test bedient jedoch „Liste aufheben"/`liftFromList` (per Volltextsuche bestätigt). Diese Anforderung ist damit die **erste** systematische Behandlung der **Aufheben-Aktion**. |
| Reale Testfixtures mit Listen (im Repo vorhanden, alle Pfade verifiziert) | DOCX: `tests/fixtures/external/docx/{ComplexNumberedLists,Numbering,NumberingWOverrides,NumberingWithOutOfOrderId}.docx`. ODT: `tests/fixtures/external/odt/{bulletListTest,bullet_list,list,liste2,simpleList,simpleList3,simple_bullet_list,EasyList,ListRoundtrip,ListHeading,ListHeading2,ContinueListTest,preparedList,listLevel10,listStyleId,listsInTable,simple-table-with-lists,imageWithinList,brokenList,ListOddity,ListStyleResolution}.odt`. |
| Playwright-Projektmatrix (für die neu zu schreibenden E2E-Tests dieser Anforderung) | `playwright.config.ts:27-53`: `Desktop Chrome` (`:34`), `Mobile` (Pixel 7 Touch-Emulation, `:35`), `Tablet` (iPad Mini, `:36`) laufen für **alle** regulären Specs (inkl. der hier neu zu schreibenden); `Desktop Safari`/`Desktop Firefox` (`:43-53`) sind auf Clipboard-Specs beschränkt und für „Liste aufheben" nicht relevant. **Bekanntes, aus den `Ausschneiden`-Commits verifiziertes Timing-Risiko:** Ein per Tastatur/Maus aufgebauter Selektionswechsel, gefolgt unmittelbar von einem Befehl (Toolbar-Klick/Tastenkombination), kann auf dem `Mobile`-Projekt in CI eine Race-Flakiness auslösen, weil die asynchrone `selectionchange`-Synchronisation noch nicht abgeschlossen ist — behoben in vergleichbaren Tests durch ein kurzes `page.waitForTimeout(50)` zwischen Selektionsaufbau und Aktion (`cut.spec.ts:505-507`, `selection-regression.spec.ts:34/72/103`). Für die E2E-Tests dieser Anforderung (insbesondere Testfall 6.2, mehrere Punkte per Selektion markieren und aufheben) ist dasselbe Muster vorsorglich anzuwenden bzw. bei beobachteter Flakiness nachzurüsten, statt sie unkommentiert zu tolerieren. Für den (hoffentlich nicht eintretenden, aber präzedierten) Fall einer nicht behebbaren, ausschließlich auf `Mobile` und ausschließlich in CI reproduzierbaren Flakiness existiert ein dokumentiertes Vorbild für kontrolliertes, begründetes Auslassen (`cut.spec.ts:473-492`, `:522-526`: ausführlich begründeter `test.skip(testInfo.project.name === 'Mobile', …)`), das bei Bedarf identisch anzuwenden ist. |

---

## 1. Ziel

Nutzer:innen können einen oder mehrere markierte Listenpunkte (Aufzählung oder
Nummerierung) über den Toolbar-Button „Liste aufheben" (⇧ Liste) in normale Absätze
zurückverwandeln, **ohne dass dabei Text verloren geht** — konsistent im
Editor-Rendering, beim DOCX-Export und beim ODT-Export, und das Ergebnis bleibt bei
jeder Rundreise (Export → Re-Import, Cross-Format) inhaltlich stabil.

Das Kernversprechen der Backlog-Beschreibung „Text bleibt erhalten" ist der zentrale,
nicht verhandelbare Prüfpunkt dieser Anforderung: Jede Verifikation, die zwar die
Listenstruktur korrekt entfernt, dabei aber auch nur ein Zeichen, ein Zeichenformat
(Fett etc.), eine Ausrichtung oder einen Zusatzblock (Bild/Tabelle/verschachtelte
Liste innerhalb eines Punkts) verliert, gilt als **nicht bestanden**, selbst wenn die
Liste selbst korrekt verschwindet.

---

## 2. Menüpunkte / Bedienelemente

| # | Bedienelement | Ort | Ist-Zustand (zu verifizieren) | Soll |
|---|---|---|---|---|
| 1 | Toolbar-Button „⇧ Liste" | Listen-Gruppe der Toolbar, dritter von drei Listen-Buttons, direkt nach „• Liste" und „1. Liste" (`Toolbar.tsx:263-273`) | Vorhanden, `title="Liste aufheben"`, ruft bei `onMouseDown` (mit `e.preventDefault()`) `run(view, liftFromList())` auf. **Kein** `aria-label`, **kein** `aria-pressed`, **kein** sichtbarer Hinweis, ob der Cursor gerade in einer Liste steht | Muss per Maus-Klick (mousedown, Selektion darf nicht verloren gehen) die von der Selektion erfassten Listenpunkte in normale Absätze umwandeln; `aria-label="Liste aufheben"` ist zu ergänzen (Konsistenz zu `MarkButton`); ein aktiver/inaktiver Hinweiszustand (Button nur aktivierbar, wenn Cursor in einer Liste steht) ist zu klären — Datengrundlage dafür ist bereits vorhanden (`liftFromList()(view.state, null)` liefert genau dieses Signal, siehe 4.1) |
| 2 | Icon „⇧ Liste" | Toolbar-Button | Text-Label mit Unicode-Pfeilsymbol „⇧", kein SVG | Analog zu `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 17/20.1: Symbol muss auf Systemen ohne verlässliche Unicode-Glyphen weiterhin eindeutig als „Liste aufheben" (nicht verwechselbar mit „Einrücken"/„Ausrücken", falls diese Funktionen künftig ergänzt werden) erkennbar sein; bevorzugt SVG statt Unicode |
| 3 | Tastenkombination | — | **Nicht vorhanden.** In Word/LibreOffice existiert hierfür keine feste Standardtaste (anders als Fett/Kursiv), insofern ist das Fehlen vermutlich unkritisch — dennoch als offener Punkt zu dokumentieren, nicht stillschweigend zu übergehen | Zu entscheiden, ob bewusst nicht im Scope (Abnahmekriterium 8) |
| 4 | Umschalt+Tab (Ausrücken der Ebene, verwandte, aber **nicht** identische Funktion) | — | **Nicht vorhanden** (siehe Referenztabelle „Tastenkombination"; `sinkListItem` ungenutzt) | Kein Soll-Bestandteil **dieser** Anforderung — gehört zu `mehrstufige-liste`/`liste-einruecken-tab` (Backlog „fehlt"). Wird hier nur erwähnt, weil Nutzer:innen naheliegend erwarten könnten, Umschalt+Tab am obersten Level habe dieselbe Wirkung wie „Liste aufheben" — nach Code-Stand ist das **nicht** der Fall, da die Taste gar nicht gebunden ist |
| 5 | Kontextmenü (Rechtsklick) | — | Nicht vorhanden (kein eigener `contextmenu`-Handler, `WordEditor.tsx:109-113`) | Kein Soll-Bestandteil dieser Anforderung |
| 6 | Enter auf leerem Listenpunkt (verwandter, separater Mechanismus) | Editor, Keymap (`WordEditor.tsx:88`, `splitListItem`) | Vorhanden als Bibliotheksverhalten, siehe Referenztabelle | Kein Soll-Bestandteil **dieser** Anforderung (gehört zu Hauptspezifikation Abschnitt 5 bzw. `specs/nummerierte-liste-req.md` Abschnitt 2.3); wird in Grenzfall 4.7 nur zur Abgrenzung erwähnt |

---

## 3. Gewünschtes Verhalten im Detail

### 3.1 Cursor ohne Selektion in einem einstufigen Listenpunkt
- Cursor irgendwo im Text eines Listenpunkts (Aufzählung oder Nummerierung), keine
  Selektion nötig → Klick auf „Liste aufheben" → **genau dieser** Punkt wird zu einem
  normalen Absatz (`paragraph`); der Text (inkl. aller Zeichenformate, siehe 3.7) bleibt
  unverändert.
- Ist der aufgehobene Punkt der **einzige** Punkt der Liste, verschwindet der
  umschließende `bullet_list`/`ordered_list`-Knoten vollständig aus dem Dokumentmodell
  (kein leerer Hüllknoten bleibt zurück — laut Schema `list_item+` wäre ein leerer
  Listenknoten ohnehin strukturell ungültig, siehe Grenzfall 4.2).
- Ist der aufgehobene Punkt **nicht** der einzige, wird die Liste an dieser Stelle
  geteilt: vorangehende Punkte bleiben eine (erste) Liste, der aufgehobene Punkt wird ein
  normaler Absatz dazwischen, nachfolgende Punkte bilden eine (zweite, eigenständige)
  Liste desselben Typs (siehe 3.4 und Grenzfall 4.3 zur Nummerierung der zweiten
  Teilliste). Dieses Aufteilen ergibt sich aus `liftOutOfList`, das die umgebende Liste
  an den Rändern, an denen nicht das Listenende erreicht ist, mit `list.copy(Fragment.empty)`
  wieder schließt (`index.js:256`).

### 3.2 Selektion über mehrere Listenpunkte derselben, einstufigen Liste
- Eine Selektion, die zwei oder mehr Punkte derselben Liste ganz oder teilweise
  einschließt, wandelt **alle** davon betroffenen Punkte in normale Absätze um.
- Sind **alle** Punkte der Liste in der Selektion enthalten, verschwindet der Listenknoten
  vollständig (wie 3.1, Sonderfall „alle Punkte").

### 3.3 Selektion, die über den Rand der Liste hinausreicht
- Eine Selektion, die z. B. in einem Listenpunkt beginnt und in einem **nachfolgenden,
  normalen** Absatz außerhalb jeder Liste endet (oder umgekehrt), liefert bei
  `$from.blockRange($to, pred)` voraussichtlich **keinen** gültigen Bereich, da kein
  gemeinsamer Elternknoten die `pred`-Bedingung „erstes Kind ist `list_item`" erfüllt →
  der Command gibt `false` zurück und **nichts** passiert (auch der in der Liste liegende
  Teil bleibt unverändert). Das ist ein bewusst anderer Mechanismus als `setAlign`, das
  über `nodesBetween` (`commands.ts:17`) auch bei gemischten Bereichen jeden zutreffenden
  Block einzeln erfasst. **Zu verifizieren:** ob die Aktion in diesem Fall wirklich
  vollständig abbricht oder ob wider Erwarten der Listenanteil erfasst wird — mit echtem
  Playwright-Test nachstellen (Grenzfall 4.5, Testfall 6.5).
- Dasselbe gilt für „Alles auswählen" (Strg+A) in einem Dokument, das **sowohl** Listen
  als auch normale Absätze enthält (Grenzfall 4.6) — praxisrelevant, da Nutzer:innen
  intuitiv erwarten könnten, „Alles auswählen" + „Liste aufheben" entferne **alle** Listen
  auf einmal und lasse den Rest unangetastet.

### 3.4 Einen Punkt in der Mitte einer Liste aufheben
- Der markierte/Cursor-Punkt liegt weder am Anfang noch am Ende der Liste → Ergebnis ist
  eine Drei-Teilung: Teilliste (davor) → normaler Absatz (der aufgehobene Punkt) →
  Teilliste (danach), siehe 3.1.
- Bei einer **nummerierten** Liste: Die zweite Teilliste muss weiterhin als `ordered_list`
  (nicht `bullet_list`) erkennbar bleiben. Ihr `start`-Attribut wird beim Splitten laut
  Bibliothek über `list.copy(...)` (`index.js:256`) vom ursprünglichen Knoten übernommen —
  **beide** Teillisten tragen denselben `start`-Wert wie die ursprüngliche Liste (i. d. R.
  `start: 1`). Da die Editor-Anzeige über zwei getrennte native `<ol start=…>`-Elemente
  erfolgt (`schema.ts:134-136`), die der Browser unabhängig nummeriert, ist zu erwarten,
  dass die zweite Teilliste **wieder bei „1." beginnt**, statt die Zählung der ersten
  fortzusetzen — konkret zu bestätigen (Grenzfall 4.3).

### 3.5 Ganze Liste markieren und aufheben
- Wie 3.2, Sonderfall „alle Punkte erfasst": Der Listenknoten verschwindet komplett, alle
  vormaligen Punkte erscheinen als aufeinanderfolgende normale Absätze in ursprünglicher
  Reihenfolge.

### 3.6 Mehrstufige/verschachtelte Liste (über DOCX- **oder** ODT-Import erreichbar)
- Da im Editor selbst keine Verschachtelung **erzeugbar** ist (siehe Abgrenzung oben), ist
  dieser Fall nur relevant, wenn eine **importierte** Datei bereits eine echte
  verschachtelte Struktur enthält. Das ist entgegen dem Vorentwurf **bei beiden Formaten**
  möglich: ODT über verschachtelte `<text:list>` (`odt/reader.ts:286-299`), DOCX über eine
  flache `w:ilvl`-Folge, die `groupLists` (`docx/reader.ts:366-440`) wieder zu echter
  ProseMirror-Verschachtelung zusammensetzt. Geeignete Fixtures: `listLevel10.odt` (ODT,
  tief), `ComplexNumberedLists.docx` (DOCX, mehrstufig).
- Laut Bibliotheksmechanismus (siehe Referenztabelle) hebt „Liste aufheben" einen Punkt
  auf der **tiefsten** Ebene zunächst nur **eine Ebene** höher (bleibt Listenpunkt der
  äußeren Liste); ein **weiterer** Klick an gleicher Stelle ist nötig, um ihn schließlich
  zu einem normalen Absatz zu machen. **Offene Produktfrage, vor Abnahme zu entscheiden und
  zu dokumentieren:** Ist „ein Klick pro Ebene" das gewünschte Verhalten (Word-Konvention,
  siehe `specs/nummerierte-liste-req.md` Abschnitt 2.6), oder soll „Liste aufheben" einen
  Punkt in **einem** Schritt vollständig aus **allen** Ebenen herausheben? Die
  Backlog-Kurzbeschreibung lässt beide Lesarten zu.
- Unabhängig von der Antwort: Der Text darf in keinem Zwischenschritt verloren gehen, auch
  wenn mehrere Klicks nötig sind. Die Anzahl der bis zum vollständig normalen Absatz nötigen
  Klicks ist zu protokollieren (Grenzfall 4.4, Testfall 6.12).

### 3.7 Zusammenspiel mit Zeichenformatierung
- Fett/Kursiv/Unterstrichen/Durchgestrichen/Schriftfarbe/Hervorhebung innerhalb des
  Listenpunkt-Texts müssen nach dem Aufheben unverändert erhalten bleiben — nur die
  Listen-Hülle (Aufzählungszeichen/Nummer, Einzug) verschwindet; keine Zeichen-Marks
  werden entfernt oder verändert. (Die Marks sitzen an den Text-Knoten, die das Aufheben
  nicht anfasst.)

### 3.8 Zusammenspiel mit Ausrichtung
- Ein linksbündiger/zentrierter/rechtsbündiger/Blocksatz-Listenpunkt bleibt nach dem
  Aufheben mit **derselben** Ausrichtung erhalten (das `align`-Attribut sitzt am
  `paragraph`-Knoten selbst, `schema.ts:16-24`, nicht an `list_item`, und wird vom Aufheben
  nicht berührt) — cross-referenziert in `specs/ausrichtung-links-req.md` Grenzfall 4.7.

### 3.9 Zusammenspiel mit zusätzlichen Blöcken innerhalb eines Listenpunkts
- Da `list_item` laut Schema `block+` erlaubt (`schema.ts:147`), kann ein Punkt mehr als
  einen Block enthalten — z. B. eine verschachtelte Liste (siehe 3.6), ein Bild oder eine
  Tabelle; ein Punkt kann sogar **ohne** eigenen Absatz nur aus einer verschachtelten Liste
  oder einem blanken Bild bestehen (Schema-Kommentar `:139-145`). Solche Punkte entstehen
  typischerweise nur über Import, da der Editor selbst keinen Weg bietet, einen zweiten
  Block in einen bestehenden Punkt einzufügen.
- Wird ein solcher Punkt aufgehoben, müssen **alle** enthaltenen Blöcke (nicht nur der
  erste) als eigenständige, aufeinanderfolgende Blöcke außerhalb der Liste erhalten bleiben
  — mit echter Fixture zu prüfen (`imageWithinList.odt`).
- **Formatspezifischer Hinweis für die Rundreise:** Über ODT bleibt ein Bild in einem
  Listenpunkt strukturell im Punkt (echtes Nesting, `odt` Reader/Writer). Über DOCX
  hingegen erhält ein aus der Absatz-`<w:p>` extrahiertes Bild beim Reimport `numId:null`
  (`docx/reader.ts:476`) und unterbricht die Liste — hier ist „Bild bleibt als
  eigenständiger Block, Text bleibt erhalten" der Maßstab, nicht „Bild bleibt im
  Listenpunkt".

### 3.10 Undo/Redo
- Ein Klick auf „Liste aufheben" erzeugt genau einen Undo-Schritt, der die ursprüngliche
  Liste (inklusive exakter Verschachtelung/Reihenfolge/`start`-Wert) wiederherstellt; Redo
  stellt den aufgehobenen Zustand erneut her (Undo/Redo per `Mod-z`/`Mod-y`/`Mod-Shift-z`,
  `WordEditor.tsx:85-87`).

### 3.11 Fokus- und Selektionserhalt nach Klick
- `run()` (`Toolbar.tsx:28-31`) ruft nach jedem Toolbar-Befehl `view.focus()` auf — zu
  verifizieren, dass der Cursor nach dem Aufheben an einer nachvollziehbaren, sinnvollen
  Position im neu entstandenen Absatz steht (nicht unerwartet springt) und keine hängende
  Selektion zurückbleibt, die das bekannte Selection-Sync-Problem
  (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2; Fix `reconcileSelectionOnClick`,
  `WordEditor.tsx:43-50`/`130-147`) begünstigen könnte (Grenzfall 4.11).

### 3.12 Verhalten außerhalb jeder Liste (kein Ziel vorhanden)
- Klick auf „Liste aufheben", während der Cursor in einem normalen Absatz, einer
  Überschrift, einer Tabellenzelle ohne Liste oder ganz ohne Textinhalt steht →
  `liftFromList()` liefert `false` (keine gültige `blockRange`); `run()` prüft den
  Rückgabewert nicht (`Toolbar.tsx:28-31`) → sichtbar passiert **nichts**. Kein Absturz,
  keine Fehlermeldung, aber auch **keine positive Rückmeldung**. Konkretisierung der
  generellen Anforderung „kein stiller Fehlschlag" (`FEATURE-SPEC-DOCX-ODT.md`
  Abschnitt 20.4), siehe Grenzfall 4.1.

### 3.13 Danach erneut eine Liste erzeugen
- Nach dem Aufheben muss derselbe Absatz erneut per „• Liste"/„1. Liste" in eine (neue)
  Liste umwandelbar sein — kein Zustand aus der vorherigen Listenzugehörigkeit darf
  hängen bleiben (im Editor-Datenmodell existiert keine `numId`-Zuordnung; diese entsteht
  erst beim DOCX-Export, siehe Referenztabelle — dennoch zu prüfen).

---

## 4. Grenzfälle

1. **Klick außerhalb jeder Liste:** Siehe 3.12 — stiller No-Op ohne Rückmeldung. Zu
   entscheiden: Soll der Button in diesem Zustand deaktiviert/ausgegraut dargestellt werden
   (z. B. `disabled`/`aria-disabled`), damit gar nicht erst geklickt wird? Die dafür nötige
   Zustandsabfrage ist **bereits verfügbar**: `liftFromList()(view.state, null)` liefert
   `true` genau dann, wenn der Cursor in einer aufhebbaren Liste steht
   (`prosemirror-schema-list index.js:212-213`) — eine Umsetzung wäre also billig und ohne
   neuen Command möglich.
2. **Liste erstellen und sofort wieder aufheben, ohne Text einzugeben:** Kein verwaister
   leerer `bullet_list`/`ordered_list`-Knoten danach, kein Crash (Cross-Referenz
   `specs/nummerierte-liste-req.md` Grenzfall 3.1).
3. **Punkt in der Mitte einer nummerierten Liste aufheben (siehe 3.4):** Die zweite
   Teilliste beginnt nach Code-Stand voraussichtlich wieder bei „1." statt fortzusetzen —
   **mit echtem Test zu bestätigen**, da unmittelbar sichtbar und leicht als Fehler
   wahrnehmbar (Cross-Referenz `specs/nummerierte-liste-req.md` zum generell nicht
   ausgewerteten `start`-Attribut).
4. **Mehrstufige Liste aus Import, Punkt auf tiefster Ebene aufheben (siehe 3.6):** Ein
   Klick hebt voraussichtlich nur eine Ebene aus, nicht direkt zum normalen Absatz. Mit
   `listLevel10.odt` **und** `ComplexNumberedLists.docx` zu bestätigen (beide Formate, da
   Mehrstufigkeit jetzt in beiden entsteht); Ergebnis inklusive Anzahl nötiger Klicks bis
   zum vollständig normalen Absatz dokumentieren.
5. **Selektion reicht von einem Listenpunkt in einen nachfolgenden normalen Absatz hinein
   (siehe 3.3):** Zu verifizieren, ob die Aktion komplett wirkungslos bleibt
   (wahrscheinlichster Fall) oder ob zumindest der Listenanteil erfasst wird.
6. **„Alles auswählen" (Strg+A) in gemischtem Dokument, danach „Liste aufheben":** Analog
   zu 4.5, aber mit gesamter Dokumentselektion — zu verifizieren, ob dabei **gar keine**
   Liste aufgehoben wird, obwohl Nutzer:innen vermutlich das Entfernen aller enthaltenen
   Listen erwarten.
7. **Abgrenzung zu „Enter auf leerem Listenpunkt":** Das Beenden einer Liste per Enter auf
   einem leeren Punkt (`splitListItem`, `WordEditor.tsx:88`) ist ein anderer Mechanismus
   als der Button — zu verifizieren, dass beide Wege zu strukturell gleichwertigem Ergebnis
   führen (normaler Absatz, kein Rest der Listenformatierung) und im Test nicht verwechselt
   werden.
8. **Liste innerhalb einer Tabellenzelle aufheben:** Nur die Liste innerhalb der
   betroffenen Zelle wird verändert; der Rest der Tabelle (andere Zellen, Zellstruktur)
   bleibt unangetastet (Fixtures `listsInTable.odt`, `simple-table-with-lists.odt`).
9. **Zwei unmittelbar aufeinanderfolgende, aber separate Listen desselben Typs ohne
   trennenden Absatz** (z. B. durch Copy-Paste entstanden) → beim Aufheben eines Punkts am
   Übergang ist zu prüfen, dass nur die eine betroffene Liste verändert wird und nicht
   versehentlich beide als eine einzige behandelt werden.
10. **Bild/Tabelle/verschachtelte Liste als Zusatzblock in einem Punkt (siehe 3.9)**
    aufheben → alle Blöcke bleiben erhalten und werden zu eigenständigen Geschwister-Blöcken,
    keiner geht verloren (Fixture `imageWithinList.odt`; DOCX-Sonderfall siehe 3.9).
11. **Zusammenspiel mit dem bekannten Selection-Sync-Bug** (`FEATURE-SPEC-DOCX-ODT.md`
    Abschnitt 2): Alles auswählen → Liste erzeugen → per Klick neu positionieren → Enter →
    weitertippen, anschließend „Liste aufheben" als zusätzlicher Schritt — zu prüfen, ob
    derselbe Bug-Pfad auch mit „Liste aufheben" als auslösender/nachfolgender Aktion
    reproduzierbar ist (bisher nur mit „Fett" dokumentiert; Fix `reconcileSelectionOnClick`).
    **Verwandtes, aus den `Ausschneiden`-Commits übernommenes Timing-Risiko (separat vom
    Klick-Reconciliation-Bug):** Beim Aufbau einer Mehrpunkt-Selektion per Tastatur
    (Umschalt+Pfeil/Umschalt+Klick, Testfall 6.2) unmittelbar gefolgt vom „Liste
    aufheben"-Klick ist auf dem `Mobile`-Playwright-Projekt (Pixel-7-Touch-Emulation) dieselbe
    asynchrone-`selectionchange`-Race zu erwarten, die `cut.spec.ts`/
    `selection-regression.spec.ts` bereits mit einem kurzen `page.waitForTimeout(50)` vor der
    auslösenden Aktion beheben mussten (siehe Referenztabelle „Playwright-Projektmatrix").
    Tritt die Race beim E2E-Test dieser Anforderung auf, ist zunächst dasselbe
    `waitForTimeout`-Muster anzuwenden; erweist sie sich — wie beim `Ausschneiden`-Feature
    bei einer bestimmten Selektions-am-Dokumentende-Sequenz — als nicht behebbar und nur in
    CI reproduzierbar, ist ein ausführlich begründeter, projekt-spezifischer `test.skip`
    (Vorbild `cut.spec.ts:473-492/522-526`) das vorgesehene Vorgehen, **nicht** ein
    stillschweigendes Weglassen des Tests auf dem `Mobile`-Projekt.
12. **Sehr lange Liste (> 50 Punkte, z. B. aus `ComplexNumberedLists.docx`), einzelnen
    Punkt in der Mitte aufheben:** Kein spürbarer Performance-Einbruch, alle übrigen Punkte
    bleiben unverändert (Stichprobe Anfang/Mitte/Ende).
13. **Reale Fremddatei mit „kaputtem"/ungewöhnlichem Listen-Markup** (`brokenList.odt`,
    `ListOddity.odt`) importieren, einen Punkt aufheben → kein Absturz, definiertes
    Fallback-Verhalten statt stillem Datenverlust (Cross-Referenz Hauptspezifikation
    Abschnitt 18).
14. **DOCX-Reimport nach Aufheben:** Da beide Teillisten dieselbe globale `numId` verwenden
    (`styleDefs.ts:34-35`), aber `groupLists` bei jedem Absatz **ohne** `numPr` **alle**
    offenen Frames schließt (`reader.ts:410-414`), ist zu prüfen, dass ein per „Liste
    aufheben" entstandener normaler Absatz **zwischen** zwei Teillisten beim Export/Reimport
    zuverlässig als trennender Nicht-Listen-Absatz erkannt wird (Struktur Liste/Absatz/Liste
    bleibt erhalten, verschmilzt nicht). Dass die zweite Teilliste dabei ihre Nummerierung
    neu bei 1 beginnt (das `start`-Attribut wird vom DOCX-Writer nicht geschrieben), ist zu
    dokumentieren; wie Word selbst zwei durch einen Absatz getrennte Läufe derselben `numId`
    zählt (ggf. fortlaufend), ist separat zu vermerken.
15. **Barrierefreiheit:** Button ohne `aria-label` und ohne aktiven/inaktiven Zustand —
    Screenreader-Nutzer:innen erhalten keine Rückmeldung, ob der Cursor in einer Liste steht
    und ob der Klick etwas bewirkt hat. `aria-label` ist zu ergänzen; ein
    aktiver/deaktivierter Zustand ist wie in 4.1 umsetzbar.
16. **Cursor exakt an einer Absatzgrenze am Rand einer Liste** (z. B. ganz am Ende des
    letzten Listenpunkts, direkt vor einem nachfolgenden normalen Absatz) → zu
    dokumentieren, ob „Liste aufheben" in dieser Position überhaupt einen gültigen Bereich
    findet und, falls ja, welchen der angrenzenden Blöcke sie erfasst (analog
    `specs/ausrichtung-links-req.md` Grenzfall 4.5).
17. **Verschachtelte Unterliste eines anderen Typs als die Elternliste (nur DOCX-Rundreise):**
    Eine nummerierte Unterliste innerhalb einer Aufzählung (oder umgekehrt) verliert beim
    DOCX-Export ihre eigenständige Markerart, weil der verschachtelte Knoten nur `numId`+`level`
    des Elternknotens erbt (`writer.ts:134-135`) — sie käme als Bullet-Unterebene zurück.
    Zu prüfen ist ausschließlich, dass **der Text erhalten** bleibt; die vereinfachte
    Markerart der Unterebene ist als bekannte, dokumentierte Cross-Format-Einschränkung
    hinzunehmen (kein Textverlust ≠ formattreu).

---

## 5. Rundreise-Anforderung (verbindlich)

Für **jede** der folgenden Kombinationen gilt: Datei mit einer Liste hochladen (bzw. im
Editor erzeugen) → einen oder mehrere Punkte per „Liste aufheben" in normale Absätze
umwandeln → unverändert exportieren → Ergebnis erneut importieren → der umgewandelte Text
erscheint als normaler Absatz (nicht mehr als Listenpunkt) an exakt derselben Textstelle,
unveränderter Inhalt, keine sonstigen Nebenwirkungen auf den Rest des Dokuments.

### 5.0 Kontroll-/Basis-Rundreise **ohne** Aufheben-Aktion (Pflicht, Voraussetzung)
Bevor eine Aufheben-bezogene Rundreise als bestanden gelten darf, muss für **dieselbe**
Fixture die reine „Upload unverändert → Export → Re-Import"-Rundreise **ohne jede
Bearbeitung** nachweislich inhaltsstabil sein (exakt die Kern-Rundreise-Definition aus
`FEATURE-SPEC-DOCX-ODT.md` Zeile 13 „Datei A hochladen → unverändert exportieren → Ergebnis
entspricht inhaltlich A"). Zweck: eine Kontrolle, die Aufheben-Fehler von einem
**vorbestehenden** Rundreise-Defekt sauber trennt. Andernfalls ließe sich ein nach
Aufheben+Rundreise beobachteter Inhaltsverlust nicht der Aufheben-Aktion zuordnen.
1. **DOCX-Basis:** `ComplexNumberedLists.docx` (und je eine einfache Bullet-/Ordered-Fixture)
   importieren, **ohne** Bearbeitung als DOCX exportieren, reimportieren → Listenstruktur
   (Anzahl Punkte, Verschachtelungstiefe, Typ pro Liste) und **jeder** Textlauf identisch
   zum ersten Import (baut auf der bereits bestehenden `roundtrip-fidelity.spec.ts:95-136`
   auf, die `li`-/verschachtelte-`li ul`/`li ol`-Zählung prüft — hier zusätzlich Textgleichheit).
2. **ODT-Basis:** analog mit `bulletListTest.odt`, `listLevel10.odt` und `imageWithinList.odt`.
3. Erst wenn 5.0.1/5.0.2 grün sind, sind Abweichungen in 5.1–5.3 **eindeutig** der
   Aufheben-Aktion zuzuschreiben; ein Fehlschlag hier ist ein eigenständiger Import/Export-Bug
   und **blockiert** die Aufheben-Verifikation nicht inhaltlich, ist aber als separates
   Ticket zu erfassen (Cross-Referenz Hauptspezifikation Abschnitt 18/19).

### 5.1 DOCX
1. **Einstufige Liste, mittleren Punkt aufheben:** Bullet-Liste mit 3 Punkten im Editor
   anlegen, mittleren Punkt aufheben (→ Teilliste/Absatz/Teilliste, 3.4), als DOCX
   exportieren, reimportieren → Struktur exakt erhalten: erste Liste (1 Punkt), normaler
   Absatz, zweite Liste (1 Punkt). Reihenfolge `['bullet_list','paragraph','bullet_list']`
   analog zum bestehenden Reader-Test `roundtrip.test.ts:167-175`.
2. **Ganze Liste aufheben:** Alle Punkte einer 3-Punkte-Liste markieren, aufheben,
   DOCX-Export, Reimport → 3 aufeinanderfolgende normale Absätze, **kein** `<w:numPr>` mehr
   in `word/document.xml` für diese Absätze (unabhängig vom projekteigenen Reader zu prüfen,
   z. B. direktes XML-Parsen oder python-docx).
3. **Nummerierte Liste, mittleren Punkt aufheben:** Reimport bestätigt, dass beide
   Teillisten weiterhin als `ordered_list` (nicht `bullet_list`) erkannt werden;
   Nummerierungsverhalten der zweiten Teilliste gemäß Grenzfall 4.3/4.14 dokumentieren.
4. **Mehrstufige Liste (DOCX-Quelle), tiefsten Punkt aufheben:** `ComplexNumberedLists.docx`
   importieren, prüfen, dass echte ProseMirror-Verschachtelung entsteht (Reader
   rekonstruiert `w:ilvl`), tiefsten Punkt aufheben, exportieren, reimportieren → Text jedes
   Zwischenschritts vollständig erhalten; Anzahl Klicks bis zum normalen Absatz notieren.
5. **Punkt mit zusätzlichem Block:** Sofern über eine DOCX-Fremddatei mit Zusatzblock in
   einem Punkt erzeugbar — Zusatzblock bleibt nach Aufheben und Rundreise als eigenständiger
   Block erhalten (DOCX-Sonderfall zu Bildern siehe 3.9).
6. **Cross-Format:** ODT mit Liste importieren, einen Punkt aufheben, als DOCX exportieren →
   Textinhalt bleibt erhalten.
7. **Reale Fremddatei:** `ComplexNumberedLists.docx` importieren, mindestens einen Punkt
   aufheben, unverändert exportieren, reimportieren → Text jedes betroffenen und jedes
   unbeteiligten Punkts bleibt vollständig und zeichengetreu erhalten (zentraler Nachweis
   für „Text bleibt erhalten" an einer echten, nicht selbst konstruierten Datei).

### 5.2 ODT
1. **Einstufige Liste, mittleren Punkt aufheben:** Analog zu 5.1.1 — Reimport bestätigt
   Liste/Absatz/Liste, für die betroffenen Absätze kein `<text:list>`/`<text:list-item>`.
2. **Ganze Liste aufheben:** Analog zu 5.1.2.
3. **Verschachtelte Liste aus Import, inneren Punkt aufheben (siehe 3.6):** `listLevel10.odt`
   (oder eine flachere, z. B. 2-stufige Fixture für einen einfacheren Erst-Test) importieren,
   prüfen, ob echte ProseMirror-Verschachtelung entsteht, „Liste aufheben" auf einen tief
   verschachtelten Punkt anwenden, Ergebnis (Anzahl Klicks, Zwischenzustände) exportieren und
   reimportieren → Text bleibt in jedem Zwischenschritt vollständig erhalten, auch wenn die
   Tiefe sich nur schrittweise reduziert.
4. **Punkt in einer Tabellenzelle aufheben:** `listsInTable.odt` bzw.
   `simple-table-with-lists.odt` importieren, Listenpunkt in einer Zelle aufheben, Rundreise →
   Zellstruktur und übriger Zellinhalt bleiben unangetastet.
5. **Punkt mit Bild aufheben:** `imageWithinList.odt` importieren, betroffenen Punkt
   aufheben, Rundreise → Bild bleibt erhalten (über ODT im Punkt/als Geschwister, 3.9).
6. **Cross-Format:** DOCX mit Liste importieren, einen Punkt aufheben, als ODT exportieren →
   Textinhalt bleibt erhalten.
7. **Weitere reale Basis-Fixtures** (mindestens `bulletListTest.odt`, `bullet_list.odt`,
   `list.odt`, `liste2.odt`, `simpleList.odt`, `simple_bullet_list.odt`, `EasyList.odt`,
   `ListRoundtrip.odt`, `ContinueListTest.odt`, `preparedList.odt`) — jeweils importieren,
   mindestens einen Punkt aufheben, unverändert exportieren, reimportieren → Textinhalt jedes
   Punkts (aufgehoben wie unbeteiligt) identisch zum ersten Import.
8. **Bekanntermaßen abweichendes Markup:** `brokenList.odt`, `ListOddity.odt`,
   `ListStyleResolution.odt`, `listStyleId.odt` importieren, Aufheben-Aktion auf einen Punkt
   anwenden, sofern die Datei sinnvoll editierbar importiert → definiertes Verhalten statt
   Crash dokumentieren.

### 5.3 Doppelte Rundreise / Cross-Format hin und zurück
1. Liste im Editor anlegen, einen Punkt aufheben → Export als ODT → Reimport → Export zurück
   als DOCX → Struktur (Teillisten + dazwischenliegender Absatz) bleibt über beide
   Konvertierungen inhaltlich identisch.
2. Dieselbe Prüfung mit Startpunkt DOCX (DOCX → ODT → DOCX).
3. Reale Fremddatei mit **mehrstufiger** Liste (`ComplexNumberedLists.docx`) importieren,
   einen Punkt aufheben, zweimal das Format wechseln (DOCX → ODT → DOCX) → kein kumulativer
   **Text**verlust. Optische Nummerierungs-Feinheiten (Startwert, Fortsetzung) und die
   Markerart tiefer Ebenen dürfen sich dabei ändern (Cross-Format-Einschränkung nach 4.17) —
   das ist zu **dokumentieren**, nicht zu verschweigen.

---

## 6. Testfälle (Zusammenfassung, E2E über echte Browser-Bedienung — Pflicht)

Vorhandene Abdeckung betrifft ausschließlich das **Erzeugen/Verschachteln** von Listen
(`docx/__tests__/roundtrip.test.ts:141-201`, ODT-Äquivalent, E2E
`roundtrip-fidelity.spec.ts:95-136`). Für die **Aufheben-Aktion** (`liftFromList`/
`liftListItem`) existiert **kein** Test (Unit noch E2E) — alle folgenden Testfälle sind
vollständig neu zu schreiben.

1. Bullet-Liste mit 3 Punkten anlegen, Cursor (ohne Selektion) in mittleren Punkt, echter
   Playwright-Klick auf „Liste aufheben" → mittlerer Punkt ist sichtbar ein normaler Absatz
   (kein `<li>`/Aufzählungszeichen mehr im DOM), Text unverändert, Liste davor/danach bleibt
   bestehen (3.1/3.4).
2. Alle Punkte einer Liste markieren (Dreifachklick + Shift-Klick oder Strg+A innerhalb der
   Liste), „Liste aufheben" → Listenknoten verschwindet komplett aus dem DOM, alle Punkte
   sind normale Absätze (3.2/3.5).
3. Nummerierte Liste, mittleren Punkt aufheben → zweite Teilliste bleibt sichtbar nummeriert
   (`ordered_list`), tatsächlichen Startwert der zweiten Teilliste protokollieren und mit
   Grenzfall 4.3 abgleichen.
4. Klick auf „Liste aufheben" außerhalb jeder Liste (Cursor in normalem Absatz) → kein
   Fehler, keine Konsolen-Exception, sichtbar keine Änderung (Grenzfall 4.1). Zusätzlich per
   `liftFromList()(view.state, null)` bestätigen, dass die Verfügbarkeitsabfrage hier `false`
   liefert.
5. Selektion von einem Listenpunkt in einen nachfolgenden normalen Absatz, „Liste aufheben"
   → tatsächliches Verhalten protokollieren (Grenzfall 4.5).
6. Dokument mit gemischtem Inhalt (Liste + normale Absätze), Strg+A, „Liste aufheben" →
   tatsächliches Verhalten protokollieren (Grenzfall 4.6).
7. Liste in einer Tabellenzelle anlegen bzw. `listsInTable.odt` importieren, Punkt in der
   Zelle aufheben → nur diese Zelle betroffen, Rest der Tabelle unverändert (Grenzfall 4.8).
8. Undo direkt nach „Liste aufheben" → ursprüngliche Liste (inkl. Nummerierung/Verschachtelung)
   exakt wiederhergestellt; Redo stellt den aufgehobenen Zustand wieder her (3.10).
9. Nach dem Aufheben erneut „• Liste"/„1. Liste" auf denselben Absatz anwenden → neue Liste
   entsteht korrekt (3.13).
10. Vollständiger Rundreisetest je Format (5.1/5.2), ausgeführt über echten Datei-Upload
    (`filechooser`) und echten Download-Abfangmechanismus (`page.waitForEvent('download')`),
    nicht nur über intern aufgerufene Reader/Writer-Funktionen.
11. Import und Rundreise (mind. je ein Punkt aufheben) von `ComplexNumberedLists.docx`,
    `bulletListTest.odt`, `listLevel10.odt`, `imageWithinList.odt`, `listsInTable.odt`,
    `brokenList.odt`, `ListOddity.odt` wie in Abschnitt 5 beschrieben.
12. Mehrstufige Liste (aus `listLevel10.odt` **und** `ComplexNumberedLists.docx`), tiefsten
    Punkt wiederholt aufheben (jeden Klick einzeln protokollieren) → Anzahl der Klicks bis
    zum vollständig normalen Absatz dokumentieren, Text bleibt in jedem Zwischenschritt
    erhalten (Grenzfall 4.4).
13. Regressionstest analog `selection-regression.spec.ts`, aber mit „Liste aufheben" als
    zusätzlichem Schritt in der bekannten Bug-Sequenz (Grenzfall 4.11).
14. Cross-Format-Rundreise (5.3) einmal DOCX→ODT→DOCX, einmal ODT→DOCX→ODT.
15. Sichtprüfung/Screenshot-Vergleich: Aussehen eines aufgehobenen Absatzes im Editor (kein
    Aufzählungszeichen, kein Einzug) entspricht optisch dem Aussehen nach Re-Import derselben
    Datei.
16. Testfall 2 (alle Punkte einer Liste per Tastatur-Selektion markieren, „Liste aufheben")
    zusätzlich gezielt auf dem `Mobile`-Playwright-Projekt ausführen und auf die aus den
    `Ausschneiden`-Commits bekannte asynchrone-Selection-Sync-Race prüfen (Grenzfall 4.11);
    bei beobachteter Flakiness zunächst `page.waitForTimeout(50)` vor dem Klick ergänzen
    (Vorbild `cut.spec.ts:505-507`), bei nachweislich nicht behebbarer, nur in CI
    reproduzierbarer Restflakiness einen begründeten `test.skip` nach Vorbild
    `cut.spec.ts:473-492/522-526` setzen und dokumentieren statt den Test kommentarlos zu
    entfernen oder zu ignorieren.

---

## 7. Abgrenzung: Vorhandener Code vs. geforderter Nachweis

Der Backlog-Status „vorhanden" stützt sich ausschließlich darauf, dass der Toolbar-Button
existiert und einen Bibliotheksbefehl (`liftListItem`) aufruft (`commands.ts:62-64`,
`Toolbar.tsx:263-273`). Das beweist **nicht**, dass:
- der Button in einem echten Browser tatsächlich klickbar ist und sichtbar reagiert,
- die in Abschnitt 3/4 beschriebenen, aus dem Bibliothekscode abgeleiteten
  Verhaltensannahmen (Ein-Ebene-pro-Klick bei Verschachtelung, Verhalten bei über den
  Listenrand hinausreichender Selektion, Nummerierungsverhalten der Teillisten) tatsächlich
  so eintreten,
- Text, Zeichenformatierung, Ausrichtung und Zusatzblöcke (Bild/Tabelle/verschachtelte
  Liste) bei der Umwandlung vollständig erhalten bleiben — das zentrale Versprechen der
  Backlog-Beschreibung,
- die Rundreise (Export/Re-Import, Cross-Format) für **beide** Formate und für reale
  Fremddateien funktioniert — dafür existiert für die **Aufheben**-Aktion **kein** Test.

Vorhandene Listentests decken nur das Erzeugen/Verschachteln ab (siehe Abschnitt 6, Kopf).
Diese Punkte sind der eigentliche Kern der geforderten Verifikation und müssen durch neue
E2E-Tests sowie neue Rundreise-Tests mit echten Fixture-Dateien geschlossen werden, bevor
der Backlog-Status von „vorhanden" auf „verifiziert" geändert werden darf.

---

## 8. Abnahmekriterien (Definition of Done)

Der Status darf erst als „verifiziert" gelten, wenn **alle** folgenden Punkte erfüllt sind:

1. Alle Testfälle aus Abschnitt 6 sind als automatisierte Tests vorhanden und grün.
2. Die Kontroll-/Basis-Rundreise ohne Aufheben-Aktion (Abschnitt 5.0) ist für die dort
   genannten Fixtures grün — andernfalls ist ein separates Import/Export-Ticket erfasst und
   die betroffene Fixture aus der Aufheben-Rundreise-Wertung genommen (nicht stillschweigend
   als Aufheben-Fehler verbucht).
3. Mindestens die Rundreise-Testfälle 7 aus Abschnitt 5.1 sowie 3, 4, 7, 8 aus Abschnitt 5.2
   sind mit echten, nicht selbst konstruierten Fremddateien bestanden.
4. Das Verhalten bei Selektionen, die über den Listenrand hinausreichen (Grenzfälle 4.5/4.6),
   ist geprüft und dokumentiert (korrekt begrenzt vs. stiller Komplettausfall der Aktion);
   falls unerwünscht, ist ein Ticket dafür angelegt.
5. Das Verhalten bei mehrstufigen, aus **DOCX- oder ODT-Import** entstandenen Listen
   (Grenzfall 4.4) ist geprüft, die Ein-Klick-pro-Ebene-Frage aus 3.6 ist als
   Produktentscheid dokumentiert (bestätigt oder als zu ändern markiert).
6. Das Nummerierungsverhalten der zweiten Teilliste beim Aufheben eines mittleren Punkts
   einer nummerierten Liste (Grenzfälle 4.3/4.14) ist mit echtem Test bestätigt und
   dokumentiert.
7. Zusatzblöcke innerhalb eines Listenpunkts (Bild, Tabelle, verschachtelte Liste,
   Abschnitt 3.9) bleiben nachweislich bei Rundreise erhalten, mit mindestens einer echten
   Fixture-Datei (`imageWithinList.odt`) belegt; der DOCX-Bild-Sonderfall (3.9) ist geprüft.
8. Die Cross-Format-Einschränkung „Markerart tiefer Ebenen kann sich ändern, Text nicht"
   (Grenzfall 4.17) ist an einem Beispiel bestätigt und dokumentiert.
9. Der Regressionstest für den Selection-Sync-Bug mit „Liste aufheben" in der Sequenz
   (Grenzfall 4.11) ist dauerhaft Teil der Testsuite.
10. Das Fehlen von `aria-label`, aktivem Zustand und Tastenkombination (Abschnitt 2,
   Grenzfälle 4.1/4.15) ist bewusst als „nicht im Scope" bestätigt oder als nachzuliefernde
   Funktion in den Backlog aufgenommen — nicht unentschieden offen gelassen.
11. Kein während der Verifikation gefundener Fehler bleibt ohne Ticket/Vermerk zurück.
12. Die neu geschriebenen E2E-Tests laufen nachweislich auf allen drei regulären
    Playwright-Projekten (`Desktop Chrome`, `Mobile`, `Tablet`, siehe Referenztabelle
    „Playwright-Projektmatrix"); eine auf dem `Mobile`-Projekt beobachtete, dem
    `Ausschneiden`-Feature analoge Async-Selection-Sync-Flakiness ist entweder durch das
    etablierte `waitForTimeout`-Muster behoben oder — falls nachweislich nicht behebbar — durch
    einen ausführlich begründeten, projekt-spezifischen `test.skip` nach Vorbild
    `cut.spec.ts:473-492/522-526` dokumentiert, nicht stillschweigend übergangen
    (Grenzfall 4.11, Testfall 6.16).
