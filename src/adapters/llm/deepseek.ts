/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { OpenAIAdapter } from "./openai";

export class DeepSeekAdapter extends OpenAIAdapter {
  constructor(options?: Record<string, any>) {
    const finalOptions = {
      apiKey: options?.apiKey || process.env.DEEPSEEK_API_KEY || "dummy",
      apiBase: options?.apiBase || "https://api.deepseek.com/v1",
      model: options?.model || "deepseek-chat",
      ...options
    };
    super(finalOptions);
  }
}
