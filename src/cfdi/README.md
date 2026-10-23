# src/cfdi — Comprobante CFDI 4.0

Del dato de la venta al XML listo para sellar.

1. `borrador(venta, datosFiscales, config)` → objeto plano con emisor, receptor,
   conceptos y totales. Aquí se **cuadra el centavo**:
   - `valorUnitario = round6(totalML / 1.16)`
   - `importe = cantidad × valorUnitario`
   - `iva = round2(importe × 0.16)`, `subTotal = round2(importe)`
   - comprobar `subTotal + iva === totalML`
2. `xml(borrador, certificado)` → XML CFDI 4.0 con `xmlbuilder2`.
3. `cadenaOriginal(xml)` → cadena según `cadenaoriginal_4_0.xslt` del SAT,
   armada en código para el caso soportado: un comprobante de ingreso,
   conceptos con IVA trasladado, sin retenciones ni complementos.

Casos de prueba: [docs/03-referencia-facturas-manuales.md](../../docs/03-referencia-facturas-manuales.md).

Estado: pendiente.
