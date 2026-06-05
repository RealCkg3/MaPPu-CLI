/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from "express";
import { TraceEngine } from "../../engines/trace";

const router = Router();
const engine = new TraceEngine();

router.post("/", async (req, res, next) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Missing 'query' field." });
    }
    const trace = await engine.trace(process.cwd(), query);
    res.json({ trace });
  } catch (err) {
    next(err);
  }
});

export const traceRouter = router;
