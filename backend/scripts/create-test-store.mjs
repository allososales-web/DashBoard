// Node.js ESM script - Prisma Client 직접 사용
import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';

// bcrypt 없이 간단히 처리 - 실제로는 bcrypt 필요하므로 별도 처리
// 대신 REST API를 통해 처리

const prisma = new PrismaClient();

async function main() {
  // 테스트 매장 upsert
  const store = await prisma.store.upsert({
    where: { code: 'TEST01' },
    update: { showOnLogin: true, displayName: '테스트 매장', isActive: true },
    create: {
      name: '테스트 매장',
      code: 'TEST01',
      defaultChannel: 'ROAD',
      showOnLogin: true,
      displayName: '테스트 매장',
      isActive: true,
    },
  });
  console.log('Store created:', store.id, store.name);
  return store.id;
}

main()
  .then(id => { console.log('STORE_ID=' + id); })
  .catch(console.error)
  .finally(() => prisma.$disconnect());
