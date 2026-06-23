import { Router } from "express"

import { getCurrentUser } from "../auth/session.js"
import { getFallbackDashboardAnalytics } from "../lib/fallback-store.js"
import { requireAuth } from "../middleware/auth.js"
import { prisma } from "../lib/prisma.js"

export const dashboardRouter = Router()

dashboardRouter.use(requireAuth)

dashboardRouter.get("/analytics", async (req, res, next) => {
  try {
    const currentUser = await getCurrentUser(req)

    if (!currentUser) {
      return res.status(401).json({ message: "Tidak terautentikasi." })
    }

    const distributionWhere =
      currentUser.role === "SEKOLAH" ? { sekolahId: currentUser.id } : {}
    const reportWhere =
      currentUser.role === "SEKOLAH" ? { sekolahId: currentUser.id } : {}

    const [distributionBatches, totalDistributions, pendingDistributions, deliveredDistributions, totalFoodReports, totalStudentComplaints] =
      await Promise.all([
        prisma.distribution.findMany({
          where: distributionWhere,
          distinct: ["batchId"],
          select: { batchId: true },
        }),
        prisma.distribution.count({
          where: distributionWhere,
        }),
        prisma.distribution.count({
          where: { ...distributionWhere, status: "PENDING" },
        }),
        prisma.distribution.count({
          where: { ...distributionWhere, status: "DELIVERED" },
        }),
        prisma.foodReport.count({
          where: reportWhere,
        }),
        prisma.studentComplaint.count({
          where: reportWhere,
        }),
      ])

    const totalBatches =
      currentUser.role === "SEKOLAH"
        ? distributionBatches.length
        : await prisma.batch.count()

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
