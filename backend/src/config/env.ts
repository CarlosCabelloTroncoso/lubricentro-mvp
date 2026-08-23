/**
 * Lectura y validacion de variables de entorno.
 * Node 24 carga el archivo .env con la bandera --env-file, por eso no se usa dotenv.
 * Si falta una variable obligatoria el proceso muere al arrancar, no a mitad de una request.
 */
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_NAME: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const detalle = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  console.error(`Configuracion de entorno invalida:\n${detalle}`);
  process.exit(1);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === 'production';

/** Vigencia del JWT. Es una regla de negocio, no configuracion del ambiente. */
export const JWT_EXPIRES_IN_SECONDS = 8 * 60 * 60;
