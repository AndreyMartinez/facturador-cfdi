// Comprobante → XML CFDI 4.0. Serialización propia: orden fijo de atributos y escape XML.
import { ErrorFactura } from './errores.js';

/** @typedef {[string, string | undefined]} Atributo */
/** @typedef {{ nombre: string, atributos: Atributo[], hijos: Nodo[] }} Nodo */

export const NS_CFDI = 'http://www.sat.gob.mx/cfd/4';
const NS_XSI = 'http://www.w3.org/2001/XMLSchema-instance';
const ESQUEMA = 'http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd';

/** @param {string} nombre @param {Atributo[]} atributos @param {Nodo[]} [hijos] @returns {Nodo} */
const nodo = (nombre, atributos, hijos = []) => ({ nombre, atributos, hijos });

/** @param {string} s */
export function escapar(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/\r/g, '&#13;').replace(/\n/g, '&#10;').replace(/\t/g, '&#9;');
}

/** @param {Nodo} n @returns {string} */
function serializar(n) {
  const attrs = n.atributos
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => ` ${k}="${escapar(String(v))}"`).join('');
  if (!n.hijos.length) return `<${n.nombre}${attrs}/>`;
  return `<${n.nombre}${attrs}>${n.hijos.map(serializar).join('')}</${n.nombre}>`;
}

/** @param {import('./puertos.js').Traslado[]} traslados */
const nodosTraslado = (traslados) => traslados.map((t) => nodo('cfdi:Traslado', [
  ['Base', t.base], ['Impuesto', t.impuesto], ['TipoFactor', t.tipoFactor], ['TasaOCuota', t.tasaOCuota], ['Importe', t.importe],
]));

/** @param {import('./puertos.js').Comprobante} c */
function validarAlcance(c) {
  const fuera = /** @type {any} */ (c).descuento || /** @type {any} */ (c).retenciones || /** @type {any} */ (c).complemento
    || c.conceptos.some((x) => x.objetoImp !== '02' || x.traslados.some((t) => t.impuesto !== '002' || t.tipoFactor !== 'Tasa'));
  if (fuera) throw new ErrorFactura('FUERA_DE_ALCANCE');
  if (!c.conceptos.length) throw new ErrorFactura('DATO_FALTANTE', { campo: 'conceptos' });
}

/**
 * Árbol del comprobante. `sello` y `certificado` se agregan al sellar.
 * @param {import('./puertos.js').Comprobante} c
 * @param {{ noCertificado: string, certificadoB64?: string, sello?: string }} cert
 * @returns {Nodo}
 */
export function arbolComprobante(c, cert) {
  validarAlcance(c);
  /** @type {Nodo[]} */
  const hijos = [];
  if (c.informacionGlobal) {
    hijos.push(nodo('cfdi:InformacionGlobal', [
      ['Periodicidad', c.informacionGlobal.periodicidad], ['Meses', c.informacionGlobal.meses], ['Año', c.informacionGlobal.anio],
    ]));
  }
  hijos.push(nodo('cfdi:Emisor', [['Rfc', c.emisor.rfc], ['Nombre', c.emisor.nombre], ['RegimenFiscal', c.emisor.regimenFiscal]]));
  hijos.push(nodo('cfdi:Receptor', [
    ['Rfc', c.receptor.rfc], ['Nombre', c.receptor.nombre], ['DomicilioFiscalReceptor', c.receptor.domicilioFiscalReceptor],
    ['RegimenFiscalReceptor', c.receptor.regimenFiscalReceptor], ['UsoCFDI', c.receptor.usoCfdi],
  ]));
  hijos.push(nodo('cfdi:Conceptos', [], c.conceptos.map((x) => nodo('cfdi:Concepto', [
    ['ClaveProdServ', x.claveProdServ], ['NoIdentificacion', x.noIdentificacion], ['Cantidad', x.cantidad],
    ['ClaveUnidad', x.claveUnidad], ['Unidad', x.unidad], ['Descripcion', x.descripcion],
    ['ValorUnitario', x.valorUnitario], ['Importe', x.importe], ['ObjetoImp', x.objetoImp],
  ], [nodo('cfdi:Impuestos', [], [nodo('cfdi:Traslados', [], nodosTraslado(x.traslados))])]))));
  hijos.push(nodo('cfdi:Impuestos', [['TotalImpuestosTrasladados', c.impuestos.totalImpuestosTrasladados]], [
    nodo('cfdi:Traslados', [], nodosTraslado(c.impuestos.traslados)),
  ]));

  return nodo('cfdi:Comprobante', [
    ['xmlns:cfdi', NS_CFDI], ['xmlns:xsi', NS_XSI], ['xsi:schemaLocation', ESQUEMA],
    ['Version', '4.0'], ['Serie', c.serie], ['Folio', c.folio], ['Fecha', c.fecha], ['Sello', cert.sello],
    ['FormaPago', c.formaPago], ['NoCertificado', cert.noCertificado], ['Certificado', cert.certificadoB64],
    ['SubTotal', c.subTotal], ['Moneda', c.moneda], ['Total', c.total], ['TipoDeComprobante', 'I'],
    ['Exportacion', '01'], ['MetodoPago', c.metodoPago], ['LugarExpedicion', c.lugarExpedicion],
  ], hijos);
}

/**
 * @param {import('./puertos.js').Comprobante} c
 * @param {{ noCertificado: string, certificadoB64?: string, sello?: string }} cert
 */
export function generarXml(c, cert) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n${serializar(arbolComprobante(c, cert))}`;
}
