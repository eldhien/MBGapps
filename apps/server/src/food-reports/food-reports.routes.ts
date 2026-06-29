import { Router } from "express"
import { ReportCategory } from "@prisma/client"

import { getCurrentUser } from "../auth/session.js"
import {
  createFallbackFoodReport,
  listFallbackFoodReports,
} from "../lib/fallback-store.js"
import { prisma } from "../lib/prisma.js"
import { requireAuth } from "../middleware/auth.js"
import {
  getManagedSchoolReportIds,
  getReporterSchoolId,
  getSppgOwnerId,
  isUuid,
} from "../lib/user-scope.js"

export const foodReportsRouter = Router()
const reportCategories = new Set<string>(Object.values(ReportCategory))

foodReportsRouter.use(requireAuth)

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

async function getReportSchoolFilter(currentUser: {
  id: string
  role: string
  username: string
}) {
  const reporterSchoolId = await getReporterSchoolId(currentUser)

  if (currentUser.role === "SEKOLAH") {
    return {
      sekolahId: {
        in: [currentUser.id, reporterSchoolId].filter(Boolean) as string[],
      },
    }
  }

  if (currentUser.role === "SPPG") {
    const sppgOwnerId = await getSppgOwnerId(currentUser, {
      createIfMissing: true,
    })
    const schoolReporterIds = await getManagedSchoolReportIds(sppgOwnerId)

    return {
      sekolahId: {
        in: schoolReporterIds.length
          ? schoolReporterIds
          : ["__no_managed_school__"],
      },
    }
  }

  return {}
}

function getFallbackSchoolIds(
  filter: Awaited<ReturnType<typeof getReportSchoolFilter>>
) {
  return "sekolahId" in filter ? filter.sekolahId?.in : undefined
}

foodReportsRouter.get("/", async (req, res, next) => {
  try {
    const currentUser = await getCurrentUser(req)

    if (!currentUser) {
      return res.status(401).json({ message: "Tidak terautentikasi." })
    }

    const schoolFilter = await getReportSchoolFilter(currentUser)

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

    const fallbackFilter = await getReportSchoolFilter(currentUser)
    const fallbackSchoolIds = getFallbackSchoolIds(fallbackFilter)

    res.json({
      data: listFallbackFoodReports().filter((report) =>
        fallbackSchoolIds ? fallbackSchoolIds.includes(report.sekolahId) : true
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
