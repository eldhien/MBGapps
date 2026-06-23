import {
  BatchDistributionSchoolStatus,
  BatchDistributionStatus,
  UserRole,
} from "@prisma/client"
import bcrypt from "bcryptjs"
import { Router } from "express"

import { getCurrentUser } from "../auth/session.js"
import { prisma } from "../lib/prisma.js"

export const productionDistributionsRouter = Router()

type SppgDistributionCheck =
  | {
      currentUser: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>
    }
  | {
      message: string
      status: number
    }

function isUuid(value?: string | null) {
  return Boolean(
    value?.match(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    )
  )
}

async function resolveSppgOwnerId(user: {
  id: string
  role: UserRole | string
  username: string
}) {
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

async function requireSppgOrSuperAdmin(
  req: Parameters<typeof getCurrentUser>[0]
): Promise<SppgDistributionCheck> {
  const currentUser = await getCurrentUser(req)

  if (!currentUser) {
    return { status: 401, message: "Token tidak ditemukan atau tidak valid." }
  }

  if (currentUser.role !== "SUPER_ADMIN" && currentUser.role !== "SPPG") {
    return {
      status: 403,
      message: "Hanya SPPG atau Super Admin yang dapat mengelola distribusi.",
    }
  }

  return { currentUser }
}

function toDistributionResponse(distribution: any) {
  return {
    id: distribution.id,
    batchId: distribution.batchId,
    waktuKirim: distribution.waktuKirim?.toISOString() ?? null,
    status: distribution.status,
    createdAt: distribution.createdAt.toISOString(),
    batch: distribution.batch
      ? {
          id: distribution.batch.id,
          totalPorsi: distribution.batch.totalPorsi,
          status: distribution.batch.status,
          menu: distribution.batch.menu,
          driver: distribution.batch.driver,
        }
      : null,
    schools: distribution.schools.map((item: any) => ({
      id: item.id,
      jumlahPorsi: item.jumlahPorsi,
      status: item.status,
      receivedAt: item.receivedAt?.toISOString() ?? null,
      rejectedReason: item.rejectedReason,
      school: item.school,
    })),
  }
}

type RawProductionDistribution = {
  id: string
  batch_id: string
  waktu_kirim: Date | null
  status: string
  created_at: Date
  batch_total_porsi: number | null
  batch_status: string | null
  menu_id: string | null
  menu_name: string | null
  menu_category: string | null
  driver_id: string | null
  driver_name: string | null
  driver_phone: string | null
  driver_vehicle_number: string | null
  school_item_id: string | null
  jumlah_porsi: number | null
  school_item_status: string | null
  received_at: Date | null
  rejected_reason: string | null
  school_id: string | null
  school_name: string | null
  school_npsn: string | null
  school_address: string | null
}

function toRawDistributionResponses(rows: RawProductionDistribution[]) {
  const map = new Map<string, any>()

  for (const row of rows) {
    if (!map.has(row.id)) {
      map.set(row.id, {
        id: row.id,
        batchId: row.batch_id,
        waktuKirim: row.waktu_kirim?.toISOString() ?? null,
        status: row.status,
        createdAt: row.created_at.toISOString(),
        batch: {
          id: row.batch_id,
          totalPorsi: row.batch_total_porsi,
          status: row.batch_status,
          menu: row.menu_id
            ? {
                id: row.menu_id,
                name: row.menu_name,
                category: row.menu_category,
              }
            : null,
          driver: row.driver_id
            ? {
                id: row.driver_id,
                name: row.driver_name,
                phone: row.driver_phone,
                vehicleNumber: row.driver_vehicle_number,
              }
            : null,
        },
        schools: [],
      })
    }

    if (row.school_item_id) {
      map.get(row.id).schools.push({
        id: row.school_item_id,
        jumlahPorsi: row.jumlah_porsi ?? 0,
        status: row.school_item_status,
        receivedAt: row.received_at?.toISOString() ?? null,
        rejectedReason: row.rejected_reason,
        school: {
          id: row.school_id ?? "",
          name: row.school_name ?? "-",
          npsn: row.school_npsn,
          address: row.school_address,
        },
      })
    }
  }

  return [...map.values()]
}

async function findProductionDistributionsForUser(user: {
  id: string
  role: string
  username: string
}) {
  const sppgFilter =
    user.role === UserRole.SPPG ? await resolveSppgOwnerId(user) : null

  return prisma.$queryRaw<RawProductionDistribution[]>`
    SELECT
      d.id::text AS id,
      d.batch_id::text AS batch_id,
      d.waktu_kirim,
      d.status::text AS status,
      d.created_at,
      b."totalPorsi" AS batch_total_porsi,
      b.status::text AS batch_status,
      m.id::text AS menu_id,
      m.name AS menu_name,
      m.category::text AS menu_category,
      driver.id::text AS driver_id,
      driver.name AS driver_name,
      driver.phone AS driver_phone,
      driver.vehicle_number AS driver_vehicle_number,
      ds.id::text AS school_item_id,
      ds.jumlah_porsi,
      ds.status::text AS school_item_status,
      ds.received_at,
      ds.rejected_reason,
      school.id::text AS school_id,
      school.name AS school_name,
      school.npsn AS school_npsn,
      school.address AS school_address
    FROM "public"."batch_distributions" d
    LEFT JOIN "public"."batch_produksi" b
      ON b.id::text = d.batch_id::text
    LEFT JOIN "public"."menu_masters" m
      ON m.id::text = b."menuId"::text
    LEFT JOIN "public"."drivers" driver
      ON driver.id::text = b."driverId"::text
    LEFT JOIN "public"."batch_distribution_schools" ds
      ON ds.distribution_id::text = d.id::text
    LEFT JOIN "public"."schools" school
      ON school.id::text = ds.school_id::text
    WHERE ${sppgFilter}::text IS NULL OR school.sppg_id::text = ${sppgFilter}
    ORDER BY d.created_at DESC, ds.created_at ASC
  `
}

productionDistributionsRouter.get("/", async (req, res, next) => {
  try {
    const auth = await requireSppgOrSuperAdmin(req)

    if ("status" in auth) {
      return res.status(auth.status).json({ message: auth.message })
    }

    const distributions = await findProductionDistributionsForUser(auth.currentUser)

    return res.json({ distributions: toRawDistributionResponses(distributions) })
  } catch (error) {
    next(error)
  }
})

productionDistributionsRouter.post("/", async (req, res, next) => {
  try {
    const auth = await requireSppgOrSuperAdmin(req)

    if ("status" in auth) {
      return res.status(auth.status).json({ message: auth.message })
    }

    const { batchId, driverId, schools, status = "DIKIRIM", waktuKirim } = req.body as {
      batchId?: string
      driverId?: string
      schools?: { schoolId?: string; jumlahPorsi?: number }[]
      status?: string
      waktuKirim?: string
    }

    if (!batchId || !driverId || !schools?.length) {
      return res
        .status(400)
        .json({ message: "ID batch, driver, dan sekolah tujuan wajib diisi." })
    }

    if (!Object.values(BatchDistributionStatus).includes(status as BatchDistributionStatus)) {
      return res.status(400).json({ message: "Status distribusi tidak valid." })
    }

    const validSchools = schools.filter(
      (item) => item.schoolId && Number(item.jumlahPorsi) > 0
    )
    const uniqueSchoolIds = new Set(validSchools.map((item) => item.schoolId))

    if (validSchools.length !== schools.length || uniqueSchoolIds.size !== schools.length) {
      return res.status(400).json({
        message: "Setiap sekolah wajib unik dan memiliki jumlah porsi valid.",
      })
    }

    const batch = await prisma.batchProduksi.findUnique({
      where: { id: batchId },
      select: { id: true },
    })

    if (!batch) {
      return res.status(404).json({ message: "Batch tidak ditemukan." })
    }

    const driver = await prisma.driver.findFirst({
      where: {
        id: driverId,
        isActive: true,
      },
      select: { id: true },
    })

    if (!driver) {
      return res.status(400).json({ message: "Driver tidak valid atau tidak aktif." })
    }

    const ownerSppgId =
      auth.currentUser.role === UserRole.SPPG
        ? await resolveSppgOwnerId(auth.currentUser)
        : null

    if (auth.currentUser.role === UserRole.SPPG && !ownerSppgId) {
      return res.status(400).json({
        message: "Akun SPPG tidak valid. Silakan login ulang.",
      })
    }

    const schoolRecords = await prisma.school.findMany({
      where: {
        id: { in: [...uniqueSchoolIds] as string[] },
        ...(auth.currentUser.role === UserRole.SPPG
          ? { sppgId: ownerSppgId as string }
          : {}),
      },
      select: { id: true },
    })

    if (schoolRecords.length !== uniqueSchoolIds.size) {
      return res.status(400).json({
        message: "Ada sekolah tujuan yang tidak valid untuk SPPG ini.",
      })
    }

    const distribution = await prisma.$transaction(async (tx) => {
      const created = await tx.batchDistribution.create({
        data: {
          batchId,
          status: status as BatchDistributionStatus,
          waktuKirim: waktuKirim ? new Date(waktuKirim) : new Date(),
          schools: {
            create: validSchools.map((item) => ({
              schoolId: item.schoolId as string,
              jumlahPorsi: Number(item.jumlahPorsi),
            })),
          },
        },
      })

      await tx.batchProduksi.update({
        where: { id: batchId },
        data: { driverId, status: "TERKIRIM" },
      })

      await tx.schoolProgress.updateMany({
        where: { schoolId: { in: [...uniqueSchoolIds] as string[] } },
        data: { status: "DIKIRIM" },
      })

      return tx.batchDistribution.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          batch: {
            include: {
              driver: true,
              menu: true,
            },
          },
          schools: {
            include: {
              school: {
                select: {
                  id: true,
                  name: true,
                  npsn: true,
                  address: true,
                },
              },
            },
          },
        },
      })
    })

    return res
      .status(201)
      .json({ distribution: toDistributionResponse(distribution) })
  } catch (error) {
    next(error)
  }
})

productionDistributionsRouter.patch("/:id", async (req, res, next) => {
  try {
    const auth = await requireSppgOrSuperAdmin(req)

    if ("status" in auth) {
      return res.status(auth.status).json({ message: auth.message })
    }

    const { batchId, driverId, schools, status, waktuKirim } = req.body as {
      batchId?: string
      driverId?: string
      schools?: { schoolId?: string; jumlahPorsi?: number }[]
      status?: string
      waktuKirim?: string
    }

    if (status && !Object.values(BatchDistributionStatus).includes(status as BatchDistributionStatus)) {
      return res.status(400).json({ message: "Status distribusi tidak valid." })
    }

    if (driverId) {
      const driver = await prisma.driver.findFirst({
        where: { id: driverId, isActive: true },
        select: { id: true },
      })

      if (!driver) {
        return res.status(400).json({ message: "Driver tidak valid atau tidak aktif." })
      }
    }

    if (batchId) {
      const batch = await prisma.batchProduksi.findUnique({
        where: { id: batchId },
        select: { id: true },
      })

      if (!batch) {
        return res.status(404).json({ message: "Batch tidak ditemukan." })
      }
    }

    const existing = await prisma.batchDistribution.findUnique({
      where: { id: req.params.id },
      include: { schools: true },
    })

    if (!existing) {
      return res.status(404).json({ message: "Distribusi tidak ditemukan." })
    }

    const validSchools = schools?.filter(
      (item) => item.schoolId && Number(item.jumlahPorsi) > 0
    )
    const uniqueSchoolIds = new Set(validSchools?.map((item) => item.schoolId))

    if (
      schools &&
      (!validSchools ||
        validSchools.length !== schools.length ||
        uniqueSchoolIds.size !== schools.length)
    ) {
      return res.status(400).json({
        message: "Setiap sekolah wajib unik dan memiliki jumlah porsi valid.",
      })
    }

    if (validSchools?.length) {
      const ownerSppgId =
        auth.currentUser.role === UserRole.SPPG
          ? await resolveSppgOwnerId(auth.currentUser)
          : null

      if (auth.currentUser.role === UserRole.SPPG && !ownerSppgId) {
        return res.status(400).json({
          message: "Akun SPPG tidak valid. Silakan login ulang.",
        })
      }

      const schoolRecords = await prisma.school.findMany({
        where: {
          id: { in: [...uniqueSchoolIds] as string[] },
          ...(auth.currentUser.role === UserRole.SPPG
            ? { sppgId: ownerSppgId as string }
            : {}),
        },
        select: { id: true },
      })

      if (schoolRecords.length !== uniqueSchoolIds.size) {
        return res.status(400).json({
          message: "Ada sekolah tujuan yang tidak valid untuk SPPG ini.",
        })
      }
    }

    const distribution = await prisma.$transaction(async (tx) => {
      const updated = await tx.batchDistribution.update({
        where: { id: req.params.id },
        data: {
          ...(batchId ? { batchId } : {}),
          ...(status ? { status: status as BatchDistributionStatus } : {}),
          ...(waktuKirim ? { waktuKirim: new Date(waktuKirim) } : {}),
        },
      })

      if (batchId && batchId !== existing.batchId) {
        const remainingOldBatchDistributions = await tx.batchDistribution.count({
          where: {
            batchId: existing.batchId,
            id: { not: updated.id },
          },
        })

        if (remainingOldBatchDistributions === 0) {
          await tx.batchProduksi.update({
            where: { id: existing.batchId },
            data: { status: "DIPRODUKSI" },
          })
        }
      }

      if (driverId) {
        await tx.batchProduksi.update({
          where: { id: updated.batchId },
          data: { driverId, status: "TERKIRIM" },
        })
      } else if (batchId) {
        await tx.batchProduksi.update({
          where: { id: updated.batchId },
          data: { status: "TERKIRIM" },
        })
      }

      if (validSchools) {
        await tx.batchDistributionSchool.deleteMany({
          where: { distributionId: updated.id },
        })
        await tx.batchDistributionSchool.createMany({
          data: validSchools.map((item) => ({
            distributionId: updated.id,
            schoolId: item.schoolId as string,
            jumlahPorsi: Number(item.jumlahPorsi),
          })),
        })
      }

      return tx.batchDistribution.findUniqueOrThrow({
        where: { id: updated.id },
        include: {
          batch: {
            include: {
              driver: true,
              menu: true,
            },
          },
          schools: {
            include: {
              school: {
                select: {
                  id: true,
                  name: true,
                  npsn: true,
                  address: true,
                },
              },
            },
          },
        },
      })
    })

    return res.json({ distribution: toDistributionResponse(distribution) })
  } catch (error) {
    next(error)
  }
})

productionDistributionsRouter.delete("/:id", async (req, res, next) => {
  try {
    const auth = await requireSppgOrSuperAdmin(req)

    if ("status" in auth) {
      return res.status(auth.status).json({ message: auth.message })
    }

    const distribution = await prisma.batchDistribution.findUnique({
      where: { id: req.params.id },
      include: { schools: true },
    })

    if (!distribution) {
      return res.status(404).json({ message: "Distribusi tidak ditemukan." })
    }

    await prisma.batchDistribution.delete({
      where: { id: req.params.id },
    })

    const remainingDistributions = await prisma.batchDistribution.count({
      where: { batchId: distribution.batchId },
    })

    if (remainingDistributions === 0) {
      await prisma.batchProduksi.update({
        where: { id: distribution.batchId },
        data: { status: "DIPRODUKSI" },
      })
    }

    return res.status(204).send()
  } catch (error) {
    next(error)
  }
})

export const schoolDistributionsRouter = Router()

async function getCurrentSchoolId(user: {
  id: string
  role: UserRole | string
  username: string
}) {
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

function toSchoolDistributionResponse(item: any) {
  return {
    id: item.id,
    jumlahPorsi: item.jumlahPorsi,
    status: item.status,
    receivedAt: item.receivedAt?.toISOString() ?? null,
    rejectedReason: item.rejectedReason,
    distribution: {
      id: item.distribution.id,
      waktuKirim: item.distribution.waktuKirim?.toISOString() ?? null,
      status: item.distribution.status,
    },
    batch: {
      id: item.distribution.batch.id,
      totalPorsi: item.distribution.batch.totalPorsi,
      status: item.distribution.batch.status,
      menu: item.distribution.batch.menu,
      driver: item.distribution.batch.driver,
      foto: item.distribution.batch.foto,
    },
  }
}

schoolDistributionsRouter.get("/", async (req, res, next) => {
  try {
    const currentUser = await getCurrentUser(req)

    if (!currentUser) {
      return res.status(401).json({ message: "Token tidak ditemukan atau tidak valid." })
    }

    const schoolId = await getCurrentSchoolId(currentUser)

    if (currentUser.role !== "SEKOLAH" || !schoolId) {
      return res.status(403).json({
        message: "Hanya akun sekolah yang dapat melihat distribusi sekolah.",
      })
    }

    const distributions = await prisma.batchDistributionSchool.findMany({
      where: { schoolId },
      include: {
        distribution: {
          include: {
            batch: {
              include: {
                driver: true,
                foto: true,
                menu: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return res.json({
      distributions: distributions.map(toSchoolDistributionResponse),
    })
  } catch (error) {
    next(error)
  }
})

schoolDistributionsRouter.patch("/:id/status", async (req, res, next) => {
  try {
    const currentUser = await getCurrentUser(req)

    if (!currentUser) {
      return res.status(401).json({ message: "Token tidak ditemukan atau tidak valid." })
    }

    const schoolId = await getCurrentSchoolId(currentUser)

    if (currentUser.role !== "SEKOLAH" || !schoolId) {
      return res.status(403).json({
        message: "Hanya akun sekolah yang dapat memvalidasi distribusi.",
      })
    }

    const { rejectedReason, status } = req.body as {
      rejectedReason?: string
      status?: string
    }

    if (
      status !== BatchDistributionSchoolStatus.DITERIMA &&
      status !== BatchDistributionSchoolStatus.DITOLAK
    ) {
      return res.status(400).json({ message: "Status validasi tidak valid." })
    }

    const normalizedReason = rejectedReason?.trim()

    if (status === "DITOLAK" && !normalizedReason) {
      return res.status(400).json({ message: "Alasan penolakan wajib diisi." })
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.batchDistributionSchool.updateMany({
        where: {
          id: req.params.id,
          schoolId,
        },
        data: {
          status,
          receivedAt: new Date(),
          rejectedReason: status === "DITOLAK" ? normalizedReason : null,
        },
      })

      const item = await tx.batchDistributionSchool.findFirstOrThrow({
        where: {
          id: req.params.id,
          schoolId,
        },
        include: {
          distribution: {
            include: {
              schools: true,
              batch: {
                include: {
                  driver: true,
                  foto: true,
                  menu: true,
                },
              },
            },
          },
        },
      })

      const statuses = item.distribution.schools.map((school) =>
        school.id === item.id ? status : school.status
      )
      const nextDistributionStatus = statuses.includes("DITOLAK")
        ? "BERMASALAH"
        : statuses.every((value) => value === "DITERIMA")
          ? "SELESAI"
          : item.distribution.status

      if (nextDistributionStatus !== item.distribution.status) {
        await tx.batchDistribution.update({
          where: { id: item.distribution.id },
          data: { status: nextDistributionStatus },
        })
      }

      await tx.schoolProgress.updateMany({
        where: { schoolId },
        data: { status: status === "DITERIMA" ? "DITERIMA" : "BERMASALAH" },
      })

      return tx.batchDistributionSchool.findUniqueOrThrow({
        where: { id: item.id },
        include: {
          distribution: {
            include: {
              batch: {
                include: {
                  driver: true,
                  foto: true,
                  menu: true,
                },
              },
            },
          },
        },
      })
    })

    return res.json({ distribution: toSchoolDistributionResponse(updated) })
  } catch (error) {
    next(error)
  }
})
