import { KategoriKomposisi, Prisma, UserRole } from "@prisma/client"
import { Request, Response } from "express"

import { getCurrentUser } from "../auth/session.js"
import { logger } from "../config/logger.js"
import { prisma } from "../db/prisma.js"
import { getSppgOwnerId } from "../lib/user-scope.js"
import { parseJakartaDate } from "../utils/date.js"

type BatchIngredientPayload = {
  harga?: number | string | null
  jumlah?: number | string | null
  kategori?: string | null
  namaBahan?: string
  satuan?: string
}

type BatchVariantPayload = {
  bahan?: BatchIngredientPayload[]
  energi?: number | string | null
  jumlahPorsi?: number | string | null
  karbohidrat?: number | string | null
  lemak?: number | string | null
  namaVarian?: string
  protein?: number | string | null
  serat?: number | string | null
}

type BatchSchoolPayload = {
  porsi?: number | string
  sekolahId?: string
}

const komposisiCategories = new Set<string>(Object.values(KategoriKomposisi))

function normalizeKomposisiCategory(value?: string | null) {
  return value && komposisiCategories.has(value)
    ? (value as KategoriKomposisi)
    : null
}

async function resolveMenuId(menuId?: string, namaMenu?: string) {
  if (menuId) {
    return menuId
  }

  const cleanMenuName = typeof namaMenu === "string" ? namaMenu.trim() : ""
  if (!cleanMenuName) {
    return null
  }

  const existingMenu = await prisma.menuMaster.findFirst({
    where: {
      name: {
        equals: cleanMenuName,
        mode: "insensitive",
      },
    },
  })

  if (existingMenu) {
    return existingMenu.id
  }

  const menu = await prisma.menuMaster.create({
    data: {
      name: cleanMenuName,
      category: "MENU_UTAMA",
    },
  })

  return menu.id
}

function getTodayRange(now = new Date()) {
  const startOfDay = new Date(now)
  startOfDay.setHours(0, 0, 0, 0)

  const endOfDay = new Date(now)
  endOfDay.setHours(23, 59, 59, 999)

  return { endOfDay, startOfDay }
}

async function generateBatchId(sequenceOffset = 0) {
  const now = new Date()
  const dd = String(now.getDate()).padStart(2, "0")
  const mm = String(now.getMonth() + 1).padStart(2, "0")
  const yyyy = now.getFullYear()
  const { endOfDay, startOfDay } = getTodayRange(now)
  const countToday = await prisma.batchProduksi.count({
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  })
  const sequence = String(countToday + 1 + sequenceOffset).padStart(3, "0")

  return `MBG-${dd}${mm}${yyyy}-${sequence}`
}

function parsePositiveInteger(value: unknown) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Kesalahan tidak diketahui"
}

async function getBatchOwnerFilter(user: {
  id: string
  role: string
  username: string
}) {
  if (user.role === UserRole.SUPER_ADMIN) {
    return {}
  }

  if (user.role !== UserRole.SPPG) {
    return { id: "__forbidden__" }
  }

  const sppgOwnerId = await getSppgOwnerId(user, { createIfMissing: true })

  return sppgOwnerId
    ? { petugasId: sppgOwnerId }
    : { id: "__invalid_sppg__" }
}

async function getAccessibleBatch(
  id: string,
  user: {
    id: string
    role: string
    username: string
  }
) {
  const ownerFilter = await getBatchOwnerFilter(user)

  return prisma.batchProduksi.findFirst({
    where: { id, ...ownerFilter },
    select: { id: true },
  })
}

function toVariantCreateInput(
  varian: BatchVariantPayload[] | undefined,
  fallbackPorsi: number
) {
  return (varian?.length ? varian : [{ namaVarian: "Utama" }]).map((item) => ({
    namaVarian: item.namaVarian || "Utama",
    jumlahPorsi: Number(item.jumlahPorsi || fallbackPorsi),
    energi: item.energi ? Number(item.energi) : null,
    protein: item.protein ? Number(item.protein) : null,
    lemak: item.lemak ? Number(item.lemak) : null,
    karbohidrat: item.karbohidrat ? Number(item.karbohidrat) : null,
    serat: item.serat ? Number(item.serat) : null,
    bahan: {
      create:
        item.bahan?.map((bahan) => ({
          namaBahan: bahan.namaBahan ?? "",
          jumlah: Number(bahan.jumlah || 0),
          satuan: bahan.satuan || "item",
          harga:
            typeof bahan.harga === "undefined" || bahan.harga === null
              ? null
              : Number(bahan.harga || 0),
          kategori: normalizeKomposisiCategory(bahan.kategori),
        })) || [],
    },
  }))
}

// GET /api/batches
export const getBatches = async (req: Request, res: Response) => {
  try {
    const currentUser = await getCurrentUser(req)

    if (!currentUser) {
      res.status(401).json({ message: "Tidak terautentikasi." })
      return
    }

    if (
      currentUser.role !== UserRole.SUPER_ADMIN &&
      currentUser.role !== UserRole.SPPG
    ) {
      res.status(403).json({
        message: "Hanya SPPG atau Super Admin yang dapat melihat batch produksi.",
      })
      return
    }

    const ownerFilter = await getBatchOwnerFilter(currentUser)
    const batches = await prisma.batchProduksi.findMany({
      where: ownerFilter,
      include: {
        menu: true,
        petugas: {
          select: { id: true, username: true, role: true },
        },
        driver: {
          select: { id: true, name: true, phone: true, vehicleNumber: true },
        },
        foto: true,
        varian: {
          include: { bahan: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })
    res.json(batches)
  } catch (error) {
    logger.error("Batch controller error.", error)
    res.status(500).json({ message: "Failed to fetch batches" })
  }
}

// GET /api/batches/:id
export const getBatchById = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUser = await getCurrentUser(req)

    if (!currentUser) {
      res.status(401).json({ message: "Tidak terautentikasi." })
      return
    }

    const id = req.params.id as string
    const ownerFilter = await getBatchOwnerFilter(currentUser)
    const batch = await prisma.batchProduksi.findFirst({
      where: { id, ...ownerFilter },
      include: {
        menu: true,
        petugas: { select: { id: true, username: true } },
        driver: { select: { id: true, name: true, phone: true, vehicleNumber: true } },
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
    logger.error("Batch controller error.", error)
    res.status(500).json({ message: "Failed to fetch batch details" })
  }
}

// POST /api/batches
export const createBatch = async (req: Request, res: Response) => {
  try {
    const currentUser = await getCurrentUser(req)

    if (!currentUser) {
      res.status(401).json({ message: "Tidak terautentikasi." })
      return
    }

    if (
      currentUser.role !== UserRole.SUPER_ADMIN &&
      currentUser.role !== UserRole.SPPG
    ) {
      res.status(403).json({
        message: "Hanya SPPG atau Super Admin yang dapat membuat batch produksi.",
      })
      return
    }

    const {
      menuId,
      namaMenu,
      totalPorsi,
      waktuMulai,
      waktuSelesai,
      petugasId,
      driverId,
      sekolah, // array of { sekolahId, porsi }
      varian, // array of { namaVarian, jumlahPorsi, energi, protein, lemak, karbohidrat, serat, bahan: [] }
    } = req.body as {
      driverId?: string
      menuId?: string
      namaMenu?: string
      petugasId?: string
      sekolah?: BatchSchoolPayload[]
      totalPorsi?: number | string
      varian?: BatchVariantPayload[]
      waktuMulai?: string
      waktuSelesai?: string
    }

    const resolvedMenuId = await resolveMenuId(menuId, namaMenu)
    if (!resolvedMenuId) {
      res.status(400).json({ message: "Nama menu wajib diisi" })
      return
    }

    const parsedTotalPorsi = parsePositiveInteger(totalPorsi)
    if (!parsedTotalPorsi) {
      res.status(400).json({ message: "Jumlah porsi wajib lebih dari 0" })
      return
    }

    const ownerSppgId =
      currentUser.role === UserRole.SPPG
        ? await getSppgOwnerId(currentUser, { createIfMissing: true })
        : null

    if (currentUser.role === UserRole.SPPG && !ownerSppgId) {
      res.status(400).json({
        message: "Akun SPPG tidak valid. Silakan login ulang.",
      })
      return
    }

    let newBatch
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const batchId = await generateBatchId(attempt)
        newBatch = await prisma.batchProduksi.create({
          data: {
            id: batchId,
            menuId: resolvedMenuId,
            totalPorsi: parsedTotalPorsi,
            waktuMulai: parseJakartaDate(waktuMulai),
            waktuSelesai: parseJakartaDate(waktuSelesai),
            petugasId:
              currentUser.role === UserRole.SPPG
                ? ownerSppgId
                : petugasId || null,
            driverId: driverId || null,
            status: "DIPRODUKSI",
            sekolah: {
              create:
                sekolah?.map((item) => ({
                  sekolahId: item.sekolahId,
                  porsi: Number(item.porsi || 0),
                })) || [],
            },
            varian: {
              create: toVariantCreateInput(varian, parsedTotalPorsi),
            },
          },
          include: {
            driver: true,
            menu: true,
            sekolah: true,
            varian: {
              include: { bahan: true },
            },
          },
        })
        break
      } catch (error) {
        const isDuplicateId =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"

        if (!isDuplicateId || attempt === 4) {
          throw error
        }
      }
    }

    if (!newBatch) {
      res.status(500).json({ message: "Gagal membuat Batch ID unik." })
      return
    }

    res.status(201).json(newBatch)
  } catch (error) {
    logger.error("Batch controller error.", error)
    res
      .status(500)
      .json({ message: "Gagal membuat batch", error: getErrorMessage(error) })
  }
}

// PATCH /api/batches/:id/status
export const updateBatchStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUser = await getCurrentUser(req)

    if (!currentUser) {
      res.status(401).json({ message: "Tidak terautentikasi." })
      return
    }

    const id = req.params.id as string
    const { status, catatanKualitas } = req.body

    const validStatuses = ["DRAFT", "DIPRODUKSI", "SIAP_KIRIM", "TERKIRIM", "DITERIMA", "DITOLAK"]
    if (!validStatuses.includes(status)) {
      res.status(400).json({ message: "Invalid status" })
      return
    }

    const accessibleBatch = await getAccessibleBatch(id, currentUser)
    if (!accessibleBatch) {
      res.status(404).json({ message: "Batch tidak ditemukan." })
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
    logger.error("Batch controller error.", error)
    res.status(500).json({ message: "Failed to update batch status" })
  }
}

export const updateBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUser = await getCurrentUser(req)

    if (!currentUser) {
      res.status(401).json({ message: "Tidak terautentikasi." })
      return
    }

    const id = req.params.id as string
    const { namaMenu, totalPorsi, varian, waktuMulai, waktuSelesai } =
      req.body as {
        namaMenu?: string
        totalPorsi?: number | string
        varian?: BatchVariantPayload[]
        waktuMulai?: string
        waktuSelesai?: string
      }
    const data: Prisma.BatchProduksiUncheckedUpdateInput = {}

    const accessibleBatch = await getAccessibleBatch(id, currentUser)
    if (!accessibleBatch) {
      res.status(404).json({ message: "Batch tidak ditemukan." })
      return
    }

    if (typeof totalPorsi !== "undefined") {
      const parsedTotalPorsi = parsePositiveInteger(totalPorsi)
      if (!parsedTotalPorsi) {
        res.status(400).json({ message: "Jumlah porsi wajib lebih dari 0" })
        return
      }

      data.totalPorsi = parsedTotalPorsi
    }

    if (typeof waktuMulai !== "undefined") {
      data.waktuMulai = parseJakartaDate(waktuMulai)
    }

    if (typeof waktuSelesai !== "undefined") {
      data.waktuSelesai = parseJakartaDate(waktuSelesai)
    }

    const resolvedMenuId = await resolveMenuId(undefined, namaMenu)
    if (resolvedMenuId) {
      data.menuId = resolvedMenuId
    }

    const updatedBatch = await prisma.$transaction(async (tx) => {
      const updated = await tx.batchProduksi.update({
        where: { id },
        data,
      })

      if (Array.isArray(varian)) {
        await tx.batchVarian.deleteMany({
          where: { batchId: id },
        })
        const fallbackJumlahPorsi =
          typeof data.totalPorsi === "number" ? data.totalPorsi : updated.totalPorsi

        await Promise.all(
          varian.map((item) =>
            tx.batchVarian.create({
              data: {
                batchId: id,
                namaVarian: item.namaVarian || "Utama",
                jumlahPorsi: Number(item.jumlahPorsi || fallbackJumlahPorsi || 0),
                bahan: {
                  create:
                    item.bahan?.map((bahan) => ({
                      namaBahan: bahan.namaBahan ?? "",
                      jumlah: Number(bahan.jumlah || 0),
                      satuan: bahan.satuan || "item",
                      harga:
                        typeof bahan.harga === "undefined"
                          ? null
                          : Number(bahan.harga || 0),
                      kategori: normalizeKomposisiCategory(bahan.kategori),
                    })) || [],
                },
              },
            })
          )
        )
      }

      return tx.batchProduksi.findUniqueOrThrow({
        where: { id },
        include: {
          driver: true,
          foto: true,
          menu: true,
          varian: {
            include: { bahan: true },
          },
        },
      })
    }, {
      timeout: 15000,
    })

    res.json(updatedBatch)
  } catch (error) {
    logger.error("Batch controller error.", error)
    res
      .status(500)
      .json({ message: "Gagal memperbarui batch", error: getErrorMessage(error) })
  }
}

// PATCH /api/batches/:id/delivery
export const updateBatchDelivery = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUser = await getCurrentUser(req)

    if (!currentUser) {
      res.status(401).json({ message: "Tidak terautentikasi." })
      return
    }

    const id = req.params.id as string
    const { driverId, noKendaraan, jamKeberangkatan } = req.body

    const accessibleBatch = await getAccessibleBatch(id, currentUser)
    if (!accessibleBatch) {
      res.status(404).json({ message: "Batch tidak ditemukan." })
      return
    }

    if (driverId) {
      const ownerSppgId =
        currentUser.role === UserRole.SPPG
          ? await getSppgOwnerId(currentUser, { createIfMissing: true })
          : null

      if (currentUser.role === UserRole.SPPG && !ownerSppgId) {
        res.status(400).json({
          message: "Akun SPPG tidak valid. Silakan login ulang.",
        })
        return
      }

      const driver = await prisma.driver.findFirst({
        where: {
          id: driverId,
          isActive: true,
          ...(currentUser.role === UserRole.SPPG
            ? { sppgId: ownerSppgId as string }
            : {}),
        },
        select: { id: true },
      })

      if (!driver) {
        res.status(400).json({
          message: "Driver tidak valid atau tidak aktif untuk SPPG ini.",
        })
        return
      }
    }

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
    logger.error("Batch controller error.", error)
    res.status(500).json({ message: "Failed to update batch delivery" })
  }
}

export const deleteBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUser = await getCurrentUser(req)

    if (!currentUser) {
      res.status(401).json({ message: "Tidak terautentikasi." })
      return
    }

    const id = req.params.id as string

    const accessibleBatch = await getAccessibleBatch(id, currentUser)
    if (!accessibleBatch) {
      res.status(404).json({ message: "Batch tidak ditemukan." })
      return
    }

    await prisma.batchProduksi.delete({
      where: { id },
    })

    res.status(204).send()
  } catch (error) {
    logger.error("Batch controller error.", error)
    res.status(500).json({ message: "Failed to delete batch" })
  }
}
