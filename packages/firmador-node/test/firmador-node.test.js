import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createVerify, X509Certificate } from 'node:crypto';
import { CSD_PRUEBA } from '../../../scripts/fixtures.js';
import { abrirCsd } from '../src/index.js';

const sinCsd = existsSync(CSD_PRUEBA.cer) ? false : 'requiere `npm run fixtures`';
const leer = () => ({ cer: readFileSync(CSD_PRUEBA.cer), key: readFileSync(CSD_PRUEBA.key) });

test('abre el CSD de prueba y lee sus datos', { skip: sinCsd }, () => {
  const f = abrirCsd({ ...leer(), contrasena: CSD_PRUEBA.contrasena });
  const c = f.certificado();
  assert.equal(c.rfc, 'EKU9003173C9');
  assert.equal(c.noCertificado, '30001000000500003416');
  assert.ok(c.vigenteHasta > c.vigenteDesde);
});

test('la firma se verifica con el certificado', { skip: sinCsd }, async () => {
  const { cer, key } = leer();
  const f = abrirCsd({ cer, key, contrasena: CSD_PRUEBA.contrasena });
  const cadena = '||4.0|prueba ñ||';
  const sello = await f.firmar(cadena);
  const ok = createVerify('sha256').update(cadena, 'utf8').verify(new X509Certificate(cer).publicKey, sello, 'base64');
  assert.ok(ok);
});

test('contraseña incorrecta', { skip: sinCsd }, () => {
  assert.throws(() => abrirCsd({ ...leer(), contrasena: 'otra' }), { codigo: 'CSD_CONTRASENA' });
});

test('archivo que no es certificado', { skip: sinCsd }, () => {
  assert.throws(() => abrirCsd({ cer: Buffer.from('nada'), key: leer().key, contrasena: 'x' }), { codigo: 'CSD_ARCHIVO' });
});
