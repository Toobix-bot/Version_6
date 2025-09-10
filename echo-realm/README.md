# ECHO-REALM (MVP)

Privates, lokal laufendes Diary → RPG System. Keine externen Requests; Speicherung über LocalStorage. MVP basiert auf purem HTML/CSS/ES-Modules.

## Features (MVP)
- Tagebuch-Einträge (Datum, Text, Stimmung, Energie)
- Ableitung von XP & Attribut-Diffs via einfache Heuristik (Wörterzahl, Keywords, Mood/Energy)
- Charakter-Stats: Level, XP-Balken, Attribute, Buffs/Debuffs (Platzhalter)
- Basis mit Tier & Slots (automatisch aus Level)
- Quests (regelbasiert generiert, abschließen/skipped)
- Persistenz: LocalStorage, Export/Import als JSON
- History (intern protokolliert, aktuell nicht separat UI-gerendert)
- LLM-Hook via `aiAdapter.js` (Fallback lokal, erweiterbar für Groq)

## Ordnerstruktur
```
/echo-realm
  index.html
  style.css
  /src
    main.js
    state.js
    logic.js
    ui.js
    quests.js
    aiAdapter.js
    schemas.js
    utils.js
  /data
    config.json
    seeds.json
  /assets (Platzhalter)
```

## Datenmodelle (Kurz)
- profile, stats, base, entries[], quests[], history[]

## Heuristik (XP)
- baseXP = clamp(words/3, 5, 50)
- Keyword XP Bonus (config.json)
- Stimmung/Energie Delta: (mood-3)*2 + (energy-3)*2
- min 1 XP
- Level: xpNeeded = round(50 * level * 1.3)

## Erweiterungspunkte
- LLM Integration (Groq) → `aiAdapter.js` (Strategy: local|groq)
- Erweiterte Stat-Auswertung & Trends
- Basis Ausbausystem / Visualisierung
- Quest-Typen & Belohnungsvielfalt
- Monats-/Wochenberichte, Auto-Summaries
- Weitere Accessibility & Offline-first Patterns

## Nutzung
1. `index.html` im Browser öffnen (kein Build nötig)
2. Eintrag ausfüllen → Speichern
3. XP/Level Fortschritt beobachten
4. Quests generieren & abschließen
5. Export/Import für Backups

### PIN-Lock (optional UX-Schutz)
Falls ein PIN gesetzt (LocalStorage Hash), erscheint vor der UI ein Overlay. Rein kosmetisch – bietet keine echte Sicherheit gegen lokalen Zugriff oder XSS.

## Datenschutz
Alles lokal. Keine Netzwerkrequests im MVP. Keine Secrets im LocalStorage speichern. PIN ist nur UX.

## Groq Integration (optional, experimentell)
Standardweg jetzt über lokalen Proxy (kein Key im Browser):
1. `.env` anlegen: `GROQ_API_KEY=...`
2. Proxy starten: `npm run proxy`
3. App mit Hash öffnen: `index.html#ai=proxy`
4. Status zeigt `AI: proxy`; Einträge triggern Zusammenfassung via Proxy.

Fallback ohne Proxy: bleibt automatisch `AI: local`.

Intern: Proxy Strategy (`aiProxy.js`) ersetzt direkte Key-Nutzung. Key bleibt ausschließlich serverseitig im Prozess. Kein LocalStorage.

## Lizenz
Siehe LICENSE (optional noch anzulegen).
