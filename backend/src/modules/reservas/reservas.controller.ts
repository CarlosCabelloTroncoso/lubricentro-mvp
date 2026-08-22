import type { Request, Response } from 'express';
import { ok, creado } from '../../shared/http';
import { datosValidados } from '../../middlewares/validate';
import * as service from './reservas.service';
import type { ListarReservasQuery } from './reservas.schemas';

export async function listar(req: Request, res: Response): Promise<void> {
  const filtros = datosValidados<ListarReservasQuery>(req, 'query');
  const { items, meta } = await service.listar(filtros);
  ok(res, items, meta);
}

export async function hoy(_req: Request, res: Response): Promise<void> {
  ok(res, await service.pendientesDeHoy());
}

export async function obtener(req: Request, res: Response): Promise<void> {
  ok(res, await service.obtener(Number(req.params.id)));
}

export async function crear(req: Request, res: Response): Promise<void> {
  creado(res, await service.crear(req.body));
}

export async function actualizar(req: Request, res: Response): Promise<void> {
  ok(res, await service.actualizar(Number(req.params.id), req.body));
}

export async function cambiarEstado(req: Request, res: Response): Promise<void> {
  ok(res, await service.cambiarEstado(Number(req.params.id), req.body.estado));
}
