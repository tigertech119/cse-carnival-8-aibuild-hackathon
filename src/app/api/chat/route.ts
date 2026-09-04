import { NextRequest } from "next/server";
import { runAgent, ChatMessage } from "@/ai/agent";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, history = [] } = body as {
      message: string;
      history: ChatMessage[];
    };

    if (!message || typeof message !== "string" || !message.trim()) {
      return Response.json(
        { error: "Message is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    const result = await runAgent(message.trim(), history);

    return Response.json({
      success: true,
      message: result.message,
      toolCalls: result.toolCalls,
      error: result.error,
    });
  } catch (error: any) {
    console.error("Chat API error:", error);
    return Response.json(
      {
        success: false,
        error: "Failed to process chat request",
        message: "I encountered an error. Please try again.",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  const hasKey = !!(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY);
  return Response.json({
    status: "ok",
    ai_configured: hasKey,
    model: "gemini-2.0-flash",
    message: hasKey
      ? "AI assistant is ready"
      : "AI assistant requires GOOGLE_API_KEY or GEMINI_API_KEY environment variable",
  });
}