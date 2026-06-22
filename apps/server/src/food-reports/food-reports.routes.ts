import { Router } from "express"
import { ReportCategory } from "@prisma/client"

import { getCurrentUser } from "../auth/session.js"
import {
  createFallbackFoodReport,
  listFallbackFoodReports,
} from "../lib/fallback-store.js"
import { prisma } from "../lib/prisma.js"
import { requireAuth } from "../middleware/auth.js"

export const foodReportsRouter = Router()
const reportCategories = new Set<string>(Object.values(ReportCategory))

foodReportsRouter.use(requireAuth)

foodReportsRouter.get("/", async (req, res, next) => {
  try {
    const currentUser = await getCurrentUser(req)

    if (!currentUser) {
      return res.status(401).json({ message: "Tidak terautentikasi." })
    }

    const reports = await prisma.foodReport.findMany({
      where: currentUser.role === "SEKOLAH" ? { sekolahId: currentUser.id } : {},
      orderBy: { createdAt: "desc" },
    })
    res.json({ data: reports })
  } catch (error) {
    const currentUser = await getCurrentUser(req)

    if (!currentUser) {
      return res.status(401).json({ message: "Tidak terautentikasi." })
    }

    res.json({
      data: listFallbackFoodReports(
        currentUser.role === "SEKOLAH" ? currentUser.id : undefined
      ),
    })
  }
})

foodReportsRouter.post("/", async (req, res, next) => {
  try {
    const currentUser = await getCurrentUser(req)

    if (!currentUser) {
      return res.status(401).json({ message: "Tidak terautentikasi." })
    }

    const { kategori, deskripsi, sekolahId, batchId } = req.body as {
      kategori?: string
      deskripsi?: string
      sekolahId?: string
      batchId?: string
    }
    const normalizedDescription = deskripsi?.trim()
    const resolvedSekolahId =
      currentUser.role === "SEKOLAH"
        ? currentUser.id
        : sekolahId?.trim() || currentUser.id

    if (!kategori || !normalizedDescription || !resolvedSekolahId) {
      return res.status(400).json({ message: "Data laporan tidak lengkap." })
    }

    if (!reportCategories.has(kategori)) {
      return res.status(400).json({ message: "Kategori laporan tidak valid." })
    }

    const report = await prisma.foodReport.create({
      data: {
        kategori: kategori as ReportCategory,
        deskripsi: normalizedDescription,
        sekolahId: resolvedSekolahId,
        batchId: batchId?.trim() || undefined,
        status: "PENDING",
      },
    })

    res.status(201).json({ data: report })
  } catch (error) {
    const currentUser = await getCurrentUser(req)

    if (!currentUser) {
      return res.status(401).json({ message: "Tidak terautentikasi." })
    }

    const { kategori, deskripsi, sekolahId, batchId } = req.body as {
      kategori?: string
      deskripsi?: string
      sekolahId?: string
      batchId?: string
    }
    const normalizedDescription = deskripsi?.trim()
    const resolvedSekolahId =
      currentUser.role === "SEKOLAH"
        ? currentUser.id
        : sekolahId?.trim() || currentUser.id

    if (!kategori || !normalizedDescription || !resolvedSekolahId) {
      return res.status(400).json({ message: "Data laporan tidak lengkap." })
    }

    if (!reportCategories.has(kategori)) {
      return res.status(400).json({ message: "Kategori laporan tidak valid." })
    }

    const report = createFallbackFoodReport({
      kategori: kategori as ReportCategory,
      deskripsi: normalizedDescription,
      sekolahId: resolvedSekolahId,
      batchId: batchId?.trim() || null,
    })

    res.status(201).json({ data: report })
  }
})
