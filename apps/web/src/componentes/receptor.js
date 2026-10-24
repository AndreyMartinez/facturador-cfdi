// Formulario del receptor con validación en vivo (RFC, régimen ↔ uso CFDI, C.P.).
import { html } from '../html.js';
import { catalogos, normalizarReceptor, validarReceptor, tipoPersona } from '@facturador/nucleo';

/** @typedef {import('@facturador/nucleo/puertos').DatosReceptor} DatosReceptor */

/** @param {{ valor: DatosReceptor, onCambio: (r: DatosReceptor) => void }} p */
export function FormReceptor({ valor, onCambio }) {
  const errores = Object.fromEntries(validarReceptor(normalizarReceptor(valor)).map((e) => [e.campo, e]));
  const persona = tipoPersona(valor.rfc.trim().toUpperCase());
  const regimenes = Object.entries(catalogos.REGIMENES).filter(([, r]) => !persona || r[persona]);
  const usos = Object.entries(catalogos.USOS_CFDI).filter(([, u]) => (!persona || u[persona]) && (!valor.regimenFiscal || u.regimenes.includes(valor.regimenFiscal)));
  const campo = (/** @type {keyof DatosReceptor} */ k) => (/** @type {any} */ ev) => onCambio({ ...valor, [k]: ev.currentTarget.value });
  const ayuda = (/** @type {string} */ k, /** @type {string} */ normal = '') => html`<span class="ayuda">${errores[k]?.message ?? normal}</span>`;
  return html`<div class="form">
    <div class="g2" style="gap:12px">
      <label class="field ${errores.rfc ? 'error' : ''}">RFC<input class="mono" value=${valor.rfc} onInput=${campo('rfc')} autocomplete="off" spellcheck="false" maxlength="13" />${ayuda('rfc', persona ? `Persona ${persona}` : '')}</label>
      <label class="field ${errores.codigoPostal ? 'error' : ''}">C.P. del domicilio fiscal<input inputmode="numeric" value=${valor.codigoPostal} onInput=${campo('codigoPostal')} maxlength="5" />${ayuda('codigoPostal')}</label>
    </div>
    <label class="field ${errores.nombre ? 'error' : ''}">Nombre o razón social<input value=${valor.nombre} onInput=${campo('nombre')} />${ayuda('nombre', 'Como en la constancia, sin «S.A. de C.V.» (se quita solo).')}</label>
    <label class="field ${errores.regimenFiscal ? 'error' : ''}">Régimen fiscal<select value=${valor.regimenFiscal} onChange=${campo('regimenFiscal')}>
      <option value="">Elige…</option>${regimenes.map(([k, r]) => html`<option value=${k}>${k} · ${r.descripcion}</option>`)}
    </select>${ayuda('regimenFiscal')}</label>
    <label class="field ${errores.usoCfdi ? 'error' : ''}">Uso CFDI<select value=${valor.usoCfdi} onChange=${campo('usoCfdi')}>
      <option value="">Elige…</option>${usos.map(([k, u]) => html`<option value=${k}>${k} · ${u.descripcion}</option>`)}
    </select>${ayuda('usoCfdi')}</label>
  </div>`;
}

/** @returns {DatosReceptor} */
export const receptorVacio = () => ({ rfc: '', nombre: '', regimenFiscal: '', usoCfdi: '', codigoPostal: '' });
