import { Router } from "express"

import { getCurrentUser } from "../auth/session.js"
import { getFallbackDashboardAnalytics } from "../lib/fallback-store.js"
import { requireAuth } from "../middleware/auth.js"
import { prisma } from "../lib/prisma.js"

export const dashboardRouter = Router()

dashboardRouter.use(requireAuth)

function isUuid(value?: string | null) {
  return Boolean(
    value?.match(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i
    )
  )
}

function getMonthRange(value?: unknown) {
  if (typeof value !== "string" || !value.match(/^\d{4}-\d{2}$/)) {
    const now = new Date()
    return {
      key: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
    }
  }

  const [year, month] = value.split("-").map(Number)
  const start = new Date(year, month - 1, 1)

  if (Number.isNaN(start.getTime())) {
    const now = new Date()
    return {
      key: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
    }
  }

  return {
    key: value,
    start,
    end: new Date(year, month, 1),
  }
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
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000)
  const counts = Array.from({ length: days }, (_, index) => ({
    label: String(index + 1),
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

async function getSppgOwnerId(user: {
  id: string
  role: string
  username: string
}) {
  if (user.role !== "SPPG") {
    return null
  }

  if (isUuid(user.id)) {
    return user.id
  }

  const account = await prisma.user.findUnique({
    where: { username: user.username },
    select: { id: true },
  })

  return account?.id ?? null
}

dashboardRouter.get("/analytics", async (req, res, next) => {
  try {
    const currentUser = await getCurrentUser(req)

    if (!currentUser) {
      return res.status(401).json({ message: "Tidak terautentikasi." })
    }

    const reporterSchoolId = await getReporterSchoolId(currentUser)
    const sppgOwnerId = await getSppgOwnerId(currentUser)
    const { start, end } = getMonthRange(req.query.month)
    const schoolReporterIds =
      currentUser.role === "SEKOLAH"
        ? ([currentUser.id, reporterSchoolId].filter(Boolean) as string[])
        : []

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

    const reportWhere =
      currentUser.role === "SEKOLAH"
        ? { sekolahId: { in: schoolReporterIds } }
        : {}

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
      ])

    const dailyActivity = buildDailyActivity(start, end, [
      ...batchActivity,
      ...distributionActivity,
      ...reportActivity,
      ...complaintActivity,
    ])

    res.json({
      data: {
        totalBatches,
        totalDistributions,
        pendingDistributions,
        deliveredDistributions,
        totalFoodReports,
        totalStudentComplaints,
        dailyActivity,
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
