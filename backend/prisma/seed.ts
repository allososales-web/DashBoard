import { PrismaClient, Role, PermissionLevel } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create admin user
  const passwordHash = await bcrypt.hash('admin1234', 10);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash,
      name: '관리자',
      email: 'admin@storeops.com',
      role: Role.HQ_ADMIN,
      isActive: true,
    },
  });
  console.log(`Created admin user: ${admin.username}`);

  // 2. Create store manager user
  const managerHash = await bcrypt.hash('manager1234', 10);
  const manager = await prisma.user.upsert({
    where: { username: 'manager' },
    update: {},
    create: {
      username: 'manager',
      passwordHash: managerHash,
      name: '매장매니저',
      email: 'manager@storeops.com',
      role: Role.STORE_MANAGER,
      isActive: true,
    },
  });
  console.log(`Created manager user: ${manager.username}`);

  // 3. Create sample stores
  const store1 = await prisma.store.upsert({
    where: { code: 'GANGNAM-01' },
    update: {},
    create: {
      name: '강남 플래그십',
      code: 'GANGNAM-01',
      address: '서울시 강남구 테헤란로 123',
      phone: '02-1234-5678',
      region: '서울',
      isActive: true,
    },
  });

  const store2 = await prisma.store.upsert({
    where: { code: 'PANGYO-01' },
    update: {},
    create: {
      name: '판교점',
      code: 'PANGYO-01',
      address: '경기도 성남시 분당구 판교역로 235',
      phone: '031-987-6543',
      region: '경기',
      isActive: true,
    },
  });
  console.log(`Created stores: ${store1.name}, ${store2.name}`);

  // 4. Grant permissions
  await prisma.userStorePermission.upsert({
    where: { userId_storeId: { userId: admin.id, storeId: store1.id } },
    update: {},
    create: {
      userId: admin.id,
      storeId: store1.id,
      permissionLevel: PermissionLevel.MANAGE,
    },
  });
  await prisma.userStorePermission.upsert({
    where: { userId_storeId: { userId: admin.id, storeId: store2.id } },
    update: {},
    create: {
      userId: admin.id,
      storeId: store2.id,
      permissionLevel: PermissionLevel.MANAGE,
    },
  });
  await prisma.userStorePermission.upsert({
    where: { userId_storeId: { userId: manager.id, storeId: store1.id } },
    update: {},
    create: {
      userId: manager.id,
      storeId: store1.id,
      permissionLevel: PermissionLevel.MANAGE,
    },
  });
  console.log('Granted store permissions');

  console.log('\n=== Seed Complete ===');
  console.log('Login credentials:');
  console.log('  Admin:   username=admin,   password=admin1234');
  console.log('  Manager: username=manager, password=manager1234');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
