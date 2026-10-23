# src/ml — MercadoLibre

Lee ventas y datos fiscales del comprador; sube la factura a la venta.

| Función | Llamada a la API |
|---|---|
| `obtenerVenta(packId)` | `GET /packs/{id}` → órdenes; si no hay pack, usar el `order_id` |
| `datosFiscales(orderId)` | `GET /orders/{id}/billing_info` → RFC, `BUSINESS_NAME` (recortar), `TAXPAYER_TYPE_ID`, `CFDI`, `ZIP_CODE` |
| `subirFactura(packId, xml, pdf)` | `POST /packs/{id}/fiscal_documents`, multipart, campo `fiscal_document` (dos veces: PDF y XML) |
| `facturaSubida(packId)` | `GET /packs/{id}/fiscal_documents` (404 = todavía no hay) |

- Token: `~/.catalogo3d/ml_token.json` (compartido con Catálogo 3D). Al
  refrescar, conservar el formato (`access_token`, `refresh_token`, `expira_en`).
- Si el RFC es `XAXX010101000`, marcar el borrador como «pedir constancia».
- Límites de `fiscal_documents` en México (tamaño, archivos por pack): **por
  verificar**; en Argentina son 1 MB y un documento por pack.

Estado: pendiente.
