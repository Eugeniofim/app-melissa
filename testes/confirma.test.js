/* A confirmação ao cliente (03/09/2026: UMA mensagem, e só quando pagou).
   Quando a reserva fica GARANTIDA (metade paga), o app grava a marca
   clienteConfirmado; o gatilho no banco (aviso_mudou, sala melissa) vê a marca
   aparecer e manda o e-mail de confirmação com o kit. Este teste trava QUEM
   ganha a marca e quem não ganha — um engano aqui manda (ou deixa de mandar)
   e-mail para cliente de verdade. */
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const SERVE = [__dirname + '/..', __dirname + '/../serve'].find(d => fs.existsSync(d + '/store.js'));
const store = fs.readFileSync(SERVE + '/store.js', 'utf8');
let falhas = 0;
const t = (nome, cond, det) => {
  if (cond) console.log('  ok   ' + nome);
  else { falhas++; console.log('  FALHA ' + nome + (det ? ' — ' + det : '')); }
};

const ctx = { console, JSON, Date, Math, Number, Object, Array, String, Set,
  localStorage: { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } } };
vm.createContext(ctx);
vm.runInContext(store, ctx);
vm.runInContext('load(); DB.settings.avisarClientes = true;', ctx);
const marca = (o) => JSON.parse(vm.runInContext(`(function(){var b=${JSON.stringify(o)};Bookings.marcaConfirmado(b);return JSON.stringify(b);})()`, ctx));
const temMarca = (o) => typeof marca(o).clienteConfirmado === 'string';

/* uma reserva online garantida: 195 de 390, tem e-mail, não é manual */
const base = { total: 390, payments: [{ amount: 195 }], email: 'cliente@x.com', origin: 'site', status: 'confirmed' };

console.log('quem GANHA a marca');
t('online garantida com e-mail → marca', temMarca(base) === true);
t('tudo pago também → marca', temMarca({ ...base, payments: [{ amount: 390 }] }) === true);

console.log('quem NÃO ganha a marca');
t('sem metade paga (100 de 390) → não', temMarca({ ...base, payments: [{ amount: 100 }] }) === false);
t('sem e-mail → não', temMarca({ ...base, email: '' }) === false);
t('reserva manual (ela já combinou por fora) → não', temMarca({ ...base, origin: 'manual' }) === false);
t('cancelada → não', temMarca({ ...base, status: 'cancelled' }) === false);

console.log('não reenvia / respeita o ajuste');
t('já marcada não é regravada', (() => { const r = marca({ ...base, clienteConfirmado: '2020-01-01' }); return r.clienteConfirmado === '2020-01-01'; })());
vm.runInContext('DB.settings.avisarClientes = false;', ctx);
t('com "avisar clientes" desligado → não', temMarca(base) === false);
vm.runInContext('DB.settings.avisarClientes = true;', ctx);

console.log('a marca sai no pagamento, e o link do e-mail tem base certa');
t('payBalance chama marcaConfirmado', /Bookings\.marcaConfirmado\(b\)/.test(store));
t('siteUrl padrão aponta pro app dela', /siteUrl:\s*'https:\/\/app\.melissahallais\.com\//.test(store));

console.log(falhas ? `\n${falhas} FALHA(S)` : '\ntudo passou');
process.exit(falhas ? 1 : 0);
