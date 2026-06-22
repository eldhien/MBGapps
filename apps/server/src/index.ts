import cors from "cors"
import express from "express"

import { authRouter } from "./auth/auth.routes.js"
import { batchRouter } from "./batch/batch.routes.js"
import { uploadRouter } from "./batch/batch.upload.js"
import { env } from "./config/env.js"
import { menuRouter } from "./menu/menu.routes.js"
import { settingsRouter } from "./settings/settings.routes.js"
import { usersRouter } from "./users/users.routes.js"

const app = express()

app.use(
  cors({
    origin: true,
    credentials: true,
  })
)
app.use(express.json())

app.get("/health", (_req, res) => {
  res.json({ ok: true })
})


app.use("/auth", authRouter)
app.use("/users", usersRouter)
app.use("/batches", batchRouter)
app.use("/batches", uploadRouter)
app.use("/menus", menuRouter)
app.use("/settings", settingsRouter)

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
