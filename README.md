# Role-Based Inventory Management API

A high-performance, enterprise-grade Role-Based Inventory Management API built with **Node.js**, **Express.js**, **TypeScript (Strict Mode)**, **PostgreSQL**, **Prisma ORM**, **Redis**, and **BullMQ**.

**Author / Candidate**: Smit Vaghasiya  
**Branch**: `feature/inventory-api`

---

## 🌟 Key Highlights & Architectural Features

1. **TypeScript Strict Mode (Zero `any` Types)**:
   - Full strict type safety across all controllers, services, middleware, request validation schemas, and unit/integration tests.
2. **Role-Based Access Control (RBAC)**:
   - Enforced **strictly via middleware** (`authorizeRoles(...roles)`) before requests reach controllers.
   - Roles: `Owner`, `Manager`, `Staff`.
3. **Atomic Inventory Operations**:
   - Stock adjustments (`POST /products/:id/stock`) run inside an atomic `prisma.$transaction`.
   - Guaranteed prevention of race conditions, negative inventory, and partial write failures.
4. **Redis Caching Strategy**:
   - `GET /products` cached for 5 minutes (`300s` TTL).
   - Atomic cache invalidation on any stock adjustment, product creation, update, or deletion.
5. **Asynchronous Low-Stock Alerts with BullMQ**:
   - When stock drops $\le$ `lowStockThreshold`, a background job is enqueued to `low-stock-alerts` and the API responds immediately without blocking.
   - **24-Hour Alert Deduplication**: Worker checks the `AlertLog` audit table and skips redundant alerts for the same product within 24 hours.
6. **Bonus Objectives**:
   - Brute-force rate limiting on `POST /auth/login`.
   - GitHub Actions CI workflow executing `tsc --noEmit` and full Jest test suite on push and PRs.
   - 100% test coverage for RBAC matrix, stock transactions, Redis cache invalidation, and BullMQ worker deduplication (37 passing automated tests).

---

## 🔐 Roles and Permissions Matrix

| Action | HTTP Endpoint | Owner | Manager | Staff | Middleware Check |
|---|---|:---:|:---:|:---:|---|
| **Register User** | `POST /auth/register` | Public | Public | Public | None |
| **Login** | `POST /auth/login` | Public | Public | Public | Rate Limiter |
| **Create Product** | `POST /products` | ✅ | ✅ | ❌ (403) | `authorizeRoles(OWNER, MANAGER)` |
| **Update Product** | `PUT /products/:id` | ✅ | ✅ | ❌ (403) | `authorizeRoles(OWNER, MANAGER)` |
| **Delete Product** | `DELETE /products/:id` | ✅ | ❌ (403) | ❌ (403) | `authorizeRoles(OWNER)` |
| **View All Products** | `GET /products` | ✅ | ✅ | ✅ | `authorizeRoles(OWNER, MANAGER, STAFF)` |
| **View Single Product** | `GET /products/:id` | ✅ | ✅ | ✅ | `authorizeRoles(OWNER, MANAGER, STAFF)` |
| **Adjust Stock** | `POST /products/:id/stock` | ✅ | ✅ | ✅ | `authorizeRoles(OWNER, MANAGER, STAFF)` |
| **View Stock History** | `GET /products/:id/stock/history` | ✅ | ✅ | ❌ (403) | `authorizeRoles(OWNER, MANAGER)` |
| **View Low-Stock Alerts** | `GET /alerts` | ✅ | ✅ | ❌ (403) | `authorizeRoles(OWNER, MANAGER)` |
| **Manage / View Users** | `GET /users` | ✅ | ❌ (403) | ❌ (403) | `authorizeRoles(OWNER)` |

---

## 🏗️ Architecture & Flow Diagrams

### Request Lifecycle & Middleware Pipeline

```
[ Incoming Request ]
        │
        ▼
[ Security Middlewares: Helmet, CORS, JSON Parser ]
        │
        ▼
[ Authentication Middleware (authenticate) ]
  ├── Extracts 'Bearer <jwt_token>' from Authorization Header
  ├── Verifies Signature & Expiration
  └── Attaches strongly-typed `req.user = { userId, email, role }`
        │
        ▼
[ RBAC Authorization Middleware (authorizeRoles(...roles)) ]
  ├── Checks if allowed roles include req.user.role
  └── Rejects with 403 Forbidden if unauthorized (Zero controller leakage)
        │
        ▼
[ Request Validation Middleware (validateRequest({ body, params, query })) ]
  ├── Validates schema via Zod
  └── Rejects with 400 Bad Request on validation failure
        │
        ▼
[ Controller Layer (Slim, delegates to Service) ]
        │
        ▼
[ Service Layer (Prisma Transactions / Redis Cache / BullMQ Queue) ]
        │
        ▼
[ HTTP 200 / 201 Response ]
```

---

## 📋 Prerequisites & Tech Stack

- **Node.js**: v18.0.0+ (v20+ recommended)
- **PostgreSQL**: v14+ (or Docker)
- **Redis**: v6+ (or Docker)
- **Docker & Docker Compose** (Optional, for one-click setup)

---

## 🚀 Getting Started

### 1. Clone the Repository & Checkout Feature Branch

```bash
git clone https://github.com/your-username/inventory-management-api.git
cd inventory-management-api
git checkout feature/inventory-api
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Default configuration in `.env`:

```env
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/inventory_db?schema=public"
REDIS_HOST="localhost"
REDIS_PORT=6379
REDIS_PASSWORD=""
JWT_SECRET="your_super_secret_jwt_key_here_change_in_production"
JWT_EXPIRES_IN="24h"
LOW_STOCK_QUEUE_NAME="low-stock-alerts"
```

### 3. Start PostgreSQL & Redis (Using Docker Compose)

If you have Docker installed, spin up PostgreSQL and Redis with:

```bash
docker compose up -d
```

*(Alternatively, use your local PostgreSQL and Redis services).*

### 4. Install Dependencies

```bash
npm install
```

### 5. Run Database Migrations & Seed Data

```bash
# Push schema to PostgreSQL
npx prisma db push

# Seed initial users (Owner, Manager, Staff) and sample products
npm run prisma:seed
```

#### Pre-seeded Test Accounts:

| Role | Email | Password |
|---|---|---|
| **Owner** | `owner@inventory.com` | `OwnerPassword123!` |
| **Manager** | `manager@inventory.com` | `ManagerPassword123!` |
| **Staff** | `staff@inventory.com` | `StaffPassword123!` |

---

## 🏃 Running the Application

### Development Mode (with Hot Reload)

```bash
npm run dev
```

The server will start at `http://localhost:5000` with the BullMQ worker running in-process.

### Production Build & Run

```bash
# Compile TypeScript to dist/
npm run build

# Start production server
npm start
```

---

## 🧪 Running Tests & Typechecks

Execute the comprehensive automated test suite (37 test cases covering RBAC, transactions, Redis caching, and BullMQ worker deduplication):

```bash
# Run all Jest tests
npm test

# Run tests with coverage report
npm run test:coverage

# Run TypeScript compiler check (Zero errors guarantee)
npm run typecheck
```

---

## 📖 API Documentation & Endpoints

### 1. Authentication Module (`/auth`)

#### Register User
`POST /auth/register` (Public)
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "Password123!",
  "role": "manager"
}
```

#### Login
`POST /auth/login` (Public, Rate-limited)
```json
{
  "email": "owner@inventory.com",
  "password": "OwnerPassword123!"
}
```
**Response**: Returns `{ user, token }`.

---

### 2. Products Module (`/products`)

*All product endpoints require `Authorization: Bearer <token>`.*

#### Create Product
`POST /products` (Owner, Manager)
```json
{
  "name": "Wireless Ergonomic Mouse",
  "description": "Ergonomic Bluetooth optical mouse",
  "price": 2499,
  "stock": 100,
  "lowStockThreshold": 15
}
```

#### List All Products (Cached in Redis - 5 min TTL)
`GET /products` (Owner, Manager, Staff)
- Header `X-Cache: HIT` (served from Redis) or `X-Cache: MISS` (fetched from PostgreSQL and cached).

#### Get Single Product
`GET /products/:id` (Owner, Manager, Staff)
- Includes recent stock history summary.

#### Update Product
`PUT /products/:id` (Owner, Manager)
- Automatically invalidates `products:list` in Redis.

#### Delete Product
`DELETE /products/:id` (Owner only)
- Automatically invalidates `products:list` in Redis.

---

### 3. Stock Management Module (`/products/:id/stock`)

#### Adjust Stock (Atomic Transaction)
`POST /products/:id/stock` (Owner, Manager, Staff)
```json
{
  "quantity": -5,
  "reason": "sale"
}
```
*Reasons supported*: `sale`, `return`, `restock`, `damage`.
- **Atomic Execution**: Stock check, deduction, and `StockHistory` entry happen in one Prisma transaction.
- **Cache Invalidation**: Redis `products:list` deleted immediately.
- **Alert Job**: If new stock $\le$ `lowStockThreshold`, enqueues BullMQ job non-blockingly.

#### View Stock History Audit Trail
`GET /products/:id/stock/history` (Owner, Manager)
- Returns complete historical breakdown of who adjusted stock, when, quantity change, and resulting stock.

---

### 4. Low-Stock Alerts Module (`/alerts`)

#### View Low-Stock Alerts
`GET /alerts` (Owner, Manager)
- Returns audit logs of all triggered low-stock alerts.

---

### 5. User Management Module (`/users`)

#### List Users
`GET /users` (Owner only)
- Returns all registered users and their assigned roles.

---

## 💡 The Cache Invalidation Deep Dive (Interview Explanation)

> **Interview Question**: *"What happens if stock is updated and a user reads the product list 30 seconds later? Walk through your code."*

1. **Write Flow (`POST /products/:id/stock`)**:
   - The handler invokes `StockService.adjustStock(...)`.
   - An atomic Prisma transaction locks and updates the product record in PostgreSQL and inserts a new `StockHistory` audit row.
   - **Immediately upon transaction completion**, the service invokes `CacheService.invalidateProductsList()`, which calls `redis.del('products:list')`.
   - The HTTP response returns `200 OK` with the updated stock data.
2. **Subsequent Read (30 seconds later - `GET /products`)**:
   - A client makes a `GET /products` request.
   - `ProductsService.getAllProducts()` queries Redis with `redis.get('products:list')`.
   - Since the key was deleted during the stock update 30 seconds ago, Redis returns `null` (**Cache Miss**).
   - The application queries PostgreSQL via Prisma to fetch the freshly updated product list.
   - The freshly retrieved list is stored in Redis under `products:list` with `EX 300` (5-minute TTL) and returned to the client with `X-Cache: MISS`.
   - Subsequent reads during the next 5 minutes are served directly from Redis with sub-millisecond latency until another write occurs.

---

## 🛡️ Security & Quality Checklist

- [x] Strict TypeScript configuration (zero `any` types).
- [x] Centralized RBAC middleware (`authorizeRoles`) preventing permission logic in controllers.
- [x] Atomic transactions for inventory consistency.
- [x] Asynchronous background worker using BullMQ with 24-hour deduplication.
- [x] Redis caching with explicit TTL and instant invalidation.
- [x] Input validation with Zod.
- [x] Password hashing with bcrypt (salt rounds: 10).
- [x] Brute-force rate limiting on `/auth/login`.
- [x] Helmet security headers & CORS enabled.
- [x] 100% automated test suite passing (37 tests).
- [x] GitHub Actions CI workflow configured.
