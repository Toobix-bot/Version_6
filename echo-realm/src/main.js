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
import { getState, saveState, integrateEntryDerived, applyBaseProgress, getConfig, undoLastEntry } from './state.js';
import { deriveFromEntry, applyEntryDerived, summarizeEntry as summarizeDerived } from './logic.js';
import { initUI, handleExport, handleImport } from './ui.js';
import { generateQuest, completeQuest, skipQuest } from './quests.js';
import { todayISO, emit } from './utils.js';
import { aiLocal } from './aiAdapter.js';

function init(){
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
  });

  initUI();
  setupAutosave();
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
  try { const summary = await aiLocal.summarizeEntry(text, derived); showUndoToast(summary); } catch { showUndoToast('Gespeichert'); }
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

// --- Autosave / Draft ---
function setupAutosave(){
  const textEl = document.getElementById('entry-text');
  const moodEl = document.getElementById('mood');
  const energyEl = document.getElementById('energy');
  if(!textEl) return;
  const DRAFT_KEY = 'echoRealmDraftV1';
  // restore
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if(raw){
      const j = JSON.parse(raw);
      if(j.text && !textEl.value) textEl.value = j.text;
      if(j.mood && moodEl && !moodEl.value) moodEl.value = j.mood;
      if(j.energy && energyEl && !energyEl.value) energyEl.value = j.energy;
    }
  } catch {}
  let t;
  const handler = ()=>{
    const draft = { text: textEl.value, mood: moodEl?.value||'', energy: energyEl?.value||'' };
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch {}
  };
  const debounced = (e)=>{ clearTimeout(t); t = setTimeout(handler, 800); };
  ['input','change'].forEach(evt=>{
    textEl.addEventListener(evt, debounced);
    moodEl?.addEventListener(evt, debounced);
    energyEl?.addEventListener(evt, debounced);
  });
  // clear draft on successful submit
  const form = document.getElementById('entry-form');
  form?.addEventListener('submit', ()=>{ localStorage.removeItem(DRAFT_KEY); });
}
