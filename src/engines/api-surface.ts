/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export class ApiSurfaceEngine {
  /**
   * Extracts routes and network path endpoints from source files.
   */
  public extractRoutes(files: { filePath: string; content: string }[]): {
    filePath: string;
    route: string;
    method: "GET" | "POST" | "PUT" | "DELETE";
  }[] {
    const routes: any[] = [];
    const routeRegex = /app\.(get|post|put|delete)\s*\(\s*['"](.*?)['"]/gi;

    files.forEach(f => {
      let match;
      while ((match = routeRegex.exec(f.content)) !== null) {
        routes.push({
          filePath: f.filePath,
          method: match[1].toUpperCase(),
          route: match[2]
        });
      }
    });

    return routes;
  }
}
