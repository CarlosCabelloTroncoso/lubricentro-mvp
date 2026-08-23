/**
 * Validacion de RUT chileno (modulo 11). Se guarda normalizado:
 * sin puntos ni guion y con el digito verificador en mayuscula ("12345678K").
 */
export function normalizarRut(rut: string): string {
  return rut.replace(/[^0-9kK]/g, '').toUpperCase();
}

/** Digito verificador de un cuerpo numerico, segun modulo 11. */
export function calcularDv(cuerpo: string): string {
  let suma = 0;
  let multiplicador = 2;

  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }

  const resto = 11 - (suma % 11);
  if (resto === 11) return '0';
  if (resto === 10) return 'K';
  return String(resto);
}

export function esRutValido(rut: string): boolean {
  const limpio = normalizarRut(rut);
  if (limpio.length < 8 || limpio.length > 9) return false;

  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  if (!/^\d+$/.test(cuerpo)) return false;

  return dv === calcularDv(cuerpo);
}

/** Formato de presentacion: 12.345.678-9 */
export function formatearRut(rut: string): string {
  const limpio = normalizarRut(rut);
  const cuerpo = limpio.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${cuerpo}-${limpio.slice(-1)}`;
}
