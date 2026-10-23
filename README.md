# facturador-cfdi

Aplicación sencilla en **Node** para facturar (CFDI 4.0) las ventas de
MercadoLibre de Savia Raíz:

1. lee la venta y los datos fiscales que dejó el comprador,
2. arma el XML y lo sella con el CSD,
3. lo timbra **directo con un PAC**,
4. genera el PDF,
5. sube XML y PDF a la venta en MercadoLibre.

Estado: **estructura y documentación**, sin código todavía.

## Documentación

- [docs/01-como-se-factura.md](docs/01-como-se-factura.md): cómo funciona el
  timbrado, requisitos (CSD, PAC, sandbox), datos fiscales fijos, opciones de
  PAC, plan por fases.
- [docs/02-arquitectura.md](docs/02-arquitectura.md): stack Node, módulos,
  flujo de datos, configuración y secretos.
- [docs/03-referencia-facturas-manuales.md](docs/03-referencia-facturas-manuales.md):
  las dos facturas hechas a mano el 23-oct, para usarlas como casos de prueba.

## Estructura

```
src/
  ml/       API de MercadoLibre: ventas, datos fiscales, subir factura
  cfdi/     Borrador → XML CFDI 4.0, cálculo de importes y cadena original
  sello/    CSD: leer .cer/.key, firmar
  pac/      Cliente del PAC: timbrar y cancelar (sandbox y producción)
  pdf/      Representación impresa con QR
  web/      Servidor local y pantalla
docs/       Documentación
test/       Pruebas (node:test)
```

Cada carpeta tiene su README con qué hace y qué falta.

## Requisitos

- Node 24 o superior.
- CSD de Savia Raíz (se tramita en CertiSAT Web con la e.firma).
- Cuenta en el sandbox del PAC elegido.
- Token de MercadoLibre (hoy vive en `~/.catalogo3d/`).

## Lo que nunca va en este repo

- CSD (`.cer`, `.key`), su contraseña ni la e.firma.
- Tokens de MercadoLibre o del PAC.
- XML/PDF timbrados y datos fiscales de clientes.

Todo eso vive en `~/.facturador/` (permisos 600). Ver
[docs/02-arquitectura.md](docs/02-arquitectura.md#configuración-y-secretos).
