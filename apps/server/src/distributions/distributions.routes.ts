import { Router } from "express"

import { prisma } from "../lib/prisma.js"
import { requireAuth } from "../middleware/auth.js"

export const distributionsRouter = Router()

distributionsRouter.use(requireAuth)

distributionsRouter.get("/", async (req, res, next) => {
  try {
    const distributions = await prisma.distribution.findMany({
      orderBy: { createdAt: "desc" },
      include: { batch: true, receivingReceipt: true },
    })
    res.json({ data: distributions })
  } catch (error) {
    next(error)
  }
})

distributionsRouter.post("/", async (req, res, next) => {
  try {
    const { batchId, sekolahId, waktuKirim, jumlahPorsi } = req.body as {
      batchId?: string
      sekolahId?: string
      waktuKirim?: string
      jumlahPorsi?: number
    }

    if (!batchId || !sekolahId || !jumlahPorsi) {
      return res.status(400).json({ message: "Data distribusi tidak lengkap." })
    }

    const distribution = await prisma.distribution.create({
      data: {
        batchId,
        sekolahId,
        waktuKirim: waktuKirim ? new Date(waktuKirim) : undefined,
        jumlahPorsi,
        status: "PENDING",
      },
    })

    res.status(201).json({ data: distribution })
  } catch (error) {
    next(error)
  }
})