import { createHash } from "node:crypto"

import { env } from "../config/env.js"

type CloudinaryUploadResponse = {
  secure_url?: string
  public_id?: string
  error?: {
    message?: string
  }
}

function getCloudinarySignature(params: Record<string, string>) {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&")

  return createHash("sha1")
    .update(`${payload}${env.cloudinary?.apiSecret ?? ""}`)
    .digest("hex")
}

export async function uploadImageToCloudinary({
  file,
  folder,
}: {
  file: string
  folder: string
}) {
  if (!env.cloudinary) {
    throw new Error("Penyimpanan foto Cloudinary belum dikonfigurasi.")
  }

  const timestamp = Math.round(Date.now() / 1000).toString()
  const uploadParams = {
    folder,
    timestamp,
  }
  const formData = new FormData()

  formData.set("file", file)
  formData.set("api_key", env.cloudinary.apiKey)
  formData.set("folder", folder)
  formData.set("timestamp", timestamp)
  formData.set("signature", getCloudinarySignature(uploadParams))

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${env.cloudinary.cloudName}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  )
  const payload = (await response.json()) as CloudinaryUploadResponse

  if (!response.ok || !payload.secure_url) {
    throw new Error(payload.error?.message ?? "Foto belum bisa disimpan. Coba lagi.")
  }

  return {
    publicId: payload.public_id ?? "",
    url: payload.secure_url,
  }
}

export function fileBufferToDataUrl(file: {
  buffer: Buffer
  mimetype: string
}) {
  return `data:${file.mimetype};base64,${file.buffer.toString("base64")}`
}
