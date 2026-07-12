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

describe('POST /api/expenses', () => {
  it('should create an expense', async () => {
    const res = await request(app)
      .post('/api/expenses')
      .set(authHeader(token))
      .send({ category: 'Rent', amount: 5000, description: 'Monthly rent', payment_method: 'bank_transfer', expense_date: '2026-07-01' });

    expect(res.status).toBe(201);
    expect(res.body.data.category).toBe('Rent');
  });

  it('should create another expense', async () => {
    const res = await request(app)
      .post('/api/expenses')
      .set(authHeader(token))
      .send({ category: 'Electricity', amount: 1200, expense_date: '2026-07-05' });

    expect(res.status).toBe(201);
  });

  it('should reject expense without category', async () => {
    const res = await request(app)
      .post('/api/expenses')
      .set(authHeader(token))
      .send({ amount: 100 });

    expect(res.status).toBe(400);
  });

  it('should reject expense without amount', async () => {
    const res = await request(app)
      .post('/api/expenses')
      .set(authHeader(token))
      .send({ category: 'Transport' });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/expenses', () => {
  it('should return expenses list', async () => {
    const res = await request(app)
      .get('/api/expenses')
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});

describe('GET /api/expenses/summary', () => {
  it('should return expense summary by category', async () => {
    const res = await request(app)
      .get('/api/expenses/summary')
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
  });
});

describe('DELETE /api/expenses/:id', () => {
  let expenseId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/expenses')
      .set(authHeader(token))
      .send({ category: 'Temp', amount: 50, expense_date: '2026-07-10' });
    expenseId = res.body.data.id;
  });

  it('should delete an expense', async () => {
    const res = await request(app)
      .delete(`/api/expenses/${expenseId}`)
      .set(authHeader(token));

    expect(res.status).toBe(200);
  });
});
