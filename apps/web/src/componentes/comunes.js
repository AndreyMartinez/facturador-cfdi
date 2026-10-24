import { html } from '../html.js';
import { CATALOGO } from '@facturador/nucleo';

/** @param {string | number} n */
export const dinero = (n) => `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** @param {string} iso */
export const fechaCorta = (iso) => new Date(iso).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/**
 * Muestra un error (ErrorFactura o cualquier otro) en lenguaje simple, con la acción sugerida.
 * @param {{ error: any, tipo?: 'bad' | 'warn' | 'sb' }} p
 */
export function Aviso({ error, tipo = 'bad' }) {
  if (!error) return null;
  const texto = CATALOGO[error.codigo];
  const mensaje = error.message || texto?.mensaje || 'Algo salió mal.';
  const accion = error.accion || texto?.accion || '';
  return html`<div class="callout ${tipo}" role="alert"><span class="ic"></span><div>
    <p><b>${mensaje}</b>${accion ? ` ${accion}` : ''}</p>
    ${error.detalleTecnico && html`<details><summary>Detalle técnico</summary><span class="mono">${error.detalleTecnico}</span></details>`}
  </div></div>`;
}

/** @param {{ tipo: 'ok' | 'warn' | 'bad' | 'sb', children: any }} p */
export const Nota = ({ tipo, children }) => html`<div class="callout ${tipo}"><span class="ic"></span><p>${children}</p></div>`;

const PASOS = ['Origen', 'Revisar', 'Timbrar', 'Entregar'];
/** @param {{ paso: number }} p  1..4; 5 = todo listo */
export function Pasos({ paso }) {
  return html`<div class="stepper" aria-label="Pasos">${PASOS.map((n, i) => html`
    ${i > 0 && html`<span class="st-line ${i < paso ? 'done' : ''}"></span>`}
    <span class="st ${i + 1 < paso ? 'done' : i + 1 === paso ? 'cur' : ''}" aria-current=${i + 1 === paso ? 'step' : undefined}>
      <b>${i + 1 < paso ? '✓' : i + 1}</b><span>${n}</span>
    </span>`)}</div>`;
}

/** @type {Record<string, [string, string]>} */
export const ESTADOS = {
  sellada: ['Sellada', ''],
  timbrando: ['Timbrando…', 'sb'],
  rechazada: ['Rechazada', 'bad'],
  timbrada: ['Timbrada', 'ok'],
  error_entrega: ['Sin entregar', 'warn'],
  entregada: ['Lista', 'ok'],
  cancelada: ['Cancelada', ''],
};

/** @param {{ estado: string }} p */
export function EstadoFactura({ estado }) {
  const [texto, tipo] = ESTADOS[estado] ?? [estado, ''];
  return html`<span class="badge ${tipo}">${texto}</span>`;
}

/** @param {{ modo: 'simulado' | 'relevo' }} p */
export const Ambiente = ({ modo }) => html`<span class="env" title=${modo === 'simulado' ? 'PAC simulado: no se contacta al SAT' : 'Sandbox del PAC'}>
  ${modo === 'simulado' ? 'Sandbox · simulado' : 'Sandbox'}</span>`;
