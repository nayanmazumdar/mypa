# Shopkeeper Backend

A Node.js/Express REST API for shopkeeper management with MySQL (primary) and SQLite (offline fallback).

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env   # Edit with your MySQL credentials

# Create database & tables (requires MySQL running)
npm run migrate

# Seed sample data
npm run seed

# Start the server
npm start
```

## Database Setup

### MySQL (Primary)

Make sure MySQL is running, then:

```bash
npm run migrate    # Creates database and all tables
npm run seed       # Seeds sample data
npm run db:setup   # Both in one command
```

### SQLite (Offline Fallback)

SQLite is used automatically when MySQL is unavailable. No setup needed — tables are created on demand.

The server checks MySQL connectivity every 30 seconds and switches between modes automatically.

## Environment Variables

```env
PORT=3000
NODE_ENV=development

# MySQL
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=password
MYSQL_DATABASE=shopkeeper_db

# JWT
JWT_SECRET=your_super_secret_key_change_in_production
JWT_EXPIRES_IN=7d

# SQLite (offline fallback)
SQLITE_DB_PATH=./src/database/sqlite/shop.db
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start the server |
| `npm run dev` | Start with nodemon (auto-reload) |
| `npm run migrate` | Create database and tables |
| `npm run seed` | Seed sample data |
| `npm run db:setup` | Migrate + Seed |
| `npm test` | Run tests |

## Default Login Credentials (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@shopkeeper.com | admin123 |
| Shopkeeper | demo@shopkeeper.com | demo1234 |

## API Endpoints

- `POST /api/auth/register` - Register
- `POST /api/auth/login` - Login
- `GET /api/auth/profile` - Get profile
- `GET /api/products` - List products
- `POST /api/products` - Create product
- `GET /api/sales` - List sales
- `POST /api/sales` - Create sale
- `GET /api/purchases` - List purchases
- `POST /api/purchases` - Create purchase
- `GET /api/inventory` - List inventory
- `GET /api/customers` - List customers
- `GET /api/suppliers` - List suppliers

Swagger docs: `http://localhost:3000/api-docs`

## Architecture

```
src/
├── config/          # DB, env, logger config
│   ├── db.js        # Central DB manager (MySQL + SQLite fallback)
│   ├── mysql.js     # MySQL connection pool
│   └── sqlite.js    # SQLite connection (sql.js)
├── controllers/     # Request handlers
├── database/
│   ├── migrations/  # SQL schema files
│   ├── seeders/     # Seed SQL files
│   ├── sqlite/      # SQLite DB file
│   ├── migrate.js   # Migration runner
│   └── seed.js      # Seeder runner
├── middlewares/     # Auth, validation, error handling
├── models/          # Schema definitions
├── repositories/    # Data access layer
│   ├── mysql/       # MySQL queries
│   └── sqlite/      # SQLite queries (offline)
├── routes/          # API routes
├── services/        # Business logic
├── utils/           # Helpers, JWT, pagination
├── app.js           # Express app setup
└── server.js        # Entry point
```
