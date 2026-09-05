/* Data com todas as vagas vendidas nao pode ser clicavel (pedido da Melissa,
   03/09/2026). Antes a data aparecia normal; a pessoa clicava, via "0 vagas"
   em cada horario e ficava sem saber o que fazer.

   Aqui o passo 1 do checkout e desenhado de verdade, com um DOM de mentira
   que so guarda o HTML, e conferimos o que sai. */
const fs = require('fs'), assert = require('assert');
const SERVE = [__dirname + '/..', __dirname + '/../serve'].find(d => fs.existsSync(d + '/app.js'));
const src = fs.readFileSync(SERVE + '/app.js', 'utf8');
const i = src.indexOf('function renderBook'), f = src.indexOf('   ADM\n', i);
assert.ok(i > 0 && f > i, 'nao achei renderBook no app.js');
const fim = src.lastIndexOf('/* ====', f);

let falhas = 0;
/* "chk", nao "t": o passo 1 chama t('perPerson') e afins, e o eval roda
   neste escopo — um "t" local engoliria o dicionario de mentira. */
const chk = (nome, cond, det) => {
  if (cond) console.log('  ok   ' + nome);
  else { falhas++; console.log('  FALHA ' + nome + (det ? ' — ' + det : '')); }
};

/* mundo minimo */
const tour = { id: 'natal', price: 195, max: 7, payPolicy: 'split', priceMode: 'pp', name: { pt: 'Natal' } };
const book = { innerHTML: '' };
global.$ = (sel) => sel === '#book' ? book : (sel === '#next1' ? { disabled: false, addEventListener() {} } : null);
global.$$ = () => [];
global.t = (k) => k;
global.LANG = 'pt';
global.eur = (v) => '€ ' + v;
global.esc = (v) => String(v);
global.fmtDate = (iso) => 'sáb, ' + iso.slice(8, 10) + '/' + iso.slice(5, 7);
global.isoToday = () => '2026-09-03';
global.addDays = (iso, n) => '2026-12-31';
global.waLink = () => '#';
global.toast = () => {};
global.Bookings = { precoDe: () => ({ total: 390 }), prazoSaldo: () => 30 };
/* renderBook usa estes dois para anunciar o preco de crianca; aqui o passeio
   nao tem crianca, entao basta o falso */
global.temCrianca = () => false;
global.idadeCrianca = () => 'até 12 anos';
global.diasAte = () => 90;
/* tres datas: d1 tem um horario cheio e um livre; d2 esta toda cheia; d3 livre */
const vagas = { 'd1|09h': 0, 'd1|14h': 3, 'd2|09h': 0, 'd2|14h': 0, 'd3|09h': 7 };
global.Cal = {
  departures: () => [
    { date: 'd1', time: '09h', capacity: 7 }, { date: 'd1', time: '14h', capacity: 7 },
    { date: 'd2', time: '09h', capacity: 7 }, { date: 'd2', time: '14h', capacity: 7 },
    { date: 'd3', time: '09h', capacity: 7 },
  ].map(d => ({ ...d, date: d.date.replace(/^d(\d)$/, '2026-12-0$1') })),
  seatsLeft: (id, date, time) => vagas[date.replace(/^2026-12-0(\d)$/, 'd$1') + '|' + time],
};
global.viewTour = { _s: { tour, date: null, time: null, cap: 0, pax: 2, step: 1, coupon: null, discount: 0, policy: 'split' } };
eval(src.slice(i, fim));
renderBook();
const html = book.innerHTML;

console.log('passo 1 — datas lotadas');
chk('data com um horario livre continua clicavel', html.includes('data-d="2026-12-01"'));
chk('data livre continua clicavel', html.includes('data-d="2026-12-03"'));
chk('data toda lotada NAO e clicavel', !html.includes('data-d="2026-12-02"'));
const off = html.match(/<button class="dcell off"[^>]*>[^]*?<\/button>/g) || [];
chk('exatamente uma data apagada', off.length === 1, off.length + ' apagadas');
chk('a data apagada esta desativada de verdade', off[0] && /\bdisabled\b/.test(off[0]));
chk('a data apagada diz "lotado"', off[0] && off[0].includes('dateFull'));
chk('a data apagada mostra o dia', off[0] && off[0].includes('02/12'));
chk('o clique so e ligado nas datas com data-d', /\$\$\('\.dcell\[data-d\]', book\)/.test(src));

console.log(falhas ? `\n${falhas} FALHA(S)` : '\ntudo passou');
process.exit(falhas ? 1 : 0);
