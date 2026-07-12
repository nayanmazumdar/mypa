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

describe('POST /api/auth/register', () => {
  it('should register a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'New User', email: 'new@test.com', password: 'Test1234', phone: '9000000001' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe('new@test.com');
    expect(res.body.data.user.role).toBe('admin');
  });

  it('should reject duplicate email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Dupe', email: 'test@shopkeeper.com', password: 'Test1234' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('should reject weak password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Weak', email: 'weak@test.com', password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should reject missing name', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'noname@test.com', password: 'Test1234' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('should login with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@shopkeeper.com', password: 'Test1234' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe('test@shopkeeper.com');
    expect(res.body.data.user.shops).toBeDefined();
  });

  it('should reject wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@shopkeeper.com', password: 'WrongPass1' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should reject non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.com', password: 'Test1234' });

    expect(res.status).toBe(401);
  });

  it('should reject empty credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@shopkeeper.com' });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/auth/profile', () => {
  it('should return user profile when authenticated', async () => {
    const res = await request(app)
      .get('/api/auth/profile')
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('test@shopkeeper.com');
    expect(res.body.data.shops).toBeDefined();
  });

  it('should reject unauthenticated request', async () => {
    const res = await request(app).get('/api/auth/profile');
    expect(res.status).toBe(401);
  });

  it('should reject invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/profile')
      .set({ Authorization: 'Bearer invalidtoken123' });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/change-password', () => {
  it('should change password with correct current password', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .set(authHeader(token))
      .send({ current_password: 'Test1234', new_password: 'NewPass123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify new password works
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@shopkeeper.com', password: 'NewPass123' });
    expect(loginRes.status).toBe(200);
  });

  it('should reject wrong current password', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .set(authHeader(token))
      .send({ current_password: 'WrongOld1', new_password: 'NewPass456' });

    expect(res.status).toBe(401);
  });
});
