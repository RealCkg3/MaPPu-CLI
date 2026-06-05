/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from "express";
import { searchRouter } from "./routes/search.route";
import { traceRouter } from "./routes/trace.route";
import { doctorRouter } from "./routes/doctor.route";
import { refactorRouter } from "./routes/refactor.route";
import { apiAuthMiddleware } from "./middleware/auth";

const router = Router();

// Apply auth middleware to API boundaries
router.use(apiAuthMiddleware);

router.use("/search", searchRouter);
router.use("/trace", traceRouter);
router.use("/doctor", doctorRouter);
router.use("/refactor", refactorRouter);

export const mapServerRouter = router;
export * from "./middleware/auth";
export * from "./middleware/error";
export * from "./routes/search.route";
export * from "./routes/trace.route";
export * from "./routes/doctor.route";
export * from "./routes/refactor.route";
export { router as serverRouter };
