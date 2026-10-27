/* O banco da Melissa virou a SALA 'melissa' no projeto da Ti Artes (27/10/2026).
   Num projeto com vários clientes, chamada sem o cabeçalho da sala cai no
   schema public — que é o da Ti Artes. Isto confere que app, login e a função
   do cartão falam todos com a sala dela, e que nada aponta pro banco antigo. */
const fs = require('fs'), vm = require('vm');
const SERVE = [__dirname + '/..', __dirname + '/../serve'].find(d => fs.existsSync(d + '/store.js'));
const ler = (f) => fs.readFileSync(SERVE + '/' + f, 'utf8');
let falhas = 0;
const chk = (nome, cond, det) => {
  if (cond) console.log('  ok   ' + nome);
  else { falhas++; console.log('  FALHA ' + nome + (det ? ' — ' + det : '')); }
};

console.log('a sala da Melissa');
for (const f of ['cloud.js', 'auth.js', 'app.js', 'nuvem-itens.js', 'config.js']) {
  chk(f + ' não fala mais com o banco antigo', !ler(f).includes('kqphzdowtjcewazikzyn'));
}

/* supaFetch de verdade, com fetch dublado: guarda os cabeçalhos de cada chamada */
const chamadas = [];
const ctx = { console, JSON, Object, String, AbortController, setTimeout, clearTimeout,
  fetch: (url, o) => { chamadas.push({ url, h: o.headers || {}, m: o.method || 'GET' }); return Promise.resolve({ ok: true }); },
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} } };
vm.createContext(ctx);
vm.runInContext(ler('cloud.js'), ctx);
vm.runInContext(`supaFetch('appstate?id=eq.1&select=data');
  supaFetch('bookings', { method: 'POST', body: '{}' });
  supaFetch('bookings?id=eq.x', { method: 'PATCH', body: '{}' });
  supaFetch('bookings?id=eq.x', { method: 'DELETE' });`, ctx);
const [g, p, pa, d] = chamadas;
chk('endereço é o projeto da Ti Artes', g && g.url.startsWith('https://uopfqlogjzuqpabptxkb.supabase.co/rest/v1/'), g && g.url);
chk('leitura vai com Accept-Profile: melissa', g && g.h['Accept-Profile'] === 'melissa' && !g.h['Content-Profile']);
chk('reserva nova (POST) vai com Content-Profile: melissa', p && p.h['Content-Profile'] === 'melissa');
chk('alteração (PATCH) vai com Content-Profile: melissa', pa && pa.h['Content-Profile'] === 'melissa');
chk('apagar (DELETE) vai com Content-Profile: melissa', d && d.h['Content-Profile'] === 'melissa');

const auth = ler('auth.js');
chk('login novo (sessão do banco antigo é esquecida)', auth.includes("const AUTH_KEY = 'vi_session_v2';"));
chk('conferência da dona lê app_config da sala', /app_config\?id=eq\.1&select=owner_uid', \{ headers: \{ \.\.\.h, \.\.\.salaHeaders\('GET'\) \} \}/.test(auth));

const app = ler('app.js');
chk('cartão chama a função pagar-melissa', app.includes("'/functions/v1/pagar-melissa'"));

const fn = ler('supabase/functions/pagar-melissa/index.ts');
chk('função usa a sala melissa', fn.includes("const SALA = 'melissa';") && fn.includes("'Accept-Profile': SALA") && fn.includes("'Content-Profile': SALA"));
chk('função usa o segredo com o nome dela', fn.includes("Deno.env.get('STRIPE_SECRET_KEY_MELISSA')") && !/Deno\.env\.get\('STRIPE_SECRET_KEY'\)/.test(fn));

if (falhas) { console.log('\n' + falhas + ' falha(s)'); process.exit(1); }
console.log('\ntudo certo');
