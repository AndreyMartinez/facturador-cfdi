# Cómo se factura en México y cómo lo hacen las apps

Documento base del proyecto **facturador-cfdi**: una aplicación sencilla para
facturar las ventas de MercadoLibre de Savia Raíz, conectada directo a un PAC.

Fecha: 2026-10-23. Lo que dice «(verificar)» no está confirmado contra la
fuente oficial y hay que comprobarlo antes de programar sobre ello.

---

## 1. La respuesta corta

- **El SAT no tiene una API pública para timbrar.** Lo único gratis y oficial es
  el portal web del SAT (lo que usamos el 23-oct), que es manual: captcha,
  e.firma, formularios.
- **Toda app de facturación timbra a través de un PAC** (Proveedor Autorizado
  de Certificación). El PAC es el único que puede ponerle el timbre fiscal
  (UUID) a una factura y reportarla al SAT.
- **«Gratis y directo con el PAC» no existe del todo.** Lo que sí se puede:
  - Hacer **todo nuestro** (armar el XML, sellarlo, generar el PDF, subirlo a
    ML) sin pagar software ni suscripciones.
  - Pagar **solo el timbre** al PAC, que es el costo mínimo posible: del orden
    de **$0.50 a $3.00 MXN por factura** (suposición: rangos publicados por
    terceros, no cotización).
  - Desarrollar y probar **gratis** en el ambiente de pruebas (sandbox) del PAC.
- Automatizar el portal del SAT con un navegador sería «gratis», pero es frágil
  (captcha, e.firma en cada sesión, cambios del portal) y no es un uso
  previsto del portal. **No se recomienda.**

## 2. Qué pasa cuando se timbra una factura

```
 Venta ML ──► 1. Armar XML CFDI 4.0 ──► 2. Sellar con CSD ──► 3. PAC timbra ──► 4. PDF ──► 5. Subir a ML
             (Anexo 20 del SAT)        (cadena original      (agrega UUID y      (representación   (/packs/{id}/
                                        + firma RSA-SHA256)   reporta al SAT)     impresa)          fiscal_documents)
```

1. **Armar el XML.** Estructura oficial del CFDI 4.0 (Anexo 20): emisor,
   receptor, conceptos, impuestos, totales, forma y método de pago.
2. **Sellar.** Se arma la *cadena original* (los datos del XML en un orden fijo
   que define una XSLT del SAT), se firma con la llave privada del **CSD** usando
   RSA-SHA256 y el resultado va en el atributo `Sello`. También se incluyen el
   número y el contenido del certificado.
3. **Timbrar.** Se manda el XML sellado al servicio web del PAC. El PAC valida
   todo (estructura, catálogos, RFC del receptor en la lista del SAT, cálculos),
   agrega el complemento `TimbreFiscalDigital` con el **UUID** y regresa el XML
   timbrado. Ese XML es la factura legal.
4. **PDF.** Es solo la representación impresa. La genera nuestra app con los
   datos del XML, el UUID y un QR de verificación del SAT.
5. **Entregar.** Subir XML y PDF a la venta de MercadoLibre.

Cancelar una factura también se hace a través del PAC.

## 3. Lo que hace falta antes de programar

| Requisito | Para qué | Cómo se consigue | Costo |
|---|---|---|---|
| **CSD** (Certificado de Sello Digital): `.cer` + `.key` + contraseña | Sellar cada factura | CertiSAT Web, entrando con la e.firma | Gratis |
| Cuenta con un PAC | Timbrar | Contrato con el PAC | Por timbre |
| Credenciales de **sandbox** del PAC | Probar sin timbrar de verdad | Las da el PAC al registrarse | Gratis (verificar por PAC) |
| Token de la API de ML | Leer ventas y subir facturas | Ya existe en `~/.catalogo3d/` | Gratis |

> **La e.firma NO sirve para sellar facturas.** Es para trámites ante el SAT.
> El CSD es otro certificado y se tramita con la e.firma.

## 4. Datos fiscales del emisor (Savia Raíz)

Tomados de la factura hecha a mano el 2026-10-23. Los identificadores (RFC, C.P.) viven en `~/.facturador/config.json`, no en el repo.

| Campo | Valor |
|---|---|
| RFC | persona física (valor en `~/.facturador/config.json`) |
| Régimen | **625** Actividades Empresariales con ingresos a través de Plataformas Tecnológicas |
| C.P. lugar de expedición | el del domicilio fiscal (en `config.json`) |
| Forma de pago | **31** Intermediario pagos |
| Método de pago | **PUE** Pago en una sola exhibición |
| Moneda | MXN |
| Retenciones | Ninguna (ML ya retiene ISR e IVA) |
| Concepto típico | «Utensilios de cocina domésticos», unidad **H87** Pieza, objeto de impuesto **02**, IVA 16 % trasladado |

**Cuadrar el centavo:** el precio de ML ya incluye IVA. Valor unitario =
total / 1.16 con **6 decimales** (198.00 → 170.689655). Con 2 decimales el IVA
redondea mal y la factura sale un centavo arriba.

## 5. Datos del cliente: vienen de MercadoLibre

`GET /orders/{order_id}/billing_info` trae lo que el comprador capturó al
comprar: razón social, RFC, régimen (`TAXPAYER_TYPE_ID`), uso CFDI (`CFDI`) y
C.P. (`ZIP_CODE`). Ejemplo real (venta del 18-oct): persona moral, régimen
601, uso G01.

Cuidados:

- Si el RFC es **XAXX010101000** (público en general), el comprador no pidió
  factura nominativa. Si después manda su constancia, los datos de la
  constancia mandan.
- La razón social va **sin régimen capital** («S.A. de C.V.») y en mayúsculas.
- El número que ve el vendedor suele ser el **pack**; las órdenes salen de
  `GET /packs/{pack_id}`.

## 6. Subir la factura a la venta (API de ML)

- `POST /packs/{pack_id}/fiscal_documents`, multipart, campo
  `fiscal_document`; se pueden mandar el PDF y el XML en la misma petición.
- Si la orden no tiene `pack_id`, se usa el `order_id`.
- Documentado para Argentina y Brasil: PDF de máximo 1 MB, un documento fiscal
  por pack, y la respuesta trae IDs para consultar o borrar. **Para México:
  verificar.** Lo que sí se comprobó el 23-oct es que en México
  `GET /packs/{id}/fiscal_documents` existe: responde 404
  `pack_fiscal_document … does not exist` cuando todavía no hay factura.

## 7. Opciones de PAC

| Opción | Qué mandamos | Qué hacemos nosotros | Costo | Nota |
|---|---|---|---|---|
| **PAC directo** (SW Sapien, Finkok, Edicom, Diverza…) | XML ya sellado | XML, sellado, PDF, cancelación | El más bajo por timbre | **Elegida por el usuario.** Más trabajo, sin intermediarios. |
| API «todo en uno» (Facturapi, Facturama, CFDI Express) | JSON | Solo la pantalla | Timbre más alto + a veces una mensualidad | La descartamos por costo. |

Para escoger el PAC hay que comparar (**pendiente**):

- Precio por timbre y paquete mínimo (¿se pueden comprar 50 o 100?).
- Que tenga **sandbox gratis** con CSD de prueba.
- API REST o SOAP, y calidad de su documentación.
- Que los timbres **no caduquen** o duren por lo menos un año.
- Que la cancelación esté incluida.

## 8. Cómo se programa en Node (stack elegido)

Node 24 (instalado: v24.21.0). El módulo `crypto` resuelve el sellado sin
librerías de pago ni `openssl`.

| Paso | Con qué | Comentario |
|---|---|---|
| XML | `xmlbuilder2` | Namespaces `cfdi` y `xsi`, `schemaLocation` oficial. |
| Cadena original | Armarla en código siguiendo `cadenaoriginal_4_0.xslt` del SAT | Node no trae XSLT. Para nuestro caso (un concepto, IVA trasladado, sin retenciones) la estructura es fija; se valida contra el sandbox del PAC. |
| Leer la `.key` del CSD | `crypto.createPrivateKey({ key, format: 'der', type: 'pkcs8', passphrase })` | La `.key` del SAT es DER PKCS#8 cifrada; Node la abre directo. |
| Firma RSA-SHA256 | `crypto.sign('sha256', cadena, llave)` → base64 | Va en el atributo `Sello`. |
| Certificado | `new crypto.X509Certificate(cer)` | `NoCertificado` sale del número de serie (convertir de hex a ASCII); `Certificado` es el `.cer` en base64. |
| PDF | `pdfkit` + `qrcode` | Debe incluir UUID, sellos y QR de verificación del SAT. |
| Timbrado y ML | `fetch` (incluido en Node) | API del PAC y API de MercadoLibre. |
| Pantalla local | `fastify` (o `express`) sirviendo una página sencilla | Elegir venta → revisar → timbrar → subir. |
| Pruebas | `node:test` (incluido) | Casos con las dos facturas reales del 23-oct como referencia. |

## 9. Seguridad

- El `.key` del CSD y su contraseña viven **fuera del repo** (por ejemplo
  `~/.facturador/`, permisos 600), igual que los tokens de ML.
- El repo puede ser público; credenciales, XML timbrados y datos de clientes no
  van nunca en él.
- Toda factura se **revisa en pantalla antes de timbrar**. Una factura timbrada
  no se borra, solo se cancela, y cancelar tiene reglas (después de cierto plazo
  el receptor debe aceptar).

## 10. Plan propuesto

| Fase | Entregable | Cuesta timbres |
|---|---|---|
| 0 | Elegir PAC, crear cuenta sandbox, tramitar el CSD | No |
| 1 | Leer la venta de ML y armar el borrador de factura (datos + totales cuadrados) | No |
| 2 | Generar el XML y sellarlo; validarlo en el sandbox del PAC | No |
| 3 | PDF con QR | No |
| 4 | Pantalla local: elegir venta → revisar → timbrar → subir a ML | Sí (producción) |
| 5 | Cancelación y lista de facturas emitidas | Sí |

Cada fase se especifica con SDD (requisitos → diseño → tareas) antes de
programarla.

## Fuentes

- [Qué es un PAC y por qué se necesita](https://yo-facturo.com/blog/que-es-un-pac-proveedor-autorizado-de-certificacion-cfdi-mexico/)
- [Rangos de precio por timbre y planes (terceros)](https://directoriodenegocios.net/cfdi-4-0-como-emitir-complementar-cancelar-mexico-2026/)
- [Comparativa de APIs de CFDI (sitio de un competidor)](https://cfdi.express/blog/facturapi-vs-cfdi-express-api)
- [ML: cargar factura (Argentina)](https://developers.mercadolibre.com.ar/en_us/upload-invoices)
- [ML: anexar nota fiscal (Brasil)](https://developers.mercadolivre.com.br/anexar-nota-fiscal)
- [PAC sin costo para emisión uno a uno (EdiFact)](https://www.edifact.com.mx/soluciongratuita)
