import { html } from '../html.js';
import { useEstado } from '../estado.js';
import { Ambiente } from './comunes.js';

const MENU = [
  { ruta: 'panel', texto: 'Panel', icono: '▦' },
  { ruta: 'nueva', texto: 'Nueva factura', icono: '＋' },
  { ruta: 'emitidas', texto: 'Emitidas', icono: '≡' },
];

/** @param {{ activa: string, migas: any, children: any }} p */
export function Marco({ activa, migas, children }) {
  const { emisor, modoPac } = useEstado();
  const iniciales = (emisor?.nombre ?? '?').split(/\s+/).slice(0, 2).map((p) => p[0]).join('');
  const enlace = (/** @type {string} */ r, /** @type {string} */ t, /** @type {string} */ i) => html`<a class="nav ${activa === r ? 'on' : ''}" href="#/${r}" aria-current=${activa === r ? 'page' : undefined}><span aria-hidden="true">${i}</span>${t}</a>`;
  return html`<div class="shell">
    <aside class="side" aria-label="Menú">
      <a class="brandmark" href="#/"><i>F</i>Facturalow</a>
      ${MENU.map((m) => enlace(m.ruta, m.texto, m.icono))}
      <div class="nav-l">Integraciones</div>
      <span class="nav off" title="Fase B">◍ MercadoLibre</span>
      <div class="nav-l">Cuenta</div>
      ${enlace('emisor', 'Emisor y CSD', '✦')}
      <span class="sp"></span>
      <a class="org" href="#/emisor"><span class="av">${iniciales}</span><div>${emisor?.nombre}<small>${emisor?.rfc}</small></div></a>
    </aside>
    <div class="main">
      <header class="topbar"><span class="crumb">${migas}</span><span class="sp"></span><${Ambiente} modo=${modoPac} /></header>
      <main class="content">${children}</main>
    </div>
    <nav class="bottom-nav" aria-label="Menú">
      ${[...MENU, { ruta: 'emisor', texto: 'Emisor', icono: '⚙' }].map((m) => html`
        <a href="#/${m.ruta}" class=${activa === m.ruta ? 'on' : ''}><span aria-hidden="true">${m.icono}</span>${m.texto}</a>`)}
    </nav>
  </div>`;
}
