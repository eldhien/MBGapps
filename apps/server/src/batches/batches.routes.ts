import { Router } from "express"
import { LegacyBatchStatus, UserRole } from "@prisma/client"

import { getCurrentUser } from "../auth/session.js"
import { prisma } from "../lib/prisma.js"

export const batchesRouter = Router()
const batchStatuses = new Set<string>(Object.values(LegacyBatchStatus))

function isUuid(value?: string | null) {
  return Boolean(
    value?.match(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    )
  )
}

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

batchesRouter.get("/", async (req, res, next) => {
  try {
    const currentUser = await getCurrentUser(req)

    if (currentUser?.role === UserRole.SEKOLAH) {
      const schoolId = await getCurrentSchoolId(currentUser)

      if (!schoolId) {
        return res.json({ data: [] })
      }

      const rows = await prisma.batchDistributionSchool.findMany({
        where: {
          schoolId,
          status: { in: ["DITERIMA", "DITOLAK"] },
        },
        orderBy: { updatedAt: "desc" },
        include: {
          distribution: {
            include: {
              batch: {
                include: { menu: true },
              },
            },
          },
        },
      })

      return res.json({
        data: rows.map((row) => ({
          id: row.distribution.batch.id,
          batchIdUnik: row.distribution.batch.id,
          namaMenu: row.distribution.batch.menu.name,
          waktuProduksi:
            row.distribution.batch.waktuMulai?.toISOString() ??
            row.distribution.batch.createdAt.toISOString(),
          status: row.status,
        })),
      })
    }

    const batches = await prisma.batchProduksi.findMany({
      where: {
        status: { in: ["DITERIMA", "DITOLAK"] },
      },
      orderBy: { createdAt: "desc" },
      include: { menu: true },
    })
    res.json({
      data: batches.map((batch) => ({
        id: batch.id,
        batchIdUnik: batch.id,
        namaMenu: batch.menu.name,
        jumlahPorsi: batch.totalPorsi,
        waktuProduksi: batch.waktuMulai?.toISOString() ?? batch.createdAt.toISOString(),
        status: batch.status,
      })),
    })
  } catch (error) {
    res.json({ data: [] })
  }
})

batchesRouter.post("/", async (req, res, next) => {
  try {
    const { namaMenu, jumlahPorsi, komposisi, waktuProduksi, driverId, photoUrl, sppgId } =
      req.body as {
        namaMenu?: string
        jumlahPorsi?: number
        komposisi?: string
        waktuProduksi?: string
        driverId?: string
        photoUrl?: string
        sppgId?: string
      }

    if (!namaMenu || !jumlahPorsi || !komposisi || !waktuProduksi) {
      return res.status(400).json({ message: "Data batch tidak lengkap." })
    }

    const batchIdUnik = `MBG-${new Date(waktuProduksi).toISOString().slice(0, 10).replace(/-/g, "/")}-${Date.now().toString().slice(-6)}`

    const batch = await prisma.batch.create({
      data: {
        batchIdUnik,
        namaMenu,
        jumlahPorsi,
        komposisi,
        waktuProduksi: new Date(waktuProduksi),
        driverId,
        photoUrl,
        sppgId,
        status: "SCHEDULED",
      },
    })

    res.status(201).json({ data: batch })
  } catch (error) {
    next(error)
  }
})

batchesRouter.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params as { id: string }
    const { status } = req.body as { status?: LegacyBatchStatus }

    if (status && !batchStatuses.has(status)) {
      return res.status(400).json({ message: "Status batch tidak valid." })
    }

    const batch = await prisma.batch.update({
      where: { id },
      data: { status: status ?? undefined },
    })

    res.json({ data: batch })
  } catch (error) {
    next(error)
  }
})
