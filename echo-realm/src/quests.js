/* quests.js - Quest Store & Generator */
"use strict";
import { suggestQuestFromState, applyQuestReward } from './logic.js';
import { getState, addQuest, applyQuestCompletion, saveState } from './state.js';
import { emit } from './utils.js';

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
