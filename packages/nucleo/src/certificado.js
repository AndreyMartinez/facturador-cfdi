// Utilidades puras para leer datos del certificado del SAT (sin cripto).

/**
 * El número de serie del SAT viene en hex y cada par es un dígito ASCII:
 * 3330303031… → 30001…
 * @param {string} serieHex
 */
export function noCertificadoDesdeSerie(serieHex) {
  const hex = serieHex.replace(/[^0-9a-f]/gi, '');
  let s = '';
  for (let i = 0; i < hex.length; i += 2) s += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
  return s;
}

/**
 * x500UniqueIdentifier = "<RFC del titular> / <RFC del representante>": el primero es el del titular.
 * @param {string} identificador
 */
export function rfcDesdeIdentificador(identificador) {
  return identificador.split('/')[0].trim().toUpperCase();
}
