/**
 * Arranque del proceso.
 *
 * En el contenedor la API parte junto a MySQL: por eso espera la conexion,
 * corre las migraciones pendientes y siembra datos antes de escuchar. Asi el
 * evaluador ejecuta `docker compose up --build` y la aplicacion queda usable
 * sin ningun paso manual.
 */
import { crearApp } from './app';
import { env } from './config/env';
import { esperarConexion, pool } from './db/pool';
import { migrar } from './db/migrate';
import { sembrar } from './db/seed';

async function main(): Promise<void> {
  await esperarConexion();
  await migrar();
  await sembrar();

  const app = crearApp();
  const server = app.listen(env.PORT, () => {
    console.log(`API escuchando en http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });

  const apagar = async (senal: string): Promise<void> => {
    console.log(`${senal} recibido, cerrando...`);
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => void apagar('SIGTERM'));
  process.on('SIGINT', () => void apagar('SIGINT'));
}

main().catch((error) => {
  console.error('No se pudo iniciar la API:', error);
  process.exit(1);
});
