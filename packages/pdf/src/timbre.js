// Lee del XML timbrado los datos del TimbreFiscalDigital y del comprobante que van en el PDF.

/** @param {string} xml @param {string} nodo */
function atributosDe(xml, nodo) {
  const m = new RegExp(`<${nodo}\\b([^>]*)>`).exec(xml);
  /** @type {Record<string, string>} */
  const r = {};
  if (!m) return r;
  for (const [, k, v] of m[1].matchAll(/([\w:]+)="([^"]*)"/g)) {
    r[k] = v.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  }
  return r;
}

/** @param {string} xmlTimbrado */
export function datosTimbre(xmlTimbrado) {
  const tfd = atributosDe(xmlTimbrado, 'tfd:TimbreFiscalDigital');
  const comp = atributosDe(xmlTimbrado, 'cfdi:Comprobante');
  if (!tfd.UUID) throw new Error('El XML no tiene TimbreFiscalDigital');
  const cadenaTfd = `||${[tfd.Version, tfd.UUID, tfd.FechaTimbrado, tfd.RfcProvCertif, tfd.Leyenda, tfd.SelloCFD, tfd.NoCertificadoSAT]
    .filter((v) => v !== undefined).join('|')}||`;
  return {
    uuid: tfd.UUID.toUpperCase(),
    fechaTimbrado: tfd.FechaTimbrado,
    rfcProvCertif: tfd.RfcProvCertif,
    noCertificadoSat: tfd.NoCertificadoSAT,
    selloSat: tfd.SelloSAT,
    selloCfd: tfd.SelloCFD ?? comp.Sello,
    noCertificado: comp.NoCertificado,
    cadenaTfd,
  };
}
