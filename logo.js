/* =====================================================
   VOYAGES & IMAGES — marca
   Reconstrução vetorial do símbolo do logotipo:
   o colombage alsaciano (duas vigas + X + travessa),
   nas cores oficiais. Substituir pelo SVG original
   quando a Melissa enviar o arquivo.
   ===================================================== */
'use strict';

/* símbolo sozinho — para ícones, selos, avatar */
function logoMark(size = 32, color = '#d9aa0e') {
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" fill="none"
    stroke="${color}" stroke-width="9" stroke-linecap="square" aria-hidden="true">
    <path d="M31 44 L69 6"/><path d="M69 44 L31 6"/>
    <path d="M31 6 L31 94"/><path d="M69 6 L69 94"/>
    <path d="M31 62 L69 62"/>
  </svg>`;
}

/* símbolo + palavra — para cabeçalhos */
function logoFull(opts = {}) {
  const { mark = 30, color = 'var(--brand-amarelo)', ink = 'var(--ink)', sub = '' } = opts;
  return `<span class="vi-logo">
    <span class="vi-mark">${logoMark(mark, color)}</span>
    <span class="vi-word">
      <b>VOYAGES<br>&amp; IMAGES</b>
      ${sub ? `<small>${sub}</small>` : ''}
    </span>
  </span>`;
}
