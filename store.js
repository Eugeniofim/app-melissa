/* =====================================================
   VOYAGES & IMAGES — camada de dados (v1)
   Persistência: localStorage. A troca para Supabase é
   trocar as funções deste arquivo — as telas não mudam.
   ===================================================== */
'use strict';

const DB_KEY = 'vi_db_v1';

/* ---------- modelo ----------
Tour       {id, type, region, name:{pt,en}, desc:{pt,en}, meeting, photo,
            price, priceMode:'pp'|'session', min, max, payPolicy:'full'|'split',
            status:'live'|'draft'|'seasonal', order}
Rule       {id, tourId, weekdays:[0-6], time:'16:30', capacity, from:'2026-11-20', until:'2026-12-23'}
Departure  {id, tourId, date:'2026-12-21', time, capacity}  // avulsas; recorrentes são geradas das Rules
Block      {id, from, until, reason}                        // bloqueio global (férias)
Booking    {id, code, tourId, date, time, name, email, whats, insta, pax, total,
            coupon, discount, policy:'full'|'split',
            payments:[{amount, date, method, kind:'full'|'deposit'|'balance'}],
            status:'confirmed'|'cancelled', createdAt, origin}
Coupon     {code, pct, until, oncePerPerson, uses:[email]}
------------------------------------------------------ */

function _blank() {
  return { tours: [], rules: [], departures: [], blocks: [], bookings: [], coupons: [],
           settings: { lang: 'pt', tutorialClient: true, tutorialAdm: true, admName: 'Melissa',
           whats: '+33682051120', insta: 'melissalsacia', placeholderContact: false } };
}

function _seed() {
  const db = _blank();
  db.demo = true;

  db.tours = [
    { id: 't1', type: 'walk', region: 'alsace',
      name: { pt: 'Marchés de Noël · Colmar', en: 'Christmas Markets · Colmar' },
      desc: { pt: 'No fim de dezembro o sol se põe às 16h45. Vinte minutos depois as luzes acendem sobre as casas de enxaimel e a cidade muda de cor. Duas horas a pé, com parada para vin chaud.',
              en: 'In late December the sun sets at 4:45 pm. Twenty minutes later the lights come on over the half-timbered houses and the town changes colour. Two hours on foot, with a mulled-wine stop.' },
      meeting: 'Colmar · Place Unterlinden, em frente ao museu',
      photo: 'capa.jpg', price: 45, priceMode: 'pp', min: 4, max: 14,
      payPolicy: 'split', status: 'seasonal', order: 1 },
    { id: 't2', type: 'walk', region: 'alsace',
      name: { pt: 'Estrasburgo a pé · Petite France', en: 'Strasbourg on foot · Petite France' },
      desc: { pt: 'A catedral, o relógio astronômico ao meio-dia e os canais da Petite France. Duas horas e meia pelo centro histórico, no seu ritmo.',
              en: 'The cathedral, the astronomical clock at noon and the canals of Petite France. Two and a half hours through the old town, at your pace.' },
      meeting: 'Estrasburgo · Place Gutenberg, ao lado da estátua',
      photo: 'capa.jpg', price: 52, priceMode: 'pp', min: 4, max: 14,
      payPolicy: 'split', status: 'live', order: 2 },
    { id: 't3', type: 'photo', region: 'alsace',
      name: { pt: 'Sessão de fotos · Vinhedos', en: 'Photo session · Vineyards' },
      desc: { pt: 'Uma hora de ensaio entre as vinhas do Grand Cru, na luz do fim de tarde. As fotos editadas chegam em até 5 dias.',
              en: 'A one-hour session among the Grand Cru vines in late-afternoon light. Edited photos within 5 days.' },
      meeting: 'Turckheim · portão da vinícola',
      photo: 'capa.jpg', price: 180, priceMode: 'session', min: 1, max: 4,
      payPolicy: 'full', status: 'live', order: 3 },
    { id: 't4', type: 'walk', region: 'alsace',
      name: { pt: 'Rota dos Vinhos · Riquewihr e Ribeauvillé', en: 'Wine Route · Riquewihr and Ribeauvillé' },
      desc: { pt: 'Dia inteiro por três vilas da Rota dos Vinhos, com degustação em dois domínios. Transporte incluído.',
              en: 'A full day through three villages on the Wine Route, with tastings at two estates. Transport included.' },
      meeting: 'Colmar · estação, saída principal',
      photo: 'capa.jpg', price: 120, priceMode: 'pp', min: 4, max: 8,
      payPolicy: 'split', status: 'live', order: 4 },
    { id: 't5', type: 'bike', region: 'blackforest',
      name: { pt: 'Bike na Floresta Negra', en: 'Black Forest by bike' },
      desc: { pt: 'Meio dia de bicicleta pelas trilhas da Floresta Negra, com parada para café e bolo. Bicicleta incluída.',
              en: 'Half a day cycling the Black Forest trails, with a coffee-and-cake stop. Bike included.' },
      meeting: 'Freiburg · em frente à estação',
      photo: 'capa.jpg', price: 78, priceMode: 'pp', min: 2, max: 8,
      payPolicy: 'full', status: 'draft', order: 5 },
  ];

  db.rules = [
    { id: 'r1', tourId: 't1', weekdays: [2, 4, 6], time: '16:30', capacity: 14, from: '2026-11-24', until: '2026-12-23' },
    { id: 'r2', tourId: 't2', weekdays: [1, 3, 5], time: '10:00', capacity: 14, from: isoToday(), until: addDays(isoToday(), 120) },
    { id: 'r3', tourId: 't3', weekdays: [0, 6],    time: '18:00', capacity: 4,  from: isoToday(), until: addDays(isoToday(), 120) },
    { id: 'r4', tourId: 't4', weekdays: [4],       time: '09:00', capacity: 8,  from: isoToday(), until: addDays(isoToday(), 120) },
  ];

  db.coupons = [
    { code: 'VOLTA10', pct: 10, until: '2026-12-31', oncePerPerson: true, uses: [] },
    { code: 'AMIGO15', pct: 15, until: '2026-12-31', oncePerPerson: true, uses: [] },
  ];

  /* ---- clientes e reservas de exemplo (histórico crível) ---- */
  const people = [
    ['Camille Bernard',  'camille.bernard@email.fr', '+33 6 21 44 55 10', 'camille.bern',  'site'],
    ['Sarah Whitfield',  'sarah.w@email.co.uk',      '+44 7700 900431',   '',              'instagram'],
    ['Markus Klein',     'm.klein@email.de',         '+49 176 5544 221',  'markus.k',      'site'],
    ['Marcos Duarte',    'marcos.duarte@email.com',  '+55 11 98877 6655', 'marcos.duarte', 'friend'],
    ['Élodie Rousseau',  'elodie.r@email.fr',        '+33 6 88 12 34 56', '',              'instagram'],
    ['Hiroshi Mori',     'h.mori@email.jp',          '+81 90 1234 5678',  '',              'agency'],
    ['Ana Sofía Rivas',  'anasofia@email.es',        '+34 611 223 344',   'anasofia.r',    'whatsapp'],
    ['Beatriz Nogueira', 'bia.nog@email.com',        '+55 21 99123 4567', 'bia.nog',       'friend'],
  ];
  const plan = [
    /* [pessoa, passeio, dias atrás, pax, quitado?] */
    [0, 't2', 42, 2, true],  [1, 't2', 35, 2, true],  [2, 't4', 28, 4, true],
    [3, 't3', 21, 2, true],  [4, 't2', 18, 3, true],  [0, 't4', 14, 2, true],
    [5, 't2', 10, 2, true],  [6, 't3',  7, 2, true],  [7, 't2',  4, 4, true],
    [1, 't4', -3, 2, false], [3, 't2', -6, 2, false], [4, 't3', -9, 1, true],
    [7, 't4', -12, 3, false],
  ];
  let n = 0;
  for (const [pi, tourId, back, pax, settled] of plan) {
    const [name, email, whats, insta, origin] = people[pi];
    const x = db.tours.find(z => z.id === tourId);
    const date = addDays(isoToday(), -back);
    const rule = db.rules.find(r => r.tourId === tourId);
    const time = rule ? rule.time : '10:00';
    const total = x.priceMode === 'session' ? x.price : x.price * pax;
    const created = addDays(date, -(7 + (n % 9)));
    const payments = [];
    if (x.payPolicy === 'split') {
      payments.push({ amount: Math.round(total / 2), date: created, method: 'card', kind: 'deposit' });
      if (settled) payments.push({ amount: total - Math.round(total / 2), date: addDays(date, -1), method: 'card', kind: 'balance' });
    } else {
      payments.push({ amount: total, date: created, method: n % 3 === 0 ? 'applepay' : 'card', kind: 'full' });
    }
    db.bookings.push({
      id: 'demo' + (++n), code: 'VI-' + (2100 + n * 37 % 7800),
      tourId, date, time, name, email, whats, insta, pax, total,
      coupon: null, discount: 0, policy: x.payPolicy, payments,
      status: 'confirmed', createdAt: created + 'T10:00:00.000Z', origin,
    });
  }
  return db;
}

/* apaga tudo — a Melissa começa do zero */
function clearAll() {
  DB = _blank();
  DB.demo = false;
  save();
}
function restoreDemo() { DB = _seed(); save(); }

let DB = null;
function load() {
  try { DB = JSON.parse(localStorage.getItem(DB_KEY)) || null; } catch (e) { DB = null; }
  if (!DB || !DB.tours) { DB = _seed(); save(); }
  if (DB.settings.whats === undefined || DB.settings.whats === '+33612345678') {
    DB.settings.whats = '+33682051120'; DB.settings.insta = 'melissalsacia';
    DB.settings.placeholderContact = false; save();
  }
  return DB;
}
function save() {
  localStorage.setItem(DB_KEY, JSON.stringify(DB));
  if (typeof cloudPushState === 'function') cloudPushState();
}
function resetDemo() { DB = _seed(); save(); }

const uid = () => Math.random().toString(36).slice(2, 9);
const bookCode = () => 'VI-' + Math.floor(1000 + Math.random() * 9000);

/* ---------- passeios ---------- */
const Tours = {
  all()      { return [...DB.tours].sort((a, b) => a.order - b.order); },
  live()     { return Tours.all().filter(t => t.status !== 'draft'); },
  get(id)    { return DB.tours.find(t => t.id === id); },
  create(t)  { t.id = uid(); t.order = DB.tours.length + 1; DB.tours.push(t); save(); return t; },
  update(id, patch) { Object.assign(Tours.get(id), patch); save(); },
  duplicate(id) {
    const src = Tours.get(id); if (!src) return null;
    const cp = JSON.parse(JSON.stringify(src));
    cp.id = uid(); cp.order = DB.tours.length + 1; cp.status = 'draft';
    cp.name = { pt: src.name.pt + ' (cópia)', en: src.name.en + ' (copy)' };
    DB.tours.push(cp); save(); return cp;
  },
  remove(id) {
    DB.tours = DB.tours.filter(t => t.id !== id);
    DB.rules = DB.rules.filter(r => r.tourId !== id);
    DB.departures = DB.departures.filter(d => d.tourId !== id);
    save();
  },
  futureBookings(id) {
    const today = isoToday();
    return DB.bookings.filter(b => b.tourId === id && b.status === 'confirmed' && b.date >= today);
  },
};

/* ---------- calendário ---------- */
function isoToday() { return new Date().toISOString().slice(0, 10); }
function addDays(iso, n) { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }

const Cal = {
  rulesFor(tourId) { return DB.rules.filter(r => r.tourId === tourId); },
  addRule(r) { r.id = uid(); DB.rules.push(r); save(); return r; },
  removeRule(id) { DB.rules = DB.rules.filter(r => r.id !== id); save(); },
  addDeparture(d) { d.id = uid(); DB.departures.push(d); save(); return d; },
  removeDeparture(id) { DB.departures = DB.departures.filter(d => d.id !== id); save(); },
  addBlock(b) { b.id = uid(); DB.blocks.push(b); save(); return b; },
  removeBlock(id) { DB.blocks = DB.blocks.filter(x => x.id !== id); save(); },
  blocked(date) { return DB.blocks.some(b => date >= b.from && date <= b.until); },

  /* todas as saídas de um passeio num intervalo: regras expandidas + avulsas − bloqueios */
  departures(tourId, fromIso, toIso) {
    const out = [];
    for (const r of Cal.rulesFor(tourId)) {
      let d = fromIso < r.from ? r.from : fromIso;
      const end = toIso < r.until ? toIso : r.until;
      while (d <= end) {
        const wd = new Date(d + 'T12:00:00').getDay();
        if (r.weekdays.includes(wd) && !Cal.blocked(d)) {
          out.push({ tourId, date: d, time: r.time, capacity: r.capacity, ruleId: r.id });
        }
        d = addDays(d, 1);
      }
    }
    for (const dep of DB.departures.filter(x => x.tourId === tourId)) {
      if (dep.date >= fromIso && dep.date <= toIso && !Cal.blocked(dep.date)) out.push(dep);
    }
    out.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    return out;
  },

  seatsLeft(tourId, date, time, capacity) {
    const taken = DB.bookings
      .filter(b => b.tourId === tourId && b.date === date && b.time === time && b.status === 'confirmed')
      .reduce((s, b) => s + b.pax, 0);
    return Math.max(0, capacity - taken);
  },
};

/* ---------- cupons ---------- */
const Coupons = {
  all() { return DB.coupons; },
  create(c) { DB.coupons.push(c); save(); },
  remove(code) { DB.coupons = DB.coupons.filter(c => c.code !== code); save(); },
  validate(code, email) {
    const c = DB.coupons.find(x => x.code.toUpperCase() === String(code).toUpperCase());
    if (!c) return { ok: false, reason: 'notfound' };
    if (c.until && isoToday() > c.until) return { ok: false, reason: 'expired' };
    if (c.oncePerPerson && email && c.uses.includes(email)) return { ok: false, reason: 'used' };
    return { ok: true, coupon: c };
  },
  consume(code, email) {
    const c = DB.coupons.find(x => x.code === code);
    if (c && email && !c.uses.includes(email)) { c.uses.push(email); save(); }
  },
};

/* ---------- reservas e pagamentos ---------- */
const Bookings = {
  all() { return [...DB.bookings].sort((a, b) => b.createdAt.localeCompare(a.createdAt)); },
  get(id) { return DB.bookings.find(b => b.id === id); },
  byCode(code) { return DB.bookings.find(b => b.code === code); },

  create({ tourId, date, time, name, email, whats, insta, pax, coupon, policy, origin }) {
    const tour = Tours.get(tourId);
    const base = tour.priceMode === 'session' ? tour.price : tour.price * pax;
    let discount = 0, couponCode = null;
    if (coupon) {
      const v = Coupons.validate(coupon, email);
      if (v.ok) { discount = Math.round(base * v.coupon.pct) / 100 * 1; discount = Math.round(base * v.coupon.pct / 100); couponCode = v.coupon.code; }
    }
    const total = base - discount;
    const b = {
      id: uid(), code: bookCode(), tourId, date, time,
      name, email, whats, insta: insta || '', pax, total,
      coupon: couponCode, discount, policy,
      payments: [], status: 'confirmed',
      createdAt: new Date().toISOString(), origin: origin || 'site',
    };
    /* pagamento simulado — aqui entra o Stripe */
    const first = policy === 'split' ? Math.round(total / 2) : total;
    b.payments.push({ amount: first, date: isoToday(), method: 'card',
                      kind: policy === 'split' ? 'deposit' : 'full' });
    DB.bookings.push(b);
    if (couponCode) Coupons.consume(couponCode, email);
    localStorage.setItem(DB_KEY, JSON.stringify(DB));
    if (typeof cloudPushBooking === 'function') cloudPushBooking(b);
    if (couponCode && typeof cloudPushState === 'function') cloudPushState();
    return b;
  },

  paid(b)   { return b.payments.reduce((s, p) => s + p.amount, 0); },
  due(b)    { return Math.max(0, b.total - Bookings.paid(b)); },
  dueDate(b){ return addDays(b.date, -1); },
  payBalance(id, method) {
    const b = Bookings.get(id); if (!b) return;
    const due = Bookings.due(b); if (due <= 0) return;
    b.payments.push({ amount: due, date: isoToday(), method: method || 'card', kind: 'balance' });
    localStorage.setItem(DB_KEY, JSON.stringify(DB));
    if (typeof cloudUpdateBooking === 'function') cloudUpdateBooking(b);
  },
  cancel(id) { const b = Bookings.get(id); if (b) { b.status = 'cancelled';
    localStorage.setItem(DB_KEY, JSON.stringify(DB));
    if (typeof cloudUpdateBooking === 'function') cloudUpdateBooking(b); } },

  /* extrato: uma linha por PAGAMENTO (é o que o contador quer) */
  statement(fromIso, toIso) {
    const rows = [];
    for (const b of DB.bookings) {
      for (const p of b.payments) {
        if (p.date >= fromIso && p.date <= toIso) {
          rows.push({ date: p.date, client: b.name, tourId: b.tourId,
                      kind: p.kind, method: p.method, amount: p.amount, code: b.code });
        }
      }
    }
    rows.sort((a, b) => a.date.localeCompare(b.date));
    return rows;
  },
};

load();

/* ---------- clientes (derivados das reservas) ---------- */
const Clients = {
  all() {
    const map = new Map();
    for (const b of DB.bookings) {
      if (b.status === 'cancelled') continue;
      const key = (b.email || b.whats || b.name).toLowerCase();
      const c = map.get(key) || { name: b.name, email: b.email, whats: b.whats, insta: b.insta,
                                  tours: 0, spent: 0, last: '', origins: new Set() };
      c.tours += 1;
      c.spent += Bookings.paid(b);
      if (b.date > c.last) c.last = b.date;
      if (b.origin) c.origins.add(b.origin);
      if (!c.insta && b.insta) c.insta = b.insta;
      map.set(key, c);
    }
    return [...map.values()].sort((a, b) => b.spent - a.spent);
  },
};

/* ---------- relatórios ---------- */
const Reports = {
  /* receita por mês do ano corrente */
  byMonth(year) {
    const out = Array(12).fill(0);
    for (const b of DB.bookings) {
      for (const p of b.payments) {
        if (p.date.slice(0, 4) === String(year)) out[+p.date.slice(5, 7) - 1] += p.amount;
      }
    }
    return out;
  },
  /* receita das últimas 8 semanas */
  byWeek(weeks = 8) {
    const out = [];
    let end = isoToday();
    for (let i = 0; i < weeks; i++) {
      const start = addDays(end, -6);
      let sum = 0;
      for (const b of DB.bookings) {
        for (const p of b.payments) if (p.date >= start && p.date <= end) sum += p.amount;
      }
      out.unshift({ label: start.slice(8) + '/' + start.slice(5, 7), value: sum });
      end = addDays(start, -1);
    }
    return out;
  },
  /* desempenho por passeio no intervalo */
  byTour(fromIso, toIso) {
    return Tours.all().map(x => {
      const bs = DB.bookings.filter(b => b.tourId === x.id && b.status !== 'cancelled'
                                    && b.date >= fromIso && b.date <= toIso);
      const deps = new Set(bs.map(b => b.date + b.time));
      const pax = bs.reduce((s, b) => s + b.pax, 0);
      const revenue = bs.reduce((s, b) => s + Bookings.paid(b), 0);
      const seats = deps.size * (x.max || 1);
      return { tour: x, departures: deps.size, pax, revenue,
               occupancy: seats ? Math.round(pax / seats * 100) : 0 };
    }).filter(r => r.departures > 0 || r.revenue > 0);
  },
  /* de onde vieram as reservas */
  byOrigin(fromIso, toIso) {
    const map = {};
    let total = 0;
    for (const b of DB.bookings) {
      if (b.status === 'cancelled' || b.date < fromIso || b.date > toIso) continue;
      const o = b.origin || 'site';
      map[o] = (map[o] || 0) + 1; total++;
    }
    return Object.entries(map)
      .map(([k, n]) => ({ origin: k, n, pct: total ? Math.round(n / total * 100) : 0 }))
      .sort((a, b) => b.n - a.n);
  },
  totals(fromIso, toIso) {
    const bs = DB.bookings.filter(b => b.status !== 'cancelled' && b.date >= fromIso && b.date <= toIso);
    const revenue = DB.bookings.reduce((s, b) =>
      s + b.payments.filter(p => p.date >= fromIso && p.date <= toIso).reduce((t, p) => t + p.amount, 0), 0);
    const pax = bs.reduce((s, b) => s + b.pax, 0);
    const deps = new Set(bs.map(b => b.tourId + b.date + b.time)).size;
    const due = bs.reduce((s, b) => s + Bookings.due(b), 0);
    return { revenue, pax, deps, bookings: bs.length, due,
             ticket: bs.length ? Math.round(revenue / pax || 0) : 0 };
  },
};
