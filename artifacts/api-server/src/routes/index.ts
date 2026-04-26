import { Router, type IRouter } from "express";

import healthRouter from "./health";
import filmsRouter from "./films";
import votesRouter from "./votes";
import usersRouter from "./users";
import charactersRouter from "./characters";
import feedRouter from "./feed";
import notificationsRouter from "./notifications";
import tmdbProxyRouter from "./tmdb-proxy";

const router: IRouter = Router();

/* system */
router.use(healthRouter);

/* core content */
router.use(feedRouter);
router.use(filmsRouter);
router.use(charactersRouter);

/* user interaction */
router.use(votesRouter);
router.use(usersRouter);
router.use(notificationsRouter);

/* external video source */
router.use(tmdbProxyRouter);

export default router;