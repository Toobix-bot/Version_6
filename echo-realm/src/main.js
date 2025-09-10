/* main.js - Bootstrapping */
/**
 * COPILOT KICKOFF (Version_6)
 * Bitte implementiere als Nächstes:
 * 1) Autosave für Diary-Form (debounced 800ms) + Undo-Stack (max 10 Schritte)
 * 2) Mini-Encounter: handleEncounter({stat:"fokus"}) → Ergebnis Toast + XP
 * 3) UI: Basis-Tier-Badge mit Tooltip (Tier-Text aus state.base.tier)
 * Beachte: ES-Modules, reine Render-Funktionen, JSDoc, keine externen Abhängigkeiten.
 */
"use strict";
import { getState, saveState, integrateEntryDerived, applyBaseProgress, getConfig, undoLastEntry, enableAutosave } from './state.js';
import { deriveFromEntry, applyEntryDerived, summarizeEntry as summarizeDerived } from './logic.js';
import { initUI, handleExport, handleImport } from './ui.js';
import { generateQuest, completeQuest, skipQuest, rerollQuest } from './quests.js';
import { addQuest } from './state.js';
import { todayISO, emit } from './utils.js';
import { getAI, activateLocal, setAI } from './aiAdapter.js';
import { requirePin } from './pin.js';

function init(){
  try { requirePin(); } catch {}
  // Set default date
  const dateInput = document.getElementById('entry-date');
  if(dateInput) dateInput.value = todayISO();

  const form = document.getElementById('entry-form');
  form?.addEventListener('submit', onSubmitEntry);

  document.getElementById('btn-new-quest')?.addEventListener('click', ()=>{
    const q = generateQuest();
    emit('toast', 'Neue Quest: '+q.title);
  });
  document.getElementById('btn-ai-quests')?.addEventListener('click', onAIQuests);

  document.getElementById('btn-export')?.addEventListener('click', handleExport);
  document.getElementById('import-file')?.addEventListener('change', e=>{
    const f = e.target.files?.[0]; if(f) handleImport(f);
  });

  document.getElementById('quest-list')?.addEventListener('click', e=>{
    const target = e.target;
    if(!(target instanceof HTMLElement)) return;
    const li = target.closest('li[data-id]'); if(!li) return;
    const id = li.getAttribute('data-id'); if(!id) return;
    const action = target.getAttribute('data-action');
  if(action==='done'){ completeQuest(id); }
  if(action==='skip'){ skipQuest(id); }
  if(action==='reroll'){ rerollQuest(id); }
  });

  initUI();
  const formEl = document.getElementById('entry-form');
  enableAutosave(formEl, { debounceMs: 800 });
  initAIStatus();
}

async function onSubmitEntry(e){
  e.preventDefault();
  const state = getState();
  const dateEl = document.getElementById('entry-date');
  const textEl = document.getElementById('entry-text');
  const moodEl = document.getElementById('mood');
  const energyEl = document.getElementById('energy');
  const date = dateEl?.value || todayISO();
  const text = textEl?.value?.trim()||'';
  const mood = moodEl?.value ? Number(moodEl.value) : undefined;
  const energy = energyEl?.value ? Number(energyEl.value) : undefined;
  if(!text){ emit('toast','Text leer'); return; }
  const entry = { id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2), date, text, mood, energy };
  const cfg = getConfig();
  const derived = deriveFromEntry(text, mood, energy, { keywords: cfg.keywords || [] });
  applyEntryDerived(state.stats, derived);
  applyBaseProgress();
  integrateEntryDerived(entry, derived);
  saveState();
  // Summarize (LLM Hook) - fallback summarization
  try { const summary = await getAI().summarizeEntry(text, derived); showUndoToast(summary); } catch { showUndoToast('Gespeichert'); }
  if(textEl) textEl.value='';
}

function showUndoToast(summary){
  const cont = document.getElementById('toast-container'); if(!cont) return;
  const div = document.createElement('div');
  div.className = 'toast';
  div.innerHTML = `${summary} <span class="undo-link" data-undo>Undo</span>`;
  div.addEventListener('click', e=>{
    const t = e.target; if(t instanceof HTMLElement && t.matches('[data-undo]')){
      if(undoLastEntry()){
        div.remove();
        const d2 = document.createElement('div'); d2.className='toast'; d2.textContent='Eintrag zurückgerollt'; cont.appendChild(d2); setTimeout(()=>d2.remove(),3000);
      }
    }
  });
  cont.appendChild(div);
  setTimeout(()=>{ div.remove(); }, 6000);
}

document.addEventListener('DOMContentLoaded', init);

// (legacy inline autosave removed in favor of enableAutosave in state.js)

function initAIStatus(){
  const el = document.getElementById('ai-status'); if(!el) return;
  updateAIStatus();
  // Auto-detect on load
  autoDetectProxy();
  // Hash still supported (#ai=proxy / #ai=local)
  window.addEventListener('hashchange', handleHashSwitch);
  handleHashSwitch();
  // Toggle button
  const toggle = document.getElementById('ai-toggle');
  toggle?.addEventListener('click', ()=>{
    if(currentStrategy==='proxy') { switchToLocal(); }
    else { switchToProxyManual(); }
  });
}

let currentStrategy = 'local';
let lastProxyError = '';
function updateAIStatus(){
  const el = document.getElementById('ai-status'); if(!el) return;
  el.textContent = 'AI: '+currentStrategy + (currentStrategy==='local' && lastProxyError? ' (proxy: '+lastProxyError+')' : '');
}

async function switchToProxyManual(){
  await switchToProxy(true);
}

async function autoDetectProxy(){
  // Skip if hash explicitly local
  if(/ai=local/.test(location.hash)) return;
  await switchToProxy(false);
}

async function switchToProxy(showToast){
  try {
  lastProxyError=''; updateAIStatus();
  const t0 = performance.now();
  const ping = await fetch('http://localhost:8787/api/ping', { method:'GET' });
  if(!ping.ok){ throw new Error('Status '+ping.status); }
  const dt = Math.round(performance.now()-t0);
    const mod = await import('./aiProxy.js');
    setAI(mod.createProxyAI({ baseUrl: 'http://localhost:8787' }));
    currentStrategy='proxy';
    updateAIStatus();
    const btn = document.getElementById('ai-toggle'); if(btn) btn.textContent='Proxy aus';
  if(showToast) emit('toast','AI Proxy aktiv ('+dt+'ms)');
  } catch {
  if(!lastProxyError) lastProxyError='offline';
    switchToLocal();
  }
}

function switchToLocal(){
  activateLocal(); currentStrategy='local'; updateAIStatus();
  const btn = document.getElementById('ai-toggle'); if(btn) btn.textContent='Proxy an';
  emit('toast','AI local');
}

async function onAIQuests(){
  const ai = getAI();
  if(!ai?.suggestQuests){ emit('toast','AI nicht verfügbar'); return; }
  try {
    const st = getState();
    const ideas = await ai.suggestQuests(st);
    if(!ideas.length){ emit('toast','Keine AI-Quests'); return; }
    let added=0;
    for(const q of ideas){
      if(!q.title || !q.reward) continue;
      // Normalize reward shape
      const reward = { xp: q.reward.xp || 5, attribute: q.reward.attribute||null };
      const quest = { id: crypto.randomUUID(), title: q.title.slice(0,60), desc: (q.desc||'').slice(0,140), status:'open', reward };
      addQuest(quest); added++;
    }
    emit('toast', 'AI Quests hinzugefügt: '+added);
  } catch(e){ emit('toast','AI Quest Fehler'); }
}

function handleHashSwitch(){
  if(/ai=proxy/.test(location.hash)) switchToProxy(true);
  else if(/ai=local/.test(location.hash)) switchToLocal();
}

// Extra diagnostics when user clicks status while local
document.addEventListener('click', e=>{
  const el = e.target; if(!(el instanceof HTMLElement)) return;
  if(el.id==='ai-status' && currentStrategy==='local'){
    if(!lastProxyError) emit('toast','Proxy nicht aktiv');
    else emit('toast','Proxy Fehler: '+lastProxyError);
  }
});
