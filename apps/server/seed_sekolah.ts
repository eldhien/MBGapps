import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function seed() {
  await prisma.user.createMany({
    data: [
      { username: 'SDN 01 Pagi', passwordHash: 'hash', role: 'SEKOLAH' },
      { username: 'SMPN 12 Jakarta', passwordHash: 'hash', role: 'SEKOLAH' },
      { username: 'SMAN 3 Bandung', passwordHash: 'hash', role: 'SEKOLAH' }
    ],
    skipDuplicates: true
  });
  console.log('Sekolah seeded!');
}

seed().catch(console.error).finally(() => prisma.$disconnect());
