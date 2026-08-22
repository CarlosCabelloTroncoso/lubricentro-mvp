/**
 * Patentes chilenas. Se aceptan el formato actual (LLLL##, desde 2007) y el
 * antiguo (LL####). Se normalizan en mayusculas y sin guion.
 */
const FORMATO_ACTUAL = /^[BCDFGHJKLPRSTVWXYZ]{4}\d{2}$/;
const FORMATO_ANTIGUO = /^[A-Z]{2}\d{4}$/;

export function normalizarPatente(patente: string): string {
  return patente.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

export function esPatenteValida(patente: string): boolean {
  const limpia = normalizarPatente(patente);
  return FORMATO_ACTUAL.test(limpia) || FORMATO_ANTIGUO.test(limpia);
}
