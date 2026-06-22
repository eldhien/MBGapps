import { Router } from "express"
import { getBatches, getBatchById, createBatch, updateBatchStatus, updateBatchDelivery } from "./batch.controller.js"

export const batchRouter = Router()

batchRouter.get("/", getBatches)
batchRouter.get("/:id", getBatchById)
batchRouter.post("/", createBatch)
batchRouter.patch("/:id/status", updateBatchStatus)
batchRouter.patch("/:id/delivery", updateBatchDelivery)
