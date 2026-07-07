import { NextResponse } from "next/server";
import { MembersServiceError } from "@/lib/organizations/members";

export function membersErrorResponse(error: unknown) {
  if (error instanceof MembersServiceError) {
    const status =
      error.code === "forbidden"
        ? 403
        : error.code === "not_found"
          ? 404
          : error.code === "conflict"
            ? 409
            : error.code === "expired"
              ? 410
              : error.code === "email_mismatch"
                ? 403
                : 400;

    return NextResponse.json({ error: error.message, code: error.code }, { status });
  }

  console.error(error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
