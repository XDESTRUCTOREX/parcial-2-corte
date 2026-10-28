# Especificación Formal de Contratos de la API REST

**Servicio:** API REST de Inventario de Productos (`api-inventario-productos`)  
**Versión:** 1.0.0  
**Prefijo Base:** `/api/v1`  
**Host por Defecto:** `http://localhost:3000`  
**Formato de Intercambio:** `application/json`

---

## 1. Convenciones Globales de Respuesta

### 1.1. Estructura de Éxito (`200 OK`, `201 Created`)

```json
{
  "status": "success",
  "results": 1, // Presente en listados con múltiples registros
  "data": {
    "_id": "65a000000000000000000001",
    "name": "Teclado mecánico",
    "category": "Periféricos",
    "price": 120000,
    "stock": 10,
    "createdAt": "2026-10-28T12:00:00.000Z",
    "updatedAt": "2026-10-28T12:00:00.000Z"
  }
}
```

### 1.2. Estructura de Eliminación Exitosa (`204 No Content`)

- **Código HTTP:** `204 No Content`
- **Cuerpo:** Vacío (Longitud 0). Express finaliza la conexión sin cuerpo.

### 1.3. Estructura de Error de Validación / Entrada Inválida (`400 Bad Request`)

Ocurre ante errores de validación de Mongoose o conversión de tipos (CastError):

```json
{
  "status": "fail",
  "message": "Datos de entrada inválidos",
  "errors": [
    "El nombre del producto es obligatorio",
    "El precio no puede ser negativo"
  ]
}
```

Para errores de ID con formato incorrecto (CastError en Mongoose):

```json
{
  "status": "fail",
  "message": "ID inválido: valor-suministrado"
}
```

### 1.4. Estructura de Recurso No Encontrado (`404 Not Found`)

```json
{
  "status": "error",
  "message": "Recurso no encontrado"
}
```

Para rutas inexistentes en el servidor:

```json
{
  "status": "fail",
  "message": "Ruta /api/v1/ruta-no-existente no encontrada"
}
```

---

## 2. Definición Detallada de Endpoints

### 2.1. Estado del Servidor (Health Check)

- **Método:** `GET`
- **Ruta:** `/health`
- **Propósito:** Verificar la disponibilidad operativa de la API HTTP.
- **Autenticación:** Pública (No requerida).
- **Parámetros:** Ninguno.
- **Cuerpo de Petición:** Ninguno.
- **Códigos HTTP Esperados:**
  - `200 OK`: Servidor activo y respondiendo.

#### Respuesta Exitosa (`200 OK`):
```json
{
  "status": "success",
  "message": "Servidor de Inventario activo"
}
```

---

### 2.2. Listar Productos

- **Método:** `GET`
- **Ruta:** `/api/v1/products`
- **Propósito:** Obtener la lista completa de productos registrados o filtrarlos por propiedades específicas.
- **Autenticación:** Pública.
- **Parámetros de Consulta (Query Parameters):**
  - `category` *(opcional, string)*: Filtra productos por coincidencia exacta de categoría.
  - `name` *(opcional, string)*: Filtra por coincidencia de nombre.
  - `price` *(opcional, number)*: Filtra por precio exacto.
  - `stock` *(opcional, number)*: Filtra por stock exacto.
- **Cuerpo de Petición:** Ninguno.
- **Códigos HTTP Esperados:**
  - `200 OK`: Lista recuperada exitosamente (incluso si está vacía).

#### Respuesta Exitosa (`200 OK`):
```json
{
  "status": "success",
  "results": 2,
  "data": [
    {
      "_id": "671feb6a82c40c82d45a9010",
      "name": "Mouse Gamer Pro",
      "category": "Periféricos",
      "price": 95000,
      "stock": 20,
      "createdAt": "2026-10-28T16:00:00.000Z",
      "updatedAt": "2026-10-28T16:00:00.000Z"
    }
  ]
}
```

---

### 2.3. Consultar Producto por ID

- **Método:** `GET`
- **Ruta:** `/api/v1/products/:id`
- **Propósito:** Obtener los detalles completos de un producto a partir de su identificador único de MongoDB (`ObjectId`).
- **Autenticación:** Pública.
- **Parámetros de Ruta (Path Parameters):**
  - `id` *(obligatorio, string)*: Cadena hexadecimal de 24 caracteres correspondiente a un `ObjectId` de MongoDB.
- **Cuerpo de Petición:** Ninguno.
- **Códigos HTTP Esperados:**
  - `200 OK`: Producto encontrado exitosamente.
  - `400 Bad Request`: Formato de ID inválido (no es un ObjectId de 24 caracteres hexadecimales).
  - `404 Not Found`: Formato de ID válido pero ningún producto coincide con el identificador.

#### Ejemplo de Petición:
```http
GET /api/v1/products/671feb6a82c40c82d45a9010 HTTP/1.1
Host: localhost:3000
Accept: application/json
```

#### Respuesta Exitosa (`200 OK`):
```json
{
  "status": "success",
  "data": {
    "_id": "671feb6a82c40c82d45a9010",
    "name": "Mouse Gamer Pro",
    "category": "Periféricos",
    "price": 95000,
    "stock": 20,
    "createdAt": "2026-10-28T16:00:00.000Z",
    "updatedAt": "2026-10-28T16:00:00.000Z"
  }
}
```

---

### 2.4. Crear Producto

- **Método:** `POST`
- **Ruta:** `/api/v1/products`
- **Propósito:** Registrar un nuevo producto en la base de datos de inventario.
- **Autenticación:** Pública.
- **Cabeceras Obligatorias:**
  - `Content-Type: application/json`
  - `Accept: application/json`
- **Esquema del Cuerpo (JSON):**

| Campo | Tipo | Obligatorio | Restricciones / Validaciones |
|---|---|:---:|---|
| `name` | `string` | Sí | No vacío, espacios eliminados automáticamente (`trim`). |
| `category` | `string` | Sí | No vacío, espacios eliminados automáticamente (`trim`). |
| `price` | `number` | Sí | Valor numérico mayor o igual a `0`. No admite negativos. |
| `stock` | `number` | No | Valor numérico mayor o igual a `0`. Por defecto toma el valor `0`. |

#### Ejemplo de Petición:
```http
POST /api/v1/products HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "name": "Teclado Mecánico RGB",
  "category": "Periféricos",
  "price": 250000,
  "stock": 15
}
```

#### Respuesta Exitosa (`201 Created`):
```json
{
  "status": "success",
  "data": {
    "_id": "671feb8a82c40c82d45a9012",
    "name": "Teclado Mecánico RGB",
    "category": "Periféricos",
    "price": 250000,
    "stock": 15,
    "createdAt": "2026-10-28T16:10:00.000Z",
    "updatedAt": "2026-10-28T16:10:00.000Z"
  }
}
```

#### Respuestas de Error:
- `400 Bad Request` (Campos faltantes):
```json
{
  "status": "fail",
  "message": "Datos de entrada inválidos",
  "errors": [
    "El nombre del producto es obligatorio",
    "El precio es obligatorio"
  ]
}
```
- `400 Bad Request` (Precio o stock negativo):
```json
{
  "status": "fail",
  "message": "Datos de entrada inválidos",
  "errors": [
    "El precio no puede ser negativo"
  ]
}
```

---

### 2.5. Actualizar Producto

- **Método:** `PUT`
- **Ruta:** `/api/v1/products/:id`
- **Propósito:** Modificar uno o varios atributos de un producto existente.
- **Autenticación:** Pública.
- **Parámetros de Ruta:**
  - `id` *(obligatorio, string)*: `ObjectId` del producto.
- **Cuerpo de Petición:** Objeto JSON con los campos a modificar (`name`, `category`, `price`, `stock`). Se ejecutan validadores de esquema (`runValidators: true`).
- **Códigos HTTP Esperados:**
  - `200 OK`: Producto actualizado exitosamente.
  - `400 Bad Request`: Formato de ID inválido o valores fuera de las restricciones de esquema (p. ej. precio o stock negativo).
  - `404 Not Found`: No existe un producto con el ID suministrado.

#### Ejemplo de Petición:
```http
PUT /api/v1/products/671feb8a82c40c82d45a9012 HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "price": 235000,
  "stock": 10
}
```

#### Respuesta Exitosa (`200 OK`):
```json
{
  "status": "success",
  "data": {
    "_id": "671feb8a82c40c82d45a9012",
    "name": "Teclado Mecánico RGB",
    "category": "Periféricos",
    "price": 235000,
    "stock": 10,
    "createdAt": "2026-10-28T16:10:00.000Z",
    "updatedAt": "2026-10-28T16:15:00.000Z"
  }
}
```

---

### 2.6. Eliminar Producto

- **Método:** `DELETE`
- **Ruta:** `/api/v1/products/:id`
- **Propósito:** Eliminar un producto del inventario de forma permanente.
- **Autenticación:** Pública.
- **Parámetros de Ruta:**
  - `id` *(obligatorio, string)*: `ObjectId` del producto a eliminar.
- **Cuerpo de Petición:** Ninguno.
- **Códigos HTTP Esperados:**
  - `204 No Content`: Eliminación correcta. Sin cuerpo de respuesta.
  - `400 Bad Request`: Formato de ID inválido.
  - `404 Not Found`: El producto no existe o ya fue eliminado con anterioridad.

#### Ejemplo de Petición:
```http
DELETE /api/v1/products/671feb8a82c40c82d45a9012 HTTP/1.1
Host: localhost:3000
```

#### Respuesta Exitosa (`204 No Content`):
- Encabezados: `Status: 204 No Content`
- Cuerpo: *(vacío)*

