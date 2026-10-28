/**
 * ESTRATEGIA DE INTEGRACIÓN: TOP-DOWN
 * 
 * Enfoque: Se prueban los componentes de los niveles superiores de la arquitectura
 * (Rutas HTTP Express, Middleware de Seguridad/CORS, Controlador y Middleware Centralizado de Errores)
 * integrándolos de arriba hacia abajo, sustituyendo las capas inferiores (Capa de Servicios y Persistencia)
 * mediante dobles de prueba (stubs/mocks con jest.spyOn).
 * 
 * Componentes reales:
 *  - src/app.js (Express Application, middleware Helmet, CORS, JSON parser, enrutador)
 *  - src/routes/productRoutes.js (Definición y mapeo de rutas)
 *  - src/controllers/productController.js (Extracción de parámetros, invocación y respuesta HTTP)
 *  - src/middlewares/errorHandler.js (Traducción de errores a respuestas HTTP)
 * 
 * Componentes simulados (Test Doubles):
 *  - src/services/productService.js (Métodos getAllProducts, getProductById, createProduct, updateProduct, deleteProduct)
 */

const request = require("supertest");
const app = require("../../src/app");
const productService = require("../../src/services/productService");

describe("Integración Top-Down: Rutas -> Controladores -> ErrorHandler (con Service Stub)", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("GET /api/v1/products (Listar con filtros)", () => {
    test("debe propagar los query params al servicio y responder 200 con estructura de éxito", async () => {
      const mockProducts = [
        {
          _id: "65a000000000000000000001",
          name: "Mouse Gamer",
          category: "Periféricos",
          price: 85000,
          stock: 15,
        },
        {
          _id: "65a000000000000000000002",
          name: "Teclado RGB",
          category: "Periféricos",
          price: 150000,
          stock: 8,
        },
      ];

      const getAllSpy = jest
        .spyOn(productService, "getAllProducts")
        .mockResolvedValue(mockProducts);

      const res = await request(app)
        .get("/api/v1/products?category=Periféricos")
        .set("Accept", "application/json");

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toMatch(/json/);
      expect(getAllSpy).toHaveBeenCalledWith({ category: "Periféricos" });
      expect(res.body).toEqual({
        status: "success",
        results: 2,
        data: mockProducts,
      });
    });

    test("debe devolver results 0 y arreglo vacío cuando no existen productos", async () => {
      jest.spyOn(productService, "getAllProducts").mockResolvedValue([]);

      const res = await request(app).get("/api/v1/products");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        status: "success",
        results: 0,
        data: [],
      });
    });
  });

  describe("GET /api/v1/products/:id (Consultar por ID)", () => {
    test("debe responder 200 cuando el producto existe", async () => {
      const mockProduct = {
        _id: "65a000000000000000000001",
        name: "Monitor 24 pulgadas",
        category: "Pantallas",
        price: 550000,
        stock: 5,
      };

      const getByIdSpy = jest
        .spyOn(productService, "getProductById")
        .mockResolvedValue(mockProduct);

      const res = await request(app).get(
        "/api/v1/products/65a000000000000000000001"
      );

      expect(res.status).toBe(200);
      expect(getByIdSpy).toHaveBeenCalledWith("65a000000000000000000001");
      expect(res.body).toEqual({
        status: "success",
        data: mockProduct,
      });
    });

    test("debe propagar error de recurso no encontrado hacia errorHandler y responder 404", async () => {
      jest
        .spyOn(productService, "getProductById")
        .mockRejectedValue(new Error("Recurso no encontrado"));

      const res = await request(app).get(
        "/api/v1/products/65a000000000000000000099"
      );

      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        status: "error",
        message: "Recurso no encontrado",
      });
    });
  });

  describe("POST /api/v1/products (Crear producto)", () => {
    test("debe enviar el cuerpo al servicio y responder 201 Created", async () => {
      const newProductInput = {
        name: "Auriculares Inalámbricos",
        category: "Audio",
        price: 210000,
        stock: 20,
      };

      const createdProduct = {
        _id: "65a000000000000000000003",
        ...newProductInput,
        createdAt: "2026-10-28T12:00:00.000Z",
        updatedAt: "2026-10-28T12:00:00.000Z",
      };

      const createSpy = jest
        .spyOn(productService, "createProduct")
        .mockResolvedValue(createdProduct);

      const res = await request(app)
        .post("/api/v1/products")
        .send(newProductInput)
        .set("Content-Type", "application/json");

      expect(res.status).toBe(201);
      expect(createSpy).toHaveBeenCalledWith(newProductInput);
      expect(res.body).toEqual({
        status: "success",
        data: createdProduct,
      });
    });

    test("debe capturar ValidationError de Mongoose y responder 400 con lista de mensajes", async () => {
      const validationError = new Error("Validation Failed");
      validationError.name = "ValidationError";
      validationError.errors = {
        name: { message: "El nombre del producto es obligatorio" },
        price: { message: "El precio es obligatorio" },
      };

      jest
        .spyOn(productService, "createProduct")
        .mockRejectedValue(validationError);

      const res = await request(app)
        .post("/api/v1/products")
        .send({ category: "Audio" });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe("fail");
      expect(res.body.message).toBe("Datos de entrada inválidos");
      expect(res.body.errors).toContain(
        "El nombre del producto es obligatorio"
      );
      expect(res.body.errors).toContain("El precio es obligatorio");
    });
  });

  describe("PUT /api/v1/products/:id (Actualizar producto)", () => {
    test("debe responder 200 con el producto actualizado", async () => {
      const updateData = { price: 230000, stock: 18 };
      const updatedProduct = {
        _id: "65a000000000000000000003",
        name: "Auriculares Inalámbricos",
        category: "Audio",
        price: 230000,
        stock: 18,
      };

      const updateSpy = jest
        .spyOn(productService, "updateProduct")
        .mockResolvedValue(updatedProduct);

      const res = await request(app)
        .put("/api/v1/products/65a000000000000000000003")
        .send(updateData);

      expect(res.status).toBe(200);
      expect(updateSpy).toHaveBeenCalledWith(
        "65a000000000000000000003",
        updateData
      );
      expect(res.body).toEqual({
        status: "success",
        data: updatedProduct,
      });
    });

    test("debe responder 404 si el servicio indica recurso no encontrado", async () => {
      jest
        .spyOn(productService, "updateProduct")
        .mockRejectedValue(new Error("Recurso no encontrado"));

      const res = await request(app)
        .put("/api/v1/products/65a000000000000000000003")
        .send({ price: 999 });

      expect(res.status).toBe(404);
      expect(res.body.status).toBe("error");
    });
  });

  describe("DELETE /api/v1/products/:id (Eliminar producto)", () => {
    test("debe invocar deleteProduct y responder 204 sin contenido", async () => {
      const deleteSpy = jest
        .spyOn(productService, "deleteProduct")
        .mockResolvedValue({ _id: "65a000000000000000000003" });

      const res = await request(app).delete(
        "/api/v1/products/65a000000000000000000003"
      );

      expect(res.status).toBe(204);
      expect(res.text).toBe("");
      expect(deleteSpy).toHaveBeenCalledWith("65a000000000000000000003");
    });

    test("debe responder 404 cuando el producto a eliminar no existe", async () => {
      jest
        .spyOn(productService, "deleteProduct")
        .mockRejectedValue(new Error("Recurso no encontrado"));

      const res = await request(app).delete(
        "/api/v1/products/65a000000000000000000099"
      );

      expect(res.status).toBe(404);
      expect(res.body.status).toBe("error");
    });
  });
});

