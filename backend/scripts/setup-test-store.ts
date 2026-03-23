import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // 테스트 매장 1개 생성 (없으면 생성, 있으면 업데이트)
  const store = await prisma.store.upsert({
    where: { code: 'TEST01' },
    update: { showOnLogin: true, displayName: '테스트 매장' },
    create: {
      name: '테스트 매장',
      code: 'TEST01',
      defaultChannel: 'ROAD',
      showOnLogin: true,
      displayName: '테스트 매장',
      isActive: true,
    },
  });
  console.log(`Store: ${store.name} (${store.id})`);

  // PIN 설정 (1234)
  const pin = '1234';
  const pinHash = await bcrypt.hash(pin, 10);
  await prisma.storeAuth.upsert({
    where: { storeId: store.id },
    update: { pinHash, plainPin: pin, isFirstLogin: false },
    create: { storeId: store.id, pinHash, plainPin: pin, isFirstLogin: false },
  });
  console.log(`PIN set: ${pin}`);

  // 샘플 납기 데이터 (이번 달)
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const pad = (n: number) => String(n).padStart(2, '0');

  const deliveries = [
    { customerName: '김민준', day: 5, status: 'DELIVERED', address: '서울 강남구 테헤란로 123', notes: '현관 앞 배치' },
    { customerName: '이서연', day: 12, status: 'IN_TRANSIT', address: '서울 마포구 홍대입구 45', notes: null },
    { customerName: '박지호', day: 18, status: 'SCHEDULED', address: '경기 성남시 분당구 판교로 88', notes: '오전 배송 요청' },
    { customerName: '최유진', day: 22, status: 'SCHEDULED', address: '서울 송파구 잠실동 10', notes: null },
    { customerName: '정하은', day: 28, status: 'SCHEDULED', address: '인천 연수구 송도동 55', notes: '부재 시 경비실' },
  ];

  for (const d of deliveries) {
    const scheduledDate = new Date(`${year}-${pad(month)}-${pad(d.day)}`);
    await prisma.delivery.create({
      data: {
        storeId: store.id,
        customerName: d.customerName,
        scheduledDate,
        status: d.status as any,
        address: d.address,
        notes: d.notes,
      },
    }).catch(() => {}); // 중복 무시
  }
  console.log(`Created ${deliveries.length} sample deliveries`);

  // 샘플 계약 데이터
  const contracts = [
    { customerName: '김민준', amount: 2800000, collection: 'SATI' },
    { customerName: '이서연', amount: 1500000, collection: 'QUERENCIA' },
    { customerName: '박지호', amount: 3200000, collection: 'MILO' },
  ];

  for (let i = 0; i < contracts.length; i++) {
    const c = contracts[i];
    const contractNumber = `C-TEST01-${String(i + 1).padStart(3, '0')}`;
    const contractDate = new Date(year, month - 1, i * 5 + 1);
    await prisma.contract.upsert({
      where: { contractNumber },
      update: {},
      create: {
        storeId: store.id,
        contractNumber,
        customerName: c.customerName,
        totalAmount: c.amount,
        status: 'ACTIVE',
        contractDate,
        deliveryDate: new Date(year, month, 15 + i * 3),
        items: {
          create: {
            productName: `${c.collection} 소파`,
            collection: c.collection as any,
            quantity: 1,
            unitPrice: c.amount,
            totalPrice: c.amount,
          },
        },
      },
    });
  }
  console.log(`Created ${contracts.length} sample contracts`);

  // 월별 실적 데이터
  await prisma.monthlyMetric.upsert({
    where: { storeId_year_month: { storeId: store.id, year, month } },
    update: {},
    create: {
      storeId: store.id,
      year,
      month,
      visitCount: 42,
      consultCount: 18,
      quoteCount: 12,
      contractCount: 7,
      contractAmount: 18500000,
      conversionRate: 0.389,
      avgOrderValue: 2642857,
    },
  });
  console.log('Created monthly metrics');

  console.log('\n=== 테스트 매장 설정 완료 ===');
  console.log(`매장명: 테스트 매장`);
  console.log(`코드: TEST01`);
  console.log(`PIN: 1234`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
