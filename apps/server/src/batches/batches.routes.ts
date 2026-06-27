import { Router } from "express"
import { LegacyBatchStatus, UserRole } from "@prisma/client"

import { getCurrentUser } from "../auth/session.js"
import { prisma } from "../lib/prisma.js"

export const batchesRouter = Router()
const batchStatuses = new Set<string>(Object.values(LegacyBatchStatus))

type RawSchoolBatch = {
  batch_id: string
  jumlah_porsi: number
  menu_name: string | null
  school_status: string
  waktu_produksi: Date
}

type RawBatchSummary = {
  batch_id: string
  jumlah_porsi: number
  menu_name: string | null
  status: string
  waktu_produksi: Date
}

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

      const rows = await prisma.$queryRaw<RawSchoolBatch[]>`
        SELECT DISTINCT ON (b.id)
          b.id::text AS batch_id,
          ds.jumlah_porsi,
          ds.status::text AS school_status,
          COALESCE(b."waktuMulai", b.created_at) AS waktu_produksi,
          m.name AS menu_name
        FROM "public"."batch_distribution_schools" ds
        JOIN "public"."batch_distributions" d
          ON d.id::text = ds.distribution_id::text
        JOIN "public"."batch_produksi" b
          ON b.id::text = d.batch_id::text
        LEFT JOIN "public"."menu_masters" m
          ON m.id::text = b."menuId"::text
        WHERE ds.school_id::text = ${schoolId}
        ORDER BY b.id, ds.updated_at DESC
      `

      return res.json({
        data: rows.map((row) => ({
          id: row.batch_id,
          batchIdUnik: row.batch_id,
          jumlahPorsi: row.jumlah_porsi,
          namaMenu: row.menu_name ?? "Menu tidak diketahui",
          waktuProduksi: row.waktu_produksi.toISOString(),
          status: row.school_status,
        })),
      })
    }

    const batches = await prisma.$queryRaw<RawBatchSummary[]>`
      SELECT
        b.id::text AS batch_id,
        b."totalPorsi" AS jumlah_porsi,
        b.status::text AS status,
        COALESCE(b."waktuMulai", b.created_at) AS waktu_produksi,
        m.name AS menu_name
      FROM "public"."batch_produksi" b
      LEFT JOIN "public"."menu_masters" m
        ON m.id::text = b."menuId"::text
      WHERE b.status::text IN ('DITERIMA', 'DITOLAK')
      ORDER BY b.created_at DESC
    `
    res.json({
      data: batches.map((batch) => ({
        id: batch.batch_id,
        batchIdUnik: batch.batch_id,
        namaMenu: batch.menu_name ?? "Menu tidak diketahui",
        jumlahPorsi: batch.jumlah_porsi,
        waktuProduksi: batch.waktu_produksi.toISOString(),
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
