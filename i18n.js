/* Textos do app — PT e EN. Fonte: copy.md. Uma chave por frase. */
'use strict';

const STR = {
  /* hub */
  role:        { pt: 'Guia e fotógrafa · Alsácia e Floresta Negra', en: 'Guide & photographer · Alsace and Black Forest' },
  tagline:     { pt: 'Passeios a pé, de bike e com ensaio de fotos. Grupos pequenos, em português e inglês.', en: 'Walking, bike and photo tours. Small groups, in Portuguese and English.' },
  seeTours:    { pt: 'Ver passeios e reservar', en: 'See tours and book' },
  seeToursSub: { pt: 'Datas livres e reserva na hora', en: 'Live availability, book instantly' },
  whatsapp:    { pt: 'Falar comigo no WhatsApp', en: 'Message me on WhatsApp' },
  reviews:     { pt: 'O que dizem quem já veio', en: 'What past guests say' },
  saveContact: { pt: 'Salvar meu contato', en: 'Save my contact' },
  admEntry:    { pt: 'Área da Melissa', en: "Melissa's area" },
  myBooking:   { pt: 'Minha reserva', en: 'My booking' },

  /* vitrine */
  chooseTour:  { pt: 'Escolha o seu passeio', en: 'Choose your tour' },
  fAll: { pt: 'Todos', en: 'All' }, fWalk: { pt: 'A pé', en: 'Walking' },
  fPhoto: { pt: 'Foto', en: 'Photo' }, fBike: { pt: 'Bike', en: 'Bike' },
  upTo:        { pt: 'até', en: 'up to' }, people: { pt: 'pessoas', en: 'people' },
  fromPrice:   { pt: 'a partir de', en: 'from' },
  perPerson:   { pt: 'por pessoa', en: 'per person' },
  perSession:  { pt: 'pela sessão', en: 'per session' },
  soldOut:     { pt: 'Esgotado neste mês', en: 'Sold out this month' },
  emptyFilter: { pt: 'Nada aqui neste filtro. Veja todos os passeios.', en: 'Nothing under this filter. See all tours.' },
  back:        { pt: 'Voltar', en: 'Back' },

  /* página do passeio */
  freeCancel:  { pt: 'Cancelamento grátis até 48h antes', en: 'Free cancellation up to 48h before' },
  whereWeMeet: { pt: 'Onde a gente se encontra', en: 'Where we meet' },
  spotsLeft:   { pt: 'vagas', en: 'spots' },

  /* reserva */
  step1: { pt: '1 de 4 · Escolha a data', en: 'Step 1 of 4 · Pick a date' },
  step2: { pt: '2 de 4 · Quantas pessoas', en: 'Step 2 of 4 · How many people' },
  step3: { pt: '3 de 4 · Seus dados e pagamento', en: 'Step 3 of 4 · Your details and payment' },
  step4: { pt: 'Pronto!', en: 'All set!' },
  pickDate:    { pt: 'Escolha uma data', en: 'Pick a date' },
  pickTime:    { pt: 'Agora escolha o horário', en: 'Now pick a time' },
  noDatesMonth:{ pt: 'Nenhuma data neste mês.', en: 'No dates this month.' },
  cont:        { pt: 'Continuar', en: 'Continue' },
  peopleLbl:   { pt: 'Pessoas', en: 'People' },
  maxNote:     { pt: 'Este passeio vai até {n} pessoas. Para um grupo maior, me chame no WhatsApp.', en: 'This tour takes up to {n}. For a bigger group, message me.' },
  total:       { pt: 'Total', en: 'Total' },
  haveCoupon:  { pt: 'Tem um cupom?', en: 'Have a coupon?' },
  couponOk:    { pt: 'Cupom {c} aplicado', en: 'Coupon {c} applied' },
  couponBad:   { pt: 'Esse cupom não existe ou já venceu. Confira as letras.', en: "That coupon doesn't exist or has expired. Check the letters." },
  fullName:    { pt: 'Nome completo', en: 'Full name' },
  email:       { pt: 'E-mail', en: 'Email' },
  whatsLbl:    { pt: 'WhatsApp (com DDI)', en: 'WhatsApp (with country code)' },
  whyWhats:    { pt: 'É por aqui que eu te mando o ponto de encontro e aviso se mudar alguma coisa.', en: 'This is how I send you the meeting point and let you know if anything changes.' },
  instaLbl:    { pt: 'Instagram · se quiser, eu marco você nas fotos', en: 'Instagram · optional, so I can tag you in photos' },
  payFull:     { pt: 'Pagar tudo agora', en: 'Pay in full now' },
  payFullSub:  { pt: 'Resolve de uma vez.', en: 'Done in one go.' },
  paySplit:    { pt: 'Metade agora, metade na véspera', en: 'Half now, half the day before' },
  paySplitSub: { pt: '{half} agora para garantir a vaga. O resto sai do mesmo cartão um dia antes — eu aviso pelo WhatsApp antes de cobrar.', en: "{half} now to hold your spot. The rest comes off the same card one day before — I'll message you before it happens." },
  payBtn:      { pt: 'Pagar {v}', en: 'Pay {v}' },
  payNowBtn:   { pt: 'Pagar {v} agora', en: 'Pay {v} now' },
  noHidden:    { pt: 'Cancelamento grátis até 48h antes. Sem taxa escondida.', en: 'Free cancellation up to 48h before. No hidden fees.' },
  confirming:  { pt: 'Confirmando com o banco…', en: 'Confirming with your bank…' },
  demoPay:     { pt: 'Pagamento de demonstração — nenhum cartão é cobrado.', en: 'Demo payment — no card is charged.' },
  booked:      { pt: 'Está reservado.', en: "You're booked." },
  sentAll:     { pt: 'Mandei tudo no seu WhatsApp e no e-mail.', en: "I've sent everything to your WhatsApp and email." },
  yourCode:    { pt: 'Seu código', en: 'Your code' },
  balanceNote: { pt: 'Faltam {v}, que eu cobro em {d}. Você não precisa fazer nada.', en: '{v} left, charged on {d}. Nothing for you to do.' },
  addCal:      { pt: 'Colocar na minha agenda', en: 'Add to my calendar' },
  msgMelissa:  { pt: 'Falar com a Melissa', en: 'Message Melissa' },
  seeMap:      { pt: 'Ver no mapa', en: 'Open in maps' },
  bookAgain:   { pt: 'Fazer outra reserva', en: 'Book again' },
  lastSpotGone:{ pt: 'Alguém pegou a última vaga enquanto você preenchia. Escolha outro horário.', en: 'Someone just took the last spot. Pick another time.' },

  /* ADM comum */
  admToday:   { pt: 'Hoje', en: 'Today' },
  admTours:   { pt: 'Meus passeios', en: 'My tours' },
  admBookings:{ pt: 'Reservas', en: 'Bookings' },
  admMoney:   { pt: 'Extrato', en: 'Statement' },
  admCoupons: { pt: 'Cupons e brindes', en: 'Coupons & gifts' },
  admSettings:{ pt: 'Ajustes', en: 'Settings' },
  goodMorning:{ pt: 'Bom dia, Melissa', en: 'Good morning, Melissa' },
  noDepToday: { pt: 'Hoje você não tem saída. Bom descanso.', en: 'No departures today. Enjoy the break.' },
  viewSite:   { pt: 'Ver meu site', en: 'View my site' },
  exit:       { pt: 'Sair', en: 'Sign out' },

  /* passeios ADM */
  emptyTours:  { pt: 'Você ainda não tem passeios. Crie o primeiro e ele já aparece no seu site — leva uns 3 minutos.', en: 'No tours yet. Create your first one and it goes live on your site — takes about 3 minutes.' },
  newTour:     { pt: '+ Novo passeio', en: '+ New tour' },
  firstTour:   { pt: 'Criar meu primeiro passeio', en: 'Create my first tour' },
  duplicate:   { pt: 'Duplicar', en: 'Duplicate' },
  duplicated:  { pt: 'Copiei "{n}". Mude o que precisar e publique.', en: 'Copied "{n}". Change what you need and publish.' },
  live:        { pt: 'No ar', en: 'Live' },
  draft:       { pt: 'Rascunho — só você vê', en: 'Draft — only you see it' },
  seasonal:    { pt: 'Sazonal', en: 'Seasonal' },
  published:   { pt: 'No ar. Já dá para reservar.', en: 'Live. People can book now.' },
  unpublished: { pt: 'Fora do ar. Ninguém consegue reservar.', en: 'Offline. Nobody can book.' },
  edit:        { pt: 'Editar', en: 'Edit' },
  tType:    { pt: 'Que tipo é?', en: 'What kind is it?' },
  tWalk: { pt: 'A pé', en: 'Walking' }, tPhotoT: { pt: 'Photo tour', en: 'Photo tour' },
  tSession: { pt: 'Sessão de foto', en: 'Photo session' }, tBike: { pt: 'Bike', en: 'Bike' },
  tRegion:  { pt: 'Onde acontece?', en: 'Where is it?' },
  alsace: { pt: 'Alsácia', en: 'Alsace' }, blackforest: { pt: 'Floresta Negra', en: 'Black Forest' },
  tName:    { pt: 'Como você chama esse passeio? (PT)', en: 'Tour name (PT)' },
  tNameEn:  { pt: 'E em inglês', en: 'And in English' },
  tDesc:    { pt: 'Conte o que a pessoa vai viver (PT)', en: 'Tell people what they’ll experience (PT)' },
  tDescEn:  { pt: 'Em inglês', en: 'In English' },
  tDescHelp:{ pt: 'Escreva como você fala.', en: 'Write the way you speak.' },
  tMeeting: { pt: 'Ponto de encontro', en: 'Meeting point' },
  tPrice:   { pt: 'Quanto custa (€)', en: 'Price (€)' },
  tPriceMode:{ pt: 'Cobrado', en: 'Charged' },
  tMin:     { pt: 'Não saio com menos de', en: "I don't run it with fewer than" },
  tMax:     { pt: 'Levo no máximo', en: 'I take at most' },
  tPay:     { pt: 'Como você quer receber', en: 'How you want to be paid' },
  tPayFull: { pt: 'Tudo na reserva', en: 'In full at booking' },
  tPaySplit:{ pt: 'Metade na reserva, metade na véspera', en: 'Half at booking, half the day before' },
  savePub:  { pt: 'Salvar e publicar', en: 'Save and publish' },
  saveDraft:{ pt: 'Salvar como rascunho', en: 'Save as draft' },
  delTour:  { pt: 'Apagar "{n}"?', en: 'Delete "{n}"?' },
  delTourN: { pt: 'Existem {n} reservas futuras nele. Elas não somem, mas ninguém mais consegue reservar.', en: 'It has {n} upcoming bookings. They stay, but nobody can book it again.' },
  delDo:  { pt: 'Apagar passeio', en: 'Delete tour' }, keep: { pt: 'Manter', en: 'Keep' },

  /* calendário ADM */
  whenRuns:  { pt: 'Quando este passeio acontece', en: 'When this tour runs' },
  noDates:   { pt: 'Sem datas ainda. Sem data, ninguém consegue reservar.', en: 'No dates yet. Without dates, nobody can book.' },
  repeats:   { pt: 'Repete toda semana', en: 'Repeats weekly' },
  repeatsEg: { pt: 'Ex.: toda terça, quinta e sábado às 16h30', en: 'E.g. every Tue, Thu and Sat at 4:30 pm' },
  addRule:   { pt: 'Adicionar repetição', en: 'Add repetition' },
  oneOff:    { pt: 'Adicionar uma data solta', en: 'Add a one-off date' },
  blockDays: { pt: 'Bloquear dias (férias, compromissos)', en: 'Block days (holidays, other plans)' },
  seats:     { pt: 'Vagas nesta saída', en: 'Spots on this departure' },
  fromLbl: { pt: 'De', en: 'From' }, untilLbl: { pt: 'Até', en: 'Until' },
  timeLbl: { pt: 'Horário', en: 'Time' },
  wd: { pt: ['dom','seg','ter','qua','qui','sex','sáb'], en: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'] },

  /* reservas ADM */
  emptyBookings: { pt: 'Nenhuma reserva ainda. Assim que alguém reservar, aparece aqui.', en: 'No bookings yet. As soon as someone books, it shows up here.' },
  paid:      { pt: 'Pago', en: 'Paid' },
  depositPaid:{ pt: 'Sinal pago · faltam {v}', en: 'Deposit paid · {v} due' },
  chargesTomorrow: { pt: 'Cobro amanhã, sozinho', en: 'Charges tomorrow, automatically' },
  daysLate:  { pt: 'Atrasado há {n} dias', en: '{n} days late' },
  chargeNow: { pt: 'Cobrar agora', en: 'Charge now' },
  charged:   { pt: 'Recebido. {v} de {n}.', en: 'Received. {v} from {n}.' },
  cancelled: { pt: 'Cancelada', en: 'Cancelled' },
  msgWhats:  { pt: 'Falar no WhatsApp', en: 'Message on WhatsApp' },
  origin:    { pt: 'Origem', en: 'Origin' },

  /* extrato */
  stTitle:  { pt: 'Extrato de recebimentos', en: 'Payment statement' },
  thisWeek: { pt: 'Esta semana', en: 'This week' },
  thisMonth:{ pt: 'Este mês', en: 'This month' },
  stCols:   { pt: ['Data','Cliente','Serviço','Tipo','Forma','Valor'], en: ['Date','Guest','Service','Kind','Method','Amount'] },
  kindFull: { pt: 'Integral', en: 'Full' }, kindDep: { pt: 'Sinal', en: 'Deposit' }, kindBal: { pt: 'Saldo', en: 'Balance' },
  received: { pt: 'Recebido no período', en: 'Received in this period' },
  stEmpty:  { pt: 'Nada recebido neste período.', en: 'Nothing received in this period.' },
  dlCsv:    { pt: 'Baixar em Excel', en: 'Download Excel' },
  print:    { pt: 'Imprimir / PDF', en: 'Print / PDF' },

  /* cupons */
  emptyCoupons: { pt: 'Nenhum cupom ativo. Um desconto de 10% para quem já veio costuma trazer gente de volta.', en: 'No active coupons. 10% off for past guests usually brings people back.' },
  newCoupon: { pt: '+ Novo cupom', en: '+ New coupon' },
  cCode:  { pt: 'Código que o cliente digita', en: 'Code guests will type' },
  cPct:   { pt: 'Desconto (%)', en: 'Discount (%)' },
  cUntil: { pt: 'Vale até', en: 'Valid until' },
  cOnce:  { pt: '1 vez por pessoa', en: 'Once per person' },
  cUses:  { pt: 'Usado {n} vezes', en: 'Used {n} times' },
  create: { pt: 'Criar', en: 'Create' },

  /* ajustes */
  language:   { pt: 'Idioma do painel', en: 'Panel language' },
  tutorial:   { pt: 'Tutorial', en: 'Tutorial' },
  tutorialOn: { pt: 'Ver o tutorial de novo', en: 'See the tutorial again' },
  resetDemo:  { pt: 'Recomeçar com dados de exemplo', en: 'Reset with sample data' },
  resetWarn:  { pt: 'Isso apaga tudo que você criou e volta ao exemplo. Fazer isso?', en: 'This deletes everything you created and restores the sample. Do it?' },

  /* divulgar */
  share:      { pt: 'Divulgar', en: 'Share' },
  shareLink:  { pt: 'O link dos seus clientes', en: 'Your guests’ link' },
  copyLink:   { pt: 'Copiar link', en: 'Copy link' },
  copied:     { pt: 'Link copiado.', en: 'Link copied.' },
  qrTitle:    { pt: 'QR Code', en: 'QR Code' },
  qrHelp:     { pt: 'Imprima ou mostre na tela — a pessoa aponta a câmera e cai direto nos seus passeios.', en: 'Print it or show it on screen — guests point their camera and land on your tours.' },
  dlQr:       { pt: 'Baixar o QR', en: 'Download QR' },
  installTitle:{ pt: 'Instalar como aplicativo', en: 'Install as an app' },
  installHelp:{ pt: 'Vira um ícone na tela, abre em tela cheia e funciona até sem internet.', en: 'Becomes an icon on your screen, opens full-screen and even works offline.' },
  installBtn: { pt: 'Instalar neste aparelho', en: 'Install on this device' },
  installIos: { pt: 'No iPhone: abra no Safari → botão Compartilhar → “Adicionar à Tela de Início”.', en: 'On iPhone: open in Safari → Share button → “Add to Home Screen”.' },
  installed:  { pt: 'Instalado! Procure o ícone verde na sua tela.', en: 'Installed! Look for the green icon on your screen.' },
  autoUpd:    { pt: 'Atualizações são automáticas: quando eu publico uma melhoria, o app se atualiza sozinho nos seus aparelhos.', en: 'Updates are automatic: when an improvement is published, the app updates itself on your devices.' },
  syncNote:   { pt: 'Por enquanto, cada aparelho guarda os próprios dados. A sincronização entre celular e laptop chega com o banco na nuvem (próxima etapa).', en: 'For now each device keeps its own data. Sync between phone and laptop arrives with the cloud database (next step).' },

  /* tutorial — balões */
  tutSkip: { pt: 'Pular tutorial', en: 'Skip tutorial' },
  tutNext: { pt: 'Entendi', en: 'Got it' },
  tutDone: { pt: 'Pronto! Qualquer dúvida, o tutorial volta pelos Ajustes.', en: 'Done! You can replay this anytime from Settings.' },
};

let LANG = (function () { try { return JSON.parse(localStorage.getItem(DB_KEY))?.settings?.lang || 'pt'; } catch (e) { return 'pt'; } })();

function t(key, vars) {
  const e = STR[key];
  let s = e ? (e[LANG] ?? e.pt) : key;
  if (Array.isArray(s)) return s;
  if (vars) for (const k in vars) s = s.replaceAll('{' + k + '}', vars[k]);
  return s;
}
function setLang(l) { LANG = l; DB.settings.lang = l; save(); }
function eur(n) { return '€ ' + Number(n).toLocaleString(LANG === 'pt' ? 'pt-BR' : 'en-GB'); }
function fmtDate(iso) {
  const d = new Date(iso + 'T12:00:00');
  return LANG === 'pt'
    ? d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
    : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}
