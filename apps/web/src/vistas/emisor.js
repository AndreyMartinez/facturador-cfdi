import { useState } from 'preact/hooks';
import { html } from '../html.js';
import { useEstado } from '../estado.js';
import { cargarCsd, guardarEmisor } from '../servicios.js';
import { catalogos, tipoPersona } from '@facturador/nucleo';
import { Marco } from '../componentes/marco.js';
import { Aviso, Nota } from '../componentes/comunes.js';

/** @param {File} archivo */
const leerArchivo = async (archivo) => new Uint8Array(await archivo.arrayBuffer());

export function Emisor() {
  const { emisor, firmador, csdOrigen } = useEstado();
  const [form, setForm] = useState(emisor);
  const [archivos, setArchivos] = useState(/** @type {{ cer?: File, key?: File }} */ ({}));
  const [contrasena, setContrasena] = useState('');
  const [recordar, setRecordar] = useState(true);
  const [error, setError] = useState(/** @type {any} */ (null));
  const [guardado, setGuardado] = useState(false);
  const [abriendo, setAbriendo] = useState(false);
  if (!form || !emisor) return null;

  const cert = firmador?.certificado();
  const persona = tipoPersona(form.rfc);
  const campo = (/** @type {string} */ k) => (/** @type {any} */ e) => { setGuardado(false); setForm({ ...form, [k]: e.currentTarget.value }); };

  async function guardar(/** @type {Event} */ ev) {
    ev.preventDefault();
    const actual = /** @type {import('@facturador/nucleo/puertos').Emisor} */ (form);
    await guardarEmisor({ ...actual, rfc: actual.rfc.trim().toUpperCase(), nombre: actual.nombre.trim().toUpperCase() });
    setGuardado(true);
  }

  async function abrir(/** @type {Event} */ ev) {
    ev.preventDefault();
    setError(null);
    if (!archivos.cer || !archivos.key) return setError({ codigo: 'CSD_ARCHIVO', message: 'Elige el .cer y el .key.' });
    setAbriendo(true);
    try {
      await cargarCsd({ cer: await leerArchivo(archivos.cer), key: await leerArchivo(archivos.key), contrasena, recordar });
      setContrasena('');
    } catch (e) { setError(e); }
    setAbriendo(false);
  }

  /** @param {any} ev */
  const elegir = (ev) => {
    const nuevos = { ...archivos };
    for (const f of /** @type {File[]} */ ([...(ev.currentTarget?.files ?? ev.dataTransfer?.files ?? [])])) {
      if (/\.cer$/i.test(f.name)) nuevos.cer = f;
      if (/\.key$/i.test(f.name)) nuevos.key = f;
    }
    setArchivos(nuevos);
  };

  return html`<${Marco} activa="emisor" migas=${html`Cuenta / <b>Emisor y CSD</b>`}>
    <div class="ph"><div><h1>Emisor</h1><p>Cada emisor tiene su CSD, sus folios y su contador de timbres.</p></div></div>
    <div class="g2">
      <form class="card" onSubmit=${guardar}><div class="card-h"><h2>Datos fiscales</h2>${guardado && html`<span class="badge ok">Guardado</span>`}</div><div class="card-b form">
        <label class="field">RFC<input class="mono" value=${form.rfc} onInput=${campo('rfc')} maxlength="13" required /></label>
        <label class="field">Nombre (como en la constancia)<input value=${form.nombre} onInput=${campo('nombre')} required /></label>
        <div class="g2" style="gap:12px">
          <label class="field">Régimen fiscal<select value=${form.regimenFiscal} onChange=${campo('regimenFiscal')}>
            ${Object.entries(catalogos.REGIMENES).filter(([, r]) => !persona || r[persona]).map(([k, r]) => html`<option value=${k}>${k} · ${r.descripcion}</option>`)}
          </select></label>
          <label class="field">C.P. de expedición<input inputmode="numeric" maxlength="5" pattern="\\d{5}" value=${form.lugarExpedicion} onInput=${campo('lugarExpedicion')} required /></label>
        </div>
        <label class="field">Clave SAT del producto por defecto<input class="mono" value=${form.conceptoPorDefecto.claveProdServ}
          onInput=${(/** @type {any} */ e) => setForm({ ...form, conceptoPorDefecto: { ...form.conceptoPorDefecto, claveProdServ: e.currentTarget.value } })} pattern="\\d{8}" />
          <span class="ayuda">Catálogo c_ClaveProdServ del SAT (8 dígitos).</span></label>
        <div style="display:flex;justify-content:flex-end"><button class="btn pri" type="submit">Guardar</button></div>
      </div></form>

      <form class="card" onSubmit=${abrir}><div class="card-h"><h2>Certificado de sello digital</h2>
        ${cert ? html`<span class="badge ok">${csdOrigen === 'demo' ? 'CSD de prueba' : 'Cargado'}</span>` : html`<span class="badge bad">Sin CSD</span>`}</div><div class="card-b form">
        ${cert && html`<dl><dt>No. certificado</dt><dd class="mono">${cert.noCertificado}</dd><dt>RFC del CSD</dt><dd class="mono">${cert.rfc}
          ${cert.rfc === emisor.rfc ? html` <span class="badge ok">Coincide</span>` : html` <span class="badge bad">No coincide</span>`}</dd>
          <dt>Vigencia</dt><dd>hasta ${cert.vigenteHasta.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</dd></dl>`}
        <label class="drop" onDragOver=${(/** @type {Event} */ e) => e.preventDefault()} onDrop=${(/** @type {any} */ e) => { e.preventDefault(); elegir(e); }}>
          <strong>${archivos.cer || archivos.key ? [archivos.cer?.name, archivos.key?.name].filter(Boolean).join(' + ') : 'Elige o arrastra tu .cer y tu .key'}</strong>
          Se leen en este navegador. Nunca se suben a ningún servidor.
          <input class="sr" type="file" accept=".cer,.key" multiple onChange=${elegir} />
        </label>
        <label class="field">Contraseña del CSD<input type="password" autocomplete="off" value=${contrasena} onInput=${(/** @type {any} */ e) => setContrasena(e.currentTarget.value)} />
          <span class="ayuda">Se usa solo aquí para abrir la llave. No se guarda.</span></label>
        <label class="check"><input type="checkbox" checked=${recordar} onChange=${(/** @type {any} */ e) => setRecordar(e.currentTarget.checked)} />
          <span>Recordar el CSD en este equipo<br /><span class="muted">Se guarda la .key tal como la entrega el SAT (cifrada). La contraseña se pide en cada sesión.</span></span></label>
        <${Aviso} error=${error} />
        <${Nota} tipo="warn"><b>Nunca te pediremos tu e.firma.</b> Solo el CSD.<//>
        <div style="display:flex;justify-content:flex-end"><button class="btn pri" type="submit" disabled=${abriendo}>${abriendo ? 'Abriendo…' : 'Abrir CSD'}</button></div>
      </div></form>
    </div>
    <section class="card"><div class="card-h"><h2>Ambiente</h2></div><div class="card-b">
      <label class="check"><input type="radio" checked readonly /> <span>Sandbox (pruebas, gratis)</span></label>
      <label class="check" style="margin-top:8px;opacity:.55"><input type="radio" disabled /> <span>Producción · disponible en la Fase B</span></label>
    </div></section>
  <//>`;
}
