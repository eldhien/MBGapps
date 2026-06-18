import cors from "cors"
import express from "express"

import { authRouter } from "./auth/auth.routes.js"
import { env } from "./config/env.js"
import { usersRouter } from "./users/users.routes.js"

const app = express()

app.use(
  cors({
    origin: env.clientOrigin,
    credentials: true,
  })
)
app.use(express.json())

app.get("/health", (_req, res) => {
  res.json({ ok: true })
})

app.use("/auth", authRouter)
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
