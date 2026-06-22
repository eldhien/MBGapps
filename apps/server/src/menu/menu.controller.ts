import { PrismaClient } from "@prisma/client"
import { Request, Response } from "express"

const prisma = new PrismaClient()

export const getMenus = async (req: Request, res: Response) => {
  try {
    const menus = await prisma.menuMaster.findMany({
      orderBy: { name: "asc" }
    })
    res.json(menus)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Failed to fetch menus" })
  }
}

export const createMenu = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, category } = req.body
    if (!name || !category) {
      res.status(400).json({ message: "Name and category are required" })
      return
    }

    const menu = await prisma.menuMaster.create({
      data: { name, category }
    })
    res.status(201).json(menu)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Failed to create menu" })
  }
}
