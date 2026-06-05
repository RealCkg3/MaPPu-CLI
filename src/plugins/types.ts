/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MappuPlugin {
  name: string;
  version: string;
  init: (api: any) => Promise<void>;
  onBeforeIndex?: (filePath: string) => void;
  onAfterIndex?: (filePath: string, parsed: any) => void;
}
