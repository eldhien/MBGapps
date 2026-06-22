import cors from "cors"
import express from "express"

import { authRouter } from "./auth/auth.routes.js"
import { dashboardRouter } from "./dashboard/dashboard.routes.js"
import { batchesRouter } from "./batches/batches.routes.js"
import { distributionsRouter } from "./distributions/distributions.routes.js"
import { env } from "./config/env.js"
import { foodReportsRouter } from "./food-reports/food-reports.routes.js"
import { kitchenChecklistRouter } from "./kitchen-checklist/kitchen-checklist.routes.js"
import { studentComplaintsRouter } from "./student-complaints/student-complaints.routes.js"
import { usersRouter } from "./users/users.routes.js"

const app = express()

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.clientOrigins.includes(origin)) {
        return callback(null, true)
      }

      return callback(new Error("Origin tidak diizinkan oleh CORS."))
    },
    credentials: true,
  })
)
app.use(express.json({ limit: "20mb" }))

app.get("/health", (_req, res) => {
  res.json({ ok: true })
})

app.use("/auth", authRouter)
app.use("/dashboard", dashboardRouter)
app.use("/batches", batchesRouter)
app.use("/distributions", distributionsRouter)
app.use("/food-reports", foodReportsRouter)
app.use("/cleanliness-reports", kitchenChecklistRouter)
app.use("/kitchen-checklist", kitchenChecklistRouter)
app.use("/student-complaints", studentComplaintsRouter)
app.use("/users", usersRouter)

app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(error)
    res.status(500).json({ message: "Terjadi kesalahan pada server." })
  }
)

app.listen(env.port, () => {
  console.log(`Server ready on http://localhost:${env.port}`)
})
