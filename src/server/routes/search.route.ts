/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from "express";
import { SearchEngine } from "../../engines/search";

const router = Router();
const engine = new SearchEngine();

router.post("/", async (req, res, next) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Missing 'query' field." });
    }
    const results = await engine.search(process.cwd(), query);
    res.json({ results });
  } catch (err) {
    next(err);
  }
});

export const searchRouter = router;
