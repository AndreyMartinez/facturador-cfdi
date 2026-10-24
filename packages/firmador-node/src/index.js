import { createPrivateKey, createPublicKey, sign, X509Certificate } from 'node:crypto';
import { ErrorFactura, noCertificadoDesdeSerie, rfcDesdeIdentificador } from '@facturador/nucleo';

/**
 * Abre un CSD del SAT y devuelve un Firmador.
 * @param {{ cer: Uint8Array, key: Uint8Array, contrasena: string }} csd
 * @returns {import('@facturador/nucleo/puertos').Firmador}
 */
export function abrirCsd({ cer, key, contrasena }) {
  let x509;
  try {
    x509 = new X509Certificate(cer);
  } catch (e) {
    throw new ErrorFactura('CSD_ARCHIVO', { detalleTecnico: String(e) });
  }
  const sujeto = Object.fromEntries(x509.subject.split('\n').map((l) => l.split(/=(.*)/s).slice(0, 2)));
  if (!sujeto.OU) throw new ErrorFactura('CSD_NO_ES_CSD');

  let llave;
  try {
    llave = createPrivateKey({ key: Buffer.from(key), format: 'der', type: 'pkcs8', passphrase: contrasena });
  } catch (e) {
    throw new ErrorFactura('CSD_CONTRASENA', { detalleTecnico: String(e) });
  }
  const publicaLlave = createPublicKey(llave).export({ format: 'der', type: 'spki' });
  const publicaCer = x509.publicKey.export({ format: 'der', type: 'spki' });
  if (!publicaLlave.equals(publicaCer)) throw new ErrorFactura('CSD_NO_COINCIDE', { detalleTecnico: 'La .key no corresponde al .cer' });

  const certificado = {
    noCertificado: noCertificadoDesdeSerie(x509.serialNumber),
    certificadoB64: Buffer.from(cer).toString('base64'),
    rfc: rfcDesdeIdentificador(sujeto.x500UniqueIdentifier ?? ''),
    vigenteDesde: new Date(x509.validFrom),
    vigenteHasta: new Date(x509.validTo),
  };
  return {
    certificado: () => certificado,
    firmar: async (cadena) => sign('sha256', Buffer.from(cadena, 'utf8'), llave).toString('base64'),
  };
}
