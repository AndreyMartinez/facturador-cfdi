// El CSD se abre y se usa solo en el navegador.
// La .key del SAT es PKCS#8 cifrado con PBES2 + 3DES, que WebCrypto no implementa:
// node-forge la descifra, WebCrypto importa la llave como no exportable y la firma ocurre ahí.
import forge from 'node-forge';
import { ErrorFactura, noCertificadoDesdeSerie, rfcDesdeIdentificador } from '@facturador/nucleo';

const OID_IDENTIFICADOR_UNICO = '2.5.4.45'; // x500UniqueIdentifier

/** @param {Uint8Array} bytes */
const aBinario = (bytes) => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return s;
};
/** @param {string} binario */
const aBytes = (binario) => Uint8Array.from(binario, (c) => c.charCodeAt(0));

/** @param {Uint8Array} cer */
export function leerCertificado(cer) {
  let cert;
  try {
    cert = forge.pki.certificateFromAsn1(forge.asn1.fromDer(aBinario(cer)));
  } catch (e) {
    throw new ErrorFactura('CSD_ARCHIVO', { detalleTecnico: String(e) });
  }
  const atributo = (/** @type {string} */ clave) => cert.subject.attributes.find((/** @type {forge.pki.CertificateField} */ a) => a.type === clave || a.shortName === clave)?.value;
  return {
    forge: cert,
    esCsd: Boolean(atributo('OU')),
    datos: {
      noCertificado: noCertificadoDesdeSerie(cert.serialNumber),
      certificadoB64: forge.util.encode64(aBinario(cer)),
      rfc: rfcDesdeIdentificador(String(atributo(OID_IDENTIFICADOR_UNICO) ?? '')),
      vigenteDesde: cert.validity.notBefore,
      vigenteHasta: cert.validity.notAfter,
    },
  };
}

/**
 * @param {{ cer: Uint8Array, key: Uint8Array, contrasena: string }} csd
 * @param {{ subtle?: SubtleCrypto }} [opciones]
 * @returns {Promise<import('@facturador/nucleo/puertos').Firmador>}
 */
export async function abrirCsd({ cer, key, contrasena }, opciones = {}) {
  const subtle = opciones.subtle ?? globalThis.crypto.subtle;
  const certificado = leerCertificado(cer);
  if (!certificado.esCsd) throw new ErrorFactura('CSD_NO_ES_CSD');

  let infoLlave;
  try {
    infoLlave = forge.pki.decryptPrivateKeyInfo(forge.asn1.fromDer(aBinario(key)), contrasena);
  } catch (e) {
    throw new ErrorFactura('CSD_CONTRASENA', { detalleTecnico: String(e) });
  }
  if (!infoLlave) throw new ErrorFactura('CSD_CONTRASENA');

  // La llave en claro solo existe un instante; se compara con el .cer y se descarta.
  let pkcs8 = aBytes(forge.asn1.toDer(infoLlave).getBytes());
  const privadaForge = /** @type {forge.pki.rsa.PrivateKey} */ (forge.pki.privateKeyFromAsn1(infoLlave));
  const publicaCer = /** @type {forge.pki.rsa.PublicKey} */ (certificado.forge.publicKey);
  if (privadaForge.n.compareTo(publicaCer.n) !== 0) {
    pkcs8.fill(0);
    throw new ErrorFactura('CSD_NO_COINCIDE', { detalleTecnico: 'La .key no corresponde al .cer' });
  }
  const llave = await subtle.importKey('pkcs8', pkcs8, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  pkcs8.fill(0);
  pkcs8 = new Uint8Array(0);

  return {
    certificado: () => certificado.datos,
    firmar: async (cadena) => {
      const firma = new Uint8Array(await subtle.sign('RSASSA-PKCS1-v1_5', llave, new TextEncoder().encode(cadena)));
      return forge.util.encode64(aBinario(firma));
    },
  };
}
