/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MappuLLM } from "./base";
import { GoogleGenAI } from "@google/genai";

export class GeminiAdapter implements MappuLLM {
  private client: GoogleGenAI;
  private defaultModel: string;

  constructor(options?: Record<string, any>) {
    const key = options?.apiKey || process.env.GEMINI_API_KEY || "dummy";
    this.client = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        }
      }
    });
    this.defaultModel = options?.model || "gemini-3.5-flash";
  }

  public async generate(prompt: string, system?: string, options?: Record<string, any>): Promise<string> {
    const config: any = {};
    if (system) {
      config.systemInstruction = system;
    }
    if (options?.responseMimeType) {
      config.responseMimeType = options.responseMimeType;
    }
    if (options?.responseSchema) {
      config.responseSchema = options.responseSchema;
    }
    if (options?.temperature !== undefined) {
      config.temperature = options.temperature;
    }

    const response = await this.client.models.generateContent({
      model: options?.model || this.defaultModel,
      contents: prompt,
      config: Object.keys(config).length > 0 ? config : undefined
    });
    return response.text || "";
  }

  public async *stream(systemPrompt: string, userMessage: string, system?: string): AsyncIterable<string> {
    const systemInstruction = systemPrompt || system;
    const responseStream = await this.client.models.generateContentStream({
      model: this.defaultModel,
      contents: userMessage,
      config: systemInstruction ? { systemInstruction } : undefined
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  }

  public async *streamChat(messages: any[], system?: string): AsyncIterable<string> {
    const systemInstruction = system;
    const contents: any[] = [];

    for (const m of messages) {
      if (m.parts && Array.isArray(m.parts)) {
        contents.push(m);
      } else {
        const role = m.role === "assistant" ? "model" : m.role;
        contents.push({
          role,
          parts: [{ text: m.content || m.text || "" }]
        });
      }
    }

    const responseStream = await this.client.models.generateContentStream({
      model: this.defaultModel,
      contents,
      config: systemInstruction ? { systemInstruction } : undefined
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  }

  public async completeWithTools(messages: any[], tools: any[], system?: string): Promise<any> {
    let systemInstruction = system;
    const contents: any[] = [];

    for (const m of messages) {
      if (m.role === "system") {
        systemInstruction = m.content || m.text || (m.parts?.[0]?.text) || systemInstruction;
      } else {
        if (m.parts && Array.isArray(m.parts)) {
          contents.push(m);
        } else {
          const role = m.role === "assistant" ? "model" : m.role;
          contents.push({
            role,
            parts: [{ text: m.content || m.text || "" }]
          });
        }
      }
    }

    // Format tools correctly
    const formattedTools = tools.map(t => {
      if (t.functionDeclarations || t.googleSearch || t.googleMaps || t.codeExecution) {
        return t;
      }
      return { functionDeclarations: [t] };
    });

    const response = await this.client.models.generateContent({
      model: this.defaultModel,
      contents,
      config: {
        systemInstruction,
        tools: formattedTools
      }
    });

    return response;
  }
}
