import { Router } from 'express';
import { validate } from '../../middlewares/validate';
import { authenticate, authorize } from '../../middlewares/auth';
import {
  crearClienteSchema,
  actualizarClienteSchema,
  listarClientesQuerySchema,
} from './clientes.schemas';
import * as controller from './clientes.controller';

export const clientesRouter = Router();

// Todo el modulo exige sesion. El mecanico puede consultar (necesita ver de
// quien es el vehiculo que atiende) pero no crear ni modificar clientes.
clientesRouter.use(authenticate);

clientesRouter.get('/', validate(listarClientesQuerySchema, 'query'), controller.listar);
clientesRouter.get('/:id', controller.obtener);

clientesRouter.post(
  '/',
  authorize('ADMIN', 'RECEPCIONISTA'),
  validate(crearClienteSchema),
  controller.crear,
);
clientesRouter.put(
  '/:id',
  authorize('ADMIN', 'RECEPCIONISTA'),
  validate(actualizarClienteSchema),
  controller.actualizar,
);
clientesRouter.patch('/:id/reactivar', authorize('ADMIN', 'RECEPCIONISTA'), controller.reactivar);
clientesRouter.delete('/:id', authorize('ADMIN'), controller.desactivar);
