import { NextResponse } from "next/server";
import { formatErrorResponse } from "./errors";

export function successResponse<T>(data: T, status: number = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(error: unknown) {
  const formatted = formatErrorResponse(error);
  return NextResponse.json(formatted.body, { status: formatted.status });
}

export function parseSearchParams(url: string): Record<string, string> {
  const { searchParams } = new URL(url);
  const result: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}
