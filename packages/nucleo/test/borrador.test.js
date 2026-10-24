import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearBorrador, fechaMexico } from '../src/borrador.js';
import datos from '../../../fixtures/ventas/referencia.json' with { type: 'json' };

const { emisor, ventas } = /** @type {any} */ (datos);
const fecha = new Date('2026-10-23T18:41:03Z');

test('borrador de la venta de 198.00', () => {
  const b = crearBorrador(ventas[0], emisor, { fecha, serie: 'A', folio: 13 });
  assert.deepEqual(b.errores, []);
  const c = b.comprobante;
  assert.equal(c.fecha, '2026-10-23T12:41:03');
  assert.equal(c.subTotal, '170.69');
  assert.equal(c.total, '198.00');
  assert.equal(c.impuestos.totalImpuestosTrasladados, '27.31');
  assert.equal(c.receptor.nombre, 'UNIVERSIDAD ROBOTICA ESPAÑOLA');
  assert.equal(c.receptor.domicilioFiscalReceptor, '65000');
  assert.equal(c.conceptos[0].valorUnitario, '170.689655');
  assert.equal(c.conceptos[0].claveProdServ, '52151600');
  assert.equal(c.conceptos[0].traslados[0].tasaOCuota, '0.160000');
  assert.equal(c.folio, '13');
});

test('borrador de la venta de 188.10', () => {
  const b = crearBorrador(ventas[1], emisor, { fecha });
  assert.equal(b.comprobante.subTotal, '162.16');
  assert.equal(b.comprobante.impuestos.totalImpuestosTrasladados, '25.94');
  assert.equal(b.comprobante.total, '188.10');
});

test('sin datos fiscales se factura a público en general con información global', () => {
  const b = crearBorrador({ ...ventas[0], receptor: null }, emisor, { fecha });
  const c = b.comprobante;
  assert.equal(c.receptor.rfc, 'XAXX010101000');
  assert.equal(c.receptor.nombre, 'PUBLICO EN GENERAL');
  assert.equal(c.receptor.regimenFiscalReceptor, '616');
  assert.equal(c.receptor.usoCfdi, 'S01');
  assert.equal(c.receptor.domicilioFiscalReceptor, emisor.lugarExpedicion);
  assert.deepEqual(c.informacionGlobal, { periodicidad: '01', meses: '10', anio: '2026' });
  assert.equal(b.avisos[0].codigo, 'PUBLICO_EN_GENERAL');
});

test('los errores del receptor se reportan sin lanzar, para mostrarlos en pantalla', () => {
  const b = crearBorrador({ ...ventas[0], receptor: { ...ventas[0].receptor, usoCfdi: 'D01' } }, emisor, { fecha });
  assert.deepEqual(b.errores.map((e) => e.codigo), ['USO_CFDI_INCOMPATIBLE']);
});

test('el receptor corregido a mano sustituye al de la venta', () => {
  const b = crearBorrador({ ...ventas[1], receptor: null }, emisor, {
    fecha, receptor: { rfc: 'URE180429TM6', nombre: 'Universidad Robotica Española', regimenFiscal: '601', usoCfdi: 'G03', codigoPostal: '65000' },
  });
  assert.equal(b.comprobante.receptor.rfc, 'URE180429TM6');
  assert.equal(b.avisos.length, 0);
});

test('fecha en hora del centro de México', () => {
  assert.equal(fechaMexico(new Date('2026-01-15T06:30:00Z')), '2026-01-15T00:30:00');
});
