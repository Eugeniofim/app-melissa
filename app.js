/* =====================================================
   VOYAGES & IMAGES — interface (v1)
   Cliente:  #/          hub
             #/tours     vitrine
             #/tour/ID   página + reserva
   Melissa:  #/adm/...   painel
   ===================================================== */
'use strict';

const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
const app = $('#app');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- contato (WhatsApp, mapa, agenda, vCard) ---------- */
function waNum() { return (DB.settings.whats || '').replace(/\D/g, ''); }
function waLink(text, num) {
  return 'https://wa.me/' + (num || waNum()) + (text ? '?text=' + encodeURIComponent(text) : '');
}
function mapLink(q) { return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q); }
function icsFor(b, x) {
  const dt = b.date.replace(/-/g, '') + 'T' + b.time.replace(':', '') + '00';
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//VoyagesImages//PT', 'BEGIN:VEVENT',
    'UID:' + b.code + '@voyages-images', 'DTSTART:' + dt,
    'SUMMARY:' + (x.name[LANG] || x.name.pt) + ' — Melissa Hallais',
    'LOCATION:' + x.meeting.replace(/,/g, '\\,'),
    'DESCRIPTION:' + (LANG === 'pt' ? 'Código ' : 'Code ') + b.code,
    'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);
}
function vcfLink() {
  const v = ['BEGIN:VCARD', 'VERSION:3.0', 'FN:Melissa Hallais',
    'ORG:Voyages & Images', 'TEL;TYPE=CELL:' + DB.settings.whats,
    'URL:https://eugeniofim.github.io/app-melissa/',
    'X-SOCIALPROFILE;TYPE=instagram:https://instagram.com/' + DB.settings.insta,
    'END:VCARD'].join('\r\n');
  return 'data:text/vcard;charset=utf-8,' + encodeURIComponent(v);
}

/* ---------- foto: redimensiona no navegador antes de guardar ---------- */
function readImageResized(file, maxW = 1100, quality = 0.78) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('not image'));
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width);
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode')); };
    img.src = url;
  });
}

/* ---------- toast ---------- */
const toastEl = document.createElement('div');
toastEl.className = 'toast'; document.body.appendChild(toastEl);
let toastT = null;
function toast(msg) {
  toastEl.textContent = msg; toastEl.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), 3400);
}

/* ---------- tutorial de balões ---------- */
const Coach = {
  steps: [], i: 0, el: null, keyFlag: '',
  start(steps, flag) {
    if (!DB.settings[flag]) return;
    this.steps = steps.filter(s => $(s.sel)); this.i = 0; this.keyFlag = flag;
    if (this.steps.length) this.show();
  },
  show() {
    this.hide();
    const s = this.steps[this.i]; const target = $(s.sel);
    if (!target) return this.next();
    target.scrollIntoView({ block: 'center', behavior: 'instant' });
    const r = target.getBoundingClientRect();
    const b = document.createElement('div');
    b.className = 'coach';
    b.innerHTML = `<div class="coach-txt">${esc(s.txt[LANG] || s.txt.pt)}</div>
      <div class="coach-row">
        <button class="coach-skip">${t('tutSkip')}</button>
        <span class="coach-n">${this.i + 1}/${this.steps.length}</span>
        <button class="coach-next">${t('tutNext')}</button>
      </div>`;
    document.body.appendChild(b);
    const bw = 270, top = r.bottom + 10, left = Math.max(10, Math.min(innerWidth - bw - 10, r.left + r.width / 2 - bw / 2));
    b.style.top = (top + b.offsetHeight > innerHeight ? Math.max(10, r.top - b.offsetHeight - 10) : top) + 'px';
    b.style.left = left + 'px';
    target.classList.add('coach-hi');
    this.el = b; this.hiEl = target;
    $('.coach-next', b).onclick = () => this.next();
    $('.coach-skip', b).onclick = () => this.stop(true);
  },
  next() { this.i++; if (this.i >= this.steps.length) return this.stop(true); this.show(); },
  hide() { this.el?.remove(); this.el = null; this.hiEl?.classList.remove('coach-hi'); },
  stop(done) {
    this.hide();
    if (this.keyFlag) { DB.settings[this.keyFlag] = false; save(); }
    if (done) toast(t('tutDone'));
  },
};

/* ---------- roteador ---------- */
addEventListener('hashchange', route);
function go(h) { location.hash = h; }
function route() {
  Coach.hide();
  const h = location.hash.slice(2) || '';
  const p = h.split('/');
  document.documentElement.lang = LANG === 'pt' ? 'pt-BR' : 'en';
  if (p[0] === 'adm')      viewAdm(p[1] || 'today', p[2]);
  else if (p[0] === 'tours') viewShowcase();
  else if (p[0] === 'tour')  viewTour(p[1]);
  else                       viewHub();
  scrollTo(0, 0);
}

/* barra de idioma do cliente */
function langBar(cls) {
  return `<div class="langs ${cls || ''}">
    <button data-lang="pt" class="${LANG === 'pt' ? 'on' : ''}">🇧🇷 PT</button>
    <button data-lang="en" class="${LANG === 'en' ? 'on' : ''}">🇬🇧 EN</button></div>`;
}
function bindLang(root) {
  $$('[data-lang]', root).forEach(b => b.onclick = () => { setLang(b.dataset.lang); route(); });
}

/* =====================================================
   CLIENTE
===================================================== */
function viewHub() {
  app.innerHTML = `
  <div class="hub">
    <div class="hub-bg" style="background-image:url(capa.jpg)"></div>
    <div class="hub-in">
      <div class="vcard">
        ${logoFull({ mark: 62, color: 'var(--brand-amarelo)' })}
        <h1>Melissa Hallais</h1>
        <p class="role">${t('role')}</p>
        <p class="tagline">${t('tagline')}</p>
        ${langBar('center')}
      </div>
      <button class="lk main" id="goTours">
        <span class="ic">📍</span><span><b>${t('seeTours')}</b><small>${t('seeToursSub')}</small></span><span class="go">→</span>
      </button>
      <a class="lk" href="https://instagram.com/${esc(DB.settings.insta)}" target="_blank" rel="noopener"><span class="ic">◎</span><span><b>Instagram</b><small>@${esc(DB.settings.insta)}</small></span><span class="go">→</span></a>
      <a class="lk" href="${waLink(t('waHello'))}" target="_blank" rel="noopener"><span class="ic">✆</span><span><b>${t('whatsapp')}</b></span><span class="go">→</span></a>
      <button class="adm-entry" id="admEntry">🔒 ${t('admEntry')}</button>
    </div>
  </div>`;
  bindLang(app);
  $('#goTours').onclick = () => go('/tours');
  $('#admEntry').onclick = () => go('/adm/today');
  $$('[data-demo]').forEach(b => b.onclick = () => toast(LANG === 'pt' ? 'Protótipo: no app final este botão abre o destino real.' : 'Prototype: this opens the real destination in the final app.'));
  Coach.start([
    { sel: '#goTours',  txt: { pt: 'Seu cliente começa aqui: toca e vê todos os passeios com datas reais.', en: 'Your guest starts here: all tours with live dates.' } },
    { sel: '#admEntry', txt: { pt: 'E esta é a SUA porta, Melissa — o painel onde você controla tudo.', en: 'And this is YOUR door, Melissa — the panel where you control everything.' } },
  ], 'tutorialClient');
}

const TYPE_LABEL = { walk: 'fWalk', photo: 'fPhoto', bike: 'fBike' };

function viewShowcase() {
  const tours = Tours.live();
  const filter = viewShowcase._f || 'all';
  const list = filter === 'all' ? tours : tours.filter(x => x.type === filter || (filter === 'photo' && x.type === 'photo'));
  app.innerHTML = `
  <header class="topbar">
    <button class="backbtn" id="bk" aria-label="${t('back')}">←</button>
    <span class="tbrand">${logoMark(24, 'var(--brand-amarelo)')}<b>Melissa Hallais</b></span>
    ${langBar('right')}
  </header>
  <main class="wrap">
    <h1 class="pageh">${t('chooseTour')}</h1>
    <div class="chips" id="filters">
      ${['all', 'walk', 'photo', 'bike'].map(f =>
        `<button class="chip ${filter === f ? 'on' : ''}" data-f="${f}">${t(f === 'all' ? 'fAll' : TYPE_LABEL[f])}</button>`).join('')}
    </div>
    <div class="cards" id="tourCards">
      ${list.length ? list.map(x => `
        <button class="tourcard" data-id="${x.id}">
          <span class="ph" style="background-image:url(${esc(x.photo)})">
            <span class="tbadge">${t(TYPE_LABEL[x.type] || 'fWalk')}</span>
          </span>
          <span class="bd">
            <b>${esc(x.name[LANG] || x.name.pt)}</b>
            <small class="meta">${t(x.region === 'alsace' ? 'alsace' : 'blackforest')} · ${t('upTo')} ${x.max} ${t('people')}</small>
            <span class="cardfoot">
              <span class="pr">${x.priceMode === 'session' ? eur(x.price) : eur(x.price)}
                <i>${x.priceMode === 'session' ? t('perSession') : t('perPerson')}</i></span>
              <span class="cgo">→</span>
            </span>
          </span>
        </button>`).join('')
      : `<p class="empty">${t('emptyFilter')}</p>`}
    </div>
  </main>`;
  bindLang(app);
  $('#bk').onclick = () => go('/');
  $$('#filters .chip').forEach(c => c.onclick = () => { viewShowcase._f = c.dataset.f; viewShowcase(); });
  $$('.tourcard').forEach(c => c.onclick = () => go('/tour/' + c.dataset.id));
}

/* --- página do passeio + fluxo de reserva --- */
function viewTour(id) {
  const x = Tours.get(id);
  if (!x) return go('/tours');
  const S = viewTour._s = { tour: x, date: null, time: null, cap: 0, pax: x.priceMode === 'session' ? 1 : 2, step: 1, coupon: null, discount: 0, policy: x.payPolicy === 'split' ? 'split' : 'full' };

  app.innerHTML = `
  <header class="topbar"><button class="backbtn" id="bk">←</button><b>${esc(x.name[LANG] || x.name.pt)}</b>${langBar('right')}</header>
  <div class="hero-sm" style="background-image:url(${esc(x.photo)})"></div>
  <main class="wrap two-col">
    <section>
      <span class="badge">${t('freeCancel')}</span>
      <p class="desc">${esc(x.desc[LANG] || x.desc.pt)}</p>
      <h3 class="h3">${t('whereWeMeet')}</h3>
      <p class="desc">${esc(x.meeting)}</p>
    </section>
    <aside class="book" id="book"></aside>
  </main>`;
  bindLang(app);
  $('#bk').onclick = () => go('/tours');
  renderBook();
}

function renderBook() {
  const S = viewTour._s, x = S.tour, book = $('#book');
  const priceLine = x.priceMode === 'session' ? `${eur(x.price)} <small>${t('perSession')}</small>` : `${eur(x.price)} <small>${t('perPerson')}</small>`;
  const base = x.priceMode === 'session' ? x.price : x.price * S.pax;
  const total = base - S.discount;

  if (S.step === 1) {
    const today = isoToday();
    const deps = Cal.departures(x.id, today, addDays(today, 120));
    const byDate = {};
    deps.forEach(d => { (byDate[d.date] = byDate[d.date] || []).push(d); });
    const dates = Object.keys(byDate).slice(0, 30);
    book.innerHTML = `
      <div class="bhead"><span class="bprice">${priceLine}</span></div>
      <div class="bstep">${t('step1')}</div>
      ${dates.length ? `
      <div class="dgrid">${dates.map(d =>
        `<button class="dcell ${S.date === d ? 'on' : ''}" data-d="${d}"><b>${fmtDate(d).split(',')[1] || fmtDate(d)}</b><small>${fmtDate(d).split(',')[0]}</small></button>`).join('')}
      </div>
      <div id="times">${S.date ? timesHtml(byDate[S.date]) : `<p class="hint">${t('pickDate')}</p>`}</div>
      <button class="cta" id="next1" ${S.time ? '' : 'disabled'}>${t('cont')}</button>`
      : `<p class="empty">${t('noDatesMonth')}</p>`}`;
    $$('.dcell', book).forEach(b => b.onclick = () => { S.date = b.dataset.d; S.time = null; renderBook(); });
    $$('[data-t]', book).forEach(b => b.onclick = () => {
      S.time = b.dataset.t; S.cap = +b.dataset.c;
      $$('[data-t]', book).forEach(z => z.classList.remove('on')); b.classList.add('on');
      $('#next1').disabled = false;
    });
    $('#next1')?.addEventListener('click', () => { S.step = 2; renderBook(); });

    function timesHtml(list) {
      return `<p class="hint">${t('pickTime')}</p><div class="times">` + list.map(d => {
        const left = Cal.seatsLeft(x.id, d.date, d.time, d.capacity);
        return left > 0
          ? `<button class="slot ${S.time === d.time ? 'on' : ''}" data-t="${d.time}" data-c="${d.capacity}">${d.time}<small>${left} ${t('spotsLeft')}</small></button>`
          : `<button class="slot off" disabled>${d.time}<small>0</small></button>`;
      }).join('') + '</div>';
    }
  }

  if (S.step === 2) {
    book.innerHTML = `
      <div class="bhead"><span class="bprice">${priceLine}</span></div>
      <div class="bstep">${t('step2')}</div>
      <div class="paxrow ${x.priceMode === 'session' ? 'hide' : ''}">
        <b>${t('peopleLbl')}</b>
        <div class="pm"><button id="mn">−</button><span id="pax">${S.pax}</span><button id="pl">+</button></div>
      </div>
      <div class="sums">
        <div><span>${fmtDate(S.date)} · ${S.time}</span></div>
        ${S.discount ? `<div><span>${t('couponOk', { c: S.coupon })}</span><b>−${eur(S.discount)}</b></div>` : ''}
        <div class="tot"><span>${t('total')}</span><b>${eur(total)}</b></div>
      </div>
      <details class="coupon"><summary>${t('haveCoupon')}</summary>
        <div class="crow"><input id="cin" placeholder="VOLTA10"><button class="mini" id="capply">OK</button></div>
        <p class="cbad" id="cbad"></p>
      </details>
      <button class="cta" id="next2">${t('cont')}</button>
      <button class="linkbtn" id="back1">← ${t('back')}</button>`;
    $('#mn').onclick = () => { S.pax = Math.max(x.min || 1, S.pax - 1); S.discount = 0; S.coupon = null; renderBook(); };
    $('#pl').onclick = () => {
      if (S.pax >= Math.min(x.max, S.cap || x.max)) return toast(t('maxNote', { n: x.max }));
      S.pax++; S.discount = 0; S.coupon = null; renderBook();
    };
    $('#capply').onclick = () => {
      const v = Coupons.validate($('#cin').value, null);
      if (v.ok) { S.coupon = v.coupon.code; S.discount = Math.round(base * v.coupon.pct / 100); renderBook(); }
      else $('#cbad').textContent = t('couponBad');
    };
    $('#next2').onclick = () => { S.step = 3; renderBook(); };
    $('#back1').onclick = () => { S.step = 1; renderBook(); };
  }

  if (S.step === 3) {
    const half = Math.round(total / 2);
    const splitAllowed = x.payPolicy === 'split';
    book.innerHTML = `
      <div class="bstep">${t('step3')}</div>
      <label class="fld">${t('fullName')}<input id="fN" autocomplete="name"></label>
      <label class="fld">${t('email')}<input id="fE" type="email" autocomplete="email"></label>
      <label class="fld">${t('whatsLbl')}<input id="fW" placeholder="+33 6 …"><small class="why">${t('whyWhats')}</small></label>
      <label class="fld">${t('instaLbl')}<input id="fI" placeholder="@"></label>
      ${splitAllowed ? `
      <div class="payopts">
        <button class="popt ${S.policy === 'full' ? 'on' : ''}" data-p="full"><b>${t('payFull')}</b><small>${t('payFullSub')} · ${eur(total)}</small></button>
        <button class="popt ${S.policy === 'split' ? 'on' : ''}" data-p="split"><b>${t('paySplit')}</b><small>${t('paySplitSub', { half: eur(half) })}</small></button>
      </div>` : ''}
      <button class="cta" id="payBtn">${S.policy === 'split' && splitAllowed ? t('payNowBtn', { v: eur(half) }) : t('payBtn', { v: eur(total) })}</button>
      <p class="fine">${t('noHidden')}</p>
      <p class="fine demo">${t('demoPay')}</p>
      <button class="linkbtn" id="back2">← ${t('back')}</button>`;
    $$('.popt', book).forEach(b => b.onclick = () => {
      /* não re-renderizar: apagaria o que a pessoa já digitou */
      S.policy = b.dataset.p;
      $$('.popt', book).forEach(z => z.classList.toggle('on', z === b));
      $('#payBtn').textContent = S.policy === 'split' ? t('payNowBtn', { v: eur(half) }) : t('payBtn', { v: eur(total) });
    });
    $('#back2').onclick = () => { S.step = 2; renderBook(); };
    $('#payBtn').onclick = () => {
      const name = $('#fN').value.trim(), email = $('#fE').value.trim(), whats = $('#fW').value.trim();
      if (!name || !email || !whats) return toast(LANG === 'pt' ? 'Preencha nome, e-mail e WhatsApp.' : 'Fill in name, email and WhatsApp.');
      if (Cal.seatsLeft(x.id, S.date, S.time, S.cap || x.max) < S.pax) { S.step = 1; S.time = null; renderBook(); return toast(t('lastSpotGone')); }
      const btn = $('#payBtn'); btn.disabled = true; btn.textContent = t('confirming');
      setTimeout(() => {
        S.booking = Bookings.create({
          tourId: x.id, date: S.date, time: S.time, name, email, whats,
          insta: $('#fI').value.trim(), pax: S.pax, coupon: S.coupon,
          policy: splitAllowed ? S.policy : 'full', origin: 'site',
        });
        S.step = 4; renderBook();
      }, 900);
    };
  }

  if (S.step === 4) {
    const b = S.booking, due = Bookings.due(b);
    book.innerHTML = `
      <div class="okc">✓</div>
      <h2 class="okh">${t('booked')}</h2>
      <p class="hint center">${t('sentAll')}</p>
      <div class="voucher">
        <small>${t('yourCode')}</small><div class="code">${b.code}</div>
        <p>${fmtDate(b.date)} · ${b.time}</p><p>${esc(x.meeting)}</p>
        ${due > 0 ? `<p class="due">${t('balanceNote', { v: eur(due), d: fmtDate(Bookings.dueDate(b)) })}</p>` : ''}
      </div>
      <a class="cta" style="text-decoration:none;text-align:center" target="_blank" rel="noopener"
         href="${waLink(t('waBookingMsg', { code: b.code, tour: x.name[LANG] || x.name.pt, when: fmtDate(b.date) + ' ' + b.time, name: b.name }))}">✆ ${t('waSendBooking')}</a>
      <div class="okrow">
        <a class="mini" href="${icsFor(b, x)}" download="${b.code}.ics">${t('addCal')}</a>
        <a class="mini" target="_blank" rel="noopener" href="${mapLink(x.meeting)}">${t('seeMap')}</a>
      </div>
      <button class="cta soft" id="again">${t('bookAgain')}</button>`;
    $('#again').onclick = () => go('/tours');
  }
}

/* =====================================================
   ADM
===================================================== */
const ADM_TABS = [
  ['today',    'admToday'],
  ['agenda',   'admAgenda'],
  ['tours',    'admTours'],
  ['bookings', 'admBookings'],
  ['money',    'admMoney'],
  ['reports',  'admReports'],
  ['clients',  'admClients'],
  ['coupons',  'admCoupons'],
  ['settings', 'admSettings'],
];

function admShell(tab, inner) {
  app.innerHTML = `
  <div class="adm">
    <aside class="rail">
      <div class="brand">${logoFull({ mark: 26, sub: 'ADM' })}</div>
      <nav>${ADM_TABS.map(([id, k]) =>
        `<button class="nb ${tab === id ? 'on' : ''}" data-tab="${id}" id="nb-${id}">${t(k)}</button>`).join('')}</nav>
      <div class="railfoot">
        <button class="nb ghost" id="viewSite">👁 ${t('viewSite')}</button>
        <button class="nb ghost" id="exitAdm">← ${t('exit')}</button>
      </div>
    </aside>
    <main class="stage" id="stage">${inner}</main>
  </div>`;
  $$('.nb[data-tab]').forEach(b => b.onclick = () => go('/adm/' + b.dataset.tab));
  $('#viewSite').onclick = () => go('/');
  $('#exitAdm').onclick = () => go('/');
}

function viewAdm(tab, arg) {
  if (tab === 'today')    admToday();
  else if (tab === 'tours' && arg) admTourEdit(arg);
  else if (tab === 'tours')    admTours();
  else if (tab === 'bookings') admBookings();
  else if (tab === 'money')    admMoney();
  else if (tab === 'agenda')   admAgenda();
  else if (tab === 'reports')  admReports();
  else if (tab === 'clients')  admClients();
  else if (tab === 'coupons')  admCoupons();
  else if (tab === 'settings') admSettings();
  else admToday();
}

/* ---- Hoje ---- */
function admToday() {
  const today = isoToday();
  const deps = Tours.all().flatMap(x =>
    Cal.departures(x.id, today, today).map(d => ({ ...d, tour: x })));
  const late = Bookings.all().filter(b => b.status === 'confirmed' && Bookings.due(b) > 0 && Bookings.dueDate(b) < today);
  const dueTomorrow = Bookings.all().filter(b => b.status === 'confirmed' && Bookings.due(b) > 0 && Bookings.dueDate(b) === today);
  admShell('today', `
    <h1 class="pageh">${t('goodMorning')}</h1>
    ${late.length ? `<div class="alert bad">⚠ ${late.length} ${LANG === 'pt' ? 'pagamentos atrasados' : 'late payments'} · ${eur(late.reduce((s, b) => s + Bookings.due(b), 0))} <button class="mini" id="goLate">${t('admBookings')} →</button></div>` : ''}
    ${dueTomorrow.length ? `<div class="alert warn">${dueTomorrow.length} ${LANG === 'pt' ? 'saldos programados para hoje' : 'balances scheduled today'}</div>` : ''}
    <section class="card">
      <h3>${t('admToday')}</h3>
      ${deps.length ? deps.map(d => {
        const left = Cal.seatsLeft(d.tourId, d.date, d.time, d.capacity);
        return `<div class="deprow"><b class="mono">${d.time}</b><span>${esc(d.tour.name[LANG] || d.tour.name.pt)}</span><span class="pill ${left === 0 ? 'ok' : 'n'}">${d.capacity - left}/${d.capacity}</span></div>`;
      }).join('') : `<p class="empty">${t('noDepToday')}</p>`}
    </section>`);
  $('#goLate')?.addEventListener('click', () => go('/adm/bookings'));
  Coach.start([
    { sel: '#nb-tours',    txt: { pt: 'Aqui você cria e edita seus passeios — quantos quiser, com o calendário de cada um.', en: 'Create and edit your tours here — as many as you want, each with its own calendar.' } },
    { sel: '#nb-bookings', txt: { pt: 'Cada reserva aparece aqui: quem pagou tudo, quem pagou o sinal, quem atrasou.', en: 'Every booking lands here: paid in full, deposit only, or late.' } },
    { sel: '#nb-money',    txt: { pt: 'O extrato que vai para o contador: cliente, serviço, valor, forma e data de pagamento.', en: 'The statement for your accountant: guest, service, amount, method and date.' } },
    { sel: '#viewSite',    txt: { pt: 'A qualquer momento, veja o site exatamente como o cliente vê.', en: 'At any time, see the site exactly as your guest does.' } },
  ], 'tutorialAdm');
}

/* ---- Passeios ---- */
const STATUS_PILL = { live: ['ok', 'live'], draft: ['n', 'draft'], seasonal: ['warn', 'seasonal'] };
function admTours() {
  const tours = Tours.all();
  admShell('tours', `
    <div class="pagehead"><h1 class="pageh">${t('admTours')}</h1>
      <button class="cta sm" id="newTour">${t('newTour')}</button></div>
    ${tours.length ? `<div class="tlist">${tours.map(x => {
      const [cls, k] = STATUS_PILL[x.status] || STATUS_PILL.draft;
      return `<div class="trow">
        <span class="ph sm" style="background-image:url(${esc(x.photo)})"></span>
        <div class="tinfo"><b>${esc(x.name.pt)}</b>
          <small>${t(TYPE_LABEL[x.type] || 'fWalk')} · ${eur(x.price)} ${x.priceMode === 'session' ? t('perSession') : t('perPerson')} · ${t(x.region === 'alsace' ? 'alsace' : 'blackforest')}</small></div>
        <span class="pill ${cls}">${t(k)}</span>
        <div class="tacts">
          <button class="mini" data-edit="${x.id}">${t('edit')}</button>
          <button class="mini" data-dup="${x.id}">${t('duplicate')}</button>
          <button class="mini ghost" data-togg="${x.id}">${x.status === 'draft' ? '▶' : '⏸'}</button>
          <button class="mini danger" data-del="${x.id}">×</button>
        </div></div>`;
    }).join('')}</div>`
    : `<div class="emptybox"><p>${t('emptyTours')}</p><button class="cta" id="newTour2">${t('firstTour')}</button></div>`}`);
  $('#newTour')?.addEventListener('click', () => admTourEdit('new'));
  $('#newTour2')?.addEventListener('click', () => admTourEdit('new'));
  $$('[data-edit]').forEach(b => b.onclick = () => go('/adm/tours/' + b.dataset.edit));
  $$('[data-dup]').forEach(b => b.onclick = () => {
    const cp = Tours.duplicate(b.dataset.dup);
    toast(t('duplicated', { n: cp.name.pt })); admTours();
  });
  $$('[data-togg]').forEach(b => b.onclick = () => {
    const x = Tours.get(b.dataset.togg);
    Tours.update(x.id, { status: x.status === 'draft' ? 'live' : 'draft' });
    toast(x.status === 'draft' ? t('published') : t('unpublished')); admTours();
  });
  $$('[data-del]').forEach(b => b.onclick = () => {
    const x = Tours.get(b.dataset.del);
    const n = Tours.futureBookings(x.id).length;
    const msg = t('delTour', { n: x.name.pt }) + (n ? '\n' + t('delTourN', { n }) : '');
    if (confirm(msg)) { Tours.remove(x.id); admTours(); }
  });
}

/* ---- criar / editar passeio + calendário ---- */
function admTourEdit(id) {
  const isNew = id === 'new';
  const x = isNew
    ? { type: 'walk', region: 'alsace', name: { pt: '', en: '' }, desc: { pt: '', en: '' },
        meeting: '', photo: 'capa.jpg', price: 45, priceMode: 'pp', min: 2, max: 12,
        payPolicy: 'split', status: 'draft' }
    : Tours.get(id);
  if (!x) return go('/adm/tours');

  const selOpts = (opts, cur) => opts.map(([v, k]) => `<option value="${v}" ${cur === v ? 'selected' : ''}>${t(k)}</option>`).join('');
  admShell('tours', `
    <button class="linkbtn" id="bkT">← ${t('admTours')}</button>
    <h1 class="pageh">${isNew ? t('newTour').replace('+ ', '') : esc(x.name.pt)}</h1>
    <div class="formgrid">
      <section class="card">
        <label class="fld">${t('tType')}<select id="fType">${selOpts([['walk','tWalk'],['photo','tPhotoT'],['session','tSession'],['bike','tBike']], x.type)}</select></label>
        <label class="fld">${t('tRegion')}<select id="fRegion">${selOpts([['alsace','alsace'],['blackforest','blackforest']], x.region)}</select></label>
        <label class="fld">${t('tName')}<input id="fNamePt" value="${esc(x.name.pt)}"></label>
        <label class="fld">${t('tNameEn')}<input id="fNameEn" value="${esc(x.name.en)}"></label>
        <label class="fld">${t('tDesc')}<textarea id="fDescPt">${esc(x.desc.pt)}</textarea><small class="why">${t('tDescHelp')}</small></label>
        <label class="fld">${t('tDescEn')}<textarea id="fDescEn">${esc(x.desc.en)}</textarea></label>
        <label class="fld">${t('tMeeting')}<input id="fMeet" value="${esc(x.meeting)}"></label>
        <div class="fld">${t('tPhoto')}
          <div class="photopick">
            <span class="pprev" id="pPrev" style="background-image:url(${esc(x.photo || '')})">${x.photo ? '' : '<i>+</i>'}</span>
            <div class="ppinfo">
              <input type="file" accept="image/*" id="fPhoto">
              <small class="why">${t('tPhotoHelp')}</small>
            </div>
          </div>
        </div>
      </section>
      <section class="card">
        <div class="frow">
          <label class="fld">${t('tPrice')}<input id="fPrice" type="number" value="${x.price}"></label>
          <label class="fld">${t('tPriceMode')}<select id="fMode">${selOpts([['pp','perPerson'],['session','perSession']], x.priceMode)}</select></label>
        </div>
        <div class="frow">
          <label class="fld">${t('tMin')}<input id="fMin" type="number" value="${x.min}"></label>
          <label class="fld">${t('tMax')}<input id="fMax" type="number" value="${x.max}"></label>
        </div>
        <label class="fld">${t('tPay')}<select id="fPay">${selOpts([['full','tPayFull'],['split','tPaySplit']], x.payPolicy)}</select></label>
        <div class="btnrow">
          <button class="cta sm" id="savePub">${t('savePub')}</button>
          <button class="mini" id="saveDraft">${t('saveDraft')}</button>
        </div>
      </section>
      ${isNew ? '' : `
      <section class="card span2" id="calCard">
        <h3>${t('whenRuns')}</h3>
        <div id="rulesList"></div>
        <div class="ruleform">
          <b>${t('repeats')}</b> <small class="why">${t('repeatsEg')}</small>
          <div class="wdrow" id="wdRow">${t('wd').map((w, i) => `<button class="wd" data-w="${i}">${w}</button>`).join('')}</div>
          <div class="frow">
            <label class="fld">${t('timeLbl')}<input id="rTime" value="16:30"></label>
            <label class="fld">${t('seats')}<input id="rCap" type="number" value="${x.max}"></label>
          </div>
          <div class="frow">
            <label class="fld">${t('fromLbl')}<input id="rFrom" type="date" value="${isoToday()}"></label>
            <label class="fld">${t('untilLbl')}<input id="rUntil" type="date" value="${addDays(isoToday(), 60)}"></label>
          </div>
          <button class="mini" id="addRule">${t('addRule')}</button>
        </div>
        <div class="rulesep"></div>
        <b>${t('oneOff')}</b>
        <div class="frow">
          <label class="fld"><input id="oDate" type="date" value="${addDays(isoToday(), 7)}"></label>
          <label class="fld"><input id="oTime" value="10:00"></label>
          <label class="fld"><input id="oCap" type="number" value="${x.max}"></label>
          <button class="mini" id="addOne">+</button>
        </div>
      </section>`}
    </div>`);
  let newPhoto = null;
  $('#fPhoto').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try {
      newPhoto = await readImageResized(f);
      $('#pPrev').style.backgroundImage = `url(${newPhoto})`;
      $('#pPrev').innerHTML = '';
      toast(t('tPhotoOk'));
    } catch (err) { toast(t('tPhotoBad')); }
  };
  $('#bkT').onclick = () => go('/adm/tours');

  function collect(status) {
    return {
      type: $('#fType').value, region: $('#fRegion').value,
      name: { pt: $('#fNamePt').value.trim(), en: $('#fNameEn').value.trim() || $('#fNamePt').value.trim() },
      desc: { pt: $('#fDescPt').value.trim(), en: $('#fDescEn').value.trim() || $('#fDescPt').value.trim() },
      meeting: $('#fMeet').value.trim(), photo: x.photo,
      price: +$('#fPrice').value || 0, priceMode: $('#fMode').value,
      min: +$('#fMin').value || 1, max: +$('#fMax').value || 1,
      payPolicy: $('#fPay').value,
      photo: newPhoto || x.photo, status,
    };
  }
  $('#savePub').onclick = () => {
    const data = collect('live');
    if (!data.name.pt) return toast(LANG === 'pt' ? 'Dê um nome ao passeio.' : 'Give the tour a name.');
    if (isNew) { const nt = Tours.create(data); toast(t('published')); go('/adm/tours/' + nt.id); }
    else { Tours.update(x.id, data); toast(t('published')); go('/adm/tours'); }
  };
  $('#saveDraft').onclick = () => {
    const data = collect('draft');
    if (isNew) { const nt = Tours.create(data); go('/adm/tours/' + nt.id); }
    else { Tours.update(x.id, data); go('/adm/tours'); }
    toast(t('draft'));
  };

  if (!isNew) {
    const wds = new Set();
    $$('#wdRow .wd').forEach(b => b.onclick = () => {
      const w = +b.dataset.w;
      wds.has(w) ? wds.delete(w) : wds.add(w);
      b.classList.toggle('on', wds.has(w));
    });
    $('#addRule').onclick = () => {
      if (!wds.size) return toast(LANG === 'pt' ? 'Escolha os dias da semana.' : 'Pick the weekdays.');
      Cal.addRule({ tourId: x.id, weekdays: [...wds], time: $('#rTime').value, capacity: +$('#rCap').value || x.max, from: $('#rFrom').value, until: $('#rUntil').value });
      drawRules(); toast('✓');
    };
    $('#addOne').onclick = () => {
      Cal.addDeparture({ tourId: x.id, date: $('#oDate').value, time: $('#oTime').value, capacity: +$('#oCap').value || x.max });
      drawRules(); toast('✓');
    };
    function drawRules() {
      const rules = Cal.rulesFor(x.id);
      const ones = DB.departures.filter(d => d.tourId === x.id);
      $('#rulesList').innerHTML =
        (rules.length || ones.length)
          ? rules.map(r => `<div class="deprow"><span>${r.weekdays.map(w => t('wd')[w]).join(', ')} · <b class="mono">${r.time}</b> · ${r.from} → ${r.until}</span><button class="mini danger" data-rr="${r.id}">×</button></div>`).join('')
            + ones.map(d => `<div class="deprow"><span>${fmtDate(d.date)} · <b class="mono">${d.time}</b> · ${d.capacity} ${t('spotsLeft')}</span><button class="mini danger" data-rd="${d.id}">×</button></div>`).join('')
          : `<p class="empty">${t('noDates')}</p>`;
      $$('[data-rr]').forEach(b => b.onclick = () => { Cal.removeRule(b.dataset.rr); drawRules(); });
      $$('[data-rd]').forEach(b => b.onclick = () => { Cal.removeDeparture(b.dataset.rd); drawRules(); });
    }
    drawRules();
  }
}

/* ---- Reservas ---- */
function admBookings() {
  const list = Bookings.all();
  const today = isoToday();
  admShell('bookings', `
    <h1 class="pageh">${t('admBookings')}</h1>
    ${list.length ? `<div class="tlist">${list.map(b => {
      const x = Tours.get(b.tourId);
      const due = Bookings.due(b);
      let pill, act = '';
      if (b.status === 'cancelled') pill = `<span class="pill n">${t('cancelled')}</span>`;
      else if (due <= 0) pill = `<span class="pill ok">${t('paid')}</span>`;
      else {
        const dd = Bookings.dueDate(b);
        if (dd < today) {
          const days = Math.round((new Date(today) - new Date(dd)) / 864e5);
          pill = `<span class="pill bad">${t('daysLate', { n: days })}</span>`;
        } else pill = `<span class="pill warn">${t('depositPaid', { v: eur(due) })}</span>`;
        act = `<button class="mini" data-charge="${b.id}">${t('chargeNow')}</button>`;
      }
      const first = b.name.split(' ')[0];
      const tourName = x ? (x.name[LANG] || x.name.pt) : '';
      const waText = (b.status !== 'cancelled' && due > 0)
        ? t('waCharge', { name: first, v: eur(due), tour: tourName, when: fmtDate(b.date) })
        : t('waHi', { name: first, tour: tourName, when: fmtDate(b.date) + ' ' + b.time });
      const wa = waLink(waText, b.whats.replace(/\D/g, ''));
      return `<div class="trow">
        <div class="tinfo"><b>${esc(b.name)}</b>
          <small>${esc(x ? x.name.pt : '?')} · ${fmtDate(b.date)} ${b.time} · ${b.pax}p · <span class="mono">${b.code}</span></small></div>
        <b class="mono">${eur(b.total)}</b>${pill}
        <div class="tacts">${act}<a class="mini" target="_blank" rel="noopener" href="${wa}">✆</a></div>
      </div>`;
    }).join('')}</div>`
    : `<div class="emptybox"><p>${t('emptyBookings')}</p></div>`}`);
  $$('[data-charge]').forEach(btn => btn.onclick = () => {
    const b = Bookings.get(btn.dataset.charge);
    Bookings.payBalance(b.id, 'card');
    toast(t('charged', { v: eur(b.payments.at(-1).amount), n: b.name.split(' ')[0] }));
    admBookings();
  });
}

/* ---- Extrato ---- */
function admMoney() {
  const mode = admMoney._m || 'month';
  const today = isoToday();
  const from = mode === 'week' ? addDays(today, -7) : today.slice(0, 8) + '01';
  const rows = Bookings.statement(from, today);
  const total = rows.reduce((s, r) => s + r.amount, 0);
  const KIND = { full: 'kindFull', deposit: 'kindDep', balance: 'kindBal' };
  const cols = t('stCols');
  admShell('money', `
    <div class="pagehead"><h1 class="pageh">${t('stTitle')}</h1>
      <div class="chips">
        <button class="chip ${mode === 'week' ? 'on' : ''}" id="mW">${t('thisWeek')}</button>
        <button class="chip ${mode === 'month' ? 'on' : ''}" id="mM">${t('thisMonth')}</button>
        <button class="mini" id="dlCsv">${t('dlCsv')}</button>
        <button class="mini" id="prn">${t('print')}</button>
      </div></div>
    <section class="card">
      ${rows.length ? `<table class="tbl"><thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
      <tbody>${rows.map(r => {
        const x = Tours.get(r.tourId);
        return `<tr><td class="mono">${r.date}</td><td>${esc(r.client)}</td><td>${esc(x ? x.name.pt : '?')}</td>
          <td>${t(KIND[r.kind])}</td><td>${r.method}</td><td class="mono right">${eur(r.amount)}</td></tr>`;
      }).join('')}</tbody>
      <tfoot><tr><td colspan="5"><b>${t('received')}</b></td><td class="mono right"><b>${eur(total)}</b></td></tr></tfoot></table>`
      : `<p class="empty">${t('stEmpty')}</p>`}
    </section>`);
  $('#mW').onclick = () => { admMoney._m = 'week'; admMoney(); };
  $('#mM').onclick = () => { admMoney._m = 'month'; admMoney(); };
  $('#prn').onclick = () => print();
  $('#dlCsv').onclick = () => {
    const csv = [cols.join(';')].concat(rows.map(r => {
      const x = Tours.get(r.tourId);
      return [r.date, r.client, x ? x.name.pt : '', t(KIND[r.kind]), r.method, r.amount].join(';');
    })).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }));
    a.download = 'extrato.csv'; a.click();
  };
}

/* ---- Cupons ---- */
function admCoupons() {
  const list = Coupons.all();
  admShell('coupons', `
    <div class="pagehead"><h1 class="pageh">${t('admCoupons')}</h1></div>
    <section class="card">
      <div class="frow">
        <label class="fld">${t('cCode')}<input id="cC" placeholder="VOLTA10"></label>
        <label class="fld">${t('cPct')}<input id="cP" type="number" value="10"></label>
        <label class="fld">${t('cUntil')}<input id="cU" type="date" value="${addDays(isoToday(), 90)}"></label>
        <label class="fld chk"><input id="cO" type="checkbox" checked> ${t('cOnce')}</label>
        <button class="cta sm" id="cAdd">${t('create')}</button>
      </div>
    </section>
    ${list.length ? `<div class="tlist">${list.map(c => `
      <div class="trow"><div class="tinfo"><b class="mono">${esc(c.code)}</b>
        <small>−${c.pct}% · ${t('cUntil').toLowerCase()} ${c.until} · ${t('cUses', { n: c.uses.length })}</small></div>
        <button class="mini danger" data-cd="${esc(c.code)}">×</button></div>`).join('')}</div>`
    : `<div class="emptybox"><p>${t('emptyCoupons')}</p></div>`}`);
  $('#cAdd').onclick = () => {
    const code = $('#cC').value.trim().toUpperCase();
    if (!code) return;
    Coupons.create({ code, pct: +$('#cP').value || 10, until: $('#cU').value, oncePerPerson: $('#cO').checked, uses: [] });
    admCoupons();
  };
  $$('[data-cd]').forEach(b => b.onclick = () => { Coupons.remove(b.dataset.cd); admCoupons(); });
}

/* ---- Ajustes ---- */
function admSettings() {
  admShell('settings', `
    <h1 class="pageh">${t('admSettings')}</h1>
    <section class="card">
      <h3>${t('language')}</h3>
      ${langBar()}
    </section>
    ${DB.demo ? `<div class="demobar">
      <b>🧪 ${t('demoOn')}</b>
      <p>${t('demoWhat')}</p>
      <button class="cta sm" id="demoClear">${t('demoClear')}</button>
    </div>` : `<div class="demobar">
      <b>${t('demoRestore')}</b>
      <p>${t('demoWhat')}</p>
      <button class="mini" id="demoRestore">${t('demoRestore')}</button>
    </div>`}
    <section class="card">
      <h3>${t('yourContact')}</h3>
      ${DB.settings.placeholderContact ? `<div class="alert warn">⚠ ${t('placeholderWarn')}</div>` : ''}
      <p class="why">${t('contactHelp')}</p>
      <div class="frow">
        <label class="fld">${t('yourWhats')}<input id="setWhats" value="${esc(DB.settings.whats)}" placeholder="+33 6 12 34 56 78"></label>
        <label class="fld">${t('yourInsta')}<input id="setInsta" value="${esc(DB.settings.insta)}" placeholder="melissahallais"></label>
        <button class="cta sm" id="setContactSave">${t('saveBtn')}</button>
      </div>
    </section>
    <section class="card">
      <h3>${t('share')}</h3>
      <label class="fld">${t('shareLink')}
        <div class="crow"><input id="shLink" readonly value="https://eugeniofim.github.io/app-melissa/">
        <button class="mini" id="shCopy">${t('copyLink')}</button></div></label>
      <div class="qrbox">
        <img src="qr-app.png" alt="QR" width="150" height="150">
        <div><b>${t('qrTitle')}</b><p class="why">${t('qrHelp')}</p>
          <a class="mini" href="qr-app.png" download="qr-melissa.png">${t('dlQr')}</a></div>
      </div>
      <div class="rulesep"></div>
      <b>${t('installTitle')}</b>
      <p class="why">${t('installHelp')}</p>
      <div class="btnrow">
        <button class="cta sm" id="shInstall">${t('installBtn')}</button>
      </div>
      <p class="why">${t('installIos')}</p>
      <p class="why">✓ ${t('autoUpd')}</p>
      <p class="why">⚠ ${t('syncNote')}</p>
    </section>
    <section class="card">
      <h3>${t('tutorial')}</h3>
      <button class="mini" id="tutAgain">${t('tutorialOn')}</button>
    </section>
    <section class="card">
      <button class="mini danger" id="reset">${t('resetDemo')}</button>
    </section>`);
  bindLang(app);
  const dc = $('#demoClear');
  if (dc) dc.onclick = () => {
    if (!confirm(t('demoConfirm'))) return;
    clearAll(); cloudPushState();
    toast(t('demoCleared')); go('/adm/tours');
  };
  const dr = $('#demoRestore');
  if (dr) dr.onclick = () => { restoreDemo(); cloudPushState(); toast(t('demoRestored')); admSettings(); };
  $('#setContactSave').onclick = () => {
    DB.settings.whats = $('#setWhats').value.trim();
    DB.settings.insta = $('#setInsta').value.trim().replace(/^@/, '');
    DB.settings.placeholderContact = false; save();
    toast(t('contactSaved')); admSettings();
  };
  $('#shCopy').onclick = async () => {
    try { await navigator.clipboard.writeText($('#shLink').value); } catch (e) { $('#shLink').select(); document.execCommand('copy'); }
    toast(t('copied'));
  };
  $('#shInstall').onclick = async () => {
    if (window.__installEvt) {
      window.__installEvt.prompt();
      const r = await window.__installEvt.userChoice;
      if (r.outcome === 'accepted') { toast(t('installed')); window.__installEvt = null; }
    } else toast(t('installIos'));
  };
  $('#tutAgain').onclick = () => {
    DB.settings.tutorialAdm = true; DB.settings.tutorialClient = true; save();
    go('/adm/today');
  };
  $('#reset').onclick = () => { if (confirm(t('resetWarn'))) { resetDemo(); route(); } };
}

route();


/* =====================================================
   AGENDA — o mês da Melissa
===================================================== */
function admAgenda() {
  const cur = admAgenda._m || isoToday().slice(0, 7);
  const [Y, M] = cur.split('-').map(Number);
  const first = `${cur}-01`;
  const daysIn = new Date(Y, M, 0).getDate();
  const last = `${cur}-${String(daysIn).padStart(2, '0')}`;
  const startWd = (new Date(first + 'T12:00:00').getDay() + 6) % 7; // segunda = 0

  /* todas as saídas do mês, de todos os passeios */
  const deps = [];
  for (const x of Tours.all()) {
    for (const d of Cal.departures(x.id, first, last)) {
      const left = Cal.seatsLeft(x.id, d.date, d.time, d.capacity);
      deps.push({ ...d, tour: x, left, booked: d.capacity - left });
    }
  }
  const byDay = {};
  deps.forEach(d => (byDay[d.date] = byDay[d.date] || []).push(d));

  const sel = admAgenda._d && byDay[admAgenda._d] ? admAgenda._d
            : (Object.keys(byDay).sort()[0] || isoToday());
  const WD = LANG === 'pt' ? ['seg','ter','qua','qui','sex','sáb','dom'] : ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const MN = LANG === 'pt'
    ? ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
    : ['January','February','March','April','May','June','July','August','September','October','November','December'];

  let cells = '';
  for (let i = 0; i < startWd; i++) cells += '<span class="agc empty"></span>';
  for (let d = 1; d <= daysIn; d++) {
    const iso = `${cur}-${String(d).padStart(2, '0')}`;
    const list = byDay[iso] || [];
    const isToday = iso === isoToday();
    const dots = list.slice(0, 4).map(x =>
      `<i class="${x.left === 0 ? 'full' : x.left <= 2 ? 'low' : ''}"></i>`).join('');
    cells += `<button class="agc ${list.length ? 'has' : ''} ${iso === sel ? 'on' : ''} ${isToday ? 'today' : ''}" data-d="${iso}">
      <b>${d}</b>${list.length ? `<span class="agdots">${dots}</span>` : ''}</button>`;
  }

  const selList = (byDay[sel] || []).sort((a, b) => a.time.localeCompare(b.time));

  admShell('agenda', `
    <div class="pagehead"><h1 class="pageh">${t('agTitle')}</h1>
      <div class="chips">
        <button class="mini" id="agPrev">←</button>
        <button class="chip on">${MN[M - 1]} ${Y}</button>
        <button class="mini" id="agNext">→</button>
        <button class="mini" id="agNow">${t('agToday')}</button>
      </div></div>
    <div class="two-col">
      <section class="card">
        <div class="agrid head">${WD.map(w => `<span class="agwd">${w}</span>`).join('')}</div>
        <div class="agrid" id="agGrid">${cells}</div>
        <p class="why">${t('agLegend')}</p>
      </section>
      <section class="card">
        <h3>${t('agDayOf', { d: fmtDate(sel) })}</h3>
        ${selList.length ? selList.map(d => {
          const bs = DB.bookings.filter(b => b.tourId === d.tour.id && b.date === d.date
                                        && b.time === d.time && b.status !== 'cancelled');
          return `<div class="deprow">
            <div class="tinfo"><b>${d.time} · ${esc(d.tour.name[LANG] || d.tour.name.pt)}</b>
              <small>${t('agBooked', { n: d.booked })} · ${t('agFree', { n: d.left })}</small></div>
            ${bs.length ? `<div class="paxlist">${bs.map(b =>
              `<span class="pill ${Bookings.due(b) > 0 ? 'warn' : 'ok'}">${esc(b.name.split(' ')[0])} ×${b.pax}</span>`).join('')}</div>` : ''}
          </div>`;
        }).join('') : `<p class="empty">${t('agNoDep')}</p>`}
      </section>
    </div>`);

  const shift = (n) => {
    const d = new Date(Y, M - 1 + n, 1);
    admAgenda._m = d.toISOString().slice(0, 7); admAgenda._d = null; admAgenda();
  };
  $('#agPrev').onclick = () => shift(-1);
  $('#agNext').onclick = () => shift(1);
  $('#agNow').onclick = () => { admAgenda._m = isoToday().slice(0, 7); admAgenda._d = isoToday(); admAgenda(); };
  $$('#agGrid .agc[data-d]').forEach(c => c.onclick = () => { admAgenda._d = c.dataset.d; admAgenda(); });
}

/* =====================================================
   RELATÓRIOS — como foi o período
===================================================== */
function admReports() {
  const mode = admReports._m || 'month';
  const today = isoToday();
  const from = mode === 'week' ? addDays(today, -7) : today.slice(0, 8) + '01';
  const T = Reports.totals(from, today);
  const tours = Reports.byTour(from, today);
  const origins = Reports.byOrigin(from, today);
  const series = mode === 'week' ? Reports.byWeek(8)
    : Reports.byMonth(+today.slice(0, 4)).map((v, i) => ({
        label: (LANG === 'pt' ? ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
                              : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])[i],
        value: v }));
  const OLBL = { site: 'oSite', instagram: 'oInsta', whatsapp: 'oWhats', agency: 'oAgency', friend: 'oFriend' };

  admShell('reports', `
    <div class="pagehead"><h1 class="pageh">${t('rpTitle')}</h1>
      <div class="chips">
        <button class="chip ${mode === 'week' ? 'on' : ''}" id="rW">${t('thisWeek')}</button>
        <button class="chip ${mode === 'month' ? 'on' : ''}" id="rM">${t('thisMonth')}</button>
      </div></div>

    <div class="kpis">
      <div class="kpi"><small>${t('rpRevenue')}</small><b>${eur(T.revenue)}</b></div>
      <div class="kpi"><small>${t('rpDeps')}</small><b>${T.deps}</b></div>
      <div class="kpi"><small>${t('rpPax')}</small><b>${T.pax}</b></div>
      <div class="kpi"><small>${t('rpTicket')}</small><b>${eur(T.ticket)}</b></div>
      <div class="kpi ${T.due > 0 ? 'warn' : ''}"><small>${t('rpDue')}</small><b>${eur(T.due)}</b></div>
    </div>

    <section class="card">
      <h3>${mode === 'week' ? t('rpByWeek') : t('rpByMonth')}</h3>
      <div class="chartbox"><canvas id="repChart"></canvas></div>
    </section>

    <div class="two-col">
      <section class="card">
        <h3>${t('rpByTour')}</h3>
        ${tours.length ? `<table class="tbl"><thead><tr>${t('rpTourCols').map(c => `<th>${c}</th>`).join('')}</tr></thead>
        <tbody>${tours.map(r => `<tr>
          <td>${esc(r.tour.name[LANG] || r.tour.name.pt)}</td>
          <td class="mono">${r.departures}</td><td class="mono">${r.pax}</td>
          <td><span class="occ"><i style="width:${Math.min(100, r.occupancy)}%"></i></span> ${r.occupancy}%</td>
          <td class="mono right">${eur(r.revenue)}</td></tr>`).join('')}</tbody></table>`
        : `<p class="empty">${t('rpEmpty')}</p>`}
      </section>
      <section class="card">
        <h3>${t('rpOrigin')}</h3>
        <p class="why">${t('rpOriginHelp')}</p>
        ${origins.length ? origins.map(o => `<div class="orow">
          <span class="onm">${t(OLBL[o.origin] || 'oSite')}</span>
          <span class="obar"><i style="width:${o.pct}%"></i></span>
          <span class="mono">${o.pct}%</span></div>`).join('')
        : `<p class="empty">${t('rpEmpty')}</p>`}
      </section>
    </div>`);

  $('#rW').onclick = () => { admReports._m = 'week'; admReports(); };
  $('#rM').onclick = () => { admReports._m = 'month'; admReports(); };
  drawBars($('#repChart'), series, mode === 'week' ? series.length - 1 : +today.slice(5, 7) - 1);
}

/* gráfico de barras — sem biblioteca, nas cores da marca */
function drawBars(cv, series, hi) {
  if (!cv) return;
  const draw = () => {
    const r = cv.getBoundingClientRect(); if (!r.width) return;
    const dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = r.width * dpr; cv.height = r.height * dpr;
    const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
    const W = r.width, H = r.height, pL = 8, pR = 8, pT = 20, pB = 26;
    const w = W - pL - pR, h = H - pT - pB;
    const max = Math.max(1, ...series.map(s => s.value)) * 1.15;
    c.clearRect(0, 0, W, H);
    c.strokeStyle = css('--line'); c.lineWidth = 1; c.setLineDash([3, 4]);
    for (let i = 0; i <= 3; i++) { const y = pT + h * (i / 3); c.beginPath(); c.moveTo(pL, y); c.lineTo(W - pR, y); c.stroke(); }
    c.setLineDash([]);
    const n = series.length, gap = w / n * 0.36, bw = w / n - gap;
    const last = (hi === undefined ? n - 1 : hi);
    series.forEach((s, i) => {
      const bh = (s.value / max) * h, x = pL + i * (bw + gap) + gap / 2, y = pT + h - bh;
      c.fillStyle = i === last ? css('--brand-amarelo') : css('--accent');
      c.globalAlpha = i === last ? 1 : 0.85;
      c.beginPath(); c.roundRect(x, y, bw, Math.max(bh, 1), [4, 4, 0, 0]); c.fill();
      c.globalAlpha = 1;
      c.fillStyle = css('--ink-3'); c.font = '10px ui-monospace, monospace'; c.textAlign = 'center';
      c.fillText(s.label, x + bw / 2, pT + h + 9);
      if (i === last && s.value > 0) {
        c.fillStyle = css('--ink'); c.font = '600 12px system-ui';
        c.fillText('€ ' + Math.round(s.value), x + bw / 2, y - 7);
      }
    });
    c.textAlign = 'left';
  };
  draw(); setTimeout(draw, 60);
}

/* =====================================================
   CLIENTES — a base que nasce sozinha
===================================================== */
function admClients() {
  const list = Clients.all();
  const total = list.reduce((s, c) => s + c.spent, 0);
  const cols = t('clCols');
  admShell('clients', `
    <div class="pagehead"><h1 class="pageh">${t('clTitle')}</h1>
      <div class="chips">
        <span class="chip on">${t('clTotal', { n: list.length, v: eur(total) })}</span>
        <button class="mini" id="clCsv">${t('clDlCsv')}</button>
      </div></div>
    <section class="card">
      ${list.length ? `<table class="tbl"><thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
      <tbody>${list.map(c => `<tr>
        <td><b>${esc(c.name)}</b><br><small class="mono">${esc(c.email || '')}</small></td>
        <td>${c.tours > 1 ? `<span class="pill ok">${t('clRepeat', { n: c.tours })}</span>`
                          : `<span class="pill">${t('clNew')}</span>`}</td>
        <td class="mono right">${eur(c.spent)}</td>
        <td class="mono">${c.last ? fmtDate(c.last) : '—'}</td>
        <td class="tacts">
          ${c.whats ? `<a class="mini" target="_blank" rel="noopener"
            href="${waLink(t('waHi', { name: c.name.split(' ')[0], tour: '', when: '' }), c.whats.replace(/\D/g, ''))}">✆</a>` : ''}
          ${c.email ? `<a class="mini" href="mailto:${esc(c.email)}">✉</a>` : ''}
          ${c.insta ? `<a class="mini" target="_blank" rel="noopener" href="https://instagram.com/${esc(c.insta.replace(/^@/, ''))}">◎</a>` : ''}
        </td></tr>`).join('')}</tbody></table>`
      : `<p class="empty">${t('clEmpty')}</p>`}
    </section>`);
  $('#clCsv').onclick = () => {
    const csv = [cols.join(';')].concat(list.map(c =>
      [c.name, c.email, c.whats, c.insta || '', c.tours, c.spent, c.last].join(';'))).join('\n');
    const a2 = document.createElement('a');
    a2.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }));
    a2.download = 'clientes.csv'; a2.click();
  };
}

/* ---------- nuvem ---------- */
cloudStart((r) => {
  if (r.bootstrap) return;
  if (r.fresh && r.fresh.length && location.hash.startsWith('#/adm')) {
    const b = r.fresh[r.fresh.length - 1];
    toast((LANG === 'pt' ? '🎉 Nova reserva: ' : '🎉 New booking: ') + b.name + ' · ' + eur(b.total));
  }
  /* re-render seguro: nunca no meio de um formulário de reserva */
  const h = location.hash;
  const inCheckout = h.startsWith('#/tour/') && viewTour._s && viewTour._s.step > 1;
  if (!inCheckout && !document.querySelector('.coach')) route();
});
