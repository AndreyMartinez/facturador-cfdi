# @facturador/firmador-node

`abrirCsd({ cer, key, contrasena })` → `Firmador`, con `node:crypto`.

Valida que sea un CSD (no e.firma), que la `.key` corresponda al `.cer` y lee
`NoCertificado`, RFC y vigencia. Se usa en las pruebas y servirá para un
servidor en la Fase C. Da exactamente el mismo sello que
`@facturador/firmador-webcrypto`.
