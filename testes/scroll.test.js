/* "Quando eu desco o scroll, de tempo em tempo ele puxa la pra cima" —
   Melissa, 03/09/2026, nos Ajustes e no app inteiro.

   Duas causas, dois remedios, cada um com teste:
   1. A sincronia (25 em 25 s) baixava a nuvem e REAPLICAVA tudo mesmo sem
      nada ter mudado — e cada aplicacao redesenhava a tela. Agora, se a
      nuvem devolve o mesmo de antes, cloudPull responde "semMudanca" e nada
      e redesenhado.
   2. Quando redesenha por causa da sincronia, route() voltava para o topo.
      Agora a sincronia chama route({ manterScroll: true }).
   E um terceiro, que era perda de dados: campo com texto nao salvo era
   redesenhado se ela tirasse o foco para rolar. Formulario sujo = ocupada. */
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const SERVE = [__dirname + '/..', __dirname + '/../serve'].find(d => fs.existsSync(d + '/cloud.js'));
const app = fs.readFileSync(SERVE + '/app.js', 'utf8');
let falhas = 0; const casos = [];
const t = (n, f) => casos.push([n, f]);

/* ---------- 1. cloudPull sem mudanca ---------- */
function amb() {
  const nuvem = { updated_at: '2026-09-03T10:00:00Z', bookings: [{ data: { id: 'b1', name: 'Ana', createdAt: '2026-09-01T00:00:00Z', payments: [] } }] };
  const ctx = { console, JSON, AbortController, Date, Math, Number, Object, Array, String, Set, setTimeout, clearTimeout,
    localStorage: { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } },
    fetch: async (u) => {
      const s = String(u);
      if (s.includes('appstate')) return { ok: true, json: async () => [{ data: { tours: [{ id: 'x' }], rules: [], departures: [], blocks: [], coupons: [], settings: {} }, updated_at: nuvem.updated_at }] };
      /* copia nova a cada resposta, como a rede de verdade: o app marca naNuvem nos objetos que recebe */
      if (s.includes('bookings')) return { ok: true, json: async () => JSON.parse(JSON.stringify(nuvem.bookings)) };
      return { ok: true, json: async () => [] };
    } };
  ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(SERVE + '/store.js', 'utf8'), ctx);
  vm.runInContext('load(); DB.tours=[]; DB.bookings=[];', ctx);
  ctx.isLoggedIn = () => true; ctx.authEnsure = async () => {}; ctx.authToken = () => 'tok';
  vm.runInContext(fs.readFileSync(SERVE + '/cloud.js', 'utf8'), ctx);
  return { ctx, nuvem, pull: () => vm.runInContext('cloudPull()', ctx) };
}

console.log('sincronia sem mudanca nao redesenha');
t('primeira rodada aplica a nuvem', async () => {
  const a = amb(); const r = await a.pull();
  assert.strictEqual(!!r.semMudanca, false);
  assert.strictEqual(vm.runInContext('DB.bookings.length', a.ctx), 1);
});
t('segunda rodada, nuvem igual: semMudanca', async () => {
  const a = amb(); await a.pull(); const r = await a.pull();
  assert.strictEqual(r.semMudanca, true, 'reaplicar o mesmo e o que puxava a tela para o topo');
});
t('mudou a data do estado: aplica de novo', async () => {
  const a = amb(); await a.pull(); a.nuvem.updated_at = '2026-09-03T11:00:00Z';
  const r = await a.pull(); assert.strictEqual(!!r.semMudanca, false);
});
t('chegou reserva nova: aplica e avisa', async () => {
  const a = amb(); await a.pull();
  a.nuvem.bookings.push({ data: { id: 'b2', name: 'Bia', createdAt: '2026-09-02T00:00:00Z', payments: [] } });
  const r = await a.pull(); assert.strictEqual(!!r.semMudanca, false);
  assert.strictEqual((r.fresh || []).length, 1, 'a reserva nova tem que aparecer como fresh');
});
t('pagamento registrado na reserva: aplica de novo', async () => {
  const a = amb(); await a.pull();
  a.nuvem.bookings[0].data.payments.push({ amount: 195 });
  const r = await a.pull(); assert.strictEqual(!!r.semMudanca, false);
});

/* ---------- 2. redesenho mantendo a posicao ---------- */
console.log('redesenho pela sincronia mantem a posicao');
t('route aceita manterScroll', async () => {
  assert.ok(/function route\(opts\)/.test(app) && /opts\.manterScroll/.test(app));
  assert.ok(/scrollTo\(\{ top: y, left: 0, behavior: 'instant' \}\)/.test(app), 'sem behavior instant, o smooth do CSS anima a volta');
});
t('a sincronia chama route com manterScroll', async () => {
  const i = app.indexOf('cloudStart((r) =>'); assert.ok(i > 0);
  assert.ok(/route\(\{ manterScroll: true \}\)/.test(app.slice(i)), 'a sincronia ainda chama route() seco');
});
t('navegar normal continua indo para o topo', async () => {
  assert.ok(/else scrollTo\(0, 0\);/.test(app));
});

/* ---------- 3. formulario sujo e "ocupada" ---------- */
console.log('campo com texto nao salvo protege a tela');
const i = app.indexOf('function isBusyEditing'), f = app.indexOf("addEventListener('hashchange'", i);
assert.ok(i > 0 && f > i);
function ocupada({ campos, hash = '#/adm/settings' }) {
  global.location = { hash };
  global.viewTour = { _s: null };
  global.document = { querySelector: () => null, activeElement: null, querySelectorAll: () => campos };
  eval(app.slice(i, f));
  return isBusyEditing();
}
const campo = (o) => ({ tagName: 'TEXTAREA', type: 'textarea', value: '', defaultValue: '', readOnly: false, disabled: false, ...o });
t('textarea com texto novo e sem foco: ocupada', async () => {
  assert.strictEqual(ocupada({ campos: [campo({ value: 'Oi Melissa', defaultValue: '' })] }), true);
});
t('tudo igual ao que veio da tela: livre', async () => {
  assert.strictEqual(ocupada({ campos: [campo({ value: 'x', defaultValue: 'x' })] }), false);
});
t('caixa marcada que nao era: ocupada', async () => {
  assert.strictEqual(ocupada({ campos: [{ tagName: 'INPUT', type: 'checkbox', checked: true, defaultChecked: false }] }), true);
});
t('campo somente-leitura (codigo Pix) nao conta', async () => {
  assert.strictEqual(ocupada({ campos: [campo({ value: 'abc', defaultValue: '', readOnly: true })] }), false);
});
t('valor posto pelo app (data de hoje na reserva manual) nao conta', async () => {
  /* o app grava value E defaultValue quando preenche sozinho */
  assert.ok(/\$\('#nrData'\)\.value = \$\('#nrData'\)\.defaultValue = isoToday\(\)/.test(app));
  assert.ok(/\$\('#nrValor'\)\.value = \$\('#nrValor'\)\.defaultValue = pr\.total/.test(app));
});
t('sem querySelectorAll (DOM de teste) nao quebra', async () => {
  global.location = { hash: '#/' }; global.viewTour = { _s: null };
  global.document = { querySelector: () => null, activeElement: null };
  eval(app.slice(i, f));
  assert.strictEqual(isBusyEditing(), false);
});

(async () => {
  for (const [n, fn] of casos) {
    try { await fn(); console.log('  ok   ' + n); }
    catch (e) { falhas++; console.log('  FALHA ' + n + '\n       ' + e.message); }
  }
  console.log(falhas ? `\n${falhas} FALHA(S)` : '\ntudo passou');
  process.exit(falhas ? 1 : 0);
})();
