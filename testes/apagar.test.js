/* Apagar reserva no painel (pedido da Melissa, 03/09/2026).

   O perigo aqui é a reserva VOLTAR. Se o app apagasse primeiro no aparelho e
   o banco recusasse, a próxima sincronia baixaria a reserva de novo e ela
   reapareceria sozinha — e ninguém entende esse tipo de bug. Por isso:

     1. só sai do aparelho DEPOIS que o banco confirmou;
     2. o banco responde 200 mesmo recusando (a trava RLS simplesmente não
        apaga linha nenhuma), então contamos as linhas que voltaram;
     3. reserva que ainda não subiu é apagada só aqui — e o envio que estava
        na fila é descartado, senão a fila a recriaria quando a rede voltasse.

   E cancelar é outra coisa: libera a vaga e MANTÉM o registro. */
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const SERVE = [__dirname + '/..', __dirname + '/../serve'].find(d => fs.existsSync(d + '/cloud.js'));
const app = fs.readFileSync(SERVE + '/app.js', 'utf8');
let falhas = 0; const casos = [];
const t = (n, f) => casos.push([n, f]);

/* mundo mínimo: store + cloud, com a rede dublada */
function amb({ respostaDelete = { ok: true, linhas: 1 }, naNuvem = true } = {}) {
  const chamadas = [];
  const ctx = { console, JSON, AbortController, Date, Math, Number, Object, Array, String, Set, setTimeout, clearTimeout,
    localStorage: { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } },
    fetch: async (u, o = {}) => {
      chamadas.push({ url: String(u), metodo: o.method || 'GET', prefer: (o.headers || {}).Prefer });
      if (o.method === 'DELETE') {
        if (!respostaDelete.ok) throw new Error('sem rede');
        return { ok: true, status: 200, json: async () => new Array(respostaDelete.linhas).fill({ id: 'b1' }) };
      }
      if (String(u).includes('appstate')) return { ok: true, status: 200, json: async () => [{ data: { tours: [{ id: 'x' }], rules: [], departures: [], blocks: [], coupons: [], settings: {} }, updated_at: '2026-09-03T10:00:00Z' }] };
      if (String(u).includes('bookings')) return { ok: true, status: 200, json: async () => [] };
      return { ok: true, status: 200, json: async () => [] };
    } };
  ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(SERVE + '/store.js', 'utf8'), ctx);
  vm.runInContext(`load();
    DB.tours = [{ id: 'natal', price: 100, max: 7 }];
    DB.bookings = [
      { id: 'b1', code: 'VI-1', name: 'Ana Silva', tourId: 'natal', date: '2026-12-05', time: '09h',
        pax: 2, total: 390, payments: [], status: 'confirmed', createdAt: '2026-09-01T00:00:00Z', naNuvem: ${naNuvem} },
      { id: 'b2', code: 'VI-2', name: 'Bia', tourId: 'natal', date: '2026-12-05', time: '09h',
        pax: 1, total: 195, payments: [], status: 'confirmed', createdAt: '2026-09-01T00:00:00Z', naNuvem: true }
    ];`, ctx);
  ctx.isLoggedIn = () => true; ctx.authEnsure = async () => {}; ctx.authToken = () => 'tok';
  vm.runInContext(fs.readFileSync(SERVE + '/cloud.js', 'utf8'), ctx);
  ctx.__chamadas = chamadas;
  /* JSON.parse aqui de proposito: array criado dentro do vm nao e o mesmo
     Array deste lado, e deepStrictEqual reprova por causa do prototipo. */
  ctx.ids = () => JSON.parse(vm.runInContext('JSON.stringify(DB.bookings.map(b => b.id))', ctx));
  ctx.fila = () => JSON.parse(ctx.localStorage.getItem('vi_queue_v1') || '[]');
  return ctx;
}
const apaga = (c, id = 'b1') => vm.runInContext(`cloudDeleteBooking(DB.bookings.find(b => b.id === '${id}'))`, c);

console.log('apagar de vez');

t('banco confirmou: some do aparelho', async () => {
  const c = amb(); const r = await apaga(c);
  assert.strictEqual(r.ok, true); assert.strictEqual(r.linhas, 1);
  vm.runInContext("Bookings.apagarLocal('b1')", c);
  assert.deepStrictEqual(c.ids(), ['b2']);
});

t('manda DELETE pedindo as linhas de volta', async () => {
  const c = amb(); await apaga(c);
  const d = c.__chamadas.find(x => x.metodo === 'DELETE');
  assert.ok(d, 'nao mandou DELETE');
  assert.ok(d.url.includes('bookings?id=eq.b1'), d.url);
  assert.strictEqual(d.prefer, 'return=representation', 'sem isso nao da para contar o que foi apagado');
});

t('banco recusou (zero linhas): NAO apaga do aparelho', async () => {
  const c = amb({ respostaDelete: { ok: true, linhas: 0 } });
  const r = await apaga(c);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.linhas, 0, 'zero linhas = a trava do banco recusou');
  assert.deepStrictEqual(c.ids(), ['b1', 'b2'], 'a reserva tem que continuar aí');
});

t('sem rede: NAO apaga do aparelho', async () => {
  const c = amb({ respostaDelete: { ok: false } });
  const r = await apaga(c);
  assert.strictEqual(r.ok, false);
  assert.deepStrictEqual(c.ids(), ['b1', 'b2']);
});

t('reserva que ainda nao subiu: apaga so aqui, sem rede', async () => {
  const c = amb({ naNuvem: false });
  const r = await apaga(c);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.soLocal, true);
  assert.strictEqual(c.__chamadas.filter(x => x.metodo === 'DELETE').length, 0, 'nao existe la, nao ha o que apagar');
});

t('apagada sai da fila de envio', async () => {
  const c = amb();
  vm.runInContext("qPush({ path: 'bookings', method: 'POST', body: { id: 'b1', data: {} } });"
                + "qPush({ path: 'bookings?id=eq.b1', method: 'PATCH', body: {} });"
                + "qPush({ path: 'bookings', method: 'POST', body: { id: 'b2', data: {} } });", c);
  assert.strictEqual(c.fila().length, 3);
  await apaga(c);
  const f = c.fila();
  assert.strictEqual(f.length, 1, 'sobrou envio da reserva apagada: ela voltaria do tumulo');
  assert.strictEqual(f[0].body.id, 'b2', 'apagou o envio da reserva errada');
});

t('recusa NAO mexe na fila', async () => {
  const c = amb({ respostaDelete: { ok: true, linhas: 0 } });
  vm.runInContext("qPush({ path: 'bookings', method: 'POST', body: { id: 'b1', data: {} } });", c);
  await apaga(c);
  assert.strictEqual(c.fila().length, 1, 'a reserva nao foi apagada; o envio dela tem que continuar na fila');
});

t('a sincronia NAO ressuscita a reserva apagada', async () => {
  const c = amb();
  await apaga(c);
  vm.runInContext("Bookings.apagarLocal('b1')", c);
  await vm.runInContext('cloudPull()', c);
  assert.ok(!c.ids().includes('b1'), 'a reserva voltou do tumulo depois da sincronia');
});

t('apagarLocal so mexe na reserva pedida', async () => {
  const c = amb();
  assert.strictEqual(vm.runInContext("Bookings.apagarLocal('b1')", c), true);
  assert.deepStrictEqual(c.ids(), ['b2']);
  assert.strictEqual(vm.runInContext("Bookings.apagarLocal('naoexiste')", c), false);
  assert.deepStrictEqual(c.ids(), ['b2']);
});

console.log('só cancelar');

t('cancelar mantem o registro e libera a vaga', async () => {
  const c = amb();
  const antes = vm.runInContext("Cal.seatsLeft('natal', '2026-12-05', '09h', 7)", c);
  vm.runInContext("Bookings.cancel('b1')", c);
  const depois = vm.runInContext("Cal.seatsLeft('natal', '2026-12-05', '09h', 7)", c);
  assert.deepStrictEqual(c.ids(), ['b1', 'b2'], 'cancelar nao apaga');
  assert.strictEqual(vm.runInContext("Bookings.get('b1').status", c), 'cancelled');
  assert.strictEqual(depois, antes + 2, 'a vaga das 2 pessoas tinha que voltar');
});

t('apagar tambem libera a vaga', async () => {
  const c = amb();
  const antes = vm.runInContext("Cal.seatsLeft('natal', '2026-12-05', '09h', 7)", c);
  vm.runInContext("Bookings.apagarLocal('b1')", c);
  const depois = vm.runInContext("Cal.seatsLeft('natal', '2026-12-05', '09h', 7)", c);
  assert.strictEqual(depois, antes + 2);
});

console.log('a tela');

t('cada linha tem o botao de apagar', async () => {
  assert.ok(/data-del="\$\{esc\(b\.id\)\}"/.test(app), 'sem botao na linha');
});
t('o menu oferece cancelar E apagar', async () => {
  assert.ok(/data-dcancel/.test(app) && /data-dapaga/.test(app) && /data-dnao/.test(app));
});
t('apagar pergunta antes', async () => {
  const i = app.indexOf("$('[data-dapaga]', cx).onclick");
  assert.ok(i > 0 && /confirm\(aviso\)/.test(app.slice(i, i + 700)), 'apagou sem perguntar');
});
t('avisa quando ha dinheiro registrado', async () => {
  assert.ok(/pago > 0 \? t\('apagarDinheiro'/.test(app), 'ela tem que saber que o valor sai do extrato');
});
t('so apaga do aparelho depois do banco', async () => {
  const i = app.indexOf("$('[data-dapaga]', cx).onclick");
  const bloco = app.slice(i, i + 900);
  assert.ok(bloco.indexOf('cloudDeleteBooking') < bloco.indexOf('apagarLocal'),
    'apagar no aparelho antes do banco faz a reserva voltar na proxima sincronia');
});
t('recusa e falta de rede tem mensagens diferentes', async () => {
  assert.ok(/apagarErro/.test(app) && /apagarSemRede/.test(app));
});
t('cancelar pergunta antes tambem', async () => {
  const i = app.indexOf('btCancelar.onclick');
  assert.ok(i > 0 && /confirm\(t\('cancelarPerg'/.test(app.slice(i, i + 300)));
});

console.log('o banco precisa deixar');

t('existe o SQL da politica de apagar', async () => {
  const sql = fs.readFileSync(SERVE + '/APAGAR-RESERVAS.sql', 'utf8');
  assert.ok(/for delete to authenticated/.test(sql) && /is_owner\(\)/.test(sql));
});
t('a politica tambem esta no SEGURANCA.sql', async () => {
  const sql = fs.readFileSync(SERVE + '/SEGURANCA.sql', 'utf8');
  assert.ok(/bk_delete_owner/.test(sql) && /for delete to authenticated/.test(sql));
});

(async () => {
  for (const [n, f] of casos) {
    try { await f(); console.log('  ok   ' + n); }
    catch (e) { falhas++; console.log('  FALHA ' + n + '\n       ' + e.message); }
  }
  console.log(falhas ? `\n${falhas} FALHA(S)` : '\ntudo passou');
  process.exit(falhas ? 1 : 0);
})();
