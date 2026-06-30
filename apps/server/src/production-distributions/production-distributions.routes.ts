import { BatchDistributionStatus, UserRole, type Prisma } from "@prisma/client"
import { Router } from "express"

import { prisma } from "../lib/prisma.js"
import { getSppgOwnerId, requireRoles } from "../lib/user-scope.js"

export const productionDistributionsRouter = Router()

const JAKARTA_UTC_OFFSET = "+07:00"
const HAS_TIME_ZONE_SUFFIX = /(?:z|[+-]\d{2}:?\d{2})$/i

type DistributionWithRelations = Prisma.BatchDistributionGetPayload<{
  include: {
    batch: {
      include: {
        driver: true
        menu: true
      }
    }
    schools: {
      include: {
        school: {
          select: {
            address: true
            id: true
            name: true
            npsn: true
          }
        }
      }
    }
  }
}>

type DistributionResponse = {
  batch: {
    driver: DistributionWithRelations["batch"]["driver"]
    id: string
    menu: DistributionWithRelations["batch"]["menu"]
    status: string
    totalPorsi: number
  } | null
  batchId: string
  createdAt: string
  id: string
  schools: {
    id: string
    jumlahPorsi: number
    receivedAt: string | null
    rejectedReason: string | null
    school: DistributionWithRelations["schools"][number]["school"]
    status: string
  }[]
  status: string
  waktuKirim: string | null
}

function parseDistributionDate(value?: string | null) {
  if (!value) {
    return new Date()
  }

  const normalizedValue = value.trim()
  const date = new Date(
    HAS_TIME_ZONE_SUFFIX.test(normalizedValue)
      ? normalizedValue
      : `${normalizedValue}${JAKARTA_UTC_OFFSET}`
  )

  return Number.isNaN(date.getTime()) ? new Date() : date
}

function toDistributionResponse(
  distribution: DistributionWithRelations
): DistributionResponse {
  const schools = distribution.schools.map((item) => ({
    id: item.id,
    jumlahPorsi: item.jumlahPorsi,
    status: item.status,
    receivedAt: item.receivedAt?.toISOString() ?? null,
    rejectedReason: item.rejectedReason,
    school: item.school,
  }))
  const normalizedStatus = schools.some((item) => item.status === "DITOLAK")
    ? "DITOLAK"
    : distribution.status

  return {
    id: distribution.id,
    batchId: distribution.batchId,
    waktuKirim: distribution.waktuKirim?.toISOString() ?? null,
    status: normalizedStatus,
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
    schools,
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
  const map = new Map<
    string,
    Omit<DistributionResponse, "batch"> & {
      batch: {
        driver: {
          id: string
          name: string | null
          phone: string | null
          vehicleNumber: string | null
        } | null
        id: string
        menu: {
          category: string | null
          id: string
          name: string | null
        } | null
        status: string | null
        totalPorsi: number | null
      }
    }
  >()

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

    const distribution = map.get(row.id)
    if (row.school_item_id && distribution) {
      distribution.schools.push({
        id: row.school_item_id,
        jumlahPorsi: row.jumlah_porsi ?? 0,
        status: row.school_item_status ?? "MENUNGGU",
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

  return [...map.values()].map((distribution) => ({
    ...distribution,
    status: distribution.schools.some((item) => item.status === "DITOLAK")
      ? "DITOLAK"
      : distribution.status,
  }))
}

async function getAllocatedBatchPortions(
  batchId: string,
  excludeDistributionId?: string
) {
  const result = await prisma.batchDistributionSchool.aggregate({
    where: {
      distribution: {
        batchId,
        ...(excludeDistributionId ? { id: { not: excludeDistributionId } } : {}),
      },
    },
    _sum: {
      jumlahPorsi: true,
    },
  })

  return Number(result._sum.jumlahPorsi ?? 0)
}

function getRequestedPortions(schools: { jumlahPorsi?: number }[]) {
  return schools.reduce(
    (total, item) => total + Number(item.jumlahPorsi ?? 0),
    0
  )
}

async function findProductionDistributionsForUser(user: {
  id: string
  role: string
  username: string
}) {
  const sppgFilter =
    user.role === UserRole.SPPG
      ? await getSppgOwnerId(user, { createIfMissing: true })
      : null

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

async function getDistributionOwnerSppgId(user: {
  id: string
  role: string
  username: string
}) {
  if (user.role !== UserRole.SPPG) {
    return null
  }

  return getSppgOwnerId(user, { createIfMissing: true })
}

async function findActiveDriverForUser(
  driverId: string,
  user: {
    id: string
    role: string
    username: string
  },
  ownerSppgId: string | null
) {
  return prisma.driver.findFirst({
    where: {
      id: driverId,
      isActive: true,
      ...(user.role === UserRole.SPPG ? { sppgId: ownerSppgId as string } : {}),
    },
    select: { id: true },
  })
}

async function findBatchForDistributionUser(
  batchId: string,
  user: {
    id: string
    role: string
    username: string
  },
  ownerSppgId: string | null
) {
  return prisma.batchProduksi.findFirst({
    where: {
      id: batchId,
      ...(user.role === UserRole.SPPG ? { petugasId: ownerSppgId as string } : {}),
    },
    select: { id: true, totalPorsi: true },
  })
}

productionDistributionsRouter.get("/", async (req, res, next) => {
  try {
    const auth = await requireRoles(
      req,
      ["SUPER_ADMIN", "SPPG"],
      "Hanya SPPG atau Super Admin yang dapat mengelola distribusi."
    )

    if ("status" in auth) {
      return res.status(auth.status).json({ message: auth.message })
    }

    await prisma.$executeRawUnsafe(`
      UPDATE "public"."batch_distributions" d
      SET status = 'DITOLAK'::"public"."BatchDistributionStatus"
      WHERE d.status = 'BERMASALAH'::"public"."BatchDistributionStatus"
        AND EXISTS (
          SELECT 1
          FROM "public"."batch_distribution_schools" ds
          WHERE ds.distribution_id = d.id
            AND ds.status = 'DITOLAK'::"public"."BatchDistributionSchoolStatus"
        )
    `)

    const distributions = await findProductionDistributionsForUser(auth.currentUser)

    return res.json({ distributions: toRawDistributionResponses(distributions) })
  } catch (error) {
    next(error)
  }
})
productionDistributionsRouter.post("/", async (req, res, next) => {
  try {
    const auth = await requireRoles(
      req,
      ["SUPER_ADMIN", "SPPG"],
      "Hanya SPPG atau Super Admin yang dapat mengelola distribusi."
    )

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

    const ownerSppgId = await getDistributionOwnerSppgId(auth.currentUser)

    if (auth.currentUser.role === UserRole.SPPG && !ownerSppgId) {
      return res.status(400).json({
        message: "Akun SPPG tidak valid. Silakan login ulang.",
      })
    }

    const batch = await findBatchForDistributionUser(
      batchId,
      auth.currentUser,
      ownerSppgId
    )

    if (!batch) {
      return res.status(404).json({ message: "Batch tidak ditemukan." })
    }

    const requestedPortions = getRequestedPortions(validSchools)
    const allocatedPortions = await getAllocatedBatchPortions(batchId)
    const availablePortions = Number(batch.totalPorsi ?? 0) - allocatedPortions

    if (requestedPortions > availablePortions) {
      return res.status(400).json({
        message: `Total porsi distribusi (${requestedPortions}) melebihi sisa stok batch (${availablePortions}). Stok awal batch ${Number(batch.totalPorsi ?? 0)} porsi.`,
      })
    }

    const driver = await findActiveDriverForUser(
      driverId,
      auth.currentUser,
      ownerSppgId
    )

    if (!driver) {
      return res.status(400).json({ message: "Driver tidak valid atau tidak aktif untuk SPPG ini." })
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
          waktuKirim: parseDistributionDate(waktuKirim),
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
    const auth = await requireRoles(
      req,
      ["SUPER_ADMIN", "SPPG"],
      "Hanya SPPG atau Super Admin yang dapat mengelola distribusi."
    )

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
      const ownerSppgId = await getDistributionOwnerSppgId(auth.currentUser)

      if (auth.currentUser.role === UserRole.SPPG && !ownerSppgId) {
        return res.status(400).json({
          message: "Akun SPPG tidak valid. Silakan login ulang.",
        })
      }

      const driver = await findActiveDriverForUser(
        driverId,
        auth.currentUser,
        ownerSppgId
      )

      if (!driver) {
        return res.status(400).json({ message: "Driver tidak valid atau tidak aktif untuk SPPG ini." })
      }
    }

    if (batchId) {
      const ownerSppgId = await getDistributionOwnerSppgId(auth.currentUser)

      if (auth.currentUser.role === UserRole.SPPG && !ownerSppgId) {
        return res.status(400).json({
          message: "Akun SPPG tidak valid. Silakan login ulang.",
        })
      }

      const batch = await findBatchForDistributionUser(
        batchId,
        auth.currentUser,
        ownerSppgId
      )

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
          ? await getSppgOwnerId(auth.currentUser, { createIfMissing: true })
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

      const effectiveBatchId = batchId ?? existing.batchId
      const batchForStock = await prisma.batchProduksi.findUnique({
        where: { id: effectiveBatchId },
        select: { id: true, totalPorsi: true },
      })

      if (!batchForStock) {
        return res.status(404).json({ message: "Batch tidak ditemukan." })
      }

      const requestedPortions = getRequestedPortions(validSchools)
      const allocatedPortions = await getAllocatedBatchPortions(
        effectiveBatchId,
        existing.id
      )
      const availablePortions =
        Number(batchForStock.totalPorsi ?? 0) - allocatedPortions

      if (requestedPortions > availablePortions) {
        return res.status(400).json({
          message: `Total porsi distribusi (${requestedPortions}) melebihi sisa stok batch (${availablePortions}). Stok awal batch ${Number(batchForStock.totalPorsi ?? 0)} porsi.`,
        })
      }
    }

    const distribution = await prisma.$transaction(async (tx) => {
      const updated = await tx.batchDistribution.update({
        where: { id: req.params.id },
        data: {
          ...(batchId ? { batchId } : {}),
          ...(status ? { status: status as BatchDistributionStatus } : {}),
          ...(waktuKirim ? { waktuKirim: parseDistributionDate(waktuKirim) } : {}),
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
    const auth = await requireRoles(
      req,
      ["SUPER_ADMIN", "SPPG"],
      "Hanya SPPG atau Super Admin yang dapat mengelola distribusi."
    )

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
