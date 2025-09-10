/* aiAdapter.js - Strategy Hook for future Groq integration */
"use strict";
import { summarizeEntry as summarizeDerived } from './logic.js';

/** @typedef {"local"|"groq"} AIStrategy */

/** Strategy factory */
export const ai = (/** @type {AIStrategy} */ strategy = "local") => ({
  /** @param {string} text @param {{xpGained:number,statDiff:Record<string,number>,keywords:string[]}} [derived]*/
  async summarizeEntry(text, derived){
    return strategy === 'local' ? localSummary(text, derived) : groqSummary(text, derived);
  },
  /** @param {any} state */
  async suggestQuests(state){
    return strategy === 'local' ? localQuests(state) : groqQuests(state);
  }
});

async function localSummary(text, derived){
  if(derived) return summarizeDerived(derived) + (derived.keywords?.length? ' | '+derived.keywords.join(', ') : '');
  return (text.trim().split(/\s+/).length||0)+ ' Wörter';
}
async function localQuests(state){
  // Regelbasiert delegiert an quests/logic extern – hier leer lassen
  return [];
}
// Platzhalter – später Groq JS/TS Client einbinden
async function groqSummary(){ throw new Error('Groq not wired yet'); }
async function groqQuests(){ throw new Error('Groq not wired yet'); }

// Default convenience instance (local)
export const aiLocal = ai('local');
