/* aiAdapter.js - Strategy Hook for future Groq integration */
"use strict";
import { summarizeEntry as summarizeDerived } from './logic.js';

/** @typedef {"local"|"groq"} AIStrategy */

/** Strategy factory */
export const ai = (/** @type {AIStrategy} */ strategy = "local", implOverrides={}) => ({
  /** @param {string} text @param {{xpGained:number,statDiff:Record<string,number>,keywords:string[]}} [derived]*/
  async summarizeEntry(text, derived){
  if(implOverrides.summarizeEntry) return implOverrides.summarizeEntry(text, derived);
  return strategy === 'local' ? localSummary(text, derived) : groqSummary(text, derived);
  },
  /** @param {any} state */
  async suggestQuests(state){
  if(implOverrides.suggestQuests) return implOverrides.suggestQuests(state);
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

// --- Runtime Manager ---
let _activeAI = aiLocal;
let _groqTimeoutId = null;
/** Returns currently active AI strategy instance */
export function getAI(){ return _activeAI; }
/** Force switch to local */
export function activateLocal(){
  if(_activeAI && _activeAI.dispose) try{ _activeAI.dispose(); }catch{}
  _activeAI = aiLocal;
  if(_groqTimeoutId){ clearTimeout(_groqTimeoutId); _groqTimeoutId=null; }
}
/**
 * Activates Groq strategy dynamically. The key is kept only in memory.
 * If loading fails, remains on local.
 * @param {string} apiKey
 * @param {{model?: string}} [opts]
 */
export async function activateGroq(apiKey, opts={}){
  if(!apiKey){ activateLocal(); return false; }
  try {
    const mod = await import('./aiGroq.js');
    _activeAI = mod.createGroqAI(apiKey, opts);
    if(_groqTimeoutId){ clearTimeout(_groqTimeoutId); }
    const ttlMs = opts.ttlMs || 1000*60*15; // 15 min default
    _groqTimeoutId = setTimeout(()=>{ activateLocal(); console.info('Groq AI auto-timeout -> local'); }, ttlMs);
    return true;
  } catch(e){
    console.warn('Groq activation failed', e);
    activateLocal();
    return false;
  }
}

// Wipe key when page hidden for > X minutes (simple heuristic)
let _hiddenAt = null;
if(typeof document !== 'undefined' && document.addEventListener){
  document.addEventListener('visibilitychange', ()=>{
    if(document.hidden){ _hiddenAt = Date.now(); }
    else if(_hiddenAt && Date.now()-_hiddenAt > 1000*60*20){ // 20 min
      activateLocal();
      _hiddenAt = null;
      console.info('Visibility timeout -> local AI');
    }
  });
}
