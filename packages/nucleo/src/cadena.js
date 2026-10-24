// Cadena original del CFDI 4.0 según cadenaoriginal_4_0.xslt del SAT,
// para el subconjunto que genera xml.js (sin complementos ni retenciones).
// Se recorre el mismo árbol que se serializa, con el orden de atributos de la XSLT.
import { arbolComprobante } from './xml.js';

// [atributo, requerido]
/** @type {Record<string, [string, boolean][]>} */
const REGLAS = {
  'cfdi:Comprobante': [['Version', true], ['Serie', false], ['Folio', false], ['Fecha', true], ['FormaPago', false],
    ['NoCertificado', true], ['CondicionesDePago', false], ['SubTotal', true], ['Descuento', false], ['Moneda', true],
    ['TipoCambio', false], ['Total', true], ['TipoDeComprobante', true], ['Exportacion', true], ['MetodoPago', false],
    ['LugarExpedicion', true], ['Confirmacion', false]],
  'cfdi:InformacionGlobal': [['Periodicidad', true], ['Meses', true], ['Año', true]],
  'cfdi:Emisor': [['Rfc', true], ['Nombre', true], ['RegimenFiscal', true], ['FacAtrAdquirente', false]],
  'cfdi:Receptor': [['Rfc', true], ['Nombre', true], ['DomicilioFiscalReceptor', true], ['ResidenciaFiscal', false],
    ['NumRegIdTrib', false], ['RegimenFiscalReceptor', true], ['UsoCFDI', true]],
  'cfdi:Concepto': [['ClaveProdServ', true], ['NoIdentificacion', false], ['Cantidad', true], ['ClaveUnidad', true],
    ['Unidad', false], ['Descripcion', true], ['ValorUnitario', true], ['Importe', true], ['Descuento', false], ['ObjetoImp', true]],
  'cfdi:Traslado': [['Base', true], ['Impuesto', true], ['TipoFactor', true], ['TasaOCuota', false], ['Importe', false]],
};

/** normalize-space() de XPath @param {string} s */
const normalizar = (s) => s.replace(/[ \t\r\n]+/g, ' ').trim();

/** @param {import('./xml.js').Nodo} n @param {string[]} salida */
function atributos(n, salida) {
  const valores = new Map(n.atributos.filter(([, v]) => v !== undefined && v !== ''));
  for (const [nombre, requerido] of REGLAS[n.nombre]) {
    const v = valores.get(nombre);
    if (v !== undefined) salida.push(normalizar(v));
    else if (requerido) salida.push('');
  }
}

/** @param {import('./xml.js').Nodo} n @param {string} nombre */
const hijo = (n, nombre) => n.hijos.find((h) => h.nombre === nombre);
/** @param {import('./xml.js').Nodo | undefined} n @param {string} nombre */
const hijos = (n, nombre) => (n ? n.hijos.filter((h) => h.nombre === nombre) : []);

/**
 * @param {import('./puertos.js').Comprobante} c
 * @param {{ noCertificado: string }} cert
 */
export function cadenaOriginal(c, cert) {
  const raiz = arbolComprobante(c, cert);
  /** @type {string[]} */
  const s = [];
  atributos(raiz, s);
  for (const nombre of ['cfdi:InformacionGlobal', 'cfdi:Emisor', 'cfdi:Receptor']) {
    const n = hijo(raiz, nombre);
    if (n) atributos(n, s);
  }
  for (const concepto of hijos(hijo(raiz, 'cfdi:Conceptos'), 'cfdi:Concepto')) {
    atributos(concepto, s);
    const traslados = hijos(hijo(concepto, 'cfdi:Impuestos'), 'cfdi:Traslados').flatMap((t) => hijos(t, 'cfdi:Traslado'));
    for (const t of traslados) atributos(t, s);
  }
  const impuestos = hijo(raiz, 'cfdi:Impuestos');
  if (impuestos) {
    for (const t of hijos(hijo(impuestos, 'cfdi:Traslados'), 'cfdi:Traslado')) {
      // En el nodo global la XSLT usa Base, Impuesto, TipoFactor, TasaOCuota?, Importe?
      atributos(t, s);
    }
    const total = impuestos.atributos.find(([k]) => k === 'TotalImpuestosTrasladados')?.[1];
    if (total) s.push(normalizar(total));
  }
  return `||${s.join('|')}||`;
}
