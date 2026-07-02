import { UserRole } from "@prisma/client"
import bcrypt from "bcryptjs"
import type { Request } from "express"

import { getCurrentUser } from "../auth/session.js"
import { prisma } from "../db/prisma.js"

export type CurrentUser = NonNullable<
  Awaited<ReturnType<typeof getCurrentUser>>
>

export type AuthCheck =
  | {
      currentUser: CurrentUser
    }
  | {
      message: string
      status: number
    }

export function isUuid(value?: string | null) {
  return Boolean(
    value?.match(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    )
  )
}

export async function requireRoles(
  req: Request,
  roles: readonly string[],
  message: string
): Promise<AuthCheck> {
  const currentUser = await getCurrentUser(req)

  if (!currentUser) {
    return { status: 401, message: "Token tidak ditemukan atau tidak valid." }
  }

  if (!roles.includes(currentUser.role)) {
    return { status: 403, message }
  }

  return { currentUser }
}

export async function getCurrentSchoolId(user: {
  id: string
  role: string
  schoolId?: string | null
  username: string
}) {
  if (user.schoolId) {
    return user.schoolId
  }

  if (isUuid(user.id)) {
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { schoolId: true },
    })

    return currentUser?.schoolId ?? null
  }

  const existingUser = await prisma.user.findUnique({
    where: { username: user.username },
    select: { schoolId: true },
  })

  return existingUser?.schoolId ?? null
}

export async function getReporterSchoolId(user: {
  id: string
  role: string
  schoolId?: string | null
  username: string
}) {
  if (user.role !== UserRole.SEKOLAH) {
    return null
  }

  if (user.schoolId) {
    return user.schoolId
  }

  if (!isUuid(user.id)) {
    return user.id
  }

  const account = await prisma.user.findUnique({
    where: { id: user.id },
    select: { schoolId: true },
  })

  return account?.schoolId ?? user.id
}

export async function getSppgOwnerId(
  user: {
    id: string
    role: string
    username: string
  },
  options: { createIfMissing?: boolean } = {}
) {
  if (user.role !== UserRole.SPPG) {
    return null
  }

  if (isUuid(user.id)) {
    return user.id
  }

  const existingUser = await prisma.user.findUnique({
    where: { username: user.username },
    select: { id: true, role: true },
  })

  if (existingUser?.role === UserRole.SPPG) {
    return existingUser.id
  }

  if (!options.createIfMissing) {
    return null
  }

  const passwordHash = await bcrypt.hash(`${user.username}-demo`, 12)
  const createdUser = await prisma.user.create({
    data: {
      passwordHash,
      role: UserRole.SPPG,
      username: user.username,
    },
    select: { id: true },
  })

  return createdUser.id
}

export async function getManagedSchoolReportIds(sppgOwnerId: string | null) {
  if (!sppgOwnerId) return []

  const schools = await prisma.school.findMany({
    where: { sppgId: sppgOwnerId },
    select: {
      id: true,
      account: { select: { id: true } },
    },
  })

  return schools.flatMap((school) =>
    [school.id, school.account?.id].filter(Boolean) as string[]
  )
}
