import { useState } from 'preact/hooks';
import { html } from '../html.js';
import { guardarVentaManual } from '../servicios.js';
import { ir } from '../rutas.js';
import { Marco } from '../componentes/marco.js';
import { Pasos, Aviso, dinero } from '../componentes/comunes.js';
import { FormReceptor, receptorVacio } from '../componentes/receptor.js';

const lineaVacia = () => ({ descripcion: '', cantidad: 1, precioUnitario: '' });

export function Nueva() {
  const [captura, setCaptura] = useState(false);
  const [lineas, setLineas] = useState([lineaVacia()]);
  const [conReceptor, setConReceptor] = useState(false);
  const [receptor, setReceptor] = useState(receptorVacio());
  const [error, setError] = useState(/** @type {any} */ (null));

  const total = lineas.reduce((s, l) => s + (Number(l.precioUnitario) || 0) * (l.cantidad || 0), 0);
  const cambiarLinea = (/** @type {number} */ i, /** @type {string} */ k, /** @type {any} */ v) =>
    setLineas(lineas.map((l, j) => (j === i ? { ...l, [k]: k === 'cantidad' ? Number.parseInt(v, 10) || 0 : v } : l)));

  async function continuar(/** @type {Event} */ ev) {
    ev.preventDefault();
    setError(null);
    try {
      const venta = await guardarVentaManual({ conceptos: lineas, receptor: conReceptor ? receptor : null });
      ir(`#/revisar/manual/${encodeURIComponent(venta.id)}`);
    } catch (e) { setError(e); }
  }

  return html`<${Marco} activa="nueva" migas=${html`Facturas / <b>Nueva</b>`}>
    <${Pasos} paso=${1} />
    <div class="ph"><div><h1>¿De dónde viene la venta?</h1><p>Elige una fuente. Más integraciones llegan después.</p></div></div>
    <div class="g3">
      <div class="card"><div class="card-b">
        <div style="display:flex;justify-content:space-between;gap:8px"><strong>Venta de ejemplo</strong><span class="badge sb">Demo</span></div>
        <p class="muted" style="margin:6px 0 14px">Las dos facturas de referencia: $198.00 y $188.10.</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <a class="btn pri" href="#/revisar/ejemplo/referencia-198">$198.00</a><a class="btn" href="#/revisar/ejemplo/referencia-188">$188.10</a>
        </div>
      </div></div>
      <div class="card ${captura ? 'sel' : ''}"><div class="card-b">
        <strong>Captura manual</strong>
        <p class="muted" style="margin:6px 0 14px">Para ventas fuera de una plataforma.</p>
        <button class="btn full" onClick=${() => setCaptura(true)}>Capturar</button>
      </div></div>
      <div class="card"><div class="card-b">
        <div style="display:flex;justify-content:space-between;gap:8px"><strong>MercadoLibre</strong><span class="badge">Fase B</span></div>
        <p class="muted" style="margin:6px 0 14px">Trae la venta y los datos fiscales que dejó el comprador.</p>
        <button class="btn full" disabled>Próximamente</button>
      </div></div>
    </div>

    ${captura && html`<form class="card" onSubmit=${continuar}>
      <div class="card-h"><h2>Captura de la venta</h2><span class="muted">Precios con IVA incluido</span></div>
      <div class="card-b form">
        <div class="lineas">${lineas.map((l, i) => html`<div class="linea">
          <label class="field">Descripción<input value=${l.descripcion} onInput=${(/** @type {any} */ e) => cambiarLinea(i, 'descripcion', e.currentTarget.value)} required /></label>
          <label class="field">Cantidad<input type="number" min="1" step="1" value=${l.cantidad} onInput=${(/** @type {any} */ e) => cambiarLinea(i, 'cantidad', e.currentTarget.value)} required /></label>
          <label class="field">Precio unitario<input inputmode="decimal" placeholder="0.00" value=${l.precioUnitario} onInput=${(/** @type {any} */ e) => cambiarLinea(i, 'precioUnitario', e.currentTarget.value)} required pattern="\\d+(\\.\\d{1,2})?" /></label>
          <button type="button" class="btn ghost" aria-label="Quitar concepto" disabled=${lineas.length === 1} onClick=${() => setLineas(lineas.filter((_, j) => j !== i))}>✕</button>
        </div>`)}</div>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
          <button type="button" class="linkbtn" onClick=${() => setLineas([...lineas, lineaVacia()])}>+ Agregar concepto</button>
          <strong>Total ${dinero(total)}</strong>
        </div>
        <label class="check"><input type="checkbox" checked=${conReceptor} onChange=${(/** @type {any} */ e) => setConReceptor(e.currentTarget.checked)} />
          <span>El cliente pidió factura con sus datos<br /><span class="muted">Si no, se factura a público en general.</span></span></label>
        ${conReceptor && html`<${FormReceptor} valor=${receptor} onCambio=${setReceptor} />`}
        <${Aviso} error=${error} />
        <div style="display:flex;justify-content:flex-end"><button class="btn pri" type="submit">Revisar factura →</button></div>
      </div>
    </form>`}
  <//>`;
}
