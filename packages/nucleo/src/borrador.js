// Venta normalizada + emisor → borrador del comprobante, con importes cuadrados.
import { calcularConceptos } from './importes.js';
import { normalizarReceptor, validarReceptor } from './receptor.js';
import { RFC_PUBLICO_GENERAL } from './catalogos/index.js';
import { CATALOGO } from './errores.js';


const TASA_IVA = '0.160000';
const IVA = '002';

/**
 * Fecha y hora del centro de México, en el formato del CFDI (sin zona).
 * @param {Date} fecha
 */
export function fechaMexico(fecha) {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Mexico_City', hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(fecha).map((p) => [p.type, p.value]),
  );
  return `${partes.year}-${partes.month}-${partes.day}T${partes.hour}:${partes.minute}:${partes.second}`;
}

/**
 * @param {import('./puertos.js').Venta} venta
 * @param {import('./puertos.js').Emisor} emisor
 * @param {{ fecha?: Date, serie?: string, folio?: number | string, receptor?: import('./puertos.js').DatosReceptor }} [opciones]
 */
export function crearBorrador(venta, emisor, opciones = {}) {
  const fecha = fechaMexico(opciones.fecha ?? new Date());
  /** @type {{ codigo: string, mensaje: string }[]} */
  const avisos = [];

  const datosReceptor = opciones.receptor ?? venta.receptor;
  const publicoGeneral = !datosReceptor || datosReceptor.rfc?.trim().toUpperCase() === RFC_PUBLICO_GENERAL;
  /** @type {import('./puertos.js').DatosReceptor} */
  const receptor = publicoGeneral
    ? { rfc: RFC_PUBLICO_GENERAL, nombre: 'PUBLICO EN GENERAL', regimenFiscal: '616', usoCfdi: 'S01', codigoPostal: emisor.lugarExpedicion }
    : normalizarReceptor(datosReceptor);
  if (publicoGeneral) avisos.push({ codigo: 'PUBLICO_EN_GENERAL', mensaje: CATALOGO.PUBLICO_EN_GENERAL.mensaje });

  /** @type {import('./errores.js').ErrorFactura[]} */
  const errores = validarReceptor(receptor);

  const calculo = calcularConceptos(venta.conceptos, venta.total);
  const def = emisor.conceptoPorDefecto;

  /** @type {import('./puertos.js').Comprobante} */
  const comprobante = {
    ...(opciones.serie ? { serie: opciones.serie } : {}),
    ...(opciones.folio !== undefined ? { folio: String(opciones.folio) } : {}),
    fecha,
    formaPago: emisor.comprobante.formaPago,
    metodoPago: emisor.comprobante.metodoPago,
    moneda: emisor.comprobante.moneda,
    lugarExpedicion: emisor.lugarExpedicion,
    subTotal: calculo.subTotal,
    total: calculo.total,
    ...(publicoGeneral ? { informacionGlobal: { periodicidad: '01', meses: fecha.slice(5, 7), anio: fecha.slice(0, 4) } } : {}),
    emisor: { rfc: emisor.rfc, nombre: emisor.nombre, regimenFiscal: emisor.regimenFiscal },
    receptor: {
      rfc: receptor.rfc,
      nombre: receptor.nombre,
      domicilioFiscalReceptor: receptor.codigoPostal,
      regimenFiscalReceptor: receptor.regimenFiscal,
      usoCfdi: receptor.usoCfdi,
    },
    conceptos: venta.conceptos.map((cv, i) => {
      const c = calculo.conceptos[i];
      return {
        claveProdServ: cv.claveProdServ ?? def.claveProdServ,
        ...(cv.sku ? { noIdentificacion: cv.sku } : {}),
        cantidad: String(c.cantidad),
        claveUnidad: def.claveUnidad,
        ...(def.unidad ? { unidad: def.unidad } : {}),
        descripcion: cv.descripcion.trim(),
        valorUnitario: c.valorUnitario,
        importe: c.importe,
        objetoImp: def.objetoImp,
        traslados: [{ base: c.base, impuesto: IVA, tipoFactor: 'Tasa', tasaOCuota: TASA_IVA, importe: c.iva }],
      };
    }),
    impuestos: {
      totalImpuestosTrasladados: calculo.totalIva,
      traslados: [{ base: calculo.baseIva, impuesto: IVA, tipoFactor: 'Tasa', tasaOCuota: TASA_IVA, importe: calculo.totalIva }],
    },
  };

  return { comprobante, avisos, errores, totalVenta: venta.total };
}
