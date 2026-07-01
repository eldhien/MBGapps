import type { ErrorRequestHandler } from "express"

import { logger } from "../config/logger.js"

export const errorMiddleware: ErrorRequestHandler = (error, _req, res, _next) => {
  logger.error("Unhandled request error.", error)

  if (res.headersSent) {
    return
  }

  res.status(500).json({ message: "Terjadi kesalahan pada server." })
}
