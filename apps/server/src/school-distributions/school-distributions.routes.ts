import {
  BatchDistributionSchoolStatus,
  BatchDistributionStatus,
  type Prisma,
} from "@prisma/client"
import { Router } from "express"
import multer from "multer"

import { getCurrentUser } from "../auth/session.js"
import {
  fileBufferToDataUrl,
  uploadImageToCloudinary,
} from "../lib/cloudinary.js"
import { prisma } from "../lib/prisma.js"
import { getCurrentSchoolId } from "../lib/user-scope.js"

export const schoolDistributionsRouter = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024,
  },
})

type SchoolDistributionWithRelations = Prisma.BatchDistributionSchoolGetPayload<{
  include: {
    distribution: {
      include: {
        batch: {
          include: {
            driver: true
            foto: true
            menu: true
          }
        }
      }
    }
  }
}>

function getTodayRange() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)

  const end = new Date()
  end.setHours(23, 59, 59, 999)

  return { end, start }
}

function toSchoolDistributionResponse(item: SchoolDistributionWithRelations) {
  return {
    id: item.id,
    jumlahPorsi: item.jumlahPorsi,
    status: item.status,
    receivedAt: item.receivedAt?.toISOString() ?? null,
    rejectedReason: item.rejectedReason,
    buktiTerimaFotoUrl: item.buktiTerimaFotoUrl ?? null,
    distribution: {
      id: item.distribution.id,
      waktuKirim: item.distribution.waktuKirim?.toISOString() ?? null,
      status: item.distribution.status,
      fotoDikemasUrl: item.distribution.fotoDikemasUrl ?? null,
    },
    batch: {
      id: item.distribution.batch.id,
      totalPorsi: item.distribution.batch.totalPorsi,
      status: item.distribution.batch.status,
      createdAt: item.distribution.batch.createdAt?.toISOString() ?? null,
      menu: item.distribution.batch.menu,
      driver: item.distribution.batch.driver,
      foto: item.distribution.batch.foto,
    },
  }
}

schoolDistributionsRouter.get("/", async (req, res, next) => {
  try {
    const currentUser = await getCurrentUser(req)

    if (!currentUser) {
      return res
        .status(401)
        .json({ message: "Token tidak ditemukan atau tidak valid." })
    }

    const schoolId = await getCurrentSchoolId(currentUser)

    if (currentUser.role !== "SEKOLAH" || !schoolId) {
      return res.status(403).json({
        message: "Hanya akun sekolah yang dapat melihat distribusi sekolah.",
      })
    }

    const schoolRecord = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { sppgId: true },
    })

    const distributions = await prisma.batchDistributionSchool.findMany({
      where: { schoolId },
      include: {
        distribution: {
          include: {
            batch: {
              include: {
                driver: true,
                foto: true,
                menu: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    const distributedBatchIds = new Set(
      distributions.map((distribution) => distribution.distribution.batchId)
    )
    const { end, start } = getTodayRange()
    const undistributedBatches = schoolRecord?.sppgId
      ? await prisma.batchProduksi.findMany({
          where: {
            id: { notIn: [...distributedBatchIds] },
            OR: [{ petugasId: schoolRecord.sppgId }, { petugasId: null }],
            createdAt: {
              gte: start,
              lte: end,
            },
          },
          include: {
            driver: true,
            foto: true,
            menu: true,
          },
          orderBy: { createdAt: "desc" },
        })
      : []

    const virtualDistributions = undistributedBatches.map((batch) => ({
      id: `virtual-${batch.id}`,
      jumlahPorsi: batch.totalPorsi,
      status: "MENUNGGU",
      receivedAt: null,
      rejectedReason: null,
      buktiTerimaFotoUrl: null,
      distribution: {
        id: `virtual-dist-${batch.id}`,
        waktuKirim: null,
        status: "DRAFT",
        fotoDikemasUrl: null,
      },
      batch: {
        id: batch.id,
        totalPorsi: batch.totalPorsi,
        status: batch.status,
        createdAt: batch.createdAt?.toISOString() ?? null,
        menu: batch.menu,
        driver: batch.driver,
        foto: batch.foto,
      },
    }))

    return res.json({
      distributions: [
        ...distributions.map(toSchoolDistributionResponse),
        ...virtualDistributions,
      ],
    })
  } catch (error) {
    next(error)
  }
})

schoolDistributionsRouter.patch(
  "/:id/status",
  upload.single("file"),
  async (req, res, next) => {
    try {
      const distributionSchoolId = String(req.params.id)
      const currentUser = await getCurrentUser(req)

      if (!currentUser) {
        return res
          .status(401)
          .json({ message: "Token tidak ditemukan atau tidak valid." })
      }

      const schoolId = await getCurrentSchoolId(currentUser)

      if (currentUser.role !== "SEKOLAH" || !schoolId) {
        return res.status(403).json({
          message: "Hanya akun sekolah yang dapat memvalidasi distribusi.",
        })
      }

      const { rejectedReason, status } = req.body as {
        rejectedReason?: string
        status?: string
      }

      if (
        status !== BatchDistributionSchoolStatus.DITERIMA &&
        status !== BatchDistributionSchoolStatus.DITOLAK
      ) {
        return res.status(400).json({ message: "Status validasi tidak valid." })
      }

      const nextSchoolStatus = status
      const normalizedReason = rejectedReason?.trim()

      if (
        nextSchoolStatus === BatchDistributionSchoolStatus.DITOLAK &&
        !normalizedReason
      ) {
        return res
          .status(400)
          .json({ message: "Alasan penolakan wajib diisi." })
      }

      const file = req.file

      if (!file) {
        return res
          .status(400)
          .json({ message: "Foto validasi wajib diunggah." })
      }

      if (!file.mimetype.startsWith("image/")) {
        return res.status(400).json({ message: "File harus berupa gambar." })
      }

      const uploadResult = await uploadImageToCloudinary({
        file: fileBufferToDataUrl(file),
        folder: `mbg/distributions/${distributionSchoolId}/school/${schoolId}`,
      })

      const updated = await prisma.$transaction(async (tx) => {
        await tx.batchDistributionSchool.updateMany({
          where: {
            id: distributionSchoolId,
            schoolId,
          },
          data: {
            status: nextSchoolStatus,
            receivedAt: new Date(),
            rejectedReason:
              nextSchoolStatus === BatchDistributionSchoolStatus.DITOLAK
                ? normalizedReason
                : null,
            buktiTerimaFotoUrl: uploadResult.url,
          },
        })

        const item = await tx.batchDistributionSchool.findFirstOrThrow({
          where: {
            id: distributionSchoolId,
            schoolId,
          },
          include: {
            distribution: {
              include: {
                schools: true,
                batch: {
                  include: {
                    driver: true,
                    foto: true,
                    menu: true,
                  },
                },
              },
            },
          },
        })

        const statuses = item.distribution.schools.map((school) =>
          school.id === item.id ? nextSchoolStatus : school.status
        )
        const nextDistributionStatus = statuses.includes(
          BatchDistributionSchoolStatus.DITOLAK
        )
          ? BatchDistributionStatus.DITOLAK
          : statuses.every(
                (value) => value === BatchDistributionSchoolStatus.DITERIMA
              )
            ? BatchDistributionStatus.SELESAI
            : item.distribution.status

        if (nextDistributionStatus !== item.distribution.status) {
          await tx.batchDistribution.update({
            where: { id: item.distribution.id },
            data: { status: nextDistributionStatus },
          })
        }

        await tx.batchProduksi.update({
          where: { id: item.distribution.batchId },
          data: {
            status:
              nextSchoolStatus === BatchDistributionSchoolStatus.DITERIMA
                ? "DITERIMA"
                : "DITOLAK",
          },
        })

        await tx.schoolProgress.updateMany({
          where: { schoolId },
          data: {
            status:
              nextSchoolStatus === BatchDistributionSchoolStatus.DITERIMA
                ? "DITERIMA"
                : "BERMASALAH",
          },
        })

        return tx.batchDistributionSchool.findUniqueOrThrow({
          where: { id: item.id },
          include: {
            distribution: {
              include: {
                batch: {
                  include: {
                    driver: true,
                    foto: true,
                    menu: true,
                  },
                },
              },
            },
          },
        })
      })

      return res.json({ distribution: toSchoolDistributionResponse(updated) })
    } catch (error) {
      next(error)
    }
  }
)
