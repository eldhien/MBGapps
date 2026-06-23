import bcrypt from "bcryptjs"
import { Prisma, UserRole } from "@prisma/client"
import { Router } from "express"

import { getCurrentUser } from "../auth/session.js"
import { prisma } from "../lib/prisma.js"

export const schoolAccountsRouter = Router()

type SppgAccountCheck =
  | {
      currentUser: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>
    }
  | {
      message: string
      status: number
    }

function normalizeUsername(username?: string) {
  return username?.trim().toLowerCase()
}

function cleanOptionalText(value?: string) {
  const cleaned = value?.trim()
  return cleaned ? cleaned : null
}

function toSchoolAccountResponse(school: {
  id: string
  name: string
  npsn: string | null
  address: string | null
  createdAt: Date
  sppg: {
    id: string
    username: string
  }
  account: {
    id: string
    username: string
  } | null
  progress: {
    status: string
    notes: string | null
    updatedAt: Date
  } | null
}) {
  return {
    id: school.id,
    name: school.name,
    npsn: school.npsn,
    address: school.address,
    createdAt: school.createdAt.toISOString(),
    sppg: school.sppg,
    account: school.account,
    progress: school.progress
      ? {
          status: school.progress.status,
          notes: school.progress.notes,
          updatedAt: school.progress.updatedAt.toISOString(),
        }
      : null,
  }
}

async function requireSppgOrSuperAdmin(
  req: Parameters<typeof getCurrentUser>[0]
): Promise<SppgAccountCheck> {
  const currentUser = await getCurrentUser(req)

  if (!currentUser) {
    return { status: 401, message: "Token tidak ditemukan atau tidak valid." }
  }

  if (currentUser.role !== "SUPER_ADMIN" && currentUser.role !== "SPPG") {
    return {
      status: 403,
      message: "Hanya SPPG atau Super Admin yang dapat mengelola akun sekolah.",
    }
  }

  return { currentUser }
}

schoolAccountsRouter.get("/", async (req, res, next) => {
  try {
    const auth = await requireSppgOrSuperAdmin(req)

    if ("status" in auth) {
      return res.status(auth.status).json({ message: auth.message })
    }

    const schools = await prisma.school.findMany({
      where:
        auth.currentUser.role === "SPPG"
          ? { sppgId: auth.currentUser.id }
          : undefined,
      include: {
        account: { select: { id: true, username: true } },
        progress: true,
        sppg: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return res.json({ schools: schools.map(toSchoolAccountResponse) })
  } catch (error) {
    next(error)
  }
})

schoolAccountsRouter.post("/", async (req, res, next) => {
  try {
    const auth = await requireSppgOrSuperAdmin(req)

    if ("status" in auth) {
      return res.status(auth.status).json({ message: auth.message })
    }

    const { address, npsn, password, schoolName, sppgId, username } =
      req.body as {
        address?: string
        npsn?: string
        password?: string
        schoolName?: string
        sppgId?: string
        username?: string
      }
    const normalizedUsername = normalizeUsername(username)
    const normalizedSchoolName = schoolName?.trim()
    const ownerSppgId =
      auth.currentUser.role === "SPPG" ? auth.currentUser.id : sppgId

    if (!normalizedUsername || !password || !normalizedSchoolName) {
      return res.status(400).json({
        message: "Nama sekolah, username, dan password wajib diisi.",
      })
    }

    if (!/^[a-z0-9_]{3,32}$/.test(normalizedUsername)) {
      return res.status(400).json({
        message:
          "Username harus 3-32 karakter dan hanya boleh berisi huruf kecil, angka, atau underscore.",
      })
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password minimal 6 karakter." })
    }

    if (!ownerSppgId) {
      return res.status(400).json({
        message: "SPPG penanggung jawab wajib dipilih.",
      })
    }

    const sppg = await prisma.user.findUnique({
      where: { id: ownerSppgId },
      select: { id: true, role: true },
    })

    if (!sppg || sppg.role !== UserRole.SPPG) {
      return res.status(400).json({
        message: "SPPG penanggung jawab tidak valid.",
      })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const school = await prisma.$transaction(async (tx) => {
      const createdSchool = await tx.school.create({
        data: {
          address: cleanOptionalText(address),
          name: normalizedSchoolName,
          npsn: cleanOptionalText(npsn),
          sppgId: ownerSppgId,
          progress: {
            create: {},
          },
        },
      })

      await tx.user.create({
        data: {
          passwordHash,
          role: UserRole.SEKOLAH,
          schoolId: createdSchool.id,
          username: normalizedUsername,
        },
      })

      return tx.school.findUniqueOrThrow({
        where: { id: createdSchool.id },
        include: {
          account: { select: { id: true, username: true } },
          progress: true,
          sppg: { select: { id: true, username: true } },
        },
      })
    })

    return res.status(201).json({ school: toSchoolAccountResponse(school) })
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res.status(409).json({ message: "Username sudah digunakan." })
    }

    next(error)
  }
})
