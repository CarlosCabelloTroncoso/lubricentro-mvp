import type { Request, Response } from 'express';
import { ok, creado } from '../../shared/http';
import { datosValidados } from '../../middlewares/validate';
import * as service from './ordenes.service';
import type { ListarOrdenesQuery } from './ordenes.schemas';

/** El actor sale del token; authenticate ya garantizo que existe. */
function actor(req: Request): service.Actor {
  return { id: req.usuario!.id, rol: req.usuario!.rol };
}

export async function listar(req: Request, res: Response): Promise<void> {
  const filtros = datosValidados<ListarOrdenesQuery>(req, 'query');
  const { items, meta } = await service.listar(filtros, actor(req));
  ok(res, items, meta);
}

export async function obtener(req: Request, res: Response): Promise<void> {
  ok(res, await service.obtener(Number(req.params.id), actor(req)));
}

export async function crear(req: Request, res: Response): Promise<void> {
  creado(res, await service.crear(req.body, actor(req)));
}

export async function actualizar(req: Request, res: Response): Promise<void> {
  ok(res, await service.actualizar(Number(req.params.id), req.body, actor(req)));
}

export async function cambiarEstado(req: Request, res: Response): Promise<void> {
  ok(res, await service.cambiarEstado(Number(req.params.id), req.body.estado, actor(req)));
}

export async function agregarServicio(req: Request, res: Response): Promise<void> {
  creado(res, await service.agregarServicio(Number(req.params.id), req.body, actor(req)));
}

export async function quitarServicio(req: Request, res: Response): Promise<void> {
  ok(
    res,
    await service.quitarServicio(Number(req.params.id), Number(req.params.lineaId), actor(req)),
  );
}

export async function agregarProducto(req: Request, res: Response): Promise<void> {
  creado(res, await service.agregarProducto(Number(req.params.id), req.body, actor(req)));
}

export async function quitarProducto(req: Request, res: Response): Promise<void> {
  ok(
    res,
    await service.quitarProducto(Number(req.params.id), Number(req.params.lineaId), actor(req)),
  );
}
