import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const STORE_ID = '397b3d51-0fba-4732-ae01-d10ea51de4f0';
const PIN = '1111';

async function main() {
  const hash = await bcrypt.hash(PIN, 10);
  await prisma.storeAuth.upsert({
    where: { storeId: STORE_ID },
    update: { pinHash: hash, plainPin: PIN, isFirstLogin: false },
    create: { storeId: STORE_ID, pinHash: hash, plainPin: PIN, isFirstLogin: false },
  });
  console.log(`PIN set to ${PIN} for store ${STORE_ID}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
