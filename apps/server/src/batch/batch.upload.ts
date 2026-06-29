import { FotoType, UserRole } from "@prisma/client"
import { Router } from "express"
import multer from "multer"

import { getCurrentUser } from "../auth/session.js"
import {
  fileBufferToDataUrl,
  uploadImageToCloudinary,
} from "../lib/cloudinary.js"
import { prisma } from "../lib/prisma.js"
import { getSppgOwnerId } from "../lib/user-scope.js"
import { requireAuth } from "../middleware/auth.js"

export const uploadRouter = Router()

uploadRouter.use(requireAuth)

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024,
  },
})

uploadRouter.post("/:id/upload", upload.single("file"), async (req, res) => {
  try {
    const id = String(req.params.id)
    const file = req.file
    const rawJenis = (req.body as { jenis?: unknown }).jenis
    const jenis = typeof rawJenis === "string" ? rawJenis : undefined
    const currentUser = await getCurrentUser(req)

    if (!currentUser) {
      return res.status(401).json({ message: "Tidak terautentikasi." })
    }

    if (
      currentUser.role !== UserRole.SUPER_ADMIN &&
      currentUser.role !== UserRole.SPPG
    ) {
      return res.status(403).json({
        message: "Hanya SPPG atau Super Admin yang dapat mengunggah foto batch.",
      })
    }

    if (!file) {
      return res.status(400).json({ message: "File foto wajib diisi." })
    }

    if (!file.mimetype.startsWith("image/")) {
      return res.status(400).json({ message: "File harus berupa gambar." })
    }

    if (!jenis || !Object.values(FotoType).includes(jenis as FotoType)) {
      return res.status(400).json({ message: "Jenis foto tidak valid." })
    }

    const ownerSppgId =
      currentUser.role === UserRole.SPPG
        ? await getSppgOwnerId(currentUser, { createIfMissing: true })
        : null

    if (currentUser.role === UserRole.SPPG && !ownerSppgId) {
      return res.status(400).json({
        message: "Akun SPPG tidak valid. Silakan login ulang.",
      })
    }

    const batch = await prisma.batchProduksi.findFirst({
      where: {
        id,
        ...(currentUser.role === UserRole.SPPG
          ? { petugasId: ownerSppgId as string }
          : {}),
      },
    })

    if (!batch) {
      return res.status(404).json({ message: "Batch tidak ditemukan." })
    }

    const upload = await uploadImageToCloudinary({
      file: fileBufferToDataUrl(file),
      folder: `mbg/batches/${id}/${jenis.toLowerCase()}`,
    })

    const batchFoto = await prisma.batchFoto.create({
      data: {
        batchId: id,
        jenis: jenis as FotoType,
        url: upload.url,
      },
    })

    return res.status(201).json({
      ...batchFoto,
      publicId: upload.publicId,
    })
  } catch (error) {
    return res.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat mengunggah foto.",
    })
  }
})
