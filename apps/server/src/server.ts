import { ensureSuperadminUser } from "./auth/system-user.js"
import { env } from "./config/env.js"
import { logger } from "./config/logger.js"
import { app } from "./app.js"

export async function startServer() {
  try {
    await ensureSuperadminUser()
  } catch (error) {
    logger.error("Gagal memastikan akun superadmin database.", error)
  }

  app.listen(env.port, () => {
    logger.info(`Server ready on http://localhost:${env.port}`)
  })
}

void startServer()
