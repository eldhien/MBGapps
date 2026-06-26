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

function isUuid(value?: string | null) {
  return Boolean(
    value?.match(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i
    )
  )
}

async function getReporterSchoolId(user: {
  id: string
  role: string
  schoolId?: string | null
  username: string
}) {
  if (user.role !== "SEKOLAH") {
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

async function resolveReporterSchools<T extends { sekolahId: string }>(
  reports: T[]
) {
  const reporterIds = [...new Set(reports.map((report) => report.sekolahId))]
  const uuidReporterIds = reporterIds.filter(isUuid)
  const schoolAccounts = uuidReporterIds.length
    ? await prisma.user.findMany({
        where: {
          role: "SEKOLAH",
          OR: [
            { id: { in: uuidReporterIds } },
            { schoolId: { in: uuidReporterIds } },
          ],
        },
        select: { id: true, schoolId: true, username: true },
      })
    : []
  const accountByUserId = new Map(
    schoolAccounts.map((account) => [account.id, account])
  )
  const accountBySchoolId = new Map(
    schoolAccounts
      .filter((account) => account.schoolId)
      .map((account) => [account.schoolId as string, account])
  )

  return reports.map((report) => ({
    ...report,
    sekolahId:
      accountByUserId.get(report.sekolahId)?.schoolId ?? report.sekolahId,
    sekolahUsername:
      accountBySchoolId.get(report.sekolahId)?.username ??
      accountByUserId.get(report.sekolahId)?.username ??
      report.sekolahId,
  }))
}

foodReportsRouter.get("/", async (req, res, next) => {
  try {
    const currentUser = await getCurrentUser(req)

    if (!currentUser) {
      return res.status(401).json({ message: "Tidak terautentikasi." })
    }

    const reporterSchoolId = await getReporterSchoolId(currentUser)
    const schoolFilter =
      currentUser.role === "SEKOLAH"
        ? { sekolahId: { in: [currentUser.id, reporterSchoolId].filter(Boolean) as string[] } }
        : {}

    const reports = await prisma.foodReport.findMany({
      where: schoolFilter,
      orderBy: { createdAt: "desc" },
    })
    res.json({ data: await resolveReporterSchools(reports) })
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

    const { kategori, kategoriLainnya, deskripsi, sekolahId, batchId } =
      req.body as {
      kategori?: string
      kategoriLainnya?: string
      deskripsi?: string
      sekolahId?: string
      batchId?: string
    }
    const normalizedDescription = deskripsi?.trim()
    const normalizedOtherCategory =
      kategori === "LAINNYA" ? kategoriLainnya?.trim() || null : null
    const reporterSchoolId = await getReporterSchoolId(currentUser)
    const resolvedSekolahId =
      currentUser.role === "SEKOLAH"
        ? reporterSchoolId
        : sekolahId?.trim() || currentUser.id

    if (!kategori || !normalizedDescription || !resolvedSekolahId) {
      return res.status(400).json({ message: "Data laporan tidak lengkap." })
    }

    if (!reportCategories.has(kategori)) {
      return res.status(400).json({ message: "Kategori laporan tidak valid." })
    }

    if (kategori === "LAINNYA" && !normalizedOtherCategory) {
      return res
        .status(400)
        .json({ message: "Kategori lainnya wajib diisi." })
    }

    const report = await prisma.foodReport.create({
      data: {
        kategori: kategori as ReportCategory,
        kategoriLainnya: normalizedOtherCategory,
        deskripsi: normalizedDescription,
        sekolahId: resolvedSekolahId,
        batchId: batchId?.trim() || undefined,
        status: "PENDING",
      },
    })

    res.status(201).json({ data: (await resolveReporterSchools([report]))[0] })
  } catch (error) {
    const currentUser = await getCurrentUser(req)

    if (!currentUser) {
      return res.status(401).json({ message: "Tidak terautentikasi." })
    }

    const { kategori, kategoriLainnya, deskripsi, sekolahId, batchId } =
      req.body as {
      kategori?: string
      kategoriLainnya?: string
      deskripsi?: string
      sekolahId?: string
      batchId?: string
    }
    const normalizedDescription = deskripsi?.trim()
    const normalizedOtherCategory =
      kategori === "LAINNYA" ? kategoriLainnya?.trim() || null : null
    const reporterSchoolId = await getReporterSchoolId(currentUser)
    const resolvedSekolahId =
      currentUser.role === "SEKOLAH"
        ? reporterSchoolId
        : sekolahId?.trim() || currentUser.id

    if (!kategori || !normalizedDescription || !resolvedSekolahId) {
      return res.status(400).json({ message: "Data laporan tidak lengkap." })
    }

    if (!reportCategories.has(kategori)) {
      return res.status(400).json({ message: "Kategori laporan tidak valid." })
    }

    if (kategori === "LAINNYA" && !normalizedOtherCategory) {
      return res
        .status(400)
        .json({ message: "Kategori lainnya wajib diisi." })
    }

    const report = createFallbackFoodReport({
      kategori: kategori as ReportCategory,
      kategoriLainnya: normalizedOtherCategory,
      deskripsi: normalizedDescription,
      sekolahId: resolvedSekolahId,
      batchId: batchId?.trim() || null,
    })

    res.status(201).json({ data: (await resolveReporterSchools([report]))[0] })
  }
})
