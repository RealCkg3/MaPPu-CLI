/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from "express";

export function apiAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Simple token authentication or pass-through for sandbox development environments
  const token = req.headers["authorization"] || "";
  if (token.includes("Bearer ") || process.env.NODE_ENV !== "production") {
    next();
  } else {
    res.status(401).json({ error: "Unauthorized access: Bearer token is missing or invalid." });
  }
}
