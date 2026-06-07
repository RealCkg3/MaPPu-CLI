/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MappuLLM } from "./base";

export class OllamaAdapter implements MappuLLM {
  private apiBase: string;
  private model: string;

  constructor(options?: Record<string, any>) {
    this.apiBase = options?.apiBase || process.env.OLLAMA_API_BASE || process.env.OLLAMA_HOST || "http://127.0.0.1:11434";
    this.model = options?.model || "llama3";
  }

  public async generate(prompt: string, system?: string, options?: Record<string, any>): Promise<string> {
    const messages: any[] = [];
    if (system) {
      messages.push({ role: "system", content: system });
    }
    messages.push({ role: "user", content: prompt });

    const response = await fetch(`${this.apiBase}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: options?.model || this.model,
        messages,
        stream: false,
        options: {
          temperature: options?.temperature ?? 0.2
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Ollama API error (${response.status}): ${errText}`);
    }

    const json = await response.json() as any;
    return json.message?.content || "";
  }

  public async *stream(systemPrompt: string, userMessage: string, system?: string): AsyncIterable<string> {
    const messages: any[] = [];
    const systemInstruction = systemPrompt || system;
    if (systemInstruction) {
      messages.push({ role: "system", content: systemInstruction });
    }
    messages.push({ role: "user", content: userMessage });

    const response = await fetch(`${this.apiBase}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: true,
        options: {
          temperature: 0.2
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Ollama API streaming error (${response.status}): ${errText}`);
    }

    if (!response.body) {
      return;
    }

    const bodyReader: any = response.body;

    if (typeof bodyReader[Symbol.asyncIterator] === "function") {
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      for await (const chunk of bodyReader) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const parsed = JSON.parse(trimmed);
            const text = parsed.message?.content;
            if (text) {
              yield text;
            }
          } catch (err) {
            // Ignore partial parsing errors
          }
        }
      }
      if (buffer) {
        const trimmed = buffer.trim();
        if (trimmed) {
          try {
            const parsed = JSON.parse(trimmed);
            const text = parsed.message?.content;
            if (text) {
              yield text;
            }
          } catch {}
        }
      }
    } else if (typeof bodyReader.getReader === "function") {
      const reader = bodyReader.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              const parsed = JSON.parse(trimmed);
              const text = parsed.message?.content;
              if (text) {
                yield text;
              }
            } catch (err) {
              // Ignore partial parsing errors
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    }
  }

  public async *streamChat(messages: any[], system?: string): AsyncIterable<string> {
    const formattedMessages = messages.map(m => {
      if (m.parts && Array.isArray(m.parts)) {
        return {
          role: m.role === "model" ? "assistant" : m.role,
          content: m.parts.map((p: any) => p.text || "").join("")
        };
      }
      return {
        role: m.role === "model" ? "assistant" : m.role,
        content: m.content || m.text || ""
      };
    });

    if (system && !formattedMessages.some(m => m.role === "system")) {
      formattedMessages.unshift({ role: "system", content: system });
    }

    const response = await fetch(`${this.apiBase}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.model,
        messages: formattedMessages,
        stream: true,
        options: {
          temperature: 0.2
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Ollama streamChat error (${response.status}): ${errText}`);
    }

    if (!response.body) {
      return;
    }

    const bodyReader: any = response.body;

    if (typeof bodyReader[Symbol.asyncIterator] === "function") {
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      for await (const chunk of bodyReader) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const parsed = JSON.parse(trimmed);
            const text = parsed.message?.content;
            if (text) {
              yield text;
            }
          } catch (err) {
            // Ignore partial parsing errors
          }
        }
      }
      if (buffer) {
        const trimmed = buffer.trim();
        if (trimmed) {
          try {
            const parsed = JSON.parse(trimmed);
            const text = parsed.message?.content;
            if (text) {
              yield text;
            }
          } catch {}
        }
      }
    } else if (typeof bodyReader.getReader === "function") {
      const reader = bodyReader.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              const parsed = JSON.parse(trimmed);
              const text = parsed.message?.content;
              if (text) {
                yield text;
              }
            } catch (err) {
              // Ignore partial parsing errors
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    }
  }

  public async completeWithTools(messages: any[], tools: any[], system?: string): Promise<any> {
    const formattedMessages = [...messages];
    if (system && !formattedMessages.some(m => m.role === "system")) {
      formattedMessages.unshift({ role: "system", content: system });
    }

    // Convert Gemini tools format to Ollama tools standard (which is close to OpenAI style)
    const formattedTools = tools.map(t => {
      const fnDecl = t.functionDeclarations?.[0] || t;
      const parameters = fnDecl.parameters || { type: "object", properties: {} };

      const mapType = (typeVal: any): string => {
        if (typeof typeVal === "string") return typeVal.toLowerCase();
        const mapping: Record<number, string> = {
          1: "string",
          2: "number",
          3: "integer",
          4: "boolean",
          5: "array",
          6: "object"
        };
        return mapping[typeVal] || "string";
      };

      const mapProperties = (props: any): any => {
        if (!props) return {};
        const res: any = {};
        for (const [k, v] of Object.entries(props)) {
          const propVal: any = { ...v as any };
          if (propVal.type) propVal.type = mapType(propVal.type);
          if (propVal.items) {
            propVal.items = { ...propVal.items };
            if (propVal.items.type) propVal.items.type = mapType(propVal.items.type);
          }
          res[k] = propVal;
        }
        return res;
      };

      const openAIParameters = {
        type: mapType(parameters.type),
        properties: mapProperties(parameters.properties),
        required: parameters.required || []
      };

      return {
        type: "function",
        function: {
          name: fnDecl.name,
          description: fnDecl.description,
          parameters: openAIParameters
        }
      };
    });

    const response = await fetch(`${this.apiBase}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.model,
        messages: formattedMessages,
        tools: formattedTools.length > 0 ? formattedTools : undefined,
        stream: false
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Ollama completeWithTools API error (${response.status}): ${errText}`);
    }

    const json = await response.json() as any;
    const message = json.message;

    const functionCalls = message?.tool_calls?.map((tc: any) => ({
      name: tc.function?.name,
      args: typeof tc.function?.arguments === "string" ? JSON.parse(tc.function.arguments) : tc.function?.arguments
    }));

    return {
      functionCalls,
      text: message?.content || "",
      candidates: [
        {
          content: {
            role: "model",
            parts: [
              { text: message?.content || "" },
              ...(message?.tool_calls || []).map((tc: any) => ({
                functionCall: {
                  name: tc.function?.name,
                  args: typeof tc.function?.arguments === "string" ? JSON.parse(tc.function.arguments) : tc.function?.arguments
                }
              }))
            ]
          }
        }
      ]
    };
  }
}

export * from "./base";
export * from "./gemini";
export * from "./openai";
