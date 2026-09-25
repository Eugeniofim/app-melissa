/* =====================================================
   TAREFAS — a agenda pessoal e profissional da Melissa

   Pedido dela na reunião de 25/09/2026: um lugar no próprio app para
   anotar o que precisa fazer, separando o que é da vida e o que é do
   trabalho, e vendo por dia, semana e mês, com prioridade.

   Por que dentro do app e não num caderno de recados qualquer: o app já
   é o lugar onde ela olha a agenda de passeios todo dia. Tarefa em outro
   aplicativo é tarefa esquecida.

   Este arquivo só ACRESCENTA. Apagando a linha dele no index.html e a
   linha da aba no app.js, o app volta a ser exatamente o que era.
   ===================================================== */
'use strict';

const TAR_TXT = {
  admTarefas:  { pt: 'Tarefas', fr: 'Tâches', en: 'Tasks' },
  tarSub:      { pt: 'O que precisa ser feito — o seu e o do trabalho, separados.',
                 fr: 'Ce qu\'il faut faire — le personnel et le professionnel, séparés.',
                 en: 'What needs doing — personal and work, kept apart.' },
  tarPessoal:  { pt: 'Pessoal', fr: 'Personnel', en: 'Personal' },
  tarProf:     { pt: 'Profissional', fr: 'Professionnel', en: 'Work' },
  tarHoje:     { pt: 'Hoje', fr: 'Aujourd\'hui', en: 'Today' },
  tarSemana:   { pt: 'Semana', fr: 'Semaine', en: 'Week' },
  tarMes:      { pt: 'Mês', fr: 'Mois', en: 'Month' },
  tarTudo:     { pt: 'Todas', fr: 'Toutes', en: 'All' },
  tarNova:     { pt: 'O que precisa ser feito?', fr: 'Que faut-il faire ?', en: 'What needs doing?' },
  tarAdd:      { pt: 'Anotar', fr: 'Noter', en: 'Add' },
  tarAlta:     { pt: 'Alta', fr: 'Haute', en: 'High' },
  tarMedia:    { pt: 'Média', fr: 'Moyenne', en: 'Medium' },
  tarBaixa:    { pt: 'Baixa', fr: 'Basse', en: 'Low' },
  tarPrio:     { pt: 'Prioridade', fr: 'Priorité', en: 'Priority' },
  tarData:     { pt: 'Para quando', fr: 'Pour quand', en: 'Due' },
  tarHora:     { pt: 'Hora', fr: 'Heure', en: 'Time' },
  tarNota:     { pt: 'Detalhes', fr: 'Détails', en: 'Notes' },
  tarRepete:   { pt: 'Repete', fr: 'Répète', en: 'Repeats' },
  tarSemRep:   { pt: 'não repete', fr: 'ne se répète pas', en: 'does not repeat' },
  tarDiaria:   { pt: 'todo dia', fr: 'tous les jours', en: 'every day' },
  tarSemanal:  { pt: 'toda semana', fr: 'chaque semaine', en: 'every week' },
  tarMensal:   { pt: 'todo mês', fr: 'chaque mois', en: 'every month' },
  tarSalvar:   { pt: 'Salvar', fr: 'Enregistrer', en: 'Save' },
  tarApagar:   { pt: 'Apagar', fr: 'Supprimer', en: 'Delete' },
  tarApagarOk: { pt: 'Apagar esta tarefa?', fr: 'Supprimer cette tâche ?', en: 'Delete this task?' },
  tarAtrasada: { pt: 'atrasada', fr: 'en retard', en: 'overdue' },
  tarAbertas:  { pt: 'abertas', fr: 'ouvertes', en: 'open' },
  tarFeitas:   { pt: 'Mostrar concluídas', fr: 'Voir les terminées', en: 'Show completed' },
  tarVazio:    { pt: 'Nada por aqui. Aproveite — ou anote a primeira ali em cima.',
                 fr: 'Rien ici. Profitez-en — ou notez la première ci-dessus.',
                 en: 'Nothing here. Enjoy it — or add the first one above.' },
  tarAmanha:   { pt: 'Empurrar para amanhã', fr: 'Repousser à demain', en: 'Push to tomorrow' },
  tarFeitoEm:  { pt: 'concluída em', fr: 'terminée le', en: 'completed on' },
  tarSemData:  { pt: 'sem data', fr: 'sans date', en: 'no date' },
  tarDe:       { pt: 'de', fr: 'du', en: 'from' },
  tarAte:      { pt: 'a', fr: 'au', en: 'to' },
  tarTudoTxt:  { pt: 'tudo o que está anotado', fr: 'tout ce qui est noté', en: 'everything noted' },
  tarMaisAtr:  { pt: 'atrasadas aparecem sempre', fr: 'les retards sont toujours affichés', en: 'overdue always shown' },
  tarRepetiu:  { pt: 'Feito. A próxima já está anotada.', fr: 'Fait. La suivante est notée.', en: 'Done. The next one is already noted.' },
};
const tt = (k) => { const e = TAR_TXT[k]; return e ? (e[LANG] || e.pt) : k; };

/* ---------- dados ----------
   Fica dentro do DB, então sobe para a nuvem junto com o resto e aparece
   igual no celular e no laptop (a regra de ouro dos apps dele). */
const Tarefas = {
  todas() { return (DB.tarefas = DB.tarefas || []); },
  get(id) { return this.todas().find(x => x.id === id); },
  cria(t) {
    const nova = { id: uid(), titulo: '', nota: '', area: 'profissional', prio: 'media',
                   data: isoToday(), hora: '', repete: '', feito: false, feitoEm: '',
                   criado: new Date().toISOString(), ...t };
    this.todas().push(nova); save(); return nova;
  },
  muda(id, patch) { const x = this.get(id); if (x) { Object.assign(x, patch); save(); } },
  apaga(id) { DB.tarefas = this.todas().filter(x => x.id !== id); save(); },

  /* concluir uma tarefa que repete não a apaga: anota a próxima.
     É o que faz "conferir a agenda toda segunda" virar hábito e não
     uma tarefa que some e é esquecida. */
  conclui(id) {
    const x = this.get(id); if (!x) return false;
    x.feito = true; x.feitoEm = isoToday();
    let repetiu = false;
    if (x.repete && x.data) {
      const passo = { dia: 1, semana: 7 }[x.repete];
      const prox = passo ? addDays(x.data, passo) : mesSeguinte(x.data);
      this.todas().push({ ...x, id: uid(), feito: false, feitoEm: '', data: prox,
                          criado: new Date().toISOString() });
      repetiu = true;
    }
    save(); return repetiu;
  },
};

/* mês seguinte sem estourar (31 de janeiro + 1 mês = 28/29 de fevereiro) */
function mesSeguinte(iso) {
  const [a, m, d] = iso.split('-').map(Number);
  const alvo = new Date(a, m, 1);                 /* m já é o mês seguinte, base 0 */
  const ultimo = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate();
  alvo.setDate(Math.min(d, ultimo));
  return `${alvo.getFullYear()}-${String(alvo.getMonth() + 1).padStart(2, '0')}-${String(alvo.getDate()).padStart(2, '0')}`;
}

/* a semana começa na segunda — é como ela pensa a agenda */
function inicioDaSemana(iso) {
  const d = new Date(iso + 'T12:00:00');
  const dow = (d.getDay() + 6) % 7;
  return addDays(iso, -dow);
}
function fimDoMes(iso) {
  const [a, m] = iso.split('-').map(Number);
  const u = new Date(a, m, 0).getDate();
  return `${a}-${String(m).padStart(2, '0')}-${String(u).padStart(2, '0')}`;
}

const PRIOS = ['alta', 'media', 'baixa'];
const PRIO_TXT = { alta: 'tarAlta', media: 'tarMedia', baixa: 'tarBaixa' };
const PRIO_PESO = { alta: 0, media: 1, baixa: 2 };

/* ---------- a tela ---------- */
let tarArea = 'profissional', tarPeriodo = 'semana', tarVerFeitas = false, tarAbrindo = null;

function admTarefas() {
  const hoje = isoToday();
  const limites = {
    hoje:   [hoje, hoje],
    semana: [inicioDaSemana(hoje), addDays(inicioDaSemana(hoje), 6)],
    mes:    [hoje.slice(0, 8) + '01', fimDoMes(hoje)],
    tudo:   ['', ''],
  }[tarPeriodo];

  const daArea = Tarefas.todas().filter(x => x.area === tarArea);
  /* atrasada aparece SEMPRE, em qualquer período: é o que não pode sumir */
  const noPeriodo = (x) => {
    if (x.feito) return tarPeriodo === 'tudo' ? true : (x.feitoEm >= limites[0] && x.feitoEm <= limites[1]);
    if (!limites[0]) return true;
    if (x.data && x.data < hoje) return true;
    return x.data >= limites[0] && x.data <= limites[1];
  };
  const lista = daArea.filter(noPeriodo).filter(x => tarVerFeitas || !x.feito).sort(ordena);

  const abertas  = daArea.filter(x => !x.feito).length;
  const atrasadas = daArea.filter(x => !x.feito && x.data && x.data < hoje).length;
  const outraArea = tarArea === 'pessoal' ? 'profissional' : 'pessoal';
  const outras = Tarefas.todas().filter(x => x.area === outraArea && !x.feito).length;

  const chip = (v, k, atual, campo) =>
    `<button class="tarchip ${atual === v ? 'on' : ''}" data-${campo}="${v}">${tt(k)}</button>`;

  admShell('tarefas', `
    <div class="pagehead">
      <h1 class="pageh">${tt('admTarefas')}</h1>
      <p class="pagesub">${tt('tarSub')}</p>
    </div>

    <div class="tarbarra">
      <div class="tarareas">
        ${chip('profissional', 'tarProf', tarArea, 'area')}
        ${chip('pessoal', 'tarPessoal', tarArea, 'area')}
      </div>
      <div class="tarcontas">
        <span><b>${abertas}</b> ${tt('tarAbertas')}</span>
        ${atrasadas ? `<span class="tarvermelho"><b>${atrasadas}</b> ${tt('tarAtrasada')}</span>` : ''}
        ${outras ? `<span class="tarfraco">${outras} em ${tt(outraArea === 'pessoal' ? 'tarPessoal' : 'tarProf')}</span>` : ''}
      </div>
    </div>

    <section class="card tarnova">
      <div class="frow">
        <label class="fld tarcresce">${tt('tarNova')}<input id="tarT" placeholder="${esc(tt('tarNova'))}" autocomplete="off"></label>
        <label class="fld">${tt('tarData')}<input id="tarD" type="date" value="${hoje}"></label>
        <label class="fld">${tt('tarPrio')}<select id="tarP">
          ${PRIOS.map(p => `<option value="${p}" ${p === 'media' ? 'selected' : ''}>${tt(PRIO_TXT[p])}</option>`).join('')}
        </select></label>
        <button class="cta sm" id="tarAdd">${tt('tarAdd')}</button>
      </div>
    </section>

    <div class="tarperiodos">
      ${chip('hoje', 'tarHoje', tarPeriodo, 'per')}
      ${chip('semana', 'tarSemana', tarPeriodo, 'per')}
      ${chip('mes', 'tarMes', tarPeriodo, 'per')}
      ${chip('tudo', 'tarTudo', tarPeriodo, 'per')}
      <label class="tarver"><input type="checkbox" id="tarVF" ${tarVerFeitas ? 'checked' : ''}> ${tt('tarFeitas')}</label>
    </div>
    <p class="tarfaixa">${faixaDoPeriodo(limites)}</p>

    ${lista.length ? `<div class="tarlista">${lista.map(x => cartaoTarefa(x, hoje)).join('')}</div>`
                   : `<div class="emptybox"><p>${tt('tarVazio')}</p></div>`}
  `);
  ligaTarefas();
}

/* Escrever o período na tela evita a pergunta "cadê a tarefa do dia 7?":
   no fim do mês, "Mês" mostra poucos dias, e sem isso parece defeito. */
function faixaDoPeriodo(limites) {
  if (!limites[0]) return tt('tarTudoTxt');
  const a = fmtDate(limites[0]), b = fmtDate(limites[1]);
  const faixa = a === b ? a : `${tt('tarDe')} ${a} ${tt('tarAte')} ${b}`;
  return `${faixa} · ${tt('tarMaisAtr')}`;
}

/* não feitas antes; atrasadas no topo; depois prioridade; depois data e hora */
function ordena(a, b) {
  if (a.feito !== b.feito) return a.feito ? 1 : -1;
  const hoje = isoToday();
  const atr = (x) => (!x.feito && x.data && x.data < hoje) ? 0 : 1;
  if (atr(a) !== atr(b)) return atr(a) - atr(b);
  if (PRIO_PESO[a.prio] !== PRIO_PESO[b.prio]) return PRIO_PESO[a.prio] - PRIO_PESO[b.prio];
  return ((a.data || '9999') + (a.hora || '99:99')).localeCompare((b.data || '9999') + (b.hora || '99:99'));
}

function quando(x, hoje) {
  if (!x.data) return tt('tarSemData');
  const dia = x.data === hoje ? tt('tarHoje')
            : x.data === addDays(hoje, 1) ? (LANG === 'fr' ? 'Demain' : LANG === 'en' ? 'Tomorrow' : 'Amanhã')
            : fmtDate(x.data);
  return dia + (x.hora ? ' · ' + x.hora : '');
}

function cartaoTarefa(x, hoje) {
  const atrasada = !x.feito && x.data && x.data < hoje;
  const aberto = tarAbrindo === x.id;
  return `<article class="tarcard ${x.feito ? 'feita' : ''} ${atrasada ? 'atrasada' : ''}">
    <button class="tarbox ${x.feito ? 'on' : ''}" data-tfeito="${x.id}"
            aria-label="${esc(tt('tarAdd'))}">${x.feito ? '✓' : ''}</button>
    <div class="tarmeio" data-tabre="${x.id}">
      <b class="tartit">${esc(x.titulo)}</b>
      <small class="tarmeta">
        <span class="tarprio p-${x.prio}">${tt(PRIO_TXT[x.prio])}</span>
        <span class="${atrasada ? 'tarvermelho' : ''}">${x.feito ? tt('tarFeitoEm') + ' ' + fmtDate(x.feitoEm || x.data) : quando(x, hoje)}</span>
        ${x.repete ? `<span class="tarrep">↻ ${tt(x.repete === 'dia' ? 'tarDiaria' : x.repete === 'semana' ? 'tarSemanal' : 'tarMensal')}</span>` : ''}
        ${x.nota && !aberto ? `<span class="tarfraco">· ${esc(x.nota.slice(0, 60))}${x.nota.length > 60 ? '…' : ''}</span>` : ''}
      </small>
    </div>
    ${!x.feito && x.data ? `<button class="mini" data-tampanha="${x.id}" title="${esc(tt('tarAmanha'))}">→</button>` : ''}
    <button class="mini" data-tabre2="${x.id}">✎</button>
    ${aberto ? `
    <div class="tareditor">
      <div class="frow">
        <label class="fld tarcresce">${tt('tarNova')}<input id="edT" value="${esc(x.titulo)}"></label>
        <label class="fld">${tt('tarData')}<input id="edD" type="date" value="${x.data || ''}"></label>
        <label class="fld">${tt('tarHora')}<input id="edH" type="time" value="${x.hora || ''}"></label>
      </div>
      <div class="frow">
        <label class="fld">${tt('tarPrio')}<select id="edP">
          ${PRIOS.map(p => `<option value="${p}" ${p === x.prio ? 'selected' : ''}>${tt(PRIO_TXT[p])}</option>`).join('')}
        </select></label>
        <label class="fld">${tt('admTarefas')}<select id="edA">
          <option value="profissional" ${x.area === 'profissional' ? 'selected' : ''}>${tt('tarProf')}</option>
          <option value="pessoal" ${x.area === 'pessoal' ? 'selected' : ''}>${tt('tarPessoal')}</option>
        </select></label>
        <label class="fld">${tt('tarRepete')}<select id="edR">
          <option value="" ${!x.repete ? 'selected' : ''}>${tt('tarSemRep')}</option>
          <option value="dia" ${x.repete === 'dia' ? 'selected' : ''}>${tt('tarDiaria')}</option>
          <option value="semana" ${x.repete === 'semana' ? 'selected' : ''}>${tt('tarSemanal')}</option>
          <option value="mes" ${x.repete === 'mes' ? 'selected' : ''}>${tt('tarMensal')}</option>
        </select></label>
      </div>
      <label class="fld">${tt('tarNota')}<textarea id="edN" rows="2">${esc(x.nota || '')}</textarea></label>
      <div class="tarbts">
        <button class="cta sm" data-tsalva="${x.id}">${tt('tarSalvar')}</button>
        <button class="mini danger" data-tapaga="${x.id}">${tt('tarApagar')}</button>
      </div>
    </div>` : ''}
  </article>`;
}

function ligaTarefas() {
  $$('[data-area]').forEach(b => b.onclick = () => { tarArea = b.dataset.area; tarAbrindo = null; admTarefas(); });
  $$('[data-per]').forEach(b => b.onclick = () => { tarPeriodo = b.dataset.per; admTarefas(); });
  const vf = $('#tarVF'); if (vf) vf.onchange = () => { tarVerFeitas = vf.checked; admTarefas(); };

  const anota = () => {
    const titulo = $('#tarT').value.trim();
    if (!titulo) return;
    Tarefas.cria({ titulo, data: $('#tarD').value || '', prio: $('#tarP').value, area: tarArea });
    admTarefas();
  };
  $('#tarAdd').onclick = anota;
  const cx = $('#tarT');
  if (cx) { cx.onkeydown = (e) => { if (e.key === 'Enter') anota(); }; cx.focus(); }

  $$('[data-tfeito]').forEach(b => b.onclick = () => {
    const x = Tarefas.get(b.dataset.tfeito);
    if (x.feito) Tarefas.muda(x.id, { feito: false, feitoEm: '' });
    else if (Tarefas.conclui(x.id)) toast(tt('tarRepetiu'));
    admTarefas();
  });
  $$('[data-tampanha]').forEach(b => b.onclick = () => {
    const x = Tarefas.get(b.dataset.tampanha);
    Tarefas.muda(x.id, { data: addDays(isoToday(), 1) });
    admTarefas();
  });
  const abre = (id) => { tarAbrindo = tarAbrindo === id ? null : id; admTarefas(); };
  $$('[data-tabre]').forEach(b => b.onclick = () => abre(b.dataset.tabre));
  $$('[data-tabre2]').forEach(b => b.onclick = () => abre(b.dataset.tabre2));

  $$('[data-tsalva]').forEach(b => b.onclick = () => {
    Tarefas.muda(b.dataset.tsalva, {
      titulo: $('#edT').value.trim(), data: $('#edD').value || '', hora: $('#edH').value || '',
      prio: $('#edP').value, area: $('#edA').value, repete: $('#edR').value, nota: $('#edN').value.trim(),
    });
    tarAbrindo = null; admTarefas();
  });
  $$('[data-tapaga]').forEach(b => b.onclick = () => {
    if (!confirm(tt('tarApagarOk'))) return;
    Tarefas.apaga(b.dataset.tapaga); tarAbrindo = null; admTarefas();
  });
}
