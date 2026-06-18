import bcrypt from "bcryptjs"
import { Router } from "express"

import { prisma } from "../lib/prisma.js"
import { createSession, getCurrentUser } from "./session.js"
import { canAccessWebsite, type UserRole } from "./roles.js"

export const authRouter = Router()

function toAuthResponse(profile: {
  id: string
  username: string
  role: UserRole
}) {
  return {
    user: {
      id: profile.id,
      username: profile.username,
      role: profile.role,
    },
  }
}

function normalizeUsername(username?: string) {
  return username?.trim().toLowerCase()
}

authRouter.post("/signup", async (req, res, next) => {
  try {
    const { password, username } = req.body as {
      password?: string
      username?: string
    }
    const normalizedUsername = normalizeUsername(username)
    const role: UserRole = "SPPG"

    if (!password || !normalizedUsername) {
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
      return res.status(400).json({
        message: "Password minimal 6 karakter.",
      })
    }

    const existingProfile = await prisma.user.findUnique({
      where: { username: normalizedUsername },
    })

    if (existingProfile) {
      return res.status(409).json({
        message: "Username sudah digunakan.",
      })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const profile = await prisma.user.create({
      data: {
        passwordHash,
        role,
        username: normalizedUsername,
      },
    })

    return res.status(201).json({
      ...toAuthResponse(profile),
      session: createSession(profile),
    })
  } catch (error) {
    next(error)
  }
})

authRouter.post("/login", async (req, res, next) => {
  try {
    const { password, username } = req.body as {
      password?: string
      username?: string
    }
    const normalizedUsername = normalizeUsername(username)

    if (!normalizedUsername || !password) {
      return res
        .status(400)
        .json({ message: "Username dan password wajib diisi." })
    }

    const profile = await prisma.user.findUnique({
      where: { username: normalizedUsername },
    })

    if (!profile) {
      return res
        .status(401)
        .json({ message: "Username atau password tidak valid." })
    }

    const isPasswordValid = await bcrypt.compare(password, profile.passwordHash)

    if (!isPasswordValid) {
      return res
        .status(401)
        .json({ message: "Username atau password tidak valid." })
    }

    return res.json({
      ...toAuthResponse(profile),
      session: createSession(profile),
    })
  } catch (error) {
    next(error)
  }
})

authRouter.get("/me", async (req, res, next) => {
  try {
    const profile = await getCurrentUser(req)

    if (!profile || !canAccessWebsite(profile.role)) {
      return res.status(403).json({
        message: "Akun tidak memiliki akses website.",
      })
    }

    return res.json(toAuthResponse(profile))
  } catch (error) {
    if (error instanceof Error && error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Sesi tidak valid." })
    }

    next(error)
  }
})

authRouter.post("/logout", (_req, res) => {
  return res.status(204).send()
})
