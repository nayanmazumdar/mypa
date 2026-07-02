# Shopkeeper Backend

REST API backend for shopkeeper management application built with Node.js, Express, MySQL, and SQLite.

## Features

- **Authentication** - JWT-based auth with role-based access control
- **Product Management** - CRUD operations with category support
- **Sales & Purchases** - Full transaction management with invoice generation
- **Inventory** - Stock tracking with low-stock alerts
- **Customers & Suppliers** - Contact management
- **Reports** - Dashboard, daily/monthly sales, profit analysis
- **Offline Support** - SQLite for offline data sync
- **Swagger Docs** - Auto-generated API documentation

## Setup

### Prerequisites
- Node.js >= 18
- MySQL >= 8.0

### Installation

```bash
cd shopkeeper-backend
npm install
```

### Configure Environment

Copy `.env` and update with your MySQL credentials:

```env
PORT=3000
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=shopkeeper_db
JWT_SECRET=change_this_in_production
```

### Create Database

```sql
CREATE DATABASE shopkeeper_db;
```

Run the migration script:
```bash
mysql -u root -p shopkeeper_db < src/database/migrations/001_init.sql
```

### Seed Data (Optional)
```bash
mysql -u root -p shopkeeper_db < src/database/seeders/seed.sql
```

### Run

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

## API Documentation

Visit `http://localhost:3000/api-docs` after starting the server.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register user |
| POST | /api/auth/login | Login |
| GET | /api/auth/profile | Get profile |
| GET | /api/products | List products |
| POST | /api/products | Create product |
| GET | /api/sales | List sales |
| POST | /api/sales | Create sale |
| GET | /api/purchases | List purchases |
| POST | /api/purchases | Create purchase |
| GET | /api/inventory | List inventory |
| GET | /api/reports/dashboard | Dashboard summary |
| GET | /api/reports/daily-sales | Daily sales report |
| GET | /api/reports/profit | Profit report |

## Project Structure

```
shopkeeper-backend/
├── src/
│   ├── config/         # DB, JWT, Swagger, Logger config
│   ├── routes/         # Express route definitions
│   ├── controllers/    # Request handlers
│   ├── services/       # Business logic
│   ├── repositories/   # Data access (MySQL & SQLite)
│   ├── models/         # Schema definitions
│   ├── middlewares/    # Auth, validation, error handling
│   ├── validators/     # Input validation rules
│   ├── utils/          # Helpers, constants, response builder
│   ├── docs/           # Swagger YAML
│   ├── database/       # Migrations, seeders, SQLite DB
│   ├── app.js          # Express app setup
│   └── server.js       # Server entry point
├── uploads/
├── logs/
├── tests/
├── .env
└── package.json
```
