/* A seta da direita da Agenda "jogava os meses pra frente" — na verdade
   NAO jogava: na Franca ela ficava presa no mesmo mes.

   Causa: new Date(ano, mes, 1).toISOString() converte para UTC. Em Colmar
   (UTC+2 no verao), "1 de outubro 00:00" vira "30 de setembro 22:00Z", e
   .slice(0, 7) devolve "2026-09" de novo. No Brasil (UTC-3) o mesmo codigo
   funciona — por isso o Eugenio nunca viu o bug e a Melissa viu.

   O teste roda no fuso da Franca de proposito. Tambem confere isoToday(),
   que tinha o mesmo defeito (a data de "hoje" era a de Londres). */
process.env.TZ = 'Europe/Paris';
const fs = require('fs'), assert = require('assert');
const SERVE = [__dirname + '/..', __dirname + '/../serve'].find(d => fs.existsSync(d + '/app.js'));
const src = fs.readFileSync(SERVE + '/app.js', 'utf8');
const store = fs.readFileSync(SERVE + '/store.js', 'utf8');

let falhas = 0;
const t = (nome, cond, det) => {
  if (cond) console.log('  ok   ' + nome);
  else { falhas++; console.log('  FALHA ' + nome + (det ? ' — ' + det : '')); }
};

const i = src.indexOf('function mesMais'), f = src.indexOf('\n}\n', i) + 3;
assert.ok(i > 0, 'nao achei mesMais no app.js');
eval(src.slice(i, f));
const j = store.indexOf('function isoToday'), g = store.indexOf('\n}\n', j) + 3;
assert.ok(j > 0, 'nao achei isoToday no store.js');
eval(store.slice(j, g));

const fusoPegou = new Date(2026, 9, 1).getTimezoneOffset() < 0;   /* Paris no verao: -120 */
console.log('agenda — mes seguinte e anterior' + (fusoPegou ? ' (fuso da Franca)' : ' (fuso local)'));

t('setembro -> outubro', mesMais('2026-09', 1) === '2026-10', mesMais('2026-09', 1));
t('outubro -> novembro', mesMais('2026-10', 1) === '2026-11');
t('dezembro -> janeiro do ano seguinte', mesMais('2026-12', 1) === '2027-01');
t('janeiro -> dezembro do ano anterior', mesMais('2026-01', -1) === '2025-12');
t('12 meses pra frente', mesMais('2026-09', 12) === '2027-09');
t('mes vem sempre com dois digitos', mesMais('2026-08', 1) === '2026-09');
if (fusoPegou) {
  t('o jeito antigo (toISOString) errava aqui',
    new Date(2026, 9, 1).toISOString().slice(0, 7) !== '2026-10',
    'se isto passar a falhar, o fuso do teste nao e mais o da Franca');
}
t('a Agenda usa mesMais, nao toISOString', /admAgenda\._m = mesMais\(cur, n\)/.test(src)
  && !/admAgenda\._m = d\.toISOString/.test(src));

console.log('hoje e a data local, nao a de Londres');
const d = new Date();
const local = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
t('isoToday() bate com o calendario da parede', isoToday() === local, isoToday() + ' vs ' + local);
t('isoToday() nao usa toISOString', !/function isoToday\(\)[^]*?toISOString/.test(store.slice(j, g)));

console.log(falhas ? `\n${falhas} FALHA(S)` : '\ntudo passou');
process.exit(falhas ? 1 : 0);
