-- Metadatos de timbres: nunca el contenido de la factura.
CREATE TABLE IF NOT EXISTS timbres (
  id INTEGER PRIMARY KEY,
  emisor_id TEXT NOT NULL,
  ambiente TEXT NOT NULL,
  fecha TEXT NOT NULL,
  resultado TEXT NOT NULL,
  idempotencia TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS timbres_dia ON timbres (ambiente, fecha);
