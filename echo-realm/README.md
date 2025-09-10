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

## Groq Setup (später)
1. Separates Modul `aiGroq.js` (nicht im Bundle API-Key hardcodieren).
2. Proxy / Server-seitige Edge Function für echte API-Aufrufe.
3. `aiAdapter.js`: `ai('groq')` instanziieren, Fallback auf `local` bei Fehler.
4. Keine Keys in Git committen; `.env` nur lokal.

## Lizenz
Siehe LICENSE (optional noch anzulegen).
