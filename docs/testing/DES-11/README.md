# JIRA DES-11: Validación de Contratos y Comportamiento de la API mediante Pruebas de Integración y Postman

## 1. Resumen Ejecutivo

En el marco de la tarea **DES-11**, se diseñó, implementó y ejecutó una estrategia integral de validación para la API REST de Inventario de Productos (`api-inventario-productos`). Esta solución garantiza la confiabilidad del backend mediante:

1. **Pruebas de Integración con tres estrategias formales**:
   - **Top-Down:** Pruebas desde la capa de transporte HTTP y controladores hacia abajo, aislando la persistencia mediante dobles de prueba (`jest.spyOn`).
   - **Bottom-Up:** Pruebas desde el modelo Mongoose y la base de datos MongoDB hacia arriba, integrando el servicio y los controladores.
   - **Big Bang:** Pruebas de extremo a extremo (E2E) con todos los módulos y la base de datos real en memoria interactuando simultáneamente.
2. **Documentación Formal de Contratos de la API**: Detalle riguroso de endpoints, esquemas de entrada/salida, códigos HTTP y reglas de validación en [`api-contracts.md`](./api-contracts.md).
3. **Colección Automatizada de Postman y Ejecución con Newman**:
   - Colección compatible v2.1.0 (`postman/DES-11-API-Tests.postman_collection.json`) con 16 peticiones y 34 aserciones JavaScript reales (`pm.test`, `pm.expect`).
   - Archivo de entorno reproducible (`postman/DES-11-Environment.json`).
   - Script de ejecución continua con Newman (`scripts/run-newman.js`) y reporte exportado (`postman/newman-report.json`).

---

## 2. Estructura de Entregables

```text
├── docs/
│   └── testing/
│       └── DES-11/
│           ├── README.md                      # Informe principal y evidencias de ejecución
│           ├── api-contracts.md               # Especificación completa de contratos REST
│           └── integration-strategies.md      # Detalle técnico de Top-Down, Bottom-Up y Big Bang
├── postman/
│   ├── DES-11-API-Tests.postman_collection.json  # Colección Postman con scripts de validación
│   ├── DES-11-Environment.json                   # Variables de entorno seguras para Postman
│   └── newman-report.json                        # Reporte real de ejecución Newman en formato JSON
├── scripts/
│   ├── test-server.js                         # Servidor HTTP con MongoDB en memoria para pruebas
│   └── run-newman.js                          # Orquestador automatizado para ejecutar Newman
└── test/
    ├── app.test.js                            # Pruebas base de la aplicación
    ├── setup/
    │   └── mongo-memory.js                    # Utilidad de ciclo de vida de MongoDB en memoria
    └── integration/
        ├── top-down.test.js                   # Suite de pruebas Top-Down (Jest + Supertest)
        ├── bottom-up.test.js                  # Suite de pruebas Bottom-Up (Jest + Mongoose)
        └── big-bang.test.js                   # Suite de pruebas Big Bang (Jest + Supertest + DB)
```

---

## 3. Requisitos Previos y Configuración del Entorno

- **Node.js:** Versión >= 20.x (verificado con v24.16.0).
- **NPM:** Gestor de paquetes incluido con Node.
- **Newman:** Versión >= 6.x (`newman` global o vía `npx`).
- **Dependencias de desarrollo:** `mongodb-memory-server` se añadió para permitir la ejecución de pruebas 100% aisladas, rápidas y reproducibles sin requerir servicios externos activos ni exponer credenciales.

### Instalación:

```bash
npm install
```

---

## 4. Comandos de Ejecución

### 4.1. Pruebas Unitarias y de Integración (Jest)

Ejecuta todas las suites (Unitarias, Top-Down, Bottom-Up y Big Bang):

```bash
npm test
```

Para ejecutar únicamente las pruebas de integración:

```bash
npx cross-env NODE_ENV=test jest test/integration --detectOpenHandles --runInBand
```

### 4.2. Pruebas Automatizadas con Newman (Postman)

Inicia el servidor de pruebas local en memoria y ejecuta la colección Postman generando el reporte:

```bash
node scripts/run-newman.js
```

---

## 5. Resultados Reales de Ejecución

### 5.1. Resumen de Pruebas Jest

| Suite de Prueba | Estrategia / Módulo | Pruebas Ejecutadas | Aprobadas | Fallidas | Tiempo |
|---|---|:---:|:---:|:---:|:---:|
| `test/app.test.js` | Rutas base y 404 | 2 | 2 | 0 | ~100 ms |
| `test/integration/top-down.test.js` | Top-Down (Transporte -> Controladores -> Mocks) | 8 | 8 | 0 | ~1.5 s |
| `test/integration/bottom-up.test.js` | Bottom-Up (Modelo -> Servicio -> Controlador) | 9 | 9 | 0 | ~6.5 s |
| `test/integration/big-bang.test.js` | Big Bang (Sistema E2E Integrado) | 11 | 11 | 0 | ~2.5 s |
| **Total** | **4 Suites** | **30** | **30** | **0** | **12.69 s** |

### 5.2. Resumen de Ejecución Postman / Newman

| Métrica | Valor Obtenido |
|---|:---:|
| **Iteraciones** | 1 |
| **Peticiones HTTP ejecutadas** | 16 |
| **Peticiones fallidas** | 0 |
| **Scripts de validación ejecutados** | 16 |
| **Aserciones JavaScript ejecutadas** | 34 |
| **Aserciones fallidas** | 0 |
| **Tasa de éxito** | **100%** |
| **Tiempo promedio de respuesta** | 32 ms (min: 5 ms, max: 123 ms) |
| **Reporte exportado** | `postman/newman-report.json` |

---

## 6. Incidencias Encontradas y Soluciones Aplicadas

1. **Resolución DNS y conexión externa a MongoDB Atlas:**
   - *Causa:* El clúster remoto de MongoDB Atlas requiere tener la dirección IP pública autorizada en la lista de acceso de red (*whitelist*). Al ejecutarse desde un entorno dinámico o sin whitelist activa, la conexión fallaba con `querySrv ECONNREFUSED` y `Could not connect to any servers`.
   - *Solución:* Se incorporó `mongodb-memory-server` como dependencia de desarrollo y se desacopló el arranque de pruebas para usar instancias en memoria oficiales de MongoDB. Esto garantiza idempotencia y reproducibilidad tanto en local como en pipelines de Integración Continua (CI/GitHub Actions) sin depender de conexión a internet ni exponer secretos.
2. **Sincronización asíncrona de controladores con `catchAsync`:**
   - *Causa:* En las pruebas Bottom-Up de Nivel 3, el controlador retornaba `void` internamente al usar `catchAsync` sobre callbacks de Express, impidiendo que `await controller(req, res)` esperara a que se ejecutara `res.json()`.
   - *Solución:* Se implementó un arnés de ejecución `executeController(fn, req, res)` que envuelve la respuesta en una Promesa que resuelve al emitir `res.json()` o rechaza si ocurre un error hacia el middleware `next()`.
3. **Manejo de rutas con espacios en Windows para Newman:**
   - *Causa:* Al invocar `newman` mediante `child_process.spawn` en Windows sobre una ruta con espacios (`Kelly Tatiana`), los argumentos eran divididos erróneamente.
   - *Solución:* Se configuró el script `scripts/run-newman.js` con rutas relativas estables basadas en el directorio de trabajo del repositorio, garantizando ejecución sin fallos.
