import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { revisar } from '../revisar-secretos.js';

async function carpeta(/** @type {Record<string,string>} */ archivos) {
  const dir = await mkdtemp(join(tmpdir(), 'secretos-'));
  for (const [nombre, contenido] of Object.entries(archivos)) {
    await mkdir(join(dir, nombre, '..'), { recursive: true });
    await writeFile(join(dir, nombre), contenido);
  }
  return dir;
}

test('detecta llaves y certificados', async () => {
  const dir = await carpeta({ 'csd/emisor.key': 'x', 'csd/emisor.cer': 'x', 'ok.js': '' });
  const h = await revisar(dir);
  assert.deepEqual(h.map((x) => x.archivo).sort(), ['csd/emisor.cer', 'csd/emisor.key']);
});

test('detecta RFC que no son de prueba', async () => {
  const dir = await carpeta({ 'notas.md': 'Cliente: ' + 'ABCD' + '850101XY1' });
  const h = await revisar(dir);
  assert.equal(h.length, 1);
  assert.match(h[0].motivo, /RFC no permitido/);
});

test('permite los RFC de prueba del SAT', async () => {
  const dir = await carpeta({ 'demo.json': '{"rfc":"EKU9003173C9","r":"URE180429TM6","g":"XAXX010101000"}' });
  assert.deepEqual(await revisar(dir), []);
});

test('ignora node_modules', async () => {
  const dir = await carpeta({ 'node_modules/x/a.key': 'x' });
  assert.deepEqual(await revisar(dir), []);
});
