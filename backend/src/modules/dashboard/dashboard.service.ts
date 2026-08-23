import * as productosService from '../productos/productos.service';
import * as reservasService from '../reservas/reservas.service';
import * as repo from './dashboard.repository';

/**
 * Una sola llamada arma toda la pantalla de inicio. Las consultas son
 * independientes entre si, asi que van en paralelo.
 */
export async function resumen() {
  const [
    clientesActivos,
    vehiculosActivos,
    reservasPendientesHoy,
    ordenesAbiertas,
    ordenesCompletadasHoy,
    ingresosHoy,
    ingresosMes,
    alertasStock,
    serviciosTop,
    reservasHoy,
  ] = await Promise.all([
    repo.contarClientesActivos(),
    repo.contarVehiculosActivos(),
    repo.contarReservasPendientesHoy(),
    repo.contarOrdenesAbiertas(),
    repo.contarOrdenesCompletadasHoy(),
    repo.ingresosDelDia(),
    repo.ingresosDelMes(),
    productosService.alertasStock(),
    repo.serviciosMasSolicitados(5),
    reservasService.pendientesDeHoy(),
  ]);

  return {
    metricas: {
      clientesActivos,
      vehiculosActivos,
      reservasPendientesHoy,
      ordenesAbiertas,
      ordenesCompletadasHoy,
      ingresosHoy,
      ingresosMes,
      productosBajoMinimo: alertasStock.length,
    },
    serviciosMasSolicitados: serviciosTop.map((fila) => ({
      nombre: fila.nombre,
      veces: Number(fila.veces),
      ingresos: Number(fila.ingresos),
    })),
    alertasStock,
    reservasHoy,
  };
}
