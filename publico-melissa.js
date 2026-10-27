/* =====================================================
   LINKS PARA O CLIENTE (27/10/2026) — o kit da viagem

   As reservas da Melissa são PRIVADAS (o cliente não lê a nuvem). Então o
   que vai para o cliente viaja DENTRO do próprio link: o conteúdo é
   comprimido e posto depois do # (#/kt/…). Nada fica público em lugar
   nenhum: só quem recebeu o link vê, e o # não é enviado ao servidor.
   É o mesmo dos outros apps do estúdio, com a casca na marca dela.

   O FORMATO É FIXO (o robô de e-mail, em Python, monta o mesmo link):
   JSON em UTF-8 → deflate-raw → base64url sem "=", com o prefixo "z"
   ("u" = sem compressão, para navegador antigo).

   Publico.codifica(objeto) → Promise<texto>   Publico.le(texto) → Promise<objeto>
   ROTAS_EXTRA['kt'] = (partes) => { … }  — o route() do app.js chama antes das rotas dele
   ===================================================== */
'use strict';

window.ROTAS_EXTRA = window.ROTAS_EXTRA || {};
const Publico = (function () {
  const b64url = (bytes) => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  const deB64url = (t) => { const s = atob(String(t).replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((String(t).length + 3) % 4)); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; };
  async function comprime(txt) {
    const bytes = new TextEncoder().encode(txt);
    if (typeof CompressionStream === 'undefined') return 'u' + b64url(bytes);
    const cs = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    return 'z' + b64url(new Uint8Array(await new Response(cs).arrayBuffer()));
  }
  async function descomprime(t) {
    const tipo = String(t || '').charAt(0), corpo = String(t || '').slice(1);
    const bytes = deB64url(corpo);
    if (tipo === 'u') return new TextDecoder().decode(bytes);
    if (tipo !== 'z' || typeof DecompressionStream === 'undefined') throw new Error(pubTx('formato'));
    const ds = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new TextDecoder().decode(await new Response(ds).arrayBuffer());
  }
  return {
    async codifica(obj) { return comprime(JSON.stringify(obj)); },
    async le(t) { return JSON.parse(await descomprime(t)); },
    base() { return location.href.split('#')[0].replace(/\?.*$/, ''); },
    async link(rota, obj) { return this.base() + '#/' + rota + '/' + await this.codifica(obj); },
  };
})();
window.Publico = Publico;

/* os textos da casca, no idioma da página (o do kit, ou o do aparelho) */
const PUB_TX = {
  pt: { pdf: 'Salvar em PDF', rodape: 'Qualquer dúvida, fale com a Melissa no WhatsApp.', wa: 'Oi, Melissa!', erroTit: 'Não consegui abrir este link',
    erro: 'O link pode ter sido cortado ao copiar. Peça à Melissa para mandar de novo.', abrindo: 'Abrindo…', formato: 'link num formato que este navegador não abre' },
  en: { pdf: 'Save as PDF', rodape: 'Any questions, message Melissa on WhatsApp.', wa: 'Hi Melissa!', erroTit: 'I could not open this link',
    erro: 'The link may have been cut when copied. Ask Melissa to send it again.', abrindo: 'Opening…', formato: 'this browser cannot open links in this format' },
};
let pubLang = '';
const pubL = () => (pubLang || (typeof LANG !== 'undefined' && LANG) || 'pt') === 'en' ? 'en' : 'pt';
const pubTx = (k) => PUB_TX[pubL()][k];

/* a página que o cliente abre: a casca dela (marca, salvar em PDF, erro amigável) */
function paginaPublica(titulo, html, opts) {
  opts = opts || {};
  if (opts.lang) pubLang = opts.lang;
  const wa = (typeof waLink === 'function') ? waLink(opts.waTexto || pubTx('wa'), opts.whats || undefined) : '#';
  app.innerHTML = `<div class="pubPg">
    <header class="topbar"><span class="tbrand">${typeof logoMark === 'function' ? logoMark(24, 'var(--brand-amarelo)') : ''}<b>Melissa Hallais</b></span>
      ${opts.semImprimir ? '' : `<button class="mini" id="pubPdf" style="margin-left:auto">${esc(pubTx('pdf'))}</button>`}</header>
    <main class="wrap pubWrap" id="pubPrint">${html}</main>
    <p class="why center pubPe">${esc(opts.rodape || pubTx('rodape'))} <a href="${esc(wa)}" target="_blank" rel="noopener">WhatsApp</a></p>
  </div>`;
  document.title = titulo;
  document.documentElement.lang = pubL() === 'en' ? 'en' : 'pt-BR';
  /* PDF de verdade, sem "imprimir" (pdf-melissa.js) */
  const b = document.getElementById('pubPdf'); if (b) { if (typeof pdfLiga === 'function') pdfLiga(b, () => document.getElementById('pubPrint'), () => document.title, { lang: pubL() }); else b.onclick = () => window.print(); }
}
function paginaPublicaErro(msg) {
  paginaPublica('Melissa Hallais · Voyages & Images', `<section class="card"><h1 class="pageh">${esc(pubTx('erroTit'))}</h1><p class="why">${esc(msg || pubTx('erro'))}</p></section>`, { semImprimir: true });
}
/* abre um link público: decodifica e entrega o objeto para quem desenha */
function abrePublico(partes, desenha) {
  const dado = (partes || []).join('/');
  if (!dado) return paginaPublicaErro();
  app.innerHTML = `<main class="wrap"><p class="why center" style="margin-top:40px">${esc(pubTx('abrindo'))}</p></main>`;
  Publico.le(dado).then(desenha).catch(e => paginaPublicaErro(e && e.message && !/JSON|token|atob|decod/i.test(e.message) ? e.message : ''));
}
(function () {
  if (document.getElementById('pubCss')) return;
  const s = document.createElement('style'); s.id = 'pubCss';
  s.textContent = `.pubWrap{max-width:860px;padding-top:18px}
  .pubPe{margin:10px 0 30px;padding:0 16px}
  @media print{ .pubPg > header, .pubPg > p, #iaFab, #iaGaveta, .toast{display:none!important} body{background:#fff} .pubWrap{max-width:none;padding:0} @page{size:A4;margin:10mm} }`;
  document.head.appendChild(s);
})();
