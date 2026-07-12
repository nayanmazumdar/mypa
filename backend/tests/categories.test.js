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

describe('GET /api/categories', () => {
  it('should return categories list', async () => {
    const res = await request(app)
      .get('/api/categories')
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].name).toBe('Test Category');
  });
});

describe('POST /api/categories', () => {
  it('should create a category', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set(authHeader(token))
      .send({ name: 'New Category', description: 'Testing category creation' });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('New Category');
  });
});

describe('PUT /api/categories/:id', () => {
  it('should update a category', async () => {
    const res = await request(app)
      .put(`/api/categories/${testData.categoryId}`)
      .set(authHeader(token))
      .send({ name: 'Updated Category', description: 'Updated desc' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('DELETE /api/categories/:id', () => {
  let catToDelete;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/categories')
      .set(authHeader(token))
      .send({ name: 'Delete Me' });
    catToDelete = res.body.data.id;
  });

  it('should delete a category', async () => {
    const res = await request(app)
      .delete(`/api/categories/${catToDelete}`)
      .set(authHeader(token));

    expect(res.status).toBe(200);
  });
});
