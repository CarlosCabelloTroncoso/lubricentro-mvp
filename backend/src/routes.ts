import { Router } from 'express';
import { authRouter } from './modules/auth/auth.routes';
import { clientesRouter } from './modules/clientes/clientes.routes';
import { vehiculosRouter } from './modules/vehiculos/vehiculos.routes';
import { serviciosRouter } from './modules/servicios/servicios.routes';
import { productosRouter } from './modules/productos/productos.routes';
import { reservasRouter } from './modules/reservas/reservas.routes';
import { ordenesRouter } from './modules/ordenes/ordenes.routes';
import { dashboardRouter } from './modules/dashboard/dashboard.routes';
import { usuariosRouter } from './modules/usuarios/usuarios.routes';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ data: { estado: 'ok' } });
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/clientes', clientesRouter);
apiRouter.use('/vehiculos', vehiculosRouter);
apiRouter.use('/servicios', serviciosRouter);
apiRouter.use('/productos', productosRouter);
apiRouter.use('/reservas', reservasRouter);
apiRouter.use('/ordenes-trabajo', ordenesRouter);
apiRouter.use('/dashboard', dashboardRouter);
apiRouter.use('/usuarios', usuariosRouter);
