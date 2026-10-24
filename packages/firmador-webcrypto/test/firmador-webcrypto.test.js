import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { CSD_PRUEBA } from '../../../scripts/fixtures.js';
import { abrirCsd } from '../src/index.js';
import { abrirCsd as abrirCsdNode } from '@facturador/firmador-node';

const sinCsd = existsSync(CSD_PRUEBA.cer) ? false : 'requiere `npm run fixtures`';
const leer = () => ({ cer: new Uint8Array(readFileSync(CSD_PRUEBA.cer)), key: new Uint8Array(readFileSync(CSD_PRUEBA.key)) });

test('mismos datos de certificado que el firmador de Node', { skip: sinCsd }, async () => {
  const web = await abrirCsd({ ...leer(), contrasena: CSD_PRUEBA.contrasena });
  const node = abrirCsdNode({ ...leer(), contrasena: CSD_PRUEBA.contrasena });
  assert.deepEqual(web.certificado(), node.certificado());
});

test('mismo sello que el firmador de Node (RSA PKCS#1 v1.5 es determinista)', { skip: sinCsd }, async () => {
  const web = await abrirCsd({ ...leer(), contrasena: CSD_PRUEBA.contrasena });
  const node = abrirCsdNode({ ...leer(), contrasena: CSD_PRUEBA.contrasena });
  const cadena = '||4.0|A|13|2026-10-23T12:41:03|ESPAÑOLA ñandú||';
  assert.equal(await web.firmar(cadena), await node.firmar(cadena));
});

test('contraseña incorrecta', { skip: sinCsd }, async () => {
  await assert.rejects(abrirCsd({ ...leer(), contrasena: 'incorrecta' }), { codigo: 'CSD_CONTRASENA' });
});

test('archivo .cer inválido', { skip: sinCsd }, async () => {
  await assert.rejects(abrirCsd({ cer: new Uint8Array([1, 2, 3]), key: leer().key, contrasena: 'x' }), { codigo: 'CSD_ARCHIVO' });
});
