import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { apiRouter } from './routes';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';

export function crearApp() {
  const app = express();

  // Cabeceras de seguridad. La API no sirve HTML, asi que la CSP de helmet
  // (pensada para paginas) no aporta y se desactiva: el HTML lo sirve nginx.
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  // No hay configuracion de CORS: nginx sirve frontend y API bajo el mismo
  // origen, y en desarrollo el proxy del Angular CLI hace lo mismo.
  app.use('/api', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
