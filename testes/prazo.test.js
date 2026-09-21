/* Reservou tem que pagar (regra da Melissa, 21/09/2026).

   Entrou uma reserva de "Hjhhhjhj", WhatsApp "±351939250915", sem pagar
   nada — e ela nao tinha como saber quem era nem se ia pagar. Duas frentes:

   1. Dados de verdade: nome E sobrenome, WhatsApp limpo com o codigo do
      pais, Instagram obrigatorio.
   2. A vaga fica segurada por N horas (24 por padrao, ela ajusta). O prazo
      e gravado NA reserva — foi o que a pessoa leu na tela. Sem pagamento
      ate la, o robo cancela e a vaga volta. */
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const SERVE = [__dirname + '/..', __dirname + '/../serve'].find(d => fs.existsSync(d + '/store.js'));
const app = fs.readFileSync(SERVE + '/app.js', 'utf8');
const i18n = fs.readFileSync(SERVE + '/i18n.js', 'utf8');
let falhas = 0;
/* 'chk', nao 't': situacaoPgto chama t() para traduzir, e um 't' de teste
   no mesmo escopo engoliria a traducao — foi o que aconteceu na 1a rodada */
const chk = (nome, cond, det) => {
  if (cond) console.log('  ok   ' + nome);
  else { falhas++; console.log('  FALHA ' + nome + (det ? ' — ' + det : '')); }
};

/* ---------- o prazo nasce com a reserva ---------- */
function loja(horas) {
  const ctx = { console, JSON, Date, Math, Number, Object, Array, String, Set,
    localStorage: { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } } };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(SERVE + '/store.js', 'utf8'), ctx);
  vm.runInContext(`load(); DB.coupons = []; DB.bookings = [];
    DB.tours = [{ id: 'natal', price: 195, max: 7, payPolicy: 'split', priceMode: 'pp' }];
    ${horas === undefined ? '' : 'DB.settings.horasPagamento = ' + horas + ';'}`, ctx);
  return ctx;
}
const cria = (c) => vm.runInContext(`Bookings.create({ tourId: 'natal', date: '2026-12-05', time: '09:00',
  name: 'Ana Silva', email: 'a@x.com', whats: '+5511999999999', insta: 'ana', pax: 1, policy: 'full', origin: 'site' })`, c);
const horasAte = (iso) => (new Date(iso) - Date.now()) / 3600e3;

console.log('o prazo de pagamento');
chk('padrão: 24 horas a partir de agora', Math.abs(horasAte(cria(loja()).prazoPagamento) - 24) < 0.01);
chk('a Melissa pode mudar (6 horas)', Math.abs(horasAte(cria(loja(6)).prazoPagamento) - 6) < 0.01);
chk('o prazo fica GRAVADO na reserva', !!cria(loja()).prazoPagamento, 'calculado depois, mudaria se ela mexesse no ajuste');
chk('reserva lançada à mão não tem prazo', !vm.runInContext(`Bookings.criarManual({ tourId: 'natal', date: '2026-12-05',
  time: '09:00', name: 'B', pax: 1, total: 195, recebido: 0 }).prazoPagamento`, loja()));
chk('o padrão da loja é 24', vm.runInContext('DB.settings.horasPagamento', loja()) === 24);

/* ---------- dados de verdade ---------- */
console.log('quem reserva tem que dizer quem é');
const li = app.indexOf('function limpaWhats'), lf = app.indexOf('\n}\n', li) + 3;
eval(app.slice(li, lf));
chk('"±351939250915" vira +351939250915', limpaWhats('±351939250915') === '+351939250915', limpaWhats('±351939250915'));
chk('"+55 (11) 99999-9999" fica limpo', limpaWhats('+55 (11) 99999-9999') === '+5511999999999');
chk('"0033 6 12 34 56 78" troca o 00 por +', limpaWhats('0033 6 12 34 56 78') === '+33612345678');
chk('vazio continua vazio', limpaWhats('   ') === '');
const valida = /^\+[1-9]\d{7,14}$/;
chk('WhatsApp sem código do país é recusado', !valida.test(limpaWhats('06 12 34 56 78')));
chk('WhatsApp de verdade passa', valida.test(limpaWhats('±351939250915')) && valida.test(limpaWhats('+55 16 98119-5662')));
chk('a tela usa essa mesma regra', /\/\^\\\+\[1-9\]\\d\{7,14\}\$\/\.test\(whats\)/.test(app));
chk('nome precisa de nome E sobrenome', /name\.split\(' '\)\.length < 2/.test(app), '"Hjhhhjhj" passava');
chk('nome precisa de pelo menos 4 letras', /replace\(\/\[\^\\p\{L\}\]\/gu, ''\)\.length < 4/.test(app));
chk('Instagram é obrigatório', /if \(!name \|\| !email \|\| !whats \|\| !insta\) return toast\(t\('fillAll'\)\)/.test(app));
chk('o @ do Instagram é tirado', /replace\(\/\^@\+\/, ''\)/.test(app));

/* ---------- o painel mostra o prazo ---------- */
console.log('o painel');
const si = app.indexOf('function situacaoPgto'), sf = app.indexOf('\n}\n', si) + 3;
global.t = (k, p) => k + (p ? JSON.stringify(p) : '');
global.eur = (v) => '€' + v;
global.fmtDate = (d) => d;
global.fmtHora = (d) => 'H(' + d + ')';
global.Bookings = { paid: (b) => (b.payments || []).reduce((s, p) => s + p.amount, 0),
  dueDate: () => '2026-11-05', garantida: (b) => global.Bookings.paid(b) * 2 >= b.total };
eval(app.slice(si, sf));
const daqui = (h) => new Date(Date.now() + h * 3600e3).toISOString();
chk('sem pagar, dentro do prazo: "cancela sozinha às …"',
  /^stCancelaEm/.test(situacaoPgto({ total: 195, payments: [], status: 'confirmed', prazoPagamento: daqui(5) }, '2026-09-21').titulo));
chk('sem pagar, prazo vencido: "cancela na próxima rodada"',
  situacaoPgto({ total: 195, payments: [], status: 'confirmed', prazoPagamento: daqui(-1) }, '2026-09-21').titulo === 'stVencido');
chk('cancelada pelo robô diz por quê',
  situacaoPgto({ total: 195, payments: [], status: 'cancelled', canceladaPor: 'prazo' }, '2026-09-21').titulo === 'stCancelPrazo');
chk('cancelada por ela continua "Cancelada"',
  situacaoPgto({ total: 195, payments: [], status: 'cancelled' }, '2026-09-21').titulo === 'cancelled');
chk('pagou o sinal: o prazo de pagamento sai de cena, volta o do saldo',
  /^stSinal/.test(situacaoPgto({ total: 390, payments: [{ amount: 195 }], status: 'confirmed', prazoPagamento: daqui(-1) }, '2026-09-21').titulo),
  'quem pagou metade nao pode ser tratado como inadimplente');
chk('reserva antiga sem prazo segue a regra de antes',
  /^stEsperando/.test(situacaoPgto({ total: 195, payments: [], status: 'confirmed' }, '2026-09-21').titulo));

/* ---------- a tela do cliente ---------- */
console.log('a tela do cliente');
chk('diz até quando a vaga está reservada', /t\('booked', \{ h: fmtHora\(b\.prazoPagamento\) \}\)/.test(app));
const mi = i18n.indexOf('const STR'), mf = i18n.indexOf('function t(', mi);
eval(i18n.slice(mi, mf).replace('const STR', 'globalThis.STR'));
chk('e que sem pagamento a reserva é cancelada', /cancelada automaticamente/.test(STR.sentAll.pt) && /cancelled automatically/.test(STR.sentAll.en));
chk('Ajustes tem o campo das horas', /id="pgHoras"/.test(app) && /DB\.settings\.horasPagamento = Math\.max\(1, Math\.min\(168/.test(app));

console.log(falhas ? `\n${falhas} FALHA(S)` : '\ntudo passou');
process.exit(falhas ? 1 : 0);
