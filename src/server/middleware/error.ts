/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from "express";

export function apiErrorMiddleware(err: any, req: Request, res: Response, next: NextFunction): void {
  console.error("Express Error Catch Block:", err);
  res.status(err.status || 500).json({
    status: "error",
    message: err.message || "An unexpected server-side error occurred inside the Mappu runtime.",
  });
}
