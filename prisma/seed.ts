import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Clean existing records
  await prisma.alertLog.deleteMany();
  await prisma.stockHistory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleaned up existing database tables.');

  // 2. Hash shared test password
  const saltRounds = 10;
  const ownerPassword = await bcrypt.hash('OwnerPassword123!', saltRounds);
  const managerPassword = await bcrypt.hash('ManagerPassword123!', saltRounds);
  const staffPassword = await bcrypt.hash('StaffPassword123!', saltRounds);

  // 3. Create Seed Users
  const owner = await prisma.user.create({
    data: {
      name: 'Alice Owner',
      email: 'owner@inventory.com',
      password: ownerPassword,
      role: Role.OWNER,
    },
  });

  const manager = await prisma.user.create({
    data: {
      name: 'Bob Manager',
      email: 'manager@inventory.com',
      password: managerPassword,
      role: Role.MANAGER,
    },
  });

  const staff = await prisma.user.create({
    data: {
      name: 'Charlie Staff',
      email: 'staff@inventory.com',
      password: staffPassword,
      role: Role.STAFF,
    },
  });

  console.log('👥 Created Users:');
  console.log(`   - Owner:   ${owner.email} (Password: OwnerPassword123!)`);
  console.log(`   - Manager: ${manager.email} (Password: ManagerPassword123!)`);
  console.log(`   - Staff:   ${staff.email} (Password: StaffPassword123!)`);

  // 4. Create Initial Products
  const keyboard = await prisma.product.create({
    data: {
      name: 'Keychron K2 Mechanical Keyboard',
      description: 'Wireless mechanical keyboard with RGB backlight and Gateron Brown switches',
      price: 7999, // 7,999 INR
      stock: 12,
      lowStockThreshold: 5,
    },
  });

  const mouse = await prisma.product.create({
    data: {
      name: 'Logitech MX Master 3S',
      description: 'Performance wireless mouse with 8K DPI tracking and quiet clicks',
      price: 9495, // 9,495 INR
      stock: 4, // Below low-stock threshold of 5!
      lowStockThreshold: 5,
    },
  });

  const monitor = await prisma.product.create({
    data: {
      name: 'Dell UltraSharp 27" 4K USB-C Monitor',
      description: '27-inch 4K IPS display with 90W USB-C power delivery and HDR400',
      price: 45999, // 45,999 INR
      stock: 25,
      lowStockThreshold: 10,
    },
  });

  console.log('📦 Created Products:');
  console.log(`   - Keyboard (ID: ${keyboard.id}, Stock: ${keyboard.stock}, Threshold: ${keyboard.lowStockThreshold})`);
  console.log(`   - Mouse    (ID: ${mouse.id}, Stock: ${mouse.stock}, Threshold: ${mouse.lowStockThreshold})`);
  console.log(`   - Monitor  (ID: ${monitor.id}, Stock: ${monitor.stock}, Threshold: ${monitor.lowStockThreshold})`);

  // 5. Create Sample Stock History
  await prisma.stockHistory.create({
    data: {
      productId: keyboard.id,
      userId: owner.id,
      quantityChange: 12,
      reason: 'RESTOCK',
      stockAfter: 12,
    },
  });

  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
