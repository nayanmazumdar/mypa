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

describe('GET /api/pos/products', () => {
  it('should return products with stock info', async () => {
    const res = await request(app)
      .get('/api/pos/products')
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBeGreaterThan(0);

    const product = res.body.data[0];
    expect(product.name).toBeDefined();
    expect(product.selling_price).toBeDefined();
    expect(product.stock).toBeDefined();
  });

  it('should support search', async () => {
    const res = await request(app)
      .get('/api/pos/products?search=Test')
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});

describe('POST /api/pos/checkout', () => {
  it('should process a cash checkout', async () => {
    const res = await request(app)
      .post('/api/pos/checkout')
      .set(authHeader(token))
      .send({
        items: [
          { product_id: testData.productId, product_name: 'Test Product', quantity: 2, unit: 'piece', unit_price: 100 },
        ],
        payment_method: 'cash',
        amount_received: 200,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.receipt_number).toBeDefined();
    expect(res.body.data.net_amount).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
  });

  it('should process checkout with discount', async () => {
    const res = await request(app)
      .post('/api/pos/checkout')
      .set(authHeader(token))
      .send({
        items: [
          { product_id: testData.productId, product_name: 'Test Product', quantity: 1, unit: 'piece', unit_price: 100 },
        ],
        discount: 10,
        payment_method: 'upi',
        amount_received: 90,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.discount).toBe(10);
    expect(res.body.data.net_amount).toBe(90);
  });

  it('should process checkout with customer', async () => {
    const res = await request(app)
      .post('/api/pos/checkout')
      .set(authHeader(token))
      .send({
        items: [
          { product_id: testData.productId, product_name: 'Test Product', quantity: 1, unit: 'piece', unit_price: 100 },
        ],
        customer_name: 'Test Customer',
        customer_id: testData.customerId,
        payment_method: 'cash',
        amount_received: 100,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.customer_name).toBe('Test Customer');
  });

  it('should calculate change correctly', async () => {
    const res = await request(app)
      .post('/api/pos/checkout')
      .set(authHeader(token))
      .send({
        items: [
          { product_id: testData.productId, product_name: 'Test Product', quantity: 1, unit: 'piece', unit_price: 100 },
        ],
        payment_method: 'cash',
        amount_received: 500,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.change_amount).toBe(400);
  });

  it('should reject empty cart', async () => {
    const res = await request(app)
      .post('/api/pos/checkout')
      .set(authHeader(token))
      .send({ items: [], payment_method: 'cash' });

    expect(res.status).toBe(400);
  });

  it('should reduce inventory after checkout', async () => {
    // Get current stock
    const before = await request(app).get('/api/pos/products?search=Test').set(authHeader(token));
    const stockBefore = parseFloat(before.body.data[0].stock);

    await request(app)
      .post('/api/pos/checkout')
      .set(authHeader(token))
      .send({
        items: [{ product_id: testData.productId, product_name: 'Test Product', quantity: 3, unit: 'piece', unit_price: 100 }],
        payment_method: 'cash',
        amount_received: 300,
      });

    const after = await request(app).get('/api/pos/products?search=Test').set(authHeader(token));
    const stockAfter = parseFloat(after.body.data[0].stock);

    expect(stockAfter).toBe(stockBefore - 3);
  });
});

describe('GET /api/pos/transactions', () => {
  it('should return transaction history', async () => {
    const res = await request(app)
      .get('/api/pos/transactions')
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.pagination).toBeDefined();
  });
});

describe('GET /api/pos/today-summary', () => {
  it('should return today summary', async () => {
    const res = await request(app)
      .get('/api/pos/today-summary')
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.data.total_transactions).toBeDefined();
    expect(res.body.data.total_revenue).toBeDefined();
  });
});
