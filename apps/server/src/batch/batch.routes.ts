import { Router } from "express"
import { getBatches, getBatchById, createBatch, updateBatch, updateBatchStatus, updateBatchDelivery, deleteBatch } from "./batch.controller.js"
import { requireAuth } from "../middleware/auth.js"

export const batchRouter = Router()

batchRouter.use(requireAuth)

batchRouter.get("/", getBatches)
batchRouter.get("/:id", getBatchById)
batchRouter.post("/", createBatch)
batchRouter.patch("/:id", updateBatch)
batchRouter.patch("/:id/status", updateBatchStatus)
batchRouter.patch("/:id/delivery", updateBatchDelivery)
batchRouter.delete("/:id", deleteBatch)
