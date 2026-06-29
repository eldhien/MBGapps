import cors from "cors";
import express from "express";

import { authRouter } from "./auth/auth.routes.js";
import { dashboardRouter } from "./dashboard/dashboard.routes.js";
import { batchesRouter } from "./batches/batches.routes.js";
import { distributionsRouter } from "./distributions/distributions.routes.js";
import { driversRouter } from "./drivers/drivers.routes.js";
import { batchRouter } from "./batch/batch.routes.js";
import { uploadRouter } from "./batch/batch.upload.js";
import { env } from "./config/env.js";
import { foodReportsRouter } from "./food-reports/food-reports.routes.js";
import { kitchenChecklistRouter } from "./kitchen-checklist/kitchen-checklist.routes.js";
import { studentComplaintsRouter } from "./student-complaints/student-complaints.routes.js";
import { menuRouter } from "./menu/menu.routes.js";
import { productionDistributionsRouter } from "./production-distributions/production-distributions.routes.js";
import { schoolDistributionsRouter } from "./school-distributions/school-distributions.routes.js";
import { schoolAccountsRouter } from "./school-accounts/school-accounts.routes.js";
import { settingsRouter } from "./settings/settings.routes.js";
import { ensureSuperadminUser } from "./auth/system-user.js";
import { usersRouter } from "./users/users.routes.js";

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/auth", authRouter);
app.use("/dashboard", dashboardRouter);
app.use("/batches", batchesRouter);
app.use("/distributions", distributionsRouter);
app.use("/food-reports", foodReportsRouter);
app.use("/cleanliness-reports", kitchenChecklistRouter);
app.use("/kitchen-checklist", kitchenChecklistRouter);
app.use("/student-complaints", studentComplaintsRouter);
app.use("/users", usersRouter);
app.use("/drivers", driversRouter);
app.use("/production-batches", batchRouter);
app.use("/production-distributions", productionDistributionsRouter);
app.use("/school-distributions", schoolDistributionsRouter);
app.use("/batches", uploadRouter);
app.use("/menus", menuRouter);
app.use("/school-accounts", schoolAccountsRouter);
app.use("/settings", settingsRouter);

app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(error);
    res.status(500).json({ message: "Terjadi kesalahan pada server." });
  },
);

async function start() {
  try {
    await ensureSuperadminUser();
  } catch (error) {
    console.error("Gagal memastikan akun superadmin database.", error);
  }

  app.listen(env.port, () => {
    console.log(`Server ready on http://localhost:${env.port}`);
  });
}

void start();
