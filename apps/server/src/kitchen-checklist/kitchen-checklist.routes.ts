import { Router } from "express"

import { getCurrentUser } from "../auth/session.js"
import {
  createFallbackKitchenChecklist,
  listFallbackKitchenChecklists,
} from "../lib/fallback-store.js"
import { prisma } from "../lib/prisma.js"
import { requireAuth } from "../middleware/auth.js"

export const kitchenChecklistRouter = Router()

kitchenChecklistRouter.use(requireAuth)

kitchenChecklistRouter.get("/", async (req, res, next) => {
  try {
    const currentUser = await getCurrentUser(req)

    if (!currentUser) {
      return res.status(401).json({ message: "Tidak terautentikasi." })
    }

    const checklists = await prisma.kitchenChecklist.findMany({
      where:
        currentUser.role === "SUPER_ADMIN"
          ? {}
          : { schoolId: currentUser.id },
      orderBy: { createdAt: "desc" },
    })
    res.json({ data: checklists })
  } catch (error) {
    const currentUser = await getCurrentUser(req)

    if (!currentUser) {
      return res.status(401).json({ message: "Tidak terautentikasi." })
    }

    res.json({
      data: listFallbackKitchenChecklists(
        currentUser.role === "SUPER_ADMIN" ? undefined : currentUser.id
      ),
    })
  }
})

kitchenChecklistRouter.post("/", async (req, res, next) => {
  try {
    const currentUser = await getCurrentUser(req)

    if (!currentUser) {
      return res.status(401).json({ message: "Tidak terautentikasi." })
    }

    const {
      apdPhoto,
      alatPhoto,
      kebersihanPhoto,
      kondisiDapur,
      schoolId,
      timestamp,
    } =
      req.body as {
        apdPhoto?: string
        alatPhoto?: string
        kebersihanPhoto?: string
        kondisiDapur?: string
        schoolId?: string
        timestamp?: string
      }
    const normalizedCondition = kondisiDapur?.trim()
    const resolvedSchoolId =
      currentUser.role === "SUPER_ADMIN"
        ? schoolId?.trim() || currentUser.id
        : currentUser.id
    const checklistTimestamp = timestamp ? new Date(timestamp) : new Date()

    if (
      !apdPhoto?.trim() ||
      !alatPhoto?.trim() ||
      !kebersihanPhoto?.trim() ||
      !normalizedCondition ||
      !resolvedSchoolId ||
      Number.isNaN(checklistTimestamp.getTime())
    ) {
      return res.status(400).json({ message: "Data checklist tidak lengkap." })
    }

    const checklist = await prisma.kitchenChecklist.create({
      data: {
        apdPhoto: apdPhoto.trim(),
        alatPhoto: alatPhoto.trim(),
        kebersihanPhoto: kebersihanPhoto.trim(),
        kondisiDapur: normalizedCondition,
        schoolId: resolvedSchoolId,
        timestamp: checklistTimestamp,
      },
    })

    res.status(201).json({ data: checklist })
  } catch (error) {
    const currentUser = await getCurrentUser(req)

    if (!currentUser) {
      return res.status(401).json({ message: "Tidak terautentikasi." })
    }

    const {
      apdPhoto,
      alatPhoto,
      kebersihanPhoto,
      kondisiDapur,
      schoolId,
      timestamp,
    } =
      req.body as {
        apdPhoto?: string
        alatPhoto?: string
        kebersihanPhoto?: string
        kondisiDapur?: string
        schoolId?: string
        timestamp?: string
      }

    const normalizedCondition = kondisiDapur?.trim()
    const resolvedSchoolId =
      currentUser.role === "SUPER_ADMIN"
        ? schoolId?.trim() || currentUser.id
        : currentUser.id
    const checklistTimestamp = timestamp ? new Date(timestamp) : new Date()

    if (
      !apdPhoto?.trim() ||
      !alatPhoto?.trim() ||
      !kebersihanPhoto?.trim() ||
      !normalizedCondition ||
      !resolvedSchoolId ||
      Number.isNaN(checklistTimestamp.getTime())
    ) {
      return res.status(400).json({ message: "Data checklist tidak lengkap." })
    }

    const checklist = createFallbackKitchenChecklist({
      apdPhoto: apdPhoto.trim(),
      alatPhoto: alatPhoto.trim(),
      kebersihanPhoto: kebersihanPhoto.trim(),
      kondisiDapur: normalizedCondition,
      schoolId: resolvedSchoolId,
      timestamp: checklistTimestamp,
    })

    res.status(201).json({ data: checklist })
  }
})
