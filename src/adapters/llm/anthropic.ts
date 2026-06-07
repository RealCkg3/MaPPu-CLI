/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Anthropic from "@anthropic-ai/sdk";
import { MappuLLM } from "./base";

export class AnthropicAdapter implements MappuLLM {
  private client: Anthropic;
  private model: string;

  constructor(options?: Record<string, any>) {
    const apiKey = options?.apiKey || process.env.ANTHROPIC_API_KEY || "dummy";
    this.client = new Anthropic({ apiKey });
    this.model = options?.model || "claude-3-5-sonnet-20241022";
  }

  public async generate(prompt: string, system?: string, options?: Record<string, any>): Promise<string> {
    const msg = await this.client.messages.create({
      model: options?.model || this.model,
      max_tokens: options?.max_tokens || 4000,
      system: system,
      messages: [{ role: "user", content: prompt }],
      temperature: options?.temperature ?? 0.2
    });

    const block = msg.content[0];
    if (block && block.type === "text") {
      return block.text;
    }
    return "";
  }

  public async *stream(systemPrompt: string, userMessage: string, system?: string): AsyncIterable<string> {
    const systemInstruction = systemPrompt || system;
    const responseStream = await this.client.messages.create({
      model: this.model,
      max_tokens: 4000,
      system: systemInstruction,
      messages: [{ role: "user", content: userMessage }],
      stream: true,
      temperature: 0.2
    });

    for await (const event of responseStream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield event.delta.text;
      }
    }
  }

  public async *streamChat(messages: any[], system?: string): AsyncIterable<string> {
    const formattedMessages = messages.map(m => {
      let contentString = "";
      if (m.parts && Array.isArray(m.parts)) {
        contentString = m.parts.map((p: any) => p.text || "").join("");
      } else {
        contentString = m.content || m.text || "";
      }

      const role = m.role === "model" || m.role === "assistant" ? "assistant" : "user";
      return {
        role: role as "user" | "assistant",
        content: contentString
      };
    });

    const responseStream = await this.client.messages.create({
      model: this.model,
      max_tokens: 4000,
      system,
      messages: formattedMessages,
      stream: true,
      temperature: 0.2
    });

    for await (const event of responseStream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield event.delta.text;
      }
    }
  }

  public async completeWithTools(messages: any[], tools: any[], system?: string): Promise<any> {
    const formattedMessages = messages.map(m => {
      let contentString = "";
      if (m.parts && Array.isArray(m.parts)) {
        contentString = m.parts.map((p: any) => p.text || "").join("");
      } else {
        contentString = m.content || m.text || "";
      }

      const role = m.role === "model" || m.role === "assistant" ? "assistant" : "user";
      return {
        role: role as "user" | "assistant",
        content: contentString
      };
    });

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

      return {
        name: fnDecl.name,
        description: fnDecl.description,
        input_schema: {
          type: "object" as const,
          properties: mapProperties(parameters.properties),
          required: parameters.required || []
        }
      };
    });

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4000,
      system,
      messages: formattedMessages,
      tools: formattedTools.length > 0 ? formattedTools : undefined,
    });

    const functionCalls: any[] = [];
    let textResponse = "";

    for (const block of response.content) {
      if (block.type === "text") {
        textResponse += block.text;
      } else if (block.type === "tool_use") {
        functionCalls.push({
          name: block.name,
          args: block.input
        });
      }
    }

    return {
      functionCalls,
      text: textResponse,
      candidates: [
        {
          content: {
            role: "model",
            parts: [
              { text: textResponse },
              ...functionCalls.map(fc => ({
                functionCall: fc
              }))
            ]
          }
        }
      ]
    };
  }
}
