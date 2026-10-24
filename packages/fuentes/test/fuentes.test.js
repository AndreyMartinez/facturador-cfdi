import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearBorrador } from '@facturador/nucleo';
import { fuenteEjemplo, fuenteManual, ventaManual, EMISOR_DEMO } from '../src/index.js';

test('la fuente de ejemplo trae las dos ventas de referencia', async () => {
  const f = fuenteEjemplo();
  const ventas = await f.listarPendientes();
  assert.deepEqual(ventas.map((v) => v.total), ['198.00', '188.10']);
  const v = await f.buscar('referencia-198');
  assert.equal(crearBorrador(v, EMISOR_DEMO).comprobante.total, '198.00');
  await assert.rejects(f.buscar('otra'), { codigo: 'DATO_FALTANTE' });
});

test('captura manual con varias unidades y conceptos', () => {
  const v = ventaManual({
    conceptos: [{ descripcion: ' Escurridor ', cantidad: 1, precioUnitario: '199' }, { descripcion: 'Tapa', cantidad: 2, precioUnitario: '78.50' }],
    receptor: null,
  }, { id: 'm1', fecha: new Date('2026-10-22T18:00:00Z') });
  assert.equal(v.total, '356.00');
  assert.deepEqual(v.conceptos.map((c) => c.total), ['199.00', '157.00']);
  assert.equal(v.conceptos[0].descripcion, 'Escurridor');
  const b = crearBorrador(v, EMISOR_DEMO);
  assert.equal(b.comprobante.total, '356.00');
});

test('captura manual valida lo obligatorio', () => {
  assert.throws(() => ventaManual({ conceptos: [], receptor: null }), { codigo: 'DATO_FALTANTE' });
  assert.throws(() => ventaManual({ conceptos: [{ descripcion: '', cantidad: 1, precioUnitario: '1' }], receptor: null }), { campo: 'conceptos.0.descripcion' });
  assert.throws(() => ventaManual({ conceptos: [{ descripcion: 'x', cantidad: 0, precioUnitario: '1' }], receptor: null }), { campo: 'conceptos.0.cantidad' });
});

test('la fuente manual guarda y busca ventas capturadas', async () => {
  const f = fuenteManual();
  f.agregar(ventaManual({ conceptos: [{ descripcion: 'x', cantidad: 1, precioUnitario: '10' }], receptor: null }, { id: 'm2' }));
  assert.equal((await f.buscar('m2')).total, '10.00');
});
