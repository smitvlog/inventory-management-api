import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  try {
    console.log('🌱 Starting database seed...');

    // 1. Clean existing records
    await prisma.alertLog.deleteMany();
    await prisma.stockHistory.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();

    // 2. Hash default password
    const defaultPassword = await bcrypt.hash('password123', 10);

    // 3. Seed Users
    const owner = await prisma.user.create({
      data: {
        name: 'Smit Owner',
        email: 'owner@inventory.com',
        password: defaultPassword,
        role: Role.owner
      }
    });

    const manager = await prisma.user.create({
      data: {
        name: 'Alex Manager',
        email: 'manager@inventory.com',
        password: defaultPassword,
        role: Role.manager
      }
    });

    const staff = await prisma.user.create({
      data: {
        name: 'Sam Staff',
        email: 'staff@inventory.com',
        password: defaultPassword,
        role: Role.staff
      }
    });

    console.log('✅ Seeded Users:');
    console.log(` - Owner: ${owner.email} (${owner.id})`);
    console.log(` - Manager: ${manager.email} (${manager.id})`);
    console.log(` - Staff: ${staff.email} (${staff.id})`);

    // 4. Seed Products
    const laptop = await prisma.product.create({
      data: {
        name: 'MacBook Pro 16-inch M3',
        description: 'Apple M3 Max, 36GB RAM, 1TB SSD',
        price: 349900,
        stock: 15,
        lowStockThreshold: 5
      }
    });

    const monitor = await prisma.product.create({
      data: {
        name: 'Dell UltraSharp 32 4K USB-C Hub Monitor',
        description: 'IPS Black technology, 98% DCI-P3 color coverage',
        price: 89999,
        stock: 4, // Below lowStockThreshold (10)
        lowStockThreshold: 10
      }
    });

    const keyboard = await prisma.product.create({
      data: {
        name: 'Keychron Q1 Pro Mechanical Keyboard',
        description: 'Wireless custom mechanical keyboard, QMK/VIA support',
        price: 18499,
        stock: 30,
        lowStockThreshold: 8
      }
    });

    console.log('✅ Seeded Products:');
    console.log(` - Product 1: ${laptop.name} (Stock: ${laptop.stock}, Threshold: ${laptop.lowStockThreshold})`);
    console.log(` - Product 2: ${monitor.name} (Stock: ${monitor.stock}, Threshold: ${monitor.lowStockThreshold})`);
    console.log(` - Product 3: ${keyboard.name} (Stock: ${keyboard.stock}, Threshold: ${keyboard.lowStockThreshold})`);

    console.log('🌱 Database seed finished successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

function handleSeedError(error: Error): void {
  console.error('Seed script failed', error);
  process.exit(1);
}

main().catch(handleSeedError);
