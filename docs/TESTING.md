# Guía de pruebas automatizadas

## Alcance

La suite `test/app.test.js` verifica la historia de usuario de CRUD de productos contra los cuatro criterios de aceptación del sprint: persistencia real en MongoDB, validación de campos e identificadores, códigos HTTP coherentes y errores uniformes. Son pruebas de integración: cada caso ejecuta peticiones HTTP reales contra la aplicación Express completa (rutas, controladores, servicios, modelo y middleware de errores) sin mocks de la lógica de negocio. El único componente sustituido es el servidor MongoDB, que corre en memoria para que la suite sea determinista, rápida y no dependa de credenciales externas.

## Stack de pruebas

| Herramienta | Versión | Rol |
|---|---|---|
| Jest | 29.x | Framework de pruebas y aserciones |
| Supertest | 7.x | Cliente HTTP en proceso sobre la app de Express |
| mongodb-memory-server | 11.x | Instancia efímera de MongoDB para la sesión de pruebas |
| Mongoose | 7.4.x | ODM (mismo driver que usa la aplicación en producción) |

`mongodb-memory-server` es una dependencia de desarrollo: descarga un binario de MongoDB la primera vez que se ejecuta la suite y lo guarda en caché local; en las ejecuciones siguientes el arranque toma menos de un segundo.

## Ejecución

Desde la raíz del repositorio:

```bash
npm install
npm test
```

El script `npm test` fija `NODE_ENV=test` y ejecuta Jest en modo `--runInBand` (secuencial) con `--detectOpenHandles`. No requiere archivo `.env.test`, ni URI de conexión, ni credenciales: el archivo de entorno de pruebas es opcional y los tests conectan Mongoose directamente a la URI efímera generada en `beforeAll`.

## Ciclo de vida de la base de datos

1. `beforeAll`: arranca `MongoMemoryServer` en un puerto aleatorio y conecta Mongoose con `dbName: inventario_test`.
2. `afterEach`: vacía todas las colecciones, de modo que cada prueba parte de un estado limpio y los casos son independientes entre sí.
3. `afterAll`: desconecta Mongoose y detiene el proceso de MongoDB, evitando identificadores abiertos.

Este ciclo garantiza que las aserciones de persistencia (releer un producto tras crearlo, actualizarlo o eliminarlo) prueban escritura y lectura reales contra el motor de MongoDB, no contra memoria de proceso.

## Matriz de casos (23 pruebas)

| Grupo | Caso | Código esperado |
|---|---|---|
| `GET /health` | Estado del servicio | `200` |
| Rutas | Ruta no registrada | `404` |
| `POST /api/v1/products` | Creación exitosa con todos los campos | `201` |
| | Stock por defecto en 0 cuando no se envía | `201` |
| | Falta `name` | `400` |
| | Falta `category` | `400` |
| | Falta `price` | `400` |
| | `price` negativo | `400` |
| | `stock` negativo | `400` |
| | `price` no numérico | `400` |
| | Cuerpo JSON malformado | `400` |
| `GET /api/v1/products` | Listado vacío | `200` |
| | Listado con productos persistidos | `200` |
| `GET /api/v1/products/:id` | Consulta exitosa | `200` |
| | ID válido inexistente | `404` |
| | ID con formato inválido | `400` |
| `PUT /api/v1/products/:id` | Actualización parcial y relectura | `200` |
| | ID válido inexistente | `404` |
| | ID con formato inválido | `400` |
| | Datos que violan validación (`price` negativo) | `400` |
| `DELETE /api/v1/products/:id` | Eliminación con cuerpo vacío y relectura | `204` |
| | ID válido inexistente | `404` |
| | ID con formato inválido | `400` |

## Convenciones de aserción

Toda respuesta de error debe cumplir el contrato uniforme: `status: "fail"` con `message` descriptivo y, cuando aplica, lista `errors` con el detalle por campo. Las pruebas de validación verifican además el mensaje específico del modelo (por ejemplo, "El precio no puede ser negativo"), y las pruebas de persistencia releen el recurso con `GET` tras la mutación para confirmar el efecto en MongoDB.

## Notas sobre ObjectId

`ObjectId` acepta cadenas hexadecimales de 24 caracteres y también binarios de 12 bytes; por ello un identificador como `id-no-valido` (12 caracteres) se interpreta como válido y produce `404`, mientras que `abc123` (6 caracteres) produce `400` por `CastError`. La suite usa cadenas cortas no hexadecimales para forzar el error de casteo y un `ObjectId` bien formado pero inexistente para forzar el `404`.

## Integración continua

El workflow `.github/workflows/ci.yml` ejecuta `npm test` sobre Node 20 y 22 en `ubuntu-latest`. La suite funciona en CI sin servicios adicionales porque `mongodb-memory-server` provisiona su propia instancia; la primera ejecución descarga el binario y las siguientes usan la caché del runner.
