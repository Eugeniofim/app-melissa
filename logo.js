/* =====================================================
   VOYAGES & IMAGES — marca
   Símbolo redesenhado a partir do logotipo original:
   colombage alsaciano — duas vigas, o X e a travessa.
   Proporção real: 272 × 485, viga de 27.
   ===================================================== */
'use strict';

const LOGO_VB = { w: 272, h: 485 };

/* símbolo — para ícones, selos e a abertura */
function logoMark(height = 40, color = '#FFD23F', opts = {}) {
  const w = Math.round(height * LOGO_VB.w / LOGO_VB.h);
  const cls = opts.cls ? ` class="${opts.cls}"` : '';
  return `<svg${cls} viewBox="0 0 272 485" width="${w}" height="${height}"
    fill="none" stroke="${color}" stroke-width="27" stroke-linecap="butt" aria-hidden="true">
    <path class="lg-x1" d="M13.5 0 L258.5 230"/>
    <path class="lg-x2" d="M258.5 0 L13.5 230"/>
    <path class="lg-v1" d="M13.5 0 L13.5 485"/>
    <path class="lg-v2" d="M258.5 0 L258.5 485"/>
    <path class="lg-h"  d="M13.5 278 L258.5 278"/>
  </svg>`;
}

/* símbolo + palavra — cabeçalhos */
function logoFull(opts = {}) {
  const { mark = 30, color = 'var(--brand-amarelo)', sub = '' } = opts;
  return `<span class="vi-logo">
    <span class="vi-mark">${logoMark(mark, color)}</span>
    <span class="vi-word">
      <b>VOYAGES<br>&amp; IMAGES</b>
      ${sub ? `<small>${sub}</small>` : ''}
    </span>
  </span>`;
}

/* logotipo completo, empilhado — abertura do app */
function logoLockup(markHeight = 150) {
  return `<div class="lockup">
    <div class="lk-mark">${logoMark(markHeight, 'var(--brand-amarelo)', { cls: 'lg-draw' })}</div>
    <div class="lk-word">VOYAGES<br>&amp; IMAGES</div>
    <div class="lk-role">GUIDE &amp; PHOTOGRAPHER</div>
    <div class="lk-region">ALSACE <span>|</span> BLACK FOREST</div>
    <div class="lk-lang">PT <span>|</span> EN</div>
  </div>`;
}
