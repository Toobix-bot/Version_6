/* main.js - Bootstrapping */
"use strict";
import { getState, saveState, integrateEntryDerived, applyBaseProgress, getConfig, undoLastEntry } from './state.js';
import { deriveFromEntry, applyEntryDerived, summarizeEntry as summarizeDerived } from './logic.js';
import { initUI, handleExport, handleImport } from './ui.js';
import { generateQuest, completeQuest, skipQuest } from './quests.js';
import { todayISO, emit } from './utils.js';
import { summarizeEntry } from './aiAdapter.js';

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
  try { const summary = await summarizeEntry(text, derived); showUndoToast(summary); } catch { showUndoToast('Gespeichert'); }
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
