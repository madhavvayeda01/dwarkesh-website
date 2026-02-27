import { NextResponse } from "next/server";

export type ApiPayload<T> = {
  success: boolean;
  message: string;
  data: T | null;
};

export function ok<T>(message: string, data: T, status = 200) {
  return NextResponse.json<ApiPayload<T>>(
    { success: true, message, data },
    { status }
  );
}

export function fail(message: string, status = 400, data: unknown = null) {
  return NextResponse.json<ApiPayload<unknown>>(
    { success: false, message, data },
    { status }
  );
}
