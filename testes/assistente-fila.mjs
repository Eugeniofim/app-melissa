// O ASSISTENTE NÃO TRANCA (veio da Mari, 24/10/2026; portado em 26/10). Mari: "quando falo com o assistente
// pelo telefone ou escrevo não consigo logo enviar a mensagem, parece que tranca". Era: com ele ocupado (pensando
// ou esperando o cartão de Confirmar) o enviar desligava e a mensagem FALADA sumia (o motor descartava em silêncio).
// Abre a pasta do app num Chrome headless (sem nuvem: o config.js sai com supabaseUrl vazio e nada fora do app
// carrega), troca a IA por uma falsa e LENTA, e confere: fila, cartão trocado por mensagem nova (sem chamada extra
// e sem gravar), ditado não se perde, relógio do "pensando", enviar sempre ligado, e a gaveta acompanhando a
// parte visível da tela no celular.
// Uso: node testes/assistente-fila.mjs [pasta-do-app]
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const PASTA = path.resolve(process.argv[2] || path.join(path.dirname(new URL(import.meta.url).pathname), '..'));
const BASE = 'https://guia.eugeniofim.com/fila-teste/', PORT = 9300 + Math.floor(Math.random() * 400), PERFIL = fs.mkdtempSync(path.join(os.tmpdir(), 'fila-'));
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${PERFIL}`, '--no-first-run', '--use-angle=swiftshader', 'about:blank'], { stdio: 'ignore' });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const TIPO = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
let ws, id = 0, falhas = 0; const pend = new Map(), excecoes = [];
const send = (m, p = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 500)); return r.result.value; };
const ok = (n, c, d) => { if (c) console.log('  ok   ' + n); else { falhas++; console.log('  FALHA ' + n + (d !== undefined ? ' — ' + JSON.stringify(d).slice(0, 500) : '')); } };
function servir(p) {
  const u = new URL(p.request.url);
  /* nada de fora: nem banco, nem cofre, nem fonte — o teste roda sem rede */
  if (!u.href.startsWith(BASE)) return send('Fetch.failRequest', { requestId: p.requestId, errorReason: 'BlockedByClient' });
  let rel = decodeURIComponent(u.pathname.replace('/fila-teste/', '')) || 'index.html';
  if (rel === '' || rel.endsWith('/')) rel += 'index.html';
  const f = path.join(PASTA, rel);
  if (rel === 'sw.js' || !f.startsWith(PASTA) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) return send('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 404, body: '' });
  let corpo = fs.readFileSync(f);
  if (rel === 'config.js') corpo = Buffer.from(corpo.toString('utf8').replace(/supabaseUrl:\s*'[^']*'/g, "supabaseUrl: ''"));
  return send('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: TIPO[path.extname(f)] || 'application/octet-stream' }], body: corpo.toString('base64') });
}
/* a fila mora no IAV (camada de voz) ou no iaFila (apps sem a camada de voz) */
const FILA = `((typeof IAV !== 'undefined' && IAV.fila) || window.iaFila)`;
const FILA_EL = `(document.getElementById('iavFila') || document.getElementById('iaFila'))`;
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
  /* uma chave falsa: o assistente abre no modo de conversa (com o campo), e a IA é trocada logo abaixo */
  await ev(`(function(){ try { DB.settings.tutorialClient = false; DB.settings.tutorialAdm = false; save(); } catch (e) {} localStorage.setItem(IA_CHAVE, 'sk-ant-teste-fila'); return true; })()`);
  /* a IA falsa: guarda o que recebeu, demora, e responde o texto da última pergunta */
  await ev(`(function(){ window.__chamadas = []; window.__lento = 1200; window.__proxima = null;
    iaChamar = async (hist) => { const u = [...hist].reverse().find(m => m.role === 'user' && (typeof m.content === 'string' || m.content.some(b => b.type === 'text')));
      const tx = !u ? '' : typeof u.content === 'string' ? u.content : u.content.filter(b => b.type === 'text').map(b => b.text).join(' ');
      window.__chamadas.push(tx.slice(0, 60) || '(tool_result)'); await new Promise(r => setTimeout(r, window.__lento));
      if (window.__proxima) { const p = window.__proxima; window.__proxima = null; return p; }
      return { stop_reason: 'end_turn', content: [{ type: 'text', text: 'resposta para: ' + (tx ? tx.split('\\n')[0].slice(0, 40) : '?') }] }; };
    iaAbre(); return true; })()`); await wait(900);
  ok('a gaveta abriu com o campo de escrever', await ev(`!!document.getElementById('iaForm') && !!document.getElementById('iaTxt')`));
  const espera = async (ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (!(await ev(`iaOcupado || ${FILA}.length > 0`))) return true; await wait(200); } return false; };
  const bolhas = () => ev(`[...document.querySelectorAll('#iaMsgs .iaB')].filter(b => !b.classList.contains('pensa')).map(b => b.className.replace('iaB ', '') + ': ' + b.innerText.replace(/\\n?Copiar$/i, '').trim().slice(0, 60))`);
  const manda = (t) => ev(`(function(){ const ta = document.getElementById('iaTxt'); ta.value = ${JSON.stringify(t)}; ta.dispatchEvent(new Event('input')); document.getElementById('iaForm').requestSubmit(); return true; })()`);
  console.log('1. mandar com ele ocupado');
  await manda('primeira pergunta'); await wait(150);
  ok('ocupado, o botão de enviar continua LIGADO', await ev(`iaOcupado && !document.getElementById('iaEnviar').disabled`));
  await manda('segunda pergunta'); await wait(150);
  ok('a segunda vai para a fila (aparece acima do campo)', await ev(`${FILA}.length === 1 && !${FILA_EL}.hidden && /segunda pergunta/.test(${FILA_EL}.innerText)`), await ev(`(${FILA_EL} || {}).outerHTML`));
  ok('o campo ficou limpo para a próxima', await ev(`document.getElementById('iaTxt').value === ''`));
  ok('as duas foram respondidas, em ordem', await espera(8000) && await ev(`(function(){ const t = [...document.querySelectorAll('#iaMsgs .iaB')].map(b => b.innerText).join(' | '); return /primeira pergunta[\\s\\S]*resposta para: primeira[\\s\\S]*segunda pergunta[\\s\\S]*resposta para: segunda/.test(t); })()`), await bolhas());
  ok('a fila esvaziou e sumiu', await ev(`${FILA}.length === 0 && ${FILA_EL}.hidden`));
  console.log('2. ditado (voz) com ele ocupado: a fala não some');
  await manda('terceira'); await wait(150);
  /* o fim do ditado faz requestSubmit sozinho; simula o mesmo caminho */
  await manda('falei isto no microfone'); await wait(150);
  ok('a fala foi para a fila', await ev(`${FILA}.some(m => /falei isto no microfone/.test(m.texto))`));
  ok('e foi respondida depois', await espera(8000) && await ev(`/resposta para: falei isto no microfone/.test(document.getElementById('iaMsgs').innerText)`), await bolhas());
  console.log('3. mensagem nova com o cartão de Confirmar aberto');
  const antes = await ev(`DB.coupons.length`);
  await ev(`(function(){ try { iaGrava(IA_CONFIRMA, true); } catch (e) {} window.__chamadas = []; window.__proxima = { stop_reason: 'tool_use', content: [{ type: 'text', text: 'Vou criar o cupom.' }, { type: 'tool_use', id: 'tu1', name: 'criar_cupom', input: { codigo: 'FILA10', desconto: 10 } }] }; return true; })()`);
  await manda('cria um cupom FILA10 de 10%');
  let card = false; for (let k = 0; k < 30 && !card; k++) { await wait(200); card = await ev(`!!document.querySelector('#iaMsgs .iaCard .bts .sim')`); }
  ok('apareceu o cartão de Confirmar', card);
  ok('com o cartão aberto, o enviar segue ligado', await ev(`!document.getElementById('iaEnviar').disabled`));
  await manda('na verdade, quantas reservas tenho amanhã?');
  ok('a mensagem nova fechou o cartão sem gravar o cupom', await espera(8000) && await ev(`DB.coupons.length === ${antes} && !document.querySelector('#iaMsgs .iaCard .bts .sim')`), await ev(`DB.coupons.map(c => c.code)`));
  ok('o assistente diz "Tudo bem, deixei isso de lado." e responde a nova', await ev(`/Tudo bem, deixei isso de lado\\./.test(document.getElementById('iaMsgs').innerText) && /resposta para: na verdade, quantas reservas/.test(document.getElementById('iaMsgs').innerText)`), await bolhas());
  ok('sem chamada extra à IA para o cartão cancelado (2 chamadas: a do cartão e a da nova)', await ev(`window.__chamadas.length === 2`), await ev(`window.__chamadas`));
  const hist = await ev(`(function(){ const h = iaLe(IA_HIST, []); return h.map(m => m.role + ':' + (typeof m.content === 'string' ? 'txt' : m.content.map(b => b.type).join('+'))); })()`);
  ok('o histórico ficou válido (todo tool_use tem tool_result logo depois)', hist.every((x, k) => !/tool_use/.test(x) || /tool_result/.test(hist[k + 1] || '')), hist);
  console.log('4. relógio do "pensando"');
  await ev(`(function(){ window.__lento = 4500; return true; })()`); await manda('pergunta demorada'); await wait(3600);
  ok('"Pensando… N s" aparece quando demora', await ev(`/Pensando… \\d+ s/.test((document.querySelector('#iaMsgs .iaB.pensa') || {}).textContent || '')`), await ev(`(document.querySelector('#iaMsgs .iaB.pensa') || {}).textContent`));
  await espera(8000);
  console.log('5. celular: a gaveta acompanha a parte visível da tela (o teclado não cobre o campo)');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }); await wait(400);
  await ev(`(function(){ iaFecha(); iaAbre(); return true; })()`); await wait(500);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 500, deviceScaleFactor: 2, mobile: true }); await wait(400);
  const g = await ev(`(function(){ visualViewport.dispatchEvent(new Event('resize')); const g = document.getElementById('iaGaveta'), f = document.getElementById('iaForm').getBoundingClientRect(); return { h: g.getBoundingClientRect().height, vv: visualViewport.height, formBaixo: f.bottom }; })()`);
  ok('a gaveta tem a altura da parte visível e o campo de enviar fica dentro dela', Math.abs(g.h - g.vv) < 3 && g.formBaixo <= g.vv + 1, g);
  ok('nenhuma exceção na página', !excecoes.length, excecoes.slice(0, 3));
} catch (e) { falhas++; console.log('  FALHA erro: ' + e.message); }
finally { try { chrome.kill(); } catch (e) {} try { fs.rmSync(PERFIL, { recursive: true, force: true }); } catch (e) {} }
console.log(falhas ? falhas + ' FALHA(S)' : 'tudo passou');
process.exit(falhas ? 1 : 0);
