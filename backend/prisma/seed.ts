import { PrismaClient, Role, PermissionLevel } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. HQ PIN (9999)
  const hqPinHash = await bcrypt.hash('9999', 10);
  const existingHq = await prisma.hqAuth.findFirst();
  if (!existingHq) {
    await prisma.hqAuth.create({
      data: { pinHash: hqPinHash, plainPin: '9999', isFirstLogin: true },
    });
    console.log('Created HQ auth (PIN: 9999)');
  } else {
    await prisma.hqAuth.update({
      where: { id: existingHq.id },
      data: { plainPin: existingHq.plainPin ?? '9999' },
    });
    console.log('HQ auth already exists, updated plainPin');
  }

  // 2. Create stores with PINs
  const storeData = [
    { name: '강남 플래그십', code: 'GANGNAM-01', address: '서울시 강남구 테헤란로 123', phone: '02-1234-5678', region: '서울', pin: '1111' },
    { name: '판교점', code: 'PANGYO-01', address: '경기도 성남시 분당구 판교역로 235', phone: '031-987-6543', region: '경기', pin: '1112' },
  ];

  for (const s of storeData) {
    const store = await prisma.store.upsert({
      where: { code: s.code },
      update: {},
      create: {
        name: s.name,
        code: s.code,
        address: s.address,
        phone: s.phone,
        region: s.region,
        isActive: true,
      },
    });

    const existing = await prisma.storeAuth.findUnique({ where: { storeId: store.id } });
    if (!existing) {
      const pinHash = await bcrypt.hash(s.pin, 10);
      await prisma.storeAuth.create({
        data: { storeId: store.id, pinHash, plainPin: s.pin, isFirstLogin: true },
      });
      console.log(`Created store: ${store.name} (PIN: ${s.pin})`);
    } else {
      await prisma.storeAuth.update({
        where: { storeId: store.id },
        data: { plainPin: existing.plainPin ?? s.pin },
      });
      console.log(`Store ${store.name} auth already exists, updated plainPin`);
    }
  }

  // 3. Create admin user (for legacy API access)
  const passwordHash = await bcrypt.hash('admin1234', 10);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash,
      name: '관리자',
      email: 'admin@alloso.com',
      role: Role.HQ_ADMIN,
      isActive: true,
    },
  });
  console.log(`Admin user: ${admin.username}`);

  // 4. Grant admin permissions to all stores
  const allStores = await prisma.store.findMany();
  for (const store of allStores) {
    await prisma.userStorePermission.upsert({
      where: { userId_storeId: { userId: admin.id, storeId: store.id } },
      update: {},
      create: {
        userId: admin.id,
        storeId: store.id,
        permissionLevel: PermissionLevel.MANAGE,
      },
    });
  }

  console.log('\n=== Seed Complete ===');
  console.log('PIN credentials:');
  console.log('  본사 (HQ):    PIN=9999');
  console.log('  강남 플래그십: PIN=1111');
  console.log('  판교점:        PIN=1112');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
