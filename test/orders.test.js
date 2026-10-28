const path = require('path');
const request = require('supertest');
const mongoose = require('mongoose');

const PROJECT_ROOT = path.join(__dirname, '..');
const { MongoMemoryServer } = require(
  path.join(PROJECT_ROOT, 'node_modules', 'mongodb-memory-server'),
);

const app = require('../src/app');
const Order = require('../src/models/Order');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), { dbName: 'inventario_test' });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Limpieza entre pruebas: cada caso parte de las colecciones vacías
afterEach(async () => {
  const collections = mongoose.connection.collections;
  await Promise.all(
    Object.values(collections).map((collection) => collection.deleteMany({})),
  );
});

// Helper: crea un producto real vía la API y devuelve su id
const createProductId = async (overrides = {}) => {
  const response = await request(app)
    .post('/api/v1/products')
    .send({
      name: 'Producto de prueba',
      category: 'General',
      price: 10000,
      stock: 50,
      ...overrides,
    });
  return response.body.data._id;
};

const createOrder = (body) => request(app).post('/api/v1/orders').send(body);

// ObjectId con formato válido pero sin producto asociado
const NON_EXISTENT_ID = '65b000000000000000000009';

describe('POST /api/v1/orders', () => {
  describe('Orden válida', () => {
    test('crea la orden y responde 201 con los importes calculados', async () => {
      const productId = await createProductId({
        name: 'Teclado mecánico',
        price: 120000,
      });

      const response = await createOrder({
        customer: 'Tienda Techno',
        items: [{ product: productId, quantity: 2 }],
      });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toMatchObject({
        _id: expect.any(String),
        customer: 'Tienda Techno',
        status: 'creada',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0]).toMatchObject({
        product: productId,
        quantity: 2,
        unitPrice: 120000,
        lineTotal: 240000,
      });
      expect(response.body.data.total).toBe(240000);
    });

    test('suma consistentemente los importes de varios ítems', async () => {
      const idA = await createProductId({ name: 'Mouse inalámbrico', price: 45000 });
      const idB = await createProductId({ name: 'Hub USB', price: 25000 });

      const response = await createOrder({
        customer: 'Compras Andinas',
        items: [
          { product: idA, quantity: 2 },
          { product: idB, quantity: 3 },
        ],
      });

      expect(response.status).toBe(201);
      expect(response.body.data.items[0].lineTotal).toBe(90000);
      expect(response.body.data.items[1].lineTotal).toBe(75000);
      expect(response.body.data.total).toBe(165000);
    });

    test('usa el precio de la base de datos e ignora los importes enviados por el cliente', async () => {
      const productId = await createProductId({ price: 50000 });

      const response = await createOrder({
        customer: 'Cliente Confiado',
        items: [
          { product: productId, quantity: 2, unitPrice: 1, lineTotal: 1 },
        ],
        total: 1,
      });

      expect(response.status).toBe(201);
      expect(response.body.data.items[0]).toMatchObject({
        unitPrice: 50000,
        lineTotal: 100000,
      });
      expect(response.body.data.total).toBe(100000);
    });

    test('redondea los importes a dos decimales', async () => {
      const productId = await createProductId({ price: 0.1 });

      const response = await createOrder({
        customer: 'Cliente Decimal',
        items: [{ product: productId, quantity: 3 }],
      });

      // 0.1 * 3 produce 0.30000000000000004 en coma flotante;
      // el cálculo del servicio lo redondea a 0.3
      expect(response.status).toBe(201);
      expect(response.body.data.items[0].lineTotal).toBe(0.3);
      expect(response.body.data.total).toBe(0.3);
    });

    test('acepta el mismo producto en dos líneas distintas', async () => {
      const productId = await createProductId({ price: 10000 });

      const response = await createOrder({
        customer: 'Cliente Recurrente',
        items: [
          { product: productId, quantity: 1 },
          { product: productId, quantity: 2 },
        ],
      });

      expect(response.status).toBe(201);
      expect(response.body.data.items).toHaveLength(2);
      expect(response.body.data.total).toBe(30000);
    });

    test('persiste la orden en MongoDB', async () => {
      const productId = await createProductId({ price: 10000 });
      const created = await createOrder({
        customer: 'Cliente Persistente',
        items: [{ product: productId, quantity: 2 }],
      });
      const { _id } = created.body.data;

      const persisted = await Order.findById(_id);
      expect(persisted).not.toBeNull();
      expect(persisted.customer).toBe('Cliente Persistente');
      expect(persisted.total).toBe(20000);
      expect(persisted.status).toBe('creada');
    });

    test('aplica trim al nombre del cliente', async () => {
      const productId = await createProductId();

      const response = await createOrder({
        customer: '   Cliente con espacios   ',
        items: [{ product: productId, quantity: 1 }],
      });

      expect(response.status).toBe(201);
      expect(response.body.data.customer).toBe('Cliente con espacios');
    });
  });

  describe('Producto inexistente (error de negocio)', () => {
    test('responde 422 cuando el producto no existe y no persiste la orden', async () => {
      const response = await createOrder({
        customer: 'Cliente Prueba',
        items: [{ product: NON_EXISTENT_ID, quantity: 1 }],
      });

      expect(response.status).toBe(422);
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain(NON_EXISTENT_ID);

      const total = await Order.countDocuments();
      expect(total).toBe(0);
    });

    test('responde 422 cuando uno de varios productos no existe', async () => {
      const productId = await createProductId();

      const response = await createOrder({
        customer: 'Cliente Prueba',
        items: [
          { product: productId, quantity: 1 },
          { product: NON_EXISTENT_ID, quantity: 2 },
        ],
      });

      expect(response.status).toBe(422);
      expect(response.body.status).toBe('fail');

      const total = await Order.countDocuments();
      expect(total).toBe(0);
    });
  });

  describe('Solicitud inválida', () => {
    test('responde 400 cuando falta el cliente', async () => {
      const productId = await createProductId();

      const response = await createOrder({
        items: [{ product: productId, quantity: 1 }],
      });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toBe('Datos de entrada inválidos');
      expect(response.body.errors).toContain('El cliente es obligatorio');
    });

    test('responde 400 cuando el cliente está en blanco', async () => {
      const productId = await createProductId();

      const response = await createOrder({
        customer: '   ',
        items: [{ product: productId, quantity: 1 }],
      });

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('El cliente es obligatorio');
    });

    test('responde 400 cuando no se envían ítems', async () => {
      const response = await createOrder({ customer: 'Cliente Sin Ítems' });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('fail');
      expect(response.body.errors.join(' ')).toMatch(/ítem/i);
    });

    test('responde 400 cuando la lista de ítems está vacía', async () => {
      const response = await createOrder({
        customer: 'Cliente Vacío',
        items: [],
      });

      expect(response.status).toBe(400);
      expect(response.body.errors.join(' ')).toMatch(/ítem/i);
    });

    test('responde 400 cuando falta la cantidad', async () => {
      const productId = await createProductId();

      const response = await createOrder({
        customer: 'Cliente Prueba',
        items: [{ product: productId }],
      });

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('La cantidad es obligatoria');
    });

    test('responde 400 cuando la cantidad es cero', async () => {
      const productId = await createProductId();

      const response = await createOrder({
        customer: 'Cliente Prueba',
        items: [{ product: productId, quantity: 0 }],
      });

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('La cantidad debe ser mayor a cero');
    });

    test('responde 400 cuando la cantidad es negativa', async () => {
      const productId = await createProductId();

      const response = await createOrder({
        customer: 'Cliente Prueba',
        items: [{ product: productId, quantity: -3 }],
      });

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('La cantidad debe ser mayor a cero');
    });

    test('responde 400 cuando la cantidad no es entera', async () => {
      const productId = await createProductId();

      const response = await createOrder({
        customer: 'Cliente Prueba',
        items: [{ product: productId, quantity: 1.5 }],
      });

      expect(response.status).toBe(400);
      expect(response.body.errors.join(' ')).toMatch(/entero/i);
    });

    test('responde 400 cuando la cantidad no es numérica', async () => {
      const productId = await createProductId();

      const response = await createOrder({
        customer: 'Cliente Prueba',
        items: [{ product: productId, quantity: 'dos' }],
      });

      expect(response.status).toBe(400);
      // Mongoose reporta el casteo fallido dentro del detalle del campo quantity
      expect(response.body.errors.join(' ')).toMatch(/quantity/);
    });

    test('responde 400 cuando el id de producto tiene formato inválido', async () => {
      const response = await createOrder({
        customer: 'Cliente Prueba',
        items: [{ product: 'abc123', quantity: 1 }],
      });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('fail');
    });

    test('responde 400 ante un cuerpo JSON malformado', async () => {
      const response = await request(app)
        .post('/api/v1/orders')
        .set('Content-Type', 'application/json')
        .send('{"customer": "truncado"');

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toBe(
        'JSON malformado en el cuerpo de la petición',
      );
    });
  });
});
