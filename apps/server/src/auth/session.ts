import jwt from "jsonwebtoken"
import type { Request } from "express"

import { env } from "../config/env.js"
import { prisma } from "../lib/prisma.js"

type TokenPayload = {
  sub: string
}

export function createSession(user: { id: string }) {
  return {
    access_token: jwt.sign({ sub: user.id }, env.jwtSecret, {
      expiresIn: "7d",
    }),
  }
}

export async function getCurrentUser(req: Request) {
  const token = req.headers.authorization?.replace("Bearer ", "")

  if (!token) {
    return null
  }

  const payload = jwt.verify(token, env.jwtSecret) as TokenPayload

  return prisma.user.findUnique({
    where: { id: payload.sub },
  })
}
