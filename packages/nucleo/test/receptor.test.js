import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizarReceptor, validarReceptor, tipoPersona, quitarRegimenCapital } from '../src/receptor.js';

test('normaliza nombre y RFC como los trae ML', () => {
  const r = normalizarReceptor({ rfc: ' ure180429tm6 ', nombre: 'Universidad Robotica Española S.A. de C.V. ', regimenFiscal: '601', usoCfdi: 'g01', codigoPostal: '86991' });
  assert.equal(r.rfc, 'URE180429TM6');
  assert.equal(r.nombre, 'UNIVERSIDAD ROBOTICA ESPAÑOLA');
  assert.equal(r.usoCfdi, 'G01');
});

test('quita las variantes de régimen capital', () => {
  for (const nombre of ['ACME SA DE CV', 'ACME, S.A. DE C.V.', 'ACME S. DE R.L. DE C.V.', 'ACME SAPI DE CV', 'ACME S.A.S.', 'ACME S.C.', 'ACME A.C.']) {
    assert.equal(quitarRegimenCapital(nombre), 'ACME', nombre);
  }
  assert.equal(quitarRegimenCapital('SACA CORCHOS'), 'SACA CORCHOS');
});

test('tipo de persona por longitud de RFC', () => {
  assert.equal(tipoPersona('URE180429TM6'), 'moral');
  assert.equal(tipoPersona('XAXX010101000'), 'fisica');
  assert.equal(tipoPersona('NO-ES-RFC'), null);
});

const valido = { rfc: 'URE180429TM6', nombre: 'UNIVERSIDAD ROBOTICA ESPAÑOLA', regimenFiscal: '601', usoCfdi: 'G01', codigoPostal: '86991' };

test('acepta un receptor correcto', () => {
  assert.deepEqual(validarReceptor(valido), []);
});

test('detecta RFC, régimen, uso y C.P. inválidos', () => {
  assert.equal(validarReceptor({ ...valido, rfc: 'ABC' })[0].codigo, 'RFC_INVALIDO');
  assert.equal(validarReceptor({ ...valido, regimenFiscal: '612' })[0].codigo, 'REGIMEN_INVALIDO');
  assert.equal(validarReceptor({ ...valido, usoCfdi: 'D01' })[0].codigo, 'USO_CFDI_INCOMPATIBLE');
  assert.equal(validarReceptor({ ...valido, codigoPostal: '123' })[0].codigo, 'CODIGO_POSTAL_INVALIDO');
});

test('público en general es válido con régimen 616 y uso S01', () => {
  assert.deepEqual(validarReceptor({ rfc: 'XAXX010101000', nombre: 'PUBLICO EN GENERAL', regimenFiscal: '616', usoCfdi: 'S01', codigoPostal: '42501' }), []);
});
