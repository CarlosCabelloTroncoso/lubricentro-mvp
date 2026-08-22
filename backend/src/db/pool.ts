/**
 * Pool de conexiones MySQL compartido por toda la aplicacion.
 * Se usa SQL explicito con placeholders `?`; nunca interpolacion de strings.
 */
import mysql from 'mysql2/promise';
import { env } from '../config/env';

export const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  timezone: 'Z',
  // Los montos son INT y los ids BIGINT; sin esto mysql2 devuelve strings para DECIMAL.
  decimalNumbers: true,
});

/** Ejecuta un callback dentro de una transaccion y libera la conexion pase lo que pase. */
export async function withTransaction<T>(
  fn: (cx: mysql.PoolConnection) => Promise<T>,
): Promise<T> {
  const cx = await pool.getConnection();
  try {
    await cx.beginTransaction();
    const resultado = await fn(cx);
    await cx.commit();
    return resultado;
  } catch (error) {
    await cx.rollback();
    throw error;
  } finally {
    cx.release();
  }
}

/** Espera a que MySQL acepte conexiones. El contenedor api arranca antes que la BD este lista. */
export async function esperarConexion(intentos = 30, esperaMs = 2000): Promise<void> {
  for (let i = 1; i <= intentos; i++) {
    try {
      const cx = await pool.getConnection();
      await cx.ping();
      cx.release();
      return;
    } catch (error) {
      if (i === intentos) throw error;
      console.log(`Esperando a MySQL (${i}/${intentos})...`);
      await new Promise((r) => setTimeout(r, esperaMs));
    }
  }
}
