/* pin.js - simple PIN gate (UX only, not real security) */
"use strict";
import { emit } from './utils.js';

const STORAGE_KEY = 'privacy:pinHash';
let failCount = 0; let lockedUntil = 0;

/** Very simple hash (NOT cryptographically secure) */
function hashPin(pin){
  let h = 0; for(let i=0;i<pin.length;i++){ h = (h*31 + pin.charCodeAt(i))|0; }
  return 'h'+(h>>>0).toString(16);
}

export function checkPin(pin){
  const stored = localStorage.getItem(STORAGE_KEY);
  if(!stored) return true; // no PIN set
  return stored === hashPin(pin);
}

export function setPin(pin){ localStorage.setItem(STORAGE_KEY, hashPin(pin)); }

export function requirePin(){
  const stored = localStorage.getItem(STORAGE_KEY);
  if(!stored) return; // none set
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:#000d;display:flex;align-items:center;justify-content:center;z-index:9999;font-family:system-ui;';
  overlay.innerHTML = `
    <div style="background:#1e1e1e;padding:1.2rem 1.4rem;border:1px solid #333;border-radius:10px;min-width:240px;text-align:center;">
      <h3 style="margin:0 0 .75rem;font-size:1rem;letter-spacing:.05em;">PIN erforderlich</h3>
      <input id="pin-input" type="password" inputmode="numeric" maxlength="4" style="font-size:1.2rem;text-align:center;letter-spacing:.3em;background:#222;border:1px solid #444;border-radius:6px;padding:.5rem .4rem;color:#eee;width:140px;" autofocus />
      <div id="pin-msg" style="margin-top:.6rem;font-size:.7rem;color:#aaa;min-height:1em;"></div>
      <button id="pin-btn" style="margin-top:.8rem;width:100%;background:#3d4aff;color:#fff;border:none;padding:.55rem;border-radius:6px;font-weight:600;cursor:pointer;">Unlock</button>
      <div style="margin-top:.8rem;"><button id="pin-reset" style="background:none;border:none;color:#666;font-size:.55rem;cursor:pointer;">PIN löschen</button></div>
    </div>`;
  document.body.appendChild(overlay);
  const input = overlay.querySelector('#pin-input');
  const btn = overlay.querySelector('#pin-btn');
  const msg = overlay.querySelector('#pin-msg');
  const reset = overlay.querySelector('#pin-reset');

  function attempt(){
    if(Date.now() < lockedUntil){
      msg.textContent = 'Gesperrt, bitte warten…'; return;
    }
    const val = input.value.trim();
    if(val.length!==4){ msg.textContent='4-stellig'; return; }
    if(checkPin(val)){
      overlay.remove(); emit('toast','Entsperrt'); return;
    }
    failCount++; msg.textContent = 'Falsch ('+failCount+')';
    if(failCount>=3){ lockedUntil = Date.now()+30000; msg.textContent='30s gesperrt'; }
    input.value=''; input.focus();
  }
  btn.addEventListener('click', attempt);
  input.addEventListener('keydown', e=>{ if(e.key==='Enter') attempt(); });
  reset.addEventListener('click', ()=>{ localStorage.removeItem(STORAGE_KEY); overlay.remove(); emit('toast','PIN entfernt'); });
}