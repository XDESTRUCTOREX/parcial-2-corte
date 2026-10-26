# Contratos de la API REST

> Estado de esta documentación: describe el comportamiento observado en el código de la rama `develop`. La API actual usa Express y MongoDB/Mongoose.

## 1. Información general

- **Base URL local:** `http://localhost:3000`
- **Prefijo de productos:** `/api/v1/products`
- **Formato de intercambio:** JSON
- **Content-Type para cuerpos JSON:** `application/json`
- **Persistencia:** MongoDB mediante Mongoose
- **Autenticación:** actualmente no hay middleware JWT ni rutas de autenticación montadas en `src/app.js`. Los endpoints documentados no requieren token. No debe enviarse un JWT como si la API ya lo validara; implementar autenticación sería un cambio funcional separado.

Todas las respuestas de la API se expresan como JSON, excepto la eliminación correcta (`204 No Content`), que no devuelve cuerpo.

## 2. Configuración y ejecución

La aplicación carga variables desde `.env.<NODE_ENV>`; si `NODE_ENV` no está definido al cargar `src/app.js`, intenta cargar `.env.development`.

Variables usadas por el código:

| Variable | Uso | Ejemplo / valor por defecto |
|---|---|---|
| `NODE_ENV` | Selecciona el archivo de entorno y controla el detalle de errores | `development` |
| `PORT` | Puerto HTTP | `3000` |
| `MONGODB_URI` | Cadena de conexión a MongoDB | Debe configurarse de forma privada |

Ejemplo de configuración local (reemplazar el valor de conexión por uno propio; nunca publicar credenciales):

```dotenv
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/inventario
```

Instalación y ejecución:

```bash
npm install
npm run dev
```

El servidor espera que la conexión a MongoDB se establezca antes de empezar a escuchar. El script `npm start` fija `NODE_ENV=production`; el script `npm test` intenta ejecutar Jest.

## 3. Convenciones de respuesta

### Éxito

Las respuestas de lectura, creación y actualización siguen estas formas:

```json
{
  "status": "success",
  "data": {
    "_id": "ID_GENERADO_POR_MONGODB",
    "name": "Teclado mecánico",
    "category": "Periféricos",
    "price": 120000,
    "stock": 10,
    "createdAt": "2026-01-01T12:00:00.000Z",
    "updatedAt": "2026-01-01T12:00:00.000Z"
  }
}
```

El ejemplo ilustra la estructura; los identificadores y fechas reales los genera MongoDB/Mongoose.

### Errores

El formato depende de la condición detectada por el middleware central:

- Validación de Mongoose: `400`, `status: "fail"`, mensaje y lista `errors`.
- ID con formato inválido: `400`, `status: "fail"`.
- Recurso inexistente al consultar por ID, actualizar o eliminar: `404`, `status: "error"`.
- Ruta no registrada: `404`, `status: "fail"`.
- Error inesperado: normalmente `500`, `status: "error"`. En modo `development` se muestra el mensaje original; en otros modos se devuelve un mensaje genérico.

No se ha implementado un contrato explícito para errores de clave duplicada ni una respuesta uniforme para todos los errores. Si se requiere consistencia estricta, debe abordarse como mejora de código.

## 4. Endpoints

### 4.1 Estado del servicio

**GET** `/health`

No requiere parámetros ni cuerpo.

Respuesta `200 OK`:

```json
{
  "status": "success",
  "message": "Servidor de Inventario activo"
}
```

### 4.2 Listar productos

**GET** `/api/v1/products`

- **Query parameters:** el controlador pasa `req.query` directamente a `Product.find()`. Para uso normal, se pueden filtrar campos del modelo como `name`, `category`, `price` y `stock`; no hay paginación ni ordenamiento implementados explícitamente.
- **Body:** ninguno.

Ejemplo:

```http
GET /api/v1/products?category=Periféricos
```

Respuesta `200 OK`:

```json
{
  "status": "success",
  "results": 1,
  "data": [
    {
      "_id": "ID_GENERADO_POR_MONGODB",
      "name": "Teclado mecánico",
      "category": "Periféricos",
      "price": 120000,
      "stock": 10,
      "createdAt": "2026-01-01T12:00:00.000Z",
      "updatedAt": "2026-01-01T12:00:00.000Z"
    }
  ]
}
```

La lista vacía también devuelve `200 OK`, con `results: 0` y `data: []`.

### 4.3 Consultar producto por ID

**GET** `/api/v1/products/:id`

- **Path parameter:** `id` (obligatorio), ObjectId de MongoDB.
- **Body:** ninguno.

Ejemplo:

```http
GET /api/v1/products/65a000000000000000000001
```

Respuesta `200 OK`: objeto producto dentro de `data`, con el formato de éxito descrito arriba.

Errores:
- `400 Bad Request`: ID con formato inválido.
- `404 Not Found`: ID válido pero sin producto asociado.

### 4.4 Crear producto

**POST** `/api/v1/products`

Encabezado: `Content-Type: application/json`.

Cuerpo:

| Campo | Tipo | Obligatorio | Restricción observada |
|---|---|---|---|
| `name` | string | Sí | No vacío; se aplica `trim` |
| `category` | string | Sí | No vacío; se aplica `trim` |
| `price` | number | Sí | Mayor o igual a 0 |
| `stock` | number | No | Por defecto 0; mayor o igual a 0 |

Ejemplo:

```json
{
  "name": "Teclado mecánico",
  "category": "Periféricos",
  "price": 120000,
  "stock": 10
}
```

Respuesta `201 Created`:

```json
{
  "status": "success",
  "data": {
    "_id": "ID_GENERADO_POR_MONGODB",
    "name": "Teclado mecánico",
    "category": "Periféricos",
    "price": 120000,
    "stock": 10,
    "createdAt": "2026-01-01T12:00:00.000Z",
    "updatedAt": "2026-01-01T12:00:00.000Z"
  }
}
```

Error de validación `400 Bad Request`:

```json
{
  "status": "fail",
  "message": "Datos de entrada inválidos",
  "errors": [
    "El nombre del producto es obligatorio"
  ]
}
```

Los mensajes concretos dependen del campo que falle la validación.

### 4.5 Actualizar producto

**PUT** `/api/v1/products/:id`

- **Path parameter:** `id` (obligatorio).
- **Body:** objeto JSON con uno o varios campos actualizables del producto. Mongoose ejecuta validadores en la actualización (`runValidators: true`).

Ejemplo:

```json
{
  "price": 125000,
  "stock": 8
}
```

Respuesta `200 OK`:

```json
{
  "status": "success",
  "data": {
    "_id": "ID_GENERADO_POR_MONGODB",
    "name": "Teclado mecánico",
    "category": "Periféricos",
    "price": 125000,
    "stock": 8,
    "createdAt": "2026-01-01T12:00:00.000Z",
    "updatedAt": "2026-01-02T12:00:00.000Z"
  }
}
```

Errores:
- `400 Bad Request`: ID inválido o datos que no superan la validación.
- `404 Not Found`: no existe producto con ese ID.

### 4.6 Eliminar producto

**DELETE** `/api/v1/products/:id`

- **Path parameter:** `id` (obligatorio).
- **Body:** ninguno.

Respuesta `204 No Content`: no devuelve cuerpo. Aunque el controlador prepara un objeto JSON, Express no envía cuerpo cuando el estado es 204.

Errores:
- `400 Bad Request`: ID inválido.
- `404 Not Found`: producto inexistente.

## 5. Ejemplos con cURL

Crear:

```bash
curl -X POST http://localhost:3000/api/v1/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Teclado mecánico","category":"Periféricos","price":120000,"stock":10}'
```

Listar:

```bash
curl "http://localhost:3000/api/v1/products"
```

Consultar por ID:

```bash
curl "http://localhost:3000/api/v1/products/65a000000000000000000001"
```

Actualizar:

```bash
curl -X PUT "http://localhost:3000/api/v1/products/65a000000000000000000001" \
  -H "Content-Type: application/json" \
  -d '{"price":125000,"stock":8}'
```

Eliminar:

```bash
curl -X DELETE "http://localhost:3000/api/v1/products/65a000000000000000000001"
```

## 6. Resumen de códigos HTTP

| Código | Uso |
|---|---|
| `200 OK` | Health check, consulta, listado o actualización correcta |
| `201 Created` | Producto creado |
| `204 No Content` | Producto eliminado correctamente, sin cuerpo |
| `400 Bad Request` | ObjectId inválido o validación de datos fallida |
| `404 Not Found` | Ruta inexistente o producto no encontrado |
| `500 Internal Server Error` | Error inesperado del servidor |

## 7. Seguridad y limitaciones actuales

- No hay autenticación JWT, inicio de sesión ni autorización implementados en las rutas actuales.
- No se publica ningún secreto en esta documentación. Mantén `MONGODB_URI` en un archivo de entorno local excluido de Git o en el gestor de secretos del despliegue.
- No hay paginación, ordenamiento ni una capa de validación de parámetros de consulta dedicada.
- No hay una especificación Swagger/OpenAPI instalada en las dependencias actuales.
- Los ejemplos de identificadores y fechas son ilustrativos, no registros reales.

## 8. Verificación de la documentación

Antes de dar por cerrada esta tarea, verificar manualmente o con pruebas que los endpoints y códigos descritos coincidan con la aplicación ejecutada. Esta documentación se redactó a partir de `src/app.js`, `src/routes/productRoutes.js`, `src/controllers/productController.js`, `src/services/productService.js`, `src/models/Product.js` y `src/middlewares/errorHandler.js` en `develop`. La verificación de ejecución queda pendiente hasta disponer de un entorno con las variables configuradas.
