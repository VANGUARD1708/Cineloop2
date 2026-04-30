import { Router, type IRouter } from "express";

import healthRouter from "./health";
import filmsRouter from "./films";
import votesRouter from "./votes";
import usersRouter from "./users";
import charactersRouter from "./characters";
import feedRouter from "./feed";
import notificationsRouter from "./notifications";
import tmdbProxyRouter from "./tmdb-proxy";
import paymentsRouter from "./payments";
import moodRouter from "./mood";
import identityRouter from "./identity";
import watchHistoryRouter from "./watch-history";
import subscriptionRouter from "./subscription";
import recommendationsRouter from "./recommendations";
import { mediaRouter } from "./media";

const router: IRouter = Router();

/* system */
router.use(healthRouter);

/* identity (cookie-based, lightweight) */
router.use(identityRouter);

/* core content */
router.use(feedRouter);
router.use(filmsRouter);
router.use(charactersRouter);

/* user interaction */
router.use(votesRouter);
router.use(usersRouter);
router.use(notificationsRouter);

/* watch tracking */
router.use(watchHistoryRouter);

/* external video source */
router.use("/tmdb", tmdbProxyRouter);

/* monetization */
router.use("/payments", paymentsRouter);
router.use(subscriptionRouter);

/* AI mood match */
router.use("/mood", moodRouter);

/* AI Director Mode — taste profile, For You, daily mood, because-you-watched */
router.use(recommendationsRouter);

/* Per-media reactions, comments, and lightweight details for the feed */
router.use(mediaRouter);

export default router;
