const request = require('supertest');
const app = require('../src/app');
const { setupTestDB, seedTestData, teardownTestDB } = require('./setup');
const { generateTestToken, authHeader } = require('./helpers');

let testData;
let token;

beforeAll(async () => {
  const conn = await setupTestDB();
  testData = await seedTestData(conn);
  token = generateTestToken({
    id: testData.userId,
    uuid: testData.userUuid,
    email: 'test@shopkeeper.com',
    role: 'admin',
    shop_id: testData.shopId,
  });
});

afterAll(async () => {
  await teardownTestDB();
});

describe('GET /api/inventory', () => {
  it('should return inventory list', async () => {
    const res = await request(app)
      .get('/api/inventory')
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('should include product name and stock data', async () => {
    const res = await request(app)
      .get('/api/inventory')
      .set(authHeader(token));

    const item = res.body.data[0];
    expect(item.product_name || item.name).toBeDefined();
    expect(item.quantity).toBeDefined();
  });
});

describe('GET /api/inventory/low-stock', () => {
  it('should return low stock items', async () => {
    const res = await request(app)
      .get('/api/inventory/low-stock')
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeInstanceOf(Array);
  });
});

describe('POST /api/inventory/add', () => {
  it('should add stock to a product', async () => {
    const res = await request(app)
      .post('/api/inventory/add')
      .set(authHeader(token))
      .send({
        product_id: testData.productId,
        quantity: 10,
        type: 'in',
        notes: 'Restock from test',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should reduce stock (out)', async () => {
    const res = await request(app)
      .post('/api/inventory/add')
      .set(authHeader(token))
      .send({
        product_id: testData.productId,
        quantity: 5,
        type: 'out',
        notes: 'Manual removal',
      });

    expect(res.status).toBe(200);
  });
});
