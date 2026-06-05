/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from "express";
import { DoctorEngine } from "../../engines/doctor";

const router = Router();
const engine = new DoctorEngine();

router.post("/", async (req, res, next) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Missing 'query' field." });
    }
    const report = await engine.diagnose(process.cwd(), query);
    res.json({ report });
  } catch (err) {
    next(err);
  }
});

export const doctorRouter = router;
