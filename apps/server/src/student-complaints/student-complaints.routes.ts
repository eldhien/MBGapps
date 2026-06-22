import { Router } from "express"

import { getCurrentUser } from "../auth/session.js"
import {
  createFallbackStudentComplaint,
  listFallbackStudentComplaints,
} from "../lib/fallback-store.js"
import { prisma } from "../lib/prisma.js"
import { requireAuth } from "../middleware/auth.js"

export const studentComplaintsRouter = Router()

studentComplaintsRouter.use(requireAuth)

studentComplaintsRouter.get("/", async (req, res, next) => {
  try {
    const currentUser = await getCurrentUser(req)

    if (!currentUser) {
      return res.status(401).json({ message: "Tidak terautentikasi." })
    }

    const complaints = await prisma.studentComplaint.findMany({
      where: currentUser.role === "SEKOLAH" ? { sekolahId: currentUser.id } : {},
      orderBy: { createdAt: "desc" },
    })
    res.json({ data: complaints })
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
    const resolvedSekolahId =
      currentUser.role === "SEKOLAH"
        ? currentUser.id
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

    res.status(201).json({ data: complaint })
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
    const resolvedSekolahId =
      currentUser.role === "SEKOLAH"
        ? currentUser.id
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

    res.status(201).json({ data: complaint })
  }
})
