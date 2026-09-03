/* O cartão de Ajustes que mostra à Melissa o e-mail que o cliente recebe.

   Regra dela (03/09/2026): o cliente recebe UMA mensagem, e só quando pagou.
   Não existe mais recibo automático nem botão "Avisar cliente". Este teste
   garante que:
   - o cartão da confirmação tem os quatro campos que ela edita;
   - os pedaços fixos (dados da reserva, nota do saldo) aparecem como TEXTO,
     não como campo — para ela não apagar sem perceber;
   - o cartão da cobrança do saldo existe e não tem campo nenhum;
   - o que ela escreveu aparece no campo, escapado;
   - nada no app fala mais em recibo ou em avisar cliente. */
const fs = require('fs'), assert = require('assert');
const SERVE = [__dirname + '/..', __dirname + '/../serve'].find(d => fs.existsSync(d + '/app.js'));
const src = fs.readFileSync(SERVE + '/app.js', 'utf8');
const i18n = fs.readFileSync(SERVE + '/i18n.js', 'utf8');

const ini = src.indexOf('function cartaoEmail'), fim = src.indexOf('function admSettings', ini);
assert.ok(ini > 0 && fim > ini, 'nao achei cartaoEmail no app.js');

const mi = i18n.indexOf('const STR'), mf = i18n.indexOf('function t(', mi);
assert.ok(mi >= 0 && mf > mi, 'nao achei o dicionario no i18n.js');
eval(i18n.slice(mi, mf).replace('const STR', 'globalThis.STR'));
assert.ok(globalThis.STR && STR.emConfTit, 'o dicionario nao carregou');
global.LANG = 'pt';
global.esc = (v) => String(v == null ? '' : v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
global.t = (k) => {
  const v = (typeof STR !== 'undefined' && STR[k]) || null;
  return v ? (v.pt || v.en || k) : k;
};
global.DB = { settings: {} };
eval(src.slice(ini, fim));

let falhas = 0;
const ok = (nome, cond, det) => {
  if (cond) console.log('  ok   ' + nome);
  else { falhas++; console.log('  FALHA ' + nome + (det ? ' — ' + det : '')); }
};

console.log('cartao do e-mail de confirmacao');
const cnf = cartaoEmail();
for (const id of ['confIntroPt', 'confIntroEn', 'confPsPt', 'confPsEn'])
  ok('tem o campo ' + id, cnf.includes('id="' + id + '"'));
ok('nao tem campo de recibo', !/recibo/i.test(cnf));
ok('mostra que leva os dados da reserva (como texto)', cnf.includes('<p class="emfixo">' + t('emDados')));
ok('mostra a nota do saldo (como texto)', cnf.includes('<p class="emfixo">' + t('emSaldoNota')));
ok('diz quando sai: quando o pagamento entra', cnf.includes(t('emConfQuando')));
ok('so quatro campos editaveis', (cnf.match(/<textarea/g) || []).length === 4);

console.log('cartao da cobranca do saldo');
const sal = cartaoSaldo();
ok('existe e diz 30 dias antes', sal.includes(t('emSaldoTit')) && /30 dias/.test(t('emSaldoTit')));
ok('NAO tem campo editavel', !/<(textarea|input)/.test(sal), 'e um e-mail de conta, nao de conversa');

console.log('o que ela escreveu');
DB.settings.emailConfIntro = { pt: 'Oi <b>voce</b>!', en: 'Hi!' };
DB.settings.emailConfPS = { pt: 'Leve casaco', en: 'Bring a coat' };
const comTexto = cartaoEmail();
ok('abertura dela aparece no campo', comTexto.includes('Oi &lt;b&gt;voce&lt;/b&gt;!'));
ok('recado dela aparece no campo', comTexto.includes('>Leve casaco<'));
ok('texto dela vai escapado', !comTexto.includes('<b>voce</b>'));

console.log('o fluxo antigo sumiu de vez');
ok('app nao tem mais botao "avisar cliente"', !src.includes('data-conf') && !src.includes('confirmarCliente'));
ok('app nao monta mais cartao de recibo', !src.includes("cartaoEmail('recibo'"));
ok('app nao salva mais texto de recibo', !src.includes('emailRecibo'));
ok('dicionario nao tem mais a frase do recibo', !STR.emAviso && !STR.emPix && !STR.confCliente);
ok('etiqueta da reserva usa a regra "metade paga"', /titulo: Bookings\.garantida\(b\)/.test(src));

console.log(falhas ? `\n${falhas} FALHA(S)` : '\ntudo passou');
process.exit(falhas ? 1 : 0);
