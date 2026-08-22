import { Router } from 'express';
import { validate } from '../../middlewares/validate';
import { authenticate, authorize } from '../../middlewares/auth';
import {
  actualizarOrdenSchema,
  agregarProductoSchema,
  agregarServicioSchema,
  cambiarEstadoSchema,
  crearOrdenSchema,
  listarOrdenesQuerySchema,
} from './ordenes.schemas';
import * as controller from './ordenes.controller';

export const ordenesRouter = Router();

ordenesRouter.use(authenticate);

// El mecanico trabaja la orden (lineas y estado) pero no la abre: eso es
// recepcion. La restriccion fina de "solo sus ordenes" la aplica el service.
const OPERADORES = ['ADMIN', 'RECEPCIONISTA', 'MECANICO'] as const;

ordenesRouter.get('/', validate(listarOrdenesQuerySchema, 'query'), controller.listar);
ordenesRouter.get('/:id', controller.obtener);

ordenesRouter.post(
  '/',
  authorize('ADMIN', 'RECEPCIONISTA'),
  validate(crearOrdenSchema),
  controller.crear,
);
ordenesRouter.put(
  '/:id',
  authorize(...OPERADORES),
  validate(actualizarOrdenSchema),
  controller.actualizar,
);
ordenesRouter.patch(
  '/:id/estado',
  authorize(...OPERADORES),
  validate(cambiarEstadoSchema),
  controller.cambiarEstado,
);

ordenesRouter.post(
  '/:id/servicios',
  authorize(...OPERADORES),
  validate(agregarServicioSchema),
  controller.agregarServicio,
);
ordenesRouter.delete('/:id/servicios/:lineaId', authorize(...OPERADORES), controller.quitarServicio);

ordenesRouter.post(
  '/:id/productos',
  authorize(...OPERADORES),
  validate(agregarProductoSchema),
  controller.agregarProducto,
);
ordenesRouter.delete('/:id/productos/:lineaId', authorize(...OPERADORES), controller.quitarProducto);
