import bcrypt from "bcryptjs"
import { Prisma, UserRole } from "@prisma/client"
import { Router } from "express"

import { prisma } from "../db/prisma.js"
import { getSppgOwnerId, isUuid, requireRoles } from "../lib/user-scope.js"

export const schoolAccountsRouter = Router()

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

type RawSchoolAccount = {
  id: string
  name: string
  npsn: string | null
  address: string | null
  created_at: Date
  sppg_id: string | null
  sppg_username: string | null
  account_id: string | null
  account_username: string | null
  progress_status: string | null
  progress_notes: string | null
  progress_updated_at: Date | null
}

function toRawSchoolAccountResponse(school: RawSchoolAccount) {
  return {
    id: school.id,
    name: school.name,
    npsn: school.npsn,
    address: school.address,
    createdAt: school.created_at.toISOString(),
    sppg: {
      id: school.sppg_id ?? "",
      username: school.sppg_username ?? "-",
    },
    account: school.account_id
      ? {
          id: school.account_id,
          username: school.account_username ?? "-",
        }
      : null,
    progress: school.progress_status
      ? {
          status: school.progress_status,
          notes: school.progress_notes,
          updatedAt: (school.progress_updated_at ?? school.created_at).toISOString(),
        }
      : null,
  }
}

async function findSchoolAccountsForUser(user: {
  id: string
  role: UserRole | string
  username: string
}) {
  const sppgFilter =
    user.role === "SPPG"
      ? await getSppgOwnerId(user, { createIfMissing: true })
      : null

  return prisma.$queryRaw<RawSchoolAccount[]>`
    SELECT
      s.id::text AS id,
      s.name,
      s.npsn,
      s.address,
      s.created_at,
      s.sppg_id::text AS sppg_id,
      sppg.username AS sppg_username,
      account.id::text AS account_id,
      account.username AS account_username,
      progress.status::text AS progress_status,
      progress.notes AS progress_notes,
      progress.updated_at AS progress_updated_at
    FROM "public"."schools" s
    LEFT JOIN "public"."users" sppg
      ON sppg.id::text = s.sppg_id::text
    LEFT JOIN "public"."users" account
      ON account.school_id::text = s.id::text
    LEFT JOIN "public"."school_progress" progress
      ON progress.school_id::text = s.id::text
    WHERE ${sppgFilter}::text IS NULL OR s.sppg_id::text = ${sppgFilter}
    ORDER BY s.created_at DESC
  `
}

schoolAccountsRouter.get("/", async (req, res, next) => {
  try {
    const auth = await requireRoles(
      req,
      ["SUPER_ADMIN", "SPPG"],
      "Hanya SPPG atau Super Admin yang dapat mengelola akun sekolah."
    )

    if ("status" in auth) {
      return res.status(auth.status).json({ message: auth.message })
    }

    const schools = await findSchoolAccountsForUser(auth.currentUser)

    return res.json({ schools: schools.map(toRawSchoolAccountResponse) })
  } catch (error) {
    next(error)
  }
})

schoolAccountsRouter.post("/", async (req, res, next) => {
  try {
    const auth = await requireRoles(
      req,
      ["SUPER_ADMIN", "SPPG"],
      "Hanya SPPG atau Super Admin yang dapat mengelola akun sekolah."
    )

    if ("status" in auth) {
      return res.status(auth.status).json({ message: auth.message })
    }

    const { address, password, schoolName, sppgId, username } =
      req.body as {
        address?: string
        password?: string
        schoolName?: string
        sppgId?: string
        username?: string
      }
    const normalizedUsername = normalizeUsername(username)
    const normalizedSchoolName = schoolName?.trim()
    const ownerSppgId =
      auth.currentUser.role === "SPPG"
        ? await getSppgOwnerId(auth.currentUser, { createIfMissing: true })
        : sppgId

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

    if (!isUuid(ownerSppgId)) {
      return res.status(400).json({
        message: "SPPG penanggung jawab tidak valid. Silakan pilih akun SPPG database.",
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
          npsn: null,
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

schoolAccountsRouter.patch("/:id", async (req, res, next) => {
  try {
    const auth = await requireRoles(
      req,
      ["SUPER_ADMIN", "SPPG"],
      "Hanya SPPG atau Super Admin yang dapat mengelola akun sekolah."
    )

    if ("status" in auth) {
      return res.status(auth.status).json({ message: auth.message })
    }

    const { address, password, schoolName, sppgId, username } =
      req.body as {
        address?: string
        password?: string
        schoolName?: string
        sppgId?: string
        username?: string
      }
    const normalizedUsername = normalizeUsername(username)
    const normalizedSchoolName = schoolName?.trim()
    const ownerSppgId =
      auth.currentUser.role === "SPPG"
        ? await getSppgOwnerId(auth.currentUser, { createIfMissing: true })
        : sppgId

    if (schoolName !== undefined && !normalizedSchoolName) {
      return res.status(400).json({ message: "Nama sekolah wajib diisi." })
    }

    if (
      username !== undefined &&
      (!normalizedUsername || !/^[a-z0-9_]{3,32}$/.test(normalizedUsername))
    ) {
      return res.status(400).json({
        message:
          "Username harus 3-32 karakter dan hanya boleh berisi huruf kecil, angka, atau underscore.",
      })
    }

    if (password !== undefined && password.length > 0 && password.length < 6) {
      return res.status(400).json({ message: "Password minimal 6 karakter." })
    }

    if (auth.currentUser.role === "SUPER_ADMIN" && sppgId && !isUuid(sppgId)) {
      return res.status(400).json({
        message: "SPPG penanggung jawab tidak valid.",
      })
    }

    const existingSchool = await prisma.school.findFirst({
      where: {
        id: req.params.id,
        ...(auth.currentUser.role === "SPPG"
          ? { sppgId: ownerSppgId as string }
          : {}),
      },
      select: { id: true },
    })

    if (!existingSchool) {
      return res.status(404).json({ message: "Akun sekolah tidak ditemukan." })
    }

    const school = await prisma.$transaction(async (tx) => {
      await tx.school.update({
        where: { id: req.params.id },
        data: {
          ...(address !== undefined ? { address: cleanOptionalText(address) } : {}),
          ...(normalizedSchoolName ? { name: normalizedSchoolName } : {}),
          ...(auth.currentUser.role === "SUPER_ADMIN" && sppgId
            ? { sppgId }
            : {}),
        },
      })

      if (normalizedUsername || password) {
        const accountData: {
          passwordHash?: string
          username?: string
        } = {}

        if (normalizedUsername) {
          accountData.username = normalizedUsername
        }

        if (password) {
          accountData.passwordHash = await bcrypt.hash(password, 12)
        }

        await tx.user.updateMany({
          where: { schoolId: req.params.id, role: UserRole.SEKOLAH },
          data: accountData,
        })
      }

      return tx.school.findUniqueOrThrow({
        where: { id: req.params.id },
        include: {
          account: { select: { id: true, username: true } },
          progress: true,
          sppg: { select: { id: true, username: true } },
        },
      })
    })

    return res.json({ school: toSchoolAccountResponse(school) })
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

schoolAccountsRouter.delete("/:id", async (req, res, next) => {
  try {
    const auth = await requireRoles(
      req,
      ["SUPER_ADMIN", "SPPG"],
      "Hanya SPPG atau Super Admin yang dapat mengelola akun sekolah."
    )

    if ("status" in auth) {
      return res.status(auth.status).json({ message: auth.message })
    }

    const ownerSppgId =
      auth.currentUser.role === "SPPG"
        ? await getSppgOwnerId(auth.currentUser, { createIfMissing: true })
        : null

    const existingSchool = await prisma.school.findFirst({
      where: {
        id: req.params.id,
        ...(auth.currentUser.role === "SPPG"
          ? { sppgId: ownerSppgId as string }
          : {}),
      },
      select: { id: true },
    })

    if (!existingSchool) {
      return res.status(404).json({ message: "Akun sekolah tidak ditemukan." })
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.deleteMany({
        where: { schoolId: req.params.id, role: UserRole.SEKOLAH },
      })
      await tx.school.delete({
        where: { id: req.params.id },
      })
    })

    return res.status(204).send()
  } catch (error) {
    next(error)
  }
})
