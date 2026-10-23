# Arquitectura

## Stack

| Pieza | Elección | Por qué |
|---|---|---|
| Runtime | Node 24, ESM (`"type": "module"`) | Instalado; `crypto` abre la `.key` del SAT y firma sin dependencias. |
| XML | `xmlbuilder2` | Arma XML con namespaces sin pelear con strings. |
| PDF | `pdfkit` + `qrcode` | Sin navegador; ligero. |
| HTTP | `fetch` nativo | PAC y MercadoLibre. |
| Servidor local | `fastify` | Pantalla de revisión antes de timbrar. |
| Pruebas | `node:test` | Incluido en Node. |

Pocas dependencias: cada una se justifica en este archivo antes de agregarla.

## Flujo de datos

```
pack_id ──► ml.obtenerVenta() ──► cfdi.borrador() ──► [pantalla: revisar] ──► cfdi.xml()
                                                                                 │
                         ml.subirFactura() ◄── pdf.generar() ◄── pac.timbrar() ◄─┴─ sello.sellar()
```

1. **`ml`**: `GET /packs/{id}` → órdenes; `GET /orders/{id}`; `GET /orders/{id}/billing_info`.
2. **`cfdi.borrador`**: objeto plano con emisor, receptor, conceptos y totales.
   Aquí se cuadra el centavo (unitario = total / 1.16 a 6 decimales).
3. **Pantalla**: muestra el borrador; nada se timbra sin un clic de
   confirmación.
4. **`cfdi.xml` + `sello.sellar`**: XML CFDI 4.0, cadena original, `Sello`,
   `NoCertificado`, `Certificado`.
5. **`pac.timbrar`**: regresa el XML timbrado (UUID).
6. **`pdf.generar`**: PDF con QR de verificación.
7. **`ml.subirFactura`**: `POST /packs/{id}/fiscal_documents` con PDF y XML.

## Configuración y secretos

Fuera del repo, en `~/.facturador/` (permisos 600):

```
~/.facturador/
  config.json        # PAC elegido, ambiente (sandbox|produccion), datos fijos del emisor
  csd/               # .cer y .key del CSD
  secretos.json      # contraseña del CSD, usuario/token del PAC
  emitidas/          # XML y PDF timbrados, uno por UUID
```

- El token de MercadoLibre se lee de `~/.catalogo3d/ml_token.json`, que
  comparte con Catálogo 3D. Si se refresca desde aquí, hay que escribir el
  archivo con el mismo formato (`access_token`, `refresh_token`, `expira_en`)
  para no romper la galería.
- Ambiente por defecto: **sandbox**. Producción se activa explícitamente.

## Datos fijos del emisor (config.json)

```json
{
  "emisor": {
    "rfc": "<RFC del emisor>",
    "nombre": "<Nombre como en la constancia>",
    "regimenFiscal": "625",
    "lugarExpedicion": "<C.P. fiscal>"
  },
  "comprobante": { "formaPago": "31", "metodoPago": "PUE", "moneda": "MXN" },
  "conceptoPorDefecto": { "claveUnidad": "H87", "objetoImp": "02", "tasaIva": 0.16 }
}
```

La clave de producto SAT de «Utensilios de cocina domésticos» se confirma en el
catálogo `c_ClaveProdServ` antes de fijarla.

## Reglas

- Nada se timbra en producción sin confirmación en pantalla.
- Cada factura timbrada se guarda en `~/.facturador/emitidas/` antes de
  subirla a ML.
- Mensajes, documentación y commits en español.
