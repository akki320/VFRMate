# VFRMate

Offlinefähige Progressive Web App für den deutschen Flugdurchführungsplan
VFR — Planung am Schreibtisch, Nutzung im Cockpit. Kein Backend, keine
Anmeldung, keine Cloud: alle Daten bleiben lokal auf dem Gerät.

**Live:** https://akki320.github.io/VFRMate/ (Deployment über GitHub
Pages + Actions, siehe `.github/workflows/deploy-pages.yml`; muss einmalig
unter Settings → Pages → Source auf "GitHub Actions" gestellt werden,
danach deployt jeder Push nach `main` automatisch). Auf einem Tablet/Smartphone
öffnen und über den Browser "Zum Startbildschirm hinzufügen" installieren.

## Stack

- React + TypeScript + Vite
- Tailwind CSS v4 (`@tailwindcss/vite`)
- Zustand (State)
- IndexedDB via `idb` (Persistenz)
- `vite-plugin-pwa` (Service Worker, App-Shell-Precaching, Web-App-Manifest)
- Vitest (Unit-Tests der Domain-Schicht)

## Struktur

```
src/
  domain/   reine Berechnungslogik, framework-frei (keine React-Imports)
  store/    Zustand-Stores + IndexedDB-Persistenz (via idb)
  ui/       React-Komponenten/Screens
```

Die Domain-Schicht (`src/domain/`) ist bewusst von React entkoppelt und
vollständig unit-getestet:

- `types.ts` — Domänenmodell (Aircraft, Flight, Leg, FuelPlan,
  MassBalance, RunwayCalc, Frequencies, WeatherInfo, ...). Zeiten werden
  ausschließlich als UTC-Minuten seit Mitternacht gespeichert, nie als
  `Date`.
- `navigation.ts` — Winddreieck (WCA/GS), Kurskette (TC→TH→MH→MC),
  Zeiten-/ETO-Kette, Re-Estimate nach ATO. TH (True Heading) ist nur eine
  interne Zwischengröße zur Ableitung von MH — auf dem Papierformular gibt
  es dafür keine eigene Spalte ("rwK" steht dort für TC selbst).
- `greatCircle.ts` — Großkreisrechnung (Haversine + Anfangspeilung) für
  TC/Distanz aus Koordinaten. Seit Phase 19 an die UI angebunden (siehe
  `store/gpxImport.ts`).
- `fuel.ts` / `massBalance.ts` / `runway.ts` — Kraftstoffbedarf, Masse &
  Schwerpunkt (Point-in-Polygon gegen das CG-Envelope), Start-/
  Landestrecke. Die Berechnungslogik bleibt vollständig erhalten und
  getestet, ist aber aktuell nicht an die UI angebunden (siehe
  "Vereinfachung" unten) — für eine spätere Wiederverwendung.
- `rounding.ts` / `format.ts` — einheitliche Rundungs- und
  Zeitformatierungskonventionen (Kurse: ganze Grad, Zeiten: ganze Minuten,
  Distanzen: eine Nachkommastelle, Massen: ganze Kilogramm; Anzeige immer
  `HH:MM`).

### Store & Persistenz (`src/store/`)

- `db.ts` — dünner IndexedDB-Wrapper (via `idb`) mit zwei Object Stores
  (`aircraft`, `flights`). Keine Berechnungslogik, nur CRUD.
- `aircraftStore.ts` — Zustand-Store für Flugzeugmuster (anlegen,
  bearbeiten, duplizieren, löschen). Bleibt im Code für eine spätere
  Wiederverwendung, ist aber aktuell nicht an die UI angebunden — der
  Flugkopf trägt LFZ-Muster/-Kennzeichen stattdessen als Freitext direkt
  am Flug (`Flight.aircraftType`/`aircraftRegistration`).
- `flightStore.ts` — Zustand-Store für die Flugliste + den aktuell
  geöffneten Flug. Jede Mutation (Leg ändern, ATO erfassen, ...) läuft über
  `patchCurrentFlight` und schreibt **sofort** nach IndexedDB — kein
  Debounce, kein separater Speichern-Schritt, damit ein Absturz oder
  Reload im Flug keine ATOs verliert.
- Getestet mit `fake-indexeddb` unter Vitest (Node-Umgebung), inklusive
  Crash-/Reload-Sicherheit von ATO-Einträgen.

### Die Flugansicht (`src/ui/flight/`)

Nur noch eine einzige Ansicht für einen geöffneten Flug — Planung und
Flugdurchführung sind nicht mehr getrennt. Sie bildet das Papierformular
("Flugdurchführungsplan VFR") direkt als editierbare Tabelle ab: eine
Kopfzeile mit den Flugstammdaten, darunter eine Zeile pro Kontrollpunkt.

- `FlightHeader.tsx` — Bezeichnung, Datum, Flugplätze, LFZ-Muster/-Kennz.
  (Freitext), Übergangshöhe/-level, ETD/ATD/SS sowie die berechneten
  ETA/ATA — genau die Felder aus dem Kopf des Papierformulars.
- `columns.ts` — die Tabellenspalten, 1:1 aus dem Papierformular
  übernommen (Sicherh.-Höhe, geplante Flughöhe, TAS, Wind, TC (rwK), WCA,
  VAR (MW), MH (mwSK), MC (mwK), Entfernung Abschnitt/Gesamt/Rest, GS
  (VG), Zeit Abschnitt/Gesamt/Rest, ETO, Bemerkungen). Kontrollpunkt und
  ATO sind immer sichtbar, alle anderen Spalten lassen sich über
  `ColumnVisibilityMenu.tsx`/`useColumnVisibility.ts` **beliebig
  ein-/ausblenden** — eine reine Anzeigepräferenz je Gerät, in
  `localStorage` gespeichert.
- `LegTable.tsx`/`LegTableRow.tsx` — jede Zelle direkt editierbar
  (Eingabefelder für Rohwerte, reiner Text für berechnete Werte), Legs
  anlegen/löschen/umsortieren (Auf-/Ab-Buttons). Die aktive Zeile
  (nächster anzufliegender Kontrollpunkt) ist hervorgehoben und bleibt
  beim Scrollen zusammen mit der Kopfzeile oben fixiert.
- `AtoCell.tsx` — ein Tap auf "Überflug" trägt die aktuelle UTC-Zeit als
  ATO ein und schaltet zur nächsten Zeile weiter; die ETOs aller
  folgenden Legs werden dabei automatisch neu geschätzt (Delta farbig
  neben der ETO). Ein bereits erfasstes ATO lässt sich per Long-Press
  manuell korrigieren.
- `RemainingHud.tsx` — Restzeit, Restdistanz und die laufende UTC-Uhr,
  fest am unteren Bildschirmrand.
- Warnhinweis (rot, nur als Signal), wenn die geschätzte Ankunft nach
  Sonnenuntergang liegt.
- Der Pflichthinweis ("Hilfsmittel für die Planung, ersetzt keine
  amtlichen Unterlagen") steht als Fußzeile am Ende der Ansicht.

Gestaltung: Nachtmodus (dunkel) ist Standard, ein Tagmodus mit sehr hohem
Kontrast lässt sich umschalten (`ui/theme/`). Alle Zahlenwerte stehen in
einer tabellarischen Monospace-Schrift. Der Überflug-Button hat mindestens
56 px Touchziel; Kopfzeilen-Formularfelder sind bewusst klein, weil sie
nur am Boden gebraucht werden.

**Vereinfachung (nach Nutzer-Feedback):** Kraftstoff, Masse & Schwerpunkt,
Start-/Landestrecke, Frequenzen/Wetter, AIP-Notizen und die
Flugzeugmuster-Verwaltung wurden aus der UI entfernt — der ursprüngliche
mehrseitige Aufbau (getrennte Planungs-/Flugdurchführungs-Bildschirme,
Accordion-Formulare, Muster-CRUD) war zu komplex für den eigentlichen
Zweck: eine Tabelle wie auf Papier, mit Spaltenauswahl. Die
Berechnungslogik dafür bleibt vollständig im Code (`domain/fuel.ts`,
`massBalance.ts`, `runway.ts`, `greatCircle.ts`, `store/aircraftStore.ts`)
für eine spätere Wiederverwendung.

### Export/Import und Druckansicht

- `store/exportImport.ts` — reine Serialisierung/Validierung (kein DOM):
  `serializeAircraft`/`serializeFlight` bauen ein JSON mit
  `{kind, version, data}`; `parseAircraftImport`/`parseFlightImport`
  akzeptieren sowohl dieses Format als auch ein "nacktes" Objekt, prüfen
  die Pflichtfelder und werfen `ImportValidationError` mit einer
  verständlichen Fehlerliste, sonst. Die `id` wird beim Import immer
  verworfen und neu vergeben — ein Import überschreibt nie ein
  bestehendes Muster/Flug.
- `ui/lib/fileIO.ts` — DOM-Gegenstück: Datei herunterladen
  (`downloadJsonFile`) bzw. eine ausgewählte Datei einlesen
  (`readFileAsText`). "Exportieren" (Flugansicht) / "Flug importieren"
  (Flugliste).
- `store/gpxImport.ts` — Import einer fremden GPX-Routendatei (z. B. aus
  SkyDemon exportiert) als neuer Flug. Liest `<rte>`/`<trk>`/`<wpt>` per
  `DOMParser`, der erste Punkt wird Startflugplatz, jeder weitere ein Leg
  mit TC/Distanz aus `greatCircle.ts` abgeleitet. "Route importieren
  (GPX, z. B. SkyDemon)" (Flugliste), nutzt denselben `ImportButton` wie
  der JSON-Import (jetzt mit konfigurierbarem `accept`).
- `ui/print/PrintView.tsx` — eine eigenständige, immer im Hintergrund
  gerenderte A4-Seite (`.print-only`/`.no-print` in `index.css`), die nur
  bei `window.print()` sichtbar wird. Bewusst in festen
  Schwarz-auf-Weiß-Farben statt der Theme-Variablen, damit der Ausdruck
  unabhängig vom Nacht-/Tagmodus lesbar bleibt. Zeigt immer **alle**
  Spalten (unabhängig von der Bildschirm-Spaltenauswahl), immer als
  volle "HH:MM" (siehe unten zur Minutenkurzschreibweise auf dem
  Bildschirm), plus den Pflichthinweis in der Fußzeile.

### Weitere Bedienelemente (nach Nutzer-Feedback)

- **Flug löschen** — in der Flugliste (`NoFlightScreen`) pro Zeile, und im
  Kopf der Flugansicht für den aktuell geöffneten Flug.
- **Flug zurücksetzen** — löscht alle ATOs und die ATD, ohne die Planung
  anzurühren (`flightStore.resetProgress`); die ETOs fallen dadurch auf
  ihre ursprünglich geplanten Werte zurück. Deaktiviert, solange noch kein
  Fortschritt existiert.
- **ETO/ATO nur als Minute** (`domain/format.ts::formatMinutesOnly`) — auf
  dem Bildschirm wird nur die Minute innerhalb der Stunde gezeigt (z.B.
  "21" für 08:21, die übliche Kurzschreibweise, wenn die Stunde aus dem
  Zusammenhang klar ist); die volle Zeit steht als Tooltip (`title`)
  daneben. Die Long-Press-Korrektur eines ATO akzeptiert dieselbe
  Kurzschreibweise: `parseMinutesOrTime` löst eine eingegebene Minute
  gegen die geplante ETO (bzw. das bisherige ATO) als Anker zur nächst-
  passenden vollen Stunde auf — inklusive Stundenüberlauf (z.B. Anker
  08:55 + Eingabe "03" → 09:03). Eine volle "HH:MM"-Eingabe funktioniert
  weiterhin.
- **ETO und ATO stehen immer nebeneinander** — "eto" ist bewusst der
  letzte Eintrag in `columns.ts`, ATO ist als angeheftete Spalte direkt
  danach gerendert; nichts kann sich dazwischenschieben.
- **Gesamtstrecke statt "Entf. Gesamt"-Spalte** — die laufende
  Streckensumme ist keine Tabellenspalte mehr (auf jeder Zeile wiederholt
  kaum zu gebrauchen), sondern ein einzelner Summenwert oberhalb der
  Tabelle.

**PWA-Offlinefähigkeit verifiziert:** Mit Playwright (`context.setOffline(true)`,
also vollständig gekapptes Netzwerk) neu geladen, lädt die App
ausschließlich aus dem Service-Worker-Cache und ein kompletter
Anlegen-Flow (Muster + Flug + Legs über IndexedDB) läuft ohne jeden
Netzzugriff durch.

## Entwicklung

```bash
npm install
npm run dev       # Dev-Server
npm run build     # Produktionsbuild inkl. Service Worker
npm run lint      # oxlint
npx vitest run    # Unit-Tests
```

## Status

- **Phase 1 (abgeschlossen):** Projektgerüst (Vite/React/TS/Tailwind/PWA)
  und vollständige Domain-Schicht mit Tests.
- **Phase 2 (abgeschlossen):** Zustand-Stores + IndexedDB-Persistenz
  (Aircraft- und Flight-CRUD, sofortiges Autosave, Re-Estimate-taugliches
  Leg-Override-Modell mit globalen Flugstandardwerten).
- **Phase 3 (abgeschlossen):** Bildschirm 1 (Flugdurchführung) inklusive
  ATO-Erfassung, Re-Estimate-Anzeige, Warnhinweisen, Nacht-/Tagmodus und
  den Accordion-Formularabschnitten.
- **Phase 4 (abgeschlossen):** Bildschirm 2 (Planung) mit Leg-Verwaltung
  (anlegen/umbenennen/umsortieren/löschen, Großkreisrechnung aus
  Koordinaten), globalen Standardwerten mit Override-Kennzeichnung pro
  Leg, und vollständiger Flugzeugmuster-Verwaltung.
- **Phase 5 (abgeschlossen):** PWA-Verifikation (per Playwright mit
  vollständig gekapptem Netzwerk bestätigt: App lädt aus dem
  Service-Worker-Cache und IndexedDB-Schreibzugriffe funktionieren ohne
  jede Verbindung), Export/Import einzelner Flüge und Flugzeugmuster als
  JSON-Datei, Druckansicht als eigenständige A4-Seite im
  Papierformular-Layout.
- **Phase 6 (abgeschlossen):** Vereinfachung nach Nutzer-Feedback — der
  mehrseitige Aufbau (Planung/Flugdurchführung getrennt, Accordions,
  Muster-Verwaltung) wich einer einzigen, dem offiziellen
  LBA-Papierformular nachgebauten Tabelle mit frei ein-/ausblendbaren
  Spalten. ATO-Tap → automatische ETO-Neuschätzung blieb erhalten.
- **Phase 7 (abgeschlossen):** Flug löschen (Liste + Kopfzeile), Flug
  zurücksetzen (ATOs/ATD löschen, Planung bleibt), "Entf. Gesamt" als
  Summenwert oberhalb statt als Spalte, ETO/ATO immer nebeneinander,
  ETO/ATO nur als Minute mit Anker-basierter Stundenauflösung bei der
  Long-Press-Korrektur.
- **Phase 8 (abgeschlossen):** Weitere Vereinfachung — "Zeit Gesamt" zog
  ebenfalls als Summenwert über die Tabelle ("Gesamtstrecke (P14)" /
  "Gesamtzeit (P18)", nach den Feldnummern des Papierformulars benannt).
  WCA, MH, GS, Zeit Abschnitt und Entf. Rest sind jetzt reine
  Piloteneingaben statt automatisch berechneter Winddreieck-Werte;
  automatisch bleiben nur MC (aus TC/MW), Gesamtstrecke, Gesamtzeit und
  Zeit Rest (in Std:Min) — in der Kopfzeile markiert mit "⚙". ETO/ATO
  sind jetzt reine seit ATD (bzw. ETD) verstrichene Minutenwerte ganz
  ohne UTC-Abgleich; die alte Stundenauflösungs-Logik aus Phase 7 entfiel
  komplett, da sie für Uhrzeiten gedacht war und für reine
  Minutendifferenzen nicht mehr gebraucht wird.
- **Phase 9 (abgeschlossen):** Eingabe-Feinschliff und Kopfzeile weiter
  gestrafft — "Überg.FL" und "TL" sind aus der Kopfzeile entfernt.
  Alle Zahlenfelder der Tabelle (TAS, Wind, TC, WCA, VAR, MH,
  Entfernungen, GS, Zeit Abschnitt) sind jetzt `type="text"` mit
  `inputMode="decimal"` statt `type="number"`, mit eigener
  Entwurfsverwaltung während der Eingabe: akzeptiert Vorzeichen (VAR
  z. B. "-3") und Dezimalkomma (Entfernungen z. B. "1,6"). Dabei einen
  echten Bug gefunden und behoben — bei Feldern mit globalem
  Rückfallwert (TAS, Wind, VAR) sprang das Feld beim Leeren sofort auf
  den globalen Standardwert zurück, noch bevor die neue Zahl fertig
  getippt war (z. B. ließ sich TAS so nie unter den globalen Standard
  von 100 kt eingeben); der neue Entwurfstext committet erst bei
  vollständiger Zahl oder beim Verlassen des Felds.
- **Phase 10 (abgeschlossen):** Zwei weitere Spalten automatisiert. Entf.
  Rest = Gesamtstrecke (P14) − Entf. Abschnitt-Summe bis einschließlich
  diesem Leg, analog zu Zeit Rest. WCA wird wieder automatisch aus TC,
  TAS und Wind ermittelt (Winddreieck, siehe navigation.ts::windTriangle)
  statt vom Piloten eingetragen — MH und GS bleiben bewusst manuelle
  Felder. Beide neuen Spalten in domain/flightPlan.ts::LegDerived, in der
  Kopfzeile mit "⚙" markiert; `Leg.wca`/`Leg.distanceRemainNm` als
  Piloten-Eingabefelder entfernt, da nun immer abgeleitet.
- **Phase 11 (abgeschlossen):** Auch GS jetzt automatisch berechnet:
  GS = TAS·cos(WCA) − Windgeschwindigkeit·cos(Windwinkel), aus derselben
  Winddreieck-Funktion wie WCA (navigation.ts::windTriangle liefert
  beide zusammen). MH und Zeit Abschnitt bleiben die einzigen noch
  manuellen Navigations-/Zeitfelder. `Leg.gs` als Piloten-Eingabefeld
  entfernt, da nun immer abgeleitet; neues `LegDerived.gs`, in der
  Kopfzeile mit "⚙" markiert.
- **Phase 12 (abgeschlossen):** ETO-Bugfix und finale Aufteilung
  automatisch/manuell. ETO zeigte bisher die rohe seit ATD/ETD
  verstrichene Minutenzahl an statt der daraus resultierenden Uhrzeit —
  bei ATD 15:15 und einem 1-minütigen Leg stand dort "1" statt der
  erwarteten Minute "16" (von 15:16). Intern rechnet ETO/ATO weiterhin in
  verstrichenen Minuten seit ATD/ETD (kein UTC-Abgleich nötig), aber die
  Anzeige zeigt jetzt nur noch die Minute der daraus resultierenden
  Uhrzeit (neues format.ts::clockMinuteOnly), mit der vollen Uhrzeit als
  Tooltip — für ATO ebenso, damit ETO/ATO nebeneinander vergleichbar
  bleiben. GS ist wieder eine reine Piloteneingabe (Rückbau von Phase
  11), MH dagegen jetzt automatisch berechnet (MH = TC + WCA − VAR,
  neues `computeMh`). Automatisch berechnet sind damit genau: WCA, MC,
  MH, Entf. Rest, Zeit Rest, ETO — alle anderen Spalten sind
  Piloteneingabe.
- **Phase 13 (abgeschlossen):** Bemerkungen ist keine Spalte aus der
  allgemeinen Spaltenauswahl mehr, sondern eine eigene, immer sichtbare
  Spalte ganz rechts — noch hinter ATO — mit einem eigenen
  Schnell-Ein-/Ausklapp-Pfeil in der Kopfzeile statt der allgemeinen
  Sichtbarkeitswahl (neues useRemarksCollapsed.ts, Präferenz in
  localStorage, standardmäßig eingeklappt/schmal). Dabei eine echte,
  vorbestehende Race-Condition gefunden und behoben: alle reinen
  Textfelder (Kontrollpunkt, Geplante Flughöhe, Bemerkungen) committeten
  bei jedem Tastendruck einzeln async in IndexedDB
  (patchCurrentFlight); lösten mehrere solcher Aufrufe beim schnellen
  Tippen in anderer Reihenfolge auf, als sie gestartet wurden, gingen
  Buchstaben verloren oder wurden vertauscht (reproduziert u. a. an
  "Kirchturm Musterdorf" → "Kirchturm Musterdorfe3"). Neue
  TextCell-Komponente (analog zu NumberCell aus Phase 9) committet
  jetzt nur noch einmal beim Verlassen des Felds statt bei jedem
  Zeichen — schnelles Tippen verifiziert fehlerfrei.
- **Phase 14 (abgeschlossen):** Spaltenbreiten reagieren jetzt responsiv
  statt fest. Praktisch jede Spaltenbreite in der Tabelle ist als
  `ch`-Wert gesetzt, und `ch` bemisst sich am Font-Size des jeweiligen
  Elements — Schrift und Innenabstand von Kopf- und Datenzellen sind
  deshalb unterhalb des "sm"-Breakpoints (640px) kleiner als darüber,
  wodurch alle Spalten auf schmalen Bildschirmen automatisch gemeinsam
  mitschrumpfen, ohne jede Breite einzeln für jede Bildschirmgröße zu
  pflegen. Verifiziert per Playwright bei 375px Viewport-Breite: die
  gesamte Scrollbreite der Tabelle sank dadurch von 1518px auf 1290px
  (≈15 %), auf breiten Bildschirmen bleibt die Darstellung unverändert
  (`sm:`-Klassen stellen dort die volle Größe wieder her). Reine
  Touch-Zielgrößen (Überflug-Taster, ATO-Korrektur) blieben unverändert
  auf ihrer Mindesthöhe/-breite, da das eine Bedienbarkeits- keine
  Platzfrage ist.
- **Phase 15 (abgeschlossen):** Bugfix Flug-Import. Ein vom Nutzer
  exportierter, ganz normal in der App angelegter Flug ließ sich nicht
  wieder importieren ("transitionLevel fehlt oder ist kein Text;
  aircraftId fehlt oder ist kein Text") — zwei Fehler in
  exportImport.ts::requireString/parseFlightImport:
  1. `requireString` verbot fälschlich Leerstrings, obwohl ein leerer
     String den TypeScript-Typ `string` genauso erfüllt wie jeder
     andere. `transitionLevel` ist seit Phase 9 in der UI gar nicht
     mehr editierbar, also bei jedem neu angelegten Flug `""` statt
     eines echten Werts — betraf damit praktisch jeden Export.
  2. `aircraftId` wurde als Pflichtfeld verlangt, obwohl es im
     Domain-Typ optional ist (`aircraftId?: string`) und die aktuelle
     UI seit Phase 6 stattdessen aircraftType/aircraftRegistration als
     Freitext schreibt, aircraftId also nie gesetzt.
  `requireString` prüft jetzt nur noch, ob das Feld ein String ist
  (kein Leerstring-Verbot mehr), `aircraftId` ist keine Pflichtangabe
  mehr. 3 neue Regressionstests, einer davon mit der exakten vom
  Nutzer gemeldeten Datei; alle 105 Tests grün. Der Import wurde
  zusätzlich end-to-end mit der Originaldatei des Nutzers per
  Playwright verifiziert — Flug mit 14 Legs, LFZ-Muster/-Kennzeichen
  und den beiden erfassten ATOs öffnet und rechnet jetzt korrekt.
- **Phase 16 (abgeschlossen):** Spaltenbreite weiter verkleinert — der
  eigentliche Engpass war nicht (mehr) die Schriftgröße (Phase 14),
  sondern `whitespace-nowrap` auf den Spaltenüberschriften: eine lange
  Überschrift wie "GEPLANTE FLUGHÖHE" erzwang eine Mindestbreite weit
  über das, was der Zellinhalt selbst braucht. Die Überschriften dürfen
  jetzt umbrechen — die automatische Tabellenspaltenberechnung des
  Browsers bevorzugt Umbruch gegenüber Überlaufen, solange die Tabelle
  eine feste Breite hat (`w-full`), und schrumpft die Spalte dadurch auf
  die Breite des tatsächlichen Zellinhalts. Per Playwright bei 375px
  verifiziert: Scrollbreite sank weiter von 1290px (Phase 14) auf
  1033px (zusammen ≈32 % unter dem Ursprungswert vor Phase 14); auf
  1900px passt die Tabelle jetzt sogar ganz ohne horizontales Scrollen.
  Weil die Kopfzeile dadurch zwei- statt einzeilig werden kann, hat sie
  keine feste Höhe mehr — die tatsächliche Höhe wird per ResizeObserver
  gemessen und als Sticky-Offset an die aktive Zeile weitergereicht
  (ein hartkodierter Wert hätte sonst bei umgebrochener Kopfzeile zu
  klein sein und die aktive Zeile teilweise darunter verschwinden
  lassen); per Playwright exakt 0px Abstand zwischen Kopfzeile und
  aktiver Zeile nach dem Umbruch bestätigt.
- **Phase 17 (abgeschlossen):** Streckendaten liegen jetzt optisch
  zwischen den beiden Kontrollpunkten, auf die sie sich beziehen — wie
  im Papierformular, wo die Kontrollpunktnamen an den Zeilengrenzen
  stehen und die Streckendaten (Sicherh.-Höhe bis ATO) dazwischen
  gestaffelt sind, statt in derselben Zeile wie einer der beiden Punkte.
  Umgesetzt durch zwei abwechselnde Zeilentypen: eine schmale
  Kontrollpunkt-Zeile (nur Name, plus bei einem echten Leg die
  Verschieben-/Löschen-Knöpfe, jetzt in einer eigenen CheckpointRow.tsx)
  und die bisherige Streckendaten-Zeile (jetzt ohne Kontrollpunktname
  und ohne diese Knöpfe). Reihenfolge: Startflugplatz,
  Streckendaten Leg 1, Kontrollpunkt Leg 1, Streckendaten Leg 2,
  Kontrollpunkt Leg 2, … — der Kontrollpunkt vor einer Streckendaten-
  Zeile ist der Startflugplatz bzw. das vorige Legs Kontrollpunkt, der
  danach ist dieses Legs eigener, exakt wie im Formular. Der
  Startflugplatz bekommt dafür eine eigene, nicht editierbare
  Kontrollpunkt-Zeile vor dem ersten Leg (Name kommt aus dem Flugkopf,
  dort weiterhin editierbar). Der "Überflug"-Taster (ATO-Erfassung)
  bleibt auf ausdrücklichen Wunsch des Nutzers bei der Streckendaten-
  Zeile statt bei der Kontrollpunkt-Zeile — er gehört fachlich zur
  Zeile, die ohnehin die restliche Streckenrechnung dieses Legs zeigt.
  Kopfzeile und die aktive Streckendaten-Zeile bleiben wie zuvor beim
  Scrollen oben fixiert; die beiden angrenzenden Kontrollpunkt-Zeilen
  werden zusätzlich leicht hervorgehoben (ohne selbst zu fixieren), um
  das "von … nach …" optisch zu unterstreichen. NumberCell/TextCell in
  ein gemeinsames Modul (cells.tsx) ausgelagert, da jetzt sowohl die
  Streckendaten- als auch die Kontrollpunkt-Zeile sie brauchen. Per
  Playwright verifiziert: korrekte Zeilenfolge und Spaltenspannen (die
  Kontrollpunkt-Zeile überspannt Kontrollpunkt- bis ATO-Spalte als ein
  Banner), Kontrollpunkt-Bearbeitung, Verschieben-/Löschen-Knöpfe,
  Überflug-Tap (nächstes Leg wird danach korrekt aktiv/hervorgehoben),
  Bemerkungen-Ein-/Ausklappen und Spaltenauswahl weiterhin fehlerfrei;
  alle 105 Tests grün.
- **Phase 18 (abgeschlossen):** ETO und ATO (samt "Überflug"-Taster)
  ziehen von der Streckendaten-Zeile auf die Kontrollpunkt-Zeile um —
  fachlich korrekter, da beide die Überflugzeit *dieses* Punktes
  beschreiben, nicht die Strecke davor, und näher am Papierformular, wo
  Überflugzeit/ATO ebenfalls neben dem Kontrollpunkt-Feld stehen (Rückbau
  der expliziten Phase-17-Entscheidung, auf erneuten Nutzerwunsch). Damit
  weiterhin eindeutig bleibt, zu welchem Kontrollpunkt ETO/ATO gehören —
  gerade wenn der Name links beim horizontalen Scrollen schon aus dem
  Sichtbereich gelaufen ist — wird der Kontrollpunktname zwischen ATO und
  Bemerkungen noch einmal schreibgeschützt gespiegelt: eine neue, immer
  sichtbare Spalte ("⧉"-Symbol in der Kopfzeile).
  - Der Namens-Banner der Kontrollpunkt-Zeile überspannt jetzt nur noch
    Kontrollpunkt plus die restlichen (ETO ausgenommen) sichtbaren
    Spalten — ETO und ATO sind eigene, echte Zellen dahinter.
  - Sticky/Hervorhebung wandert mit: die Kontrollpunkt-Zeile, die gerade
    ETO/ATO/"Überflug" des aktiven Legs trägt, bleibt jetzt beim Scrollen
    oben fixiert (vorher die Streckendaten-Zeile); die Streckendaten-
    Zeile davor und der Startpunkt dieses Legs bekommen die leichte
    Randmarkierung für den "von … nach …"-Kontext, ohne selbst zu
    fixieren (ACTIVE_LIGHT_STYLE/activeStrongStyle, neu in cells.tsx,
    von beiden Zeilentypen genutzt).
  - ETO bleibt über die Spaltenauswahl ein-/ausblendbar (Kontrollpunkt-
    Zeile lässt die Zelle dann einfach weg); ATO und die gespiegelte
    Kontrollpunkt-Spalte sind wie Kontrollpunkt selbst immer sichtbar.
  - Per Playwright verifiziert: ETO/ATO/"Überflug" erscheinen korrekt auf
    der jeweiligen Kontrollpunkt-Zeile, die gespiegelte Spalte zeigt für
    jede Kontrollpunkt-Zeile exakt denselben Namen wie die Kontrollpunkt-
    Spalte (und bleibt auf Streckendaten-Zeilen leer), Überflug-Tap
    schaltet die Sticky-/Hervorhebung korrekt auf die nächste
    Kontrollpunkt-Zeile weiter, Kontrollpunkt-Bearbeitung, Bemerkungen-
    Toggle und Ein-/Ausblenden der ETO-Spalte (inkl. Konsolen-/
    Seitenfehler-Prüfung) bleiben fehlerfrei; alle 105 Tests grün,
    tsc/Lint/Build sauber.
- **Phase 19 (abgeschlossen):** SkyDemon-Routen importierbar. SkyDemon
  exportiert Routen u. a. als GPX (offen dokumentiertes, herstellerunab-
  hängiges XML-Format, das am weitesten verbreitete Austauschformat
  zwischen Flugplanungs-Apps) — anders als SkyDemons proprietäre/Garmin-
  spezifische Formate (FPL, GFP), die bewusst nicht unterstützt werden.
  Neues `store/gpxImport.ts`: liest die Punktliste aus der ersten `<rte>`
  (Normalfall für eine exportierte Route), fällt auf `<trk>`/`<trkseg>`
  bzw. eine reine `<wpt>`-Liste zurück. Der erste Punkt wird
  Startflugplatz, jeder weitere ein Leg — TC und Distanz werden aus den
  Koordinaten per Großkreisrechnung abgeleitet (`domain/greatCircle.ts`,
  bereits seit Phase 4 vorhanden, aber nie an eine Datenquelle
  angebunden), genau der Zweck, für den `Leg.coordinates`/
  `Flight.departureCoordinates` im Domain-Modell von Anfang an vorgesehen
  waren. Neuer Button "Route importieren (GPX, z. B. SkyDemon)" in der
  Flugliste, nutzt denselben `ImportButton` wie der JSON-Import (jetzt
  mit konfigurierbarem `accept`-Prop statt fest codiertem
  `.json`-Filter). Fehlende Felder (Datum, ETD, Übergangshöhe, globale
  Standardwerte, ...) bekommen dieselben Vorgaben wie ein neu angelegter
  Flug — der Pilot ergänzt sie im Flugkopf wie gewohnt.

  `gpxImport.ts` nutzt `DOMParser` und ist deshalb nur im Browser
  aufrufbar; die Tests laufen deshalb mit
  `// @vitest-environment happy-dom` als Pro-Datei-Override (neue reine
  Dev-Abhängigkeit `happy-dom`, keine zusätzlichen Laufzeit-Abhängigkeiten
  im Produktionsbundle). 10 neue Tests (Route/Track/Wegpunktliste-
  Fallback, Namens-Fallback "WP<n>", TC/Distanz-Ableitung, defekte
  XML/zu wenige Punkte → `ImportValidationError`, Standardwerte), alle
  115 Tests grün. Zusätzlich end-to-end per Playwright gegen eine
  SkyDemon-ähnliche Beispieldatei verifiziert: importierter Flug öffnet
  sich mit korrekten Kontrollpunktnamen, TC- und Distanzwerten (Gesamt-
  strecke stimmt mit der Summe der Legs überein), ohne Konsolen-/
  Seitenfehler. tsc/Lint/Build sauber.
- **Phase 20 (abgeschlossen):** VAR-Vorzeichenkonvention gedreht, um
  Verwechslungen beim Übertragen aus SkyDemon auszuschließen. Bisher
  (seit Phase 1): positiv = östliche Missweisung, Formel subtrahiert
  (`MC = TC − VAR`) — lehrbuchkonform, aber genau entgegengesetzt zu dem,
  was SkyDemon selbst anzeigt (SkyDemon zeigt 4°E als "−4"). Nutzer
  reproduzierte das direkt an einem realen Beispiel (EDKL Leverkusen,
  TC 292°/Wind 173°/8kt/TAS 114kt → SkyDemon MH 284°, VFRMate kam vorher
  nur mit VAR=+4 auf denselben Wert, SkyDemon selbst zeigt dafür aber
  "−4" an) und bestand zu Recht auf einer Änderung, da das Vorzeichen so
  beim Abtippen aus SkyDemon aktiv in die Irre führte (ein vertauschtes
  Vorzeichen verdoppelt den Kursfehler — sicherheitsrelevant).

  Jetzt: **negativ = östliche, positiv = westliche Missweisung**, Formel
  addiert (`MC = TC + VAR`, `MH = TC + WCA + VAR`) — ein aus SkyDemon
  abgelesener Wert lässt sich unverändert eintragen, kein gedankliches
  Vorzeichen-Umdrehen mehr nötig. Geändert in `domain/flightPlan.ts`
  (`computeMc`/`computeMh`) und `domain/navigation.ts::courseChain`
  (dieselbe Drehung auch dort, obwohl aktuell nicht an die UI
  angebunden, für Konsistenz falls später reaktiviert). Neuer
  `COLUMN_HINTS`-Mechanismus in `columns.ts`: ein "ⓘ"-Symbol neben der
  VAR-Spaltenüberschrift (und als `title`-Tooltip direkt am Eingabefeld)
  erklärt die Konvention direkt in der Tabelle, damit sie beim nächsten
  Mal nicht erneut zu Verwirrung führt.

  Alle VAR-sensitiven Tests (computeMc/computeMh, courseChain) auf die
  neue Konvention umgestellt — dieselben physikalischen Szenarien,
  nur mit gedrehtem VAR-Vorzeichen im Testaufruf, identische erwartete
  Ergebnisse. Zusätzlich end-to-end per Playwright exakt gegen das vom
  Nutzer gemeldete Beispiel verifiziert: TC 292, TAS 114, Wind 173/8,
  VAR −4 ergibt jetzt MH 284° — exakt wie SkyDemon. Alle 115 Tests grün,
  tsc/Lint/Build sauber.
- **Phase 21 (abgeschlossen):** Bugfix ATD. Nutzer meldete: nach Eingabe
  der ATD stimmten die angezeigten Zeiten nicht mehr. Ursache:
  `LegActual.atoMin` wird als "Minuten seit dem Anker" gespeichert (Anker
  = ATD, solange keine ATD gesetzt ist die ETD) — tippt der Pilot
  "Überflug", bevor er die ATD einträgt, steht als Anker noch die ETD.
  Wird die ATD danach gesetzt (oder später korrigiert), verschob sich der
  Anker, und derselbe gespeicherte atoMin-Wert ergab plötzlich eine
  andere, falsche Uhrzeit — ein bereits erfasster, fester Zeitpunkt
  verschob sich rückwirkend, nur weil später eine ATD eingetragen wurde.
  Per Playwright exakt reproduziert: ATO bei Anker=ETD real um 21:33 UTC
  erfasst, nach nachträglichem Setzen von ATD +10 min zeigte dieselbe
  Zeile plötzlich 21:43 — 10 Minuten verschoben, exakt um das
  ETD→ATD-Delta.

  Neue `flightStore.ts::setAtd`-Aktion statt eines rohen
  `patchCurrentFlight({ atdUtcMin })`: verschiebt beim Setzen/Ändern der
  ATD alle bereits erfassten `legActuals` um genau das Delta zwischen
  altem und neuem Anker (`oldAnchor − newAnchor`), bevor die neue ATD
  übernommen wird — die reale Uhrzeit jedes bereits erfassten ATO bleibt
  dadurch unverändert, auch bei mehrfacher nachträglicher Korrektur der
  ATD. Noch nicht erfasste (rein geplante) Zeilen verschieben sich
  weiterhin bewusst mit dem Anker (das war schon vorher korrekt und bleibt
  es — nur bereits erfasste ATOs brauchten den Fix). `FlightHeader.tsx`
  ruft jetzt `setAtd` statt des generischen Patches auf.

  4 neue Tests (Verschiebung beim ersten Setzen, bei mehrfacher
  Korrektur, Unberührtheit noch nicht geflogener Legs, Rückfall auf ETD
  bei gelöschter ATD), alle 119 Tests grün. Per Playwright exakt gegen
  das gemeldete Szenario verifiziert: ATO-Uhrzeit bleibt jetzt über
  mehrere ATD-Korrekturen hinweg unverändert, noch nicht geflogene Legs
  verschieben sich weiterhin korrekt mit der ATD. tsc/Lint/Build sauber.

Die App ist damit funktional vollständig gemäß Auftrag, in der vom
Nutzer gewünschten vereinfachten Form.
