/* Preço de adulto e de criança (pedido da Melissa, 05/09/2026).

   A decisão que segura tudo: a reserva guarda o TOTAL de gente em `pax` e
   quantas delas são crianças em `criancas`. Adultos saem da subtração.
   Assim vaga, agenda, lotação e relatórios continuam contando gente e não
   precisam saber que criança existe.

   Duas regras de negócio:
   - criança paga um valor fixo;
   - o desconto das primeiras vagas é de LANÇAMENTO e vale só para adulto —
     misturar as duas contas deixaria o cliente sem entender o valor. */
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
  DB.coupons = [];
  DB.bookings = [];
  DB.tours = [
    /* como os passeios dela: 195 para as 3 primeiras, 225 depois, crianca 95 */
    { id: 'natal', price: 195, priceLate: 225, earlySeats: 3, priceChild: 95, childAge: 12, max: 7, min: 2, payPolicy: 'split', priceMode: 'pp', name: { pt: 'Natal' } },
    /* sem preco de crianca */
    { id: 'simples', price: 100, max: 8, priceMode: 'pp', payPolicy: 'full', name: { pt: 'Simples' } },
    /* por sessao: crianca nao se aplica */
    { id: 'ensaio', price: 300, priceMode: 'session', priceChild: 95, max: 6, payPolicy: 'full', name: { pt: 'Ensaio' } },
  ];`, ctx);
/* a data entra como parametro: depois que uma reserva existe naquela saida,
   as vagas baratas ja foram, e o teste seguinte compararia outra conta */
const preco = (id, pax, kids, data = '2026-12-05') => vm.runInContext(
  `Bookings.precoDe(Tours.get('${id}'), '${id}', '${data}', '09h', ${pax}, ${kids === undefined ? 'undefined' : kids})`, ctx);

console.log('a conta');

t('2 adultos, nenhuma criança: 2 × 195', preco('natal', 2, 0).total === 390, String(preco('natal', 2, 0).total));
t('2 adultos + 1 criança: 390 + 95', preco('natal', 3, 1).total === 485, String(preco('natal', 3, 1).total));
t('1 adulto + 3 crianças: 195 + 285', preco('natal', 4, 3).total === 480, String(preco('natal', 4, 3).total));
t('sem dizer crianças, é tudo adulto', preco('natal', 2).total === 390);
t('passeio sem preço de criança ignora o campo', preco('simples', 3, 2).total === 300, String(preco('simples', 3, 2).total));
t('por sessão continua valor fechado', preco('ensaio', 4, 2).total === 300);

console.log('o desconto das primeiras vagas é só do adulto');
/* 3 vagas baratas. 4 adultos: 3 a 195 + 1 a 225 */
t('4 adultos: 3 baratas + 1 cheia', preco('natal', 4, 0).total === 3 * 195 + 225, String(preco('natal', 4, 0).total));
/* 4 adultos + 2 criancas: a crianca nao entra no escalonado */
t('4 adultos + 2 crianças', preco('natal', 6, 2).total === 3 * 195 + 225 + 2 * 95, String(preco('natal', 6, 2).total));
t('criança nunca paga o valor tardio',
   !preco('natal', 6, 2).linhas.some(l => l.crianca && l.valor !== 95));
const linhas = preco('natal', 4, 1).linhas;
t('as linhas separam adulto de criança',
   linhas.filter(l => l.crianca).length === 1 && linhas.filter(l => !l.crianca).length >= 1,
   JSON.stringify(linhas));

console.log('criança ocupa vaga como qualquer pessoa');
vm.runInContext(`Bookings.create({ tourId: 'natal', date: '2026-12-05', time: '09h', name: 'Ana',
  email: 'a@x.com', whats: '+55', pax: 3, criancas: 1, policy: 'split', origin: 'site' });`, ctx);
const nova = vm.runInContext('DB.bookings[0]', ctx);
t('a reserva guarda quantas são crianças', nova.criancas === 1);
t('pax é o total de gente', nova.pax === 3);
t('o total gravado é o mesmo da tela', nova.total === 485, String(nova.total));
t('a saída perdeu 3 vagas, não 2',
   vm.runInContext(`Cal.seatsLeft('natal', '2026-12-05', '09h', 7)`, ctx) === 4);

console.log('lixo não vira conta torta');
t('mais crianças que gente não estoura', preco('natal', 2, 9, '2027-01-01').total === 2 * 95, String(preco('natal', 2, 9, '2027-01-01').total));
t('criança negativa é ignorada', preco('natal', 2, -3, '2027-01-01').total === 390, String(preco('natal', 2, -3, '2027-01-01').total));
t('criança guardada nunca passa do total de gente',
   vm.runInContext(`Bookings.create({ tourId: 'simples', date: '2026-12-06', time: '09h', name: 'B',
     email: 'b@x.com', whats: '', pax: 2, criancas: 9, policy: 'full', origin: 'site' }).criancas`, ctx) === 2);

console.log('a tela');
t('passo 2 mostra adultos e crianças em linhas separadas',
   /id="pax"/.test(app) && /id="kids"/.test(app) && /adultosLbl/.test(app) && /criancasLbl/.test(app));
t('as duas linhas só aparecem quando há preço de criança', /temCrianca\(x\) \? `/.test(app));
t('sempre sobra pelo menos um adulto',
   /S\.pax - S\.criancas <= 1\) return toast\(t\('precisaAdulto'\)\)/.test(app));
t('o botão de criança soma no total de gente',
   /\$\('#kpl'\)\.onclick[^]*?S\.pax\+\+; S\.criancas\+\+/.test(app));
t('criança respeita a lotação da saída',
   /\$\('#kpl'\)\.onclick[^]*?cabeMais\(\)/.test(app));
t('a reserva leva as crianças para o store', /criancas: S\.criancas/.test(app));
t('a página do passeio anuncia o valor de criança', /precoCrianca/.test(app));
t('o editor tem os dois campos', /id="fChildPrice"/.test(app) && /id="fChildAge"/.test(app));
t('o editor salva os dois', /priceChild: Math\.max\(0/.test(app) && /childAge:   Math\.max\(1/.test(app));
t('reserva lançada à mão também aceita criança',
   /id="nrKids"/.test(app) && /criancas: \+\$\('#nrKids'\)\.value/.test(app));
t('a lista mostra a divisão', /paxComKids/.test(app));

console.log('o cartão cobra o total, sem saber de idade');
const f = fs.readFileSync(SERVE + '/supabase/functions/pagar/index.ts', 'utf8');
const i = f.indexOf('function centavosDevidos');
eval(f.slice(i, f.indexOf('Deno.serve')).replace(/:\s*any/g, '').replace(/:\s*number/g, ''));
t('485 com sinal de 50% = 24300 centavos',
   centavosDevidos({ total: 485, policy: 'split', payments: [] }) === 24300,
   String(centavosDevidos({ total: 485, policy: 'split', payments: [] })));
t('a função do cartão não lê nada de criança', !/crianc|child/i.test(f));

console.log(falhas ? `\n${falhas} FALHA(S)` : '\ntudo passou');
process.exit(falhas ? 1 : 0);
