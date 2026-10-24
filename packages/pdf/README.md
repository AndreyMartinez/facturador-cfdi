# @facturador/pdf

`generarPdf({ comprobante, xmlTimbrado, ambiente })` → `Uint8Array` (jsPDF).

Lleva emisor, receptor, conceptos, totales, UUID, número de certificado del
emisor y del SAT, fecha de certificación, sellos, cadena original del TFD y el
QR de verificación del SAT (vectorial, sin canvas). En sandbox imprime «SIN
VALIDEZ · SANDBOX». Pesa ~11 KB; el límite de MercadoLibre es 1 MB.
