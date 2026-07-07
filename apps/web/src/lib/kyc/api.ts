import { NextResponse } from "next/server";
import { KycServiceError } from "@/lib/kyc/service";

export function kycErrorResponse(error: unknown) {
  if (error instanceof KycServiceError) {
    const status =
      error.code === "forbidden"
        ? 403
        : error.code === "not_found"
          ? 404
          : error.code === "conflict"
            ? 409
            : 400;

    return NextResponse.json({ error: error.message, code: error.code }, { status });
  }

  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  console.error(error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
