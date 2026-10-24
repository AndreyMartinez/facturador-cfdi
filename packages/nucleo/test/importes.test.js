import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularConceptos, aCentavos, formatear } from '../src/importes.js';

test('caso 1 de referencia: 188.10', () => {
  const r = calcularConceptos([{ cantidad: 1, total: '188.10' }], '188.10');
  assert.equal(r.conceptos[0].valorUnitario, '162.155172');
  assert.equal(r.subTotal, '162.16');
  assert.equal(r.totalIva, '25.94');
  assert.equal(r.total, '188.10');
});

test('caso 2 de referencia: 198.00', () => {
  const r = calcularConceptos([{ cantidad: 1, total: '198.00' }], '198.00');
  assert.equal(r.conceptos[0].valorUnitario, '170.689655');
  assert.equal(r.subTotal, '170.69');
  assert.equal(r.totalIva, '27.31');
  assert.equal(r.total, '198.00');
});

test('el traslado del concepto se calcula sobre la base con 6 decimales', () => {
  const [c] = calcularConceptos([{ cantidad: 1, total: '188.10' }], '188.10').conceptos;
  assert.equal(c.importe, '162.155172');
  assert.equal(c.base, '162.155172');
  assert.equal(c.iva, '25.944828');
});

test('varias unidades del mismo producto', () => {
  const r = calcularConceptos([{ cantidad: 3, total: '594.00' }], '594.00');
  assert.equal(r.conceptos[0].valorUnitario, '170.689655');
  assert.equal(r.total, '594.00');
});

test('varios conceptos suman el total de la venta', () => {
  const r = calcularConceptos([
    { cantidad: 1, total: '199.00' }, { cantidad: 2, total: '157.00' }, { cantidad: 1, total: '0.99' },
  ], '356.99');
  assert.equal(r.total, '356.99');
});

test('cuadra al centavo con muchas combinaciones de precios', () => {
  for (let centavos = 1; centavos < 200000; centavos += 37) {
    for (const cantidad of [1, 2, 3, 7]) {
      const total = formatear(BigInt(centavos * cantidad), 2);
      const r = calcularConceptos([{ cantidad, total }], total);
      assert.equal(r.total, total, `${cantidad} × ${total}`);
    }
  }
});

test('si la venta no coincide con la suma de sus líneas, falla', () => {
  assert.throws(() => calcularConceptos([{ cantidad: 1, total: '100.00' }], '100.01'), { codigo: 'IMPORTE_NO_CUADRA' });
});

test('rechaza cantidades no enteras o importes mal escritos', () => {
  assert.throws(() => calcularConceptos([{ cantidad: 1.5, total: '10.00' }], '10.00'), { codigo: 'FUERA_DE_ALCANCE' });
  assert.throws(() => aCentavos('10.001'), { codigo: 'DATO_FALTANTE' });
  assert.equal(aCentavos('10'), 1000n);
  assert.equal(aCentavos('10.5'), 1050n);
});
