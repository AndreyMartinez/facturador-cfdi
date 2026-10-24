# @facturador/firmador-webcrypto

`abrirCsd({ cer, key, contrasena })` → `Firmador`, en el navegador.

1. `node-forge` descifra la `.key` del SAT (PKCS#8 con PBES2 + 3DES, que
   WebCrypto no implementa).
2. WebCrypto importa la llave como **no exportable** y firma RSA-SHA256.
3. Los bytes en claro se borran; ni el propio código puede volver a leer la llave.

La prueba `punta-a-punta.test.js` sella las ventas de referencia, verifica el
sello con el `.cer` y valida el XML contra el XSD oficial.
