import { Router } from 'express';
import { validate } from '../../middlewares/validate';
import { authenticate, authorize } from '../../middlewares/auth';
import {
  crearProductoSchema,
  actualizarProductoSchema,
  ajustarStockSchema,
  listarProductosQuerySchema,
} from './productos.schemas';
import * as controller from './productos.controller';

export const productosRouter = Router();

productosRouter.use(authenticate);

productosRouter.get('/', validate(listarProductosQuerySchema, 'query'), controller.listar);
productosRouter.get('/alertas-stock', controller.alertas);
productosRouter.get('/:id', controller.obtener);

productosRouter.post('/', authorize('ADMIN'), validate(crearProductoSchema), controller.crear);
productosRouter.put('/:id', authorize('ADMIN'), validate(actualizarProductoSchema), controller.actualizar);
// La recepcion de mercaderia la hace tambien recepcion, no solo el admin.
productosRouter.post(
  '/:id/ajustar-stock',
  authorize('ADMIN', 'RECEPCIONISTA'),
  validate(ajustarStockSchema),
  controller.ajustarStock,
);
productosRouter.patch('/:id/reactivar', authorize('ADMIN'), controller.reactivar);
productosRouter.delete('/:id', authorize('ADMIN'), controller.desactivar);
