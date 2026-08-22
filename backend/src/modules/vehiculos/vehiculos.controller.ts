import type { Request, Response } from 'express';
import { ok, creado, sinContenido } from '../../shared/http';
import { datosValidados } from '../../middlewares/validate';
import * as service from './vehiculos.service';
import * as ordenesService from '../ordenes/ordenes.service';
import type { ListarVehiculosQuery } from './vehiculos.schemas';

export async function listar(req: Request, res: Response): Promise<void> {
  const filtros = datosValidados<ListarVehiculosQuery>(req, 'query');
  const { items, meta } = await service.listar(filtros);
  ok(res, items, meta);
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

export async function desactivar(req: Request, res: Response): Promise<void> {
  await service.desactivar(Number(req.params.id));
  sinContenido(res);
}

export async function reactivar(req: Request, res: Response): Promise<void> {
  ok(res, await service.reactivar(Number(req.params.id)));
}

/**
 * Historial del vehiculo. No hay tabla `historial`: es la consulta de las
 * ordenes completadas de ese vehiculo.
 */
export async function historial(req: Request, res: Response): Promise<void> {
  const vehiculoId = Number(req.params.id);
  await service.obtener(vehiculoId);
  ok(res, await ordenesService.historialPorVehiculo(vehiculoId));
}
