import { Router } from "express"

import { getCurrentUser } from "../auth/session.js"
import {
  buildComplaintAnalysis,
  normalizeAnalysisPeriod,
} from "./complaint-analysis.js"
import {
  createFallbackStudentComplaint,
  listFallbackStudentComplaints,
} from "../lib/fallback-store.js"
import { prisma } from "../lib/prisma.js"
import { requireAuth } from "../middleware/auth.js"

export const studentComplaintsRouter = Router()

studentComplaintsRouter.use(requireAuth)

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
  complaints: T[]
) {
  const reporterIds = [...new Set(complaints.map((complaint) => complaint.sekolahId))]
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

  return complaints.map((complaint) => ({
    ...complaint,
    sekolahId:
      accountByUserId.get(complaint.sekolahId)?.schoolId ?? complaint.sekolahId,
    sekolahUsername:
      accountBySchoolId.get(complaint.sekolahId)?.username ??
      accountByUserId.get(complaint.sekolahId)?.username ??
      complaint.sekolahId,
  }))
}

studentComplaintsRouter.get("/analysis", async (req, res, next) => {
  try {
    const currentUser = await getCurrentUser(req)

    if (!currentUser) {
      return res.status(401).json({ message: "Tidak terautentikasi." })
    }

    const period = normalizeAnalysisPeriod(req.query.period)
    const reporterSchoolId = await getReporterSchoolId(currentUser)
    const schoolFilter =
      currentUser.role === "SEKOLAH"
        ? { sekolahId: { in: [currentUser.id, reporterSchoolId].filter(Boolean) as string[] } }
        : {}

    const complaints = await prisma.studentComplaint.findMany({
      where: schoolFilter,
      orderBy: { waktuKejadian: "desc" },
    })
    const resolvedComplaints = await resolveReporterSchools(complaints)
    const batchIds = [
      ...new Set(
        resolvedComplaints
          .map((complaint) => complaint.batchId)
          .filter(Boolean) as string[]
      ),
    ]
    const schools = await prisma
          .$queryRaw<
            {
              account_id: string | null
              account_username: string | null
              id: string
              name: string
            }[]
          >`
            SELECT
              s.id::text AS id,
              s.name,
              account.id::text AS account_id,
              account.username AS account_username
            FROM "public"."schools" s
            LEFT JOIN "public"."users" account
              ON account.school_id::text = s.id::text
          `
          .then((rows) =>
            rows.map((school) => ({
              aliases: [
                school.account_id,
                school.account_username,
              ].filter(Boolean) as string[],
              id: school.id,
              name: school.name,
            }))
          )
          .catch(() => [])
    const batches = batchIds.length
      ? await prisma.batchProduksi
          .findMany({
            where: { id: { in: batchIds } },
            include: {
              driver: { select: { name: true, vehicleNumber: true } },
              menu: { select: { name: true } },
              distributions: {
                include: {
                  schools: {
                    include: {
                      school: { select: { id: true, name: true } },
                    },
                  },
                },
              },
            },
          })
          .catch(() => [])
      : []

    const analysis = buildComplaintAnalysis({
      period,
      complaints: resolvedComplaints.map((complaint) => ({
        ...complaint,
        batchId: complaint.batchId ?? null,
        sekolahUsername: complaint.sekolahUsername,
      })),
      schools,
      batches: batches.map((batch) => ({
        id: batch.id,
        driverName: batch.driver?.name ?? null,
        menuName: batch.menu?.name ?? null,
        route: batch.ruteDistribusi ?? batch.noKendaraan ?? batch.driver?.vehicleNumber ?? null,
        status: batch.status,
        distributions: batch.distributions.map((distribution) => ({
          id: distribution.id,
          status: distribution.status,
          waktuKirim: distribution.waktuKirim,
          schools: distribution.schools.map((item) => ({
            schoolId: item.schoolId,
            schoolName: item.school.name,
            status: item.status,
          })),
        })),
      })),
    })

    return res.json({ data: analysis })
  } catch (error) {
    try {
      const currentUser = await getCurrentUser(req)

      if (!currentUser) {
        return res.status(401).json({ message: "Tidak terautentikasi." })
      }

      const period = normalizeAnalysisPeriod(req.query.period)
      const fallbackComplaints = listFallbackStudentComplaints(
        currentUser.role === "SEKOLAH" ? currentUser.id : undefined
      )

      return res.json({
        data: buildComplaintAnalysis({
          period,
          complaints: fallbackComplaints.map((complaint) => ({
            ...complaint,
            batchId: complaint.batchId ?? null,
            sekolahUsername: complaint.sekolahId,
          })),
          schools: [],
          batches: [],
        }),
      })
    } catch (fallbackError) {
      next(fallbackError)
    }
  }
})

studentComplaintsRouter.get("/", async (req, res, next) => {
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

    const complaints = await prisma.studentComplaint.findMany({
      where: schoolFilter,
      orderBy: { createdAt: "desc" },
    })
    res.json({ data: await resolveReporterSchools(complaints) })
  } catch (error) {
    const currentUser = await getCurrentUser(req)

    if (!currentUser) {
      return res.status(401).json({ message: "Tidak terautentikasi." })
    }

    res.json({
      data: listFallbackStudentComplaints(
        currentUser.role === "SEKOLAH" ? currentUser.id : undefined
      ),
    })
  }
})

studentComplaintsRouter.post("/", async (req, res, next) => {
  try {
    const currentUser = await getCurrentUser(req)

    if (!currentUser) {
      return res.status(401).json({ message: "Tidak terautentikasi." })
    }

    const { jumlahSiswa, gejala, waktuKejadian, tindakan, sekolahId, batchId } =
      req.body as {
        jumlahSiswa?: number
        gejala?: string
        waktuKejadian?: string
        tindakan?: string
        sekolahId?: string
        batchId?: string
      }
    const normalizedSymptoms = gejala?.trim()
    const normalizedAction = tindakan?.trim()
    const reporterSchoolId = await getReporterSchoolId(currentUser)
    const resolvedSekolahId =
      currentUser.role === "SEKOLAH"
        ? reporterSchoolId
        : sekolahId?.trim() || currentUser.id
    const incidentDate = waktuKejadian ? new Date(waktuKejadian) : null

    if (
      !jumlahSiswa ||
      jumlahSiswa < 1 ||
      !normalizedSymptoms ||
      !incidentDate ||
      Number.isNaN(incidentDate.getTime()) ||
      !normalizedAction ||
      !resolvedSekolahId
    ) {
      return res.status(400).json({ message: "Data keluhan tidak lengkap." })
    }

    const complaint = await prisma.studentComplaint.create({
      data: {
        jumlahSiswa,
        gejala: normalizedSymptoms,
        waktuKejadian: incidentDate,
        tindakan: normalizedAction,
        sekolahId: resolvedSekolahId,
        batchId: batchId?.trim() || undefined,
      },
    })

    res.status(201).json({ data: (await resolveReporterSchools([complaint]))[0] })
  } catch (error) {
    const currentUser = await getCurrentUser(req)

    if (!currentUser) {
      return res.status(401).json({ message: "Tidak terautentikasi." })
    }

    const { jumlahSiswa, gejala, waktuKejadian, tindakan, sekolahId, batchId } =
      req.body as {
        jumlahSiswa?: number
        gejala?: string
        waktuKejadian?: string
        tindakan?: string
        sekolahId?: string
        batchId?: string
      }
    const normalizedSymptoms = gejala?.trim()
    const normalizedAction = tindakan?.trim()
    const reporterSchoolId = await getReporterSchoolId(currentUser)
    const resolvedSekolahId =
      currentUser.role === "SEKOLAH"
        ? reporterSchoolId
        : sekolahId?.trim() || currentUser.id
    const incidentDate = waktuKejadian ? new Date(waktuKejadian) : null

    if (
      !jumlahSiswa ||
      jumlahSiswa < 1 ||
      !normalizedSymptoms ||
      !incidentDate ||
      Number.isNaN(incidentDate.getTime()) ||
      !normalizedAction ||
      !resolvedSekolahId
    ) {
      return res.status(400).json({ message: "Data keluhan tidak lengkap." })
    }

    const complaint = createFallbackStudentComplaint({
      jumlahSiswa,
      gejala: normalizedSymptoms,
      waktuKejadian: incidentDate,
      tindakan: normalizedAction,
      sekolahId: resolvedSekolahId,
      batchId: batchId?.trim() || null,
    })

    res.status(201).json({ data: (await resolveReporterSchools([complaint]))[0] })
  }
})
