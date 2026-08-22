import { Router } from 'express';
import { validate } from '../../middlewares/validate';
import { authenticate, authorize } from '../../middlewares/auth';
import {
  crearVehiculoSchema,
  actualizarVehiculoSchema,
  listarVehiculosQuerySchema,
} from './vehiculos.schemas';
import * as controller from './vehiculos.controller';

export const vehiculosRouter = Router();

vehiculosRouter.use(authenticate);

vehiculosRouter.get('/', validate(listarVehiculosQuerySchema, 'query'), controller.listar);
vehiculosRouter.get('/:id', controller.obtener);
vehiculosRouter.get('/:id/historial', controller.historial);

vehiculosRouter.post(
  '/',
  authorize('ADMIN', 'RECEPCIONISTA'),
  validate(crearVehiculoSchema),
  controller.crear,
);
vehiculosRouter.put(
  '/:id',
  authorize('ADMIN', 'RECEPCIONISTA'),
  validate(actualizarVehiculoSchema),
  controller.actualizar,
);
vehiculosRouter.patch('/:id/reactivar', authorize('ADMIN', 'RECEPCIONISTA'), controller.reactivar);
vehiculosRouter.delete('/:id', authorize('ADMIN'), controller.desactivar);
