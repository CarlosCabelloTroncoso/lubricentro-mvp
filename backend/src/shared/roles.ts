/** Los tres unicos roles del sistema (CLAUDE.md seccion 10). */
export const ROLES = ['ADMIN', 'RECEPCIONISTA', 'MECANICO'] as const;
export type Rol = (typeof ROLES)[number];
