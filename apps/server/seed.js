import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function upsertUser(username, password, role) {
  const passwordHash = await bcrypt.hash(password, 12)

  return prisma.user.upsert({
    where: { username },
    update: { passwordHash, role },
    create: { username, passwordHash, role },
  })
}

async function main() {
  await upsertUser("superadmin", "superadmin", "SUPER_ADMIN")

  console.log("Users seeded")
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
