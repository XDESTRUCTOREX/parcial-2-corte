/**
 * ESTRATEGIA DE INTEGRACIÓN: BIG BANG
 * 
 * Enfoque: Se integran todos los módulos y capas del sistema de manera simultánea
 * y se prueba la aplicación completa de extremo a extremo:
 * Cliente HTTP (Supertest) -> Servidor Express -> Middlewares (Helmet, CORS, JSON Parser)
 * -> Rutas -> Controladores -> Servicios -> Modelos Mongoose -> Base de Datos MongoDB (en memoria).
 * 
 * Alcance y Propósito:
 *  - Valida el ciclo de vida completo de un recurso (CRUD) en el sistema integrado.
 *  - Valida el comportamiento integral ante entradas inválidas, IDs con formato incorrecto y recursos inexistentes.
 *  - Valida la respuesta del sistema ante fallos transversales y rutas inexistentes.
 * 
 * Riesgos y limitaciones documentados de Big Bang:
 *  - Alta dificultad para aislar la causa raíz cuando ocurre un fallo, ya que todas las capas intervienen.
 *  - Requiere que todas las dependencias (red, base de datos, modelos, servicios) estén operativas al mismo tiempo.
 *  - Puede enmascarar errores de interfaz internos si la capa superior compensa deficiencias de la inferior.
 */

const request = require("supertest");
const app = require("../../src/app");
const {
  connectTestDB,
  disconnectTestDB,
  clearTestDB,
} = require("../setup/mongo-memory");

describe("Integración Big Bang: Sistema Completo Integrado de Extremo a Extremo", () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  describe("Ciclo de Vida Completo del Producto (CRUD E2E)", () => {
    test("debe ejecutar el flujo completo: Crear -> Consultar por ID -> Listar con filtro -> Actualizar -> Eliminar -> Confirmar 404", async () => {
      // 1. Crear producto (POST)
      const newProductPayload = {
        name: "Laptop Gamer RTX",
        category: "Computadores",
        price: 4500000,
        stock: 5,
      };

      const createRes = await request(app)
        .post("/api/v1/products")
        .send(newProductPayload)
        .expect("Content-Type", /json/)
        .expect(201);

      expect(createRes.body.status).toBe("success");
      expect(createRes.body.data).toBeDefined();
      expect(createRes.body.data._id).toBeDefined();
      expect(createRes.body.data.name).toBe("Laptop Gamer RTX");
      expect(createRes.body.data.stock).toBe(5);

      const productId = createRes.body.data._id;

      // 2. Consultar por ID (GET :id)
      const getRes = await request(app)
        .get(`/api/v1/products/${productId}`)
        .expect(200);

      expect(getRes.body.status).toBe("success");
      expect(getRes.body.data._id).toBe(productId);
      expect(getRes.body.data.price).toBe(4500000);

      // 3. Listar con filtro (GET ?category=Computadores)
      const listRes = await request(app)
        .get("/api/v1/products?category=Computadores")
        .expect(200);

      expect(listRes.body.status).toBe("success");
      expect(listRes.body.results).toBe(1);
      expect(listRes.body.data[0]._id).toBe(productId);

      // 4. Actualizar producto (PUT :id)
      const updatePayload = {
        price: 4300000,
        stock: 4,
      };

      const updateRes = await request(app)
        .put(`/api/v1/products/${productId}`)
        .send(updatePayload)
        .expect(200);

      expect(updateRes.body.status).toBe("success");
      expect(updateRes.body.data.price).toBe(4300000);
      expect(updateRes.body.data.stock).toBe(4);

      // 5. Eliminar producto (DELETE :id)
      await request(app)
        .delete(`/api/v1/products/${productId}`)
        .expect(204);

      // 6. Confirmar eliminación (GET :id debe responder 404)
      const postDeleteRes = await request(app)
        .get(`/api/v1/products/${productId}`)
        .expect(404);

      expect(postDeleteRes.body).toEqual({
        status: "error",
        message: "Recurso no encontrado",
      });
    });
  });

  describe("Validaciones de Contrato y Manejo de Errores en Sistema Integrado", () => {
    test("POST con datos vacíos debe responder 400 Bad Request y detallar campos requeridos", async () => {
      const res = await request(app)
        .post("/api/v1/products")
        .send({})
        .expect(400);

      expect(res.body.status).toBe("fail");
      expect(res.body.message).toBe("Datos de entrada inválidos");
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.body.errors).toContain("El nombre del producto es obligatorio");
      expect(res.body.errors).toContain("La categoría es obligatoria");
      expect(res.body.errors).toContain("El precio es obligatorio");
    });

    test("GET con ID de formato inválido debe retornar 400 con mensaje de CastError", async () => {
      const res = await request(app)
        .get("/api/v1/products/formato-invalido-123")
        .expect(400);

      expect(res.body.status).toBe("fail");
      expect(res.body.message).toContain("ID inválido: formato-invalido-123");
    });

    test("PUT con precio negativo debe ser rechazado por la validación del esquema con 400", async () => {
      // Creamos primero un producto válido
      const initial = await request(app)
        .post("/api/v1/products")
        .send({ name: "Parlante", category: "Audio", price: 100000 });

      const id = initial.body.data._id;

      const res = await request(app)
        .put(`/api/v1/products/${id}`)
        .send({ price: -50 })
        .expect(400);

      expect(res.body.status).toBe("fail");
      expect(res.body.message).toBe("Datos de entrada inválidos");
      expect(res.body.errors).toContain("El precio no puede ser negativo");
    });

    test("PUT sobre ID válido inexistente debe responder 404 Recurso no encontrado", async () => {
      const res = await request(app)
        .put("/api/v1/products/507f1f77bcf86cd799439011")
        .send({ price: 20000 })
        .expect(404);

      expect(res.body).toEqual({
        status: "error",
        message: "Recurso no encontrado",
      });
    });

    test("DELETE sobre ID válido inexistente debe responder 404 Recurso no encontrado", async () => {
      const res = await request(app)
        .delete("/api/v1/products/507f1f77bcf86cd799439011")
        .expect(404);

      expect(res.body).toEqual({
        status: "error",
        message: "Recurso no encontrado",
      });
    });
  });

  describe("Endpoints Generales e Infraestructura", () => {
    test("GET /health debe retornar 200 y mensaje de servidor activo", async () => {
      const res = await request(app).get("/health").expect(200);

      expect(res.body).toEqual({
        status: "success",
        message: "Servidor de Inventario activo",
      });
    });

    test("Ruta no registrada debe responder 404 con mensaje estructurado", async () => {
      const res = await request(app).get("/api/v1/ruta-inexistente").expect(404);

      expect(res.body.status).toBe("fail");
      expect(res.body.message).toContain("Ruta /api/v1/ruta-inexistente no encontrada");
    });
  });
});

