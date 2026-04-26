import "dotenv/config";

import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env.PORT || "5000";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, () => {
  logger.info({ port }, "Server listening");
});

/* catch unhandled errors */
process.on("unhandledRejection", (err) => {
  logger.error({ err }, "Unhandled Rejection");
});

process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught Exception");
});