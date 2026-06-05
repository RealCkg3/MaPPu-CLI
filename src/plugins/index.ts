/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MappuPlugin } from "./types";

export class PluginLoader {
  private activePlugins: MappuPlugin[] = [];

  public async registerAndLoad(plugin: MappuPlugin, apiContext: any): Promise<void> {
    await plugin.init(apiContext);
    this.activePlugins.push(plugin);
  }

  public getLoadedPlugins(): MappuPlugin[] {
    return this.activePlugins;
  }
}
export * from "./types";
