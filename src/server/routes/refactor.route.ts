/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from "express";
import { refactorCodebase } from "../../mappu-core";

const router = Router();

router.post("/", async (req, res, next) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Missing 'query' field." });
    }
    const plan = await refactorCodebase(process.cwd(), query);
    res.json({ plan });
  } catch (err) {
    next(err);
  }
});

export const refactorRouter = router;
