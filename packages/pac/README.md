# @facturador/pac

| Módulo | Dónde corre | Qué hace |
|---|---|---|
| `relevo.js` | navegador | Cliente del relevo; cumple la interfaz `Pac`. Reintenta con el **mismo** XML sellado y su huella (no timbra dos veces). |
| `sw-sapien.js` | relevo | SW Sapien: `POST /v2/security/authenticate` y `POST /cfdi33/stamp/v4` (multipart, campo `xml`; acepta CFDI 4.0). |
| `simulado.js` | navegador | PAC falso para la demo sin cuentas: agrega un TFD marcado «SIMULADO, SIN VALIDEZ». |

Respuesta común: `{ ok: true, xmlTimbrado, uuid }` o
`{ ok: false, codigo, mensaje, detalleTecnico, reintentable }`.

Por verificar en el sandbox de SW: el formato exacto del duplicado (código 307)
y si regresa el XML previo.
