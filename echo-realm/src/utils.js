/* utils.js - generische Helferfunktionen */
"use strict";

/** @returns {string} ISO Datum YYYY-MM-DD */
export function todayISO() {
  return new Date().toISOString().slice(0,10);
}

/** @param {number} min @param {number} val @param {number} max */
export function clamp(val, min, max){
  return Math.max(min, Math.min(max, val));
}

/** @returns {string} pseudo-uuid (nicht kryptografisch) */
export function uuid(){
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{
    const r = Math.random()*16|0; const v = c==='x'? r : (r&0x3|0x8); return v.toString(16);
  });
}

/** @param {Record<string, any>} obj */
export function deepClone(obj){ return JSON.parse(JSON.stringify(obj)); }

/** @param {any} v */
export function isObject(v){ return v && typeof v === 'object' && !Array.isArray(v); }

/** @param {string} key */
export function loadLocal(key){
  try { return JSON.parse(localStorage.getItem(key) || 'null'); }
  catch(e){ console.warn('LocalStorage parse fail', key, e); return null; }
}

/** @param {string} key @param {any} value */
export function saveLocal(key, value){
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch(e){ console.warn('LocalStorage save fail', key, e); return false; }
}

/** Kleines Event-System */
const listeners = new Map();
export function on(event, cb){
  if(!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(cb); return () => off(event, cb);
}
export function off(event, cb){ const set = listeners.get(event); if(set){ set.delete(cb); if(!set.size) listeners.delete(event);} }
export function emit(event, payload){ const set = listeners.get(event); if(set) for(const cb of set) cb(payload); }

/** Format XP short */
export function formatXP(xp){ return xp + ' XP'; }

/** @param {string} text */
export function wordCount(text){ return (text.trim().match(/\b\w+\b/g)||[]).length; }

/** @param {string} text @param {string[]} keywords */
export function findKeywords(text, keywords){
  const lower = text.toLowerCase();
  return keywords.filter(k=> lower.includes(k.toLowerCase()));
}

/** Generates a simple diff summary from stat diff object */
export function formatStatDiff(diff){
  return Object.entries(diff).map(([k,v])=> v>0? `${k}+${v}` : `${k}${v}`).join(', ');
}

export function safeParseJSON(str){ try { return JSON.parse(str); } catch { return null; } }

// --- Dev Self-Test (non-fatal) ---
if(typeof window !== 'undefined' && window && !window.__ECHO_UTILS_TESTED__){
  window.__ECHO_UTILS_TESTED__ = true;
  try {
    console.assert(clamp(10,0,5)===5, 'clamp upper');
    console.assert(clamp(-1,0,5)===0, 'clamp lower');
    console.assert(wordCount('Hallo Welt  test')===3, 'wordCount');
  } catch(e){ console.warn('Utils self-test fail', e); }
}
