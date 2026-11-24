# Sistema Backend de Turnos y Reservas — Migración a MongoDB con Mongoose

API REST del **Sistema Backend de Turnos y Reservas** construida con **Node.js, Express y Mongoose**, persistiendo los datos en **MongoDB Atlas** y conservando la arquitectura en capas (`routes → controllers → services → repositories → DAO`).

En esta entrega se migró únicamente la **capa de persistencia** desde archivos JSON (FileSystem) hacia **MongoDB Atlas** mediante **Mongoose**, incorporando los tres modelos requeridos (`service.model.js`, `booking.model.js` y `message.model.js`) y manteniendo intacto el comportamiento externo de los endpoints ya trabajados.

## Tecnologías

- Node.js 18 o superior
- Express 5
- MongoDB Atlas
- Mongoose 8
- dotenv
- Módulos ES (`"type": "module"`)

---

## Arquitectura en capas

Cada petición recorre las capas siempre en el mismo orden, manteniendo dependencias unidireccionales:

```
routes → controllers → services → repositories → DAO → Mongoose Models → MongoDB Atlas
```

```
          Petición HTTP
                │
                ▼
┌───────────────────────────────┐
│ Routes                        │  Define los endpoints y los conecta al controller.
│ services.router.js            │
│ bookings.router.js            │
│ messages.router.js            │
└───────────────┬───────────────┘
                ▼
┌───────────────────────────────┐
│ Controllers                   │  Lee req (params, query, body), llama al service
│ services.controller.js        │  y responde con res.status().json().
│ bookings.controller.js        │
│ messages.controller.js        │
└───────────────┬───────────────┘
                ▼
┌───────────────────────────────┐
│ Services                      │  Reglas de negocio: validaciones, filtros,
│ services.service.js           │  existencia de recursos, incremento de quantity.
│ bookings.service.js           │  No conoce req/res ni consulta MongoDB directamente.
│ messages.service.js           │
└───────────────┬───────────────┘
                ▼
┌───────────────────────────────┐
│ Repositories                  │  Contrato de acceso a datos para los services.
│ services.repository.js        │  Delega en el DAO, sin reglas de negocio.
│ bookings.repository.js        │
│ messages.repository.js        │
└───────────────┬───────────────┘
                ▼
┌───────────────────────────────┐
│ DAO                           │  Única capa que opera con los modelos de Mongoose.
│ services.dao.js               │  Ejecuta consultas y escrituras en MongoDB.
│ bookings.dao.js               │  Sin lógica de negocio.
│ messages.dao.js               │
└───────────────┬───────────────┘
                ▼
┌───────────────────────────────┐
│ Models (Mongoose)             │  Esquemas, validaciones e índices de colección.
│ service.model.js              │  -> colección "services"
│ booking.model.js              │  -> colección "bookings" (ref ObjectId a Service)
│ message.model.js              │  -> colección "messages" (ref opcional a Booking)
└───────────────┬───────────────┘
                ▼
          MongoDB Atlas
```

### Responsabilidad de cada capa

| Capa | Responsabilidad | Qué **no** hace |
|------|-----------------|-----------------|
| **Routes** | Define los endpoints y los conecta con el controller | No contiene lógica |
| **Controllers** | Lee `req.params`, `req.query` y `req.body`, llama al service y responde con `res.status().json()`. Traduce errores a códigos HTTP (400, 404, 500) | No valida reglas de negocio ni consulta MongoDB |
| **Services** | Reglas de negocio: validación de campos, filtros, verificación de existencia, bloqueo de reservas canceladas e incremento de `quantity` | No usa `req`/`res` ni importa modelos de Mongoose |
| **Repositories** | Expone el contrato de acceso a datos para los services y delega en el DAO | No tiene reglas de negocio |
| **DAO** | Interactúa con los modelos de Mongoose (`find`, `findById`, `create`, `findByIdAndUpdate`, `findByIdAndDelete`) y valida el formato `ObjectId` | No tiene reglas de negocio |
| **Models** | Define esquemas de Mongoose, referencias `ObjectId`, validaciones de esquema e índices | No contiene lógica de aplicación |

---

## Estructura del proyecto

```
src/
  config/
    env.config.js             # Carga de variables de entorno (PORT, MONGO_URI)
    db.config.js              # Conexión y cierre limpio de MongoDB Atlas con Mongoose
  models/
    service.model.js          # Esquema Mongoose de la colección services
    booking.model.js          # Esquema Mongoose de la colección bookings (services con ObjectId)
    message.model.js          # Esquema Mongoose de la colección messages
  dao/
    services.dao.js           # Persistencia de services en MongoDB
    bookings.dao.js           # Persistencia de bookings en MongoDB
    messages.dao.js           # Persistencia de messages en MongoDB
  repositories/
    services.repository.js    # Acceso a datos de services
    bookings.repository.js    # Acceso a datos de bookings
    messages.repository.js    # Acceso a datos de messages
  services/
    services.service.js       # Reglas de negocio de services
    bookings.service.js       # Reglas de negocio de bookings (incremento de quantity)
    messages.service.js       # Reglas de negocio de messages
  controllers/
    services.controller.js    # Controlador HTTP de /api/services
    bookings.controller.js    # Controlador HTTP de /api/bookings
    messages.controller.js    # Controlador HTTP de /api/messages
  routes/
    services.router.js        # Endpoints de /api/services
    bookings.router.js        # Endpoints de /api/bookings
    messages.router.js        # Endpoints de /api/messages
  scripts/
    seed.js                   # Script opcional de carga inicial en MongoDB
  utils/
    errors.js                 # ValidationError (400), NotFoundError (404) y respuesta de error
  app.js                      # Configuración de Express y montaje de routers
  server.js                   # Conexión a MongoDB Atlas, arranque y apagado ordenado
tests/
  api.test.js                 # Pruebas integrales de todos los endpoints con MongoDB
package.json
.env.example
.gitignore
README.md
```

---

## Instalación y ejecución

1. Clonar el repositorio e ingresar a la carpeta:

   ```bash
   git clone https://github.com/sebakine/sistema-turnos-reservas-mongodb-mongoose.git
   cd sistema-turnos-reservas-mongodb-mongoose
   ```

2. Instalar las dependencias:

   ```bash
   npm install
   ```

3. Crear el archivo `.env` a partir de `.env.example` y configurar la URI de **MongoDB Atlas**:

   ```bash
   cp .env.example .env      # En Windows (PowerShell): Copy-Item .env.example .env
   ```

   Editar `.env` con tus credenciales reales de MongoDB Atlas:

   ```env
   PORT=8080
   MONGO_URI=mongodb+srv://<usuario>:<password>@<cluster>.mongodb.net/turnos_reservas?retryWrites=true&w=majority
   ```

4. *(Opcional)* Cargar datos iniciales de ejemplo en tu cluster de MongoDB Atlas:

   ```bash
   npm run seed
   ```

5. Levantar el servidor:

   ```bash
   npm start       # modo normal
   npm run dev     # modo desarrollo (reinicio automático con --watch)
   ```

6. Ejecutar las pruebas automatizadas integrales:

   ```bash
   npm test
   ```

El servidor queda disponible en `http://localhost:8080`.

### Variables de entorno

| Variable    | Descripción                                | Valor por defecto |
|-------------|--------------------------------------------|-------------------|
| `PORT`      | Puerto HTTP del servidor Express           | `8080`            |
| `MONGO_URI` | Cadena de conexión a MongoDB Atlas         | *(obligatoria)*   |

> **Seguridad:** El archivo `.env` y la carpeta `node_modules/` están incluidos en `.gitignore` y nunca deben subirse al repositorio.

---

## Modelos de Mongoose

### `service.model.js` (colección `services`)

| Campo         | Tipo     | Reglas |
|---------------|----------|--------|
| `_id`         | ObjectId | Generado automáticamente por MongoDB. No se modifica |
| `name`        | String   | Obligatorio, `trim: true` |
| `description` | String   | Obligatorio, `trim: true` |
| `duration`    | Number   | Obligatorio, entero en minutos mayor a 0 |
| `price`       | Number   | Obligatorio, mayor o igual a 0 |
| `category`    | String   | Obligatorio, guardado en minúsculas |
| `available`   | Boolean  | Obligatorio (`true` o `false`) |
| `createdAt` / `updatedAt` | Date | Generados automáticamente (`timestamps: true`) |

### `booking.model.js` (colección `bookings`)

En `booking`, los servicios se almacenan como **referencias `ObjectId`** hacia `Service` (nunca como objeto embebido completo):

```js
services: [{ service: ObjectId, quantity: Number }]
```

| Campo         | Tipo     | Reglas |
|---------------|----------|--------|
| `_id`         | ObjectId | Generado automáticamente por MongoDB |
| `clientName`  | String   | Obligatorio, no vacío |
| `clientEmail` | String   | Obligatorio, email válido en minúsculas |
| `date`        | String   | Obligatorio, formato `YYYY-MM-DD` y fecha válida |
| `time`        | String   | Obligatorio, formato `HH:mm` (24 horas) |
| `status`      | String   | `pending` (por defecto), `confirmed` o `cancelled` |
| `services`    | Array    | Elementos `{ service: ObjectId (ref: "Service"), quantity: Number }` |
| `createdAt` / `updatedAt` | Date | Generados automáticamente (`timestamps: true`) |

### `message.model.js` (colección `messages`)

| Campo       | Tipo     | Reglas |
|-------------|----------|--------|
| `_id`       | ObjectId | Generado automáticamente por MongoDB |
| `user`      | String   | Obligatorio, identificador o correo del remitente |
| `message`   | String   | Obligatorio, contenido del mensaje |
| `booking`   | ObjectId | Opcional (`ref: "Booking"`), referencia a una reserva existente |
| `createdAt` / `updatedAt` | Date | Generados automáticamente (`timestamps: true`) |

---

## Endpoints

### Servicios (`/api/services`)

| Método | Ruta                 | Controller       | Respuestas |
|--------|----------------------|------------------|------------|
| GET    | `/api/services`      | `getServices`    | 200 · 400 filtro inválido |
| GET    | `/api/services/:sid` | `getServiceById` | 200 · 404 |
| POST   | `/api/services`      | `createService`  | 201 · 400 |
| PUT    | `/api/services/:sid` | `updateService`  | 200 · 400 · 404 |
| DELETE | `/api/services/:sid` | `deleteService`  | 200 · 404 |

`GET /api/services` admite filtros opcionales por query params ejecutados directamente sobre MongoDB: `?category=salud` y `?available=true`.

### Reservas (`/api/bookings`)

| Método | Ruta                               | Controller            | Respuestas |
|--------|------------------------------------|-----------------------|------------|
| POST   | `/api/bookings`                    | `createBooking`       | 201 · 400 |
| GET    | `/api/bookings/:bid`               | `getBookingById`      | 200 · 404 · 400 si `populate` inválido |
| POST   | `/api/bookings/:bid/services/:sid` | `addServiceToBooking` | 200 · 404 · 400 si la reserva está cancelada |

`GET /api/bookings/:bid` devuelve las referencias `ObjectId` por defecto (conservando el comportamiento original) y permite opcionalmente `?populate=true` para obtener el detalle poblado de cada servicio.

### Mensajes (`/api/messages`)

| Método | Ruta                 | Controller       | Respuestas |
|--------|----------------------|------------------|------------|
| GET    | `/api/messages`      | `getMessages`    | 200 · 400 filtro inválido |
| GET    | `/api/messages/:mid` | `getMessageById` | 200 · 404 |
| POST   | `/api/messages`      | `createMessage`  | 201 · 400 |
| DELETE | `/api/messages/:mid` | `deleteMessage`  | 200 · 404 |

`GET /api/messages` admite filtros opcionales `?user=` y `?booking=`.

---

## Ejemplos de uso

```bash
# Servicios
curl http://localhost:8080/api/services
curl "http://localhost:8080/api/services?category=salud&available=true"
curl http://localhost:8080/api/services/<SERVICE_OBJECT_ID>

curl -X POST http://localhost:8080/api/services \
  -H "Content-Type: application/json" \
  -d '{"name":"Control dental","description":"Revisión y limpieza dental","duration":40,"price":30000,"category":"salud","available":true}'

curl -X PUT http://localhost:8080/api/services/<SERVICE_OBJECT_ID> \
  -H "Content-Type: application/json" \
  -d '{"price":27000,"available":false}'

curl -X DELETE http://localhost:8080/api/services/<SERVICE_OBJECT_ID>

# Reservas
curl -X POST http://localhost:8080/api/bookings \
  -H "Content-Type: application/json" \
  -d '{"clientName":"Juan Pérez","clientEmail":"juan.perez@example.com","date":"2026-10-20","time":"16:00","services":[]}'

curl http://localhost:8080/api/bookings/<BOOKING_OBJECT_ID>
curl "http://localhost:8080/api/bookings/<BOOKING_OBJECT_ID>?populate=true"

curl -X POST http://localhost:8080/api/bookings/<BOOKING_OBJECT_ID>/services/<SERVICE_OBJECT_ID>

# Mensajes
curl -X POST http://localhost:8080/api/messages \
  -H "Content-Type: application/json" \
  -d '{"user":"juan.perez@example.com","message":"Confirmo mi turno","booking":"<BOOKING_OBJECT_ID>"}'

curl http://localhost:8080/api/messages
```

---

## Formato de respuestas y códigos HTTP

```json
{ "status": "success", "payload": {} }
{ "status": "error", "error": "Descripción del error", "details": ["..."] }
```

| Código | Uso |
|--------|-----|
| 200 | Consulta, actualización, eliminación o servicio agregado a una reserva |
| 201 | Servicio, reserva o mensaje creados |
| 400 | Campos faltantes, datos inválidos, JSON mal formado o reserva cancelada |
| 404 | Servicio, reserva, mensaje o ruta inexistente |
| 500 | Error inesperado del servidor |

---

## Autor

Sebastian Felipe Muñoz Rivera
