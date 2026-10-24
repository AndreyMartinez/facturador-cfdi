// PDF de la factura. Se genera del comprobante + datos del timbre; en sandbox lleva marca de agua.
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { urlVerificacion, catalogos } from '@facturador/nucleo';
import { datosTimbre } from './timbre.js';

export { datosTimbre };
export const LIMITE_ML_BYTES = 1_000_000;

/** @typedef {[number, number, number]} Rgb */
/** @type {Rgb} */ const INDIGO = [79, 70, 229];
/** @type {Rgb} */ const TINTA = [15, 23, 42];
/** @type {Rgb} */ const GRIS = [100, 116, 139];

/** @param {string} n */
const dinero = (n) => `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * QR vectorial: un cuadro por módulo, sin canvas.
 * @param {jsPDF} doc @param {string} texto @param {number} x @param {number} y @param {number} lado
 */
function dibujarQr(doc, texto, x, y, lado) {
  const qr = QRCode.create(texto, { errorCorrectionLevel: 'M' });
  const n = qr.modules.size;
  const m = lado / n;
  doc.setFillColor(0, 0, 0);
  for (let f = 0; f < n; f++) for (let c = 0; c < n; c++) {
    if (qr.modules.get(f, c)) doc.rect(x + c * m, y + f * m, m + 0.01, m + 0.01, 'F');
  }
}

/**
 * @param {{ comprobante: import('@facturador/nucleo/puertos').Comprobante, xmlTimbrado: string, ambiente: 'sandbox' | 'produccion' }} entrada
 * @param {{ comprimir?: boolean }} [opciones]
 * @returns {Uint8Array}
 */
export function generarPdf({ comprobante: c, xmlTimbrado, ambiente }, opciones = {}) {
  const t = datosTimbre(xmlTimbrado);
  const doc = new jsPDF({ unit: 'mm', format: 'letter', compress: opciones.comprimir ?? true });
  const ancho = doc.internal.pageSize.getWidth();
  const izq = 15;
  const der = ancho - 15;
  let y = 18;

  doc.setProperties({ title: `Factura ${c.serie ?? ''}${c.folio ?? ''} ${t.uuid}`, creator: 'Facturalow' });

  if (ambiente === 'sandbox') {
    const marca = 'SIN VALIDEZ · SANDBOX';
    const angulo = 25;
    doc.setTextColor(206, 226, 242).setFontSize(40).setFont('helvetica', 'bold');
    const w = doc.getTextWidth(marca);
    const rad = (angulo * Math.PI) / 180;
    doc.text(marca, ancho / 2 - (w / 2) * Math.cos(rad), 140 + (w / 2) * Math.sin(rad), { angle: angulo });
  }

  // Encabezado
  doc.setTextColor(...TINTA);
  doc.setFont('helvetica', 'bold').setFontSize(13).text(c.emisor.nombre, izq, y);
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...GRIS);
  doc.text(`RFC ${c.emisor.rfc} · Régimen ${c.emisor.regimenFiscal} ${catalogos.REGIMENES[c.emisor.regimenFiscal]?.descripcion ?? ''}`, izq, y + 5, { maxWidth: 110 });
  doc.text(`Lugar de expedición: C.P. ${c.lugarExpedicion}`, izq, y + 14);
  doc.setFont('helvetica', 'bold').setFontSize(13).setTextColor(...INDIGO);
  doc.text(`FACTURA ${[c.serie, c.folio].filter(Boolean).join('-')}`.trim(), der, y, { align: 'right' });
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...GRIS);
  doc.text([`Fecha: ${c.fecha.replace('T', ' ')}`, 'Ingreso · CFDI 4.0', `Folio fiscal: ${t.uuid}`], der, y + 5, { align: 'right' });
  y += 22;
  doc.setDrawColor(...INDIGO).setLineWidth(0.6).line(izq, y, der, y);
  y += 8;

  // Receptor
  doc.setTextColor(...TINTA).setFont('helvetica', 'bold').setFontSize(9).text('RECEPTOR', izq, y);
  doc.setFont('helvetica', 'normal');
  doc.text([
    c.receptor.nombre,
    `RFC ${c.receptor.rfc} · Régimen ${c.receptor.regimenFiscalReceptor} · Uso CFDI ${c.receptor.usoCfdi} · C.P. ${c.receptor.domicilioFiscalReceptor}`,
  ], izq, y + 5);
  doc.setTextColor(...GRIS).text([
    `Forma de pago: ${c.formaPago} ${catalogos.FORMAS_PAGO[c.formaPago] ?? ''}`,
    `Método de pago: ${c.metodoPago} · Moneda: ${c.moneda}`,
  ], der, y + 5, { align: 'right' });
  y += 18;

  // Conceptos
  const cols = { clave: izq, cant: izq + 26, desc: izq + 40, unit: der - 42, imp: der };
  doc.setFillColor(248, 250, 252).rect(izq, y - 4.5, der - izq, 7, 'F');
  doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...GRIS);
  doc.text('CLAVE', cols.clave + 1, y); doc.text('CANT.', cols.cant, y); doc.text('DESCRIPCIÓN', cols.desc, y);
  doc.text('VALOR UNITARIO', cols.unit, y, { align: 'right' }); doc.text('IMPORTE', cols.imp - 1, y, { align: 'right' });
  y += 7;
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...TINTA);
  for (const k of c.conceptos) {
    const desc = doc.splitTextToSize(k.descripcion, cols.unit - cols.desc - 24);
    doc.text(`${k.claveProdServ}\n${k.claveUnidad}`, cols.clave + 1, y);
    doc.text(k.cantidad, cols.cant, y);
    doc.text(desc, cols.desc, y);
    doc.text(k.valorUnitario, cols.unit, y, { align: 'right' });
    doc.text(dinero(k.importe), cols.imp - 1, y, { align: 'right' });
    y += Math.max(desc.length, 2) * 4.2 + 3;
    doc.setDrawColor(229, 233, 242).setLineWidth(0.2).line(izq, y - 3, der, y - 3);
  }

  // Totales
  y += 3;
  const filas = [['Subtotal', dinero(c.subTotal)], ['IVA trasladado 16 %', dinero(c.impuestos.totalImpuestosTrasladados)]];
  for (const [k, v] of filas) {
    doc.setTextColor(...GRIS).text(k, der - 55, y); doc.setTextColor(...TINTA).text(v, der - 1, y, { align: 'right' });
    y += 5;
  }
  doc.setFont('helvetica', 'bold').setFontSize(12).text('Total', der - 55, y + 2).text(`${dinero(c.total)} ${c.moneda}`, der - 1, y + 2, { align: 'right' });
  y += 14;

  // Timbre: QR y sellos
  const lado = 34;
  dibujarQr(doc, urlVerificacion({ uuid: t.uuid, rfcEmisor: c.emisor.rfc, rfcReceptor: c.receptor.rfc, total: c.total, sello: t.selloCfd }), izq, y, lado);
  const xs = izq + lado + 6;
  const anchoTexto = der - xs;
  doc.setFont('helvetica', 'normal').setFontSize(7).setTextColor(...GRIS);
  /** @type {[string, string][]} */
  const bloques = [
    ['Folio fiscal', t.uuid],
    ['No. de serie del CSD del emisor / del SAT', `${t.noCertificado} / ${t.noCertificadoSat}`],
    ['Fecha y hora de certificación', `${t.fechaTimbrado} · RFC del proveedor: ${t.rfcProvCertif}`],
    ['Sello digital del CFDI', t.selloCfd],
    ['Sello del SAT', t.selloSat],
    ['Cadena original del complemento de certificación digital del SAT', t.cadenaTfd],
  ];
  for (const [titulo, valor] of bloques) {
    doc.setFont('helvetica', 'bold').text(titulo, xs, y);
    doc.setFont('courier', 'normal');
    // Los sellos no tienen espacios: se cortan por caracteres según el ancho de la fuente fija.
    const porLinea = Math.floor(anchoTexto / doc.getTextWidth('M'));
    const texto = String(valor ?? '');
    const lineas = texto.match(new RegExp(`.{1,${porLinea}}`, 'g')) ?? [''];
    doc.text(lineas, xs, y + 3);
    y += 3 + lineas.length * 2.8 + 2;
  }
  doc.setFont('helvetica', 'normal').setFontSize(7)
    .text('Este documento es una representación impresa de un CFDI.', ancho / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });

  return new Uint8Array(doc.output('arraybuffer'));
}
