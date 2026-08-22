import { Router } from 'express';
import { authenticate } from '../../middlewares/auth';
import { ok } from '../../shared/http';
import * as service from './dashboard.service';

export const dashboardRouter = Router();

// Todos los roles ven el dashboard; el mecanico lo usa como tablero del taller.
dashboardRouter.get('/', authenticate, async (_req, res) => {
  ok(res, await service.resumen());
});
