// Importes cuadrados al centavo con el total de la venta (que ya incluye IVA).
// Todo en enteros: centavos (10^-2) y millonésimas (10^-6), con BigInt.
//   valorUnitario = total / 1.16 / cantidad, a 6 decimales
//   importe = base = valorUnitario × cantidad, a 6 decimales
//   iva del concepto = base × 0.16, a 6 decimales
//   subTotal y totalIva = sumas redondeadas a 2 decimales
import { ErrorFactura } from './errores.js';

const TASA_IVA_PPM = 160000n; // 0.160000 en millonésimas
const MILLON = 1_000_000n;
const DE_MICRO_A_CENTAVO = 10_000n;

/**
 * División entera redondeando la mitad hacia arriba (valores no negativos).
 * @param {bigint} a @param {bigint} b
 */
const dividir = (a, b) => (2n * a + b) / (2n * b);

/** @param {string} texto */
export function aCentavos(texto) {
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(String(texto).trim());
  if (!m) throw new ErrorFactura('DATO_FALTANTE', { campo: 'total', detalleTecnico: `Importe inválido: ${texto}` });
  return BigInt(m[1]) * 100n + BigInt((m[2] ?? '').padEnd(2, '0'));
}

/** @param {bigint} valor @param {number} decimales */
export function formatear(valor, decimales) {
  const signo = valor < 0n ? '-' : '';
  const abs = (valor < 0n ? -valor : valor).toString().padStart(decimales + 1, '0');
  return `${signo}${abs.slice(0, -decimales)}.${abs.slice(-decimales)}`;
}

/** @param {bigint} micros */
const microsACentavos = (micros) => dividir(micros, DE_MICRO_A_CENTAVO);

/**
 * @param {bigint} totalLineaCentavos
 * @param {bigint} cantidad
 * @param {bigint} ajusteMicros  desplazamiento del unitario para cuadrar varios conceptos
 */
function concepto(totalLineaCentavos, cantidad, ajusteMicros = 0n) {
  // total en millonésimas = centavos × 10^4; entre 1.16 = × 100 / 116
  const unitario = dividir(totalLineaCentavos * DE_MICRO_A_CENTAVO * 100n, 116n * cantidad) + ajusteMicros;
  const importe = unitario * cantidad;
  const iva = dividir(importe * TASA_IVA_PPM, MILLON);
  return { unitario, importe, iva };
}

/**
 * @typedef {{ cantidad: number, valorUnitario: string, importe: string, base: string, iva: string }} ConceptoCalculado
 */

/** @param {{ importe: bigint, iva: bigint }[]} lista */
function totales(lista) {
  const sumaImporte = lista.reduce((s, c) => s + c.importe, 0n);
  const sumaIva = lista.reduce((s, c) => s + c.iva, 0n);
  const subTotal = microsACentavos(sumaImporte);
  const totalIva = microsACentavos(sumaIva);
  return { sumaImporte, sumaIva, subTotal, totalIva, total: subTotal + totalIva };
}

/**
 * Calcula conceptos e impuestos a partir de las líneas de la venta.
 * @param {{ cantidad: number, total: string }[]} lineas
 * @param {string} totalVenta
 */
export function calcularConceptos(lineas, totalVenta) {
  const objetivo = aCentavos(totalVenta);
  const lineasCentavos = lineas.map((l) => {
    if (!Number.isInteger(l.cantidad) || l.cantidad < 1) {
      throw new ErrorFactura('FUERA_DE_ALCANCE', { detalleTecnico: `Cantidad no entera: ${l.cantidad}` });
    }
    return { cantidad: BigInt(l.cantidad), total: aCentavos(l.total) };
  });
  const sumaLineas = lineasCentavos.reduce((s, l) => s + l.total, 0n);
  if (sumaLineas !== objetivo) {
    throw new ErrorFactura('IMPORTE_NO_CUADRA', {
      detalleTecnico: `Las líneas suman ${formatear(sumaLineas, 2)} y la venta dice ${formatear(objetivo, 2)}.`,
    });
  }

  let calc = lineasCentavos.map((l) => concepto(l.total, l.cantidad));
  let t = totales(calc);

  // Con varios conceptos los redondeos pueden sumar un centavo de más o de menos:
  // se mueve el unitario del concepto de mayor importe hasta que cuadre.
  if (t.total !== objetivo) {
    const mayor = calc.reduce((m, c, i) => (c.importe > calc[m].importe ? i : m), 0);
    const { cantidad, total } = lineasCentavos[mayor];
    const limite = dividir(DE_MICRO_A_CENTAVO * 2n, cantidad);
    buscar: for (let paso = 1n; paso <= limite; paso++) {
      for (const ajuste of [paso, -paso]) {
        const prueba = calc.slice();
        prueba[mayor] = concepto(total, cantidad, ajuste);
        const tp = totales(prueba);
        if (tp.total === objetivo) { calc = prueba; t = tp; break buscar; }
      }
    }
    if (t.total !== objetivo) {
      throw new ErrorFactura('IMPORTE_NO_CUADRA', {
        detalleTecnico: `La factura suma ${formatear(t.total, 2)} y la venta ${formatear(objetivo, 2)}.`,
      });
    }
  }

  /** @type {ConceptoCalculado[]} */
  const conceptos = calc.map((c, i) => ({
    cantidad: Number(lineasCentavos[i].cantidad),
    valorUnitario: formatear(c.unitario, 6),
    importe: formatear(c.importe, 6),
    base: formatear(c.importe, 6),
    iva: formatear(c.iva, 6),
  }));

  return {
    conceptos,
    subTotal: formatear(t.subTotal, 2),
    totalIva: formatear(t.totalIva, 2),
    baseIva: formatear(microsACentavos(t.sumaImporte), 2),
    total: formatear(t.total, 2),
  };
}
