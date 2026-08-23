import type { RowDataPacket } from 'mysql2';
import { pool } from '../../db/pool';

/**
 * Consultas de agregacion del dashboard. Todas las metricas salen de datos
 * reales del sistema; no hay indicadores inventados.
 */

async function escalar(sql: string, valores: unknown[] = []): Promise<number> {
  const [filas] = await pool.query<RowDataPacket[]>(sql, valores);
  return Number(filas[0]?.valor ?? 0);
}

export function contarClientesActivos(): Promise<number> {
  return escalar('SELECT COUNT(*) AS valor FROM clientes WHERE activo = TRUE');
}

export function contarVehiculosActivos(): Promise<number> {
  return escalar('SELECT COUNT(*) AS valor FROM vehiculos WHERE activo = TRUE');
}

export function contarReservasPendientesHoy(): Promise<number> {
  return escalar(
    `SELECT COUNT(*) AS valor FROM reservas
     WHERE estado = 'PENDIENTE' AND DATE(fecha_hora) = CURDATE()`,
  );
}

/** "Abiertas" incluye EN_PROCESO: es el trabajo vivo del taller. */
export function contarOrdenesAbiertas(): Promise<number> {
  return escalar(
    `SELECT COUNT(*) AS valor FROM ordenes_trabajo WHERE estado IN ('ABIERTA', 'EN_PROCESO')`,
  );
}

export function contarOrdenesCompletadasHoy(): Promise<number> {
  return escalar(
    `SELECT COUNT(*) AS valor FROM ordenes_trabajo
     WHERE estado = 'COMPLETADA' AND DATE(fecha_cierre) = CURDATE()`,
  );
}

export function ingresosDelDia(): Promise<number> {
  return escalar(
    `SELECT COALESCE(SUM(total), 0) AS valor FROM ordenes_trabajo
     WHERE estado = 'COMPLETADA' AND DATE(fecha_cierre) = CURDATE()`,
  );
}

export function ingresosDelMes(): Promise<number> {
  return escalar(
    `SELECT COALESCE(SUM(total), 0) AS valor FROM ordenes_trabajo
     WHERE estado = 'COMPLETADA'
       AND YEAR(fecha_cierre) = YEAR(CURDATE())
       AND MONTH(fecha_cierre) = MONTH(CURDATE())`,
  );
}

export interface ServicioSolicitadoRow extends RowDataPacket {
  nombre: string;
  veces: number;
  ingresos: number;
}

/**
 * Se agrupa por el nombre guardado en la linea (snapshot), no por servicio_id:
 * es lo que efectivamente se vendio con ese nombre y ese precio.
 */
export async function serviciosMasSolicitados(limite = 5): Promise<ServicioSolicitadoRow[]> {
  const [filas] = await pool.query<ServicioSolicitadoRow[]>(
    `SELECT os.nombre,
            SUM(os.cantidad) AS veces,
            SUM(os.subtotal) AS ingresos
     FROM orden_servicios os
     JOIN ordenes_trabajo o ON o.id = os.orden_id
     WHERE o.estado = 'COMPLETADA'
     GROUP BY os.nombre
     ORDER BY veces DESC
     LIMIT ?`,
    [limite],
  );
  return filas;
}
