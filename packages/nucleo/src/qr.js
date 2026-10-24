// URL de verificación del SAT para el QR de la representación impresa (CFDI 4.0).

/** @param {string} total p. ej. "198.00" → "198.0"; hasta 6 decimales, sin ceros finales, al menos uno */
export function formatoTotalQr(total) {
  const [enteros, dec = ''] = total.split('.');
  const d = dec.slice(0, 6).replace(/0+$/, '');
  return `${BigInt(enteros)}.${d || '0'}`;
}

/** @param {string} rfc */
const rfcQr = (rfc) => rfc.replace(/&/g, '&amp;');

/**
 * @param {{ uuid: string, rfcEmisor: string, rfcReceptor: string, total: string, sello: string }} d
 */
export function urlVerificacion(d) {
  return 'https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx'
    + `?id=${d.uuid.toUpperCase()}&re=${rfcQr(d.rfcEmisor)}&rr=${rfcQr(d.rfcReceptor)}`
    + `&tt=${formatoTotalQr(d.total)}&fe=${d.sello.slice(-8)}`;
}
