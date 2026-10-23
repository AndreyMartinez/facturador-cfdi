# src/pac — Timbrado con el PAC

Cliente del PAC elegido. Interfaz que el resto de la app usa:

| Función | Qué hace |
|---|---|
| `timbrar(xmlSellado)` | Regresa el XML timbrado (con `TimbreFiscalDigital` y UUID) o los errores de validación del PAC |
| `cancelar(uuid, motivo, folioSustitucion?)` | Cancela una factura |
| `estado(uuid)` | Consulta si está vigente o cancelada |

- Ambiente por `config.json`: `sandbox` (por defecto) o `produccion`.
- **PAC por decidir.** Comparar SW Sapien, Finkok y uno o dos más: precio por
  timbre, paquete mínimo, sandbox gratis, vigencia de los timbres, cancelación
  incluida, REST o SOAP. Ver [docs/01-como-se-factura.md](../../docs/01-como-se-factura.md#7-opciones-de-pac).
- Si el PAC es SOAP, armar el sobre a mano con `fetch`; no meter una librería
  SOAP completa.

Estado: pendiente.
