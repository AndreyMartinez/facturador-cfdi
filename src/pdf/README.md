# src/pdf — Representación impresa

PDF a partir del XML **timbrado** (no del borrador), con `pdfkit` + `qrcode`.

Debe llevar: emisor, receptor, conceptos, totales, forma y método de pago,
uso CFDI, régimen de ambos, UUID, fecha de timbrado, número de certificado del
SAT, sello digital del CFDI, sello del SAT, cadena original del timbre y el QR
de verificación del SAT (URL con `id`, `re`, `rr`, `tt` y los últimos 8
caracteres del sello).

Tamaño máximo para ML: verificar (en Argentina, 1 MB).

Estado: pendiente.
