// Subconjunto de los catálogos del SAT para CFDI 4.0 (catCFDI).
// Fuente: catálogo c_RegimenFiscal y c_UsoCFDI del Anexo 20. (verificar contra la versión vigente)

/** @typedef {{ descripcion: string, fisica: boolean, moral: boolean }} Regimen */

/** @type {Record<string, Regimen>} */
export const REGIMENES = {
  '601': { descripcion: 'General de Ley Personas Morales', fisica: false, moral: true },
  '603': { descripcion: 'Personas Morales con Fines no Lucrativos', fisica: false, moral: true },
  '605': { descripcion: 'Sueldos y Salarios e Ingresos Asimilados a Salarios', fisica: true, moral: false },
  '606': { descripcion: 'Arrendamiento', fisica: true, moral: false },
  '607': { descripcion: 'Régimen de Enajenación o Adquisición de Bienes', fisica: true, moral: false },
  '608': { descripcion: 'Demás ingresos', fisica: true, moral: false },
  '610': { descripcion: 'Residentes en el Extranjero sin Establecimiento Permanente en México', fisica: true, moral: true },
  '611': { descripcion: 'Ingresos por Dividendos (socios y accionistas)', fisica: true, moral: false },
  '612': { descripcion: 'Personas Físicas con Actividades Empresariales y Profesionales', fisica: true, moral: false },
  '614': { descripcion: 'Ingresos por intereses', fisica: true, moral: false },
  '615': { descripcion: 'Régimen de los ingresos por obtención de premios', fisica: true, moral: false },
  '616': { descripcion: 'Sin obligaciones fiscales', fisica: true, moral: false },
  '620': { descripcion: 'Sociedades Cooperativas de Producción que optan por diferir sus ingresos', fisica: false, moral: true },
  '621': { descripcion: 'Incorporación Fiscal', fisica: true, moral: false },
  '622': { descripcion: 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras', fisica: false, moral: true },
  '623': { descripcion: 'Opcional para Grupos de Sociedades', fisica: false, moral: true },
  '624': { descripcion: 'Coordinados', fisica: false, moral: true },
  '625': { descripcion: 'Actividades Empresariales con ingresos a través de Plataformas Tecnológicas', fisica: true, moral: false },
  '626': { descripcion: 'Régimen Simplificado de Confianza', fisica: true, moral: true },
};

const EMPRESARIALES = ['601', '603', '606', '612', '620', '621', '622', '623', '624', '625', '626'];
const DEDUCCIONES_PERSONALES = ['605', '606', '608', '611', '612', '614', '607', '615', '625'];
const TODOS = Object.keys(REGIMENES);

/** @typedef {{ descripcion: string, fisica: boolean, moral: boolean, regimenes: string[] }} UsoCfdi */

/** @type {Record<string, UsoCfdi>} */
export const USOS_CFDI = {
  G01: { descripcion: 'Adquisición de mercancías', fisica: true, moral: true, regimenes: EMPRESARIALES },
  G02: { descripcion: 'Devoluciones, descuentos o bonificaciones', fisica: true, moral: true, regimenes: EMPRESARIALES },
  G03: { descripcion: 'Gastos en general', fisica: true, moral: true, regimenes: EMPRESARIALES },
  I01: { descripcion: 'Construcciones', fisica: true, moral: true, regimenes: EMPRESARIALES },
  I02: { descripcion: 'Mobiliario y equipo de oficina por inversiones', fisica: true, moral: true, regimenes: EMPRESARIALES },
  I03: { descripcion: 'Equipo de transporte', fisica: true, moral: true, regimenes: EMPRESARIALES },
  I04: { descripcion: 'Equipo de cómputo y accesorios', fisica: true, moral: true, regimenes: EMPRESARIALES },
  I05: { descripcion: 'Dados, troqueles, moldes, matrices y herramental', fisica: true, moral: true, regimenes: EMPRESARIALES },
  I06: { descripcion: 'Comunicaciones telefónicas', fisica: true, moral: true, regimenes: EMPRESARIALES },
  I07: { descripcion: 'Comunicaciones satelitales', fisica: true, moral: true, regimenes: EMPRESARIALES },
  I08: { descripcion: 'Otra maquinaria y equipo', fisica: true, moral: true, regimenes: EMPRESARIALES },
  D01: { descripcion: 'Honorarios médicos, dentales y gastos hospitalarios', fisica: true, moral: false, regimenes: DEDUCCIONES_PERSONALES },
  D02: { descripcion: 'Gastos médicos por incapacidad o discapacidad', fisica: true, moral: false, regimenes: DEDUCCIONES_PERSONALES },
  D03: { descripcion: 'Gastos funerales', fisica: true, moral: false, regimenes: DEDUCCIONES_PERSONALES },
  D04: { descripcion: 'Donativos', fisica: true, moral: false, regimenes: DEDUCCIONES_PERSONALES },
  D05: { descripcion: 'Intereses reales por créditos hipotecarios (casa habitación)', fisica: true, moral: false, regimenes: DEDUCCIONES_PERSONALES },
  D06: { descripcion: 'Aportaciones voluntarias al SAR', fisica: true, moral: false, regimenes: DEDUCCIONES_PERSONALES },
  D07: { descripcion: 'Primas por seguros de gastos médicos', fisica: true, moral: false, regimenes: DEDUCCIONES_PERSONALES },
  D08: { descripcion: 'Gastos de transportación escolar obligatoria', fisica: true, moral: false, regimenes: DEDUCCIONES_PERSONALES },
  D09: { descripcion: 'Depósitos en cuentas para el ahorro, primas de pensiones', fisica: true, moral: false, regimenes: DEDUCCIONES_PERSONALES },
  D10: { descripcion: 'Pagos por servicios educativos (colegiaturas)', fisica: true, moral: false, regimenes: DEDUCCIONES_PERSONALES },
  S01: { descripcion: 'Sin efectos fiscales', fisica: true, moral: true, regimenes: TODOS },
  CP01: { descripcion: 'Pagos', fisica: true, moral: true, regimenes: TODOS },
};

/** @type {Record<string, string>} */
export const FORMAS_PAGO = {
  '01': 'Efectivo', '02': 'Cheque nominativo', '03': 'Transferencia electrónica de fondos',
  '04': 'Tarjeta de crédito', '28': 'Tarjeta de débito', '31': 'Intermediario pagos', '99': 'Por definir',
};

/** @type {Record<string, string>} */
export const METODOS_PAGO = { PUE: 'Pago en una sola exhibición', PPD: 'Pago en parcialidades o diferido' };

export const RFC_PUBLICO_GENERAL = 'XAXX010101000';
export const RFC_EXTRANJERO = 'XEXX010101000';
