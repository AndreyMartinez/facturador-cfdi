import { useEffect, useMemo, useState } from 'preact/hooks';
import { html } from '../html.js';
import { useDatos } from '../estado.js';
import { obtenerAlmacen, descargar, reintentar } from '../servicios.js';
import { Marco } from '../componentes/marco.js';
import { Pasos, Aviso, Nota, EstadoFactura, fechaCorta } from '../componentes/comunes.js';

const PASOS = [
  ['sellada', 'Sellada en tu navegador', 'RSA-SHA256 con el CSD'],
  ['timbrada', 'Timbrada por el PAC', 'UUID asignado'],
  ['guardada', 'Guardada en este equipo', 'XML y PDF'],
  ['entregada', 'Entregada', ''],
];

/** @param {{ id: string }} p */
export function Factura({ id }) {
  const { datos: f, error } = useDatos(() => obtenerAlmacen().facturas.obtener(id), [id]);
  const [errorAccion, setErrorAccion] = useState(/** @type {any} */ (null));
  const urlPdf = useMemo(() => (f?.pdf ? URL.createObjectURL(new Blob([f.pdf], { type: 'application/pdf' })) : ''), [f?.pdf]);
  useEffect(() => () => { if (urlPdf) URL.revokeObjectURL(urlPdf); }, [urlPdf]);

  const nombre = f ? `${f.comprobante.emisor.rfc}_${f.serie}${f.folio}_${f.uuid ?? 'sin-timbre'}` : '';
  const migas = html`Facturas / <b>${f ? `${f.serie}-${f.folio}` : '…'}</b>`;
  if (error || !f) return html`<${Marco} activa="emitidas" migas=${migas}>${error ? html`<${Aviso} error=${error} />` : html`<p class="muted">Cargando…</p>`}<//>`;

  const estados = new Set(f.eventos.map((/** @type {any} */ e) => e.estado));
  const hecho = (/** @type {string} */ p) => p === 'guardada' ? Boolean(f.pdf) : estados.has(p);
  const ultimo = f.eventos.at(-1);
  const entregaDetalle = f.estado === 'entregada' && ultimo?.detalle ? 'No aplica para esta fuente' : f.estado === 'error_entrega' ? ultimo?.detalle : '';

  const facturaId = f.id;
  async function accion() {
    setErrorAccion(null);
    try { await reintentar(facturaId); } catch (e) { setErrorAccion(e); }
  }

  return html`<${Marco} activa="emitidas" migas=${migas}>
    <${Pasos} paso=${f.estado === 'entregada' ? 5 : f.uuid ? 4 : 3} />
    <div class="ph"><div><h1>Factura ${f.serie}-${f.folio} ${f.uuid ? 'timbrada' : ''}</h1>
      <p class="mono">${f.uuid ? `UUID ${f.uuid}` : 'Todavía sin timbre'}</p></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <a class="btn" href="#/nueva">Facturar otra</a>
        ${f.xmlTimbrado && html`<button class="btn" onClick=${() => descargar(`${nombre}.xml`, f.xmlTimbrado, 'application/xml')}>Descargar XML</button>`}
        ${f.pdf && html`<button class="btn pri" onClick=${() => descargar(`${nombre}.pdf`, f.pdf, 'application/pdf')}>Descargar PDF</button>`}
      </div></div>
    ${f.ambiente === 'sandbox' && html`<${Nota} tipo="sb">Factura de demostración: <b>sin validez fiscal</b>.${/SIMULADO/.test(f.xmlTimbrado ?? '') ? ' El timbre es simulado; no se envió al SAT.' : ''}<//>`}
    ${f.estado === 'rechazada' && html`<${Nota} tipo="bad"><b>El PAC rechazó la factura.</b> ${ultimo?.detalle} Corrige el dato y vuelve a facturar la venta.<//>`}
    ${['timbrando', 'error_entrega'].includes(f.estado) && html`<${Nota} tipo="warn">
      <b>${f.estado === 'timbrando' ? 'El timbrado quedó pendiente.' : 'La entrega falló.'}</b> Reintentar es seguro: no se timbrará dos veces.
      <button class="btn sm" style="margin-left:6px" onClick=${accion}>Reintentar</button><//>`}
    <${Aviso} error=${errorAccion} />
    <div class="g2">
      <div class="col">
        <section class="card"><div class="card-h"><h2>Progreso</h2><${EstadoFactura} estado=${f.estado} /></div><div class="card-b"><div class="timeline">
          ${PASOS.map(([clave, titulo, sub]) => {
            const ok = clave === 'entregada' ? f.estado === 'entregada' : hecho(clave);
            const evento = f.eventos.find((/** @type {any} */ e) => e.estado === clave);
            return html`<div class="tl ${ok ? '' : f.estado === 'rechazada' && clave === 'timbrada' ? 'bad' : 'pend'}"><b>${ok ? '✓' : '–'}</b>
              <div>${titulo}<small>${clave === 'entregada' ? entregaDetalle || sub : evento ? `${fechaCorta(evento.fecha)} · ${sub}` : sub}</small></div></div>`;
          })}
        </div></div></section>
        <section class="card"><div class="card-h"><h2>XML ${f.xmlTimbrado ? 'timbrado' : 'sellado'}</h2>
          <button class="linkbtn" onClick=${() => navigator.clipboard?.writeText(f.xmlTimbrado ?? f.xmlSellado)}>Copiar</button></div>
          <div class="card-b" style="padding:12px"><pre class="code">${(f.xmlTimbrado ?? f.xmlSellado).replace(/></g, '>\n<')}</pre></div></section>
      </div>
      <section class="card"><div class="card-h"><h2>Representación impresa</h2></div><div class="card-b" style="padding:12px">
        ${urlPdf ? html`<iframe class="pdf-vista" src=${urlPdf} title="PDF de la factura"></iframe>` : html`<p class="muted">El PDF se genera al timbrar.</p>`}
      </div></section>
    </div>
  <//>`;
}
