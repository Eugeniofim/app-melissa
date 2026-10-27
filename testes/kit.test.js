/* O KIT DA VIAGEM (27/10/2026) — o que liga o kit no app e que, se sumir, quebra em silêncio:
   - os 3 arquivos carregam DEPOIS do app.js, com a mesma versão, e estão no cache do celular (sw.js CORE);
   - o roteador chama as páginas de fora (#/kt/, #/k/) antes das rotas dele;
   - os códigos do link curto são PRIVADOS (tabela itens), nunca no appstate público;
   - os Ajustes nascem com kitVersao = 1;
   - o kit não lê o e-mail nem o WhatsApp do cliente para dentro do documento.
   O comportamento de verdade é testado no navegador: testes/kit-navegador.mjs (cópia sem nuvem). */
const fs = require('fs');
const SERVE = [__dirname + '/..', __dirname + '/../serve'].find(d => fs.existsSync(d + '/kit-melissa.js'));
const ler = (f) => fs.readFileSync(SERVE + '/' + f, 'utf8');
let falhas = 0;
const ok = (nome, cond, det) => { if (cond) console.log('  ok   ' + nome); else { falhas++; console.log('  FALHA ' + nome + (det ? ' — ' + det : '')); } };

console.log('o kit da viagem está ligado no app');
const html = ler('index.html'), sw = ler('sw.js');
const ordem = ['app.js', 'publico-melissa.js', 'pdf-melissa.js', 'kit-melissa.js', 'melissa-ponte.js', 'assistente.js', 'assistente-melissa.js'].map(f => html.indexOf('<script src="' + f + '?v='));
ok('index.html carrega publico → pdf → kit logo depois do app.js (e antes do assistente)', ordem.every((p, i) => p > 0 && (i === 0 || p > ordem[i - 1])), ordem.join(','));
const versoes = [...html.matchAll(/\.(?:js|css)\?v=([\d.]+)"/g)].map(m => m[1]);
const VERSION = (sw.match(/const VERSION = 'vi-v([\d.]+)'/) || [])[1];
ok('todas as versões ?v= iguais e iguais à do sw.js', versoes.length > 10 && versoes.every(v => v === VERSION), [VERSION, ...new Set(versoes)].join(' '));
for (const f of ['publico-melissa.js', 'pdf-melissa.js', 'kit-melissa.js']) ok(f + ' está no cache do celular (CORE)', sw.includes("'./" + f + "'"));

const app = ler('app.js');
const rota = app.indexOf('window.ROTAS_EXTRA[p[0]]'), nova = app.indexOf("if (p[0] === 'novasenha')");
ok('o roteador chama as páginas de fora (ROTAS_EXTRA) antes das rotas dele', rota > 0 && nova > rota);
ok('Reservas: botão do kit só em reserva paga (confirmada)', /b\.status === 'confirmed' && typeof kitBotao === 'function' \? kitBotao\(b\)/.test(app));
ok('Clientes: botão do kit na linha do cliente', /kitBotao\(String\(c\.email \|\| c\.whats \|\| c\.name\)\.toLowerCase\(\)\)/.test(app));

const itens = ler('nuvem-itens.js');
ok('os códigos do link curto sobem pela tabela itens (privada)', /const ITENS_COLS = \[[^\]]*'kits'/.test(itens) && /const ITENS_DIC = \[[^\]]*'kits'/.test(itens));
const cloud = ler('cloud.js');
const payload = cloud.slice(cloud.indexOf('function statePayload'), cloud.indexOf('function statePayload') + 400);
ok('o appstate público NÃO leva os códigos (kits fora do statePayload)', payload.length > 50 && !/kits/.test(payload.split('}')[0]));
ok('os Ajustes nascem com kitVersao = 1 (store.js)', /kitVersao:\s*1\b/.test(ler('store.js')));

const kit = ler('kit-melissa.js');
const dados = kit.slice(kit.indexOf('async function kitDados'), kit.indexOf('function kitEnxuto'));
ok('o kit não põe o e-mail nem o WhatsApp do CLIENTE no documento', dados.length > 100 && !/\bb\.(email|whats)\b|bs\[0\]\.(email|whats)/.test(dados) && /email: String\(st\.admEmail/.test(dados));
ok('o link curto publica só com login (dona) e cai no comprido sem a tabela', /kitPodeNuvem = \(\) => .*isLoggedIn\(\) && !Kit\.semTabela/.test(kit) && /'#\/kt\/' \+ await Publico\.codifica\(kitEnxuto\(d\)\)/.test(kit));
ok('o endereço que vai para o cliente é o oficial dela', kit.includes("'https://app.melissahallais.com/'"));
ok('o SQL do link curto existe (banco de hoje e sala)', fs.existsSync(SERVE + '/LIGAR-KIT-MELISSA.sql') && /public\.is_owner\(\)/.test(ler('LIGAR-KIT-MELISSA.sql'))
  && /melissa\.is_owner\(\)/.test(ler('LIGAR-KIT-MELISSA-SALA.sql')) && /notify pgrst, 'reload schema'/.test(ler('LIGAR-KIT-MELISSA.sql')));
/* na sala (projeto da Ti Artes): o link curto lê e grava NA SALA dela (o PostgREST escolhe o schema pelo cabeçalho) */
if (/function salaHeaders/.test(cloud)) {
  const vm = require('vm'), chamadas = [];
  const ctx = { console, JSON, Object, String, AbortController, setTimeout, clearTimeout,
    fetch: (url, o) => { chamadas.push({ url, h: o.headers || {} }); return Promise.resolve({ ok: true }); },
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} } };
  vm.createContext(ctx); vm.runInContext(cloud, ctx);
  vm.runInContext(`supaFetch('rpc/kit', { method: 'POST', headers: { Prefer: '' }, body: '{}' }); supaFetch('kits', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: '{}' });`, ctx);
  const [rpc, up] = chamadas;
  ok('o cliente lê o kit na sala dela (rpc/kit com Content-Profile: melissa, resposta inteira)', rpc && /\/rest\/v1\/rpc\/kit$/.test(rpc.url) && rpc.h['Content-Profile'] === 'melissa' && rpc.h.Prefer === '');
  ok('a dona grava o kit na sala dela (kits, upsert, Content-Profile: melissa)', up && up.h['Content-Profile'] === 'melissa' && /merge-duplicates/.test(up.h.Prefer));
  ok('o painel aponta o SQL da sala', /LIGAR-KIT-MELISSA-SALA\.sql/.test(kit));
}
const asis = ler('assistente-melissa.js');
ok('o assistente tem kit_viagem, só de leitura', /name: 'kit_viagem'/.test(asis) && /IA_LEITURA\.add\('kit_viagem'\)/.test(asis) && /MARI_LER\.kit_viagem = async function/.test(asis));

if (falhas) { console.log('\n' + falhas + ' falha(s)'); process.exit(1); }
console.log('\ntudo certo');
