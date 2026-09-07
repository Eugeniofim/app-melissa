/* O código Pix TEM que levar o valor.

   07/09/2026: a primeira cliente de verdade da Melissa, a Amanda, colou o
   copia-e-cola no banco e o banco pediu o valor. Ninguém sabia qual era —
   nem a cliente, nem a Melissa. A venda travou.

   A causa foi um pedido do dia 03/09 ("tirar a cotação"), que eu implementei
   ao pé da letra: o código passou a sair sem valor. Só que o que a incomodou
   não era a cotação — era o que estava em cima dela: 4% de margem mais
   arredondamento de 5 em 5 faziam o app dizer R$ 705 onde o banco dela dava
   R$ 669. Com a cotação limpa, € 113 dá R$ 673.

   Então: o valor volta para dentro do código, a margem nasce zero, e não há
   arredondamento. Sem cotação, o código sai sem valor E a tela diz isso. */
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const SERVE = [__dirname + '/..', __dirname + '/../serve'].find(d => fs.existsSync(d + '/pix.js'));
const app = fs.readFileSync(SERVE + '/app.js', 'utf8');
let falhas = 0;
const t = (nome, cond, det) => {
  if (cond) console.log('  ok   ' + nome);
  else { falhas++; console.log('  FALHA ' + nome + (det ? ' — ' + det : '')); }
};

/* mundo mínimo: fx + pix, com a cotação que quisermos */
function mundo({ taxa = 5.9576, fxTaxa = '', fxMargem = 0 } = {}) {
  const ctx = { console, JSON, Date, Math, Number, String, Object, Array, AbortController, setTimeout, clearTimeout,
    localStorage: { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } } };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(SERVE + '/fx.js', 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(SERVE + '/pix.js', 'utf8'), ctx);
  vm.runInContext(`DB = { settings: { pixKey: '58.728.880/0001-05', pixName: 'MELISSA HALLAIS',
    pixCity: 'CURITIBA', fxTaxa: ${JSON.stringify(fxTaxa)}, fxMargem: ${fxMargem} } };`, ctx);
  if (taxa) vm.runInContext(`fxMem = { taxa: ${taxa}, em: Date.now(), fonte: 'teste' };`, ctx);
  return ctx;
}
const val = (c, eur) => vm.runInContext(`emReais(${eur})`, c);
const codigo = (c, eur) => vm.runInContext(
  `pixCopiaECola({ chave: DB.settings.pixKey, nome: pixNome(), cidade: pixCidade(), valor: pixValorEmReais(${eur}) || undefined, txid: 'VI-1234' })`, c);
/* campo 54 do BR Code = valor. "54" + tamanho(2) + numero */
const leValor = (cod) => { const m = cod.match(/54(\d\d)/); if (!m) return null;
  const n = +m[1]; return cod.slice(cod.indexOf('54' + m[1]) + 4, cod.indexOf('54' + m[1]) + 4 + n); };

console.log('a conta bate com o banco dela');

t('€ 113 dá R$ 673,21 (o banco dela deu ~669)', val(mundo(), 113) === 673.21, String(val(mundo(), 113)));
t('a margem nasce ZERO', vm.runInContext('DB.settings.fxMargem', mundo()) === 0);
t('não arredonda de 5 em 5 (era isso que fazia 705)',
   String(val(mundo(), 113)).indexOf('705') === -1);
t('€ 195 dá R$ 1.161,73', val(mundo(), 195) === 1161.73, String(val(mundo(), 195)));
t('sinal de € 97,50 dá R$ 580,87', val(mundo(), 97.5) === 580.87, String(val(mundo(), 97.5)));
t('com 4% de margem volta a subir (se ela quiser)',
   val(mundo({ fxMargem: 4 }), 113) === 700.14, String(val(mundo({ fxMargem: 4 }), 113)));
t('cotação fixada por ela manda na do dia',
   val(mundo({ fxTaxa: 6 }), 100) === 600, String(val(mundo({ fxTaxa: 6 }), 100)));

console.log('o valor entra no código Pix');

const c = mundo();
const cod = codigo(c, 195);
t('o código tem o campo de valor', /54\d\d/.test(cod), cod);
t('e o valor é o certo', leValor(cod) === '1161.73', String(leValor(cod)));
t('o código continua válido (chave e CRC)',
   cod.includes('br.gov.bcb.pix') && /6304[0-9A-F]{4}$/.test(cod), cod);
t('o identificador da reserva continua indo junto', cod.includes('VI1234'));

console.log('sem cotação, ninguém inventa número');

const semTaxa = mundo({ taxa: null });
t('sem cotação não há valor', val(semTaxa, 195) === null);
const codSem = codigo(semTaxa, 195);
t('o código sai sem o campo de valor', !/54\d\d\d+\.\d\d/.test(codSem), codSem);
t('e continua um código válido', codSem.includes('br.gov.bcb.pix') && /6304[0-9A-F]{4}$/.test(codSem));
t('a tela avisa que o código foi sem valor', /pixSemValor/.test(app),
   'sem isso a pessoa fica parada no banco, que foi o que aconteceu');
t('o painel avisa a Melissa também', /fxSemCotacao/.test(app));

console.log('a tela do cliente');
t('mostra o valor em real e o equivalente em euro',
   /t\('pixValor', \{ brl: brl\(brlValor\), eur: eur\(agora\) \}\)/.test(app));
t('o "não digita nada" só aparece quando o valor foi junto',
   /brlValor \? `<p class="why">\$\{t\('pixComo'\)\}<\/p>` : ''/.test(app));
t('o código é montado com o valor', /valor: brlValor \|\| undefined/.test(app));

console.log('de onde veio a cotação (a Melissa perguntou)');
t('a tela diz a fonte do câmbio', /pixFonte/.test(app),
   'ninguem aceita um valor em real sem saber de onde veio');
t('só credita o BCE quando a cotação é crua',
   /!\(\+st\.fxMargem\) && !\(typeof fxManual === 'function' && fxManual\(\)\)/.test(app),
   'com margem por cima nao da para dizer que o numero e do Banco Central Europeu');
t('a taxa mostrada é a que foi de fato usada',
   /taxa: \(brlValor \/ agora\)\.toFixed\(4\)/.test(app),
   'mostrar outra taxa faria o cliente refazer a conta e achar diferenca');
t('some junto com o valor quando não há cotação',
   /brlValor \? `<p class="why pixfonte">/.test(app));

console.log('o painel dela');
t('tem campo para fixar a cotação', /id="pgFxTaxa"/.test(app));
t('tem campo de margem', /id="pgMargem"/.test(app));
t('mostra a prévia antes de salvar', /id="fxPrevia"/.test(app) && /function fxResumo/.test(app));
t('a prévia acompanha o que ela digita', /\['#pgFxTaxa', '#pgMargem'\]\.forEach/.test(app));
t('a prévia não salva sozinha',
   /DB\.settings\.fxTaxa = antesTaxa; DB\.settings\.fxMargem = antesMargem;/.test(app));

console.log(falhas ? `\n${falhas} FALHA(S)` : '\ntudo passou');
process.exit(falhas ? 1 : 0);
