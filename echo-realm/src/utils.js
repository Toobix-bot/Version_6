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

/**
 * Debounce: returns a function that delays invoking fn until after wait ms have
 * elapsed since the last call.
 * @template {(...a:any)=>any} F
 * @param {F} fn
 * @param {number} [wait=300]
 * @returns {F}
 */
export function debounce(fn, wait=300){
  let t; // handle id
  // @ts-ignore
  return function(...args){
    clearTimeout(t);
    t = setTimeout(()=>fn.apply(this,args), wait);
  };
}

/**
 * Creates a bounded LIFO undo stack.
 * @param {number} [limit=10]
 */
export function createUndoStack(limit=10){
  /** @type {any[]} */
  const stack = [];
  return {
    /** @param {any} snap */ push(snap){ stack.push(snap); if(stack.length>limit) stack.shift(); },
    /** @returns {any} */ pop(){ return stack.pop(); },
    /** @returns {boolean} */ canUndo(){ return stack.length>0; },
    /** @returns {number} */ size(){ return stack.length; },
    clear(){ stack.length=0; }
  };
}

// --- Dev Self-Test (non-fatal) ---
if(typeof window !== 'undefined' && window && !window.__ECHO_UTILS_TESTED__){
  window.__ECHO_UTILS_TESTED__ = true;
  try {
    console.assert(clamp(10,0,5)===5, 'clamp upper');
    console.assert(clamp(-1,0,5)===0, 'clamp lower');
    console.assert(wordCount('Hallo Welt  test')===3, 'wordCount');
  // undo stack
  const us = createUndoStack(2); us.push(1); us.push(2); us.push(3); console.assert(us.size()===2,'undo size limit'); console.assert(us.pop()===3,'undo pop');
  // debounce test (best-effort)
  let hits=0; const d = debounce(()=>{ hits++; }, 10); d(); d(); d(); setTimeout(()=>{ console.assert(hits===1,'debounce single fire'); },30);
  } catch(e){ console.warn('Utils self-test fail', e); }
}
