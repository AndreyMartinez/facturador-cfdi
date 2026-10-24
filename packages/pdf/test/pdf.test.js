import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearBorrador } from '@facturador/nucleo';
import { generarPdf, datosTimbre, LIMITE_ML_BYTES } from '../src/index.js';
import datos from '../../../fixtures/ventas/referencia.json' with { type: 'json' };

const { emisor, ventas } = /** @type {any} */ (datos);
const comprobante = crearBorrador(ventas[0], emisor, { fecha: new Date('2026-10-23T18:41:03Z'), serie: 'A', folio: 13 }).comprobante;
const SELLO = 'U2VsbG9EZVBydWViYQ'.repeat(19);
const XML_TIMBRADO = `<?xml version="1.0"?><cfdi:Comprobante Sello="${SELLO}" NoCertificado="30001000000500003416" Total="198.00">`
  + '<cfdi:Complemento><tfd:TimbreFiscalDigital Version="1.1" UUID="6f1c2a3b-9d4e-4f10-8a7b-2c5d6e7f8a90" FechaTimbrado="2026-10-23T12:41:04" '
  + `RfcProvCertif="AAA010101AAA" SelloCFD="${SELLO}" NoCertificadoSAT="30001000000500003456" SelloSAT="U2VsbG9TQVQ="/></cfdi:Complemento></cfdi:Comprobante>`;

test('datos del timbre y cadena del TFD', () => {
  const t = datosTimbre(XML_TIMBRADO);
  assert.equal(t.uuid, '6F1C2A3B-9D4E-4F10-8A7B-2C5D6E7F8A90');
  assert.equal(t.cadenaTfd, `||1.1|6f1c2a3b-9d4e-4f10-8a7b-2c5d6e7f8a90|2026-10-23T12:41:04|AAA010101AAA|${SELLO}|30001000000500003456||`);
  assert.throws(() => datosTimbre('<x/>'));
});

test('genera un PDF con UUID, total y marca de sandbox', () => {
  const pdf = generarPdf({ comprobante, xmlTimbrado: XML_TIMBRADO, ambiente: 'sandbox' }, { comprimir: false });
  const texto = new TextDecoder('latin1').decode(pdf);
  assert.ok(texto.startsWith('%PDF-'));
  assert.ok(texto.includes('6F1C2A3B-9D4E-4F10-8A7B-2C5D6E7F8A90'));
  assert.ok(texto.includes('$198.00 MXN'));
  assert.ok(texto.includes('SIN VALIDEZ'));
});

test('en producción no lleva marca de agua y pesa menos de 1 MB', () => {
  const pdf = generarPdf({ comprobante, xmlTimbrado: XML_TIMBRADO, ambiente: 'produccion' }, { comprimir: false });
  assert.ok(!new TextDecoder('latin1').decode(pdf).includes('SIN VALIDEZ'));
  const comprimido = generarPdf({ comprobante, xmlTimbrado: XML_TIMBRADO, ambiente: 'produccion' });
  assert.ok(comprimido.length < LIMITE_ML_BYTES, `${comprimido.length} bytes`);
});
