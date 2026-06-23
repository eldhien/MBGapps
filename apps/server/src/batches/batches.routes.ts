import { Router } from "express"
import { LegacyBatchStatus } from "@prisma/client"

import { prisma } from "../lib/prisma.js"

export const batchesRouter = Router()
const batchStatuses = new Set<string>(Object.values(LegacyBatchStatus))

batchesRouter.get("/", async (_req, res, next) => {
  try {
    const batches = await prisma.batch.findMany({
      orderBy: { createdAt: "desc" },
      include: { distributions: true },
    })
    res.json({ data: batches })
  } catch (error) {
    res.json({ data: [] })
  }
})

batchesRouter.post("/", async (req, res, next) => {
  try {
    const { namaMenu, jumlahPorsi, komposisi, waktuProduksi, driverId, photoUrl, sppgId } =
      req.body as {
        namaMenu?: string
        jumlahPorsi?: number
        komposisi?: string
        waktuProduksi?: string
        driverId?: string
        photoUrl?: string
        sppgId?: string
      }

    if (!namaMenu || !jumlahPorsi || !komposisi || !waktuProduksi) {
      return res.status(400).json({ message: "Data batch tidak lengkap." })
    }

    const batchIdUnik = `MBG-${new Date(waktuProduksi).toISOString().slice(0, 10).replace(/-/g, "/")}-${Date.now().toString().slice(-6)}`

    const batch = await prisma.batch.create({
      data: {
        batchIdUnik,
        namaMenu,
        jumlahPorsi,
        komposisi,
        waktuProduksi: new Date(waktuProduksi),
        driverId,
        photoUrl,
        sppgId,
        status: "SCHEDULED",
      },
    })

    res.status(201).json({ data: batch })
  } catch (error) {
    next(error)
  }
})

batchesRouter.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params as { id: string }
    const { status } = req.body as { status?: LegacyBatchStatus }

    if (status && !batchStatuses.has(status)) {
      return res.status(400).json({ message: "Status batch tidak valid." })
    }

    const batch = await prisma.batch.update({
      where: { id },
      data: { status: status ?? undefined },
    })

    res.json({ data: batch })
  } catch (error) {
    next(error)
  }
})
