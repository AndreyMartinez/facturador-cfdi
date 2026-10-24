import { html } from '../html.js';
import { useEstado, useDatos } from '../estado.js';
import { obtenerAlmacen, ventasPendientes } from '../servicios.js';
import { Marco } from '../componentes/marco.js';
import { dinero, Aviso, fechaCorta } from '../componentes/comunes.js';

export function Panel() {
  const { emisor } = useEstado();
  const { datos, error } = useDatos(async () => {
    const almacen = obtenerAlmacen();
    const id = /** @type {string} */ (emisor?.id);
    const mes = new Date().toISOString().slice(0, 7);
    const [facturas, contadores, ventas] = await Promise.all([almacen.facturas.deEmisor(id), almacen.contadores.deEmisor(id), ventasPendientes()]);
    const delMes = facturas.filter((f) => f.uuid && String(f.creada).startsWith(mes));
    return {
      facturado: delMes.reduce((s, f) => s + Number(f.comprobante.total), 0),
      emitidas: delMes.length,
      sandbox: contadores.find((c) => c.ambiente === 'sandbox' && c.mes === mes)?.timbres ?? 0,
      produccion: contadores.find((c) => c.ambiente === 'produccion' && c.mes === mes)?.timbres ?? 0,
      sinEntregar: facturas.filter((f) => ['error_entrega', 'timbrando'].includes(f.estado)).length,
      ventas,
    };
  }, [emisor?.id]);

  const pendientes = datos?.ventas.filter((v) => !v.facturada) ?? [];
  return html`<${Marco} activa="panel" migas=${html`<b>Panel</b>`}>
    <div class="ph"><div><h1>Hola</h1><p>${pendientes.length ? `${pendientes.length} venta(s) esperan factura.` : 'No hay ventas pendientes.'}</p></div>
      <a class="btn pri" href="#/nueva">+ Nueva factura</a></div>
    <${Aviso} error=${error} />
    <div class="g4 kpis">
      <div class="card kpi"><div class="card-b"><small>Facturado este mes</small><strong>${dinero(datos?.facturado ?? 0)}</strong></div></div>
      <div class="card kpi"><div class="card-b"><small>Facturas emitidas</small><strong>${datos?.emitidas ?? 0}</strong></div></div>
      <div class="card kpi"><div class="card-b"><small>Timbres usados</small><strong>${datos?.sandbox ?? 0} <span class="muted" style="font-size:14px;font-weight:500">sandbox</span></strong><small>${datos?.produccion ?? 0} en producción</small></div></div>
      <div class="card kpi"><div class="card-b"><small>Pendientes de entregar</small><strong>${datos?.sinEntregar ?? 0}</strong><small>${datos?.sinEntregar ? html`<a href="#/emitidas">Revisar</a>` : 'todo al día'}</small></div></div>
    </div>
    <div class="card">
      <div class="card-h"><h2>Ventas por facturar</h2><a class="btn sm" href="#/nueva">Capturar venta</a></div>
      <div class="tabla"><table>
        <thead><tr><th>Venta</th><th>Producto</th><th class="hide-m">Datos fiscales</th><th class="n">Total</th><th></th></tr></thead>
        <tbody>
          ${datos?.ventas.map(({ venta: v, facturada }) => html`<tr>
            <td><span class="badge ${v.fuente === 'ejemplo' ? 'sb' : ''}">${v.fuente === 'ejemplo' ? 'Ejemplo' : 'Manual'}</span><br /><span class="muted" style="font-size:12px">${fechaCorta(v.fecha)}</span></td>
            <td>${v.conceptos.map((/** @type {{ descripcion: string }} */ c) => c.descripcion).join(', ')}</td>
            <td class="hide-m">${!v.receptor || v.receptor.rfc === 'XAXX010101000'
              ? html`<span class="badge warn">Público en general</span>` : html`<span class="badge ok">RFC capturado</span>`}</td>
            <td class="n">${dinero(v.total)}</td>
            <td class="n">${facturada && v.fuente !== 'ejemplo' ? html`<span class="badge ok">Facturada</span>`
              : html`<a class="btn sm ${facturada ? '' : 'pri'}" href="#/revisar/${v.fuente}/${encodeURIComponent(v.id)}">${facturada ? 'Repetir' : 'Facturar'}</a>`}</td>
          </tr>`)}
        </tbody>
      </table></div>
    </div>
  <//>`;
}
