# Comprehensive Interview Guide & Architectural Defense

This guide prepares you (**Smit Vaghasiya**) to defend every line of code and architectural decision during the technical interview.

---

## 1. Top Interview Questions & Precise Technical Answers

### Q1: "What happens if stock is updated and a user reads the product list 30 seconds later? Walk through your code."
**Your Answer**:
> "Let's walk through the code path from write to read:
> 1. When a stock adjustment request arrives at `POST /products/:id/stock`, it passes authentication and authorization middleware and reaches `StockController.adjustStock`.
> 2. `StockService.adjustStock` initiates an atomic Prisma transaction (`prisma.$transaction`). Inside this transaction, we fetch the product, verify `newStock >= 0` to prevent negative inventory, update `product.stock`, and create a `StockHistory` record.
> 3. As soon as the transaction commits successfully, we call `CacheService.invalidateProductsList()`, which executes `redis.del('products:list')`. We also fire-and-forget enqueue a low-stock alert job to BullMQ if stock fell below threshold.
> 4. When another user requests `GET /products` 30 seconds later, `ProductsService.getAllProducts()` checks Redis for the key `products:list`.
> 5. Because the key was deleted during the stock update 30 seconds earlier, it results in a **Cache Miss** (`redis.get` returns `null`).
> 6. The service falls back to querying PostgreSQL via Prisma `prisma.product.findMany()`, retrieving the fresh, updated stock figures.
> 7. Finally, it writes this fresh dataset back to Redis with a 5-minute TTL (`EX 300`) and returns the response with header `X-Cache: MISS`. Any subsequent reads within 5 minutes will hit the cache (`X-Cache: HIT`) until another modification occurs."

---

### Q2: "Why enforce RBAC strictly in middleware rather than in controller logic?"
**Your Answer**:
> "There are three critical software engineering reasons for this:
> 1. **Separation of Concerns & Single Responsibility Principle (SRP)**: Controllers should only be responsible for orchestrating the request/response lifecycle and invoking domain services. Authorization is a cross-cutting security concern that belongs in the middleware pipeline.
> 2. **Fail-Fast Security Principle**: By evaluating permissions at the route definition level (`authorizeRoles(...)`), unauthorized requests are rejected immediately at the perimeter with a 403 Forbidden without executing controller setup, allocating memory, or touching the database.
> 3. **Auditability & Maintainability**: Having roles explicitly declared in route files (`router.delete('/:id', authorizeRoles(Role.OWNER), ...)`) makes it trivial for anyone doing a security audit to inspect permissions across the entire API in seconds, without digging through controller bodies."

---

### Q3: "Why did you use Prisma transactions for stock adjustments? What would happen without them?"
**Your Answer**:
> "Stock management requires strong ACID consistency. Without transactions:
> 1. **Partial Failures / Inconsistent State**: If the stock deduction succeeds but the database connection fails before inserting the `StockHistory` record, we would have ghost inventory deductions with zero audit trail.
> 2. **Race Conditions / Overselling**: In a concurrent environment where two users buy the last 5 items simultaneously, a non-transactional read-then-write would read stock as 5 for both, and both would proceed to decrement, resulting in negative inventory or overselling.
> By wrapping the stock validation, product update, and history insert inside `prisma.$transaction(async (tx) => { ... })`, Prisma executes them atomically inside a single database transaction with automatic rollback if any step throws."

---

### Q4: "How does your BullMQ low-stock alert worker handle 24-hour deduplication?"
**Your Answer**:
> "When stock drops below `lowStockThreshold`, the API enqueues a job `{ productId, productName, currentStock, threshold }` to the `low-stock-alerts` queue non-blockingly and returns the HTTP 200 response immediately.
> When the background worker picks up the job:
> 1. It queries the `AlertLog` table for any alert for that `productId` where `triggeredAt >= now - 24 hours`.
> 2. If a recent alert exists, the worker logs `[DEDUPLICATION] Skipping alert...` and completes the job without duplicate spam.
> 3. If no alert has been triggered within 24 hours, it logs the alert message and inserts an `AlertLog` record with the current timestamp.
> 
> *Follow-up: Why not use BullMQ job deduplication (`jobId: productId`)?*
> 'BullMQ `jobId` deduplication only prevents duplicate jobs while they are sitting in the active/waiting queue state. Once completed or removed, it doesn't preserve a 24-hour historical window. Storing the timestamp in PostgreSQL (`AlertLog`) gives us persistent audit history and deterministic 24-hour window queries regardless of Redis restarts.'"

---

### Q5: "How is TypeScript strict mode enforced and why are there zero `any` types?"
**Your Answer**:
> "In `tsconfig.json`, we enabled:
> - `"strict": true`
> - `"noImplicitAny": true`
> - `"strictNullChecks": true`
> - `"strictFunctionTypes": true`
> - `"noUncheckedIndexedAccess": true`
> 
> We extended Express's global Request interface using `src/types/express.d.ts` to type `req.user` strongly as `AuthUser { userId: string; email: string; role: Role }`.
> All request payloads are typed by inferring TypeScript types directly from Zod validation schemas (`z.infer<typeof schema>`), providing an end-to-end type pipeline from HTTP input to DB entity."

---

## 2. File-by-File Code Walkthrough

| File Path | Purpose & Key Implementation Details |
|---|---|
| `src/types/express.d.ts` | Declaration merging to add strongly typed `user?: AuthUser` to `Express.Request`. |
| `src/config/env.ts` | Validates all environment variables using Zod at startup. Fails immediately if config is missing. |
| `src/config/prisma.ts` | PrismaClient singleton with connection pooling and query logging in development. |
| `src/config/redis.ts` | IORedis client configuration with automatic retry strategy and `maxRetriesPerRequest: null` for BullMQ compatibility. |
| `src/constants/index.ts` | Centralized constants for `CACHE_KEYS`, `CACHE_TTL` (300s), `QUEUE_NAMES`, and `ALERT_DEDUPLICATION_WINDOW_MS` (24h). |
| `src/errors/AppError.ts` | Domain error hierarchy: `BadRequestError` (400), `UnauthorizedError` (401), `ForbiddenError` (403), `NotFoundError` (404), `ConflictError` (409). |
| `src/middleware/auth.middleware.ts` | Extracts `Bearer <token>`, verifies JWT signature & expiry, attaches decoded payload to `req.user`. |
| `src/middleware/rbac.middleware.ts` | Factory function `authorizeRoles(...roles: Role[])`. Rejects unauthorized roles with 403 Forbidden. |
| `src/middleware/validate.middleware.ts` | Generic middleware that runs Zod schemas against `req.body`, `req.query`, and `req.params`. |
| `src/middleware/rateLimit.middleware.ts` | Express rate limiter protecting `POST /auth/login` (10 attempts / 15 mins). |
| `src/middleware/error.middleware.ts` | Global error interceptor formatting AppErrors, Zod validation errors, Prisma constraint errors, and 500 fallbacks. |
| `src/services/cache.service.ts` | Generic Redis JSON get/set/del wrapper with dedicated `invalidateProductsList()`. |
| `src/queues/alert.queue.ts` | BullMQ Queue instance and `enqueueLowStockAlert` non-blocking helper with exponential backoff. |
| `src/queues/alert.worker.ts` | Background worker processing low-stock alerts with 24-hour SQL deduplication check against `AlertLog`. |
| `src/modules/auth/*` | Registration with bcrypt hashing, JWT issuance with embedded role, and credential login. |
| `src/modules/products/*` | Product CRUD endpoints. `GET /products` with Redis cache (5m TTL). Invalidation on write operations. |
| `src/modules/stock/*` | Stock adjustment with atomic Prisma transaction (`$transaction`), audit history tracking, and low-stock alert triggering. |
| `src/modules/alerts/*` | Endpoint (`GET /alerts`) for Owners and Managers to view all triggered alert logs. |
| `src/modules/users/*` | Endpoint (`GET /users`) for Owners to inspect registered users and roles. |
| `src/server.ts` | Server bootstrap, worker initialization, and graceful shutdown handling (`SIGTERM`/`SIGINT`). |
