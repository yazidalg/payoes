import { auth } from "@/auth";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import {
  createOrganizationForUser,
  getOrganizationsForUser,
} from "@/lib/organizations/service";
import { setActiveOrganizationCookie } from "@/lib/organizations/active-organization";
import { uploadOrganizationLogo } from "@/lib/storage/minio";

const organizationSchema = z.object({
  name: z.string().min(1, "Business name is required").max(120),
  email: z.string().email("Business email must be valid"),
  website: z
    .string()
    .max(200)
    .refine(
      (value) => !value || /^https?:\/\/.+/i.test(value),
      "Website must be a valid URL"
    )
    .optional()
    .or(z.literal("")),
  description: z.string().max(500).optional().or(z.literal("")),
});

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const organizationsList = await getOrganizationsForUser(session.user.id);

  return NextResponse.json({ organizations: organizationsList });
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const parsed = organizationSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      website: formData.get("website") || undefined,
      description: formData.get("description") || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    const logoFile = formData.get("logo");

    let organization = await createOrganizationForUser(session.user.id, {
      name: parsed.data.name,
      email: parsed.data.email,
      website: parsed.data.website || null,
      description: parsed.data.description || null,
    });

    if (logoFile instanceof File && logoFile.size > 0) {
      const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/gif"];

      if (!allowedTypes.includes(logoFile.type)) {
        return NextResponse.json(
          { error: "Logo must be a PNG, JPG, WEBP, or GIF image" },
          { status: 400 }
        );
      }

      if (logoFile.size > 2 * 1024 * 1024) {
        return NextResponse.json(
          { error: "Logo must be smaller than 2 MB" },
          { status: 400 }
        );
      }

      const logoUrl = await uploadOrganizationLogo(logoFile, organization.id);

      const [updated] = await db
        .update(organizations)
        .set({ logoUrl, updatedAt: new Date() })
        .where(eq(organizations.id, organization.id))
        .returning();

      organization = updated;
    }

    await setActiveOrganizationCookie(organization.id);

    return NextResponse.json({ organization }, { status: 201 });
  } catch (error) {
    console.error("Create organization failed:", error);
    return NextResponse.json(
      { error: "Unable to create organization" },
      { status: 500 }
    );
  }
}
