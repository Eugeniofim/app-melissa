/* O ASSISTENTE DA MELISSA — um chat só, em todas as abas do painel.

   Ele não é o robô do WhatsApp/Instagram (esse atende o público e só
   REGISTRA pedidos). Este aqui é dela: lê tudo do app e, com confirmação,
   mexe em tudo — passeio, preço, data bloqueada, cupom, tarefa.

   Regra de raiz (skill agente-assistente): **aba sem ferramenta = assistente
   pela metade**. Toda coleção que o app sincroniza precisa de quem leia e
   quem escreva. Por isso existe a ferramenta `mexer`, genérica.

   A chave de IA é DELA e fica só no navegador dela (`vi_ia`). Nunca vai
   para o backup, nunca para a nuvem, nunca para o chat. */

const IA_CHAVE = 'vi_ia';           /* configuração local: chave, modelo, gasto */
const IA_HIST = 'vi_ia_hist';       /* histórico do chat, só neste aparelho */
const IA_MODELO = 'claude-haiku-4-5';
const IA_PRECO = { entrada: 1 / 1e6, saida: 5 / 1e6 };   /* US$ por token, Haiku */

function iaCfg() {
  try { return JSON.parse(localStorage.getItem(IA_CHAVE) || '{}'); } catch (e) { return {}; }
}
function iaCfgSalva(p) {
  const c = { ...iaCfg(), ...p };
  try { localStorage.setItem(IA_CHAVE, JSON.stringify(c)); } catch (e) {}
  return c;
}
function iaLigada() { return !!(iaCfg().chave || '').trim(); }

/* ---------------- o que ele enxerga ---------------- */

const IA_ABAS = {
  today: 'Hoje', agenda: 'Agenda', tarefas: 'Tarefas', tours: 'Passeios',
  bookings: 'Reservas', money: 'Dinheiro', reports: 'Relatórios',
  clients: 'Clientes', coupons: 'Cupons', look: 'Visual', settings: 'Ajustes',
};

const nomeTour = (t) => (t && (t.name?.pt || t.name?.fr || t.name?.en || t.title || t.id)) || '';

/* uma fatia por aba — é o que evita "isso você vê na aba X" */
function iaFoto(oQue) {
  const hoje = isoToday();
  if (oQue === 'passeios') return Tours.all().map(t => ({
    id: t.id, nome: nomeTour(t), preco: t.price, duracao: t.duration,
    estado: t.status === 'draft' ? 'rascunho' : 'publicado', max: t.capacity }));
  if (oQue === 'agenda') {
    const ate = addDays(hoje, 30);
    return Tours.live().flatMap(t => Cal.departures(t.id, hoje, ate).map(d => ({
      passeio: nomeTour(t), data: d.date, hora: d.time,
      vagas: Cal.seatsLeft(d.tourId, d.date, d.time, d.capacity) })))
      .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora)).slice(0, 60);
  }
  if (oQue === 'reservas') return Bookings.all().slice(0, 40).map(b => ({
    codigo: b.code, nome: b.name, passeio: nomeTour(Tours.get(b.tourId)), data: b.date,
    pessoas: b.pax, total: b.total, falta: Bookings.due(b), estado: b.status }));
  if (oQue === 'clientes') return Clients.all().slice(0, 40).map(c => ({
    nome: c.name, email: c.email, whats: c.whats, instagram: c.insta,
    passeios: c.tours, gastou: c.spent, ultimo: c.last }));
  if (oQue === 'cupons') return Coupons.all().map(c => ({
    codigo: c.code, desconto: c.percent || c.amount, validade: c.until }));
  if (oQue === 'tarefas') return Tarefas.todas().filter(x => !x.feito).map(x => ({
    id: x.id, texto: x.titulo, nota: x.nota, area: x.area, prioridade: x.prio,
    data: x.data, hora: x.hora }));
  if (oQue === 'datas_bloqueadas') return (DB.blocks || []).map(b => ({ de: b.from, ate: b.until }));
  /* resumo: o que ela perguntaria de manhã */
  const atrasados = Bookings.all().filter(b => b.status === 'confirmed' && Bookings.due(b) > 0 && Bookings.dueDate(b) < hoje);
  return {
    hoje, passeios_publicados: Tours.live().length,
    reservas_confirmadas: Bookings.all().filter(b => b.status === 'confirmed').length,
    pagamentos_atrasados: atrasados.length,
    valor_atrasado: atrasados.reduce((s, b) => s + Bookings.due(b), 0),
    tarefas_abertas: Tarefas.todas().filter(x => !x.feito).length,
  };
}

/* ---------------- as ferramentas ---------------- */

const IA_FERRAMENTAS = [
  { name: 'listar_dados',
    description: 'Lê o que já existe no app. Use SEMPRE antes de responder qualquer pergunta sobre passeios, preços, agenda, reservas, clientes, cupons ou tarefas. Nunca responda de memória.',
    input_schema: { type: 'object', properties: { o_que: { type: 'string',
      enum: ['resumo', 'passeios', 'agenda', 'reservas', 'clientes', 'cupons', 'tarefas', 'datas_bloqueadas'] } },
      required: ['o_que'] } },

  { name: 'anotar_tarefa',
    description: 'Anota algo para fazer ou para pensar depois. Título curto em `texto`, a ideia inteira em `nota`. Sem data, fica em "Pra fazer"; com data, entra na agenda dela.',
    input_schema: { type: 'object', properties: {
      texto: { type: 'string' }, nota: { type: 'string' },
      area: { type: 'string', enum: ['profissional', 'pessoal'] },
      prioridade: { type: 'string', enum: ['alta', 'media', 'baixa'] },
      data: { type: 'string', description: 'AAAA-MM-DD, ou vazio para ficar sem dia' },
      hora: { type: 'string' } }, required: ['texto'] } },

  { name: 'mudar_preco',
    description: 'Muda o preço de um passeio. Diga o nome do passeio como ela falou; se houver dúvida entre dois, a ferramenta devolve as opções e você PERGUNTA qual — nunca escolha sozinho.',
    input_schema: { type: 'object', properties: {
      passeio: { type: 'string' }, preco: { type: 'number' } }, required: ['passeio', 'preco'] } },

  { name: 'bloquear_data',
    description: 'Bloqueia um dia (ou um período) na agenda dela: nada pode ser reservado. Use quando ela disser que não trabalha, que viaja ou que está ocupada.',
    input_schema: { type: 'object', properties: {
      de: { type: 'string', description: 'AAAA-MM-DD' },
      ate: { type: 'string', description: 'AAAA-MM-DD; igual a `de` para um dia só' } }, required: ['de'] } },

  { name: 'liberar_data',
    description: 'Tira um bloqueio da agenda, liberando o dia para reserva.',
    input_schema: { type: 'object', properties: { de: { type: 'string' } }, required: ['de'] } },

  { name: 'criar_cupom',
    description: 'Cria um cupom de desconto.',
    input_schema: { type: 'object', properties: {
      codigo: { type: 'string' }, desconto: { type: 'number', description: 'por cento' },
      validade: { type: 'string', description: 'AAAA-MM-DD' } }, required: ['codigo', 'desconto'] } },

  { name: 'mexer',
    description: 'Muda ou apaga qualquer outra coisa do app quando não houver ferramenta própria. `onde` é a aba, `quem` é o nome ou código do registro, `campos` são os valores novos.',
    input_schema: { type: 'object', properties: {
      onde: { type: 'string', enum: ['passeios', 'tarefas', 'cupons'] },
      acao: { type: 'string', enum: ['mudar', 'apagar'] },
      quem: { type: 'string' },
      campos: { type: 'object', description: 'passeios: nome, preco, duracao, max, estado | tarefas: texto, nota, area, prioridade, data, hora, feito | cupons: desconto, validade' },
    }, required: ['onde', 'acao', 'quem'] } },

  { name: 'criar_passeio',
    description: 'Cria um passeio NOVO. Ele nasce como rascunho — ela publica depois. Só crie com o que ela disse: o que faltar, deixe vazio e avise o que falta.',
    input_schema: { type: 'object', properties: {
      nome: { type: 'string' }, preco: { type: 'number' }, duracao: { type: 'string' },
      max: { type: 'number', description: 'máximo de pessoas' }, descricao: { type: 'string' } },
      required: ['nome'] } },

  { name: 'criar_saida',
    description: 'Põe uma data e hora na agenda de um passeio (uma saída avulsa). É o que faz o passeio ficar reservável naquele dia.',
    input_schema: { type: 'object', properties: {
      passeio: { type: 'string' }, data: { type: 'string', description: 'AAAA-MM-DD' },
      hora: { type: 'string', description: 'HH:MM' }, max: { type: 'number' } },
      required: ['passeio', 'data', 'hora'] } },

  { name: 'criar_regra',
    description: 'Cria uma repetição semanal de um passeio (ex.: toda terça e quinta às 14h, de tal data até tal data).',
    input_schema: { type: 'object', properties: {
      passeio: { type: 'string' },
      dias: { type: 'array', items: { type: 'string', enum: ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'] } },
      hora: { type: 'string' }, de: { type: 'string' }, ate: { type: 'string' }, max: { type: 'number' } },
      required: ['passeio', 'dias', 'hora'] } },

  { name: 'criar_reserva_manual',
    description: 'Registra uma reserva que veio por fora do site (WhatsApp, Instagram, indicação). Use quando ela disser que fechou com alguém.',
    input_schema: { type: 'object', properties: {
      passeio: { type: 'string' }, data: { type: 'string' }, hora: { type: 'string' },
      nome: { type: 'string' }, whats: { type: 'string' }, email: { type: 'string' },
      pessoas: { type: 'number' }, criancas: { type: 'number' },
      total: { type: 'number' }, recebido: { type: 'number', description: 'quanto já entrou' } },
      required: ['passeio', 'data', 'nome', 'pessoas'] } },

  { name: 'registrar_pagamento',
    description: 'Dá baixa no saldo de uma reserva (o dinheiro entrou). Informe o código da reserva.',
    input_schema: { type: 'object', properties: {
      codigo: { type: 'string' }, metodo: { type: 'string', enum: ['pix', 'transferencia', 'dinheiro', 'cartao'] } },
      required: ['codigo'] } },

  { name: 'cancelar_reserva',
    description: 'Cancela uma reserva pelo código. Confirme com ela antes — libera a vaga e some do faturamento.',
    input_schema: { type: 'object', properties: { codigo: { type: 'string' } }, required: ['codigo'] } },

  { name: 'mudar_ajuste',
    description: 'Muda um ajuste do app dela: contato, dados de pagamento, nome de exibição. Nunca invente valor — use só o que ela disser.',
    input_schema: { type: 'object', properties: {
      campo: { type: 'string', enum: ['whats', 'insta', 'admName', 'base', 'badge', 'pixKey', 'pixName', 'pixCity', 'iban', 'ibanName', 'payNote'] },
      valor: { type: 'string' } }, required: ['campo', 'valor'] } },

  { name: 'abrir_aba',
    description: 'Leva ela até uma tela do painel. Use quando a ação for algo que ela mesma precisa tocar — nunca responda "não consigo" sem antes levá-la ao lugar certo.',
    input_schema: { type: 'object', properties: { aba: { type: 'string', enum: Object.keys(IA_ABAS) } },
      required: ['aba'] } },

  { name: 'preparar_mensagem',
    description: 'Abre o WhatsApp com a mensagem já escrita para um cliente. NÃO envia — quem aperta enviar é ela. Escreva na língua do cliente e ponha [colchete] no que você não souber.',
    input_schema: { type: 'object', properties: {
      whats: { type: 'string', description: 'só números, com país' }, texto: { type: 'string' } },
      required: ['whats', 'texto'] } },
];

/* as que ALTERAM dado: mostram o cartão "vou fazer isso — confirma?" */
const IA_ESCREVEM = ['anotar_tarefa', 'mudar_preco', 'bloquear_data', 'liberar_data', 'criar_cupom', 'mexer',
  'criar_passeio', 'criar_saida', 'criar_regra', 'criar_reserva_manual', 'registrar_pagamento',
  'cancelar_reserva', 'mudar_ajuste'];

const IA_ROTULO = {
  listar_dados: 'olhando o app', anotar_tarefa: 'anotando tarefa', mudar_preco: 'mudando o preço',
  bloquear_data: 'bloqueando a data', liberar_data: 'liberando a data', criar_cupom: 'criando cupom',
  mexer: 'alterando', abrir_aba: 'abrindo a tela', preparar_mensagem: 'escrevendo a mensagem',
  criar_passeio: 'criando o passeio', criar_saida: 'pondo na agenda', criar_regra: 'criando a repetição',
  criar_reserva_manual: 'registrando a reserva', registrar_pagamento: 'dando baixa no pagamento',
  cancelar_reserva: 'cancelando a reserva', mudar_ajuste: 'mudando o ajuste',
};

/* acha um passeio pelo que ela falou; devolve as opções quando houver dúvida */
function iaAchaTour(txt) {
  const q = String(txt || '').toLowerCase().trim();
  if (!q) return { erro: 'diga qual passeio' };
  const todos = Tours.all();
  const exato = todos.filter(t => nomeTour(t).toLowerCase() === q);
  const perto = exato.length ? exato : todos.filter(t => nomeTour(t).toLowerCase().includes(q));
  if (!perto.length) return { erro: 'não achei passeio com esse nome', passeios: todos.map(nomeTour) };
  if (perto.length > 1) return { ambiguo: true, opcoes: perto.map(nomeTour) };
  return { tour: perto[0] };
}

function iaRodaFerramenta(nome, i) {
  i = i || {};
  if (nome === 'listar_dados') return iaFoto(i.o_que);

  if (nome === 'anotar_tarefa') {
    const t = Tarefas.cria({ titulo: String(i.texto || '').slice(0, 120), nota: String(i.nota || '').slice(0, 1200),
      area: i.area === 'pessoal' ? 'pessoal' : 'profissional',
      prio: ['alta', 'media', 'baixa'].includes(i.prioridade) ? i.prioridade : 'media',
      data: i.data === '' ? '' : (i.data || ''), hora: i.hora || '' });
    return { anotado: true, id: t.id, onde: t.data ? 'na agenda' : 'em Pra fazer' };
  }

  if (nome === 'mudar_preco') {
    const a = iaAchaTour(i.passeio); if (a.erro || a.ambiguo) return a;
    const antes = a.tour.price;
    Tours.update(a.tour.id, { price: +i.preco });
    return { ok: true, passeio: nomeTour(a.tour), de: antes, para: +i.preco };
  }

  if (nome === 'bloquear_data') {
    const de = i.de, ate = i.ate || i.de;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(de)) return { erro: 'data no formato AAAA-MM-DD' };
    Cal.addBlock({ from: de, until: ate });
    return { ok: true, bloqueado: de === ate ? de : `${de} a ${ate}` };
  }

  if (nome === 'liberar_data') {
    const b = (DB.blocks || []).find(x => i.de >= x.from && i.de <= x.until);
    if (!b) return { erro: 'não há bloqueio nessa data' };
    Cal.removeBlock(b.id);
    return { ok: true, liberado: `${b.from} a ${b.until}` };
  }

  if (nome === 'criar_cupom') {
    const cod = String(i.codigo || '').toUpperCase().replace(/\s+/g, '');
    if (!cod) return { erro: 'falta o código' };
    if (Coupons.all().some(c => c.code.toUpperCase() === cod)) return { erro: 'já existe cupom com esse código' };
    Coupons.create({ code: cod, percent: +i.desconto || 0, until: i.validade || '' });
    return { ok: true, cupom: cod, desconto: +i.desconto };
  }

  if (nome === 'criar_passeio') {
    const t = Tours.create({ name: { pt: String(i.nome || '').slice(0, 120) },
      desc: { pt: String(i.descricao || '') }, price: +i.preco || 0,
      duration: i.duracao || '', capacity: +i.max || 8, status: 'draft', photos: [] });
    return { criado: true, passeio: nomeTour(t), estado: 'rascunho',
      aviso: 'Nasceu como rascunho: o cliente ainda nao ve. Ela publica na aba Passeios.' };
  }

  if (nome === 'criar_saida') {
    const a = iaAchaTour(i.passeio); if (a.erro || a.ambiguo) return a;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(i.data || '')) return { erro: 'data no formato AAAA-MM-DD' };
    Cal.addDeparture({ tourId: a.tour.id, date: i.data, time: i.hora, capacity: +i.max || a.tour.capacity });
    return { ok: true, passeio: nomeTour(a.tour), data: i.data, hora: i.hora };
  }

  if (nome === 'criar_regra') {
    const a = iaAchaTour(i.passeio); if (a.erro || a.ambiguo) return a;
    const mapa = { dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6 };
    const dias = (i.dias || []).map(d => mapa[d]).filter(n => n != null);
    if (!dias.length) return { erro: 'diga os dias da semana' };
    Cal.addRule({ tourId: a.tour.id, weekdays: dias, time: i.hora,
      capacity: +i.max || a.tour.capacity, from: i.de || isoToday(), until: i.ate || '' });
    return { ok: true, passeio: nomeTour(a.tour), dias: i.dias, hora: i.hora };
  }

  if (nome === 'criar_reserva_manual') {
    const a = iaAchaTour(i.passeio); if (a.erro || a.ambiguo) return a;
    const b = Bookings.criarManual({ tourId: a.tour.id, date: i.data, time: i.hora || '',
      name: i.nome, whats: i.whats || '', email: i.email || '',
      pax: +i.pessoas || 1, criancas: +i.criancas || 0,
      total: i.total != null ? +i.total : undefined,
      recebido: +i.recebido || 0, metodo: 'manual' });
    return b ? { ok: true, codigo: b.code, total: b.total, falta: Bookings.due(b) }
             : { erro: 'nao consegui criar a reserva' };
  }

  if (nome === 'registrar_pagamento') {
    const b = Bookings.byCode(String(i.codigo || '').toUpperCase());
    if (!b) return { erro: 'nao achei reserva com esse codigo' };
    const falta = Bookings.due(b);
    if (falta <= 0) return { erro: 'essa reserva ja esta quitada' };
    Bookings.payBalance(b.id, i.metodo || 'manual');
    return { ok: true, codigo: b.code, baixou: falta, falta: Bookings.due(b) };
  }

  if (nome === 'cancelar_reserva') {
    const b = Bookings.byCode(String(i.codigo || '').toUpperCase());
    if (!b) return { erro: 'nao achei reserva com esse codigo' };
    Bookings.cancel(b.id);
    return { ok: true, cancelou: b.code, cliente: b.name };
  }

  if (nome === 'mudar_ajuste') {
    const permitidos = ['whats', 'insta', 'admName', 'base', 'badge', 'pixKey', 'pixName', 'pixCity', 'iban', 'ibanName', 'payNote'];
    if (!permitidos.includes(i.campo)) return { erro: 'nao mexo nesse ajuste' };
    const antes = DB.settings[i.campo];
    DB.settings[i.campo] = String(i.valor || '');
    if (i.campo === 'whats' || i.campo === 'insta') DB.settings.placeholderContact = false;
    save();
    return { ok: true, campo: i.campo, de: antes, para: DB.settings[i.campo] };
  }

  if (nome === 'mexer') return iaMexer(i);

  if (nome === 'abrir_aba') {
    if (!IA_ABAS[i.aba]) return { erro: 'aba desconhecida' };
    go('/adm/' + i.aba);
    return { abriu: IA_ABAS[i.aba] };
  }

  if (nome === 'preparar_mensagem') {
    const n = String(i.whats || '').replace(/\D/g, '');
    if (!n) return { erro: 'falta o número' };
    window.open(`https://wa.me/${n}?text=${encodeURIComponent(String(i.texto || ''))}`, '_blank');
    return { abriu: true, aviso: 'O WhatsApp abriu com a mensagem escrita. Quem envia é ela.' };
  }

  return { erro: 'ferramenta desconhecida' };
}

/* a genérica: muda ou apaga o resto, com lista de campos aceitos por aba */
function iaMexer(i) {
  const campos = i.campos || {};
  if (i.onde === 'passeios') {
    const a = iaAchaTour(i.quem); if (a.erro || a.ambiguo) return a;
    if (i.acao === 'apagar') {
      if (Tours.futureBookings(a.tour.id).length) return { erro: 'esse passeio tem reserva futura — não dá para apagar' };
      Tours.remove(a.tour.id); return { ok: true, apagou: nomeTour(a.tour) };
    }
    const p = {};
    if (campos.preco != null) p.price = +campos.preco;
    if (campos.duracao != null) p.duration = campos.duracao;
    if (campos.max != null) p.capacity = +campos.max;
    if (campos.estado) p.status = campos.estado === 'rascunho' ? 'draft' : 'live';
    if (campos.nome) p.name = { ...(a.tour.name || {}), pt: campos.nome };
    if (!Object.keys(p).length) return { erro: 'nenhum campo conhecido' };
    Tours.update(a.tour.id, p);
    return { ok: true, passeio: nomeTour(a.tour), mudou: Object.keys(campos) };
  }

  if (i.onde === 'tarefas') {
    const q = String(i.quem || '').toLowerCase();
    const achadas = Tarefas.todas().filter(x => (x.titulo || '').toLowerCase().includes(q));
    if (!achadas.length) return { erro: 'não achei essa tarefa' };
    if (achadas.length > 1) return { ambiguo: true, opcoes: achadas.map(x => x.titulo) };
    const x = achadas[0];
    if (i.acao === 'apagar') { Tarefas.apaga(x.id); return { ok: true, apagou: x.titulo }; }
    const p = {};
    if (campos.texto) p.titulo = campos.texto;
    if (campos.nota != null) p.nota = campos.nota;
    if (campos.area) p.area = campos.area;
    if (campos.prioridade) p.prio = campos.prioridade;
    /* tirar o dia: aceita vazio e zera a hora junto, senão a tarefa fica
       "sem data" mas com hora marcada, e a lista ordena errado */
    if (campos.data != null) { p.data = String(campos.data) === 'sem' ? '' : campos.data; if (!p.data) p.hora = ''; }
    if (campos.hora != null) p.hora = campos.hora;
    if (campos.feito != null) { p.feito = !!campos.feito; p.feitoEm = campos.feito ? isoToday() : ''; }
    if (!Object.keys(p).length) return { erro: 'nenhum campo conhecido' };
    Tarefas.muda(x.id, p);
    return { ok: true, tarefa: x.titulo, mudou: Object.keys(campos) };
  }

  if (i.onde === 'cupons') {
    const c = Coupons.all().find(x => x.code.toUpperCase() === String(i.quem || '').toUpperCase());
    if (!c) return { erro: 'não achei esse cupom' };
    if (i.acao === 'apagar') { Coupons.remove(c.code); return { ok: true, apagou: c.code }; }
    if (campos.desconto != null) c.percent = +campos.desconto;
    if (campos.validade != null) c.until = campos.validade;
    save();
    return { ok: true, cupom: c.code };
  }
  return { erro: 'não sei mexer nisso' };
}

/* ---------------- as instruções ---------------- */

function iaSistema() {
  const s = DB.settings || {};
  return `Você é o assistente do painel de "${s.brand || 'Voyages & Images'}", o app de Melissa Hallais — guia e fotógrafa na Alsácia e Floresta Negra. Você fala com a MELISSA (a dona), não com clientes dela.

COMO FALAR: português do Brasil, direto e caloroso, frases curtas. Sem markdown, sem asterisco, sem lista longa. Responda em 2 a 4 frases. Ela está trabalhando — vá ao ponto.

FATOS: nunca responda de memória. Chame listar_dados antes de falar de passeio, preço, agenda, reserva, cliente, cupom ou tarefa. Se o dado não estiver lá, diga que não está — não invente data, preço, história nem tradição. O que faltar vira [colchete] e uma linha dizendo o que falta.

VOCÊ ALCANÇA TODAS AS ABAS:
- Hoje e Relatórios → listar_dados (resumo)
- Agenda → listar_dados (agenda, datas_bloqueadas) · bloquear_data · liberar_data
- Tarefas → listar_dados (tarefas) · anotar_tarefa · mexer (onde: tarefas)
- Passeios → listar_dados (passeios) · criar_passeio · mudar_preco · mexer (onde: passeios)
- Saídas de um passeio → criar_saida (uma data) · criar_regra (repetição semanal)
- Reservas → listar_dados (reservas) · criar_reserva_manual · cancelar_reserva
- Dinheiro → listar_dados (reservas, resumo) · registrar_pagamento
- Clientes → listar_dados (clientes) · preparar_mensagem
- Cupons → listar_dados (cupons) · criar_cupom · mexer (onde: cupons)
- Ajustes → mudar_ajuste (contato, Pix, IBAN, nome)
- Visual → abrir_aba, e diga o que tocar
Nunca diga "não consigo" sem antes levar ela até a tela com abrir_aba.

ONDE GUARDAR: coisa pra fazer ou pra pensar depois → anotar_tarefa (título curto em texto, a ideia inteira em nota). Com dia, entra na agenda; sem dia, fica em "Pra fazer".

NA DÚVIDA, PERGUNTE. Se a ferramenta devolver "ambiguo", mostre as opções e pergunte qual — nunca escolha sozinho. Em coisa que altera dado, chutar é pior que não achar.

O QUE É PARA FORA, ELA TOCA: preparar_mensagem abre o WhatsApp com o texto pronto; quem aperta enviar é ela. Você nunca fala com cliente dela.

A MARCA (regras dela, não negociáveis): nunca escreva "conto de fadas", "Bela e a Fera" como venda, "luxo" solto, "o melhor", "imperdível" nem "experiência única". Posicionamento é "Alsácia e Floresta Negra" — só "Alsácia" quando o assunto for especificamente alsaciano. Se um texto poderia ter sido escrito por qualquer outro guia, não está pronto.

Hoje é ${isoToday()}.`;
}

/* ---------------- a conversa ---------------- */

function iaHist() { try { return JSON.parse(localStorage.getItem(IA_HIST) || '[]'); } catch (e) { return []; } }
function iaHistSalva(v) { try { localStorage.setItem(IA_HIST, JSON.stringify(v.slice(-40))); } catch (e) {} }

function iaGasta(u) {
  if (!u) return;
  const c = iaCfg();
  const custo = (u.input_tokens || 0) * IA_PRECO.entrada + (u.output_tokens || 0) * IA_PRECO.saida;
  iaCfgSalva({ gasto: (+c.gasto || 0) + custo });
  iaPintaCreditos();
}

async function iaClaude(mensagens) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': (iaCfg().chave || '').trim(),
      'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
    body: JSON.stringify({ model: IA_MODELO, max_tokens: 1200,
      system: [{ type: 'text', text: iaSistema(), cache_control: { type: 'ephemeral' } }],
      tools: IA_FERRAMENTAS, messages: mensagens }),
  });
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new Error((j && j.error && j.error.message) || ('erro ' + r.status));
  iaGasta(j.usage);
  return j;
}

/* o cartão "vou fazer isso — confirma?" */
function iaPedeConfirmacao(nome, entrada) {
  if (iaCfg().semConfirmar) return Promise.resolve(true);
  return new Promise((resolve) => {
    const cx = document.getElementById('iaMsgs');
    const el = document.createElement('div');
    el.className = 'ia-conf';
    const linhas = Object.entries(entrada || {})
      .filter(([, v]) => v !== '' && v != null)
      .map(([k, v]) => `<div><b>${k}</b>: ${esc(typeof v === 'object' ? JSON.stringify(v) : v)}</div>`).join('');
    el.innerHTML = `<div class="ia-conf-t">Vou ${IA_ROTULO[nome] || nome} — confirma?</div>
      <div class="ia-conf-c">${linhas || '<i>sem detalhes</i>'}</div>
      <div class="ia-conf-b"><button class="btn mini" data-sim>Confirmar</button>
        <button class="btn mini ghost" data-nao>Cancelar</button></div>`;
    cx.appendChild(el); cx.scrollTop = cx.scrollHeight;
    el.querySelector('[data-sim]').onclick = () => { el.classList.add('feito'); el.querySelector('.ia-conf-b').innerHTML = '<span class="ia-ok">✓ confirmado</span>'; resolve(true); };
    el.querySelector('[data-nao]').onclick = () => { el.classList.add('feito'); el.querySelector('.ia-conf-b').innerHTML = '<span class="ia-no">cancelado</span>'; resolve(false); };
  });
}

async function iaConversa(texto) {
  const hist = iaHist();
  hist.push({ role: 'user', content: texto });
  iaPinta(hist);
  const conversa = hist.map(m => ({ role: m.role, content: m.content }));
  let final = '';
  try {
    for (let volta = 0; volta < 6; volta++) {
      iaPensando(true);
      const resp = await iaClaude(conversa);
      iaPensando(false);
      conversa.push({ role: 'assistant', content: resp.content });
      final = resp.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim() || final;
      if (resp.stop_reason !== 'tool_use') break;
      const usos = resp.content.filter(b => b.type === 'tool_use');
      const resultados = [];
      for (const b of usos) {
        let saida;
        if (IA_ESCREVEM.includes(b.name)) {
          const ok = await iaPedeConfirmacao(b.name, b.input);
          saida = ok ? iaRodaFerramenta(b.name, b.input)
                     : { cancelado: true, aviso: 'Ela cancelou. Não repita a ação; pergunte o que ela prefere.' };
        } else saida = iaRodaFerramenta(b.name, b.input);
        resultados.push({ type: 'tool_result', tool_use_id: b.id, content: JSON.stringify(saida) });
      }
      conversa.push({ role: 'user', content: resultados });
    }
  } catch (e) {
    iaPensando(false);
    final = 'Não consegui falar com a IA: ' + String(e.message || e);
  }
  hist.push({ role: 'assistant', content: final || '(sem resposta)' });
  iaHistSalva(hist); iaPinta(hist);
  /* a tela reflete o que mudou: `route()` redesenha a aba atual */
  if (typeof route === 'function') route();
}

/* ---------------- a gaveta ---------------- */

function iaPinta(hist) {
  const cx = document.getElementById('iaMsgs'); if (!cx) return;
  cx.innerHTML = (hist || iaHist()).map(m =>
    `<div class="ia-m ${m.role}">${esc(String(m.content)).replace(/\n/g, '<br>')}</div>`).join('')
    || '<div class="ia-vazio">Pergunte qualquer coisa do app, ou peça para anotar, mudar preço, bloquear data.</div>';
  cx.scrollTop = cx.scrollHeight;
}
function iaPensando(on) {
  const e = document.getElementById('iaPensa'); if (e) e.style.display = on ? '' : 'none';
}
function iaPintaCreditos() {
  const e = document.getElementById('iaCred'); if (!e) return;
  const c = iaCfg(), gasto = +c.gasto || 0, posto = +c.posto || 0;
  const resta = Math.max(0, posto - gasto);
  /* "sobra US$ 3,20" não diz nada a ela. "dá para ~130 respostas" diz. */
  const respostas = Math.floor(resta / 0.025);
  e.innerHTML = posto
    ? `${resta < 0.5 ? '⚠ ' : ''}dá para cerca de <b>${respostas}</b> respostas`
    : '<a href="#" id="iaPorCred">quanto você carregou?</a>';
}

function iaAbre() {
  if (document.getElementById('iaDrawer')) { document.getElementById('iaDrawer').classList.add('on'); return; }
  const d = document.createElement('div');
  d.id = 'iaDrawer'; d.className = 'ia-drawer on';
  d.innerHTML = `
    <header><b>Assistente</b><span id="iaCred" class="ia-cred"></span>
      <button class="ia-x" id="iaFecha">✕</button></header>
    <div class="ia-msgs" id="iaMsgs"></div>
    <div class="ia-pensa" id="iaPensa" style="display:none">pensando…</div>
    <footer>
      <textarea id="iaTxt" rows="2" placeholder="Escreva do jeito que você fala…"></textarea>
      <button class="btn" id="iaEnvia">Enviar</button>
    </footer>`;
  document.body.appendChild(d);
  document.getElementById('iaFecha').onclick = () => d.classList.remove('on');
  const envia = () => {
    const t = document.getElementById('iaTxt');
    const v = (t.value || '').trim(); if (!v) return;
    if (!iaLigada()) { alert('Falta a chave da IA. Vá em Ajustes → Assistente.'); return; }
    t.value = ''; iaConversa(v);
  };
  document.getElementById('iaEnvia').onclick = envia;
  document.getElementById('iaTxt').onkeydown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); envia(); }
  };
  iaPinta(); iaPintaCreditos();
}

/* O cartão da chave, dentro de Ajustes. Injetado daqui para não espalhar
   o assistente pelo app: apagando este arquivo, o app volta a ser o que era. */
function iaCartaoAjustes() {
  const alvo = document.querySelector('.stage'); if (!alvo) return;
  if (document.getElementById('iaAjustes')) return;
  const c = iaCfg();
  const sec = document.createElement('section');
  sec.className = 'card'; sec.id = 'iaAjustes';
  sec.innerHTML = `
    <h3>Assistente</h3>
    <p class="why">A chave é sua e fica só neste aparelho — nunca vai para o backup nem para a nuvem.
      Você cria em <b>console.anthropic.com</b> → API Keys.</p>
    <div class="frow">
      <label class="fld">Chave
        <input id="iaKey" type="password" placeholder="${c.chave ? '•••••• já configurada' : 'cole aqui'}">
      </label>
      <label class="fld">Quanto você carregou (US$)
        <input id="iaPosto" type="number" step="1" value="${+c.posto || ''}" placeholder="5">
      </label>
      <button class="cta sm" id="iaSalva">Salvar</button>
    </div>
    <p class="why" id="iaGasto"></p>
    <label style="display:flex;gap:8px;align-items:center;margin-top:6px">
      <input type="checkbox" id="iaSemConf" ${c.semConfirmar ? 'checked' : ''}>
      Não me perguntar antes de cada mudança
    </label>`;
  alvo.appendChild(sec);

  const gasto = +iaCfg().gasto || 0;
  document.getElementById('iaGasto').textContent =
    gasto ? `Já usou US$ ${gasto.toFixed(2)} — cerca de ${Math.round(gasto / 0.025)} respostas.` : '';

  document.getElementById('iaSalva').onclick = () => {
    const k = document.getElementById('iaKey').value.trim();
    const p = +document.getElementById('iaPosto').value || 0;
    iaCfgSalva({ ...(k ? { chave: k } : {}), posto: p });
    if (typeof toast === 'function') toast('✓');
    iaPintaCreditos();
  };
  document.getElementById('iaSemConf').onchange = (e) =>
    iaCfgSalva({ semConfirmar: e.target.checked });
}

/* o botão que existe em TODAS as abas — um chat só, nunca um por aba */
function iaBotao() {
  if (document.getElementById('iaFab')) return;
  const b = document.createElement('button');
  b.id = 'iaFab'; b.className = 'ia-fab'; b.title = 'Assistente';
  b.innerHTML = '✦';
  b.onclick = iaAbre;
  document.body.appendChild(b);
}

/* chamado pelo app a cada troca de aba */
function iaNaAba(tab) {
  iaBotao();
  if (tab === 'settings') setTimeout(iaCartaoAjustes, 0);
}

/* ---------------- o visual ----------------
   Usa os tokens DELA (--surface, --ink, --line, --brand-amarelo…), não cor
   inventada: assim o assistente acompanha o tema claro e o escuro sozinho,
   e continua parecendo o app dela quando ela mudar a aparência. */
(function iaEstilo() {
  const css = `
  .ia-fab{position:fixed;right:20px;bottom:20px;z-index:70;width:54px;height:54px;border-radius:var(--r-pill,999px);
    border:0;cursor:pointer;font-size:22px;color:var(--highlight-ink,#1A1405);background:var(--brand-amarelo,#FFD23F);
    box-shadow:var(--sh-2);transition:transform var(--d-fast,180ms) var(--ease)}
  .ia-fab:hover{transform:translateY(-2px)}
  .ia-drawer{position:fixed;top:0;right:0;bottom:0;width:min(420px,100%);z-index:80;display:none;
    flex-direction:column;background:var(--surface,#151E1A);color:var(--ink,#F2F5F2);
    border-left:1px solid var(--line,#25332D);box-shadow:var(--sh-3);font-family:var(--f-ui)}
  .ia-drawer.on{display:flex}
  .ia-drawer header{display:flex;align-items:center;gap:var(--s-4,10px);padding:var(--s-5,12px) var(--s-6,14px);
    border-bottom:1px solid var(--line,#25332D);font-family:var(--f-display);font-weight:var(--t-strong,600)}
  .ia-cred{margin-left:auto;font-size:var(--fs-2,11.5px);color:var(--ink-3,#8A9690)}
  .ia-cred a{color:var(--accent,#4FB89B)}
  .ia-x{border:0;background:none;font-size:18px;cursor:pointer;color:var(--ink-2,#B4C0BA)}
  .ia-msgs{flex:1;overflow:auto;padding:var(--s-6,14px);display:flex;flex-direction:column;gap:var(--s-4,10px)}
  .ia-m{padding:var(--s-3,8px) var(--s-5,12px);border-radius:var(--r,12px);max-width:88%;
    line-height:var(--lh-4,1.55);font-size:var(--fs-4,15px);white-space:pre-wrap}
  .ia-m.user{align-self:flex-end;background:var(--brand-amarelo,#FFD23F);color:var(--highlight-ink,#1A1405)}
  .ia-m.assistant{align-self:flex-start;background:var(--surface-2,#1C2823);border:1px solid var(--line,#25332D)}
  .ia-vazio{color:var(--ink-3,#8A9690);font-size:var(--fs-3,13px);text-align:center;margin:auto;padding:0 var(--s-8,20px)}
  .ia-pensa{padding:0 var(--s-6,14px) var(--s-3,8px);font-size:var(--fs-2,11.5px);color:var(--ink-3,#8A9690)}
  .ia-drawer footer{display:flex;gap:var(--s-3,8px);padding:var(--s-5,12px);border-top:1px solid var(--line,#25332D)}
  .ia-drawer textarea{flex:1;resize:none;border-radius:var(--r-sm,8px);padding:var(--s-3,8px) var(--s-4,10px);
    font:inherit;font-size:var(--fs-4,15px);border:1px solid var(--line-2,#33453D);
    background:var(--surface-2,#1C2823);color:var(--ink,#F2F5F2)}
  .ia-drawer textarea:focus{outline:2px solid var(--accent-line,#1E4A3E);outline-offset:1px}
  .ia-conf{border:1px solid var(--highlight,#FFD23F);background:var(--highlight-wash,#332912);
    border-radius:var(--r,12px);padding:var(--s-4,10px) var(--s-5,12px);font-size:var(--fs-3,13px)}
  .ia-conf.feito{opacity:.6}
  .ia-conf-t{font-weight:var(--t-strong,600);margin-bottom:var(--s-2,6px)}
  .ia-conf-c{display:grid;gap:2px;margin-bottom:var(--s-3,8px);color:var(--ink-2,#B4C0BA)}
  .ia-conf-b{display:flex;gap:var(--s-3,8px)}
  .ia-conf-b button{border-radius:var(--r-pill,999px);border:1px solid var(--line-2,#33453D);
    padding:4px 14px;cursor:pointer;font:inherit;font-size:var(--fs-3,13px);
    background:var(--brand-amarelo,#FFD23F);color:var(--highlight-ink,#1A1405)}
  .ia-conf-b button[data-nao]{background:transparent;color:var(--ink-2,#B4C0BA)}
  .ia-ok{color:var(--ok,#4FB89B);font-weight:var(--t-strong,600)}
  .ia-no{color:var(--ink-3,#8A9690)}
  @media(max-width:700px){.ia-drawer{width:100%}.ia-fab{bottom:76px}}`;
  const e = document.createElement('style'); e.textContent = css; document.head.appendChild(e);
})();
