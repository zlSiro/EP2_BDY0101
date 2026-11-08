# ContentFlow API (EP2 BDY0101)

API REST en **NestJS** (Node.js sobre Express) conectada a **MongoDB Atlas (cluster M0)** con `mongoose`.
Base de datos: `EP2_BDY0101`. Colecciones: `usuarios`, `publicaciones`, `comentarios`, `reacciones` (y `campanas`, usada en la baja en cascada).

## Requisitos
- Node.js 20 o superior
- Cluster M0 en Atlas con la data cargada y un usuario con rol `readWrite` sobre `EP2_BDY0101`
- La IP del equipo permitida en Network Access de Atlas
- Postman (opcional, para las pruebas)

## Puesta en marcha
```bash
npm install
cp .env.example .env     # en Windows: copy .env.example .env
# editar .env con el string de conexion real (nunca se sube al repositorio)
npm run start:dev
```
Probar: `GET http://localhost:3000/health` debe responder `{"status":"ok","db":"EP2_BDY0101",...}`.

## Variables de entorno
| Variable | Descripcion |
|---|---|
| `MONGODB_URI` | String de conexion de Atlas. Incluye `w=majority` y `readConcernLevel=majority` |
| `MONGODB_DB` | Base de datos (por defecto `EP2_BDY0101`) |
| `PORT` | Puerto HTTP (por defecto 3000) |
| `DNS_SERVERS` | Opcional. DNS publicos si el router falla con `querySrv ECONNREFUSED` |

El string de conexion se lee solo desde el entorno (`ConfigService.getOrThrow`). `.env` esta en `.gitignore`.

## Flujo de integracion
`Cliente HTTP -> Controller (valida DTO) -> Service -> Mongoose -> Atlas`
1. `ValidationPipe` global valida campos obligatorios, tipos y enums, y rechaza campos desconocidos.
2. El servicio valida referencias (existencia de `usuario_id` y `publicacion_id`) antes de escribir.
3. `AllExceptionsFilter` traduce los errores de Mongo a codigos HTTP.
4. `requestLogger` registra cada peticion en consola y en `logs/api.log`.

## Librerias
`@nestjs/core`, `@nestjs/platform-express`, `@nestjs/mongoose`, `mongoose`, `@nestjs/config`, `class-validator`, `class-transformer`.

## Endpoints
| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `/health` | Ping a Atlas |
| GET / POST | `/usuarios` | Listar (filtros `pais`, `genero`, `dispositivo`, `page`, `limit`) / crear |
| GET / PATCH / DELETE | `/usuarios/:id` | Leer / actualizar (`$set`) / eliminar (409 si tiene publicaciones) |
| GET / POST | `/publicaciones` | Listar (filtros `usuario_id`, `categoria`, `tipo`) / crear |
| GET / PATCH / DELETE | `/publicaciones/:id` | Leer / actualizar / eliminar en cascada |
| POST | `/publicaciones/:id/hashtags` | `$addToSet` de un hashtag |
| GET | `/publicaciones/:id/resumen` | Conteo de comentarios, reacciones y likes |
| GET / POST | `/comentarios` | Listar (`publicacion_id`, `usuario_id`) / crear |
| PATCH | `/comentarios/:id/like` | `$inc` de likes |
| DELETE | `/comentarios/:id` | Eliminar |
| GET / POST | `/reacciones` | Listar / crear (una por usuario y publicacion) |
| DELETE | `/reacciones/:id` | Eliminar |

## Codigos de error
| Codigo | Caso |
|---|---|
| 400 | Campos invalidos, faltantes o desconocidos |
| 404 | Documento inexistente |
| 409 | Clave duplicada (correo), reaccion repetida o borrado con dependencias |
| 422 | Referencia inexistente (`usuario_id` o `publicacion_id`) |
| 503 | Sin conexion con la base de datos |

## Pruebas con Postman
1. Importar `postman/ContentFlow_API.postman_collection.json`.
2. Con la API en marcha, ejecutar la coleccion con **Collection Runner** en orden.
3. El flujo crea un usuario, una publicacion, un comentario y una reaccion, prueba los errores (400, 404, 409, 422) y borra todo al final. La base queda como estaba.
4. Para evidencia en tiempo real, pausar antes de la carpeta `5. Limpieza` y revisar los documentos en Atlas (Browse Collections) o Compass.

## Indices
Los indices se crean con `scripts/07_indices_explain.js`. La API no los crea (`autoIndex: false`). El indice unico `uq_usuarios_correo` es el que produce el 409 por correo duplicado.
