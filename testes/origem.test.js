/* "De onde sao as pessoas" — pedido da Melissa (03/09/2026), no lugar do
   grafico "Site 100%". Pais e cidade vem da conexao na hora da reserva e
   ficam guardados na reserva (nunca o IP). Reserva lancada a mao nao tem. */
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
  DB.tours = [{ id: 'natal', price: 195, max: 7, payPolicy: 'split' }];
  DB.coupons = [];
  DB.bookings = [
    { id: '1', tourId: 'natal', date: '2026-12-05', status: 'confirmed', payments: [], geo: { pais: 'Brasil', paisCod: 'BR', cidade: 'São Paulo' } },
    { id: '2', tourId: 'natal', date: '2026-12-05', status: 'confirmed', payments: [], geo: { pais: 'Brasil', paisCod: 'br', cidade: 'Curitiba' } },
    { id: '3', tourId: 'natal', date: '2026-12-05', status: 'confirmed', payments: [], geo: { pais: 'Brasil', paisCod: 'BR', cidade: 'São Paulo' } },
    { id: '4', tourId: 'natal', date: '2026-12-05', status: 'confirmed', payments: [], geo: { pais: 'França', paisCod: 'FR', cidade: 'Paris' } },
    { id: '5', tourId: 'natal', date: '2026-12-05', status: 'confirmed', payments: [], origin: 'manual' },
    { id: '6', tourId: 'natal', date: '2026-12-05', status: 'cancelled', payments: [], geo: { pais: 'Portugal', paisCod: 'PT' } },
    { id: '7', tourId: 'natal', date: '2027-03-01', status: 'confirmed', payments: [], geo: { pais: 'Portugal', paisCod: 'PT' } },
  ];`, ctx);
const G = vm.runInContext(`Reports.byGeo('2026-12-01', '2026-12-31')`, ctx);

console.log('de onde sao os clientes');
t('conta so o periodo e ignora canceladas', G.total === 5, 'total ' + G.total);
t('Brasil primeiro, com 3', G.paises[0].cod === 'BR' && G.paises[0].n === 3);
t('codigo em minuscula entra no mesmo pais', G.paises.length === 2);
t('percentual sobre o total', G.paises[0].pct === 60 && G.paises[1].pct === 20);
t('cidades ordenadas por quantidade', G.paises[0].cidades[0].nome === 'São Paulo' && G.paises[0].cidades[0].n === 2);
t('lancada a mao vira "sem informacao"', G.semInfo === 1);

console.log('a reserva guarda o lugar');
vm.runInContext(`Bookings.create({ tourId: 'natal', date: '2026-12-05', time: '09h', name: 'Ana', email: 'a@x.com', whats: '+55', pax: 2, policy: 'split', origin: 'site', geo: { pais: 'Brasil', paisCod: 'BR', cidade: 'Recife' } })`, ctx);
const nova = vm.runInContext(`DB.bookings.at(-1)`, ctx);
t('geo gravado na reserva', nova.geo && nova.geo.cidade === 'Recife');
t('sem geo, fica nulo (nao inventa)', vm.runInContext(`Bookings.create({ tourId: 'natal', date: '2026-12-05', time: '09h', name: 'B', email: 'b@x.com', whats: '', pax: 1, policy: 'full', origin: 'site' }).geo`, ctx) === null);

console.log('o app descobre o lugar sem guardar IP');
t('busca comeca ao abrir a pagina do passeio', /geoDescobre\(\);\s*\/\*/.test(app));
t('a reserva leva geoCache', /geo: geoCache \|\| null,/.test(app));
t('guarda so pais/regiao/cidade', /\{ pais: j\.country[^}]*paisCod: j\.country_code[^}]*cidade: j\.city[^}]*regiao: j\.region[^}]*\}/.test(app) && !/\bip:/.test(app.slice(app.indexOf('function geoDescobre'), app.indexOf('function bandeira'))));
t('tem prazo: nao pode travar a reserva', /setTimeout\(\(\) => ctrl\.abort\(\), 4000\)/.test(app));
const i = app.indexOf('function bandeira'), f = app.indexOf('\n}\n', i) + 3;
eval(app.slice(i, f));
t('bandeira do Brasil', bandeira('BR') === '🇧🇷');
t('codigo torto nao vira lixo', bandeira('') === '' && bandeira('BRA') === '');

console.log(falhas ? `\n${falhas} FALHA(S)` : '\ntudo passou');
process.exit(falhas ? 1 : 0);
