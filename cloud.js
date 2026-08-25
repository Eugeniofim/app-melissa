/* =====================================================
   VOYAGES & IMAGES — nuvem (Supabase)
   O que sincroniza:
   - appstate  → passeios, regras, datas, cupons, ajustes (1 doc)
   - bookings  → reservas (linha a linha, à prova de corrida)
   Offline: tudo continua funcionando; fila local reenvia.
   ===================================================== */
'use strict';

const SUPA_URL = 'https://kqphzdowtjcewazikzyn.supabase.co';
const SUPA_KEY = 'sb_publishable_oH2MHKj7n9luEj9tnp6VBA_CetadqRi';
const QUEUE_KEY = 'vi_queue_v1';

function supaFetch(path, opts = {}) {
  /* logada, fala como ela; deslogado, fala como visitante */
  const tok = (typeof authToken === 'function' && authToken()) || SUPA_KEY;
  return fetch(SUPA_URL + '/rest/v1/' + path, {
    ...opts,
    headers: {
      apikey: SUPA_KEY,
      Authorization: 'Bearer ' + tok,
      'Content-Type': 'application/json',
      Prefer: opts.method === 'POST' ? 'resolution=merge-duplicates' : 'return=minimal',
      ...(opts.headers || {}),
    },
  });
}

/* ---------- fila offline ---------- */
function qAll() { try { return JSON.parse(localStorage.getItem(QUEUE_KEY)) || []; } catch (e) { return []; } }
function qPush(job) { const q = qAll(); q.push(job); localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); }
async function qFlush() {
  const q = qAll(); if (!q.length) return;
  const rest = [];
  for (const job of q) {
    try {
      const r = await supaFetch(job.path, { method: job.method, body: JSON.stringify(job.body) });
      if (!r.ok && r.status !== 409) rest.push(job);
    } catch (e) { rest.push(job); }
  }
  localStorage.setItem(QUEUE_KEY, JSON.stringify(rest));
}

/* ---------- estado (tudo menos reservas) ---------- */
function statePayload() {
  return { tours: DB.tours, rules: DB.rules, departures: DB.departures,
           blocks: DB.blocks, coupons: DB.coupons, settings: DB.settings };
}
/* A trancada do banco devolve HTTP 200 mesmo quando descarta a escrita:
   quem não é a dona simplesmente não altera nenhuma linha. Se a gente
   confiar no 200, a Melissa vê "salvo" e perde o trabalho. Por isso
   pedimos o registro de volta e contamos as linhas. */
let cloudRejected = false;
async function patchConta(path, body) {
  const r = await supaFetch(path, {
    method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(body),
  });
  if (!r.ok) return { ok: false, linhas: 0 };
  let linhas = 0;
  try { const j = await r.json(); linhas = Array.isArray(j) ? j.length : 1; } catch (e) { linhas = 1; }
  return { ok: true, linhas };
}

let pushT = null;
function cloudPushState() {
  clearTimeout(pushT);
  pushT = setTimeout(async () => {
    const body = { data: statePayload(), updated_at: new Date().toISOString() };
    try {
      const r = await patchConta('appstate?id=eq.1', body);
      if (!r.ok) return qPush({ path: 'appstate?id=eq.1', method: 'PATCH', body });
      if (r.linhas === 0) {                 /* o banco recusou em silêncio */
        cloudRejected = true;
        if (typeof onCloudRejected === 'function') onCloudRejected();
      } else cloudRejected = false;
    } catch (e) { qPush({ path: 'appstate?id=eq.1', method: 'PATCH', body }); }
  }, 700);
}

/* ---------- reservas ---------- */
async function cloudPushBooking(b) {
  const body = { id: b.id, data: b };
  try {
    const r = await supaFetch('bookings', { method: 'POST', body: JSON.stringify(body) });
    if (!r.ok) qPush({ path: 'bookings', method: 'POST', body });
  } catch (e) { qPush({ path: 'bookings', method: 'POST', body }); }
}
async function cloudUpdateBooking(b) {
  const body = { data: b };
  const path = 'bookings?id=eq.' + encodeURIComponent(b.id);
  try {
    const r = await patchConta(path, body);
    if (!r.ok) return qPush({ path, method: 'PATCH', body });
    if (r.linhas === 0) {
      cloudRejected = true;
      if (typeof onCloudRejected === 'function') onCloudRejected();
    }
  } catch (e) { qPush({ path, method: 'PATCH', body }); }
}

/* ---------- puxar tudo ---------- */
let lastBookingIds = null;
async function cloudPull() {
  try {
    await qFlush();
    const logged = typeof isLoggedIn === 'function' && isLoggedIn();
    if (logged && typeof authEnsure === 'function') await authEnsure();
    const [stR, bkR, scR] = await Promise.all([
      supaFetch('appstate?id=eq.1&select=data,updated_at', { headers: { Prefer: '' } }),
      logged ? supaFetch('bookings?select=data&order=created_at.asc', { headers: { Prefer: '' } })
             : Promise.resolve({ ok: true, json: async () => [] }),
      /* visitante só enxerga a contagem de lugares, nunca os dados de quem reservou */
      logged ? Promise.resolve({ ok: true, json: async () => [] })
             : supaFetch('seat_counts?select=*', { headers: { Prefer: '' } }),
    ]);
    if (!stR.ok || !bkR.ok) return { ok: false };
    const st = (await stR.json())[0];
    const bk = (await bkR.json()).map(r => r.data);
    if (!logged && scR.ok) {
      try { DB.seatCounts = (await scR.json()).map(r =>
        ({ tourId: r.tour_id, date: r.date, time: r.time, pax: +r.pax })); } catch (e) {}
    }

    const cloudEmpty = !st || !st.data || !st.data.tours || !st.data.tours.length;
    if (cloudEmpty) {
      /* primeira vez: este aparelho vira a origem */
      cloudPushState();
      for (const b of DB.bookings) cloudPushBooking(b);
      return { ok: true, bootstrap: true };
    }

    /* nuvem manda */
    const keepLang = DB.settings.lang;
    Object.assign(DB, {
      tours: st.data.tours || [], rules: st.data.rules || [],
      departures: st.data.departures || [], blocks: st.data.blocks || [],
      coupons: st.data.coupons || [],
      /* a nuvem pode ser mais antiga que o app: completa o que faltar */
      settings: fillSettings({ ...st.data.settings, lang: keepLang,
                  tutorialClient: DB.settings.tutorialClient, tutorialAdm: DB.settings.tutorialAdm }),
    });
    /* reservas: nuvem + locais que ainda não subiram */
    if (logged) {
      const cloudIds = new Set(bk.map(b => b.id));
      const localOnly = DB.bookings.filter(b => !cloudIds.has(b.id));
      DB.bookings = bk.concat(localOnly);
    }
    localStorage.setItem(DB_KEY, JSON.stringify(DB));

    /* aviso de reserva nova (para a Melissa, no ADM) */
    let fresh = [];
    if (lastBookingIds) fresh = bk.filter(b => !lastBookingIds.has(b.id));
    lastBookingIds = new Set(bk.map(b => b.id));
    return { ok: true, fresh };
  } catch (e) { return { ok: false }; }
}

/* ---------- relógio de sincronização ---------- */
function cloudStart(onChange) {
  let booted = false;
  const tick = async () => {
    const r = await cloudPull();
    if (r.ok) { booted = true; onChange && onChange(r); }
    return r.ok;
  };
  /* primeira sincronização insiste até conseguir (banco frio, rede lenta) */
  (async () => {
    for (let wait = 1500; !booted; wait = Math.min(wait * 2, 15000)) {
      if (await tick()) break;
      await new Promise(res => setTimeout(res, wait));
    }
  })();
  setInterval(tick, 25000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
  addEventListener('online', tick);
}
