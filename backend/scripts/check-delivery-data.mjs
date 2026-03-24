import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1. 매핑 테이블
  const mappings = await prisma.storeAliasMapping.findMany({ take: 20 });
  console.log('\n=== StoreAliasMapping ===');
  console.log(JSON.stringify(mappings, null, 2));

  // 2. salesRawData 샘플 (DELIVERY_ 포함)
  const deliveryRows = await prisma.salesRawData.findMany({
    where: { itemCode: { startsWith: 'DELIVERY_' } },
    take: 10,
    orderBy: { confirmedDate: 'desc' },
  });
  console.log('\n=== SalesRawData (DELIVERY_) ===');
  console.log(JSON.stringify(deliveryRows, null, 2));

  // 3. 전체 storeAlias 목록
  const aliases = await prisma.salesRawData.findMany({
    where: { itemCode: { startsWith: 'DELIVERY_' } },
    select: { storeAlias: true },
    distinct: ['storeAlias'],
  });
  console.log('\n=== Distinct storeAlias in DELIVERY rows ===');
  console.log(aliases.map(a => a.storeAlias));
}

main().catch(console.error).finally(() => prisma.$disconnect());
