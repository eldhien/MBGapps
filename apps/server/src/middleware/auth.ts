import { Request, Response, NextFunction } from "express"

import { getCurrentUser } from "../auth/session.js"

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

    ;(req as unknown as { user?: Awaited<ReturnType<typeof getCurrentUser>> }).user =
      user

    return next()
  } catch {
    return res.status(401).json({ message: "Sesi tidak valid." })
  }
}
