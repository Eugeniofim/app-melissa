/* 20/09/2026 — O PLANO GRATIS ESTOUROU: 13,4 GB em 17 dias.

   Causa: o catalogo dela tem 1,9 MB (as fotos das paradas ficam guardadas
   DENTRO do estado, em texto). O app tinha um atalho que perguntava so a
   data antes de baixar tudo — mas o atalho valia SO para quem nao estava
   logado. Logada, o painel baixava os 1,9 MB a cada 25 s. Uma aba aberta e
   esquecida = 6,5 GB por dia.

   Este teste mede o que sai do banco em cada rodada e trava o defeito:
   - logada, catalogo igual  -> NAO baixa o catalogo, mas baixa as reservas
   - logada, catalogo mudou  -> baixa e aplica
   - sem catalogo novo, os passeios que ja estao no aparelho NAO somem
   - o relogio nao bate com a aba escondida */
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const SERVE = [__dirname + '/..', __dirname + '/../serve'].find(d => fs.existsSync(d + '/cloud.js'));
let falhas = 0; const casos = []; const t = (n, f) => casos.push([n, f]);

const CATALOGO = {
  tours: [{ id: 'natal-fn', fotos: ['x'.repeat(200) ] }, { id: 'natal-vinhos' }],
  rules: [], departures: [{ tourId: 'natal-fn', date: '2026-12-05' }],
  blocks: [], coupons: [], settings: {},
};

function amb({ logada = true, stamp = '2026-08-30T00:00:00Z' } = {}) {
  const ctx = {
    console, JSON, AbortController, Date, Math, Number, Object, Array, String, Set,
    setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => {},
    document: { hidden: false, addEventListener: () => {} },
    addEventListener: () => {},
    localStorage: { _d: {}, getItem(k) { return this._d[k] ?? null },
      setItem(k, v) { this._d[k] = v }, removeItem(k) { delete this._d[k] } },
    /* cada chamada fica anotada com o caminho e o tamanho da resposta */
    __chamadas: [],
    __stamp: stamp,
  };
  ctx.fetch = async (u) => {
    const s = String(u);
    const anota = (rotulo, corpo) => {
      ctx.__chamadas.push({ rotulo, bytes: JSON.stringify(corpo).length });
      return { ok: true, json: async () => corpo };
    };
    if (s.includes('appstate') && s.includes('select=data'))
      return anota('CATALOGO', [{ data: CATALOGO, updated_at: ctx.__stamp }]);
    if (s.includes('appstate') && s.includes('select=updated_at'))
      return anota('data-so', [{ updated_at: ctx.__stamp }]);
    if (s.includes('bookings')) return anota('reservas', []);
    if (s.includes('seat_counts')) return anota('vagas', []);
    return anota('outro', []);
  };
  ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(SERVE + '/store.js', 'utf8'), ctx);
  vm.runInContext('load(); DB.tours=[]; DB.bookings=[];', ctx);
  ctx.isLoggedIn = () => logada; ctx.authEnsure = async () => {}; ctx.authToken = () => 'tok';
  ctx.onCloudRejected = () => {};
  vm.runInContext(fs.readFileSync(SERVE + '/cloud.js', 'utf8'), ctx);
  return ctx;
}
const rotulos = c => c.__chamadas.map(x => x.rotulo);
const bytes = c => c.__chamadas.reduce((n, x) => n + x.bytes, 0);
const passeios = c => vm.runInContext('DB.tours.map(t=>t.id)', c);
const zera = c => { c.__chamadas = []; };

console.log('gasto de banda na sincronia');

t('primeira rodada logada: baixa o catalogo (tem que baixar uma vez)', async () => {
  const c = amb(); await vm.runInContext('cloudPull()', c);
  assert.ok(rotulos(c).includes('CATALOGO'), 'a primeira vez precisa do catalogo');
  assert.strictEqual(JSON.stringify(passeios(c)), '["natal-fn","natal-vinhos"]');
});

t('LOGADA e catalogo igual: NAO baixa o catalogo de novo', async () => {
  const c = amb(); await vm.runInContext('cloudPull()', c);
  zera(c);
  await vm.runInContext('cloudPull()', c);
  assert.ok(!rotulos(c).includes('CATALOGO'),
    'era exatamente isto que queimava 1,9 MB a cada 25 s: ' + rotulos(c).join(','));
});

t('...mas continua baixando as reservas dela', async () => {
  const c = amb(); await vm.runInContext('cloudPull()', c);
  zera(c);
  await vm.runInContext('cloudPull()', c);
  assert.ok(rotulos(c).includes('reservas'),
    'ela precisa ver reserva nova na hora; isso nao pode ser cortado');
});

t('a rodada barata pesa menos de 10% da rodada cara', async () => {
  const c = amb(); await vm.runInContext('cloudPull()', c);
  const caro = bytes(c);
  zera(c); await vm.runInContext('cloudPull()', c);
  const barato = bytes(c);
  assert.ok(barato * 10 < caro, 'caro=' + caro + ' barato=' + barato);
});

t('LOGADA e o catalogo MUDOU: baixa e aplica', async () => {
  const c = amb(); await vm.runInContext('cloudPull()', c);
  c.__stamp = '2026-09-20T12:00:00Z';         /* ela editou um passeio */
  zera(c);
  await vm.runInContext('cloudPull()', c);
  assert.ok(rotulos(c).includes('CATALOGO'), 'mudou de verdade: tem que descer');
  assert.strictEqual(JSON.stringify(passeios(c)), '["natal-fn","natal-vinhos"]');
});

t('sem catalogo novo, os passeios do aparelho NAO somem', async () => {
  const c = amb(); await vm.runInContext('cloudPull()', c);
  await vm.runInContext('cloudPull()', c);
  await vm.runInContext('cloudPull()', c);
  assert.strictEqual(JSON.stringify(passeios(c)), '["natal-fn","natal-vinhos"]',
    'o risco do remendo era escrever vazio por cima — nao pode');
});

t('nem as datas, cupons e ajustes', async () => {
  const c = amb(); await vm.runInContext('cloudPull()', c);
  await vm.runInContext('cloudPull()', c);
  assert.strictEqual(vm.runInContext('DB.departures.length', c), 1, 'as saidas publicadas ficam');
  assert.ok(vm.runInContext('!!DB.settings', c), 'os ajustes ficam');
});

t('visitante com catalogo igual tambem nao baixa o catalogo', async () => {
  const c = amb({ logada: false }); await vm.runInContext('cloudPull()', c);
  zera(c); await vm.runInContext('cloudPull()', c);
  assert.ok(!rotulos(c).includes('CATALOGO'), rotulos(c).join(','));
});

t('o relogio nao bate com a aba escondida', async () => {
  const src = fs.readFileSync(SERVE + '/cloud.js', 'utf8');
  assert.ok(/setInterval\(\s*\(\)\s*=>\s*\{\s*if\s*\(!document\.hidden\)/.test(src),
    'aba escondida nao pode continuar baixando dia e noite');
});

t('e bate no maximo a cada 60 s', async () => {
  const src = fs.readFileSync(SERVE + '/cloud.js', 'utf8');
  const m = src.match(/if\s*\(!document\.hidden\)\s*tick\(\);\s*\}\s*,\s*(\d+)\)/);
  assert.ok(m, 'nao achei o intervalo do relogio');
  assert.ok(+m[1] >= 60000, 'intervalo curto demais: ' + m[1] + 'ms');
});

t('voltar pra aba busca na hora (nada fica velho na cara dela)', async () => {
  const src = fs.readFileSync(SERVE + '/cloud.js', 'utf8');
  assert.ok(/visibilitychange/.test(src) && /if \(!document\.hidden\) tick\(\)/.test(src),
    'sem isso, esconder a aba deixaria o painel parado');
});

(async () => {
  for (const [n, f] of casos) {
    try { await f(); console.log('  ok  ' + n) }
    catch (e) { falhas++; console.log('  FALHA ' + n + '\n       ' + e.message) }
  }
  console.log(falhas ? `\n${falhas} FALHA(S)` : '\ntudo passou');
  process.exit(falhas ? 1 : 0);
})();
