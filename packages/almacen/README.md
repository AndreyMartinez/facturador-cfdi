# @facturador/almacen

Almacén del dominio sobre un **motor** intercambiable: `motorMemoria()`,
`motorIndexedDB()` y, en la Fase C, uno de servidor.

- Colecciones: emisores, facturas, borradores, csd, folios, contadores, ajustes.
- Cada documento lleva `esquema` (versión) y `emisorId`; `MIGRACIONES` las sube de versión.
- `folios.siguiente()` y `contadores.sumar()` son atómicos (transacción de IndexedDB).
