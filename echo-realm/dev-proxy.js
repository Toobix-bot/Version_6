#!/usr/bin/env node
/** dev-proxy.js - Minimal local proxy to keep Groq API key off the client.
 * Usage: set GROQ_API_KEY env var, then run: node dev-proxy.js
 * Endpoint: POST /api/summarize { text, derived? }
 */
import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';

// --- Minimal .env loader (no external dependency) ---
function loadDotEnv(filePath = '.env'){
  try {
    const full = path.resolve(process.cwd(), filePath);
    if(!fs.existsSync(full)) return; 
    let data = fs.readFileSync(full, 'utf8');
    // Strip BOM if present
    if(data.charCodeAt(0) === 0xFEFF) data = data.slice(1);
    for(const lineRaw of data.split(/\r?\n/)){
      const line = lineRaw.replace(/\uFEFF/g,'');
      if(!line || line.trim().startsWith('#')) continue;
      const eq = line.indexOf('='); if(eq===-1) continue;
      const key = line.slice(0,eq).trim();
      if(!key || process.env[key]) continue; // don't overwrite existing env
      let val = line.slice(eq+1).trim();
      if((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1,-1);
      process.env[key] = val;
    }
  } catch(e){ console.warn('[dotenv] load failed', e); }
}

const DOTENV_FILE = '.env';
loadDotEnv();

const PORT = process.env.PORT || 8787;
const API_KEY = process.env.GROQ_API_KEY || '';
const VALIDATE_ON_START = process.env.GROQ_VALIDATE_ON_START === '1';
const DEBUG = process.env.DEBUG_PROXY === '1';
let validationState = { ok:false, msg:'not validated' };

if(!API_KEY){
  console.error('[proxy] Missing GROQ_API_KEY env variable. Exiting.');
  process.exit(1);
}
if(DEBUG){
  console.log('[proxy] Node version:', process.version);
  console.log('[proxy] Loaded .env from', path.resolve(process.cwd(), DOTENV_FILE));
  console.log('[proxy] Key present?', !!API_KEY, 'length:', API_KEY.length);
}

// ---- Minimal fetch fallback (Node <18) ----
const fetchFn = (typeof fetch !== 'undefined') ? fetch : (url, options={})=> new Promise((resolve, reject)=>{
  try {
    const u = new URL(url);
    const isHttps = u.protocol === 'https:';
    const lib = isHttps ? https : http;
    const req = lib.request({
      hostname: u.hostname,
      port: u.port || (isHttps?443:80),
      path: u.pathname + (u.search||''),
      method: options.method || 'GET',
      headers: options.headers||{}
    }, (res)=>{
      let body = '';
      res.on('data', d=> body += d);
      res.on('end', ()=>{
        resolve({
          ok: res.statusCode >=200 && res.statusCode <300,
            status: res.statusCode,
            async json(){ try { return JSON.parse(body||'null'); } catch{ return null; } },
            text: ()=> Promise.resolve(body)
        });
      });
    });
    req.on('error', reject);
    if(options.body){ req.write(options.body); }
    req.end();
  } catch(e){ reject(e); }
});

async function validateKey(){
  try {
  const r = await fetchFn('https://api.groq.com/openai/v1/models', { headers:{ Authorization:'Bearer '+API_KEY }});
    if(!r.ok){
      validationState = { ok:false, msg:'HTTP '+r.status };
      return;
    }
    const j = await r.json();
    const first = j?.data?.[0]?.id || 'n/a';
    validationState = { ok:true, msg:first };
  } catch(e){
    validationState = { ok:false, msg:String(e.message||e) };
  }
}

if(VALIDATE_ON_START){
  validateKey().then(()=>{
    console.log('[proxy] Validation:', validationState);
  });
}

function json(res, code, obj){
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type':'application/json', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

async function summarize(text, derived){
  const prompt = `Fasse das Tagebuch in 1 kurzen Satz (max 18 Wörter) zusammen.\nText:\n${text}\n` + (derived?.keywords?.length ? 'Keywords: '+derived.keywords.join(', ') : '');
  const body = JSON.stringify({
    model: 'mixtral-8x7b',
    messages: [
      { role: 'system', content: 'Kurz, prägnant, deutsch.'},
      { role: 'user', content: prompt }
    ],
    temperature: 0.4,
    max_tokens: 60
  });
  if(DEBUG) console.log('[proxy] summarize call len(text)=', text.length);
  const resp = await fetchFn('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type':'application/json', 'Authorization':'Bearer '+API_KEY },
    body
  });
  if(!resp.ok){ throw new Error('Groq API error '+resp.status); }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content?.trim() || 'Zusammenfassung fehlgeschlagen';
}

async function aiQuestSuggestions(state){
  const compact = {
    lvl: state?.stats?.level,
    attrs: state?.stats?.attributes
  };
  const prompt = `Erzeuge 3 kurze Questideen für einen Tagebuch-RPG-Charakter.
Level: ${compact.lvl}\nAttribute: ${JSON.stringify(compact.attrs)}\n
Format JSON Array: [{"title":"...","desc":"...","reward":{"xp":Number,"attribute":{"fokus":1}?}}].
Jede title max 6 Wörter, desc max 14 Wörter.`;
  const body = JSON.stringify({
    model: 'mixtral-8x7b',
    messages: [
      { role: 'system', content: 'Du erzeugst sehr kompakte Quest-Ideen.'},
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
    max_tokens: 180
  });
  const resp = await fetchFn('https://api.groq.com/openai/v1/chat/completions', {
    method:'POST', headers:{ 'Content-Type':'application/json', Authorization:'Bearer '+API_KEY }, body
  });
  if(!resp.ok) throw new Error('Groq quest error '+resp.status);
  const data = await resp.json();
  const raw = data.choices?.[0]?.message?.content || '[]';
  try {
    const parsed = JSON.parse(raw.trim());
    if(Array.isArray(parsed)) return parsed.slice(0,3);
  } catch{}
  return [];
}

function cleanPath(u){
  try { return u.replace(/\/+/g,'/').replace(/\/?$/,''); } catch { return u; }
}

const server = http.createServer(async (req,res)=>{
  const originalUrl = req.url || '';
  const p = cleanPath(originalUrl.startsWith('/')? originalUrl : '/'+originalUrl);
  if(req.method==='POST' && (p==='/api/summarize')){
    let raw=''; req.on('data',d=>raw+=d); req.on('end', async ()=>{
      try {
        const parsed = JSON.parse(raw||'{}');
        const out = await summarize(parsed.text||'', parsed.derived);
        json(res,200,{ summary: out });
      } catch(e){ json(res,500,{ error: String(e.message||e) }); }
    });
    return;
  }
  if(req.method==='POST' && req.url==='/api/quests'){
    let raw=''; req.on('data',d=>raw+=d); req.on('end', async ()=>{
      try {
        const parsed = JSON.parse(raw||'{}');
        const list = await aiQuestSuggestions(parsed.state||{});
        json(res,200,{ quests:list });
      } catch(e){ json(res,500,{ error:String(e.message||e) }); }
    });
    return;
  }
  if(req.method==='GET' && (p==='/api/ping' || p==='/ping')){
    json(res,200,{ ok:true, model:'mixtral-8x7b', validated: validationState }); return;
  }
  if(req.method==='GET' && (p==='/api/health' || p==='/health')){
    json(res,200,{ ok: true, keyPresent: !!API_KEY, validated: validationState }); return;
  }
  if(DEBUG){ console.log('[proxy] 404', req.method, originalUrl); }
  json(res,404,{ error:'not found' });
});

server.listen(PORT, ()=>{
  console.log('[proxy] Listening on http://localhost:'+PORT);
  console.log('[proxy] Validation on start:', VALIDATE_ON_START ? 'enabled' : 'disabled (set GROQ_VALIDATE_ON_START=1)');
  // List present env keys (sanitized)
  const exposed = Object.keys(process.env).filter(k=>/^GROQ/i.test(k));
  console.log('[proxy] Env keys present (names only):', exposed);
  // Self-ping after short delay to confirm route
  setTimeout(async ()=>{
    try {
  const r = await fetchFn('http://localhost:'+PORT+'/api/ping');
      console.log('[proxy] Self-ping status', r.status);
    } catch(e){
      console.warn('[proxy] Self-ping failed', e.message||e);
    }
  }, 300);
});

server.on('error', (err)=>{
  console.error('[proxy] Server error:', err.message);
  if(err.code==='EADDRINUSE'){
    console.error('[proxy] Port '+PORT+' belegt. Setze z.B. PORT=8788.');
  }
});
