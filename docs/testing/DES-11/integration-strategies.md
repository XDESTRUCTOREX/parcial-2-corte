# Estrategias de Pruebas de Integración (DES-11)

Este documento detalla la fundamentación teórica, la arquitectura de implementación, los componentes reales vs. simulados, y el análisis de riesgos de las tres estrategias de integración aplicadas a la API REST de Inventario de Productos.

---

## 1. Visión General de la Arquitectura del Sistema

La API sigue una arquitectura por capas desacoplada en Node.js y Express:

```text
[ Cliente HTTP / Supertest / Postman ]
                 │
                 ▼
       [ Express App (src/app.js) ]
     (Helmet, CORS, JSON Body Parser)
                 │
                 ▼
  [ Enrutador (src/routes/productRoutes.js) ]
                 │
                 ▼
[ Controlador (src/controllers/productController.js) ]
                 │
                 ▼
   [ Servicio (src/services/productService.js) ]
                 │
                 ▼
     [ Modelo (src/models/Product.js) ]
                 │
                 ▼
     [ Base de Datos (MongoDB) ]
```

---

## 2. Estrategia 1: Integración Top-Down (Descendente)

### 2.1. Concepto y Enfoque
La estrategia **Top-Down** comienza probando los niveles superiores de la jerarquía arquitectónica e integra progresivamente las capas inferiores. Las capas inferiores que aún no se desean involucrar o que representan dependencias externas se sustituyen mediante **dobles de prueba** (*stubs* o *mocks*).

### 2.2. Implementación en el Proyecto (`test/integration/top-down.test.js`)
- **Componentes Reales:**
  - `src/app.js`: Configuración del servidor Express, middlewares globales (Helmet, CORS, `express.json`).
  - `src/routes/productRoutes.js`: Definición de endpoints y métodos HTTP.
  - `src/controllers/productController.js`: Desempaquetado de parámetros (`req.params`, `req.query`, `req.body`) y serialización de respuestas (`res.status()`, `res.json()`).
  - `src/middlewares/errorHandler.js`: Captura centralizada de excepciones y traducción a códigos HTTP 400, 404 y 500.
- **Componentes Simulados (Stubs):**
  - `src/services/productService.js`: Se interceptan sus métodos (`getAllProducts`, `getProductById`, `createProduct`, `updateProduct`, `deleteProduct`) utilizando `jest.spyOn()` para simular tanto respuestas exitosas como errores controlados (`Recurso no encontrado`, `ValidationError`).

### 2.3. Objetivos de Verificación
1. Validar que las rutas HTTP dirijan correctamente las peticiones a la acción correspondiente del controlador.
2. Confirmar que los parámetros de consulta (`req.query`), identificadores de ruta (`req.params`) y cuerpos JSON (`req.body`) se pasen intactos hacia el servicio.
3. Verificar que el middleware de errores traduzca fielmente los fallos del servicio a las respuestas estructuradas esperadas por el contrato de la API.

### 2.4. Ventajas y Limitaciones
- **Ventajas:** Permite aislar tempranamente errores de transporte HTTP, serialización y contratos de respuesta sin requerir que la base de datos esté lista.
- **Limitaciones:** No detecta fallos en consultas a la base de datos ni incoherencias en las restricciones del esquema de Mongoose, ya que el servicio está simulado.

---

## 3. Estrategia 2: Integración Bottom-Up (Ascendente)

### 3.1. Concepto y Enfoque
La estrategia **Bottom-Up** inicia probando los módulos más bajos y fundamentales del sistema (modelo de datos y persistencia), integrando progresivamente las capas superiores (`Service` y luego `Controller`). No requiere simulación de la base de datos, sino un entorno de persistencia controlado.

### 3.2. Implementación en el Proyecto (`test/integration/bottom-up.test.js`)
Se estructura en tres niveles progresivos:
- **Nivel 1 (Base):** Integración directa del modelo Mongoose `Product` contra una base de datos real en memoria (`MongoMemoryServer`).
  - Valida restricciones de esquema: `trim` automático, campos obligatorios (`name`, `category`, `price`), valor por defecto de `stock: 0`, y rechazo de precios o stock negativos.
- **Nivel 2 (Intermedio):** Integración de `productService` sobre el modelo y la base de datos real.
  - Valida operaciones CRUD: persistencia efectiva de documentos, consultas filtradas, actualización con validaciones activas (`runValidators: true`) y eliminación de registros.
- **Nivel 3 (Superior):** Integración de `productController` sobre `productService` real.
  - Invoca las funciones del controlador pasando objetos `req` y `res` simulados, verificando la entrega de códigos de estado (201, 200) y el formato del sobre JSON (`status: "success"`, `results`, `data`).

### 3.3. Objetivos de Verificación
1. Garantizar la integridad referencial y las reglas de validación en la base de datos.
2. Asegurar que la capa de servicio procese correctamente los documentos y arroje errores de negocio (`Recurso no encontrado`) cuando corresponda.
3. Comprobar la comunicación directa entre controlador y servicio sin la sobrecarga del transporte HTTP.

### 3.4. Ventajas y Limitaciones
- **Ventajas:** Alta fiabilidad en la lógica de negocio y en el comportamiento de los datos. Facilita la detección de errores en etapas tempranas de persistencia.
- **Limitaciones:** No valida la capa de transporte de red (Express, cabeceras HTTP, enrutamiento, códigos de respuesta del servidor web).

---

## 4. Estrategia 3: Integración Big Bang

### 4.1. Concepto y Enfoque
En la estrategia **Big Bang**, todos los componentes del sistema se ensamblan simultáneamente y se evalúan en conjunto desde el punto de entrada exterior. No se utiliza ningún doble de prueba; todas las capas (HTTP, Express, Enrutador, Middleware, Controlador, Servicio, Modelo y MongoDB) interactúan en tiempo real.

### 4.2. Implementación en el Proyecto (`test/integration/big-bang.test.js`)
- Se ejecutan pruebas de extremo a extremo utilizando `supertest` contra la instancia completa de `app.js` respaldada por `MongoMemoryServer`.
- Se evalúa el ciclo de vida completo de un producto (E2E):
  1. `POST /api/v1/products`: Creación del recurso.
  2. `GET /api/v1/products/:id`: Consulta individual del recurso creado.
  3. `GET /api/v1/products?category=...`: Consulta filtrada en la colección.
  4. `PUT /api/v1/products/:id`: Actualización de precio y stock.
  5. `DELETE /api/v1/products/:id`: Eliminación física del registro.
  6. `GET /api/v1/products/:id`: Confirmación de eliminación con respuesta 404.
- Se evalúan escenarios de falla transversal:
  - Cuerpos vacíos en POST -> 400 Bad Request con array de errores.
  - IDs inválidos en GET/PUT/DELETE -> 400 Bad Request (CastError).
  - IDs válidos inexistentes en PUT/DELETE -> 404 Not Found.
  - Rutas no registradas -> 404 Fail.

### 4.3. Ventajas, Limitaciones y Riesgos Documentados
- **Ventajas:**
  - Refleja con máxima fidelidad la experiencia real del cliente que consume la API.
  - Verifica la sincronización integral entre todas las capas de la arquitectura.
- **Limitaciones y Riesgos:**
  - **Aislamiento de fallos complejo:** Cuando una prueba Big Bang falla, es difícil identificar inmediatamente si el origen está en el middleware, el enrutador, el controlador, el servicio, el validador del modelo o la base de datos.
  - **Dependencia estricta de entorno:** Si la base de datos o una dependencia transversal no está disponible, la totalidad de la suite Big Bang se bloquea.
  - **Enmascaramiento de errores:** Un error en una capa intermedia puede ser compensado o amortiguado por otra capa, ocultando defectos internos que las pruebas Top-Down o Bottom-Up aíslan con claridad.

---

## 5. Matriz Comparativa de Estrategias

| Criterio | Top-Down | Bottom-Up | Big Bang |
|---|---|---|---|
| **Punto de inicio** | Capa superior (HTTP / Router) | Capa inferior (Model / DB) | Todo el sistema simultáneo |
| **Uso de dobles de prueba** | Sí (Stubs en Service) | No (Arnés para Controller) | Ninguno (100% componentes reales) |
| **Dependencia de Base de Datos** | Ninguna (Mockeada) | Requerida (En memoria) | Requerida (En memoria o Atlas) |
| **Facilidad para aislar fallos** | Alta (Capa web y transporte) | Alta (Persistencia y lógica) | Baja (Múltiples capas involucradas) |
| **Cobertura de integración E2E** | Parcial (Sin persistencia real) | Parcial (Sin capa HTTP) | Total (Flujo completo del cliente) |

