/* =====================================================
   O KIT DA VIAGEM (27/10/2026)

   Quem pagou recebe UMA página com tudo da viagem, na marca dela: o voucher
   de cada passeio, dia e hora, ponto de encontro (abrir no mapa), o programa
   (as paradas), incluso e não incluso, o que levar, o pagamento (pago, o que
   falta, até quando, e o botão do cartão), "pôr na agenda", as dicas dela e
   o contato. Um link por CLIENTE (não um por passeio): quem fez a Floresta
   Negra e os Mercados de Natal recebe uma página só, em ordem de data. O PDF
   sai da mesma página (pdf-melissa.js). Em português ou inglês — no idioma em
   que o cliente reservou (ela troca no painel).

   O FORMATO é o mesmo dos outros apps do estúdio (JSON v1 — os nomes dos
   campos não mudam): o robô de e-mail dela (avisar.py, em Python) monta o
   MESMO kit e manda o link na confirmação de pagamento.

   O LINK CURTO E SEMPRE ATUALIZADO (#/k/<código>): o kit fica numa tabela só
   dele no banco (melissa.kits — LIGAR-KIT-MELISSA-SALA.sql). O cliente lê UM kit pelo
   código (função kit), nunca a tabela; só a dona grava. Mudou a hora ou
   entrou um pagamento → o app republica sozinho e o cliente vê no mesmo link.
   Sem a tabela (ou sem login), cai no link COMPRIDO (#/kt/…, o kit viaja
   dentro do link): funciona, mas não se atualiza. Os códigos ficam em
   DB.kits (privado: sobe linha a linha pela tabela itens, nunca no appstate).

   NUNCA vai para o kit o e-mail ou o telefone do CLIENTE (a página é aberta
   por quem tiver o link). O dela (WhatsApp, Instagram, e-mail) vai.

   Kit.dados(chave) · Kit.link(chave) → url · Kit.mensagem(chave) → texto
   Kit.abrir(chave) · Kit.urlConhecida(chave) · Kit.agendar(chave)
   ===================================================== */
'use strict';

/* ---------- os textos do kit (no idioma do CLIENTE) ---------- */
const KIT_TX = {
  pt: {
    eyebrow: 'Sua viagem com a Melissa', passeio: 'Passeio', passeios: 'passeios', umPasseio: 'passeio', voucher: 'Voucher',
    quando: 'Quando', as: 'às', pessoas: 'Pessoas', pessoa: 'pessoa', pessoasN: 'pessoas', adultos: '{a} adulto(s) e {c} criança(s)',
    encontro: 'Ponto de encontro', encontroFalta: 'A Melissa confirma pelo WhatsApp', mapa: 'Abrir no mapa',
    programa: 'O programa', inclui: 'Incluso', naoInclui: 'Não incluso', levar: 'O que levar',
    pago: 'Pago', falta: 'Falta pagar', ate: 'até {d}', tudoPago: 'Tudo pago ✓', situacao: 'Situação', pagar: 'Pagar {v} com cartão',
    totPago: 'Total pago', totFalta: 'Falta', gcal: 'Pôr no Google Agenda', icsTudo: 'Pôr tudo na minha agenda', wa: 'WhatsApp da Melissa',
    waTexto: 'Oi, Melissa! Sobre a minha viagem…', dicas: 'Dicas da Melissa', parceiros: 'Descontos dos parceiros',
    parceirosTxt: 'Com esta viagem você tem desconto nestas lojas. Para usar, é só pedir à Melissa.', brindes: 'Presentes da Melissa',
    roteiro: 'O seu roteiro', roteiroTxt: 'Os dias livres, montados pela Melissa para vocês.', roteiroBt: 'Abrir o roteiro',
    peTit: 'No dia, é só mostrar o voucher', peTxt: 'No celular ou impresso. O código de cada passeio está no topo dele.',
    sua: 'Sua viagem', rodape: 'Guarde este link no celular. Qualquer dúvida, fale com a Melissa no WhatsApp.',
    abrindo: 'Abrindo a sua viagem…', naoExiste: 'Este link de viagem não existe mais. Peça à Melissa um novo pelo WhatsApp.',
    semNet: 'Sem internet para abrir a sua viagem. Tente de novo em instantes.', icsOk: 'Agenda baixada: abra o arquivo para pôr tudo no celular',
    tipos: { day: 'Dia inteiro', walk: 'A pé', photo: 'Passeio com fotos', session: 'Sessão de fotos', bike: 'De bike' },
    msg: (n, prim, url, k) => `Oi, ${prim}! Tudo bem? 😊 Aqui está o kit da sua viagem comigo: ${k > 1 ? 'os vouchers dos ' + k + ' passeios' : 'o voucher'}, o horário, o ponto de encontro, o que levar e as minhas dicas.\n${url}\n\nGuarde no celular: no dia, é só mostrar o voucher. Qualquer dúvida, me chama aqui!`,
  },
  en: {
    eyebrow: 'Your trip with Melissa', passeio: 'Tour', passeios: 'tours', umPasseio: 'tour', voucher: 'Voucher',
    quando: 'When', as: 'at', pessoas: 'People', pessoa: 'person', pessoasN: 'people', adultos: '{a} adult(s) and {c} child(ren)',
    encontro: 'Meeting point', encontroFalta: 'Melissa will confirm it on WhatsApp', mapa: 'Open in maps',
    programa: 'The plan', inclui: 'Included', naoInclui: 'Not included', levar: 'What to bring',
    pago: 'Paid', falta: 'Still to pay', ate: 'by {d}', tudoPago: 'Fully paid ✓', situacao: 'Status', pagar: 'Pay {v} by card',
    totPago: 'Total paid', totFalta: 'Still to pay', gcal: 'Add to Google Calendar', icsTudo: 'Add everything to my calendar', wa: "Melissa's WhatsApp",
    waTexto: 'Hi Melissa! About my trip…', dicas: "Melissa's tips", parceiros: 'Partner discounts',
    parceirosTxt: 'With this trip you get a discount in these shops. Just ask Melissa.', brindes: 'Gifts from Melissa',
    roteiro: 'Your itinerary', roteiroTxt: 'Your free days, planned by Melissa.', roteiroBt: 'Open the itinerary',
    peTit: 'On the day, just show your voucher', peTxt: "On your phone or printed. Each tour's code is at its top.",
    sua: 'Your trip', rodape: 'Keep this link on your phone. Any questions, message Melissa on WhatsApp.',
    abrindo: 'Opening your trip…', naoExiste: 'This trip link no longer exists. Ask Melissa for a new one on WhatsApp.',
    semNet: 'No internet to open your trip. Please try again in a moment.', icsOk: 'Calendar downloaded: open the file to add everything to your phone',
    tipos: { day: 'Full day', walk: 'On foot', photo: 'Photo tour', session: 'Photo session', bike: 'By bike' },
    msg: (n, prim, url, k) => `Hi ${prim}! 😊 Here is your trip kit: ${k > 1 ? 'the vouchers for your ' + k + ' tours' : 'your voucher'}, the time, the meeting point, what to bring and my tips.\n${url}\n\nKeep it on your phone: on the day, just show the voucher. Any questions, message me here!`,
  },
};
/* os textos do PAINEL (no idioma dela) */
const KIT_ADM = {
  pt: { botao: 'Kit da viagem', voltar: '← voltar', copiar: 'Copiar link', zap: 'Mandar no WhatsApp', zap2: 'Mandar no WhatsApp (escolher contato)', pdf: 'Gerar PDF',
    curto: '✓ Link curto e sempre atualizado: o cliente vê as mudanças no mesmo link.', nasce: 'O link curto nasce quando você copiar ou mandar.',
    semTabela: 'Link comprido: falta ligar a tabela do kit no Supabase (LIGAR-KIT-MELISSA-SALA.sql). Funciona, mas não se atualiza sozinho.',
    semLogin: 'Link comprido (sem login ou sem nuvem): funciona, mas não se atualiza sozinho.', idioma: 'Idioma do kit:',
    edTit: 'As dicas e o que levar', edTxt: 'Vão em todo kit, no idioma escolhido acima. Uma por linha.', dicas: 'Dicas da Melissa', levar: 'O que levar',
    salvar: 'Salvar', padrao: 'Voltar ao padrão', salvo: 'Salvo', padraoOk: 'O texto padrão voltou', copiado: 'Link copiado', copie: 'Copie o link:',
    semReserva: 'Esse cliente ainda não tem reserva confirmada (paga): o kit nasce quando o dinheiro entra.' },
  en: { botao: 'Trip kit', voltar: '← back', copiar: 'Copy link', zap: 'Send on WhatsApp', zap2: 'Send on WhatsApp (choose contact)', pdf: 'Make PDF',
    curto: '✓ Short link that updates itself: the guest sees changes on the same link.', nasce: 'The short link is created when you copy or send it.',
    semTabela: 'Long link: the kit table is not switched on in Supabase yet (LIGAR-KIT-MELISSA-SALA.sql). It works, but does not update itself.',
    semLogin: 'Long link (not logged in or no cloud): it works, but does not update itself.', idioma: 'Kit language:',
    edTit: 'Tips and what to bring', edTxt: 'They go in every kit, in the language chosen above. One per line.', dicas: "Melissa's tips", levar: 'What to bring',
    salvar: 'Save', padrao: 'Back to default', salvo: 'Saved', padraoOk: 'Default text is back', copiado: 'Link copied', copie: 'Copy the link:',
    semReserva: 'This guest has no confirmed (paid) booking yet: the kit is created when the money comes in.' },
};
/* DICAS PADRÃO — curtas e só o que é certo (ela edita no painel). As MESMAS do robô (kit.py). */
const KIT_DICAS_PADRAO = {
  pt: [
    'Emergência: 112 (vale em toda a Europa).',
    'A moeda é o euro. Cartão é aceito na maioria dos lugares, mas nos mercados de Natal leve um pouco de dinheiro: algumas barracas só aceitam espécie.',
    'Nos mercados de Natal, o vin chaud vem num copo com caução: devolva na barraca e receba o valor de volta — ou leve o copo de lembrança.',
    'Tomada: padrão europeu, de dois pinos redondos.',
    'Na França a gorjeta não é obrigatória: o serviço já vem incluído na conta.',
    'No inverno escurece cedo e faz frio: vista-se em camadas e use sapato confortável.',
  ],
  en: [
    'Emergency number: 112 (works all over Europe).',
    'The currency is the euro. Cards are accepted in most places, but bring some cash for the Christmas markets: some stalls only take cash.',
    'At the Christmas markets, mulled wine comes in a cup with a deposit: return it to the stall to get the money back — or keep the cup as a souvenir.',
    'Plugs: European standard, two round pins.',
    'In France tipping is not required: service is already included in the bill.',
    'In winter it gets dark early and it is cold: dress in layers and wear comfortable shoes.',
  ],
};
const KIT_LEVAR_PADRAO = {
  pt: ['Sapato confortável para caminhar', 'Roupa para o tempo do dia (no inverno: casaco, gorro e luvas)', 'Celular carregado — e este kit'],
  en: ['Comfortable walking shoes', 'Clothes for the weather (in winter: coat, hat and gloves)', 'A charged phone — and this kit'],
};
/* passeio na Floresta Negra atravessa a fronteira (França → Alemanha) */
const KIT_LEVAR_FLORESTA = { pt: 'Documento de identidade ou passaporte: o passeio vai até a Alemanha', en: 'ID card or passport: the tour goes into Germany' };

const kitLg = (l) => (l === 'en' ? 'en' : 'pt');
const kitLangDoc = (d) => kitLg((d && d.lang) || (typeof LANG !== 'undefined' ? LANG : 'pt'));
const kitT = (lang, k, vars) => { let s = KIT_TX[kitLg(lang)][k]; if (vars && typeof s === 'string') for (const v in vars) s = s.split('{' + v + '}').join(vars[v]); return s; };
const kitA = (k) => KIT_ADM[(typeof LANG !== 'undefined' && LANG === 'en') ? 'en' : 'pt'][k];
const kitNo = (o, lang) => !o ? '' : typeof o === 'string' ? o : String(o[kitLg(lang)] || o.pt || o.en || '');
const kitLista = (a, lang) => (a && typeof a === 'object' && !Array.isArray(a) ? (a[kitLg(lang)] || a.pt || a.en || []) : Array.isArray(a) ? a : []).map(s => String(s || '').trim()).filter(Boolean);
const kitChaveDe = (b) => String((b && (b.email || b.whats || b.name)) || '').toLowerCase();
const kitPrim = (n) => String(n || '').trim().split(/\s+/)[0] || '';
const kitDig = (w) => String(w || '').replace(/\D/g, '');
const kitLoc = (lang) => (kitLg(lang) === 'en' ? 'en-GB' : 'pt-BR');
const kitEur = (v, lang) => '€ ' + Number(+v || 0).toLocaleString(kitLoc(lang), { maximumFractionDigits: 2 });
const kitCap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
/* o endereço oficial dela (o link vai para o cliente — nunca o de teste) */
const kitBase = () => (/(^|\.)melissahallais\.com$/.test(location.hostname) ? 'https://app.melissahallais.com/' : Publico.base());
function kitData(iso, lang, opts) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return '';
  return new Date(iso + 'T12:00:00').toLocaleDateString(kitLoc(lang), Object.assign({ weekday: 'long', day: 'numeric', month: 'long' }, opts || {}));
}
function kitPeriodo(sv, lang) {
  if (!sv.length) return '';
  const a = sv[0].data, b = sv[sv.length - 1].data;
  const f = (iso, ano) => new Date(iso + 'T12:00:00').toLocaleDateString(kitLoc(lang), Object.assign({ day: 'numeric', month: 'long' }, ano ? { year: 'numeric' } : {}));
  return a === b ? f(a, true) : f(a, false) + (kitLg(lang) === 'en' ? ' to ' : ' a ') + f(b, true);
}
/* "10:00 as 18h", "14h30" → a hora de início (HH:MM) */
function kitHora(txt) {
  const m = String(txt || '').match(/(\d{1,2})\s*(?::|h|H)\s*(\d{2})?/);
  if (!m) return '';
  return String(Math.min(23, +m[1] || 0)).padStart(2, '0') + ':' + String(Math.min(59, +(m[2] || 0))).padStart(2, '0');
}
/* quanto dura (minutos): "10:00 as 18h" ou "09h00 – 18h00" = de uma hora à outra; "2h30" = 150; senão 3 horas.
   A MESMA conta do robô (kit.py: dur_min). */
function kitDurMin(hora, duracao) {
  const tempos = (s) => [...String(s || '').matchAll(/(\d{1,2})\s*(?::|h|H)\s*(\d{2})?/g)].map(m => Math.min(23, +m[1]) * 60 + Math.min(59, +(m[2] || 0)));
  for (const s of [hora, duracao]) { const t = tempos(s); if (t.length >= 2 && t[1] > t[0]) return t[1] - t[0]; }
  const m = String(duracao || '').match(/^\s*(\d{1,2})\s*h\s*(\d{2})?\s*$/i);
  if (m && +m[1] >= 1 && +m[1] <= 12) return +m[1] * 60 + +(m[2] || 0);
  return 180;
}
function kitDicas(lang) {
  const v = DB.settings.kitDicas, L = kitLg(lang);
  const l = Array.isArray(v) ? v : (v && Array.isArray(v[L]) ? v[L] : KIT_DICAS_PADRAO[L]);
  return l.map(x => String(x || '').trim()).filter(Boolean).slice(0, 14);
}
function kitLevarBase(lang) {
  const v = DB.settings.kitLevar, L = kitLg(lang);
  const l = Array.isArray(v) ? v : (v && Array.isArray(v[L]) ? v[L] : KIT_LEVAR_PADRAO[L]);
  return l.map(x => String(x || '').trim()).filter(Boolean).slice(0, 10);
}
const kitLevar = (lang, x) => (x && x.region === 'blackforest' ? [KIT_LEVAR_FLORESTA[kitLg(lang)]] : []).concat(kitLevarBase(lang));
/* a foto do passeio: as dela são enviadas pelo painel (data:…, centenas de KB) */
function kitFoto(ph) {
  ph = String(ph || '').trim();
  if (!ph) return '';
  if (/^data:image\//.test(ph) || /^https?:\/\//.test(ph)) return ph;
  return kitBase() + ph.replace(/^\.?\//, '');
}

/* as reservas do cliente que entram no kit: as PAGAS (confirmadas) que estão por vir (e as de ontem); se a viagem já passou, as últimas */
function kitReservas(chave) {
  const todas = DB.bookings.filter(b => b.status === 'confirmed' && kitChaveDe(b) === chave)
    .sort((a, b) => (a.date + kitHora(a.time)).localeCompare(b.date + kitHora(b.time)));
  const desde = addDays(isoToday(), -1), vivas = todas.filter(b => b.date >= desde);
  return vivas.length ? vivas : todas.slice(-3);
}
function kitLangDe(chave, bs) {
  const t = DB.kits && DB.kits[chave];
  if (t && (t.lang === 'pt' || t.lang === 'en')) return t.lang;
  const b = (bs || []).find(x => x.lang === 'en' || x.lang === 'pt');
  return b ? b.lang : 'pt';
}
function kitServico(b, lang) {
  const x = Tours.get(b.tourId) || {};
  const pago = Bookings.paid(b), restante = Bookings.due(b);
  const s = {
    code: b.code, nome: kitNo(x.name, lang).trim() || b.tourName || kitT(lang, 'passeio'), tipo: x.type || '',
    data: b.date, hora: kitHora(b.time), pessoas: +b.pax || 1, duracao: String(x.duration || '').trim(), durMin: kitDurMin(b.time, x.duration),
    encontro: kitNo(x.meeting, lang).trim(), hotel: '', guia: '', foto: kitFoto(x.photo), resumo: kitNo(x.tagline, lang).trim(),
    paradas: (x.stops || []).map(p => ({ n: kitNo(p.n, lang).trim(), d: kitNo(p.d, lang).trim() })).filter(p => p.n).slice(0, 12),
    inclui: kitLista(x.includes, lang), naoInclui: kitLista(x.notIncludes, lang), levar: kitLevar(lang, x),
    pago, restante, cancel: kitNo(x.cancel, lang).trim(),
  };
  if (+b.criancas > 0) s.criancas = +b.criancas;
  if (restante > 0) {
    const v = typeof Bookings.dueDate === 'function' ? Bookings.dueDate(b) : '';
    if (v && v > isoToday()) s.vence = v;
    /* o cartão: a página dela #/pagar/<id> abre o Stripe; o valor quem decide é o servidor, pela reserva */
    if (DB.settings.stripeAtivo) { s.pagarUrl = kitBase() + '#/pagar/' + encodeURIComponent(b.id); s.pagarValor = restante; }
  }
  return s;
}
/* o kit inteiro (é ISTO que vai para o cliente: sem o e-mail nem o telefone dele) */
async function kitDados(chave, opts) {
  const bs = kitReservas(chave); if (!bs.length) return null;
  const lang = (opts && opts.lang) || kitLangDe(chave, bs);
  const sv = bs.map(b => kitServico(b, lang));
  const st = DB.settings;
  return { v: 1, lang, nome: bs[0].name || '', periodo: kitPeriodo(sv, lang), servicos: sv, dicas: kitDicas(lang), parceiros: [], brindes: [], roteiro: '',
    whats: kitDig(st.whats), email: String(st.admEmail || '').trim(), insta: String(st.insta || '').replace(/^@/, ''),
    negocio: (typeof guiaNegocio === 'function' && guiaNegocio()) || 'Voyages & Images', gerado: new Date().toISOString() };
}
/* o do link comprido: sem as descrições das paradas nem a foto enviada (link menor) */
function kitEnxuto(d) {
  const o = JSON.parse(JSON.stringify(d));
  o.servicos.forEach(s => { s.paradas = (s.paradas || []).map(p => ({ n: p.n })); if (/^data:/.test(s.foto || '')) s.foto = ''; });
  delete o.roteiro; return o;
}
/* o do link curto (vai para o banco): a foto enviada encolhe para ~720 px */
const _kitFotos = new Map();
function kitFotoLeve(src) {
  if (_kitFotos.has(src)) return _kitFotos.get(src);
  const p = new Promise((ok) => {
    const im = new Image();
    im.onload = () => {
      try {
        const k = Math.min(1, 720 / (im.naturalWidth || 720)), c = document.createElement('canvas');
        c.width = Math.max(1, Math.round((im.naturalWidth || 720) * k)); c.height = Math.max(1, Math.round((im.naturalHeight || 400) * k));
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        const u = c.toDataURL('image/jpeg', 0.7); ok(u.length < src.length ? u : src);
      } catch (e) { ok(''); }
    };
    im.onerror = () => ok('');
    im.src = src;
  });
  _kitFotos.set(src, p); return p;
}
async function kitLeve(d) {
  const o = JSON.parse(JSON.stringify(d));
  for (const s of o.servicos) if (/^data:image\//.test(s.foto || '')) s.foto = await kitFotoLeve(s.foto);
  return o;
}

/* ---------- o link: curto (tabela) ou comprido (dentro do link) ---------- */
function kitTokens() { if (!DB.kits || typeof DB.kits !== 'object' || Array.isArray(DB.kits)) DB.kits = {}; return DB.kits; }
/* os códigos são privados: grava no aparelho e sobe pela tabela itens (nunca no appstate, que é público) */
function kitGuardaTokens() { try { localStorage.setItem(DB_KEY, JSON.stringify(DB)); } catch (e) {} if (typeof itAgendar === 'function') itAgendar(); }
function kitNovoToken() {
  const A = 'ACDEFGHJKMNPQRTUVWXYabcdefghjkmnpqrstuvwxyz34679', u = new Uint8Array(10);
  if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(u); else u.forEach((_, i) => { u[i] = Math.random() * 256; });
  return [...u].map(n => A[n % A.length]).join('');
}
const kitPodeNuvem = () => typeof temNuvem === 'function' && temNuvem() && typeof isLoggedIn === 'function' && isLoggedIn() && !Kit.semTabela;
async function kitPublica(chave, dados) {
  if (!kitPodeNuvem()) return false;
  const T = kitTokens(); let t = T[chave];
  if (!t || !t.token) { t = T[chave] = Object.assign(t || {}, { token: kitNovoToken(), criado: new Date().toISOString() }); kitGuardaTokens(); }
  try {
    const corpo = { token: t.token, dados: await kitLeve(dados), atualizado_em: new Date().toISOString() };
    const r = await supaFetch('kits', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(corpo) });
    if (r.status === 404 || r.status === 400) {
      const j = await r.json().catch(() => ({}));
      if (/kits|relation|schema cache|PGRST20[25]/i.test(JSON.stringify(j))) Kit.semTabela = true;
      return false;
    }
    if (!r.ok && r.status !== 201 && r.status !== 204) return false;
    if (!t.publicado) { t.publicado = new Date().toISOString(); kitGuardaTokens(); }
    return true;
  } catch (e) { return false; }
}
const Kit = {
  semTabela: false,
  dados: kitDados,
  async link(chave) {
    const d = await kitDados(chave); if (!d) throw new Error(kitA('semReserva'));
    if (await kitPublica(chave, d)) return kitBase() + '#/k/' + kitTokens()[chave].token;
    return kitBase() + '#/kt/' + await Publico.codifica(kitEnxuto(d));
  },
  urlConhecida(chave) { const t = (DB.kits && DB.kits[chave]) || null; return t && t.publicado && t.token ? kitBase() + '#/k/' + t.token : ''; },
  curto(chave) { return !!this.urlConhecida(chave); },
  async mensagem(chave, url) {
    const d = await kitDados(chave); if (!d) throw new Error(kitA('semReserva'));
    url = url || await this.link(chave);
    return KIT_TX[kitLg(d.lang)].msg(d.nome, kitPrim(d.nome), url, d.servicos.length);
  },
  abrir(chave) { if (!chave) return; const h = location.hash.slice(1); if (h && !/^\/adm\/kit\//.test(h)) Kit._volta = h; go('/adm/kit/' + encodeURIComponent(chave)); },
  /* republica os kits já mandados quando a reserva muda (hora, pagamento, cancelamento) */
  _fila: new Set(), _t: null,
  agendar(chave) {
    const t = chave && DB.kits && DB.kits[chave]; if (!t || !t.token) return;
    this._fila.add(chave); clearTimeout(this._t);
    this._t = setTimeout(async () => { const l = [...this._fila]; this._fila.clear(); for (const c of l) { try { const d = await kitDados(c); if (d) await kitPublica(c, d); } catch (e) {} } }, 2500);
  },
};
window.Kit = Kit;

/* ---------- a agenda do cliente (.ics e Google) — fuso da Alsácia ---------- */
function kitSoma(hm, min) { const [h, m] = (hm || '09:00').split(':').map(Number); const t = Math.min(1439, h * 60 + m + (min || 180)); return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'); }
function kitGoogle(s, d) {
  const dia = String(s.data || '').replace(/-/g, '');
  const datas = s.hora ? `${dia}T${s.hora.replace(':', '')}00/${dia}T${kitSoma(s.hora, s.durMin).replace(':', '')}00` : `${dia}/${addDays(s.data, 1).replace(/-/g, '')}`;
  const p = new URLSearchParams({ action: 'TEMPLATE', text: s.nome + ' — Melissa Hallais', dates: datas, ctz: 'Europe/Paris', location: s.encontro || '',
    details: 'Voucher ' + s.code + (d.whats ? ' · WhatsApp +' + d.whats : '') });
  return 'https://calendar.google.com/calendar/render?' + p.toString();
}
function kitIcs(d) {
  const z = (iso, hm) => iso.replace(/-/g, '') + 'T' + (hm || '09:00').replace(':', '') + '00';
  const e = (s) => String(s || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
  const ev = (d.servicos || []).map(s => ['BEGIN:VEVENT', 'UID:' + s.code + '@melissahallais.com', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z',
    s.hora ? 'DTSTART;TZID=Europe/Paris:' + z(s.data, s.hora) : 'DTSTART;VALUE=DATE:' + s.data.replace(/-/g, ''),
    s.hora ? 'DTEND;TZID=Europe/Paris:' + z(s.data, kitSoma(s.hora, s.durMin)) : 'DTEND;VALUE=DATE:' + addDays(s.data, 1).replace(/-/g, ''),
    'SUMMARY:' + e(s.nome + ' · Melissa Hallais'), 'LOCATION:' + e(s.encontro || ''), 'DESCRIPTION:' + e('Voucher ' + s.code + (d.whats ? ' · WhatsApp +' + d.whats : '')),
    'BEGIN:VALARM', 'TRIGGER:-PT12H', 'ACTION:DISPLAY', 'DESCRIPTION:' + e(s.nome), 'END:VALARM', 'END:VEVENT'].join('\r\n'));
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Voyages & Images//Kit//PT', ...ev, 'END:VCALENDAR'].join('\r\n');
}
function kitBaixaIcs(d) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([kitIcs(d)], { type: 'text/calendar' }));
  a.download = 'viagem-' + (kitPrim(d.nome) || 'melissa').toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '') + '.ics'; document.body.appendChild(a); a.click(); a.remove();
}
const kitMapa = (q) => (typeof mapLink === 'function' ? mapLink(q) : 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q));

/* ---------- o documento (o mesmo no painel, na página do cliente e no PDF) ---------- */
function kitDocHtml(d) {
  const L = kitLangDoc(d), T = (k, v) => kitT(L, k, v);
  const ic = { mapa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-6-5.3-6-10a6 6 0 0 1 12 0c0 4.7-6 10-6 10z"/><circle cx="12" cy="11" r="2.2"/></svg>',
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>' };
  const sv = (d.servicos || []).filter(s => s && /^\d{4}-\d{2}-\d{2}$/.test(s.data || ''));
  const lista = (a) => (Array.isArray(a) ? a : []).filter(Boolean);
  const pagoT = sv.reduce((s, x) => s + (+x.pago || 0), 0), faltaT = sv.reduce((s, x) => s + (+x.restante || 0), 0);
  const servico = (s, k) => {
    const n = +s.pessoas || 1, kids = +s.criancas || 0, par = lista(s.paradas), inc = lista(s.inclui), nao = lista(s.naoInclui), lev = lista(s.levar);
    const tipo = (KIT_TX[L].tipos[s.tipo]) || T('passeio');
    return `<section class="kt-sv kt-bl" id="kt-sv-${k}">
      <div class="kt-svTopo">${s.foto ? `<img src="${esc(s.foto)}" alt="" loading="lazy">` : ''}<div class="kt-dia"><small>${esc(kitData(s.data, L, { weekday: 'short', day: undefined, month: undefined }).replace('.', ''))}</small><b>${esc(s.data.slice(8, 10))}</b><small>${esc(new Date(s.data + 'T12:00:00').toLocaleDateString(kitLoc(L), { month: 'short' }).replace('.', ''))}</small></div></div>
      <div class="kt-svCorpo">
        <div class="kt-cab"><p class="kt-eyebrow">${esc(tipo)}</p><div class="kt-cod"><small>${esc(T('voucher'))}</small><b>${esc(s.code)}</b></div></div>
        <h2>${esc(s.nome)}</h2>${s.resumo ? `<p class="kt-res">${esc(s.resumo)}</p>` : ''}
        <div class="kt-grade">
          <div><small>${esc(T('quando'))}</small><b>${esc(kitCap(kitData(s.data, L)))}</b>${s.hora ? `<span>${esc(T('as'))} ${esc(s.hora)}${s.duracao ? ' · ' + esc(s.duracao) : ''}</span>` : s.duracao ? `<span>${esc(s.duracao)}</span>` : ''}</div>
          <div><small>${esc(T('pessoas'))}</small><b>${esc(n)} ${esc(n > 1 ? T('pessoasN') : T('pessoa'))}</b>${kids > 0 ? `<span>${esc(T('adultos', { a: Math.max(0, n - kids), c: kids }))}</span>` : ''}${s.guia ? `<span>${esc(s.guia)}</span>` : ''}</div>
          <div class="kt-lg"><small>${esc(T('encontro'))}</small><b>${esc(s.encontro || T('encontroFalta'))}</b>${s.hotel ? `<span>${esc(s.hotel)}</span>` : ''}
            ${s.encontro || s.hotel ? `<a class="kt-lk" href="${esc(kitMapa(s.encontro || s.hotel))}" target="_blank" rel="noopener">${ic.mapa}${esc(T('mapa'))}</a>` : ''}</div>
        </div>
        ${par.length ? `<div class="kt-bl"><h3>${esc(T('programa'))}</h3><ol class="kt-par">${par.map(p => `<li><b>${esc(p.n)}</b>${p.d ? `<span>${esc(p.d)}</span>` : ''}</li>`).join('')}</ol></div>` : ''}
        ${inc.length || nao.length ? `<div class="kt-duas kt-bl">${inc.length ? `<div><h3>${esc(T('inclui'))}</h3><ul class="kt-ok">${inc.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}${nao.length ? `<div><h3>${esc(T('naoInclui'))}</h3><ul class="kt-no">${nao.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}</div>` : ''}
        ${lev.length ? `<div class="kt-bl"><h3>${esc(T('levar'))}</h3><ul class="kt-levar">${lev.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
        ${(+s.pago || 0) > 0 || (+s.restante || 0) > 0 ? `<div class="kt-pg kt-bl"><div><small>${esc(T('pago'))}</small><b>${esc(kitEur(+s.pago || 0, L))}</b></div>${+s.restante > 0 ? `<div class="resta"><small>${esc(T('falta'))}</small><b>${esc(kitEur(s.restante, L))}</b>${s.vence ? `<span>${esc(T('ate', { d: kitData(s.vence, L, { weekday: undefined }) }))}</span>` : ''}</div>` : `<div><small>${esc(T('situacao'))}</small><b>${esc(T('tudoPago'))}</b></div>`}</div>
          ${s.pagarUrl && +s.restante > 0 ? `<a class="kt-cta kt-tela" href="${esc(s.pagarUrl)}">${esc(T('pagar', { v: kitEur(s.pagarValor || s.restante, L) }))}</a>` : ''}` : ''}
        <div class="kt-acs kt-tela"><a class="kt-lk" href="${esc(kitGoogle(s, d))}" target="_blank" rel="noopener">${ic.cal}${esc(T('gcal'))}</a></div>
        ${s.cancel ? `<p class="kt-fino">${esc(s.cancel)}</p>` : ''}
      </div></section>`;
  };
  const dicas = lista(d.dicas), parc = lista(d.parceiros), brindes = lista(d.brindes);
  return `<article class="ktDoc" lang="${L === 'en' ? 'en' : 'pt-BR'}">
    <header class="kt-topo kt-bl">
      <div class="kt-marca">${typeof logoMark === 'function' ? logoMark(46, '#FFD23F') : ''}<img class="kt-logo" src="logo-texto-branco.png" alt="Voyages & Images" width="110" height="70"></div>
      <img class="kt-foto" src="melissa.jpg" alt="Melissa Hallais">
      <p class="kt-eyebrow">${esc(T('eyebrow'))}${d.negocio ? ' · ' + esc(d.negocio) : ''}</p>
      <h1>${esc(d.nome || T('sua'))}</h1>
      <p class="kt-per">${esc(d.periodo || '')}${d.periodo ? ' · ' : ''}${sv.length} ${esc(sv.length > 1 ? T('passeios') : T('umPasseio'))}</p>
      <div class="kt-acsTopo kt-tela">${d.whats ? `<a class="kt-cta kt-ctaA" href="${esc(waLink(T('waTexto'), d.whats))}" target="_blank" rel="noopener">${typeof ICONE_WA !== 'undefined' ? ICONE_WA : ''}${esc(T('wa'))}</a>` : ''}<button type="button" class="kt-bt" data-kt-ics>${esc(T('icsTudo'))}</button></div>
    </header>
    ${sv.length > 1 ? `<nav class="kt-lista kt-bl" aria-label="${esc(T('passeios'))}">${sv.map((s, k) => `<a href="#kt-sv-${k}" data-kt-ir="${k}"><span class="kt-ld">${esc(s.data.slice(8, 10))}/${esc(s.data.slice(5, 7))}</span><b>${esc(s.nome)}</b><span>${esc(s.hora || '')}</span></a>`).join('')}</nav>` : ''}
    ${sv.length > 1 && (pagoT || faltaT) ? `<div class="kt-pg kt-tot kt-bl"><div><small>${esc(T('totPago'))}</small><b>${esc(kitEur(pagoT, L))}</b></div><div class="${faltaT > 0 ? 'resta' : ''}"><small>${esc(T('totFalta'))}</small><b>${esc(kitEur(faltaT, L))}</b></div></div>` : ''}
    ${sv.map(servico).join('')}
    ${d.roteiro ? `<section class="kt-box kt-bl"><h3>${esc(T('roteiro'))}</h3><p>${esc(T('roteiroTxt'))}</p><a class="kt-cta" href="${esc(d.roteiro)}" target="_blank" rel="noopener">${esc(T('roteiroBt'))}</a></section>` : ''}
    ${dicas.length ? `<section class="kt-box kt-bl"><h3>${esc(T('dicas'))}</h3><ul class="kt-levar">${dicas.map(x => `<li>${esc(x)}</li>`).join('')}</ul></section>` : ''}
    ${parc.length ? `<section class="kt-box kt-bl"><h3>${esc(T('parceiros'))}</h3><p class="kt-fino">${esc(T('parceirosTxt'))}</p>${parc.map(p => `<div class="kt-parc"><i>${esc((+p.desconto || 0).toLocaleString(kitLoc(L), { maximumFractionDigits: 1 }))}%</i><div><b>${esc(p.nome)}</b>${p.cat || p.como ? `<small>${esc([p.cat, p.como].filter(Boolean).join(' · '))}</small>` : ''}</div></div>`).join('')}</section>` : ''}
    ${brindes.length ? `<section class="kt-box kt-bl"><h3>${esc(T('brindes'))}</h3>${brindes.map(b => `<a class="kt-lk" href="${esc(b.url)}" target="_blank" rel="noopener">📎 ${esc(b.titulo)}</a>`).join('')}</section>` : ''}
    <footer class="kt-pe kt-bl"><div class="kt-qr" data-kt-qr></div>
      <div><b>${esc(T('peTit'))}</b><span>${esc(T('peTxt'))}</span>
        <span class="kt-cont">${d.whats ? `WhatsApp +${esc(d.whats)}` : ''}${d.email ? ` · ${esc(d.email)}` : ''}${d.insta ? ` · @${esc(d.insta)}` : ''}</span></div></footer>
  </article>`;
}
function kitLiga(raiz, d, url) {
  if (!raiz) return;
  const b = raiz.querySelector('[data-kt-ics]'); if (b) b.onclick = () => { kitBaixaIcs(d); toast(kitT(kitLangDoc(d), 'icsOk')); };
  raiz.querySelectorAll('[data-kt-ir]').forEach(a => a.onclick = (e) => { e.preventDefault(); const el = raiz.querySelector('#kt-sv-' + a.dataset.ktIr); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  /* o QR só para link curto: o comprido viraria um QR impossível de ler */
  const q = raiz.querySelector('[data-kt-qr]'); if (q) q.innerHTML = url && url.length <= 300 && typeof qrSvg === 'function' ? (qrSvg(url, { tamanho: 110, alt: 'QR code' }) || '') : '';
}

/* ---------- a página do cliente ---------- */
window.ROTAS_EXTRA = window.ROTAS_EXTRA || {};
/* a sincronia redesenha a tela de tempos em tempos: a página do kit não pisca nem perde o PDF pronto */
const kitJaNaTela = () => Kit._pagina === location.hash && !!document.querySelector('#pubPrint .ktDoc');
function kitPaginaCliente(d, url) {
  kitCss();
  const L = kitLangDoc(d);
  paginaPublica(kitT(L, 'sua') + ' · ' + (d.nome || 'Melissa Hallais'), kitDocHtml(d), { lang: L, rodape: kitT(L, 'rodape'), waTexto: kitT(L, 'waTexto'), whats: d.whats || undefined });
  kitLiga(document.getElementById('pubPrint'), d, url || location.href);
  Kit._pagina = location.hash;
}
/* o curto: lê o kit no banco pelo código */
ROTAS_EXTRA['k'] = async (partes) => {
  if (kitJaNaTela()) return;
  const tok = String((partes || [])[0] || '').replace(/[^A-Za-z0-9]/g, '');
  if (!tok) return paginaPublicaErro();
  const L = typeof LANG !== 'undefined' && LANG === 'en' ? 'en' : 'pt';
  app.innerHTML = `<main class="wrap"><p class="why center" style="margin-top:40px">${esc(kitT(L, 'abrindo'))}</p></main>`;
  try {
    const r = await supaFetch('rpc/kit', { method: 'POST', headers: { Prefer: '' }, body: JSON.stringify({ p_token: tok }) });
    const d = r.ok ? await r.json() : null;
    if (!d || !Array.isArray(d.servicos)) return paginaPublicaErro(kitT(L, 'naoExiste'));
    kitPaginaCliente(d, location.href);
  } catch (e) { paginaPublicaErro(kitT(L, 'semNet')); }
};
/* o comprido: o kit veio dentro do link (é o do e-mail de confirmação) */
ROTAS_EXTRA['kt'] = (partes) => { if (kitJaNaTela()) return; abrePublico(partes, (d) => kitPaginaCliente(d, location.href)); };

/* ---------- a tela do painel: #/adm/kit/<chave> ---------- */
async function admKit(chave) {
  kitCss();
  const d = await kitDados(chave);
  if (!d) { toast(kitA('semReserva')); go(Kit._volta || '/adm/bookings'); return; }
  const fone = kitDig((kitReservas(chave)[0] || {}).whats);
  const volta = Kit._volta || '/adm/bookings', aba = /^\/adm\/clients/.test(volta) ? 'clients' : 'bookings';
  const estado = () => Kit.curto(chave) ? kitA('curto') : kitPodeNuvem() ? kitA('nasce') : Kit.semTabela ? kitA('semTabela') : kitA('semLogin');
  const L = d.lang;
  document.title = kitA('botao') + ' · ' + (d.nome || '');
  admShell(aba, `<div class="ktTela">
    <div class="ktBarra"><a class="mini" href="#${esc(volta)}">${esc(kitA('voltar'))}</a>
      <span class="ktAcs"><button class="mini" id="ktCopia">${esc(kitA('copiar'))}</button><button class="mini" id="ktZap">${esc(fone.length >= 8 ? kitA('zap') : kitA('zap2'))}</button><button class="cta sm" id="ktPdf">${esc(kitA('pdf'))}</button></span></div>
    <div class="ktLang"><span>${esc(kitA('idioma'))}</span><button type="button" class="chip ${L === 'pt' ? 'on' : ''}" data-ktlang="pt">Português</button><button type="button" class="chip ${L === 'en' ? 'on' : ''}" data-ktlang="en">English</button></div>
    <p class="ktEstado" id="ktEstado">${esc(estado())}</p>
    <div id="ktPrint">${kitDocHtml(d)}</div>
    <section class="card ktEd"><h3>${esc(kitA('edTit'))}</h3><p class="why">${esc(kitA('edTxt'))}</p>
      <label class="fld">${esc(kitA('dicas'))}<textarea id="ktDicasTx" rows="7">${esc(kitDicas(L).join('\n'))}</textarea></label>
      <label class="fld">${esc(kitA('levar'))}<textarea id="ktLevarTx" rows="4">${esc(kitLevarBase(L).join('\n'))}</textarea></label>
      <div class="ktEdAcs"><button class="cta sm" id="ktEdOk">${esc(kitA('salvar'))}</button><button class="mini" id="ktEdPadrao">${esc(kitA('padrao'))}</button></div></section>
  </div>`);
  const url0 = Kit.urlConhecida(chave);
  kitLiga(document.getElementById('ktPrint'), d, url0);
  if (typeof pdfLiga === 'function') pdfLiga($('#ktPdf'), () => $('#ktPrint'), () => (L === 'en' ? 'Trip - ' : 'Viagem - ') + (d.nome || ''), { lang: typeof LANG !== 'undefined' ? LANG : 'pt' });
  const pega = async (b) => {
    b.disabled = true;
    try { const url = await Kit.link(chave); const e = $('#ktEstado'); if (e) e.textContent = estado(); kitLiga(document.getElementById('ktPrint'), d, url); return url; }
    finally { b.disabled = false; }
  };
  $('#ktCopia').onclick = async (e) => { try { const url = await pega(e.currentTarget); try { await navigator.clipboard.writeText(url); toast(kitA('copiado')); } catch (x) { prompt(kitA('copie'), url); } } catch (x) { toast(x.message); } };
  $('#ktZap').onclick = async (e) => {
    try { const url = await pega(e.currentTarget); const msg = await Kit.mensagem(chave, url);
      window.open(fone.length >= 8 ? waLink(msg, fone) : 'https://wa.me/?text=' + encodeURIComponent(msg), '_blank', 'noopener'); } catch (x) { toast(x.message); }
  };
  $$('[data-ktlang]').forEach(b => b.onclick = () => {
    const T = kitTokens(); T[chave] = Object.assign(T[chave] || {}, { lang: b.dataset.ktlang }); kitGuardaTokens();
    Kit.agendar(chave); admKit(chave);
  });
  const grava = (campo, texto) => { const v = DB.settings[campo]; const o = v && typeof v === 'object' && !Array.isArray(v) ? v : {}; o[L] = String(texto || '').split('\n').map(x => x.trim()).filter(Boolean).slice(0, 14); DB.settings[campo] = o; };
  $('#ktEdOk').onclick = () => { grava('kitDicas', $('#ktDicasTx').value); grava('kitLevar', $('#ktLevarTx').value); save(); Kit.agendar(chave); toast(kitA('salvo')); admKit(chave); };
  $('#ktEdPadrao').onclick = () => {
    for (const campo of ['kitDicas', 'kitLevar']) { const v = DB.settings[campo]; if (v && typeof v === 'object' && !Array.isArray(v)) { delete v[L]; if (!Object.keys(v).length) delete DB.settings[campo]; } else delete DB.settings[campo]; }
    save(); Kit.agendar(chave); toast(kitA('padraoOk')); admKit(chave);
  };
  /* abriu o kit: republica (se já tem o curto), para o link do cliente estar igual ao que ela vê */
  if (Kit.curto(chave)) kitPublica(chave, d);
}

/* ---------- o botão "Kit da viagem" (Reservas e Clientes chamam por aqui) ---------- */
function kitBotao(chaveOuReserva) {
  const chave = typeof chaveOuReserva === 'string' ? chaveOuReserva : kitChaveDe(chaveOuReserva);
  if (!chave || !kitReservas(chave).length) return '';
  return `<button type="button" class="mini kitbt" data-kit="${esc(chave)}">${esc(kitA('botao'))}</button>`;
}
window.kitBotao = kitBotao;
document.addEventListener('click', (e) => {
  const bt = e.target && e.target.closest && e.target.closest('[data-kit]');
  if (!bt || !document.getElementById('stage') || !document.getElementById('stage').contains(bt)) return;
  e.preventDefault(); e.stopPropagation(); Kit.abrir(bt.dataset.kit);
});

/* ---------- reserva mudou → o kit que o cliente já tem se atualiza ---------- */
/* toda mudança de reserva pelo app passa por cloudPushBooking/cloudUpdateBooking (painel, assistente, pagamento) */
for (const nome of ['cloudPushBooking', 'cloudUpdateBooking']) {
  if (typeof window[nome] !== 'function') continue;
  const orig = window[nome];
  window[nome] = function (b) { try { if (b) Kit.agendar(kitChaveDe(b)); } catch (e) {} return orig.apply(this, arguments); };
}
/* e o que muda no servidor (o Stripe grava o pagamento, o robô cancela): chega pela sincronia */
function kitConfere() {
  const T = DB.kits || {}, ks = Object.keys(T).filter(k => T[k] && T[k].token && T[k].publicado);
  if (!ks.length) return;
  const A = Kit._assin || (Kit._assin = {});
  for (const k of ks) {
    const a = JSON.stringify(DB.bookings.filter(b => kitChaveDe(b) === k).map(b => [b.id, b.status, b.date, b.time, b.pax, b.total, Bookings.paid(b)]));
    if (A[k] !== undefined && A[k] !== a) Kit.agendar(k);
    A[k] = a;
  }
}
if (typeof window.cloudPull === 'function') {
  const _pull = window.cloudPull;
  window.cloudPull = async function () {
    const r = await _pull.apply(this, arguments);
    try { if (r && r.ok && typeof isLoggedIn === 'function' && isLoggedIn()) kitConfere(); } catch (e) {}
    return r;
  };
}

/* o app avisa nos Ajustes (públicos) que sabe abrir o kit (store.js já nasce com kitVersao = 1) */
if (typeof DB !== 'undefined' && DB && DB.settings && +DB.settings.kitVersao !== 1) { DB.settings.kitVersao = 1; try { localStorage.setItem(DB_KEY, JSON.stringify(DB)); } catch (e) {} }

/* ---------- ligar no app (aba escondida) ---------- */
const _viewAdmKit = viewAdm;
viewAdm = function (tab, arg) { if (tab === 'kit') return admKit(arg ? decodeURIComponent(arg) : ''); return _viewAdmKit.apply(this, arguments); };

function kitCss() {
  if (document.getElementById('ktCss')) return;
  const s = document.createElement('style'); s.id = 'ktCss';
  /* a marca dela (tokens.css): verde #064c3f · amarelo #FFD23F (só preenchimento, nunca texto sobre claro) · vinho #CD1256 · marfim #FBF8F3 · areia #F2EDE4.
     O documento tem cores FIXAS (é um papel): no tema escuro do aparelho ele continua claro e legível. */
  s.textContent = `
  .ktTela{max-width:820px}
  .ktBarra{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:0 0 12px}
  .ktAcs{display:flex;gap:8px;flex-wrap:wrap}
  .ktLang{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 8px;font-size:var(--fs-3);color:var(--ink-2)}
  .ktEstado{max-width:794px;margin:0 0 12px;font-size:var(--fs-3);color:var(--ink-2)}
  .ktEd{max-width:794px;margin:16px 0}.ktEd h3{margin:0 0 4px}.ktEd .fld{display:block;margin-top:12px}
  .ktEd textarea{display:block;width:100%;margin-top:6px;font:inherit;padding:10px 12px;border:1px solid var(--line-2);border-radius:var(--r);background:var(--surface);color:var(--ink)}
  .ktEdAcs{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
  .kitbt{white-space:nowrap}
  .ktDoc{--kv:#064c3f;--ka:#FFD23F;--kr:#a3053f;--kc:#FBF8F3;--ks:#F2EDE4;--kt:#111111;--kt2:#4A4045;--kl:#E1DBD9;max-width:794px;margin:0 auto;background:var(--kc);color:var(--kt);border-radius:18px;overflow:hidden;box-shadow:0 18px 50px -30px rgba(17,17,17,.42);font:400 15px/1.55 var(--f-ui,Karla,system-ui,sans-serif)}
  .ktDoc h1,.ktDoc h2,.ktDoc h3{font-family:var(--f-display,Montserrat,system-ui,sans-serif);font-weight:700;color:var(--kv);margin:0;letter-spacing:-.01em}
  .kt-topo{background:var(--kv);color:#fff;padding:26px 28px 24px;position:relative}
  .kt-marca{display:flex;align-items:center;gap:12px;margin-bottom:16px}
  .kt-marca svg{flex:none}
  .kt-logo{display:block;width:110px;height:auto}
  .kt-foto{position:absolute;right:26px;top:24px;width:76px;height:76px;border-radius:50%;object-fit:cover;box-shadow:0 0 0 3px var(--ka)}
  .kt-topo h1{color:#fff;font-size:30px;line-height:1.15;margin:6px 0 4px}
  .kt-eyebrow{margin:0;font:700 11px/1.3 var(--f-ui,system-ui);letter-spacing:.16em;text-transform:uppercase;color:var(--ka)}
  .kt-svCorpo .kt-eyebrow{color:#7e6308}
  .kt-per{margin:0;color:#e2e7e1}
  .kt-acsTopo{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}
  .kt-cta{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 18px;border-radius:999px;background:var(--kv);color:#fff;font-weight:700;text-decoration:none;border:0;cursor:pointer;font-size:14.5px}
  .kt-ctaA{background:var(--ka);color:#111}
  .kt-cta svg{width:18px;height:18px;fill:currentColor}
  .kt-bt{min-height:44px;padding:0 16px;border-radius:999px;border:1px solid rgba(255,255,255,.55);background:transparent;color:#fff;font:600 14px/1 var(--f-ui,system-ui);cursor:pointer}
  .kt-lista{display:grid;margin:18px 22px 4px;border:1px solid var(--kl);border-radius:14px;overflow:hidden;background:#fff}
  .kt-lista a{display:grid;grid-template-columns:58px 1fr auto;gap:10px;align-items:center;padding:11px 14px;border-top:1px solid var(--kl);color:var(--kt);text-decoration:none}
  .kt-lista a:first-child{border-top:0}
  .kt-ld{font:700 13px/1 var(--f-mono,ui-monospace);color:var(--kv)}
  .kt-lista span:last-child{color:var(--kt2);font-size:13px}
  .kt-sv{margin:18px 22px;background:#fff;border:1px solid var(--kl);border-radius:16px;overflow:hidden}
  .kt-svTopo{position:relative;min-height:12px}
  .kt-svTopo img{display:block;width:100%;height:190px;object-fit:cover}
  .kt-dia{position:absolute;left:14px;bottom:-22px;width:60px;padding:6px 0;border-radius:12px;background:var(--kv);color:#fff;text-align:center;line-height:1.05;box-shadow:0 6px 16px -8px rgba(0,0,0,.5)}
  .kt-svTopo:not(:has(img)) .kt-dia{position:static;margin:14px 0 0 14px}
  .kt-dia b{display:block;font:700 22px/1 var(--f-display,system-ui);color:var(--ka)}
  .kt-dia small{display:block;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#fff}
  .kt-svCorpo{padding:30px 20px 18px}
  .kt-svCorpo h2{font-size:21px;line-height:1.25;margin:4px 0 2px}
  .kt-cab{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
  .kt-cod{flex:none;text-align:center;padding:6px 12px;border:1.5px dashed var(--kv);border-radius:12px;background:var(--kc);line-height:1.1;margin-top:-8px}
  .kt-cod small{display:block;font:700 9.5px/1.2 var(--f-ui,system-ui);letter-spacing:.14em;text-transform:uppercase;color:var(--kt2)}
  .kt-cod b{display:block;font:800 17px/1.2 var(--f-mono,ui-monospace);color:var(--kv);letter-spacing:.04em}
  .kt-res{margin:0 0 6px;color:var(--kt2)}
  .kt-grade{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:14px 0}
  .kt-grade > div{background:var(--ks);border-radius:12px;padding:10px 12px}
  .kt-grade .kt-lg{grid-column:1/-1}
  .kt-grade small,.kt-pg small{display:block;font:700 10.5px/1.2 var(--f-ui,system-ui);letter-spacing:.12em;text-transform:uppercase;color:var(--kt2)}
  .kt-grade b{display:block;color:var(--kv);margin-top:2px}
  .kt-grade span{display:block;color:var(--kt2);font-size:13.5px}
  .kt-lk{display:inline-flex;align-items:center;gap:6px;margin-top:6px;color:var(--kv);font-weight:700;font-size:14px;text-decoration:underline;text-underline-offset:3px}
  .kt-lk svg{width:16px;height:16px}
  .kt-sv h3,.kt-box h3{font-size:15px;margin:14px 0 6px}
  .kt-par{margin:0;padding-left:22px}.kt-par li{margin:6px 0}.kt-par li b{display:block;color:var(--kv)}.kt-par li span{display:block;color:var(--kt2);font-size:13.5px;white-space:pre-line}
  .kt-duas{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .kt-ok,.kt-no,.kt-levar{margin:0;padding:0;list-style:none}
  .kt-ok li,.kt-no li,.kt-levar li{position:relative;padding:3px 0 3px 22px;font-size:14px}
  .kt-ok li::before{content:"✓";position:absolute;left:2px;color:var(--kv);font-weight:800}
  .kt-no li::before{content:"–";position:absolute;left:4px;color:var(--kr);font-weight:800}
  .kt-levar li::before{content:"";position:absolute;left:6px;top:11px;width:7px;height:7px;border-radius:50%;background:var(--ka);box-shadow:0 0 0 1px #7e6308}
  .kt-pg{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0 8px}
  .kt-pg > div{border-radius:12px;padding:10px 12px;background:#e2e7e1}
  .kt-pg > div.resta{background:#f6edd3}
  .kt-pg > div.resta small{color:#7e6308}
  .kt-pg b{display:block;font:700 19px/1.2 var(--f-display,system-ui);color:var(--kv)}
  .kt-pg span{display:block;font-size:12.5px;color:var(--kt2)}
  .kt-tot{margin:14px 22px 0}
  .kt-svCorpo > .kt-cta{margin:4px 0 2px}
  .kt-acs{margin-top:8px}
  .kt-fino{margin:10px 0 0;font-size:12.5px;color:var(--kt2)}
  .kt-box{margin:18px 22px;padding:16px 18px;background:#fff;border:1px solid var(--kl);border-radius:16px}
  .kt-box > .kt-lk{display:flex}
  .kt-box > p{margin:0 0 10px;color:var(--kt2)}
  .kt-parc{display:flex;gap:12px;align-items:center;padding:8px 0;border-top:1px solid var(--kl)}
  .kt-parc:first-of-type{border-top:0}
  .kt-parc i{font-style:normal;min-width:54px;text-align:center;padding:6px 8px;border-radius:10px;background:var(--kv);color:var(--ka);font-weight:800}
  .kt-parc small{display:block;color:var(--kt2)}
  .kt-pe{display:flex;gap:16px;align-items:center;margin:18px 0 0;padding:18px 22px;background:var(--kv);color:#fff}
  .kt-pe b{display:block;color:#fff}.kt-pe span{display:block;font-size:13px;color:#e2e7e1}
  .kt-qr{flex:none;width:110px;min-height:10px;background:#fff;border-radius:10px;padding:6px}
  .kt-qr:empty{display:none}
  .kt-qr svg{display:block;width:100%;height:auto}
  .kt-cont{margin-top:6px}
  @media(max-width:620px){.kt-topo{padding:20px 18px 18px}.kt-topo h1{font-size:25px}.kt-foto{width:58px;height:58px;right:16px;top:18px}.kt-logo{width:92px}
    .kt-sv,.kt-box{margin:14px 10px}.kt-lista,.kt-tot{margin-left:10px;margin-right:10px}.kt-grade,.kt-duas{grid-template-columns:1fr}.kt-svCorpo{padding:28px 14px 14px}.kt-pe{flex-direction:column;align-items:flex-start}
    .kt-lista a{grid-template-columns:48px 1fr auto}}
  @media print{.kt-tela{display:none!important}}`;
  document.head.appendChild(s);
}

/* a primeira tela já foi desenhada pelo app.js antes deste arquivo: quem chegou pelo link do kit é redesenhado */
if (/^#\/(k|kt)\//.test(location.hash) && typeof route === 'function') route();
