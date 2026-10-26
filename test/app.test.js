const request = require('supertest');
const app = require('../src/app');

describe('API básica', () => {
  test('GET /health responde 200 y estado success', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'success',
      message: 'Servidor de Inventario activo',
    });
  });

  test('ruta inexistente responde 404 con formato fail', async () => {
    const response = await request(app).get('/ruta-que-no-existe');

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      status: 'fail',
      message: expect.stringContaining('/ruta-que-no-existe'),
    });
  });
});
