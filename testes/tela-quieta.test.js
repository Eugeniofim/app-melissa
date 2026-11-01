/* A TELA NÃO SOBE SOZINHA (30/10/2026 — provado no app da Dulcineia, "a tela sobe pra cima toda hora").
   Com o site aberto em duas abas (ou o app instalado junto com o navegador), cada gravação de uma delas
   (abrir, sincronia de 25 s, salvar) fazia o vigia do nuvem-itens.js chamar route() na outra: a página
   voltava ao topo e o que estava digitado sumia. O mesmo acontecia quando a nuvem trazia algo.
   O que não pode voltar: */
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const R = __dirname + '/..';
let falhas = 0; const casos = []; const t_ = (n, f) => casos.push([n, f]);
const app = fs.readFileSync(R + '/app.js', 'utf8');
const nuvem = fs.readFileSync(R + '/nuvem-itens.js', 'utf8');
const MARCA = '_assinaturaTela = assinaturaTela();';
const corpoDe = (src, ini) => { const i = src.indexOf(ini); return i < 0 ? '' : src.slice(i, src.indexOf('\n}\n', i) + 2); };

/* o redesenho suave do app.js + o vigia do nuvem-itens.js, rodando sobre uma página de mentira */
function pagina() {
  const ini = app.indexOf('let _assinaturaTela'), fim = app.indexOf('\n}\n', app.indexOf('function redesenhaSuave')) + 3;
  assert.ok(ini >= 0 && fim > ini, 'app.js sem o bloco do redesenho suave');
  const campo = (id, v) => ({ id, type: 'text', tagName: 'INPUT', value: v, defaultValue: v });
  const ctx = { JSON, String, Math, Object, setTimeout: () => 0, requestAnimationFrame: (f) => f(), rotas: 0, y: 0, ocupado: false, pendingSync: false };
  ctx.campos = { obs: campo('obs', ''), nome: campo('nome', '') };
  ctx.document = { activeElement: null, body: { classList: { add() {}, remove() {} } }, documentElement: { style: {} },
    querySelectorAll: () => Object.values(ctx.campos), getElementById: (id) => ctx.campos[id] };
  ctx.app = { offsetHeight: 3000, style: {} };
  vm.createContext(ctx);
  vm.runInContext(`
    var DB = { tours: [1], settings: {}, _itensEmDia: 1 }, ITENS_COLS = ['pedidos'], DB_KEY = 'db-teste';
    var isBusyEditing = () => ocupado, fillSettings = (s) => s, itConhecer = () => {};
    var scrollTo = (x, v) => { y = v; };
    Object.defineProperty(this, 'scrollY', { get: () => y });
    /* o route() de verdade redesenha: os campos voltam ao que está guardado e a página vai ao topo */
    var route = () => { rotas++; for (const c of Object.values(campos)) c.value = c.defaultValue; y = 0; ${MARCA} };
  `, ctx);
  vm.runInContext(app.slice(ini, fim).replace(/^(const|let) /gm, 'var '), ctx);
  vm.runInContext(MARCA, ctx);
  /* o vigia: a função que o nuvem-itens.js entrega ao addEventListener('storage', …) */
  const k = nuvem.indexOf("addEventListener('storage', ");
  assert.ok(k >= 0, 'nuvem-itens.js sem o vigia de outra aba');
  const a = k + "addEventListener('storage', ".length;
  vm.runInContext('var vigia = ' + nuvem.slice(a, nuvem.indexOf('\n});', a) + 2), ctx);
  return ctx;
}
const run = (c, js) => vm.runInContext(js, c);
const outraAbaGravou = (c, db) => run(c, `vigia({ key: DB_KEY, newValue: ${JSON.stringify(JSON.stringify(db))} })`);

t_('outra aba gravou algo novo: redesenha na MESMA altura e devolve o que foi digitado (antes: topo)', () => {
  const c = pagina();
  run(c, `y = 1500; campos.nome.value = 'Eugênio'`);
  outraAbaGravou(c, { tours: [1, 2], settings: {} });
  assert.strictEqual(c.rotas, 1, 'redesenhou');
  assert.strictEqual(c.y, 1500, 'continua na mesma altura');
  assert.strictEqual(run(c, 'campos.nome.value'), 'Eugênio', 'o que foi digitado ficou');
  assert.strictEqual(run(c, 'document.documentElement.style.scrollBehavior'), 'auto', 'sem rolagem suave durante a troca');
  assert.strictEqual(run(c, 'app.style.minHeight'), '3000px', 'a página não encolhe enquanto as fotos carregam');
});

t_('outra aba gravou o MESMO de antes (load, sincronia de 25 s): a tela fica quieta', () => {
  const c = pagina();
  run(c, `y = 1500`);
  outraAbaGravou(c, { tours: [1], settings: {}, _itensEmDia: 2 });   /* só a marca interna mudou */
  assert.strictEqual(c.rotas, 0); assert.strictEqual(c.y, 1500);
});

t_('outra aba gravou enquanto esta digita: não redesenha, deixa para depois', () => {
  const c = pagina();
  run(c, `ocupado = true; y = 900`);
  outraAbaGravou(c, { tours: [7], settings: {} });
  assert.strictEqual(c.rotas, 0); assert.strictEqual(c.pendingSync, true); assert.strictEqual(c.y, 900);
});

t_('o vigia passa pelo redesenho suave (nunca route() direto)', () => {
  const v = nuvem.slice(nuvem.indexOf("addEventListener('storage'"), nuvem.indexOf('\n});', nuvem.indexOf("addEventListener('storage'")));
  assert.match(v, /if \(typeof redesenhaSuave === 'function'\) redesenhaSuave\(\);/);
});

t_('a nuvem e a sincronia por linha também redesenham pelo suave', () => {
  const c0 = app.indexOf('\ncloudStart((r) =>');
  assert.ok(c0 >= 0, 'app.js sem cloudStart');
  const nv = app.slice(c0, app.indexOf('\n});', c0));
  assert.match(nv, /redesenhaSuave\(\)/);
  /* o único route() que pode ficar é o do primeiro desenho, quando a nuvem chega num aparelho novo */
  nv.split('\n').filter(l => /\broute\(/.test(l)).forEach(l => assert.match(l, /NUVEM_ESPERANDO/, 'cloudStart ainda chama route(): ' + l.trim()));
  for (const f of fs.readdirSync(R).filter(f => f.endsWith('.js') && f !== 'nuvem-itens.js')) {
    const src = fs.readFileSync(R + '/' + f, 'utf8');
    for (const m of src.matchAll(/itLigar\(\(\)[^\n]*/g)) assert.match(m[0], /redesenhaSuave\(\)/, f + ': ' + m[0]);
  }
});

t_('toda saída do route() guarda a assinatura do que ficou na tela', () => {
  const r = corpoDe(app, '\nfunction route(');
  assert.ok(r.trimEnd().split('\n').slice(-2).join('\n').includes(MARCA), 'a saída normal do route()');
  if (r.includes('ROTAS_EXTRA')) assert.ok(r.split(MARCA).length - 1 >= 2, 'a saída das rotas dos módulos (ROTAS_EXTRA)');
});

t_('durante o redesenho, sem a animação de entrada', () => {
  assert.match(fs.readFileSync(R + '/index.html', 'utf8'), /body\.sem-anima #app>\*/);
});

(async () => {
  for (const [n, f] of casos) {
    try { await f(); console.log('  ok  ' + n); } catch (e) { falhas++; console.log('  FALHOU  ' + n + '\n        ' + e.message); }
  }
  process.exit(falhas ? 1 : 0);
})();
