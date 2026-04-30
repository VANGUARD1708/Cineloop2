import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { identityMiddleware } from "./middlewares/identity";

/* important for Node fetch support */
import fetch from "node-fetch";
(global as any).fetch = fetch;

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(cors({ credentials: true, origin: true }));
app.use(cookieParser());

/* Stripe webhook needs raw body — register BEFORE express.json() */
/* The route itself calls express.raw() per-route, but we ensure json() doesn't
   consume the body for that path. */
app.use((req, res, next) => {
  if (req.path === "/api/payments/webhook/stripe") return next();
  return express.json()(req, res, next);
});
app.use(express.urlencoded({ extended: true }));

app.use(identityMiddleware);

/* health check */
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", router);

export default app;
