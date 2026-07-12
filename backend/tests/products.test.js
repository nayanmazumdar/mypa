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

describe('GET /api/products', () => {
  it('should return products list', async () => {
    const res = await request(app)
      .get('/api/products')
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.pagination).toBeDefined();
  });

  it('should support search parameter', async () => {
    const res = await request(app)
      .get('/api/products?search=Test')
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].name).toContain('Test');
  });

  it('should reject unauthenticated request', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/products', () => {
  it('should create a new product', async () => {
    const res = await request(app)
      .post('/api/products')
      .set(authHeader(token))
      .send({
        name: 'New Product',
        sku: 'NEW-001',
        purchase_price: 30,
        selling_price: 50,
        unit: 'piece',
        category_id: testData.categoryId,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('New Product');
  });

  it('should reject product without name', async () => {
    const res = await request(app)
      .post('/api/products')
      .set(authHeader(token))
      .send({ sku: 'NO-NAME', purchase_price: 10, selling_price: 20 });

    expect(res.status).toBe(400);
  });

  it('should reject duplicate SKU', async () => {
    const res = await request(app)
      .post('/api/products')
      .set(authHeader(token))
      .send({ name: 'Dupe SKU', sku: 'TST-001', purchase_price: 10, selling_price: 20, unit: 'piece' });

    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

describe('PUT /api/products/:id', () => {
  it('should update an existing product', async () => {
    const res = await request(app)
      .put(`/api/products/${testData.productId}`)
      .set(authHeader(token))
      .send({ name: 'Updated Product', selling_price: 120, purchase_price: 60, unit: 'piece' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should return 404 for non-existent product', async () => {
    const res = await request(app)
      .put('/api/products/99999')
      .set(authHeader(token))
      .send({ name: 'Ghost', selling_price: 10, purchase_price: 5, unit: 'piece' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/products/:id', () => {
  let productToDelete;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/products')
      .set(authHeader(token))
      .send({ name: 'To Delete', sku: 'DEL-001', purchase_price: 10, selling_price: 20, unit: 'piece' });
    productToDelete = res.body.data.id;
  });

  it('should delete a product', async () => {
    const res = await request(app)
      .delete(`/api/products/${productToDelete}`)
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
