import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import tmdbRouter from "./tmdb-proxy"; // <-- add this

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

/* mount tmdb routes */
router.use(tmdbRouter);

export default router;