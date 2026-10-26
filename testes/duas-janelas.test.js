/* DUAS JANELAS NO MESMO NAVEGADOR (26/10/2026 — veio do app da Ingrid, que perdeu
   guias e folgas assim). As janelas dividem o localStorage (a SOMBRA), mas cada
   uma tem o seu DB na memória. A janela velha nunca pode apagar no banco o que a
   outra janela criou; apagar de propósito continua valendo e leva o conteúdo;
   e o "apagado vazio" do defeito é devolvido por quem ainda tem o registro. */
const fs = require('fs'), vm = require('vm');
const SERVE = [__dirname + '/..', __dirname + '/../serve'].find(d => fs.existsSync(d + '/index.html'));
let falhas = 0;
const ok = (n, c) => { if (c) console.log('  ok   ' + n); else { falhas++; console.log('  FALHA ' + n); } };

/* o banco de mentira (tabela itens, upsert por colecao+id, carimbo do servidor) */
const BANCO = new Map(); let relogio = 0;
const carimbo = () => new Date(Date.UTC(2026, 9, 26, 12, 0, 0) + (++relogio) * 1000).toISOString();
async function fakeFetch(url, opts = {}) {
  const u = String(url), met = opts.method || 'GET';
  const resp = (status, corpo) => ({ ok: status < 300, status, json: async () => corpo, text: async () => JSON.stringify(corpo) });
  if (!u.includes('/rest/v1/itens')) return resp(200, []);
  if (met === 'GET') {
    const m = u.match(/atualizado_em=gt\.([^&]+)/), gt = m ? decodeURIComponent(m[1]) : '';
    return resp(200, [...BANCO.values()].filter(l => l.atualizado_em > gt).sort((a, b) => a.atualizado_em.localeCompare(b.atualizado_em)));
  }
  if (met === 'POST') { for (const l of [].concat(JSON.parse(opts.body))) BANCO.set(l.colecao + '|' + l.id, { ...l, atualizado_em: carimbo() }); return resp(201, null); }
  return resp(200, []);
}
/* os scripts do app, na ordem do index.html, até o nuvem-itens.js */
const html = fs.readFileSync(SERVE + '/index.html', 'utf8');
const todos = [...html.matchAll(/<script[^>]+src="([^"?]+\.js)/g)].map(m => m[1]).filter(f => !/^https?:/.test(f) && fs.existsSync(SERVE + '/' + f));
const ate = todos.slice(0, todos.indexOf('nuvem-itens.js') + 1);
function janela(ls) {
  ls = ls || { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = String(v); }, removeItem(k) { delete this._d[k]; } };
  const ctx = { console: { log() {}, warn() {}, error() {}, info() {} }, JSON, Date, Math, Object, Array, String, Number, Set, Map, URL, Promise, Intl, RegExp, Error,
    setTimeout: (f) => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {}, AbortController, btoa, atob, encodeURIComponent, decodeURIComponent,
    localStorage: ls, sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} }, fetch: fakeFetch,
    location: { hash: '', search: '', origin: 'http://x', pathname: '/', href: 'http://x/' }, navigator: { language: 'pt-BR' },
    document: { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }), documentElement: { style: {}, setAttribute() {}, lang: 'pt' }, head: { appendChild() {} }, body: { appendChild() {}, classList: { add() {}, remove() {} } } },
    addEventListener() {}, removeEventListener() {} };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx; vm.createContext(ctx);
  for (const f of ate) {
    try { vm.runInContext(fs.readFileSync(SERVE + '/' + f, 'utf8'), ctx, { filename: f }); }
    catch (e) { if (['store.js', 'cloud.js', 'nuvem-itens.js'].includes(f)) throw e; }
    if (f === 'config.js') vm.runInContext("APP_CONFIG.supabaseUrl = 'https://teste.supabase.local'; APP_CONFIG.supabaseKey = 'chave-de-teste';", ctx);
  }
  vm.runInContext(`APP_CONFIG.supabaseUrl = 'https://teste.supabase.local'; APP_CONFIG.supabaseKey = 'chave-de-teste';
    if (typeof load === 'function') load(); var isLoggedIn = () => true; var authToken = () => 'tok'; var authEnsure = async () => {};`, ctx);
  const r = (js) => vm.runInContext(js, ctx); r.ls = ls; return r;
}
(async () => {
  const A = janela();
  const COL = A(`ITENS_COLS.find(c => typeof ITENS_DIC === 'undefined' || !ITENS_DIC.includes(c))`);
  console.log(`duas janelas no mesmo navegador (coleção de teste: ${COL})`);
  await A('itSincronizarAoAbrir()'); A('itLigar()');
  const B = janela(A.ls);                   /* a janela velha: mesmo localStorage, DB próprio */
  await B('itSincronizarAoAbrir()'); B('itLigar()');
  A(`DB['${COL}'] = Array.isArray(DB['${COL}']) ? DB['${COL}'] : []; ['j1','j2','j3'].forEach(id => DB['${COL}'].push({ id, nome: 'Registro ' + id, texto: 'Registro ' + id }))`);
  A('itEnfileirar()'); await A('itEnviarFila()');
  const vivos = () => [...BANCO.values()].filter(l => l.colecao === COL && /^j\d$/.test(l.id) && !l.apagado).length;
  const tem = (J) => J(`(DB['${COL}'] || []).filter(x => x && /^j\\d$/.test(x.id)).length`);
  ok('os 3 registros subiram para o banco', vivos() === 3);
  B('itEnfileirar()'); await B('itEnviarFila()');
  ok('a janela velha NÃO apaga os registros no banco', vivos() === 3);
  ok('a janela velha passou a ter os registros (adotou)', tem(B) === 3);
  B(`DB['${COL}'].push({ id: 'k1', nome: 'outro', texto: 'outro' })`); B('itEnfileirar()'); await B('itEnviarFila()');
  ok('gravar na janela velha não perde nada', vivos() === 3 && tem(B) === 3);
  A(`DB['${COL}'] = DB['${COL}'].filter(x => x.id !== 'j3')`); A('itEnfileirar()'); await A('itEnviarFila()');
  const j3 = BANCO.get(COL + '|j3');
  ok('apagar de propósito ainda apaga', vivos() === 2 && j3 && j3.apagado);
  ok('...e o banco guarda o conteúdo de quem foi apagado', j3 && j3.dados && j3.dados.id === 'j3');
  const CEL = janela();
  CEL(`DB['${COL}'] = Array.isArray(DB['${COL}']) ? DB['${COL}'] : []; DB['${COL}'].push({ id: 'res1', nome: 'Resgate', texto: 'Resgate' })`);
  BANCO.set(COL + '|res1', { colecao: COL, id: 'res1', dados: {}, apagado: true, atualizado_em: '2026-10-26T10:00:00.000Z' });
  await CEL('itSincronizarAoAbrir()');
  ok('resgate: o aparelho que ainda tinha o registro NÃO apaga', CEL(`DB['${COL}'].some(x => x.id === 'res1')`));
  ok('resgate: ...e devolve para o banco', (BANCO.get(COL + '|res1') || {}).apagado === false && BANCO.get(COL + '|res1').dados.id === 'res1');
  console.log(falhas ? `\n${falhas} FALHA(S)` : '\ntudo passou');
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.log('ERRO', e.message); process.exit(1); });
