# Lubricentro MVP

Sistema de gestión para un lubricentro: clientes, vehículos, catálogo de servicios y productos, órdenes de trabajo con control de stock, y un dashboard con métricas reales del negocio.

## Índice

- [Funcionalidades](#funcionalidades)
- [Stack](#stack)
- [Arquitectura](#arquitectura)
- [Flujo principal](#flujo-principal)
- [Roles y permisos](#roles-y-permisos)
- [Ejecución con Docker](#ejecución-con-docker)
- [Desarrollo local](#desarrollo-local)
- [Variables de entorno](#variables-de-entorno)
- [Credenciales demo](#credenciales-demo)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Decisiones técnicas](#decisiones-técnicas)
- [API](#api)
- [Limitaciones y roadmap](#limitaciones-y-roadmap)

## Funcionalidades

- **Autenticación** con JWT en cookie `HttpOnly`, sesión rehidratada vía `GET /api/auth/me`, tres roles con permisos distintos.
- **Clientes**: alta, edición, búsqueda, baja lógica. Validación de RUT chileno (módulo 11).
- **Vehículos**: asociados a un cliente, patente normalizada (formato actual y antiguo), historial de órdenes completadas en la ficha del vehículo.
- **Servicios y productos**: catálogos con precio, y en productos además stock actual/mínimo con alertas.
- **Órdenes de trabajo**: el núcleo del sistema. Se crean sobre un vehículo, se les agregan líneas de servicio y producto (con snapshot de nombre y precio), el total se recalcula en el backend en cada cambio, y el descuento/reposición de stock ocurre dentro de la misma transacción que la línea. Máquina de estados `ABIERTA → EN_PROCESO → COMPLETADA` (o `ANULADA`, que repone el stock consumido).
- **Dashboard**: métricas reales — clientes y vehículos activos, reservas del día, órdenes abiertas/completadas, ingresos del día y del mes, servicios más solicitados, alertas de stock.
- **Diseño responsive**: sidebar fijo en desktop, drawer colapsable en tablet/móvil; tablas con scroll horizontal contenido y columnas secundarias ocultas en pantallas chicas; formularios a una columna en móvil.

El módulo de **reservas** existe completo en el backend (CRUD, vínculo 1:0..1 con la orden de trabajo, se marca `CUMPLIDA` automáticamente al completar la orden asociada) pero no tiene pantalla propia en el frontend — ver [Limitaciones y roadmap](#limitaciones-y-roadmap).

## Stack

| Capa | Tecnología | Versión |
|---|---|---|
| Frontend | Angular (standalone, signals) | 21.2.21 |
| UI | PrimeNG + tema Aura | 21.1.9 |
| Backend | Node.js + Express | 24 LTS / 5.2.1 |
| Validación | Zod | 4.4.3 |
| Base de datos | MySQL | 8.4.11 |
| Cliente MySQL | mysql2 | 3.23.4 |
| Auth | jsonwebtoken + bcryptjs | 9.0.3 / 3.0.3 |
| Infraestructura | Docker + Docker Compose + nginx | — |

## Arquitectura

**Backend** — capas en un solo sentido: `route → middleware → controller → service → repository`, organizadas por módulo de dominio (`modules/clientes`, `modules/ordenes`, etc.), no por tipo técnico. Sin ORM: SQL explícito parametrizado con `mysql2`, por explicabilidad y para tener control directo de transacciones e índices. El único punto de mutación de stock es `modules/inventario/inventario.service.ts`, usado tanto por el consumo de una orden como por el ajuste manual de productos — así cualquier evolución del inventario (kardex, `movimientos_inventario`) es aditiva y no toca el módulo de órdenes.

**Frontend** — standalone components con *signals* para estado local, sin NgRx (no hace falta para el tamaño de esta app). Servicios delgados que envuelven `HttpClient` y devuelven promesas. Reactive Forms con Zod-equivalentes en Angular (`Validators`). Autorización replicada en la UI (ocultar botones que el backend rechazaría) pero la fuente de verdad de permisos es siempre el backend.

**Infraestructura** — un único `docker-compose.yml` con tres servicios:

```
navegador → [web: nginx :80] → sirve Angular
                              → proxy /api → [api: Express :3000] → [db: MySQL :3306]
```

nginx sirve el build de Angular y hace de proxy reverso hacia la API bajo el mismo origen — así no hay CORS que configurar ni problemas de `SameSite` con la cookie de sesión. En desarrollo local el proxy del Angular CLI (`proxy.conf.json`) cumple el mismo rol.

## Flujo principal

```
Cliente → Vehículo → Orden de trabajo → Servicios + Productos
   → Total (calculado por el backend) → Completar → Historial del vehículo
```

Reglas relevantes de este flujo:

- El **cliente de la orden se deriva del dueño actual del vehículo** — no se envía por separado, así es imposible que queden desalineados.
- Las líneas de servicio/producto guardan **snapshot** de nombre y precio: si el catálogo cambia después, las órdenes ya emitidas no se alteran.
- Agregar un producto **descuenta stock** dentro de la misma transacción que crea la línea; quitarlo lo repone. Anular una orden repone todo lo consumido.
- El **total nunca lo envía el cliente**: se recalcula en el servidor sumando las líneas persistidas.
- Completar una orden exige al menos una línea, sella la fecha de cierre, sube el kilometraje del vehículo (nunca lo baja) y — si la orden viene de una reserva — la marca `CUMPLIDA`.
- El **historial no es una tabla aparte**: es la consulta de las órdenes `COMPLETADA` de un vehículo, mostrada en su ficha.

## Roles y permisos

| Acción | ADMIN | RECEPCIONISTA | MECANICO |
|---|:---:|:---:|:---:|
| Ver dashboard, catálogos, historial | ✅ | ✅ | ✅ |
| Crear/editar clientes y vehículos | ✅ | ✅ | ❌ |
| Desactivar clientes/vehículos/catálogos | ✅ | ❌ | ❌ |
| Mantener servicios y productos (precio, alta) | ✅ | ❌ | ❌ |
| Ajustar stock (recepción de mercadería) | ✅ | ✅ | ❌ |
| Crear una orden de trabajo | ✅ | ✅ | ❌ |
| Agregar líneas / cambiar estado de una orden | ✅ | ✅ | solo **sus** órdenes asignadas |
| Ver el listado de órdenes | todas | todas | solo las suyas |

La autorización gruesa (por rol) vive en un middleware; la fina (un mecánico solo opera sus propias órdenes) vive en el service, porque requiere consultar el recurso antes de decidir.

## Ejecución con Docker

Requiere Docker y Docker Compose. No hace falta tener Node ni MySQL instalados en la máquina.

```bash
git clone <repo>
cd lubricentro-mvp
cp .env.example .env
docker compose up --build
```

Al terminar de levantar:

- **App**: http://localhost
- **API** (para pruebas directas): http://localhost/api/health

El contenedor `api` espera a que MySQL esté disponible, corre las migraciones pendientes y siembra datos de demostración automáticamente al arrancar — no hace falta ningún paso manual. Los datos persisten en un volumen (`db_data`) entre reinicios; el seed solo se ejecuta si la base está vacía.

Para parar todo: `docker compose down` (agregar `-v` si además querés borrar los datos y volver a sembrar desde cero).

## Desarrollo local

Pensado para iterar rápido sin reconstruir imágenes: MySQL corre en Docker, Angular y Express corren en la máquina.

```bash
# 1. Base de datos
docker compose up -d db

# 2. Backend (http://localhost:3000)
cd backend
npm install
npm run migrate
npm run seed
npm run dev

# 3. Frontend (http://localhost:4200, con proxy /api -> :3000)
cd frontend
npm install
npm start
```

En este modo el `.env` de la raíz ya trae `DB_HOST=localhost` y `DB_PORT=3307` (MySQL de Docker expuesto en ese puerto del host, porque el 3306 nativo de Windows suele estar ocupado).

## Variables de entorno

Un solo `.env` en la raíz (Docker Compose lo lee automáticamente; los scripts de `backend/` también, vía `--env-file`). Ver [`.env.example`](.env.example) para la lista completa con comentarios.

| Variable | Para qué | Sensible |
|---|---|:---:|
| `NODE_ENV` | Nivel de detalle de errores devueltos por la API | no |
| `PORT` | Puerto de Express | no |
| `DB_HOST` / `DB_PORT` | Dirección de MySQL (distinta en dev vs. dentro de Docker) | no |
| `DB_USER` / `DB_PASSWORD` / `DB_NAME` | Credenciales de la base de datos | sí |
| `MYSQL_ROOT_PASSWORD` | Root de MySQL, solo la usa la imagen al inicializarse | sí |
| `JWT_SECRET` | Clave HMAC para firmar el JWT de sesión | sí |

Dentro de `docker-compose.yml`, el servicio `api` sobreescribe `DB_HOST`/`DB_PORT` con `db`/`3306` (topología de red interna de Docker), no con lo que diga el `.env` para desarrollo local.

## Credenciales demo

Contraseña para las cuatro cuentas sembradas: **`Demo1234`**

| Email | Rol |
|---|---|
| `admin@lubricentro.cl` | ADMIN |
| `recepcion@lubricentro.cl` | RECEPCIONISTA |
| `mecanico@lubricentro.cl` | MECANICO |
| `mecanico2@lubricentro.cl` | MECANICO |

El seed también carga 15 clientes, 20 vehículos, catálogos de servicios/productos (uno bajo el stock mínimo a propósito, para ver la alerta) y órdenes de trabajo repartidas en los últimos 60 días en todos los estados.

## Estructura del proyecto

```
lubricentro-mvp/
├── docker-compose.yml
├── .env.example
├── docs/
│   └── api.md                  # contrato completo de la API REST
├── backend/
│   ├── Dockerfile
│   └── src/
│       ├── config/              # variables de entorno validadas con Zod
│       ├── db/
│       │   ├── migrations/      # *.sql numerados, forward-only
│       │   ├── migrate.ts       # runner propio (~60 líneas)
│       │   ├── seed.ts          # datos de demostración
│       │   └── pool.ts          # pool mysql2 + helper de transacciones
│       ├── middlewares/         # auth, validate, errorHandler
│       ├── modules/              # un módulo por entidad de dominio
│       │   └── <modulo>/
│       │       ├── *.routes.ts
│       │       ├── *.controller.ts
│       │       ├── *.service.ts
│       │       ├── *.repository.ts
│       │       └── *.schemas.ts  # validación Zod
│       └── shared/               # errores tipados, RUT, patente, envelope HTTP
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    └── src/app/
        ├── core/
        │   ├── models/           # DTOs, espejo de docs/api.md
        │   ├── services/         # wrappers de HttpClient
        │   ├── guards/           # authGuard / guestGuard
        │   └── interceptors/     # cookie + manejo de errores
        ├── layout/shell/         # sidebar/drawer + topbar
        └── features/             # una carpeta por pantalla
```

## Decisiones técnicas

- **MySQL sin ORM**, en vez de Prisma/TypeORM: el dominio es relacional (clientes-vehículos-órdenes con integridad referencial real) y una transacción ACID de varias tablas al consumir stock es exactamente lo que MySQL resuelve bien. Repositorios delgados con SQL parametrizado explícito (`?`, nunca interpolación) mantienen el código explicable sin la capa de abstracción de un ORM.
- **Runner de migraciones propio** en vez de una herramienta externa: forward-only, tabla `schema_migrations`, ~60 líneas totales. Suficiente para el alcance del proyecto y fácil de explicar completo.
- **JWT en cookie `HttpOnly`, sin refresh token**: sesión de 8 horas, el frontend nunca ve ni almacena el token. Se prefirió simplicidad sobre el patrón access+refresh, que resuelve un problema (revocación, rotación) que este MVP no tiene.
- **Angular 21 + PrimeNG 21**, no las versiones más nuevas: PrimeNG 22 (y `primeicons` 8) pasaron a requerir una licencia de PrimeUI para uso comercial. La rama 21 es la última 100% MIT, y así el proyecto se puede clonar y ejecutar sin que la empresa evaluadora necesite ninguna clave.
- **`bcryptjs` en vez de `bcrypt`**: mismo resultado, sin módulo nativo que compilar — la imagen de backend puede ser `alpine` sin toolchain de compilación.
- **Signals + servicios en el frontend, sin NgRx**: el estado de esta app es mayormente "datos de una lista/formulario en una pantalla a la vez"; una librería de estado global habría sido complejidad sin beneficio real.
- **Un único `docker-compose.yml`** orientado al evaluador (no hay variantes `.dev`/`.prod`): en desarrollo simplemente se levanta solo el servicio `db` y el resto corre en local.

## API

El contrato completo de la API REST — todos los endpoints, formas de request/response, códigos de error y reglas de autorización por ruta — está documentado en [`docs/api.md`](docs/api.md).

## Limitaciones y roadmap

Fuera de alcance deliberadamente para este MVP (documentado, no olvidado):

- **Reservas**: backend completo y probado, sin pantalla en el frontend.
- **Inventario P1**: tabla `movimientos_inventario` (kardex de auditoría) no implementada; el stock actual sí es siempre correcto, pero no queda un historial de cada movimiento. El servicio de inventario ya está aislado para que esto sea aditivo cuando se implemente.
- **Testing**: no hay suite automatizada amplia; la validación de reglas de negocio críticas (stock, transiciones de estado, total) se hizo end-to-end contra la API real durante el desarrollo.
- **Correlativo de orden sin saltos**: el número de orden (`OT-000123`) se formatea desde el `id` autoincremental; no hay una tabla de correlativos separada.
- **SKU de productos y duración/solapamiento de reservas**: no implementados.
- **Despliegue a producción**: no es objetivo de este entregable; el `docker-compose.yml` está pensado para evaluación local, no para un entorno productivo (sin TLS, sin gestión de secretos externa, sin réplicas).
