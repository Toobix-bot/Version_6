/* state.js - AppState, Load/Save, History */
"use strict";
import { loadLocal, saveLocal, uuid, deepClone, emit, createUndoStack } from './utils.js';
import { xpNeeded, updateBase } from './logic.js';
import { sanitizeArray, isEntry, isQuest, isStats, isProfile, isBase, migrateStateIfNeeded } from './schemas.js';

const STORAGE_KEY = 'echoRealmStateV1';
const CONFIG_KEY = 'echoRealmConfigV1';

let configCache = null;

/** @typedef {ReturnType<typeof createInitialState>} AppState */

export function createInitialState(){
  const now = new Date().toISOString();
  return {
    profile: { name: 'Abenteurer', createdAt: now, streakCleanDays: 0, preferences: { language: 'de' } },
    stats: { level: 1, xp: 0, xpToNext: xpNeeded(1), attributes: { vitalitaet: 1, fokus: 1, sozial: 1, disziplin:1 }, buffs: [], debuffs: [] },
    base: { tier:1, name:'Lager', slots:1, upgrades:[] },
    entries: [],
    quests: [],
    history: [],
  meta: { version: 1, updatedAt: now },
  _lastEntryBackup: null
  };
}

let state = createInitialState();
const entryUndoStack = createUndoStack(10);

export function getState(){ return state; }

export function getConfig(){
  if(configCache) return configCache;
  const stored = loadLocal(CONFIG_KEY);
  if(stored) configCache = stored;
  return configCache || { keywords: [], tuning: {} };
}

export function setConfig(cfg){ configCache = cfg; saveLocal(CONFIG_KEY, cfg); }

export function loadState(){
  let raw = loadLocal(STORAGE_KEY);
  if(!raw) return state;
  raw = migrateStateIfNeeded(raw);
  // Validate basic structure
  if(raw.profile && isProfile(raw.profile)) state.profile = raw.profile; 
  if(raw.stats && isStats(raw.stats)) state.stats = raw.stats; else state.stats = createInitialState().stats;
  if(raw.base && isBase(raw.base)) state.base = raw.base; else state.base = createInitialState().base;
  state.entries = sanitizeArray(raw.entries, isEntry);
  state.quests = sanitizeArray(raw.quests, isQuest);
  state.history = Array.isArray(raw.history)? raw.history.slice(-1000): [];
  state.meta = raw.meta || state.meta;
  return state;
}

export function saveState(){
  state.meta.updatedAt = new Date().toISOString();
  saveLocal(STORAGE_KEY, state);
}

function pushHistory(type, summary){
  state.history.push({ ts: Date.now(), type, summary });
  if(state.history.length>1000) state.history.shift();
}

export function addEntry(entry){
  // replace existing date entry or push
  const idx = state.entries.findIndex(e=>e.date === entry.date);
  if(idx>=0){ entryUndoStack.push(JSON.parse(JSON.stringify(state.entries[idx]))); }
  else { entryUndoStack.push(null); }
  if(idx>=0) state.entries[idx] = entry; else state.entries.push(entry);
  pushHistory('ENTRY_ADDED', entry.derived ? `XP +${entry.derived.xpGained}` : 'entry');
  saveState();
  emit('state:changed');
  return entry;
}

export function addQuest(q){
  state.quests.push(q);
  pushHistory('QUEST_ADDED', q.title);
  saveState();
  emit('state:changed');
}

export function updateQuestStatus(id, status){
  const q = state.quests.find(q=>q.id===id); if(!q) return;
  q.status = status;
  pushHistory('QUEST_'+status.toUpperCase(), q.title);
  saveState();
  emit('state:changed');
}

export function applyQuestCompletion(id, rewardAppliedCb){
  const q = state.quests.find(q=>q.id===id); if(!q || q.status!=='open') return;
  q.status = 'done';
  pushHistory('QUEST_DONE', q.title);
  rewardAppliedCb && rewardAppliedCb(q);
  saveState();
  emit('state:changed');
}

export function applyBaseProgress(){
  updateBase(state.base, state.stats);
  saveState();
  emit('state:changed');
}

export function integrateEntryDerived(entry, derived){
  entry.derived = derived;
  // Backup previous entry with same date for undo
  const prev = state.entries.find(e=>e.date===entry.date);
  state._lastEntryBackup = prev ? JSON.parse(JSON.stringify(prev)) : null;
  addEntry(entry);
  pushHistory('ENTRY_DERIVED', `XP +${derived.xpGained}`);
  saveState();
  emit('state:changed');
}

export function undoLastEntry(){
  const prev = entryUndoStack.pop();
  if(prev===undefined) return false;
  if(prev===null){
    // means there was no previous entry, remove latest
    state.entries.sort((a,b)=>a.date.localeCompare(b.date));
    state.entries.pop();
  } else {
    const idx = state.entries.findIndex(e=>e.date===prev.date);
    if(idx>=0) state.entries[idx] = prev; else state.entries.push(prev);
  }
  pushHistory('UNDO_ENTRY', 'letzter Eintrag');
  saveState();
  emit('state:changed');
  return true;
}

export function exportState(){
  const data = deepClone(state);
  return JSON.stringify({ state: data, config: getConfig() }, null, 2);
}

export function importState(json){
  try {
    const parsed = JSON.parse(json);
    if(parsed.state){
      state = parsed.state;
      saveState();
      if(parsed.config) setConfig(parsed.config);
      emit('state:changed');
      pushHistory('IMPORT', 'State importiert');
      return true;
    }
  } catch(e){ console.warn('Import fail', e); }
  return false;
}

export function resetState(){ state = createInitialState(); saveState(); emit('state:changed'); }

// Initial load
loadState();
// Attempt async fetch of config.json (non-blocking)
fetch('./data/config.json').then(r=>r.json()).then(cfg=>{ if(cfg && cfg.keywords){ setConfig(cfg); emit('state:changed'); } }).catch(()=>{});
