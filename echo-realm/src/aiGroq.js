/* aiGroq.js - runtime Groq integration (keys never persisted)
 * This module is optional and only loaded dynamically when user supplies an API key.
 * Keep the API key in memory only. Do NOT store in LocalStorage.
 */
"use strict";

/**
 * Factory for a Groq-backed AI strategy.
 * Expects a fetch-compatible Groq REST endpoint.
 * @param {string} apiKey
 * @param {{ model?: string }} opts
 */
export function createGroqAI(apiKey, opts={}){
  let internalKey = apiKey; // kept only in memory
  const model = opts.model || 'mixtral-8x7b';

  async function groqRequest(body){
    if(!internalKey) throw new Error('Groq key cleared');
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':'application/json',
        'Authorization': 'Bearer '+internalKey
      },
      body: JSON.stringify(body)
    });
    if(!res.ok) throw new Error('Groq API error '+res.status);
    return res.json();
  }

  return {
    /** @param {string} text @param {{xpGained:number,statDiff:Record<string,number>,keywords:string[]}} [derived]*/
    async summarizeEntry(text, derived){
      const prompt = `Fasse das Tagebuch in 1 kurzen Satz (max 18 Wörter) zusammen. Text:\n${text}\n` + (derived? `Keywords: ${(derived.keywords||[]).join(', ')}`:'');
      try {
        const data = await groqRequest({
          model,
          messages: [
            { role:'system', content:'Kurz, prägnant, deutsch.' },
            { role:'user', content: prompt }
          ],
          temperature: 0.4,
          max_tokens: 60
        });
        return data.choices?.[0]?.message?.content?.trim() || 'Zusammenfassung fehlgeschlagen';
      } catch(e){
        console.warn('Groq summarize fallback', e);
        return (text.trim().split(/\s+/).length||0)+ ' Wörter';
      }
    },
    /** @param {any} state */
  async suggestQuests(state){
      // Could call Groq for creative quests; keep local for now.
      return [];
  },
  dispose(){ internalKey=''; }
  };
}
