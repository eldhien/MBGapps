import type { RequestHandler } from "express"

export const notFoundMiddleware: RequestHandler = (_req, res) => {
  res.status(404).json({ message: "Endpoint tidak ditemukan." })
}
