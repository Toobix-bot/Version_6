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
import { todayISO, emit } from './utils.js';
import { aiLocal, activateGroq, activateLocal, getAI } from './aiAdapter.js';
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
  setupAIControls();
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

function setupAIControls(){
  const activateBtn = document.getElementById('btn-activate-groq');
  const localBtn = document.getElementById('btn-ai-local');
  const pingBtn = document.getElementById('btn-groq-ping');
  const keyInput = document.getElementById('groq-key');
  const aiPanel = document.getElementById('ai-panel');
  if(activateBtn && keyInput){
    activateBtn.addEventListener('click', async ()=>{
      const key = keyInput.value.trim(); if(!key){ emit('toast','Key leer'); return; }
      const ok = await activateGroq(key, { model:'mixtral-8x7b', ttlMs: 1000*60*15 });
      emit('toast', ok? 'Groq aktiv' : 'Groq Fehler');
      if(ok) startAISessionTimer();
    });
  }
  if(localBtn){
    localBtn.addEventListener('click', ()=>{ activateLocal(); emit('toast','Local AI'); });
  }
  if(pingBtn && keyInput){
    pingBtn.addEventListener('click', async ()=>{
      const key = keyInput.value.trim(); if(!key){ emit('toast','Key leer'); return; }
      try {
        const resp = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { 'Authorization':'Bearer '+key }
        });
        if(!resp.ok){ emit('toast','Ping Fehler '+resp.status); return; }
        const data = await resp.json();
        const first = data?.data?.[0]?.id || 'ok';
        emit('toast','Groq Ping: '+first);
      } catch(e){ emit('toast','Ping Exception'); }
    });
  }
}

let _aiTTLInterval = null;
function startAISessionTimer(){
  const summaryEl = document.createElement('div');
  summaryEl.style.cssText='font-size:.55rem;opacity:.6;margin-top:.25rem;';
  const panel = document.querySelector('#ai-panel div');
  if(panel){ panel.appendChild(summaryEl); }
  const started = Date.now(); const ttl = 1000*60*15;
  if(_aiTTLInterval) clearInterval(_aiTTLInterval);
  _aiTTLInterval = setInterval(()=>{
    const left = Math.max(0, ttl - (Date.now()-started));
    const m = Math.floor(left/60000); const s = Math.floor((left%60000)/1000);
    summaryEl.textContent = 'Groq Session: '+m+':'+String(s).padStart(2,'0');
    if(left<=0){ clearInterval(_aiTTLInterval); summaryEl.textContent='Groq Session beendet'; }
  },1000);
}
