// O LIMITE DO IPHONE (24/11/2026): o Safari do iPhone não desenha canvas acima de 16.777.216 pixels
// (4096 × 4096) e não avisa — a imagem sai BRANCA. Na escala 2 a folha A4 tem 1588 pixels de largura:
// um documento com mais de ~4,7 folhas fotografado inteiro de uma vez virava PDF em branco no iPhone.
// O Chrome do computador não tem esse limite, então os outros testes não pegavam (apareceu no app de
// outra guia do estúdio). Este teste abre a cópia SEM NUVEM como um iPhone, monta uma viagem longa
// (muitas reservas do mesmo cliente) e, se o app tiver, uma proposta grande; gera o PDF do kit no
// painel, o do kit na página do cliente e o da proposta, e MEDE cada canvas que o gerador cria: falha
// se algum passar do limite do iPhone. Confere também que o PDF saiu com várias folhas e nítido
// (escala 2, a mesma de sempre). O mesmo arquivo serve a todos os apps da família.
// Uso: node testes/pdf-iphone.mjs <copia-sem-nuvem> <pasta-de-saida> [gerador de PDF alternativo]
//      (o 3º argumento troca o pdf*.js da cópia — serve para provar que a versão antiga estourava)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const PASTA = path.resolve(process.argv[2] || '.'), OUT = path.resolve(process.argv[3] || path.join(os.tmpdir(), 'pdf-iphone'));
const OUTRO_PDF = process.argv[4] ? path.resolve(process.argv[4]) : null;
const ler = (f) => fs.existsSync(path.join(PASTA, f)) ? fs.readFileSync(path.join(PASTA, f), 'utf8') : '';
const cfgTxt = ler('config.js'), cloudTxt = ler('cloud.js');
/* o banco mora no config.js (supabaseUrl) ou, na base própria, no cloud.js (SUPA_URL) */
const semNuvem = /supabaseUrl:/.test(cfgTxt) ? /supabaseUrl:\s*''/.test(cfgTxt) : /const SUPA_URL = '';/.test(cloudTxt);
if (!semNuvem || /novoEndereco:\s*'[^']/.test(cfgTxt)) { console.log('PARE: a cópia tem nuvem (supabaseUrl / SUPA_URL) ou redireciona (novoEndereco). Use a cópia sem nuvem.'); process.exit(2); }
/* o gerador de PDF deste app (pdf.js, pdf-<nome>.js), pelo index.html */
const PDF_ARQ = (fs.readFileSync(path.join(PASTA, 'index.html'), 'utf8').match(/<script src="(pdf[\w-]*\.js)/) || [])[1];
if (!PDF_ARQ) { console.log('PARE: não achei o gerador de PDF no index.html'); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });
const LIMITE = 16777216, ESCALA2 = 1588;
const BASE = 'https://pdf.teste/app/', PORT = 9600 + Math.floor(Math.random() * 300), PERFIL = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-iph-'));
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${PERFIL}`, '--no-first-run', '--use-angle=swiftshader', 'about:blank'], { stdio: 'ignore' });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const TIPO = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2' };
/* fora do app, só as bibliotecas do PDF (cdnjs) e as fontes; banco, cofre e o resto não saem daqui */
const LIBERADO = /^https:\/\/(cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)\//;
let ws, id = 0, falhas = 0, passou = 0; const pend = new Map(), excecoes = [];
const send = (m, p = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 500)); return r.result.value; };
const ok = (n, c, d) => { if (c) { passou++; console.log('  ok   ' + n); } else { falhas++; console.log('  FALHA ' + n + (d !== undefined ? ' — ' + JSON.stringify(d).slice(0, 400) : '')); } };
function servir(p) {
  const u = new URL(p.request.url);
  if (!u.href.startsWith(BASE)) return LIBERADO.test(u.href) ? send('Fetch.continueRequest', { requestId: p.requestId }) : send('Fetch.failRequest', { requestId: p.requestId, errorReason: 'BlockedByClient' });
  let rel = decodeURIComponent(u.pathname.replace('/app/', '')) || 'index.html';
  if (rel === '' || rel.endsWith('/')) rel += 'index.html';
  let f = path.join(PASTA, rel);
  if (rel === PDF_ARQ && OUTRO_PDF) f = OUTRO_PDF;
  if (rel === 'sw.js' || !(f.startsWith(PASTA) || f === OUTRO_PDF) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) return send('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 404, body: '' });
  return send('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: TIPO[path.extname(f).toLowerCase()] || 'application/octet-stream' }], body: fs.readFileSync(f).toString('base64') });
}
/* mede cada canvas que o gerador cria (largura × altura) */
const MEDIDOR = `(() => {
  window.__maior = 0; window.__estouros = 0;
  const P = HTMLCanvasElement.prototype;
  for (const k of ['width', 'height']) {
    const d = Object.getOwnPropertyDescriptor(P, k);
    Object.defineProperty(P, k, { configurable: true, enumerable: true, get() { return d.get.call(this); },
      set(v) { d.set.call(this, v); const a = d.get.call(this) * Object.getOwnPropertyDescriptor(P, k === 'width' ? 'height' : 'width').get.call(this);
        if (a > window.__maior) window.__maior = a; if (a > ${LIMITE}) window.__estouros++; } });
  }
})();`;
/* toca no botão, espera o PDF (ou o erro na tela) e mede */
async function geraEMede(nome, botao, minPaginas) {
  await ev(`window.__maior = 0; window.__estouros = 0; window._ultPdf = null; (document.querySelector(${JSON.stringify(botao)}) || { click() { throw new Error('sem o botão ${botao}'); } }).click(); true`);
  let fim = null; for (let k = 0; k < 900 && !fim; k++) { await wait(250);
    fim = await ev(`(() => { const t = ((document.getElementById('pdfPronto') || {}).innerText || ''); return window._ultPdf ? 'ok' : /Não consegui|could not/.test(t) ? t.slice(0, 200) : null; })()`); }
  const r = await ev(`(async () => { const p = window._ultPdf;
    if (!p) return { maior: window.__maior, estouros: window.__estouros };
    const b = new Uint8Array(await p.blob.arrayBuffer()); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
    return { maior: window.__maior, estouros: window.__estouros, paginas: (s.match(/\\/Type\\s*\\/Page[^s]/g) || []).length, kb: Math.round(p.blob.size / 1024), b64: btoa(s), arquivo: p.arquivo }; })()`);
  if (r.b64) fs.writeFileSync(path.join(OUT, `${nome}${OUTRO_PDF ? '-antigo' : ''}.pdf`), Buffer.from(r.b64, 'base64'));
  console.log(`  ${nome}: maior canvas ${(r.maior / 1e6).toFixed(1)} milhões de pixels · ${r.paginas || 0} página(s) · ${r.kb || 0} KB`);
  ok(`${nome}: o PDF ficou pronto`, fim === 'ok', fim);
  ok(`${nome}: nenhum canvas passou do limite do iPhone (16,7 milhões)`, r.maior <= LIMITE && !r.estouros, { maior: r.maior, estouros: r.estouros });
  ok(`${nome}: documento longo, várias folhas (${r.paginas || 0} ≥ ${minPaginas})`, (r.paginas || 0) >= minPaginas, { paginas: r.paginas });
  ok(`${nome}: nitidez de sempre (canvas de ${ESCALA2} de largura = escala 2)`, r.maior >= ESCALA2 * 1500, r.maior);
  ok(`${nome}: não está em branco (peso de imagem de verdade por folha)`, r.kb && r.paginas && r.kb / r.paginas > 25, { kb: r.kb, paginas: r.paginas });
  await ev(`(() => { const p = document.getElementById('pdfPronto'); if (p) p.remove(); return true; })()`);
  return r;
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
  await send('Page.addScriptToEvaluateOnNewDocument', { source: MEDIDOR });
  /* um iPhone: tela estreita, toque, o navegador do iPhone */
  await send('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1' });
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
  await send('Page.navigate', { url: BASE + '?t=1#/' }); await wait(5500);
  await ev(`(function(){ const s = DB.settings; s.tutorialClient = false; s.tutorialAdm = false; s.boasVindasVistas = true; s.authRequired = false;
    try { if (typeof BV_CHAVE !== 'undefined') localStorage.setItem(BV_CHAVE, '1'); } catch (e) {} save(); return true; })()`);
  console.log(`gerador: ${PDF_ARQ}${OUTRO_PDF ? ' — TROCADO por ' + path.basename(OUTRO_PDF) : ''}`);

  /* a viagem longa de um cliente de teste: 18 reservas confirmadas em dias seguidos, passeios alternados */
  const cli = await ev(`(() => {
    const bom = (x) => x && x.status !== 'draft' && !x.servico && !x.oculto && !x.pedido && x.region !== 'online' && !/^orc-/.test(x.id || '');
    let vivos = Tours.all().filter(bom);
    if (!vivos.length && typeof resetDemo === 'function') { resetDemo(); vivos = Tours.all().filter(bom); }
    if (!vivos.length) return { erro: 'o app não tem passeios' };
    const ini = addDays(isoToday(), 15), hs = ['09:00', '14:30', '10:00', '16:00'], cods = [];
    let b = null;
    for (let k = 0; k < 18; k++) {
      const t = vivos[k % vivos.length];
      b = Bookings.criarManual({ tourId: t.id, date: addDays(ini, k), time: hs[k % hs.length], name: 'Cliente Teste iPhone', email: 'iphone.teste@exemplo.com',
        whats: '+55 11 90000-0000', pax: 2, total: 200 + 10 * k, recebido: k % 3 ? 200 + 10 * k : 0, metodo: 'pix' });
      if (!b) return { erro: 'criarManual não devolveu a reserva', k };
      b.hotel = 'Hotel Teste Central'; cods.push(b.code);
    }
    save();
    return { chave: typeof kitChaveDe === 'function' ? kitChaveDe(b) : 'iphone.teste@exemplo.com', cods, passeios: vivos.length }; })()`);
  if (cli.erro) throw new Error(cli.erro);
  console.log(`viagem de teste: ${cli.cods.length} reservas (${cli.passeios} passeios no catálogo)`);
  await ev(`(() => { const _p = pdfDoElemento; pdfDoElemento = async (...a) => { window._ultPdf = null; const r = await _p(...a); window._ultPdf = r; return r; }; return true; })()`);

  console.log('1. o kit da viagem, no painel');
  await ev(`Kit.abrir(${JSON.stringify(cli.chave)}); true`); await wait(2500);
  const tx = await ev(`(document.getElementById('ktPrint') || {}).innerText || ''`);
  ok('abriu o kit do cliente com todas as reservas', cli.cods.every(c => tx.includes(c)), tx.slice(0, 200));
  await geraEMede('kit-painel', '#ktPdf', 6);

  console.log('2. o kit da viagem, na página que o cliente abre (o link)');
  const longo = await ev(`Kit.link(${JSON.stringify(cli.chave)})`);
  await ev(`location.hash = '#' + ${JSON.stringify(longo)}.split('#')[1]; true`); await wait(3000);
  const pub = await ev(`(document.getElementById('pubPrint') || {}).innerText || ''`);
  ok('o cliente abre o kit pelo link, com todas as reservas', cli.cods.every(c => pub.includes(c)), pub.slice(0, 200));
  await geraEMede('kit-cliente', '#pubPdf', 6);

  if (await ev(`typeof Orc !== 'undefined' && typeof Orc.cria === 'function' && typeof ppDados === 'function' && typeof ppAdm === 'function'`)) {
    console.log('3. a proposta (orçamento) de muitos dias');
    const oid = await ev(`(() => { const vivos = Tours.all().filter(x => x && x.status !== 'draft' && !x.servico && !x.oculto && !/^orc-/.test(x.id || ''));
      const ini = addDays(isoToday(), 30), itens = [];
      for (let k = 0; k < 24; k++) { const t = vivos[k % vivos.length];
        itens.push({ tourId: t.id, desc: (t.name && (t.name.pt || t.name)) || 'Passeio', data: addDays(ini, Math.floor(k / 2)), hora: k % 2 ? '15:00' : '09:00', pax: 4, valor: 300 + k,
          texto: 'Um dia inteiro com guia em português: buscar no hotel, ingressos, acompanhamento o tempo todo e as dicas para o resto do dia. Serviço de teste número ' + (k + 1) + '.',
          incluso: 'Guia, transporte, ingressos' }); }
      const o = Orc.cria({ cliente: { nome: 'Cliente Teste iPhone', whats: '+55 11 90000-0000', email: 'iphone.teste@exemplo.com' }, itens, pax: 4, adultos: 4 });
      return o.id; })()`);
    await ev(`location.hash = '#/adm/proposta/' + ${JSON.stringify(oid)}; true`); await wait(3000);
    ok('abriu a proposta no painel', await ev(`!!document.getElementById('ppDoc') && !!document.getElementById('ppPdf')`));
    await geraEMede('proposta-painel', '#ppPdf', 6);
    await ev(`(async () => { location.hash = '#/pp/' + await Publico.codifica(ppDados(Orc.get(${JSON.stringify(oid)}))); return true; })()`); await wait(3500);
    ok('o cliente abre a proposta pelo link', await ev(`!!document.getElementById('ppDoc') && !!document.getElementById('ppPdf')`));
    await geraEMede('proposta-cliente', '#ppPdf', 6);
  } else console.log('3. (este app não tem a proposta premium)');
  ok('nenhum erro de script', !excecoes.length, excecoes.slice(0, 3));
} catch (e) { falhas++; console.log('  FALHA erro: ' + e.message); }
finally { try { ws.close(); } catch (e) {} try { chrome.kill(); } catch (e) {} }
console.log(falhas ? `\n${falhas} FALHA(S), ${passou} ok` : `\ntudo passou (${passou} conferências)`);
process.exit(falhas ? 1 : 0);
