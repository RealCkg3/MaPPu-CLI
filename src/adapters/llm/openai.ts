/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MappuLLM } from "./base";

export class OpenAIAdapter implements MappuLLM {
  private apiKey: string;
  private apiBase: string;
  private model: string;

  constructor(options?: Record<string, any>) {
    this.apiKey = options?.apiKey || process.env.OPENAI_API_KEY || "dummy";
    this.apiBase = options?.apiBase || process.env.OPENAI_API_BASE || "https://api.openai.com/v1";
    this.model = options?.model || "gpt-4o-mini";
  }

  public async generate(prompt: string, system?: string, options?: Record<string, any>): Promise<string> {
    const messages: any[] = [];
    if (system) {
      messages.push({ role: "system", content: system });
    }
    messages.push({ role: "user", content: prompt });

    const response = await fetch(`${this.apiBase}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: options?.model || this.model,
        messages,
        temperature: options?.temperature ?? 0.2
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errText}`);
    }

    const json = await response.json() as any;
    return json.choices?.[0]?.message?.content || "";
  }

  public async *stream(systemPrompt: string, userMessage: string, system?: string): AsyncIterable<string> {
    const messages: any[] = [];
    const systemInstruction = systemPrompt || system;
    if (systemInstruction) {
      messages.push({ role: "system", content: systemInstruction });
    }
    messages.push({ role: "user", content: userMessage });

    const response = await fetch(`${this.apiBase}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: true,
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API streaming error (${response.status}): ${errText}`);
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
          if (trimmed === "data: [DONE]") continue;
          if (trimmed.startsWith("data: ")) {
            try {
              const parsed = JSON.parse(trimmed.slice(6));
              const text = parsed.choices?.[0]?.delta?.content;
              if (text) {
                yield text;
              }
            } catch (err) {
              // Ignore partial parsing errors
            }
          }
        }
      }
      if (buffer) {
        const trimmed = buffer.trim();
        if (trimmed && trimmed.startsWith("data: ") && trimmed !== "data: [DONE]") {
          try {
            const parsed = JSON.parse(trimmed.slice(6));
            const text = parsed.choices?.[0]?.delta?.content;
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
            if (trimmed === "data: [DONE]") continue;
            if (trimmed.startsWith("data: ")) {
              try {
                const parsed = JSON.parse(trimmed.slice(6));
                const text = parsed.choices?.[0]?.delta?.content;
                if (text) {
                  yield text;
                }
              } catch (err) {
                // Ignore partial parsing errors
              }
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

    const response = await fetch(`${this.apiBase}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: formattedMessages,
        stream: true,
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI streamChat error (${response.status}): ${errText}`);
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
          if (trimmed === "data: [DONE]") continue;
          if (trimmed.startsWith("data: ")) {
            try {
              const parsed = JSON.parse(trimmed.slice(6));
              const text = parsed.choices?.[0]?.delta?.content;
              if (text) {
                yield text;
              }
            } catch (err) {
              // Ignore partial parsing errors
            }
          }
        }
      }
      if (buffer) {
        const trimmed = buffer.trim();
        if (trimmed && trimmed.startsWith("data: ") && trimmed !== "data: [DONE]") {
          try {
            const parsed = JSON.parse(trimmed.slice(6));
            const text = parsed.choices?.[0]?.delta?.content;
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
            if (trimmed === "data: [DONE]") continue;
            if (trimmed.startsWith("data: ")) {
              try {
                const parsed = JSON.parse(trimmed.slice(6));
                const text = parsed.choices?.[0]?.delta?.content;
                if (text) {
                  yield text;
                }
              } catch (err) {
                // Ignore partial parsing errors
              }
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

    const response = await fetch(`${this.apiBase}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: formattedMessages,
        tools: formattedTools.length > 0 ? formattedTools : undefined,
        tool_choice: formattedTools.length > 0 ? "auto" : undefined
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI completeWithTools API error (${response.status}): ${errText}`);
    }

    const json = await response.json() as any;
    const choice = json.choices?.[0];
    const message = choice?.message;

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
