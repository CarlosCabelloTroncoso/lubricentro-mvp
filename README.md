# Lubricentro MVP

Sistema fullstack para la gestión interna de un lubricentro, orientado al manejo de clientes, vehículos, servicios, productos, órdenes de trabajo, control de stock e historial de atención.

El proyecto fue desarrollado como un MVP funcional, priorizando un flujo de negocio completo, reglas de autorización por rol, consistencia de datos y una ejecución reproducible mediante Docker.

---

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

---

## Funcionalidades

- **Autenticación** con JWT almacenado en cookie `HttpOnly`, sesión rehidratada mediante `GET /api/auth/me` y tres roles con permisos diferenciados.

- **Clientes**: creación, edición, búsqueda y baja lógica. Incluye validación de RUT chileno mediante módulo 11.

- **Vehículos**: asociados a un cliente, patente normalizada e historial de órdenes completadas dentro de la ficha del vehículo.

- **Servicios y productos**: catálogos con precios. Los productos incluyen además stock actual, stock mínimo y alertas de inventario.

- **Órdenes de trabajo**: núcleo del sistema. Se crean a partir de un vehículo y permiten agregar servicios y productos.

  - Snapshot del nombre y precio de cada línea.
  - Total calculado siempre por el backend.
  - Descuento de stock dentro de la misma transacción que agrega el producto.
  - Reposición automática de stock al eliminar productos o anular una orden.
  - Máquina de estados:

    ```text
    ABIERTA → EN_PROCESO → COMPLETADA
                         ↘ ANULADA
    ```

- **Dashboard** con métricas reales:

  - clientes activos;
  - vehículos activos;
  - reservas del día;
  - órdenes abiertas;
  - órdenes completadas;
  - ingresos del día;
  - ingresos del mes;
  - servicios más solicitados;
  - productos bajo stock mínimo.

- **Diseño responsive** para desktop, notebook, tablet y dispositivos móviles.

  - Sidebar fijo en desktop.
  - Drawer colapsable en tablet/móvil.
  - Tablas con scroll horizontal contenido.
  - Columnas secundarias ocultas en pantallas pequeñas cuando corresponde.
  - Formularios adaptados a una columna en móvil.
  - Interfaces de órdenes de trabajo adaptadas para pantallas reducidas.

El módulo de **reservas** se encuentra implementado y probado en el backend, incluyendo CRUD, asociación con órdenes de trabajo y actualización automática a `CUMPLIDA` al completar una orden asociada.

Actualmente no posee una pantalla propia en el frontend. Ver [Limitaciones y roadmap](#limitaciones-y-roadmap).

---

## Stack

| Capa | Tecnología | Versión |
|---|---|---:|
| Frontend | Angular (Standalone Components + Signals) | 21.2.21 |
| UI | PrimeNG + tema Aura | 21.1.9 |
| Backend | Node.js + Express | 24 LTS / 5.2.1 |
| Validación | Zod | 4.4.3 |
| Base de datos | MySQL | 8.4.11 |
| Cliente MySQL | mysql2 | 3.23.4 |
| Auth | jsonwebtoken + bcryptjs | 9.0.3 / 3.0.3 |
| Infraestructura | Docker + Docker Compose + Nginx | — |

---

## Arquitectura

### Backend

El backend utiliza una arquitectura por capas en un solo sentido:

```text
route
  ↓
middleware
  ↓
controller
  ↓
service
  ↓
repository
  ↓
MySQL
```

Los archivos se organizan por módulo de dominio:

```text
modules/
├── auth/
├── clientes/
├── vehiculos/
├── servicios/
├── productos/
├── inventario/
├── ordenes/
├── reservas/
├── dashboard/
└── usuarios/
```

No se utiliza ORM.

El acceso a datos utiliza SQL explícito y parametrizado mediante `mysql2`, permitiendo mantener control directo sobre:

- transacciones;
- bloqueos;
- índices;
- consultas;
- reglas de integridad.

El único punto encargado de modificar stock se encuentra en:

```text
modules/inventario/inventario.service.ts
```

Esto permite que futuras funcionalidades como un kardex o una tabla `movimientos_inventario` puedan agregarse sin modificar la lógica principal de órdenes.

---

### Frontend

El frontend utiliza:

- Angular Standalone Components;
- Signals para estado local;
- Reactive Forms;
- PrimeNG;
- servicios delgados sobre `HttpClient`;
- Guards de autenticación;
- Interceptors;
- lazy routing.

No se utiliza NgRx porque el alcance del sistema no requiere una capa adicional de manejo global de estado.

La interfaz replica visualmente los permisos del backend ocultando acciones que cada rol no puede realizar.

Sin embargo, la **fuente de verdad de autorización siempre es el backend**.

---

### Infraestructura

El proyecto utiliza un único `docker-compose.yml` con tres servicios:

```text
                    ┌─────────────────┐
Navegador ────────→ │ Nginx / Angular │ :80
                    └────────┬────────┘
                             │
                             │ /api
                             ↓
                    ┌─────────────────┐
                    │ Express API     │ :3000
                    └────────┬────────┘
                             │
                             ↓
                    ┌─────────────────┐
                    │ MySQL           │ :3306
                    └─────────────────┘
```

Nginx cumple dos funciones:

1. servir el build de Angular;
2. actuar como reverse proxy hacia `/api`.

Esto permite mantener frontend y backend bajo el mismo origen y evita configuración adicional de CORS o problemas con cookies `SameSite`.

Durante desarrollo local, `proxy.conf.json` cumple el mismo propósito para Angular CLI.

---

## Flujo principal

```text
Cliente
   ↓
Vehículo
   ↓
Orden de trabajo
   ↓
Servicios + Productos
   ↓
Total calculado por backend
   ↓
Completar orden
   ↓
Historial del vehículo
```

### Reglas relevantes

- El **cliente de una orden se obtiene automáticamente desde el propietario actual del vehículo**.

  El frontend no envía un `clienteId` independiente al crear la orden, evitando inconsistencias entre cliente y vehículo.

- Las líneas de productos y servicios almacenan un **snapshot del nombre y precio**.

  Si posteriormente cambia el catálogo, una orden histórica mantiene sus valores originales.

- Al agregar un producto a una orden, el **stock se descuenta dentro de la misma transacción** que crea la línea.

- Al quitar un producto, su stock se repone.

- Al anular una orden, se repone todo el stock consumido por ella.

- El **total nunca es enviado por el frontend**.

  El backend lo recalcula usando las líneas persistidas de la orden.

- Completar una orden:

  - exige al menos una línea;
  - registra la fecha de cierre;
  - actualiza el kilometraje del vehículo;
  - nunca permite reducir su kilometraje;
  - marca como `CUMPLIDA` una reserva asociada.

- El historial no utiliza una tabla independiente.

  Corresponde a las órdenes `COMPLETADA` de un vehículo y se muestra dentro de su ficha.

---

## Roles y permisos

| Acción | ADMIN | RECEPCIONISTA | MECANICO |
|---|:---:|:---:|:---:|
| Ver dashboard, catálogos e historial | ✅ | ✅ | ✅ |
| Crear/editar clientes y vehículos | ✅ | ✅ | ❌ |
| Desactivar clientes/vehículos/catálogos | ✅ | ❌ | ❌ |
| Mantener servicios y productos | ✅ | ❌ | ❌ |
| Ajustar stock | ✅ | ✅ | ❌ |
| Crear una orden de trabajo | ✅ | ✅ | ❌ |
| Agregar líneas / cambiar estado de una orden | ✅ | ✅ | Solo sus órdenes |
| Ver listado de órdenes | Todas | Todas | Solo las suyas |

La autorización general por rol se implementa mediante middleware.

Las validaciones que dependen del recurso, por ejemplo que un mecánico solamente pueda modificar sus propias órdenes, se validan en la capa `service`.

---

# Ejecución

## Ejecución con Docker

Esta es la forma recomendada de ejecutar el proyecto.

### Requisitos

#### Windows

- Docker Desktop
- Git

#### macOS

- Docker Desktop
- Git

#### Linux

- Docker Engine
- Docker Compose
- Git

No es necesario instalar localmente:

- Node.js;
- Angular CLI;
- MySQL;
- Nginx.

Docker se encarga de levantar toda la infraestructura.

---

### 1. Clonar el repositorio

En cualquier sistema operativo:

```bash
git clone https://github.com/CarlosCabelloTroncoso/lubricentro-mvp.git
cd lubricentro-mvp
```

---

### 2. Crear el archivo `.env`

El repositorio incluye `.env.example` con las variables necesarias.

El archivo `.env` real no se encuentra versionado.

#### Windows — PowerShell

```powershell
Copy-Item .env.example .env
```

#### Windows — CMD

```cmd
copy .env.example .env
```

#### macOS

```bash
cp .env.example .env
```

#### Linux

```bash
cp .env.example .env
```

---

### 3. Levantar la aplicación

El comando es el mismo para Windows, macOS y Linux:

```bash
docker compose up --build
```

Docker levantará automáticamente:

```text
Frontend Angular + Nginx
Backend Node.js / Express
MySQL 8.4
Migraciones
Seed de demostración
```

El backend espera que MySQL se encuentre disponible antes de iniciar.

Las migraciones pendientes se aplican automáticamente y el seed inicializa los datos de demostración cuando la base está vacía.

---

### 4. Abrir la aplicación

Cuando los servicios estén listos:

**Aplicación**

```text
http://localhost
```

**Health check de la API**

```text
http://localhost/api/health
```

Una respuesta correcta del health check debería ser:

```json
{
  "estado": "ok"
}
```

---

### 5. Detener la aplicación

```bash
docker compose down
```

Los datos de MySQL se mantienen gracias al volumen `db_data`.

Para detener la aplicación y eliminar además los datos persistidos:

```bash
docker compose down -v
```

Al volver a ejecutar:

```bash
docker compose up --build
```

las migraciones y datos demo se crearán nuevamente desde cero.

---

## Desarrollo local

Este modo está pensado para desarrollar rápidamente sin reconstruir las imágenes del frontend y backend.

La arquitectura local es:

```text
Angular :4200
     │
     │ /api
     ↓
Express :3000
     │
     ↓
MySQL Docker :3307
```

MySQL se ejecuta en Docker.

Angular y Express se ejecutan directamente en la máquina.

---

### Requisitos para desarrollo local

- Node.js 24 LTS
- npm
- Docker
- Docker Compose

No es necesario instalar MySQL localmente.

---

### 1. Clonar el repositorio

```bash
git clone https://github.com/CarlosCabelloTroncoso/lubricentro-mvp.git
cd lubricentro-mvp
```

---

### 2. Crear `.env`

#### Windows — PowerShell

```powershell
Copy-Item .env.example .env
```

#### Windows — CMD

```cmd
copy .env.example .env
```

#### macOS / Linux

```bash
cp .env.example .env
```

---

### 3. Levantar solamente MySQL

Desde la raíz del proyecto:

```bash
docker compose up -d db
```

Para desarrollo local MySQL queda disponible en:

```text
localhost:3307
```

---

### 4. Ejecutar el backend

Abrir una terminal desde la raíz del proyecto:

```bash
cd backend
npm install
npm run migrate
npm run seed
npm run dev
```

La API queda disponible en:

```text
http://localhost:3000
```

Health check:

```text
http://localhost:3000/api/health
```

---

### 5. Ejecutar el frontend

Abrir **otra terminal** desde la raíz del proyecto:

```bash
cd frontend
npm install
npm start
```

Angular queda disponible en:

```text
http://localhost:4200
```

El servidor de Angular utiliza:

```text
proxy.conf.json
```

para redirigir automáticamente:

```text
/api → http://localhost:3000
```

De esta forma el frontend puede consumir la API utilizando rutas relativas como:

```text
/api/clientes
/api/vehiculos
/api/ordenes
```

sin necesidad de modificar las URLs entre desarrollo y Docker.

---

## Variables de entorno

El proyecto utiliza un único `.env` ubicado en la raíz.

Docker Compose lo lee automáticamente y los scripts del backend también utilizan estas variables.

La lista completa se encuentra documentada en:

[`.env.example`](.env.example)

| Variable | Uso | Sensible |
|---|---|:---:|
| `NODE_ENV` | Entorno y nivel de detalle de errores | No |
| `PORT` | Puerto utilizado por Express | No |
| `DB_HOST` | Host de MySQL | No |
| `DB_PORT` | Puerto de MySQL | No |
| `DB_USER` | Usuario de MySQL | Sí |
| `DB_PASSWORD` | Contraseña de MySQL | Sí |
| `DB_NAME` | Nombre de la base de datos | No |
| `MYSQL_ROOT_PASSWORD` | Contraseña root usada al inicializar MySQL | Sí |
| `JWT_SECRET` | Clave HMAC para firmar JWT | Sí |

### Desarrollo local

El `.env.example` utiliza:

```text
DB_HOST=localhost
DB_PORT=3307
```

porque MySQL se encuentra expuesto desde Docker hacia la máquina host.

### Docker Compose

Dentro de Docker Compose, la API utiliza:

```text
DB_HOST=db
DB_PORT=3306
```

porque `db` corresponde al nombre del servicio MySQL dentro de la red interna de Docker.

---

## Credenciales demo

La contraseña para las cuentas incluidas en el seed es:

```text
Demo1234
```

| Email | Rol |
|---|---|
| `admin@lubricentro.cl` | ADMIN |
| `recepcion@lubricentro.cl` | RECEPCIONISTA |
| `mecanico@lubricentro.cl` | MECANICO |
| `mecanico2@lubricentro.cl` | MECANICO |

El seed incluye además:

- 15 clientes;
- 20 vehículos;
- catálogo de servicios;
- catálogo de productos;
- producto bajo stock mínimo para visualizar alertas;
- reservas;
- órdenes de trabajo distribuidas durante los últimos 60 días.

---

## Estructura del proyecto

```text
lubricentro-mvp/
│
├── README.md
├── docker-compose.yml
├── .env.example
│
├── docs/
│   └── api.md
│
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       │
│       ├── config/
│       │   └── env.ts
│       │
│       ├── db/
│       │   ├── migrations/
│       │   ├── migrate.ts
│       │   ├── seed.ts
│       │   └── pool.ts
│       │
│       ├── middlewares/
│       │   ├── auth.ts
│       │   ├── validate.ts
│       │   └── errorHandler.ts
│       │
│       ├── modules/
│       │   ├── auth/
│       │   ├── clientes/
│       │   ├── vehiculos/
│       │   ├── servicios/
│       │   ├── productos/
│       │   ├── inventario/
│       │   ├── reservas/
│       │   ├── ordenes/
│       │   ├── dashboard/
│       │   └── usuarios/
│       │
│       └── shared/
│
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── proxy.conf.json
    └── src/
        └── app/
            │
            ├── core/
            │   ├── models/
            │   ├── services/
            │   ├── guards/
            │   └── interceptors/
            │
            ├── layout/
            │   └── shell/
            │
            └── features/
                ├── login/
                ├── dashboard/
                ├── clientes/
                ├── vehiculos/
                ├── servicios/
                ├── productos/
                └── ordenes/
```

---

## Decisiones técnicas

### MySQL sin ORM

Se optó por SQL explícito mediante `mysql2` en lugar de Prisma o TypeORM.

El dominio contiene relaciones donde la integridad y las transacciones tienen un papel importante:

```text
Cliente
  ↓
Vehículo
  ↓
Orden
  ↓
Productos / Servicios
```

El consumo de stock, por ejemplo, requiere modificar distintas entidades dentro de una misma transacción.

Los repositorios utilizan consultas SQL parametrizadas mediante `?`, evitando interpolación directa de valores.

---

### Runner de migraciones propio

Se utiliza un runner de migraciones forward-only apoyado por:

```text
schema_migrations
```

Cada migración SQL posee un número incremental y solo se ejecuta una vez.

Para el alcance del MVP permite mantener el proceso simple y completamente visible.

---

### JWT en cookie HttpOnly

La autenticación utiliza:

```text
JWT
+
HttpOnly Cookie
+
SameSite=Lax
```

El frontend nunca almacena ni accede directamente al token.

La sesión puede recuperarse mediante:

```text
GET /api/auth/me
```

No se implementó refresh token para mantener un flujo de autenticación adecuado al alcance del MVP.

---

### Angular 21 + PrimeNG 21

El proyecto utiliza Angular 21 y PrimeNG 21.

Las dependencias fueron fijadas explícitamente para mantener una instalación reproducible.

---

### bcryptjs

Se utiliza `bcryptjs` para el hashing y comparación de contraseñas.

Al no depender de módulos nativos simplifica la construcción de imágenes Docker y evita requerimientos adicionales de compilación.

---

### Signals sin NgRx

El estado del frontend se concentra principalmente en información utilizada dentro de cada pantalla:

- listas;
- formularios;
- usuario autenticado;
- filtros;
- información de órdenes.

Signals y servicios son suficientes para este alcance, evitando agregar una capa de estado global innecesaria.

---

### Docker Compose único

Existe un único:

```text
docker-compose.yml
```

orientado a facilitar la evaluación y reproducción del proyecto.

En ejecución completa levanta:

```text
web + api + db
```

Durante desarrollo local también puede utilizarse únicamente para MySQL:

```bash
docker compose up -d db
```

---

## API

El contrato completo de la API REST se encuentra documentado en:

[`docs/api.md`](docs/api.md)

Incluye:

- endpoints;
- métodos HTTP;
- request body;
- response body;
- códigos de error;
- reglas de autorización;
- comportamiento de órdenes;
- reglas de inventario.

---

## Limitaciones y roadmap

Algunas funcionalidades quedaron fuera del alcance deliberadamente para mantener el foco en el flujo principal del MVP.

### Reservas

El backend de reservas se encuentra implementado y probado.

Actualmente no existe una pantalla específica para administrarlas desde el frontend.

---

### Inventario P1

Actualmente se mantiene correctamente:

```text
stock_actual
```

pero no existe una tabla de movimientos históricos de inventario.

Una evolución natural sería:

```text
movimientos_inventario
```

para implementar un kardex con:

- entradas;
- salidas;
- ajustes;
- referencias a órdenes;
- usuario responsable;
- fecha.

El servicio de inventario actual se encuentra aislado para permitir esta extensión.

---

### Testing automatizado

No existe actualmente una suite extensa de tests automatizados.

Las reglas críticas fueron verificadas end-to-end contra la API real, incluyendo:

- autenticación;
- autorización;
- creación de órdenes;
- stock insuficiente;
- descuento de stock;
- reposición al anular;
- cálculo de totales;
- transiciones de estado;
- historial del vehículo.

Una siguiente iteración podría incorporar pruebas automatizadas con Vitest y Supertest.

---

### Correlativo de órdenes

El número visible de una orden se obtiene a partir de su `id`:

```text
OT-000123
```

No existe una tabla independiente para correlativos sin saltos.

---

### Productos y reservas

No se implementaron todavía:

- SKU formal de productos;
- duración configurable de servicios;
- detección de solapamiento de reservas.

---

### Producción

El `docker-compose.yml` está diseñado para ejecución y evaluación local.

Una implementación productiva debería incorporar, entre otros:

- TLS/HTTPS;
- manejo externo de secretos;
- estrategia de backups;
- observabilidad;
- logging centralizado;
- CI/CD;
- configuración específica de infraestructura;
- políticas de escalabilidad y recuperación.