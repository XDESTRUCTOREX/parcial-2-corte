# JIRA DESC-12: Cliente HTML/JavaScript y Automatización de Pruebas de Interfaz con Selenium y Page Object Model (POM)

## 1. Resumen Ejecutivo

En la tarea **DESC-12** se diseñó, construyó y verificó:
1. **Un cliente web moderno, responsivo y completamente funcional** en HTML5, CSS3 puro y JavaScript vanilla (`frontend/`), sin dependencias pesadas de frameworks, capaz de interactuar con la totalidad de los endpoints de la API de Inventario de Productos (`api-inventario-productos`).
2. **Una suite completa de pruebas automatizadas E2E de interfaz de usuario** con **Selenium WebDriver** y el patrón de diseño **Page Object Model (POM)** (`test/e2e/`), ejecutadas de forma automatizada sobre Google Chrome en modo Headless.
3. **Manejo integral de estados en el cliente**: estados de carga asíncronos con *spinners*, bloqueo de envíos duplicados, validaciones de formularios en el cliente y visualización amigable de errores del servidor, notificaciones contextuales y ventanas modales de detalle.

---

## 2. Estructura de Entregables

```text
├── frontend/
│   ├── index.html                     # Estructura semántica del cliente web
│   ├── css/
│   │   └── styles.css                 # Diseño moderno, responsivo y accesible
│   └── js/
│       ├── api.js                     # Capa cliente HTTP para consumir la API REST
│       └── app.js                     # Lógica de interfaz, validaciones y manipulación del DOM
├── test/
│   ├── app.test.js                    # Pruebas base de la aplicación Express
│   └── e2e/
│       ├── config/
│       │   └── driver-factory.js      # Fábrica de inicialización de Selenium WebDriver (Chrome Headless)
│       ├── pages/
│       │   ├── BasePage.js            # Encapsulación de esperas explícitas y primitivas de WebDriver
│       │   └── InventoryPage.js       # Page Object Model con selectores estables data-testid y acciones
│       └── inventory.e2e.test.js      # Suite completa de pruebas automatizadas E2E
└── docs/
    └── testing/
        └── DESC-12/
            └── README.md              # Documentación técnica, guía de ejecución y evidencias
```

---

## 3. Arquitectura del Cliente Web (`frontend/`)

### 3.1. Tecnologías y Estructura
- **HTML5 Semántico:** Uso de etiquetas semánticas (`<header>`, `<main>`, `<section>`, `<table>`, `<dialog>/modal`), atributos de accesibilidad (`aria-label`, `role="alert"`) y selectores estables dedicados para pruebas (`data-testid`).
- **CSS3 Puro:** Diseño con CSS Custom Properties (variables), CSS Grid y Flexbox. Totalmente responsivo para pantallas móviles, tabletas y escritorio.
- **JavaScript Modular (ES6+):**
  - `api.js`: Expone `InventoryApiClient` encapsulando `fetch()`, manejo de cabeceras, conversión a JSON, captura de errores estructurados (`ApiError`) y configuración dinámica de la URL base en `localStorage`.
  - `app.js`: Controlador de vista. Orquesta la verificación de salud (`/health`), renderizado dinámico de productos, estados de carga, filtros por categoría, creación/actualización/eliminación de recursos y ventana modal de detalles.

### 3.2. Flujos Funcionales Implementados
1. **Verificación de Salud de la API:** Consulta periódica o manual a `/health`, actualizando el indicador visual (verde en línea / rojo desconectado).
2. **Listado y Filtros:** Carga automática del catálogo desde `GET /api/v1/products`, permitiendo filtrado instantáneo por categoría (`category=...`) y recarga manual.
3. **Registro de Productos:** Formulario con validación en cliente (nombre obligatorio, categoría requerida, precio >= 0, stock >= 0). Deshabilita el botón durante la petición para evitar envíos dobles.
4. **Consulta de Detalle:** Apertura de modal con datos enriquecidos (`_id`, fechas formateadas en moneda colombiana `COP`).
5. **Edición de Producto:** Cambio dinámico a "Modo Edición" precargando los datos del producto en el formulario y realizando un `PUT /api/v1/products/:id`.
6. **Eliminación con Confirmación:** Cuadro de diálogo de confirmación previo a `DELETE /api/v1/products/:id`, seguido de actualización inmediata del catálogo y notificación de éxito.

---

## 4. Automatización con Selenium y Page Object Model (POM)

### 4.1. Diseño del Page Object Model
El patrón POM desacopla completamente los selectores y la lógica de interacción de las aserciones de prueba:
- **`BasePage`:** Provee métodos robustos con esperas explícitas (`WebDriverWait` mediante `driver.wait` y `until`):
  - `waitForVisible(locator, timeout)`
  - `waitForText(locator, text, timeout)`
  - `click(locator)`
  - `clearAndType(locator, text)`
  - `selectOptionByValue(selectLocator, value)`
- **`InventoryPage`:** Hereda de `BasePage` y centraliza todos los selectores usando identificadores únicos `data-testid`:
  - `[data-testid="app-title"]`, `[data-testid="input-name"]`, `[data-testid="btn-submit"]`, etc.
  - Métodos de negocio: `createProduct(...)`, `fillForm(...)`, `waitForAlert(...)`, `filterByCategory(...)`, `clickEditProductByIndex(...)`, `clickDeleteProductByIndex(...)`, etc.
- **`DriverFactory`:** Configura Google Chrome con argumentos optimizados para entornos de integración y CI:
  - `--headless=new`
  - `--no-sandbox`
  - `--disable-dev-shm-usage`
  - `--window-size=1280,900`

---

## 5. Requisitos Previos y Configuración del Entorno

1. **Node.js:** Versión >= 20.x (verificado con Node v24.16.0).
2. **Google Chrome:** Navegador instalado en el sistema (Selenium Manager gestiona el ChromeDriver automáticamente).
3. **Dependencias:**
   ```bash
   npm install
   ```

---

## 6. Comandos de Ejecución

### 6.1. Iniciar la Aplicación en Modo Desarrollo
Para utilizar el cliente web manualmente desde el navegador:

```bash
npm run dev
```

Abra el navegador en:
```text
http://localhost:3000
```
La aplicación servirá el frontend automáticamente y consumirá la API REST en el mismo origen.

### 6.2. Ejecutar las Pruebas de Interfaz E2E (Selenium + POM)

Para ejecutar la suite completa de pruebas automatizadas E2E:

```bash
npm run test:e2e
```

O para ejecutar todas las pruebas del proyecto:

```bash
npm test
```

---

## 7. Resultados Reales de las Pruebas E2E

La suite fue ejecutada exitosamente con Jest y Google Chrome Headless:

```text
PASS test/e2e/inventory.e2e.test.js (26.602 s)
  Automatización E2E con Selenium WebDriver y Page Object Model
    √ 01 - Carga inicial de la aplicación y verificación de estado en línea (635 ms)
    √ 02 - Validación de formulario del lado del cliente ante datos inválidos (903 ms)
    √ 03 - Creación exitosa de producto y visualización en el catálogo (1453 ms)
    √ 04 - Consulta de detalle del producto en ventana modal (699 ms)
    √ 05 - Filtrado dinámico por categoría en el catálogo (1463 ms)
    √ 06 - Edición y actualización exitosa de un producto (1053 ms)
    √ 07 - Eliminación confirmada de un producto del catálogo (328 ms)

Test Suites: 1 passed, 1 total
Tests:       7 passed, 7 total
Snapshots:   0 total
Time:        26.871 s
```

### Resumen de Cobertura E2E:
- **Pruebas ejecutadas:** 7 escenarios.
- **Pruebas aprobadas:** 7 (100%).
- **Pruebas fallidas:** 0.
- **Flujos verificados:** Carga, verificación de backend, validación de inputs, creación E2E, apertura y cierre de modal, filtrado por query param en vivo, edición vía PUT y eliminación reactiva vía DELETE.

---

## 8. Incidencias Encontradas y Soluciones Aplicadas

1. **Gestión de puertos dinámicos para pruebas E2E:**
   - *Problema:* Si el puerto 3000 estuviera en uso por otro proceso, las pruebas E2E fallarían al ligar el servidor HTTP.
   - *Solución:* El arnés de prueba en `inventory.e2e.test.js` utiliza `httpServer.listen(0)`, permitiendo que el sistema operativo asigne un puerto libre efímero y configurando dinámicamente la URL base en el WebDriver.
2. **Esperas asíncronas en Selenium:**
   - *Problema:* El uso de esperas fijas (`sleep`) genera pruebas lentas y frágiles (*flaky tests*).
   - *Solución:* Se implementó `BasePage` con esperas explícitas (`until.elementLocated`, `until.elementIsVisible`, `until.elementIsEnabled`), sincronizando el ciclo de vida de los elementos con las respuestas asíncronas de la API.
3. **Confirmación nativa de alertas en navegador:**
   - *Problema:* La acción de eliminación desencadena un `window.confirm()` nativo del navegador que bloquea el hilo de ejecución si no se gestiona.
   - *Solución:* Se programó `InventoryPage.clickDeleteProductByIndex()` para esperar la presencia de la alerta con `until.alertIsPresent()` y aceptarla automáticamente con `alert.accept()`.

