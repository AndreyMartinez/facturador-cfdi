# @facturador/nucleo

Núcleo de facturación CFDI 4.0. **Puro**: sin DOM, sin `fs`, sin red. Corre igual
en el navegador, en Node y en un Worker.

| Archivo | Qué hace |
|---|---|
| `importes.js` | Total de la venta (con IVA) → unitario a 6 decimales, importes, IVA y totales. Aritmética entera con `BigInt`: cuadra al centavo. |
| `receptor.js` | Normaliza (mayúsculas, sin régimen capital) y valida RFC, régimen ↔ uso CFDI y C.P. |
| `borrador.js` | Venta + emisor → comprobante. Sin datos fiscales → público en general con `InformacionGlobal`. |
| `xml.js` | Comprobante → XML CFDI 4.0 (orden fijo de atributos, escape). Rechaza lo que esté fuera del subconjunto. |
| `cadena.js` | Cadena original 4.0, idéntica a la XSLT oficial del SAT (prueba de oro con `xsltproc`). |
| `sellar.js` | Cadena → `Firmador` → XML sellado. Valida RFC y vigencia del CSD. |
| `qr.js` | URL de verificación del SAT para el QR. |
| `catalogos/` | Subconjunto de catálogos del SAT (régimen, uso CFDI, forma y método de pago). |
| `errores.js` | Errores tipados con mensaje y acción en español simple. |
| `puertos.js` | Tipos del dominio e interfaces que cumplen los adaptadores. |

Subconjunto soportado: comprobante de ingreso, conceptos con IVA trasladado al
16 %, sin descuentos, retenciones ni complementos.

Casos de prueba: [docs/03-referencia-facturas-manuales.md](../../docs/03-referencia-facturas-manuales.md).
