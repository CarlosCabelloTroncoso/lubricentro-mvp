/**
 * Runner de migraciones minimo, forward-only.
 *
 * Lee los archivos .sql numerados de ./migrations, consulta cuales ya se
 * aplicaron en la tabla schema_migrations y ejecuta los pendientes en orden.
 * No hay rollback: para deshacer algo se escribe una migracion nueva.
 *
 * Se prefirio esto a una herramienta externa porque son ~60 lineas explicables
 * en una entrevista y evita una dependencia mas.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import mysql from 'mysql2/promise';
import { env } from '../config/env';

/**
 * En desarrollo (tsx) los .sql estan junto al .ts. Compilado, tsc no copia los
 * .sql a dist/, asi que se cae de vuelta a la carpeta de fuentes.
 */
function carpetaMigraciones(): string {
  const candidatas = [
    join(__dirname, 'migrations'),
    join(__dirname, '..', '..', 'src', 'db', 'migrations'),
  ];
  const encontrada = candidatas.find((ruta) => existsSync(ruta));
  if (!encontrada) throw new Error('No se encontro la carpeta de migraciones');
  return encontrada;
}

export async function migrar(): Promise<void> {
  const cx = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    multipleStatements: true,
  });

  try {
    await cx.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        nombre     VARCHAR(150) NOT NULL,
        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (nombre)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    const [filas] = await cx.query<mysql.RowDataPacket[]>(
      'SELECT nombre FROM schema_migrations',
    );
    const aplicadas = new Set(filas.map((f) => f.nombre as string));

    const carpeta = carpetaMigraciones();
    const archivos = readdirSync(carpeta)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    let ejecutadas = 0;
    for (const archivo of archivos) {
      if (aplicadas.has(archivo)) continue;

      const sql = readFileSync(join(carpeta, archivo), 'utf8');
      console.log(`Aplicando migracion ${archivo}...`);
      await cx.query(sql);
      await cx.query('INSERT INTO schema_migrations (nombre) VALUES (?)', [archivo]);
      ejecutadas++;
    }

    console.log(
      ejecutadas === 0
        ? 'Base de datos al dia, no hay migraciones pendientes.'
        : `${ejecutadas} migracion(es) aplicada(s).`,
    );
  } finally {
    await cx.end();
  }
}

// Permite ejecutarlo como script (npm run migrate) y tambien importarlo desde server.ts.
if (require.main === module) {
  migrar()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fallo la migracion:', error);
      process.exit(1);
    });
}
