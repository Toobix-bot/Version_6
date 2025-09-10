/* aiAdapter.js - LLM Hook (Fallback Heuristiken) */
"use strict";
import { summarizeEntry as summarizeDerived } from './logic.js';

/** Placeholder: zukünftige Groq Integration; ENV Key hier NICHT needed */

/**
 * @param {string} text
 * @param {{xpGained:number, statDiff:Record<string,number>, keywords:string[]}} derived
 */
export async function summarizeEntry(text, derived){
  // Fallback: deterministische Zusammenfassung
  return summarizeDerived(derived) + (derived.keywords.length? ' | '+derived.keywords.join(', ') : '');
}

/** @param {any} state */
export async function suggestQuests(state){
  // Fallback: return empty (nutzt regelbasierte Variante woanders)
  return [];
}
