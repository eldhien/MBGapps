import { Router } from "express"
import { createHash } from "node:crypto"

import { getCurrentUser } from "../auth/session.js"
import { env } from "../config/env.js"
import {
  createFallbackKitchenChecklist,
  deleteFallbackKitchenChecklist,
  listFallbackKitchenChecklists,
  updateFallbackKitchenChecklist,
} from "../lib/fallback-store.js"
import { prisma } from "../lib/prisma.js"
import { requireAuth } from "../middleware/auth.js"

export const kitchenChecklistRouter = Router()

kitchenChecklistRouter.use(requireAuth)

type CloudinaryUploadResponse = {
  secure_url?: string
  public_id?: string
  error?: {
    message?: string
  }
}

function getCloudinarySignature(params: Record<string, string>) {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&")

  return createHash("sha1")
    .update(`${payload}${env.cloudinary?.apiSecret ?? ""}`)
    .digest("hex")
}

async function uploadPhotoToCloudinary(photo: string, folder: string) {
  if (!env.cloudinary) {
    throw new Error("Penyimpanan foto belum siap. Coba lagi nanti.")
  }

  const timestamp = Math.round(Date.now() / 1000).toString()
  const uploadParams = {
    folder,
    timestamp,
  }
  const formData = new FormData()

  formData.set("file", photo)
  formData.set("api_key", env.cloudinary.apiKey)
  formData.set("folder", folder)
  formData.set("timestamp", timestamp)
  formData.set("signature", getCloudinarySignature(uploadParams))

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${env.cloudinary.cloudName}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  )
  const payload = (await response.json()) as CloudinaryUploadResponse

  if (!response.ok || !payload.secure_url) {
    throw new Error(payload.error?.message ?? "Foto belum bisa disimpan. Coba lagi.")
  }

  return {
    publicId: payload.public_id ?? "",
    url: payload.secure_url,
  }
}

function getWeekRange(date = new Date()) {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))

  const end = new Date(start)
  end.setDate(start.getDate() + 7)

  return { end, start }
}

kitchenChecklistRouter.get("/", async (req, res, next) => {
  try {
    const currentUser = await getCurrentUser(req)

    if (!currentUser) {
      return res.status(401).json({ message: "Tidak terautentikasi." })
    }

    const checklists = await prisma.kitchenChecklist.findMany({
      orderBy: { createdAt: "desc" },
    })
    res.json({ data: checklists })
  } catch (error) {
    const currentUser = await getCurrentUser(req)

    if (!currentUser) {
      return res.status(401).json({ message: "Tidak terautentikasi." })
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

    const { photo, field } = req.body as {
      field?: string
      photo?: string
    }

    if (!photo?.startsWith("data:image/")) {
      return res.status(400).json({ message: "File foto tidak valid." })
    }

    const safeField = field?.replace(/[^a-z0-9_-]/gi, "") || "photo"
    const upload = await uploadPhotoToCloudinary(
      photo,
      `mbg/cleanliness-reports/${currentUser.id}/${safeField}`
    )

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

    const existingWeeklyReport = await prisma.kitchenChecklist.findFirst({
      where: {
        timestamp: {
          gte: currentWeek.start,
          lt: currentWeek.end,
        },
      },
    })

    if (existingWeeklyReport) {
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

    res.status(201).json({ data: checklist })
  } catch (error) {
    const currentUser = await getCurrentUser(req)

    if (!currentUser) {
      return res.status(401).json({ message: "Tidak terautentikasi." })
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

    const existingReport = await prisma.kitchenChecklist.findFirst({
      where: { id: req.params.id },
    })

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

    const existingReport = await prisma.kitchenChecklist.findFirst({
      where: { id: req.params.id },
    })

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
