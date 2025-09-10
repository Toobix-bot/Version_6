# Copilot Instructions – Version_6 (ECHO-REALM Diary-RPG)

## Ziel
Lokale Web-App (HTML/CSS/JS, ES-Modules) als Diary-RPG:
- Täglicher Eintrag → XP/Stats/Avatar/Base
- Quests (open/done/skipped) + Reroll
- History/Timeline
- LocalStorage Persistenz + JSON Export/Import
- Später: Groq-LLM via aiAdapter (Stub jetzt, echte API später)

## Architekturrichtlinien
- Keine Frameworks im MVP. Strikte Module: /src/{state,logic,ui,quests,aiAdapter,schemas,utils}.js
- Kleine, klar benannte Funktionen; DOM-Updates in Render-Funktionen
- JSDoc-Typkommentare
- Tests: pure JS Assertions für Kernfunktionen (xpNeeded, deriveFromEntry, findKeywords)

## Nächste Tasks (Priorität)
1) PIN-Lock vor UI (4-stelliger Code)
2) Autosave (debounce) + Undo-Stack für Einträge
3) Quest-Typen (Lernen/Bewegung/Sozial) + Reroll
4) Basis-Tier-Badge + Tooltip
5) Mini-Encounter (1–100 Wurf + Stat-Mod)
6) History-Panel mit Filtern
7) Optional: Export verschlüsseln (einfaches Password-Gate; **keine Secrets im LocalStorage**)

## Groq-Hook
- `aiAdapter.js` soll strategy `"local" | "groq"` unterstützen.
- Für `"groq"` später `groq` TypeScript/JS-Client verwenden.

Warum das? Copilot liest diese Datei repo-weit und hält sich eher an Struktur/Tasks/Standards.
