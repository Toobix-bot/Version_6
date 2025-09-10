/* logic.js - XP/Level/Attribute & Heuristiken */
"use strict";
import { clamp, wordCount, findKeywords } from './utils.js';
import { getConfig } from './state.js';

/** XP Bedarf für Level */
export function xpNeeded(level){
  return Math.round(50 * level * 1.3);
}

/** Berechne XP aus Eintrag */
export function deriveFromEntry(text, mood, energy, config){
  const words = wordCount(text);
  const baseXP = clamp(Math.round(words/3), 5, 50);
  const keywords = findKeywords(text, config.keywords.map(k=>k.word));
  let keywordBonus = 0;
  const matchedKeywordObjs = [];
  for(const k of config.keywords){
    if(keywords.includes(k.word)) { keywordBonus += (k.xp||0); matchedKeywordObjs.push(k); }
  }
  const moodEnergyDelta = ((mood||3)-3)*2 + ((energy||3)-3)*2;
  let xpGained = baseXP + keywordBonus + moodEnergyDelta;
  xpGained = Math.max(1, Math.round(xpGained));
  const statDiff = deriveAttributeDiff(matchedKeywordObjs, config);
  return { words, keywords, xpGained, statDiff };
}

/** Attribute Diff aus Keywords */
export function deriveAttributeDiff(keywordObjs, config){
  const diff = {};
  for(const k of keywordObjs){
    if(k.attribute){ diff[k.attribute] = (diff[k.attribute]||0) + (k.attributeGain||1); }
  }
  return diff;
}

/** Wendet XP & Stats an */
export function applyEntryDerived(stats, derived){
  stats.xp += derived.xpGained;
  for(const [attr, val] of Object.entries(derived.statDiff)){
    stats.attributes[attr] = (stats.attributes[attr]||0) + val;
  }
  // Level-Ups
  while(stats.xp >= stats.xpToNext){
    stats.level += 1;
    stats.xp -= stats.xpToNext;
    stats.xpToNext = xpNeeded(stats.level);
  }
  return stats;
}

/** Basis Fortschritt (einfach) */
export function updateBase(base, stats){
  const newTier = Math.max(1, Math.floor(stats.level/3)+1);
  if(newTier !== base.tier){
    base.tier = newTier;
    base.name = baseNameForTier(newTier);
    base.slots = newTier; // einfach
  }
  return base;
}

export function baseNameForTier(t){
  const names = ['Lager', 'Zeltlager', 'Holzhütte', 'Außenposten', 'Siedlung', 'Festung'];
  return names[t-1] || ('Tier '+t);
}

/** Neue Quest Vorschlag (regelbasiert) */
export function suggestQuestFromState(state){
  // Finde niedrigstes Attribut und erstelle Fokus-Quest dazu
  const attrs = state.stats.attributes;
  const weakest = Object.entries(attrs).sort((a,b)=>a[1]-b[1])[0];
  const attr = weakest? weakest[0] : 'fokus';
  const title = attr === 'vitalitaet' ? '15 Min. Bewegung' : attr === 'fokus' ? '25 Min. Fokusblock' : attr === 'sozial' ? 'Kontakt aufnehmen' : 'Routine pflegen';
  const desc = 'Unterstütze dein Attribut '+attr+' heute.';
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
    title,
    desc,
    reward: { xp: 20, attribute: { [attr]: 1 } },
    status: 'open'
  };
}

export function applyQuestReward(stats, quest){
  stats.xp += quest.reward.xp || 0;
  if(quest.reward.attribute){
    for(const [k,v] of Object.entries(quest.reward.attribute)){
      stats.attributes[k] = (stats.attributes[k]||0)+v;
    }
  }
  while(stats.xp >= stats.xpToNext){
    stats.level += 1;
    stats.xp -= stats.xpToNext;
    stats.xpToNext = xpNeeded(stats.level);
  }
  return stats;
}

export function summarizeEntry(derived){
  const parts = [`XP +${derived.xpGained}`];
  for(const [k,v] of Object.entries(derived.statDiff)) parts.push(`${k}+${v}`);
  return parts.join(', ');
}

export function getConfigCached(){ return getConfig(); }
