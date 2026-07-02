import { Request, Response } from "express"

import { logger } from "../config/logger.js"
import { prisma } from "../db/prisma.js"

// GET /api/settings/dapur?date=YYYY-MM-DD
export const getDapurCapacity = async (req: Request, res: Response) => {
  try {
    const { date } = req.query
    const targetDate = date ? new Date(String(date)) : new Date()
    targetDate.setHours(0, 0, 0, 0)

    let capacity = await prisma.dapurDailyCapacity.findUnique({
      where: { date: targetDate }
    })

    if (!capacity) {
      // Return default or null
      res.json({ date: targetDate, capacity: 0 })
      return
    }

    res.json(capacity)
  } catch (error) {
    logger.error("Settings controller error.", error)
    res.status(500).json({ message: "Failed to fetch capacity" })
  }
}

// POST /api/settings/dapur
export const setDapurCapacity = async (req: Request, res: Response): Promise<void> => {
  try {
    const { date, capacity } = req.body
    if (!date || capacity === undefined) {
      res.status(400).json({ message: "Date and capacity are required" })
      return
    }

    const targetDate = new Date(date)
    targetDate.setHours(0, 0, 0, 0)

    const updated = await prisma.dapurDailyCapacity.upsert({
      where: { date: targetDate },
      update: { capacity: Number(capacity) },
      create: { date: targetDate, capacity: Number(capacity) }
    })

    res.json(updated)
  } catch (error) {
    logger.error("Settings controller error.", error)
    res.status(500).json({ message: "Failed to set capacity" })
  }
}
