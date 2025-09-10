/* aiProxy.js - AI strategy hitting local dev proxy (keeps key server-side) */
"use strict";
/**
 * Creates a proxy-backed AI interface mirroring summarizeEntry API.
 * @param {{ baseUrl?: string }} [opts]
 */
export function createProxyAI(opts={}){
  const base = opts.baseUrl || 'http://localhost:8787';
  return {
    async summarizeEntry(text, derived){
      try {
        const resp = await fetch(base+'/api/summarize', {
          method:'POST', headers:{ 'Content-Type':'application/json' },
          body: JSON.stringify({ text, derived })
        });
        if(!resp.ok) throw new Error('Proxy '+resp.status);
        const j = await resp.json();
        return j.summary || 'Proxy leer';
      } catch(e){
        return (text.trim().split(/\s+/).length||0)+ ' Wörter';
      }
    },
    async suggestQuests(state){
      try {
        const resp = await fetch(base+'/api/quests', {
          method:'POST', headers:{ 'Content-Type':'application/json' },
          body: JSON.stringify({ state })
        });
        if(!resp.ok) throw new Error('Proxy quests '+resp.status);
        const j = await resp.json();
        return Array.isArray(j.quests)? j.quests: [];
      } catch(e){ return []; }
    },
    dispose(){}
  };
}