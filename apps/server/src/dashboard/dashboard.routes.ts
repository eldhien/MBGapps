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

    const [totalBatches, totalDistributions, pendingDistributions, deliveredDistributions, totalFoodReports, totalStudentComplaints] =
      await Promise.all([
        prisma.batchProduksi.count({
          where: batchWhere,
        }),
        prisma.batchDistributionSchool.count({
          where: distributionSchoolWhere,
        }),
        prisma.batchDistributionSchool.count({
          where: { ...distributionSchoolWhere, status: "MENUNGGU" },
        }),
        prisma.batchDistributionSchool.count({
          where: { ...distributionSchoolWhere, status: "DITERIMA" },
        }),
        prisma.foodReport.count({
          where: reportWhere,
        }),
        prisma.studentComplaint.count({
          where: reportWhere,
        }),
      ])

    res.json({
      data: {
        totalBatches,
        totalDistributions,
        pendingDistributions,
        deliveredDistributions,
        totalFoodReports,
        totalStudentComplaints,
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
