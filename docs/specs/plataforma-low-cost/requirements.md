# Documento de requisitos: plataforma de facturación low cost

Fecha: 2026-10-23. Estado: **borrador v2 para aprobación**.

## Introducción

Hoy el proyecto está planeado como una app local en Node para facturar las
ventas de MercadoLibre de Savia Raíz. Este documento replantea el objetivo en
dos tiempos:

1. **Ahora: una prueba gratuita en GitHub Pages** que demuestre que se puede
   generar, sellar y timbrar (en sandbox) un CFDI 4.0 sin pagar software ni
   servidores.
2. **Después: una plataforma robusta de facturación low cost**, multi-cliente
   y de código cerrado.

La prueba es pequeña, pero **la estructura se construye desde ya como la de la
plataforma**: núcleo de facturación independiente, integraciones
intercambiables, modelo de datos multi-emisor y despliegue portable. Lo que
cambia al crecer es qué adaptador se conecta, no el núcleo.

La idea central para lograr costo fijo cercano a cero es que **el trabajo
pesado ocurra en el navegador del usuario**: armar el XML, sellarlo con el CSD,
generar el PDF y guardar las facturas. El CSD y su contraseña nunca salen del
dispositivo. Lo único que no puede hacer un sitio estático (hablar con el PAC y
con MercadoLibre, que no aceptan llamadas directas desde el navegador y exigen
secretos de aplicación) se resuelve con un **relevo mínimo sin estado** en una
capa gratuita de funciones serverless.

Restricciones que condicionan los requisitos (verificar antes del diseño):

- **GitHub Pages solo sirve archivos estáticos**: no ejecuta código de servidor
  ni guarda secretos.
- **En el plan gratuito, GitHub Pages exige repositorio público.** Para la
  prueba no estorba; cerrar el código después implica pagar GitHub Pro/Team o
  mover el sitio a otro hosting estático.
- **Los términos de GitHub Pages no permiten operar un SaaS comercial.** Es
  adecuado para la prueba y la demostración; la plataforma comercial vivirá en
  otro hosting. Por eso el sitio debe ser portable desde el día uno.
- El costo variable mínimo inevitable es el **timbre del PAC**.

Fases:

- **Fase A: prueba gratuita (este documento).** Sitio en GitHub Pages,
  solo sandbox, con CSD y RFC de prueba. Cualquiera puede ver que funciona.
- **Fase B: uso real de Savia Raíz (este documento, sin activar aún).**
  Conectar MercadoLibre y timbrar en producción con el CSD real, con
  confirmación en pantalla.
- **Fase C: plataforma (se especificará aparte).** Cuentas de usuario, varios
  emisores, cobro de suscripciones, reventa de timbres, soporte. Este
  documento solo exige que la estructura no la impida.

## Requisitos

### Requisito 0: prueba gratuita de demostración

**Historia:** Como dueño del proyecto, quiero un sitio público donde se vea
una factura generada y timbrada en sandbox, para demostrar que la plataforma
es viable sin invertir.

#### Criterios de aceptación

1. El sitio DEBERÁ publicarse en GitHub Pages y abrirse sin instalar nada.
2. El modo demostración DEBERÁ venir con un CSD y un emisor de prueba
   publicados por el SAT o el PAC, sin que el visitante cargue nada.
3. CUANDO el visitante capture una venta de ejemplo (o elija una de las dos
   facturas de referencia), ENTONCES el sistema DEBERÁ mostrar el borrador, el
   XML sellado, el XML timbrado en sandbox y el PDF.
4. El modo demostración NO DEBERÁ poder timbrar en producción ni conectarse a
   una cuenta real de MercadoLibre.
5. Toda factura de demostración DEBERÁ llevar una marca visible de «sin
   validez fiscal (sandbox)».
6. El relevo DEBERÁ limitar la frecuencia de timbrados de demostración por
   visitante, para que el sitio público no agote la cuota del sandbox.
7. La demostración DEBERÁ usar el mismo núcleo y el mismo flujo que el uso
   real; solo cambian la configuración y los adaptadores.

### Requisito 1: costo fijo cercano a cero

**Historia:** Como dueño del proyecto, quiero que la infraestructura no tenga
costo mensual fijo, para que facturar cueste solo el timbre.

#### Criterios de aceptación

1. El sistema DEBERÁ publicarse como sitio estático en GitHub Pages sin
   servidores propios encendidos.
2. Las funciones de relevo DEBERÁN caber en la capa gratuita de un proveedor
   serverless con el volumen esperado de la Fase A (orden de cientos de
   facturas al mes).
3. CUANDO se agregue un servicio externo, ENTONCES su costo y su límite
   gratuito DEBERÁN documentarse en `docs/02-arquitectura.md` antes de usarlo.
4. El sistema DEBERÁ funcionar sin base de datos en servidor durante la
   Fase A.

### Requisito 2: el CSD nunca sale del dispositivo

**Historia:** Como emisor, quiero que mi CSD y su contraseña se queden en mi
computadora, para no tener que confiar mis sellos a un tercero.

#### Criterios de aceptación

1. CUANDO el emisor cargue su `.cer` y `.key`, ENTONCES el sistema DEBERÁ
   leerlos y usarlos solo dentro del navegador.
2. El sistema NO DEBERÁ enviar el `.key`, la contraseña del CSD ni la llave
   descifrada a ningún servidor, incluido el relevo.
3. SI el emisor elige recordar el CSD en el dispositivo, ENTONCES el sistema
   DEBERÁ guardarlo cifrado y pedir la contraseña en cada sesión.
4. SI la contraseña del CSD es incorrecta, ENTONCES el sistema DEBERÁ decirlo
   con un mensaje claro y no avanzar al sellado.
5. SI el certificado está vencido, revocado o no corresponde al RFC del
   emisor, ENTONCES el sistema DEBERÁ bloquear el sellado y explicar el
   motivo.
6. El sistema NUNCA DEBERÁ pedir ni usar la e.firma.

### Requisito 3: leer la venta de MercadoLibre

**Historia:** Como vendedor, quiero escribir el número de venta y ver los
datos del comprador y del producto, para no capturarlos a mano.

#### Criterios de aceptación

1. CUANDO el vendedor conecte su cuenta, ENTONCES el sistema DEBERÁ usar el
   inicio de sesión de MercadoLibre (OAuth), donde el vendedor escribe su
   contraseña en el sitio de ML y no en el nuestro.
2. CUANDO el vendedor escriba un número de pack u orden, ENTONCES el sistema
   DEBERÁ traer las órdenes, productos, totales y `billing_info`.
3. SI la orden no tiene `pack_id`, ENTONCES el sistema DEBERÁ usar el
   `order_id`.
4. SI el RFC es `XAXX010101000`, ENTONCES el sistema DEBERÁ avisar que el
   comprador no pidió factura nominativa y permitir capturar el receptor a
   mano.
5. CUANDO lleguen razón social o RFC, ENTONCES el sistema DEBERÁ recortar
   espacios, pasar a mayúsculas y quitar el régimen capital («S.A. de C.V.»).
6. SI la venta ya tiene un documento fiscal en ML, ENTONCES el sistema DEBERÁ
   avisar antes de permitir otro timbrado.
7. SI el token de ML expiró, ENTONCES el sistema DEBERÁ renovarlo o pedir
   reconectar sin perder el borrador.

### Requisito 4: borrador con importes cuadrados al centavo

**Historia:** Como emisor, quiero que el total de la factura sea idéntico al
de MercadoLibre, para que la factura no salga un centavo arriba.

#### Criterios de aceptación

1. CUANDO se arme el borrador, ENTONCES el sistema DEBERÁ calcular el valor
   unitario como total / 1.16 con 6 decimales.
2. El sistema DEBERÁ producir los importes de las dos facturas de referencia
   (`docs/03-referencia-facturas-manuales.md`) exactamente.
3. SI el total calculado difiere del total de ML en cualquier centavo,
   ENTONCES el sistema DEBERÁ bloquear el timbrado y mostrar la diferencia.
4. CUANDO la venta tenga varios productos o varias unidades, ENTONCES el
   sistema DEBERÁ generar un concepto por producto y cuadrar el total.
5. El sistema DEBERÁ permitir editar el receptor (RFC, nombre, régimen, uso
   CFDI, C.P.) antes de timbrar.
6. CUANDO se edite el receptor, ENTONCES el sistema DEBERÁ validar formato de
   RFC y compatibilidad régimen ↔ uso CFDI con los catálogos del SAT.

### Requisito 5: XML CFDI 4.0 sellado en el navegador

**Historia:** Como emisor, quiero que el sistema arme y selle el XML, para
mandarlo directo al PAC sin intermediarios caros.

#### Criterios de aceptación

1. CUANDO el emisor apruebe el borrador, ENTONCES el sistema DEBERÁ generar el
   XML CFDI 4.0 conforme al Anexo 20.
2. El sistema DEBERÁ calcular la cadena original y el `Sello` (RSA-SHA256) en
   el navegador, e incluir `NoCertificado` y `Certificado`.
3. El sellado DEBERÁ producir el mismo resultado que el ejecutado en Node, para
   poder probarlo con `node:test`.
4. SI el sandbox del PAC rechaza el sello o la estructura, ENTONCES el sistema
   DEBERÁ mostrar el código y el mensaje del PAC sin perder el borrador.

### Requisito 6: timbrado directo con el PAC, sandbox por defecto

**Historia:** Como emisor, quiero timbrar pagando solo el timbre, y probar
gratis antes de usar producción.

#### Criterios de aceptación

1. El sistema DEBERÁ arrancar siempre en ambiente **sandbox**.
2. CUANDO el emisor quiera timbrar en producción, ENTONCES el sistema DEBERÁ
   mostrar el resumen (receptor, total, ambiente) y exigir una confirmación
   explícita en pantalla para cada factura.
3. El relevo DEBERÁ recibir solo el XML ya sellado y regresarlo timbrado, sin
   guardar copia ni registros con datos del cliente.
4. SI el PAC no responde o falla la red, ENTONCES el sistema DEBERÁ permitir
   reintentar sin riesgo de timbrar dos veces la misma venta.
5. El cliente del PAC DEBERÁ estar aislado tras una interfaz, para poder
   cambiar de PAC sin tocar el resto del sistema.

### Requisito 7: PDF, guardado y entrega en MercadoLibre

**Historia:** Como vendedor, quiero que el XML y el PDF queden en la venta de
ML y en mi equipo, sin pasos manuales.

#### Criterios de aceptación

1. CUANDO se reciba el XML timbrado, ENTONCES el sistema DEBERÁ generar en el
   navegador un PDF con UUID, sellos y QR de verificación del SAT.
2. CUANDO termine el timbrado, ENTONCES el sistema DEBERÁ guardar XML y PDF
   en el dispositivo antes de intentar subirlos a ML.
3. CUANDO estén guardados, ENTONCES el sistema DEBERÁ subirlos a
   `/packs/{id}/fiscal_documents`.
4. SI la subida a ML falla, ENTONCES el sistema DEBERÁ marcar la factura como
   «timbrada, sin subir» y permitir reintentar solo la subida.
5. El sistema DEBERÁ mostrar la lista de facturas emitidas en el dispositivo y
   permitir exportarlas (XML + PDF en un `.zip`) como respaldo.
6. SI el PDF excede el límite de ML para México, ENTONCES el sistema DEBERÁ
   avisar antes de subirlo.

### Requisito 8: secretos y datos fuera del repositorio

**Historia:** Como dueño del proyecto, quiero que el repositorio (público hoy)
no contenga nada sensible, para poder publicarlo sin riesgo.

#### Criterios de aceptación

1. El repositorio NO DEBERÁ contener CSD, contraseñas, tokens, RFC, razones
   sociales, ni XML/PDF timbrados, ni en pruebas ni en documentos.
2. Los secretos de aplicación (credenciales del PAC, secreto de la app de ML)
   DEBERÁN vivir solo en la configuración cifrada del proveedor serverless.
3. Las pruebas DEBERÁN usar el CSD y los RFC de prueba que publica el SAT o
   el PAC.
4. CUANDO se haga un despliegue, ENTONCES un chequeo automático DEBERÁ fallar
   si detecta archivos `.cer`, `.key`, `.pfx` o patrones de RFC reales.
5. El relevo DEBERÁ aceptar peticiones solo desde el dominio del sitio.

### Requisito 9: estructura de plataforma desde el inicio

**Historia:** Como dueño del proyecto, quiero que la prueba ya tenga la
estructura de la plataforma, para crecer sin reescribirla.

#### Criterios de aceptación

1. El **núcleo de facturación** (borrador, importes, XML, cadena original,
   sello, PDF, validaciones con catálogos del SAT) DEBERÁ ser un módulo
   independiente que corra igual en navegador, en Node y en una función
   serverless, sin depender de la interfaz ni del hosting.
2. Las **integraciones** (fuente de ventas, PAC, almacenamiento, entrega de
   la factura) DEBERÁN conectarse al núcleo mediante interfaces definidas, con
   al menos: fuente «captura manual» y «MercadoLibre»; PAC «sandbox» y
   «producción»; almacenamiento «en el dispositivo» (y después «en
   servidor»).
3. El modelo de datos DEBERÁ ser **multi-emisor desde ya**: cada factura,
   configuración y contador de timbres pertenece a un emisor identificado,
   aunque en la Fase A solo exista uno.
4. Los datos del emisor (RFC, nombre, régimen, C.P., conceptos por defecto)
   DEBERÁN venir de configuración, sin nada de Savia Raíz fijo en el código.
5. Los documentos guardados (borradores, facturas, configuración) DEBERÁN
   llevar versión de esquema, para migrarlos cuando cambie el formato.
6. El sitio DEBERÁ poder moverse de GitHub Pages a otro hosting estático, y el
   relevo a otro proveedor serverless, cambiando solo la configuración de
   despliegue.
7. Cada cambio DEBERÁ pasar por integración continua: pruebas del núcleo
   (incluidas las dos facturas de referencia), revisión de secretos y build
   del sitio, antes de publicarse.
8. El relevo DEBERÁ identificar a qué emisor pertenece cada timbrado y
   registrar solo metadatos (emisor, ambiente, fecha, resultado), nunca el
   contenido de la factura, para contar timbres por emisor en la Fase C.
9. El sistema DEBERÁ registrar cuántos timbres se usaron por mes y en qué
   ambiente, para medir el costo real por factura.
10. Las decisiones de arquitectura DEBERÁN quedar escritas en `docs/` con su
    motivo, para que la plataforma futura sepa por qué se eligió cada pieza.

### Requisito 10: experiencia de uso

**Historia:** Como vendedor sin conocimientos fiscales, quiero un flujo corto
y claro, para facturar una venta en menos de un minuto.

#### Criterios de aceptación

1. El flujo principal DEBERÁ ser: número de venta → revisar → timbrar →
   listo, en una sola pantalla.
2. El sistema DEBERÁ mostrar el ambiente actual (sandbox o producción) de
   forma visible en todo momento.
3. Todo texto visible DEBERÁ estar en español.
4. El sitio DEBERÁ funcionar en navegadores de escritorio actuales (Chrome,
   Safari, Firefox, Edge) y ser usable en pantalla de teléfono.
5. CUANDO ocurra un error del SAT, PAC o ML, ENTONCES el sistema DEBERÁ
   traducirlo a una explicación con la acción sugerida.

## Criterios de éxito

- Sitio público en GitHub Pages que genera, sella y timbra en sandbox una
  factura de demostración de principio a fin.
- Factura de sandbox de las dos ventas de referencia, con importes idénticos.
- Primera factura real de Savia Raíz timbrada y subida a ML desde el sitio.
- Costo fijo mensual de infraestructura: $0.
- Ningún secreto ni dato de cliente en el historial del repositorio.

## Pendientes que bloquean el diseño

1. Elegir PAC: que acepte llamadas vía relevo, tenga sandbox gratis y precio
   por timbre bajo.
2. Tramitar el CSD en CertiSAT Web.
3. Confirmar la clave de producto SAT y los límites de `fiscal_documents` en
   ML México.
4. Elegir proveedor del relevo serverless (capa gratuita).
5. Decidido: GitHub Pages para la prueba; a dónde migrar cuando el código se
   cierre se decide en la Fase C.
