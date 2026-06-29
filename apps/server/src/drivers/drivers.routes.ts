import { Router } from "express"
import { UserRole } from "@prisma/client"

import { prisma } from "../lib/prisma.js"
import { getSppgOwnerId, requireRoles } from "../lib/user-scope.js"

export const driversRouter = Router()

function toDriverResponse(driver: {
  id: string
  name: string
  phone: string | null
  vehicleNumber: string | null
  isActive: boolean
  sppgId?: string | null
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: driver.id,
    name: driver.name,
    phone: driver.phone,
    vehicleNumber: driver.vehicleNumber,
    isActive: driver.isActive,
    createdAt: driver.createdAt.toISOString(),
    updatedAt: driver.updatedAt.toISOString(),
  }
}

function cleanOptionalText(value?: string) {
  const cleaned = value?.trim()
  return cleaned ? cleaned : null
}

async function getDriverOwnerFilter(user: {
  id: string
  role: string
  username: string
}) {
  if (user.role !== UserRole.SPPG) {
    return {}
  }

  const sppgId = await getSppgOwnerId(user, { createIfMissing: true })

  if (!sppgId) {
    return { id: "00000000-0000-4000-8000-000000000000" }
  }

  return { sppgId }
}

driversRouter.get("/", async (req, res, next) => {
  try {
    const auth = await requireRoles(
      req,
      ["SUPER_ADMIN", "SPPG"],
      "Hanya SPPG atau Super Admin yang dapat mengelola driver."
    )

    if ("status" in auth) {
      return res.status(auth.status).json({ message: auth.message })
    }

    const activeOnly = req.query.active === "true"
    const ownerFilter = await getDriverOwnerFilter(auth.currentUser)
    const drivers = await prisma.driver.findMany({
      where: {
        ...ownerFilter,
        ...(activeOnly ? { isActive: true } : {}),
      },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    })

    return res.json({ drivers: drivers.map(toDriverResponse) })
  } catch (error) {
    next(error)
  }
})

driversRouter.post("/", async (req, res, next) => {
  try {
    const auth = await requireRoles(
      req,
      ["SUPER_ADMIN", "SPPG"],
      "Hanya SPPG atau Super Admin yang dapat mengelola driver."
    )

    if ("status" in auth) {
      return res.status(auth.status).json({ message: auth.message })
    }

    const { name, phone, vehicleNumber } = req.body as {
      name?: string
      phone?: string
      vehicleNumber?: string
    }
    const normalizedName = name?.trim()

    if (!normalizedName) {
      return res.status(400).json({ message: "Nama driver wajib diisi." })
    }

    const ownerSppgId =
      auth.currentUser.role === UserRole.SPPG
        ? await getSppgOwnerId(auth.currentUser, { createIfMissing: true })
        : null

    if (auth.currentUser.role === UserRole.SPPG && !ownerSppgId) {
      return res.status(400).json({
        message: "Akun SPPG tidak valid. Silakan login ulang.",
      })
    }

    const driver = await prisma.driver.create({
      data: {
        name: normalizedName,
        phone: cleanOptionalText(phone),
        vehicleNumber: cleanOptionalText(vehicleNumber),
        sppgId: ownerSppgId,
      },
    })

    return res.status(201).json({ driver: toDriverResponse(driver) })
  } catch (error) {
    next(error)
  }
})

driversRouter.patch("/:id", async (req, res, next) => {
  try {
    const auth = await requireRoles(
      req,
      ["SUPER_ADMIN", "SPPG"],
      "Hanya SPPG atau Super Admin yang dapat mengelola driver."
    )

    if ("status" in auth) {
      return res.status(auth.status).json({ message: auth.message })
    }

    const { isActive, name, phone, vehicleNumber } = req.body as {
      isActive?: boolean
      name?: string
      phone?: string
      vehicleNumber?: string
    }
    const normalizedName = name?.trim()

    if (name !== undefined && !normalizedName) {
      return res.status(400).json({ message: "Nama driver wajib diisi." })
    }

    const ownerFilter = await getDriverOwnerFilter(auth.currentUser)
    const existingDriver = await prisma.driver.findFirst({
      where: { id: req.params.id, ...ownerFilter },
      select: { id: true },
    })

    if (!existingDriver) {
      return res.status(404).json({ message: "Driver tidak ditemukan." })
    }

    const driver = await prisma.driver.update({
      where: { id: req.params.id },
      data: {
        ...(normalizedName ? { name: normalizedName } : {}),
        ...(phone !== undefined ? { phone: cleanOptionalText(phone) } : {}),
        ...(vehicleNumber !== undefined
          ? { vehicleNumber: cleanOptionalText(vehicleNumber) }
          : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    })

    return res.json({ driver: toDriverResponse(driver) })
  } catch (error) {
    next(error)
  }
})

driversRouter.delete("/:id", async (req, res, next) => {
  try {
    const auth = await requireRoles(
      req,
      ["SUPER_ADMIN", "SPPG"],
      "Hanya SPPG atau Super Admin yang dapat mengelola driver."
    )

    if ("status" in auth) {
      return res.status(auth.status).json({ message: auth.message })
    }

    const ownerFilter = await getDriverOwnerFilter(auth.currentUser)
    const deleted = await prisma.driver.deleteMany({
      where: { id: req.params.id, ...ownerFilter },
    })

    if (deleted.count === 0) {
      return res.status(404).json({ message: "Driver tidak ditemukan." })
    }

    return res.status(204).send()
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2003"
    ) {
      return res.status(409).json({
        message:
          "Driver sudah dipakai pada batch/distribusi. Nonaktifkan driver jika tidak ingin digunakan lagi.",
      })
    }

    next(error)
  }
})
