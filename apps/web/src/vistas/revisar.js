import { useState } from 'preact/hooks';
import { html } from '../html.js';
import { useEstado, useDatos } from '../estado.js';
import { buscarVenta, facturar } from '../servicios.js';
import { ir } from '../rutas.js';
import { crearBorrador, catalogos } from '@facturador/nucleo';
import { Marco } from '../componentes/marco.js';
import { Pasos, Aviso, Nota, dinero } from '../componentes/comunes.js';
import { FormReceptor, receptorVacio } from '../componentes/receptor.js';

/** @param {{ fuente: string, id: string }} p */
export function Revisar({ fuente, id }) {
  const { emisor, firmador, modoPac } = useEstado();
  const { datos: venta, error: errorVenta } = useDatos(() => buscarVenta(fuente, id), [fuente, id]);
  const [receptor, setReceptor] = useState(/** @type {import('@facturador/nucleo/puertos').DatosReceptor | undefined} */ (undefined));
  const [editando, setEditando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(/** @type {any} */ (null));

  const migas = html`Facturas / Nueva / <b>${fuente === 'ejemplo' ? 'Venta de ejemplo' : 'Venta capturada'}</b>`;
  if (errorVenta) return html`<${Marco} activa="nueva" migas=${migas}><${Aviso} error=${errorVenta} /><//>`;
  if (!venta || !emisor) return html`<${Marco} activa="nueva" migas=${migas}><p class="muted">Cargando venta…</p><//>`;

  /** @type {ReturnType<typeof crearBorrador> | null} */
  let borrador = null;
  let errorBorrador = null;
  try { borrador = crearBorrador(venta, emisor, { receptor }); } catch (e) { errorBorrador = e; }
  const c = borrador?.comprobante;
  const cuadra = c && c.total === venta.total;
  const puedeTimbrar = Boolean(borrador && !borrador.errores.length && cuadra && firmador && !enviando);

  async function timbrar() {
    setEnviando(true);
    setError(null);
    try {
      const f = await facturar(/** @type {any} */ (venta), receptor);
      ir(`#/factura/${f.id}`);
    } catch (e) {
      setError(e);
      setEnviando(false);
    }
  }

  const empezarEdicion = () => {
    const r = venta.receptor && venta.receptor.rfc !== 'XAXX010101000' ? venta.receptor : receptorVacio();
    setReceptor(receptor ?? r);
    setEditando(true);
  };

  return html`<${Marco} activa="nueva" migas=${migas}>
    <${Pasos} paso=${enviando ? 3 : 2} />
    <div class="ph"><div><h1>Revisa la factura</h1><p>Nada se timbra hasta que confirmes.</p></div></div>
    <${Aviso} error=${errorBorrador} />
    ${borrador?.avisos.map((a) => html`<${Nota} tipo="warn"><b>${a.mensaje}</b> Si te mandó su constancia, captura sus datos en «Receptor».<//>`)}
    ${!firmador && html`<${Nota} tipo="bad"><b>Falta el CSD del emisor.</b> <a href="#/emisor">Cárgalo en «Emisor y CSD»</a> para poder sellar.<//>`}

    ${c && html`<div class="split">
      <div class="col">
        <div class="g2">
          <section class="card"><div class="card-h"><h2>Emisor</h2>${firmador ? html`<span class="badge ok">CSD listo</span>` : html`<span class="badge bad">Sin CSD</span>`}</div><div class="card-b">
            <dl><dt>RFC</dt><dd class="mono">${c.emisor.rfc}</dd><dt>Nombre</dt><dd>${c.emisor.nombre}</dd>
              <dt>Régimen</dt><dd>${c.emisor.regimenFiscal} · ${catalogos.REGIMENES[c.emisor.regimenFiscal]?.descripcion}</dd><dt>Expedición</dt><dd class="mono">${c.lugarExpedicion}</dd></dl>
          </div></section>
          <section class="card"><div class="card-h"><h2>Receptor</h2>
            ${editando ? html`<button class="linkbtn" onClick=${() => { setEditando(false); setReceptor(undefined); }}>Usar el de la venta</button>`
              : html`<button class="linkbtn" onClick=${empezarEdicion}>Editar</button>`}</div><div class="card-b">
            ${editando ? html`<${FormReceptor} valor=${receptor ?? receptorVacio()} onCambio=${setReceptor} />` : html`
            <dl><dt>RFC</dt><dd class="mono">${c.receptor.rfc}</dd><dt>Nombre</dt><dd>${c.receptor.nombre}</dd>
              <dt>Régimen</dt><dd>${c.receptor.regimenFiscalReceptor} · ${catalogos.REGIMENES[c.receptor.regimenFiscalReceptor]?.descripcion}</dd>
              <dt>Uso CFDI</dt><dd>${c.receptor.usoCfdi} · ${catalogos.USOS_CFDI[c.receptor.usoCfdi]?.descripcion}</dd><dt>C.P.</dt><dd class="mono">${c.receptor.domicilioFiscalReceptor}</dd></dl>`}
          </div></section>
        </div>
        ${!editando && borrador?.errores.map((e) => html`<${Aviso} error=${e} />`)}
        <section class="card"><div class="card-h"><h2>Conceptos</h2><span class="muted" style="font-size:12.5px">${venta.fuente === 'ejemplo' ? 'Venta de ejemplo' : 'Captura manual'}</span></div>
          <div class="tabla"><table>
            <thead><tr><th>Descripción</th><th class="hide-m">Clave SAT</th><th class="n">Cant.</th><th class="n">Unitario</th><th class="n">Importe</th></tr></thead>
            <tbody>${c.conceptos.map((k) => html`<tr>
              <td><strong>${k.descripcion}</strong><br /><span class="muted" style="font-size:12px">${k.unidad ?? k.claveUnidad} · Objeto de impuesto ${k.objetoImp} · IVA 16 %</span></td>
              <td class="mono hide-m">${k.claveProdServ}</td><td class="n">${k.cantidad}</td><td class="n mono">${k.valorUnitario}</td><td class="n">${dinero(k.importe)}</td>
            </tr>`)}</tbody>
          </table></div>
        </section>
        <section class="card"><div class="card-h"><h2>Comprobante</h2></div><div class="card-b">
          <dl><dt>Forma de pago</dt><dd>${c.formaPago} · ${catalogos.FORMAS_PAGO[c.formaPago] ?? ''}</dd><dt>Método</dt><dd>${c.metodoPago} · ${catalogos.METODOS_PAGO[c.metodoPago] ?? ''}</dd>
            <dt>Moneda</dt><dd>${c.moneda}</dd><dt>Serie y folio</dt><dd>Se asigna al sellar</dd></dl>
        </div></section>
      </div>
      <aside class="card" style="position:sticky;top:72px"><div class="card-h"><h2>Resumen</h2><span class="env">Sandbox</span></div><div class="card-b">
        <div class="sum"><div><span class="muted">Subtotal</span><span>${dinero(c.subTotal)}</span></div>
          <div><span class="muted">IVA trasladado 16 %</span><span>${dinero(c.impuestos.totalImpuestosTrasladados)}</span></div>
          <div class="tot"><span>Total</span><span>${dinero(c.total)}</span></div></div>
        <div style="margin-top:14px;display:grid;gap:8px">
          ${cuadra ? html`<${Nota} tipo="ok"><b>Cuadra al centavo</b> con el total de la venta.<//>`
            : html`<${Nota} tipo="bad"><b>No cuadra:</b> la factura suma ${dinero(c.total)} y la venta ${dinero(venta.total)}.<//>`}
          <${Nota} tipo="sb">Ambiente de pruebas${modoPac === 'simulado' ? ' (timbre simulado)' : ''}: <b>sin validez fiscal</b>.<//>
        </div>
        <${Aviso} error=${error} />
        <button class="btn pri full" style="margin-top:16px" disabled=${!puedeTimbrar} onClick=${timbrar}>${enviando ? 'Sellando y timbrando…' : 'Sellar y timbrar'}</button>
        <a class="btn ghost full" style="margin-top:6px" href="#/panel">Cancelar</a>
      </div></aside>
    </div>`}
  <//>`;
}
