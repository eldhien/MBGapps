import { Router } from "express"

import { prisma } from "../lib/prisma.js"
import { requireRoles } from "../lib/user-scope.js"

export const driversRouter = Router()

function toDriverResponse(driver: {
  id: string
  name: string
  phone: string | null
  vehicleNumber: string | null
  isActive: boolean
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
    const drivers = await prisma.driver.findMany({
      where: activeOnly ? { isActive: true } : undefined,
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

    const driver = await prisma.driver.create({
      data: {
        name: normalizedName,
        phone: cleanOptionalText(phone),
        vehicleNumber: cleanOptionalText(vehicleNumber),
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

    await prisma.driver.delete({
      where: { id: req.params.id },
    })

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
