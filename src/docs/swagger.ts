import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Inventory Management REST API',
    version: '1.0.0',
    description:
      'Production-grade Role-Based Inventory Management REST API built with Node.js, Express, TypeScript, PostgreSQL, Prisma ORM, Redis caching, and BullMQ low-stock alert queues.',
    contact: {
      name: 'Smit Vaghasiya'
    }
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Local Development Server'
    }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token obtained from /auth/login or /auth/register'
      }
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Resource not found' },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'NOT_FOUND' },
              details: { type: 'object' }
            }
          }
        }
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
          name: { type: 'string', example: 'Smit Vaghasiya' },
          email: { type: 'string', format: 'email', example: 'smit@example.com' },
          role: { type: 'string', enum: ['owner', 'manager', 'staff'], example: 'owner' },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },
      Product: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d' },
          name: { type: 'string', example: 'Dell XPS 15 Laptop' },
          description: { type: 'string', example: 'High performance laptop with 32GB RAM' },
          price: { type: 'integer', example: 145000, description: 'Price in Rupees' },
          stock: { type: 'integer', example: 25 },
          lowStockThreshold: { type: 'integer', example: 5 },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      StockHistory: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          productId: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          quantityChange: { type: 'integer', example: -2 },
          reason: { type: 'string', enum: ['sale', 'return', 'restock', 'damage'], example: 'sale' },
          stockAfter: { type: 'integer', example: 8 },
          createdAt: { type: 'string', format: 'date-time' },
          user: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string' },
              role: { type: 'string' }
            }
          }
        }
      }
    }
  },
  paths: {
    '/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a new user',
        description: 'Public endpoint to register a new user with owner, manager, or staff role.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password', 'role'],
                properties: {
                  name: { type: 'string', example: 'Smit Vaghasiya' },
                  email: { type: 'string', example: 'smit@example.com' },
                  password: { type: 'string', minLength: 6, example: 'securePassword123' },
                  role: { type: 'string', enum: ['owner', 'manager', 'staff'], example: 'owner' }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'User registered successfully' },
          400: { description: 'Validation error' },
          409: { description: 'User with email already exists' }
        }
      }
    },
    '/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Login user',
        description: 'Public endpoint with rate limiting to authenticate user and receive JWT.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'smit@example.com' },
                  password: { type: 'string', example: 'securePassword123' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Login successful' },
          401: { description: 'Invalid email or password' },
          429: { description: 'Too many requests (Rate Limited)' }
        }
      }
    },
    '/products': {
      get: {
        tags: ['Products'],
        summary: 'List all products with stock',
        description: 'Accessible by Owner, Manager, Staff. Cached in Redis for 5 minutes. Cache invalidated on stock changes.',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'List of all products' },
          401: { description: 'Unauthorized' }
        }
      },
      post: {
        tags: ['Products'],
        summary: 'Create a new product',
        description: 'Accessible by Owner and Manager. Staff receives 403 Forbidden.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'description', 'price', 'stock', 'lowStockThreshold'],
                properties: {
                  name: { type: 'string', example: 'Wireless Noise Canceling Headphones' },
                  description: { type: 'string', example: 'Premium ANC wireless over-ear headphones' },
                  price: { type: 'integer', example: 19999, description: 'Price in Rupees' },
                  stock: { type: 'integer', example: 50 },
                  lowStockThreshold: { type: 'integer', example: 10 }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Product created' },
          401: { description: 'Unauthorized' },
          403: { description: 'Forbidden (Staff)' }
        }
      }
    },
    '/products/{id}': {
      get: {
        tags: ['Products'],
        summary: 'Get single product details',
        description: 'Accessible by Owner, Manager, Staff. Returns product details with recent stock history summary.',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        responses: {
          200: { description: 'Product details' },
          404: { description: 'Product not found' }
        }
      },
      put: {
        tags: ['Products'],
        summary: 'Update product details',
        description: 'Accessible by Owner and Manager. Invalidates Redis cache. Staff receives 403 Forbidden.',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  price: { type: 'integer' },
                  stock: { type: 'integer' },
                  lowStockThreshold: { type: 'integer' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Product updated' },
          403: { description: 'Forbidden (Staff)' },
          404: { description: 'Product not found' }
        }
      },
      delete: {
        tags: ['Products'],
        summary: 'Delete a product',
        description: 'Accessible by Owner only. Manager and Staff receive 403 Forbidden. Clears cache.',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        responses: {
          200: { description: 'Product deleted' },
          403: { description: 'Forbidden (Manager, Staff)' },
          404: { description: 'Product not found' }
        }
      }
    },
    '/products/{id}/stock': {
      post: {
        tags: ['Stock Management'],
        summary: 'Adjust product stock atomically',
        description:
          'Accessible by Owner, Manager, Staff. Uses Prisma transaction for atomic stock and history update. Invalidate Redis cache. If new stock < lowStockThreshold, enqueues BullMQ low-stock alert job asynchronously.',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['quantity', 'reason'],
                properties: {
                  quantity: {
                    type: 'integer',
                    example: -5,
                    description: 'Positive for restock/return, negative for sale/damage'
                  },
                  reason: {
                    type: 'string',
                    enum: ['sale', 'return', 'restock', 'damage'],
                    example: 'sale'
                  }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Stock adjusted successfully' },
          400: { description: 'Insufficient stock or invalid input' },
          404: { description: 'Product not found' }
        }
      }
    },
    '/products/{id}/stock/history': {
      get: {
        tags: ['Stock Management'],
        summary: 'Get full stock history for a product',
        description:
          'Accessible by Owner and Manager. Returns date, quantity change, reason, and user audit details. Staff receives 403 Forbidden.',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        responses: {
          200: { description: 'Stock history entries' },
          403: { description: 'Forbidden (Staff)' },
          404: { description: 'Product not found' }
        }
      }
    },
    '/products/{id}/alerts': {
      get: {
        tags: ['Low-Stock Alerts'],
        summary: 'Get low-stock alerts for a product',
        description: 'Accessible by Owner and Manager. Staff receives 403 Forbidden.',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        responses: {
          200: { description: 'Alert logs' },
          403: { description: 'Forbidden (Staff)' }
        }
      }
    }
  }
};

export const setupSwagger = (app: Express): void => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
};
