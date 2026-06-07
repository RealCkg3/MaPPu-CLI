/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import OpenAI from "openai";
import { MappuLLM } from "./base";
import { OpenAIAdapter } from "./openai";

export class KimiAdapter extends OpenAIAdapter {
  constructor(options?: Record<string, any>) {
    const finalOptions = {
      apiKey: options?.apiKey || process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY || "dummy",
      apiBase: options?.apiBase || "https://api.moonshot.cn/v1",
      model: options?.model || "moonshot-v1-8k",
      ...options
    };
    super(finalOptions);
  }
}
