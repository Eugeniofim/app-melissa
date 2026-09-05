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
  return { tours: [], rules: [], departures: [], blocks: [], bookings: [], coupons: [], seatCounts: [],
           settings: { lang: 'pt', tutorialClient: true, tutorialAdm: true, admName: 'Melissa',
           whats: '+33682051120', insta: 'melissalsacia', placeholderContact: false,
           /* quem ela é — o cliente vê antes de reservar */
           photo: '', badge: 'Guide Conférencier · Guides d\'Alsace',
           base: 'Colmar, Alsácia',
           /* como o cliente paga. Vazio ate ela preencher no ADM — e enquanto
              estiver vazio a tela diz a verdade: ela passa os dados no WhatsApp. */
           /* pixName e pixCity sao exigidos pelo padrao do BR Code:
              sem eles o banco recusa o codigo. */
           pixKey: '', pixName: '', pixCity: '', iban: '', ibanName: '', payNote: '',
           /* para onde vai o aviso de reserva nova. Vazio = ela ainda nao
              preencheu; quem manda o e-mail e o robo, fora do navegador. */
           admEmail: '',
           /* Confirmacao por e-mail PARA O CLIENTE. Sai sozinha quando a
              reserva tem pelo menos metade paga — cartao (o Stripe grava)
              ou Pix (ela marca "recebi" no painel). Regra da Melissa
              (03/09/2026): o cliente recebe UMA mensagem, e so quando pagou. */
           avisarClientes: true,
           /* cartao pelo Stripe. Desligado ate a gente provar a cobranca
              de ponta a ponta com dinheiro de verdade. */
           stripeAtivo: false,
           /* A voz dela dentro do e-mail de confirmacao. Vazio = texto padrao.
              Ela edita a abertura e o recado final; os dados da reserva e a
              nota do saldo ficam fixos, para nao sumirem sem querer. */
           emailConfIntro:   { pt: '', en: '' },
           emailConfPS:      { pt: '', en: '' },
           /* Nao existe mais cotacao euro->real no app: a Melissa pediu para
              tirar (03/09/2026). O preco e em euro e o Pix vai sem valor —
              o cliente digita o equivalente em reais pela cotacao do banco. */
           /* a primeira tela: foto de fundo e a frase. Vazio = usa o padrao. */
           homePhoto: '', homeText: { pt: '', en: '' },
           bio: {
             pt: 'Sou brasileira e vivo na Alsácia. Sou guia-conferencista credenciada e fotógrafa — e as duas coisas andam juntas: enquanto conto a história de cada rua, vou registrando você nela.\n\nCaminho por Colmar, Estrasburgo, a Rota dos Vinhos e a Floresta Negra. Em português ou inglês, sem grupo de quarenta pessoas atrás de uma sombrinha.\n\nNo fim do passeio você leva as fotos. Sem cobrança extra, sem pose forçada.',
             en: 'I am Brazilian and I live in Alsace. I am a licensed guide-lecturer and a photographer — and the two go together: while I tell you the story of each street, I am photographing you in it.\n\nI walk Colmar, Strasbourg, the Wine Route and the Black Forest. In Portuguese or English, with no group of forty behind an umbrella.\n\nYou take the photos home. No extra charge, no forced poses.'
           } } };
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
      duration: '2h', distance: '1,8 km', effort: 'easy',
      includes: { pt: ['Guia credenciada em português', 'Um vin chaud na parada', 'As fotos do passeio, editadas'],
                  en: ['Licensed guide in Portuguese', 'One mulled wine at the stop', 'Edited photos from the walk'] },
      notIncludes: { pt: ['Compras nos mercados', 'Entrada em museus'], en: ['Purchases at the markets', 'Museum tickets'] },
      stops: [
        { t: '17h00', ph: 'p-t1-1.jpg', lat: 48.0770, lng: 7.3577,
          n: { pt: 'Grand Rue e a Maison Pfister', en: 'Grand Rue and Maison Pfister' },
          d: { pt: 'Começamos pela casa mais fotografada de Colmar — 1537, e o burguês que a construiu nunca foi nobre. Aqui eu conto por que a cidade ficou assim.',
               en: 'We start at the most photographed house in Colmar — 1537, built by a merchant who was never a noble. Here I explain why the town looks the way it does.' } },
        { t: '17h40', ph: 'p-t1-2.jpg', lat: 48.0783, lng: 7.3568,
          n: { pt: 'Marché des Dominicains', en: 'Dominicains market' },
          d: { pt: 'O mercado dentro da praça do convento gótico. É o mais antigo dos cinco e o único coberto pelas árvores.',
               en: 'The market inside the Gothic convent square. The oldest of the five, and the only one under the trees.' } },
        { t: '18h20', ph: 'p-t1-3.jpg', lat: 48.0733, lng: 7.3583,
          n: { pt: 'Petite Venise, quando as luzes acendem', en: 'Petite Venise, as the lights come on' },
          d: { pt: 'A parte do passeio em que ninguém fala. O canal reflete as luzes e as casas dobram de tamanho. É aqui que eu faço as suas fotos.',
               en: 'The part of the walk where nobody talks. The canal doubles the lights and the houses. This is where I take your photos.' } },
        { t: '19h00', ph: 'p-t1-4.jpg', lat: 48.0759, lng: 7.3578,
          n: { pt: 'Koïfhus e o vin chaud', en: 'Koïfhus and the mulled wine' },
          d: { pt: 'A antiga alfândega, de telhado esmaltado. Terminamos com um vin chaud na mão, e eu fico mais um pouco se você quiser dicas de onde jantar.',
               en: 'The old customs house with its glazed roof. We finish with a mulled wine in hand, and I stay on if you want dinner tips.' } },
      ],
      photo: 'tour-natal.jpg', price: 45, priceMode: 'pp', min: 4, max: 14,
      payPolicy: 'split', status: 'seasonal', order: 1 },
    { id: 't2', type: 'walk', region: 'alsace',
      name: { pt: 'Estrasburgo a pé · Petite France', en: 'Strasbourg on foot · Petite France' },
      desc: { pt: 'A catedral, o relógio astronômico ao meio-dia e os canais da Petite France. Duas horas e meia pelo centro histórico, no seu ritmo.',
              en: 'The cathedral, the astronomical clock at noon and the canals of Petite France. Two and a half hours through the old town, at your pace.' },
      meeting: 'Estrasburgo · Place Gutenberg, ao lado da estátua',
      duration: '2h30', distance: '3 km', effort: 'easy',
      includes: { pt: ['Guia credenciada em português', 'As fotos do passeio, editadas'],
                  en: ['Licensed guide in Portuguese', 'Edited photos from the walk'] },
      notIncludes: { pt: ['Subida à plataforma da catedral', 'Passeio de barco'], en: ['Cathedral platform ticket', 'Boat tour'] },
      stops: [
        { t: '10h00', ph: 'p-t2-1.jpg', lat: 48.5817, lng: 7.7486,
          n: { pt: 'A catedral pela Rue Mercière', en: 'The cathedral from Rue Mercière' },
          d: { pt: 'A rua foi desenhada para você virar a esquina e levar um susto. Funciona há 600 anos.',
               en: 'The street was laid out so you turn the corner and gasp. It has worked for 600 years.' } },
        { t: '10h30', ph: 'p-t2-2.jpg', lat: 48.5819, lng: 7.7509,
          n: { pt: 'O relógio astronômico', en: 'The astronomical clock' },
          d: { pt: 'Ao meio-dia e meia os apóstolos desfilam e o galo canta três vezes. Chegamos antes para pegar lugar.',
               en: 'At 12:30 the apostles parade and the cockerel crows three times. We arrive early to get a spot.' } },
        { t: '11h20', ph: 'p-t2-3.jpg', lat: 48.5800, lng: 7.7397,
          n: { pt: 'Ponts Couverts', en: 'Ponts Couverts' },
          d: { pt: 'As três torres são o que sobrou da muralha medieval. Os telhados que dão nome às pontes já não existem — eu explico por quê.',
               en: 'The three towers are what is left of the medieval wall. The roofs that named the bridges are gone — I explain why.' } },
        { t: '11h50', ph: 'p-t2-4.jpg', lat: 48.5797, lng: 7.7378,
          n: { pt: 'Terraço do Barrage Vauban', en: 'Barrage Vauban terrace' },
          d: { pt: 'A melhor vista da cidade, e é de graça. Terminamos aqui, com a Petite France inteira na sua frente.',
               en: 'The best view in town, and it is free. We finish here, with all of Petite France in front of you.' } },
      ],
      photo: 'tour-estrasburgo.jpg', price: 52, priceMode: 'pp', min: 4, max: 14,
      payPolicy: 'split', status: 'live', order: 2 },
    { id: 't3', type: 'photo', region: 'alsace',
      name: { pt: 'Sessão de fotos · Vinhedos', en: 'Photo session · Vineyards' },
      desc: { pt: 'Uma hora de ensaio entre as vinhas do Grand Cru, na luz do fim de tarde. As fotos editadas chegam em até 5 dias.',
              en: 'A one-hour session among the Grand Cru vines in late-afternoon light. Edited photos within 5 days.' },
      meeting: 'Turckheim · portão da vinícola',
      duration: '1h', distance: '—', effort: 'easy',
      includes: { pt: ['Uma hora de ensaio', 'De 25 a 40 fotos editadas', 'Entrega em até 5 dias'],
                  en: ['One-hour session', '25 to 40 edited photos', 'Delivered within 5 days'] },
      notIncludes: { pt: ['Transporte até Turckheim', 'Maquiagem e cabelo'], en: ['Transport to Turckheim', 'Hair and make-up'] },
      stops: [
        { t: '1', ph: '', lat: 48.0870, lng: 7.2760,
          n: { pt: 'A gente se encontra e conversa', en: 'We meet and talk' },
          d: { pt: 'Dez minutos antes de qualquer foto. Eu preciso saber o que você quer levar embora dessa sessão.',
               en: 'Ten minutes before any photo. I need to know what you want to take home from this session.' } },
        { t: '2', ph: 'tour-vinhedos.jpg', lat: 48.0840, lng: 7.2820,
          n: { pt: 'Entre as vinhas do Grand Cru', en: 'Among the Grand Cru vines' },
          d: { pt: 'A hora dourada dura cerca de 40 minutos. É nela que a gente trabalha — sem pose forçada, você andando e eu registrando.',
               en: 'Golden hour lasts about 40 minutes. That is when we work — no forced poses, you walking and me shooting.' } },
        { t: '3', ph: '', lat: 48.0850, lng: 7.2800,
          n: { pt: 'Você escolhe as favoritas', en: 'You pick your favourites' },
          d: { pt: 'Mando a seleção completa em até 5 dias. Você marca as preferidas e eu dou o tratamento final nelas.',
               en: 'I send the full selection within 5 days. You mark your favourites and I finish those.' } },
      ],
      photo: 'tour-vinhedos.jpg', price: 180, priceMode: 'session', min: 1, max: 4,
      payPolicy: 'full', status: 'live', order: 3 },
    { id: 't4', type: 'walk', region: 'alsace',
      name: { pt: 'Rota dos Vinhos · Riquewihr e Ribeauvillé', en: 'Wine Route · Riquewihr and Ribeauvillé' },
      desc: { pt: 'Dia inteiro por três vilas da Rota dos Vinhos, com degustação em dois domínios. Transporte incluído.',
              en: 'A full day through three villages on the Wine Route, with tastings at two estates. Transport included.' },
      meeting: 'Colmar · estação, saída principal',
      duration: '7h', distance: '4 km a pé', effort: 'moderate',
      includes: { pt: ['Transporte de van, ida e volta', 'Degustação em dois domínios', 'Guia credenciada em português', 'As fotos do dia, editadas'],
                  en: ['Van transport, round trip', 'Tastings at two estates', 'Licensed guide in Portuguese', 'Edited photos from the day'] },
      notIncludes: { pt: ['Almoço', 'Garrafas que você comprar'], en: ['Lunch', 'Bottles you buy'] },
      stops: [
        { t: '09h30', ph: 'p-t4-1.jpg', lat: 48.1668, lng: 7.2977,
          n: { pt: 'Riquewihr', en: 'Riquewihr' },
          d: { pt: 'A vila que atravessou a guerra sem levar um tiro. Por isso ela é de 1500 e parece de ontem.',
               en: 'The village that came through the war untouched. That is why it is from 1500 and looks like yesterday.' } },
        { t: '11h00', ph: 'p-t4-2.jpg', lat: 48.1600, lng: 7.3100,
          n: { pt: 'Vinhedos do Grand Cru', en: 'Grand Cru vineyards' },
          d: { pt: 'Subimos até a encosta. Daqui dá para ver por que o Riesling daqui não é igual ao de nenhum outro lugar.',
               en: 'We climb the slope. From here you can see why this Riesling is like nowhere else.' } },
        { t: '13h00', ph: 'p-t4-3.jpg', lat: 48.1950, lng: 7.3200,
          n: { pt: 'Ribeauvillé e o almoço', en: 'Ribeauvillé and lunch' },
          d: { pt: 'Parada livre para almoçar. Eu indico três lugares e você escolhe — nenhum deles me paga comissão.',
               en: 'Free time for lunch. I suggest three places and you choose — none of them pays me a commission.' } },
        { t: '15h00', ph: 'p-t4-4.jpg', lat: 48.1673, lng: 7.2965,
          n: { pt: 'Segunda degustação', en: 'Second tasting' },
          d: { pt: 'Um domínio familiar, sem vitrine para turista. Cinco vinhos, e o produtor explicando cada um.',
               en: 'A family estate with no tourist showroom. Five wines, with the grower explaining each one.' } },
      ],
      photo: 'tour-rota-vinhos.jpg', price: 120, priceMode: 'pp', min: 4, max: 8,
      payPolicy: 'split', status: 'live', order: 4 },
    { id: 't5', type: 'bike', region: 'blackforest',
      name: { pt: 'Bike na Floresta Negra', en: 'Black Forest by bike' },
      desc: { pt: 'Meio dia de bicicleta pelas trilhas da Floresta Negra, com parada para café e bolo. Bicicleta incluída.',
              en: 'Half a day cycling the Black Forest trails, with a coffee-and-cake stop. Bike included.' },
      meeting: 'Freiburg · em frente à estação',
      duration: '4h', distance: '22 km', effort: 'moderate',
      includes: { pt: ['Bicicleta e capacete', 'Café e bolo na parada'], en: ['Bike and helmet', 'Coffee and cake at the stop'] },
      notIncludes: { pt: ['Transporte até Freiburg'], en: ['Transport to Freiburg'] },
      stops: [],
      photo: 'tour-floresta.jpg', price: 78, priceMode: 'pp', min: 2, max: 8,
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
      consent: (n % 3 !== 0)
        ? { ok: true, at: created + 'T10:00:00.000Z', src: 'checkout' }
        : { ok: false },
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

/* ---------- migração de ajustes ----------
   Quem já usa o app tem um DB salvo — e a nuvem também. Sem isto,
   todo campo novo que a gente criar nasce vazio para eles e a tela
   quebra em silêncio. Preenche só o que falta; nunca sobrescreve. */
function fillSettings(s) {
  const d = _blank().settings;
  s = s || {};
  for (const k of Object.keys(d)) {
    if (s[k] === undefined || s[k] === null || s[k] === '') s[k] = d[k];
  }
  /* bio é objeto: garante os dois idiomas */
  if (typeof s.bio !== 'object' || !s.bio) s.bio = d.bio;
  else { if (!s.bio.pt) s.bio.pt = d.bio.pt; if (!s.bio.en) s.bio.en = d.bio.en; }
  return s;
}

let DB = null;
function load() {
  try { DB = JSON.parse(localStorage.getItem(DB_KEY)) || null; } catch (e) { DB = null; }
  /* O app esta em producao. Aparelho novo (ou navegador limpo) tem que
     comecar VAZIO e receber o que esta na nuvem — nunca publicar um catalogo
     inventado por cima do dela. Antes isto semeava a demonstracao e o save()
     empurrava para a nuvem: bastava ela instalar no celular para os passeios
     reais virarem os ficticios. A demonstracao so volta pelo botao no ADM. */
  if (!DB || !DB.tours) { DB = _blank(); localStorage.setItem(DB_KEY, JSON.stringify(DB)); }
  if (DB.settings.whats === undefined || DB.settings.whats === '+33612345678') {
    DB.settings.whats = '+33682051120'; DB.settings.insta = 'melissalsacia';
    DB.settings.placeholderContact = false; save();
  }
  DB.settings = fillSettings(DB.settings);
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
/* Data de HOJE no relogio local, nao em UTC. toISOString() dava a data de
   Londres: na Franca, entre meia-noite e as 2h, "hoje" ainda era ontem. */
function isoToday() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
/* Regra da Melissa (03/09/2026): metade na reserva, a outra metade ate
   30 dias antes do passeio. E nesse dia que o robo manda a cobranca do saldo. */
const PRAZO_SALDO = 30;
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
    /* logada: conta pelas reservas. Visitante: usa a contagem pública,
       que não expõe nome nem telefone de ninguém. */
    const local = DB.bookings
      .filter(b => b.tourId === tourId && b.date === date && b.time === time && b.status === 'confirmed')
      .reduce((s, b) => s + b.pax, 0);
    let taken = local;
    if (Array.isArray(DB.seatCounts) && DB.seatCounts.length) {
      const row = DB.seatCounts.find(c => c.tourId === tourId && c.date === date && c.time === time);
      taken = Math.max(local, row ? row.pax : 0);
    }
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

  create({ tourId, date, time, name, email, whats, insta, pax, criancas, coupon, policy, origin, consent, geo }) {
    const tour = Tours.get(tourId);
    /* Tem que ser o MESMO calculo que a tela mostrou. tour.price * pax ignora
       o preco escalonado (195 para as 3 primeiras, 225 depois) e gravava a
       reserva abaixo do que a pessoa acabou de ler. */
    const base = Bookings.precoDe(tour, tourId, date, time, pax, criancas).total;
    let discount = 0, couponCode = null;
    if (coupon) {
      const v = Coupons.validate(coupon, email);
      if (v.ok) { discount = Math.round(base * v.coupon.pct) / 100 * 1; discount = Math.round(base * v.coupon.pct / 100); couponCode = v.coupon.code; }
    }
    const total = base - discount;
    const b = {
      id: uid(), code: bookCode(), tourId, date, time,
      name, email, whats, insta: insta || '', pax, total,
      /* quantas das {pax} pessoas sao criancas — 0 quando o passeio nao tem
         preco de crianca. A vaga que elas ocupam ja esta contada em pax. */
      criancas: Math.max(0, Math.min(+criancas || 0, pax)),
      coupon: couponCode, discount, policy,
      consent: consent ? { ok: true, at: new Date().toISOString(), src: 'checkout' } : { ok: false },
      payments: [], status: 'confirmed',
      createdAt: new Date().toISOString(), origin: origin || 'site',
      /* Em que idioma ele reservou. Sem isto o e-mail de recibo sai em
         portugues para um frances que leu a tela inteira em ingles. */
      lang: (typeof LANG !== 'undefined' && LANG === 'en') ? 'en' : 'pt',
      /* De onde a pessoa estava ao reservar (pais/cidade pela conexao).
         Pedido da Melissa: saber de onde vem o publico. Nunca guarda o IP. */
      geo: geo || null,
    };
    /* Aqui havia um pagamento inventado: toda reserva nascia marcada como paga
       no cartao. O painel, o caixa e os relatorios contavam dinheiro que nunca
       entrou. A reserva nasce sem pagamento nenhum — quem registra e a Melissa,
       quando o dinheiro cai de verdade. E aqui que o Stripe entra um dia. */
    DB.bookings.push(b);
    if (couponCode) Coupons.consume(couponCode, email);
    localStorage.setItem(DB_KEY, JSON.stringify(DB));
    if (typeof cloudPushBooking === 'function') cloudPushBooking(b);
    if (couponCode && typeof cloudPushState === 'function') cloudPushState();
    return b;
  },

  /* Reserva fechada fora do app (WhatsApp, Instagram, na rua). A Melissa
     informa o que combinou e quanto ja recebeu — nada e inventado aqui. */
  /* Nao existe mais "avisar cliente" a mao: a confirmacao sai sozinha, pelo
     robo, quando a reserva tem metade paga (ver garantida). O robo grava
     clienteConfirmado na reserva quando o e-mail sai; o painel so mostra. */
  criarManual({ tourId, date, time, name, whats, email, pax, criancas, total, recebido, metodo }) {
    const b = {
      id: uid(), code: bookCode(), tourId, date, time,
      name, email: email || '', whats: whats || '', insta: '',
      pax: +pax || 1, criancas: Math.max(0, Math.min(+criancas || 0, +pax || 1)), total: Math.max(0, +total || 0),
      coupon: null, discount: 0, policy: 'full',
      consent: { ok: false },
      payments: [], status: 'confirmed',
      createdAt: new Date().toISOString(), origin: 'manual',
    };
    const val = Math.max(0, Math.min(+recebido || 0, b.total));
    if (val > 0) {
      b.payments.push({ amount: val, date: isoToday(), method: metodo || 'other',
                        kind: val >= b.total ? 'full' : 'deposit' });
    }
    DB.bookings.push(b);
    localStorage.setItem(DB_KEY, JSON.stringify(DB));
    if (typeof cloudPushBooking === 'function') cloudPushBooking(b);
    return b;
  },

  paid(b)   { return b.payments.reduce((s, p) => s + p.amount, 0); },
  /* ---------- preco escalonado ----------
     A Melissa vende as primeiras vagas de cada data mais barato: 195 para
     os 3 primeiros, 225 depois. O calculo e por DATA, nao por reserva —
     quem chega quando ja ha 2 vendidos leva 1 barato e o resto caro. */
  /* Quanto custa a reserva.
     `pax` e o TOTAL de gente e `criancas` quantas delas sao criancas — os
     adultos saem da subtracao. Guardar o total (e nao adultos+criancas
     separados) e de proposito: vaga, agenda, lotacao e relatorios contam
     gente, nao idade, e continuam funcionando sem saber que crianca existe.

     Crianca paga um valor fixo (x.priceChild). O preco escalonado — as
     primeiras vagas mais baratas — vale so para ADULTO: e um desconto de
     lancamento, e misturar as duas contas deixaria o cliente sem entender
     por que o valor mudou. */
  precoDe(x, tourId, date, time, pax, criancas) {
    const cheio = +x.price || 0;
    const tarde = +x.priceLate || 0;
    const vagasBaratas = +x.earlySeats || 0;
    if (x.priceMode === 'session') return { total: cheio, linhas: [{ qtd: 1, valor: cheio }] };

    const valorCrianca = +x.priceChild || 0;
    const kids = valorCrianca > 0 ? Math.max(0, Math.min(+criancas || 0, pax)) : 0;
    const adultos = Math.max(0, pax - kids);
    const contaKids = kids * valorCrianca;
    const linhaKids = kids ? [{ qtd: kids, valor: valorCrianca, crianca: true }] : [];

    if (!tarde || !vagasBaratas) {
      return { total: cheio * adultos + contaKids,
               linhas: (adultos ? [{ qtd: adultos, valor: cheio }] : []).concat(linhaKids) };
    }

    const jaVendidos = Bookings.vendidosEm(tourId, date, time);
    const baratas = Math.max(0, Math.min(adultos, vagasBaratas - jaVendidos));
    const caras = adultos - baratas;
    const linhas = [];
    if (baratas) linhas.push({ qtd: baratas, valor: cheio });
    if (caras)   linhas.push({ qtd: caras,   valor: tarde });
    return { total: baratas * cheio + caras * tarde + contaKids,
             linhas: linhas.concat(linhaKids),
             baratasRestantes: Math.max(0, vagasBaratas - jaVendidos) };
  },

  /* lugares ja vendidos numa saida — base do preco escalonado e das vagas */
  vendidosEm(tourId, date, time) {
    const local = DB.bookings
      .filter(b => b.tourId === tourId && b.date === date && b.time === time && b.status !== 'cancelled')
      .reduce((s, b) => s + b.pax, 0);
    let n = local;
    if (Array.isArray(DB.seatCounts) && DB.seatCounts.length) {
      const row = DB.seatCounts.find(c => c.tourId === tourId && c.date === date && c.time === time);
      if (row) n = Math.max(local, +row.pax);
    }
    return n;
  },
  due(b)    { return Math.max(0, b.total - Bookings.paid(b)); },
  /* Prazo do saldo de cada passeio. Sem nada escrito, 30 dias (era 1: a
     vespera — tarde demais para cobrar alguem). */
  prazoSaldo(x) { return (x && +x.balanceDays) || PRAZO_SALDO; },
  /* O dia em que o saldo e cobrado: e quando o robo manda o e-mail. */
  dueDate(b){
    return addDays(b.date, -Bookings.prazoSaldo(Tours.get(b.tourId)));
  },
  /* Quanto se pede AGORA: metade se a politica e "split", tudo se nao. */
  sinal(b) {
    const total = +b.total || 0;
    return b.policy === 'split' ? Math.round(total / 2) : total;
  },
  /* Vaga garantida = pelo menos metade paga. Reserva sem dinheiro nao e
     reserva: e um pedido. Painel, tela do cliente e robo de e-mail usam
     esta mesma conta — se ela mudar, muda num lugar so. */
  garantida(b) {
    const total = +b.total || 0;
    if (total <= 0) return true;
    return Bookings.paid(b) * 2 >= total;
  },
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
  /* Tira a reserva DESTE aparelho. Quem manda apagar e o app.js, e so
     depois de o banco confirmar — senao a sincronia traria de volta.
     Ver cloudDeleteBooking. */
  apagarLocal(id) {
    const antes = DB.bookings.length;
    DB.bookings = DB.bookings.filter(b => b.id !== id);
    if (DB.bookings.length === antes) return false;
    localStorage.setItem(DB_KEY, JSON.stringify(DB));
    return true;
  },

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
                                  tours: 0, spent: 0, last: '', origins: new Set(), consent: false, consentAt: '' };
      c.tours += 1;
      c.spent += Bookings.paid(b);
      if (b.date > c.last) c.last = b.date;
      if (b.origin) c.origins.add(b.origin);
      if (b.consent && b.consent.ok) { c.consent = true; c.consentAt = b.consent.at; }
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
    /* "Recebido" tem que ser dinheiro que ja entrou. Sem este corte, um saldo
       agendado para amanha entrava no grafico como recebido hoje — e o total
       do topo (que so conta ate hoje) discordava do grafico na mesma tela. */
    const hoje = isoToday();
    const out = Array(12).fill(0);
    for (const b of DB.bookings) {
      for (const p of b.payments) {
        if (!p.date || p.date > hoje) continue;
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
  /* De onde SAO os clientes — pais e cidade descobertos pela conexao na
     hora da reserva (pedido da Melissa: achar o publico certo). Reserva
     lancada a mao nao tem isso e entra em "sem informacao". */
  byGeo(fromIso, toIso) {
    const paises = {};
    let total = 0, semInfo = 0;
    for (const b of DB.bookings) {
      if (b.status === 'cancelled' || b.date < fromIso || b.date > toIso) continue;
      total++;
      const g = b.geo;
      if (!g || !g.paisCod) { semInfo++; continue; }
      const cod = String(g.paisCod).toUpperCase();
      const p = paises[cod] = paises[cod] || { cod, nome: g.pais || cod, n: 0, cidades: {} };
      p.n++;
      if (g.cidade) p.cidades[g.cidade] = (p.cidades[g.cidade] || 0) + 1;
    }
    const lista = Object.values(paises).map(p => ({
      cod: p.cod, nome: p.nome, n: p.n, pct: total ? Math.round(p.n / total * 100) : 0,
      cidades: Object.entries(p.cidades).map(([nome, n]) => ({ nome, n })).sort((a, b) => b.n - a.n),
    })).sort((a, b) => b.n - a.n);
    return { paises: lista, total, semInfo };
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
