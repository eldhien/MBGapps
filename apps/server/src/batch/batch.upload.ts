import { FotoType } from "@prisma/client"
import { Router } from "express"
import multer from "multer"

import {
  fileBufferToDataUrl,
  uploadImageToCloudinary,
} from "../lib/cloudinary.js"
import { prisma } from "../lib/prisma.js"

export const uploadRouter = Router()

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

    if (!file) {
      return res.status(400).json({ message: "File foto wajib diisi." })
    }

    if (!file.mimetype.startsWith("image/")) {
      return res.status(400).json({ message: "File harus berupa gambar." })
    }

    if (!jenis || !Object.values(FotoType).includes(jenis as FotoType)) {
      return res.status(400).json({ message: "Jenis foto tidak valid." })
    }

    const batch = await prisma.batchProduksi.findUnique({ where: { id } })

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
