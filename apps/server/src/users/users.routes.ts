import bcrypt from "bcryptjs"
import { Router } from "express"
import { UserRole } from "@prisma/client"

import { listDemoUsers } from "../auth/demo-users.js"
import { prisma } from "../lib/prisma.js"
import { isUuid, requireRoles } from "../lib/user-scope.js"

export const usersRouter = Router()

const roleValues = new Set<string>(Object.values(UserRole))

function toUserResponse(user: {
  id: string
  username: string
  role: UserRole
  createdAt: Date
}) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  }
}

function normalizeUsername(username?: string) {
  return username?.trim().toLowerCase()
}

usersRouter.get("/", async (req, res, next) => {
  try {
    const auth = await requireRoles(
      req,
      ["SUPER_ADMIN", "SPPG"],
      "Hanya Super Admin atau SPPG yang dapat mengakses pengguna."
    )

    if ("status" in auth) {
      return res.status(auth.status).json({ message: auth.message })
    }

    let users

    try {
      users = await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
      })
    } catch {
      return res.json({ users: listDemoUsers().map(toUserResponse) })
    }

    return res.json({ users: users.map(toUserResponse) })
  } catch (error) {
    next(error)
  }
})

usersRouter.post("/", async (req, res, next) => {
  try {
    const auth = await requireRoles(
      req,
      ["SUPER_ADMIN"],
      "Hanya Super Admin yang dapat mengakses pengguna."
    )

    if ("status" in auth) {
      return res.status(auth.status).json({ message: auth.message })
    }

    const { password, role = "SPPG", username } = req.body as {
      password?: string
      role?: string
      username?: string
    }
    const normalizedUsername = normalizeUsername(username)

    if (!normalizedUsername || !password) {
      return res
        .status(400)
        .json({ message: "Username dan password wajib diisi." })
    }

    if (!/^[a-z0-9_]{3,32}$/.test(normalizedUsername)) {
      return res.status(400).json({
        message:
          "Username harus 3-32 karakter dan hanya boleh berisi huruf kecil, angka, atau underscore.",
      })
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password minimal 6 karakter." })
    }

    if (!roleValues.has(role)) {
      return res.status(400).json({ message: "Role tidak valid." })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: {
        passwordHash,
        role: role as UserRole,
        username: normalizedUsername,
      },
    })

    return res.status(201).json({ user: toUserResponse(user) })
  } catch (error) {
    next(error)
  }
})

usersRouter.patch("/:id", async (req, res, next) => {
  try {
    const auth = await requireRoles(
      req,
      ["SUPER_ADMIN"],
      "Hanya Super Admin yang dapat mengakses pengguna."
    )

    if ("status" in auth) {
      return res.status(auth.status).json({ message: auth.message })
    }

    const { password, role, username } = req.body as {
      password?: string
      role?: string
      username?: string
    }
    const normalizedUsername = normalizeUsername(username)

    if (role && !roleValues.has(role)) {
      return res.status(400).json({ message: "Role tidak valid." })
    }

    if (normalizedUsername && !/^[a-z0-9_]{3,32}$/.test(normalizedUsername)) {
      return res.status(400).json({
        message:
          "Username harus 3-32 karakter dan hanya boleh berisi huruf kecil, angka, atau underscore.",
      })
    }

    if (password && password.length < 6) {
      return res.status(400).json({ message: "Password minimal 6 karakter." })
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        ...(normalizedUsername ? { username: normalizedUsername } : {}),
        ...(role ? { role: role as UserRole } : {}),
        ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}),
      },
    })

    return res.json({ user: toUserResponse(user) })
  } catch (error) {
    next(error)
  }
})

usersRouter.delete("/:id", async (req, res, next) => {
  try {
    const auth = await requireRoles(
      req,
      ["SUPER_ADMIN"],
      "Hanya Super Admin yang dapat mengakses pengguna."
    )

    if ("status" in auth) {
      return res.status(auth.status).json({ message: auth.message })
    }

    if (auth.currentUser.id === req.params.id) {
      return res
        .status(400)
        .json({ message: "Kamu tidak dapat menghapus akun sendiri." })
    }

    if (!isUuid(req.params.id)) {
      return res
        .status(400)
        .json({ message: "Akun demo tidak dapat dihapus dari database." })
    }

    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, role: true, username: true },
    })

    if (!user) {
      return res.status(404).json({ message: "Akun tidak ditemukan." })
    }

    const [
      managedSchoolsCount,
      productionBatchesCount,
      schoolBatchesCount,
    ] = await Promise.all([
      prisma.school.count({ where: { sppgId: user.id } }),
      prisma.batchProduksi.count({ where: { petugasId: user.id } }),
      prisma.batchSekolah.count({ where: { sekolahId: user.id } }),
    ])
    const blockers = [
      managedSchoolsCount
        ? `${managedSchoolsCount.toLocaleString("id-ID")} sekolah`
        : null,
      productionBatchesCount
        ? `${productionBatchesCount.toLocaleString("id-ID")} batch produksi`
        : null,
      schoolBatchesCount
        ? `${schoolBatchesCount.toLocaleString("id-ID")} batch sekolah`
        : null,
    ].filter(Boolean)

    if (blockers.length) {
      return res.status(409).json({
        message: `Akun ${user.username} tidak dapat dihapus karena masih terhubung dengan ${blockers.join(", ")}. Pindahkan atau hapus data terkait terlebih dahulu.`,
      })
    }

    await prisma.user.delete({
      where: { id: user.id },
    })

    return res.status(204).send()
  } catch (error) {
    next(error)
  }
})
