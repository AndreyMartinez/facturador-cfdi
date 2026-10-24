import { useState } from 'preact/hooks';
import { zipSync } from 'fflate';
import { html } from '../html.js';
import { useEstado, useDatos } from '../estado.js';
import { obtenerAlmacen, descargar } from '../servicios.js';
import { Marco } from '../componentes/marco.js';
import { Aviso, EstadoFactura, dinero, fechaCorta } from '../componentes/comunes.js';

const FILTROS = [
  ['todas', 'Todas', () => true],
  ['pendientes', 'Pendientes', (/** @type {any} */ f) => ['timbrando', 'error_entrega', 'sellada'].includes(f.estado)],
  ['rechazadas', 'Rechazadas', (/** @type {any} */ f) => f.estado === 'rechazada'],
];

export function Emitidas() {
  const { emisor } = useEstado();
  const [filtro, setFiltro] = useState('todas');
  const { datos: facturas, error } = useDatos(() => obtenerAlmacen().facturas.deEmisor(/** @type {string} */ (emisor?.id)), [emisor?.id]);
  const lista = (facturas ?? []).filter(/** @type {any} */ (FILTROS.find(([k]) => k === filtro)?.[2]));

  function exportar() {
    const enc = new TextEncoder();
    /** @type {Record<string, Uint8Array>} */
    const archivos = {};
    for (const f of facturas ?? []) {
      if (!f.uuid) continue;
      const base = `${f.ambiente}/${f.serie}${f.folio}_${f.uuid}`;
      archivos[`${base}.xml`] = enc.encode(f.xmlTimbrado);
      if (f.pdf) archivos[`${base}.pdf`] = new Uint8Array(f.pdf);
    }
    const hoy = new Date().toISOString().slice(0, 10);
    descargar(`facturas_${emisor?.rfc}_${hoy}.zip`, zipSync(archivos), 'application/zip');
  }

  return html`<${Marco} activa="emitidas" migas=${html`<b>Emitidas</b>`}>
    <div class="ph"><div><h1>Facturas emitidas</h1><p>Guardadas en este equipo. Exporta un respaldo con frecuencia.</p></div>
      <button class="btn" onClick=${exportar} disabled=${!facturas?.some((f) => f.uuid)}>⇩ Exportar respaldo (.zip)</button></div>
    <${Aviso} error=${error} />
    <div class="seg" role="tablist">${FILTROS.map(([k, t, fn]) => html`<button role="tab" aria-selected=${filtro === k} class=${filtro === k ? 'on' : ''} onClick=${() => setFiltro(/** @type {string} */ (k))}>
      ${t} · ${(facturas ?? []).filter(/** @type {any} */ (fn)).length}</button>`)}</div>
    <div class="card"><div class="tabla"><table>
      <thead><tr><th>Folio</th><th class="hide-m">Fecha</th><th>Receptor</th><th class="hide-m">UUID</th><th class="n">Total</th><th>Estado</th></tr></thead>
      <tbody>
        ${lista.map((f) => html`<tr>
          <td><a href="#/factura/${f.id}"><strong>${f.serie}-${f.folio}</strong></a></td>
          <td class="hide-m muted">${fechaCorta(f.creada)}</td>
          <td>${f.comprobante.receptor.nombre}<br /><span class="mono muted">${f.comprobante.receptor.rfc}</span></td>
          <td class="mono hide-m muted">${f.uuid ? `${f.uuid.slice(0, 8)}…` : '—'}</td>
          <td class="n">${dinero(f.comprobante.total)}</td>
          <td><${EstadoFactura} estado=${f.estado} /> ${f.ambiente === 'sandbox' && html`<span class="badge sb">Sandbox</span>`}</td>
        </tr>`)}
      </tbody>
    </table>${!lista.length && html`<div class="vacio">${facturas?.length ? 'Nada en este filtro.' : html`Todavía no hay facturas. <a href="#/nueva">Crea la primera</a>.`}</div>`}</div></div>
  <//>`;
}
