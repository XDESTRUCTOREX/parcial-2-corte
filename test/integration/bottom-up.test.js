/**
 * ESTRATEGIA DE INTEGRACIÓN: BOTTOM-UP
 * 
 * Enfoque: Se inicia probando los componentes inferiores fundamentales del sistema
 * (Modelo de datos Mongoose `Product` con persistencia real en MongoDB en memoria)
 * y se integran progresivamente las capas superiores (`productService` y luego `productController`),
 * verificando los contratos de interfaz, las transformaciones de datos y las reglas de negocio.
 * 
 * Niveles integrados progresivamente:
 *  - Nivel 1 (Base): Product Model (Mongoose) + Base de Datos MongoDB (en memoria)
 *  - Nivel 2: ProductService + Product Model + MongoDB
 *  - Nivel 3: ProductController + ProductService + Product Model + MongoDB
 * 
 * No se simulan los componentes inferiores; cada nivel superior opera contra dependencias
 * inferiores reales e integradas.
 */

const {
  connectTestDB,
  disconnectTestDB,
  clearTestDB,
} = require("../setup/mongo-memory");
const Product = require("../../src/models/Product");
const productService = require("../../src/services/productService");
const productController = require("../../src/controllers/productController");

describe("Integración Bottom-Up: Modelo -> Servicio -> Controlador", () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  describe("Nivel 1: Integración de Modelo Product con la Base de Datos", () => {
    test("debe persistir un documento válido con timestamps y valores por defecto", async () => {
      const product = await Product.create({
        name: "  Mouse Inalámbrico  ",
        category: "  Periféricos  ",
        price: 45000,
      });

      expect(product._id).toBeDefined();
      expect(product.name).toBe("Mouse Inalámbrico"); // trim aplicado
      expect(product.category).toBe("Periféricos"); // trim aplicado
      expect(product.price).toBe(45000);
      expect(product.stock).toBe(0); // valor por defecto
      expect(product.createdAt).toBeDefined();
      expect(product.updatedAt).toBeDefined();
    });

    test("debe rechazar la persistencia cuando faltan campos obligatorios", async () => {
      await expect(
        Product.create({
          price: 50000,
        })
      ).rejects.toThrow(/El nombre del producto es obligatorio/);
    });

    test("debe rechazar precios y stock negativos según las restricciones del esquema", async () => {
      await expect(
        Product.create({
          name: "Producto Inválido",
          category: "Pruebas",
          price: -100,
          stock: -5,
        })
      ).rejects.toThrow(/El precio no puede ser negativo/);
    });
  });

  describe("Nivel 2: Integración de ProductService sobre el Modelo Product", () => {
    test("productService.createProduct() debe persistir y retornar el nuevo producto", async () => {
      const data = {
        name: "Webcam Full HD",
        category: "Video",
        price: 180000,
        stock: 12,
      };

      const result = await productService.createProduct(data);

      expect(result._id).toBeDefined();
      expect(result.name).toBe("Webcam Full HD");
      expect(result.stock).toBe(12);

      const inDb = await Product.findById(result._id);
      expect(inDb).not.toBeNull();
      expect(inDb.price).toBe(180000);
    });

    test("productService.getAllProducts() debe filtrar correctamente por criterios", async () => {
      await Product.create([
        { name: "Teclado A", category: "Teclados", price: 100000, stock: 5 },
        { name: "Teclado B", category: "Teclados", price: 150000, stock: 3 },
        { name: "Mouse A", category: "Mouses", price: 60000, stock: 10 },
      ]);

      const filtered = await productService.getAllProducts({
        category: "Teclados",
      });
      expect(filtered).toHaveLength(2);
      expect(filtered.every((p) => p.category === "Teclados")).toBe(true);
    });

    test("productService.getProductById() debe retornar el producto o lanzar error si no existe", async () => {
      const created = await Product.create({
        name: "Hub USB",
        category: "Accesorios",
        price: 35000,
      });

      const found = await productService.getProductById(created._id);
      expect(found._id.toString()).toBe(created._id.toString());

      const nonExistentId = "507f1f77bcf86cd799439011";
      await expect(productService.getProductById(nonExistentId)).rejects.toThrow(
        "Recurso no encontrado"
      );
    });

    test("productService.updateProduct() debe validar datos en actualización y persistir cambios", async () => {
      const created = await Product.create({
        name: "Impresora Láser",
        category: "Oficina",
        price: 800000,
        stock: 4,
      });

      const updated = await productService.updateProduct(created._id, {
        price: 850000,
        stock: 2,
      });

      expect(updated.price).toBe(850000);
      expect(updated.stock).toBe(2);

      // Verificación de runValidators: true en actualización
      await expect(
        productService.updateProduct(created._id, { price: -500 })
      ).rejects.toThrow(/El precio no puede ser negativo/);
    });

    test("productService.deleteProduct() debe eliminar de la base de datos", async () => {
      const created = await Product.create({
        name: "Cable HDMI",
        category: "Cables",
        price: 15000,
      });

      await productService.deleteProduct(created._id);

      const check = await Product.findById(created._id);
      expect(check).toBeNull();
    });
  });

  describe("Nivel 3: Integración de ProductController sobre ProductService real", () => {
    const executeController = (controllerFn, req, res) => {
      return new Promise((resolve, reject) => {
        res.json = (payload) => {
          res.body = payload;
          resolve(res);
        };
        controllerFn(req, res, (err) => {
          if (err) reject(err);
          else resolve(res);
        });
      });
    };

    test("productController.create debe responder 201 y dar formato al objeto creado", async () => {
      const req = {
        body: {
          name: "Silla Ergonómica",
          category: "Mobiliario",
          price: 650000,
          stock: 3,
        },
      };

      const res = {
        statusCode: null,
        body: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
      };

      await executeController(productController.create, req, res);

      expect(res.statusCode).toBe(201);
      expect(res.body.status).toBe("success");
      expect(res.body.data.name).toBe("Silla Ergonómica");

      // Verificación en la base de datos real
      const persisted = await Product.findById(res.body.data._id);
      expect(persisted).not.toBeNull();
      expect(persisted.price).toBe(650000);
    });

    test("productController.getAll debe retornar resultados reales y conteo", async () => {
      await Product.create([
        { name: "P1", category: "Test", price: 1000 },
        { name: "P2", category: "Test", price: 2000 },
      ]);

      const req = { query: { category: "Test" } };
      const res = {
        statusCode: null,
        body: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
      };

      await executeController(productController.getAll, req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.results).toBe(2);
      expect(res.body.data).toHaveLength(2);
    });
  });
});

