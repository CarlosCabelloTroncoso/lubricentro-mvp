import { Router } from 'express';
import { authenticate } from '../../middlewares/auth';
import { ok } from '../../shared/http';
import * as repo from './usuarios.repository';

export const usuariosRouter = Router();

/**
 * Solo se expone la lista de usuarios asignables a una orden.
 * La administracion completa de usuarios no entra en el alcance del MVP:
 * las cuentas se crean por seed.
 */
usuariosRouter.get('/mecanicos', authenticate, async (_req, res) => {
  ok(res, await repo.listarMecanicos());
});
