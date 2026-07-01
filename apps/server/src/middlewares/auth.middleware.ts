import { Request, Response, NextFunction } from "express"

import { getCurrentUser } from "../auth/session.js"

type AuthenticatedRequest = Request & {
  user?: Awaited<ReturnType<typeof getCurrentUser>>
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = await getCurrentUser(req)

    if (!user) {
      return res.status(401).json({ message: "Tidak terautentikasi." })
    }

    const authenticatedRequest = req as AuthenticatedRequest
    authenticatedRequest.user = user

    return next()
  } catch {
    return res.status(401).json({ message: "Sesi tidak valid." })
  }
}
