/* PONTE — o assistente foi portado do app da Mari, que tem uma agenda rica
   (agenda-mari.js: tipo compromisso/anotação, repetição, Google Agenda) e
   módulos que a Melissa ainda não tem. Este arquivo traduz o que o assistente
   espera para o que o app da Melissa REALMENTE tem, sem mexer na aba Tarefas
   dela (que continua usando titulo/prio/feito). Assim o assistente funciona
   sobre os dados verdadeiros e a tela antiga não quebra.

   Fase 2 (quando ela pedir): agenda com repetição, Google Agenda de verdade,
   fichas cadastrais, link de pagamento. Por enquanto, degradam com elegância. */
'use strict';

(function () {
  if (typeof Tarefas === 'undefined') return;
  const hoje0 = () => (typeof hojeLocalIso === 'function' ? hojeLocalIso() : new Date().toISOString().slice(0, 10));
  const dia = (d, n) => (typeof addDays === 'function' ? addDays(d, n) : d);

  /* O assistente escreve em "texto/feita/prioridade/tipo(compromisso|anotacao)".
     A Melissa guarda "titulo/feito/prio/tipo(tarefa|nota)". Guardo os dois, em
     sincronia, para a aba Tarefas dela e o assistente lerem a mesma coisa. */
  const paraMel = (c) => {
    c = c || {}; const o = {};
    if (c.texto != null) { o.titulo = c.texto; o.texto = c.texto; }
    if (c.nota != null) o.nota = c.nota;
    if (c.tipo != null) { o.tipo = (c.tipo === 'anotacao' ? 'nota' : 'tarefa'); o.tipoAg = c.tipo; }
    if (c.prioridade != null) { o.prio = c.prioridade; o.prioridade = c.prioridade; }
    if (c.data != null) o.data = c.data;
    if (c.hora != null) o.hora = c.hora;
    if (c.horaFim != null) o.horaFim = c.horaFim;
    /* a aba Tarefas da Melissa separa por AREA e só mostra 'profissional' ou
       'pessoal'. O assistente (modelo da Mari) manda 'pro' — sem traduzir, a
       tarefa some das duas listas. Mapeio pro valor que a tela dela entende. */
    if (c.area != null) o.area = (c.area === 'pessoal' ? 'pessoal' : 'profissional');
    if (c.repete != null) o.repete = c.repete;
    if (c.ate != null) o.ate = c.ate;
    if (c.feita != null) { o.feito = !!c.feita; o.feita = !!c.feita; }
    return o;
  };

  Object.assign(Tarefas, {
    /* devolve as tarefas reais, preenchendo os apelidos que o assistente lê */
    all() {
      const l = Tarefas.todas();
      for (const t of l) {
        if (t.texto == null) t.texto = t.titulo || '';
        if (t.feita == null) t.feita = !!t.feito;
        if (t.prioridade == null) t.prioridade = t.prio || 'media';
        if (t.tipoAg == null) t.tipoAg = (t.tipo === 'nota' ? 'anotacao' : 'tarefa');
      }
      return l;
    },
    add(c) { const o = paraMel(c); if (!o.tipo) { o.tipo = (c && c.hora) ? 'tarefa' : 'tarefa'; } return Tarefas.cria(o); },
    update(id, c) { return Tarefas.muda(id, paraMel(c)); },
    remove(id) { return Tarefas.apaga(id); },
    concluir(id, sim) {
      sim = sim !== false;
      return Tarefas.muda(id, { feito: sim, feita: sim, feitoEm: sim ? hoje0() : '' });
    },
    /* a "visão do dia" que o assistente usa em ver_hoje e no resumo do prompt */
    grupos(h) {
      h = h || hoje0();
      const amanha = dia(h, 1), semana = dia(h, 7);
      const G = { atrasadas: [], hoje: [], amanha: [], proximas: [], depois: [], semDia: [], anotacoes: [], feitas: [] };
      for (const t of Tarefas.all()) {
        const it = { x: t, dia: t.data || '', feita: !!t.feito };
        if (t.tipo === 'nota') { (t.feito ? G.feitas : G.anotacoes).push(it); continue; }
        if (!t.data) { (t.feito ? G.feitas : G.semDia).push(it); continue; }
        if (t.feito) { G.feitas.push(it); continue; }
        if (t.data < h) G.atrasadas.push(it);
        else if (t.data === h) G.hoje.push(it);
        else if (t.data === amanha) G.amanha.push(it);
        else if (t.data <= semana) G.proximas.push(it);
        else G.depois.push(it);
      }
      const ordem = (a, b) => ((a.dia || '') + (a.x.hora || '99')).localeCompare((b.dia || '') + (b.x.hora || '99'));
      for (const k of ['atrasadas', 'hoje', 'amanha', 'proximas', 'depois']) G[k].sort(ordem);
      G.feitas.sort((a, b) => String(b.x.feitoEm || '').localeCompare(String(a.x.feitoEm || ''))); G.feitas = G.feitas.slice(0, 20);
      return G;
    },
  });

  /* Google Agenda: a Melissa não ligou (fase 2). "Desligado", sem quebrar. */
  if (typeof window !== 'undefined' && typeof window.GCal === 'undefined') {
    window.GCal = { ligada: () => false, cfg: () => ({}), agendarEnvio: () => {}, sincronizar: async () => ({ salvos: 0, apagados: 0 }) };
  }

  /* Link de pagamento e cadastro de cliente: módulos de fase 2. Stubs seguros
     — se o assistente tentar, degrada em vez de derrubar a conversa. */
  if (typeof window !== 'undefined') {
    if (typeof window.linkPagamento === 'undefined') window.linkPagamento = () => '';
    if (typeof window.fichaNovoCliente === 'undefined') window.fichaNovoCliente = function (c) {
      DB.clientes = Array.isArray(DB.clientes) ? DB.clientes : [];
      const k = String((c && (c.email || c.whats || c.nome)) || ('c' + Date.now())).toLowerCase();
      DB.clientes.push({ id: (typeof uid === 'function' ? uid() : String(Date.now())), chave: k, nome: (c && c.nome) || '', whats: (c && c.whats) || '', email: (c && c.email) || '', insta: (c && c.insta) || '', origem: (c && c.origem) || 'manual', criado: new Date().toISOString() });
      if (typeof save === 'function') save();
      return k;
    };
  }
})();
