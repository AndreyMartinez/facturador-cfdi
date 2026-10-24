// Forma común de respuesta entre el relevo y el navegador.
/**
 * @typedef {{ ok: true, xmlTimbrado: string, uuid: string, duplicado?: boolean }} Exito
 * @typedef {{ ok: false, codigo: string, mensaje: string, detalleTecnico?: string, reintentable: boolean }} Fallo
 * @typedef {Exito | Fallo} RespuestaTimbrado
 */

/** Extrae el UUID del TimbreFiscalDigital. @param {string} xml */
export function uuidDe(xml) {
  return /<tfd:TimbreFiscalDigital[^>]*\sUUID="([0-9A-Fa-f-]{36})"/.exec(xml)?.[1]?.toUpperCase() ?? '';
}
export {};
