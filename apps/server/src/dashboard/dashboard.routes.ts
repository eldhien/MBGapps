import { Router } from "express"

import { getCurrentUser } from "../auth/session.js"
import { getFallbackDashboardAnalytics } from "../lib/fallback-store.js"
import { requireAuth } from "../middlewares/auth.middleware.js"
import { prisma } from "../db/prisma.js"
import {
  getManagedSchoolReportIds,
  getReporterSchoolId,
  getSppgOwnerId,
  isUuid,
} from "../lib/user-scope.js"

export const dashboardRouter = Router()

dashboardRouter.use(requireAuth)

function getLastSevenDaysRange() {
  const now = new Date()
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)

  const start = new Date(end)
  start.setDate(start.getDate() - 6)
  start.setHours(0, 0, 0, 0)

  return { start, end }
}

function withCreatedAtRange(where: Record<string, unknown>, start: Date, end: Date) {
  return {
    AND: [
      where,
      {
        createdAt: {
          gte: start,
          lt: end,
        },
      },
    ],
  }
}

function buildDailyActivity(
  start: Date,
  end: Date,
  records: { createdAt: Date }[]
) {
  const days = Math.ceil((end.getTime() - start.getTime()) / 86_400_000)
  const counts = Array.from({ length: days }, (_, index) => ({
    label: String(new Date(start.getTime() + index * 86_400_000).getDate()),
    value: 0,
  }))

  records.forEach((record) => {
    const index = Math.floor(
      (record.createdAt.getTime() - start.getTime()) / 86_400_000
    )

    if (counts[index]) {
      counts[index].value += 1
    }
  })

  return counts
}

function formatMonitoringCode(prefix: string, date: Date) {
  return `${prefix}-${String(date.getDate()).padStart(2, "0")}${String(
    date.getMonth() + 1
  ).padStart(2, "0")}${date.getFullYear()}`
}

async function resolveFoodReportSchools<
  T extends { sekolahId: string; createdAt: Date; updatedAt: Date },
>(reports: T[]) {
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
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
  }))
}

async function getVisibleSchoolReportIds(user: {
  id: string
  role: string
  schoolId?: string | null
  username: string
}) {
  const reporterSchoolId = await getReporterSchoolId(user)
  const sppgOwnerId = await getSppgOwnerId(user)

  if (user.role === "SEKOLAH") {
    return [user.id, reporterSchoolId].filter(Boolean) as string[]
  }

  if (user.role === "SPPG") {
    return getManagedSchoolReportIds(sppgOwnerId)
  }

  return null
}

function getSchoolReportWhere(schoolReporterIds: string[] | null) {
  if (schoolReporterIds === null) {
    return {}
  }

  if (schoolReporterIds.length === 0) {
    return { id: "__no_report__" }
  }

  return { sekolahId: { in: schoolReporterIds } }
}

function toBatchSummary(batch: {
  createdAt: Date
  id: string
  menu: { name: string } | null
  status: string
  totalPorsi: number
  waktuMulai: Date | null
}) {
  return {
    id: batch.id,
    batchIdUnik: batch.id,
    jumlahPorsi: batch.totalPorsi,
    namaMenu: batch.menu?.name ?? "Menu tidak diketahui",
    status: batch.status,
    waktuProduksi: (batch.waktuMulai ?? batch.createdAt).toISOString(),
  }
}

dashboardRouter.get("/topbar", async (req, res) => {
  try {
    const currentUser = await getCurrentUser(req)

    if (!currentUser) {
      return res.status(401).json({ message: "Tidak terautentikasi." })
    }

    const reporterSchoolId = await getReporterSchoolId(currentUser)
    const sppgOwnerId = await getSppgOwnerId(currentUser)
    const schoolReporterIds = await getVisibleSchoolReportIds(currentUser)
    const reportWhere = getSchoolReportWhere(schoolReporterIds)
    const batchWhere =
      currentUser.role === "SEKOLAH"
        ? reporterSchoolId
          ? {
              distributions: {
                some: {
                  schools: {
                    some: {
                      schoolId: reporterSchoolId,
                    },
                  },
                },
              },
            }
          : { id: "__no_school__" }
        : currentUser.role === "SPPG"
          ? sppgOwnerId
            ? {
                OR: [
                  { petugasId: sppgOwnerId },
                  {
                    distributions: {
                      some: {
                        schools: {
                          some: {
                            school: {
                              sppgId: sppgOwnerId,
                            },
                          },
                        },
                      },
                    },
                  },
                ],
              }
            : { id: "__no_sppg__" }
          : {}

    const [foodReports, batches] = await Promise.all([
      prisma.foodReport.findMany({
        where: reportWhere,
        orderBy: { createdAt: "desc" },
        take: 12,
      }),
      prisma.batchProduksi.findMany({
        where: batchWhere,
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          id: true,
          totalPorsi: true,
          status: true,
          createdAt: true,
          waktuMulai: true,
          menu: { select: { name: true } },
        },
      }),
    ])

    res.json({
      data: {
        foodReports: await resolveFoodReportSchools(foodReports),
        batches: batches.map(toBatchSummary),
      },
    })
  } catch {
    res.json({
      data: {
        foodReports: [],
        batches: [],
      },
    })
  }
})

dashboardRouter.get("/analytics", async (req, res, next) => {
  try {
    const currentUser = await getCurrentUser(req)

    if (!currentUser) {
      return res.status(401).json({ message: "Tidak terautentikasi." })
    }

    const reporterSchoolId = await getReporterSchoolId(currentUser)
    const sppgOwnerId = await getSppgOwnerId(currentUser)
    const { start, end } = getLastSevenDaysRange()
    const schoolReporterIds = await getVisibleSchoolReportIds(currentUser)

    const distributionSchoolWhere =
      currentUser.role === "SEKOLAH"
        ? reporterSchoolId
          ? { schoolId: reporterSchoolId }
          : { id: "__no_school__" }
        : currentUser.role === "SPPG"
          ? sppgOwnerId
            ? { school: { sppgId: sppgOwnerId } }
            : { id: "__no_sppg__" }
          : {}

    const batchWhere =
      currentUser.role === "SEKOLAH"
        ? reporterSchoolId
          ? {
              distributions: {
                some: {
                  schools: {
                    some: {
                      schoolId: reporterSchoolId,
                    },
                  },
                },
              },
            }
          : { id: "__no_school__" }
        : currentUser.role === "SPPG"
          ? sppgOwnerId
            ? {
                OR: [
                  { petugasId: sppgOwnerId },
                  {
                    distributions: {
                      some: {
                        schools: {
                          some: {
                            school: {
                              sppgId: sppgOwnerId,
                            },
                          },
                        },
                      },
                    },
                  },
                ],
              }
            : { id: "__no_sppg__" }
          : {}

    const reportWhere = getSchoolReportWhere(schoolReporterIds)

    const batchDateWhere = withCreatedAtRange(batchWhere, start, end)
    const distributionDateWhere = withCreatedAtRange(
      distributionSchoolWhere,
      start,
      end
    )
    const reportDateWhere = withCreatedAtRange(reportWhere, start, end)

    const [
      totalBatches,
      totalDistributions,
      pendingDistributions,
      deliveredDistributions,
      totalFoodReports,
      totalStudentComplaints,
      batchActivity,
      distributionActivity,
      reportActivity,
      complaintActivity,
      latestBatch,
      latestDistribution,
      latestFoodReport,
      latestStudentComplaint,
    ] =
      await Promise.all([
        prisma.batchProduksi.count({
          where: batchDateWhere,
        }),
        prisma.batchDistributionSchool.count({
          where: distributionDateWhere,
        }),
        prisma.batchDistributionSchool.count({
          where: {
            AND: [distributionDateWhere, { status: "MENUNGGU" }],
          },
        }),
        prisma.batchDistributionSchool.count({
          where: {
            AND: [distributionDateWhere, { status: "DITERIMA" }],
          },
        }),
        prisma.foodReport.count({
          where: reportDateWhere,
        }),
        prisma.studentComplaint.count({
          where: reportDateWhere,
        }),
        prisma.batchProduksi.findMany({
          where: batchDateWhere,
          select: { createdAt: true },
        }),
        prisma.batchDistributionSchool.findMany({
          where: distributionDateWhere,
          select: { createdAt: true },
        }),
        prisma.foodReport.findMany({
          where: reportDateWhere,
          select: { createdAt: true },
        }),
        prisma.studentComplaint.findMany({
          where: reportDateWhere,
          select: { createdAt: true },
        }),
        prisma.batchProduksi.findFirst({
          where: batchDateWhere,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            status: true,
            totalPorsi: true,
            createdAt: true,
            menu: { select: { name: true } },
          },
        }),
        prisma.batchDistributionSchool.findFirst({
          where: distributionDateWhere,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            jumlahPorsi: true,
            status: true,
            createdAt: true,
            school: { select: { name: true } },
            distribution: {
              select: {
                id: true,
                status: true,
                batchId: true,
                batch: {
                  select: {
                    driver: { select: { name: true } },
                    menu: { select: { name: true } },
                  },
                },
              },
            },
          },
        }),
        prisma.foodReport.findFirst({
          where: reportDateWhere,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            kategori: true,
            kategoriLainnya: true,
            status: true,
            createdAt: true,
          },
        }),
        prisma.studentComplaint.findFirst({
          where: reportDateWhere,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            jumlahSiswa: true,
            gejala: true,
            createdAt: true,
          },
        }),
      ])

    const dailyActivity = buildDailyActivity(start, end, [
      ...batchActivity,
      ...distributionActivity,
      ...reportActivity,
      ...complaintActivity,
    ])
    const distributionDailyActivity = buildDailyActivity(
      start,
      end,
      distributionActivity
    )
    const latestMonitoring = [
      latestBatch
        ? {
            id: latestBatch.id,
            category: "Produksi",
            origin: "Dapur MBG",
            destination: latestBatch.menu?.name ?? "Menu",
            total: latestBatch.totalPorsi,
            status: latestBatch.status,
            tone:
              latestBatch.status === "DITOLAK"
                ? "danger"
                : latestBatch.status === "DRAFT"
                  ? "warning"
                  : "success",
            updatedAt: latestBatch.createdAt.toISOString(),
          }
        : null,
      latestDistribution
        ? {
            id: formatMonitoringCode("DIST", latestDistribution.createdAt),
            category: "Distribusi",
            origin: latestDistribution.distribution.batch.driver?.name ?? "SPPG",
            destination: latestDistribution.school.name,
            total: latestDistribution.jumlahPorsi,
            status: latestDistribution.status,
            tone:
              latestDistribution.status === "DITOLAK"
                ? "danger"
                : latestDistribution.status === "MENUNGGU"
                  ? "warning"
                  : "success",
            updatedAt: latestDistribution.createdAt.toISOString(),
          }
        : null,
      latestFoodReport
        ? {
            id: formatMonitoringCode("LAP", latestFoodReport.createdAt),
            category: "Laporan Sekolah",
            origin: "Sekolah",
            destination:
              latestFoodReport.kategori === "LAINNYA" &&
              latestFoodReport.kategoriLainnya
                ? latestFoodReport.kategoriLainnya
                : latestFoodReport.kategori.replaceAll("_", " "),
            total: 1,
            status: latestFoodReport.status,
            tone:
              latestFoodReport.status === "RESOLVED" ? "success" : "warning",
            updatedAt: latestFoodReport.createdAt.toISOString(),
          }
        : null,
      latestStudentComplaint
        ? {
            id: formatMonitoringCode("KEL", latestStudentComplaint.createdAt),
            category: "Keluhan Siswa",
            origin: "Sekolah",
            destination: latestStudentComplaint.gejala,
            total: latestStudentComplaint.jumlahSiswa,
            status: "Tercatat",
            tone: "warning",
            updatedAt: latestStudentComplaint.createdAt.toISOString(),
          }
        : null,
    ].filter(Boolean)

    res.json({
      data: {
        totalBatches,
        totalDistributions,
        pendingDistributions,
        deliveredDistributions,
        totalFoodReports,
        totalStudentComplaints,
        dailyActivity,
        distributionActivity: distributionDailyActivity,
        latestMonitoring,
      },
    })
  } catch (error) {
    const currentUser = await getCurrentUser(req)

    if (!currentUser) {
      return res.status(401).json({ message: "Tidak terautentikasi." })
    }

    res.json({
      data: getFallbackDashboardAnalytics(
        currentUser.role === "SEKOLAH" ? currentUser.id : undefined
      ),
    })
  }
})
