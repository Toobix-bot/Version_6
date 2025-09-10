/* schemas.js - leichte Laufzeitvalidierung */
"use strict";

/** Einfache Guard-Funktionen um Daten grob zu validieren */

export function isEntry(obj){
  return obj && typeof obj.id === 'string' && typeof obj.date === 'string' && typeof obj.text === 'string';
}

export function isQuest(obj){
  return obj && typeof obj.id === 'string' && typeof obj.title === 'string';
}

export function isStats(obj){
  return obj && typeof obj.level === 'number' && typeof obj.xp === 'number';
}

export function isProfile(obj){
  return obj && typeof obj.name === 'string';
}

export function isBase(obj){
  return obj && typeof obj.tier === 'number';
}

export function sanitizeArray(arr, guard){
  if(!Array.isArray(arr)) return [];
  return arr.filter(guard);
}
