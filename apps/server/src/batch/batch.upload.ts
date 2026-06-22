import { createClient } from "@supabase/supabase-js"
import { Router } from "express"
import multer from "multer"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()
export const uploadRouter = Router()

// Konfigurasi Multer (disimpan di memory untuk di-upload ke Supabase)
const storage = multer.memoryStorage()
const upload = multer({ storage })

const supabaseUrl = process.env.SUPABASE_URL || "https://dummy.supabase.co"
const supabaseKey = process.env.SUPABASE_KEY || "dummy"
const bucketName = process.env.SUPABASE_BUCKET || "mbg-bucket"

const supabase = createClient(supabaseUrl, supabaseKey)

// POST /api/batches/:id/upload
uploadRouter.post("/:id/upload", upload.single("file"), async (req: any, res: any) => {
  try {
    const { id } = req.params
    const file = req.file
    const { jenis } = req.body // PROSES_MASAK atau MAKANAN_JADI

    if (!file) {
      return res.status(400).json({ message: "File is required" })
    }

    if (!jenis || !["PROSES_MASAK", "MAKANAN_JADI"].includes(jenis)) {
      return res.status(400).json({ message: "Jenis foto tidak valid" })
    }

    // Periksa apakah batch ada
    const batch = await prisma.batchProduksi.findUnique({ where: { id } })
    if (!batch) {
      return res.status(404).json({ message: "Batch not found" })
    }

    // Upload to Supabase Storage
    const fileName = `${id}/${jenis}-${Date.now()}-${file.originalname}`
    
    let publicUrl = "";

    if (supabaseUrl === "https://dummy.supabase.co") {
      console.log("Supabase not configured, using mock image URL")
      publicUrl = `https://placehold.co/600x400?text=${jenis}`
    } else {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
        })

      if (error) {
        console.error("Supabase upload error:", error)
        return res.status(500).json({ message: "Gagal mengunggah file ke Supabase" })
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName)

      publicUrl = publicUrlData.publicUrl
    }

    // Simpan ke database
    const batchFoto = await prisma.batchFoto.create({
      data: {
        batchId: id,
        jenis,
        url: publicUrl,
      },
    })

    res.status(201).json(batchFoto)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Terjadi kesalahan saat mengunggah file" })
  }
})
