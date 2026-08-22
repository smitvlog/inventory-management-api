import { Product, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';

export interface CreateProductData {
  name: string;
  description: string;
  price: number;
  stock: number;
  lowStockThreshold: number;
}

export interface UpdateProductData {
  name?: string;
  description?: string;
  price?: number;
  stock?: number;
  lowStockThreshold?: number;
}

export interface ProductWithHistorySummary extends Product {
  recentStockHistory: {
    id: string;
    quantityChange: number;
    reason: string;
    stockAfter: number;
    createdAt: Date;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }[];
}

export class ProductRepository {
  async create(data: CreateProductData): Promise<Product> {
    return prisma.product.create({
      data: {
        name: data.name.trim(),
        description: data.description.trim(),
        price: data.price,
        stock: data.stock,
        lowStockThreshold: data.lowStockThreshold
      }
    });
  }

  async findAll(): Promise<Product[]> {
    return prisma.product.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async findById(id: string, tx?: Prisma.TransactionClient): Promise<Product | null> {
    const client = tx || prisma;
    return client.product.findUnique({
      where: { id }
    });
  }

  async findByIdWithHistorySummary(id: string): Promise<ProductWithHistorySummary | null> {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        stockHistories: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!product) return null;

    const { stockHistories, ...productData } = product;
    return {
      ...productData,
      recentStockHistory: stockHistories.map((h) => ({
        id: h.id,
        quantityChange: h.quantityChange,
        reason: h.reason,
        stockAfter: h.stockAfter,
        createdAt: h.createdAt,
        user: h.user
      }))
    };
  }

  async update(id: string, data: UpdateProductData, tx?: Prisma.TransactionClient): Promise<Product> {
    const client = tx || prisma;
    return client.product.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.description !== undefined ? { description: data.description.trim() } : {}),
        ...(data.price !== undefined ? { price: data.price } : {}),
        ...(data.stock !== undefined ? { stock: data.stock } : {}),
        ...(data.lowStockThreshold !== undefined ? { lowStockThreshold: data.lowStockThreshold } : {})
      }
    });
  }

  async delete(id: string): Promise<Product> {
    return prisma.product.delete({
      where: { id }
    });
  }
}

export const productRepository = new ProductRepository();
