import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearAlmacen, motorMemoria } from '@facturador/almacen';
import { pacSimulado } from '@facturador/pac';
import { fuenteEjemplo, EMISOR_DEMO } from '@facturador/fuentes';
import { ErrorFactura } from '@facturador/nucleo';
import { sellarFactura, timbrarFactura, entregarFactura, reconciliar } from '../src/flujo.js';

const ahora = () => new Date('2026-10-23T18:41:03Z');
const firmador = {
  certificado: () => ({ noCertificado: '30001000000500003416', certificadoB64: 'Q0VS', rfc: 'EKU9003173C9', vigenteDesde: new Date('2023-01-01'), vigenteHasta: new Date('2027-05-18') }),
  firmar: async () => 'U0VMTE8=',
};

async function preparar(/** @type {any} */ pac = pacSimulado({ ahora })) {
  const almacen = crearAlmacen(motorMemoria());
  const venta = await fuenteEjemplo().buscar('referencia-198');
  return { almacen, venta, deps: { almacen, pac, firmador, ambiente: /** @type {const} */ ('sandbox'), ahora } };
}

test('flujo completo: sellada → timbrada → entregada, con folio, PDF y contador', async () => {
  const { almacen, venta, deps } = await preparar();
  const sellada = await sellarFactura({ venta, emisor: EMISOR_DEMO }, deps);
  assert.equal(sellada.estado, 'sellada');
  assert.equal(sellada.folio, 1);
  assert.match(sellada.xmlSellado, /Sello="U0VMTE8="/);

  const f = await timbrarFactura(sellada.id, deps);
  assert.equal(f.estado, 'entregada');
  assert.match(f.uuid, /^[0-9A-F-]{36}$/);
  assert.ok(f.pdf.length > 1000);
  assert.deepEqual(f.eventos.map((/** @type {any} */ e) => e.estado), ['sellada', 'timbrando', 'timbrada', 'entregada']);
  assert.equal((await almacen.contadores.deEmisor(EMISOR_DEMO.id))[0].timbres, 1);
  assert.equal((await sellarFactura({ venta, emisor: EMISOR_DEMO }, deps)).folio, 2);
});

test('si el receptor tiene errores no se reserva folio ni se sella', async () => {
  const { almacen, venta, deps } = await preparar();
  await assert.rejects(sellarFactura({ venta, emisor: EMISOR_DEMO, receptor: { ...venta.receptor, usoCfdi: 'D01' } }, deps), { codigo: 'USO_CFDI_INCOMPATIBLE' });
  assert.equal(await almacen.folios.siguiente(EMISOR_DEMO.id, 'A'), 1);
});

test('caída de red: queda «timbrando» y la reconciliación reenvía el mismo XML', async () => {
  /** @type {string[]} */
  const enviados = [];
  let caido = true;
  const simulado = pacSimulado({ ahora });
  const pac = {
    async timbrar(/** @type {string} */ xml, /** @type {any} */ o) {
      enviados.push(xml);
      if (caido) throw new ErrorFactura('RED_NO_DISPONIBLE');
      return simulado.timbrar(xml, o);
    },
  };
  const { almacen, venta, deps } = await preparar(pac);
  const s = await sellarFactura({ venta, emisor: EMISOR_DEMO }, deps);
  await assert.rejects(timbrarFactura(s.id, deps), { codigo: 'RED_NO_DISPONIBLE' });
  assert.equal((await almacen.facturas.obtener(s.id))?.estado, 'timbrando');

  caido = false;
  const [f] = await reconciliar(EMISOR_DEMO.id, deps);
  assert.equal(f.estado, 'entregada');
  assert.equal(enviados.length, 2);
  assert.equal(enviados[0], enviados[1]);
});

test('rechazo del PAC: queda «rechazada» con el detalle', async () => {
  const pac = { timbrar: async () => { throw new ErrorFactura('PAC_RECHAZO', { mensaje: 'El PAC rechazó la factura (CFDI40147).' }); } };
  const { almacen, venta, deps } = await preparar(pac);
  const s = await sellarFactura({ venta, emisor: EMISOR_DEMO }, deps);
  await assert.rejects(timbrarFactura(s.id, deps), { codigo: 'PAC_RECHAZO' });
  const f = await almacen.facturas.obtener(s.id);
  assert.equal(f?.estado, 'rechazada');
  assert.match(f?.eventos.at(-1).detalle, /CFDI40147/);
});

test('si la entrega a la fuente falla, queda «error_entrega» y se puede reintentar solo la entrega', async () => {
  let falla = true;
  const fuente = { ...fuenteEjemplo(), entregar: async () => { if (falla) throw new Error('ML 500'); } };
  const { venta, deps } = await preparar();
  const d = { ...deps, fuente };
  const s = await sellarFactura({ venta, emisor: EMISOR_DEMO }, d);
  const f = await timbrarFactura(s.id, d);
  assert.equal(f.estado, 'error_entrega');
  falla = false;
  assert.equal((await entregarFactura(f.id, d))?.estado, 'entregada');
});
