# @facturador/fuentes

De dónde salen las ventas. Todas cumplen `FuenteVentas` y entregan una `Venta`
normalizada.

| Fuente | Estado |
|---|---|
| `fuenteEjemplo()` | Las dos ventas de referencia, con receptor de prueba del SAT. |
| `ventaManual()` / `fuenteManual()` | Captura desde un formulario (precios con IVA). |
| MercadoLibre | **Fase B.** OAuth con PKCE a través del relevo (el `client_secret` vive allá); `GET /packs/{id}`, `/orders/{id}/billing_info`; entrega con `POST /packs/{id}/fiscal_documents` (PDF obligatorio, máx. 1 MB; 409 = ya existe). App de ML propia del facturador: el refresh token es de un solo uso. |
