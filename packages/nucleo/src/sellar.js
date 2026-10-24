// Orquesta el sellado: cadena original → firmador → XML sellado.
import { cadenaOriginal } from './cadena.js';
import { generarXml } from './xml.js';
import { ErrorFactura } from './errores.js';

/**
 * @param {import('./puertos.js').Comprobante} comprobante
 * @param {import('./puertos.js').Firmador} firmador
 * @param {{ ahora?: Date, rfcEmisor?: string }} [opciones]
 */
export async function sellar(comprobante, firmador, opciones = {}) {
  const cert = firmador.certificado();
  if (cert.rfc !== comprobante.emisor.rfc) throw new ErrorFactura('CSD_NO_COINCIDE');
  const ahora = opciones.ahora ?? new Date();
  if (ahora < cert.vigenteDesde || ahora > cert.vigenteHasta) throw new ErrorFactura('CSD_VENCIDO');

  const cadena = cadenaOriginal(comprobante, cert);
  const sello = await firmador.firmar(cadena);
  const xml = generarXml(comprobante, { noCertificado: cert.noCertificado, certificadoB64: cert.certificadoB64, sello });
  return { xml, cadena, sello, noCertificado: cert.noCertificado };
}
