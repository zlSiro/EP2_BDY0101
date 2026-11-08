# ContentFlow - Evaluación Parcial 2 (BDY0101)

Bases de Datos No Relacionales. Caso **ContentFlow**: plataforma de contenido sobre **MongoDB Atlas (cluster gratuito M0)** con una API REST en NestJS.

Base de datos: `EP2_BDY0101`. Colecciones: `usuarios`, `publicaciones`, `reacciones`, `comentarios`, `campanas` (500 documentos cada una; `reacciones` queda en 499 tras eliminar un duplicado).

## Estructura

```
scripts/   Scripts mongosh numerados (02 a 09): conteos, transformación, concerns, inconsistencias, índices, consultas y CRUD
api/       API REST NestJS + Mongoose
  postman/ Colección de Postman exportada
  .env.example  Variables de entorno de ejemplo (sin credenciales)
```

Los datos de origen (`AnexoForma_A.zip`) no se incluyen en el repositorio. El informe técnico se entrega aparte, en PDF, por AVA.

## Requisitos

- Cuenta de MongoDB Atlas con un cluster M0, un usuario con rol `readWrite` sobre `EP2_BDY0101` y la IP del equipo permitida en Network Access.
- MongoDB Compass y/o mongosh.
- Node.js 20 o superior.
- Postman (opcional, para probar la API).

## 1. Base de datos

1. Crear la base `EP2_BDY0101` e importar los cinco JSON con Compass (`campañas.json` se carga como colección `campanas`, sin ñ).
2. Ejecutar los scripts de `scripts/` en orden, pegándolos en el mongosh de Compass o en un playground de VS Code. Cada uno comienza con `db = db.getSiblingDB("EP2_BDY0101")`.

| Script | Qué hace |
|---|---|
| `02_verificar_conteos.js` | Conteos por colección y tipo de las fechas (solo lectura) |
| `03_transformar_fechas.js` | Convierte fechas de texto ISO a `Date` (idempotente) |
| `04_conectividad_y_concerns.js` | Prueba de conectividad, permisos y read/write concern |
| `05_detectar_inconsistencias.js` | Detecta referencias rotas, duplicados y fechas incoherentes (solo lectura) |
| `06_corregir_inconsistencias.js` | Elimina el duplicado `react_140` (con respaldo en `_auditoria_inconsistencias`) y marca fechas incoherentes con `fecha_inconsistente: true` |
| `07_indices_explain.js` | Mide `explain` sin índices, crea los 7 índices y vuelve a medir |
| `08_consultas.js` | 6 consultas de lectura y 9 agregaciones |
| `09_crud.js` | Ciclo CRUD completo con documentos `demo_*`; al terminar restaura el estado inicial |

Notas:
- Los `_id` son strings (`user_1`, `pub_1`, ...). No se convierten a ObjectId.
- El script 07 elimina los índices secundarios antes de recrearlos.
- Los scripts de escritura usan `writeConcern: { w: "majority", j: true }`.

## 2. API

```bash
cd api
npm install
cp .env.example .env      # en Windows: copy .env.example .env
# editar .env con el string de conexión de Atlas (nunca se sube al repositorio)
npm run start:dev
```

Comprobar: `GET http://localhost:3000/health` responde con el estado de la conexión a Atlas.

Variables de entorno (`api/.env.example`):

| Variable | Descripción |
|---|---|
| `MONGODB_URI` | String de conexión de Atlas |
| `MONGODB_DB` | Base de datos (`EP2_BDY0101`) |
| `PORT` | Puerto HTTP (3000 por defecto) |
| `DNS_SERVERS` | Opcional. DNS públicos si falla `querySrv ECONNREFUSED` |

Otros comandos: `npm run build`, `npm run start:prod`, `npm run lint`.

Los índices se crean solo con `scripts/07_indices_explain.js`; la API no los crea. El índice único `uq_usuarios_correo` produce el error 409 por correo duplicado.

Detalle de endpoints, validaciones y códigos de error en [`api/README.md`](api/README.md).

## 3. Pruebas con Postman

1. Importar `api/postman/ContentFlow_API.postman_collection.json`.
2. Con la API en marcha, ejecutar la colección con **Collection Runner**.
3. El flujo crea datos, prueba los errores (400, 404, 409, 422) y los borra al final: la base queda como estaba.

## Seguridad

El repositorio no contiene usuario, contraseña ni string de conexión. Las credenciales viven solo en `api/.env`, que está en `.gitignore`.
