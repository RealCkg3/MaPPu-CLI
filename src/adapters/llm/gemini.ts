/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MappuLLM } from "./base";
import { GoogleGenAI } from "@google/genai";

export class GeminiAdapter implements MappuLLM {
  private client: GoogleGenAI;

  constructor() {
    const key = process.env.GEMINI_API_KEY || "dummy";
    this.client = new GoogleGenAI({ apiKey: key });
  }

  public async generate(prompt: string): Promise<string> {
    const response = await this.client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt
    });
    return response.text || "";
  }
}
