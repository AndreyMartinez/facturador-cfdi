import { render } from 'preact';
import { html } from './html.js';
import './estilos.css';
import { useEstado } from './estado.js';
import { iniciar } from './servicios.js';
import { resolver, escucharRutas } from './rutas.js';
import { Aviso } from './componentes/comunes.js';
import { Portada } from './vistas/portada.js';
import { Panel } from './vistas/panel.js';
import { Nueva } from './vistas/nueva.js';
import { Revisar } from './vistas/revisar.js';
import { Factura } from './vistas/factura.js';
import { Emitidas } from './vistas/emitidas.js';
import { Emisor } from './vistas/emisor.js';

function App() {
  const { listo, ruta, error } = useEstado();
  if (!listo) return html`<div class="cargando">${error ? html`<${Aviso} error=${error} />` : 'Preparando la demo…'}</div>`;
  const { nombre, params } = resolver(ruta);
  switch (nombre) {
    case 'panel': return html`<${Panel} />`;
    case 'nueva': return html`<${Nueva} />`;
    case 'revisar': return html`<${Revisar} fuente=${params[0]} id=${params[1]} />`;
    case 'factura': return html`<${Factura} id=${params[0]} />`;
    case 'emitidas': return html`<${Emitidas} />`;
    case 'emisor': return html`<${Emisor} />`;
    default: return html`<${Portada} />`;
  }
}

escucharRutas();
render(html`<${App} />`, /** @type {HTMLElement} */ (document.getElementById('app')));
iniciar().catch((e) => console.error(e));
