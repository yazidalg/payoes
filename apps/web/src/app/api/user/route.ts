import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserProfile, updateUserProfile } from "@/lib/users/service";
import { uploadUserAvatarFromDataUrl } from "@/lib/storage/upload-user-avatar-from-data-url";

const updateUserSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(120).optional(),
    image: z.string().nullable().optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "No fields to update",
  });

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getUserProfile(session.user.id);

  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = updateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    }

    const existing = await getUserProfile(session.user.id);

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let image = existing.image;

    if (parsed.data.image !== undefined) {
      if (parsed.data.image === null) {
        image = null;
      } else if (parsed.data.image.startsWith("data:")) {
        image = await uploadUserAvatarFromDataUrl(
          parsed.data.image,
          session.user.id,
        );
      } else {
        image = parsed.data.image;
      }
    }

    const user = await updateUserProfile(session.user.id, {
      name: parsed.data.name,
      image: parsed.data.image !== undefined ? image : undefined,
    });

    if (!user) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Update user profile failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update profile",
      },
      { status: 500 },
    );
  }
}
