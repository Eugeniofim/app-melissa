/* Regra da Melissa (03/09/2026):
   - reserva so tem vaga garantida com pelo menos METADE paga;
   - metade agora, metade ate 30 dias antes — e nesse dia a cobranca sai;
   - "metade" so e oferecida quando ainda ha mais de 30 dias ate o passeio.
   A conta vive em store.js (Bookings.garantida / sinal / prazoSaldo /
   dueDate) e o robo de e-mail faz a MESMA conta em Python. */
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const SERVE = [__dirname + '/..', __dirname + '/../serve'].find(d => fs.existsSync(d + '/store.js'));
const app = fs.readFileSync(SERVE + '/app.js', 'utf8');
let falhas = 0;
const t = (nome, cond, det) => {
  if (cond) console.log('  ok   ' + nome);
  else { falhas++; console.log('  FALHA ' + nome + (det ? ' — ' + det : '')); }
};

const ctx = { console, JSON, Date, Math, Number, Object, Array, String, Set,
  localStorage: { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } } };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(SERVE + '/store.js', 'utf8'), ctx);
vm.runInContext(`load();
  DB.tours = [{ id: 'natal', balanceDays: 30, price: 195, max: 7 }, { id: 'semprazo', price: 100, max: 4 }, { id: 'longo', balanceDays: 45, price: 100, max: 4 }];`, ctx);
const B = (expr) => vm.runInContext(expr, ctx);
const b = (o) => JSON.stringify(o);

console.log('vaga garantida = metade paga');
t('nada pago: nao', B(`Bookings.garantida(${b({ total: 390, payments: [] })})`) === false);
t('100 de 390: nao', B(`Bookings.garantida(${b({ total: 390, payments: [{ amount: 100 }] })})`) === false);
t('194 de 390: nao (metade e 195)', B(`Bookings.garantida(${b({ total: 390, payments: [{ amount: 194 }] })})`) === false);
t('195 de 390: sim', B(`Bookings.garantida(${b({ total: 390, payments: [{ amount: 195 }] })})`) === true);
t('tudo pago: sim', B(`Bookings.garantida(${b({ total: 390, payments: [{ amount: 390 }] })})`) === true);
t('em duas partes que somam metade: sim', B(`Bookings.garantida(${b({ total: 390, payments: [{ amount: 100 }, { amount: 95 }] })})`) === true);
t('reserva gratis: sim', B(`Bookings.garantida(${b({ total: 0, payments: [] })})`) === true);

console.log('quanto se pede agora');
t('metade: 195 de 390', B(`Bookings.sinal(${b({ total: 390, policy: 'split' })})`) === 195);
t('metade de 395 arredonda: 198', B(`Bookings.sinal(${b({ total: 395, policy: 'split' })})`) === 198);
t('tudo de uma vez: 390', B(`Bookings.sinal(${b({ total: 390, policy: 'full' })})`) === 390);

console.log('prazo do saldo');
t('passeio com 30 escrito: 30', B(`Bookings.prazoSaldo(Tours.get('natal'))`) === 30);
t('passeio sem nada escrito: 30 (era 1, a vespera)', B(`Bookings.prazoSaldo(Tours.get('semprazo'))`) === 30);
t('passeio com 45: 45', B(`Bookings.prazoSaldo(Tours.get('longo'))`) === 45);
t('dia da cobranca = data - 30', B(`Bookings.dueDate(${b({ tourId: 'natal', date: '2026-12-05' })})`) === '2026-11-05');
t('dia da cobranca sem prazo escrito = data - 30', B(`Bookings.dueDate(${b({ tourId: 'semprazo', date: '2026-12-05' })})`) === '2026-11-05');

console.log('checkout so oferece metade com tempo de cobrar o resto');
t('usa diasAte(data) > prazo', /diasAte\(S\.date\) > prazo/.test(app));
t('sem metade, a politica cai para tudo de uma vez', /if \(!splitAllowed\) S\.policy = 'full';/.test(app));
t('o texto da opcao recebe o prazo', /t\('paySplit', \{ d: prazo \}\)/.test(app));
const i = app.indexOf('function diasAte'), f = app.indexOf('\n}\n', i) + 3;
global.isoToday = () => '2026-09-03';
eval(app.slice(i, f));
t('diasAte(hoje) = 0', diasAte('2026-09-03') === 0);
t('diasAte(+30) = 30', diasAte('2026-10-03') === 30);
t('diasAte(+31) = 31', diasAte('2026-10-04') === 31);
t('diasAte(ontem) = -1', diasAte('2026-09-02') === -1);

console.log('a tela do cliente nao promete vaga antes do dinheiro');
const i18n = fs.readFileSync(SERVE + '/i18n.js', 'utf8');
const mi = i18n.indexOf('const STR'), mf = i18n.indexOf('function t(', mi);
eval(i18n.slice(mi, mf).replace('const STR', 'globalThis.STR'));
t('titulo pos-reserva nao diz "reservado"', !/reservado/i.test(STR.booked.pt) && /pagamento/i.test(STR.booked.pt));
t('texto pos-reserva diz que a vaga depende do pagamento', /garantida quando/.test(STR.sentAll.pt));
t('etiqueta sem pagamento diz "vaga nao garantida"', /não garantida/.test(STR.stEsperando.pt));
t('etiqueta com sinal diz "vaga garantida"', /vaga garantida/.test(STR.stSinal.pt));
t('"metade agora" diz que a cobranca chega por e-mail', /e-mail/.test(STR.paySplitSub.pt) && /\{d\} dias/.test(STR.paySplitSub.pt));

console.log(falhas ? `\n${falhas} FALHA(S)` : '\ntudo passou');
process.exit(falhas ? 1 : 0);
