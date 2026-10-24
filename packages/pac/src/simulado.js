// PAC simulado para la demo sin relevo: genera un TimbreFiscalDigital falso, claramente marcado.
// No contacta al SAT ni a ningún PAC. Sirve para mostrar el flujo completo sin cuentas.

/** @param {string} xml @param {string} nombre */
const atributo = (xml, nombre) => new RegExp(`\\s${nombre}="([^"]*)"`).exec(xml)?.[1] ?? '';

/** @param {{ ahora?: () => Date, uuid?: () => string }} [deps] @returns {import('@facturador/nucleo/puertos').Pac} */
export function pacSimulado(deps = {}) {
  const ahora = deps.ahora ?? (() => new Date());
  const nuevoUuid = deps.uuid ?? (() => crypto.randomUUID().toUpperCase());
  /** @type {Map<string, { xmlTimbrado: string, uuid: string }>} */
  const previos = new Map();
  return {
    async timbrar(xmlSellado, { idempotencia }) {
      const previo = previos.get(idempotencia);
      if (previo) return previo;
      const uuid = nuevoUuid();
      const fecha = ahora().toISOString().slice(0, 19);
      const sello = atributo(xmlSellado, 'Sello');
      const tfd = '<cfdi:Complemento><tfd:TimbreFiscalDigital xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital" '
        + 'xsi:schemaLocation="http://www.sat.gob.mx/TimbreFiscalDigital http://www.sat.gob.mx/sitio_internet/cfd/TimbreFiscalDigital/TimbreFiscalDigitalv11.xsd" '
        + `Version="1.1" UUID="${uuid}" FechaTimbrado="${fecha}" RfcProvCertif="SIMULADO0000" Leyenda="SIMULADO, SIN VALIDEZ" `
        + `SelloCFD="${sello}" NoCertificadoSAT="00000000000000000000" SelloSAT="U0lNVUxBRE8="/></cfdi:Complemento>`;
      const r = { xmlTimbrado: xmlSellado.replace('</cfdi:Comprobante>', `${tfd}</cfdi:Comprobante>`), uuid };
      previos.set(idempotencia, r);
      return r;
    },
  };
}
