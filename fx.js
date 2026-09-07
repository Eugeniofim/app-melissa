/* ---------- cotação EUR → BRL ----------
   O Pix só existe em real. Um "copia e cola" SEM valor deixa o cliente
   parado no banco sem saber quanto pagar — foi exatamente o que travou a
   primeira venda de verdade da Melissa em 07/09/2026: a cliente colou o
   código, o banco pediu o valor, e ninguém sabia qual era.

   Em 03/09 ela mandou tirar a conversão, e tinha razão no que viu: o app
   dizia R$ 705 onde o banco dela dava R$ 669. Mas a culpa não era da
   cotação — era do que estava em cima dela: 4% de margem e arredondamento
   de 5 em 5. Com a cotação limpa, € 113 dá R$ 673: o número do banco.

   Por isso a margem agora nasce ZERO e não há arredondamento nenhum. Se
   ela quiser cobrir o spread da conversão, põe a margem no painel — mas é
   escolha dela, feita de olhos abertos, não um acréscimo escondido.

   REGRA DE OURO: número errado é pior que número nenhum. Sem cotação, o
   Pix volta a sair sem valor e a tela manda pedir o valor no WhatsApp. */
'use strict';

const FX_KEY = 'vi_fx_v1';
const FX_VALIDADE = 6 * 3600e3;   /* o BCE publica uma vez por dia; 6h basta */
const FX_TIMEOUT  = 6000;

/* Duas fontes independentes e gratuitas, ambas com CORS liberado.
   Se uma cair, a outra atende — e as duas batem até a terceira casa. */
const FX_FONTES = [
  { nome: 'bce',    url: 'https://api.frankfurter.dev/v1/latest?base=EUR&symbols=BRL' },
  { nome: 'er-api', url: 'https://open.er-api.com/v6/latest/EUR' },
];

let fxMem = null;

function fxGuardado() {
  try { return JSON.parse(localStorage.getItem(FX_KEY)) || null; } catch (e) { return null; }
}
function fxFresco(c) { return !!(c && c.taxa > 0 && (Date.now() - c.em) < FX_VALIDADE); }

async function fxBusca(f) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FX_TIMEOUT);
  try {
    const r = await fetch(f.url, { signal: ctrl.signal });
    if (!r.ok) return null;
    const j = await r.json();
    const taxa = j && j.rates && +j.rates.BRL;
    return taxa > 0 ? taxa : null;
  } catch (e) { return null; } finally { clearTimeout(t); }
}

async function fxAtualiza() {
  const guardado = fxGuardado();
  if (fxFresco(guardado)) { fxMem = guardado; return fxMem; }
  for (const f of FX_FONTES) {
    const taxa = await fxBusca(f);
    if (taxa) {
      fxMem = { taxa, em: Date.now(), fonte: f.nome };
      try { localStorage.setItem(FX_KEY, JSON.stringify(fxMem)); } catch (e) {}
      return fxMem;
    }
  }
  /* Sem rede ou as duas fora do ar: fica com o último valor conhecido, mesmo
     vencido. Cotação de ontem ajuda o cliente; nenhuma não ajuda nada. */
  fxMem = guardado || null;
  return fxMem;
}

/* A cotação que vale: a que ELA fixou no painel manda; senão, a do dia.
   Fixar é útil quando ela combinou um câmbio com o cliente e não quer que
   o número mude no meio da conversa. */
function fxTaxa() {
  const dela = (typeof DB !== 'undefined' && DB && DB.settings && +DB.settings.fxTaxa) || 0;
  if (dela > 0) return dela;
  return (fxMem && fxMem.taxa) || null;
}
function fxManual() {
  return ((typeof DB !== 'undefined' && DB && DB.settings && +DB.settings.fxTaxa) || 0) > 0;
}
function fxDoDia() { return (fxMem && fxMem.taxa) || null; }
function fxVencida() { return !fxManual() && !!(fxMem && !fxFresco(fxMem)); }

/* Converte euro em real. A margem NÃO é lucro escondido: é a folga que ela
   escolhe para cobrir o spread de quem converte. Nasce em zero. */
function emReais(eur) {
  const taxa = fxTaxa();
  if (!taxa || !(eur > 0)) return null;
  const margem = (typeof DB !== 'undefined' && DB && DB.settings && +DB.settings.fxMargem) || 0;
  return Math.round(eur * taxa * (1 + margem / 100) * 100) / 100;
}

function brl(v) {
  if (v == null) return '';
  return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
