/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MappuPlugin {
  name: string;
  version: string;
  onInit?: (context: any) => void;
  onIndexComplete?: (index: any) => void;
  onAnalysisRun?: (engineName: string, query: string, report: any) => void;
}
