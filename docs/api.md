# Contrato de la API

Base: `/api` — En Docker nginx hace proxy al servicio `api`, así que el frontend siempre llama al mismo origen.

## Convenciones

**Respuesta exitosa**

```json
{ "data": { ... } }
{ "data": [ ... ], "meta": { "total": 42, "page": 1, "limit": 20 } }
```

**Respuesta de error**

```json
{ "error": { "code": "CONFLICT", "message": "...", "details": [ ... ] } }
```

| Código HTTP | `code` | Cuándo |
|---|---|---|
| 400 | `BAD_REQUEST` | Falla la validación Zod (`details` trae `campo` y `mensaje`) |
| 401 | `UNAUTHORIZED` | Sin cookie, o token inválido/expirado |
| 403 | `FORBIDDEN` | Rol sin permiso, o mecánico sobre una orden ajena |
| 404 | `NOT_FOUND` | Recurso inexistente |
| 409 | `CONFLICT` | Duplicado, transición de estado inválida, stock insuficiente |
| 500 | `INTERNAL_ERROR` | Error no previsto |

**Autenticación.** JWT de 8 h en cookie `HttpOnly` + `SameSite=Lax`. El frontend nunca lee el token; rehidrata la sesión con `GET /api/auth/me`. Todas las peticiones deben ir con `withCredentials: true`.

**Paginación.** `?page=1&limit=20` en todos los listados.

**Montos.** Enteros en CLP, sin decimales.

---

## Auth

| Método | Ruta | Rol | Cuerpo |
|---|---|---|---|
| POST | `/api/auth/login` | público | `{ email, password }` |
| POST | `/api/auth/logout` | público | — |
| GET | `/api/auth/me` | autenticado | — |

`login` y `me` devuelven `{ id, nombre, email, rol }`.

---

## Clientes

| Método | Ruta | Rol |
|---|---|---|
| GET | `/api/clientes?page&limit&q&activo` | autenticado |
| GET | `/api/clientes/:id` | autenticado |
| POST | `/api/clientes` | ADMIN, RECEPCIONISTA |
| PUT | `/api/clientes/:id` | ADMIN, RECEPCIONISTA |
| PATCH | `/api/clientes/:id/reactivar` | ADMIN, RECEPCIONISTA |
| DELETE | `/api/clientes/:id` | ADMIN |

`DELETE` es **baja lógica** (`activo = false`); nunca borra físicamente.

**Cuerpo** — `rut` (validado con módulo 11 y normalizado a `12345678K`), `nombre`, `apellido`, `telefono?`, `email?`, `direccion?`.

**Respuesta**

```json
{
  "id": 1, "rut": "139258282", "rutFormateado": "13.925.828-2",
  "nombre": "Valentina", "apellido": "Contreras",
  "nombreCompleto": "Valentina Contreras",
  "telefono": "+56950000000", "email": "...", "direccion": "...",
  "activo": true, "createdAt": "2026-08-22T..."
}
```

---

## Vehículos

| Método | Ruta | Rol |
|---|---|---|
| GET | `/api/vehiculos?page&limit&q&clienteId&activo` | autenticado |
| GET | `/api/vehiculos/:id` | autenticado |
| GET | `/api/vehiculos/:id/historial` | autenticado |
| POST | `/api/vehiculos` | ADMIN, RECEPCIONISTA |
| PUT | `/api/vehiculos/:id` | ADMIN, RECEPCIONISTA |
| PATCH | `/api/vehiculos/:id/reactivar` | ADMIN, RECEPCIONISTA |
| DELETE | `/api/vehiculos/:id` | ADMIN |

**Cuerpo** — `clienteId`, `patente` (formato `ABCD12` o `AB1234`, normalizada), `marca`, `modelo`, `anio?`, `color?`, `kilometrajeActual?`.

**Respuesta**

```json
{
  "id": 20, "clienteId": 5, "patente": "KTZG29",
  "marca": "Mitsubishi", "modelo": "L200", "descripcion": "Mitsubishi L200",
  "anio": 2023, "color": "Gris", "kilometrajeActual": 99000, "activo": true,
  "cliente": { "id": 5, "nombreCompleto": "...", "rutFormateado": "..." }
}
```

`GET /:id/historial` devuelve el arreglo de **órdenes COMPLETADAS** de ese vehículo, con sus líneas, de la más reciente a la más antigua. No hay tabla `historial`: es esta consulta.

---

## Servicios

| Método | Ruta | Rol |
|---|---|---|
| GET | `/api/servicios?page&limit&q&activo` | autenticado |
| GET | `/api/servicios/:id` | autenticado |
| POST · PUT · PATCH `/reactivar` · DELETE | `/api/servicios[/:id]` | ADMIN |

**Cuerpo** — `nombre`, `descripcion?`, `precio` (entero CLP).
**Respuesta** — `{ id, nombre, descripcion, precio, activo }`.

---

## Productos e inventario

| Método | Ruta | Rol |
|---|---|---|
| GET | `/api/productos?page&limit&q&activo&bajoMinimo` | autenticado |
| GET | `/api/productos/alertas-stock` | autenticado |
| GET | `/api/productos/:id` | autenticado |
| POST · PUT · PATCH `/reactivar` · DELETE | `/api/productos[/:id]` | ADMIN |
| POST | `/api/productos/:id/ajustar-stock` | ADMIN, RECEPCIONISTA |

**Cuerpo** — `nombre`, `descripcion?`, `precio`, `stockActual?`, `stockMinimo?`.
`ajustar-stock` recibe `{ cantidad }`: positivo repone, negativo corrige a la baja. Pasa por el mismo servicio de inventario que el consumo de una orden.

**Respuesta**

```json
{
  "id": 10, "nombre": "Bateria 12V 60Ah", "precio": 78000,
  "stockActual": 2, "stockMinimo": 5, "bajoMinimo": true, "activo": true
}
```

---

## Reservas

| Método | Ruta | Rol |
|---|---|---|
| GET | `/api/reservas?page&limit&estado&vehiculoId&desde&hasta` | autenticado |
| GET | `/api/reservas/hoy` | autenticado |
| GET | `/api/reservas/:id` | autenticado |
| POST | `/api/reservas` | ADMIN, RECEPCIONISTA |
| PUT | `/api/reservas/:id` | ADMIN, RECEPCIONISTA |
| PATCH | `/api/reservas/:id/estado` | ADMIN, RECEPCIONISTA |

Estados: `PENDIENTE` · `CUMPLIDA` · `CANCELADA`.

**Cuerpo** — `vehiculoId`, `fechaHora` (ISO), `observaciones?`. No lleva `clienteId`: el cliente se obtiene por el vehículo.

`PATCH /estado` solo admite `CANCELADA`. `CUMPLIDA` **no se marca a mano**: la pone el cierre de la orden de trabajo asociada, dentro de su misma transacción.

---

## Órdenes de trabajo

| Método | Ruta | Rol |
|---|---|---|
| GET | `/api/ordenes-trabajo?page&limit&estado&vehiculoId&clienteId&mecanicoId` | autenticado |
| GET | `/api/ordenes-trabajo/:id` | autenticado |
| POST | `/api/ordenes-trabajo` | ADMIN, RECEPCIONISTA |
| PUT | `/api/ordenes-trabajo/:id` | todos |
| PATCH | `/api/ordenes-trabajo/:id/estado` | todos |
| POST | `/api/ordenes-trabajo/:id/servicios` | todos |
| DELETE | `/api/ordenes-trabajo/:id/servicios/:lineaId` | todos |
| POST | `/api/ordenes-trabajo/:id/productos` | todos |
| DELETE | `/api/ordenes-trabajo/:id/productos/:lineaId` | todos |

**Autorización fina:** el `MECANICO` solo ve y opera las órdenes donde es el mecánico asignado. El listado se filtra solo por las suyas; cualquier otra devuelve 403.

**Crear** — `{ vehiculoId, reservaId?, mecanicoId?, kilometraje?, observaciones? }`.
No se envía `clienteId`: se deriva del dueño actual del vehículo, así es imposible desalinearlos.

**Estados y transiciones**

```
ABIERTA ──▶ EN_PROCESO ──▶ COMPLETADA
   │              │
   └──────────────┴──────▶ ANULADA
```

`COMPLETADA` y `ANULADA` son finales: una orden cerrada es el registro histórico y no se reabre.

- Completar exige al menos una línea, sella `fechaCierre`, recalcula el total, sube el kilometraje del vehículo (nunca lo baja) y marca `CUMPLIDA` la reserva asociada.
- Anular **repone a bodega** todos los productos consumidos por la orden.
- Con la orden en estado final, agregar o quitar líneas devuelve 409.

**Líneas** — `POST /servicios` recibe `{ servicioId, cantidad? }`; `POST /productos` recibe `{ productoId, cantidad? }`. Ambos devuelven la orden completa ya recalculada.

Agregar un producto **descuenta stock** en la misma transacción que crea la línea; quitar la línea lo repone. Las líneas son inmutables: para corregir se borran y se vuelven a agregar.
Nombre y precio se guardan como **snapshot**: cambiar el catálogo mañana no altera órdenes ya emitidas.

**Respuesta**

```json
{
  "id": 19, "numero": "OT-000019", "estado": "COMPLETADA", "total": 39000,
  "kilometraje": 99000, "observaciones": null, "reservaId": null,
  "fechaApertura": "2026-08-22T20:17:29.000Z",
  "fechaCierre": "2026-08-22T20:17:40.000Z",
  "cliente":  { "id": 5, "nombreCompleto": "...", "rutFormateado": "..." },
  "vehiculo": { "id": 20, "patente": "KTZG29", "descripcion": "Mitsubishi L200" },
  "mecanico": { "id": 3, "nombre": "Luis Aravena" },
  "servicios": [
    { "id": 35, "nombre": "Cambio de aceite y filtro",
      "precioUnitario": 25000, "cantidad": 1, "subtotal": 25000,
      "servicioId": 1, "productoId": null }
  ],
  "productos": [
    { "id": 12, "nombre": "Filtro de aceite",
      "precioUnitario": 7000, "cantidad": 2, "subtotal": 14000,
      "servicioId": null, "productoId": 3 }
  ]
}
```

El `numero` se formatea desde el `id`; no se almacena. El listado devuelve el mismo objeto **sin** `servicios` ni `productos`.

**El total lo calcula siempre el backend** desde las líneas persistidas. El cliente nunca lo envía.

---

## Dashboard y utilidades

| Método | Ruta | Rol |
|---|---|---|
| GET | `/api/dashboard` | autenticado |
| GET | `/api/usuarios/mecanicos` | autenticado |
| GET | `/api/health` | público |

`GET /api/dashboard` arma la pantalla de inicio en una sola llamada:

```json
{
  "metricas": {
    "clientesActivos": 15, "vehiculosActivos": 20,
    "reservasPendientesHoy": 4, "ordenesAbiertas": 3,
    "ordenesCompletadasHoy": 2, "ingresosHoy": 207000,
    "ingresosMes": 727500, "productosBajoMinimo": 1
  },
  "serviciosMasSolicitados": [ { "nombre": "...", "veces": 5, "ingresos": 140000 } ],
  "alertasStock": [ /* productos activos con stock <= mínimo */ ],
  "reservasHoy":  [ /* reservas PENDIENTE de hoy */ ]
}
```

`GET /api/usuarios/mecanicos` devuelve los usuarios asignables a una orden (`MECANICO` y `ADMIN` activos). La administración de usuarios no entra en el alcance: las cuentas se crean por seed.

---

## Credenciales demo

Password para las cuatro cuentas: `Demo1234`.

| Email | Rol |
|---|---|
| `admin@lubricentro.cl` | ADMIN |
| `recepcion@lubricentro.cl` | RECEPCIONISTA |
| `mecanico@lubricentro.cl` | MECANICO |
| `mecanico2@lubricentro.cl` | MECANICO |
