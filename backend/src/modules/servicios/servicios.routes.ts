import { Router } from 'express';
import { validate } from '../../middlewares/validate';
import { authenticate, authorize } from '../../middlewares/auth';
import {
  crearServicioSchema,
  actualizarServicioSchema,
  listarServiciosQuerySchema,
} from './servicios.schemas';
import * as controller from './servicios.controller';

export const serviciosRouter = Router();

serviciosRouter.use(authenticate);

// Cualquier rol autenticado consulta el catalogo (el mecanico lo necesita para
// armar la orden); solo ADMIN mantiene precios.
serviciosRouter.get('/', validate(listarServiciosQuerySchema, 'query'), controller.listar);
serviciosRouter.get('/:id', controller.obtener);

serviciosRouter.post('/', authorize('ADMIN'), validate(crearServicioSchema), controller.crear);
serviciosRouter.put('/:id', authorize('ADMIN'), validate(actualizarServicioSchema), controller.actualizar);
serviciosRouter.patch('/:id/reactivar', authorize('ADMIN'), controller.reactivar);
serviciosRouter.delete('/:id', authorize('ADMIN'), controller.desactivar);
