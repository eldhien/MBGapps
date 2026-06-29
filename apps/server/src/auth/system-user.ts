import bcrypt from "bcryptjs"
import { UserRole } from "@prisma/client"

import { prisma } from "../lib/prisma.js"

export const SUPERADMIN_USERNAME = "superadmin"
export const SUPERADMIN_PASSWORD = "superadmin"

export async function ensureSuperadminUser() {
  const passwordHash = await bcrypt.hash(SUPERADMIN_PASSWORD, 12)
  const existingSuperadmin = await prisma.user.findUnique({
    where: { username: SUPERADMIN_USERNAME },
    select: { id: true },
  })

  if (existingSuperadmin) {
    await prisma.user.update({
      where: { id: existingSuperadmin.id },
      data: {
        passwordHash,
        role: UserRole.SUPER_ADMIN,
      },
    })
    return
  }

  await prisma.user.create({
    data: {
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      username: SUPERADMIN_USERNAME,
    },
  })
}
