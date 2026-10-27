// O KIT DA VIAGEM (27/10/2026): quem pagou recebe UM link (ou PDF) com tudo — o voucher de cada passeio,
// dia e hora, encontro (mapa), programa, incluso/não incluso, o que levar, pagamento (com o botão do cartão),
// as dicas dela. Abre a cópia SEM NUVEM num Chrome headless e confere: os botões "Kit da viagem" (Reservas e
// Clientes), o kit no painel, a página do cliente (link comprido), o PDF, a agenda (.ics), o link CURTO que se
// atualiza sozinho (com um banco falso), o kit em inglês, as dicas editáveis, o assistente, o kit que o SERVIDOR
// monta (guia-cofre) e o que o ROBÔ DE E-MAIL dela monta em Python (kit.py) — aberto como o cliente abre, do
// zero, pelo link do e-mail —, o celular e zero exceções.
// Uso: node testes/kit-navegador.mjs <copia-sem-nuvem> <pasta-de-saida> [pasta-do-robo (app-melissa-backup)]
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const PASTA = path.resolve(process.argv[2] || '.'), OUT = path.resolve(process.argv[3] || path.join(os.tmpdir(), 'melissa-kit'));
const ROBO = path.resolve(process.argv[4] || path.join(os.homedir(), 'Desktop/CODIGO/app-melissa-backup'));
const MONTA = path.join(os.homedir(), 'Desktop/CODIGO/guia-cofre/supabase/functions/avisos/monta.js');
if (!/const SUPA_URL = '';/.test(fs.readFileSync(path.join(PASTA, 'cloud.js'), 'utf8'))) { console.log("PARE: a cópia tem nuvem (cloud.js SUPA_URL). Use a cópia sem nuvem (SUPA_URL = '')."); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'https://kit.teste/app/', PORT = 9300 + Math.floor(Math.random() * 500), PERFIL = fs.mkdtempSync(path.join(os.tmpdir(), 'mel-kit-'));
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${PERFIL}`, '--no-first-run', '--use-angle=swiftshader', '--autoplay-policy=user-gesture-required', 'about:blank'], { stdio: 'ignore' });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const TIPO = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
/* fora do app só pode: as bibliotecas do PDF (cdnjs) e as fontes dela. Banco, cofre e o resto: bloqueados */
const LIBERADO = /^https:\/\/(cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)\//;
let ws, id = 0, falhas = 0; const pend = new Map(), excecoes = [];
const send = (m, p = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 500)); return r.result.value; };
const ok = (n, c, d) => { if (c) console.log('  ok   ' + n); else { falhas++; console.log('  FALHA ' + n + (d !== undefined ? ' — ' + JSON.stringify(d).slice(0, 500) : '')); } };
function servir(p) {
  const u = new URL(p.request.url);
  if (!u.href.startsWith(BASE)) return LIBERADO.test(u.href) ? send('Fetch.continueRequest', { requestId: p.requestId }) : send('Fetch.failRequest', { requestId: p.requestId, errorReason: 'BlockedByClient' });
  let rel = decodeURIComponent(u.pathname.replace('/app/', '')) || 'index.html';
  if (rel === '' || rel.endsWith('/')) rel += 'index.html';
  const f = path.join(PASTA, rel);
  if (rel === 'sw.js' || !f.startsWith(PASTA) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) return send('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 404, body: '' });
  return send('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: TIPO[path.extname(f)] || 'application/octet-stream' }], body: fs.readFileSync(f).toString('base64') });
}
/* contraste: para cada elemento com texto próprio visível, a cor do texto contra o primeiro fundo opaco atrás dele */
const CONTRASTE = `(() => {
  const rgb = (s) => { const m = String(s).match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c.r) + .7152 * f(c.g) + .0722 * f(c.b); };
  const fundo = (el) => { for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.backgroundImage && cs.backgroundImage !== 'none') return null; const c = rgb(cs.backgroundColor); if (c && c.a > .85) return c; } return rgb(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255 }; };
  const ruins = [];
  for (const el of document.querySelectorAll('#app *')) {
    if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') continue;
    const proprio = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1); if (!proprio) continue;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity < .3) continue;
    if (el.closest('svg, [aria-hidden="true"], #splash')) continue;
    const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
    const t = rgb(cs.color), f = fundo(el); if (!t || !f) continue;
    const a = t.a; const tt = { r: t.r * a + f.r * (1 - a), g: t.g * a + f.g * (1 - a), b: t.b * a + f.b * (1 - a) };
    const L1 = lum(tt), L2 = lum(f), cr = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05);
    if (cr < 3) ruins.push({ txt: el.textContent.trim().slice(0, 40), cr: +cr.toFixed(2), cor: cs.color, classe: String(el.className).slice(0, 40) });
  }
  return ruins.slice(0, 8);
})()`;
const LARGURA = `({ w: innerWidth, sw: document.documentElement.scrollWidth })`;
/* os rótulos pequenos do kit são em MAIÚSCULAS (text-transform): o innerText devolve assim — por isso os /i */
const pubTxt = `(document.getElementById('pubPrint') || {}).innerText || ''`;
async function pegaPdf(botao) {
  await ev(`(() => { const _p = pdfDoElemento; pdfDoElemento = async (...a) => { const r = await _p(...a); window._ultPdf = r; return r; }; window._ultPdf = null; document.querySelector(${JSON.stringify(botao)}).click(); return true; })()`);
  let pronto = false; for (let k = 0; k < 100 && !pronto; k++) { await wait(250); pronto = await ev(`!!window._ultPdf`); }
  return pronto ? ev(`(async () => { const r = window._ultPdf; const buf = new Uint8Array(await r.blob.arrayBuffer()); let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000)); return { nome: r.arquivo, tam: buf.length, folhas: (s.match(/\\/Type\\s*\\/Page[^s]/g) || []).length, b64: btoa(s) }; })()`) : null;
}
try {
  let list = null; for (let k = 0; k < 40 && !list; k++) { await wait(250); try { list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); } catch (e) {} }
  ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  ws.onmessage = (m) => { const d = JSON.parse(m.data);
    if (d.id && pend.has(d.id)) { const p = pend.get(d.id); pend.delete(d.id); d.error ? p.rej(new Error(d.error.message)) : p.res(d.result); }
    else if (d.method === 'Fetch.requestPaused') servir(d.params).catch(() => {});
    else if (d.method === 'Runtime.exceptionThrown') excecoes.push(String((d.params.exceptionDetails.exception || {}).description || d.params.exceptionDetails.text).slice(0, 300)); };
  await send('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Request' }] });
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1360, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: BASE + '?t=1#/' }); await wait(3500);
  /* o catálogo de demonstração (dados de mentira: a cópia não tem banco) + cartão ligado */
  await ev(`(function(){ resetDemo(); DB.settings.tutorialClient = false; DB.settings.tutorialAdm = false; DB.settings.stripeAtivo = true; save(); return true; })()`);
  ok('o app avisa que sabe abrir o kit (settings.kitVersao = 1)', await ev(`DB.settings.kitVersao === 1`));
  /* a foto que ela envia pelo painel é data:… (grande): uma assim no passeio da Floresta Negra */
  await ev(`(() => { const c = document.createElement('canvas'); c.width = 1600; c.height = 900; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 1600, 900); gr.addColorStop(0, '#064c3f'); gr.addColorStop(1, '#FFD23F'); g.fillStyle = gr; g.fillRect(0, 0, 1600, 900);
    for (let i = 0; i < 4000; i++) { g.fillStyle = 'rgba(' + (i * 7 % 255) + ',' + (i * 13 % 255) + ',' + (i * 29 % 255) + ',.5)'; g.fillRect((i * 37) % 1600, (i * 53) % 900, 9, 9); }
    Tours.get('t5').photo = c.toDataURL('image/jpeg', 0.95); save(); return Tours.get('t5').photo.length; })()`);

  /* um cliente com dois passeios: o da Floresta Negra pago à mão (tudo) e o dos mercados reservado no site, com o sinal no Pix */
  const cli = await ev(`(() => { const h = isoToday(), d = (n) => addDays(h, n);
    const a = Bookings.criarManual({ tourId: 't5', date: d(10), time: '09:00', name: 'Família Lima', whats: '+55 51 99999-1111', email: 'lima@exemplo.com', pax: 2, total: 300, recebido: 300, metodo: 'transfer' });
    const b = Bookings.create({ tourId: 't1', date: d(45), time: '16:30', name: 'Família Lima', email: 'lima@exemplo.com', whats: '+5551999991111', insta: 'lima', pax: 3, policy: 'split', origin: 'site' });
    Bookings.payBalance(b.id, 'pix');
    const p = Bookings.create({ tourId: 't2', date: d(20), time: '10:00', name: 'Pedido Semdinheiro', email: 'pedido@exemplo.com', whats: '+5511988887777', insta: 'p', pax: 2, policy: 'split', origin: 'site' });
    return { chave: 'lima@exemplo.com', a: a.code, b: b.code, aId: a.id, bId: b.id, pId: p.id, falta: Bookings.due(b), venceIso: Bookings.dueDate(b),
      t1: Tours.get('t1').name.pt, t5: Tours.get('t5').name.pt, status: Bookings.get(b.id).status }; })()`);
  console.log('cliente de teste: ' + JSON.stringify(cli));
  ok('o sinal no Pix confirmou a reserva do site', cli.status === 'confirmed' && cli.falta > 0, cli);

  console.log('1. o botão "Kit da viagem" em Reservas e em Clientes');
  await ev(`location.hash = '#/adm/bookings'; true`); await wait(1500);
  const bt = await ev(`({ conf: DB.bookings.filter(b => b.status === 'confirmed').length, kits: document.querySelectorAll('#stage .tacts [data-kit]').length,
    lima: document.querySelectorAll('#stage [data-kit="lima@exemplo.com"]').length, pedido: !!document.querySelector('#ta-' + ${JSON.stringify(cli.pId)} + ' [data-kit]') })`);
  ok('cada reserva paga (confirmada) ganhou "Kit da viagem"', bt.kits === bt.conf && bt.lima === 2, bt);
  ok('o pedido sem pagamento NÃO tem kit (sem pagamento não é reserva)', !bt.pedido, bt);
  await ev(`location.hash = '#/adm/clients'; true`); await wait(1200);
  ok('em Clientes também', await ev(`!!document.querySelector('#stage [data-kit="lima@exemplo.com"]')`));

  console.log('2. o kit no painel');
  await ev(`document.querySelector('#stage [data-kit="lima@exemplo.com"]').click(); true`); await wait(1800);
  const tx = await ev(`(document.getElementById('ktPrint') || {}).innerText || ''`);
  ok('abriu o kit do cliente (#/adm/kit/…)', /^#\/adm\/kit\//.test(await ev(`location.hash`)) && /Família Lima/.test(tx), await ev(`location.hash`));
  ok('o painel continua em volta (menu da Melissa)', await ev(`!!document.querySelector('.adm .rail') && !!document.querySelector('#stage #ktPrint')`));
  ok('os DOIS vouchers, em ordem de data', tx.indexOf(cli.a) > -1 && tx.indexOf(cli.b) > tx.indexOf(cli.a), { a: tx.indexOf(cli.a), b: tx.indexOf(cli.b) });
  ok('a lista do topo com os 2 passeios', await ev(`document.querySelectorAll('#ktPrint .kt-lista a').length === 2`));
  ok('hora, pessoas, ponto de encontro e "abrir no mapa"', /09:00/.test(tx) && /16:30/.test(tx) && /3 pessoas/.test(tx) && /2 pessoas/.test(tx) && /Ponto de encontro/i.test(tx) && await ev(`[...document.querySelectorAll('#ktPrint a')].some(a => /google\\.com\\/maps/.test(a.href))`));
  ok('o programa (paradas) e incluso / não incluso', /O programa/.test(tx) && /Incluso/.test(tx) && /Não incluso/.test(tx) && /Maison Pfister/.test(tx));
  ok('o que levar, com o documento na Floresta Negra (vai à Alemanha)', /O que levar/.test(tx) && /Documento de identidade/.test(tx) && /Sapato confortável/.test(tx));
  ok('pagamento: tudo pago num, o que falta e até quando no outro', /Tudo pago/.test(tx) && /Falta pagar/i.test(tx) && tx.includes(await ev(`kitData(${JSON.stringify(cli.venceIso)}, 'pt', { weekday: undefined })`)));
  ok('o botão do cartão leva à página dela #/pagar/<reserva>', await ev(`[...document.querySelectorAll('#ktPrint a.kt-cta')].some(a => a.href.endsWith('#/pagar/' + ${JSON.stringify(cli.bId)}) && /com cartão/.test(a.textContent))`));
  ok('as dicas dela (112) e o contato dela no pé', /Dicas da Melissa/.test(tx) && /112/.test(tx) && /WhatsApp \+33682051120/.test(tx) && /@melissalsacia/.test(tx));
  ok('na marca dela: o verde no topo e a foto dela', await ev(`getComputedStyle(document.querySelector('#ktPrint .kt-topo')).backgroundColor === 'rgb(6, 76, 63)' && !!document.querySelector('#ktPrint img.kt-foto[src="melissa.jpg"]') && !!document.querySelector('#ktPrint .kt-marca svg')`));
  ok('a foto do passeio aparece', await ev(`document.querySelectorAll('#ktPrint .kt-svTopo img').length === 2`));
  ok('"Pôr no Google Agenda" em cada passeio (fuso de Paris)', await ev(`[...document.querySelectorAll('#ktPrint a')].filter(a => /calendar\\.google\\.com/.test(a.href) && /Europe%2FParis/.test(a.href)).length === 2`));
  const dados = await ev(`Kit.dados('lima@exemplo.com')`);
  const dj = JSON.stringify(dados);
  ok('o kit NUNCA leva o e-mail nem o telefone do cliente', !dj.includes('lima@exemplo.com') && !dj.replace(/\D/g, '').includes('5551999991111'), dj.slice(0, 200));
  ok('formato v1 (os campos do contrato)', dados.v === 1 && ['nome', 'periodo', 'servicos', 'dicas', 'parceiros', 'brindes', 'roteiro', 'whats', 'email', 'insta', 'negocio', 'gerado'].every(k => k in dados)
    && ['code', 'nome', 'tipo', 'data', 'hora', 'pessoas', 'duracao', 'durMin', 'encontro', 'hotel', 'guia', 'foto', 'resumo', 'paradas', 'inclui', 'naoInclui', 'levar', 'pago', 'restante', 'cancel'].every(k => k in dados.servicos[0]));
  const ics = await ev(`(async () => kitIcs(await Kit.dados('lima@exemplo.com')))()`);
  ok('"Pôr tudo na minha agenda": um evento por passeio, com o voucher', (ics.match(/BEGIN:VEVENT/g) || []).length === 2 && ics.includes(cli.a) && /TZID=Europe\/Paris/.test(ics));

  console.log('3. o link (sem nuvem: o comprido) e a página que o cliente abre');
  await ev(`window.open = () => null; true`);
  const longo = await ev(`Kit.link('lima@exemplo.com')`);
  ok('sem banco, o link é o comprido (#/kt/…) e o painel avisa', /#\/kt\/z/.test(longo) && /comprido/i.test(await ev(`document.getElementById('ktEstado').innerText`)), longo.slice(0, 80));
  const enx = await ev(`Publico.le(${JSON.stringify(longo.split('#/kt/')[1])})`);
  ok('o comprido não carrega a foto enviada (data:) nem as descrições', !JSON.stringify(enx).includes('data:image') && enx.servicos.every(s => s.paradas.every(p => !p.d)), longo.length);
  ok('o comprido cabe num link (< 6000 caracteres)', longo.length < 6000, longo.length);
  const msg = await ev(`Kit.mensagem('lima@exemplo.com', 'URL')`);
  ok('a mensagem pronta fala dos 2 vouchers e leva o link', /os vouchers dos 2 passeios/.test(msg) && /URL/.test(msg) && /^Oi, Família!/.test(msg), msg);
  await ev(`location.hash = '#' + ${JSON.stringify(longo)}.split('#')[1]; true`); await wait(2200);
  const pub = await ev(pubTxt);
  ok('o cliente abre o kit pelo link (sem senha), com os 2 vouchers', pub.includes(cli.a) && pub.includes(cli.b) && /Família Lima/.test(pub), pub.slice(0, 200));
  ok('a página do cliente não mostra o menu do painel', await ev(`!document.querySelector('.adm .rail') && !!document.querySelector('.pubPg .topbar')`));
  ok('link comprido: sem QR (seria impossível de ler)', await ev(`!document.querySelector('#pubPrint [data-kt-qr] svg')`));
  const ruins = await ev(CONTRASTE);
  ok('contraste: nenhum texto abaixo de 3:1 na página do cliente', !ruins.length, ruins);
  await ev(`route({ manterScroll: true }); true`); await wait(400);
  ok('a sincronia redesenha a tela: o kit fica (não pisca, não perde nada)', /Família Lima/.test(await ev(pubTxt)));
  const info = await pegaPdf('#pubPdf');
  if (info) { const f = path.join(OUT, 'kit.pdf'); fs.writeFileSync(f, Buffer.from(info.b64, 'base64')); try { execFileSync('sips', ['-s', 'format', 'png', f, '--out', path.join(OUT, 'kit-folha1.png')], { stdio: 'ignore' }); } catch (e) {} }
  ok('o cliente salva o kit em PDF de verdade (não está em branco: > 40 KB)', info && info.tam > 40000 && info.folhas >= 1, info && { nome: info.nome, tam: info.tam, folhas: info.folhas });

  console.log('4. o link CURTO e sempre atualizado (com um banco falso)');
  await ev(`(() => { window.__kits = {}; window.__rpcPrefer = null; temNuvem = () => true; isLoggedIn = () => true; authToken = () => 'x';
    supaFetch = async (p, o) => { o = o || {};
      if (p === 'kits' && o.method === 'POST') { const c = JSON.parse(o.body); window.__kits[c.token] = c.dados; window.__prefer = (o.headers || {}).Prefer; return new Response(null, { status: 201 }); }
      if (p === 'rpc/kit') { window.__rpcPrefer = (o.headers || {}).Prefer; const t = JSON.parse(o.body).p_token; return new Response(JSON.stringify(window.__kits[t] || null), { status: 200, headers: { 'content-type': 'application/json' } }); }
      throw new Error('sem rede (teste)'); };
    Kit.semTabela = false; return true; })()`);
  const curto = await ev(`Kit.link('lima@exemplo.com')`);
  ok('com o banco, o link é CURTO (#/k/código de 10 letras)', /#\/k\/[A-Za-z0-9]{10}$/.test(curto), curto);
  const tok = curto.split('#/k/')[1];
  ok('publica com upsert (merge-duplicates) e o código fica guardado no privado (DB.kits)', /merge-duplicates/.test(await ev(`window.__prefer`)) && await ev(`DB.kits['lima@exemplo.com'].token === ${JSON.stringify(tok)} && !!DB.kits['lima@exemplo.com'].publicado`));
  ok('o código NÃO vai para o appstate público', await ev(`!JSON.stringify(statePayload()).includes(${JSON.stringify(tok)})`));
  ok('o código sobe pela tabela itens (só da dona): kits está na sincronia privada', await ev(`ITENS_COLS.includes('kits') && ITENS_DIC.includes('kits')`));
  const foto = await ev(`(window.__kits[${JSON.stringify(tok)}].servicos.find(s => /^data:/.test(s.foto)) || {}).foto || ''`);
  ok('no banco, a foto enviada vai encolhida (~720 px, < 150 KB)', /^data:image\/jpeg/.test(foto) && foto.length < 150000 && foto.length < (await ev(`Tours.get('t5').photo.length`)), foto.length);
  await ev(`(() => { const b = Bookings.byCode(${JSON.stringify(cli.b)}); b.time = '17:00'; save(); cloudUpdateBooking(b); return true; })()`); await wait(3600);
  ok('mudou a hora no painel → o kit do cliente se atualizou sozinho (mesmo link)', await ev(`(window.__kits[${JSON.stringify(tok)}] || { servicos: [] }).servicos.some(s => s.code === ${JSON.stringify(cli.b)} && s.hora === '17:00')`));
  await ev(`(() => { kitConfere(); const b = Bookings.byCode(${JSON.stringify(cli.b)}); b.payments.push({ amount: Bookings.due(b), date: isoToday(), method: 'card', kind: 'balance' }); kitConfere(); return true; })()`); await wait(3600);
  ok('o pagamento que o Stripe grava no servidor (chega pela sincronia) também atualiza o kit', await ev(`(window.__kits[${JSON.stringify(tok)}] || { servicos: [] }).servicos.every(s => s.restante === 0)`));
  await ev(`location.hash = '#/k/' + ${JSON.stringify(tok)}; true`); await wait(1800);
  const pubK = await ev(pubTxt);
  ok('o cliente abre o link curto e já vê 17:00 e tudo pago', /17:00/.test(pubK) && !/Falta pagar/i.test(pubK), pubK.slice(0, 300));
  ok('a leitura do kit pede a resposta inteira (sem return=minimal)', (await ev(`window.__rpcPrefer`)) === '');
  ok('link curto: a página tem o QR do próprio kit', await ev(`!!document.querySelector('#pubPrint [data-kt-qr] svg')`));
  await ev(`location.hash = '#/k/NAOEXISTE1'; true`); await wait(1200);
  ok('código que não existe: mensagem amigável', /não existe mais/i.test(await ev(`document.body.innerText`)));

  console.log('5. em inglês, o idioma do kit e as dicas editáveis');
  const john = await ev(`(() => { setLang('en'); const h = isoToday(); const b = Bookings.create({ tourId: 't2', date: addDays(h, 50), time: '10:00', name: 'John Smith', email: 'john@example.com', whats: '+447700900123', insta: 'js', pax: 2, policy: 'full', origin: 'site' });
    Bookings.payBalance(b.id, 'card'); setLang('pt'); return { code: b.code, lang: Bookings.get(b.id).lang }; })()`);
  await ev(`Kit.abrir('john@example.com'); true`); await wait(1800);
  const txEn = await ev(`(document.getElementById('ktPrint') || {}).innerText || ''`);
  ok('quem reservou em inglês recebe o kit em inglês', john.lang === 'en' && /Meeting point/i.test(txEn) && /What to bring/.test(txEn) && /Melissa's tips/i.test(txEn) && /Fully paid/.test(txEn) && /Strasbourg on foot/.test(txEn), txEn.slice(0, 300));
  ok('a mensagem pronta também vai em inglês', /^Hi John! /.test(await ev(`Kit.mensagem('john@example.com', 'URL')`)));
  await ev(`Kit.abrir('lima@exemplo.com'); true`); await wait(1500);
  await ev(`document.querySelector('[data-ktlang="en"]').click(); true`); await wait(1500);
  ok('ela troca o idioma do kit no painel (PT → EN)', /Meeting point/i.test(await ev(`document.getElementById('ktPrint').innerText`)) && (await ev(`DB.kits['lima@exemplo.com'].lang`)) === 'en');
  await ev(`document.querySelector('[data-ktlang="pt"]').click(); true`); await wait(1500);
  await ev(`(() => { const t = document.getElementById('ktDicasTx'); t.value = 'Dica de teste A\\nDica de teste B'; document.getElementById('ktEdOk').click(); return true; })()`); await wait(1500);
  ok('ela edita as dicas: entram no kit', /Dica de teste A/.test(await ev(`document.getElementById('ktPrint').innerText`)) && (await ev(`JSON.stringify(DB.settings.kitDicas.pt)`)) === '["Dica de teste A","Dica de teste B"]');
  await ev(`document.getElementById('ktEdPadrao').click(); true`); await wait(1500);
  ok('"Voltar ao padrão" traz as dicas padrão de volta', /112/.test(await ev(`document.getElementById('ktPrint').innerText`)) && !/Dica de teste/.test(await ev(`JSON.stringify(DB.settings.kitDicas || null)`)));

  console.log('6. o assistente');
  const ia = await ev(`iaRodaFerramenta('kit_viagem', { cliente: 'Família Lima' })`);
  ok('kit_viagem (só leitura) devolve o link curto e a mensagem pronta', ia && !ia.erro && /#\/k\//.test(ia.link || '') && ia.servicos && ia.servicos.length === 2 && /Oi, Família/.test(ia.mensagem_pronta || '') && await ev(`IA_LEITURA.has('kit_viagem')`), ia);
  const iaNada = await ev(`iaRodaFerramenta('kit_viagem', { cliente: 'Pedido Semdinheiro' })`);
  ok('cliente sem pagamento: o assistente explica, não inventa kit', iaNada && iaNada.erro, iaNada);

  console.log('7. o kit que o SERVIDOR monta (guia-cofre) abre na página do cliente');
  const { kitDoServidor } = await import(MONTA);
  const est = await ev(`({ settings: DB.settings, tours: DB.tours })`), bk = await ev(`Bookings.byCode(${JSON.stringify(cli.b)})`);
  const kitS = kitDoServidor(bk, est, 'melissa');
  await ev(`(async () => { Kit._pagina = ''; location.hash = '#/kt/' + await Publico.codifica(${JSON.stringify(kitS)}); return true; })()`); await wait(1800);
  const pubS = await ev(pubTxt);
  ok('o kit do servidor abre: cliente, voucher e passeio', pubS.includes(cli.b) && /Família Lima/.test(pubS) && pubS.includes(cli.t1), pubS.slice(0, 300));

  console.log('8. o kit que o ROBÔ DE E-MAIL dela monta (kit.py, Python) — aberto do zero, como o cliente abre pelo e-mail');
  await ev(`(() => { const b = Bookings.byCode(${JSON.stringify(cli.b)}); b.time = '16:30'; b.payments = b.payments.slice(0, 1); save(); return true; })()`);
  const entrada = await ev(`JSON.stringify({ reserva: Bookings.byCode(${JSON.stringify(cli.b)}), reservas: DB.bookings, passeios: DB.tours, settings: DB.settings, hoje: isoToday() })`);
  const linkPy = execFileSync('python3', ['-I', path.join(ROBO, 'kit.py')], { input: entrada, encoding: 'utf8' }).trim();
  ok('o robô monta o link do app dela (https://app.melissahallais.com/#/kt/z…)', /^https:\/\/app\.melissahallais\.com\/#\/kt\/z[A-Za-z0-9_-]+$/.test(linkPy), linkPy.slice(0, 80));
  const kPy = await ev(`Publico.le(${JSON.stringify(linkPy.split('#/kt/')[1])})`);
  const kJs = await ev(`Kit.dados('lima@exemplo.com')`);
  const igual = (s) => [s.code, s.nome, s.tipo, s.data, s.hora, s.pessoas, s.durMin, s.encontro, s.resumo, s.pago, s.restante, s.vence || '', String(s.pagarUrl || '').split('#/pagar/')[1] || '', JSON.stringify(s.inclui), JSON.stringify(s.naoInclui), JSON.stringify(s.levar), JSON.stringify((s.paradas || []).map(p => p.n)), s.cancel].join('|');
  ok('o navegador abre o que o Python comprimiu, e dá o MESMO kit que o app monta (passeios, contas, prazo, cartão)', kPy.servicos.length === kJs.servicos.length && kPy.servicos.every((s, i) => igual(s) === igual(kJs.servicos[i])),
    kPy.servicos.map((s, i) => igual(s) === igual(kJs.servicos[i]) ? 'igual' : [igual(s), igual(kJs.servicos[i])]));
  const doPy = JSON.parse(execFileSync('python3', ['-I', '-c', `import json,sys; sys.path.insert(0, ${JSON.stringify(ROBO)}); import kit; print(json.dumps([kit.DICAS, kit.LEVAR, kit.LEVAR_FLORESTA], ensure_ascii=False))`], { encoding: 'utf8' }));
  const doApp = await ev(`[KIT_DICAS_PADRAO, KIT_LEVAR_PADRAO, KIT_LEVAR_FLORESTA]`);
  ok('as dicas e o que levar padrão do robô são os mesmos do app (pt e en)', JSON.stringify(kPy.dicas) === JSON.stringify(kJs.dicas) && JSON.stringify(doPy) === JSON.stringify(doApp), { doPy, doApp });
  ok('o kit do robô não leva o e-mail nem o telefone do cliente', !JSON.stringify(kPy).includes('lima@exemplo.com') && !JSON.stringify(kPy).replace(/\D/g, '').includes('5551999991111'));
  /* o cliente: aparelho limpo (nunca abriu o app), toca no botão do e-mail */
  await ev(`(() => { localStorage.clear(); sessionStorage.clear(); return true; })()`);
  await send('Page.navigate', { url: BASE + '?email=1#/kt/' + linkPy.split('#/kt/')[1] }); await wait(4200);
  const pubPy = await ev(pubTxt);
  ok('aparelho limpo, link do e-mail: o kit abre direto (sem passar pela capa)', pubPy.includes(cli.a) && pubPy.includes(cli.b) && /Família Lima/.test(pubPy) && /Dicas da Melissa/.test(pubPy) && /Falta pagar/i.test(pubPy), pubPy.slice(0, 300));
  ok('com o botão do cartão e o prazo', await ev(`[...document.querySelectorAll('#pubPrint a.kt-cta')].some(a => a.href === 'https://app.melissahallais.com/#/pagar/' + ${JSON.stringify(cli.bId)})`));

  console.log('9. no celular');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await ev(`(() => { Kit._pagina = ''; route(); return true; })()`); await wait(1500);
  const larg = await ev(LARGURA);
  ok('a página do cliente cabe na largura do celular (sem rolar para o lado)', larg.sw <= larg.w + 2, larg);
  await ev(`document.getElementById('splash') && document.getElementById('splash').remove(); scrollTo(0, 0); true`); await wait(300);
  const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 72, captureBeyondViewport: false }); fs.writeFileSync(path.join(OUT, 'kit-celular.jpg'), Buffer.from(shot.data, 'base64'));
  ok('contraste no celular: nenhum texto abaixo de 3:1', !(await ev(CONTRASTE)).length, await ev(CONTRASTE));
  ok('nenhuma exceção na página', !excecoes.length, excecoes.slice(0, 3));
} catch (e) { falhas++; console.log('  FALHA erro: ' + e.message); }
finally { try { chrome.kill(); } catch (e) {} }
console.log(falhas ? falhas + ' FALHA(S)' : 'tudo passou');
process.exit(falhas ? 1 : 0);
