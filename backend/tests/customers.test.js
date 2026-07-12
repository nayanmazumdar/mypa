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

describe('GET /api/customers', () => {
  it('should return customers list', async () => {
    const res = await request(app)
      .get('/api/customers')
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.pagination).toBeDefined();
  });

  it('should support search', async () => {
    const res = await request(app)
      .get('/api/customers?search=Test')
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});

describe('GET /api/customers/search/quick', () => {
  it('should return quick search results', async () => {
    const res = await request(app)
      .get('/api/customers/search/quick?q=Test')
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].name).toContain('Test');
  });

  it('should return empty for short query', async () => {
    const res = await request(app)
      .get('/api/customers/search/quick?q=T')
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });
});

describe('POST /api/customers', () => {
  it('should create a customer', async () => {
    const res = await request(app)
      .post('/api/customers')
      .set(authHeader(token))
      .send({ name: 'New Customer', phone: '9777777777', email: 'new@cust.com' });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('New Customer');
  });

  it('should reject customer without name', async () => {
    const res = await request(app)
      .post('/api/customers')
      .set(authHeader(token))
      .send({ phone: '9666666666' });

    // May be 400 or 500 depending on DB constraint
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

describe('PUT /api/customers/:id', () => {
  it('should update a customer', async () => {
    const res = await request(app)
      .put(`/api/customers/${testData.customerId}`)
      .set(authHeader(token))
      .send({ name: 'Updated Customer', phone: '9777777777' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('POST /api/customers/:id/credit', () => {
  it('should add credit to customer', async () => {
    const res = await request(app)
      .post(`/api/customers/${testData.customerId}/credit`)
      .set(authHeader(token))
      .send({ amount: 500, reference: 'RCP-TEST', notes: 'Test credit' });

    expect(res.status).toBe(200);
    expect(parseFloat(res.body.data.balance)).toBe(500);
  });

  it('should reject zero amount', async () => {
    const res = await request(app)
      .post(`/api/customers/${testData.customerId}/credit`)
      .set(authHeader(token))
      .send({ amount: 0 });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/customers/:id/payment', () => {
  it('should record payment and reduce balance', async () => {
    const res = await request(app)
      .post(`/api/customers/${testData.customerId}/payment`)
      .set(authHeader(token))
      .send({ amount: 200, payment_method: 'cash' });

    expect(res.status).toBe(200);
    expect(parseFloat(res.body.data.balance)).toBe(300); // 500 - 200
  });
});

describe('DELETE /api/customers/:id', () => {
  let custToDelete;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/customers')
      .set(authHeader(token))
      .send({ name: 'Delete Me', phone: '9111111111' });
    custToDelete = res.body.data.id;
  });

  it('should delete a customer', async () => {
    const res = await request(app)
      .delete(`/api/customers/${custToDelete}`)
      .set(authHeader(token));

    expect(res.status).toBe(200);
  });
});
