/* As vagas que o cliente vê têm que ser as de agora.

   Em 06/09/2026 a Melissa mandou prints: datas SEM reserva nenhuma
   anunciando "5 vagas", e uma reserva manual de 4 pessoas que não descontou
   nada. Duas causas diferentes, as duas aqui:

   1. O aparelho congelava a contagem. Para não baixar 1 MB de catálogo a
      cada 25 s, o app pergunta só a data da última alteração; se o catálogo
      não mudou, parava ali. Só que a disponibilidade muda SEM o catálogo
      mudar — alguém reserva, ela apaga uma reserva. Resultado: a tela ficava
      com a contagem de dias antes. Pior, a assinatura de "nada mudou" era
      conferida ANTES de gravar no aparelho: a contagem nova era baixada,
      aplicada na memória e jogada fora.

   2. O horário da reserva lançada à mão era digitado. Ela pôs "09:00" num
      dia cuja saída se chama "10:00 as 18h" — a reserva entrou, mas em uma
      saída que não existe, e o site seguiu oferecendo os 7 lugares. */
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const SERVE = [__dirname + '/..', __dirname + '/../serve'].find(d => fs.existsSync(d + '/cloud.js'));
const app = fs.readFileSync(SERVE + '/app.js', 'utf8');
let falhas = 0; const casos = [];
const t = (n, f) => casos.push([n, f]);

/* mundo mínimo de VISITANTE (é quem enxerga pela contagem pública) */
function amb() {
  const nuvem = { updated_at: '2026-09-06T10:00:00Z', vagas: [] };
  const ctx = { console, JSON, AbortController, Date, Math, Number, Object, Array, String, Set, setTimeout, clearTimeout,
    localStorage: { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } },
    fetch: async (u) => {
      const s = String(u);
      if (s.includes('seat_counts')) return { ok: true, json: async () => JSON.parse(JSON.stringify(nuvem.vagas)) };
      if (s.includes('appstate')) return { ok: true, json: async () => [{ data: {
        tours: [{ id: 'vinhos', price: 195, max: 7 }], rules: [], blocks: [], coupons: [], settings: {},
        departures: [{ id: 'd1', tourId: 'vinhos', date: '2026-12-17', time: '10:00 as 18h', capacity: 7 }],
      }, updated_at: nuvem.updated_at }] };
      return { ok: true, json: async () => [] };
    } };
  ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(SERVE + '/store.js', 'utf8'), ctx);
  vm.runInContext('load(); DB.tours = []; DB.bookings = [];', ctx);
  ctx.isLoggedIn = () => false; ctx.authEnsure = async () => {}; ctx.authToken = () => null;
  vm.runInContext(fs.readFileSync(SERVE + '/cloud.js', 'utf8'), ctx);
  ctx.nuvem = nuvem;
  ctx.pull = () => vm.runInContext('cloudPull()', ctx);
  ctx.vagasNaTela = () => vm.runInContext("Cal.seatsLeft('vinhos','2026-12-17','10:00 as 18h',7)", ctx);
  ctx.vagasGravadas = () => (JSON.parse(ctx.localStorage.getItem('vi_db_v1') || '{}').seatCounts || []).length;
  ctx.contagemNaMemoria = () => JSON.parse(vm.runInContext('JSON.stringify(DB.seatCounts || [])', ctx));
  return ctx;
}
const linha = (pax) => ({ tour_id: 'vinhos', date: '2026-12-17', time: '10:00 as 18h', pax });

console.log('a contagem não pode congelar');

t('primeira leitura traz as vagas', async () => {
  const c = amb(); c.nuvem.vagas = [linha(2)];
  await c.pull();
  assert.strictEqual(c.vagasNaTela(), 5, '7 lugares menos 2 reservados');
});

t('reserva nova chega mesmo sem o catálogo mudar', async () => {
  const c = amb(); c.nuvem.vagas = [linha(2)];
  await c.pull();
  c.nuvem.vagas = [linha(4)];              /* alguem reservou mais 2 */
  const r = await c.pull();                /* updated_at continua o mesmo */
  assert.strictEqual(r.vagasMudaram, true, 'passou batido: a tela ficaria com o numero velho');
  assert.strictEqual(c.vagasNaTela(), 3);
});

t('reserva apagada devolve a vaga', async () => {
  const c = amb(); c.nuvem.vagas = [linha(2)];
  await c.pull();
  c.nuvem.vagas = [];                      /* ela apagou a reserva no painel */
  const r = await c.pull();
  assert.strictEqual(r.vagasMudaram, true);
  assert.strictEqual(c.vagasNaTela(), 7, 'foi este o print dela: 5 vagas num dia sem reserva');
});

t('a contagem nova é GRAVADA no aparelho', async () => {
  const c = amb(); c.nuvem.vagas = [linha(2)];
  await c.pull();
  c.nuvem.vagas = [];
  await c.pull();
  assert.strictEqual(c.vagasGravadas(), 0,
    'sem gravar, o proximo load lia a contagem velha do localStorage e voltava a mentir');
});

t('nada mudou mesmo: continua barato', async () => {
  const c = amb(); c.nuvem.vagas = [linha(2)];
  await c.pull();
  const r = await c.pull();
  assert.strictEqual(r.semMudanca, true, 'sem mudanca nao pode redesenhar a tela a toa');
});

t('contagem ilegível não apaga a que já existe', async () => {
  const c = amb(); c.nuvem.vagas = [linha(2)];
  await c.pull();
  const antes = c.contagemNaMemoria();
  vm.runInContext("fetch = async (u) => String(u).includes('seat_counts') ? { ok: true, json: async () => { throw new Error('lixo'); } } : { ok: true, json: async () => [{ updated_at: '2026-09-06T10:00:00Z' }] };", c);
  await c.pull();
  assert.deepStrictEqual(c.contagemNaMemoria(), antes, 'preferir a contagem velha a nenhuma');
});

t('a assinatura do caminho completo inclui as vagas', async () => {
  const src = fs.readFileSync(SERVE + '/cloud.js', 'utf8');
  assert.ok(/const assinatura =[^;]*JSON\.stringify\(DB\.seatCounts \|\| \[\]\)/.test(src),
    'sem isso o "semMudanca" sai antes de gravar e joga a contagem nova fora');
});

console.log('o horário da reserva à mão é escolhido, não digitado');

t('o campo virou lista das saídas do dia', async () => {
  assert.ok(/<select id="nrHora">/.test(app), 'continua campo livre');
  assert.ok(/Cal\.departures\(tourId, data, data\)/.test(app), 'a lista tem que vir das saidas de verdade');
});
t('cada opção mostra quantas vagas restam', async () => {
  const i = app.indexOf('const nrHoras =');
  assert.ok(/Cal\.seatsLeft\(tourId, d\.date, d\.time, d\.capacity\)/.test(app.slice(i, i + 900)));
});
t('trocar passeio ou dia refaz a lista', async () => {
  assert.ok(/\['#nrTour', '#nrData'\]\.forEach[^]*?nrHoras\(\); nrRecalcula\(\);/.test(app));
});
t('dia sem saída publicada avisa em vez de mentir', async () => {
  const i = app.indexOf('const nrHoras =');
  assert.ok(/nrSemSaida/.test(app.slice(i, i + 1200)), 'ela precisa saber que aquilo nao tira vaga');
});

console.log('a conta em si');

t('7 lugares, 4 pessoas: sobram 3', async () => {
  const c = amb(); c.nuvem.vagas = [linha(4)];
  await c.pull();
  assert.strictEqual(c.vagasNaTela(), 3, 'foi o que ela esperava ver depois da reserva manual de 4');
});
t('reserva num horário que não existe não some com vaga alheia', async () => {
  const c = amb();
  c.nuvem.vagas = [{ tour_id: 'vinhos', date: '2026-12-17', time: '09:00', pax: 4 }];
  await c.pull();
  assert.strictEqual(c.vagasNaTela(), 7,
    'a saida das 10:00 continua cheia de vagas — e por isso o horario agora e escolhido');
});
t('lotado não vira número negativo', async () => {
  const c = amb(); c.nuvem.vagas = [linha(99)];
  await c.pull();
  assert.strictEqual(c.vagasNaTela(), 0);
});

(async () => {
  for (const [n, f] of casos) {
    try { await f(); console.log('  ok   ' + n); }
    catch (e) { falhas++; console.log('  FALHA ' + n + '\n       ' + e.message); }
  }
  console.log(falhas ? `\n${falhas} FALHA(S)` : '\ntudo passou');
  process.exit(falhas ? 1 : 0);
})();
