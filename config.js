/* Config do assistente da Melissa (Voyages & Images).
   O app em si é base própria e não usa APP_CONFIG; isto existe só para o
   assistente saber onde é o cofre (o cérebro) e qual cliente é ela.
   A chave da IA mora no cofre (modo demo usa a do Eugênio; o modelo forte,
   quando ligado, usa a chave dela em cofre_clientes + login da dona). */
var APP_CONFIG = {
  cofre: 'https://uopfqlogjzuqpabptxkb.supabase.co/functions/v1/cofre',
  clienteCofre: 'melissa',
};
/* A base própria da Melissa não tem tl() (texto {pt,en}); o motor usa.
   Shim compatível: objeto → idioma atual/pt/en; string → ela mesma. */
if (typeof window !== 'undefined' && typeof window.tl !== 'function') {
  window.tl = function (o) {
    if (o == null) return '';
    if (typeof o === 'string') return o;
    var L = (typeof LANG !== 'undefined' && LANG) || 'pt';
    return o[L] || o.pt || o.en || Object.values(o)[0] || '';
  };
}

/* O motor (assistente.js) formata datas com locale() (base app-guia). A base
   da Melissa usa LANG ('pt'/'en'). Shim: devolve o locale BCP-47 certo. */
if (typeof window !== 'undefined' && typeof window.locale !== 'function') {
  window.locale = function () { return (typeof LANG !== 'undefined' && LANG === 'en') ? 'en' : 'pt-BR'; };
}

/* A base app-guia tem temNuvem(); a base própria da Melissa não. Ela TEM
   nuvem (cloud.js SUPA_URL preenchido), então o assistente exige login —
   cliente não vê. */
if (typeof window !== 'undefined' && typeof window.temNuvem !== 'function') {
  window.temNuvem = function () { try { return typeof SUPA_URL !== 'undefined' ? !!SUPA_URL : true; } catch (e) { return true; } };
}

/* Módulos da base Mari que a Melissa ainda não tem (orçamento/PDF, brindes):
   stub de segurança pra o assistente não quebrar. Ligar de verdade = fase 2. */
if (typeof window !== 'undefined') {
  window.Orc = window.Orc || { all: () => [], get: () => null, novo: () => ({ num: '—', itens: [] }), atualiza: () => {}, item: (x) => x, totais: () => ({ total: 0 }) };
  window.Brindes = window.Brindes || { all: () => [], envios: () => [], enviadosPara: () => [], add: () => {}, update: () => {}, remove: () => {} };
  window.Roteiro = window.Roteiro || { all: () => [] };
}

/* A base app-guia tem guiaNome/guiaNegocio/guiaBase (lêem a identidade do guia);
   a base própria da Melissa guarda em DB.settings. Shims compatíveis. */
if (typeof window !== 'undefined') {
  window.guiaNome = window.guiaNome || function () { try { return (DB.settings && DB.settings.admName) || 'Melissa'; } catch (e) { return 'Melissa'; } };
  window.guiaNegocio = window.guiaNegocio || function () { try { return (DB.settings && (DB.settings.negocio || DB.settings.brand)) || 'Voyages & Images'; } catch (e) { return 'Voyages & Images'; } };
  window.guiaBase = window.guiaBase || function () { try { return (DB.settings && DB.settings.base) || 'Alsácia e Floresta Negra'; } catch (e) { return 'Alsácia e Floresta Negra'; } };
}
