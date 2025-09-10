/* quests.js - Quest Store & Generator */
"use strict";
import { suggestQuestFromState, applyQuestReward } from './logic.js';
import { getState, addQuest, applyQuestCompletion, saveState } from './state.js';
import { emit, todayISO } from './utils.js';

export function generateQuest(){
  const q = suggestQuestFromState(getState());
  addQuest(q);
  return q;
}

export function completeQuest(id){
  const st = getState();
  const quest = st.quests.find(q=>q.id===id);
  if(!quest) return;
  applyQuestCompletion(id, (q)=>{
    applyQuestReward(st.stats, q);
    saveState();
  });
  emit('toast', 'Quest abgeschlossen: '+quest.title);
}

export function skipQuest(id){
  const st = getState();
  const quest = st.quests.find(q=>q.id===id); if(!quest) return;
  quest.status = 'skipped';
  saveState();
  emit('toast', 'Quest übersprungen: '+quest.title);
}

/** Reroll an open quest (max 2 per day total) */
export function rerollQuest(id){
  const st = getState();
  const quest = st.quests.find(q=>q.id===id && q.status==='open');
  if(!quest) return false;
  if(!st.limits) st.limits = { rerolls: {} };
  if(!st.limits.rerolls) st.limits.rerolls = {};
  const d = todayISO();
  const used = st.limits.rerolls[d] || 0;
  if(used >= 2){ emit('toast','Reroll-Limit erreicht'); return false; }
  // Generate replacement
  const oldTitle = quest.title;
  const newQuest = suggestQuestFromState(st);
  // Replace fields in place to keep references
  quest.title = newQuest.title;
  quest.desc = newQuest.desc;
  quest.reward = newQuest.reward;
  st.limits.rerolls[d] = used + 1;
  st.history.push({ ts: Date.now(), type:'QUEST_REROLLED', summary:`${oldTitle} -> ${quest.title}` });
  saveState();
  emit('state:changed');
  emit('toast','Quest neu: '+quest.title);
  return true;
}
