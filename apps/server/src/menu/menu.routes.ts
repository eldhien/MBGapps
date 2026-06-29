import { Router } from "express"
import { getMenus, createMenu } from "./menu.controller.js"

export const menuRouter = Router()

menuRouter.get("/", getMenus)
menuRouter.post("/", createMenu)
