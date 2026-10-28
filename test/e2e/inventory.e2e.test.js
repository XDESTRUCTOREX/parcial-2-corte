/**
 * PRUEBAS DE AUTOMATIZACIÓN DE INTERFAZ E2E CON SELENIUM Y PAGE OBJECT MODEL (POM)
 * Tarea: JIRA DESC-12
 * 
 * Flujos cubiertos:
 *  1. Carga inicial de la aplicación y estado del backend.
 *  2. Validación de campos obligatorios y valores negativos en el cliente.
 *  3. Creación exitosa de producto y reflejo en la tabla del catálogo.
 *  4. Consulta detallada en ventana modal.
 *  5. Filtrado dinámico por categoría.
 *  6. Edición y actualización de un producto existente.
 *  7. Eliminación confirmada de un producto.
 */

const http = require("http");
const app = require("../../src/app");
const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const DriverFactory = require("./config/driver-factory");
const InventoryPage = require("./pages/InventoryPage");

describe("Automatización E2E con Selenium WebDriver y Page Object Model", () => {
  let driver;
  let page;
  let mongoServer;
  let httpServer;
  let baseUrl;

  // Tiempo límite amplio para inicialización de navegador y servidor en Windows
  jest.setTimeout(60000);

  beforeAll(async () => {
    // 1. Iniciar MongoDB en memoria para pruebas E2E aisladas
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri, { dbName: "inventario_e2e" });

    // 2. Iniciar servidor Express en puerto dinámico
    await new Promise((resolve) => {
      httpServer = http.createServer(app);
      httpServer.listen(0, () => {
        const port = httpServer.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });

    // 3. Iniciar Selenium WebDriver (Chrome Headless)
    driver = await DriverFactory.createDriver();
    page = new InventoryPage(driver);
  });

  afterAll(async () => {
    if (driver) {
      await driver.quit();
    }
    if (httpServer) {
      await new Promise((resolve) => httpServer.close(resolve));
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  test("01 - Carga inicial de la aplicación y verificación de estado en línea", async () => {
    await page.navigateTo(baseUrl);

    const title = await page.getAppTitle();
    expect(title).toContain("Inventario de Productos");

    // Verificar que el indicador de estado confirme conexión con el backend
    await page.waitForText(page.locators.serverStatus, "Servidor de Inventario activo", 10000);
    const statusText = await page.getServerStatusText();
    expect(statusText).toContain("Servidor de Inventario activo");
  });

  test("02 - Validación de formulario del lado del cliente ante datos inválidos", async () => {
    // Intentar enviar formulario vacío
    await page.submitForm();

    const nameError = await page.getNameError();
    expect(nameError).toBe("El nombre del producto es obligatorio");

    // Intentar enviar con precio negativo
    await page.fillForm({
      name: "Producto Prueba",
      category: "Periféricos",
      price: -500,
    });
    await page.submitForm();

    const priceError = await page.getPriceError();
    expect(priceError).toBe("El precio no puede ser negativo");
  });

  test("03 - Creación exitosa de producto y visualización en el catálogo", async () => {
    await page.createProduct({
      name: "Mouse Gamer Óptico",
      category: "Periféricos",
      price: 95000,
      stock: 15,
    });

    // Esperar mensaje de éxito en banner
    const alertText = await page.waitForAlert();
    expect(alertText).toContain("creado con éxito");

    // Verificar que el producto aparece en la tabla
    await page.waitForTableRowCount(1);
    const count = await page.getTableRowCount();
    expect(count).toBe(1);

    const countLabel = await page.getProductsCountText();
    expect(countLabel).toContain("Total: 1 producto");
  });

  test("04 - Consulta de detalle del producto en ventana modal", async () => {
    await page.clickViewDetailByIndex(0);

    const detail = await page.getModalDetail();
    expect(detail.name).toBe("Mouse Gamer Óptico");
    expect(detail.category).toBe("Periféricos");
    expect(detail.stock).toContain("15");

    await page.closeDetailModal();
  });

  test("05 - Filtrado dinámico por categoría en el catálogo", async () => {
    // Crear un segundo producto en otra categoría (Audio)
    await page.createProduct({
      name: "Auriculares Diadema Bluetooth",
      category: "Audio",
      price: 180000,
      stock: 8,
    });

    await page.waitForAlert();
    await page.waitForTableRowCount(2);

    // Filtrar por categoría "Audio"
    await page.filterByCategory("Audio");
    await page.waitForTableRowCount(1);

    // Restaurar a "Todas las categorías"
    await page.filterByCategory("");
    await page.waitForTableRowCount(2);
  });

  test("06 - Edición y actualización exitosa de un producto", async () => {
    // Seleccionar editar el primer producto de la lista
    await page.clickEditProductByIndex(0);

    // Modificar precio y stock
    await page.fillForm({
      price: 105000,
      stock: 20,
    });
    await page.submitForm();

    const alertText = await page.waitForAlert();
    expect(alertText).toContain("actualizado correctamente");
  });

  test("07 - Eliminación confirmada de un producto del catálogo", async () => {
    // Inicialmente tenemos 2 productos
    await page.waitForTableRowCount(2);

    // Eliminar el primer producto y confirmar en diálogo
    await page.clickDeleteProductByIndex(0);

    const alertText = await page.waitForAlert();
    expect(alertText).toContain("eliminado satisfactoriamente");

    // Verificar que ahora queda 1 producto
    await page.waitForTableRowCount(1);
    const countLabel = await page.getProductsCountText();
    expect(countLabel).toContain("Total: 1 producto");
  });
});

