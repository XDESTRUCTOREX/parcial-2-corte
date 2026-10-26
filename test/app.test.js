const path = require("path");
const request = require("supertest");
const mongoose = require("mongoose");

const PROJECT_ROOT = path.join(__dirname, "..");
const { MongoMemoryServer } = require(
  path.join(PROJECT_ROOT, "node_modules", "mongodb-memory-server"),
);

const app = require("../src/app");

// Producto base reutilizado por varios casos de prueba
const baseProduct = {
  name: "Teclado mecánico",
  category: "Periféricos",
  price: 120000,
  stock: 10,
};

const createProduct = (overrides = {}) =>
  request(app)
    .post("/api/v1/products")
    .send({ ...baseProduct, ...overrides });

// ObjectId válido en formato pero inexistente en la colección
const NON_EXISTENT_ID = "65a000000000000000000001";

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), { dbName: "inventario_test" });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Limpieza entre pruebas: cada caso parte de la colección vacía
afterEach(async () => {
  const collections = mongoose.connection.collections;
  await Promise.all(
    Object.values(collections).map((collection) => collection.deleteMany({})),
  );
});

describe("GET /health", () => {
  test("responde 200 con estado success", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: "success",
      message: "Servidor de Inventario activo",
    });
  });
});

describe("Ruta inexistente", () => {
  test("responde 404 con formato fail", async () => {
    const response = await request(app).get("/ruta-que-no-existe");

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      status: "fail",
      message: expect.stringContaining("/ruta-que-no-existe"),
    });
  });
});

describe("POST /api/v1/products", () => {
  test("crea un producto y responde 201 con el objeto persistido", async () => {
    const response = await createProduct();

    expect(response.status).toBe(201);
    expect(response.body.status).toBe("success");
    expect(response.body.data).toMatchObject({
      _id: expect.any(String),
      name: "Teclado mecánico",
      category: "Periféricos",
      price: 120000,
      stock: 10,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  test("asigna stock 0 por defecto cuando no se envía", async () => {
    const response = await createProduct({ stock: undefined });

    expect(response.status).toBe(201);
    expect(response.body.data.stock).toBe(0);
  });

  test("responde 400 cuando falta el nombre", async () => {
    const response = await createProduct({ name: undefined });

    expect(response.status).toBe(400);
    expect(response.body.status).toBe("fail");
    expect(response.body.message).toBe("Datos de entrada inválidos");
    expect(response.body.errors).toContain(
      "El nombre del producto es obligatorio",
    );
  });

  test("responde 400 cuando falta la categoría", async () => {
    const response = await createProduct({ category: undefined });

    expect(response.status).toBe(400);
    expect(response.body.status).toBe("fail");
    expect(response.body.errors).toContain("La categoría es obligatoria");
  });

  test("responde 400 cuando falta el precio", async () => {
    const response = await createProduct({ price: undefined });

    expect(response.status).toBe(400);
    expect(response.body.status).toBe("fail");
    expect(response.body.errors).toContain("El precio es obligatorio");
  });

  test("responde 400 cuando el precio es negativo", async () => {
    const response = await createProduct({ price: -5 });

    expect(response.status).toBe(400);
    expect(response.body.status).toBe("fail");
    expect(response.body.errors).toContain("El precio no puede ser negativo");
  });

  test("responde 400 cuando el stock es negativo", async () => {
    const response = await createProduct({ stock: -1 });

    expect(response.status).toBe(400);
    expect(response.body.status).toBe("fail");
    expect(response.body.errors).toContain("El stock no puede ser negativo");
  });

  test("responde 400 cuando el precio no es un número", async () => {
    const response = await createProduct({ price: "caro" });

    expect(response.status).toBe(400);
    expect(response.body.status).toBe("fail");
    expect(response.body.message).toBe("Datos de entrada inválidos");
    // Mongoose reporta el casteo fallido dentro del detalle del campo price
    expect(response.body.errors.join(" ")).toMatch(/price/);
  });

  test("responde 400 ante un cuerpo JSON malformado", async () => {
    const response = await request(app)
      .post("/api/v1/products")
      .set("Content-Type", "application/json")
      .send('{"name": "Producto truncado"');

    expect(response.status).toBe(400);
    expect(response.body.status).toBe("fail");
    expect(response.body.message).toBe(
      "JSON malformado en el cuerpo de la petición",
    );
  });
});

describe("GET /api/v1/products", () => {
  test("responde 200 con lista vacía cuando no hay productos", async () => {
    const response = await request(app).get("/api/v1/products");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("success");
    expect(response.body.results).toBe(0);
    expect(response.body.data).toEqual([]);
  });

  test("responde 200 con el listado de productos persistidos", async () => {
    await createProduct();
    await createProduct({
      name: "Mouse inalámbrico",
      category: "Periféricos",
      price: 45000,
    });

    const response = await request(app).get("/api/v1/products");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("success");
    expect(response.body.results).toBe(2);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.data[0]).toMatchObject({
      _id: expect.any(String),
      name: expect.any(String),
      category: expect.any(String),
    });
  });
});

describe("GET /api/v1/products/:id", () => {
  test("responde 200 con el producto consultado", async () => {
    const created = await createProduct();
    const { _id } = created.body.data;

    const response = await request(app).get(`/api/v1/products/${_id}`);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("success");
    expect(response.body.data).toMatchObject({
      _id: _id,
      name: "Teclado mecánico",
      price: 120000,
    });
  });

  test("responde 404 cuando el ID es válido pero el producto no existe", async () => {
    const response = await request(app).get(
      `/api/v1/products/${NON_EXISTENT_ID}`,
    );

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      status: "fail",
      message: "Recurso no encontrado",
    });
  });

  test("responde 400 cuando el ID tiene formato inválido", async () => {
    const response = await request(app).get("/api/v1/products/abc123");

    expect(response.status).toBe(400);
    expect(response.body.status).toBe("fail");
    expect(response.body.message).toMatch(/ID inválido/);
  });
});

describe("PUT /api/v1/products/:id", () => {
  test("actualiza campos y responde 200 con el producto actualizado", async () => {
    const created = await createProduct();
    const { _id } = created.body.data;

    const response = await request(app)
      .put(`/api/v1/products/${_id}`)
      .send({ price: 125000, stock: 8 });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("success");
    expect(response.body.data).toMatchObject({
      _id: _id,
      name: "Teclado mecánico",
      price: 125000,
      stock: 8,
    });

    // Verifica que la actualización quedó persistida en MongoDB
    const reloaded = await request(app).get(`/api/v1/products/${_id}`);
    expect(reloaded.body.data.price).toBe(125000);
    expect(reloaded.body.data.stock).toBe(8);
  });

  test("responde 404 cuando el ID es válido pero el producto no existe", async () => {
    const response = await request(app)
      .put(`/api/v1/products/${NON_EXISTENT_ID}`)
      .send({ price: 1000 });

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      status: "fail",
      message: "Recurso no encontrado",
    });
  });

  test("responde 400 cuando el ID tiene formato inválido", async () => {
    const response = await request(app)
      .put("/api/v1/products/xyz-999")
      .send({ price: 1000 });

    expect(response.status).toBe(400);
    expect(response.body.status).toBe("fail");
    expect(response.body.message).toMatch(/ID inválido/);
  });

  test("responde 400 cuando los datos violan la validación", async () => {
    const created = await createProduct();
    const { _id } = created.body.data;

    const response = await request(app)
      .put(`/api/v1/products/${_id}`)
      .send({ price: -1 });

    expect(response.status).toBe(400);
    expect(response.body.status).toBe("fail");
    expect(response.body.errors).toContain("El precio no puede ser negativo");
  });
});

describe("DELETE /api/v1/products/:id", () => {
  test("elimina el producto y responde 204 sin cuerpo", async () => {
    const created = await createProduct();
    const { _id } = created.body.data;

    const response = await request(app).delete(`/api/v1/products/${_id}`);

    expect(response.status).toBe(204);
    expect(response.text).toBe("");

    // Verifica que la eliminación quedó persistida: la consulta posterior falla
    const reloaded = await request(app).get(`/api/v1/products/${_id}`);
    expect(reloaded.status).toBe(404);
  });

  test("responde 404 cuando el ID es válido pero el producto no existe", async () => {
    const response = await request(app).delete(
      `/api/v1/products/${NON_EXISTENT_ID}`,
    );

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      status: "fail",
      message: "Recurso no encontrado",
    });
  });

  test("responde 400 cuando el ID tiene formato inválido", async () => {
    // Cadena de 6 caracteres: no es hex de 24 ni binario de 12, causa CastError
    const response = await request(app).delete("/api/v1/products/abc123");

    expect(response.status).toBe(400);
    expect(response.body.status).toBe("fail");
    expect(response.body.message).toMatch(/ID inválido/);
  });
});
