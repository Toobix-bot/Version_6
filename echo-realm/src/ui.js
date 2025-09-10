/* ui.js - Render Funktionen */
"use strict";
import { getState, exportState, importState, saveState } from './state.js';
import { on, formatXP, emit } from './utils.js';

export function initUI(){
  on('state:changed', ()=>{
    renderStatus();
    renderEntries();
    renderQuests();
    renderBase();
  });
  on('toast', showToast);
  renderStatus();
  renderEntries();
  renderQuests();
  renderBase();
  renderHistory();
  injectVersion();
  renderHistory();
}

export function renderStatus(){
  const st = getState();
  const el = document.getElementById('status-panel');
  if(!el) return;
  const pct = Math.min(100, Math.round((st.stats.xp / st.stats.xpToNext)*100));
  el.innerHTML = `
    <div class="status-top">
      <strong>Level ${st.stats.level}</strong> – ${formatXP(st.stats.xp)} / ${st.stats.xpToNext}
      <div class="xp-bar"><span style="width:${pct}%"></span></div>
    </div>
    <div class="status-attributes">
      ${Object.entries(st.stats.attributes).map(([k,v])=>`<div class="attr"><strong>${k}</strong><span>${v}</span></div>`).join('')}
    </div>
    <div class="status-misc">
      <span class="badge">Streak: ${st.profile.streakCleanDays}</span>
      ${st.stats.buffs.map(b=>`<span class="badge">+${b}</span>`).join('')}
      ${st.stats.debuffs.map(d=>`<span class="badge">-${d}</span>`).join('')}
    </div>
  `;
}

export function renderEntries(){
  const st = getState();
  const list = document.getElementById('entry-log'); if(!list) return;
  const sorted = [...st.entries].sort((a,b)=> b.date.localeCompare(a.date)).slice(0,30);
  list.innerHTML = sorted.map(e=>{
    const sum = e.derived ? `XP +${e.derived.xpGained}` : '';
    return `<li><strong>${e.date}</strong> – ${escapeHTML(e.text.slice(0,80))}${e.text.length>80?'…':''}<br><small>${sum}</small></li>`;
  }).join('');
}

export function renderQuests(){
  const st = getState();
  const list = document.getElementById('quest-list'); if(!list) return;
  list.innerHTML = st.quests.slice(-50).reverse().map(q=>{
    return `<li data-id="${q.id}" class="quest quest-${q.status}">
      <strong>${escapeHTML(q.title)}</strong> <span class="badge">${q.status}</span><br>
      <small>${escapeHTML(q.desc)}</small><br>
      <small>Reward: ${q.reward.xp} XP${q.reward.attribute? ' + '+Object.entries(q.reward.attribute).map(([k,v])=>`${k}+${v}`).join(', ') : ''}</small>
      <div class="quest-actions">
        ${q.status==='open'? `<button data-action="done">Done</button><button data-action="skip">Skip</button>`: ''}
      </div>
    </li>`;
  }).join('');
}

export function renderBase(){
  const st = getState();
  const el = document.getElementById('base-view'); if(!el) return;
  el.innerHTML = `<div class="base-tier">${st.base.name} (Tier ${st.base.tier})</div><div>Slots: ${st.base.slots}</div>`;
}

export function renderHistory(){
  const st = getState();
  const list = document.getElementById('history-log'); if(!list) return;
  const active = document.querySelector('.hf-btn.active');
  const filter = active?.getAttribute('data-hfilter') || 'ALL';
  const rows = st.history.slice(-300).reverse().filter(h=>{
    if(filter==='ALL') return true;
    if(filter==='ENTRY') return h.type.startsWith('ENTRY');
    if(filter==='QUEST') return h.type.startsWith('QUEST');
    if(filter==='LEVEL_UP') return h.type==='LEVEL_UP';
    return true;
  });
  list.innerHTML = rows.map(r=>`<li><strong>${new Date(r.ts).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</strong> ${r.type.replace('_',' ')} – ${r.summary||''}</li>`).join('');
}

function injectVersion(){
  const el = document.getElementById('app-version'); if(el) el.textContent = '0.1';
  const histFilters = document.querySelector('.history-filters');
  histFilters?.addEventListener('click', e=>{
    const t = e.target; if(!(t instanceof HTMLElement)) return;
    if(!t.matches('[data-hfilter]')) return;
    document.querySelectorAll('.hf-btn').forEach(b=>b.classList.remove('active'));
    t.classList.add('active');
    renderHistory();
  });
}

export function handleExport(){
  const blob = new Blob([exportState()], { type:'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'echo-realm-export.json'; a.click();
  setTimeout(()=> URL.revokeObjectURL(url), 2000);
}

export function handleImport(file){
  const reader = new FileReader();
  reader.onload = e=>{
    const ok = importState(String(e.target?.result||''));
    emit('toast', ok? 'Import erfolgreich' : 'Import fehlgeschlagen');
  };
  reader.readAsText(file);
}

function showToast(msg){
  const cont = document.getElementById('toast-container'); if(!cont) return;
  const div = document.createElement('div');
  div.className = 'toast';
  div.textContent = msg;
  cont.appendChild(div);
  setTimeout(()=>{ div.remove(); }, 4000);
}

function escapeHTML(str){ return str.replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;' }[c])); }
