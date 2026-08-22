import { Job } from 'bullmq';
import { prisma } from '../src/config/prisma';
import { processLowStockAlertJob } from '../src/queues/alert.worker';
import { LowStockAlertPayload } from '../src/queues/alert.queue';
import { clearDatabase, clearRedis, teardownTestConnections } from './helpers';

describe('Module 4: BullMQ Low Stock Alert & 24-Hour Deduplication', () => {
  let testProductId: string;

  beforeAll(async () => {
    await clearDatabase();
    await clearRedis();

    const product = await prisma.product.create({
      data: {
        name: 'Alerting Smart Device',
        description: 'Test product for low stock queue',
        price: 3500,
        stock: 2,
        lowStockThreshold: 5,
      },
    });
    testProductId = product.id;
  });

  afterAll(async () => {
    await clearDatabase();
    await teardownTestConnections();
  });

  it('should process first low-stock alert and create an AlertLog record', async () => {
    const mockJob = {
      id: 'job-1',
      data: {
        productId: testProductId,
        productName: 'Alerting Smart Device',
        currentStock: 2,
        threshold: 5,
      } as LowStockAlertPayload,
    } as Job<LowStockAlertPayload>;

    const result = await processLowStockAlertJob(mockJob);

    expect(result.status).toBe('alert_logged');
    expect(result.productId).toBe(testProductId);

    // Verify record in AlertLog table
    const logs = await prisma.alertLog.findMany({ where: { productId: testProductId } });
    expect(logs.length).toBe(1);
  });

  it('should DEDUPLICATE and skip alert if another alert is triggered within 24 hours', async () => {
    // Alert was logged in previous test just now (<24 hours ago)
    const mockJob2 = {
      id: 'job-2',
      data: {
        productId: testProductId,
        productName: 'Alerting Smart Device',
        currentStock: 1,
        threshold: 5,
      } as LowStockAlertPayload,
    } as Job<LowStockAlertPayload>;

    const result = await processLowStockAlertJob(mockJob2);

    expect(result.status).toBe('deduplicated');
    expect(result.productId).toBe(testProductId);

    // Verify AlertLog count did not increase (still 1)
    const logs = await prisma.alertLog.findMany({ where: { productId: testProductId } });
    expect(logs.length).toBe(1);
  });

  it('should trigger a new alert if the previous alert was older than 24 hours', async () => {
    // Backdate the existing alert to 25 hours ago
    const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);
    await prisma.alertLog.updateMany({
      where: { productId: testProductId },
      data: { triggeredAt: twentyFiveHoursAgo },
    });

    const mockJob3 = {
      id: 'job-3',
      data: {
        productId: testProductId,
        productName: 'Alerting Smart Device',
        currentStock: 0,
        threshold: 5,
      } as LowStockAlertPayload,
    } as Job<LowStockAlertPayload>;

    const result = await processLowStockAlertJob(mockJob3);

    expect(result.status).toBe('alert_logged');

    // Total logs should now be 2
    const logs = await prisma.alertLog.findMany({ where: { productId: testProductId } });
    expect(logs.length).toBe(2);
  });
});
