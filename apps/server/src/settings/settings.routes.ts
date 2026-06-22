import { Router } from "express"
import { getDapurCapacity, setDapurCapacity } from "./settings.controller.js"

export const settingsRouter = Router()

settingsRouter.get("/dapur", getDapurCapacity)
settingsRouter.post("/dapur", setDapurCapacity)
