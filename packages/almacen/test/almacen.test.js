import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import { crearAlmacen, motorMemoria, motorIndexedDB, nuevoId } from '../src/index.js';

const motores = {
  memoria: async () => motorMemoria(),
  indexeddb: async () => motorIndexedDB(`prueba-${Math.random()}`, { indexedDB: new IDBFactory() }),
};

for (const [nombre, crear] of Object.entries(motores)) {
  test(`${nombre}: guarda con esquema y lee`, async () => {
    const a = crearAlmacen(await crear());
    await a.emisores.guardar({ id: 'em_1', rfc: 'EKU9003173C9' });
    const e = await a.emisores.obtener('em_1');
    assert.equal(e?.rfc, 'EKU9003173C9');
    assert.equal(e?.esquema, 1);
    assert.equal(await a.emisores.obtener('no-existe'), undefined);
  });

  test(`${nombre}: facturas por emisor y estado`, async () => {
    const a = crearAlmacen(await crear());
    await a.facturas.guardar({ id: 'fa_1', emisorId: 'em_1', estado: 'timbrada', creada: '2026-10-23T10:00' });
    await a.facturas.guardar({ id: 'fa_2', emisorId: 'em_1', estado: 'error_entrega', creada: '2026-10-23T11:00' });
    await a.facturas.guardar({ id: 'fa_3', emisorId: 'em_2', estado: 'timbrada', creada: '2026-10-23T12:00' });
    assert.deepEqual((await a.facturas.deEmisor('em_1')).map((f) => f.id), ['fa_2', 'fa_1']);
    assert.deepEqual((await a.facturas.porEstado('em_1', 'error_entrega')).map((f) => f.id), ['fa_2']);
  });

  test(`${nombre}: folios consecutivos y sin repetir aunque se pidan a la vez`, async () => {
    const a = crearAlmacen(await crear());
    const folios = await Promise.all(Array.from({ length: 20 }, () => a.folios.siguiente('em_1', 'A')));
    assert.deepEqual(folios.sort((x, y) => x - y), Array.from({ length: 20 }, (_, i) => i + 1));
    assert.equal(await a.folios.siguiente('em_1', 'B'), 1);
    assert.equal(await a.folios.siguiente('em_2', 'A'), 1);
  });

  test(`${nombre}: contador de timbres por emisor, ambiente y mes`, async () => {
    const a = crearAlmacen(await crear());
    await a.contadores.sumar('em_1', 'sandbox', '2026-10');
    await a.contadores.sumar('em_1', 'sandbox', '2026-10');
    await a.contadores.sumar('em_1', 'produccion', '2026-10');
    const c = await a.contadores.deEmisor('em_1');
    assert.equal(c.find((x) => x.ambiente === 'sandbox')?.timbres, 2);
    assert.equal(c.find((x) => x.ambiente === 'produccion')?.timbres, 1);
  });
}

test('ids con prefijo y únicos', () => {
  const ids = new Set(Array.from({ length: 100 }, () => nuevoId('fa')));
  assert.equal(ids.size, 100);
  assert.match([...ids][0], /^fa_/);
});
