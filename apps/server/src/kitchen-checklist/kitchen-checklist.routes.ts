import { Router } from "express"

import { getCurrentUser } from "../auth/session.js"
import {
  createFallbackKitchenChecklist,
  deleteFallbackKitchenChecklist,
  listFallbackKitchenChecklists,
  updateFallbackKitchenChecklist,
} from "../lib/fallback-store.js"
import { uploadImageToCloudinary } from "../lib/cloudinary.js"
import { prisma } from "../lib/prisma.js"
import { requireAuth } from "../middleware/auth.js"
import { getSppgOwnerId, isUuid } from "../lib/user-scope.js"

export const kitchenChecklistRouter = Router()

kitchenChecklistRouter.use(requireAuth)

function getWeekRange(date = new Date()) {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))

  const end = new Date(start)
  end.setDate(start.getDate() + 7)

  return { end, start }
}

function canManageKitchenChecklists(user: { role: string }) {
  return user.role === "SPPG" || user.role === "SUPER_ADMIN"
}

type KitchenChecklistRow = {
  id: string
  apdPhoto: string
  alatPhoto: string
  kebersihanPhoto: string
  kondisiDapur: string
  timestamp: Date
  createdAt: Date
  updatedAt: Date
}

async function getKitchenChecklistSppgId(user: {
  id: string
  role: string
  username: string
}) {
  if (user.role === "SUPER_ADMIN") {
    return null
  }

  if (user.role !== "SPPG") {
    return "__no_access__"
  }

  return (
    (await getSppgOwnerId(user, { createIfMissing: true })) ??
    "__invalid_sppg__"
  )
}

async function findKitchenChecklistForUser(id: string, sppgId: string | null) {
  const rows = sppgId
    ? await prisma.$queryRaw<KitchenChecklistRow[]>`
        SELECT
          id,
          apd_photo AS "apdPhoto",
          alat_photo AS "alatPhoto",
          kebersihan_photo AS "kebersihanPhoto",
          kondisi_dapur AS "kondisiDapur",
          timestamp,
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM "public"."kitchen_checklists"
        WHERE id = ${id} AND sppg_id::text = ${sppgId}
        LIMIT 1
      `
    : await prisma.$queryRaw<KitchenChecklistRow[]>`
        SELECT
          id,
          apd_photo AS "apdPhoto",
          alat_photo AS "alatPhoto",
          kebersihan_photo AS "kebersihanPhoto",
          kondisi_dapur AS "kondisiDapur",
          timestamp,
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM "public"."kitchen_checklists"
        WHERE id = ${id}
        LIMIT 1
      `

  return rows[0] ?? null
}

kitchenChecklistRouter.get("/", async (req, res, next) => {
  try {
    const currentUser = await getCurrentUser(req)

    if (!currentUser) {
      return res.status(401).json({ message: "Tidak terautentikasi." })
    }

    if (!canManageKitchenChecklists(currentUser)) {
      return res.status(403).json({
        message: "Hanya SPPG atau Super Admin yang dapat melihat laporan kebersihan.",
      })
    }

    const sppgId = await getKitchenChecklistSppgId(currentUser)
    const checklists = sppgId
      ? await prisma.$queryRaw<KitchenChecklistRow[]>`
          SELECT
            id,
            apd_photo AS "apdPhoto",
            alat_photo AS "alatPhoto",
            kebersihan_photo AS "kebersihanPhoto",
            kondisi_dapur AS "kondisiDapur",
            timestamp,
            created_at AS "createdAt",
            updated_at AS "updatedAt"
          FROM "public"."kitchen_checklists"
          WHERE sppg_id::text = ${sppgId}
          ORDER BY created_at DESC
        `
      : await prisma.kitchenChecklist.findMany({
          orderBy: { createdAt: "desc" },
        })
    res.json({ data: checklists })
  } catch (error) {
    const currentUser = await getCurrentUser(req)

    if (!currentUser) {
      return res.status(401).json({ message: "Tidak terautentikasi." })
    }

    if (!canManageKitchenChecklists(currentUser)) {
      return res.status(403).json({
        message: "Hanya SPPG atau Super Admin yang dapat mengunggah foto kebersihan.",
      })
    }

    res.json({ data: listFallbackKitchenChecklists() })
  }
})

kitchenChecklistRouter.post("/photos", async (req, res, next) => {
  try {
    const currentUser = await getCurrentUser(req)

    if (!currentUser) {
      return res.status(401).json({ message: "Tidak terautentikasi." })
    }

    if (!canManageKitchenChecklists(currentUser)) {
      return res.status(403).json({
        message: "Hanya SPPG atau Super Admin yang dapat membuat laporan kebersihan.",
      })
    }

    const { photo, field } = req.body as {
      field?: string
      photo?: string
    }

    if (!photo?.startsWith("data:image/")) {
      return res.status(400).json({ message: "File foto tidak valid." })
    }

    const safeField = field?.replace(/[^a-z0-9_-]/gi, "") || "photo"
    const upload = await uploadImageToCloudinary({
      file: photo,
      folder: `mbg/cleanliness-reports/${currentUser.id}/${safeField}`,
    })

    res.status(201).json({ data: upload })
  } catch (error) {
    res.status(500).json({
      message:
        error instanceof Error ? error.message : "Foto belum bisa disimpan. Coba lagi.",
    })
  }
})

kitchenChecklistRouter.post("/", async (req, res, next) => {
  try {
    const currentUser = await getCurrentUser(req)

    if (!currentUser) {
      return res.status(401).json({ message: "Tidak terautentikasi." })
    }

    if (!canManageKitchenChecklists(currentUser)) {
      return res.status(403).json({
        message: "Hanya SPPG atau Super Admin yang dapat mengubah laporan kebersihan.",
      })
    }

    const {
      apdPhoto,
      alatPhoto,
      kebersihanPhoto,
      kondisiDapur,
    } =
      req.body as {
        apdPhoto?: string
        alatPhoto?: string
        kebersihanPhoto?: string
        kondisiDapur?: string
      }
    const normalizedCondition = kondisiDapur?.trim()
    const checklistTimestamp = new Date()
    const currentWeek = getWeekRange(checklistTimestamp)

    if (
      !apdPhoto?.trim() ||
      !alatPhoto?.trim() ||
      !kebersihanPhoto?.trim() ||
      !normalizedCondition
    ) {
      return res
        .status(400)
        .json({ message: "Data laporan kebersihan tidak lengkap." })
    }

    const sppgId = await getKitchenChecklistSppgId(currentUser)
    const existingWeeklyReport = sppgId
      ? await prisma.$queryRaw<{ id: string }[]>`
          SELECT id
          FROM "public"."kitchen_checklists"
          WHERE sppg_id::text = ${sppgId}
            AND timestamp >= ${currentWeek.start}
            AND timestamp < ${currentWeek.end}
          LIMIT 1
        `
      : await prisma.kitchenChecklist.findMany({
          where: {
            timestamp: {
              gte: currentWeek.start,
              lt: currentWeek.end,
            },
          },
          take: 1,
        })

    if (existingWeeklyReport.length > 0) {
      return res.status(409).json({
        message:
          "Laporan kebersihan minggu ini sudah dibuat. Perubahan hanya bisa dilakukan melalui riwayat.",
      })
    }

    const checklist = await prisma.kitchenChecklist.create({
      data: {
        apdPhoto: apdPhoto.trim(),
        alatPhoto: alatPhoto.trim(),
        kebersihanPhoto: kebersihanPhoto.trim(),
        kondisiDapur: normalizedCondition,
        timestamp: checklistTimestamp,
      },
    })

    if (sppgId && isUuid(sppgId)) {
      await prisma.$executeRaw`
        UPDATE "public"."kitchen_checklists"
        SET sppg_id = ${sppgId}::uuid
        WHERE id = ${checklist.id}
      `
    }

    res.status(201).json({ data: checklist })
  } catch (error) {
    const currentUser = await getCurrentUser(req)

    if (!currentUser) {
      return res.status(401).json({ message: "Tidak terautentikasi." })
    }

    if (!canManageKitchenChecklists(currentUser)) {
      return res.status(403).json({
        message: "Hanya SPPG atau Super Admin yang dapat mengubah laporan kebersihan.",
      })
    }

    const {
      apdPhoto,
      alatPhoto,
      kebersihanPhoto,
      kondisiDapur,
    } =
      req.body as {
        apdPhoto?: string
        alatPhoto?: string
        kebersihanPhoto?: string
        kondisiDapur?: string
      }

    const normalizedCondition = kondisiDapur?.trim()
    const checklistTimestamp = new Date()
    const currentWeek = getWeekRange(checklistTimestamp)

    if (
      !apdPhoto?.trim() ||
      !alatPhoto?.trim() ||
      !kebersihanPhoto?.trim() ||
      !normalizedCondition
    ) {
      return res
        .status(400)
        .json({ message: "Data laporan kebersihan tidak lengkap." })
    }

    const existingWeeklyReport = listFallbackKitchenChecklists().some((item) => {
      const reportDate = new Date(item.timestamp)

      return reportDate >= currentWeek.start && reportDate < currentWeek.end
    })

    if (existingWeeklyReport) {
      return res.status(409).json({
        message:
          "Laporan kebersihan minggu ini sudah dibuat. Perubahan hanya bisa dilakukan melalui riwayat.",
      })
    }

    const checklist = createFallbackKitchenChecklist({
      apdPhoto: apdPhoto.trim(),
      alatPhoto: alatPhoto.trim(),
      kebersihanPhoto: kebersihanPhoto.trim(),
      kondisiDapur: normalizedCondition,
      timestamp: checklistTimestamp,
    })

    res.status(201).json({ data: checklist })
  }
})

kitchenChecklistRouter.patch("/:id", async (req, res, next) => {
  try {
    const currentUser = await getCurrentUser(req)

    if (!currentUser) {
      return res.status(401).json({ message: "Tidak terautentikasi." })
    }

    if (!canManageKitchenChecklists(currentUser)) {
      return res.status(403).json({
        message: "Hanya SPPG atau Super Admin yang dapat menghapus laporan kebersihan.",
      })
    }

    const { apdPhoto, alatPhoto, kebersihanPhoto, kondisiDapur } =
      req.body as {
        apdPhoto?: string
        alatPhoto?: string
        kebersihanPhoto?: string
        kondisiDapur?: string
      }
    const normalizedCondition = kondisiDapur?.trim()

    if (
      !apdPhoto?.trim() ||
      !alatPhoto?.trim() ||
      !kebersihanPhoto?.trim() ||
      !normalizedCondition
    ) {
      return res
        .status(400)
        .json({ message: "Data laporan kebersihan tidak lengkap." })
    }

    const sppgId = await getKitchenChecklistSppgId(currentUser)
    const existingReport = await findKitchenChecklistForUser(
      req.params.id,
      sppgId
    )

    if (!existingReport) {
      return res
        .status(404)
        .json({ message: "Laporan kebersihan tidak ditemukan." })
    }

    const checklist = await prisma.kitchenChecklist.update({
      where: { id: existingReport.id },
      data: {
        apdPhoto: apdPhoto.trim(),
        alatPhoto: alatPhoto.trim(),
        kebersihanPhoto: kebersihanPhoto.trim(),
        kondisiDapur: normalizedCondition,
      },
    })

    res.json({ data: checklist })
  } catch (error) {
    const currentUser = await getCurrentUser(req)

    if (!currentUser) {
      return res.status(401).json({ message: "Tidak terautentikasi." })
    }

    const { apdPhoto, alatPhoto, kebersihanPhoto, kondisiDapur } =
      req.body as {
        apdPhoto?: string
        alatPhoto?: string
        kebersihanPhoto?: string
        kondisiDapur?: string
      }
    const normalizedCondition = kondisiDapur?.trim()

    if (
      !apdPhoto?.trim() ||
      !alatPhoto?.trim() ||
      !kebersihanPhoto?.trim() ||
      !normalizedCondition
    ) {
      return res
        .status(400)
        .json({ message: "Data laporan kebersihan tidak lengkap." })
    }

    const checklist = updateFallbackKitchenChecklist(
      req.params.id,
      {
        apdPhoto: apdPhoto.trim(),
        alatPhoto: alatPhoto.trim(),
        kebersihanPhoto: kebersihanPhoto.trim(),
        kondisiDapur: normalizedCondition,
      }
    )

    if (!checklist) {
      return res
        .status(404)
        .json({ message: "Laporan kebersihan tidak ditemukan." })
    }

    res.json({ data: checklist })
  }
})

kitchenChecklistRouter.delete("/:id", async (req, res, next) => {
  try {
    const currentUser = await getCurrentUser(req)

    if (!currentUser) {
      return res.status(401).json({ message: "Tidak terautentikasi." })
    }

    const sppgId = await getKitchenChecklistSppgId(currentUser)
    const existingReport = await findKitchenChecklistForUser(
      req.params.id,
      sppgId
    )

    if (!existingReport) {
      return res
        .status(404)
        .json({ message: "Laporan kebersihan tidak ditemukan." })
    }

    await prisma.kitchenChecklist.delete({
      where: { id: existingReport.id },
    })

    res.status(204).send()
  } catch (error) {
    const currentUser = await getCurrentUser(req)

    if (!currentUser) {
      return res.status(401).json({ message: "Tidak terautentikasi." })
    }

    const deleted = deleteFallbackKitchenChecklist(req.params.id)

    if (!deleted) {
      return res
        .status(404)
        .json({ message: "Laporan kebersihan tidak ditemukan." })
    }

    res.status(204).send()
  }
})
