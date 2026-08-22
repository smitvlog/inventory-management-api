# Role-Based Inventory Management REST API

> **Senior Full-Stack Developer Backend Assignment**  
> Candidate: **Smit Vaghasiya**  
> Branch: `feature/inventory-api` → `main`

---

## 🌟 Executive Overview

A high-performance, enterprise-ready **Inventory Management REST API** built with strict architectural separation (**MVC + Service + Repository** pattern).

Key capabilities:
1. **Multi-Role Access Control (RBAC)**: Fine-grained permissions for `Owner`, `Manager`, and `Staff` enforced strictly via reusable route middleware (`authorizeRoles`).
2. **Deterministic Redis Caching**: 5-minute TTL (`products:list`) with instant, transactional cache invalidation on stock or product mutations.
3. **Asynchronous Low-Stock Alerts**: BullMQ worker-driven background alert queue (`low-stock-alerts`) that returns immediately to the client and persists durable audit logs.
4. **24-Hour Alert Deduplication**: Durable 24-hour deduplication window via PostgreSQL `AlertLog` to prevent alert flooding for repeated stock events.
5. **ACID Stock Adjustments**: Atomic Prisma transactions (`prisma.$transaction`) ensuring product stock updates and `StockHistory` audit entries always succeed or roll back together.
6. **Zero `any` TypeScript**: 100% strict TypeScript mode across all source files, repositories, middleware, queues, and tests.

---

## 🏗️ Architecture & Request Lifecycles

The application implements strict separation of concerns across layered abstractions:

```
HTTP Request
     ↓
[ Middleware Pipeline ] (Security / Helmet / CORS / JSON Parsing)
     ↓
[ Route Layer ] (src/routes/)
     ↓
[ Authentication & RBAC ] (authenticate -> authorizeRoles)
     ↓
[ Request Validation ] (validateRequest with Zod schemas)
     ↓
[ Controller Layer ] (src/controllers/ — HTTP mapping & Response formatting only)
     ↓
[ Service Layer ] (src/services/ — Business logic, cache orchestration, queue dispatch)
     ↓
[ Repository Layer ] (src/repositories/ — Data access isolation)
     ↓
[ Prisma ORM ]
     ↓
[ PostgreSQL Database ]
```

### Asynchronous Queue Architecture

```
POST /products/:id/stock
        ↓
Prisma Transaction (Atomic Product Update + StockHistory Insert)
        ↓
Invalidate Redis Cache ('products:list')
        ↓
Is stock < lowStockThreshold?
  ├── YES → Enqueue BullMQ job to 'low-stock-alerts' & Return 200 OK immediately
  └── NO  → Return 200 OK immediately
        ↓
[BullMQ Worker (Background Process)]
        ↓
Check AlertLog for productId in last 24h
  ├── Found within 24h → Skip duplicate alert & log deduplication note
  └── None within 24h  → Log Low-Stock Alert & Write new AlertLog record
```

---

## 📁 Project Structure

```text
src/
├── config/
│   ├── env.ts                     # Zod-validated environment configuration
│   ├── prisma.ts                  # Singleton Prisma Client & DB lifecycle
│   ├── redis.ts                   # Singleton ioredis Client & reconnect strategy
│   └── queue.ts                   # BullMQ connection & queue definitions
│
├── controllers/
│   ├── auth.controller.ts         # Authentication HTTP handlers
│   ├── product.controller.ts      # Product management HTTP handlers
│   └── stock.controller.ts        # Stock adjustments & history HTTP handlers
│
├── services/
│   ├── auth.service.ts            # User registration, bcrypt hashing & JWT issuance
│   ├── product.service.ts         # Product business logic + Redis cache orchestration
│   ├── stock.service.ts           # Atomic stock transaction & alert dispatch
│   └── alert.service.ts           # Low-stock checking & alert log queries
│
├── repositories/
│   ├── user.repository.ts         # User database queries
│   ├── product.repository.ts      # Product database queries & transactions
│   ├── stock-history.repository.ts# Stock history audit records
│   └── alert-log.repository.ts    # Alert log persistence & 24h window queries
│
├── routes/
│   ├── auth.routes.ts             # /auth/register, /auth/login
│   ├── product.routes.ts          # /products (CRUD, cache, alerts)
│   └── stock.routes.ts            # /products/:id/stock, /products/:id/stock/history
│
├── middleware/
│   ├── auth.middleware.ts         # JWT bearer token verification
│   ├── authorize-roles.middleware.ts # Reusable RBAC role authorization
│   ├── validation.middleware.ts   # Zod request validation (body, params, query)
│   ├── rate-limit.middleware.ts   # Login endpoint brute-force protection
│   ├── error.middleware.ts        # Centralized error handler & status mapper
│   └── not-found.middleware.ts    # 404 Route Not Found handler
│
├── validators/
│   ├── auth.validator.ts          # Zod validation schemas for auth
│   ├── product.validator.ts       # Zod validation schemas for products
│   └── stock.validator.ts         # Zod validation schemas for stock
│
├── queues/
│   ├── low-stock.queue.ts         # BullMQ queue producer ('low-stock-alerts')
│   └── low-stock.worker.ts        # BullMQ background worker with deduplication
│
├── utils/
│   ├── jwt.ts                     # JWT sign & verify utilities
│   ├── password.ts                # bcryptjs hashing and comparison
│   ├── logger.ts                  # Structured timestamped logging
│   ├── cache.ts                   # Centralized Redis get/set/delete helpers
│   └── async-handler.ts           # Express async controller error wrapper
│
├── common/
│   ├── response.ts                # Standardized JSON response utilities
│   └── errors.ts                  # Custom typed application errors
│
├── types/
│   ├── auth.types.ts              # Authentication & User TypeScript interfaces
│   └── express.d.ts               # Express Request augmentation (req.user)
│
├── docs/
│   └── swagger.ts                 # OpenAPI 3.0 specification & Swagger UI
│
├── app.ts                         # Express application assembly
└── server.ts                      # Server bootstrap & graceful shutdown handler

prisma/
├── schema.prisma                  # PostgreSQL schema definitions & relations
└── seed.ts                        # Seed script for default users and products
```

---

## 🔐 Role-Based Access Control (RBAC) Matrix

| Endpoint | Method | Allowed Roles | Description |
|---|---|---|---|
| `/auth/register` | `POST` | Public | Register new user account |
| `/auth/login` | `POST` | Public | Login & acquire JWT token (Rate limited) |
| `/products` | `POST` | `owner`, `manager` | Create product (Staff returns 403) |
| `/products` | `GET` | `owner`, `manager`, `staff` | List products with cached stock |
| `/products/:id` | `GET` | `owner`, `manager`, `staff` | Product details + stock history summary |
| `/products/:id` | `PUT` | `owner`, `manager` | Update product & invalidate cache |
| `/products/:id` | `DELETE` | `owner` | Delete product & clear cache (Manager/Staff get 403) |
| `/products/:id/stock` | `POST` | `owner`, `manager`, `staff` | Adjust stock atomically via Prisma transaction |
| `/products/:id/stock/history` | `GET` | `owner`, `manager` | Full stock audit trail (Staff returns 403) |
| `/products/:id/alerts` | `GET` | `owner`, `manager` | View product low-stock alerts |

> **Architectural Guarantee**: Role authorization is executed purely within `authorizeRoles(...roles)` middleware. Controllers contain zero role-checking conditionals.

---

## ⚡ Redis Caching & Invalidation Strategy

### 1. Deterministic Cache Key
- Product listing cache key: `products:list`
- TTL: `300 seconds` (5 minutes)

### 2. Cache Read Flow (`GET /products`)
1. Service checks Redis for `products:list`.
2. **HIT**: If present, deserializes JSON and returns with `X-Cache-Status: HIT`.
3. **MISS**: If absent, queries PostgreSQL via `ProductRepository`, caches result in Redis with `EX 300`, and returns with `X-Cache-Status: MISS`.

### 3. Cache Invalidation Flow
Whenever stock is adjusted (`POST /products/:id/stock`), a product is updated (`PUT /products/:id`), or a product is deleted (`DELETE /products/:id`):
1. Database operation completes and commits.
2. Invalidation service purges the `products:list` key from Redis.

### 💡 Interviewer Walkthrough Scenario
> **Question**: *"What happens if stock is updated at $T_0$, and a user requests the product list 30 seconds later? Walk through your code."*

1. **At $T_0$ (`POST /products/:id/stock`)**:
   - The Prisma transaction commits the stock update from `10` to `5` and writes the `StockHistory` record.
   - Immediately following transaction commit, `stockService` calls `cacheService.invalidateProductCache(productId)`.
   - Redis receives `DEL products:list`, instantly evicting the stale cache.
2. **At $T+30s$ (`GET /products`)**:
   - `productService.getAll()` queries Redis for `products:list`.
   - Cache results in a **MISS** because the key was invalidated.
   - Fresh data (`stock = 5`) is fetched directly from PostgreSQL, stored in Redis with a new 5-minute TTL, and returned to the user.
   - Stale data is never returned.

---

## 📬 BullMQ Low-Stock Alerts & 24-Hour Deduplication

### Queue Configuration
- **Queue Name**: `low-stock-alerts`
- **Job Payload**:
  ```json
  {
    "productId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "productName": "MacBook Pro 16-inch M3",
    "currentStock": 4,
    "threshold": 10
  }
  ```

### Asynchronous Processing & 24h Deduplication
1. When stock drops strictly below `lowStockThreshold` (`newStock < threshold`), `alertService` dispatches a job to BullMQ and the API returns response without blocking.
2. The BullMQ worker receives the job.
3. The worker queries the `AlertLog` table for the target `productId` where `triggeredAt >= NOW() - 24 HOURS`.
4. **Deduplication Check**:
   - **If an alert exists within 24h**: Worker logs `Duplicate alert skipped for product ... Alert was already recorded within 24h window` and exits cleanly.
   - **If no alert exists within 24h**: Worker logs `🚨 [LOW-STOCK ALERT TRIGGERED]`, and creates a new durable `AlertLog` record with `triggeredAt: new Date()`.

---

## 🚀 Getting Started Locally

### Prerequisites
- **Node.js** v18+ (v20+ recommended)
- **PostgreSQL** (running on port 5432)
- **Redis** (running on port 6379)

### 1. Clone & Install Dependencies
```bash
git clone <your-repo-url>
cd smit-inv
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and adjust database/redis credentials:
```bash
cp .env.example .env
```

Default `.env` configuration:
```env
NODE_ENV=development
PORT=3000

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/smit_inventory?schema=public

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

JWT_SECRET=super_secret_jwt_key_smit_inventory_2026_secure
JWT_EXPIRES_IN=1d

LOGIN_RATE_LIMIT_WINDOW_MS=900000
LOGIN_RATE_LIMIT_MAX=10
```

### 3. Database Migration & Seeding
```bash
# Push schema to database
npx prisma db push

# Generate Prisma Client
npm run prisma:generate

# Seed initial users (Owner, Manager, Staff) and products
npm run seed
```

#### Default Seeded Credentials:
| Role | Email | Password |
|---|---|---|
| **Owner** | `owner@inventory.com` | `password123` |
| **Manager** | `manager@inventory.com` | `password123` |
| **Staff** | `staff@inventory.com` | `password123` |

### 4. Run Development Server
```bash
npm run dev
```

The server starts on `http://localhost:3000`.

---

## 🧪 Testing & Quality Assurance

### Run Jest Test Suite
```bash
npm test
```
Includes:
- **RBAC Matrix Verification**: Ensures `Staff` attempting `DELETE /products/:id` receives `403 Forbidden`, `Staff` attempting `GET /products/:id/stock/history` receives `403 Forbidden`, etc.
- **Authentication & Validation**: Password hashing, duplicate registration conflict, token expiration.
- **Prisma Transactions**: Atomic rollback and insufficient stock validation.
- **Redis Caching**: Cache HIT/MISS assertions and invalidation.

### TypeScript Strict Mode Check
```bash
npm run typecheck
```

### Production Build
```bash
npm run build
npm start
```

---

## 📖 Interactive Swagger API Documentation

Open your browser and navigate to:
```
http://localhost:3000/api-docs
```

Interactive Swagger documentation provides ready-to-test schema definitions, authorization inputs, and response structures.

---

## 🔄 Graceful Shutdown

The application listens for `SIGINT` and `SIGTERM` signals and cleanly closes:
1. Express HTTP Server
2. BullMQ Worker processes
3. Redis connection pools
4. Prisma PostgreSQL connection pool
