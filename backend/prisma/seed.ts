import { PrismaClient, Role, PermissionLevel, ChannelType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// 전체 알로소 대리점 마스터 데이터
const ALL_STORES: { name: string; code: string; channel: ChannelType; showOnLogin: boolean }[] = [
  { name: '(알)두이커머스', code: '258319', channel: 'ROAD', showOnLogin: false },
  { name: '(알)현대킨텍스', code: '188764', channel: 'DEPARTMENT', showOnLogin: false },
  { name: '(주)민음사', code: '236181', channel: 'ROAD', showOnLogin: false },
  { name: 'TTRS', code: '244669', channel: 'ROAD', showOnLogin: false },
  { name: '갤러리아대전', code: '255909', channel: 'ROAD', showOnLogin: false },
  { name: '갤러리아명품관(알)', code: '241816', channel: 'ROAD', showOnLogin: false },
  { name: '그랜드워커힐 서울', code: '257626', channel: 'ROAD', showOnLogin: false },
  { name: '더현대대구', code: '256058', channel: 'DEPARTMENT', showOnLogin: false },
  { name: '더현대서울(알)', code: '231826', channel: 'DEPARTMENT', showOnLogin: false },
  { name: '디자인하우', code: '51DH02', channel: 'ROAD', showOnLogin: false },
  { name: '롯데 본점(알)', code: '257711', channel: 'DEPARTMENT', showOnLogin: false },
  { name: '롯데광주점(알)', code: '225546', channel: 'DEPARTMENT', showOnLogin: false },
  { name: '롯데구리점(알)', code: '241122', channel: 'DEPARTMENT', showOnLogin: false },
  { name: '롯데노원점', code: '211111', channel: 'DEPARTMENT', showOnLogin: false },
  { name: '롯데대전점(알)', code: '225430', channel: 'DEPARTMENT', showOnLogin: false },
  { name: '롯데동래점(알)', code: '225545', channel: 'DEPARTMENT', showOnLogin: false },
  { name: '롯데동탄점(알)', code: '223308', channel: 'DEPARTMENT', showOnLogin: false },
  { name: '롯데몰수지점(알)', code: '215162', channel: 'DEPARTMENT', showOnLogin: false },
  { name: '롯데본점(알)', code: '233491', channel: 'DEPARTMENT', showOnLogin: false },
  { name: '롯데부산본점', code: '255635', channel: 'DEPARTMENT', showOnLogin: false },
  { name: '롯데쇼핑(주)울산점', code: '212239', channel: 'DEPARTMENT', showOnLogin: false },
  { name: '롯데일산점(알)', code: '214283', channel: 'DEPARTMENT', showOnLogin: false },
  { name: '롯데평촌점(알)', code: '241187', channel: 'DEPARTMENT', showOnLogin: false },
  { name: '메종동부산(알)', code: '213459', channel: 'ROAD', showOnLogin: false },
  { name: '바른손카드', code: '217193', channel: 'ROAD', showOnLogin: false },
  { name: '부산보관처(알)', code: '248613', channel: 'ROAD', showOnLogin: false },
  { name: '성남보관처(알)', code: '226933', channel: 'ROAD', showOnLogin: false },
  { name: '스타필드고양(알)', code: '234434', channel: 'STARFIELD', showOnLogin: false },
  { name: '스타필드수원(알)', code: '238116', channel: 'STARFIELD', showOnLogin: false },
  { name: '스타필드하남(알)', code: '240370', channel: 'STARFIELD', showOnLogin: false },
  { name: '신세계강남(알)', code: '214967', channel: 'DEPARTMENT', showOnLogin: false },
  { name: '신세계김해(알)', code: '225390', channel: 'DEPARTMENT', showOnLogin: false },
  { name: '신세계대구(알)', code: '225281', channel: 'DEPARTMENT', showOnLogin: false },
  { name: '신세계대전(알)', code: '226486', channel: 'DEPARTMENT', showOnLogin: false },
  { name: '신세계센텀', code: '187315', channel: 'DEPARTMENT', showOnLogin: false },
  { name: '신세계영등', code: '199051', channel: 'DEPARTMENT', showOnLogin: false },
  { name: '신세계의정부(알)', code: '214586', channel: 'DEPARTMENT', showOnLogin: false },
  { name: '신세계파주(알)', code: '230746', channel: 'DEPARTMENT', showOnLogin: false },
  { name: '아라리오천안(알)', code: '217448', channel: 'ROAD', showOnLogin: false },
  { name: '아이파크', code: '198217', channel: 'ROAD', showOnLogin: false },
  { name: '아파트멘터', code: '200780', channel: 'ROAD', showOnLogin: false },
  { name: '알로소 성수', code: '258774', channel: 'ROAD', showOnLogin: true },
  { name: '알로소기흥', code: '202297', channel: 'ROAD', showOnLogin: true },
  { name: '알로소노원', code: '257935', channel: 'ROAD', showOnLogin: true },
  { name: '알로소대구', code: '216816', channel: 'ROAD', showOnLogin: true },
  { name: '알로소대전', code: '223095', channel: 'ROAD', showOnLogin: true },
  { name: '알로소청담', code: '181174', channel: 'ROAD', showOnLogin: true },
  { name: '투에이치컴퍼니', code: '242662', channel: 'ROAD', showOnLogin: false },
  { name: '프린트베이커리', code: '246759', channel: 'ROAD', showOnLogin: false },
  { name: '한샘헬리2', code: '195513', channel: 'ROAD', showOnLogin: false },
  { name: '한샘헬리오', code: '190525', channel: 'ROAD', showOnLogin: false },
  { name: '현대김포점(알)', code: '223107', channel: 'DEPARTMENT', showOnLogin: false },
  { name: '현대디큐브(알)', code: '214611', channel: 'DEPARTMENT', showOnLogin: false },
  { name: '현대미아(알)', code: '224954', channel: 'DEPARTMENT', showOnLogin: false },
  { name: '현대신촌(알)', code: '227604', channel: 'DEPARTMENT', showOnLogin: false },
  { name: '현대압구정본점(알)', code: '258460', channel: 'DEPARTMENT', showOnLogin: false },
  { name: '현대중동점', code: '189243', channel: 'DEPARTMENT', showOnLogin: false },
  { name: '(주)대교', code: '19SZ77', channel: 'MALL', showOnLogin: false },
  { name: '11번가', code: '14SZ88', channel: 'MALL', showOnLogin: false },
  { name: '11번가(신)', code: '15SZ16', channel: 'MALL', showOnLogin: false },
  { name: '29cm', code: '227240', channel: 'MALL', showOnLogin: false },
  { name: '그립', code: '255729', channel: 'MALL', showOnLogin: false },
  { name: '네이버(시)', code: '15SZ27', channel: 'MALL', showOnLogin: false },
  { name: '네이버(알)', code: '211791', channel: 'MALL', showOnLogin: false },
  { name: '대범한사람들', code: '236387', channel: 'MALL', showOnLogin: false },
  { name: '롯데닷컴', code: '14SZ06', channel: 'MALL', showOnLogin: false },
  { name: '롯데아(카)', code: '15SZ07', channel: 'MALL', showOnLogin: false },
  { name: '롯데아이몰', code: '11SZ90', channel: 'MALL', showOnLogin: false },
  { name: '롯데온', code: '202953', channel: 'MALL', showOnLogin: false },
  { name: '리바트몰', code: '19SZ10', channel: 'MALL', showOnLogin: false },
  { name: '마켓컬리', code: '224612', channel: 'MALL', showOnLogin: false },
  { name: '배달의민족', code: '228137', channel: 'MALL', showOnLogin: false },
  { name: '시디즈쇼핑', code: '14SZ79', channel: 'MALL', showOnLogin: false },
  { name: '신세계2', code: '16SZ72', channel: 'MALL', showOnLogin: false },
  { name: '신세계4', code: '191767', channel: 'MALL', showOnLogin: false },
  { name: '신세계몰', code: '14SZ03', channel: 'MALL', showOnLogin: false },
  { name: '씨앤드제이', code: '19SZ20', channel: 'MALL', showOnLogin: false },
  { name: '씨제이(카)', code: '15SZ01', channel: 'MALL', showOnLogin: false },
  { name: '알로소몰', code: '198630', channel: 'MALL', showOnLogin: false },
  { name: '에스에스지', code: '191766', channel: 'MALL', showOnLogin: false },
  { name: '에이케이몰', code: '15SZ28', channel: 'MALL', showOnLogin: false },
  { name: '엔에스몰', code: '15SZ32', channel: 'MALL', showOnLogin: false },
  { name: '엘롯데', code: '15SZ40', channel: 'MALL', showOnLogin: false },
  { name: '오늘의집', code: '172314', channel: 'MALL', showOnLogin: false },
  { name: '옥션', code: '14SZ99', channel: 'MALL', showOnLogin: false },
  { name: '올더게이트', code: '15SZ10', channel: 'MALL', showOnLogin: false },
  { name: '위메프', code: '16SZ48', channel: 'MALL', showOnLogin: false },
  { name: '위메프3', code: '198795', channel: 'MALL', showOnLogin: false },
  { name: '이마트몰', code: '16SZ04', channel: 'MALL', showOnLogin: false },
  { name: '이텍컴퓨터', code: '195643', channel: 'MALL', showOnLogin: false },
  { name: '인터비즈', code: '190679', channel: 'MALL', showOnLogin: false },
  { name: '인터파크', code: '222438', channel: 'MALL', showOnLogin: false },
  { name: '인터파크2', code: '185780', channel: 'MALL', showOnLogin: false },
  { name: '주식회사 무신사', code: '230928', channel: 'MALL', showOnLogin: false },
  { name: '지마켓', code: '14SZ89', channel: 'MALL', showOnLogin: false },
  { name: '카카오', code: '17SZ13', channel: 'MALL', showOnLogin: false },
  { name: '카카오2', code: '216069', channel: 'MALL', showOnLogin: false },
  { name: '카카오메2', code: '210153', channel: 'MALL', showOnLogin: false },
  { name: '카카오선2', code: '210156', channel: 'MALL', showOnLogin: false },
  { name: '카카오선물', code: '210061', channel: 'MALL', showOnLogin: false },
  { name: '쿠팡2', code: '16SZ76', channel: 'MALL', showOnLogin: false },
  { name: '쿠팡로켓', code: '18SZ78', channel: 'MALL', showOnLogin: false },
  { name: '토스쇼핑', code: '255313', channel: 'MALL', showOnLogin: false },
  { name: '티켓몬스터', code: '16SZ66', channel: 'MALL', showOnLogin: false },
  { name: '피처링', code: '227186', channel: 'MALL', showOnLogin: false },
  { name: '하이마트', code: '14SZ13', channel: 'MALL', showOnLogin: false },
  { name: '하이마트2', code: '185868', channel: 'MALL', showOnLogin: false },
  { name: '현대홈(카)', code: '15SZ12', channel: 'MALL', showOnLogin: false },
  { name: '홈앤쇼핑', code: '16SZ39', channel: 'MALL', showOnLogin: false },
  { name: 'CJmall', code: '11SZ77', channel: 'MALL', showOnLogin: false },
  { name: 'GSeshop', code: '11SZ32', channel: 'MALL', showOnLogin: false },
  { name: 'GSeshop(2)', code: '213848', channel: 'MALL', showOnLogin: false },
  { name: 'Hmall', code: '11SZ44', channel: 'MALL', showOnLogin: false },
  { name: 'LG전자(알)', code: '255885', channel: 'MALL', showOnLogin: false },
  { name: 'X_인터파크', code: '14SZ35', channel: 'MALL', showOnLogin: false },
  { name: 'X_인터파크2', code: '204930', channel: 'MALL', showOnLogin: false },
];

// 로그인 화면에 표시되는 직영 매장 (PIN 발급 대상)
const LOGIN_STORES = [
  { name: '강남 플래그십', code: 'GANGNAM-01', pin: '1111' },
  { name: '판교점', code: 'PANGYO-01', pin: '1112' },
];

async function main() {
  console.log('Seeding database...');

  // 1. HQ PIN
  const hqPinHash = await bcrypt.hash('9999', 10);
  const existingHq = await prisma.hqAuth.findFirst();
  if (!existingHq) {
    await prisma.hqAuth.create({ data: { pinHash: hqPinHash, plainPin: '9999', isFirstLogin: true } });
    console.log('Created HQ auth (PIN: 9999)');
  } else {
    await prisma.hqAuth.update({ where: { id: existingHq.id }, data: { plainPin: existingHq.plainPin ?? '9999' } });
  }

  // 2. 전체 대리점 upsert (showOnLogin=false, PIN 없음)
  for (const s of ALL_STORES) {
    await prisma.store.upsert({
      where: { code: s.code },
      update: { defaultChannel: s.channel },
      create: {
        name: s.name,
        code: s.code,
        defaultChannel: s.channel,
        showOnLogin: s.showOnLogin,
        displayName: s.showOnLogin ? s.name : null,
        isActive: true,
      },
    });
  }
  console.log(`Upserted ${ALL_STORES.length} stores`);

  // 3. 로그인 화면 표시 매장 PIN 설정
  for (const s of LOGIN_STORES) {
    const store = await prisma.store.upsert({
      where: { code: s.code },
      update: { showOnLogin: true, displayName: s.name },
      create: {
        name: s.name,
        code: s.code,
        showOnLogin: true,
        displayName: s.name,
        defaultChannel: 'ROAD',
        isActive: true,
      },
    });
    const existing = await prisma.storeAuth.findUnique({ where: { storeId: store.id } });
    if (!existing) {
      const pinHash = await bcrypt.hash(s.pin, 10);
      await prisma.storeAuth.create({ data: { storeId: store.id, pinHash, plainPin: s.pin, isFirstLogin: true } });
      console.log(`Created store auth: ${store.name} (PIN: ${s.pin})`);
    } else {
      await prisma.storeAuth.update({ where: { storeId: store.id }, data: { plainPin: existing.plainPin ?? s.pin } });
    }
  }

  // 4. Admin user
  const passwordHash = await bcrypt.hash('admin1234', 10);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: { username: 'admin', passwordHash, name: '관리자', email: 'admin@alloso.com', role: Role.HQ_ADMIN, isActive: true },
  });

  // 5. Admin permissions
  const allStores = await prisma.store.findMany();
  for (const store of allStores) {
    await prisma.userStorePermission.upsert({
      where: { userId_storeId: { userId: admin.id, storeId: store.id } },
      update: {},
      create: { userId: admin.id, storeId: store.id, permissionLevel: PermissionLevel.MANAGE },
    });
  }

  console.log('\n=== Seed Complete ===');
  console.log(`Total stores: ${allStores.length}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
