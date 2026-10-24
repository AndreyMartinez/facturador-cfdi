// Fuentes de ventas. Todas cumplen FuenteVentas (ver @facturador/nucleo/puertos).
import { ErrorFactura, aCentavos, formatear } from '@facturador/nucleo';
import referencia from '../../../fixtures/ventas/referencia.json' with { type: 'json' };

/** @typedef {import('@facturador/nucleo/puertos').Venta} Venta */
/** @typedef {import('@facturador/nucleo/puertos').FuenteVentas} FuenteVentas */

/** Emisor de prueba del SAT que usa la demo. */
export const EMISOR_DEMO = /** @type {import('@facturador/nucleo/puertos').Emisor} */ (referencia.emisor);

/** Las dos ventas de referencia con receptor de prueba. @returns {FuenteVentas} */
export function fuenteEjemplo() {
  const ventas = /** @type {Venta[]} */ (referencia.ventas);
  return {
    id: 'ejemplo',
    async buscar(id) {
      const v = ventas.find((x) => x.id === id);
      if (!v) throw new ErrorFactura('DATO_FALTANTE', { campo: 'venta', mensaje: `No existe la venta de ejemplo ${id}.` });
      return structuredClone(v);
    },
    async listarPendientes() { return structuredClone(ventas); },
  };
}

/**
 * @typedef {object} CapturaManual
 * @property {{ descripcion: string, cantidad: number, precioUnitario: string, claveProdServ?: string }[]} conceptos  precios con IVA
 * @property {import('@facturador/nucleo/puertos').DatosReceptor | null} receptor
 */

/**
 * Convierte lo capturado en un formulario en una Venta.
 * @param {CapturaManual} captura
 * @param {{ id?: string, fecha?: Date }} [opciones]
 * @returns {Venta}
 */
export function ventaManual(captura, opciones = {}) {
  if (!captura.conceptos.length) throw new ErrorFactura('DATO_FALTANTE', { campo: 'conceptos' });
  const conceptos = captura.conceptos.map((c, i) => {
    if (!c.descripcion?.trim()) throw new ErrorFactura('DATO_FALTANTE', { campo: `conceptos.${i}.descripcion` });
    if (!Number.isInteger(c.cantidad) || c.cantidad < 1) throw new ErrorFactura('DATO_FALTANTE', { campo: `conceptos.${i}.cantidad` });
    const total = formatear(aCentavos(c.precioUnitario) * BigInt(c.cantidad), 2);
    return { descripcion: c.descripcion.trim(), cantidad: c.cantidad, total, ...(c.claveProdServ ? { claveProdServ: c.claveProdServ } : {}) };
  });
  const total = formatear(conceptos.reduce((s, c) => s + aCentavos(c.total), 0n), 2);
  return {
    fuente: 'manual',
    id: opciones.id ?? `manual-${Date.now().toString(36)}`,
    fecha: (opciones.fecha ?? new Date()).toISOString(),
    total,
    conceptos,
    receptor: captura.receptor,
  };
}

/** Fuente manual: las ventas capturadas viven en memoria de la sesión. @returns {FuenteVentas & { agregar: (v: Venta) => void }} */
export function fuenteManual() {
  /** @type {Map<string, Venta>} */
  const ventas = new Map();
  return {
    id: 'manual',
    agregar: (v) => { ventas.set(v.id, v); },
    async buscar(id) {
      const v = ventas.get(id);
      if (!v) throw new ErrorFactura('DATO_FALTANTE', { campo: 'venta' });
      return structuredClone(v);
    },
    async listarPendientes() { return [...ventas.values()]; },
  };
}
