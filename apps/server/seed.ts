import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash("superadmin", 12)
  await prisma.user.upsert({
    where: { username: "superadmin" },
    update: { passwordHash, role: "SUPER_ADMIN" },
    create: { username: "superadmin", passwordHash, role: "SUPER_ADMIN" },
  })

  const embegeHash = await bcrypt.hash("embege", 12)
  await prisma.user.upsert({
    where: { username: "embege" },
    update: { passwordHash: embegeHash, role: "SPPG" },
    create: { username: "embege", passwordHash: embegeHash, role: "SPPG" },
  })

  const sekolahHash = await bcrypt.hash("sekolah", 12)
  await prisma.user.upsert({
    where: { username: "sekolah" },
    update: { passwordHash: sekolahHash, role: "SEKOLAH" },
    create: { username: "sekolah", passwordHash: sekolahHash, role: "SEKOLAH" },
  })

  console.log("Users seeded")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
