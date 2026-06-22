import jwt from "jsonwebtoken"
import type { Request } from "express"

import { env } from "../config/env.js"
import { prisma } from "../lib/prisma.js"
import { findDemoUserById, findDemoUserByUsername, sanitizeDemoUser } from "./demo-users.js"
import type { UserRole } from "./roles.js"

type TokenPayload = {
  sub: string
  username?: string
  role?: UserRole
}

export function createSession(user: {
  id: string
  username?: string
  role?: UserRole
}) {
  return {
    access_token: jwt.sign(
      {
        sub: user.id,
        ...(user.username ? { username: user.username } : {}),
        ...(user.role ? { role: user.role } : {}),
      },
      env.jwtSecret,
      {
        expiresIn: "7d",
      }
    ),
  }
}

export async function getCurrentUser(req: Request) {
  const token = req.headers.authorization?.replace("Bearer ", "")

  if (!token) {
    return null
  }

  const payload = jwt.verify(token, env.jwtSecret) as TokenPayload

  const demoUser =
    findDemoUserById(payload.sub) ??
    findDemoUserByUsername(payload.username ?? null)

  if (demoUser) {
    return sanitizeDemoUser(demoUser)
  }

  try {
    return await prisma.user.findUnique({
      where: { id: payload.sub },
    })
  } catch {
    if (payload.username && payload.role) {
      return {
        id: payload.sub,
        username: payload.username,
        role: payload.role,
      }
    }

    return null
  }
}
