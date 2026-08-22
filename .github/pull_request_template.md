## 📌 Pull Request: Feature / Inventory Management API

**Candidate**: Smit Vaghasiya  
**Branch**: `feature/inventory-api` ➔ `main`  
**Assignment**: Senior Full-Stack Developer Take Home Assignment  

---

### 🏛️ Key Architectural Decisions & Design Rationale

#### 1. Strict TypeScript Discipline & Zero `any` Usage
- Enabled `"strict": true`, `"noImplicitAny": true`, `"strictNullChecks": true`, and `"noUncheckedIndexedAccess": true`.
- Extended Express namespace with `src/types/express.d.ts` to attach strongly typed `req.user = { userId, email, role }`.
- Integrated Zod schema inference (`z.infer<typeof schema>`) with controller parameter typings for end-to-end type safety from HTTP request to database layer.

#### 2. Centralized RBAC Middleware (Zero Controller Leakage)
- Implemented `authorizeRoles(...roles: Role[])` middleware.
- Authorization checks are executed at the route boundary before controller handlers are invoked.
- Role checks are 100% decoupled from business logic. Unauthorized attempts are rejected immediately with `403 Forbidden` (`401 Unauthorized` for unauthenticated requests).

#### 3. Atomic Prisma Transactions for Stock Adjustments
- `POST /products/:id/stock` runs inside `prisma.$transaction(async (tx) => { ... })`.
- Within the transaction:
  1. Product record is fetched and verified.
  2. Resulting stock is validated (`stock + quantity >= 0`) to prevent negative inventory and overselling.
  3. Product stock is updated.
  4. An immutable `StockHistory` audit record is created capturing `quantityChange`, `reason`, and `stockAfter`.
- Atomicity ensures that inventory updates and history audit rows either both succeed or rollback completely.

#### 4. Redis Caching Strategy & Immediate Cache Invalidation
- `GET /products` is cached with a 5-minute TTL (`300s`) under the key `products:list`.
- **Cache Invalidation**: Whenever stock is adjusted, or a product is created, updated, or deleted, `CacheService.invalidateProductsList()` immediately deletes `products:list`.
- Subsequent reads trigger a **Cache Miss**, fetch the updated dataset from PostgreSQL, repopulate Redis with a 5-minute TTL, and return `X-Cache: MISS`. Subsequent reads return `X-Cache: HIT`.

#### 5. Asynchronous BullMQ Low-Stock Alerts & 24-Hour Deduplication
- When stock falls $\le$ `lowStockThreshold`, the API route asynchronously enqueues a job to the `low-stock-alerts` queue via `enqueueLowStockAlert(...)` without blocking the HTTP response.
- The BullMQ worker checks PostgreSQL's `AlertLog` table for recent alerts for the same product within the last 24 hours.
- If an alert occurred within 24 hours, the job is deduplicated and skipped. If not, the alert is logged and an `AlertLog` entry is recorded.

#### 6. Production Hardening & Bonus Features
- **Rate Limiting**: Added `express-rate-limit` to `POST /auth/login` to prevent brute-force attacks.
- **Automated Testing**: 37 comprehensive Jest test cases covering RBAC matrix permissions, stock transaction atomicity, Redis caching/invalidation, and BullMQ worker deduplication.
- **CI/CD**: GitHub Actions workflow running `tsc --noEmit` and `npm test` with PostgreSQL & Redis service containers.
- **Docker Compose**: Containerized PostgreSQL & Redis for one-command local setup.

---

### 🧪 Test Suite Results

```
PASS tests/stock.test.ts
PASS tests/rbac.test.ts
PASS tests/rateLimit.test.ts
PASS tests/queue.test.ts
PASS tests/products.test.ts
PASS tests/auth.test.ts

Test Suites: 6 passed, 6 total
Tests:       37 passed, 37 total
Snapshots:   0 total
Time:        3.484 s
```
