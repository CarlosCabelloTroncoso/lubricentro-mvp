import { Router } from 'express';
import { validate } from '../../middlewares/validate';
import { authenticate, authorize } from '../../middlewares/auth';
import {
  actualizarReservaSchema,
  cambiarEstadoReservaSchema,
  crearReservaSchema,
  listarReservasQuerySchema,
} from './reservas.schemas';
import * as controller from './reservas.controller';

export const reservasRouter = Router();

reservasRouter.use(authenticate);

reservasRouter.get('/', validate(listarReservasQuerySchema, 'query'), controller.listar);
reservasRouter.get('/hoy', controller.hoy);
reservasRouter.get('/:id', controller.obtener);

reservasRouter.post(
  '/',
  authorize('ADMIN', 'RECEPCIONISTA'),
  validate(crearReservaSchema),
  controller.crear,
);
reservasRouter.put(
  '/:id',
  authorize('ADMIN', 'RECEPCIONISTA'),
  validate(actualizarReservaSchema),
  controller.actualizar,
);
reservasRouter.patch(
  '/:id/estado',
  authorize('ADMIN', 'RECEPCIONISTA'),
  validate(cambiarEstadoReservaSchema),
  controller.cambiarEstado,
);
