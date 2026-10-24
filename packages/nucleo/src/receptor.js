// Normalización y validación de los datos fiscales del receptor.
import { REGIMENES, USOS_CFDI } from './catalogos/index.js';
import { ErrorFactura } from './errores.js';

const PATRON_MORAL = /^[A-ZÑ&]{3}\d{6}[A-Z\d]{3}$/;
const PATRON_FISICA = /^[A-ZÑ&]{4}\d{6}[A-Z\d]{3}$/;

// Régimen capital al final del nombre: el CFDI 4.0 lo pide sin él.
const REGIMEN_CAPITAL = /[\s,]+(S\.?\s?A\.?\s?P\.?\s?I\.?|S\.?\s?A\.?\s?S\.?|S\.?\s?A\.?|S\.?\s?(DE\s)?R\.?\s?L\.?|S\.?\s?C\.?|A\.?\s?C\.?|S\.?\s?N\.?\s?C\.?|S\.?\s?EN\s?C\.?)(\s+DE\s+(C\.?\s?V\.?|R\.?\s?L\.?|I\.?\s?P\.?))?\.?\s*$/;

/** @param {string} nombre */
export function quitarRegimenCapital(nombre) {
  return nombre.replace(REGIMEN_CAPITAL, '').trim();
}

/** @param {string} rfc @returns {'fisica' | 'moral' | null} */
export function tipoPersona(rfc) {
  if (PATRON_MORAL.test(rfc)) return 'moral';
  if (PATRON_FISICA.test(rfc)) return 'fisica';
  return null;
}

/** @param {string} s */
const limpiar = (s) => String(s ?? '').trim().replace(/\s+/g, ' ').toUpperCase();

/** @param {import('./puertos.js').DatosReceptor} r @returns {import('./puertos.js').DatosReceptor} */
export function normalizarReceptor(r) {
  return {
    rfc: limpiar(r.rfc).replace(/[\s-]/g, ''),
    nombre: quitarRegimenCapital(limpiar(r.nombre)),
    regimenFiscal: limpiar(r.regimenFiscal),
    usoCfdi: limpiar(r.usoCfdi),
    codigoPostal: limpiar(r.codigoPostal),
  };
}

/**
 * Devuelve la lista de problemas (vacía si todo está bien).
 * @param {import('./puertos.js').DatosReceptor} r
 * @returns {ErrorFactura[]}
 */
export function validarReceptor(r) {
  /** @type {ErrorFactura[]} */
  const errores = [];
  const persona = tipoPersona(r.rfc);
  if (!persona) errores.push(new ErrorFactura('RFC_INVALIDO', { campo: 'rfc' }));
  if (!r.nombre) errores.push(new ErrorFactura('DATO_FALTANTE', { campo: 'nombre' }));
  if (!/^\d{5}$/.test(r.codigoPostal)) errores.push(new ErrorFactura('CODIGO_POSTAL_INVALIDO', { campo: 'codigoPostal' }));

  const regimen = REGIMENES[r.regimenFiscal];
  if (!regimen || (persona && !regimen[persona])) {
    errores.push(new ErrorFactura('REGIMEN_INVALIDO', { campo: 'regimenFiscal' }));
  }
  const uso = USOS_CFDI[r.usoCfdi];
  if (!uso || (persona && !uso[persona]) || (regimen && !uso.regimenes.includes(r.regimenFiscal))) {
    errores.push(new ErrorFactura('USO_CFDI_INCOMPATIBLE', { campo: 'usoCfdi' }));
  }
  return errores;
}
