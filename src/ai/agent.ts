/**
 * CampusOS AI Agent - M12 Agent Orchestration
 *
 * Uses Google Gemini 2.0 Flash with real function calling.
 * All data access goes through the validated tool layer (tools.ts).
 * The LLM never directly accesses the database.
 */

import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
  Content,
  Part,
  FunctionCall,
  FunctionResponse,
} from '@google/generative-ai';
import { buildSystemPrompt } from './system-prompt';
import { toolDefinitions, executeTool } from './tools';

function getGeminiApiKey(): string {
  return process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '';
}
const MODEL_NAME = 'gemini-2.0-flash';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: Array<{ name: string; args: Record<string, unknown> }>;
  toolResults?: Array<{ name: string; result: unknown }>;
}

export interface AgentResponse {
  message: string;
  toolCalls?: Array<{ name: string; args: Record<string, unknown>; result: unknown }>;
  error?: string;
}

function getBangladeshContext(): { dateStr: string; timeStr: string; dayStr: string } {
  const now = new Date();
  const bd = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const yyyy = bd.getUTCFullYear();
  const mm = String(bd.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(bd.getUTCDate()).padStart(2, '0');
  const hh = String(bd.getUTCHours()).padStart(2, '0');
  const min = String(bd.getUTCMinutes()).padStart(2, '0');
  return {
    dateStr: `${yyyy}-${mm}-${dd}`,
    timeStr: `${hh}:${min}`,
    dayStr: dayNames[bd.getUTCDay()],
  };
}

function chatHistoryToGeminiContent(history: ChatMessage[]): Content[] {
  const contents: Content[] = [];
  for (const msg of history) {
    if (msg.role === 'user') {
      contents.push({ role: 'user', parts: [{ text: msg.content }] });
    } else {
      // assistant — reconstruct as model turn
      contents.push({ role: 'model', parts: [{ text: msg.content }] });
    }
  }
  return contents;
}

export async function runAgent(
  userMessage: string,
  history: ChatMessage[] = [],
  onToolCall?: (name: string, status: string) => void
): Promise<AgentResponse> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return {
      message:
        'AI assistant is not configured. Please set the GOOGLE_API_KEY (or GEMINI_API_KEY) environment variable.',
      error: 'GOOGLE_API_KEY not set',
    };
  }

  const { dateStr, timeStr, dayStr } = getBangladeshContext();
  const systemPrompt = buildSystemPrompt(dateStr, timeStr, dayStr);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: systemPrompt,
    tools: [{ functionDeclarations: toolDefinitions as any }],
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ],
  });

  const allToolCalls: Array<{ name: string; args: Record<string, unknown>; result: unknown }> = [];

  // Build full conversation history for Gemini
  const conversationHistory = chatHistoryToGeminiContent(history);

  // Start chat with history
  const chat = model.startChat({
    history: conversationHistory,
  });

  // Send the new user message
  let response = await chat.sendMessage(userMessage);
  let responseText = '';
  let maxToolRounds = 10; // Safety limit: prevent infinite loops

  // Agentic loop: keep executing tools until the model responds with text
  while (maxToolRounds-- > 0) {
    const candidate = response.response.candidates?.[0];
    if (!candidate) {
      responseText = 'I encountered an issue processing your request. Please try again.';
      break;
    }

    const parts = candidate.content?.parts || [];
    const functionCalls: FunctionCall[] = parts
      .filter((p: Part) => 'functionCall' in p)
      .map((p: Part) => (p as any).functionCall as FunctionCall);

    const textParts = parts
      .filter((p: Part) => 'text' in p)
      .map((p: Part) => (p as any).text as string);

    if (functionCalls.length === 0) {
      // No more tool calls — we have the final text response
      responseText = textParts.join('').trim();
      break;
    }

    // Execute all tool calls in this round
    const functionResponses: FunctionResponse[] = [];

    for (const fc of functionCalls) {
      const toolName = fc.name;
      const toolArgs = (fc.args as Record<string, unknown>) || {};

      // Notify caller that we're calling a tool
      if (onToolCall) {
        onToolCall(toolName, 'running');
      }

      let toolResult: unknown;
      try {
        toolResult = await executeTool(toolName, toolArgs);
      } catch (err: any) {
        toolResult = { success: false, error: err.message || 'Tool execution failed' };
      }

      allToolCalls.push({ name: toolName, args: toolArgs, result: toolResult });

      functionResponses.push({
        name: toolName,
        response: { result: toolResult },
      });

      if (onToolCall) {
        onToolCall(toolName, 'done');
      }
    }

    // Send all function responses back to the model
    const functionResponseParts: Part[] = functionResponses.map((fr) => ({
      functionResponse: fr,
    }));

    response = await chat.sendMessage(functionResponseParts);
  }

  if (!responseText) {
    responseText = 'I was unable to generate a response. Please try again.';
  }

  return {
    message: responseText,
    toolCalls: allToolCalls.length > 0 ? allToolCalls : undefined,
  };
}