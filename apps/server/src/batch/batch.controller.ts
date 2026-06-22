import { PrismaClient } from "@prisma/client"
import { Request, Response } from "express"

const prisma = new PrismaClient()

// GET /api/batches
export const getBatches = async (req: Request, res: Response) => {
  try {
    const batches = await prisma.batchProduksi.findMany({
      include: {
        menu: true,
        petugas: {
          select: { id: true, username: true, role: true },
        },
        driver: {
          select: { id: true, username: true, role: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })
    res.json(batches)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Failed to fetch batches" })
  }
}

// GET /api/batches/:id
export const getBatchById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string
    const batch = await prisma.batchProduksi.findUnique({
      where: { id },
      include: {
        menu: true,
        petugas: { select: { id: true, username: true } },
        driver: { select: { id: true, username: true } },
        sekolah: {
          include: {
            sekolah: { select: { id: true, username: true } },
          },
        },
        varian: {
          include: {
            bahan: true
          }
        },
        foto: true,
      },
    })

    if (!batch) {
      res.status(404).json({ message: "Batch not found" })
      return
    }

    res.json(batch)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Failed to fetch batch details" })
  }
}

// POST /api/batches
export const createBatch = async (req: Request, res: Response) => {
  try {
    const {
      menuId,
      totalPorsi,
      waktuMulai,
      waktuSelesai,
      petugasId,
      sekolah, // array of { sekolahId, porsi }
      varian, // array of { namaVarian, jumlahPorsi, energi, protein, lemak, karbohidrat, serat, bahan: [] }
    } = req.body

    // Generate Batch ID
    const today = new Date()
    const dd = String(today.getDate()).padStart(2, "0")
    const mm = String(today.getMonth() + 1).padStart(2, "0")
    const yyyy = today.getFullYear()

    // Get today's start and end date for filtering
    const startOfDay = new Date(today.setHours(0, 0, 0, 0))
    const endOfDay = new Date(today.setHours(23, 59, 59, 999))

    const countToday = await prisma.batchProduksi.count({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    })

    const sequence = String(countToday + 1).padStart(3, "0")
    const batchId = `MBG-${dd}/${mm}/${yyyy}-${sequence}`

    const newBatch = await prisma.batchProduksi.create({
      data: {
        id: batchId,
        menuId,
        totalPorsi,
        waktuMulai: waktuMulai ? new Date(waktuMulai) : null,
        waktuSelesai: waktuSelesai ? new Date(waktuSelesai) : null,
        petugasId: petugasId || null,
        status: "DIPRODUKSI",
        sekolah: {
          create: sekolah?.map((s: any) => ({
            sekolahId: s.sekolahId,
            porsi: s.porsi,
          })) || [],
        },
        varian: {
          create: varian?.map((v: any) => ({
            namaVarian: v.namaVarian,
            jumlahPorsi: Number(v.jumlahPorsi),
            energi: v.energi ? Number(v.energi) : null,
            protein: v.protein ? Number(v.protein) : null,
            lemak: v.lemak ? Number(v.lemak) : null,
            karbohidrat: v.karbohidrat ? Number(v.karbohidrat) : null,
            serat: v.serat ? Number(v.serat) : null,
            bahan: {
              create: v.bahan?.map((b: any) => ({
                namaBahan: b.namaBahan,
                jumlah: Number(b.jumlah || 0),
                satuan: b.satuan,
                harga: b.harga ? Number(b.harga) : null,
                kategori: b.kategori || null,
              })) || [],
            }
          })) || [],
        },
      },
      include: {
        menu: true,
        sekolah: true,
        varian: {
          include: { bahan: true }
        },
      },
    })

    res.status(201).json(newBatch)
  } catch (error: any) {
    console.error(error)
    res.status(500).json({ message: "Failed to create batch", error: error.message })
  }
}

// PATCH /api/batches/:id/status
export const updateBatchStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string
    const { status, catatanKualitas } = req.body

    const validStatuses = ["DRAFT", "DIPRODUKSI", "SIAP_KIRIM", "TERKIRIM"]
    if (!validStatuses.includes(status)) {
      res.status(400).json({ message: "Invalid status" })
      return
    }

    const updatedBatch = await prisma.batchProduksi.update({
      where: { id },
      data: { 
        status,
        ...(catatanKualitas && { catatanKualitas }),
      },
    })

    res.json(updatedBatch)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Failed to update batch status" })
  }
}

// PATCH /api/batches/:id/delivery
export const updateBatchDelivery = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string
    const { driverId, noKendaraan, jamKeberangkatan } = req.body

    const updatedBatch = await prisma.batchProduksi.update({
      where: { id },
      data: {
        driverId: driverId || null,
        noKendaraan: noKendaraan || null,
        jamKeberangkatan: jamKeberangkatan ? new Date(jamKeberangkatan) : null,
        status: "SIAP_KIRIM",
      },
    })

    res.json(updatedBatch)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Failed to update batch delivery" })
  }
}
